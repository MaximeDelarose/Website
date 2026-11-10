/**
 * Selfies FICTIFS de Radia (jamais les vraies photos de l'iPhone) : son personnage du jeu, avec son look actuel.
 *  - ph_smile : gros plan souriant · ph_outfit : sa tenue du jour (en pied) · ph_funny : une grimace amusante.
 */
import { canvasUrl, makeCanvas } from '../../../game/art/kit';
import { lookKey, radiaBustCanvas, radiaFaceCanvas, radiaNowCanvas } from '../../../game/art/world/radiaNow';

export type SelfiePick = 'ph_smile' | 'ph_outfit' | 'ph_funny';
const BG: Record<SelfiePick, [string, string]> = { ph_smile: ['#FFE3EE', '#F59DBD'], ph_outfit: ['#EADFFF', '#B9A2E8'], ph_funny: ['#FFF1C9', '#F5B86B'] };

export function radiaSelfieCanvas(pick: SelfiePick): HTMLCanvasElement {
  const W = 300, H = 400, S = 1.5;
  const cv = makeCanvas(W * S, H * S); const g = cv.getContext('2d')!; g.scale(S, S);
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, BG[pick][0]); grad.addColorStop(1, BG[pick][1]); g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.35; g.fillStyle = '#fff'; for (const [x, y, r] of [[40, 60, 22], [250, 90, 14], [220, 330, 26], [60, 320, 12]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
  g.imageSmoothingQuality = 'high';
  if (pick === 'ph_outfit') { const f = radiaNowCanvas(240, 600); const h = 392, w = h * 0.4; g.drawImage(f, (W - w) / 2, 4, w, h); }
  else if (pick === 'ph_smile') { const f = radiaFaceCanvas('smile', 360); g.drawImage(f, 20, 40, 260, 260 * (f.height / f.width)); }
  else { const b = radiaBustCanvas('tease', 360); const w = 250; g.save(); g.translate(W / 2, 220); g.rotate(-0.07); g.drawImage(b, -w / 2, -w * (b.height / b.width) / 2, w, w * (b.height / b.width)); g.restore(); }
  return cv;
}
export const radiaSelfieUrl = (pick: SelfiePick): string => canvasUrl(`snp:radia:${pick}:${lookKey()}`, () => radiaSelfieCanvas(pick));
