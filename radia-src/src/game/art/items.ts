/**
 * Icônes des 43 objets (4 collections × 10 niveaux + 3 objets spéciaux).
 * drawItem(ctx, ref, size) dessine l'objet centré dans un carré size × size,
 * sans plaque de fond (le plateau dessine la case).
 *
 * Tout est dessiné dans un repère 100 × 100 (mis à l'échelle), avec le style
 * commun : contour chocolat (OUTLINE_RATIO), dégradés `fillShaded`, reflet en
 * haut à gauche, ombre douce au sol, lumière venant d'en haut à gauche.
 * Les niveaux élevés (8 à 10) gagnent un halo et des étincelles.
 */
import type { ItemRef } from '../../data/items';
import { EXTRA_ITEMS } from './items2';
import { EXTRA_ITEMS3 } from './items3';
import { EXTRA_ITEMS4 } from './items4';
import {
  OUTLINE, OUTLINE_RATIO, PAL, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, roundRect, shade, sparkle, starPath,
} from './kit';

type C = CanvasRenderingContext2D;
const LW = (100 * OUTLINE_RATIO) / 0.88; // compense la marge de 88 %

// ------------------------------------------------------------------ outils

const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
function fs(c: C, color: string, x: number, y: number, w: number, h: number, lw = LW, light?: number) {
  fillShaded(c, color, box(x, y, w, h), lw, light !== undefined ? { light } : {});
}
function ol(c: C, w = LW, color: string = OUTLINE) { c.lineWidth = w; c.strokeStyle = color; c.stroke(); }

/** Trait épais avec contour (tiges, poignées, tubes). */
function tube(c: C, path: () => void, width: number, color: string) {
  path(); c.lineWidth = width + LW * 2; c.strokeStyle = OUTLINE; c.stroke();
  path(); c.lineWidth = width; c.strokeStyle = color; c.stroke();
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

function flower(c: C, x: number, y: number, r: number, petal: string, center: string = PAL.or, n = 5, rot = 0) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 - Math.PI / 2;
    ellipse(c, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.36, a);
    fs(c, petal, x - r, y - r, r * 2, r * 2, LW * 0.8, 0.4);
  }
  ellipse(c, x, y, r * 0.32, r * 0.32);
  fs(c, center, x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.6, LW * 0.8);
  gloss(c, x - r * 0.1, y - r * 0.12, r * 0.12, r * 0.08, 0.8);
}

function sparkles(c: C, pts: [number, number, number][], color = '#FFFFFF') {
  for (const [x, y, r] of pts) {
    sparkle(c, x, y, r + 1.4, OUTLINE, 0.35);
    sparkle(c, x, y, r, color);
  }
}

function soil(c: C, y = 78, rx = 28) {
  c.beginPath();
  c.moveTo(50 - rx, y + 6);
  c.quadraticCurveTo(50 - rx, y - 10, 50, y - 11);
  c.quadraticCurveTo(50 + rx, y - 10, 50 + rx, y + 6);
  c.quadraticCurveTo(50, y + 11, 50 - rx, y + 6);
  c.closePath();
  fs(c, '#9A6644', 50 - rx, y - 11, rx * 2, 22);
  for (const [dx, dy] of [[-12, -1], [6, -4], [14, 2]]) { ellipse(c, 50 + dx, y + dy, 2, 1.4); c.fillStyle = 'rgba(70,40,25,0.5)'; c.fill(); }
}

function stem(c: C, x0: number, y0: number, x1: number, y1: number, bend = 0, w = 4.5) {
  tube(c, () => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1); }, w, PAL.leafDeep);
}

function eiffel(c: C, cx: number, base: number, h: number, color: string, lw = LW) {
  const w = h * 0.5;
  c.beginPath();
  c.moveTo(cx, base - h);
  c.lineTo(cx + w * 0.06, base - h * 0.72);
  c.quadraticCurveTo(cx + w * 0.16, base - h * 0.35, cx + w * 0.5, base);
  c.lineTo(cx + w * 0.22, base);
  c.quadraticCurveTo(cx, base - h * 0.22, cx - w * 0.22, base);
  c.lineTo(cx - w * 0.5, base);
  c.quadraticCurveTo(cx - w * 0.16, base - h * 0.35, cx - w * 0.06, base - h * 0.72);
  c.closePath();
  fs(c, color, cx - w / 2, base - h, w, h, lw);
  c.lineWidth = lw * 0.6;
  c.strokeStyle = OUTLINE;
  c.beginPath();
  c.moveTo(cx - w * 0.24, base - h * 0.32); c.lineTo(cx + w * 0.24, base - h * 0.32);
  c.moveTo(cx - w * 0.1, base - h * 0.62); c.lineTo(cx + w * 0.1, base - h * 0.62);
  c.stroke();
}

function pieceBase(c: C, y = 84, w = 50, band: string = PAL.roseVif) {
  ellipse(c, 50, y, w / 2, 7);
  fs(c, PAL.ivory, 50 - w / 2, y - 7, w, 14);
  roundRect(c, 50 - w / 2 + 3, y - 14, w - 6, 9, 4);
  fs(c, band, 50 - w / 2, y - 14, w, 9, LW * 0.9);
}

function crownShape(c: C, cx: number, cy: number, s: number, gems = true) {
  c.save();
  c.translate(cx, cy);
  c.scale(s, s);
  c.beginPath();
  c.moveTo(-34, 16);
  c.lineTo(-40, -16);
  c.lineTo(-19, 2);
  c.lineTo(0, -26);
  c.lineTo(19, 2);
  c.lineTo(40, -16);
  c.lineTo(34, 16);
  c.quadraticCurveTo(0, 23, -34, 16);
  c.closePath();
  c.fillStyle = (() => { const g = c.createLinearGradient(0, -26, 0, 22); g.addColorStop(0, '#FFE9A8'); g.addColorStop(0.5, PAL.or); g.addColorStop(1, PAL.orDeep); return g; })();
  c.fill();
  c.lineWidth = LW / s; c.strokeStyle = OUTLINE; c.stroke();
  c.beginPath(); c.moveTo(-33, 10); c.quadraticCurveTo(0, 17, 33, 10);
  c.lineWidth = 1.6 / s; c.strokeStyle = shade(PAL.orDeep, -0.2); c.stroke();
  if (gems) {
    for (const [x, y, col] of [[0, 7, PAL.roseVif], [-21, 9, PAL.lavande], [21, 9, PAL.lavande]] as const) {
      heartPath(c, x, y, 10); c.fillStyle = col; c.fill(); c.lineWidth = 1.5 / s; c.strokeStyle = OUTLINE; c.stroke();
    }
  }
  for (const [x, y] of [[-40, -16], [0, -26], [40, -16]] as const) {
    c.beginPath(); c.arc(x, y, 4.2, 0, Math.PI * 2); c.fillStyle = '#FFF4D0'; c.fill(); c.lineWidth = 2 / s; c.strokeStyle = OUTLINE; c.stroke();
  }
  gloss(c, -16, -2, 8, 3, 0.6, -0.3);
  c.restore();
}

// ================================================================= FLEURS

