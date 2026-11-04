/**
 * Mode infini — logique d'interface PURE (aucun DOM) : formatage, regroupement, choix de ce qui
 * s'affiche. Testée par tests/endless-ui-logic.test.ts.
 */
import { COLLECTION_IDS, COLLECTIONS, RARITIES, RARITY_COLOR, RARITY_NAME, collMax, type ItemRef, type Rarity } from '../../data/items';
import { RES_NAMES, type ResKind } from '../../data/world/ids';
import type { FunState } from '../../save/fun';
import type { Loot, OrderState, OrderTier, RunState } from '../../game/merge/types';
import * as R from '../../game/merge/rules';
import { orderGain } from '../../game/world/fusionRewards';
import { ENDLESS_CFG } from '../../game/endless/config';
import { albumProgress, albumTotal } from '../../game/endless/album';
import { tierOfSlot } from '../../game/endless/orders';
import { FLOOR_LEVEL, FLOOR_REGEN_MS, FREE_TAP_EVERY, REGEN_MS } from '../../game/economy/economy';

// ------------------------------------------------------------------ commandes
export const TIER_META: Record<OrderTier, { label: string; color: string }> = {
  easy: { label: 'Facile', color: '#6FCF97' },
  mid: { label: 'Moyenne', color: '#F5A04A' },
  hard: { label: 'Difficile', color: '#E8558F' },
};

export type RewardKind = 'coins' | 'flowers' | 'fabric' | 'cocoa' | 'hearts' | 'energy';
export interface RewardChip { kind: RewardKind; n: number; label: string }

const RES_LABEL: Record<RewardKind, string> = { coins: 'pièces', flowers: 'fleurs', fabric: 'tissu', cocoa: 'cacao', hearts: 'cœurs', energy: '⚡' };

/** Récompenses prévisibles d'une commande : pièces, matériau, cœurs, énergie (dans cet ordre). */
export function rewardChips(o: OrderState): RewardChip[] {
  const out: RewardChip[] = [];
  const r = o.reward;
  if (!r) return [{ kind: 'hearts', n: R.orderHearts(o), label: RES_LABEL.hearts }];
  const g = orderGain(r);
  for (const k of ['coins', 'flowers', 'fabric', 'cocoa'] as const) if (g[k]) out.push({ kind: k, n: g[k]!, label: RES_LABEL[k] });
  if (r.hearts) out.push({ kind: 'hearts', n: r.hearts, label: RES_LABEL.hearts });
  if (r.energy) out.push({ kind: 'energy', n: r.energy, label: RES_LABEL.energy });
  return out;
}

export interface OrderCardModel {
  slot: number;
  tier: OrderTier;
  tierLabel: string;
  color: string;
  items: { ref: ItemRef; have: boolean; ratio: number }[];
  ratio: number;
  ready: boolean;
  chips: RewardChip[];
  /** Indices (cases du plateau) des objets déjà là qui servent à cette commande. */
  cells: number[];
}

/** Ce qu'une carte de commande doit afficher (null = emplacement vide). */
export function orderCardModel(s: RunState, slot: number): OrderCardModel | null {
  const o = s.orders[slot];
  if (!o) return null;
  const p = R.orderProgress(s, slot);
  if (!p) return null;
  const tier = o.tier ?? tierOfSlot(slot);
  return {
    slot, tier, tierLabel: TIER_META[tier].label, color: TIER_META[tier].color,
    items: p.per.map((x) => ({ ref: x.item, have: x.have, ratio: x.ratio })),
    ratio: p.ratio, ready: p.ready, chips: rewardChips(o),
    cells: R.orderCells(s, slot) ?? usefulCells(s, o),
  };
}

/** Cases contenant un objet demandé (même incomplet) — pour la mise en évidence au toucher. */
export function usefulCells(s: RunState, o: OrderState): number[] {
  const out: number[] = [];
  s.cells.forEach((c, i) => { if (c.item && o.items.some((w) => w.c === c.item!.c && w.l === c.item!.l)) out.push(i); });
  return out;
}

