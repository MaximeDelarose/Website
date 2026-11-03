/**
 * Trois personnages FICTIFS en dessin cartoon (style RADIA : contour chocolat,
 * dégradés doux, reflet en haut à gauche), aux tenues sages. Aucun prénom ni âge
 * dans le dessin. `kid1` : très jeune enfant (grosse tête, petite taille) ;
 * `kid2` et `kid3` : préadolescentes de tailles et de coiffures différentes.
 */
import { PAL, OUTLINE, shade, ellipse, fillShaded, gloss, groundShadow, heartPath, roundRect } from '../kit';
import type { KidId } from '../../../data/world/ids';

export type KidPose = 'idle' | 'wave' | 'happy' | 'play' | 'think';
type Ctx = CanvasRenderingContext2D;

interface Spec {
  R: number; torso: number; leg: number; bodyW: number;
  skin: string; hair: string; top: string; topDark: string; bottom: string; shoes: string; accent: string;
}
const SPEC: Record<KidId, Spec> = {
  kid1: { R: 17, torso: 21, leg: 14, bodyW: 25, skin: '#F3C7A0', hair: '#94603E', top: '#FFB997', topDark: '#F29A78', bottom: '#FFF4E8', shoes: '#E8558F', accent: '#FF75A8' },
  kid2: { R: 13, torso: 30, leg: 40, bodyW: 26, skin: '#EDBB92', hair: '#3F2B27', top: '#B9A5E8', topDark: '#9A86CF', bottom: '#7F98C9', shoes: '#FFF9EE', accent: '#F3C86B' },
  kid3: { R: 13, torso: 27, leg: 34, bodyW: 25, skin: '#F0C09A', hair: '#7A4B2F', top: '#9ECB9A', topDark: '#7FB07C', bottom: '#FFF1DE', shoes: '#8A5A44', accent: '#F5B5C8' },
};

const LW = 2.1;
const lim = (ctx: Ctx, lw = LW) => { ctx.lineWidth = lw; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; };

function limb(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, color: string): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.lineWidth = width + LW * 1.6; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
  ctx.lineWidth = Math.max(1, width * 0.22); ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(x0 - width * 0.18, y0); ctx.lineTo(x1 - width * 0.18, y1); ctx.stroke();
  ctx.restore();
}

/** Bras en deux segments ; angles depuis la verticale basse, positifs vers l'extérieur (côté `s`). */
function arm(ctx: Ctx, sp: Spec, s: -1 | 1, sx: number, sy: number, a1: number, a2: number, len: number, sleeve: string, bare = false): { hx: number; hy: number } {
  const w = Math.max(5, sp.R * 0.5);
  const ex = sx + s * Math.sin(a1) * len * 0.5;
  const ey = sy + Math.cos(a1) * len * 0.5;
  const hx = ex + s * Math.sin(a2) * len * 0.5;
  const hy = ey + Math.cos(a2) * len * 0.5;
  limb(ctx, sx, sy, ex, ey, w, sleeve);
  limb(ctx, ex, ey, hx, hy, w * 0.86, bare ? sp.skin : sleeve);
  ctx.beginPath(); ctx.arc(hx, hy, w * 0.62, 0, Math.PI * 2);
  fillShaded(ctx, sp.skin, { x: hx - w, y: hy - w, w: w * 2, h: w * 2 }, LW * 0.9, { light: 0.15, dark: 0.1 });
  return { hx, hy };
}

function eyes(ctx: Ctx, R: number, mood: 'open' | 'happy' | 'up', blink: boolean): void {
  for (const s of [-1, 1] as const) {
    const ex = s * R * 0.4;
    const ey = R * 0.08;
    if (mood === 'happy' || blink) {
      ctx.beginPath(); ctx.arc(ex, ey + (mood === 'happy' ? R * 0.1 : 0), R * 0.17, Math.PI * (mood === 'happy' ? 1.1 : 0.1), Math.PI * (mood === 'happy' ? 1.9 : 0.9));
      ctx.lineWidth = 2; ctx.strokeStyle = '#3B2A28'; ctx.stroke();
      continue;
    }
    ellipse(ctx, ex, ey, R * 0.17, R * 0.24); ctx.fillStyle = '#3B2A28'; ctx.fill();
    const up = mood === 'up' ? -R * 0.06 : 0;
    ellipse(ctx, ex - R * 0.05, ey - R * 0.09 + up, R * 0.07, R * 0.09); ctx.fillStyle = '#fff'; ctx.fill();
    ellipse(ctx, ex + R * 0.05, ey + R * 0.1, R * 0.03, R * 0.035); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey - R * 0.02, R * 0.2, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 1.8; ctx.strokeStyle = '#2B1D1B'; ctx.stroke();
  }
}

