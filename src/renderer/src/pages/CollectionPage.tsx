import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FolderHeart, LayoutGrid, LayoutList, MoreVertical, Pencil, Plus, StickyNote } from 'lucide-react'
import type { Collection, Note } from '@shared/types'
import { NotesGrid, type NoteView } from '@/components/note/NotesGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { CollectionModal, type CollectionModalState } from '@/components/collection/CollectionModal'
import { Menu } from '@/components/ui/Menu'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useAppStore } from '@/store/appStore'

export function CollectionPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const collections = useAppStore((s) => s.collections)
  const refreshCollections = useAppStore((s) => s.refreshCollections)
  const [notes, setNotes] = useState<Note[]>([])
  const [view, setView] = useState<NoteView>('grid')
  const [editState, setEditState] = useState<CollectionModalState>({ open: false })

  const collection: Collection | undefined = collections.find((c) => c.id === id)

  const load = useCallback(async () => {
    if (!id) return
    const list = await window.api.notes.list({ collectionId: id })
    setNotes(list)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const createNote = async (): Promise<void> => {
    if (!id) return
    const note = await window.api.notes.create({ collectionId: id })
    navigate(`/notes/${note.id}`)
  }

  if (!collection) {
    return (
      <EmptyState
        icon={<FolderHeart size={28} />}
        title="Collection not found"
        action={
          <button className="btn-ghost" onClick={() => navigate('/collections')}>
            Back to collections
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/collections')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border text-app-text-muted transition hover:text-app-text"
        >
          <ArrowLeft size={17} />
        </button>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl shadow-glow"
          style={{ background: `linear-gradient(135deg, ${collection.color}, color-mix(in srgb, ${collection.color} 55%, #000))` }}
        >
          {collection.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{collection.name}</h1>
          <p className="text-xs text-app-text-muted">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </p>
        </div>
        <button onClick={createNote} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} /> New note
        </button>
        <Menu
          trigger={
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border text-app-text-muted transition hover:text-app-text">
              <MoreVertical size={17} />
            </button>
          }
          items={[
            { label: 'Edit collection', icon: <Pencil size={15} />, onClick: () => setEditState({ open: true, collection }) }
          ]}
        />
        <SegmentedControl
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'grid', label: '', icon: <LayoutGrid size={15} /> },
            { value: 'card', label: '', icon: <StickyNote size={15} /> },
            { value: 'list', label: '', icon: <LayoutList size={15} /> }
          ]}
        />
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={28} />}
          title="No notes in this collection"
          subtitle="Add a note to this collection, or move existing notes here."
          action={
            <button className="btn-primary" onClick={createNote}>
              Create note
            </button>
          }
        />
      ) : (
        <NotesGrid notes={notes} view={view} onChanged={() => void load()} />
      )}

      <CollectionModal
        state={editState}
        onClose={() => setEditState({ open: false })}
        onSaved={() => {
          void refreshCollections()
          void load()
        }}
      />
    </div>
  )
}