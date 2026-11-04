/**
 * Orientations des meubles (vues « de dos » et « de côté ») et nouveaux objets de la refonte de la décoration.
 * Projection oblique commune (vue de face légèrement en plongée) : le sol occupe la boîte w×h, le haut de la boîte
 * est réservé à la hauteur ; chaque volume est dessiné fond → avant, dessus puis face avant, avec la lumière en haut à gauche.
 * Vue « de côté » = côté DROIT (tête / dossier à droite pour un lit, un canapé…) ; le côté gauche est son miroir.
 * Dessin vectoriel Canvas 2D, même style que furniture.ts (contours chocolat, reflets).
 */
import { PAL, OUTLINE, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, roundRect, shade as kitShade, sparkle, starPath } from '../kit';
import type { AnyFurnitureId } from '../../../data/world/furniture';
import { drawMagazine } from './careers';
import type { MagazineId } from '../../../data/world/ids';

type C = CanvasRenderingContext2D;
export type View = 'back' | 'side';

function toHex(c: string): string {
  if (c.startsWith('#')) return c.length === 4 ? '#' + c.slice(1).split('').map((x) => x + x).join('') : c;
  const m = c.match(/\d+/g);
  if (!m) return '#FF00FF';
  return '#' + m.slice(0, 3).map((v) => Math.max(0, Math.min(255, +v)).toString(16).padStart(2, '0')).join('');
}
const shade = (c: string, a: number): string => toHex(kitShade(toHex(c), a));
const wood = (c: string): string => shade(c, -0.12);

/** Boîte à outils liée à un canvas et à une taille. */
function kit(c: C, W: number, H: number) {
  const LW = Math.max(1.3, (W + H) * 0.012);
  const Y0 = H * 0.3; const GH = H - Y0;
  const rr = (x: number, y: number, w: number, h: number, r: number, col: string, lw = LW) => {
    if (w <= 0 || h <= 0) return;
    roundRect(c, x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
    fillShaded(c, col, { x, y, w, h }, lw);
  };
  const el = (cx: number, cy: number, rx: number, ry: number, col: string, lw = LW) => { ellipse(c, cx, cy, rx, ry); fillShaded(c, col, { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 }, lw); };
  const line = (x1: number, y1: number, x2: number, y2: number, col: string = OUTLINE, lw = LW) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = lw; c.strokeStyle = col; c.stroke(); };
  const heart = (cx: number, cy: number, s: number, col: string) => { heartPath(c, cx, cy, s); fillShaded(c, col, { x: cx - s / 2, y: cy - s / 2, w: s, h: s }, Math.max(0.8, LW * 0.6)); };
  const shadow = (rx = 0.46, ry = 0.05, cy = 0.95) => groundShadow(c, W / 2, H * cy, W * rx, H * ry, 0.26);
  /** Volume : sol u0..u1 (largeur), v0..v1 (profondeur, 0 fond → 1 avant), élévation e, hauteur hh (en px). */
  const slab = (u0: number, u1: number, v0: number, v1: number, e: number, hh: number, top: string, front: string, r = 3, lw = LW) => {
    const x = u0 * W; const w = (u1 - u0) * W; const y = Y0 + v0 * GH; const d = (v1 - v0) * GH;
    rr(x, y - e - hh, w, d, r, top, lw);
    if (hh > 0.5) rr(x, y + d - e - hh, w, hh, r, front, lw);
  };
  return { LW, Y0, GH, rr, el, line, heart, shadow, slab, E: (f: number) => f * H };
}

// ------------------------------------------------------------------ lits

