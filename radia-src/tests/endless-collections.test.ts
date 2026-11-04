import { describe, it, expect } from 'vitest';
import { COLLECTIONS, COLLECTION_IDS, GENERATORS, MAX_LEVEL, allItems, collMax, genKindOf, itemName, itemBlurb, itemKey } from '../src/data/items';
import { canMerge } from '../src/game/merge/rules';
import { ENDLESS_CFG } from '../src/game/endless';
import { materialOfCheck } from './endless-materials';

describe('collections Endless 2.0', () => {
  it('14 collections, kinds 1..14 dans l\'ordre du brief (+ Pâtisseries, Sacs, Cadeaux)', () => {
    expect(COLLECTION_IDS).toEqual(['flowers', 'love', 'paris', 'chess', 'rare', 'choc', 'jewel', 'cloth', 'perfume', 'acc', 'castle', 'pastry', 'bag', 'gift']);
    COLLECTION_IDS.forEach((c, i) => { expect(genKindOf(c)).toBe(i + 1); expect(GENERATORS[i + 1].coll).toBe(c); });
  });
  it('anciennes : 10 niveaux ; nouvelles : 8 niveaux, noms et blurbs complets', () => {
    for (const c of COLLECTION_IDS) {
      const d = COLLECTIONS[c];
      expect(collMax(c)).toBe(['flowers', 'love', 'paris', 'chess'].includes(c) ? MAX_LEVEL : 8);
      expect(d.items.length).toBe(collMax(c));
      expect(d.blurbs.length).toBe(collMax(c));
      expect(/^#[0-9A-Fa-f]{6}$/.test(d.color)).toBe(true);
      for (let l = 1; l <= collMax(c); l++) { expect(itemName({ c, l }).length).toBeGreaterThan(1); expect(itemBlurb({ c, l }).length).toBeGreaterThan(5); }
    }
    expect(COLLECTIONS.rare.items[0]).toBe('Pétale d\'or');
    expect(COLLECTIONS.castle.items[7]).toBe('Trône doré');
    expect(COLLECTIONS.choc.items[7]).toBe('Chocolaterie royale');
    expect(COLLECTIONS.acc.items[7]).toBe('Sac iconique');
  });
  it('allItems : tous les niveaux, clés uniques', () => {
    const all = allItems();
    expect(new Set(all.map(itemKey)).size).toBe(all.length);
    expect(all.filter((i) => i.c !== 'special').length).toBe(4 * 10 + 10 * 8);
  });
  it('le niveau maximal d\'une collection de 8 niveaux est respecté par canMerge', () => {
    expect(canMerge({ c: 'rare', l: 7 }, { c: 'rare', l: 7 })).toBe(true);
    expect(canMerge({ c: 'rare', l: 8 }, { c: 'rare', l: 8 })).toBe(false);
    expect(canMerge({ c: 'special', l: 1 }, { c: 'castle', l: 8 })).toBe(false);
    expect(canMerge({ c: 'special', l: 1 }, { c: 'castle', l: 7 })).toBe(true);
    expect(canMerge({ c: 'flowers', l: 10 }, { c: 'flowers', l: 10 })).toBe(false);
    expect(canMerge({ c: 'flowers', l: 9 }, { c: 'flowers', l: 9 })).toBe(true);
  });
  it('seuils de déblocage croissants, les deux premières collections libres', () => {
    const at = ENDLESS_CFG.unlock.at;
    expect(at.flowers).toBe(0);
    expect(at.love).toBe(0);
    const v = COLLECTION_IDS.map((c) => at[c]);
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThanOrEqual(v[i - 1]);
  });
  it('matériaux du monde cohérents avec le brief', () => { materialOfCheck(); });
});
