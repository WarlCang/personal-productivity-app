import { useState } from 'react'
import { Plus, RotateCcw, Settings2, Trash2, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { CHECKLIST_CHIP_PALETTE, type ChannelChecklist } from '../../utils/channelChecklists'
import { slugId } from '../../utils/id'

/**
 * In-app editor for channel QA checklists. Built-in bilingual items are
 * preserved unless the text is actually changed (then the typed text is used
 * for both languages) — same convention as the playbook editor.
 */

interface EditItem {
  text: string
  orig?: { en: string; zh: string }
}

interface Draft {
  id: string | null // null = new checklist
  name: string
  origName?: { en: string; zh: string }
  chip?: string
  items: EditItem[]
}

const EMPTY_DRAFT: Draft = { id: null, name: '', items: [{ text: '' }] }

export default function ChecklistEditorModal({ onClose }: { onClose: () => void }) {
  const checklists = useStore((s) => s.channelChecklists)
  const saveChecklist = useStore((s) => s.saveChecklist)
  const deleteChecklist = useStore((s) => s.deleteChecklist)
  const resetChecklists = useStore((s) => s.resetChecklists)
  const language = useStore((s) => s.language)
  const t = useT()

  const toDraft = (c: ChannelChecklist): Draft => ({
    id: c.id,
    name: language === 'zh' ? c.name.zh : c.name.en,
    origName: c.name,
    chip: c.chip,
    items: c.items.map((item) => ({
      text: language === 'zh' ? item.zh : item.en,
      orig: item,
    })),
  })

  const [draft, setDraft] = useState<Draft>(() =>
    checklists.length > 0 ? toDraft(checklists[0]) : EMPTY_DRAFT,
  )

  const select = (value: string) => {
    if (value === '__new__') return setDraft(EMPTY_DRAFT)
    const c = checklists.find((c) => c.id === value)
    if (c) setDraft(toDraft(c))
  }

  const toName = (typed: string, orig?: { en: string; zh: string }) => {
    const trimmed = typed.trim()
    if (orig && trimmed === (language === 'zh' ? orig.zh : orig.en)) return orig
    return { en: trimmed, zh: trimmed }
  }

  const valid = draft.name.trim() && draft.items.length > 0 && draft.items.every((i) => i.text.trim())

  const save = () => {
    if (!valid) return
    const id = draft.id ?? slugId(draft.name, new Set(checklists.map((c) => c.id)))
    saveChecklist({
      id,
      name: toName(draft.name, draft.origName),
      chip: draft.chip ?? CHECKLIST_CHIP_PALETTE[checklists.length % CHECKLIST_CHIP_PALETTE.length],
      items: draft.items.map((i) => toName(i.text, i.orig)),
    })
    onClose()
  }

  const remove = () => {
    if (!draft.id) return
    if (!confirm(t('checklistEdit.deleteConfirm', { name: draft.name }))) return
    deleteChecklist(draft.id)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card flex max-h-[85vh] w-full max-w-lg flex-col p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Settings2 size={17} className="text-brand-400" />
            {t('checklistEdit.title')}
          </h2>
          <button className="btn-ghost -mr-1 px-2" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-ink-400">
            {t('checklistEdit.select')}
            <select
              className="input mt-1 cursor-pointer"
              value={draft.id ?? '__new__'}
              onChange={(e) => select(e.target.value)}
            >
              {checklists.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'zh' ? c.name.zh : c.name.en}
                </option>
              ))}
              <option value="__new__">{t('checklistEdit.new')}</option>
            </select>
          </label>
          <label className="text-xs text-ink-400">
            {t('checklistEdit.name')}
            <input
              className="input mt-1"
              placeholder={t('checklistEdit.namePlaceholder')}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {draft.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="input flex-1 px-2 py-1.5 text-sm"
                placeholder={t('checklistEdit.itemPlaceholder')}
                value={item.text}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    items: draft.items.map((it, j) => (j === i ? { ...it, text: e.target.value } : it)),
                  })
                }
              />
              <button
                className="cursor-pointer p-1 text-ink-600 transition-colors hover:text-red-400"
                onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            className="btn-ghost mt-1 self-start text-xs"
            onClick={() => setDraft({ ...draft, items: [...draft.items, { text: '' }] })}
          >
            <Plus size={13} /> {t('checklistEdit.addItem')}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-ink-800 pt-4">
          {draft.id && (
            <button className="btn-danger" onClick={remove}>
              <Trash2 size={14} /> {t('playbookEdit.delete')}
            </button>
          )}
          <button
            className="btn-ghost text-xs"
            onClick={() => {
              if (confirm(t('checklistEdit.resetConfirm'))) {
                resetChecklists()
                onClose()
              }
            }}
          >
            <RotateCcw size={13} /> {t('playbookEdit.reset')}
          </button>
          <div className="flex-1" />
          <button className="btn-primary" onClick={save} disabled={!valid}>
            {t('checklistEdit.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
