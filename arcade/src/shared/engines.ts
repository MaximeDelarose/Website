/**
 * Phaser et Matter.js sont chargés par <script> depuis arcade/vendor/ (globals).
 * On n'importe que leurs TYPES ici : rien n'est bundlé, le JS reste sans dépendance de résolution.
 */
import type PhaserType from "phaser";
import type MatterType from "matter-js";

export const Phaser = (globalThis as unknown as { Phaser: typeof PhaserType }).Phaser;
export const Matter = (globalThis as unknown as { Matter: typeof MatterType }).Matter;
