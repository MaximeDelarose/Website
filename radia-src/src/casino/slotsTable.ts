/**
 * Machine à sous RADIA ♡ : TABLE DES GAINS (données). 3 rouleaux identiques, une ligne centrale.
 * Chaque rouleau tire un symbole avec les poids ci-dessous (somme 100). Le retour théorique est calculé
 * exactement (tests) à partir de cette table : ne change un poids ou un gain qu'en relançant les tests.
 */
export type SymId = 'heart' | 'flower' | 'choco' | 'bag' | 'star' | 'crown' | 'diamond';
export interface SymDef { id: SymId; name: string; weight: number; /** gain (× mise) pour trois identiques */ triple: number; /** gain (× mise) pour exactement deux identiques, 0 = aucun */ pair: number }

export const SYMBOLS: readonly SymDef[] = [
  { id: 'heart', name: 'Cœur', weight: 28, triple: 6, pair: 2 },
  { id: 'flower', name: 'Fleur', weight: 22, triple: 10, pair: 1 },
  { id: 'choco', name: 'Chocolat', weight: 18, triple: 16, pair: 0 },
  { id: 'bag', name: 'Sac à main', weight: 13, triple: 30, pair: 0 },
  { id: 'star', name: 'Étoile', weight: 10, triple: 50, pair: 0 },
  { id: 'crown', name: 'Couronne', weight: 6, triple: 120, pair: 0 },
  { id: 'diamond', name: 'Diamant', weight: 3, triple: 500, pair: 0 },
];
export const TOTAL_WEIGHT = SYMBOLS.reduce((a, s) => a + s.weight, 0);
/** Mises par tirage, en PIÈCES. */
export const BET_STEPS = [50, 100, 250, 500, 1000, 2500, 5000, 10000] as const;
export const DRAW_COUNTS = [1, 5, 10] as const;
export const MAX_MULTI = 10;
