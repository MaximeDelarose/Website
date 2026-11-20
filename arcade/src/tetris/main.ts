import type PhaserType from "phaser";
import { Phaser } from "../shared/engines.js";
import { bindFullscreen } from "../shared/fullscreen.js";
import { GAME_H, GAME_W, TetrisScene } from "./render/scene.js";

// Londrina (police du site) doit être chargée avant que Phaser dessine les textes.
const fontReady = document.fonts ? document.fonts.load('40px "Londrina"').catch(() => undefined) : Promise.resolve();

void fontReady.then(() => {
  const config: PhaserType.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-stage",
    backgroundColor: "#1f3a2b",
    width: GAME_W,
    height: GAME_H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new TetrisScene(),
  };
  const game = new Phaser.Game(config);
  (window as unknown as { tetrisGame: PhaserType.Game }).tetrisGame = game;
  // Plein écran : le cadre (#game-stage) passe en plein écran, Phaser se recalcule à chaque changement.
  bindFullscreen("game-stage", () => game.scale.refresh());
});