/** Quel(s) slot(s) viennent de devenir prêts (pour la mise en évidence). */
export function newlyReady(prev: boolean[], now: boolean[]): number[] {
  return now.map((r, i) => (r && !prev[i] ? i : -1)).filter((i) => i >= 0);
}

/** Texte « Il manque : X » d'une commande non prête. */
export function missingText(m: OrderCardModel, name: (r: ItemRef) => string): string {
  const miss = m.items.filter((x) => !x.have).map((x) => name(x.ref));
  return miss.length ? `Il manque : ${miss.join(' + ')}` : 'Prête à livrer !';
}

// ------------------------------------------------------------------ « ça sert à… »
export const RES_USE: Record<ResKind, string> = {
  coins: 'Pièces : améliorent tes générateurs, le château et le dressing.',
  flowers: 'Fleurs : pour le jardin et les générateurs de fleurs.',
  fabric: 'Tissu : pour le dressing et les accessoires.',
  cocoa: 'Cacao : pour la chocolaterie.',
};
export const resUse = (k: RewardKind): string => (k === 'hearts' ? 'Cœurs : pour décorer notre petit monde et acheter des bonus.' : k === 'energy' ? 'Énergie : pour toucher les générateurs.' : RES_USE[k]);
export const resName = (k: ResKind): string => RES_NAMES[k];

// ------------------------------------------------------------------ coût d'amélioration
export interface CostLine { kind: ResKind; need: number; have: number; ok: boolean }
export function costLines(cost: Partial<Record<ResKind, number>> | null, res: Record<ResKind, number>): CostLine[] {
  if (!cost) return [];
  return (Object.entries(cost) as [ResKind, number][]).filter(([, n]) => n > 0).map(([kind, need]) => ({ kind, need, have: res[kind] ?? 0, ok: (res[kind] ?? 0) >= need }));
}
export function missingCostText(lines: CostLine[]): string {
  const miss = lines.filter((l) => !l.ok).map((l) => `${l.need - l.have} ${RES_NAMES[l.kind].toLowerCase()}`);
  return miss.length ? `Il te manque ${miss.join(' et ')}` : '';
}

// ------------------------------------------------------------------ butin
const KEY_ORDER = ['coins', 'flowers', 'fabric', 'cocoa', 'energy', 'diamonds', 'hearts', 'chest', 'ticket', 'fragment', 'cloth', 'bag', 'accessory', 'deco', 'rareItem', 'star', 'wand', 'wind'];
/** Regroupe les lignes de même type (somme) et les trie de façon stable. */
export function groupLoot(loots: Loot[]): Loot[] {
  const m = new Map<string, Loot>();
  for (const l of loots) {
    const k = `${l.kind}:${l.kind === 'rareItem' || l.kind === 'star' ? JSON.stringify(l.item ?? null) : ''}`;
    const cur = m.get(k);
    if (cur) cur.n += l.n;
    else m.set(k, { ...l });
  }
  return [...m.values()].sort((a, b) => KEY_ORDER.indexOf(a.kind) - KEY_ORDER.indexOf(b.kind));
}

export const LOOT_FLY: Partial<Record<Loot['kind'], string>> = {
  coins: 'coin', diamonds: 'diamond', energy: 'energy', hearts: 'heart', flowers: 'flowers', fabric: 'fabric', cocoa: 'cocoa', ticket: 'ticket', chest: 'chest',
};
export const lootNoun: Record<string, string> = {
  coins: 'pièces', diamonds: 'diamants', energy: 'énergie', hearts: 'cœurs', flowers: 'fleurs', fabric: 'tissu', cocoa: 'cacao', ticket: 'ticket', chest: 'coffre', fragment: 'fragment de vêtement',
  cloth: 'vêtement', bag: 'sac à main', accessory: 'accessoire', deco: 'décoration', rareItem: 'objet rare', star: 'Étoile filante', wand: 'Baguette', wind: 'Souffle',
};
export function lootText(l: Loot): string {
  const noun = lootNoun[l.kind] ?? l.kind;
  return ['coins', 'diamonds', 'energy', 'hearts', 'flowers', 'fabric', 'cocoa'].includes(l.kind) ? `+${l.n} ${noun}` : l.n > 1 ? `${l.n} × ${noun}` : noun;
}

