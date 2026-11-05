/**
 * Règles du jeu de fusion — sans rendu, sans DOM, entièrement testable.
 * Toutes les actions prennent l'état, le modifient et renvoient la liste des
 * événements à animer. Une action invalide ne modifie jamais l'état.
 */
import { serve } from '../customers/logic';
import { SPECIAL, collMax, itemKey, mergePoints, sameItem, GENERATORS, genKindOf, type CollectionId, type ItemRef } from '../../data/items';
import { Rng, hashString } from '../../utils/rng';
import {
  BOARD_H, BOARD_SIZE, BOARD_W, COMBO_WINDOW_MS,
  type BoardEvent, type Cell, type LevelDef, type Loot, type Objective, type OrderState, type OrderTier, type RunState, type Tuple,
} from './types';
import { ENDLESS_CFG as EC } from '../endless/config';
import { advance, bump, counter, endlessFun, subRng } from '../endless/ctx';
import { addGenXp, genLevel, rollProduction } from '../endless/generators';
import { grantReplaceOnDelivery, grantReplaces, makeOrder, orderReward as makeOrderReward, progressOf, tickActive, tierOfSlot } from '../endless/orders';
import { activeColls, palier, unlockedColls } from '../endless/unlocks';
import { addTreasure, pendingChests, settleLoot, treasurePoints as treasurePts } from '../endless/treasure';
import { isAuto, rollDrop } from '../endless/drops';
import { discover as albumDiscover } from '../endless/album';
import { onEngineEvent, syncSecondary } from '../endless/secondary';
import { orderGain } from '../world/fusionRewards';
import { addSurprise, boardOf, boardTick, layoutBoard, mergeUnlocks, migrateBoard, orderUnlocks, releaseCell, type UnlockHooks } from './locks';

const ref = (t: Tuple): ItemRef => ({ c: t[0], l: t[1] });
const isSpecial = (r: ItemRef | null) => !!r && (r.c === 'special' || r.c === 'gen');
const isGenItem = (r: ItemRef | null | undefined) => !!r && r.c === 'gen';

/** Chance qu'un générateur offre un objet rare (Coffret surprise). */
export const RARE_CHANCE = 0.025;

export const idx = (x: number, y: number) => y * BOARD_W + x;
export const xy = (i: number) => ({ x: i % BOARD_W, y: Math.floor(i / BOARD_W) });

export function neighbors(i: number): number[] {
  const { x, y } = xy(i);
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < BOARD_W - 1) out.push(i + 1);
  if (y > 0) out.push(i - BOARD_W);
  if (y < BOARD_H - 1) out.push(i + BOARD_W);
  return out;
}

// ---------------------------------------------------------------- création

export function createRun(def: LevelDef, mode: 'story' | 'endless' = 'story', seed?: number): RunState {
  const cells: Cell[] = Array.from({ length: BOARD_SIZE }, () => ({ item: null, gift: null }));
  for (const p of def.start ?? []) cells[idx(p.x, p.y)].item = { c: p.c, l: p.l };
  for (const g of def.gifts ?? []) { const c = cells[idx(g.x, g.y)]; c.item = null; c.gift = { c: g.c, l: g.l }; }
  if (mode === 'endless') syncSecondary(endlessFun());
  const colls = mode === 'endless' ? endlessColls() : levelColls(def);
  for (const c of colls) placeGenerator(cells, genKindOf(c));
  const s: RunState = {
    mode,
    levelId: def.id,
    cells,
    rng: seed ?? hashString(`radia-level-${def.id}`),
    score: 0,
    taps: 0,
    merges: 0,
    combo: 0,
    bestCombo: 0,
    lastMergeAt: -Infinity,
    created: {},
    orders: [],
    orderCursor: 0,
    ordersDone: 0,
    hearts: 0,
    wandsEarned: 0,
    won: false,
    challenge: null,
    challengesDone: 0,
    orderSerial: 0,
  };
  if (mode === 'endless') { layoutBoard(cells, endlessFun(), endlessColls(), s.rng); s.board = { v: 1 }; }
  const visible = def.ordersVisible ?? 2;
  for (let k = 0; k < visible; k++) s.orders.push(null);
  for (let k = 0; k < visible; k++) fillOrder(s, def, k);
  if (mode === 'endless') { s.challenge = makeChallenge(s); refreshProgress(s); noteUnlocks(s); }
  return s;
}

/** Copie profonde (sauvegarde / annulation). */
export const cloneRun = (s: RunState): RunState => JSON.parse(JSON.stringify({ ...s, lastMergeAt: 0 })) as RunState;

// ------------------------------------------------------------- commandes

function fillOrder(s: RunState, def: LevelDef, slot: number): boolean {
  if (s.mode === 'endless') {
    s.orders[slot] = makeEndlessOrder(s, slot);
    return true;
  }
  const list = def.orders ?? [];
  if (s.orderCursor >= list.length) { s.orders[slot] = null; return false; }
  s.orders[slot] = { items: list[s.orderCursor].map(ref), id: s.orderSerial++ };
  s.orderCursor++;
  return true;
}

/** Cases qui satisferaient la commande (ou null si elle n'est pas prête). */
export function orderCells(s: RunState, slot: number): number[] | null {
  const o = s.orders[slot];
  if (!o) return null;
  const used = new Set<number>();
  const out: number[] = [];
  for (const want of o.items) {
    let found = -1;
    // on prend de préférence l'objet le plus bas sur le plateau (près du panier)
    for (let i = BOARD_SIZE - 1; i >= 0; i--) {
      if (used.has(i)) continue;
      if (sameItem(s.cells[i].item, want)) { found = i; break; }
    }
    if (found < 0) return null;
    used.add(found);
    out.push(found);
  }
  return out;
}

export const orderHearts = (o: OrderState) => o.reward?.hearts ?? o.items.reduce((a, r) => a + r.l, 0) + 2;
export const orderPoints = (o: OrderState) => o.items.reduce((a, r) => a + mergePoints(r.l) * 2, 0);

/** Livre une commande dont les objets sont sur le plateau. `now` (ms) sert au temps de jeu actif. */
export function deliver(s: RunState, def: LevelDef, slot: number, now?: number): BoardEvent[] {
  if (s.won && s.mode === 'story') return [];
  const o = s.orders[slot];
  const cells = orderCells(s, slot);
  if (!o || !cells) return [];
  for (const i of cells) s.cells[i].item = null;
  return completeOrder(s, def, slot, o, cells, false, now);
}

