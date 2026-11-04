import { describe, it, expect, beforeEach } from 'vitest';
import { COLLECTION_IDS, GENERATORS, collMax, genKindOf } from '../src/data/items';
import { Rng } from '../src/utils/rng';
import {
  ENDLESS_CFG, avgUnits, bindEndless, genLevel, genState, generatorInfo, maxProduced, resetEndless, rollProduction, upgradeCost, upgradeGenerator, addGenXp, masteryRank,
} from '../src/game/endless';
import { createRun, ENDLESS_DEF, tapCost, tapGenerator } from '../src/game/merge/rules';
import { defaultWorld } from '../src/save/schema';
import { defaultFun } from '../src/save/fun';

const G = ENDLESS_CFG.gens;
beforeEach(() => { resetEndless(); });

describe('générateurs évolutifs', () => {
  it('chaque table somme à 1, ne produit que des niveaux valides et progresse avec le niveau', () => {
    for (const c of COLLECTION_IDS) {
      let prev = 0;
      for (let lv = 1; lv <= G.maxLevel; lv++) {
        const info = generatorInfo(genKindOf(c), lv);
        expect(info.table.reduce((a, r) => a + r.pct, 0)).toBeGreaterThan(99.5);
        expect(info.table.every((r) => r.l >= 1 && r.l <= collMax(c))).toBe(true);
        expect(info.maxProduced).toBeGreaterThanOrEqual(prev);
        prev = info.maxProduced;
        expect(info.description.length).toBeGreaterThan(10);
      }
    }
    expect(maxProduced('flowers', 1)).toBe(2);
    expect(maxProduced('flowers', 6)).toBe(7);
    expect(avgUnits('flowers', 6)).toBeGreaterThan(avgUnits('flowers', 1) * 3);
  });
  it('niveau d\'amélioration visible : bénéfices annoncés et prochain niveau', () => {
    const a = generatorInfo(1, 1);
    expect(a.next?.level).toBe(2);
    expect(a.next!.gains.length).toBeGreaterThan(0);
    expect(generatorInfo(1, G.maxLevel).next).toBeNull();
    expect(generatorInfo(1, 4).doublePct).toBeGreaterThan(a.doublePct);
  });
  it('production tirée : fréquences conformes à la table (statistique)', () => {
    const rng = new Rng(99);
    const n = 20000;
    const cnt: Record<number, number> = {};
    for (let k = 0; k < n; k++) { const it = rollProduction(rng, 'flowers', 3); if (it.c === 'flowers') cnt[it.l] = (cnt[it.l] ?? 0) + 1; }
    const total = Object.values(cnt).reduce((a, b) => a + b, 0);
    const exp = [0.4, 0.35, 0.18, 0.07];
    exp.forEach((p, i) => expect(Math.abs((cnt[i + 1] ?? 0) / total - p)).toBeLessThan(0.02));
    expect(cnt[5]).toBeUndefined();
  });
  it('amélioration payante : pièces / matériaux, jamais de diamants ; refus si pauvre', () => {
    const fun = defaultFun();
    const w = defaultWorld();
    w.res.coins = 0;
    let r = upgradeGenerator(fun, 1, w);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('poor');
    expect(genLevel(fun, 'flowers')).toBe(1);
    const cost = upgradeCost(1, 1)!;
    expect(Object.keys(cost).every((k) => ['coins', 'flowers', 'fabric', 'cocoa'].includes(k))).toBe(true);
    w.res.coins = 100000; w.res.flowers = 1000; w.res.cocoa = 1000; w.res.fabric = 1000;
    for (let lv = 1; lv < G.maxLevel; lv++) { r = upgradeGenerator(fun, 1, w); expect(r.ok).toBe(true); expect(r.level).toBe(lv + 1); }
    expect(genLevel(fun, 'flowers')).toBe(G.maxLevel);
    r = upgradeGenerator(fun, 1, w);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('max');
    expect(w.res.coins).toBeLessThan(100000);
    // coûts croissants
    const costs = [1, 2, 3, 4, 5].map((l) => upgradeCost(2, l)!.coins!);
    for (let i = 1; i < costs.length; i++) expect(costs[i]).toBeGreaterThan(costs[i - 1]);
  });
  it('maîtrise : l\'XP donne un rang et un rabais plafonné', () => {
    expect(masteryRank(0)).toBe(0);
    expect(masteryRank(G.xpPerRank)).toBe(1);
    expect(masteryRank(1e9)).toBe(G.maxRank);
    expect(upgradeCost(1, 2, G.maxRank)!.coins!).toBeLessThan(upgradeCost(1, 2, 0)!.coins!);
    const fun = defaultFun();
    addGenXp(fun, 'love', 130);
    expect(genState(fun, 'love').rank).toBe(2);
  });
  it('toucher un générateur monté de niveau produit des objets plus hauts et peut doubler / être gratuit', () => {
    const fun = resetEndless();
    fun.endless2.gens['gen:flowers'] = { level: 6, xp: 0 };
    const s = createRun(ENDLESS_DEF, 'endless', 5);
    const g = s.cells.findIndex((c) => c.item?.c === 'gen' && c.item.l === 1);
    let maxL = 0; let dbl = 0; let free = 0; let n = 0;
    for (let k = 0; k < 400; k++) {
      s.cells.forEach((c, i) => { if (!(c.item?.c === 'gen')) s.cells[i].item = null; });
      if (tapCost(s, g) === 0) free++;
      const ev = tapGenerator(s, ENDLESS_DEF, g, k * 1000);
      for (const e of ev) if (e.t === 'spawn' && e.source === 'gen') { n++; if (e.double) dbl++; if (e.item.c === 'flowers') maxL = Math.max(maxL, e.item.l); }
    }
    expect(maxL).toBeGreaterThanOrEqual(5);
    expect(dbl).toBeGreaterThan(20);
    expect(free).toBeGreaterThan(5);
    expect(n).toBeGreaterThan(400);
  });
  it('un toucher sur N est gratuit même au niveau 1', () => {
    resetEndless();
    const s = createRun(ENDLESS_DEF, 'endless', 3);
    const g = s.cells.findIndex((c) => c.item?.c === 'gen');
    let frees = 0;
    for (let k = 0; k < 60; k++) {
      s.cells.forEach((c, i) => { if (c.item?.c !== 'gen') s.cells[i].item = null; });
      if (tapCost(s, g) === 0) frees++;
      tapGenerator(s, ENDLESS_DEF, g, k * 1000);
    }
    expect(frees).toBe(Math.floor(60 / ENDLESS_CFG.energy.freeTapEvery));
  });
  it('liaison explicite du contexte', () => {
    const f = defaultFun();
    f.endless2.gens['gen:chess'] = { level: 3, xp: 0 };
    bindEndless(f);
    expect(genLevel(f, 'chess')).toBe(3);
    expect(GENERATORS[4].coll).toBe('chess');
  });
});
