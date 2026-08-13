import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cx } from '@/lib/utils'

export interface MenuItem {
  label?: string
  icon?: ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

interface MenuProps {
  trigger: ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
  width?: string
}

export function Menu({ trigger, items, align = 'right', width = 'w-56' }: MenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const keyHandler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    window.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', keyHandler)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            className={cx(
              'absolute z-50 mt-1 overflow-hidden rounded-xl border border-app-border bg-app-surface p-1 shadow-card',
              width,
              align === 'right' ? 'right-0' : 'left-0'
            )}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -3 }}
            transition={{ duration: 0.13 }}
          >
            {items.map((item, i) => {
              if (item.separator) {
                return <div key={i} className="my-1 h-px bg-app-border" />
              }
              return (
                <button
                  key={i}
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false)
                    item.onClick?.()
                  }}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition',
                    item.danger
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-app-text hover:bg-app-surface-2',
                    item.disabled && 'cursor-not-allowed opacity-40'
                  )}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
