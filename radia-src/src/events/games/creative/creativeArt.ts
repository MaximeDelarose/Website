/** Art partagé des mini-jeux créatifs (Canvas 2D, style « chocolat + dégradés doux »). */
import { drawFlower } from '../../../game/art/world/garden';
import { drawChocolate, drawTopping } from '../../../game/art/world/chocolate';
import { PAL, canvasUrl, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, paint, roundRect, sparkle, texScale } from '../../../game/art/kit';
import type { FlowerId } from '../../../data/world/ids';
import { BOX_COLOR_HEX, RIBBON_HEX, type BaseId, type BoxColor, type BoxStyle, type Piece, type RibbonColor, type ToppingId, TOPPING_ART } from './chocLogic';
import type { Boutique } from './shopLogic';
import type { WrapId } from './bouquetLogic';

type C = CanvasRenderingContext2D;
const INK = PAL.choco;
const bx = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

// ------------------------------------------------------------------ fleurs & emballages

/** Fleur complète (tige comprise) en image, mise en cache. */
export function flowerUrl(id: FlowerId, size: number): string {
  return canvasUrl(`cr:flower:${id}:${size}:${texScale()}`, () => paint(size, size, texScale(), (c) => drawFlower(c, id, 3, size)));
}
/** Tête de fleur seule (vignette de bouton) : on recadre le haut du dessin. */
export function flowerIconUrl(id: FlowerId, size: number): string {
  return canvasUrl(`cr:ficon:${id}:${size}:${texScale()}`, () => paint(size, size, texScale(), (c) => {
    c.save(); c.translate(-size * 0.28, -size * 0.1); drawFlower(c, id, 3, size * 1.56); c.restore();
  }));
}

/** Tête de fleur seule (sans tige ni terre), centrée dans un carré `size`, pour composer l'éventail. */
export function headUrl(id: FlowerId, size: number): string {
  return canvasUrl(`cr:head:${id}:${size}:${texScale()}`, () => paint(size, size, texScale(), (c) => {
    c.save(); c.beginPath(); c.arc(size / 2, size / 2, size * 0.5, 0, Math.PI * 2); c.clip();
    c.translate(-size * 0.2, -size * 0.03); drawFlower(c, id, 3, size * 1.4); c.restore();
  }));
}

/** Variante hexadécimale de shade() (fillShaded relit les couleurs en hex). */
export function hexShade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}

function bowAt(c: C, x: number, y: number, s: number, col: string): void {
  for (const k of [-1, 1]) {
    c.beginPath(); c.ellipse(x + k * s * 0.55, y, s * 0.6, s * 0.36, k * 0.4, 0, Math.PI * 2);
    fillShaded(c, col, bx(x + k * s * 0.55 - s * 0.6, y - s * 0.4, s * 1.2, s * 0.8), 1.8, { light: 0.35 });
  }
  c.beginPath(); c.arc(x, y, s * 0.28, 0, Math.PI * 2); fillShaded(c, hexShade(col, -0.12), bx(x - s * 0.3, y - s * 0.3, s * 0.6, s * 0.6), 1.6);
  c.beginPath(); c.moveTo(x - 2, y + s * 0.2); c.lineTo(x - s * 0.5, y + s * 1.1); c.lineTo(x - s * 0.15, y + s * 0.95); c.lineTo(x + 1, y + s * 0.3); c.closePath();
  fillShaded(c, col, bx(x - s * 0.5, y, s * 0.5, s * 1.1), 1.6);
  c.beginPath(); c.moveTo(x + 2, y + s * 0.2); c.lineTo(x + s * 0.5, y + s * 1.1); c.lineTo(x + s * 0.15, y + s * 0.95); c.lineTo(x - 1, y + s * 0.3); c.closePath();
  fillShaded(c, col, bx(x, y, s * 0.5, s * 1.1), 1.6);
}

