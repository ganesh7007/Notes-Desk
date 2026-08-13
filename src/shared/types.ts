export type NoteColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'gray'

export type LockType = 'password' | 'pin'

export type AttachmentKind = 'image' | 'audio' | 'recording' | 'attachment' | 'drawing'

export type RepeatMode = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Collection {
  id: string
  name: string
  color: string
  icon: string
  isFavorite: boolean
  position: number
  createdAt: number
  updatedAt: number
  noteCount?: number
  thumbnail?: string | null
}

export interface Attachment {
  id: string
  noteId: string
  kind: AttachmentKind
  name: string
  path: string
  mime: string
  size: number
  ocrText: string
  createdAt: number
}

export interface Reminder {
  id: string
  noteId: string
  remindAt: number
  repeat: RepeatMode
  triggered: boolean
  createdAt: number
}

export interface Note {
  id: string
  title: string
  subtitle: string
  content: string
  plainText: string
  collectionId: string | null
  tags: string[]
  color: NoteColor
  isPinned: boolean
  isFavorite: boolean
  isLocked: boolean
  lockType: LockType | null
  isArchived: boolean
  checklistTotal: number
  checklistDone: number
  reminderAt: number | null
  createdAt: number
  updatedAt: number
  noteDate: string
  deletedAt: number | null
  collectionName?: string
  hasImages?: boolean
  imageCount?: number
}

export interface NoteInput {
  title?: string
  subtitle?: string
  content?: string
  plainText?: string
  collectionId?: string | null
  tags?: string[]
  color?: NoteColor
  isPinned?: boolean
  isFavorite?: boolean
  isArchived?: boolean
  checklistTotal?: number
  checklistDone?: number
  reminderAt?: number | null
  noteDate?: string
}

export interface Stats {
  totalNotes: number
  activeNotes: number
  collections: number
  images: number
  attachments: number
  totalSize: number
  todayNotes: number
  weekNotes: number
  monthNotes: number
  pinned: number
  favorites: number
  locked: number
  inTrash: number
  remindersActive: number
  tags: number
}

export interface CalendarDay {
  date: string
  count: number
}

export interface NotesQuery {
  collectionId?: string | null
  pinned?: boolean
  favorite?: boolean
  locked?: boolean
  trashed?: boolean
  tag?: string
  search?: string
  date?: string
  limit?: number
}

export interface SearchFilters {
  inTitle?: boolean
  inContent?: boolean
  inTags?: boolean
  inOcr?: boolean
  inCollections?: boolean
  hasImages?: boolean
  hasAttachments?: boolean
  dateFrom?: number | null
  dateTo?: number | null
}

export interface Settings {
  theme: 'dark' | 'light' | 'amoled'
  accent: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  autosave: number
  language: string
  defaultView: 'grid' | 'card' | 'list'
  sortOrder: 'updated' | 'created' | 'title'
  autoBackup: boolean
  autoBackupInterval: number
  trashDays: number
  confirmDelete: boolean
  density: 'comfortable' | 'compact'
  showChecklistProgress: boolean
  lockApp: boolean
  appLockPin: string
  editorFont: string
  editorFontSize: number
}

export type ExportFormat = 'pdf' | 'markdown' | 'docx' | 'txt' | 'html' | 'json'
export type ImportFormat = 'txt' | 'markdown' | 'docx' | 'pdf' | 'json'

export interface ExportOptions {
  format: ExportFormat
  includeImages?: boolean
}

export interface BackupInfo {
  id: string
  path: string
  size: number
  kind: 'manual' | 'automatic'
  createdAt: number
}

export interface NoteNotification {
  title: string
  body: string
}

export interface SearchResult {
  note: Note
  snippet: string
}

export interface LockPayload {
  noteId: string
  type: LockType
  secret: string
  currentSecret?: string
}

export interface VoiceNoteData {
  buffer: ArrayBuffer
  mime: string
  name: string
  duration: number
}

export interface WindowControls {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximized: (cb: (max: boolean) => void) => () => void
}

export type TipNode = {
  type: string
  text?: string
  content?: TipNode[]
  attrs?: Record<string, unknown>
  marks?: { type: string; attrs?: Record<string, unknown> }[]
}
