/**
 * Roue + bille de roulette (Canvas 2D). La case gagnante est DÉJÀ décidée : l'animation s'y conforme
 * (la bille tourne à contre-sens, ralentit, saute de case en case avec un « clic » et tombe dans la bonne).
 */
import { rouletteWheelCanvas } from '../../game/art/casino';
import { WHEEL_ORDER, colorOf, pocketIndex } from '../roulette';

const LOGICAL = 320;
const STEP = (Math.PI * 2) / 37;
const ease = (p: number) => 1 - (1 - p) ** 3;

export interface SpinHooks { tick(): void; drop(): void; settle(): void }

export class RouletteWheel {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tex: HTMLCanvasElement;
  private rot = 0;
  private ballA: number | null = null; // angle absolu de la bille (null = pas de bille)
  private ballR = 0;
  private raf = 0;
  private dead = false;
  constructor() {
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = Math.round(LOGICAL * dpr);
    this.canvas.className = 'rl-rwheel';
    this.canvas.setAttribute('role', 'img'); this.canvas.setAttribute('aria-label', 'Roue de roulette');
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.tex = rouletteWheelCanvas(LOGICAL / 2 - 4, WHEEL_ORDER, colorOf);
    this.draw();
  }
  destroy(): void { this.dead = true; cancelAnimationFrame(this.raf); }

  /** Dessin d'une image : roue tournée de `rot`, bille à son angle absolu. */
  draw(): void {
    const c = this.ctx, R = LOGICAL / 2;
    c.clearRect(0, 0, LOGICAL, LOGICAL);
    c.save(); c.translate(R, R); c.rotate(this.rot);
    c.drawImage(this.tex, -(R - 4), -(R - 4), (R - 4) * 2, (R - 4) * 2);
    c.restore();
    // repère fixe en haut (petit losange doré)
    c.beginPath(); c.moveTo(R, 3); c.lineTo(R + 7, 15); c.lineTo(R, 27); c.lineTo(R - 7, 15); c.closePath();
    c.fillStyle = '#FFE9A8'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#3B2330'; c.stroke();
    if (this.ballA !== null) {
      const x = R + Math.cos(this.ballA) * this.ballR, y = R + Math.sin(this.ballA) * this.ballR;
      c.beginPath(); c.arc(x + 1.5, y + 2.5, 6.4, 0, Math.PI * 2); c.fillStyle = 'rgba(20,10,40,.45)'; c.fill();
      const g = c.createRadialGradient(x - 2, y - 2, 1, x, y, 7); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.6, '#F1ECF8'); g.addColorStop(1, '#B9A5E8');
      c.beginPath(); c.arc(x, y, 6.2, 0, Math.PI * 2); c.fillStyle = g; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(59,35,48,.6)'; c.stroke();
    }
  }

  clearBall(): void { this.ballA = null; this.draw(); }

  /** Lance la bille vers la case `n`. Résout quand elle est posée. `reduced` : version courte et sans rebonds. */
  spinTo(n: number, hooks: SpinHooks, reduced: boolean): Promise<void> {
    cancelAnimationFrame(this.raf);
    const R = LOGICAL / 2;
    const idx = pocketIndex(n);
    const target = -Math.PI / 2 + idx * STEP; // angle de la case sur la roue (au repos)
    const T = reduced ? 1.6 : 5.2;
    const turns = reduced ? 2 : 6 + Math.floor(Math.random() * 2);
    const w0 = 1.1, wEnd = 0.28; // vitesse de la roue (rad/s)
    const rim = R * 0.865, pocket = R * 0.755;
    this.ballA = target; this.ballR = rim;
    let t0 = 0, last = 0, lastIdx = -1, dropped = false, lastTick = 0;
    return new Promise((resolve) => {
      const frame = (now: number) => {
        if (this.dead) { resolve(); return; }
        if (!t0) { t0 = now; last = now; }
        const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
        const p = Math.min(1, t / T);
        const w = wEnd + (w0 - wEnd) * (1 - p) ** 2;
        this.rot += w * dt;
        // angle relatif de la bille par rapport à la roue : tours restants + petits rebonds à l'arrivée
        const jitter = reduced || p < 0.8 ? 0 : 0.16 * Math.sin(26 * (p - 0.8)) * Math.exp(-14 * (p - 0.8));
        const rel = (Math.PI * 2 * turns) * (1 - ease(p)) + jitter;
        this.ballA = this.rot + target + rel;
        // rayon : piste extérieure puis chute vers la case
        const q = Math.min(1, Math.max(0, (p - 0.66) / 0.22));
        this.ballR = rim + (pocket - rim) * (q * q * (3 - 2 * q)) + (reduced ? 0 : (p > 0.86 ? 3 * Math.sin(30 * (p - 0.86)) * Math.exp(-10 * (p - 0.86)) : 0));
        // clic à chaque case franchie (une fois la bille assez lente pour l'entendre)
        const relCase = ((rel % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const cur = Math.floor(relCase / STEP);
        if (cur !== lastIdx) { lastIdx = cur; if (p > 0.55 && now - lastTick > 55) { lastTick = now; hooks.tick(); } }
        if (!dropped && p > 0.86) { dropped = true; hooks.drop(); }
        this.draw();
        if (p < 1) this.raf = requestAnimationFrame(frame);
        else { this.ballA = this.rot + target; this.ballR = pocket; this.draw(); hooks.settle(); this.coast(resolve); }
      };
      this.raf = requestAnimationFrame(frame);
    });
  }

  /** La roue continue de tourner doucement quelques secondes, la bille collée à sa case. */
  private coast(resolve: () => void): void {
    resolve();
    const target = this.ballA! - this.rot;
    let last = performance.now(); const until = last + 2500;
    const frame = (now: number) => {
      if (this.dead) return;
      this.rot += 0.28 * Math.min(0.05, (now - last) / 1000); last = now;
      this.ballA = this.rot + target;
      this.draw();
      if (now < until) this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }
}
