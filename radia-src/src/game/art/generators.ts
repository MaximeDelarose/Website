/**
 * Générateurs (sources à toucher sur le plateau), avatars des personnages qui
 * passent commande, et petites icônes d'économie (diamant, énergie, coffre,
 * carte cadeau fictive). Même style que items.ts : repère 100 × 100, contour
 * chocolat, dégradés `fillShaded`, reflet en haut à gauche, ombre au sol.
 */
import {
  OUTLINE, OUTLINE_RATIO, PAL, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, roundRect, shade, sparkle, starPath,
} from './kit';

type C = CanvasRenderingContext2D;
export type GenKind = 1 | 2 | 3 | 4;

const LW = (100 * OUTLINE_RATIO) / 0.9;
const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
function fs(c: C, color: string, x: number, y: number, w: number, h: number, lw = LW, light?: number) {
  fillShaded(c, color, box(x, y, w, h), lw, light !== undefined ? { light } : {});
}
function ol(c: C, w = LW, color: string = OUTLINE) { c.lineWidth = w; c.strokeStyle = color; c.stroke(); }
function tube(c: C, path: () => void, width: number, color: string) {
  path(); c.lineWidth = width + LW * 2; c.strokeStyle = OUTLINE; c.stroke();
  path(); c.lineWidth = width; c.strokeStyle = color; c.stroke();
}
function sparkles(c: C, pts: [number, number, number][], color = '#FFFFFF') {
  for (const [x, y, r] of pts) {
    sparkle(c, x, y, r + 1.4, OUTLINE, 0.35);
    sparkle(c, x, y, r, color);
  }
}
function leaf(c: C, x: number, y: number, len: number, ang: number, color: string = PAL.leaf) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
  c.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
  c.closePath();
  fs(c, color, 0, -len * 0.4, len, len * 0.8, LW * 0.85);
  c.beginPath(); c.moveTo(len * 0.1, 0); c.lineTo(len * 0.8, 0);
  c.lineWidth = 1.4; c.strokeStyle = shade(color, -0.35); c.stroke();
  c.restore();
}
function flower(c: C, x: number, y: number, r: number, petal: string, center: string = PAL.or, n = 5) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    ellipse(c, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.36, a);
    fs(c, petal, x - r, y - r, r * 2, r * 2, LW * 0.8, 0.4);
  }
  ellipse(c, x, y, r * 0.32, r * 0.32);
  fs(c, center, x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.6, LW * 0.8);
  gloss(c, x - r * 0.1, y - r * 0.12, r * 0.12, r * 0.08, 0.8);
}
function heartFill(c: C, x: number, y: number, s: number, col: string, lw = LW * 0.8) {
  heartPath(c, x, y, s);
  fs(c, col, x - s / 2, y - s / 2, s, s, lw, 0.35);
}

/** Anneau lumineux chaud au sol : « ceci est une source, touche-moi ». */
function baseGlow(c: C) {
  glow(c, 50, 84, 40, PAL.or, 0.45);
  ellipse(c, 50, 88, 36, 8);
  c.lineWidth = 2.4;
  c.strokeStyle = 'rgba(243,200,107,0.85)';
  c.stroke();
  ellipse(c, 50, 88, 30, 6);
  c.lineWidth = 1.4;
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.stroke();
  groundShadow(c, 50, 88, 30, 6, 0.28);
}

// ============================================================ générateurs

