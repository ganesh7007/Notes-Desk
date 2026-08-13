import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hash, X } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAppStore } from '@/store/appStore'
import { pluralize } from '@/lib/utils'

export function TagsPage(): JSX.Element {
  const navigate = useNavigate()
  const toast = useAppStore((s) => s.toast)
  const [tags, setTags] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    const all = await window.api.tags.all()
    const notes = await window.api.notes.list()
    const counts: Record<string, number> = {}
    for (const tag of all) counts[tag] = 0
    for (const note of notes) {
      for (const tag of note.tags) {
        counts[tag] = (counts[tag] ?? 0) + 1
      }
    }
    setTags(counts)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const removeTag = async (tag: string): Promise<void> => {
    const notes = await window.api.notes.list()
    for (const note of notes) {
      if (note.tags.includes(tag)) {
        await window.api.notes.setTags(note.id, note.tags.filter((t) => t !== tag))
      }
    }
    toast(`Removed #${tag} from all notes`)
    void load()
  }

  const entries = Object.entries(tags).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Tags</h1>
      {entries.length === 0 ? (
        <EmptyState
          icon={<Hash size={28} />}
          title="No tags yet"
          subtitle="Add tags like #Cyber, #AI or #Project to your notes to organize them."
        />
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {entries.map(([tag, count]) => (
            <button
              key={tag}
              onClick={() => navigate(`/notes?tag=${encodeURIComponent(tag)}`)}
              className="group flex items-center gap-2 rounded-2xl border border-app-border bg-app-surface px-4 py-2.5 transition hover:border-app-accent/50"
            >
              <Hash size={15} className="text-app-accent" />
              <span className="text-sm font-medium">{tag}</span>
              <span className="rounded-md bg-app-surface-2 px-1.5 py-0.5 text-[11px] text-app-text-muted">
                {pluralize(count, 'note')}
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  void removeTag(tag)
                }}
                className="ml-1 hidden h-5 w-5 items-center justify-center rounded-md text-app-text-muted hover:bg-red-500/10 hover:text-red-400 group-hover:flex"
              >
                <X size={13} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
