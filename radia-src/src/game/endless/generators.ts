/**
 * Générateurs évolutifs : niveau persistant (fun.endless2.gens['gen:<coll>']), table d'objets produits,
 * rendement (double production, toucher gratuit), amélioration payante (pièces / matériaux, JAMAIS de
 * diamants obligatoires) et XP de maîtrise. API pure.
 */
import { GENERATORS, SPECIAL, collMax, genKindOf, itemName, type CollectionId, type ItemRef } from '../../data/items';
import type { ResKind } from '../../data/world/ids';
import type { FunState } from '../../save/fun';
import { Rng } from '../../utils/rng';
import { ENDLESS_CFG as C } from './config';

const G = C.gens;
export const genKey = (coll: CollectionId): string => `gen:${coll}`;
export const collOfKind = (kind: number): CollectionId | undefined => GENERATORS[kind]?.coll;

/** Matériau du monde lié à chaque collection (pour les coûts) — null = pièces seulement. */
export const GEN_MAT: Partial<Record<CollectionId, ResKind>> = { flowers: 'flowers', rare: 'flowers', love: 'cocoa', choc: 'cocoa', paris: 'fabric', cloth: 'fabric', acc: 'fabric' };

// ------------------------------------------------------------------ état
export interface GenState { level: number; xp: number; rank: number }

export function genState(fun: FunState, coll: CollectionId): GenState {
  const g = fun.endless2.gens[genKey(coll)];
  const level = Math.max(1, Math.min(G.maxLevel, Math.floor(g?.level ?? 1)));
  const xp = Math.max(0, Math.floor(g?.xp ?? 0));
  return { level, xp, rank: masteryRank(xp) };
}
export const genLevel = (fun: FunState, coll: CollectionId): number => genState(fun, coll).level;

export const masteryRank = (xp: number): number => Math.min(G.maxRank, Math.floor(Math.sqrt(Math.max(0, xp) / G.xpPerRank)));

/** XP restante avant le prochain rang (null au rang maximum). */
export function masteryNext(xp: number): { rank: number; need: number; have: number } | null {
  const r = masteryRank(xp);
  if (r >= G.maxRank) return null;
  return { rank: r + 1, need: (r + 1) ** 2 * G.xpPerRank, have: xp };
}

export function addGenXp(fun: FunState, coll: CollectionId, n: number): void {
  const k = genKey(coll);
  const cur = fun.endless2.gens[k] ?? { level: 1, xp: 0 };
  fun.endless2.gens[k] = { level: Math.max(1, cur.level), xp: Math.min(1e9, cur.xp + n) };
}

// ------------------------------------------------------------------ table de production
const lvIdx = (level: number) => Math.max(0, Math.min(G.maxLevel, Math.floor(level)) - 1);

/** Probabilités (0..1) des niveaux d'objets produits par un générateur de ce niveau pour cette collection. */
export function genTable(coll: CollectionId, level: number): { l: number; p: number }[] {
  const w = G.tables[lvIdx(level)].slice(0, collMax(coll));
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((x, i) => ({ l: i + 1, p: x / sum }));
}

/** Niveau d'objet maximal que ce générateur peut produire directement. */
export const maxProduced = (coll: CollectionId, level: number): number => genTable(coll, level).length;

/** Valeur moyenne d'un objet produit, en « unités niveau 1 » (2^(l-1)). */
export function avgUnits(coll: CollectionId, level: number): number {
  return genTable(coll, level).reduce((a, r) => a + r.p * 2 ** (r.l - 1), 0);
}

export interface GenInfo {
  kind: number;
  coll: CollectionId;
  name: string;
  level: number;
  maxLevel: number;
  /** Table affichable : niveau, nom, probabilité en %. */
  table: { l: number; name: string; pct: number }[];
  maxProduced: number;
  doublePct: number;
  freePct: number;
  starPct: number;
  boxPct: number;
  /** Lignes de description (bénéfices acquis). */
  perks: string[];
  /** Bénéfice du prochain niveau (null au maximum). */
  next: { level: number; gains: string[] } | null;
  description: string;
}

const pct = (x: number) => Math.round(x * 1000) / 10;

function perksOf(coll: CollectionId, level: number): string[] {
  const i = lvIdx(level);
  const out = [`Produit jusqu'à : ${itemName({ c: coll, l: maxProduced(coll, level) })}`];
  if (G.doubleChance[i] > 0) out.push(`Production double : ${pct(G.doubleChance[i])} %`);
  if (G.freeChance[i] > 0) out.push(`Toucher gratuit : ${pct(G.freeChance[i])} %`);
  if (G.boxChance[i] > 0) out.push(`Coffret surprise : ${pct(G.boxChance[i])} %`);
  out.push(`Étoile filante : ${pct(G.starChance[i])} %`);
  return out;
}

