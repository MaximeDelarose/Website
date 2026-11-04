/**
 * Jauge de trésor (≈ 1 coffre / 30 fusions ordinaires), coffres à ouvrir, raretés avec PROBABILITÉS
 * PUBLIÉES (`chestOdds`) et garantie (pity). Aucune récompense payante.
 */
import { RARITIES, RARITY_COLOR, RARITY_NAME, type Rarity } from '../../data/items';
import type { FunState } from '../../save/fun';
import type { Loot } from '../merge/types';
import { Rng } from '../../utils/rng';
import { ENDLESS_CFG as C } from './config';
import { bump, counter } from './ctx';
import { addFragments, makeLoot } from './drops';
import { rarityIndex, recordDrop } from './loot';

const T = C.treasure;

/** Points de jauge gagnés par une fusion créant un objet de ce niveau. */
export const treasurePoints = (level: number): number => T.pointsByLevel[Math.max(0, Math.min(T.pointsByLevel.length - 1, level))] ?? 0;

export const pendingChests = (fun: FunState): number => Math.max(0, fun.endless2.treasure.earned - fun.endless2.treasure.opened);

export interface TreasureView { points: number; goal: number; ratio: number; pending: number; earned: number }
export function treasureView(fun: FunState): TreasureView {
  const t = fun.endless2.treasure;
  return { points: Math.round(t.points * 10) / 10, goal: T.goal, ratio: Math.min(1, t.points / T.goal), pending: pendingChests(fun), earned: t.earned };
}

/** Ajoute des points ; renvoie le nombre de coffres gagnés (la jauge se vide, le surplus est conservé). */
export function addTreasure(fun: FunState, pts: number): number {
  const t = fun.endless2.treasure;
  t.points += Math.max(0, pts);
  let won = 0;
  while (t.points >= T.goal) { t.points -= T.goal; t.earned++; won++; }
  return won;
}
/** Offre un coffre directement (drop). */
export function giveChest(fun: FunState, n = 1): void { fun.endless2.treasure.earned += n; }

// ------------------------------------------------------------------ probabilités publiées
export interface OddsRow { rarity: Rarity; name: string; color: string; pct: number }
export interface ChestOdds { rows: OddsRow[]; pity: { rare: number; epic: number }; text: string }

/** Tableau affichable des probabilités d'un coffre (somme = 100 %) et des garanties. */
export function chestOdds(): ChestOdds {
  const sum = RARITIES.reduce((a, r) => a + T.odds[r], 0);
  const rows = RARITIES.map((r) => ({ rarity: r, name: RARITY_NAME[r], color: RARITY_COLOR[r], pct: Math.round((T.odds[r] / sum) * 1000) / 10 }));
  return {
    rows, pity: { rare: T.pityRare, epic: T.pityEpic },
    text: `Garantie : au plus ${T.pityRare - 1} coffres de suite sans objet Rare ou mieux, et ${T.pityEpic - 1} sans Épique ou mieux.`,
  };
}

export interface Pity { rare: number; epic: number }

/** Rareté d'un coffre : tirage pondéré, relevé par la garantie. */
export function rollChestRarity(rand: () => number, pity: Pity = { rare: 0, epic: 0 }): { rarity: Rarity; forced: boolean } {
  const sum = RARITIES.reduce((a, r) => a + T.odds[r], 0);
  let x = rand() * sum;
  let rarity: Rarity = 'common';
  for (const r of RARITIES) { x -= T.odds[r]; if (x < 0) { rarity = r; break; } rarity = r; }
  let forced = false;
  if (pity.epic >= T.pityEpic - 1 && rarityIndex(rarity) < 3) { rarity = 'epic'; forced = true; }
  else if (pity.rare >= T.pityRare - 1 && rarityIndex(rarity) < 2) { rarity = 'rare'; forced = true; }
  return { rarity, forced };
}

export interface TreasureLoot { rarity: Rarity; loot: Loot[]; forced: boolean }

/**
 * Contenu d'un coffre. `rand` ∈ [0,1) (Math.random en jeu). Le contenu croît avec la rareté ; à partir
 * de « Rare » il contient toujours un objet du monde (accessoire / sac / décoration / vêtement).
 */
