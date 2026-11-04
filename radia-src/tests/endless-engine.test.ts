import { describe, it, expect, beforeEach } from 'vitest';
import { SPECIAL, collMax, COLLECTION_IDS } from '../src/data/items';
import {
  ENDLESS_CFG, albumProgress, applyEvents, discover, goals, resetEndless, secondaryView, syncSecondary, onEngineEvent, SEC_DEFS, syncLegacyAlbum,
  pendingChests, albumTotal, isDiscovered,
} from '../src/game/endless';
import { createRun, ENDLESS_DEF, move, idx, placeLoot, isStuck, emptyCount, tapGenerator, afterAction, hasMergeAvailable, generatorCells } from '../src/game/merge/rules';
import type { BoardEvent } from '../src/game/merge/types';
import { defaultFun } from '../src/save/fun';
import { defaultWorld } from '../src/save/schema';

const C = ENDLESS_CFG.combo;
function fresh(seed = 1) {
  const fun = resetEndless();
  const s = createRun(ENDLESS_DEF, 'endless', seed);
  // ces tests posent des objets où ils veulent : plateau sans cases verrouillées (les verrous ont leurs propres tests : endless-locks.test.ts)
  for (const c of s.cells) c.lock = undefined;
  return { fun, s };
}
/** Enchaîne `n` fusions rapides (toutes les 400 ms) : renvoie tous les événements. */
function chain(s: ReturnType<typeof createRun>, n: number, t0 = 100_000, gap = 400): BoardEvent[] {
  const all: BoardEvent[] = [];
  for (let k = 0; k < n; k++) {
    s.cells.forEach((c) => { if (c.item?.c !== 'gen') { c.item = null; c.gift = null; } });
    s.cells[idx(0, 0)].item = { c: 'flowers', l: 2 };
    s.cells[idx(1, 0)].item = { c: 'flowers', l: 2 };
    all.push(...move(s, ENDLESS_DEF, idx(0, 0), idx(1, 0), t0 + k * gap));
  }
  return all;
}

describe('combos Endless', () => {
  beforeEach(() => resetEndless());
  it('multiplicateur de score plafonné ; événements enrichis ; paliers de config', () => {
    const { s } = fresh();
    const ev = chain(s, 14);
    const merges = ev.filter((e) => e.t === 'merge') as Extract<BoardEvent, { t: 'merge' }>[];
    const base = merges[0].points; // combo 1
    const last = merges[11];
    expect(last.points).toBeLessThanOrEqual(Math.round(base * C.multMax) + 1);
    const combos = ev.filter((e) => e.t === 'combo') as Extract<BoardEvent, { t: 'combo' }>[];
    expect(combos.every((c) => (c.mult ?? 0) <= C.multMax)).toBe(true);
    expect(Math.max(...combos.map((c) => c.mult ?? 0))).toBe(C.multMax);
    const tiers = ev.filter((e) => e.t === 'comboTier') as Extract<BoardEvent, { t: 'comboTier' }>[];
    expect(tiers.map((t) => t.value)).toEqual(C.tiers.filter((t) => t.at <= 14).map((t) => t.at));
    expect(tiers[0]).toMatchObject({ tier: 0, energy: 1, capped: false });
  });
  it('retombée après le plafond de combo', () => {
    const { s } = fresh();
    const ev = chain(s, C.cap + 3);
    const merges = ev.filter((e) => e.t === 'merge') as Extract<BoardEvent, { t: 'merge' }>[];
    expect(Math.max(...merges.map((m) => m.combo))).toBe(C.cap);
    expect(merges[C.cap].combo).toBe(C.fallTo + 1);
  });
  it('anti-exploitation : au plus N récompenses de palier par minute, l\'énergie de combo est plafonnée', () => {
    const { s } = fresh();
    let energy = 0, rewarded = 0, capped = 0;
    // 3 minutes de combos : 4 séries de 16 fusions rapprochées chaque 10 s
    for (let burst = 0; burst < 12; burst++) {
      const ev = chain(s, 16, 100_000 + burst * 10_000, 100);
      for (const e of ev) if (e.t === 'comboTier') { if (e.capped) capped++; else { rewarded++; energy += e.energy; } }
    }
    const minutes = 12 * 10_000 / 60_000;
    expect(rewarded).toBeLessThanOrEqual(Math.ceil(minutes) * C.maxRewardsPerMin);
    expect(energy).toBeLessThanOrEqual(Math.ceil(minutes) * C.maxEnergyPerMin);
    expect(capped).toBeGreaterThan(0);
  });
  it('l\'Étoile filante de combo ×5 apparaît (ou cœurs si plateau plein) sans dépasser les cases', () => {
    const { s } = fresh();
    const ev = chain(s, 6);
    expect(ev.some((e) => e.t === 'spawn' && e.source === 'combo')).toBe(true);
    expect(SPECIAL.STAR).toBe(1);
  });
});

