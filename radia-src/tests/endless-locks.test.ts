import { describe, it, expect, beforeEach } from 'vitest';
import { Rng } from '../src/utils/rng';
import { BOARD_SIZE, type BoardEvent, type Cell, type CellLock } from '../src/game/merge/types';
import {
  ENDLESS_DEF, afterAction, buyUnlock, createRun, deliver, emptyCount, ensureGenerators, generatorCells, idx, isStuck, move, orderCells, tapGenerator, boardZone, migrateEndless,
} from '../src/game/merge/rules';
import {
  ZONE_OF, MAX_ZONE, boardOf, boardPoints, capLocks, describeLock, lockPrice, lockedCount, makeLock, nextZone, openCount, surprisePlan, unlockRoutes, validLock, zoneFor,
} from '../src/game/merge/locks';
import { ENDLESS_CFG, activeColls, applyEvents, bindEndless, pendingChests, resetEndless } from '../src/game/endless';
import { sanitizeFun } from '../src/save/fun';
import { sanitize } from '../src/save/schema';
import { host, newSim } from './endless-helpers';

const B = ENDLESS_CFG.board;
const now0 = 1_000_000;

/** Partie neuve ; `bare` retire tous les verrous pour poser les siens. */
function run(seed = 1, bare = false) {
  const fun = resetEndless();
  const s = createRun(ENDLESS_DEF, 'endless', seed);
  if (bare) for (const c of s.cells) c.lock = undefined;
  return { fun, s };
}
const web = (coll: 'flowers' | 'love' = 'flowers', minLevel = 2, item = { c: coll, l: 3 }): CellLock => ({ kind: 'web', need: { t: 'adj', coll, minLevel }, price: 4, item });
const sand = (left = 2, zone?: number): CellLock => ({ kind: 'sand', need: { t: 'sand', left }, price: 3, ...(zone ? { zone } : {}) });
const put = (s: ReturnType<typeof createRun>, i: number, c: 'flowers' | 'love', l: number) => { s.cells[i].item = { c, l }; };
const kinds = (ev: BoardEvent[]) => ev.map((e) => e.t);

