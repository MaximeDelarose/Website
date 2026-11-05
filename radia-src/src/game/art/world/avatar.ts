/**
 * Avatar en couches de Radia (dressing).
 *
 * Boîte logique 240 × 600 (pieds en bas). Ordre des calques, de l'arrière vers l'avant :
 *   cheveux arrière (+ chignon / queue) → dos de la robe → jambes (peau) → chaussures →
 *   bas → buste (peau, haut, robe) → bras + manches → veste → mains → sac → foulard / perles →
 *   visage → cheveux avant → boucles d'oreilles, lunettes → couronne.
 * Le visage, les yeux, le nez (anneau) et la marque dans l'œil sont ceux de characters.ts.
 */
import type { Look, ClothId, HairId } from '../../../data/world/ids';
import { CLOTH_SLOTS, HAIR_IDS, LIP_COLOR, EYE_COLOR, MOUTH_SHAPE, LINER_STYLE, SHADOW_COLOR, accGroup } from '../../../data/world/ids';
import type { Expr } from '../../../data/dialogue';
import { radiaParts as P, getFaceCustom } from '../characters';
import { faceKey } from '../../../data/world/face';
import { PAL, heartPath, roundRect, shade, gloss, starPath } from '../kit';
import { makeCanvas } from '../kit';
import { BRACELET_ID, SHINE_STEPS, shineStep } from './wristShine';
import { NECKLACE_ID } from '../../../data/world/ids';

export interface AvatarOpts { expr?: Expr; step?: number; arms?: 'down' | 'wave' | 'heart' | 'open'; blink?: boolean; /** reflet du bracelet 0–1 (animation douce) */ shine?: number; /** 'straight' = ancienne posture droite et symétrique ; par défaut : posture naturelle (silhouette en S, main sur la hanche) */ pose?: 'natural' | 'straight' }

export type C = CanvasRenderingContext2D;
export type Pt = [number, number];

export const CX = 120;
export const INK = P.INK;
/** Peau COURANTE (peut être personnalisée) : lue à chaque dessin. */
export const skin = (): string => P.SKIN_R;
export const skinD = (): string => P.SKIN_R_SHADOW;
export const skinL = (): string => P.SKIN_R_LIGHT;
export const GOLD = P.GOLD;

// ---------------------------------------------------------------- petits outils

export function lg(ctx: C, x0: number, y0: number, x1: number, y1: number, ...cols: string[]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  cols.forEach((c, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), c));
  return g;
}

/** Remplit puis contourne le chemin courant. */
export function fs(ctx: C, fill: string | CanvasGradient, lw = 2.2, ink: string = INK): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = ink;
  ctx.stroke();
}

export function line(ctx: C, pts: Pt[], color: string, w = 1.4, smooth = true): void {
  ctx.beginPath();
  if (smooth && pts.length > 2) P.curveThrough(ctx, pts);
  else { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function dot(ctx: C, x: number, y: number, r: number, fill: string, ink: string | null = null, lw = 1): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (ink) { ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.stroke(); }
}

/** Exécute `inner` à l'intérieur de la forme décrite par `path`. */
export function clipped(ctx: C, path: (c: C) => void, inner: () => void): void {
  ctx.save();
  path(ctx);
  ctx.clip();
  inner();
  ctx.restore();
}

/** Reflets de satin : quelques bandes claires obliques. */
export function sheen(ctx: C, x0: number, y0: number, x1: number, y1: number, alpha = 0.22): void {
  ctx.save();
  ctx.lineCap = 'butt';
  for (const [o, w] of [[0.18, 7], [0.46, 12], [0.78, 5]] as const) {
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * o, y0);
    ctx.lineTo(x0 + (x1 - x0) * o - 26, y1);
    ctx.lineWidth = w;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.stroke();
  }
  ctx.restore();
}

export function bow(ctx: C, x: number, y: number, s: number, color: string, rot = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(d * 8, -12, d * 22, -12, d * 22, 0);
    ctx.bezierCurveTo(d * 22, 12, d * 8, 11, 0, 0);
    fs(ctx, lg(ctx, 0, -10, 0, 10, shade(color, 0.18), color, shade(color, -0.14)), 1.8 / s);
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.4, 4.8, 0, 0, Math.PI * 2);
  fs(ctx, shade(color, 0.05), 1.8 / s);
  ctx.restore();
}

// ---------------------------------------------------------------- bras

export interface Arm { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number }

export function armGeo(s: -1 | 1, pose: AvatarOpts['arms'], st: number, natural = false): Arm {
  const swing = st * s * -6;
  let x1 = CX + s * 74 + swing * 0.3, y1 = 322, cx = CX + s * 98, cy = 262;
  if (pose === 'wave' && s === 1) { x1 = 208; y1 = 150; cx = 206; cy = 216; }
  else if (pose === 'heart') { x1 = CX + s * 16; y1 = 286; cx = CX + s * 76; cy = 262; }
  else if (pose === 'open') { x1 = CX + s * 94; y1 = 316; cx = CX + s * 90; cy = 236; }
  else if (natural) {
    // posture naturelle : côté droit de l'image = main posée sur la hanche (coude écarté), côté gauche = bras détendu, légèrement en avant
    if (s === 1) { x1 = CX + 57; y1 = 306; cx = CX + 96; cy = 246; } else { x1 = CX - 72; y1 = 326; cx = CX - 94; cy = 264; }
  }
  return { x0: CX + s * 50, y0: 204, cx, cy, x1, y1 };
}

const qAt = (a: Arm, t: number): Pt => [
  (1 - t) * (1 - t) * a.x0 + 2 * (1 - t) * t * a.cx + t * t * a.x1,
  (1 - t) * (1 - t) * a.y0 + 2 * (1 - t) * t * a.cy + t * t * a.y1,
];

/** Portion [t0, t1] de la courbe du bras, épaisse (manche ou peau). */
function armSeg(ctx: C, a: Arm, t0: number, t1: number, width: number, c0: string, c1: string, round: boolean, ink = true): void {
  const p0 = qAt(a, t0);
  const p1 = qAt(a, t1);
  const dx = (1 - t0) * (a.cx - a.x0) + t0 * (a.x1 - a.cx);
  const dy = (1 - t0) * (a.cy - a.y0) + t0 * (a.y1 - a.cy);
  const k = t1 - t0;
  const cx = p0[0] + k * dx;
  const cy = p0[1] + k * dy;
  ctx.lineCap = round ? 'round' : 'butt';
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.quadraticCurveTo(cx, cy, p1[0], p1[1]);
  if (ink) { ctx.lineWidth = width + 3.4; ctx.strokeStyle = INK; ctx.stroke(); }
  ctx.lineWidth = width;
  ctx.strokeStyle = lg(ctx, Math.min(p0[0], p1[0]) - width, p0[1], Math.max(p0[0], p1[0]) + width, p1[1], c0, c1);
  ctx.stroke();
  ctx.lineCap = 'round';
}

function endAng(a: Arm, t: number): number {
  const dx = (1 - t) * (a.cx - a.x0) + t * (a.x1 - a.cx);
  const dy = (1 - t) * (a.cy - a.y0) + t * (a.y1 - a.cy);
  return Math.atan2(dy, dx) - Math.PI / 2;
}

/** Bande d'extrémité d'une manche (poignet, ourlet). */
export function sleeveEnd(ctx: C, a: Arm, t: number, width: number, h: number, color: string | null): void {
  const [x, y] = qAt(a, t);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(endAng(a, t));
  if (color) {
    roundRect(ctx, -width / 2 - 1, -h / 2, width + 2, h, 3);
    fs(ctx, color, 1.8);
  } else {
    ctx.beginPath();
    ctx.moveTo(-width / 2 - 1.5, 0);
    ctx.lineTo(width / 2 + 1.5, 0);
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.restore();
}

export interface SleeveSpec { len: number; wid: number; c0: string; c1: string; cuff?: string; hem?: boolean; puff?: string; trim?: string }

// ---------------------------------------------------------------- torse

export interface TorsoO { hem: number; hemW?: number; waist?: number; shW?: number; neck?: 'crew' | 'v' | 'scoop' | 'sweet'; nd?: number; wy?: number }

/** Silhouette du buste (chemin fermé, sans remplissage). */
export function torso(ctx: C, o: TorsoO): void {
  const sw = o.shW ?? 58, ww = o.waist ?? 50, hw = o.hemW ?? 54, wy = o.wy ?? 272, hem = o.hem;
  const nx = o.neck === 'v' ? 24 : 22;
  ctx.beginPath();
  ctx.moveTo(CX - nx, 166);
  ctx.bezierCurveTo(CX - 36, 170, CX - sw - 4, 178, CX - sw, 196);
  ctx.bezierCurveTo(CX - sw - 2, 226, CX - ww - 2, 248, CX - ww, wy);
  ctx.bezierCurveTo(CX - ww + 1, wy + 22, CX - hw, hem - 24, CX - hw, hem);
  ctx.quadraticCurveTo(CX, hem + 8, CX + hw, hem);
  ctx.bezierCurveTo(CX + hw, hem - 24, CX + ww - 1, wy + 22, CX + ww, wy);
  ctx.bezierCurveTo(CX + ww + 2, 248, CX + sw + 2, 226, CX + sw, 196);
  ctx.bezierCurveTo(CX + sw + 4, 178, CX + 36, 170, CX + nx, 166);
  const nd = o.nd ?? 12;
  if (o.neck === 'v') ctx.lineTo(CX, 166 + nd);
  else if (o.neck === 'scoop') ctx.bezierCurveTo(CX + 18, 166 + nd, CX - 18, 166 + nd, CX - nx, 166);
  else if (o.neck === 'sweet') {
    ctx.quadraticCurveTo(CX + 24, 166 + nd, CX + 8, 166 + nd - 2);
    ctx.quadraticCurveTo(CX, 166 + nd + 6, CX - 8, 166 + nd - 2);
    ctx.quadraticCurveTo(CX - 24, 166 + nd, CX - nx, 166);
  } else ctx.quadraticCurveTo(CX, 166 + nd, CX - nx, 166);
  ctx.closePath();
}

/** Contour du col (liseré) le long de l'encolure. */
export function neckTrim(ctx: C, kind: 'crew' | 'v' | 'scoop', nd: number, color: string, w = 3.2): void {
  ctx.beginPath();
  if (kind === 'v') { ctx.moveTo(CX - 24, 166); ctx.lineTo(CX, 166 + nd); ctx.lineTo(CX + 24, 166); }
  else { ctx.moveTo(CX - 22, 166); ctx.quadraticCurveTo(CX, 166 + nd * (kind === 'scoop' ? 1.5 : 1.2), CX + 22, 166); }
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function chestSkin(ctx: C): void {
  ctx.beginPath();
  ctx.moveTo(107, 144);
  ctx.lineTo(133, 144);
  ctx.lineTo(134, 168);
  ctx.bezierCurveTo(150, 172, 156, 190, 150, 214);
  ctx.bezierCurveTo(140, 240, 100, 240, 90, 214);
  ctx.bezierCurveTo(84, 190, 90, 172, 106, 168);
  ctx.closePath();
  ctx.fillStyle = lg(ctx, 0, 146, 0, 232, skinD(), skin(), skin());
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(107, 144); ctx.lineTo(106, 168);
  ctx.moveTo(133, 144); ctx.lineTo(134, 168);
  ctx.stroke();
}

// ---------------------------------------------------------------- tenues : définitions

const HOODIE = '#26212B';
const HOODIE_LIGHT = '#42394A';
const HOODIE_DARK = '#15111A';

export type TopFn = (ctx: C) => void;

export function hoodie(ctx: C, col: string, hoodCol: [string, string], strings: string, motif: boolean): void {
  // capuche baissée derrière la nuque
  ctx.beginPath();
  ctx.moveTo(86, 176);
  ctx.bezierCurveTo(84, 146, 100, 142, 120, 142);
  ctx.bezierCurveTo(140, 142, 156, 146, 154, 176);
  ctx.closePath();
  fs(ctx, lg(ctx, 0, 142, 0, 178, hoodCol[0], hoodCol[1]), 2);
  const body = (c: C) => {
    c.beginPath();
    c.moveTo(98, 166);
    c.bezierCurveTo(84, 170, 66, 178, 62, 196);
    c.bezierCurveTo(54, 240, 56, 300, 60, 352);
    c.quadraticCurveTo(120, 360, 180, 352);
    c.bezierCurveTo(184, 300, 186, 240, 178, 196);
    c.bezierCurveTo(174, 178, 156, 170, 142, 166);
    c.quadraticCurveTo(120, 184, 98, 166);
    c.closePath();
  };
  body(ctx);
  fs(ctx, lg(ctx, 60, 170, 180, 352, shade(col, 0.16), col, shade(col, -0.2)), 2.4);
  clipped(ctx, body, () => {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.moveTo(70, 220); ctx.quadraticCurveTo(66, 280, 72, 340); ctx.moveTo(170, 224); ctx.quadraticCurveTo(174, 284, 168, 340); ctx.stroke();
  });
  // poche kangourou
  ctx.beginPath();
  ctx.moveTo(84, 300);
  ctx.quadraticCurveTo(120, 296, 156, 300);
  ctx.lineTo(166, 340);
  ctx.quadraticCurveTo(120, 346, 74, 340);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(40,20,20,0.6)';
  ctx.stroke();
  // bas côtelé
  ctx.beginPath();
  ctx.moveTo(60, 344);
  ctx.quadraticCurveTo(120, 336, 180, 344);
  ctx.lineTo(180, 352);
  ctx.quadraticCurveTo(120, 360, 60, 352);
  ctx.closePath();
  fs(ctx, shade(col, -0.1), 1.8);
  // col + cordons
  ctx.beginPath();
  ctx.moveTo(98, 166);
  ctx.quadraticCurveTo(120, 186, 142, 166);
  ctx.lineWidth = 6.4;
  ctx.strokeStyle = shade(col, -0.35);
  ctx.stroke();
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = shade(col, 0.1);
  ctx.stroke();
  for (const s of [-1, 1]) {
    line(ctx, [[CX + s * 9, 182], [CX + s * 12, 200], [CX + s * 7, 214], [CX + s * 9, 234]], strings, 1.9);
    dot(ctx, CX + s * 9, 236, 2, GOLD, INK, 0.8);
  }
  if (motif) {
    heartPath(ctx, 120, 262, 17);
    fs(ctx, PAL.rose, 1.6);
    gloss(ctx, 114, 256, 3.4, 1.8, 0.7, -0.6);
  }
}

export function tee(ctx: C, col: string, heart: boolean): void {
  const nd = heart ? 18 : 14;
  torso(ctx, { hem: 322, hemW: 52, waist: 47, shW: 56, neck: 'scoop', nd });
  fs(ctx, lg(ctx, 60, 170, 180, 322, shade(col, 0.08), col, shade(col, -0.12)), 2.4);
  clipped(ctx, (c) => torso(c, { hem: 322, hemW: 52, waist: 47, shW: 56, neck: 'scoop', nd }), () => {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(CX + 20, 200, 60, 140);
    line(ctx, [[CX - 40, 230], [CX - 36, 280], [CX - 40, 318]], 'rgba(0,0,0,0.09)', 1.5);
  });
  neckTrim(ctx, 'scoop', nd, shade(col, -0.2), 3.4);
  // ourlet
  line(ctx, [[CX - 51, 314], [CX, 322], [CX + 51, 314]], 'rgba(0,0,0,0.12)', 1.3);
  if (heart) {
    heartPath(ctx, 120, 258, 18);
    fs(ctx, PAL.white, 1.6);
    gloss(ctx, 113, 252, 3.6, 2, 0.7, -0.6);
    heartPath(ctx, 120, 258, 11);
    ctx.fillStyle = PAL.roseVif;
    ctx.fill();
  }
}

export function cardigan(ctx: C): void {
  const col = '#B9A5E8';
  const hem = 342;
  const o: TorsoO = { hem, hemW: 58, waist: 50, shW: 59, neck: 'v', nd: 96 };
  // débardeur crème visible dans l'ouverture
  torso(ctx, { hem: 336, hemW: 50, waist: 46, shW: 54, neck: 'scoop', nd: 14 });
  fs(ctx, lg(ctx, 0, 170, 0, 336, '#FFF4E8', '#EAD8C4'), 2);
  torso(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, hem, shade(col, 0.14), col, shade(col, -0.16)), 2.4);
  const path = (c: C) => torso(c, o);
  clipped(ctx, path, () => {
    // ouverture en V jusqu'au bas : les deux pans s'écartent légèrement
    ctx.beginPath();
    ctx.moveTo(CX - 24, 160); ctx.lineTo(CX - 3, 262); ctx.lineTo(CX - 5, hem + 10); ctx.lineTo(CX + 5, hem + 10); ctx.lineTo(CX + 3, 262); ctx.lineTo(CX + 24, 160);
    ctx.closePath();
    ctx.fillStyle = '#FFF4E8';
    ctx.fill();
    // mailles : fines côtes verticales
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(80,60,130,0.16)';
    ctx.beginPath();
    for (let x = CX - 62; x <= CX + 62; x += 6) { ctx.moveTo(x, 176); ctx.lineTo(x + (x - CX) * 0.02, hem); }
    ctx.stroke();
    // bande de boutonnage
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(CX + s * 24, 160); ctx.lineTo(CX + s * 3, 262); ctx.lineTo(CX + s * 5, hem + 10);
      ctx.lineWidth = 6;
      ctx.strokeStyle = shade(col, -0.18);
      ctx.stroke();
    }
    // bas côtelé
    ctx.fillStyle = shade(col, -0.1);
    ctx.fillRect(CX - 70, hem - 12, 140, 22);
    ctx.strokeStyle = 'rgba(60,40,110,0.3)';
    ctx.beginPath();
    for (let x = CX - 66; x <= CX + 66; x += 4) { ctx.moveTo(x, hem - 12); ctx.lineTo(x, hem + 6); }
    ctx.stroke();
  });
  for (const [y, s] of [[200, 1], [226, 1], [252, 1], [292, 1], [318, 1]] as const) {
    const bx = CX + s * (y < 262 ? 24 - (y - 160) * 0.205 + 4 : 8);
    dot(ctx, bx, y, 3.1, '#FFF4E8', INK, 1.2);
    dot(ctx, bx - 0.8, y - 0.8, 0.9, PAL.white);
  }
  // poches plaquées
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 20, 298); ctx.lineTo(CX + s * 46, 298); ctx.lineTo(CX + s * 47, 322); ctx.lineTo(CX + s * 21, 322); ctx.closePath();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = 'rgba(70,50,120,0.45)';
    ctx.stroke();
  }
}