/** Emballage en cornet (dessiné devant les tiges), dans un cadre w×h. */
export function drawWrap(c: C, kind: WrapId, w: number, h: number): void {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const top = h * 0.04;
  c.beginPath();
  c.moveTo(w * 0.1, top); c.quadraticCurveTo(w * 0.5, top + h * 0.1, w * 0.9, top);
  c.lineTo(w * 0.57, h * 0.98); c.lineTo(w * 0.43, h * 0.98); c.closePath();
  const fill: Record<WrapId, string> = { kraft: '#DDBB8C', silk: '#F7B3CB', lace: '#FFF6EA', gold: '#FFF1DE', velvet: '#A895DE' };
  fillShaded(c, fill[kind], bx(0, 0, w, h), 2.4, { light: 0.3, dark: 0.16 });
  c.save();
  c.clip();
  c.strokeStyle = 'rgba(88,67,63,0.2)'; c.lineWidth = 1.4;
  for (const k of [0.3, 0.5, 0.7]) { c.beginPath(); c.moveTo(w * k, top + 2); c.lineTo(w * (0.43 + (k - 0.3) * 0.35), h); c.stroke(); }
  if (kind === 'lace') {
    c.fillStyle = 'rgba(232,85,143,0.22)';
    for (let r = 0; r < 6; r++) for (let q = 0; q < 8; q++) { c.beginPath(); c.arc(w * (0.18 + q * 0.09 + (r % 2) * 0.045), h * (0.16 + r * 0.14), 3.1, 0, 6.28); c.fill(); }
    c.strokeStyle = '#E9CFAE'; c.lineWidth = 2;
    for (let q = 0; q < 9; q++) { c.beginPath(); c.arc(w * (0.14 + q * 0.09), top + h * 0.07, w * 0.04, 0, Math.PI); c.stroke(); }
  } else if (kind === 'kraft') {
    c.fillStyle = 'rgba(232,85,143,0.55)';
    for (let q = 0; q < 5; q++) { heartPath(c, w * (0.25 + q * 0.125), h * (0.3 + (q % 2) * 0.22), 7); c.fill(); }
  } else if (kind === 'velvet') {
    c.fillStyle = 'rgba(255,255,255,0.14)'; c.beginPath(); c.ellipse(w * 0.34, h * 0.35, w * 0.07, h * 0.28, 0.35, 0, 6.28); c.fill();
  } else if (kind === 'silk') {
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(w * 0.3, h * 0.3, w * 0.05, h * 0.22, 0.3, 0, 6.28); c.fill();
  } else {
    c.fillStyle = PAL.or; c.fillRect(w * 0.1, h * 0.4, w * 0.8, h * 0.12);
    c.strokeStyle = INK; c.lineWidth = 1.3; c.strokeRect(w * 0.1, h * 0.4, w * 0.8, h * 0.12);
  }
  c.restore();
  // lien
  const ribbon: Record<WrapId, string> = { kraft: '#8B5A48', silk: '#E8558F', lace: '#F7C9DA', gold: PAL.or, velvet: PAL.or };
  c.beginPath(); roundRect(c, w * 0.28, h * 0.27, w * 0.44, h * 0.07, 3);
  fillShaded(c, ribbon[kind], bx(w * 0.28, h * 0.27, w * 0.44, h * 0.07), 1.6, { light: 0.35 });
  bowAt(c, w * 0.5, h * 0.3, Math.min(w, h) * 0.13, ribbon[kind]);
  if (kind === 'lace') for (let q = 0; q < 5; q++) { c.beginPath(); c.arc(w * (0.34 + q * 0.08), h * 0.3, 2.6, 0, 6.28); fillShaded(c, '#FFF9EE', bx(0, 0, 4, 4), 1); }
  c.restore();
}
export function wrapUrl(kind: WrapId, w: number, h: number): string {
  return canvasUrl(`cr:wrap:${kind}:${w}x${h}:${texScale()}`, () => paint(w, h, texScale(), (c) => drawWrap(c, kind, w, h)));
}

// ------------------------------------------------------------------ chocolats