function bed(c: C, W: number, H: number, col: string, view: View, royal: boolean): void {
  const k = kit(c, W, H); const { slab, E, rr, heart, el } = k;
  const wd = wood(shade(col, -0.2)); const wf = shade(wd, -0.2);
  k.shadow(0.47, 0.045, 0.95);
  if (view === 'back') {
    // tête de lit tournée vers nous : on voit le dos du chevet, le matelas et le pied du lit au fond
    slab(0.03, 0.97, 0.02, 0.98, 0, E(0.08), wd, wf);
    slab(0.06, 0.94, 0.04, 0.9, E(0.08), E(0.09), PAL.ivory, shade(PAL.ivory, -0.12));
    slab(0.06, 0.94, 0.04, 0.58, E(0.17), E(0.05), col, shade(col, -0.2));
    // plis du plaid
    for (const u of [0.24, 0.42, 0.6, 0.78]) k.line(u * W, k.Y0 + 0.07 * k.GH - E(0.22), u * W, k.Y0 + 0.5 * k.GH - E(0.22), shade(col, -0.25), k.LW * 0.7);
    k.heart(W * 0.5, k.Y0 + 0.3 * k.GH - E(0.22), H * 0.13, shade(col, 0.5));
    rr(W * 0.1, k.Y0 + 0.6 * k.GH - E(0.2), W * 0.34, H * 0.09, H * 0.045, PAL.ivory); rr(W * 0.56, k.Y0 + 0.6 * k.GH - E(0.2), W * 0.34, H * 0.09, H * 0.045, PAL.ivory);
    slab(0.0, 1.0, 0.86, 1.0, 0, E(royal ? 0.5 : 0.42), wd, wd, 6); // dos du chevet
    rr(W * 0.1, H * (royal ? 0.5 : 0.56), W * 0.8, H * 0.05, 3, shade(wd, 0.12), k.LW * 0.7);
    for (const u of [0.04, 0.96]) k.el(W * u, H * (royal ? 0.5 : 0.56), W * 0.035, W * 0.035, PAL.or);
    return;
  }
  // côté : tête à droite
  slab(0.02, 0.98, 0.02, 0.98, 0, E(0.07), wd, wf);
  slab(0.05, 0.95, 0.06, 0.94, E(0.07), E(0.08), PAL.ivory, shade(PAL.ivory, -0.12));
  slab(0.05, 0.68, 0.07, 0.95, E(0.15), E(0.05), col, shade(col, -0.2));
  for (const v of [0.3, 0.55, 0.8]) k.line(0.05 * W, k.Y0 + v * k.GH - E(0.2), 0.68 * W, k.Y0 + v * k.GH - E(0.2), shade(col, -0.22), k.LW * 0.6);
  slab(0.7, 0.92, 0.08, 0.47, E(0.15), E(0.05), PAL.ivory, shade(PAL.ivory, -0.1), 8);
  slab(0.7, 0.92, 0.53, 0.92, E(0.15), E(0.05), PAL.ivory, shade(PAL.ivory, -0.1), 8);
  slab(0.0, 0.05, 0.02, 0.98, E(0.0), E(royal ? 0.14 : 0.12), wd, wf, 4);
  slab(0.92, 1.0, 0.0, 1.0, 0, E(royal ? 0.3 : 0.24), wd, wf, 5);
  heart(W * 0.96, k.Y0 + 0.5 * k.GH - E(royal ? 0.3 : 0.24), H * 0.1, PAL.roseVif);
  el(W * 0.96, k.Y0 - E(royal ? 0.3 : 0.24), W * 0.04, W * 0.04, PAL.or);
  el(W * 0.96, H - E(royal ? 0.3 : 0.24), W * 0.04, W * 0.04, PAL.or);
}

// ------------------------------------------------------------------ canapé, fauteuil, banc

