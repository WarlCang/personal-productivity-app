import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format } from 'date-fns'
import type {
  CalendarEvent,
  Column,
  FocusSession,
  Note,
  PomodoroPhase,
  PomodoroSettings,
  Task,
  ViewName,
} from '../types'
import { uid } from '../utils/id'
import { playChime } from '../utils/sound'

const DEFAULT_COLUMNS: Column[] = [
  { id: 'col-todo', title: 'To Do', order: 0 },
  { id: 'col-progress', title: 'In Progress', order: 1 },
  { id: 'col-done', title: 'Done', order: 2, isDoneColumn: true },
]

const DEFAULT_POMODORO: PomodoroSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  soundEnabled: true,
  notificationsEnabled: false,
}

interface Store {
  view: ViewName
  setView: (view: ViewName) => void

  tasks: Task[]
  columns: Column[]
  addTask: (partial: Partial<Task> & { title: string }) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTaskDone: (id: string) => void
  moveTask: (id: string, columnId: string, order: number) => void
  setTasks: (tasks: Task[]) => void
  addColumn: (title: string) => void
  renameColumn: (id: string, title: string) => void
  deleteColumn: (id: string) => void
  moveColumn: (id: string, direction: -1 | 1) => void

  events: CalendarEvent[]
  addEvent: (partial: Omit<CalendarEvent, 'id'>) => void
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void

  notes: Note[]
  addNote: (folder?: string) => Note
  updateNote: (id: string, patch: Partial<Note>) => void
  deleteNote: (id: string) => void

  // Pomodoro
  pomodoroSettings: PomodoroSettings
  updatePomodoroSettings: (patch: Partial<PomodoroSettings>) => void
  phase: PomodoroPhase
  running: boolean
  /** Epoch ms when the current phase ends (while running). */
  endsAt: number | null
  /** Seconds remaining while paused / idle. */
  secondsLeft: number
  /** Focus sessions completed in the current cycle. */
  round: number
  currentTaskId: string | null
  sessions: FocusSession[]
  setCurrentTaskId: (taskId: string | null) => void
  startPomodoro: (taskId?: string | null) => void
  pausePomodoro: () => void
  resumePomodoro: () => void
  skipPhase: () => void
  resetPomodoro: () => void
  tick: () => void

  gameHighScore: number
  setGameHighScore: (score: number) => void
}

function notifyPhaseEnd(settings: PomodoroSettings, finished: PomodoroPhase) {
  if (settings.soundEnabled) playChime()
  if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
    const body =
      finished === 'focus'
        ? 'Focus session complete — time for a break. The game is unlocked!'
        : 'Break is over — back to focus.'
    new Notification('TORRAS Productivity', { body, icon: '/favicon.svg' })
  }
}

