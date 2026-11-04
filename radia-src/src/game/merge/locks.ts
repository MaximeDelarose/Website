/**
 * Cases verrouillées du plateau Endless (logique pure, sans DOM, testée dans tests/endless-locks.test.ts).
 *
 * Esprit « découverte progressive » : le plateau est découpé en ZONES. La zone 0 est ouverte dès le début ; les
 * suivantes sont d'abord ensablées, puis se développent au rythme de la progression (commandes livrées, collections
 * complétées, lieux rénovés). À l'intérieur des zones ouvertes, des SURPRISES visibles sont posées : objet sous toile
 * d'araignée, coffre derrière une toile, récompense spéciale (diamants, énergie, fragment de tenue, décoration exclusive,
 * objet rare), case ensablée, cadenas doux.
 *
 * Voies de libération (toujours au moins deux, dont l'énergie gagnée en jouant, jamais de paiement réel) :
 *  1. fusionner à côté un objet COMPATIBLE (toile / coffre / récompense), n'importe quelle fusion à côté (sable) ;
 *  2. livrer une commande (libère 1 case, 2 pour une commande difficile) ;
 *  3. dépenser un peu d'énergie (prix affiché, ≤ plancher d'énergie : toujours abordable) ;
 *  4. un objectif de progression (zone atteinte, cadenas : N fusions).
 * La progression des zones est durable (`fun.endless2.board`) : une nouvelle partie reprend les zones développées et ne
 * pose que de NOUVELLES surprises. Garantie : au moins `36 − maxLocked` (16) cases ouvertes à tout moment.
 */
import { COLLECTIONS, collMax, type CollectionId, type ItemColl, type ItemRef, type Rarity } from '../../data/items';
import type { BoardProgress, FunState } from '../../save/fun';
import { Rng } from '../../utils/rng';
import { ENDLESS_CFG as EC } from '../endless/config';
import { BOARD_H, BOARD_SIZE, BOARD_W, type BoardEvent, type Cell, type CellLock, type LockKind, type Loot, type LockNeed, type UnlockHow } from './types';

const B = EC.board;

/** Zone de chaque case (0 = ouverte au départ). Index = y × 6 + x. */
export const ZONE_OF: number[] = [
  3, 2, 1, 1, 2, 3,
  2, 0, 0, 0, 0, 2,
  0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0,
];
export const MAX_ZONE = 3;
/** Cases où les générateurs sont posés : jamais verrouillées. */
const PROTECTED = new Set<number>([32, 33, 30, 35, 24, 29, 31, 34]);

const neigh = (i: number): number[] => {
  const x = i % BOARD_W;
  const y = Math.floor(i / BOARD_W);
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < BOARD_W - 1) out.push(i + 1);
  if (y > 0) out.push(i - BOARD_W);
  if (y < BOARD_H - 1) out.push(i + BOARD_W);
  return out;
};

// ------------------------------------------------------------------ progression durable

export function boardOf(fun: FunState): BoardProgress {
  return (fun.endless2.board ??= { zone: 0, serial: 0, opened: {}, claimed: [] });
}

/** Points de progression du plateau = palier (commandes + chaînes) + bonus par lieu rénové. */
export function boardPoints(fun: FunState): number {
  const c = fun.endless2.counters;
  const tier = (c.orders ?? 0) + EC.unlock.chainBonus * (c.chains ?? 0);
  let places = 0;
  for (const p of Object.values(fun.places ?? {})) if (p && (p.done || p.stage >= 4)) places++;
  return tier + B.placeBonus * places;
}

/** Zone que la progression permet d'atteindre. */
export function zoneFor(fun: FunState): number {
  const p = boardPoints(fun);
  let z = 0;
  for (let k = 1; k <= MAX_ZONE; k++) if (p >= B.zoneAt[k]) z = k;
  return z;
}

/** Prochaine zone : points manquants (null si tout est développé). */
export function nextZone(fun: FunState): { zone: number; need: number; have: number } | null {
  const z = boardOf(fun).zone;
  if (z >= MAX_ZONE) return null;
  return { zone: z + 1, need: B.zoneAt[z + 1], have: boardPoints(fun) };
}

// ------------------------------------------------------------------ requêtes

