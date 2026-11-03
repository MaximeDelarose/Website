/**
 * Le chat de Radia : crème et orange, dessiné en vectoriel (Canvas 2D) dans la
 * direction artistique RADIA (contour chocolat, reflet en haut à gauche).
 * Animé uniquement par `t` (secondes) : queue, respiration, pattes, clignement.
 */
import { PAL, OUTLINE, shade, ellipse, fillShaded, gloss, groundShadow, heartPath, roundRect, sparkle } from '../kit';
import type { CatItemId } from '../../../data/world/ids';

export type CatPose = 'sit' | 'sleep' | 'walk' | 'play' | 'purr' | 'eat' | 'stretch';
export interface CatOpts { collar?: string | null; bed?: string | null; toy?: boolean; blink?: boolean }

export { CAT_ITEM_IDS } from '../../../data/world/ids';

const CREAM = '#FFE9CC';
const ORANGE = '#F2A25C';
const BELLY = '#FFF8EE';
const NOSE = '#F28BA6';
const EAR_IN = '#F9B9C6';
const LW = 2.2;

type Ctx = CanvasRenderingContext2D;

function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, rot = 0, outline = true): void {
  ellipse(ctx, x, y, rx, ry, rot);
  fillShaded(ctx, color, { x: x - rx, y: y - ry, w: rx * 2, h: ry * 2 }, outline ? LW : 0, { light: 0.18, dark: 0.1 });
}

function tail(ctx: Ctx, x: number, y: number, dir: number, t: number, curl: number, len = 34): void {
  const sw = Math.sin(t * 2.2) * 6;
  ctx.save();
  ctx.lineCap = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + dir * len * 0.5, y + 6, x + dir * (len * 0.9 + sw * 0.4), y - len * 0.3 - curl, x + dir * (len * 0.7 + sw), y - len * 0.9 - curl);
  };
  path(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 9.4; ctx.stroke();
  path(); ctx.strokeStyle = ORANGE; ctx.lineWidth = 6.2; ctx.stroke();
  path(); ctx.strokeStyle = shade(ORANGE, 0.25); ctx.lineWidth = 2; ctx.setLineDash([0, 9]); ctx.stroke();
  ctx.restore();
}

function ear(ctx: Ctx, x: number, y: number, s: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-9 * s, 4 * s); ctx.quadraticCurveTo(-8 * s, -14 * s, 0, -17 * s); ctx.quadraticCurveTo(8 * s, -14 * s, 9 * s, 4 * s); ctx.closePath();
  fillShaded(ctx, ORANGE, { x: -9 * s, y: -17 * s, w: 18 * s, h: 21 * s }, LW, { light: 0.15, dark: 0.1 });
  ctx.beginPath();
  ctx.moveTo(-5 * s, 2 * s); ctx.quadraticCurveTo(-4.5 * s, -9 * s, 0, -11 * s); ctx.quadraticCurveTo(4.5 * s, -9 * s, 5 * s, 2 * s); ctx.closePath();
  ctx.fillStyle = EAR_IN; ctx.fill();
  ctx.restore();
}

