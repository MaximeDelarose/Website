/** Petits dessins vectoriels des mini-jeux familiaux (fleurs, symboles, ingrédients, chocolats). */
import { PAL, OUTLINE, canvasUrl, paint, texScale, shade, fillShaded, heartPath, starPath, ellipse, roundRect, gloss, sparkle } from '../../../../game/art/kit';
import { PALETTE } from '../../../../data/world/ids';
import type { ChocId } from '../../../../data/world/ids';
import type { IngredientId, MemorySymbol } from '../../../../data/world/family';

type Ctx = CanvasRenderingContext2D;
const LW = 3;
const S = 100;

function url(key: string, draw: (c: Ctx) => void, size = 96): string {
  return canvasUrl(`fg:${key}:${size}`, () => paint(S, S, (size / S) * texScale(), draw));
}

// ------------------------------------------------------------------ fleurs (Bouquet)
const FLOWER_COL = ['', '#FF9EB8', '#B9A5E8', '#F3C86B'];
function petals(c: Ctx, n: number, r: number, pr: number, color: string, rot = 0): void {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    c.beginPath(); c.ellipse(50 + Math.cos(a) * r, 50 + Math.sin(a) * r, pr, pr * 0.8, a, 0, Math.PI * 2);
    fillShaded(c, color, { x: 50 + Math.cos(a) * r - pr, y: 50 + Math.sin(a) * r - pr, w: pr * 2, h: pr * 2 }, LW, { light: 0.3, dark: 0.12 });
  }
}
/** Niveau 1 = bouton, 2 = fleur, 3 = grosse fleur. */
export const flowerUrl = (level: number, size = 96): string => url(`flower${level}`, (c) => {
  c.lineJoin = 'round';
  if (level === 1) { // bouton + deux feuilles
    ellipse(c, 38, 70, 16, 7, -0.5); fillShaded(c, PAL.leaf, { x: 22, y: 63, w: 32, h: 14 }, 2.4);
    ellipse(c, 62, 70, 16, 7, 0.5); fillShaded(c, PAL.leaf, { x: 46, y: 63, w: 32, h: 14 }, 2.4);
    c.beginPath(); c.moveTo(50, 40); c.quadraticCurveTo(34, 52, 40, 70); c.quadraticCurveTo(50, 78, 60, 70); c.quadraticCurveTo(66, 52, 50, 40);
    fillShaded(c, FLOWER_COL[1], { x: 36, y: 40, w: 28, h: 38 }, LW);
    c.beginPath(); c.moveTo(50, 44); c.quadraticCurveTo(46, 58, 50, 72); c.lineWidth = 1.8; c.strokeStyle = OUTLINE; c.stroke();
    gloss(c, 44, 52, 4, 7, 0.7);
  } else if (level === 2) {
    petals(c, 5, 17, 14, FLOWER_COL[2]);
    c.beginPath(); c.arc(50, 50, 11, 0, 7); fillShaded(c, PAL.or, { x: 39, y: 39, w: 22, h: 22 }, LW, { light: 0.35 });
    gloss(c, 45, 44, 4, 2.4, 0.8);
  } else {
    petals(c, 8, 24, 15, FLOWER_COL[3], 0.2);
    petals(c, 8, 14, 11, '#FFD98A', 0.6);
    c.beginPath(); c.arc(50, 50, 12, 0, 7); fillShaded(c, '#C9785A', { x: 38, y: 38, w: 24, h: 24 }, LW, { light: 0.3 });
    for (const [x, y] of [[46, 46], [54, 47], [50, 55], [45, 54]]) { c.beginPath(); c.arc(x, y, 1.4, 0, 7); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill(); }
    sparkle(c, 82, 20, 7, '#fff', 0.95);
  }
}, size);

