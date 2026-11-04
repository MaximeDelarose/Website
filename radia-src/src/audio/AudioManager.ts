/**
 * Audio de RADIA.
 *  - Musique : un seul <audio> pour toute la partie (la position est conservée
 *    entre les écrans), branché sur Web Audio pour régler le volume et faire
 *    des fondus (sur iOS, la propriété `volume` d'un <audio> est ignorée).
 *  - Effets : synthétisés en Web Audio (aucun fichier), volume séparé,
 *    nombre de voix limité pour ne jamais saturer pendant un gros combo.
 *  - iOS : déverrouillage au premier toucher, pause en arrière-plan,
 *    reprise après un appel ou un verrouillage.
 */

export type Sfx =
  | 'pop1' | 'pop2' | 'pop3' | 'rare' | 'combo' | 'reward' | 'button' | 'chest' | 'achievement'
  | 'move' | 'capture' | 'victory' | 'invalid' | 'spawn' | 'deliver' | 'pickup' | 'drop' | 'whoosh'
  | 'heart' | 'check' | 'sparkle' | 'page'
  // Game feel 2.0 : variantes de POP, fusion rare / maximale, coffre, sélection douce
  | 'pop4' | 'pop5' | 'popRare' | 'maxMerge' | 'chestOpen' | 'select' | 'windup'
  // Casino Royal et roue du jour
  | 'chip' | 'chipWin' | 'rouletteTick' | 'ballDrop' | 'reelStop' | 'cardDeal' | 'cardFlip' | 'jackpot' | 'wheelTick'
  // Scène du feu d'artifice et collier légendaire (synthétisés, doux)
  | 'fwLaunch' | 'fwBurst' | 'fwCrackle' | 'crystal' | 'crystalSoft';

/** Les morceaux s'enchaînent tour à tour (le niveau sonore de chacun est égalisé au chargement). */
const TRACKS = [
  './assets/music/radia-theme.mp3', './assets/music/radia-warm-world.mp3', './assets/music/radia-theme-2.mp3',
  './assets/music/radia-quiet-resolution.mp3', './assets/music/radia-lingering-notes.mp3',
];
const MAX_VOICES = 10;
/** Plafond de volume musique : même au réglage maximal, elle reste douce. */
const MUSIC_CEIL = 0.7;

export class AudioManager {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private norm: GainNode | null = null;
  private musicComp: DynamicsCompressorNode | null = null;
  /** Gain de normalisation par version (loudness mesurée), pour qu'aucune ne soit plus forte. */
  private normGains = new Map<number, number>();
  private el: HTMLAudioElement | null = null;
  private elSource: MediaElementAudioSourceNode | null = null;
  private wantMusic = false;
  private musicLoaded = false;
  private voices = 0;
  private lastPlayed = new Map<Sfx, number>();
  private noise: AudioBuffer | null = null;
  musicVolume = 0.35;
  private duckLevel = 1;
  /** Volume visé de la musique (réglage × atténuation tenue). */
  musicTarget(): number { return this.musicVolume * this.duckLevel; }
  sfxVolume = 0.7;
  musicOn = true;
  sfxOn = true;
  /** Vrai si le fichier de musique est introuvable. */
  musicMissing = false;

  constructor() {
    document.addEventListener('visibilitychange', () => this.onVisibility());
    window.addEventListener('pagehide', () => this.suspend());
    window.addEventListener('pageshow', () => this.onVisibility());
    // Un toucher quelconque relance un contexte interrompu (appel, Siri, verrouillage).
    const kick = () => { if (!document.hidden) void this.resume(); };
    window.addEventListener('pointerdown', kick, { passive: true });
    window.addEventListener('touchend', kick, { passive: true });
  }