type Eyes = 'open' | 'closed' | 'happy';
function head(ctx: Ctx, cx: number, cy: number, r: number, eyes: Eyes, mouth: 'smile' | 'open' | 'chew', tilt: number, opts: CatOpts, t: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  const earWig = Math.sin(t * 1.3) * 0.05;
  ear(ctx, -r * 0.66, -r * 0.78, r / 18, -0.28 + earWig);
  ear(ctx, r * 0.66, -r * 0.78, r / 18, 0.28 - earWig);
  // tête + calotte orange
  ellipse(ctx, 0, 0, r * 1.12, r);
  fillShaded(ctx, CREAM, { x: -r * 1.1, y: -r, w: r * 2.2, h: r * 2 }, LW, { light: 0.2, dark: 0.12 });
  ctx.save();
  ellipse(ctx, 0, 0, r * 1.12, r); ctx.clip();
  ellipse(ctx, -r * 0.2, -r * 0.95, r * 1.0, r * 0.62); ctx.fillStyle = ORANGE; ctx.fill();
  ctx.strokeStyle = shade(ORANGE, -0.18); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (const dx of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(dx * r, -r * 0.55); ctx.lineTo(dx * r, -r * 0.3); ctx.stroke(); }
  ctx.restore();
  ellipse(ctx, 0, 0, r * 1.12, r); ctx.lineWidth = LW; ctx.strokeStyle = OUTLINE; ctx.stroke();
  // museau
  ellipse(ctx, 0, r * 0.34, r * 0.5, r * 0.36); ctx.fillStyle = BELLY; ctx.fill();
  // joues
  ctx.fillStyle = 'rgba(245,139,166,0.35)';
  ellipse(ctx, -r * 0.7, r * 0.22, r * 0.2, r * 0.12); ctx.fill();
  ellipse(ctx, r * 0.7, r * 0.22, r * 0.2, r * 0.12); ctx.fill();
  // yeux
  const blink = opts.blink ?? ((t % 4.3) < 0.13);
  for (const s of [-1, 1]) {
    const ex = s * r * 0.44;
    const ey = -r * 0.04;
    if (eyes === 'open' && !blink) {
      ellipse(ctx, ex, ey, r * 0.17, r * 0.22); ctx.fillStyle = '#3B2A28'; ctx.fill();
      ellipse(ctx, ex - r * 0.05, ey - r * 0.08, r * 0.065, r * 0.08); ctx.fillStyle = '#fff'; ctx.fill();
      ellipse(ctx, ex + r * 0.05, ey + r * 0.09, r * 0.03, r * 0.035); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
    } else {
      ctx.beginPath();
      if (eyes === 'happy') { ctx.arc(ex, ey + r * 0.08, r * 0.16, Math.PI * 1.08, Math.PI * 1.92); }
      else { ctx.arc(ex, ey - r * 0.02, r * 0.16, Math.PI * 0.12, Math.PI * 0.88); }
      ctx.lineWidth = 2; ctx.strokeStyle = '#3B2A28'; ctx.stroke();
    }
  }
  // nez, bouche, moustaches
  ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.2); ctx.lineTo(r * 0.1, r * 0.2); ctx.lineTo(0, r * 0.31); ctx.closePath();
  ctx.fillStyle = NOSE; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.lineWidth = 1.6; ctx.strokeStyle = OUTLINE;
  if (mouth === 'open' || mouth === 'chew') {
    const o = mouth === 'chew' ? 0.04 + Math.abs(Math.sin(t * 8)) * 0.12 : 0.13;
    ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 0.12, r * o, 0, 0, Math.PI * 2); ctx.fillStyle = '#B5485E'; ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(0, r * 0.31); ctx.lineTo(0, r * 0.38);
    ctx.moveTo(-r * 0.2, r * 0.42); ctx.quadraticCurveTo(-r * 0.1, r * 0.5, 0, r * 0.38);
    ctx.quadraticCurveTo(r * 0.1, r * 0.5, r * 0.2, r * 0.42); ctx.stroke();
  }
  ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(88,67,63,0.55)';
  for (const s of [-1, 1]) for (const dy of [-0.05, 0.1]) {
    ctx.beginPath(); ctx.moveTo(s * r * 0.62, r * (0.3 + dy)); ctx.lineTo(s * r * 1.12, r * (0.22 + dy * 2.4)); ctx.stroke();
  }
  gloss(ctx, -r * 0.5, -r * 0.62, r * 0.2, r * 0.1, 0.5);
  // collier
  if (opts.collar) {
    ctx.beginPath(); ctx.moveTo(-r * 0.75, r * 0.78); ctx.quadraticCurveTo(0, r * 1.18, r * 0.75, r * 0.78);
    ctx.lineWidth = 6; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.lineWidth = 3.4; ctx.strokeStyle = PAL.roseVif; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, r * 1.07, 3.6, 0, Math.PI * 2); ctx.fillStyle = PAL.or; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, r * 1.07); ctx.lineTo(2, r * 1.07); ctx.stroke();
  }
  ctx.restore();
}

function paw(ctx: Ctx, x: number, y: number, w: number, hgt: number, rot = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  roundRect(ctx, -w / 2, 0, w, hgt, w / 2);
  fillShaded(ctx, CREAM, { x: -w / 2, y: 0, w, h: hgt }, LW, { light: 0.2, dark: 0.1 });
  ctx.restore();
}

