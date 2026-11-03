/**
 * « Le chemin des deux cœurs » — logique pure.
 * Chaque case a des ouvertures (bits N=1, E=2, S=4, O=8) et une rotation
 * (quarts de tour horaires). Deux cœurs fixes doivent être reliés.
 * Des ronces peuvent bloquer une case : on les retire en touchant un levier.
 */
import { Rng } from '../../../utils/rng';

export const N = 1, E = 2, S = 4, W = 8;
const DIRS: [number, number, number, number][] = [
  // bit, dx, dy, bit opposé
  [N, 0, -1, S], [E, 1, 0, W], [S, 0, 1, N], [W, -1, 0, E],
];

export type Kind = 'empty' | 'rock' | 'heartA' | 'heartB' | 'pipe';

export interface Tile {
  kind: Kind;
  /** Ouvertures dans l'orientation « solution » (rotation 0). */
  base: number;
  rot: number;
  /** Identifiant de ronces bloquant la case (levier du même id pour les retirer). */
  bramble?: number;
  /** Levier : un toucher retire les ronces de cet id. */
  lever?: number;
}

export interface PathLevel { w: number; h: number; tiles: Tile[]; solution: number[]; title: string }

export function rotMask(m: number, r: number): number {
  let x = m & 15;
  for (let i = 0; i < ((r % 4) + 4) % 4; i++) x = ((x << 1) | (x >> 3)) & 15;
  return x;
}

export const mask = (t: Tile) => (t.kind === 'pipe' || t.kind === 'heartA' || t.kind === 'heartB' ? rotMask(t.base, t.rot) : 0);
export const rotatable = (t: Tile) => t.kind === 'pipe' && t.bramble === undefined;

/** Cases du chemin reliées au cœur A (parcours en largeur). */
export function reach(lv: PathLevel): number[] {
  const start = lv.tiles.findIndex((t) => t.kind === 'heartA');
  const seen = new Set<number>([start]);
  const order = [start];
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const x = i % lv.w, y = Math.floor(i / lv.w);
    const m = mask(lv.tiles[i]);
    for (const [bit, dx, dy, opp] of DIRS) {
      if (!(m & bit)) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= lv.w || ny >= lv.h) continue;
      const j = ny * lv.w + nx;
      const t = lv.tiles[j];
      if (seen.has(j) || t.bramble !== undefined) continue;
      if (mask(t) & opp) { seen.add(j); order.push(j); }
    }
  }
  return order;
}

export function isConnected(lv: PathLevel): boolean {
  const b = lv.tiles.findIndex((t) => t.kind === 'heartB');
  return reach(lv).includes(b);
}

/** Chemin des cœurs A → B (pour l'animation), ou null. */
export function pathAtoB(lv: PathLevel): number[] | null {
  const a = lv.tiles.findIndex((t) => t.kind === 'heartA');
  const b = lv.tiles.findIndex((t) => t.kind === 'heartB');
  const prev = new Map<number, number>([[a, -1]]);
  const q = [a];
  while (q.length) {
    const i = q.shift()!;
    if (i === b) break;
    const x = i % lv.w, y = Math.floor(i / lv.w);
    const m = mask(lv.tiles[i]);
    for (const [bit, dx, dy, opp] of DIRS) {
      if (!(m & bit)) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= lv.w || ny >= lv.h) continue;
      const j = ny * lv.w + nx;
      if (prev.has(j) || lv.tiles[j].bramble !== undefined) continue;
      if (mask(lv.tiles[j]) & opp) { prev.set(j, i); q.push(j); }
    }
  }
  if (!prev.has(b)) return null;
  const out: number[] = [];
  for (let c = b; c !== -1; c = prev.get(c)!) out.unshift(c);
  return out;
}

export function rotate(lv: PathLevel, i: number): boolean {
  const t = lv.tiles[i];
  if (!t || !rotatable(t)) return false;
  t.rot = (t.rot + 1) % 4;
  return true;
}

/** Touche un levier : retire les ronces correspondantes. Renvoie les cases libérées. */
export function pullLever(lv: PathLevel, i: number): number[] {
  const t = lv.tiles[i];
  if (!t || t.lever === undefined) return [];
  const id = t.lever;
  t.lever = undefined;
  const freed: number[] = [];
  lv.tiles.forEach((u, j) => { if (u.bramble === id) { u.bramble = undefined; freed.push(j); } });
  return freed;
}

