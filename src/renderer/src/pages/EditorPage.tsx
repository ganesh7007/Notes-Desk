import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckSquare,
  CloudDownload,
  CloudUpload,
  Code2,
  Copy,
  FilePlus2,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Lock,
  LockOpen,
  MapPin,
  Mic,
  Minus,
  MoreVertical,
  Paperclip,
  Pin,
  Redo2,
  ScanText,
  Smile,
  Star,
  StickyNote,
  Trash2,
  Undo2,
  Upload
} from 'lucide-react'
import type { Editor } from '@tiptap/react'
import type { Note, NoteColor, TipNode } from '@shared/types'
import { tiptapJsonToPlainText } from '@shared/converters'
import { buildExtensions } from '@/components/editor/extensions'
import { RendererImageExtension } from '@/components/editor/RendererImage'
import { FormatPanel } from '@/components/editor/FormatPanel'
import { ReminderModal } from '@/components/editor/ReminderModal'
import { LockModal } from '@/components/editor/LockModal'
import { UnlockModal } from '@/components/editor/UnlockModal'
import { CollectionMoveModal } from '@/components/editor/CollectionMoveModal'
import { OcrModal } from '@/components/editor/OcrModal'
import { VoiceRecorderModal } from '@/components/editor/VoiceRecorder'
import { DrawingModal } from '@/components/editor/DrawingModal'
import { ImageEditorModal } from '@/components/editor/ImageEditorModal'
import { AttachmentsPanel } from '@/components/editor/AttachmentsPanel'
import { Modal } from '@/components/ui/Modal'
import { Menu } from '@/components/ui/Menu'
import { TagInput } from '@/components/ui/TagInput'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAppStore } from '@/store/appStore'
import { cx, formatDateTime } from '@/lib/utils'

const EMOJIS = ['😀', '😂', '😍', '🤔', '😎', '🔥', '✨', '⭐', '❤️', '💡', '✅', '📌', '🎯', '🚀', '📚', '💼', '🔒', '📅', '📍', '👍', '🙏', '🎉']

