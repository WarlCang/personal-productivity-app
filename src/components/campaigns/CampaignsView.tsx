import { useState } from 'react'
import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import { CalendarDays, ListTodo, Megaphone, Plus, Tag as TagIcon, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { tagChipClass } from '../../utils/torrasPresets'
import { etToday } from '../../utils/timezones'
import type { Campaign } from '../../types'
import PlaybookModal from '../todo/PlaybookModal'

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const tasks = useStore((s) => s.tasks)
  const discountCodes = useStore((s) => s.discountCodes)
  const deleteCampaign = useStore((s) => s.deleteCampaign)
  const setTodosFilterTag = useStore((s) => s.setTodosFilterTag)
  const setView = useStore((s) => s.setView)
  const t = useT()

  const campaignTasks = tasks.filter((task) => task.tags.includes(campaign.tag))
  const done = campaignTasks.filter((task) => task.done).length
  const total = campaignTasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const days = differenceInCalendarDays(parseISO(campaign.goLive), startOfDay(new Date()))
  const countdown =
    days > 0
      ? t('campaigns.daysLeft', { n: days })
      : days === 0
        ? t('campaigns.today')
        : t('campaigns.daysAgo', { n: -days })

  const codes = discountCodes.filter((c) => c.campaign === campaign.tag)
  const codeToday = etToday()

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{campaign.name}</h3>
        <span className={`chip ${tagChipClass(campaign.tag)}`}>#{campaign.tag}</span>
        <button
          className="cursor-pointer p-1 text-ink-600 transition-colors hover:text-red-400"
          title={t('campaigns.delete')}
          onClick={() => {
            if (confirm(t('campaigns.deleteConfirm', { name: campaign.name }))) {
              deleteCampaign(campaign.id)
            }
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-ink-400">
        <CalendarDays size={12} className="text-brand-400" />
        {format(parseISO(campaign.goLive), 'yyyy-MM-dd')}
        <span className={days >= 0 ? 'font-semibold text-brand-400' : ''}>{countdown}</span>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-ink-400">
          <span>{t('campaigns.progress', { done, total })}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {codes.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <TagIcon size={11} className="text-ink-400" />
          {codes.map((c) => {
            const active = c.startDate <= codeToday && (!c.endDate || c.endDate >= codeToday)
            return (
              <span
                key={c.id}
                className={`chip font-mono ${active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-ink-800 text-ink-400'}`}
                title={`${c.value} · ${c.startDate}${c.endDate ? ` → ${c.endDate}` : ''} ET`}
              >
                {c.code}
              </span>
            )
          })}
        </div>
      )}

      <button
        className="btn-ghost mt-3 w-full justify-center text-xs"
        onClick={() => {
          setTodosFilterTag(campaign.tag)
          setView('todos')
        }}
      >
        <ListTodo size={13} /> {t('campaigns.viewTasks')}
      </button>
    </div>
  )
}

export default function CampaignsView() {
  const campaigns = useStore((s) => s.campaigns)
  const [showPlaybook, setShowPlaybook] = useState(false)
  const t = useT()

  const today = format(new Date(), 'yyyy-MM-dd')
  const sorted = [...campaigns].sort((a, b) => {
    const aUpcoming = a.goLive >= today
    const bUpcoming = b.goLive >= today
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1
    return aUpcoming ? a.goLive.localeCompare(b.goLive) : b.goLive.localeCompare(a.goLive)
  })

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center gap-3">
        <Megaphone size={20} className="text-brand-400" />
        <h1 className="flex-1 text-2xl font-bold text-white">{t('campaigns.title')}</h1>
        <button className="btn-primary" onClick={() => setShowPlaybook(true)}>
          <Plus size={14} /> {t('campaigns.new')}
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-400">{t('campaigns.subtitle')}</p>

      {sorted.length === 0 ? (
        <div className="card mt-6 px-4 py-10 text-center text-sm text-ink-400">
          {t('campaigns.empty')}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {sorted.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {showPlaybook && <PlaybookModal onClose={() => setShowPlaybook(false)} />}
    </div>
  )
}
