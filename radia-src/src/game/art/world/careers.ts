/**
 * STUB — remplacé par le module « carrières » (icônes de carrière, couvertures
 * de magazines). Signatures figées :
 *   drawMagazine(ctx, id, w, h, look?)  couverture complète (avec l'avatar de Radia)
 *   drawCareerIcon(ctx, id, size)       icône ronde d'une carrière
 */
import type { CareerId, Look, MagazineId } from '../../../data/world/ids';

export function drawMagazine(ctx: CanvasRenderingContext2D, _id: MagazineId, w: number, h: number, _look?: Look): void {
  ctx.fillStyle = '#F5B5C8';
  ctx.fillRect(0, 0, w, h);
}

export function drawCareerIcon(ctx: CanvasRenderingContext2D, _id: CareerId, size: number): void {
  ctx.fillStyle = '#B9A5E8';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
  ctx.fill();
}
