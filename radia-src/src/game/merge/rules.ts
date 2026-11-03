/**
 * Règles du jeu de fusion — sans rendu, sans DOM, entièrement testable.
 * Toutes les actions prennent l'état, le modifient et renvoient la liste des
 * événements à animer. Une action invalide ne modifie jamais l'état.
 */
import { MAX_LEVEL, SPECIAL, itemKey, mergePoints, sameItem, COLLECTION_IDS, GENERATORS, genKindOf, type CollectionId, type ItemRef } from '../../data/items';
import { Rng, hashString } from '../../utils/rng';
import {
  BOARD_H, BOARD_SIZE, BOARD_W, COMBO_WINDOW_MS,
  type BoardEvent, type Cell, type LevelDef, type Objective, type OrderState, type RunState, type Tuple,
} from './types';

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
  const colls = mode === 'endless' ? endlessColls(0) : levelColls(def);
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
  const visible = def.ordersVisible ?? 2;
  for (let k = 0; k < visible; k++) s.orders.push(null);
  for (let k = 0; k < visible; k++) fillOrder(s, def, k);
  if (mode === 'endless') s.challenge = makeChallenge(s);
  return s;
}

/** Copie profonde (sauvegarde / annulation). */
export const cloneRun = (s: RunState): RunState => JSON.parse(JSON.stringify({ ...s, lastMergeAt: 0 })) as RunState;

// ------------------------------------------------------------- commandes

