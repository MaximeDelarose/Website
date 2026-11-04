/**
 * Illustration du souvenir « Le ciel portait ton prénom ♡ » : Radia (avec le collier) et Auguste sur la terrasse, devant un ciel
 * de feux d'artifice qui a écrit RADIA ❤️. Dessinée dans un repère logique 330 × 440, indépendante de la résolution :
 * sert à la fois pour la carte de l'album et pour l'export PNG en haute résolution.
 */
import { drawAvatar } from '../../game/art/world/avatar';
import { drawNecklaceBig } from '../../game/art/world/avatarNecklace';
import { drawAugusteFull } from '../../game/art/characters';
import { drawAugusteCutout } from '../../game/art/world/radiaNow';
import { currentLook } from '../../game/world/look';
import { glow, sparkle } from '../../game/art/kit';
import { DEFAULT_LOOK, NECKLACE_ID, accGroup, type Look } from '../../data/world/ids';
import { save } from '../../core/app';
import { buildMessage } from './letters';
import { drawNightBackground } from './night';
import { GOLD, HEART_PINK } from './fireworks';

type C = CanvasRenderingContext2D;
export const MEMORY_W = 330;
export const MEMORY_H = 440;

/** Tenue de la soirée (sauvegardée) ou tenue actuelle, avec le collier. */
export function memoryLook(): Look {
  const base: Look = (save.data.fun?.necklace?.look as Look | null) ?? (() => { try { return currentLook(); } catch { return DEFAULT_LOOK; } })();
  return { ...base, acc: [...base.acc.filter((a) => a !== NECKLACE_ID && accGroup(a) !== 'neck'), NECKLACE_ID] };
}

function burstRays(g: C, x: number, y: number, r: number, color: string, n = 22): void {
  glow(g, x, y, r * 1.2, color, 0.3);
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, d0 = r * 0.35, d1 = r * (0.8 + 0.2 * ((i * 7) % 3) / 2);
    const gr = g.createLinearGradient(x + Math.cos(a) * d0, y + Math.sin(a) * d0, x + Math.cos(a) * d1, y + Math.sin(a) * d1);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, color + '00');
    g.strokeStyle = gr; g.lineWidth = 2.1;
    g.beginPath(); g.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); g.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + Math.cos(a) * d1, y + Math.sin(a) * d1, 1.7, 0, 7); g.fill();
  }
  g.restore();
}

export function drawEclatMemory(c: C, w: number, h: number): void {
  const W = MEMORY_W, H = MEMORY_H;
  c.save();
  c.scale(w / W, h / H);
  drawNightBackground(c, W, H);
  // petits feux colorés autour du message
  burstRays(c, 52, 190, 38, '#ff9ac0'); burstRays(c, 285, 168, 44, '#9fd0ff'); burstRays(c, 165, 36, 34, GOLD, 18);
  // RADIA ❤️ écrit dans le ciel
  const msg = buildMessage(312, 54, 300, 4.2);
  const ox = 9, oy = 70;
  msg.points.forEach((p) => {
    const heart = p.letter === msg.letters.length - 1;
    const col = heart ? HEART_PINK : GOLD;
    glow(c, ox + p.x, oy + p.y, 8.5, col, 0.85);
    c.fillStyle = heart ? '#ffe3ec' : '#fffbe8'; c.beginPath(); c.arc(ox + p.x, oy + p.y, 2.1, 0, 7); c.fill();
  });
  // personnages côte à côte
  const look = memoryLook();
  const feet = 426, ph = 300, k = ph / 600;
  const place = (x: number, draw: () => void) => {
    c.save(); c.translate(x - 120 * k, feet - 600 * k); c.scale(k, k);
    c.fillStyle = 'rgba(20,8,50,0.3)'; c.beginPath(); c.ellipse(120, 592, 70, 11, 0, 0, 7); c.fill();
    draw();
    c.restore();
  };
  place(108, () => drawAvatar(c, look, 240, 600, { expr: 'love', arms: 'down' }));
  place(222, () => { if (!drawAugusteCutout(c, 240, 600)) drawAugusteFull(c, { expr: 'love', step: 0 }); });
  // reflets chauds sur eux
  glow(c, 165, 300, 150, '#ffb86b', 0.12);
  // loupe sur le collier
  const lx = 284, ly = 262, lr = 38;
  c.save();
  glow(c, lx, ly, lr * 1.8, '#FFD98A', 0.4);
  c.beginPath(); c.arc(lx, ly, lr, 0, 7); c.fillStyle = '#4a3b78'; c.fill();
  c.save(); c.clip();
  const bg = c.createRadialGradient(lx, ly, 0, lx, ly, lr); bg.addColorStop(0, '#7a63b8'); bg.addColorStop(1, '#2d2257');
  c.fillStyle = bg; c.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
  drawNecklaceBig(c, lx, ly - lr * 0.45, lr * 1.6, 0.5, 0);
  c.restore();
  c.lineWidth = 3.2; c.strokeStyle = '#F3C86B'; c.beginPath(); c.arc(lx, ly, lr, 0, 7); c.stroke();
  c.lineWidth = 1.2; c.strokeStyle = '#58433F'; c.beginPath(); c.arc(lx, ly, lr + 2, 0, 7); c.stroke();
  c.restore();
  // étoiles scintillantes
  for (const [x, y, r] of [[30, 40, 5], [300, 50, 6], [150, 22, 4], [20, 250, 4.5], [310, 330, 5]] as const) sparkle(c, x, y, r, '#FFFFFF', 0.9);
  c.restore();
}
