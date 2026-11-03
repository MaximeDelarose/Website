/**
 * Illustrations des 15 plats (Canvas 2D, style RADIA : contour chocolat, dégradés doux, reflets).
 * Chaque plat est dessiné dans un repère 100×100 (assiette de rayon ≈ 44), lisible dès 80 px.
 */
import { PAL, OUTLINE, shade, ellipse, gloss, heartPath, roundRect, paint, canvasUrl, groundShadow } from '../../game/art/kit';
import type { DishId } from './logic';

type G = CanvasRenderingContext2D;
const LW = 2;

function stroke(g: G, w = LW): void { g.lineWidth = w; g.strokeStyle = OUTLINE; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
function fillGrad(g: G, color: string, x: number, y: number, w: number, h: number): void {
  const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
  gr.addColorStop(0, shade(color, 0.25)); gr.addColorStop(0.55, color); gr.addColorStop(1, shade(color, -0.16));
  g.fillStyle = gr; g.fill();
}
/** Disque rempli et contouré. */
function disc(g: G, cx: number, cy: number, r: number, color: string, lw = LW): void {
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
  fillGrad(g, color, cx - r, cy - r, r * 2, r * 2); if (lw > 0) stroke(g, lw);
}
function oval(g: G, cx: number, cy: number, rx: number, ry: number, color: string, rot = 0, lw = LW): void {
  ellipse(g, cx, cy, rx, ry, rot);
  fillGrad(g, color, cx - rx, cy - ry, rx * 2, ry * 2); if (lw > 0) stroke(g, lw);
}
function dots(g: G, pts: Array<[number, number]>, r: number, color: string): void {
  g.fillStyle = color;
  for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
}
function leaf(g: G, x: number, y: number, len: number, wid: number, rot: number, color: string = PAL.leaf): void {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -wid, len, 0); g.quadraticCurveTo(len * 0.5, wid, 0, 0);
  fillGrad(g, color, 0, -wid, len, wid * 2); stroke(g, 1.4);
  g.beginPath(); g.moveTo(len * 0.1, 0); g.lineTo(len * 0.85, 0); g.strokeStyle = shade(color, -0.3); g.lineWidth = 0.9; g.stroke();
  g.restore();
}

/** Assiette vue de dessus. */
function plate(g: G, r = 45, tint = '#FFFFFF'): void {
  groundShadow(g, 52, 55, r + 4, r * 0.55, 0.3);
  g.beginPath(); g.arc(50, 50, r, 0, Math.PI * 2);
  const gr = g.createLinearGradient(10, 10, 90, 90);
  gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, shade(tint === '#FFFFFF' ? '#E7DCEF' : tint, 0));
  g.fillStyle = gr; g.fill(); stroke(g, 2.2);
  g.beginPath(); g.arc(50, 50, r * 0.74, 0, Math.PI * 2);
  g.fillStyle = 'rgba(185,165,232,0.14)'; g.fill();
  g.strokeStyle = 'rgba(88,67,63,0.28)'; g.lineWidth = 1.2; g.stroke();
  g.beginPath(); g.arc(50, 50, r - 3.5, Math.PI * 1.05, Math.PI * 1.45); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.4; g.stroke();
}