export const butterflyUrl = (): string => url('butterfly', (c) => {
  c.lineJoin = 'round';
  for (const s of [-1, 1]) {
    c.beginPath(); c.ellipse(50 + s * 18, 38, 20, 24, s * 0.5, 0, 7); fillShaded(c, '#FF9EB8', { x: 30, y: 14, w: 40, h: 48 }, 2.6, { light: 0.3 });
    c.beginPath(); c.ellipse(50 + s * 14, 66, 13, 15, -s * 0.5, 0, 7); fillShaded(c, '#B9A5E8', { x: 36, y: 50, w: 28, h: 32 }, 2.6, { light: 0.3 });
    c.beginPath(); c.arc(50 + s * 20, 36, 4, 0, 7); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
  }
  roundRect(c, 46, 28, 8, 46, 4); fillShaded(c, PAL.choco, { x: 46, y: 28, w: 8, h: 46 }, 0, { light: 0.1 });
  c.beginPath(); c.moveTo(48, 28); c.quadraticCurveTo(40, 14, 36, 14); c.moveTo(52, 28); c.quadraticCurveTo(60, 14, 64, 14); c.lineWidth = 2; c.strokeStyle = OUTLINE; c.stroke();
}, 80);

// ------------------------------------------------------------------ symboles (Mémoire)
function sym(id: MemorySymbol, c: Ctx): void {
  c.lineJoin = 'round';
  if (id === 'flower') { petals(c, 5, 19, 14, '#FF9EB8'); c.beginPath(); c.arc(50, 50, 11, 0, 7); fillShaded(c, PAL.or, { x: 39, y: 39, w: 22, h: 22 }, LW); }
  else if (id === 'heart') { heartPath(c, 50, 52, 78); fillShaded(c, PAL.roseVif, { x: 14, y: 20, w: 72, h: 66 }, LW, { light: 0.3 }); gloss(c, 34, 38, 8, 4, 0.7); }
  else if (id === 'star') { starPath(c, 50, 54, 40, 18); fillShaded(c, PAL.or, { x: 10, y: 14, w: 80, h: 76 }, LW, { light: 0.3 }); gloss(c, 40, 40, 7, 3, 0.7); }
  else if (id === 'moon') { c.beginPath(); c.arc(50, 50, 34, 0.6, Math.PI * 2 - 0.6); c.bezierCurveTo(36, 62, 36, 38, 66, 20); c.closePath(); c.beginPath(); c.moveTo(66, 17); c.bezierCurveTo(30, 18, 22, 70, 62, 84); c.bezierCurveTo(40, 66, 44, 36, 66, 17); c.closePath(); fillShaded(c, '#C9B8F2', { x: 20, y: 17, w: 46, h: 68 }, LW, { light: 0.3 }); sparkle(c, 76, 30, 8, PAL.or); }
  else if (id === 'cat') {
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(50 + s * 14, 30); c.lineTo(50 + s * 32, 14); c.lineTo(50 + s * 34, 42); c.closePath(); fillShaded(c, '#F2A25C', { x: 20, y: 14, w: 60, h: 28 }, LW); }
    ellipse(c, 50, 56, 34, 28); fillShaded(c, '#FFE9CC', { x: 16, y: 28, w: 68, h: 56 }, LW, { light: 0.2 });
    for (const s of [-1, 1]) { ellipse(c, 50 + s * 13, 52, 4, 5.5); c.fillStyle = '#3B2A28'; c.fill(); }
    c.beginPath(); c.moveTo(46, 62); c.lineTo(54, 62); c.lineTo(50, 67); c.closePath(); c.fillStyle = '#F28BA6'; c.fill();
  } else if (id === 'key') {
    c.beginPath(); c.arc(34, 36, 18, 0, 7); c.arc(34, 36, 7, 0, 7, true); fillShaded(c, PAL.or, { x: 16, y: 18, w: 36, h: 36 }, LW, { light: 0.3 });
    roundRect(c, 46, 42, 42, 11, 5); fillShaded(c, PAL.or, { x: 46, y: 42, w: 42, h: 11 }, LW);
    roundRect(c, 70, 52, 8, 14, 3); fillShaded(c, PAL.or, { x: 70, y: 52, w: 8, h: 14 }, LW);
    roundRect(c, 58, 52, 7, 10, 3); fillShaded(c, PAL.or, { x: 58, y: 52, w: 7, h: 10 }, LW);
  } else if (id === 'crown') {
    c.beginPath(); c.moveTo(14, 74); c.lineTo(10, 30); c.lineTo(34, 52); c.lineTo(50, 22); c.lineTo(66, 52); c.lineTo(90, 30); c.lineTo(86, 74); c.closePath(); fillShaded(c, PAL.or, { x: 10, y: 22, w: 80, h: 52 }, LW, { light: 0.3 });
    for (const [x, y, col] of [[30, 64, PAL.roseVif], [50, 64, '#8EC7F0'], [70, 64, PAL.roseVif]] as const) { c.beginPath(); c.arc(x, y, 5, 0, 7); fillShaded(c, col, { x: x - 5, y: y - 5, w: 10, h: 10 }, 2); }
  } else { // cake
    c.beginPath(); c.moveTo(14, 72); c.lineTo(14, 48); c.lineTo(86, 48); c.lineTo(86, 72); c.quadraticCurveTo(50, 84, 14, 72); fillShaded(c, '#F5D3A5', { x: 14, y: 48, w: 72, h: 34 }, LW, { light: 0.2 });
    c.beginPath(); c.moveTo(12, 50); c.quadraticCurveTo(24, 30, 40, 44); c.quadraticCurveTo(56, 28, 70, 44); c.quadraticCurveTo(80, 34, 88, 50); c.quadraticCurveTo(50, 58, 12, 50); fillShaded(c, '#FFD6E3', { x: 12, y: 30, w: 76, h: 28 }, LW, { light: 0.25 });
    c.beginPath(); c.arc(50, 33, 7, 0, 7); fillShaded(c, PAL.red, { x: 43, y: 26, w: 14, h: 14 }, 2.2);
  }
}
export const symbolUrl = (id: MemorySymbol, size = 80): string => url(`sym:${id}`, (c) => sym(id, c), size);