export function blouse(ctx: C): void {
  const col = '#F6E3CF';
  const o: TorsoO = { hem: 312, hemW: 54, waist: 49, shW: 59, neck: 'scoop', nd: 8, wy: 268 };
  torso(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, 312, '#FFF6EA', col, '#E8C9AE'), 2.4);
  clipped(ctx, (c) => torso(c, o), () => {
    sheen(ctx, 70, 176, 170, 312, 0.32);
    line(ctx, [[CX - 36, 210], [CX - 44, 260], [CX - 40, 306]], 'rgba(150,100,70,0.16)', 2);
    line(ctx, [[CX + 36, 210], [CX + 44, 260], [CX + 40, 306]], 'rgba(150,100,70,0.16)', 2);
  });
  // rangée de boutons cachée + nœud pussy-bow
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX, 178);
    ctx.bezierCurveTo(CX + s * 12, 196, CX + s * 20, 214, CX + s * 14, 238);
    ctx.lineTo(CX + s * 4, 232);
    ctx.bezierCurveTo(CX + s * 8, 212, CX + s * 2, 198, CX, 190);
    ctx.closePath();
    fs(ctx, lg(ctx, 0, 180, 0, 238, '#F2A9B8', '#D9758E'), 1.7);
  }
  bow(ctx, CX, 178, 0.62, '#F08FA6');
  for (const y of [252, 270, 288]) dot(ctx, CX, y, 1.6, '#FFF6EA', 'rgba(120,70,50,0.6)', 0.8);
}

export function stripeShirt(ctx: C): void {
  const col = '#FBF8F4';
  const o: TorsoO = { hem: 340, hemW: 57, waist: 52, shW: 58, neck: 'v', nd: 40 };
  torso(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, 340, '#FFFFFF', col, '#E6DDD6'), 2.4);
  clipped(ctx, (c) => torso(c, o), () => {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(70,105,160,0.7)';
    ctx.beginPath();
    for (let x = CX - 66; x <= CX + 66; x += 6.5) { ctx.moveTo(x, 168); ctx.lineTo(x * 1 + (x - CX) * 0.04, 350); }
    ctx.stroke();
    // patte de boutonnage
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(CX - 5, 200, 10, 150);
    line(ctx, [[CX - 5, 200], [CX - 5, 350]], 'rgba(70,60,60,0.45)', 1);
    line(ctx, [[CX + 5, 200], [CX + 5, 350]], 'rgba(70,60,60,0.45)', 1);
  });
  for (const y of [214, 244, 274, 304, 330]) dot(ctx, CX, y, 2.1, '#8DA6CF', INK, 0.9);
  // col chemise
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 20, 160);
    ctx.lineTo(CX + s * 36, 176);
    ctx.lineTo(CX + s * 18, 194);
    ctx.lineTo(CX, 207);
    ctx.lineTo(CX + s * 3, 170);
    ctx.closePath();
    fs(ctx, '#FFFFFF', 1.9);
  }
  // poche de poitrine
  ctx.beginPath();
  ctx.moveTo(CX - 44, 238); ctx.lineTo(CX - 20, 238); ctx.lineTo(CX - 20, 262); ctx.quadraticCurveTo(CX - 32, 268, CX - 44, 262); ctx.closePath();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = 'rgba(70,105,160,0.7)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(70,105,160,0.1)';
  ctx.fill();
}

// ---- hauts : table

export const SLEEVES: Partial<Record<ClothId, SleeveSpec>> = {
  'top-tee-white': { len: 0.34, wid: 31, c0: '#FFFFFF', c1: '#EAE2E2', hem: true },
  'top-tee-pink': { len: 0.34, wid: 31, c0: '#FBC6D6', c1: '#EF96B3', hem: true },
  'top-hoodie-black': { len: 1, wid: 36, c0: HOODIE_LIGHT, c1: HOODIE_DARK, cuff: '#352E3C' },
  'top-hoodie-cream': { len: 1, wid: 36, c0: '#FFF3E2', c1: '#E4CDB0', cuff: '#D9BFA0' },
  'top-cardigan-lavender': { len: 1, wid: 31, c0: '#CDBDF4', c1: '#A18CDB', cuff: '#8F7AC8' },
  'top-blouse-silk': { len: 1, wid: 35, c0: '#FFF6EA', c1: '#E6C6AB', cuff: '#F2D4BC' },
  'top-stripe-shirt': { len: 0.72, wid: 28, c0: '#FFFFFF', c1: '#E8DFD8', cuff: '#DCE6F5' },
};

export const TOPS: Partial<Record<ClothId, TopFn>> = {
  'top-tee-white': (c) => tee(c, '#FBF8F6', false),
  'top-tee-pink': (c) => tee(c, '#F5A9C0', true),
  'top-hoodie-black': (c) => hoodie(c, HOODIE, [HOODIE_LIGHT, HOODIE_DARK], '#B8B0C2', false),
  'top-hoodie-cream': (c) => hoodie(c, '#F3E3CC', ['#F8EBD8', '#D8BF9E'], '#B58E7A', true),
  'top-cardigan-lavender': cardigan,
  'top-blouse-silk': blouse,
  'top-stripe-shirt': stripeShirt,
};
/** Hauts rentrés dans le bas (dessinés avant). */
export const TUCKED = new Set<ClothId>(['top-blouse-silk']);
/** Hauts très longs : le bas est dessiné avant (le haut passe par-dessus). */
const camisole = (ctx: C) => {
  const o: TorsoO = { hem: 316, hemW: 48, waist: 44, shW: 46, neck: 'scoop', nd: 18 };
  torso(ctx, o);
  fs(ctx, lg(ctx, 0, 170, 0, 316, '#FFF4E8', '#EBDCCB'), 2.2);
};

// ---------------------------------------------------------------- bas

export interface LegO { topW: number; outer: number; inner: number; hemY: number; color: string; wy?: number }

export function pants(ctx: C, st: number, o: LegO, deco: (s: -1 | 1, off: number) => void, waistband: () => void): void {
  const wy = o.wy ?? 292;
  for (const s of [-1, 1] as const) {
    const off = st * s * 12;
    ctx.beginPath();
    ctx.moveTo(CX + s * 1.5, wy);
    ctx.lineTo(CX + s * o.topW, wy);
    ctx.bezierCurveTo(CX + s * (o.topW + 4), 390, CX + s * o.outer, 480, CX + s * o.outer + off, o.hemY);
    ctx.quadraticCurveTo(CX + s * (o.outer + o.inner) / 2 + off, o.hemY + 6, CX + s * o.inner + off, o.hemY);
    ctx.bezierCurveTo(CX + s * (o.inner - 1), 500, CX + s * 3, 440, CX + s * 1.5, 380);
    ctx.lineTo(CX + s * 1.5, wy);
    ctx.closePath();
    fs(ctx, lg(ctx, CX - s * 40, wy, CX + s * 70, o.hemY, shade(o.color, 0.14), o.color, shade(o.color, -0.2)), 2.2);
    deco(s, off);
  }
  // efface la couture centrale au-dessus de l'entrejambe
  ctx.fillStyle = shade(o.color, 0.02);
  ctx.fillRect(CX - 2.6, wy + 1, 5.2, 80);
  waistband();
}

