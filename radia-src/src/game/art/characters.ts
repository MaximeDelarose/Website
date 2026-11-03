/**
 * Personnages dessinés en vectoriel (Canvas 2D) : Radia et Auguste.
 *
 * Fidélité aux références (photos fournies) :
 *  - Radia : cheveux bruns/châtains longs et volumineux, grands yeux bruns,
 *    sourcils foncés, visage ovale, lèvres bien dessinées, teint chaud,
 *    petit anneau au nez, et la petite marque pigmentée dans l'œil.
 *  - Auguste : jeune homme brun, cheveux courts un peu décoiffés, veste en
 *    cuir noire, tee-shirt noir, pantalon noir.
 *
 * Position de la marque dans l'œil : sur les photos de face, elle est dans
 * l'œil situé à GAUCHE DE L'IMAGE, au bord de l'iris, en bas à gauche
 * (vers « 8 heures »), à cheval sur le blanc de l'œil. Les portraits de face
 * la placent exactement là (EYE_MARK ci-dessous) et ne sont jamais retournés
 * en miroir. L'anneau au nez est, comme sur les photos, sur la narine située
 * à droite de l'image (NOSE_RING_SIDE).
 */
import { OUTLINE, PAL, ellipse, gloss, heartPath, paint, shade, starPath } from './kit';
import type { Expr } from '../../data/dialogue';

export const EYE_MARK = { eye: 'imageLeft' as const, angleDeg: 155, radius: 1.12 };
export const NOSE_RING_SIDE = 1; // +1 = droite de l'image

export type Outfit = 'hoodie' | 'stripes' | 'royal';
export interface FaceOpts { expr?: Expr; blink?: boolean; outfit?: Outfit; hood?: boolean }

const SKIN_R = '#D9A07C';
const SKIN_R_SHADOW = '#BF8360';
const SKIN_R_LIGHT = '#EDC2A1';
const HAIR_R = '#5A3A2B';
const HAIR_R_DARK = '#3D271D';
const HAIR_R_LIGHT = '#8A5A3E';
const IRIS_R = '#6B4128';

const SKIN_A = '#EECAAE';
const SKIN_A_SHADOW = '#D6A989';
const SKIN_A_LIGHT = '#F8DDC7';
const HAIR_A = '#4A3227';
const HAIR_A_DARK = '#2E1E17';
const HAIR_A_LIGHT = '#6E4C3A';
const IRIS_A = '#6A4A2E';

const LEATHER = '#2A2630';
const LEATHER_LIGHT = '#5E5868';
const HOODIE = '#2D2833';
const HOODIE_LIGHT = '#4A4354';

const LW = 3.2; // contour des portraits (repère 400 × 480)

// ============================================================ outils communs

function stroke(ctx: CanvasRenderingContext2D, w = LW, color: string = OUTLINE) {
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
function strand(ctx: CanvasRenderingContext2D, pts: [number, number][], width: number) {
  // pts : ligne centrale ; on construit un ruban effilé aux deux bouts
  const left: [number, number][] = [];
  const right: [number, number][] = [];
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
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) {
    const [x, y] = left[i];
    const [px, py] = left[i - 1];
    ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
  }
  ctx.lineTo(left[left.length - 1][0], left[left.length - 1][1]);
  for (let i = right.length - 1; i >= 0; i--) {
    const [x, y] = right[i];
    if (i === right.length - 1) ctx.lineTo(x, y);
    else { const [px, py] = right[i + 1]; ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2); }
  }
  ctx.closePath();
}

// ============================================================ yeux, bouche

interface EyeStyle { iris: string; lash: string; w: number; h: number; lashes: boolean }

function drawEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, side: -1 | 1, expr: Expr, blink: boolean, st: EyeStyle, mark: boolean) {
  const w = st.w;
  let h = st.h;
  if (expr === 'surprise') h *= 1.25;
  if (expr === 'love' || expr === 'tease') h *= 0.72;
  if (expr === 'shy') h *= 0.85;
  const closed = blink || expr === 'laugh';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(side, 1); // x local positif = coin extérieur de l'œil
  if (closed) {
    // œil fermé : arc souriant (rire) ou ligne douce (clignement)
    ctx.beginPath();
    if (expr === 'laugh') { ctx.moveTo(-w * 0.55, 2); ctx.quadraticCurveTo(0, -h * 0.75, w * 0.55, 2); }
    else { ctx.moveTo(-w * 0.55, 0); ctx.quadraticCurveTo(0, h * 0.45, w * 0.55, 0); }
    stroke(ctx, 3.6, st.lash);
    if (st.lashes) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5, expr === 'laugh' ? 0 : 1);
      ctx.lineTo(w * 0.7, expr === 'laugh' ? -5 : -3);
      stroke(ctx, 2.6, st.lash);
    }
    ctx.restore();
    return;
  }
  // blanc de l'œil (amande)
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
  // regard : vers le haut (surprise / amour), de côté (timide)
  let lookX = 0;
  let lookY = -h * 0.05;
  if (expr === 'shy') lookX = 4; // dans le repère de l'image
  if (expr === 'love') lookY = -h * 0.12;
  const ir = h * 0.62;
  const ix = lookX * side;
  // iris
  ctx.beginPath();
  ctx.arc(ix, lookY, ir, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(ix - ir * 0.2, lookY - ir * 0.3, ir * 0.2, ix, lookY, ir);
  g.addColorStop(0, shade(st.iris, 0.35));
  g.addColorStop(0.7, st.iris);
  g.addColorStop(1, shade(st.iris, -0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = shade(st.iris, -0.55);
  ctx.stroke();
  // pupille
  ctx.beginPath();
  ctx.arc(ix, lookY, ir * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#1F1410';
  ctx.fill();
  // marque pigmentée (Radia, œil à gauche de l'image)
  if (mark) {
    // On revient dans le repère de l'image (sans le miroir appliqué plus haut)
    // pour que l'angle soit celui de l'image et jamais inversé.
    ctx.save();
    ctx.scale(side, 1);
    const ixImg = ix * side;
    // angle mesuré dans l'image, y vers le bas : 150° = « 8 heures » (en bas à gauche)
    const a = (EYE_MARK.angleDeg * Math.PI) / 180;
    const mx = ixImg + Math.cos(a) * ir * EYE_MARK.radius;
    const my = lookY + Math.sin(a) * ir * EYE_MARK.radius;
    ctx.beginPath();
    ctx.ellipse(mx, my, ir * 0.34, ir * 0.27, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(110,62,34,0.55)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(mx, my, ir * 0.22, ir * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#3E1F10';
    ctx.fill();
    ctx.restore();
  }
  // reflets
  ctx.beginPath();
  ctx.arc(ix - ir * 0.3 * side, lookY - ir * 0.38, ir * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ix + ir * 0.32 * side, lookY + ir * 0.35, ir * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  // ombre de la paupière
  ctx.beginPath();
  ctx.moveTo(-w, top - 4);
  ctx.lineTo(w, top - 4);
  ctx.lineTo(w, top + h * 0.35);
  ctx.quadraticCurveTo(0, top + h * 0.1, -w, top + h * 0.35);
  ctx.closePath();
  ctx.fillStyle = 'rgba(120,70,60,0.18)';
  ctx.fill();
  ctx.restore();
  // contour : trait de cils épais en haut, fin en bas
  ctx.beginPath();
  ctx.moveTo(-w * 0.6, 1.5);
  ctx.bezierCurveTo(-w * 0.35, top - 0.5, w * 0.3, top - 1.5, w * 0.62, -h * 0.08);
  stroke(ctx, st.lashes ? 4 : 3.2, st.lash);
  if (st.lashes) {
    // petits cils extérieurs
    ctx.beginPath();
    ctx.moveTo(w * 0.5, -h * 0.25);
    ctx.quadraticCurveTo(w * 0.68, -h * 0.4, w * 0.78, -h * 0.62);
    ctx.moveTo(w * 0.36, -h * 0.4);
    ctx.quadraticCurveTo(w * 0.52, -h * 0.6, w * 0.58, -h * 0.8);
    stroke(ctx, 2.4, st.lash);
  }
  ctx.beginPath();
  ctx.moveTo(-w * 0.45, h * 0.18);
  ctx.bezierCurveTo(-w * 0.2, bot + 0.5, w * 0.25, bot + 0.5, w * 0.5, h * 0.05);
  stroke(ctx, 1.3, shade(st.lash, 0.25));
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
  ctx.beginPath();
  const arch = straight ? 3 : 7;
  ctx.moveTo(-19, 4 + tilt);
  ctx.quadraticCurveTo(-4, -arch - thick * 0.3 + tilt * 0.3, 21, 1 - (straight ? 1 : 0));
  ctx.quadraticCurveTo(4, -arch + thick + tilt * 0.3, -19, 4 + thick * 0.8 + tilt);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawMouth(ctx: CanvasRenderingContext2D, cy: number, expr: Expr, lip: string, female: boolean) {
  ctx.save();
  ctx.translate(0, cy);
  const dark = shade(lip, -0.35);
  const w = female ? 24 : 20;
  switch (expr) {
    case 'laugh':
    case 'smile': {
      const open = expr === 'laugh' ? 15 : 9;
      ctx.beginPath();
      ctx.moveTo(-w, -2);
      ctx.quadraticCurveTo(0, 3, w, -2);
      ctx.quadraticCurveTo(w * 0.6, open + 6, 0, open + 7);
      ctx.quadraticCurveTo(-w * 0.6, open + 6, -w, -2);
      ctx.closePath();
      ctx.fillStyle = '#7A3438';
      ctx.fill();
      // dents
      ctx.save();
      ctx.clip();
      ellipse(ctx, 0, 1, w * 0.85, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      if (expr === 'laugh') { ellipse(ctx, 0, open + 6, w * 0.45, 6); ctx.fillStyle = '#E07C86'; ctx.fill(); }
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-w, -2);
      ctx.quadraticCurveTo(0, 3, w, -2);
      ctx.quadraticCurveTo(w * 0.6, open + 6, 0, open + 7);
      ctx.quadraticCurveTo(-w * 0.6, open + 6, -w, -2);
      ctx.closePath();
      stroke(ctx, 2.4, dark);
      if (female) {
        // lèvre supérieure dessinée
        ctx.beginPath();
        ctx.moveTo(-w - 1, -2);
        ctx.quadraticCurveTo(-w * 0.5, -8, -4, -7);
        ctx.quadraticCurveTo(0, -5, 4, -7);
        ctx.quadraticCurveTo(w * 0.5, -8, w + 1, -2);
        ctx.quadraticCurveTo(0, 1, -w - 1, -2);
        ctx.fillStyle = lip;
        ctx.fill();
        stroke(ctx, 1.6, dark);
      }
      break;
    }
    case 'surprise': {
      ellipse(ctx, 0, 4, 8, 10);
      ctx.fillStyle = '#7A3438';
      ctx.fill();
      stroke(ctx, 2.4, dark);
      if (female) { ellipse(ctx, 0, 4, 11, 13); ctx.lineWidth = 3; ctx.strokeStyle = lip; ctx.stroke(); }
      break;
    }
    case 'sad': {
      ctx.beginPath();
      ctx.moveTo(-w * 0.7, 6);
      ctx.quadraticCurveTo(0, -3, w * 0.7, 6);
      stroke(ctx, 3, dark);
      break;
    }
    default: {
      // neutre / amour / taquin / timide : bouche fermée souriante
      const smirk = expr === 'tease' ? 4 : 0;
      if (female) {
        // lèvres pleines, arc de Cupidon
        ctx.beginPath();
        ctx.moveTo(-w, 1 + smirk * 0.3);
        ctx.quadraticCurveTo(-w * 0.55, -7, -5, -6);
        ctx.quadraticCurveTo(0, -3.5, 5, -6);
        ctx.quadraticCurveTo(w * 0.55, -7, w, 1 - smirk);
        ctx.quadraticCurveTo(w * 0.5, 13, 0, 13);
        ctx.quadraticCurveTo(-w * 0.5, 13, -w, 1 + smirk * 0.3);
        ctx.closePath();
        fillGrad(ctx, 0, -7, 0, 13, [[0, shade(lip, -0.08)], [0.5, lip], [1, shade(lip, 0.12)]]);
        stroke(ctx, 1.8, dark);
        ctx.beginPath();
        ctx.moveTo(-w + 1, 1 + smirk * 0.3);
        ctx.quadraticCurveTo(0, 5 - smirk * 0.4, w - 1, 1 - smirk);
        stroke(ctx, 2.2, dark);
        gloss(ctx, -5, 7, 6, 2, 0.45, 0);
      } else {
        ctx.beginPath();
        ctx.moveTo(-w * 0.8, 0 + smirk * 0.4);
        ctx.quadraticCurveTo(0, 6, w * 0.8, -2 - smirk);
        stroke(ctx, 3, dark);
        ctx.beginPath();
        ctx.moveTo(-w * 0.4, 7);
        ctx.quadraticCurveTo(0, 9, w * 0.4, 7);
        stroke(ctx, 1.4, shade(lip, -0.15));
      }
    }
  }
  ctx.restore();
}

function blush(ctx: CanvasRenderingContext2D, expr: Expr, strength = 1) {
  const a = (expr === 'love' || expr === 'shy' ? 0.42 : expr === 'laugh' || expr === 'smile' ? 0.28 : 0.18) * strength;
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(s * 46, 30, 0, s * 46, 30, 26);
    g.addColorStop(0, `rgba(255,120,140,${a})`);
    g.addColorStop(1, 'rgba(255,120,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s * 46, 30, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  if (expr === 'love' || expr === 'shy') {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(230,90,110,0.55)';
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(s * (36 + k * 7), 26);
      ctx.lineTo(s * (40 + k * 7), 33);
      ctx.stroke();
    }
  }
}

// ============================================================ RADIA

/** Trace une forme lisse passant par les milieux des segments (contour organique). */
function smoothPath(ctx: CanvasRenderingContext2D, pts: [number, number][], closed = true) {
  const n = pts.length;
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
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

const mirror = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [-x, y] as [number, number]).reverse();

function radiaBackHair(ctx: CanvasRenderingContext2D, sway = 0) {
  // Grande masse de cheveux longs, ondulés et volumineux (derrière la tête et les épaules).
  const w = sway;
  const right: [number, number][] = [
    [0, -140], [58, -134], [104, -104], [126, -56], [128, -6], [140, 34], [132, 78], [150 + w * 0.3, 118],
    [142 + w * 0.5, 160], [160 + w * 0.7, 202], [150 + w, 246], [164 + w, 282], [140 + w, 300],
    [124 + w, 284], [108 + w, 304], [90, 282], [70, 252], [40, 236],
  ];
  const pts = [...right, ...mirror(right).map(([x, y]) => [x + (y > 100 ? w * 0.6 : 0), y] as [number, number])];
  smoothPath(ctx, pts);
  fillGrad(ctx, -150, -140, 130, 300, [[0, HAIR_R_LIGHT], [0.35, HAIR_R], [1, HAIR_R_DARK]]);
  stroke(ctx);
  // vagues intérieures
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(40,24,16,0.42)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 112, 0);
    ctx.bezierCurveTo(s * 132, 60, s * 112, 110, s * 134 + w, 160);
    ctx.bezierCurveTo(s * 150 + w, 200, s * 130 + w, 240, s * 146 + w, 280);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 96, 70);
    ctx.bezierCurveTo(s * 110, 120, s * 94, 170, s * 112 + w, 210);
    ctx.bezierCurveTo(s * 124 + w, 240, s * 108, 262, s * 114 + w, 290);
    ctx.stroke();
  }
  // reflets châtains
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(200,140,95,0.38)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 104, -70);
    ctx.bezierCurveTo(s * 124, -20, s * 118, 40, s * 138 + w * 0.5, 100);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 128 + w, 170);
    ctx.quadraticCurveTo(s * 140 + w, 210, s * 132 + w, 250);
    ctx.stroke();
  }
}

