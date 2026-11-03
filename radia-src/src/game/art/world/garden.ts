/**
 * Art du jardin : 10 fleurs × 4 stades (graine, pousse, bourgeon, fleur),
 * bouquets, et la scène animée des parcelles. Repère de dessin : 100×100
 * (mis à l'échelle de `size`), sol à y = 90, tige à x = 50.
 */
import type { FlowerId } from '../../../data/world/ids';
import { FLOWERS } from '../../../data/world/garden';
import { OUTLINE, PAL, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, makeCanvas, roundRect, seeded, sparkle } from '../kit';

type C = CanvasRenderingContext2D;
export type Stage = 0 | 1 | 2 | 3;
const LW = 3;
/** Éclaircit/assombrit un hex et renvoie un hex (réutilisable comme couleur de base). */
function hx(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}
const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

// ------------------------------------------------------------------ formes de base

function fillOut(c: C, color: string, b: { x: number; y: number; w: number; h: number }, lw = LW, light = 0.3): void {
  fillShaded(c, color, b, lw, { light, dark: 0.1 });
}

/** Pétale : goutte partant de (x,y) vers l'angle `a`, longueur `len`, largeur `wd`. */
function petal(c: C, x: number, y: number, a: number, len: number, wd: number, color: string, lw = LW * 0.8): void {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(len * 0.25, -wd * 0.9, len * 0.85, -wd * 0.75, len, 0);
  c.bezierCurveTo(len * 0.85, wd * 0.75, len * 0.25, wd * 0.9, 0, 0);
  c.closePath();
  fillOut(c, color, box(0, -wd, len, wd * 2), lw, 0.32);
  c.restore();
}

function leaf(c: C, x: number, y: number, a: number, len: number, wd = len * 0.38, color: string = PAL.leaf): void {
  petal(c, x, y, a, len, wd, color, LW * 0.75);
  c.save();
  c.translate(x, y); c.rotate(a);
  c.beginPath(); c.moveTo(len * 0.1, 0); c.lineTo(len * 0.8, 0);
  c.strokeStyle = hx(color, -0.3); c.lineWidth = 1; c.stroke();
  c.restore();
}

function stem(c: C, x0: number, y0: number, x1: number, y1: number, w = 4.5, bend = 0): void {
  const path = () => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1); };
  path(); c.lineWidth = w + LW * 1.5; c.strokeStyle = OUTLINE; c.stroke();
  path(); c.lineWidth = w; c.strokeStyle = PAL.leafDeep; c.stroke();
  path(); c.lineWidth = w * 0.3; c.strokeStyle = 'rgba(255,255,255,0.35)'; c.translate(-w * 0.18, 0); c.stroke(); c.translate(w * 0.18, 0);
}

function soil(c: C, w = 34): void {
  groundShadow(c, 50, 91, w * 0.85, 5, 0.25);
  c.beginPath();
  c.ellipse(50, 90, w / 2, 6.5, 0, 0, Math.PI * 2);
  fillOut(c, '#8A5A44', box(50 - w / 2, 83, w, 14), LW * 0.8, 0.18);
  gloss(c, 42, 87.5, 5, 1.6, 0.35, -0.1);
}

function discCenter(c: C, x: number, y: number, r: number, color: string, dots = false): void {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  fillOut(c, color, box(x - r, y - r, r * 2, r * 2), LW * 0.8, 0.28);
  gloss(c, x - r * 0.35, y - r * 0.4, r * 0.35, r * 0.2, 0.55);
  if (dots) {
    const rnd = seeded(11);
    c.fillStyle = hx(color, -0.35);
    for (let i = 0; i < 18; i++) {
      const a = rnd() * 6.28, d = Math.sqrt(rnd()) * r * 0.8;
      c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.9, 0, 6.28); c.fill();
    }
  }
}

// ------------------------------------------------------------------ stades 0-1