function tomatoSlice(g: G, x: number, y: number, r: number, rot = 0): void {
  disc(g, x, y, r, '#EF5A4F', 1.6);
  disc(g, x, y, r * 0.7, '#F98378', 0);
  g.save(); g.translate(x, y); g.rotate(rot);
  for (let i = 0; i < 3; i++) { g.rotate((Math.PI * 2) / 3); oval(g, r * 0.32, 0, r * 0.2, r * 0.1, '#FFE08A', 0, 0); }
  g.restore();
}
function basil(g: G, x: number, y: number, s: number, rot: number): void { leaf(g, x, y, s, s * 0.45, rot, '#5FB36F'); }
function mushroom(g: G, x: number, y: number, s: number, rot: number): void {
  g.save(); g.translate(x, y); g.rotate(rot);
  roundRect(g, -s * 0.14, 0, s * 0.28, s * 0.6, s * 0.1); fillGrad(g, '#F3E3CC', -s * 0.14, 0, s * 0.28, s * 0.6); stroke(g, 1.5);
  g.beginPath(); g.moveTo(-s * 0.55, 0); g.quadraticCurveTo(0, -s * 0.9, s * 0.55, 0); g.quadraticCurveTo(0, s * 0.18, -s * 0.55, 0);
  fillGrad(g, '#B07A52', -s * 0.55, -s * 0.8, s * 1.1, s * 0.9); stroke(g, 1.6);
  gloss(g, -s * 0.2, -s * 0.38, s * 0.16, s * 0.07, 0.6);
  g.restore();
}
function potato(g: G, x: number, y: number, s: number, rot: number): void {
  oval(g, x, y, s, s * 0.72, '#EBB254', rot, 1.8);
  gloss(g, x - s * 0.3, y - s * 0.28, s * 0.3, s * 0.12, 0.6, rot);
  dots(g, [[x + s * 0.2, y + s * 0.1], [x - s * 0.1, y + s * 0.3]], 0.9, '#B87A2F');
}

// ------------------------------------------------------------------ entrées

function burrata(g: G): void {
  plate(g);
  tomatoSlice(g, 29, 34, 11, 0.3); tomatoSlice(g, 71, 33, 11, 1); tomatoSlice(g, 25, 64, 10.5, 2); tomatoSlice(g, 74, 66, 11, 0.6); tomatoSlice(g, 50, 80, 9, 1.4);
  disc(g, 50, 50, 19, '#FFFDF6');
  g.beginPath(); g.arc(50, 50, 19, 0, Math.PI * 2); g.strokeStyle = OUTLINE; g.lineWidth = 2; g.stroke();
  gloss(g, 43, 42, 7, 4.2, 0.9);
  g.beginPath(); g.arc(50, 50, 7, 0.3, Math.PI * 1.2); g.strokeStyle = 'rgba(88,67,63,0.2)'; g.lineWidth = 1.2; g.stroke();
  basil(g, 46, 26, 14, -0.9); basil(g, 54, 26, 14, -2.2); basil(g, 50, 52, 11, 0.4);
  dots(g, [[38, 54], [62, 48], [58, 62], [42, 66]], 1.3, '#3F2B27');
  dots(g, [[34, 46], [65, 56], [48, 70]], 1.6, 'rgba(243,200,107,0.9)');
}
function salade(g: G): void {
  plate(g);
  const greens = ['#7FC48A', '#97D49A', '#5FB36F', '#A8DB8A', '#6DBB7A'];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2; const rr = 17 + (i % 3) * 5;
    leaf(g, 50 + Math.cos(a) * rr * 0.5, 50 + Math.sin(a) * rr * 0.5, rr + 2, 8, a, greens[i % 5]);
  }
  for (const [x, y] of [[36, 40], [62, 36], [58, 62], [38, 60]] as Array<[number, number]>) { disc(g, x, y, 6.5, '#EF4F4F', 1.6); gloss(g, x - 2, y - 2, 2, 1.2, 0.9); }
  for (const [x, y] of [[50, 48], [68, 50], [44, 70]] as Array<[number, number]>) { roundRect(g, x - 4, y - 4, 8, 8, 2); fillGrad(g, '#FFF3C4', x - 4, y - 4, 8, 8); stroke(g, 1.4); }
  for (const [x, y, r] of [[30, 52, 0.4], [56, 28, 1], [66, 70, 2]] as Array<[number, number, number]>) { oval(g, x, y, 6, 4, '#C9915A', r, 1.5); }
  dots(g, [[45, 34], [70, 58], [34, 68]], 1.5, '#F3C86B');
}
function soupe(g: G): void {
  plate(g);
  disc(g, 50, 50, 32, '#FFFFFF');
  disc(g, 50, 50, 26.5, '#F29A4B', 1.8);
  g.beginPath(); g.arc(50, 50, 26, Math.PI * 0.9, Math.PI * 1.55); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 3; g.stroke();
  // volute de crème en cœur
  g.save(); heartPath(g, 50, 51, 13); g.fillStyle = '#FFF6E2'; g.fill(); stroke(g, 1.4); g.restore();
  g.beginPath(); g.moveTo(40, 49); g.quadraticCurveTo(50, 59, 60, 49); g.strokeStyle = 'rgba(243,154,75,0.7)'; g.lineWidth = 1.4; g.stroke();
  dots(g, [[34, 40], [66, 40], [58, 66], [38, 62], [70, 54]], 1.4, '#4E9A62');
  // petite cuillère
  g.save(); g.translate(84, 56); g.rotate(0.3);
  roundRect(g, -2, -4, 4, 34, 2); fillGrad(g, '#E6E1EA', -2, -4, 4, 34); stroke(g, 1.4);
  g.restore();
}
function feuillete(g: G): void {
  plate(g);
  leaf(g, 26, 68, 24, 8, -0.7, '#7FC48A'); leaf(g, 24, 62, 22, 7, -1.2, '#97D49A');
  g.save(); g.translate(52, 48); g.rotate(-0.25);
  roundRect(g, -27, -20, 54, 40, 10); fillGrad(g, '#E9B15A', -27, -20, 54, 40); stroke(g, 2.2);
  g.save(); roundRect(g, -27, -20, 54, 40, 10); g.clip();
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(-30, i * 7.5); g.quadraticCurveTo(0, i * 7.5 + 4, 30, i * 7.5); g.strokeStyle = 'rgba(158,98,36,0.45)'; g.lineWidth = 1.4; g.stroke(); }
  g.restore();
  g.beginPath(); g.moveTo(-18, -3); g.quadraticCurveTo(0, -10, 18, -3); g.strokeStyle = '#B8742A'; g.lineWidth = 2; g.stroke();
  roundRect(g, -22, -16, 36, 8, 4); g.fillStyle = 'rgba(255,240,190,0.55)'; g.fill();
  g.restore();
  // fromage fondant
  g.beginPath(); g.moveTo(66, 58); g.quadraticCurveTo(78, 56, 76, 68); g.quadraticCurveTo(72, 74, 68, 66); g.closePath();
  g.fillStyle = '#FFE070'; g.fill(); stroke(g, 1.5);
  dots(g, [[56, 40], [44, 56]], 1.6, '#FFF3C4');
}

