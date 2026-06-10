import { eachDayOfInterval, format, getDay, parseISO } from 'date-fns'

/**
 * Chinese work calendar (法定节假日 + 调休).
 *
 * 2026 data is from 国务院办公厅关于2026年部分节假日安排的通知
 * (国办发明电〔2025〕7号, issued 2025-11-04), as published by Xinhua:
 * https://www.news.cn/politics/20251104/88bcffd88ae249e58c699b8772548e3d/c.html
 * Cross-checked with http://politics.people.com.cn/n1/2025/1104/c1001-40596715.html
 * and https://www.china-briefing.com/news/china-2026-public-holiday-schedule/
 *
 * Future years: append to HOLIDAYS / MAKEUP_WORKDAYS when the State Council
 * publishes the next notice (usually each November).
 */

export type ChinaDayKind = 'holiday' | 'makeupWorkday' | 'weekend' | 'workday'

export interface ChinaDayInfo {
  kind: ChinaDayKind
  /** Holiday name, e.g. 春节; set for 'holiday' (and the holiday a makeup day serves). */
  name?: string
  /** True if this day is a rest day (holiday or ordinary weekend). */
  isRestDay: boolean
}

interface HolidayRange {
  name: string
  start: string // yyyy-MM-dd inclusive
  end: string // yyyy-MM-dd inclusive
}

const HOLIDAYS: HolidayRange[] = [
  // ---- 2026 (国办发明电〔2025〕7号) ----
  { name: '元旦', start: '2026-01-01', end: '2026-01-03' },
  { name: '春节', start: '2026-02-15', end: '2026-02-23' },
  { name: '清明节', start: '2026-04-04', end: '2026-04-06' },
  { name: '劳动节', start: '2026-05-01', end: '2026-05-05' },
  { name: '端午节', start: '2026-06-19', end: '2026-06-21' },
  { name: '中秋节', start: '2026-09-25', end: '2026-09-27' },
  { name: '国庆节', start: '2026-10-01', end: '2026-10-07' },
]

/** Weekend days that become working days (调休上班). */
const MAKEUP_WORKDAYS: Record<string, string> = {
  // ---- 2026 (国办发明电〔2025〕7号) ----
  '2026-01-04': '元旦',
  '2026-02-14': '春节',
  '2026-02-28': '春节',
  '2026-05-09': '劳动节',
  '2026-09-20': '国庆节',
  '2026-10-10': '国庆节',
}

const holidayByDate = new Map<string, string>()
for (const range of HOLIDAYS) {
  for (const day of eachDayOfInterval({ start: parseISO(range.start), end: parseISO(range.end) })) {
    holidayByDate.set(format(day, 'yyyy-MM-dd'), range.name)
  }
}

const YEARS_WITH_DATA = new Set([...HOLIDAYS.map((h) => h.start.slice(0, 4))])

export function hasChinaCalendarData(year: number): boolean {
  return YEARS_WITH_DATA.has(String(year))
}

export function getChinaDayInfo(day: Date): ChinaDayInfo {
  const key = format(day, 'yyyy-MM-dd')
  const holiday = holidayByDate.get(key)
  if (holiday) return { kind: 'holiday', name: holiday, isRestDay: true }
  const makeupFor = MAKEUP_WORKDAYS[key]
  if (makeupFor) return { kind: 'makeupWorkday', name: makeupFor, isRestDay: false }
  const weekday = getDay(day)
  if (weekday === 0 || weekday === 6) return { kind: 'weekend', isRestDay: true }
  return { kind: 'workday', isRestDay: false }
}

/** First day of a holiday range — where the holiday name label is shown. */
export function isHolidayStart(day: Date): boolean {
  const key = format(day, 'yyyy-MM-dd')
  return HOLIDAYS.some((h) => h.start === key)
}
