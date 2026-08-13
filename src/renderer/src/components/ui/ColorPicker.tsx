import { Check } from 'lucide-react'
import { cx } from '@/lib/utils'
import type { NoteColor } from '@shared/types'

export const NOTE_COLORS: { key: NoteColor; name: string; hex: string }[] = [
  { key: 'default', name: 'None', hex: '#64748b' },
  { key: 'red', name: 'Red', hex: '#ef4444' },
  { key: 'orange', name: 'Orange', hex: '#f97316' },
  { key: 'yellow', name: 'Yellow', hex: '#eab308' },
  { key: 'green', name: 'Green', hex: '#22c55e' },
  { key: 'teal', name: 'Teal', hex: '#14b8a6' },
  { key: 'blue', name: 'Blue', hex: '#3b82f6' },
  { key: 'indigo', name: 'Indigo', hex: '#6366f1' },
  { key: 'purple', name: 'Purple', hex: '#a855f7' },
  { key: 'pink', name: 'Pink', hex: '#ec4899' },
  { key: 'gray', name: 'Gray', hex: '#94a3b8' }
]

interface ColorPickerProps {
  value: NoteColor
  onChange: (color: NoteColor) => void
  size?: 'sm' | 'md'
}

export function ColorPicker({ value, onChange, size = 'md' }: ColorPickerProps): JSX.Element {
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
  return (
    <div className="flex flex-wrap items-center gap-2">
      {NOTE_COLORS.map((c) => (
        <button
          key={c.key}
          title={c.name}
          onClick={() => onChange(c.key)}
          className={cx(
            'relative flex items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
            dim,
            value === c.key ? 'border-app-text' : 'border-transparent'
          )}
          style={{ background: c.key === 'default' ? 'var(--app-surface-2)' : c.hex }}
        >
          {value === c.key && <Check size={size === 'sm' ? 12 : 14} className="text-white drop-shadow" />}
        </button>
      ))}
    </div>
  )
}
