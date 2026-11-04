/**
 * Icônes des 7 collections « Endless 2.0 » (8 niveaux chacune) :
 * rare (Fleurs rares), choc (Chocolats), jewel (Bijoux), cloth (Vêtements),
 * perfume (Parfums), acc (Accessoires), castle (Objets du château).
 * Même repère que items.ts (100 × 100, marge appliquée par drawItem), même style :
 * contour chocolat, dégradés `fillShaded`, reflet en haut à gauche, ombre au sol.
 * Progression : petit/simple → grand/orné ; les 2 derniers niveaux gagnent un halo
 * et des étincelles, le niveau max brille le plus.
 * Fichier autonome (pas d'import depuis items.ts) pour éviter tout cycle.
 */
import {
  OUTLINE, OUTLINE_RATIO, PAL, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, roundRect, shade, sparkle,
} from './kit';

type C = CanvasRenderingContext2D;
type Draw = (c: C) => void;
const LW = (100 * OUTLINE_RATIO) / 0.88;

const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
function fs(c: C, color: string, x: number, y: number, w: number, h: number, lw = LW, light?: number) {
  fillShaded(c, color, box(x, y, w, h), lw, light !== undefined ? { light } : {});
}
function line(c: C, pts: [number, number][], w = 1.6, col = 'rgba(88,67,63,0.5)') {
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.lineWidth = w; c.strokeStyle = col; c.stroke();
}
function tube(c: C, path: () => void, width: number, color: string) {
  path(); c.lineWidth = width + LW * 2; c.strokeStyle = OUTLINE; c.stroke();
  path(); c.lineWidth = width; c.strokeStyle = color; c.stroke();
}
function el(c: C, cx: number, cy: number, rx: number, ry: number, col: string, lw = LW, rot = 0, light?: number) {
  ellipse(c, cx, cy, rx, ry, rot); fs(c, col, cx - rx, cy - ry, rx * 2, ry * 2, lw, light);
}
function rr(c: C, x: number, y: number, w: number, h: number, r: number, col: string, lw = LW, light?: number) {
  roundRect(c, x, y, w, h, r); fs(c, col, x, y, w, h, lw, light);
}
function poly(c: C, pts: [number, number][], col: string, lw = LW, light?: number) {
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  fs(c, col, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), lw, light);
}
function leaf(c: C, x: number, y: number, len: number, ang: number, color: string = PAL.leaf) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0); c.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0); c.closePath();
  fs(c, color, 0, -len * 0.4, len, len * 0.8, LW * 0.85);
  line(c, [[len * 0.1, 0], [len * 0.8, 0]], 1.3, shade(color, -0.35));
  c.restore();
}
function flower(c: C, x: number, y: number, r: number, petal: string, center: string = PAL.or, n = 5, rot = 0) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 - Math.PI / 2;
    el(c, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.36, petal, LW * 0.8, a, 0.4);
  }
  el(c, x, y, r * 0.32, r * 0.32, center, LW * 0.8);
  gloss(c, x - r * 0.1, y - r * 0.12, r * 0.12, r * 0.08, 0.8);
}
function sparkles(c: C, pts: [number, number, number][], color = '#FFFFFF') {
  for (const [x, y, r] of pts) { sparkle(c, x, y, r + 1.4, OUTLINE, 0.35); sparkle(c, x, y, r, color); }
}
/** Halo des niveaux élevés (dessiné AVANT l'objet). */
function halo(c: C, col: string, a = 0.5, r = 54) { glow(c, 50, 52, r, col, a); }
function gem(c: C, x: number, y: number, r: number, col: string) {
  poly(c, [[x, y - r], [x + r * 0.9, y - r * 0.15], [x + r * 0.55, y + r * 0.85], [x - r * 0.55, y + r * 0.85], [x - r * 0.9, y - r * 0.15]], col, LW * 0.75, 0.5);
  line(c, [[x - r * 0.9, y - r * 0.15], [x + r * 0.9, y - r * 0.15]], 1, 'rgba(255,255,255,0.7)');
  gloss(c, x - r * 0.25, y - r * 0.4, r * 0.18, r * 0.12, 0.8, -0.4);
}
function pearl(c: C, x: number, y: number, r: number) {
  el(c, x, y, r, r, '#FFF3F6', LW * 0.7, 0, 0.3);
  gloss(c, x - r * 0.3, y - r * 0.35, r * 0.3, r * 0.2, 0.9, -0.6);
}
function crown(c: C, cx: number, cy: number, s: number) {
  c.save(); c.translate(cx, cy); c.scale(s, s);
  poly(c, [[-34, 16], [-40, -16], [-19, 2], [0, -26], [19, 2], [40, -16], [34, 16]], PAL.or, LW / s);
  for (const [x, y] of [[-40, -16], [0, -26], [40, -16]] as const) el(c, x, y, 4.5, 4.5, PAL.roseVif, (LW * 0.7) / s);
  gem(c, 0, 4, 7, PAL.roseVif);
  c.restore();
}

// ============================================================ RARE · Fleurs rares
function orchid(c: C, x: number, y: number, s: number, col: string, lip: string) {
  el(c, x, y - s * 0.62, s * 0.4, s * 0.58, shade(col, 0.25), LW * 0.75, 0, 0.4);
  el(c, x - s * 0.7, y - s * 0.12, s * 0.62, s * 0.42, col, LW * 0.75, 0.35, 0.4);
  el(c, x + s * 0.7, y - s * 0.12, s * 0.62, s * 0.42, col, LW * 0.75, -0.35, 0.4);
  el(c, x - s * 0.34, y + s * 0.52, s * 0.3, s * 0.5, shade(col, 0.15), LW * 0.75, 0.45, 0.4);
  el(c, x + s * 0.34, y + s * 0.52, s * 0.3, s * 0.5, shade(col, 0.15), LW * 0.75, -0.45, 0.4);
  el(c, x, y + s * 0.12, s * 0.3, s * 0.36, lip, LW * 0.75);
  el(c, x, y - s * 0.12, s * 0.12, s * 0.12, PAL.or, LW * 0.5);
}
function petalShape(c: C, x: number, y: number, len: number, wid: number, ang: number, col: string, lw = LW * 0.8) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(wid, -len * 0.25, wid * 0.8, -len * 0.85, 0, -len); c.bezierCurveTo(-wid * 0.8, -len * 0.85, -wid, -len * 0.25, 0, 0); c.closePath();
  fs(c, col, -wid, -len, wid * 2, len, lw, 0.4);
  line(c, [[0, -len * 0.1], [0, -len * 0.8]], 1.1, shade(col, -0.25));
  c.restore();
}
function lotusFlower(c: C, x: number, y: number, s: number, col: string) {
  for (const a of [-1.15, 1.15]) petalShape(c, x, y, s * 0.9, s * 0.3, a, shade(col, -0.05));
  for (const a of [-0.6, 0.6]) petalShape(c, x, y, s * 1.05, s * 0.33, a, col);
  petalShape(c, x, y, s * 1.15, s * 0.34, 0, shade(col, 0.15));
}

