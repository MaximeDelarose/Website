import type PhaserType from "phaser";
import { PAL } from "../../shared/theme.js";
import { drawPanel } from "../../shared/kit.js";
import { spriteKey } from "../../shared/art.js";
import type { TableData } from "./table.js";

type Scene = PhaserType.Scene;
type G = PhaserType.GameObjects.Graphics;

function strokeLine(g: G, pts: Array<[number, number]>, width: number, color: number, alpha = 1, dx = 0, dy = 0): void {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(pts[0][0] + dx, pts[0][1] + dy);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + dx, pts[i][1] + dy);
  g.strokePath();
}

/** Rail : ombre portée (étage), contour sombre, corps brun, reflet. */
function rail(g: G, pts: Array<[number, number]>): void {
  strokeLine(g, pts, 18, PAL.ink0);
  strokeLine(g, pts, 10, PAL.cap);
  strokeLine(g, pts, 3, PAL.tan, 0.7);
}

/**
 * Dessin fixe de la table (une seule fois) : cadre, fond, décor du site, rails du plateau, puis l'étage
 * supérieur (plateau + rampe) par-dessus avec ombre portée. Renvoie le calque de l'étage, à placer au-dessus
 * des billes du plateau.
 */
export function paintTable(scene: Scene, d: TableData, tx: number, ty: number): void {
  const frame = scene.add.graphics().setDepth(0);
  drawPanel(frame, tx - 14, ty - 14, d.width + 28, d.height + 28, { fill: 0x1b3224, depth: 8, bw: 8 });

  const floor = scene.add.graphics().setDepth(1).setPosition(tx, ty);
  floor.fillStyle(0x1d3a2a, 1);
  floor.fillRect(0, 0, d.width, d.height);
  floor.lineStyle(10, 0x22442f, 1);
  floor.strokeCircle(220, 220, 170);
  floor.strokeCircle(220, 220, 105);
  floor.fillStyle(0x16291f, 1);
  floor.fillRect(400, 0, 40, d.height); // couloir de lancement
  floor.fillStyle(0x22442f, 1);
  for (let i = 0; i < 7; i++) floor.fillCircle(70 + i * 50, 560, 5);
  for (let i = 0; i < 5; i++) floor.fillCircle(130 + i * 45, 120 - (i % 2) * 10, 4);

  // décor du site : trèfles, mousse, coccinelles à peine visibles sous la table
  const decor: Array<[string, number, number]> = [["clover", 70, 560], ["clover", 332, 600], ["moss", 210, 530], ["ladybug", 110, 520], ["clover", 330, 120], ["moss", 250, 240], ["ladybug", 160, 470], ["clover", 190, 700], ["moss", 80, 700], ["clover", 330, 700]];
  for (const [name, x, y] of decor) {
    const key = spriteKey(scene, name, 3);
    if (key) scene.add.image(tx + x, ty + y, key).setDepth(1.5).setAlpha(0.45);
  }

  // rails du plateau et de la coque
  const walls = scene.add.graphics().setDepth(2).setPosition(tx, ty);
  for (const w of d.walls) if (w.level !== 2) rail(walls, w.pts);
  // porte du couloir
  const [gf, gt] = [d.laneGate.from, d.laneGate.to];
  strokeLine(walls, [gf, gt], 14, PAL.ink0);
  strokeLine(walls, [gf, gt], 7, PAL.leaf);

  // orbites : couloirs teintés (on voit à travers) puis rails en tubes par-dessus
  const upper = scene.add.graphics().setDepth(12).setPosition(tx, ty);
  for (const o of d.orbits) {
    upper.fillStyle(PAL.orangeLight, 0.1);
    upper.fillPoints(o.zone.map(([x, y]) => ({ x, y })), true);
  }
  for (const w of d.walls) if (w.level === 2) tube(upper, w.pts);
}

/** Rail d'orbite : tube de métal translucide avec ombre portée sur la table. */
function tube(g: G, pts: Array<[number, number]>): void {
  strokeLine(g, pts, 9, PAL.ink0, 0.28, 6, 9);
  strokeLine(g, pts, 13, PAL.ink0, 0.9);
  strokeLine(g, pts, 7, 0xcfd8dc, 0.95);
  strokeLine(g, pts, 2, 0xffffff, 0.85, -1, -1);
}
