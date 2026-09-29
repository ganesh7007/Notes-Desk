import { motion } from 'framer-motion'
import { AppLogo } from '@/components/layout/AppLogo'

export function Splash(): JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-app-bg">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <AppLogo
          size={84}
          rounded="rounded-3xl"
          className="shadow-[0_8px_40px_var(--app-accent-soft)]"
        />
      </motion.div>
      <div className="text-xl font-bold tracking-tight">
        Notes<span style={{ color: 'var(--app-accent)' }}>App</span>
      </div>
      <motion.div
        className="h-1 w-32 overflow-hidden rounded-full bg-app-surface-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--app-accent)' }}
          animate={{ x: ['-100%', '220%'] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  )
}