/** Caramel et pistache : garnitures maison. */
function drawCustomTop(c: C, kind: 'caramel' | 'pistache', size: number): void {
  c.save(); c.scale(size / 100, size / 100); c.lineJoin = 'round'; c.lineCap = 'round';
  if (kind === 'caramel') {
    c.beginPath(); c.moveTo(14, 60); c.bezierCurveTo(10, 30, 46, 22, 62, 32); c.bezierCurveTo(88, 36, 92, 70, 66, 78); c.bezierCurveTo(50, 90, 18, 84, 14, 60); c.closePath();
    fillShaded(c, '#E0A04A', bx(10, 22, 82, 66), 3.4, { light: 0.4 }); gloss(c, 36, 42, 11, 5, 0.75);
  } else {
    for (const [x, y, r] of [[36, 36, 13], [64, 40, 12], [48, 62, 14], [26, 66, 10], [72, 68, 10]] as const) {
      c.beginPath(); c.arc(x, y, r, 0, 6.28); fillShaded(c, '#9BCB7A', bx(x - r, y - r, r * 2, r * 2), 3, { light: 0.35 });
      c.beginPath(); c.arc(x - r * 0.25, y - r * 0.2, r * 0.4, 0, 6.28); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
    }
  }
  c.restore();
}
export function drawToppingAny(c: C, t: ToppingId, size: number): void {
  const art = TOPPING_ART[t];
  if (art) drawTopping(c, art, size); else drawCustomTop(c, t as 'caramel' | 'pistache', size);
}
export function toppingUrl(t: ToppingId, size: number): string {
  return canvasUrl(`cr:top:${t}:${size}:${texScale()}`, () => paint(size, size, texScale(), (c) => drawToppingAny(c, t, size)));
}
export function drawPiece(c: C, p: Piece, size: number): void {
  drawChocolate(c, p.base, size);
  if (p.topping) { c.save(); c.translate(size * 0.3, size * 0.3); drawToppingAny(c, p.topping, size * 0.4); c.restore(); }
}
export function pieceUrl(p: Piece, size: number): string {
  return canvasUrl(`cr:piece:${p.base}:${p.topping ?? '-'}:${size}:${texScale()}`, () => paint(size, size, texScale(), (c) => drawPiece(c, p, size)));
}
export function baseUrl(b: BaseId, size: number): string { return pieceUrl({ base: b, topping: null }, size); }

/** Géométrie des 6 alvéoles (3 × 2) dans un coffret w×h : rectangles en pixels. */
export function boxSlotRect(i: number, w: number, h: number): { x: number; y: number; w: number; h: number } {
  const padX = w * 0.09, padY = h * 0.16, gx = w * 0.025, gy = h * 0.04;
  const cw = (w - padX * 2 - gx * 2) / 3, ch = (h - padY * 2 - gy) / 2;
  return { x: padX + (i % 3) * (cw + gx), y: padY + Math.floor(i / 3) * (ch + gy), w: cw, h: ch };
}

/** Coffret ouvert vide (cadre + 6 alvéoles). */
export function drawBoxFrame(c: C, w: number, h: number, color: BoxColor): void {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); roundRect(c, 3, 3, w - 6, h - 8, 16); fillShaded(c, BOX_COLOR_HEX[color], bx(0, 0, w, h), 3, { light: 0.3 });
  c.beginPath(); roundRect(c, w * 0.045, h * 0.09, w * 0.91, h * 0.82, 11); fillShaded(c, '#8B5A48', bx(0, 0, w, h), 2.2, { light: 0.05, dark: 0.2 });
  for (let i = 0; i < 6; i++) {
    const r = boxSlotRect(i, w, h);
    c.beginPath(); roundRect(c, r.x, r.y, r.w, r.h, 12); c.fillStyle = '#FFE9D6'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
  }
  c.restore();
}

