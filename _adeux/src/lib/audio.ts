// Effets sonores originaux, synthétisés (aucun fichier audio), doux et désactivables.
let ctx: AudioContext | null = null
let enabled = true
let master: GainNode | null = null

export function setSoundEnabled(v: boolean) { enabled = v }
export const soundEnabled = () => enabled

function ac(): AudioContext | null {
  if (!enabled) return null
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as any).webkitAudioContext
      if (!C) return null
      ctx = new C()
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

function tone(freq: number, dur = 0.18, type: OscillatorType = 'sine', vol = 0.18, delay = 0, glideTo?: number) {
  const c = ac(); if (!c || !master) return
  const t = c.currentTime + delay
  const o = c.createOscillator(), g = c.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t)
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05)
}
const N = (semi: number) => 440 * Math.pow(2, (semi - 9) / 12) // do central = 0

export const sfx = {
  tap: () => tone(N(7), 0.09, 'sine', 0.1),
  select: () => { tone(N(4), 0.12, 'triangle', 0.12); tone(N(11), 0.16, 'sine', 0.08, 0.05) },
  next: () => tone(N(2), 0.14, 'sine', 0.1, 0, N(9)),
  back: () => tone(N(9), 0.12, 'sine', 0.08, 0, N(2)),
  msg: () => { tone(N(12), 0.1, 'sine', 0.09); tone(N(16), 0.14, 'sine', 0.07, 0.07) },
  flip: () => { tone(N(0), 0.22, 'triangle', 0.1, 0, N(12)); tone(N(7), 0.3, 'sine', 0.08, 0.1) },
  place: () => { tone(N(-5), 0.08, 'square', 0.06); tone(N(7), 0.16, 'triangle', 0.12, 0.05) },
  oops: () => tone(N(0), 0.18, 'sine', 0.07, 0, N(-4)),
  chime: () => [0, 4, 7, 12].forEach((s, i) => tone(N(s + 7), 0.5, 'sine', 0.1, i * 0.09)),
  success: () => [0, 4, 7, 11, 14].forEach((s, i) => tone(N(s + 5), 0.7, 'sine', 0.09, i * 0.11)),
  glow: () => { tone(N(-12), 1.4, 'sine', 0.12, 0, N(0)); tone(N(-5), 1.6, 'sine', 0.08, 0.2, N(7)) },
  ring: () => { tone(N(12), 0.3, 'sine', 0.1); tone(N(16), 0.4, 'sine', 0.1, 0.25) },
}
export function unlockAudio() { ac() }
