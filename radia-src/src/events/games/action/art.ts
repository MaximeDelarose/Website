/** Art partagé des mini-jeux d'action : affiches, snacks, symboles de cartes, flacons d'huile. Repère 100×100, contours chocolat. */
import { OUTLINE, canvasUrl, ellipse, fillShaded, gloss, groundShadow, heartPath, paint, roundRect, shade, starPath, texScale } from '../../../game/art/kit';
import { drawChocolate } from '../../../game/art/world/chocolate';
import { drawFlower } from '../../../game/art/world/garden';
import type { ChocId, FlowerId } from '../../../data/world/ids';
import type { Film } from './quiz';
import type { Oil } from './spa';
import type { Symbol_ } from './memory';

type C = CanvasRenderingContext2D;
const LW = 3;
const bx = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
const sc = (): number => texScale();

function line(c: C, w = LW): void { c.lineWidth = w; c.strokeStyle = OUTLINE; c.stroke(); }

// ------------------------------------------------------------------ snacks
function drawSnack(c: C, id: string): void {
  switch (id) {
    case 'popcorn': {
      for (const [x, y, r] of [[34, 38, 11], [50, 30, 12], [66, 38, 11], [42, 46, 10], [58, 47, 10]] as const) { ellipse(c, x, y, r, r); fillShaded(c, '#fff4d6', bx(x - r, y - r, r * 2, r * 2), 2.4); }
      c.beginPath(); c.moveTo(28, 50); c.lineTo(72, 50); c.lineTo(66, 92); c.lineTo(34, 92); c.closePath();
      fillShaded(c, '#fff', bx(28, 50, 44, 42), LW);
      c.save(); c.clip(); c.fillStyle = '#e8484f';
      for (let i = 0; i < 4; i++) c.fillRect(30 + i * 11, 48, 5.5, 46);
      c.restore();
      c.beginPath(); c.moveTo(28, 50); c.lineTo(72, 50); c.lineTo(66, 92); c.lineTo(34, 92); c.closePath(); line(c);
      break;
    }
    case 'choco': drawChocolate(c, 'praline' as ChocId, 100); break;
    case 'soda': {
      c.beginPath(); c.moveTo(30, 28); c.lineTo(70, 28); c.lineTo(64, 90); c.lineTo(36, 90); c.closePath();
      fillShaded(c, '#ffc2d8', bx(30, 28, 40, 62), LW);
      c.beginPath(); c.moveTo(32, 38); c.lineTo(68, 38); c.lineTo(66, 46); c.lineTo(34, 46); c.closePath(); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();
      c.beginPath(); c.moveTo(58, 28); c.lineTo(66, 8); c.lineWidth = 6; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke();
      ellipse(c, 44, 64, 3, 3); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill(); ellipse(c, 54, 72, 2.4, 2.4); c.fill();
      c.beginPath(); c.moveTo(30, 28); c.lineTo(70, 28); c.lineTo(64, 90); c.lineTo(36, 90); c.closePath(); line(c);
      break;
    }
    case 'macaron': {
      for (const [y, col] of [[38, '#ff9fc0'], [66, '#ff9fc0']] as const) { roundRect(c, 20, y, 60, 20, 10); fillShaded(c, col, bx(20, y, 60, 20), LW); }
      roundRect(c, 22, 54, 56, 12, 6); fillShaded(c, '#fff4e8', bx(22, 54, 56, 12), 2.4);
      gloss(c, 36, 44, 9, 3.4, 0.7);
      break;
    }
    case 'icecream': {
      c.beginPath(); c.moveTo(34, 52); c.lineTo(66, 52); c.lineTo(50, 94); c.closePath(); fillShaded(c, '#e9b872', bx(34, 52, 32, 42), LW);
      c.save(); c.clip(); c.strokeStyle = 'rgba(88,67,63,.35)'; c.lineWidth = 1.6; for (let i = -2; i < 6; i++) { c.beginPath(); c.moveTo(30 + i * 9, 50); c.lineTo(60 + i * 9, 96); c.stroke(); c.beginPath(); c.moveTo(70 - i * 9, 50); c.lineTo(40 - i * 9, 96); c.stroke(); } c.restore();
      ellipse(c, 50, 42, 24, 17); fillShaded(c, '#fff3d0', bx(26, 25, 48, 34), LW);
      ellipse(c, 50, 28, 14, 10); fillShaded(c, '#ffe7a6', bx(36, 18, 28, 20), LW);
      heartPath(c, 62, 16, 12); c.fillStyle = '#e8484f'; c.fill(); line(c, 2);
      gloss(c, 40, 38, 7, 3, 0.7);
      break;
    }
    case 'candy': {
      for (const [x, y, col, s] of [[34, 40, '#ff75a8', 34], [66, 46, '#b9a5e8', 30], [48, 70, '#f3c86b', 32]] as const) { heartPath(c, x, y, s); fillShaded(c, col, bx(x - s / 2, y - s / 2, s, s), 2.6); gloss(c, x - s * 0.18, y - s * 0.18, s * 0.12, s * 0.07, 0.8); }
      break;
    }
    case 'cotton': {
      c.beginPath(); c.moveTo(50, 60); c.lineTo(50, 96); c.lineWidth = 6; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#fff4e8'; c.stroke();
      for (const [x, y, r, col] of [[34, 40, 17, '#ffc2d8'], [66, 40, 17, '#d9ccf3'], [50, 26, 19, '#ffd1e3'], [50, 46, 20, '#ffb3cf']] as const) { ellipse(c, x, y, r, r); fillShaded(c, col, bx(x - r, y - r, r * 2, r * 2), 2.6); }
      gloss(c, 42, 24, 8, 4, 0.7);
      break;
    }
    default: { // tea
      c.beginPath(); c.moveTo(30, 30); c.lineTo(70, 30); c.lineTo(66, 90); c.lineTo(34, 90); c.closePath(); fillShaded(c, '#ffd0a8', bx(30, 30, 40, 60), LW);
      ellipse(c, 44, 60, 6, 6); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill(); ellipse(c, 58, 70, 5, 5); c.fill();
      ellipse(c, 56, 50, 8, 8); c.fillStyle = '#ffb35e'; c.fill(); line(c, 2);
      c.beginPath(); c.moveTo(60, 30); c.lineTo(68, 10); c.lineWidth = 6; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#7fc48a'; c.stroke();
      c.beginPath(); c.moveTo(30, 30); c.lineTo(70, 30); c.lineTo(66, 90); c.lineTo(34, 90); c.closePath(); line(c);
    }
  }
}
export function snackUrl(id: string): string {
  return canvasUrl(`ea:snack:${id}`, () => paint(100, 100, sc() * 1.2, (c) => { groundShadow(c, 50, 94, 28, 5, 0.25); drawSnack(c, id); }));
}

