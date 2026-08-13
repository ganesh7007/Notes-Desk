import { useEffect, useRef, useState } from 'react'
import {
  Brush,
  Circle,
  Eraser,
  ImageDown,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  RotateCcw,
  Square,
  Undo2
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'
import { cx } from '@/lib/utils'

type Tool = 'brush' | 'pencil' | 'marker' | 'eraser' | 'line' | 'arrow' | 'circle' | 'rect'

const COLORS = ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000']

interface DrawingModalProps {
  open: boolean
  onClose: () => void
  onInsertImage: (src: string) => void
}

export function DrawingModal({ open, onClose, onInsertImage }: DrawingModalProps): JSX.Element {
  const toast = useAppStore((s) => s.toast)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState('#ffffff')
  const [size, setSize] = useState(4)
  const [undoStack, setUndoStack] = useState<ImageData[]>([])
  const [redoStack, setRedoStack] = useState<ImageData[]>([])
  const drawingRef = useRef(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = 900
        canvas.height = 540
        if (overlayRef.current) {
          overlayRef.current.width = 900
          overlayRef.current.height = 540
        }
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#0d1420'
        ctx.fillRect(0, 0, 900, 540)
        setUndoStack([])
        setRedoStack([])
        pushUndo()
      }
    }
  }, [open])

  const snapshot = (): ImageData | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
  }

  const pushUndo = (): void => {
    const img = snapshot()
    if (img) setUndoStack((s) => [...s.slice(-29), img])
  }

  const lineWidth = (): number => {
    if (tool === 'pencil') return Math.max(1, size / 2)
    if (tool === 'marker') return size * 2
    if (tool === 'eraser') return size * 2.5
    return size
  }

  const globalAlpha = (): number => (tool === 'marker' ? 0.35 : 1)

  const pos = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const drawShapePreview = (current: { x: number; y: number }): void => {
    const overlay = overlayRef.current!
    const octx = overlay.getContext('2d')!
    const start = startRef.current!
    octx.clearRect(0, 0, overlay.width, overlay.height)
    octx.strokeStyle = color
    octx.lineWidth = lineWidth()
    octx.globalAlpha = globalAlpha()
    octx.lineCap = 'round'
    if (tool === 'line' || tool === 'arrow') {
      octx.beginPath()
      octx.moveTo(start.x, start.y)
      octx.lineTo(current.x, current.y)
      octx.stroke()
      if (tool === 'arrow') {
        const angle = Math.atan2(current.y - start.y, current.x - start.x)
        const h = 18
        octx.beginPath()
        octx.moveTo(current.x, current.y)
        octx.lineTo(current.x - h * Math.cos(angle - 0.4), current.y - h * Math.sin(angle - 0.4))
        octx.moveTo(current.x, current.y)
        octx.lineTo(current.x - h * Math.cos(angle + 0.4), current.y - h * Math.sin(angle + 0.4))
        octx.stroke()
      }
    } else if (tool === 'circle') {
      octx.beginPath()
      octx.ellipse(
        (start.x + current.x) / 2,
        (start.y + current.y) / 2,
        Math.abs(current.x - start.x) / 2,
        Math.abs(current.y - start.y) / 2,
        0, 0, Math.PI * 2
      )
      octx.stroke()
    } else if (tool === 'rect') {
      octx.strokeRect(Math.min(start.x, current.x), Math.min(start.y, current.y), Math.abs(current.x - start.x), Math.abs(current.y - start.y))
    }
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const p = pos(e)
    drawingRef.current = true
    startRef.current = p
    if (tool !== 'eraser') ctx.globalCompositeOperation = 'source-over'
    else ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = lineWidth()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = globalAlpha()
    if (tool === 'brush' || tool === 'pencil' || tool === 'marker' || tool === 'eraser') {
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + 0.1, p.y + 0.1)
      ctx.stroke()
    }
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current!
    if (tool === 'brush' || tool === 'pencil' || tool === 'marker' || tool === 'eraser') {
      const ctx = canvas.getContext('2d')!
      const p = pos(e)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    } else {
      drawShapePreview(pos(e))
    }
  }

  const onPointerUp = (): void => {
    if (!drawingRef.current) return
    drawingRef.current = false
    const overlay = overlayRef.current!
    const octx = overlay.getContext('2d')!
    if (startRef.current && tool !== 'brush' && tool !== 'pencil' && tool !== 'marker' && tool !== 'eraser') {
      const ctx = canvasRef.current!.getContext('2d')!
      ctx.globalAlpha = globalAlpha()
      ctx.drawImage(overlay, 0, 0)
      octx.clearRect(0, 0, overlay.width, overlay.height)
    }
    ctxReset()
    pushUndo()
    setRedoStack([])
  }

  const ctxReset = (): void => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  const undo = (): void => {
    if (undoStack.length === 0) return
    const current = snapshot()
    if (current) setRedoStack((s) => [...s, current])
    const prev = undoStack[undoStack.length - 1]
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.putImageData(prev, 0, 0)
    setUndoStack((s) => s.slice(0, -1))
  }

  const redo = (): void => {
    if (redoStack.length === 0) return
    const current = snapshot()
    if (current) setUndoStack((s) => [...s, current])
    const next = redoStack[redoStack.length - 1]
    canvasRef.current!.getContext('2d')!.putImageData(next, 0, 0)
    setRedoStack((s) => s.slice(0, -1))
  }

  const clear = (): void => {
    pushUndo()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0d1420'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setRedoStack([])
  }

  const exportImage = async (): Promise<void> => {
    setBusy(true)
    try {
      const canvas = canvasRef.current!
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('export failed')
      const buffer = await blob.arrayBuffer()
      const saved = await window.api.media.saveAs({ buffer, ext: '.png', kind: 'image', name: 'drawing.png' })
      onInsertImage(`appmedia://${saved.rel}`)
      toast('Drawing inserted')
      onClose()
    } catch (e) {
      toast('Failed to export drawing', e instanceof Error ? e.message : undefined, 'error')
    } finally {
      setBusy(false)
    }
  }

  const toolBtn = (t: Tool, label: string, icon: JSX.Element): JSX.Element => (
    <button
      onClick={() => setTool(t)}
      title={label}
      className={cx('flex h-9 w-9 items-center justify-center rounded-lg transition', tool === t ? 'bg-app-accent text-white' : 'text-app-text-muted hover:bg-app-surface-2 hover:text-app-text')}
    >
      {icon}
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} title="Drawing" maxWidth="max-w-4xl">
      <div className="flex flex-wrap items-center gap-1.5">
        {toolBtn('brush', 'Brush', <Brush size={16} />)}
        {toolBtn('pencil', 'Pencil', <Pencil size={16} />)}
        {toolBtn('marker', 'Marker', <MousePointer2 size={16} />)}
        {toolBtn('eraser', 'Eraser', <Eraser size={16} />)}
        <div className="mx-1 h-6 w-px bg-app-border" />
        {toolBtn('line', 'Line', <Minus size={16} />)}
        {toolBtn('arrow', 'Arrow', <MousePointer2 size={16} />)}
        {toolBtn('circle', 'Circle', <Circle size={16} />)}
        {toolBtn('rect', 'Rectangle', <Square size={16} />)}
        <div className="mx-1 h-6 w-px bg-app-border" />
        <button onClick={undo} disabled={!undoStack.length} className="flex h-9 w-9 items-center justify-center rounded-lg text-app-text-muted transition hover:bg-app-surface-2 disabled:opacity-30" title="Undo">
          <Undo2 size={16} />
        </button>
        <button onClick={redo} disabled={!redoStack.length} className="flex h-9 w-9 items-center justify-center rounded-lg text-app-text-muted transition hover:bg-app-surface-2 disabled:opacity-30" title="Redo">
          <Redo2 size={16} />
        </button>
        <button onClick={clear} className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs text-app-text-muted transition hover:bg-app-surface-2" title="Clear">
          <RotateCcw size={14} /> Clear
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={cx('h-6 w-6 rounded-full transition hover:scale-110', color === c && 'ring-2 ring-app-text')} style={{ background: c, outline: c === '#ffffff' ? '1px solid var(--app-border)' : undefined }} />
            ))}
          </div>
          <input type="range" min={1} max={24} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-24 accent-[var(--app-accent)]" />
          <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => void exportImage()} disabled={busy}>
            <ImageDown size={15} /> Insert
          </button>
        </div>
      </div>
      <div className="relative mt-3 overflow-hidden rounded-xl border border-app-border">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 'auto', touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ width: '100%', height: 'auto' }} />
      </div>
    </Modal>
  )
}