/**
 * Surcouche de MAQUILLAGE sur la tête peinte de Radia. Le contexte est dans le repère de l'illustration (pixels de `char-radia-nc`,
 * identique pour la tête complète et le visage seul) : yeux autour de (140 ; 120) et (212 ; 120), joues (141 ; 141), bouche (176 ; 175).
 * Les teintes se MULTIPLIENT avec la peau (le dessin dessous reste visible) ; rien ne remplace la tête, aucune forme du visage ne change.
 */
import type { MakeupSpec } from '../../world/makeupSpec';

const hexA = (hex: string, a: number): string => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const MID = 176;
const mx = (x: number): number => 2 * MID - x;

function eyeSides(draw: (side: 1 | -1, X: (x: number) => number) => void): void {
  draw(1, (x) => x);
  draw(-1, mx);
}

export function drawMakeupOverlay(ctx: CanvasRenderingContext2D, m: MakeupSpec): void {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // fard à paupières : nuage doux au-dessus du trait de l'œil
  if (m.shadow) {
    const col = m.shadow;
    ctx.globalCompositeOperation = 'multiply';
    eyeSides((_s, X) => {
      const cx = X(141), cy = 111;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.34);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
      g.addColorStop(0, hexA(col, 0.78)); g.addColorStop(0.6, hexA(col, 0.5)); g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }
  // blush ajouté sur les pommettes
  if (m.blush) {
    ctx.globalCompositeOperation = 'multiply';
    eyeSides((_s, X) => {
      const cx = X(142), cy = 142;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
      g.addColorStop(0, hexA(m.blush!.color, m.blush!.alpha)); g.addColorStop(1, hexA(m.blush!.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
    });
  }
  // eye-liner appuyé : le trait de l'illustration est épaissi (même tracé, même aile)
  if (m.linerBold) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(24,12,10,0.92)'; ctx.lineWidth = 2.6;
    eyeSides((_s, X) => {
      ctx.beginPath(); ctx.moveTo(X(119), 116.4); ctx.bezierCurveTo(X(128), 114.6, X(138), 112.4, X(147), 113.2); ctx.bezierCurveTo(X(154), 114, X(159), 118, X(162), 123.2); ctx.stroke();
    });
  }
  // rouge à lèvres / gloss : teinte multipliée sur les lèvres, reflet blanc doux
  if (m.lip) {
    const lipPath = (): void => {
      ctx.beginPath(); ctx.moveTo(153.5, 172.4);
      ctx.bezierCurveTo(161, 167.4, 170, 166.6, 176, 169.6); ctx.bezierCurveTo(182, 166.6, 191, 167.4, 198.5, 172.4);
      ctx.bezierCurveTo(192, 181.6, 184, 186.4, 176, 186.4); ctx.bezierCurveTo(168, 186.4, 160, 181.6, 153.5, 172.4); ctx.closePath();
    };
    if (!m.lip.gloss) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = hexA(m.lip.color, 0.62); lipPath(); ctx.fill(); }
    else { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = hexA(m.lip.color, 0.3); lipPath(); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.ellipse(176, 178.4, 11, 2.4, 0, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,248,244,${m.lip.gloss ? 0.5 : 0.28})`; ctx.fill();
    ctx.beginPath(); ctx.ellipse(167, 170.6, 4.6, 1.2, -0.15, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,248,244,${m.lip.gloss ? 0.4 : 0.2})`; ctx.fill();
  }
  ctx.restore();
}
