import type MatterType from "matter-js";
import { Matter } from "../../shared/engines.js";

/** Niveaux : 0 = coque et couloir (commun), 1 = plateau, 2 = rampe et étage supérieur. */
export type Level = 0 | 1 | 2;

/** Catégories de collision : une bille sur le plateau ignore la rampe, et inversement. */
export const CAT = { L1: 0x0001, L2: 0x0002, BALL: 0x0004, COMMON: 0x0008 };

/** Masque de collision d'une bille selon son niveau (1 ou 2). */
export function ballMask(level: 1 | 2): number {
  return (level === 1 ? CAT.L1 : CAT.L2) | CAT.COMMON;
}

function catOf(level: Level): number {
  return level === 0 ? CAT.COMMON : level === 1 ? CAT.L1 : CAT.L2;
}

/** Forme de data/arcade/table.json (données lues telles quelles, comme le fera Unity). */
export interface TableData {
  width: number;
  height: number;
  substeps: number;
  gravityScale: number;
  ball: { radius: number; restitution: number; friction: number; frictionAir: number; density: number; maxSpeed: number };
  launch: { x: number; y: number; pull: number; powerMin: number; powerMax: number; chargeFrames: number };
  laneGate: { from: [number, number]; to: [number, number]; openBelowY: number };
  flipper: { length: number; thickness: number; restAngle: number; upAngle: number; speed: number; restitution: number; pivots: { left: [number, number]; right: [number, number] } };
  walls: Array<{ level: Level; pts: Array<[number, number]> }>;
  /** Orbites : chemins de rails (niveau 2). `zone` délimite où une bille peut rester au niveau 2 ; `center` sert aux flèches lumineuses. */
  orbits: Array<{ id: "L" | "R"; center: Array<[number, number]>; zone: Array<[number, number]> }>;
  bumpers: Array<{ id: string; x: number; y: number; r: number; level: 1 | 2 }>;
  targets: Array<{ id: string; x: number; y: number; w: number; h: number }>;
  rollovers: Array<{ id: string; x: number; y: number; w: number; h: number; kind: "letter" | "inlane" | "outlane" }>;
  slingshots: Array<{ points: Array<[number, number]> }>;
  spinners: Array<{ id: string; x: number; y: number; w: number; angle: number; level: 1 | 2 }>;
  levelGates: Array<{ id: string; x: number; y: number; w: number; h: number; angle?: number; set: 1 | 2; level: 1 | 2; role?: "orbit" }>;
  roulette: { x: number; y: number; r: number };
  drain: { y: number; h: number };
}

const WALL_THICKNESS = 10;

function filter(level: Level): MatterType.ICollisionFilter {
  return { category: catOf(level), mask: CAT.BALL };
}

export interface Statics {
  bodies: MatterType.Body[];
  /** Porte à sens unique en haut du couloir de lancement (sensor tant qu'une bille monte). */
  laneGate: MatterType.Body;
}

