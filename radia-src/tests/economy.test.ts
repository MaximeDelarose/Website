import { describe, it, expect } from 'vitest';
import { defaultEconomy, migrate, sanitize, SAVE_VERSION } from '../src/save/schema';
import {
  ENERGY_MAX, REGEN_MS, FREE_REFILL, FREE_REFILL_MS, syncEnergy, spendEnergy, addEnergy, takeFreeRefill, freeRefillIn,
  spendDiamonds, addDiamonds, bagPut, bagTake, upgradeBag, bagUpgradePrice, rollChest, PACKS, DECOR,
} from '../src/game/economy/economy';

describe('énergie', () => {
  it('se recharge d\'une unité par période, sans dépasser le maximum', () => {
    const e = { ...defaultEconomy(), energy: 10, energyTs: 0 };
    syncEnergy(e, REGEN_MS * 3 + 5);
    expect(e.energy).toBe(13);
    syncEnergy(e, REGEN_MS * 10_000);
    expect(e.energy).toBe(ENERGY_MAX);
  });
  it('dépense refusée si insuffisante, jamais négative', () => {
    const e = { ...defaultEconomy(), energy: 1, energyTs: 0 };
    expect(spendEnergy(e, 1, 1)).toBe(true);
    expect(spendEnergy(e, 1, 2)).toBe(false);
    expect(e.energy).toBe(0);
  });
  it('les récompenses peuvent dépasser le maximum', () => {
    const e = { ...defaultEconomy(), energy: 95, energyTs: 0 };
    addEnergy(e, 20, 0);
    expect(e.energy).toBe(115);
  });
  it('recharge gratuite : une fois par période', () => {
    const e = { ...defaultEconomy(), energy: 0, energyTs: 0, freeRefillTs: 0 };
    const t = FREE_REFILL_MS + 1;
    expect(takeFreeRefill(e, t)).toBe(true);
    expect(e.energy).toBeGreaterThanOrEqual(FREE_REFILL);
    expect(takeFreeRefill(e, t + 1000)).toBe(false);
    expect(freeRefillIn(e, t + 1000)).toBeGreaterThan(0);
  });
});

describe('diamants, sac, coffres', () => {
  it('solde jamais négatif', () => {
    const e = { ...defaultEconomy(), diamonds: 10 };
    expect(spendDiamonds(e, 11)).toBe(false);
    expect(spendDiamonds(e, 10)).toBe(true);
    expect(e.diamonds).toBe(0);
    addDiamonds(e, 1400);
    expect(e.diamonds).toBe(1400);
  });
  it('sac : places limitées, agrandissement payant', () => {
    const e = { ...defaultEconomy(), diamonds: 1000 };
    for (let k = 0; k < e.bagSlots; k++) expect(bagPut(e, { c: 'love', l: 2 })).toBe(true);
    expect(bagPut(e, { c: 'love', l: 2 })).toBe(false);
    expect(bagPut(e, { c: 'gen', l: 1 })).toBe(false);
    const price = bagUpgradePrice(e);
    expect(upgradeBag(e)).toBe(true);
    expect(e.diamonds).toBe(1000 - price);
    expect(bagPut(e, { c: 'love', l: 2 })).toBe(true);
    expect(bagTake(e, 0)).toEqual({ c: 'love', l: 2 });
  });
  it('coffres : toujours une vraie récompense', () => {
    for (let k = 0; k < 50; k++) {
      let x = k / 50;
      const rand = () => { x = (x * 9301 + 0.4927) % 1; return x; };
      const free = rollChest('free', rand);
      expect(free.energy + free.hearts).toBeGreaterThan(0);
      const royal = rollChest('royal', rand);
      expect(royal.items.length).toBeGreaterThanOrEqual(2);
      expect(royal.wands).toBeGreaterThanOrEqual(1);
    }
  });
  it('packs et décorations cohérents', () => {
    expect(PACKS.map((p) => [p.euros, p.diamonds])).toEqual([[1, 100], [5, 600], [10, 1400], [20, 3200], [50, 10000]]);
    expect(DECOR.length).toBe(12);
  });
});

describe('migration v1 → v2', () => {
  it('ajoute l\'économie sans rien perdre', () => {
    const v1 = { v: 1, hearts: 120, memories: ['flowers'], story: { step: 12, choices: {}, history: [] }, levels: { 1: { stars: 3, best: 10, done: true } } };
    const m = migrate(v1);
    expect(m.migrated).toBe(true);
    expect(m.data.v).toBe(SAVE_VERSION);
    expect(m.data.hearts).toBe(120);
    expect(m.data.memories).toEqual(['flowers']);
    expect(m.data.economy.diamonds).toBe(50);
    expect(m.data.economy.energy).toBe(100);
    expect(m.data.seenUpdates).toEqual([]);
  });
  it('données d\'économie abîmées → valeurs sûres', () => {
    const s = sanitize({ v: 2, economy: { energy: -5, diamonds: 'x', bag: [{ c: 'gen', l: 1 }, { c: 'love', l: 3 }], bagSlots: 99 } });
    expect(s.economy.energy).toBe(0);
    expect(s.economy.diamonds).toBe(30);
    expect(s.economy.bag).toEqual([{ c: 'love', l: 3 }]);
    expect(s.economy.bagSlots).toBeLessThanOrEqual(24);
  });
});