function seat(c: C, W: number, H: number, col: string, view: View, kind: 'sofa' | 'armchair'): void {
  const k = kit(c, W, H); const { slab, E, rr, heart, el } = k;
  const dk = shade(col, -0.18); const lt = shade(col, 0.12); const legs = wood(PAL.orDeep);
  k.shadow(0.47, 0.045, 0.95);
  if (view === 'back') {
    for (const u of [0.1, 0.84]) slab(u, u + 0.06, 0.82, 0.96, 0, E(0.08), legs, shade(legs, -0.2), 2);
    slab(0.02, 0.98, 0.08, 0.92, E(0.06), E(0.1), col, dk);                      // assise
    slab(0.0, 0.14, 0.06, 0.94, E(0.06), E(0.3), lt, dk, 8);                      // accoudoir gauche
    slab(0.86, 1.0, 0.06, 0.94, E(0.06), E(0.3), lt, dk, 8);                      // accoudoir droit
    slab(0.08, 0.92, 0.78, 0.98, E(0.1), E(kind === 'sofa' ? 0.42 : 0.46), shade(col, 0.2), col, 10); // dossier vu de dos
    // boutons capitonnés et couture
    const n = kind === 'sofa' ? 4 : 2;
    for (let i = 0; i < n; i++) el(W * (0.2 + (0.6 * (i + 0.5)) / n), H * 0.7, W * 0.014 + 1.5, W * 0.014 + 1.5, shade(col, -0.35), k.LW * 0.4);
    k.line(W * 0.12, H * 0.62, W * 0.88, H * 0.62, dk, k.LW * 0.7);
    return;
  }
  // côté (dossier à gauche, assise tournée vers la droite)
  slab(0.08, 0.2, 0.84, 0.97, 0, E(0.08), legs, shade(legs, -0.2), 2);
  slab(0.8, 0.92, 0.84, 0.97, 0, E(0.08), legs, shade(legs, -0.2), 2);
  slab(0.04, 0.96, 0.02, 0.98, E(0.06), E(0.08), dk, shade(dk, -0.15));            // châssis
  slab(0.04, 0.3, 0.02, 0.98, E(0.12), E(0.34), lt, col, 12);                       // dossier (profil)
  slab(0.3, 0.96, 0.1, 0.9, E(0.14), E(0.1), col, dk, 8);                           // coussin d'assise
  slab(0.3, 0.92, 0.02, 0.12, E(0.14), E(0.22), lt, dk, 8);                         // accoudoir du fond
  slab(0.3, 0.92, 0.88, 0.99, E(0.14), E(0.24), lt, col, 8);                        // accoudoir proche (vu de côté)
  heart(W * 0.17, k.Y0 + 0.5 * k.GH - E(0.46), H * (kind === 'sofa' ? 0.1 : 0.12), shade(col, 0.5));
  rr(W * 0.1, H * 0.9, W * 0.8, H * 0.014, 1, 'rgba(255,255,255,0.35)', 0);
}

function bench(c: C, W: number, H: number, col: string, view: View): void {
  const k = kit(c, W, H); const { slab, E, heart } = k;
  const dk = shade(col, -0.25); const lt = shade(col, 0.1);
  k.shadow(0.46, 0.045, 0.95);
  if (view === 'back') {
    for (const u of [0.08, 0.84]) slab(u, u + 0.08, 0.1, 0.94, 0, E(0.4), dk, dk, 2);
    slab(0.02, 0.98, 0.1, 0.9, E(0.4), E(0.08), lt, col);
    for (let i = 0; i < 3; i++) slab(0.06, 0.94, 0.84, 0.97, E(0.44 + i * 0.16), E(0.1), col, shade(col, -0.12), 3);
    return;
  }
  for (const v of [0.1, 0.78]) slab(0.18, 0.88, v, v + 0.12, 0, E(0.4), dk, dk, 2);
  slab(0.04, 0.96, 0.08, 0.92, E(0.4), E(0.08), lt, col);
  slab(0.04, 0.2, 0.06, 0.94, E(0.48), E(0.4), lt, col, 6);                       // dossier en profil
  heart(W * 0.12, k.Y0 + 0.5 * k.GH - E(0.88), H * 0.18, PAL.roseVif);
}

// ------------------------------------------------------------------ tables et bureau

