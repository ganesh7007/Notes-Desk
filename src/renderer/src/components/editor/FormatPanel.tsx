import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Editor } from '@tiptap/react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Strikethrough,
  Type,
  Underline as UnderlineIcon
} from 'lucide-react'
import { cx } from '@/lib/utils'

interface FormatPanelProps {
  editor: Editor
  onClose: () => void
}

interface StyleChain {
  setFontFamily: (v: string) => { focus: () => { run: () => void } }
  unsetFontFamily: () => { focus: () => { run: () => void } }
  setFontSize: (n: number) => { focus: () => { run: () => void } }
  unsetFontSize: () => { focus: () => { run: () => void } }
}

export function FormatPanel({ editor, onClose: _onClose }: FormatPanelProps): JSX.Element {
  const [active, setActive] = useState<string>('text')

  const btn = (isActive = false): string =>
    cx(
      'flex h-9 w-9 items-center justify-center rounded-lg transition',
      isActive ? 'bg-app-accent/18 text-app-accent' : 'text-app-text-muted hover:bg-app-surface-2 hover:text-app-text'
    )

  const textControls = (
    <div className="flex flex-wrap items-center gap-1">
      <button className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
        <Bold size={16} />
      </button>
      <button className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
        <Italic size={16} />
      </button>
      <button className={btn(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <UnderlineIcon size={16} />
      </button>
      <button className={btn(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <Strikethrough size={16} />
      </button>
      <button
        className={btn(editor.isActive('highlight'))}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight"
      >
        <Highlighter size={16} />
      </button>
      <button className={btn(editor.isActive('code'))} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">
        <Code size={16} />
      </button>
      <div className="mx-1 h-6 w-px bg-app-border" />
      <button className={btn(editor.isActive('heading', { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
        <Heading1 size={16} />
      </button>
      <button className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        <Heading2 size={16} />
      </button>
      <button className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
        <Heading3 size={16} />
      </button>
      <button className={btn(editor.isActive('paragraph'))} onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph">
        <Pilcrow size={16} />
      </button>
      <div className="mx-1 h-6 w-px bg-app-border" />
      <button className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
        <List size={16} />
      </button>
      <button className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
        <ListOrdered size={16} />
      </button>
      <button className={btn(editor.isActive('taskList'))} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checklist">
        <CheckSquare size={16} />
      </button>
      <button className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
        <Quote size={16} />
      </button>
      <div className="mx-1 h-6 w-px bg-app-border" />
      <button className={btn(editor.isActive({ textAlign: 'left' }))} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left">
        <AlignLeft size={16} />
      </button>
      <button className={btn(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center">
        <AlignCenter size={16} />
      </button>
      <button className={btn(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right">
        <AlignRight size={16} />
      </button>
    </div>
  )

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-14 left-1/2 z-40 w-[min(680px,92vw)] -translate-x-1/2"
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.14 }}
      >
        <div className="glass rounded-2xl border border-app-border p-2.5 shadow-card">
          <div className="mb-2 flex gap-1">
            {[
              { key: 'text', label: 'Text', icon: <Type size={13} /> },
              { key: 'style', label: 'Style & color', icon: <Highlighter size={13} /> },
              { key: 'link', label: 'Link', icon: <LinkIcon size={13} /> }
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cx(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                  active === t.key ? 'bg-app-accent/15 text-app-accent' : 'text-app-text-muted hover:text-app-text'
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {active === 'text' && textControls}

          {active === 'style' && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-app-text-muted">Text color</span>
                {COLORS.map((c) => (
                  <button key={c} onClick={() => editor.chain().focus().setColor(c).run()} className="h-6 w-6 rounded-full transition hover:scale-110" style={{ background: c }} />
                ))}
                <button onClick={() => editor.chain().focus().unsetColor().run()} className="rounded-lg border border-app-border px-2 py-1 text-[10px] text-app-text-muted">
                  Reset
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-app-text-muted">Background</span>
                {BG_COLORS.map((c) => (
                  <button key={c.hex} onClick={() => editor.chain().focus().toggleHighlight({ color: c.hex }).run()} className="h-6 w-6 rounded-full transition hover:scale-110" style={{ background: c.hex }} />
                ))}
                <button onClick={() => editor.chain().focus().unsetHighlight().run()} className="rounded-lg border border-app-border px-2 py-1 text-[10px] text-app-text-muted">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-app-text-muted">Font family</span>
                <select
                  className="input-base !w-44 !py-1.5 text-xs"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value
                    const chain = editor.chain() as unknown as StyleChain
                    if (v) chain.setFontFamily(v).focus().run()
                    else chain.unsetFontFamily().focus().run()
                  }}
                >
                  <option value="">Default</option>
                  <option value="Inter">Inter</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Courier New">Courier New</option>
                </select>
                <span className="text-xs text-app-text-muted">Size</span>
                <select
                  className="input-base !w-24 !py-1.5 text-xs"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value
                    const chain = editor.chain() as unknown as StyleChain
                    if (v) chain.setFontSize(Number(v)).focus().run()
                    else chain.unsetFontSize().focus().run()
                  }}
                >
                  <option value="">Default</option>
                  {[12, 14, 16, 18, 20, 24, 28, 32].map((s) => (
                    <option key={s} value={s}>{s}px</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {active === 'link' && (
            <LinkControls editor={editor} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#ffffff', '#0f172a']
const BG_COLORS = [
  { hex: '#fef08a', name: 'Yellow' },
  { hex: '#bbf7d0', name: 'Green' },
  { hex: '#bae6fd', name: 'Blue' },
  { hex: '#fbcfe8', name: 'Pink' },
  { hex: '#e9d5ff', name: 'Purple' }
]

function LinkControls({ editor }: { editor: Editor }): JSX.Element {
  const [url, setUrl] = useState('')
  const current = (editor.getAttributes('link').href as string) ?? ''
  const apply = (): void => {
    const raw = url.trim()
    if (!raw) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      const href = /^https?:\/\//.test(raw) ? raw : `https://${raw}`
      if (editor.state.selection.empty) {
        // No selection: insert the URL itself as a clickable link.
        const label = raw.replace(/^https?:\/\//, '')
        editor
          .chain()
          .focus()
          .insertContent({ type: 'text', text: label, marks: [{ type: 'link', attrs: { href } }] })
          .run()
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
      }
    }
    setUrl('')
  }
  return (
    <div className="flex items-center gap-2">
      <input
        className="input-base !py-2 text-xs"
        placeholder="https://example.com"
        defaultValue={current}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
      />
      <button className="btn-primary whitespace-nowrap text-xs" onClick={apply}>
        {current ? 'Update' : 'Add link'}
      </button>
      <button className="btn-ghost text-xs" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}>
        Remove
      </button>
    </div>
  )
}

export function ToolbarDivider(): JSX.Element {
  return <div className="mx-0.5 h-6 w-px bg-app-border" />
}