function completeOrder(s: RunState, def: LevelDef, slot: number, o: OrderState, cells: number[], forced: boolean, now?: number): BoardEvent[] {
  const ev: BoardEvent[] = s.mode === 'endless' ? touch(s, now) : [];
  const hearts = orderHearts(o);
  const points = orderPoints(o);
  s.hearts += hearts;
  s.score += points;
  s.ordersDone++;
  const d: BoardEvent = { t: 'deliver', slot, cells, hearts, points, items: o.items.map((r) => ({ ...r })) };
  ev.push(d);
  s.orders[slot] = null;
  if (s.mode === 'endless' && o.reward) {
    const fun = endlessFun();
    Object.assign(d, { tier: o.tier, reward: o.reward, gain: orderGain(o.reward), energy: o.reward.energy, forced });
    bump(fun, 'orders');
    bump(fun, `orders:${o.tier ?? 'easy'}`);
    if (o.customer) { // le client remercie aussi quand la commande est terminée avec des diamants
      const sv = serve(fun.customers, o.customer, subRng(s.rng, 0x7a1c), Date.now());
      if (sv) Object.assign(d, { customer: o.customer, loyalty: { n: sv.n, from: sv.levelFrom, to: sv.levelTo }, thanks: sv.thanks.text, story: sv.story });
    }
    ev.push(...gainTreasure(fun, forced ? 0 : o.reward.treasure, 'order'));
    if (!forced) {
      // une livraison libère une ou deux cases verrouillées ; de temps en temps une nouvelle surprise apparaît
      ev.push(...orderUnlocks(s.cells, fun, EC.board.orderFrees[o.tier ?? 'easy'], subRng(s.rng, 0x10c4), unlockHooks(s)));
      if (counter(fun, 'orders') % EC.board.surpriseEveryOrders === 0) {
        const at = addSurprise(s.cells, fun, endlessColls(), subRng(s.rng, 0x5e11), s.merges);
        if (at >= 0) ev.push({ t: 'lockNew', at });
      }
    }
    const g = grantReplaceOnDelivery(fun);
    if (g) ev.push({ t: 'replaceGain', n: g, total: fun.endless2.replaces });
    if (fillOrder(s, def, slot)) ev.push({ t: 'orderNew', slot, tier: (s.orders[slot] as OrderState | null)?.tier });
    ev.push(...secondaryFor(fun, d));
    return ev.concat(afterAction(s, def));
  }
  if (fillOrder(s, def, slot)) ev.push({ t: 'orderNew', slot });
  return ev.concat(afterAction(s, def));
}

// ------------------------------------------------------------- générateurs

/** Collections produites par les générateurs d'un niveau (d'après son panier). */
export function levelColls(def: LevelDef): CollectionId[] {
  const out: CollectionId[] = [];
  for (const [c, , w] of def.gen) if (c !== 'special' && c !== 'gen' && w > 0 && !out.includes(c)) out.push(c);
  return out;
}

const GEN_SPOTS: [number, number][] = [[2, 5], [3, 5], [0, 5], [5, 5], [0, 4], [5, 4], [1, 5], [4, 5]];

function placeGenerator(cells: Cell[], kind: number): number {
  if (cells.some((c) => c.item?.c === 'gen' && c.item.l === kind)) return -1;
  for (const [x, y] of GEN_SPOTS) {
    const i = idx(x, y);
    if (!cells[i].item && !cells[i].gift && !cells[i].lock) { cells[i].item = { c: 'gen', l: kind }; return i; }
  }
  for (let i = BOARD_SIZE - 1; i >= 0; i--) if (!cells[i].item && !cells[i].gift && !cells[i].lock) { cells[i].item = { c: 'gen', l: kind }; return i; }
  return -1;
}

/** Ajoute les générateurs manquants (sauvegardes d'avant les générateurs). */
export function ensureGenerators(s: RunState, def: LevelDef): void {
  const colls = s.mode === 'endless' ? endlessColls() : levelColls(def);
  for (const c of colls) placeGenerator(s.cells, genKindOf(c));
  if (s.mode === 'endless') migrateEndless(s, def);
}

/**
 * Migration tolérante d'une partie Endless d'avant 2.0 : paliers de commande, récompenses annoncées,
 * 3 commandes, compteur de commandes livrées (palier de déblocage) repris de la partie en cours.
 */
export function migrateEndless(s: RunState, def: LevelDef = ENDLESS_DEF): void {
  const fun = endlessFun();
  fun.endless2.counters.orders = Math.max(counter(fun, 'orders'), s.ordersDone);
  while (s.orders.length < 3) s.orders.push(null);
  for (let k = 0; k < 3; k++) {
    const o = s.orders[k];
    if (!o) { s.orders[k] = makeEndlessOrder(s, k); continue; }
    if (!o.tier) o.tier = tierOfSlot(k);
    if (!o.reward) o.reward = orderRewardFor(o.items, o.tier);
  }
  syncSecondary(fun);
  noteUnlocks(s, true);
  // ancienne partie sans verrous : tout reste ouvert, quelques surprises sur des cases vides
  if (!s.board) { s.board = { v: 1 }; migrateBoard(s.cells, fun, endlessColls(), s.rng); }
  refreshProgress(s);
  void def;
}

export const generatorCells = (s: RunState) => s.cells.map((c, i) => (isGenItem(c.item) ? i : -1)).filter((i) => i >= 0);

/** Prix en diamants pour terminer une commande tout de suite (accélérer). */
export const rushPrice = (o: OrderState) => Math.max(5, o.items.reduce((a, r) => a + 2 * r.l, 0));

/** Commande terminée sans les objets (payée en diamants). Pas de points de trésor. */
export function forceDeliver(s: RunState, def: LevelDef, slot: number, now?: number): BoardEvent[] {
  if (s.won && s.mode === 'story') return [];
  const o = s.orders[slot];
  if (!o) return [];
  return completeOrder(s, def, slot, o, [], true, now);
}

// ------------------------------------------------------------- panier

