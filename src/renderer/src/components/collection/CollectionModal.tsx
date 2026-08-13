import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import type { Collection } from '@shared/types'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'
import { cx } from '@/lib/utils'

export interface CollectionModalState {
  open: boolean
  collection?: Collection
}

interface CollectionModalProps {
  state: CollectionModalState
  onClose: () => void
  onSaved: () => void
}

const PRESET_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f97316', '#ef4444', '#ec4899', '#06b6d4', '#eab308', '#84cc16', '#f43f5e']
const ICONS = ['📁', '💼', '🔐', '📈', '🎓', '💡', '🤖', '👤', '📷', '❤️', '⭐', '🔥', '🚀', '📚', '🎯']

export function CollectionModal({ state, onClose, onSaved }: CollectionModalProps): JSX.Element {
  const toast = useAppStore((s) => s.toast)
  const refreshCollections = useAppStore((s) => s.refreshCollections)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [icon, setIcon] = useState('📁')
  const [favorite, setFavorite] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (state.open) {
      setName(state.collection?.name ?? '')
      setColor(state.collection?.color ?? PRESET_COLORS[0])
      setIcon(state.collection?.icon ?? '📁')
      setFavorite(state.collection?.isFavorite ?? false)
    }
  }, [state])

  const save = async (): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      if (state.collection) {
        await window.api.collections.update(state.collection.id, { name: trimmed, color, icon, isFavorite: favorite })
        toast('Collection updated')
      } else {
        await window.api.collections.create(trimmed, color, icon)
        toast('Collection created')
      }
      await refreshCollections()
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={state.open}
      onClose={onClose}
      title={state.collection ? 'Edit collection' : 'New collection'}
      footer={
        <>
          <button className="btn-ghost text-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary text-sm" onClick={() => void save()} disabled={!name.trim() || saving}>
            {state.collection ? 'Save changes' : 'Create'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-app-text-muted">Name</label>
          <input
            autoFocus
            className="input-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
            placeholder="e.g. Cyber Security, Projects, Ideas…"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-app-text-muted">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cx(
                  'h-8 w-8 rounded-full transition-transform hover:scale-110',
                  color === c && 'ring-2 ring-app-text ring-offset-2 ring-offset-app-surface'
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-app-text-muted">Icon</label>
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map((i) => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={cx(
                  'flex h-9 w-9 items-center justify-center rounded-lg text-lg transition',
                  icon === i ? 'bg-app-accent/20 ring-1 ring-app-accent' : 'hover:bg-app-surface-2'
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setFavorite((f) => !f)}
          className={cx(
            'flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition',
            favorite ? 'border-yellow-400/40 bg-yellow-400/10' : 'border-app-border hover:bg-app-surface-2'
          )}
        >
          <span>Add to favorites</span>
          <Star size={18} className={favorite ? 'fill-yellow-400 text-yellow-400' : 'text-app-text-muted'} />
        </button>
      </div>
    </Modal>
  )
}