const GENS: Record<GenKind, (c: C) => void> = {
  // 1. Pot de fleurs magique
  1: (c) => {
    baseGlow(c);
    // tiges et fleurs
    tube(c, () => { c.beginPath(); c.moveTo(50, 50); c.quadraticCurveTo(46, 32, 50, 18); }, 5, PAL.leafDeep);
    tube(c, () => { c.beginPath(); c.moveTo(48, 52); c.quadraticCurveTo(34, 40, 28, 30); }, 4, PAL.leafDeep);
    tube(c, () => { c.beginPath(); c.moveTo(53, 52); c.quadraticCurveTo(66, 40, 72, 32); }, 4, PAL.leafDeep);
    leaf(c, 50, 44, 18, -2.6);
    leaf(c, 51, 40, 18, -0.5, PAL.leafDeep);
    flower(c, 50, 18, 11, PAL.roseVif);
    flower(c, 27, 29, 8.5, PAL.lavande, '#FFF4D0');
    flower(c, 73, 31, 8.5, PAL.peche, PAL.or);
    // pot en terre cuite
    c.beginPath();
    c.moveTo(24, 56);
    c.lineTo(76, 56);
    c.lineTo(69, 88);
    c.quadraticCurveTo(50, 93, 31, 88);
    c.closePath();
    fs(c, '#E28B62', 24, 56, 52, 36);
    roundRect(c, 20, 50, 60, 12, 5);
    fs(c, '#EE9E77', 20, 50, 60, 12);
    heartFill(c, 50, 74, 16, PAL.roseVif);
    gloss(c, 31, 65, 3, 8, 0.45, 0.15);
    sparkles(c, [[16, 18, 4.5], [84, 16, 3.8], [86, 50, 3], [13, 46, 3.2]], '#FFF6D0');
  },
  // 2. Boîte aux lettres
  2: (c) => {
    baseGlow(c);
    // poteau
    roundRect(c, 45, 58, 10, 30, 3);
    fs(c, '#C9B8F0', 45, 58, 10, 30);
    // lettre qui dépasse
    c.save();
    c.translate(32, 36);
    c.rotate(-0.35);
    roundRect(c, -10, -9, 22, 15, 2);
    fs(c, PAL.ivory, -10, -9, 22, 15, LW * 0.85);
    c.beginPath(); c.moveTo(-10, -9); c.lineTo(1, -1); c.lineTo(12, -9);
    ol(c, LW * 0.7);
    heartFill(c, 1, 2, 6, PAL.roseVif, LW * 0.5);
    c.restore();
    // corps arrondi
    c.beginPath();
    c.moveTo(22, 62);
    c.lineTo(22, 40);
    c.bezierCurveTo(22, 20, 78, 20, 78, 40);
    c.lineTo(78, 62);
    c.closePath();
    fs(c, '#FF9CC0', 22, 22, 56, 40);
    // porte (face)
    c.beginPath();
    c.moveTo(22, 62);
    c.lineTo(22, 40);
    c.bezierCurveTo(22, 28, 40, 28, 40, 40);
    c.lineTo(40, 62);
    c.closePath();
    fs(c, '#FFB8D0', 22, 28, 18, 34, LW * 0.9, 0.4);
    ellipse(c, 34, 50, 2.6, 2.6);
    fs(c, PAL.or, 31, 47, 6, 6, LW * 0.6);
    // fente
    roundRect(c, 47, 38, 22, 4, 2);
    c.fillStyle = shade(PAL.roseDeep, -0.3); c.fill();
    // drapeau cœur
    tube(c, () => { c.beginPath(); c.moveTo(78, 52); c.lineTo(86, 52); c.lineTo(86, 26); }, 3, PAL.or);
    heartFill(c, 86, 22, 15, PAL.roseDeep);
    gloss(c, 52, 30, 10, 3, 0.55, -0.1);
    sparkles(c, [[14, 20, 3.6], [70, 12, 4], [88, 70, 3]], '#FFF6D0');
  },
  // 3. Appareil photo
  3: (c) => {
    baseGlow(c);
    // breloque Tour Eiffel
    tube(c, () => { c.beginPath(); c.moveTo(78, 46); c.quadraticCurveTo(86, 58, 82, 68); }, 1.6, PAL.or);
    c.save();
    c.translate(82, 76);
    c.beginPath();
    c.moveTo(0, -11); c.lineTo(5, 9); c.lineTo(2, 9); c.lineTo(0, 3); c.lineTo(-2, 9); c.lineTo(-5, 9); c.closePath();
    fs(c, PAL.or, -5, -11, 10, 20, LW * 0.6);
    c.restore();
    // viseur
    roundRect(c, 30, 26, 22, 12, 4);
    fs(c, '#D9CDF5', 30, 26, 22, 12);
    // déclencheur
    roundRect(c, 62, 27, 10, 7, 3);
    fs(c, PAL.roseVif, 62, 27, 10, 7, LW * 0.8);
    // corps
    roundRect(c, 14, 34, 72, 46, 10);
    fs(c, PAL.lavande, 14, 34, 72, 46);
    // bande crème
    roundRect(c, 14, 50, 72, 14, 2);
    fs(c, PAL.creme, 14, 50, 72, 14, LW * 0.8, 0.3);
    // objectif
    c.beginPath(); c.arc(50, 57, 17, 0, Math.PI * 2);
    fs(c, PAL.ivory, 33, 40, 34, 34);
    c.beginPath(); c.arc(50, 57, 12, 0, Math.PI * 2);
    fs(c, PAL.nuit, 38, 45, 24, 24);
    c.beginPath(); c.arc(50, 57, 7, 0, Math.PI * 2);
    fs(c, '#6D5D93', 43, 50, 14, 14, LW * 0.6);
    gloss(c, 46, 52, 3.4, 2.2, 0.85);
    // flash
    roundRect(c, 70, 40, 10, 7, 2);
    fs(c, '#FFF6D0', 70, 40, 10, 7, LW * 0.7);
    gloss(c, 22, 40, 6, 2.4, 0.6, -0.1);
    heartFill(c, 23, 73, 7, PAL.roseVif, LW * 0.5);
    sparkles(c, [[10, 22, 4], [90, 24, 3.6], [12, 88, 2.8]], '#FFF6D0');
  },
  // 4. Coffret d'échecs
  4: (c) => {
    baseGlow(c);
    // couvercle entrouvert (derrière)
    c.save();
    c.translate(16, 46);
    c.rotate(-0.32);
    roundRect(c, 0, -18, 68, 18, 5);
    fs(c, '#B97A55', 0, -18, 68, 18);
    // damier sur le couvercle
    for (let i = 0; i < 6; i++) {
      if (i % 2) continue;
      c.fillStyle = 'rgba(255,244,232,0.55)';
      c.fillRect(6 + i * 9.5, -14, 9.5, 5);
      c.fillRect(6 + (i + 1) * 9.5, -9, 9.5, 5);
    }
    c.restore();
    // couronne sur le couvercle
    c.save();
    c.translate(48, 20);
    c.rotate(-0.32);
    c.beginPath();
    c.moveTo(-11, 5); c.lineTo(-13, -6); c.lineTo(-6, 0); c.lineTo(0, -9); c.lineTo(6, 0); c.lineTo(13, -6); c.lineTo(11, 5);
    c.closePath();
    fs(c, PAL.or, -13, -9, 26, 14, LW * 0.75);
    c.restore();
    // pion qui sort
    c.beginPath(); c.arc(58, 34, 8, 0, Math.PI * 2);
    fs(c, PAL.ivory, 50, 26, 16, 16, LW * 0.9);
    c.beginPath();
    c.moveTo(51, 54); c.quadraticCurveTo(52, 42, 55, 40); c.lineTo(61, 40); c.quadraticCurveTo(64, 42, 65, 54); c.closePath();
    fs(c, PAL.ivory, 51, 40, 14, 14, LW * 0.9);
    gloss(c, 55, 31, 2.4, 1.6, 0.8);
    // boîte
    roundRect(c, 14, 48, 72, 36, 7);
    fs(c, '#C98B63', 14, 48, 72, 36);
    roundRect(c, 14, 48, 72, 8, 4);
    fs(c, '#D9A47D', 14, 48, 72, 8, LW * 0.8, 0.35);
    // garnitures dorées
    for (const x of [14, 78]) { roundRect(c, x, 56, 8, 26, 2); fs(c, PAL.or, x, 56, 8, 26, LW * 0.7); }
    // serrure cœur
    heartFill(c, 50, 68, 13, PAL.roseVif, LW * 0.75);
    gloss(c, 26, 62, 3, 7, 0.4, 0.1);
    sparkles(c, [[12, 22, 3.6], [88, 30, 4.2], [90, 62, 2.8]], '#FFF6D0');
  },
};