function seed(c: C): void {
  soil(c);
  c.save(); c.translate(50, 82); c.rotate(-0.35);
  c.beginPath(); c.ellipse(0, 0, 5.2, 3.4, 0, 0, Math.PI * 2);
  fillOut(c, '#B98A5C', box(-5, -3.4, 10.4, 6.8), LW * 0.75, 0.35);
  gloss(c, -1.5, -1.2, 2, 0.9, 0.6, 0);
  c.restore();
  sparkle(c, 62, 70, 4, '#FFFFFF', 0.9);
  sparkle(c, 38, 66, 2.4, PAL.or, 0.9);
}

function sprout(c: C): void {
  soil(c);
  stem(c, 50, 87, 50, 66, 3.8, 1.5);
  leaf(c, 50, 70, -2.5, 17, 6.4, PAL.leaf);
  leaf(c, 50, 68, -0.65, 17, 6.4, '#8FD39A');
  sparkle(c, 66, 60, 3, '#FFFFFF', 0.8);
}

// ------------------------------------------------------------------ boutons (stade 2)

function budGeneric(c: C, color: string, kind: 'ball' | 'drop' | 'spike' = 'drop'): void {
  soil(c);
  stem(c, 50, 88, 50, 52, 4.4, 2);
  leaf(c, 50, 78, -2.55, 20, 7, PAL.leaf);
  leaf(c, 50, 70, -0.6, 20, 7, '#8FD39A');
  if (kind === 'spike') {
    for (const [dx, a] of [[-9, -0.2], [0, 0], [9, 0.2]] as const) {
      c.save(); c.translate(50 + dx * 0.6, 56); c.rotate(a);
      c.beginPath(); c.ellipse(0, -10, 3.6, 12, 0, 0, Math.PI * 2);
      fillOut(c, color, box(-4, -22, 8, 24), LW * 0.7, 0.3); c.restore();
    }
    return;
  }
  c.beginPath();
  if (kind === 'ball') c.arc(50, 44, 12, 0, Math.PI * 2);
  else { c.moveTo(50, 28); c.bezierCurveTo(66, 36, 62, 56, 50, 58); c.bezierCurveTo(38, 56, 34, 36, 50, 28); }
  fillOut(c, color, box(36, 28, 28, 30), LW, 0.35);
  gloss(c, 44, 40, 3, 6, 0.55, 0.3);
  // sépales verts
  petal(c, 50, 58, -1.9, 15, 5, PAL.leaf, LW * 0.7);
  petal(c, 50, 58, -1.25, 15, 5, PAL.leaf, LW * 0.7);
}

// ------------------------------------------------------------------ fleurs épanouies (stade 3)

function bloomRose(c: C): void {
  const r = '#E8558F';
  c.beginPath(); c.arc(50, 38, 21, 0, Math.PI * 2);
  fillOut(c, hx(r, -0.1), box(29, 17, 42, 42), LW, 0.2);
  for (let i = 0; i < 5; i++) petal(c, 50, 40, -Math.PI / 2 + (i * 2 * Math.PI) / 5, 21, 11, i % 2 ? r : '#F26AA0', LW * 0.7);
  c.beginPath(); c.arc(50, 38, 12, 0, Math.PI * 2);
  fillOut(c, '#F87FB0', box(38, 26, 24, 24), LW * 0.8, 0.3);
  c.strokeStyle = hx(r, -0.35); c.lineWidth = 1.8;
  c.beginPath(); c.arc(50, 38, 7, 0.4, Math.PI * 1.7); c.stroke();
  c.beginPath(); c.arc(51, 38, 3.2, 1, Math.PI * 2.2); c.stroke();
  gloss(c, 41, 28, 5, 2.2, 0.55);
}

function bloomTulip(c: C): void {
  const col = '#FF8FB1';
  petal(c, 50, 55, -Math.PI / 2 - 0.45, 30, 11, hx(col, -0.05), LW * 0.8);
  petal(c, 50, 55, -Math.PI / 2 + 0.45, 30, 11, hx(col, -0.05), LW * 0.8);
  c.beginPath();
  c.moveTo(34, 38); c.bezierCurveTo(32, 58, 42, 62, 50, 62); c.bezierCurveTo(58, 62, 68, 58, 66, 38);
  c.lineTo(58, 26); c.lineTo(50, 36); c.lineTo(42, 26); c.closePath();
  fillOut(c, col, box(32, 26, 36, 36), LW, 0.32);
  c.beginPath(); c.moveTo(50, 36); c.bezierCurveTo(46, 46, 46, 56, 50, 62); c.strokeStyle = hx(col, -0.25); c.lineWidth = 1.6; c.stroke();
  gloss(c, 40, 44, 3, 8, 0.5, 0.2);
}

