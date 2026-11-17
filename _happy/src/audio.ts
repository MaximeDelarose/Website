// Sons synthétisés, très doux. (Le vrai sound design — ambiances, variations, silences — vient à l'étape 18.)
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  init(): void {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch { /* pas d'audio : le jeu reste jouable */ }
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = "sine", delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol: number, freq: number): void {
    if (!this.ctx || !this.master || this.muted) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = buf; f.type = "lowpass"; f.frequency.value = freq; g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  tick(): void { this.tone(880, 0.08, 0.05, "triangle"); }
  open(): void { this.tone(520, 0.12, 0.06); this.tone(780, 0.14, 0.05, "sine", 0.05); }
  step(): void { this.noise(0.07, 0.05, 500 + Math.random() * 300); }
  click(): void { this.noise(0.03, 0.12, 2400); }
  unit(): void { this.tone(620 + Math.random() * 30, 0.16, 0.04, "sine"); }
  /** Petit accord chaud : quelque chose a fait du bien. */
  warm(big = false): void {
    const base = 392 * (1 + (Math.random() - 0.5) * 0.02);
    [1, 1.25, 1.5].forEach((m, i) => this.tone(base * m, 0.7, 0.05, "sine", i * 0.09));
    if (big) this.tone(base * 2, 1.0, 0.045, "sine", 0.3);
  }
  low(): void { this.tone(196, 0.8, 0.05, "sine"); this.tone(185, 0.9, 0.035, "sine", 0.12); }
  night(): void { [330, 262, 196].forEach((f, i) => this.tone(f, 1.4, 0.04, "sine", i * 0.35)); }
  morning(): void { [262, 330, 392, 523].forEach((f, i) => this.tone(f, 1.0, 0.04, "sine", i * 0.16)); }
  bip(): void { this.tone(988, 0.12, 0.05, "sine"); this.tone(1319, 0.2, 0.045, "sine", 0.11); }
  knock(): void { [0, 0.16, 0.32].forEach((d) => this.tone(140, 0.09, 0.16, "triangle", d)); }
  paper(): void { this.noise(0.18, 0.06, 3200); }
  thunder(): void { this.noise(1.6, 0.22, 120); }
  tune(): void { [392, 494, 587, 494, 659, 587, 494, 392].forEach((f, i) => this.tone(f, 0.5, 0.035, "triangle", i * 0.42)); }
  private rainGain: GainNode | null = null;
  /** Pluie continue derrière la vitre (0 = silence). */
  rain(level: number): void {
    if (!this.ctx || !this.master) return;
    if (!this.rainGain) {
      const n = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
      src.buffer = buf; src.loop = true; f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 0.4;
      this.rainGain = this.ctx.createGain(); this.rainGain.gain.value = 0;
      src.connect(f).connect(this.rainGain).connect(this.master);
      src.start();
    }
    this.rainGain.gain.linearRampToValueAtTime(this.muted ? 0 : level * 0.09, this.ctx.currentTime + 2.5);
  }
  baa(): void { this.tone(340, 0.25, 0.05, "triangle"); this.tone(300, 0.3, 0.05, "triangle", 0.12); }
}
