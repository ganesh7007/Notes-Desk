import { useCallback, useEffect, useState } from 'react'
import {
  DatabaseBackup,
  Download,
  FileArchive,
  FolderOpen,
  RefreshCcw,
  Trash2,
  Upload
} from 'lucide-react'
import type { BackupInfo } from '@shared/types'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAppStore } from '@/store/appStore'
import { formatDateTime, formatBytes } from '@/lib/utils'
import { Toggle } from './SettingsPage'

export function BackupPage(): JSX.Element {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [busy, setBusy] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState<BackupInfo | null>(null)
  const settings = useAppStore((s) => s.settings)
  const update = useAppStore((s) => s.updateSettings)
  const toast = useAppStore((s) => s.toast)

  const load = useCallback(async () => {
    setBackups(await window.api.backup.list())
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createBackup = async (): Promise<void> => {
    setBusy(true)
    try {
      const { size } = await window.api.backup.create('manual')
      toast('Backup created', formatBytes(size))
      void load()
    } finally {
      setBusy(false)
    }
  }

  const restore = async (b: BackupInfo): Promise<void> => {
    setBusy(true)
    try {
      await window.api.backup.restore(b.id)
      toast('Backup restored successfully')
      setConfirmRestore(null)
    } catch {
      toast('Restore failed', 'The backup file may be corrupted', 'error')
    } finally {
      setBusy(false)
      void load()
    }
  }

  const restoreFromFile = async (): Promise<void> => {
    setBusy(true)
    try {
      const path = await window.api.backup.restoreFromFile()
      if (path) toast('Backup restored successfully')
      void load()
    } catch {
      toast('Restore failed', undefined, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <DatabaseBackup size={22} className="text-app-accent" /> Backup & Restore
      </h1>

      <div className="rounded-2xl border border-app-border bg-app-surface p-5">
        <h3 className="text-sm font-semibold">Create a backup</h3>
        <p className="mt-1 text-xs text-app-text-muted">
          A backup includes your database, notes, images, audio and attachments as a single ZIP file.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => void createBackup()} disabled={busy}>
            <Upload size={15} /> {busy ? 'Working…' : 'Back up now'}
          </button>
          <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={() => void restoreFromFile()} disabled={busy}>
            <Download size={15} /> Restore from file…
          </button>
          <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={() => void window.api.backup.openFolder()}>
            <FolderOpen size={15} /> Open backups folder
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-app-border bg-app-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Automatic backups</h3>
            <p className="mt-1 text-xs text-app-text-muted">NotesApp periodically saves backups for you.</p>
          </div>
          <Toggle checked={settings?.autoBackup ?? false} onChange={(v) => void update({ autoBackup: v })} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-app-text-muted">Backup interval</span>
          <select
            className="input-base !w-44 !py-1.5"
            disabled={!settings?.autoBackup}
            value={settings?.autoBackupInterval ?? 1440}
            onChange={(e) => void update({ autoBackupInterval: Number(e.target.value) })}
          >
            <option value={60}>Every hour</option>
            <option value={720}>Every 12 hours</option>
            <option value={1440}>Daily</option>
            <option value={10080}>Weekly</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <FileArchive size={15} className="text-app-accent" /> Backup history
        </h3>
        {backups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-app-border p-8 text-center text-sm text-app-text-muted">
            No backups yet. Create your first backup to protect your notes.
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-accent/12 text-app-accent">
                  <FileArchive size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {b.path.split(/[\\/]/).pop()}
                  </div>
                  <div className="text-[11px] text-app-text-muted">
                    {formatDateTime(b.createdAt)} • {formatBytes(b.size)} • {b.kind === 'automatic' ? 'Automatic' : 'Manual'}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmRestore(b)}
                  className="flex items-center gap-1.5 rounded-xl border border-app-border px-3 py-1.5 text-xs font-medium text-app-accent transition hover:bg-app-accent/10"
                >
                  <RefreshCcw size={13} /> Restore
                </button>
                <button
                  onClick={async () => {
                    await window.api.backup.remove(b.id)
                    void load()
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-app-text-muted transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmRestore !== null}
        title="Restore this backup?"
        message="Restoring will replace all current notes, collections and files with the backup contents. This cannot be undone."
        confirmLabel="Restore"
        onCancel={() => setConfirmRestore(null)}
        onConfirm={() => confirmRestore && void restore(confirmRestore)}
      />
    </div>
  )
}
