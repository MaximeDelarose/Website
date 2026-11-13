import type PhaserType from "phaser";
import { Phaser } from "../shared/engines.js";
import { BreakoutScene } from "./render/scene.js";

const config: PhaserType.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-stage",
  backgroundColor: "#0b0d12",
  width: 400,
  height: 610,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: new BreakoutScene(),
};

(window as unknown as { breakoutGame: PhaserType.Game }).breakoutGame = new Phaser.Game(config);
