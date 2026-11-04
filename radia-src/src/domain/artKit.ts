/** Petits outils de dessin partagés par les décors des lieux (Canvas 2D vectoriel, DA « Romantic Cozy Pop »). */
import { OUTLINE, PAL, roundRect, shade as kitShade, sparkle, starPath, heartPath, seeded } from '../game/art/kit';
import { drawFurniture } from '../game/art/world/furniture';
import { FURNITURE } from '../data/world/furniture';
import type { FurnitureId } from '../data/world/ids';

export type C = CanvasRenderingContext2D;
export { OUTLINE, PAL, roundRect, sparkle, starPath, heartPath, seeded };

export const SW = 360;
export const SH = 225;
/** Base du mur / début du sol. */
export const FLOOR_Y = 148;

function toHex(c: string): string {
  if (c.startsWith('#')) return c.length === 4 ? '#' + c.slice(1).split('').map((x) => x + x).join('') : c;
  const m = c.match(/\d+/g);
  if (!m) return '#FF00FF';
  return '#' + m.slice(0, 3).map((v) => Math.max(0, Math.min(255, +v)).toString(16).padStart(2, '0')).join('');
}
/** Éclaircit (>0) ou assombrit (<0), renvoie toujours un hex. */
export const sh = (c: string, a: number): string => toHex(kitShade(toHex(c), a));

export const ink = (c: C, lw = 1.4): void => { c.lineWidth = lw; c.strokeStyle = OUTLINE; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); };

export const lin = (c: C, x0: number, y0: number, x1: number, y1: number, ...cols: string[]): CanvasGradient => {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  cols.forEach((col, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), col));
  return g;
};

/** Rectangle arrondi plein + contour. */
export function rr(c: C, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, lw = 1.3): void {
  roundRect(c, x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (lw) ink(c, lw);
}
export function disc(c: C, x: number, y: number, r: number, fill: string | CanvasGradient, lw = 0): void {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (lw) ink(c, lw);
}
export function ell(c: C, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, lw = 0): void {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (lw) ink(c, lw);
}
export function poly(c: C, pts: [number, number][], fill: string | CanvasGradient, lw = 1.3): void {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill; c.fill(); if (lw) ink(c, lw);
}
export function line(c: C, x0: number, y0: number, x1: number, y1: number, col: string, lw = 1.2): void {
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.stroke();
}
export function softShadow(c: C, x: number, y: number, rx: number, ry = rx * 0.22, a = 0.22): void {
  c.save();
  const g = c.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(81,68,109,${a})`); g.addColorStop(1, 'rgba(81,68,109,0)');
  c.translate(0, y); c.scale(1, ry / rx); c.translate(0, -y);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, rx, 0, Math.PI * 2); c.fill();
  c.restore();
}
export function glowAt(c: C, x: number, y: number, r: number, color: string, a = 0.5): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, a)); g.addColorStop(1, hexA(color, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
export function hexA(hex: string, a: number): string {
  const h = toHex(hex).slice(1);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Pose un meuble réel du château : centré en `cx`, posé sur `by`, `u` pixels par case. */
export function put(c: C, id: FurnitureId, cx: number, by: number, u: number, color?: string): void {
  const f = FURNITURE[id];
  const w = f.w * u;
  const h = f.h * u;
  c.save();
  c.translate(cx - w / 2, by - h);
  drawFurniture(c, id, w, h, color);
  c.restore();
}

/** Petite enseigne de tissu / bois avec du texte. */
export function plaque(c: C, text: string, cx: number, cy: number, w: number, h: number, fill: string, textCol: string, size = 13): void {
  rr(c, cx - w / 2, cy - h / 2, w, h, h * 0.3, lin(c, 0, cy - h / 2, 0, cy + h / 2, sh(fill, 0.25), fill, sh(fill, -0.15)), 1.6);
  rr(c, cx - w / 2 + 3, cy - h / 2 + 3, w - 6, h - 6, h * 0.22, 'rgba(255,255,255,0)', 0.9);
  c.font = `700 ${size}px Fredoka, "Trebuchet MS", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = textCol; c.fillText(text, cx, cy + 0.5);
}

/** Auvent à festons (couleur d'accent). */
export function awning(c: C, x: number, y: number, w: number, h: number, col: string): void {
  const n = Math.max(4, Math.round(w / 22));
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    const cx = x + i * sw;
    c.beginPath();
    c.moveTo(cx, y); c.lineTo(cx + sw, y); c.lineTo(cx + sw, y + h * 0.7);
    c.quadraticCurveTo(cx + sw / 2, y + h * 1.25, cx, y + h * 0.7);
    c.closePath();
    c.fillStyle = i % 2 ? '#FFF8EE' : col; c.fill(); ink(c, 1.2);
  }
  c.beginPath(); c.rect(x - 2, y - 4, w + 4, 5); c.fillStyle = sh(col, -0.2); c.fill(); ink(c, 1.2);
}