function bloomPeony(c: C): void {
  const col = '#F9A8C4';
  const rings: [number, number, number, number][] = [[8, 20, 13, 0], [7, 16, 11, 0.4], [6, 11, 9, 0.2]];
  for (const [n, len, wd, off] of rings) {
    for (let i = 0; i < n; i++) petal(c, 50, 38, off + (i * 2 * Math.PI) / n, len, wd, hx(col, rings[0][0] === n ? -0.05 : n === 7 ? 0.08 : 0.18), LW * 0.65);
  }
  c.beginPath(); c.arc(50, 38, 6, 0, Math.PI * 2);
  fillOut(c, '#FFD66B', box(44, 32, 12, 12), LW * 0.6, 0.3);
  gloss(c, 44, 31, 4, 2, 0.6);
}

function bloomDaisy(c: C): void {
  for (let i = 0; i < 13; i++) petal(c, 50, 38, (i * 2 * Math.PI) / 13, 22, 4.6, i % 2 ? '#FFFFFF' : '#FFF8F2', LW * 0.6);
  discCenter(c, 50, 38, 7.5, '#F7C948');
}

function bloomLavender(c: C): void {
  const cols = ['#B9A5E8', '#A18DDB', '#C7B6F0'];
  const spike = (x: number, top: number, bot: number, a: number) => {
    c.save(); c.translate(x, bot); c.rotate(a);
    stem(c, 0, 0, 0, -(bot - top), 3.2);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const y = -(bot - top) * (0.35 + (i / n) * 0.65);
      const s = 5.4 - i * 0.35;
      for (const dx of [-3.2, 3.2]) {
        c.beginPath(); c.ellipse(dx * (1 - i / (n * 1.6)), y, s * 0.8, s, dx > 0 ? 0.4 : -0.4, 0, Math.PI * 2);
        fillOut(c, cols[(i + (dx > 0 ? 1 : 0)) % 3], box(-6, y - s, 12, s * 2), LW * 0.55, 0.3);
      }
    }
    c.restore();
  };
  spike(36, 24, 88, -0.12); spike(64, 24, 88, 0.12); spike(50, 12, 88, 0);
  leaf(c, 50, 80, -2.5, 18, 5, '#8FB58F'); leaf(c, 50, 78, -0.6, 18, 5, '#8FB58F');
}

function bloomHydrangea(c: C): void {
  const cols = ['#8FB6F0', '#A9C8F7', '#B9A5E8', '#7BA4E8', '#D4B6F0'];
  const rnd = seeded(5);
  const flo: [number, number, number][] = [];
  for (let ring = 0; ring < 3; ring++) {
    const n = ring === 0 ? 1 : ring === 1 ? 6 : 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + ring;
      const d = ring * 11;
      flo.push([50 + Math.cos(a) * d * 1.05, 36 + Math.sin(a) * d * 0.9, 6.5 - ring * 0.4]);
    }
  }
  flo.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of flo) {
    const col = cols[Math.floor(rnd() * cols.length)];
    for (let k = 0; k < 4; k++) petal(c, x, y, (k * Math.PI) / 2 + 0.4, r, r * 0.6, col, LW * 0.45);
    c.beginPath(); c.arc(x, y, 1.3, 0, 6.28); c.fillStyle = '#FFF4B0'; c.fill();
  }
  gloss(c, 38, 24, 6, 2.4, 0.4);
}