const FLOWERS: ((c: C) => void)[] = [
  // 1 Graine
  (c) => {
    groundShadow(c, 50, 80, 20, 5);
    c.save(); c.translate(50, 56); c.rotate(0.45);
    ellipse(c, 0, 0, 15, 21);
    fs(c, '#B9814F', -15, -21, 30, 42);
    c.beginPath(); c.moveTo(0, -17); c.quadraticCurveTo(5, 0, 0, 17);
    c.lineWidth = 2; c.strokeStyle = 'rgba(90,55,30,0.55)'; c.stroke();
    gloss(c, -6, -9, 4, 7, 0.55, 0.1);
    c.restore();
    tube(c, () => { c.beginPath(); c.moveTo(58, 37); c.quadraticCurveTo(62, 26, 70, 27); }, 3.2, PAL.leaf);
    sparkles(c, [[26, 30, 4]]);
  },
  // 2 Pousse
  (c) => {
    groundShadow(c, 50, 86, 30, 5);
    stem(c, 50, 74, 50, 44, 3);
    leaf(c, 50, 48, 24, -2.55);
    leaf(c, 51, 46, 26, -0.55);
    soil(c);
  },
  // 3 Bourgeon
  (c) => {
    groundShadow(c, 50, 86, 30, 5);
    stem(c, 50, 74, 50, 34, -3);
    leaf(c, 49, 58, 22, -2.7);
    leaf(c, 51, 54, 22, -0.4);
    c.beginPath();
    c.moveTo(50, 12); c.bezierCurveTo(64, 20, 64, 36, 50, 38); c.bezierCurveTo(36, 36, 36, 20, 50, 12);
    c.closePath();
    fs(c, PAL.roseVif, 38, 12, 24, 26, LW, 0.4);
    c.beginPath(); c.moveTo(50, 15); c.quadraticCurveTo(46, 26, 50, 37); c.lineWidth = 1.6; c.strokeStyle = shade(PAL.roseDeep, -0.2); c.stroke();
    leaf(c, 50, 38, 12, -2.2, PAL.leafDeep);
    leaf(c, 50, 38, 12, -0.9, PAL.leafDeep);
    gloss(c, 45, 22, 2.5, 5, 0.6, 0.2);
    soil(c);
  },
  // 4 Fleur
  (c) => {
    groundShadow(c, 50, 89, 18, 4);
    stem(c, 50, 88, 50, 44, 4);
    leaf(c, 51, 70, 22, -0.5);
    leaf(c, 49, 76, 20, -2.6);
    flower(c, 50, 34, 26, PAL.roseVif, PAL.or, 5, 0.1);
  },
  // 5 Bouquet
  (c) => {
    groundShadow(c, 50, 90, 20, 4);
    leaf(c, 36, 50, 22, -2.4); leaf(c, 64, 50, 22, -0.75); leaf(c, 50, 44, 20, -1.57, PAL.leafDeep);
    flower(c, 33, 38, 17, PAL.lavande, PAL.or, 5, 0.3);
    flower(c, 67, 38, 17, PAL.peche, PAL.roseVif, 5, 0.6);
    flower(c, 50, 26, 19, PAL.roseVif, PAL.or, 5, 0);
    c.beginPath(); c.moveTo(26, 50); c.lineTo(74, 50); c.lineTo(54, 92); c.lineTo(46, 92); c.closePath();
    fs(c, PAL.creme, 26, 50, 48, 42);
    c.beginPath(); c.moveTo(50, 50); c.lineTo(50, 90); c.lineWidth = 1.6; c.strokeStyle = 'rgba(88,67,63,0.35)'; c.stroke();
    // nœud
    for (const s of [-1, 1]) { ellipse(c, 50 + s * 8, 66, 8, 5, s * 0.4); fs(c, PAL.roseDeep, 40, 60, 20, 12, LW * 0.8); }
    ellipse(c, 50, 66, 3.6, 3.6); fs(c, PAL.roseDeep, 46, 62, 8, 8, LW * 0.8);
  },
  // 6 Composition (vase)
  (c) => {
    groundShadow(c, 50, 91, 24, 5);
    leaf(c, 40, 46, 24, -2.6); leaf(c, 60, 46, 24, -0.55); leaf(c, 50, 40, 20, -1.9, PAL.leafDeep);
    flower(c, 28, 34, 14, PAL.lavande, PAL.or, 5, 0.2);
    flower(c, 72, 34, 14, PAL.peche, PAL.roseVif, 5, 0.5);
    flower(c, 40, 20, 14, PAL.rose, PAL.or, 5, 0.9);
    flower(c, 62, 18, 15, PAL.roseVif, PAL.or, 5, 0);
    flower(c, 50, 38, 12, '#FFFFFF', PAL.or, 6, 0.3);
    c.beginPath();
    c.moveTo(38, 50); c.lineTo(62, 50); c.quadraticCurveTo(60, 56, 66, 62);
    c.bezierCurveTo(78, 72, 72, 90, 50, 90); c.bezierCurveTo(28, 90, 22, 72, 34, 62); c.quadraticCurveTo(40, 56, 38, 50);
    c.closePath();
    fs(c, PAL.lavande, 26, 50, 48, 40);
    heartPath(c, 50, 74, 12); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill();
    gloss(c, 37, 70, 3, 7, 0.55, 0.3);
  },
  // 7 Jardin
  (c) => {
    groundShadow(c, 50, 88, 40, 6);
    ellipse(c, 50, 76, 42, 14); fs(c, '#9ED69B', 8, 62, 84, 28);
    ellipse(c, 30, 56, 17, 17); fs(c, PAL.leafDeep, 13, 39, 34, 34);
    ellipse(c, 70, 58, 15, 15); fs(c, PAL.leafDeep, 55, 43, 30, 30);
    ellipse(c, 50, 50, 15, 16); fs(c, PAL.leaf, 35, 34, 30, 32);
    for (const [x, y, col] of [[24, 50, PAL.roseVif], [36, 60, PAL.peche], [50, 44, '#FFFFFF'], [58, 56, PAL.roseVif], [74, 54, PAL.lavande], [66, 66, '#FFFFFF']] as const) {
      flower(c, x, y, 7, col, PAL.or, 5, x);
    }
    // petite barrière
    for (let i = 0; i < 6; i++) {
      const x = 24 + i * 10.4;
      c.beginPath(); c.moveTo(x - 3, 88); c.lineTo(x - 3, 78); c.lineTo(x, 74); c.lineTo(x + 3, 78); c.lineTo(x + 3, 88); c.closePath();
      fs(c, '#FFFFFF', x - 3, 74, 6, 14, LW * 0.7);
    }
    roundRect(c, 20, 80, 60, 3.4, 1.5); fs(c, '#FFFFFF', 20, 80, 60, 3.4, LW * 0.6);
  },
  // 8 Jardin enchanté (arche)
  (c) => {
    glow(c, 50, 54, 46, PAL.lavande, 0.55);
    groundShadow(c, 50, 90, 38, 5);
    c.beginPath(); c.moveTo(38, 90); c.quadraticCurveTo(50, 70, 62, 90); c.closePath(); c.fillStyle = PAL.creme; c.fill();
    tube(c, () => { c.beginPath(); c.moveTo(22, 90); c.lineTo(22, 52); c.arc(50, 52, 28, Math.PI, 0); c.lineTo(78, 90); }, 9, PAL.leafDeep);
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      leaf(c, 50 + Math.cos(a) * 28, 52 + Math.sin(a) * 28, 10, a + 0.8 * (i % 2 ? 1 : -1));
    }
    const cols = [PAL.roseVif, '#FFFFFF', PAL.peche, PAL.roseVif, PAL.lavande, '#FFFFFF', PAL.roseVif];
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + ((i + 0.5) / 7) * Math.PI;
      flower(c, 50 + Math.cos(a) * 28, 52 + Math.sin(a) * 28, 8, cols[i], PAL.or, 5, i);
    }
    flower(c, 22, 72, 7, PAL.rose, PAL.or); flower(c, 78, 70, 7, PAL.rose, PAL.or);
    sparkles(c, [[50, 60, 6], [36, 74, 3.5], [64, 42, 3.5], [12, 30, 3]], '#FFF6D6');
  },
  // 9 Fleur légendaire
  (c) => {
    glow(c, 50, 50, 48, PAL.or, 0.55);
    groundShadow(c, 50, 90, 22, 4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      c.save(); c.translate(50, 50); c.rotate(a);
      c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(14, -18, 38, 0); c.quadraticCurveTo(14, 18, 0, 6); c.closePath();
      fs(c, i % 2 ? PAL.lavande : PAL.roseVif, 0, -18, 38, 36, LW * 0.9, 0.45);
      c.restore();
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ellipse(c, 50 + Math.cos(a) * 12, 50 + Math.sin(a) * 12, 12, 7, a);
      fs(c, PAL.peche, 30, 30, 40, 40, LW * 0.8, 0.5);
    }
    c.beginPath(); c.arc(50, 50, 9, 0, Math.PI * 2);
    fs(c, PAL.or, 41, 41, 18, 18);
    for (let i = 0; i < 6; i++) { const a = i; c.beginPath(); c.arc(50 + Math.cos(a) * 4.5, 50 + Math.sin(a) * 4.5, 1.3, 0, 7); c.fillStyle = PAL.orDeep; c.fill(); }
    gloss(c, 47, 46, 3, 2, 0.8);
    sparkles(c, [[14, 22, 5], [86, 24, 4], [84, 78, 5], [16, 74, 3.5]], '#FFF6D6');
  },
  // 10 Rose éternelle (sous cloche)
  (c) => {
    glow(c, 50, 46, 46, PAL.roseVif, 0.4);
    groundShadow(c, 50, 92, 30, 5);
    stem(c, 50, 82, 50, 46, 2, 3.6);
    leaf(c, 50, 66, 14, -0.5); leaf(c, 50, 70, 13, -2.6);
    // rose
    c.beginPath(); c.arc(50, 38, 14, 0, Math.PI * 2);
    fs(c, '#E8485F', 36, 24, 28, 28, LW, 0.35);
    c.lineWidth = 1.8; c.strokeStyle = '#9E2238';
    c.beginPath(); c.arc(50, 37, 8, 3.6, 6.8); c.stroke();
    c.beginPath(); c.arc(48, 39, 4, 0.2, 3.6); c.stroke();
    c.beginPath(); c.moveTo(37, 42); c.quadraticCurveTo(50, 54, 63, 42); c.stroke();
    gloss(c, 44, 31, 3, 2, 0.6);
    // petit pétale tombé
    ellipse(c, 64, 80, 4, 2.4, 0.5); fs(c, '#E8485F', 60, 77, 8, 6, LW * 0.6);
    // cloche de verre
    c.beginPath(); c.moveTo(26, 84); c.lineTo(26, 36); c.bezierCurveTo(26, 6, 74, 6, 74, 36); c.lineTo(74, 84);
    c.fillStyle = 'rgba(225,235,255,0.28)'; c.fill(); ol(c);
    c.beginPath(); c.arc(50, 9, 3.5, 0, 7); fs(c, PAL.or, 46, 5, 8, 8, LW * 0.7);
    c.beginPath(); c.moveTo(32, 70); c.lineTo(32, 38); c.quadraticCurveTo(32, 20, 44, 14);
    c.lineWidth = 3.4; c.strokeStyle = 'rgba(255,255,255,0.75)'; c.stroke();
    // socle doré
    roundRect(c, 20, 82, 60, 10, 5); fs(c, PAL.or, 20, 82, 60, 10);
    sparkles(c, [[84, 22, 5], [14, 48, 4], [70, 16, 3]], '#FFF6D6');
  },
];

