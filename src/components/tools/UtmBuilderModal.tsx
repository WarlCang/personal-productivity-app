import { useMemo, useState } from 'react'
import { Check, Copy, Link2, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { upcomingPromos } from '../../utils/promoCalendar'
import { usePromoPacks } from '../../store/useAuth'

/**
 * UTM link builder with the team's conventions baked in: lowercase,
 * dashes instead of spaces, medium auto-suggested per source.
 */

const SOURCES: { source: string; medium: string }[] = [
  { source: 'google', medium: 'cpc' },
  { source: 'facebook', medium: 'paid_social' },
  { source: 'instagram', medium: 'paid_social' },
  { source: 'tiktok', medium: 'paid_social' },
  { source: 'klaviyo', medium: 'email' },
  { source: 'youtube', medium: 'video' },
  { source: 'affiliate', medium: 'affiliate' },
]

function sanitize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_\-.]/g, '')
}

export default function UtmBuilderModal({ onClose }: { onClose: () => void }) {
  const language = useStore((s) => s.language)
  const packs = usePromoPacks()
  const t = useT()

  const nextPromo = useMemo(() => upcomingPromos(new Date(), 1, packs)[0], [packs])
  const discountCodes = useStore((s) => s.discountCodes)
  const [url, setUrl] = useState('https://www.torras.com/')
  const [source, setSource] = useState(SOURCES[0].source)
  const [medium, setMedium] = useState(SOURCES[0].medium)
  const [campaign, setCampaign] = useState(() =>
    nextPromo ? sanitize(`${nextPromo.promo.name.en}-${nextPromo.promo.date.slice(0, 4)}`) : '',
  )
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => {
    try {
      const u = new URL(url)
      if (source) u.searchParams.set('utm_source', sanitize(source))
      if (medium) u.searchParams.set('utm_medium', sanitize(medium))
      if (campaign) u.searchParams.set('utm_campaign', sanitize(campaign))
      if (content) u.searchParams.set('utm_content', sanitize(content))
      return u.toString()
    } catch {
      return null
    }
  }, [url, source, medium, campaign, content])

  const copy = () => {
    if (!result) return
    void navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-md p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Link2 size={17} className="text-brand-400" />
            {t('utm.title')}
          </h2>
          <button className="btn-ghost -mr-1 px-2" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <label className="mt-4 block text-xs text-ink-400">
          {t('utm.url')}
          <input className="input mt-1" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>

        {discountCodes.length > 0 && (
          <label className="mt-3 block text-xs text-ink-400">
            {t('utm.useCode')}
            <select
              className="input mt-1 cursor-pointer"
              value=""
              onChange={(e) => {
                const code = discountCodes.find((c) => c.id === e.target.value)
                if (!code) return
                if (code.campaign) setCampaign(sanitize(code.campaign))
                setContent(sanitize(code.code))
              }}
            >
              <option value="">—</option>
              {discountCodes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} ({c.value}{c.campaign ? ` · ${c.campaign}` : ''})
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-ink-400">
            utm_source
            <select
              className="input mt-1 cursor-pointer"
              value={source}
              onChange={(e) => {
                setSource(e.target.value)
                const preset = SOURCES.find((s) => s.source === e.target.value)
                if (preset) setMedium(preset.medium)
              }}
            >
              {SOURCES.map((s) => (
                <option key={s.source} value={s.source}>
                  {s.source}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-400">
            utm_medium
            <input className="input mt-1" value={medium} onChange={(e) => setMedium(e.target.value)} />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-ink-400">
            utm_campaign
            <input className="input mt-1" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          </label>
          <label className="text-xs text-ink-400">
            utm_content {language === 'zh' ? '（可选）' : '(optional)'}
            <input className="input mt-1" value={content} onChange={(e) => setContent(e.target.value)} />
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-ink-800 bg-ink-900 p-3">
          {result ? (
            <p className="text-xs break-all text-ink-200">{result}</p>
          ) : (
            <p className="text-xs text-brand-400">{t('utm.invalidUrl')}</p>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button className="btn-primary" onClick={copy} disabled={!result}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t('utm.copied') : t('utm.copy')}
          </button>
        </div>
      </div>
    </div>
  )
}