/** Coffret fermé et décoré (couleur, ruban, étiquette). */
export function drawBoxClosed(c: C, w: number, h: number, st: BoxStyle): void {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); roundRect(c, 4, 6, w - 8, h - 12, 18);
  fillShaded(c, BOX_COLOR_HEX[st.color], bx(0, 0, w, h), 3, { light: 0.32 });
  c.beginPath(); roundRect(c, 12, 14, w - 24, h - 28, 12); c.strokeStyle = 'rgba(88,67,63,0.18)'; c.lineWidth = 2; c.stroke();
  const rc = RIBBON_HEX[st.ribbon];
  c.beginPath(); roundRect(c, w * 0.44, 4, w * 0.12, h - 8, 4); fillShaded(c, rc, bx(0, 0, w, h), 2, { light: 0.35 });
  c.beginPath(); roundRect(c, 4, h * 0.44, w - 8, h * 0.12, 4); fillShaded(c, rc, bx(0, 0, w, h), 2, { light: 0.35 });
  bowAt(c, w * 0.5, h * 0.46, Math.min(w, h) * 0.13, rc);
  // étiquette
  c.save(); c.translate(w * 0.74, h * 0.74); c.rotate(-0.12);
  c.beginPath(); roundRect(c, -w * 0.17, -h * 0.1, w * 0.34, h * 0.2, 6); fillShaded(c, '#FFFDF6', bx(-w * 0.17, -h * 0.1, w * 0.34, h * 0.2), 2, { light: 0.1, dark: 0.08 });
  c.fillStyle = INK; c.font = `700 ${Math.round(h * 0.075)}px Fredoka, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(st.label, 0, 1, w * 0.3);
  c.restore();
  gloss(c, w * 0.2, h * 0.2, w * 0.1, h * 0.03, 0.55);
  sparkle(c, w * 0.84, h * 0.18, 7, '#FFFFFF', 0.9);
  c.restore();
}
export const ribbonSwatch = (r: RibbonColor): string => RIBBON_HEX[r];

// ------------------------------------------------------------------ boutiques

/** Décor simple d'une boutique : mur, vitrine, portants, enseigne. */
export function drawBoutique(c: C, w: number, h: number, shop: Boutique, idx: number): void {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, shop.wall[0]); g.addColorStop(1, shop.wall[1]);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // sol
  const fy = h * 0.8;
  c.fillStyle = idx === 1 ? '#F1D3C0' : idx === 2 ? '#B9B2DB' : '#E9D3A8'; c.fillRect(0, fy, w, h - fy);
  c.strokeStyle = 'rgba(88,67,63,0.18)'; c.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(w * (i / 6), fy); c.lineTo(w * (i / 6 - 0.5) * 1.5 + w * 0.5, h); c.stroke(); }
  c.beginPath(); c.moveTo(0, fy); c.lineTo(w, fy); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  // enseigne
  c.beginPath(); roundRect(c, w * 0.12, h * 0.025, w * 0.76, h * 0.085, 14); fillShaded(c, shop.sign, bx(w * 0.12, 0, w * 0.76, h * 0.12), 2.6, { light: 0.3 });
  c.fillStyle = INK; c.font = `800 ${Math.round(h * 0.043)}px Fredoka, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(shop.name, w / 2, h * 0.068, w * 0.7);
  // fenêtres en arche
  for (const k of [0.12, 0.88]) {
    const x = w * k, r = w * 0.095;
    c.beginPath(); c.moveTo(x - r, h * 0.52); c.lineTo(x - r, h * 0.28); c.arc(x, h * 0.28, r, Math.PI, 0); c.lineTo(x + r, h * 0.52); c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    glow(c, x, h * 0.34, r * 1.3, '#FFFFFF', 0.35);
  }
  // portants / étagères selon la boutique
  const cols = [['#E8558F', '#B9A5E8', '#F3C86B'], ['#E8484F', '#FFC0A3', '#7FC48A'], ['#8FB6F0', '#F5B5C8', '#51446D']][idx % 3];
  c.strokeStyle = '#B08A5A'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(w * 0.04, h * 0.58); c.lineTo(w * 0.2, h * 0.58); c.moveTo(w * 0.8, h * 0.58); c.lineTo(w * 0.96, h * 0.58); c.stroke();
  for (let i = 0; i < 3; i++) for (const side of [0.05, 0.81]) {
    const x = w * (side + i * 0.05);
    c.beginPath(); c.moveTo(x, h * 0.58); c.lineTo(x - w * 0.012, h * 0.62); c.lineTo(x + w * 0.012, h * 0.62); c.closePath();
    c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(x - w * 0.018, h * 0.6); c.lineTo(x + w * 0.018, h * 0.6); c.lineTo(x + w * 0.026, h * 0.7); c.lineTo(x - w * 0.026, h * 0.7); c.closePath();
    fillShaded(c, cols[(i + (side > 0.5 ? 1 : 0)) % 3], bx(x - 10, h * 0.6, 20, h * 0.1), 1.4, { light: 0.3 });
  }
  // petit guéridon avec boîte cadeau
  for (const k of [0.1, 0.9]) {
    c.beginPath(); roundRect(c, w * k - 22, fy - 22, 44, 22, 6); fillShaded(c, shop.accent, bx(w * k - 22, fy - 22, 44, 22), 2, { light: 0.3 });
    c.beginPath(); c.moveTo(w * k, fy - 22); c.lineTo(w * k, fy); c.strokeStyle = PAL.or; c.lineWidth = 3; c.stroke();
    heartPath(c, w * k, fy - 30, 14); fillShaded(c, PAL.roseVif, bx(w * k - 8, fy - 38, 16, 16), 1.4);
  }
  // spot lumineux au centre
  glow(c, w / 2, h * 0.5, w * 0.42, '#FFFFFF', 0.5);
  ellipse(c, w / 2, fy + 4, w * 0.3, h * 0.03); c.fillStyle = 'rgba(81,68,109,0.2)'; c.fill();
  c.restore();
}

// ------------------------------------------------------------------ casserole du mini-jeu chocolat

