/**
 * Roue de cadeaux quotidienne : TABLE DES LOTS (données). Les pourcentages affichés sont calculés
 * à partir de ces poids (somme 100) : jamais écrits à la main ailleurs.
 */
export type LotKind = 'coins' | 'diamonds' | 'energy' | 'chips' | 'fashion' | 'deco' | 'fragment';
export interface LotDef { id: string; kind: LotKind; n: number; weight: number; name: string; emoji: string; color: string; /** petite étiquette sur la roue */ short: string }

export const LOTS: readonly LotDef[] = [
  { id: 'coins100', kind: 'coins', n: 100, weight: 24, name: '100 pièces', emoji: '🪙', color: '#FFE08A', short: '100' },
  { id: 'chips200', kind: 'chips', n: 200, weight: 12, name: '200 tickets du Casino Royal', emoji: '🎟️', color: '#E3D3FF', short: '200' },
  { id: 'energy3', kind: 'energy', n: 3, weight: 16, name: '3 énergies', emoji: '⚡', color: '#C9F0DD', short: '×3' },
  { id: 'coins300', kind: 'coins', n: 300, weight: 14, name: '300 pièces', emoji: '🪙', color: '#FFD0A8', short: '300' },
  { id: 'diamonds2', kind: 'diamonds', n: 2, weight: 14, name: '2 diamants', emoji: '💎', color: '#CFE8FF', short: '×2' },
  { id: 'fashion', kind: 'fashion', n: 1, weight: 5, name: 'Un accessoire de mode', emoji: '👒', color: '#FFC6DA', short: 'mode' },
  { id: 'chips600', kind: 'chips', n: 600, weight: 4, name: '600 tickets du Casino Royal', emoji: '🎟️', color: '#D2BEFF', short: '600' },
  { id: 'diamonds6', kind: 'diamonds', n: 6, weight: 4, name: '6 diamants', emoji: '💎', color: '#A9D4F5', short: '×6' },
  { id: 'deco', kind: 'deco', n: 1, weight: 4, name: 'Une décoration', emoji: '🕯️', color: '#FFD9E8', short: 'déco' },
  { id: 'fragment', kind: 'fragment', n: 1, weight: 3, name: 'Un fragment de vêtement', emoji: '🧵', color: '#F5C2E7', short: 'fil' },
];
export const lotById = (id: string): LotDef | undefined => LOTS.find((l) => l.id === id);
export const TOTAL_WEIGHT = LOTS.reduce((a, l) => a + l.weight, 0);
/** Probabilité (0..1) d'un lot, d'après la table. */
export const probOf = (l: LotDef): number => l.weight / TOTAL_WEIGHT;

/** Accessoires de mode possibles (réels : garde-robe) et décorations (réelles : château). */
export const FASHION_POOL = ['hd-bow-pink', 'gl-cat-eye', 'ea-hearts', 'lp-coral', 'hd-pearl-pins', 'ea-pearl-studs'] as const;
export const DECO_POOL = ['candles', 'flower-vase', 'lamp-table', 'plant-pot', 'plush-toys'] as const;
/** Compensation en pièces quand l'objet tiré est déjà possédé (tout le pool). */
export const DUP_COINS = 150;
