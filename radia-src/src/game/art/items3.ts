/**
 * Icônes des 3 collections ajoutées à Endless 2.0 (8 niveaux chacune) :
 * pastry (Pâtisseries), bag (Sacs), gift (Cadeaux).
 * Même repère et même style que items2.ts (100 × 100, contour chocolat, dégradés `fillShaded`, reflet en haut à gauche,
 * ombre au sol) ; les deux derniers niveaux gagnent un halo et des étincelles, le niveau max brille le plus.
 * Fichier autonome (pas d'import depuis items.ts / items2.ts) pour éviter tout cycle.
 * Aucune marque réelle : les sacs « de créateur » sont des créations fictives.
 */
import {
  OUTLINE, OUTLINE_RATIO, PAL, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, roundRect, shade, sparkle, starPath,
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
function sparkles(c: C, pts: [number, number, number][], color = '#FFFFFF') {
  for (const [x, y, r] of pts) { sparkle(c, x, y, r + 1.4, OUTLINE, 0.35); sparkle(c, x, y, r, color); }
}
function halo(c: C, col: string, a = 0.5, r = 54) { glow(c, 50, 52, r, col, a); }
function heart(c: C, x: number, y: number, s: number, col: string = PAL.roseVif) {
  heartPath(c, x, y, s); fs(c, col, x - s / 2, y - s / 2, s, s, LW * 0.55, 0.4);
}
function star(c: C, x: number, y: number, r: number, col: string = PAL.or) {
  starPath(c, x, y, r, r * 0.45, 5); fs(c, col, x - r, y - r, r * 2, r * 2, LW * 0.6, 0.4);
}
function pearl(c: C, x: number, y: number, r: number) {
  el(c, x, y, r, r, '#FFF3F6', LW * 0.6, 0, 0.3);
  gloss(c, x - r * 0.3, y - r * 0.35, r * 0.3, r * 0.2, 0.9, -0.6);
}
function gem(c: C, x: number, y: number, r: number, col: string) {
  poly(c, [[x, y - r], [x + r * 0.9, y - r * 0.15], [x + r * 0.55, y + r * 0.85], [x - r * 0.55, y + r * 0.85], [x - r * 0.9, y - r * 0.15]], col, LW * 0.6, 0.5);
  line(c, [[x - r * 0.9, y - r * 0.15], [x + r * 0.9, y - r * 0.15]], 1, 'rgba(255,255,255,0.7)');
}
/** Nœud de ruban (deux boucles + noeud central). */
function bow(c: C, x: number, y: number, s: number, col: string) {
  for (const k of [-1, 1]) {
    c.save(); c.translate(x, y); c.rotate(k * -0.35); c.scale(k, 1);
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(s * 0.5, -s * 0.8, s * 1.2, -s * 0.55, s * 1.15, 0); c.bezierCurveTo(s * 1.1, s * 0.45, s * 0.5, s * 0.55, 0, 0); c.closePath();
    fs(c, col, 0, -s * 0.7, s * 1.2, s * 1.2, LW * 0.8, 0.35);
    c.restore();
  }
  el(c, x, y, s * 0.3, s * 0.3, shade(col, -0.08), LW * 0.8, 0, 0.4);
}
function rays(c: C, x: number, y: number, n: number, r1: number, r2: number, col = 'rgba(255,231,160,0.5)') {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    c.beginPath(); c.moveTo(x + Math.cos(a - 0.07) * r1, y + Math.sin(a - 0.07) * r1); c.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); c.lineTo(x + Math.cos(a + 0.07) * r1, y + Math.sin(a + 0.07) * r1); c.closePath();
    c.fillStyle = col; c.fill();
  }
}

// ============================================================ PASTRY · Pâtisseries
const PINK = '#F6A5BE';
const CREAM = '#FFF4DA';
const CHOCO = '#7A4A32';
const flame = (c: C, x: number, y: number) => { el(c, x, y, 2.6, 4, '#FFB020', LW * 0.4); el(c, x, y + 0.8, 1.2, 2, '#FFF2A0', 0); };
const cherry = (c: C, x: number, y: number, r = 4.4) => {
  tube(c, () => { c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x + 3, y - r - 7, x + 8, y - r - 8); }, 1.2, PAL.leafDeep);
  el(c, x, y, r, r, '#D6283F', LW * 0.7, 0, 0.4); gloss(c, x - r * 0.3, y - r * 0.35, r * 0.28, r * 0.2, 0.9);
};

