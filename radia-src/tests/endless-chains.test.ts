import { describe, it, expect, beforeEach } from 'vitest';
import { COLLECTIONS, COLLECTION_IDS, GENERATORS, allItems, collMax, genKindOf, itemBlurb, itemKey, itemName, type CollectionId } from '../src/data/items';
import { Rng } from '../src/utils/rng';
import { ENDLESS_CFG, activeColls, albumProgress, albumTotal, applyEvents, discover, isReachable, makeOrder, nextUnlock, resetEndless, tierPoints, unlockedColls, isUnlocked } from '../src/game/endless';
import { canMerge } from '../src/game/merge/rules';
import { mergeReward, orderGain, MATERIAL_OF } from '../src/game/world/fusionRewards';
import { defaultFun } from '../src/save/fun';
import { drawItem } from '../src/game/art/items';
import { drawGenerator, type GenKind } from '../src/game/art/generators';
import { generatorInfo, GEN_MAT } from '../src/game/endless/generators';
import { host, newSim } from './endless-helpers';
import { customerById } from '../src/data/customers';

const NEW: CollectionId[] = ['pastry', 'bag', 'gift'];

/** Contexte 2D factice : compte les tracés, ne plante sur aucune méthode. */
function fakeCtx() {
  const calls = { fill: 0, stroke: 0, other: 0 };
  const grad = { addColorStop() { /* rien */ } };
  const target: Record<string, unknown> = {};
  const ctx = new Proxy(target, {
    get(t, k: string) {
      if (k in t) return t[k];
      if (k === 'fill') return () => { calls.fill++; };
      if (k === 'stroke') return () => { calls.stroke++; };
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      return () => { calls.other++; };
    },
    set(t, k: string, v) { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('nouvelles chaînes : Pâtisseries, Sacs, Cadeaux', () => {
  beforeEach(() => resetEndless());
  it('trois nouvelles collections de 8 niveaux, noms et textes romantiques / drôles, couleurs valides', () => {
    expect(COLLECTION_IDS.slice(-4, -1)).toEqual(NEW); // la chaîne « savons » (PIMBÊCHE) vient ensuite
    for (const c of NEW) {
      const d = COLLECTIONS[c];
      expect(collMax(c)).toBe(8);
      expect(d.items.length).toBe(8);
      expect(d.blurbs.length).toBe(8);
      expect(new Set(d.items).size).toBe(8);
      expect(/^#[0-9A-Fa-f]{6}$/.test(d.color)).toBe(true);
      for (let l = 1; l <= 8; l++) { expect(itemName({ c, l }).length).toBeGreaterThan(2); expect(itemBlurb({ c, l }).length).toBeGreaterThan(12); }
    }
    expect(COLLECTIONS.pastry.items[0]).toBe('Macaron');
    expect(COLLECTIONS.pastry.items).toEqual(expect.arrayContaining(['Éclair', 'Tartelette', 'Gâteau', 'Pièce montée']));
    expect(COLLECTIONS.bag.items[0]).toBe('Pochette');
    expect(COLLECTIONS.gift.items).toEqual(expect.arrayContaining(['Paquet', 'Coffret cadeau']));
    // aucun nom d'enfant, aucune marque
    const all = NEW.flatMap((c) => [...COLLECTIONS[c].items, ...COLLECTIONS[c].blurbs]).join(' ');
    expect(/Hermès|Chanel|Vuitton|Gucci|Prada|Dior/i.test(all)).toBe(false);
  });
  it('générateurs 12 à 14 : un par collection, descriptions, niveaux, tables de production', () => {
    NEW.forEach((c, i) => {
      const kind = 12 + i;
      expect(genKindOf(c)).toBe(kind);
      expect(GENERATORS[kind].coll).toBe(c);
      expect(GENERATORS[kind].name.length).toBeGreaterThan(3);
      expect(GENERATORS[kind].blurb).toContain('⚡');
      const info = generatorInfo(kind, 3);
      expect(info.coll).toBe(c);
      expect(info.table.every((r) => r.l <= 8)).toBe(true);
      expect(info.table.reduce((a, r) => a + r.pct, 0)).toBeGreaterThan(99);
    });
  });
  it('album : 128 objets au total (4×10 + 11×8), les nouvelles chaînes comptent et récompensent', () => {
    expect(albumTotal()).toBe(128);
    expect(allItems().filter((i) => NEW.includes(i.c as CollectionId)).length).toBe(24);
    expect(new Set(allItems().map(itemKey)).size).toBe(allItems().length);
    const fun = defaultFun();
    let completed = 0;
    for (let l = 1; l <= 8; l++) if (discover(fun, { c: 'bag', l }).completed === 'bag') completed++;
    expect(completed).toBe(1);
    const p = albumProgress(fun);
    expect(p.total).toBe(128);
    expect(p.perColl.find((x) => x.coll === 'bag')).toMatchObject({ found: 8, max: 8, complete: true });
    expect(p.perColl.length).toBe(15);
  });
  it('fusion : 7 fusions mènent au niveau 8, pas au-delà', () => {
    for (const c of NEW) {
      for (let l = 1; l < 8; l++) expect(canMerge({ c, l }, { c, l })).toBe(true);
      expect(canMerge({ c, l: 8 }, { c, l: 8 })).toBe(false);
      expect(canMerge({ c, l: 3 }, { c: 'flowers', l: 3 })).toBe(false);
    }
  });
  it('gains cohérents avec le monde : pâtisseries → cacao, sacs → tissu, cadeaux → pièces en bonus', () => {
    expect(MATERIAL_OF.pastry).toBe('cocoa');
    expect(MATERIAL_OF.bag).toBe('fabric');
    expect(MATERIAL_OF.gift).toBeUndefined();
    expect(mergeReward({ c: 'pastry', l: 4 }, 1).cocoa).toBe(1);
    expect(mergeReward({ c: 'bag', l: 6 }, 1).fabric).toBe(2);
    expect(mergeReward({ c: 'gift', l: 3 }, 1).coins).toBeGreaterThan(3);
    expect(orderGain({ hearts: 3, coins: 10, mat: 'cocoa', matN: 3, energy: 5, treasure: 2 })).toEqual({ coins: 10, cocoa: 3 });
  });
});

describe('déblocage progressif selon le palier et les lieux ouverts', () => {
  beforeEach(() => resetEndless());
  const at = ENDLESS_CFG.unlock.at;
  const by = ENDLESS_CFG.unlock.byPlace;
  it('jamais tout dès le début : au départ seules Fleurs et Amour ; seuils croissants après le château', () => {
    expect(unlockedColls(defaultFun())).toEqual(['flowers', 'love']);
    expect(at.pastry).toBeGreaterThan(at.castle);
    expect(at.bag).toBeGreaterThan(at.pastry);
    expect(at.gift).toBeGreaterThan(at.bag);
  });
  it('par le palier seul : pâtisseries / sacs / cadeaux arrivent à leur seuil', () => {
    const f = defaultFun();
    f.endless2.counters.orders = at.pastry - 1;
    expect(isUnlocked(f, 'pastry')).toBe(false);
    f.endless2.counters.orders = at.pastry;
    expect(isUnlocked(f, 'pastry')).toBe(true);
    expect(nextUnlock(f)?.coll).toBe('bag');
    f.endless2.counters.orders = at.gift;
    expect(NEW.every((c) => isUnlocked(f, c))).toBe(true);
  });
  it('par les lieux : salon de thé → pâtisseries, boutique de mode → sacs, hôtel → cadeaux (une fois un minimum de points atteint)', () => {
    const f = defaultFun();
    f.places.tea = { stage: by.pastry!.stage, progress: {}, done: false, seen: true, choices: {} };
    f.places.boutique = { stage: by.bag!.stage, progress: {}, done: false, seen: true, choices: {} };
    f.places.hotel = { stage: by.gift!.stage, progress: {}, done: true, seen: true, choices: {} };
    // les lieux seuls ne suffisent pas au tout début
    expect(unlockedColls(f)).toEqual(['flowers', 'love']);
    f.endless2.counters.orders = by.pastry!.minPoints;
    expect(isUnlocked(f, 'pastry')).toBe(true);
    expect(isUnlocked(f, 'bag')).toBe(by.bag!.minPoints <= by.pastry!.minPoints);
    f.endless2.counters.orders = by.gift!.minPoints;
    expect(NEW.every((c) => isUnlocked(f, c))).toBe(true);
    expect(tierPoints(f)).toBeLessThan(at.pastry);
    // un lieu pas assez rénové n'ouvre rien
    const g = defaultFun();
    g.places.tea = { stage: by.pastry!.stage - 1, progress: {}, done: false, seen: true, choices: {} };
    g.endless2.counters.orders = by.pastry!.minPoints + 20;
    expect(isUnlocked(g, 'pastry')).toBe(false);
  });
  it('les nouvelles collections débloquées deviennent actives (≤ 6 générateurs), les plus anciennes se reposent', () => {
    const f = defaultFun();
    f.endless2.counters.orders = 9999;
    expect(unlockedColls(f).length).toBe(15);
    const act = activeColls(f);
    expect(act.length).toBe(ENDLESS_CFG.unlock.maxBoardGens);
    expect(act).toEqual(expect.arrayContaining(NEW));
  });
  it('commandes atteignables : pâtisseries, sacs et cadeaux sont demandés (et jamais avant leur déblocage)', () => {
    const rng = new Rng(77);
    const before = defaultFun();
    before.endless2.counters.orders = at.castle + 1;
    for (let k = 0; k < 300; k++) for (const t of ENDLESS_CFG.orders.tiers) for (const r of makeOrder(before, rng, t, k).items) expect(NEW).not.toContain(r.c);
    const f = defaultFun();
    f.endless2.counters.orders = 9999;
    for (const c of COLLECTION_IDS) f.endless2.gens[`gen:${c}`] = { level: 3, xp: 0 };
    const asked = new Set<string>();
    for (let k = 0; k < 600; k++) for (const t of ENDLESS_CFG.orders.tiers) for (const r of makeOrder(f, rng, t, k).items) { asked.add(r.c); expect(isReachable(f, r)).toBe(true); expect(r.l).toBeLessThanOrEqual(8); }
    for (const c of NEW) expect(asked.has(c), `commandes « ${c} »`).toBe(true);
  });
  it('un lieu ouvert récompense : les événements du moteur versent les gains des nouvelles collections sans doublon', () => {
    const sim = newSim();
    const got = applyEvents(host(sim), [{ t: 'discover', item: { c: 'pastry', l: 3 }, isNew: true, reward: [{ kind: 'coins', n: 12 }, { kind: 'energy', n: 2 }] }]);
    expect(got.coins).toBe(12);
    expect(got.energy).toBe(2);
  });
});

describe('art vectoriel des nouvelles chaînes', () => {
  it('chaque objet (3 × 8) et chaque générateur (12 à 14) se dessine, avec des remplissages et des contours', () => {
    for (const c of NEW) {
      for (let l = 1; l <= 8; l++) {
        const { ctx, calls } = fakeCtx();
        expect(() => drawItem(ctx, { c, l }, 96)).not.toThrow();
        expect(calls.fill, `${c}:${l} remplissages`).toBeGreaterThan(8);
        expect(calls.stroke, `${c}:${l} contours`).toBeGreaterThan(2);
      }
    }
    for (const k of [12, 13, 14]) {
      const { ctx, calls } = fakeCtx();
      expect(() => drawGenerator(ctx, k as GenKind, 96)).not.toThrow();
      expect(calls.fill).toBeGreaterThan(10);
    }
  });
  it('les derniers niveaux sont plus riches que les premiers (halo, étincelles : davantage de tracés)', () => {
    for (const c of NEW) {
      const n = (l: number) => { const { ctx, calls } = fakeCtx(); drawItem(ctx, { c, l }, 96); return calls.fill + calls.stroke + calls.other; };
      expect(n(8)).toBeGreaterThan(n(1));
      expect(n(7)).toBeGreaterThan(n(2));
    }
  });
});

describe('chaîne « Savons PIMBÊCHE »', () => {
  const SOAPS = ['Base de savon', 'Savon brut', 'Savon moulé', 'Savon parfumé', 'Savon décoré', 'Savon artisanal Pimbêche', 'Coffret de savons', 'Coffret Pimbêche de luxe'];
  it('8 niveaux aux noms demandés, avec un texte chacun et le générateur « Atelier Pimbêche »', () => {
    expect(COLLECTIONS.soap.items).toEqual(SOAPS);
    expect(COLLECTIONS.soap.blurbs.length).toBe(8);
    expect(new Set(COLLECTIONS.soap.blurbs).size).toBe(8);
    expect(GENERATORS[15].coll).toBe('soap');
    expect(GENERATORS[15].name).toBe('Atelier Pimbêche');
  });
  it('fusion : 7 fusions mènent au niveau 8 (coffret de luxe), pas au-delà', () => {
    for (let l = 1; l < 8; l++) expect(canMerge({ c: 'soap', l }, { c: 'soap', l })).toBe(true);
    expect(canMerge({ c: 'soap', l: 8 }, { c: 'soap', l: 8 })).toBe(false);
    expect(canMerge({ c: 'soap', l: 3 }, { c: 'flowers', l: 3 })).toBe(false);
  });
  it('déblocage progressif : jamais au départ ; par la boutique de fleurs rouverte, ou plus tard par le palier', () => {
    const f = defaultFun();
    expect(unlockedColls(f)).not.toContain('soap');
    expect(ENDLESS_CFG.unlock.byPlace.soap).toMatchObject({ place: 'flowers' });
    f.endless2.counters.orders = 9999;
    expect(unlockedColls(f)).toContain('soap');
  });
  it('commandes : une fois débloqués, des savons sont demandés ; jamais avant ; le client aime (le plus souvent) les savons', () => {
    const before = defaultFun(); const rng = new Rng(77);
    for (let k = 0; k < 400; k++) for (const t of ENDLESS_CFG.orders.tiers) for (const r of makeOrder(before, rng, t, k).items) expect(r.c).not.toBe('soap');
    const f = defaultFun(); f.endless2.counters.orders = 9999;
    let asked = 0; let liked = 0; const customers = new Set<string>();
    for (let k = 0; k < 600; k++) for (const t of ENDLESS_CFG.orders.tiers) {
      const o = makeOrder(f, rng, t, k);
      if (o.items.some((r) => r.c === 'soap')) { asked++; customers.add(o.customer!); if (customerById(o.customer!)?.likes.includes('soap')) liked++; }
    }
    expect(asked).toBeGreaterThan(30);
    expect(liked / asked).toBeGreaterThan(0.4);
    expect(customers.size).toBeGreaterThanOrEqual(8); // variété de clients
  });
  it('matériau lié : les savons rapportent des fleurs (parfums)', () => {
    expect(GEN_MAT.soap).toBe('flowers');
  });
});