function ball(ctx: Ctx, x: number, y: number, r: number, spin: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  fillShaded(ctx, PAL.roseVif, { x: -r, y: -r, w: r * 2, h: r * 2 }, LW, { light: 0.3, dark: 0.2 });
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0.3, 2.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 3.6, 5.4); ctx.stroke();
  gloss(ctx, -r * 0.4, -r * 0.4, r * 0.3, r * 0.16, 0.7);
  ctx.restore();
}

function bedBack(ctx: Ctx, bed: string | null | undefined): void {
  if (bed === 'cushion') {
    roundRect(ctx, -44, -11, 88, 20, 10);
    fillShaded(ctx, PAL.rose, { x: -44, y: -11, w: 88, h: 20 }, LW, { light: 0.3, dark: 0.15 });
    ctx.fillStyle = PAL.roseDeep; ctx.beginPath(); ctx.arc(0, -1, 2, 0, 7); ctx.fill();
    for (const [x, y] of [[-44, -11], [44, -11], [-44, 9], [44, 9]]) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fillStyle = PAL.or; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = OUTLINE; ctx.stroke(); }
  } else if (bed === 'basket') {
    ellipse(ctx, 0, -6, 50, 12);
    fillShaded(ctx, '#C99A66', { x: -50, y: -18, w: 100, h: 24 }, LW, { light: 0.2, dark: 0.25 });
    ellipse(ctx, 0, -5, 42, 8); ctx.fillStyle = PAL.rose; ctx.fill();
  }
}
function bedFront(ctx: Ctx, bed: string | null | undefined): void {
  if (bed !== 'basket') return;
  ctx.beginPath();
  ctx.moveTo(-50, -6); ctx.quadraticCurveTo(0, 12, 50, -6); ctx.lineTo(44, 14); ctx.quadraticCurveTo(0, 24, -44, 14); ctx.closePath();
  fillShaded(ctx, '#D6A972', { x: -50, y: -6, w: 100, h: 30 }, LW, { light: 0.18, dark: 0.22 });
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(88,67,63,0.28)'; ctx.lineWidth = 1.3;
  for (let i = -48; i < 52; i += 8) { ctx.beginPath(); ctx.moveTo(i, -4); ctx.lineTo(i + 3, 24); ctx.stroke(); }
  for (const y of [4, 12, 19]) { ctx.beginPath(); ctx.moveTo(-50, y); ctx.quadraticCurveTo(0, y + 12, 50, y); ctx.stroke(); }
  ctx.restore();
}

function hearts(ctx: Ctx, t: number, x: number, y: number, n = 3): void {
  for (let i = 0; i < n; i++) {
    const p = ((t * 0.5 + i / n) % 1);
    ctx.save();
    ctx.globalAlpha = Math.sin(p * Math.PI);
    ctx.fillStyle = PAL.roseVif;
    heartPath(ctx, x + Math.sin(p * 6 + i) * 8 + (i - 1) * 9, y - p * 30, 8 + i * 1.2);
    ctx.fill();
    ctx.restore();
  }
}

function zzz(ctx: Ctx, t: number, x: number, y: number): void {
  ctx.save();
  ctx.fillStyle = PAL.nuit;
  ctx.textAlign = 'center';
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.35 + i / 3) % 1;
    ctx.globalAlpha = Math.sin(p * Math.PI);
    ctx.font = `700 ${7 + p * 8}px Fredoka, sans-serif`;
    ctx.fillText('z', x + p * 14, y - p * 30);
  }
  ctx.restore();
}

