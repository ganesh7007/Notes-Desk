import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Copy, Folder, Pencil, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Collection } from '@shared/types'
import { initials, pluralize } from '@/lib/utils'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAppStore } from '@/store/appStore'

interface CollectionCardProps {
  collection: Collection
  onChanged?: () => void
  onEdit: (collection: Collection) => void
}

export function CollectionCard({ collection, onChanged, onEdit }: CollectionCardProps): JSX.Element {
  const navigate = useNavigate()
  const toast = useAppStore((s) => s.toast)
  const refreshCollections = useAppStore((s) => s.refreshCollections)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const items: MenuItem[] = [
    {
      label: collection.isFavorite ? 'Remove from favorites' : 'Add to favorites',
      icon: <Star size={15} />,
      onClick: async () => {
        await window.api.collections.update(collection.id, { isFavorite: !collection.isFavorite })
        refreshCollections()
        onChanged?.()
      }
    },
    {
      label: 'Rename / customize',
      icon: <Pencil size={15} />,
      onClick: () => onEdit(collection)
    },
    {
      label: 'Duplicate collection',
      icon: <Copy size={15} />,
      onClick: async () => {
        await window.api.collections.duplicate(collection.id)
        toast('Collection duplicated')
        refreshCollections()
      }
    },
    { separator: true },
    {
      label: 'Delete collection',
      icon: <Trash2 size={15} />,
      danger: true,
      onClick: () => setConfirmDelete(true)
    }
  ]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => navigate(`/collections/${collection.id}`)}
      className="tip-card group relative cursor-pointer overflow-hidden rounded-2xl border border-app-border bg-app-surface p-4"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{ background: `radial-gradient(120% 120% at 50% 0%, ${collection.color}, transparent 60%)` }}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white shadow-glow"
            style={{ background: `linear-gradient(135deg, ${collection.color}, color-mix(in srgb, ${collection.color} 55%, #000))` }}
          >
            {collection.icon !== 'folder' && collection.icon.length <= 2 ? collection.icon : initials(collection.name)}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Menu trigger={<MoreButton />} items={items} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <h3 className="line-clamp-1 flex-1 text-[15px] font-semibold">{collection.name}</h3>
          {collection.isFavorite && <Star size={14} className="fill-yellow-400 text-yellow-400" />}
        </div>
        <p className="mt-0.5 text-xs text-app-text-muted">
          {pluralize(collection.noteCount ?? 0, 'note')}
        </p>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete collection?"
        message={`"${collection.name}" will be deleted. Its notes will be kept but moved out of the collection.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await window.api.collections.remove(collection.id)
          toast('Collection deleted')
          setConfirmDelete(false)
          refreshCollections()
        }}
      />
    </motion.div>
  )
}

function MoreButton(): JSX.Element {
  return (
    <button className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted opacity-0 transition hover:bg-app-surface-2 hover:text-app-text group-hover:opacity-100">
      <Folder size={15} />
    </button>
  )
}