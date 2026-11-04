import type { CollectionId, ItemColl, ItemRef, Rarity } from '../../data/items';

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

/** Types de cases verrouillées d'Endless : toile (objet piégé), sable (case ensablée), coffre / récompense derrière une toile, cadenas doux. */
export type LockKind = 'web' | 'sand' | 'chest' | 'reward' | 'energy';
/**
 * Condition PRINCIPALE de libération (l'énergie, une commande livrée ou la progression de zone libèrent aussi) :
 *  adj  : fusionner à côté un objet de la collection `coll` (résultat de niveau ≥ `minLevel`) ;
 *  sand : `left` fusions quelconques à côté ;
 *  goal : `n` fusions réalisées depuis la pose (`base` = s.merges à la pose).
 */
export type LockNeed =
  | { t: 'adj'; coll: CollectionId; minLevel: number }
  | { t: 'sand'; left: number }
  | { t: 'goal'; n: number; base: number };
export interface CellLock {
  kind: LockKind;
  need: LockNeed;
  /** Prix en énergie (gagnée en jouant) pour libérer la case tout de suite : toujours affiché. */
  price: number;
  /** Case de terrain d'une zone pas encore développée (0 = jamais pour une zone ouverte). */
  zone?: number;
  /** Objet visible sous la toile : il apparaît dans la case à la libération. */
  item?: ItemRef;
  /** Récompense visible (diamants, énergie, coffre, fragment de tenue, décoration exclusive…), versée à la libération. */
  reward?: Loot;
  rarity?: Rarity;
}
export type UnlockHow = 'merge' | 'order' | 'energy' | 'goal' | 'zone';

export interface Cell { item: ItemRef | null; gift: ItemRef | null; lock?: CellLock }

/** Difficulté d'une commande Endless 2.0 : un emplacement par palier (0 facile, 1 moyenne, 2 difficile). */
export type OrderTier = 'easy' | 'mid' | 'hard';

/** Récompense prévisible d'une commande (calculée à sa création, jamais modifiée ensuite). */
export interface OrderReward {
  hearts: number;
  coins: number;
  /** Matériau lié à la collection demandée (fleurs / tissu / cacao) ; 0 si aucun. */
  mat: 'flowers' | 'fabric' | 'cocoa' | null;
  matN: number;
  energy: number;
  /** Points de jauge de trésor offerts par la livraison. */
  treasure: number;
}

export interface OrderState {
  items: ItemRef[];
  id: number;
  /** Endless 2.0 (facultatifs : anciennes sauvegardes). */
  tier?: OrderTier;
  reward?: OrderReward;
  /** Avancement 0..1 (voir `orderProgress` pour le détail), mis à jour après chaque action. */
  progress?: number;
}

// ------------------------------------------------------------------ butin
export type LootKind =
  | 'coins' | 'diamonds' | 'energy' | 'hearts' | 'flowers' | 'fabric' | 'cocoa'
  | 'ticket' | 'chest' | 'fragment' | 'cloth' | 'bag' | 'accessory' | 'deco'
  | 'rareItem' | 'star' | 'wand' | 'wind';

/** Un gain décrit (affichable) ; `applyLoot` (src/game/endless/loot.ts) le verse dans le monde / le portefeuille. */
export interface Loot {
  kind: LootKind;
  n: number;
  rarity?: Rarity;
  /** Pour `rareItem` / `star` : l'objet à poser sur le plateau. */
  item?: ItemRef;
  /** Graine déterministe pour choisir un vêtement / meuble précis. */
  seed?: number;
}

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
  // ---- Endless 2.0 (tous facultatifs : les anciennes sauvegardes restent valides)
  /** Dernier instant (ms) vu par le moteur et temps de jeu actif cumulé de cette partie. */
  clock?: number;
  activeMs?: number;
  /** Anti-exploitation des récompenses de combo : fenêtre d'une minute. */
  comboWin?: { t0: number; n: number; e: number };
  /** Fusion (s.merges) du dernier drop visible (limite de saturation). */
  lastDropMerge?: number;
  /** Nombre de livraisons de cette partie ayant donné un remplacement gratuit. */
  replaceGrantedAt?: number;
  /** Plateau à cases verrouillées : posé (v = 1) ; absent sur une ancienne partie (migration tolérante). */
  board?: { v: 1; surprises?: number };
}

