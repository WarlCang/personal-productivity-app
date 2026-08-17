export type Priority = 'high' | 'medium' | 'low'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  done: boolean
  createdAt: string
  completedAt?: string
  dueDate?: string // yyyy-MM-dd
  priority?: Priority
  tags: string[]
  subtasks: Subtask[]
  columnId: string
  order: number
  /** Completing the task spawns the next occurrence (needs a dueDate). */
  recurrence?: RecurrenceFreq
  /** Column the task was in before completion — restored on uncheck. */
  prevColumnId?: string
}

export interface Board {
  id: string
  title: string
}

export interface Column {
  id: string
  title: string
  order: number
  boardId: string
  isDoneColumn?: boolean
}

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly'

export interface Recurrence {
  freq: RecurrenceFreq
  /** 0 (Sun) – 6 (Sat); only for weekly */
  weekdays?: number[]
}

export interface CalendarEvent {
  id: string
  title: string
  /**
   * Stored in device-local (China) time regardless of how it was entered;
   * `tz: 'us'` marks events entered in US Eastern so views can show the ET
   * equivalent alongside.
   */
  date: string // yyyy-MM-dd (first occurrence for recurring events)
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  tz?: 'cn' | 'us'
  recurrence?: Recurrence
  color?: string
}

export interface Note {
  id: string
  title: string
  /** TipTap HTML */
  content: string
  folder: string
  createdAt: string
  updatedAt: string
}

/** A campaign instantiated from a playbook — the unit the campaign hub tracks. */
export interface Campaign {
  id: string
  /** Task tag linking everything together, e.g. bfcm-2026. */
  tag: string
  name: string
  goLive: string // yyyy-MM-dd
  createdAt: string
}

/** A user-customizable entry in the quick-links launcher. */
export interface QuickLink {
  id: string
  name: string
  url: string
}

/** A Shopify discount code tracked locally; dates are US Eastern calendar days. */
export interface DiscountCode {
  id: string
  code: string
  /** Free text, e.g. "20%" or "$15 off". */
  value: string
  startDate: string // yyyy-MM-dd (ET)
  endDate?: string // yyyy-MM-dd (ET), inclusive
  /** Where it's distributed, e.g. email / meta / influencer. */
  channel?: string
  /** Campaign tag, e.g. bfcm-2026 — matches playbook task tags. */
  campaign?: string
  createdAt: string
}

export type PomodoroPhase = 'focus' | 'break' | 'longBreak'

export interface PomodoroSettings {
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  roundsBeforeLongBreak: number
  soundEnabled: boolean
  notificationsEnabled: boolean
}

export interface FocusSession {
  id: string
  date: string // yyyy-MM-dd
  minutes: number
  taskId?: string
  completedAt: string
}

export type ViewName =
  | 'home'
  | 'team'
  | 'todos'
  | 'campaigns'
  | 'kanban'
  | 'calendar'
  | 'notes'
  | 'pomodoro'
  | 'game'
  | 'admin'
