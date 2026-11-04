/** Les trois rouleaux de la machine à sous (Canvas 2D) : défilement, ralentissement, arrêt successif avec petit rebond. */
import { slotSymbolCanvas } from '../../game/art/casino';
import { SYMBOLS, type SymId } from '../slotsTable';
import { roundRect } from '../../game/art/kit';

/** Ruban visuel d'un rouleau (décor) : chaque symbole y figure ; le symbole d'arrivée est toujours celui du tirage. */
export const STRIP: readonly SymId[] = ['heart', 'flower', 'heart', 'choco', 'star', 'heart', 'bag', 'flower', 'crown', 'heart', 'choco', 'flower', 'diamond', 'heart', 'bag', 'flower', 'choco', 'star', 'heart', 'crown', 'bag'];
const L = STRIP.length;
const CELL = 88, GAP = 6, PADX = 8, PADY = 6;
export const REELS_W = PADX * 2 + CELL * 3 + GAP * 2;
export const REELS_H = PADY * 2 + CELL * 3;

export interface StopHooks { onStop(i: number): void }
interface Anim { from: number; to: number; t0: number; dur: number; done: boolean; stopAt: number }

export class Reels {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imgs = new Map<SymId, HTMLCanvasElement>();
  private pos = [0, 3, 7];
  private anims: (Anim | null)[] = [null, null, null];
  private win: { cols: number[]; t0: number } | null = null;
  private raf = 0;
  private dead = false;
  private lastV = [0, 0, 0];
  constructor() {
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(REELS_W * dpr); this.canvas.height = Math.round(REELS_H * dpr);
    this.canvas.className = 'sl-canvas';
    this.canvas.setAttribute('role', 'img'); this.canvas.setAttribute('aria-label', 'Rouleaux de la machine à sous');
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    for (const s of SYMBOLS) this.imgs.set(s.id, slotSymbolCanvas(s.id, CELL - 14));
    this.draw(performance.now());
  }
  destroy(): void { this.dead = true; cancelAnimationFrame(this.raf); }

  /** Affiche directement une combinaison (rouleaux arrêtés). */
  show(ids: SymId[]): void {
    ids.forEach((id, i) => { this.pos[i] = this.indexAfter(this.pos[i], id, 0); this.anims[i] = null; });
    this.win = null; this.draw(performance.now());
  }
  clearWin(): void { this.win = null; }
  setWin(cols: number[]): void { this.win = { cols, t0: performance.now() }; this.kick(); }

  /** Premier indice du ruban portant `id`, au moins `min` cases après `from`. */
  private indexAfter(from: number, id: SymId, min: number): number {
    let k = Math.ceil(from + min);
    for (let guard = 0; guard < L * 2; guard++, k++) if (STRIP[((k % L) + L) % L] === id) return k;
    return k;
  }

