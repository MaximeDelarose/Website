/**
 * Personnages dessinés en vectoriel (Canvas 2D) : Radia et Auguste.
 * Style « avatar semi-cartoon » : grosse tête, visage lisse, dégradés doux,
 * contours fins brun foncé, cheveux à mèches, yeux expressifs.
 *
 *  - Radia : très longs cheveux châtains en dégradé (ombré) plus clairs vers
 *    les pointes, raie au milieu, grands yeux bruns à l'eye-liner, sourcils
 *    foncés, anneau au nez, deux minuscules points sur les pommettes, sweat noir
 *    oversize à capuche, pantalon large, baskets blanches, petit sac noir.
 *  - Auguste : cheveux bruns ondulés, sourcils épais, moustache et bouc,
 *    blouson de cuir brun, pull gris, pantalon large noir, mains dans les poches.
 *
 * Position de la marque dans l'œil : sur les photos de face, elle est dans
 * l'œil situé à GAUCHE DE L'IMAGE, au bord de l'iris, en bas à gauche
 * (vers « 8 heures »), à cheval sur le blanc de l'œil. Les portraits de face
 * la placent exactement là (EYE_MARK ci-dessous) et ne sont jamais retournés
 * en miroir. L'anneau au nez est, comme sur les photos, sur la narine située
 * à droite de l'image (NOSE_RING_SIDE).
 */
import { PAL, ellipse, gloss, heartPath, paint, roundRect, shade, starPath } from './kit';
import type { Expr } from '../../data/dialogue';

export const EYE_MARK = { eye: 'imageLeft' as const, angleDeg: 155, radius: 1.12 };
export const NOSE_RING_SIDE = 1; // +1 = droite de l'image

export type Outfit = 'hoodie' | 'stripes' | 'royal';
export interface FaceOpts { expr?: Expr; blink?: boolean; outfit?: Outfit; hood?: boolean }

const INK = '#3B2419'; // contour fin brun foncé

const SKIN_R = '#D8A17D';
const SKIN_R_SHADOW = '#B87C5A';
const SKIN_R_LIGHT = '#EDBF9E';
const IRIS_R = '#5A3520';

const SKIN_A = '#F0C8A6';
const SKIN_A_SHADOW = '#D29F7E';
const SKIN_A_LIGHT = '#FADFC8';
const IRIS_A = '#6A4528';

const HOODIE = '#26212B';
const HOODIE_LIGHT = '#42394A';
const HOODIE_DARK = '#15111A';
const LEATHER = '#3A2520';
const LEATHER_LIGHT = '#5E3E31';
const LEATHER_DARK = '#24150F';
const STITCH = '#C79A68';
const SWEATER = '#7F767B';
const PANTS_A = '#1D1A21';
const PANTS_R = '#211C25';
const GOLD = '#F0C25C';

const LW = 2.6; // contour des portraits (repère 400 × 480)

type Pt = [number, number];

// ============================================================ outils communs

function stroke(ctx: CanvasRenderingContext2D, w = LW, color: string = INK) {
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function fillGrad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fill();
}

/** Mèche de cheveux : forme effilée entre deux courbes. */
function strand(ctx: CanvasRenderingContext2D, pts: Pt[], width: number) {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
    const [px, py] = pts[Math.max(0, i - 1)];
    let dx = nx - px;
    let dy = ny - py;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const t = i / (pts.length - 1);
    const w = width * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08)) * 0.5;
    left.push([x - dy * w, y + dx * w]);
    right.push([x + dy * w, y - dx * w]);
  }
  smoothPath(ctx, [...left, ...right.reverse()]);
}

/** Trace une forme lisse passant par les milieux des segments (contour organique). */
function smoothPath(ctx: CanvasRenderingContext2D, pts: Pt[], closed = true) {
  const n = pts.length;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  const m0 = mid(pts[n - 1], pts[0]);
  if (closed) ctx.moveTo(m0[0], m0[1]); else ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  if (closed) ctx.closePath();
}

/** Courbe lisse ouverte passant par des points (pour traits de mèches). */
function curveThrough(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const m: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  const l = pts[pts.length - 1];
  ctx.lineTo(l[0], l[1]);
}

// ============================================================ yeux, sourcils, bouche

interface EyeStyle { iris: string; lash: string; w: number; h: number; lashes: boolean; wing?: boolean }

function drawEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, side: -1 | 1, expr: Expr, blink: boolean, st: EyeStyle, mark: boolean) {
  const w = st.w;
  let h = st.h;
  if (expr === 'surprise') h *= 1.22;
  if (expr === 'love' || expr === 'tease') h *= 0.74;
  if (expr === 'shy') h *= 0.86;
  const closed = blink || expr === 'laugh';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(side, 1); // x local positif = coin extérieur de l'œil
  if (closed) {
    ctx.beginPath();
    if (expr === 'laugh') { ctx.moveTo(-w * 0.55, 3); ctx.quadraticCurveTo(0, -h * 0.85, w * 0.58, 3); }
    else { ctx.moveTo(-w * 0.55, 0); ctx.quadraticCurveTo(0, h * 0.5, w * 0.58, -1); }
    stroke(ctx, 3.8, st.lash);
    if (st.wing) {
      ctx.beginPath();
      ctx.moveTo(w * 0.52, expr === 'laugh' ? 1 : 0);
      ctx.lineTo(w * 0.8, expr === 'laugh' ? -6 : -5);
      stroke(ctx, 2.8, st.lash);
    } else if (st.lashes) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5, expr === 'laugh' ? 0 : 1);
      ctx.lineTo(w * 0.68, expr === 'laugh' ? -5 : -3);
      stroke(ctx, 2.6, st.lash);
    }
    ctx.restore();
    return;
  }
  const top = -h * 0.62;
  const bot = h * 0.5;
  const eyePath = () => {
    ctx.beginPath();
    ctx.moveTo(-w * 0.55, 1);
    ctx.bezierCurveTo(-w * 0.35, top, w * 0.3, top - 1, w * 0.58, -h * 0.05);
    ctx.bezierCurveTo(w * 0.3, bot, -w * 0.3, bot, -w * 0.55, 1);
    ctx.closePath();
  };
  eyePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.save();
  eyePath();
  ctx.clip();
  let lookX = 0;
  let lookY = -h * 0.02;
  if (expr === 'shy') lookX = 5;
  if (expr === 'love') lookY = -h * 0.1;
  const ir = h * (st.wing ? 0.6 : 0.72);
  const ix = lookX * side;
  ctx.beginPath();
  ctx.arc(ix, lookY, ir, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(ix, lookY + ir * 0.35, ir * 0.1, ix, lookY, ir);
  g.addColorStop(0, shade(st.iris, 0.4));
  g.addColorStop(0.6, st.iris);
  g.addColorStop(1, shade(st.iris, -0.45));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = shade(st.iris, -0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ix, lookY, ir * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = '#1B110C';
  ctx.fill();
  // marque pigmentée (Radia, œil à gauche de l'image)
  if (mark) {
    // On revient dans le repère de l'image (sans le miroir appliqué plus haut)
    // pour que l'angle soit celui de l'image et jamais inversé.
    ctx.save();
    ctx.scale(side, 1);
    const ixImg = ix * side;
    const a = (EYE_MARK.angleDeg * Math.PI) / 180;
    const mx = ixImg + Math.cos(a) * ir * EYE_MARK.radius;
    const my = lookY + Math.sin(a) * ir * EYE_MARK.radius;
    ctx.beginPath();
    ctx.ellipse(mx, my, ir * 0.5, ir * 0.4, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(130,70,36,0.7)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(mx, my, ir * 0.32, ir * 0.26, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#3A1A0C';
    ctx.fill();
    ctx.restore();
  }
  // reflets
  ctx.beginPath();
  ctx.arc(ix - ir * 0.32 * side, lookY - ir * 0.36, ir * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ix + ir * 0.34 * side, lookY + ir * 0.36, ir * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  // ombre de la paupière
  ctx.beginPath();
  ctx.moveTo(-w, top - 4);
  ctx.lineTo(w, top - 4);
  ctx.lineTo(w, top + h * 0.3);
  ctx.quadraticCurveTo(0, top + h * 0.08, -w, top + h * 0.3);
  ctx.closePath();
  ctx.fillStyle = 'rgba(110,60,50,0.2)';
  ctx.fill();
  ctx.restore();
  // paupière supérieure épaisse (eye-liner)
  const lidT = st.wing ? 4.4 : st.lashes ? 3.6 : 3;
  ctx.beginPath();
  ctx.moveTo(-w * 0.6, 1.5);
  ctx.bezierCurveTo(-w * 0.35, top - 1.2, w * 0.3, top - 2.2, w * 0.62, -h * 0.1);
  ctx.bezierCurveTo(w * 0.3, top + lidT - 1, -w * 0.3, top + lidT, -w * 0.6, 1.5);
  ctx.closePath();
  ctx.fillStyle = st.lash;
  ctx.fill();
  stroke(ctx, 1.2, st.lash);
  if (st.wing) {
    // aile d'eye-liner
    ctx.beginPath();
    ctx.moveTo(w * 0.5, -h * 0.2);
    ctx.quadraticCurveTo(w * 0.72, -h * 0.22, w * 0.86, -h * 0.58);
    ctx.quadraticCurveTo(w * 0.7, -h * 0.4, w * 0.56, -h * 0.02);
    ctx.closePath();
    ctx.fillStyle = st.lash;
    ctx.fill();
    stroke(ctx, 1.4, st.lash);
    // pli de la paupière
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, top - 5);
    ctx.quadraticCurveTo(0, top - 10, w * 0.46, top - 4);
    stroke(ctx, 1, 'rgba(120,64,44,0.4)');
  }
  if (st.lashes && !st.wing) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5, -h * 0.25);
    ctx.quadraticCurveTo(w * 0.68, -h * 0.4, w * 0.78, -h * 0.62);
    stroke(ctx, 2.4, st.lash);
  }
  // cils du bas, fins
  ctx.beginPath();
  ctx.moveTo(-w * 0.45, h * 0.18);
  ctx.bezierCurveTo(-w * 0.2, bot + 0.5, w * 0.25, bot + 0.5, w * 0.5, h * 0.05);
  stroke(ctx, 1.2, shade(st.lash, 0.25));
  ctx.restore();
}

function drawBrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, side: -1 | 1, expr: Expr, color: string, thick: number, straight = false) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(side, 1);
  let lift = 0;
  let tilt = 0;
  if (expr === 'surprise') lift = -7;
  if (expr === 'sad') tilt = 5;
  if (expr === 'tease' && side === 1) lift = -6;
  if (expr === 'love' || expr === 'shy') tilt = 2;
  ctx.translate(0, lift);
  const arch = straight ? 3.5 : 8;
  ctx.beginPath();
  ctx.moveTo(-21, 5 + tilt);
  ctx.bezierCurveTo(-10, -arch * 0.7 + tilt * 0.3, 6, -arch * 1.5 + tilt * 0.2, 25, 4 - (straight ? 1 : 0));
  ctx.bezierCurveTo(8, -arch * 1.1 + thick, -8, -arch * 0.3 + thick, -21, 5 + thick * 0.9 + tilt);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawMouth(ctx: CanvasRenderingContext2D, cy: number, expr: Expr, lip: string, female: boolean) {
  ctx.save();
  ctx.translate(0, cy);
  const dark = shade(lip, -0.4);
  const w = female ? 21 : 19;
  switch (expr) {
    case 'laugh':
    case 'smile': {
      const open = expr === 'laugh' ? 15 : 8;
      const mouth = () => {
        ctx.beginPath();
        ctx.moveTo(-w, -2);
        ctx.quadraticCurveTo(0, 3, w, -2);
        ctx.quadraticCurveTo(w * 0.6, open + 6, 0, open + 7);
        ctx.quadraticCurveTo(-w * 0.6, open + 6, -w, -2);
        ctx.closePath();
      };
      mouth();
      ctx.fillStyle = '#7A3438';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ellipse(ctx, 0, 1, w * 0.85, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      if (expr === 'laugh') { ellipse(ctx, 0, open + 6, w * 0.45, 6); ctx.fillStyle = '#E07C86'; ctx.fill(); }
      ctx.restore();
      mouth();
      stroke(ctx, 2, dark);
      if (female) {
        ctx.beginPath();
        ctx.moveTo(-w - 1, -2);
        ctx.quadraticCurveTo(-w * 0.5, -8, -4, -7);
        ctx.quadraticCurveTo(0, -5, 4, -7);
        ctx.quadraticCurveTo(w * 0.5, -8, w + 1, -2);
        ctx.quadraticCurveTo(0, 1, -w - 1, -2);
        ctx.fillStyle = lip;
        ctx.fill();
        stroke(ctx, 1.4, dark);
      }
      break;
    }
    case 'surprise': {
      ellipse(ctx, 0, 4, 8, 10);
      ctx.fillStyle = '#7A3438';
      ctx.fill();
      stroke(ctx, 2.2, dark);
      if (female) { ellipse(ctx, 0, 4, 11, 13); ctx.lineWidth = 3; ctx.strokeStyle = lip; ctx.stroke(); }
      break;
    }
    case 'sad': {
      ctx.beginPath();
      ctx.moveTo(-w * 0.7, 6);
      ctx.quadraticCurveTo(0, -3, w * 0.7, 6);
      stroke(ctx, 2.8, dark);
      break;
    }
    default: {
      const smirk = expr === 'tease' ? 4 : 0;
      if (female) {
        ctx.beginPath();
        ctx.moveTo(-w, 1 + smirk * 0.3);
        ctx.quadraticCurveTo(-w * 0.55, -7, -5, -6);
        ctx.quadraticCurveTo(0, -3.5, 5, -6);
        ctx.quadraticCurveTo(w * 0.55, -7, w, 1 - smirk);
        ctx.quadraticCurveTo(w * 0.5, 12, 0, 12);
        ctx.quadraticCurveTo(-w * 0.5, 12, -w, 1 + smirk * 0.3);
        ctx.closePath();
        fillGrad(ctx, 0, -7, 0, 13, [[0, shade(lip, -0.06)], [0.5, lip], [1, shade(lip, 0.14)]]);
        stroke(ctx, 1.5, dark);
        ctx.beginPath();
        ctx.moveTo(-w + 1, 1 + smirk * 0.3);
        ctx.quadraticCurveTo(0, 4.5 - smirk * 0.4, w - 1, 1 - smirk);
        stroke(ctx, 2, dark);
        gloss(ctx, -4, 7, 6, 1.8, 0.5, 0);
      } else {
        ctx.beginPath();
        ctx.moveTo(-w * 0.8, -2 + smirk * 0.4);
        ctx.quadraticCurveTo(0, 8, w * 0.8, -4 - smirk);
        stroke(ctx, 2.6, dark);
      }
    }
  }
  ctx.restore();
}

function blush(ctx: CanvasRenderingContext2D, expr: Expr, y: number, x: number, strength = 1) {
  const a = (expr === 'love' || expr === 'shy' ? 0.4 : expr === 'laugh' || expr === 'smile' ? 0.26 : 0.17) * strength;
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(s * x, y, 0, s * x, y, 24);
    g.addColorStop(0, `rgba(255,115,135,${a})`);
    g.addColorStop(1, 'rgba(255,115,135,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s * x, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }
  if (expr === 'love' || expr === 'shy') {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(230,90,110,0.55)';
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(s * (x - 10 + k * 7), y - 4);
      ctx.lineTo(s * (x - 6 + k * 7), y + 3);
      ctx.stroke();
    }
  }
}

// ============================================================ RADIA : cheveux

/** Dégradé ombré : racines foncées, pointes caramel. */
function hairGrad(ctx: CanvasRenderingContext2D, bottom: number) {
  const g = ctx.createLinearGradient(0, -110, 0, bottom);
  g.addColorStop(0, '#2A1810');
  g.addColorStop(0.38, '#41261A');
  g.addColorStop(0.6, '#65391F');
  g.addColorStop(0.82, '#97582D');
  g.addColorStop(1, '#C0803F');
  return g;
}

interface Lock { poly: Pt[]; center: Pt[] }

/** Longue mèche ondulée : ruban qui s'effile vers la pointe. */
function wavyLock(s: -1 | 1, x0: number, y0: number, len: number, w0: number, w1: number, amp: number, waves: number, phase: number, drift: number, sway: number): Lock {
  const N = 16;
  const L: Pt[] = [];
  const R: Pt[] = [];
  const center: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = y0 + len * t;
    const cx = x0 + drift * t + amp * Math.sin(waves * t * Math.PI * 2 + phase) * Math.min(1, t * 2.4) + sway * t * t;
    const taper = t < 0.78 ? 1 : Math.cos(((t - 0.78) / 0.22) * Math.PI * 0.5);
    const half = ((w0 + (w1 - w0) * t) / 2) * Math.max(0.04, taper);
    L.push([s * (cx - half), y]);
    R.push([s * (cx + half), y]);
    center.push([s * cx, y]);
  }
  return { poly: [...L, ...R.reverse()], center };
}

