/**
 * US Eastern ⇄ local-time conversion for a team that runs the NA market from
 * Shenzhen. Built on Intl so daylight saving (EST/EDT) is always correct —
 * nobody hand-computes the 12h/13h offset again.
 */

export const MARKET_TZ = 'America/New_York'

/** Offset of `tz` from UTC, in minutes, at the given instant. */
function tzOffsetMinutes(tz: string, utc: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(utc)
      .map((p) => [p.type, p.value]),
  )
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return (asUTC - utc.getTime()) / 60_000
}

/** Interpret a wall-clock date+time in `tz` as an instant. */
function zonedToDate(tz: string, date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const wall = Date.UTC(y, m - 1, d, hh, mm)
  // Two passes converge across DST boundaries.
  let utc = wall
  for (let i = 0; i < 2; i++) utc = wall - tzOffsetMinutes(tz, new Date(utc)) * 60_000
  return new Date(utc)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Convert a wall time in `tz` to the device's local wall time. */
function zonedToLocal(tz: string, date: string, time: string): { date: string; time: string } {
  const d = zonedToDate(tz, date, time)
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

/** Render an instant as wall time in `tz`, with the zone abbreviation (EST/EDT). */
function dateToZoned(tz: string, instant: Date): { date: string; time: string; abbr: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${String(Number(parts.hour) % 24).padStart(2, '0')}:${parts.minute}`,
    abbr: parts.timeZoneName,
  }
}

/** ET wall time → local wall time (for storing events entered in US time). */
export function etToLocal(date: string, time: string): { date: string; time: string } {
  return zonedToLocal(MARKET_TZ, date, time)
}

/** Local wall time → ET wall time, with EST/EDT label (for display). */
export function localToEt(date: string, time: string): { date: string; time: string; abbr: string } {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return dateToZoned(MARKET_TZ, new Date(y, m - 1, d, hh, mm))
}

/** Today's calendar date in US Eastern (yyyy-MM-dd). */
export function etToday(): string {
  return dateToZoned(MARKET_TZ, new Date()).date
}
