import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { allItems, itemKey, SPECIAL } from '../src/data/items';
import {
  createRun, move, tapGenerator, deliver, isStuck, recover, idx, useWand, useWind, tapItem, cloneRun, stars,
  generatorCells, stashItem, placeItem,
} from '../src/game/merge/rules';
import { simulate } from '../src/game/merge/bot';
import { BOARD_SIZE, type LevelDef } from '../src/game/merge/types';

const base: LevelDef = {
  id: 999, chapter: 1, title: 't', hint: '', dominant: 'flowers', difficulty: 1,
  gen: [['flowers', 1, 1]], objectives: [{ t: 'create', item: ['flowers', 4] }], par: 5, reward: { hearts: 1 },
};
const count = (s: ReturnType<typeof createRun>) => s.cells.filter((c) => (c.item && c.item.c !== 'gen') || c.gift).length;

describe('objets', () => {
  it('au moins 40 objets fusionnables distincts', () => {
    const all = allItems();
    expect(all.filter((i) => i.c !== 'special').length).toBeGreaterThanOrEqual(40);
    expect(new Set(all.map(itemKey)).size).toBe(all.length);
  });
});

describe('règles de fusion', () => {
  it('déplacement vers une case vide', () => {
    const s = createRun({ ...base, start: [{ x: 0, y: 0, c: 'flowers', l: 1 }] });
    const ev = move(s, base, idx(0, 0), idx(3, 3), 0);
    expect(ev[0].t).toBe('move');
    expect(s.cells[idx(3, 3)].item).toEqual({ c: 'flowers', l: 1 });
    expect(s.cells[idx(0, 0)].item).toBeNull();
  });

  it('fusion valide : deux objets → exactement un objet de niveau supérieur', () => {
    const s = createRun({ ...base, start: [{ x: 0, y: 0, c: 'flowers', l: 2 }, { x: 1, y: 0, c: 'flowers', l: 2 }] });
    const before = count(s);
    const ev = move(s, base, 0, 1, 1000);
    expect(ev[0]).toMatchObject({ t: 'merge', result: { c: 'flowers', l: 3 } });
    expect(count(s)).toBe(before - 1);
    expect(s.cells[1].item).toEqual({ c: 'flowers', l: 3 });
  });

  it('fusion invalide : objets différents → rien ne change', () => {
    const s = createRun({ ...base, start: [{ x: 0, y: 0, c: 'flowers', l: 2 }, { x: 1, y: 0, c: 'love', l: 2 }] });
    const snap = JSON.stringify(s.cells);
    const ev = move(s, base, 0, 1, 0);
    expect(ev[0]).toMatchObject({ t: 'invalid', reason: 'different' });
    expect(JSON.stringify(s.cells)).toBe(snap);
  });

  it('niveau maximum : pas de fusion', () => {
    const s = createRun({ ...base, start: [{ x: 0, y: 0, c: 'love', l: 10 }, { x: 1, y: 0, c: 'love', l: 10 }] });
    expect(move(s, base, 0, 1, 0)[0]).toMatchObject({ t: 'invalid', reason: 'max' });
  });

  it('une même fusion ne peut pas être rejouée (pas de duplication)', () => {
    const s = createRun({ ...base, start: [{ x: 0, y: 0, c: 'flowers', l: 1 }, { x: 1, y: 0, c: 'flowers', l: 1 }] });
    move(s, base, 0, 1, 0);
    const ev2 = move(s, base, 0, 1, 10);
    expect(ev2[0]).toMatchObject({ t: 'invalid', reason: 'empty' });
    expect(count(s)).toBe(1);
  });

  it('génération dans une case libre, et plateau plein', () => {
    const s = createRun(base);
    // un générateur occupe une case
    for (let k = 0; k < BOARD_SIZE - 1; k++) expect(tapGenerator(s, base)[0].t).toBe('spawn');
    expect(tapGenerator(s, base)[0].t).toBe('full');
    expect(s.taps).toBe(BOARD_SIZE - 1);
  });

  it('générateurs : un par collection, objets produits à côté, jamais fusionnés ni retirés', () => {
    const def: LevelDef = { ...base, gen: [['flowers', 1, 1], ['love', 1, 1], ['special', 1, 0.2]] };
    const s = createRun(def);
    const gens = generatorCells(s);
    expect(gens.map((g) => s.cells[g].item!.l).sort()).toEqual([1, 2]);
    const love = gens.find((g) => s.cells[g].item!.l === 2)!;
    for (let k = 0; k < 6; k++) {
      const ev = tapGenerator(s, def, love);
      const sp = ev[0] as { t: string; item: { c: string }; at: number };
      expect(sp.t).toBe('spawn');
      expect(['love', 'special']).toContain(sp.item.c);
    }
    // l'objet apparaît au plus près du générateur
    const first = createRun(def);
    const ev = tapGenerator(first, def, love) as { at: number }[];
    const d = (a: number, b: number) => Math.abs((a % 6) - (b % 6)) + Math.abs(Math.floor(a / 6) - Math.floor(b / 6));
    expect(d(ev[0].at, love)).toBe(1);
    expect(useWind(s, def, love)).toEqual([]);
    expect(useWand(s, def, love, 0)).toEqual([]);
    expect(recover(s, def).some((e) => (e as { at?: number }).at === love)).toBe(false);
    expect(s.cells[love].item?.c).toBe('gen');
  });

  it('sac : ranger puis ressortir un objet', () => {
    const s = createRun({ ...base, start: [{ x: 0, y: 0, c: 'paris', l: 3 }] });
    const r = stashItem(s, base, 0);
    expect(r?.item).toEqual({ c: 'paris', l: 3 });
    expect(s.cells[0].item).toBeNull();
    expect(stashItem(s, base, generatorCells(s)[0])).toBeNull();
    const ev = placeItem(s, base, { c: 'paris', l: 3 });
    expect(ev[0].t).toBe('spawn');
    expect(s.cells.filter((c) => c.item?.c === 'paris').length).toBe(1);
  });

  it('combo : fenêtre de 3 s', () => {
    const start = [0, 1, 2, 3, 4, 5].map((x) => ({ x, y: 0, c: 'flowers' as const, l: 1 }));
    const s = createRun({ ...base, start });
    move(s, base, 0, 1, 1000);
    move(s, base, 2, 3, 2500);
    expect(s.combo).toBe(2);
    move(s, base, 4, 5, 9000);
    expect(s.combo).toBe(1);
    expect(s.bestCombo).toBe(2);
  });

  it('combo ×5 donne une étoile filante', () => {
    const start = Array.from({ length: 10 }, (_, k) => ({ x: k % 6, y: Math.floor(k / 6), c: 'flowers' as const, l: 1 }));
    const s = createRun({ ...base, objectives: [{ t: 'score', value: 99999 }], start });
    for (let k = 0; k < 5; k++) move(s, base, 2 * k, 2 * k + 1, 1000 + k * 500);
    expect(s.cells.some((c) => c.item?.c === 'special' && c.item.l === SPECIAL.STAR)).toBe(true);
  });

  it('paquet cadeau : s\'ouvre après une fusion voisine, refuse les dépôts', () => {
    const def = { ...base, gifts: [{ x: 2, y: 0, c: 'love' as const, l: 3 }], start: [{ x: 0, y: 0, c: 'flowers' as const, l: 1 }, { x: 1, y: 1, c: 'flowers' as const, l: 1 }] };
    const s = createRun(def);
    expect(move(s, def, 0, 2, 0)[0]).toMatchObject({ t: 'invalid', reason: 'gift' });
    const ev = move(s, def, idx(1, 1), idx(0, 0), 0);
    expect(ev.find((e) => e.t === 'giftOpen')).toBeUndefined();
    const s2 = createRun({ ...def, start: [{ x: 1, y: 0, c: 'flowers', l: 1 }, { x: 1, y: 1, c: 'flowers', l: 1 }] });
    const ev2 = move(s2, def, idx(1, 1), idx(1, 0), 0);
    expect(ev2.find((e) => e.t === 'giftOpen')).toBeTruthy();
    expect(s2.cells[2].item).toEqual({ c: 'love', l: 3 });
  });

  it('étoile filante, clé dorée, coffret surprise', () => {
    const def: LevelDef = { ...base, gen: [['love', 1, 1]], start: [
      { x: 0, y: 0, c: 'special', l: SPECIAL.STAR }, { x: 1, y: 0, c: 'paris', l: 4 },
      { x: 0, y: 1, c: 'special', l: SPECIAL.KEY }, { x: 0, y: 2, c: 'special', l: SPECIAL.BOX },
    ], gifts: [{ x: 5, y: 5, c: 'chess', l: 5 }] };
    const s = createRun(def);
    expect(move(s, def, 0, 1, 0)[0]).toMatchObject({ t: 'merge', joker: true, result: { c: 'paris', l: 5 } });
    expect(move(s, def, idx(0, 1), idx(5, 5), 0)[0]).toMatchObject({ t: 'giftOpen' });
    const ev = tapItem(s, def, idx(0, 2));
    expect(ev.filter((e) => e.t === 'spawn').length).toBe(3);
  });

  it('commande : livraison consomme les objets une seule fois', () => {
    const def: LevelDef = { ...base, orders: [[['flowers', 2]]], objectives: [{ t: 'orders', count: 1 }],
      start: [{ x: 0, y: 0, c: 'flowers', l: 2 }] };
    const s = createRun(def);
    const ev = deliver(s, def, 0);
    expect(ev[0].t).toBe('deliver');
    expect(s.cells[0].item).toBeNull();
    expect(s.won).toBe(true);
    expect(deliver(s, def, 0)).toEqual([]);
    expect(s.ordersDone).toBe(1);
  });

  it('bonus baguette et souffle', () => {
    const s = createRun({ ...base, start: [{ x: 0, y: 0, c: 'flowers', l: 3 }, { x: 1, y: 0, c: 'flowers', l: 1 }] });
    useWand(s, base, 0, 0);
    expect(s.cells[0].item).toEqual({ c: 'flowers', l: 4 });
    expect(s.won).toBe(true);
    useWind(s, base, 1);
    expect(s.cells[1].item).toBeNull();
  });

  it('plateau bloqué → récupération', () => {
    const def: LevelDef = { ...base, gen: [['flowers', 1, 1]] };
    const s = createRun(def);
    const colls = ['flowers', 'love', 'paris', 'chess'] as const;
    for (let i = 0; i < BOARD_SIZE; i++) s.cells[i].item = { c: colls[i % 4], l: 1 + Math.floor(i / 4) };
    expect(isStuck(s)).toBe(true);
    const ev = recover(s, def);
    expect(ev.filter((e) => e.t === 'remove').length).toBe(4);
    expect(isStuck(s)).toBe(false);
  });

  it('l\'état se clone/sérialise sans perte', () => {
    const s = createRun(LEVELS[7]);
    tapGenerator(s, LEVELS[7]);
    const c = cloneRun(s);
    expect(c.cells).toEqual(s.cells);
    expect(c.orders).toEqual(s.orders);
  });
});