function face(ctx: Ctx, sp: Spec, pose: KidPose, t: number): void {
  const R = sp.R;
  const blink = (t % 3.9) < 0.12;
  const mood = pose === 'happy' ? 'happy' : pose === 'think' ? 'up' : 'open';
  eyes(ctx, R, mood, blink);
  // sourcils
  ctx.lineWidth = 1.5; ctx.strokeStyle = shade(sp.hair, -0.2);
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * R * 0.24, -R * 0.3); ctx.quadraticCurveTo(s * R * 0.42, -R * (pose === 'think' && s > 0 ? 0.52 : 0.42), s * R * 0.6, -R * 0.28); ctx.stroke();
  }
  // joues, nez, bouche
  ctx.fillStyle = 'rgba(245,139,166,0.4)';
  ellipse(ctx, -R * 0.62, R * 0.38, R * 0.17, R * 0.1); ctx.fill();
  ellipse(ctx, R * 0.62, R * 0.38, R * 0.17, R * 0.1); ctx.fill();
  ctx.beginPath(); ctx.arc(0, R * 0.3, R * 0.04, 0, 7); ctx.fillStyle = 'rgba(160,100,80,0.7)'; ctx.fill();
  ctx.lineWidth = 1.6; ctx.strokeStyle = '#8C4A4A';
  ctx.beginPath();
  if (pose === 'happy' || pose === 'wave') { ctx.arc(0, R * 0.42, R * 0.2, 0.1, Math.PI - 0.1); ctx.fillStyle = pose === 'happy' ? '#B5485E' : 'rgba(0,0,0,0)'; if (pose === 'happy') ctx.fill(); ctx.stroke(); }
  else if (pose === 'think') { ctx.moveTo(-R * 0.1, R * 0.54); ctx.quadraticCurveTo(R * 0.04, R * 0.5, R * 0.14, R * 0.54); ctx.stroke(); }
  else { ctx.arc(0, R * 0.4, R * 0.15, 0.2, Math.PI - 0.2); ctx.stroke(); }
}

function headBase(ctx: Ctx, sp: Spec): void {
  const R = sp.R;
  ellipse(ctx, 0, 0, R * 1.0, R * 1.02);
  fillShaded(ctx, sp.skin, { x: -R, y: -R, w: R * 2, h: R * 2 }, LW, { light: 0.16, dark: 0.1 });
}

function bow(ctx: Ctx, x: number, y: number, s: number, color: string, rot = 0): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * s * 1.1, -s * 0.9, d * s * 1.35, 0); ctx.quadraticCurveTo(d * s * 1.1, s * 0.9, 0, 0);
    fillShaded(ctx, color, { x: d * s * 0.7 - s * 0.7, y: -s, w: s * 1.4, h: s * 2 }, 1.7, { light: 0.25, dark: 0.15 });
  }
  ctx.beginPath(); ctx.arc(0, 0, s * 0.38, 0, 7); fillShaded(ctx, shade(color, -0.12), { x: -s * 0.4, y: -s * 0.4, w: s * 0.8, h: s * 0.8 }, 1.5);
  ctx.restore();
}