/** Description complète d'un générateur à un niveau donné (pure : ne lit aucune sauvegarde). */
export function generatorInfo(kind: number, level: number): GenInfo {
  const def = GENERATORS[kind];
  if (!def) throw new Error(`générateur inconnu : ${kind}`);
  const lv = Math.max(1, Math.min(G.maxLevel, Math.floor(level)));
  const i = lvIdx(lv);
  const table = genTable(def.coll, lv).map((r) => ({ l: r.l, name: itemName({ c: def.coll, l: r.l }), pct: pct(r.p) }));
  let next: GenInfo['next'] = null;
  if (lv < G.maxLevel) {
    const gains: string[] = [];
    const a = maxProduced(def.coll, lv);
    const b = maxProduced(def.coll, lv + 1);
    if (b > a) gains.push(`Nouvel objet possible : ${itemName({ c: def.coll, l: b })}`);
    gains.push('Plus de gros objets à chaque toucher');
    if (G.doubleChance[i + 1] > G.doubleChance[i]) gains.push(`Production double : ${pct(G.doubleChance[i + 1])} %`);
    if (G.freeChance[i + 1] > G.freeChance[i]) gains.push(`Toucher gratuit : ${pct(G.freeChance[i + 1])} %`);
    if (G.boxChance[i + 1] > G.boxChance[i]) gains.push(`Coffret surprise : ${pct(G.boxChance[i + 1])} %`);
    next = { level: lv + 1, gains };
  }
  return {
    kind, coll: def.coll, name: def.name, level: lv, maxLevel: G.maxLevel, table,
    maxProduced: table.length,
    doublePct: pct(G.doubleChance[i]), freePct: pct(G.freeChance[i]), starPct: pct(G.starChance[i]), boxPct: pct(G.boxChance[i]),
    perks: perksOf(def.coll, lv), next,
    description: `${def.name} · niveau ${lv}/${G.maxLevel}. ${def.blurb}`,
  };
}

// ------------------------------------------------------------------ production
/** Tirage d'un objet produit (niveau d'objet, ou spécial : Étoile / Coffret). */
export function rollProduction(rng: Rng, coll: CollectionId, level: number): ItemRef {
  const i = lvIdx(level);
  const r = rng.next();
  if (r < G.starChance[i]) return { c: 'special', l: SPECIAL.STAR };
  if (r < G.starChance[i] + G.boxChance[i]) return { c: 'special', l: SPECIAL.BOX };
  const l = rng.weighted(genTable(coll, level).map((x) => [x.l, x.p] as const));
  return { c: coll, l };
}

// ------------------------------------------------------------------ amélioration
export type Cost = Partial<Record<ResKind, number>>;

/** Coût d'amélioration du niveau `level` vers `level + 1` (null au maximum), avec rabais de maîtrise. */
export function upgradeCost(kind: number, level: number, rank = 0): Cost | null {
  const coll = collOfKind(kind);
  if (!coll || level >= G.maxLevel) return null;
  const i = lvIdx(level);
  const disc = 1 - Math.min(0.3, rank * G.rankDiscount);
  const mat = GEN_MAT[coll];
  const out: Cost = { coins: Math.round(G.costCoins[i] * disc) };
  if (mat) { if (G.costMat[i] > 0) out[mat] = Math.max(1, Math.round(G.costMat[i] * disc)); }
  else out.coins = (out.coins ?? 0) + Math.round(G.costMat[i] * 12 * disc);
  return out;
}

export interface WalletLike { res: Record<ResKind, number> }
export interface UpgradeResult { ok: boolean; reason?: 'max' | 'poor' | 'locked'; level: number; cost: Cost | null }

export const canAfford = (w: WalletLike, c: Cost): boolean => (Object.entries(c) as [ResKind, number][]).every(([k, n]) => (w.res[k] ?? 0) >= n);

/** Améliore le générateur `kind` en payant avec les ressources du monde (jamais de diamants). */
export function upgradeGenerator(fun: FunState, kind: number, w: WalletLike): UpgradeResult {
  const coll = collOfKind(kind);
  if (!coll) return { ok: false, reason: 'locked', level: 1, cost: null };
  const st = genState(fun, coll);
  const cost = upgradeCost(kind, st.level, st.rank);
  if (!cost) return { ok: false, reason: 'max', level: st.level, cost: null };
  if (!canAfford(w, cost)) return { ok: false, reason: 'poor', level: st.level, cost };
  for (const [k, n] of Object.entries(cost) as [ResKind, number][]) w.res[k] = Math.max(0, (w.res[k] ?? 0) - n);
  fun.endless2.gens[genKey(coll)] = { level: st.level + 1, xp: st.xp };
  return { ok: true, level: st.level + 1, cost };
}

/** Pratique : niveau d'un générateur d'après son kind. */
export const kindLevel = (fun: FunState, kind: number): number => { const c = collOfKind(kind); return c ? genLevel(fun, c) : 1; };
export { genKindOf };
