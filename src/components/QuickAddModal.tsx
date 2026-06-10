import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'

export default function QuickAddModal({ onClose }: { onClose: () => void }) {
  const addTask = useStore((s) => s.addTask)
  const t = useT()
  const [title, setTitle] = useState('')

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    addTask({ title: trimmed })
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card flex w-full max-w-lg items-center gap-2.5 px-4 py-3">
        <Plus size={16} className="text-brand-500" />
        <input
          autoFocus
          className="flex-1 bg-transparent text-sm outline-none placeholder-ink-400"
          placeholder={t('quickadd.placeholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onClose()
          }}
        />
      </div>
    </div>
  )
}