function lockShape(ctx: CanvasRenderingContext2D, lk: Lock, bottom: number, lw = 2.2) {
  smoothPath(ctx, lk.poly);
  ctx.fillStyle = hairGrad(ctx, bottom);
  ctx.fill();
  stroke(ctx, lw);
}

function lockDetail(ctx: CanvasRenderingContext2D, lk: Lock, s: number) {
  ctx.save();
  smoothPath(ctx, lk.poly);
  ctx.clip();
  ctx.lineCap = 'round';
  // fines mèches sombres suivant la vague
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(30,15,8,0.38)';
  for (const off of [-0.22, 0.2]) {
    ctx.beginPath();
    curveThrough(ctx, lk.center.slice(0, -2).map(([x, y], i, a) => [x + off * (14 + i * 1.2) * (a.length ? 1 : 0) * s, y] as Pt));
    ctx.stroke();
  }
  // reflet clair doux
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(235,170,115,0.32)';
  ctx.beginPath();
  curveThrough(ctx, lk.center.slice(2, -3).map(([x, y]) => [x - s * 5, y] as Pt));
  ctx.stroke();
  ctx.restore();
}

function radiaHairBack(ctx: CanvasRenderingContext2D, sway: number, bottom: number) {
  // grande masse de cheveux longs ondulés derrière la tête et les épaules
  const side = (s: -1 | 1): Pt[] => {
    const k = s === -1 ? 1.1 : 1;
    const len = s === -1 ? bottom : bottom * 0.84;
    const base: Pt[] = [[-112, 52], [-84, 86], [-40, 100], [20, 106], [92, 110], [150, 118], [204, 130], [len - 34, 140], [len, 104]];
    const out: Pt[] = [];
    for (const [y, x] of base) {
      const wv = y > 80 ? 9 * Math.sin(y / 34 + (s === -1 ? 0.5 : 2)) : 0;
      const dr = y > 120 ? sway * ((y - 120) / 200) : 0;
      out.push([s * (x * k + wv + dr * s), y]);
    }
    return out;
  };
  const R = side(1);
  const Lf = side(-1);
  const pts: Pt[] = [...R, [60, bottom - 52], [0, bottom - 70], [-60, bottom - 52], ...Lf.reverse()];
  smoothPath(ctx, pts);
  stroke(ctx, LW * 2);
  smoothPath(ctx, pts);
  ctx.fillStyle = hairGrad(ctx, bottom);
  ctx.fill();
  ctx.save();
  smoothPath(ctx, pts);
  ctx.clip();
  // profondeur : ombre derrière les mèches avant
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(20,10,5,0.3)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    curveThrough(ctx, [[s * 112, 40], [s * 118, 120], [s * 126, 200], [s * 120, bottom - 40]]);
    ctx.stroke();
  }
  ctx.restore();
}

function radiaHairFront(ctx: CanvasRenderingContext2D, sway: number, bottom: number) {
  const w = sway * 0.5;
  // longues mèches ondulées qui retombent devant les épaules (la gauche de l'image est plus longue)
  const left = wavyLock(-1, 86, -50, bottom + 50, 46, 56, 13, 1.7, 0.2, 40, w);
  const right = wavyLock(1, 86, -50, (bottom + 50) * 0.8, 44, 50, 11, 1.5, 1.4, 30, w);
  for (const [lk, s] of [[left, -1], [right, 1]] as const) {
    lockShape(ctx, lk, bottom, 2.2);
    lockDetail(ctx, lk, s);
  }
  // calotte lisse avec raie au milieu
  const cap: Pt[] = [
    [0, -118], [-46, -112], [-82, -84], [-94, -34], [-92, 14], [-82, 20],
    [-72, -2], [-68, -40], [-54, -64], [-32, -78], [-10, -84], [0, -84],
    [10, -84], [32, -78], [54, -64], [68, -40], [72, -2], [82, 20], [92, 14], [94, -34], [82, -84], [46, -112],
  ];
  smoothPath(ctx, cap);
  ctx.fillStyle = hairGrad(ctx, bottom);
  ctx.fill();
  stroke(ctx, 2.4);
  ctx.save();
  smoothPath(ctx, cap);
  ctx.clip();
  // mèches partant de la raie
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
    // reflet lumineux sur le dessus du crâne
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(230,180,130,0.2)';
    ctx.beginPath();
    ctx.moveTo(s * 10, -108);
    ctx.quadraticCurveTo(s * 56, -104, s * 78, -62);
    ctx.stroke();
  }
  ctx.restore();
  // raie
  ctx.beginPath();
  ctx.moveTo(0, -116);
  ctx.lineTo(0, -85);
  stroke(ctx, 2, SKIN_R_SHADOW);
}

// ============================================================ RADIA : visage

function radiaNeck(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-27, 60);
  ctx.lineTo(-30, 168);
  ctx.lineTo(30, 168);
  ctx.lineTo(27, 60);
  ctx.closePath();
  fillGrad(ctx, 0, 60, 0, 168, [[0, SKIN_R_SHADOW], [0.4, SKIN_R], [1, SKIN_R]]);
  stroke(ctx);
}

function radiaFace(ctx: CanvasRenderingContext2D, o: FaceOpts) {
  const expr = o.expr ?? 'neutral';
  // ombre du menton sur le cou
  ctx.save();
  ctx.beginPath();
  ctx.rect(-30, 60, 60, 108);
  ctx.clip();
  ellipse(ctx, 0, 106, 44, 22);
  ctx.fillStyle = 'rgba(120,64,40,0.26)';
  ctx.fill();
  ctx.restore();
  // oreilles (à peine visibles)
  for (const s of [-1, 1]) {
    ellipse(ctx, s * 71, 10, 8, 14);
    ctx.fillStyle = SKIN_R_SHADOW;
    ctx.fill();
    stroke(ctx, 2);
  }
  // visage : front large, joues pleines, petit menton
  ctx.beginPath();
  ctx.moveTo(0, -100);
  ctx.bezierCurveTo(44, -100, 76, -74, 76, -24);
  ctx.bezierCurveTo(77, 26, 66, 62, 44, 88);
  ctx.bezierCurveTo(28, 101, 12, 105, 0, 105);
  ctx.bezierCurveTo(-12, 105, -28, 101, -44, 88);
  ctx.bezierCurveTo(-66, 62, -77, 26, -76, -24);
  ctx.bezierCurveTo(-76, -74, -44, -100, 0, -100);
  ctx.closePath();
  const g = ctx.createRadialGradient(-16, -6, 8, 0, 8, 118);
  g.addColorStop(0, SKIN_R_LIGHT);
  g.addColorStop(0.5, SKIN_R);
  g.addColorStop(1, SKIN_R_SHADOW);
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx, 2.4);
  blush(ctx, expr, 38, 47);
  // deux minuscules points sur les pommettes
  ctx.fillStyle = 'rgba(140,82,54,0.6)';
  for (const [x, y, r] of [[-49, 31, 1.7], [47, 33, 1.5], [-43, 38, 1], [52, 38, 1]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // yeux
  const eye: EyeStyle = { iris: IRIS_R, lash: '#1B100C', w: 42, h: 27, lashes: true, wing: true };
  drawEye(ctx, -34, 9, -1, expr, !!o.blink, eye, EYE_MARK.eye === 'imageLeft');
  drawEye(ctx, 34, 9, 1, expr, !!o.blink, eye, false);
  // sourcils foncés bien dessinés
  drawBrow(ctx, -34, -22, -1, expr, '#2B1A13', 5.2);
  drawBrow(ctx, 34, -22, 1, expr, '#2B1A13', 5.2);
  // nez fin
  ctx.beginPath();
  ctx.moveTo(5, 12);
  ctx.quadraticCurveTo(8, 28, 9, 36);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = 'rgba(150,88,60,0.5)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-11, 42);
  ctx.quadraticCurveTo(-8, 47, -2, 44);
  ctx.moveTo(2, 44);
  ctx.quadraticCurveTo(8, 47, 12, 42);
  stroke(ctx, 2.2, '#8A5038');
  gloss(ctx, -1, 31, 3, 5, 0.3, 0);
  // anneau au nez (narine à droite de l'image)
  const rx = 12.5 * NOSE_RING_SIDE;
  ctx.beginPath();
  ctx.arc(rx, 45.5, 4, -Math.PI * 0.3, Math.PI * 1.2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#8A7A5A';
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#F4DFA0';
  ctx.stroke();
  drawMouth(ctx, 69, expr, '#C9807A', true);
}

// ============================================================ RADIA : buste

function radiaBust(ctx: CanvasRenderingContext2D, outfit: Outfit) {
  if (outfit === 'stripes') { radiaBustShirt(ctx); return; }
  // capuche baissée derrière la nuque
  ctx.beginPath();
  ctx.moveTo(-84, 176);
  ctx.bezierCurveTo(-92, 130, -50, 118, 0, 118);
  ctx.bezierCurveTo(50, 118, 92, 130, 84, 176);
  ctx.closePath();
  fillGrad(ctx, 0, 118, 0, 180, [[0, HOODIE_LIGHT], [1, HOODIE_DARK]]);
  stroke(ctx, 2.4);
  radiaNeck(ctx);
  // corps du sweat oversize
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-62, 152);
    ctx.bezierCurveTo(-112, 156, -158, 172, -176, 214);
    ctx.bezierCurveTo(-196, 262, -200, 380, -196, 480);
    ctx.lineTo(196, 480);
    ctx.bezierCurveTo(200, 380, 196, 262, 176, 214);
    ctx.bezierCurveTo(158, 172, 112, 156, 62, 152);
    ctx.quadraticCurveTo(0, 198, -62, 152);
    ctx.closePath();
  };
  body();
  fillGrad(ctx, -190, 160, 190, 440, [[0, HOODIE_LIGHT], [0.45, HOODIE], [1, HOODIE_DARK]]);
  stroke(ctx, 2.6);
  ctx.save();
  body();
  ctx.clip();
  // emmanchures et plis
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 112, 170);
    ctx.bezierCurveTo(s * 132, 230, s * 140, 290, s * 130, 360);
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(s * 150, 230);
    ctx.bezierCurveTo(s * 162, 290, s * 168, 350, s * 164, 430);
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  }
  ctx.restore();
  // col rond (rebord de capuche)
  ctx.beginPath();
  ctx.moveTo(-64, 152);
  ctx.quadraticCurveTo(0, 204, 64, 152);
  stroke(ctx, 11, HOODIE_DARK);
  ctx.beginPath();
  ctx.moveTo(-64, 152);
  ctx.quadraticCurveTo(0, 204, 64, 152);
  stroke(ctx, 7.5, '#352E3D');
  ctx.beginPath();
  ctx.moveTo(-52, 154);
  ctx.quadraticCurveTo(0, 196, 52, 154);
  stroke(ctx, 1.6, 'rgba(255,255,255,0.14)');
  // cordons
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 17, 186);
    ctx.bezierCurveTo(s * 22, 220, s * 14, 250, s * 18, 282);
    stroke(ctx, 3.6, INK);
    ctx.beginPath();
    ctx.moveTo(s * 17, 186);
    ctx.bezierCurveTo(s * 22, 220, s * 14, 250, s * 18, 282);
    stroke(ctx, 2.1, '#B8B0C2');
    ctx.beginPath();
    ctx.roundRect(s * 18 - 2.3, 280, 4.6, 11, 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
    stroke(ctx, 1.2);
  }
  // bandoulière du petit sac (épaule à droite de l'image)
  ctx.beginPath();
  ctx.moveTo(78, 152);
  ctx.bezierCurveTo(96, 210, 112, 270, 122, 330);
  stroke(ctx, 6, '#0E0B12');
  ctx.beginPath();
  ctx.moveTo(76, 152);
  ctx.bezierCurveTo(94, 210, 110, 270, 120, 330);
  stroke(ctx, 1.4, 'rgba(255,255,255,0.16)');
}