describe('cases verrouillées : plateau de départ', () => {
  beforeEach(() => resetEndless());
  it('zones : 36 cases, zone 0 = 28 cases ouvertes ; générateurs jamais sous un verrou', () => {
    expect(ZONE_OF.length).toBe(BOARD_SIZE);
    expect(ZONE_OF.filter((z) => z === 0).length).toBe(28);
    expect(Math.max(...ZONE_OF)).toBe(MAX_ZONE);
    const { s } = run(3);
    expect(generatorCells(s).length).toBeGreaterThanOrEqual(2);
    for (const g of generatorCells(s)) expect(s.cells[g].lock).toBeUndefined();
  });
  it('une partie neuve a des toiles, un coffre, une récompense visible, du sable ; les zones suivantes sont ensablées', () => {
    const { s, fun } = run(5);
    const locks = s.cells.map((c) => c.lock).filter(Boolean) as CellLock[];
    expect(locks.some((l) => l.kind === 'web' && l.item)).toBe(true);
    expect(locks.some((l) => l.kind === 'chest' && l.reward?.kind === 'chest')).toBe(true);
    expect(locks.some((l) => l.kind === 'reward' && l.reward)).toBe(true);
    expect(locks.some((l) => l.kind === 'sand' && !l.zone && l.reward)).toBe(true);
    const zoneSand = s.cells.filter((c, i) => ZONE_OF[i] > 0 && c.lock?.kind === 'sand').length;
    expect(zoneSand).toBe(ZONE_OF.filter((z) => z > 0).length);
    expect(boardOf(fun).zone).toBe(0);
    expect(s.board).toEqual({ v: 1 });
  });
  it('garantie : jamais plus de maxLocked cases verrouillées → au moins 14 cases ouvertes (16 visées), quelles que soient la graine et la zone', () => {
    expect(36 - B.maxLocked).toBeGreaterThanOrEqual(14);
    for (let seed = 1; seed <= 40; seed++) {
      for (const zone of [0, 1, 2, 3]) {
        const fun = resetEndless();
        boardOf(fun).zone = zone;
        fun.endless2.counters.orders = [0, 6, 16, 34][zone];
        const s = createRun(ENDLESS_DEF, 'endless', seed * 97);
        expect(openCount(s.cells), `graine ${seed} zone ${zone}`).toBeGreaterThanOrEqual(14);
        expect(lockedCount(s.cells)).toBeLessThanOrEqual(B.maxLocked);
      }
    }
  });
  it('chaque verrou a au moins une voie de libération accessible avec les générateurs actifs (énergie ≤ plancher, commande, fusion compatible…)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { s, fun } = run(seed);
      const act = activeColls(fun);
      for (const c of s.cells) {
        if (!c.lock) continue;
        const routes = unlockRoutes(c.lock, act, boardOf(fun).zone);
        expect(routes.length, `${c.lock.kind} graine ${seed}`).toBeGreaterThanOrEqual(2);
        expect(routes).toContain('energy');
        expect(c.lock.price).toBeLessThanOrEqual(ENDLESS_CFG.energy.floorLevel);
        if (c.lock.need.t === 'adj') expect(routes).toContain('merge');
        expect(describeLock(c.lock).objective.length).toBeGreaterThan(8);
      }
    }
  });
  it('surprisePlan : toujours une toile, un coffre, une récompense ; décoration exclusive seulement certaines séries', () => {
    for (let k = 1; k <= 12; k++) {
      const p = surprisePlan(new Rng(k), 6, k);
      expect(p).toContain('webItem'); expect(p).toContain('chest');
      expect(p.some((v) => ['diamonds', 'energy', 'fragment', 'deco'].includes(v))).toBe(true);
      expect(p.includes('deco')).toBe(k % 3 === 1 ? p.includes('deco') : false);
    }
  });
});

