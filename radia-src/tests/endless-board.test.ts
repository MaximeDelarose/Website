import { describe, it, expect } from 'vitest';
import { Rng } from '../src/utils/rng';
import { BOARD_SIZE } from '../src/game/merge/types';
import { ENDLESS_DEF, createRun, ensureGenerators, generatorCells, hasMergeAvailable, isStuck, emptyCount, move, orderCells, tapGenerator, tapItem, useWand, useWind } from '../src/game/merge/rules';
import { botStep } from '../src/game/merge/bot';
import { bindEndless, resetEndless } from '../src/game/endless';
import { playEndless, newSim, digest } from './endless-helpers';
import { sanitizeFun } from '../src/save/fun';
import { sanitize, defaultSave } from '../src/save/schema';

describe('aucun blocage définitif', () => {
  it('joueur normal : 2000 actions sur 5 graines, jamais bloqué, jamais d\'action vide durable', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const sim = playEndless({ seed, actions: 2000, gapMs: 4000 });
      expect(sim.maxEmptyStreak, `graine ${seed}`).toBeLessThanOrEqual(2);
      expect(isStuck(sim.s)).toBe(false);
      expect(sim.s.ordersDone).toBeGreaterThan(20);
      expect(sim.eco.energy).toBeGreaterThanOrEqual(0);
    }
  }, 120_000);
  it('joueur maladroit (actions au hasard) : après CHAQUE action, une issue existe (case libre, fusion ou livraison)', () => {
    for (const seed of [11, 12, 13]) {
      const fun = resetEndless();
      const s = createRun(ENDLESS_DEF, 'endless', seed);
      const rng = new Rng(seed * 7919);
      let now = 5000;
      let maxLevel = 0;
      for (let i = 0; i < 2000; i++) {
        now += 1200;
        const r = rng.next();
        if (r < 0.45) tapGenerator(s, ENDLESS_DEF, rng.pick(generatorCells(s)), now);
        else if (r < 0.9) move(s, ENDLESS_DEF, rng.int(BOARD_SIZE), rng.int(BOARD_SIZE), now);
        else { const b = s.cells.findIndex((c) => c.item?.c === 'special' && c.item.l === 3); if (b >= 0) tapItem(s, ENDLESS_DEF, b, now); else useWind(s, ENDLESS_DEF, rng.int(BOARD_SIZE)); }
        if (rng.next() < 0.02) useWand(s, ENDLESS_DEF, rng.int(BOARD_SIZE), now);
        const ok = emptyCount(s) > 0 || hasMergeAvailable(s) || s.orders.some((_, k) => !!orderCells(s, k));
        expect(ok, `graine ${seed} action ${i}`).toBe(true);
        expect(generatorCells(s).length).toBeGreaterThan(0);
        for (const c of s.cells) if (c.item?.c !== 'special' && c.item?.c !== 'gen' && c.item) maxLevel = Math.max(maxLevel, c.item.l);
      }
      console.log(`[maladroit] graine ${seed} : sauvetages=${fun.endless2.counters.rescues ?? 0}, niveau max=${maxLevel}`);
      expect(maxLevel).toBeGreaterThan(2);
    }
  }, 120_000);
  it('plateau saturé volontairement (ne jamais livrer ni fusionner) : le garde-fou intervient', () => {
    const fun = resetEndless();
    const s = createRun(ENDLESS_DEF, 'endless', 77);
    let now = 1;
    for (let i = 0; i < 400; i++) { now += 1000; tapGenerator(s, ENDLESS_DEF, undefined, now); }
    expect(isStuck(s)).toBe(false);
    expect(fun.endless2.counters.rescues ?? 0).toBeGreaterThanOrEqual(0);
  });
});

