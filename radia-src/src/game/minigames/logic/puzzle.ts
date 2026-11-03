/**
 * « Les souvenirs mélangés » — logique pure du puzzle à échanges.
 * perm[pos] = numéro du fragment posé à la case pos ; résolu quand perm[i] === i.
 */
import { Rng } from '../../../utils/rng';

export const isSolved = (perm: readonly number[]) => perm.every((t, i) => t === i);
export const correctCount = (perm: readonly number[]) => perm.reduce((a, t, i) => a + (t === i ? 1 : 0), 0);
export const isLocked = (perm: readonly number[], pos: number) => perm[pos] === pos;

/**
 * Mélange : jamais résolu, et au plus `maxCorrect` fragments déjà bien placés
 * (pour que le joueur ait vraiment quelque chose à faire).
 */
export function shuffle(n: number, seed: number, maxCorrect = 1): number[] {
  const rng = new Rng(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    if (!isSolved(p) && correctCount(p) <= maxCorrect) return p;
  }
  // repli déterministe : décalage circulaire (aucune pièce à sa place)
  return Array.from({ length: n }, (_, i) => (i + 1) % n);
}

/** Échange deux cases. Refusé (false) si identiques, hors limites ou si une pièce est déjà bien placée. */
export function swap(perm: number[], a: number, b: number): boolean {
  if (a === b || a < 0 || b < 0 || a >= perm.length || b >= perm.length) return false;
  if (isLocked(perm, a) || isLocked(perm, b)) return false;
  [perm[a], perm[b]] = [perm[b], perm[a]];
  return true;
}

/** Nombre minimal d'échanges pour résoudre (n − nombre de cycles). */
export function minSwaps(perm: readonly number[]): number {
  const seen = new Array(perm.length).fill(false);
  let cycles = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    cycles++;
    let j = i;
    while (!seen[j]) { seen[j] = true; j = perm[j]; }
  }
  return perm.length - cycles;
}

/** Étoiles selon les échanges effectués (3 = parfait). */
export function puzzleStars(swaps: number, best: number): number {
  if (swaps <= best) return 3;
  if (swaps <= best + 3) return 2;
  return 1;
}
