import { parseISO, isBefore, isSameDay, getDay, getDate, startOfDay } from 'date-fns'
import type { CalendarEvent } from '../types'

/** Does this event occur on the given day? */
export function occursOn(event: CalendarEvent, day: Date): boolean {
  const start = startOfDay(parseISO(event.date))
  const target = startOfDay(day)
  if (!event.recurrence) return isSameDay(start, target)
  if (isBefore(target, start)) return false
  switch (event.recurrence.freq) {
    case 'daily':
      return true
    case 'weekly': {
      const weekdays = event.recurrence.weekdays?.length
        ? event.recurrence.weekdays
        : [getDay(start)]
      return weekdays.includes(getDay(target))
    }
    case 'monthly':
      return getDate(target) === getDate(start)
  }
}