// ================================================================= AMOUR

const LOVE: ((c: C) => void)[] = [
  // 1 Étincelle
  (c) => {
    glow(c, 50, 50, 34, PAL.roseVif, 0.45);
    starPath(c, 50, 50, 28, 9, 4, -Math.PI / 2);
    fs(c, PAL.rose, 22, 22, 56, 56, LW, 0.5);
    gloss(c, 44, 40, 3, 6, 0.75, 0.2);
    sparkles(c, [[76, 28, 5], [26, 74, 4], [74, 72, 3]], '#FFFFFF');
  },
  // 2 Petit cœur
  (c) => {
    groundShadow(c, 50, 84, 22, 4);
    heartPath(c, 50, 52, 54);
    fs(c, PAL.roseVif, 23, 26, 54, 52);
    gloss(c, 37, 40, 6, 4, 0.75, -0.6);
  },
  // 3 Mot doux (bulle)
  (c) => {
    groundShadow(c, 50, 88, 26, 4);
    c.beginPath();
    roundRect(c, 12, 16, 76, 54, 24);
    fs(c, PAL.creme, 12, 16, 76, 58);
    c.beginPath(); c.moveTo(28, 66); c.lineTo(22, 86); c.lineTo(44, 69); c.closePath();
    c.fillStyle = shade(PAL.creme, -0.04); c.fill(); ol(c);
    c.beginPath(); c.moveTo(29, 68); c.lineTo(42, 68); c.lineWidth = LW + 1; c.strokeStyle = shade(PAL.creme, -0.04); c.stroke();
    heartPath(c, 50, 43, 28); fs(c, PAL.roseVif, 36, 29, 28, 28);
    gloss(c, 44, 37, 3, 2, 0.7);
    gloss(c, 24, 26, 6, 3, 0.7, -0.3);
  },
  // 4 Lettre
  (c) => {
    groundShadow(c, 50, 90, 26, 4);
    c.save(); c.translate(50, 50); c.rotate(-0.12);
    c.beginPath(); c.moveTo(-26, -36); c.lineTo(16, -36); c.lineTo(26, -26); c.lineTo(26, 36); c.lineTo(-26, 36); c.closePath();
    fs(c, '#FFFDF8', -26, -36, 52, 72);
    c.beginPath(); c.moveTo(16, -36); c.lineTo(16, -26); c.lineTo(26, -26); c.closePath(); c.fillStyle = '#EADFD2'; c.fill(); ol(c, LW * 0.8);
    c.lineWidth = 2.6; c.strokeStyle = PAL.lavande;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-18, -18 + i * 11); c.quadraticCurveTo(-4, -21 + i * 11, 18 - (i === 3 ? 18 : 0), -18 + i * 11); c.stroke(); }
    heartPath(c, 13, 24, 13); fs(c, PAL.roseVif, 6, 17, 14, 14, LW * 0.8);
    c.restore();
  },
  // 5 Enveloppe
  (c) => {
    groundShadow(c, 50, 84, 34, 5);
    roundRect(c, 12, 28, 76, 50, 6);
    fs(c, PAL.rose, 12, 28, 76, 50);
    c.beginPath(); c.moveTo(14, 76); c.lineTo(42, 52); c.moveTo(86, 76); c.lineTo(58, 52); ol(c, 2.2);
    c.beginPath(); c.moveTo(13, 30); c.lineTo(50, 60); c.lineTo(87, 30); c.closePath();
    fs(c, '#F9CFDC', 13, 30, 74, 30);
    // sceau en cire
    c.beginPath();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const r = i % 2 ? 11 : 12.5; c.lineTo(50 + Math.cos(a) * r, 58 + Math.sin(a) * r); }
    c.closePath(); fs(c, '#D8344F', 38, 46, 24, 24);
    heartPath(c, 50, 58, 11); c.fillStyle = shade('#D8344F', -0.3); c.fill();
    gloss(c, 45, 53, 3, 2, 0.6);
  },
  // 6 Cadeau
  (c) => {
    groundShadow(c, 50, 90, 32, 5);
    roundRect(c, 20, 46, 60, 42, 5); fs(c, PAL.roseVif, 20, 46, 60, 42);
    roundRect(c, 15, 34, 70, 15, 5); fs(c, PAL.roseVif, 15, 34, 70, 15, LW, 0.4);
    c.beginPath(); c.rect(44, 49, 12, 39); fs(c, PAL.or, 44, 49, 12, 39, LW * 0.8);
    c.beginPath(); c.rect(43, 34, 14, 15); fs(c, PAL.or, 43, 34, 14, 15, LW * 0.8);
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(50, 33); c.bezierCurveTo(50 + s * 6, 14, 50 + s * 26, 16, 50 + s * 20, 30); c.closePath();
      fs(c, PAL.or, 30, 14, 40, 20, LW * 0.9);
    }
    ellipse(c, 50, 32, 5, 4); fs(c, PAL.orDeep, 45, 28, 10, 8, LW * 0.8);
    gloss(c, 26, 52, 3, 6, 0.5, 0.2);
  },
  // 7 Coffret à bijoux
  (c) => {
    groundShadow(c, 50, 90, 34, 5);
    // couvercle ouvert
    c.beginPath(); c.moveTo(20, 50); c.lineTo(26, 20); c.quadraticCurveTo(50, 12, 74, 20); c.lineTo(80, 50); c.closePath();
    fs(c, PAL.lavande, 20, 14, 60, 36);
    c.beginPath(); c.moveTo(25, 47); c.lineTo(29, 25); c.quadraticCurveTo(50, 19, 71, 25); c.lineTo(75, 47); c.closePath();
    c.fillStyle = '#E86A9A'; c.fill();
    // perle
    c.beginPath(); c.arc(50, 48, 7, 0, 7); fs(c, '#FFFDF8', 43, 41, 14, 14, LW * 0.8); gloss(c, 47, 45, 2, 1.5, 0.9);
    roundRect(c, 16, 50, 68, 36, 6); fs(c, PAL.lavande, 16, 50, 68, 36);
    c.beginPath(); c.moveTo(18, 56); c.lineTo(82, 56); c.lineWidth = 3; c.strokeStyle = PAL.or; c.stroke();
    roundRect(c, 44, 58, 12, 12, 3); fs(c, PAL.or, 44, 58, 12, 12, LW * 0.8);
    heartPath(c, 50, 64, 6); c.fillStyle = PAL.roseDeep; c.fill();
    gloss(c, 24, 66, 3, 6, 0.5, 0.2);
  },
  // 8 Bijou (bague)
  (c) => {
    glow(c, 50, 40, 40, PAL.rose, 0.5);
    groundShadow(c, 50, 90, 24, 4);
    c.beginPath(); c.ellipse(50, 64, 25, 21, 0, 0, Math.PI * 2); c.ellipse(50, 64, 18, 14.5, 0, 0, Math.PI * 2, true);
    const g = c.createLinearGradient(25, 43, 75, 85); g.addColorStop(0, '#FFE9A8'); g.addColorStop(0.5, PAL.or); g.addColorStop(1, PAL.orDeep);
    c.fillStyle = g; c.fill('evenodd'); ol(c);
    c.beginPath(); c.moveTo(42, 44); c.lineTo(58, 44); c.lineTo(56, 50); c.lineTo(44, 50); c.closePath(); fs(c, PAL.or, 42, 44, 16, 6, LW * 0.8);
    // diamant
    c.beginPath(); c.moveTo(36, 30); c.lineTo(44, 20); c.lineTo(56, 20); c.lineTo(64, 30); c.lineTo(50, 46); c.closePath();
    fs(c, '#FF8DB8', 36, 20, 28, 26, LW, 0.5);
    c.beginPath(); c.moveTo(36, 30); c.lineTo(64, 30); c.moveTo(44, 20); c.lineTo(47, 30); c.lineTo(50, 46); c.moveTo(56, 20); c.lineTo(53, 30); c.lineTo(50, 46);
    c.lineWidth = 1.4; c.strokeStyle = 'rgba(120,30,70,0.6)'; c.stroke();
    gloss(c, 44, 25, 3, 2, 0.85);
    sparkles(c, [[72, 18, 6], [26, 22, 4], [78, 54, 3.5]]);
  },
  // 9 Cœur précieux (gemme)
  (c) => {
    glow(c, 50, 50, 46, PAL.roseVif, 0.5);
    groundShadow(c, 50, 90, 24, 4);
    heartPath(c, 50, 52, 64);
    fs(c, '#E8386C', 18, 20, 64, 62, LW, 0.35);
    c.save(); heartPath(c, 50, 52, 64); c.clip();
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(255,255,255,0.45)';
    c.beginPath();
    c.moveTo(50, 37); c.lineTo(36, 52); c.lineTo(50, 82); c.lineTo(64, 52); c.closePath();
    c.moveTo(36, 52); c.lineTo(18, 42); c.moveTo(64, 52); c.lineTo(82, 42); c.moveTo(36, 52); c.lineTo(32, 26); c.moveTo(64, 52); c.lineTo(68, 26);
    c.stroke();
    c.beginPath(); c.moveTo(50, 37); c.lineTo(36, 52); c.lineTo(50, 82); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fill();
    c.restore();
    gloss(c, 32, 36, 7, 4, 0.8, -0.6);
    sparkles(c, [[82, 20, 6], [16, 70, 4], [84, 70, 3.5]]);
  },
  // 10 Trésor du cœur (coffre)
  (c) => {
    glow(c, 50, 46, 50, PAL.or, 0.6);
    groundShadow(c, 50, 92, 38, 5);
    // couvercle ouvert
    c.beginPath(); c.moveTo(16, 46); c.lineTo(20, 22); c.quadraticCurveTo(50, 8, 80, 22); c.lineTo(84, 46); c.closePath();
    fs(c, '#B0703F', 16, 10, 68, 36);
    c.beginPath(); c.moveTo(48, 12); c.lineTo(52, 12); c.lineTo(54, 46); c.lineTo(46, 46); c.closePath(); fs(c, PAL.or, 46, 12, 8, 34, LW * 0.7);
    // contenu
    for (const [x, y] of [[30, 48], [40, 44], [60, 45], [70, 48], [50, 47]] as const) { c.beginPath(); c.arc(x, y, 6, 0, 7); fs(c, PAL.or, x - 6, y - 6, 12, 12, LW * 0.7); }
    heartPath(c, 40, 38, 16); fs(c, PAL.roseVif, 32, 30, 16, 16, LW * 0.8);
    heartPath(c, 62, 36, 13); fs(c, PAL.lavande, 55, 30, 13, 13, LW * 0.8);
    c.beginPath(); c.moveTo(50, 28); c.lineTo(55, 36); c.lineTo(50, 44); c.lineTo(45, 36); c.closePath(); fs(c, '#7FD3E8', 45, 28, 10, 16, LW * 0.7);
    // corps
    roundRect(c, 14, 50, 72, 38, 6); fs(c, '#A0623A', 14, 50, 72, 38);
    for (const x of [24, 76]) { c.beginPath(); c.rect(x - 4, 50, 8, 38); fs(c, PAL.or, x - 4, 50, 8, 38, LW * 0.7); }
    roundRect(c, 42, 56, 16, 16, 4); fs(c, PAL.or, 42, 56, 16, 16, LW * 0.8);
    heartPath(c, 50, 64, 8); c.fillStyle = PAL.roseDeep; c.fill();
    sparkles(c, [[86, 18, 6], [12, 24, 5], [90, 60, 3.5]], '#FFF6D6');
  },
];