describe('libération : fusion adjacente', () => {
  beforeEach(() => resetEndless());
  it('fusionner un objet compatible à côté libère la toile : l\'objet apparaît, événement cellUnlock, découverte d\'album', () => {
    const { s, fun } = run(2, true);
    s.cells[idx(2, 2)].lock = web();
    put(s, idx(3, 2), 'flowers', 1); put(s, idx(4, 2), 'flowers', 1);
    const ev = move(s, ENDLESS_DEF, idx(4, 2), idx(3, 2), now0);
    const u = ev.find((e) => e.t === 'cellUnlock') as Extract<BoardEvent, { t: 'cellUnlock' }>;
    expect(u).toMatchObject({ at: idx(2, 2), kind: 'web', how: 'merge', item: { c: 'flowers', l: 3 } });
    expect(s.cells[idx(2, 2)].lock).toBeUndefined();
    expect(s.cells[idx(2, 2)].item).toEqual({ c: 'flowers', l: 3 });
    expect(ev.some((e) => e.t === 'discover' && e.item.c === 'flowers' && e.item.l === 3)).toBe(true);
    expect(boardOf(fun).opened.web).toBe(1);
    expect(boardOf(fun).opened['how:merge']).toBe(1);
  });
  it('une fusion d\'une AUTRE collection, ou trop basse, ne libère pas ; une fusion loin de la case non plus', () => {
    const { s } = run(2, true);
    s.cells[idx(2, 2)].lock = web('flowers', 3);
    put(s, idx(3, 2), 'love', 1); put(s, idx(4, 2), 'love', 1);
    expect(kinds(move(s, ENDLESS_DEF, idx(4, 2), idx(3, 2), now0))).not.toContain('cellUnlock');
    put(s, idx(3, 3), 'flowers', 1); put(s, idx(4, 3), 'flowers', 1);          // résultat niveau 2 < 3
    expect(kinds(move(s, ENDLESS_DEF, idx(4, 3), idx(3, 3), now0 + 5000))).not.toContain('cellUnlock');
    put(s, idx(0, 4), 'flowers', 1); put(s, idx(1, 4), 'flowers', 1);          // loin
    expect(kinds(move(s, ENDLESS_DEF, idx(1, 4), idx(0, 4), now0 + 9000))).not.toContain('cellUnlock');
    expect(s.cells[idx(2, 2)].lock).toBeDefined();
    put(s, idx(3, 3), 'flowers', 2); put(s, idx(4, 3), 'flowers', 2);          // résultat niveau 3 : adjacent en diagonale ? (3,3) est voisin de (3,2) mais pas de (2,2)
    move(s, ENDLESS_DEF, idx(4, 3), idx(3, 3), now0 + 12000);
    expect(s.cells[idx(2, 2)].lock).toBeDefined();
    put(s, idx(2, 3), 'flowers', 2); put(s, idx(1, 3), 'flowers', 2);          // (2,3) touche (2,2)
    const ev = move(s, ENDLESS_DEF, idx(1, 3), idx(2, 3), now0 + 15000);
    expect(kinds(ev)).toContain('cellUnlock');
  });
  it('le glissé depuis une case voisine compte aussi (le départ de la fusion touche la toile)', () => {
    const { s } = run(2, true);
    s.cells[idx(2, 2)].lock = web();
    put(s, idx(2, 3), 'flowers', 1); put(s, idx(4, 4), 'flowers', 1);
    // (2,3) -> (4,4) n'est pas adjacent aux deux mais la case de départ touche la toile : fusion par déplacement direct
    const ev = move(s, ENDLESS_DEF, idx(2, 3), idx(4, 4), now0);
    expect(kinds(ev)).toContain('cellUnlock');
  });
  it('sable : deux fusions voisines (lockHit puis cellUnlock), le sable de zone profonde résiste', () => {
    const { s } = run(4, true);
    s.cells[idx(2, 2)].lock = sand();
    s.cells[idx(5, 0)].lock = sand(2, 3);          // zone 3 : « profonde » tant que la zone atteinte est 0
    s.cells[idx(5, 1)].lock = sand(2, 2);
    put(s, idx(3, 2), 'flowers', 1); put(s, idx(4, 2), 'flowers', 1);
    const a = move(s, ENDLESS_DEF, idx(4, 2), idx(3, 2), now0);
    expect(a).toContainEqual({ t: 'lockHit', at: idx(2, 2), left: 1 });
    put(s, idx(4, 2), 'flowers', 2);
    const b = move(s, ENDLESS_DEF, idx(4, 2), idx(3, 2), now0 + 4000);   // (3,2) niv.2 + (4,2) niv.2
    expect(b.find((e) => e.t === 'cellUnlock')).toMatchObject({ at: idx(2, 2), kind: 'sand', how: 'merge' });
    expect(s.cells[idx(2, 2)].lock).toBeUndefined();
    expect(emptyCount(s)).toBeGreaterThan(0);
    // sable profond : une fusion à côté ne l'entame pas
    put(s, idx(4, 1), 'flowers', 1); put(s, idx(4, 2), 'flowers', 1);
    move(s, ENDLESS_DEF, idx(4, 2), idx(4, 1), now0 + 9000);
    expect(s.cells[idx(5, 0)].lock?.need).toEqual({ t: 'sand', left: 2 });
  });
});

