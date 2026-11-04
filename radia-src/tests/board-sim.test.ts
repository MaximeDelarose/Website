import { describe, it, expect } from 'vitest';
import { Rng } from '../src/utils/rng';
import { BOARD_SIZE } from '../src/game/merge/types';
import { ENDLESS_DEF, buyUnlock, createRun, emptyCount, generatorCells, hasMergeAvailable, isStuck, move, orderCells, tapGenerator } from '../src/game/merge/rules';
import { boardOf, lockedCount, openCount } from '../src/game/merge/locks';
import { botStep } from '../src/game/merge/bot';
import { resetEndless } from '../src/game/endless';
import { playEndless } from './endless-helpers';

describe('simulation avec cases verrouillées', () => {
  it('bot normal, 2000 actions × 4 graines : jamais bloqué, toujours ≥ 14 cases ouvertes, les verrous se libèrent au fil de la progression', () => {
    const rows: string[] = [];
    for (const seed of [1, 2, 3, 4]) {
      let minOpen = 99;
      let maxLocked = 0;
      const sim = playEndless({
        seed, actions: 2000, gapMs: 3500,
        onEvents: (_ev, _i, s) => { minOpen = Math.min(minOpen, openCount(s.s.cells)); maxLocked = Math.max(maxLocked, lockedCount(s.s.cells)); },
      });
      expect(minOpen, `graine ${seed}`).toBeGreaterThanOrEqual(14);
      expect(isStuck(sim.s)).toBe(false);
      expect(sim.maxEmptyStreak).toBeLessThanOrEqual(2);
      const b = boardOf(sim.fun);
      const opened = sim.fun.endless2.counters.cellsOpened ?? 0;
      expect(opened, 'cases libérées').toBeGreaterThan(8);
      expect(b.zone, 'zone atteinte').toBeGreaterThanOrEqual(1);
      expect((b.opened['how:merge'] ?? 0) + (b.opened['how:order'] ?? 0)).toBeGreaterThan(0);
      rows.push(`graine ${seed} : ${opened} cases libérées (fusion ${b.opened['how:merge'] ?? 0}, commande ${b.opened['how:order'] ?? 0}, zone ${b.opened['how:zone'] ?? 0}) · zone ${b.zone} · min cases ouvertes ${minOpen} · max verrouillées ${maxLocked} · ${sim.s.ordersDone} commandes`);
    }
    console.log(`[verrous] bot normal 2000 actions\n${rows.join('\n')}`);
  }, 120_000);

  it('bot qui paie aussi l\'énergie (1 libération par 25 actions, prix affiché) : tout finit par se libérer, aucun blocage', () => {
    resetEndless();
    const s = createRun(ENDLESS_DEF, 'endless', 99);
    let now = 5_000_000;
    let spent = 0;
    let buys = 0;
    let minOpen = 99;
    for (let i = 0; i < 2000; i++) {
      now += 3000;
      if (i % 25 === 0) {
        const idx = s.cells.findIndex((c) => !!c.lock);
        if (idx >= 0 && buyUnlock(s, ENDLESS_DEF, idx, (n) => { spent += n; return true; }, now).length) buys++;
      }
      botStep(s, ENDLESS_DEF, now);
      minOpen = Math.min(minOpen, openCount(s.cells));
      expect(emptyCount(s) > 0 || hasMergeAvailable(s) || s.orders.some((_, k) => !!orderCells(s, k)) || !isStuck(s)).toBe(true);
    }
    expect(minOpen).toBeGreaterThanOrEqual(14);
    expect(buys).toBeGreaterThan(5);
    expect(spent / buys).toBeLessThanOrEqual(6);
    console.log(`[verrous] bot payant : ${buys} libérations par énergie (≈ ${(spent / buys).toFixed(1)} ⚡ chacune), cases verrouillées restantes ${lockedCount(s.cells)}`);
  }, 120_000);

  it('joueur maladroit (actions au hasard, y compris vers des cases verrouillées) : une issue à chaque action, les verrous ne cassent rien', () => {
    for (const seed of [21, 22, 23]) {
      resetEndless();
      const s = createRun(ENDLESS_DEF, 'endless', seed);
      const rng = new Rng(seed * 31);
      let now = 1_000_000;
      for (let i = 0; i < 2000; i++) {
        now += 1200;
        if (rng.next() < 0.5) tapGenerator(s, ENDLESS_DEF, rng.pick(generatorCells(s)), now);
        else move(s, ENDLESS_DEF, rng.int(BOARD_SIZE), rng.int(BOARD_SIZE), now);
        expect(openCount(s.cells), `graine ${seed} action ${i}`).toBeGreaterThanOrEqual(14);
        expect(emptyCount(s) > 0 || hasMergeAvailable(s) || s.orders.some((_, k) => !!orderCells(s, k))).toBe(true);
        for (const c of s.cells) if (c.lock) expect(c.item).toBeNull();
      }
    }
  }, 120_000);
});
