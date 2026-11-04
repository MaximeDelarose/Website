import { beforeEach, describe, expect, it } from 'vitest';
import { defaultFun } from '../src/save/fun';
import { ENDLESS_DEF, createRun } from '../src/game/merge/rules';
import { applyEvents, bindEndless, discover, albumTotal, type LootHost } from '../src/game/endless';
import { defaultWorld } from '../src/save/schema';
import {
  ReactionGate, albumClaims, albumCollViews, bestReaction, chestLook, costLines, easeCount, energyAdvice, fmtWait, groupLoot, limitChips, lootText, missingCostText,
  newlyReady, fr, orderCardModel, pct, rewardChips, secIcon, shouldRefund, usefulCells, REACTION_PRIO,
} from '../src/ui/endless/logic';
import type { BoardEvent } from '../src/game/merge/types';
import { COLLECTION_IDS, collMax } from '../src/data/items';

let fun = defaultFun();
beforeEach(() => { fun = defaultFun(); bindEndless(fun); });

describe('commandes', () => {
  it('3 cartes : palier, couleur, récompenses prévisibles', () => {
    const s = createRun(ENDLESS_DEF, 'endless', 7);
    const ms = [0, 1, 2].map((k) => orderCardModel(s, k)!);
    expect(ms.map((m) => m.tier)).toEqual(['easy', 'mid', 'hard']);
    expect(new Set(ms.map((m) => m.color)).size).toBe(3);
    for (const m of ms) {
      expect(m.items.length).toBeGreaterThan(0);
      expect(m.chips.some((c) => c.kind === 'coins' && c.n > 0)).toBe(true);
      expect(m.ratio).toBeGreaterThanOrEqual(0);
      expect(m.ratio).toBeLessThanOrEqual(1);
    }
  });
  it('une commande devient prête quand ses objets sont sur le plateau', () => {
    const s = createRun(ENDLESS_DEF, 'endless', 11);
    const o = s.orders[0]!;
    expect(orderCardModel(s, 0)!.ready).toBe(false);
    o.items.forEach((r, k) => { s.cells[30 + k].item = { ...r }; });
    const m = orderCardModel(s, 0)!;
    expect(m.ready).toBe(true);
    expect(m.cells.length).toBe(o.items.length);
    expect(m.items.every((x) => x.have)).toBe(true);
  });
  it('usefulCells repère les objets demandés même incomplets', () => {
    const s = createRun(ENDLESS_DEF, 'endless', 3);
    const o = s.orders[1]!;
    s.cells[20].item = { ...o.items[0] };
    expect(usefulCells(s, o)).toContain(20);
  });
  it('rewardChips : pièces, matériau, cœurs, énergie dans cet ordre', () => {
    const chips = rewardChips({ items: [{ c: 'flowers', l: 3 }], id: 1, reward: { hearts: 9, coins: 30, mat: 'flowers', matN: 2, energy: 3, treasure: 1 } });
    expect(chips.map((c) => c.kind)).toEqual(['coins', 'flowers', 'hearts', 'energy']);
    expect(chips[1].n).toBe(2);
  });
  it('newlyReady ne signale que les nouveaux passages à prêt', () => {
    expect(newlyReady([false, true, false], [true, true, false])).toEqual([0]);
    expect(newlyReady([false, false, false], [false, false, false])).toEqual([]);
  });
});

describe('coûts, butin, coffres', () => {
  it('costLines / missingCostText', () => {
    const lines = costLines({ coins: 120, flowers: 5 }, { coins: 200, flowers: 2, fabric: 0, cocoa: 0 });
    expect(lines.map((l) => l.ok)).toEqual([true, false]);
    expect(missingCostText(lines)).toBe('Il te manque 3 fleurs');
    expect(costLines(null, { coins: 0, flowers: 0, fabric: 0, cocoa: 0 })).toEqual([]);
  });
  it('groupLoot additionne les mêmes types et trie', () => {
    const g = groupLoot([{ kind: 'energy', n: 2 }, { kind: 'coins', n: 5 }, { kind: 'coins', n: 7 }]);
    expect(g).toEqual([{ kind: 'coins', n: 12 }, { kind: 'energy', n: 2 }]);
    expect(lootText({ kind: 'coins', n: 12 })).toBe('+12 pièces');
    expect(lootText({ kind: 'chest', n: 1 })).toBe('coffre');
  });
  it('chestLook : identité par rareté', () => {
    expect(chestLook('common').tier).toBe(0);
    expect(chestLook('legendary').color).toBe('#FFC857');
    expect(chestLook('legendary').confetti).toBe(true);
    expect(chestLook('rare').confetti).toBe(false);
    expect(chestLook('epic').shake).toBeGreaterThan(chestLook('common').shake);
    expect(chestLook('epic').title).toBe('Coffre épique');
  });
});

