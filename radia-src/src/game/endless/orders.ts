/**
 * Commandes Endless 2.0 : 3 paliers (facile / moyenne / difficile), objets toujours ATTEIGNABLES
 * (collection débloquée + niveau accessible avec les générateurs actuels), récompense prévisible,
 * indicateur de progression et remplacements gratuits. Aucun DOM.
 */
import { pickCustomer } from '../customers/logic';
import { collMax, itemKey, type CollectionId, type ItemRef } from '../../data/items';
import { MATERIAL_OF } from '../world/fusionRewards';
import type { FunState } from '../../save/fun';
import type { OrderReward, OrderState, OrderTier } from '../merge/types';
import { Rng } from '../../utils/rng';
import { ENDLESS_CFG as C } from './config';
import { bump, counter } from './ctx';
import { avgUnits, genLevel } from './generators';
import { activeColls } from './unlocks';

const O = C.orders;
export const TIERS: readonly OrderTier[] = O.tiers;
export const tierOfSlot = (slot: number): OrderTier => TIERS[Math.max(0, Math.min(2, slot))];

/** Estimation du nombre de touchers de générateur pour obtenir un objet (fusions optimales × facteur d'imperfection). */
export function tapsFor(fun: FunState, item: ItemRef): number {
  if (item.c === 'special' || item.c === 'gen') return 1;
  const avg = avgUnits(item.c, genLevel(fun, item.c));
  return Math.max(1, (2 ** (item.l - 1) / avg) * O.inefficiency);
}
export const orderTaps = (fun: FunState, items: ItemRef[]): number => items.reduce((a, r) => a + tapsFor(fun, r), 0);

/** Un objet est atteignable : collection active sur le plateau, niveau valide et pas démesuré. */
export function isReachable(fun: FunState, item: ItemRef): boolean {
  if (item.c === 'special' || item.c === 'gen') return false;
  if (!activeColls(fun).includes(item.c)) return false;
  if (item.l < 1 || item.l > collMax(item.c)) return false;
  return tapsFor(fun, item) <= O.reachableMaxTaps;
}

export function orderReward(fun: FunState, items: ItemRef[], tier: OrderTier): OrderReward {
  const taps = orderTaps(fun, items);
  const m = O.tierMult[tier];
  const mat = items.map((r) => MATERIAL_OF[r.c]).find((x) => x === 'flowers' || x === 'fabric' || x === 'cocoa') ?? null;
  return {
    hearts: Math.round(taps * C.orders.heartsPerTap * m) + 2,
    coins: Math.round(taps * C.orders.coinsPerTap * m),
    mat, matN: mat ? O.matN[tier] : 0,
    energy: C.energy.deliverEnergy[tier],
    treasure: O.treasure[tier],
  };
}

/** Facteur de démarrage en douceur (0.3 → 1) selon le nombre de commandes déjà livrées. */
export const rampFactor = (fun: FunState): number => Math.min(1, O.rampMin + (1 - O.rampMin) * counter(fun, 'orders') / O.rampOrders);

/** Niveaux candidats d'une collection pour un budget de touchers [lo, hi] (marge ±30 %). */
function levelsFor(fun: FunState, c: CollectionId, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let l = 2; l <= collMax(c); l++) {
    const t = tapsFor(fun, { c, l });
    if (t >= lo * 0.7 && t <= hi * 1.3 && t <= O.reachableMaxTaps) out.push(l);
  }
  return out;
}

/**
 * Crée une commande du palier demandé. `avoid` = clés d'objets déjà demandés par les autres commandes
 * (on les évite autant que possible). L'identifiant est attribué par l'appelant.
 */
