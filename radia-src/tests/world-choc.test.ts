import { describe, it, expect } from 'vitest';
import { defaultWorld, sanitizeWorld, type World } from '../src/save/schema';
import { CHOC_IDS } from '../src/data/world/ids';
import { CHOCS, MAX_SHOP_LEVEL } from '../src/data/world/chocolate';
import * as C from '../src/game/world/chocolate';

const rich = (): World => { const w = defaultWorld(); w.res = { coins: 9000, flowers: 100, fabric: 0, cocoa: 200 }; return w; };

describe('chocolaterie : recettes', () => {
  it('2 recettes au départ, 8 types au total', () => {
    const w = defaultWorld();
    expect(CHOC_IDS.length).toBe(8);
    expect(w.choc.recipes).toEqual(['milk', 'dark']);
  });
  it('achat : niveau et pièces requis, débit exact', () => {
    const w = defaultWorld();
    w.res.coins = 50;
    expect(C.buyRecipe(w, 'praline').reason).toBe('Pas assez de pièces');
    w.res.coins = 1000;
    expect(C.buyRecipe(w, 'truffle').reason).toMatch(/niveau 2/);
    expect(C.buyRecipe(w, 'praline').ok).toBe(true);
    expect(w.res.coins).toBe(1000 - CHOCS.praline.unlockCoins);
    expect(C.buyRecipe(w, 'praline').ok).toBe(false);
    expect(w.choc.recipes).toContain('praline');
  });
});

describe('qualité du mini-jeu', () => {
  it('scores bornés', () => {
    expect(C.scoreMelt(0)).toBe(1);
    expect(C.scoreMelt(1)).toBe(0.75);
    expect(C.scoreMelt(50)).toBe(0.3);
    expect(C.scorePour(0, 0.15)).toBe(1);
    expect(C.scorePour(0.1, 0.15)).toBe(0.75);
    expect(C.scorePour(1, 0.15)).toBeGreaterThanOrEqual(0.2);
    expect(C.scorePour(NaN, 0.15)).toBeGreaterThan(0);
    expect(C.scoreDecor(3, 0)).toBe(1);
    expect(C.scoreDecor(3, 3)).toBe(0.5);
    expect(C.scoreDecor(0, 5)).toBeGreaterThan(0);
  });
  it('étoiles 1 à 3, jamais 0', () => {
    expect(C.starsFrom([1, 1, 1])).toBe(3);
    expect(C.starsFrom([0.7, 0.7, 0.7])).toBe(2);
    expect(C.starsFrom([0, 0, 0])).toBe(1);
    expect(C.starsFrom([])).toBe(1);
  });
});

describe('fabrication', () => {
  it('débite les ingrédients, quantité = étoiles, collection mise à jour', () => {
    const w = rich();
    const cocoa = w.res.cocoa;
    const r = C.cook(w, 'milk', 3);
    expect(r.ok).toBe(true);
    expect(r.qty).toBe(3);
    expect(w.res.cocoa).toBe(cocoa - CHOCS.milk.cost.cocoa!);
    expect(C.stock(w, 'milk')).toBe(3);
    expect(w.choc.made.milk).toBe(3);
    expect(w.choc.collection).toEqual(['milk']);
    expect(r.firstOfKind).toBe(true);
    expect(C.cook(w, 'milk', 1).firstOfKind).toBe(false);
    expect(w.choc.collection).toEqual(['milk']);
  });
  it('refus : sans cacao, sans recette ; rien ne change', () => {
    const w = defaultWorld();
    expect(C.cook(w, 'milk', 2).ok).toBe(false);
    w.res.cocoa = 100;
    expect(C.cook(w, 'royalbox', 3).reason).toBe('Recette inconnue');
    expect(w.res.cocoa).toBe(100);
    expect(C.stock(w, 'milk')).toBe(0);
  });
  it('étoiles hors bornes ramenées à 1..3', () => {
    const w = rich();
    expect(C.cook(w, 'dark', 99).qty).toBe(3);
    expect(C.cook(w, 'dark', -4).qty).toBe(1);
  });
  it('coût composite (coffret royal) tout ou rien', () => {
    const w = rich();
    w.choc.shopLevel = 4; w.choc.recipes.push('royalbox');
    w.res.flowers = 2;
    expect(C.canCook(w, 'royalbox').ok).toBe(false);
    w.res.flowers = 20;
    const before = { ...w.res };
    expect(C.cook(w, 'royalbox', 2).ok).toBe(true);
    expect(w.res).toEqual({ coins: before.coins - 40, flowers: 12, fabric: 0, cocoa: before.cocoa - 16 });
  });
});