function bloomOrchid(c: C): void {
  const col = '#C77DDB';
  const flower = (x: number, y: number, s: number, rot: number) => {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    for (const a of [-2.5, -0.65]) petal(c, 0, 0, a, 15, 8, hx(col, 0.1), LW * 0.7);
    for (const a of [2.35, 0.8]) petal(c, 0, 0, a, 13, 6.5, hx(col, 0.15), LW * 0.7);
    petal(c, 0, 0, -Math.PI / 2, 14, 7.5, col, LW * 0.7);
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-8, 8, -6, 18, 0, 17); c.bezierCurveTo(6, 18, 8, 8, 0, 0);
    fillOut(c, '#FFF0F8', box(-8, 0, 16, 18), LW * 0.7, 0.2);
    c.beginPath(); c.arc(0, 8, 2.2, 0, 6.28); c.fillStyle = '#E8558F'; c.fill();
    c.restore();
  };
  stem(c, 50, 88, 60, 30, 3.6, -14);
  stem(c, 55, 64, 36, 44, 2.6, 4);
  flower(60, 28, 0.72, 0.15);
  flower(38, 44, 0.78, -0.2);
  flower(56, 56, 0.62, 0.35);
}

function bloomLily(c: C): void {
  const col = '#FFF4E8';
  for (const a of [-2.7, -0.45, 2.3, 0.85, -1.9, -1.2]) {
    petal(c, 50, 44, a, 27, 8.5, a < -1 && a > -2 ? hx(col, -0.05) : col, LW * 0.75);
    c.save(); c.translate(50, 44); c.rotate(a);
    c.beginPath(); c.moveTo(4, 0); c.lineTo(20, 0); c.strokeStyle = '#F5A3C0'; c.lineWidth = 2; c.stroke(); c.restore();
  }
  for (const a of [-2.2, -1.57, -0.9]) {
    c.beginPath(); c.moveTo(50, 44); c.lineTo(50 + Math.cos(a) * 17, 44 + Math.sin(a) * 17);
    c.strokeStyle = OUTLINE; c.lineWidth = 1.3; c.stroke();
    c.beginPath(); c.ellipse(50 + Math.cos(a) * 18, 44 + Math.sin(a) * 18, 2.6, 1.5, a, 0, 6.28); c.fillStyle = '#E8A03C'; c.fill();
  }
}

function bloomSunflower(c: C): void {
  for (let i = 0; i < 16; i++) petal(c, 50, 38, (i * 2 * Math.PI) / 16, 25, 6.2, i % 2 ? '#F3C86B' : '#FFD86B', LW * 0.6);
  for (let i = 0; i < 12; i++) petal(c, 50, 38, ((i + 0.5) * 2 * Math.PI) / 12, 19, 5.2, '#FFE08A', LW * 0.5);
  discCenter(c, 50, 38, 11.5, '#7A4B33', true);
}

function bloomMagic(c: C, t = 0): void {
  glow(c, 50, 36, 38, '#9FD8FF', 0.55);
  const col = '#CFEAFF';
  for (let i = 0; i < 8; i++) petal(c, 50, 38, (i * 2 * Math.PI) / 8 - Math.PI / 2, 25, 6.6, i % 2 ? col : '#E6F3FF', LW * 0.7);
  for (let i = 0; i < 8; i++) petal(c, 50, 38, ((i + 0.5) * 2 * Math.PI) / 8 - Math.PI / 2, 15, 5.4, '#B9A5E8', LW * 0.55);
  c.beginPath(); c.arc(50, 38, 8, 0, Math.PI * 2);
  fillOut(c, '#FFF4C2', box(42, 30, 16, 16), LW * 0.7, 0.4);
  c.beginPath(); c.arc(52, 38, 5.6, 0, Math.PI * 2);
  c.fillStyle = '#F3C86B'; c.arc(49, 38, 5.2, 0, Math.PI * 2, true); c.fill('evenodd');
  sparkle(c, 22, 20, 4.4, '#FFFFFF', 0.85 + Math.sin(t * 4) * 0.15);
  sparkle(c, 80, 26, 3.4, '#FFF4C2', 0.9);
  sparkle(c, 74, 58, 2.6, '#FFFFFF', 0.8);
  sparkle(c, 26, 52, 2.8, '#D6C7FF', 0.9);
}

const BLOOM: Record<FlowerId, (c: C, t?: number) => void> = {
  rose: bloomRose, tulip: bloomTulip, peony: bloomPeony, daisy: bloomDaisy, lavender: bloomLavender,
  hydrangea: bloomHydrangea, orchid: bloomOrchid, lily: bloomLily, sunflower: bloomSunflower, magic: bloomMagic,
};