function radiaBustShirt(ctx: CanvasRenderingContext2D) {
  radiaNeck(ctx);
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-60, 150);
    ctx.bezierCurveTo(-120, 158, -158, 176, -172, 216);
    ctx.bezierCurveTo(-188, 270, -196, 380, -190, 480);
    ctx.lineTo(190, 480);
    ctx.bezierCurveTo(196, 380, 188, 270, 172, 216);
    ctx.bezierCurveTo(158, 176, 120, 158, 60, 150);
    ctx.lineTo(0, 238);
    ctx.closePath();
  };
  body();
  fillGrad(ctx, -170, 160, 170, 470, [[0, '#58443F'], [0.5, '#3B2D2C'], [1, '#261C1D']]);
  stroke(ctx, 2.6);
  ctx.save();
  body();
  ctx.clip();
  ctx.lineWidth = 1.7;
  ctx.strokeStyle = 'rgba(245,232,215,0.7)';
  for (let x = -190; x <= 190; x += 11) {
    ctx.beginPath();
    ctx.moveTo(x, 170);
    ctx.quadraticCurveTo(x * 1.06, 320, x * 1.1, 490);
    ctx.stroke();
  }
  ctx.restore();
  // décolleté
  ctx.beginPath();
  ctx.moveTo(-30, 152);
  ctx.lineTo(0, 238);
  ctx.lineTo(30, 152);
  ctx.closePath();
  fillGrad(ctx, 0, 150, 0, 240, [[0, SKIN_R_SHADOW], [1, SKIN_R]]);
  stroke(ctx, 2);
  // col
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 28, 146);
    ctx.lineTo(s * 76, 188);
    ctx.lineTo(s * 40, 226);
    ctx.lineTo(0, 240);
    ctx.lineTo(s * 30, 170);
    ctx.closePath();
    ctx.fillStyle = '#4E3D38';
    ctx.fill();
    stroke(ctx, 2.2);
  }
  // boutons
  for (const y of [270, 320, 370]) {
    ctx.beginPath();
    ctx.arc(0, y, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = '#D8C8B4';
    ctx.fill();
    stroke(ctx, 1.2);
  }
}

function crown(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, rot = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-40, 18);
  ctx.lineTo(-46, -18);
  ctx.quadraticCurveTo(-34, -8, -22, 2);
  ctx.lineTo(0, -32);
  ctx.lineTo(22, 2);
  ctx.quadraticCurveTo(34, -8, 46, -18);
  ctx.lineTo(40, 18);
  ctx.quadraticCurveTo(0, 25, -40, 18);
  ctx.closePath();
  fillGrad(ctx, -40, -30, 40, 22, [[0, '#FFE9A6'], [0.5, GOLD], [1, '#D9A238']]);
  stroke(ctx, 2.4, '#6A4418');
  // bandeau
  ctx.beginPath();
  ctx.moveTo(-40, 10);
  ctx.quadraticCurveTo(0, 16, 40, 10);
  stroke(ctx, 1.8, '#B98826');
  heartPath(ctx, 0, 7, 8);
  ctx.fillStyle = PAL.roseVif;
  ctx.fill();
  stroke(ctx, 1.2, '#6A4418');
  for (const [x, y] of [[-46, -18], [0, -32], [46, -18]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF4D0';
    ctx.fill();
    stroke(ctx, 1.6, '#6A4418');
  }
  gloss(ctx, -22, -4, 8, 2.6, 0.55, -0.7);
  ctx.restore();
}

const CROWN = { x: -2, y: -134, s: 0.92, rot: -0.04 };
const R_HAIR_BOTTOM = 262; // portrait
const R_HAIR_BOTTOM_FULL = 400; // corps entier

/** Radia : portrait (buste) dans un repère 400 × 480. */
export function drawRadiaPortrait(ctx: CanvasRenderingContext2D, o: FaceOpts & { sway?: number } = {}) {
  const outfit = o.outfit ?? 'hoodie';
  ctx.save();
  ctx.translate(200, 200);
  radiaHairBack(ctx, o.sway ?? 0, R_HAIR_BOTTOM);
  radiaBust(ctx, outfit === 'royal' ? 'hoodie' : outfit);
  radiaFace(ctx, o);
  radiaHairFront(ctx, o.sway ?? 0, R_HAIR_BOTTOM);
  if (outfit === 'royal') crown(ctx, CROWN.x, CROWN.y, CROWN.s, CROWN.rot);
  ctx.restore();
}

// ============================================================ AUGUSTE