describe('libération : commande, énergie, objectif, zones', () => {
  beforeEach(() => resetEndless());
  it('livrer une commande libère une case (celles qui cachent quelque chose d\'abord)', () => {
    const { s, fun } = run(6, true);
    s.cells[idx(0, 2)].lock = sand();
    s.cells[idx(1, 2)].lock = web();
    const o = s.orders[1]!;     // commande « moyenne » : libère une case (la facile n'en libère pas)
    const free = s.cells.map((c, i) => (!c.item ? i : -1)).filter((i) => i >= 0 && !s.cells[i].lock);
    o.items.forEach((r, k) => { s.cells[free[k]].item = { ...r }; });
    expect(orderCells(s, 1)).not.toBeNull();
    const ev = deliver(s, ENDLESS_DEF, 1, now0);
    const u = ev.filter((e) => e.t === 'cellUnlock') as Extract<BoardEvent, { t: 'cellUnlock' }>[];
    expect(u.length).toBe(1);
    expect(u[0]).toMatchObject({ kind: 'web', how: 'order' });
    expect(s.cells[idx(0, 2)].lock).toBeDefined();
    expect(boardOf(fun).opened['how:order']).toBe(1);
    // une commande facile n'en libère aucune
    const easy = s.orders[0]!;
    const spots = s.cells.map((c, i) => (!c.item && !c.lock ? i : -1)).filter((i) => i >= 0);
    easy.items.forEach((r, k) => { s.cells[spots[k]].item = { ...r }; });
    expect(deliver(s, ENDLESS_DEF, 0, now0 + 9000).some((e) => e.t === 'cellUnlock')).toBe(false);
  });
  it('énergie : le prix est affiché, payé une fois ; refusé = rien ne change ; l\'objet est déplaçable tout de suite', () => {
    const { s } = run(7, true);
    s.cells[idx(2, 2)].lock = web();
    let spent = 0;
    expect(buyUnlock(s, ENDLESS_DEF, idx(2, 2), () => false, now0)).toEqual([]);
    expect(s.cells[idx(2, 2)].lock).toBeDefined();
    const ev = buyUnlock(s, ENDLESS_DEF, idx(2, 2), (n) => { spent += n; return true; }, now0);
    expect(spent).toBe(4);
    expect(ev.find((e) => e.t === 'cellUnlock')).toMatchObject({ how: 'energy', item: { c: 'flowers', l: 3 } });
    expect(buyUnlock(s, ENDLESS_DEF, idx(2, 2), () => true, now0)).toEqual([]);      // plus de verrou : rien à payer
    // immédiatement déplaçable
    expect(move(s, ENDLESS_DEF, idx(2, 2), idx(3, 2), now0 + 100)[0]).toMatchObject({ t: 'move' });
  });
  it('prix : toujours abordables avec le plancher d\'énergie (≤ 6), croissants avec la valeur', () => {
    for (const k of ['web', 'chest', 'reward', 'sand', 'energy'] as const) expect(lockPrice(k)).toBeLessThanOrEqual(ENDLESS_CFG.energy.floorLevel);
    expect(lockPrice('sand', true)).toBeLessThanOrEqual(ENDLESS_CFG.energy.floorLevel);
    expect(lockPrice('sand')).toBeLessThan(lockPrice('chest'));
  });
  it('cadenas doux : libéré après N fusions (objectif de progression)', () => {
    const { s } = run(8, true);
    s.cells[idx(0, 2)].lock = { kind: 'energy', need: { t: 'goal', n: 3, base: 0 }, price: 5, item: { c: 'flowers', l: 2 } };
    let t = now0; let freed: BoardEvent | undefined;
    for (let k = 0; k < 4 && !freed; k++) {
      put(s, idx(4, 4), 'flowers', 1); put(s, idx(4, 5), 'flowers', 1); t += 5000;
      freed = move(s, ENDLESS_DEF, idx(4, 5), idx(4, 4), t).find((e) => e.t === 'cellUnlock');
      s.cells[idx(4, 4)].item = null;
    }
    expect(freed).toMatchObject({ kind: 'energy', how: 'goal' });
    expect(s.merges).toBe(3);
  });
  it('zones : la progression (commandes, chaînes, lieux ouverts) développe le plateau par étapes ; le sable de la zone se dissipe', () => {
    const { s, fun } = run(9);
    expect(zoneFor(fun)).toBe(0);
    expect(nextZone(fun)).toMatchObject({ zone: 1, need: B.zoneAt[1] });
    fun.endless2.counters.orders = B.zoneAt[1];
    const ev = afterAction(s, ENDLESS_DEF);
    expect(ev).toContainEqual(expect.objectContaining({ t: 'zone', zone: 1 }));
    expect(boardZone()).toBe(1);
    for (let i = 0; i < BOARD_SIZE; i++) if (ZONE_OF[i] === 1) expect(s.cells[i].lock).toBeUndefined();
    for (let i = 0; i < BOARD_SIZE; i++) if (ZONE_OF[i] >= 2) expect(s.cells[i].lock?.kind).toBe('sand');
    expect(ev.filter((e) => e.t === 'cellUnlock' && e.how === 'zone').length).toBe(ZONE_OF.filter((z) => z === 1).length);
    // lieux ouverts : +4 points chacun
    const before = boardPoints(fun);
    fun.places.tea = { stage: 4, progress: {}, done: true, seen: true, choices: {} };
    expect(boardPoints(fun)).toBe(before + B.placeBonus);
    fun.endless2.counters.orders = 5000;
    afterAction(s, ENDLESS_DEF);
    expect(boardZone()).toBe(MAX_ZONE);
    expect(s.cells.every((c) => !c.lock?.zone)).toBe(true);
    expect(nextZone(fun)).toBeNull();
  });
});

