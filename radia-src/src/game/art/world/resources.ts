/** Icônes des ressources du château (pièce, fleur, tissu, cacao), style RADIA. */
import type { ResKind } from '../../../data/world/ids';
import { OUTLINE, PAL, ellipse, fillShaded, gloss, heartPath, paint, canvasUrl, shade } from '../kit';

export function drawResIcon(ctx: CanvasRenderingContext2D, kind: ResKind, size: number): void {
  const lw = size * 0.045;
  const c = size / 2;
  ctx.lineJoin = 'round';
  if (kind === 'coins') {
    ellipse(ctx, c, c, size * 0.42, size * 0.42);
    fillShaded(ctx, PAL.or, { x: c - size * 0.42, y: c - size * 0.42, w: size * 0.84, h: size * 0.84 }, lw);
    ellipse(ctx, c, c, size * 0.3, size * 0.3);
    ctx.lineWidth = lw * 0.7;
    ctx.strokeStyle = shade(PAL.orDeep, -0.1);
    ctx.stroke();
    heartPath(ctx, c, c + size * 0.02, size * 0.34);
    ctx.fillStyle = PAL.roseVif;
    ctx.fill();
    ctx.lineWidth = lw * 0.6;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    gloss(ctx, c - size * 0.18, c - size * 0.2, size * 0.1, size * 0.04, 0.7, -0.6);
  } else if (kind === 'flowers') {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      ellipse(ctx, c + Math.cos(a) * size * 0.2, c + Math.sin(a) * size * 0.2, size * 0.17, size * 0.2, a + Math.PI / 2);
      fillShaded(ctx, '#FF9CC0', { x: c - size * 0.3, y: c - size * 0.3, w: size * 0.6, h: size * 0.6 }, lw);
    }
    ellipse(ctx, c, c, size * 0.12, size * 0.12);
    fillShaded(ctx, PAL.or, { x: c - size * 0.12, y: c - size * 0.12, w: size * 0.24, h: size * 0.24 }, lw);
  } else if (kind === 'fabric') {
    // bobine de fil + tissu plié
    ctx.beginPath();
    ctx.moveTo(size * 0.12, size * 0.34);
    ctx.lineTo(size * 0.74, size * 0.26);
    ctx.lineTo(size * 0.88, size * 0.62);
    ctx.lineTo(size * 0.26, size * 0.74);
    ctx.closePath();
    fillShaded(ctx, PAL.lavande, { x: 0, y: size * 0.2, w: size, h: size * 0.6 }, lw);
    ctx.beginPath();
    ctx.moveTo(size * 0.26, size * 0.74);
    ctx.lineTo(size * 0.88, size * 0.62);
    ctx.lineTo(size * 0.88, size * 0.72);
    ctx.lineTo(size * 0.26, size * 0.84);
    ctx.closePath();
    fillShaded(ctx, '#9682D6', { x: 0, y: size * 0.6, w: size, h: size * 0.3 }, lw);
    ctx.lineWidth = lw * 0.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.setLineDash([size * 0.05, size * 0.05]);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.42);
    ctx.lineTo(size * 0.78, size * 0.34);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(-0.5);
    ellipse(ctx, 0, 0, size * 0.3, size * 0.4);
    fillShaded(ctx, '#8A5A3E', { x: -size * 0.3, y: -size * 0.4, w: size * 0.6, h: size * 0.8 }, lw);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.36);
    ctx.quadraticCurveTo(size * 0.12, 0, 0, size * 0.36);
    ctx.lineWidth = lw * 0.9;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    gloss(ctx, -size * 0.12, -size * 0.18, size * 0.06, size * 0.12, 0.5, 0.2);
    ctx.restore();
  }
}

export const resIconUrl = (kind: ResKind, size = 48): string =>
  canvasUrl(`res:${kind}:${size}`, () => paint(size, size, 2, (ctx) => drawResIcon(ctx, kind, size)));
