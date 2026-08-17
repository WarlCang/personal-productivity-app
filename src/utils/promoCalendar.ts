import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import type { Lang } from '../i18n/dict'

/**
 * E-commerce promo events TORRAS plans around, split into per-group packs:
 * 'cn' — domestic platforms (天猫/京东) plus the overseas dates CN teams track;
 * 'us' — the US retail year for the NA website team (torras.com), including
 * shipping cutoffs. A group's pack is chosen in the admin console; users in
 * several groups see the union. Fixed-date events are exact; Prime Day,
 * back-to-school, and shipping cutoffs are estimates and marked as such.
 */

export type PromoPackId = 'cn' | 'us'

export interface PromoEvent {
  id: string
  name: { en: string; zh: string }
  date: string // yyyy-MM-dd
  endDate?: string
  estimated?: boolean
}

/** Dates both markets plan around — included in every pack, deduped by id. */
const SHARED: PromoEvent[] = [
  { id: 'vday-2026', name: { en: "Valentine's Day", zh: '情人节' }, date: '2026-02-14' },
  { id: 'mday-2026', name: { en: "Mother's Day (US)", zh: '母亲节(美)' }, date: '2026-05-10' },
  { id: 'fday-2026', name: { en: "Father's Day (US)", zh: '父亲节(美)' }, date: '2026-06-21' },
  { id: 'prime-2026', name: { en: 'Prime Day', zh: 'Prime Day' }, date: '2026-07-14', endDate: '2026-07-15', estimated: true },
  { id: 'bf-2026', name: { en: 'Black Friday', zh: '黑五' }, date: '2026-11-27' },
  { id: 'cm-2026', name: { en: 'Cyber Monday', zh: '网一' }, date: '2026-11-30' },
  { id: 'xmas-2026', name: { en: 'Christmas', zh: '圣诞节' }, date: '2026-12-25' },
]

const CN_ONLY: PromoEvent[] = [
  { id: '38-2026', name: { en: '3.8 Festival', zh: '38大促' }, date: '2026-03-08' },
  { id: '618-2026', name: { en: '618 Festival', zh: '618大促' }, date: '2026-06-18' },
  { id: '88vip-2026', name: { en: '88 VIP Day', zh: '88会员节' }, date: '2026-08-08' },
  { id: 'd11-2026', name: { en: 'Double 11', zh: '双11' }, date: '2026-11-11' },
  { id: 'd12-2026', name: { en: 'Double 12', zh: '双12' }, date: '2026-12-12' },
]

const US_ONLY: PromoEvent[] = [
  { id: 'presidents-2026', name: { en: "Presidents' Day sales", zh: '总统日促销' }, date: '2026-02-16' },
  { id: 'memorial-2026', name: { en: 'Memorial Day sales', zh: '阵亡将士纪念日促销' }, date: '2026-05-25' },
  { id: 'july4-2026', name: { en: 'July 4th sales', zh: '美国独立日促销' }, date: '2026-07-04' },
  { id: 'bts-2026', name: { en: 'Back to School peak', zh: '返校季高峰' }, date: '2026-08-10', estimated: true },
  { id: 'labor-2026', name: { en: 'Labor Day sales', zh: '美国劳动节促销' }, date: '2026-09-07' },
  { id: 'halloween-2026', name: { en: 'Halloween', zh: '万圣节' }, date: '2026-10-31' },
  { id: 'thanksgiving-2026', name: { en: 'Thanksgiving', zh: '感恩节' }, date: '2026-11-26' },
  { id: 'xmas-cutoff-2026', name: { en: 'Xmas standard-shipping cutoff', zh: '圣诞标准物流截单' }, date: '2026-12-18', estimated: true },
]

const PACKS: Record<PromoPackId, PromoEvent[]> = {
  cn: [...SHARED, ...CN_ONLY],
  us: [...SHARED, ...US_ONLY],
}

export const DEFAULT_PACKS: PromoPackId[] = ['cn']

function eventsFor(packs: PromoPackId[]): PromoEvent[] {
  const seen = new Set<string>()
  return packs
    .flatMap((p) => PACKS[p] ?? [])
    .filter((e) => !seen.has(e.id) && (seen.add(e.id), true))
}

export function promoLabel(promo: PromoEvent, lang: Lang): string {
  const name = lang === 'zh' ? promo.name.zh : promo.name.en
  return promo.estimated ? `${name}${lang === 'zh' ? '（预估）' : ' (est.)'}` : name
}

/** Promos occurring on the given day. */
export function promosOn(day: Date, packs: PromoPackId[]): PromoEvent[] {
  const key = format(day, 'yyyy-MM-dd')
  return eventsFor(packs).filter((p) =>
    p.endDate ? key >= p.date && key <= p.endDate : p.date === key,
  )
}

/** The next `count` promos on or after `from`, with days remaining. */
export function upcomingPromos(
  from: Date,
  count: number,
  packs: PromoPackId[],
): { promo: PromoEvent; days: number }[] {
  const today = startOfDay(from)
  return eventsFor(packs)
    .map((promo) => ({
      promo,
      days: differenceInCalendarDays(parseISO(promo.date), today),
    }))
    .filter(({ promo, days }) => days >= 0 || (promo.endDate && promo.endDate >= format(today, 'yyyy-MM-dd')))
    .sort((a, b) => a.days - b.days)
    .slice(0, count)
}