export const PASTRY: Draw[] = [
  // 1 Macaron
  (c) => {
    groundShadow(c, 50, 78, 32, 5);
    // pied du bas, crème, coque du haut
    for (let i = 0; i < 9; i++) { const x = 25 + i * 6.2; el(c, x, 64, 3.1, 2.8, shade(PINK, -0.08), 0, 0); }
    c.beginPath(); c.moveTo(20, 62); c.quadraticCurveTo(50, 80, 80, 62); c.lineTo(80, 58); c.lineTo(20, 58); c.closePath();
    fs(c, PINK, 20, 56, 60, 24, LW, 0.3);
    rr(c, 17, 53, 66, 11, 5.5, '#FFFFFF', LW * 0.8, 0.1);
    c.beginPath(); c.moveTo(18, 53); c.bezierCurveTo(16, 24, 84, 24, 82, 53); c.closePath();
    fs(c, '#FF8FB3', 16, 28, 68, 26, LW, 0.35);
    for (let i = 0; i < 9; i++) { const x = 24 + i * 6.5; el(c, x, 52.5, 3.2, 2.6, shade('#FF8FB3', -0.06), 0, 0); }
    gloss(c, 34, 38, 9, 3.6, 0.65, -0.35);
    sparkles(c, [[82, 26, 4.6], [14, 40, 3]]);
  },
  // 2 Éclair
  (c) => {
    groundShadow(c, 50, 78, 38, 5);
    c.save(); c.translate(50, 54); c.rotate(-0.12);
    rr(c, -40, -3, 80, 22, 11, '#F3C27C', LW, 0.32);
    rr(c, -40, -22, 80, 24, 12, '#F7D49A', LW, 0.35);
    // crème
    rr(c, -37, -5, 74, 9, 4, CREAM, LW * 0.6, 0.05);
    // glaçage chocolat ondulé
    c.beginPath(); c.moveTo(-38, -14); c.bezierCurveTo(-34, -30, 34, -30, 38, -14);
    for (let i = 0; i < 7; i++) { const x = 38 - i * 12.6; c.quadraticCurveTo(x - 3, -4 + (i % 2) * 3, x - 6.3, -9); }
    c.closePath(); fs(c, CHOCO, -38, -28, 76, 24, LW, 0.28);
    line(c, [[-26, -20], [-6, -22]], 2.2, 'rgba(255,255,255,0.45)');
    for (const x of [-22, -4, 14, 28]) el(c, x, -16, 1.6, 1.2, '#FFE7A0', 0);
    gloss(c, -26, -22, 6, 2, 0.7, -0.1);
    c.restore();
    sparkles(c, [[84, 30, 4], [14, 34, 3]]);
  },
  // 3 Tartelette
  (c) => {
    groundShadow(c, 50, 86, 34, 5);
    poly(c, [[16, 52], [84, 52], [74, 84], [26, 84]], '#E3A760', LW, 0.35);
    for (let i = 0; i < 7; i++) line(c, [[22 + i * 9.4, 54], [28 + i * 7.9, 83]], 1.4, 'rgba(120,70,30,0.4)');
    el(c, 50, 50, 36, 11, '#E3A760', LW, 0, 0.3);
    el(c, 50, 49, 31, 8, CREAM, LW * 0.6, 0, 0.1);
    for (const [x, y, col] of [[36, 44, '#D6283F'], [50, 41, '#E8484F'], [64, 44, '#D6283F'], [43, 50, '#B7203A'], [58, 50, '#E8484F']] as const) {
      el(c, x, y, 7.5, 6.5, col, LW * 0.7, 0, 0.4);
      for (const [dx, dy] of [[-2, -1], [2, 0], [0, 2.4]] as const) el(c, x + dx, y + dy, 0.8, 1.1, '#FFE7A0', 0);
    }
    el(c, 52, 34, 5, 3, PAL.leaf, LW * 0.6, -0.5, 0.4);
    gloss(c, 33, 41, 4, 1.6, 0.8, -0.5);
    sparkles(c, [[84, 36, 4], [16, 34, 3]]);
  },
  // 4 Cupcake
  (c) => {
    groundShadow(c, 50, 90, 30, 5);
    poly(c, [[22, 54], [78, 54], [70, 90], [30, 90]], '#C9B8F0', LW, 0.35);
    for (let i = 0; i < 6; i++) line(c, [[30 + i * 8, 56], [34 + i * 6.4, 89]], 1.6, 'rgba(81,68,109,0.35)');
    el(c, 50, 52, 30, 8, '#F6A5BE', LW, 0, 0.3);
    el(c, 50, 42, 25, 10, '#FFC2D6', LW, 0, 0.35);
    el(c, 50, 31, 18, 8.5, '#FF9CC0', LW, 0, 0.35);
    el(c, 50, 22, 10, 6, '#FFC2D6', LW, 0, 0.35);
    cherry(c, 50, 14, 5);
    for (const [x, y, col] of [[36, 41, '#FFFFFF'], [60, 38, '#F3C86B'], [46, 47, '#B9A5E8'], [66, 46, '#FFFFFF'], [52, 29, '#F3C86B'], [42, 31, '#FFFFFF']] as const) {
      c.save(); c.translate(x, y); c.rotate(x * 0.2); rr(c, -3, -1, 6, 2.2, 1, col, 0); c.restore();
    }
    gloss(c, 38, 36, 6, 2.2, 0.7, -0.5);
    sparkles(c, [[84, 40, 4.4], [14, 30, 3.2]]);
  },
  // 5 Gâteau
  (c) => {
    groundShadow(c, 50, 90, 40, 5);
    el(c, 50, 86, 42, 8, '#FFFFFF', LW, 0, 0.2);
    rr(c, 14, 50, 72, 36, 6, '#F4C9A0', LW, 0.3);
    line(c, [[14, 68], [86, 68]], 1.4, 'rgba(120,70,30,0.35)');
    rr(c, 14, 64, 72, 6, 2, CREAM, LW * 0.5, 0.05);
    // glaçage + gouttes
    c.beginPath(); c.moveTo(14, 54); c.quadraticCurveTo(14, 44, 24, 44); c.lineTo(76, 44); c.quadraticCurveTo(86, 44, 86, 54);
    for (let i = 0; i < 6; i++) { const x = 86 - i * 14.4; c.lineTo(x - 2, 54 + (i % 2) * 9); c.quadraticCurveTo(x - 7.2, 62 + (i % 2) * 5, x - 12.4, 54 + ((i + 1) % 2) * 9); }
    c.closePath(); fs(c, '#FF8FB3', 14, 44, 72, 24, LW, 0.3);
    el(c, 50, 44, 36, 6, '#FFC2D6', LW * 0.8, 0, 0.35);
    // bougies
    for (const x of [34, 50, 66]) { rr(c, x - 2.4, 28, 4.8, 17, 2, x === 50 ? '#B9A5E8' : '#FFFFFF', LW * 0.6); line(c, [[x - 2, 33], [x + 2, 31]], 1, 'rgba(232,85,143,0.7)'); flame(c, x, 23); }
    for (const x of [24, 76]) cherry(c, x, 39, 3.8);
    heart(c, 50, 58, 10, '#FFFFFF');
    gloss(c, 24, 58, 3, 6, 0.4, 0.15);
    sparkles(c, [[90, 20, 4.6], [10, 24, 3.6]]);
  },
  // 6 Entremets
  (c) => {
    halo(c, '#FFC2D6', 0.5, 56);
    groundShadow(c, 50, 90, 40, 5);
    rr(c, 14, 40, 72, 48, 6, '#7A4A32', LW, 0.28);
    // couches vues sur la tranche
    for (const [y, h, col] of [[44, 9, '#F7D49A'], [58, 7, '#C0507A'], [68, 9, '#FFF4DA'], [80, 7, '#5A3322']] as const) { c.save(); roundRect(c, 14, 40, 72, 48, 6); c.clip(); c.fillStyle = col; c.fillRect(14, y, 72, h); c.restore(); }
    c.beginPath(); roundRect(c, 14, 40, 72, 48, 6); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    // nappage miroir
    rr(c, 11, 26, 78, 20, 8, '#C0507A', LW, 0.35);
    el(c, 50, 30, 36, 5.5, '#E27AA0', 0, 0, 0.4);
    line(c, [[20, 33], [44, 32]], 2.4, 'rgba(255,255,255,0.55)');
    // décor : rose en chocolat blanc, feuilles d'or, framboises
    for (const [dx, dy] of [[-8, 2], [8, 2], [0, -6], [0, 8]] as const) el(c, 50 + dx, 22 + dy, 7, 5, '#FFFFFF', LW * 0.6, dx ? 0.6 * Math.sign(dx) : 0, 0.15);
    el(c, 50, 22, 4, 4, '#F6A5BE', LW * 0.6);
    for (const x of [28, 72]) { el(c, x, 22, 5.5, 5, '#D6283F', LW * 0.7, 0, 0.4); }
    for (const [x, y] of [[22, 54], [78, 74], [64, 56], [32, 76]] as const) star(c, x, y, 3, PAL.or);
    gloss(c, 22, 60, 2.6, 8, 0.35, 0.1);
    sparkles(c, [[88, 18, 5.4], [10, 16, 4.4], [50, 8, 3.6]]);
  },
  // 7 Pièce montée
  (c) => {
    halo(c, '#FFE7A0', 0.7, 60);
    groundShadow(c, 50, 92, 38, 5);
    el(c, 50, 90, 38, 7, '#FFFFFF', LW, 0, 0.2);
    // choux empilés (étages 5 · 4 · 3 · 2 · 1)
    const rows: [number, number, number][] = [[5, 80, 10], [4, 65, 9], [3, 51, 8], [2, 38, 7], [1, 27, 6.4]];
    for (const [n, y, r] of rows) {
      for (let k = 0; k < n; k++) {
        const x = 50 + (k - (n - 1) / 2) * (r * 1.85);
        el(c, x, y, r, r * 0.92, '#F1BE74', LW * 0.85, 0, 0.35);
        c.save(); ellipse(c, x, y, r, r * 0.92); c.clip(); el(c, x, y - r * 0.38, r, r * 0.62, '#F6D9A2', 0, 0, 0.4); c.restore();
        gloss(c, x - r * 0.3, y - r * 0.32, r * 0.28, r * 0.16, 0.7);
      }
    }
    // fils de caramel
    for (const [x1, x2] of [[34, 62], [62, 38], [44, 70]] as const) tube(c, () => { c.beginPath(); c.moveTo(x1, 76); c.quadraticCurveTo(50, 40, x2, 18); }, 0.9, '#E0A24A');
    star(c, 50, 14, 7, PAL.or);
    for (const [x, y] of [[26, 70], [75, 60], [36, 46], [64, 40]] as const) heart(c, x, y, 6.5, '#FF9CC0');
    sparkles(c, [[88, 24, 5.6], [10, 36, 4.8], [90, 70, 3.8], [14, 74, 3.4]], '#FFF6D0');
  },
  // 8 Pâtisserie royale
  (c) => {
    halo(c, '#FFE7A0', 0.95, 66);
    rays(c, 50, 50, 14, 34, 62);
    groundShadow(c, 50, 94, 42, 5);
    // piédestal
    rr(c, 28, 88, 44, 7, 3, PAL.or, LW);
    poly(c, [[44, 80], [56, 80], [60, 88], [40, 88]], PAL.or, LW * 0.8);
    el(c, 50, 79, 42, 6, '#FFFFFF', LW, 0, 0.25);
    // trois étages
    for (const [y, w, h, col] of [[62, 70, 18, '#FFC2D6'], [46, 52, 16, '#FFFFFF'], [31, 36, 15, '#FF9CC0']] as const) {
      rr(c, 50 - w / 2, y, w, h, 5, col, LW, 0.3);
      el(c, 50, y + 1, w / 2, 4.5, shade(col, 0.08), LW * 0.7, 0, 0.4);
      for (let i = 0; i < Math.floor(w / 9); i++) pearl(c, 50 - w / 2 + 6 + i * 9, y + h - 3, 2.6);
    }
    for (const [x, y] of [[30, 71], [70, 71], [50, 54], [40, 38], [60, 38]] as const) heart(c, x, y, 7, '#E8558F');
    // couronne dorée
    poly(c, [[38, 28], [36, 14], [44, 21], [50, 10], [56, 21], [64, 14], [62, 28]], PAL.or, LW * 0.85, 0.4);
    for (const x of [36, 50, 64]) el(c, x, x === 50 ? 10 : 14, 2.6, 2.6, PAL.roseVif, LW * 0.5);
    gem(c, 50, 22, 4.4, '#FF75A8');
    sparkles(c, [[90, 18, 6.4], [8, 22, 5.6], [88, 64, 4.6], [10, 60, 4.2], [50, 4, 4]], '#FFF6D0');
  },
];

