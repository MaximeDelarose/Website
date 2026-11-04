/**
 * Moteur de feux d'artifice 2D (Canvas, additif) : fusées avec traînées, explosions (pivoine, anneau, saule doré, cœur),
 * et « écriture » d'un message : des points cibles (lettres RADIA ❤️) sont rejoints un à un par des étincelles
 * qui laissent une traînée, puis le message reste allumé et scintille. Budget de particules plafonné ;
 * mode réduit (effets réduits) : pas de traînées ni de vol, apparition en fondu.
 * Le moteur ne touche ni au DOM ni à l'audio (le son passe par le rappel `sfx`).
 */
import { makeCanvas } from '../../game/art/kit';
import type { Message } from './letters';

export type FwSfx = 'fwLaunch' | 'fwBurst' | 'fwCrackle';
export interface FwConfig { reduced: boolean; sfx?: (n: FwSfx) => void; maxSparks?: number; maxStars?: number }
export type BurstKind = 'peony' | 'ring' | 'willow' | 'heart' | 'palm';
export interface BurstSpec { kind: BurstKind; color: string; color2?: string; n: number; speed: number }

export const FW_COLORS = ['#ff7fb0', '#ffd36b', '#9fd0ff', '#c9a6ff', '#ff9a7a', '#8ff0c0'] as const;
export const GOLD = '#ffd98a';
export const HEART_PINK = '#ff6f9f';

interface Rocket { x0: number; y0: number; x1: number; y1: number; t0: number; dur: number; spec: BurstSpec; trail: number[]; done: boolean }
interface Spark { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; color: string; g: number; trail: number[]; tw: boolean }
interface Star { ox: number; oy: number; x: number; y: number; t0: number; dur: number; color: string; core: string; size: number; ph: number; trail: number[]; arrived: boolean; letter: number }

const ease = (x: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(color: string): HTMLCanvasElement {
  let c = sprites.get(color);
  if (!c) {
    c = makeCanvas(64, 64);
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, color); gr.addColorStop(0.45, color + '66'); gr.addColorStop(1, color + '00');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    sprites.set(color, c);
  }
  return c;
}

export class Fireworks {
  t = 0;
  /** éclair de lumière (0..1) et sa couleur : éclaire le ciel et les personnages */
  flash = 0;
  flashColor: string = GOLD;
  /** opacité du message (fondu de sortie) */
  messageAlpha = 1;
  private rockets: Rocket[] = [];
  private sparks: Spark[] = [];
  private stars: Star[] = [];
  private queue: { t: number; fn: () => void }[] = [];
  private maxSparks: number;
  private maxStars: number;
  private frame = 0;
  /** statistiques (tests / debug) */
  stats = { launched: 0, bursts: 0, peakSparks: 0 };

  constructor(private cfg: FwConfig) {
    this.maxSparks = cfg.maxSparks ?? (cfg.reduced ? 90 : 420);
    this.maxStars = cfg.maxStars ?? 340;
  }

  get reduced(): boolean { return this.cfg.reduced; }
  /** Planifie `fn` dans `delay` secondes (temps du moteur). */
  at(delay: number, fn: () => void): void { this.queue.push({ t: this.t + Math.max(0, delay), fn }); }
  get sparkCount(): number { return this.sparks.length; }
  get starCount(): number { return this.stars.length; }
  /** Part des points du message déjà arrivés à leur place (0..1). */
  messageProgress(): number { return this.stars.length ? this.stars.filter((s) => s.arrived).length / this.stars.length : 0; }
  clearMessage(): void { this.stars.length = 0; this.messageAlpha = 1; }
  /** Vide tout (rejouer le spectacle). */
  reset(): void { this.rockets.length = 0; this.sparks.length = 0; this.stars.length = 0; this.queue.length = 0; this.flash = 0; this.messageAlpha = 1; }

  /** Fusée : monte de (x, bas) à (x, y1) puis explose selon `spec`. */
  launch(x: number, y1: number, bottom: number, spec: BurstSpec, dur = 0.95): void {
    this.stats.launched++;
    this.cfg.sfx?.('fwLaunch');
    if (this.cfg.reduced) { this.at(0.25, () => this.explode(x, y1, spec)); return; }
    this.rockets.push({ x0: x + (Math.random() - 0.5) * 40, y0: bottom + 8, x1: x, y1, t0: this.t, dur, spec, trail: [x, bottom + 8, x, bottom + 8], done: false });
  }