export const isLocked = (c: Cell | undefined): boolean => !!c?.lock;
export const lockedCount = (cells: Cell[]): number => cells.reduce((a, c) => a + (c.lock ? 1 : 0), 0);
/** Cases ouvertes (non verrouillées), vides ou non. La garantie « au moins 14 cases libres » porte sur cette valeur. */
export const openCount = (cells: Cell[]): number => BOARD_SIZE - lockedCount(cells);
export const surpriseCount = (cells: Cell[]): number => cells.reduce((a, c) => a + (c.lock && !c.lock.zone ? 1 : 0), 0);

/** Un sable de zone profonde ne se creuse pas à la fusion (zone ≥ 2 au-delà de la zone atteinte). */
export const isDeep = (l: CellLock, zone: number): boolean => !!l.zone && l.zone > zone + 1;

/** Prix affiché pour libérer une case avec de l'énergie. */
export function lockPrice(kind: LockKind, deep = false): number {
  if (kind === 'sand') return deep ? B.price.deepSand : B.price.sand;
  return B.price[kind] ?? 5;
}

const KIND_NAME: Record<LockKind, string> = { web: 'Objet sous toile', sand: 'Case ensablée', chest: 'Coffre sous toile', reward: 'Récompense sous toile', energy: 'Cadenas doux' };

const REWARD_NAME: Record<string, string> = { diamonds: 'diamants', energy: 'énergie', coins: 'pièces', chest: 'un coffre', fragment: 'fragments de tenue', deco: 'une décoration exclusive', ticket: 'ticket', cloth: 'un vêtement' };

export interface LockView {
  title: string;
  /** « Fusionne un objet Fleurs à côté pour libérer. » */
  objective: string;
  /** Progression éventuelle « 1/2 ». */
  progress?: string;
  /** Ce qu'il y a dessous (affiché AVANT l'obtention). */
  prize: string;
  /** Voies alternatives, une phrase chacune. */
  alt: string[];
  price: number;
  deep: boolean;
}

/** Description lisible d'un verrou (bulle, fiche, panneau d'objet). `s`/`fun` rendent la progression exacte. */
export function describeLock(lock: CellLock, ctx: { merges?: number; zone?: number; fun?: FunState } = {}): LockView {
  const zone = ctx.zone ?? (ctx.fun ? boardOf(ctx.fun).zone : 0);
  const deep = isDeep(lock, zone);
  const need = lock.need;
  let objective = '';
  let progress: string | undefined;
  if (need.t === 'adj') {
    const cn = COLLECTIONS[need.coll as CollectionId]?.name ?? 'objets';
    objective = need.minLevel <= 2 ? `Fusionne deux objets « ${cn} » à côté pour libérer.` : `Fusionne à côté pour obtenir un objet « ${cn} » de niveau ${need.minLevel} ou plus.`;
  } else if (need.t === 'sand') {
    objective = deep ? 'Cette zone s\'ouvrira quand le plateau se développera.' : `Fusionne ${need.left > 1 ? `${need.left} fois` : 'une fois'} à côté pour dissiper le sable.`;
    progress = deep ? undefined : `${Math.max(0, B.sandHits - need.left)}/${B.sandHits}`;
  } else {
    const done = Math.max(0, Math.min(need.n, (ctx.merges ?? need.base) - need.base));
    objective = `Réalise ${need.n} fusions pour ouvrir le cadenas.`;
    progress = `${done}/${need.n}`;
  }
  let prize = lock.item ? `Dessous : ${COLLECTIONS[lock.item.c as CollectionId]?.items[lock.item.l - 1] ?? 'un objet'}` : '';
  if (lock.reward) prize = `Dessous : ${lock.reward.n > 1 && lock.reward.kind !== 'chest' ? `${lock.reward.n} ` : ''}${REWARD_NAME[lock.reward.kind] ?? lock.reward.kind}`;
  if (!prize) prize = lock.kind === 'sand' ? 'Dessous : de la place en plus' : '';
  const alt = [`Ou libère-la pour ${lock.price} ⚡`, 'Ou livre une commande'];
  if (deep) alt.unshift('Ou fais avancer ton plateau : commandes livrées, lieux rénovés');
  return { title: KIND_NAME[lock.kind], objective, progress, prize, alt, price: lock.price, deep };
}

/** Voies de libération réellement accessibles avec les générateurs actifs (test « aucune récompense impossible »). */
export function unlockRoutes(lock: CellLock, active: readonly ItemColl[], zone: number): string[] {
  const out: string[] = [];
  if (lock.price > 0 && lock.price <= EC.energy.floorLevel) out.push('energy');
  out.push('order');
  const n = lock.need;
  if (n.t === 'adj' && active.includes(n.coll) && n.minLevel <= collMax(n.coll) - 1 && n.minLevel >= 2) out.push('merge');
  if (n.t === 'sand') { out.push(isDeep(lock, zone) ? 'zone' : 'merge'); if (lock.zone) out.push('zone'); }
  if (n.t === 'goal') out.push('goal');
  return out;
}

