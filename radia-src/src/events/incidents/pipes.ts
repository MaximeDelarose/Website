/**
 * Mini-jeu de plomberie — logique pure. Une grille de tuyaux à faire pivoter : l'eau entre par la
 * gauche (ligne `src`) et doit sortir à droite (ligne `dst`). Le générateur construit d'abord un
 * chemin (donc le niveau est TOUJOURS soluble), puis mélange les rotations.
 * Directions : N=1, E=2, S=4, W=8 ; une rotation = un quart de tour dans le sens horaire.
 */
import { rng, rint } from './rng';

export const N = 1, E = 2, S = 4, W = 8;
export type PipeType = 'I' | 'L' | 'T' | 'X';
export interface Tile { type: PipeType; rot: number }
export interface PipeLevel { n: number; src: number; dst: number; tiles: Tile[][]; seed: number; difficulty: 1 | 2 | 3 }

const BASE: Record<PipeType, number> = { I: N | S, L: N | E, T: N | E | S, X: N | E | S | W };
export const rotMask = (m: number, rot: number): number => {
  let r = m;
  for (let i = 0; i < (rot & 3); i++) r = ((r << 1) | (r >> 3)) & 15;
  return r;
};
export const maskOf = (t: Tile): number => rotMask(BASE[t.type], t.rot);
const DX: Record<number, number> = { [N]: 0, [E]: 1, [S]: 0, [W]: -1 };
const DY: Record<number, number> = { [N]: -1, [E]: 0, [S]: 1, [W]: 0 };
const OPP: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E };
const DIRS = [N, E, S, W];

export const SIZES: Record<1 | 2 | 3, number> = { 1: 4, 2: 5, 3: 6 };

/** Chemin auto-évitant de (0,src) à (n-1,dst) par parcours en profondeur aléatoire. */
function randomPath(n: number, src: number, dst: number, minLen: number, r: () => number): [number, number][] {
  for (let attempt = 0; attempt < 60; attempt++) {
    const seen = new Set<number>();
    const path: [number, number][] = [];
    let steps = 0;
    const dfs = (x: number, y: number): boolean => {
      if (++steps > 4000) return false;
      path.push([x, y]); seen.add(y * n + x);
      if (x === n - 1 && y === dst) { if (path.length >= minLen) return true; path.pop(); seen.delete(y * n + x); return false; }
      const order = DIRS.map((d) => ({ d, k: r() + (d === E ? 0.35 : 0) })).sort((a, b) => b.k - a.k);
      for (const { d } of order) {
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen.has(ny * n + nx)) continue;
        if (dfs(nx, ny)) return true;
      }
      path.pop(); seen.delete(y * n + x);
      return false;
    };
    if (dfs(0, src)) return path;
  }
  // repli garanti : tout droit puis vertical dans la dernière colonne
  const p: [number, number][] = [];
  for (let x = 0; x < n; x++) p.push([x, src]);
  const step = dst > src ? 1 : -1;
  for (let y = src + step; dst !== src && (step > 0 ? y <= dst : y >= dst); y += step) p.push([n - 1, y]);
  return p;
}

/** Eau : cellules atteintes depuis la source ; `solved` si elle ressort à droite sur la ligne `dst`. */
export function flow(level: Pick<PipeLevel, 'n' | 'src' | 'dst' | 'tiles'>): { wet: Set<number>; solved: boolean } {
  const { n, src, dst, tiles } = level;
  const wet = new Set<number>();
  if (!(maskOf(tiles[src][0]) & W)) return { wet, solved: false };
  const stack: [number, number][] = [[0, src]];
  wet.add(src * n);
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const m = maskOf(tiles[y][x]);
    for (const d of DIRS) {
      if (!(m & d)) continue;
      const nx = x + DX[d], ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      if (wet.has(ny * n + nx) || !(maskOf(tiles[ny][nx]) & OPP[d])) continue;
      wet.add(ny * n + nx);
      stack.push([nx, ny]);
    }
  }
  const solved = wet.has(dst * n + n - 1) && !!(maskOf(tiles[dst][n - 1]) & E);
  return { wet, solved };
}
export const isSolved = (l: Pick<PipeLevel, 'n' | 'src' | 'dst' | 'tiles'>): boolean => flow(l).solved;

export function rotateTile(l: PipeLevel, x: number, y: number): void { const t = l.tiles[y][x]; t.rot = (t.rot + 1) & 3; }

