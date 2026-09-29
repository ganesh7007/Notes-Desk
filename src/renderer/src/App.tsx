import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { Splash } from '@/components/layout/Splash'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { FloatingButton } from '@/components/layout/FloatingButton'
import { Toasts } from '@/components/ui/Toasts'
import { HomePage } from '@/pages/HomePage'
import { NotesPage } from '@/pages/NotesPage'
import { AppLock } from '@/components/security/AppLock'

/*
 * Every page except the two landing views is split into its own chunk. The
 * editor alone drags in TipTap + highlight.js and Stats drags in recharts, so
 * keeping them out of the initial bundle is what makes the window paint fast.
 */
const CollectionsPage = lazy(() => import('@/pages/CollectionsPage').then((m) => ({ default: m.CollectionsPage })))
const CollectionPage = lazy(() => import('@/pages/CollectionPage').then((m) => ({ default: m.CollectionPage })))
const TagsPage = lazy(() => import('@/pages/TagsPage').then((m) => ({ default: m.TagsPage })))
const TrashPage = lazy(() => import('@/pages/TrashPage').then((m) => ({ default: m.TrashPage })))
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const BackupPage = lazy(() => import('@/pages/BackupPage').then((m) => ({ default: m.BackupPage })))
const ImportPage = lazy(() => import('@/pages/ImportPage').then((m) => ({ default: m.ImportPage })))
const EditorPage = lazy(() => import('@/pages/EditorPage').then((m) => ({ default: m.EditorPage })))

export default function App(): JSX.Element {
  const { ready, init, settings } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    void init()
  }, [])

  useEffect(() => {
    const offs = [
      window.api.app.onMenu('menu:newNote', () => {
        void window.api.notes.create().then((note) => navigate(`/notes/${note.id}`))
      }),
      window.api.app.onMenu('menu:focusSearch', () => navigate('/notes')),
      window.api.app.onMenu('menu:settings', () => navigate('/settings')),
      window.api.app.onReminderClicked((noteId) => navigate(`/notes/${noteId}`))
    ]
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        void window.api.notes.create().then((note) => navigate(`/notes/${note.id}`))
      }
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault()
        navigate('/settings')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      offs.forEach((off) => off())
      window.removeEventListener('keydown', onKey)
    }
  }, [navigate])

  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light', 'theme-amoled')
    root.classList.add(settings.theme === 'amoled' ? 'theme-amoled' : settings.theme === 'light' ? 'theme-light' : 'theme-dark')
    root.style.setProperty('--app-accent', settings.accent)
    root.style.setProperty('--app-accent-soft', hexToSoft(settings.accent))
  }, [settings?.theme, settings?.accent])

  useEffect(() => {
    const el = document.getElementById('content-scroll')
    el?.scrollTo({ top: 0 })
  }, [location.pathname])

  if (!ready || !settings) {
    return <Splash />
  }

  const isEditor = location.pathname.startsWith('/notes/')

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {!isEditor && <TopBar />}
      <main id="content-scroll" className="relative flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-none px-5 pt-5">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/collections/:id" element={<CollectionPage />} />
              <Route path="/favorites" element={<NotesPage preset="favorites" />} />
              <Route path="/pinned" element={<NotesPage preset="pinned" />} />
              <Route path="/locked" element={<NotesPage preset="locked" />} />
              <Route path="/archived" element={<NotesPage preset="archived" />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/trash" element={<TrashPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/backup" element={<BackupPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/notes/:id" element={<EditorPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
      {!isEditor && <BottomNav />}
      {!isEditor && <FloatingButton />}
      <Toasts />
      <AppLock />
    </div>
  )
}

function RouteFallback(): JSX.Element {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-app-accent border-t-transparent" />
    </div>
  )
}

function hexToSoft(hex: string): string {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, 0.18)`
}
