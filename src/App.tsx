import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { COMPANY_MODE } from './config'
import { useStore } from './store/useStore'
import { useAuth } from './store/useAuth'
import { useTeam } from './store/useTeam'
import { translate } from './i18n'
import type { ViewName } from './types'
import Sidebar from './components/Sidebar'
import LoginScreen from './components/auth/LoginScreen'
import TeamView from './components/team/TeamView'
import AdminView from './components/admin/AdminView'
import CampaignsView from './components/campaigns/CampaignsView'
import HomeView from './components/home/HomeView'
import TodoView from './components/todo/TodoView'
import KanbanView from './components/kanban/KanbanView'
import CalendarView from './components/calendar/CalendarView'
import NotesView from './components/notes/NotesView'
import PomodoroView from './components/pomodoro/PomodoroView'
import GameView from './components/game/GameView'
import SearchModal from './components/SearchModal'
import QuickAddModal from './components/QuickAddModal'
import UndoToast from './components/UndoToast'

const VIEW_KEYS: ViewName[] = COMPANY_MODE
  ? ['home', 'team', 'todos', 'campaigns', 'kanban', 'calendar', 'notes', 'pomodoro', 'game']
  : ['home', 'todos', 'campaigns', 'kanban', 'calendar', 'notes', 'pomodoro', 'game']

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

export default function App() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const tick = useStore((s) => s.tick)
  const tasks = useStore((s) => s.tasks)
  const user = useAuth((s) => s.user)
  const [showSearch, setShowSearch] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  // Company data: refresh profile once, then poll tasks/announcements.
  // (SSE push replaces the polling in a later phase.)
  useEffect(() => {
    if (!COMPANY_MODE || !user) return
    void useAuth.getState().loadMe()
    void useTeam.getState().refresh()
    const interval = setInterval(() => void useTeam.getState().refresh(), 60_000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Global pomodoro heartbeat — keeps the timer running on every view.
  useEffect(() => {
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [tick])

  // Global keyboard shortcuts: 1–7 switch views, n quick-add, / search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      const viewIndex = Number(e.key) - 1
      if (e.key >= '1' && e.key <= '9' && VIEW_KEYS[viewIndex]) {
        setView(VIEW_KEYS[viewIndex])
      } else if (e.key === 'n') {
        e.preventDefault()
        setShowQuickAdd(true)
      } else if (e.key === '/') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setView])

  // Due-task badge in the tab title + one notification per day.
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const dueCount = tasks.filter((t) => !t.done && t.dueDate && t.dueDate <= today).length
    document.title = dueCount > 0 ? `(${dueCount}) TORRAS Productivity` : 'TORRAS Productivity'

    const { lastDueReminderDate, markDueReminderSent, pomodoroSettings, language } = useStore.getState()
    if (
      dueCount > 0 &&
      lastDueReminderDate !== today &&
      pomodoroSettings.notificationsEnabled &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('TORRAS Productivity', {
        body: translate(language, 'reminder.dueToday', { n: dueCount }),
        icon: '/favicon.svg',
      })
      markDueReminderSent(today)
    }
  }, [tasks])

  if (COMPANY_MODE && !user) return <LoginScreen />

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        {view === 'home' && <HomeView />}
        {view === 'team' && (COMPANY_MODE ? <TeamView /> : <HomeView />)}
        {view === 'campaigns' && <CampaignsView />}
        {view === 'admin' && (COMPANY_MODE && user?.isAdmin ? <AdminView /> : <HomeView />)}
        {view === 'todos' && <TodoView />}
        {view === 'kanban' && <KanbanView />}
        {view === 'calendar' && <CalendarView />}
        {view === 'notes' && <NotesView />}
        {view === 'pomodoro' && <PomodoroView />}
        {view === 'game' && <GameView />}
      </main>
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}
      <UndoToast />
    </div>
  )
}