export const RARE: Draw[] = [
  // 1 Pétale d'or
  (c) => {
    groundShadow(c, 50, 86, 22, 4);
    c.save(); c.translate(50, 52); c.rotate(-0.35);
    c.beginPath(); c.moveTo(0, 36); c.bezierCurveTo(-30, 20, -26, -22, 0, -38); c.bezierCurveTo(26, -22, 30, 20, 0, 36); c.closePath();
    fs(c, PAL.or, -28, -38, 56, 74, LW, 0.5);
    line(c, [[0, 30], [-3, 0], [0, -30]], 1.6, PAL.orDeep);
    gloss(c, -10, -14, 5, 13, 0.65, 0.15);
    c.restore();
    sparkles(c, [[24, 22, 5], [78, 40, 4], [70, 76, 3]], '#FFF6D0');
  },
  // 2 Orchidée
  (c) => {
    groundShadow(c, 50, 88, 20, 4);
    tube(c, () => { c.beginPath(); c.moveTo(40, 90); c.quadraticCurveTo(38, 50, 58, 34); }, 4.5, PAL.leafDeep);
    leaf(c, 40, 80, 24, -2.4); leaf(c, 42, 72, 22, -0.5, PAL.leafDeep);
    orchid(c, 62, 30, 17, '#C79BFF', '#FF9CC0');
    orchid(c, 44, 54, 12, '#E2C4FF', '#FFB3D1');
  },
  // 3 Pivoine
  (c) => {
    groundShadow(c, 50, 90, 24, 4);
    leaf(c, 50, 78, 28, -2.5); leaf(c, 52, 78, 28, -0.64);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; el(c, 50 + Math.cos(a) * 22, 44 + Math.sin(a) * 19, 15, 13, '#FF9CC0', LW * 0.85, a, 0.3); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.5; el(c, 50 + Math.cos(a) * 12, 44 + Math.sin(a) * 10, 11, 10, '#FFB3D1', LW * 0.8, a, 0.4); }
    el(c, 50, 44, 8, 7, '#FFD1E0', LW * 0.8); el(c, 50, 44, 3.5, 3, PAL.or, LW * 0.5);
    gloss(c, 38, 30, 7, 3.5, 0.6, -0.5);
  },
  // 4 Lys
  (c) => {
    groundShadow(c, 50, 90, 18, 4);
    tube(c, () => { c.beginPath(); c.moveTo(50, 90); c.quadraticCurveTo(48, 62, 50, 46); }, 4.5, PAL.leafDeep);
    leaf(c, 49, 82, 26, -2.3); leaf(c, 51, 76, 26, -0.7, PAL.leafDeep);
    for (const a of [-2.35, -0.8, 2.4, 0.75]) petalShape(c, 50, 44, 30, 9, a + Math.PI / 2, '#FFF4F0');
    petalShape(c, 50, 44, 34, 9, 0, '#FFFFFF'); petalShape(c, 50, 44, 28, 8, 2.5, '#FFF4F0');
    for (const a of [-0.5, 0.1, 0.55]) { line(c, [[50, 44], [50 + Math.sin(a) * 22, 44 - Math.cos(a) * 22]], 2, OUTLINE); el(c, 50 + Math.sin(a) * 22, 44 - Math.cos(a) * 22, 2.8, 2.2, '#F59B4E', LW * 0.5); }
    el(c, 50, 44, 4, 4, '#C6E58A', LW * 0.5);
  },
  // 5 Lotus
  (c) => {
    groundShadow(c, 50, 88, 36, 5);
    el(c, 50, 78, 40, 11, '#7FC4B0', LW, 0, 0.3);
    el(c, 50, 76, 40, 9, '#8ED6BE', 0, 0, 0.3);
    el(c, 24, 80, 12, 4.5, PAL.leafDeep, LW * 0.7);
    lotusFlower(c, 50, 74, 46, '#FF9CC0');
    el(c, 50, 72, 5, 3.5, PAL.or, LW * 0.6);
    gloss(c, 42, 44, 3, 8, 0.5, 0.2);
    sparkles(c, [[84, 40, 3.5], [16, 50, 3]], '#FFF6D0');
  },
  // 6 Bouquet rare
  (c) => {
    halo(c, '#FFD6F0', 0.35);
    groundShadow(c, 50, 91, 22, 4);
    leaf(c, 30, 52, 24, -2.5); leaf(c, 70, 52, 24, -0.65); leaf(c, 50, 44, 22, -1.57, PAL.leafDeep);
    orchid(c, 30, 40, 11, '#C79BFF', '#FF9CC0');
    flower(c, 70, 38, 16, '#FF9CC0', PAL.or, 8, 0.2);
    for (const a of [-2.4, -1.1]) petalShape(c, 50, 36, 22, 7, a + Math.PI / 2 + 0.1, '#FFFFFF');
    petalShape(c, 50, 36, 26, 7.5, 0, '#FFFFFF'); petalShape(c, 50, 36, 22, 7, 0.9, '#FFF4F0'); petalShape(c, 50, 36, 22, 7, -0.9, '#FFF4F0');
    el(c, 50, 30, 5, 5, PAL.or, LW * 0.6);
    poly(c, [[24, 54], [76, 54], [56, 94], [44, 94]], '#F3C86B');
    line(c, [[50, 56], [50, 92]], 1.5);
    for (const s of [-1, 1]) el(c, 50 + s * 9, 70, 9, 5.5, PAL.roseDeep, LW * 0.8, s * 0.4);
    el(c, 50, 70, 4, 4, PAL.roseDeep, LW * 0.8);
    sparkles(c, [[14, 22, 4], [88, 24, 3.4]], '#FFF6D0');
  },
  // 7 Serre cristal
  (c) => {
    halo(c, '#BFE9FF', 0.55);
    groundShadow(c, 50, 90, 38, 5);
    poly(c, [[14, 88], [14, 50], [50, 18], [86, 50], [86, 88]], '#D9F0FF');
    c.save(); c.clip();
    for (const [x, col] of [[34, '#7FC48A'], [52, '#FF9CC0'], [68, '#C79BFF']] as const) {
      tube(c, () => { c.beginPath(); c.moveTo(x, 88); c.lineTo(x, 62); }, 3, PAL.leafDeep);
      el(c, x, 58, 8, 8, col, LW * 0.7);
    }
    c.restore();
    line(c, [[50, 18], [50, 88]], 1.6); line(c, [[32, 34], [32, 88]], 1.6); line(c, [[68, 34], [68, 88]], 1.6);
    line(c, [[14, 52], [86, 52]], 1.6); line(c, [[14, 70], [86, 70]], 1.6);
    rr(c, 10, 84, 80, 8, 3, '#B9A5E8', LW * 0.9);
    el(c, 50, 17, 4, 4, PAL.or, LW * 0.7);
    gloss(c, 28, 50, 4, 14, 0.5, 0.5);
    sparkles(c, [[88, 26, 5], [10, 38, 4], [72, 12, 3.4]], '#FFFFFF');
  },
  // 8 Fleur de lune
  (c) => {
    halo(c, '#C6D8FF', 0.8, 58);
    groundShadow(c, 50, 92, 22, 4);
    c.beginPath(); c.arc(50, 40, 33, 0, Math.PI * 2); c.fillStyle = 'rgba(214,226,255,0.55)'; c.fill();
    // croissant
    c.beginPath(); c.arc(50, 40, 30, 0.5 * Math.PI, 1.5 * Math.PI, false); c.arc(60, 40, 24, 1.5 * Math.PI, 0.5 * Math.PI, true); c.closePath();
    fs(c, '#FFF3C8', 20, 10, 36, 60, LW * 0.7, 0.4);
    tube(c, () => { c.beginPath(); c.moveTo(50, 92); c.quadraticCurveTo(46, 70, 50, 54); }, 4.5, PAL.leafDeep);
    leaf(c, 49, 84, 24, -2.4, '#6FB59B'); leaf(c, 51, 80, 24, -0.7, '#6FB59B');
    for (let i = 0; i < 8; i++) petalShape(c, 50, 46, 24, 8, (i / 8) * Math.PI * 2, i % 2 ? '#DCE6FF' : '#BFD0FF');
    for (let i = 0; i < 6; i++) petalShape(c, 50, 46, 15, 6, (i / 6) * Math.PI * 2 + 0.5, '#F2F6FF');
    el(c, 50, 46, 6, 6, '#FFE7A0', LW * 0.7); gloss(c, 48, 44, 2, 1.6, 0.9);
    sparkles(c, [[16, 22, 5], [86, 18, 4.5], [84, 62, 3.6], [14, 64, 3.4], [50, 8, 4]], '#FFFFFF');
  },
];

// ============================================================ CHOC · Chocolats
const CH = '#7A4A32';
const CHD = '#5A3322';
function bar(c: C, x: number, y: number, w: number, h: number, col = CH) {
  rr(c, x, y, w, h, 4, col); line(c, [[x + w / 2, y + 2], [x + w / 2, y + h - 2]], 1.2, 'rgba(0,0,0,0.25)'); line(c, [[x + 2, y + h / 2], [x + w - 2, y + h / 2]], 1.2, 'rgba(0,0,0,0.25)');
}
function strawberry(c: C, x: number, y: number, r: number) {
  poly(c, [[x - r, y - r * 0.5], [x + r, y - r * 0.5], [x + r * 0.5, y + r], [x, y + r * 1.2], [x - r * 0.5, y + r]], '#E8484F', LW * 0.7);
  leaf(c, x, y - r * 0.5, r, -2.4, PAL.leaf); leaf(c, x, y - r * 0.5, r, -0.7, PAL.leaf);
  for (const [dx, dy] of [[-0.4, 0], [0.3, 0.2], [0, 0.6]] as const) el(c, x + dx * r, y + dy * r, 0.8, 1.1, '#FFE7A0', 0);
}