describe('énergie', () => {
  it('conseils : 0 = bienveillant avec options, jamais de blocage', () => {
    const a = energyAdvice(0, 12_000, 0);
    expect(a.tone).toBe('empty');
    expect(a.freeReady).toBe(true);
    expect(a.next).toContain('12 s');
    expect(a.lines.join(' ')).toContain('gratuit');
    expect(energyAdvice(3, 0, 5000).tone).toBe('low');
    expect(energyAdvice(100, 0, 0).next).toBe('Énergie pleine');
    expect(fmtWait(125_000)).toBe('2 min 05');
  });
  it('remboursement du toucher devenu gratuit', () => {
    expect(shouldRefund(true, [{ t: 'spawn', free: true, source: 'gen' }])).toBe(true);
    expect(shouldRefund(false, [{ t: 'spawn', free: true, source: 'gen' }])).toBe(false);
    expect(shouldRefund(true, [{ t: 'spawn', source: 'gen' }])).toBe(false);
  });
});

describe('réactions d\'Auguste', () => {
  it('au plus une toutes les 20 s, jamais pendant une fusion', () => {
    const g = new ReactionGate(20_000);
    expect(g.allow(1000, true)).toBe(false);
    expect(g.allow(1000, false)).toBe(true);
    g.mark(1000);
    expect(g.allow(15_000, false)).toBe(false);
    expect(g.allow(21_001, false)).toBe(true);
  });
  it('garde la réaction la plus importante d\'un lot', () => {
    const b = bestReaction([{ key: 'combo3', prio: REACTION_PRIO.combo3 }, { key: 'maxMerge', prio: REACTION_PRIO.maxMerge }]);
    expect(b?.key).toBe('maxMerge');
    expect(bestReaction([])).toBeNull();
  });
});

describe('affichage', () => {
  it('virgule décimale française', () => { expect(fr('Étoile filante : 0.6 %')).toBe('Étoile filante : 0,6 %'); expect(fr('Niveau 2.')).toBe('Niveau 2.'); });
  it('au plus 2 chips, pct borné, compteur animé', () => {
    expect(limitChips([1, 2, 3])).toEqual([1, 2]);
    expect(pct(5, 0)).toBe(0);
    expect(pct(150, 100)).toBe(100);
    expect(easeCount(0, 100, 0)).toBe(0);
    expect(easeCount(0, 100, 1)).toBe(100);
    expect(easeCount(10, 20, 0.5)).toBeGreaterThan(10);
    expect(secIcon('castle')).toBe('home');
    expect(secIcon('flower')).toBe('flower');
  });
});

describe('album', () => {
  it('14 collections, collMax, total 120', () => {
    const v = albumCollViews(fun);
    expect(v.length).toBe(14);
    expect(v.map((x) => x.max)).toEqual(COLLECTION_IDS.map((c) => collMax(c)));
    expect(v.reduce((a, x) => a + x.max, 0)).toBe(albumTotal());
    expect(albumTotal()).toBe(120); // 4×10 + 10×8
    expect(v.every((x) => x.found === 0)).toBe(true);
  });
  it('un objet découvert reste enregistré et la chaîne complète donne une récompense à prendre ou déjà versée', () => {
    for (let l = 1; l <= collMax('flowers'); l++) discover(fun, { c: 'flowers', l });
    const v = albumCollViews(fun).find((x) => x.coll === 'flowers')!;
    expect(v.complete).toBe(true);
    expect(v.cells.every((c) => c.found)).toBe(true);
    // la chaîne a été versée par le moteur : rien à réclamer pour elle
    expect(albumClaims(fun).some((c) => c.key === 'chain:flowers')).toBe(false);
  });
  it('album importé (sans récompense) : chaîne et palier réclamables', () => {
    for (let l = 1; l <= collMax('love'); l++) fun.endless2.album.push(`love:${l}`);
    for (let l = 1; l <= 3; l++) fun.endless2.album.push(`paris:${l}`);
    const claims = albumClaims(fun);
    expect(claims.map((c) => c.key)).toEqual(['chain:love', 'count:10']);
    expect(claims[0].loot.some((l) => l.kind === 'diamonds')).toBe(true); // diamants offerts, jamais exigés
    fun.endless2.albumClaimed.push('chain:love');
    expect(albumClaims(fun).map((c) => c.key)).toEqual(['count:10']);
  });
});

describe('versement unique (applyEvents)', () => {
  it('une livraison verse ses gains UNE fois', () => {
    const host = (): LootHost & { e: number; h: number } => {
      const w = defaultWorld();
      return { world: w as unknown as LootHost['world'], e: 0, h: 0, giveEnergy(n) { this.e += n; }, giveDiamonds() {}, addHearts(n) { this.h += n; }, giveBooster() {} };
    };
    const host1 = host();
    const ev: BoardEvent[] = [{ t: 'deliver', slot: 0, cells: [1], hearts: 8, points: 10, tier: 'easy', gain: { coins: 24, flowers: 2 }, energy: 3 }];
    const c0 = host1.world.res.coins;
    const f0 = host1.world.res.flowers;
    const r = applyEvents(host1, ev);
    expect(host1.world.res.coins - c0).toBe(24);
    expect(host1.world.res.flowers - f0).toBe(2);
    expect(host1.e).toBe(3);
    expect(host1.h).toBe(8);
    expect(r.text).toContain('24');
  });
});