export const BOTTOMS: Partial<Record<ClothId, (ctx: C, st: number) => void>> = {
  'bot-wide-black': (ctx, st) => {
    const col = '#211C25';
    pants(ctx, st, { topW: 52, outer: 62, inner: 6, hemY: 548, color: col }, (s, off) => {
      line(ctx, [[CX + s * 32, 330], [CX + s * 33 + off * 0.5, 450], [CX + s * 34 + off, 560]], 'rgba(255,255,255,0.09)', 1.5);
    }, () => {
      roundRect(ctx, CX - 51, 288, 102, 13, 4);
      fs(ctx, '#2E2733', 1.8);
      line(ctx, [[CX - 6, 296], [CX - 12, 316]], '#B8B0C2', 1.5);
      line(ctx, [[CX + 6, 296], [CX + 12, 316]], '#B8B0C2', 1.5);
    });
  },
  'bot-jeans': (ctx, st) => {
    const col = '#5E84BC';
    pants(ctx, st, { topW: 52, outer: 55, inner: 10, hemY: 546, color: col }, (s, off) => {
      // délavage et coutures
      ctx.save();
      ctx.beginPath();
      ctx.rect(CX + (s > 0 ? 0 : -80), 380, 80, 120);
      ctx.restore();
      line(ctx, [[CX + s * 38, 380], [CX + s * 38 + off * 0.5, 470], [CX + s * 40 + off, 550]], 'rgba(255,255,255,0.16)', 6);
      ctx.setLineDash([3, 3]);
      line(ctx, [[CX + s * 53, 320], [CX + s * 54, 450], [CX + s * 55 + off, 548]], '#F2C06B', 1.2, true);
      ctx.setLineDash([]);
      // poche
      ctx.beginPath();
      ctx.moveTo(CX + s * 52, 306); ctx.quadraticCurveTo(CX + s * 30, 316, CX + s * 28, 346);
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#F2C06B'; ctx.stroke();
      // ourlet relevé
      line(ctx, [[CX + s * 12 + off, 531], [CX + s * 33 + off, 536], [CX + s * 54 + off, 531]], 'rgba(30,50,90,0.5)', 1.4);
    }, () => {
      roundRect(ctx, CX - 51, 288, 102, 12, 3);
      fs(ctx, '#3F5F95', 1.8);
      roundRect(ctx, CX - 9, 287, 18, 14, 3);
      fs(ctx, lg(ctx, 0, 287, 0, 301, '#FFE9A6', GOLD, '#D9A238'), 1.5);
      line(ctx, [[CX + 8, 302], [CX + 5, 336], [CX, 352]], '#F2C06B', 1.2);
    });
  },
  'bot-trousers-chic': (ctx, st) => {
    const col = '#454a63';
    pants(ctx, st, { topW: 51, outer: 52, inner: 8, hemY: 538, color: col, wy: 286 }, (s, off) => {
      line(ctx, [[CX + s * 30, 330], [CX + s * 30 + off * 0.5, 440], [CX + s * 30 + off, 546]], 'rgba(255,255,255,0.2)', 1.6);
      line(ctx, [[CX + s * 22, 300], [CX + s * 22, 330]], 'rgba(0,0,0,0.35)', 1.4);
    }, () => {
      roundRect(ctx, CX - 51, 282, 102, 15, 3);
      fs(ctx, '#2D3045', 1.8);
      roundRect(ctx, CX - 9, 283, 18, 13, 3);
      fs(ctx, lg(ctx, 0, 283, 0, 296, '#FFE9A6', GOLD, '#D9A238'), 1.5);
      line(ctx, [[CX - 4, 289.5], [CX + 4, 289.5]], '#9A6E1E', 1.4);
    });
  },
};

export function skirtPleated(ctx: C): void {
  const col = '#A8506F';
  const path = (c: C) => {
    c.beginPath();
    c.moveTo(CX - 49, 290);
    c.bezierCurveTo(CX - 54, 340, CX - 70, 400, CX - 80, 464);
    for (let i = 0; i <= 8; i++) {
      const x = CX - 80 + i * 20;
      c.quadraticCurveTo(x + 5, 470 + (i % 2 ? -2 : 5), x + 10, 464 + (i % 2 ? 4 : -2));
    }
    c.bezierCurveTo(CX + 70, 400, CX + 54, 340, CX + 49, 290);
    c.closePath();
  };
  path(ctx);
  fs(ctx, lg(ctx, CX - 80, 290, CX + 80, 470, shade(col, 0.18), col, shade(col, -0.22)), 2.4);
  clipped(ctx, path, () => {
    for (let i = -7; i <= 7; i++) {
      const x0 = CX + i * 6.8;
      const x1 = CX + i * 11;
      ctx.beginPath();
      ctx.moveTo(x0, 292); ctx.lineTo(x1 - 3, 474); ctx.lineTo(x1 + 5, 474); ctx.lineTo(x0 + 3, 292);
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)';
      ctx.fill();
      line(ctx, [[x0, 292], [x1, 474]], 'rgba(60,15,35,0.4)', 1);
    }
  });
  roundRect(ctx, CX - 51, 284, 102, 14, 3);
  fs(ctx, shade(col, -0.15), 1.9);
  bow(ctx, CX + 34, 291, 0.5, '#F5B5C8', 0.3);
}

// ---------------------------------------------------------------- robes

export interface DressFx { back?: (ctx: C, st: number) => void; front: (ctx: C, st: number) => void; sleeve?: SleeveSpec }

export function wave(ctx: C, x0: number, x1: number, y: number, amp: number, n: number): void {
  // trace le bas d'une jupe de droite à gauche avec des festons
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const xa = x1 - i * step;
    ctx.quadraticCurveTo(xa - step / 2, y + amp * 2, xa - step, y);
  }
}

export function flower(ctx: C, x: number, y: number, r: number, petal: string, centre: string): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    dot(ctx, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, petal);
  }
  dot(ctx, x, y, r * 0.38, centre);
}

// ---- robes « sur mesure » : une même silhouette, des longueurs, coupes et motifs variés
export interface GenDress {
  col: string; col2: string; accent: string; hem: number; flare: number;
  pat: 'plain' | 'dots' | 'stripes' | 'gingham' | 'hearts' | 'lace' | 'buttons';
  neck?: 'v' | 'round' | 'sweet'; belt?: string; sleeve?: SleeveSpec; scallop?: number;
}
export function genDress(g: GenDress): DressFx {
  return {
    sleeve: g.sleeve,
    front(ctx, st) {
      const sw = st * 3;
      const w = 40 + g.flare;
      const path = (c: C) => {
        c.beginPath();
        c.moveTo(CX - 40, 171);
        c.lineTo(CX - 25, 167);
        if (g.neck === 'round') c.quadraticCurveTo(CX, 200, CX + 25, 167);
        else if (g.neck === 'sweet') { c.quadraticCurveTo(CX - 22, 190, CX - 8, 188); c.quadraticCurveTo(CX, 196, CX + 8, 188); c.quadraticCurveTo(CX + 22, 190, CX + 25, 167); }
        else { c.lineTo(CX, 214); c.lineTo(CX + 25, 167); }
        c.lineTo(CX + 40, 171);
        c.bezierCurveTo(CX + 44, 190, CX + 50, 205, CX + 46, 222);
        c.bezierCurveTo(CX + 42, 246, CX + 44, 262, CX + 40, 276);
        c.bezierCurveTo(CX + 50 + g.flare * 0.2, 276 + (g.hem - 276) * 0.3, CX + w * 0.9 + sw, g.hem - (g.hem - 276) * 0.3, CX + w + sw, g.hem);
        wave(c, CX - w, CX + w + sw, g.hem, g.scallop ?? 3, Math.max(4, Math.round(w / 12)));
        c.bezierCurveTo(CX - w * 0.9, g.hem - (g.hem - 276) * 0.3, CX - 50 - g.flare * 0.2, 276 + (g.hem - 276) * 0.3, CX - 40, 276);
        c.bezierCurveTo(CX - 44, 262, CX - 42, 246, CX - 46, 222);
        c.bezierCurveTo(CX - 50, 205, CX - 44, 190, CX - 40, 171);
        c.closePath();
      };
      path(ctx);
      fs(ctx, lg(ctx, CX - w, 170, CX + w, g.hem, shade(g.col, 0.18), g.col, g.col2), 2.4);
      clipped(ctx, path, () => {
        const y0 = 172, y1 = g.hem + 6;
        if (g.pat === 'dots') {
          for (let r = 0; y0 + 12 + r * 22 < y1; r++) for (let k = -5; k <= 5; k++) dot(ctx, CX + k * 22 + (r % 2) * 11, y0 + 12 + r * 22, 3.6, g.accent);
        } else if (g.pat === 'stripes') {
          for (let y = y0; y < y1; y += 22) { ctx.fillStyle = g.accent; ctx.fillRect(CX - 120, y, 240, 8); }
        } else if (g.pat === 'gingham') {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          for (let x = -130; x < 130; x += 20) ctx.fillRect(CX + x, y0, 9, y1 - y0);
          for (let y = y0; y < y1; y += 20) ctx.fillRect(CX - 130, y, 260, 9);
        } else if (g.pat === 'hearts') {
          for (let r = 0; y0 + 16 + r * 30 < y1; r++) for (let k = -4; k <= 4; k++) { heartPath(ctx, CX + k * 28 + (r % 2) * 14, y0 + 16 + r * 30, 7); ctx.fillStyle = g.accent; ctx.fill(); }
        } else if (g.pat === 'lace') {
          ctx.lineWidth = 1.3; ctx.strokeStyle = g.accent;
          for (let y = g.hem - 34; y < g.hem + 6; y += 11) { ctx.beginPath(); for (let x = CX - w; x < CX + w; x += 12) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6, y + 8, x + 12, y); } ctx.stroke(); }
          for (let k = 0; k < 14; k++) dot(ctx, CX - 36 + (k % 7) * 12, 190 + Math.floor(k / 7) * 26, 2.2, g.accent);
        } else if (g.pat === 'buttons') {
          line(ctx, [[CX, 214], [CX, g.hem]], 'rgba(20,40,80,0.35)', 1.4, false);
          for (let y = 224; y < g.hem - 6; y += 30) dot(ctx, CX, y, 3, g.accent, 'rgba(20,40,80,0.5)', 0.8);
          ctx.setLineDash([3, 3]); line(ctx, [[CX - 22, 214], [CX - 22, g.hem]], g.accent, 1, false); line(ctx, [[CX + 22, 214], [CX + 22, g.hem]], g.accent, 1, false); ctx.setLineDash([]);
        }
        sheen(ctx, CX - w, 290, CX + w, g.hem, 0.14);
      });
      if (g.neck === 'round') line(ctx, [[CX - 25, 167], [CX, 200], [CX + 25, 167]], g.accent, 2.2);
      else if (g.neck !== 'sweet') line(ctx, [[CX - 25, 167], [CX, 214], [CX + 25, 167]], g.accent, 2.2, false);
      if (g.belt) {
        ctx.beginPath();
        ctx.moveTo(CX - 40, 272); ctx.quadraticCurveTo(CX, 282, CX + 40, 272); ctx.lineTo(CX + 41, 282); ctx.quadraticCurveTo(CX, 292, CX - 41, 282); ctx.closePath();
        fs(ctx, g.belt, 1.8);
        dot(ctx, CX, 284, 3.2, GOLD, INK, 0.8);
      }
    },
  };
}

