import { useState } from 'react'
import { KeyRound, LockOpen, XCircle } from 'lucide-react'
import type { LockType } from '@shared/types'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'

interface UnlockModalProps {
  open: boolean
  title: string
  lockType: LockType | null
  onClose: () => void
  onUnlocked: (note: { content: string; plainText: string } | null) => void
}

export function UnlockModal({ open, title, lockType, onClose, onUnlocked }: UnlockModalProps): JSX.Element {
  const toast = useAppStore((s) => s.toast)
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (): Promise<void> => {
    if (!secret) return
    setBusy(true)
    try {
      const result = await window.api.notes.unlock(currentNoteId, secret)
      if (result) {
        onUnlocked({ content: result.content, plainText: result.plainText })
        setSecret('')
      } else {
        toast('Wrong password or PIN', undefined, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm" hideClose>
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-accent/12 text-app-accent">
            <LockOpen size={24} />
          </div>
          <p className="text-sm text-app-text-muted">This note is locked. Enter the {lockType === 'pin' ? 'PIN' : 'password'} to view and edit it.</p>
        </div>
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-app-text-muted" />
          <input
            autoFocus
            type="password"
            inputMode={lockType === 'pin' ? 'numeric' : 'text'}
            className="input-base"
            placeholder={lockType === 'pin' ? 'Enter PIN' : 'Enter password'}
            value={secret}
            onChange={(e) => setSecret(lockType === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
          />
        </div>
        {busy && <p className="text-center text-xs text-app-text-muted">Unlocking…</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost text-sm" onClick={onClose}>
            <XCircle size={14} /> Cancel
          </button>
          <button className="btn-primary text-sm" onClick={() => void submit()} disabled={!secret || busy}>
            Unlock
          </button>
        </div>
      </div>
    </Modal>
  )
}

let currentNoteId = ''
export function setUnlockNoteId(id: string): void {
  currentNoteId = id
}