function augusteHair(ctx: CanvasRenderingContext2D) {
  const grad = () => {
    const g = ctx.createLinearGradient(-70, -146, 70, -20);
    g.addColorStop(0, '#A87B50');
    g.addColorStop(0.45, '#744D32');
    g.addColorStop(1, '#43291B');
    return g;
  };
  smoothPath(ctx, [
    [-80, 12], [-87, -30], [-85, -72], [-62, -110], [-24, -132], [22, -140], [62, -126], [88, -94], [92, -50], [84, 12],
    [77, -6], [72, -40], [58, -62], [36, -64], [10, -56], [-14, -68], [-40, -70], [-60, -52], [-72, -30], [-76, -8],
  ]);
  ctx.fillStyle = grad();
  ctx.fill();
  stroke(ctx, 2.4);
  // grosses vagues / boucles volumineuses (rubans courbes)
  const tufts: [Pt[], number][] = [
    [[[-38, -70], [-62, -84], [-78, -70], [-82, -44]], 22],
    [[[52, -60], [76, -78], [84, -104], [66, -118]], 28],
    [[[40, -62], [30, -98], [6, -120], [-30, -122]], 38],
    [[[10, -58], [-2, -92], [-32, -110], [-62, -98]], 32],
    [[[24, -108], [48, -126], [72, -118], [84, -96]], 26],
    [[[-30, -114], [-10, -132], [22, -134], [44, -126]], 24],
    [[[-56, -96], [-62, -116], [-44, -128], [-20, -128]], 22],
  ];
  for (const [pts, wd] of tufts) {
    strand(ctx, pts, wd);
    ctx.fillStyle = grad();
    ctx.fill();
    stroke(ctx, 1.6, 'rgba(40,22,12,0.8)');
  }
  // mèches fines + reflets
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = 'rgba(35,18,10,0.5)';
  for (const pts of [
    [[34, -64], [26, -92], [6, -112]],
    [[2, -62], [-8, -88], [-34, -104]],
    [[60, -64], [76, -84], [74, -108]],
    [[-70, -60], [-78, -52], [-82, -34]],
  ] as Pt[][]) {
    ctx.beginPath();
    curveThrough(ctx, pts);
    ctx.stroke();
  }
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(225,175,120,0.32)';
  for (const pts of [[[-46, -124], [-18, -142], [24, -140]], [[40, -118], [66, -122], [84, -102]], [[28, -90], [12, -108], [-14, -112]]] as Pt[][]) {
    ctx.beginPath();
    curveThrough(ctx, pts);
    ctx.stroke();
  }
}

function augusteNeck(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-30, 60);
  ctx.lineTo(-32, 168);
  ctx.lineTo(32, 168);
  ctx.lineTo(30, 60);
  ctx.closePath();
  fillGrad(ctx, 0, 60, 0, 168, [[0, SKIN_A_SHADOW], [0.4, SKIN_A], [1, SKIN_A]]);
  stroke(ctx);
}

function augusteFace(ctx: CanvasRenderingContext2D, o: FaceOpts) {
  const expr = o.expr ?? 'neutral';
  ctx.save();
  ctx.beginPath();
  ctx.rect(-32, 60, 64, 108);
  ctx.clip();
  ellipse(ctx, 0, 112, 46, 22);
  ctx.fillStyle = 'rgba(130,76,50,0.34)';
  ctx.fill();
  ctx.restore();
  // oreilles
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 72, 8, 10, 17, 0, 0, Math.PI * 2);
    ctx.fillStyle = SKIN_A_SHADOW;
    ctx.fill();
    stroke(ctx, 2.2);
    ctx.beginPath();
    ctx.arc(s * 72, 8, 4, 0.3, Math.PI * 1.4);
    stroke(ctx, 1.3, 'rgba(140,84,56,0.6)');
  }
  // visage un peu plus long, mâchoire marquée
  ctx.beginPath();
  ctx.moveTo(0, -104);
  ctx.bezierCurveTo(42, -104, 71, -78, 72, -26);
  ctx.bezierCurveTo(73, 20, 68, 52, 54, 78);
  ctx.bezierCurveTo(38, 99, 16, 108, 0, 108);
  ctx.bezierCurveTo(-16, 108, -38, 99, -54, 78);
  ctx.bezierCurveTo(-68, 52, -73, 20, -72, -26);
  ctx.bezierCurveTo(-71, -78, -42, -104, 0, -104);
  ctx.closePath();
  const g = ctx.createRadialGradient(-16, -10, 8, 0, 6, 122);
  g.addColorStop(0, SKIN_A_LIGHT);
  g.addColorStop(0.5, SKIN_A);
  g.addColorStop(1, SKIN_A_SHADOW);
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx, 2.4);
  blush(ctx, expr, 36, 46, 0.8);
  const eye: EyeStyle = { iris: IRIS_A, lash: '#22140D', w: 34, h: 17, lashes: false };
  drawEye(ctx, -31, 6, -1, expr, !!o.blink, eye, false);
  drawEye(ctx, 31, 6, 1, expr, !!o.blink, eye, false);
  drawBrow(ctx, -32, -20, -1, expr, '#33201A', 7, true);
  drawBrow(ctx, 32, -20, 1, expr, '#33201A', 7, true);
  // nez
  ctx.beginPath();
  ctx.moveTo(4, 8);
  ctx.quadraticCurveTo(11, 28, 12, 38);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(150,98,72,0.55)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, 42);
  ctx.quadraticCurveTo(-6, 48, 0, 45);
  ctx.quadraticCurveTo(6, 48, 12, 42);
  stroke(ctx, 2.2, '#94654C');
  // bouc (sous la lèvre)
  const mOpen = expr === 'laugh' ? 22 : expr === 'smile' ? 14 : expr === 'surprise' ? 16 : 6;
  const gy = 68 + mOpen + 6;
  ctx.beginPath();
  ctx.moveTo(-12, gy - 4);
  ctx.quadraticCurveTo(-15, gy + 8, 0, gy + 12);
  ctx.quadraticCurveTo(15, gy + 8, 12, gy - 4);
  ctx.quadraticCurveTo(0, gy - 1, -12, gy - 4);
  ctx.closePath();
  fillGrad(ctx, 0, gy - 5, 0, gy + 12, [[0, '#4A2F22'], [1, '#2F1D15']]);
  stroke(ctx, 1.4, '#2A180F');
  // bouche
  drawMouth(ctx, 68, expr, '#C88E84', false);
  // moustache fine aux pointes relevées
  ctx.beginPath();
  ctx.moveTo(0, 56);
  ctx.bezierCurveTo(-8, 52, -22, 52, -32, 59);
  ctx.bezierCurveTo(-24, 59, -12, 60, 0, 61);
  ctx.bezierCurveTo(12, 60, 24, 59, 32, 59);
  ctx.bezierCurveTo(22, 52, 8, 52, 0, 56);
  ctx.closePath();
  ctx.fillStyle = '#3A241A';
  ctx.fill();
  stroke(ctx, 1.2, '#24150F');
}

function augusteBust(ctx: CanvasRenderingContext2D) {
  augusteNeck(ctx);
  ctx.save();
  ctx.translate(0, -14);
  // pull gris à col rond côtelé
  ctx.beginPath();
  ctx.moveTo(-62, 150);
  ctx.lineTo(62, 150);
  ctx.lineTo(70, 500);
  ctx.lineTo(-70, 500);
  ctx.closePath();
  fillGrad(ctx, -90, 150, 90, 480, [[0, '#8C8388'], [0.5, SWEATER], [1, '#5E565C']]);
  stroke(ctx, 2.4);
  // col du pull
  ctx.beginPath();
  ctx.ellipse(0, 156, 44, 16, 0, 0, Math.PI);
  ctx.lineTo(-44, 150);
  ctx.closePath();
  ctx.beginPath();
  ctx.moveTo(-44, 148);
  ctx.quadraticCurveTo(0, 196, 44, 148);
  ctx.lineTo(50, 158);
  ctx.quadraticCurveTo(0, 214, -50, 158);
  ctx.closePath();
  fillGrad(ctx, 0, 150, 0, 212, [[0, '#968C92'], [1, '#6B6268']]);
  stroke(ctx, 2);
  ctx.save();
  ctx.clip();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(60,50,56,0.5)';
  for (let x = -50; x <= 50; x += 5) { ctx.beginPath(); ctx.moveTo(x, 140); ctx.lineTo(x * 1.05, 220); ctx.stroke(); }
  ctx.restore();
  // blouson de cuir ouvert
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 40, 150);
    ctx.bezierCurveTo(s * 110, 150, s * 156, 168, s * 174, 212);
    ctx.bezierCurveTo(s * 192, 268, s * 196, 390, s * 192, 480);
    ctx.lineTo(s * 70, 480);
    ctx.lineTo(s * 66, 270);
    ctx.lineTo(s * 52, 200);
    ctx.closePath();
    fillGrad(ctx, s * 190, 170, s * 60, 470, [[0, LEATHER_LIGHT], [0.45, LEATHER], [1, LEATHER_DARK]]);
    stroke(ctx, 2.6);
    // reflets du cuir
    ctx.save();
    ctx.clip();
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(230,190,160,0.13)';
    ctx.beginPath();
    ctx.moveTo(s * 150, 232);
    ctx.quadraticCurveTo(s * 140, 320, s * 150, 420);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.moveTo(s * 118, 200);
    ctx.bezierCurveTo(s * 128, 250, s * 136, 300, s * 128, 370);
    ctx.stroke();
    ctx.restore();
    // revers (col rabattu)
    ctx.beginPath();
    ctx.moveTo(s * 38, 146);
    ctx.lineTo(s * 100, 164);
    ctx.lineTo(s * 82, 232);
    ctx.lineTo(s * 66, 262);
    ctx.lineTo(s * 52, 204);
    ctx.closePath();
    fillGrad(ctx, s * 40, 150, s * 90, 260, [[0, LEATHER_LIGHT], [1, LEATHER]]);
    stroke(ctx, 2.4);
    ctx.setLineDash([5, 3.5]);
    ctx.beginPath();
    ctx.moveTo(s * 40, 154);
    ctx.lineTo(s * 94, 170);
    ctx.lineTo(s * 78, 228);
    ctx.lineTo(s * 64, 254);
    stroke(ctx, 1.5, STITCH);
    ctx.beginPath();
    ctx.moveTo(s * 62, 272);
    ctx.lineTo(s * 70, 478);
    stroke(ctx, 1.5, STITCH);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Auguste : portrait (buste) dans un repère 400 × 480. */
