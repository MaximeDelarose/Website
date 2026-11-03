/**
 * « Bouquet » : mini-plateau 4×4 de fleurs. Toucher deux fleurs identiques les
 * fusionne en une plus grande. Une fleur de niveau 3 (grosse) est cueillie pour
 * le bouquet. Objectif : 3 grosses fleurs. Aucun échec : le plateau se
 * réapprovisionne toujours et il reste toujours au moins une paire.
 */
import type { Rng } from './rng';

export const BOUQUET_SIZE = 16;
export const BOUQUET_GOAL = 3;
export const BOUQUET_BIG = 3;

export interface BouquetState {
  cells: number[]; // 0 vide, 1 bouton, 2 fleur, 3 grosse (cueillie aussitôt)
  sel: number | null;
  moves: number;
  collected: number;
  goal: number;
  rng: Rng;
}

export type BouquetEvent =
  | { type: 'none' }
  | { type: 'select'; i: number }
  | { type: 'deselect'; i: number }
  | { type: 'merge'; from: number; to: number; level: number; collected: boolean };

const fresh = (rng: Rng): number => (rng() < 0.7 ? 1 : 2);

/** Garantit au moins une paire de fleurs (< niveau 3) identiques. */
export function ensurePair(s: BouquetState): void {
  const seen = new Map<number, number>();
  for (const v of s.cells) {
    if (v >= 1 && v < BOUQUET_BIG) seen.set(v, (seen.get(v) ?? 0) + 1);
  }
  if ([...seen.values()].some((n) => n >= 2)) return;
  const idx = s.cells.map((v, i) => (v >= 1 ? i : -1)).filter((i) => i >= 0);
  const target = s.cells[idx[0]];
  const other = idx[1] ?? (idx[0] + 1) % BOUQUET_SIZE;
  s.cells[other] = target >= 1 && target < BOUQUET_BIG ? target : 1;
  if (s.cells[idx[0]] >= BOUQUET_BIG) s.cells[idx[0]] = 1;
}

export function newBouquet(rng: Rng): BouquetState {
  const s: BouquetState = { cells: Array.from({ length: BOUQUET_SIZE }, () => fresh(rng)), sel: null, moves: 0, collected: 0, goal: BOUQUET_GOAL, rng };
  ensurePair(s);
  return s;
}

export const bouquetDone = (s: BouquetState): boolean => s.collected >= s.goal;

export function tapCell(s: BouquetState, i: number): BouquetEvent {
  if (bouquetDone(s) || i < 0 || i >= BOUQUET_SIZE || s.cells[i] === 0) return { type: 'none' };
  if (s.sel === null) { s.sel = i; return { type: 'select', i }; }
  if (s.sel === i) { s.sel = null; return { type: 'deselect', i }; }
  const from = s.sel;
  if (s.cells[from] !== s.cells[i]) { s.sel = i; return { type: 'select', i }; }
  const level = s.cells[i] + 1;
  s.moves += 1;
  s.sel = null;
  s.cells[from] = fresh(s.rng);
  let collected = false;
  if (level >= BOUQUET_BIG) {
    s.collected += 1;
    collected = true;
    s.cells[i] = fresh(s.rng);
  } else s.cells[i] = level;
  ensurePair(s);
  return { type: 'merge', from, to: i, level, collected };
}

export function bouquetStars(moves: number): 1 | 2 | 3 {
  return moves <= 16 ? 3 : moves <= 24 ? 2 : 1;
}
export const bouquetScore = (moves: number): number => Math.max(100, 500 - moves * 15);
