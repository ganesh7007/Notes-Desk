import type { ReactNode } from 'react'
import { cx } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  value: T
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'md'
}: SegmentedControlProps<T>): JSX.Element {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-app-border bg-app-surface-2 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cx(
            'flex items-center gap-1.5 rounded-[10px] font-medium transition-all',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
            value === opt.value
              ? 'bg-app-surface text-app-text shadow-soft'
              : 'text-app-text-muted hover:text-app-text'
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  )
}
