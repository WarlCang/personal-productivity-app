import { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  parseISO,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT, useDateLocale } from '../../i18n'
import type { CalendarEvent, Task } from '../../types'
import { occursOn } from '../../utils/recurrence'
import { getChinaDayInfo, hasChinaCalendarData, isHolidayStart } from '../../utils/chinaWorkCalendar'
import { promoLabel, promosOn, upcomingPromos, type PromoEvent } from '../../utils/promoCalendar'
import EventModal from './EventModal'
import TaskModal from '../todo/TaskModal'

type CalMode = 'month' | 'week'

interface DayItems {
  events: CalendarEvent[]
  tasks: Task[]
}

function useDayItems(days: Date[]): Map<string, DayItems> {
  const events = useStore((s) => s.events)
  const tasks = useStore((s) => s.tasks)
  return useMemo(() => {
    const map = new Map<string, DayItems>()
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd')
      map.set(key, {
        events: events
          .filter((e) => occursOn(e, day))
          .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
        tasks: tasks.filter((t) => t.dueDate === key),
      })
    }
    return map
  }, [days, events, tasks])
}

function EventPill({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="flex w-full cursor-pointer items-center gap-1 truncate rounded bg-brand-500/15 px-1.5 py-0.5 text-left text-[11px] text-brand-300 transition-colors hover:bg-brand-500/25"
    >
      {event.startTime && <span className="shrink-0 font-medium">{event.startTime}</span>}
      <span className="truncate">{event.title}</span>
      {event.recurrence && <Repeat size={9} className="shrink-0" />}
    </button>
  )
}

function TaskPill({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`w-full cursor-pointer truncate rounded px-1.5 py-0.5 text-left text-[11px] transition-colors ${
        task.done ? 'bg-ink-800 text-ink-400 line-through' : 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
      }`}
    >
      ☐ {task.title}
    </button>
  )
}

function PromoPill({ promo }: { promo: PromoEvent }) {
  const language = useStore((s) => s.language)
  return (
    <span className="block w-full truncate rounded bg-purple-500/15 px-1.5 py-0.5 text-left text-[11px] text-purple-300">
      {promoLabel(promo, language)}
    </span>
  )
}