/** Génère un niveau soluble à partir d'une graine et d'une difficulté (1 facile, 2 moyen, 3 difficile). */
export function generateLevel(seed: number, difficulty: 1 | 2 | 3): PipeLevel {
  const r = rng(seed * 2654435761 + difficulty);
  const n = SIZES[difficulty];
  const src = rint(r, n), dst = rint(r, n);
  const path = randomPath(n, src, dst, n + difficulty, r);
  const tiles: Tile[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ type: 'I' as PipeType, rot: 0 })));
  const onPath = new Set(path.map(([x, y]) => y * n + x));
  // tuyaux du chemin : forme exacte (puis rotation mélangée)
  path.forEach(([x, y], i) => {
    const prev = i === 0 ? null : path[i - 1];
    const next = i === path.length - 1 ? null : path[i + 1];
    let need = 0;
    need |= prev ? DIRS.find((d) => x + DX[d] === prev[0] && y + DY[d] === prev[1])! : W;
    need |= next ? DIRS.find((d) => x + DX[d] === next[0] && y + DY[d] === next[1])! : E;
    const straight = need === (N | S) || need === (E | W);
    let type: PipeType = straight ? 'I' : 'L';
    // niveaux avancés : certains tuyaux ont une branche en trop (T), plus de pièges
    if (difficulty >= 2 && r() < 0.18 * difficulty) type = 'T';
    const rots = [0, 1, 2, 3].filter((k) => (rotMask(BASE[type], k) & need) === need);
    tiles[y][x] = { type, rot: rots[rint(r, rots.length)] };
  });
  // leurres
  const decoys: PipeType[] = difficulty === 1 ? ['I', 'L', 'L'] : difficulty === 2 ? ['I', 'L', 'T', 'L'] : ['I', 'L', 'T', 'X', 'L'];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!onPath.has(y * n + x)) tiles[y][x] = { type: decoys[rint(r, decoys.length)], rot: rint(r, 4) };
  const lvl: PipeLevel = { n, src, dst, tiles, seed, difficulty };
  // mélange : jamais déjà résolu au départ
  for (let k = 0; k < 20; k++) {
    for (const [x, y] of path) tiles[y][x].rot = rint(r, 4);
    if (!isSolved(lvl)) break;
  }
  if (isSolved(lvl)) { const [x, y] = path[Math.min(1, path.length - 1)]; const t = tiles[y][x]; if (t.type !== 'X') for (let k = 1; k < 4 && isSolved(lvl); k++) t.rot = (t.rot + 1) & 3; }
  return lvl;
}

export interface Placement { x: number; y: number; rot: number }
/**
 * Résolveur indépendant (n'utilise ni le générateur ni `flow`) : renvoie des rotations qui relient source et sortie, ou null.
 * Étape 1 : points fixes des « états atteignables » (cellule, côté d'entrée) ; étape 2 : plus court chemin d'états
 * (réalisable s'il ne repasse jamais par la même cellule) ; étape 3 (rare) : parcours en profondeur exact élagué.
 */
export function solve(l: Pick<PipeLevel, 'n' | 'src' | 'dst' | 'tiles'>): Placement[] | null {
  const { n, src, dst, tiles } = l;
  const key = (x: number, y: number, from: number) => (y * n + x) * 16 + from;
  const good = new Set<number>();
  const rots = (x: number, y: number, from: number): { m: number; rot: number }[] => {
    const res: { m: number; rot: number }[] = [];
    for (let rot = 0; rot < 4; rot++) { const m = rotMask(BASE[tiles[y][x].type], rot); if (m & from) res.push({ m, rot }); }
    return res;
  };
  for (let changed = true; changed;) {
    changed = false;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) for (const from of DIRS) {
      const k = key(x, y, from);
      if (good.has(k)) continue;
      let ok = false;
      for (const { m } of rots(x, y, from)) {
        if (x === n - 1 && y === dst && (m & E)) { ok = true; break; }
        for (const d of DIRS) {
          if (d === from || !(m & d)) continue;
          const nx = x + DX[d], ny = y + DY[d];
          if (nx >= 0 && ny >= 0 && nx < n && ny < n && good.has(key(nx, ny, OPP[d]))) { ok = true; break; }
        }
        if (ok) break;
      }
      if (ok) { good.add(k); changed = true; }
    }
  }
  if (!good.has(key(0, src, W))) return null;
  // plus court chemin dans le graphe d'états
  const par = new Map<number, number>();
  const start = key(0, src, W);
  par.set(start, -1);
  const queue = [start];
  let goal = -1;
  let goalRot = 0;
  for (let qi = 0; qi < queue.length && goal < 0; qi++) {
    const k = queue[qi];
    const from = k % 16, cell = (k - from) / 16, x = cell % n, y = Math.floor(cell / n);
    for (const { m, rot } of rots(x, y, from)) {
      if (x === n - 1 && y === dst && (m & E)) { goal = k; goalRot = rot; break; }
      for (const d of DIRS) {
        if (d === from || !(m & d)) continue;
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        const nk = key(nx, ny, OPP[d]);
        if (!par.has(nk)) { par.set(nk, k); queue.push(nk); }
      }
    }
  }
  if (goal >= 0) {
    const chain: number[] = [];
    for (let k = goal; k >= 0; k = par.get(k)!) chain.unshift(k);
    const cells = new Set(chain.map((k) => (k - (k % 16)) / 16));
    if (cells.size === chain.length) {
      return chain.map((k, i) => {
        const from = k % 16, cell = (k - from) / 16, x = cell % n, y = Math.floor(cell / n);
        if (i === chain.length - 1) return { x, y, rot: goalRot };
        const out = OPP[chain[i + 1] % 16];
        const rot = rots(x, y, from).find((r) => r.m & out)!.rot;
        return { x, y, rot };
      });
    }
  }
  // repli exact
  const seen = new Set<number>();
  const stack: Placement[] = [];
  const go = (x: number, y: number, from: number): boolean => {
    seen.add(y * n + x);
    for (const { m, rot } of rots(x, y, from)) {
      if (x === n - 1 && y === dst && (m & E)) { stack.push({ x, y, rot }); return true; }
      for (const d of DIRS) {
        if (d === from || !(m & d)) continue;
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen.has(ny * n + nx) || !good.has(key(nx, ny, OPP[d]))) continue;
        stack.push({ x, y, rot });
        if (go(nx, ny, OPP[d])) return true;
        stack.pop();
      }
    }
    seen.delete(y * n + x);
    return false;
  };
  return go(0, src, W) ? stack : null;
}
export const solvable = (l: Pick<PipeLevel, 'n' | 'src' | 'dst' | 'tiles'>): boolean => solve(l) !== null;