/**
 * Case vide où apparaît un nouvel objet : la plus proche de `near` (le
 * générateur touché), sinon du bas du plateau.
 */
export function spawnCell(s: RunState, prefer?: number, near?: number): number {
  if (prefer !== undefined && isFree(s.cells[prefer])) return prefer;
  let best = -1;
  let bestD = Infinity;
  const gx = near !== undefined ? xy(near).x : (BOARD_W - 1) / 2;
  const gy = near !== undefined ? xy(near).y : BOARD_H + 0.6;
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (!isFree(s.cells[i])) continue;
    const { x, y } = xy(i);
    const d = (x - gx) ** 2 + (y - gy) ** 2 * 1.15;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

const isFree = (c: Cell) => !c.item && !c.gift && !c.lock;
export const emptyCount = (s: RunState) => s.cells.filter(isFree).length;

/**
 * Tirage d'un objet. Avec `coll`, seul le générateur de cette collection produit : ses objets + sa part
 * des objets spéciaux + une petite chance d'objet rare. En mode infini, la table dépend du NIVEAU du
 * générateur (fun.endless2.gens) — voir src/game/endless/generators.ts.
 */
export function rollGen(s: RunState, def: LevelDef, coll?: CollectionId): ItemRef {
  const rng = new Rng(s.rng);
  if (s.mode === 'endless') {
    const fun = endlessFun();
    const c = coll ?? rng.pick(activeColls(fun));
    const it = rollProduction(rng, c, genLevel(fun, c));
    s.rng = rng.state;
    return it;
  }
  let pool = def.gen;
  if (coll) {
    const mine = pool.filter(([c]) => c === coll);
    const total = pool.filter(([c]) => c !== 'special').reduce((a, [, , w]) => a + w, 0) || 1;
    const share = mine.reduce((a, [, , w]) => a + w, 0) / total;
    const specials = pool.filter(([c]) => c === 'special').map(([c, l, w]) => [c, l, w * share] as [ItemRef['c'], number, number]);
    const sum = mine.reduce((a, [, , w]) => a + w, 0) + specials.reduce((a, [, , w]) => a + w, 0);
    pool = mine.length ? [...mine, ...specials, ['special', SPECIAL.BOX, sum * RARE_CHANCE]] : pool;
  }
  const pick = rng.weighted(pool.map(([c, l, w]) => [{ c, l } as ItemRef, w] as const));
  s.rng = rng.state;
  return { c: pick.c, l: pick.l };
}

/**
 * Énergie à dépenser pour toucher ce générateur : 1, ou 0 si le toucher est GRATUIT (un toucher sur N
 * et chance liée au niveau du générateur). À appeler AVANT de dépenser l'énergie ; tapGenerator utilise
 * la même règle (`spawn.free`). Déterministe : ne consomme rien.
 */
export function tapCost(s: RunState, gen?: number): number {
  if (s.mode !== 'endless') return 1;
  const g = gen ?? generatorCells(s)[0];
  const it = g !== undefined ? s.cells[g]?.item : null;
  const coll = it && isGenItem(it) ? GENERATORS[it.l]?.coll : undefined;
  if ((s.taps + 1) % EC.energy.freeTapEvery === 0) return 0;
  const ch = coll ? EC.gens.freeChance[genLevel(endlessFun(), coll) - 1] ?? 0 : 0;
  if (ch > 0 && new Rng((s.rng ^ 0xf4ee) >>> 0).next() < ch) return 0;
  return EC.energy.tapCost;
}

/**
 * Toucher un générateur (case `gen`). Sans `gen`, on prend le premier générateur du plateau (tests,
 * anciennes sauvegardes). `now` (ms, optionnel) alimente le temps de jeu actif (remplacements gratuits).
 */
export function tapGenerator(s: RunState, def: LevelDef, gen?: number, now?: number): BoardEvent[] {
  if (s.won && s.mode === 'story') return [];
  const g = gen ?? generatorCells(s)[0];
  const it = g !== undefined ? s.cells[g]?.item : null;
  const coll = it && isGenItem(it) ? GENERATORS[it.l]?.coll : undefined;
  const endless = s.mode === 'endless';
  const lead: BoardEvent[] = endless ? touch(s, now) : [];
  const at = spawnCell(s, undefined, coll ? g : undefined);
  if (at < 0) return [...lead, { t: 'full' }, ...(endless ? rescueIfStuck(s) : [])];
  const free = endless ? tapCost(s, g) === 0 : false;
  const item = rollGen(s, def, coll);
  s.cells[at].item = item;
  s.taps++;
  const ev: BoardEvent[] = [...lead, { t: 'spawn', at, item, source: 'gen', from: coll ? g : undefined, ...(endless ? { free } : {}) }];
  if (endless) {
    const fun = endlessFun();
    bump(fun, 'taps');
    if (free) bump(fun, 'freeTaps');
    if (coll) {
      addGenXp(fun, coll, EC.gens.xpPerTap);
      // production double (si une case est libre)
      const dbl = EC.gens.doubleChance[genLevel(fun, coll) - 1] ?? 0;
      const r = subRng(s.rng, 0xd0b1e);
      if (dbl > 0 && r.next() < dbl) {
        const at2 = spawnCell(s, undefined, g);
        if (at2 >= 0) {
          const it2 = rollGen(s, def, coll);
          s.cells[at2].item = it2;
          ev.push({ t: 'spawn', at: at2, item: it2, source: 'gen', from: g, double: true });
          ev.push(...noteItem(s, it2));
        }
      }
      s.rng = advance(s.rng);
    }
    ev.push(...noteItem(s, item));
  }
  return ev.concat(afterAction(s, def));
}

/** Retire un objet du plateau pour le ranger dans le sac (pas les générateurs). */
export function stashItem(s: RunState, def: LevelDef, i: number): { item: ItemRef; ev: BoardEvent[] } | null {
  const it = s.cells[i]?.item;
  if (!it || isGenItem(it)) return null;
  s.cells[i].item = null;
  return { item: it, ev: [{ t: 'remove', at: i, points: 0 }, ...afterAction(s, def)] };
}

/** Sort un objet du sac sur le plateau. */
export function placeItem(s: RunState, def: LevelDef, r: ItemRef): BoardEvent[] {
  const at = spawnCell(s);
  if (at < 0) return [{ t: 'full' }];
  s.cells[at].item = { c: r.c, l: r.l };
  return [{ t: 'spawn', at, item: r, source: 'reward' }, ...afterAction(s, def)];
}

// --------------------------------------------------------------- fusion

export function canMerge(a: ItemRef | null, b: ItemRef | null): boolean {
  if (!a || !b) return false;
  if (a.c === 'special' && a.l === SPECIAL.STAR) return b.c !== 'special' && b.c !== 'gen' && b.l < collMax(b.c);
  if (isSpecial(a) || isSpecial(b)) return false;
  return sameItem(a, b) && a.l < collMax(a.c);
}

/**
 * Déplacement d'un objet (glisser-déposer) : vers une case vide → déplacement,
 * sur un objet identique → fusion, sinon → annulé.
 */
export function move(s: RunState, def: LevelDef, from: number, to: number, now: number): BoardEvent[] {
  if (s.won && s.mode === 'story') return [];
  if (s.mode === 'endless') s.clock = s.clock ?? now;
  if (from === to || from < 0 || to < 0 || from >= BOARD_SIZE || to >= BOARD_SIZE) return [];
  const a = s.cells[from];
  const b = s.cells[to];
  if (a.lock || b.lock) return [{ t: 'invalid', from, to, reason: 'locked' }];
  if (!a.item) return [{ t: 'invalid', from, to, reason: 'empty' }];

  if (b.gift) {
    if (a.item.c === 'special' && a.item.l === SPECIAL.KEY) {
      a.item = null;
      return openGift(s, to).concat(afterAction(s, def));
    }
    return [{ t: 'invalid', from, to, reason: 'gift' }];
  }
  if (!b.item) {
    b.item = a.item;
    a.item = null;
    return [{ t: 'move', from, to }, ...afterAction(s, def)];
  }
  if (!canMerge(a.item, b.item)) {
    const reason = sameItem(a.item, b.item) && a.item.l >= collMax(a.item.c) ? 'max' : 'different';
    return [{ t: 'invalid', from, to, reason }];
  }
  const joker = a.item.c === 'special';
  const result: ItemRef = { c: b.item.c, l: b.item.l + 1 };
  a.item = null;
  b.item = result;
  return registerMerge(s, def, from, to, result, now, joker);
}

function registerMerge(s: RunState, def: LevelDef, from: number, to: number, result: ItemRef, now: number, joker = false): BoardEvent[] {
  const endless = s.mode === 'endless';
  const lead: BoardEvent[] = endless ? touch(s, now) : [];
  let base = now - s.lastMergeAt <= COMBO_WINDOW_MS ? s.combo : 0;
  // retombée de combo (Endless) : après le plafond, la fusion suivante repart plus bas
  if (endless && base >= EC.combo.cap) base = EC.combo.fallTo;
  s.combo = base + 1;
  s.lastMergeAt = now;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  s.merges++;
  const key = itemKey(result);
  s.created[key] = (s.created[key] ?? 0) + 1;
  const mult = Math.min(endless ? EC.combo.multMax : 3, 1 + (endless ? EC.combo.multStep : 0.25) * (s.combo - 1));
  const points = Math.round(mergePoints(result.l) * mult);
  s.score += points;
  const ev: BoardEvent[] = [...lead, { t: 'merge', from, to, result, points, combo: s.combo, joker }];

  // Les paquets cadeaux voisins s'ouvrent.
  for (const n of neighbors(to)) if (s.cells[n].gift) ev.push(...openGift(s, n));

  if (endless) {
    ev.push(...mergeUnlocks(s.cells, endlessFun(), from, to, result, unlockHooks(s)));
    ev.push(...comboEndless(s, from, now, mult));
    ev.push(...endlessMergeHooks(s, to, result, ev.slice()));
    return ev.concat(afterAction(s, def));
  }

  // Récompenses de combo (règles explicites, mode histoire) :
  //  ×5 → une Étoile filante apparaît · ×8 → +1 Baguette · ×12 → +15 cœurs
  if (s.combo === 5) {
    const at = spawnCell(s, from);
    if (at >= 0) {
      const star: ItemRef = { c: 'special', l: SPECIAL.STAR };
      s.cells[at].item = star;
      ev.push({ t: 'combo', value: 5, reward: 'star' }, { t: 'spawn', at, item: star, source: 'combo' });
    } else {
      s.hearts += 5;
      ev.push({ t: 'combo', value: 5, reward: 'hearts' });
    }
  } else if (s.combo === 8) {
    s.wandsEarned++;
    ev.push({ t: 'combo', value: 8, reward: 'wand' });
  } else if (s.combo === 12) {
    s.hearts += 15;
    ev.push({ t: 'combo', value: 12, reward: 'hearts' });
  } else if (s.combo >= 2) {
    ev.push({ t: 'combo', value: s.combo });
  }
  return ev.concat(afterAction(s, def));
}

function openGift(s: RunState, i: number): BoardEvent[] {
  const c = s.cells[i];
  if (!c.gift) return [];
  const item = c.gift;
  c.gift = null;
  c.item = item;
  return [{ t: 'giftOpen', at: i, item }];
}

/** Toucher un objet : seul le Coffret surprise réagit (il s'ouvre). */
export function tapItem(s: RunState, def: LevelDef, i: number, now?: number): BoardEvent[] {
  if (s.won && s.mode === 'story') return [];
  const it = s.cells[i]?.item;
  if (!it || it.c !== 'special' || it.l !== SPECIAL.BOX) return [];
  s.cells[i].item = null;
  const ev: BoardEvent[] = [...(s.mode === 'endless' ? touch(s, now) : []), { t: 'boxOpen', at: i }];
  for (let k = 0; k < 3; k++) {
    const at = spawnCell(s, k === 0 ? i : undefined);
    if (at < 0) break;
    const r = rollGen(s, def);
    const item: ItemRef = r.c === 'special' ? r : { c: r.c, l: Math.min(collMax(r.c), r.l + 1) };
    s.cells[at].item = item;
    ev.push({ t: 'spawn', at, item, source: 'box' });
    if (s.mode === 'endless') ev.push(...noteItem(s, item));
  }
  return ev.concat(afterAction(s, def));
}

// --------------------------------------------------------------- bonus

export function useWand(s: RunState, def: LevelDef, i: number, now: number): BoardEvent[] {
  const it = s.cells[i]?.item;
  if (!it || it.c === 'special' || it.c === 'gen' || it.l >= collMax(it.c)) return [];
  const result = { c: it.c, l: it.l + 1 };
  s.cells[i].item = result;
  const key = itemKey(result);
  s.created[key] = (s.created[key] ?? 0) + 1;
  s.score += mergePoints(result.l);
  void now;
  return [{ t: 'upgrade', at: i, item: result }, ...(s.mode === 'endless' ? noteItem(s, result) : []), ...afterAction(s, def)];
}

export function useWind(s: RunState, def: LevelDef, i: number): BoardEvent[] {
  const it = s.cells[i]?.item;
  if (!it || it.c === 'gen') return [];
  s.cells[i].item = null;
  const points = it.c === 'special' ? 5 : Math.round(mergePoints(it.l) / 2);
  s.score += points;
  return [{ t: 'remove', at: i, points }, ...afterAction(s, def)];
}

// ----------------------------------------------------------- blocage

export function hasMergeAvailable(s: RunState): boolean {
  const items = s.cells.map((c) => c.item);
  const giftLeft = s.cells.some((c) => c.gift);
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (!a || a.c === 'gen') continue;
    if (a.c === 'special') {
      if (a.l === SPECIAL.BOX) return true;
      if (a.l === SPECIAL.KEY && giftLeft) return true;
      if (a.l === SPECIAL.STAR && items.some((b, j) => j !== i && canMerge(a, b))) return true;
      continue;
    }
    for (let j = i + 1; j < items.length; j++) if (canMerge(a, items[j])) return true;
  }
  return false;
}

