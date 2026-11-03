import { describe, it, expect } from 'vitest';
import { FLOWER_IDS } from '../src/data/world/ids';
import * as B from '../src/events/games/creative/bouquetLogic';
import * as K from '../src/events/games/creative/chocLogic';
import * as D from '../src/events/games/creative/decorLogic';
import * as S from '../src/events/games/creative/shopLogic';

const seq = (seed = 1) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

describe('bouquet : harmonie', () => {
  it('bornée 0–100, sans NaN, déterministe, sur toutes les combinaisons de 5 fleurs', () => {
    const r = seq(3);
    for (let i = 0; i < 400; i++) {
      const n = 1 + Math.floor(r() * 7);
      const fl = Array.from({ length: n }, () => FLOWER_IDS[Math.floor(r() * FLOWER_IDS.length)]);
      const w = B.WRAP_IDS[Math.floor(r() * B.WRAP_IDS.length)];
      const a = B.bouquetHarmony(fl, w, B.THEMES[i % 4].tones);
      const b = B.bouquetHarmony(fl, w, B.THEMES[i % 4].tones);
      expect(a).toEqual(b);
      for (const v of Object.values(a)) expect(Number.isFinite(v)).toBe(true);
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(100);
    }
  });
  it('vide ou inconnu = 0, jamais de plantage', () => {
    expect(B.bouquetHarmony([], 'kraft').score).toBe(0);
    expect(B.bouquetHarmony(['x', 'y'], 'zzz').score).toBe(0);
  });
  it('variété et palette cohérente battent monotone et clash', () => {
    const mono = B.bouquetHarmony(['rose', 'rose', 'rose', 'rose', 'rose', 'rose'], 'silk').score;
    const nice = B.bouquetHarmony(['rose', 'daisy', 'tulip', 'tulip', 'daisy', 'rose'], 'silk').score;
    const clash = B.bouquetHarmony(['rose', 'sunflower', 'hydrangea', 'orchid', 'magic', 'lavender'], 'silk').score;
    expect(nice).toBeGreaterThan(mono);
    expect(nice).toBeGreaterThan(clash);
    expect(nice).toBeGreaterThanOrEqual(85);
  });
  it('plus de fleurs jusqu\'à 5 ne baisse pas le score ; le thème choisi aide', () => {
    const base = ['rose', 'daisy', 'tulip', 'peony', 'lily'];
    let prev = 0;
    for (let n = 1; n <= 5; n++) { const s = B.bouquetHarmony(base.slice(0, n), 'lace', B.THEMES[0].tones).score; expect(s).toBeGreaterThanOrEqual(prev - 12); prev = s; }
    expect(B.bouquetHarmony(base, 'lace', B.THEMES[0].tones).score).toBeGreaterThan(B.bouquetHarmony(base, 'lace', B.THEMES[2].tones).score);
  });
  it('au moins 4 emballages, mode kid jamais décevant', () => {
    expect(B.WRAP_IDS.length).toBeGreaterThanOrEqual(4);
    const bad = B.bouquetHarmony(['rose', 'rose', 'rose', 'rose', 'rose'], 'kraft');
    expect(B.finalBouquetScore('kid', bad)).toBeGreaterThanOrEqual(70);
    expect(B.finalBouquetScore('market', bad)).toBe(bad.score);
    expect(B.normBouquetMode('nope')).toBe('market');
  });
});

describe('chocolats : score du coffret', () => {
  const st: K.BoxStyle = { color: 'rose', ribbon: 'or', label: 'Pour toi' };
  const P = (base: K.BaseId, topping: K.ToppingId | null): K.Piece => ({ base, topping });
  it('borné, déterministe, sans NaN', () => {
    const r = seq(9);
    for (let i = 0; i < 300; i++) {
      const pcs = Array.from({ length: Math.floor(r() * 8) }, () => (r() < 0.1 ? null : P(K.BASES[Math.floor(r() * 3)], r() < 0.6 ? K.TOPPING_IDS[Math.floor(r() * 6)] : null)));
      const s = K.scoreBox(pcs, { color: K.BOX_COLORS[i % 4], ribbon: K.RIBBONS[(i >> 2) % 4], label: K.LABELS[i % 4] }, r());
      expect(s).toEqual(K.scoreBox(pcs, { color: K.BOX_COLORS[i % 4], ribbon: K.RIBBONS[(i >> 2) % 4], label: K.LABELS[i % 4] }, s.craft));
      for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true);
      expect(s.score).toBeGreaterThanOrEqual(0); expect(s.score).toBeLessThanOrEqual(100);
    }
  });
  it('monotone : garnir et varier fait monter le score', () => {
    const plain = Array.from({ length: 6 }, () => P('dark', null));
    const topped = plain.map((p) => ({ ...p, topping: 'noisette' as const }));
    const rich = [P('dark', 'noisette'), P('milk', 'caramel'), P('white', 'fruits'), P('dark', 'pistache'), P('milk', 'etoile'), P('white', 'coeur')];
    expect(K.scoreBox(topped, st).score).toBeGreaterThan(K.scoreBox(plain, st).score);
    expect(K.scoreBox(rich, st).score).toBeGreaterThan(K.scoreBox(topped, st).score);
    expect(K.scoreBox(rich.slice(0, 3), st).score).toBeLessThan(K.scoreBox(rich, st).score);
    expect(K.scoreBox([], st).score).toBe(0);
  });
  it('style harmonieux > style heurté', () => {
    const rich = [P('dark', 'noisette'), P('milk', 'caramel'), P('white', 'fruits'), P('dark', 'pistache'), P('milk', 'etoile'), P('white', 'coeur')];
    expect(K.scoreBox(rich, { color: 'lavande', ribbon: 'blanc', label: 'Merci' }).score).toBeGreaterThan(K.scoreBox(rich, { color: 'lavande', ribbon: 'rouge', label: 'Merci' }).score);
  });
});