export const cardBackUrl = (): string => url('cardback', (c) => {
  roundRect(c, 4, 4, 92, 92, 18); fillShaded(c, PAL.lavande, { x: 4, y: 4, w: 92, h: 92 }, LW, { light: 0.28, dark: 0.12 });
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2; roundRect(c, 12, 12, 76, 76, 12); c.stroke();
  heartPath(c, 50, 52, 40); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
}, 96);

// ------------------------------------------------------------------ ingrédients (Chocolats)
function ingredient(id: IngredientId, c: Ctx): void {
  c.lineJoin = 'round';
  if (id === 'cocoa') { c.beginPath(); c.ellipse(50, 52, 26, 38, 0.5, 0, 7); fillShaded(c, '#A86A45', { x: 24, y: 14, w: 52, h: 76 }, LW, { light: 0.25 }); c.strokeStyle = 'rgba(88,67,63,0.5)'; c.lineWidth = 2; for (const dx of [-8, 0, 8]) { c.beginPath(); c.moveTo(50 + dx - 6, 24); c.quadraticCurveTo(50 + dx + 4, 52, 50 + dx - 4, 80); c.stroke(); } gloss(c, 42, 32, 5, 10, 0.5); }
  else if (id === 'milk') { roundRect(c, 28, 26, 44, 62, 8); fillShaded(c, '#FFFFFF', { x: 28, y: 26, w: 44, h: 62 }, LW, { light: 0.1, dark: 0.1 }); c.beginPath(); c.moveTo(28, 26); c.lineTo(36, 12); c.lineTo(64, 12); c.lineTo(72, 26); c.closePath(); fillShaded(c, '#8EC7F0', { x: 28, y: 12, w: 44, h: 14 }, LW); c.beginPath(); c.arc(50, 56, 11, 0, 7); c.fillStyle = '#8EC7F0'; c.fill(); heartPath(c, 50, 57, 12); c.fillStyle = '#fff'; c.fill(); }
  else if (id === 'sugar') { for (const [x, y, r] of [[30, 58, 0.1], [56, 52, -0.15], [44, 30, 0.2]] as const) { c.save(); c.translate(x + 14, y + 12); c.rotate(r); roundRect(c, -15, -15, 30, 30, 5); fillShaded(c, '#FFFDF7', { x: -15, y: -15, w: 30, h: 30 }, LW, { light: 0.05, dark: 0.1 }); c.restore(); } sparkle(c, 78, 28, 7, PAL.or); }
  else if (id === 'hazelnut') { c.beginPath(); c.ellipse(50, 56, 26, 30, 0, 0, 7); fillShaded(c, '#C98B5E', { x: 24, y: 26, w: 52, h: 60 }, LW, { light: 0.25 }); c.beginPath(); c.moveTo(24, 46); c.quadraticCurveTo(50, 12, 76, 46); c.quadraticCurveTo(50, 36, 24, 46); fillShaded(c, '#8B5A3C', { x: 24, y: 20, w: 52, h: 26 }, LW); gloss(c, 40, 62, 5, 10, 0.5); }
  else if (id === 'cream') { c.beginPath(); c.moveTo(22, 78); c.quadraticCurveTo(14, 60, 30, 58); c.quadraticCurveTo(24, 42, 40, 42); c.quadraticCurveTo(38, 24, 52, 22); c.quadraticCurveTo(62, 32, 62, 42); c.quadraticCurveTo(76, 44, 70, 58); c.quadraticCurveTo(86, 60, 78, 78); c.closePath(); fillShaded(c, '#FFFFFF', { x: 14, y: 22, w: 72, h: 56 }, LW, { light: 0.05, dark: 0.1 }); }
  else if (id === 'vanilla') { c.beginPath(); c.moveTo(24, 80); c.quadraticCurveTo(50, 50, 80, 22); c.lineWidth = 12; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 7; c.strokeStyle = '#6B4A3A'; c.stroke(); petals(c, 5, 9, 7, '#FFF4C9', 0); c.translate(0, 0); }
  else if (id === 'mold') { heartPath(c, 50, 54, 78); fillShaded(c, '#E9D8FF', { x: 12, y: 20, w: 76, h: 70 }, LW, { light: 0.2 }); heartPath(c, 50, 55, 44); c.fillStyle = 'rgba(88,67,63,0.28)'; c.fill(); }
  else if (id === 'ribbon') { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(50, 44); c.quadraticCurveTo(50 + s * 34, 14, 50 + s * 40, 44); c.quadraticCurveTo(50 + s * 34, 70, 50, 48); fillShaded(c, PAL.roseVif, { x: 10, y: 14, w: 80, h: 56 }, LW, { light: 0.3 }); } c.beginPath(); c.moveTo(46, 52); c.lineTo(32, 86); c.lineTo(42, 82); c.lineTo(50, 54); c.closePath(); fillShaded(c, PAL.roseDeep, { x: 30, y: 50, w: 22, h: 38 }, 2.4); c.beginPath(); c.moveTo(54, 52); c.lineTo(68, 86); c.lineTo(58, 82); c.lineTo(50, 54); c.closePath(); fillShaded(c, PAL.roseDeep, { x: 48, y: 50, w: 22, h: 38 }, 2.4); c.beginPath(); c.arc(50, 46, 8, 0, 7); fillShaded(c, PAL.roseDeep, { x: 42, y: 38, w: 16, h: 16 }, 2.4); }
  else if (id === 'lemon') { c.beginPath(); c.ellipse(50, 54, 36, 26, -0.3, 0, 7); fillShaded(c, '#FFE066', { x: 14, y: 28, w: 72, h: 52 }, LW, { light: 0.3 }); gloss(c, 38, 44, 8, 4, 0.7); }
  else { c.beginPath(); c.moveTo(50, 86); c.quadraticCurveTo(10, 60, 26, 20); c.quadraticCurveTo(50, 12, 74, 20); c.quadraticCurveTo(90, 60, 50, 86); fillShaded(c, '#8FD6A5', { x: 20, y: 14, w: 60, h: 72 }, LW, { light: 0.25 }); c.beginPath(); c.moveTo(50, 80); c.lineTo(50, 28); c.lineWidth = 2; c.strokeStyle = OUTLINE; c.stroke(); }
}
export const ingredientUrl = (id: IngredientId, size = 80): string => url(`ing:${id}`, (c) => ingredient(id, c), size);

