/** Dessin partagé par Clips et Snap : sprites de Radia / d'Auguste en cache et autocollants vectoriels (Canvas 2D). */
import { makeCanvas, heartPath, starPath, sparkle, roundRect } from '../game/art/kit';
import { avatarCanvas } from '../game/art/world/avatar';
import { currentLook } from '../game/world/look';
import { drawAugusteCutout, augusteCutout } from '../game/art/world/radiaNow';
import { drawAugusteFull } from '../game/art/characters';
import type { Look } from '../data/world/ids';
import type { Expr } from '../data/dialogue';
import type { Sticker } from './snap/model';

type C = CanvasRenderingContext2D;

/** Radia (look donné ou actuel), pieds en bas du canevas w × h. */
export function radiaSprite(w: number, h: number, expr: Expr = 'smile', arms: 'down' | 'wave' | 'heart' | 'open' = 'down', step = 0, look: Look = currentLook()): HTMLCanvasElement {
  return avatarCanvas(look, Math.max(8, Math.round(w)), Math.max(8, Math.round(h)), { expr, arms, step });
}
const augCache = new Map<string, HTMLCanvasElement>();
/** Auguste (illustration découpée si prête, sinon dessin vectoriel), pieds en bas. */
export function augusteSprite(w: number, h: number, expr: Expr = 'smile', arms: 'down' | 'wave' | 'heart' | 'open' = 'down', step = 0): HTMLCanvasElement {
  w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h));
  const key = `${w}x${h}|${expr}|${arms}|${step}|${augusteCutout() ? 1 : 0}`;
  let c = augCache.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    const g = c.getContext('2d')!;
    const k = Math.min(w / 240, h / 600);
    g.save(); g.translate((w - 240 * k) / 2, h - 600 * k); g.scale(k, k);
    if (!drawAugusteCutout(g, 240, 600)) drawAugusteFull(g, { expr, step, arms });
    g.restore();
    if (augCache.size > 30) augCache.delete(augCache.keys().next().value as string);
    augCache.set(key, c);
  }
  return c;
}

// ---------------------------------------------------------------- autocollants
export function stickerSize(st: Sticker, W: number): number { return W * 0.13 * st.s; }

/** Boîte approximative (rayon horizontal, rayon vertical) pour le toucher. */
export function stickerRadii(st: Sticker, W: number, g?: C): [number, number] {
  const u = stickerSize(st, W);
  if (st.k !== 'text') return [u * 0.85, u * 0.85];
  const fs = u * 0.62;
  const len = (st.t ?? '').length;
  const w = g ? (g.font = `700 ${fs}px Fredoka, sans-serif`, g.measureText(st.t ?? '').width) : len * fs * 0.55;
  return [w / 2 + fs * 0.7, fs * 0.9];
}
export function stickerHit(st: Sticker, W: number, H: number, px: number, py: number): boolean {
  const [rx, ry] = stickerRadii(st, W);
  const dx = px - st.x * W, dy = py - st.y * H;
  const c = Math.cos(-st.r), s = Math.sin(-st.r);
  const x = dx * c - dy * s, y = dx * s + dy * c;
  return Math.abs(x) <= rx && Math.abs(y) <= ry;
}

const INK = '#58433f';
function outline(g: C, fill: string, lw: number): void { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); }