function table(c: C, W: number, H: number, col: string, view: View, kind: 'coffee' | 'desk' | 'banquet'): void {
  const k = kit(c, W, H); const { slab, E, rr, heart, el, LW } = k;
  const dk = shade(col, -0.22); const lt = shade(col, 0.16);
  const top = kind === 'banquet' ? 0.5 : kind === 'desk' ? 0.46 : 0.36;
  k.shadow(0.47, 0.045, 0.95);
  const legsW = 0.07;
  // pieds (4) : ceux du fond sont plus courts à l'œil
  for (const [u, v] of [[0.06, 0.1], [1 - 0.06 - legsW, 0.1], [0.06, 0.82], [1 - 0.06 - legsW, 0.82]] as const) slab(u, u + legsW, v, v + 0.1, 0, E(top), dk, dk, 2);
  if (kind === 'desk') {
    // caisson à tiroirs : à droite (vue de dos : à gauche) ou côté proche en vue latérale
    if (view === 'back') slab(0.04, 0.34, 0.1, 0.9, 0, E(top - 0.02), dk, col, 3);
    else slab(0.06, 0.94, 0.62, 0.92, 0, E(top - 0.02), dk, col, 3);
  }
  slab(0.0, 1.0, 0.04, 0.96, E(top), E(kind === 'coffee' ? 0.08 : 0.07), lt, col, 4);
  if (kind === 'coffee') { gloss(c, W * 0.25, H * 0.5, W * 0.1, H * 0.03, 0.5); heart(W * 0.7, k.Y0 + 0.4 * k.GH - E(top + 0.08), H * 0.12, PAL.roseVif); }
  else if (kind === 'desk') {
    if (view === 'back') { rr(W * 0.4, k.Y0 + 0.3 * k.GH - E(top + 0.07) - H * 0.1, W * 0.2, H * 0.1, 3, PAL.white, LW * 0.7); }
    else { rr(W * 0.2, k.Y0 + 0.2 * k.GH - E(top + 0.07) - H * 0.07, W * 0.3, H * 0.07, 3, PAL.white, LW * 0.7); rr(W * 0.22, k.Y0 + 0.2 * k.GH - E(top + 0.07) - H * 0.1, W * 0.26, H * 0.03, 2, PAL.roseVif, LW * 0.6); }
    for (const v of [0.68, 0.8]) el(W * (view === 'back' ? 0.19 : 0.5), k.Y0 + v * k.GH - E(top - 0.12), 2, 2, PAL.or, LW * 0.5);
  } else {
    // chemin de table dorée + vase
    slab(0.1, 0.9, 0.38, 0.62, E(top + 0.07), E(0.01), PAL.or, PAL.orDeep, 2, LW * 0.6);
    el(W * 0.5, k.Y0 + 0.5 * k.GH - E(top + 0.12), W * 0.05, H * 0.03, PAL.lavande);
  }
}

// ------------------------------------------------------------------ rangements : bibliothèque, armoire, commode, étagère de jeux

function cabinet(c: C, W: number, H: number, col: string, view: View, id: string): void {
  const k = kit(c, W, H); const { slab, E, rr, el, LW } = k;
  const dk = shade(col, -0.2); const lt = shade(col, 0.15);
  const low = id === 'dresser';
  const hgt = low ? 0.5 : 0.62;
  k.shadow(0.47, 0.045, 0.95);
  slab(0.04, 0.96, 0.06, 0.94, 0, E(hgt), lt, col, 4);
  // façade latérale / dossier : planches et moulure
  const y0 = k.Y0 + 0.94 * k.GH - E(hgt);
  rr(W * 0.1, y0 + 4, W * 0.8, E(hgt) - 8, 3, shade(col, 0.06), LW * 0.6);
  if (view === 'back') {
    for (const f of [0.34, 0.66]) k.line(W * 0.1, y0 + (E(hgt) - 8) * f + 4, W * 0.9, y0 + (E(hgt) - 8) * f + 4, dk, LW * 0.6);
    if (id === 'wardrobe') k.line(W * 0.5, y0 + 4, W * 0.5, y0 + E(hgt) - 4, dk, LW * 0.8);
  } else {
    // côté : panneau à encadrement
    rr(W * 0.2, y0 + E(hgt) * 0.16, W * 0.6, E(hgt) * 0.62, 3, shade(col, -0.05), LW * 0.6);
    rr(W * 0.27, y0 + E(hgt) * 0.24, W * 0.46, E(hgt) * 0.46, 2, shade(col, 0.08), LW * 0.5);
  }
  for (const u of [0.1, 0.84]) slab(u, u + 0.06, 0.78, 0.94, 0, E(0.05), wood(dk), wood(dk), 1);
  void el;
}

