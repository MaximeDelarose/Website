import { describe, it, expect, beforeEach } from 'vitest';
import { COLLECTION_IDS, collMax, itemKey } from '../src/data/items';
import { Rng } from '../src/utils/rng';
import {
  ENDLESS_CFG, activeColls, bindEndless, isReachable, makeOrder, orderTaps, resetEndless, tapsFor, unlockedColls, tierPoints, progressOf, tierOfSlot, genLevel,
} from '../src/game/endless';
import { createRun, deliver, ENDLESS_DEF, orderCells, replaceOrder, orderProgress, forceDeliver, tapGenerator } from '../src/game/merge/rules';
import { defaultFun, type FunState } from '../src/save/fun';
import { orderGain } from '../src/game/world/fusionRewards';

function funAt(points: number, gens: Record<string, number> = {}): FunState {
  const f = defaultFun();
  f.endless2.counters.orders = points;
  for (const [k, lv] of Object.entries(gens)) f.endless2.gens[k] = { level: lv, xp: 0 };
  return f;
}

describe('commandes atteignables', () => {
  beforeEach(() => resetEndless());
  it('toute commande générée est atteignable, quel que soit le palier / niveau de générateur', () => {
    const rng = new Rng(2024);
    let n = 0;
    for (const points of [0, 5, 12, 20, 30, 42, 56, 72, 92, 115, 200]) {
      for (const lv of [1, 2, 4, 6]) {
        const gens: Record<string, number> = {};
        for (const c of COLLECTION_IDS) gens[`gen:${c}`] = lv;
        const fun = funAt(points, gens);
        for (let k = 0; k < 50; k++) {
          for (const tier of ENDLESS_CFG.orders.tiers) {
            const o = makeOrder(fun, rng, tier, k);
            n++;
            expect(o.tier).toBe(tier);
            expect(o.items.length).toBeGreaterThanOrEqual(1);
            expect(o.items.length).toBeLessThanOrEqual(ENDLESS_CFG.orders.maxItems[tier]);
            for (const r of o.items) {
              expect(activeColls(fun)).toContain(r.c);
              expect(r.l).toBeGreaterThanOrEqual(2);
              expect(r.l).toBeLessThanOrEqual(collMax(r.c));
              expect(isReachable(fun, r), `${itemKey(r)} palier ${points} gen ${lv}`).toBe(true);
            }
            expect(o.reward!.hearts).toBeGreaterThan(0);
            expect(o.reward!.coins).toBeGreaterThan(0);
          }
        }
      }
    }
    expect(n).toBeGreaterThan(2000);
  }, 120_000);
  it('difficulté croissante : facile < moyenne < difficile (touchers estimés moyens)', () => {
    const fun = funAt(60);
    const rng = new Rng(5);
    const avg = (t: 'easy' | 'mid' | 'hard') => { let a = 0; for (let k = 0; k < 300; k++) a += orderTaps(fun, makeOrder(fun, rng, t, k).items); return a / 300; };
    const [e, m, h] = [avg('easy'), avg('mid'), avg('hard')];
    expect(e).toBeLessThan(m);
    expect(m).toBeLessThan(h);
    const bud = ENDLESS_CFG.orders.budget;
    expect(e).toBeLessThanOrEqual(bud.easy[1] * 1.4);
    expect(h).toBeGreaterThanOrEqual(bud.hard[0] * 0.6);
  });
  it('récompenses prévisibles et croissantes avec la difficulté ; matériaux liés à la collection', () => {
    const fun = funAt(100);
    const rng = new Rng(11);
    const sum = (t: 'easy' | 'mid' | 'hard') => { let c = 0; for (let k = 0; k < 200; k++) c += makeOrder(fun, rng, t, k).reward!.coins; return c / 200; };
    expect(sum('easy')).toBeLessThan(sum('mid'));
    expect(sum('mid')).toBeLessThan(sum('hard'));
    for (let k = 0; k < 200; k++) {
      const o = makeOrder(fun, rng, 'mid', k);
      const mat = o.reward!.mat;
      const colls = o.items.map((r) => r.c);
      if (mat === 'cocoa') expect(colls.some((c) => c === 'love' || c === 'choc')).toBe(true);
      if (mat === 'fabric') expect(colls.some((c) => ['paris', 'cloth', 'acc'].includes(c))).toBe(true);
      if (mat === 'flowers') expect(colls.some((c) => c === 'flowers' || c === 'rare' || c === 'soap')).toBe(true);
      const g = orderGain(o.reward!);
      expect(g.coins).toBe(o.reward!.coins);
    }
  });
  it('déblocage progressif : seules les collections débloquées sont demandées', () => {
    const fun = funAt(0);
    expect(unlockedColls(fun)).toEqual(['flowers', 'love']);
    const rng = new Rng(1);
    for (let k = 0; k < 200; k++) for (const r of makeOrder(fun, rng, 'hard', k).items) expect(['flowers', 'love']).toContain(r.c);
    fun.endless2.counters.orders = ENDLESS_CFG.unlock.at.paris;
    expect(unlockedColls(fun)).toContain('paris');
    fun.endless2.counters.chains = 2;
    expect(tierPoints(fun)).toBe(ENDLESS_CFG.unlock.at.paris + ENDLESS_CFG.unlock.chainBonus * 2);
    fun.endless2.counters.orders = 10000;
    expect(unlockedColls(fun).length).toBe(15);
    expect(activeColls(fun).length).toBe(ENDLESS_CFG.unlock.maxBoardGens);
  });
  it('3 commandes simultanées (facile / moyenne / difficile) et nouvelle commande du même palier après livraison', () => {
    bindEndless(funAt(0));
    const s = createRun(ENDLESS_DEF, 'endless', 77);
    expect(s.orders.length).toBe(3);
    expect(s.orders.map((o) => o!.tier)).toEqual(['easy', 'mid', 'hard']);
    for (let slot = 0; slot < 3; slot++) {
      const o = s.orders[slot]!;
      o.items.forEach((r, i) => { s.cells[i + 3 * slot].item = { ...r }; });
      expect(orderCells(s, slot)).not.toBeNull();
      const ev = deliver(s, ENDLESS_DEF, slot, 5000);
      const d = ev.find((e) => e.t === 'deliver');
      expect(d).toMatchObject({ tier: o.tier, hearts: o.reward!.hearts });
      expect(s.orders[slot]!.tier).toBe(o.tier);
      expect(s.orders[slot]!.id).not.toBe(o.id);
    }
    expect(s.ordersDone).toBe(3);
  });
  it('progression : objet présent = 1, objets plus petits comptent au prorata', () => {
    bindEndless(funAt(0));
    const s = createRun(ENDLESS_DEF, 'endless', 5);
    s.orders[0] = { items: [{ c: 'flowers', l: 4 }], id: 99, tier: 'easy', reward: s.orders[0]!.reward };
    s.cells.forEach((c) => { if (c.item?.c !== 'gen') c.item = null; });
    expect(orderProgress(s, 0)!.ratio).toBe(0);
    s.cells[0].item = { c: 'flowers', l: 3 };
    expect(orderProgress(s, 0)!.ratio).toBeCloseTo(0.5, 5);
    s.cells[1].item = { c: 'flowers', l: 3 };
    expect(orderProgress(s, 0)!.ratio).toBeGreaterThan(0.9);
    expect(orderProgress(s, 0)!.ready).toBe(false);
    s.cells[2].item = { c: 'flowers', l: 4 };
    const p = orderProgress(s, 0)!;
    expect(p.ready).toBe(true);
    expect(p.ratio).toBe(1);
    expect(progressOf(s.cells, s.orders[0]!).have).toBe(1);
  });
  it('remplacement gratuit : même palier, objets différents, stock décompté et plafonné', () => {
    const fun = bindAndGet();
    const s = createRun(ENDLESS_DEF, 'endless', 9);
    const before = fun.endless2.replaces;
    expect(before).toBeGreaterThan(0);
    const old = s.orders[1]!;
    const ev = replaceOrder(s, ENDLESS_DEF, 1);
    expect(ev[0]).toMatchObject({ t: 'orderReplace', slot: 1, tier: 'mid', left: before - 1 });
    expect(s.orders[1]!.tier).toBe('mid');
    expect(s.orders[1]!.id).not.toBe(old.id);
    expect(fun.endless2.replaces).toBe(before - 1);
    fun.endless2.replaces = 0;
    expect(replaceOrder(s, ENDLESS_DEF, 1)).toEqual([]);
    function bindAndGet() { const f = funAt(30); bindEndless(f); return f; }
  });
  it('remplacements gagnés : par temps de jeu actif ou par livraisons, plafonnés', () => {
    const fun = bindFresh();
    fun.endless2.replaces = 0;
    const s = createRun(ENDLESS_DEF, 'endless', 4);
    // 17 minutes de jeu actif → +2
    let now = 1000;
    for (let k = 0; k < 17 * 6; k++) { now += 10_000; tapGenerator(s, ENDLESS_DEF, undefined, now); }
    expect(fun.endless2.replaces).toBe(2);
    for (let k = 0; k < 40 * 6; k++) { now += 10_000; tapGenerator(s, ENDLESS_DEF, undefined, now); }
    expect(fun.endless2.replaces).toBe(ENDLESS_CFG.orders.replaceMax);
    // par livraisons
    fun.endless2.replaces = 0;
    fun.endless2.counters.orders = ENDLESS_CFG.orders.replaceEveryOrders - 1;
    forceDeliver(s, ENDLESS_DEF, 0, now);
    expect(fun.endless2.replaces).toBe(1);
    function bindFresh() { const f = defaultFun(); bindEndless(f); return f; }
  });
  it('tierOfSlot et tapsFor sont cohérents', () => {
    expect(tierOfSlot(0)).toBe('easy');
    expect(tierOfSlot(2)).toBe('hard');
    const fun = funAt(0);
    expect(tapsFor(fun, { c: 'flowers', l: 5 })).toBeGreaterThan(tapsFor(fun, { c: 'flowers', l: 4 }));
    fun.endless2.gens['gen:flowers'] = { level: 6, xp: 0 };
    expect(genLevel(fun, 'flowers')).toBe(6);
    expect(tapsFor(fun, { c: 'flowers', l: 5 })).toBeLessThan(5);
  });
});
