import { Notification, nativeImage } from 'electron'
import { getDb } from './db'
import { getNote, listReminders, markReminderTriggered, upsertReminder } from './repositories'
import type { Reminder, RepeatMode } from '../shared/types'

const timers = new Map<string, NodeJS.Timeout>()

function computeNextFire(at: number, repeat: RepeatMode): number {
  const d = new Date(at)
  switch (repeat) {
    case 'daily': {
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      return next.getTime()
    }
    case 'weekly': {
      const next = new Date(d)
      next.setDate(next.getDate() + 7)
      return next.getTime()
    }
    case 'monthly': {
      const next = new Date(d)
      next.setMonth(next.getMonth() + 1)
      return next.getTime()
    }
    case 'yearly': {
      const next = new Date(d)
      next.setFullYear(next.getFullYear() + 1)
      return next.getTime()
    }
    default:
      return 0
  }
}

function scheduleReminder(reminder: Reminder): void {
  const delay = reminder.remindAt - Date.now()
  if (delay <= 0) return
  const existing = timers.get(reminder.id)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(async () => {
    fireReminder(reminder.id)
  }, delay)
  timers.set(reminder.id, timer)
}

async function fireReminder(id: string): Promise<void> {
  const db = getDb()
  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder | undefined
  if (!reminder) return
  const note = getNote(reminder.noteId)
  const title = note?.title?.trim() || 'Reminder'
  const body = note?.plainText?.slice(0, 160) || 'You have a note reminder'

  if (Notification.isSupported()) {
    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    )
    const notification = new Notification({ title, body, silent: false, icon })
    notification.on('click', () => {
      // Notify renderer to open the note
      sendToRenderer('reminder:clicked', reminder.noteId)
    })
    notification.show()
  } else {
    sendToRenderer('reminder:clicked', reminder.noteId)
  }

  if (reminder.repeat !== 'none') {
    const nextAt = computeNextFire(reminder.remindAt, reminder.repeat)
    if (nextAt > 0) {
      upsertReminder(reminder.noteId, nextAt, reminder.repeat)
    } else {
      markReminderTriggered(id)
    }
  } else {
    markReminderTriggered(id)
  }
  timers.delete(id)
}

let sendToRenderer: (channel: string, payload?: unknown) => void = () => undefined

export function setReminderBroadcaster(fn: (channel: string, payload?: unknown) => void): void {
  sendToRenderer = fn
}

export function scheduleAllReminders(): void {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  for (const reminder of listReminders(true)) {
    scheduleReminder(reminder)
  }
}

export function rescheduleForNote(noteId: string): void {
  const db = getDb()
  const reminder = db.prepare('SELECT * FROM reminders WHERE note_id = ? AND triggered = 0').get(noteId) as
    | Reminder
    | undefined
  if (reminder) scheduleReminder(reminder)
}

export function cancelNoteReminder(noteId: string): void {
  const db = getDb()
  const reminder = db.prepare('SELECT * FROM reminders WHERE note_id = ?').get(noteId) as Reminder | undefined
  if (reminder) {
    const timer = timers.get(reminder.id)
    if (timer) clearTimeout(timer)
    timers.delete(reminder.id)
  }
}
