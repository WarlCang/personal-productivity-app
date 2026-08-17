import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarDays, Flame, Plus, Timer } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT, useDateLocale } from '../../i18n'
import { getChinaDayInfo } from '../../utils/chinaWorkCalendar'
import { occursOn } from '../../utils/recurrence'
import { promoLabel, promosOn, upcomingPromos } from '../../utils/promoCalendar'
import { usePromoPacks } from '../../store/useAuth'
import { TaskRow } from '../todo/TodoView'
import TaskModal from '../todo/TaskModal'
import MarketClock from './MarketClock'
import { localToEt } from '../../utils/timezones'

export default function HomeView() {
  const tasks = useStore((s) => s.tasks)
  const events = useStore((s) => s.events)
  const sessions = useStore((s) => s.sessions)
  const addTask = useStore((s) => s.addTask)
  const setView = useStore((s) => s.setView)
  const startPomodoro = useStore((s) => s.startPomodoro)
  const language = useStore((s) => s.language)
  const t = useT()
  const locale = useDateLocale()
  const [quickTitle, setQuickTitle] = useState('')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const now = new Date()
  const todayKey = format(now, 'yyyy-MM-dd')
  const hour = now.getHours()
  const greeting = hour < 12 ? t('home.goodMorning') : hour < 18 ? t('home.goodAfternoon') : t('home.goodEvening')
  const dateLabel = language === 'zh' ? format(now, 'M月d日 EEEE', { locale }) : format(now, 'EEEE, MMMM d', { locale })

  const dayInfo = getChinaDayInfo(now)
  const dayStatus =
    dayInfo.kind === 'holiday'
      ? { text: t('home.holidayToday', { name: dayInfo.name! }), cls: 'bg-emerald-500/15 text-emerald-400' }
      : dayInfo.kind === 'makeupWorkday'
        ? { text: t('home.makeupToday', { name: dayInfo.name! }), cls: 'bg-red-500/15 text-red-400' }
        : dayInfo.isRestDay
          ? { text: t('home.restDay'), cls: 'bg-emerald-500/15 text-emerald-400' }
          : { text: t('home.workday'), cls: 'bg-ink-800 text-ink-300' }

  const dueTasks = useMemo(
    () =>
      tasks
        .filter((task) => !task.done && task.dueDate && task.dueDate <= todayKey)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    [tasks, todayKey],
  )

  const todayEvents = useMemo(
    () =>
      events
        .filter((e) => occursOn(e, now))
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, todayKey],
  )

  const todaySessions = sessions.filter((s) => s.date === todayKey)
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0)
  const openCount = tasks.filter((task) => !task.done).length
  const packs = usePromoPacks()
  const todayPromos = promosOn(now, packs)
  const upcoming = upcomingPromos(now, 3, packs)

  const quickAdd = () => {
    const title = quickTitle.trim()
    if (!title) return
    addTask({ title, dueDate: todayKey })
    setQuickTitle('')
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold text-white">{greeting}</h1>
        <span className="text-sm text-ink-400">{dateLabel}</span>
        <span className={`chip ${dayStatus.cls}`}>{dayStatus.text}</span>
        {packs.includes('us') && <MarketClock />}
        {todayPromos.map((promo) => (
          <span key={promo.id} className="chip bg-purple-500/15 text-purple-300">
            {t('calendar.promoToday', { name: promoLabel(promo, language) })}
          </span>
        ))}
      </div>

      <div className="card mt-5 flex items-center gap-2 px-3 py-2 focus-within:border-brand-500/60">
        <Plus size={17} className="text-brand-500" />
        <input
          className="flex-1 bg-transparent py-1 text-sm outline-none placeholder-ink-400"
          placeholder={t('home.quickAdd')}
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && quickAdd()}
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <button
          className="card cursor-pointer p-4 text-left transition-colors hover:border-ink-600"
          onClick={() => setView('todos')}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-400 uppercase">
            <Flame size={13} className="text-brand-500" /> {t('nav.todos')}
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{openCount}</div>
          <div className="text-xs text-ink-400">{t('home.openTasks', { n: openCount })}</div>
        </button>
        <button
          className="card cursor-pointer p-4 text-left transition-colors hover:border-ink-600"
          onClick={() => {
            startPomodoro()
            setView('pomodoro')
          }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-400 uppercase">
            <Timer size={13} className="text-brand-500" /> {t('home.focusToday')}
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{todayMinutes}m</div>
          <div className="text-xs text-ink-400">{t('home.sessions', { n: todaySessions.length, m: todayMinutes })}</div>
        </button>
        <button
          className="card cursor-pointer p-4 text-left transition-colors hover:border-ink-600"
          onClick={() => setView('calendar')}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-400 uppercase">
            <CalendarDays size={13} className="text-brand-500" /> {t('calendar.legendPromo')}
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {upcoming.map(({ promo, days }) => (
              <div key={promo.id} className="text-xs text-purple-300">
                {days <= 0
                  ? t('calendar.promoToday', { name: promoLabel(promo, language) })
                  : t('calendar.nextPromo', { name: promoLabel(promo, language), days })}
              </div>
            ))}
          </div>
        </button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-white">{t('home.dueTasks')}</h2>
          <div className="mt-2 flex flex-col gap-0.5">
            {dueTasks.length === 0 && (
              <div className="card px-4 py-6 text-center text-sm text-ink-400">{t('home.allClear')}</div>
            )}
            {dueTasks.slice(0, 8).map((task) => (
              <TaskRow key={task.id} task={task} onOpen={() => setOpenTaskId(task.id)} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">{t('home.todaySchedule')}</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {todayEvents.length === 0 && (
              <div className="card px-4 py-6 text-center text-sm text-ink-400">{t('home.noEvents')}</div>
            )}
            {todayEvents.map((event) => (
              <button
                key={event.id}
                className="card flex cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:border-ink-600"
                onClick={() => setView('calendar')}
              >
                <span className="font-mono text-xs text-brand-400">
                  {event.startTime ?? '—'}
                  {event.endTime ? `–${event.endTime}` : ''}
                </span>
                {event.tz === 'us' && event.startTime && (
                  <span className="shrink-0 text-[11px] text-sky-300">
                    {localToEt(event.date, event.startTime).time} {localToEt(event.date, event.startTime).abbr}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-ink-100">{event.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-ink-600">{t('home.shortcutHint')}</p>

      {openTaskId && <TaskModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
    </div>
  )
}
