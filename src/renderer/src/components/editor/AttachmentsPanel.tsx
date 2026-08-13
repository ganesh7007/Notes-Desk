import { useCallback, useEffect, useState } from 'react'
import { File, FilePlus, Image as ImageIcon, Mic, Music, Paperclip, Play, Trash2, X } from 'lucide-react'
import type { Attachment, AttachmentKind } from '@shared/types'
import { Modal } from '@/components/ui/Modal'
import { VoiceRecorderModal } from './VoiceRecorder'
import { useAppStore } from '@/store/appStore'
import { formatBytes, formatDate } from '@/lib/utils'

interface AttachmentsPanelProps {
  open: boolean
  noteId: string
  onClose: () => void
  onInsertImage: (src: string) => void
}

export function AttachmentsPanel({ open, noteId, onClose, onInsertImage: _onInsertImage }: AttachmentsPanelProps): JSX.Element {
  const toast = useAppStore((s) => s.toast)
  const [items, setItems] = useState<Attachment[]>([])
  const [recordOpen, setRecordOpen] = useState(false)

  const load = useCallback(async () => {
    if (!open) return
    setItems(await window.api.attachments.list(noteId))
  }, [open, noteId])

  useEffect(() => {
    void load()
  }, [load])

  const attachImage = async (): Promise<void> => {
    const files = await window.api.media.pick('image')
    if (!files?.length) return
    for (const f of files) {
      await window.api.media.attach(noteId, f, 'image')
    }
    toast(`${files.length} image(s) attached`)
    void load()
  }

  const attachFile = async (): Promise<void> => {
    const files = await window.api.media.pick('attachment')
    if (!files?.length) return
    for (const f of files) {
      const kind: AttachmentKind = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f) ? 'image' : 'attachment'
      await window.api.media.attach(noteId, f, kind)
    }
    toast(`${files.length} file(s) attached`)
    void load()
  }

  const remove = async (id: string): Promise<void> => {
    await window.api.attachments.remove(id)
    void load()
  }

  const insertAttachment = async (att: Attachment): Promise<void> => {
    const dataUrl = await window.api.media.readDataUrl(att.path)
    if (!dataUrl) {
      toast('Could not read file', undefined, 'error')
      return
    }
    if (att.kind === 'image') {
      window.dispatchEvent(new CustomEvent('notesapp:insertImage', { detail: { src: att.path } }))
    } else {
      toast('Inserting non-image attachments as link is not supported yet', 'The file stays available in attachments', 'info')
    }
  }

  const iconFor = (kind: AttachmentKind): JSX.Element => {
    if (kind === 'image') return <ImageIcon size={16} />
    if (kind === 'recording') return <Mic size={16} />
    if (kind === 'audio') return <Music size={16} />
    return <Paperclip size={16} />
  }

  return (
    <Modal open={open} onClose={onClose} title="Attachments" maxWidth="max-w-lg">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost flex items-center gap-1.5 text-xs" onClick={() => void attachImage()}>
            <ImageIcon size={14} /> Images…
          </button>
          <button className="btn-ghost flex items-center gap-1.5 text-xs" onClick={() => void attachFile()}>
            <FilePlus size={14} /> Any file…
          </button>
          <button className="btn-ghost flex items-center gap-1.5 text-xs" onClick={() => setRecordOpen(true)}>
            <Mic size={14} /> Record voice…
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-app-border p-8 text-center text-sm text-app-text-muted">
            No attachments yet.
          </div>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto">
            {items.map((att) => (
              <div key={att.id} className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface-2 px-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-accent/12 text-app-accent">
                  {iconFor(att.kind)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{att.name}</div>
                  <div className="text-[11px] text-app-text-muted">
                    {formatBytes(att.size)} • {formatDate(att.createdAt)}
                  </div>
                </div>
                {att.kind === 'image' && (
                  <button onClick={() => void insertAttachment(att)} className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted transition hover:bg-app-surface hover:text-app-text" title="Insert into note">
                    <Play size={13} />
                  </button>
                )}
                <button onClick={() => void window.api.shell.showItem(att.path)} className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted transition hover:bg-app-surface hover:text-app-text" title="Show in folder">
                  <File size={13} />
                </button>
                <button onClick={() => void remove(att.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted transition hover:bg-red-500/10 hover:text-red-400" title="Remove">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {items.some((a) => a.ocrText) && (
          <div className="rounded-xl bg-app-surface-2 p-3 text-xs text-app-text-muted">
            <span className="font-semibold text-app-text">Tip:</span> OCR text from images is searchable. Run OCR from the image toolbar to make it findable.
          </div>
        )}
      </div>

      <VoiceRecorderModal open={recordOpen} noteId={noteId} onClose={() => setRecordOpen(false)} onTranscript={() => void load()} />
    </Modal>
  )
}

export function CloseBtn(): JSX.Element {
  return <X size={16} />
}