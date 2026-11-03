/** Outils de dessin communs aux décors (repère logique 393 × 500, Canvas 2D vectoriel). */
import { PAL, heartPath, starPath, seeded } from '../../game/art/kit';

export type C = CanvasRenderingContext2D;
export const W = 393;
export const H = 500;
export interface PlaceDef {
  /** Couche statique (mise en cache hors écran). */
  bg: (c: C) => void;
  /** Couche animée (t en secondes), dessinée par-dessus. */
  fx?: (c: C, t: number) => void;
}

export const INK = 'rgba(88,67,63,0.55)';
export const INK_S = 'rgba(88,67,63,0.28)';

export function lin(c: C, x0: number, y0: number, x1: number, y1: number, ...cols: string[]): CanvasGradient {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  cols.forEach((col, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), col));
  return g;
}
export function rad(c: C, x: number, y: number, r0: number, r1: number, ...cols: string[]): CanvasGradient {
  const g = c.createRadialGradient(x, y, r0, x, y, r1);
  cols.forEach((col, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), col));
  return g;
}
export function box(c: C, x: number, y: number, w: number, h: number, fill: string | CanvasGradient, line: string | null = INK_S, lw = 1.2): void {
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  if (line) { c.strokeStyle = line; c.lineWidth = lw; c.strokeRect(x, y, w, h); }
}
export function rr(c: C, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, line: string | null = INK_S, lw = 1.2): void {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  c.fillStyle = fill; c.fill();
  if (line) { c.strokeStyle = line; c.lineWidth = lw; c.stroke(); }
}
export function poly(c: C, pts: [number, number][], fill: string | CanvasGradient, line: string | null = INK_S, lw = 1.2): void {
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
  c.fillStyle = fill; c.fill();
  if (line) { c.strokeStyle = line; c.lineWidth = lw; c.stroke(); }
}
export function ell(c: C, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, line: string | null = null, lw = 1.2): void {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill; c.fill();
  if (line) { c.strokeStyle = line; c.lineWidth = lw; c.stroke(); }
}
export function glowAt(c: C, x: number, y: number, r: number, color: string, a = 0.6): void {
  c.save(); c.globalAlpha = a; c.fillStyle = rad(c, x, y, 0, r, color, 'rgba(255,255,255,0)'); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
}
export function heart(c: C, x: number, y: number, s: number, fill: string, a = 1): void {
  c.save(); c.globalAlpha = a; heartPath(c, x, y, s); c.fillStyle = fill; c.fill(); c.restore();
}
export function star4(c: C, x: number, y: number, r: number, color = '#fff', a = 1): void {
  c.save(); c.globalAlpha = a; c.fillStyle = color; starPath(c, x, y, r, r * 0.22, 4); c.fill(); c.restore();
}
export function shadowEll(c: C, x: number, y: number, rx: number, ry: number, a = 0.2): void {
  ell(c, x, y, rx, ry, `rgba(70,50,90,${a})`);
}
export { PAL, seeded };

/** Fenêtre en arc (vue sur un fond fourni). */
export function archPath(c: C, x: number, y: number, w: number, h: number): void {
  c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath();
}

/** Ciel dégradé + soleil / lune éventuels. */
export function sky(c: C, h: number, ...cols: string[]): void {
  c.fillStyle = lin(c, 0, 0, 0, h, ...cols); c.fillRect(0, 0, W, h);
}

/** Tour Eiffel stylisée (silhouette). */
export function eiffel(c: C, cx: number, base: number, s: number, color: string, line: string | null = null): void {
  c.save(); c.translate(cx, base); c.scale(s, s);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-30, 0); c.quadraticCurveTo(-14, -70, -7, -120); c.lineTo(-4, -170); c.lineTo(-1.5, -215); c.lineTo(0, -232);
  c.lineTo(1.5, -215); c.lineTo(4, -170); c.lineTo(7, -120); c.quadraticCurveTo(14, -70, 30, 0);
  c.lineTo(20, 0); c.quadraticCurveTo(0, -62, -20, 0); c.closePath(); c.fill();
  c.fillRect(-12, -122, 24, 5); c.fillRect(-7, -172, 14, 4); c.fillRect(-23, -62, 46, 5);
  if (line) { c.strokeStyle = line; c.lineWidth = 0.8; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-12 + i * 1, -20 - i * 22); c.lineTo(12 - i * 1, -42 - i * 22); c.stroke(); } }
  c.restore();
}

