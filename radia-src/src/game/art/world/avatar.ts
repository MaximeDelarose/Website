/**
 * Avatar en couches de Radia (corps, cheveux, haut, bas, chaussures, accessoires).
 * STUB temporaire : dessine l'avatar existant ; le module « dressing » remplace
 * cette implémentation en gardant exactement la signature.
 */
import type { Look } from '../../../data/world/ids';
import type { Expr } from '../../../data/dialogue';
import { drawRadiaFull } from '../characters';

export interface AvatarOpts { expr?: Expr; step?: number; arms?: 'down' | 'wave' | 'heart' | 'open'; blink?: boolean }

/**
 * Dessine Radia en pied avec son look, centrée dans une boîte w × h (ratio 240 × 600
 * conservé, pieds en bas de la boîte).
 */
export function drawAvatar(ctx: CanvasRenderingContext2D, look: Look, w: number, h: number, opts: AvatarOpts = {}): void {
  const k = Math.min(w / 240, h / 600);
  ctx.save();
  ctx.translate((w - 240 * k) / 2, h - 600 * k);
  ctx.scale(k, k);
  drawRadiaFull(ctx, { expr: opts.expr ?? 'smile', outfit: look.crown ? 'royal' : 'hoodie', step: opts.step, arms: opts.arms, blink: opts.blink });
  ctx.restore();
}

/** Look actuellement porté (lu depuis la sauvegarde). */
export { currentLook } from '../../world/look';
