import { CheckCircle2, Info, XCircle, AlertCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { cx } from '@/lib/utils'

export function Toasts(): JSX.Element {
  const toasts = useAppStore((s) => s.toasts)
  const dismiss = useAppStore((s) => s.dismissToast)
  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <XCircle size={18} className="text-red-400" />,
    info: <Info size={18} className="text-sky-400" />,
    warning: <AlertCircle size={18} className="text-amber-400" />
  }
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={cx(
              'toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border border-app-border bg-app-surface px-4 py-2.5 shadow-card',
              'glass'
            )}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            onClick={() => dismiss(t.id)}
          >
            {icons[t.type]}
            <div>
              <div className="text-[13px] font-medium">{t.title}</div>
              {t.message && <div className="text-xs text-app-text-muted">{t.message}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
