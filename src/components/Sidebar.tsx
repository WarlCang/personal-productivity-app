import { useState } from 'react'
import {
  CalendarDays,
  CheckSquare,
  Gamepad2,
  House,
  Kanban,
  KeyRound,
  Languages,
  Link2,
  ListTodo,
  Lock,
  Megaphone,
  NotebookPen,
  Rocket,
  Shield,
  Tag,
  Timer,
  Users,
} from 'lucide-react'
import UtmBuilderModal from './tools/UtmBuilderModal'
import QuickLinksModal from './tools/QuickLinksModal'
import DiscountCodesModal from './tools/DiscountCodesModal'
import PasswordVaultModal from './tools/PasswordVaultModal'
import { COMPANY_MODE } from '../config'
import { useStore, useGameUnlocked } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { useUnreadCount, useAssignedToMe } from '../store/useTeam'
import { useT, type TKey } from '../i18n'
import type { ViewName } from '../types'

const NAV: { view: ViewName; labelKey: TKey; icon: typeof ListTodo }[] = [
  { view: 'home', labelKey: 'nav.home', icon: House },
  ...(COMPANY_MODE ? [{ view: 'team' as ViewName, labelKey: 'nav.team' as TKey, icon: Users }] : []),
  { view: 'todos', labelKey: 'nav.todos', icon: ListTodo },
  { view: 'campaigns', labelKey: 'nav.campaigns', icon: Megaphone },
  { view: 'kanban', labelKey: 'nav.kanban', icon: Kanban },
  { view: 'calendar', labelKey: 'nav.calendar', icon: CalendarDays },
  { view: 'notes', labelKey: 'nav.notes', icon: NotebookPen },
  { view: 'pomodoro', labelKey: 'nav.pomodoro', icon: Timer },
  { view: 'game', labelKey: 'nav.game', icon: Gamepad2 },
]

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Sidebar() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const running = useStore((s) => s.running)
  const phase = useStore((s) => s.phase)
  const secondsLeft = useStore((s) => s.secondsLeft)
  const tasks = useStore((s) => s.tasks)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)
  const gameUnlocked = useGameUnlocked()
  const [openTool, setOpenTool] = useState<'utm' | 'links' | 'codes' | 'vault' | null>(null)
  const user = useAuth((s) => s.user)
  const unread = useUnreadCount()
  const assignedOpen = useAssignedToMe().filter((t) => !t.done).length
  const t = useT()

  const openCount = tasks.filter((t) => !t.done).length
  const teamBadge = unread + assignedOpen
  const nav =
    COMPANY_MODE && user?.isAdmin
      ? [...NAV, { view: 'admin' as ViewName, labelKey: 'nav.admin' as TKey, icon: Shield }]
      : NAV

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-ink-800 bg-ink-900">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-7">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-black text-ink-950">
          T
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-[0.18em] text-white">TORRAS</div>
          <div className="text-[11px] tracking-wide text-ink-400">PRODUCTIVITY</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {nav.map(({ view: v, labelKey, icon: Icon }) => {
          const active = view === v
          const locked = v === 'game' && !gameUnlocked
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              <span className="flex-1 text-left">{t(labelKey)}</span>
              {v === 'todos' && openCount > 0 && (
                <span className="rounded-full bg-ink-700 px-1.5 text-[11px] text-ink-200">{openCount}</span>
              )}
              {v === 'team' && teamBadge > 0 && (
                <span className="rounded-full bg-brand-500/20 px-1.5 text-[11px] font-semibold text-brand-400">
                  {teamBadge}
                </span>
              )}
              {v === 'game' &&
                (locked ? (
                  <Lock size={13} className="text-ink-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                ))}
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      {(running || phase !== 'focus') && (
        <button
          onClick={() => setView('pomodoro')}
          className="mx-3 mb-3 cursor-pointer rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-left transition-colors hover:border-brand-500/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
              {phase === 'focus' ? t('sidebar.focusing') : phase === 'break' ? t('sidebar.break') : t('sidebar.longBreak')}
            </span>
            {phase === 'focus' ? (
              <CheckSquare size={12} className="text-brand-500" />
            ) : (
              <Gamepad2 size={12} className="text-brand-500" />
            )}
          </div>
          <div className="mt-0.5 font-mono text-xl font-semibold text-white tabular-nums">
            {formatClock(secondsLeft)}
            {!running && <span className="ml-2 text-xs font-normal text-ink-400">{t('sidebar.paused')}</span>}
          </div>
        </button>
      )}

      <div className="mx-3 mb-2 flex flex-col">
        {(
          [
            { tool: 'links', icon: Rocket, label: t('links.title') },
            { tool: 'codes', icon: Tag, label: t('codes.title') },
            { tool: 'utm', icon: Link2, label: t('utm.title') },
            { tool: 'vault', icon: KeyRound, label: t('vault.title') },
          ] as const
        ).map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            onClick={() => setOpenTool(tool)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-5 pb-4">
        <span className="max-w-28 truncate text-[11px] text-ink-600" title={user?.email}>
          {COMPANY_MODE && user ? user.name : t('sidebar.footer')}
        </span>
        <button
          className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          title={language === 'en' ? '切换到中文' : 'Switch to English'}
          onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
        >
          <Languages size={12} />
          {language === 'en' ? '中文' : 'EN'}
        </button>
      </div>

      {openTool === 'utm' && <UtmBuilderModal onClose={() => setOpenTool(null)} />}
      {openTool === 'links' && <QuickLinksModal onClose={() => setOpenTool(null)} />}
      {openTool === 'codes' && <DiscountCodesModal onClose={() => setOpenTool(null)} />}
      {openTool === 'vault' && <PasswordVaultModal onClose={() => setOpenTool(null)} />}
    </aside>
  )
}
