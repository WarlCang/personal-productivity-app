import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Rocket, Settings2, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { upcomingPromos } from '../../utils/promoCalendar'
import { usePromoPacks } from '../../store/useAuth'
import { campaignTag, instantiatePlaybook, type Playbook } from '../../utils/playbooks'
import { tagChipClass } from '../../utils/torrasPresets'
import PlaybookEditorModal from './PlaybookEditorModal'

export default function PlaybookModal({ onClose }: { onClose: () => void }) {
  const addTask = useStore((s) => s.addTask)
  const addEvent = useStore((s) => s.addEvent)
  const addCampaign = useStore((s) => s.addCampaign)
  const channelChecklists = useStore((s) => s.channelChecklists)
  const playbooks = useStore((s) => s.playbooks)
  const language = useStore((s) => s.language)
  const packs = usePromoPacks()
  const t = useT()

  const suggestions = useMemo(() => upcomingPromos(new Date(), 50, packs), [packs])

  const suggestFor = (playbook: Playbook | undefined) => {
    const match = playbook?.promoIdPrefix
      ? suggestions.find((s) => s.promo.id.startsWith(playbook.promoIdPrefix!))
      : undefined
    return match?.promo.date ?? format(new Date(), 'yyyy-MM-dd')
  }

  const [playbookId, setPlaybookId] = useState(playbooks[0]?.id ?? '')
  const [goLive, setGoLive] = useState(() => suggestFor(playbooks[0]))
  const [showEditor, setShowEditor] = useState(false)
  const [withEvent, setWithEvent] = useState(true)

  // The editor can rename/delete templates while this modal is open.
  const playbook = playbooks.find((p) => p.id === playbookId) ?? playbooks[0]
  const preview =
    playbook && goLive ? instantiatePlaybook(playbook, goLive, language, channelChecklists) : []
  const tag = playbook && goLive ? campaignTag(playbook, goLive) : ''

  const create = () => {
    if (!playbook || !goLive) return
    for (const step of preview) addTask(step)
    const displayName = language === 'zh' ? playbook.name.zh : playbook.name.en
    addCampaign({ tag, name: `${displayName} ${goLive.slice(0, 4)}`, goLive })
    if (withEvent) addEvent({ title: `\u{1F680} ${displayName}`, date: goLive, tz: 'us' })
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card flex max-h-[85vh] w-full max-w-lg flex-col p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Rocket size={17} className="text-brand-400" />
            {t('playbook.title')}
          </h2>
          <div className="flex items-center gap-1">
            <button className="btn-ghost px-2" title={t('playbookEdit.title')} onClick={() => setShowEditor(true)}>
              <Settings2 size={15} />
            </button>
            <button className="btn-ghost -mr-1 px-2" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-ink-400">{t('playbook.hint')}</p>

        {playbooks.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">{t('playbook.empty')}</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-ink-400">
                {t('playbook.select')}
                <select
                  className="input mt-1 cursor-pointer"
                  value={playbook?.id ?? ''}
                  onChange={(e) => {
                    setPlaybookId(e.target.value)
                    setGoLive(suggestFor(playbooks.find((p) => p.id === e.target.value)))
                  }}
                >
                  {playbooks.map((p) => (
                    <option key={p.id} value={p.id}>
                      {language === 'zh' ? p.name.zh : p.name.en}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-ink-400">
                {t('playbook.goLive')}
                <input
                  type="date"
                  className="input mt-1 [color-scheme:dark]"
                  value={goLive}
                  onChange={(e) => setGoLive(e.target.value)}
                />
              </label>
            </div>

            {goLive && (
              <>
                <div className="mt-4 flex items-center gap-2 text-xs text-ink-400">
                  {t('playbook.preview', { n: preview.length })}
                  <span className={`chip ${tagChipClass(tag)}`}>#{tag}</span>
                </div>
                <div className="mt-2 flex-1 overflow-y-auto rounded-lg border border-ink-800 bg-ink-900">
                  {preview.map((step, i) => {
                    const days = Math.round(
                      (parseISO(step.dueDate).getTime() - parseISO(goLive).getTime()) / 86_400_000,
                    )
                    return (
                      <div key={i} className="flex items-center gap-3 border-b border-ink-800 px-3 py-2 text-sm last:border-0">
                        <span className="w-12 shrink-0 font-mono text-[11px] text-brand-400">
                          {days === 0 ? 'D-Day' : days > 0 ? `D+${days}` : `D${days}`}
                        </span>
                        <span className="flex-1 truncate text-ink-100">{step.title}</span>
                        {step.subtasks.length > 0 && (
                          <span className="shrink-0 text-[11px] text-ink-400">
                            {t('playbook.subtaskCount', { n: step.subtasks.length })}
                          </span>
                        )}
                        <span className="w-20 shrink-0 text-right text-[11px] text-ink-400">
                          {format(parseISO(step.dueDate), 'MM-dd')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-ink-800 pt-4">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-400">
                <input
                  type="checkbox"
                  checked={withEvent}
                  onChange={(e) => setWithEvent(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-brand-500"
                />
                {t('playbook.withEvent')}
              </label>
              <button className="btn-primary" onClick={create} disabled={!goLive || preview.length === 0}>
                {t('playbook.create', { n: preview.length })}
              </button>
            </div>
          </>
        )}

        {showEditor && <PlaybookEditorModal onClose={() => setShowEditor(false)} />}
      </div>
    </div>
  )
}
