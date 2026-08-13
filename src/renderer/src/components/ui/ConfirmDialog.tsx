import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element {
  return (
    <Modal open={open} onClose={onCancel} maxWidth="max-w-sm" hideClose>
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            danger ? 'bg-red-500/15 text-red-400' : 'bg-app-accent/15 text-app-accent'
          }`}
        >
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-app-text-muted">{message}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost text-sm" onClick={onCancel}>
          Cancel
        </button>
        <button
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 ${
            danger ? 'bg-red-500' : 'bg-app-accent'
          }`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