// ------------------------------------------------------------------ symboles de cartes
function drawSymbol(c: C, s: Symbol_): void {
  const flowers: Partial<Record<Symbol_, FlowerId>> = { rose: 'rose', tulip: 'tulip', peony: 'peony', daisy: 'daisy' };
  const f = flowers[s];
  if (f) { drawFlower(c, f, 3, 100); return; }
  if (s === 'heart' || s === 'truffle') { drawChocolate(c, s as ChocId, 100); return; }
  switch (s) {
    case 'dress': {
      c.beginPath(); c.moveTo(40, 14); c.lineTo(46, 14); c.lineTo(50, 24); c.lineTo(54, 14); c.lineTo(60, 14); c.lineTo(58, 40); c.lineTo(78, 90); c.quadraticCurveTo(50, 98, 22, 90); c.lineTo(42, 40); c.closePath();
      fillShaded(c, '#ff8fb6', bx(22, 14, 56, 84), LW);
      c.beginPath(); c.moveTo(42, 42); c.lineTo(58, 42); c.lineWidth = 6; c.strokeStyle = '#f3c86b'; c.stroke(); line(c, 1.5);
      gloss(c, 42, 60, 3, 12, 0.5, 0.25);
      break;
    }
    case 'heel': {
      c.beginPath(); c.moveTo(18, 30); c.lineTo(36, 28); c.quadraticCurveTo(44, 56, 70, 66); c.lineTo(84, 70); c.quadraticCurveTo(90, 76, 84, 80); c.lineTo(58, 82); c.lineTo(52, 90); c.lineTo(46, 90); c.lineTo(46, 76); c.quadraticCurveTo(24, 66, 18, 30); c.closePath();
      fillShaded(c, '#e8484f', bx(18, 28, 72, 62), LW); gloss(c, 30, 40, 3, 8, 0.6, 0.2);
      break;
    }
    case 'bag': {
      c.beginPath(); c.moveTo(34, 38); c.bezierCurveTo(34, 8, 66, 8, 66, 38); c.lineWidth = 5; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 2.4; c.strokeStyle = '#f3c86b'; c.stroke();
      roundRect(c, 18, 36, 64, 52, 10); fillShaded(c, '#b9a5e8', bx(18, 36, 64, 52), LW);
      roundRect(c, 44, 52, 12, 10, 3); c.fillStyle = '#f3c86b'; c.fill(); line(c, 2);
      gloss(c, 32, 46, 8, 3, 0.6);
      break;
    }
    case 'shades': {
      for (const x of [30, 70]) { ellipse(c, x, 54, 19, 15); fillShaded(c, '#58433f', bx(x - 19, 39, 38, 30), LW, { light: 0.15 }); gloss(c, x - 7, 48, 6, 3, 0.55); }
      c.beginPath(); c.moveTo(49, 52); c.quadraticCurveTo(50, 46, 51, 52); line(c, 3);
      c.beginPath(); c.moveTo(11, 52); c.lineTo(4, 44); c.moveTo(89, 52); c.lineTo(96, 44); line(c, 3);
      break;
    }
    case 'crown': {
      c.beginPath(); c.moveTo(16, 74); c.lineTo(12, 30); c.lineTo(34, 52); c.lineTo(50, 20); c.lineTo(66, 52); c.lineTo(88, 30); c.lineTo(84, 74); c.closePath();
      fillShaded(c, '#f3c86b', bx(12, 20, 76, 54), LW);
      for (const [x, y, col] of [[50, 22, '#ff75a8'], [12, 30, '#b9a5e8'], [88, 30, '#b9a5e8']] as const) { ellipse(c, x, y, 5, 5); c.fillStyle = col; c.fill(); line(c, 2); }
      roundRect(c, 16, 70, 68, 12, 5); fillShaded(c, '#d9a43c', bx(16, 70, 68, 12), LW);
      gloss(c, 28, 54, 5, 2.6, 0.7);
      break;
    }
    default: { // lipstick
      roundRect(c, 38, 52, 24, 40, 5); fillShaded(c, '#f3c86b', bx(38, 52, 24, 40), LW);
      roundRect(c, 40, 36, 20, 18, 3); fillShaded(c, '#d9a43c', bx(40, 36, 20, 18), 2.6);
      c.beginPath(); c.moveTo(42, 36); c.lineTo(42, 18); c.quadraticCurveTo(50, 8, 58, 18); c.lineTo(58, 36); c.closePath(); fillShaded(c, '#e0607a', bx(42, 8, 16, 28), 2.6);
      gloss(c, 46, 66, 2.4, 10, 0.6, 0.1);
    }
  }
}
export function symbolUrl(s: Symbol_): string {
  return canvasUrl(`ea:sym:${s}`, () => paint(100, 100, sc() * 1.2, (c) => { c.translate(5, 4); c.scale(0.9, 0.9); drawSymbol(c, s); }));
}
export function cardBackUrl(): string {
  return canvasUrl('ea:cardback', () => paint(100, 100, sc(), (c) => {
    roundRect(c, 2, 2, 96, 96, 16); fillShaded(c, '#f58fb3', bx(2, 2, 96, 96), LW);
    roundRect(c, 11, 11, 78, 78, 11); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.stroke();
    heartPath(c, 50, 52, 36); c.fillStyle = '#fff4e8'; c.fill(); line(c, 2.6);
    starPath(c, 24, 26, 6, 2.6); c.fillStyle = '#f3c86b'; c.fill(); starPath(c, 76, 76, 6, 2.6); c.fill();
  }));
}