// ------------------------------------------------------------------ routeur

export function hasView(id: string): boolean {
  return ['bed-royal', 'bed-kid', 'sofa', 'armchair', 'bench', 'coffee-table', 'desk', 'banquet-table', 'bookshelf', 'wardrobe', 'game-shelf', 'dresser'].includes(id);
}

/** Dessine la vue de dos / de côté. Retourne false si le meuble n'a pas de vue dédiée. */
export function drawView(c: C, id: AnyFurnitureId, view: View, w: number, h: number, col: string): boolean {
  switch (id) {
    case 'bed-royal': bed(c, w, h, col, view, true); return true;
    case 'bed-kid': bed(c, w, h, col, view, false); return true;
    case 'sofa': seat(c, w, h, col, view, 'sofa'); return true;
    case 'armchair': seat(c, w, h, col, view, 'armchair'); return true;
    case 'bench': bench(c, w, h, col, view); return true;
    case 'coffee-table': table(c, w, h, col, view, 'coffee'); return true;
    case 'desk': table(c, w, h, col, view, 'desk'); return true;
    case 'banquet-table': table(c, w, h, col, view, 'banquet'); return true;
    case 'bookshelf': case 'wardrobe': case 'game-shelf': case 'dresser': cabinet(c, w, h, col, view, id); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ nouveaux objets (vue de face)

function cushion(c: C, w: number, h: number, col: string, variant: string): void {
  const k = kit(c, w, h);
  groundShadow(c, w / 2, h * 0.9, w * 0.32, h * 0.05, 0.22);
  if (variant === 'rond') { k.el(w * 0.5, h * 0.62, w * 0.3, h * 0.26, col); k.el(w * 0.5, h * 0.62, w * 0.06, h * 0.05, shade(col, -0.25), k.LW * 0.5); gloss(c, w * 0.38, h * 0.52, w * 0.07, h * 0.04, 0.5); return; }
  if (variant === 'carre') {
    k.rr(w * 0.2, h * 0.36, w * 0.6, h * 0.5, w * 0.08, col);
    k.line(w * 0.22, h * 0.4, w * 0.78, h * 0.82, shade(col, -0.2), k.LW * 0.6); k.line(w * 0.78, h * 0.4, w * 0.22, h * 0.82, shade(col, -0.2), k.LW * 0.6);
    k.rr(w * 0.43, h * 0.55, w * 0.14, h * 0.14, 3, shade(col, 0.4), k.LW * 0.6); gloss(c, w * 0.32, h * 0.46, w * 0.07, h * 0.03, 0.5); return;
  }
  k.rr(w * 0.14, h * 0.4, w * 0.72, h * 0.44, w * 0.14, col);
  k.heart(w * 0.5, h * 0.62, h * 0.24, shade(col, 0.5));
  for (const x of [0.1, 0.9]) k.el(w * x, h * 0.62, w * 0.03, w * 0.03, PAL.or, k.LW * 0.6);
  gloss(c, w * 0.3, h * 0.48, w * 0.07, h * 0.03, 0.5);
}

function wallShelf(c: C, w: number, h: number, col: string): void {
  const k = kit(c, w, h);
  groundShadow(c, w * 0.5, h * 0.98, w * 0.46, h * 0.04, 0.2);
  k.rr(w * 0.02, h * 0.5, w * 0.96, h * 0.22, 4, col);
  for (const u of [0.12, 0.8]) { c.beginPath(); c.moveTo(w * u, h * 0.72); c.lineTo(w * (u + 0.08), h * 0.72); c.lineTo(w * (u + 0.08), h * 0.95); c.closePath(); fillShaded(c, shade(col, -0.1), { x: w * u, y: h * 0.72, w: w * 0.08, h: h * 0.23 }, k.LW * 0.8); }
  // petits objets : livre, vase, bougie
  k.rr(w * 0.12, h * 0.2, w * 0.1, h * 0.3, 2, PAL.roseVif, k.LW * 0.7); k.rr(w * 0.23, h * 0.26, w * 0.09, h * 0.24, 2, PAL.lavande, k.LW * 0.7);
  k.rr(w * 0.55, h * 0.2, w * 0.12, h * 0.3, 4, PAL.peche, k.LW * 0.7);
  c.beginPath(); c.moveTo(w * 0.61, h * 0.2); c.quadraticCurveTo(w * 0.52, h * 0.02, w * 0.5, h * 0.06); c.lineWidth = k.LW * 0.9; c.strokeStyle = PAL.leafDeep; c.stroke();
  c.beginPath(); c.moveTo(w * 0.61, h * 0.2); c.quadraticCurveTo(w * 0.7, h * 0.03, w * 0.72, h * 0.08); c.stroke();
  k.heart(w * 0.5, h * 0.06, h * 0.12, PAL.roseVif);
  k.rr(w * 0.8, h * 0.28, w * 0.07, h * 0.22, 2, PAL.ivory, k.LW * 0.7);
}

function mirrorWall(c: C, w: number, h: number, col: string, variant: string): void {
  const k = kit(c, w, h);
  groundShadow(c, w * 0.52, h * 0.97, w * 0.4, h * 0.03, 0.16);
  const round = variant === 'rond';
  const cx = w / 2; const cy = round ? h * 0.5 : h * 0.5;
  const rx = round ? Math.min(w, h) * 0.46 : w * 0.44; const ry = round ? Math.min(w, h) * 0.46 : h * 0.47;
  k.el(cx, cy, rx, ry, col);
  const g = c.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  g.addColorStop(0, '#F4FBFF'); g.addColorStop(0.5, '#CFE6F5'); g.addColorStop(1, '#B6D4EA');
  ellipse(c, cx, cy, rx * 0.8, ry * 0.82); c.fillStyle = g; c.fill(); c.lineWidth = k.LW * 0.7; c.strokeStyle = OUTLINE; c.stroke();
  c.beginPath(); c.moveTo(cx - rx * 0.5, cy - ry * 0.1); c.lineTo(cx - rx * 0.1, cy - ry * 0.6); c.lineTo(cx + rx * 0.02, cy - ry * 0.55); c.lineTo(cx - rx * 0.4, cy + ry * 0.1); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.65)'; c.fill();
  k.heart(cx, cy - ry * 1.0 + h * 0.02, h * 0.12, PAL.roseVif);
}

function wallClock(c: C, w: number, h: number, col: string): void {
  const k = kit(c, w, h);
  const r = Math.min(w, h) * 0.45;
  groundShadow(c, w / 2, h * 0.96, r * 0.8, h * 0.03, 0.15);
  k.el(w / 2, h / 2, r, r, col);
  k.el(w / 2, h / 2, r * 0.78, r * 0.78, PAL.ivory, k.LW * 0.7);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const r1 = r * (i % 3 ? 0.62 : 0.55); k.line(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1, w / 2 + Math.cos(a) * r * 0.7, h / 2 + Math.sin(a) * r * 0.7, OUTLINE, k.LW * 0.6); }
  k.line(w / 2, h / 2, w / 2 + r * 0.02, h / 2 - r * 0.45, OUTLINE, k.LW * 1.1); k.line(w / 2, h / 2, w / 2 + r * 0.36, h / 2 + r * 0.1, OUTLINE, k.LW * 1.1);
  k.el(w / 2, h / 2, r * 0.06, r * 0.06, PAL.roseVif, k.LW * 0.5);
  k.heart(w / 2, h * 0.04 + r * 0.02, h * 0.14, PAL.roseVif);
}

