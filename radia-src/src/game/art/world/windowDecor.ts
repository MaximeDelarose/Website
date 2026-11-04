/**
 * Habillages de fenêtre achetables : voilage, store festonné, cantonnière. Dessinés par-dessus la fenêtre de la pièce
 * (mêmes coordonnées que `roomLayout`), avec un léger balancement pour le voilage.
 */
import { OUTLINE, PAL, fillShaded, roundRect, shade as kitShade, heartPath } from '../kit';
import type { RoomLayout } from './rooms';

type C = CanvasRenderingContext2D;
function toHex(c: string): string {
  if (c.startsWith('#')) return c.length === 4 ? '#' + c.slice(1).split('').map((x) => x + x).join('') : c;
  const m = c.match(/\d+/g);
  if (!m) return '#FF00FF';
  return '#' + m.slice(0, 3).map((v) => Math.max(0, Math.min(255, +v)).toString(16).padStart(2, '0')).join('');
}
const shade = (c: string, a: number): string => toHex(kitShade(toHex(c), a));

/** Forme de la fenêtre (arche) : sert de découpe. */
function winPath(c: C, win: { x: number; y: number; w: number; h: number }): void {
  c.beginPath(); c.moveTo(win.x, win.y + win.h); c.lineTo(win.x, win.y + win.w / 2); c.arc(win.x + win.w / 2, win.y + win.w / 2, win.w / 2, Math.PI, 0); c.lineTo(win.x + win.w, win.y + win.h); c.closePath();
}

export function drawWindowDecor(c: C, id: string, L: RoomLayout, color: string, t: number): void {
  const { win } = L;
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (id === 'sheer-curtain') {
    winPath(c, win); c.clip();
    const sway = Math.sin(t * 0.9) * 2;
    const g = c.createLinearGradient(win.x, 0, win.x + win.w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.62)'); g.addColorStop(0.5, 'rgba(255,255,255,0.34)'); g.addColorStop(1, 'rgba(255,255,255,0.62)');
    c.fillStyle = g; c.fillRect(win.x, win.y, win.w, win.h + 4);
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1.4;
    for (let i = 1; i < 9; i++) { const x = win.x + (win.w * i) / 9; c.beginPath(); c.moveTo(x, win.y); c.quadraticCurveTo(x + sway * (i % 2 ? 1 : -1), win.y + win.h * 0.5, x + sway, win.y + win.h + 4); c.stroke(); }
    c.fillStyle = shade(color, -0.02); c.globalAlpha = 0.5;
    c.beginPath(); c.moveTo(win.x, win.y + win.h + 4); for (let i = 0; i <= 12; i++) c.lineTo(win.x + (win.w * i) / 12, win.y + win.h - 5 + (i % 2) * 6); c.lineTo(win.x + win.w, win.y + win.h + 4); c.closePath(); c.fill();
    c.restore();
    return;
  }
  if (id === 'roman-blind') {
    winPath(c, win); c.clip();
    const hh = win.h * 0.5;
    const g = c.createLinearGradient(0, win.y, 0, win.y + hh);
    g.addColorStop(0, shade(color, 0.15)); g.addColorStop(1, shade(color, -0.1));
    c.fillStyle = g; c.fillRect(win.x - 2, win.y - 2, win.w + 4, hh + 2);
    // festons du bas
    const n = 5; const sw = win.w / n;
    for (let i = 0; i < n; i++) { c.beginPath(); c.moveTo(win.x + i * sw, win.y + hh); c.quadraticCurveTo(win.x + i * sw + sw / 2, win.y + hh + 14, win.x + (i + 1) * sw, win.y + hh); c.closePath(); c.fillStyle = shade(color, -0.04); c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUTLINE; c.stroke(); }
    c.strokeStyle = shade(color, -0.3); c.lineWidth = 1.2;
    for (let k = 1; k < 4; k++) { const y = win.y + (hh * k) / 4; c.beginPath(); c.moveTo(win.x, y); c.lineTo(win.x + win.w, y); c.stroke(); }
    c.beginPath(); c.moveTo(win.x + win.w * 0.86, win.y + hh); c.lineTo(win.x + win.w * 0.86, win.y + hh + 24); c.lineWidth = 2; c.strokeStyle = PAL.or; c.stroke();
    c.beginPath(); c.arc(win.x + win.w * 0.86, win.y + hh + 26, 3.4, 0, 7); c.fillStyle = PAL.or; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUTLINE; c.stroke();
    c.restore();
    return;
  }
  if (id === 'valance') {
    const v = L.valance;
    const y = v.y - 4; const w = v.w; const x = v.x;
    const n = 4; const sw = w / n;
    for (let i = 0; i < n; i++) {
      c.beginPath(); c.moveTo(x + i * sw, y); c.quadraticCurveTo(x + i * sw + sw / 2, y + 34, x + (i + 1) * sw, y); c.closePath();
      fillShaded(c, i % 2 ? shade(color, 0.12) : color, { x: x + i * sw, y, w: sw, h: 30 }, 1.8);
      c.strokeStyle = shade(color, -0.25); c.lineWidth = 1;
      for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + i * sw + (sw * k) / 4, y + 2); c.lineTo(x + i * sw + sw / 2, y + 26 - Math.abs(k - 2) * 4); c.stroke(); }
      heartPath(c, x + i * sw + sw / 2, y + 30, 8); fillShaded(c, PAL.or, { x: x + i * sw + sw / 2 - 4, y: y + 26, w: 8, h: 8 }, 1);
    }
    c.beginPath(); roundRect(c, x - 4, y - 4, w + 8, 8, 4); fillShaded(c, PAL.or, { x: x - 4, y: y - 4, w: w + 8, h: 8 }, 1.8);
  }
  c.restore();
}
