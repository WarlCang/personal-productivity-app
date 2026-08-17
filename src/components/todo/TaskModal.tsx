import { useState } from 'react'
import { Flag, Play, Plus, Settings2, Tag, Trash2, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT, type TKey } from '../../i18n'
import { PRESET_TAGS, tagChipClass } from '../../utils/torrasPresets'
import { checklistSubtasks } from '../../utils/channelChecklists'
import type { Priority, RecurrenceFreq, Task } from '../../types'
import { uid } from '../../utils/id'
import ChecklistEditorModal from './ChecklistEditorModal'

export const PRIORITY_CHIP: Record<Priority, string> = {
  high: 'bg-red-500/15 text-red-400',
  medium: 'bg-brand-500/15 text-brand-400',
  low: 'bg-sky-500/15 text-sky-400',
}

export const PRIORITY_KEY: Record<Priority, TKey> = {
  high: 'task.priorityHigh',
  medium: 'task.priorityMedium',
  low: 'task.priorityLow',
}

export default function TaskModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId))
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const toggleTaskDone = useStore((s) => s.toggleTaskDone)
  const startPomodoro = useStore((s) => s.startPomodoro)
  const setView = useStore((s) => s.setView)
  const language = useStore((s) => s.language)
  const channelChecklists = useStore((s) => s.channelChecklists)
  const t = useT()
  const [newSubtask, setNewSubtask] = useState('')
  const [newTag, setNewTag] = useState('')
  const [showChecklistEditor, setShowChecklistEditor] = useState(false)

  if (!task) return null

  const patch = (p: Partial<Task>) => updateTask(task.id, p)

  const addSubtask = () => {
    const title = newSubtask.trim()
    if (!title) return
    patch({ subtasks: [...task.subtasks, { id: uid(), title, done: false }] })
    setNewSubtask('')
  }

  const addTag = (raw?: string) => {
    const tag = (raw ?? newTag).trim().toLowerCase()
    if (!tag || task.tags.includes(tag)) return setNewTag('')
    patch({ tags: [...task.tags, tag] })
    setNewTag('')
  }

  const unusedPresets = PRESET_TAGS.filter((p) => !task.tags.includes(p.tag))

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg p-5">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={task.done}
            onChange={() => toggleTaskDone(task.id)}
            className="mt-2 h-4 w-4 cursor-pointer accent-brand-500"
          />
          <input
            className="flex-1 bg-transparent text-lg font-semibold text-white outline-none placeholder-ink-400"
            value={task.title}
            placeholder={t('task.titlePlaceholder')}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <button className="btn-ghost -mr-1 px-2" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <textarea
          className="input mt-3 min-h-20 resize-y"
          placeholder={t('task.descriptionPlaceholder')}
          value={task.description ?? ''}
          onChange={(e) => patch({ description: e.target.value })}
        />

        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="text-xs text-ink-400">
            {t('task.dueDate')}
            <input
              type="date"
              className="input mt-1 [color-scheme:dark]"
              value={task.dueDate ?? ''}
              onChange={(e) => patch({ dueDate: e.target.value || undefined })}
            />
          </label>
          <label className="text-xs text-ink-400">
            {t('task.priority')}
            <select
              className="input mt-1 cursor-pointer"
              value={task.priority ?? ''}
              onChange={(e) => patch({ priority: (e.target.value || undefined) as Priority | undefined })}
            >
              <option value="">{t('task.priorityNone')}</option>
              <option value="high">{t('task.priorityHigh')}</option>
              <option value="medium">{t('task.priorityMedium')}</option>
              <option value="low">{t('task.priorityLow')}</option>
            </select>
          </label>
          <label className="text-xs text-ink-400" title={t('task.repeatsHint')}>
            {t('event.repeats')}
            <select
              className="input mt-1 cursor-pointer"
              value={task.recurrence ?? ''}
              disabled={!task.dueDate}
              onChange={(e) =>
                patch({ recurrence: (e.target.value || undefined) as RecurrenceFreq | undefined })
              }
            >
              <option value="">{t('event.never')}</option>
              <option value="daily">{t('event.daily')}</option>
              <option value="weekly">{t('event.weekly')}</option>
              <option value="monthly">{t('event.monthly')}</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-ink-400">
            <Tag size={12} /> {t('task.tags')}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {task.tags.map((tag) => (
              <span key={tag} className={`chip ${tagChipClass(tag)}`}>
                #{tag}
                <button
                  className="cursor-pointer opacity-60 hover:text-red-400 hover:opacity-100"
                  onClick={() => patch({ tags: task.tags.filter((t) => t !== tag) })}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              className="w-28 rounded-full border border-ink-700 bg-transparent px-2.5 py-0.5 text-xs outline-none placeholder-ink-400 focus:border-brand-500"
              placeholder={t('task.addTag')}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              onBlur={() => addTag()}
            />
          </div>
          {unusedPresets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {unusedPresets.map((p) => (
                <button
                  key={p.tag}
                  className={`chip cursor-pointer opacity-60 transition-opacity hover:opacity-100 ${p.chip}`}
                  onClick={() => addTag(p.tag)}
                >
                  + {p.tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-ink-400">
            <Flag size={12} /> {t('task.subtasks')}
            {task.subtasks.length > 0 && (
              <span>
                ({task.subtasks.filter((s) => s.done).length}/{task.subtasks.length})
              </span>
            )}
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {channelChecklists.map((channel) => (
              <button
                key={channel.id}
                title={t('task.channelHint')}
                className={`chip cursor-pointer opacity-60 transition-opacity hover:opacity-100 ${channel.chip}`}
                onClick={() => patch({ subtasks: [...task.subtasks, ...checklistSubtasks(channel, language)] })}
              >
                + {language === 'zh' ? channel.name.zh : channel.name.en}
              </button>
            ))}
            <button
              className="cursor-pointer p-1 text-ink-600 transition-colors hover:text-ink-200"
              title={t('checklistEdit.title')}
              onClick={() => setShowChecklistEditor(true)}
            >
              <Settings2 size={13} />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {task.subtasks.map((sub) => (
              <div key={sub.id} className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-ink-850">
                <input
                  type="checkbox"
                  checked={sub.done}
                  onChange={() =>
                    patch({
                      subtasks: task.subtasks.map((s) => (s.id === sub.id ? { ...s, done: !s.done } : s)),
                    })
                  }
                  className="h-3.5 w-3.5 cursor-pointer accent-brand-500"
                />
                <span className={`flex-1 text-sm ${sub.done ? 'text-ink-400 line-through' : 'text-ink-200'}`}>
                  {sub.title}
                </span>
                <button
                  className="cursor-pointer text-ink-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                  onClick={() => patch({ subtasks: task.subtasks.filter((s) => s.id !== sub.id) })}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 px-1">
              <Plus size={14} className="text-ink-400" />
              <input
                className="flex-1 bg-transparent py-1 text-sm outline-none placeholder-ink-400"
                placeholder={t('task.addSubtask')}
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-ink-800 pt-4">
          <button
            className="btn-danger"
            onClick={() => {
              deleteTask(task.id)
              onClose()
            }}
          >
            <Trash2 size={14} /> {t('task.delete')}
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              startPomodoro(task.id)
              setView('pomodoro')
              onClose()
            }}
          >
            <Play size={14} /> {t('task.focusOnThis')}
          </button>
        </div>

        {showChecklistEditor && <ChecklistEditorModal onClose={() => setShowChecklistEditor(false)} />}
      </div>
    </div>
  )
}
