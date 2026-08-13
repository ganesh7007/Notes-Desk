import { getDb, newId, dirs } from './db'
import type {
  Attachment,
  AttachmentKind,
  BackupInfo,
  Collection,
  LockType,
  Note,
  NoteInput,
  NotesQuery,
  Reminder,
  RepeatMode,
  SearchFilters,
  Stats
} from '../shared/types'
import { decryptText, encryptText } from './security'
import { deleteFile, dirSize } from './storage'

/* ----------------------------- row mappers ----------------------------- */

interface NoteRow {
  id: string
  title: string
  subtitle: string
  content: string
  plain_text: string
  collection_id: string | null
  tags: string
  color: string
  is_pinned: number
  is_favorite: number
  is_locked: number
  lock_type: LockType | null
  is_archived: number
  checklist_total: number
  checklist_done: number
  reminder_at: number | null
  created_at: number
  updated_at: number
  note_date: string
  deleted_at: number | null
  collection_name?: string | null
  image_count?: number
}

function mapNote(row: NoteRow): Note {
  let tags: string[] = []
  try {
    const parsed = JSON.parse(row.tags)
    if (Array.isArray(parsed)) tags = parsed.filter((t) => typeof t === 'string')
  } catch {
    /* ignore */
  }
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    content: row.content,
    plainText: row.plain_text,
    collectionId: row.collection_id,
    tags,
    color: row.color as Note['color'],
    isPinned: Boolean(row.is_pinned),
    isFavorite: Boolean(row.is_favorite),
    isLocked: Boolean(row.is_locked),
    lockType: row.lock_type,
    isArchived: Boolean(row.is_archived),
    checklistTotal: row.checklist_total,
    checklistDone: row.checklist_done,
    reminderAt: row.reminder_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    noteDate: row.note_date,
    deletedAt: row.deleted_at,
    collectionName: row.collection_name ?? undefined,
    imageCount: row.image_count ?? 0,
    hasImages: (row.image_count ?? 0) > 0
  }
}

const NOTE_COLUMNS = `
  n.id, n.title, n.subtitle, n.content, n.plain_text, n.collection_id, n.tags, n.color,
  n.is_pinned, n.is_favorite, n.is_locked, n.lock_type, n.is_archived, n.checklist_total,
  n.checklist_done, n.reminder_at, n.created_at, n.updated_at, n.note_date, n.deleted_at,
  c.name AS collection_name,
  (SELECT COUNT(*) FROM attachments a WHERE a.note_id = n.id AND a.kind = 'image') AS image_count
`

export function listNotes(query: NotesQuery = {}): Note[] {
  const db = getDb()
  const where: string[] = []
  const params: unknown[] = []

  if (query.trashed) {
    where.push('n.deleted_at IS NOT NULL')
  } else {
    where.push('n.deleted_at IS NULL')
    if (query.collectionId !== undefined && query.collectionId !== null) {
      where.push('n.collection_id = ?')
      params.push(query.collectionId)
    }
    if (query.pinned) where.push('n.is_pinned = 1')
    if (query.favorite) where.push('n.is_favorite = 1')
    if (query.locked) where.push('n.is_locked = 1')
    if (query.date) where.push('n.note_date = ?')
    if (query.tag) where.push("n.tags LIKE ?")
    if (query.search) {
      where.push(`(
        n.title LIKE ? OR n.plain_text LIKE ? OR n.search_text LIKE ?
      )`)
      const like = `%${query.search}%`
      params.push(like, like, like)
    }
  }
  if (query.tag) params.push(`%"${query.tag}"%`)

  const sql = `
    SELECT ${NOTE_COLUMNS}
    FROM notes n
    LEFT JOIN collections c ON c.id = n.collection_id
    WHERE ${where.join(' AND ')}
    ORDER BY n.is_pinned DESC, n.updated_at DESC
    ${query.limit ? 'LIMIT ?' : ''}
  `
  if (query.limit) params.push(query.limit)
  return (db.prepare(sql).all(...params) as NoteRow[]).map(mapNote)
}

