/** Puzzle électrique — logique pure : relier chaque fil à la prise de la même couleur. */
import { rng, shuffle } from './rng';

export const WIRE_COLORS = ['#ff5d6c', '#ffc857', '#5aa9ff', '#6fcf97', '#b07cff'] as const;
export const WIRE_NAMES = ['rouge', 'jaune', 'bleu', 'vert', 'violet'] as const;
export interface WireLevel { n: number; /** right[i] = couleur (index) de la prise à droite, rangée i. */ right: number[]; seed: number }

export function generateWires(seed: number, difficulty: 1 | 2 | 3): WireLevel {
  const n = 2 + difficulty; // 3, 4 ou 5 fils
  const r = rng(seed * 7919 + difficulty);
  let right = shuffle(Array.from({ length: n }, (_, i) => i), r);
  for (let k = 0; k < 10 && right.every((v, i) => v === i); k++) right = shuffle(right, r);
  return { n, right, seed };
}
/** `links[leftIndex] = rightRow` (ou -1). Résolu quand chaque fil touche sa prise. */
export const wiresSolved = (l: WireLevel, links: number[]): boolean => links.length === l.n && links.every((row, i) => row >= 0 && l.right[row] === i);
/** Un lien est juste si la couleur de la prise égale celle du fil. */
export const linkOk = (l: WireLevel, left: number, row: number): boolean => l.right[row] === left;