const BUD: Record<FlowerId, [string, 'ball' | 'drop' | 'spike']> = {
  rose: ['#E8558F', 'drop'], tulip: ['#FF8FB1', 'drop'], peony: ['#F9A8C4', 'ball'], daisy: ['#FFFFFF', 'drop'],
  lavender: ['#A18DDB', 'spike'], hydrangea: ['#9DB8E8', 'ball'], orchid: ['#C77DDB', 'drop'],
  lily: ['#FFF0E0', 'drop'], sunflower: ['#9ED08A', 'ball'], magic: ['#CFEAFF', 'drop'],
};

function bloomStem(c: C, id: FlowerId): void {
  soil(c);
  const tall = id === 'sunflower' || id === 'lily' || id === 'lavender';
  if (id !== 'orchid' && id !== 'lavender') stem(c, 50, 89, 50, tall ? 50 : 56, 4.6, 1.5);
  if (id !== 'lavender') {
    leaf(c, 50, 80, -2.6, 22, 7.5, PAL.leaf);
    leaf(c, 50, 72, -0.55, 22, 7.5, '#8FD39A');
  }
}

/**
 * Dessine une fleur au stade voulu (0 graine, 1 pousse, 2 bourgeon, 3 fleur).
 * Le dessin occupe un carré `size`×`size` en partant de (0,0).
 */
export function drawFlower(ctx: C, id: FlowerId, stage: Stage, size: number, t = 0): void {
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (stage === 0) seed(ctx);
  else if (stage === 1) sprout(ctx);
  else if (stage === 2) budGeneric(ctx, BUD[id][0], BUD[id][1]);
  else { bloomStem(ctx, id); BLOOM[id](ctx, t); }
  ctx.restore();
}

/** Silhouette (pour les variétés verrouillées). */
export function drawFlowerSilhouette(ctx: C, id: FlowerId, size: number): void {
  const cv = makeCanvas(size, size);
  const k = cv.getContext('2d')!;
  drawFlower(k, id, 3, size);
  k.globalCompositeOperation = 'source-in';
  k.fillStyle = 'rgba(88,67,63,0.35)';
  k.fillRect(0, 0, size, size);
  ctx.drawImage(cv, 0, 0);
}

// ------------------------------------------------------------------ bouquet

function bloomOnly(c: C, id: FlowerId, x: number, y: number, s: number, rot: number): void {
  c.save();
  c.translate(x, y); c.rotate(rot); c.scale(s / 100, s / 100); c.translate(-50, -38);
  BLOOM[id](c);
  c.restore();
}

/** Bouquet dessiné : papier crème, ruban rose, fleurs en éventail. */
export function drawBouquet(ctx: C, flowerIds: string[], size: number): void {
  const ids = flowerIds.filter((f): f is FlowerId => f in FLOWERS);
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  groundShadow(ctx, 50, 95, 28, 4, 0.25);
  const n = Math.max(1, ids.length);
  // tiges
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * 0.32;
    stem(ctx, 50, 88, 50 + Math.sin(a) * 40, 88 - Math.cos(a) * 52, 3.6, 0);
  }
  // feuilles
  leaf(ctx, 50, 76, -2.4, 22, 7, PAL.leaf); leaf(ctx, 50, 76, -0.75, 22, 7, '#8FD39A');
  // fleurs : du fond vers l'avant (centre en dernier)
  const order = ids.map((id, i) => ({ id, i })).sort((a, b) => Math.abs(b.i - (n - 1) / 2) - Math.abs(a.i - (n - 1) / 2));
  for (const { id, i } of order) {
    const a = (i - (n - 1) / 2) * 0.32;
    const r = 40 + (i % 2) * 4;
    bloomOnly(ctx, id, 50 + Math.sin(a) * r * 1.05, 76 - Math.cos(a) * r * 1.0 + 4, 40, a * 0.6);
  }
  // papier
  ctx.beginPath();
  ctx.moveTo(30, 68); ctx.lineTo(70, 68); ctx.lineTo(56, 98); ctx.lineTo(44, 98); ctx.closePath();
  fillShaded(ctx, '#FFF4E8', box(30, 68, 40, 30), LW, { light: 0.2, dark: 0.12 });
  ctx.beginPath(); ctx.moveTo(40, 70); ctx.lineTo(48, 96); ctx.moveTo(60, 70); ctx.lineTo(52, 96);
  ctx.strokeStyle = 'rgba(88,67,63,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  // ruban & nœud
  ctx.beginPath(); roundRect(ctx, 38, 77, 24, 6, 3);
  fillShaded(ctx, '#F5B5C8', box(38, 77, 24, 6), LW * 0.7, { light: 0.3 });
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(50 + s * 7, 80, 7, 4.4, s * 0.45, 0, Math.PI * 2);
    fillShaded(ctx, '#FF75A8', box(42, 75, 16, 10), LW * 0.7, { light: 0.3 });
  }
  ctx.beginPath(); ctx.arc(50, 80, 3, 0, 6.28); fillShaded(ctx, '#E8558F', box(47, 77, 6, 6), LW * 0.6);
  ctx.restore();
}

