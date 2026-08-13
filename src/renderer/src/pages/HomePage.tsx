import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Pin, Star, StickyNote } from 'lucide-react'
import type { Note } from '@shared/types'
import { NotesGrid } from '@/components/note/NotesGrid'
import { CollectionCard } from '@/components/collection/CollectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CollectionModal, type CollectionModalState } from '@/components/collection/CollectionModal'
import { useAppStore } from '@/store/appStore'

export function HomePage(): JSX.Element {
  const navigate = useNavigate()
  const collections = useAppStore((s) => s.collections)
  const refreshCollections = useAppStore((s) => s.refreshCollections)
  const [notes, setNotes] = useState<Note[]>([])
  const [pinned, setPinned] = useState<Note[]>([])
  const [favorites, setFavorites] = useState<Note[]>([])
  const [editState, setEditState] = useState<CollectionModalState>({ open: false })

  const load = useCallback(async () => {
    const [recent, pinnedList, favList] = await Promise.all([
      window.api.notes.list({ limit: 40 }),
      window.api.notes.list({ pinned: true, limit: 12 }),
      window.api.notes.list({ favorite: true, limit: 12 })
    ])
    setNotes(recent)
    setPinned(pinnedList)
    setFavorites(favList)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const greeting = (): string => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight"
        >
          {greeting()}
        </motion.h1>
        <p className="mt-1 text-sm text-app-text-muted">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {collections.length > 0 && (
        <section>
          <SectionHeader
            title="Collections"
            actionLabel="View all"
            onClick={() => navigate('/collections')}
          />
          <div className="scrollbar-none -mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2">
            {collections.map((c) => (
              <div key={c.id} className="w-[220px] shrink-0">
                <CollectionCard collection={c} onChanged={() => void load()} onEdit={(col) => setEditState({ open: true, collection: col })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {pinned.length > 0 && (
        <section>
          <SectionHeader title="Pinned" icon={<Pin size={16} className="text-amber-400" />} actionLabel="View all" onClick={() => navigate('/pinned')} />
          <div className="mt-3">
            <NotesGrid notes={pinned} view="grid" onChanged={() => void load()} />
          </div>
        </section>
      )}

      {favorites.length > 0 && (
        <section>
          <SectionHeader title="Favorites" icon={<Star size={16} className="text-yellow-400" />} actionLabel="View all" onClick={() => navigate('/favorites')} />
          <div className="mt-3">
            <NotesGrid notes={favorites} view="grid" onChanged={() => void load()} />
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Recent notes" icon={<StickyNote size={16} className="text-app-accent" />} actionLabel="View all" onClick={() => navigate('/notes')} />
        <div className="mt-3">
          {notes.length === 0 ? (
            <EmptyState
              icon={<StickyNote size={28} />}
              title="No notes yet"
              subtitle="Tap the + button to create your first note"
              action={
                <button className="btn-primary" onClick={() => navigate('/notes')}>
                  Start writing
                </button>
              }
            />
          ) : (
            <NotesGrid notes={notes} view="grid" onChanged={() => void load()} />
          )}
        </div>
      </section>

      <CollectionModal
        state={editState}
        onClose={() => setEditState({ open: false })}
        onSaved={() => {
          void load()
          void refreshCollections()
        }}
      />
    </div>
  )
}

function SectionHeader({ title, icon, actionLabel, onClick }: { title: string; icon?: JSX.Element; actionLabel: string; onClick: () => void }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
      <button onClick={onClick} className="flex items-center gap-1 text-xs font-medium text-app-accent transition hover:opacity-80">
        {actionLabel} <ArrowRight size={13} />
      </button>
    </div>
  )
}
