import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'

const requireFn = createRequire(__filename)

// NOTESAPP_DATA_DIR lets tests (and advanced users) point the data directory
// elsewhere. Falls back to Electron's userData path in normal operation.
export const appDataDir = process.env['NOTESAPP_DATA_DIR'] ?? app.getPath('userData')

export function ensureDirs(): Record<string, string> {
  const dirs = {
    root: appDataDir,
    database: path.join(appDataDir, 'database'),
    images: path.join(appDataDir, 'images'),
    audio: path.join(appDataDir, 'audio'),
    attachments: path.join(appDataDir, 'attachments'),
    drawings: path.join(appDataDir, 'drawings'),
    exports: path.join(appDataDir, 'exports'),
    backups: path.join(appDataDir, 'backups'),
    settings: path.join(appDataDir, 'settings'),
    logs: path.join(appDataDir, 'logs'),
    tesseract: path.join(appDataDir, 'tesseract')
  }
  for (const dir of Object.values(dirs)) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }
  return dirs
}

export const dirs = ensureDirs()

export const DB_PATH = path.join(dirs.database, 'notes.db')

/* ------------------------------------------------------------------ */
/*  sql.js — SQLite compiled to WebAssembly (fully offline, no native  */
/*  build required). Persisted to disk on demand.                      */
/* ------------------------------------------------------------------ */

type SqlValue = string | number | null | Uint8Array

interface SqlJsStatement {
  bind(params: SqlValue[]): boolean
  step(): boolean
  getAsObject(): Record<string, SqlValue> | null
  free(): void
}

interface SqlJsPreparedDb {
  prepare(sql: string): SqlJsStatement
  exec(sql: string): unknown
  export(): Uint8Array
  close(): void
}

export interface SqlJsModule {
  Database: new (data?: Uint8Array) => SqlJsPreparedDb
}

let sqlModule: SqlJsModule | null = null

export async function warmUpDatabase(): Promise<void> {
  if (sqlModule) return
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const init = requireFn('sql.js') as (config?: { locateFile?: (file: string) => string }) => Promise<SqlJsModule>
  sqlModule = await init({
    locateFile: (file: string) => {
      try {
        return requireFn.resolve(`sql.js/dist/${file}`)
      } catch {
        return `./${file}`
      }
    }
  })
}

function constructDatabase(data?: Uint8Array): SqlJsPreparedDb {
  if (!sqlModule) throw new Error('sql.js not initialized — call warmUpDatabase() first')
  return new sqlModule.Database(data ?? undefined)
}

function toSqlValue(p: unknown): SqlValue {
  if (p === null || p === undefined) return null
  if (typeof p === 'boolean') return p ? 1 : 0
  if (typeof p === 'number') return Number.isFinite(p) ? p : 0
  if (typeof p === 'string') return p
  if (p instanceof Uint8Array) return p
  return String(p)
}

export interface Stmt {
  run(...params: unknown[]): void
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
}

export class SyncDatabase {
  private stmt: SqlJsPreparedDb
  private persistTimer: ReturnType<typeof setTimeout> | null = null

  constructor(data: Uint8Array | null) {
    this.stmt = constructDatabase(data ?? undefined)
  }

  prepare(sql: string): Stmt {
    const norm = (params: unknown[]): SqlValue[] => params.map(toSqlValue)
    // Each call prepares a fresh statement so a returned Stmt can be reused
    // safely (e.g. inside loops) — sql.js throws "Statement closed" if a
    // freed statement is bound again.
    const run = (...params: unknown[]): void => {
      const stmt = this.stmt.prepare(sql)
      try {
        stmt.bind(norm(params))
        stmt.step()
      } finally {
        stmt.free()
      }
      this.persistSoon()
    }
    const get = (...params: unknown[]): unknown => {
      const stmt = this.stmt.prepare(sql)
      let row: Record<string, SqlValue> | undefined
      try {
        stmt.bind(norm(params))
        if (stmt.step()) row = stmt.getAsObject() ?? undefined
      } finally {
        stmt.free()
      }
      return row
    }
    const all = (...params: unknown[]): unknown[] => {
      const rows: Record<string, SqlValue>[] = []
      const stmt = this.stmt.prepare(sql)
      try {
        stmt.bind(norm(params))
        while (stmt.step()) {
          const row = stmt.getAsObject()
          if (row) rows.push(row)
        }
      } finally {
        stmt.free()
      }
      return rows
    }
    return { run, get, all }
  }