// ------------------------------------------------------------ construction

interface LevelSpec {
  title: string;
  w: number; h: number;
  /** Chemin solution, du cœur A au cœur B. */
  path: [number, number][];
  rocks?: [number, number][];
  /** [case du chemin à couvrir de ronces, case du levier] */
  gates?: [[number, number], [number, number]][];
  seed: number;
}

const DECOYS = [N | S, N | E, N | E | S, N | E, N | S];

export function buildLevel(spec: LevelSpec): PathLevel {
  const { w, h } = spec;
  const rng = new Rng(spec.seed);
  const idx = (x: number, y: number) => y * w + x;
  const tiles: Tile[] = Array.from({ length: w * h }, () => ({ kind: 'empty', base: 0, rot: 0 }) as Tile);
  const p = spec.path;
  const dirBit = (a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    for (const [bit, ddx, ddy] of DIRS) if (ddx === dx && ddy === dy) return bit;
    throw new Error(`chemin non contigu ${a} → ${b}`);
  };
  p.forEach((c, k) => {
    let m = 0;
    if (k > 0) m |= dirBit(c, p[k - 1]);
    if (k < p.length - 1) m |= dirBit(c, p[k + 1]);
    const kind: Kind = k === 0 ? 'heartA' : k === p.length - 1 ? 'heartB' : 'pipe';
    tiles[idx(c[0], c[1])] = { kind, base: m, rot: 0 };
  });
  for (const [x, y] of spec.rocks ?? []) tiles[idx(x, y)] = { kind: 'rock', base: 0, rot: 0 };
  // cases leurres
  tiles.forEach((t, i) => {
    if (t.kind !== 'empty') return;
    if (rng.next() < 0.72) tiles[i] = { kind: 'pipe', base: rng.pick(DECOYS), rot: 0 };
  });
  (spec.gates ?? []).forEach(([[gx, gy], [lx, ly]], id) => {
    tiles[idx(gx, gy)].bramble = id;
    tiles[idx(lx, ly)] = { kind: 'empty', base: 0, rot: 0, lever: id };
  });
  const solution = tiles.map((t) => t.rot);
  const lv: PathLevel = { w, h, tiles, solution, title: spec.title };
  // Mélange des rotations (jamais déjà relié).
  for (let attempt = 0; attempt < 100; attempt++) {
    tiles.forEach((t) => { if (t.kind === 'pipe') t.rot = rng.int(4); });
    // au moins la moitié des cases du chemin mal orientées
    const wrong = p.slice(1, -1).filter(([x, y]) => rotMask(tiles[idx(x, y)].base, tiles[idx(x, y)].rot) !== tiles[idx(x, y)].base).length;
    const gatesOpen = (spec.gates ?? []).length === 0;
    if (wrong >= Math.ceil((p.length - 2) / 2) && (!gatesOpen || !isConnected(lv))) break;
  }
  return lv;
}

/** Applique la solution (rotations 0, ronces retirées) — sert aux tests. */
export function applySolution(lv: PathLevel): void {
  lv.tiles.forEach((t, i) => { t.rot = lv.solution[i]; if (t.lever !== undefined) pullLever(lv, i); });
}

export const PATH_SPECS: LevelSpec[] = [
  {
    title: 'Premier pas', w: 4, h: 4, seed: 11,
    path: [[0, 1], [1, 1], [2, 1], [2, 2], [3, 2]],
  },
  {
    title: 'Le détour', w: 5, h: 5, seed: 23,
    path: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3], [3, 4], [4, 4]],
    rocks: [[0, 3], [4, 1]],
  },
  {
    title: 'Les ronces', w: 5, h: 6, seed: 37,
    path: [[0, 5], [0, 4], [1, 4], [1, 3], [1, 2], [2, 2], [3, 2], [3, 1], [3, 0], [4, 0]],
    rocks: [[2, 4], [4, 3]],
    gates: [[[1, 3], [4, 5]]],
  },
  {
    title: 'Jusqu\'à toi', w: 6, h: 6, seed: 53,
    path: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 0], [3, 0], [4, 0], [4, 1], [4, 2], [3, 2], [3, 3], [2, 3], [1, 3], [1, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5]],
    rocks: [[5, 0], [0, 3], [5, 3]],
    gates: [[[4, 1], [0, 5]], [[1, 4], [5, 2]]],
  },
];

export const makePathLevels = () => PATH_SPECS.map(buildLevel);