// ------------------------------------------------------------------ génération des surprises

const rareLevel = (coll: ItemColl, rng: Rng): number => Math.min(collMax(coll) - 1, 5 + rng.int(2));

function webItem(rng: Rng, active: CollectionId[], rare: boolean): { item: ItemRef; need: LockNeed; rarity?: Rarity } {
  const coll = rng.pick(active);
  const lv = rare ? rareLevel(coll, rng) : Math.min(collMax(coll) - 1, 2 + rng.int(3));
  const minLevel = Math.min(collMax(coll) - 1, rare ? 3 : 2 + (rng.next() < 0.3 ? 1 : 0));
  return { item: { c: coll, l: lv }, need: { t: 'adj', coll, minLevel }, ...(rare ? { rarity: (rng.next() < 0.3 ? 'epic' : 'rare') as Rarity } : {}) };
}

function loot(kind: Loot['kind'], rng: Rng, key: string, rarity: Rarity = 'rare'): Loot {
  const [a, b] = B.rewards[key] ?? [1, 1];
  return { kind, n: a + rng.int(b - a + 1), rarity };
}

/** Une surprise de type donné (`kind` : 'web' | 'chest' | 'reward' | 'sand' | 'energy' ; `variant` précise le contenu). */
export function makeLock(rng: Rng, active: CollectionId[], variant: SurpriseVariant, base = 0, allowDeco = true): CellLock {
  const coll = rng.pick(active);
  const adj = (minLevel = 2): LockNeed => ({ t: 'adj', coll, minLevel: Math.min(collMax(coll) - 1, minLevel) });
  switch (variant) {
    case 'webItem': { const w = webItem(rng, active, false); return { kind: 'web', need: w.need, price: lockPrice('web'), item: w.item }; }
    case 'webRare': { const w = webItem(rng, active, true); return { kind: 'web', need: w.need, price: lockPrice('web') + 1, item: w.item, rarity: w.rarity }; }
    case 'chest': return { kind: 'chest', need: adj(2), price: lockPrice('chest'), reward: { kind: 'chest', n: 1, rarity: 'rare' }, rarity: 'rare' };
    case 'diamonds': return { kind: 'reward', need: adj(2), price: lockPrice('reward'), reward: loot('diamonds', rng, 'diamonds'), rarity: 'rare' };
    case 'energy': return { kind: 'reward', need: adj(2), price: lockPrice('reward'), reward: loot('energy', rng, 'energy', 'uncommon'), rarity: 'uncommon' };
    case 'fragment': return { kind: 'reward', need: adj(3), price: lockPrice('reward'), reward: loot('fragment', rng, 'fragments', 'epic'), rarity: 'epic' };
    case 'deco': return allowDeco
      ? { kind: 'reward', need: adj(3), price: lockPrice('reward') + 1, reward: { kind: 'deco', n: 1, rarity: 'epic', seed: rng.int(1 << 20) }, rarity: 'epic' }
      : { kind: 'reward', need: adj(3), price: lockPrice('reward'), reward: loot('fragment', rng, 'fragments', 'epic'), rarity: 'epic' };
    case 'sandDiamonds': return { kind: 'sand', need: { t: 'sand', left: B.sandHits }, price: lockPrice('sand'), reward: loot('diamonds', rng, 'diamonds', 'rare'), rarity: 'rare' };
    case 'sandCoins': return { kind: 'sand', need: { t: 'sand', left: B.sandHits }, price: lockPrice('sand'), reward: loot('coins', rng, 'coins', 'uncommon') };
    case 'padlock': { const w = webItem(rng, active, false); return { kind: 'energy', need: { t: 'goal', n: B.goalMerges, base }, price: lockPrice('energy'), item: w.item }; }
  }
}
export type SurpriseVariant = 'webItem' | 'webRare' | 'chest' | 'diamonds' | 'energy' | 'fragment' | 'deco' | 'sandDiamonds' | 'sandCoins' | 'padlock';

