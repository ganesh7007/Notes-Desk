import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Note } from '@shared/types'
import { NotesGrid } from '@/components/note/NotesGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAppStore } from '@/store/appStore'
import { pluralize } from '@/lib/utils'

export function TrashPage(): JSX.Element {
  const [notes, setNotes] = useState<Note[]>([])
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const toast = useAppStore((s) => s.toast)
  const settings = useAppStore((s) => s.settings)

  const load = useCallback(async () => {
    const list = await window.api.notes.list({ trashed: true })
    setNotes(list)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const emptyTrash = async (): Promise<void> => {
    await window.api.notes.emptyTrash()
    toast('Trash emptied')
    setConfirmEmpty(false)
    void load()
  }

  const purgeExpired = async (): Promise<void> => {
    const count = await window.api.notes.purgeExpired(settings?.trashDays ?? 30)
    if (count > 0) toast(`Auto-deleted ${pluralize(count, 'note')}`)
    void load()
  }

  useEffect(() => {
    void purgeExpired()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trash</h1>
          <p className="mt-0.5 text-xs text-app-text-muted">
            {pluralize(notes.length, 'note')} • Auto-deleted after {settings?.trashDays ?? 30} days
          </p>
        </div>
        {notes.length > 0 && (
          <button
            onClick={() => setConfirmEmpty(true)}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
          >
            <Trash2 size={15} /> Empty trash
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <EmptyState icon={<Trash2 size={28} />} title="Trash is empty" subtitle="Deleted notes will appear here." />
      ) : (
        <div className="space-y-1 text-xs text-app-text-muted">
          <NotesGrid notes={notes} view="grid" trashed onChanged={() => void load()} />
        </div>
      )}

      <ConfirmDialog
        open={confirmEmpty}
        title="Empty trash?"
        message={`${pluralize(notes.length, 'note')} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Empty trash"
        onCancel={() => setConfirmEmpty(false)}
        onConfirm={() => void emptyTrash()}
      />
    </div>
  )
}