// ------------------------------------------------------------------ coffres : identité visuelle par rareté
export interface ChestLook { rarity: Rarity; color: string; title: string; tier: 0 | 1 | 2 | 3 | 4; confetti: boolean; shake: number; second: boolean }
export function chestLook(r: Rarity): ChestLook {
  const tier = Math.max(0, RARITIES.indexOf(r)) as 0 | 1 | 2 | 3 | 4;
  return { rarity: r, color: RARITY_COLOR[r], title: `Coffre ${RARITY_NAME[r].toLowerCase()}`, tier, confetti: tier >= 3, shake: 1 + tier, second: tier >= 3 };
}

// ------------------------------------------------------------------ énergie
export interface EnergyAdvice {
  tone: 'ok' | 'low' | 'empty';
  title: string;
  /** Ligne « prochaine recharge ». */
  next: string;
  lines: string[];
  freeReady: boolean;
}
export function fmtWait(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, '0')}` : `${s} s`;
}
export function energyAdvice(energy: number, nextMs: number, freeInMs: number, max = 100): EnergyAdvice {
  const tone: EnergyAdvice['tone'] = energy <= 0 ? 'empty' : energy < FLOOR_LEVEL ? 'low' : 'ok';
  const per = energy < FLOOR_LEVEL ? FLOOR_REGEN_MS : REGEN_MS;
  const next = energy >= max ? 'Énergie pleine' : nextMs > 0 ? `+1 ⚡ dans ${fmtWait(nextMs)} · elle revient toute seule` : `+1 ⚡ toutes les ${Math.round(per / 1000)} s`;
  const lines = [
    `1 toucher sur ${FREE_TAP_EVERY} est gratuit (plus souvent avec un générateur amélioré).`,
    'Tu gagnes aussi de l\'énergie en jouant : commandes livrées, combos, nouveautés de l\'album.',
    `Sous ${FLOOR_LEVEL} ⚡, la recharge s'accélère : 1 ⚡ toutes les ${Math.round(FLOOR_REGEN_MS / 1000)} s.`,
  ];
  const title = tone === 'empty' ? 'Plus d\'énergie pour l\'instant… mais pas de panique, ma reine.' : tone === 'low' ? 'Il t\'en reste un peu, la recharge est rapide.' : 'Chaque toucher sur un générateur coûte 1 ⚡.';
  return { tone, title, next, lines, freeReady: freeInMs <= 0 };
}

/** Faut-il rembourser l'énergie dépensée par la scène ? (toucher devenu gratuit après coup) */
export const shouldRefund = (spent: boolean, ev: { t: string; free?: boolean; source?: string }[]): boolean =>
  spent && ev.some((e) => e.t === 'spawn' && e.free === true && e.source === 'gen');

// ------------------------------------------------------------------ réactions d'Auguste (parcimonie)
export class ReactionGate {
  private last = -1e12;
  constructor(public gapMs = 20_000) {}
  /** Autorisé si la dernière réaction date de plus de `gapMs` et qu'aucune fusion n'est en cours. */
  allow(now: number, busy: boolean): boolean { return !busy && now - this.last >= this.gapMs; }
  mark(now: number): void { this.last = now; }
}

