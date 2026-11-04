/**
 * Générateurs 12 à 14 (pastry, bag, gift) : Four du pâtissier, Vitrine à sacs, Atelier d'emballage.
 * Même style que gens2.ts (repère 100 × 100, anneau lumineux au sol « touche-moi », contour chocolat, étincelles).
 * Autonome (pas d'import depuis generators.ts) pour éviter tout cycle.
 */
import {
  OUTLINE, OUTLINE_RATIO, PAL, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, roundRect, sparkle, shade,
} from './kit';

type C = CanvasRenderingContext2D;
type Draw = (c: C) => void;
const LW = (100 * OUTLINE_RATIO) / 0.9;
const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
function fs(c: C, color: string, x: number, y: number, w: number, h: number, lw = LW, light?: number) {
  fillShaded(c, color, box(x, y, w, h), lw, light !== undefined ? { light } : {});
}
function line(c: C, pts: [number, number][], w = 1.6, col = 'rgba(88,67,63,0.5)') {
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.lineWidth = w; c.strokeStyle = col; c.stroke();
}
function el(c: C, cx: number, cy: number, rx: number, ry: number, col: string, lw = LW, rot = 0) {
  ellipse(c, cx, cy, rx, ry, rot); fs(c, col, cx - rx, cy - ry, rx * 2, ry * 2, lw);
}
function rr(c: C, x: number, y: number, w: number, h: number, r: number, col: string, lw = LW) {
  roundRect(c, x, y, w, h, r); fs(c, col, x, y, w, h, lw);
}
function sparkles(c: C, pts: [number, number, number][], color = '#FFF6D0') {
  for (const [x, y, r] of pts) { sparkle(c, x, y, r + 1.4, OUTLINE, 0.35); sparkle(c, x, y, r, color); }
}
function baseGlow(c: C) {
  glow(c, 50, 84, 40, PAL.or, 0.45);
  ellipse(c, 50, 88, 36, 8); c.lineWidth = 2.4; c.strokeStyle = 'rgba(243,200,107,0.85)'; c.stroke();
  ellipse(c, 50, 88, 30, 6); c.lineWidth = 1.4; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.stroke();
  groundShadow(c, 50, 88, 30, 6, 0.28);
}
function bowTie(c: C, x: number, y: number, s: number, col: string) {
  for (const k of [-1, 1]) {
    c.save(); c.translate(x, y); c.scale(k, 1);
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(s * 0.5, -s * 0.8, s * 1.2, -s * 0.55, s * 1.15, 0); c.bezierCurveTo(s * 1.1, s * 0.45, s * 0.5, s * 0.55, 0, 0); c.closePath();
    fs(c, col, 0, -s * 0.7, s * 1.2, s * 1.2, LW * 0.8);
    c.restore();
  }
  el(c, x, y, s * 0.3, s * 0.3, shade(col, -0.08), LW * 0.8);
}

