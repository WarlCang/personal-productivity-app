import { useState } from 'react'
import { Plus, RotateCcw, Settings2, Trash2, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import type { Playbook } from '../../utils/playbooks'
import type { ChannelId } from '../../utils/channelChecklists'
import { slugId } from '../../utils/id'
import type { Priority } from '../../types'

/**
 * In-app editor for campaign playbook templates. Built-in bilingual titles
 * are preserved unless the user actually changes the text — edited text is
 * then used for both languages.
 */

interface EditStep {
  offset: number
  title: string
  orig?: { en: string; zh: string }
  priority?: Priority
  channel?: ChannelId
}

interface Draft {
  id: string | null // null = new template
  name: string
  origName?: { en: string; zh: string }
  promoIdPrefix?: string
  steps: EditStep[]
}

const EMPTY_DRAFT: Draft = { id: null, name: '', steps: [{ offset: -7, title: '' }] }

export default function PlaybookEditorModal({ onClose }: { onClose: () => void }) {
  const playbooks = useStore((s) => s.playbooks)
  const savePlaybook = useStore((s) => s.savePlaybook)
  const deletePlaybook = useStore((s) => s.deletePlaybook)
  const resetPlaybooks = useStore((s) => s.resetPlaybooks)
  const channelChecklists = useStore((s) => s.channelChecklists)
  const language = useStore((s) => s.language)
  const t = useT()

  const toDraft = (p: Playbook): Draft => ({
    id: p.id,
    name: language === 'zh' ? p.name.zh : p.name.en,
    origName: p.name,
    promoIdPrefix: p.promoIdPrefix,
    steps: p.steps.map((s) => ({
      offset: s.offset,
      title: language === 'zh' ? s.title.zh : s.title.en,
      orig: s.title,
      priority: s.priority,
      channel: s.channel,
    })),
  })

  const [draft, setDraft] = useState<Draft>(() =>
    playbooks.length > 0 ? toDraft(playbooks[0]) : EMPTY_DRAFT,
  )

  const select = (value: string) => {
    if (value === '__new__') return setDraft(EMPTY_DRAFT)
    const p = playbooks.find((p) => p.id === value)
    if (p) setDraft(toDraft(p))
  }

  const patchStep = (index: number, patch: Partial<EditStep>) =>
    setDraft({
      ...draft,
      steps: draft.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    })

  // Keep the bilingual original when the visible text wasn't touched.
  const toName = (typed: string, orig?: { en: string; zh: string }) => {
    const trimmed = typed.trim()
    if (orig && trimmed === (language === 'zh' ? orig.zh : orig.en)) return orig
    return { en: trimmed, zh: trimmed }
  }

  const valid = draft.name.trim() && draft.steps.length > 0 && draft.steps.every((s) => s.title.trim())

  const save = () => {
    if (!valid) return
    const id =
      draft.id ?? slugId(draft.name, new Set(playbooks.map((p) => p.id)))
    savePlaybook({
      id,
      name: toName(draft.name, draft.origName),
      promoIdPrefix: draft.promoIdPrefix,
      steps: [...draft.steps]
        .sort((a, b) => a.offset - b.offset)
        .map((s) => ({
          offset: s.offset,
          title: toName(s.title, s.orig),
          priority: s.priority,
          channel: s.channel,
        })),
    })
    onClose()
  }

  const remove = () => {
    if (!draft.id) return
    if (!confirm(t('playbookEdit.deleteConfirm', { name: draft.name }))) return
    deletePlaybook(draft.id)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card flex max-h-[88vh] w-full max-w-2xl flex-col p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Settings2 size={17} className="text-brand-400" />
            {t('playbookEdit.title')}
          </h2>
          <button className="btn-ghost -mr-1 px-2" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-ink-400">
            {t('playbookEdit.select')}
            <select
              className="input mt-1 cursor-pointer"
              value={draft.id ?? '__new__'}
              onChange={(e) => select(e.target.value)}
            >
              {playbooks.map((p) => (
                <option key={p.id} value={p.id}>
                  {language === 'zh' ? p.name.zh : p.name.en}
                </option>
              ))}
              <option value="__new__">{t('playbookEdit.new')}</option>
            </select>
          </label>
          <label className="text-xs text-ink-400">
            {t('playbookEdit.name')}
            <input
              className="input mt-1"
              placeholder={t('playbookEdit.namePlaceholder')}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
        </div>

        <div className="mt-4 mb-1.5 flex items-center text-xs text-ink-400">
          <span className="w-20">{t('playbookEdit.offset')}</span>
          <span className="flex-1 px-2">{t('playbookEdit.step')}</span>
          <span className="w-24">{t('task.priority')}</span>
          <span className="w-32 px-2">{t('playbookEdit.checklist')}</span>
          <span className="w-7" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {draft.steps.map((step, i) => (
            <div key={i} className="flex items-center">
              <input
                type="number"
                className="input w-20 px-2 py-1.5 text-sm"
                value={step.offset}
                onChange={(e) => patchStep(i, { offset: Number(e.target.value) })}
              />
              <input
                className="input mx-2 flex-1 px-2 py-1.5 text-sm"
                placeholder={t('playbookEdit.stepPlaceholder')}
                value={step.title}
                onChange={(e) => patchStep(i, { title: e.target.value })}
              />
              <select
                className="input w-24 cursor-pointer px-1.5 py-1.5 text-sm"
                value={step.priority ?? ''}
                onChange={(e) =>
                  patchStep(i, { priority: (e.target.value || undefined) as Priority | undefined })
                }
              >
                <option value="">—</option>
                <option value="high">{t('task.priorityHigh')}</option>
                <option value="medium">{t('task.priorityMedium')}</option>
                <option value="low">{t('task.priorityLow')}</option>
              </select>
              <select
                className="input mx-2 w-32 cursor-pointer px-1.5 py-1.5 text-sm"
                value={step.channel ?? ''}
                onChange={(e) =>
                  patchStep(i, { channel: (e.target.value || undefined) as ChannelId | undefined })
                }
              >
                <option value="">—</option>
                {channelChecklists.map((c) => (
                  <option key={c.id} value={c.id}>
                    {language === 'zh' ? c.name.zh : c.name.en}
                  </option>
                ))}
              </select>
              <button
                className="w-7 cursor-pointer p-1 text-ink-600 transition-colors hover:text-red-400"
                onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, j) => j !== i) })}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            className="btn-ghost mt-1 self-start text-xs"
            onClick={() =>
              setDraft({
                ...draft,
                steps: [...draft.steps, { offset: (draft.steps.at(-1)?.offset ?? -7) + 1, title: '' }],
              })
            }
          >
            <Plus size={13} /> {t('playbookEdit.addStep')}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-600">{t('playbookEdit.offsetHint')}</p>

        <div className="mt-3 flex items-center gap-2 border-t border-ink-800 pt-4">
          {draft.id && (
            <button className="btn-danger" onClick={remove}>
              <Trash2 size={14} /> {t('playbookEdit.delete')}
            </button>
          )}
          <button
            className="btn-ghost text-xs"
            title={t('playbookEdit.resetHint')}
            onClick={() => {
              if (confirm(t('playbookEdit.resetConfirm'))) {
                resetPlaybooks()
                onClose()
              }
            }}
          >
            <RotateCcw size={13} /> {t('playbookEdit.reset')}
          </button>
          <div className="flex-1" />
          <button className="btn-primary" onClick={save} disabled={!valid}>
            {t('playbookEdit.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
