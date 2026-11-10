/**
 * Dessins vectoriels (Canvas 2D) du Casino Royal ♛ : symboles de la machine à sous, jetons, cartes, roue de
 * roulette, grande illustration d'accueil. Direction : rose, violet nuit, or et diamants (palette de kit.ts).
 */
import { PAL, canvasUrl, ellipse, fillShaded, glow, gloss, heartPath, paint, rgba, roundRect, seeded, shade, sparkle, starPath, texScale } from './kit';
import { drawRadiaNow, drawAugusteCutout } from './world/radiaNow';
import { drawAugusteFull } from './characters';

import { PARTNER } from '../../config/gift';
type C = CanvasRenderingContext2D;
export const CZ = {
  night: '#1E1238', night2: '#2E1B54', violet: '#4B2C86', violetLight: '#7B5BC4', rose: '#FF75A8', roseDeep: '#C23A73', gold: '#F3C86B', goldDeep: '#C9922B', goldLight: '#FFE9A8', ivory: '#FFF9EE', ink: '#3B2330',
};
const FONT = "700 {px}px Fredoka, 'Avenir Next', 'Trebuchet MS', system-ui, sans-serif";
export const font = (px: number): string => FONT.replace('{px}', String(px));

// ------------------------------------------------------------------ symboles de la machine à sous (repère 100×100)

function drawSym(ctx: C, id: string): void {
  const LW = 3.2;
  const O = PAL.choco;
  ctx.lineWidth = LW; ctx.strokeStyle = O;
  switch (id) {
    case 'heart': {
      heartPath(ctx, 50, 52, 80);
      fillShaded(ctx, PAL.roseVif, { x: 10, y: 10, w: 80, h: 80 }, LW);
      gloss(ctx, 34, 36, 10, 6, 0.75);
      sparkle(ctx, 70, 30, 6, '#fff', 0.9);
      break;
    }
    case 'flower': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        ctx.save(); ctx.translate(50 + Math.cos(a) * 21, 50 + Math.sin(a) * 21); ctx.rotate(a);
        ellipse(ctx, 0, 0, 17, 12);
        fillShaded(ctx, i % 2 ? '#FFB3CF' : '#FF9EC4', { x: -17, y: -12, w: 34, h: 24 }, LW * 0.8);
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(50, 50, 13, 0, Math.PI * 2);
      fillShaded(ctx, PAL.or, { x: 37, y: 37, w: 26, h: 26 }, LW);
      gloss(ctx, 45, 45, 4, 2.5, 0.8);
      break;
    }
    case 'choco': {
      ctx.save(); ctx.translate(50, 52); ctx.rotate(-0.18);
      roundRect(ctx, -34, -30, 68, 60, 9);
      fillShaded(ctx, '#7A4A3A', { x: -34, y: -30, w: 68, h: 60 }, LW, { light: 0.2 });
      ctx.strokeStyle = 'rgba(40,20,15,.55)'; ctx.lineWidth = 2;
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-34 + i * 22.6, -30); ctx.lineTo(-34 + i * 22.6, 30); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { roundRect(ctx, -31 + i * 22.6, -27 + j * 29, 14, 7, 3); ctx.fill(); }
      // papier doré en bas + petit cœur rose
      roundRect(ctx, -34, 14, 68, 16, 6); ctx.fillStyle = PAL.or; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = O; ctx.stroke();
      heartPath(ctx, 0, 22, 12); ctx.fillStyle = PAL.roseVif; ctx.fill();
      ctx.restore();
      break;
    }
    case 'bag': {
      ctx.lineWidth = LW * 1.3; ctx.strokeStyle = O;
      ctx.beginPath(); ctx.moveTo(32, 36); ctx.bezierCurveTo(32, 6, 68, 6, 68, 36); ctx.stroke();
      ctx.lineWidth = LW * 0.6; ctx.strokeStyle = PAL.or;
      ctx.beginPath(); ctx.moveTo(32, 36); ctx.bezierCurveTo(32, 9, 68, 9, 68, 36); ctx.stroke();
      ctx.lineWidth = LW; ctx.strokeStyle = O;
      ctx.beginPath(); ctx.moveTo(22, 34); ctx.lineTo(78, 34); ctx.quadraticCurveTo(90, 60, 84, 84); ctx.lineTo(16, 84); ctx.quadraticCurveTo(10, 60, 22, 34); ctx.closePath();
      fillShaded(ctx, '#B07CFF', { x: 10, y: 34, w: 80, h: 50 }, LW);
      ctx.beginPath(); ctx.moveTo(20, 48); ctx.quadraticCurveTo(50, 62, 80, 48); ctx.lineWidth = 2.2; ctx.strokeStyle = rgba('#2E1B54', 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(50, 56, 7, 0, Math.PI * 2); fillShaded(ctx, PAL.or, { x: 43, y: 49, w: 14, h: 14 }, 2.4);
      gloss(ctx, 28, 46, 7, 3.5, 0.55);
      break;
    }
    case 'star': {
      starPath(ctx, 50, 53, 44, 20);
      fillShaded(ctx, PAL.or, { x: 6, y: 9, w: 88, h: 88 }, LW, { light: 0.35 });
      gloss(ctx, 40, 40, 8, 4.5, 0.75);
      sparkle(ctx, 76, 24, 6, '#fff', 0.9);
      break;
    }
    case 'crown': {
      ctx.beginPath(); ctx.moveTo(14, 74); ctx.lineTo(8, 32); ctx.lineTo(30, 52); ctx.lineTo(50, 22); ctx.lineTo(70, 52); ctx.lineTo(92, 32); ctx.lineTo(86, 74); ctx.closePath();
      fillShaded(ctx, PAL.or, { x: 8, y: 22, w: 84, h: 52 }, LW, { light: 0.35 });
      roundRect(ctx, 14, 70, 72, 14, 5); fillShaded(ctx, PAL.orDeep, { x: 14, y: 70, w: 72, h: 14 }, LW, { light: 0.3 });
      for (const [x, y, c] of [[8, 30, PAL.roseVif], [50, 20, '#5AA9FF'], [92, 30, PAL.roseVif]] as const) { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); fillShaded(ctx, c, { x: x - 6, y: y - 6, w: 12, h: 12 }, 2.4); }
      for (const x of [30, 50, 70]) { ctx.beginPath(); ctx.arc(x, 77, 3.4, 0, Math.PI * 2); ctx.fillStyle = x === 50 ? '#B07CFF' : '#fff'; ctx.fill(); }
      gloss(ctx, 30, 44, 8, 3.5, 0.6);
      break;
    }
    case 'diamond': {
      const P: [number, number][] = [[28, 22], [72, 22], [92, 42], [50, 90], [8, 42]];
      ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      fillShaded(ctx, '#7FD3FF', { x: 8, y: 22, w: 84, h: 68 }, LW, { light: 0.5, dark: 0.12 });
      ctx.save(); ctx.clip();
      const facets: [[number, number][], string][] = [
        [[[8, 42], [28, 22], [38, 42]], 'rgba(255,255,255,.55)'], [[[28, 22], [50, 22], [38, 42]], 'rgba(255,255,255,.25)'],
        [[[50, 22], [72, 22], [62, 42]], 'rgba(160,200,255,.55)'], [[[72, 22], [92, 42], [62, 42]], 'rgba(60,110,200,.3)'],
        [[[8, 42], [38, 42], [50, 90]], 'rgba(60,110,200,.25)'], [[[62, 42], [92, 42], [50, 90]], 'rgba(40,80,170,.35)'],
        [[[38, 42], [62, 42], [50, 90]], 'rgba(255,255,255,.3)'],
      ];
      for (const [pts, col] of facets) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }
      ctx.restore();
      ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(88,67,63,.55)';
      ctx.beginPath(); ctx.moveTo(8, 42); ctx.lineTo(92, 42); ctx.moveTo(38, 42); ctx.lineTo(28, 22); ctx.moveTo(62, 42); ctx.lineTo(72, 22); ctx.moveTo(38, 42); ctx.lineTo(50, 90); ctx.moveTo(62, 42); ctx.lineTo(50, 90); ctx.stroke();
      sparkle(ctx, 78, 20, 8, '#fff', 1); sparkle(ctx, 20, 70, 5, '#fff', 0.85);
      break;
    }
  }
}

