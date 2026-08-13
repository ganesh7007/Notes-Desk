import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Archive, Filter, LayoutGrid, LayoutList, Lock, Pin, SlidersHorizontal, Star, StickyNote } from 'lucide-react'
import type { Note, SearchFilters } from '@shared/types'
import { NotesGrid, type NoteView } from '@/components/note/NotesGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Menu } from '@/components/ui/Menu'
import { cx } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

type Preset = 'all' | 'pinned' | 'favorites' | 'locked' | 'archived'

const FILTERS: { key: Preset; label: string; icon: JSX.Element }[] = [
  { key: 'all', label: 'All', icon: <StickyNote size={14} /> },
  { key: 'pinned', label: 'Pinned', icon: <Pin size={14} /> },
  { key: 'favorites', label: 'Favorites', icon: <Star size={14} /> },
  { key: 'locked', label: 'Locked', icon: <Lock size={14} /> },
  { key: 'archived', label: 'Archived', icon: <Archive size={14} /> }
]

export function NotesPage({ preset: forcedPreset }: { preset?: Preset }): JSX.Element {
  const [params] = useSearchParams()
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)

  const [preset, setPreset] = useState<Preset>(forcedPreset ?? 'all')
  const [view, setView] = useState<NoteView>(settings?.defaultView ?? 'grid')
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const search = params.get('search') ?? ''
  const tag = params.get('tag') ?? ''

  const [advanced, setAdvanced] = useState<SearchFilters>({
    inTitle: true,
    inContent: true,
    inTags: true,
    inOcr: false,
    inCollections: true,
    hasImages: false,
    hasAttachments: false,
    dateFrom: null,
    dateTo: null
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = {
        search: search || undefined,
        tag: tag || undefined,
        pinned: preset === 'pinned' || undefined,
        favorite: preset === 'favorites' || undefined,
        locked: preset === 'locked' || undefined
      }
      const advancedActive = Object.values(advanced).some((v) => v !== false && v !== null && v !== undefined)
      const list = await window.api.notes.search(query, advancedActive ? advanced : {})
      setNotes(list)
    } finally {
      setLoading(false)
    }
  }, [search, tag, preset, advanced])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = useMemo(() => {
    const arr = [...notes]
    const order = settings?.sortOrder ?? 'updated'
    if (order === 'title') arr.sort((a, b) => a.title.localeCompare(b.title))
    else if (order === 'created') arr.sort((a, b) => b.createdAt - a.createdAt)
    else arr.sort((a, b) => b.updatedAt - a.updatedAt)
    return arr
  }, [notes, settings?.sortOrder])

  const setViewAndPersist = (v: NoteView): void => {
    setView(v)
    void updateSettings({ defaultView: v })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setPreset(f.key)}
            className={cx(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all',
              preset === f.key
                ? 'bg-app-accent text-white shadow-glow'
                : 'border border-app-border bg-app-surface text-app-text-muted hover:text-app-text'
            )}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className={cx(
              'flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition',
              filtersOpen ? 'border-app-accent bg-app-accent/10 text-app-accent' : 'border-app-border text-app-text-muted hover:text-app-text'
            )}
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
          <Menu
            width="w-44"
            trigger={
              <button className="flex h-9 items-center gap-1.5 rounded-xl border border-app-border px-3 text-xs font-medium text-app-text-muted hover:text-app-text">
                <Filter size={14} /> Sort
              </button>
            }
            items={[
              { label: 'Last modified', onClick: () => void updateSettings({ sortOrder: 'updated' }), separator: settings?.sortOrder === 'updated' },
              { label: 'Date created', onClick: () => void updateSettings({ sortOrder: 'created' }) },
              { label: 'Title', onClick: () => void updateSettings({ sortOrder: 'title' }) }
            ]}
          />
          <SegmentedControl
            size="sm"
            value={view}
            onChange={setViewAndPersist}
            options={[
              { value: 'grid', label: 'Grid', icon: <LayoutGrid size={14} /> },
              { value: 'card', label: 'Card', icon: <StickyNote size={14} /> },
              { value: 'list', label: 'List', icon: <LayoutList size={14} /> }
            ]}
          />
        </div>
      </div>

      {filtersOpen && (
        <AdvancedFilters value={advanced} onChange={setAdvanced} />
      )}

      <div>
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[160px] animate-pulse rounded-2xl bg-app-surface-2" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<StickyNote size={28} />}
            title={search ? 'No results found' : 'No notes here'}
            subtitle={search ? `Nothing matches "${search}". Try different keywords or filters.` : 'Notes you create will appear here.'}
          />
        ) : (
          <NotesGrid notes={sorted} view={view} onChanged={() => void load()} />
        )}
      </div>
    </div>
  )
}

function AdvancedFilters({ value, onChange }: { value: SearchFilters; onChange: (v: SearchFilters) => void }): JSX.Element {
  const toggle = (key: keyof SearchFilters): void => {
    onChange({ ...value, [key]: !value[key] as boolean })
  }
  const set = (key: 'dateFrom' | 'dateTo', val: number | null): void => {
    onChange({ ...value, [key]: val })
  }

  const check = (label: string, key: keyof SearchFilters, enabled: boolean): JSX.Element => (
    <label className={cx('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[13px] transition', enabled ? 'border-app-accent/50 bg-app-accent/10' : 'border-app-border hover:bg-app-surface-2')}>
      <input type="checkbox" className="accent-[var(--app-accent)]" checked={enabled} onChange={() => toggle(key)} />
      {label}
    </label>
  )

  return (
    <div className="rounded-2xl border border-app-border bg-app-surface p-4">
      <div className="flex flex-wrap gap-2">
        {check('Search in titles', 'inTitle', value.inTitle ?? true)}
        {check('Search in content', 'inContent', value.inContent ?? true)}
        {check('Search in tags', 'inTags', value.inTags ?? true)}
        {check('Search in OCR text', 'inOcr', value.inOcr ?? false)}
        {check('Has images', 'hasImages', value.hasImages ?? false)}
        {check('Has attachments', 'hasAttachments', value.hasAttachments ?? false)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="text-xs text-app-text-muted">From</label>
        <input
          type="date"
          className="input-base !w-auto"
          value={value.dateFrom ? new Date(value.dateFrom).toISOString().slice(0, 10) : ''}
          onChange={(e) => set('dateFrom', e.target.value ? new Date(e.target.value).getTime() : null)}
        />
        <label className="text-xs text-app-text-muted">To</label>
        <input
          type="date"
          className="input-base !w-auto"
          value={value.dateTo ? new Date(value.dateTo).toISOString().slice(0, 10) : ''}
          onChange={(e) => set('dateTo', e.target.value ? new Date(e.target.value + 'T23:59:59').getTime() : null)}
        />
        <button
          className="ml-auto text-xs font-medium text-app-accent"
          onClick={() =>
            onChange({
              inTitle: true,
              inContent: true,
              inTags: true,
              inOcr: false,
              inCollections: true,
              hasImages: false,
              hasAttachments: false,
              dateFrom: null,
              dateTo: null
            })
          }
        >
          Reset filters
        </button>
      </div>
    </div>
  )
}
