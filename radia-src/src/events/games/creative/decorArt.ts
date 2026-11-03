/** Art du mini-jeu « décor de table » : 14 objets et 5 scènes (Canvas 2D). */
import { drawFlower } from '../../../game/art/world/garden';
import { PAL, canvasUrl, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, paint, roundRect, seeded, sparkle, starPath, texScale } from '../../../game/art/kit';
import type { DecorId, DecorMode } from './decorLogic';
import { hexShade } from './creativeArt';

type C = CanvasRenderingContext2D;
const INK = PAL.choco;
const bx = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
const rr = (c: C, x: number, y: number, w: number, h: number, r: number, col: string, lw = 2.4, light = 0.3): void => { roundRect(c, x, y, w, h, r); fillShaded(c, col, bx(x, y, w, h), lw, { light }); };
const el = (c: C, x: number, y: number, rx: number, ry: number, col: string, lw = 2.2): void => { ellipse(c, x, y, rx, ry); fillShaded(c, col, bx(x - rx, y - ry, rx * 2, ry * 2), lw, { light: 0.3 }); };
const flame = (c: C, x: number, y: number, s: number): void => {
  glow(c, x, y, s * 3.2, '#FFD27A', 0.55);
  c.beginPath(); c.moveTo(x, y - s * 1.7); c.quadraticCurveTo(x + s, y - s * 0.3, x, y + s * 0.5); c.quadraticCurveTo(x - s, y - s * 0.3, x, y - s * 1.7);
  fillShaded(c, '#FFB347', bx(x - s, y - s * 1.7, s * 2, s * 2.2), 1.6, { light: 0.4 });
  c.beginPath(); c.arc(x, y - s * 0.2, s * 0.35, 0, 6.28); c.fillStyle = '#FFF3C4'; c.fill();
};

type Fn = (c: C, w: number, h: number) => void;
/** Les objets « carrés » sont dessinés dans un repère 100×100 mis à l'échelle. */
const sq = (fn: (c: C) => void): Fn => (c, w, h) => { c.save(); c.scale(w / 100, h / 100); c.lineJoin = 'round'; c.lineCap = 'round'; fn(c); c.restore(); };

