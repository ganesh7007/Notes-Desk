import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps): JSX.Element {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-surface-2 text-app-text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-app-text-muted">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
