// Géométrie des sacs : formes, rotations, miroir, adjacence, validation.

import type { SpecialCell, Vec } from "./types";

export const DIRS: readonly Vec[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export const key = (x: number, y: number): string => `${x},${y}`;

/** Rotation d'un quart de tour horaire (repère écran, y vers le bas). */
export function rotateVec(v: Vec, rot: number): Vec {
  let [x, y] = v;
  const r = ((rot % 4) + 4) % 4;
  for (let i = 0; i < r; i++) {
    const nx = -y;
    y = x;
    x = nx;
  }
  return [x + 0, y + 0]; // +0 : évite les -0
}

function mirrorVec(v: Vec, mirror: boolean): Vec {
  return mirror ? [-v[0] + 0, v[1]] : [v[0], v[1]];
}

export interface Transform {
  rot: number;
  mirror: boolean;
}

/** Décalage qui ramène la forme transformée en (0,0) en haut à gauche. */
function normalizeOffset(cells: Vec[]): Vec {
  let mx = Infinity;
  let my = Infinity;
  for (const [x, y] of cells) {
    if (x < mx) mx = x;
    if (y < my) my = y;
  }
  return [mx, my];
}

/** Forme transformée (miroir puis rotation) et normalisée. */
export function transformShape(shape: Vec[], t: Transform): Vec[] {
  const raw = shape.map((c) => rotateVec(mirrorVec(c, t.mirror), t.rot));
  const [ox, oy] = normalizeOffset(raw);
  return raw.map(([x, y]) => [x - ox, y - oy] as Vec);
}

/** Case et direction d'une case spéciale après transformation de la forme. */
export function transformSpecialCell(shape: Vec[], sc: SpecialCell, t: Transform): { cell: Vec; dir?: Vec } {
  const raw = shape.map((c) => rotateVec(mirrorVec(c, t.mirror), t.rot));
  const [ox, oy] = normalizeOffset(raw);
  const c = rotateVec(mirrorVec(sc.cell, t.mirror), t.rot);
  const cell: Vec = [c[0] - ox, c[1] - oy];
  const dir = sc.dir ? rotateVec(mirrorVec(sc.dir, t.mirror), t.rot) : undefined;
  return dir ? { cell, dir } : { cell };
}

/** Cases absolues occupées par un objet posé en pos. */
export function placedCells(shape: Vec[], pos: Vec, t: Transform): Vec[] {
  return transformShape(shape, t).map(([x, y]) => [x + pos[0], y + pos[1]] as Vec);
}

/** Deux ensembles de cases se touchent-ils par au moins un côté ? */
export function cellsAdjacent(a: Vec[], b: Vec[]): boolean {
  const set = new Set(b.map(([x, y]) => key(x, y)));
  for (const [x, y] of a) {
    for (const [dx, dy] of DIRS) if (set.has(key(x + dx, y + dy))) return true;
  }
  return false;
}

/** Un ensemble de cases est-il d'un seul tenant (4-connexe) ? */
export function isConnected(cells: Vec[]): boolean {
  if (cells.length === 0) return true;
  const set = new Set(cells.map(([x, y]) => key(x, y)));
  const seen = new Set<string>();
  const stack: Vec[] = [cells[0]];
  seen.add(key(cells[0][0], cells[0][1]));
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of DIRS) {
      const k = key(x + dx, y + dy);
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push([x + dx, y + dy]);
      }
    }
  }
  return seen.size === set.size;
}

export interface PlacedShape {
  id: string;
  cells: Vec[];
}

export type BagProblem =
  | { kind: "outside"; id: string; cell: Vec }
  | { kind: "overlap"; id: string; other: string; cell: Vec };

/**
 * Vérifie un ensemble de placements : chaque case doit être dans le sac
 * (si bagCells est fourni) et deux objets ne peuvent pas se chevaucher.
 */
export function validatePlacements(placed: PlacedShape[], bagCells?: Vec[]): BagProblem[] {
  const problems: BagProblem[] = [];
  const bag = bagCells ? new Set(bagCells.map(([x, y]) => key(x, y))) : null;
  const owner = new Map<string, string>();
  for (const p of placed) {
    for (const [x, y] of p.cells) {
      const k = key(x, y);
      if (bag && !bag.has(k)) problems.push({ kind: "outside", id: p.id, cell: [x, y] });
      const o = owner.get(k);
      if (o !== undefined) problems.push({ kind: "overlap", id: p.id, other: o, cell: [x, y] });
      else owner.set(k, p.id);
    }
  }
  return problems;
}