// ------------------------------------------------------------------ scène du jardin

export interface ScenePlot { flower: FlowerId | null; stage: Stage; progress: number; /** secondes depuis un événement (plantation/récolte), pour le rebond */ pop?: number }
export interface Rect { x: number; y: number; w: number; h: number }

/** Hauteur (px) de la haie et de l'arche en haut de la scène. */
export const SCENE_TOP = 112;
/** Hauteur de scène souhaitée pour `count` parcelles dans une largeur `w`. */
export function sceneHeightFor(count: number, w: number): number {
  const rows = Math.ceil(count / 3);
  const gapX = Math.max(6, w * 0.03);
  const cw = (w - 28 - gapX * 2) / 3;
  return Math.ceil(SCENE_TOP + rows * cw * 1.15 + (rows - 1) * 8 + 24);
}

/** Disposition des parcelles : 3 colonnes (pour 4–12 parcelles). Partagée avec l'interface pour les touchers. */
export function plotLayout(count: number, w: number, h: number): Rect[] {
  const cols = 3;
  const rows = Math.ceil(count / cols);
  const top = SCENE_TOP;
  const gapX = Math.max(6, w * 0.03);
  const gapY = Math.max(6, h * 0.018);
  const cw = (w - 28 - gapX * (cols - 1)) / cols;
  const availH = h - top - 16 - gapY * (rows - 1);
  const ch = Math.min(cw * 1.45, availH / rows);
  const totalH = rows * ch + (rows - 1) * gapY;
  const y0 = top + Math.min(14, Math.max(0, (availH + gapY * (rows - 1) - totalH) / 2));
  return Array.from({ length: count }, (_, i) => ({
    x: 14 + (i % cols) * (cw + gapX),
    y: y0 + Math.floor(i / cols) * (ch + gapY),
    w: cw,
    h: ch,
  }));
}

const flowerCache = new Map<string, HTMLCanvasElement>();
function flowerSprite(id: FlowerId, stage: Stage, px: number): HTMLCanvasElement {
  const key = `${id}:${stage}:${px}`;
  let cv = flowerCache.get(key);
  if (!cv) {
    cv = makeCanvas(px, px);
    const k = cv.getContext('2d')!;
    drawFlower(k, id, stage, px);
    flowerCache.set(key, cv);
  }
  return cv;
}

