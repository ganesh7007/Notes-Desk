import { X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { cx } from '@/lib/utils'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}

export function TagInput({ tags, onChange, suggestions = [], placeholder = 'Add tag' }: TagInputProps): JSX.Element {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  const commit = (raw: string): void => {
    const tag = raw.trim().replace(/^#/, '')
    if (!tag) return
    if (!tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      onChange([...tags, tag])
    }
    setValue('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(value)
    } else if (e.key === 'Backspace' && !value && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  )

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-app-border bg-app-surface-2 px-2 py-1.5 focus-within:border-app-accent focus-within:shadow-[0_0_0_3px_var(--app-accent-soft)]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-lg bg-app-accent/15 px-2 py-0.5 text-xs font-medium text-app-accent"
          >
            #{tag}
            <button
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-app-accent/70 hover:text-app-accent"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          className="min-w-[100px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => setFocused(false), 150)
          }}
          placeholder={tags.length ? '' : placeholder}
        />
      </div>
      {focused && filtered.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {filtered.slice(0, 6).map((s) => (
            <button
              key={s}
              onMouseDown={(e) => {
                e.preventDefault()
                commit(s)
              }}
              className={cx('rounded-lg bg-app-surface-2 px-2 py-0.5 text-xs text-app-text-muted hover:text-app-accent')}
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