describe('coffrets', () => {
  const stocked = (): World => { const w = rich(); for (const id of ['milk', 'dark']) w.extra[`choc.stock.${id}`] = 4; w.extra['choc.stock.praline'] = 1; w.extra['choc.stock.white'] = 1; return w; };
  it('exactement 4 chocolats du stock', () => {
    const w = stocked();
    expect(C.assembleBox(w, ['milk', 'milk', 'milk']).ok).toBe(false);
    expect(C.assembleBox(w, ['praline', 'praline', 'milk', 'milk']).ok).toBe(false);
    expect(C.assembleBox(w, ['milk', 'x', 'dark', 'dark']).ok).toBe(false);
    expect(w.choc.boxes).toBe(0);
  });
  it('coffret simple : pièces et cœurs, stock consommé', () => {
    const w = stocked();
    const c0 = w.res.coins;
    const r = C.assembleBox(w, ['milk', 'milk', 'dark', 'dark']);
    expect(r.ok).toBe(true);
    expect(r.decorative).toBe(false);
    expect(w.res.coins).toBe(c0 + r.coins!);
    expect(C.stock(w, 'milk')).toBe(2);
    expect(w.choc.boxes).toBe(1);
    expect(w.castle.owned['choco-display']).toBeUndefined();
  });
  it('coffret décoratif : meuble offert une seule fois', () => {
    const w = stocked();
    const a = C.assembleBox(w, ['milk', 'dark', 'praline', 'white']);
    expect(a.decorative).toBe(true);
    expect(a.furniture).toBe(true);
    expect(w.castle.owned['choco-display']).toBe(1);
    w.extra['choc.stock.praline'] = 1; w.extra['choc.stock.white'] = 1;
    const b = C.assembleBox(w, ['milk', 'dark', 'praline', 'white']);
    expect(b.furniture).toBe(false);
    expect(w.castle.owned['choco-display']).toBe(1);
    expect(b.coins!).toBeGreaterThan(C.boxValue(['milk', 'milk', 'dark', 'dark']).coins);
  });
});

describe('boutique', () => {
  it('amélioration payante jusqu\'au maximum', () => {
    const w = defaultWorld();
    w.res.coins = 10;
    expect(C.upgradeShop(w).ok).toBe(false);
    expect(w.choc.shopLevel).toBe(1);
    w.res.coins = 99_999;
    while (C.upgradePrice(w) !== null) expect(C.upgradeShop(w).ok).toBe(true);
    expect(w.choc.shopLevel).toBe(MAX_SHOP_LEVEL);
    expect(C.upgradeShop(w).ok).toBe(false);
    expect(w.res.coins).toBeGreaterThan(0);
  });
});

describe('invariants et sauvegarde', () => {
  it('séquence aléatoire : jamais de valeur négative, stock ≤ fabriqué', () => {
    const w = rich();
    let seed = 99;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 300; i++) {
      const id = CHOC_IDS[Math.floor(rnd() * 8)];
      const a = Math.floor(rnd() * 4);
      if (a === 0) C.buyRecipe(w, id);
      else if (a === 1) C.cook(w, id, 1 + Math.floor(rnd() * 3));
      else if (a === 2) C.assembleBox(w, [0, 1, 2, 3].map(() => CHOC_IDS[Math.floor(rnd() * 8)]));
      else C.upgradeShop(w);
      for (const v of Object.values(w.res)) expect(v).toBeGreaterThanOrEqual(0);
      for (const c of CHOC_IDS) { expect(C.stock(w, c)).toBeGreaterThanOrEqual(0); expect(C.stock(w, c)).toBeLessThanOrEqual(w.choc.made[c] ?? 0); }
    }
  });
  it('aller-retour sanitizeWorld', () => {
    const w = rich();
    C.cook(w, 'milk', 3); C.cook(w, 'dark', 2);
    w.extra['choc.stock.praline'] = 2;
    C.upgradeShop(w);
    const back = sanitizeWorld(JSON.parse(JSON.stringify(w)));
    expect(back.choc.made).toEqual(w.choc.made);
    expect(back.choc.shopLevel).toBe(2);
    expect(back.choc.collection).toEqual(['milk', 'dark']);
    expect(C.stock(back, 'milk')).toBe(3);
  });
  it('données corrompues → valeurs sûres', () => {
    const back = sanitizeWorld({ choc: { recipes: 5, made: { milk: -3 }, boxes: 'a', shopLevel: 99 } });
    expect(back.choc.recipes).toEqual(['milk', 'dark']);
    expect(back.choc.shopLevel).toBeLessThanOrEqual(9);
    expect(back.choc.boxes).toBe(0);
  });
});