// ================================================================= PARIS

const PARIS: ((c: C) => void)[] = [
  // 1 Ticket
  (c) => {
    groundShadow(c, 50, 80, 30, 4);
    c.save(); c.translate(50, 52); c.rotate(-0.22);
    roundRect(c, -32, -17, 64, 34, 4); fs(c, PAL.creme, -32, -17, 64, 34);
    c.beginPath(); c.rect(-32, 7, 64, 6); c.fillStyle = PAL.lavande; c.fill();
    roundRect(c, -32, -17, 64, 34, 4); ol(c);
    c.beginPath(); c.arc(20, -6, 4, 0, 7); c.fillStyle = shade(PAL.rose, 0.3); c.fill(); ol(c, 1.8);
    c.lineWidth = 2.4; c.strokeStyle = PAL.nuit;
    c.beginPath(); c.moveTo(-24, -7); c.lineTo(4, -7); c.moveTo(-24, 0); c.lineTo(-4, 0); c.stroke();
    c.restore();
  },
  // 2 Café
  (c) => {
    groundShadow(c, 50, 86, 34, 5);
    tube(c, () => { c.beginPath(); c.moveTo(70, 52); c.bezierCurveTo(86, 50, 86, 70, 66, 68); }, 4.5, '#FFFFFF');
    ellipse(c, 50, 79, 34, 8); fs(c, PAL.creme, 16, 71, 68, 16);
    c.beginPath(); c.moveTo(26, 46); c.lineTo(74, 46); c.bezierCurveTo(74, 68, 66, 80, 50, 80); c.bezierCurveTo(34, 80, 26, 68, 26, 46); c.closePath();
    fs(c, '#FFFFFF', 26, 46, 48, 34);
    c.beginPath(); c.moveTo(29, 60); c.quadraticCurveTo(50, 66, 71, 60); c.lineWidth = 3; c.strokeStyle = PAL.roseVif; c.stroke();
    ellipse(c, 50, 46, 24, 6); fs(c, '#7A4A30', 26, 40, 48, 12);
    heartPath(c, 50, 46, 9); c.fillStyle = '#E8C9A8'; c.fill();
    gloss(c, 33, 58, 3, 7, 0.5, 0.2);
    // vapeur
    c.lineWidth = 3.2; c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.beginPath(); c.moveTo(42, 36); c.bezierCurveTo(36, 28, 48, 24, 42, 14); c.moveTo(58, 36); c.bezierCurveTo(52, 28, 64, 24, 58, 14); c.stroke();
    c.lineWidth = 1.4; c.strokeStyle = 'rgba(88,67,63,0.35)';
    c.beginPath(); c.moveTo(44, 36); c.bezierCurveTo(38, 28, 50, 24, 44, 14); c.stroke();
  },
  // 3 Photo (polaroïd)
  (c) => {
    groundShadow(c, 50, 88, 28, 4);
    c.save(); c.translate(50, 50); c.rotate(0.1);
    roundRect(c, -28, -34, 56, 68, 3); fs(c, '#FFFFFF', -28, -34, 56, 68);
    c.beginPath(); c.rect(-22, -28, 44, 44);
    const g = c.createLinearGradient(0, -28, 0, 16); g.addColorStop(0, '#FFC9D9'); g.addColorStop(1, PAL.lavande);
    c.fillStyle = g; c.fill(); ol(c, 1.8);
    c.beginPath(); c.arc(10, -14, 5, 0, 7); c.fillStyle = '#FFE7A0'; c.fill();
    eiffel(c, -6, 16, 34, PAL.nuit, 1.6);
    c.beginPath(); c.rect(-22, 10, 44, 6); c.fillStyle = 'rgba(81,68,109,0.5)'; c.fill();
    c.restore();
    c.save(); c.translate(50, 15); c.rotate(-0.15);
    c.beginPath(); c.rect(-10, -4, 20, 8); c.fillStyle = 'rgba(243,200,107,0.85)'; c.fill(); ol(c, 1.5);
    c.restore();
  },
  // 4 Souvenir (boule à neige)
  (c) => {
    groundShadow(c, 50, 92, 26, 4);
    c.beginPath(); c.moveTo(28, 74); c.lineTo(72, 74); c.lineTo(78, 90); c.lineTo(22, 90); c.closePath();
    fs(c, PAL.roseVif, 22, 74, 56, 16);
    c.beginPath(); c.arc(50, 46, 30, 0, Math.PI * 2);
    const g = c.createRadialGradient(42, 36, 4, 50, 46, 30); g.addColorStop(0, 'rgba(235,240,255,0.95)'); g.addColorStop(1, 'rgba(185,165,232,0.75)');
    c.fillStyle = g; c.fill();
    c.save(); c.beginPath(); c.arc(50, 46, 30, 0, Math.PI * 2); c.clip();
    ellipse(c, 50, 74, 30, 8); c.fillStyle = '#FFFFFF'; c.fill();
    eiffel(c, 50, 70, 44, PAL.nuit, 2.2);
    const rnd = [[30, 30], [62, 26], [70, 48], [36, 54], [44, 22], [66, 62], [28, 44]];
    for (const [x, y] of rnd) { c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fillStyle = '#FFFFFF'; c.fill(); }
    c.restore();
    c.beginPath(); c.arc(50, 46, 30, 0, Math.PI * 2); ol(c);
    gloss(c, 36, 30, 7, 4, 0.75, -0.7);
  },
  // 5 Carte postale
  (c) => {
    groundShadow(c, 50, 84, 36, 5);
    c.save(); c.translate(50, 52); c.rotate(-0.08);
    roundRect(c, -40, -27, 80, 54, 4); fs(c, PAL.creme, -40, -27, 80, 54);
    c.beginPath(); c.rect(-34, -21, 34, 42);
    const g = c.createLinearGradient(0, -21, 0, 21); g.addColorStop(0, '#FFC0A3'); g.addColorStop(1, PAL.roseVif);
    c.fillStyle = g; c.fill(); ol(c, 1.6);
    eiffel(c, -17, 21, 36, PAL.nuit, 1.5);
    c.beginPath(); c.moveTo(4, -22); c.lineTo(4, 22); c.lineWidth = 1.4; c.strokeStyle = 'rgba(88,67,63,0.4)'; c.stroke();
    c.lineWidth = 2; c.strokeStyle = PAL.lavande;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(9, 2 + i * 7); c.lineTo(34, 2 + i * 7); c.stroke(); }
    roundRect(c, 20, -21, 14, 16, 1.5); fs(c, PAL.roseVif, 20, -21, 14, 16, 1.6);
    heartPath(c, 27, -13, 7); c.fillStyle = '#FFFFFF'; c.fill();
    c.restore();
  },
  // 6 Album
  (c) => {
    groundShadow(c, 50, 90, 32, 5);
    c.beginPath(); c.moveTo(24, 18); c.lineTo(80, 18); c.lineTo(84, 22); c.lineTo(84, 88); c.lineTo(28, 88); c.closePath();
    fs(c, PAL.creme, 24, 18, 60, 70);
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(88,67,63,0.35)';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(80 + i * 1.3, 21 + i); c.lineTo(80 + i * 1.3, 85); c.stroke(); }
    roundRect(c, 16, 14, 62, 70, 5); fs(c, PAL.lavande, 16, 14, 62, 70);
    c.beginPath(); c.rect(16, 14, 11, 70); c.fillStyle = shade(PAL.lavande, -0.25); c.fill();
    roundRect(c, 16, 14, 62, 70, 5); ol(c);
    c.save(); c.translate(52, 46); c.rotate(-0.08);
    roundRect(c, -15, -16, 30, 32, 2); fs(c, '#FFFFFF', -15, -16, 30, 32, 2);
    c.beginPath(); c.rect(-11, -12, 22, 20); c.fillStyle = '#FFC9D9'; c.fill();
    heartPath(c, 0, -2, 12); c.fillStyle = PAL.roseVif; c.fill();
    c.restore();
    c.lineWidth = 2.6; c.strokeStyle = PAL.or;
    c.beginPath(); c.moveTo(34, 74); c.lineTo(70, 74); c.stroke();
    gloss(c, 33, 22, 6, 2.5, 0.5, 0);
  },
  // 7 Cadre doré
  (c) => {
    groundShadow(c, 50, 90, 32, 5);
    roundRect(c, 14, 12, 72, 76, 6); fs(c, PAL.or, 14, 12, 72, 76);
    roundRect(c, 21, 19, 58, 62, 4); c.lineWidth = 2; c.strokeStyle = PAL.orDeep; c.stroke();
    c.beginPath(); c.rect(27, 25, 46, 50);
    const g = c.createLinearGradient(0, 25, 0, 75); g.addColorStop(0, '#FFD9E5'); g.addColorStop(1, PAL.lavande);
    c.fillStyle = g; c.fill(); ol(c, 2);
    // deux silhouettes et un cœur
    for (const [x, col, hx] of [[41, '#6B5A8C', 43], [59, '#3B3152', 57]] as const) {
      c.fillStyle = col;
      c.beginPath(); c.moveTo(x - 11, 75); c.quadraticCurveTo(x - 10, 58, x, 58); c.quadraticCurveTo(x + 10, 58, x + 11, 75); c.closePath(); c.fill();
      c.beginPath(); c.arc(hx, 52, 5, 0, 7); c.fill();
    }
    heartPath(c, 50, 36, 12); c.fillStyle = PAL.roseVif; c.fill();
    for (const [x, y] of [[14, 12], [86, 12], [14, 88], [86, 88]] as const) { c.beginPath(); c.arc(x, y, 5, 0, 7); fs(c, PAL.or, x - 5, y - 5, 10, 10, LW * 0.8); }
    gloss(c, 22, 16, 6, 2, 0.6, 0);
  },
  // 8 Lumière de Paris (réverbère)
  (c) => {
    glow(c, 50, 30, 36, PAL.or, 0.7);
    groundShadow(c, 50, 92, 18, 4);
    tube(c, () => { c.beginPath(); c.moveTo(50, 88); c.lineTo(50, 44); }, 5, PAL.nuit);
    tube(c, () => { c.beginPath(); c.moveTo(41, 56); c.lineTo(59, 56); }, 2.4, PAL.nuit);
    for (const x of [41, 59]) { c.beginPath(); c.arc(x, 56, 2.6, 0, 7); fs(c, PAL.or, x - 2.6, 53.4, 5.2, 5.2, LW * 0.6); }
    c.beginPath(); c.moveTo(40, 92); c.lineTo(44, 82); c.lineTo(56, 82); c.lineTo(60, 92); c.closePath(); fs(c, PAL.nuit, 40, 82, 20, 10);
    // lanterne
    c.beginPath(); c.moveTo(38, 22); c.lineTo(62, 22); c.lineTo(58, 44); c.lineTo(42, 44); c.closePath();
    const g = c.createRadialGradient(50, 32, 2, 50, 32, 16); g.addColorStop(0, '#FFFBE0'); g.addColorStop(1, PAL.or);
    c.fillStyle = g; c.fill(); ol(c);
    c.beginPath(); c.moveTo(50, 22); c.lineTo(50, 44); c.lineWidth = 1.6; c.strokeStyle = OUTLINE; c.stroke();
    c.beginPath(); c.moveTo(34, 23); c.lineTo(50, 10); c.lineTo(66, 23); c.closePath(); fs(c, PAL.nuit, 34, 10, 32, 13);
    c.beginPath(); c.arc(50, 8, 3, 0, 7); fs(c, PAL.nuit, 47, 5, 6, 6, LW * 0.7);
    roundRect(c, 40, 43, 20, 5, 2); fs(c, PAL.nuit, 40, 43, 20, 5, LW * 0.7);
    sparkles(c, [[74, 22, 4], [24, 36, 3.5]], '#FFF6D6');
  },
  // 9 Souvenir doré (Arc de Triomphe miniature)
  (c) => {
    glow(c, 50, 50, 44, PAL.or, 0.55);
    groundShadow(c, 50, 90, 36, 5);
    roundRect(c, 14, 80, 72, 9, 3); fs(c, PAL.orDeep, 14, 80, 72, 9);
    c.beginPath(); c.rect(18, 26, 64, 54);
    fs(c, PAL.or, 18, 26, 64, 54, LW, 0.45);
    c.beginPath(); c.rect(15, 18, 70, 12); fs(c, PAL.or, 15, 18, 70, 12, LW, 0.5);
    c.beginPath(); c.moveTo(38, 80); c.lineTo(38, 52); c.arc(50, 52, 12, Math.PI, 0); c.lineTo(62, 80); c.closePath();
    c.fillStyle = '#7A5A2C'; c.fill(); ol(c);
    c.lineWidth = 1.6; c.strokeStyle = shade(PAL.orDeep, -0.2);
    c.beginPath(); c.moveTo(18, 36); c.lineTo(82, 36); c.moveTo(24, 46); c.lineTo(32, 46); c.moveTo(68, 46); c.lineTo(76, 46); c.stroke();
    c.beginPath(); c.rect(22, 50, 12, 18); c.rect(66, 50, 12, 18); c.stroke();
    gloss(c, 24, 30, 6, 2.5, 0.6, 0);
    sparkles(c, [[86, 16, 5], [12, 48, 4], [88, 62, 3.5]], '#FFFFFF');
  },
  // 10 Paris enchanté
  (c) => {
    glow(c, 50, 50, 50, PAL.lavande, 0.75);
    glow(c, 50, 54, 30, PAL.roseVif, 0.4);
    groundShadow(c, 50, 92, 26, 4);
    // lune
    c.beginPath(); c.arc(76, 22, 11, 0, Math.PI * 2); c.arc(81, 18, 9, 0, Math.PI * 2, true);
    c.fillStyle = '#FFF1B8'; c.fill('evenodd'); c.lineWidth = 2; c.strokeStyle = OUTLINE; c.stroke();
    eiffel(c, 46, 90, 80, '#FF8DB8');
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(255,240,200,0.9)';
    c.beginPath(); c.moveTo(46, 14); c.lineTo(46, 22); c.stroke();
    heartPath(c, 46, 10, 12); fs(c, PAL.or, 40, 4, 12, 12, LW * 0.8);
    for (const [x, y] of [[36, 46], [56, 46], [40, 66], [52, 66], [46, 30]] as const) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fillStyle = '#FFF6D6'; c.fill(); }
    sparkles(c, [[16, 24, 5], [22, 56, 4], [84, 56, 5], [72, 80, 3.5]], '#FFF6D6');
  },
];