export function rollTreasure(rand: () => number, fun?: FunState, pity?: Pity): TreasureLoot {
  const { rarity, forced } = rollChestRarity(rand, pity);
  const rng = new Rng(Math.floor(rand() * 0xffffffff) >>> 0);
  const f = fun ?? ({ endless2: { gens: {}, fragments: {}, counters: {}, drops: {}, treasure: { points: 0, earned: 0, opened: 0, pity: 0 } } } as unknown as FunState);
  const r = (a: number, b: number) => a + rng.int(b - a + 1);
  const L = (kind: Loot['kind'], n: number, rr: Rarity = rarity): Loot => ({ kind, n, rarity: rr });
  const loot: Loot[] = [];
  switch (rarity) {
    case 'common': loot.push(L('coins', r(30, 60)), L('energy', r(5, 10))); break;
    case 'uncommon':
      loot.push(L('coins', r(60, 110)), L('energy', r(10, 18)), L(['flowers', 'fabric', 'cocoa'][rng.int(3)] as Loot['kind'], r(3, 6)));
      if (rng.next() < 0.35) loot.push(L('ticket', 1)); break;
    case 'rare':
      loot.push(L('coins', r(120, 200)), L('energy', r(15, 25)), makeLoot(f, rng, rng.weighted([['accessory', 4], ['bag', 2], ['deco', 3]] as const), 'rare'));
      if (rng.next() < 0.4) loot.push(makeLoot(f, rng, 'rareItem', 'rare')); break;
    case 'epic':
      loot.push(L('coins', r(250, 400)), L('energy', r(25, 40)), makeLoot(f, rng, rng.weighted([['cloth', 4], ['deco', 3], ['bag', 2]] as const), 'epic'), makeLoot(f, rng, 'rareItem', 'epic'));
      if (rng.next() < 0.5) loot.push(L('diamonds', r(3, 8))); break;
    case 'legendary':
      loot.push(L('coins', r(600, 900)), L('energy', 50), makeLoot(f, rng, 'cloth', 'legendary'), makeLoot(f, rng, 'deco', 'legendary'), L('diamonds', r(10, 20)), L('star', 2));
      break;
  }
  return { rarity, loot, forced };
}

/**
 * Ouvre un coffre en attente : met à jour la garantie et les statistiques. Renvoie null s'il n'y en a pas.
 * Les objets à poser sur le plateau (`rareItem`, `star`) sont à placer par l'interface (voir README).
 */
export function openChest(fun: FunState, rand: () => number = Math.random): TreasureLoot | null {
  if (pendingChests(fun) <= 0) return null;
  const t = fun.endless2.treasure;
  const res = rollTreasure(rand, fun, { rare: t.pity, epic: counter(fun, 'pityEpic') });
  t.opened++;
  const ri = rarityIndex(res.rarity);
  t.pity = ri >= 2 ? 0 : t.pity + 1;
  fun.endless2.counters.pityEpic = ri >= 3 ? 0 : counter(fun, 'pityEpic') + 1;
  bump(fun, 'chestsOpened');
  for (const l of res.loot) recordDrop(fun, l);
  fun.endless2.drops[`chest:${res.rarity}`] = (fun.endless2.drops[`chest:${res.rarity}`] ?? 0) + 1;
  return res;
}

/**
 * Règle les gains gérés par le moteur lui-même : coffres (+1 à ouvrir), tickets, fragments de vêtement
 * (un vêtement entier tous les N fragments : il est AJOUTÉ à la liste renvoyée). Les autres gains
 * (pièces, énergie, vêtements, décorations…) sont versés par `applyLoot`.
 */
export function settleLoot(fun: FunState, loots: Loot[], rng: Rng): Loot[] {
  const out: Loot[] = [];
  for (const l of loots) {
    out.push(l);
    if (l.kind === 'chest') giveChest(fun, l.n);
    else if (l.kind === 'ticket') fun.endless2.tickets = Math.min(99999, fun.endless2.tickets + l.n);
    else if (l.kind === 'fragment') {
      const cloth = addFragments(fun, l.n, l.rarity ?? 'common', rng);
      if (cloth) out.push(cloth);
    }
  }
  return out;
}