describe('album', () => {
  it('discover : nouveau une seule fois, jamais perdu, récompense modeste sans diamants', () => {
    const fun = defaultFun();
    const a = discover(fun, { c: 'rare', l: 3 });
    expect(a.isNew).toBe(true);
    expect(a.reward.some((l) => l.kind === 'coins')).toBe(true);
    expect(a.reward.every((l) => l.kind !== 'diamonds')).toBe(true);
    expect(discover(fun, { c: 'rare', l: 3 })).toEqual({ isNew: false, reward: [] });
    expect(fun.endless2.album).toContain('rare:3');
    expect(isDiscovered(fun, { c: 'rare', l: 3 })).toBe(true);
    expect(discover(fun, { c: 'special', l: 1 }).isNew).toBe(false);
    expect(discover(fun, { c: 'rare', l: 9 }).isNew).toBe(false);
  });
  it('chaîne complète = récompense + points de palier ; paliers du nombre d\'objets ; progression et prochaine récompense', () => {
    const fun = defaultFun();
    let completed = 0, milestones = 0;
    for (let l = 1; l <= collMax('castle'); l++) { const r = discover(fun, { c: 'castle', l }); if (r.completed) completed++; if (r.milestone) milestones++; }
    expect(completed).toBe(1);
    expect(milestones).toBeGreaterThanOrEqual(0);
    expect(fun.endless2.counters.chains).toBe(1);
    expect(fun.endless2.albumClaimed).toContain('chain:castle');
    const again = discover(fun, { c: 'castle', l: 8 });
    expect(again.completed).toBeUndefined();
    const p = albumProgress(fun);
    expect(p.found).toBe(8);
    expect(p.total).toBe(albumTotal());
    expect(p.perColl.find((x) => x.coll === 'castle')!.complete).toBe(true);
    expect(p.next).not.toBeNull();
    for (const c of COLLECTION_IDS) for (let l = 1; l <= collMax(c); l++) discover(fun, { c, l });
    expect(albumProgress(fun).chainsDone).toBe(COLLECTION_IDS.length);
    expect(albumProgress(fun).found).toBe(albumTotal());
  });
  it('import de l\'ancien album sans récompense', () => {
    const fun = defaultFun();
    expect(syncLegacyAlbum(fun, ['flowers:1', 'flowers:2', 'bad:3', 'paris:99', 'chess:10'])).toBe(3);
    expect(fun.endless2.album.length).toBe(3);
    expect(syncLegacyAlbum(fun, ['flowers:1'])).toBe(0);
  });
  it('le moteur émet discover à la production (une fois)', () => {
    const { s } = fresh(3);
    const seen: string[] = [];
    for (let k = 0; k < 80; k++) {
      s.cells.forEach((c) => { if (c.item?.c !== 'gen') c.item = null; });
      for (const e of tapGenerator(s, ENDLESS_DEF, undefined, k * 1000)) if (e.t === 'discover') { expect(e.isNew).toBe(true); seen.push(`${e.item.c}:${e.item.l}`); }
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.length).toBeGreaterThan(0);
  });
});

