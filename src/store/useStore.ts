import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, addMonths, format, parseISO } from 'date-fns'
import type {
  Board,
  CalendarEvent,
  Campaign,
  Column,
  DiscountCode,
  FocusSession,
  Note,
  PomodoroPhase,
  PomodoroSettings,
  QuickLink,
  Task,
  ViewName,
} from '../types'
import { uid } from '../utils/id'
import { playChime } from '../utils/sound'
import { DEFAULT_PLAYBOOKS, type Playbook } from '../utils/playbooks'
import { DEFAULT_CHANNEL_CHECKLISTS, type ChannelChecklist } from '../utils/channelChecklists'
import type { VaultBlob } from '../utils/vaultCrypto'
import { translate, type Lang } from '../i18n/dict'

const MAIN_BOARD_ID = 'board-main'

const DEFAULT_BOARDS: Board[] = [{ id: MAIN_BOARD_ID, title: 'Main' }]

const DEFAULT_COLUMNS: Column[] = [
  { id: 'col-todo', title: 'To Do', order: 0, boardId: MAIN_BOARD_ID },
  { id: 'col-progress', title: 'In Progress', order: 1, boardId: MAIN_BOARD_ID },
  { id: 'col-done', title: 'Done', order: 2, boardId: MAIN_BOARD_ID, isDoneColumn: true },
]

/** Starter set for the quick-links launcher; fully user-editable afterwards. */
const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: 'ql-klaviyo', name: 'Klaviyo', url: 'https://www.klaviyo.com/login' },
  { id: 'ql-gads', name: 'Google Ads', url: 'https://ads.google.com/' },
  { id: 'ql-meta', name: 'Meta Ads Manager', url: 'https://adsmanager.facebook.com/' },
  { id: 'ql-ga', name: 'Google Analytics', url: 'https://analytics.google.com/' },
  { id: 'ql-gsc', name: 'Search Console', url: 'https://search.google.com/search-console' },
]

const DEFAULT_POMODORO: PomodoroSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  soundEnabled: true,
  notificationsEnabled: false,
}

export type { Lang }

interface Store {
  view: ViewName
  setView: (view: ViewName) => void
  language: Lang
  setLanguage: (language: Lang) => void

  tasks: Task[]
  columns: Column[]
  boards: Board[]
  activeBoardId: string
  setActiveBoard: (id: string) => void
  addBoard: (title: string) => void
  renameBoard: (id: string, title: string) => void
  deleteBoard: (id: string) => void
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
  /** Creates a NEW board from a template and switches to it. */
  applyBoardTemplate: (title: string, columns: { title: string; isDoneColumn?: boolean }[]) => void

  events: CalendarEvent[]
  addEvent: (partial: Omit<CalendarEvent, 'id'>) => void
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void

  notes: Note[]
  selectedNoteId: string | null
  setSelectedNote: (id: string | null) => void
  addNote: (partial?: { title?: string; content?: string; folder?: string }) => Note
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

  /** Shopify store handle for admin deep links (admin.shopify.com/store/<handle>). */
  shopifyStoreHandle: string
  setShopifyStoreHandle: (handle: string) => void

  /** Encrypted password vault blob — only ciphertext is ever persisted. */
  vault: VaultBlob | null
  setVault: (vault: VaultBlob | null) => void

  /** Campaign playbook templates — seeded with defaults, fully user-editable. */
  playbooks: Playbook[]
  savePlaybook: (playbook: Playbook) => void
  deletePlaybook: (id: string) => void
  resetPlaybooks: () => void

  /** Channel QA checklists — seeded with defaults, fully user-editable. */
  channelChecklists: ChannelChecklist[]
  saveChecklist: (checklist: ChannelChecklist) => void
  deleteChecklist: (id: string) => void
  resetChecklists: () => void

  /** Campaigns instantiated from playbooks — what the campaign hub tracks. */
  campaigns: Campaign[]
  addCampaign: (partial: Omit<Campaign, 'id' | 'createdAt'>) => void
  deleteCampaign: (id: string) => void

  /** One-shot tag filter handoff: campaign hub sets it, TodoView consumes it. */
  todosFilterTag: string | null
  setTodosFilterTag: (tag: string | null) => void