export function listNotesAdvanced(query: NotesQuery, filters: SearchFilters = {}): Note[] {
  const db = getDb()
  const where: string[] = ['n.deleted_at IS NULL']
  const params: unknown[] = []

  if (query.collectionId !== undefined && query.collectionId !== null) {
    where.push('n.collection_id = ?')
    params.push(query.collectionId)
  }
  if (query.pinned) where.push('n.is_pinned = 1')
  if (query.favorite) where.push('n.is_favorite = 1')
  if (query.locked) where.push('n.is_locked = 1')
  if (query.tag) {
    where.push('n.tags LIKE ?')
    params.push(`%"${query.tag}"%`)
  }
  if (query.date) {
    where.push('n.note_date = ?')
    params.push(query.date)
  }

  if (query.search) {
    const term = `%${query.search}%`
    const parts: string[] = []
    if (filters.inTitle ?? true) parts.push('n.title LIKE ?')
    if (filters.inContent ?? true) parts.push('n.plain_text LIKE ?')
    if (filters.inOcr) {
      where.push(`EXISTS (
        SELECT 1 FROM attachments a WHERE a.note_id = n.id AND a.ocr_text LIKE ?
      )`)
      params.push(term)
    }
    if (filters.inTags ?? true) parts.push('n.tags LIKE ?')
    if (parts.length) {
      where.push(`(${parts.join(' OR ')})`)
      parts.forEach(() => params.push(term))
    }
  }

  if (filters.hasImages) where.push('(SELECT COUNT(*) FROM attachments a WHERE a.note_id = n.id AND a.kind = \'image\') > 0')
  if (filters.hasAttachments) where.push('(SELECT COUNT(*) FROM attachments a WHERE a.note_id = n.id) > 0')
  if (filters.dateFrom !== undefined && filters.dateFrom !== null) {
    where.push('n.created_at >= ?')
    params.push(filters.dateFrom)
  }
  if (filters.dateTo !== undefined && filters.dateTo !== null) {
    where.push('n.created_at <= ?')
    params.push(filters.dateTo)
  }

  const sql = `
    SELECT ${NOTE_COLUMNS}
    FROM notes n
    LEFT JOIN collections c ON c.id = n.collection_id
    WHERE ${where.join(' AND ')}
    ORDER BY n.is_pinned DESC, n.updated_at DESC
    ${query.limit ? 'LIMIT ?' : ''}
  `
  if (query.limit) params.push(query.limit)
  return (db.prepare(sql).all(...params) as NoteRow[]).map(mapNote)
}

export function getNote(id: string): Note | null {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT ${NOTE_COLUMNS} FROM notes n
       LEFT JOIN collections c ON c.id = n.collection_id
       WHERE n.id = ?`
    )
    .get(id) as NoteRow | undefined
  return row ? mapNote(row) : null
}

export function createNote(data: NoteInput = {}): Note {
  const db = getDb()
  const id = newId()
  const now = Date.now()
  const noteDate = data.noteDate || toDateString(now)
  db.prepare(
    `INSERT INTO notes (
      id, title, subtitle, content, plain_text, search_text, collection_id, tags, color,
      is_pinned, is_favorite, is_locked, is_archived, checklist_total, checklist_done,
      reminder_at, created_at, updated_at, note_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.title ?? '',
    data.subtitle ?? '',
    data.content ?? '',
    data.plainText ?? '',
    buildSearchText(data.title ?? '', data.plainText ?? '', data.tags ?? []),
    data.collectionId ?? null,
    JSON.stringify(data.tags ?? []),
    data.color ?? 'default',
    data.isPinned ? 1 : 0,
    data.isFavorite ? 1 : 0,
    0,
    data.isArchived ? 1 : 0,
    data.checklistTotal ?? 0,
    data.checklistDone ?? 0,
    data.reminderAt ?? null,
    now,
    now,
    noteDate
  )
  return getNote(id)!
}

