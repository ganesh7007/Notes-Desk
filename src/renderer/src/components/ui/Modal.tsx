import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cx } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: string
  footer?: ReactNode
  hideClose?: boolean
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg', footer, hideClose }: ModalProps): JSX.Element {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={cx(
              'relative w-full rounded-2xl border border-app-border bg-app-surface shadow-card',
              maxWidth
            )}
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
                <h3 className="text-base font-semibold">{title}</h3>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-app-text-muted transition hover:bg-app-surface-2 hover:text-app-text"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-app-border px-5 py-3">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
