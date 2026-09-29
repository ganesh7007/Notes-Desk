import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  BarChart3,
  BookMarked,
  CalendarDays,
  DatabaseBackup,
  FileInput,
  FolderHeart,
  Home,
  Lock,
  Pin,
  Settings as SettingsIcon,
  Star,
  Tags as TagsIcon,
  Trash2
} from 'lucide-react'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { AppLogo } from '@/components/layout/AppLogo'

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
      <div className="mx-auto flex h-14 max-w-none items-center gap-3 px-5">
        <button
          onClick={() => navigate('/')}
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight"
        >
          <AppLogo size={30} rounded="rounded-xl" />
          <span className="hidden sm:inline">
            Notes<span style={{ color: 'var(--app-accent)' }}>App</span>
          </span>
        </button>
        <span className="hidden text-sm text-app-text-muted md:inline">/</span>
        <span className="hidden truncate text-sm font-medium text-app-text-muted md:block">{title}</span>

        <form
          className="usearch mx-auto w-full max-w-xl"
          onSubmit={(e) => e.preventDefault()}
        >
          <button type="button" className="usearch-btn" title="Search" onClick={() => searchRef.current?.focus()}>
            <svg width="17" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="search">
              <path d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9" stroke="currentColor" strokeWidth="1.333" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <input
            ref={searchRef}
            className="usearch-input"
            placeholder="Search notes, tags, collections…"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('')
                onSearchChange('')
                searchRef.current?.blur()
              }
            }}
          />
          <button
            type="button"
            className="usearch-reset"
            title="Clear search"
            onClick={() => {
              setSearch('')
              onSearchChange('')
              searchRef.current?.focus()
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>

        <div className="flex shrink-0 items-center gap-1.5">
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
