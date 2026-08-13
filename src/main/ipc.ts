import { app, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type {
  AttachmentKind,
  ExportFormat,
  ImportFormat,
  LockPayload,
  Note,
  NoteInput,
  NotesQuery,
  SearchFilters,
  Settings,
  VoiceNoteData
} from '../shared/types'
import { dirs } from './db'
import {
  addAttachment,
  allAttachments,
  allTags,
  calendarData,
  createCollection,
  createNote,
  deleteBackupRecord,
  deleteCollection,
  deleteMediaByNote,
  duplicateCollection,
  duplicateNote,
  emptyTrash,
  getNote,
  getSettings,
  getStats,
  listAttachments,
  listBackups,
  listCollections,
  listNotes,
  listNotesAdvanced,
  listReminders,
  markReminderTriggered,
  purgeNotes,
  purgeExpiredTrash,
  removeAttachment,
  removeReminder,
  reorderCollections,
  restoreNotes,
  searchOcr,
  setNoteLock,
  setSetting,
  softDeleteNotes,
  unlockNote,
  unlockPermanently,
  updateAttachmentOcr,
  updateCollection,
  updateNote,
  upsertReminder,
  addBackupRecord
} from './repositories'
import { copyIntoApp, deleteFile, dirSize, mimeFor, readAsBuffer, readAsDataUrl, saveBuffer, type MediaKind } from './storage'
import { generateSalt } from './security'
import { extractTextFromImage, ocrStatus, prepareOcrLanguage } from './ocr'
import { exportNote, importFile } from './exportImport'
import { tiptapJsonToMarkdown, tiptapJsonToPlainText } from '../shared/converters'
import { createBackup, restoreBackup } from './backup'
import { cancelNoteReminder, rescheduleForNote, setReminderBroadcaster, scheduleAllReminders } from './reminders'
import type { BrowserWindow } from 'electron'

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  setReminderBroadcaster((channel, payload) => {
    getWindow()?.webContents.send(channel, payload)
  })

  /* ----------------------------- notes ----------------------------- */

  ipcMain.handle('notes:list', (_e, query: NotesQuery = {}) => listNotes(query))
  ipcMain.handle('notes:search', (_e, query: NotesQuery = {}, filters: SearchFilters = {}) =>
    listNotesAdvanced(query, filters)
  )
  ipcMain.handle('notes:get', (_e, id: string) => getNote(id))
  ipcMain.handle('notes:create', (_e, data: NoteInput = {}) => createNote(data))
  ipcMain.handle('notes:update', (_e, id: string, data: NoteInput) => {
    const note = updateNote(id, data)
    if (data.reminderAt) {
      upsertReminder(id, data.reminderAt, 'none')
      rescheduleForNote(id)
    }
    return note
  })
  ipcMain.handle('notes:delete', (_e, ids: string[]) => {
    for (const id of ids) cancelNoteReminder(id)
    softDeleteNotes(ids)
  })
  ipcMain.handle('notes:restore', (_e, ids: string[]) => restoreNotes(ids))
  ipcMain.handle('notes:purge', (_e, ids: string[]) => {
    for (const id of ids) cancelNoteReminder(id)
    purgeNotes(ids)
  })
  ipcMain.handle('notes:emptyTrash', () => {
    const trashed = listNotes({ trashed: true })
    for (const t of trashed) cancelNoteReminder(t.id)
    emptyTrash()
  })
  ipcMain.handle('notes:purgeExpired', (_e, days: number) => purgeExpiredTrash(days))
  ipcMain.handle('notes:duplicate', (_e, id: string) => duplicateNote(id))
  ipcMain.handle('notes:move', (_e, ids: string[], collectionId: string | null) => {
    for (const id of ids) updateNote(id, { collectionId })
    return listCollections()
  })
  ipcMain.handle('notes:setTags', (_e, id: string, tags: string[]) => updateNote(id, { tags }))
  ipcMain.handle('notes:setColor', (_e, id: string, color: Note['color']) => updateNote(id, { color }))
  ipcMain.handle('notes:setPinned', (_e, id: string, pinned: boolean) => updateNote(id, { isPinned: pinned }))
  ipcMain.handle('notes:setFavorite', (_e, id: string, fav: boolean) => updateNote(id, { isFavorite: fav }))
  ipcMain.handle('notes:setArchived', (_e, id: string, archived: boolean) => updateNote(id, { isArchived: archived }))
  ipcMain.handle('notes:stats', () => getStats())
  ipcMain.handle('notes:calendar', (_e, year: number, month: number) => calendarData(year, month))
  ipcMain.handle('notes:ocrSearch', (_e, term: string) => searchOcr(term))
  ipcMain.handle('notes:deleteMedia', (_e, id: string) => deleteMediaByNote(id))

  ipcMain.handle('notes:lock', (_e, payload: LockPayload) => {
    const salt = generateSalt()
    const ok = setNoteLock(payload.noteId, payload.secret, salt, payload.type, payload.currentSecret)
    return ok
  })
  ipcMain.handle('notes:unlock', (_e, noteId: string, secret: string) => unlockNote(noteId, secret))
  ipcMain.handle('notes:unlockPermanent', (_e, noteId: string, secret: string) => unlockPermanently(noteId, secret))

  /* ----------------------------- collections ----------------------------- */

  ipcMain.handle('collections:list', () => listCollections())
  ipcMain.handle('collections:create', (_e, name: string, color: string, icon: string) =>
    createCollection(name, color, icon)
  )
  ipcMain.handle(
    'collections:update',
    (_e, id: string, data: { name?: string; color?: string; icon?: string; isFavorite?: boolean }) =>
      updateCollection(id, data)
  )
  ipcMain.handle('collections:delete', (_e, id: string) => deleteCollection(id))
  ipcMain.handle('collections:duplicate', (_e, id: string) => duplicateCollection(id))
  ipcMain.handle('collections:reorder', (_e, ids: string[]) => reorderCollections(ids))

  /* ----------------------------- attachments ----------------------------- */

  ipcMain.handle('attachments:list', (_e, noteId: string) => listAttachments(noteId))
  ipcMain.handle('attachments:all', () => allAttachments())
  ipcMain.handle('attachments:remove', (_e, id: string) => removeAttachment(id))
  ipcMain.handle('attachments:setOcr', (_e, id: string, text: string) => updateAttachmentOcr(id, text))

  /* ----------------------------- tags ----------------------------- */

  ipcMain.handle('tags:all', () => allTags())

  /* ----------------------------- reminders ----------------------------- */

  ipcMain.handle('reminders:list', (_e, active: boolean) => listReminders(active))
  ipcMain.handle('reminders:set', (_e, noteId: string, remindAt: number, repeat: string) => {
    const reminder = upsertReminder(noteId, remindAt, repeat as never)
    updateNote(noteId, { reminderAt: remindAt })
    rescheduleForNote(noteId)
    return reminder
  })
  ipcMain.handle('reminders:remove', (_e, noteId: string) => {
    cancelNoteReminder(noteId)
    removeReminder(noteId)
  })
  ipcMain.handle('reminders:markTriggered', (_e, id: string) => markReminderTriggered(id))

  /* ----------------------------- settings ----------------------------- */

  ipcMain.handle('settings:getAll', () => {
    const raw = getSettings()
    return {
      theme: raw.theme ?? 'dark',
      accent: raw.accent ?? '#8b5cf6',
      fontFamily: raw.fontFamily ?? 'Inter',
      fontSize: Number(raw.fontSize ?? 16),
      lineHeight: Number(raw.lineHeight ?? 1.7),
      autosave: Number(raw.autosave ?? 5),
      language: raw.language ?? 'en',
      defaultView: raw.defaultView ?? 'grid',
      sortOrder: raw.sortOrder ?? 'updated',
      autoBackup: raw.autoBackup === 'true',
      autoBackupInterval: Number(raw.autoBackupInterval ?? 1440),
      trashDays: Number(raw.trashDays ?? 30),
      confirmDelete: raw.confirmDelete !== 'false',
      density: raw.density ?? 'comfortable',
      showChecklistProgress: raw.showChecklistProgress !== 'false',
      lockApp: raw.lockApp === 'true',
      appLockPin: raw.appLockPin ?? '',
      editorFont: raw.editorFont ?? 'Inter',
      editorFontSize: Number(raw.editorFontSize ?? 17)
    } as Settings
  })
  ipcMain.handle('settings:set', (_e, key: string, value: unknown) => {
    setSetting(key, typeof value === 'boolean' ? String(value) : String(value ?? ''))
  })
  ipcMain.handle('settings:setMany', (_e, values: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(values)) {
      setSetting(k, typeof v === 'boolean' ? String(v) : String(v ?? ''))
    }
  })

  /* ----------------------------- media / storage ----------------------------- */

  ipcMain.handle('media:save', (_e, payload: { buffer: ArrayBuffer | number[]; ext: string; kind: string; name?: string }) => {
    const buf = toBuffer(payload.buffer)
    const saved = saveBuffer(buf, payload.kind as MediaKind, payload.ext, payload.name)
    return { ...saved, rel: toAppMediaRel(saved.path, payload.kind as AttachmentKind) }
  })
  ipcMain.handle('media:pick', async (_e, kind: 'image' | 'attachment') => {
    const filters =
      kind === 'image'
        ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }]
        : [{ name: 'All Files', extensions: ['*'] }]
    const win = getWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters
    })
    if (result.canceled || !result.filePaths.length) return null
    return result.filePaths
  })
  ipcMain.handle('media:saveAs', async (_e, payload: { buffer: ArrayBuffer | number[]; ext: string; kind: string; name?: string }) => {
    const buf = toBuffer(payload.buffer)
    const saved = saveBuffer(buf, payload.kind as MediaKind, payload.ext, payload.name)
    return { ...saved, rel: toAppMediaRel(saved.path, payload.kind as AttachmentKind) }
  })
  ipcMain.handle('media:readDataUrl', (_e, filePath: string) => {
    if (filePath.startsWith('appmedia://')) {
      const full = path.join(dirs.root, filePath.replace('appmedia://', ''))
      if (fs.existsSync(full)) return readAsDataUrl(full)
      return null
    }
    return fs.existsSync(filePath) ? readAsDataUrl(filePath) : null
  })
  ipcMain.handle('media:readBuffer', (_e, filePath: string) => {
    const full = filePath.startsWith('appmedia://')
      ? path.join(dirs.root, filePath.replace('appmedia://', ''))
      : filePath
    return fs.existsSync(full) ? (readAsBuffer(full) as unknown as ArrayBuffer) : null
  })
  ipcMain.handle('media:attach', (_e, noteId: string, filePath: string, kind: AttachmentKind) => {
    const copied = copyIntoApp(filePath, kind as MediaKind)
    const mime = mimeFor(copied.path)
    return addAttachment(noteId, kind, copied.path, copied.name, mime, copied.size)
  })
  ipcMain.handle('media:attachBuffer', (_e, noteId: string, payload: { buffer: ArrayBuffer | number[]; name: string; mime: string; kind: string }) => {
    const buf = toBuffer(payload.buffer)
    const saved = saveBuffer(buf, payload.kind as MediaKind, path.extname(payload.name), payload.name)
    return addAttachment(noteId, payload.kind as AttachmentKind, saved.path, saved.name, payload.mime, saved.size)
  })
  ipcMain.handle('media:deleteFile', (_e, filePath: string) => {
    if (filePath.startsWith('appmedia://')) {
      return deleteFile(path.join(dirs.root, filePath.replace('appmedia://', '')))
    }
    return deleteFile(filePath)
  })
  ipcMain.handle('storage:dirSize', (_e, dir: string) => dirSize(dir))
  ipcMain.handle('storage:paths', () => ({ ...dirs, appRoot: dirs.root }))

  /* ----------------------------- voice ----------------------------- */

  ipcMain.handle('voice:save', (_e, noteId: string, payload: VoiceNoteData) => {
    const buf = toBuffer(payload.buffer)
    const ext = payload.mime.includes('wav') ? '.wav' : payload.mime.includes('mp3') ? '.mp3' : '.webm'
    const saved = saveBuffer(buf, 'recording', ext, payload.name || 'recording')
    return addAttachment(noteId, 'recording', saved.path, saved.name, payload.mime, saved.size)
  })

  /* ----------------------------- ocr ----------------------------- */

  ipcMain.handle('ocr:extract', async (_e, filePath: string, lang?: string) => {
    const resolved = filePath.startsWith('appmedia://')
      ? path.join(dirs.root, filePath.replace('appmedia://', ''))
      : filePath
    return extractTextFromImage(resolved, lang || 'eng')
  })
  ipcMain.handle('ocr:prepare', (_e, lang: string) => prepareOcrLanguage(lang))
  ipcMain.handle('ocr:status', (_e, lang: string) => ocrStatus(lang))

  /* ----------------------------- import / export ----------------------------- */

  ipcMain.handle('import:pick', async (_e) => {
    const win = getWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [
        { name: 'Notes', extensions: ['txt', 'md', 'markdown', 'docx', 'pdf', 'json'] },
        { name: 'Text', extensions: ['txt', 'md', 'markdown'] },
        { name: 'Documents', extensions: ['docx', 'pdf'] },
        { name: 'JSON', extensions: ['json'] }
      ]
    })
    if (result.canceled || !result.filePaths.length) return null
    const filePath = result.filePaths[0]
    const format = detectImportFormat(filePath)
    const imported = await importFile(filePath, format)
    const note = createNote({
      title: imported.title,
      content: JSON.stringify(imported.content),
      plainText: imported.text
    })
    return note
  })

  ipcMain.handle('export:note', async (_e, noteId: string, format: ExportFormat) => {
    const note = getNote(noteId)
    if (!note) throw new Error('Note not found')
    const win = getWindow()
    if (!win) return null
    const ext = {
      pdf: 'pdf',
      markdown: 'md',
      docx: 'docx',
      txt: 'txt',
      html: 'html',
      json: 'json'
    }[format]
    const result = await dialog.showSaveDialog(win, {
      defaultPath: `${sanitize(note.title || 'untitled')}.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    })
    if (result.canceled || !result.filePath) return null
    await exportNote(note, format, result.filePath)
    return result.filePath
  })

  ipcMain.handle('export:all', async (_e, format: ExportFormat) => {
    const win = getWindow()
    if (!win) return null
    const result = await dialog.showSaveDialog(win, {
      defaultPath: `notesapp-export.${format === 'markdown' ? 'md' : format}`,
      filters: [{ name: format.toUpperCase(), extensions: [format === 'markdown' ? 'md' : format] }]
    })
    if (result.canceled || !result.filePath) return null
    const notes = listNotes({})
    const parts: string[] = []
    for (const note of notes) {
      if (format === 'markdown') {
        parts.push(`# ${note.title}\n\n${tiptapJsonToMarkdown(note.content)}\n\n---\n\n`)
      } else if (format === 'json') {
        parts.push(JSON.stringify(note, null, 2) + '\n')
      } else if (format === 'txt') {
        parts.push(`${note.title}\n${tiptapJsonToPlainText(note.content)}\n\n`)
      }
    }
    fs.writeFileSync(result.filePath, parts.join('\n'), 'utf8')
    return result.filePath
  })

  /* ----------------------------- backup ----------------------------- */

  ipcMain.handle('backup:create', async (_e, kind: 'manual' | 'automatic' = 'manual') => createBackup(kind))
  ipcMain.handle('backup:list', () => listBackups())
  ipcMain.handle('backup:delete', (_e, id: string) => {
    const rec = listBackups().find((b) => b.id === id)
    if (rec) deleteFile(rec.path)
    deleteBackupRecord(id)
  })
  ipcMain.handle('backup:restore', async (_e, id: string) => {
    const rec = listBackups().find((b) => b.id === id)
    if (!rec) throw new Error('Backup not found')
    await restoreBackup(rec.path)
    scheduleAllReminders()
    return true
  })
  ipcMain.handle('backup:restoreFromFile', async () => {
    const win = getWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Backup', extensions: ['zip'] }]
    })
    if (result.canceled || !result.filePaths.length) return null
    const p = result.filePaths[0]
    await restoreBackup(p)
    const stats = fs.statSync(p)
    addBackupRecord(p, stats.size, 'manual')
    scheduleAllReminders()
    return p
  })
  ipcMain.handle('backup:openFolder', () => {
    shell.openPath(dirs.backups)
  })
  ipcMain.handle('backup:openDataFolder', () => {
    shell.openPath(dirs.root)
  })

  /* ----------------------------- dialogs ----------------------------- */

  ipcMain.handle('dialog:pickFile', async (_e, filters?: { name: string; extensions: string[] }[]) => {
    const win = getWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: filters ?? [{ name: 'All Files', extensions: ['*'] }]
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
  ipcMain.handle('dialog:saveFile', async (_e, defaultName: string, filters?: { name: string; extensions: string[] }[]) => {
    const win = getWindow()
    if (!win) return null
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: filters ?? [{ name: 'All Files', extensions: ['*'] }]
    })
    return result.canceled ? null : (result.filePath ?? null)
  })
  ipcMain.handle('shell:showItem', (_e, filePath: string) => {
    if (filePath.startsWith('appmedia://')) {
      shell.showItemInFolder(path.join(dirs.root, filePath.replace('appmedia://', '')))
    } else {
      shell.showItemInFolder(filePath)
    }
  })
  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url)
  })

  /* ----------------------------- window ----------------------------- */

  ipcMain.handle('window:minimize', () => getWindow()?.minimize())
  ipcMain.handle('window:maximize', () => {
    const win = getWindow()
    if (!win) return false
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return win.isMaximized()
  })
  ipcMain.handle('window:close', () => getWindow()?.close())
  ipcMain.handle('window:isMaximized', () => getWindow()?.isMaximized() ?? false)
  ipcMain.handle('app:version', () => app.getVersion())

  // Health ping from the renderer (after React mounts). When the smoke test
  // sets NOTESAPP_HEALTH_FILE, write a marker file so the test can confirm
  // the renderer booted — independent of window visibility.
  ipcMain.on('app:renderer-ready', () => {
    const marker = process.env['NOTESAPP_HEALTH_FILE']
    if (marker) {
      try {
        fs.writeFileSync(marker, String(Date.now()))
      } catch {
        /* best-effort — never let the health ping crash the app */
      }
    }
  })
}

function detectImportFormat(filePath: string): ImportFormat {
  const ext = path.extname(filePath).toLowerCase().slice(1)
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'txt') return 'txt'
  if (ext === 'docx') return 'docx'
  if (ext === 'pdf') return 'pdf'
  return 'json'
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().slice(0, 60) || 'note'
}

function toBuffer(data: ArrayBuffer | number[]): Buffer {
  return data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data)
}

function toAppMediaRel(fullPath: string, kind: AttachmentKind): string {
  const sub = kind === 'image' ? 'images' : kind === 'audio' || kind === 'recording' ? 'audio' : kind === 'drawing' ? 'drawings' : 'attachments'
  const rel = path.relative(dirs.root, fullPath).split(path.sep).join('/')
  return `${sub === 'images' ? 'images' : sub}/${rel.split('/').pop() ?? rel}`
}
