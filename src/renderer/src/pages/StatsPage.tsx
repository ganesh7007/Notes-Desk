import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import {
  Archive,
  BarChart3,
  CalendarRange,
  File,
  FolderHeart,
  HardDrive,
  Image as ImageIcon,
  Lock,
  Pin,
  StickyNote,
  Tags as TagsIcon,
  Timer
} from 'lucide-react'
import type { Note, Stats } from '@shared/types'
import { formatBytes } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f97316', '#ef4444', '#ec4899', '#06b6d4', '#eab308']

export function StatsPage(): JSX.Element {
  const [stats, setStats] = useState<Stats | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const toast = useAppStore((s) => s.toast)

  const load = useCallback(async () => {
    const [s, all] = await Promise.all([window.api.notes.stats(), window.api.notes.list()])
    setStats(s)
    setNotes(all)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const daily = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(5, 10)
      map.set(key, 0)
    }
    for (const note of notes) {
      const key = new Date(note.createdAt).toISOString().slice(5, 10)
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].map(([date, count]) => ({ date, count }))
  }, [notes])

  const byCollection = useMemo(() => {
    const map = new Map<string, number>()
    for (const note of notes) {
      const name = note.collectionName ?? 'Uncategorized'
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [notes])

  const storageBreakdown = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Images', value: Math.max(stats.images, 1) },
      { name: 'Attachments', value: Math.max(stats.attachments, 1) },
      { name: 'Collections', value: Math.max(stats.collections, 1) },
      { name: 'Notes', value: Math.max(stats.totalNotes, 1) }
    ]
  }, [stats])

  if (!stats) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-app-accent border-t-transparent" /></div>
  }

  const cards = [
    { label: 'Total notes', value: stats.totalNotes, icon: <StickyNote size={18} />, color: '#8b5cf6' },
    { label: 'Active notes', value: stats.activeNotes, icon: <Archive size={18} />, color: '#3b82f6' },
    { label: 'Collections', value: stats.collections, icon: <FolderHeart size={18} />, color: '#22c55e' },
    { label: 'Images', value: stats.images, icon: <ImageIcon size={18} />, color: '#f97316' },
    { label: 'Attachments', value: stats.attachments, icon: <File size={18} />, color: '#ec4899' },
    { label: 'Pinned', value: stats.pinned, icon: <Pin size={18} />, color: '#eab308' },
    { label: 'Favorites', value: stats.favorites, icon: <BarChart3 size={18} />, color: '#ef4444' },
    { label: 'Locked', value: stats.locked, icon: <Lock size={18} />, color: '#06b6d4' },
    { label: 'Today', value: stats.todayNotes, icon: <CalendarRange size={18} />, color: '#a855f7' },
    { label: 'This week', value: stats.weekNotes, icon: <Timer size={18} />, color: '#84cc16' },
    { label: 'This month', value: stats.monthNotes, icon: <TagsIcon size={18} />, color: '#f43f5e' },
    { label: 'Storage used', value: formatBytes(stats.totalSize), icon: <HardDrive size={18} />, color: '#64748b' }
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-app-border bg-app-surface p-4">
            <div className="flex items-center gap-2 text-app-text-muted" style={{ color: c.color }}>
              {c.icon}
              <span className="text-xs font-medium">{c.label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-app-border bg-app-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Notes created — last 30 days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
              <Tooltip
                contentStyle={{ background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 10, color: 'var(--app-text)' }}
                cursor={{ fill: 'var(--app-accent-soft)' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--app-accent)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Notes per collection</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byCollection} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 10 }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="var(--app-accent)">
                {byCollection.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Content breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={storageBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                {storageBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 10 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Activity summary</h3>
          <div className="space-y-3">
            <SummaryRow label="In trash" value={stats.inTrash} />
            <SummaryRow label="Active reminders" value={stats.remindersActive} />
            <SummaryRow label="Tagged notes" value={stats.tags} />
            <SummaryRow label="Storage used" value={formatBytes(stats.totalSize)} />
            <div className="rounded-xl bg-app-surface-2 p-3 text-xs text-app-text-muted">
              <p className="mb-1 font-semibold text-app-text">Tip</p>
              <p>Keep your knowledge organized. Use collections for categories, tags for cross-cutting topics, and pin the notes you reach for every day.</p>
            </div>
            <button
              className="btn-ghost w-full text-xs"
              onClick={async () => {
                const { path } = await window.api.backup.create('manual')
                toast('Backup created')
                void path
              }}
            >
              Create a backup now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: number | string }): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-xl border border-app-border px-3 py-2.5 text-sm">
      <span className="text-app-text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
