/**
 * Bracelet « La promesse d'Auguste ♡ » : fin jonc doré, petit cœur rosé, reflet rose très léger.
 * Posé sur le poignet GAUCHE de l'image (arms[0]) à partir de la géométrie du bras (x1, y1, angle de la main) :
 * fonctionne donc avec toutes les poses. Repère avatar 240 × 600.
 * ⚠ import circulaire avec avatar.ts : rien de ce module n'utilise d'import d'avatar avant `installWrist()`.
 */
import { EXTRA, INK } from './avatar';
import type { C, Arm } from './avatar';
import { heartPath, sparkle, gloss } from '../kit';
import { BRACELET_ID, shineGlow } from './wristShine';

const GOLD_HI = '#FFF3C4';
const GOLD = '#F3C86B';
const GOLD_LO = '#C8902C';
const ROSE_HI = '#FFD3E2';
const ROSE = '#FF8DB4';
const ROSE_LO = '#E8558F';

export type BraceletMode = 'wrist' | 'simple' | 'full';

/**
 * Dessine le bracelet dans un repère local : origine au centre du poignet, +x en travers du bras, +y vers la main.
 * `hw` = demi-largeur du jonc (≈ 10 sur l'avatar). `shine` ∈ [0,1].
 */
function drawBand(ctx: C, mode: BraceletMode, shine: number, k: number): void {
  const hw = 10.4;
  const glow = shineGlow(shine);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (mode === 'simple') {
    // minuscule : un trait doré et un point rose, sans détail
    const lw = Math.min(6, Math.max(3.2, 1.7 / k));
    ctx.beginPath(); ctx.moveTo(-hw, -1); ctx.quadraticCurveTo(0, 4, hw, -1);
    ctx.lineWidth = lw + 1.6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = lw; ctx.strokeStyle = GOLD; ctx.stroke();
    ctx.beginPath(); ctx.arc(0.5, 4.6, Math.min(5, Math.max(2.6, 1.5 / k)), 0, Math.PI * 2);
    ctx.fillStyle = ROSE; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    return;
  }
  const bandY = (x: number): number => -1.1 + 4.6 * (1 - (x / hw) * (x / hw)); // courbe du jonc (creux vers la main)
  // jonc : contour chocolat, or dégradé, fine ligne de lumière, reflet rose
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(-hw, bandY(-hw));
    ctx.quadraticCurveTo(0, bandY(0) * 2 + 1.1, hw, bandY(hw));
  };
  path(); ctx.lineWidth = 5.4; ctx.strokeStyle = INK; ctx.stroke();
  path();
  const g = ctx.createLinearGradient(-hw, -2, hw, 6);
  g.addColorStop(0, GOLD_HI); g.addColorStop(0.45, GOLD); g.addColorStop(1, GOLD_LO);
  ctx.lineWidth = 3.1; ctx.strokeStyle = g; ctx.stroke();
  path(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,170,200,0.55)'; ctx.translate(0, 0.35); ctx.stroke(); ctx.translate(0, -0.35);
  // petites perles dorées sur le jonc
  for (const x of [-6.6, 6.6]) {
    ctx.beginPath(); ctx.arc(x, bandY(x), 1.2, 0, Math.PI * 2); ctx.fillStyle = GOLD_HI; ctx.fill();
  }
  // chaînette + cœur rosé
  const py = 7.6;
  ctx.beginPath(); ctx.moveTo(0, bandY(0) + 1.4); ctx.lineTo(0.4, py - 2.4); ctx.lineWidth = 1.5; ctx.strokeStyle = GOLD_LO; ctx.stroke();
  heartPath(ctx, 0.4, py + 0.4, 7.2);
  const hg = ctx.createLinearGradient(-3, py - 3, 4, py + 5);
  hg.addColorStop(0, ROSE_HI); hg.addColorStop(0.5, ROSE); hg.addColorStop(1, ROSE_LO);
  ctx.fillStyle = hg; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
  heartPath(ctx, 0.4, py + 0.4, 5.4); ctx.lineWidth = 0.9; ctx.strokeStyle = GOLD; ctx.stroke(); // sertissage doré
  gloss(ctx, -1.5, py - 1.1, 1.2, 0.8, 0.85, -0.6);
  if (glow > 0) {
    // reflet qui glisse le long du jonc, puis étincelle sur le cœur
    const sx = -hw + 2 * hw * shine;
    const rg = ctx.createRadialGradient(sx, bandY(sx) + 0.5, 0, sx, bandY(sx) + 0.5, 6.5);
    rg.addColorStop(0, `rgba(255,255,255,${0.95 * glow})`); rg.addColorStop(0.45, `rgba(255,214,232,${0.55 * glow})`); rg.addColorStop(1, 'rgba(255,214,232,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx, bandY(sx) + 0.5, 6.5, 0, Math.PI * 2); ctx.fill();
    heartPath(ctx, 0.4, py + 0.4, 6.6); ctx.fillStyle = `rgba(255,255,255,${0.32 * glow})`; ctx.fill();
    if (shine > 0.3) sparkle(ctx, 4.4, py - 2.6, 1.8 + 3.6 * glow, '#FFFFFF', Math.min(1, glow * 1.2));
  }
  ctx.restore();
}