export const DRESSES: Partial<Record<ClothId, DressFx>> = {
  'dr-flowy-floral': {
    front(ctx, st) {
      const col = '#FFE7E9';
      const sw = st * 3;
      const path = (c: C) => {
        c.beginPath();
        c.moveTo(CX - 40, 171);
        c.lineTo(CX - 25, 167);
        c.lineTo(CX, 214);
        c.lineTo(CX + 25, 167);
        c.lineTo(CX + 40, 171);
        c.bezierCurveTo(CX + 44, 190, CX + 50, 205, CX + 46, 222);
        c.bezierCurveTo(CX + 42, 246, CX + 44, 262, CX + 40, 276);
        c.bezierCurveTo(CX + 52, 330, CX + 70 + sw, 420, CX + 80 + sw, 484);
        wave(c, CX - 80, CX + 80 + sw, 484, 5, 6);
        c.bezierCurveTo(CX - 70, 420, CX - 52, 330, CX - 40, 276);
        c.bezierCurveTo(CX - 44, 262, CX - 42, 246, CX - 46, 222);
        c.bezierCurveTo(CX - 50, 205, CX - 44, 190, CX - 40, 171);
        c.closePath();
      };
      path(ctx);
      fs(ctx, lg(ctx, CX - 80, 170, CX + 80, 490, '#FFF3F1', col, '#F2C4CB'), 2.4);
      clipped(ctx, path, () => {
        const fl: [number, number, number, string][] = [
          [CX - 20, 244, 7, '#F5A0BB'], [CX + 22, 252, 6, '#FFC0A3'], [CX - 46, 310, 8, '#F5A0BB'], [CX + 6, 322, 9, '#B9A5E8'], [CX + 48, 318, 7, '#F5A0BB'],
          [CX - 66, 400, 9, '#FFC0A3'], [CX - 22, 396, 8, '#F5A0BB'], [CX + 26, 410, 9, '#F5A0BB'], [CX + 66, 392, 8, '#B9A5E8'],
          [CX - 50, 460, 8, '#F5A0BB'], [CX, 462, 9, '#FFC0A3'], [CX + 52, 466, 8, '#F5A0BB'], [CX - 6, 362, 7, '#FFC0A3'], [CX + 36, 360, 5, '#F5A0BB'],
        ];
        for (const [x, y, r, p] of fl) {
          flower(ctx, x, y, r, p, '#F3C86B');
          dot(ctx, x + r * 1.5, y + r * 0.8, r * 0.28, '#7FC48A');
        }
        sheen(ctx, CX - 70, 290, CX + 70, 480, 0.12);
      });
      // liseré en V + ceinture fine
      line(ctx, [[CX - 25, 167], [CX, 214], [CX + 25, 167]], '#F5A0BB', 2.4, false);
      ctx.beginPath();
      ctx.moveTo(CX - 40, 272); ctx.quadraticCurveTo(CX, 282, CX + 40, 272); ctx.lineTo(CX + 41, 281); ctx.quadraticCurveTo(CX, 291, CX - 41, 281); ctx.closePath();
      fs(ctx, '#F5A0BB', 1.8);
    },
  },
  'dr-romantic-pink': {
    sleeve: { len: 0.3, wid: 40, c0: '#FBC6D6', c1: '#EE94B2', hem: true, puff: '#FAB4CA' },
    front(ctx, st) {
      const col = '#F5A9C0';
      const sw = st * 3;
      const sk = (c: C) => {
        c.beginPath();
        c.moveTo(CX + 42, 276);
        c.bezierCurveTo(CX + 60, 330, CX + 78 + sw, 410, CX + 88 + sw, 488);
        wave(c, CX - 88, CX + 88 + sw, 488, 4, 8);
        c.bezierCurveTo(CX - 78, 410, CX - 60, 330, CX - 42, 276);
        c.closePath();
      };
      // dessous de jupe en tulle (plus clair)
      ctx.save();
      ctx.translate(0, 0);
      ctx.beginPath();
      ctx.moveTo(CX + 46, 300);
      ctx.bezierCurveTo(CX + 70, 360, CX + 88 + sw, 430, CX + 98 + sw, 498);
      wave(ctx, CX - 98, CX + 98 + sw, 498, 4, 9);
      ctx.bezierCurveTo(CX - 88, 430, CX - 70, 360, CX - 46, 300);
      ctx.closePath();
      fs(ctx, lg(ctx, 0, 300, 0, 500, '#FFE3EC', '#F8C2D4'), 2);
      ctx.restore();
      sk(ctx);
      fs(ctx, lg(ctx, CX - 80, 280, CX + 80, 490, shade(col, 0.16), col, shade(col, -0.16)), 2.4);
      clipped(ctx, sk, () => {
        for (let i = -6; i <= 6; i++) line(ctx, [[CX + i * 3.6, 282], [CX + i * 14, 492]], 'rgba(150,40,80,0.18)', 1.2, false);
        sheen(ctx, CX - 70, 290, CX + 70, 480, 0.2);
      });
      // corsage cœur
      const bod = (c: C) => torso(c, { hem: 284, hemW: 44, waist: 43, shW: 52, neck: 'sweet', nd: 26, wy: 262 });
      bod(ctx);
      fs(ctx, lg(ctx, 60, 170, 180, 284, shade(col, 0.2), col, shade(col, -0.1)), 2.4);
      clipped(ctx, bod, () => {
        sheen(ctx, 80, 180, 150, 284, 0.25);
        for (let i = 0; i < 4; i++) heartPath(ctx, CX - 24 + i * 16, 244 + (i % 2) * 14, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();
      });
      // liseré dentelle à l'encolure
      ctx.beginPath();
      ctx.moveTo(CX - 22, 167); ctx.quadraticCurveTo(CX - 24, 192, CX - 8, 190); ctx.quadraticCurveTo(CX, 198, CX + 8, 190); ctx.quadraticCurveTo(CX + 24, 192, CX + 22, 167);
      ctx.lineWidth = 3.4; ctx.strokeStyle = '#FFF4E8'; ctx.stroke();
      // ceinture + noeud
      ctx.beginPath();
      ctx.moveTo(CX - 43, 268); ctx.quadraticCurveTo(CX, 278, CX + 43, 268); ctx.lineTo(CX + 44, 280); ctx.quadraticCurveTo(CX, 290, CX - 44, 280); ctx.closePath();
      fs(ctx, '#E8558F', 1.9);
      bow(ctx, CX + 20, 278, 0.7, '#FF75A8', 0.2);
    },
  },
  'dr-royal-gown': {
    sleeve: { len: 0.26, wid: 42, c0: '#8668CC', c1: '#5B409B', hem: true, puff: '#7A5CC0', trim: '#F3C86B' },
    front(ctx, st) {
      const col = '#6E4FB0';
      const sw = st * 3;
      const hemY = 580;
      const sk = (c: C) => {
        c.beginPath();
        c.moveTo(CX - 40, 272);
        c.bezierCurveTo(CX - 52, 360, CX - 90, 470, CX - 108, hemY);
        c.quadraticCurveTo(CX - 54, hemY + 12, CX, hemY + 6);
        c.quadraticCurveTo(CX + 54 + sw, hemY + 12, CX + 108 + sw, hemY);
        c.bezierCurveTo(CX + 90, 470, CX + 52, 360, CX + 40, 272);
        c.closePath();
      };
      sk(ctx);
      fs(ctx, lg(ctx, CX - 100, 280, CX + 100, hemY, '#8668CC', col, '#43307F'), 2.6);
      clipped(ctx, sk, () => {
        // jupon doré en panneau central
        ctx.beginPath();
        ctx.moveTo(CX - 14, 282);
        ctx.bezierCurveTo(CX - 24, 380, CX - 56, 480, CX - 70, hemY + 10);
        ctx.lineTo(CX + 70, hemY + 10);
        ctx.bezierCurveTo(CX + 56, 480, CX + 24, 380, CX + 14, 282);
        ctx.closePath();
        ctx.fillStyle = lg(ctx, 0, 280, 0, hemY, '#FFF1C8', '#F5D88B');
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = '#C99A33';
        ctx.stroke();
        // motifs brodés (losanges et cœurs)
        for (let r = 0; r < 6; r++) {
          for (let k = -1; k <= 1; k++) {
            const y = 320 + r * 44;
            const x = CX + k * (14 + r * 9);
            if ((r + k) % 2 === 0) { heartPath(ctx, x, y, 7 + r * 0.8); ctx.fillStyle = '#E5A5B8'; ctx.fill(); }
            else { starPath(ctx, x, y, 6 + r * 0.6, 2.6 + r * 0.3, 4); ctx.fillStyle = '#D9A238'; ctx.fill(); }
          }
        }
        sheen(ctx, CX - 100, 300, CX + 100, hemY, 0.14);
        // plis du velours
        for (const s of [-1, 1]) {
          line(ctx, [[CX + s * 40, 330], [CX + s * 66, 450], [CX + s * 82, hemY]], 'rgba(20,5,60,0.32)', 2);
          line(ctx, [[CX + s * 28, 330], [CX + s * 44, 450], [CX + s * 52, hemY]], 'rgba(20,5,60,0.2)', 1.6);
        }
      });
      // galon doré au bas
      ctx.beginPath();
      ctx.moveTo(CX - 108, hemY - 3);
      ctx.quadraticCurveTo(CX - 54, hemY + 9, CX, hemY + 3);
      ctx.quadraticCurveTo(CX + 54 + sw, hemY + 9, CX + 108 + sw, hemY - 3);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#D9A238';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FFE9A6';
      ctx.stroke();
      // corsage à épaules dénudées
      const bod = (c: C) => {
        c.beginPath();
        c.moveTo(CX - 52, 200);
        c.bezierCurveTo(CX - 40, 186, CX - 20, 196, CX - 8, 204);
        c.quadraticCurveTo(CX, 212, CX + 8, 204);
        c.bezierCurveTo(CX + 20, 196, CX + 40, 186, CX + 52, 200);
        c.bezierCurveTo(CX + 52, 230, CX + 44, 252, CX + 41, 276);
        c.quadraticCurveTo(CX, 288, CX - 41, 276);
        c.bezierCurveTo(CX - 44, 252, CX - 52, 230, CX - 52, 200);
        c.closePath();
      };
      bod(ctx);
      fs(ctx, lg(ctx, CX - 50, 190, CX + 50, 280, '#8668CC', col, '#4E3790'), 2.4);
      clipped(ctx, bod, () => {
        // lacets du corset
        for (let y = 216; y < 276; y += 11) line(ctx, [[CX - 12, y], [CX + 12, y + 6]], '#F3C86B', 1.5, false);
        for (let y = 216; y < 276; y += 11) line(ctx, [[CX + 12, y], [CX - 12, y + 6]], '#F3C86B', 1.5, false);
        sheen(ctx, CX - 40, 196, CX + 40, 280, 0.2);
        line(ctx, [[CX - 52, 205], [CX - 30, 214]], '#F3C86B', 1, false);
      });
      // bordure dorée de l'encolure
      ctx.beginPath();
      ctx.moveTo(CX - 52, 200); ctx.bezierCurveTo(CX - 40, 186, CX - 20, 196, CX - 8, 204); ctx.quadraticCurveTo(CX, 212, CX + 8, 204); ctx.bezierCurveTo(CX + 20, 196, CX + 40, 186, CX + 52, 200);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#D9A238';
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#FFE9A6';
      ctx.stroke();
      // ceinture dorée + joyau
      ctx.beginPath();
      ctx.moveTo(CX - 41, 268); ctx.quadraticCurveTo(CX, 280, CX + 41, 268); ctx.lineTo(CX + 42, 280); ctx.quadraticCurveTo(CX, 292, CX - 42, 280); ctx.closePath();
      fs(ctx, lg(ctx, 0, 268, 0, 292, '#FFE9A6', GOLD, '#D9A238'), 1.9);
      heartPath(ctx, CX, 280, 11);
      fs(ctx, lg(ctx, CX - 8, 270, CX + 8, 290, '#FF9CC0', '#E8558F'), 1.6);
      gloss(ctx, CX - 3, 276, 2.4, 1.4, 0.8, -0.6);
    },
  },
  'dr-stage-sequin': {
    front(ctx, st) {
      const col = '#C9308A';
      const sw = st * 2;
      const path = (c: C) => {
        c.beginPath();
        c.moveTo(CX - 46, 214);
        c.bezierCurveTo(CX - 24, 204, CX - 10, 212, CX, 216);
        c.bezierCurveTo(CX + 10, 212, CX + 24, 204, CX + 46, 214);
        c.bezierCurveTo(CX + 50, 240, CX + 44, 258, CX + 42, 276);
        c.bezierCurveTo(CX + 56, 320, CX + 64, 350, CX + 66 + sw, 412);
        c.quadraticCurveTo(CX + 30, 440, CX - 14, 396);
        c.quadraticCurveTo(CX - 44, 372, CX - 68, 384);
        c.bezierCurveTo(CX - 62, 350, CX - 56, 320, CX - 42, 276);
        c.bezierCurveTo(CX - 44, 258, CX - 50, 240, CX - 46, 214);
        c.closePath();
      };
      path(ctx);
      fs(ctx, lg(ctx, CX - 60, 210, CX + 60, 430, '#E85BB0', col, '#7A1B58'), 2.4);
      clipped(ctx, path, () => {
        const tones = ['#FF9AD3', '#FFD36B', '#FFFFFF', '#8A1E66', '#B52A82'];
        for (let t = 0; t < tones.length; t++) {
          ctx.beginPath();
          for (let y = 206; y < 446; y += 7) {
            for (let x = CX - 76; x < CX + 76; x += 7) {
              const hsh = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
              const rr = hsh - Math.floor(hsh);
              if (Math.floor(rr * tones.length) === t) ctx.rect(x + (y / 7 % 2 ? 3.5 : 0), y, 3.4, 3.4);
            }
          }
          ctx.fillStyle = tones[t];
          ctx.globalAlpha = t === 2 ? 0.8 : t === 1 ? 0.9 : 0.75;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        sheen(ctx, CX - 60, 214, CX + 60, 430, 0.14);
        for (const [x, y, r] of [[CX - 24, 250, 7], [CX + 22, 296, 9], [CX - 30, 340, 6], [CX + 30, 384, 7]] as const) {
          ctx.save();
          ctx.translate(x, y);
          starPath(ctx, 0, 0, r, r * 0.2, 4);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.restore();
        }
      });
      // bord de bustier + noeud strass
      line(ctx, [[CX - 46, 214], [CX - 24, 205], [CX - 10, 212], [CX, 216], [CX + 10, 212], [CX + 24, 205], [CX + 46, 214]], '#FFE9A6', 2.6);
      ctx.beginPath();
      ctx.moveTo(CX - 42, 272); ctx.quadraticCurveTo(CX, 282, CX + 42, 272);
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = '#FFE9A6';
      ctx.stroke();
    },
  },
  'dr-redcarpet': {
    sleeve: undefined,
    back(ctx, st) {
      const sw = st * 3;
      const hemY = 586;
      ctx.beginPath();
      ctx.moveTo(CX - 6, 380);
      ctx.bezierCurveTo(CX + 20, 450, CX + 80, 520, CX + 100 + sw, hemY);
      ctx.quadraticCurveTo(CX + 40, hemY + 12, CX - 20, hemY - 4);
      ctx.closePath();
      fs(ctx, lg(ctx, 0, 380, 0, hemY, '#8E1426', '#5E0A18'), 2.4);
    },
    front(ctx, st) {
      const col = '#C8283C';
      const sw = st * 3;
      const hemY = 586;
      const path = (c: C) => {
        c.beginPath();
        // bretelle sur l'épaule gauche (côté image gauche), épaule droite nue
        c.moveTo(CX - 40, 168);
        c.lineTo(CX - 22, 166);
        c.lineTo(CX + 2, 222);
        c.bezierCurveTo(CX + 22, 214, CX + 40, 206, CX + 50, 200);
        c.bezierCurveTo(CX + 52, 236, CX + 44, 256, CX + 42, 280);
        c.bezierCurveTo(CX + 56, 330, CX + 54, 420, CX + 30, 440);
        // fente côté image droite
        c.lineTo(CX + 38, 520);
        c.lineTo(CX + 56 + sw, hemY);
        c.quadraticCurveTo(CX - 20, hemY + 14, CX - 70, hemY - 2);
        c.bezierCurveTo(CX - 76, 540, CX - 62, 500, CX - 56, 450);
        c.bezierCurveTo(CX - 54, 380, CX - 50, 320, CX - 41, 280);
        c.bezierCurveTo(CX - 44, 258, CX - 50, 240, CX - 50, 218);
        c.bezierCurveTo(CX - 48, 200, CX - 44, 186, CX - 40, 168);
        c.closePath();
      };
      path(ctx);
      fs(ctx, lg(ctx, CX - 60, 170, CX + 60, hemY, '#E5485B', col, '#8E1426'), 2.5);
      clipped(ctx, path, () => {
        sheen(ctx, CX - 54, 200, CX + 50, hemY, 0.3);
        // drapé à la taille
        for (let i = 0; i < 4; i++) line(ctx, [[CX - 44, 262 + i * 9], [CX, 270 + i * 9 + 4], [CX + 46, 258 + i * 9]], 'rgba(90,5,20,0.3)', 1.6);
        line(ctx, [[CX - 40, 330], [CX - 46, 460], [CX - 66, 580]], 'rgba(90,5,20,0.28)', 2);
        line(ctx, [[CX - 20, 340], [CX - 24, 470], [CX - 36, 580]], 'rgba(90,5,20,0.2)', 1.6);
      });
      // broche dorée à la bretelle
      dot(ctx, CX - 31, 176, 5, GOLD, INK, 1.2);
      dot(ctx, CX - 32.4, 174.6, 1.4, '#FFF4D0');
      line(ctx, [[CX - 22, 166], [CX + 2, 222], [CX + 50, 200]], '#FFB3BC', 1.4);
    },
  },
};

/** Robes portées AVEC des collants (jambes noires transparentes). */
const TIGHTS_DRESSES = new Set<string>(['dr-black-mini-ls']);
Object.assign(DRESSES, {
  // robe noire courte à manches longues évasées, jupe à volants ; se porte avec collants noirs, bottes, sac épaule et grosses créoles
  'dr-black-mini-ls': genDress({ col: '#2D2C37', col2: '#15141C', accent: '#4A4859', hem: 436, flare: 38, pat: 'plain', neck: 'round', scallop: 4, sleeve: { len: 1, wid: 31, c0: '#2D2C37', c1: '#15141C', cuff: '#3A3947' } }),
  // robe rose pastel satinée, coupe fourreau habillée, petites manches fluides
  'dr-pink-satin': genDress({ col: '#F8CBD9', col2: '#E69DB6', accent: '#FFFFFF', hem: 522, flare: 20, pat: 'plain', neck: 'round', belt: '#F2AFC4', scallop: 3, sleeve: { len: 0.3, wid: 46, c0: '#FAD6E1', c1: '#E69DB6', hem: true } }),
  'dr-sundress-yellow': genDress({ col: '#FFE27A', col2: '#F2B93D', accent: '#FFFFFF', hem: 440, flare: 34, pat: 'dots', neck: 'round', belt: '#FFFFFF' }),
  'dr-little-black': genDress({ col: '#3B3A4D', col2: '#1F1E2B', accent: '#F3C86B', hem: 410, flare: 14, pat: 'plain', neck: 'round', belt: '#F3C86B' }),
  'dr-gingham-red': genDress({ col: '#E2506A', col2: '#B83250', accent: '#FFFFFF', hem: 455, flare: 42, pat: 'gingham', neck: 'sweet', belt: '#FFF4E8', sleeve: { len: 0.24, wid: 36, c0: '#EE6F86', c1: '#C03A58', hem: true, puff: '#E85F7B' } }),
  'dr-denim': genDress({ col: '#6F93C9', col2: '#47689F', accent: '#F2C06B', hem: 430, flare: 22, pat: 'buttons', neck: 'v', belt: '#8A5A3A' }),
  'dr-lavender-tulle': genDress({ col: '#D9C9F7', col2: '#A98CE0', accent: '#FFFFFF', hem: 535, flare: 54, pat: 'hearts', neck: 'sweet', belt: '#F5A0BB', sleeve: { len: 0.28, wid: 40, c0: '#E4D7FA', c1: '#B79BE8', hem: true, puff: '#D3BFF5' } }),
  'dr-white-gown': genDress({ col: '#FFFBF5', col2: '#EADDCF', accent: '#E6C9B8', hem: 582, flare: 58, pat: 'lace', neck: 'sweet', belt: '#F5D6E0', scallop: 5 }),
  'dr-emerald-evening': genDress({ col: '#2E9C7E', col2: '#125E4A', accent: '#F3C86B', hem: 575, flare: 30, pat: 'plain', neck: 'v', belt: '#F3C86B' }),
  'dr-striped-navy': genDress({ col: '#FFFFFF', col2: '#E7E9F2', accent: '#3C4F8A', hem: 425, flare: 26, pat: 'stripes', neck: 'round', belt: '#E8558F' }),
} as Partial<Record<ClothId, DressFx>>);

// ---------------------------------------------------------------- vestes

export type JacketFn = (ctx: C) => void;

export function lapels(ctx: C, col: string, ink = INK): void {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 20, 160);
    ctx.lineTo(CX + s * 46, 182);
    ctx.lineTo(CX + s * 32, 196);
    ctx.lineTo(CX + s * 24, 232);
    ctx.lineTo(CX + s * 5, 272);
    ctx.lineTo(CX + s * 2, 190);
    ctx.closePath();
    fs(ctx, lg(ctx, CX - 50, 160, CX + 50, 270, shade(col, 0.1), shade(col, -0.08)), 2, ink);
  }
}