describe('décor : harmonie', () => {
  const pl = (...a: Array<[string, D.DecorId]>): D.Placed[] => a.map(([slot, obj]) => ({ slot, obj }));
  it('bornée, déterministe, tolère les placements invalides', () => {
    for (const m of D.DECOR_MODES) {
      const all = pl(['h1', 'lights'], ['h2', 'garland'], ['c1', 'tablecloth'], ['t1', 'candles'], ['t2', 'vase'], ['t5', 'cake'], ['f1', 'cushion']);
      const s = D.decorHarmony(m, all);
      expect(s).toEqual(D.decorHarmony(m, all));
      for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true);
      expect(s.score).toBeGreaterThan(0); expect(s.score).toBeLessThanOrEqual(100);
      expect(D.decorHarmony(m, pl(['zz', 'cake'], ['h1', 'cake'])).score).toBe(0);
    }
  });
  it('au moins 12 objets ; chaque type d\'emplacement a des candidats', () => {
    expect(D.DECOR_IDS.length).toBeGreaterThanOrEqual(12);
    for (const sl of D.SLOTS) expect(D.DECOR_IDS.filter((i) => D.fitsSlot(i, sl)).length).toBeGreaterThanOrEqual(1);
    for (const m of D.DECOR_MODES) expect(D.THEME_OBJECTS[m].length).toBeGreaterThanOrEqual(6);
  });
  it('le thème compte : objets du thème > hors thème', () => {
    const cosy = pl(['f1', 'cushion'], ['f2', 'plaid'], ['t1', 'snacks'], ['t2', 'drinks'], ['h1', 'lights'], ['t5', 'cake']);
    const palaceLike = pl(['t1', 'candelabra'], ['c1', 'tablecloth'], ['t2', 'vase'], ['t5', 'cake'], ['h2', 'garland'], ['t3', 'plates']);
    expect(D.decorHarmony('pajama', cosy).score).toBeGreaterThan(D.decorHarmony('palace', cosy).score);
    expect(D.decorHarmony('palace', palaceLike).score).toBeGreaterThan(D.decorHarmony('pajama', palaceLike).score);
  });
  it('plus de variété/équilibre que 6 fois la même chose', () => {
    const same = pl(['t1', 'candles'], ['t2', 'candles'], ['t3', 'candles'], ['t4', 'candles'], ['t5', 'candles'], ['h1', 'lantern']);
    const mix = pl(['t1', 'candles'], ['t2', 'vase'], ['t3', 'drinks'], ['t4', 'snacks'], ['t5', 'plates'], ['h1', 'lights']);
    expect(D.decorHarmony('hotel', mix).score).toBeGreaterThan(D.decorHarmony('hotel', same).score);
  });
});

describe('shopTry : options', () => {
  it('options vides ou invalides => 3 à 6 articles existants, sans doublon', () => {
    for (const raw of [undefined, null, [], 'x', [1, 2], ['nope', 'zzz'], ['dr-royal-gown'], ['dr-royal-gown', 'dr-royal-gown']]) {
      const o = S.sanitizeOptions(raw, seq(5));
      expect(o.length).toBeGreaterThanOrEqual(3); expect(o.length).toBeLessThanOrEqual(6);
      expect(new Set(o).size).toBe(o.length);
      for (const id of o) expect(S.isClothId(id)).toBe(true);
    }
  });
  it('conserve des options valides (max 6)', () => {
    const o = S.sanitizeOptions(['dr-royal-gown', 'sh-heels-gold', 'bg-mini-gold', 'cr-tiara', 'ac-pearls', 'jk-blazer-cream', 'dr-denim'], seq(1));
    expect(o).toEqual(['dr-royal-gown', 'sh-heels-gold', 'bg-mini-gold', 'cr-tiara', 'ac-pearls', 'jk-blazer-cream']);
  });
  it('boutiques : 3 noms inventés, répartition sans boutique vide', () => {
    expect(S.BOUTIQUES.length).toBe(3);
    expect(S.boutiqueCount(undefined, 5)).toBe(3); expect(S.boutiqueCount(9, 5)).toBe(3); expect(S.boutiqueCount(0, 5)).toBe(1); expect(S.boutiqueCount(3, 2)).toBe(2);
    const o = S.sanitizeOptions(undefined, seq(2));
    for (const sh of S.assignBoutiques(o, 3)) expect(sh.length).toBeGreaterThan(0);
  });
  it('réaction non vide', () => { expect(S.reactionFor('dr-royal-gown', seq(4)).length).toBeGreaterThan(5); });
});
