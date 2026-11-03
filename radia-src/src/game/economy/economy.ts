/**
 * Économie « jeu de fusion mobile » — tout est local et gratuit :
 *  - énergie : 1 par toucher de générateur, recharge naturelle rapide,
 *    recharge gratuite régulière, récompenses ; jamais de blocage long ;
 *  - diamants : gagnés en jouant (et offerts par « la carte d'Auguste »,
 *    paiement 100 % fictif) ; servent à des achats qui ont un vrai effet ;
 *  - sac : objets mis de côté hors du plateau.
 * Les fonctions prennent `now` en paramètre pour être testables.
 */
import type { SaveData } from '../../save/schema';
import type { ItemRef } from '../../data/items';
import { COLLECTION_IDS, SPECIAL } from '../../data/items';

export const ENERGY_MAX = 100;
/** Une énergie revient toutes les 30 s (plein en 50 min). */
export const REGEN_MS = 30_000;
/** Recharge gratuite d'Auguste : +50, toutes les 5 minutes. */
export const FREE_REFILL = 50;
export const FREE_REFILL_MS = 5 * 60_000;
/** Coffre gratuit toutes les 4 heures. */
export const FREE_CHEST_MS = 4 * 3600_000;
export const BAG_MAX = 18;

type Eco = SaveData['economy'];

/** Applique la recharge naturelle jusqu'à `now` (sans dépasser le maximum). */
export function syncEnergy(e: Eco, now: number): void {
  if (e.energy >= ENERGY_MAX) { e.energyTs = now; return; }
  const gained = Math.floor((now - e.energyTs) / REGEN_MS);
  if (gained <= 0) return;
  e.energy = Math.min(ENERGY_MAX, e.energy + gained);
  e.energyTs = e.energy >= ENERGY_MAX ? now : e.energyTs + gained * REGEN_MS;
}

export function spendEnergy(e: Eco, n: number, now: number): boolean {
  syncEnergy(e, now);
  if (e.energy < n) return false;
  const wasFull = e.energy >= ENERGY_MAX;
  e.energy -= n;
  if (wasFull) e.energyTs = now;
  return true;
}

/** Les récompenses peuvent dépasser le maximum (comme dans les jeux du genre). */
export function addEnergy(e: Eco, n: number, now: number): void {
  syncEnergy(e, now);
  e.energy = Math.min(9999, e.energy + n);
}

/** Millisecondes avant la prochaine énergie (0 si pleine). */
export function nextEnergyIn(e: Eco, now: number): number {
  syncEnergy(e, now);
  if (e.energy >= ENERGY_MAX) return 0;
  return Math.max(0, REGEN_MS - (now - e.energyTs));
}

export const freeRefillIn = (e: Eco, now: number) => Math.max(0, e.freeRefillTs + FREE_REFILL_MS - now);

export function takeFreeRefill(e: Eco, now: number): boolean {
  if (freeRefillIn(e, now) > 0) return false;
  addEnergy(e, FREE_REFILL, now);
  e.freeRefillTs = now;
  return true;
}

export function spendDiamonds(e: Eco, n: number): boolean {
  if (n < 0 || e.diamonds < n) return false;
  e.diamonds -= n;
  return true;
}

export function addDiamonds(e: Eco, n: number): void { e.diamonds = Math.min(99_999_999, e.diamonds + Math.max(0, Math.floor(n))); }

// ------------------------------------------------------------------ sac

export const bagFull = (e: Eco) => e.bag.length >= e.bagSlots;

export function bagPut(e: Eco, r: ItemRef): boolean {
  if (r.c === 'gen' || bagFull(e)) return false;
  e.bag.push({ c: r.c, l: r.l });
  return true;
}

export function bagTake(e: Eco, index: number): ItemRef | null {
  const it = e.bag[index];
  if (!it) return null;
  e.bag.splice(index, 1);
  return it as ItemRef;
}

/** Prix d'agrandissement du sac (+2 places), de plus en plus cher. */
export const bagUpgradePrice = (e: Eco) => 20 + (e.bagSlots - 6) * 10;

export function upgradeBag(e: Eco): boolean {
  if (e.bagSlots >= BAG_MAX) return false;
  if (!spendDiamonds(e, bagUpgradePrice(e))) return false;
  e.bagSlots = Math.min(BAG_MAX, e.bagSlots + 2);
  return true;
}

// ---------------------------------------------------------------- coffres

export interface ChestLoot { energy: number; hearts: number; diamonds: number; wands: number; winds: number; items: ItemRef[] }

/** Contenu d'un coffre. `rand` ∈ [0, 1) (Math.random en jeu, fixe en test). */
export function rollChest(kind: 'free' | 'royal', rand: () => number): ChestLoot {
  const r = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const coll = () => COLLECTION_IDS[Math.floor(rand() * COLLECTION_IDS.length)];
  if (kind === 'free') {
    return {
      energy: r(20, 40), hearts: r(10, 30), diamonds: rand() < 0.5 ? r(2, 6) : 0, wands: rand() < 0.25 ? 1 : 0, winds: rand() < 0.4 ? 1 : 0,
      items: rand() < 0.5 ? [{ c: 'special', l: SPECIAL.STAR }] : [],
    };
  }
  const items: ItemRef[] = [{ c: 'special', l: SPECIAL.STAR }, { c: coll(), l: r(4, 6) }];
  if (rand() < 0.5) items.push({ c: 'special', l: SPECIAL.BOX });
  return { energy: r(60, 120), hearts: r(40, 90), diamonds: 0, wands: r(1, 2), winds: r(1, 2), items };
}