function radiaFrontHair(ctx: CanvasRenderingContext2D, sway = 0) {
  const w = sway * 0.5;
  // Longues mèches qui encadrent le visage, jusqu'aux épaules
  for (const s of [-1, 1] as const) {
    const lock: [number, number][] = [
      [s * 74, -96], [s * 104, -60], [s * 114, 10], [s * 106, 60], [s * 118 + w, 112], [s * 104 + w, 162],
      [s * 112 + w, 196], [s * 92 + w, 214], [s * 88 + w, 176], [s * 80, 128], [s * 76, 80], [s * 70, 30], [s * 72, -14],
    ];
    smoothPath(ctx, lock);
    fillGrad(ctx, s * 70, -50, s * 116, 210, [[0, HAIR_R_LIGHT], [0.5, HAIR_R], [1, HAIR_R_DARK]]);
    stroke(ctx, 2.8);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(40,24,16,0.45)';
    ctx.beginPath();
    ctx.moveTo(s * 92, -20);
    ctx.bezierCurveTo(s * 100, 40, s * 88, 100, s * 100 + w, 170);
    ctx.stroke();
  }
  // Calotte avec raie sur le côté (à gauche de l'image)
  const cap: [number, number][] = [
    [-106, -24], [-104, -88], [-62, -132], [-4, -144], [62, -134], [104, -94], [110, -26],
    [96, -22], [80, -34], [68, -72], [34, -94], [-18, -100], [-54, -84], [-74, -52], [-80, -20],
  ];
  smoothPath(ctx, cap);
  fillGrad(ctx, -100, -140, 100, -20, [[0, HAIR_R_LIGHT], [0.5, HAIR_R], [1, HAIR_R_DARK]]);
  stroke(ctx);
  // Mèche balayée depuis la raie vers la droite de l'image (volume sur le front)
  const swoop: [number, number][] = [
    [-22, -104], [20, -112], [70, -92], [98, -48], [96, 4], [84, -6], [72, -46], [44, -76], [6, -90], [-20, -92],
  ];
  smoothPath(ctx, swoop);
  fillGrad(ctx, -20, -112, 96, 4, [[0, HAIR_R_LIGHT], [0.6, HAIR_R], [1, HAIR_R_DARK]]);
  stroke(ctx, 2.8);
  // fines mèches et reflet
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(40,24,16,0.4)';
  ctx.beginPath();
  ctx.moveTo(-10, -104); ctx.quadraticCurveTo(40, -100, 74, -54);
  ctx.moveTo(-26, -100); ctx.quadraticCurveTo(-64, -96, -86, -40);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(225,165,120,0.45)';
  ctx.beginPath();
  ctx.moveTo(-60, -118);
  ctx.quadraticCurveTo(-26, -136, 14, -130);
  ctx.moveTo(30, -106);
  ctx.quadraticCurveTo(62, -98, 80, -70);
  ctx.stroke();
}

