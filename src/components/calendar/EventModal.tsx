import { useState } from 'react'
import { Globe, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { etToLocal, localToEt } from '../../utils/timezones'
import type { CalendarEvent, RecurrenceFreq } from '../../types'

const WEEKDAYS = { en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], zh: ['日', '一', '二', '三', '四', '五', '六'] }

export default function EventModal({
  event,
  initialDate,
  onClose,
}: {
  event: CalendarEvent | null
  initialDate: Date
  onClose: () => void
}) {
  const addEvent = useStore((s) => s.addEvent)
  const updateEvent = useStore((s) => s.updateEvent)
  const deleteEvent = useStore((s) => s.deleteEvent)
  const language = useStore((s) => s.language)
  const t = useT()

  // Events are stored in local (China) time; a 'us' event opens for editing
  // with its fields converted back to the ET wall time it was entered as.
  const initialEt = event?.tz === 'us'
  const initFields = () => {
    if (!event) return { date: format(initialDate, 'yyyy-MM-dd'), start: '', end: '' }
    if (initialEt && event.startTime) {
      const start = localToEt(event.date, event.startTime)
      return {
        date: start.date,
        start: start.time,
        end: event.endTime ? localToEt(event.date, event.endTime).time : '',
      }
    }
    return { date: event.date, start: event.startTime ?? '', end: event.endTime ?? '' }
  }
  const initial = initFields()

  const [title, setTitle] = useState(event?.title ?? '')
  const [date, setDate] = useState(initial.date)
  const [startTime, setStartTime] = useState(initial.start)
  const [endTime, setEndTime] = useState(initial.end)
  const [freq, setFreq] = useState<RecurrenceFreq | ''>(event?.recurrence?.freq ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(event?.recurrence?.weekdays ?? [])
  /** Which clock the date/time fields are entered in. */
  const [tz, setTz] = useState<'cn' | 'us'>(initialEt ? 'us' : 'cn')

  const switchTz = (next: 'cn' | 'us') => {
    if (next === tz) return
    // Keep the same instant: convert the entered times to the other clock.
    if (startTime) {
      const start = next === 'cn' ? etToLocal(date, startTime) : localToEt(date, startTime)
      if (endTime) {
        setEndTime((next === 'cn' ? etToLocal(date, endTime) : localToEt(date, endTime)).time)
      }
      setDate(start.date)
      setStartTime(start.time)
    }
    setTz(next)
  }

  // Live conversion line under the time fields, in whichever direction applies.
  const conversion = (() => {
    if (!date || !startTime) return null
    if (tz === 'us') {
      const local = etToLocal(date, startTime)
      return language === 'zh'
        ? `= 北京时间 ${local.date} ${local.time}`
        : `= ${local.date} ${local.time} China time`
    }
    const et = localToEt(date, startTime)
    return language === 'zh'
      ? `= 美东 ${et.date} ${et.time} ${et.abbr}`
      : `= ${et.date} ${et.time} ${et.abbr}`
  })()

  const save = () => {
    const t = title.trim()
    if (!t || !date) return
    let saveDate = date
    let saveStart = startTime
    let saveEnd = endTime
    if (tz === 'us' && startTime) {
      const start = etToLocal(date, startTime)
      saveDate = start.date
      saveStart = start.time
      if (endTime) saveEnd = etToLocal(date, endTime).time
    }
    const payload = {
      title: t,
      date: saveDate,
      startTime: saveStart || undefined,
      endTime: saveEnd && saveStart ? saveEnd : undefined,
      tz,
      recurrence: freq ? { freq, weekdays: freq === 'weekly' && weekdays.length ? weekdays : undefined } : undefined,
    }
    if (event) updateEvent(event.id, payload)
    else addEvent(payload)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-md p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{event ? t('event.editTitle') : t('event.newTitle')}</h2>
          <button className="btn-ghost -mr-1 px-2" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <input
          autoFocus
          className="input mt-4"
          placeholder={t('event.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />

        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="text-xs text-ink-400">
            {t('event.date')}
            <input type="date" className="input mt-1 [color-scheme:dark]" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="text-xs text-ink-400">
            {t('event.start')}
            <input type="time" className="input mt-1 [color-scheme:dark]" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="text-xs text-ink-400">
            {t('event.end')}
            <input
              type="time"
              className="input mt-1 [color-scheme:dark]"
              value={endTime}
              disabled={!startTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex overflow-hidden rounded-lg border border-ink-700" title={t('event.etModeHint')}>
            <button
              className={`cursor-pointer px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tz === 'cn' ? 'bg-brand-500 text-ink-950' : 'text-ink-400 hover:text-ink-200'
              }`}
              onClick={() => switchTz('cn')}
            >
              {t('event.tzCn')}
            </button>
            <button
              className={`flex cursor-pointer items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tz === 'us' ? 'bg-sky-500 text-ink-950' : 'text-ink-400 hover:text-ink-200'
              }`}
              onClick={() => switchTz('us')}
            >
              <Globe size={10} /> {t('event.tzUs')}
            </button>
          </div>
          {conversion && <span className="text-[11px] text-sky-300">{conversion}</span>}
        </div>

        <label className="mt-3 block text-xs text-ink-400">
          {t('event.repeats')}
          <select className="input mt-1 cursor-pointer" value={freq} onChange={(e) => setFreq(e.target.value as RecurrenceFreq | '')}>
            <option value="">{t('event.never')}</option>
            <option value="daily">{t('event.daily')}</option>
            <option value="weekly">{t('event.weekly')}</option>
            <option value="monthly">{t('event.monthly')}</option>
          </select>
        </label>

        {freq === 'weekly' && (
          <div className="mt-3 flex gap-1.5">
            {WEEKDAYS[language].map((label, day) => {
              const active = weekdays.includes(day)
              return (
                <button
                  key={day}
                  className={`h-8 w-8 cursor-pointer rounded-full text-xs font-semibold transition-colors ${
                    active ? 'bg-brand-500 text-ink-950' : 'bg-ink-800 text-ink-300 hover:bg-ink-700'
                  }`}
                  onClick={() => setWeekdays(active ? weekdays.filter((d) => d !== day) : [...weekdays, day])}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-ink-800 pt-4">
          {event ? (
            <button
              className="btn-danger"
              onClick={() => {
                deleteEvent(event.id)
                onClose()
              }}
            >
              <Trash2 size={14} /> {t('event.delete')}
            </button>
          ) : (
            <span />
          )}
          <button className="btn-primary" onClick={save} disabled={!title.trim()}>
            {t('event.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
