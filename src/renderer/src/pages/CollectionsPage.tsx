import { useEffect, useState } from 'react'
import { FolderHeart } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { CollectionCard } from '@/components/collection/CollectionCard'
import { CollectionModal, type CollectionModalState } from '@/components/collection/CollectionModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAppStore } from '@/store/appStore'

export function CollectionsPage(): JSX.Element {
  const collections = useAppStore((s) => s.collections)
  const refresh = useAppStore((s) => s.refreshCollections)
  const [editState, setEditState] = useState<CollectionModalState>({ open: false })
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleDrop = (targetIndex: number): void => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const next = [...collections]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    void window.api.collections.reorder(next.map((c) => c.id))
    void refresh()
    setDragIndex(null)
  }

  if (collections.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={<FolderHeart size={28} />}
          title="No collections yet"
          subtitle="Organize your notes into collections like Cyber Security, Projects, Ideas and more."
          action={
            <button className="btn-primary" onClick={() => setEditState({ open: true })}>
              Create collection
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
        <button className="btn-primary text-sm" onClick={() => setEditState({ open: true })}>
          New collection
        </button>
      </div>
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
          {collections.map((c, i) => (
            <motion.div
              key={c.id}
              layout
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              className={dragIndex === i ? 'opacity-40' : ''}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <CollectionCard
                collection={c}
                onChanged={() => undefined}
                onEdit={(col) => setEditState({ open: true, collection: col })}
              />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
      <p className="mt-4 text-center text-[11px] text-app-text-muted">Drag collections to reorder them</p>

      <CollectionModal
        state={editState}
        onClose={() => setEditState({ open: false })}
        onSaved={() => void refresh()}
      />
    </div>
  )
}