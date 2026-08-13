import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import extract from 'extract-zip'
import type { Archiver } from 'archiver'
import { dirs, DB_PATH, getDb, closeDb } from './db'
import { addBackupRecord, deleteBackupRecord, pruneBackups } from './repositories'

const requireFn = createRequire(__filename)
const archiver = requireFn('archiver') as (
  format: string,
  options?: Record<string, unknown>
) => Archiver

export async function createBackup(kind: 'manual' | 'automatic' = 'manual'): Promise<{ path: string; size: number }> {
  const db = getDb()
  db.persistNow()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `notesapp-backup-${stamp}.zip`
  const destPath = path.join(dirs.backups, fileName)

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(destPath)
    const archive = archiver('zip', { zlib: { level: 9 } })
    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.file(DB_PATH, { name: 'database/notes.db' })
    for (const sub of ['images', 'audio', 'attachments', 'drawings']) {
      archive.glob('**/*', { cwd: path.join(dirs.root, sub), dot: true })
      archive.append('', { name: `${sub}/.keep` })
    }
    archive.finalize()
  })

  const size = fs.statSync(destPath).size
  addBackupRecord(destPath, size, kind)
  pruneBackups(20)
  return { path: destPath, size }
}

async function rmrf(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) return
  await fs.promises.rm(dir, { recursive: true, force: true })
}

export async function restoreBackup(backupPath: string): Promise<void> {
  const tmp = path.join(dirs.root, '.restore-tmp')
  await rmrf(tmp)
  fs.mkdirSync(tmp, { recursive: true })
  await extract(backupPath, { dir: tmp })

  const db = getDb()
  db.close()
  closeDb()

  try {
    const srcDb = path.join(tmp, 'database', 'notes.db')
    if (fs.existsSync(srcDb)) {
      fs.copyFileSync(srcDb, DB_PATH)
    }
    for (const sub of ['images', 'audio', 'attachments', 'drawings']) {
      const src = path.join(tmp, sub)
      const dst = path.join(dirs.root, sub)
      await rmrf(dst)
      fs.mkdirSync(dst, { recursive: true })
      if (fs.existsSync(src)) {
        for (const entry of fs.readdirSync(src)) {
          fs.copyFileSync(path.join(src, entry), path.join(dst, entry))
        }
      }
    }
  } finally {
    await rmrf(tmp)
  }
}

export async function deleteBackup(id: string, filePath?: string): Promise<void> {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {
    /* ignore */
  }
  deleteBackupRecord(id)
}

export function autoBackupIfDue(): void {
  const db = getDb()
  const settings = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  const map: Record<string, string> = {}
  for (const row of settings) map[row.key] = row.value
  if (map.autoBackup !== 'true') return
  const intervalMin = Number(map.autoBackupInterval || 1440)
  const last = Number(map.lastAutoBackup || 0)
  if (Date.now() - last >= intervalMin * 60 * 1000) {
    createBackup('automatic')
      .then(() => {
        getDb()
          .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
          .run('lastAutoBackup', String(Date.now()))
      })
      .catch(() => undefined)
  }
}

export function getBackupDir(): string {
  return dirs.backups
}

export function getAppDataPath(): string {
  return dirs.root
}