/** Dessine le chat dans la boîte w×h (pieds en bas au centre). */
export function drawCat(ctx: Ctx, pose: CatPose, w: number, h: number, t: number, opts: CatOpts = {}): void {
  const k = Math.min(w / 124, h / 108);
  ctx.save();
  ctx.translate(w / 2 + 3 * k, h * 0.86);
  ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const breathe = Math.sin(t * 2.4);
  groundShadow(ctx, 0, 2, pose === 'sleep' ? 46 : 38, 7, 0.26);
  bedBack(ctx, opts.bed);
  const lift = opts.bed === 'basket' ? -6 : opts.bed === 'cushion' ? -5 : 0;
  ctx.translate(0, lift);

  if (pose === 'sit' || pose === 'purr') {
    const purr = pose === 'purr';
    tail(ctx, 17, -6, 1, t, 4);
    blob(ctx, -15, -11, 11, 12, CREAM); blob(ctx, 15, -11, 11, 12, CREAM);
    blob(ctx, 0, -25, 20, 24 + breathe * 0.9, CREAM);
    blob(ctx, 0, -22, 11, 17 + breathe * 0.6, BELLY, 0, false);
    paw(ctx, -7, -20, 8, 20); paw(ctx, 7, -20, 8, 20);
    head(ctx, 0, -55 + (purr ? Math.sin(t * 14) * 0.5 : 0), 19, purr ? 'happy' : 'open', 'smile', Math.sin(t * 0.9) * 0.05, opts, t);
    if (purr) hearts(ctx, t, 0, -78);
  } else if (pose === 'sleep') {
    tail(ctx, 26, -4, -1, t * 0.4, -6, 28);
    blob(ctx, 4, -15 + breathe * 0.7, 34, 15 + breathe * 0.8, CREAM);
    ctx.save(); ellipse(ctx, 4, -15, 34, 15); ctx.clip(); ellipse(ctx, 18, -28, 22, 10); ctx.fillStyle = ORANGE; ctx.fill(); ctx.restore();
    ellipse(ctx, 4, -15, 34, 15); ctx.lineWidth = LW; ctx.strokeStyle = OUTLINE; ctx.stroke();
    paw(ctx, -9, -9, 9, 10, 1.3);
    head(ctx, -24, -20 + breathe * 0.5, 15, 'closed', 'smile', 0.25, opts, t);
    zzz(ctx, t, -10, -40);
  } else if (pose === 'walk') {
    const ph = t * 7;
    tail(ctx, -26, -30, -1, t * 1.3, 8, 30);
    const leg = (x: number, p: number, back: boolean) => {
      const a = Math.sin(ph + p) * 0.45;
      ctx.save(); ctx.translate(x, -20); ctx.rotate(a);
      paw(ctx, 0, 0, 8, 21);
      if (back) { /* patte arrière plus sombre */ }
      ctx.restore();
    };
    leg(-18, Math.PI, true); leg(18, 0, false);
    blob(ctx, 0, -29 + Math.abs(Math.sin(ph)) * -1.2, 29, 14.5, CREAM);
    ctx.save(); ellipse(ctx, 0, -29, 29, 14.5); ctx.clip(); ellipse(ctx, -14, -38, 18, 8); ctx.fillStyle = ORANGE; ctx.fill(); ctx.restore();
    ellipse(ctx, 0, -29, 29, 14.5); ctx.lineWidth = LW; ctx.strokeStyle = OUTLINE; ctx.stroke();
    leg(-10, 0, true); leg(26, Math.PI, false);
    head(ctx, 32, -39 + Math.sin(ph * 2) * 0.8, 15, 'open', 'smile', 0.06, opts, t);
  } else if (pose === 'play') {
    const sw = Math.sin(t * 6);
    const by = -9 - Math.abs(Math.sin(t * 3)) * 16;
    ball(ctx, 43, by - 2, 6.5, t * 5);
    tail(ctx, -26, -22, -1, t * 3, 12, 30);
    blob(ctx, -8, -20, 24, 15, CREAM, -0.28);
    blob(ctx, -26, -26 + sw, 11, 12, CREAM);
    paw(ctx, 8, -14, 8, 15, -0.4 - Math.max(0, sw) * 0.5);
    paw(ctx, -4, -12, 8, 12, -0.1);
    head(ctx, 12, -26, 16.5, 'open', 'open', 0.18 + sw * 0.04, opts, t);
  } else if (pose === 'eat') {
    tail(ctx, -24, -8, -1, t * 0.8, 2, 28);
    blob(ctx, -10, -18, 22, 16, CREAM, -0.3);
    paw(ctx, -2, -14, 8, 14, 0.2); paw(ctx, 8, -12, 8, 12, 0.2);
    head(ctx, 12, -24 + Math.abs(Math.sin(t * 8)) * 2, 16.5, 'happy', 'chew', 0.3, opts, t);
    // gamelle
    ctx.beginPath(); ctx.moveTo(18, -8); ctx.lineTo(50, -8); ctx.lineTo(45, 2); ctx.lineTo(23, 2); ctx.closePath();
    fillShaded(ctx, PAL.lavande, { x: 18, y: -8, w: 32, h: 10 }, LW, { light: 0.3, dark: 0.18 });
    ellipse(ctx, 34, -8, 16, 3.4); ctx.fillStyle = '#C98B5E'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.roseVif; heartPath(ctx, 34, -10, 6); ctx.fill();
  } else { // stretch
    const st = Math.sin(t * 2) * 0.03;
    tail(ctx, -30, -30, -1, t * 1.6, 14, 28);
    blob(ctx, -14, -26, 20, 18, CREAM, -0.55 + st);
    blob(ctx, 6, -13, 18, 10, CREAM, -0.12);
    paw(ctx, 22, -9, 8, 22, Math.PI / 2 - 0.1); paw(ctx, 16, -4, 8, 22, Math.PI / 2 - 0.1);
    head(ctx, 24, -18, 16, 'happy', 'smile', 0.28, opts, t);
  }
  bedFront(ctx, opts.bed);
  if (opts.toy && pose !== 'play') ball(ctx, pose === 'sleep' ? -50 : 48, -6, 6, t);
  ctx.restore();
}

