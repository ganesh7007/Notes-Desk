import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Archive,
  Copy,
  FolderOpen,
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

export function NoteCard({ note, view, trashed, onChanged, compact }: NoteCardProps): JSX.Element {
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
      {note.isPinned && <Pin size={13} className="fill-amber-400 text-amber-400" />}
      {note.isFavorite && <Star size={13} className="fill-yellow-400 text-yellow-400" />}
      {note.isLocked && <Lock size={13} className="text-app-accent" />}
      {note.hasImages && <ImageIcon size={13} className="text-app-text-muted" />}
    </div>
  )

  const renderFooter = (): JSX.Element => (
    <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-[11px] text-app-text-muted">
      <span className="truncate">{formatRelative(note.updatedAt)}</span>
      <span className="flex items-center gap-1 truncate">
        {note.collectionName && (
          <>
            <FolderOpen size={11} className="shrink-0" />
            <span className="truncate">{note.collectionName}</span>
          </>
        )}
      </span>
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
        <Menu trigger={<MoreVerticalBtn />} items={items} />
      </div>
    )
  }

  const isCard = view === 'card'
  const bgStyle = { background: 'linear-gradient(180deg, var(--note-tint), transparent 70%)' }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.16 }}
      onClick={open}
      className={cx(
        'tip-card group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface p-4',
        `note-color-${note.color}`,
        isCard && 'min-h-[180px]',
        !isCard && 'min-h-[150px]'
      )}
      style={bgStyle}
      onContextMenu={(e) => {
        e.preventDefault()
      }}
    >
      {compact && <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-inner" />}
      <div className="flex items-start justify-between gap-2">
        <h3 className={cx('line-clamp-2 font-semibold leading-snug', isCard ? 'text-lg' : 'text-[15px]')}>
          {note.title || 'Untitled note'}
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          {renderIndicators()}
          <div onClick={(e) => e.stopPropagation()}>
            <Menu trigger={<MoreVerticalBtn small />} items={items} />
          </div>
        </div>
      </div>
      {note.checklistTotal > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="progress-bar flex-1">
            <span style={{ width: `${(note.checklistDone / note.checklistTotal) * 100}%` }} />
          </div>
          <span className="text-[10px] text-app-text-muted">
            {Math.round((note.checklistDone / note.checklistTotal) * 100)}%
          </span>
        </div>
      )}
      <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-app-text-muted">{preview}</p>
      {note.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-md bg-app-accent/12 px-1.5 py-0.5 text-[10px] text-app-accent">
              #{t}
            </span>
          ))}
        </div>
      )}
      {renderFooter()}

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