  /** Lance les rouleaux vers `result`. Résout quand le dernier est posé. */
  spinTo(result: SymId[], hooks: StopHooks, reduced: boolean): Promise<void> {
    this.win = null;
    const now = performance.now();
    result.forEach((id, i) => {
      const min = reduced ? 6 + i * 3 : L * (1.1 + i * 0.55);
      const to = this.indexAfter(this.pos[i], id, min);
      this.anims[i] = { from: this.pos[i], to, t0: now + i * 40, dur: (reduced ? 650 + i * 260 : 1350 + i * 620), done: false, stopAt: 0 };
    });
    return new Promise((resolve) => {
      const loop = (t: number) => {
        if (this.dead) { resolve(); return; }
        let busy = false;
        this.anims.forEach((a, i) => {
          if (!a) return;
          const p = Math.min(1, Math.max(0, (t - a.t0) / a.dur));
          const e = 1 - (1 - p) ** 3;
          const prev = this.pos[i];
          let pos = a.from + (a.to - a.from) * e;
          if (p >= 1) {
            if (!a.done) { a.done = true; a.stopAt = t; hooks.onStop(i); }
            const s = (t - a.stopAt) / 1000;
            if (s > 0.55) { this.pos[i] = a.to; this.lastV[i] = 0; this.anims[i] = null; return; }
            pos = a.to + (reduced ? 0 : 0.14 * Math.exp(-8 * s) * Math.sin(22 * s));
          }
          this.lastV[i] = Math.abs(pos - prev) * 60;
          this.pos[i] = pos; busy = true;
        });
        this.draw(t);
        if (busy) this.raf = requestAnimationFrame(loop);
        else { this.anims = [null, null, null]; this.draw(t); resolve(); this.kick(); }
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  /** Boucle d'animation légère tant qu'une combinaison gagnante pulse (3 secondes, puis fixe). */
  private kick(): void {
    cancelAnimationFrame(this.raf);
    const loop = (t: number) => {
      if (this.dead) return;
      this.draw(t);
      if (this.win && t - this.win.t0 < 3200) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  draw(t: number): void {
    const c = this.ctx;
    c.clearRect(0, 0, REELS_W, REELS_H);
    for (let r = 0; r < 3; r++) {
      const x = PADX + r * (CELL + GAP);
      c.save();
      roundRect(c, x, PADY, CELL, CELL * 3, 12); c.clip();
      const g = c.createLinearGradient(0, PADY, 0, PADY + CELL * 3); g.addColorStop(0, '#E9DDF9'); g.addColorStop(0.5, '#FFFBF4'); g.addColorStop(1, '#E9DDF9'); c.fillStyle = g; c.fillRect(x, PADY, CELL, CELL * 3);
      const pos = this.pos[r], v = this.lastV[r];
      const fast = this.anims[r] && !this.anims[r]!.done ? Math.min(1, v / 14) : 0;
      const base = Math.floor(pos);
      for (let i = base - 2; i <= base + 2; i++) {
        const y = PADY + CELL * 1.5 + (i - pos) * CELL;
        const id = STRIP[((i % L) + L) % L];
        const img = this.imgs.get(id)!;
        const sc = 1 + fast * 0.28;
        c.save(); c.globalAlpha = 1 - fast * 0.28; c.translate(x + CELL / 2, y); c.scale(1, sc);
        c.drawImage(img, -(CELL - 14) / 2, -(CELL - 14) / 2, CELL - 14, CELL - 14);
        c.restore();
      }
      // cylindre : ombres en haut et en bas
      const sh = c.createLinearGradient(0, PADY, 0, PADY + CELL * 3);
      sh.addColorStop(0, 'rgba(46,27,84,.55)'); sh.addColorStop(0.28, 'rgba(46,27,84,0)'); sh.addColorStop(0.72, 'rgba(46,27,84,0)'); sh.addColorStop(1, 'rgba(46,27,84,.55)');
      c.fillStyle = sh; c.fillRect(x, PADY, CELL, CELL * 3);
      c.restore();
      c.save(); roundRect(c, x, PADY, CELL, CELL * 3, 12); c.lineWidth = 3; c.strokeStyle = '#C9922B'; c.stroke(); c.restore();
    }
    // ligne de gain (centre) et combinaison gagnante qui pulse
    const cy = PADY + CELL * 1.5;
    if (this.win) {
      const s = (t - this.win.t0) / 1000;
      const pulse = 0.55 + 0.45 * Math.sin(s * 7) * Math.exp(-s * 0.35);
      for (const col of this.win.cols) {
        const x = PADX + col * (CELL + GAP);
        c.save(); roundRect(c, x + 2, cy - CELL / 2 + 2, CELL - 4, CELL - 4, 10);
        c.fillStyle = `rgba(255,226,140,${0.22 + pulse * 0.28})`; c.fill(); c.lineWidth = 3.4; c.strokeStyle = `rgba(255,200,60,${0.7 + pulse * 0.3})`; c.shadowColor = '#FFD76A'; c.shadowBlur = 8 + pulse * 10; c.stroke(); c.restore();
      }
    }
    c.save(); c.strokeStyle = this.win ? '#FF75A8' : 'rgba(255,117,168,.75)'; c.lineWidth = this.win ? 3 : 2; c.setLineDash([2, 6]); c.lineCap = 'round';
    c.beginPath(); c.moveTo(PADX + 4, cy); c.lineTo(REELS_W - PADX - 4, cy); c.stroke(); c.restore();
  }
}