export function drawAugustePortrait(ctx: CanvasRenderingContext2D, o: FaceOpts = {}) {
  ctx.save();
  ctx.translate(200, 200);
  augusteBust(ctx);
  augusteFace(ctx, o);
  augusteHair(ctx);
  ctx.restore();
}

// ============================================================ corps entiers

export interface FullOpts extends FaceOpts { step?: number; arms?: 'down' | 'wave' | 'heart' | 'open' }

const HEAD_X = 120;
const HEAD_Y = 100;
const HEAD_K = 0.56;

function sneaker(ctx: CanvasRenderingContext2D, cx: number, y: number, dir: number, color: string) {
  const w = 46;
  ctx.save();
  ctx.translate(cx, y);
  ctx.scale(1.1, 1.18);
  // dessus
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, -4);
  ctx.bezierCurveTo(-w / 2, -22, -w / 2 + 12, -30, -4 + dir * 4, -30);
  ctx.lineTo(w / 2 - 12, -30);
  ctx.bezierCurveTo(w / 2 - 2, -24, w / 2 + 3, -12, w / 2 + dir * 3, -4);
  ctx.closePath();
  fillGrad(ctx, -20, -30, 20, 0, [[0, shade(color, 0.15)], [1, shade(color, -0.1)]]);
  stroke(ctx, 2.2);
  // bout renforcé
  ctx.beginPath();
  ctx.ellipse(dir * 4, -9, 17, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, 0.12);
  ctx.fill();
  stroke(ctx, 1.1, 'rgba(59,36,25,0.5)');
  // semelle épaisse
  roundRect(ctx, -w / 2 - 1, -7, w + 2, 9, 4.5);
  fillGrad(ctx, 0, -7, 0, 2, [[0, '#FFFFFF'], [1, '#E3DCE0']]);
  stroke(ctx, 2.2);
  ctx.restore();
}

function hand(ctx: CanvasRenderingContext2D, x: number, y: number, skin: string, rot = 0, r = 10) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.82, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  stroke(ctx, 2);
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, r * 0.9);
  ctx.lineTo(-r * 0.1, r * 0.3);
  stroke(ctx, 1, 'rgba(120,70,45,0.5)');
  ctx.restore();
}

/** Manche : tube épais le long d'une courbe quadratique. */
function sleeve(ctx: CanvasRenderingContext2D, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, width: number, c0: string, c1: string) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.lineWidth = width + 3.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = width;
  const g = ctx.createLinearGradient(Math.min(x0, x1) - width, y0, Math.max(x0, x1) + width, y1);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.strokeStyle = g;
  ctx.stroke();
  // reflet sur le dessus
  ctx.beginPath();
  ctx.moveTo(x0 - 2, y0 + 2);
  ctx.quadraticCurveTo(cx - 3, cy, x1 - 3, y1 - 8);
  ctx.lineWidth = width * 0.16;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.stroke();
}

function cuff(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, w: number, h: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  roundRect(ctx, -w / 2, -h / 2, w, h, 3);
  ctx.fillStyle = color;
  ctx.fill();
  stroke(ctx, 1.8);
  ctx.restore();
}

/** Tangente (angle) d'une courbe quadratique à t = 1. */
const endAngle = (cx: number, cy: number, x1: number, y1: number) => Math.atan2(y1 - cy, x1 - cx) - Math.PI / 2;

/**
 * Personnage en pied, dans un repère 240 × 600 (pieds en bas, y = 590).
 * `step` (-1..1) écarte les jambes pour la marche.
 */