/** Silhouette de toits parisiens (zinc, cheminées, lucarnes). */
export function roofs(c: C, y: number, h: number, color: string, seed: number, light?: string): void {
  const r = seeded(seed);
  let x = -10;
  while (x < W + 10) {
    const w = 38 + r() * 46, hh = h * (0.45 + r() * 0.55);
    const top = y + h - hh;
    c.fillStyle = color;
    c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, top + 10); c.lineTo(x + w * 0.12, top); c.lineTo(x + w * 0.88, top); c.lineTo(x + w, top + 10); c.lineTo(x + w, y + h); c.closePath(); c.fill();
    if (r() > 0.45) c.fillRect(x + w * (0.2 + r() * 0.5), top - 12, 7, 14);
    if (light) { c.fillStyle = light; for (let i = 0; i < 3; i++) if (r() > 0.4) c.fillRect(x + 6 + i * (w / 3.4), top + 16 + r() * 8, 5, 7); }
    x += w - 2;
  }
  c.fillStyle = color; c.fillRect(0, y + h - 2, W, 6);
}

/** Immeubles de ville (nuit) avec fenêtres éclairées. */
export function skyline(c: C, y: number, h: number, color: string, win: string, seed: number): void {
  const r = seeded(seed);
  let x = -6;
  while (x < W + 6) {
    const w = 22 + r() * 30, hh = h * (0.3 + r() * 0.7);
    c.fillStyle = color; c.fillRect(x, y + h - hh, w, hh + 4);
    c.fillStyle = win;
    for (let yy = y + h - hh + 6; yy < y + h - 6; yy += 9) for (let xx = x + 4; xx < x + w - 5; xx += 8) if (r() > 0.55) c.fillRect(xx, yy, 3.4, 4.6);
    x += w + 1;
  }
}

/** Flamme (anim) — à appeler dans fx. */
export function flame(c: C, x: number, y: number, s: number, t: number, seedPhase = 0): void {
  const f = 1 + Math.sin(t * 9 + seedPhase * 3.1) * 0.12 + Math.sin(t * 15.3 + seedPhase) * 0.07;
  const sway = Math.sin(t * 5 + seedPhase * 2) * 0.9 * s;
  glowAt(c, x, y - 4 * s, 20 * s * f, 'rgba(255,205,120,0.9)', 0.55);
  c.save(); c.translate(x, y);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-3.6 * s, -4 * s, sway * 0.4, -10.5 * s * f); c.quadraticCurveTo(3.6 * s, -4 * s, 0, 0);
  c.fillStyle = '#ffb347'; c.fill();
  c.beginPath(); c.moveTo(0, -0.5 * s); c.quadraticCurveTo(-1.8 * s, -3 * s, sway * 0.2, -6.5 * s * f); c.quadraticCurveTo(1.8 * s, -3 * s, 0, -0.5 * s);
  c.fillStyle = '#fff2b8'; c.fill();
  c.restore();
}
/** Bougie (statique) : corps + mèche. Renvoie la position de la flamme. */
export function candle(c: C, x: number, y: number, s: number, color = '#fff6ea'): [number, number] {
  rr(c, x - 3 * s, y - 16 * s, 6 * s, 16 * s, 1.5 * s, lin(c, x - 3 * s, 0, x + 3 * s, 0, color, '#f3dfd0'), INK_S, 0.8);
  c.strokeStyle = '#58433f'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x, y - 16 * s); c.lineTo(x, y - 18.5 * s); c.stroke();
  return [x, y - 18 * s];
}

