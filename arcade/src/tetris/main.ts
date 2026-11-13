import type PhaserType from "phaser";
import { Phaser } from "../shared/engines.js";
import { TetrisScene } from "./render/scene.js";

const scene = new TetrisScene();

const config: PhaserType.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-stage",
  backgroundColor: "#0b0d12",
  width: 440,
  height: 520,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene,
};

(window as unknown as { tetrisGame: PhaserType.Game }).tetrisGame = new Phaser.Game(config);