/** Mélange d'une série de surprises (stable pour une graine) : toujours des toiles, un coffre, une récompense spéciale. */
export function surprisePlan(rng: Rng, n: number, serial: number): SurpriseVariant[] {
  const plan: SurpriseVariant[] = ['webItem', 'chest'];
  const specials: SurpriseVariant[] = ['diamonds', 'energy', 'fragment'];
  if (serial % 3 === 1) specials.push('deco');
  plan.push(rng.pick(specials));
  if (n >= 4) plan.push(rng.next() < 0.6 ? 'sandDiamonds' : 'sandCoins');
  if (n >= 5) plan.push('padlock');
  if (n >= 6) plan.push('webRare');
  while (plan.length < n) plan.push(rng.next() < 0.6 ? 'webItem' : rng.pick(specials));
  return plan.slice(0, n);
}

/** Cases où une surprise peut apparaître : zone ouverte, hors générateurs et rangées du bas, vides, non verrouillées. */
export function surpriseSpots(cells: Cell[], zone: number, emptyOnly = true): number[] {
  const out: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (PROTECTED.has(i) || ZONE_OF[i] > zone || Math.floor(i / BOARD_W) > 3) continue;
    const c = cells[i];
    if (c.lock || c.gift) continue;
    if (emptyOnly && c.item) continue;
    out.push(i);
  }
  return out;
}

/**
 * Pose le plateau d'une partie neuve : zones non développées ensablées + série de surprises NOUVELLES
 * (graine = série durable). Renvoie le nombre de surprises posées.
 */
export function layoutBoard(cells: Cell[], fun: FunState, active: CollectionId[], seed: number): number {
  const b = boardOf(fun);
  b.zone = Math.max(b.zone, zoneFor(fun));
  b.serial++;
  for (let i = 0; i < BOARD_SIZE; i++) {
    const z = ZONE_OF[i];
    if (z > b.zone && !cells[i].item && !PROTECTED.has(i)) cells[i].lock = sandLock(z, b.zone);
  }
  const rng = new Rng((seed ^ Math.imul(b.serial, 0x9e3779b1)) >>> 0);
  const n = Math.min(B.surprisesMax, B.surprisesBase + b.zone);
  const plan = surprisePlan(rng, n, b.serial);
  const spots = surpriseSpots(cells, b.zone);
  for (let k = spots.length - 1; k > 0; k--) { const j = rng.int(k + 1); [spots[k], spots[j]] = [spots[j], spots[k]]; }
  let placed = 0;
  for (const v of plan) {
    if (!spots.length || lockedCount(cells) >= B.maxLocked) break;
    const i = spots.pop()!;
    cells[i].lock = makeLock(rng, active, v);
    placed++;
  }
  return placed;
}

export function sandLock(zone: number, current: number): CellLock {
  const deep = zone > current + 1;
  return { kind: 'sand', need: { t: 'sand', left: B.sandHits }, price: lockPrice('sand', deep), zone };
}

// ------------------------------------------------------------------ libération

export interface UnlockHooks {
  /** Découverte d'album d'un objet révélé (événements `discover`). */
  noteItem(item: ItemRef): BoardEvent[];
  /** Règle les gains gérés par le moteur (coffres, tickets, fragments) et renvoie le butin final. */
  settle(loots: Loot[]): Loot[];
  chestPending(): number;
}

/** Libère la case `i` : toile / sable disparaissent, l'objet ou la récompense apparaît. */
export function releaseCell(cells: Cell[], i: number, how: UnlockHow, fun: FunState, hooks: UnlockHooks): BoardEvent[] {
  const c = cells[i];
  const lock = c?.lock;
  if (!lock) return [];
  c.lock = undefined;
  const ev: BoardEvent[] = [];
  const reward = lock.reward ? hooks.settle([lock.reward]) : [];
  if (lock.item) c.item = { ...lock.item };
  ev.push({ t: 'cellUnlock', at: i, kind: lock.kind, how, ...(lock.item ? { item: { ...lock.item } } : {}), ...(lock.rarity ? { rarity: lock.rarity } : {}), reward });
  if (lock.item) ev.push(...hooks.noteItem(lock.item));
  if (lock.reward?.kind === 'chest') ev.push({ t: 'chest', pending: hooks.chestPending(), source: 'lock' });
  const b = boardOf(fun);
  b.opened[lock.kind] = (b.opened[lock.kind] ?? 0) + 1;
  b.opened[`how:${how}`] = (b.opened[`how:${how}`] ?? 0) + 1;
  fun.endless2.counters.cellsOpened = (fun.endless2.counters.cellsOpened ?? 0) + 1;
  return ev;
}