function radiaFace(ctx: CanvasRenderingContext2D, o: FaceOpts) {
  const expr = o.expr ?? 'neutral';
  // cou
  ctx.beginPath();
  ctx.moveTo(-26, 60);
  ctx.lineTo(-28, 150);
  ctx.lineTo(28, 150);
  ctx.lineTo(26, 60);
  ctx.closePath();
  fillGrad(ctx, 0, 60, 0, 150, [[0, SKIN_R_SHADOW], [0.5, SKIN_R], [1, SKIN_R]]);
  stroke(ctx);
  // oreilles (à peine visibles sous les cheveux)
  for (const s of [-1, 1]) {
    ellipse(ctx, s * 76, 4, 10, 16);
    ctx.fillStyle = SKIN_R_SHADOW;
    ctx.fill();
    stroke(ctx, 2.4);
  }
  // visage ovale
  ctx.beginPath();
  ctx.moveTo(0, -100);
  ctx.bezierCurveTo(46, -100, 77, -72, 77, -22);
  ctx.bezierCurveTo(78, 24, 64, 60, 40, 84);
  ctx.bezierCurveTo(24, 98, 10, 103, 0, 103);
  ctx.bezierCurveTo(-10, 103, -24, 98, -40, 84);
  ctx.bezierCurveTo(-64, 60, -78, 24, -77, -22);
  ctx.bezierCurveTo(-77, -72, -46, -100, 0, -100);
  ctx.closePath();
  const g = ctx.createRadialGradient(-20, -30, 10, 0, 0, 120);
  g.addColorStop(0, SKIN_R_LIGHT);
  g.addColorStop(0.55, SKIN_R);
  g.addColorStop(1, SKIN_R_SHADOW);
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx);
  blush(ctx, expr);
  // yeux
  const eye: EyeStyle = { iris: IRIS_R, lash: '#1E1411', w: 36, h: 19, lashes: true };
  drawEye(ctx, -33, -4, -1, expr, !!o.blink, eye, EYE_MARK.eye === 'imageLeft');
  drawEye(ctx, 33, -4, 1, expr, !!o.blink, eye, false);
  // sourcils foncés
  drawBrow(ctx, -34, -32, -1, expr, '#2A1B15', 5);
  drawBrow(ctx, 34, -32, 1, expr, '#2A1B15', 5);
  // nez
  ctx.beginPath();
  ctx.moveTo(6, -2);
  ctx.quadraticCurveTo(10, 16, 12, 26);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(150,90,60,0.55)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, 30);
  ctx.quadraticCurveTo(-8, 36, -2, 33);
  ctx.moveTo(2, 33);
  ctx.quadraticCurveTo(8, 36, 12, 30);
  stroke(ctx, 2.4, '#8A5038');
  gloss(ctx, -2, 18, 3, 5, 0.35, 0);
  // anneau au nez (narine à droite de l'image)
  const rx = 12 * NOSE_RING_SIDE;
  ctx.beginPath();
  ctx.arc(rx, 34.5, 4.2, -Math.PI * 0.3, Math.PI * 1.2);
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = '#7C7C88';
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#EDEDF5';
  ctx.stroke();
  // bouche
  drawMouth(ctx, 60, expr, '#C27A76', true);
}