function garland(c: C, w: number, h: number, col: string): void {
  // fil qui pend du plafond, ampoules qui scintillent
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(w * 0.5, h * 0.9, w, 0); c.lineWidth = Math.max(1.3, h * 0.03); c.strokeStyle = OUTLINE; c.stroke();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n; const x = w * t; const yy = 1.8 * h * t * (1 - t);
    glow(c, x, yy + h * 0.1, h * 0.28, [PAL.or, PAL.roseVif, '#fff'][i % 3], 0.5);
    ellipse(c, x, yy + h * 0.1, h * 0.06, h * 0.085); fillShaded(c, i % 2 ? '#FFF3B0' : shade(col, 0.4), { x: x - h * 0.06, y: yy + h * 0.02, w: h * 0.12, h: h * 0.17 }, 1);
  }
}

function pendant(c: C, w: number, h: number, col: string): void {
  const k = kit(c, w, h);
  k.line(w * 0.5, 0, w * 0.5, h * 0.4, OUTLINE, k.LW * 2.2); k.line(w * 0.5, 0, w * 0.5, h * 0.4, PAL.or, k.LW);
  glow(c, w * 0.5, h * 0.78, w * 0.9, PAL.or, 0.35);
  c.beginPath(); c.moveTo(w * 0.28, h * 0.78); c.quadraticCurveTo(w * 0.3, h * 0.4, w * 0.5, h * 0.38); c.quadraticCurveTo(w * 0.7, h * 0.4, w * 0.72, h * 0.78); c.closePath();
  fillShaded(c, col, { x: w * 0.28, y: h * 0.38, w: w * 0.44, h: h * 0.4 }, k.LW);
  ellipse(c, w * 0.5, h * 0.78, w * 0.22, h * 0.04); c.fillStyle = '#FFF3B0'; c.fill(); c.lineWidth = k.LW * 0.8; c.strokeStyle = OUTLINE; c.stroke();
  k.heart(w * 0.5, h * 0.56, h * 0.14, shade(col, 0.5));
  gloss(c, w * 0.4, h * 0.5, w * 0.05, h * 0.07, 0.5);
}

