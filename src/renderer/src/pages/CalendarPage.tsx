import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, StickyNote } from 'lucide-react'
import type { Note } from '@shared/types'
import { NotesGrid } from '@/components/note/NotesGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { cx } from '@/lib/utils'

export function CalendarPage(): JSX.Element {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [dayNotes, setDayNotes] = useState<Note[]>([])

  const loadCounts = useCallback(async () => {
    const data = await window.api.notes.calendar(year, month)
    const map: Record<string, number> = {}
    for (const d of data) map[d.date] = d.count
    setCounts(map)
  }, [year, month])

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  useEffect(() => {
    if (selected) {
      void window.api.notes.list({ date: selected }).then(setDayNotes)
    } else {
      setDayNotes([])
    }
  }, [selected])

  const grid = useMemo(() => {
    const first = new Date(year, month, 1)
    const startDay = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = [
      ...Array.from({ length: startDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  const dateStr = (day: number): string => {
    const d = new Date(year, month, day)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${dd}`
  }

  const monthName = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const todayStr = dateStr(today.getDate())

  const moveMonth = (delta: number): void => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelected(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CalendarDays size={22} className="text-app-accent" /> Calendar
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => moveMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border text-app-text-muted transition hover:text-app-text">
            <ChevronLeft size={17} />
          </button>
          <span className="w-44 text-center text-sm font-semibold">{monthName}</span>
          <button onClick={() => moveMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border text-app-text-muted transition hover:text-app-text">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-app-border bg-app-surface p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-app-text-muted">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((day, i) => {
            if (day === null) return <div key={i} />
            const ds = dateStr(day)
            const count = counts[ds] ?? 0
            const isToday = ds === todayStr
            const isSelected = ds === selected
            return (
              <button
                key={i}
                onClick={() => setSelected(isSelected ? null : ds)}
                className={cx(
                  'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition',
                  isSelected
                    ? 'bg-app-accent text-white'
                    : isToday
                      ? 'border border-app-accent/60 text-app-accent'
                      : 'text-app-text hover:bg-app-surface-2'
                )}
              >
                <span className="font-medium">{day}</span>
                {count > 0 && (
                  <span
                    className={cx(
                      'mt-0.5 rounded-full px-1.5 text-[10px] font-bold',
                      isSelected ? 'bg-white/25 text-white' : 'bg-app-accent/15 text-app-accent'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <StickyNote size={17} className="text-app-accent" />
          {selected ? new Date(selected).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a day'}
        </h2>
        {selected && dayNotes.length === 0 ? (
          <EmptyState icon={<StickyNote size={26} />} title="No notes on this day" subtitle="This is a quiet day. Perfect time to write something." />
        ) : selected ? (
          <NotesGrid notes={dayNotes} view="grid" onChanged={() => void window.api.notes.list({ date: selected }).then(setDayNotes)} />
        ) : (
          <p className="text-sm text-app-text-muted">Pick a day to view its notes and journal.</p>
        )}
      </div>
    </div>
  )
}
