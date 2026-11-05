/**
 * Démarrage de Phaser. Le canvas a la taille CSS × densité de pixels et la
 * caméra de chaque scène est zoomée de cette densité : toutes les scènes
 * travaillent en pixels CSS mais le rendu reste net sur un écran Retina.
 */
import Phaser from 'phaser';
import { viewport } from './layout';
import { events } from '../core/app';
import { BackdropScene } from './scenes/BackdropScene';
import { installPointerHygiene } from './pointerHygiene';

export function createGame(): Phaser.Game {
  const { w, h, dpr } = viewport();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#51446D',
    scale: { mode: Phaser.Scale.NONE, width: w * dpr, height: h * dpr, zoom: 1 / dpr },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    fps: { target: 60, smoothStep: true },
    input: { activePointers: 2, touch: { capture: true } },
    disableContextMenu: true,
    audio: { noAudio: true },
    banner: false,
    scene: [BackdropScene],
  });

  // Les relâchements de doigt perdus (iOS) ne doivent jamais épuiser les pointeurs de Phaser : cf. pointerHygiene.ts
  installPointerHygiene(game);

  let timer: number | undefined;
  const resize = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const v = viewport();
      game.scale.resize(v.w * v.dpr, v.h * v.dpr);
      game.scale.setZoom(1 / v.dpr);
      events.emit('layout', { w: v.w, h: v.h });
    }, 60);
  };
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.visualViewport?.addEventListener('resize', resize);
  const app = document.getElementById('app');
  if (app && 'ResizeObserver' in window) new ResizeObserver(resize).observe(app);
  return game;
}
