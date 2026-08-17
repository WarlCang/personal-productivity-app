import { Check, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'

/**
 * Shown after a task is completed; persists until the user acts — undo,
 * dismiss, a newer completion, or navigating to another view.
 */
export default function UndoToast() {
  const undoState = useStore((s) => s.undoState)
  const undoComplete = useStore((s) => s.undoComplete)
  const clearUndo = useStore((s) => s.clearUndo)
  const t = useT()

  if (!undoState) return null

  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-4 py-2.5 shadow-2xl">
      <Check size={15} className="shrink-0 text-brand-400" />
      <span className="max-w-64 truncate text-sm text-ink-200">
        {t('undo.completed', { title: undoState.title })}
      </span>
      <button
        className="cursor-pointer text-sm font-semibold whitespace-nowrap text-brand-400 transition-colors hover:text-brand-300"
        onClick={undoComplete}
      >
        {t('undo.action')}
      </button>
      <button
        className="cursor-pointer p-0.5 text-ink-500 transition-colors hover:text-ink-200"
        onClick={clearUndo}
      >
        <X size={13} />
      </button>
    </div>
  )
}