/** Bloqué : plus de place, aucune fusion, aucune commande prête. */
export function isStuck(s: RunState): boolean {
  if (emptyCount(s) > 0) return false;
  if (hasMergeAvailable(s)) return false;
  for (let k = 0; k < s.orders.length; k++) if (orderCells(s, k)) return false;
  return true;
}

/**
 * Souffle magique (récupération gratuite) : retire les 4 objets les moins
 * précieux qui ne servent à aucune commande visible.
 */
export function recover(s: RunState, def: LevelDef): BoardEvent[] {
  const wanted = new Set<string>();
  for (const o of s.orders) if (o) for (const r of o.items) wanted.add(itemKey(r));
  const candidates = s.cells
    .map((c, i) => ({ i, it: c.item }))
    .filter((e): e is { i: number; it: ItemRef } => !!e.it && e.it.c !== 'special' && e.it.c !== 'gen')
    .sort((a, b) => {
      const wa = wanted.has(itemKey(a.it)) ? 1 : 0;
      const wb = wanted.has(itemKey(b.it)) ? 1 : 0;
      return wa - wb || a.it.l - b.it.l || b.i - a.i;
    });
  const ev: BoardEvent[] = [];
  for (const e of candidates.slice(0, 4)) {
    s.cells[e.i].item = null;
    const points = Math.round(mergePoints(e.it.l) / 2);
    s.score += points;
    ev.push({ t: 'remove', at: e.i, points });
  }
  return ev.concat(afterAction(s, def));
}