export function drawRadiaFull(ctx: CanvasRenderingContext2D, o: FullOpts = {}) {
  const outfit = o.outfit ?? 'hoodie';
  const st = o.step ?? 0;
  const shirt = outfit === 'stripes';
  const bag = !shirt;
  const sway = st * 4;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // cheveux longs derrière le corps
  ctx.save();
  ctx.translate(HEAD_X, HEAD_Y);
  ctx.scale(HEAD_K, HEAD_K);
  radiaHairBack(ctx, sway, R_HAIR_BOTTOM_FULL);
  ctx.restore();

  // baskets (rouges avec la tenue rayée), puis pantalon large par-dessus
  for (const s of [-1, 1] as const) {
    const off = st * s * 12;
    sneaker(ctx, 120 + s * 33 + off, 592, s, shirt ? '#E0424A' : '#FBF8F6');
  }
  const pant = shirt ? '#2F2832' : PANTS_R;
  for (const s of [-1, 1] as const) {
    const off = st * s * 12;
    ctx.beginPath();
    ctx.moveTo(120 + s * 1.5, 340);
    ctx.lineTo(120 + s * 60, 340);
    ctx.bezierCurveTo(120 + s * 62, 420, 120 + s * 60, 500, 120 + s * 62 + off, 556);
    ctx.quadraticCurveTo(120 + s * 34 + off, 562, 120 + s * 6 + off, 556);
    ctx.bezierCurveTo(120 + s * 3, 500, 120 + s * 2, 420, 120 + s * 1.5, 340);
    ctx.closePath();
    fillGrad(ctx, 120 - s * 40, 340, 120 + s * 70, 556, [[0, shade(pant, 0.1)], [0.55, pant], [1, shade(pant, -0.22)]]);
    stroke(ctx, 2.2);
    // pli central et reflet
    ctx.beginPath();
    ctx.moveTo(120 + s * 34, 350);
    ctx.quadraticCurveTo(120 + s * 34 + off * 0.5, 460, 120 + s * 34 + off, 560);
    stroke(ctx, 1.4, 'rgba(255,255,255,0.08)');
  }
  // ceinture élastique cachée sous le sweat
  // sweat / chemise
  const hemY = 352;
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(98, 166);
    ctx.bezierCurveTo(84, 170, 66, 178, 62, 196);
    ctx.bezierCurveTo(54, 240, 56, 300, 60, hemY);
    ctx.quadraticCurveTo(120, hemY + 8, 180, hemY);
    ctx.bezierCurveTo(184, 300, 186, 240, 178, 196);
    ctx.bezierCurveTo(174, 178, 156, 170, 142, 166);
    ctx.quadraticCurveTo(120, 184, 98, 166);
    ctx.closePath();
  };
  // cou
  ctx.beginPath();
  ctx.moveTo(108, 146);
  ctx.lineTo(107, 176);
  ctx.lineTo(133, 176);
  ctx.lineTo(132, 146);
  ctx.closePath();
  fillGrad(ctx, 0, 146, 0, 178, [[0, SKIN_R_SHADOW], [1, SKIN_R]]);
  stroke(ctx, 1.8);
  // capuche (derrière la nuque)
  if (!shirt) {
    ctx.beginPath();
    ctx.moveTo(86, 176);
    ctx.bezierCurveTo(84, 146, 100, 142, 120, 142);
    ctx.bezierCurveTo(140, 142, 156, 146, 154, 176);
    ctx.closePath();
    fillGrad(ctx, 0, 142, 0, 178, [[0, HOODIE_LIGHT], [1, HOODIE_DARK]]);
    stroke(ctx, 2);
  }
  // bras (avant le torse pour les poses le long du corps)
  const sc0 = shirt ? '#4A3A37' : HOODIE_LIGHT;
  const sc1 = shirt ? '#2E2322' : HOODIE_DARK;
  const sleeveCol = (): [string, string] => [sc0, sc1];
  const arm = (s: -1 | 1) => {
    const pose = o.arms;
    const [c0, c1] = sleeveCol();
    const swing = st * s * -6;
    let x1 = 120 + s * 80 + swing * 0.3;
    let y1 = 322;
    let cxm = 120 + s * 102;
    let cym = 262;
    let wid = shirt ? 24 : 36;
    if (pose === 'wave' && s === 1) { x1 = 208; y1 = 150; cxm = 206; cym = 216; }
    else if (pose === 'heart') { x1 = 120 + s * 16; y1 = 286; cxm = 120 + s * 76; cym = 262; }
    else if (pose === 'open') { x1 = 120 + s * 94; y1 = 316; cxm = 120 + s * 90; cym = 236; wid = shirt ? 22 : 28; }
    const sx = 120 + s * 50;
    sleeve(ctx, sx, 204, cxm, cym, x1, y1, wid, c0, c1);
    const ang = endAngle(cxm, cym, x1, y1);
    cuff(ctx, x1, y1, ang, wid * 0.9, 12, shirt ? '#CFC1B4' : '#352E3C');
    const hx = x1 + Math.sin(-ang) * 14;
    const hy = y1 + Math.cos(-ang) * 14;
    if (pose === 'heart') return;
    hand(ctx, hx, hy, SKIN_R, ang, 9.5);
  };
  // le côté sac (image droite) est dessiné après le torse
  body();
  if (shirt) {
    fillGrad(ctx, 60, 170, 180, 352, [[0, '#58443F'], [0.55, '#3A2C2B'], [1, '#261C1D']]);
    stroke(ctx, 2.4);
    ctx.save();
    body();
    ctx.clip();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(245,232,215,0.7)';
    for (let x = 54; x < 190; x += 5) { ctx.beginPath(); ctx.moveTo(x, 170); ctx.lineTo(x + 2, 360); ctx.stroke(); }
    ctx.restore();
    // col ouvert + boutons
    ctx.beginPath();
    ctx.moveTo(108, 166); ctx.lineTo(120, 214); ctx.lineTo(132, 166); ctx.closePath();
    fillGrad(ctx, 0, 166, 0, 214, [[0, SKIN_R_SHADOW], [1, SKIN_R]]);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(120 + s * 12, 162); ctx.lineTo(120 + s * 34, 186); ctx.lineTo(120 + s * 14, 206); ctx.lineTo(120, 216); ctx.lineTo(120 + s * 4, 178); ctx.closePath();
      ctx.fillStyle = '#4C3C38';
      ctx.fill();
      stroke(ctx, 1.8);
    }
    for (const y of [234, 262, 292, 322]) { ctx.beginPath(); ctx.arc(120, y, 1.8, 0, Math.PI * 2); ctx.fillStyle = '#D8C8B4'; ctx.fill(); }
  } else {
    fillGrad(ctx, 60, 170, 180, 352, [[0, HOODIE_LIGHT], [0.5, HOODIE], [1, HOODIE_DARK]]);
    stroke(ctx, 2.4);
    ctx.save();
    body();
    ctx.clip();
    // plis souples
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.moveTo(70, 220); ctx.quadraticCurveTo(66, 280, 72, 340); ctx.moveTo(170, 224); ctx.quadraticCurveTo(174, 284, 168, 340); ctx.stroke();
    ctx.restore();
    // poche kangourou
    ctx.beginPath();
    ctx.moveTo(84, 300);
    ctx.quadraticCurveTo(120, 296, 156, 300);
    ctx.lineTo(166, 340);
    ctx.quadraticCurveTo(120, 346, 74, 340);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fill();
    stroke(ctx, 1.6, 'rgba(10,6,14,0.85)');
    ctx.beginPath();
    ctx.moveTo(86, 302); ctx.quadraticCurveTo(120, 298, 154, 302);
    stroke(ctx, 1.2, 'rgba(255,255,255,0.13)');
    // bas côtelé
    ctx.beginPath();
    ctx.moveTo(60, hemY - 8);
    ctx.quadraticCurveTo(120, hemY, 180, hemY - 8);
    ctx.lineTo(180, hemY);
    ctx.quadraticCurveTo(120, hemY + 8, 60, hemY);
    ctx.closePath();
    ctx.fillStyle = '#322B39';
    ctx.fill();
    stroke(ctx, 1.8);
    // col roulé + cordons
    ctx.beginPath();
    ctx.moveTo(98, 166);
    ctx.quadraticCurveTo(120, 186, 142, 166);
    stroke(ctx, 6, HOODIE_DARK);
    ctx.beginPath();
    ctx.moveTo(98, 166);
    ctx.quadraticCurveTo(120, 186, 142, 166);
    stroke(ctx, 3.6, '#392F42');
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(120 + s * 9, 182);
      ctx.bezierCurveTo(120 + s * 12, 200, 120 + s * 7, 214, 120 + s * 9, 234);
      stroke(ctx, 1.9, '#B8B0C2');
      ctx.beginPath();
      ctx.arc(120 + s * 9, 236, 1.9, 0, Math.PI * 2);
      ctx.fillStyle = GOLD;
      ctx.fill();
    }
  }
  arm(-1);
  arm(1);
  if (o.arms === 'heart') {
    heartPath(ctx, 120, 296, 30);
    ctx.fillStyle = PAL.roseVif;
    ctx.fill();
    stroke(ctx, 2.2);
    gloss(ctx, 110, 286, 6, 3, 0.6, -0.6);
  }
  if (bag) {
    // bandoulière et petit sac noir à fermoir doré (hanche à droite de l'image)
    ctx.beginPath();
    ctx.moveTo(146, 168);
    ctx.bezierCurveTo(154, 220, 162, 270, 170, 330);
    stroke(ctx, 3.6, '#0C0910');
    ctx.beginPath();
    ctx.moveTo(145, 168);
    ctx.bezierCurveTo(153, 220, 161, 270, 169, 330);
    stroke(ctx, 1, 'rgba(255,255,255,0.18)');
    // sac
    ctx.beginPath();
    ctx.moveTo(166, 330);
    ctx.lineTo(206, 330);
    ctx.quadraticCurveTo(210, 352, 207, 372);
    ctx.quadraticCurveTo(187, 378, 167, 372);
    ctx.quadraticCurveTo(164, 352, 166, 330);
    ctx.closePath();
    fillGrad(ctx, 166, 330, 208, 376, [[0, '#3A343F'], [1, '#100D14']]);
    stroke(ctx, 2.2);
    ctx.beginPath();
    ctx.moveTo(166, 340);
    ctx.quadraticCurveTo(187, 352, 207, 340);
    stroke(ctx, 1.4, 'rgba(255,255,255,0.18)');
    ctx.beginPath();
    ctx.arc(187, 351, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
    stroke(ctx, 1);
    ctx.beginPath();
    ctx.roundRect(168, 321, 5, 9, 1.5);
    ctx.fillStyle = GOLD;
    ctx.fill();
    stroke(ctx, 1.2);
  }
  // tête
  ctx.save();
  ctx.translate(HEAD_X, HEAD_Y);
  ctx.scale(HEAD_K, HEAD_K);
  radiaFace(ctx, o);
  radiaHairFront(ctx, sway, R_HAIR_BOTTOM_FULL);
  if (outfit === 'royal') crown(ctx, CROWN.x, CROWN.y, CROWN.s, CROWN.rot);
  ctx.restore();
  ctx.restore();
}

