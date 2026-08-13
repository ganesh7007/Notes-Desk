import { useEffect, useState } from 'react'
import { Copy, FileSearch, Image as ImageIcon, Loader2, ScanText, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'

const OCR_LANGS = ['eng', 'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'hin', 'ara', 'jpn', 'kor', 'chi_sim']

interface OcrModalProps {
  open: boolean
  noteId: string
  initialSrc?: string | null
  onClose: () => void
  onInsertText: (text: string) => void
}

export function OcrModal({ open, noteId: _noteId, initialSrc, onClose, onInsertText }: OcrModalProps): JSX.Element {
  const toast = useAppStore((s) => s.toast)
  const [src, setSrc] = useState<string | null>(null)
  const [lang, setLang] = useState('eng')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ text: string; confidence: number } | null>(null)
  const [ready, setReady] = useState<boolean | null>(null)

  useEffect(() => {
    if (open) {
      setSrc(initialSrc ?? null)
      setResult(null)
      setReady(null)
      setBusy(false)
    }
  }, [open, initialSrc])

  useEffect(() => {
    if (open && src && ready === null) {
      void window.api.ocr.status(lang).then((s) => setReady(s.available))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, src])

  const pickImage = async (): Promise<void> => {
    const files = await window.api.media.pick('image')
    if (files?.length) setSrc(files[0])
  }

  const run = async (): Promise<void> => {
    if (!src) return
    setBusy(true)
    try {
      const res = await window.api.ocr.extract(src, lang)
      setResult(res)
      if (!res.text) toast('No text found in image', undefined, 'info')
    } catch (e) {
      toast('OCR failed', e instanceof Error ? e.message : undefined, 'error')
    } finally {
      setBusy(false)
    }
  }

  const insert = (): void => {
    if (result?.text) {
      onInsertText(result.text)
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Extract text (OCR)" maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={() => void pickImage()}>
            <ImageIcon size={15} /> Choose image…
          </button>
          <select className="input-base !w-36 !py-2 text-xs" value={lang} onChange={(e) => setLang(e.target.value)}>
            {OCR_LANGS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => void run()} disabled={!src || busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ScanText size={15} />}
            {busy ? 'Extracting…' : 'Extract text'}
          </button>
        </div>

        {ready === false && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300">
            <FileSearch size={14} className="mt-0.5 shrink-0" />
            <span>OCR language data is not installed yet. The first run will download it from the internet; after that it works fully offline.</span>
          </div>
        )}

        {src && (
          <div className="max-h-56 overflow-hidden rounded-xl border border-app-border">
            <img src={src.startsWith('appmedia://') ? src : undefined} className="mx-auto max-h-56 object-contain" />
            {!src.startsWith('appmedia://') && <div className="p-2 text-xs text-app-text-muted">{src}</div>}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-app-success">
                <Sparkles size={13} /> Extracted {Math.round(result.confidence)}% confidence
              </span>
              <div className="flex gap-1.5">
                <button className="btn-ghost flex items-center gap-1 px-2.5 py-1.5 text-xs" onClick={() => { void navigator.clipboard.writeText(result.text); toast('Copied to clipboard') }}>
                  <Copy size={13} /> Copy
                </button>
                <button className="btn-primary px-3 py-1.5 text-xs" onClick={insert}>
                  Insert into note
                </button>
              </div>
            </div>
            <textarea
              className="input-base min-h-[160px] font-mono text-xs leading-relaxed"
              value={result.text}
              onChange={(e) => setResult({ ...result, text: e.target.value })}
            />
          </div>
        )}

        {!src && !busy && (
          <p className="text-center text-xs text-app-text-muted">Select an image to extract searchable text from it.</p>
        )}
      </div>
    </Modal>
  )
}