export function slotSymbolCanvas(id: string, size = 96): HTMLCanvasElement {
  return paint(100, 100, (size * texScale()) / 100, (ctx) => drawSym(ctx, id));
}
export const slotSymbolUrl = (id: string, size = 96): string => canvasUrl(`cz-sym-${id}-${size}`, () => slotSymbolCanvas(id, size));

// ------------------------------------------------------------------ jetons

export const CHIP_COLORS: Record<number, [string, string]> = {
  1: ['#FFFFFF', '#B9A5E8'], 5: ['#FF75A8', '#FFFFFF'], 10: ['#9A7AE0', '#FFFFFF'], 25: ['#4FB98A', '#FFFFFF'], 50: ['#F3C86B', '#7A4A12'], 100: ['#2E1B54', '#F3C86B'],
};
export function chipCanvas(value: number, size = 64): HTMLCanvasElement {
  const [base, accent] = CHIP_COLORS[value] ?? CHIP_COLORS[5];
  return paint(100, 100, (size * texScale()) / 100, (ctx) => {
    ctx.beginPath(); ctx.arc(50, 54, 44, 0, Math.PI * 2); ctx.fillStyle = 'rgba(30,18,56,.28)'; ctx.fill();
    ctx.beginPath(); ctx.arc(50, 50, 44, 0, Math.PI * 2);
    fillShaded(ctx, base, { x: 6, y: 6, w: 88, h: 88 }, 3.4, { light: 0.2, dark: 0.18 });
    // liseré à rayures
    ctx.save(); ctx.lineWidth = 8; ctx.strokeStyle = accent; ctx.setLineDash([9, 9.2]);
    ctx.beginPath(); ctx.arc(50, 50, 38.5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.arc(50, 50, 29, 0, Math.PI * 2); ctx.fillStyle = shade(base, 0.12); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = accent; ctx.stroke();
    ctx.fillStyle = base === '#FFFFFF' || base === '#F3C86B' ? '#3B2330' : '#fff';
    ctx.font = font(value >= 100 ? 24 : 30); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(value), 50, 52);
    gloss(ctx, 32, 28, 11, 5, 0.55);
  });
}
export const chipUrl = (value: number, size = 64): string => canvasUrl(`cz-chip-${value}-${size}`, () => chipCanvas(value, size));