/** 休/班 marker following the Chinese work calendar (法定节假日与调休). */
function ChinaDayBadge({ day }: { day: Date }) {
  const info = getChinaDayInfo(day)
  if (info.kind === 'holiday')
    return (
      <span title={`${info.name} · 放假`} className="rounded bg-emerald-500/15 px-1 text-[10px] leading-4 font-semibold text-emerald-400">
        休
      </span>
    )
  if (info.kind === 'makeupWorkday')
    return (
      <span title={`${info.name}调休 · 上班`} className="rounded bg-red-500/15 px-1 text-[10px] leading-4 font-semibold text-red-400">
        班
      </span>
    )
  return null
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export default function CalendarView() {
  const [mode, setMode] = useState<CalMode>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [modal, setModal] = useState<{ event: CalendarEvent | null; date: Date } | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const t = useT()
  const locale = useDateLocale()
  const language = useStore((s) => s.language)
  const calendarJumpDate = useStore((s) => s.calendarJumpDate)
  const setCalendarJumpDate = useStore((s) => s.setCalendarJumpDate)

  // Jump requested from search results.
  useEffect(() => {
    if (calendarJumpDate) {
      setCursor(parseISO(calendarJumpDate))
      setCalendarJumpDate(null)
    }
  }, [calendarJumpDate, setCalendarJumpDate])

  const days = useMemo(() => {
    if (mode === 'month') {
      return eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor)),
        end: endOfWeek(endOfMonth(cursor)),
      })
    }
    return eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) })
  }, [mode, cursor])

  const items = useDayItems(days)
  const navigate = (dir: -1 | 1) =>
    setCursor(mode === 'month' ? addMonths(cursor, dir) : addWeeks(cursor, dir))

  const title =
    mode === 'month'
      ? language === 'zh'
        ? format(cursor, 'yyyy年M月')
        : format(cursor, 'MMMM yyyy')
      : language === 'zh'
        ? `${format(startOfWeek(cursor), 'M月d日')} – ${format(endOfWeek(cursor), 'M月d日')}, ${format(cursor, 'yyyy')}`
        : `${format(startOfWeek(cursor), 'MMM d')} – ${format(endOfWeek(cursor), 'MMM d, yyyy')}`

  const upcoming = upcomingPromos(new Date(), 2)

  return (
    <div className="flex h-full flex-col px-6 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{t('calendar.title')}</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button className="btn-ghost px-2" onClick={() => navigate(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button className="btn-ghost" onClick={() => setCursor(new Date())}>
            {t('calendar.today')}
          </button>
          <button className="btn-ghost px-2" onClick={() => navigate(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="min-w-44 text-center text-sm font-semibold text-ink-200">{title}</span>
        <div className="flex rounded-lg border border-ink-700 p-0.5">
          {(['month', 'week'] as const).map((m) => (
            <button
              key={m}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                mode === m ? 'bg-brand-500 text-ink-950' : 'text-ink-300 hover:text-ink-100'
              }`}
              onClick={() => setMode(m)}
            >
              {m === 'month' ? t('calendar.month') : t('calendar.week')}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setModal({ event: null, date: new Date() })}>
          <Plus size={14} /> {t('calendar.event')}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-emerald-500/15 px-1 text-[10px] font-semibold text-emerald-400">休</span>
          {t('calendar.legendHoliday')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-red-500/15 px-1 text-[10px] font-semibold text-red-400">班</span>
          {t('calendar.legendMakeup')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-purple-500/15 px-1 text-[10px] font-semibold text-purple-300">促</span>
          {t('calendar.legendPromo')}
        </span>
        <span>{t('calendar.source')}</span>
        {!hasChinaCalendarData(cursor.getFullYear()) && (
          <span className="text-amber-400/80">{t('calendar.noData', { year: cursor.getFullYear() })}</span>
        )}
        <div className="flex-1" />
        {upcoming.map(({ promo, days }) => (
          <span key={promo.id} className="chip bg-purple-500/15 text-purple-300">
            {days <= 0
              ? t('calendar.promoToday', { name: promoLabel(promo, language) })
              : t('calendar.nextPromo', { name: promoLabel(promo, language), days })}
          </span>
        ))}
      </div>

      {mode === 'month' ? (
        <div className="card mt-5 flex flex-1 flex-col overflow-hidden">
          <div className="grid grid-cols-7 border-b border-ink-800">
            {days.slice(0, 7).map((d) => (
              <div key={d.toISOString()} className="px-2 py-2 text-center text-xs font-semibold text-ink-400">
                {format(d, 'EEE', { locale })}
              </div>
            ))}
          </div>
          <div className="grid flex-1 auto-rows-fr grid-cols-7">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const { events, tasks } = items.get(key)!
              const inMonth = isSameMonth(day, cursor)
              const dayInfo = getChinaDayInfo(day)
              return (
                <div
                  key={key}
                  className={`min-h-24 cursor-pointer border-r border-b border-ink-800/70 p-1.5 transition-colors last:border-r-0 hover:bg-ink-850 ${
                    !inMonth ? 'bg-ink-950/60' : dayInfo.kind === 'holiday' ? 'bg-emerald-500/[0.05]' : ''
                  }`}
                  onClick={() => setModal({ event: null, date: day })}
                >
                  <div className="mb-1 flex items-center gap-1">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        isToday(day)
                          ? 'bg-brand-500 font-bold text-ink-950'
                          : inMonth
                            ? 'text-ink-200'
                            : 'text-ink-600'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    {dayInfo.kind === 'holiday' && isHolidayStart(day) && (
                      <span className="truncate text-[10px] text-emerald-400">{dayInfo.name}</span>
                    )}
                    <div className="flex-1" />
                    <ChinaDayBadge day={day} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {promosOn(day).map((promo) => (
                      <PromoPill key={promo.id} promo={promo} />
                    ))}
                    {events.slice(0, 3).map((ev) => (
                      <EventPill key={ev.id} event={ev} onClick={() => setModal({ event: ev, date: day })} />
                    ))}
                    {tasks.slice(0, 2).map((task) => (
                      <TaskPill key={task.id} task={task} onClick={() => setOpenTaskId(task.id)} />
                    ))}
                    {events.length + tasks.length > 5 && (
                      <span className="px-1.5 text-[10px] text-ink-400">{t('calendar.more', { n: events.length + tasks.length - 5 })}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card mt-5 flex flex-1 flex-col overflow-hidden">
          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-ink-800">
            <div />
            {days.map((day) => (
              <div key={day.toISOString()} className="border-l border-ink-800 px-2 py-2 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-ink-400">
                  {format(day, 'EEE', { locale })}
                  <ChinaDayBadge day={day} />
                </div>
                <div
                  className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                    isToday(day) ? 'bg-brand-500 font-bold text-ink-950' : 'text-ink-100'
                  }`}
                >
                  {format(day, 'd')}
                </div>
                {getChinaDayInfo(day).kind === 'holiday' && (
                  <div className="truncate text-[10px] text-emerald-400">{getChinaDayInfo(day).name}</div>
                )}
                {/* All-day row: tasks + untimed events */}
                <div className="mt-1 flex flex-col gap-0.5">
                  {promosOn(day).map((promo) => (
                    <PromoPill key={promo.id} promo={promo} />
                  ))}
                  {items
                    .get(format(day, 'yyyy-MM-dd'))!
                    .events.filter((e) => !e.startTime)
                    .map((ev) => (
                      <EventPill key={ev.id} event={ev} onClick={() => setModal({ event: ev, date: day })} />
                    ))}
                  {items.get(format(day, 'yyyy-MM-dd'))!.tasks.map((task) => (
                    <TaskPill key={task.id} task={task} onClick={() => setOpenTaskId(task.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="relative flex-1 overflow-y-auto">
            <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]" style={{ height: 24 * 48 }}>
              <div className="relative">
                {HOURS.map((h) => (
                  <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-ink-500" style={{ top: h * 48 }}>
                    {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                  </div>
                ))}
              </div>
              {days.map((day) => {
                const dayEvents = items.get(format(day, 'yyyy-MM-dd'))!.events.filter((e) => e.startTime)
                return (
                  <div
                    key={day.toISOString()}
                    className="relative cursor-pointer border-l border-ink-800"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const hour = Math.floor((e.clientY - rect.top) / 48)
                      const d = addDays(day, 0)
                      d.setHours(hour)
                      setModal({ event: null, date: d })
                    }}
                  >
                    {HOURS.map((h) => (
                      <div key={h} className="absolute inset-x-0 border-t border-ink-800/50" style={{ top: h * 48 }} />
                    ))}
                    {isSameDay(day, new Date()) && (
                      <div
                        className="absolute inset-x-0 z-10 border-t-2 border-brand-500"
                        style={{ top: ((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * 48 }}
                      />
                    )}
                    {dayEvents.map((ev) => {
                      const start = timeToMinutes(ev.startTime!)
                      const end = ev.endTime ? timeToMinutes(ev.endTime) : start + 60
                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setModal({ event: ev, date: day })
                          }}
                          className="absolute inset-x-0.5 z-10 cursor-pointer overflow-hidden rounded border-l-2 border-brand-500 bg-brand-500/20 px-1.5 py-0.5 text-left text-[11px] text-brand-200 backdrop-blur-sm transition-colors hover:bg-brand-500/30"
                          style={{ top: (start / 60) * 48, height: Math.max(20, ((end - start) / 60) * 48) }}
                        >
                          <span className="font-medium">{ev.title}</span>
                          <span className="ml-1 opacity-70">
                            {ev.startTime}
                            {ev.endTime ? `–${ev.endTime}` : ''}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <EventModal
          event={modal.event}
          initialDate={modal.date}
          onClose={() => setModal(null)}
        />
      )}
      {openTaskId && <TaskModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
    </div>
  )
}