export function drawGenerator(ctx: CanvasRenderingContext2D, kind: GenKind, size: number): void {
  const fn = GENS[kind];
  if (!fn) return;
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.translate(5, 5);
  ctx.scale(0.9, 0.9);
  fn(ctx);
  ctx.restore();
}

// ============================================================ avatars

function avatarFrame(c: C, bg: [string, string], body: () => void) {
  c.save();
  c.beginPath(); c.arc(50, 50, 47, 0, Math.PI * 2);
  const g = c.createLinearGradient(0, 0, 0, 100);
  g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
  c.fillStyle = g; c.fill();
  c.clip();
  body();
  c.restore();
  c.beginPath(); c.arc(50, 50, 46, 0, Math.PI * 2);
  c.lineWidth = 5; c.strokeStyle = '#FFFFFF'; c.stroke();
  c.beginPath(); c.arc(50, 50, 48.5, 0, Math.PI * 2);
  c.lineWidth = 1.4; c.strokeStyle = 'rgba(88,67,63,0.35)'; c.stroke();
}

function blushes(c: C, xl: number, xr: number, y: number, r = 5) {
  for (const x of [xl, xr]) { ellipse(c, x, y, r, r * 0.6); c.fillStyle = 'rgba(255,117,168,0.45)'; c.fill(); }
}
function dotEyes(c: C, xl: number, xr: number, y: number, r = 2.8) {
  for (const x of [xl, xr]) {
    ellipse(c, x, y, r, r * 1.2); c.fillStyle = OUTLINE; c.fill();
    ellipse(c, x - r * 0.3, y - r * 0.45, r * 0.38, r * 0.38); c.fillStyle = '#FFF'; c.fill();
  }
}
function smile(c: C, x: number, y: number, w: number) {
  c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y + w * 0.9, x + w, y); ol(c, LW * 0.7);
}