// ------------------------------------------------------------------ cartes (repère 100×140)

function suitPath(ctx: C, suit: number, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  if (suit === 0) { heartPath(ctx, cx, cy - s * 0.04, s * 1.0); return; }
  if (suit === 1) { ctx.moveTo(cx, cy - s * 0.55); ctx.quadraticCurveTo(cx + s * 0.2, cy - s * 0.2, cx + s * 0.4, cy); ctx.quadraticCurveTo(cx + s * 0.2, cy + s * 0.2, cx, cy + s * 0.55); ctx.quadraticCurveTo(cx - s * 0.2, cy + s * 0.2, cx - s * 0.4, cy); ctx.quadraticCurveTo(cx - s * 0.2, cy - s * 0.2, cx, cy - s * 0.55); ctx.closePath(); return; }
  if (suit === 2) {
    ctx.moveTo(cx, cy - s * 0.55);
    ctx.bezierCurveTo(cx + s * 0.1, cy - s * 0.35, cx + s * 0.55, cy - s * 0.1, cx + s * 0.45, cy + s * 0.18);
    ctx.bezierCurveTo(cx + s * 0.4, cy + s * 0.38, cx + s * 0.12, cy + s * 0.34, cx + s * 0.06, cy + s * 0.2);
    ctx.quadraticCurveTo(cx + s * 0.08, cy + s * 0.4, cx + s * 0.2, cy + s * 0.55); ctx.lineTo(cx - s * 0.2, cy + s * 0.55);
    ctx.quadraticCurveTo(cx - s * 0.08, cy + s * 0.4, cx - s * 0.06, cy + s * 0.2);
    ctx.bezierCurveTo(cx - s * 0.12, cy + s * 0.34, cx - s * 0.4, cy + s * 0.38, cx - s * 0.45, cy + s * 0.18);
    ctx.bezierCurveTo(cx - s * 0.55, cy - s * 0.1, cx - s * 0.1, cy - s * 0.35, cx, cy - s * 0.55);
    ctx.closePath(); return;
  }
  // trèfle
  const r = s * 0.2;
  ctx.arc(cx, cy - s * 0.26, r, 0, Math.PI * 2); ctx.moveTo(cx - s * 0.25 + r, cy + s * 0.06); ctx.arc(cx - s * 0.25, cy + s * 0.06, r, 0, Math.PI * 2);
  ctx.moveTo(cx + s * 0.25 + r, cy + s * 0.06); ctx.arc(cx + s * 0.25, cy + s * 0.06, r, 0, Math.PI * 2);
  ctx.moveTo(cx - s * 0.04, cy); ctx.lineTo(cx + s * 0.04, cy); ctx.lineTo(cx + s * 0.2, cy + s * 0.55); ctx.lineTo(cx - s * 0.2, cy + s * 0.55); ctx.closePath();
}
const suitColor = (suit: number): string => (suit < 2 ? '#E8387F' : '#3B2A6B');
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'];

export function cardFaceCanvas(rank: number, suit: number, w = 80): HTMLCanvasElement {
  return paint(100, 140, (w * texScale()) / 100, (ctx) => {
    ctx.beginPath(); roundRect(ctx, 3, 3, 94, 134, 11); ctx.fillStyle = 'rgba(30,18,56,.25)'; ctx.fill();
    roundRect(ctx, 2, 2, 94, 134, 11);
    const g = ctx.createLinearGradient(0, 0, 0, 140); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#F6EAF8'); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2.6; ctx.strokeStyle = CZ.violet; ctx.stroke();
    roundRect(ctx, 7, 7, 84, 124, 8); ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(CZ.gold, 0.9); ctx.stroke();
    const col = suitColor(suit);
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lab = RANKS[rank];
    ctx.font = font(lab.length > 1 ? 21 : 26); ctx.fillText(lab, 21, 25);
    suitPath(ctx, suit, 21, 47, 17); ctx.fill();
    ctx.save(); ctx.translate(100, 140); ctx.rotate(Math.PI); ctx.translate(2, 2);
    ctx.font = font(lab.length > 1 ? 21 : 26); ctx.fillText(lab, 21 + 2, 25 + 2); suitPath(ctx, suit, 23, 49, 17); ctx.fill(); ctx.restore();
    // centre
    if (rank >= 11) {
      roundRect(ctx, 26, 34, 44, 66, 9); ctx.fillStyle = rgba(col, 0.1); ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(CZ.gold, 0.95); ctx.stroke();
      ctx.font = font(44); ctx.fillStyle = col; ctx.fillText(lab, 48, 70);
      suitPath(ctx, suit, 48, 90, 20); ctx.fill();
      // petite couronne dorée
      ctx.beginPath(); ctx.moveTo(34, 46); ctx.lineTo(37, 38); ctx.lineTo(43, 43); ctx.lineTo(48, 36); ctx.lineTo(53, 43); ctx.lineTo(59, 38); ctx.lineTo(62, 46); ctx.closePath(); ctx.fillStyle = CZ.gold; ctx.fill();
    } else if (rank === 1) {
      suitPath(ctx, suit, 48, 72, 52); ctx.fill(); gloss(ctx, 38, 56, 8, 4, 0.5);
    } else {
      const cols: [number, number][] = [[32, 0], [64, 0]];
      const mid = 48;
      const pos: Record<number, [number, number][]> = {
        2: [[mid, 36], [mid, 108]], 3: [[mid, 36], [mid, 72], [mid, 108]], 4: [[32, 40], [64, 40], [32, 104], [64, 104]],
        5: [[32, 40], [64, 40], [mid, 72], [32, 104], [64, 104]], 6: [[32, 40], [64, 40], [32, 72], [64, 72], [32, 104], [64, 104]],
        7: [[32, 40], [64, 40], [mid, 56], [32, 72], [64, 72], [32, 104], [64, 104]], 8: [[32, 40], [64, 40], [mid, 56], [32, 72], [64, 72], [mid, 88], [32, 104], [64, 104]],
        9: [[32, 38], [64, 38], [32, 62], [64, 62], [mid, 72], [32, 84], [64, 84], [32, 106], [64, 106]],
        10: [[32, 36], [64, 36], [mid, 48], [32, 62], [64, 62], [32, 84], [64, 84], [mid, 96], [32, 108], [64, 108]],
      };
      void cols;
      for (const [x, y] of pos[rank] ?? []) { suitPath(ctx, suit, x, y, 21); ctx.fill(); }
    }
  });
}
export const cardFaceUrl = (rank: number, suit: number, w = 80): string => canvasUrl(`cz-card-${rank}-${suit}-${w}`, () => cardFaceCanvas(rank, suit, w));