const bgCache = new Map<string, HTMLCanvasElement>();
function background(w: number, h: number, dpr: number): HTMLCanvasElement {
  const key = `${w}x${h}@${dpr}`;
  let cv = bgCache.get(key);
  if (cv) return cv;
  bgCache.clear();
  cv = makeCanvas(w * dpr, h * dpr);
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr);
  c.lineJoin = 'round';
  const sky = c.createLinearGradient(0, 0, 0, 110);
  sky.addColorStop(0, '#FFD9E6'); sky.addColorStop(0.6, '#FFE9D6'); sky.addColorStop(1, '#FFF4E8');
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  glow(c, w * 0.8, h * 0.06, w * 0.4, '#FFF1B8', 0.7);
  // haie du fond + arche de roses
  const hy = 66;
  c.beginPath();
  c.moveTo(0, hy);
  for (let x = 0; x <= w; x += 18) c.quadraticCurveTo(x + 9, hy - 14, x + 18, hy);
  c.lineTo(w, hy + 28); c.lineTo(0, hy + 28); c.closePath();
  fillShaded(c, '#8FD39A', box(0, hy - 12, w, 40), 2.4, { light: 0.2, dark: 0.18 });
  const rnd = seeded(21);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w, y = hy - 2 + rnd() * 24;
    c.beginPath(); c.arc(x, y, 3.4, 0, 6.28); c.fillStyle = i % 3 ? '#FFB3CC' : '#FFFFFF'; c.fill();
  }
  c.beginPath(); c.moveTo(w / 2 - 36, hy + 26); c.lineTo(w / 2 - 36, hy - 24);
  c.quadraticCurveTo(w / 2, hy - 56, w / 2 + 36, hy - 24); c.lineTo(w / 2 + 36, hy + 26);
  c.lineWidth = 9; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#FFF4E8'; c.stroke();
  for (let i = 0; i < 9; i++) {
    const a = i / 8;
    const x = w / 2 - 36 + a * 72, y = hy - 24 - Math.sin(a * Math.PI) * 24 + (a < 0.2 || a > 0.8 ? 18 : 0);
    c.beginPath(); c.arc(x, y, 5, 0, 6.28); fillShaded(c, i % 2 ? '#FF75A8' : '#F5B5C8', box(x - 5, y - 5, 10, 10), 1.6);
  }
  // pelouse
  const gy = hy + 20;
  const lawn = c.createLinearGradient(0, gy, 0, h);
  lawn.addColorStop(0, '#BFE3A6'); lawn.addColorStop(1, '#8FCB8E');
  c.fillStyle = lawn; c.fillRect(0, gy, w, h - gy);
  // allées
  c.fillStyle = '#F3E2C7';
  c.beginPath(); roundRect(c, 6, gy + 6, w - 12, h - gy - 10, 22); c.fill();
  c.lineWidth = 2.4; c.strokeStyle = OUTLINE; c.globalAlpha = 0.5; c.stroke(); c.globalAlpha = 1;
  const rnd2 = seeded(3);
  c.fillStyle = 'rgba(160,130,100,0.28)';
  for (let i = 0; i < 160; i++) { c.beginPath(); c.arc(8 + rnd2() * (w - 16), gy + 10 + rnd2() * (h - gy - 18), 1 + rnd2() * 1.3, 0, 6.28); c.fill(); }
  bgCache.set(key, cv);
  return cv;
}

function drawPlotBed(c: C, r: Rect, empty: boolean, hover = false): void {
  c.beginPath(); roundRect(c, r.x, r.y + r.h * 0.18, r.w, r.h * 0.82, 16);
  fillShaded(c, empty ? '#9A6A52' : '#8A5A44', box(r.x, r.y, r.w, r.h), 2.4, { light: 0.16, dark: 0.22 });
  c.save();
  c.beginPath(); roundRect(c, r.x + 5, r.y + r.h * 0.18 + 5, r.w - 10, r.h * 0.82 - 10, 12); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 4; i++) c.fillRect(r.x, r.y + r.h * 0.3 + i * r.h * 0.17, r.w, 3);
  c.restore();
  if (hover) { c.beginPath(); roundRect(c, r.x, r.y + r.h * 0.18, r.w, r.h * 0.82, 16); c.lineWidth = 3; c.strokeStyle = '#FFFFFF'; c.stroke(); }
}