// ============================================================ BAG · Sacs
const LEATHER = '#B9703F';
const clasp = (c: C, x: number, y: number, r = 4.2) => { el(c, x, y, r, r, PAL.or, LW * 0.7, 0, 0.45); gloss(c, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.2, 0.9); };

export const BAG: Draw[] = [
  // 1 Pochette
  (c) => {
    groundShadow(c, 50, 82, 36, 5);
    rr(c, 16, 38, 68, 42, 8, '#FF9CC0', LW, 0.32);
    // rabat arrondi + fermoir cœur
    c.beginPath(); c.moveTo(16, 46); c.lineTo(84, 46); c.lineTo(84, 54); c.quadraticCurveTo(50, 72, 16, 54); c.closePath();
    fs(c, '#FF75A8', 16, 40, 68, 28, LW, 0.3);
    line(c, [[22, 51], [78, 51]], 1.2, 'rgba(255,255,255,0.45)');
    heart(c, 50, 62, 11, PAL.or);
    gloss(c, 26, 46, 7, 2.2, 0.6, -0.1);
    sparkles(c, [[82, 30, 4.4], [14, 32, 3.2]]);
  },
  // 2 Tote bag
  (c) => {
    groundShadow(c, 50, 90, 32, 5);
    tube(c, () => { c.beginPath(); c.moveTo(34, 44); c.bezierCurveTo(32, 6, 68, 6, 66, 44); }, 3.6, '#E9D7B4');
    poly(c, [[20, 40], [80, 40], [84, 90], [16, 90]], '#F3E6C8', LW, 0.35);
    line(c, [[20, 48], [80, 48]], 1.4, 'rgba(120,90,50,0.35)');
    heart(c, 50, 66, 22, PAL.roseVif);
    for (const [x, y] of [[32, 60], [68, 58], [60, 78], [38, 80]] as const) star(c, x, y, 3.2, '#B9A5E8');
    gloss(c, 27, 56, 2.8, 8, 0.45, 0.15);
    sparkles(c, [[88, 34, 4.2]]);
  },
  // 3 Besace
  (c) => {
    groundShadow(c, 50, 88, 38, 5);
    tube(c, () => { c.beginPath(); c.moveTo(18, 42); c.bezierCurveTo(10, -6, 90, -6, 82, 42); }, 3.6, '#8A4F2A');
    rr(c, 14, 40, 72, 46, 8, LEATHER, LW, 0.3);
    c.beginPath(); c.moveTo(14, 46); c.lineTo(86, 46); c.lineTo(86, 62); c.quadraticCurveTo(50, 78, 14, 62); c.closePath();
    fs(c, '#C98350', 14, 40, 72, 36, LW, 0.32);
    for (let i = 0; i < 12; i++) el(c, 19 + i * 5.6, 48 + Math.sin((i / 11) * Math.PI) * 0.0, 0.9, 0.9, 'rgba(255,240,200,0.8)', 0);
    rr(c, 44, 52, 12, 24, 3, '#8A4F2A', LW * 0.8, 0.2);
    rr(c, 41, 70, 18, 11, 3, PAL.or, LW * 0.8, 0.4);
    el(c, 50, 75.5, 2, 2, '#8A4F2A', 0);
    gloss(c, 26, 52, 6, 2, 0.5, -0.1);
  },
  // 4 Cabas
  (c) => {
    groundShadow(c, 50, 90, 36, 5);
    for (const [x1, x2] of [[26, 22], [74, 78]] as const) tube(c, () => { c.beginPath(); c.moveTo(x1, 42); c.bezierCurveTo(x1 - 4, 8, x2 + 4, 8, x2, 42); }, 3, '#C98350');
    c.beginPath(); c.moveTo(14, 40); c.lineTo(86, 40); c.lineTo(78, 88); c.quadraticCurveTo(50, 94, 22, 88); c.closePath();
    fs(c, '#EBC183', 14, 40, 72, 52, LW, 0.35);
    c.save(); c.clip();
    for (let i = 0; i < 6; i++) line(c, [[10, 46 + i * 8], [90, 46 + i * 8]], 1.6, 'rgba(150,100,50,0.5)');
    for (let i = 0; i < 12; i++) line(c, [[16 + i * 6.4, 40], [18 + i * 5.6, 92]], 1.2, 'rgba(150,100,50,0.4)');
    c.restore();
    rr(c, 11, 36, 78, 10, 5, '#F5D6A0', LW, 0.35);
    // fleurs qui dépassent
    for (const [x, col] of [[34, '#FF75A8'], [50, '#FFE7A0'], [66, '#B9A5E8']] as const) {
      line(c, [[x, 38], [x + (x - 50) * 0.2, 24]], 2, PAL.leafDeep);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; el(c, x + (x - 50) * 0.2 + Math.cos(a) * 4, 22 + Math.sin(a) * 4, 3.4, 3, col, LW * 0.4, a); }
      el(c, x + (x - 50) * 0.2, 22, 2, 2, PAL.or, 0);
    }
    heart(c, 50, 68, 14, PAL.roseVif);
    sparkles(c, [[88, 24, 4.2]]);
  },
  // 5 Sac à main
  (c) => {
    groundShadow(c, 50, 90, 40, 5);
    tube(c, () => { c.beginPath(); c.moveTo(32, 46); c.bezierCurveTo(28, 10, 72, 10, 68, 46); }, 3.4, '#8E3B5E');
    c.beginPath(); c.moveTo(14, 46); c.lineTo(86, 46); c.lineTo(92, 86); c.quadraticCurveTo(50, 96, 8, 86); c.closePath();
    fs(c, '#C0507A', 8, 46, 84, 48, LW, 0.3);
    rr(c, 10, 40, 80, 14, 6, '#D96A92', LW, 0.35);
    line(c, [[16, 70], [84, 72]], 1.2, 'rgba(255,255,255,0.35)');
    rr(c, 41, 44, 18, 14, 4, PAL.or, LW * 0.8, 0.4);
    el(c, 50, 51, 2.4, 2.4, '#8E3B5E', 0);
    clasp(c, 22, 48, 3); clasp(c, 78, 48, 3);
    gloss(c, 24, 66, 3, 10, 0.4, 0.15);
    sparkles(c, [[90, 30, 4.4], [8, 34, 3.4]]);
  },
  // 6 Sac du soir
  (c) => {
    halo(c, '#E7C9FF', 0.55, 56);
    groundShadow(c, 50, 88, 34, 5);
    tube(c, () => { c.beginPath(); c.moveTo(26, 40); c.bezierCurveTo(10, -10, 90, -10, 74, 40); }, 2.4, PAL.or);
    for (let i = 0; i < 9; i++) { const t = (i + 0.5) / 9; const x = 26 + (74 - 26) * t; const y = 40 - Math.sin(t * Math.PI) * 38; el(c, x, y, 1.9, 1.5, '#FFF3C0', 0); }
    c.beginPath(); c.moveTo(18, 44); c.quadraticCurveTo(50, 36, 82, 44); c.lineTo(86, 82); c.quadraticCurveTo(50, 92, 14, 82); c.closePath();
    fs(c, '#51446D', 14, 36, 72, 56, LW, 0.3);
    c.save(); c.clip();
    for (let i = 0; i < 36; i++) { const x = 16 + ((i * 37) % 70); const y = 40 + ((i * 53) % 50); sparkle(c, x, y, 1.6 + (i % 3) * 0.6, i % 2 ? '#FFFFFF' : '#E7C9FF'); }
    c.restore();
    c.beginPath(); c.moveTo(18, 44); c.quadraticCurveTo(50, 36, 82, 44); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    gem(c, 50, 54, 7, '#FF75A8');
    gloss(c, 24, 58, 2.6, 9, 0.4, 0.15);
    sparkles(c, [[88, 24, 5], [10, 30, 4.4], [78, 80, 3.4]]);
  },
  // 7 Sac de créateur
  (c) => {
    halo(c, '#D8C6FF', 0.7, 60);
    groundShadow(c, 50, 91, 40, 5);
    tube(c, () => { c.beginPath(); c.moveTo(22, 40); c.bezierCurveTo(14, -6, 86, -6, 78, 40); }, 3, PAL.or);
    for (let i = 0; i < 10; i++) { const t = (i + 0.5) / 10; const x = 22 + 56 * t; const y = 40 - Math.sin(t * Math.PI) * 36; line(c, [[x - 1.5, y - 1], [x + 1.5, y + 1]], 1, 'rgba(150,100,20,0.6)'); }
    c.beginPath(); c.moveTo(12, 38); c.lineTo(88, 38); c.lineTo(92, 86); c.quadraticCurveTo(50, 96, 8, 86); c.closePath();
    fs(c, '#B9A5E8', 8, 38, 84, 58, LW, 0.32);
    c.save(); c.clip();
    for (let i = -4; i < 14; i++) { line(c, [[i * 10, 36], [i * 10 + 50, 100]], 1.3, 'rgba(81,68,109,0.35)'); line(c, [[i * 10 + 50, 36], [i * 10, 100]], 1.3, 'rgba(81,68,109,0.35)'); }
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) el(c, 20 + i * 12 + (j % 2) * 6, 50 + j * 11, 0.9, 0.9, 'rgba(255,255,255,0.7)', 0);
    c.restore();
    c.beginPath(); c.moveTo(12, 38); c.lineTo(88, 38); c.lineTo(92, 86); c.quadraticCurveTo(50, 96, 8, 86); c.closePath(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    rr(c, 8, 28, 84, 16, 6, '#8E7BC4', LW, 0.3);
    rr(c, 38, 30, 24, 22, 6, PAL.or, LW, 0.45);
    heart(c, 50, 41, 14, '#FF75A8');
    gloss(c, 22, 66, 3, 12, 0.35, 0.2);
    sparkles(c, [[92, 18, 5.4], [8, 22, 4.8], [50, 6, 4], [90, 74, 3.6]], '#FFF6D0');
  },
  // 8 Sac légendaire
  (c) => {
    halo(c, '#FFE7A0', 1, 68);
    rays(c, 50, 54, 14, 34, 62);
    groundShadow(c, 50, 93, 42, 5);
    tube(c, () => { c.beginPath(); c.moveTo(22, 38); c.bezierCurveTo(14, -8, 86, -8, 78, 38); }, 3.6, PAL.orDeep);
    for (let i = 0; i < 8; i++) { const t = (i + 0.5) / 8; const x = 22 + 56 * t; const y = 38 - Math.sin(t * Math.PI) * 38; pearl(c, x, y, 2.4); }
    c.beginPath(); c.moveTo(12, 38); c.lineTo(88, 38); c.lineTo(94, 88); c.quadraticCurveTo(50, 98, 6, 88); c.closePath();
    fs(c, '#F3C86B', 6, 38, 88, 60, LW, 0.4);
    c.save(); c.clip();
    for (let i = 0; i < 40; i++) { const x = 10 + ((i * 41) % 82); const y = 42 + ((i * 29) % 50); gem(c, x, y, 2.6 + (i % 3) * 0.5, ['#FF75A8', '#8FD3FF', '#FFFFFF', '#E7C9FF'][i % 4]); }
    c.restore();
    c.beginPath(); c.moveTo(12, 38); c.lineTo(88, 38); c.lineTo(94, 88); c.quadraticCurveTo(50, 98, 6, 88); c.closePath(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    rr(c, 8, 26, 84, 18, 7, PAL.orDeep, LW, 0.35);
    // fermoir couronne
    poly(c, [[36, 44], [32, 26], [42, 34], [50, 20], [58, 34], [68, 26], [64, 44]], '#FFF1B8', LW * 0.9, 0.4);
    for (const [x, y] of [[32, 26], [50, 20], [68, 26]] as const) el(c, x, y, 3.2, 3.2, PAL.roseVif, LW * 0.5);
    gem(c, 50, 38, 5, '#8FD3FF');
    sparkles(c, [[92, 16, 6.4], [8, 20, 5.8], [50, 4, 4.4], [92, 68, 4.4], [8, 64, 4]], '#FFF6D0');
  },
];

