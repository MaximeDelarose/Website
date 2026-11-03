/**
 * Dessin des 36 meubles du château (style objets RADIA : contours chocolat,
 * reflet en haut à gauche, ombre douce au sol). Chaque meuble remplit sa boîte
 * w×h (emprise en pixels) ; la couleur de variante teinte les parties textiles
 * ou en bois via `shade`. Le tableau accepte la variante « mag:<id> ».
 */
import type { FurnitureId, MagazineId } from '../../../data/world/ids';
import { FURNITURE } from '../../../data/world/furniture';
import { colorOf } from '../../../data/world/ids';
import { PAL, OUTLINE, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, roundRect, shade as kitShade, sparkle, starPath } from '../kit';
import { drawMagazine } from './careers';

type C = CanvasRenderingContext2D;

/** `shade` du kit renvoie « rgb(...) » : on convertit en hex pour pouvoir l'enchaîner (et le passer à fillShaded). */
function toHex(c: string): string {
  if (c.startsWith('#')) return c.length === 4 ? '#' + c.slice(1).split('').map((x) => x + x).join('') : c;
  const m = c.match(/\d+/g);
  if (!m) return '#FF00FF';
  return '#' + m.slice(0, 3).map((v) => Math.max(0, Math.min(255, +v)).toString(16).padStart(2, '0')).join('');
}
const shade = (c: string, a: number): string => toHex(kitShade(toHex(c), a));

// état de dessin courant (un seul dessin à la fois)
let LW = 2;
let W = 0;
let H = 0;

const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
/** Rectangle arrondi rempli en dégradé + contour. */
function rr(c: C, x: number, y: number, w: number, h: number, r: number, col: string, lw = LW, light?: number): void {
  roundRect(c, x, y, w, h, r);
  fillShaded(c, col, box(x, y, w, h), lw, light !== undefined ? { light } : {});
}
function el(c: C, cx: number, cy: number, rx: number, ry: number, col: string, lw = LW): void {
  ellipse(c, cx, cy, rx, ry);
  fillShaded(c, col, box(cx - rx, cy - ry, rx * 2, ry * 2), lw);
}
function poly(c: C, pts: number[][], col: string, lw = LW): void {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs); const y0 = Math.min(...ys);
  fillShaded(c, col, box(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0), lw);
}
function line(c: C, x1: number, y1: number, x2: number, y2: number, col: string = OUTLINE, lw = LW): void {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = lw; c.strokeStyle = col; c.stroke();
}
function heart(c: C, cx: number, cy: number, s: number, col: string): void {
  heartPath(c, cx, cy, s);
  fillShaded(c, col, box(cx - s / 2, cy - s / 2, s, s), Math.max(0.8, LW * 0.6));
}
const shadow = (c: C, rx = 0.46, ry = 0.05, cy = 0.95) => groundShadow(c, W / 2, H * cy, W * rx, H * ry, 0.26);
const wood = (c: string) => shade(c, -0.12);
const flame = (c: C, x: number, y: number, s: number) => {
  glow(c, x, y, s * 2.2, PAL.or, 0.5);
  c.beginPath();
  c.moveTo(x, y - s * 1.2);
  c.quadraticCurveTo(x + s * 0.9, y - s * 0.1, x, y + s * 0.6);
  c.quadraticCurveTo(x - s * 0.9, y - s * 0.1, x, y - s * 1.2);
  fillShaded(c, '#FFB347', box(x - s, y - s * 1.2, s * 2, s * 1.8), Math.max(0.7, LW * 0.5));
  c.beginPath(); c.ellipse(x, y + s * 0.05, s * 0.28, s * 0.4, 0, 0, Math.PI * 2); c.fillStyle = '#FFF3B0'; c.fill();
};
function flower(c: C, x: number, y: number, r: number, col: string, center: string = PAL.or): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    el(c, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, r * 0.55, col, Math.max(0.7, LW * 0.45));
  }
  el(c, x, y, r * 0.5, r * 0.5, center, Math.max(0.7, LW * 0.45));
}
function leaf(c: C, x: number, y: number, len: number, ang: number, col: string = PAL.leaf): void {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.38, len, 0); c.quadraticCurveTo(len * 0.5, len * 0.38, 0, 0);
  fillShaded(c, col, box(0, -len * 0.38, len, len * 0.76), Math.max(0.8, LW * 0.5));
  c.restore();
}

// ------------------------------------------------------------------ meubles

