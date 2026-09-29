import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Archive,
  ArrowRight,
  Copy,
  Image as ImageIcon,
  Lock,
  MoreVertical,
  Pin,
  PinOff,
  RotateCcw,
  Star,
  Trash2,
  Upload
} from 'lucide-react'
import { useState } from 'react'
import type { Note } from '@shared/types'
import { cx, formatRelative } from '@/lib/utils'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAppStore } from '@/store/appStore'

export type NoteView = 'grid' | 'card' | 'list'

interface NoteCardProps {
  note: Note
  view: NoteView
  trashed?: boolean
  onChanged?: () => void
  compact?: boolean
}

export function NoteCard({ note, view, trashed, onChanged }: NoteCardProps): JSX.Element {
  const navigate = useNavigate()
  const toast = useAppStore((s) => s.toast)
  const refreshCollections = useAppStore((s) => s.refreshCollections)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmPurge, setConfirmPurge] = useState(false)

  const preview = note.plainText || 'No additional text'

  const open = (): void => {
    if (note.isLocked) {
      navigate(`/notes/${note.id}?locked=1`)
    } else {
      navigate(`/notes/${note.id}`)
    }
  }

  const refresh = (): void => {
    onChanged?.()
    refreshCollections()
  }

  const toggleFavorite = async (): Promise<void> => {
    await window.api.notes.setFavorite(note.id, !note.isFavorite)
    toast(note.isFavorite ? 'Removed from favorites' : 'Added to favorites')
    refresh()
  }

  const items: MenuItem[] = trashed
    ? [
        {
          label: 'Restore',
          icon: <RotateCcw size={15} />,
          onClick: async () => {
            await window.api.notes.restore([note.id])
            toast('Note restored')
            refresh()
          }
        },
        { separator: true },
        {
          label: 'Delete permanently',
          icon: <Trash2 size={15} />,
          danger: true,
          onClick: () => setConfirmPurge(true)
        }
      ]
    : [
        {
          label: note.isPinned ? 'Unpin' : 'Pin to top',
          icon: note.isPinned ? <PinOff size={15} /> : <Pin size={15} />,
          onClick: async () => {
            await window.api.notes.setPinned(note.id, !note.isPinned)
            toast(note.isPinned ? 'Unpinned' : 'Pinned')
            refresh()
          }
        },
        {
          label: note.isFavorite ? 'Remove from favorites' : 'Add to favorites',
          icon: <Star size={15} />,
          onClick: async () => {
            await window.api.notes.setFavorite(note.id, !note.isFavorite)
            toast(note.isFavorite ? 'Removed from favorites' : 'Added to favorites')
            refresh()
          }
        },
        {
          label: note.isArchived ? 'Unarchive' : 'Archive',
          icon: <Archive size={15} />,
          onClick: async () => {
            await window.api.notes.setArchived(note.id, !note.isArchived)
            toast(note.isArchived ? 'Unarchived' : 'Archived')
            refresh()
          }
        },
        { separator: true },
        {
          label: 'Duplicate note',
          icon: <Copy size={15} />,
          onClick: async () => {
            const copy = await window.api.notes.duplicate(note.id)
            if (copy) {
              toast('Note duplicated')
              refresh()
            }
          }
        },
        {
          label: 'Export…',
          icon: <Upload size={15} />,
          onClick: async () => {
            const path = await window.api.exporter.note(note.id, 'markdown')
            if (path) toast('Exported', path)
          }
        },
        { separator: true },
        {
          label: 'Delete',
          icon: <Trash2 size={15} />,
          danger: true,
          onClick: () => setConfirmDelete(true)
        }
      ]

  const renderIndicators = (): JSX.Element => (
    <div className="flex items-center gap-1.5">
      {note.isPinned && <Pin size={12} className="fill-amber-400 text-amber-400" />}
      {note.isFavorite && <Star size={12} className="fill-yellow-400 text-yellow-400" />}
      {note.isLocked && <Lock size={12} className="text-app-accent" />}
      {note.hasImages && <ImageIcon size={12} className="text-app-text-muted" />}
    </div>
  )

  if (view === 'list') {
    return (
      <div
        onClick={open}
        className="group flex cursor-pointer items-center gap-4 rounded-xl border border-app-border bg-app-surface px-4 py-3 transition hover:border-app-accent/40 hover:bg-app-surface-2"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{note.title || 'Untitled note'}</span>
            {renderIndicators()}
          </div>
          <div className="mt-0.5 truncate text-xs text-app-text-muted">{preview}</div>
        </div>
        <div className="hidden shrink-0 text-[11px] text-app-text-muted sm:block">{formatRelative(note.updatedAt)}</div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            open()
          }}
          title="Open note"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-app-text-muted transition hover:bg-app-accent/15 hover:text-app-accent"
        >
          <ArrowRight size={15} />
        </button>
        <Menu trigger={<MoreVerticalBtn />} items={items} />
      </div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.16 }}
      onClick={open}
      className="pcard group relative flex cursor-pointer flex-col"
      onContextMenu={(e) => {
        e.preventDefault()
      }}
    >
      {/* the sheet itself — see .pcard .pcard-paper in index.css for why the
          paper is a separate layer from the curl shadows on .pcard */}
      <div className="pcard-paper">
        <span className="pcard-margin" aria-hidden />

        <div className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
          <Menu trigger={<DismissBtn />} items={items} />
        </div>

        <div className="pcard-body">
          <div className="pcard-title">
            <span className="pcard-title-text">{note.title || 'Untitled note'}</span>
            {(note.isPinned || note.isFavorite || note.isLocked || note.hasImages) && (
              <span className="pcard-flags">
                {note.isPinned && <Pin size={11} className="fill-amber-500 text-amber-600" />}
                {note.isFavorite && <Star size={11} className="fill-yellow-500 text-yellow-600" />}
                {note.isLocked && <Lock size={11} />}
                {note.hasImages && <ImageIcon size={11} />}
              </span>
            )}
          </div>
          <p className="pcard-text">{preview}</p>
        </div>

        {note.tags.length > 0 && (
          <div className="pcard-tags">
            {note.tags.slice(0, 3).map((t) => (
              <span key={t} className="pcard-tag">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="pcard-foot">
          <div className="pcard-meta">
            <span className="pcard-meta-text">{note.collectionName || 'Unfiled'}</span>
            <span className="pcard-meta-sep">•</span>
            <span className="pcard-meta-text">{formatRelative(note.updatedAt)}</span>
            {note.checklistTotal > 0 && (
              <>
                <span className="pcard-meta-sep">•</span>
                <span className="pcard-meta-text">
                  {note.checklistDone}/{note.checklistTotal}
                </span>
              </>
            )}
          </div>

          <div className="pcard-tools">
            {!trashed && (
              <button
                className={cx('pcard-tool', note.isFavorite && 'is-on')}
                title={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                onClick={(e) => {
                  e.stopPropagation()
                  void toggleFavorite()
                }}
              >
                <Star size={13} className={note.isFavorite ? 'fill-current' : undefined} />
              </button>
            )}
            {/* small arrow: go into the note */}
            <button
              className="pcard-go"
              title="Open note"
              aria-label="Open note"
              onClick={(e) => {
                e.stopPropagation()
                open()
              }}
            >
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Move to trash?"
        message="The note will be moved to Trash. You can restore it from there within the retention period."
        confirmLabel="Move to trash"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await window.api.notes.softDelete([note.id])
          toast('Moved to trash')
          setConfirmDelete(false)
          refresh()
        }}
      />
      <ConfirmDialog
        open={confirmPurge}
        title="Delete forever?"
        message="This note and its attachments will be permanently deleted. This cannot be undone."
        confirmLabel="Delete forever"
        onCancel={() => setConfirmPurge(false)}
        onConfirm={async () => {
          await window.api.notes.purge([note.id])
          toast('Note permanently deleted')
          setConfirmPurge(false)
          refresh()
        }}
      />
    </motion.div>
  )
}

function MoreVerticalBtn({ small }: { small?: boolean }): JSX.Element {
  return (
    <button
      className={cx(
        'flex items-center justify-center rounded-lg text-app-text-muted opacity-0 transition hover:bg-app-surface-2 hover:text-app-text group-hover:opacity-100',
        small ? 'h-7 w-7' : 'h-8 w-8'
      )}
    >
      <MoreVertical size={16} />
    </button>
  )
}

function DismissBtn(): JSX.Element {
  return (
    <button type="button" className="pcard-dismiss" title="Note menu">
      ×
    </button>
  )
}
