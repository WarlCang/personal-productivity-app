import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import type { Lang } from '../i18n/dict'

/**
 * E-commerce promo events TORRAS plans around — CN platforms (天猫/京东)
 * and overseas (Amazon, DTC). Fixed-date events are exact; Prime Day is
 * estimated (Amazon announces it ~June each year) and marked as such.
 */

export interface PromoEvent {
  id: string
  name: { en: string; zh: string }
  date: string // yyyy-MM-dd
  endDate?: string
  estimated?: boolean
}

export const PROMO_EVENTS: PromoEvent[] = [
  { id: 'vday-2026', name: { en: "Valentine's Day", zh: '情人节' }, date: '2026-02-14' },
  { id: '38-2026', name: { en: '3.8 Festival', zh: '38大促' }, date: '2026-03-08' },
  { id: 'mday-2026', name: { en: "Mother's Day (US)", zh: '母亲节(美)' }, date: '2026-05-10' },
  { id: '618-2026', name: { en: '618 Festival', zh: '618大促' }, date: '2026-06-18' },
  { id: 'fday-2026', name: { en: "Father's Day (US)", zh: '父亲节(美)' }, date: '2026-06-21' },
  { id: 'prime-2026', name: { en: 'Prime Day', zh: 'Prime Day' }, date: '2026-07-14', endDate: '2026-07-15', estimated: true },
  { id: '88vip-2026', name: { en: '88 VIP Day', zh: '88会员节' }, date: '2026-08-08' },
  { id: 'd11-2026', name: { en: 'Double 11', zh: '双11' }, date: '2026-11-11' },
  { id: 'bf-2026', name: { en: 'Black Friday', zh: '黑五' }, date: '2026-11-27' },
  { id: 'cm-2026', name: { en: 'Cyber Monday', zh: '网一' }, date: '2026-11-30' },
  { id: 'd12-2026', name: { en: 'Double 12', zh: '双12' }, date: '2026-12-12' },
  { id: 'xmas-2026', name: { en: 'Christmas', zh: '圣诞节' }, date: '2026-12-25' },
]

export function promoLabel(promo: PromoEvent, lang: Lang): string {
  const name = lang === 'zh' ? promo.name.zh : promo.name.en
  return promo.estimated ? `${name}${lang === 'zh' ? '（预估）' : ' (est.)'}` : name
}

/** Promos occurring on the given day. */
export function promosOn(day: Date): PromoEvent[] {
  const key = format(day, 'yyyy-MM-dd')
  return PROMO_EVENTS.filter((p) => (p.endDate ? key >= p.date && key <= p.endDate : p.date === key))
}

/** The next `count` promos on or after `from`, with days remaining. */
export function upcomingPromos(from: Date, count: number): { promo: PromoEvent; days: number }[] {
  const today = startOfDay(from)
  return PROMO_EVENTS.map((promo) => ({
    promo,
    days: differenceInCalendarDays(parseISO(promo.date), today),
  }))
    .filter(({ promo, days }) => days >= 0 || (promo.endDate && promo.endDate >= format(today, 'yyyy-MM-dd')))
    .sort((a, b) => a.days - b.days)
    .slice(0, count)
}
