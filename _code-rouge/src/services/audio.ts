/**
 * Tout le son est synthétisé (Web Audio) : aucun fichier à charger, fonctionne hors ligne.
 * iOS n'autorise le son qu'après un geste : `unlock()` est appelé au premier toucher.
 */
type Wave = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: { gain: GainNode; filter: BiquadFilterNode; oscs: OscillatorNode[]; lfo: OscillatorNode } | null = null;
  private charge: { osc: OscillatorNode; gain: GainNode } | null = null;
  private ambientMode: "off" | "calm" | "tense" | "bright" = "off";
  muted = false;

  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
        this.applyAmbient();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      /* pas d'audio : le jeu reste jouable */
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.03);
  }

  private tone(freq: number, dur: number, opts: { type?: Wave; gain?: number; delay?: number; to?: number; attack?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    const peak = opts.gain ?? 0.12;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, opts: { gain?: number; delay?: number; from?: number; to?: number; q?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = opts.q ?? 1.2;
    f.frequency.setValueAtTime(opts.from ?? 800, t0);
    f.frequency.exponentialRampToValueAtTime(opts.to ?? 3000, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.1, t0 + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  /* ----- Effets ----- */
  tap(): void { this.tone(880, 0.06, { type: "triangle", gain: 0.07, to: 660 }); }
  key(): void { this.tone(1250, 0.045, { type: "square", gain: 0.035 }); }
  type(): void { this.tone(1500 + Math.random() * 500, 0.02, { type: "square", gain: 0.014 }); }
  flip(): void { this.noise(0.09, { gain: 0.05, from: 2400, to: 900 }); }
  /** Bonne réponse partielle ; `step` fait monter la note. */
  good(step = 0): void {
    const f = 587.33 * Math.pow(2, (step * 2) / 12);
    this.tone(f, 0.16, { type: "triangle", gain: 0.12 });
    this.tone(f * 2, 0.22, { type: "sine", gain: 0.06, delay: 0.03 });
  }
  bad(): void {
    this.tone(150, 0.26, { type: "sawtooth", gain: 0.11, to: 82 });
    this.tone(111, 0.26, { type: "square", gain: 0.05, to: 70 });
  }
  whoosh(): void { this.noise(0.45, { gain: 0.07, from: 300, to: 5200, q: 0.8 }); }
  reveal(): void {
    this.tone(660, 0.2, { type: "sine", gain: 0.08 });
    this.tone(990, 0.3, { type: "sine", gain: 0.07, delay: 0.09 });
  }
  /** Verrou ouvert : choc grave + accord montant. */
  unlockLock(): void {
    this.tone(90, 0.5, { type: "sine", gain: 0.3, to: 42 });
    this.noise(0.18, { gain: 0.12, from: 1800, to: 300 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.5, { type: "triangle", gain: 0.1, delay: 0.14 + i * 0.09 }));
  }
  tick(urgent = false): void {
    this.tone(urgent ? 1320 : 990, 0.05, { type: "square", gain: urgent ? 0.07 : 0.04 });
  }
  alarm(): void {
    for (let i = 0; i < 3; i++) this.tone(620, 0.2, { type: "sawtooth", gain: 0.1, to: 380, delay: i * 0.24 });
  }
  count(): void { this.tone(1900, 0.02, { type: "sine", gain: 0.022 }); }
  /* ----- Mode coopératif ----- */
  /** Un coéquipier s'enclenche dans la constellation : verrou mécanique + carillon. */
  join(): void {
    this.noise(0.05, { gain: 0.09, from: 3200, to: 1200, q: 2 });
    this.tone(196, 0.14, { type: "triangle", gain: 0.12, to: 150 });
    [659.25, 987.77].forEach((f, i) => this.tone(f, 0.45, { type: "sine", gain: 0.08, delay: 0.07 + i * 0.09 }));
  }
  /** Cliquet qui s'accélère pendant la distribution des rôles. */
  ratchet(): void {
    for (let i = 0; i < 9; i++) this.tone(900 + i * 70, 0.03, { type: "square", gain: 0.035, delay: i * (0.11 - i * 0.008) });
    this.tone(120, 0.35, { type: "sine", gain: 0.25, to: 60, delay: 0.85 });
  }
  /** Tous prêts : accord large et lumineux. */
  chord(): void {
    [261.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 1.1, { type: "triangle", gain: 0.09, delay: i * 0.06 }));
    this.noise(0.9, { gain: 0.05, from: 400, to: 6000, q: 0.7 });
  }
  /** Perte d'un coéquipier : note qui retombe. */
  drop(): void { this.tone(440, 0.4, { type: "sine", gain: 0.09, to: 220 }); }
  win(): void {
    this.tone(55, 1.6, { type: "sine", gain: 0.3, to: 36 });
    this.noise(1.3, { gain: 0.09, from: 200, to: 7000, q: 0.6 });
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      this.tone(f, 1.1, { type: "triangle", gain: 0.1, delay: 0.25 + i * 0.11 });
      this.tone(f * 2, 0.9, { type: "sine", gain: 0.04, delay: 0.27 + i * 0.11 });
    });
  }
  lose(): void {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.6, { type: "sawtooth", gain: 0.07, delay: i * 0.22, to: f * 0.94 }));
  }

  /** Son continu de charge (boutons à maintenir) : `level` de 0 à 1 règle la hauteur. */
  setCharge(level: number | null): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (level === null || this.muted) {
      if (this.charge) {
        const c = this.charge;
        c.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
        c.osc.stop(ctx.currentTime + 0.25);
        this.charge = null;
      }
      return;
    }
    if (!this.charge) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      gain.gain.value = 0.0001;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1400;
      osc.connect(f).connect(gain).connect(this.master);
      osc.start();
      this.charge = { osc, gain };
    }
    this.charge.osc.frequency.setTargetAtTime(110 + level * 420, ctx.currentTime, 0.05);
    this.charge.gain.gain.setTargetAtTime(0.035 + level * 0.04, ctx.currentTime, 0.05);
  }

  /* ----- Nappe d'ambiance ----- */
  setAmbient(mode: "off" | "calm" | "tense" | "bright"): void {
    this.ambientMode = mode;
    this.applyAmbient();
  }

  private applyAmbient(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (!this.ambient) {
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;
      filter.Q.value = 3;
      const oscs = [55, 55.4, 82.5, 110.3].map((f, i) => {
        const o = ctx.createOscillator();
        o.type = i < 2 ? "sawtooth" : "triangle";
        o.frequency.value = f;
        o.connect(filter);
        o.start();
        return o;
      });
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.11;
      lfoGain.gain.value = 110;
      lfo.connect(lfoGain).connect(filter.frequency);
      lfo.start();
      filter.connect(gain).connect(this.master);
      this.ambient = { gain, filter, oscs, lfo };
    }
    const t = ctx.currentTime;
    const a = this.ambient;
    const level = { off: 0.0001, calm: 0.045, tense: 0.07, bright: 0.05 }[this.ambientMode];
    const cutoff = { off: 200, calm: 260, tense: 520, bright: 900 }[this.ambientMode];
    const third = { off: 82.5, calm: 82.41, tense: 77.78, bright: 82.41 }[this.ambientMode];
    a.gain.gain.setTargetAtTime(level, t, 0.6);
    a.filter.frequency.setTargetAtTime(cutoff, t, 0.8);
    a.oscs[2].frequency.setTargetAtTime(third, t, 0.5);
    a.lfo.frequency.setTargetAtTime(this.ambientMode === "tense" ? 0.45 : 0.11, t, 0.5);
  }
}

export const audio = new AudioEngine();

/** Retour haptique (Android ; iOS l'ignore silencieusement). */
export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* rien */
  }
}