export const BASE_COLOR: Record<BaseId, string> = { dark: '#4E2B20', milk: '#9A6240', white: '#F4E3C3' };
export interface PotOpts { color: string; level: number; swirl: number; t: number; pour: number; spoon: boolean }
/** Casserole de chocolat : `level` 0–1 (remplissage), `pour` 0–1 (filet qui coule), `swirl` (angle de la cuillère). */
export function drawPot(c: C, w: number, h: number, o: PotOpts): void {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const cx = w / 2, cy = h * 0.56, rx = Math.min(w * 0.3, h * 0.34), ry = rx * 0.32;
  groundShadow(c, cx, cy + rx * 0.9, rx * 1.25, ry * 0.9, 0.28);
  // plaque chauffante
  c.beginPath(); roundRect(c, cx - rx * 1.15, cy + rx * 0.78, rx * 2.3, rx * 0.2, 8); fillShaded(c, '#8F86A8', bx(cx - rx, cy + rx * 0.7, rx * 2, rx * 0.3), 2.4, { light: 0.2 });
  // corps
  c.beginPath(); c.moveTo(cx - rx, cy); c.lineTo(cx - rx * 0.9, cy + rx * 0.72); c.quadraticCurveTo(cx, cy + rx * 0.98, cx + rx * 0.9, cy + rx * 0.72); c.lineTo(cx + rx, cy); c.closePath();
  fillShaded(c, '#B9A5E8', bx(cx - rx, cy, rx * 2, rx * 0.9), 3, { light: 0.3 });
  heartPath(c, cx, cy + rx * 0.38, rx * 0.34); fillShaded(c, '#FFF4E8', bx(cx - rx * 0.17, cy + rx * 0.2, rx * 0.34, rx * 0.3), 1.6);
  c.beginPath(); roundRect(c, cx + rx * 0.95, cy + 4, rx * 0.7, 12, 6); fillShaded(c, '#F5B5C8', bx(cx + rx, cy, rx * 0.7, 12), 2.6);
  // bord + contenu
  ellipse(c, cx, cy, rx, ry); fillShaded(c, '#D8C8F2', bx(cx - rx, cy - ry, rx * 2, ry * 2), 3, { light: 0.2 });
  ellipse(c, cx, cy + 1, rx * 0.86, ry * 0.8); c.fillStyle = '#6E5A66'; c.fill();
  const lv = Math.max(0, Math.min(1, o.level));
  if (lv > 0) {
    ellipse(c, cx, cy + 1, rx * 0.86 * (0.35 + 0.65 * lv), ry * 0.8 * (0.35 + 0.65 * lv)); c.fillStyle = o.color; c.fill();
    gloss(c, cx - rx * 0.3, cy - ry * 0.15, rx * 0.2 * lv, ry * 0.16 * lv, 0.5, -0.2);
    c.beginPath();
    for (let a = 0; a < 9; a += 0.4) { const r = a * 0.1 * lv; c.lineTo(cx + Math.cos(a + o.swirl) * r * rx * 0.9, cy + 1 + Math.sin(a + o.swirl) * r * ry * 0.78); }
    c.strokeStyle = 'rgba(255,235,210,0.4)'; c.lineWidth = 2; c.stroke();
  }
  // filet de chocolat versé
  if (o.pour > 0) {
    const sx = cx + Math.sin(o.t * 12) * 2;
    c.beginPath(); c.moveTo(sx - 6, 0); c.lineTo(sx + 6, 0); c.lineTo(sx + 3.4, cy); c.lineTo(sx - 3.4, cy); c.closePath();
    c.save(); c.globalAlpha = Math.min(1, o.pour * 1.5); fillShaded(c, o.color, bx(sx - 6, 0, 12, cy), 2, { light: 0.3 }); c.restore();
  }
  // cuillère
  if (o.spoon && lv > 0) {
    c.save(); c.translate(cx + Math.cos(o.swirl) * rx * 0.34, cy + Math.sin(o.swirl) * ry * 0.5); c.rotate(-0.42);
    c.beginPath(); roundRect(c, -4, -rx * 1.25, 8, rx * 1.25, 4); fillShaded(c, '#E8C79A', bx(-4, -rx * 1.25, 8, rx * 1.25), 2.2);
    ellipse(c, 0, 2, 9, 6); fillShaded(c, '#E8C79A', bx(-9, -4, 18, 12), 2); c.restore();
  }
  // vapeur
  if (lv > 0.4) for (let i = 0; i < 3; i++) {
    const ph = (o.t * 0.6 + i / 3) % 1;
    c.beginPath(); c.arc(cx + (i - 1) * rx * 0.45 + Math.sin(o.t * 2 + i) * 5, cy - ry - ph * rx * 0.9, 5 + ph * 6, 0, 6.28);
    c.fillStyle = `rgba(255,255,255,${(1 - ph) * 0.5})`; c.fill();
  }
  c.restore();
}