const REQ: Record<'cat' | 'pawn' | 'florist', (c: C) => void> = {
  cat: (c) => avatarFrame(c, ['#FFE4EE', PAL.rose], () => {
    // corps
    ellipse(c, 50, 104, 34, 26);
    fs(c, '#FFD9B0', 16, 78, 68, 40);
    // oreilles
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(50 + s * 30, 40); c.lineTo(50 + s * 30, 12); c.lineTo(50 + s * 10, 26); c.closePath();
      fs(c, '#F4A261', 50 + Math.min(s * 30, s * 10), 12, 20, 28);
      c.beginPath(); c.moveTo(50 + s * 26, 34); c.lineTo(50 + s * 27, 19); c.lineTo(50 + s * 15, 27); c.closePath();
      c.fillStyle = '#FFB3C7'; c.fill();
    }
    // tête
    ellipse(c, 50, 52, 32, 27);
    fs(c, '#FFE2C2', 18, 25, 64, 54);
    // taches oranges
    c.save(); ellipse(c, 50, 52, 32, 27); c.clip();
    ellipse(c, 30, 34, 14, 10, -0.4); c.fillStyle = '#F4A261'; c.fill();
    ellipse(c, 68, 32, 10, 7, 0.4); c.fillStyle = '#F4A261'; c.fill();
    c.restore();
    ellipse(c, 50, 52, 32, 27); ol(c);
    dotEyes(c, 38, 62, 50);
    blushes(c, 30, 70, 60);
    heartPath(c, 50, 58, 6); c.fillStyle = PAL.roseDeep; c.fill();
    c.beginPath(); c.moveTo(50, 61); c.quadraticCurveTo(45, 66, 41, 63); c.moveTo(50, 61); c.quadraticCurveTo(55, 66, 59, 63); ol(c, LW * 0.6);
    // moustaches
    c.beginPath();
    for (const s of [-1, 1]) { c.moveTo(50 + s * 14, 60); c.lineTo(50 + s * 30, 57); c.moveTo(50 + s * 14, 63); c.lineTo(50 + s * 29, 65); }
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(88,67,63,0.6)'; c.stroke();
    // nœud rose
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(64, 27); c.lineTo(64 + s * 12, 20); c.lineTo(64 + s * 12, 34); c.closePath();
      fs(c, PAL.roseVif, 52, 20, 24, 14, LW * 0.8);
    }
    ellipse(c, 64, 27, 3.6, 3.6); fs(c, PAL.roseDeep, 60, 24, 7, 7, LW * 0.6);
  }),
  pawn: (c) => avatarFrame(c, ['#F1EBFF', PAL.lavande], () => {
    // base
    ellipse(c, 50, 98, 36, 14);
    fs(c, PAL.ivory, 14, 84, 72, 28);
    roundRect(c, 20, 82, 60, 9, 4);
    fs(c, PAL.roseVif, 20, 82, 60, 9, LW * 0.8);
    // corps
    c.beginPath();
    c.moveTo(28, 84); c.quadraticCurveTo(32, 62, 40, 56); c.lineTo(60, 56); c.quadraticCurveTo(68, 62, 72, 84); c.closePath();
    fs(c, PAL.ivory, 28, 56, 44, 28);
    roundRect(c, 32, 50, 36, 9, 4);
    fs(c, '#F4E8D6', 32, 50, 36, 9, LW * 0.8);
    // tête
    c.beginPath(); c.arc(50, 34, 19, 0, Math.PI * 2);
    fs(c, PAL.ivory, 31, 15, 38, 38);
    gloss(c, 43, 25, 5, 3, 0.8, -0.4);
    dotEyes(c, 43, 57, 35, 2.4);
    blushes(c, 37, 63, 42, 4);
    smile(c, 50, 42, 4);
    // petite couronne
    c.beginPath(); c.moveTo(42, 17); c.lineTo(41, 9); c.lineTo(46, 13); c.lineTo(50, 6); c.lineTo(54, 13); c.lineTo(59, 9); c.lineTo(58, 17); c.closePath();
    fs(c, PAL.or, 41, 6, 18, 11, LW * 0.6);
  }),
  florist: (c) => avatarFrame(c, ['#FFF4E0', PAL.peche], () => {
    // épaules / tablier
    ellipse(c, 50, 104, 38, 30);
    fs(c, '#9FD8A8', 12, 74, 76, 50);
    roundRect(c, 36, 80, 28, 30, 6);
    fs(c, PAL.creme, 36, 80, 28, 30, LW * 0.8);
    heartFill(c, 50, 92, 8, PAL.roseVif, LW * 0.5);
    // cou
    roundRect(c, 44, 64, 12, 12, 4);
    fs(c, '#E8B48F', 44, 64, 12, 12, LW * 0.8);
    // cheveux arrière
    ellipse(c, 50, 54, 26, 24);
    fs(c, '#B5734A', 24, 30, 52, 48);
    // visage
    ellipse(c, 50, 52, 19, 21);
    fs(c, '#F3C5A2', 31, 31, 38, 42);
    dotEyes(c, 43, 57, 52, 2.4);
    blushes(c, 37, 63, 59, 4);
    smile(c, 50, 61, 5);
    // frange
    c.beginPath(); c.moveTo(31, 46); c.quadraticCurveTo(40, 34, 50, 40); c.quadraticCurveTo(60, 34, 69, 46); c.quadraticCurveTo(66, 30, 50, 30); c.quadraticCurveTo(34, 30, 31, 46); c.closePath();
    fs(c, '#B5734A', 31, 30, 38, 16, LW * 0.8);
    // chapeau de paille
    ellipse(c, 50, 31, 36, 9);
    fs(c, '#F7D58A', 14, 22, 72, 18);
    c.beginPath(); c.moveTo(32, 30); c.quadraticCurveTo(34, 10, 50, 10); c.quadraticCurveTo(66, 10, 68, 30); c.closePath();
    fs(c, '#F7D58A', 32, 10, 36, 20);
    roundRect(c, 33, 22, 34, 6, 3);
    fs(c, PAL.roseVif, 33, 22, 34, 6, LW * 0.7);
    flower(c, 66, 22, 6, PAL.lavande, '#FFF4D0');
  }),
};