describe('les 30 niveaux', () => {
  it('30 niveaux, 6 par chapitre, identifiants uniques', () => {
    expect(LEVELS.length).toBe(30);
    for (let ch = 1; ch <= 5; ch++) expect(LEVELS.filter((l) => l.chapter === ch).length).toBe(6);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(30);
  });

  it('positions valides et sans chevauchement', () => {
    for (const l of LEVELS) {
      const seen = new Set<string>();
      for (const p of [...(l.start ?? []), ...(l.gifts ?? [])]) {
        expect(p.x >= 0 && p.x < 6 && p.y >= 0 && p.y < 6, `niveau ${l.id}`).toBe(true);
        const k = `${p.x},${p.y}`;
        expect(seen.has(k), `niveau ${l.id} case ${k}`).toBe(false);
        seen.add(k);
      }
      if (l.objectives.some((o) => o.t === 'orders')) {
        const need = (l.objectives.find((o) => o.t === 'orders') as { count: number }).count;
        expect(l.orders?.length ?? 0, `niveau ${l.id}`).toBeGreaterThanOrEqual(need);
      }
    }
  });

  const rows: string[] = [];
  for (const l of LEVELS) {
    it(`niveau ${l.id} gagnable par le bot (8 graines)`, () => {
      const taps: number[] = [];
      for (let seed = 1; seed <= 8; seed++) {
        const s = createRun(l, 'story', seed * 7919);
        const r = simulate(s, l);
        expect(r.won, `niveau ${l.id} graine ${seed} (${r.actions} actions)`).toBe(true);
        taps.push(r.taps);
        expect(stars(s, l)).toBeGreaterThanOrEqual(1);
      }
      taps.sort((a, b) => a - b);
      rows.push(`${l.id}\tpar ${l.par}\tmédiane ${taps[4]}\tmin ${taps[0]}\tmax ${taps[7]}`);
      if (l.id === 30) console.log(rows.join('\n'));
    });
  }
});
