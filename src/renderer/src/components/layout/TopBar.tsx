import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  BookMarked,
  CalendarDays,
  DatabaseBackup,
  FileInput,
  FolderHeart,
  Home,
  Lock,
  Moon,
  Pin,
  Search,
  Settings as SettingsIcon,
  Star,
  Sun,
  Tags as TagsIcon,
  Trash2
} from 'lucide-react'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { useAppStore } from '@/store/appStore'

const TITLES: Record<string, string> = {
  '/': 'Home',
  '/notes': 'Notes',
  '/collections': 'Collections',
  '/favorites': 'Favorites',
  '/pinned': 'Pinned',
  '/locked': 'Locked',
  '/archived': 'Archived',
  '/tags': 'Tags',
  '/trash': 'Trash',
  '/calendar': 'Calendar',
  '/stats': 'Statistics',
  '/settings': 'Settings',
  '/backup': 'Backup & Restore',
  '/import': 'Import'
}

export function TopBar(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useState(() => new URLSearchParams(location.search))
  const [search, setSearch] = useState(() => params.get('search') ?? '')
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const searchRef = useRef<HTMLInputElement>(null)

  const isHome = location.pathname === '/'
  const title = location.pathname.startsWith('/collections/')
    ? 'Collection'
    : TITLES[location.pathname] ?? 'Notes'

  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const s = sp.get('search')
    if (s !== search) setSearch(s ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const onSearchChange = (value: string): void => {
    setSearch(value)
    const base = isHome || location.pathname === '/notes' ? '/notes' : '/notes'
    const sp = new URLSearchParams()
    if (value) sp.set('search', value)
    navigate(`${base}${sp.toString() ? `?${sp.toString()}` : ''}`)
  }

  const menuItems: MenuItem[] = [
    { label: 'Home', icon: <Home size={15} />, onClick: () => navigate('/') },
    { label: 'All notes', icon: <BookMarked size={15} />, onClick: () => navigate('/notes') },
    { label: 'Collections', icon: <FolderHeart size={15} />, onClick: () => navigate('/collections') },
    { separator: true },
    { label: 'Favorites', icon: <Star size={15} />, onClick: () => navigate('/favorites') },
    { label: 'Pinned', icon: <Pin size={15} />, onClick: () => navigate('/pinned') },
    { label: 'Locked notes', icon: <Lock size={15} />, onClick: () => navigate('/locked') },
    { label: 'Archived', icon: <Archive size={15} />, onClick: () => navigate('/archived') },
    { label: 'Tags', icon: <TagsIcon size={15} />, onClick: () => navigate('/tags') },
    { label: 'Calendar', icon: <CalendarDays size={15} />, onClick: () => navigate('/calendar') },
    { label: 'Statistics', icon: <BarChart3 size={15} />, onClick: () => navigate('/stats') },
    { separator: true },
    { label: 'Import notes', icon: <FileInput size={15} />, onClick: () => navigate('/import') },
    { label: 'Backup & restore', icon: <DatabaseBackup size={15} />, onClick: () => navigate('/backup') },
    { label: 'Trash', icon: <Trash2 size={15} />, onClick: () => navigate('/trash') },
    { label: 'Settings', icon: <SettingsIcon size={15} />, onClick: () => navigate('/settings') }
  ]

  return (
    <header className="glass z-40 border-b border-app-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl text-sm text-white"
            style={{ background: 'linear-gradient(135deg, var(--app-accent), #22d3ee)' }}
          >
            N
          </span>
          <span className="hidden sm:inline">
            Notes<span style={{ color: 'var(--app-accent)' }}>App</span>
          </span>
        </button>
        <span className="hidden text-sm text-app-text-muted md:inline">/</span>
        <span className="hidden truncate text-sm font-medium text-app-text-muted md:block">{title}</span>

        <div className="relative mx-auto w-full max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('')
                onSearchChange('')
                searchRef.current?.blur()
              }
            }}
            placeholder="Search notes, tags, collections…"
            className="input-base !rounded-full !py-2 pl-9 pr-8 text-[13px]"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('')
                onSearchChange('')
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text"
            >
              <ArchiveRestore size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const theme = settings?.theme === 'dark' ? 'light' : settings?.theme === 'light' ? 'amoled' : 'dark'
              void updateSettings({ theme })
            }}
            title="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-muted transition hover:bg-app-surface-2 hover:text-app-text"
          >
            {settings?.theme === 'light' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={() => navigate('/settings')}
            title="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-muted transition hover:bg-app-surface-2 hover:text-app-text"
          >
            <SettingsIcon size={17} />
          </button>
          <Menu trigger={<ThreeDotButton />} items={menuItems} />
        </div>
      </div>
    </header>
  )
}

function ThreeDotButton(): JSX.Element {
  return (
    <button className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-muted transition hover:bg-app-surface-2 hover:text-app-text">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    </button>
  )
}