// --------------------------------------------------------- objectifs

export function objectiveProgress(s: RunState, o: Objective): { cur: number; max: number } {
  switch (o.t) {
    case 'create': {
      const max = o.count ?? 1;
      return { cur: Math.min(max, s.created[itemKey(ref(o.item))] ?? 0), max };
    }
    case 'orders': return { cur: Math.min(o.count, s.ordersDone), max: o.count };
    case 'gifts': {
      const total = Math.max(1, s.cells.length);
      const left = s.cells.filter((c) => c.gift).length;
      void total;
      return { cur: left === 0 ? 1 : 0, max: 1 };
    }
    case 'score': return { cur: Math.min(o.value, s.score), max: o.value };
    case 'merges': return { cur: Math.min(o.count, s.merges), max: o.count };
    case 'combo': return { cur: Math.min(o.value, s.bestCombo), max: o.value };
  }
}

export const objectiveDone = (s: RunState, o: Objective) => {
  const p = objectiveProgress(s, o);
  return p.cur >= p.max;
};

export function afterAction(s: RunState, def: LevelDef): BoardEvent[] {
  const ev: BoardEvent[] = [];
  if (s.mode === 'endless') {
    const fun = endlessFun();
    const act = activeColls(fun);
    // nouvelles collections : générateur posé sur le plateau
    for (const c of act) {
      const at = placeGenerator(s.cells, genKindOf(c));
      if (at >= 0) ev.push({ t: 'spawn', at, item: { c: 'gen', l: genKindOf(c) }, source: 'reward' });
    }
    // générateurs « au repos » (au-delà du maximum posé en même temps)
    for (let i = 0; i < BOARD_SIZE; i++) {
      const it = s.cells[i].item;
      if (it && it.c === 'gen' && !act.includes(GENERATORS[it.l]?.coll)) { s.cells[i].item = null; ev.push({ t: 'remove', at: i, points: 0 }); }
    }
    ev.push(...noteUnlocks(s));
    ev.push(...boardTick(s.cells, fun, s.merges, act, unlockHooks(s)));
    const ch = s.challenge;
    if (ch && challengeDone(s, ch)) {
      s.hearts += ch.reward;
      s.challengesDone = (s.challengesDone ?? 0) + 1;
      ev.push({ t: 'challenge', reward: ch.reward });
      s.challenge = makeChallenge(s);
    }
    // une commande manquante (ancienne sauvegarde) est recréée
    for (let k = 0; k < s.orders.length; k++) if (!s.orders[k]) s.orders[k] = makeEndlessOrder(s, k);
    ev.push(...rescueIfStuck(s));
    refreshProgress(s);
    return ev;
  }
  if (!s.won && def.objectives.every((o) => objectiveDone(s, o))) {
    s.won = true;
    ev.push({ t: 'win' });
  }
  return ev;
}

export function stars(s: RunState, def: LevelDef): number {
  if (s.taps <= def.par) return 3;
  if (s.taps <= Math.ceil(def.par * 1.4)) return 2;
  return 1;
}

// ------------------------------------------------------- mode infini

