import { useEffect, useMemo, useState } from 'react'
import { format, isPast, isToday, parseISO } from 'date-fns'
import { CalendarDays, ChevronDown, ListChecks, Plus, Repeat, Rocket } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { tagChipClass } from '../../utils/torrasPresets'
import type { Task } from '../../types'
import TaskModal, { PRIORITY_CHIP, PRIORITY_KEY } from './TaskModal'
import PlaybookModal from './PlaybookModal'

type SortMode = 'created' | 'dueDate' | 'priority'
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

function DueChip({ task }: { task: Task }) {
  const t = useT()
  if (!task.dueDate) return null
  const due = parseISO(task.dueDate)
  const overdue = !task.done && isPast(due) && !isToday(due)
  return (
    <span
      className={`chip ${
        overdue ? 'bg-red-500/15 text-red-400' : isToday(due) ? 'bg-brand-500/15 text-brand-400' : 'bg-ink-800 text-ink-300'
      }`}
    >
      <CalendarDays size={11} />
      {isToday(due) ? t('todos.dueToday') : format(due, 'MMM d')}
    </span>
  )
}

export function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const toggleTaskDone = useStore((s) => s.toggleTaskDone)
  const t = useT()
  const subDone = task.subtasks.filter((s) => s.done).length
  return (
    <div
      className="group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-ink-700 hover:bg-ink-900"
      onClick={onOpen}
    >
      <input
        type="checkbox"
        checked={task.done}
        onClick={(e) => e.stopPropagation()}
        onChange={() => toggleTaskDone(task.id)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-brand-500"
      />
      <span className={`min-w-0 flex-1 truncate text-sm ${task.done ? 'text-ink-400 line-through' : 'text-ink-100'}`}>
        {task.title}
      </span>
      {task.subtasks.length > 0 && (
        <span className="chip bg-ink-800 text-ink-300">
          <ListChecks size={11} />
          {subDone}/{task.subtasks.length}
        </span>
      )}
      {task.tags.map((tag) => (
        <span key={tag} className={`chip hidden sm:inline-flex ${tagChipClass(tag)}`}>
          #{tag}
        </span>
      ))}
      {task.recurrence && <Repeat size={12} className="shrink-0 text-ink-400" />}
      {task.priority && <span className={`chip ${PRIORITY_CHIP[task.priority]}`}>{t(PRIORITY_KEY[task.priority])}</span>}
      <DueChip task={task} />
    </div>
  )
}

export default function TodoView() {
  const tasks = useStore((s) => s.tasks)
  const addTask = useStore((s) => s.addTask)
  const t = useT()
  const [title, setTitle] = useState('')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string>('')
  const [sort, setSort] = useState<SortMode>('created')
  const [showDone, setShowDone] = useState(false)
  const [showPlaybook, setShowPlaybook] = useState(false)

  // One-shot tag filter handoff from the campaign hub.
  const requestedTag = useStore((s) => s.todosFilterTag)
  const setTodosFilterTag = useStore((s) => s.setTodosFilterTag)
  useEffect(() => {
    if (requestedTag) {
      setTagFilter(requestedTag)
      setTodosFilterTag(null)
    }
  }, [requestedTag, setTodosFilterTag])

  const allTags = useMemo(() => [...new Set(tasks.flatMap((t) => t.tags))].sort(), [tasks])

  const visible = useMemo(() => {
    let list = tasks.filter((t) => (tagFilter ? t.tags.includes(tagFilter) : true))
    list = list.filter((t) => (showDone ? t.done : !t.done))
    return [...list].sort((a, b) => {
      if (sort === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      }
      if (sort === 'priority') {
        return (a.priority ? PRIORITY_RANK[a.priority] : 3) - (b.priority ? PRIORITY_RANK[b.priority] : 3)
      }
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [tasks, tagFilter, sort, showDone])

  const submit = () => {
    const t = title.trim()
    if (!t) return
    addTask({ title: t, tags: tagFilter ? [tagFilter] : [] })
    setTitle('')
  }

  const doneCount = tasks.filter((t) => t.done).length

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white">{t('todos.title')}</h1>
      <p className="mt-1 text-sm text-ink-400">{t('todos.summary', { open: tasks.length - doneCount, done: doneCount })}</p>

      <div className="card mt-5 flex items-center gap-2 px-3 py-2 focus-within:border-brand-500/60">
        <Plus size={17} className="text-brand-500" />
        <input
          className="flex-1 bg-transparent py-1 text-sm outline-none placeholder-ink-400"
          placeholder={t('todos.addPlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <div className="relative">
          <select className="input w-auto cursor-pointer appearance-none pr-8" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">{t('todos.allTags')}</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-400" />
        </div>
        <div className="relative">
          <select className="input w-auto cursor-pointer appearance-none pr-8" value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
            <option value="created">{t('todos.sortCreated')}</option>
            <option value="dueDate">{t('todos.sortDue')}</option>
            <option value="priority">{t('todos.sortPriority')}</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-400" />
        </div>
        <div className="flex-1" />
        <button className="btn-ghost" onClick={() => setShowPlaybook(true)}>
          <Rocket size={14} /> {t('playbook.button')}
        </button>
        <button className={showDone ? 'btn-primary' : 'btn-ghost'} onClick={() => setShowDone(!showDone)}>
          {t('todos.completed', { n: doneCount })}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-0.5">
        {visible.length === 0 && (
          <div className="card mt-2 px-6 py-10 text-center text-sm text-ink-400">
            {showDone ? t('todos.emptyDone') : t('todos.emptyOpen')}
          </div>
        )}
        {visible.map((task) => (
          <TaskRow key={task.id} task={task} onOpen={() => setOpenTaskId(task.id)} />
        ))}
      </div>

      {openTaskId && <TaskModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
      {showPlaybook && <PlaybookModal onClose={() => setShowPlaybook(false)} />}
    </div>
  )
}