function radiaBody(ctx: CanvasRenderingContext2D, outfit: Outfit) {
  if (outfit === 'stripes') {
    // Chemise foncée à fines rayures, col ouvert
    ctx.beginPath();
    ctx.moveTo(-176, 480);
    ctx.bezierCurveTo(-182, 290, -146, 196, -60, 174);
    ctx.lineTo(0, 240);
    ctx.lineTo(60, 174);
    ctx.bezierCurveTo(146, 196, 182, 290, 176, 480);
    ctx.closePath();
    fillGrad(ctx, -170, 200, 170, 480, [[0, '#5A4740'], [0.5, '#3E302C'], [1, '#2C221F']]);
    stroke(ctx);
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(245,232,215,0.75)';
    for (let x = -180; x <= 180; x += 13) {
      ctx.beginPath();
      ctx.moveTo(x, 190);
      ctx.quadraticCurveTo(x * 1.08, 330, x * 1.15, 490);
      ctx.stroke();
    }
    ctx.restore();
    // décolleté (peau)
    ctx.beginPath();
    ctx.moveTo(-28, 150);
    ctx.lineTo(-52, 205);
    ctx.lineTo(0, 268);
    ctx.lineTo(52, 205);
    ctx.lineTo(28, 150);
    ctx.closePath();
    fillGrad(ctx, 0, 150, 0, 268, [[0, SKIN_R_SHADOW], [1, SKIN_R]]);
    // col
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 30, 150);
      ctx.lineTo(s * 74, 196);
      ctx.lineTo(s * 40, 238);
      ctx.lineTo(s * 4, 268);
      ctx.lineTo(s * 52, 205);
      ctx.closePath();
      ctx.fillStyle = '#4A3A35';
      ctx.fill();
      stroke(ctx, 2.6);
    }
    return;
  }
  // Sweat noir à capuche (capuche baissée derrière la nuque)
  ctx.beginPath();
  ctx.moveTo(-112, 190);
  ctx.bezierCurveTo(-118, 150, -64, 138, 0, 138);
  ctx.bezierCurveTo(64, 138, 118, 150, 112, 190);
  ctx.closePath();
  fillGrad(ctx, 0, 138, 0, 196, [[0, '#3A3442'], [1, '#221E28']]);
  stroke(ctx);
  ctx.beginPath();
  ctx.moveTo(-178, 480);
  ctx.bezierCurveTo(-184, 290, -156, 196, -50, 168);
  ctx.quadraticCurveTo(0, 190, 50, 168);
  ctx.bezierCurveTo(156, 196, 184, 290, 178, 480);
  ctx.closePath();
  fillGrad(ctx, -170, 190, 170, 480, [[0, HOODIE_LIGHT], [0.45, HOODIE], [1, '#1E1A23']]);
  stroke(ctx);
  // col rond + cordons
  ctx.beginPath();
  ctx.moveTo(-50, 168);
  ctx.quadraticCurveTo(0, 206, 50, 168);
  stroke(ctx, 3, '#151219');
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = '#8E8798';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 18, 192);
    ctx.quadraticCurveTo(s * 22, 246, s * 16, 294);
    ctx.stroke();
    ellipse(ctx, s * 16, 298, 3.5, 6);
    ctx.fillStyle = '#B9B2C2';
    ctx.fill();
  }
  // plis
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(-120, 330); ctx.quadraticCurveTo(-100, 380, -112, 440);
  ctx.moveTo(122, 330); ctx.quadraticCurveTo(104, 380, 114, 440);
  ctx.stroke();
}

function crown(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-40, 18);
  ctx.lineTo(-46, -18);
  ctx.lineTo(-22, 2);
  ctx.lineTo(0, -30);
  ctx.lineTo(22, 2);
  ctx.lineTo(46, -18);
  ctx.lineTo(40, 18);
  ctx.quadraticCurveTo(0, 26, -40, 18);
  ctx.closePath();
  fillGrad(ctx, 0, -30, 0, 22, [[0, '#FFE7A0'], [0.5, PAL.or], [1, PAL.orDeep]]);
  stroke(ctx, 3);
  for (const [x, y, c] of [[0, 8, PAL.roseVif], [-24, 11, PAL.lavande], [24, 11, PAL.lavande]] as const) {
    heartPath(ctx, x, y, 11);
    ctx.fillStyle = c;
    ctx.fill();
    stroke(ctx, 1.6);
  }
  for (const [x, y] of [[-46, -18], [0, -30], [46, -18]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF4D0';
    ctx.fill();
    stroke(ctx, 2);
  }
  gloss(ctx, -18, -2, 8, 3, 0.55, -0.3);
  ctx.restore();
}

/** Radia : portrait (buste) dans un repère 400 × 480. */
export function drawRadiaPortrait(ctx: CanvasRenderingContext2D, o: FaceOpts & { sway?: number } = {}) {
  const outfit = o.outfit ?? 'hoodie';
  ctx.save();
  ctx.translate(200, 200);
  radiaBackHair(ctx, o.sway ?? 0);
  radiaBody(ctx, outfit === 'royal' ? 'hoodie' : outfit);
  radiaFace(ctx, o);
  radiaFrontHair(ctx, o.sway ?? 0);
  if (outfit === 'royal') crown(ctx, -6, -138, 1.05);
  ctx.restore();
}

// ============================================================ AUGUSTE