export const CHOC: Draw[] = [
  // 1 Fève
  (c) => {
    groundShadow(c, 50, 80, 24, 5);
    c.save(); c.translate(50, 54); c.rotate(-0.5);
    el(c, 0, 0, 20, 27, '#8B5A3C', LW, 0, 0.3);
    c.beginPath(); c.moveTo(0, -23); c.bezierCurveTo(7, -8, -7, 8, 0, 23); c.lineWidth = 2.4; c.strokeStyle = CHD; c.stroke();
    gloss(c, -8, -11, 4, 9, 0.5, 0.1);
    c.restore();
    sparkles(c, [[78, 28, 4]]);
  },
  // 2 Truffe
  (c) => {
    groundShadow(c, 50, 86, 28, 5);
    poly(c, [[26, 60], [74, 60], [68, 86], [32, 86]], '#F3C86B', LW * 0.9);
    for (const x of [36, 44, 52, 60]) line(c, [[x, 62], [x - 1, 84]], 1.2, 'rgba(120,80,20,0.4)');
    el(c, 50, 46, 27, 25, CH, LW, 0, 0.25);
    for (const [x, y] of [[40, 36], [58, 40], [48, 54], [62, 56], [36, 52]] as const) el(c, x, y, 2.4, 1.8, '#A9744F', 0);
    c.save(); ellipse(c, 50, 46, 27, 25); c.clip(); el(c, 40, 30, 15, 8, 'rgba(255,255,255,0.25)', 0, -0.4); c.restore();
    gloss(c, 38, 34, 6, 3.5, 0.55, -0.6);
  },
  // 3 Praliné
  (c) => {
    groundShadow(c, 50, 84, 30, 5);
    c.beginPath(); c.moveTo(50, 22); c.quadraticCurveTo(80, 24, 82, 52); c.quadraticCurveTo(82, 82, 50, 82); c.quadraticCurveTo(18, 82, 18, 52); c.quadraticCurveTo(20, 24, 50, 22); c.closePath();
    fs(c, CH, 18, 22, 64, 60, LW, 0.3);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; line(c, [[50 + Math.cos(a) * 14, 52 + Math.sin(a) * 14], [50 + Math.cos(a) * 30, 52 + Math.sin(a) * 28]], 1.6, 'rgba(0,0,0,0.25)'); }
    el(c, 50, 50, 13, 15, '#D9A066', LW * 0.85, 0.3, 0.35);
    line(c, [[46, 40], [52, 50], [47, 60]], 1.3, '#9A6644');
    gloss(c, 31, 36, 5, 3, 0.55, -0.6);
  },
  // 4 Bonbon
  (c) => {
    groundShadow(c, 50, 78, 30, 5);
    poly(c, [[6, 36], [30, 50], [6, 66], [14, 51]], PAL.roseVif, LW * 0.85);
    poly(c, [[94, 36], [70, 50], [94, 66], [86, 51]], PAL.roseVif, LW * 0.85);
    el(c, 50, 51, 27, 21, PAL.roseDeep, LW, 0, 0.3);
    for (const x of [38, 50, 62]) line(c, [[x, 33], [x + 2, 69]], 1.6, 'rgba(255,255,255,0.45)');
    c.save(); ellipse(c, 50, 51, 27, 21); c.clip();
    c.beginPath(); c.arc(50, 51, 8, 0, 7); c.fillStyle = PAL.or; c.fill(); c.restore();
    heartPath(c, 50, 51, 11); fs(c, PAL.or, 44, 45, 12, 12, LW * 0.5);
    gloss(c, 36, 40, 7, 3, 0.7, -0.5);
  },
  // 5 Boîte
  (c) => {
    groundShadow(c, 50, 88, 34, 5);
    rr(c, 16, 46, 68, 40, 8, '#B9486F');
    rr(c, 12, 34, 76, 20, 8, '#E8558F');
    c.fillStyle = PAL.or; c.fillRect(44, 34, 12, 52); line(c, [[44, 54], [44, 86]], 1.4); line(c, [[56, 54], [56, 86]], 1.4);
    for (const s of [-1, 1]) el(c, 50 + s * 12, 28, 12, 7, PAL.or, LW * 0.85, s * 0.45);
    el(c, 50, 30, 5, 5, PAL.orDeep, LW * 0.8);
    heartPath(c, 28, 68, 12); fs(c, '#FFD1E0', 22, 62, 12, 12, LW * 0.6);
    heartPath(c, 72, 68, 12); fs(c, '#FFD1E0', 66, 62, 12, 12, LW * 0.6);
    gloss(c, 22, 42, 6, 2.5, 0.55, 0);
  },
  // 6 Coffret
  (c) => {
    groundShadow(c, 50, 88, 40, 5);
    rr(c, 10, 46, 80, 40, 8, '#7A4A32');
    rr(c, 14, 50, 72, 32, 5, '#4A2A1C', LW * 0.7, 0.05);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const x = 28 + i * 22; const y = 58 + j * 15;
      if ((i + j) % 3 === 0) el(c, x, y, 8.5, 6.5, '#E8D0A0', LW * 0.6); else el(c, x, y, 8.5, 6.5, j ? '#A9744F' : '#C79A6B', LW * 0.6);
      gloss(c, x - 3, y - 2, 2.4, 1.4, 0.6);
    }
    // couvercle relevé
    poly(c, [[8, 44], [92, 44], [84, 14], [16, 14]], '#E8C16B', LW);
    poly(c, [[18, 40], [82, 40], [77, 20], [23, 20]], '#B2822C', LW * 0.5);
    heartPath(c, 50, 30, 18); fs(c, PAL.roseVif, 41, 21, 18, 18, LW * 0.7);
    gloss(c, 36, 24, 8, 2.5, 0.5, -0.1);
    sparkles(c, [[90, 10, 4], [8, 18, 3.4]], '#FFF6D0');
  },
  // 7 Fontaine
  (c) => {
    halo(c, '#FFD9A8', 0.4);
    groundShadow(c, 50, 91, 38, 5);
    rr(c, 14, 78, 72, 12, 6, '#F3C86B');
    el(c, 50, 74, 38, 9, CH, LW, 0, 0.2);
    rr(c, 40, 52, 20, 24, 3, '#F3C86B');
    el(c, 50, 52, 28, 7, CH, LW, 0, 0.2);
    rr(c, 44, 30, 12, 24, 3, '#F3C86B');
    el(c, 50, 30, 18, 5.5, CH, LW, 0, 0.2);
    tube(c, () => { c.beginPath(); c.moveTo(50, 16); c.lineTo(50, 28); }, 6, '#F3C86B');
    el(c, 50, 14, 7, 5, CH, LW * 0.8);
    // coulées
    for (const x of [30, 42, 58, 70]) tube(c, () => { c.beginPath(); c.moveTo(x, 78); c.lineTo(x, 84); }, 3.5, CHD);
    for (const x of [38, 62]) tube(c, () => { c.beginPath(); c.moveTo(x, 54); c.lineTo(x, 66); }, 3.5, '#6A3C28');
    strawberry(c, 22, 70, 6); strawberry(c, 78, 70, 6); strawberry(c, 36, 66, 5);
    gloss(c, 30, 72, 7, 1.8, 0.5, 0);
    sparkles(c, [[86, 26, 4.5], [12, 36, 3.6], [60, 10, 3.2]], '#FFF6D0');
  },
  // 8 Chocolaterie royale
  (c) => {
    halo(c, '#FFD27A', 0.6, 58);
    groundShadow(c, 50, 92, 42, 5);
    rr(c, 14, 44, 72, 46, 5, '#9A6644');
    for (const y of [54, 64, 74, 84]) line(c, [[14, y], [86, y]], 1, 'rgba(60,30,15,0.35)');
    rr(c, 8, 38, 84, 12, 3, '#FFF9EE');
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(8 + i * 14, 38); c.lineTo(22 + i * 14, 38); c.lineTo(22 + i * 14, 56); c.quadraticCurveTo(15 + i * 14, 62, 8 + i * 14, 56); c.closePath(); fs(c, i % 2 ? '#FFF9EE' : PAL.roseVif, 8 + i * 14, 38, 14, 24, LW * 0.8); }
    rr(c, 40, 66, 20, 24, 10, '#4A2A1C', LW * 0.9, 0.05);
    rr(c, 20, 66, 14, 12, 3, '#BFE9FF', LW * 0.8); rr(c, 66, 66, 14, 12, 3, '#BFE9FF', LW * 0.8);
    poly(c, [[10, 40], [50, 12], [90, 40]], '#B9486F');
    crown(c, 50, 18, 0.55);
    // bloc de chocolat sur le toit
    bar(c, 70, 20, 14, 12, CH);
    sparkles(c, [[10, 14, 5], [92, 12, 4.5], [86, 56, 3.4], [6, 60, 3.4]], '#FFF6D0');
  },
];

// ============================================================ JEWEL · Bijoux
const SILVER = '#DCE3F2';
function ringShape(c: C, cx: number, cy: number, rx: number, ry: number, w: number, col: string) {
  tube(c, () => { c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); }, w, col);
}