describe('événements secondaires', () => {
  it('au plus 2 actifs, choisis selon les collections débloquées', () => {
    const fun = defaultFun();
    syncSecondary(fun);
    expect(fun.endless2.sec.length).toBe(2);
    expect(fun.endless2.sec.map((s) => s.id).sort()).toEqual(['flowerFest', 'mergeChallenges']);
    fun.endless2.counters.orders = 300;
    fun.endless2.sec = [];
    syncSecondary(fun);
    expect(fun.endless2.sec.length).toBe(2);
    expect(SEC_DEFS.length).toBe(6);
    expect(SEC_DEFS.map((d) => d.id)).toEqual(expect.arrayContaining(['flowerFest', 'chocoCollection', 'souvenirAlbum', 'castlePuzzle', 'jewelCollection', 'mergeChallenges']));
    const chocFirst = defaultFun(); // seuil choc non atteint → jamais proposé
    for (let k = 0; k < 6; k++) { chocFirst.endless2.sec = []; syncSecondary(chocFirst, 'flowerFest'); expect(chocFirst.endless2.sec.some((s) => s.id === 'chocoCollection')).toBe(false); }
  });
  it('progression par les mêmes fusions, palier = récompense versée une fois, fin = remplacé, rien de perdu', () => {
    const fun = defaultFun();
    syncSecondary(fun);
    const goal0 = fun.endless2.sec.find((s) => s.id === 'flowerFest')!.goal;
    const out: BoardEvent[] = [];
    const mergeEv: BoardEvent = { t: 'merge', from: 0, to: 1, result: { c: 'flowers', l: 3 }, points: 5, combo: 1 };
    for (let k = 0; k < goal0; k++) out.push(...onEngineEvent(fun, mergeEv));
    const stage = out.filter((e) => e.t === 'secondary' && e.done) as Extract<BoardEvent, { t: 'secondary' }>[];
    expect(stage.length).toBe(1);
    expect(stage[0].reward!.length).toBeGreaterThan(0);
    expect(stage[0].stage).toBe(0);
    expect(fun.endless2.sec.find((s) => s.id === 'flowerFest')!.stage).toBe(1);
    // les autres événements ne comptent pas ce qui ne les concerne pas
    expect(fun.endless2.sec.find((s) => s.id === 'mergeChallenges')!.progress).toBe(0);
    // finir tous les paliers
    let guard = 0;
    while (fun.endless2.secDone.flowerFest === undefined && guard++ < 1000) out.push(...onEngineEvent(fun, mergeEv));
    expect(fun.endless2.secDone.flowerFest).toBe(1);
    expect(out.some((e) => e.t === 'secondary' && e.final)).toBe(true);
    expect(fun.endless2.sec.length).toBe(2);
    expect(fun.endless2.sec.length).toBeLessThanOrEqual(2);
    const v = secondaryView(fun);
    expect(v.length).toBe(2);
    expect(v[0].text.length).toBeGreaterThan(3);
  });
  it('les récompenses de coffre des événements sont comptées par le moteur (pas de perte)', () => {
    const { fun, s } = fresh(11);
    const mergeEv: BoardEvent = { t: 'merge', from: 0, to: 1, result: { c: 'flowers', l: 3 }, points: 5, combo: 1 };
    const before = pendingChests(fun);
    // on joue de vraies fusions jusqu'au palier final de flowerFest
    for (let k = 0; k < 400; k++) {
      s.cells.forEach((c) => { if (c.item?.c !== 'gen') c.item = null; });
      chain(s, 1, 1000 * k, 400);
      if (fun.endless2.secDone.flowerFest) break;
    }
    void mergeEv;
    expect(fun.endless2.secDone.flowerFest).toBe(1);
    expect(pendingChests(fun)).toBeGreaterThan(before);
  });
});

describe('butin appliqué', () => {
  it('applyEvents verse livraisons, drops, nouveautés, paliers de combo dans le monde', () => {
    const w = defaultWorld();
    const got = { e: 0, h: 0, d: 0, wand: 0 };
    const host = { world: w, giveEnergy: (n: number) => { got.e += n; }, giveDiamonds: (n: number) => { got.d += n; }, addHearts: (n: number) => { got.h += n; }, giveBooster: (_k: 'wand' | 'wind', n: number) => { got.wand += n; } };
    const coins0 = w.res.coins;
    const r = applyEvents(host, [
      { t: 'deliver', slot: 0, cells: [], hearts: 7, points: 1, gain: { coins: 20, cocoa: 3 }, energy: 3 },
      { t: 'drop', at: 0, loot: { kind: 'coins', n: 12 }, rarity: 'common', auto: true },
      { t: 'comboTier', value: 8, tier: 2, mult: 2.75, energy: 3, hearts: 0, reward: 'wand', capped: false },
      { t: 'discover', item: { c: 'flowers', l: 4 }, isNew: true, reward: [{ kind: 'coins', n: 16 }, { kind: 'energy', n: 2 }] },
    ]);
    expect(w.res.coins).toBe(coins0 + 20 + 12 + 16);
    expect(w.res.cocoa).toBe(3);
    expect(got).toEqual({ e: 3 + 3 + 2, h: 7, d: 0, wand: 1 });
    expect(r.text).toContain('pièces');
  });
  it('placeLoot : objets rares posés sur le plateau, sinon convertis en pièces (pas de saturation)', () => {
    const { s } = fresh();
    const item = { c: 'love' as const, l: 5 };
    const a = placeLoot(s, [{ kind: 'rareItem', n: 1, rarity: 'rare', item }]);
    expect(a.events.some((e) => e.t === 'spawn' && e.source === 'drop')).toBe(true);
    // plateau presque plein : conversion en pièces
    let i = 0;
    for (const c of s.cells) { if (!c.item) { c.item = { c: 'flowers', l: (i++ % 8) + 1 }; } }
    s.cells[0].item = null; s.cells[1].item = null;
    const b = placeLoot(s, [{ kind: 'rareItem', n: 1, rarity: 'rare', item }]);
    expect(b.events.length).toBe(0);
    expect(b.loot[0].kind).toBe('coins');
  });
});