  /** Explosion immédiate (budget de particules respecté). */
  explode(x: number, y: number, spec: BurstSpec): void {
    this.stats.bursts++;
    this.cfg.sfx?.('fwBurst');
    if (spec.kind === 'willow') this.at(0.35, () => this.cfg.sfx?.('fwCrackle'));
    this.flash = Math.min(1, this.flash + 0.55);
    this.flashColor = spec.color;
    const room = Math.max(0, this.maxSparks - this.sparks.length);
    const n = Math.min(spec.n, room);
    const tr = !this.cfg.reduced;
    for (let i = 0; i < n; i++) {
      const k = i / Math.max(1, n);
      let vx: number, vy: number;
      const sp = spec.speed * (spec.kind === 'ring' ? 1 : 0.55 + Math.random() * 0.5);
      if (spec.kind === 'heart') {
        const a = k * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(a), 3), hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        vx = (hx / 16) * sp * 1.05; vy = (hy / 16) * sp * 1.05;
      } else {
        const a = k * Math.PI * 2 + (spec.kind === 'ring' ? 0 : Math.random() * 0.4);
        vx = Math.cos(a) * sp; vy = Math.sin(a) * sp * (spec.kind === 'palm' ? 0.85 : 1);
      }
      const willow = spec.kind === 'willow';
      this.sparks.push({
        x, y, vx, vy, age: 0, life: (willow ? 1.9 : 1.15) + Math.random() * 0.7, size: willow ? 2.6 : 2.2 + Math.random() * 1.2,
        color: i % 3 === 0 && spec.color2 ? spec.color2 : spec.color, g: willow ? 95 : 62, trail: tr ? [x, y] : [], tw: willow || i % 5 === 0,
      });
    }
    this.stats.peakSparks = Math.max(this.stats.peakSparks, this.sparks.length);
  }

  /**
   * Écrit le message : pour chaque glyphe, une fusée dorée monte au centre de la lettre, éclate, puis les points du tracé
   * sont rejoints un à un (ordre de tracé) par des étincelles à traînée. `ox, oy` = coin supérieur gauche de la zone du message.
   */
  writeMessage(msg: Message, ox: number, oy: number, bottom: number, opts: { letterGap?: number; draw?: number; fly?: number; start?: number } = {}): { total: number } {
    const gap = opts.letterGap ?? 1.45, draw = opts.draw ?? 1.3, fly = opts.fly ?? 0.55, start = opts.start ?? 0;
    const reduced = this.cfg.reduced;
    msg.letters.forEach((L, li) => {
      const cx = ox + L.x + L.w / 2, cy = oy + L.y + L.h / 2;
      const heart = L.ch === '♥';
      const color = heart ? HEART_PINK : GOLD;
      const core = heart ? '#ffe3ec' : '#fffbe8';
      const t0 = start + li * gap;
      const riseDur = 0.9;
      this.at(t0, () => this.launch(cx, cy, bottom, { kind: heart ? 'heart' : 'willow', color, color2: '#ffffff', n: heart ? 34 : 26, speed: 70 }, riseDur));
      const pts = msg.points.slice(L.from, L.from + L.count);
      pts.forEach((p, i) => {
        if (this.stars.length >= this.maxStars) return;
        const delay = (reduced ? 0.05 * li : riseDur + 0.05) + (i / Math.max(1, pts.length)) * draw;
        const star: Star = { ox: cx, oy: cy, x: ox + p.x, y: oy + p.y, t0: this.t + t0 + delay, dur: reduced ? 0.6 : fly, color, core, size: 2.8, ph: Math.random() * 6.28, trail: [], arrived: false, letter: li };
        this.stars.push(star);
      });
    });
    return { total: this.stars.length };
  }

  update(dt: number): void {
    dt = Math.min(0.1, Math.max(0, dt));
    this.t += dt;
    this.frame++;
    this.flash = Math.max(0, this.flash - dt * 1.5);
    for (let i = this.queue.length - 1; i >= 0; i--) if (this.queue[i].t <= this.t) { const q = this.queue.splice(i, 1)[0]; q.fn(); }
    const tr = !this.cfg.reduced;
    // fusées
    for (const r of this.rockets) {
      const k = Math.min(1, (this.t - r.t0) / r.dur);
      const e = ease(k);
      const x = r.x0 + (r.x1 - r.x0) * e + Math.sin(k * 9) * 2 * (1 - k);
      const y = r.y0 + (r.y1 - r.y0) * e;
      if (tr && this.frame % 2 === 0) { r.trail.push(x, y); if (r.trail.length > 18) r.trail.splice(0, 2); }
      if (k >= 1 && !r.done) { r.done = true; this.explode(r.x1, r.y1, r.spec); } else if (!r.done && r.trail.length >= 2) { r.trail[r.trail.length - 2] = x; r.trail[r.trail.length - 1] = y; }
    }
    this.rockets = this.rockets.filter((r) => !r.done);
    // étincelles
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.age += dt;
      if (s.age >= s.life) { this.sparks.splice(i, 1); continue; }
      s.vy += s.g * dt; const d = Math.exp(-1.7 * dt); s.vx *= d; s.vy *= d;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (tr && this.frame % 2 === 0) { s.trail.push(s.x, s.y); if (s.trail.length > 10) s.trail.splice(0, 2); }
    }
    // points du message
    for (const st of this.stars) {
      const k = (this.t - st.t0) / st.dur;
      if (k < 0 || st.arrived) continue;
      if (k >= 1) { st.arrived = true; st.trail.length = 0; continue; }
      if (tr && this.frame % 2 === 0) { const e = ease(k); st.trail.push(st.ox + (st.x - st.ox) * e, st.oy + (st.y - st.oy) * e); if (st.trail.length > 12) st.trail.splice(0, 2); }
    }
  }

  private dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number): void {
    g.globalAlpha = a;
    g.drawImage(sprite(color), x - r, y - r, r * 2, r * 2);
  }
  private trail(g: CanvasRenderingContext2D, tr: number[], color: string, w: number, a: number): void {
    for (let i = 2; i < tr.length; i += 2) {
      const f = i / tr.length;
      g.globalAlpha = a * f * f; g.strokeStyle = color; g.lineWidth = Math.max(0.6, w * f);
      g.beginPath(); g.moveTo(tr[i - 2], tr[i - 1]); g.lineTo(tr[i], tr[i + 1]); g.stroke();
    }
  }

  /** Dessine tout (mode additif). `scale` = facteur de taille des points. */
  render(g: CanvasRenderingContext2D, scale = 1): void {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    for (const r of this.rockets) {
      this.trail(g, r.trail, '#ffe9b0', 2.6, 0.9);
      const x = r.trail[r.trail.length - 2] ?? r.x0, y = r.trail[r.trail.length - 1] ?? r.y0;
      this.dot(g, x, y, 9 * scale, '#ffe9b0', 0.95);
    }
    for (const s of this.sparks) {
      const f = 1 - s.age / s.life;
      const a = Math.pow(f, 0.85) * (s.tw ? 0.7 + 0.3 * Math.sin(s.age * 40 + s.x) : 1);
      if (s.trail.length) this.trail(g, s.trail, s.color, s.size * 0.9 * scale, a * 0.55);
      this.dot(g, s.x, s.y, s.size * 3.3 * scale * (0.6 + 0.4 * f), s.color, a);
    }
    const ma = this.messageAlpha;
    for (const st of this.stars) {
      const k = (this.t - st.t0) / st.dur;
      if (k < 0) continue;
      if (!st.arrived) {
        if (this.cfg.reduced) { this.dot(g, st.x, st.y, st.size * 3.2 * scale, st.color, Math.min(1, k) * ma); continue; }
        const e = ease(k);
        const x = st.ox + (st.x - st.ox) * e, y = st.oy + (st.y - st.oy) * e;
        this.trail(g, st.trail, st.color, 2.4 * scale, 0.85 * ma);
        this.dot(g, x, y, st.size * 3.4 * scale, st.color, ma);
        continue;
      }
      const tw = this.cfg.reduced ? 1 : 0.8 + 0.2 * Math.sin(this.t * 3.2 + st.ph);
      const born = Math.min(1, (this.t - st.t0 - st.dur) / 0.35);
      const r = st.size * scale * (1 + (1 - born) * 1.6);
      this.dot(g, st.x, st.y, r * 2.5, st.color, 0.62 * tw * ma);
      this.dot(g, st.x, st.y, r * 1.15, st.core, 1 * ma);
    }
    g.restore();
    g.globalAlpha = 1;
  }
}
