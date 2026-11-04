/**
 * Dessins du cadeau quotidien : paquet (corps + couvercle séparés pour qu'il s'ouvre) et aperçus
 * des lots (pièces, diamants, ressources, meuble, bouquet ; les vêtements passent par une fonction
 * injectée par l'interface : la vignette du dressing). Style RADIA, Canvas 2D, mis en cache.
 */
import { canvasUrl, paint, roundRect, shade, heartPath, sparkle, PAL, OUTLINE, glow } from '../kit';
import { drawFurniture } from './furniture';
import { drawBouquet } from './garden';
import { resIconUrl } from './resources';
import { drawDiamond } from '../generators';
import { FURNITURE } from '../../../data/world/furniture';
import type { Resolved } from '../../../daily/calendar';

type C = CanvasRenderingContext2D;

/** Corps du paquet (boîte + ruban vertical). */
function drawBody(c: C, s: number, color: string, ribbon: string): void {
  const lw = s * 0.035;
  const x = s * 0.14, y = s * 0.42, w = s * 0.72, h = s * 0.46;
  c.lineJoin = 'round';
  roundRect(c, x, y, w, h, s * 0.05);
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(color, 0.12)); g.addColorStop(1, shade(color, -0.12));
  c.fillStyle = g; c.fill();
  c.lineWidth = lw; c.strokeStyle = OUTLINE; c.stroke();
  // ruban vertical
  c.fillStyle = ribbon;
  c.fillRect(s * 0.5 - s * 0.065, y, s * 0.13, h);
  c.strokeStyle = OUTLINE; c.lineWidth = lw * 0.7;
  c.strokeRect(s * 0.5 - s * 0.065, y, s * 0.13, h);
  // petits cœurs sur la boîte
  c.fillStyle = 'rgba(255,255,255,.55)';
  heartPath(c, x + w * 0.2, y + h * 0.55, s * 0.05); c.fill();
  heartPath(c, x + w * 0.82, y + h * 0.35, s * 0.04); c.fill();
}

/** Couvercle + nœud. */
function drawLid(c: C, s: number, color: string, ribbon: string): void {
  const lw = s * 0.035;
  const x = s * 0.08, y = s * 0.3, w = s * 0.84, h = s * 0.16;
  c.lineJoin = 'round';
  roundRect(c, x, y, w, h, s * 0.045);
  c.fillStyle = shade(color, 0.05); c.fill();
  c.lineWidth = lw; c.strokeStyle = OUTLINE; c.stroke();
  c.fillStyle = ribbon;
  c.fillRect(s * 0.5 - s * 0.065, y, s * 0.13, h);
  c.lineWidth = lw * 0.7; c.strokeRect(s * 0.5 - s * 0.065, y, s * 0.13, h);
  // nœud : deux boucles + noeud central
  for (const sgn of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 0.5, y);
    c.bezierCurveTo(s * (0.5 + sgn * 0.3), y - s * 0.22, s * (0.5 + sgn * 0.33), y + s * 0.0, s * 0.5, y);
    c.fillStyle = ribbon; c.fill(); c.lineWidth = lw * 0.8; c.strokeStyle = OUTLINE; c.stroke();
  }
  c.beginPath(); c.arc(s * 0.5, y - s * 0.01, s * 0.05, 0, Math.PI * 2);
  c.fillStyle = shade(ribbon, 0.1); c.fill(); c.lineWidth = lw * 0.8; c.stroke();
  sparkle(c, s * 0.8, y + h * 0.4, s * 0.05, '#fff', 0.9);
}

export type BoxPart = 'body' | 'lid' | 'all';
export const giftBoxUrl = (part: BoxPart, color: string, ribbon = '#FFFFFF', size = 160): string =>
  canvasUrl(`gift:box:${part}:${color}:${ribbon}:${size}`, () => paint(size, size, 2, (c) => {
    if (part !== 'lid') drawBody(c, size, color, ribbon);
    if (part !== 'body') drawLid(c, size, color, ribbon);
  }));