export const JACKETS: Partial<Record<ClothId, { draw: JacketFn; sleeve: SleeveSpec }>> = {
  'jk-blazer-cream': {
    sleeve: { len: 1, wid: 31, c0: '#FFF6E6', c1: '#E6D4B6', cuff: '#EFE0C6' },
    draw(ctx) {
      const col = '#F4E6D0';
      const o: TorsoO = { hem: 338, hemW: 58, waist: 49, shW: 60, neck: 'v', nd: 106, wy: 270 };
      torso(ctx, o);
      fs(ctx, lg(ctx, 60, 170, 180, 338, '#FFF8EA', col, '#DCC7A6'), 2.5);
      clipped(ctx, (c) => torso(c, o), () => {
        sheen(ctx, 66, 180, 174, 338, 0.3);
        line(ctx, [[CX - 45, 240], [CX - 49, 300], [CX - 52, 336]], 'rgba(120,90,50,0.2)', 1.6);
        line(ctx, [[CX + 45, 240], [CX + 49, 300], [CX + 52, 336]], 'rgba(120,90,50,0.2)', 1.6);
      });
      lapels(ctx, col);
      // poches à rabat
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(CX + s * 22, 300); ctx.lineTo(CX + s * 50, 298); ctx.lineTo(CX + s * 51, 310); ctx.lineTo(CX + s * 23, 312); ctx.closePath();
        fs(ctx, shade(col, -0.06), 1.6);
      }
      for (const y of [270, 296]) dot(ctx, CX + 1, y, 3.3, GOLD, INK, 1.2);
      // pochette
      ctx.beginPath(); ctx.moveTo(CX - 44, 244); ctx.lineTo(CX - 28, 243); ctx.lineTo(CX - 29, 251); ctx.lineTo(CX - 44, 252); ctx.closePath(); fs(ctx, '#F5B5C8', 1.3);
    },
  },
  'jk-leather-black': {
    sleeve: { len: 1, wid: 32, c0: '#4A3A40', c1: '#1C1519', cuff: '#2A2025' },
    draw(ctx) {
      const col = '#2B2227';
      const hem = 322;
      const o: TorsoO = { hem, hemW: 56, waist: 50, shW: 60, neck: 'v', nd: 60, wy: 262 };
      torso(ctx, o);
      fs(ctx, lg(ctx, 60, 170, 180, hem, '#54434B', col, '#120D10'), 2.5);
      clipped(ctx, (c) => torso(c, o), () => {
        // reflets de cuir
        line(ctx, [[CX - 50, 190], [CX - 56, 250], [CX - 50, 310]], 'rgba(255,255,255,0.2)', 5);
        line(ctx, [[CX + 46, 200], [CX + 52, 250], [CX + 48, 306]], 'rgba(255,255,255,0.1)', 4);
        // bande de ceinture
        ctx.fillStyle = '#1B1418';
        ctx.fillRect(CX - 70, hem - 16, 140, 20);
      });
      // fermeture éclair en biais
      line(ctx, [[CX - 4, 205], [CX - 10, 250], [CX - 14, hem]], '#C8CDD6', 2.6, false);
      ctx.setLineDash([2, 2]);
      line(ctx, [[CX - 4, 205], [CX - 10, 250], [CX - 14, hem]], '#555', 1, false);
      ctx.setLineDash([]);
      dot(ctx, CX - 13, hem - 4, 2.2, '#C8CDD6', INK, 0.8);
      // revers asymétriques
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(CX + s * 20, 160);
        ctx.lineTo(CX + s * 50, 178);
        ctx.lineTo(CX + s * 36, 214);
        ctx.lineTo(CX + s * 16, 246);
        ctx.lineTo(CX + s * 3, 200);
        ctx.closePath();
        fs(ctx, lg(ctx, CX - 40, 160, CX + 40, 240, '#4C3C43', '#1D1619'), 2);
        dot(ctx, CX + s * 32, 190, 1.7, '#C8CDD6');
        dot(ctx, CX + s * 26, 202, 1.7, '#C8CDD6');
      }
      // poche zippée + clous
      line(ctx, [[CX + 24, 280], [CX + 46, 288]], '#C8CDD6', 2, false);
      line(ctx, [[CX - 44, 290], [CX - 22, 298]], '#C8CDD6', 2, false);
      for (const x of [-44, -40]) dot(ctx, CX + x, 168 + Math.abs(x) * 0.2 + 28, 1, '#C8CDD6');
    },
  },
  'jk-denim': {
    sleeve: { len: 0.74, wid: 33, c0: '#8EB1E0', c1: '#5F86BD', cuff: '#4F74AA' },
    draw(ctx) {
      const col = '#6F95C7';
      const hem = 316;
      const o: TorsoO = { hem, hemW: 58, waist: 54, shW: 60, neck: 'v', nd: 52, wy: 262 };
      torso(ctx, o);
      fs(ctx, lg(ctx, 60, 170, 180, hem, '#9DBCE6', col, '#4E74A8'), 2.5);
      clipped(ctx, (c) => torso(c, o), () => {
        line(ctx, [[CX - 40, 190], [CX - 46, 250], [CX - 42, 306]], 'rgba(255,255,255,0.18)', 6);
        ctx.fillStyle = '#4B71A6';
        ctx.fillRect(CX - 70, hem - 14, 140, 20);
        line(ctx, [[CX - 70, hem - 14], [CX + 70, hem - 14]], '#F2C06B', 1.2, false);
        line(ctx, [[CX, 200], [CX, hem]], '#3F5F95', 1.6, false);
      });
      // col
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(CX + s * 20, 160); ctx.lineTo(CX + s * 44, 176); ctx.lineTo(CX + s * 30, 202); ctx.lineTo(CX + s * 4, 190); ctx.closePath();
        fs(ctx, '#7FA3D4', 1.9);
        line(ctx, [[CX + s * 22, 166], [CX + s * 40, 178], [CX + s * 28, 198]], '#F2C06B', 1, false);
      }
      for (const y of [232, 262, 292]) dot(ctx, CX, y, 3, '#E6C98A', INK, 1.1);
      // poches de poitrine
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(CX + s * 14, 222); ctx.lineTo(CX + s * 38, 222); ctx.lineTo(CX + s * 38, 246); ctx.lineTo(CX + s * 26, 252); ctx.lineTo(CX + s * 14, 246); ctx.closePath();
        fs(ctx, '#6489BE', 1.5);
        line(ctx, [[CX + s * 14, 228], [CX + s * 38, 228]], '#F2C06B', 1, false);
        dot(ctx, CX + s * 26, 234, 2, '#E6C98A', INK, 0.8);
      }
    },
  },
};

// ---------------------------------------------------------------- chaussures

export const SHOE_Y = 592;

/** Éléments ajoutés par les modules avatarClothes.ts / avatarStyle.ts (enregistrés en bas de fichier). */
export const EXTRA = {
  /** chaussures : dessine UN pied (cx = centre du pied, s = ±1 côté) */
  shoe: {} as Record<string, (ctx: C, cx: number, s: number) => void>,
  /** sacs : repère avatar 240 × 600 */
  bag: {} as Record<string, (ctx: C) => void>,
  /** coiffures, dans le repère de la tête (déjà translaté/mis à l'échelle) */
  hairBack: {} as Record<string, (ctx: C, sway: number, crownOn: boolean) => void>,
  hairFront: {} as Record<string, (ctx: C, sway: number) => void>,
  /** bijoux de cou, repère avatar 240 × 600, dessinés avant la tête */
  neck: {} as Record<string, (ctx: C, shine: number) => void>,
  /** bracelets : dessinés sur chaque poignet (arms = géométrie des deux bras, angle = direction de la main), `shine` ∈ [0,1] = reflet animé */
  wrist: {} as Record<string, (ctx: C, arms: Arm[], angle: (a: Arm) => number, shine: number) => void>,
  /** accessoires de visage (boucles, lunettes, foulards…), repère avatar 240 × 600, après les cheveux de devant */
  face: {} as Record<string, (ctx: C) => void>,
};