function dresserFront(c: C, w: number, h: number, col: string): void {
  const k = kit(c, w, h);
  k.shadow(0.46, 0.05, 0.95);
  k.rr(w * 0.03, h * 0.12, w * 0.94, h * 0.14, 4, shade(col, 0.15));
  k.rr(w * 0.06, h * 0.24, w * 0.88, h * 0.64, 4, col);
  for (let i = 0; i < 3; i++) {
    k.rr(w * 0.12, h * (0.29 + i * 0.19), w * 0.76, h * 0.16, 3, shade(col, 0.1), k.LW * 0.7);
    k.el(w * 0.5, h * (0.37 + i * 0.19), w * 0.03, w * 0.03, PAL.or, k.LW * 0.6);
  }
  for (const u of [0.1, 0.82]) k.rr(w * u, h * 0.86, w * 0.08, h * 0.1, 2, wood(col));
  k.heart(w * 0.8, h * 0.06, h * 0.12, PAL.roseVif);
}

function rugHeart(c: C, w: number, h: number, col: string): void {
  groundShadow(c, w / 2, h * 0.64, w * 0.46, h * 0.1, 0.18);
  const cx = w / 2; const cy = h * 0.52; const s = Math.min(w, h * 1.1) * 0.95;
  heartPath(c, cx, cy, s); fillShaded(c, shade(col, -0.05), { x: cx - s / 2, y: cy - s / 2, w: s, h: s }, Math.max(1.4, (w + h) * 0.01));
  heartPath(c, cx, cy, s * 0.76); fillShaded(c, shade(col, 0.4), { x: cx - s * 0.38, y: cy - s * 0.38, w: s * 0.76, h: s * 0.76 }, 1.2);
  heartPath(c, cx, cy, s * 0.5); fillShaded(c, col, { x: cx - s * 0.25, y: cy - s * 0.25, w: s * 0.5, h: s * 0.5 }, 1.2);
  sparkle(c, cx - s * 0.1, cy - s * 0.05, s * 0.05, '#fff', 0.9);
}

