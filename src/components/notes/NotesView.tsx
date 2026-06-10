import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, FileText, FolderOpen, Plus, Search, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { NOTE_TEMPLATES, type NoteTemplate } from '../../utils/torrasPresets'
import NoteEditor from './NoteEditor'

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? ''
}

export default function NotesView() {
  const notes = useStore((s) => s.notes)
  const addNote = useStore((s) => s.addNote)
  const deleteNote = useStore((s) => s.deleteNote)
  const language = useStore((s) => s.language)
  const selectedId = useStore((s) => s.selectedNoteId)
  const setSelectedId = useStore((s) => s.setSelectedNote)
  const t = useT()
  const [query, setQuery] = useState('')
  const [folderFilter, setFolderFilter] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  const folders = useMemo(
    () => [...new Set(notes.map((n) => n.folder).filter(Boolean))].sort(),
    [notes],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes
      .filter((n) => (folderFilter ? n.folder === folderFilter : true))
      .filter((n) => !q || n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [notes, query, folderFilter])

  const selected = notes.find((n) => n.id === selectedId) ?? null

  const createNote = (template?: NoteTemplate) => {
    const dateLabel = format(new Date(), 'yyyy-MM-dd')
    const note = template
      ? addNote({
          title: template.title(language, dateLabel),
          content: template.content[language],
          folder: template.folder[language],
        })
      : addNote({ folder: folderFilter })
    setShowTemplates(false)
    setSelectedId(note.id)
  }


  return (
    <div className="flex h-full">
      <div className="flex w-72 shrink-0 flex-col border-r border-ink-800">
        <div className="flex items-center gap-2 px-4 pt-6 pb-3">
          <h1 className="flex-1 text-xl font-bold text-white">{t('notes.title')}</h1>
          <div className="relative">
            <button className="btn-primary px-2.5" onClick={() => setShowTemplates(!showTemplates)} title={t('notes.new')}>
              <Plus size={15} />
              <ChevronDown size={12} />
            </button>
            {showTemplates && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-ink-700 bg-ink-850 p-1 shadow-xl shadow-black/40">
                <button
                  className="block w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-sm text-ink-200 transition-colors hover:bg-ink-800"
                  onClick={() => createNote()}
                >
                  {t('notes.template.blank')}
                </button>
                <div className="mx-2 my-1 border-t border-ink-700" />
                {NOTE_TEMPLATES.map((template) => (
                  <button
                    key={template.nameKey}
                    className="block w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-sm text-ink-200 transition-colors hover:bg-ink-800"
                    onClick={() => createNote(template)}
                  >
                    {t(template.nameKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-2.5 focus-within:border-brand-500">
            <Search size={14} className="text-ink-400" />
            <input
              className="w-full bg-transparent py-1.5 text-sm outline-none placeholder-ink-400"
              placeholder={t('notes.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {folders.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            <button
              className={`chip cursor-pointer ${!folderFilter ? 'bg-brand-500/15 text-brand-400' : 'bg-ink-800 text-ink-300 hover:bg-ink-700'}`}
              onClick={() => setFolderFilter('')}
            >
              {t('notes.all')}
            </button>
            {folders.map((f) => (
              <button
                key={f}
                className={`chip cursor-pointer ${folderFilter === f ? 'bg-brand-500/15 text-brand-400' : 'bg-ink-800 text-ink-300 hover:bg-ink-700'}`}
                onClick={() => setFolderFilter(folderFilter === f ? '' : f)}
              >
                <FolderOpen size={11} /> {f}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {visible.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-ink-400">
              {notes.length === 0 ? t('notes.emptyList') : t('notes.noMatches')}
            </div>
          )}
          {visible.map((note) => (
            <button
              key={note.id}
              onClick={() => setSelectedId(note.id)}
              className={`group block w-full cursor-pointer rounded-lg px-3 py-2.5 text-left transition-colors ${
                note.id === selectedId ? 'bg-ink-800' : 'hover:bg-ink-850'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={13} className="shrink-0 text-brand-500" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-100">{note.title || t('notes.untitled')}</span>
                <Trash2
                  size={13}
                  className="shrink-0 text-ink-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(t('notes.deleteConfirm', { title: note.title || t('notes.untitled') }))) {
                      deleteNote(note.id)
                      if (selectedId === note.id) setSelectedId(null)
                    }
                  }}
                />
              </div>
              <div className="mt-0.5 truncate pl-5.5 text-xs text-ink-400">
                {format(parseISO(note.updatedAt), 'MMM d')}
                {note.folder && ` · ${note.folder}`}
                {' · '}
                {stripHtml(note.content).slice(0, 60) || t('notes.empty')}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {selected ? (
          <NoteEditor key={selected.id} note={selected} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-400">
            <FileText size={40} strokeWidth={1.2} />
            <p className="text-sm">{t('notes.selectPrompt')}</p>
            <button className="btn-primary" onClick={() => createNote()}>
              <Plus size={14} /> {t('notes.new')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