export function makeOrder(fun: FunState, rng: Rng, tier: OrderTier, id: number, avoid: Set<string> = new Set(), others: ItemRef[] = [], avoidCustomers: ReadonlySet<string> = new Set()): OrderState {
  const colls = activeColls(fun);
  // les commandes visibles se recoupent : moins de collections différentes à produire en même temps
  const shared = [...new Set(others.map((r) => r.c))].filter((c): c is CollectionId => (colls as string[]).includes(c));
  const ramp = rampFactor(fun);
  const bmin = O.budget[tier][0] * ramp;
  const bmax = O.budget[tier][1] * ramp;
  let best: ItemRef[] | null = null;
  for (let attempt = 0; attempt < 24 && !best; attempt++) {
    const maxN = O.maxItems[tier];
    const n = maxN === 1 ? 1 : tier === 'mid' ? (rng.next() < 0.4 ? 2 : 1) : (rng.next() < 0.8 ? 2 : 1);
    const items: ItemRef[] = [];
    for (let k = 0; k < n; k++) {
      let c = shared.length && rng.next() < O.sharedCollChance ? rng.pick(shared) : rng.pick(colls);
      // PIMBÊCHE, pilier du mode libre : première commande de savon garantie (facile), puis une part régulière des commandes
      if (colls.includes('soap') && k === 0) {
        const first = counter(fun, 'soapOrders') === 0 && tier === 'easy';
        if (first || rng.next() < O.pimbecheChance) c = 'soap';
      }
      const cand = levelsFor(fun, c, bmin / n, bmax / n);
      if (!cand.length) continue;
      items.push({ c, l: rng.pick(cand) });
    }
    if (items.length !== n) continue;
    if (attempt < 16 && items.some((r) => avoid.has(itemKey(r)))) continue;
    best = items;
  }
  if (!best) {
    // repli sûr : l'objet de niveau 3 de la première collection active (toujours atteignable)
    best = [{ c: colls[0], l: 3 }];
  }
  // un vrai client passe la commande : il aime (autant que possible) la collection demandée et n'est jamais affiché deux fois
  const customer = pickCustomer(rng, best[0].c, avoidCustomers, fun.customers);
  return { items: best, id, tier, reward: orderReward(fun, best, tier), progress: 0, customer };
}

// ------------------------------------------------------------------ progression
export interface OrderProgressView {
  /** Objets demandés déjà présents sur le plateau. */
  have: number;
  need: number;
  /** 0..1 : proximité (les objets de niveau inférieur comptent au prorata des fusions restantes). */
  ratio: number;
  ready: boolean;
  per: { item: ItemRef; have: boolean; ratio: number }[];
}

/** Avancement d'une commande d'après le plateau (cases `cells`). */
export function progressOf(cells: { item: ItemRef | null }[], o: OrderState): OrderProgressView {
  const used = new Set<number>();
  const per: OrderProgressView['per'] = [];
  for (const want of o.items) {
    let found = -1;
    for (let i = cells.length - 1; i >= 0; i--) {
      const it = cells[i].item;
      if (!used.has(i) && it && it.c === want.c && it.l === want.l) { found = i; break; }
    }
    if (found >= 0) { used.add(found); per.push({ item: want, have: true, ratio: 1 }); continue; }
    let units = 0;
    cells.forEach((c, i) => { const it = c.item; if (!used.has(i) && it && it.c === want.c && it.l < want.l) units += 2 ** (it.l - 1); });
    per.push({ item: want, have: false, ratio: Math.min(0.99, units / 2 ** (want.l - 1)) });
  }
  const have = per.filter((p) => p.have).length;
  const ratio = per.reduce((a, p) => a + p.ratio, 0) / Math.max(1, per.length);
  return { have, need: o.items.length, ratio, ready: have === o.items.length, per };
}

// ------------------------------------------------------------------ remplacements gratuits
/** Ajoute des remplacements gratuits dus (temps de jeu actif ou nombre de livraisons). Renvoie le nombre gagné. */
export function grantReplaces(fun: FunState): number {
  const e = fun.endless2;
  const before = e.replaces;
  const act = counter(fun, 'activeMs');
  if (e.replaceTs > act) e.replaceTs = act;
  while (e.replaces < O.replaceMax && act - e.replaceTs >= O.replaceActiveMs) { e.replaces++; e.replaceTs += O.replaceActiveMs; }
  if (e.replaces >= O.replaceMax) e.replaceTs = act;
  return e.replaces - before;
}

/** À appeler après chaque livraison : +1 remplacement toutes les N livraisons. */
export function grantReplaceOnDelivery(fun: FunState): number {
  const n = counter(fun, 'orders');
  if (n > 0 && n % O.replaceEveryOrders === 0 && fun.endless2.replaces < O.replaceMax) { fun.endless2.replaces++; return 1; }
  return 0;
}

/** Compte le temps de jeu actif (ms) entre deux actions, sans compter les longues pauses. */
export function tickActive(fun: FunState, delta: number): void {
  if (delta > 0) bump(fun, 'activeMs', Math.min(delta, O.activeGapMs));
}