/** Un chocolat fini (milk = carré, praline = rond à la noisette, heart = cœur). */
export const chocUrl = (id: ChocId, size = 80): string => url(`choc:${id}`, (c) => {
  c.lineJoin = 'round';
  if (id === 'heart') { heartPath(c, 50, 54, 78); fillShaded(c, '#7B4B3A', { x: 12, y: 20, w: 76, h: 70 }, LW, { light: 0.25 }); gloss(c, 34, 38, 9, 4, 0.55); }
  else if (id === 'praline') { c.beginPath(); c.arc(50, 52, 34, 0, 7); fillShaded(c, '#8B5A3C', { x: 16, y: 18, w: 68, h: 68 }, LW, { light: 0.25 }); c.beginPath(); c.ellipse(50, 46, 12, 15, 0.3, 0, 7); fillShaded(c, '#D9A66E', { x: 38, y: 31, w: 24, h: 30 }, 2.2); gloss(c, 36, 34, 8, 4, 0.5); }
  else { roundRect(c, 18, 22, 64, 62, 12); fillShaded(c, '#9A6445', { x: 18, y: 22, w: 64, h: 62 }, LW, { light: 0.25 }); c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 2; for (const k of [34, 50, 66]) { c.beginPath(); c.moveTo(k, 28); c.lineTo(k, 78); c.moveTo(24, k + 4); c.lineTo(76, k + 4); c.stroke(); } gloss(c, 30, 32, 8, 3, 0.5); }
}, size);