// ---------------------------------------------------------------- cheveux
function hairBack(ctx: Ctx, kid: KidId, sp: Spec, t: number): void {
  const R = sp.R;
  const sway = Math.sin(t * 1.7) * 1.4;
  if (kid === 'kid1') {
    for (const s of [-1, 1]) { // couettes
      ctx.beginPath();
      ctx.moveTo(s * R * 0.7, -R * 0.6);
      ctx.bezierCurveTo(s * R * 1.7, -R * 0.5 + sway, s * R * 1.8, R * 0.7, s * R * 1.3 + sway * s, R * 1.4);
      ctx.bezierCurveTo(s * R * 1.0, R * 0.9, s * R * 0.9, R * 0.3, s * R * 0.7, R * 0.1);
      ctx.closePath();
      fillShaded(ctx, sp.hair, { x: -R * 2, y: -R, w: R * 4, h: R * 2.5 }, LW, { light: 0.22, dark: 0.12 });
    }
  } else if (kid === 'kid2') { // longs cheveux
    ctx.beginPath();
    ctx.moveTo(-R * 1.05, -R * 0.3);
    ctx.bezierCurveTo(-R * 1.5, R * 0.8, -R * 1.5, R * 2.2, -R * 1.0 + sway, R * 3.1);
    ctx.quadraticCurveTo(0, R * 3.4, R * 1.0 + sway, R * 3.1);
    ctx.bezierCurveTo(R * 1.5, R * 2.2, R * 1.5, R * 0.8, R * 1.05, -R * 0.3);
    ctx.closePath();
    fillShaded(ctx, sp.hair, { x: -R * 1.5, y: -R, w: R * 3, h: R * 4.4 }, LW, { light: 0.2, dark: 0.1 });
  } else { // carré mi-long
    ctx.beginPath();
    ctx.moveTo(-R * 1.1, -R * 0.2);
    ctx.bezierCurveTo(-R * 1.5, R * 0.6, -R * 1.4, R * 1.3, -R * 1.0, R * 1.6);
    ctx.quadraticCurveTo(0, R * 1.9 + sway * 0.3, R * 1.0, R * 1.6);
    ctx.bezierCurveTo(R * 1.4, R * 1.3, R * 1.5, R * 0.6, R * 1.1, -R * 0.2);
    ctx.closePath();
    fillShaded(ctx, sp.hair, { x: -R * 1.5, y: -R, w: R * 3, h: R * 3 }, LW, { light: 0.2, dark: 0.1 });
  }
}