  exec(sql: string): void {
    this.stmt.exec(sql)
    this.persistSoon()
  }

  get userVersion(): number {
    const rows = this.pragma('PRAGMA user_version')
    const first = rows[0] as Record<string, SqlValue> | undefined
    if (first) {
      const v = Object.values(first)[0]
      return typeof v === 'number' ? v : Number(v ?? 0)
    }
    return 0
  }

  set userVersion(v: number) {
    this.exec(`PRAGMA user_version = ${v}`)
  }

  pragma(sql: string): Record<string, SqlValue>[] {
    const stmt = this.stmt.prepare(sql)
    const rows: Record<string, SqlValue>[] = []
    try {
      while (stmt.step()) {
        const row = stmt.getAsObject()
        if (row) rows.push(row)
      }
    } finally {
      stmt.free()
    }
    return rows
  }

  transaction<T extends unknown[], R>(fn: (...args: T) => R): (...args: T) => R {
    return (...args: T): R => {
      this.stmt.exec('BEGIN TRANSACTION')
      try {
        const result = fn(...args)
        this.stmt.exec('COMMIT')
        this.persistSoon()
        return result
      } catch (err) {
        try {
          this.stmt.exec('ROLLBACK')
        } catch {
          /* ignore */
        }
        throw err
      }
    }
  }

  persistNow(): void {
    try {
      const data = this.stmt.export()
      fs.writeFileSync(DB_PATH, Buffer.from(data))
    } catch (err) {
      console.error('Failed to persist database:', err)
    }
  }

  private persistSoon(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => this.persistNow(), 250)
  }

  close(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
      this.persistTimer = null
    }
    this.persistNow()
    this.stmt.close()
  }
}

let db: SyncDatabase | null = null

export function getDb(): SyncDatabase {
  if (db) return db
  const data = fs.existsSync(DB_PATH) ? new Uint8Array(fs.readFileSync(DB_PATH)) : null
  db = new SyncDatabase(data)
  migrate()
  seedSettings()
  return db
}

const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#8b5cf6',
    icon TEXT NOT NULL DEFAULT 'folder',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    plain_text TEXT NOT NULL DEFAULT '',
    search_text TEXT NOT NULL DEFAULT '',
    collection_id TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    color TEXT NOT NULL DEFAULT 'default',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_locked INTEGER NOT NULL DEFAULT 0,
    lock_type TEXT,
    enc_key_salt TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    checklist_total INTEGER NOT NULL DEFAULT 0,
    checklist_done INTEGER NOT NULL DEFAULT 0,
    reminder_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    note_date TEXT NOT NULL DEFAULT '',
    deleted_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    mime TEXT NOT NULL DEFAULT '',
    size INTEGER NOT NULL DEFAULT 0,
    ocr_text TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    remind_at INTEGER NOT NULL,
    repeat TEXT NOT NULL DEFAULT 'none',
    triggered INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    kind TEXT NOT NULL DEFAULT 'manual',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notes_collection ON notes(collection_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(is_favorite)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_reminder ON notes(reminder_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(note_date)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title)`,
  `CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reminders_at ON reminders(remind_at)`
]

function migrate(): void {
  const dbc = db!
  let current = dbc.userVersion
  for (let i = current; i < MIGRATIONS.length; i++) {
    dbc.exec(MIGRATIONS[i])
    current++
    dbc.userVersion = current
  }
  dbc.persistNow()
}

export const DEFAULT_SETTINGS: Record<string, string> = {
  theme: 'dark',
  accent: '#8b5cf6',
  fontFamily: 'Inter',
  fontSize: '16',
  lineHeight: '1.7',
  autosave: '5',
  language: 'en',
  defaultView: 'grid',
  sortOrder: 'updated',
  autoBackup: 'false',
  autoBackupInterval: '1440',
  trashDays: '30',
  confirmDelete: 'true',
  density: 'comfortable',
  showChecklistProgress: 'true',
  lockApp: 'false',
  appLockPin: '',
  editorFont: 'Inter',
  editorFontSize: '17'
}

function seedSettings(): void {
  const dbc = db!
  const insert = dbc.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insert.run(key, value)
  }
  dbc.persistNow()
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function newId(): string {
  return randomUUID()
}