export type ReactionKey = 'rare' | 'maxMerge' | 'combo3' | 'combo5' | 'chest' | 'drop' | 'orderDone' | 'energyLow';
export type ReactionWish = { key: ReactionKey; prio: number };
/** Parmi les souhaits d'un même lot, garde le plus important (une seule réaction). */
export function bestReaction(w: ReactionWish[]): ReactionWish | null {
  return w.length ? [...w].sort((a, b) => b.prio - a.prio)[0] : null;
}
export const REACTION_PRIO: Record<ReactionKey, number> = { maxMerge: 5, chest: 4, rare: 3, combo5: 2, drop: 2, orderDone: 2, energyLow: 4, combo3: 1 };

// ------------------------------------------------------------------ compteur animé
export function easeCount(from: number, to: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const e = 1 - Math.pow(1 - k, 3);
  return Math.round(from + (to - from) * e);
}

// ------------------------------------------------------------------ événements secondaires / objectifs
export const SEC_ICON: Record<string, string> = { castle: 'home', gem: 'sparkle', flower: 'flower', heart: 'heart', album: 'album', bolt: 'bolt' };
export const secIcon = (name: string): string => SEC_ICON[name] ?? name;
/** Au plus 2 chips d'événements secondaires. */
export const limitChips = <T>(v: T[], max = 2): T[] => v.slice(0, max);
export const pct = (progress: number, goal: number): number => (goal > 0 ? Math.max(0, Math.min(100, Math.round((progress / goal) * 100))) : 0);

// ------------------------------------------------------------------ album
export interface AlbumCollView { coll: string; name: string; color: string; found: number; max: number; complete: boolean; cells: { ref: ItemRef; found: boolean }[] }
export function albumCollViews(fun: FunState): AlbumCollView[] {
  const have = new Set(fun.endless2.album);
  return COLLECTION_IDS.map((c) => {
    const max = collMax(c);
    const cells = Array.from({ length: max }, (_, k) => ({ ref: { c, l: k + 1 } as ItemRef, found: have.has(`${c}:${k + 1}`) }));
    const found = cells.filter((x) => x.found).length;
    return { coll: c, name: COLLECTIONS[c].name, color: COLLECTIONS[c].color, found, max, complete: found === max, cells };
  });
}

const A = ENDLESS_CFG.album;
export interface AlbumClaim { key: string; label: string; loot: Loot[]; chain?: string }
/** Récompenses de chaîne / de palier déjà méritées mais pas encore prises (ex. album importé de l'ancienne version). */
export function albumClaims(fun: FunState): AlbumClaim[] {
  const e = fun.endless2;
  const out: AlbumClaim[] = [];
  const have = new Set(e.album);
  for (const c of COLLECTION_IDS) {
    let full = true;
    for (let l = 1; l <= collMax(c); l++) if (!have.has(`${c}:${l}`)) { full = false; break; }
    const key = `chain:${c}`;
    if (full && !e.albumClaimed.includes(key)) {
      out.push({ key, chain: c, label: `Chaîne « ${COLLECTIONS[c].name} » complète`, loot: [{ kind: 'coins', n: A.chainCoins }, { kind: 'energy', n: A.chainEnergy }, { kind: 'diamonds', n: A.chainDiamonds, rarity: 'rare' }] });
    }
  }
  const count = e.album.length;
  A.milestones.forEach((m, i) => {
    const key = `count:${m}`;
    if (count >= m && !e.albumClaimed.includes(key)) {
      const loot: Loot[] = [{ kind: 'coins', n: A.milestoneCoins[i], rarity: i >= 3 ? 'epic' : 'rare' }];
      if (i >= 2) loot.push({ kind: 'deco', n: 1, rarity: i >= 4 ? 'epic' : 'rare', seed: count * 31 + i });
      out.push({ key, label: `${m} objets découverts`, loot });
    }
  });
  return out;
}

export const albumHeader = (fun: FunState): string => { const p = albumProgress(fun); return `${p.found}/${p.total || albumTotal()} objets découverts`; };

/** Virgule décimale française (« 0.6 % » → « 0,6 % »). */
export const fr = (s: string): string => s.replace(/(\d)\.(\d)/g, '$1,$2');