export const JEWEL: Draw[] = [
  // 1 Perle
  (c) => {
    groundShadow(c, 50, 84, 28, 5);
    // coquille
    c.beginPath(); c.moveTo(14, 66); c.quadraticCurveTo(14, 40, 50, 38); c.quadraticCurveTo(86, 40, 86, 66); c.quadraticCurveTo(70, 84, 50, 84); c.quadraticCurveTo(30, 84, 14, 66); c.closePath();
    fs(c, '#F5B5C8', 14, 38, 72, 46, LW, 0.45);
    for (const x of [26, 38, 50, 62, 74]) line(c, [[50, 82], [x, 48]], 1.3, 'rgba(160,80,110,0.4)');
    pearl(c, 50, 46, 17);
    sparkles(c, [[22, 28, 4.5], [80, 24, 3.6]], '#FFFFFF');
  },
  // 2 Bague
  (c) => {
    groundShadow(c, 50, 86, 26, 5);
    ringShape(c, 50, 62, 24, 22, 8, PAL.or);
    gloss(c, 33, 54, 3, 10, 0.55, 0.3);
    poly(c, [[38, 40], [62, 40], [56, 30], [44, 30]], PAL.orDeep, LW * 0.7);
    gem(c, 50, 26, 15, '#8FD3FF');
    sparkles(c, [[22, 22, 4.5], [82, 28, 4], [78, 76, 3]], '#FFFFFF');
  },
  // 3 Boucle d'oreille
  (c) => {
    groundShadow(c, 50, 90, 30, 5);
    for (const [x, rot] of [[30, 0], [70, 0]] as const) {
      el(c, x, 20, 4.5, 4.5, PAL.or, LW * 0.8);
      tube(c, () => { c.beginPath(); c.moveTo(x, 24); c.lineTo(x, 44); }, 3, PAL.or);
      c.save(); c.translate(x, 64); c.rotate(rot);
      c.beginPath(); c.moveTo(0, -20); c.bezierCurveTo(16, -6, 15, 20, 0, 24); c.bezierCurveTo(-15, 20, -16, -6, 0, -20); c.closePath();
      fs(c, '#FF9CC0', -16, -20, 32, 44, LW * 0.9, 0.45);
      gloss(c, -5, -6, 3, 7, 0.7, 0.3);
      c.restore();
    }
    sparkles(c, [[50, 40, 4.6], [90, 40, 3.4]], '#FFFFFF');
  },
  // 4 Collier
  (c) => {
    groundShadow(c, 50, 88, 30, 5);
    tube(c, () => { c.beginPath(); c.moveTo(14, 14); c.quadraticCurveTo(50, 80, 86, 14); }, 3.4, PAL.or);
    for (let i = 0; i < 7; i++) { const t = 0.12 + i * 0.13; const x = (1 - t) ** 2 * 14 + 2 * (1 - t) * t * 50 + t * t * 86; const y = (1 - t) ** 2 * 14 + 2 * (1 - t) * t * 80 + t * t * 14; if (Math.abs(t - 0.5) > 0.05) pearl(c, x, y + 1, 4.2); }
    gem(c, 50, 58, 13, '#FF75A8');
    el(c, 50, 42, 3, 3, PAL.or, LW * 0.6);
    sparkles(c, [[20, 58, 4], [82, 56, 4], [50, 86, 3]], '#FFFFFF');
  },
  // 5 Bracelet
  (c) => {
    groundShadow(c, 50, 88, 32, 5);
    tube(c, () => { c.beginPath(); c.ellipse(50, 54, 33, 30, 0, 0, Math.PI * 2); }, 9, PAL.or);
    tube(c, () => { c.beginPath(); c.ellipse(50, 54, 33, 30, 0, 0, Math.PI * 2); }, 2.2, PAL.orDeep);
    for (const [x, y, col] of [[50, 24, '#FF75A8'], [24, 40, '#8FD3FF'], [76, 40, '#A5E6B8'], [26, 72, '#C79BFF'], [74, 72, '#FFD27A']] as const) gem(c, x, y, 7.5, col);
    gloss(c, 30, 30, 3, 8, 0.5, 0.8);
    sparkles(c, [[88, 18, 4.4], [10, 86, 3.4]], '#FFFFFF');
  },
  // 6 Diadème
  (c) => {
    halo(c, '#FFE7A0', 0.35);
    groundShadow(c, 50, 84, 36, 5);
    tube(c, () => { c.beginPath(); c.moveTo(10, 72); c.quadraticCurveTo(50, 62, 90, 72); }, 6, SILVER);
    for (const [x, h, s] of [[50, 44, 11], [34, 32, 8], [66, 32, 8], [20, 20, 6], [80, 20, 6]] as const) {
      const base = 66 + Math.abs(x - 50) * 0.18;
      poly(c, [[x - s * 0.7, base], [x, base - h], [x + s * 0.7, base]], SILVER, LW * 0.8, 0.4);
      el(c, x, base - h - 3, s * 0.55, s * 0.55, x === 50 ? '#FF75A8' : '#8FD3FF', LW * 0.7);
    }
    for (let i = 0; i < 6; i++) pearl(c, 16 + i * 13.5, 70 + Math.sin((i / 5) * Math.PI) * -2.5 + 2, 2.7);
    sparkles(c, [[50, 8, 5], [90, 40, 3.6], [8, 44, 3.6]], '#FFFFFF');
  },
  // 7 Écrin
  (c) => {
    halo(c, '#FFD6F0', 0.55, 56);
    groundShadow(c, 50, 90, 36, 5);
    // lueur sortant de l'écrin
    glow(c, 50, 46, 30, '#FFFFFF', 0.8);
    poly(c, [[14, 56], [86, 56], [80, 90], [20, 90]], '#B9486F', LW);
    rr(c, 10, 50, 80, 12, 5, '#E8558F');
    // coussin et bague
    ringShape(c, 50, 38, 14, 12, 5, PAL.or);
    gem(c, 50, 22, 11, '#8FD3FF');
    // couvercle ouvert (derrière)
    poly(c, [[14, 50], [86, 50], [92, 14], [8, 14]], '#E8558F', LW * 0.9);
    poly(c, [[20, 46], [80, 46], [84, 20], [16, 20]], '#FFD1E0', LW * 0.5);
    el(c, 50, 74, 10, 8, PAL.or, LW * 0.8); heartPath(c, 50, 74, 10); fs(c, PAL.roseVif, 45, 69, 10, 10, LW * 0.5);
    // cache l'intérieur : seule la bague dépasse
    sparkles(c, [[84, 34, 5.5], [14, 36, 4.4], [50, 6, 4.4], [70, 66, 3]], '#FFFFFF');
  },
  // 8 Parure royale
  (c) => {
    halo(c, '#FFE7A0', 0.85, 60);
    groundShadow(c, 50, 92, 38, 5);
    // collier en V
    tube(c, () => { c.beginPath(); c.moveTo(8, 34); c.quadraticCurveTo(50, 104, 92, 34); }, 3.4, PAL.or);
    gem(c, 50, 72, 14, '#FF75A8');
    for (const [x, y] of [[24, 56], [36, 68], [64, 68], [76, 56]] as const) pearl(c, x, y, 4.6);
    // couronne
    crown(c, 50, 28, 0.95);
    for (const [x, y, col] of [[18, 70, '#8FD3FF'], [82, 70, '#A5E6B8']] as const) { ringShape(c, x, y, 7, 6, 3.4, PAL.or); gem(c, x, y - 9, 5, col); }
    sparkles(c, [[8, 12, 5.5], [92, 14, 5.5], [50, 4, 4.6], [90, 82, 4], [10, 86, 4], [30, 84, 3]], '#FFF6D0');
  },
];

// ============================================================ CLOTH · Vêtements
function bow(c: C, x: number, y: number, s: number, col: string) {
  for (const k of [-1, 1]) {
    c.save(); c.translate(x, y); c.scale(k, 1);
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(s * 0.4, -s * 0.7, s * 1.1, -s * 0.6, s * 1.0, 0); c.bezierCurveTo(s * 1.1, s * 0.6, s * 0.4, s * 0.7, 0, 0); c.closePath();
    fs(c, col, 0, -s * 0.7, s * 1.1, s * 1.4, LW * 0.85, 0.4);
    line(c, [[s * 0.3, -s * 0.1], [s * 0.85, -s * 0.2]], 1.1, shade(col, -0.3));
    c.restore();
  }
  for (const k of [-1, 1]) poly(c, [[x, y], [x + k * s * 0.15, y + s * 1.05], [x + k * s * 0.45, y + s * 0.85], [x + k * s * 0.3, y + s * 0.05]], shade(col, -0.1), LW * 0.7);
  el(c, x, y, s * 0.24, s * 0.26, col, LW * 0.8);
}
const SILK = '#F28DB5';