// ================================================================= ÉCHECS

function pawnBody(c: C, color: string) {
  c.beginPath();
  c.moveTo(34, 72); c.quadraticCurveTo(40, 54, 44, 46); c.lineTo(56, 46); c.quadraticCurveTo(60, 54, 66, 72); c.closePath();
  fs(c, color, 34, 46, 32, 26);
  ellipse(c, 50, 46, 13, 4.5); fs(c, color, 37, 41, 26, 9, LW * 0.9);
  c.beginPath(); c.arc(50, 33, 12, 0, Math.PI * 2); fs(c, color, 38, 21, 24, 24);
  gloss(c, 45, 28, 3.5, 2.5, 0.8);
}

const CHESS: ((c: C) => void)[] = [
  // 1 Pion
  (c) => { groundShadow(c, 50, 90, 26, 4); pawnBody(c, PAL.ivory); pieceBase(c, 82, 46); },
  // 2 Cavalier
  (c) => {
    groundShadow(c, 50, 90, 28, 4);
    c.beginPath();
    c.moveTo(34, 74); c.quadraticCurveTo(34, 56, 42, 46);
    c.quadraticCurveTo(30, 52, 24, 48); c.quadraticCurveTo(20, 40, 28, 34);
    c.quadraticCurveTo(38, 22, 46, 16); c.lineTo(50, 8); c.lineTo(54, 16);
    c.quadraticCurveTo(70, 22, 68, 46); c.quadraticCurveTo(68, 62, 66, 74); c.closePath();
    fs(c, PAL.ivory, 20, 8, 50, 66);
    // crinière
    c.beginPath(); c.moveTo(54, 16); c.quadraticCurveTo(72, 24, 70, 48); c.quadraticCurveTo(70, 62, 66, 74); c.lineTo(62, 74);
    c.quadraticCurveTo(66, 50, 60, 36); c.quadraticCurveTo(58, 24, 54, 16); c.closePath();
    fs(c, PAL.roseVif, 54, 16, 18, 58, LW * 0.8);
    c.beginPath(); c.arc(42, 30, 2.6, 0, 7); c.fillStyle = OUTLINE; c.fill();
    c.beginPath(); c.arc(27, 42, 1.6, 0, 7); c.fill();
    gloss(c, 38, 26, 3, 6, 0.6, 0.6);
    pieceBase(c, 82, 50);
  },
  // 3 Fou
  (c) => {
    groundShadow(c, 50, 90, 26, 4);
    c.beginPath(); c.moveTo(36, 72); c.quadraticCurveTo(40, 60, 44, 56); c.lineTo(56, 56); c.quadraticCurveTo(60, 60, 64, 72); c.closePath();
    fs(c, PAL.ivory, 36, 56, 28, 16);
    ellipse(c, 50, 55, 12, 4); fs(c, PAL.roseVif, 38, 51, 24, 8, LW * 0.8);
    c.beginPath(); c.moveTo(50, 14); c.bezierCurveTo(66, 26, 64, 46, 50, 52); c.bezierCurveTo(36, 46, 34, 26, 50, 14); c.closePath();
    fs(c, PAL.ivory, 36, 14, 28, 38);
    c.beginPath(); c.moveTo(54, 24); c.lineTo(46, 36); c.lineWidth = 2.6; c.strokeStyle = OUTLINE; c.stroke();
    c.beginPath(); c.arc(50, 12, 4, 0, 7); fs(c, PAL.ivory, 46, 8, 8, 8, LW * 0.8);
    gloss(c, 44, 28, 2.5, 5, 0.7, 0.3);
    pieceBase(c, 82, 46);
  },
  // 4 Tour
  (c) => {
    groundShadow(c, 50, 90, 28, 4);
    c.beginPath(); c.moveTo(34, 72); c.lineTo(38, 36); c.lineTo(62, 36); c.lineTo(66, 72); c.closePath();
    fs(c, PAL.ivory, 34, 36, 32, 36);
    c.beginPath();
    c.moveTo(30, 36); c.lineTo(30, 18); c.lineTo(38, 18); c.lineTo(38, 24); c.lineTo(46, 24); c.lineTo(46, 18); c.lineTo(54, 18);
    c.lineTo(54, 24); c.lineTo(62, 24); c.lineTo(62, 18); c.lineTo(70, 18); c.lineTo(70, 36); c.closePath();
    fs(c, PAL.ivory, 30, 18, 40, 18);
    c.beginPath(); c.rect(36, 50, 28, 4); c.fillStyle = PAL.roseVif; c.fill();
    c.beginPath(); c.moveTo(46, 72); c.lineTo(46, 62); c.arc(50, 62, 4, Math.PI, 0); c.lineTo(54, 72); c.fillStyle = 'rgba(88,67,63,0.3)'; c.fill();
    gloss(c, 42, 42, 2.5, 6, 0.6, 0.1);
    pieceBase(c, 82, 52);
  },
  // 5 Dame
  (c) => {
    groundShadow(c, 50, 90, 28, 4);
    c.beginPath(); c.moveTo(34, 72); c.quadraticCurveTo(42, 50, 40, 32); c.lineTo(60, 32); c.quadraticCurveTo(58, 50, 66, 72); c.closePath();
    fs(c, PAL.ivory, 34, 32, 32, 40);
    ellipse(c, 50, 54, 11, 3.5); fs(c, PAL.roseVif, 39, 51, 22, 7, LW * 0.7);
    c.beginPath();
    c.moveTo(36, 34); c.lineTo(32, 16); c.lineTo(41, 26); c.lineTo(45, 12); c.lineTo(50, 24); c.lineTo(55, 12); c.lineTo(59, 26); c.lineTo(68, 16); c.lineTo(64, 34); c.closePath();
    fs(c, PAL.ivory, 32, 12, 36, 22);
    for (const [x, y] of [[32, 16], [45, 12], [55, 12], [68, 16]] as const) { c.beginPath(); c.arc(x, y, 3, 0, 7); fs(c, PAL.or, x - 3, y - 3, 6, 6, LW * 0.6); }
    heartPath(c, 50, 29, 8); c.fillStyle = PAL.roseVif; c.fill();
    gloss(c, 43, 42, 2.5, 6, 0.6, 0.2);
    pieceBase(c, 82, 50);
  },
  // 6 Couronne
  (c) => {
    glow(c, 50, 50, 34, PAL.or, 0.35);
    groundShadow(c, 50, 80, 32, 5);
    crownShape(c, 50, 52, 1.05);
  },
  // 7 Trône
  (c) => {
    groundShadow(c, 50, 92, 32, 5);
    c.beginPath(); c.moveTo(26, 62); c.lineTo(26, 30); c.bezierCurveTo(26, 6, 74, 6, 74, 30); c.lineTo(74, 62); c.closePath();
    fs(c, PAL.or, 26, 8, 48, 54);
    c.beginPath(); c.moveTo(32, 60); c.lineTo(32, 32); c.bezierCurveTo(32, 14, 68, 14, 68, 32); c.lineTo(68, 60); c.closePath();
    fs(c, PAL.roseDeep, 32, 14, 36, 46, LW * 0.8, 0.3);
    heartPath(c, 50, 34, 14); fs(c, PAL.or, 43, 27, 14, 14, LW * 0.7);
    // siège
    roundRect(c, 20, 58, 60, 12, 5); fs(c, PAL.roseVif, 20, 58, 60, 12);
    for (const x of [24, 70]) { c.beginPath(); c.rect(x, 70, 6, 20); fs(c, PAL.or, x, 70, 6, 20, LW * 0.8); }
    for (const x of [16, 84]) { roundRect(c, x - 5, 46, 10, 18, 4); fs(c, PAL.or, x - 5, 46, 10, 18, LW * 0.8); }
    for (const x of [26, 74]) { c.beginPath(); c.arc(x, 28, 4, 0, 7); fs(c, PAL.or, x - 4, 24, 8, 8, LW * 0.7); }
    gloss(c, 38, 26, 2.5, 6, 0.4, 0.2);
  },
  // 8 Royaume (blason)
  (c) => {
    glow(c, 50, 46, 46, PAL.lavande, 0.6);
    groundShadow(c, 50, 92, 26, 4);
    c.beginPath(); c.moveTo(22, 16); c.lineTo(78, 16); c.lineTo(78, 46); c.bezierCurveTo(78, 68, 60, 80, 50, 86); c.bezierCurveTo(40, 80, 22, 68, 22, 46); c.closePath();
    fs(c, PAL.or, 22, 16, 56, 70);
    c.beginPath(); c.moveTo(28, 22); c.lineTo(72, 22); c.lineTo(72, 46); c.bezierCurveTo(72, 64, 58, 74, 50, 79); c.bezierCurveTo(42, 74, 28, 64, 28, 46); c.closePath();
    fs(c, PAL.lavande, 28, 22, 44, 57, LW * 0.8);
    c.save(); c.beginPath(); c.moveTo(28, 22); c.lineTo(72, 22); c.lineTo(72, 46); c.bezierCurveTo(72, 64, 58, 74, 50, 79); c.bezierCurveTo(42, 74, 28, 64, 28, 46); c.closePath(); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect(28 + i * 11, 22 + j * 15, 11, 15);
    c.restore();
    crownShape(c, 50, 46, 0.5, true);
    // ruban
    c.beginPath(); c.moveTo(12, 70); c.lineTo(88, 70); c.lineTo(82, 78); c.lineTo(88, 86); c.lineTo(12, 86); c.lineTo(18, 78); c.closePath();
    fs(c, PAL.roseVif, 12, 70, 76, 16);
    sparkles(c, [[86, 18, 5], [14, 30, 4]], '#FFF6D6');
  },
  // 9 Château
  (c) => {
    glow(c, 50, 48, 48, PAL.rose, 0.6);
    groundShadow(c, 50, 92, 40, 5);
    const tower = (x: number, top: number, w: number, roof: string) => {
      c.beginPath(); c.rect(x - w / 2, top, w, 88 - top); fs(c, PAL.ivory, x - w / 2, top, w, 88 - top);
      c.beginPath(); c.moveTo(x - w / 2 - 4, top); c.lineTo(x, top - w * 1.2); c.lineTo(x + w / 2 + 4, top); c.closePath();
      fs(c, roof, x - w / 2 - 4, top - w * 1.2, w + 8, w * 1.2);
      roundRect(c, x - 3, top + 8, 6, 9, 3); c.fillStyle = '#FFE7A0'; c.fill(); ol(c, 1.4);
    };
    tower(20, 46, 14, PAL.lavande);
    tower(80, 46, 14, PAL.lavande);
    c.beginPath(); c.rect(26, 54, 48, 34); fs(c, PAL.ivory, 26, 54, 48, 34);
    for (let i = 0; i < 5; i++) { c.beginPath(); c.rect(28 + i * 9.6, 48, 6, 7); fs(c, PAL.ivory, 28 + i * 9.6, 48, 6, 7, LW * 0.7); }
    tower(50, 34, 18, PAL.roseVif);
    tube(c, () => { c.beginPath(); c.moveTo(50, 13); c.lineTo(50, 4); }, 1.6, PAL.choco);
    c.beginPath(); c.moveTo(51, 4); c.lineTo(62, 7); c.lineTo(51, 10); c.closePath(); c.fillStyle = PAL.roseVif; c.fill(); ol(c, 1.4);
    c.beginPath(); c.moveTo(42, 88); c.lineTo(42, 74); c.arc(50, 74, 8, Math.PI, 0); c.lineTo(58, 88); c.closePath();
    fs(c, '#B0703F', 42, 66, 16, 22, LW * 0.8);
    sparkles(c, [[90, 20, 5], [10, 24, 4], [88, 70, 3]], '#FFF6D6');
  },
  // 10 Reine éternelle
  (c) => {
    glow(c, 50, 46, 50, PAL.or, 0.7);
    glow(c, 50, 40, 26, '#FFFFFF', 0.6);
    groundShadow(c, 50, 92, 30, 5);
    c.beginPath(); c.moveTo(30, 78); c.quadraticCurveTo(40, 52, 38, 36); c.lineTo(62, 36); c.quadraticCurveTo(60, 52, 70, 78); c.closePath();
    fs(c, PAL.or, 30, 36, 40, 42, LW, 0.5);
    ellipse(c, 50, 58, 13, 4); fs(c, PAL.roseVif, 37, 54, 26, 8, LW * 0.8);
    crownShape(c, 50, 26, 0.62, true);
    heartPath(c, 50, 47, 12); fs(c, PAL.roseDeep, 44, 41, 12, 12, LW * 0.7);
    ellipse(c, 50, 86, 30, 7); fs(c, PAL.or, 20, 79, 60, 14);
    roundRect(c, 24, 74, 52, 9, 4); fs(c, PAL.roseVif, 24, 74, 52, 9, LW * 0.9);
    gloss(c, 42, 46, 2.5, 7, 0.6, 0.2);
    sparkles(c, [[12, 20, 6], [88, 18, 5], [86, 66, 4], [14, 62, 4]], '#FFFFFF');
  },
];