export function cardBackCanvas(w = 80): HTMLCanvasElement {
  return paint(100, 140, (w * texScale()) / 100, (ctx) => {
    ctx.beginPath(); roundRect(ctx, 3, 3, 94, 134, 11); ctx.fillStyle = 'rgba(30,18,56,.25)'; ctx.fill();
    roundRect(ctx, 2, 2, 94, 134, 11);
    const g = ctx.createLinearGradient(0, 0, 100, 140); g.addColorStop(0, '#FF8FBA'); g.addColorStop(0.5, '#B25CC9'); g.addColorStop(1, '#5B3AA6'); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2.6; ctx.strokeStyle = '#F3C86B'; ctx.stroke();
    ctx.save(); roundRect(ctx, 9, 9, 80, 122, 7); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.4;
    for (let i = -140; i < 240; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 140, 140); ctx.moveTo(i + 140, 0); ctx.lineTo(i, 140); ctx.stroke(); }
    ctx.restore();
    roundRect(ctx, 9, 9, 80, 122, 7); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,233,168,.9)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(48, 70, 22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(46,27,84,.55)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#F3C86B'; ctx.stroke();
    heartPath(ctx, 48, 70, 26); ctx.fillStyle = '#FFE9A8'; ctx.fill();
    sparkle(ctx, 70, 28, 7, '#fff', 0.9); sparkle(ctx, 26, 112, 6, '#fff', 0.8);
  });
}
export const cardBackUrl = (w = 80): string => canvasUrl(`cz-back-${w}`, () => cardBackCanvas(w));

// ------------------------------------------------------------------ roue de roulette

/** Texture de la roue (sans la bille) : anneau doré, 37 cases numérotées, cône central. Repère R = rayon en pixels. */
export function rouletteWheelCanvas(R: number, order: readonly number[], colorOf: (n: number) => string): HTMLCanvasElement {
  const S = Math.ceil(R * 2 * texScale());
  const k = S / (R * 2);
  return paint(R * 2, R * 2, k, (ctx) => {
    const cx = R, cy = R, n = order.length, step = (Math.PI * 2) / n;
    // bois / or extérieur
    ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
    const og = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    og.addColorStop(0, '#FFE9A8'); og.addColorStop(0.6, '#D9A43C'); og.addColorStop(1, '#8F5E14'); ctx.fillStyle = og; ctx.fill();
    ctx.lineWidth = R * 0.02; ctx.strokeStyle = CZ.ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.94, 0, Math.PI * 2); ctx.fillStyle = '#3B1F52'; ctx.fill();
    // cases
    const rOut = R * 0.9, rIn = R * 0.62;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + (i - 0.5) * step, a1 = a0 + step;
      ctx.beginPath(); ctx.arc(cx, cy, rOut, a0, a1); ctx.arc(cx, cy, rIn, a1, a0, true); ctx.closePath();
      const col = colorOf(order[i]);
      ctx.fillStyle = col === 'red' ? '#D6336C' : col === 'black' ? '#241636' : '#2FA36B'; ctx.fill();
      ctx.lineWidth = R * 0.008; ctx.strokeStyle = '#F3C86B'; ctx.stroke();
      // numéro
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2 + i * step + Math.PI / 2 * 0); ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#FFF9EE'; ctx.font = font(R * 0.105); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(order[i]), 0, -R * 0.785);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, rIn, 0, Math.PI * 2); ctx.lineWidth = R * 0.02; ctx.strokeStyle = '#F3C86B'; ctx.stroke();
    // fond des alvéoles (anneau intérieur)
    const ig = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, rIn);
    ig.addColorStop(0, '#6B3FA0'); ig.addColorStop(1, '#2E1B54');
    ctx.beginPath(); ctx.arc(cx, cy, rIn - R * 0.01, 0, Math.PI * 2); ctx.fillStyle = ig; ctx.fill();
    // cône
    const cg = ctx.createRadialGradient(cx - R * 0.08, cy - R * 0.1, R * 0.02, cx, cy, R * 0.3);
    cg.addColorStop(0, '#FFF3C4'); cg.addColorStop(0.6, '#F3C86B'); cg.addColorStop(1, '#B07B1C');
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.3, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill(); ctx.lineWidth = R * 0.015; ctx.strokeStyle = CZ.ink; ctx.stroke();
    // branches
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.1, cy + Math.sin(a) * R * 0.1); ctx.lineTo(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5);
      ctx.lineWidth = R * 0.05; ctx.strokeStyle = '#D9A43C'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5, R * 0.045, 0, Math.PI * 2); ctx.fillStyle = '#FFE9A8'; ctx.fill(); ctx.lineWidth = R * 0.012; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.09, 0, Math.PI * 2); ctx.fillStyle = '#FFE9A8'; ctx.fill(); ctx.stroke();
  });
}