export const CLOTH: Draw[] = [
  // 1 Ruban
  (c) => {
    groundShadow(c, 50, 84, 30, 5);
    bow(c, 50, 44, 30, SILK);
    sparkles(c, [[16, 20, 4], [86, 26, 3.4]]);
  },
  // 2 Écharpe
  (c) => {
    groundShadow(c, 50, 88, 30, 5);
    c.beginPath(); c.moveTo(18, 24); c.quadraticCurveTo(50, 8, 82, 24); c.lineTo(84, 44); c.quadraticCurveTo(50, 32, 16, 44); c.closePath();
    fs(c, '#E8558F', 16, 8, 68, 36, LW, 0.35);
    // pan qui tombe
    c.beginPath(); c.moveTo(56, 34); c.lineTo(80, 38); c.lineTo(72, 82); c.lineTo(48, 78); c.closePath();
    fs(c, '#FF75A8', 48, 34, 32, 48, LW, 0.35);
    c.save(); c.beginPath(); c.moveTo(56, 34); c.lineTo(80, 38); c.lineTo(72, 82); c.lineTo(48, 78); c.closePath(); c.clip();
    for (const y of [48, 60, 72]) line(c, [[40, y - 3], [90, y + 4]], 4.5, '#FFF4E8');
    c.restore();
    for (let i = 0; i < 5; i++) line(c, [[50 + i * 5.5, 78 + i * 0.8], [49 + i * 5.5, 90 + i * 0.8]], 2.2, '#FFD1E0');
    gloss(c, 30, 20, 8, 2.6, 0.5, -0.1);
  },
  // 3 Chemisier
  (c) => {
    groundShadow(c, 50, 90, 32, 5);
    poly(c, [[34, 22], [8, 38], [16, 56], [28, 50], [28, 86], [72, 86], [72, 50], [84, 56], [92, 38], [66, 22], [50, 32]], '#FFF9EE');
    line(c, [[50, 32], [50, 86]], 1.6);
    poly(c, [[34, 22], [50, 32], [42, 46]], '#FFF9EE', LW * 0.8);
    poly(c, [[66, 22], [50, 32], [58, 46]], '#FFF9EE', LW * 0.8);
    for (const y of [52, 62, 72]) el(c, 50, y, 2, 2, PAL.roseVif, LW * 0.4);
    poly(c, [[48, 32], [52, 32], [53, 40], [47, 40]], PAL.roseVif, LW * 0.5);
    line(c, [[14, 46], [26, 41]], 1.4); line(c, [[86, 46], [74, 41]], 1.4);
    gloss(c, 38, 62, 3, 10, 0.4, 0.1);
  },
  // 4 Jupe
  (c) => {
    groundShadow(c, 50, 90, 38, 5);
    c.beginPath(); c.moveTo(34, 18); c.lineTo(66, 18); c.quadraticCurveTo(70, 50, 92, 84); c.quadraticCurveTo(50, 94, 8, 84); c.quadraticCurveTo(30, 50, 34, 18); c.closePath();
    fs(c, '#B9A5E8', 8, 18, 84, 76, LW, 0.35);
    for (const x of [26, 38, 50, 62, 74]) line(c, [[34 + (x - 50) * 0.12 + 16, 24], [x, 88]], 1.6, 'rgba(81,68,109,0.35)');
    rr(c, 32, 14, 36, 10, 4, PAL.roseVif, LW * 0.9);
    el(c, 50, 19, 4, 4, PAL.or, LW * 0.6);
    gloss(c, 36, 44, 3, 12, 0.4, 0.3);
  },
  // 5 Veste
  (c) => {
    groundShadow(c, 50, 90, 34, 5);
    poly(c, [[34, 14], [10, 28], [8, 70], [20, 72], [24, 42], [24, 88], [76, 88], [76, 42], [80, 72], [92, 70], [90, 28], [66, 14], [50, 30]], '#4B7FB5');
    line(c, [[50, 30], [50, 88]], 1.8, 'rgba(0,0,0,0.35)');
    poly(c, [[34, 14], [50, 30], [42, 52], [28, 34]], '#6FA1D6', LW * 0.9);
    poly(c, [[66, 14], [50, 30], [58, 52], [72, 34]], '#6FA1D6', LW * 0.9);
    for (const y of [56, 68, 80]) el(c, 56, y, 2.6, 2.6, PAL.or, LW * 0.5);
    rr(c, 28, 66, 14, 12, 2, '#3E6C9E', LW * 0.6); rr(c, 58, 66, 14, 12, 2, '#3E6C9E', LW * 0.6);
    gloss(c, 32, 62, 3, 10, 0.35, 0.1);
  },
  // 6 Robe
  (c) => {
    groundShadow(c, 50, 91, 38, 5);
    c.beginPath(); c.moveTo(36, 8); c.lineTo(42, 24); c.lineTo(58, 24); c.lineTo(64, 8); c.lineTo(70, 30); c.quadraticCurveTo(60, 44, 66, 50); c.quadraticCurveTo(72, 74, 90, 88); c.quadraticCurveTo(50, 98, 10, 88); c.quadraticCurveTo(28, 74, 34, 50); c.quadraticCurveTo(40, 44, 30, 30); c.closePath();
    fs(c, '#E8558F', 10, 8, 80, 90, LW, 0.35);
    rr(c, 33, 46, 34, 7, 3, PAL.or, LW * 0.8);
    for (const x of [22, 34, 46, 58, 70, 80]) line(c, [[50 + (x - 50) * 0.35, 54], [x, 90]], 1.5, 'rgba(120,20,60,0.3)');
    bow(c, 50, 49, 9, '#FFD1E0');
    gloss(c, 40, 30, 3, 8, 0.45, 0.3);
    sparkles(c, [[84, 22, 4], [14, 40, 3.4]]);
  },
  // 7 Robe de soirée
  (c) => {
    halo(c, '#E7C9FF', 0.55);
    groundShadow(c, 50, 92, 40, 5);
    c.beginPath(); c.moveTo(38, 6); c.lineTo(42, 22); c.lineTo(58, 22); c.lineTo(62, 6); c.lineTo(66, 24); c.quadraticCurveTo(58, 38, 62, 46); c.quadraticCurveTo(70, 78, 94, 92); c.quadraticCurveTo(50, 102, 6, 92); c.quadraticCurveTo(30, 78, 38, 46); c.quadraticCurveTo(42, 38, 34, 24); c.closePath();
    const g = c.createLinearGradient(0, 6, 0, 98); g.addColorStop(0, '#9B6FE0'); g.addColorStop(0.6, '#6B3FB5'); g.addColorStop(1, '#3E2680');
    c.fillStyle = g; c.fill(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    c.save(); c.clip();
    for (const [x, y, r] of [[44, 56, 2], [58, 62, 2.4], [40, 74, 2.6], [64, 80, 2], [52, 88, 2.4], [30, 86, 2], [76, 88, 2.2], [50, 70, 1.8]] as const) sparkle(c, x, y, r + 1.6, '#FFF6D0');
    for (const x of [24, 36, 48, 60, 72]) line(c, [[50 + (x - 50) * 0.3, 50], [x + (x - 50) * 0.2, 98]], 1.3, 'rgba(255,255,255,0.18)');
    c.restore();
    rr(c, 36, 44, 28, 7, 3, PAL.or, LW * 0.8);
    gloss(c, 44, 30, 3, 8, 0.45, 0.3);
    sparkles(c, [[88, 20, 5], [10, 28, 4.4], [84, 58, 3.4]], '#FFFFFF');
  },
  // 8 Tenue de gala
  (c) => {
    halo(c, '#FFE7A0', 0.85, 60);
    groundShadow(c, 50, 93, 40, 5);
    // cape dorée
    poly(c, [[30, 22], [4, 90], [28, 94], [38, 50]], '#F3C86B', LW);
    poly(c, [[70, 22], [96, 90], [72, 94], [62, 50]], '#F3C86B', LW);
    // robe
    c.beginPath(); c.moveTo(40, 14); c.lineTo(44, 26); c.lineTo(56, 26); c.lineTo(60, 14); c.lineTo(66, 32); c.quadraticCurveTo(58, 44, 62, 50); c.quadraticCurveTo(70, 78, 88, 92); c.quadraticCurveTo(50, 102, 12, 92); c.quadraticCurveTo(30, 78, 38, 50); c.quadraticCurveTo(42, 44, 34, 32); c.closePath();
    const g = c.createLinearGradient(0, 10, 0, 98); g.addColorStop(0, '#FF9CC0'); g.addColorStop(0.55, '#E8558F'); g.addColorStop(1, '#8E2A63');
    c.fillStyle = g; c.fill(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    c.save(); c.clip();
    for (const [x, y] of [[42, 62], [56, 66], [48, 78], [62, 84], [36, 86], [72, 90], [50, 92]] as const) sparkle(c, x, y, 3.4, '#FFF6D0');
    c.restore();
    rr(c, 36, 48, 28, 7, 3, PAL.or, LW * 0.8);
    heartPath(c, 50, 38, 12); fs(c, PAL.or, 44, 32, 12, 12, LW * 0.6);
    crown(c, 50, 8, 0.4);
    sparkles(c, [[8, 14, 5.4], [92, 14, 5.4], [50, 98, 3.4], [88, 56, 4], [12, 58, 4]], '#FFF6D0');
  },
];

// ============================================================ PERFUME · Parfums
function bottle(c: C, x: number, y: number, w: number, h: number, liquid: string, r = 8) {
  rr(c, x, y, w, h, r, 'rgba(235,245,255,0.9)', LW, 0.5);
  c.save(); roundRect(c, x + 2, y + h * 0.35, w - 4, h * 0.65 - 2, r * 0.7); c.clip();
  fs(c, liquid, x, y + h * 0.35, w, h * 0.65, 0, 0.3);
  c.restore();
  roundRect(c, x, y, w, h, r); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
  gloss(c, x + w * 0.22, y + h * 0.45, w * 0.06, h * 0.22, 0.65, 0.1);
}
function mist(c: C, x: number, y: number, n: number, col = '#FFD1E0') {
  for (let i = 0; i < n; i++) { const a = -0.5 + i * (1 / Math.max(1, n - 1)); el(c, x + Math.cos(a) * (6 + i * 5), y + Math.sin(a) * (4 + i * 3) - i * 2, 2.4 + i * 0.5, 2.4 + i * 0.5, col, 0); }
}

export const PERFUME: Draw[] = [
  // 1 Pétale parfumé
  (c) => {
    groundShadow(c, 50, 84, 24, 4);
    petalShape(c, 46, 76, 54, 20, 0.2, '#FF9CC0');
    gloss(c, 42, 44, 4, 12, 0.6, 0.2);
    for (const [x, y] of [[74, 34], [80, 22]] as const) tube(c, () => { c.beginPath(); c.moveTo(x - 6, y + 14); c.quadraticCurveTo(x + 8, y + 6, x - 2, y - 6); }, 1.4, '#C79BFF');
    sparkles(c, [[22, 26, 4], [84, 56, 3.6]]);
  },
  // 2 Fiole
  (c) => {
    groundShadow(c, 50, 88, 24, 4);
    c.beginPath(); c.moveTo(42, 22); c.lineTo(58, 22); c.lineTo(58, 40); c.quadraticCurveTo(80, 52, 78, 72); c.quadraticCurveTo(76, 90, 50, 90); c.quadraticCurveTo(24, 90, 22, 72); c.quadraticCurveTo(20, 52, 42, 40); c.closePath();
    fs(c, '#EAF4FF', 20, 22, 60, 68, LW, 0.5);
    c.save(); c.clip(); fs(c, '#C79BFF', 20, 58, 60, 34, 0, 0.3); c.restore();
    c.beginPath(); c.moveTo(42, 22); c.lineTo(58, 22); c.lineTo(58, 40); c.quadraticCurveTo(80, 52, 78, 72); c.quadraticCurveTo(76, 90, 50, 90); c.quadraticCurveTo(24, 90, 22, 72); c.quadraticCurveTo(20, 52, 42, 40); c.closePath(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    rr(c, 40, 10, 20, 16, 5, '#D9A066');
    gloss(c, 34, 66, 3, 10, 0.65, 0.3);
    sparkles(c, [[84, 32, 4]]);
  },
  // 3 Flacon
  (c) => {
    groundShadow(c, 50, 90, 30, 5);
    bottle(c, 22, 34, 56, 54, '#FF9CC0', 16);
    rr(c, 38, 22, 24, 14, 4, '#F3C86B', LW * 0.9);
    rr(c, 32, 10, 36, 16, 8, PAL.or, LW);
    heartPath(c, 50, 64, 18); fs(c, '#FFF4E8', 41, 55, 18, 18, LW * 0.6);
    gloss(c, 40, 16, 6, 2.2, 0.6, 0);
  },
  // 4 Brume
  (c) => {
    groundShadow(c, 44, 90, 28, 5);
    bottle(c, 20, 42, 44, 48, '#9FD8E8', 10);
    rr(c, 34, 30, 16, 14, 3, '#D9A066', LW * 0.9);
    // buse
    poly(c, [[30, 22], [58, 22], [62, 30], [30, 30]], '#F5B5C8', LW * 0.9);
    rr(c, 56, 20, 16, 10, 3, '#F5B5C8', LW * 0.9);
    mist(c, 76, 24, 4, '#D9F0FF');
    el(c, 42, 66, 10, 7, '#FFF4E8', LW * 0.5);
    sparkles(c, [[86, 12, 4], [88, 44, 3.4]]);
  },
  // 5 Eau de parfum
  (c) => {
    halo(c, '#FFD6F0', 0.3);
    groundShadow(c, 50, 91, 32, 5);
    bottle(c, 24, 34, 52, 54, '#FFB3D1', 8);
    rr(c, 32, 14, 36, 22, 5, PAL.or, LW);
    rr(c, 40, 8, 20, 10, 4, PAL.orDeep, LW * 0.8);
    rr(c, 33, 52, 34, 24, 4, '#FFF9EE', LW * 0.8);
    heartPath(c, 50, 64, 14); fs(c, PAL.roseVif, 43, 57, 14, 14, LW * 0.5);
    line(c, [[36, 74], [64, 74]], 1, 'rgba(88,67,63,0.4)');
    sparkles(c, [[88, 24, 4.4], [10, 50, 3.6]]);
  },
  // 6 Coffret parfum
  (c) => {
    halo(c, '#E7C9FF', 0.4);
    groundShadow(c, 50, 92, 40, 5);
    rr(c, 8, 54, 84, 36, 6, '#6B3FB5');
    rr(c, 12, 58, 76, 28, 4, '#3E2680', LW * 0.6, 0.05);
    // trois flacons dépassant
    for (const [x, h, col, w] of [[18, 40, '#FFB3D1', 20], [40, 50, '#9FD8E8', 22], [64, 44, '#FFD27A', 20]] as const) {
      bottle(c, x, 84 - h, w, h, col, 6);
      rr(c, x + w / 2 - 5, 84 - h - 9, 10, 10, 3, PAL.or, LW * 0.8);
    }
    rr(c, 8, 74, 84, 16, 5, '#8E5FD6', LW);
    heartPath(c, 50, 82, 11); fs(c, PAL.or, 44, 76, 11, 11, LW * 0.5);
    sparkles(c, [[88, 18, 4.4], [8, 28, 3.6]], '#FFFFFF');
  },
  // 7 Cristal
  (c) => {
    halo(c, '#BFE9FF', 0.7);
    groundShadow(c, 50, 92, 30, 5);
    poly(c, [[28, 40], [72, 40], [82, 66], [66, 90], [34, 90], [18, 66]], '#BFE9FF');
    poly(c, [[28, 40], [50, 40], [50, 90], [34, 90], [18, 66]], '#D9F5FF', LW * 0.4, 0.5);
    line(c, [[28, 40], [50, 62], [72, 40]], 1.4, 'rgba(255,255,255,0.9)'); line(c, [[18, 66], [50, 62], [82, 66]], 1.4, 'rgba(255,255,255,0.8)'); line(c, [[50, 62], [50, 90]], 1.4, 'rgba(255,255,255,0.8)');
    poly(c, [[42, 26], [58, 26], [60, 40], [40, 40]], PAL.or, LW * 0.8);
    el(c, 50, 16, 11, 11, '#FF75A8', LW * 0.9); gloss(c, 46, 12, 3, 2, 0.8);
    sparkles(c, [[88, 40, 5.2], [10, 40, 4.4], [78, 12, 3.8], [86, 80, 3.4]], '#FFFFFF');
  },
  // 8 Essence rare
  (c) => {
    halo(c, '#FFE7A0', 0.9, 62);
    groundShadow(c, 50, 93, 34, 5);
    c.beginPath(); c.moveTo(42, 30); c.lineTo(58, 30); c.quadraticCurveTo(58, 38, 70, 46); c.quadraticCurveTo(88, 60, 84, 78); c.quadraticCurveTo(80, 92, 50, 92); c.quadraticCurveTo(20, 92, 16, 78); c.quadraticCurveTo(12, 60, 30, 46); c.quadraticCurveTo(42, 38, 42, 30); c.closePath();
    fs(c, '#F7EBFF', 12, 30, 76, 62, LW, 0.55);
    c.save(); c.clip();
    const g = c.createLinearGradient(0, 50, 0, 92); g.addColorStop(0, '#FF75A8'); g.addColorStop(1, '#8E2A8E'); c.fillStyle = g; c.fillRect(0, 54, 100, 40);
    c.restore();
    c.beginPath(); c.moveTo(42, 30); c.lineTo(58, 30); c.quadraticCurveTo(58, 38, 70, 46); c.quadraticCurveTo(88, 60, 84, 78); c.quadraticCurveTo(80, 92, 50, 92); c.quadraticCurveTo(20, 92, 16, 78); c.quadraticCurveTo(12, 60, 30, 46); c.quadraticCurveTo(42, 38, 42, 30); c.closePath(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    // bouchon doré orné
    rr(c, 40, 22, 20, 12, 3, PAL.orDeep, LW * 0.8);
    c.beginPath(); c.moveTo(50, 2); c.bezierCurveTo(64, 8, 64, 18, 50, 24); c.bezierCurveTo(36, 18, 36, 8, 50, 2); c.closePath(); fs(c, PAL.or, 36, 2, 28, 22, LW * 0.9, 0.5);
    heartPath(c, 50, 66, 20); fs(c, PAL.or, 40, 56, 20, 20, LW * 0.7, 0.5);
    gloss(c, 28, 66, 3.4, 11, 0.65, 0.4);
    sparkles(c, [[90, 30, 5.6], [8, 34, 4.8], [80, 10, 4.2], [14, 82, 3.8], [92, 70, 3.8]], '#FFF6D0');
  },
];

// ============================================================ ACC · Accessoires
export const ACC: Draw[] = [
  // 1 Épingle
  (c) => {
    groundShadow(c, 50, 86, 28, 4);
    c.save(); c.translate(50, 52); c.rotate(-0.7);
    tube(c, () => { c.beginPath(); c.moveTo(-34, 6); c.lineTo(26, 6); }, 3.2, SILVER);
    poly(c, [[-40, 6], [-33, 2], [-33, 10]], '#9AA8C2', LW * 0.5);
    c.restore();
    c.save(); c.translate(50, 52); c.rotate(-0.7);
    pearl(c, 32, 6, 9);
    for (const a of [0, 1, 2, 3, 4]) el(c, 32 + Math.cos(a * 1.256) * 12, 6 + Math.sin(a * 1.256) * 12, 3, 3, PAL.or, LW * 0.5);
    c.restore();
    sparkles(c, [[20, 24, 4.2], [82, 70, 3.4]]);
  },
  // 2 Lunettes
  (c) => {
    groundShadow(c, 50, 78, 36, 5);
    tube(c, () => { c.beginPath(); c.moveTo(8, 46); c.lineTo(18, 44); }, 3.4, '#2C2438');
    tube(c, () => { c.beginPath(); c.moveTo(92, 46); c.lineTo(82, 44); }, 3.4, '#2C2438');
    tube(c, () => { c.beginPath(); c.moveTo(44, 48); c.quadraticCurveTo(50, 42, 56, 48); }, 3.4, '#2C2438');
    for (const x of [30, 70]) {
      el(c, x, 54, 17, 15, '#2C2438', LW, 0, 0.1);
      const g = c.createLinearGradient(x - 12, 40, x + 10, 68); g.addColorStop(0, '#E7A6D8'); g.addColorStop(1, '#6B3FB5');
      ellipse(c, x, 54, 13.5, 11.5); c.fillStyle = g; c.fill();
      gloss(c, x - 5, 49, 4.4, 2.2, 0.8, -0.5);
    }
    sparkles(c, [[50, 24, 4.4], [90, 24, 3.4]]);
  },
  // 3 Foulard
  (c) => {
    groundShadow(c, 50, 88, 32, 5);
    c.beginPath(); c.moveTo(50, 16); c.lineTo(86, 52); c.lineTo(50, 88); c.lineTo(14, 52); c.closePath();
    fs(c, '#FF9CC0', 14, 16, 72, 72, LW, 0.35);
    c.save(); c.clip();
    c.beginPath(); c.moveTo(50, 28); c.lineTo(74, 52); c.lineTo(50, 76); c.lineTo(26, 52); c.closePath(); c.fillStyle = '#FFF4E8'; c.fill();
    for (const [x, y] of [[50, 52], [38, 52], [62, 52], [50, 40], [50, 64]] as const) heartPath(c, x, y, 8), (c.fillStyle = PAL.roseVif), c.fill();
    c.restore();
    c.beginPath(); c.moveTo(50, 16); c.lineTo(86, 52); c.lineTo(50, 88); c.lineTo(14, 52); c.closePath(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    el(c, 50, 18, 7, 6, '#E8558F', LW * 0.9);
    gloss(c, 30, 40, 7, 2.4, 0.5, -0.8);
  },
  // 4 Gants
  (c) => {
    groundShadow(c, 50, 90, 34, 5);
    for (const [x, rot, col] of [[32, -0.15, '#E8558F'], [64, 0.15, '#FF75A8']] as const) {
      c.save(); c.translate(x, 54); c.rotate(rot);
      c.beginPath(); c.moveTo(-14, 34); c.lineTo(-14, 6); c.quadraticCurveTo(-20, -6, -14, -26); c.quadraticCurveTo(-10, -32, -6, -26); c.lineTo(-5, -10); c.lineTo(-4, -34); c.quadraticCurveTo(0, -38, 3, -34); c.lineTo(4, -10); c.lineTo(5, -30); c.quadraticCurveTo(9, -33, 11, -28); c.lineTo(11, -8); c.lineTo(13, -20); c.quadraticCurveTo(18, -22, 18, -14); c.lineTo(17, 12); c.quadraticCurveTo(16, 24, 14, 34); c.closePath();
      fs(c, col, -20, -38, 40, 72, LW * 0.9, 0.35);
      rr(c, -17, 22, 34, 12, 4, '#FFF4E8', LW * 0.8);
      line(c, [[-6, -2], [-6, 12]], 1.2); line(c, [[6, -2], [6, 12]], 1.2);
      c.restore();
    }
    sparkles(c, [[50, 14, 4], [90, 30, 3.4]]);
  },
  // 5 Sac
  (c) => {
    groundShadow(c, 50, 90, 34, 5);
    tube(c, () => { c.beginPath(); c.moveTo(30, 44); c.quadraticCurveTo(32, 8, 50, 8); c.quadraticCurveTo(68, 8, 70, 44); }, 4, '#B9486F');
    c.beginPath(); c.moveTo(16, 42); c.lineTo(84, 42); c.lineTo(90, 86); c.quadraticCurveTo(50, 94, 10, 86); c.closePath();
    fs(c, '#E8558F', 10, 42, 80, 52, LW, 0.35);
    rr(c, 12, 38, 76, 14, 5, '#FF75A8', LW);
    rr(c, 42, 44, 16, 14, 3, PAL.or, LW * 0.8); el(c, 50, 52, 2.4, 2.4, PAL.orDeep, 0);
    gloss(c, 24, 62, 3, 12, 0.45, 0.2);
  },
  // 6 Chapeau
  (c) => {
    groundShadow(c, 50, 86, 42, 5);
    el(c, 50, 62, 44, 14, '#F0D8A8', LW, 0, 0.3);
    c.beginPath(); c.moveTo(26, 60); c.quadraticCurveTo(24, 20, 50, 18); c.quadraticCurveTo(76, 20, 74, 60); c.quadraticCurveTo(50, 70, 26, 60); c.closePath();
    fs(c, '#F6E2B8', 24, 18, 52, 52, LW, 0.4);
    c.beginPath(); c.moveTo(26.6, 52); c.quadraticCurveTo(50, 62, 73.4, 52); c.lineTo(74, 60); c.quadraticCurveTo(50, 70, 26, 60); c.closePath(); fs(c, PAL.roseVif, 26, 52, 48, 18, LW * 0.8);
    flower(c, 66, 52, 9, '#FFF4E8', PAL.or, 5);
    leaf(c, 62, 56, 10, 0.6); leaf(c, 70, 56, 10, 1.1);
    gloss(c, 38, 30, 7, 3, 0.55, -0.6);
    sparkles(c, [[88, 24, 4], [10, 44, 3.4]]);
  },
  // 7 Malle
  (c) => {
    halo(c, '#FFE7A0', 0.35);
    groundShadow(c, 50, 91, 42, 5);
    c.beginPath(); c.moveTo(10, 40); c.quadraticCurveTo(50, 8, 90, 40); c.lineTo(90, 44); c.lineTo(10, 44); c.closePath();
    fs(c, '#A9744F', 10, 14, 80, 30, LW, 0.3);
    rr(c, 10, 42, 80, 46, 5, '#8B5A3C');
    for (const x of [22, 78]) { rr(c, x - 4, 16, 8, 72, 2, PAL.or, LW * 0.8); }
    for (const y of [50, 64, 78]) line(c, [[26, y], [74, y]], 1, 'rgba(60,30,15,0.3)');
    rr(c, 42, 38, 16, 16, 4, PAL.or, LW * 0.9); el(c, 50, 47, 2.6, 2.6, OUTLINE, 0);
    for (const [x, y] of [[12, 44], [88, 44], [12, 86], [88, 86]] as const) el(c, x, y, 3.4, 3.4, PAL.or, LW * 0.5);
    rr(c, 74, 30, 14, 10, 3, PAL.roseVif, LW * 0.6);
    gloss(c, 34, 26, 8, 2.6, 0.5, -0.4);
    sparkles(c, [[90, 14, 4.4], [8, 22, 3.6]], '#FFF6D0');
  },
  // 8 Sac iconique
  (c) => {
    halo(c, '#FFE7A0', 0.9, 62);
    groundShadow(c, 50, 93, 40, 5);
    // chaîne
    tube(c, () => { c.beginPath(); c.moveTo(24, 38); c.bezierCurveTo(16, -4, 84, -4, 76, 38); }, 3.4, PAL.or);
    c.beginPath(); c.moveTo(12, 38); c.lineTo(88, 38); c.lineTo(94, 88); c.quadraticCurveTo(50, 98, 6, 88); c.closePath();
    fs(c, '#2C2438', 6, 38, 88, 60, LW, 0.2);
    c.save(); c.clip();
    for (let i = -4; i < 14; i++) { line(c, [[i * 10, 36], [i * 10 + 50, 100]], 1.2, 'rgba(255,255,255,0.22)'); line(c, [[i * 10 + 50, 36], [i * 10, 100]], 1.2, 'rgba(255,255,255,0.22)'); }
    c.restore();
    c.beginPath(); c.moveTo(12, 38); c.lineTo(88, 38); c.lineTo(94, 88); c.quadraticCurveTo(50, 98, 6, 88); c.closePath(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    poly(c, [[10, 26], [90, 26], [88, 44], [12, 44]], '#3B3152', LW);
    rr(c, 40, 32, 20, 18, 4, PAL.or, LW);
    heartPath(c, 50, 42, 11); fs(c, PAL.roseVif, 44, 36, 11, 11, LW * 0.5);
    gloss(c, 22, 66, 3, 12, 0.35, 0.2);
    sparkles(c, [[92, 20, 5.6], [8, 24, 5], [50, 6, 4.2], [88, 74, 3.8]], '#FFF6D0');
  },
];

// ============================================================ CASTLE · Objets du château
const BRICK = '#C97B5A';
export const CASTLE: Draw[] = [
  // 1 Brique
  (c) => {
    groundShadow(c, 50, 84, 34, 5);
    poly(c, [[16, 44], [74, 44], [86, 36], [28, 36]], '#E3A184', LW * 0.9);
    poly(c, [[74, 44], [86, 36], [86, 66], [74, 74]], '#A85F42', LW * 0.9);
    rr(c, 16, 44, 58, 30, 3, BRICK);
    for (const [x, y] of [[24, 54], [48, 62], [62, 52]] as const) el(c, x, y, 2.6, 1.6, 'rgba(70,30,20,0.35)', 0);
    gloss(c, 28, 50, 6, 2, 0.5, 0);
  },
  // 2 Bougeoir
  (c) => {
    groundShadow(c, 50, 90, 28, 5);
    el(c, 50, 84, 26, 7, PAL.or, LW, 0, 0.35);
    tube(c, () => { c.beginPath(); c.moveTo(50, 80); c.lineTo(50, 54); }, 6, PAL.orDeep);
    el(c, 50, 66, 8, 4.5, PAL.or, LW * 0.8);
    el(c, 50, 54, 18, 5, PAL.or, LW * 0.8);
    rr(c, 41, 28, 18, 28, 3, '#FFF9EE', LW * 0.9);
    line(c, [[44, 36], [44, 52]], 1.3, 'rgba(120,90,60,0.25)');
    line(c, [[50, 28], [50, 22]], 1.8, OUTLINE);
    glow(c, 50, 16, 20, '#FFD27A', 0.7);
    c.beginPath(); c.moveTo(50, 4); c.bezierCurveTo(60, 14, 58, 24, 50, 24); c.bezierCurveTo(42, 24, 40, 14, 50, 4); c.closePath(); fs(c, '#FFB347', 40, 4, 20, 20, LW * 0.7, 0.4);
    c.beginPath(); c.moveTo(50, 12); c.bezierCurveTo(55, 17, 54, 22, 50, 22); c.bezierCurveTo(46, 22, 45, 17, 50, 12); c.closePath(); c.fillStyle = '#FFF3C0'; c.fill();
  },
  // 3 Coussin
  (c) => {
    groundShadow(c, 50, 84, 38, 5);
    c.beginPath(); c.moveTo(14, 38); c.quadraticCurveTo(50, 28, 86, 38); c.quadraticCurveTo(92, 58, 86, 76); c.quadraticCurveTo(50, 86, 14, 76); c.quadraticCurveTo(8, 58, 14, 38); c.closePath();
    fs(c, '#E8558F', 8, 28, 84, 58, LW, 0.35);
    c.save(); c.clip(); line(c, [[50, 30], [50, 84]], 1.4, 'rgba(120,20,60,0.35)');
    for (const [x, y] of [[32, 54], [68, 54]] as const) { heartPath(c, x, y, 14); c.fillStyle = '#FFD1E0'; c.fill(); }
    c.restore();
    for (const [x, y] of [[10, 34], [90, 34], [10, 80], [90, 80]] as const) { tube(c, () => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + (x < 50 ? -3 : 3), y + (y < 50 ? -4 : 6)); }, 4, PAL.or); el(c, x, y, 4.4, 4.4, PAL.or, LW * 0.7); }
    gloss(c, 28, 44, 8, 3, 0.5, -0.3);
  },
  // 4 Tapis
  (c) => {
    groundShadow(c, 50, 82, 42, 5);
    poly(c, [[22, 34], [78, 34], [94, 76], [6, 76]], '#8E5FD6');
    poly(c, [[28, 40], [72, 40], [84, 70], [16, 70]], '#E8558F', LW * 0.6);
    poly(c, [[34, 46], [66, 46], [74, 64], [26, 64]], '#FFD27A', LW * 0.6);
    heartPath(c, 50, 55, 14); fs(c, PAL.roseVif, 43, 48, 14, 14, LW * 0.6);
    for (let i = 0; i < 8; i++) { line(c, [[8 + i * 12, 76], [7 + i * 12, 84]], 2.2, '#FFF4E8'); }
    for (let i = 0; i < 6; i++) el(c, 25 + i * 10.5, 37, 1.6, 1.6, PAL.or, 0);
    gloss(c, 30, 42, 7, 1.8, 0.4, 0);
  },
  // 5 Fauteuil
  (c) => {
    groundShadow(c, 50, 91, 36, 5);
    for (const x of [22, 78]) rr(c, x - 3, 80, 7, 11, 2, '#6A3C28', LW * 0.8);
    c.beginPath(); c.moveTo(24, 66); c.lineTo(24, 28); c.quadraticCurveTo(50, 6, 76, 28); c.lineTo(76, 66); c.closePath();
    fs(c, '#B9486F', 24, 10, 52, 58, LW, 0.3);
    for (const [x, y] of [[40, 30], [50, 24], [60, 30], [50, 40]] as const) el(c, x, y, 2, 2, PAL.or, LW * 0.4);
    rr(c, 8, 44, 20, 38, 9, '#E8558F');
    rr(c, 72, 44, 20, 38, 9, '#E8558F');
    rr(c, 22, 62, 56, 22, 8, '#FF75A8');
    line(c, [[28, 68], [72, 68]], 1.2, 'rgba(120,20,60,0.3)');
    gloss(c, 34, 74, 8, 2.4, 0.5, 0);
  },
  // 6 Lustre
  (c) => {
    halo(c, '#FFE7A0', 0.5);
    line(c, [[50, 0], [50, 18]], 3, OUTLINE);
    el(c, 50, 20, 5, 5, PAL.or, LW * 0.8);
    tube(c, () => { c.beginPath(); c.moveTo(50, 24); c.quadraticCurveTo(50, 42, 50, 58); }, 5, PAL.orDeep);
    tube(c, () => { c.beginPath(); c.moveTo(50, 46); c.quadraticCurveTo(14, 44, 14, 62); }, 4, PAL.or);
    tube(c, () => { c.beginPath(); c.moveTo(50, 46); c.quadraticCurveTo(86, 44, 86, 62); }, 4, PAL.or);
    tube(c, () => { c.beginPath(); c.moveTo(50, 36); c.quadraticCurveTo(28, 34, 30, 50); }, 3.6, PAL.or);
    tube(c, () => { c.beginPath(); c.moveTo(50, 36); c.quadraticCurveTo(72, 34, 70, 50); }, 3.6, PAL.or);
    for (const [x, y] of [[14, 60], [30, 48], [50, 54], [70, 48], [86, 60]] as const) {
      rr(c, x - 4, y - 8, 8, 12, 2, '#FFF9EE', LW * 0.7);
      glow(c, x, y - 14, 10, '#FFD27A', 0.8);
      c.beginPath(); c.moveTo(x, y - 20); c.bezierCurveTo(x + 5, y - 15, x + 4, y - 11, x, y - 11); c.bezierCurveTo(x - 4, y - 11, x - 5, y - 15, x, y - 20); c.closePath(); c.fillStyle = '#FFB347'; c.fill(); c.lineWidth = 1; c.strokeStyle = OUTLINE; c.stroke();
    }
    for (const [x, y] of [[20, 74], [38, 78], [50, 84], [62, 78], [80, 74], [30, 88], [70, 88]] as const) gem(c, x, y, 5, '#BFE9FF');
    sparkles(c, [[8, 32, 4], [92, 34, 4]], '#FFFFFF');
  },
  // 7 Canapé royal
  (c) => {
    halo(c, '#FFD6F0', 0.4);
    groundShadow(c, 50, 91, 44, 5);
    for (const x of [14, 86]) rr(c, x - 3, 82, 7, 9, 2, PAL.orDeep, LW * 0.8);
    c.beginPath(); c.moveTo(10, 62); c.lineTo(10, 40); c.quadraticCurveTo(30, 12, 50, 26); c.quadraticCurveTo(70, 12, 90, 40); c.lineTo(90, 62); c.closePath();
    fs(c, '#8E2A63', 10, 18, 80, 46, LW, 0.3);
    for (const x of [28, 50, 72]) { heartPath(c, x, 42, 9); c.fillStyle = 'rgba(243,200,107,0.7)'; c.fill(); }
    rr(c, 2, 46, 20, 38, 9, '#B9486F');
    rr(c, 78, 46, 20, 38, 9, '#B9486F');
    rr(c, 14, 60, 72, 24, 8, '#E8558F');
    line(c, [[50, 62], [50, 82]], 1.4, 'rgba(120,20,60,0.4)');
    for (const x of [26, 74]) el(c, x, 62, 3, 3, PAL.or, LW * 0.5);
    el(c, 50, 22, 6, 6, PAL.or, LW * 0.8);
    gloss(c, 30, 70, 9, 2.4, 0.5, 0);
    sparkles(c, [[92, 14, 4.8], [8, 22, 4], [50, 6, 3.4]], '#FFF6D0');
  },
  // 8 Trône doré
  (c) => {
    halo(c, '#FFE7A0', 0.95, 62);
    groundShadow(c, 50, 93, 38, 5);
    // dossier
    c.beginPath(); c.moveTo(26, 70); c.lineTo(26, 26); c.quadraticCurveTo(26, 8, 50, 4); c.quadraticCurveTo(74, 8, 74, 26); c.lineTo(74, 70); c.closePath();
    fs(c, PAL.or, 26, 4, 48, 66, LW, 0.5);
    c.beginPath(); c.moveTo(33, 66); c.lineTo(33, 28); c.quadraticCurveTo(33, 15, 50, 12); c.quadraticCurveTo(67, 15, 67, 28); c.lineTo(67, 66); c.closePath();
    fs(c, '#B9486F', 33, 12, 34, 54, LW * 0.6, 0.3);
    heartPath(c, 50, 36, 16); fs(c, PAL.or, 42, 28, 16, 16, LW * 0.6, 0.5);
    crown(c, 50, 8, 0.42);
    for (const x of [14, 86]) { rr(c, x - 8, 46, 16, 36, 7, PAL.or); el(c, x, 44, 8, 5, PAL.orDeep, LW * 0.8); }
    rr(c, 20, 62, 60, 20, 7, '#E8558F');
    rr(c, 14, 78, 72, 12, 4, PAL.or, LW);
    for (const x of [20, 80]) rr(c, x - 4, 86, 8, 8, 2, PAL.orDeep, LW * 0.7);
    gloss(c, 34, 30, 3, 12, 0.5, 0.2);
    sparkles(c, [[8, 12, 5.4], [92, 14, 5.4], [50, 94, 3.4], [4, 62, 3.6], [96, 60, 3.6]], '#FFF6D0');
  },
];

export const EXTRA_ITEMS: Record<string, Draw[]> = { rare: RARE, choc: CHOC, jewel: JEWEL, cloth: CLOTH, perfume: PERFUME, acc: ACC, castle: CASTLE };
