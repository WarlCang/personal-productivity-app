import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Note } from '../../types'

function ToolbarButton({
  editor,
  active,
  onClick,
  children,
  title,
}: {
  editor: Editor
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      title={title}
      disabled={!editor.isEditable}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`cursor-pointer rounded-md p-1.5 transition-colors ${
        active ? 'bg-brand-500/15 text-brand-400' : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
      }`}
    >
      {children}
    </button>
  )
}

export default function NoteEditor({ note }: { note: Note }) {
  const updateNote = useStore((s) => s.updateNote)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: note.content,
    onUpdate: ({ editor }) => updateNote(note.id, { content: editor.getHTML() }),
  })

  if (!editor) return null

  const divider = <div className="mx-1 h-5 w-px bg-ink-700" />

  return (
    <div className="flex h-full flex-col">
      <div className="px-8 pt-7">
        <input
          className="w-full bg-transparent text-3xl font-bold text-white outline-none placeholder-ink-500"
          value={note.title}
          placeholder="Untitled"
          onChange={(e) => updateNote(note.id, { title: e.target.value })}
        />
        <input
          className="mt-1 w-48 bg-transparent text-xs text-ink-400 outline-none placeholder-ink-600"
          value={note.folder}
          placeholder="Add to folder…"
          onChange={(e) => updateNote(note.id, { folder: e.target.value.trim() })}
        />
      </div>

      <div className="sticky top-0 z-10 mx-8 mt-4 flex flex-wrap items-center gap-0.5 rounded-lg border border-ink-800 bg-ink-900/95 px-2 py-1 backdrop-blur">
        <ToolbarButton editor={editor} title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton editor={editor} title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton editor={editor} title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </ToolbarButton>
        <ToolbarButton editor={editor} title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={15} />
        </ToolbarButton>
        {divider}
        <ToolbarButton
          editor={editor}
          title="Heading 1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          title="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          title="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={15} />
        </ToolbarButton>
        {divider}
        <ToolbarButton editor={editor} title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton editor={editor} title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton editor={editor} title="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <ListTodo size={15} />
        </ToolbarButton>
        {divider}
        <ToolbarButton editor={editor} title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton editor={editor} title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={15} />
        </ToolbarButton>
        {divider}
        <ToolbarButton editor={editor} title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton editor={editor} title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </ToolbarButton>
      </div>

      <div className="flex-1 cursor-text overflow-y-auto px-8 py-4" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
