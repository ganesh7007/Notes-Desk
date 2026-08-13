import { useState } from 'react'
import { KeyRound, Lock } from 'lucide-react'
import type { LockType } from '@shared/types'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'
import { cx } from '@/lib/utils'

interface LockModalProps {
  open: boolean
  noteId: string
  alreadyLocked: boolean
  onClose: () => void
  onDone: () => void
}

export function LockModal({ open, noteId, alreadyLocked, onClose, onDone }: LockModalProps): JSX.Element {
  const toast = useAppStore((s) => s.toast)
  const [mode, setMode] = useState<LockType>('password')
  const [secret, setSecret] = useState('')
  const [confirm, setConfirm] = useState('')
  const [currentSecret, setCurrentSecret] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async (): Promise<void> => {
    if (alreadyLocked && !currentSecret) {
      toast('Enter your current password or PIN first', undefined, 'error')
      return
    }
    if (!secret) {
      toast('Enter a password or PIN', undefined, 'error')
      return
    }
    if (secret !== confirm) {
      toast('Passwords do not match', undefined, 'error')
      return
    }
    setBusy(true)
    try {
      const ok = await window.api.notes.lock({ noteId, type: mode, secret, currentSecret: alreadyLocked ? currentSecret : undefined })
      if (ok) {
        toast(alreadyLocked ? 'Note re-locked with a new secret' : 'Note locked')
        onDone()
        onClose()
      } else {
        toast('Wrong current password or PIN', undefined, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={alreadyLocked ? 'Change lock' : 'Lock note'}
      footer={
        <>
          <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary text-sm" onClick={() => void save()} disabled={busy}>
            {alreadyLocked ? 'Change lock' : 'Lock note'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex rounded-xl bg-app-surface-2 p-1">
          {(['password', 'pin'] as LockType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cx(
                'flex-1 rounded-lg py-2 text-sm font-medium capitalize transition',
                mode === m ? 'bg-app-surface text-app-text shadow-soft' : 'text-app-text-muted'
              )}
            >
              {m === 'password' ? 'Password' : 'PIN'}
            </button>
          ))}
        </div>

        {alreadyLocked && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text-muted">Current {mode}</label>
            <input
              type={mode === 'pin' ? 'password' : 'password'}
              inputMode={mode === 'pin' ? 'numeric' : 'text'}
              className="input-base"
              value={currentSecret}
              onChange={(e) => setCurrentSecret(mode === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
              placeholder={mode === 'pin' ? 'Current PIN' : 'Current password'}
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-app-text-muted">
            <KeyRound size={13} /> New {mode}
          </label>
          <input
            type={mode === 'pin' ? 'password' : 'password'}
            inputMode={mode === 'pin' ? 'numeric' : 'text'}
            className="input-base"
            value={secret}
            onChange={(e) => setSecret(mode === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
            placeholder={mode === 'pin' ? '4-6 digit PIN' : 'Password'}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-app-text-muted">Confirm {mode}</label>
          <input
            type="password"
            inputMode={mode === 'pin' ? 'numeric' : 'text'}
            className="input-base"
            value={confirm}
            onChange={(e) => setConfirm(mode === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
            placeholder="Repeat the secret"
          />
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-app-accent/8 p-3 text-[11px] leading-relaxed text-app-text-muted">
          <Lock size={14} className="mt-0.5 shrink-0 text-app-accent" />
          <span>
            The note content is encrypted with <b>AES-256-GCM</b>. Without your {mode} it is unreadable — even to the app itself.
          </span>
        </div>
      </div>
    </Modal>
  )
}
