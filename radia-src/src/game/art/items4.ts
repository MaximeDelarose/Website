/**
 * Icônes de la chaîne « Savons » PIMBÊCHE AU LAIT DE CHÈVRE (8 niveaux) : lait de chèvre, pâte de savon, savon moulé, savon parfumé,
 * savon terminé, savon emballé, coffret de savons, coffret de luxe (tous les savons portent la goutte de lait de chèvre). Même repère et même style que items3.ts
 * (100 × 100, contour chocolat, dégradés, reflet en haut à gauche, ombre au sol ; les derniers niveaux gagnent halo et étincelles).
 * Marque fictive : le « P » de PIMBÊCHE est dessiné ici, aucune ressource de marque réelle. Fichier autonome (pas d'import
 * depuis items.ts) pour éviter tout cycle.
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
  c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.stroke();
}
function el(c: C, cx: number, cy: number, rx: number, ry: number, col: string, lw = LW, rot = 0, light?: number) {
  ellipse(c, cx, cy, rx, ry, rot); fs(c, col, cx - rx, cy - ry, rx * 2, ry * 2, lw, light);
}
function rr(c: C, x: number, y: number, w: number, h: number, r: number, col: string, lw = LW, light?: number) {
  roundRect(c, x, y, w, h, r); fs(c, col, x, y, w, h, lw, light);
}
function sparkles(c: C, pts: [number, number, number][], color = '#FFFFFF') {
  for (const [x, y, r] of pts) { sparkle(c, x, y, r + 1.4, OUTLINE, 0.35); sparkle(c, x, y, r, color); }
}
function halo(c: C, col: string, a = 0.5, r = 54) { glow(c, 50, 52, r, col, a); }
function heart(c: C, x: number, y: number, s: number, col: string = PAL.roseVif) {
  heartPath(c, x, y, s); fs(c, col, x - s / 2, y - s / 2, s, s, LW * 0.55, 0.4);
}
function bow(c: C, x: number, y: number, s: number, col: string) {
  for (const k of [-1, 1]) {
    c.save(); c.translate(x, y); c.scale(k, 1);
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(s * 0.5, -s * 0.8, s * 1.2, -s * 0.55, s * 1.15, 0); c.bezierCurveTo(s * 1.1, s * 0.45, s * 0.5, s * 0.55, 0, 0); c.closePath();
    fs(c, col, 0, -s * 0.7, s * 1.2, s * 1.2, LW * 0.8);
    c.restore();
  }
  el(c, x, y, s * 0.3, s * 0.3, shade(col, -0.08), LW * 0.8);
}
/** Petit « P » de la marque PIMBÊCHE (lettre dessinée, doré). */
function mark(c: C, x: number, y: number, s: number, col = '#F3C86B') {
  c.save(); c.translate(x, y);
  c.beginPath(); c.moveTo(-s * 0.35, s * 0.55); c.lineTo(-s * 0.35, -s * 0.55); c.lineTo(s * 0.1, -s * 0.55); c.bezierCurveTo(s * 0.55, -s * 0.55, s * 0.55, s * 0.1, s * 0.1, s * 0.1); c.lineTo(-s * 0.35, s * 0.1);
  c.lineWidth = s * 0.3; c.strokeStyle = OUTLINE; c.lineJoin = 'round'; c.stroke();
  c.lineWidth = s * 0.16; c.strokeStyle = col; c.stroke();
  c.restore();
}
/** Petite goutte de lait de chèvre (badge posé sur les savons : tous les savons PIMBÊCHE sont au lait de chèvre). */
function milkDrop(c: C, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s / 14, s / 14);
  c.beginPath(); c.moveTo(0, -9); c.bezierCurveTo(5, -2, 8, 2, 8, 5); c.bezierCurveTo(8, 9.5, 4.5, 12, 0, 12); c.bezierCurveTo(-4.5, 12, -8, 9.5, -8, 5); c.bezierCurveTo(-8, 2, -5, -2, 0, -9); c.closePath();
  c.fillStyle = '#FFFDF8'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUTLINE; c.lineJoin = 'round'; c.stroke();
  c.beginPath(); c.ellipse(-2.6, 4.2, 1.6, 3.2, 0.3, 0, Math.PI * 2); c.fillStyle = 'rgba(190,215,240,0.7)'; c.fill();
  c.restore();
}
function sprig(c: C, x: number, y: number, s: number, col: string) {
  line(c, [[x, y], [x + s * 0.2, y - s]], 1.6, '#6B8F5A');
  for (let i = 0; i < 4; i++) el(c, x + s * 0.1 + (i % 2 ? 2 : -2), y - s * (0.35 + i * 0.2), 2.2, 3.2, col, LW * 0.35);
}