function fillOrder(s: RunState, def: LevelDef, slot: number): boolean {
  if (s.mode === 'endless') {
    s.orders[slot] = makeEndlessOrder(s);
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

export const orderHearts = (o: OrderState) => o.items.reduce((a, r) => a + r.l, 0) + 2;
export const orderPoints = (o: OrderState) => o.items.reduce((a, r) => a + mergePoints(r.l) * 2, 0);

export function deliver(s: RunState, def: LevelDef, slot: number): BoardEvent[] {
  if (s.won && s.mode === 'story') return [];
  const o = s.orders[slot];
  const cells = orderCells(s, slot);
  if (!o || !cells) return [];
  for (const i of cells) s.cells[i].item = null;
  const hearts = orderHearts(o);
  const points = orderPoints(o);
  s.hearts += hearts;
  s.score += points;
  s.ordersDone++;
  const ev: BoardEvent[] = [{ t: 'deliver', slot, cells, hearts, points }];
  s.orders[slot] = null;
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
    if (!cells[i].item && !cells[i].gift) { cells[i].item = { c: 'gen', l: kind }; return i; }
  }
  for (let i = BOARD_SIZE - 1; i >= 0; i--) if (!cells[i].item && !cells[i].gift) { cells[i].item = { c: 'gen', l: kind }; return i; }
  return -1;
}

/** Ajoute les générateurs manquants (sauvegardes d'avant les générateurs). */
export function ensureGenerators(s: RunState, def: LevelDef): void {
  const colls = s.mode === 'endless' ? endlessColls(endlessTier(s)) : levelColls(def);
  for (const c of colls) placeGenerator(s.cells, genKindOf(c));
}

export const generatorCells = (s: RunState) => s.cells.map((c, i) => (isGenItem(c.item) ? i : -1)).filter((i) => i >= 0);

/** Prix en diamants pour terminer une commande tout de suite (accélérer). */
export const rushPrice = (o: OrderState) => Math.max(5, o.items.reduce((a, r) => a + 2 * r.l, 0));

/** Commande terminée sans les objets (payée en diamants). */
export function forceDeliver(s: RunState, def: LevelDef, slot: number): BoardEvent[] {
  if (s.won && s.mode === 'story') return [];
  const o = s.orders[slot];
  if (!o) return [];
  const hearts = orderHearts(o);
  const points = orderPoints(o);
  s.hearts += hearts;
  s.score += points;
  s.ordersDone++;
  const ev: BoardEvent[] = [{ t: 'deliver', slot, cells: [], hearts, points }];
  s.orders[slot] = null;
  if (fillOrder(s, def, slot)) ev.push({ t: 'orderNew', slot });
  return ev.concat(afterAction(s, def));
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

const isFree = (c: Cell) => !c.item && !c.gift;
export const emptyCount = (s: RunState) => s.cells.filter(isFree).length;

/**
 * Tirage d'un objet. Avec `coll`, seul le générateur de cette collection
 * produit : ses objets + sa part des objets spéciaux + une petite chance
 * d'objet rare.
 */
export function rollGen(s: RunState, def: LevelDef, coll?: CollectionId): ItemRef {
  const rng = new Rng(s.rng);
  let pool = s.mode === 'endless' ? endlessPool(s) : def.gen;
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
 * Toucher un générateur (case `gen`). Sans `gen`, on prend le premier
 * générateur du plateau (tests, anciennes sauvegardes).
 */
export function tapGenerator(s: RunState, def: LevelDef, gen?: number): BoardEvent[] {
  if (s.won && s.mode === 'story') return [];
  const g = gen ?? generatorCells(s)[0];
  const it = g !== undefined ? s.cells[g]?.item : null;
  const coll = it && isGenItem(it) ? GENERATORS[it.l]?.coll : undefined;
  const at = spawnCell(s, undefined, coll ? g : undefined);
  if (at < 0) return [{ t: 'full' }];
  const item = rollGen(s, def, coll);
  s.cells[at].item = item;
  s.taps++;
  return [{ t: 'spawn', at, item, source: 'gen', from: coll ? g : undefined }, ...afterAction(s, def)];
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
  if (a.c === 'special' && a.l === SPECIAL.STAR) return b.c !== 'special' && b.c !== 'gen' && b.l < MAX_LEVEL;
  if (isSpecial(a) || isSpecial(b)) return false;
  return sameItem(a, b) && a.l < MAX_LEVEL;
}

/**
 * Déplacement d'un objet (glisser-déposer) : vers une case vide → déplacement,
 * sur un objet identique → fusion, sinon → annulé.
 */
export function move(s: RunState, def: LevelDef, from: number, to: number, now: number): BoardEvent[] {
  if (s.won && s.mode === 'story') return [];
  if (from === to || from < 0 || to < 0 || from >= BOARD_SIZE || to >= BOARD_SIZE) return [];
  const a = s.cells[from];
  const b = s.cells[to];
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
    const reason = sameItem(a.item, b.item) && a.item.l >= MAX_LEVEL ? 'max' : 'different';
    return [{ t: 'invalid', from, to, reason }];
  }
  const joker = a.item.c === 'special';
  const result: ItemRef = { c: b.item.c, l: b.item.l + 1 };
  a.item = null;
  b.item = result;
  return registerMerge(s, def, from, to, result, now, joker);
}

function registerMerge(s: RunState, def: LevelDef, from: number, to: number, result: ItemRef, now: number, joker = false): BoardEvent[] {
  s.combo = now - s.lastMergeAt <= COMBO_WINDOW_MS ? s.combo + 1 : 1;
  s.lastMergeAt = now;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  s.merges++;
  const key = itemKey(result);
  s.created[key] = (s.created[key] ?? 0) + 1;
  const mult = Math.min(3, 1 + 0.25 * (s.combo - 1));
  const points = Math.round(mergePoints(result.l) * mult);
  s.score += points;
  const ev: BoardEvent[] = [{ t: 'merge', from, to, result, points, combo: s.combo, joker }];

  // Les paquets cadeaux voisins s'ouvrent.
  for (const n of neighbors(to)) if (s.cells[n].gift) ev.push(...openGift(s, n));

  // Récompenses de combo (règles explicites) :
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
export function tapItem(s: RunState, def: LevelDef, i: number): BoardEvent[] {
  if (s.won && s.mode === 'story') return [];
  const it = s.cells[i]?.item;
  if (!it || it.c !== 'special' || it.l !== SPECIAL.BOX) return [];
  s.cells[i].item = null;
  const ev: BoardEvent[] = [{ t: 'boxOpen', at: i }];
  for (let k = 0; k < 3; k++) {
    const at = spawnCell(s, k === 0 ? i : undefined);
    if (at < 0) break;
    const r = rollGen(s, def);
    const item: ItemRef = r.c === 'special' ? r : { c: r.c, l: Math.min(MAX_LEVEL, r.l + 1) };
    s.cells[at].item = item;
    ev.push({ t: 'spawn', at, item, source: 'box' });
  }
  return ev.concat(afterAction(s, def));
}

// --------------------------------------------------------------- bonus

export function useWand(s: RunState, def: LevelDef, i: number, now: number): BoardEvent[] {
  const it = s.cells[i]?.item;
  if (!it || it.c === 'special' || it.c === 'gen' || it.l >= MAX_LEVEL) return [];
  const result = { c: it.c, l: it.l + 1 };
  s.cells[i].item = result;
  const key = itemKey(result);
  s.created[key] = (s.created[key] ?? 0) + 1;
  s.score += mergePoints(result.l);
  void now;
  return [{ t: 'upgrade', at: i, item: result }, ...afterAction(s, def)];
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

function afterAction(s: RunState, def: LevelDef): BoardEvent[] {
  const ev: BoardEvent[] = [];
  if (s.mode === 'endless') {
    for (const c of endlessColls(endlessTier(s))) {
      const at = placeGenerator(s.cells, genKindOf(c));
      if (at >= 0) ev.push({ t: 'spawn', at, item: { c: 'gen', l: genKindOf(c) }, source: 'reward' });
    }
    const ch = s.challenge;
    if (ch && challengeDone(s, ch)) {
      s.hearts += ch.reward;
      s.challengesDone = (s.challengesDone ?? 0) + 1;
      ev.push({ t: 'challenge', reward: ch.reward });
      s.challenge = makeChallenge(s);
    }
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

export function endlessTier(s: RunState) {
  return Math.min(6, Math.floor(Math.sqrt(s.score / 400)));
}

export const endlessColls = (t: number): CollectionId[] => COLLECTION_IDS.slice(0, Math.min(4, 2 + Math.floor(t / 2)));

function endlessPool(s: RunState): [ItemRef['c'], number, number][] {
  const t = endlessTier(s);
  const pool: [ItemRef['c'], number, number][] = [];
  const colls = endlessColls(t);
  for (const c of colls) {
    pool.push([c, 1, 10]);
    pool.push([c, 2, 4 + t]);
    if (t >= 3) pool.push([c, 3, t]);
  }
  pool.push(['special', SPECIAL.STAR, 0.6]);
  if (t >= 2) pool.push(['special', SPECIAL.BOX, 0.5]);
  return pool;
}

function makeEndlessOrder(s: RunState): OrderState {
  const rng = new Rng(s.rng ^ 0x5bd1e995);
  const t = endlessTier(s);
  const colls = COLLECTION_IDS.slice(0, Math.min(4, 2 + Math.floor(t / 2)));
  const n = rng.next() < 0.35 + t * 0.05 ? 2 : 1;
  const items: ItemRef[] = [];
  for (let k = 0; k < n; k++) items.push({ c: rng.pick(colls), l: 3 + rng.int(2 + Math.min(3, t)) });
  s.rng = (s.rng + rng.int(1 << 30)) >>> 0;
  return { items, id: s.orderSerial++ };
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
    const c = rng.pick(COLLECTION_IDS.slice(0, Math.min(4, 2 + Math.floor(t / 2))));
    const l = 4 + rng.int(1 + Math.min(2, Math.floor(t / 2)));
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