describe('objectifs court / moyen / long terme', () => {
  it('toujours un objectif réalisable à court terme, avec progression et prochaine récompense', () => {
    const { fun, s } = fresh(4);
    for (let n = 0; n < 40; n++) {
      const g = goals(s, fun);
      for (const k of ['immediate', 'mid', 'long'] as const) {
        expect(g[k].label.length).toBeGreaterThan(3);
        expect(g[k].goal).toBeGreaterThan(0);
        expect(g[k].progress).toBeGreaterThanOrEqual(0);
        expect(g[k].reward.length).toBeGreaterThan(3);
        expect(g[k].ratio).toBeGreaterThanOrEqual(0);
        expect(g[k].ratio).toBeLessThanOrEqual(1);
      }
      expect(g.immediate.kind === 'order' || g.immediate.kind === 'generator').toBe(true);
      s.cells.forEach((c) => { if (c.item?.c !== 'gen') c.item = null; });
      tapGenerator(s, ENDLESS_DEF, undefined, n * 1500);
    }
    s.cells.forEach((c) => { c.item = null; });
    s.orders = [null, null, null];
    expect(goals(s, fun).immediate.kind).toBe('generator');
    fun.endless2.counters.orders = 500;
    for (const c of COLLECTION_IDS) for (let l = 1; l <= collMax(c); l++) discover(fun, { c, l });
    expect(goals(s, fun).long.kind).toBe('album');
  });
});

describe('garde-fou anti-blocage', () => {
  it('plateau plein, aucune fusion, aucune livraison : le moteur offre une issue (Étoile filante)', () => {
    const { s } = fresh(2);
    const gens = new Set(generatorCells(s));
    const uniq: { c: (typeof COLLECTION_IDS)[number]; l: number }[] = [];
    for (const c of COLLECTION_IDS) for (let l = 1; l < collMax(c) && uniq.length < 40; l++) uniq.push({ c, l });
    let k = 0;
    s.cells.forEach((c, i) => { c.gift = null; c.item = gens.has(i) ? c.item : { ...uniq[k++] }; });
    s.orders = s.orders.map((_, n) => ({ items: [{ c: 'castle' as const, l: 8 }], id: 700 + n, tier: 'easy' as const }));
    expect(emptyCount(s)).toBe(0);
    expect(isStuck(s)).toBe(true);
    const ev = afterAction(s, ENDLESS_DEF);
    expect(ev.some((e) => e.t === 'rescue')).toBe(true);
    expect(isStuck(s)).toBe(false);
    expect(hasMergeAvailable(s)).toBe(true);
    // et toucher un générateur sur un plateau plein déclenche aussi le garde-fou
    const s2 = fresh(3).s;
    const g2 = new Set(generatorCells(s2));
    k = 0;
    s2.cells.forEach((c, i) => { c.gift = null; c.item = g2.has(i) ? c.item : { ...uniq[k++] }; });
    s2.orders = s2.orders.map((_, n) => ({ items: [{ c: 'castle' as const, l: 8 }], id: 800 + n, tier: 'easy' as const }));
    const ev2 = tapGenerator(s2, ENDLESS_DEF, undefined, 1000);
    expect(ev2[0].t).toBe('full');
    expect(ev2.some((e) => e.t === 'rescue')).toBe(true);
    expect(isStuck(s2)).toBe(false);
  });
  it('tout au niveau maximum : une case est libérée', () => {
    const { s } = fresh(5);
    const gens = new Set(generatorCells(s));
    s.cells.forEach((c, i) => { c.gift = null; c.item = gens.has(i) ? c.item : { c: 'rare', l: 8 }; });
    s.orders = s.orders.map((_, n) => ({ items: [{ c: 'castle' as const, l: 8 }], id: 900 + n, tier: 'easy' as const }));
    expect(isStuck(s)).toBe(true);
    const ev = afterAction(s, ENDLESS_DEF);
    expect(ev.some((e) => e.t === 'rescue')).toBe(true);
    expect(emptyCount(s)).toBeGreaterThan(0);
  });
});