/** Bracelet dessiné seul (grand format : écrin, carte souvenir). Origine au centre du jonc ; `size` ≈ largeur en pixels. */
export function drawBraceletBig(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, shine = 0): void {
  const s = size / 70;
  const glow = shineGlow(shine);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const rx = 30, ry = 13;
  // anneau vu en perspective : arrière (ombre dorée) puis avant
  ctx.beginPath(); ctx.ellipse(0, -4, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.lineWidth = 6.4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = 3.4; ctx.strokeStyle = GOLD_LO; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -4, rx, ry, 0, 0, Math.PI);
  ctx.lineWidth = 6.8; ctx.strokeStyle = INK; ctx.stroke();
  const g = ctx.createLinearGradient(-rx, -4, rx, 14);
  g.addColorStop(0, GOLD_HI); g.addColorStop(0.5, GOLD); g.addColorStop(1, GOLD_LO);
  ctx.lineWidth = 3.8; ctx.strokeStyle = g; ctx.stroke();
  ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(255,160,195,0.6)'; ctx.translate(0, 1.2); ctx.stroke(); ctx.translate(0, -1.2);
  for (const a of [0.35, 0.65, 2.5, 2.8]) {
    ctx.beginPath(); ctx.arc(Math.cos(a) * rx, -4 + Math.sin(a) * ry, 1.5, 0, Math.PI * 2); ctx.fillStyle = GOLD_HI; ctx.fill();
  }
  // chaînette + cœur
  const py = 20;
  ctx.beginPath(); ctx.moveTo(0, -4 + ry); ctx.lineTo(0, py - 5); ctx.lineWidth = 1.8; ctx.strokeStyle = GOLD_LO; ctx.stroke();
  heartPath(ctx, 0, py + 2, 16);
  const hg = ctx.createLinearGradient(-8, py - 6, 8, py + 10);
  hg.addColorStop(0, ROSE_HI); hg.addColorStop(0.5, ROSE); hg.addColorStop(1, ROSE_LO);
  ctx.fillStyle = hg; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
  heartPath(ctx, 0, py + 2, 12); ctx.lineWidth = 1.5; ctx.strokeStyle = GOLD; ctx.stroke();
  gloss(ctx, -3.6, py - 2.2, 2.8, 1.8, 0.85, -0.6);
  gloss(ctx, 3.4, py + 3.6, 1, 1, 0.5, 0);
  if (glow > 0) {
    const sx = -rx + 2 * rx * shine;
    const sy = -4 + Math.sqrt(Math.max(0, 1 - (sx / rx) ** 2)) * ry;
    const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
    rg.addColorStop(0, `rgba(255,255,255,${glow})`); rg.addColorStop(0.4, `rgba(255,214,232,${0.6 * glow})`); rg.addColorStop(1, 'rgba(255,214,232,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
    heartPath(ctx, 0, py + 2, 14); ctx.fillStyle = `rgba(255,255,255,${0.3 * glow})`; ctx.fill();
    if (shine > 0.25) sparkle(ctx, 8, py - 4, 4 + 7 * glow, '#FFFFFF', Math.min(1, glow * 1.2));
  }
  ctx.restore();
}

/** Bracelet sur le poignet gauche de l'image : `arms[0]`, orienté selon la direction de la main. */
function wristDraw(ctx: C, arms: Arm[], angle: (a: Arm) => number, shine: number): void {
  const a = arms[0];
  if (!a) return;
  const k = Math.abs(ctx.getTransform().a) || 1; // pixels par unité d'avatar : petit sprite → version simplifiée
  ctx.save();
  ctx.translate(a.x1, a.y1);
  ctx.rotate(angle(a));
  ctx.translate(0, 3);
  drawBand(ctx, k < 0.3 ? 'simple' : 'wrist', k < 0.3 ? 0 : shine, k);
  ctx.restore();
}

export function installWrist(): void {
  EXTRA.wrist[BRACELET_ID] = wristDraw;
}