export function flower(c: C, x: number, y: number, r: number, petal: string, centre = '#ffd36b', n = 5): void {
  c.save(); c.translate(x, y);
  for (let i = 0; i < n; i++) {
    c.save(); c.rotate((i / n) * Math.PI * 2);
    ell(c, 0, -r * 0.62, r * 0.42, r * 0.62, petal, INK_S, 0.7);
    c.restore();
  }
  ell(c, 0, 0, r * 0.34, r * 0.34, centre, INK_S, 0.7);
  c.restore();
}
export function rose(c: C, x: number, y: number, r: number, col: string): void {
  ell(c, x, y, r, r * 0.92, col, INK_S, 0.8);
  c.strokeStyle = 'rgba(120,30,60,0.45)'; c.lineWidth = 0.9;
  c.beginPath(); c.arc(x, y, r * 0.55, 0.3, 4.6); c.stroke(); c.beginPath(); c.arc(x + r * 0.05, y, r * 0.25, 1, 5.2); c.stroke();
}
export function leaf(c: C, x: number, y: number, len: number, rot: number, col = '#7fc48a'): void {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.38, len, 0); c.quadraticCurveTo(len * 0.5, len * 0.38, 0, 0);
  c.fillStyle = col; c.fill(); c.strokeStyle = INK_S; c.lineWidth = 0.8; c.stroke();
  c.restore();
}
export function vase(c: C, x: number, y: number, s: number, col: string, flowers: string[], seed = 3): void {
  const r = seeded(seed);
  for (let i = 0; i < flowers.length; i++) {
    const a = -1.3 + (i / (flowers.length - 1 || 1)) * 2.6, len = 26 * s + r() * 8 * s;
    const fx = x + Math.sin(a) * len * 0.7, fy = y - 12 * s - Math.cos(a) * len;
    c.strokeStyle = '#5a9a66'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x, y - 8 * s); c.lineTo(fx, fy); c.stroke();
    leaf(c, x + (fx - x) * 0.45, y - 8 * s + (fy - y + 8 * s) * 0.45, 9 * s, a > 0 ? -0.4 : -2.7);
    rose(c, fx, fy, 6.4 * s, flowers[i]);
  }
  c.beginPath(); c.moveTo(x - 6 * s, y - 14 * s); c.quadraticCurveTo(x - 11 * s, y - 2 * s, x - 6 * s, y); c.lineTo(x + 6 * s, y); c.quadraticCurveTo(x + 11 * s, y - 2 * s, x + 6 * s, y - 14 * s); c.closePath();
  c.fillStyle = lin(c, x - 10 * s, 0, x + 10 * s, 0, 'rgba(255,255,255,0.85)', col); c.fill(); c.strokeStyle = INK_S; c.lineWidth = 0.9; c.stroke();
}
export function plant(c: C, x: number, y: number, s: number, pot = '#e9a78f', col = '#6fb77f'): void {
  for (let i = 0; i < 7; i++) leaf(c, x, y - 14 * s, (34 + (i % 3) * 8) * s, -Math.PI / 2 + (i - 3) * 0.42, i % 2 ? col : '#58a56e');
  c.beginPath(); c.moveTo(x - 14 * s, y - 20 * s); c.lineTo(x - 10 * s, y); c.lineTo(x + 10 * s, y); c.lineTo(x + 14 * s, y - 20 * s); c.closePath();
  c.fillStyle = lin(c, x - 14 * s, 0, x + 14 * s, 0, '#fff0e8', pot, '#c9826a'); c.fill(); c.strokeStyle = INK_S; c.lineWidth = 1; c.stroke();
  rr(c, x - 16 * s, y - 24 * s, 32 * s, 6 * s, 2, pot, INK_S, 0.9);
}

/** Lustre (statique) ; renvoie les points lumineux pour l'animation. */
export function chandelier(c: C, x: number, y: number, s: number, gold = '#e9c26a', crystal = 'rgba(255,255,255,0.9)'): [number, number][] {
  const pts: [number, number][] = [];
  c.strokeStyle = gold; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y); c.stroke();
  ell(c, x, y + 4 * s, 6 * s, 6 * s, gold, INK_S, 0.8);
  c.strokeStyle = gold; c.lineWidth = 2.2 * s;
  for (const k of [1, -1]) {
    c.beginPath(); c.moveTo(x, y + 8 * s); c.quadraticCurveTo(x + k * 18 * s, y + 8 * s, x + k * 34 * s, y + 24 * s); c.stroke();
    c.beginPath(); c.moveTo(x, y + 14 * s); c.quadraticCurveTo(x + k * 10 * s, y + 18 * s, x + k * 20 * s, y + 36 * s); c.stroke();
    for (const [dx, dy] of [[34, 24], [20, 36]]) {
      pts.push([x + k * dx * s, y + dy * s - 8 * s]);
      rr(c, x + k * dx * s - 2 * s, y + dy * s - 4 * s, 4 * s, 7 * s, 1, '#fff6ea', INK_S, 0.6);
      c.fillStyle = crystal; c.beginPath(); c.moveTo(x + k * dx * s, y + dy * s + 3 * s); c.lineTo(x + k * dx * s - 2.4 * s, y + dy * s + 11 * s); c.lineTo(x + k * dx * s + 2.4 * s, y + dy * s + 11 * s); c.closePath(); c.fill();
    }
  }
  pts.push([x, y - 2 * s]);
  c.fillStyle = crystal;
  for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(x + i * 4 * s, y + 18 * s); c.lineTo(x + i * 4 * s - 2 * s, y + (28 + (3 - Math.abs(i)) * 3) * s); c.lineTo(x + i * 4 * s + 2 * s, y + (28 + (3 - Math.abs(i)) * 3) * s); c.closePath(); c.fill(); }
  return pts;
}