const OBJ: Record<DecorId, Fn> = {
  candles: sq((c) => {
    groundShadow(c, 50, 92, 38, 5, 0.25);
    for (const [x, hh, col] of [[28, 44, '#FFF4E8'], [50, 58, '#F5B5C8'], [72, 36, '#FFF4E8']] as const) {
      rr(c, x - 9, 90 - hh, 18, hh, 5, col, 2.2); flame(c, x, 90 - hh - 7, 5);
    }
  }),
  vase: sq((c) => {
    groundShadow(c, 50, 93, 28, 5, 0.25);
    c.save(); c.translate(14, -14); drawFlower(c, 'rose', 3, 72); c.restore();
    c.save(); c.translate(-16, -2); drawFlower(c, 'tulip', 3, 66); c.restore();
    c.save(); c.translate(38, -6); drawFlower(c, 'daisy', 3, 62); c.restore();
    c.beginPath(); c.moveTo(34, 50); c.quadraticCurveTo(26, 78, 34, 90); c.lineTo(66, 90); c.quadraticCurveTo(74, 78, 66, 50); c.closePath();
    c.save(); c.globalAlpha = 0.9; fillShaded(c, '#CFE9F7', bx(26, 50, 48, 40), 2.4, { light: 0.4 }); c.restore();
    gloss(c, 38, 66, 3, 10, 0.7, 0.1);
  }),
  plates: sq((c) => {
    groundShadow(c, 50, 88, 38, 6, 0.25);
    el(c, 50, 70, 40, 15, '#FFFDF6'); el(c, 50, 68, 27, 9, '#FFF1DE', 1.6);
    el(c, 50, 52, 33, 12, '#FFFDF6'); el(c, 50, 50, 21, 7, '#FFF1DE', 1.4);
    c.beginPath(); c.ellipse(50, 50, 33, 12, 0, 0.2, 2.9); c.strokeStyle = PAL.or; c.lineWidth = 2.4; c.stroke();
    heartPath(c, 50, 49, 12); fillShaded(c, PAL.roseVif, bx(44, 43, 12, 12), 1.4);
  }),
  lantern: sq((c) => {
    c.beginPath(); c.moveTo(50, 0); c.lineTo(50, 14); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(50, 14, 4, 0, 6.28); c.strokeStyle = INK; c.lineWidth = 2.2; c.stroke();
    glow(c, 50, 58, 40, '#FFD27A', 0.5);
    rr(c, 32, 18, 36, 10, 5, PAL.orDeep, 2.2); rr(c, 32, 84, 36, 8, 4, PAL.orDeep, 2.2);
    rr(c, 34, 28, 32, 56, 8, '#FFE7A8', 2.4, 0.4);
    c.beginPath(); c.moveTo(50, 28); c.lineTo(50, 84); c.moveTo(34, 56); c.lineTo(66, 56); c.strokeStyle = 'rgba(88,67,63,.5)'; c.lineWidth = 1.6; c.stroke();
    flame(c, 50, 64, 6);
  }),
  garland: (c, w, h) => {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    const cols = ['#FF75A8', '#F3C86B', '#B9A5E8', '#8FD19E', '#A9D4F5', '#F5B5C8'];
    const y = (t: number) => h * 0.12 + Math.sin(t * Math.PI) * h * 0.28;
    c.beginPath(); for (let i = 0; i <= 20; i++) { const t = i / 20; if (i) c.lineTo(w * (0.03 + t * 0.94), y(t)); else c.moveTo(w * 0.03, y(t)); }
    c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.7) / 6.4, x = w * (0.03 + t * 0.94), yy = y(t), fw = w * 0.07;
      c.beginPath(); c.moveTo(x - fw, yy); c.lineTo(x + fw, yy); c.lineTo(x, yy + h * 0.5); c.closePath(); fillShaded(c, cols[i], bx(x - fw, yy, fw * 2, h * 0.5), 1.8, { light: 0.35 });
    }
    c.restore();
  },
  cushion: sq((c) => {
    groundShadow(c, 50, 88, 40, 6, 0.25);
    c.save(); c.translate(50, 56); c.rotate(-0.08);
    c.beginPath(); c.moveTo(-36, -26); c.quadraticCurveTo(0, -36, 36, -26); c.quadraticCurveTo(42, 0, 36, 26); c.quadraticCurveTo(0, 36, -36, 26); c.quadraticCurveTo(-42, 0, -36, -26); c.closePath();
    fillShaded(c, '#F5B5C8', bx(-40, -34, 80, 68), 2.6, { light: 0.35 });
    heartPath(c, 0, 0, 26); fillShaded(c, '#FFF4E8', bx(-13, -13, 26, 26), 1.8);
    c.beginPath(); c.arc(0, -3, 2.6, 0, 6.28); c.fillStyle = PAL.or; c.fill();
    c.restore();
  }),
  plaid: sq((c) => {
    groundShadow(c, 50, 90, 42, 6, 0.25);
    c.save(); c.translate(50, 58); c.rotate(0.05);
    rr(c, -42, -28, 84, 56, 8, '#B9A5E8', 2.6);
    c.save(); roundRect(c, -42, -28, 84, 56, 8); c.clip();
    c.fillStyle = 'rgba(255,255,255,.4)'; for (let i = -3; i <= 3; i++) { c.fillRect(i * 13 - 3, -30, 6, 60); c.fillRect(-44, i * 11 - 3, 88, 6); }
    c.restore();
    c.beginPath(); c.moveTo(-42, 10); c.lineTo(42, 10); c.strokeStyle = 'rgba(88,67,63,.3)'; c.lineWidth = 1.6; c.stroke();
    c.restore();
  }),
  snacks: sq((c) => {
    groundShadow(c, 50, 92, 36, 5, 0.25);
    rr(c, 44, 66, 12, 22, 4, '#F3C86B', 2.2); el(c, 50, 90, 24, 5, '#F3C86B');
    el(c, 50, 64, 40, 11, '#FFFDF6');
    for (const [x, col] of [[28, '#FF75A8'], [50, '#B9A5E8'], [72, '#FFC0A3']] as const) {
      el(c, x, 56, 12, 9, col, 2); el(c, x, 50, 11, 7, hexShade(col, 0.25), 1.6); c.beginPath(); c.moveTo(x - 11, 53); c.lineTo(x + 11, 53); c.strokeStyle = '#FFF4E8'; c.lineWidth = 3; c.stroke();
    }
    c.beginPath(); c.moveTo(40, 40); c.arc(50, 38, 9, Math.PI, 0); c.closePath(); fillShaded(c, '#FFF4E8', bx(40, 28, 20, 12), 1.8);
    c.beginPath(); c.arc(50, 29, 4, 0, 6.28); fillShaded(c, PAL.red, bx(46, 25, 8, 8), 1.4);
  }),
  drinks: sq((c) => {
    groundShadow(c, 50, 92, 34, 5, 0.25);
    for (const x of [32, 68]) {
      c.beginPath(); c.moveTo(x - 12, 26); c.lineTo(x + 12, 26); c.quadraticCurveTo(x + 12, 56, x + 2, 60); c.lineTo(x + 2, 82); c.lineTo(x + 9, 86); c.lineTo(x - 9, 86); c.lineTo(x - 2, 82); c.lineTo(x - 2, 60); c.quadraticCurveTo(x - 12, 56, x - 12, 26); c.closePath();
      c.save(); c.globalAlpha = 0.92; fillShaded(c, '#EAF6FF', bx(x - 12, 26, 24, 60), 2.2, { light: 0.4 }); c.restore();
      c.beginPath(); c.moveTo(x - 10.5, 38); c.lineTo(x + 10.5, 38); c.quadraticCurveTo(x + 10.5, 54, x + 1.5, 58); c.lineTo(x - 1.5, 58); c.quadraticCurveTo(x - 10.5, 54, x - 10.5, 38); c.fillStyle = '#FF9DBF'; c.fill();
      gloss(c, x - 6, 36, 2, 7, 0.8, 0.1);
    }
    c.beginPath(); c.arc(68, 36, 4, 0, 6.28); fillShaded(c, PAL.red, bx(64, 32, 8, 8), 1.2);
  }),
  tablecloth: (c, w, h) => {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.04, h * 0.05); c.lineTo(w * 0.96, h * 0.05); c.lineTo(w * 0.99, h * 0.4);
    const n = 8; for (let i = n; i >= 0; i--) { const x = w * (0.99 - (0.98 * (n - i)) / n); c.quadraticCurveTo(x + (w * 0.98) / n / 2, h * 0.93, x - (w * 0.98) / n, h * 0.4 + 0 * i); }
    c.closePath();
    fillShaded(c, '#FFFDF6', bx(0, 0, w, h), Math.max(1.2, w * 0.008), { light: 0.05, dark: 0.12 });
    c.save(); c.clip();
    c.strokeStyle = 'rgba(232,85,143,.45)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, h * 0.4); c.lineTo(w, h * 0.4); c.stroke();
    c.fillStyle = 'rgba(232,85,143,.35)'; for (let i = 0; i < 12; i++) { heartPath(c, w * (0.06 + i * 0.079), h * 0.62, 8); c.fill(); }
    c.restore(); c.restore();
  },
  lights: (c, w, h) => {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    const y = (t: number) => h * 0.12 + Math.sin(t * Math.PI) * h * 0.3;
    c.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24; if (i) c.lineTo(w * (0.03 + t * 0.94), y(t)); else c.moveTo(w * 0.03, y(t)); }
    c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    const cols = ['#FFD27A', '#FF9DBF', '#BFE0FF', '#CDBDF0'];
    for (let i = 0; i < 8; i++) { const t = (i + 0.5) / 8, x = w * (0.03 + t * 0.94), yy = y(t) + 2; glow(c, x, yy + 8, 15, cols[i % 4], 0.6); c.beginPath(); c.ellipse(x, yy + 8, 5, 7, 0, 0, 6.28); fillShaded(c, cols[i % 4], bx(x - 5, yy + 2, 10, 14), 1.6, { light: 0.5 }); }
    c.restore();
  },
  candelabra: sq((c) => {
    groundShadow(c, 50, 93, 30, 5, 0.25);
    el(c, 50, 88, 22, 6, PAL.or); rr(c, 46, 50, 8, 38, 3, PAL.or, 2);
    c.beginPath(); c.moveTo(24, 38); c.quadraticCurveTo(26, 56, 50, 56); c.quadraticCurveTo(74, 56, 76, 38); c.strokeStyle = INK; c.lineWidth = 6.4; c.stroke(); c.strokeStyle = PAL.or; c.lineWidth = 3.4; c.stroke();
    for (const x of [24, 50, 76]) { rr(c, x - 5, 24 + (x === 50 ? -4 : 0), 10, 18, 3, '#FFF4E8', 1.8); flame(c, x, 17 + (x === 50 ? -4 : 0), 4.2); }
  }),
  cake: sq((c) => {
    groundShadow(c, 50, 92, 38, 6, 0.25);
    el(c, 50, 86, 40, 8, '#FFFDF6');
    rr(c, 22, 56, 56, 30, 8, '#F5B5C8', 2.4); rr(c, 30, 32, 40, 28, 8, '#FFF4E8', 2.4);
    c.beginPath(); c.moveTo(22, 62); for (let i = 0; i < 6; i++) c.quadraticCurveTo(22 + i * 9.33 + 4.6, 72, 22 + (i + 1) * 9.33, 62); c.fillStyle = '#FFFDF6'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
    for (const x of [34, 50, 66]) { c.beginPath(); c.arc(x, 31, 5, 0, 6.28); fillShaded(c, PAL.red, bx(x - 5, 26, 10, 10), 1.5); }
    rr(c, 47, 14, 6, 14, 2, '#B9A5E8', 1.6); flame(c, 50, 9, 3.4);
  }),
  teddy: sq((c) => {
    groundShadow(c, 50, 92, 32, 5, 0.25);
    const B = '#D9A877';
    el(c, 36, 38, 9, 9, B); el(c, 64, 38, 9, 9, B); el(c, 36, 38, 4, 4, '#F5C9A6', 1); el(c, 64, 38, 4, 4, '#F5C9A6', 1);
    el(c, 50, 74, 22, 19, B); el(c, 50, 76, 12, 12, '#F5C9A6', 1.6);
    el(c, 30, 88, 10, 7, B); el(c, 70, 88, 10, 7, B); el(c, 28, 70, 7, 12, B); el(c, 72, 70, 7, 12, B);
    el(c, 50, 46, 22, 20, B); el(c, 50, 53, 11, 8, '#F5C9A6', 1.6);
    c.beginPath(); c.arc(50, 51, 2.6, 0, 6.28); c.fillStyle = INK; c.fill();
    for (const x of [43, 57]) { c.beginPath(); c.arc(x, 43, 2.4, 0, 6.28); c.fillStyle = INK; c.fill(); }
    c.beginPath(); c.arc(50, 56, 3, 0.2, 2.9); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
    heartPath(c, 50, 66, 9); fillShaded(c, PAL.roseVif, bx(45, 62, 10, 9), 1.2);
  }),
};

