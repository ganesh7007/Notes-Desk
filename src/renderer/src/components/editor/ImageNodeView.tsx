import { useCallback, useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Minus, Move, Plus, RotateCcw, ScanText, Trash2 } from 'lucide-react'

const ROTATIONS = [0, 90, 180, 270]

export function ImageNodeView({ node, updateAttributes, selected, editor }: NodeViewProps): JSX.Element {
  const [editingWidth, setEditingWidth] = useState(false)
  const [width, setWidth] = useState<number>(Number(node.attrs.width) || 640)

  const rot = (node.attrs.rotate as number) ?? 0
  const flipX = Boolean(node.attrs.flipX)
  const flipY = Boolean(node.attrs.flipY)

  const resize = useCallback(
    (w: number) => {
      const next = Math.min(1200, Math.max(120, w))
      setWidth(next)
      updateAttributes({ width: next })
    },
    [updateAttributes]
  )

  const openAnnotate = (): void => {
    window.dispatchEvent(new CustomEvent('notesapp:annotate', { detail: { src: node.attrs.src } }))
  }

  const openOcr = (): void => {
    window.dispatchEvent(new CustomEvent('notesapp:ocr', { detail: { src: node.attrs.src } }))
  }

  return (
    <NodeViewWrapper className="relative my-2 flex justify-center">
      <div
        className={`group relative overflow-hidden rounded-xl ${selected ? 'ring-2 ring-app-accent' : ''}`}
        style={{ width, transform: `rotate(${rot}deg) scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`, transition: 'transform 0.2s ease' }}
      >
        <img src={node.attrs.src as string} alt={(node.attrs.alt as string) ?? ''} className="w-full" draggable={false} />

        {selected && (
          <div className="absolute -top-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-app-border bg-app-surface p-1 shadow-card">
            <ToolbarBtn title="Smaller" onClick={() => resize(width - 40)}>
              <Minus size={14} />
            </ToolbarBtn>
            <div className="flex items-center gap-1 px-1">
              <input
                type="range"
                min={120}
                max={1200}
                step={10}
                value={width}
                onChange={(e) => resize(Number(e.target.value))}
                onFocus={() => setEditingWidth(true)}
                onBlur={() => setEditingWidth(false)}
                className="w-20 accent-[var(--app-accent)]"
              />
              <span className="w-8 text-center text-[10px] text-app-text-muted">{editingWidth ? width : ''}</span>
            </div>
            <ToolbarBtn title="Larger" onClick={() => resize(width + 40)}>
              <Plus size={14} />
            </ToolbarBtn>
            <div className="mx-0.5 h-5 w-px bg-app-border" />
            <ToolbarBtn title="Rotate" onClick={() => updateAttributes({ rotate: ROTATIONS[(ROTATIONS.indexOf(rot) + 1) % 4] })}>
              <RotateCcw size={14} />
            </ToolbarBtn>
            <ToolbarBtn title="Flip horizontally" onClick={() => updateAttributes({ flipX: !flipX })}>
              <Move size={14} />
            </ToolbarBtn>
            <div className="mx-0.5 h-5 w-px bg-app-border" />
            <ToolbarBtn title="Annotate / edit image" onClick={openAnnotate}>
              <ScanText size={14} />
            </ToolbarBtn>
            <ToolbarBtn title="Extract text (OCR)" onClick={openOcr}>
              <ScanText size={14} />
            </ToolbarBtn>
            <div className="mx-0.5 h-5 w-px bg-app-border" />
            <ToolbarBtn title="Remove image" danger onClick={() => editor.commands.deleteSelection()}>
              <Trash2 size={14} />
            </ToolbarBtn>
          </div>
        )}

        {/* resize handle */}
        {selected && (
          <div
            className="absolute bottom-1 right-1 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-app-accent bg-white/80"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const startX = e.clientX
              const startW = width
              const onMove = (ev: MouseEvent): void => {
                resize(startW + (ev.clientX - startX) * 2)
              }
              const onUp = (): void => {
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}

function ToolbarBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }): JSX.Element {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-app-text-muted hover:bg-app-surface-2 hover:text-app-text'}`}
    >
      {children}
    </button>
  )
}
