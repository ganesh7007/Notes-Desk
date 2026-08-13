import { create } from 'zustand'
import type { Collection, Settings } from '@shared/types'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  title: string
  message?: string
  type: ToastType
}

interface AppState {
  ready: boolean
  settings: Settings | null
  collections: Collection[]
  toasts: Toast[]
  init: () => Promise<void>
  refreshCollections: () => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  toast: (title: string, message?: string, type?: ToastType) => void
  dismissToast: (id: number) => void
}

let toastId = 0

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  settings: null,
  collections: [],
  toasts: [],
  init: async () => {
    const [settings, collections] = await Promise.all([
      window.api.settings.getAll(),
      window.api.collections.list()
    ])
    set({ settings, collections, ready: true })
  },
  refreshCollections: async () => {
    const collections = await window.api.collections.list()
    set({ collections })
  },
  updateSettings: async (patch) => {
    const current = get().settings
    if (!current) return
    const next = { ...current, ...patch }
    set({ settings: next })
    await window.api.settings.setMany(patch as Record<string, unknown>)
  },
  toast: (title, message, type = 'info') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, title, message, type }] }))
    setTimeout(() => get().dismissToast(id), 3600)
  },
  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  }
}))