export function drawRequester(ctx: CanvasRenderingContext2D, who: 'cat' | 'pawn' | 'florist', size: number): void {
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  REQ[who](ctx);
  ctx.restore();
}

// ============================================================ petites icônes

function inBox(ctx: C, size: number, fn: (c: C) => void) {
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.translate(5, 5);
  ctx.scale(0.9, 0.9);
  fn(ctx);
  ctx.restore();
}

export function drawDiamond(ctx: CanvasRenderingContext2D, size: number): void {
  inBox(ctx, size, (c) => {
    glow(c, 50, 52, 46, PAL.lavande, 0.35);
    // silhouette
    c.beginPath();
    c.moveTo(24, 22); c.lineTo(76, 22); c.lineTo(94, 40); c.lineTo(50, 92); c.lineTo(6, 40); c.closePath();
    const g = c.createLinearGradient(10, 20, 90, 90);
    g.addColorStop(0, '#FFD6E8'); g.addColorStop(0.45, '#E9A6F0'); g.addColorStop(1, '#9C88D6');
    c.fillStyle = g; c.fill();
    // facettes
    const facet = (pts: number[][], col: string) => {
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
      c.closePath(); c.fillStyle = col; c.fill();
    };
    facet([[24, 22], [38, 40], [6, 40]], 'rgba(255,255,255,0.45)');
    facet([[24, 22], [50, 22], [38, 40]], 'rgba(255,255,255,0.65)');
    facet([[50, 22], [62, 40], [38, 40]], 'rgba(255,255,255,0.3)');
    facet([[50, 22], [76, 22], [62, 40]], 'rgba(255,255,255,0.5)');
    facet([[76, 22], [94, 40], [62, 40]], 'rgba(120,90,190,0.18)');
    facet([[6, 40], [38, 40], [50, 92]], 'rgba(255,255,255,0.2)');
    facet([[62, 40], [94, 40], [50, 92]], 'rgba(81,68,109,0.22)');
    c.beginPath();
    c.moveTo(6, 40); c.lineTo(94, 40);
    c.moveTo(24, 22); c.lineTo(38, 40); c.lineTo(50, 22); c.lineTo(62, 40); c.lineTo(76, 22);
    c.moveTo(38, 40); c.lineTo(50, 92); c.lineTo(62, 40);
    c.lineWidth = LW * 0.55; c.strokeStyle = 'rgba(88,67,63,0.45)'; c.stroke();
    c.beginPath();
    c.moveTo(24, 22); c.lineTo(76, 22); c.lineTo(94, 40); c.lineTo(50, 92); c.lineTo(6, 40); c.closePath();
    ol(c);
    sparkles(c, [[26, 30, 5], [82, 14, 4.2]]);
  });
}