/** « Palier » de progression (0..9) d'après les collections débloquées (voir endless/unlocks.ts). */
export function endlessTier(_s?: RunState): number { return palier(endlessFun()); }

/** Collections dont le générateur est posé sur le plateau (le paramètre est conservé pour compatibilité). */
export const endlessColls = (_t?: number): CollectionId[] => activeColls(endlessFun());

/** Temps de jeu actif + remplacements gratuits dus. */
function touch(s: RunState, now?: number): BoardEvent[] {
  const fun = endlessFun();
  if (now !== undefined) {
    if (s.clock !== undefined && now > s.clock) {
      const d = Math.min(now - s.clock, EC.orders.activeGapMs);
      s.activeMs = (s.activeMs ?? 0) + d;
      tickActive(fun, d);
    }
    s.clock = Math.max(s.clock ?? now, now);
  }
  const g = grantReplaces(fun);
  return g > 0 ? [{ t: 'replaceGain', n: g, total: fun.endless2.replaces }] : [];
}

/** Annonce les collections nouvellement débloquées (silencieux à la première lecture). */
function noteUnlocks(s: RunState, silent = false): BoardEvent[] {
  const fun = endlessFun();
  const u = unlockedColls(fun);
  const prev = counter(fun, 'unlockedSeen');
  fun.endless2.counters.unlockedSeen = u.length;
  // une collection peut être débloquée par un lieu AVANT une plus ancienne : on suit chaque collection vue
  const fresh = u.filter((c) => !counter(fun, `seen:${c}`));
  for (const c of u) fun.endless2.counters[`seen:${c}`] = 1;
  if (silent || prev <= 0 || !fresh.length) return [];
  void s;
  return fresh.map((c) => ({ t: 'unlock' as const, coll: c, kind: genKindOf(c) }));
}

/** Crochets du moteur pour les libérations de cases (album, butin réglé, coffres). */
function unlockHooks(s: RunState): UnlockHooks {
  const fun = endlessFun();
  return {
    noteItem: (item) => noteItem(s, item),
    settle: (l) => settleLoot(fun, l, subRng(s.rng, 0x10c4)),
    chestPending: () => pendingChests(fun),
  };
}

// ------------------------------------------------------- cases verrouillées

/** Prix en énergie pour libérer la case `i` (null si elle n'est pas verrouillée). */
export const unlockPrice = (s: RunState, i: number): number | null => s.cells[i]?.lock?.price ?? null;

/**
 * Libère une case en dépensant de l'énergie. `pay(n)` dépense réellement (portefeuille) et renvoie vrai s'il a pu ;
 * sans paiement accepté, rien ne change. Les objets restent déplaçables immédiatement.
 */
export function buyUnlock(s: RunState, def: LevelDef, i: number, pay: (n: number) => boolean, now?: number): BoardEvent[] {
  const lock = s.cells[i]?.lock;
  if (s.mode !== 'endless' || !lock) return [];
  if (lock.price > 0 && !pay(lock.price)) return [];
  const fun = endlessFun();
  bump(fun, 'locksBought');
  const ev = [...touch(s, now), ...releaseCell(s.cells, i, 'energy', fun, unlockHooks(s))];
  return ev.concat(afterAction(s, def));
}

/** Zone atteinte (durable). */
export const boardZone = (): number => boardOf(endlessFun()).zone;

function refreshProgress(s: RunState): void {
  for (const o of s.orders) if (o) o.progress = Math.round(progressOf(s.cells, o).ratio * 100) / 100;
}

/** Avancement détaillé d'une commande (objets présents, proximité 0..1, prête). */
export function orderProgress(s: RunState, slot: number) {
  const o = s.orders[slot];
  return o ? progressOf(s.cells, o) : null;
}

/** Remplacements gratuits disponibles. */
export const replacesLeft = (): number => endlessFun().endless2.replaces;

/** Remplace gratuitement une commande (même palier, objets différents). */
export function replaceOrder(s: RunState, def: LevelDef, slot: number): BoardEvent[] {
  if (s.mode !== 'endless') return [];
  const fun = endlessFun();
  const old = s.orders[slot];
  if (!old || fun.endless2.replaces <= 0) return [];
  fun.endless2.replaces--;
  const tier = old.tier ?? tierOfSlot(slot);
  const avoid = new Set<string>(old.items.map(itemKey));
  const others: ItemRef[] = [];
  const shown = new Set<string>(old.customer ? [old.customer] : []);
  s.orders.forEach((o, k) => { if (o && k !== slot) { if (o.customer) shown.add(o.customer); for (const r of o.items) { avoid.add(itemKey(r)); others.push(r); } } });
  const rng = subRng(s.rng, 0x5ee7);
  s.orders[slot] = makeOrder(fun, rng, tier, s.orderSerial++, avoid, others, shown);
  s.rng = advance(s.rng, rng.int(1 << 20) + 13);
  bump(fun, 'replaced');
  return [{ t: 'orderReplace', slot, tier, left: fun.endless2.replaces }, ...afterAction(s, def)];
}

function makeEndlessOrder(s: RunState, slot: number): OrderState {
  const fun = endlessFun();
  const rng = subRng(s.rng, 0x5bd1e995);
  const avoid = new Set<string>();
  const others: ItemRef[] = [];
  const shown = new Set<string>();
  s.orders.forEach((o, k) => { if (o && k !== slot) { if (o.customer) shown.add(o.customer); for (const r of o.items) { avoid.add(itemKey(r)); others.push(r); } } });
  const o = makeOrder(fun, rng, tierOfSlot(slot), s.orderSerial++, avoid, others, shown);
  s.rng = advance(s.rng, rng.int(1 << 30));
  return o;
}

function orderRewardFor(items: ItemRef[], tier: OrderTier) {
  return makeOrderReward(endlessFun(), items, tier);
}

/** Points de jauge + événements `treasure` / `chest`. */
function gainTreasure(fun: ReturnType<typeof endlessFun>, pts: number, source: 'gauge' | 'order' | 'max'): BoardEvent[] {
  if (pts <= 0) return [];
  const won = addTreasure(fun, pts);
  const t = fun.endless2.treasure;
  const ev: BoardEvent[] = [{ t: 'treasure', points: Math.round(t.points * 10) / 10, goal: EC.treasure.goal, gained: pts }];
  if (won > 0) { ev.push({ t: 'chest', pending: pendingChests(fun), source }); bump(fun, 'chestsEarned', won); }
  return ev;
}

