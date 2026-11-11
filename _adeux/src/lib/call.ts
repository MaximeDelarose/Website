// Architecture d'appel audio.
//  - DemoCallEngine : SIMULATION locale (partenaire fictif). Rien n'est transmis.
//  - LiveKitCallEngine : vrai appel WebRTC. Le jeton est généré CÔTÉ SERVEUR (Edge Function `livekit-token`),
//    jamais dans le navigateur. Nécessite VITE_LIVEKIT_URL + un projet Supabase configuré.
import { getSupabase } from './supabase'

export type CallState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'ended'
export interface CallEngine {
  readonly simulated: boolean
  connect(): Promise<void>
  setMuted(m: boolean): void
  disconnect(): void
  onState(cb: (s: CallState, detail?: string) => void): void
  /** Niveau sonore local 0..1 (pour l'animation de voix). */
  level(): number
}

export const livekitConfigured = () => !!import.meta.env.VITE_LIVEKIT_URL && !!getSupabase()

export class DemoCallEngine implements CallEngine {
  simulated = true
  private cb: (s: CallState, d?: string) => void = () => {}
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private ctx: AudioContext | null = null
  private muted = false
  private buf = new Uint8Array(256)
  async connect() {
    this.cb('connecting')
    // Le micro n'est utilisé QUE pour afficher ton niveau sonore localement : rien n'est envoyé.
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const C = window.AudioContext || (window as any).webkitAudioContext
        this.ctx = new C(); const src = this.ctx!.createMediaStreamSource(this.stream)
        this.analyser = this.ctx!.createAnalyser(); this.analyser.fftSize = 256; src.connect(this.analyser)
      }
    } catch { /* permission refusée : l'appel simulé continue sans niveau micro */ }
    await new Promise((r) => setTimeout(r, 1800))
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { this.cb('failed', 'offline'); return }
    this.cb('connected')
  }
  setMuted(m: boolean) { this.muted = m; this.stream?.getAudioTracks().forEach((t) => (t.enabled = !m)) }
  disconnect() { this.stream?.getTracks().forEach((t) => t.stop()); void this.ctx?.close(); this.stream = null; this.cb('ended') }
  onState(cb: (s: CallState, d?: string) => void) { this.cb = cb }
  level() {
    if (!this.analyser || this.muted) return 0
    this.analyser.getByteTimeDomainData(this.buf)
    let m = 0; for (const v of this.buf) m = Math.max(m, Math.abs(v - 128))
    return Math.min(1, m / 64)
  }
}

export class LiveKitCallEngine implements CallEngine {
  simulated = false
  private cb: (s: CallState, d?: string) => void = () => {}
  private room: import('livekit-client').Room | null = null
  private lvl = 0
  constructor(private encounterId: string) {}
  async connect() {
    this.cb('connecting')
    try {
      const sb = getSupabase(); if (!sb) throw new Error('config')
      // Jeton généré par l'Edge Function : vérifie que l'utilisateur appartient bien à la rencontre.
      const { data, error } = await sb.functions.invoke('livekit-token', { body: { encounterId: this.encounterId } })
      if (error || !data?.token) throw new Error('token')
      const { Room, RoomEvent } = await import('livekit-client')
      const room = new Room({ adaptiveStream: true, dynacast: true })
      this.room = room
      room.on(RoomEvent.Disconnected, () => this.cb('ended'))
      room.on(RoomEvent.Reconnecting, () => this.cb('reconnecting'))
      room.on(RoomEvent.Reconnected, () => this.cb('connected'))
      room.on(RoomEvent.ActiveSpeakersChanged, (sp) => { this.lvl = sp.some((s) => s.isLocal) ? 0.8 : 0 })
      await room.connect(import.meta.env.VITE_LIVEKIT_URL as string, data.token)
      await room.localParticipant.setMicrophoneEnabled(true)
      this.cb('connected')
    } catch (e) {
      const n = (e as DOMException)?.name
      this.cb('failed', n === 'NotAllowedError' ? 'permission' : 'network')
    }
  }
  setMuted(m: boolean) { void this.room?.localParticipant.setMicrophoneEnabled(!m) }
  disconnect() { void this.room?.disconnect(); this.room = null }
  onState(cb: (s: CallState, d?: string) => void) { this.cb = cb }
  level() { return this.lvl }
}