// ------------------------------------------------------------------ plats

function truffe(g: G): void {
  plate(g);
  // nid de pâtes
  for (let i = 0; i < 7; i++) {
    g.beginPath(); const rr = 8 + i * 3.2;
    g.ellipse(50, 50, rr, rr * 0.8, i * 0.6, 0.3 * i, Math.PI * 1.7 + 0.3 * i);
    g.strokeStyle = OUTLINE; g.lineWidth = 6.2; g.stroke();
    g.strokeStyle = i % 2 ? '#F7D879' : '#F2C95E'; g.lineWidth = 4.2; g.stroke();
  }
  disc(g, 50, 50, 8, '#F7D879', 0);
  // copeaux de truffe noire
  for (const [x, y, r] of [[40, 40, 0.3], [56, 36, 1.2], [60, 54, 2], [44, 58, 0.8], [51, 47, 1.6]] as Array<[number, number, number]>) {
    oval(g, x, y, 5.5, 3.4, '#3A2A28', r, 1.2); dots(g, [[x - 1, y - 1]], 0.9, 'rgba(255,255,255,0.45)');
  }
  dots(g, [[34, 52], [66, 46], [50, 66], [46, 30], [62, 66]], 1.2, '#FFF6D9');
  leaf(g, 66, 30, 9, 3.5, -0.8, '#4E9A62');
}
function risotto(g: G): void {
  plate(g);
  g.beginPath(); g.ellipse(50, 50, 30, 27, 0, 0, Math.PI * 2);
  fillGrad(g, '#F8EBC8', 20, 23, 60, 54); stroke(g, 2);
  for (let i = 0; i < 34; i++) { const a = i * 2.4; const r = (i % 7) * 3.6; oval(g, 50 + Math.cos(a) * r, 50 + Math.sin(a) * r * 0.9, 2.1, 1.1, '#FFFDF0', a, 0); }
  gloss(g, 38, 38, 9, 4, 0.55);
  mushroom(g, 38, 42, 15, -0.3); mushroom(g, 60, 40, 14, 0.4); mushroom(g, 52, 62, 15, 3.4); mushroom(g, 36, 62, 11, 2.6);
  dots(g, [[50, 48], [64, 58], [30, 52]], 1.8, '#4E9A62');
  leaf(g, 66, 66, 10, 4, 0.4, '#4E9A62');
}
function poulet(g: G): void {
  plate(g);
  potato(g, 28, 62, 11, 0.4); potato(g, 44, 74, 10, -0.3); potato(g, 70, 70, 10.5, 0.8); potato(g, 24, 42, 9, 1.2);
  // cuisse de poulet rôtie
  g.save(); g.translate(52, 44); g.rotate(-0.55);
  roundRect(g, 14, -3.5, 22, 7, 3.5); fillGrad(g, '#F8EEDC', 14, -3.5, 22, 7); stroke(g, 1.8);
  disc(g, 36, -3.5, 4, '#F8EEDC', 1.7); disc(g, 36, 3.5, 4, '#F8EEDC', 1.7);
  g.beginPath(); g.ellipse(0, 0, 24, 17, 0, 0, Math.PI * 2);
  fillGrad(g, '#D88935', -24, -17, 48, 34); stroke(g, 2.2);
  g.beginPath(); g.ellipse(-6, -6, 14, 7, -0.3, 0, Math.PI * 2); g.fillStyle = 'rgba(255,214,128,0.5)'; g.fill();
  g.strokeStyle = 'rgba(122,66,20,0.5)'; g.lineWidth = 1.5;
  for (const dx of [-12, -2, 8]) { g.beginPath(); g.moveTo(dx, -9); g.quadraticCurveTo(dx + 4, 0, dx, 9); g.stroke(); }
  gloss(g, -10, -9, 5, 2.4, 0.85);
  g.restore();
  leaf(g, 62, 28, 14, 2.5, -0.3, '#4E9A62'); leaf(g, 64, 30, 13, 2.5, 0.2, '#6DBB7A');
  dots(g, [[40, 30], [72, 56], [56, 80]], 1.2, '#4E9A62');
}
function saumon(g: G): void {
  plate(g);
  // asperges / haricots
  for (const [x, y] of [[22, 64], [27, 70], [33, 75]] as Array<[number, number]>) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 34, y - 12); g.strokeStyle = OUTLINE; g.lineWidth = 6; g.stroke(); g.strokeStyle = '#6DBB7A'; g.lineWidth = 3.6; g.stroke(); }
  // filet
  g.save(); g.translate(50, 42); g.rotate(-0.15);
  roundRect(g, -27, -14, 54, 28, 12); fillGrad(g, '#F58F6B', -27, -14, 54, 28); stroke(g, 2.2);
  g.save(); roundRect(g, -27, -14, 54, 28, 12); g.clip();
  g.strokeStyle = 'rgba(255,230,210,0.85)'; g.lineWidth = 2;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 9 - 8, -16); g.quadraticCurveTo(i * 9 + 2, 0, i * 9 - 6, 16); g.stroke(); }
  g.restore();
  g.beginPath(); g.moveTo(-22, -9); g.quadraticCurveTo(0, -14, 22, -9); g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 2.4; g.stroke();
  g.restore();
  // citron
  disc(g, 74, 66, 13, '#FFF3B0', 1.8); disc(g, 74, 66, 10, '#FBDC4B', 0);
  g.strokeStyle = 'rgba(255,248,200,0.9)'; g.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.beginPath(); g.moveTo(74, 66); g.lineTo(74 + Math.cos(a) * 9.4, 66 + Math.sin(a) * 9.4); g.stroke(); }
  // brocolis
  disc(g, 30, 58, 6, '#4E9A62', 1.6); disc(g, 37, 55, 5.5, '#5FB36F', 1.6); disc(g, 33, 52, 5, '#6DBB7A', 1.6);
  dots(g, [[52, 46], [40, 38], [60, 38]], 1.2, '#4E9A62');
}
function pizza(g: G): void {
  groundShadow(g, 52, 56, 48, 28, 0.3);
  disc(g, 50, 50, 46, '#E8B861', 2.2);
  disc(g, 50, 50, 38, '#E94B44', 1.4);
  disc(g, 50, 50, 35, '#FFE58D', 0);
  for (const [x, y] of [[36, 36], [62, 34], [68, 56], [50, 64], [32, 58], [50, 48]] as Array<[number, number]>) {
    disc(g, x, y, 6, '#E8483F', 1.6); dots(g, [[x - 1.5, y - 1.5]], 1.3, 'rgba(255,255,255,0.5)');
  }
  basil(g, 45, 38, 12, -0.4); basil(g, 58, 60, 12, 2.5); basil(g, 40, 62, 11, 1.5); basil(g, 66, 42, 10, -1.6);
  dots(g, [[28, 48], [72, 50], [54, 28], [44, 76]], 1.6, '#FFF6D0');
  g.strokeStyle = 'rgba(122,70,20,0.55)'; g.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI + 0.3; g.beginPath(); g.moveTo(50 - Math.cos(a) * 36, 50 - Math.sin(a) * 36); g.lineTo(50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36); g.stroke(); }
  g.beginPath(); g.arc(50, 50, 43, Math.PI * 1.1, Math.PI * 1.4); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2.4; g.stroke();
}
function burger(g: G): void {
  plate(g);
  // frites
  for (let i = 0; i < 6; i++) { g.save(); g.translate(18 + i * 4.5, 80); g.rotate(-0.35 + i * 0.13); roundRect(g, -2, -18, 4.2, 22, 1.5); g.fillStyle = '#F3C25A'; g.fill(); stroke(g, 1.3); g.restore(); }
  // petit pain bas
  roundRect(g, 18, 56, 64, 15, 7); fillGrad(g, '#E3A04E', 18, 56, 64, 15); stroke(g, 2);
  // steak
  roundRect(g, 14, 47, 72, 12, 6); fillGrad(g, '#7A4A36', 14, 47, 72, 12); stroke(g, 2);
  // fromage
  g.beginPath(); g.moveTo(16, 45); g.lineTo(84, 45); g.lineTo(76, 54); g.lineTo(66, 49); g.lineTo(52, 56); g.lineTo(36, 49); g.lineTo(26, 54); g.closePath();
  fillGrad(g, '#FFD453', 16, 45, 68, 11); stroke(g, 1.6);
  // tomate
  roundRect(g, 18, 40, 64, 8, 4); fillGrad(g, '#EF5A4F', 18, 40, 64, 8); stroke(g, 1.8);
  // salade
  g.beginPath(); g.moveTo(14, 41);
  for (let i = 0; i <= 8; i++) g.lineTo(14 + i * 9, i % 2 ? 36 : 41.5);
  g.lineTo(86, 41); g.closePath(); fillGrad(g, '#7FC48A', 14, 34, 72, 8); stroke(g, 1.8);
  // petit pain haut
  g.beginPath(); g.moveTo(15, 36); g.quadraticCurveTo(15, 10, 50, 10); g.quadraticCurveTo(85, 10, 85, 36); g.closePath();
  fillGrad(g, '#EDAE56', 15, 10, 70, 26); stroke(g, 2.2);
  gloss(g, 36, 20, 12, 3.8, 0.55);
  for (const [x, y, r] of [[44, 18, 0.3], [56, 22, -0.5], [66, 27, 0.2], [36, 28, -0.2], [50, 29, 0.6]] as Array<[number, number, number]>) oval(g, x, y, 3, 1.6, '#FFF6D9', r, 0);
  // pique
  g.beginPath(); g.moveTo(76, 14); g.lineTo(70, 46); g.strokeStyle = OUTLINE; g.lineWidth = 1.8; g.stroke();
  disc(g, 77, 13, 3.4, PAL.roseVif, 1.4);
}