/** Scène animée du jardin : parcelles, fleurs qui se balancent, pétales, papillon. */
export function drawGardenScene(ctx: C, w: number, h: number, plots: (ScenePlot | null)[], t: number, dpr = 1): void {
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(background(w, h, dpr), 0, 0, w, h);
  const rects = plotLayout(plots.length, w, h);
  plots.forEach((p, i) => {
    const r = rects[i];
    drawPlotBed(ctx, r, !p || !p.flower);
    if (!p || !p.flower) {
      // petit « + » doux qui pulse
      const pulse = 0.85 + 0.15 * Math.sin(t * 2.4 + i);
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h * 0.6);
      ctx.scale(pulse, pulse);
      ctx.beginPath(); ctx.arc(0, 0, Math.min(r.w, r.h) * 0.16, 0, 6.28);
      ctx.fillStyle = 'rgba(255,244,232,0.85)'; ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.strokeStyle = '#E8558F'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      return;
    }
    const px = Math.ceil(Math.min(r.w * 1.25, r.h * 1.15) * dpr / 8) * 8;
    const sprite = flowerSprite(p.flower, p.stage, px);
    const sz = px / dpr;
    // croissance continue : léger agrandissement à l'intérieur du stade
    const within = p.stage === 3 ? 1 : (p.progress * 3) % 1;
    let sc = 0.88 + 0.12 * within;
    if (p.pop !== undefined && p.pop >= 0 && p.pop < 0.7) sc *= 1 + Math.sin((p.pop / 0.7) * Math.PI) * 0.28;
    const sway = Math.sin(t * 1.6 + i * 1.3) * (p.stage >= 2 ? 0.05 : 0.025);
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h * 0.18 + r.h * 0.82 * 0.82);
    ctx.rotate(sway);
    ctx.scale(sc, sc);
    ctx.drawImage(sprite, -sz / 2, -sz * 0.9, sz, sz);
    ctx.restore();
    if (p.stage === 3) {
      const a = (Math.sin(t * 3 + i) + 1) / 2;
      sparkle(ctx, r.x + r.w * 0.76, r.y + r.h * 0.3 + Math.sin(t * 2 + i) * 3, 5 + a * 3, '#FFFFFF', 0.5 + a * 0.5);
      sparkle(ctx, r.x + r.w * 0.24, r.y + r.h * 0.42, 3 + (1 - a) * 3, '#F3C86B', 0.4 + (1 - a) * 0.6);
    } else {
      // barre de progression douce
      const bw = r.w * 0.56, bx = r.x + (r.w - bw) / 2, by = r.y + r.h - 12;
      ctx.beginPath(); roundRect(ctx, bx, by, bw, 6, 3); ctx.fillStyle = 'rgba(40,20,30,0.35)'; ctx.fill();
      ctx.beginPath(); roundRect(ctx, bx, by, Math.max(6, bw * p.progress), 6, 3); ctx.fillStyle = '#FF9EC1'; ctx.fill();
    }
  });
  // pétales qui tombent
  const rnd = seeded(77);
  for (let i = 0; i < 9; i++) {
    const sp = 0.05 + rnd() * 0.05;
    const x0 = rnd() * w;
    const ph = rnd() * 10;
    const y = ((t * sp * h + ph * 40) % (h + 20)) - 10;
    const x = x0 + Math.sin(t * 0.9 + ph) * 18;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.8 + ph);
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.2, 0, 0, 6.28); ctx.fillStyle = i % 2 ? 'rgba(255,179,204,0.85)' : 'rgba(255,255,255,0.8)'; ctx.fill();
    ctx.restore();
  }
  // papillon
  const bx = w * (0.5 + 0.38 * Math.sin(t * 0.35)), by = h * (0.3 + 0.12 * Math.sin(t * 0.8 + 1));
  const fl = Math.abs(Math.sin(t * 9));
  ctx.save(); ctx.translate(bx, by);
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(s * 5 * fl, -2, 6 * fl + 1, 4.5, s * 0.5, 0, 6.28);
    ctx.fillStyle = '#B9A5E8'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.fillStyle = OUTLINE; ctx.fillRect(-0.8, -4, 1.6, 9);
  ctx.restore();
}

/** Cœur de pétale pour les effets. */
export function drawPetalHeart(ctx: C, size: number, color = '#FF75A8'): void {
  heartPath(ctx, size / 2, size / 2, size * 0.8);
  fillShaded(ctx, color, box(0, 0, size, size), size * 0.06, {});
  ellipse(ctx, size * 0.34, size * 0.34, size * 0.1, size * 0.06, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
}