export function drawEnergy(ctx: CanvasRenderingContext2D, size: number): void {
  inBox(ctx, size, (c) => {
    glow(c, 50, 50, 46, PAL.or, 0.35);
    c.beginPath();
    c.moveTo(58, 4);
    c.quadraticCurveTo(62, 2, 60, 8);
    c.lineTo(52, 40);
    c.lineTo(76, 40);
    c.quadraticCurveTo(84, 41, 78, 48);
    c.lineTo(42, 94);
    c.quadraticCurveTo(36, 98, 38, 90);
    c.lineTo(46, 58);
    c.lineTo(24, 58);
    c.quadraticCurveTo(16, 57, 21, 50);
    c.closePath();
    const g = c.createLinearGradient(20, 0, 80, 100);
    g.addColorStop(0, '#FFF0B0'); g.addColorStop(0.5, '#FFD34D'); g.addColorStop(1, '#F0A42B');
    c.fillStyle = g; c.fill();
    ol(c, LW * 1.1);
    gloss(c, 44, 30, 4, 12, 0.7, 0.45);
    sparkles(c, [[82, 18, 4.5], [18, 80, 3.6]], '#FFFDF0');
  });
}

export function drawChest(ctx: CanvasRenderingContext2D, size: number, open: boolean): void {
  inBox(ctx, size, (c) => {
    groundShadow(c, 50, 90, 40, 7, 0.3);
    if (open) {
      glow(c, 50, 46, 48, '#FFE7A0', 0.75);
      // rayons
      c.save();
      c.globalAlpha = 0.5;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.28;
        c.beginPath(); c.moveTo(50, 50);
        c.lineTo(50 + Math.cos(a - 0.07) * 60, 50 + Math.sin(a - 0.07) * 60);
        c.lineTo(50 + Math.cos(a + 0.07) * 60, 50 + Math.sin(a + 0.07) * 60);
        c.closePath(); c.fillStyle = '#FFF6D0'; c.fill();
      }
      c.restore();
      // couvercle relevé
      c.beginPath();
      c.moveTo(14, 46); c.lineTo(20, 14); c.quadraticCurveTo(50, 2, 80, 14); c.lineTo(86, 46); c.closePath();
      fs(c, '#C7707F', 14, 4, 72, 42);
      c.beginPath(); c.moveTo(16, 40); c.lineTo(21, 18); c.quadraticCurveTo(50, 8, 79, 18); c.lineTo(84, 40);
      c.lineWidth = 3.2; c.strokeStyle = PAL.or; c.stroke();
      // trésor
      for (const [x, y, col] of [[36, 50, PAL.or], [50, 46, PAL.roseVif], [63, 50, PAL.or], [44, 52, PAL.lavande]] as const) {
        if (col === PAL.roseVif) heartFill(c, x, y, 13, col, LW * 0.7);
        else { c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); fs(c, col, x - 6, y - 6, 12, 12, LW * 0.7); }
      }
    }
    // caisse
    roundRect(c, 12, 50, 76, 38, 6);
    fs(c, '#C7707F', 12, 50, 76, 38);
    if (!open) {
      c.beginPath();
      c.moveTo(12, 52); c.lineTo(12, 40); c.quadraticCurveTo(50, 14, 88, 40); c.lineTo(88, 52); c.closePath();
      fs(c, '#D88593', 12, 24, 76, 28);
      c.beginPath(); c.moveTo(12, 44); c.quadraticCurveTo(50, 20, 88, 44);
      c.lineWidth = 3.4; c.strokeStyle = PAL.or; c.stroke();
    }
    // bandes dorées
    for (const x of [22, 72]) { roundRect(c, x, 50, 7, 38, 2); fs(c, PAL.or, x, 50, 7, 38, LW * 0.7); }
    roundRect(c, 12, 50, 76, 6, 3);
    fs(c, PAL.or, 12, 50, 76, 6, LW * 0.7);
    // serrure cœur
    heartFill(c, 50, 66, 16, PAL.or, LW * 0.8);
    ellipse(c, 50, 66, 1.8, 3); c.fillStyle = OUTLINE; c.fill();
    gloss(c, 20, 62, 3, 8, 0.35, 0.1);
    sparkles(c, open ? [[14, 20, 5], [86, 16, 4.5], [90, 60, 3.4], [10, 64, 3]] : [[86, 24, 3.6]], '#FFF6D0');
  });
}