const CREAM = '#FFF1E2';
const ROSE = '#F4A9C3';
const LAV = '#B9A5E8';

const SOAP_BASE: Draw[] = [
  // 1 Lait de chèvre PIMBÊCHE : bouteille de lait crémeux, goutte, étiquette avec le P doré
  (c) => {
    groundShadow(c, 50, 82, 28, 5);
    rr(c, 31, 44, 38, 38, 9, '#FFFDF8', LW, 0.45);
    rr(c, 38, 30, 24, 18, 5, '#FFFDF8', LW, 0.45);
    rr(c, 36, 24, 28, 9, 4, '#E9B7CC', LW * 0.8, 0.3);
    rr(c, 36, 56, 28, 18, 5, '#FCE3EE', LW * 0.5, 0.4);
    mark(c, 50, 65, 8);
    line(c, [[36, 52], [36, 76]], 1.6, 'rgba(190,215,240,0.8)');
    gloss(c, 40, 50, 6, 2.4, 0.8, -0.4);
    milkDrop(c, 74, 40, 16); milkDrop(c, 28, 34, 10);
    sparkles(c, [[22, 56, 2.6], [78, 62, 2.4]]);
  },
  // 2 Savon brut : pain rugueux couleur d'avoine, éclats
  (c) => {
    groundShadow(c, 50, 80, 32, 5);
    rr(c, 18, 38, 64, 40, 7, '#E7CBA0', LW, 0.2);
    rr(c, 18, 38, 64, 10, 5, '#F2DDB8', LW * 0.7, 0.4);
    for (const [x, y, r] of [[30, 58, 1.8], [44, 66, 1.4], [58, 56, 2], [70, 64, 1.5], [36, 70, 1.2], [64, 72, 1.4]] as const) { el(c, x, y, r, r, '#B88C58', 0, 0); }
    line(c, [[18, 62], [26, 60], [34, 64]], 1.4, 'rgba(120,80,40,0.45)');
    line(c, [[60, 44], [70, 46], [80, 44]], 1.4, 'rgba(255,255,255,0.6)');
    gloss(c, 32, 44, 9, 3, 0.55, -0.3);
  },
  // 3 Savon moulé : pain rose avec un cœur en relief
  (c) => {
    groundShadow(c, 50, 80, 32, 5);
    rr(c, 20, 32, 60, 46, 12, ROSE, LW, 0.35);
    rr(c, 25, 37, 50, 36, 8, '#F9BFD3', LW * 0.4, 0.5);
    heart(c, 50, 56, 24, '#FF7FA6');
    gloss(c, 34, 42, 11, 3.6, 0.7, -0.35);
    line(c, [[27, 70], [73, 70]], 1.2, 'rgba(255,255,255,0.5)');
  },
  // 4 Savon parfumé : savon rond lavande entouré de brins de lavande et de volutes
  (c) => {
    groundShadow(c, 50, 82, 32, 5);
    sprig(c, 26, 78, 30, LAV); sprig(c, 74, 78, 28, LAV); sprig(c, 36, 82, 22, '#C9B8F5');
    el(c, 50, 56, 26, 22, LAV, LW, 0, 0.35);
    el(c, 50, 56, 19, 15, '#C9B8F5', LW * 0.4, 0, 0.5);
    gloss(c, 40, 46, 11, 4, 0.7, -0.4);
    for (const [x, y] of [[44, 26], [56, 20]] as const) { c.beginPath(); c.moveTo(x, y + 8); c.bezierCurveTo(x - 6, y + 2, x + 6, y - 2, x, y - 8); c.lineWidth = 2; c.strokeStyle = 'rgba(185,165,232,0.85)'; c.lineCap = 'round'; c.stroke(); }
  },
  // 5 Savon décoré : savon en forme de fleur, pétales rosés, cœur doré au centre
  (c) => {
    groundShadow(c, 50, 82, 30, 5);
    halo(c, '#FFD6E6', 0.3, 46);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; el(c, 50 + Math.cos(a) * 17, 54 + Math.sin(a) * 17, 11, 11, i % 2 ? '#FFB7CF' : '#FF9FBF', LW * 0.8, 0, 0.35); }
    el(c, 50, 54, 14, 14, '#FFF1E2', LW, 0, 0.4);
    heart(c, 50, 55, 14, '#F3C86B');
    gloss(c, 38, 42, 7, 2.6, 0.7, -0.4);
    sparkles(c, [[24, 28, 3.4], [78, 34, 3], [70, 78, 2.6]]);
  },
  // 6 Savon artisanal Pimbêche : pain crème, bande en papier avec le P doré, fleur séchée
  (c) => {
    groundShadow(c, 50, 82, 34, 5);
    rr(c, 17, 34, 66, 44, 8, CREAM, LW, 0.4);
    rr(c, 40, 30, 20, 52, 3, '#E9B7CC', LW * 0.8, 0.3);
    mark(c, 50, 56, 11);
    el(c, 28, 44, 5, 5, '#FFC2D6', LW * 0.5); el(c, 28, 44, 2, 2, '#F3C86B', 0);
    line(c, [[28, 49], [30, 62]], 1.4, '#6B8F5A');
    heart(c, 71, 66, 8, PAL.roseVif);
    gloss(c, 27, 40, 8, 2.6, 0.7, -0.35);
    sparkles(c, [[78, 28, 3]]);
  },
  // 7 Coffret de savons : boîte ouverte avec trois savons de couleurs et un ruban
  (c) => {
    groundShadow(c, 50, 84, 36, 5);
    rr(c, 16, 44, 68, 36, 6, '#F9D6E4', LW, 0.3);
    rr(c, 20, 48, 60, 28, 4, '#FFF3E8', LW * 0.5, 0.5);
    rr(c, 23, 52, 16, 20, 4, ROSE, LW * 0.6, 0.35); rr(c, 42, 52, 16, 20, 4, LAV, LW * 0.6, 0.35); rr(c, 61, 52, 16, 20, 4, '#FFE7A0', LW * 0.6, 0.35);
    heart(c, 31, 62, 8, '#FF7FA6');
    rr(c, 14, 34, 72, 12, 5, '#FFFFFF', LW, 0.2);
    rr(c, 46, 34, 8, 46, 2, '#E8558F', LW * 0.7, 0.3);
    bow(c, 50, 33, 9, '#FF75A8');
    sparkles(c, [[20, 26, 3], [80, 24, 3.4]]);
  },
  // 8 Coffret Pimbêche de luxe : coffret doré, ruban lavande, P en relief, halo
  (c) => {
    halo(c, '#FFE29A', 0.55, 56);
    groundShadow(c, 50, 86, 38, 5);
    rr(c, 14, 44, 72, 40, 7, '#F3C86B', LW, 0.35);
    rr(c, 18, 48, 64, 32, 5, '#FFF8E8', LW * 0.5, 0.5);
    rr(c, 12, 32, 76, 16, 6, '#F6D98A', LW, 0.35);
    rr(c, 44, 32, 12, 52, 2, LAV, LW * 0.8, 0.3);
    bow(c, 50, 31, 11, '#C9B8F5');
    mark(c, 30, 64, 11, '#E8A53A'); mark(c, 70, 64, 11, '#E8A53A');
    heart(c, 50, 70, 9, PAL.roseVif);
    sparkles(c, [[18, 22, 4.4], [84, 20, 4], [90, 56, 3], [10, 56, 3], [50, 12, 3.6]], '#FFF6D0');
  },
];
/** Tous les savons au lait de chèvre (niveaux 2 à 8) portent la goutte de lait en coin ; le niveau 1 EST le lait. */
export const SOAP: Draw[] = SOAP_BASE.map((d, i) => (i === 0 ? d : (c: C) => { d(c); milkDrop(c, 84, 20, 12); }));
export const EXTRA_ITEMS4: Record<string, Draw[]> = { soap: SOAP };