/** Verrous touchés par une fusion (cases voisines de `from` et de `to`) et leur effet. */
export function mergeUnlocks(cells: Cell[], fun: FunState, from: number, to: number, result: ItemRef, hooks: UnlockHooks): BoardEvent[] {
  const seen = new Set<number>();
  const ev: BoardEvent[] = [];
  const zone = boardOf(fun).zone;
  for (const i of [...neigh(to), ...neigh(from)]) {
    if (seen.has(i)) continue;
    seen.add(i);
    const l = cells[i].lock;
    if (!l) continue;
    const n = l.need;
    if (n.t === 'adj') {
      if (result.c === n.coll && result.l >= n.minLevel) ev.push(...releaseCell(cells, i, 'merge', fun, hooks));
    } else if (n.t === 'sand') {
      if (isDeep(l, zone)) continue;
      n.left--;
      if (n.left <= 0) ev.push(...releaseCell(cells, i, 'merge', fun, hooks));
      else ev.push({ t: 'lockHit', at: i, left: n.left });
    }
  }
  return ev;
}

/**
 * Verrous à libérer par une livraison : d'abord ceux qui cachent un objet ou une récompense, puis les cases ensablées
 * ordinaires, enfin le sable de zone accessible.
 */
export function orderUnlocks(cells: Cell[], fun: FunState, count: number, rng: Rng, hooks: UnlockHooks): BoardEvent[] {
  const zone = boardOf(fun).zone;
  const ev: BoardEvent[] = [];
  for (let k = 0; k < count; k++) {
    const rich: number[] = [];
    const plain: number[] = [];
    const terrain: number[] = [];
    cells.forEach((c, i) => {
      const l = c.lock;
      if (!l) return;
      if (l.item || l.reward) rich.push(i);
      else if (!l.zone) plain.push(i);
      else if (!isDeep(l, zone)) terrain.push(i);
    });
    const pool = rich.length ? rich : plain.length ? plain : terrain;
    if (!pool.length) break;
    ev.push(...releaseCell(cells, pool[rng.int(pool.length)], 'order', fun, hooks));
  }
  return ev;
}

/** Libère par énergie (le paiement est fait par l'appelant). Faux si la case n'est pas verrouillée. */
export const canBuy = (cells: Cell[], i: number): boolean => !!cells[i]?.lock;

/**
 * Avancement automatique après chaque action : nouvelle zone, cadenas dont l'objectif est atteint,
 * verrous dont la collection n'est plus produite (ils sont réorientés vers une collection active).
 */
export function boardTick(cells: Cell[], fun: FunState, merges: number, active: CollectionId[], hooks: UnlockHooks): BoardEvent[] {
  const ev: BoardEvent[] = [];
  const b = boardOf(fun);
  const z = zoneFor(fun);
  if (z > b.zone) {
    b.zone = z;
    const freed: number[] = [];
    cells.forEach((c, i) => { if (c.lock?.zone && c.lock.zone <= z) freed.push(i); });
    for (const i of freed) ev.push(...releaseCell(cells, i, 'zone', fun, hooks));
    ev.push({ t: 'zone', zone: z, cells: freed });
  }
  cells.forEach((c, i) => {
    const l = c.lock;
    if (!l) return;
    if (l.need.t === 'goal' && merges - l.need.base >= l.need.n) { ev.push(...releaseCell(cells, i, 'goal', fun, hooks)); return; }
    if (l.zone) l.price = lockPrice('sand', l.zone > b.zone + 1);
    if (l.need.t === 'adj' && active.length && !active.includes(l.need.coll)) {
      const nc = active[i % active.length];
      l.need = { t: 'adj', coll: nc, minLevel: Math.min(l.need.minLevel, collMax(nc) - 1) };
    }
  });
  return ev;
}

/** Surprise supplémentaire pendant la partie (sur une case vide hors générateurs), si la place le permet. */
export function addSurprise(cells: Cell[], fun: FunState, active: CollectionId[], rng: Rng, base: number): number {
  const b = boardOf(fun);
  if (surpriseCount(cells) >= B.maxSurprises || lockedCount(cells) >= B.maxLocked - 2 || !active.length) return -1;
  const spots = surpriseSpots(cells, b.zone);
  if (!spots.length) return -1;
  const i = spots[rng.int(spots.length)];
  const variants: SurpriseVariant[] = ['webItem', 'webItem', 'chest', 'diamonds', 'energy', 'sandCoins', 'padlock'];
  cells[i].lock = makeLock(rng, active, rng.pick(variants), base, false);
  return i;
}

