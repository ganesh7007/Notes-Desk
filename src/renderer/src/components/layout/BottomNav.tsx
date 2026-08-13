import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FolderHeart, Home, StickyNote } from 'lucide-react'
import { cx } from '@/lib/utils'

const NAV = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/notes', label: 'Notes', icon: StickyNote },
  { path: '/collections', label: 'Collections', icon: FolderHeart }
]

export function BottomNav(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()

  const active = (path: string): boolean => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-app-border">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {NAV.map(({ path, label, icon: Icon }) => {
          const isActive = active(path)
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cx(
                'relative flex w-24 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition',
                isActive ? 'text-app-accent' : 'text-app-text-muted hover:text-app-text'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-app-accent/12"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon size={21} className="relative" strokeWidth={isActive ? 2.3 : 2} />
              <span className="relative">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