// ------------------------------------------------------- catalogue boutique

/** Packs de diamants — prix FICTIFS : aucun paiement n'existe dans le jeu. */
export const PACKS = [
  { id: 'p1', euros: 1, diamonds: 100, tag: '' },
  { id: 'p5', euros: 5, diamonds: 600, tag: '+20 %' },
  { id: 'p10', euros: 10, diamonds: 1400, tag: 'Populaire' },
  { id: 'p20', euros: 20, diamonds: 3200, tag: '+60 %' },
  { id: 'p50', euros: 50, diamonds: 10000, tag: 'Reine absolue' },
] as const;

export type DiamondBuy =
  | 'energy' | 'wand3' | 'wind3' | 'star' | 'box' | 'royalChest' | 'bag';

export const DIAMOND_ITEMS: { id: DiamondBuy; name: string; desc: string; price: number | ((e: Eco) => number); icon: string }[] = [
  { id: 'energy', name: 'Énergie pleine', desc: '+100 ⚡ tout de suite', price: 15, icon: 'energy' },
  { id: 'wand3', name: '3 Baguettes magiques', desc: 'Fait monter un objet d\'un niveau', price: 30, icon: 'wand' },
  { id: 'wind3', name: '3 Souffles', desc: 'Retire un objet gênant', price: 15, icon: 'wind' },
  { id: 'star', name: 'Étoile filante', desc: 'Objet rare, rangé dans ton sac', price: 12, icon: 'star' },
  { id: 'box', name: 'Coffret surprise', desc: 'Objet rare : 3 objets d\'un coup', price: 10, icon: 'box' },
  { id: 'royalChest', name: 'Coffre du royaume', desc: 'Énergie, cœurs, bonus et objets précieux', price: 40, icon: 'chest' },
  { id: 'bag', name: 'Agrandir le sac', desc: '+2 places de rangement', price: (e) => bagUpgradePrice(e), icon: 'bag' },
];

export const priceOf = (id: DiamondBuy, e: Eco) => {
  const it = DIAMOND_ITEMS.find((x) => x.id === id)!;
  return typeof it.price === 'function' ? it.price(e) : it.price;
};

/** Apparences du plateau (diamants). */
export const COSMETICS = [
  { id: 'classic', kind: 'tiles', name: 'Plateau crème', price: 0 },
  { id: 'gold', kind: 'tiles', name: 'Plateau doré', price: 50 },
  { id: 'lavender', kind: 'tiles', name: 'Plateau lavande', price: 40 },
  { id: 'night', kind: 'tiles', name: 'Nuit étoilée', price: 60 },
  { id: 'fx-hearts', kind: 'fx', name: 'Fusions en cœurs', price: 30 },
  { id: 'fx-stars', kind: 'fx', name: 'Fusions en étoiles', price: 30 },
  { id: 'fx-petals', kind: 'fx', name: 'Fusions en pétales', price: 30 },
] as const;

/** Décorations de « Notre petit monde » (cœurs, sauf la plus spectaculaire). */
export const DECOR = [
  { id: 'bench', name: 'Banc en bois', hearts: 40, diamonds: 0, line: 'Un banc pour deux. Le meilleur siège du monde.' },
  { id: 'lamps', name: 'Lampadaires', hearts: 60, diamonds: 0, line: 'Comme à Paris, le soir. En mieux.' },
  { id: 'roses', name: 'Massif de roses', hearts: 80, diamonds: 0, line: 'Des roses. Évidemment.' },
  { id: 'garland', name: 'Guirlande lumineuse', hearts: 100, diamonds: 0, line: 'Ça brille presque autant que tes yeux.' },
  { id: 'cat', name: 'Petit chat', hearts: 120, diamonds: 0, line: 'Il s\'appelle Minou. Il t\'adore déjà.' },
  { id: 'fountain', name: 'Fontaine', hearts: 150, diamonds: 0, line: 'On fait un vœu ? Moi je l\'ai déjà.' },
  { id: 'cafe', name: 'Table de café pour deux', hearts: 160, diamonds: 0, line: 'Un café en terrasse, rien que nous deux.' },
  { id: 'swing', name: 'Balançoire', hearts: 180, diamonds: 0, line: 'Je pousse, tu rigoles. Deal ?' },
  { id: 'arch', name: 'Arche fleurie', hearts: 200, diamonds: 0, line: 'Une arche… je dis ça, je dis rien.' },
  { id: 'kiosk', name: 'Kiosque', hearts: 250, diamonds: 0, line: 'Pour danser quand il pleut.' },
  { id: 'chessboard', name: 'Échiquier géant', hearts: 300, diamonds: 0, line: 'Revanche grandeur nature ?' },
  { id: 'fireworks', name: 'Feu d\'artifice', hearts: 0, diamonds: 120, line: 'Un feu d\'artifice rien que pour ma reine.' },
] as const;