// ------------------------------------------------------------------ desserts

function fondant(g: G): void {
  plate(g);
  // coulis
  g.beginPath(); g.ellipse(52, 62, 34, 16, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(90,50,38,0.55)'; g.fill();
  // gâteau
  g.beginPath(); g.moveTo(24, 62); g.lineTo(26, 40); g.quadraticCurveTo(28, 26, 50, 26); g.quadraticCurveTo(72, 26, 74, 40); g.lineTo(76, 62); g.quadraticCurveTo(50, 74, 24, 62);
  fillGrad(g, '#7B4631', 24, 26, 52, 46); stroke(g, 2.2);
  g.beginPath(); g.ellipse(50, 36, 21, 8.5, 0, 0, Math.PI * 2); fillGrad(g, '#5A2F22', 29, 28, 42, 17); stroke(g, 1.6);
  // cœur coulant
  g.beginPath(); g.moveTo(44, 36); g.quadraticCurveTo(50, 52, 58, 46); g.quadraticCurveTo(66, 54, 56, 66); g.quadraticCurveTo(46, 70, 42, 58);
  g.fillStyle = '#3B1D14'; g.fill(); stroke(g, 1.4);
  gloss(g, 44, 32, 7, 2.4, 0.5);
  // framboise & menthe & sucre glace
  for (const [x, y] of [[72, 66], [78, 60], [76, 72]] as Array<[number, number]>) { disc(g, x, y, 5, '#E5365E', 1.5); gloss(g, x - 1.5, y - 1.5, 1.6, 1, 0.9); }
  leaf(g, 66, 58, 11, 4, -0.7, '#5FB36F');
  dots(g, [[38, 30], [56, 29], [62, 33], [34, 38], [66, 40]], 1.2, 'rgba(255,255,255,0.85)');
  heartPath(g, 20, 70, 3); g.fillStyle = PAL.roseVif; g.fill();
}
function tiramisu(g: G): void {
  plate(g);
  g.save(); g.translate(50, 52);
  // part (côté + dessus)
  g.beginPath(); g.moveTo(-30, 6); g.lineTo(-24, -14); g.lineTo(26, -14); g.lineTo(30, 6); g.lineTo(30, 20); g.lineTo(-30, 20); g.closePath();
  g.fillStyle = '#FFF3DD'; g.fill();
  g.save(); g.clip();
  const bands: Array<[number, string]> = [[-14, '#FFF8EA'], [-4, '#B27A4C'], [2, '#FFF3DC'], [9, '#B27A4C'], [15, '#FFF3DC']];
  bands.forEach(([y, c], i) => { const nxt = bands[i + 1]?.[0] ?? 22; g.fillStyle = c; g.fillRect(-32, y, 64, nxt - y); });
  g.restore();
  g.beginPath(); g.moveTo(-30, 6); g.lineTo(-24, -14); g.lineTo(26, -14); g.lineTo(30, 6); g.lineTo(30, 20); g.lineTo(-30, 20); g.closePath(); stroke(g, 2.2);
  // cacao dessus
  g.beginPath(); g.moveTo(-26, -14); g.quadraticCurveTo(0, -24, 26, -14); g.quadraticCurveTo(0, -8, -26, -14);
  g.fillStyle = '#6B3F2B'; g.fill(); stroke(g, 1.6);
  dots(g, [[-12, -16], [0, -18], [12, -16], [-4, -14], [8, -13]], 1.1, '#9A6244');
  gloss(g, -14, -18, 6, 1.6, 0.4);
  g.restore();
  // grains de café
  for (const [x, y, r] of [[34, 66, 0.4], [72, 70, -0.6]] as Array<[number, number, number]>) { oval(g, x, y, 5, 3.4, '#4A2C20', r, 1.4); g.beginPath(); g.moveTo(x - 3, y); g.quadraticCurveTo(x, y - 1.6, x + 3, y); g.strokeStyle = '#B88A6E'; g.lineWidth = 0.9; g.stroke(); }
  leaf(g, 64, 38, 11, 4, -0.5, '#5FB36F');
}
function cheesecake(g: G): void {
  plate(g);
  g.save(); g.translate(50, 54);
  // part triangulaire en perspective
  g.beginPath(); g.moveTo(-30, 10); g.lineTo(-26, -8); g.lineTo(30, 4); g.lineTo(28, 22); g.lineTo(-30, 24); g.closePath();
  g.fillStyle = '#FFF0CC'; g.fill();
  g.save(); g.clip();
  g.fillStyle = '#FFE8B8'; g.fillRect(-34, -10, 70, 24);
  g.fillStyle = '#C98A52'; g.fillRect(-34, 17, 70, 10);
  g.restore();
  g.beginPath(); g.moveTo(-30, 10); g.lineTo(-26, -8); g.lineTo(30, 4); g.lineTo(28, 22); g.lineTo(-30, 24); g.closePath(); stroke(g, 2.2);
  // coulis rouge
  g.beginPath(); g.moveTo(-26, -8); g.lineTo(30, 4); g.lineTo(29, 10); g.quadraticCurveTo(22, 14, 18, 8); g.quadraticCurveTo(14, 20, 8, 9); g.quadraticCurveTo(0, 16, -6, 6); g.quadraticCurveTo(-14, 14, -20, 4); g.quadraticCurveTo(-24, 8, -28, 5);
  g.closePath(); g.fillStyle = '#E8384F'; g.fill(); stroke(g, 1.6);
  gloss(g, -8, -2, 7, 1.8, 0.55, 0.15);
  g.restore();
  // fraise
  g.save(); g.translate(46, 44);
  g.beginPath(); g.moveTo(0, 12); g.quadraticCurveTo(-13, 0, -9, -9); g.quadraticCurveTo(0, -13, 9, -9); g.quadraticCurveTo(13, 0, 0, 12);
  fillGrad(g, '#EE3E55', -12, -12, 24, 24); stroke(g, 1.8);
  dots(g, [[-4, -3], [3, -4], [0, 2], [-5, 3], [5, 2]], 0.9, '#FFE08A');
  leaf(g, 0, -10, 6, 2.5, -2.6, '#4E9A62'); leaf(g, 0, -10, 6, 2.5, -0.5, '#4E9A62');
  g.restore();
  dots(g, [[76, 70], [26, 74]], 2, '#F58FA8');
}
function brulee(g: G): void {
  plate(g);
  // ramequin
  disc(g, 50, 50, 31, '#FFFFFF', 2.2);
  disc(g, 50, 50, 26, '#E8A93C', 1.6);
  // texture caramel
  g.save(); g.beginPath(); g.arc(50, 50, 25.5, 0, Math.PI * 2); g.clip();
  const gr = g.createRadialGradient(42, 42, 2, 50, 50, 28); gr.addColorStop(0, '#FFD57A'); gr.addColorStop(0.6, '#E8A93C'); gr.addColorStop(1, '#B9741E');
  g.fillStyle = gr; g.fillRect(20, 20, 60, 60);
  g.strokeStyle = 'rgba(120,64,10,0.55)'; g.lineWidth = 1.2;
  for (const [a, b, c, d] of [[30, 46, 52, 40], [52, 40, 66, 52], [44, 60, 60, 64], [36, 56, 44, 60], [56, 30, 52, 40]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
  g.restore();
  gloss(g, 40, 38, 9, 3.6, 0.7);
  g.beginPath(); g.arc(50, 50, 31, Math.PI * 1.1, Math.PI * 1.4); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.4; g.stroke();
  // framboises + menthe
  for (const [x, y] of [[58, 52], [64, 48], [61, 58]] as Array<[number, number]>) { disc(g, x, y, 5, '#E5365E', 1.5); gloss(g, x - 1.5, y - 1.5, 1.4, 0.9, 0.9); }
  leaf(g, 52, 46, 11, 4, -2.2, '#4E9A62');
  // vanille
  g.beginPath(); g.moveTo(80, 76); g.lineTo(90, 62); g.strokeStyle = '#3A2A28'; g.lineWidth = 2.6; g.stroke();
}
function glace(g: G): void {
  plate(g);
  // coupe
  g.beginPath(); g.moveTo(26, 56); g.quadraticCurveTo(26, 82, 50, 82); g.quadraticCurveTo(74, 82, 74, 56); g.closePath();
  g.fillStyle = 'rgba(223,238,255,0.92)'; g.fill(); stroke(g, 2);
  g.beginPath(); g.moveTo(32, 60); g.quadraticCurveTo(34, 76, 42, 78); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.4; g.stroke();
  // boules
  disc(g, 36, 52, 14, '#F9A7C2'); gloss(g, 31, 46, 4.4, 2.6, 0.8);
  disc(g, 64, 52, 14, '#7B4631'); gloss(g, 59, 46, 4.4, 2.6, 0.55);
  disc(g, 50, 40, 15, '#FFF0C2'); gloss(g, 44, 34, 4.8, 2.8, 0.9);
  // coulis chocolat
  g.beginPath(); g.moveTo(38, 30); g.quadraticCurveTo(50, 38, 62, 30); g.quadraticCurveTo(62, 42, 58, 44); g.quadraticCurveTo(56, 38, 52, 46); g.quadraticCurveTo(46, 40, 42, 46); g.quadraticCurveTo(36, 40, 38, 30);
  g.fillStyle = '#4A2517'; g.fill(); stroke(g, 1.2);
  // cerise
  disc(g, 50, 24, 5.4, '#D8213F', 1.6); gloss(g, 48, 22, 1.8, 1.1, 0.9);
  g.beginPath(); g.moveTo(50, 19); g.quadraticCurveTo(54, 10, 60, 10); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.stroke();
  // gaufrette
  g.save(); g.translate(78, 42); g.rotate(0.5);
  roundRect(g, -6, -18, 12, 30, 2); fillGrad(g, '#EBC27A', -6, -18, 12, 30); stroke(g, 1.6);
  g.strokeStyle = 'rgba(160,100,40,0.6)'; g.lineWidth = 0.9;
  for (let i = -14; i < 10; i += 6) { g.beginPath(); g.moveTo(-6, i); g.lineTo(6, i + 5); g.stroke(); }
  g.restore();
  dots(g, [[44, 48], [58, 47], [34, 58], [66, 58]], 1.1, PAL.roseVif);
}

const DRAW: Record<DishId, (g: G) => void> = {
  burrata, salade, soupe, feuillete, truffe, risotto, poulet, saumon, pizza, burger, fondant, tiramisu, cheesecake, brulee, glace,
};

/** Dessine un plat (plateau 100×100) centré en (cx, cy) à la taille `size` px. */
export function drawDish(g: G, id: DishId, cx: number, cy: number, size: number): void {
  g.save();
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(size / 100, size / 100);
  g.lineJoin = 'round'; g.lineCap = 'round';
  DRAW[id](g);
  g.restore();
}

/** Canvas d'un plat (cache), `px` en pixels CSS. */
export function dishCanvas(id: DishId, px: number, scale = 2): HTMLCanvasElement {
  return paint(px, px, scale, (g) => drawDish(g, id, px / 2, px / 2, px));
}
export function dishUrl(id: DishId, px = 110): string {
  return canvasUrl(`ev:dish:${id}:${px}`, () => dishCanvas(id, px, 2));
}
export const DISH_DRAWN_COUNT = Object.keys(DRAW).length;