export type BoardEvent =
  | { t: 'move'; from: number; to: number }
  | { t: 'merge'; from: number; to: number; result: ItemRef; points: number; combo: number; joker?: boolean }
  | { t: 'invalid'; from: number; to: number; reason: 'different' | 'max' | 'gift' | 'empty' | 'locked' }
  | { t: 'spawn'; at: number; item: ItemRef; source: 'gen' | 'box' | 'combo' | 'reward' | 'drop' | 'rescue'; from?: number; free?: boolean; double?: boolean }
  | { t: 'giftOpen'; at: number; item: ItemRef }
  | {
    t: 'deliver'; slot: number; cells: number[]; hearts: number; points: number; items?: ItemRef[];
    /** Endless 2.0 : palier, récompense annoncée, gains « monde » (pièces / matériaux) et énergie offerte. */
    tier?: OrderTier; reward?: OrderReward; gain?: Partial<Record<'coins' | 'flowers' | 'fabric' | 'cocoa', number>>; energy?: number; forced?: boolean;
  }
  | { t: 'orderNew'; slot: number; tier?: OrderTier }
  | { t: 'orderReplace'; slot: number; tier: OrderTier; left: number }
  | { t: 'replaceGain'; n: number; total: number }
  | { t: 'combo'; value: number; reward?: 'star' | 'wand' | 'hearts'; mult?: number; capped?: boolean }
  | { t: 'comboTier'; value: number; tier: number; mult: number; energy: number; hearts: number; reward?: 'star' | 'wand' | 'hearts'; capped: boolean }
  | { t: 'drop'; at: number; loot: Loot; rarity: Rarity; /** vrai = versé automatiquement (monnaies) */ auto: boolean }
  | { t: 'chest'; pending: number; source: 'gauge' | 'drop' | 'max' | 'order' | 'lock' }
  /** Une case verrouillée se libère : toile qui disparaît, sable qui se dissipe, objet / récompense révélé. */
  | { t: 'cellUnlock'; at: number; kind: LockKind; how: UnlockHow; item?: ItemRef; rarity?: Rarity; reward: Loot[] }
  /** Une nouvelle surprise (case verrouillée) apparaît pendant la partie. */
  | { t: 'lockNew'; at: number }
  /** Progrès d'un verrou (sable fissuré…) sans libération. */
  | { t: 'lockHit'; at: number; left: number }
  /** Le plateau s'agrandit : nouvelle zone développée. */
  | { t: 'zone'; zone: number; cells: number[] }
  | { t: 'treasure'; points: number; goal: number; gained: number }
  | { t: 'discover'; item: ItemRef; isNew: boolean; reward: Loot[]; completed?: ItemColl; milestone?: string }
  | { t: 'maxMerge'; at: number; item: ItemRef; loot: Loot[] }
  | { t: 'secondary'; id: string; progress: number; goal: number; done: boolean; stage: number; reward?: Loot[]; /** vrai quand le dernier palier de l'événement vient d'être atteint (il est remplacé) */ final?: boolean }
  | { t: 'unlock'; coll: ItemColl; kind: number }
  | { t: 'rescue'; at: number; item: ItemRef; reason: 'stuck' }
  | { t: 'remove'; at: number; points: number }
  | { t: 'upgrade'; at: number; item: ItemRef }
  | { t: 'boxOpen'; at: number }
  | { t: 'full' }
  | { t: 'objective'; index: number }
  | { t: 'challenge'; reward: number }
  | { t: 'win' };
