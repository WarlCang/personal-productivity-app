import { useMemo, useState, type FormEvent } from 'react'
import { Check, Copy, Tag as TagIcon, Trash2, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { etToday } from '../../utils/timezones'
import { upcomingPromos } from '../../utils/promoCalendar'
import { usePromoPacks } from '../../store/useAuth'
import type { DiscountCode } from '../../types'

/**
 * Local registry of Shopify discount codes — which code, what value, which
 * channel and campaign, valid when (US Eastern dates). Prevents the classic
 * "which code was in the email again?" and leaked-code mistakes.
 */

type Status = 'upcoming' | 'active' | 'expired'

function statusOf(c: DiscountCode, today: string): Status {
  if (c.startDate > today) return 'upcoming'
  if (c.endDate && c.endDate < today) return 'expired'
  return 'active'
}

const STATUS_CHIP: Record<Status, string> = {
  upcoming: 'bg-sky-500/15 text-sky-300',
  active: 'bg-emerald-500/15 text-emerald-400',
  expired: 'bg-ink-800 text-ink-400',
}

function CodeRow({ c, today }: { c: DiscountCode; today: string }) {
  const deleteDiscountCode = useStore((s) => s.deleteDiscountCode)
  const [copied, setCopied] = useState(false)
  const t = useT()
  const status = statusOf(c, today)

  return (
    <li className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-ink-850 px-3 py-2 text-sm ${status === 'expired' ? 'opacity-50' : ''}`}>
      <button
        className="flex cursor-pointer items-center gap-1.5 font-mono font-semibold text-ink-100 transition-colors hover:text-brand-300"
        title={t('codes.copy')}
        onClick={() => {
          void navigator.clipboard.writeText(c.code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {c.code}
        {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} className="text-ink-400" />}
      </button>
      <span className="text-ink-300">{c.value}</span>
      <span className={`chip ${STATUS_CHIP[status]}`}>{t(`codes.${status}`)}</span>
      <span className="text-[11px] text-ink-400">
        {c.startDate}
        {c.endDate ? ` → ${c.endDate}` : ''} ET
      </span>
      {c.channel && <span className="text-[11px] text-ink-400">{c.channel}</span>}
      {c.campaign && <span className="chip bg-ink-800 text-ink-300">#{c.campaign}</span>}
      <span className="flex-1" />
      <button
        className="cursor-pointer text-ink-600 transition-colors hover:text-red-400"
        onClick={() => deleteDiscountCode(c.id)}
      >
        <Trash2 size={13} />
      </button>
    </li>
  )
}

export default function DiscountCodesModal({ onClose }: { onClose: () => void }) {
  const codes = useStore((s) => s.discountCodes)
  const addDiscountCode = useStore((s) => s.addDiscountCode)
  const packs = usePromoPacks()
  const t = useT()
  const today = etToday()

  const nextPromo = useMemo(() => upcomingPromos(new Date(), 1, packs)[0], [packs])
  const [code, setCode] = useState('')
  const [value, setValue] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState('')
  const [channel, setChannel] = useState('')
  const [campaign, setCampaign] = useState(() =>
    nextPromo ? `${nextPromo.promo.id.split('-')[0]}-${nextPromo.promo.date.slice(0, 4)}` : '',
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !value.trim() || !startDate) return
    addDiscountCode({
      code: code.trim().toUpperCase(),
      value: value.trim(),
      startDate,
      endDate: endDate || undefined,
      channel: channel.trim() || undefined,
      campaign: campaign.trim() || undefined,
    })
    setCode('')
    setValue('')
  }

  const sorted = [...codes].sort((a, b) => {
    const rank: Record<Status, number> = { active: 0, upcoming: 1, expired: 2 }
    return rank[statusOf(a, today)] - rank[statusOf(b, today)] || b.startDate.localeCompare(a.startDate)
  })

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card flex max-h-[85vh] w-full max-w-xl flex-col p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <TagIcon size={17} className="text-brand-400" />
            {t('codes.title')}
          </h2>
          <button className="btn-ghost -mr-1 px-2" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-400">{t('codes.hint')}</p>

        <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
          <input className="input font-mono" placeholder={t('codes.code')} value={code} onChange={(e) => setCode(e.target.value)} required />
          <input className="input" placeholder={t('codes.value')} value={value} onChange={(e) => setValue(e.target.value)} required />
          <input className="input" placeholder={t('codes.channel')} value={channel} onChange={(e) => setChannel(e.target.value)} />
          <label className="text-xs text-ink-400">
            {t('codes.start')}
            <input type="date" className="input mt-1 [color-scheme:dark]" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </label>
          <label className="text-xs text-ink-400">
            {t('codes.end')}
            <input type="date" className="input mt-1 [color-scheme:dark]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label className="text-xs text-ink-400">
            {t('codes.campaign')}
            <input className="input mt-1" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary col-span-2 md:col-span-3">
            {t('codes.add')}
          </button>
        </form>

        <ul className="mt-4 flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {sorted.length === 0 && <p className="py-4 text-center text-sm text-ink-400">{t('codes.empty')}</p>}
          {sorted.map((c) => (
            <CodeRow key={c.id} c={c} today={today} />
          ))}
        </ul>
      </div>
    </div>
  )
}
