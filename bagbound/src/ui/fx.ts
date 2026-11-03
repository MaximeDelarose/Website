// Effets visuels simples : chiffres flottants, particules, flashs, bannières.
// Hors simulation : Math.random est permis ici (purement cosmétique).

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
  life: number;
  big: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  t: number;
  life: number;
  size: number;
}

export interface Projectile {
  sprite: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  life: number;
}

export class Fx {
  floats: FloatText[] = [];
  particles: Particle[] = [];
  projectiles: Projectile[] = [];
  /** Flash blanc d'un combattant touché (index -> temps restant). */
  hit = new Map<number, number>();
  /** Élan d'attaque d'un combattant. */
  lunge = new Map<number, number>();
  /** Flash d'un objet qui se déclenche (uid -> temps restant). */
  itemFlash = new Map<string, number>();
  /** Objet qui tremble (action refusée). */
  shake = new Map<string, number>();
  banner: { text: string; t: number; color: string } | null = null;
  redPulse = 0;

  float(x: number, y: number, text: string, color: string, big = false): void {
    const busy = Math.min(3, this.floats.filter((f) => Math.abs(f.x - x) < 30 && f.t < 0.25).length);
    this.floats.push({ x: x + (Math.random() - 0.5) * 22, y: y - busy * 10, text, color, t: 0, life: 0.95, big });
    if (this.floats.length > 40) this.floats.shift();
  }

  burst(x: number, y: number, color: string, n = 8, speed = 60): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, color, t: 0, life: 0.45 + Math.random() * 0.3, size: 2 + Math.floor(Math.random() * 2) });
    }
  }

  showBanner(text: string, color = "#fdf3de"): void {
    this.banner = { text, t: 0, color };
  }

  update(dt: number): void {
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter((f) => f.t < f.life);
    for (const p of this.particles) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
    }
    this.particles = this.particles.filter((p) => p.t < p.life);
    for (const p of this.projectiles) p.t += dt;
    this.projectiles = this.projectiles.filter((p) => p.t < p.life);
    for (const m of [this.hit, this.lunge, this.itemFlash, this.shake]) {
      for (const [k, v] of m) {
        const n = v - dt;
        if (n <= 0) m.delete(k as never);
        else m.set(k as never, n);
      }
    }
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > 1.6) this.banner = null;
    }
    this.redPulse = Math.max(0, this.redPulse - dt);
  }

  clear(): void {
    this.floats = [];
    this.particles = [];
    this.projectiles = [];
    this.hit.clear();
    this.lunge.clear();
    this.itemFlash.clear();
    this.shake.clear();
    this.banner = null;
    this.redPulse = 0;
  }
}