export function updateNote(id: string, data: NoteInput): Note | null {
  const db = getDb()
  const existing = getNote(id)
  if (!existing) return null

  const current = db
    .prepare('SELECT title, plain_text, tags, content FROM notes WHERE id = ?')
    .get(id) as { title: string; plain_text: string; tags: string; content: string }

  const next = {
    title: data.title ?? current.title,
    plainText: data.plainText ?? current.plain_text,
    tags: data.tags ?? safeParseTags(current.tags),
    content: data.content !== undefined ? data.content : current.content,
    collectionId: data.collectionId !== undefined ? data.collectionId : existing.collectionId,
    color: data.color ?? existing.color,
    isPinned: data.isPinned ?? existing.isPinned,
    isFavorite: data.isFavorite ?? existing.isFavorite,
    isArchived: data.isArchived ?? existing.isArchived,
    checklistTotal: data.checklistTotal ?? existing.checklistTotal,
    checklistDone: data.checklistDone ?? existing.checklistDone,
    reminderAt: data.reminderAt !== undefined ? data.reminderAt : existing.reminderAt,
    noteDate: data.noteDate ?? existing.noteDate,
    subtitle: data.subtitle ?? existing.subtitle
  }

  db.prepare(
    `UPDATE notes SET
      title = ?, subtitle = ?, content = ?, plain_text = ?, search_text = ?, collection_id = ?,
      tags = ?, color = ?, is_pinned = ?, is_favorite = ?, is_archived = ?,
      checklist_total = ?, checklist_done = ?, reminder_at = ?, note_date = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    next.title,
    next.subtitle,
    next.content,
    next.plainText,
    buildSearchText(next.title, next.plainText, next.tags),
    next.collectionId,
    JSON.stringify(next.tags),
    next.color,
    next.isPinned ? 1 : 0,
    next.isFavorite ? 1 : 0,
    next.isArchived ? 1 : 0,
    next.checklistTotal,
    next.checklistDone,
    next.reminderAt,
    next.noteDate,
    Date.now(),
    id
  )
  return getNote(id)
}

export function softDeleteNotes(ids: string[]): void {
  if (!ids.length) return
  const db = getDb()
  const stmt = db.prepare('UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?')
  const now = Date.now()
  const tx = db.transaction((list: string[]) => {
    for (const id of list) stmt.run(now, now, id)
  })
  tx(ids)
}

export function restoreNotes(ids: string[]): void {
  if (!ids.length) return
  const db = getDb()
  const stmt = db.prepare('UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE id = ?')
  const now = Date.now()
  const tx = db.transaction((list: string[]) => {
    for (const id of list) stmt.run(now, id)
  })
  tx(ids)
}

export function purgeNotes(ids: string[]): void {
  if (!ids.length) return
  const db = getDb()
  const tx = db.transaction((list: string[]) => {
    for (const id of list) {
      const atts = db.prepare('SELECT * FROM attachments WHERE note_id = ?').all(id) as Attachment[]
      for (const att of atts) deleteAttachmentFile(att)
      db.prepare('DELETE FROM attachments WHERE note_id = ?').run(id)
      db.prepare('DELETE FROM reminders WHERE note_id = ?').run(id)
      db.prepare('DELETE FROM notes WHERE id = ?').run(id)
    }
  })
  tx(ids)
}

export function emptyTrash(): void {
  const db = getDb()
  const rows = db.prepare('SELECT id FROM notes WHERE deleted_at IS NOT NULL').all() as { id: string }[]
  purgeNotes(rows.map((r) => r.id))
}

export function purgeExpiredTrash(days: number): number {
  const db = getDb()
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const rows = db
    .prepare('SELECT id FROM notes WHERE deleted_at IS NOT NULL AND deleted_at < ?')
    .all(cutoff) as { id: string }[]
  if (rows.length) purgeNotes(rows.map((r) => r.id))
  return rows.length
}

export function duplicateNote(id: string): Note | null {
  const src = getNote(id)
  if (!src) return null
  const data: NoteInput = {
    title: `${src.title} (copy)`,
    subtitle: src.subtitle,
    content: src.content,
    plainText: src.plainText,
    collectionId: src.collectionId,
    tags: src.tags,
    color: src.color,
    isPinned: src.isPinned,
    isFavorite: src.isFavorite,
    reminderAt: src.reminderAt,
    noteDate: src.noteDate
  }
  return createNote(data)
}

export function setNoteLock(id: string, secret: string, salt: string, type: LockType, currentSecret?: string): boolean {
  const db = getDb()
  const note = getNote(id)
  if (!note) return false

  if (note.isLocked) {
    if (!currentSecret) return false
    const row = db
      .prepare('SELECT enc_key_salt FROM notes WHERE id = ?')
      .get(id) as { enc_key_salt: string | null } | undefined
    if (!row?.enc_key_salt) return false
    const decrypted = decryptText(note.content, currentSecret, row.enc_key_salt)
    if (decrypted === null) return false
    const encrypted = encryptText(decrypted, secret, salt)
    db.prepare(
      'UPDATE notes SET content = ?, is_locked = 1, lock_type = ?, enc_key_salt = ?, updated_at = ? WHERE id = ?'
    ).run(encrypted, type, salt, Date.now(), id)
    return true
  }

  const encrypted = encryptText(note.content, secret, salt)
  db.prepare(
    'UPDATE notes SET content = ?, is_locked = 1, lock_type = ?, enc_key_salt = ?, updated_at = ? WHERE id = ?'
  ).run(encrypted, type, salt, Date.now(), id)
  return true
}

export function unlockNote(id: string, secret: string): Note | null {
  const db = getDb()
  const row = db
    .prepare('SELECT content, enc_key_salt FROM notes WHERE id = ? AND is_locked = 1')
    .get(id) as { content: string; enc_key_salt: string | null } | undefined
  if (!row?.enc_key_salt) return null
  const decrypted = decryptText(row.content, secret, row.enc_key_salt)
  if (decrypted === null) return null
  return getNote(id)
}

export function unlockPermanently(id: string, secret: string): Note | null {
  const db = getDb()
  const note = unlockNote(id, secret)
  if (!note) return null
  const row = db
    .prepare('SELECT content, enc_key_salt FROM notes WHERE id = ?')
    .get(id) as { content: string; enc_key_salt: string | null }
  if (row.enc_key_salt) {
    const plain = decryptText(row.content, secret, row.enc_key_salt) ?? ''
    db.prepare(
      'UPDATE notes SET content = ?, is_locked = 0, lock_type = NULL, enc_key_salt = NULL, updated_at = ? WHERE id = ?'
    ).run(plain, Date.now(), id)
  }
  return getNote(id)
}

/* ----------------------------- collections ----------------------------- */

interface CollectionRow {
  id: string
  name: string
  color: string
  icon: string
  is_favorite: number
  position: number
  created_at: number
  updated_at: number
  note_count: number
  thumbnail: string | null
}

function mapCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    isFavorite: Boolean(row.is_favorite),
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    noteCount: row.note_count,
    thumbnail: row.thumbnail
  }
}

export function listCollections(): Collection[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM notes n WHERE n.collection_id = c.id AND n.deleted_at IS NULL) AS note_count,
        (SELECT n2.plain_text FROM notes n2 WHERE n2.collection_id = c.id AND n2.deleted_at IS NULL ORDER BY n2.updated_at DESC LIMIT 1) AS thumbnail
       FROM collections c
       ORDER BY c.position ASC, c.created_at ASC`
    )
    .all() as CollectionRow[]
  return rows.map(mapCollection)
}

