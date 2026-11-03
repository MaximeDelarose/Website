import type { ItemColl, ItemRef } from '../../data/items';

export const BOARD_W = 6;
export const BOARD_H = 6;
export const BOARD_SIZE = BOARD_W * BOARD_H;
/** Fenêtre de combo : une fusion compte dans le combo si elle arrive moins de 3 s après la précédente. */
export const COMBO_WINDOW_MS = 3000;

export type Tuple = [ItemColl, number];

export type Objective =
  | { t: 'create'; item: Tuple; count?: number }
  | { t: 'orders'; count: number }
  | { t: 'gifts' }
  | { t: 'score'; value: number }
  | { t: 'merges'; count: number }
  | { t: 'combo'; value: number };

export interface PlacedItem { x: number; y: number; c: ItemColl; l: number }

export interface LevelDef {
  id: number;
  chapter: number;
  title: string;
  /** Petit texte affiché au début du niveau (nouvelle mécanique, astuce). */
  hint: string;
  dominant: Exclude<ItemColl, 'special'>;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Ce que donne le panier : [collection, niveau, poids]. */
  gen: [ItemColl, number, number][];
  start?: PlacedItem[];
  gifts?: PlacedItem[];
  /** Suite de commandes (chaque commande = 1 ou 2 objets). */
  orders?: Tuple[][];
  /** Nombre de commandes visibles en même temps (2 par défaut). */
  ordersVisible?: number;
  objectives: Objective[];
  /** Nombre de touches du panier pour obtenir 3 étoiles. */
  par: number;
  reward: { hearts: number; wand?: number; wind?: number };
  tutorial?: boolean;
}

export interface Cell { item: ItemRef | null; gift: ItemRef | null }

export interface OrderState { items: ItemRef[]; id: number }

export interface RunState {
  mode: 'story' | 'endless';
  levelId: number;
  cells: Cell[];
  rng: number;
  score: number;
  taps: number;
  merges: number;
  combo: number;
  bestCombo: number;
  lastMergeAt: number;
  created: Record<string, number>;
  orders: (OrderState | null)[];
  orderCursor: number;
  ordersDone: number;
  hearts: number;
  wandsEarned: number;
  won: boolean;
  /** Mode infini : défi en cours et nombre de défis réussis. */
  challenge?: { obj: Objective; base: number; reward: number } | null;
  challengesDone?: number;
  orderSerial: number;
}

export type BoardEvent =
  | { t: 'move'; from: number; to: number }
  | { t: 'merge'; from: number; to: number; result: ItemRef; points: number; combo: number; joker?: boolean }
  | { t: 'invalid'; from: number; to: number; reason: 'different' | 'max' | 'gift' | 'empty' }
  | { t: 'spawn'; at: number; item: ItemRef; source: 'gen' | 'box' | 'combo' | 'reward'; from?: number }
  | { t: 'giftOpen'; at: number; item: ItemRef }
  | { t: 'deliver'; slot: number; cells: number[]; hearts: number; points: number }
  | { t: 'orderNew'; slot: number }
  | { t: 'combo'; value: number; reward?: 'star' | 'wand' | 'hearts' }
  | { t: 'remove'; at: number; points: number }
  | { t: 'upgrade'; at: number; item: ItemRef }
  | { t: 'boxOpen'; at: number }
  | { t: 'full' }
  | { t: 'objective'; index: number }
  | { t: 'challenge'; reward: number }
  | { t: 'win' };
