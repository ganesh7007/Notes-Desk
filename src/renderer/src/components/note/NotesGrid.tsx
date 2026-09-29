import { NoteCard, type NoteView } from './NoteCard'
import type { Note } from '@shared/types'
import { cx } from '@/lib/utils'

export type { NoteView }

interface NotesGridProps {
  notes: Note[]
  view: NoteView
  trashed?: boolean
  onChanged?: () => void
  className?: string
}

const COLS: Record<Exclude<NoteView, 'list'>, string> = {
  grid: 'repeat(auto-fill, minmax(230px, 1fr))',
  card: 'repeat(auto-fill, minmax(260px, 1fr))'
}

export function NotesGrid({ notes, view, trashed, onChanged, className }: NotesGridProps): JSX.Element {
  if (!notes.length) return <></>

  if (view === 'list') {
    return (
      <div className={cx('flex flex-col gap-2', className)}>
        {notes.map((note) => (
          <div key={note.id} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 64px' }}>
            <NoteCard note={note} view="list" trashed={trashed} onChanged={onChanged} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cx('grid gap-3', className)}
      style={{ gridTemplateColumns: COLS[view], contentVisibility: notes.length > 200 ? 'auto' : undefined }}
    >
      {/* No per-card `content-visibility` here: `contain: paint` would clip the
          page-curl shadows the paper card casts below its own box. The grid
          container keeps its own containment for very long lists. */}
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} view={view} trashed={trashed} onChanged={onChanged} />
      ))}
    </div>
  )
}