export function createCollection(name: string, color: string, icon: string): Collection {
  const db = getDb()
  const id = newId()
  const now = Date.now()
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM collections').get() as { p: number }
  db.prepare(
    'INSERT INTO collections (id, name, color, icon, is_favorite, position, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)'
  ).run(id, name, color, icon, maxPos.p, now, now)
  return listCollections().find((c) => c.id === id)!
}

export function updateCollection(id: string, data: Partial<Pick<Collection, 'name' | 'color' | 'icon' | 'isFavorite'>>): Collection | null {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as CollectionRow | undefined
  if (!existing) return null
  db.prepare(
    'UPDATE collections SET name = ?, color = ?, icon = ?, is_favorite = ?, updated_at = ? WHERE id = ?'
  ).run(
    data.name ?? existing.name,
    data.color ?? existing.color,
    data.icon ?? existing.icon,
    data.isFavorite !== undefined ? (data.isFavorite ? 1 : 0) : existing.is_favorite,
    Date.now(),
    id
  )
  return listCollections().find((c) => c.id === id) ?? null
}

export function deleteCollection(id: string): void {
  const db = getDb()
  db.prepare('UPDATE notes SET collection_id = NULL WHERE collection_id = ?').run(id)
  db.prepare('DELETE FROM collections WHERE id = ?').run(id)
}

export function duplicateCollection(id: string): Collection | null {
  const db = getDb()
  const src = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as CollectionRow | undefined
  if (!src) return null
  const copy = createCollection(`${src.name} (copy)`, src.color, src.icon)
  const noteRows = db
    .prepare('SELECT id FROM notes WHERE collection_id = ? AND deleted_at IS NULL')
    .all(id) as { id: string }[]
  const stmt = db.prepare('UPDATE notes SET collection_id = ? WHERE id = ?')
  const tx = db.transaction((list: { id: string }[]) => {
    for (const n of list) stmt.run(copy.id, n.id)
  })
  tx(noteRows)
  return copy
}

