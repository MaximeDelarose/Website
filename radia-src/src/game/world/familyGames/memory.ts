/**
 * « Mémoire » : manche 1 = paires avec aperçu, manche 2 = paires sans aperçu
 * (grille 4×4 de cartes illustrées), manche 3 = petit défi de logique (3 suites
 * à compléter, de plus en plus longues).
 */
import { MEMORY_SYMBOLS } from '../../../data/world/family';
import { shuffle, type Rng } from './rng';

export const MEMORY_CARDS = 16;

export interface PairsState {
  symbols: number[];
  up: boolean[];
  matched: boolean[];
  first: number | null;
  /** Deux cartes différentes retournées, à recacher via hideMismatch(). */
  pending: [number, number] | null;
  misses: number;
  flips: number;
}

export function newPairs(rng: Rng): PairsState {
  const syms = shuffle([...Array(8).keys(), ...Array(8).keys()], rng);
  return { symbols: syms, up: Array(MEMORY_CARDS).fill(false), matched: Array(MEMORY_CARDS).fill(false), first: null, pending: null, misses: 0, flips: 0 };
}

export type FlipResult = 'ignored' | 'first' | 'match' | 'miss';

export function flipCard(s: PairsState, i: number): FlipResult {
  if (i < 0 || i >= MEMORY_CARDS || s.matched[i] || s.up[i] || s.pending) return 'ignored';
  s.up[i] = true;
  s.flips += 1;
  if (s.first === null) { s.first = i; return 'first'; }
  const a = s.first;
  s.first = null;
  if (s.symbols[a] === s.symbols[i]) { s.matched[a] = true; s.matched[i] = true; return 'match'; }
  s.misses += 1;
  s.pending = [a, i];
  return 'miss';
}

export function hideMismatch(s: PairsState): void {
  if (!s.pending) return;
  for (const i of s.pending) s.up[i] = false;
  s.pending = null;
}

export const pairsDone = (s: PairsState): boolean => s.matched.every(Boolean);
export const pairsScore = (misses: number, round: 1 | 2): number => Math.max(20, 100 - misses * (round === 1 ? 7 : 5));

// ------------------------------------------------------------------ logique
export interface Puzzle { seq: number[]; options: number[]; answer: number; level: 0 | 1 | 2 }
const PATTERNS: number[][] = [
  [0, 1, 0, 1, 0, 1],
  [0, 0, 1, 0, 0, 1],
  [0, 1, 2, 0, 1, 2, 0, 1, 2],
];

/** `level` 0..2 : ABAB?, AABAA?, ABCABCAB? — le dernier élément est à deviner. */
export function makePuzzle(rng: Rng, level: 0 | 1 | 2): Puzzle {
  const syms = shuffle([...Array(MEMORY_SYMBOLS.length).keys()], rng);
  const pat = PATTERNS[level];
  const full = pat.map((p) => syms[p]);
  const answer = full[full.length - 1];
  const seq = full.slice(0, -1);
  const distract = syms.filter((s) => s !== answer).slice(0, 3);
  const options = shuffle([answer, ...distract], rng);
  return { seq, options, answer, level };
}
export const answerPuzzle = (p: Puzzle, option: number): boolean => option === p.answer;
export const PUZZLE_POINTS = 34;

// ------------------------------------------------------------------ total
export function memoryStars(total: number): 1 | 2 | 3 {
  return total >= 240 ? 3 : total >= 150 ? 2 : 1;
}
