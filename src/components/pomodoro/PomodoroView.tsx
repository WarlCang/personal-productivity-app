import { useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import { Bell, BellOff, Gamepad2, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useStore, useGameUnlocked } from '../../store/useStore'
import type { PomodoroPhase } from '../../types'

const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: 'Focus',
  break: 'Short break',
  longBreak: 'Long break',
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function TimerRing({ progress, phase, children }: { progress: number; phase: PomodoroPhase; children: React.ReactNode }) {
  const r = 130
  const c = 2 * Math.PI * r
  const color = phase === 'focus' ? 'var(--color-brand-500)' : '#34d399'
  return (
    <div className="relative h-72 w-72">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 300 300">
        <circle cx="150" cy="150" r={r} fill="none" stroke="var(--color-ink-800)" strokeWidth="10" />
        <circle
          cx="150"
          cy="150"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="text-xs text-ink-400">
      {label}
      <input
        type="number"
        className="input mt-1"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v) && v >= min && v <= max) onChange(v)
        }}
      />
    </label>
  )
}

export default function PomodoroView() {
  const phase = useStore((s) => s.phase)
  const running = useStore((s) => s.running)
  const secondsLeft = useStore((s) => s.secondsLeft)
  const round = useStore((s) => s.round)
  const settings = useStore((s) => s.pomodoroSettings)
  const updateSettings = useStore((s) => s.updatePomodoroSettings)
  const startPomodoro = useStore((s) => s.startPomodoro)
  const pausePomodoro = useStore((s) => s.pausePomodoro)
  const resumePomodoro = useStore((s) => s.resumePomodoro)
  const skipPhase = useStore((s) => s.skipPhase)
  const resetPomodoro = useStore((s) => s.resetPomodoro)
  const currentTaskId = useStore((s) => s.currentTaskId)
  const setCurrentTaskId = useStore((s) => s.setCurrentTaskId)
  const tasks = useStore((s) => s.tasks)
  const sessions = useStore((s) => s.sessions)
  const setView = useStore((s) => s.setView)
  const gameUnlocked = useGameUnlocked()
  const [showSettings, setShowSettings] = useState(false)

  const totalSeconds =
    (phase === 'focus' ? settings.focusMinutes : phase === 'break' ? settings.breakMinutes : settings.longBreakMinutes) * 60
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const currentTask = tasks.find((t) => t.id === currentTaskId)
  const openTasks = tasks.filter((t) => !t.done)

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i)
      const key = format(d, 'yyyy-MM-dd')
      const minutes = sessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.minutes, 0)
      return { label: format(d, 'EEE'), key, minutes }
    })
    const todayMinutes = sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.minutes, 0)
    const todayCount = sessions.filter((s) => s.date === today).length
    return { days, todayMinutes, todayCount, max: Math.max(25, ...days.map((d) => d.minutes)) }
  }, [sessions])

  const requestNotifications = async () => {
    if (settings.notificationsEnabled) return updateSettings({ notificationsEnabled: false })
    if (!('Notification' in window)) return alert('This browser does not support notifications.')
    const permission = await Notification.requestPermission()
    if (permission === 'granted') updateSettings({ notificationsEnabled: true })
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Pomodoro</h1>
        <div className="flex items-center gap-1">
          <button
            className="btn-ghost px-2"
            title={settings.soundEnabled ? 'Sound on' : 'Sound off'}
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
          >
            {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            className="btn-ghost px-2"
            title={settings.notificationsEnabled ? 'Notifications on' : 'Notifications off'}
            onClick={requestNotifications}
          >
            {settings.notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          <button className="btn-ghost" onClick={() => setShowSettings(!showSettings)}>
            Settings
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="card mt-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <NumberField label="Focus (min)" value={settings.focusMinutes} min={1} max={120} onChange={(v) => updateSettings({ focusMinutes: v })} />
          <NumberField label="Break (min)" value={settings.breakMinutes} min={1} max={60} onChange={(v) => updateSettings({ breakMinutes: v })} />
          <NumberField label="Long break (min)" value={settings.longBreakMinutes} min={1} max={90} onChange={(v) => updateSettings({ longBreakMinutes: v })} />
          <NumberField
            label="Rounds before long"
            value={settings.roundsBeforeLongBreak}
            min={2}
            max={10}
            onChange={(v) => updateSettings({ roundsBeforeLongBreak: v })}
          />
        </div>
      )}

      <div className="mt-6 flex flex-col items-center">
        <span
          className={`chip ${phase === 'focus' ? 'bg-brand-500/15 text-brand-400' : 'bg-emerald-500/15 text-emerald-400'}`}
        >
          {PHASE_LABEL[phase]} · round{' '}
          {phase === 'focus'
            ? (round % settings.roundsBeforeLongBreak) + 1
            : Math.max(1, ((round - 1 + settings.roundsBeforeLongBreak) % settings.roundsBeforeLongBreak) + 1)}
          /{settings.roundsBeforeLongBreak}
        </span>

        <div className="mt-4">
          <TimerRing progress={progress} phase={phase}>
            <div className="font-mono text-6xl font-bold text-white tabular-nums">{formatClock(secondsLeft)}</div>
            {currentTask && phase === 'focus' && (
              <div className="mt-2 max-w-48 truncate text-xs text-ink-400">{currentTask.title}</div>
            )}
          </TimerRing>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {!running && phase === 'focus' && secondsLeft === settings.focusMinutes * 60 ? (
            <button className="btn-primary px-6 py-2.5 text-base" onClick={() => startPomodoro()}>
              <Play size={17} /> Start focus
            </button>
          ) : running ? (
            <button className="btn-primary px-6 py-2.5 text-base" onClick={pausePomodoro}>
              <Pause size={17} /> Pause
            </button>
          ) : (
            <button className="btn-primary px-6 py-2.5 text-base" onClick={resumePomodoro}>
              <Play size={17} /> Resume
            </button>
          )}
          <button className="btn-ghost" title="Skip phase" onClick={skipPhase}>
            <SkipForward size={16} />
          </button>
          <button className="btn-ghost" title="Reset" onClick={resetPomodoro}>
            <RotateCcw size={16} />
          </button>
        </div>

        {gameUnlocked && (
          <button className="btn mt-4 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" onClick={() => setView('game')}>
            <Gamepad2 size={15} /> Break time — play Drop Defense!
          </button>
        )}

        {phase === 'focus' && !running && openTasks.length > 0 && (
          <label className="mt-5 w-full max-w-sm text-xs text-ink-400">
            Focus on a task (optional)
            <select
              className="input mt-1 cursor-pointer"
              value={currentTaskId ?? ''}
              onChange={(e) => setCurrentTaskId(e.target.value || null)}
            >
              <option value="">No task selected</option>
              {openTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="card mt-8 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-white">Focus stats</h2>
          <span className="text-xs text-ink-400">
            Today: {stats.todayCount} session{stats.todayCount === 1 ? '' : 's'} · {stats.todayMinutes} min
          </span>
        </div>
        <div className="mt-4 flex h-28 items-end gap-2">
          {stats.days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-ink-400">{d.minutes > 0 ? `${d.minutes}m` : ''}</span>
              <div
                className={`w-full rounded-t ${d.minutes > 0 ? 'bg-brand-500' : 'bg-ink-800'}`}
                style={{ height: `${Math.max(4, (d.minutes / stats.max) * 80)}px` }}
              />
              <span className="text-[10px] text-ink-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
