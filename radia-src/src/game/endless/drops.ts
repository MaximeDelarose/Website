/**
 * Drops à la fusion : type, rareté, montant. Les monnaies sont versées automatiquement ; les objets
 * (fragments, sacs, accessoires, décorations, objets rares, tickets) sont décrits par un `Loot`.
 * Plafond de saturation : écart minimal entre deux drops, objets posés sur le plateau seulement s'il
 * reste de la place. Statistiques dans fun.endless2.drops.
 */
import { RARITIES, collMax, type Rarity } from '../../data/items';
import type { FunState } from '../../save/fun';
import type { Loot, LootKind } from '../merge/types';
import { Rng } from '../../utils/rng';
import { ENDLESS_CFG as C } from './config';
import { genLevel, maxProduced } from './generators';
import { rarityIndex, recordDrop } from './loot';
import { activeColls } from './unlocks';

const D = C.drops;
export const AUTO_KINDS: readonly LootKind[] = ['coins', 'diamonds', 'energy', 'hearts', 'flowers', 'fabric', 'cocoa', 'chest', 'ticket', 'fragment'];
export const isAuto = (k: LootKind): boolean => AUTO_KINDS.includes(k);

/** Rareté d'un drop : poids de base, glissant vers le haut avec le niveau de l'objet fusionné. */
export function rollRarity(rng: Rng, level: number, min: Rarity = 'common'): Rarity {
  const shift = 1 + D.levelShift * Math.max(0, level - 2);
  const entries = RARITIES.filter((r) => rarityIndex(r) >= rarityIndex(min))
    .map((r) => [r, D.rarityWeights[r] * (rarityIndex(r) >= 2 ? shift : 1)] as const);
  return rng.weighted(entries);
}

/** Construit un butin d'un type donné pour une rareté. */
export function makeLoot(fun: FunState, rng: Rng, kind: LootKind, rarity: Rarity): Loot {
  const ri = rarityIndex(rarity);
  switch (kind) {
    case 'coins': return { kind, n: D.coins[rarity], rarity };
    case 'diamonds': return { kind, n: D.diamonds[rarity], rarity };
    case 'energy': return { kind, n: D.energy[rarity], rarity };
    case 'ticket': return { kind, n: 1 + Math.floor(ri / 2), rarity };
    case 'fragment': return { kind, n: 1 + (ri >= 2 ? 1 : 0), rarity };
    case 'chest': return { kind, n: 1, rarity };
    case 'rareItem': {
      const colls = activeColls(fun);
      const c = rng.pick(colls);
      // niveau « un peu au-dessus » de ce que produit le générateur, borné
      const l = Math.max(3, Math.min(collMax(c) - 1, maxProduced(c, genLevel(fun, c)) + 1 + Math.floor(ri / 2)));
      return { kind, n: 1, rarity, item: { c, l } };
    }
    default: return { kind, n: 1, rarity, seed: rng.int(1 << 30) };
  }
}

/**
 * Tire (ou non) un drop pour une fusion de niveau `level`. `force` ignore la chance (ex. fusion
 * maximale) ; `min` impose une rareté minimale. Renvoie null s'il n'y a pas de drop.
 */
export function rollDrop(fun: FunState, rng: Rng, level: number, opts: { force?: boolean; min?: Rarity; kinds?: LootKind[] } = {}): Loot | null {
  const chance = D.chanceByLevel[Math.max(0, Math.min(D.chanceByLevel.length - 1, level))] ?? 0;
  if (!opts.force && rng.next() >= chance) return null;
  const rarity = rollRarity(rng, level, opts.min);
  const w = Object.entries(D.kindWeights).filter(([k]) => !opts.kinds || opts.kinds.includes(k as LootKind));
  // les rares+ ne sont jamais de simples pièces : on pousse vers les objets
  const adj = w.map(([k, x]) => [k as LootKind, rarityIndex(rarity) >= 2 && (k === 'coins' || k === 'energy') ? x * 0.35 : x] as const);
  const kind = rng.weighted(adj);
  const loot = makeLoot(fun, rng, kind, rarity);
  recordDrop(fun, loot);
  return loot;
}

/** Fragments de vêtement : renvoie un vêtement entier quand le seuil est atteint (sinon null). */
export function addFragments(fun: FunState, n: number, rarity: Rarity, rng: Rng): Loot | null {
  const f = fun.endless2.fragments;
  f.cloth = (f.cloth ?? 0) + n;
  if (f.cloth < D.fragmentsPerCloth) return null;
  f.cloth -= D.fragmentsPerCloth;
  const loot: Loot = { kind: 'cloth', n: 1, rarity: rarityIndex(rarity) < 1 ? 'uncommon' : rarity, seed: rng.int(1 << 30) };
  recordDrop(fun, loot);
  return loot;
}
