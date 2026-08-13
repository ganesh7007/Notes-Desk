import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileInput, FileJson, FileText, Loader2, StickyNote } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export function ImportPage(): JSX.Element {
  const navigate = useNavigate()
  const toast = useAppStore((s) => s.toast)
  const [busy, setBusy] = useState(false)
  const [lastNote, setLastNote] = useState<string | null>(null)

  const doImport = async (): Promise<void> => {
    setBusy(true)
    try {
      const note = await window.api.importer.pick()
      if (note) {
        toast('Imported successfully', note.title || 'Untitled')
        setLastNote(note.id)
      }
    } catch (e) {
      toast('Import failed', e instanceof Error ? e.message : 'Unknown error', 'error')
    } finally {
      setBusy(false)
    }
  }

  const exportAll = async (format: 'markdown' | 'json' | 'txt'): Promise<void> => {
    const path = await window.api.exporter.all(format)
    if (path) toast('Export complete', path)
  }

  const formats = [
    { ext: 'TXT', label: 'Plain text', icon: <FileText size={20} /> },
    { ext: 'MD', label: 'Markdown', icon: <FileText size={20} /> },
    { ext: 'DOCX', label: 'Word document', icon: <FileText size={20} /> },
    { ext: 'PDF', label: 'PDF document', icon: <FileText size={20} /> },
    { ext: 'JSON', label: 'NotesApp JSON', icon: <FileJson size={20} /> }
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <FileInput size={22} className="text-app-accent" /> Import & Export
      </h1>

      <div className="rounded-2xl border border-app-border bg-app-surface p-5">
        <h3 className="text-sm font-semibold">Import notes</h3>
        <p className="mt-1 text-xs text-app-text-muted">
          Choose a file. NotesApp converts it into a searchable note. Markdown keeps its structure.
        </p>
        <button className="btn-primary mt-3 flex items-center gap-1.5 text-sm" onClick={() => void doImport()} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <FileInput size={15} />}
          {busy ? 'Importing…' : 'Choose file to import'}
        </button>
        <div className="mt-4 flex flex-wrap gap-2">
          {formats.map((f) => (
            <div key={f.ext} className="flex items-center gap-2 rounded-xl border border-app-border px-3 py-2 text-xs text-app-text-muted">
              {f.icon}
              <span>
                <b className="text-app-text">{f.ext}</b> — {f.label}
              </span>
            </div>
          ))}
        </div>
        {lastNote && (
          <button
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-app-accent"
            onClick={() => navigate(`/notes/${lastNote}`)}
          >
            <StickyNote size={13} /> Open the imported note
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-app-border bg-app-surface p-5">
        <h3 className="text-sm font-semibold">Export everything</h3>
        <p className="mt-1 text-xs text-app-text-muted">
          Export all notes at once. Individual notes can be exported from their note menu or the editor.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={() => void exportAll('markdown')}>
            <Download size={14} /> As Markdown
          </button>
          <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={() => void exportAll('json')}>
            <Download size={14} /> As JSON
          </button>
          <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={() => void exportAll('txt')}>
            <Download size={14} /> As plain text
          </button>
        </div>
      </div>
    </div>
  )
}