describe('récompenses visibles', () => {
  beforeEach(() => resetEndless());
  it('coffre derrière une toile : +1 coffre à ouvrir ; diamants / énergie : versés par applyEvents', () => {
    const { s, fun } = run(10, true);
    const rng = new Rng(3);
    s.cells[idx(2, 2)].lock = makeLock(rng, ['flowers'], 'chest');
    s.cells[idx(1, 2)].lock = makeLock(rng, ['flowers'], 'diamonds');
    s.cells[idx(0, 2)].lock = makeLock(rng, ['flowers'], 'energy');
    const before = pendingChests(fun);
    const sim = newSim(); sim.fun = fun; bindEndless(fun);   // newSim remet le moteur à zéro : on rebranche la partie
    const all: BoardEvent[] = [];
    for (const i of [idx(2, 2), idx(1, 2), idx(0, 2)]) all.push(...buyUnlock(s, ENDLESS_DEF, i, () => true, now0));
    expect(pendingChests(fun)).toBe(before + 1);
    expect(all.some((e) => e.t === 'chest' && e.source === 'lock')).toBe(true);
    const e0 = sim.eco.energy;
    const got = applyEvents(host(sim), all);
    expect(got.diamonds).toBeGreaterThanOrEqual(B.rewards.diamonds[0]);
    expect(got.energy).toBeGreaterThanOrEqual(B.rewards.energy[0]);
    expect(sim.eco.diamonds).toBeGreaterThanOrEqual(got.diamonds);
    expect(sim.eco.energy).toBeGreaterThanOrEqual(e0);
  });
  it('fragment de tenue et décoration exclusive : réglés par le moteur / le butin, sans doublon', () => {
    const { s, fun } = run(11, true);
    s.cells[idx(2, 2)].lock = makeLock(new Rng(1), ['flowers'], 'fragment');
    s.cells[idx(3, 2)].lock = makeLock(new Rng(2), ['flowers'], 'deco');
    const ev = [...buyUnlock(s, ENDLESS_DEF, idx(2, 2), () => true, now0), ...buyUnlock(s, ENDLESS_DEF, idx(3, 2), () => true, now0)];
    const sim = newSim(); bindEndless(fun);
    const got = applyEvents(host(sim), ev);
    expect(Object.values(fun.endless2.fragments).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(2);
    expect(got.furniture.length + got.dupCoins).toBeGreaterThanOrEqual(1);
  });
  it('objet rare sous toile : rareté marquée (paillettes), niveau ≥ 5 quand la collection le permet', () => {
    const l = makeLock(new Rng(4), ['flowers', 'love'], 'webRare');
    expect(['rare', 'epic']).toContain(l.rarity);
    expect(l.item!.l).toBeGreaterThanOrEqual(5);
    expect(l.price).toBeLessThanOrEqual(ENDLESS_CFG.energy.floorLevel);
  });
});

describe('persistance, nouvelle partie, migration, sérialisation', () => {
  beforeEach(() => resetEndless());
  it('la zone atteinte est durable : une nouvelle partie ne REVERROUILLE PAS le plateau et pose de NOUVELLES surprises', () => {
    const fun = resetEndless();
    fun.endless2.counters.orders = B.zoneAt[2];
    const s1 = createRun(ENDLESS_DEF, 'endless', 11);
    expect(boardOf(fun).zone).toBe(2);
    const sandNow = (s: typeof s1) => s.cells.filter((c) => c.lock?.kind === 'sand' && c.lock.zone).length;
    expect(sandNow(s1)).toBe(ZONE_OF.filter((z) => z > 2).length);
    const layout1 = JSON.stringify(s1.cells.map((c) => c.lock));
    const serial1 = boardOf(fun).serial;
    const s2 = createRun(ENDLESS_DEF, 'endless', 11);        // même graine de partie : surprises différentes (série durable)
    expect(boardOf(fun).serial).toBe(serial1 + 1);
    expect(sandNow(s2)).toBe(sandNow(s1));
    expect(JSON.stringify(s2.cells.map((c) => c.lock))).not.toBe(layout1);
    // rechargement : la zone survit à la sérialisation de la sauvegarde
    const back = sanitizeFun(JSON.parse(JSON.stringify(fun)));
    expect(back.endless2.board).toEqual(fun.endless2.board);
    bindEndless(back);
    expect(createRun(ENDLESS_DEF, 'endless', 5).cells.filter((c) => c.lock?.zone).length).toBe(ZONE_OF.filter((z) => z > 2).length);
  });
  it('sérialisation d\'une partie en cours : verrous conservés, ordre et contenu identiques après sanitize', () => {
    const { s, fun } = run(12);
    const save = sanitize({ v: 5, endless: { best: 0, runs: 1, run: JSON.parse(JSON.stringify(s)), challenges: 0 }, fun: JSON.parse(JSON.stringify(fun)) });
    const back = save.endless.run!;
    expect(back.cells.map((c) => c.lock)).toEqual(s.cells.map((c) => c.lock));
    expect(back.board).toEqual({ v: 1 });
    expect(lockedCount(back.cells)).toBe(lockedCount(s.cells));
  });
  it('verrous abîmés : supprimés sans planter ; trop de verrous : plafonnés ; un objet vivant garde sa case', () => {
    expect(validLock(null)).toBeNull();
    expect(validLock({ kind: 'zzz' })).toBeNull();
    expect(validLock({ kind: 'web', need: { t: 'adj', coll: 'martien', minLevel: 2 }, price: 99, item: { c: 'flowers', l: 99 }, reward: { kind: 'hack', n: 1 } })).toMatchObject({ kind: 'web', price: 10 });
    const v = validLock({ kind: 'web', need: { t: 'adj', coll: 'flowers', minLevel: 99 }, price: 4, item: { c: 'flowers', l: 99 }, reward: { kind: 'diamonds', n: 99999 } })!;
    expect(v.item).toBeUndefined();
    expect(v.reward!.n).toBeLessThanOrEqual(999);
    expect(v.need).toMatchObject({ t: 'adj', coll: 'flowers' });
    const cells: Cell[] = Array.from({ length: BOARD_SIZE }, () => ({ item: null, gift: null, lock: sand() }));
    cells[3].lock = undefined;
    cells[4].item = { c: 'flowers', l: 1 };
    capLocks(cells);
    expect(lockedCount(cells)).toBeLessThanOrEqual(B.maxLocked);
    expect(cells[4].lock).toBeUndefined();
    const junk = sanitize({ v: 5, endless: { run: { mode: 'endless', cells: Array.from({ length: 36 }, () => ({ item: null, gift: null, lock: { kind: 'sand', need: 'x', price: 'y' } })), orders: [], board: 'x' } } });
    expect(junk.endless.run!.cells.filter((c) => c.lock).length).toBeLessThanOrEqual(B.maxLocked);
    expect(junk.endless.run!.cells.every((c) => !c.lock || c.lock.price <= 10)).toBe(true);
  });
  it('migration : une ancienne partie (sans verrous) reste ENTIÈREMENT ouverte, objets intacts, au plus 3 surprises sur des cases vides', () => {
    const { s, fun } = run(13, true);
    delete s.board;
    put(s, idx(1, 1), 'flowers', 3); put(s, idx(4, 3), 'love', 2);
    const before = JSON.stringify(s.cells.map((c) => c.item));
    migrateEndless(s, ENDLESS_DEF);
    expect(s.board).toEqual({ v: 1 });
    expect(boardOf(fun).zone).toBe(MAX_ZONE);
    expect(s.cells.some((c) => c.lock?.zone)).toBe(false);
    expect(lockedCount(s.cells)).toBeLessThanOrEqual(3);
    expect(JSON.stringify(s.cells.map((c) => c.item))).toBe(before);
    for (const c of s.cells) if (c.lock) expect(c.item).toBeNull();
    expect(openCount(s.cells)).toBeGreaterThanOrEqual(33);
    ensureGenerators(s, ENDLESS_DEF);
    expect(generatorCells(s).length).toBeGreaterThan(0);
  });
});

describe('moteur avec cases verrouillées', () => {
  beforeEach(() => resetEndless());
  it('déplacer vers / depuis une case verrouillée est refusé (invalid locked) ; un générateur ne produit jamais dedans', () => {
    const { s } = run(14, true);
    s.cells[idx(2, 2)].lock = web();
    put(s, idx(3, 2), 'flowers', 1);
    expect(move(s, ENDLESS_DEF, idx(3, 2), idx(2, 2), now0)).toEqual([{ t: 'invalid', from: idx(3, 2), to: idx(2, 2), reason: 'locked' }]);
    expect(move(s, ENDLESS_DEF, idx(2, 2), idx(3, 3), now0)[0]).toMatchObject({ reason: 'locked' });
    expect(s.cells[idx(3, 2)].item).toEqual({ c: 'flowers', l: 1 });
    for (let k = 0; k < 60; k++) tapGenerator(s, ENDLESS_DEF, generatorCells(s)[0], now0 + k * 3000);
    expect(s.cells[idx(2, 2)].item).toBeNull();
    expect(s.cells[idx(2, 2)].lock).toBeDefined();
  });
  it('anti-blocage : plateau (cases ouvertes) plein sans fusion ni livraison → une issue, les verrous restent', () => {
    const { s } = run(15);
    const colls = ['love', 'paris', 'chess'] as const;
    let k = 0;
    s.cells.forEach((c) => { if (!c.lock && !c.item) c.item = { c: colls[k++ % 3], l: 1 + (k % 5) + (k % 3) * 0 }; });
    // aucune paire identique → on force l'unicité
    const seen = new Set<string>();
    s.cells.forEach((c) => { if (c.item && c.item.c !== 'gen') { let l = 1; while (seen.has(`${c.item.c}:${l}`) && l < 10) l++; seen.add(`${c.item.c}:${l}`); c.item = { c: c.item.c, l }; } });
    const lockedBefore = lockedCount(s.cells);
    const ev = tapGenerator(s, ENDLESS_DEF, generatorCells(s)[0], now0);
    expect(emptyCount(s)).toBe(0);
    expect(isStuck(s) && !ev.some((e) => e.t === 'rescue')).toBe(false);
    expect(lockedCount(s.cells)).toBe(lockedBefore);
  });
});
