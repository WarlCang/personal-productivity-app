import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../../store/useStore'
import type { CalendarEvent, RecurrenceFreq } from '../../types'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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

  const [title, setTitle] = useState(event?.title ?? '')
  const [date, setDate] = useState(event?.date ?? format(initialDate, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState(event?.startTime ?? '')
  const [endTime, setEndTime] = useState(event?.endTime ?? '')
  const [freq, setFreq] = useState<RecurrenceFreq | ''>(event?.recurrence?.freq ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(event?.recurrence?.weekdays ?? [])

  const save = () => {
    const t = title.trim()
    if (!t || !date) return
    const payload = {
      title: t,
      date,
      startTime: startTime || undefined,
      endTime: endTime && startTime ? endTime : undefined,
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
          <h2 className="text-lg font-semibold text-white">{event ? 'Edit event' : 'New event'}</h2>
          <button className="btn-ghost -mr-1 px-2" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <input
          autoFocus
          className="input mt-4"
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />

        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="text-xs text-ink-400">
            Date
            <input type="date" className="input mt-1 [color-scheme:dark]" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="text-xs text-ink-400">
            Start
            <input type="time" className="input mt-1 [color-scheme:dark]" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="text-xs text-ink-400">
            End
            <input
              type="time"
              className="input mt-1 [color-scheme:dark]"
              value={endTime}
              disabled={!startTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

        <label className="mt-3 block text-xs text-ink-400">
          Repeats
          <select className="input mt-1 cursor-pointer" value={freq} onChange={(e) => setFreq(e.target.value as RecurrenceFreq | '')}>
            <option value="">Never</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly (same day of month)</option>
          </select>
        </label>

        {freq === 'weekly' && (
          <div className="mt-3 flex gap-1.5">
            {WEEKDAYS.map((label, day) => {
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
              <Trash2 size={14} /> Delete
            </button>
          ) : (
            <span />
          )}
          <button className="btn-primary" onClick={save} disabled={!title.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