/** Dessine un autocollant ; `t` en secondes anime (battement, scintillement, flottement). */
export function drawSticker(g: C, st: Sticker, W: number, H: number, t: number, selected = false, animate = true): void {
  const u = stickerSize(st, W);
  let sc = 1, dy = 0, al = 1;
  if (animate) {
    if (st.a === 1) sc = 1 + 0.08 * Math.sin(t * 5 + st.x * 7);
    else if (st.a === 2) al = 0.7 + 0.3 * Math.abs(Math.sin(t * 3 + st.y * 9));
    else if (st.a === 3) dy = Math.sin(t * 2.2 + st.x * 5) * u * 0.1;
  }
  g.save();
  g.translate(st.x * W, st.y * H + dy);
  g.rotate(st.r + (animate && st.a === 3 ? Math.sin(t * 1.6) * 0.06 : 0));
  g.scale(sc, sc);
  g.globalAlpha = al;
  g.lineJoin = 'round'; g.lineCap = 'round';
  const lw = Math.max(1.4, u * 0.07);
  switch (st.k) {
    case 'heart': heartPath(g, 0, 0, u * 0.55); outline(g, '#ff6f9f', lw); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-u * 0.2, -u * 0.12, u * 0.1, u * 0.06, -0.6, 0, 7); g.fill(); break;
    case 'star': starPath(g, 0, 0, u * 0.62, u * 0.28); outline(g, '#ffd24a', lw); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(-u * 0.12, -u * 0.14, u * 0.07, 0, 7); g.fill(); break;
    case 'sparkle': sparkle(g, 0, 0, u * 0.62, '#ffffff', 1); g.strokeStyle = '#ffc94a'; g.lineWidth = lw * 0.7; g.beginPath(); g.moveTo(0, -u * 0.62); g.lineTo(0, u * 0.62); g.moveTo(-u * 0.62, 0); g.lineTo(u * 0.62, 0); g.stroke(); sparkle(g, u * 0.5, -u * 0.4, u * 0.22, '#fff6cf', 1); break;
    case 'crown': {
      g.beginPath(); g.moveTo(-u * 0.55, u * 0.3); g.lineTo(-u * 0.6, -u * 0.3); g.lineTo(-u * 0.25, 0); g.lineTo(0, -u * 0.5); g.lineTo(u * 0.25, 0); g.lineTo(u * 0.6, -u * 0.3); g.lineTo(u * 0.55, u * 0.3); g.closePath();
      outline(g, '#ffd24a', lw);
      for (const [x, c] of [[-0.3, '#ff6f9f'], [0, '#7cc4ff'], [0.3, '#ff6f9f']] as const) { g.beginPath(); g.arc(x * u, u * 0.14, u * 0.07, 0, 7); g.fillStyle = c; g.fill(); }
      break;
    }
    case 'bow': {
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-u * 0.3, -u * 0.5, -u * 0.8, -u * 0.35, -u * 0.7, 0); g.bezierCurveTo(-u * 0.8, u * 0.35, -u * 0.3, u * 0.5, 0, 0);
      g.moveTo(0, 0); g.bezierCurveTo(u * 0.3, -u * 0.5, u * 0.8, -u * 0.35, u * 0.7, 0); g.bezierCurveTo(u * 0.8, u * 0.35, u * 0.3, u * 0.5, 0, 0);
      outline(g, '#ff8fb5', lw);
      g.beginPath(); g.arc(0, 0, u * 0.14, 0, 7); outline(g, '#e8558f', lw);
      break;
    }
    case 'flower': {
      for (let i = 0; i < 5; i++) { g.save(); g.rotate((i / 5) * Math.PI * 2); g.beginPath(); g.ellipse(0, -u * 0.34, u * 0.2, u * 0.3, 0, 0, 7); outline(g, '#ffb3cf', lw * 0.8); g.restore(); }
      g.beginPath(); g.arc(0, 0, u * 0.17, 0, 7); outline(g, '#ffd24a', lw * 0.8);
      break;
    }
    case 'lips': {
      g.beginPath(); g.moveTo(-u * 0.55, 0); g.quadraticCurveTo(-u * 0.25, -u * 0.5, 0, -u * 0.18); g.quadraticCurveTo(u * 0.25, -u * 0.5, u * 0.55, 0); g.quadraticCurveTo(u * 0.25, u * 0.5, 0, u * 0.5); g.quadraticCurveTo(-u * 0.25, u * 0.5, -u * 0.55, 0); g.closePath();
      outline(g, '#ef476f', lw); g.strokeStyle = '#a02848'; g.lineWidth = lw * 0.6; g.beginPath(); g.moveTo(-u * 0.5, 0); g.quadraticCurveTo(0, u * 0.1, u * 0.5, 0); g.stroke();
      break;
    }
    case 'moon': {
      g.beginPath(); g.arc(0, 0, u * 0.5, 0, 7); g.arc(u * 0.22, -u * 0.1, u * 0.42, 0, 7, true); g.fillStyle = '#fff1a8'; g.fill('evenodd'); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
      break;
    }
    case 'text': {
      const fs = u * 0.62;
      g.font = `700 ${fs}px Fredoka, "Avenir Next", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(st.t ?? '').width, bw = tw + fs * 1.1, bh = fs * 1.5;
      g.beginPath(); roundRect(g, -bw / 2, -bh / 2, bw, bh, bh / 2);
      g.shadowColor = 'rgba(60,30,50,0.3)'; g.shadowBlur = fs * 0.2; g.shadowOffsetY = fs * 0.08;
      outline(g, '#ffffff', lw * 0.8); g.shadowColor = 'transparent';
      g.fillStyle = '#e8558f'; g.fillText(st.t ?? '', 0, fs * 0.04);
      break;
    }
  }
  g.restore();
  if (selected) {
    const [rx, ry] = stickerRadii(st, W, g);
    g.save(); g.translate(st.x * W, st.y * H); g.rotate(st.r);
    g.setLineDash([5, 4]); g.lineWidth = 1.8; g.strokeStyle = '#ffffff'; g.shadowColor = 'rgba(60,30,80,0.7)'; g.shadowBlur = 3;
    g.beginPath(); roundRect(g, -rx, -ry, rx * 2, ry * 2, 10); g.stroke();
    g.restore();
  }
}
