import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarDays, CheckSquare, FileText, Search } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import TaskModal from './todo/TaskModal'

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? ''
}

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const tasks = useStore((s) => s.tasks)
  const notes = useStore((s) => s.notes)
  const events = useStore((s) => s.events)
  const setView = useStore((s) => s.setView)
  const setSelectedNote = useStore((s) => s.setSelectedNote)
  const setCalendarJumpDate = useStore((s) => s.setCalendarJumpDate)
  const t = useT()
  const [query, setQuery] = useState('')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!q) return { tasks: [], notes: [], events: [] }
    return {
      tasks: tasks.filter((task) => task.title.toLowerCase().includes(q)).slice(0, 6),
      notes: notes
        .filter((n) => n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q))
        .slice(0, 6),
      events: events.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 6),
    }
  }, [q, tasks, notes, events])

  const empty = q && results.tasks.length + results.notes.length + results.events.length === 0

  if (openTaskId)
    return (
      <TaskModal
        taskId={openTaskId}
        onClose={() => {
          setOpenTaskId(null)
          onClose()
        }}
      />
    )

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-ink-800 px-4 py-3">
          <Search size={16} className="text-brand-500" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder-ink-400"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          />
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {empty && <div className="px-4 py-6 text-center text-sm text-ink-400">{t('search.noResults')}</div>}

          {results.tasks.length > 0 && (
            <div className="px-2 pt-2 pb-1 text-[11px] font-semibold text-ink-400 uppercase">{t('search.tasks')}</div>
          )}
          {results.tasks.map((task) => (
            <button
              key={task.id}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ink-800"
              onClick={() => setOpenTaskId(task.id)}
            >
              <CheckSquare size={14} className="shrink-0 text-brand-500" />
              <span className={`min-w-0 flex-1 truncate text-sm ${task.done ? 'text-ink-400 line-through' : 'text-ink-100'}`}>
                {task.title}
              </span>
              {task.dueDate && <span className="text-xs text-ink-400">{format(parseISO(task.dueDate), 'MMM d')}</span>}
            </button>
          ))}

          {results.notes.length > 0 && (
            <div className="px-2 pt-2 pb-1 text-[11px] font-semibold text-ink-400 uppercase">{t('search.notes')}</div>
          )}
          {results.notes.map((note) => (
            <button
              key={note.id}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ink-800"
              onClick={() => {
                setSelectedNote(note.id)
                setView('notes')
                onClose()
              }}
            >
              <FileText size={14} className="shrink-0 text-brand-500" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-100">{note.title || t('notes.untitled')}</span>
              <span className="max-w-32 truncate text-xs text-ink-400">{stripHtml(note.content).slice(0, 40)}</span>
            </button>
          ))}

          {results.events.length > 0 && (
            <div className="px-2 pt-2 pb-1 text-[11px] font-semibold text-ink-400 uppercase">{t('search.events')}</div>
          )}
          {results.events.map((event) => (
            <button
              key={event.id}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ink-800"
              onClick={() => {
                setCalendarJumpDate(event.date)
                setView('calendar')
                onClose()
              }}
            >
              <CalendarDays size={14} className="shrink-0 text-brand-500" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-100">{event.title}</span>
              <span className="text-xs text-ink-400">
                {format(parseISO(event.date), 'MMM d')}
                {event.startTime ? ` · ${event.startTime}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
