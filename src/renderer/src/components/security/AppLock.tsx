import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cx } from '@/lib/utils'

// Recovery key that unlocks the app when the PIN is forgotten.
// It only unlocks — it does not reset or change the PIN.
const RECOVERY_KEY = '041207'

export function AppLock(): JSX.Element | null {
  const settings = useAppStore((s) => s.settings)
  const [locked, setLocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [masterKey, setMasterKey] = useState('')
  const [masterError, setMasterError] = useState(false)

  const unlock = (): void => {
    setLocked(false)
    setPin('')
    setError(false)
    setForgot(false)
    setMasterKey('')
    setMasterError(false)
  }

  useEffect(() => {
    if (settings?.lockApp && settings.appLockPin) {
      setLocked(true)
    }
  }, [settings?.lockApp, settings?.appLockPin])

  useEffect(() => {
    if (!locked || forgot) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Backspace') setPin((p) => p.slice(0, -1))
      else if (/^\d$/.test(e.key) && pin.length < 6) {
        setPin((p) => p + e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [locked, forgot, pin])

  useEffect(() => {
    if (pin.length === settings?.appLockPin?.length && settings?.appLockPin && pin.length > 0) {
      if (pin === settings.appLockPin) {
        unlock()
      } else {
        setError(true)
        setTimeout(() => {
          setPin('')
          setError(false)
        }, 500)
      }
    }
  }, [pin, settings?.appLockPin])

  const tryRecoveryKey = (): void => {
    if (masterKey === RECOVERY_KEY) {
      unlock()
    } else {
      setMasterError(true)
      setTimeout(() => {
        setMasterKey('')
        setMasterError(false)
      }, 800)
    }
  }

  if (!locked) return null

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-app-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-app-accent/15 text-app-accent">
          <Lock size={28} />
        </div>
        <h2 className="text-lg font-semibold">NotesApp is locked</h2>
        <p className="text-sm text-app-text-muted">Enter your PIN to continue</p>
        <div className="mt-2 flex gap-3">
          {Array.from({ length: settings?.appLockPin?.length ?? 4 }).map((_, i) => (
            <span
              key={i}
              className={cx(
                'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all',
                i < pin.length
                  ? 'border-app-accent bg-app-accent'
                  : error
                    ? 'border-red-500'
                    : 'border-app-text-muted/40'
              )}
            />
          ))}
        </div>
        {error && <p className="text-xs text-red-400">Incorrect PIN</p>}

        {!forgot ? (
          <button
            className="mt-1 text-xs text-app-text-muted underline-offset-2 transition hover:text-app-accent hover:underline"
            onClick={() => setForgot(true)}
          >
            Forgot PIN?
          </button>
        ) : (
          <div className="mt-1 flex flex-col items-center gap-2">
            <p className="text-xs text-app-text-muted">Enter your recovery key to unlock</p>
            <input
              type="password"
              autoFocus
              className="input-base w-44 text-center text-sm tracking-widest"
              placeholder="Recovery key"
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryRecoveryKey()}
            />
            {masterError && <p className="text-xs text-red-400">Invalid recovery key</p>}
            <div className="flex gap-2">
              <button
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() => {
                  setForgot(false)
                  setMasterKey('')
                  setMasterError(false)
                }}
              >
                Cancel
              </button>
              <button className="btn-primary px-3 py-1.5 text-xs" onClick={tryRecoveryKey}>
                Unlock
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
