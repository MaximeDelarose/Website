import '@fontsource/fredoka/latin-700.css';
import { heartPath, paint, roundRect, sparkle, PAL } from '../src/game/art/kit';
import { crownCanvas } from '../src/game/art/characters';

function icon(size: number, maskable: boolean, rounded: boolean): string {
  return paint(size, size, 1, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, '#FFC6D9');
    g.addColorStop(0.55, PAL.roseVif);
    g.addColorStop(1, PAL.lavande);
    if (rounded) { roundRect(ctx, 0, 0, size, size, size * 0.22); ctx.fillStyle = g; ctx.fill(); }
    else { ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); }
    const k = maskable ? 0.72 : 0.9;
    const c = size / 2;
    ctx.save();
    ctx.translate(c, c);
    ctx.scale(k, k);
    ctx.translate(-c, -c);
    heartPath(ctx, c, c * 1.08, size * 0.66);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(81,68,109,0.35)';
    ctx.shadowBlur = size * 0.04;
    ctx.shadowOffsetY = size * 0.015;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = PAL.roseDeep;
    ctx.font = `700 ${size * 0.34}px Fredoka`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R', c, c * 1.04);
    const cr = crownCanvas(Math.round(size * 0.3));
    ctx.drawImage(cr, c - size * 0.15, c - size * 0.5);
    sparkle(ctx, size * 0.78, size * 0.3, size * 0.05, '#FFF6D0');
    sparkle(ctx, size * 0.22, size * 0.76, size * 0.035, '#FFFFFF');
    ctx.restore();
  }).toDataURL('image/png');
}
document.fonts.load('700 40px Fredoka').then(() => {
  (window as unknown as Record<string, unknown>).ICONS = {
    'icon-192.png': icon(192, false, false),
    'icon-512.png': icon(512, false, false),
    'icon-maskable-512.png': icon(512, true, false),
    'apple-touch-icon.png': icon(180, false, false),
    'favicon-64.png': icon(64, false, true),
  };
});
