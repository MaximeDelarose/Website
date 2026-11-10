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
import { LEGACY_COLLECTION_IDS as COLLECTION_IDS, SPECIAL } from '../../data/items';
import { ENDLESS_CFG } from '../endless/config';

export const ENERGY_MAX = 100;
/** Une énergie revient toutes les 2 min (plein en ~3 h 20) : voir ENDLESS_CFG.energy.regenMs et docs/BALANCING.md. */
export const REGEN_MS = ENDLESS_CFG.energy.regenMs;

/**
 * Endless 2.0 — l'énergie ne bloque JAMAIS longtemps (aucune frustration pour pousser les diamants) :
 *  - « plancher » : sous FLOOR_LEVEL, la recharge naturelle est accélérée (1 énergie / FLOOR_REGEN_MS,
 *    soit 0 → 6 en ~2 min 30) ; au-dessus, REGEN_MS ;
 *  - toucher de générateur GRATUIT : 1 sur FREE_TAP_EVERY, plus une chance liée au niveau du générateur
 *    (voir rules.tapCost) ;
 *  - énergie offerte en jouant : livraisons (selon le palier de la commande), paliers de combo, nouveautés
 *    d'album, drops, coffres (voir src/game/endless/config.ts, section `energy`) ;
 *  - recharge gratuite d'Auguste (FREE_REFILL une fois par jour) et coffre gratuit, inchangés.
 */
export const FLOOR_LEVEL = ENDLESS_CFG.energy.floorLevel;
export const FLOOR_REGEN_MS = ENDLESS_CFG.energy.floorRegenMs;
export const FREE_TAP_EVERY = ENDLESS_CFG.energy.freeTapEvery;
export const deliveryEnergy = (tier: 'easy' | 'mid' | 'hard'): number => ENDLESS_CFG.energy.deliverEnergy[tier];
/** Millisecondes pour regagner UNE énergie quand on en a `energy`. */
export const regenStep = (energy: number): number => (energy < FLOOR_LEVEL ? FLOOR_REGEN_MS : REGEN_MS);
/** Attention d'Auguste : +30 énergie, UNE fois par jour (jamais au-delà de 100). */
export const FREE_REFILL = ENDLESS_CFG.energy.dailyGift;
const dayKey = (ts: number): string => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
/** Prochain minuit local après `ts`. */
const nextMidnight = (ts: number): number => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); };
/** Coffre gratuit toutes les 4 heures. */
export const FREE_CHEST_MS = 4 * 3600_000;
export const BAG_MAX = 18;

type Eco = SaveData['economy'];

/** Applique la recharge naturelle jusqu'à `now` (sans dépasser le maximum). */
export function syncEnergy(e: Eco, now: number): void {
  if (e.energy >= ENERGY_MAX) { e.energyTs = now; return; }
  let t = e.energyTs;
  let gained = 0;
  for (let k = 0; k < ENERGY_MAX * 2 && e.energy < ENERGY_MAX; k++) {
    const step = regenStep(e.energy);
    if (now - t < step) break;
    t += step;
    e.energy++;
    gained++;
  }
  if (gained <= 0) return;
  e.energyTs = e.energy >= ENERGY_MAX ? now : t;
}

export function spendEnergy(e: Eco, n: number, now: number): boolean {
  syncEnergy(e, now);
  if (e.energy >= n) {
    const wasFull = e.energy >= ENERGY_MAX;
    e.energy -= n;
    if (wasFull) e.energyTs = now;
    return true;
  }
  // énergie à court : la réserve héritée (ancien surplus) prend le relais, 1 pour 1, sans jamais dépasser ce qu'elle contient
  if (e.energy + (e.reserve ?? 0) >= n) { e.reserve = (e.reserve ?? 0) - (n - e.energy); e.energy = 0; return true; }
  return false;
}

/**
 * L'énergie ne dépasse JAMAIS le maximum (100) : un gain en trop est simplement perdu (l'énergie pleine ne se « stocke » pas).
 * Renvoie le gain RÉEL (pour des messages honnêtes : « +12 », pas « +50 » quand il ne restait que 12 de place).
 */
export function addEnergy(e: Eco, n: number, now: number): number {
  syncEnergy(e, now);
  const before = e.energy;
  e.energy = Math.min(ENERGY_MAX, e.energy + Math.max(0, Math.floor(n)));
  if (e.energy >= ENERGY_MAX) e.energyTs = now;
  return e.energy - before;
}

/** Millisecondes avant la prochaine énergie (0 si pleine). */
export function nextEnergyIn(e: Eco, now: number): number {
  syncEnergy(e, now);
  if (e.energy >= ENERGY_MAX) return 0;
  return Math.max(0, regenStep(e.energy) - (now - e.energyTs));
}

/** Millisecondes avant de pouvoir reprendre l'attention d'Auguste (0 = disponible : pas encore reçue aujourd'hui). */
export const freeRefillIn = (e: Eco, now: number) => (e.freeRefillTs > 0 && dayKey(e.freeRefillTs) === dayKey(now) ? Math.max(0, nextMidnight(now) - now) : 0);

export function takeFreeRefill(e: Eco, now: number): boolean {
  if (freeRefillIn(e, now) > 0) return false;
  syncEnergy(e, now);
  if (e.energy >= ENERGY_MAX) return false; // énergie déjà pleine : la recharge offerte n'est pas consommée pour rien
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
      energy: r(14, 28), hearts: r(10, 30), diamonds: rand() < 0.35 ? r(1, 3) : 0, wands: rand() < 0.25 ? 1 : 0, winds: rand() < 0.4 ? 1 : 0,
      items: rand() < 0.5 ? [{ c: 'special', l: SPECIAL.STAR }] : [],
    };
  }
  const items: ItemRef[] = [{ c: 'special', l: SPECIAL.STAR }, { c: coll(), l: r(4, 6) }];
  if (rand() < 0.5) items.push({ c: 'special', l: SPECIAL.BOX });
  return { energy: r(42, 85), hearts: r(40, 90), diamonds: 0, wands: r(1, 2), winds: r(1, 2), items };
}

// ------------------------------------------------------- catalogue boutique

/** Packs de diamants. */
export const PACKS = [
  { id: 'p1', euros: 1, diamonds: 50, tag: '' },
  { id: 'p5', euros: 5, diamonds: 275, tag: '+10 %' },
  { id: 'p10', euros: 10, diamonds: 600, tag: 'Populaire' },
  { id: 'p20', euros: 20, diamonds: 1300, tag: '+30 %' },
  { id: 'p50', euros: 50, diamonds: 3500, tag: 'Reine absolue' },
] as const;

export type DiamondBuy =
  | 'energy' | 'wand3' | 'wind3' | 'star' | 'box' | 'royalChest' | 'bag';

export const DIAMOND_ITEMS: { id: DiamondBuy; name: string; desc: string; price: number | ((e: Eco) => number); icon: string }[] = [
  { id: 'energy', name: 'Énergie pleine', desc: 'Remplit ton énergie jusqu\'à 100 ⚡', price: 15, icon: 'energy' },
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
