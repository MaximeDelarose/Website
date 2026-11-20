/**
 * Roue de cadeaux quotidienne : TABLE DES LOTS (données). Les pourcentages affichés sont calculés
 * à partir de ces poids (somme 100) : jamais écrits à la main ailleurs.
 */
export type LotKind = 'coins' | 'diamonds' | 'energy' | 'fashion' | 'deco' | 'rare' | 'fragment';
/** `icon: 'coin'` : la pièce DORÉE dessinée de RADIA (jamais l'émoji, qui s'affiche grisé sur certains téléphones) ; sinon `emoji`. */
export interface LotDef { id: string; kind: LotKind; n: number; weight: number; name: string; emoji: string; icon?: 'coin'; color: string; /** petite étiquette sur la roue */ short: string }

/**
 * Lots de la roue (somme des poids = 100). Plus aucun ticket : pièces dorées, diamants, énergie, mode, décoration, objet rare, fragment.
 * Espérance par tirage ≈ 90 pièces + 0,5 diamant + 0,7 énergie + un objet dans 16 % des cas : un petit plus qui reste marginal
 * face aux 830–2 800 pièces/jour des commandes (docs/BALANCING.md).
 */
export const LOTS: readonly LotDef[] = [
  { id: 'coins100', kind: 'coins', n: 100, weight: 24, name: '100 pièces', emoji: '', icon: 'coin', color: '#FFE08A', short: '100' },
  { id: 'energy3', kind: 'energy', n: 3, weight: 14, name: '3 énergies', emoji: '⚡', color: '#C9F0DD', short: '×3' },
  { id: 'coins300', kind: 'coins', n: 300, weight: 14, name: '300 pièces', emoji: '', icon: 'coin', color: '#FFD0A8', short: '300' },
  { id: 'diamonds2', kind: 'diamonds', n: 2, weight: 14, name: '2 diamants', emoji: '💎', color: '#CFE8FF', short: '×2' },
  { id: 'fashion', kind: 'fashion', n: 1, weight: 6, name: 'Un accessoire de mode', emoji: '👒', color: '#FFC6DA', short: 'mode' },
  { id: 'deco', kind: 'deco', n: 1, weight: 6, name: 'Une décoration', emoji: '🕯️', color: '#FFD9E8', short: 'déco' },
  { id: 'coins600', kind: 'coins', n: 600, weight: 4, name: '600 pièces', emoji: '', icon: 'coin', color: '#FFC15E', short: '600' },
  { id: 'energy8', kind: 'energy', n: 8, weight: 4, name: '8 énergies', emoji: '⚡', color: '#A9E6C8', short: '×8' },
  { id: 'diamonds6', kind: 'diamonds', n: 6, weight: 4, name: '6 diamants', emoji: '💎', color: '#A9D4F5', short: '×6' },
  { id: 'rare', kind: 'rare', n: 1, weight: 4, name: 'Un objet rare', emoji: '✨', color: '#E3D3FF', short: 'rare' },
  { id: 'fragment', kind: 'fragment', n: 1, weight: 6, name: 'Un fragment de vêtement', emoji: '🧵', color: '#F5C2E7', short: 'fil' },
];
export const lotById = (id: string): LotDef | undefined => LOTS.find((l) => l.id === id);
export const TOTAL_WEIGHT = LOTS.reduce((a, l) => a + l.weight, 0);
/** Probabilité (0..1) d'un lot, d'après la table. */
export const probOf = (l: LotDef): number => l.weight / TOTAL_WEIGHT;

/** Accessoires de mode possibles (réels : garde-robe) et décorations (réelles : château). */
export const FASHION_POOL = ['hd-bow-pink', 'gl-cat-eye', 'ea-hearts', 'lp-coral', 'hd-pearl-pins', 'ea-pearl-studs'] as const;
export const DECO_POOL = ['candles', 'flower-vase', 'lamp-table', 'plant-pot', 'plush-toys'] as const;
/** Objets rares (tenues et bijoux précieux, réels : garde-robe). */
export const RARE_POOL = ['ac-pearls', 'hd-pearl-pins', 'bg-mini-gold', 'sh-heels-gold', 'ea-drop-gold', 'bg-pearl-clutch'] as const;
/** Compensation en pièces quand l'objet rare tiré est déjà possédé (tout le pool). */
export const DUP_RARE_COINS = 300;
/** Compensation en pièces quand l'objet tiré est déjà possédé (tout le pool). */
export const DUP_COINS = 150;