function legsSkin(ctx: C, st: number, tights = false): void {
  for (const s of [-1, 1] as const) {
    const off = st * s * 12;
    ctx.beginPath();
    ctx.moveTo(CX + s * 8, 360);
    ctx.lineTo(CX + s * 52, 360);
    ctx.bezierCurveTo(CX + s * 54, 430, CX + s * 46, 500, CX + s * 44 + off, 572);
    ctx.lineTo(CX + s * 14 + off, 572);
    ctx.bezierCurveTo(CX + s * 10, 500, CX + s * 8, 430, CX + s * 8, 360);
    ctx.closePath();
    if (tights) {
      // collants noirs transparents : la peau se devine, reflet doux sur le devant de la jambe
      fs(ctx, lg(ctx, CX + s * 8, 0, CX + s * 54, 0, '#3A3844', '#1B1A22', '#101016'), 2);
      ctx.save(); ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.moveTo(CX + s * 22, 380); ctx.quadraticCurveTo(CX + s * 26, 470, CX + s * 24, 560); ctx.lineWidth = 6; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(); ctx.restore();
      continue;
    }
    fs(ctx, lg(ctx, CX + s * 8, 0, CX + s * 54, 0, skinL(), skin(), skinD()), 2);
    // genou
    ctx.beginPath();
    ctx.ellipse(CX + s * 32 + off * 0.3, 462, 9, 6, 0, 0, Math.PI);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(140,80,55,0.35)';
    ctx.stroke();
  }
}

function shoesDraw(ctx: C, id: ClothId | null, st: number, only?: -1 | 1): void {
  for (const s of [-1, 1] as const) {
    if (only !== undefined && only !== s) continue;
    const off = st * s * 12;
    const cx = CX + s * 33 + off;
    switch (id) {
      case 'sh-sneakers-white': P.sneaker(ctx, cx, SHOE_Y, s, '#FBF8F6'); break;
      case 'sh-heels': pump(ctx, cx, s); break;
      case 'sh-boots': boot(ctx, cx, s); break;
      case 'sh-flats-red': flat(ctx, cx, s); break;
      default: { const f = id ? EXTRA.shoe[id] : undefined; if (f) f(ctx, cx, s); else foot(ctx, cx, s); break; }
    }
  }
}

/** Pied nu (aucune chaussure équipée). */
export function foot(ctx: C, cx: number, s: number): void {
  ctx.beginPath();
  ctx.ellipse(cx + s * 3, SHOE_Y - 8, 20, 11, 0, 0, Math.PI * 2);
  fs(ctx, lg(ctx, 0, SHOE_Y - 18, 0, SHOE_Y, skinL(), skin()), 2);
}

export function pump(ctx: C, cx: number, s: number): void {
  ctx.save();
  ctx.translate(cx, SHOE_Y);
  ctx.scale(s, 1);
  // talon aiguille
  ctx.beginPath();
  ctx.moveTo(-16, -22); ctx.lineTo(-10, -22); ctx.lineTo(-12, 1); ctx.lineTo(-15, 1); ctx.closePath();
  fs(ctx, '#2A1E22', 1.6);
  // pied (peau) qui sort de l'escarpin
  ctx.beginPath();
  ctx.moveTo(-14, -42);
  ctx.lineTo(14, -42);
  ctx.lineTo(14, -30);
  ctx.lineTo(-14, -30);
  ctx.closePath();
  ctx.fillStyle = skin();
  ctx.fill();
  // escarpin vernis pointu
  ctx.beginPath();
  ctx.moveTo(-17, -32);
  ctx.bezierCurveTo(-18, -20, -18, -10, -14, -6);
  ctx.bezierCurveTo(-4, -2, 10, 0, 26, 1);
  ctx.bezierCurveTo(28, -6, 20, -14, 15, -20);
  ctx.bezierCurveTo(14, -26, 14, -30, 14, -33);
  ctx.quadraticCurveTo(0, -24, -17, -32);
  ctx.closePath();
  fs(ctx, lg(ctx, -16, -34, 20, 2, '#5A444C', '#241A1E'), 2.2);
  gloss(ctx, -6, -14, 5, 1.6, 0.6, -0.4);
  ctx.beginPath();
  ctx.moveTo(-17, -32); ctx.quadraticCurveTo(0, -24, 14, -33);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.stroke();
  ctx.restore();
}

export function boot(ctx: C, cx: number, s: number): void {
  ctx.save();
  ctx.translate(cx, SHOE_Y);
  ctx.scale(s, 1);
  ctx.beginPath();
  ctx.moveTo(-17, -78);
  ctx.lineTo(17, -78);
  ctx.bezierCurveTo(18, -60, 17, -46, 20, -34);
  ctx.bezierCurveTo(30, -26, 34, -14, 28, -5);
  ctx.lineTo(-20, -5);
  ctx.bezierCurveTo(-21, -30, -17, -50, -17, -78);
  ctx.closePath();
  fs(ctx, lg(ctx, -20, -80, 28, 0, '#A66B4B', '#7A4B35', '#4F2F20'), 2.3);
  // revers et zip
  ctx.beginPath();
  ctx.moveTo(-17, -72); ctx.lineTo(17, -72); ctx.lineTo(17, -64); ctx.lineTo(-17, -64); ctx.closePath();
  fs(ctx, '#8A5A40', 1.6);
  line(ctx, [[-12, -62], [-13, -30]], '#C8CDD6', 1.6, false);
  dot(ctx, -12.5, -58, 1.8, '#C8CDD6', INK, 0.7);
  gloss(ctx, -8, -46, 2.6, 8, 0.28, 0);
  // semelle + talon
  ctx.beginPath();
  ctx.moveTo(-21, -7); ctx.lineTo(31, -7); ctx.lineTo(31, 2); ctx.lineTo(-21, 2); ctx.closePath();
  fs(ctx, '#2A1E1A', 2);
  ctx.beginPath();
  ctx.moveTo(-20, 2); ctx.lineTo(-8, 2); ctx.lineTo(-8, 4); ctx.lineTo(-20, 4); ctx.closePath();
  ctx.fillStyle = '#2A1E1A';
  ctx.fill();
  ctx.restore();
}

export function flat(ctx: C, cx: number, s: number): void {
  ctx.save();
  ctx.translate(cx, SHOE_Y);
  ctx.scale(s, 1);
  // cheville
  ctx.beginPath();
  ctx.rect(-14, -40, 28, 22);
  ctx.fillStyle = skin();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-17, -17);
  ctx.bezierCurveTo(-18, -4, -14, 0, -2, 1);
  ctx.bezierCurveTo(14, 2, 28, 1, 28, -6);
  ctx.bezierCurveTo(28, -14, 18, -18, 14, -22);
  ctx.quadraticCurveTo(0, -12, -17, -17);
  ctx.closePath();
  fs(ctx, lg(ctx, -16, -22, 26, 2, '#F0626A', '#C0262F'), 2.2);
  gloss(ctx, -6, -6, 5, 1.6, 0.55, -0.4);
  bow(ctx, 5, -11, 0.36, '#FF8A92', 0.2);
  ctx.restore();
}

// ---------------------------------------------------------------- sacs

function bagCross(ctx: C): void {
  ctx.beginPath();
  ctx.moveTo(146, 168);
  ctx.bezierCurveTo(154, 220, 162, 270, 170, 330);
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = '#0C0910';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(145, 168);
  ctx.bezierCurveTo(153, 220, 161, 270, 169, 330);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(166, 330); ctx.lineTo(206, 330);
  ctx.quadraticCurveTo(210, 352, 207, 372);
  ctx.quadraticCurveTo(187, 378, 167, 372);
  ctx.quadraticCurveTo(164, 352, 166, 330);
  ctx.closePath();
  fs(ctx, lg(ctx, 166, 330, 208, 376, '#3A343F', '#100D14'), 2.2);
  line(ctx, [[166, 340], [187, 352], [207, 340]], 'rgba(255,255,255,0.18)', 1.4);
  dot(ctx, 187, 351, 2.6, GOLD, INK, 1);
  roundRect(ctx, 168, 321, 5, 9, 1.5);
  fs(ctx, GOLD, 1.2);
}

function bagGold(ctx: C): void {
  // chaîne dorée sur l'épaule gauche (côté image gauche), petit sac matelassé à la hanche
  ctx.beginPath();
  ctx.moveTo(CX - 44, 176);
  ctx.bezierCurveTo(CX - 62, 230, CX - 64, 290, CX - 56, 326);
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = '#B98826';
  ctx.stroke();
  ctx.setLineDash([4, 2.6]);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#FFE9A6';
  ctx.stroke();
  ctx.setLineDash([]);
  const bx = CX - 100, by = 324, bw = 50, bh = 38;
  roundRect(ctx, bx, by, bw, bh, 7);
  fs(ctx, lg(ctx, bx, by, bx + bw, by + bh, '#FFE9A6', GOLD, '#C8902C'), 2.3);
  clipped(ctx, (c) => roundRect(c, bx, by, bw, bh, 7), () => {
    ctx.strokeStyle = 'rgba(120,80,20,0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = -4; i < 8; i++) { ctx.moveTo(bx + i * 9, by); ctx.lineTo(bx + i * 9 + bh, by + bh); ctx.moveTo(bx + i * 9 + bh, by); ctx.lineTo(bx + i * 9, by + bh); }
    ctx.stroke();
    ctx.beginPath(); ctx.rect(bx, by, bw, 12); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
  });
  heartPath(ctx, bx + bw / 2, by + 17, 9);
  fs(ctx, '#FF75A8', 1.4);
  gloss(ctx, bx + bw / 2 - 2, by + 14, 2, 1.2, 0.8, -0.6);
  dot(ctx, bx + 6, by - 3, 2.4, '#FFE9A6', INK, 1);
  dot(ctx, bx + bw - 6, by - 3, 2.4, '#FFE9A6', INK, 1);
}

// ---------------------------------------------------------------- accessoires

function pearls(ctx: C): void {
  const pts: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const x = CX - 30 + 60 * t;
    const y = 172 + 24 * Math.sin(Math.PI * t) ** 1.3 + 0;
    pts.push([x, y]);
  }
  line(ctx, pts, '#C9B79A', 1.4);
  pts.forEach(([x, y], i) => {
    const r = i === 7 ? 4.8 : 3.7;
    dot(ctx, x, y, r, '#FFFDF6', 'rgba(120,100,80,0.75)', 0.9);
    dot(ctx, x - r * 0.3, y - r * 0.3, r * 0.3, '#FFFFFF');
  });
}

function scarf(ctx: C): void {
  const col = '#E8558F';
  // pans qui tombent à gauche (image) sous le noeud
  ctx.save();
  for (const [dx, len, rot] of [[-30, 62, 0.14], [-18, 48, -0.1]] as const) {
    ctx.save();
    ctx.translate(CX + dx, 186);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(10, len); ctx.lineTo(0, len - 6); ctx.lineTo(-10, len); ctx.closePath();
    fs(ctx, lg(ctx, -8, 0, 8, len, shade(col, 0.2), shade(col, -0.1)), 1.8);
    ctx.restore();
  }
  ctx.restore();
  // tour de cou
  ctx.beginPath();
  ctx.moveTo(CX - 28, 158);
  ctx.bezierCurveTo(CX - 30, 176, CX - 20, 188, CX, 190);
  ctx.bezierCurveTo(CX + 20, 188, CX + 30, 176, CX + 28, 158);
  ctx.lineTo(CX + 24, 156);
  ctx.bezierCurveTo(CX + 22, 168, CX + 14, 176, CX, 177);
  ctx.bezierCurveTo(CX - 14, 176, CX - 22, 168, CX - 24, 156);
  ctx.closePath();
  fs(ctx, lg(ctx, CX - 30, 160, CX + 30, 190, shade(col, 0.22), col, shade(col, -0.18)), 1.9);
  // noeud
  dot(ctx, CX - 24, 182, 7.4, shade(col, 0.1), INK, 1.8);
  clipped(ctx, (c) => { c.beginPath(); c.arc(CX, 183, 31, 0, Math.PI * 2); c.closePath(); }, () => {
    for (const [x, y] of [[CX - 10, 182], [CX + 12, 183], [CX + 20, 178], [CX - 22, 190], [CX + 2, 188]] as const) dot(ctx, x, y, 1.1, '#FFF4E8');
  });
  gloss(ctx, CX - 26, 179, 2.4, 1.4, 0.7, -0.6);
}

function hoops(ctx: C): void {
  ctx.save();
  ctx.translate(P.HEAD_X, P.HEAD_Y);
  ctx.scale(P.HEAD_K, P.HEAD_K);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 71, 46, 13, 0, Math.PI * 2);
    ctx.lineWidth = 6.6;
    ctx.strokeStyle = '#8A6420';
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = lg(ctx, s * 58, 34, s * 84, 60, '#FFF0B8', GOLD, '#D9A238');
    ctx.stroke();
  }
  ctx.restore();
}