export function EditorPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const settings = useAppStore((s) => s.settings)
  const refreshCollections = useAppStore((s) => s.refreshCollections)
  const toast = useAppStore((s) => s.toast)

  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle')
  const [showFormat, setShowFormat] = useState(false)
  const [checklist, setChecklist] = useState({ total: 0, done: 0 })

  const [reminderOpen, setReminderOpen] = useState(false)
  const [lockOpen, setLockOpen] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [ocrOpen, setOcrOpen] = useState(false)
  const [ocrSrc, setOcrSrc] = useState<string | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [drawOpen, setDrawOpen] = useState(false)
  const [annotateOpen, setAnnotateOpen] = useState(false)
  const [annotateSrc, setAnnotateSrc] = useState('')
  const [attachmentsOpen, setAttachmentsOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [allTags, setAllTags] = useState<string[]>([])
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [linkUrl, setLinkUrl] = useState('')
  const [unlockContent, setUnlockContent] = useState<{ content: string; plainText: string } | null>(null)

  const noteRef = useRef<Note | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: useMemo(() => {
      const base = buildExtensions(settings?.editorFont ?? 'Inter', settings?.editorFontSize ?? 17) as never[]
      const filtered = base.filter((ext) => {
        const name = (ext as { name?: string }).name
        return name !== 'image'
      })
      return [...filtered, RendererImageExtension]
    }, []),
    editorProps: {
      attributes: { class: 'tiptap focus:outline-none' },
      handlePaste: (_view, event) => handleClipboardPaste(event),
      handleDrop: (_view, event) => handleClipboardPaste(event)
    },
    onUpdate: ({ editor: ed }) => {
      setSaveState('dirty')
      scheduleSave()
      updateChecklist(ed)
    }
  })

  useEffect(() => {
    if (!id) return
    const paramsLocked = params.get('locked') === '1'
    void loadNote(id, paramsLocked)
    void window.api.tags.all().then(setAllTags)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const handlers: [string, (e: Event) => void][] = [
      ['notesapp:annotate', (e) => {
        const { src } = (e as CustomEvent<{ src: string }>).detail
        setAnnotateSrc(src)
        setAnnotateOpen(true)
      }],
      ['notesapp:ocr', (e) => {
        const { src } = (e as CustomEvent<{ src: string }>).detail
        setOcrSrc(src)
        setOcrOpen(true)
      }],
      ['notesapp:insertImage', (e) => {
        const { src } = (e as CustomEvent<{ src: string }>).detail
        insertImage(src)
      }],
      ['notesapp:insertText', (e) => {
        const { text } = (e as CustomEvent<{ text: string }>).detail
        insertText(text)
      }]
    ]
    for (const [name, handler] of handlers) window.addEventListener(name, handler)
    return () => {
      for (const [name, handler] of handlers) window.removeEventListener(name, handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  const loadNote = async (noteId: string, paramsLocked: boolean): Promise<void> => {
    let data = await window.api.notes.get(noteId)
    if (!data) {
      toast('Note not found', undefined, 'error')
      navigate('/notes')
      return
    }
    if (data.isLocked) {
      if (paramsLocked) {
        setUnlockOpen(true)
      } else {
        // still show lock screen
        setUnlockOpen(true)
      }
    } else {
      setUnlocked(true)
    }
    noteRef.current = data
    setNote(data)
    setTitle(data.title)
    setSubtitle(data.subtitle)
    if (editor && !data.isLocked) {
      editor.commands.setContent(parseContent(data.content))
    }
    setChecklist(countChecklist(data.content))
    setLoaded(true)
  }

  useEffect(() => {
    if (unlockContent && editor) {
      editor.commands.setContent(parseContent(unlockContent.content))
      setUnlocked(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockContent, editor])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const parseContent = (json: string): TipNode => {
    try {
      return JSON.parse(json || '{"type":"doc","content":[]}') as TipNode
    } catch {
      return { type: 'doc', content: [] }
    }
  }

  const countChecklist = (json: string): { total: number; done: number } => {
    let total = 0
    let done = 0
    const walk = (node: TipNode): void => {
      if (node.type === 'taskItem') {
        total++
        if (node.attrs?.checked) done++
      }
      if (node.content) node.content.forEach(walk)
    }
    try {
      walk(JSON.parse(json || '{}'))
    } catch {
      /* ignore */
    }
    return { total, done }
  }

  const updateChecklist = (ed: Editor): void => {
    setChecklist(countChecklist(JSON.stringify(ed.getJSON())))
  }

  const buildPayload = useCallback(() => {
    const json = editor ? editor.getJSON() : { type: 'doc', content: [] }
    const plain = editor ? tiptapJsonToPlainText(JSON.stringify(json)) : ''
    return {
      title,
      subtitle,
      content: JSON.stringify(json),
      plainText: plain,
      checklistTotal: checklist.total,
      checklistDone: checklist.done
    }
  }, [editor, title, subtitle, checklist])

  const scheduleSave = (): void => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const delay = settings?.autosave && settings.autosave > 0 ? settings.autosave * 1000 : 8000
    saveTimerRef.current = setTimeout(() => void doSave(), delay)
  }

  const doSave = async (): Promise<void> => {
    if (!id || !editor) return
    setSaveState('saving')
    try {
      const noteUpdated = await window.api.notes.update(id, buildPayload())
      if (noteUpdated) {
        noteRef.current = noteUpdated
        setNote(noteUpdated)
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 1500)
      }
    } catch {
      setSaveState('idle')
    }
  }

  const insertImage = (src: string): void => {
    editor?.chain().focus().setImage({ src }).run()
  }

  const insertText = (text: string): void => {
    editor?.chain().focus().insertContent(text).run()
  }

  const insertChecklist = (): void => {
    editor?.chain().focus().toggleTaskList().run()
  }

  const insertTable = (): void => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const insertCode = (): void => {
    editor?.chain().focus().toggleCodeBlock().run()
  }

  const insertRule = (): void => {
    editor?.chain().focus().setHorizontalRule().run()
  }

  const insertEmoji = (e: string): void => {
    editor?.chain().focus().insertContent(e).run()
    setEmojiOpen(false)
  }

  const insertDate = (): void => {
    const d = new Date()
    insertText(d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
  }

  const insertLink = (): void => {
    if (!linkUrl.trim()) return
    const href = /^https?:\/\//.test(linkUrl) ? linkUrl : `https://${linkUrl}`
    if (editor?.state.selection.empty) {
      // No selection: insert the URL itself as a clickable link.
      const label = linkUrl.replace(/^https?:\/\//, '')
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: label, marks: [{ type: 'link', attrs: { href } }] })
        .run()
    } else {
      editor?.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }
    setLinkUrl('')
    setLinkOpen(false)
  }

  const getLocation = (): void => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        insertText(`📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        toast('Location added')
      },
      () => toast('Location unavailable', undefined, 'error')
    )
  }

  const pickAndInsertImage = async (): Promise<void> => {
    const files = await window.api.media.pick('image')
    if (!files?.length) return
    for (const f of files) {
      const att = await window.api.media.attach(id!, f, 'image')
      insertImage(`appmedia://images/${att.name}`)
    }
  }

  const attachFile = async (): Promise<void> => {
    const files = await window.api.media.pick('attachment')
    if (!files?.length) return
    for (const f of files) {
      await window.api.media.attach(id!, f, 'attachment')
    }
    toast(`${files.length} file(s) attached`)
  }

  const handleClipboardPaste = (event: ClipboardEvent | DragEvent): boolean => {
    if (!editor) return false
    const files: File[] = []
    if (event instanceof ClipboardEvent && event.clipboardData) {
      files.push(...Array.from(event.clipboardData.files))
    }
    if (event instanceof DragEvent && event.dataTransfer) {
      files.push(...Array.from(event.dataTransfer.files))
    }
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) return false
    event.preventDefault()
    void (async () => {
      for (const file of imageFiles) {
        const buffer = await file.arrayBuffer()
        const saved = await window.api.media.save({ buffer, ext: file.type.split('/')[1] || 'png', kind: 'image', name: file.name })
        insertImage(`appmedia://${saved.rel}`)
      }
    })()
    return true
  }

  const capturePhoto = async (): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    const video = document.createElement('video')
    video.srcObject = stream
    await new Promise((resolve) => {
      video.onloadedmetadata = () => resolve(null)
    })
    await video.play()
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    stream.getTracks().forEach((t) => t.stop())
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (blob) {
      const buffer = await blob.arrayBuffer()
      const saved = await window.api.media.save({ buffer, ext: '.jpg', kind: 'image', name: `photo-${Date.now()}.jpg` })
      insertImage(`appmedia://${saved.rel}`)
      toast('Photo inserted')
    }
    setCameraOpen(false)
  }

  const togglePin = async (): Promise<void> => {
    if (!note) return
    const updated = await window.api.notes.setPinned(note.id, !note.isPinned)
    if (updated) setNote(updated)
    toast(updated?.isPinned ? 'Pinned' : 'Unpinned')
  }

  const toggleFav = async (): Promise<void> => {
    if (!note) return
    const updated = await window.api.notes.setFavorite(note.id, !note.isFavorite)
    if (updated) setNote(updated)
    toast(updated?.isFavorite ? 'Added to favorites' : 'Removed from favorites')
  }

  const toggleArchive = async (): Promise<void> => {
    if (!note) return
    const updated = await window.api.notes.setArchived(note.id, !note.isArchived)
    if (updated) setNote(updated)
    toast(updated?.isArchived ? 'Archived' : 'Unarchived')
  }

  const duplicate = async (): Promise<void> => {
    if (!note) return
    const copy = await window.api.notes.duplicate(note.id)
    if (copy) {
      toast('Note duplicated')
      navigate(`/notes/${copy.id}`)
    }
  }

  const exportNote = async (format: 'pdf' | 'markdown' | 'docx' | 'txt' | 'html' | 'json'): Promise<void> => {
    if (!id) return
    const path = await window.api.exporter.note(id, format)
    if (path) toast('Exported', path)
  }

  const deleteNote = async (): Promise<void> => {
    if (!id) return
    await window.api.notes.softDelete([id])
    toast('Note moved to trash')
    navigate('/notes')
  }

  const menuItems = [
    { label: note?.isPinned ? 'Unpin' : 'Pin to top', icon: <Pin size={15} />, onClick: () => void togglePin() },
    { label: note?.isFavorite ? 'Remove favorite' : 'Add to favorites', icon: <Star size={15} />, onClick: () => void toggleFav() },
    { label: note?.isArchived ? 'Unarchive' : 'Archive', icon: <CloudDownload size={15} />, onClick: () => void toggleArchive() },
    { separator: true },
    { label: 'Tags & color', icon: <StickyNote size={15} />, onClick: () => setTagsOpen(true) },
    { label: 'Move to collection…', icon: <FolderOpen size={15} />, onClick: () => setMoveOpen(true) },
    { label: 'Attachments', icon: <Paperclip size={15} />, onClick: () => setAttachmentsOpen(true) },
    { separator: true },
    { label: note?.isLocked ? 'Unlock permanently' : 'Lock note', icon: note?.isLocked ? <LockOpen size={15} /> : <Lock size={15} />, onClick: () => { if (note?.isLocked) setUnlockOpen(true); else setLockOpen(true) } },
    { label: note?.isLocked ? 'Change lock…' : 'Lock note', icon: <Lock size={15} />, onClick: () => setLockOpen(true) },
    { separator: true },
    { label: 'Duplicate', icon: <Copy size={15} />, onClick: () => void duplicate() },
    {
      label: 'Export…',
      icon: <Upload size={15} />,
      onClick: () => void exportNote('markdown')
    },
    { separator: true },
    { label: 'Delete', icon: <Trash2 size={15} />, danger: true, onClick: () => setConfirmDelete(true) }
  ]

  const saveLabel = saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'dirty' ? 'Unsaved changes' : ''

  if (!loaded || !editor) {
    return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-app-accent border-t-transparent" /></div>
  }

  return (
    <div className="flex h-screen flex-col">
      {/* top bar */}
      <div className="glass z-40 border-b border-app-border">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-1.5 px-4">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-muted transition hover:bg-app-surface-2 hover:text-app-text" title="Back">
            <ArrowLeft size={18} />
          </button>
          <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-muted transition hover:bg-app-surface-2 disabled:opacity-30" title="Undo">
            <Undo2 size={17} />
          </button>
          <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-muted transition hover:bg-app-surface-2 disabled:opacity-30" title="Redo">
            <Redo2 size={17} />
          </button>
          <button onClick={() => void doSave()} className="flex h-9 items-center gap-1.5 rounded-xl border border-app-border px-3 text-xs font-medium text-app-text-muted transition hover:text-app-text" title="Save (Ctrl+S)">
            <CloudUpload size={15} /> Save
          </button>
          <span className={cx('ml-1 hidden text-[11px] transition sm:block', saveState === 'saved' ? 'text-app-success' : saveState === 'dirty' ? 'text-app-warning' : 'text-app-text-muted')}>
            {saveLabel}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {note?.isPinned && <Pin size={14} className="fill-amber-400 text-amber-400" />}
            {note?.isFavorite && <Star size={14} className="fill-yellow-400 text-yellow-400" />}
            {note?.isLocked && <Lock size={14} className="text-app-accent" />}
            {note?.reminderAt && (
              <button onClick={() => setReminderOpen(true)} className="flex items-center gap-1 rounded-lg bg-app-accent/12 px-2 py-1 text-[10px] font-medium text-app-accent" title="Reminder set">
                <Bell size={12} /> {new Date(note.reminderAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </button>
            )}
            <button onClick={() => setReminderOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-muted transition hover:bg-app-surface-2 hover:text-app-text" title="Reminder">
              <Bell size={17} />
            </button>
            <Menu trigger={
              <button className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-muted transition hover:bg-app-surface-2 hover:text-app-text">
                <MoreVertical size={17} />
              </button>
            } items={menuItems} />
          </div>
        </div>
      </div>

      {/* editor */}
      <div className="relative flex-1 overflow-y-auto pb-32">
        {checklist.total > 0 && (
          <div className="mx-auto mt-3 flex max-w-3xl items-center gap-2 px-4">
            <div className="progress-bar flex-1"><span style={{ width: `${(checklist.done / checklist.total) * 100}%` }} /></div>
            <span className="text-[11px] text-app-text-muted">{Math.round((checklist.done / checklist.total) * 100)}% complete</span>
          </div>
        )}
        <div className="editor-shell mx-auto max-w-3xl px-5 pb-8 pt-5">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setSaveState('dirty')
            }}
            onBlur={() => void doSave()}
            onKeyDown={(e) => e.key === 'Enter' && editor.chain().focus().run()}
            placeholder="Title"
            className="w-full bg-transparent text-4xl font-bold leading-tight outline-none placeholder:text-app-text-muted/40"
            style={{ fontFamily: settings?.editorFont }}
          />
          <input
            value={subtitle}
            onChange={(e) => {
              setSubtitle(e.target.value)
              setSaveState('dirty')
            }}
            onBlur={() => void doSave()}
            placeholder="Subtitle"
            className="mt-1 w-full bg-transparent text-lg text-app-text-muted outline-none placeholder:text-app-text-muted/40"
          />
          <div className="mt-4 text-[11px] text-app-text-muted">{note ? formatDateTime(note.updatedAt) : ''}</div>
          <div className="mt-2" style={{ fontFamily: settings?.editorFont, fontSize: settings?.editorFontSize, lineHeight: settings?.lineHeight }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* bottom toolbar */}
      {!note?.isLocked || unlocked ? (
        <div className="glass fixed inset-x-0 bottom-0 z-40 border-t border-app-border">
          <div className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-3 py-2 no-scrollbar">
            <ToolButton title="Text" active={showFormat} onClick={() => setShowFormat((s) => !s)}><StickyNote size={17} /></ToolButton>
            <ToolButton title="Checklist" onClick={insertChecklist}><CheckSquare size={17} /></ToolButton>
            <ToolButton title="Table" onClick={insertTable}><FilePlus2 size={17} /></ToolButton>
            <ToolButton title="Image" onClick={() => void pickAndInsertImage()}><ImageIcon size={17} /></ToolButton>
            <ToolButton title="Camera" onClick={() => setCameraOpen(true)}><Camera size={17} /></ToolButton>
            <ToolButton title="Attach file" onClick={() => void attachFile()}><Paperclip size={17} /></ToolButton>
            <ToolButton title="Extract text (OCR)" onClick={() => setOcrOpen(true)}><ScanText size={17} /></ToolButton>
            <ToolButton title="Voice note" onClick={() => setVoiceOpen(true)}><Mic size={17} /></ToolButton>
            <ToolButton title="Drawing" onClick={() => setDrawOpen(true)}><CloudUpload size={17} /></ToolButton>
            <ToolButton title="Location" onClick={getLocation}><MapPin size={17} /></ToolButton>
            <ToolButton title="Reminder" onClick={() => setReminderOpen(true)}><Bell size={17} /></ToolButton>
            <ToolButton title="Code block" onClick={insertCode}><Code2 size={17} /></ToolButton>
            <ToolButton title="Horizontal line" onClick={insertRule}><Minus size={17} /></ToolButton>
            <ToolButton title="Emoji" active={emojiOpen} onClick={() => setEmojiOpen((s) => !s)}><Smile size={17} /></ToolButton>
            <ToolButton title="Link" onClick={() => setLinkOpen(true)}><Link2 size={17} /></ToolButton>
            <ToolButton title="Date" onClick={insertDate}><CloudDownload size={17} /></ToolButton>
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-app-border bg-app-bg/80 py-2 text-center text-xs text-app-text-muted">
          This note is locked. Unlock it to edit.
        </div>
      )}

      {/* overlays */}
      {showFormat && editor && <FormatPanel editor={editor} onClose={() => setShowFormat(false)} />}

      {emojiOpen && (
        <div className="fixed bottom-20 left-1/2 z-50 grid max-w-[340px] -translate-x-1/2 grid-cols-8 gap-0.5 rounded-2xl border border-app-border bg-app-surface p-2 shadow-card">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => insertEmoji(e)} className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:bg-app-surface-2">
              {e}
            </button>
          ))}
        </div>
      )}

      {linkOpen && (
        <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Insert link" maxWidth="max-w-sm">
          <div className="flex gap-2">
            <input autoFocus className="input-base text-sm" placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && insertLink()} />
            <button className="btn-primary text-sm" onClick={insertLink} disabled={!linkUrl.trim()}>Add</button>
          </div>
        </Modal>
      )}

      {cameraOpen && (
        <Modal open={cameraOpen} onClose={() => setCameraOpen(false)} title="Take a photo" maxWidth="max-w-sm">
          <button className="btn-primary w-full text-sm" onClick={() => void capturePhoto()}>Capture from webcam</button>
          <p className="mt-2 text-center text-xs text-app-text-muted">A single photo is captured and inserted into the note.</p>
        </Modal>
      )}

      <ReminderModal open={reminderOpen} noteId={id!} current={note?.reminderAt ?? null} onClose={() => setReminderOpen(false)} onSaved={() => void window.api.notes.get(id!).then((n) => n && setNote(n))} />
      <LockModal open={lockOpen} noteId={id!} alreadyLocked={Boolean(note?.isLocked)} onClose={() => setLockOpen(false)} onDone={() => void window.api.notes.get(id!).then((n) => { if (n) { setNote(n); editor.commands.setContent(parseContent(n.content)) } })} />
      <UnlockModal open={unlockOpen} title={note?.title || 'Locked note'} lockType={note?.lockType ?? null} onClose={() => { if (unlockOpen) { if (unlocked) setUnlockOpen(false); else navigate(-1) } }} onUnlocked={(c) => { setUnlockContent(c); setUnlockOpen(false) }} />
      <CollectionMoveModal open={moveOpen} noteIds={[id!]} currentCollectionId={note?.collectionId} onClose={() => setMoveOpen(false)} onDone={() => void window.api.notes.get(id!).then((n) => { if (n) { setNote(n); void refreshCollections() } })} />
      <OcrModal open={ocrOpen} noteId={id!} initialSrc={ocrSrc} onClose={() => setOcrOpen(false)} onInsertText={insertText} />
      <VoiceRecorderModal open={voiceOpen} noteId={id!} onClose={() => setVoiceOpen(false)} onTranscript={insertText} />
      <DrawingModal open={drawOpen} onClose={() => setDrawOpen(false)} onInsertImage={insertImage} />
      <ImageEditorModal open={annotateOpen} src={annotateSrc} onClose={() => setAnnotateOpen(false)} onSave={(src) => { if (editor) { editor.chain().focus().updateAttributes('image', { src }).run() } }} onOcr={(s) => { setOcrSrc(s); setOcrOpen(true) }} />
      <AttachmentsPanel open={attachmentsOpen} noteId={id!} onClose={() => setAttachmentsOpen(false)} onInsertImage={insertImage} />

      {tagsOpen && note && (
        <Modal open={tagsOpen} onClose={() => setTagsOpen(false)} title="Tags & color">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-app-text-muted">Tags</label>
              <TagInput tags={draftTags.length ? draftTags : note.tags} onChange={setDraftTags} suggestions={allTags} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-app-text-muted">Color label</label>
              <ColorPicker value={note.color} onChange={(c: NoteColor) => void window.api.notes.setColor(note.id, c).then((n) => n && setNote(n))} />
            </div>
            <button
              className="btn-primary w-full text-sm"
              onClick={async () => {
                const tags = draftTags.length ? draftTags : note.tags
                const updated = await window.api.notes.setTags(note.id, tags)
                if (updated) setNote(updated)
                setDraftTags([])
                setTagsOpen(false)
                toast('Tags updated')
              }}
            >
              Apply
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Move note to trash?"
        message="You can restore it from the Trash page."
        confirmLabel="Move to trash"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void deleteNote()}
      />
    </div>
  )
}

function ToolButton({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title: string; active?: boolean }): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cx(
        'flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl transition',
        active ? 'bg-app-accent/15 text-app-accent' : 'text-app-text-muted hover:bg-app-surface-2 hover:text-app-text'
      )}
    >
      {children}
    </button>
  )
}
