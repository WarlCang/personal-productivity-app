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
}

export interface Column {
  id: string
  title: string
  order: number
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
  date: string // yyyy-MM-dd (first occurrence for recurring events)
  startTime?: string // HH:mm
  endTime?: string // HH:mm
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

export type ViewName = 'todos' | 'kanban' | 'calendar' | 'notes' | 'pomodoro' | 'game'