const DRAW: Record<FurnitureId, (c: C, col: string) => void> = {
  'bed-royal': (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.06, h * 0.03, w * 0.88, h * 0.58, w * 0.1, wood(shade(col, -0.2)));
    rr(c, w * 0.12, h * 0.09, w * 0.76, h * 0.45, w * 0.08, shade(col, 0.45), LW * 0.7);
    heart(c, w * 0.5, h * 0.2, h * 0.17, PAL.roseVif);
    for (const x of [0.06, 0.94]) { el(c, w * x, h * 0.04, w * 0.035, w * 0.035, PAL.or); }
    rr(c, w * 0.04, h * 0.52, w * 0.92, h * 0.36, w * 0.05, shade(col, 0.35));
    rr(c, w * 0.1, h * 0.38, w * 0.34, h * 0.2, h * 0.08, PAL.ivory);
    rr(c, w * 0.56, h * 0.38, w * 0.34, h * 0.2, h * 0.08, PAL.ivory);
    rr(c, w * 0.04, h * 0.6, w * 0.92, h * 0.3, w * 0.05, col);
    line(c, w * 0.06, h * 0.69, w * 0.94, h * 0.69, shade(col, 0.4), LW * 0.8);
    for (let i = 0; i < 4; i++) heart(c, w * (0.2 + i * 0.2), h * 0.79, h * 0.08, shade(col, 0.5));
    rr(c, w * 0.06, h * 0.88, w * 0.08, h * 0.09, 2, wood(col)); rr(c, w * 0.86, h * 0.88, w * 0.08, h * 0.09, 2, wood(col));
    gloss(c, w * 0.2, h * 0.64, w * 0.1, h * 0.03, 0.5);
  },
  'bed-kid': (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.04, h * 0.22, w * 0.18, h * 0.62, w * 0.06, wood(shade(col, -0.25)));
    rr(c, w * 0.18, h * 0.5, w * 0.78, h * 0.34, w * 0.07, shade(col, 0.3));
    rr(c, w * 0.2, h * 0.38, w * 0.26, h * 0.2, h * 0.08, PAL.ivory);
    rr(c, w * 0.34, h * 0.5, w * 0.62, h * 0.3, w * 0.07, col);
    starPath(c, w * 0.62, h * 0.64, h * 0.1, h * 0.045, 5);
    fillShaded(c, PAL.or, box(w * 0.5, h * 0.55, h * 0.2, h * 0.2), LW * 0.7);
    rr(c, w * 0.88, h * 0.78, w * 0.08, h * 0.15, 2, wood(col));
    rr(c, w * 0.18, h * 0.82, w * 0.08, h * 0.12, 2, wood(col));
  },
  'crib-bed': (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.08, h * 0.18, w * 0.84, h * 0.68, w * 0.05, 'rgba(255,255,255,0.35)', LW * 0.8);
    rr(c, w * 0.12, h * 0.55, w * 0.76, h * 0.25, 4, PAL.ivory);
    rr(c, w * 0.12, h * 0.6, w * 0.5, h * 0.2, 4, shade(PAL.rose, 0.15));
    for (let i = 0; i < 7; i++) line(c, w * (0.18 + i * 0.105), h * 0.22, w * (0.18 + i * 0.105), h * 0.84, shade(col, -0.25), LW * 1.1);
    rr(c, w * 0.06, h * 0.14, w * 0.88, h * 0.1, h * 0.05, wood(shade(col, -0.1)));
    rr(c, w * 0.06, h * 0.82, w * 0.88, h * 0.08, h * 0.04, wood(shade(col, -0.1)));
    el(c, w * 0.28, h * 0.5, w * 0.1, h * 0.07, PAL.peche);
    for (const x of [0.06, 0.88]) rr(c, w * x, h * 0.08, w * 0.06, h * 0.84, 3, wood(shade(col, -0.2)));
    heart(c, w * 0.7, h * 0.1, h * 0.09, PAL.roseVif);
  },
  nightstand: (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.08, h * 0.12, w * 0.84, h * 0.14, 3, shade(col, 0.15));
    rr(c, w * 0.12, h * 0.24, w * 0.76, h * 0.62, 4, col);
    rr(c, w * 0.2, h * 0.32, w * 0.6, h * 0.22, 3, shade(col, 0.12), LW * 0.7);
    rr(c, w * 0.2, h * 0.58, w * 0.6, h * 0.2, 3, shade(col, 0.12), LW * 0.7);
    el(c, w * 0.5, h * 0.43, w * 0.05, w * 0.05, PAL.or, LW * 0.6); el(c, w * 0.5, h * 0.68, w * 0.05, w * 0.05, PAL.or, LW * 0.6);
    rr(c, w * 0.14, h * 0.84, w * 0.1, h * 0.1, 2, wood(col)); rr(c, w * 0.76, h * 0.84, w * 0.1, h * 0.1, 2, wood(col));
    heart(c, w * 0.7, h * 0.07, h * 0.12, PAL.roseVif);
  },
  'rug-round': (c, col) => {
    const w = W; const h = H;
    groundShadow(c, w / 2, h * 0.62, w * 0.46, h * 0.1, 0.18);
    el(c, w / 2, h * 0.55, w * 0.47, h * 0.34, shade(col, -0.05));
    el(c, w / 2, h * 0.55, w * 0.38, h * 0.27, shade(col, 0.45), LW * 0.7);
    el(c, w / 2, h * 0.55, w * 0.27, h * 0.19, col, LW * 0.7);
    el(c, w / 2, h * 0.55, w * 0.14, h * 0.1, shade(col, 0.5), LW * 0.7);
    heart(c, w / 2, h * 0.55, h * 0.11, PAL.roseVif);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; sparkle(c, w / 2 + Math.cos(a) * w * 0.33, h * 0.55 + Math.sin(a) * h * 0.23, 2, '#fff', 0.8); }
  },
  'rug-rect': (c, col) => {
    const w = W; const h = H;
    groundShadow(c, w / 2, h * 0.88, w * 0.48, h * 0.07, 0.16);
    const o = [[w * 0.16, h * 0.18], [w * 0.84, h * 0.18], [w * 0.98, h * 0.86], [w * 0.02, h * 0.86]];
    poly(c, o, shade(col, -0.08));
    poly(c, [[w * 0.2, h * 0.27], [w * 0.8, h * 0.27], [w * 0.9, h * 0.77], [w * 0.1, h * 0.77]], shade(col, 0.5), LW * 0.7);
    poly(c, [[w * 0.26, h * 0.36], [w * 0.74, h * 0.36], [w * 0.8, h * 0.68], [w * 0.2, h * 0.68]], col, LW * 0.7);
    for (let i = 0; i < 4; i++) {
      const x = w * (0.32 + i * 0.12); const y = h * 0.52;
      poly(c, [[x, y - h * 0.09], [x + w * 0.05, y], [x, y + h * 0.09], [x - w * 0.05, y]], i % 2 ? PAL.or : shade(col, 0.55), LW * 0.5);
    }
    for (let i = 0; i < 12; i++) line(c, w * (0.04 + i * 0.083), h * 0.86, w * (0.035 + i * 0.083), h * 0.94, shade(col, 0.4), LW * 0.7);
  },
  vanity: (c, col) => {
    const w = W; const h = H;
    shadow(c);
    ellipse(c, w * 0.5, h * 0.3, w * 0.3, h * 0.27);
    fillShaded(c, PAL.or, box(w * 0.2, h * 0.03, w * 0.6, h * 0.54), LW);
    el(c, w * 0.5, h * 0.3, w * 0.25, h * 0.22, '#EAF4FF', LW * 0.7);
    gloss(c, w * 0.4, h * 0.2, w * 0.07, h * 0.1, 0.7);
    sparkle(c, w * 0.6, h * 0.38, 4, '#fff', 0.9);
    rr(c, w * 0.08, h * 0.56, w * 0.84, h * 0.1, 3, shade(col, 0.1));
    rr(c, w * 0.12, h * 0.64, w * 0.76, h * 0.26, 3, col);
    rr(c, w * 0.16, h * 0.7, w * 0.3, h * 0.14, 3, shade(col, 0.15), LW * 0.7); rr(c, w * 0.54, h * 0.7, w * 0.3, h * 0.14, 3, shade(col, 0.15), LW * 0.7);
    el(c, w * 0.31, h * 0.77, 2, 2, PAL.or, LW * 0.5); el(c, w * 0.69, h * 0.77, 2, 2, PAL.or, LW * 0.5);
    rr(c, w * 0.18, h * 0.46, w * 0.07, h * 0.12, 3, PAL.rose, LW * 0.7); rr(c, w * 0.78, h * 0.44, w * 0.06, h * 0.14, 3, PAL.lavande, LW * 0.7);
    rr(c, w * 0.14, h * 0.88, w * 0.08, h * 0.08, 2, wood(col)); rr(c, w * 0.78, h * 0.88, w * 0.08, h * 0.08, 2, wood(col));
  },
  'mirror-standing': (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.4);
    line(c, w * 0.2, h * 0.9, w * 0.1, h * 0.97, OUTLINE, LW * 2.2); line(c, w * 0.8, h * 0.9, w * 0.9, h * 0.97, OUTLINE, LW * 2.2);
    ellipse(c, w * 0.5, h * 0.46, w * 0.4, h * 0.45);
    fillShaded(c, col, box(w * 0.1, h * 0.01, w * 0.8, h * 0.9), LW);
    ellipse(c, w * 0.5, h * 0.46, w * 0.31, h * 0.37);
    const g = c.createLinearGradient(w * 0.2, h * 0.1, w * 0.8, h * 0.8);
    g.addColorStop(0, '#F4FAFF'); g.addColorStop(0.5, '#CFE6FA'); g.addColorStop(1, '#B9D4F0');
    c.fillStyle = g; c.fill(); c.lineWidth = LW * 0.8; c.strokeStyle = OUTLINE; c.stroke();
    c.beginPath(); c.moveTo(w * 0.3, h * 0.55); c.lineTo(w * 0.56, h * 0.15); c.lineTo(w * 0.64, h * 0.15); c.lineTo(w * 0.38, h * 0.55); c.fillStyle = 'rgba(255,255,255,0.45)'; c.fill();
    sparkle(c, w * 0.68, h * 0.7, 4, '#fff', 0.9);
    heart(c, w * 0.5, h * 0.04, h * 0.07, PAL.roseVif);
  },
  'lamp-floor': (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.38);
    glow(c, w * 0.5, h * 0.2, w * 0.7, PAL.or, 0.35);
    el(c, w * 0.5, h * 0.92, w * 0.28, h * 0.05, wood(PAL.or));
    rr(c, w * 0.46, h * 0.3, w * 0.08, h * 0.62, 3, PAL.orDeep);
    poly(c, [[w * 0.28, h * 0.04], [w * 0.72, h * 0.04], [w * 0.86, h * 0.33], [w * 0.14, h * 0.33]], col);
    c.beginPath(); c.moveTo(w * 0.3, h * 0.06); c.lineTo(w * 0.42, h * 0.06); c.lineTo(w * 0.3, h * 0.28); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fill();
    el(c, w * 0.5, h * 0.4, w * 0.045, w * 0.045, PAL.or, LW * 0.6);
  },
  'lamp-table': (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.34);
    glow(c, w * 0.5, h * 0.35, w * 0.7, PAL.or, 0.35);
    el(c, w * 0.5, h * 0.84, w * 0.26, h * 0.1, shade(col, 0.1));
    rr(c, w * 0.43, h * 0.5, w * 0.14, h * 0.38, 3, PAL.or);
    poly(c, [[w * 0.25, h * 0.1], [w * 0.75, h * 0.1], [w * 0.88, h * 0.52], [w * 0.12, h * 0.52]], col);
    gloss(c, w * 0.34, h * 0.24, w * 0.07, h * 0.09, 0.55);
  },
  'plant-pot': (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.36);
    for (const [x, a, l, k] of [[0.5, -1.57, 0.5, 0], [0.5, -2.3, 0.42, 1], [0.5, -0.85, 0.42, 1], [0.5, -2.8, 0.34, 0], [0.5, -0.35, 0.34, 0]] as const) leaf(c, w * x, h * 0.62, h * l, a, k ? PAL.leafDeep : PAL.leaf);
    poly(c, [[w * 0.2, h * 0.58], [w * 0.8, h * 0.58], [w * 0.7, h * 0.94], [w * 0.3, h * 0.94]], col);
    rr(c, w * 0.16, h * 0.54, w * 0.68, h * 0.12, 4, shade(col, 0.15));
    gloss(c, w * 0.32, h * 0.72, w * 0.05, h * 0.07, 0.55);
  },
  painting: (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.34);
    line(c, w * 0.3, h * 0.85, w * 0.2, h * 0.97, OUTLINE, LW * 2); line(c, w * 0.7, h * 0.85, w * 0.8, h * 0.97, OUTLINE, LW * 2);
    rr(c, w * 0.08, h * 0.04, w * 0.84, h * 0.84, 4, PAL.or);
    const ix = w * 0.17; const iy = h * 0.1; const iw = w * 0.66; const ih = h * 0.72;
    c.save(); roundRect(c, ix, iy, iw, ih, 2); c.clip();
    if (col.startsWith('mag:')) {
      // drawMagazine dessine en (0,0) : on le positionne dans le cadre
      c.translate(ix, iy);
      drawMagazine(c, col.slice(4) as MagazineId, iw, ih);
      c.restore();
      roundRect(c, ix, iy, iw, ih, 2); c.lineWidth = LW * 0.8; c.strokeStyle = OUTLINE; c.stroke();
      return;
    }
    const sky = c.createLinearGradient(0, iy, 0, iy + ih);
    sky.addColorStop(0, shade(col, 0.4)); sky.addColorStop(1, shade(PAL.peche, 0.2));
    c.fillStyle = sky; c.fillRect(ix, iy, iw, ih);
    el(c, ix + iw * 0.7, iy + ih * 0.25, iw * 0.14, iw * 0.14, PAL.or, LW * 0.5);
    c.beginPath(); c.moveTo(ix, iy + ih); c.quadraticCurveTo(ix + iw * 0.3, iy + ih * 0.45, ix + iw * 0.6, iy + ih * 0.75); c.quadraticCurveTo(ix + iw * 0.8, iy + ih * 0.6, ix + iw, iy + ih * 0.72); c.lineTo(ix + iw, iy + ih); c.fillStyle = PAL.leaf; c.fill();
    c.beginPath(); c.moveTo(ix, iy + ih); c.quadraticCurveTo(ix + iw * 0.4, iy + ih * 0.7, ix + iw, iy + ih * 0.9); c.lineTo(ix + iw, iy + ih); c.fillStyle = PAL.leafDeep; c.fill();
    heart(c, ix + iw * 0.3, iy + ih * 0.3, iw * 0.16, PAL.roseVif);
    c.restore();
    roundRect(c, ix, iy, iw, ih, 2); c.lineWidth = LW * 0.8; c.strokeStyle = OUTLINE; c.stroke();
    gloss(c, ix + iw * 0.2, iy + ih * 0.12, iw * 0.12, ih * 0.04, 0.5);
  },
  sofa: (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.1, h * 0.12, w * 0.8, h * 0.5, h * 0.18, shade(col, 0.1));
    rr(c, w * 0.02, h * 0.34, w * 0.2, h * 0.52, h * 0.12, shade(col, -0.05));
    rr(c, w * 0.78, h * 0.34, w * 0.2, h * 0.52, h * 0.12, shade(col, -0.05));
    rr(c, w * 0.16, h * 0.46, w * 0.34, h * 0.36, h * 0.1, col);
    rr(c, w * 0.5, h * 0.46, w * 0.34, h * 0.36, h * 0.1, col);
    line(c, w * 0.5, h * 0.5, w * 0.5, h * 0.8, shade(col, -0.35), LW * 0.8);
    rr(c, w * 0.2, h * 0.22, w * 0.18, h * 0.26, h * 0.08, shade(col, 0.4), LW * 0.8);
    heart(c, w * 0.3, h * 0.35, h * 0.1, PAL.roseVif);
    rr(c, w * 0.08, h * 0.85, w * 0.07, h * 0.1, 2, wood(PAL.orDeep)); rr(c, w * 0.85, h * 0.85, w * 0.07, h * 0.1, 2, wood(PAL.orDeep));
    gloss(c, w * 0.3, h * 0.55, w * 0.07, h * 0.03, 0.4);
  },
  armchair: (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.4);
    rr(c, w * 0.2, h * 0.06, w * 0.6, h * 0.58, h * 0.22, shade(col, 0.1));
    rr(c, w * 0.06, h * 0.38, w * 0.2, h * 0.46, h * 0.12, shade(col, -0.05));
    rr(c, w * 0.74, h * 0.38, w * 0.2, h * 0.46, h * 0.12, shade(col, -0.05));
    rr(c, w * 0.22, h * 0.5, w * 0.56, h * 0.32, h * 0.1, col);
    heart(c, w * 0.5, h * 0.28, h * 0.12, shade(col, 0.5));
    rr(c, w * 0.14, h * 0.84, w * 0.1, h * 0.11, 2, wood(PAL.orDeep)); rr(c, w * 0.76, h * 0.84, w * 0.1, h * 0.11, 2, wood(PAL.orDeep));
    gloss(c, w * 0.34, h * 0.58, w * 0.07, h * 0.03, 0.4);
  },
  'coffee-table': (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.44);
    rr(c, w * 0.12, h * 0.55, w * 0.1, h * 0.4, 3, wood(col)); rr(c, w * 0.78, h * 0.55, w * 0.1, h * 0.4, 3, wood(col));
    rr(c, w * 0.04, h * 0.36, w * 0.92, h * 0.26, h * 0.1, col);
    gloss(c, w * 0.22, h * 0.43, w * 0.1, h * 0.04, 0.55);
    rr(c, w * 0.52, h * 0.22, w * 0.16, h * 0.16, 3, PAL.white, LW * 0.7);
    line(c, w * 0.68, h * 0.28, w * 0.74, h * 0.28, OUTLINE, LW * 0.8);
    flower(c, w * 0.26, h * 0.24, h * 0.1, PAL.roseVif);
  },
  bookshelf: (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.06, h * 0.03, w * 0.88, h * 0.92, 4, col);
    const cols = ['#E8558F', '#8E7BC4', '#7FC48A', '#F3C86B', '#A9D4F5', '#FFC0A3', '#C9946B'];
    for (let r = 0; r < 3; r++) {
      const y = h * (0.09 + r * 0.29);
      rr(c, w * 0.12, y, w * 0.76, h * 0.23, 2, shade(col, -0.32), LW * 0.5);
      let x = w * 0.15;
      for (let k = 0; k < 6 && x < w * 0.8; k++) {
        const bw = w * (0.06 + ((k * 7 + r * 3) % 4) * 0.012); const bh = h * (0.14 + ((k * 5 + r) % 3) * 0.025);
        rr(c, x, y + h * 0.23 - bh - 1, bw, bh, 1.5, cols[(k + r * 2) % cols.length], LW * 0.6);
        x += bw + 1;
      }
      if (r === 0) { rr(c, w * 0.66, y + h * 0.11, w * 0.14, h * 0.12, 3, PAL.peche, LW * 0.6); leaf(c, w * 0.73, y + h * 0.11, h * 0.1, -1.2); leaf(c, w * 0.73, y + h * 0.11, h * 0.1, -1.9, PAL.leafDeep); }
      rr(c, w * 0.1, y + h * 0.23, w * 0.8, h * 0.04, 1.5, shade(col, 0.15), LW * 0.6);
    }
  },
  fireplace: (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.02, h * 0.02, w * 0.96, h * 0.14, 4, shade(col, 0.1));
    rr(c, w * 0.08, h * 0.14, w * 0.84, h * 0.82, 5, col);
    for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) { c.fillStyle = 'rgba(88,67,63,0.08)'; c.fillRect(w * (0.1 + k * 0.2 + (r % 2) * 0.1), h * (0.18 + r * 0.14), w * 0.17, h * 0.1); }
    rr(c, w * 0.24, h * 0.34, w * 0.52, h * 0.58, h * 0.2, '#3B3152');
    glow(c, w * 0.5, h * 0.75, w * 0.4, '#FF9A52', 0.6);
    flame(c, w * 0.42, h * 0.72, h * 0.12); flame(c, w * 0.58, h * 0.74, h * 0.1); flame(c, w * 0.5, h * 0.68, h * 0.15);
    rr(c, w * 0.3, h * 0.82, w * 0.4, h * 0.07, 3, '#8A5A3A', LW * 0.7);
    heart(c, w * 0.5, h * 0.25, h * 0.1, PAL.roseVif);
    flame(c, w * 0.2, h * 0.07, h * 0.05); rr(c, w * 0.18, h * 0.07, w * 0.04, h * 0.07, 1.5, PAL.ivory, LW * 0.6);
  },
  candles: (c) => {
    const w = W; const h = H;
    shadow(c, 0.38);
    el(c, w * 0.5, h * 0.86, w * 0.42, h * 0.1, PAL.or);
    el(c, w * 0.5, h * 0.84, w * 0.34, h * 0.07, shade(PAL.or, 0.3), LW * 0.6);
    for (const [x, hh, col] of [[0.28, 0.4, PAL.rose], [0.5, 0.58, PAL.ivory], [0.72, 0.34, PAL.lavande]] as const) {
      rr(c, w * x - w * 0.07, h * (0.86 - hh), w * 0.14, h * hh, 3, col);
      line(c, w * x, h * (0.86 - hh), w * x, h * (0.86 - hh - 0.05), OUTLINE, LW * 0.7);
      flame(c, w * x, h * (0.86 - hh - 0.1), h * 0.07);
    }
  },
  'choco-display': (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.06, h * 0.03, w * 0.88, h * 0.92, 5, col);
    rr(c, w * 0.13, h * 0.1, w * 0.74, h * 0.7, 3, '#EAF4FF', LW * 0.7);
    const cs = ['#7B4A32', '#A9693F', '#5A3425', '#E8D5BC', '#C98A5A'];
    for (let r = 0; r < 3; r++) {
      const y = h * (0.1 + r * 0.23) + h * 0.14;
      rr(c, w * 0.13, y + h * 0.09, w * 0.74, h * 0.03, 1, shade(col, 0.2), LW * 0.5);
      for (let k = 0; k < 4; k++) {
        const x = w * (0.2 + k * 0.17);
        if ((k + r) % 3 === 0) heart(c, x + w * 0.04, y + h * 0.03, h * 0.09, cs[(k + r) % cs.length]); else el(c, x + w * 0.04, y + h * 0.04, w * 0.065, h * 0.05, cs[(k + r * 2) % cs.length], LW * 0.6);
      }
    }
    c.beginPath(); c.moveTo(w * 0.17, h * 0.12); c.lineTo(w * 0.34, h * 0.12); c.lineTo(w * 0.17, h * 0.4); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fill();
    rr(c, w * 0.12, h * 0.82, w * 0.76, h * 0.1, 3, shade(col, -0.1), LW * 0.7);
    el(c, w * 0.5, h * 0.87, w * 0.04, w * 0.04, PAL.or, LW * 0.5);
  },
  wardrobe: (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.08, h * 0.04, w * 0.84, h * 0.1, 4, shade(col, 0.15));
    rr(c, w * 0.1, h * 0.12, w * 0.8, h * 0.8, 4, col);
    rr(c, w * 0.15, h * 0.18, w * 0.34, h * 0.68, 3, shade(col, 0.12), LW * 0.7);
    rr(c, w * 0.51, h * 0.18, w * 0.34, h * 0.68, 3, shade(col, 0.12), LW * 0.7);
    heart(c, w * 0.32, h * 0.38, h * 0.12, shade(col, -0.2)); heart(c, w * 0.68, h * 0.38, h * 0.12, shade(col, -0.2));
    el(c, w * 0.44, h * 0.55, 2.4, 2.4, PAL.or, LW * 0.6); el(c, w * 0.56, h * 0.55, 2.4, 2.4, PAL.or, LW * 0.6);
    rr(c, w * 0.14, h * 0.9, w * 0.1, h * 0.07, 2, wood(col)); rr(c, w * 0.76, h * 0.9, w * 0.1, h * 0.07, 2, wood(col));
    gloss(c, w * 0.22, h * 0.26, w * 0.05, h * 0.1, 0.4);
  },
  'clothes-rack': (c) => {
    const w = W; const h = H;
    shadow(c);
    line(c, w * 0.14, h * 0.92, w * 0.22, h * 0.14, OUTLINE, LW * 3); line(c, w * 0.86, h * 0.92, w * 0.78, h * 0.14, OUTLINE, LW * 3);
    line(c, w * 0.14, h * 0.92, w * 0.22, h * 0.14, PAL.or, LW * 1.4); line(c, w * 0.86, h * 0.92, w * 0.78, h * 0.14, PAL.or, LW * 1.4);
    line(c, w * 0.12, h * 0.16, w * 0.88, h * 0.16, OUTLINE, LW * 3); line(c, w * 0.12, h * 0.16, w * 0.88, h * 0.16, PAL.orDeep, LW * 1.4);
    const dr = [PAL.roseVif, PAL.lavande, PAL.peche, PAL.leaf, '#8E7BC4'];
    dr.forEach((col, i) => {
      const x = w * (0.22 + i * 0.14);
      line(c, x, h * 0.16, x, h * 0.22);
      poly(c, [[x - w * 0.02, h * 0.22], [x + w * 0.02, h * 0.22], [x + w * 0.065, h * (0.66 + (i % 2) * 0.08)], [x - w * 0.065, h * (0.66 + (i % 2) * 0.08)]], col, LW * 0.8);
    });
    for (const x of [0.12, 0.88]) el(c, w * x, h * 0.94, w * 0.03, w * 0.03, PAL.nuit, LW * 0.6);
  },
  'shoe-stand': (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.4);
    rr(c, w * 0.08, h * 0.04, w * 0.84, h * 0.9, 4, col);
    for (let r = 0; r < 3; r++) {
      const y = h * (0.1 + r * 0.28);
      rr(c, w * 0.15, y, w * 0.7, h * 0.24, 2, shade(col, -0.3), LW * 0.5);
      rr(c, w * 0.12, y + h * 0.22, w * 0.76, h * 0.04, 1.5, shade(col, 0.2), LW * 0.6);
      const sc = [PAL.roseVif, PAL.lavande, PAL.white][r];
      poly(c, [[w * 0.22, y + h * 0.2], [w * 0.22, y + h * 0.08], [w * 0.38, y + h * 0.13], [w * 0.5, y + h * 0.2]], sc, LW * 0.7);
      poly(c, [[w * 0.55, y + h * 0.2], [w * 0.55, y + h * 0.09], [w * 0.7, y + h * 0.14], [w * 0.8, y + h * 0.2]], sc, LW * 0.7);
    }
  },
  'accessory-stand': (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.36);
    el(c, w * 0.5, h * 0.92, w * 0.3, h * 0.05, col);
    rr(c, w * 0.46, h * 0.1, w * 0.08, h * 0.82, 3, PAL.or);
    for (const [y, l] of [[0.16, 0.34], [0.34, 0.4], [0.52, 0.34]] as const) { line(c, w * 0.5, h * y, w * (0.5 - l), h * (y - 0.06), OUTLINE, LW * 2.4); line(c, w * 0.5, h * y, w * (0.5 + l), h * (y - 0.06), OUTLINE, LW * 2.4); line(c, w * 0.5, h * y, w * (0.5 - l), h * (y - 0.06), PAL.or, LW); line(c, w * 0.5, h * y, w * (0.5 + l), h * (y - 0.06), PAL.or, LW); }
    el(c, w * 0.5, h * 0.07, w * 0.09, w * 0.09, PAL.roseVif, LW * 0.8);
    for (let i = 0; i < 5; i++) el(c, w * (0.2 + i * 0.015), h * (0.2 + i * 0.05), 2.4, 2.4, '#fff', LW * 0.5);
    for (let i = 0; i < 4; i++) el(c, w * (0.82 - i * 0.012), h * (0.4 + i * 0.045), 2.4, 2.4, PAL.lavande, LW * 0.5);
    heart(c, w * 0.22, h * 0.38, h * 0.07, PAL.roseVif);
    el(c, w * 0.78, h * 0.62, w * 0.07, w * 0.07, 'rgba(0,0,0,0)', LW);
  },
  chandelier: (c) => {
    const w = W; const h = H;
    glow(c, w * 0.5, h * 0.7, w * 0.6, PAL.or, 0.35);
    line(c, w * 0.5, 0, w * 0.5, h * 0.3, OUTLINE, LW * 2.4); line(c, w * 0.5, 0, w * 0.5, h * 0.3, PAL.or, LW);
    el(c, w * 0.5, h * 0.36, w * 0.09, h * 0.12, PAL.or);
    c.beginPath(); c.moveTo(w * 0.1, h * 0.55); c.quadraticCurveTo(w * 0.5, h * 0.95, w * 0.9, h * 0.55); c.lineWidth = LW * 3; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = LW * 1.4; c.strokeStyle = PAL.or; c.stroke();
    for (const x of [0.12, 0.3, 0.5, 0.7, 0.88]) {
      const y = 0.55 + 0.22 * (1 - Math.pow((x - 0.5) / 0.4, 2)) * 0.75 - 0.0;
      rr(c, w * x - 2, h * (y - 0.15), 4, h * 0.14, 1.5, PAL.ivory, LW * 0.6);
      flame(c, w * x, h * (y - 0.19), h * 0.06);
      poly(c, [[w * x, h * (y + 0.1)], [w * x - 2.4, h * (y + 0.02)], [w * x, h * (y - 0.02)], [w * x + 2.4, h * (y + 0.02)]], '#DDF0FF', LW * 0.5);
    }
    el(c, w * 0.5, h * 0.8, 2.8, 2.8, '#DDF0FF', LW * 0.5);
  },
  'red-carpet': (c, col) => {
    const w = W; const h = H;
    groundShadow(c, w / 2, h * 0.9, w * 0.46, h * 0.1, 0.16);
    const base = shade(col, -0.12);
    poly(c, [[w * 0.2, h * 0.1], [w * 0.8, h * 0.1], [w * 0.99, h * 0.86], [w * 0.01, h * 0.86]], base);
    poly(c, [[w * 0.25, h * 0.16], [w * 0.75, h * 0.16], [w * 0.92, h * 0.78], [w * 0.08, h * 0.78]], col, LW * 0.6);
    line(c, w * 0.21, h * 0.12, w * 0.02, h * 0.84, PAL.or, LW * 1.4); line(c, w * 0.79, h * 0.12, w * 0.98, h * 0.84, PAL.or, LW * 1.4);
    for (let i = 0; i < 4; i++) { const t = 0.22 + i * 0.2; starPath(c, w * 0.5, h * (0.2 + t * 0.6), h * 0.07, h * 0.03, 5); fillShaded(c, PAL.or, box(w * 0.46, h * (0.2 + t * 0.6) - 4, 8, 8), LW * 0.5); }
    for (let i = 0; i < 14; i++) line(c, w * (0.02 + i * 0.07), h * 0.86, w * (0.015 + i * 0.07), h * 0.95, PAL.or, LW * 0.8);
  },
  'banquet-table': (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.06, h * 0.3, w * 0.88, h * 0.1, 5, shade(col, 0.2));
    c.beginPath(); c.moveTo(w * 0.06, h * 0.36); c.lineTo(w * 0.94, h * 0.36); c.lineTo(w * 0.96, h * 0.88);
    for (let i = 0; i < 8; i++) { const x = w * (0.96 - (i + 1) * 0.115); c.quadraticCurveTo(w * (0.96 - (i + 0.5) * 0.115), h * 0.97, x, h * 0.88); }
    c.closePath(); fillShaded(c, col, box(0, h * 0.36, w, h * 0.55), LW);
    for (const x of [0.14, 0.34, 0.66, 0.86]) { el(c, w * x, h * 0.3, w * 0.07, h * 0.04, PAL.white, LW * 0.6); el(c, w * x, h * 0.29, w * 0.04, h * 0.02, shade(PAL.rose, 0.3), LW * 0.4); }
    rr(c, w * 0.43, h * 0.14, w * 0.14, h * 0.16, 4, PAL.ivory, LW * 0.8);
    flower(c, w * 0.5, h * 0.1, h * 0.09, PAL.roseVif); flower(c, w * 0.42, h * 0.14, h * 0.06, PAL.lavande); flower(c, w * 0.58, h * 0.14, h * 0.06, PAL.peche);
    for (const x of [0.24, 0.76]) { rr(c, w * x - 2, h * 0.14, 4, h * 0.14, 1.5, PAL.ivory, LW * 0.6); flame(c, w * x, h * 0.1, h * 0.05); }
    for (let i = 0; i < 6; i++) heart(c, w * (0.14 + i * 0.145), h * 0.6, h * 0.08, shade(col, 0.45));
  },
  'flower-vase': (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.3);
    for (const [x, y, k] of [[0.3, 0.3, 0], [0.5, 0.18, 1], [0.7, 0.3, 2], [0.4, 0.42, 3], [0.62, 0.42, 0]] as const) {
      line(c, w * 0.5, h * 0.62, w * x, h * y, PAL.leafDeep, LW * 1.2);
      flower(c, w * x, h * y, h * 0.11, [PAL.roseVif, PAL.white, PAL.lavande, PAL.peche][k]);
    }
    c.beginPath(); c.moveTo(w * 0.38, h * 0.55); c.quadraticCurveTo(w * 0.2, h * 0.75, w * 0.34, h * 0.93); c.lineTo(w * 0.66, h * 0.93); c.quadraticCurveTo(w * 0.8, h * 0.75, w * 0.62, h * 0.55); c.closePath();
    fillShaded(c, col, box(w * 0.2, h * 0.55, w * 0.6, h * 0.4), LW);
    gloss(c, w * 0.38, h * 0.72, w * 0.04, h * 0.09, 0.6);
  },
  bench: (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.46);
    for (const x of [0.12, 0.8]) rr(c, w * x, h * 0.3, w * 0.08, h * 0.65, 3, shade(col, -0.25));
    for (let i = 0; i < 3; i++) rr(c, w * 0.06, h * (0.04 + i * 0.12), w * 0.88, h * 0.1, 3, col);
    rr(c, w * 0.02, h * 0.46, w * 0.96, h * 0.16, 4, shade(col, 0.1));
    gloss(c, w * 0.22, h * 0.5, w * 0.1, h * 0.03, 0.5);
    heart(c, w * 0.5, h * 0.22, h * 0.15, PAL.roseVif);
  },
  pergola: (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.46, 0.035, 0.96);
    for (const x of [0.06, 0.86]) rr(c, w * x, h * 0.1, w * 0.08, h * 0.86, 3, col);
    rr(c, w * 0.02, h * 0.04, w * 0.96, h * 0.1, 4, shade(col, 0.1));
    for (let i = 0; i < 6; i++) rr(c, w * (0.06 + i * 0.16), h * 0.0, w * 0.06, h * 0.12, 2, wood(col), LW * 0.7);
    // fleurs grimpantes
    const fc = [PAL.roseVif, PAL.lavande, PAL.white, PAL.peche];
    for (let i = 0; i < 10; i++) { const x = w * (0.08 + i * 0.095); const hh = h * (0.14 + (i % 3) * 0.06); line(c, x, h * 0.12, x, h * 0.12 + hh, PAL.leafDeep, LW); leaf(c, x, h * 0.12 + hh * 0.5, h * 0.06, 0.9); flower(c, x, h * 0.12 + hh, h * 0.04, fc[i % 4]); }
    for (const x of [0.08, 0.88]) for (let k = 0; k < 5; k++) { leaf(c, w * (x + 0.04), h * (0.2 + k * 0.14), h * 0.07, k % 2 ? 0.5 : 2.6); flower(c, w * (x + (k % 2 ? 0.1 : -0.02)), h * (0.24 + k * 0.14), h * 0.032, fc[k % 4]); }
  },
  fountain: (c) => {
    const w = W; const h = H;
    shadow(c);
    el(c, w * 0.5, h * 0.8, w * 0.46, h * 0.16, '#D9CDF5');
    el(c, w * 0.5, h * 0.76, w * 0.38, h * 0.11, '#9CD4F2', LW * 0.7);
    rr(c, w * 0.44, h * 0.34, w * 0.12, h * 0.4, 3, '#E8DFF9');
    el(c, w * 0.5, h * 0.36, w * 0.24, h * 0.08, '#D9CDF5');
    el(c, w * 0.5, h * 0.34, w * 0.19, h * 0.05, '#9CD4F2', LW * 0.6);
    rr(c, w * 0.47, h * 0.14, w * 0.06, h * 0.22, 3, '#E8DFF9');
    el(c, w * 0.5, h * 0.13, w * 0.07, h * 0.03, '#D9CDF5', LW * 0.7);
    for (const [x, d] of [[0.5, 0], [0.36, -1], [0.64, 1]] as const) { c.beginPath(); c.moveTo(w * 0.5, h * 0.1); c.quadraticCurveTo(w * (0.5 + d * 0.12), h * 0.02, w * (x + d * 0.16), h * 0.34); c.lineWidth = LW * 1.5; c.strokeStyle = '#9CD4F2'; c.stroke(); c.lineWidth = LW * 0.6; c.strokeStyle = '#fff'; c.stroke(); }
    sparkle(c, w * 0.3, h * 0.2, 4, '#fff', 0.9); sparkle(c, w * 0.72, h * 0.16, 3, '#fff', 0.9);
    gloss(c, w * 0.3, h * 0.78, w * 0.1, h * 0.025, 0.7);
  },
  flowerbed: (c) => {
    const w = W; const h = H;
    shadow(c, 0.46, 0.05, 0.93);
    rr(c, w * 0.02, h * 0.5, w * 0.96, h * 0.42, h * 0.16, '#8A5A3A');
    rr(c, w * 0.06, h * 0.46, w * 0.88, h * 0.16, h * 0.08, '#6E4630', LW * 0.6);
    const fc = [PAL.roseVif, PAL.lavande, PAL.white, PAL.peche, PAL.or, PAL.rose];
    for (let i = 0; i < 9; i++) {
      const x = w * (0.1 + i * 0.1); const y = h * (0.3 - (i % 3) * 0.08);
      line(c, x, h * 0.56, x, y, PAL.leafDeep, LW); leaf(c, x, h * 0.5, h * 0.12, i % 2 ? -0.6 : -2.5);
      flower(c, x, y, h * 0.12, fc[i % fc.length]);
    }
  },
  desk: (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.04, h * 0.34, w * 0.92, h * 0.12, 4, shade(col, 0.15));
    rr(c, w * 0.08, h * 0.44, w * 0.2, h * 0.5, 3, col); rr(c, w * 0.72, h * 0.44, w * 0.2, h * 0.5, 3, col);
    rr(c, w * 0.72, h * 0.5, w * 0.2, h * 0.18, 2, shade(col, 0.12), LW * 0.6); rr(c, w * 0.72, h * 0.7, w * 0.2, h * 0.18, 2, shade(col, 0.12), LW * 0.6);
    el(c, w * 0.82, h * 0.59, 2, 2, PAL.or, LW * 0.5); el(c, w * 0.82, h * 0.79, 2, 2, PAL.or, LW * 0.5);
    rr(c, w * 0.12, h * 0.22, w * 0.24, h * 0.14, 3, PAL.white, LW * 0.8); rr(c, w * 0.14, h * 0.19, w * 0.2, h * 0.04, 2, PAL.roseVif, LW * 0.6);
    rr(c, w * 0.62, h * 0.22, w * 0.1, h * 0.13, 3, PAL.lavande, LW * 0.7);
    line(c, w * 0.65, h * 0.22, w * 0.62, h * 0.1, PAL.roseVif, LW * 1.2); line(c, w * 0.69, h * 0.22, w * 0.72, h * 0.12, PAL.leaf, LW * 1.2);
    poly(c, [[w * 0.44, h * 0.12], [w * 0.54, h * 0.12], [w * 0.58, h * 0.34], [w * 0.4, h * 0.34]], PAL.or);
  },
  'plush-toys': (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.4);
    // ourson
    el(c, w * 0.36, h * 0.72, w * 0.22, h * 0.2, shade(PAL.peche, -0.08));
    el(c, w * 0.36, h * 0.42, w * 0.2, h * 0.19, col);
    el(c, w * 0.19, h * 0.27, w * 0.07, w * 0.07, col); el(c, w * 0.53, h * 0.27, w * 0.07, w * 0.07, col);
    el(c, w * 0.36, h * 0.47, w * 0.09, h * 0.07, PAL.ivory, LW * 0.6);
    el(c, w * 0.3, h * 0.4, 1.6, 1.8, OUTLINE, 0); el(c, w * 0.42, h * 0.4, 1.6, 1.8, OUTLINE, 0);
    el(c, w * 0.36, h * 0.46, 2, 1.5, OUTLINE, 0);
    heart(c, w * 0.36, h * 0.7, h * 0.13, PAL.roseVif);
    // lapin
    el(c, w * 0.74, h * 0.78, w * 0.16, h * 0.14, PAL.white);
    el(c, w * 0.74, h * 0.58, w * 0.14, h * 0.13, PAL.white);
    el(c, w * 0.68, h * 0.34, w * 0.045, h * 0.15, PAL.white); el(c, w * 0.8, h * 0.34, w * 0.045, h * 0.15, PAL.white);
    el(c, w * 0.68, h * 0.35, w * 0.02, h * 0.09, PAL.rose, 0); el(c, w * 0.8, h * 0.35, w * 0.02, h * 0.09, PAL.rose, 0);
    el(c, w * 0.7, h * 0.57, 1.4, 1.6, OUTLINE, 0); el(c, w * 0.78, h * 0.57, 1.4, 1.6, OUTLINE, 0);
  },
  'toy-blocks': (c) => {
    const w = W; const h = H;
    shadow(c, 0.42);
    const b = (x: number, y: number, s: number, col: string, ch: string) => { rr(c, x, y, s, s, 3, col); c.fillStyle = '#fff'; c.font = `bold ${s * 0.6}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, x + s / 2, y + s / 2 + 1); gloss(c, x + s * 0.28, y + s * 0.22, s * 0.14, s * 0.07, 0.6); };
    b(w * 0.06, h * 0.56, w * 0.4, PAL.roseVif, 'A'); b(w * 0.5, h * 0.56, w * 0.4, '#6FB3E8', 'B'); b(w * 0.26, h * 0.2, w * 0.4, PAL.or, 'C');
  },
  easel: (c, col) => {
    const w = W; const h = H;
    shadow(c, 0.42);
    line(c, w * 0.2, h * 0.96, w * 0.38, h * 0.05, OUTLINE, LW * 3.2); line(c, w * 0.8, h * 0.96, w * 0.62, h * 0.05, OUTLINE, LW * 3.2); line(c, w * 0.5, h * 0.96, w * 0.5, h * 0.2, OUTLINE, LW * 3.2);
    line(c, w * 0.2, h * 0.96, w * 0.38, h * 0.05, col, LW * 1.6); line(c, w * 0.8, h * 0.96, w * 0.62, h * 0.05, col, LW * 1.6); line(c, w * 0.5, h * 0.96, w * 0.5, h * 0.2, wood(col), LW * 1.6);
    rr(c, w * 0.1, h * 0.7, w * 0.8, h * 0.07, 2, wood(col));
    rr(c, w * 0.18, h * 0.16, w * 0.64, h * 0.5, 2, PAL.white);
    c.beginPath(); c.moveTo(w * 0.18, h * 0.66); c.quadraticCurveTo(w * 0.4, h * 0.4, w * 0.82, h * 0.55); c.lineTo(w * 0.82, h * 0.66); c.closePath(); c.fillStyle = PAL.leaf; c.fill();
    el(c, w * 0.66, h * 0.28, w * 0.09, w * 0.09, PAL.or, LW * 0.5); heart(c, w * 0.36, h * 0.34, h * 0.1, PAL.roseVif);
    el(c, w * 0.3, h * 0.74, 3, 2.4, PAL.roseVif, LW * 0.5); el(c, w * 0.5, h * 0.74, 3, 2.4, '#6FB3E8', LW * 0.5); el(c, w * 0.7, h * 0.74, 3, 2.4, PAL.or, LW * 0.5);
  },
  'game-shelf': (c, col) => {
    const w = W; const h = H;
    shadow(c);
    rr(c, w * 0.06, h * 0.04, w * 0.88, h * 0.9, 5, col);
    const cells = [[0.12, 0.1], [0.5, 0.1], [0.12, 0.5], [0.5, 0.5]];
    cells.forEach(([x, y], i) => {
      rr(c, w * x, h * y, w * 0.38, h * 0.36, 3, shade(col, -0.32), LW * 0.5);
      if (i === 0) { rr(c, w * 0.16, h * 0.2, w * 0.3, h * 0.2, 2, PAL.roseVif, LW * 0.8); rr(c, w * 0.16, h * 0.14, w * 0.3, h * 0.07, 2, PAL.or, LW * 0.6); }
      if (i === 1) { rr(c, w * 0.54, h * 0.18, w * 0.3, h * 0.22, 2, '#6FB3E8', LW * 0.8); for (let k = 0; k < 4; k++) el(c, w * (0.6 + (k % 2) * 0.14), h * (0.25 + Math.floor(k / 2) * 0.09), 2.4, 2.4, k % 2 ? PAL.or : '#fff', LW * 0.4); }
      if (i === 2) { el(c, w * 0.26, h * 0.76, w * 0.07, w * 0.07, PAL.leaf, LW * 0.7); el(c, w * 0.38, h * 0.78, w * 0.06, w * 0.06, PAL.peche, LW * 0.7); rr(c, w * 0.2, h * 0.58, w * 0.08, h * 0.1, 2, PAL.lavande, LW * 0.6); }
      if (i === 3) { for (let k = 0; k < 3; k++) rr(c, w * (0.54 + k * 0.1), h * (0.62 - k * 0.03), w * 0.08, h * (0.22 + k * 0.03), 1.5, [PAL.rose, PAL.lavande, PAL.leaf][k], LW * 0.6); }
    });
  },
};

// ------------------------------------------------------------------ API

/** Dessine le meuble `id` dans la boîte w×h (origine en haut à gauche). `color` : hex, ou « mag:<id> » pour un tableau. */
export function drawFurniture(ctx: CanvasRenderingContext2D, id: FurnitureId, w: number, h: number, color?: string): void {
  const f = FURNITURE[id];
  const col = color && (color.startsWith('#') || color.startsWith('mag:') || color.startsWith('rgb')) ? color : colorOf(color ?? f.color);
  W = w; H = h; LW = Math.max(1.3, (w + h) * 0.012);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  DRAW[id](ctx, col);
  ctx.restore();
}