function hairFront(ctx: Ctx, kid: KidId, sp: Spec): void {
  const R = sp.R;
  // calotte
  ctx.beginPath();
  ctx.moveTo(-R * 1.06, R * 0.05);
  ctx.bezierCurveTo(-R * 1.25, -R * 1.2, -R * 0.5, -R * 1.45, 0, -R * 1.4);
  ctx.bezierCurveTo(R * 0.5, -R * 1.45, R * 1.25, -R * 1.2, R * 1.06, R * 0.05);
  if (kid === 'kid1') { // frange droite
    ctx.quadraticCurveTo(R * 0.9, -R * 0.3, R * 0.6, -R * 0.42);
    ctx.quadraticCurveTo(R * 0.3, -R * 0.28, 0, -R * 0.45); ctx.quadraticCurveTo(-R * 0.3, -R * 0.28, -R * 0.6, -R * 0.42);
    ctx.quadraticCurveTo(-R * 0.9, -R * 0.3, -R * 1.06, R * 0.05);
  } else if (kid === 'kid2') { // mèche sur le côté
    ctx.quadraticCurveTo(R * 0.95, -R * 0.55, R * 0.45, -R * 0.62);
    ctx.quadraticCurveTo(-R * 0.3, -R * 0.55, -R * 0.75, -R * 0.1);
    ctx.quadraticCurveTo(-R * 0.95, -R * 0.35, -R * 1.06, R * 0.05);
  } else { // frange + bandeau
    ctx.quadraticCurveTo(R * 0.95, -R * 0.4, R * 0.7, -R * 0.35);
    ctx.quadraticCurveTo(R * 0.35, -R * 0.55, 0, -R * 0.32); ctx.quadraticCurveTo(-R * 0.35, -R * 0.55, -R * 0.7, -R * 0.35);
    ctx.quadraticCurveTo(-R * 0.95, -R * 0.4, -R * 1.06, R * 0.05);
  }
  ctx.closePath();
  fillShaded(ctx, sp.hair, { x: -R * 1.2, y: -R * 1.5, w: R * 2.4, h: R * 1.5 }, LW, { light: 0.26, dark: 0.1 });
  gloss(ctx, -R * 0.45, -R * 1.0, R * 0.34, R * 0.1, 0.45, -0.4);
  if (kid === 'kid1') for (const s of [-1, 1]) bow(ctx, s * R * 0.92, -R * 0.55, R * 0.34, sp.accent, s * 0.5);
  if (kid === 'kid2') { // petite pince dorée
    roundRect(ctx, R * 0.28, -R * 0.95, R * 0.5, R * 0.14, R * 0.07); fillShaded(ctx, PAL.or, { x: R * 0.28, y: -R * 0.95, w: R * 0.5, h: R * 0.14 }, 1.4);
  }
  if (kid === 'kid3') { // bandeau + petite fleur
    ctx.beginPath(); ctx.moveTo(-R * 1.04, -R * 0.55); ctx.quadraticCurveTo(0, -R * 1.5, R * 1.04, -R * 0.55);
    ctx.lineWidth = R * 0.26 + 3; ctx.strokeStyle = OUTLINE; ctx.stroke(); ctx.lineWidth = R * 0.26; ctx.strokeStyle = sp.top; ctx.stroke();
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(R * 0.62 + Math.cos(a) * R * 0.14, -R * 0.98 + Math.sin(a) * R * 0.14, R * 0.1, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(R * 0.62, -R * 0.98, R * 0.09, 0, 7); ctx.fillStyle = PAL.or; ctx.fill();
  }
}

// ---------------------------------------------------------------- corps
function legsAndShoes(ctx: Ctx, kid: KidId, sp: Spec, bounce: number): void {
  const lw = kid === 'kid1' ? 7 : 8.5;
  const legCol = kid === 'kid1' ? sp.skin : kid === 'kid2' ? sp.bottom : sp.skin;
  for (const s of [-1, 1]) {
    const x = s * sp.bodyW * 0.22;
    limb(ctx, x, -sp.leg, x, -3 - bounce * 0.2, lw, legCol);
    // chaussure
    const sy = -4;
    ctx.beginPath(); ctx.ellipse(x + s * 1.2, sy, lw * 0.95, lw * 0.6, 0, 0, Math.PI * 2);
    fillShaded(ctx, sp.shoes, { x: x - lw, y: sy - lw * 0.6, w: lw * 2, h: lw * 1.2 }, LW, { light: 0.3, dark: 0.15 });
    if (kid === 'kid3') { ctx.beginPath(); ctx.moveTo(x - lw * 0.7, sy - lw * 0.1); ctx.lineTo(x + lw * 0.8, sy - lw * 0.1); ctx.lineWidth = 1.2; ctx.stroke(); }
  }
}

function torso(ctx: Ctx, kid: KidId, sp: Spec, breathe: number): void {
  const sy = -(sp.leg + sp.torso);
  const hy = -sp.leg;
  const bw = sp.bodyW;
  ctx.beginPath();
  if (kid === 'kid1') { // robe évasée
    ctx.moveTo(-bw * 0.42, sy + 2); ctx.quadraticCurveTo(-bw * 0.55, (sy + hy) / 2, -bw * 0.72, hy + 6);
    ctx.quadraticCurveTo(0, hy + 11, bw * 0.72, hy + 6); ctx.quadraticCurveTo(bw * 0.55, (sy + hy) / 2, bw * 0.42, sy + 2);
    ctx.quadraticCurveTo(0, sy - 2 - breathe, -bw * 0.42, sy + 2);
  } else if (kid === 'kid2') { // cardigan + jean : haut droit
    ctx.moveTo(-bw * 0.5, sy + 2); ctx.lineTo(-bw * 0.46, hy + 3); ctx.quadraticCurveTo(0, hy + 7, bw * 0.46, hy + 3); ctx.lineTo(bw * 0.5, sy + 2);
    ctx.quadraticCurveTo(0, sy - 3 - breathe, -bw * 0.5, sy + 2);
  } else { // pull + jupe
    ctx.moveTo(-bw * 0.46, sy + 2); ctx.lineTo(-bw * 0.42, hy - 8); ctx.lineTo(-bw * 0.46, hy - 8); ctx.lineTo(-bw * 0.62, hy + 8);
    ctx.quadraticCurveTo(0, hy + 13, bw * 0.62, hy + 8); ctx.lineTo(bw * 0.46, hy - 8); ctx.lineTo(bw * 0.42, hy - 8); ctx.lineTo(bw * 0.46, sy + 2);
    ctx.quadraticCurveTo(0, sy - 3 - breathe, -bw * 0.46, sy + 2);
  }
  ctx.closePath();
  fillShaded(ctx, kid === 'kid3' ? sp.bottom : sp.top, { x: -bw, y: sy, w: bw * 2, h: sp.torso + 10 }, LW, { light: 0.22, dark: 0.14 });
  ctx.save(); ctx.clip();
  if (kid === 'kid1') { // col blanc + pois
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    for (const [x, y] of [[-6, 6], [5, 10], [-2, 15], [8, 3]]) { ctx.beginPath(); ctx.arc(x * (bw / 25), hy - sp.torso + y, 1.6, 0, 7); ctx.fill(); }
    ctx.fillStyle = sp.topDark; ctx.fillRect(-bw, hy - 3, bw * 2, 10);
  } else if (kid === 'kid2') { // tee blanc dans l'échancrure + boutons
    ctx.fillStyle = '#FFF9EE'; ctx.beginPath(); ctx.moveTo(-bw * 0.16, sy); ctx.lineTo(bw * 0.16, sy); ctx.lineTo(bw * 0.12, hy - 4); ctx.lineTo(-bw * 0.12, hy - 4); ctx.fill();
    ctx.fillStyle = sp.bottom; ctx.fillRect(-bw, hy - 3, bw * 2, 12); // jean
  } else {
    ctx.fillStyle = sp.top; ctx.fillRect(-bw, sy - 2, bw * 2, sp.torso * 0.62); // pull vert
    ctx.fillStyle = sp.topDark; ctx.fillRect(-bw, sy + sp.torso * 0.6, bw * 2, 2.4);
  }
  ctx.restore();
  ctx.lineWidth = LW; ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  if (kid === 'kid2') { ctx.beginPath(); ctx.moveTo(-bw * 0.16, sy); ctx.lineTo(-bw * 0.12, hy - 4); ctx.moveTo(bw * 0.16, sy); ctx.lineTo(bw * 0.12, hy - 4); ctx.lineWidth = 1.4; ctx.stroke(); }
  gloss(ctx, -bw * 0.22, sy + sp.torso * 0.25, bw * 0.12, sp.torso * 0.12, 0.45, -0.3);
}

function neck(ctx: Ctx, sp: Spec): void {
  const sy = -(sp.leg + sp.torso);
  ctx.beginPath(); ctx.rect(-sp.R * 0.26, sy - sp.R * 0.25, sp.R * 0.52, sp.R * 0.5);
  fillShaded(ctx, shade(sp.skin, -0.06), { x: -sp.R * 0.26, y: sy - sp.R * 0.25, w: sp.R * 0.52, h: sp.R * 0.5 }, LW * 0.9);
}

/** Dessine l'enfant `kid` dans la boîte w×h (pieds en bas au centre ; même échelle pour les trois). */
export function drawKid(ctx: Ctx, kid: KidId, pose: KidPose, w: number, h: number, t: number): void {
  const sp = SPEC[kid];
  const k = Math.min((h * 0.78) / 100, w / 56);
  const bounce = pose === 'happy' ? Math.abs(Math.sin(t * 5.5)) * 7 : pose === 'play' ? Math.abs(Math.sin(t * 3.2)) * 3 : 0;
  const breathe = Math.sin(t * 2.2) * 0.8;
  ctx.save();
  ctx.translate(w / 2, h * 0.95);
  ctx.scale(k, k);
  lim(ctx);
  groundShadow(ctx, 0, 1, 24 - bounce * 0.5, 4.4, 0.25);
  ctx.translate(0, -bounce);

  const sy = -(sp.leg + sp.torso) + 3;
  const sx = sp.bodyW * 0.48;
  const armLen = sp.torso * 0.95 + (sp.R > 14 ? 2 : 6);
  const swing = Math.sin(t * 1.6) * 0.06;
  const sleeve = kid === 'kid1' ? sp.top : sp.top;

  const headTilt = pose === 'think' ? 0.14 : pose === 'play' ? Math.sin(t * 2) * 0.06 : Math.sin(t * 1.1) * 0.03;
  const hx = pose === 'think' ? 1.5 : 0;
  const hy = -(sp.leg + sp.torso) - sp.R * 0.95 + breathe * 0.3;

  // jambes (derrière la robe)
  legsAndShoes(ctx, kid, sp, bounce);
  // cheveux arrière
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headTilt); hairBack(ctx, kid, sp, t); ctx.restore();
  // bras gauche (côté gauche écran) derrière le corps
  const armsBack = (): void => {
    if (pose === 'happy') arm(ctx, sp, -1, -sx, sy, 2.7 + Math.sin(t * 9) * 0.2, 2.9, armLen, sleeve);
    else if (pose === 'play') arm(ctx, sp, -1, -sx, sy, 0.9, 0.35 + Math.sin(t * 3.2) * 0.2, armLen, sleeve);
    else if (pose === 'think') arm(ctx, sp, -1, -sx, sy, 0.2, 0.1, armLen, sleeve);
    else arm(ctx, sp, -1, -sx, sy, 0.22 + swing, 0.12 + swing, armLen, sleeve);
  };
  armsBack();
  neck(ctx, sp);
  torso(ctx, kid, sp, breathe);
  // bras droit (devant)
  if (pose === 'wave') arm(ctx, sp, 1, sx, sy, 2.45, 2.7 + Math.sin(t * 8) * 0.45, armLen, sleeve);
  else if (pose === 'happy') arm(ctx, sp, 1, sx, sy, 2.7 - Math.sin(t * 9) * 0.2, 2.9, armLen, sleeve);
  else if (pose === 'play') {
    const hand = arm(ctx, sp, 1, sx, sy, 0.9, 0.35 + Math.sin(t * 3.2 + 1) * 0.2, armLen, sleeve);
    // petite fleur tenue à la main
    ctx.save(); ctx.translate(hand.hx + 2, hand.hy - 6);
    limb(ctx, 0, 8, 0, 0, 1.8, PAL.leaf);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + t; ctx.beginPath(); ctx.arc(Math.cos(a) * 3.2, -1 + Math.sin(a) * 3.2, 2.5, 0, 7); fillShaded(ctx, sp.accent, { x: -3, y: -4, w: 6, h: 6 }, 1.2); }
    ctx.beginPath(); ctx.arc(0, -1, 2, 0, 7); ctx.fillStyle = PAL.or; ctx.fill();
    ctx.restore();
  } else if (pose === 'think') {
    arm(ctx, sp, 1, sx, sy, 1.0, 2.6, armLen, sleeve);
  } else arm(ctx, sp, 1, sx, sy, 0.22 - swing, 0.12 - swing, armLen, sleeve);

  // tête
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headTilt);
  headBase(ctx, sp);
  face(ctx, sp, pose, t);
  hairFront(ctx, kid, sp);
  ctx.restore();

  // petits plus : cœurs (happy), bulle (think)
  if (pose === 'happy') {
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.7 + i / 3) % 1;
      ctx.save(); ctx.globalAlpha = Math.sin(p * Math.PI); ctx.fillStyle = PAL.roseVif;
      heartPath(ctx, (i - 1) * 16, hy - sp.R * 1.7 - p * 14, 7); ctx.fill(); ctx.restore();
    }
  } else if (pose === 'think') {
    ctx.save(); ctx.fillStyle = '#fff'; ctx.lineWidth = 1.6;
    for (const [x, y, r] of [[sp.R * 1.2, hy - sp.R * 1.1, 1.8], [sp.R * 1.55, hy - sp.R * 1.5, 2.6]] as const) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(sp.R * 2.1, hy - sp.R * 2.1, 8, 6.2, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.nuit; ctx.font = '700 9px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', sp.R * 2.1, hy - sp.R * 2.1 + 3.2);
    ctx.restore();
  }
  ctx.restore();
}