/** Icône d'un accessoire (carré `size`). */
export function drawCatItem(ctx: Ctx, id: CatItemId, size: number): void {
  const k = size / 100;
  ctx.save();
  ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  groundShadow(ctx, 50, 86, 38, 7, 0.22);
  if (id === 'cushion') {
    roundRect(ctx, 12, 38, 76, 42, 18);
    fillShaded(ctx, PAL.rose, { x: 12, y: 38, w: 76, h: 42 }, 3, { light: 0.32, dark: 0.15 });
    ctx.strokeStyle = PAL.roseDeep; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
    roundRect(ctx, 19, 45, 62, 28, 13); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = PAL.or; ctx.beginPath(); ctx.arc(50, 59, 4, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
    for (const [x, y] of [[12, 38], [88, 38], [12, 80], [88, 80]]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = PAL.or; ctx.fill(); ctx.stroke(); }
    gloss(ctx, 30, 46, 12, 4, 0.6);
  } else if (id === 'toy-ball') {
    ball(ctx, 50, 56, 28, 0.4);
    sparkle(ctx, 78, 24, 8, '#fff', 0.9);
  } else if (id === 'collar-bell') {
    ctx.beginPath(); ctx.ellipse(50, 48, 34, 26, 0, 0.1, Math.PI - 0.1);
    ctx.lineWidth = 15; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.lineWidth = 10; ctx.strokeStyle = PAL.roseVif; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(50, 78, 11, 0, 7); fillShaded(ctx, PAL.or, { x: 39, y: 67, w: 22, h: 22 }, 2.6, { light: 0.35, dark: 0.2 });
    ctx.beginPath(); ctx.moveTo(40, 80); ctx.lineTo(60, 80); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.beginPath(); ctx.arc(50, 84, 2, 0, 7); ctx.fillStyle = OUTLINE; ctx.fill();
    gloss(ctx, 46, 73, 3.5, 2, 0.8);
  } else {
    bedFrontIcon(ctx);
  }
  ctx.restore();
}

function bedFrontIcon(ctx: Ctx): void {
  ellipse(ctx, 50, 50, 40, 15);
  fillShaded(ctx, '#C99A66', { x: 10, y: 35, w: 80, h: 30 }, 3, { light: 0.2, dark: 0.25 });
  ellipse(ctx, 50, 51, 33, 10); ctx.fillStyle = PAL.rose; ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 52); ctx.quadraticCurveTo(50, 78, 90, 52); ctx.lineTo(82, 80); ctx.quadraticCurveTo(50, 92, 18, 80); ctx.closePath();
  fillShaded(ctx, '#D6A972', { x: 10, y: 52, w: 80, h: 40 }, 3, { light: 0.18, dark: 0.22 });
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(88,67,63,0.28)'; ctx.lineWidth = 1.6;
  for (let i = 14; i < 90; i += 9) { ctx.beginPath(); ctx.moveTo(i, 54); ctx.lineTo(i + 3, 92); ctx.stroke(); }
  for (const y of [62, 72, 82]) { ctx.beginPath(); ctx.moveTo(10, y); ctx.quadraticCurveTo(50, y + 16, 90, y); ctx.stroke(); }
  ctx.restore();
}