/** Taille d'affichage (px) de chaque objet selon son type. */
export const DECOR_BOX: Record<DecorId, [number, number]> = {
  candles: [64, 64], vase: [70, 78], plates: [62, 62], lantern: [50, 74], garland: [120, 52], cushion: [66, 66], plaid: [74, 62], snacks: [64, 64], drinks: [62, 62],
  tablecloth: [330, 96], lights: [120, 56], candelabra: [68, 68], cake: [64, 68], teddy: [66, 70],
};

export function decorUrl(id: DecorId, w?: number, h?: number): string {
  const [dw, dh] = DECOR_BOX[id];
  const W = w ?? dw, H = h ?? dh;
  return canvasUrl(`cr:decor:${id}:${W}x${H}:${texScale()}`, () => paint(W, H, texScale(), (c) => OBJ[id](c, W, H)));
}

// ------------------------------------------------------------------ scènes

function table(c: C, w: number, h: number, top: string, leg: string): void {
  const y0 = h * 0.45, y1 = h * 0.56;
  for (const x of [0.3, 0.7]) { c.beginPath(); roundRect(c, w * x - 5, y1, 10, h * 0.34, 3); fillShaded(c, leg, bx(w * x - 5, y1, 10, h * 0.34), 2, { light: 0.2 }); }
  c.beginPath(); c.moveTo(w * 0.1, y1); c.lineTo(w * 0.17, y0); c.lineTo(w * 0.83, y0); c.lineTo(w * 0.9, y1); c.closePath();
  fillShaded(c, top, bx(w * 0.1, y0, w * 0.8, y1 - y0), 2.6, { light: 0.28 });
  c.beginPath(); roundRect(c, w * 0.1, y1, w * 0.8, h * 0.035, 4); fillShaded(c, hexShade(top, -0.15), bx(w * 0.1, y1, w * 0.8, h * 0.035), 2.2, { light: 0.05 });
}
const sky = (c: C, w: number, h: number, a: string, b: string): void => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, w, h); };

