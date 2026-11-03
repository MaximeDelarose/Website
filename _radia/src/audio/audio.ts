/* Audio : effets sonores synthétisés (Web Audio, aucun fichier) et musique MP3.
   La musique passe par un <audio> relié à un GainNode : sur iPhone, la propriété
   volume d'un <audio> est ignorée, le GainNode permet un vrai réglage.
   Tout démarre après la première interaction (règle des navigateurs). */

export type Sfx =
  | "select" | "move" | "capture" | "captureBig" | "captureRoyal" | "card" | "check"
  | "mate" | "victory" | "button" | "confetti" | "illegal" | "lowtime" | "bubble";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicEl: HTMLAudioElement | null = null;
  private musicSrc: string | null = null;
  private wired = false;
  private wantMusic = false;
  sfxOn = true;
  private sfxVol = 0.7;
  private musicVol = 0.35;

  constructor() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { this.musicEl?.pause(); void this.ctx?.suspend(); }
      else this.resumeAfterInterruption();
    });
    // Safari peut suspendre le contexte (appel, autre appli audio…) : on relance au prochain toucher.
    const kick = () => this.resumeAfterInterruption();
    window.addEventListener("pointerdown", kick, { passive: true });
    window.addEventListener("pageshow", kick);
  }

  /** À appeler dans un gestionnaire d'interaction (toucher/clic). */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol;
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state !== "running") void this.ctx.resume();
    if (this.wantMusic) this.playMusic();
  }

  private resumeAfterInterruption(): void {
    if (document.hidden || !this.ctx) return;
    if (this.ctx.state !== "running") void this.ctx.resume().catch(() => undefined);
    if (this.wantMusic && this.musicEl?.paused) void this.musicEl.play().catch(() => undefined);
  }

  setMusicSource(url: string): void {
    this.musicSrc = url;
    if (this.musicEl) this.musicEl.src = url;
  }

  get hasMusic(): boolean { return !!this.musicSrc; }

  setMusicEnabled(on: boolean): void {
    this.wantMusic = on;
    if (on) this.playMusic(); else this.musicEl?.pause();
  }

  setMusicVolume(v: number): void {
    this.musicVol = v;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    else if (this.musicEl) this.musicEl.volume = v;
  }

  setSfxVolume(v: number): void {
    this.sfxVol = v;
    if (this.sfxGain && this.ctx) this.sfxGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  private playMusic(): void {
    if (!this.musicSrc || !this.ctx) return;
    if (!this.musicEl) {
      const el = new Audio();
      el.src = this.musicSrc;
      el.loop = true;
      el.preload = "auto";
      el.setAttribute("playsinline", "");
      this.musicEl = el;
    }
    if (!this.wired && this.musicGain) {
      try {
        this.ctx.createMediaElementSource(this.musicEl).connect(this.musicGain);
        this.wired = true;
      } catch {
        this.musicEl.volume = this.musicVol;
      }
    }
    // fondu d'entrée doux
    if (this.musicEl.paused) {
      if (this.musicGain) {
        const g = this.musicGain.gain;
        g.cancelScheduledValues(this.ctx.currentTime);
        g.setValueAtTime(0.0001, this.ctx.currentTime);
        g.linearRampToValueAtTime(this.musicVol, this.ctx.currentTime + 1.6);
      }
      void this.musicEl.play().catch(() => undefined);
    }
  }

  // ------------------------------------------------------------------ effets
  private tone(freq: number, dur: number, o: { type?: OscillatorType; vol?: number; at?: number; to?: number; attack?: number } = {}): void {
    const c = this.ctx, out = this.sfxGain;
    if (!c || !out) return;
    const t = c.currentTime + (o.at ?? 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, o: { vol?: number; at?: number; freq?: number; q?: number } = {}): void {
    const c = this.ctx, out = this.sfxGain;
    if (!c || !out) return;
    const t = c.currentTime + (o.at ?? 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = o.freq ?? 1800;
    f.Q.value = o.q ?? 1.2;
    const g = c.createGain();
    g.gain.value = o.vol ?? 0.25;
    src.connect(f).connect(g).connect(out);
    src.start(t);
  }

  play(s: Sfx): void {
    if (!this.sfxOn || !this.ctx) return;
    if (this.ctx.state !== "running") void this.ctx.resume();
    switch (s) {
      case "select": this.tone(880, 0.09, { type: "triangle", vol: 0.12 }); this.tone(1320, 0.07, { type: "sine", vol: 0.06, at: 0.02 }); break;
      case "move": this.noise(0.06, { vol: 0.35, freq: 900, q: 2 }); this.tone(220, 0.08, { type: "sine", vol: 0.18, to: 160 }); break;
      case "capture":
        this.tone(520, 0.13, { type: "sine", vol: 0.3, to: 1100 }); this.noise(0.08, { vol: 0.3, freq: 2400 });
        this.tone(1250, 0.12, { type: "triangle", vol: 0.08, at: 0.05 }); break;
      case "captureBig":
        this.tone(440, 0.16, { type: "sine", vol: 0.32, to: 1200 }); this.noise(0.12, { vol: 0.38, freq: 1600 });
        this.tone(988, 0.2, { type: "triangle", vol: 0.1, at: 0.06 }); this.tone(1318, 0.24, { type: "triangle", vol: 0.08, at: 0.11 }); break;
      case "captureRoyal":
        this.noise(0.15, { vol: 0.35, freq: 1400 });
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.35, { type: "triangle", vol: 0.11, at: i * 0.07 }));
        this.tone(392, 0.5, { type: "sine", vol: 0.18, at: 0.02 }); break;
      case "card": [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.5, { type: "sine", vol: 0.07, at: i * 0.09, attack: 0.03 })); break;
      case "check": this.tone(660, 0.16, { type: "triangle", vol: 0.14 }); this.tone(990, 0.22, { type: "triangle", vol: 0.1, at: 0.08 }); break;
      case "mate": [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.6, { type: "triangle", vol: 0.12, at: i * 0.12 })); break;
      case "victory":
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.7, { type: "triangle", vol: 0.12, at: i * 0.11 }));
        [262, 392].forEach((f) => this.tone(f, 1.2, { type: "sine", vol: 0.1, at: 0.4 })); break;
      case "button": this.tone(740, 0.06, { type: "sine", vol: 0.1, to: 980 }); break;
      case "confetti": for (let i = 0; i < 6; i++) this.noise(0.04, { vol: 0.12, freq: 3000 + i * 400, at: i * 0.045 }); break;
      case "illegal": this.tone(190, 0.12, { type: "sine", vol: 0.12, to: 150 }); break;
      case "lowtime": this.tone(1200, 0.05, { type: "sine", vol: 0.05 }); break;
      case "bubble": this.tone(1500, 0.06, { type: "sine", vol: 0.05, to: 1900 }); break;
    }
  }
}
