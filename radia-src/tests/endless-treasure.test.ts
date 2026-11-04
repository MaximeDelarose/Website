import { describe, it, expect } from 'vitest';
import { RARITIES } from '../src/data/items';
import { ENDLESS_CFG, addTreasure, applyLoot, chestOdds, openChest, pendingChests, rollChestRarity, rollTreasure, settleLoot, treasurePoints, treasureView, clothRarity, clothCandidates, furnitureCandidates, rollDrop } from '../src/game/endless';
import { Rng } from '../src/utils/rng';
import { defaultFun } from '../src/save/fun';
import { defaultWorld } from '../src/save/schema';
import { mulberry } from './endless-helpers';
import type { Loot } from '../src/game/merge/types';

const T = ENDLESS_CFG.treasure;

describe('coffres : raretés et probabilités publiées', () => {
  it('chestOdds : somme 100 %, 5 raretés, couleurs du brief, garanties annoncées', () => {
    const o = chestOdds();
    expect(o.rows.map((r) => r.rarity)).toEqual([...RARITIES]);
    expect(o.rows.reduce((a, r) => a + r.pct, 0)).toBeGreaterThan(99.9);
    expect(o.rows.reduce((a, r) => a + r.pct, 0)).toBeLessThan(100.1);
    expect(o.rows.map((r) => r.color)).toEqual(['#9FB4C7', '#6FCF97', '#5AA9FF', '#B07CFF', '#FFC857']);
    expect(o.rows[0].pct).toBeGreaterThan(o.rows[4].pct);
    expect(o.pity.rare).toBe(T.pityRare);
    expect(o.text.length).toBeGreaterThan(10);
  });
  it('distribution observée ≈ distribution publiée (50 000 tirages sans garantie)', () => {
    const rand = mulberry(31337);
    const n = 50000;
    const cnt: Record<string, number> = {};
    for (let k = 0; k < n; k++) { const r = rollChestRarity(rand).rarity; cnt[r] = (cnt[r] ?? 0) + 1; }
    for (const row of chestOdds().rows) {
      const obs = ((cnt[row.rarity] ?? 0) / n) * 100;
      expect(Math.abs(obs - row.pct), `${row.rarity}: ${obs.toFixed(2)} vs ${row.pct}`).toBeLessThan(Math.max(0.5, row.pct * 0.15));
    }
  });
  it('garantie : jamais plus de pityRare-1 coffres de suite sans Rare+, ni pityEpic-1 sans Épique+', () => {
    const fun = defaultFun();
    fun.endless2.treasure.earned = 5000;
    const rand = mulberry(7);
    let sinceRare = 0, sinceEpic = 0, maxRare = 0, maxEpic = 0;
    const seen: Record<string, number> = {};
    for (let k = 0; k < 4000; k++) {
      const r = openChest(fun, rand)!;
      seen[r.rarity] = (seen[r.rarity] ?? 0) + 1;
      const i = RARITIES.indexOf(r.rarity);
      sinceRare = i >= 2 ? 0 : sinceRare + 1; sinceEpic = i >= 3 ? 0 : sinceEpic + 1;
      maxRare = Math.max(maxRare, sinceRare); maxEpic = Math.max(maxEpic, sinceEpic);
    }
    expect(maxRare).toBeLessThanOrEqual(T.pityRare - 1);
    expect(maxEpic).toBeLessThanOrEqual(T.pityEpic - 1);
    expect(seen.legendary).toBeGreaterThan(0);
    expect(fun.endless2.treasure.opened).toBe(4000);
    expect(pendingChests(fun)).toBe(1000);
  });
  it('contenu : toujours une vraie récompense ; Rare+ contient un objet du monde ; aucune récompense payante', () => {
    const rand = mulberry(99);
    const world = { world: defaultWorld(), e: 0, d: 0, h: 0 };
    const host = { world: world.world, giveEnergy: (n: number) => { world.e += n; }, giveDiamonds: (n: number) => { world.d += n; }, addHearts: (n: number) => { world.h += n; }, giveBooster: () => {} };
    for (let k = 0; k < 600; k++) {
      const t = rollTreasure(rand);
      expect(t.loot.length).toBeGreaterThan(0);
      expect(t.loot.every((l) => l.n > 0)).toBe(true);
      if (RARITIES.indexOf(t.rarity) >= 2) expect(t.loot.some((l) => ['accessory', 'bag', 'deco', 'cloth'].includes(l.kind))).toBe(true);
      applyLoot(host, t.loot);
    }
    expect(world.world.wardrobe.owned.length).toBeGreaterThan(6);
    expect(Object.keys(world.world.castle.owned).length).toBeGreaterThan(0);
    expect(world.world.res.coins).toBeGreaterThan(1000);
  });
  it('vêtements / décorations ajoutés au monde via les structures existantes, doublon → pièces', () => {
    const w = defaultWorld();
    const host = { world: w, giveEnergy() {}, giveDiamonds() {}, addHearts() {}, giveBooster() {} };
    const before = w.wardrobe.owned.length;
    const r = applyLoot(host, [{ kind: 'cloth', n: 1, rarity: 'rare', seed: 3 }]);
    expect(r.cloth.length).toBe(1);
    expect(w.wardrobe.owned.length).toBe(before + 1);
    expect(clothRarity(r.cloth[0])).toBe('rare');
    const d = applyLoot(host, [{ kind: 'deco', n: 1, rarity: 'uncommon', seed: 5 }]);
    expect(d.furniture.length).toBe(1);
    expect(w.castle.owned[d.furniture[0]]).toBe(1);
    // on possède déjà tout le dressing candidat → pièces de compensation
    for (const k of ['cloth', 'bag', 'accessory'] as const) for (const id of clothCandidates(k)) if (!w.wardrobe.owned.includes(id)) w.wardrobe.owned.push(id);
    const coins = w.res.coins;
    const dup = applyLoot(host, [{ kind: 'bag', n: 1, rarity: 'epic', seed: 1 }]);
    expect(dup.cloth.length).toBe(0);
    expect(dup.dupCoins).toBeGreaterThan(0);
    expect(w.res.coins).toBe(coins + dup.dupCoins);
    expect(furnitureCandidates().length).toBe(36);
  });
});

