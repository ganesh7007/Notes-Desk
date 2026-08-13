import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, FolderPlus } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export function FloatingButton(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useAppStore((s) => s.toast)
  const refreshCollections = useAppStore((s) => s.refreshCollections)

  const isCollections = location.pathname === '/collections'
  const isTrash = location.pathname === '/trash'
  const isSettings =
    location.pathname === '/settings' ||
    location.pathname === '/backup' ||
    location.pathname === '/import' ||
    location.pathname === '/stats' ||
    location.pathname === '/calendar' ||
    location.pathname === '/tags'

  if (isTrash || isSettings) return <></>

  const create = async (): Promise<void> => {
    if (isCollections) {
      const collection = await window.api.collections.create('New Collection', '#8b5cf6', 'folder')
      toast('Collection created')
      await refreshCollections()
      navigate(`/collections/${collection.id}`)
      return
    }
    const note = await window.api.notes.create()
    navigate(`/notes/${note.id}`)
  }

  return (
    <motion.button
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      onClick={() => void create()}
      title={isCollections ? 'New collection' : 'New note'}
      className="fixed bottom-20 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-card"
      style={{
        background: 'linear-gradient(135deg, var(--app-accent), color-mix(in srgb, var(--app-accent) 55%, #22d3ee))',
        boxShadow: '0 8px 30px var(--app-accent-soft)'
      }}
    >
      {isCollections ? <FolderPlus size={24} /> : <Plus size={26} />}
    </motion.button>
  )
}