export const GENS3: Record<number, Draw> = {
  // 12. Four du pâtissier : four rose, fenêtre chaude, macarons en train de cuire
  12: (c) => {
    baseGlow(c);
    rr(c, 16, 34, 68, 50, 9, '#F6A5BE', LW);
    rr(c, 12, 26, 76, 14, 7, '#FFFFFF', LW);
    for (let i = 0; i < 6; i++) el(c, 20 + i * 12, 26, 5.2, 3.6, i % 2 ? '#FFC2D6' : '#FFFFFF', LW * 0.5);
    // fenêtre du four, lueur chaude
    rr(c, 26, 44, 48, 30, 7, '#51446D', LW);
    const g = c.createRadialGradient(50, 62, 2, 50, 62, 28); g.addColorStop(0, '#FFE7A0'); g.addColorStop(1, '#F29A4A');
    roundRect(c, 29, 47, 42, 24, 5); c.fillStyle = g; c.fill();
    // plateau et macarons
    line(c, [[29, 66], [71, 66]], 2, '#8A6B50');
    for (const [x, col] of [[38, '#FF8FB3'], [50, '#B9A5E8'], [62, '#FFE7A0']] as const) { el(c, x, 62, 6, 4.4, col, LW * 0.6); line(c, [[x - 5, 62.5], [x + 5, 62.5]], 1.4, '#FFFFFF'); }
    // poignée et boutons
    line(c, [[28, 40], [72, 40]], 2.6, PAL.or);
    for (const x of [30, 70]) el(c, x, 80, 3, 3, PAL.or, LW * 0.5);
    heartPath(c, 50, 80, 9); c.fillStyle = PAL.roseVif; c.fill(); c.lineWidth = LW * 0.5; c.strokeStyle = OUTLINE; c.stroke();
    gloss(c, 22, 52, 2.4, 9, 0.5, 0.15);
    sparkles(c, [[10, 18, 4.2], [90, 24, 4.6], [88, 60, 3]]);
  },
  // 13. Vitrine à sacs : vitrine vitrée, sac exposé sur un présentoir
  13: (c) => {
    baseGlow(c);
    rr(c, 18, 78, 64, 8, 4, '#C98350', LW);
    // sac exposé
    c.beginPath(); c.moveTo(34, 54); c.lineTo(66, 54); c.lineTo(70, 76); c.quadraticCurveTo(50, 82, 30, 76); c.closePath();
    fs(c, '#C0507A', 30, 54, 40, 28, LW);
    line(c, [[38, 54], [38, 48], [62, 48], [62, 54]], 2.6, PAL.orDeep);
    el(c, 50, 60, 3.4, 3.4, PAL.or, LW * 0.5);
    rr(c, 44, 78, 12, 3, 1.5, '#8A4F2A', LW * 0.4);
    // vitrine
    c.beginPath(); c.moveTo(18, 78); c.lineTo(18, 30); c.quadraticCurveTo(18, 14, 34, 14); c.lineTo(66, 14); c.quadraticCurveTo(82, 14, 82, 30); c.lineTo(82, 78); c.closePath();
    c.fillStyle = 'rgba(214,236,255,0.34)'; c.fill(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    line(c, [[50, 14], [50, 78]], 1.4, 'rgba(88,67,63,0.4)');
    gloss(c, 27, 34, 3.4, 14, 0.6, 0.15);
    rr(c, 38, 6, 24, 9, 4, PAL.or, LW);
    heartPath(c, 50, 11, 6); c.fillStyle = PAL.roseVif; c.fill();
    sparkles(c, [[12, 22, 4.4], [90, 36, 4.2], [88, 70, 3]]);
  },
  // 14. Atelier d'emballage : boîte en cours d'emballage, bobine de ruban
  14: (c) => {
    baseGlow(c);
    rr(c, 16, 52, 52, 32, 5, '#B9A5E8', LW);
    c.beginPath(); c.rect(36, 52, 12, 32); fs(c, '#FFFFFF', 36, 52, 12, 32, LW * 0.8);
    rr(c, 13, 44, 58, 12, 4, '#C9B8F0', LW);
    c.beginPath(); c.rect(36, 44, 12, 12); fs(c, '#FFFFFF', 36, 44, 12, 12, LW * 0.8);
    bowTie(c, 42, 38, 13, PAL.roseDeep);
    // bobine de ruban
    el(c, 76, 72, 13, 13, PAL.roseVif, LW);
    el(c, 76, 72, 5, 5, '#FFF4E8', LW * 0.7);
    for (const r of [8, 10.5]) { ellipse(c, 76, 72, r, r); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,0.5)'; c.stroke(); }
    c.beginPath(); c.moveTo(66, 82); c.quadraticCurveTo(58, 92, 46, 90); c.lineWidth = 4; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 2.4; c.strokeStyle = PAL.roseVif; c.stroke();
    // ciseaux dorés
    line(c, [[72, 36], [88, 54]], 3, PAL.orDeep); line(c, [[88, 36], [72, 54]], 3, PAL.or);
    el(c, 70, 56, 3, 3, 'rgba(0,0,0,0)', LW * 0.6); el(c, 90, 56, 3, 3, 'rgba(0,0,0,0)', LW * 0.6);
    gloss(c, 24, 62, 2.4, 8, 0.5, 0.15);
    sparkles(c, [[12, 28, 4.4], [86, 22, 4.4], [92, 50, 3]]);
  },
};
