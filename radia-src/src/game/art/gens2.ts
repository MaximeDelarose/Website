/**
 * Générateurs 5 à 11 (rare, choc, jewel, cloth, perfume, acc, castle).
 * Même style que generators.ts : repère 100 × 100, anneau lumineux au sol
 * (« touche-moi »), contour chocolat, étincelles. Autonome (pas d'import
 * depuis generators.ts) pour éviter tout cycle.
 */
import {
  OUTLINE, OUTLINE_RATIO, PAL, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, roundRect, sparkle,
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
function tube(c: C, path: () => void, width: number, color: string) {
  path(); c.lineWidth = width + LW * 2; c.strokeStyle = OUTLINE; c.stroke();
  path(); c.lineWidth = width; c.strokeStyle = color; c.stroke();
}
function el(c: C, cx: number, cy: number, rx: number, ry: number, col: string, lw = LW, rot = 0) {
  ellipse(c, cx, cy, rx, ry, rot); fs(c, col, cx - rx, cy - ry, rx * 2, ry * 2, lw);
}
function rr(c: C, x: number, y: number, w: number, h: number, r: number, col: string, lw = LW) {
  roundRect(c, x, y, w, h, r); fs(c, col, x, y, w, h, lw);
}
function poly(c: C, pts: [number, number][], col: string, lw = LW) {
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  fs(c, col, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), lw);
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
function gem(c: C, x: number, y: number, r: number, col: string) {
  poly(c, [[x, y - r], [x + r * 0.9, y - r * 0.15], [x + r * 0.55, y + r * 0.85], [x - r * 0.55, y + r * 0.85], [x - r * 0.9, y - r * 0.15]], col, LW * 0.75);
  gloss(c, x - r * 0.25, y - r * 0.4, r * 0.18, r * 0.12, 0.8, -0.4);
}

export const GENS2: Record<number, Draw> = {
  // 5. Serre miniature : fleur rare sous verrière
  5: (c) => {
    baseGlow(c);
    el(c, 50, 80, 34, 8, '#B9A5E8');
    // fleur rare
    c.beginPath(); c.moveTo(50, 78); c.quadraticCurveTo(48, 60, 50, 46); c.lineWidth = 4; c.strokeStyle = PAL.leafDeep; c.stroke();
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; el(c, 50 + Math.cos(a) * 8, 40 + Math.sin(a) * 7, 8, 5.5, i % 2 ? '#C79BFF' : '#E2C4FF', LW * 0.7, a); }
    el(c, 50, 40, 4.5, 4.5, PAL.or, LW * 0.6);
    // cloche
    c.beginPath(); c.moveTo(18, 80); c.lineTo(18, 46); c.quadraticCurveTo(18, 12, 50, 12); c.quadraticCurveTo(82, 12, 82, 46); c.lineTo(82, 80); c.closePath();
    c.fillStyle = 'rgba(214,236,255,0.38)'; c.fill(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    gloss(c, 30, 40, 4, 16, 0.6, 0.15);
    line(c, [[18, 46], [82, 46]], 1.4, 'rgba(88,67,63,0.4)'); line(c, [[50, 12], [50, 80]], 1.4, 'rgba(88,67,63,0.4)');
    el(c, 50, 11, 5, 5, PAL.or, LW * 0.8);
    sparkles(c, [[14, 14, 4.4], [88, 24, 3.8], [86, 62, 3]]);
  },
  // 6. Chocolatière
  6: (c) => {
    baseGlow(c);
    // vapeur
    for (const x of [38, 52, 66]) { c.beginPath(); c.moveTo(x, 36); c.quadraticCurveTo(x - 6, 26, x, 18); c.quadraticCurveTo(x + 6, 10, x, 4); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.stroke(); }
    // pot
    c.beginPath(); c.moveTo(14, 48); c.lineTo(86, 48); c.lineTo(78, 84); c.quadraticCurveTo(50, 92, 22, 84); c.closePath();
    fs(c, '#D9A066', 14, 48, 72, 44, LW, 0.3);
    rr(c, 8, 42, 84, 12, 6, '#F0C08A');
    // chocolat qui déborde
    el(c, 50, 44, 36, 7, '#6A3C28', LW * 0.8);
    for (const x of [26, 70]) tube(c, () => { c.beginPath(); c.moveTo(x, 48); c.lineTo(x, 64 + (x > 50 ? 6 : 0)); }, 5, '#6A3C28');
    gloss(c, 38, 43, 10, 2, 0.5, 0);
    heartPath(c, 50, 70, 16); fs(c, PAL.roseVif, 42, 62, 16, 16, LW * 0.7);
    // brochette de fraise
    c.beginPath(); c.moveTo(80, 10); c.lineTo(66, 40); c.lineWidth = 2.4; c.strokeStyle = '#9A6644'; c.stroke();
    poly(c, [[74, 8], [88, 8], [84, 22], [78, 24]], '#E8484F', LW * 0.8);
    sparkles(c, [[16, 22, 4.4], [90, 50, 3.4]]);
  },
  // 7. Coffre à bijoux
  7: (c) => {
    baseGlow(c);
    glow(c, 50, 44, 34, '#FFFFFF', 0.7);
    poly(c, [[12, 52], [88, 52], [82, 86], [18, 86]], '#B9486F');
    rr(c, 8, 46, 84, 12, 5, '#E8558F');
    // couvercle ouvert
    poly(c, [[14, 46], [86, 46], [92, 12], [8, 12]], '#E8558F');
    poly(c, [[20, 42], [80, 42], [84, 17], [16, 17]], '#FFD1E0', LW * 0.5);
    // bijoux
    gem(c, 36, 36, 9, '#8FD3FF'); gem(c, 52, 32, 11, '#FF75A8'); gem(c, 68, 37, 8, '#A5E6B8');
    tube(c, () => { c.beginPath(); c.ellipse(50, 66, 12, 8, 0, 0, Math.PI * 2); }, 3.2, PAL.or);
    heartPath(c, 78, 72, 9); fs(c, PAL.or, 73, 67, 9, 9, LW * 0.5);
    sparkles(c, [[88, 30, 4.8], [10, 30, 4], [50, 6, 3.6]], '#FFFFFF');
  },
  // 8. Machine à coudre
  8: (c) => {
    baseGlow(c);
    rr(c, 8, 72, 84, 14, 6, '#E8558F');
    // colonne + bras
    rr(c, 62, 20, 22, 56, 9, '#FF75A8');
    rr(c, 12, 18, 66, 24, 10, '#FF75A8');
    gloss(c, 30, 24, 14, 2.6, 0.55, 0);
    // bobine de fil
    rr(c, 28, 6, 18, 5, 2, PAL.or, LW * 0.8); rr(c, 29, 11, 16, 9, 1, '#B9A5E8', LW * 0.7); rr(c, 28, 18, 18, 4, 2, PAL.or, LW * 0.8);
    // fil vers l'aiguille
    c.beginPath(); c.moveTo(37, 12); c.quadraticCurveTo(24, 8, 22, 30); c.lineTo(22, 52); c.lineWidth = 1.2; c.strokeStyle = '#B9A5E8'; c.stroke();
    // pied-de-biche et aiguille
    rr(c, 17, 40, 10, 10, 2, '#DCE3F2', LW * 0.7);
    tube(c, () => { c.beginPath(); c.moveTo(22, 50); c.lineTo(22, 68); }, 1.8, '#DCE3F2');
    // volant
    el(c, 84, 44, 8, 8, PAL.or, LW * 0.9); el(c, 84, 44, 2.6, 2.6, PAL.orDeep, LW * 0.5);
    // tissu sous l'aiguille
    poly(c, [[10, 70], [54, 70], [58, 64], [16, 64]], '#FFD1E0', LW * 0.8);
    heartPath(c, 40, 67, 7); c.fillStyle = PAL.roseVif; c.fill();
    for (let i = 0; i < 4; i++) line(c, [[24 + i * 5, 70], [26 + i * 5, 70]], 1.3, OUTLINE);
    el(c, 72, 58, 4, 4, '#FFF4E8', LW * 0.6); heartPath(c, 72, 58, 5); c.fillStyle = PAL.roseDeep; c.fill();
    sparkles(c, [[14, 10, 4.2], [90, 18, 3.8], [92, 64, 3]]);
  },
  // 9. Alambic parfumé
  9: (c) => {
    baseGlow(c);
    const cu = '#E39A5C';
    // tuyau vers la petite bouteille
    tube(c, () => { c.beginPath(); c.moveTo(50, 22); c.quadraticCurveTo(80, 10, 80, 46); }, 5, cu);
    // ballon
    el(c, 36, 70, 25, 20, cu, LW, 0);
    rr(c, 29, 36, 14, 28, 5, cu);
    el(c, 36, 32, 15, 12, cu, LW);
    // liquide et cœur
    c.save(); ellipse(c, 36, 70, 25, 20); c.clip(); fs(c, '#FF75A8', 8, 70, 60, 30, 0, 0.3); c.restore();
    ellipse(c, 36, 70, 25, 20); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    heartPath(c, 36, 72, 14); fs(c, '#FFD1E0', 29, 65, 14, 14, LW * 0.6);
    gloss(c, 22, 62, 3, 8, 0.6, 0.3);
    gloss(c, 31, 28, 4, 2, 0.6, -0.4);
    // flacon récepteur
    rr(c, 68, 56, 22, 28, 7, '#F7EBFF');
    c.save(); roundRect(c, 68, 70, 22, 14, 6); c.clip(); c.fillStyle = '#FFB3D1'; c.fillRect(68, 70, 22, 16); c.restore();
    roundRect(c, 68, 56, 22, 28, 7); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    rr(c, 74, 48, 10, 10, 2, PAL.or, LW * 0.8);
    el(c, 80, 52, 2, 3, '#FFB3D1', 0);
    sparkles(c, [[12, 28, 4.4], [92, 30, 3.8], [60, 46, 3]]);
  },
  // 10. Boîte à chapeaux
  10: (c) => {
    baseGlow(c);
    c.beginPath(); c.moveTo(14, 44); c.lineTo(86, 44); c.lineTo(86, 80); c.quadraticCurveTo(50, 92, 14, 80); c.closePath();
    fs(c, '#FF9CC0', 14, 44, 72, 48, LW, 0.35);
    c.save(); c.clip(); for (let i = 0; i < 7; i++) line(c, [[14 + i * 12, 40], [14 + i * 12, 94]], 5, '#FFF4E8'); c.restore();
    c.beginPath(); c.moveTo(14, 44); c.lineTo(86, 44); c.lineTo(86, 80); c.quadraticCurveTo(50, 92, 14, 80); c.closePath(); c.lineWidth = LW; c.strokeStyle = OUTLINE; c.stroke();
    // couvercle
    el(c, 50, 40, 40, 12, '#E8558F', LW);
    el(c, 50, 36, 36, 9, '#FF75A8', LW * 0.7);
    // nœud
    for (const s of [-1, 1]) el(c, 50 + s * 14, 30, 14, 7, PAL.or, LW * 0.8, s * 0.35);
    el(c, 50, 31, 5, 5, PAL.orDeep, LW * 0.8);
    // chapeau qui dépasse
    c.beginPath(); c.moveTo(36, 28); c.quadraticCurveTo(36, 8, 50, 6); c.quadraticCurveTo(64, 8, 64, 28); c.closePath(); fs(c, '#F6E2B8', 36, 6, 28, 22, LW * 0.8);
    gloss(c, 24, 58, 3, 10, 0.5, 0.2);
    sparkles(c, [[88, 24, 4.4], [10, 22, 3.8], [50, 2, 3.2]]);
  },
  // 11. Malle du château
  11: (c) => {
    baseGlow(c);
    c.beginPath(); c.moveTo(10, 42); c.quadraticCurveTo(50, 8, 90, 42); c.lineTo(90, 46); c.lineTo(10, 46); c.closePath();
    fs(c, '#8E5FD6', 10, 16, 80, 30, LW);
    rr(c, 10, 44, 80, 44, 5, '#6B3FB5');
    for (const x of [22, 78]) rr(c, x - 4, 18, 8, 70, 2, PAL.or, LW * 0.8);
    for (const y of [56, 70, 82]) line(c, [[28, y], [72, y]], 1, 'rgba(30,10,60,0.35)');
    // plaque dorée avec petit château
    rr(c, 36, 40, 28, 30, 5, PAL.or, LW * 0.9);
    rr(c, 42, 54, 16, 14, 1, '#C9B8F0', LW * 0.6);
    for (const x of [42, 48.5, 55]) rr(c, x, 50, 3.4, 5, 0.5, '#C9B8F0', LW * 0.5);
    poly(c, [[44, 50], [50, 42], [56, 50]], '#E8558F', LW * 0.5);
    rr(c, 47.5, 60, 5, 8, 2.5, '#6B3FB5', LW * 0.5);
    for (const [x, y] of [[12, 46], [88, 46], [12, 86], [88, 86]] as const) el(c, x, y, 3.4, 3.4, PAL.or, LW * 0.5);
    gloss(c, 32, 28, 9, 2.6, 0.5, -0.4);
    sparkles(c, [[90, 12, 4.4], [8, 20, 3.8], [50, 4, 3.4]]);
  },
};