/**
 * Carte cadeau FICTIVE (aucun numéro, aucun cryptogramme, aucune date) :
 * dégradé violet nuit → rose, puce dorée, logo cœur, « AUGUSTE ».
 */
export function drawCard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const c = ctx;
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const r = Math.min(w, h) * 0.09;
  roundRect(c, 0, 0, w, h, r);
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#51446D');
  g.addColorStop(0.55, '#8A5A9E');
  g.addColorStop(1, '#FF75A8');
  c.fillStyle = g;
  c.fill();
  c.save();
  roundRect(c, 0, 0, w, h, r);
  c.clip();
  // motifs doux : cœurs et vagues
  c.globalAlpha = 0.12;
  for (let i = 0; i < 9; i++) {
    heartPath(c, w * (0.1 + (i * 0.37) % 1), h * (0.18 + ((i * 0.53) % 0.8)), w * 0.09);
    c.fillStyle = '#FFFFFF'; c.fill();
  }
  c.globalAlpha = 0.18;
  c.beginPath();
  c.moveTo(-10, h * 0.78);
  c.bezierCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 1.0, w + 10, h * 0.7);
  c.lineTo(w + 10, h + 10); c.lineTo(-10, h + 10); c.closePath();
  c.fillStyle = '#FFFFFF'; c.fill();
  c.globalAlpha = 1;
  // reflet
  const sh = c.createLinearGradient(0, 0, w, h * 0.6);
  sh.addColorStop(0, 'rgba(255,255,255,0.28)');
  sh.addColorStop(0.5, 'rgba(255,255,255,0)');
  c.fillStyle = sh;
  c.fillRect(0, 0, w, h);
  c.restore();
  roundRect(c, 0, 0, w, h, r);
  c.lineWidth = Math.max(1.5, w * 0.008); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.stroke();

  const u = w / 100;
  // puce dorée
  roundRect(c, 9 * u, h * 0.36, 14 * u, 11 * u, 2.2 * u);
  const cg = c.createLinearGradient(9 * u, h * 0.36, 23 * u, h * 0.36 + 11 * u);
  cg.addColorStop(0, '#FFE9A8'); cg.addColorStop(1, PAL.orDeep);
  c.fillStyle = cg; c.fill();
  c.lineWidth = 0.6 * u; c.strokeStyle = 'rgba(88,67,63,0.55)'; c.stroke();
  c.beginPath();
  c.moveTo(9 * u, h * 0.36 + 5.5 * u); c.lineTo(23 * u, h * 0.36 + 5.5 * u);
  c.moveTo(16 * u, h * 0.36); c.lineTo(16 * u, h * 0.36 + 11 * u);
  c.stroke();
  // sans contact
  c.lineWidth = 0.9 * u; c.strokeStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(27 * u, h * 0.36 + 5.5 * u, (2.4 + i * 2.2) * u, -0.7, 0.7);
    c.stroke();
  }
  // logo cœur
  heartPath(c, w - 14 * u, 13 * u, 13 * u);
  c.fillStyle = '#FFFFFF'; c.fill();
  heartPath(c, w - 14 * u, 13 * u, 9 * u);
  c.fillStyle = PAL.roseVif; c.fill();
  // textes
  c.fillStyle = '#FFFFFF';
  c.textBaseline = 'alphabetic';
  c.font = `600 ${5.2 * u}px Fredoka, sans-serif`;
  c.globalAlpha = 0.85;
  c.fillText('Carte cadeau virtuelle', 9 * u, 15 * u);
  c.globalAlpha = 1;
  c.font = `700 ${9 * u}px Fredoka, sans-serif`;
  c.shadowColor = 'rgba(0,0,0,0.25)';
  c.shadowBlur = 2 * u;
  c.shadowOffsetY = 0.6 * u;
  c.fillText('AUGUSTE', 9 * u, h - 9 * u);
  c.shadowColor = 'transparent';
  c.font = `500 ${4.4 * u}px Fredoka, sans-serif`;
  c.globalAlpha = 0.8;
  c.textAlign = 'right';
  c.fillText('pour ma reine ♡', w - 8 * u, h - 9.5 * u);
  c.restore();
  void starPath;
}