// ------------------------------------------------------------------ chambre miniature (Harmonie)
export function drawMiniRoom(c: Ctx, w: number, h: number, wall: string, floor: string, curtain: string, t = 0): void {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const fy = h * 0.66;
  const g = c.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, shade(wall, 0.12)); g.addColorStop(1, wall);
  c.fillStyle = g; c.fillRect(0, 0, w, fy);
  const g2 = c.createLinearGradient(0, fy, 0, h); g2.addColorStop(0, shade(floor, 0.1)); g2.addColorStop(1, shade(floor, -0.1));
  c.fillStyle = g2; c.fillRect(0, fy, w, h - fy);
  c.strokeStyle = 'rgba(88,67,63,0.25)'; c.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(w * 0.5 + (i - 3) * w * 0.05, fy); c.lineTo(w * 0.5 + (i - 3) * w * 0.28, h); c.stroke(); }
  c.fillStyle = 'rgba(88,67,63,0.22)'; c.fillRect(0, fy - 2, w, 3);
  // fenêtre + rideaux
  const wx = w * 0.3; const wy = h * 0.1; const ww = w * 0.4; const wh = h * 0.42;
  roundRect(c, wx, wy, ww, wh, 8); const sky = c.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#CBE7FB'); sky.addColorStop(1, '#F6E8FF'); c.fillStyle = sky; c.fill(); c.lineWidth = 3; c.strokeStyle = OUTLINE; c.stroke();
  c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.lineWidth = 2; c.stroke();
  const sw = Math.sin(t * 1.5) * 1.5;
  for (const s of [-1, 1]) {
    c.beginPath(); const x0 = s < 0 ? wx - 8 : wx + ww + 8; c.moveTo(x0, wy - 6); c.lineTo(x0 + s * -ww * 0.34, wy - 6); c.quadraticCurveTo(x0 + s * -ww * 0.2 + sw, wy + wh * 0.5, x0 + s * -ww * 0.3, wy + wh + 6); c.lineTo(x0, wy + wh + 6); c.closePath();
    fillShaded(c, curtain, { x: x0 - ww * 0.4, y: wy, w: ww * 0.4, h: wh }, 2.6, { light: 0.2 });
  }
  roundRect(c, wx - 12, wy - 12, ww + 24, 8, 4); fillShaded(c, shade(curtain, -0.25), { x: wx, y: wy - 12, w: ww, h: 8 }, 2.4);
  // petit lit + plante
  roundRect(c, w * 0.06, fy - h * 0.13, w * 0.3, h * 0.22, 8); fillShaded(c, '#FFF9EE', { x: w * 0.06, y: fy - h * 0.13, w: w * 0.3, h: h * 0.22 }, 2.6);
  roundRect(c, w * 0.06, fy - h * 0.13, w * 0.3, h * 0.08, 6); fillShaded(c, shade(curtain, 0.1), { x: w * 0.06, y: fy - h * 0.13, w: w * 0.3, h: h * 0.08 }, 2.2);
  roundRect(c, w * 0.78, fy - h * 0.02, w * 0.1, h * 0.14, 5); fillShaded(c, '#D99C74', { x: w * 0.78, y: fy, w: w * 0.1, h: h * 0.14 }, 2.4);
  for (const [dx, dy] of [[-0.04, -0.1], [0.04, -0.12], [0, -0.06]]) { ellipse(c, w * 0.83 + dx * w, fy + dy * h, w * 0.04, h * 0.07, dx * 8); fillShaded(c, PAL.leaf, { x: w * 0.79, y: fy - h * 0.18, w: w * 0.08, h: h * 0.14 }, 2); }
  c.restore();
}
export const paletteColor = (id: string): string => PALETTE.find((p) => p.id === id)?.color ?? '#FFF1DE';
