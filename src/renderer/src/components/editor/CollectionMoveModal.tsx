import { useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import type { Collection } from '@shared/types'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'
import { cx } from '@/lib/utils'

interface CollectionMoveModalProps {
  open: boolean
  noteIds: string[]
  currentCollectionId?: string | null
  onClose: () => void
  onDone: () => void
}

export function CollectionMoveModal({ open, noteIds, currentCollectionId, onClose, onDone }: CollectionMoveModalProps): JSX.Element {
  const collections = useAppStore((s) => s.collections)
  const refreshCollections = useAppStore((s) => s.refreshCollections)
  const toast = useAppStore((s) => s.toast)
  const [busy, setBusy] = useState(false)
  const [newCollection, setNewCollection] = useState('')

  useEffect(() => {
    if (open) setNewCollection('')
  }, [open])

  const move = async (target: string | null): Promise<void> => {
    setBusy(true)
    try {
      await window.api.notes.move(noteIds, target)
      await refreshCollections()
      toast(noteIds.length === 1 ? 'Note moved' : `${noteIds.length} notes moved`)
      onDone()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const createAndMove = async (): Promise<void> => {
    const name = newCollection.trim()
    if (!name) return
    const c: Collection = await window.api.collections.create(name, '#8b5cf6', '📁')
    await refreshCollections()
    await move(c.id)
  }

  return (
    <Modal open={open} onClose={onClose} title={`Move ${noteIds.length === 1 ? 'note' : `${noteIds.length} notes`}`}>
      <div className="space-y-2">
        <button
          onClick={() => void move(null)}
          className={cx('flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition hover:bg-app-surface-2', currentCollectionId === null ? 'border-app-accent bg-app-accent/10' : 'border-app-border')}
        >
          <FolderOpen size={15} className="text-app-text-muted" />
          No collection
        </button>
        {collections.map((c) => (
          <button
            key={c.id}
            onClick={() => void move(c.id)}
            className={cx(
              'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition hover:bg-app-surface-2',
              currentCollectionId === c.id ? 'border-app-accent bg-app-accent/10' : 'border-app-border'
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm" style={{ background: `${c.color}22` }}>
              {c.icon}
            </span>
            <span className="flex-1 truncate text-left">{c.name}</span>
          </button>
        ))}

        <div className="pt-2">
          <div className="flex gap-2">
            <input className="input-base !py-2 text-sm" placeholder="New collection name…" value={newCollection} onChange={(e) => setNewCollection(e.target.value)} />
            <button className="btn-primary whitespace-nowrap text-sm" onClick={() => void createAndMove()} disabled={!newCollection.trim() || busy}>
              Create
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