/** Corps statiques : murs par niveau, bumpers, cibles, capteurs, élingues, roulette, sortie, porte du couloir. */
export function buildStatics(data: TableData): Statics {
  const bodies: MatterType.Body[] = [];
  for (const wall of data.walls) {
    for (let i = 0; i < wall.pts.length - 1; i++) {
      const [ax, ay] = wall.pts[i];
      const [bx, by] = wall.pts[i + 1];
      const len = Math.hypot(bx - ax, by - ay);
      bodies.push(
        Matter.Bodies.rectangle((ax + bx) / 2, (ay + by) / 2, len + WALL_THICKNESS, WALL_THICKNESS, {
          isStatic: true,
          angle: Math.atan2(by - ay, bx - ax),
          frictionStatic: 0,
          restitution: 0.3,
          friction: 0.02,
          label: "wall",
          collisionFilter: filter(wall.level),
        }),
      );
    }
  }
  for (const b of data.bumpers) {
    bodies.push(Matter.Bodies.circle(b.x, b.y, b.r, { isStatic: true, frictionStatic: 0, restitution: 0.6, label: `bumper:${b.id}`, collisionFilter: filter(b.level) }));
  }
  for (const t of data.targets) {
    bodies.push(Matter.Bodies.rectangle(t.x, t.y, t.w, t.h, { isStatic: true, frictionStatic: 0, restitution: 0.6, label: `target:${t.id}`, collisionFilter: filter(1) }));
  }
  for (const r of data.rollovers) {
    bodies.push(Matter.Bodies.rectangle(r.x, r.y, r.w, r.h, { isStatic: true, isSensor: true, label: `rollover:${r.id}`, collisionFilter: filter(1) }));
  }
  for (const s of data.spinners) {
    bodies.push(Matter.Bodies.rectangle(s.x, s.y, s.w, 14, { isStatic: true, isSensor: true, angle: s.angle, label: `spinner:${s.id}`, collisionFilter: filter(s.level) }));
  }
  for (const g of data.levelGates) {
    bodies.push(Matter.Bodies.rectangle(g.x, g.y, g.w, g.h, { isStatic: true, isSensor: true, angle: g.angle ?? 0, label: `gate:${g.id}`, collisionFilter: filter(g.level) }));
  }
  for (const s of data.slingshots) {
    const verts = s.points.map(([x, y]) => ({ x, y }));
    const center = { x: verts.reduce((a, v) => a + v.x, 0) / verts.length, y: verts.reduce((a, v) => a + v.y, 0) / verts.length };
    bodies.push(Matter.Bodies.fromVertices(center.x, center.y, [verts], { isStatic: true, frictionStatic: 0, restitution: 0.6, label: "slingshot", collisionFilter: filter(1) }));
  }
  const rl = data.roulette;
  bodies.push(Matter.Bodies.circle(rl.x, rl.y, rl.r, { isStatic: true, isSensor: true, label: "roulette", collisionFilter: filter(1) }));
  // Sortie : capteur sous la table, toute bille qui le traverse est perdue (quel que soit son niveau).
  bodies.push(Matter.Bodies.rectangle(data.width / 2, data.drain.y + data.drain.h / 2, data.width, data.drain.h, { isStatic: true, isSensor: true, label: "drain", collisionFilter: filter(0) }));

  const [fx, fy] = data.laneGate.from;
  const [tx, ty] = data.laneGate.to;
  const laneGate = Matter.Bodies.rectangle((fx + tx) / 2, (fy + ty) / 2, Math.hypot(tx - fx, ty - fy) + 6, WALL_THICKNESS, {
    isStatic: true,
    angle: Math.atan2(ty - fy, tx - fx),
    frictionStatic: 0,
    restitution: 0.2,
    friction: 0.02,
    label: "lanegate",
    collisionFilter: filter(0),
  });
  bodies.push(laneGate);
  return { bodies, laneGate };
}

/**
 * Flipper : barre statique pilotée à la main autour de son pivot (la scène fixe angle et position à chaque
 * sous-pas, avec mise à jour de la vitesse pour que la bille reçoive le coup).
 */
export function buildFlipper(data: TableData, side: "left" | "right"): { body: MatterType.Body; sign: 1 | -1 } {
  const sign: 1 | -1 = side === "left" ? 1 : -1;
  const f = data.flipper;
  const pivot = f.pivots[side];
  const rest = sign * f.restAngle;
  const center = { x: pivot[0] + sign * (f.length / 2) * Math.cos(rest), y: pivot[1] + sign * (f.length / 2) * Math.sin(rest) };
  const body = Matter.Bodies.rectangle(center.x, center.y, f.length, f.thickness, {
    angle: rest,
    chamfer: { radius: f.thickness / 2 },
    isStatic: true,
    frictionStatic: 0,
    restitution: f.restitution,
    friction: 0.05,
    label: `flipper:${side}`,
    collisionFilter: filter(1),
  });
  return { body, sign };
}

/** Point dans un polygone (tir de rayon), avec une marge de tolérance en pixels. */
export function insidePolygon(poly: Array<[number, number]>, x: number, y: number, margin = 0): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  if (inside) return true;
  if (margin <= 0) return false;
  // tolérance : distance au bord
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    if (Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= margin) return true;
  }
  return false;
}