/** Rayons dorés derrière l'ouverture. */
export const raysUrl = (color = '#FFE9A8', size = 360): string =>
  canvasUrl(`gift:rays:${color}:${size}`, () => paint(size, size, 1, (c) => {
    const m = size / 2;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      c.beginPath(); c.moveTo(m, m); c.arc(m, m, m, a, a + Math.PI / 14); c.closePath();
      c.fillStyle = color; c.globalAlpha = 0.5; c.fill();
    }
    c.globalAlpha = 1;
    glow(c, m, m, m * 0.7, '#FFFFFF', 0.7);
  }));

let clothThumb: ((id: string) => string) | null = null;
/** L'interface fournit la vignette d'un vêtement (dressing) une fois son module chargé. */
export const setClothThumb = (fn: (id: string) => string): void => { clothThumb = fn; };

const furnPreview = (id: keyof typeof FURNITURE, size: number): string => canvasUrl(`gift:f:${id}:${size}`, () => {
  const f = FURNITURE[id];
  const k = size / Math.max(f.w, f.h);
  return paint(f.w * k, f.h * k, 2, (c) => drawFurniture(c, id, f.w * k, f.h * k));
});

/** Ticket du Casino Royal : billet doré et rose, couronne et cœur (jamais une pièce de monnaie réelle). */
export const ticketUrl = (size = 64): string => canvasUrl(`gift:ticket:${size}`, () => paint(size, size, 2, (c) => {
  const s = size, lw = s * 0.035;
  c.save(); c.translate(s * 0.5, s * 0.52); c.rotate(-0.18); c.translate(-s * 0.5, -s * 0.52);
  const x = s * 0.08, y = s * 0.26, w = s * 0.84, h = s * 0.48;
  c.beginPath();
  c.moveTo(x + s * 0.06, y); c.lineTo(x + w - s * 0.06, y);
  c.quadraticCurveTo(x + w, y, x + w, y + s * 0.06); c.lineTo(x + w, y + h * 0.36); c.arc(x + w, y + h * 0.5, h * 0.14, -Math.PI / 2, Math.PI / 2, true);
  c.lineTo(x + w, y + h - s * 0.06); c.quadraticCurveTo(x + w, y + h, x + w - s * 0.06, y + h); c.lineTo(x + s * 0.06, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - s * 0.06); c.lineTo(x, y + h * 0.64); c.arc(x, y + h * 0.5, h * 0.14, Math.PI / 2, -Math.PI / 2, true);
  c.lineTo(x, y + s * 0.06); c.quadraticCurveTo(x, y, x + s * 0.06, y); c.closePath();
  const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#FFE9A8'); g.addColorStop(0.55, '#F3C86B'); g.addColorStop(1, '#E58FB4');
  c.fillStyle = g; c.fill(); c.lineWidth = lw; c.strokeStyle = OUTLINE; c.lineJoin = 'round'; c.stroke();
  c.setLineDash([s * 0.03, s * 0.035]); c.lineWidth = lw * 0.6; c.strokeStyle = 'rgba(122,74,18,.55)';
  c.beginPath(); c.moveTo(x + w * 0.7, y + h * 0.12); c.lineTo(x + w * 0.7, y + h * 0.88); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#C23A73'; heartPath(c, x + w * 0.35, y + h * 0.52, s * 0.2); c.fill(); c.lineWidth = lw * 0.7; c.strokeStyle = OUTLINE; c.stroke();
  c.fillStyle = '#FFF9EE'; heartPath(c, x + w * 0.31, y + h * 0.46, s * 0.05); c.fill();
  sparkle(c, x + w * 0.88, y + h * 0.2, s * 0.06, '#fff', 0.95);
  c.restore();
}));

/** Aperçu dessiné d'un lot. */
export function partUrl(r: Resolved, size = 64): string {
  switch (r.t) {
    case 'coins': case 'dup': return resIconUrl('coins', size);
    case 'res': return resIconUrl(r.k, size);
    case 'tickets': return ticketUrl(size);
    case 'diamonds': return canvasUrl(`gift:dia:${size}`, () => paint(size, size, 2, (c) => drawDiamond(c, size)));
    case 'furn': return furnPreview(r.id, size);
    case 'bouquet': return canvasUrl(`gift:bq:${r.key}:${size}`, () => paint(size, size, 2, (c) => drawBouquet(c, r.ids, size)));
    case 'cloth': return clothThumb ? clothThumb(r.id) : giftBoxUrl('all', PAL.rose, '#FFFFFF', size);
  }
}
