/** Effets partagés par les mini-jeux (textures de particules, éclats). */
import type Phaser from 'phaser';
import type { BaseScene } from '../scenes/BaseScene';
import { PAL, heartPath, sparkle, glow } from '../art/kit';
import { reducedFx } from '../../core/app';

export function fxTextures(s: BaseScene): void {
  s.tex('mgfx:heart', 24, 24, (c) => {
    heartPath(c, 12, 12.5, 20);
    c.fillStyle = PAL.roseVif; c.fill();
    c.lineWidth = 1.6; c.strokeStyle = '#C4407A'; c.stroke();
    c.beginPath(); c.arc(8, 9, 2.4, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill();
  });
  s.tex('mgfx:spark', 20, 20, (c) => sparkle(c, 10, 10, 9, '#FFF6D8'));
  s.tex('mgfx:glow', 64, 64, (c) => glow(c, 32, 32, 32, '#FFE7A0', 0.9));
}

/** Éclat de cœurs et d'étincelles à (x, y). */
export function burst(s: BaseScene, x: number, y: number, n = 14, depth = 50): void {
  const k = 1 / s.dpr;
  void k;
  const count = reducedFx() ? Math.ceil(n / 3) : n;
  const em = s.add.particles(x, y, 'mgfx:heart', {
    speed: { min: 80, max: 240 }, angle: { min: 0, max: 360 }, lifespan: 900,
    scale: { start: 0.5, end: 0 }, gravityY: 260, rotate: { min: -40, max: 40 }, emitting: false,
  }).setDepth(depth);
  em.explode(count);
  const sp = s.add.particles(x, y, 'mgfx:spark', {
    speed: { min: 40, max: 180 }, angle: { min: 0, max: 360 }, lifespan: 700,
    scale: { start: 0.7, end: 0 }, emitting: false,
  }).setDepth(depth);
  sp.explode(count);
  s.time.delayedCall(1200, () => { em.destroy(); sp.destroy(); });
}

/** Note : les images issues de BaseScene.tex sont à la densité de l'écran → setDisplaySize. */
export function img(s: BaseScene, x: number, y: number, key: string, w: number, h: number): Phaser.GameObjects.Image {
  return s.add.image(x, y, key).setDisplaySize(w, h);
}