// ============================================================ GIFT · Cadeaux
const RB = '#E8558F';
function giftBox(c: C, x: number, y: number, w: number, h: number, col: string, rib = RB, lid = true) {
  rr(c, x, y, w, h, 4, col, LW, 0.3);
  if (lid) rr(c, x - 3, y - 1, w + 6, Math.max(9, h * 0.22), 4, shade(col, 0.06), LW, 0.35);
  // ruban vertical
  c.beginPath(); c.rect(x + w / 2 - 5, y - 1, 10, h + 1); fs(c, rib, x + w / 2 - 5, y, 10, h, LW * 0.8, 0.35);
  if (lid) { c.beginPath(); c.rect(x + w / 2 - 5, y - 1, 10, Math.max(9, h * 0.22)); fs(c, rib, x + w / 2 - 5, y, 10, 9, LW * 0.8, 0.35); }
}

export const GIFT: Draw[] = [
  // 1 Nœud
  (c) => {
    groundShadow(c, 50, 78, 30, 5);
    // rubans qui pendent
    poly(c, [[44, 52], [34, 86], [44, 80], [48, 88], [52, 56]], shade(RB, -0.06), LW * 0.8);
    poly(c, [[56, 52], [66, 86], [56, 80], [52, 88], [48, 56]], RB, LW * 0.8);
    bow(c, 50, 48, 30, RB);
    gloss(c, 36, 38, 6, 2.4, 0.7, -0.4);
    sparkles(c, [[84, 30, 4.4], [14, 62, 3.4]]);
  },
  // 2 Petit mot
  (c) => {
    groundShadow(c, 50, 86, 32, 5);
    c.save(); c.translate(50, 52); c.rotate(-0.1);
    rr(c, -30, -26, 60, 52, 5, '#FFF9EE', LW, 0.2);
    // lignes d'écriture
    for (let i = 0; i < 3; i++) line(c, [[-20, -8 + i * 9], [i === 2 ? 4 : 16, -8 + i * 9]], 1.4, 'rgba(232,85,143,0.55)');
    heart(c, 16, 14, 10, PAL.roseVif);
    // ficelle + ruban
    tube(c, () => { c.beginPath(); c.moveTo(0, -26); c.quadraticCurveTo(-12, -42, -22, -34); }, 1.4, PAL.or);
    c.restore();
    bow(c, 50, 30, 11, RB);
    el(c, 44, 34, 2.4, 2.4, PAL.or, LW * 0.5);
    sparkles(c, [[86, 36, 4.6], [12, 30, 3.2]]);
  },
  // 3 Paquet
  (c) => {
    groundShadow(c, 50, 88, 32, 5);
    rr(c, 20, 40, 60, 46, 5, '#FFC2D6', LW, 0.32);
    c.save(); roundRect(c, 20, 40, 60, 46, 5); c.clip();
    for (let i = 0; i < 6; i++) { el(c, 28 + (i % 3) * 20, 52 + Math.floor(i / 3) * 20, 3, 3, 'rgba(255,255,255,0.7)', 0); }
    c.restore();
    c.beginPath(); c.rect(44, 40, 12, 46); fs(c, '#FFFFFF', 44, 40, 12, 46, LW * 0.8, 0.1);
    c.beginPath(); c.rect(20, 56, 60, 10); fs(c, '#FFFFFF', 20, 56, 60, 10, LW * 0.8, 0.1);
    bow(c, 50, 38, 15, RB);
    gloss(c, 28, 50, 2.6, 6, 0.5, 0.15);
    sparkles(c, [[86, 40, 4.4], [12, 36, 3.4]]);
  },
  // 4 Boîte à ruban
  (c) => {
    groundShadow(c, 50, 90, 38, 5);
    // boîte ronde
    c.beginPath(); c.moveTo(16, 52); c.lineTo(84, 52); c.lineTo(80, 86); c.quadraticCurveTo(50, 98, 20, 86); c.closePath();
    fs(c, '#B9A5E8', 16, 52, 68, 44, LW, 0.3);
    ellipse(c, 50, 52, 38, 11); fs(c, '#C9B8F0', 12, 41, 76, 22, LW, 0.35);
    c.beginPath(); c.moveTo(12, 52); c.quadraticCurveTo(50, 70, 88, 52); c.lineTo(86, 62); c.quadraticCurveTo(50, 80, 14, 62); c.closePath(); fs(c, '#9B82E0', 12, 52, 76, 28, LW * 0.8, 0.25);
    // ruban en croix
    tube(c, () => { c.beginPath(); c.moveTo(50, 52); c.lineTo(50, 94); }, 7, RB);
    el(c, 50, 42, 6, 3, shade(RB, 0.08), LW * 0.6);
    bow(c, 50, 36, 14, RB);
    for (const [x, y] of [[26, 70], [74, 72], [34, 82]] as const) heart(c, x, y, 7, '#FFFFFF');
    sparkles(c, [[88, 34, 4.6], [10, 40, 3.4]]);
  },
  // 5 Coffret cadeau
  (c) => {
    halo(c, '#FFC2D6', 0.4, 50);
    groundShadow(c, 50, 90, 40, 5);
    giftBox(c, 16, 46, 68, 42, '#7FC48A', RB);
    c.save(); roundRect(c, 16, 46, 68, 42, 4); c.clip();
    for (let i = -2; i < 8; i++) line(c, [[i * 14, 100], [i * 14 + 40, 40]], 5, 'rgba(255,255,255,0.22)');
    c.restore();
    bow(c, 50, 42, 17, RB);
    // étiquette
    c.save(); c.translate(70, 64); c.rotate(0.15);
    rr(c, -9, -7, 18, 14, 3, '#FFF9EE', LW * 0.7, 0.1);
    heart(c, 0, 0, 7, PAL.roseVif);
    c.restore();
    tube(c, () => { c.beginPath(); c.moveTo(56, 46); c.quadraticCurveTo(64, 54, 66, 58); }, 1, PAL.or);
    gloss(c, 24, 62, 2.6, 8, 0.45, 0.15);
    sparkles(c, [[88, 34, 5], [12, 38, 3.8], [84, 80, 3]]);
  },
  // 6 Grand coffret
  (c) => {
    halo(c, '#FFD7A8', 0.55, 56);
    groundShadow(c, 50, 92, 42, 5);
    giftBox(c, 10, 56, 80, 34, '#B9A5E8', '#F3C86B');
    giftBox(c, 24, 28, 52, 30, '#FF9CC0', '#FFFFFF');
    bow(c, 50, 25, 16, PAL.or);
    for (const [x, y] of [[20, 76], [78, 74], [34, 42], [68, 44]] as const) star(c, x, y, 4, '#FFFFFF');
    gloss(c, 18, 70, 2.6, 8, 0.45, 0.15);
    sparkles(c, [[90, 26, 5.4], [8, 28, 4.6], [50, 8, 3.6], [92, 70, 3.6]], '#FFF6D0');
  },
  // 7 Surprise étoilée
  (c) => {
    halo(c, '#FFE7A0', 0.8, 62);
    rays(c, 50, 40, 12, 24, 50, 'rgba(255,231,160,0.45)');
    groundShadow(c, 50, 93, 38, 5);
    giftBox(c, 18, 56, 64, 36, '#6C8FE0', '#F3C86B', false);
    // couvercle soulevé
    c.save(); c.translate(50, 44); c.rotate(-0.22);
    rr(c, -38, -9, 76, 17, 5, '#8FAAF0', LW, 0.4);
    c.beginPath(); c.rect(-5, -9, 10, 17); fs(c, '#F3C86B', -5, -9, 10, 17, LW * 0.8, 0.35);
    bow(c, 0, -12, 11, '#F3C86B');
    c.restore();
    // étoiles qui s'échappent
    star(c, 34, 24, 8, '#FFE7A0'); star(c, 62, 14, 10, PAL.or); star(c, 78, 34, 6, '#FFFFFF'); star(c, 20, 38, 5, '#FFFFFF');
    heart(c, 48, 36, 8, PAL.roseVif);
    for (const [x, y] of [[30, 72], [70, 80], [50, 68]] as const) star(c, x, y, 3.4, '#FFE7A0');
    sparkles(c, [[90, 14, 5.8], [8, 14, 5], [92, 56, 3.8], [10, 60, 3.6]], '#FFF6D0');
  },
  // 8 Cadeau royal
  (c) => {
    halo(c, '#FFE7A0', 1, 68);
    rays(c, 50, 52, 16, 32, 64);
    groundShadow(c, 50, 94, 44, 5);
    giftBox(c, 12, 46, 76, 46, '#8E3B5E', '#F3C86B');
    c.save(); roundRect(c, 12, 46, 76, 46, 4); c.clip();
    for (let i = -2; i < 9; i++) line(c, [[i * 14, 100], [i * 14 + 40, 40]], 6, 'rgba(255,215,120,0.16)');
    for (const [x, y] of [[28, 72], [72, 72], [28, 58], [72, 58]] as const) heart(c, x, y, 8, '#FF9CC0');
    c.restore();
    c.beginPath(); c.rect(12, 62, 76, 8); fs(c, PAL.or, 12, 62, 76, 8, LW * 0.7, 0.4);
    bow(c, 50, 46, 19, PAL.or);
    // couronne
    poly(c, [[36, 30], [32, 12], [42, 21], [50, 6], [58, 21], [68, 12], [64, 30]], '#FFF1B8', LW * 0.9, 0.45);
    for (const [x, y] of [[32, 12], [50, 6], [68, 12]] as const) el(c, x, y, 3.2, 3.2, PAL.roseVif, LW * 0.5);
    gem(c, 50, 22, 5, '#FF75A8');
    gloss(c, 20, 66, 2.6, 10, 0.4, 0.15);
    sparkles(c, [[92, 20, 6.4], [8, 24, 5.8], [92, 70, 4.6], [8, 70, 4.2], [50, 2, 3.6]], '#FFF6D0');
  },
];

export const EXTRA_ITEMS3: Record<string, Draw[]> = { pastry: PASTRY, bag: BAG, gift: GIFT };