  /** À appeler dans un gestionnaire de toucher (exigence iOS). */
  unlock(): void {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        // iOS 17+ : jouer même si le bouton silencieux est activé, comme une vraie appli de jeu.
        const nav = navigator as Navigator & { audioSession?: { type: string } };
        if (nav.audioSession) nav.audioSession.type = 'playback';
      } catch { /* ignoré */ }
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.ratio.value = 6;
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.sfxGain.connect(this.comp);
      this.comp.connect(this.master);
      // chaîne musique : normalisation par version → limiteur doux → volume réglé
      this.norm = this.ctx.createGain();
      this.musicComp = this.ctx.createDynamicsCompressor();
      this.musicComp.threshold.value = -20;
      this.musicComp.knee.value = 12;
      this.musicComp.ratio.value = 10;
      this.musicComp.attack.value = 0.01;
      this.musicComp.release.value = 0.25;
      this.norm.connect(this.musicComp);
      this.musicComp.connect(this.musicGain);
      this.musicGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
      this.noise = this.makeNoise();
    }
    // Sur iOS, il faut jouer un son (même muet) pendant le geste.
    const src = this.ctx.createBufferSource();
    src.buffer = this.ctx.createBuffer(1, 1, 22050);
    src.connect(this.ctx.destination);
    src.start(0);
    void this.ctx.resume();
    if (!this.el) this.prepareMusic();
    if (this.wantMusic && this.musicOn) void this.el?.play().catch(() => undefined);
  }

  private track = 0;
  private blobs = new Map<number, string>();

  private prepareMusic(): void {
    const el = new Audio();
    el.loop = false;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    el.crossOrigin = 'anonymous';
    this.el = el;
    // À la fin d'une version, on passe à l'autre (fondu d'entrée doux).
    el.addEventListener('ended', () => {
      this.track = (this.track + 1) % TRACKS.length;
      this.loadTrack(this.track, true);
    });
    this.loadTrack(0, false);
    try {
      if (this.ctx && this.musicGain) {
        this.elSource = this.ctx.createMediaElementSource(el);
        this.elSource.connect(this.norm ?? this.musicGain);
      }
    } catch {
      this.elSource = null;
    }
  }

  /**
   * Charge une version en mémoire (blob) : lecture fiable hors ligne et pas
   * de requêtes partielles à gérer par le service worker.
   */
  private loadTrack(i: number, fadeIn: boolean): void {
    const el = this.el;
    if (!el) return;
    const play = (src: string) => {
      this.applyNorm(i);
      el.src = src;
      this.musicLoaded = true;
      if (this.wantMusic && this.musicOn) {
        if (fadeIn) this.fadeMusicTo(0, 0.01);
        this.startElement();
      }
    };
    const cached = this.blobs.get(i);
    if (cached) { play(cached); return; }
    fetch(TRACKS[i])
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
      .then(async (b) => {
        const u = URL.createObjectURL(b);
        this.blobs.set(i, u);
        await this.measure(i, b); // mesure avant de lancer : le volume est juste dès la première seconde
        play(u);
      })
      .catch(() => {
        if (i !== 0) { this.track = 0; this.loadTrack(0, fadeIn); return; }
        el.addEventListener('error', () => { this.musicMissing = true; }, { once: true });
        play(TRACKS[0]);
      });
  }

  /** Mesure l'intensité moyenne (RMS) d'une version et en déduit son gain de normalisation. */
  private async measure(i: number, blob: Blob): Promise<void> {
    if (this.normGains.has(i) || !this.ctx) return;
    try {
      const buf = await this.ctx.decodeAudioData(await blob.arrayBuffer());
      let sum = 0;
      let n = 0;
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        for (let k = 0; k < d.length; k += 4) { sum += d[k] * d[k]; n++; }
      }
      const rms = Math.sqrt(sum / Math.max(1, n));
      // cible ≈ -22 dBFS ; jamais plus de +6 dB ni de -12 dB de correction
      const g = rms > 0.001 ? Math.min(2, Math.max(0.25, 0.08 / rms)) : 1;
      this.normGains.set(i, g);
    } catch { this.normGains.set(i, 1); }
  }

  private applyNorm(i: number): void {
    if (this.norm && this.ctx) this.norm.gain.setTargetAtTime(this.normGains.get(i) ?? 1, this.ctx.currentTime, 0.05);
  }

  private startElement(): void {
    if (!this.el) return;
    const p = this.el.play();
    if (p) p.then(() => this.fadeMusicTo(this.musicOn ? this.musicTarget() : 0, 2.2)).catch(() => undefined);
  }

  /** Lance (ou continue) la musique avec un fondu d'entrée. */
  playMusic(): void {
    this.wantMusic = true;
    if (!this.musicOn) return;
    if (!this.el) return; // démarrera à unlock()
    if (this.musicLoaded) {
      if (this.el.paused) this.startElement();
      else this.fadeMusicTo(this.musicTarget(), 1.2);
    }
  }

  stopMusic(fade = 1.2): void {
    this.wantMusic = false;
    this.fadeMusicTo(0, fade);
    window.setTimeout(() => { if (!this.wantMusic) this.el?.pause(); }, fade * 1000 + 50);
  }

  /** Baisse temporairement la musique (moments émotionnels, victoire…). */
  duck(amount = 0.45, seconds = 1.5): void {
    if (!this.musicOn || !this.wantMusic) return;
    this.fadeMusicTo(this.musicTarget() * amount, 0.3);
    window.setTimeout(() => { if (this.wantMusic && this.musicOn) this.fadeMusicTo(this.musicTarget(), 0.8); }, seconds * 1000);
  }

  /** Baisse la musique tant que `duckRelease` n'est pas appelé (message vocal, moment émotionnel). */
  duckHold(level = 0.14, seconds = 0.9): void {
    this.duckLevel = level;
    if (this.wantMusic && this.musicOn) this.fadeMusicTo(this.musicTarget(), seconds);
  }

  duckRelease(seconds = 1.6): void {
    this.duckLevel = 1;
    if (this.wantMusic && this.musicOn) this.fadeMusicTo(this.musicTarget(), seconds);
  }

  private ringTimer = 0;
  /** Sonnerie douce d'appel entrant (effet synthétisé, jamais une voix). */
  ringStart(): void {
    this.ringStop();
    const ring = () => {
      const c = this.ctx;
      if (!c || !this.sfxGain || !this.sfxOn) return;
      const t = c.currentTime;
      [[659.25, 0], [987.77, 0.22], [659.25, 0.9], [987.77, 1.12]].forEach(([f, d]) => {
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.22, t + d + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5);
        o.connect(g); g.connect(this.sfxGain!);
        o.start(t + d); o.stop(t + d + 0.55);
      });
      try { navigator.vibrate?.([180, 90, 180]); } catch { /* ignoré */ }
    };
    ring();
    this.ringTimer = window.setInterval(ring, 2600);
  }

  ringStop(): void { if (this.ringTimer) { window.clearInterval(this.ringTimer); this.ringTimer = 0; } }

  /**
   * Fait passer un <audio> (voix) par Web Audio : léger gain + limiteur (sans toucher à la voix),
   * et renvoie un analyseur pour animer l'avatar. Sans contexte audio : null (lecture normale).
   */
  routeVoice(el: HTMLAudioElement, gain = 2): AnalyserNode | null {
    const c = this.ctx;
    if (!c || !this.master) return null;
    try {
      const src = c.createMediaElementSource(el);
      const g = c.createGain(); g.gain.value = gain;
      const lim = c.createDynamicsCompressor(); lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.2;
      const an = c.createAnalyser(); an.fftSize = 256;
      src.connect(g); g.connect(lim); lim.connect(an); an.connect(this.master);
      return an;
    } catch { return null; }
  }

  fadeMusicTo(v: number, seconds: number): void {
    if (this.ctx && this.musicGain && this.elSource) {
      const g = this.musicGain.gain;
      const t = this.ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(Math.min(v, 1) * MUSIC_CEIL, t + Math.max(0.02, seconds));
    } else if (this.el) {
      this.el.volume = Math.max(0, Math.min(1, v));
    }
  }

  applyVolumes(): void {
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxOn ? this.sfxVolume * 0.9 : 0;
    if (this.wantMusic) {
      if (this.musicOn) {
        if (this.el?.paused && this.musicLoaded) this.startElement();
        this.fadeMusicTo(this.musicTarget(), 0.25);
      } else {
        this.fadeMusicTo(0, 0.25);
        window.setTimeout(() => { if (!this.musicOn) this.el?.pause(); }, 300);
      }
    }
  }

  setSettings(o: { music: number; sfx: number; musicOn: boolean; sfxOn: boolean }): void {
    this.musicVolume = o.music;
    this.sfxVolume = o.sfx;
    this.musicOn = o.musicOn;
    this.sfxOn = o.sfxOn;
    this.applyVolumes();
  }

  get musicPlaying(): boolean { return !!this.el && !this.el.paused; }

  private suspend(): void {
    if (this.el && !this.el.paused) this.el.pause();
    void this.ctx?.suspend().catch(() => undefined);
  }

  private onVisibility(): void {
    if (document.hidden) { this.suspend(); return; }
    void this.resume();
  }

  private async resume(): Promise<void> {
    if (!this.ctx) return;
    try {
      if (this.ctx.state !== 'running') await this.ctx.resume();
    } catch { /* attendra le prochain toucher */ }
    if (this.wantMusic && this.musicOn && this.el?.paused && this.musicLoaded) {
      this.fadeMusicTo(0, 0.01);
      this.startElement();
    }
  }

  // ------------------------------------------------------------------ effets

  private makeNoise(): AudioBuffer | null {
    if (!this.ctx) return null;
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = (seed / 0x7fffffff) * 2 - 1; }
    return b;
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number; attack?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * opts.slide), t + dur);
    const v = opts.vol ?? 0.3;
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
    this.voices++;
    o.onended = () => { this.voices--; o.disconnect(); g.disconnect(); };
  }

  private noiseBurst(dur: number, opts: { freq?: number; q?: number; vol?: number; delay?: number; type?: BiquadFilterType } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !this.noise) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.value = opts.freq ?? 2000;
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
    this.voices++;
    src.onended = () => { this.voices--; src.disconnect(); f.disconnect(); g.disconnect(); };
  }

  /**
   * Joue un effet. `pitch` (≥ 1) monte la note (niveau de l'objet, combo…).
   */
  play(name: Sfx, pitch = 1): void {
    if (!this.ctx || !this.sfxOn || this.sfxVolume <= 0 || this.ctx.state !== 'running') return;
    const now = performance.now();
    const last = this.lastPlayed.get(name) ?? 0;
    if (now - last < 40) return; // anti-rafale par effet
    if (this.voices > MAX_VOICES) return;
    this.lastPlayed.set(name, now);
    const p = pitch;
    switch (name) {
      case 'pop1':
        this.tone(520 * p, 0.12, { slide: 1.7, vol: 0.32 });
        this.noiseBurst(0.04, { freq: 3500, vol: 0.08 });
        break;
      case 'pop2':
        this.tone(440 * p, 0.16, { slide: 1.9, vol: 0.34 });
        this.tone(880 * p, 0.12, { slide: 1.4, vol: 0.12, type: 'triangle', delay: 0.03 });
        this.noiseBurst(0.05, { freq: 3000, vol: 0.1 });
        break;
      case 'pop3':
        this.tone(330 * p, 0.22, { slide: 2.1, vol: 0.36 });
        this.tone(660 * p, 0.2, { slide: 1.5, vol: 0.16, type: 'triangle', delay: 0.04 });
        this.tone(990 * p, 0.25, { vol: 0.08, type: 'sine', delay: 0.08 });
        this.noiseBurst(0.08, { freq: 2200, vol: 0.12 });
        break;
      case 'rare': {
        const notes = [659, 784, 988, 1319];
        notes.forEach((f, i) => this.tone(f * p, 0.35, { type: 'triangle', vol: 0.16, delay: i * 0.06 }));
        this.noiseBurst(0.3, { freq: 6000, q: 0.7, vol: 0.05, type: 'highpass' });
        break;
      }
      case 'combo': {
        const base = 523 * Math.pow(1.0595, Math.min(12, (p - 1) * 10));
        this.tone(base, 0.18, { type: 'triangle', vol: 0.18 });
        this.tone(base * 1.5, 0.22, { type: 'sine', vol: 0.12, delay: 0.05 });
        break;
      }
      case 'reward':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.14, delay: i * 0.05 }));
        break;
      case 'button':
        this.tone(740, 0.07, { slide: 1.3, vol: 0.16 });
        break;
      case 'chest':
        this.noiseBurst(0.25, { freq: 900, q: 0.8, vol: 0.12, type: 'lowpass' });
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.14, delay: 0.12 + i * 0.07 }));
        break;
      case 'achievement':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, { type: 'square', vol: 0.05, delay: i * 0.09 }));
        this.tone(1047, 0.5, { type: 'triangle', vol: 0.18, delay: 0.27 });
        break;
      case 'move':
        this.tone(190, 0.08, { slide: 0.7, vol: 0.3 });
        this.noiseBurst(0.05, { freq: 1200, q: 2, vol: 0.18 });
        break;
      case 'capture':
        this.tone(160, 0.1, { slide: 0.6, vol: 0.32 });
        this.noiseBurst(0.08, { freq: 900, q: 1.5, vol: 0.22 });
        this.tone(140, 0.08, { slide: 0.6, vol: 0.2, delay: 0.07 });
        break;
      case 'check':
        this.tone(880, 0.12, { type: 'triangle', vol: 0.15 });
        this.tone(660, 0.16, { type: 'triangle', vol: 0.12, delay: 0.1 });
        break;
      case 'victory':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.45, { type: 'triangle', vol: 0.15, delay: i * 0.1 }));
        this.tone(262, 0.9, { type: 'sine', vol: 0.15, delay: 0.4 });
        break;
      case 'invalid':
        this.tone(220, 0.14, { slide: 0.8, vol: 0.18, type: 'triangle' });
        break;
      case 'spawn':
        this.tone(600 * p, 0.09, { slide: 1.5, vol: 0.16 });
        break;
      case 'deliver':
        this.tone(1047, 0.12, { type: 'triangle', vol: 0.15 });
        this.tone(1568, 0.3, { type: 'triangle', vol: 0.13, delay: 0.08 });
        break;
      case 'pickup':
        this.tone(660, 0.05, { slide: 1.2, vol: 0.1 });
        break;
      case 'drop':
        this.tone(420 * p, 0.06, { slide: 0.8, vol: 0.12 });
        this.noiseBurst(0.025, { freq: 900, q: 1.5, vol: 0.05 });
        break;
      case 'whoosh':
        this.noiseBurst(0.35, { freq: 1500, q: 0.6, vol: 0.12 });
        break;
      case 'heart':
        this.tone(880 * p, 0.12, { type: 'sine', vol: 0.14 });
        this.tone(1320 * p, 0.16, { type: 'sine', vol: 0.1, delay: 0.06 });
        break;
      case 'sparkle':
        [1568, 2093, 2637].forEach((f, i) => this.tone(f * p, 0.14, { type: 'sine', vol: 0.06, delay: i * 0.04 }));
        break;
      case 'pop4': // plus rond, légèrement « bulle »
        this.tone(600 * p, 0.1, { slide: 1.5, vol: 0.3 });
        this.tone(1200 * p, 0.07, { slide: 1.2, vol: 0.09, type: 'triangle', delay: 0.02 });
        break;
      case 'pop5': // petit « plop » grave
        this.tone(300 * p, 0.14, { slide: 1.8, vol: 0.34 });
        this.noiseBurst(0.03, { freq: 2600, vol: 0.07 });
        break;
      case 'popRare': // double POP : deux notes qui montent + scintillement
        this.tone(440 * p, 0.14, { slide: 1.8, vol: 0.32 });
        this.tone(660 * p, 0.2, { slide: 1.6, vol: 0.3, delay: 0.09 });
        this.tone(1320 * p, 0.22, { type: 'triangle', vol: 0.1, delay: 0.12 });
        this.noiseBurst(0.06, { freq: 3200, vol: 0.09, delay: 0.09 });
        break;
      case 'maxMerge': { // grand accord ascendant, onde grave puis pluie d'étincelles
        this.tone(110, 0.5, { slide: 0.6, vol: 0.34, type: 'sine' });
        this.noiseBurst(0.4, { freq: 700, q: 0.7, vol: 0.14, type: 'lowpass' });
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f * p, 0.5, { type: 'triangle', vol: 0.13, delay: 0.08 + i * 0.07 }));
        [2093, 2637, 3136, 2349].forEach((f, i) => this.tone(f * p, 0.16, { vol: 0.05, delay: 0.5 + i * 0.06 }));
        break;
      }
      case 'chestOpen':
        this.tone(180, 0.12, { slide: 0.7, vol: 0.2, type: 'triangle' });
        this.noiseBurst(0.18, { freq: 1100, q: 0.8, vol: 0.12, type: 'lowpass', delay: 0.04 });
        [659, 880, 1175, 1568].forEach((f, i) => this.tone(f * p, 0.26, { type: 'triangle', vol: 0.13, delay: 0.14 + i * 0.06 }));
        this.tone(2349, 0.2, { vol: 0.05, delay: 0.42 });
        break;
      case 'select': // très doux
        this.tone(740 * p, 0.05, { slide: 1.15, vol: 0.07 });
        break;
      case 'windup': // petite montée « on se prépare »
        this.tone(300 * p, 0.07, { slide: 1.5, vol: 0.06, type: 'triangle' });
        break;
      // ---- Casino Royal et roue du jour (synthétiques, courts, jamais permanents)
      case 'chip': // jeton posé : petit « clac » mat
        this.tone(1250 * p, 0.05, { slide: 0.7, vol: 0.12, type: 'triangle' });
        this.noiseBurst(0.025, { freq: 4200, q: 2, vol: 0.07 });
        break;
      case 'chipWin': // pièces qui tintent
        [1568, 2093, 1760].forEach((f, i) => this.tone(f * p, 0.12, { type: 'triangle', vol: 0.07, delay: i * 0.05 }));
        this.noiseBurst(0.05, { freq: 6500, q: 1.5, vol: 0.04, type: 'highpass' });
        break;
      case 'rouletteTick': // bille qui saute d'une case à l'autre
        this.tone(2400 * p, 0.03, { slide: 0.8, vol: 0.05, type: 'square' });
        break;
      case 'ballDrop': // impact de la bille dans la case
        this.tone(260, 0.1, { slide: 0.6, vol: 0.22, type: 'triangle' });
        this.noiseBurst(0.05, { freq: 2800, q: 1.5, vol: 0.12 });
        this.tone(1900, 0.06, { vol: 0.06, delay: 0.05 });
        break;
      case 'reelStop': // arrêt d'un rouleau : POP rond
        this.tone(360 * p, 0.1, { slide: 1.7, vol: 0.28 });
        this.noiseBurst(0.03, { freq: 2400, vol: 0.08 });
        break;
      case 'cardDeal': // carte qui glisse sur le tapis
        this.noiseBurst(0.09, { freq: 3200, q: 0.7, vol: 0.07, type: 'highpass' });
        break;
      case 'cardFlip': // carte retournée
        this.noiseBurst(0.05, { freq: 2600, q: 1, vol: 0.06 });
        this.tone(900 * p, 0.04, { slide: 1.3, vol: 0.05, type: 'triangle', delay: 0.03 });
        break;
      case 'jackpot': // grande célébration (douce, jamais agressive)
        [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.1, delay: i * 0.07 }));
        [2349, 2637, 3136, 3520].forEach((f, i) => this.tone(f, 0.15, { vol: 0.04, delay: 0.55 + i * 0.06 }));
        break;
      case 'wheelTick': // cliquetis de la roue
        this.tone(1500 * p, 0.025, { slide: 0.75, vol: 0.05, type: 'triangle' });
        break;
      case 'fwLaunch': // fusée qui monte : sifflement doux et montant
        this.tone(520 * p, 0.55, { type: 'sine', slide: 3.4, vol: 0.05, attack: 0.04 });
        this.noiseBurst(0.5, { freq: 3200, q: 1.4, vol: 0.035, type: 'highpass' });
        break;
      case 'fwBurst': // explosion lointaine et ronde, jamais agressive
        this.noiseBurst(0.5, { freq: 420, q: 0.5, vol: 0.2, type: 'lowpass' });
        this.tone(95 * p, 0.35, { type: 'sine', slide: 0.5, vol: 0.14 });
        this.tone(1760 * p, 0.3, { type: 'sine', vol: 0.03, delay: 0.05 });
        break;
      case 'fwCrackle': // petits crépitements dorés
        for (let i = 0; i < 7; i++) this.noiseBurst(0.04, { freq: 5200 + i * 380, q: 3, vol: 0.05, delay: i * 0.05 + (i % 2) * 0.02 });
        break;
      case 'crystal': // arpège cristallin, longue résonance (révélation du collier)
        [1568, 2093, 2637, 3136, 3951].forEach((f, i) => this.tone(f * p, 1.1, { type: 'sine', vol: 0.055, delay: i * 0.09, attack: 0.01 }));
        this.tone(523, 1.6, { type: 'triangle', vol: 0.05, attack: 0.08 });
        this.tone(784, 1.6, { type: 'triangle', vol: 0.04, attack: 0.1, delay: 0.1 });
        break;
      case 'crystalSoft': // tintement bref (équipement, étincelle)
        [2637, 3520].forEach((f, i) => this.tone(f * p, 0.5, { type: 'sine', vol: 0.05, delay: i * 0.06 }));
        break;
      case 'page':
        this.noiseBurst(0.12, { freq: 2500, q: 0.5, vol: 0.07 });
        break;
    }
  }
}

export const audio = new AudioManager();