export function drawAugusteFull(ctx: CanvasRenderingContext2D, o: FullOpts = {}) {
  const st = o.step ?? 0;
  const pose = o.arms;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const s of [-1, 1] as const) {
    const off = st * s * 12;
    sneaker(ctx, 120 + s * 33 + off, 592, s, '#FBF8F6');
  }
  // pantalon large noir
  for (const s of [-1, 1] as const) {
    const off = st * s * 12;
    ctx.beginPath();
    ctx.moveTo(120 + s * 1.5, 330);
    ctx.lineTo(120 + s * 62, 330);
    ctx.bezierCurveTo(120 + s * 64, 420, 120 + s * 62, 500, 120 + s * 64 + off, 556);
    ctx.quadraticCurveTo(120 + s * 35 + off, 562, 120 + s * 6 + off, 556);
    ctx.bezierCurveTo(120 + s * 3, 500, 120 + s * 2, 420, 120 + s * 1.5, 330);
    ctx.closePath();
    fillGrad(ctx, 120 - s * 40, 330, 120 + s * 70, 556, [[0, shade(PANTS_A, 0.14)], [0.55, PANTS_A], [1, shade(PANTS_A, -0.25)]]);
    stroke(ctx, 2.2);
    ctx.beginPath();
    ctx.moveTo(120 + s * 36, 350);
    ctx.quadraticCurveTo(120 + s * 36 + off * 0.5, 460, 120 + s * 36 + off, 560);
    stroke(ctx, 1.4, 'rgba(255,255,255,0.09)');
  }
  // braguette / couture centrale
  ctx.beginPath();
  ctx.moveTo(120, 332); ctx.lineTo(120, 372);
  stroke(ctx, 1.1, 'rgba(255,255,255,0.18)');
  // cou
  ctx.beginPath();
  ctx.moveTo(107, 146);
  ctx.lineTo(106, 176);
  ctx.lineTo(134, 176);
  ctx.lineTo(133, 146);
  ctx.closePath();
  fillGrad(ctx, 0, 146, 0, 178, [[0, SKIN_A_SHADOW], [1, SKIN_A]]);
  stroke(ctx, 1.8);
  // pull gris
  ctx.beginPath();
  ctx.moveTo(92, 174);
  ctx.lineTo(148, 174);
  ctx.lineTo(150, 332);
  ctx.lineTo(90, 332);
  ctx.closePath();
  fillGrad(ctx, 90, 174, 150, 332, [[0, '#908789'], [0.5, SWEATER], [1, '#5E565C']]);
  stroke(ctx, 2);
  // col rond du pull
  ctx.beginPath();
  ctx.moveTo(102, 168);
  ctx.quadraticCurveTo(120, 192, 138, 168);
  stroke(ctx, 6, INK);
  ctx.beginPath();
  ctx.moveTo(102, 168);
  ctx.quadraticCurveTo(120, 192, 138, 168);
  stroke(ctx, 3.6, '#A59BA1');
  // bas côtelé du pull
  ctx.beginPath();
  ctx.moveTo(90, 322); ctx.lineTo(150, 322); ctx.lineTo(150, 334); ctx.lineTo(90, 334); ctx.closePath();
  ctx.fillStyle = '#6A6166';
  ctx.fill();
  stroke(ctx, 1.6);
  // blouson de cuir : deux panneaux
  const hem = 334;
  for (const s of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(120 + s * 14, 164);
    ctx.bezierCurveTo(120 + s * 44, 164, 120 + s * 62, 172, 120 + s * 64, 192);
    ctx.bezierCurveTo(120 + s * 68, 240, 120 + s * 64, 300, 120 + s * 62, hem);
    ctx.lineTo(120 + s * 27, hem);
    ctx.lineTo(120 + s * 26, 250);
    ctx.lineTo(120 + s * 20, 196);
    ctx.closePath();
    fillGrad(ctx, 120 + s * 64, 180, 120 + s * 20, hem, [[0, LEATHER_LIGHT], [0.5, LEATHER], [1, LEATHER_DARK]]);
    stroke(ctx, 2.4);
    // bande côtelée du bas
    ctx.beginPath();
    ctx.moveTo(120 + s * 27, hem - 10);
    ctx.lineTo(120 + s * 62, hem - 10);
    ctx.lineTo(120 + s * 62, hem + 2);
    ctx.lineTo(120 + s * 27, hem + 2);
    ctx.closePath();
    ctx.fillStyle = '#2E1B14';
    ctx.fill();
    stroke(ctx, 1.8);
    // revers
    ctx.beginPath();
    ctx.moveTo(120 + s * 12, 160);
    ctx.lineTo(120 + s * 44, 170);
    ctx.lineTo(120 + s * 34, 226);
    ctx.lineTo(120 + s * 26, 250);
    ctx.lineTo(120 + s * 18, 198);
    ctx.closePath();
    fillGrad(ctx, 0, 160, 0, 250, [[0, LEATHER_LIGHT], [1, LEATHER]]);
    stroke(ctx, 2);
    ctx.setLineDash([3, 2.4]);
    ctx.beginPath();
    ctx.moveTo(120 + s * 14, 164); ctx.lineTo(120 + s * 41, 173); ctx.lineTo(120 + s * 32, 222);
    stroke(ctx, 1.1, STITCH);
    ctx.beginPath();
    ctx.moveTo(120 + s * 29, 252); ctx.lineTo(120 + s * 29, hem - 12);
    stroke(ctx, 1.1, STITCH);
    // poche passepoilée
    ctx.beginPath();
    ctx.moveTo(120 + s * 38, 288); ctx.lineTo(120 + s * 50, 316);
    stroke(ctx, 1.1, STITCH);
    ctx.setLineDash([]);
  }
  // bras en cuir : mains dans les poches par défaut
  const arm = (s: -1 | 1) => {
    let x1 = 120 + s * 50;
    let y1 = 316;
    let cxm = 120 + s * 88;
    let cym = 262;
    const wid = 30;
    if (pose === 'wave' && s === 1) { x1 = 208; y1 = 152; cxm = 208; cym = 222; }
    else if (pose === 'heart') { x1 = 120 + s * 16; y1 = 288; cxm = 120 + s * 80; cym = 262; }
    else if (pose === 'open') { x1 = 120 + s * 94; y1 = 318; cxm = 120 + s * 94; cym = 236; }
    const sx = 120 + s * 52;
    sleeve(ctx, sx, 200, cxm, cym, x1, y1, wid, LEATHER_LIGHT, LEATHER_DARK);
    // plis de coude
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    const mx = 0.25 * sx + 0.5 * cxm + 0.25 * x1;
    const my = 0.25 * 200 + 0.5 * cym + 0.25 * y1;
    ctx.moveTo(mx - s * 8, my - 6); ctx.lineTo(mx - s * 2, my + 8);
    ctx.stroke();
    const ang = endAngle(cxm, cym, x1, y1);
    cuff(ctx, x1, y1, ang, wid * 0.88, 12, '#2C1A13');
    if (pose === 'wave' && s === 1) hand(ctx, 209, 132, SKIN_A, 0, 11);
    else if (pose === 'open') hand(ctx, x1 + s * 4, y1 + 14, SKIN_A, 0, 10);
  };
  arm(-1);
  arm(1);
  if (pose === 'heart') {
    heartPath(ctx, 120, 296, 32);
    ctx.fillStyle = PAL.roseVif;
    ctx.fill();
    stroke(ctx, 2.2);
    gloss(ctx, 109, 285, 6, 3, 0.6, -0.6);
  }
  // tête
  ctx.save();
  ctx.translate(HEAD_X, HEAD_Y);
  ctx.scale(HEAD_K, HEAD_K);
  augusteFace(ctx, o);
  augusteHair(ctx);
  ctx.restore();
  ctx.restore();
}

// ============================================================ fabriques

export type Who = 'radia' | 'auguste';

/** Portrait sur un canvas (largeur `w` pixels, hauteur 1,2 × w). */
export function portraitCanvas(who: Who, o: FaceOpts & { sway?: number } = {}, w = 400): HTMLCanvasElement {
  const k = w / 400;
  return paint(400, 480, k, (ctx) => (who === 'radia' ? drawRadiaPortrait(ctx, o) : drawAugustePortrait(ctx, o)));
}

/** Personnage en pied sur un canvas (largeur `w`, hauteur 2,5 × w). */
export function fullCanvas(who: Who, o: FullOpts = {}, w = 240): HTMLCanvasElement {
  const k = w / 240;
  return paint(240, 600, k, (ctx) => (who === 'radia' ? drawRadiaFull(ctx, o) : drawAugusteFull(ctx, o)));
}

/** Petit médaillon rond (HUD) : tête seule. */
export function medallionCanvas(who: Who, o: FaceOpts = {}, size = 120): HTMLCanvasElement {
  return paint(size, size, 1, (ctx) => {
    const r = size / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r - 2, 0, Math.PI * 2);
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, who === 'radia' ? '#FFD9E5' : '#E4DAF8');
    g.addColorStop(1, who === 'radia' ? PAL.rose : PAL.lavande);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    const k = size / 300;
    ctx.translate(r, r + size * 0.12);
    ctx.scale(k, k);
    if (who === 'radia') {
      radiaHairBack(ctx, 0, R_HAIR_BOTTOM);
      radiaBust(ctx, o.outfit === 'stripes' ? 'stripes' : 'hoodie');
      radiaFace(ctx, o);
      radiaHairFront(ctx, 0, R_HAIR_BOTTOM);
      if (o.outfit === 'royal') crown(ctx, CROWN.x, CROWN.y, CROWN.s, CROWN.rot);
    } else { augusteBust(ctx); augusteFace(ctx, o); augusteHair(ctx); }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(r, r, r - 2.5, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  });
}

/** Couronne seule (icônes, effets). */
export function crownCanvas(size = 96): HTMLCanvasElement {
  return paint(size, size, 1, (ctx) => { crown(ctx, size / 2, size / 2 + 4, size / 110); });
}

export { starPath };