// ------------------------------------------------------------------ roue de cadeaux (pastel)

export function giftWheelCanvas(R: number, lots: { color: string; emoji: string; short?: string }[]): HTMLCanvasElement {
  const S = Math.ceil(R * 2 * texScale());
  const k = S / (R * 2);
  return paint(R * 2, R * 2, k, (ctx) => {
    const cx = R, cy = R, n = lots.length, step = (Math.PI * 2) / n;
    ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
    const og = ctx.createLinearGradient(0, 0, R * 2, R * 2); og.addColorStop(0, '#FFE9A8'); og.addColorStop(0.5, '#F3C86B'); og.addColorStop(1, '#D9A43C'); ctx.fillStyle = og; ctx.fill();
    ctx.lineWidth = R * 0.025; ctx.strokeStyle = PAL.choco; ctx.stroke();
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 0.945, cy + Math.sin(a) * R * 0.945, R * 0.022, 0, Math.PI * 2); ctx.fillStyle = i % 2 ? '#fff' : '#FF75A8'; ctx.fill(); }
    const rr = R * 0.89;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + (i - 0.5) * step, a1 = a0 + step;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, rr, a0, a1); ctx.closePath();
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.35, lots[i].color); g.addColorStop(1, shade(lots[i].color, -0.06)); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = R * 0.012; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * step);
      ctx.font = `${Math.round(R * 0.19)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lots[i].emoji, 0, -R * 0.64);
      if (lots[i].short) { ctx.font = font(R * 0.115); ctx.fillStyle = PAL.choco; ctx.fillText(lots[i].short ?? '', 0, -R * 0.4); }
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2);
    const hg = ctx.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, R * 0.16); hg.addColorStop(0, '#FFF3C4'); hg.addColorStop(1, '#D9A43C'); ctx.fillStyle = hg; ctx.fill(); ctx.lineWidth = R * 0.02; ctx.strokeStyle = PAL.choco; ctx.stroke();
    heartPath(ctx, cx, cy, R * 0.15); ctx.fillStyle = PAL.roseVif; ctx.fill();
  });
}

// ------------------------------------------------------------------ accueil du casino

function chandelier(ctx: C, cx: number, y: number, s: number): void {
  glow(ctx, cx, y + 50 * s, 120 * s, CZ.goldLight, 0.4);
  ctx.strokeStyle = CZ.goldDeep; ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, y + 16 * s); ctx.stroke();
  ctx.lineWidth = 3 * s; ctx.strokeStyle = CZ.gold;
  ctx.beginPath(); ctx.moveTo(cx - 52 * s, y + 38 * s); ctx.quadraticCurveTo(cx, y + 62 * s, cx + 52 * s, y + 38 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 30 * s, y + 24 * s); ctx.quadraticCurveTo(cx, y + 42 * s, cx + 30 * s, y + 24 * s); ctx.stroke();
  for (const x of [-52, -30, 0, 30, 52]) {
    const px = cx + x * s, py = y + (Math.abs(x) > 40 ? 36 : Math.abs(x) > 20 ? 22 : 12) * s;
    ctx.fillStyle = CZ.ivory; ctx.fillRect(px - 2 * s, py - 10 * s, 4 * s, 9 * s);
    ctx.beginPath(); ctx.ellipse(px, py - 13 * s, 3.2 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFE08A'; ctx.fill();
    glow(ctx, px, py - 13 * s, 12 * s, '#FFE08A', 0.7);
  }
  for (let i = 0; i < 9; i++) {
    const t = i / 8, px = cx - 50 * s + t * 100 * s, py = y + (38 + Math.sin(t * Math.PI) * 14) * s;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 3 * s, py + 10 * s); ctx.lineTo(px, py + 17 * s); ctx.lineTo(px + 3 * s, py + 10 * s); ctx.closePath();
    ctx.fillStyle = i % 2 ? 'rgba(200,230,255,.9)' : 'rgba(255,200,230,.9)'; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
  }
}

function miniSlot(ctx: C, x: number, y: number, s: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  roundRect(ctx, 0, 0, 56, 84, 9); fillShaded(ctx, '#7B2D8C', { x: 0, y: 0, w: 56, h: 84 }, 2.4);
  roundRect(ctx, 7, 14, 42, 26, 5); ctx.fillStyle = CZ.ivory; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = CZ.gold; ctx.stroke();
  ctx.font = font(15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#E8387F'; ctx.fillText('♥ ♛ ♦', 28, 28);
  roundRect(ctx, 14, 52, 28, 12, 5); ctx.fillStyle = CZ.gold; ctx.fill();
  for (const dx of [10, 28, 46]) { ctx.beginPath(); ctx.arc(dx, 7, 2.6, 0, Math.PI * 2); ctx.fillStyle = '#FFE08A'; ctx.fill(); }
  ctx.restore();
}

/** Proportion de l'illustration d'accueil (hauteur / largeur) et zones tactiles (en fraction de la largeur / hauteur). */
export const HALL_ASPECT = 0.78;
export interface Spot { x: number; y: number; w: number; h: number }
export const HALL_SPOTS: Record<'slots' | 'wheel' | 'roulette' | 'blackjack' | 'radia' | 'auguste', Spot> = {
  slots: { x: 0.08, y: 0.5, w: 0.26, h: 0.3 },
  wheel: { x: 0.7, y: 0.25, w: 0.24, h: 0.4 },
  roulette: { x: 0.0, y: 0.78, w: 0.36, h: 0.22 },
  blackjack: { x: 0.64, y: 0.78, w: 0.36, h: 0.22 },
  radia: { x: 0.3, y: 0.18, w: 0.2, h: 0.62 },
  auguste: { x: 0.5, y: 0.18, w: 0.2, h: 0.62 },
};

/** Grande roue du jour (décor) : anneau doré à ampoules, huit parts pastel, cœur au centre, piédestal. */
function drawBigWheel(ctx: C, cx: number, cy: number, R: number, floorY: number, t: number): void {
  // piédestal
  ctx.fillStyle = '#5B2D8C'; roundRect(ctx, cx - 7, cy + R * 0.7, 14, floorY - cy - R * 0.7, 3); ctx.fill();
  roundRect(ctx, cx - 26, floorY - 10, 52, 12, 5); fillShaded(ctx, '#7B2D8C', { x: cx - 26, y: floorY - 10, w: 52, h: 12 }, 2);
  glow(ctx, cx, cy, R * 1.5, '#FFD9E8', 0.35);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  const og = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R); og.addColorStop(0, '#FFE9A8'); og.addColorStop(0.5, '#F3C86B'); og.addColorStop(1, '#C9922B');
  ctx.fillStyle = og; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = CZ.ink; ctx.stroke();
  const cols = ['#FFC6DA', '#E3D3FF', '#FFE08A', '#C9F0DD', '#CFE8FF', '#FFD0A8', '#F5C2E7', '#D2BEFF'];
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.84, a0, a1); ctx.closePath(); ctx.fillStyle = cols[i]; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
  }
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92, 2, 0, Math.PI * 2); ctx.fillStyle = (i + Math.floor(t * 2)) % 2 ? '#fff' : '#FF75A8'; ctx.fill(); }
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.2, 0, Math.PI * 2); ctx.fillStyle = CZ.gold; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = CZ.ink; ctx.stroke();
  heartPath(ctx, cx, cy, R * 0.2); ctx.fillStyle = PAL.roseVif; ctx.fill();
  // flèche
  ctx.beginPath(); ctx.moveTo(cx - 7, cy - R - 7); ctx.lineTo(cx + 7, cy - R - 7); ctx.lineTo(cx, cy - R + 9); ctx.closePath(); ctx.fillStyle = '#E8387F'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = CZ.ink; ctx.stroke();
}

/** Table de roulette (vue de dessus inclinée) : feutre, bord doré, petite roue, piles de tickets. */
function drawRouletteTable(ctx: C, cx: number, cy: number): void {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy + 6, 62, 24, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(20,10,40,.45)'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy, 60, 23, 0, 0, Math.PI * 2); const g = ctx.createLinearGradient(0, cy - 23, 0, cy + 23); g.addColorStop(0, '#E8387F'); g.addColorStop(1, '#9B1F5C'); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = CZ.gold; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, 52, 18, 0, 0, Math.PI * 2); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,233,168,.55)'; ctx.stroke();
  // petite roue
  ctx.save(); ctx.translate(cx - 14, cy - 2); ctx.scale(1, 0.46);
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fillStyle = '#D9A43C'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = CZ.ink; ctx.stroke();
  for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 13.5, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2); ctx.closePath(); ctx.fillStyle = i % 2 ? '#241636' : '#D6336C'; ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fillStyle = CZ.goldLight; ctx.fill(); ctx.restore();
  // tapis des mises (cases)
  for (let i = 0; i < 4; i++) { roundRect(ctx, cx + 8 + i * 11, cy - 9, 9, 13, 2); ctx.fillStyle = i % 2 ? '#241636' : '#D6336C'; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = CZ.gold; ctx.stroke(); }
  // piles de tickets
  for (const [dx, n, col] of [[-44, 4, '#F3C86B'], [-37, 3, '#9A7AE0'], [38, 3, '#4FB98A']] as const) for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.ellipse(cx + dx, cy + 8 - k * 2.6, 6, 2.6, 0, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = CZ.ink; ctx.stroke(); }
  ctx.restore();
}

/** Table de blackjack : demi-lune de feutre violet, cartes étalées, tickets. */
function drawBlackjackTable(ctx: C, cx: number, cy: number): void {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy + 6, 62, 24, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(20,10,40,.45)'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy, 60, 23, 0, 0, Math.PI * 2); const g = ctx.createLinearGradient(0, cy - 23, 0, cy + 23); g.addColorStop(0, '#7B5BC4'); g.addColorStop(1, '#3A2170'); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = CZ.gold; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, 46, 13, 0, 0.1 * Math.PI, 0.9 * Math.PI); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,233,168,.6)'; ctx.stroke();
  const card = (x: number, y: number, rot: number, suit: string, red: boolean) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); roundRect(ctx, -7, -10, 14, 20, 2.5); ctx.fillStyle = CZ.ivory; ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = CZ.ink; ctx.stroke();
    ctx.fillStyle = red ? '#D6336C' : '#241636'; ctx.font = font(10); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(suit, 0, 1); ctx.restore();
  };
  card(cx - 22, cy - 4, -0.25, '♥', true); card(cx - 12, cy - 3, -0.08, '♛', false); card(cx + 16, cy - 3, 0.12, '♦', true); card(cx + 27, cy - 2, 0.3, 'A', false);
  for (const [dx, n, col] of [[-46, 3, '#FF75A8'], [42, 4, '#F3C86B']] as const) for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.ellipse(cx + dx, cy + 8 - k * 2.6, 6, 2.6, 0, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = CZ.ink; ctx.stroke(); }
  ctx.restore();
}

/** Grande illustration d'accueil (repère 400×312) : salon, lustres, tapis, machines, roue du jour, tables — et Radia & Auguste. */
export function drawCasinoHall(ctx: C, W = 400, H = 312, t = 0): void {
  const k = W / 400;
  ctx.save(); ctx.scale(k, k);
  H = H / k; W = 400;
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1E1238'); bg.addColorStop(0.55, '#3A2170'); bg.addColorStop(1, '#6A2F86'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // panneaux dorés au mur + moulures
  for (let i = 0; i < 4; i++) { const x = 40 + i * 100; roundRect(ctx, x, 40, 70, 150, 8); ctx.strokeStyle = 'rgba(243,200,107,.35)'; ctx.lineWidth = 1.6; ctx.stroke(); roundRect(ctx, x + 6, 46, 58, 138, 5); ctx.strokeStyle = 'rgba(243,200,107,.16)'; ctx.stroke(); }
  ctx.fillStyle = 'rgba(243,200,107,.5)'; ctx.fillRect(0, H - 76, W, 3);
  const r = seeded(11);
  for (let i = 0; i < 26; i++) sparkle(ctx, r() * W, r() * H * 0.62, 1.5 + r() * 3, '#FFE9A8', 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + i)));
  glow(ctx, W / 2, 40, 190, '#FFB6D9', 0.28);
  const floor = H - 70;
  // machines à sous alignées contre le mur de gauche
  miniSlot(ctx, 40, floor - 76, 0.85); miniSlot(ctx, 86, floor - 76, 0.85);
  // grande roue du jour à droite
  drawBigWheel(ctx, 328, floor - 100, 36, floor + 6, t);
  // rideaux
  for (const side of [-1, 1] as const) {
    ctx.save(); if (side === 1) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, 0); ctx.bezierCurveTo(26, 60, 36, 120, 22, H * 0.72); ctx.bezierCurveTo(16, H * 0.85, 12, H * 0.9, 0, H); ctx.closePath();
    const cg = ctx.createLinearGradient(0, 0, 36, 0); cg.addColorStop(0, '#7A1A4A'); cg.addColorStop(0.5, '#C23A73'); cg.addColorStop(1, '#8F2456'); ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,225,.25)'; ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * 11, 0); ctx.bezierCurveTo(i * 8, 70, i * 12, 140, i * 6, H); ctx.stroke(); }
    ctx.fillStyle = CZ.gold; ctx.fillRect(0, 0, 36, 7);
    ctx.beginPath(); ctx.arc(22, H * 0.5, 5, 0, Math.PI * 2); ctx.fillStyle = CZ.gold; ctx.fill();
    ctx.restore();
  }
  chandelier(ctx, W / 2, 0, 1); chandelier(ctx, 92, 0, 0.5); chandelier(ctx, 308, 0, 0.5);
  // tapis raffiné : bordure or, liseré, losanges
  const cy = floor;
  ctx.beginPath(); ctx.moveTo(40, cy); ctx.lineTo(W - 40, cy); ctx.lineTo(W + 20, H); ctx.lineTo(-20, H); ctx.closePath();
  const rg = ctx.createLinearGradient(0, cy, 0, H); rg.addColorStop(0, '#E8387F'); rg.addColorStop(1, '#9B1F5C'); ctx.fillStyle = rg; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = CZ.gold; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,233,168,.22)'; ctx.lineWidth = 1.2;
  for (let i = -10; i < 20; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 30, cy); ctx.lineTo(W / 2 + i * 62, H); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,233,168,.2)';
  for (let i = 0; i < 9; i++) { const x = 20 + i * 45; ctx.beginPath(); ctx.moveTo(x, H - 8); ctx.lineTo(x + 7, H - 14); ctx.lineTo(x + 14, H - 8); ctx.lineTo(x + 7, H - 2); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(52, cy + 7); ctx.lineTo(W - 52, cy + 7); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,233,168,.5)'; ctx.stroke();
  // tables de jeu (avant-plan, aux coins)
  drawRouletteTable(ctx, 62, H - 30); drawBlackjackTable(ctx, 338, H - 30);
  // personnages
  const figH = H - 96;
  const draw = (who: 'radia' | 'auguste', x: number, flip: boolean) => {
    ctx.save();
    const w = figH * 0.4;
    ctx.translate(x, 52); if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    const shadowY = figH + 3;
    ctx.save(); ctx.translate(w / 2, shadowY); ctx.scale(1, 0.18); ctx.beginPath(); ctx.arc(0, 0, w * 0.45, 0, Math.PI * 2); ctx.fillStyle = 'rgba(30,18,56,.45)'; ctx.fill(); ctx.restore();
    try {
      if (who === 'radia') drawRadiaNow(ctx, w, figH, { expr: 'smile', arms: 'open' });
      else {
        ctx.save(); ctx.translate((w - 240 * (figH / 600)) / 2, 0); ctx.scale(figH / 600, figH / 600);
        if (!drawAugusteCutout(ctx, 240, 600)) drawAugusteFull(ctx, { expr: 'smile' });
        ctx.restore();
      }
    } catch { /* décor sans personnage plutôt qu'une erreur */ }
    ctx.restore();
  };
  draw('radia', W / 2 - figH * 0.4 - 4, false);
  draw('auguste', W / 2 + 4, false);
  sparkle(ctx, W / 2, H * 0.28, 7, '#fff', 0.9); sparkle(ctx, W / 2 - 80, H * 0.4, 5, '#FFE9A8', 0.8); sparkle(ctx, W / 2 + 84, H * 0.34, 6, '#FFD0E6', 0.8);
  ctx.restore();
}

export function casinoHallCanvas(w = 393, h = Math.round(w * HALL_ASPECT), t = 0): HTMLCanvasElement {
  const k = texScale();
  const c = paint(w, h, k, (ctx) => drawCasinoHall(ctx, w, h, t));
  return c;
}

/** Carte d'Auguste (carte de membre) : repère 320×200. */
export function memberCardCanvas(w = 320): HTMLCanvasElement {
  return paint(320, 200, (w * texScale()) / 320, (ctx) => {
    roundRect(ctx, 4, 6, 312, 190, 20); ctx.fillStyle = 'rgba(20,10,40,.4)'; ctx.fill();
    roundRect(ctx, 2, 2, 312, 190, 20);
    const g = ctx.createLinearGradient(0, 0, 320, 200); g.addColorStop(0, '#2E1B54'); g.addColorStop(0.55, '#5B2D8C'); g.addColorStop(1, '#C23A73'); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = CZ.gold; ctx.stroke();
    roundRect(ctx, 10, 10, 296, 174, 14); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,233,168,.55)'; ctx.stroke();
    ctx.save(); roundRect(ctx, 2, 2, 312, 190, 20); ctx.clip();
    glow(ctx, 250, 40, 120, '#FFB6D9', 0.35);
    ctx.strokeStyle = 'rgba(255,233,168,.12)'; ctx.lineWidth = 1.4;
    for (let i = -200; i < 400; i += 22) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 200, 200); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = CZ.goldLight; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = font(15); ctx.fillText('CASINO ROYAL', 26, 40);
    ctx.font = font(11); ctx.fillStyle = 'rgba(255,233,168,.8)'; ctx.fillText('CARTE DE MEMBRE', 26, 56);
    // puce
    roundRect(ctx, 26, 76, 44, 34, 7); const pg = ctx.createLinearGradient(26, 76, 70, 110); pg.addColorStop(0, '#FFE9A8'); pg.addColorStop(1, '#C9922B'); ctx.fillStyle = pg; ctx.fill();
    ctx.strokeStyle = 'rgba(80,50,10,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(26, 93); ctx.lineTo(70, 93); ctx.moveTo(48, 76); ctx.lineTo(48, 110); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = font(22); ctx.fillText('♛  Radia  ♡', 26, 152);
    ctx.font = font(12); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText(`offerte par ${PARTNER}`, 26, 172);
    heartPath(ctx, 262, 128, 72); ctx.fillStyle = 'rgba(255,117,168,.9)'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = CZ.goldLight; ctx.stroke();
    starPath(ctx, 262, 122, 18, 8); ctx.fillStyle = CZ.gold; ctx.fill();
    sparkle(ctx, 290, 40, 9, '#fff', 0.95); sparkle(ctx, 230, 70, 6, '#FFE9A8', 0.8);
  });
}
export const memberCardUrl = (w = 320): string => canvasUrl(`cz-member-${w}`, () => memberCardCanvas(w));