export function reorderCollections(ids: string[]): void {
  const db = getDb()
  const stmt = db.prepare('UPDATE collections SET position = ?, updated_at = ? WHERE id = ?')
  const now = Date.now()
  const tx = db.transaction((list: string[]) => {
    list.forEach((id, index) => stmt.run(index, now, id))
  })
  tx(ids)
}

/* ----------------------------- attachments ----------------------------- */

export function addAttachment(
  noteId: string,
  kind: AttachmentKind,
  filePath: string,
  name: string,
  mime: string,
  size: number,
  ocrText = ''
): Attachment {
  const db = getDb()
  const id = newId()
  db.prepare(
    'INSERT INTO attachments (id, note_id, kind, name, path, mime, size, ocr_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, noteId, kind, name, filePath, mime, size, ocrText, Date.now())
  return db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as Attachment
}

function deleteAttachmentFile(att: Attachment): void {
  deleteFile(att.path)
}

export function listAttachments(noteId: string): Attachment[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM attachments WHERE note_id = ? ORDER BY created_at ASC')
    .all(noteId) as Attachment[]
}

export function allAttachments(): Attachment[] {
  const db = getDb()
  return db.prepare('SELECT * FROM attachments ORDER BY created_at DESC').all() as Attachment[]
}

export function removeAttachment(id: string): void {
  const db = getDb()
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as Attachment | undefined
  if (att) {
    deleteAttachmentFile(att)
    db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
  }
}

export function updateAttachmentOcr(id: string, ocrText: string): void {
  const db = getDb()
  db.prepare('UPDATE attachments SET ocr_text = ? WHERE id = ?').run(ocrText, id)
}

export function searchOcr(term: string): Note[] {
  const db = getDb()
  const like = `%${term}%`
  const rows = db
    .prepare(
      `SELECT ${NOTE_COLUMNS}
       FROM notes n
       LEFT JOIN collections c ON c.id = n.collection_id
       WHERE n.deleted_at IS NULL AND EXISTS (
         SELECT 1 FROM attachments a WHERE a.note_id = n.id AND a.ocr_text LIKE ?
       )`
    )
    .all(like) as NoteRow[]
  return rows.map(mapNote)
}

/* ----------------------------- reminders ----------------------------- */

export function listReminders(active = true): Reminder[] {
  const db = getDb()
  if (active) {
    return db
      .prepare('SELECT * FROM reminders WHERE triggered = 0 ORDER BY remind_at ASC')
      .all() as Reminder[]
  }
  return db.prepare('SELECT * FROM reminders ORDER BY remind_at ASC').all() as Reminder[]
}

export function upsertReminder(noteId: string, remindAt: number, repeat: RepeatMode): Reminder {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM reminders WHERE note_id = ?').get(noteId) as Reminder | undefined
  if (existing) {
    db.prepare('UPDATE reminders SET remind_at = ?, repeat = ?, triggered = 0 WHERE id = ?').run(
      remindAt,
      repeat,
      existing.id
    )
    return db.prepare('SELECT * FROM reminders WHERE id = ?').get(existing.id) as Reminder
  }
  const id = newId()
  db.prepare(
    'INSERT INTO reminders (id, note_id, remind_at, repeat, triggered, created_at) VALUES (?, ?, ?, ?, 0, ?)'
  ).run(id, noteId, remindAt, repeat, Date.now())
  return db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder
}

export function removeReminder(noteId: string): void {
  const db = getDb()
  db.prepare('UPDATE notes SET reminder_at = NULL, updated_at = ? WHERE id = ?').run(Date.now(), noteId)
  db.prepare('DELETE FROM reminders WHERE note_id = ?').run(noteId)
}

export function markReminderTriggered(id: string): void {
  const db = getDb()
  db.prepare('UPDATE reminders SET triggered = 1 WHERE id = ?').run(id)
}

/* ----------------------------- tags ----------------------------- */

export function allTags(): string[] {
  const db = getDb()
  const rows = db
    .prepare("SELECT tags FROM notes WHERE deleted_at IS NULL AND tags != '[]'")
    .all() as { tags: string }[]
  const set = new Set<string>()
  for (const row of rows) {
    try {
      const arr = JSON.parse(row.tags)
      if (Array.isArray(arr)) arr.forEach((t) => typeof t === 'string' && t && set.add(t))
    } catch {
      /* ignore */
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/* ----------------------------- settings ----------------------------- */

export function getSettings(): Record<string, string> {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  const out: Record<string, string> = {}
  for (const row of rows) out[row.key] = row.value
  return out
}

export function setSetting(key: string, value: string): void {
  const db = getDb()
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    key,
    value
  )
}

/* ----------------------------- backups ----------------------------- */

export function listBackups(): BackupInfo[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM backups ORDER BY created_at DESC')
    .all() as BackupInfo[]
}

export function addBackupRecord(path: string, size: number, kind: 'manual' | 'automatic'): BackupInfo {
  const db = getDb()
  const rec: BackupInfo = {
    id: newId(),
    path,
    size,
    kind,
    createdAt: Date.now()
  }
  db.prepare('INSERT INTO backups (id, path, size, kind, created_at) VALUES (?, ?, ?, ?, ?)').run(
    rec.id,
    rec.path,
    rec.size,
    rec.kind,
    rec.createdAt
  )
  return rec
}

export function deleteBackupRecord(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM backups WHERE id = ?').run(id)
}

export function pruneBackups(keep: number): void {
  const db = getDb()
  const rows = db
    .prepare('SELECT id FROM backups ORDER BY created_at DESC LIMIT -1 OFFSET ?')
    .all(keep) as { id: string }[]
  for (const row of rows) {
    const rec = db.prepare('SELECT * FROM backups WHERE id = ?').get(row.id) as BackupInfo
    deleteFile(rec.path)
    deleteBackupRecord(row.id)
  }
}

/* ----------------------------- stats ----------------------------- */

export function getStats(): Stats {
  const db = getDb()
  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const weekStart = dayStart.getTime() - (dayStart.getDay() || 7) * 86400000
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  const s = (sql: string, ...params: unknown[]) =>
    (db.prepare(sql).get(...params) as { c: number }).c

  const totalSize = (() => {
    return (
      dirSize(dirs.images) +
      dirSize(dirs.audio) +
      dirSize(dirs.attachments) +
      dirSize(dirs.drawings)
    )
  })()

  return {
    totalNotes: s('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL'),
    activeNotes: s('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL AND is_archived = 0'),
    collections: s('SELECT COUNT(*) AS c FROM collections'),
    images: s("SELECT COUNT(*) AS c FROM attachments WHERE kind = 'image'"),
    attachments: s('SELECT COUNT(*) AS c FROM attachments WHERE kind != \'image\''),
    totalSize,
    todayNotes: s('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL AND created_at >= ?', dayStart.getTime()),
    weekNotes: s('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL AND created_at >= ?', weekStart),
    monthNotes: s('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL AND created_at >= ?', monthStart),
    pinned: s('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL AND is_pinned = 1'),
    favorites: s('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL AND is_favorite = 1'),
    locked: s('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL AND is_locked = 1'),
    inTrash: s('SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NOT NULL'),
    remindersActive: s('SELECT COUNT(*) AS c FROM reminders WHERE triggered = 0'),
    tags: s("SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL AND tags != '[]'")
  }
}

export function calendarData(year: number, month: number): { date: string; count: number }[] {
  const db = getDb()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  const startStr = toDateString(start.getTime())
  const endStr = toDateString(end.getTime())
  const rows = db
    .prepare(
      `SELECT note_date, COUNT(*) AS count FROM notes
       WHERE deleted_at IS NULL AND note_date >= ? AND note_date < ? AND note_date != ''
       GROUP BY note_date`
    )
    .all(startStr, endStr) as { note_date: string; count: number }[]
  return rows.map((r) => ({ date: r.note_date, count: r.count }))
}

export function deleteMediaByNote(noteId: string): void {
  const db = getDb()
  const atts = db.prepare('SELECT * FROM attachments WHERE note_id = ?').all(noteId) as Attachment[]
  for (const att of atts) deleteAttachmentFile(att)
  db.prepare('DELETE FROM attachments WHERE note_id = ?').run(noteId)
}

/* ----------------------------- helpers ----------------------------- */

function safeParseTags(raw: string): string[] {
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((t) => typeof t === 'string') : []
  } catch {
    return []
  }
}

export function buildSearchText(title: string, plainText: string, tags: string[]): string {
  return `${title} ${plainText} ${tags.join(' ')}`.toLowerCase()
}

export function toDateString(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