// ------------------------------------------------------------------ affiches de films
export function posterCanvas(f: Film, w = 150, h = 210): HTMLCanvasElement {
  return paint(w, h, sc(), (c) => {
    roundRect(c, 3, 3, w - 6, h - 6, 12);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, f.colors[0]); g.addColorStop(1, f.colors[1]); c.fillStyle = g; c.fill(); line(c, 3);
    c.save(); roundRect(c, 3, 3, w - 6, h - 6, 12); c.clip();
    // décor de fond
    c.fillStyle = 'rgba(255,255,255,.14)';
    for (let i = 0; i < 9; i++) { starPath(c, (i * 47) % w, 20 + ((i * 29) % (h * 0.5)), 3.4, 1.4); c.fill(); }
    const cx = w / 2; const cy = h * 0.4; const s = w * 0.5;
    c.translate(cx, cy);
    if (f.motif === 'heart') { heartPath(c, 0, 0, s); fillShaded(c, '#fff4e8', bx(-s / 2, -s / 2, s, s), 3); heartPath(c, 0, 4, s * 0.55); c.fillStyle = '#ff75a8'; c.fill(); }
    else if (f.motif === 'star') { starPath(c, 0, 0, s * 0.6, s * 0.26); fillShaded(c, '#f3c86b', bx(-s / 2, -s / 2, s, s), 3); ellipse(c, 0, 0, s * 0.18, s * 0.18); c.fillStyle = '#58433f'; c.fill(); }
    else if (f.motif === 'flower') { for (let i = 0; i < 6; i++) { c.save(); c.rotate((i * Math.PI) / 3); ellipse(c, 0, -s * 0.32, s * 0.17, s * 0.28); fillShaded(c, '#ffd1e3', bx(-s * 0.17, -s * 0.6, s * 0.34, s * 0.56), 2.6); c.restore(); } ellipse(c, 0, 0, s * 0.18, s * 0.18); fillShaded(c, '#f3c86b', bx(-s * 0.18, -s * 0.18, s * 0.36, s * 0.36), 2.6); }
    else { // tour
      c.beginPath(); c.moveTo(-s * 0.4, s * 0.6); c.lineTo(-s * 0.08, -s * 0.55); c.lineTo(s * 0.08, -s * 0.55); c.lineTo(s * 0.4, s * 0.6); c.lineTo(s * 0.2, s * 0.6); c.lineTo(0, s * 0.1); c.lineTo(-s * 0.2, s * 0.6); c.closePath();
      fillShaded(c, '#fff4e8', bx(-s * 0.4, -s * 0.55, s * 0.8, s * 1.15), 3);
      c.fillStyle = '#ff75a8'; heartPath(c, 0, -s * 0.72, s * 0.22); c.fill();
    }
    c.restore();
    c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(88,67,63,.9)'; c.lineWidth = 4; c.lineJoin = 'round';
    const words = f.title.split(' ');
    const lines: string[] = []; let cur = '';
    for (const wd of words) { if ((cur + ' ' + wd).trim().length > 11 && cur) { lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); }
    if (cur) lines.push(cur);
    c.font = `700 ${Math.round(w * 0.12)}px Fredoka, system-ui, sans-serif`;
    lines.forEach((t, i) => { const y = h * 0.74 + i * w * 0.135; c.strokeText(t, w / 2, y); c.fillText(t, w / 2, y); });
    c.font = `500 ${Math.round(w * 0.075)}px Fredoka, system-ui, sans-serif`; c.lineWidth = 3; c.fillStyle = '#fff4e8';
    c.strokeText(f.tag, w / 2, h - 16); c.fillText(f.tag, w / 2, h - 16);
  });
}

