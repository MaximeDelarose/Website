import { Matter } from "../../shared/engines.js";
/** Catégories de collision : une bille sur le plateau ignore la rampe, et inversement. */
export const CAT = { L1: 0x0001, L2: 0x0002, BALL: 0x0004, COMMON: 0x0008 };
/** Masque de collision d'une bille selon son niveau (1 ou 2). */
export function ballMask(level) {
    return (level === 1 ? CAT.L1 : CAT.L2) | CAT.COMMON;
}
function catOf(level) {
    return level === 0 ? CAT.COMMON : level === 1 ? CAT.L1 : CAT.L2;
}
const WALL_THICKNESS = 10;
function filter(level) {
    return { category: catOf(level), mask: CAT.BALL };
}
/** Corps statiques : murs par niveau, bumpers, cibles, capteurs, élingues, roulette, sortie, porte du couloir. */
export function buildStatics(data) {
    const bodies = [];
    for (const wall of data.walls) {
        for (let i = 0; i < wall.pts.length - 1; i++) {
            const [ax, ay] = wall.pts[i];
            const [bx, by] = wall.pts[i + 1];
            const len = Math.hypot(bx - ax, by - ay);
            bodies.push(Matter.Bodies.rectangle((ax + bx) / 2, (ay + by) / 2, len + WALL_THICKNESS, WALL_THICKNESS, {
                isStatic: true,
                angle: Math.atan2(by - ay, bx - ax),
                frictionStatic: 0,
                restitution: 0.3,
                friction: 0.02,
                label: "wall",
                collisionFilter: filter(wall.level),
            }));
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
        bodies.push(Matter.Bodies.rectangle(g.x, g.y, g.w, g.h, { isStatic: true, isSensor: true, label: `gate:${g.id}`, collisionFilter: filter(g.level) }));
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
export function buildFlipper(data, side) {
    const sign = side === "left" ? 1 : -1;
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