/** Fait avancer les événements secondaires d'après un événement du moteur. */
function secondaryFor(fun: ReturnType<typeof endlessFun>, e: BoardEvent): BoardEvent[] {
  const settle = (l: Loot[]) => settleLoot(fun, l, new Rng((fun.endless2.treasure.earned * 977 + fun.endless2.album.length) >>> 0));
  return onEngineEvent(fun, e, settle);
}

/** Découverte d'un objet (album) → événement `discover` (seulement si nouveau) + récompense réglée. */
function noteItem(s: RunState, item: ItemRef): BoardEvent[] {
  const fun = endlessFun();
  const d = albumDiscover(fun, item);
  if (!d.isNew) return [];
  const rng = subRng(s.rng, 0xa1b0);
  const reward = settleLoot(fun, d.reward, rng);
  const e: BoardEvent = { t: 'discover', item: { ...item }, isNew: true, reward, ...(d.completed ? { completed: d.completed } : {}), ...(d.milestone ? { milestone: d.milestone } : {}) };
  return [e, ...secondaryFor(fun, e)];
}

/** Combos Endless : multiplicateur plafonné, paliers, anti-exploitation (budget par minute), événements enrichis. */
function comboEndless(s: RunState, from: number, now: number, mult: number): BoardEvent[] {
  const fun = endlessFun();
  const ev: BoardEvent[] = [];
  if (s.combo < 2) return ev;
  const tiers = EC.combo.tiers;
  const ti = tiers.findIndex((t) => t.at === s.combo);
  const legacy = ti >= 0 ? tiers[ti].reward : undefined;
  if (ti < 0) { ev.push({ t: 'combo', value: s.combo, mult }); return ev; }
  const t = tiers[ti];
  const win = s.comboWin && now - s.comboWin.t0 <= 60_000 ? s.comboWin : (s.comboWin = { t0: now, n: 0, e: 0 });
  const capped = win.n >= EC.combo.maxRewardsPerMin;
  let energy = 0;
  let hearts = 0;
  let reward: 'star' | 'wand' | 'hearts' | undefined;
  if (!capped) {
    win.n++;
    energy = Math.max(0, Math.min(t.energy, EC.combo.maxEnergyPerMin - win.e));
    win.e += energy;
    hearts = t.hearts;
    s.hearts += hearts;
    reward = legacy;
    if (legacy === 'wand') s.wandsEarned++;
    if (legacy === 'star') {
      const at = spawnCell(s, from);
      if (at >= 0) {
        const star: ItemRef = { c: 'special', l: SPECIAL.STAR };
        s.cells[at].item = star;
        ev.push({ t: 'spawn', at, item: star, source: 'combo' });
      } else { s.hearts += 5; hearts += 5; reward = 'hearts'; }
    }
  }
  const head: BoardEvent = { t: 'combo', value: s.combo, mult, ...(reward ? { reward } : {}), ...(capped ? { capped: true } : {}) };
  const tierEv: BoardEvent = { t: 'comboTier', value: s.combo, tier: ti, mult, energy, hearts, ...(reward ? { reward } : {}), capped };
  const out: BoardEvent[] = [head, tierEv, ...ev];
  if (!capped) out.push(...gainTreasure(fun, EC.treasure.comboBonus, 'gauge'));
  bump(fun, 'comboTiers');
  return out;
}

/** Pose sur le plateau les objets d'un butin (`rareItem`, `star`) ; sans place, ils deviennent des pièces. */
export function placeLoot(s: RunState, loots: Loot[], near?: number): { loot: Loot[]; events: BoardEvent[] } {
  const events: BoardEvent[] = [];
  const out: Loot[] = [];
  for (const l of loots) {
    if (l.kind !== 'rareItem' && l.kind !== 'star') { out.push(l); continue; }
    const item: ItemRef = l.item ?? { c: 'special', l: SPECIAL.STAR };
    const minFree = l.kind === 'star' ? 1 : EC.drops.minFreeCellsForItem;
    let placed = 0;
    for (let k = 0; k < Math.max(1, l.n); k++) {
      if (emptyCount(s) < minFree) break;
      const at = spawnCell(s, undefined, near);
      if (at < 0) break;
      s.cells[at].item = { ...item };
      events.push({ t: 'spawn', at, item: { ...item }, source: 'drop' });
      if (s.mode === 'endless') events.push(...noteItem(s, item));
      placed++;
    }
    if (placed === 0) out.push({ kind: 'coins', n: EC.drops.coins[l.rarity ?? 'common'] * 2, rarity: l.rarity });
    else out.push(l);
  }
  return { loot: out, events };
}