// ------------------------------------------------------------------ sanitisation (sauvegardes)

const KINDS: readonly LockKind[] = ['web', 'sand', 'chest', 'reward', 'energy'];
const RARS: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const REWARD_KINDS = ['diamonds', 'energy', 'coins', 'chest', 'fragment', 'deco', 'ticket', 'cloth'];
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clampInt = (v: unknown, lo: number, hi: number, d: number): number => (finite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d);

function validRef(v: unknown): ItemRef | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as { c?: unknown; l?: unknown };
  if (typeof r.c !== 'string' || !(r.c in COLLECTIONS) || !finite(r.l)) return null;
  const l = Math.floor(r.l);
  return l >= 1 && l <= collMax(r.c as ItemColl) ? { c: r.c as ItemColl, l } : null;
}

/** Nettoie un verrou venu d'une sauvegarde ; `null` si invalide (la case redevient simplement libre). */
export function validLock(v: unknown): CellLock | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!KINDS.includes(o.kind as LockKind)) return null;
  const kind = o.kind as LockKind;
  const nd = o.need as Record<string, unknown> | undefined;
  let need: LockNeed;
  if (nd && nd.t === 'adj' && typeof nd.coll === 'string' && nd.coll in COLLECTIONS) {
    need = { t: 'adj', coll: nd.coll as CollectionId, minLevel: clampInt(nd.minLevel, 2, collMax(nd.coll as CollectionId), 2) };
  } else if (nd && nd.t === 'goal') need = { t: 'goal', n: clampInt(nd.n, 1, 99, B.goalMerges), base: clampInt(nd.base, 0, 1e9, 0) };
  else if (nd && nd.t === 'sand') need = { t: 'sand', left: clampInt(nd.left, 1, 9, B.sandHits) };
  else need = kind === 'sand' ? { t: 'sand', left: B.sandHits } : { t: 'goal', n: B.goalMerges, base: 0 };
  const out: CellLock = { kind, need, price: clampInt(o.price, 0, 10, lockPrice(kind)) };
  if (finite(o.zone) && o.zone >= 1) out.zone = clampInt(o.zone, 1, MAX_ZONE, 1);
  const it = validRef(o.item);
  if (it) out.item = it;
  const r = o.reward as Record<string, unknown> | undefined;
  if (r && typeof r.kind === 'string' && REWARD_KINDS.includes(r.kind)) {
    out.reward = { kind: r.kind as Loot['kind'], n: clampInt(r.n, 1, 999, 1), ...(RARS.includes(r.rarity as Rarity) ? { rarity: r.rarity as Rarity } : {}), ...(finite(r.seed) ? { seed: Math.floor(r.seed) } : {}) };
  }
  if (RARS.includes(o.rarity as Rarity)) out.rarity = o.rarity as Rarity;
  return out;
}

/** Après lecture d'une sauvegarde : jamais plus de `maxLocked` cases verrouillées (les surplus sont libérés). */
export function capLocks(cells: Cell[]): void {
  let n = lockedCount(cells);
  for (let i = BOARD_SIZE - 1; i >= 0 && n > B.maxLocked; i--) if (cells[i].lock) { cells[i].lock = undefined; n--; }
  // une case verrouillée ne peut pas contenir un objet vivant (conflit de sauvegarde) : le verrou cède
  for (const c of cells) if (c.lock && (c.item || c.gift)) c.lock = undefined;
}

/**
 * Ancienne partie (sans plateau à verrous) : on garde TOUT ouvert (les zones sont considérées développées pour cette
 * partie) et on ajoute quelques surprises seulement sur des cases vides.
 */
export function migrateBoard(cells: Cell[], fun: FunState, active: CollectionId[], seed: number): number {
  const b = boardOf(fun);
  b.zone = MAX_ZONE;
  b.serial++;
  const rng = new Rng((seed ^ Math.imul(b.serial, 0x85ebca6b)) >>> 0);
  const empty = cells.filter((c) => !c.item && !c.gift).length;
  if (empty < 22) return 0;
  const plan = surprisePlan(rng, 3, b.serial);
  const spots = surpriseSpots(cells, MAX_ZONE);
  let placed = 0;
  for (const v of plan) {
    if (!spots.length) break;
    const i = spots.splice(rng.int(spots.length), 1)[0];
    cells[i].lock = makeLock(rng, active, v);
    placed++;
  }
  return placed;
}