  /**
   * Last task completion, undoable until the user moves elsewhere: cleared by
   * undo, dismissal, a newer completion, or switching views.
   */
  undoState: {
    taskId: string
    title: string
    prevColumnId: string
    prevOrder: number
    spawnedTaskId: string | null
  } | null
  undoComplete: () => void
  clearUndo: () => void

  quickLinks: QuickLink[]
  addQuickLink: (name: string, url: string) => void
  /** Appends links, skipping URLs already present. */
  addQuickLinks: (links: { name: string; url: string }[]) => void
  updateQuickLink: (id: string, patch: Partial<Omit<QuickLink, 'id'>>) => void
  deleteQuickLink: (id: string) => void

  discountCodes: DiscountCode[]
  addDiscountCode: (partial: Omit<DiscountCode, 'id' | 'createdAt'>) => void
  deleteDiscountCode: (id: string) => void

  gameHighScore: number
  setGameHighScore: (score: number) => void
  frenzyHighScore: number
  setFrenzyHighScore: (score: number) => void
  gameMusicEnabled: boolean
  setGameMusicEnabled: (enabled: boolean) => void

  /** When set, CalendarView jumps to this date and clears it. */
  calendarJumpDate: string | null
  setCalendarJumpDate: (date: string | null) => void

  /** yyyy-MM-dd of the last day a due-task notification was sent. */
  lastDueReminderDate: string | null
  markDueReminderSent: (date: string) => void
}

function notifyPhaseEnd(settings: PomodoroSettings, finished: PomodoroPhase, lang: Lang) {
  if (settings.soundEnabled) playChime()
  if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
    const body = translate(lang, finished === 'focus' ? 'pomodoro.notifFocusDone' : 'pomodoro.notifBreakDone')
    new Notification('TORRAS Productivity', { body, icon: '/favicon.svg' })
  }
}

