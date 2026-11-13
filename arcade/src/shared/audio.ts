/** Sons courts générés (pas de fichiers). Silencieux si l'audio n'est pas disponible. */
type Ctx = AudioContext;
let ctx: Ctx | null = null;
let muted = false;

function context(): Ctx | null {
  try {
    if (!ctx) {
      const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext });
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

export function setMuted(value: boolean): void {
  muted = value;
}

/** Bip court : fréquence (Hz), durée (s), volume, forme d'onde, glissando optionnel vers freqEnd. */
export function tone(freq: number, dur: number, opts: { vol?: number; type?: OscillatorType; freqEnd?: number; delay?: number } = {}): void {
  if (muted) return;
  const c = context();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + dur);
  gain.gain.setValueAtTime(opts.vol ?? 0.04, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