// ------------------------------------------------------------------ flacon d'huile
export function oilCanvas(o: Oil, size = 96): HTMLCanvasElement {
  return paint(100, 100, size / 100 * sc(), (c) => {
    groundShadow(c, 50, 94, 26, 4, 0.25);
    roundRect(c, 40, 10, 20, 16, 4); fillShaded(c, '#f3c86b', bx(40, 10, 20, 16), 2.6);
    c.beginPath(); c.moveTo(42, 26); c.lineTo(58, 26); c.lineTo(58, 36); c.bezierCurveTo(78, 44, 82, 90, 50, 92); c.bezierCurveTo(18, 90, 22, 44, 42, 36); c.closePath();
    fillShaded(c, o.color, bx(20, 26, 60, 66), LW, { light: 0.35 });
    ellipse(c, 50, 70, 20, 14); c.fillStyle = o.accent; c.fill(); heartPath(c, 50, 70, 14); c.fillStyle = shade(o.color, -0.1); c.fill();
    gloss(c, 33, 52, 3.6, 12, 0.7, 0.3);
  });
}
export const oilUrl = (o: Oil): string => canvasUrl(`ea:oil:${o.id}`, () => oilCanvas(o));
export const posterUrl = (f: Film): string => canvasUrl(`ea:poster:${f.id}`, () => posterCanvas(f));