function augusteHair(ctx: CanvasRenderingContext2D) {
  // cheveux courts, volume sur le dessus, un peu décoiffés
  ctx.beginPath();
  ctx.moveTo(-74, -10);
  ctx.bezierCurveTo(-86, -70, -60, -118, -10, -124);
  ctx.bezierCurveTo(30, -132, 74, -110, 82, -60);
  ctx.bezierCurveTo(86, -36, 80, -18, 74, -6);
  ctx.quadraticCurveTo(72, -40, 60, -58);
  ctx.quadraticCurveTo(40, -66, 30, -80);
  ctx.quadraticCurveTo(8, -64, -26, -74);
  ctx.quadraticCurveTo(-40, -60, -58, -62);
  ctx.quadraticCurveTo(-68, -40, -74, -10);
  ctx.closePath();
  fillGrad(ctx, -80, -130, 80, 0, [[0, HAIR_A_LIGHT], [0.5, HAIR_A], [1, HAIR_A_DARK]]);
  stroke(ctx);
  // mèches rebelles
  const tufts: [number, number][][] = [
    [[-14, -96], [-28, -80], [-26, -58]],
    [[18, -92], [34, -72], [30, -50]],
    [[54, -110], [72, -110], [82, -96]],
    [[-48, -116], [-62, -118], [-72, -106]],
  ];
  for (const t of tufts) {
    strand(ctx, t, 22);
    fillGrad(ctx, t[0][0], t[0][1], t[2][0], t[2][1], [[0, HAIR_A], [1, HAIR_A_LIGHT]]);
    stroke(ctx, 2.4);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(20,12,8,0.5)';
  ctx.beginPath();
  ctx.moveTo(-50, -100); ctx.quadraticCurveTo(-30, -90, -20, -76);
  ctx.moveTo(10, -112); ctx.quadraticCurveTo(26, -98, 30, -82);
  ctx.moveTo(48, -110); ctx.quadraticCurveTo(64, -90, 66, -64);
  ctx.stroke();
}

function augusteFace(ctx: CanvasRenderingContext2D, o: FaceOpts) {
  const expr = o.expr ?? 'neutral';
  // cou
  ctx.beginPath();
  ctx.moveTo(-28, 60);
  ctx.lineTo(-30, 150);
  ctx.lineTo(30, 150);
  ctx.lineTo(28, 60);
  ctx.closePath();
  fillGrad(ctx, 0, 60, 0, 150, [[0, SKIN_A_SHADOW], [0.5, SKIN_A], [1, SKIN_A]]);
  stroke(ctx);
  // oreilles
  for (const s of [-1, 1]) {
    ellipse(ctx, s * 76, 0, 11, 18);
    ctx.fillStyle = SKIN_A_SHADOW;
    ctx.fill();
    stroke(ctx, 2.6);
  }
  // visage plus allongé, mâchoire marquée
  ctx.beginPath();
  ctx.moveTo(0, -104);
  ctx.bezierCurveTo(44, -104, 74, -78, 75, -26);
  ctx.bezierCurveTo(76, 20, 70, 52, 52, 78);
  ctx.bezierCurveTo(36, 98, 16, 108, 0, 108);
  ctx.bezierCurveTo(-16, 108, -36, 98, -52, 78);
  ctx.bezierCurveTo(-70, 52, -76, 20, -75, -26);
  ctx.bezierCurveTo(-74, -78, -44, -104, 0, -104);
  ctx.closePath();
  const g = ctx.createRadialGradient(-20, -30, 10, 0, 0, 125);
  g.addColorStop(0, SKIN_A_LIGHT);
  g.addColorStop(0.55, SKIN_A);
  g.addColorStop(1, SKIN_A_SHADOW);
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx);
  blush(ctx, expr, 0.8);
  const eye: EyeStyle = { iris: IRIS_A, lash: '#22160F', w: 30, h: 15, lashes: false };
  drawEye(ctx, -31, -4, -1, expr, !!o.blink, eye, false);
  drawEye(ctx, 31, -4, 1, expr, !!o.blink, eye, false);
  drawBrow(ctx, -32, -30, -1, expr, '#2E1F17', 6.5, true);
  drawBrow(ctx, 32, -30, 1, expr, '#2E1F17', 6.5, true);
  // nez plus long, arête marquée
  ctx.beginPath();
  ctx.moveTo(4, -12);
  ctx.quadraticCurveTo(12, 14, 14, 30);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(150,100,75,0.6)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-13, 33);
  ctx.quadraticCurveTo(-7, 40, 0, 37);
  ctx.quadraticCurveTo(7, 40, 13, 33);
  stroke(ctx, 2.4, '#94654C');
  drawMouth(ctx, 62, expr, '#C88E84', false);
  // ombre de barbe légère
  ctx.beginPath();
  ctx.moveTo(-50, 70);
  ctx.bezierCurveTo(-30, 102, 30, 102, 50, 70);
  ctx.bezierCurveTo(30, 88, -30, 88, -50, 70);
  ctx.fillStyle = 'rgba(90,60,45,0.08)';
  ctx.fill();
}

function augusteBody(ctx: CanvasRenderingContext2D) {
  // tee-shirt noir
  ctx.beginPath();
  ctx.moveTo(-60, 190);
  ctx.quadraticCurveTo(0, 175, 60, 190);
  ctx.lineTo(60, 480);
  ctx.lineTo(-60, 480);
  ctx.closePath();
  fillGrad(ctx, 0, 180, 0, 480, [[0, '#2B2830'], [1, '#18161B']]);
  stroke(ctx);
  ctx.beginPath();
  ctx.moveTo(-34, 150);
  ctx.quadraticCurveTo(0, 196, 34, 150);
  ctx.lineTo(42, 168);
  ctx.quadraticCurveTo(0, 214, -42, 168);
  ctx.closePath();
  ctx.fillStyle = '#1D1A21';
  ctx.fill();
  stroke(ctx, 2.4);
  // veste en cuir noire
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 180, 480);
    ctx.bezierCurveTo(s * 186, 300, s * 156, 214, s * 64, 180);
    ctx.lineTo(s * 40, 160);
    ctx.lineTo(s * 30, 200);
    ctx.lineTo(s * 70, 260);
    ctx.lineTo(s * 52, 330);
    ctx.lineTo(s * 58, 480);
    ctx.closePath();
    fillGrad(ctx, s * 180, 180, s * 40, 480, [[0, '#1C1A21'], [0.5, LEATHER], [1, '#3A3542']]);
    stroke(ctx);
    // revers (col)
    ctx.beginPath();
    ctx.moveTo(s * 40, 160);
    ctx.lineTo(s * 98, 186);
    ctx.lineTo(s * 84, 238);
    ctx.lineTo(s * 70, 260);
    ctx.lineTo(s * 30, 200);
    ctx.closePath();
    fillGrad(ctx, s * 40, 160, s * 90, 260, [[0, '#4A4552'], [1, '#26232B']]);
    stroke(ctx, 2.8);
    // reflets du cuir
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(200,195,215,0.28)';
    ctx.beginPath();
    ctx.moveTo(s * 150, 250);
    ctx.quadraticCurveTo(s * 134, 330, s * 144, 420);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(220,215,235,0.35)';
    ctx.beginPath();
    ctx.moveTo(s * 120, 214);
    ctx.quadraticCurveTo(s * 112, 240, s * 116, 270);
    ctx.stroke();
  }
  // fermeture éclair
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#A9A3B3';
  ctx.beginPath();
  ctx.moveTo(56, 340);
  ctx.lineTo(58, 470);
  ctx.stroke();
  void LEATHER_LIGHT;
}