/** Successor task created when a recurring task is completed. */
function nextOccurrence(task: Task, tasks: Task[], columns: Column[]): Task | null {
  if (!task.recurrence || !task.dueDate) return null
  const due = parseISO(task.dueDate)
  const next =
    task.recurrence === 'daily'
      ? addDays(due, 1)
      : task.recurrence === 'weekly'
        ? addDays(due, 7)
        : addMonths(due, 1)
  const boardId = columns.find((c) => c.id === task.columnId)?.boardId
  const boardCols = columns.filter((c) => c.boardId === boardId)
  const firstCol = [...boardCols].sort((a, b) => a.order - b.order).find((c) => !c.isDoneColumn) ?? boardCols[0]
  const columnId = firstCol?.id ?? task.columnId
  return {
    ...task,
    id: uid(),
    done: false,
    completedAt: undefined,
    createdAt: new Date().toISOString(),
    dueDate: format(next, 'yyyy-MM-dd'),
    subtasks: task.subtasks.map((s) => ({ ...s, id: uid(), done: false })),
    columnId,
    order: Math.max(-1, ...tasks.filter((t) => t.columnId === columnId).map((t) => t.order)) + 1,
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
      // Navigating away is the "moved elsewhere" signal that retires the undo toast.
      setView: (view) => set({ view, undoState: null }),
      language: 'en',
      setLanguage: (language) => set({ language }),

      tasks: [],
      columns: DEFAULT_COLUMNS,
      boards: DEFAULT_BOARDS,
      activeBoardId: MAIN_BOARD_ID,

      setActiveBoard: (id) => set({ activeBoardId: id }),

      addBoard: (title) => {
        const board: Board = { id: uid(), title }
        const columns: Column[] = [
          { id: uid(), title: 'To Do', order: 0, boardId: board.id },
          { id: uid(), title: 'In Progress', order: 1, boardId: board.id },
          { id: uid(), title: 'Done', order: 2, boardId: board.id, isDoneColumn: true },
        ]
        set({ boards: [...get().boards, board], columns: [...get().columns, ...columns], activeBoardId: board.id })
      },

      renameBoard: (id, title) =>
        set({ boards: get().boards.map((b) => (b.id === id ? { ...b, title } : b)) }),

      deleteBoard: (id) => {
        const { boards, columns, tasks } = get()
        if (boards.length <= 1) return
        const remaining = boards.filter((b) => b.id !== id)
        const removedColumnIds = new Set(columns.filter((c) => c.boardId === id).map((c) => c.id))
        const fallbackBoard = remaining[0]
        const fallbackCols = columns
          .filter((c) => c.boardId === fallbackBoard.id)
          .sort((a, b) => a.order - b.order)
        const firstCol = fallbackCols.find((c) => !c.isDoneColumn) ?? fallbackCols[0]
        const doneCol = fallbackCols.find((c) => c.isDoneColumn) ?? fallbackCols[fallbackCols.length - 1]
        set({
          boards: remaining,
          activeBoardId: get().activeBoardId === id ? fallbackBoard.id : get().activeBoardId,
          columns: columns.filter((c) => c.boardId !== id),
          tasks: tasks.map((t) =>
            removedColumnIds.has(t.columnId) ? { ...t, columnId: t.done ? doneCol.id : firstCol.id } : t,
          ),
        })
      },

      addTask: (partial) => {
        const { columns, activeBoardId } = get()
        const boardCols = columns.filter((c) => c.boardId === activeBoardId)
        const firstCol = [...boardCols].sort((a, b) => a.order - b.order).find((c) => !c.isDoneColumn) ?? boardCols[0]
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
        // Stay within the task's own board.
        const boardId = columns.find((c) => c.id === task.columnId)?.boardId
        const boardCols = columns.filter((c) => c.boardId === boardId)
        const doneCol = boardCols.find((c) => c.isDoneColumn)
        const firstCol = [...boardCols].sort((a, b) => a.order - b.order).find((c) => !c.isDoneColumn)
        let columnId = task.columnId
        let prevColumnId = task.prevColumnId
        if (done && doneCol) {
          prevColumnId = task.columnId
          columnId = doneCol.id
        } else if (!done && doneCol && task.columnId === doneCol.id) {
          // Restore the pre-completion column when it still exists.
          const restored = boardCols.find((c) => c.id === task.prevColumnId) ?? firstCol
          if (restored) columnId = restored.id
          prevColumnId = undefined
        }
        const updated = tasks.map((t) =>
          t.id === id
            ? { ...t, done, completedAt: done ? new Date().toISOString() : undefined, columnId, prevColumnId }
            : t,
        )
        const successor = done ? nextOccurrence(task, tasks, columns) : null
        set({
          tasks: successor ? [...updated, successor] : updated,
          undoState: done
            ? {
                taskId: task.id,
                title: task.title,
                prevColumnId: task.columnId,
                prevOrder: task.order,
                spawnedTaskId: successor?.id ?? null,
              }
            : null,
        })
      },

      moveTask: (id, columnId, order) => {
        const { tasks, columns } = get()
        const doneCol = columns.find((c) => c.isDoneColumn)
        const task = tasks.find((t) => t.id === id)
        const becameDone = !!task && !task.done && !!doneCol && columnId === doneCol.id
        const updated = tasks.map((t) => {
          if (t.id !== id) return t
          const done = doneCol ? columnId === doneCol.id : t.done
          return {
            ...t,
            columnId,
            order,
            done,
            completedAt: done ? (t.completedAt ?? new Date().toISOString()) : undefined,
            // A drag into Done remembers where the card came from; any other
            // manual move makes the current position the truth.
            prevColumnId: becameDone ? t.columnId : undefined,
          }
        })
        const successor = becameDone && task ? nextOccurrence(task, tasks, columns) : null
        set({
          tasks: successor ? [...updated, successor] : updated,
          ...(becameDone && task
            ? {
                undoState: {
                  taskId: task.id,
                  title: task.title,
                  prevColumnId: task.columnId,
                  prevOrder: task.order,
                  spawnedTaskId: successor?.id ?? null,
                },
              }
            : {}),
        })
      },

      setTasks: (tasks) => set({ tasks }),

      addColumn: (title) => {
        const { columns, activeBoardId } = get()
        const boardCols = columns.filter((c) => c.boardId === activeBoardId)
        const order = Math.max(-1, ...boardCols.map((c) => c.order)) + 1
        set({ columns: [...columns, { id: uid(), title, order, boardId: activeBoardId }] })
      },

      renameColumn: (id, title) =>
        set({ columns: get().columns.map((c) => (c.id === id ? { ...c, title } : c)) }),

      deleteColumn: (id) => {
        const { columns, tasks } = get()
        const column = columns.find((c) => c.id === id)
        if (!column) return
        const boardCols = columns.filter((c) => c.boardId === column.boardId)
        if (boardCols.length <= 1) return
        const fallback = [...boardCols].filter((c) => c.id !== id).sort((a, b) => a.order - b.order)[0]
        set({
          columns: columns.filter((c) => c.id !== id),
          tasks: tasks.map((t) => (t.columnId === id ? { ...t, columnId: fallback.id } : t)),
        })
      },

      applyBoardTemplate: (title, templateColumns) => {
        const board: Board = { id: uid(), title }
        const columns: Column[] = templateColumns.map((c, i) => ({
          id: uid(),
          title: c.title,
          order: i,
          boardId: board.id,
          isDoneColumn: c.isDoneColumn,
        }))
        set({
          boards: [...get().boards, board],
          columns: [...get().columns, ...columns],
          activeBoardId: board.id,
        })
      },

      moveColumn: (id, direction) => {
        const { columns } = get()
        const column = columns.find((c) => c.id === id)
        if (!column) return
        const sorted = columns.filter((c) => c.boardId === column.boardId).sort((a, b) => a.order - b.order)
        const index = sorted.findIndex((c) => c.id === id)
        const swapWith = index + direction
        if (index < 0 || swapWith < 0 || swapWith >= sorted.length) return
        ;[sorted[index], sorted[swapWith]] = [sorted[swapWith], sorted[index]]
        const orderById = new Map(sorted.map((c, i) => [c.id, i]))
        set({ columns: columns.map((c) => (orderById.has(c.id) ? { ...c, order: orderById.get(c.id)! } : c)) })
      },

      events: [],
      addEvent: (partial) => set({ events: [...get().events, { ...partial, id: uid() }] }),
      updateEvent: (id, patch) =>
        set({ events: get().events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }),
      deleteEvent: (id) => set({ events: get().events.filter((e) => e.id !== id) }),

      notes: [],
      selectedNoteId: null,
      setSelectedNote: (id) => set({ selectedNoteId: id }),
      addNote: (partial = {}) => {
        const now = new Date().toISOString()
        const note: Note = {
          id: uid(),
          title: partial.title ?? '',
          content: partial.content ?? '',
          folder: partial.folder ?? '',
          createdAt: now,
          updatedAt: now,
        }
        set({ notes: [note, ...get().notes], selectedNoteId: note.id })
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
        notifyPhaseEnd(pomodoroSettings, phase, get().language)
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

      shopifyStoreHandle: '',
      setShopifyStoreHandle: (handle) => set({ shopifyStoreHandle: handle.trim() }),

      vault: null,
      setVault: (vault) => set({ vault }),

      playbooks: DEFAULT_PLAYBOOKS,
      savePlaybook: (playbook) => {
        const { playbooks } = get()
        const exists = playbooks.some((p) => p.id === playbook.id)
        set({
          playbooks: exists
            ? playbooks.map((p) => (p.id === playbook.id ? playbook : p))
            : [...playbooks, playbook],
        })
      },
      deletePlaybook: (id) => set({ playbooks: get().playbooks.filter((p) => p.id !== id) }),
      resetPlaybooks: () => set({ playbooks: DEFAULT_PLAYBOOKS }),

      channelChecklists: DEFAULT_CHANNEL_CHECKLISTS,
      saveChecklist: (checklist) => {
        const { channelChecklists } = get()
        const exists = channelChecklists.some((c) => c.id === checklist.id)
        set({
          channelChecklists: exists
            ? channelChecklists.map((c) => (c.id === checklist.id ? checklist : c))
            : [...channelChecklists, checklist],
        })
      },
      deleteChecklist: (id) =>
        set({ channelChecklists: get().channelChecklists.filter((c) => c.id !== id) }),
      resetChecklists: () => set({ channelChecklists: DEFAULT_CHANNEL_CHECKLISTS }),

      campaigns: [],
      addCampaign: (partial) => {
        const { campaigns } = get()
        const existing = campaigns.find((c) => c.tag === partial.tag)
        // Re-instantiating the same playbook/year updates the campaign record.
        set({
          campaigns: existing
            ? campaigns.map((c) => (c.tag === partial.tag ? { ...c, ...partial } : c))
            : [...campaigns, { ...partial, id: uid(), createdAt: new Date().toISOString() }],
        })
      },
      deleteCampaign: (id) => set({ campaigns: get().campaigns.filter((c) => c.id !== id) }),

      todosFilterTag: null,
      setTodosFilterTag: (tag) => set({ todosFilterTag: tag }),

      undoState: null,
      undoComplete: () => {
        const { undoState, tasks, columns } = get()
        if (!undoState) return
        const withoutSpawned = undoState.spawnedTaskId
          ? tasks.filter((t) => t.id !== undoState.spawnedTaskId)
          : tasks
        const columnExists = columns.some((c) => c.id === undoState.prevColumnId)
        set({
          tasks: withoutSpawned.map((t) =>
            t.id === undoState.taskId
              ? {
                  ...t,
                  done: false,
                  completedAt: undefined,
                  prevColumnId: undefined,
                  ...(columnExists
                    ? { columnId: undoState.prevColumnId, order: undoState.prevOrder }
                    : {}),
                }
              : t,
          ),
          undoState: null,
        })
      },
      clearUndo: () => set({ undoState: null }),

      quickLinks: DEFAULT_QUICK_LINKS,
      addQuickLink: (name, url) =>
        set({ quickLinks: [...get().quickLinks, { id: uid(), name, url }] }),
      addQuickLinks: (links) => {
        const existing = new Set(get().quickLinks.map((l) => l.url))
        const fresh = links.filter((l) => !existing.has(l.url))
        set({ quickLinks: [...get().quickLinks, ...fresh.map((l) => ({ ...l, id: uid() }))] })
      },
      updateQuickLink: (id, patch) =>
        set({ quickLinks: get().quickLinks.map((l) => (l.id === id ? { ...l, ...patch } : l)) }),
      deleteQuickLink: (id) => set({ quickLinks: get().quickLinks.filter((l) => l.id !== id) }),

      discountCodes: [],
      addDiscountCode: (partial) =>
        set({
          discountCodes: [
            { ...partial, id: uid(), createdAt: new Date().toISOString() },
            ...get().discountCodes,
          ],
        }),
      deleteDiscountCode: (id) =>
        set({ discountCodes: get().discountCodes.filter((c) => c.id !== id) }),

      gameHighScore: 0,
      setGameHighScore: (score) => set({ gameHighScore: Math.max(score, get().gameHighScore) }),
      frenzyHighScore: 0,
      setFrenzyHighScore: (score) => set({ frenzyHighScore: Math.max(score, get().frenzyHighScore) }),
      gameMusicEnabled: true,
      setGameMusicEnabled: (enabled) => set({ gameMusicEnabled: enabled }),

      calendarJumpDate: null,
      setCalendarJumpDate: (date) => set({ calendarJumpDate: date }),

      lastDueReminderDate: null,
      markDueReminderSent: (date) => set({ lastDueReminderDate: date }),
    }),
    {
      name: 'torras-productivity',
      version: 2,
      // Session-only state must not survive a reload.
      partialize: (state) => ({ ...state, undoState: null, todosFilterTag: null }),
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>
        if (version < 2) {
          // v1 had a single implicit board; attach existing columns to it.
          state.boards = DEFAULT_BOARDS
          state.activeBoardId = MAIN_BOARD_ID
          if (Array.isArray(state.columns)) {
            state.columns = (state.columns as Column[]).map((c) => ({ ...c, boardId: MAIN_BOARD_ID }))
          }
        }
        return state
      },
    },
  ),
)

/** The game is only playable during pomodoro breaks. */
export function useGameUnlocked(): boolean {
  return useStore((s) => s.phase !== 'focus')
}
