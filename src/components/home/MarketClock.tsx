import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'

/**
 * Live US Eastern clock for teams operating the NA market from Shenzhen.
 * Intl handles daylight saving (EST/EDT) — nobody does timezone math by hand.
 */
const formatter = (lang: string) =>
  new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  })

export default function MarketClock() {
  const language = useStore((s) => s.language)
  const t = useT()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span
      className="chip bg-sky-500/15 text-sky-300"
      title={t('home.usClockHint')}
    >
      <Globe size={11} className="mr-1 inline" />
      {t('home.usClock')} {formatter(language).format(now)}
    </span>
  )
}
