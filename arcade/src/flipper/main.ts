import type PhaserType from "phaser";
import { Phaser } from "../shared/engines.js";
import { FlipperScene } from "./render/scene.js";

const config: PhaserType.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-stage",
  backgroundColor: "#0b0d12",
  width: 400,
  height: 700,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: new FlipperScene(),
};

(window as unknown as { flipperGame: PhaserType.Game }).flipperGame = new Phaser.Game(config);