/** Tableau mural : cadre doré sans pieds, trois styles + couvertures de magazine. */
export function drawWallPainting(c: C, w: number, h: number, col: string, variant: string): void {
  const k = kit(c, w, h);
  groundShadow(c, w * 0.52, h * 0.97, w * 0.4, h * 0.03, 0.16);
  k.rr(w * 0.06, h * 0.03, w * 0.88, h * 0.92, 4, PAL.or);
  const ix = w * 0.15; const iy = h * 0.09; const iw = w * 0.7; const ih = h * 0.8;
  c.save(); roundRect(c, ix, iy, iw, ih, 2); c.clip();
  if (col.startsWith('mag:')) {
    c.translate(ix, iy); drawMagazine(c, col.slice(4) as MagazineId, iw, ih); c.restore();
    roundRect(c, ix, iy, iw, ih, 2); c.lineWidth = k.LW * 0.8; c.strokeStyle = OUTLINE; c.stroke(); return;
  }
  const sky = c.createLinearGradient(0, iy, 0, iy + ih);
  sky.addColorStop(0, shade(col, 0.4)); sky.addColorStop(1, shade(PAL.peche, 0.2));
  c.fillStyle = sky; c.fillRect(ix, iy, iw, ih);
  if (variant === 'coeur') {
    for (const [dx, dy, s, cc] of [[0.5, 0.45, 0.5, PAL.roseVif], [0.25, 0.75, 0.22, PAL.lavande], [0.76, 0.2, 0.2, PAL.or]] as const) { heartPath(c, ix + iw * dx, iy + ih * dy, iw * s); c.fillStyle = cc; c.fill(); c.lineWidth = k.LW * 0.5; c.strokeStyle = OUTLINE; c.stroke(); }
  } else if (variant === 'etoiles') {
    c.fillStyle = shade(PAL.nuit, 0.1); c.fillRect(ix, iy, iw, ih);
    for (const [dx, dy, s] of [[0.3, 0.25, 0.2], [0.7, 0.45, 0.28], [0.35, 0.7, 0.16], [0.75, 0.82, 0.12]] as const) { starPath(c, ix + iw * dx, iy + ih * dy, iw * s, iw * s * 0.45, 5); c.fillStyle = PAL.or; c.fill(); }
    ellipse(c, ix + iw * 0.8, iy + ih * 0.15, iw * 0.1, iw * 0.1); c.fillStyle = '#FFF4C8'; c.fill();
  } else {
    ellipse(c, ix + iw * 0.7, iy + ih * 0.25, iw * 0.14, iw * 0.14); c.fillStyle = PAL.or; c.fill();
    c.beginPath(); c.moveTo(ix, iy + ih); c.quadraticCurveTo(ix + iw * 0.3, iy + ih * 0.45, ix + iw * 0.6, iy + ih * 0.75); c.quadraticCurveTo(ix + iw * 0.8, iy + ih * 0.6, ix + iw, iy + ih * 0.72); c.lineTo(ix + iw, iy + ih); c.fillStyle = PAL.leaf; c.fill();
    c.beginPath(); c.moveTo(ix, iy + ih); c.quadraticCurveTo(ix + iw * 0.4, iy + ih * 0.7, ix + iw, iy + ih * 0.9); c.lineTo(ix + iw, iy + ih); c.fillStyle = PAL.leafDeep; c.fill();
    heartPath(c, ix + iw * 0.3, iy + ih * 0.3, iw * 0.16); c.fillStyle = PAL.roseVif; c.fill();
  }
  c.restore();
  roundRect(c, ix, iy, iw, ih, 2); c.lineWidth = k.LW * 0.8; c.strokeStyle = OUTLINE; c.stroke();
  gloss(c, ix + iw * 0.2, iy + ih * 0.12, iw * 0.12, ih * 0.03, 0.5);
}

/** Objets ajoutés (vue de face). Retourne false si l'id n'est pas un de ces objets. */
export function drawExtra(c: C, id: AnyFurnitureId, w: number, h: number, col: string, variant: string): boolean {
  switch (id) {
    case 'cushion': cushion(c, w, h, col, variant || 'coeur'); return true;
    case 'wall-shelf': wallShelf(c, w, h, col); return true;
    case 'mirror-wall': mirrorWall(c, w, h, col, variant || 'ovale'); return true;
    case 'wall-clock': wallClock(c, w, h, col); return true;
    case 'garland': garland(c, w, h, col); return true;
    case 'pendant': pendant(c, w, h, col); return true;
    case 'dresser': dresserFront(c, w, h, col); return true;
    case 'rug-heart': rugHeart(c, w, h, col); return true;
    default: return false;
  }
}