function phaseSeconds(settings: PomodoroSettings, phase: PomodoroPhase): number {
  const minutes =
    phase === 'focus'
      ? settings.focusMinutes
      : phase === 'break'
        ? settings.breakMinutes
        : settings.longBreakMinutes
  return minutes * 60
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      view: 'todos',
      setView: (view) => set({ view }),

      tasks: [],
      columns: DEFAULT_COLUMNS,

      addTask: (partial) => {
        const columns = get().columns
        const firstCol = [...columns].sort((a, b) => a.order - b.order).find((c) => !c.isDoneColumn) ?? columns[0]
        const columnId = partial.columnId ?? firstCol.id
        const order = Math.max(-1, ...get().tasks.filter((t) => t.columnId === columnId).map((t) => t.order)) + 1
        const task: Task = {
          id: uid(),
          title: partial.title,
          description: partial.description,
          done: false,
          createdAt: new Date().toISOString(),
          dueDate: partial.dueDate,
          priority: partial.priority,
          tags: partial.tags ?? [],
          subtasks: partial.subtasks ?? [],
          columnId,
          order,
        }
        set({ tasks: [...get().tasks, task] })
        return task
      },

      updateTask: (id, patch) =>
        set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),

      deleteTask: (id) => set({ tasks: get().tasks.filter((t) => t.id !== id) }),

      toggleTaskDone: (id) => {
        const { tasks, columns } = get()
        const task = tasks.find((t) => t.id === id)
        if (!task) return
        const done = !task.done
        const doneCol = columns.find((c) => c.isDoneColumn)
        const firstCol = [...columns].sort((a, b) => a.order - b.order).find((c) => !c.isDoneColumn)
        let columnId = task.columnId
        if (done && doneCol) columnId = doneCol.id
        else if (!done && doneCol && task.columnId === doneCol.id && firstCol) columnId = firstCol.id
        set({
          tasks: tasks.map((t) =>
            t.id === id
              ? { ...t, done, completedAt: done ? new Date().toISOString() : undefined, columnId }
              : t,
          ),
        })
      },

      moveTask: (id, columnId, order) => {
        const { tasks, columns } = get()
        const doneCol = columns.find((c) => c.isDoneColumn)
        set({
          tasks: tasks.map((t) => {
            if (t.id !== id) return t
            const done = doneCol ? columnId === doneCol.id : t.done
            return {
              ...t,
              columnId,
              order,
              done,
              completedAt: done ? (t.completedAt ?? new Date().toISOString()) : undefined,
            }
          }),
        })
      },

      setTasks: (tasks) => set({ tasks }),

      addColumn: (title) => {
        const order = Math.max(-1, ...get().columns.map((c) => c.order)) + 1
        set({ columns: [...get().columns, { id: uid(), title, order }] })
      },

      renameColumn: (id, title) =>
        set({ columns: get().columns.map((c) => (c.id === id ? { ...c, title } : c)) }),

      deleteColumn: (id) => {
        const { columns, tasks } = get()
        if (columns.length <= 1) return
        const remaining = columns.filter((c) => c.id !== id)
        const fallback = [...remaining].sort((a, b) => a.order - b.order)[0]
        set({
          columns: remaining,
          tasks: tasks.map((t) => (t.columnId === id ? { ...t, columnId: fallback.id } : t)),
        })
      },

      moveColumn: (id, direction) => {
        const sorted = [...get().columns].sort((a, b) => a.order - b.order)
        const index = sorted.findIndex((c) => c.id === id)
        const swapWith = index + direction
        if (index < 0 || swapWith < 0 || swapWith >= sorted.length) return
        ;[sorted[index], sorted[swapWith]] = [sorted[swapWith], sorted[index]]
        set({ columns: sorted.map((c, i) => ({ ...c, order: i })) })
      },

      events: [],
      addEvent: (partial) => set({ events: [...get().events, { ...partial, id: uid() }] }),
      updateEvent: (id, patch) =>
        set({ events: get().events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }),
      deleteEvent: (id) => set({ events: get().events.filter((e) => e.id !== id) }),

      notes: [],
      addNote: (folder = '') => {
        const now = new Date().toISOString()
        const note: Note = { id: uid(), title: 'Untitled', content: '', folder, createdAt: now, updatedAt: now }
        set({ notes: [note, ...get().notes] })
        return note
      },
      updateNote: (id, patch) =>
        set({
          notes: get().notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
          ),
        }),
      deleteNote: (id) => set({ notes: get().notes.filter((n) => n.id !== id) }),

      pomodoroSettings: DEFAULT_POMODORO,
      updatePomodoroSettings: (patch) => {
        const settings = { ...get().pomodoroSettings, ...patch }
        const update: Partial<Store> = { pomodoroSettings: settings }
        // Keep an idle (never-started) timer in sync with the new duration.
        if (!get().running && get().secondsLeft === phaseSeconds(get().pomodoroSettings, get().phase)) {
          update.secondsLeft = phaseSeconds(settings, get().phase)
        }
        set(update)
      },

      phase: 'focus',
      running: false,
      endsAt: null,
      secondsLeft: DEFAULT_POMODORO.focusMinutes * 60,
      round: 0,
      currentTaskId: null,
      sessions: [],

      setCurrentTaskId: (taskId) => set({ currentTaskId: taskId }),

      startPomodoro: (taskId) => {
        const seconds = phaseSeconds(get().pomodoroSettings, 'focus')
        set({
          phase: 'focus',
          running: true,
          endsAt: Date.now() + seconds * 1000,
          secondsLeft: seconds,
          currentTaskId: taskId !== undefined ? taskId : get().currentTaskId,
        })
      },

      pausePomodoro: () => {
        const { endsAt } = get()
        if (!endsAt) return
        set({ running: false, secondsLeft: Math.max(0, Math.round((endsAt - Date.now()) / 1000)), endsAt: null })
      },

      resumePomodoro: () => {
        const { secondsLeft } = get()
        set({ running: true, endsAt: Date.now() + secondsLeft * 1000 })
      },

      skipPhase: () => {
        const { phase, pomodoroSettings, round } = get()
        const nextRound = phase === 'focus' ? round : round
        const next: PomodoroPhase =
          phase === 'focus'
            ? (round + 1) % pomodoroSettings.roundsBeforeLongBreak === 0 && round > 0
              ? 'longBreak'
              : 'break'
            : 'focus'
        // Skipping a focus session does not record it or advance the round.
        const seconds = phaseSeconds(pomodoroSettings, next)
        set({
          phase: next,
          round: nextRound,
          running: false,
          endsAt: null,
          secondsLeft: seconds,
        })
      },

      resetPomodoro: () =>
        set({
          phase: 'focus',
          running: false,
          endsAt: null,
          secondsLeft: phaseSeconds(get().pomodoroSettings, 'focus'),
          round: 0,
        }),

      tick: () => {
        const { running, endsAt, phase, pomodoroSettings, round, sessions, currentTaskId } = get()
        if (!running || !endsAt) return
        const remaining = Math.round((endsAt - Date.now()) / 1000)
        if (remaining > 0) {
          if (remaining !== get().secondsLeft) set({ secondsLeft: remaining })
          return
        }
        // Phase finished.
        notifyPhaseEnd(pomodoroSettings, phase)
        if (phase === 'focus') {
          const newRound = round + 1
          const session: FocusSession = {
            id: uid(),
            date: format(new Date(), 'yyyy-MM-dd'),
            minutes: pomodoroSettings.focusMinutes,
            taskId: currentTaskId ?? undefined,
            completedAt: new Date().toISOString(),
          }
          const next: PomodoroPhase =
            newRound % pomodoroSettings.roundsBeforeLongBreak === 0 ? 'longBreak' : 'break'
          const seconds = phaseSeconds(pomodoroSettings, next)
          set({
            phase: next,
            round: newRound,
            sessions: [...sessions, session],
            running: true,
            endsAt: Date.now() + seconds * 1000,
            secondsLeft: seconds,
          })
        } else {
          const seconds = phaseSeconds(pomodoroSettings, 'focus')
          // Breaks auto-end but focus requires a deliberate start.
          set({ phase: 'focus', running: false, endsAt: null, secondsLeft: seconds })
        }
      },

      gameHighScore: 0,
      setGameHighScore: (score) => set({ gameHighScore: Math.max(score, get().gameHighScore) }),
    }),
    {
      name: 'torras-productivity',
      version: 1,
    },
  ),
)

/** The game is only playable during pomodoro breaks. */
export function useGameUnlocked(): boolean {
  return useStore((s) => s.phase !== 'focus')
}
