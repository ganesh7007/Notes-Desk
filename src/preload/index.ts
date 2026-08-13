import { contextBridge, ipcRenderer } from 'electron'
import type {
  Attachment,
  AttachmentKind,
  BackupInfo,
  Collection,
  ExportFormat,
  LockPayload,
  Note,
  NoteColor,
  NoteInput,
  NotesQuery,
  Reminder,
  RepeatMode,
  SearchFilters,
  Settings,
  Stats,
  VoiceNoteData
} from '../shared/types'

const api = {
  notes: {
    list: (query?: NotesQuery): Promise<Note[]> => ipcRenderer.invoke('notes:list', query),
    search: (query?: NotesQuery, filters?: SearchFilters): Promise<Note[]> =>
      ipcRenderer.invoke('notes:search', query, filters),
    get: (id: string): Promise<Note | null> => ipcRenderer.invoke('notes:get', id),
    create: (data?: NoteInput): Promise<Note> => ipcRenderer.invoke('notes:create', data),
    update: (id: string, data: NoteInput): Promise<Note | null> => ipcRenderer.invoke('notes:update', id, data),
    softDelete: (ids: string[]): Promise<void> => ipcRenderer.invoke('notes:delete', ids),
    restore: (ids: string[]): Promise<void> => ipcRenderer.invoke('notes:restore', ids),
    purge: (ids: string[]): Promise<void> => ipcRenderer.invoke('notes:purge', ids),
    emptyTrash: (): Promise<void> => ipcRenderer.invoke('notes:emptyTrash'),
    purgeExpired: (days: number): Promise<number> => ipcRenderer.invoke('notes:purgeExpired', days),
    duplicate: (id: string): Promise<Note | null> => ipcRenderer.invoke('notes:duplicate', id),
    move: (ids: string[], collectionId: string | null): Promise<Collection[]> =>
      ipcRenderer.invoke('notes:move', ids, collectionId),
    setTags: (id: string, tags: string[]): Promise<Note | null> => ipcRenderer.invoke('notes:setTags', id, tags),
    setColor: (id: string, color: NoteColor): Promise<Note | null> => ipcRenderer.invoke('notes:setColor', id, color),
    setPinned: (id: string, pinned: boolean): Promise<Note | null> =>
      ipcRenderer.invoke('notes:setPinned', id, pinned),
    setFavorite: (id: string, fav: boolean): Promise<Note | null> =>
      ipcRenderer.invoke('notes:setFavorite', id, fav),
    setArchived: (id: string, archived: boolean): Promise<Note | null> =>
      ipcRenderer.invoke('notes:setArchived', id, archived),
    stats: (): Promise<Stats> => ipcRenderer.invoke('notes:stats'),
    calendar: (year: number, month: number): Promise<{ date: string; count: number }[]> =>
      ipcRenderer.invoke('notes:calendar', year, month),
    ocrSearch: (term: string): Promise<Note[]> => ipcRenderer.invoke('notes:ocrSearch', term),
    deleteMedia: (id: string): Promise<void> => ipcRenderer.invoke('notes:deleteMedia', id),
    lock: (payload: LockPayload): Promise<boolean> => ipcRenderer.invoke('notes:lock', payload),
    unlock: (noteId: string, secret: string): Promise<Note | null> =>
      ipcRenderer.invoke('notes:unlock', noteId, secret),
    unlockPermanent: (noteId: string, secret: string): Promise<Note | null> =>
      ipcRenderer.invoke('notes:unlockPermanent', noteId, secret)
  },
  collections: {
    list: (): Promise<Collection[]> => ipcRenderer.invoke('collections:list'),
    create: (name: string, color: string, icon: string): Promise<Collection> =>
      ipcRenderer.invoke('collections:create', name, color, icon),
    update: (
      id: string,
      data: { name?: string; color?: string; icon?: string; isFavorite?: boolean }
    ): Promise<Collection | null> => ipcRenderer.invoke('collections:update', id, data),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('collections:delete', id),
    duplicate: (id: string): Promise<Collection | null> => ipcRenderer.invoke('collections:duplicate', id),
    reorder: (ids: string[]): Promise<void> => ipcRenderer.invoke('collections:reorder', ids)
  },
  attachments: {
    list: (noteId: string): Promise<Attachment[]> => ipcRenderer.invoke('attachments:list', noteId),
    all: (): Promise<Attachment[]> => ipcRenderer.invoke('attachments:all'),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('attachments:remove', id),
    setOcr: (id: string, text: string): Promise<void> => ipcRenderer.invoke('attachments:setOcr', id, text)
  },
  tags: {
    all: (): Promise<string[]> => ipcRenderer.invoke('tags:all')
  },
  reminders: {
    list: (active = true): Promise<Reminder[]> => ipcRenderer.invoke('reminders:list', active),
    set: (noteId: string, remindAt: number, repeat: RepeatMode): Promise<Reminder> =>
      ipcRenderer.invoke('reminders:set', noteId, remindAt, repeat),
    remove: (noteId: string): Promise<void> => ipcRenderer.invoke('reminders:remove', noteId)
  },
  settings: {
    getAll: (): Promise<Settings> => ipcRenderer.invoke('settings:getAll'),
    set: (key: string, value: unknown): Promise<void> => ipcRenderer.invoke('settings:set', key, value),
    setMany: (values: Record<string, unknown>): Promise<void> => ipcRenderer.invoke('settings:setMany', values)
  },
  media: {
    save: (payload: { buffer: ArrayBuffer; ext: string; kind: string; name?: string }): Promise<{ path: string; name: string; size: number; rel: string }> =>
      ipcRenderer.invoke('media:save', payload),
    saveAs: (payload: { buffer: ArrayBuffer; ext: string; kind: string; name?: string }): Promise<{ path: string; name: string; size: number; rel: string }> =>
      ipcRenderer.invoke('media:saveAs', payload),
    pick: (kind: 'image' | 'attachment'): Promise<string[] | null> => ipcRenderer.invoke('media:pick', kind),
    readDataUrl: (filePath: string): Promise<string | null> => ipcRenderer.invoke('media:readDataUrl', filePath),
    readBuffer: (filePath: string): Promise<ArrayBuffer | null> => ipcRenderer.invoke('media:readBuffer', filePath),
    attach: (noteId: string, filePath: string, kind: AttachmentKind): Promise<Attachment> =>
      ipcRenderer.invoke('media:attach', noteId, filePath, kind),
    attachBuffer: (
      noteId: string,
      payload: { buffer: ArrayBuffer; name: string; mime: string; kind: AttachmentKind }
    ): Promise<Attachment> => ipcRenderer.invoke('media:attachBuffer', noteId, payload),
    deleteFile: (filePath: string): Promise<boolean> => ipcRenderer.invoke('media:deleteFile', filePath)
  },
  voice: {
    save: (noteId: string, payload: VoiceNoteData): Promise<Attachment> =>
      ipcRenderer.invoke('voice:save', noteId, payload)
  },
  ocr: {
    extract: (filePath: string, lang?: string): Promise<{ text: string; confidence: number }> =>
      ipcRenderer.invoke('ocr:extract', filePath, lang),
    prepare: (lang: string): Promise<boolean> => ipcRenderer.invoke('ocr:prepare', lang),
    status: (lang: string): Promise<{ available: boolean; path: string | null }> =>
      ipcRenderer.invoke('ocr:status', lang)
  },
  importer: {
    pick: (): Promise<Note | null> => ipcRenderer.invoke('import:pick')
  },
  exporter: {
    note: (noteId: string, format: ExportFormat): Promise<string | null> =>
      ipcRenderer.invoke('export:note', noteId, format),
    all: (format: ExportFormat): Promise<string | null> => ipcRenderer.invoke('export:all', format)
  },
  backup: {
    create: (kind?: 'manual' | 'automatic'): Promise<{ path: string; size: number }> =>
      ipcRenderer.invoke('backup:create', kind),
    list: (): Promise<BackupInfo[]> => ipcRenderer.invoke('backup:list'),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('backup:delete', id),
    restore: (id: string): Promise<boolean> => ipcRenderer.invoke('backup:restore', id),
    restoreFromFile: (): Promise<string | null> => ipcRenderer.invoke('backup:restoreFromFile'),
    openFolder: (): Promise<void> => ipcRenderer.invoke('backup:openFolder'),
    openDataFolder: (): Promise<void> => ipcRenderer.invoke('backup:openDataFolder')
  },
  dialog: {
    pickFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
      ipcRenderer.invoke('dialog:pickFile', filters),
    saveFile: (defaultName: string, filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
      ipcRenderer.invoke('dialog:saveFile', defaultName, filters)
  },
  shell: {
    showItem: (filePath: string): Promise<void> => ipcRenderer.invoke('shell:showItem', filePath),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url)
  },
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    maximize: (): Promise<boolean> => ipcRenderer.invoke('window:maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximized: (cb: (max: boolean) => void): (() => void) => {
      const listener = (_e: unknown, max: boolean): void => cb(max)
      ipcRenderer.on('window:maximized', listener)
      return () => ipcRenderer.removeListener('window:maximized', listener)
    }
  },
  app: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    rendererReady: (): void => ipcRenderer.send('app:renderer-ready'),
    onMenu: (channel: 'menu:newNote' | 'menu:focusSearch' | 'menu:settings', cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    },
    onReminderClicked: (cb: (noteId: string) => void): (() => void) => {
      const listener = (_e: unknown, noteId: string): void => cb(noteId)
      ipcRenderer.on('reminder:clicked', listener)
      return () => ipcRenderer.removeListener('reminder:clicked', listener)
    },
    paths: (): Promise<Record<string, string>> => ipcRenderer.invoke('storage:paths')
  }
}

export type NotesApi = typeof api

contextBridge.exposeInMainWorld('api', api)
