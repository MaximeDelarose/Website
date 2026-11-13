import type MatterType from "matter-js";
import { Matter } from "../../shared/engines.js";

/** Forme de flipper/data/table.json (données lues telles quelles, comme le fera Unity). */
export interface TableData {
  width: number;
  height: number;
  substeps: number;
  ball: { radius: number; restitution: number; friction: number; frictionAir: number; density: number; maxSpeed: number };
  launch: { x: number; y: number; powerMin: number; powerMax: number; chargeFrames: number };
  flipper: { length: number; thickness: number; restAngle: number; upAngle: number; speed: number; restitution: number; pivots: { left: [number, number]; right: [number, number] } };
  walls: Array<Array<[number, number]>>;
  bumpers: Array<{ id: string; x: number; y: number; r: number }>;
  targets: Array<{ id: string; x: number; y: number; w: number; h: number }>;
  rollovers: Array<{ id: string; x: number; y: number; w: number; h: number }>;
  slingshots: Array<{ points: Array<[number, number]> }>;
  drain: { y: number; h: number };
}

const WALL_THICKNESS = 8;

/** Murs (polylignes), sensors, bumpers, cibles, rollovers, slingshots : corps statiques Matter. */
export function buildStatics(data: TableData): MatterType.Body[] {
  const bodies: MatterType.Body[] = [];
  for (const line of data.walls) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i];
      const [bx, by] = line[i + 1];
      const len = Math.hypot(bx - ax, by - ay);
      bodies.push(
        Matter.Bodies.rectangle((ax + bx) / 2, (ay + by) / 2, len + WALL_THICKNESS, WALL_THICKNESS, {
          isStatic: true,
          angle: Math.atan2(by - ay, bx - ax),
          restitution: 0.4,
          friction: 0.05,
          label: "wall",
        }),
      );
    }
  }
  for (const b of data.bumpers) {
    bodies.push(Matter.Bodies.circle(b.x, b.y, b.r, { isStatic: true, restitution: 1.2, label: `bumper:${b.id}` }));
  }
  for (const t of data.targets) {
    bodies.push(Matter.Bodies.rectangle(t.x, t.y, t.w, t.h, { isStatic: true, restitution: 0.6, label: `target:${t.id}` }));
  }
  for (const r of data.rollovers) {
    bodies.push(Matter.Bodies.rectangle(r.x, r.y, r.w, r.h, { isStatic: true, isSensor: true, label: `rollover:${r.id}` }));
  }
  for (const s of data.slingshots) {
    const verts = s.points.map(([x, y]) => ({ x, y }));
    const center = { x: verts.reduce((a, v) => a + v.x, 0) / verts.length, y: verts.reduce((a, v) => a + v.y, 0) / verts.length };
    bodies.push(Matter.Bodies.fromVertices(center.x, center.y, [verts], { isStatic: true, restitution: 1.3, label: "slingshot" }));
  }
  // Sortie : capteur sous la table, toute bille qui le traverse est perdue.
  bodies.push(
    Matter.Bodies.rectangle(data.width / 2, data.drain.y + data.drain.h / 2, data.width, data.drain.h, {
      isStatic: true,
      isSensor: true,
      label: "drain",
    }),
  );
  return bodies;
}

/** Flipper : barre dynamique reliée à un pivot fixe ; l'angle est borné par `clampFlipper`. */
export function buildFlipper(
  data: TableData,
  side: "left" | "right",
): { body: MatterType.Body; constraint: MatterType.Constraint; sign: 1 | -1; pivot: [number, number] } {
  const sign: 1 | -1 = side === "left" ? 1 : -1;
  const f = data.flipper;
  const pivot = f.pivots[side];
  const rest = sign * f.restAngle;
  const center = { x: pivot[0] + (sign * f.length) / 2, y: pivot[1] };
  const body = Matter.Bodies.rectangle(center.x, center.y, f.length, f.thickness, {
    angle: rest,
    chamfer: { radius: f.thickness / 2 },
    restitution: f.restitution,
    friction: 0.05,
    density: 0.01,
    label: `flipper:${side}`,
  });
  const constraint = Matter.Constraint.create({
    pointA: { x: pivot[0], y: pivot[1] },
    bodyB: body,
    pointB: { x: (-sign * f.length) / 2, y: 0 },
    stiffness: 1,
    length: 0,
  });
  return { body, constraint, sign, pivot };
}

/** Limites d'angle d'un flipper (repos et levé), dans le sens du corps. */
export function flipperLimits(data: TableData, sign: 1 | -1): { lo: number; hi: number } {
  const rest = sign * data.flipper.restAngle;
  const up = -sign * data.flipper.upAngle;
  return { lo: Math.min(rest, up), hi: Math.max(rest, up) };
}