/** Guirlande de fanions. */
export function bunting(c: C, x0: number, y0: number, x1: number, y1: number, cols: string[], sag = 10): void {
  const n = Math.max(5, Math.round(Math.hypot(x1 - x0, y1 - y0) / 16));
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 1.6, x1, y1); c.strokeStyle = 'rgba(88,67,63,0.7)'; c.lineWidth = 1; c.stroke();
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1;
    const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + sag * 1.6) + t * t * y1;
    poly(c, [[px - 5, py], [px + 5, py], [px, py + 11]], cols[i % cols.length], 0.9);
  }
}

/** Guirlande lumineuse (ampoules chaudes). */
export function stringLights(c: C, x0: number, y0: number, x1: number, y1: number, col = '#FFE9A8', sag = 12, on = true): void {
  const n = Math.max(6, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14));
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 1.6, x1, y1); c.strokeStyle = 'rgba(60,48,56,0.8)'; c.lineWidth = 1; c.stroke();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1;
    const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + sag * 1.6) + t * t * y1;
    if (on) glowAt(c, px, py + 2, 9, col, 0.5);
    disc(c, px, py + 2, 2.2, on ? col : '#d8cfc6', 0.7);
  }
}

/** Fleur simple (tige + pétales + cœur). */
export function bloom(c: C, x: number, y: number, s: number, col: string, stem = true): void {
  if (stem) line(c, x, y + s * 0.5, x, y + s * 3, '#5FA86E', Math.max(1, s * 0.3));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    disc(c, x + Math.cos(a) * s * 0.75, y + Math.sin(a) * s * 0.75, s * 0.62, col);
  }
  disc(c, x, y, s * 0.45, '#F3C86B');
}

/** Couronne à 3 pointes. */
export function crown(c: C, cx: number, cy: number, w: number, fill = PAL.or): void {
  const h = w * 0.7;
  poly(c, [[cx - w / 2, cy + h / 2], [cx - w / 2, cy - h * 0.1], [cx - w / 4, cy + h * 0.15], [cx, cy - h / 2], [cx + w / 4, cy + h * 0.15], [cx + w / 2, cy - h * 0.1], [cx + w / 2, cy + h / 2]], lin(c, 0, cy - h / 2, 0, cy + h / 2, sh(fill, 0.3), fill, sh(fill, -0.2)), 1.3);
  disc(c, cx, cy - h / 2, w * 0.08, '#FF75A8', 0.8);
  disc(c, cx - w / 2, cy - h * 0.1, w * 0.06, '#FF75A8', 0.7);
  disc(c, cx + w / 2, cy - h * 0.1, w * 0.06, '#FF75A8', 0.7);
}

/** Fanion de vapeur / de parfum (volutes douces). */
export function steam(c: C, x: number, y: number, h = 16, a = 0.55): void {
  c.beginPath(); c.moveTo(x, y);
  c.bezierCurveTo(x - 5, y - h * 0.3, x + 5, y - h * 0.6, x, y - h);
  c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 1.8; c.lineCap = 'round'; c.stroke();
}