function sunglasses(ctx: C): void {
  ctx.save();
  ctx.translate(P.HEAD_X, P.HEAD_Y);
  ctx.scale(P.HEAD_K, P.HEAD_K);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 10, -2);
    ctx.bezierCurveTo(s * 10, -8, s * 40, -10, s * 62, -6);
    ctx.bezierCurveTo(s * 66, 14, s * 56, 34, s * 36, 34);
    ctx.bezierCurveTo(s * 18, 34, s * 8, 18, s * 10, -2);
    ctx.closePath();
    ctx.fillStyle = lg(ctx, s * 10, -8, s * 60, 34, 'rgba(70,40,60,0.58)', 'rgba(20,10,30,0.7)');
    ctx.fill();
    ctx.lineWidth = 4.4;
    ctx.strokeStyle = '#2A1E22';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 20, 4); ctx.lineTo(s * 36, 0);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.quadraticCurveTo(0, -8, 10, 0);
  ctx.lineWidth = 4.4;
  ctx.strokeStyle = '#2A1E22';
  ctx.stroke();
  for (const s of [-1, 1]) line(ctx, [[s * 62, -4], [s * 74, -6]], '#2A1E22', 4.4, false);
  ctx.restore();
}

// ---------------------------------------------------------------- couronnes

function crownGold(ctx: C): void {
  ctx.save();
  ctx.translate(P.HEAD_X, P.HEAD_Y);
  ctx.scale(P.HEAD_K, P.HEAD_K);
  P.crown(ctx, P.CROWN.x, P.CROWN.y, P.CROWN.s, P.CROWN.rot);
  ctx.restore();
}

function crownFlowers(ctx: C): void {
  ctx.save();
  ctx.translate(P.HEAD_X, P.HEAD_Y);
  ctx.scale(P.HEAD_K, P.HEAD_K);
  // arc de feuillage qui épouse le sommet du crâne
  const arc: Pt[] = [[-84, -62], [-68, -88], [-44, -108], [-16, -118], [16, -118], [44, -108], [68, -88], [84, -62]];
  line(ctx, arc, '#3F7A4E', 11);
  line(ctx, arc, '#7FC48A', 7);
  for (let i = 0; i < arc.length; i++) {
    const [x, y] = arc[i];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((i - 3.5) * 0.35);
    ctx.beginPath(); ctx.ellipse(0, -9, 5, 11, 0.4, 0, Math.PI * 2); fs(ctx, '#7FC48A', 1.4);
    ctx.restore();
  }
  const fl: [number, number, number, string][] = [
    [-72, -76, 12, '#F5B5C8'], [-48, -102, 14, '#FF75A8'], [-18, -116, 11, '#FFF4E8'], [14, -118, 15, '#B9A5E8'], [44, -104, 12, '#FFC0A3'], [70, -80, 13, '#FF75A8'],
  ];
  for (const [x, y, r, c] of fl) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, 0, Math.PI * 2);
      fs(ctx, c, 1.6);
    }
    dot(ctx, x, y, r * 0.34, '#F3C86B', INK, 1.2);
  }
  ctx.restore();
}

function crownTiara(ctx: C): void {
  ctx.save();
  ctx.translate(P.HEAD_X, P.HEAD_Y);
  ctx.scale(P.HEAD_K, P.HEAD_K);
  const arc: Pt[] = [[-80, -72], [-62, -96], [-36, -111], [0, -118], [36, -111], [62, -96], [80, -72]];
  line(ctx, arc, '#6A4418', 9);
  line(ctx, arc, lg(ctx, -80, -110, 80, -70, '#FFF4D0', GOLD, '#D9A238') as unknown as string, 6);
  // pointes à perles
  const spikes: [number, number, number, number][] = [[-52, -104, -56, -128], [-26, -114, -28, -140], [0, -118, 0, -152], [26, -114, 28, -140], [52, -104, 56, -128]];
  for (const [x, y, tx, ty] of spikes) {
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 2); ctx.lineTo(tx, ty + 8); ctx.lineTo(x + 6, y + 2); ctx.closePath();
    fs(ctx, lg(ctx, x, ty, x, y, '#FFF4D0', GOLD), 1.6, '#6A4418');
    dot(ctx, tx, ty, ty < -145 ? 8.5 : 6.4, '#FFFDF6', '#6A4418', 1.6);
    dot(ctx, tx - 2, ty - 2, 2, '#FFFFFF');
  }
  heartPath(ctx, 0, -116, 13);
  fs(ctx, lg(ctx, -8, -126, 8, -108, '#FF9CC0', '#E8558F'), 1.6, '#6A4418');
  gloss(ctx, -3, -120, 3, 1.6, 0.8, -0.6);
  for (const x of [-72, -64, -48, 48, 64, 72]) dot(ctx, x, -72 - Math.abs(x) * 0.0 - (80 - Math.abs(x)) * 0.9 + 0, 3, '#FFFDF6', '#6A4418', 1);
  ctx.restore();
}

// ---------------------------------------------------------------- cheveux

/** Calotte lisse avec raie au milieu (identique à celle des portraits). */
export function hairCap(ctx: C): void {
  const cap: Pt[] = [
    [0, -118], [-46, -112], [-82, -84], [-94, -34], [-92, 14], [-82, 20],
    [-72, -2], [-68, -40], [-54, -64], [-32, -78], [-10, -84], [0, -84],
    [10, -84], [32, -78], [54, -64], [68, -40], [72, -2], [82, 20], [92, 14], [94, -34], [82, -84], [46, -112],
  ];
  const g = P.hairGrad(ctx, 400);
  P.smoothPath(ctx, cap);
  ctx.fillStyle = g;
  ctx.fill();
  P.stroke(ctx, 2.4);
  ctx.save();
  P.smoothPath(ctx, cap);
  ctx.clip();
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(30,15,8,0.4)';
    for (const [a, b, c] of [[-84, 46, -100], [-84, 62, -66], [-84, 76, -30]] as const) {
      ctx.beginPath();
      ctx.moveTo(0, a);
      ctx.quadraticCurveTo(s * b * 0.5, c * 0.98 - 4, s * (b + 6), c + 54 - (b === 46 ? 22 : 0));
      ctx.stroke();
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(230,180,130,0.2)';
    ctx.beginPath();
    ctx.moveTo(s * 10, -108);
    ctx.quadraticCurveTo(s * 56, -104, s * 78, -62);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, -116);
  ctx.lineTo(0, -85);
  P.stroke(ctx, 2, skinD());
}

/** Masse de cheveux derrière la tête (dôme) pour les coiffures attachées. */
export function hairDome(ctx: C): void {
  ctx.beginPath();
  ctx.moveTo(-96, 20);
  ctx.bezierCurveTo(-110, -30, -96, -112, 0, -122);
  ctx.bezierCurveTo(96, -112, 110, -30, 96, 20);
  ctx.bezierCurveTo(90, 60, 50, 70, 0, 70);
  ctx.bezierCurveTo(-50, 70, -90, 60, -96, 20);
  ctx.closePath();
  ctx.fillStyle = P.hairGrad(ctx, 400);
  ctx.fill();
  P.stroke(ctx, 2.4);
}

export function ropeStrand(ctx: C, pts: Pt[], w0: number, w1: number): void {
  // mèche épaisse suivant une courbe (queue de cheval)
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
    const [px, py] = pts[Math.max(0, i - 1)];
    const len = Math.hypot(nx - px, ny - py) || 1;
    const t = i / (pts.length - 1);
    const hw = ((w0 + (w1 - w0) * t) / 2) * (t > 0.86 ? Math.max(0.1, 1 - (t - 0.86) * 6) : 1);
    L.push([x - ((ny - py) / len) * hw, y + ((nx - px) / len) * hw]);
    R.push([x + ((ny - py) / len) * hw, y - ((nx - px) / len) * hw]);
  }
  P.smoothPath(ctx, [...L, ...R.reverse()]);
  ctx.fillStyle = P.hairGrad(ctx, 300);
  ctx.fill();
  P.stroke(ctx, 2.2);
}

