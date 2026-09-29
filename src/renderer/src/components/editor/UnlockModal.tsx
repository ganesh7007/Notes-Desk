import { useState } from 'react'
import { KeyRound, LockOpen, ShieldQuestion, XCircle } from 'lucide-react'
import type { LockType } from '@shared/types'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'

// Recovery key that unlocks a note when its password/PIN is forgotten.
// The note's content is encrypted with the user's own secret, so recovery
// removes the lock and erases the (unreadable) encrypted content.
const RECOVERY_KEY = '041207'

interface UnlockModalProps {
  open: boolean
  noteId: string
  title: string
  lockType: LockType | null
  onClose: () => void
  onUnlocked: (note: { content: string; plainText: string } | null) => void
}

export function UnlockModal({ open, noteId, title, lockType, onClose, onUnlocked }: UnlockModalProps): JSX.Element {
  const toast = useAppStore((s) => s.toast)
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [recoveryKey, setRecoveryKey] = useState('')
  const [recoveryError, setRecoveryError] = useState(false)

  const submit = async (): Promise<void> => {
    if (!secret) return
    setBusy(true)
    setError(false)
    try {
      const result = await window.api.notes.unlock(noteId, secret)
      if (result) {
        onUnlocked({ content: result.content, plainText: result.plainText })
        setSecret('')
        setError(false)
        setForgot(false)
      } else {
        setError(true)
      }
    } finally {
      setBusy(false)
    }
  }

  const tryRecovery = async (): Promise<void> => {
    if (!recoveryKey) return
    if (recoveryKey !== RECOVERY_KEY) {
      setRecoveryError(true)
      setTimeout(() => setRecoveryError(false), 800)
      return
    }
    setBusy(true)
    try {
      const result = await window.api.notes.resetLock(noteId)
      if (result) {
        toast('Lock removed — encrypted content erased')
        onUnlocked({ content: '', plainText: '' })
        setRecoveryKey('')
        setForgot(false)
      } else {
        toast('Could not unlock this note', undefined, 'error')
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
            {forgot ? <ShieldQuestion size={24} /> : <LockOpen size={24} />}
          </div>
          <p className="text-sm text-app-text-muted">
            {forgot
              ? 'This note is encrypted with your secret. Without it the content cannot be recovered.'
              : `This note is locked. Enter the ${lockType === 'pin' ? 'PIN' : 'password'} to view and edit it.`}
          </p>
        </div>

        {!forgot ? (
          <>
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="shrink-0 text-app-text-muted" />
              <input
                autoFocus
                type="password"
                inputMode={lockType === 'pin' ? 'numeric' : 'text'}
                className={error ? 'input-base !border-red-500' : 'input-base'}
                placeholder={lockType === 'pin' ? 'Enter PIN' : 'Enter password'}
                value={secret}
                onChange={(e) => {
                  setSecret(lockType === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)
                  setError(false)
                }}
                onKeyDown={(e) => e.key === 'Enter' && void submit()}
              />
            </div>
            {error && (
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-xs font-medium text-red-400">
                  Incorrect {lockType === 'pin' ? 'PIN' : 'password'}
                </p>
                <button
                  className="text-xs text-app-text-muted underline-offset-2 transition hover:text-app-accent hover:underline"
                  onClick={() => {
                    setForgot(true)
                    setError(false)
                  }}
                >
                  Forgot {lockType === 'pin' ? 'PIN' : 'password'}?
                </button>
              </div>
            )}
            {!error && (
              <div className="text-center">
                <button
                  className="text-xs text-app-text-muted/70 underline-offset-2 transition hover:text-app-accent hover:underline"
                  onClick={() => setForgot(true)}
                >
                  Forgot {lockType === 'pin' ? 'PIN' : 'password'}?
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-app-warning/10 p-3 text-[11px] leading-relaxed text-app-text-muted">
              Enter your recovery key to remove the lock. The encrypted content is unreadable without your{' '}
              {lockType === 'pin' ? 'PIN' : 'password'}, so it will be erased.
            </div>
            <div className="flex items-center gap-2">
              <ShieldQuestion size={16} className="shrink-0 text-app-text-muted" />
              <input
                autoFocus
                type="password"
                className={recoveryError ? 'input-base !border-red-500' : 'input-base'}
                placeholder="Recovery key"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void tryRecovery()}
              />
            </div>
            {recoveryError && <p className="text-xs text-red-400">Invalid recovery key</p>}
            <div className="flex justify-between gap-2">
              <button
                className="btn-ghost text-sm"
                onClick={() => {
                  setForgot(false)
                  setRecoveryKey('')
                  setRecoveryError(false)
                }}
              >
                Back
              </button>
              <button className="btn-primary text-sm" onClick={() => void tryRecovery()} disabled={!recoveryKey || busy}>
                Remove lock
              </button>
            </div>
          </div>
        )}

        {busy && <p className="text-center text-xs text-app-text-muted">Unlocking…</p>}

        {!forgot && (
          <div className="flex justify-end gap-2">
            <button className="btn-ghost text-sm" onClick={onClose}>
              <XCircle size={14} /> Cancel
            </button>
            <button className="btn-primary text-sm" onClick={() => void submit()} disabled={!secret || busy}>
              Unlock
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
