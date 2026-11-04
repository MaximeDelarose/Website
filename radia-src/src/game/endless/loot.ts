/**
 * Butin : description (`Loot`, dans merge/types.ts) → versement dans MON MONDE (pièces, matériaux,
 * vêtements du dressing, meubles du château) et le portefeuille (énergie, diamants, cœurs, bonus).
 * Aucun accès à la sauvegarde globale : tout passe par un `LootHost` fourni par l'interface.
 */
import { RARITIES, type Rarity } from '../../data/items';
import type { ClothId, ResKind } from '../../data/world/ids';
import { CLOTHES } from '../../data/world/wardrobe';
import { FURNITURE_IDS } from '../../data/world/ids';
import { FURNITURE } from '../../data/world/furniture';
import type { FunState } from '../../save/fun';
import type { BoardEvent, Loot, LootKind } from '../merge/types';

// ------------------------------------------------------------------ raretés
export const rarityIndex = (r: Rarity): number => RARITIES.indexOf(r);
export const rarityAtLeast = (r: Rarity, min: Rarity): boolean => rarityIndex(r) >= rarityIndex(min);

/** Rareté d'un vêtement d'après son prix (pièces ; les pièces de luxe en diamants sont légendaires). */
export function clothRarity(id: ClothId): Rarity {
  const d = CLOTHES[id];
  if (!d) return 'common';
  if (d.diamonds) return 'legendary';
  const p = d.coins;
  return p < 100 ? 'common' : p < 160 ? 'uncommon' : p < 240 ? 'rare' : p < 330 ? 'epic' : 'legendary';
}
export function furnitureRarity(id: string): Rarity {
  const p = (FURNITURE as Record<string, { price: number }>)[id]?.price ?? 0;
  return p < 100 ? 'common' : p < 200 ? 'uncommon' : p < 350 ? 'rare' : p < 480 ? 'epic' : 'legendary';
}

const SLOTS_BY_KIND: Record<'cloth' | 'bag' | 'accessory', string[]> = {
  cloth: ['top', 'bottom', 'dress', 'jacket', 'shoes'],
  bag: ['bag'],
  accessory: ['acc', 'crown'],
};

/** Vêtements pouvant tomber (ni cadeaux, ni pièces de départ, ni options de visage). */
export function clothCandidates(kind: 'cloth' | 'bag' | 'accessory'): ClothId[] {
  return (Object.values(CLOTHES)).filter((c) => !c.free && !c.gift && !c.starter && SLOTS_BY_KIND[kind].includes(c.slot)).map((c) => c.id);
}
export const furnitureCandidates = (): string[] => FURNITURE_IDS.filter((f) => !!(FURNITURE as Record<string, unknown>)[f]);

/** Choisit, de façon déterministe (`seed`), une pièce non possédée de la rareté voulue (ou la plus proche). */
function pickOwnedAware<T extends string>(cands: T[], owned: (id: T) => boolean, rar: (id: T) => Rarity, want: Rarity, seed: number): { id: T; dup: boolean } | null {
  if (!cands.length) return null;
  const free = cands.filter((c) => !owned(c));
  const pool = free.length ? free : cands;
  const wi = rarityIndex(want);
  // distance de rareté croissante : exacte d'abord, puis voisines
  const sorted = [...pool].sort((a, b) => Math.abs(rarityIndex(rar(a)) - wi) - Math.abs(rarityIndex(rar(b)) - wi) || (a < b ? -1 : 1));
  const best = Math.abs(rarityIndex(rar(sorted[0])) - wi);
  const tier = sorted.filter((c) => Math.abs(rarityIndex(rar(c)) - wi) === best);
  const id = tier[Math.abs(seed) % tier.length];
  return { id, dup: owned(id) };
}

// ------------------------------------------------------------------ versement
export interface LootHost {
  /** Données du monde modifiées en place : ressources, dressing, meubles possédés. */
  world: {
    res: Record<ResKind, number>;
    wardrobe: { owned: string[] };
    castle: { owned: Record<string, number> };
  };
  giveEnergy(n: number): void;
  giveDiamonds(n: number): void;
  addHearts(n: number): void;
  giveBooster(kind: 'wand' | 'wind', n: number): void;
}

export interface LootResult {
  coins: number; flowers: number; fabric: number; cocoa: number; energy: number; diamonds: number; hearts: number;
  cloth: ClothId[]; furniture: string[]; dupCoins: number;
  /** Ligne lisible (« +12 pièces, Robe… ») pour un toast. */
  text: string;
}

const emptyResult = (): LootResult => ({ coins: 0, flowers: 0, fabric: 0, cocoa: 0, energy: 0, diamonds: 0, hearts: 0, cloth: [], furniture: [], dupCoins: 0, text: '' });
const CAP = 999_999_999;

const KIND_LABEL: Partial<Record<LootKind, string>> = {
  coins: 'pièces', diamonds: 'diamants', energy: '⚡', hearts: 'cœurs', flowers: 'fleurs', fabric: 'tissu', cocoa: 'cacao',
  ticket: 'ticket', chest: 'coffre', fragment: 'fragment de vêtement', cloth: 'vêtement', bag: 'sac à main', accessory: 'accessoire',
  deco: 'décoration', rareItem: 'objet rare', star: 'Étoile filante', wand: 'Baguette', wind: 'Souffle',
};
export const lootLabel = (l: Loot): string => `${l.n > 1 || ['coins', 'diamonds', 'energy', 'hearts', 'flowers', 'fabric', 'cocoa'].includes(l.kind) ? `+${l.n} ` : ''}${KIND_LABEL[l.kind] ?? l.kind}`;

