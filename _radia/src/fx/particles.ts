/* Particules légères sur un canvas posé au-dessus de l'échiquier (ou de l'écran).
   La boucle d'animation ne tourne que tant qu'il reste des particules. */

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; shape: 0 | 1 | 2 | 3; rot: number; vr: number; g: number }

export const PALETTE = ["#FF75A8", "#F5B5C8", "#F3C86B", "#B9A5E8", "#FFF4E8", "#FF9BBE"];

export class Particles {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ps: P[] = [];
  private raf = 0;
  private last = 0;
  private dpr = 1;
  /** Décalage entre l'origine de l'hôte et celle du canvas (canvas débordant). */
  private ox = 0;
  private oy = 0;
  reduced = false;

  constructor(private readonly host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "fx-canvas";
    host.append(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(host);
    this.resize();
  }

  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const hr = this.host.getBoundingClientRect();
    this.ox = hr.left - r.left;
    this.oy = hr.top - r.top;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
  }

  /** Éclat de particules : intensité 1 (pion) → 4 (dame). */
  burst(x: number, y: number, intensity: number, unit: number): void {
    this.resize();
    x += this.ox; y += this.oy;
    const n = this.reduced ? 6 : Math.round(10 + intensity * 12);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = unit * (1.6 + Math.random() * (1.4 + intensity * 0.9));
      this.ps.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - unit * 0.6,
        life: 0, max: 0.45 + Math.random() * 0.35 + intensity * 0.06,
        size: unit * (0.05 + Math.random() * 0.06) * (1 + intensity * 0.15),
        color: PALETTE[(Math.random() * PALETTE.length) | 0],
        shape: (Math.random() < 0.35 ? 1 : Math.random() < 0.5 ? 2 : 0) as 0 | 1 | 2,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, g: unit * 3.2,
      });
    }
    this.kick();
  }

  /** Pluie de confettis depuis le haut de la zone. */
  confetti(count = 120): void {
    this.resize();
    const w = this.canvas.width / this.dpr;
    const unit = Math.max(30, w / 8);
    const n = this.reduced ? 24 : count;
    for (let i = 0; i < n; i++) {
      this.ps.push({
        x: Math.random() * w, y: -20 - Math.random() * 120,
        vx: (Math.random() - 0.5) * unit * 1.2, vy: unit * (0.6 + Math.random() * 1.6),
        life: 0, max: 2.4 + Math.random() * 1.6, size: unit * (0.09 + Math.random() * 0.08),
        color: PALETTE[(Math.random() * PALETTE.length) | 0], shape: Math.random() < 0.18 ? 3 : 1,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, g: unit * 0.5,
      });
    }
    this.kick();
  }

  /** Étincelles dorées montantes. */
  sparkles(x: number, y: number, unit: number, n = 18): void {
    this.resize();
    x += this.ox; y += this.oy;
    for (let i = 0; i < (this.reduced ? 5 : n); i++) {
      this.ps.push({
        x: x + (Math.random() - 0.5) * unit, y: y + (Math.random() - 0.5) * unit * 0.6,
        vx: (Math.random() - 0.5) * unit * 0.6, vy: -unit * (0.6 + Math.random()),
        life: 0, max: 0.8 + Math.random() * 0.6, size: unit * (0.05 + Math.random() * 0.05),
        color: Math.random() < 0.7 ? "#F3C86B" : "#FFF4E8", shape: 2, rot: 0, vr: 2, g: -unit * 0.2,
      });
    }
    this.kick();
  }

  private kick(): void {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private frame(t: number): void {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const alive: P[] = [];
    for (const p of this.ps) {
      p.life += dt;
      if (p.life >= p.max) continue;
      p.vy += p.g * dt;
      p.vx *= 1 - 1.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const k = 1 - p.life / p.max;
      c.globalAlpha = Math.min(1, k * 1.6);
      c.fillStyle = p.color;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      const s = p.size * (p.shape === 1 || p.shape === 3 ? 1 : 0.6 + k * 0.5);
      if (p.shape === 0) { c.beginPath(); c.arc(0, 0, s, 0, Math.PI * 2); c.fill(); }
      else if (p.shape === 1) c.fillRect(-s, -s * 0.45, s * 2, s * 0.9);
      else if (p.shape === 2) star(c, s);
      else heart(c, s);
      c.restore();
      alive.push(p);
    }
    c.globalAlpha = 1;
    this.ps = alive;
    if (alive.length) this.raf = requestAnimationFrame((tt) => this.frame(tt));
    else { this.raf = 0; c.clearRect(0, 0, this.canvas.width, this.canvas.height); }
  }

  clear(): void { this.ps = []; }
}

function star(c: CanvasRenderingContext2D, s: number): void {
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? s * 0.4 : s * 1.4;
    const a = (i / 8) * Math.PI * 2;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
}

function heart(c: CanvasRenderingContext2D, s: number): void {
  c.beginPath();
  c.moveTo(0, s * 0.9);
  c.bezierCurveTo(-s * 1.4, 0, -s * 1.2, -s * 1.1, -s * 0.5, -s * 1.1);
  c.bezierCurveTo(-s * 0.2, -s * 1.1, 0, -s * 0.8, 0, -s * 0.6);
  c.bezierCurveTo(0, -s * 0.8, s * 0.2, -s * 1.1, s * 0.5, -s * 1.1);
  c.bezierCurveTo(s * 1.2, -s * 1.1, s * 1.4, 0, 0, s * 0.9);
  c.fill();
}
