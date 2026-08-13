import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Pause, Play, Save, Square, Volume2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'
import { cx, formatBytes } from '@/lib/utils'

interface VoiceRecorderModalProps {
  open: boolean
  noteId: string
  onClose: () => void
  onTranscript: (text: string) => void
}

interface SpeechResult {
  results: {
    length: number
    [i: number]: { length: number; [j: number]: { transcript: string } }
  }
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  onresult: (e: SpeechResult) => void
  onend: () => void
  start: () => void
}

export function VoiceRecorderModal({ open, noteId, onClose, onTranscript }: VoiceRecorderModalProps): JSX.Element {
  const toast = useAppStore((s) => s.toast)
  const [state, setState] = useState<'idle' | 'recording' | 'paused' | 'recorded'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    if (!open) {
      stop()
      setState('idle')
      setBlob(null)
      setTranscript('')
      setSeconds(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const tick = (): void => setSeconds((s) => s + 1)

  const start = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/webm' })
        setBlob(b)
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRecorderRef.current = rec
      rec.start()
      setState('recording')
      timerRef.current = setInterval(tick, 1000)
    } catch {
      toast('Microphone not available', 'Check your microphone permissions', 'error')
    }
  }

  const pause = (): void => {
    mediaRecorderRef.current?.pause()
    if (timerRef.current) clearInterval(timerRef.current)
    setState('paused')
  }

  const resume = (): void => {
    mediaRecorderRef.current?.resume()
    timerRef.current = setInterval(tick, 1000)
    setState('recording')
  }

  const stop = (): void => {
    if (mediaRecorderRef.current && (state === 'recording' || state === 'paused')) {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setState(blob ? 'recorded' : 'idle')
  }

  const speechToText = (): void => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: unknown
    }
    const Recognition = w.SpeechRecognition ?? (w.webkitSpeechRecognition as never as typeof w.SpeechRecognition)
    if (!Recognition) {
      toast('Speech-to-text not available in this build', undefined, 'error')
      return
    }
    const rec = new Recognition()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.onresult = (e) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      setTranscript(text)
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    setListening(true)
    rec.start()
  }

  const save = async (): Promise<void> => {
    if (!blob) return
    setBusy(true)
    try {
      const buffer = await blob.arrayBuffer()
      await window.api.voice.save(noteId, {
        buffer,
        mime: blob.type,
        name: `voice-${Date.now()}.webm`,
        duration: seconds
      })
      if (transcript.trim()) onTranscript(transcript.trim())
      toast('Voice note saved')
      onClose()
    } catch (e) {
      toast('Failed to save recording', e instanceof Error ? e.message : undefined, 'error')
    } finally {
      setBusy(false)
    }
  }

  const fmt = (): string => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <Modal open={open} onClose={onClose} title="Voice note" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-app-surface-2 py-6">
          <div className={cx('flex h-16 w-16 items-center justify-center rounded-full text-white transition-all', state === 'recording' ? 'animate-pulse bg-red-500' : 'bg-app-accent')}>
            {state === 'recording' ? <Mic size={26} /> : state === 'paused' ? <Pause size={26} /> : state === 'recorded' ? <Volume2 size={26} /> : <Mic size={26} />}
          </div>
          <div className="font-mono text-2xl font-semibold">{fmt()}</div>
          <div className="flex gap-2">
            {state === 'idle' && (
              <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => void start()}>
                <Mic size={15} /> Record
              </button>
            )}
            {state === 'recording' && (
              <>
                <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={pause}>
                  <Pause size={15} /> Pause
                </button>
                <button className="btn-primary flex items-center gap-1.5 bg-red-500 text-sm" onClick={stop}>
                  <Square size={15} /> Stop
                </button>
              </>
            )}
            {state === 'paused' && (
              <>
                <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={resume}>
                  <Play size={15} /> Resume
                </button>
                <button className="btn-primary flex items-center gap-1.5 bg-red-500 text-sm" onClick={stop}>
                  <Square size={15} /> Stop
                </button>
              </>
            )}
          </div>
        </div>

        {blob && (
          <audio controls src={URL.createObjectURL(blob)} className="w-full" />
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-app-text-muted">Speech-to-text</span>
            <button className="btn-ghost flex items-center gap-1.5 px-2.5 py-1.5 text-xs" onClick={speechToText} disabled={listening}>
              {listening ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />}
              {listening ? 'Listening…' : 'Transcribe'}
            </button>
          </div>
          <textarea
            className="input-base min-h-[80px] text-sm"
            placeholder="Transcript appears here, or type it yourself…"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </div>

        {blob && (
          <div className="flex items-center justify-between rounded-xl border border-app-border px-3 py-2 text-xs text-app-text-muted">
            <span>{formatBytes(blob.size)} • {blob.type}</span>
            <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={() => void save()} disabled={busy}>
              <Save size={13} /> Save to note
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
