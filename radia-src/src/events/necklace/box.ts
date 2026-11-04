/** Écrin du collier : blanc crème, intérieur en velours rose, couvercle qui s'ouvre lentement. */
import { heartPath, roundRect, glow } from '../../game/art/kit';

type C = CanvasRenderingContext2D;
const GOLD = '#F3C86B';
const GOLD_D = '#C8902C';
const EDGE = '#8a6a70';
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/**
 * (cx, y) = milieu du bord avant du dessus de l'écrin ; s = largeur. `open` ∈ [0,1].
 * `back` : dessine ce qui est DERRIÈRE le bijou (intérieur + couvercle levé) ; `front` : la façade (devant le bijou).
 */
export function drawGiftBox(g: C, cx: number, y: number, s: number, open: number, part: 'back' | 'front'): void {
  const th = Math.min(1, Math.max(0, open)) * 1.95; // angle du couvercle (rad)
  const cosT = Math.cos(th), sinT = Math.sin(th);
  const backY = -0.22 * s;
  g.save();
  g.translate(cx, y);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const lw = Math.max(1.5, s * 0.018);

  const lidQuad = (): { tipY: number; hwT: number; hwB: number } => ({ tipY: backY + 0.22 * s * cosT - 0.4 * s * sinT, hwT: 0.44 * s + 0.06 * s * Math.max(0, cosT), hwB: 0.44 * s });
  const drawLid = (): void => {
    const { tipY, hwT, hwB } = lidQuad();
    const inner = th > 1.25;
    g.beginPath(); g.moveTo(-hwB, backY); g.lineTo(hwB, backY); g.lineTo(hwT, tipY); g.lineTo(-hwT, tipY); g.closePath();
    const y0 = Math.min(backY, tipY), y1 = Math.max(backY, tipY);
    const lgr = g.createLinearGradient(0, y0, 0, y1);
    if (inner) { lgr.addColorStop(0, '#f6dbe4'); lgr.addColorStop(0.5, '#fff6f4'); lgr.addColorStop(1, '#ffffff'); } else { lgr.addColorStop(0, '#fffaf0'); lgr.addColorStop(1, '#f1dfcc'); }
    g.fillStyle = lgr; g.fill();
    g.lineWidth = lw; g.strokeStyle = EDGE; g.stroke();
    // liseré doré
    g.save(); g.beginPath(); g.moveTo(-hwB * 0.92, backY + (tipY - backY) * 0.1); g.lineTo(hwB * 0.92, backY + (tipY - backY) * 0.1); g.lineTo(hwT * 0.92, tipY - (tipY - backY) * 0.1); g.lineTo(-hwT * 0.92, tipY - (tipY - backY) * 0.1); g.closePath();
    g.lineWidth = lw * 0.7; g.strokeStyle = GOLD; g.stroke(); g.restore();
    if (!inner) {
      const my = (backY + tipY) / 2;
      heartPath(g, 0, my, s * 0.12); g.fillStyle = '#f4a0bf'; g.fill(); g.lineWidth = lw * 0.6; g.strokeStyle = GOLD_D; g.stroke();
    } else {
      // satin : léger reflet
      g.save(); g.globalAlpha = 0.5; g.beginPath(); g.moveTo(-hwB * 0.6, backY - 2); g.lineTo(-hwB * 0.2, backY - 2); g.lineTo(-hwT * 0.35, tipY + 2); g.lineTo(-hwT * 0.75, tipY + 2); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.restore();
    }
  };

  if (part === 'back') {
    // ombre portée + corps arrière
    // intérieur : velours rose
    g.beginPath(); g.moveTo(-0.44 * s, backY); g.lineTo(0.44 * s, backY); g.lineTo(0.5 * s, 0); g.lineTo(-0.5 * s, 0); g.closePath();
    const vg = g.createLinearGradient(0, backY, 0, 0);
    vg.addColorStop(0, '#d9809f'); vg.addColorStop(0.55, '#ee9fbb'); vg.addColorStop(1, '#f7bfd2');
    g.fillStyle = vg; g.fill(); g.lineWidth = lw; g.strokeStyle = EDGE; g.stroke();
    // coussin central (fente pour le collier)
    g.save(); g.beginPath(); g.moveTo(-0.44 * s, backY); g.lineTo(0.44 * s, backY); g.lineTo(0.5 * s, 0); g.lineTo(-0.5 * s, 0); g.closePath(); g.clip();
    g.fillStyle = 'rgba(184,96,130,0.45)'; roundRect(g, -0.34 * s, backY + 0.045 * s, 0.68 * s, 0.13 * s, 0.05 * s); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)'; roundRect(g, -0.4 * s, backY + 0.012 * s, 0.8 * s, 0.025 * s, 0.012 * s); g.fill();
    g.restore();
    if (th > 1.0) drawLid(); // couvercle levé : derrière le bijou
    g.restore();
    return;
  }
  // façade
  roundRect(g, -0.5 * s, 0, s, 0.3 * s, 0.045 * s);
  const bg = g.createLinearGradient(-0.5 * s, 0, 0.5 * s, 0.3 * s);
  bg.addColorStop(0, '#fffdf6'); bg.addColorStop(0.55, '#f8ecdc'); bg.addColorStop(1, '#ecd7c2');
  g.fillStyle = bg; g.fill();
  g.save(); g.clip();
  g.fillStyle = GOLD; g.fillRect(-0.5 * s, 0, s, 0.034 * s);
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(-0.5 * s, 0.034 * s, s, 0.01 * s);
  g.fillStyle = GOLD; g.fillRect(-0.5 * s, 0.262 * s, s, 0.038 * s);
  g.restore();
  g.lineWidth = lw; g.strokeStyle = EDGE; roundRect(g, -0.5 * s, 0, s, 0.3 * s, 0.045 * s); g.stroke();
  // fermoir doré + petit cœur
  roundRect(g, -0.045 * s, 0.02 * s, 0.09 * s, 0.1 * s, 0.02 * s); g.fillStyle = GOLD; g.fill(); g.lineWidth = lw * 0.7; g.strokeStyle = GOLD_D; g.stroke();
  heartPath(g, 0, 0.18 * s, s * 0.07); g.fillStyle = '#f4a0bf'; g.fill(); g.lineWidth = lw * 0.6; g.strokeStyle = GOLD_D; g.stroke();
  // couvercle fermé / mi-ouvert : devant l'intérieur
  if (th <= 1.0) drawLid();
  void lerp; void glow;
  g.restore();
}
