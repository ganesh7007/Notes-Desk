import { useCallback, useEffect, useRef, useState } from 'react'
import { Brush, Crop, FlipHorizontal, FlipVertical, ImageDown, Loader2, RotateCcw, ScanText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'
import { cx } from '@/lib/utils'

const BRUSH_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#0f172a']

interface ImageEditorModalProps {
  open: boolean
  src: string
  onClose: () => void
  onSave: (newSrc: string) => void
  onOcr?: (src: string) => void
}

export function ImageEditorModal({ open, src, onClose, onSave, onOcr }: ImageEditorModalProps): JSX.Element {
  const toast = useAppStore((s) => s.toast)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [mode, setMode] = useState<'brush' | 'crop'>('brush')
  const [brushColor, setBrushColor] = useState('#ef4444')
  const [brushSize, setBrushSize] = useState(6)
  const [filter, setFilter] = useState({ brightness: 100, contrast: 100 })
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const el = new Image()
    el.onload = () => setImg(el)
    el.src = src
    setCropRect(null)
    setMode('brush')
    setFilter({ brightness: 100, contrast: 100 })
    return () => setImg(null)
  }, [open, src])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.filter = `brightness(${filter.brightness}%) contrast(${filter.contrast}%)`
    ctx.drawImage(img, 0, 0)
    ctx.filter = 'none'
  }, [img, filter])

  useEffect(() => {
    draw()
  }, [draw])

  const rebake = (dataUrl: string): void => {
    const el = new Image()
    el.onload = () => setImg(el)
    el.src = dataUrl
    setCropRect(null)
  }

  const rotate = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.width
    const h = canvas.height
    const out = document.createElement('canvas')
    out.width = h
    out.height = w
    const octx = out.getContext('2d')!
    octx.translate(h, 0)
    octx.rotate(Math.PI / 2)
    octx.drawImage(canvas, 0, 0)
    rebake(out.toDataURL('image/png'))
  }

  const flip = (horizontal: boolean): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = canvas.height
    const octx = out.getContext('2d')!
    octx.translate(horizontal ? out.width : 0, horizontal ? 0 : out.height)
    octx.scale(horizontal ? -1 : 1, horizontal ? 1 : -1)
    octx.drawImage(canvas, 0, 0)
    rebake(out.toDataURL('image/png'))
  }

  const applyCrop = (): void => {
    const canvas = canvasRef.current
    if (!canvas || !cropRect) return
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(cropRect.w))
    out.height = Math.max(1, Math.round(cropRect.h))
    const octx = out.getContext('2d')!
    octx.drawImage(canvas, Math.round(cropRect.x), Math.round(cropRect.y), Math.round(cropRect.w), Math.round(cropRect.h), 0, 0, out.width, out.height)
    rebake(out.toDataURL('image/png'))
  }

  const pos = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    }
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    e.preventDefault()
    setDragging(true)
    dragStartRef.current = pos(e)
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    const canvas = canvasRef.current
    if (!canvas || !dragging || !dragStartRef.current) return
    const ctx = canvas.getContext('2d')!
    const p = pos(e)
    if (mode === 'brush') {
      ctx.strokeStyle = brushColor
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(dragStartRef.current.x, dragStartRef.current.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      dragStartRef.current = p
    } else {
      const start = dragStartRef.current
      setCropRect({
        x: Math.min(start.x, p.x),
        y: Math.min(start.y, p.y),
        w: Math.abs(p.x - start.x),
        h: Math.abs(p.y - start.y)
      })
    }
  }

  const onPointerUp = (): void => {
    setDragging(false)
    dragStartRef.current = null
  }

  const exportImage = async (): Promise<void> => {
    const canvas = canvasRef.current
    if (!canvas) return
    setBusy(true)
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('export failed')
      const buffer = await blob.arrayBuffer()
      const saved = await window.api.media.saveAs({ buffer, ext: '.png', kind: 'image', name: 'edited.png' })
      onSave(`appmedia://${saved.rel}`)
      toast('Image updated')
      onClose()
    } catch (e) {
      toast('Failed to save image', e instanceof Error ? e.message : undefined, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit image" maxWidth="max-w-4xl">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolBtn active={mode === 'brush'} onClick={() => setMode('brush')} label="Draw">
            <Brush size={16} />
          </ToolBtn>
          <ToolBtn active={mode === 'crop'} onClick={() => setMode('crop')} label="Crop">
            <Crop size={16} />
          </ToolBtn>
          <div className="mx-1 h-6 w-px bg-app-border" />
          <ToolBtn onClick={rotate} label="Rotate 90°"><RotateCcw size={16} /></ToolBtn>
          <ToolBtn onClick={() => flip(true)} label="Flip horizontally"><FlipHorizontal size={16} /></ToolBtn>
          <ToolBtn onClick={() => flip(false)} label="Flip vertically"><FlipVertical size={16} /></ToolBtn>
          <div className="mx-1 h-6 w-px bg-app-border" />
          {mode === 'brush' && (
            <>
              <div className="flex gap-1">
                {BRUSH_COLORS.map((c) => (
                  <button key={c} onClick={() => setBrushColor(c)} className={cx('h-6 w-6 rounded-full transition hover:scale-110', brushColor === c && 'ring-2 ring-app-text')} style={{ background: c }} />
                ))}
              </div>
              <input type="range" min={2} max={30} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-20 accent-[var(--app-accent)]" />
            </>
          )}
          {mode === 'crop' && (
            <span className="text-xs text-app-text-muted">Drag on the image to select a region</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-app-text-muted">
              Brightness
              <input type="range" min={50} max={150} value={filter.brightness} onChange={(e) => setFilter({ ...filter, brightness: Number(e.target.value) })} className="w-20 accent-[var(--app-accent)]" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-app-text-muted">
              Contrast
              <input type="range" min={50} max={150} value={filter.contrast} onChange={(e) => setFilter({ ...filter, contrast: Number(e.target.value) })} className="w-20 accent-[var(--app-accent)]" />
            </label>
          </div>
        </div>

        {mode === 'crop' && cropRect && (
          <button className="btn-primary text-xs" onClick={applyCrop}>
            Apply crop
          </button>
        )}

        <div className="relative max-h-[52vh] overflow-auto rounded-xl border border-app-border">
          <canvas
            ref={canvasRef}
            className="max-w-full"
            style={{ touchAction: 'none', cursor: mode === 'brush' ? 'crosshair' : 'crosshair', maxHeight: '52vh' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          {mode === 'crop' && cropRect && img && (
            <div
              className="pointer-events-none absolute border-2 border-app-accent bg-app-accent/15"
              style={{
                left: `${(cropRect.x / canvasRef.current!.width) * 100}%`,
                top: `${(cropRect.y / canvasRef.current!.height) * 100}%`,
                width: `${(cropRect.w / canvasRef.current!.width) * 100}%`,
                height: `${(cropRect.h / canvasRef.current!.height) * 100}%`
              }}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={() => onOcr?.(src)}>
            <ScanText size={15} /> OCR
          </button>
          <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => void exportImage()} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ImageDown size={15} />}
            Save changes
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ToolBtn({ children, onClick, label, active }: { children: React.ReactNode; onClick: () => void; label: string; active?: boolean }): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cx('flex h-9 w-9 items-center justify-center rounded-lg transition', active ? 'bg-app-accent text-white' : 'text-app-text-muted hover:bg-app-surface-2 hover:text-app-text')}
    >
      {children}
    </button>
  )
}