/** Auguste : portrait (buste) dans un repère 400 × 480. */
export function drawAugustePortrait(ctx: CanvasRenderingContext2D, o: FaceOpts = {}) {
  ctx.save();
  ctx.translate(200, 200);
  augusteBody(ctx);
  augusteFace(ctx, o);
  augusteHair(ctx);
  ctx.restore();
}

// ============================================================ corps entiers

export interface FullOpts extends FaceOpts { step?: number; arms?: 'down' | 'wave' | 'heart' | 'open' }

/**
 * Personnage en pied, dans un repère 240 × 600 (pieds en bas, y = 590).
 * `step` (-1..1) écarte les jambes pour la marche.
 */
export function drawRadiaFull(ctx: CanvasRenderingContext2D, o: FullOpts = {}) {
  const outfit = o.outfit ?? 'hoodie';
  const st = o.step ?? 0;
  ctx.save();
  // cheveux longs derrière le corps
  ctx.save();
  ctx.translate(120, 120);
  ctx.scale(0.56, 0.56);
  radiaBackHair(ctx, st * 4);
  ctx.restore();
  // jambes (pantalon sombre ou large pour la tenue rayée)
  const wide = outfit === 'stripes';
  const pant = wide ? '#5B5250' : '#2A2530';
  for (const s of [-1, 1] as const) {
    const off = st * s * 14;
    ctx.beginPath();
    ctx.moveTo(120 + s * 6, 360);
    ctx.lineTo(120 + s * (wide ? 40 : 34), 360);
    ctx.lineTo(120 + s * (wide ? 44 : 30) + off, 572);
    ctx.lineTo(120 + s * (wide ? 6 : 10) + off, 572);
    ctx.closePath();
    fillGrad(ctx, 100, 360, 140, 572, [[0, shade(pant, 0.2)], [1, shade(pant, -0.15)]]);
    stroke(ctx, 2.6);
    // chaussures (rouges avec la tenue rayée)
    ellipse(ctx, 120 + s * 22 + off + s * 4, 578, 20, 9);
    ctx.fillStyle = wide ? '#E0424A' : '#23202A';
    ctx.fill();
    stroke(ctx, 2.4);
  }
  // sac noir sur l'épaule
  if (outfit !== 'stripes') {
    ctx.beginPath();
    ctx.moveTo(84, 230);
    ctx.quadraticCurveTo(150, 280, 174, 362);
    stroke(ctx, 4, '#151219');
  }
  // torse
  ctx.beginPath();
  ctx.moveTo(62, 380);
  ctx.bezierCurveTo(56, 300, 62, 236, 92, 214);
  ctx.quadraticCurveTo(120, 204, 148, 214);
  ctx.bezierCurveTo(178, 236, 184, 300, 178, 380);
  ctx.closePath();
  if (wide) {
    fillGrad(ctx, 60, 210, 180, 380, [[0, '#5A4740'], [1, '#2C221F']]);
    stroke(ctx, 2.8);
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(245,232,215,0.75)';
    for (let x = 56; x < 190; x += 8) { ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x + 4, 390); ctx.stroke(); }
    ctx.restore();
  } else {
    fillGrad(ctx, 60, 210, 180, 380, [[0, HOODIE_LIGHT], [0.5, HOODIE], [1, '#1E1A23']]);
    stroke(ctx, 2.8);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#8E8798';
    ctx.beginPath(); ctx.moveTo(112, 226); ctx.lineTo(110, 262); ctx.moveTo(128, 226); ctx.lineTo(130, 262); ctx.stroke();
    // poche ventrale
    ctx.beginPath(); ctx.moveTo(84, 330); ctx.lineTo(156, 330); ctx.lineTo(164, 372); ctx.lineTo(76, 372); ctx.closePath();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();
  }
  // bras
  const arm = (s: -1 | 1, pose: FullOpts['arms']) => {
    ctx.beginPath();
    if (pose === 'wave' && s === 1) {
      ctx.moveTo(170, 226); ctx.quadraticCurveTo(204, 200, 206, 150);
    } else if (pose === 'heart') {
      ctx.moveTo(120 + s * 50, 226); ctx.quadraticCurveTo(120 + s * 60, 280, 120 + s * 14, 300);
    } else if (pose === 'open') {
      ctx.moveTo(120 + s * 50, 226); ctx.quadraticCurveTo(120 + s * 86, 270, 120 + s * 96, 320);
    } else {
      ctx.moveTo(120 + s * 50, 226); ctx.quadraticCurveTo(120 + s * 64, 300, 120 + s * 58 - st * s * 6, 368);
    }
    ctx.lineWidth = 26;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 21;
    ctx.strokeStyle = wide ? '#4A3A35' : HOODIE;
    ctx.stroke();
  };
  arm(-1, o.arms);
  arm(1, o.arms);
  // mains
  const hand = (x: number, y: number) => { ellipse(ctx, x, y, 10, 11); ctx.fillStyle = SKIN_R; ctx.fill(); stroke(ctx, 2.2); };
  if (o.arms === 'wave') { hand(206, 142); hand(62 - st * 6, 372); }
  else if (o.arms === 'heart') { heartPath(ctx, 120, 300, 30); ctx.fillStyle = PAL.roseVif; ctx.fill(); stroke(ctx, 2.4); }
  else if (o.arms === 'open') { hand(24, 324); hand(216, 324); }
  else { hand(62 + st * 6, 372); hand(178 - st * 6, 372); }
  if (outfit !== 'stripes') {
    // sac
    ctx.beginPath();
    ctx.moveTo(158, 352); ctx.quadraticCurveTo(176, 340, 196, 352); ctx.lineTo(192, 392); ctx.quadraticCurveTo(174, 400, 160, 392); ctx.closePath();
    fillGrad(ctx, 158, 340, 196, 400, [[0, '#3A3540'], [1, '#141217']]);
    stroke(ctx, 2.4);
    gloss(ctx, 170, 356, 7, 2.5, 0.35, 0);
  }
  // tête (portrait réduit)
  ctx.save();
  ctx.translate(120, 120);
  ctx.scale(0.56, 0.56);
  radiaFace(ctx, o);
  radiaFrontHair(ctx, (o.step ?? 0) * 4);
  if (outfit === 'royal') crown(ctx, -6, -138, 1.05);
  ctx.restore();
  ctx.restore();
}

