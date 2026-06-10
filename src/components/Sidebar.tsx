import {
  CalendarDays,
  CheckSquare,
  Gamepad2,
  Kanban,
  ListTodo,
  Lock,
  NotebookPen,
  Timer,
} from 'lucide-react'
import { useStore, useGameUnlocked } from '../store/useStore'
import type { ViewName } from '../types'

const NAV: { view: ViewName; label: string; icon: typeof ListTodo }[] = [
  { view: 'todos', label: 'Todos', icon: ListTodo },
  { view: 'kanban', label: 'Kanban', icon: Kanban },
  { view: 'calendar', label: 'Calendar', icon: CalendarDays },
  { view: 'notes', label: 'Notes', icon: NotebookPen },
  { view: 'pomodoro', label: 'Pomodoro', icon: Timer },
  { view: 'game', label: 'Drop Defense', icon: Gamepad2 },
]

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Sidebar() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const running = useStore((s) => s.running)
  const phase = useStore((s) => s.phase)
  const secondsLeft = useStore((s) => s.secondsLeft)
  const tasks = useStore((s) => s.tasks)
  const gameUnlocked = useGameUnlocked()

  const openCount = tasks.filter((t) => !t.done).length

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-ink-800 bg-ink-900">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-7">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-black text-ink-950">
          T
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-[0.18em] text-white">TORRAS</div>
          <div className="text-[11px] tracking-wide text-ink-400">PRODUCTIVITY</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map(({ view: v, label, icon: Icon }) => {
          const active = view === v
          const locked = v === 'game' && !gameUnlocked
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              <span className="flex-1 text-left">{label}</span>
              {v === 'todos' && openCount > 0 && (
                <span className="rounded-full bg-ink-700 px-1.5 text-[11px] text-ink-200">{openCount}</span>
              )}
              {v === 'game' &&
                (locked ? (
                  <Lock size={13} className="text-ink-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                ))}
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      {(running || phase !== 'focus') && (
        <button
          onClick={() => setView('pomodoro')}
          className="mx-3 mb-3 cursor-pointer rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-left transition-colors hover:border-brand-500/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
              {phase === 'focus' ? 'Focusing' : phase === 'break' ? 'Break' : 'Long break'}
            </span>
            {phase === 'focus' ? (
              <CheckSquare size={12} className="text-brand-500" />
            ) : (
              <Gamepad2 size={12} className="text-brand-500" />
            )}
          </div>
          <div className="mt-0.5 font-mono text-xl font-semibold text-white tabular-nums">
            {formatClock(secondsLeft)}
            {!running && <span className="ml-2 text-xs font-normal text-ink-400">paused</span>}
          </div>
        </button>
      )}

      <div className="px-5 pb-4 text-[11px] text-ink-600">Local data · no account</div>
    </aside>
  )
}