describe('jauge de trésor', () => {
  it('points par fusion croissants avec le niveau', () => {
    for (let l = 3; l <= 10; l++) expect(treasurePoints(l)).toBeGreaterThanOrEqual(treasurePoints(l - 1));
    expect(treasurePoints(8)).toBeGreaterThan(treasurePoints(2) * 2);
  });
  it('un coffre quand la jauge est pleine, le surplus est conservé, jamais perdu', () => {
    const fun = defaultFun();
    expect(addTreasure(fun, T.goal - 1)).toBe(0);
    expect(treasureView(fun).ratio).toBeLessThan(1);
    expect(addTreasure(fun, 3)).toBe(1);
    expect(fun.endless2.treasure.points).toBeCloseTo(2, 5);
    expect(addTreasure(fun, T.goal * 2)).toBe(2);
    expect(pendingChests(fun)).toBe(3);
    expect(openChest(fun, mulberry(1))).not.toBeNull();
    expect(pendingChests(fun)).toBe(2);
    const f2 = defaultFun();
    expect(openChest(f2, mulberry(1))).toBeNull();
  });
  it('règlement des gains du moteur : coffre, ticket, fragments → vêtement entier', () => {
    const fun = defaultFun();
    const rng = new Rng(3);
    settleLoot(fun, [{ kind: 'chest', n: 1 }, { kind: 'ticket', n: 2 }], rng);
    expect(pendingChests(fun)).toBe(1);
    expect(fun.endless2.tickets).toBe(2);
    let cloth = 0;
    for (let k = 0; k < ENDLESS_CFG.drops.fragmentsPerCloth * 3; k++) {
      const out = settleLoot(fun, [{ kind: 'fragment', n: 1, rarity: 'rare' } as Loot], rng);
      cloth += out.filter((l) => l.kind === 'cloth').length;
    }
    expect(cloth).toBe(3);
  });
});

describe('drops', () => {
  it('chance par fusion croissante avec le niveau ; raretés plausibles', () => {
    const fun = defaultFun();
    const rng = new Rng(8);
    const rate = (lv: number) => { let n = 0; for (let k = 0; k < 20000; k++) if (rollDrop(fun, rng, lv)) n++; return n / 20000; };
    const a = rate(2), b = rate(5), c = rate(8);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(Math.abs(b - ENDLESS_CFG.drops.chanceByLevel[5])).toBeLessThan(0.02);
    const st = fun.endless2.drops;
    expect(st['rarity:common']).toBeGreaterThan(st['rarity:rare'] ?? 0);
    expect(st['rarity:rare']).toBeGreaterThan(st['rarity:legendary'] ?? 0);
    expect(st['rarity:legendary'] ?? 0).toBeGreaterThan(0);
  });
});