export function drawDecorScene(c: C, mode: DecorMode, w: number, h: number): void {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const r = seeded(7);
  const floorY = h * 0.72;
  if (mode === 'garden') {
    sky(c, w, h, '#BDE4F7', '#E6F6E0');
    glow(c, w * 0.82, h * 0.1, 60, '#FFF3B0', 0.8);
    for (let i = 0; i < 6; i++) { const x = w * (0.04 + i * 0.19); c.beginPath(); c.arc(x, h * 0.46, w * 0.12, 0, 6.28); fillShaded(c, i % 2 ? '#8FD19E' : '#7FC48A', bx(x - w * 0.12, h * 0.34, w * 0.24, w * 0.24), 2.4); }
    c.fillStyle = '#9BD58D'; c.fillRect(0, floorY - h * 0.1, w, h);
    for (const x of [0.06, 0.94]) { c.beginPath(); roundRect(c, w * x - 7, h * 0.05, 14, floorY - h * 0.1, 4); fillShaded(c, '#FFF4E8', bx(w * x - 7, h * 0.05, 14, floorY), 2.2); }
    c.beginPath(); roundRect(c, w * 0.04, h * 0.04, w * 0.92, 12, 5); fillShaded(c, '#FFF4E8', bx(w * 0.04, h * 0.04, w * 0.92, 12), 2.2);
    for (let i = 0; i < 18; i++) { const x = r() * w, y = floorY + r() * (h - floorY) * 0.9; c.beginPath(); c.arc(x, y, 3, 0, 6.28); c.fillStyle = ['#FF8FB1', '#FFF4E8', '#F3C86B'][i % 3]; c.fill(); }
    table(c, w, h, '#E6BE8A', '#B58A5C');
  } else if (mode === 'rooftop') {
    sky(c, w, h, '#2B2250', '#7A5BAE');
    for (let i = 0; i < 34; i++) sparkle(c, r() * w, r() * h * 0.5, 1.5 + r() * 2.4, '#FFFFFF', 0.4 + r() * 0.6);
    c.beginPath(); c.arc(w * 0.82, h * 0.13, 26, 0, 6.28); fillShaded(c, '#FFF4C8', bx(w * 0.82 - 26, h * 0.13 - 26, 52, 52), 2, { light: 0.2 });
    for (let i = 0; i < 9; i++) { const bw = w * 0.13, x = i * bw * 0.95, bh = h * (0.12 + r() * 0.2); c.beginPath(); c.rect(x, floorY - bh, bw, bh); c.fillStyle = i % 2 ? '#3E3370' : '#4A3C80'; c.fill(); c.fillStyle = '#FFD27A'; for (let k = 0; k < 4; k++) if (r() > 0.4) c.fillRect(x + 6 + (k % 2) * 16, floorY - bh + 8 + Math.floor(k / 2) * 16, 7, 8); }
    c.fillStyle = '#5B4F7A'; c.fillRect(0, floorY, w, h);
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(w * (i / 8), floorY); c.lineTo(w * (i / 8 - 0.5) * 1.6 + w * 0.5, h); c.stroke(); }
    c.strokeStyle = '#E9E2F5'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, floorY - 10); c.lineTo(w, floorY - 10); c.stroke();
    table(c, w, h, '#D9C7A8', '#8C7A66');
  } else if (mode === 'pajama') {
    sky(c, w, h, '#E5D7FA', '#F9DCEB');
    for (let i = 0; i < 16; i++) { starPath(c, r() * w, r() * floorY, 6, 2.6); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill(); }
    c.beginPath(); roundRect(c, w * 0.34, h * 0.06, w * 0.32, h * 0.28, 16); fillShaded(c, '#2B2250', bx(w * 0.34, h * 0.06, w * 0.32, h * 0.28), 2.6, { light: 0.05 });
    c.beginPath(); c.arc(w * 0.5, h * 0.18, 20, 0.4, 5.9); c.fillStyle = '#FFF4C8'; c.fill();
    sparkle(c, w * 0.42, h * 0.12, 5, '#fff'); sparkle(c, w * 0.58, h * 0.26, 4, '#fff');
    c.fillStyle = '#E8C9A3'; c.fillRect(0, floorY, w, h);
    c.strokeStyle = 'rgba(88,67,63,.14)'; c.lineWidth = 1.5; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(0, floorY + i * (h - floorY) / 6); c.lineTo(w, floorY + i * (h - floorY) / 6); c.stroke(); }
    ellipse(c, w * 0.5, h * 0.86, w * 0.4, h * 0.08); c.fillStyle = 'rgba(245,181,200,.75)'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    table(c, w, h, '#F1D3C0', '#C99C84');
  } else if (mode === 'hotel') {
    sky(c, w, h, '#FFF4E8', '#F3E2CE');
    c.fillStyle = '#EAD3B4'; c.fillRect(0, h * 0.5, w, floorY - h * 0.5 + 2); c.fillStyle = 'rgba(88,67,63,.15)'; c.fillRect(0, h * 0.5, w, 3);
    for (const x of [0.04, 0.86]) { c.beginPath(); roundRect(c, w * x, h * 0.04, w * 0.1, floorY * 0.88, 8); fillShaded(c, '#E8558F', bx(w * x, 0, w * 0.1, h), 2.4, { light: 0.25 }); }
    c.beginPath(); roundRect(c, w * 0.3, h * 0.06, w * 0.4, h * 0.26, 10); fillShaded(c, '#CDE9F9', bx(w * 0.3, h * 0.06, w * 0.4, h * 0.26), 3, { light: 0.4 });
    c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); c.moveTo(w * 0.5, h * 0.06); c.lineTo(w * 0.5, h * 0.32); c.moveTo(w * 0.3, h * 0.19); c.lineTo(w * 0.7, h * 0.19); c.stroke();
    c.fillStyle = '#C79A6B'; c.fillRect(0, floorY, w, h);
    c.strokeStyle = 'rgba(88,67,63,.2)'; c.lineWidth = 1.5; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(w * (i / 8), floorY); c.lineTo(w * (i / 8), h); c.stroke(); }
    table(c, w, h, '#FFFDF6', '#8B6A4F');
  } else {
    sky(c, w, h, '#FBE9C9', '#F5D9A7');
    for (const x of [0.09, 0.91]) { c.beginPath(); roundRect(c, w * x - 15, h * 0.02, 30, floorY - h * 0.02, 5); fillShaded(c, '#FFF1DE', bx(w * x - 15, 0, 30, floorY), 2.4, { light: 0.2 }); c.beginPath(); roundRect(c, w * x - 20, h * 0.02, 40, 14, 4); fillShaded(c, PAL.or, bx(w * x - 20, 0, 40, 14), 2.2); }
    for (const x of [0.3, 0.7]) { c.beginPath(); c.moveTo(w * x - 26, floorY - h * 0.2); c.lineTo(w * x - 26, h * 0.2); c.arc(w * x, h * 0.2, 26, Math.PI, 0); c.lineTo(w * x + 26, floorY - h * 0.2); c.closePath(); fillShaded(c, '#CDE9F9', bx(w * x - 26, h * 0.1, 52, h * 0.4), 2.6, { light: 0.4 }); }
    glow(c, w * 0.5, h * 0.08, 70, '#FFF3B0', 0.7);
    c.beginPath(); c.moveTo(w * 0.5, 0); c.lineTo(w * 0.5, h * 0.05); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(w * 0.5 + i * 11, h * 0.075 + Math.abs(i) * 4, 4, 0, 6.28); fillShaded(c, '#FFF3B0', bx(0, 0, 8, 8), 1.4); }
    c.fillStyle = '#EFE6DA'; c.fillRect(0, floorY, w, h);
    c.fillStyle = '#C93B52'; c.beginPath(); c.moveTo(w * 0.34, floorY); c.lineTo(w * 0.66, floorY); c.lineTo(w * 0.8, h); c.lineTo(w * 0.2, h); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    table(c, w, h, '#FFF1DE', PAL.orDeep);
  }
  c.restore();
}
export function sceneUrl(mode: DecorMode, w: number, h: number): string {
  return canvasUrl(`cr:scene:${mode}:${w}x${h}:${texScale()}`, () => paint(w, h, texScale(), (c) => drawDecorScene(c, mode, w, h)));
}