export function drawAugusteFull(ctx: CanvasRenderingContext2D, o: FullOpts = {}) {
  const st = o.step ?? 0;
  ctx.save();
  for (const s of [-1, 1] as const) {
    const off = st * s * 14;
    ctx.beginPath();
    ctx.moveTo(120 + s * 4, 360);
    ctx.lineTo(120 + s * 36, 360);
    ctx.lineTo(120 + s * 32 + off, 572);
    ctx.lineTo(120 + s * 8 + off, 572);
    ctx.closePath();
    fillGrad(ctx, 100, 360, 140, 572, [[0, '#35313B'], [1, '#17151A']]);
    stroke(ctx, 2.6);
    ellipse(ctx, 120 + s * 22 + off + s * 4, 578, 21, 9);
    ctx.fillStyle = '#1A181D';
    ctx.fill();
    stroke(ctx, 2.4);
  }
  // tee-shirt
  ctx.beginPath();
  ctx.moveTo(90, 372); ctx.lineTo(92, 220); ctx.lineTo(148, 220); ctx.lineTo(150, 372); ctx.closePath();
  ctx.fillStyle = '#211E25';
  ctx.fill();
  stroke(ctx, 2.4);
  // veste en cuir
  for (const s of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(120 + s * 12, 220);
    ctx.lineTo(120 + s * 32, 206);
    ctx.bezierCurveTo(120 + s * 62, 212, 120 + s * 66, 280, 120 + s * 62, 382);
    ctx.lineTo(120 + s * 24, 382);
    ctx.lineTo(120 + s * 22, 290);
    ctx.closePath();
    fillGrad(ctx, 120 + s * 60, 206, 120 + s * 20, 382, [[0, '#1C1A21'], [0.5, LEATHER], [1, '#3A3542']]);
    stroke(ctx, 2.8);
    ctx.beginPath();
    ctx.moveTo(120 + s * 14, 212); ctx.lineTo(120 + s * 40, 222); ctx.lineTo(120 + s * 30, 262); ctx.lineTo(120 + s * 22, 288); ctx.closePath();
    ctx.fillStyle = '#4A4552';
    ctx.fill();
    stroke(ctx, 2.2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(200,195,215,0.3)';
    ctx.beginPath(); ctx.moveTo(120 + s * 52, 250); ctx.quadraticCurveTo(120 + s * 48, 300, 120 + s * 52, 360); ctx.stroke();
  }
  const arm = (s: -1 | 1, pose: FullOpts['arms']) => {
    ctx.beginPath();
    if (pose === 'wave' && s === 1) { ctx.moveTo(176, 228); ctx.quadraticCurveTo(210, 200, 210, 150); }
    else if (pose === 'heart') { ctx.moveTo(120 + s * 54, 228); ctx.quadraticCurveTo(120 + s * 62, 280, 120 + s * 14, 300); }
    else if (pose === 'open') { ctx.moveTo(120 + s * 54, 228); ctx.quadraticCurveTo(120 + s * 90, 270, 120 + s * 100, 322); }
    else { ctx.moveTo(120 + s * 54, 228); ctx.quadraticCurveTo(120 + s * 68, 300, 120 + s * 60 - st * s * 6, 372); }
    ctx.lineWidth = 29;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 24;
    ctx.strokeStyle = LEATHER;
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(200,195,215,0.25)';
    ctx.stroke();
  };
  arm(-1, o.arms);
  arm(1, o.arms);
  const hand = (x: number, y: number) => { ellipse(ctx, x, y, 11, 12); ctx.fillStyle = SKIN_A; ctx.fill(); stroke(ctx, 2.2); };
  if (o.arms === 'wave') { hand(210, 142); hand(60 - st * 6, 376); }
  else if (o.arms === 'heart') { heartPath(ctx, 120, 300, 32); ctx.fillStyle = PAL.roseVif; ctx.fill(); stroke(ctx, 2.4); }
  else if (o.arms === 'open') { hand(20, 326); hand(220, 326); }
  else { hand(60 + st * 6, 376); hand(180 - st * 6, 376); }
  ctx.save();
  ctx.translate(120, 114);
  ctx.scale(0.62, 0.62);
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
    if (who === 'radia') { radiaBackHair(ctx); radiaBody(ctx, o.outfit === 'stripes' ? 'stripes' : 'hoodie'); radiaFace(ctx, o); radiaFrontHair(ctx); if (o.outfit === 'royal') crown(ctx, -6, -138, 1.05); }
    else { augusteBody(ctx); augusteFace(ctx, o); augusteHair(ctx); }
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