/** Ligne lisible d'un résultat (« +12 pièces · Robe… »). */
export function describeResult(out: LootResult): string {
  const parts: string[] = [];
  if (out.coins) parts.push(`+${out.coins} pièces`);
  if (out.flowers) parts.push(`+${out.flowers} fleurs`);
  if (out.fabric) parts.push(`+${out.fabric} tissu`);
  if (out.cocoa) parts.push(`+${out.cocoa} cacao`);
  if (out.energy) parts.push(`+${out.energy} ⚡`);
  if (out.diamonds) parts.push(`+${out.diamonds} 💎`);
  if (out.hearts) parts.push(`+${out.hearts} ♡`);
  for (const c of out.cloth) parts.push(CLOTHES[c]?.name ?? c);
  for (const f of out.furniture) parts.push((FURNITURE as Record<string, { name: string }>)[f]?.name ?? f);
  return parts.join(' · ');
}

/**
 * Verse un butin. Les objets à poser sur le plateau (`rareItem`, `star`) ne sont PAS traités ici
 * (le moteur les place ou les convertit) ; `chest`, `ticket`, `fragment` sont comptés par le moteur
 * dans fun.endless2 → ici ils ne font rien (pas de double versement).
 */
export function applyLoot(host: LootHost, loots: Loot[] | Loot): LootResult {
  const out = emptyResult();
  const w = host.world;
  const addRes = (k: ResKind, n: number) => { w.res[k] = Math.min(CAP, (w.res[k] ?? 0) + n); };
  for (const l of Array.isArray(loots) ? loots : [loots]) {
    const n = Math.max(0, Math.floor(l.n));
    switch (l.kind) {
      case 'coins': addRes('coins', n); out.coins += n; break;
      case 'flowers': addRes('flowers', n); out.flowers += n; break;
      case 'fabric': addRes('fabric', n); out.fabric += n; break;
      case 'cocoa': addRes('cocoa', n); out.cocoa += n; break;
      case 'energy': host.giveEnergy(n); out.energy += n; break;
      case 'diamonds': host.giveDiamonds(n); out.diamonds += n; break;
      case 'hearts': host.addHearts(n); out.hearts += n; break;
      case 'wand': case 'wind': host.giveBooster(l.kind, n); break;
      case 'cloth': case 'bag': case 'accessory': {
        const pick = pickOwnedAware<ClothId>(clothCandidates(l.kind), (id) => w.wardrobe.owned.includes(id), clothRarity, l.rarity ?? 'common', l.seed ?? 0);
        if (!pick) break;
        if (pick.dup) {
          const back = Math.max(10, Math.floor((CLOTHES[pick.id]?.coins ?? 20) / 2));
          addRes('coins', back); out.dupCoins += back; out.coins += back;
        } else { w.wardrobe.owned.push(pick.id); out.cloth.push(pick.id); }
        break;
      }
      case 'deco': {
        const pick = pickOwnedAware<string>(furnitureCandidates(), (id) => (w.castle.owned[id] ?? 0) > 0, furnitureRarity, l.rarity ?? 'common', l.seed ?? 0);
        if (!pick) break;
        w.castle.owned[pick.id] = (w.castle.owned[pick.id] ?? 0) + 1;
        out.furniture.push(pick.id);
        break;
      }
      default: break; // chest, ticket, fragment, rareItem, star : gérés par le moteur
    }
  }
  out.text = describeResult(out);
  return out;
}

/**
 * Verse TOUT ce que décrit un lot d'événements du moteur (livraisons, drops, nouveautés d'album,
 * paliers de combo, fusions maximales, événements secondaires). À appeler UNE fois par lot.
 * Les cœurs de livraison sont versés (`reward.hearts`) ; les gains « monde » viennent de `gain`.
 */
export function applyEvents(host: LootHost, events: BoardEvent[]): LootResult {
  const total = emptyResult();
  const merge = (r: LootResult) => {
    for (const k of ['coins', 'flowers', 'fabric', 'cocoa', 'energy', 'diamonds', 'hearts', 'dupCoins'] as const) total[k] += r[k];
    total.cloth.push(...r.cloth); total.furniture.push(...r.furniture);
  };
  for (const e of events) {
    switch (e.t) {
      case 'drop': merge(applyLoot(host, e.loot)); break;
      case 'discover': merge(applyLoot(host, e.reward)); break;
      case 'maxMerge': merge(applyLoot(host, e.loot)); break;
      case 'secondary': if (e.reward) merge(applyLoot(host, e.reward)); break;
      case 'comboTier': {
        const l: Loot[] = [];
        if (e.energy) l.push({ kind: 'energy', n: e.energy });
        if (e.hearts) l.push({ kind: 'hearts', n: e.hearts });
        if (e.reward === 'wand') l.push({ kind: 'wand', n: 1 });
        merge(applyLoot(host, l));
        break;
      }
      case 'deliver': {
        const l: Loot[] = [];
        for (const [k, n] of Object.entries(e.gain ?? {}) as [ResKind, number][]) if (n) l.push({ kind: k, n });
        if (e.energy) l.push({ kind: 'energy', n: e.energy });
        if (e.hearts) l.push({ kind: 'hearts', n: e.hearts });
        merge(applyLoot(host, l));
        break;
      }
      default: break;
    }
  }
  total.text = describeResult(total);
  return total;
}

/** Statistiques de drops (fun.endless2.drops) : par rareté et par type. */
export function recordDrop(fun: FunState, l: Loot): void {
  const d = fun.endless2.drops;
  const r = l.rarity ?? 'common';
  d[`rarity:${r}`] = (d[`rarity:${r}`] ?? 0) + 1;
  d[`kind:${l.kind}`] = (d[`kind:${l.kind}`] ?? 0) + 1;
}
