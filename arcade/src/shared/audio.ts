import { loadBest, saveBest } from "./storage.js";

/** Sons courts générés (pas de fichiers). Silencieux si l'audio n'est pas disponible. Le mute est mémorisé. */
type Ctx = AudioContext;
let ctx: Ctx | null = null;
let muted = loadBest("arcade.muted") === 1;

function context(): Ctx | null {
  try {
    if (!ctx) {
      const AC = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Klass = AC.AudioContext ?? AC.webkitAudioContext;
      if (!Klass) return null;
      ctx = new Klass();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  saveBest("arcade.muted", value ? 1 : 0);
}

export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}

export interface ToneOpts {
  vol?: number;
  type?: OscillatorType;
  freqEnd?: number;
  delay?: number;
}

/** Bip : fréquence (Hz), durée (s), volume, forme d'onde, glissando vers freqEnd, retard (s). */
export function tone(freq: number, dur: number, opts: ToneOpts = {}): void {
  if (muted) return;
  const c = context();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + dur);
  gain.gain.setValueAtTime(opts.vol ?? 0.04, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Souffle filtré : impacts, éclats. */
export function noise(dur: number, opts: { vol?: number; freq?: number; delay?: number } = {}): void {
  if (muted) return;
  const c = context();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const length = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.freq ?? 1800;
  const gain = c.createGain();
  gain.gain.value = opts.vol ?? 0.05;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

/** Suite de notes (arpège) : cadence en secondes entre deux notes. */
export function arp(freqs: number[], step: number, opts: ToneOpts & { dur?: number } = {}): void {
  freqs.forEach((f, i) => tone(f, opts.dur ?? step * 1.6, { ...opts, delay: (opts.delay ?? 0) + i * step }));
}
