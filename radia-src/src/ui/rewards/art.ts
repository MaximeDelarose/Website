/**
 * Dessins vectoriels (Canvas 2D) des cadeaux, coffres et écrins : corps et couvercle SÉPARÉS pour que le couvercle s'envole,
 * et petites icônes de récompenses. Style RADIA (contour chocolat, lumière en haut à gauche), mis en cache.
 */
import { canvasUrl, paint, roundRect, heartPath, starPath, sparkle, PAL, OUTLINE, glow, fillShaded, gloss, ellipse } from '../../game/art/kit';
import { partUrl, ticketUrl, setClothThumb } from '../../game/art/world/giftArt';
import type { Resolved } from '../../daily/calendar';
import type { ArtStyle, Palette } from './logic';
import type { Reward } from './types';

type C = CanvasRenderingContext2D;

/** Éclaircit / assombrit une couleur HEX et renvoie un HEX (le `shade` du kit renvoie « rgb() », inutilisable comme base). */
function tint(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`;
}
export type BoxPart = 'body' | 'lid';

const LW = 0.034;

function ribbonRect(c: C, x: number, y: number, w: number, h: number, color: string, s: number): void {
  c.fillStyle = color; c.fillRect(x, y, w, h);
  c.lineWidth = s * LW * 0.7; c.strokeStyle = OUTLINE; c.strokeRect(x, y, w, h);
}

function bow(c: C, cx: number, cy: number, s: number, color: string, scale = 1): void {
  const lw = s * LW * 0.8;
  c.lineJoin = 'round';
  // pans qui pendent
  for (const sgn of [-1, 1]) {
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + sgn * s * 0.07 * scale, cy + s * 0.15 * scale);
    c.lineTo(cx + sgn * s * 0.015 * scale, cy + s * 0.12 * scale);
    c.lineTo(cx + sgn * s * 0.11 * scale, cy + s * 0.13 * scale);
    c.closePath();
    fillShaded(c, tint(color, -0.04), { x: cx - s * 0.1, y: cy, w: s * 0.2, h: s * 0.16 }, lw);
  }
  // boucles
  for (const sgn of [-1, 1]) {
    c.beginPath();
    c.moveTo(cx, cy);
    c.bezierCurveTo(cx + sgn * s * 0.34 * scale, cy - s * 0.26 * scale, cx + sgn * s * 0.36 * scale, cy + s * 0.07 * scale, cx, cy);
    fillShaded(c, color, { x: cx - s * 0.2, y: cy - s * 0.2, w: s * 0.4, h: s * 0.26 }, lw, { light: 0.35 });
    c.beginPath();
    c.moveTo(cx + sgn * s * 0.04, cy - s * 0.01);
    c.quadraticCurveTo(cx + sgn * s * 0.16 * scale, cy - s * 0.1 * scale, cx + sgn * s * 0.26 * scale, cy - s * 0.04 * scale);
    c.lineWidth = lw * 0.9; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
  }
  c.beginPath(); c.arc(cx, cy, s * 0.055 * scale, 0, Math.PI * 2);
  fillShaded(c, tint(color, 0.08), { x: cx - s * 0.06, y: cy - s * 0.06, w: s * 0.12, h: s * 0.12 }, lw);
}

// ------------------------------------------------------------------ cadeaux emballés

function giftBody(c: C, s: number, p: Palette, event: boolean): void {
  const x = s * 0.15, y = s * 0.46, w = s * 0.7, h = s * 0.44, lw = s * LW;
  roundRect(c, x, y, w, h, s * 0.05);
  fillShaded(c, p.main, { x, y, w, h }, lw);
  c.save(); roundRect(c, x, y, w, h, s * 0.05); c.clip();
  // reflet latéral et motifs
  c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(x, y, w * 0.18, h);
  c.fillStyle = 'rgba(255,255,255,.5)';
  if (event) { for (const [fx, fy] of [[0.2, 0.3], [0.8, 0.62], [0.24, 0.78]]) { starPath(c, x + w * fx, y + h * fy, s * 0.035, s * 0.015, 4); c.fill(); } }
  else { for (const [fx, fy, k] of [[0.22, 0.55, 0.05], [0.82, 0.32, 0.04], [0.8, 0.8, 0.035], [0.2, 0.85, 0.03]] as const) { heartPath(c, x + w * fx, y + h * fy, s * k); c.fill(); } }
  c.restore();
  // ruban vertical
  ribbonRect(c, s * 0.5 - s * 0.07, y, s * 0.14, h, p.ribbon, s);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(s * 0.5 - s * 0.055, y + 2, s * 0.03, h - 4);
  if (event) { // sceau étoilé
    starPath(c, s * 0.5, y + h * 0.5, s * 0.1, s * 0.055, 5);
    fillShaded(c, p.accent, { x: s * 0.4, y: y + h * 0.5 - s * 0.1, w: s * 0.2, h: s * 0.2 }, s * LW * 0.8);
    gloss(c, s * 0.47, y + h * 0.5 - s * 0.03, s * 0.02, s * 0.012, 0.8);
  }
  roundRect(c, x, y, w, h, s * 0.05); c.lineWidth = lw; c.strokeStyle = OUTLINE; c.stroke();
}

function giftLid(c: C, s: number, p: Palette, event: boolean): void {
  const x = s * 0.1, y = s * 0.34, w = s * 0.8, h = s * 0.16, lw = s * LW;
  roundRect(c, x, y, w, h, s * 0.045);
  fillShaded(c, tint(p.main, 0.06), { x, y, w, h }, lw, { light: 0.35 });
  ribbonRect(c, s * 0.5 - s * 0.07, y, s * 0.14, h, p.ribbon, s);
  roundRect(c, x, y, w, h, s * 0.045); c.lineWidth = lw; c.strokeStyle = OUTLINE; c.stroke();
  gloss(c, x + w * 0.2, y + h * 0.3, w * 0.12, h * 0.1, 0.7, -0.15);
  bow(c, s * 0.5, y + s * 0.005, s, event ? p.accent : p.ribbon === '#FFFFFF' || p.ribbon === '#FFF4E8' ? tint(p.accent, 0) : p.ribbon);
  sparkle(c, s * 0.82, y + h * 0.35, s * 0.05, '#fff', 0.95);
}

// ------------------------------------------------------------------ coffres

function chestBody(c: C, s: number, p: Palette, premium: boolean): void {
  const x = s * 0.1, y = s * 0.5, w = s * 0.8, h = s * 0.4, lw = s * LW;
  // intérieur éclairé (vu quand le couvercle est parti)
  ellipse(c, s * 0.5, y + s * 0.01, w * 0.46, s * 0.075);
  const g = c.createLinearGradient(0, y - s * 0.07, 0, y + s * 0.08); g.addColorStop(0, '#FFFBE0'); g.addColorStop(1, p.glow);
  c.fillStyle = g; c.fill();
  roundRect(c, x, y, w, h, s * 0.045);
  fillShaded(c, p.main, { x, y, w, h }, lw);
  c.save(); roundRect(c, x, y, w, h, s * 0.045); c.clip();
  // planches / velours
  c.strokeStyle = premium ? 'rgba(255,255,255,.12)' : 'rgba(60,35,25,.28)'; c.lineWidth = s * 0.012;
  for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(x + (w * i) / 5, y); c.lineTo(x + (w * i) / 5, y + h); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x, y, w, h * 0.16);
  // bandes métalliques
  for (const fx of [0.1, 0.9]) { c.fillStyle = p.ribbon; c.fillRect(x + w * fx - s * 0.04, y, s * 0.08, h); c.strokeStyle = OUTLINE; c.lineWidth = lw * 0.6; c.strokeRect(x + w * fx - s * 0.04, y, s * 0.08, h); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x + w * fx - s * 0.03, y, s * 0.012, h); }
  c.fillStyle = p.ribbon; c.fillRect(x, y + h * 0.82, w, h * 0.18); c.strokeStyle = OUTLINE; c.lineWidth = lw * 0.6; c.strokeRect(x, y + h * 0.82, w, h * 0.18);
  c.restore();
  roundRect(c, x, y, w, h, s * 0.045); c.lineWidth = lw; c.strokeStyle = OUTLINE; c.stroke();
  // serrure
  roundRect(c, s * 0.5 - s * 0.075, y + h * 0.08, s * 0.15, h * 0.42, s * 0.03);
  fillShaded(c, p.ribbon, { x: s * 0.42, y: y + h * 0.08, w: s * 0.15, h: h * 0.42 }, lw * 0.8, { light: 0.4 });
  c.beginPath(); c.arc(s * 0.5, y + h * 0.26, s * 0.022, 0, Math.PI * 2); c.fillStyle = OUTLINE; c.fill();
  c.fillRect(s * 0.5 - s * 0.008, y + h * 0.26, s * 0.016, h * 0.14);
  if (premium) for (const fx of [0.3, 0.7]) { c.beginPath(); c.arc(x + w * fx, y + h * 0.55, s * 0.035, 0, Math.PI * 2); fillShaded(c, p.accent, { x: x + w * fx - s * 0.035, y: y + h * 0.55 - s * 0.035, w: s * 0.07, h: s * 0.07 }, lw * 0.6, { light: 0.5 }); }
}

function chestLid(c: C, s: number, p: Palette, premium: boolean): void {
  const x = s * 0.08, y = s * 0.2, w = s * 0.84, h = s * 0.34, lw = s * LW;
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + h * 0.5);
  c.bezierCurveTo(x, y - h * 0.12, x + w, y - h * 0.12, x + w, y + h * 0.5);
  c.lineTo(x + w, y + h);
  c.closePath();
  fillShaded(c, tint(p.main, 0.05), { x, y, w, h }, lw, { light: 0.3 });
  c.save(); c.clip();
  c.strokeStyle = premium ? 'rgba(255,255,255,.12)' : 'rgba(60,35,25,.25)'; c.lineWidth = s * 0.012;
  for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(x + (w * i) / 5, y - s * 0.05); c.lineTo(x + (w * i) / 5, y + h); c.stroke(); }
  for (const fx of [0.1, 0.9]) { c.fillStyle = p.ribbon; c.fillRect(x + w * fx - s * 0.04, y - s * 0.05, s * 0.08, h + s * 0.06); c.strokeStyle = OUTLINE; c.lineWidth = lw * 0.6; c.strokeRect(x + w * fx - s * 0.04, y - s * 0.05, s * 0.08, h + s * 0.06); }
  c.fillStyle = p.ribbon; c.fillRect(x, y + h - s * 0.05, w, s * 0.06); c.strokeStyle = OUTLINE; c.lineWidth = lw * 0.6; c.strokeRect(x, y + h - s * 0.05, w, s * 0.06);
  c.restore();
  c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + h * 0.5); c.bezierCurveTo(x, y - h * 0.12, x + w, y - h * 0.12, x + w, y + h * 0.5); c.lineTo(x + w, y + h); c.closePath();
  c.lineWidth = lw; c.strokeStyle = OUTLINE; c.stroke();
  gloss(c, x + w * 0.28, y + h * 0.26, w * 0.17, h * 0.09, 0.6, -0.2);
  // verrou de couvercle
  roundRect(c, s * 0.5 - s * 0.05, y + h - s * 0.04, s * 0.1, s * 0.09, s * 0.02);
  fillShaded(c, p.ribbon, { x: s * 0.45, y: y + h - s * 0.04, w: s * 0.1, h: s * 0.09 }, lw * 0.7, { light: 0.4 });
  if (premium) { // couronne d'or
    const cy = y - s * 0.015;
    c.beginPath();
    c.moveTo(s * 0.4, cy + s * 0.03); c.lineTo(s * 0.4, cy - s * 0.06); c.lineTo(s * 0.45, cy - s * 0.02); c.lineTo(s * 0.5, cy - s * 0.09); c.lineTo(s * 0.55, cy - s * 0.02); c.lineTo(s * 0.6, cy - s * 0.06); c.lineTo(s * 0.6, cy + s * 0.03); c.closePath();
    fillShaded(c, p.accent === '#FFF3C4' ? '#FFD76A' : p.ribbon, { x: s * 0.4, y: cy - s * 0.09, w: s * 0.2, h: s * 0.12 }, lw * 0.7, { light: 0.45 });
    c.beginPath(); c.arc(s * 0.5, cy - s * 0.045, s * 0.016, 0, Math.PI * 2); c.fillStyle = '#FF75A8'; c.fill();
    sparkle(c, s * 0.2, y + h * 0.3, s * 0.05, '#fff', 0.95);
  }
}

// ------------------------------------------------------------------ écrin romantique

function casketBody(c: C, s: number, p: Palette): void {
  const x = s * 0.16, y = s * 0.54, w = s * 0.68, h = s * 0.34, lw = s * LW;
  ellipse(c, s * 0.5, y + s * 0.01, w * 0.46, s * 0.06);
  const g = c.createLinearGradient(0, y - s * 0.06, 0, y + s * 0.07); g.addColorStop(0, '#FFFDF3'); g.addColorStop(1, p.glow);
  c.fillStyle = g; c.fill();
  roundRect(c, x, y, w, h, s * 0.06);
  fillShaded(c, p.main, { x, y, w, h }, lw, { light: 0.3 });
  c.save(); roundRect(c, x, y, w, h, s * 0.06); c.clip();
  c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x, y, w, h * 0.18);
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = s * 0.012; c.setLineDash([s * 0.02, s * 0.02]);
  c.strokeRect(x + s * 0.03, y + s * 0.03, w - s * 0.06, h - s * 0.06); c.setLineDash([]);
  // rang de perles
  for (let i = 0; i < 7; i++) { const px = x + w * (0.12 + i * 0.1267); c.beginPath(); c.arc(px, y + h * 0.82, s * 0.017, 0, Math.PI * 2); c.fillStyle = '#FFF9EE'; c.fill(); c.lineWidth = s * 0.006; c.strokeStyle = 'rgba(88,67,63,.5)'; c.stroke(); }
  c.restore();
  roundRect(c, x, y, w, h, s * 0.06); c.lineWidth = lw; c.strokeStyle = OUTLINE; c.stroke();
  heartPath(c, s * 0.5, y + h * 0.42, s * 0.13); fillShaded(c, p.accent, { x: s * 0.43, y: y + h * 0.2, w: s * 0.14, h: s * 0.14 }, lw * 0.8, { light: 0.35 });
  gloss(c, s * 0.47, y + h * 0.33, s * 0.02, s * 0.012, 0.85);
}

function casketLid(c: C, s: number, p: Palette): void {
  const x = s * 0.13, y = s * 0.26, w = s * 0.74, h = s * 0.3, lw = s * LW;
  c.beginPath();
  c.moveTo(x, y + h); c.lineTo(x, y + h * 0.55);
  c.bezierCurveTo(x, y - h * 0.15, x + w, y - h * 0.15, x + w, y + h * 0.55);
  c.lineTo(x + w, y + h); c.closePath();
  fillShaded(c, tint(p.main, 0.08), { x, y, w, h }, lw, { light: 0.4 });
  c.save(); c.clip();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(s * 0.5 - s * 0.05, y - s * 0.05, s * 0.1, h + s * 0.1);
  c.fillStyle = p.accent; c.fillRect(x, y + h - s * 0.05, w, s * 0.05);
  c.restore();
  c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + h * 0.55); c.bezierCurveTo(x, y - h * 0.15, x + w, y - h * 0.15, x + w, y + h * 0.55); c.lineTo(x + w, y + h); c.closePath();
  c.lineWidth = lw; c.strokeStyle = OUTLINE; c.stroke();
  gloss(c, x + w * 0.26, y + h * 0.24, w * 0.15, h * 0.08, 0.7, -0.2);
  bow(c, s * 0.5, y + s * 0.01, s, p.accent, 0.85);
  heartPath(c, s * 0.8, y + h * 0.1, s * 0.07); c.fillStyle = '#FFF'; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1;
  sparkle(c, s * 0.22, y + h * 0.2, s * 0.05, '#fff', 0.95);
}

// ------------------------------------------------------------------ API

/** Image d'une moitié du contenant (corps ou couvercle) ; carré `size`×`size`, même repère pour les deux. */
export function boxUrl(style: ArtStyle, part: BoxPart, p: Palette, size = 220): string {
  const key = `rw:box:${style}:${part}:${p.main}:${p.ribbon}:${p.accent}:${p.glow}:${size}`;
  return canvasUrl(key, () => paint(size, size, 2, (c) => {
    if (style === 'gift' || style === 'event') (part === 'body' ? giftBody : giftLid)(c, size, p, style === 'event');
    else if (style === 'casket') (part === 'body' ? casketBody : casketLid)(c, size, p);
    else (part === 'body' ? chestBody : chestLid)(c, size, p, style === 'premium');
  }));
}

/** Ombre douce sous le contenant. */
export const shadowUrl = (size = 220): string => canvasUrl(`rw:shadow:${size}`, () => paint(size, size * 0.3, 1, (c) => {
  const g = c.createRadialGradient(size / 2, size * 0.15, 0, size / 2, size * 0.15, size * 0.45);
  g.addColorStop(0, 'rgba(40,24,60,.38)'); g.addColorStop(1, 'rgba(40,24,60,0)');
  c.fillStyle = g; c.save(); c.scale(1, 0.34); c.fillRect(0, 0, size, size); c.restore();
}));

const iconKey = (n: string, size: number) => `rw:ico:${n}:${size}`;

function energyIcon(size: number): string {
  return canvasUrl(iconKey('energy', size), () => paint(size, size, 2, (c) => {
    const s = size;
    c.beginPath(); c.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
    fillShaded(c, '#FFD84D', { x: s * 0.08, y: s * 0.08, w: s * 0.84, h: s * 0.84 }, s * LW, { light: 0.4 });
    c.beginPath(); c.moveTo(s * 0.56, s * 0.14); c.lineTo(s * 0.3, s * 0.56); c.lineTo(s * 0.48, s * 0.56); c.lineTo(s * 0.4, s * 0.88); c.lineTo(s * 0.7, s * 0.42); c.lineTo(s * 0.52, s * 0.42); c.closePath();
    fillShaded(c, '#FFFFFF', { x: s * 0.3, y: s * 0.14, w: s * 0.4, h: s * 0.74 }, s * LW * 0.8, { light: 0, dark: 0.12 });
    gloss(c, s * 0.34, s * 0.28, s * 0.07, s * 0.04, 0.8);
  }));
}
function heartsIcon(size: number): string {
  return canvasUrl(iconKey('hearts', size), () => paint(size, size, 2, (c) => {
    const s = size;
    heartPath(c, s * 0.5, s * 0.52, s * 0.78); fillShaded(c, PAL.roseVif, { x: s * 0.1, y: s * 0.12, w: s * 0.8, h: s * 0.8 }, s * LW, { light: 0.35 });
    gloss(c, s * 0.34, s * 0.34, s * 0.09, s * 0.05, 0.8);
  }));
}
function chestIcon(size: number): string {
  return canvasUrl(iconKey('chest', size), () => paint(size, size, 2, (c) => {
    const p: Palette = { main: '#9C6B4E', ribbon: '#F3C86B', accent: '#7C6BB0', glow: '#FFE9A8', dark: '#58433F' };
    c.save(); c.translate(0, size * 0.05); chestBody(c, size, p, false); chestLid(c, size, p, false); c.restore();
  }));
}
function memoryIcon(size: number): string {
  return canvasUrl(iconKey('memory', size), () => paint(size, size, 2, (c) => {
    const s = size;
    c.save(); c.translate(s / 2, s / 2); c.rotate(-0.1); c.translate(-s / 2, -s / 2);
    roundRect(c, s * 0.16, s * 0.1, s * 0.68, s * 0.8, s * 0.04); fillShaded(c, '#FFFDF6', { x: s * 0.16, y: s * 0.1, w: s * 0.68, h: s * 0.8 }, s * LW, { light: 0, dark: 0.06 });
    roundRect(c, s * 0.22, s * 0.16, s * 0.56, s * 0.52, s * 0.03); fillShaded(c, '#F5B5C8', { x: s * 0.22, y: s * 0.16, w: s * 0.56, h: s * 0.52 }, s * LW * 0.7);
    heartPath(c, s * 0.5, s * 0.42, s * 0.26); c.fillStyle = '#FFFFFF'; c.fill();
    c.restore();
  }));
}
function itemIcon(size: number, id?: string): string {
  return canvasUrl(iconKey(`item:${id ?? ''}`, size), () => paint(size, size, 2, (c) => {
    const s = size;
    if (id === 'wand') { c.save(); c.translate(s / 2, s / 2); c.rotate(0.7); c.translate(-s / 2, -s / 2); roundRect(c, s * 0.46, s * 0.3, s * 0.08, s * 0.56, s * 0.03); fillShaded(c, '#7C6BB0', { x: s * 0.46, y: s * 0.3, w: s * 0.08, h: s * 0.56 }, s * LW * 0.8); starPath(c, s * 0.5, s * 0.24, s * 0.2, s * 0.09, 5); fillShaded(c, '#FFD84D', { x: s * 0.3, y: s * 0.04, w: s * 0.4, h: s * 0.4 }, s * LW * 0.8, { light: 0.5 }); c.restore(); return; }
    starPath(c, s * 0.5, s * 0.52, s * 0.4, s * 0.18, 5);
    fillShaded(c, id === 'wind' ? '#8FD3F4' : '#B07CFF', { x: s * 0.1, y: s * 0.1, w: s * 0.8, h: s * 0.8 }, s * LW, { light: 0.4 });
    gloss(c, s * 0.4, s * 0.4, s * 0.07, s * 0.04, 0.8);
  }));
}
function surpriseIcon(size: number): string {
  return canvasUrl(iconKey('gift', size), () => paint(size, size, 2, (c) => {
    const p: Palette = { main: '#FF8DB4', ribbon: '#FFF4E8', accent: '#F3C86B', glow: '#FFE9A8', dark: '#C4407A' };
    c.save(); c.translate(0, size * 0.04); giftBody(c, size, p, false); giftLid(c, size, p, false); c.restore();
  }));
}

/** Aperçu dessiné d'une récompense (peut être remplacé par `reward.icon`). */
export function rewardIconUrl(r: Pick<Reward, 'type' | 'id' | 'icon'>, size = 64): string {
  if (r.icon) return r.icon;
  switch (r.type) {
    case 'coins': return partUrl({ t: 'coins', n: 1 }, size);
    case 'diamonds': return partUrl({ t: 'diamonds', n: 1 }, size);
    case 'tickets': return ticketUrl(size);
    case 'res': return partUrl(r.id === 'flowers' || r.id === 'fabric' || r.id === 'cocoa' ? { t: 'res', k: r.id, n: 1 } : { t: 'coins', n: 1 }, size);
    case 'energy': return energyIcon(size);
    case 'hearts': return heartsIcon(size);
    case 'chest': return chestIcon(size);
    case 'memory': return memoryIcon(size);
    case 'item': return itemIcon(size, r.id);
    case 'furniture': return r.id ? partUrl({ t: 'furn', id: r.id as never }, size) : surpriseIcon(size);
    case 'cloth': return r.id ? partUrl({ t: 'cloth', id: r.id as never }, size) : surpriseIcon(size);
    case 'bouquet': return r.id ? partUrl({ t: 'bouquet', ids: r.id.split('+') as never, key: r.id } as Resolved, size) : surpriseIcon(size);
  }
}

let thumbsLoaded: Promise<void> | null = null;
/** Charge (une fois) les vignettes du dressing pour les tenues ; sans elles, repli sur un petit paquet. */
export function loadThumbs(): Promise<void> {
  thumbsLoaded ??= import('../screens/world/dressing').then((m) => { setClothThumb((id) => m.thumbUrl(id as never)); }).catch(() => undefined);
  return thumbsLoaded;
}

/** Halo rond (pour les lueurs en image, sans filtre coûteux). */
export const haloUrl = (color: string, size = 256): string => canvasUrl(`rw:halo:${color}:${size}`, () => paint(size, size, 1, (c) => { glow(c, size / 2, size / 2, size / 2, color, 0.95); }));