/** Guirlande (statique) : fil + ampoules ; renvoie les positions d'ampoules. */
export function garland(c: C, x0: number, y0: number, x1: number, y1: number, sag: number, n: number, bulb = '#ffe9a8'): [number, number][] {
  const pts: [number, number][] = [];
  c.strokeStyle = 'rgba(88,67,63,0.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x0, y0);
  c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); c.stroke();
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * ((x0 + x1) / 2) + u * u * x1;
    const y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * ((y0 + y1) / 2 + sag * 2) + u * u * y1;
    pts.push([x, y + 5]);
    ell(c, x, y + 5, 3, 3.8, bulb, INK_S, 0.6);
  }
  return pts;
}
export function twinkle(c: C, pts: [number, number][], t: number, color = 'rgba(255,230,160,0.95)', r = 13, speed = 2): void {
  pts.forEach(([x, y], i) => glowAt(c, x, y, r, color, 0.35 + 0.35 * Math.sin(t * speed + i * 1.9)));
}

/** Rideau (côté -1 gauche / 1 droite). */
export function curtain(c: C, side: -1 | 1, wd: number, ht: number, a: string, b: string, y0 = 0): void {
  const x0 = side < 0 ? 0 : W - wd;
  c.save();
  c.fillStyle = lin(c, x0, 0, x0 + wd, 0, a, b, a, b, a);
  c.beginPath();
  c.moveTo(x0, y0); c.lineTo(x0 + wd, y0);
  c.quadraticCurveTo(side < 0 ? x0 + wd * 0.5 : x0 + wd * 0.9, y0 + ht * 0.55, side < 0 ? x0 + wd * 0.2 : x0 + wd * 0.5, y0 + ht);
  c.lineTo(side < 0 ? x0 : x0 + wd, y0 + ht); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(60,20,50,0.12)'; c.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(x0 + (wd * i) / 6, y0); c.quadraticCurveTo(x0 + (wd * i) / 6 + side * 6, y0 + ht * 0.5, x0 + (wd * i) / 6 + side * 2, y0 + ht * 0.9); c.stroke(); }
  c.restore();
}

/** Parquet en perspective simple (lames). */
export function floor(c: C, y: number, a: string, b: string, line = 'rgba(88,67,63,0.14)', vx = W / 2): void {
  c.fillStyle = lin(c, 0, y, 0, H, a, b); c.fillRect(0, y, W, H - y);
  c.strokeStyle = line; c.lineWidth = 1;
  for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(vx + i * 14, y); c.lineTo(vx + i * 78, H); c.stroke(); }
  for (let k = 1; k < 7; k++) { const yy = y + (H - y) * (k * k) / 49; c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); }
}

/** Confettis / paillettes flottants (anim). */
export function floaters(c: C, t: number, n: number, seed: number, color: string, size = 2.4, speed = 14, a = 0.8): void {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, y0 = r() * H, ph = r() * 6.28, sp = (0.5 + r()) * speed;
    const y = ((y0 - t * sp) % H + H) % H;
    const x = x0 + Math.sin(t * 0.8 + ph) * 10;
    star4(c, x, y, size * (0.6 + 0.6 * Math.abs(Math.sin(t * 1.7 + ph))), color, a);
  }
}