// ================================================================= SPÉCIAUX

const SPECIALS: ((c: C) => void)[] = [
  // 1 Étoile filante
  (c) => {
    glow(c, 58, 42, 44, PAL.or, 0.55);
    const trail = (col: string, off: number, w: number) => {
      c.beginPath(); c.moveTo(56 + off, 46 - off); c.quadraticCurveTo(30, 60, 8 + off, 88 - off * 0.5);
      c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.stroke();
    };
    trail(PAL.lavande, 6, 7); trail(PAL.roseVif, 0, 7); trail('#7FD3E8', -6, 6);
    starPath(c, 60, 40, 28, 13, 5, -Math.PI / 2 + 0.2);
    fs(c, PAL.or, 32, 12, 56, 56, LW, 0.55);
    gloss(c, 54, 32, 4, 6, 0.8, 0.4);
    c.beginPath(); c.arc(54, 44, 1.8, 0, 7); c.arc(66, 42, 1.8, 0, 7); c.fillStyle = OUTLINE; c.fill();
    c.beginPath(); c.arc(60, 47, 4, 0.2, Math.PI - 0.2); c.lineWidth = 1.8; c.strokeStyle = OUTLINE; c.stroke();
    sparkles(c, [[20, 20, 5], [88, 74, 5], [30, 46, 3]]);
  },
  // 2 Clé dorée
  (c) => {
    glow(c, 50, 50, 44, PAL.or, 0.5);
    groundShadow(c, 54, 88, 28, 4);
    c.save(); c.translate(50, 50); c.rotate(0.75);
    // tige + dents
    c.beginPath(); c.rect(-5, -6, 10, 46); fs(c, PAL.or, -5, -6, 10, 46);
    c.beginPath(); c.rect(5, 26, 10, 6); c.rect(5, 34, 7, 6); fs(c, PAL.or, 5, 26, 10, 14, LW * 0.8);
    // anneau en cœur
    c.beginPath();
    heartPath(c, 0, -22, 40);
    const g = c.createLinearGradient(-20, -42, 20, 0); g.addColorStop(0, '#FFE9A8'); g.addColorStop(0.5, PAL.or); g.addColorStop(1, PAL.orDeep);
    c.fillStyle = g; c.fill(); ol(c);
    heartPath(c, 0, -23, 20); c.fillStyle = PAL.roseVif; c.fill(); ol(c, 2);
    gloss(c, -8, -30, 4, 2.5, 0.75, -0.4);
    c.restore();
    sparkles(c, [[80, 20, 6], [18, 74, 4], [86, 60, 3]]);
  },
  // 3 Coffret surprise
  (c) => {
    glow(c, 50, 40, 48, PAL.lavande, 0.7);
    groundShadow(c, 50, 92, 32, 5);
    // éclats qui s'échappent
    for (const [x, y, r, col] of [[34, 18, 6, '#FFF6D6'], [52, 10, 7, '#FFE7A0'], [70, 20, 5, '#FFFFFF']] as const) {
      starPath(c, x, y, r, r * 0.45, 5); c.fillStyle = col; c.fill(); ol(c, 1.6);
    }
    heartPath(c, 60, 30, 10); c.fillStyle = PAL.roseVif; c.fill(); ol(c, 1.6);
    roundRect(c, 20, 52, 60, 38, 5); fs(c, '#9B82E0', 20, 52, 60, 38);
    // couvercle soulevé et penché
    c.save(); c.translate(50, 42); c.rotate(-0.18);
    roundRect(c, -35, -8, 70, 15, 5); fs(c, '#9B82E0', -35, -8, 70, 15, LW, 0.4);
    c.beginPath(); c.rect(-6, -8, 12, 15); fs(c, PAL.roseVif, -6, -8, 12, 15, LW * 0.8);
    c.restore();
    c.beginPath(); c.rect(44, 52, 12, 38); fs(c, PAL.roseVif, 44, 52, 12, 38, LW * 0.8);
    for (const [x, y] of [[30, 64], [68, 76], [32, 80], [68, 60]] as const) { starPath(c, x, y, 4.5, 2, 5); c.fillStyle = PAL.or; c.fill(); }
    gloss(c, 26, 60, 3, 6, 0.5, 0.2);
  },
];

const TABLE: Record<string, ((c: C) => void)[] | undefined> = { flowers: FLOWERS, love: LOVE, paris: PARIS, chess: CHESS, special: SPECIALS };

export function drawItem(ctx: CanvasRenderingContext2D, ref: ItemRef, size: number): void {
  const fn = (TABLE[ref.c] ?? EXTRA_ITEMS[ref.c] ?? EXTRA_ITEMS3[ref.c] ?? EXTRA_ITEMS4[ref.c])?.[ref.l - 1];
  if (!fn) return;
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // marge : l'objet occupe ~88 % du carré
  ctx.translate(6, 6);
  ctx.scale(0.88, 0.88);
  fn(ctx);
  ctx.restore();
}