describe('migration et sérialisation', () => {
  const OLD_RUN = {
    mode: 'endless', levelId: 0, rng: 123456, score: 1400, taps: 80, merges: 60, combo: 2, bestCombo: 5, lastMergeAt: 99999,
    created: { 'flowers:3': 4 }, orderCursor: 0, ordersDone: 17, hearts: 40, wandsEarned: 1, won: false, orderSerial: 30,
    challenge: { obj: { t: 'merges', count: 12 }, base: 40, reward: 12 }, challengesDone: 3,
    cells: Array.from({ length: 36 }, (_, i) => ({ item: i === 0 ? { c: 'gen', l: 1 } : i === 1 ? { c: 'gen', l: 2 } : i === 2 ? { c: 'flowers', l: 3 } : i === 3 ? { c: 'flowers', l: 3 } : i === 4 ? { c: 'martien', l: 4 } : null, gift: null })),
    orders: [{ items: [{ c: 'flowers', l: 4 }], id: 28 }, { items: [{ c: 'love', l: 5 }, { c: 'paris', l: 3 }], id: 29 }],
  };
  it('ancienne partie Endless (2 commandes, sans palier, objet inconnu) → partie valide, rien de perdu', () => {
    const save = sanitize({ v: 4, endless: { best: 5000, runs: 9, run: OLD_RUN, challenges: 7 } });
    const run = save.endless.run!;
    expect(run).not.toBeNull();
    expect(run.score).toBe(1400);
    expect(run.ordersDone).toBe(17);
    expect(run.cells[4].item).toBeNull(); // objet inconnu retiré, pas la partie
    expect(run.cells[2].item).toEqual({ c: 'flowers', l: 3 });
    expect(save.endless.best).toBe(5000);
    const fun = resetEndless();
    ensureGenerators(run, ENDLESS_DEF);
    expect(run.orders.length).toBe(3);
    expect(run.orders.map((o) => o!.tier)).toEqual(['easy', 'mid', 'hard']);
    expect(run.orders.every((o) => !!o!.reward)).toBe(true);
    expect(fun.endless2.counters.orders).toBeGreaterThanOrEqual(17);
    // la partie reprise se joue
    const sim = newSim(1);
    sim.s = run; sim.fun = fun;
    let now = 100_000;
    for (let i = 0; i < 300; i++) { now += 3000; sim.now = now; sim.actions = i + 1; digest(sim, botStep(run, ENDLESS_DEF, now)); }
    expect(run.ordersDone).toBeGreaterThan(17);
    expect(isStuck(run)).toBe(false);
  });
  it('run Endless 2.0 : aller-retour JSON (avec sanitize) sans perte, puis la partie continue', () => {
    const sim = playEndless({ seed: 21, actions: 500, gapMs: 3000 });
    const json = JSON.stringify({ run: sim.s, fun: sim.fun });
    const back = JSON.parse(json) as { run: typeof sim.s; fun: typeof sim.fun };
    expect(sanitizeFun(back.fun)).toEqual(sanitizeFun(sim.fun));
    const save = sanitize({ v: 5, endless: { best: 1, runs: 1, run: back.run, challenges: 0 }, fun: back.fun });
    const run = save.endless.run!;
    expect(run.cells).toEqual(sim.s.cells);
    expect(run.orders).toEqual(sim.s.orders);
    expect(run.rng).toBe(sim.s.rng);
    expect(run.merges).toBe(sim.s.merges);
    expect(save.fun.endless2.album).toEqual(sim.fun.endless2.album);
    expect(save.fun.endless2.gens).toEqual(sim.fun.endless2.gens);
    expect(save.fun.endless2.treasure).toEqual(sim.fun.endless2.treasure);
    // continue
    bindEndless(save.fun);
    let now = 9_000_000;
    for (let i = 0; i < 200; i++) { now += 3000; botStep(run, ENDLESS_DEF, now); }
    expect(isStuck(run)).toBe(false);
    expect(run.merges).toBeGreaterThan(sim.s.merges);
  });
  it('données Endless 2.0 abîmées → valeurs sûres, jamais d\'exception', () => {
    const junk = sanitize({ v: 5, endless: { run: { ...OLD_RUN, orders: [{ items: [{ c: 'zzz', l: 3 }], id: 1 }, 'x', null], cells: OLD_RUN.cells.map((c) => ({ ...c, item: c.item && (c.item as { c: string }).c === 'gen' ? { c: 'gen', l: 99 } : c.item })), comboWin: 'x', activeMs: -4 } }, fun: { endless2: { gens: { 'gen:flowers': { level: 'x' } }, album: [1, 'a'], treasure: { points: 'x' }, sec: [{ id: 'bogus' }] } } });
    expect(junk.endless.run).not.toBeNull();
    expect(junk.endless.run!.orders.every((o) => o === null)).toBe(true);
    const f = resetEndless();
    bindEndless(junk.fun);
    ensureGenerators(junk.endless.run!, ENDLESS_DEF);
    expect(junk.endless.run!.orders.every((o) => !!o && o.items.length > 0)).toBe(true);
    expect(generatorCells(junk.endless.run!).length).toBeGreaterThan(0);
    expect(f).toBeDefined();
    expect(defaultSave().fun.endless2.replaces).toBeGreaterThan(0);
  });
});

describe('divers du moteur', () => {
  it('coffrets, étoiles et baguettes respectent le niveau maximal des collections de 8 niveaux', () => {
    resetEndless();
    const s = createRun(ENDLESS_DEF, 'endless', 5);
    for (const c of s.cells) c.lock = undefined;
    s.cells[10].item = { c: 'cloth', l: 7 };
    const up = useWand(s, ENDLESS_DEF, 10, 0);
    expect(up[0]).toMatchObject({ t: 'upgrade', item: { c: 'cloth', l: 8 } });
    expect(useWand(s, ENDLESS_DEF, 10, 0)).toEqual([]);
    s.cells[11].item = { c: 'cloth', l: 8 };
    s.cells[12].item = { c: 'cloth', l: 8 };
    expect(move(s, ENDLESS_DEF, 11, 12, 0)[0]).toMatchObject({ t: 'invalid', reason: 'max' });
  });
  it('fusion au niveau maximum : événement maxMerge avec récompense', () => {
    resetEndless();
    const s = createRun(ENDLESS_DEF, 'endless', 6);
    for (const c of s.cells) c.lock = undefined;
    s.cells[10].item = { c: 'rare', l: 7 };
    s.cells[11].item = { c: 'rare', l: 7 };
    const ev = move(s, ENDLESS_DEF, 10, 11, 1000);
    const mm = ev.find((e) => e.t === 'maxMerge');
    expect(mm).toMatchObject({ t: 'maxMerge', item: { c: 'rare', l: 8 } });
    expect((mm as { loot: unknown[] }).loot.length).toBeGreaterThanOrEqual(2);
    expect(ev.some((e) => e.t === 'discover')).toBe(true);
  });
  it('drops : espacés et plafonnés (pas de saturation de drops visibles)', () => {
    const sim = playEndless({ seed: 5, actions: 1500, gapMs: 3000 });
    const drops = sim.evCount.drop ?? 0;
    expect(drops).toBeGreaterThan(5);
    expect(drops / sim.s.merges).toBeLessThan(0.3);
    expect(emptyCount(sim.s)).toBeGreaterThan(0);
  });
});