function hairBackLayer(ctx: C, hair: HairId, sway: number, crownOn: boolean): void {
  ctx.save();
  ctx.translate(P.HEAD_X, P.HEAD_Y);
  ctx.scale(P.HEAD_K, P.HEAD_K);
  const bottom = P.R_HAIR_BOTTOM_FULL;
  if (EXTRA.hairBack[hair]) EXTRA.hairBack[hair](ctx, sway, crownOn);
  else if (hair === 'hair-loose' || hair === 'hair-half') P.radiaHairBack(ctx, sway, bottom);
  else if (hair === 'hair-wavy') {
    P.radiaHairBack(ctx, sway + 8, bottom - 40);
    // boucles supplémentaires qui dépassent
    for (const s of [-1, 1] as const) {
      const lk = P.wavyLock(s, 118, 100, 190, 34, 46, 18, 2.6, s * 1.2, 24 * s, sway);
      P.lockShape(ctx, lk, bottom, 2.2);
      P.lockDetail(ctx, lk, s);
    }
  } else if (hair === 'hair-ponytail') {
    hairDome(ctx);
    // queue de cheval haute, qui retombe côté droit de l'image
    const pts: Pt[] = [[40, -92], [84, -92], [124, -56], [138, 10], [132, 90 + sway], [124, 170 + sway * 1.5], [128, 236 + sway * 2]];
    ropeStrand(ctx, pts, 46, 52);
    // mèches de la queue
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(30,15,8,0.35)';
    for (const o of [-9, 8]) {
      ctx.beginPath();
      P.curveThrough(ctx, pts.slice(1, -1).map(([x, y]) => [x + o, y] as Pt));
      ctx.stroke();
    }
    ctx.restore();
  } else if (hair === 'hair-bun') {
    hairDome(ctx);
    // chignon haut
    const by = crownOn ? -122 : -128;
    ctx.beginPath();
    ctx.arc(0, by, 34, 0, Math.PI * 2);
    ctx.fillStyle = P.hairGrad(ctx, 400);
    ctx.fill();
    P.stroke(ctx, 2.4);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, by, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(30,15,8,0.4)';
    for (let r = 10; r < 34; r += 9) { ctx.beginPath(); ctx.arc(0, by, r, 0.4 + r * 0.05, Math.PI * 1.7 + r * 0.05); ctx.stroke(); }
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(235,170,115,0.3)';
    ctx.beginPath(); ctx.arc(0, by, 23, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function hairFrontLayer(ctx: C, hair: HairId, sway: number): void {
  ctx.save();
  ctx.translate(P.HEAD_X, P.HEAD_Y);
  ctx.scale(P.HEAD_K, P.HEAD_K);
  const bottom = P.R_HAIR_BOTTOM_FULL;
  const w = sway * 0.5;
  if (EXTRA.hairFront[hair]) {
    EXTRA.hairFront[hair](ctx, sway);
  } else if (hair === 'hair-loose' || hair === 'hair-half') {
    P.radiaHairFront(ctx, sway, bottom);
    if (hair === 'hair-half') {
      // petit chignon-noeud sur le dessus, noué par un ruban
      ctx.beginPath();
      ctx.arc(0, -126, 25, 0, Math.PI * 2);
      ctx.fillStyle = P.hairGrad(ctx, 400);
      ctx.fill();
      P.stroke(ctx, 2.4);
      ctx.save(); ctx.beginPath(); ctx.arc(0, -126, 25, 0, Math.PI * 2); ctx.clip();
      ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(30,15,8,0.4)';
      for (let r = 8; r < 25; r += 8) { ctx.beginPath(); ctx.arc(0, -126, r, 0.6, Math.PI * 1.6); ctx.stroke(); }
      ctx.restore();
      bow(ctx, 0, -104, 1.35, '#F5B5C8');
    }
  } else if (hair === 'hair-wavy') {
    const left = P.wavyLock(-1, 86, -50, bottom, 48, 60, 20, 2.4, 0.2, 38, w);
    const right = P.wavyLock(1, 86, -50, bottom * 0.84, 46, 54, 18, 2.2, 1.4, 30, w);
    for (const [lk, s] of [[left, -1], [right, 1]] as const) {
      P.lockShape(ctx, lk, bottom, 2.2);
      P.lockDetail(ctx, lk, s);
    }
    hairCap(ctx);
  } else {
    // attachée : mèches fines devant les oreilles + calotte
    hairCap(ctx);
    for (const s of [-1, 1] as const) {
      const lk = P.wavyLock(s, 84, 6, 70, 12, 8, 3, 1, s, 2, 0);
      P.lockShape(ctx, lk, 300, 1.8);
    }
    if (hair === 'hair-ponytail') {
      // élastique rose à la naissance de la queue
      ctx.save();
      ctx.translate(46, -92);
      ctx.rotate(0.5);
      roundRect(ctx, -9, -17, 18, 34, 7);
      fs(ctx, lg(ctx, -9, 0, 9, 0, '#FFB3CF', '#E8558F'), 2);
      ctx.restore();
    }
    if (hair === 'hair-bun') {
      ctx.beginPath();
      ctx.moveTo(-34, -104); ctx.quadraticCurveTo(0, -92, 34, -104);
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#E8558F';
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- composition

const PANTS_BASE = (ctx: C, st: number): void => {
  // « sous-vêtement » sobre quand aucun bas n'est porté : legging prune
  pants(ctx, st, { topW: 46, outer: 50, inner: 8, hemY: 552, color: '#6B4F68' }, () => { /* uni */ }, () => {
    roundRect(ctx, CX - 46, 288, 92, 11, 4);
    fs(ctx, '#53384F', 1.8);
  });
};

function slotOf(id: string | null): ClothId | null {
  return id && Object.prototype.hasOwnProperty.call(CLOTH_SLOTS, id) ? (id as ClothId) : null;
}

/** Tient compte uniquement des identifiants valides, dans le bon emplacement. */
function pick(id: string | null, slot: string): ClothId | null {
  const c = slotOf(id);
  return c && CLOTH_SLOTS[c] === slot ? c : null;
}

function drawAvatarLocal(ctx: C, look: Look, opts: AvatarOpts): void {
  const st = opts.step ?? 0;
  const sway = st * 4;
  const dress = pick(look.dress, 'dress');
  const top = dress ? null : pick(look.top, 'top');
  const bottom = dress ? null : pick(look.bottom, 'bottom');
  const jacket = pick(look.jacket, 'jacket');
  const shoes = pick(look.shoes, 'shoes');
  const bag = pick(look.bag, 'bag');
  const accs = (Array.isArray(look.acc) ? look.acc : []).map((a) => pick(a, 'acc')).filter((a): a is ClothId => !!a);
  const crown = pick(look.crown, 'crown');
  const hair: HairId = (HAIR_IDS as readonly string[]).includes(look.hair) ? look.hair : 'hair-loose';
  const dfx = dress ? DRESSES[dress] : undefined;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. cheveux arrière, dos de la robe, jambes et chaussures
  if (!P.veilOn()) P.hairVolume(ctx, P.HEAD_X, P.HEAD_Y, () => hairBackLayer(ctx, hair, sway, !!crown)); // un voile remplace les cheveux
  dfx?.back?.(ctx, st);
  legsSkin(ctx, st, !!dress && TIGHTS_DRESSES.has(dress));
  shoesDraw(ctx, shoes, st);

  // 2. bas (avant le haut s'il est rentré) et buste
  chestSkin(ctx);
  const drawBottom = () => {
    if (bottom === 'bot-skirt-pleated') skirtPleated(ctx);
    else if (bottom) BOTTOMS[bottom]?.(ctx, st);
    else if (!dress) PANTS_BASE(ctx, st);
  };
  const tuck = top ? TUCKED.has(top) : false;
  if (!dress) {
    if (!top) camisole(ctx);
    if (tuck || !top) drawBottom();
    else drawBottom();
    if (top) TOPS[top]?.(ctx);
  } else dfx?.front(ctx, st);
  if (tuck && top) {
    // le chemisier rentré : on redessine la ceinture du bas par-dessus l'ourlet
    drawBottomWaist(ctx, bottom, st);
  }

  // 3. bras : peau puis manches (haut ou robe)
  const sleeveSpec: SleeveSpec | undefined = dress ? dfx?.sleeve : top ? SLEEVES[top] : undefined;
  const jk = jacket ? JACKETS[jacket] : undefined;
  const arms = ([-1, 1] as const).map((s) => armGeo(s, opts.arms, st, isNatural(opts)));
  ([-1, 1] as const).forEach((_s, i) => {
    const a = arms[i];
    armSeg(ctx, a, 0.12, 1, 19, skinL(), skinD(), true);
    if (sleeveSpec) drawSleeve(ctx, a, sleeveSpec, !!jk);
  });

  // 4. veste + manches de veste
  if (jk) {
    jk.draw(ctx);
    ([-1, 1] as const).forEach((_s, i) => drawSleeve(ctx, arms[i], jk.sleeve, false));
  }

  // 5. mains
  ([-1, 1] as const).forEach((_s, i) => {
    if (opts.arms === 'heart') return;
    const a = arms[i];
    const ang = endAng(a, 1);
    P.hand(ctx, a.x1 + Math.sin(-ang) * 14, a.y1 + Math.cos(-ang) * 14, skin(), ang, 9.5);
  });
  if (opts.arms === 'heart') {
    heartPath(ctx, 120, 296, 30);
    fs(ctx, PAL.roseVif, 2.2);
    gloss(ctx, 110, 286, 6, 3, 0.6, -0.6);
  }

  // 5b. bracelets (au-dessus des mains)
  for (const a of accs) EXTRA.wrist[a]?.(ctx, arms, (ar) => endAng(ar, 1), opts.shine ?? 0);

  // 6. sac
  if (bag === 'bg-crossbody-black') bagCross(ctx);
  else if (bag === 'bg-mini-gold') bagGold(ctx);
  else if (bag && EXTRA.bag[bag]) EXTRA.bag[bag](ctx);

  // 7. accessoires du cou
  if (accs.includes('ac-scarf')) scarf(ctx);
  if (accs.includes('ac-pearls')) pearls(ctx);
  for (const a of accs) EXTRA.neck[a]?.(ctx, opts.shine ?? 0);

  // 8. tête
  ctx.save();
  ctx.translate(P.HEAD_X, P.HEAD_Y);
  ctx.scale(P.HEAD_K, P.HEAD_K);
  const lipId = accs.find((a) => a.startsWith('lp-'));
  const pickId = (pre: string) => accs.find((a) => a.startsWith(pre));
  const eyeId = pickId('ey-'), moId = pickId('mo-'), elId = pickId('el-'), esId = pickId('es-');
  P.radiaFace(ctx, { expr: opts.expr ?? 'smile', blink: !!opts.blink, lip: lipId ? LIP_COLOR[lipId] : undefined, iris: eyeId ? EYE_COLOR[eyeId] : undefined, mouth: moId ? MOUTH_SHAPE[moId] : undefined, liner: elId ? LINER_STYLE[elId] : undefined, shadow: esId ? SHADOW_COLOR[esId] : undefined });
  ctx.restore();
  if (!P.veilOn()) P.hairVolume(ctx, P.HEAD_X, P.HEAD_Y, () => hairFrontLayer(ctx, hair, sway));
  if (P.veilOn()) { ctx.save(); ctx.translate(P.HEAD_X, P.HEAD_Y); ctx.scale(P.HEAD_K, P.HEAD_K); P.drawVeil(ctx); ctx.restore(); }
  if (accs.includes('ac-hoops')) hoops(ctx);
  if (accs.includes('ac-sunglasses')) sunglasses(ctx);
  // boucles → lunettes → foulards / accessoires de cheveux (du plus près au plus haut)
  for (const grp of ['ears', 'glasses', 'head'] as const) for (const a of accs) if (accGroup(a) === grp) EXTRA.face[a]?.(ctx);
  if (crown === 'cr-gold') crownGold(ctx);
  else if (crown === 'cr-flowers') crownFlowers(ctx);
  else if (crown === 'cr-tiara') crownTiara(ctx);
  ctx.restore();
}

function drawBottomWaist(ctx: C, bottom: ClothId | null, st: number): void {
  // bandeau de taille par-dessus le haut rentré
  const col = bottom === 'bot-jeans' ? '#3F5F95' : bottom === 'bot-trousers-chic' ? '#2D3045' : bottom === 'bot-skirt-pleated' ? '#8A3F5B' : bottom ? '#2E2733' : '#53384F';
  const y = bottom === 'bot-trousers-chic' ? 282 : 288;
  roundRect(ctx, CX - 51, y, 102, 13, 4);
  fs(ctx, col, 1.8);
  if (bottom === 'bot-jeans') { roundRect(ctx, CX - 9, y - 1, 18, 14, 3); fs(ctx, lg(ctx, 0, y, 0, y + 13, '#FFE9A6', GOLD, '#D9A238'), 1.5); }
  if (bottom === 'bot-trousers-chic') { roundRect(ctx, CX - 9, y, 18, 13, 3); fs(ctx, lg(ctx, 0, y, 0, y + 13, '#FFE9A6', GOLD, '#D9A238'), 1.5); }
  void st;
}

function drawSleeve(ctx: C, a: Arm, sp: SleeveSpec, under: boolean): void {
  void under;
  armSeg(ctx, a, 0, sp.len, sp.wid, sp.c0, sp.c1, sp.len < 1 ? false : false);
  if (sp.puff) {
    // épaule bouffante
    const p = qAt(a, sp.len * 0.45);
    ctx.beginPath();
    ctx.ellipse(p[0], p[1], sp.wid * 0.62, sp.wid * 0.58, 0.3, 0, Math.PI * 2);
    fs(ctx, lg(ctx, p[0] - 20, p[1] - 20, p[0] + 20, p[1] + 20, shade(sp.puff, 0.2), sp.puff), 2);
    if (sp.trim) {
      const e = qAt(a, sp.len);
      sleeveEnd(ctx, a, sp.len, sp.wid * 0.8, 7, sp.trim);
      void e;
    }
  }
  if (sp.cuff) sleeveEnd(ctx, a, Math.min(1, sp.len) - (sp.len >= 1 ? 0 : 0), sp.wid * 0.9, 12, sp.cuff);
  else if (sp.hem) sleeveEnd(ctx, a, sp.len, sp.wid, 0, null);
}

// ---------------------------------------------------------------- API publique

/**
 * Dessine Radia en pied avec son look, centrée dans une boîte w × h (ratio 240 × 600
 * conservé, pieds en bas de la boîte).
 */
/** Posture naturelle par défaut, sauf marche animée (step) ou demande explicite de l'ancienne posture droite. */
const isNatural = (o: AvatarOpts): boolean => o.pose !== 'straight' && !o.step;
const TILT_UPPER = -0.055; // haut du corps : ≈ −3° autour de la taille
const TILT_LOWER = 0.02; // hanches et jambes : ≈ +1,1° autour des pieds (poids du corps sur une jambe)

function drawAvatarFlat(ctx: CanvasRenderingContext2D, look: Look, w: number, h: number, opts: AvatarOpts): void {
  const k = Math.min(w / 240, h / 600);
  ctx.save();
  ctx.translate((w - 240 * k) / 2, h - 600 * k);
  ctx.scale(k, k);
  drawAvatarLocal(ctx, look, opts);
  ctx.restore();
}

export function drawAvatar(ctx: CanvasRenderingContext2D, look: Look, w: number, h: number, opts: AvatarOpts = {}): void {
  if (!isNatural(opts)) { drawAvatarFlat(ctx, look, w, h, opts); return; }
  // silhouette en S : l'avatar est dessiné une fois puis recomposé en deux moitiés qui pivotent autour de la taille et des pieds
  // (aucune couture visible : les deux pivots coïncident avec la ligne de coupe).
  const t = ctx.getTransform(); const sc = Math.hypot(t.a, t.b) || 1;
  const tmp = makeCanvas(Math.max(1, Math.ceil(w * sc)), Math.max(1, Math.ceil(h * sc)));
  const tc = tmp.getContext('2d')!; tc.scale(sc, sc);
  drawAvatarFlat(tc, look, w, h, opts);
  const k = Math.min(w / 240, h / 600);
  const ox = (w - 240 * k) / 2, oy = h - 600 * k;
  const cx = ox + CX * k, seamY = oy + 352 * k, feetY = oy + 585 * k;
  ctx.save();
  // 1. hanches et jambes : légère rotation autour des pieds
  ctx.translate(cx, feetY); ctx.rotate(TILT_LOWER); ctx.translate(-cx, -feetY);
  // seulement ce qui est SOUS la taille (repère de la source) : sinon le haut du corps serait dessiné deux fois (fantôme derrière l'épaule)
  ctx.beginPath(); ctx.rect(-2, seamY - 9 * k, w + 4, h - seamY + 9 * k + 4); ctx.clip();
  ctx.drawImage(tmp, 0, 0, w, h);
  ctx.restore();
  // 2. haut du corps : rotation autour du point de coupe (déjà déplacé par la rotation des hanches)
  const dy = seamY - feetY;
  const px = cx - dy * Math.sin(TILT_LOWER), py = feetY + dy * Math.cos(TILT_LOWER);
  ctx.save();
  ctx.translate(px, py); ctx.rotate(TILT_UPPER); ctx.translate(-px, -py);
  ctx.translate(cx, feetY); ctx.rotate(TILT_LOWER); ctx.translate(-cx, -feetY); // même repère que la moitié basse
  ctx.beginPath(); ctx.rect(-2, -2, w + 4, seamY + 2); ctx.clip(); // seulement ce qui est au-dessus de la taille (repère de la source)
  ctx.drawImage(tmp, 0, 0, w, h);
  ctx.restore();
}

const cache = new Map<string, HTMLCanvasElement>();

/** Avatar rendu une fois et mis en cache (clé = look + options + taille) pour l'interface. */
export function avatarCanvas(look: Look, w: number, h: number, opts: AvatarOpts = {}): HTMLCanvasElement {
  // le reflet du bracelet / du collier n'entre dans la clé que si le look le porte (6 pas)
  const sh = look.acc.includes(BRACELET_ID) || look.acc.includes(NECKLACE_ID) ? shineStep(opts.shine ?? 0) : 0;
  const key = `${w}x${h}|${look.hair}|${look.top}|${look.bottom}|${look.dress}|${look.jacket}|${look.shoes}|${look.bag}|${look.acc.join(',')}|${look.crown}|${opts.expr ?? ''}|${opts.step ?? 0}|${opts.arms ?? ''}|${opts.blink ? 1 : 0}|${sh}|${opts.pose ?? ""}|${faceKey(getFaceCustom())}`;
  let c = cache.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    drawAvatar(c.getContext('2d')!, look, c.width, c.height, { ...opts, shine: sh / SHINE_STEPS });
    if (cache.size > 120) cache.delete(cache.keys().next().value as string);
    cache.set(key, c);
  }
  return c;
}

/** Look actuellement porté (lu depuis la sauvegarde). */
export { currentLook } from '../../world/look';

// ---- modules d'ajouts (enregistrent leurs dessins dans les tables ci-dessus)
import { installClothes } from './avatarClothes';
import { installStyle } from './avatarStyle';
installClothes();
installStyle();
