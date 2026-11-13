import { Phaser } from "../shared/engines.js";
import { FlipperScene } from "./render/scene.js";
const config = {
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#0b0d12",
    width: 400,
    height: 700,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new FlipperScene(),
};
window.flipperGame = new Phaser.Game(config);
