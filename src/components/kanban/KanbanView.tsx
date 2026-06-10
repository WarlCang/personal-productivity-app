import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, ArrowRight, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Column, Task } from '../../types'
import TaskModal, { PRIORITY_STYLES } from '../todo/TaskModal'

function CardBody({ task }: { task: Task }) {
  const subDone = task.subtasks.filter((s) => s.done).length
  return (
    <>
      <div className={`text-sm ${task.done ? 'text-ink-400 line-through' : 'text-ink-100'}`}>{task.title}</div>
      {(task.priority || task.dueDate || task.tags.length > 0 || task.subtasks.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.priority && (
            <span className={`chip ${PRIORITY_STYLES[task.priority].chip}`}>{PRIORITY_STYLES[task.priority].label}</span>
          )}
          {task.dueDate && <span className="chip bg-ink-800 text-ink-300">{format(parseISO(task.dueDate), 'MMM d')}</span>}
          {task.subtasks.length > 0 && (
            <span className="chip bg-ink-800 text-ink-300">
              <ListChecks size={11} />
              {subDone}/{task.subtasks.length}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="chip bg-ink-800 text-ink-300">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </>
  )
}

function SortableCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`cursor-grab rounded-lg border border-ink-700 bg-ink-850 p-3 transition-colors hover:border-ink-600 active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <CardBody task={task} />
    </div>
  )
}

function BoardColumn({
  column,
  tasks,
  onOpenTask,
}: {
  column: Column
  tasks: Task[]
  onOpenTask: (id: string) => void
}) {
  const addTask = useStore((s) => s.addTask)
  const renameColumn = useStore((s) => s.renameColumn)
  const deleteColumn = useStore((s) => s.deleteColumn)
  const moveColumn = useStore((s) => s.moveColumn)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editing, setEditing] = useState(false)
  const { setNodeRef } = useDroppable({ id: column.id })

  const submit = () => {
    const t = newTitle.trim()
    if (t) addTask({ title: t, columnId: column.id })
    setNewTitle('')
    setAdding(false)
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-ink-800 bg-ink-900/60">
      <div className="group flex items-center gap-2 px-3 pt-3 pb-2">
        {editing ? (
          <input
            autoFocus
            className="input py-1 text-sm font-semibold"
            defaultValue={column.title}
            onBlur={(e) => {
              if (e.target.value.trim()) renameColumn(column.id, e.target.value.trim())
              setEditing(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <>
            <span className="text-sm font-semibold text-white">{column.title}</span>
            <span className="rounded-full bg-ink-800 px-1.5 text-[11px] text-ink-300">{tasks.length}</span>
            <div className="flex-1" />
            <div className="hidden items-center gap-0.5 text-ink-400 group-hover:flex">
              <button className="cursor-pointer rounded p-1 hover:bg-ink-800 hover:text-ink-100" onClick={() => moveColumn(column.id, -1)}>
                <ArrowLeft size={13} />
              </button>
              <button className="cursor-pointer rounded p-1 hover:bg-ink-800 hover:text-ink-100" onClick={() => moveColumn(column.id, 1)}>
                <ArrowRight size={13} />
              </button>
              <button className="cursor-pointer rounded p-1 hover:bg-ink-800 hover:text-ink-100" onClick={() => setEditing(true)}>
                <Pencil size={13} />
              </button>
              <button
                className="cursor-pointer rounded p-1 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => {
                  if (tasks.length === 0 || confirm(`Delete "${column.title}"? Its ${tasks.length} task(s) move to the first column.`))
                    deleteColumn(column.id)
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </>
        )}
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-2">
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />
          ))}
        </div>
      </SortableContext>

      <div className="px-3 pb-3">
        {adding ? (
          <input
            autoFocus
            className="input text-sm"
            placeholder="Card title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') setAdding(false)
            }}
            onBlur={submit}
          />
        ) : (
          <button className="btn-ghost w-full justify-start" onClick={() => setAdding(true)}>
            <Plus size={14} /> Add card
          </button>
        )}
      </div>
    </div>
  )
}

export default function KanbanView() {
  const tasks = useStore((s) => s.tasks)
  const columns = useStore((s) => s.columns)
  const setTasks = useStore((s) => s.setTasks)
  const moveTask = useStore((s) => s.moveTask)
  const addColumn = useStore((s) => s.addColumn)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [columnTitle, setColumnTitle] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns])
  const byColumn = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const col of columns) map.set(col.id, [])
    for (const task of [...tasks].sort((a, b) => a.order - b.order)) {
      map.get(task.columnId)?.push(task)
    }
    return map
  }, [tasks, columns])

  const containerOf = (id: string): string | undefined => {
    if (columns.some((c) => c.id === id)) return id
    return tasks.find((t) => t.id === id)?.columnId
  }

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null)
  }

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return
    const from = containerOf(String(active.id))
    const to = containerOf(String(over.id))
    if (!from || !to || from === to) return
    // Move into the new column at the end; precise position settles on drag end.
    const order = Math.max(-1, ...(byColumn.get(to)?.map((t) => t.order) ?? [])) + 1
    moveTask(String(active.id), to, order)
  }

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = e
    if (!over) return
    const container = containerOf(String(over.id))
    if (!container) return
    const items = byColumn.get(container) ?? []
    const fromIndex = items.findIndex((t) => t.id === active.id)
    const toIndex = items.findIndex((t) => t.id === over.id)
    if (fromIndex < 0) return
    const reordered = toIndex >= 0 && fromIndex !== toIndex ? arrayMove(items, fromIndex, toIndex) : items
    const orderById = new Map(reordered.map((t, i) => [t.id, i]))
    setTasks(tasks.map((t) => (orderById.has(t.id) ? { ...t, order: orderById.get(t.id)! } : t)))
  }

  return (
    <div className="flex h-full flex-col px-6 py-8">
      <h1 className="text-2xl font-bold text-white">Kanban</h1>
      <p className="mt-1 text-sm text-ink-400">Drag cards between columns — dropping into Done completes the task.</p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="mt-5 flex flex-1 items-start gap-4 overflow-x-auto pb-4">
          {sortedColumns.map((col) => (
            <BoardColumn key={col.id} column={col} tasks={byColumn.get(col.id) ?? []} onOpenTask={setOpenTaskId} />
          ))}

          <div className="w-64 shrink-0">
            {addingColumn ? (
              <input
                autoFocus
                className="input"
                placeholder="Column name…"
                value={columnTitle}
                onChange={(e) => setColumnTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && columnTitle.trim()) {
                    addColumn(columnTitle.trim())
                    setColumnTitle('')
                    setAddingColumn(false)
                  }
                  if (e.key === 'Escape') setAddingColumn(false)
                }}
                onBlur={() => setAddingColumn(false)}
              />
            ) : (
              <button className="btn-ghost w-full justify-start border border-dashed border-ink-700" onClick={() => setAddingColumn(true)}>
                <Plus size={14} /> Add column
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="w-64 rounded-lg border border-brand-500/60 bg-ink-850 p-3 shadow-xl shadow-black/40">
              <CardBody task={activeTask} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {openTaskId && <TaskModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
    </div>
  )
}
