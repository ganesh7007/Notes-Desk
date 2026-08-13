import { useEffect, useState } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import type { RepeatMode } from '@shared/types'
import { Modal } from '@/components/ui/Modal'
import { toLocalDateInput } from '@/lib/utils'

interface ReminderModalProps {
  open: boolean
  noteId: string
  current?: number | null
  onClose: () => void
  onSaved: () => void
}

export function ReminderModal({ open, noteId, current, onClose, onSaved }: ReminderModalProps): JSX.Element {
  const [value, setValue] = useState('')
  const [repeat, setRepeat] = useState<RepeatMode>('none')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const fallback = new Date(Date.now() + 60 * 60 * 1000)
      setValue(toLocalDateInput(current ?? fallback.getTime()))
      setRepeat('none')
    }
  }, [open, current])

  const save = async (): Promise<void> => {
    if (!value) return
    setSaving(true)
    try {
      const ts = new Date(value).getTime()
      await window.api.reminders.set(noteId, ts, repeat)
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (): Promise<void> => {
    await window.api.reminders.remove(noteId)
    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set reminder"
      footer={
        <>
          {current !== null && current !== undefined && (
            <button onClick={() => void remove()} className="mr-auto flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300">
              <Trash2 size={14} /> Remove reminder
            </button>
          )}
          <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary text-sm" onClick={() => void save()} disabled={saving || !value}>
            Save reminder
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-app-text-muted">
            <Bell size={13} /> Date & time
          </label>
          <input type="datetime-local" className="input-base" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-app-text-muted">Repeat</label>
          <div className="flex flex-wrap gap-2">
            {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as RepeatMode[]).map((r) => (
              <button
                key={r}
                onClick={() => setRepeat(r)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium capitalize transition ${
                  repeat === r ? 'border-app-accent bg-app-accent/12 text-app-accent' : 'border-app-border text-app-text-muted hover:text-app-text'
                }`}
              >
                {r === 'none' ? 'Once' : r}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-app-text-muted">
          You'll get a desktop notification when the reminder fires. Repeating reminders will reschedule automatically.
        </p>
      </div>
    </Modal>
  )
}
