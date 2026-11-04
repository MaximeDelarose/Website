/**
 * Particules de l'ouverture : UN canvas propre à la scène (jamais de calque partagé), boucle rAF qui s'arrête dès qu'il
 * n'y a plus de particules, budget plafonné. Animations réduites : aucune boucle, quelques étoiles statiques en fondu.
 */
import { heartPath, starPath } from '../../game/art/kit';
import { planBurst, particleAlpha, stepParticle, REDUCED_STARS, type BurstOpts, type Particle } from './logic';

export interface FxEngine {
  burst(x: number, y: number, o: BurstOpts): void;
  /** Pluie continue de particules pendant `ms`. */
  rain(ms: number, o: BurstOpts & { every: number; area: () => { x: number; y: number; w: number } }): void;
  live(): number;
  destroy(): void;
}

/** `slow` : facteur de ralenti (outil de test seulement, 1 en jeu). */
export function createFx(parent: HTMLElement, reduced: boolean, slow: () => number = () => 1): FxEngine {
  const canvas = document.createElement('canvas');
  canvas.className = 'rw-fx';
  canvas.setAttribute('aria-hidden', 'true');
  parent.append(canvas);
  const ctx = canvas.getContext('2d');
  const parts: Particle[] = [];
  const timers = new Set<number>();
  let raf = 0;
  let last = 0;
  let dead = false;
  let dpr = 1;
  let W = 0, H = 0;

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = parent.clientWidth || window.innerWidth; H = parent.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  };
  resize();
  window.addEventListener('resize', resize);

  const draw = () => {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      ctx.save();
      ctx.globalAlpha = particleAlpha(p);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'star') { ctx.shadowColor = p.color; ctx.shadowBlur = 6; starPath(ctx, 0, 0, p.size, p.size * 0.28, 4); ctx.fill(); }
      else if (p.shape === 'heart') { heartPath(ctx, 0, 0, p.size * 1.6); ctx.fill(); }
      else if (p.shape === 'conf') { ctx.fillRect(-p.size * 0.5, -p.size * 0.28, p.size, p.size * 0.56); }
      else { ctx.shadowColor = p.color; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  };

  const frame = (t: number) => {
    raf = 0;
    if (dead) return;
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016) / Math.max(1, slow());
    last = t;
    for (let i = parts.length - 1; i >= 0; i--) if (!stepParticle(parts[i], dt)) parts.splice(i, 1);
    draw();
    if (parts.length) raf = requestAnimationFrame(frame);
    else { ctx?.clearRect(0, 0, canvas.width, canvas.height); last = 0; }
  };
  const kick = () => { if (!raf && !dead) { last = 0; raf = requestAnimationFrame(frame); } };

  /** Mode réduit : quelques étoiles posées qui apparaissent puis s'estompent (une seule animation, sans boucle). */
  const softStars = (x: number, y: number, colors: string[]) => {
    for (let i = 0; i < REDUCED_STARS; i++) {
      const el = document.createElement('i');
      el.className = 'rw-softstar';
      const a = (i / REDUCED_STARS) * Math.PI * 2;
      el.style.left = `${x + Math.cos(a) * 54}px`; el.style.top = `${y + Math.sin(a) * 40}px`;
      el.style.setProperty('--c', colors[i % colors.length]);
      parent.append(el);
      el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 1200, fill: 'both' }).onfinish = () => el.remove();
    }
  };

  return {
    burst(x, y, o) {
      if (dead) return;
      if (reduced) { if (o.kind === 'star' || o.kind === 'heart') softStars(x, y, o.colors); return; }
      parts.push(...planBurst(x, y, o, parts.length, false));
      kick();
    },
    rain(ms, o) {
      if (dead || reduced) return;
      const t0 = performance.now();
      const tick = () => {
        timers.delete(id);
        if (dead || performance.now() - t0 > ms * Math.max(1, slow())) return;
        const a = o.area();
        parts.push(...planBurst(a.x + (Math.random() - 0.5) * a.w, a.y, { ...o, n: o.n }, parts.length, false));
        kick();
        id = window.setTimeout(tick, o.every * Math.max(1, slow()));
        timers.add(id);
      };
      let id = window.setTimeout(tick, 0);
      timers.add(id);
    },
    live: () => parts.length,
    destroy() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
      window.removeEventListener('resize', resize);
      parts.length = 0;
      canvas.remove();
    },
  };
}