/** Effets d'une fusion Endless : statistiques, maîtrise, jauge de trésor, drops, fusion maximale, événements secondaires. */
function endlessMergeHooks(s: RunState, to: number, result: ItemRef, sofar: BoardEvent[]): BoardEvent[] {
  const fun = endlessFun();
  const ev: BoardEvent[] = [];
  bump(fun, 'merges');
  if (result.c !== 'special' && result.c !== 'gen') {
    addGenXp(fun, result.c, EC.gens.xpPerMerge);
    bump(fun, `maxL:${result.c}`, 0);
    if (result.l > counter(fun, `maxL:${result.c}`)) fun.endless2.counters[`maxL:${result.c}`] = result.l;
  }
  ev.push(...noteItem(s, result));
  const rng = subRng(s.rng, 0xd20b);
  const isMax = result.c !== 'special' && result.c !== 'gen' && result.l >= collMax(result.c);
  // jauge de trésor
  ev.push(...gainTreasure(fun, treasurePts(result.l) + (isMax ? EC.treasure.maxMergeBonus : 0), isMax ? 'max' : 'gauge'));
  // drop ordinaire (écart minimal entre deux drops visibles)
  const gapOk = s.merges - (s.lastDropMerge ?? -99) >= EC.drops.minMergesBetween;
  if (gapOk && !isMax) {
    const drop = rollDrop(fun, rng, result.l);
    if (drop) {
      s.lastDropMerge = s.merges;
      const settled = settleLoot(fun, [drop], rng);
      const { loot, events } = placeLoot(s, settled, to);
      for (const l of loot) {
        ev.push({ t: 'drop', at: to, loot: l, rarity: l.rarity ?? 'common', auto: isAuto(l.kind) });
        if (l.kind === 'chest') ev.push({ t: 'chest', pending: pendingChests(fun), source: 'drop' });
      }
      ev.push(...events);
    }
  }
  // fusion au niveau maximum : pièces + drop garanti rare ou mieux
  if (isMax) {
    s.lastDropMerge = s.merges;
    const bonus = rollDrop(fun, rng, result.l, { force: true, min: 'rare' });
    const base: Loot[] = [{ kind: 'coins', n: EC.drops.maxMergeCoins, rarity: 'rare' }, ...(bonus ? [bonus] : [])];
    const { loot, events } = placeLoot(s, settleLoot(fun, base, rng), to);
    ev.push({ t: 'maxMerge', at: to, item: { ...result }, loot });
    if (loot.some((l) => l.kind === 'chest')) ev.push({ t: 'chest', pending: pendingChests(fun), source: 'max' });
    ev.push(...events);
    bump(fun, 'maxMerges');
  }
  s.rng = advance(s.rng, rng.int(1 << 20) + 101);
  // événements secondaires : la fusion + les paliers de combo de ce lot
  for (const e of [...sofar, ...ev]) if (e.t === 'merge' || e.t === 'comboTier') ev.push(...secondaryFor(fun, e));
  return ev;
}


/**
 * Garde-fou anti-blocage : plateau plein, aucune fusion, aucune commande livrable → l'objet le moins
 * précieux devient une Étoile filante (qui permet une fusion). Jamais de blocage définitif.
 */
function rescueIfStuck(s: RunState): BoardEvent[] {
  if (!EC.rescue.enabled || s.mode !== 'endless' || !isStuck(s)) return [];
  // en premier : les restes de collections « au repos » (plus de générateur), puis les objets les plus bas
  const act = activeColls(endlessFun());
  const junk = (r: ItemRef) => (r.c !== 'special' && r.c !== 'gen' && !act.includes(r.c) ? 0 : 1);
  const ranked = s.cells
    .map((c, i) => ({ i, it: c.item }))
    .filter((e): e is { i: number; it: ItemRef } => !!e.it && e.it.c !== 'gen')
    .sort((a, b) => (a.it.c === 'special' ? 1 : 0) - (b.it.c === 'special' ? 1 : 0) || junk(a.it) - junk(b.it) || a.it.l - b.it.l || b.i - a.i);
  const worst = ranked[0];
  if (!worst) return [];
  const others = ranked.some((e) => e.i !== worst.i && e.it.c !== 'special' && e.it.l < collMax(e.it.c));
  if (others) {
    const star: ItemRef = { c: 'special', l: SPECIAL.STAR };
    s.cells[worst.i].item = star;
    bump(endlessFun(), 'rescues');
    return [{ t: 'rescue', at: worst.i, item: star, reason: 'stuck' }];
  }
  s.cells[worst.i].item = null;
  bump(endlessFun(), 'rescues');
  return [{ t: 'remove', at: worst.i, points: 0 }, { t: 'rescue', at: worst.i, item: worst.it, reason: 'stuck' }];
}

function challengeDone(s: RunState, ch: NonNullable<RunState['challenge']>) {
  const o = ch.obj;
  switch (o.t) {
    case 'orders': return s.ordersDone - ch.base >= o.count;
    case 'merges': return s.merges - ch.base >= o.count;
    case 'combo': return s.combo >= o.value;
    case 'score': return s.score - ch.base >= o.value;
    case 'create': return (s.created[itemKey(ref(o.item))] ?? 0) - ch.base >= (o.count ?? 1);
    default: return false;
  }
}

export function challengeProgress(s: RunState): { cur: number; max: number } | null {
  const ch = s.challenge;
  if (!ch) return null;
  const o = ch.obj;
  switch (o.t) {
    case 'orders': return { cur: Math.min(o.count, s.ordersDone - ch.base), max: o.count };
    case 'merges': return { cur: Math.min(o.count, s.merges - ch.base), max: o.count };
    case 'combo': return { cur: Math.min(o.value, s.combo), max: o.value };
    case 'score': return { cur: Math.min(o.value, s.score - ch.base), max: o.value };
    case 'create': return { cur: Math.min(o.count ?? 1, (s.created[itemKey(ref(o.item))] ?? 0) - ch.base), max: o.count ?? 1 };
    default: return null;
  }
}

function makeChallenge(s: RunState): NonNullable<RunState['challenge']> {
  const rng = new Rng(s.rng ^ 0x27d4eb2d);
  const t = endlessTier(s);
  const kind = rng.int(5);
  let obj: Objective;
  let base = 0;
  if (kind === 0) { obj = { t: 'orders', count: 2 + rng.int(2) }; base = s.ordersDone; }
  else if (kind === 1) { obj = { t: 'merges', count: 10 + rng.int(6) + t * 2 }; base = s.merges; }
  else if (kind === 2) { obj = { t: 'combo', value: 3 + rng.int(2) }; base = 0; }
  else if (kind === 3) { const v = 300 + t * 150 + rng.int(4) * 50; obj = { t: 'score', value: v }; base = s.score; }
  else {
    const c = rng.pick(activeColls(endlessFun()));
    const l = Math.min(collMax(c) - 1, 4 + rng.int(1 + Math.min(2, Math.floor(t / 2))));
    obj = { t: 'create', item: [c, l] }; base = s.created[`${c}:${l}`] ?? 0;
  }
  s.rng = (s.rng + 7919) >>> 0;
  return { obj, base, reward: 8 + t * 2 };
}

/** Définition virtuelle utilisée par le mode infini. */
export const ENDLESS_DEF: LevelDef = {
  id: 0,
  chapter: 0,
  title: 'Mode infini',
  hint: 'Fusionne sans fin, livre les commandes et relève les défis.',
  dominant: 'flowers',
  difficulty: 1,
  gen: [['flowers', 1, 1]],
  objectives: [],
  par: 0,
  ordersVisible: 3,
  reward: { hearts: 0 },
};
