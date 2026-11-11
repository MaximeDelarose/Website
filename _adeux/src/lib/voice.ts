import { useCallback, useEffect, useRef, useState } from 'react'
import { del, get, set } from 'idb-keyval'
import { adeuxStore } from './photo'

export type RecState = 'idle' | 'recording' | 'denied' | 'unsupported' | 'error'

export const hasRecorder = () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

/** Enregistrement vocal réel (MediaRecorder), avec gestion des permissions. */
export function useRecorder(maxSeconds = 60) {
  const [state, setState] = useState<RecState>(hasRecorder() ? 'idle' : 'unsupported')
  const [seconds, setSeconds] = useState(0)
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const resolver = useRef<((b: Blob | null) => void) | null>(null)

  const cleanup = useCallback(() => {
    clearInterval(timer.current); stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null
  }, [])
  useEffect(() => cleanup, [cleanup])

  const start = useCallback(async () => {
    if (!hasRecorder()) { setState('unsupported'); return false }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = s
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported?.(m))
      const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined)
      chunks.current = []
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      r.onstop = () => { cleanup(); resolver.current?.(chunks.current.length ? new Blob(chunks.current, { type: r.mimeType || 'audio/mp4' }) : null); resolver.current = null; setState('idle') }
      r.start(); rec.current = r; setSeconds(0); setState('recording')
      timer.current = setInterval(() => setSeconds((x) => { if (x + 1 >= maxSeconds) rec.current?.stop(); return x + 1 }), 1000)
      return true
    } catch (e) {
      cleanup()
      setState((e as DOMException)?.name === 'NotAllowedError' || (e as DOMException)?.name === 'SecurityError' ? 'denied' : 'error')
      return false
    }
  }, [cleanup, maxSeconds])

  const stop = useCallback(() => new Promise<Blob | null>((res) => {
    if (!rec.current || rec.current.state === 'inactive') return res(null)
    resolver.current = res; rec.current.stop()
  }), [])
  const cancel = useCallback(() => { resolver.current = null; if (rec.current && rec.current.state !== 'inactive') rec.current.stop(); cleanup(); setState('idle') }, [cleanup])
  return { state, seconds, start, stop, cancel }
}

export const saveVoice = (key: string, b: Blob) => set(`voice:${key}`, b, adeuxStore)
export const loadVoice = (key: string): Promise<Blob | undefined> => get(`voice:${key}`, adeuxStore)
export const deleteVoice = (key: string) => del(`voice:${key}`, adeuxStore)
