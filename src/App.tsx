import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import TodoView from './components/todo/TodoView'
import KanbanView from './components/kanban/KanbanView'
import CalendarView from './components/calendar/CalendarView'
import NotesView from './components/notes/NotesView'
import PomodoroView from './components/pomodoro/PomodoroView'
import GameView from './components/game/GameView'

export default function App() {
  const view = useStore((s) => s.view)
  const tick = useStore((s) => s.tick)

  // Global pomodoro heartbeat — keeps the timer running on every view.
  useEffect(() => {
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [tick])

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        {view === 'todos' && <TodoView />}
        {view === 'kanban' && <KanbanView />}
        {view === 'calendar' && <CalendarView />}
        {view === 'notes' && <NotesView />}
        {view === 'pomodoro' && <PomodoroView />}
        {view === 'game' && <GameView />}
      </main>
    </div>
  )
}
