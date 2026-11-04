import { describe, it, expect } from 'vitest';
import { ENERGY_MAX, FLOOR_LEVEL, FLOOR_REGEN_MS, FREE_TAP_EVERY, REGEN_MS, deliveryEnergy, nextEnergyIn, regenStep, rollChest, spendEnergy, syncEnergy } from '../src/game/economy/economy';
import { defaultEconomy } from '../src/save/schema';
import { LEGACY_COLLECTION_IDS } from '../src/data/items';

describe('énergie Endless 2.0 : jamais bloquante', () => {
  it('plancher : à 0, on retrouve de quoi jouer en moins de 3 minutes, sans rien payer', () => {
    const e = { ...defaultEconomy(), energy: 0, energyTs: 0 };
    syncEnergy(e, FLOOR_REGEN_MS * FLOOR_LEVEL);
    expect(e.energy).toBe(FLOOR_LEVEL);
    expect(FLOOR_REGEN_MS * FLOOR_LEVEL).toBeLessThanOrEqual(3 * 60_000);
    expect(nextEnergyIn({ ...e, energy: 0, energyTs: 0 }, 1000)).toBe(FLOOR_REGEN_MS - 1000);
  });
  it('au-dessus du plancher, la recharge reste la recharge normale ; au maximum, elle s\'arrête', () => {
    const e = { ...defaultEconomy(), energy: FLOOR_LEVEL, energyTs: 0 };
    expect(regenStep(e.energy)).toBe(REGEN_MS);
    syncEnergy(e, REGEN_MS * 2 + 1);
    expect(e.energy).toBe(FLOOR_LEVEL + 2);
    syncEnergy(e, REGEN_MS * 100_000);
    expect(e.energy).toBe(ENERGY_MAX);
  });
  it('dépenser sous le plancher puis attendre : cohérent, jamais négatif', () => {
    const e = { ...defaultEconomy(), energy: 2, energyTs: 0 };
    expect(spendEnergy(e, 1, 10)).toBe(true);
    expect(spendEnergy(e, 1, 20)).toBe(true);
    expect(spendEnergy(e, 1, 30)).toBe(false);
    expect(e.energy).toBe(0);
    expect(spendEnergy(e, 1, FLOOR_REGEN_MS + 100)).toBe(true);
  });
  it('bonus de jeu : livraisons rapportent de l\'énergie selon le palier ; un toucher sur N est gratuit', () => {
    expect(deliveryEnergy('easy')).toBeGreaterThan(0);
    expect(deliveryEnergy('hard')).toBeGreaterThan(deliveryEnergy('easy'));
    expect(FREE_TAP_EVERY).toBeGreaterThan(3);
  });
  it('le coffre historique ne donne que des objets des 4 collections d\'origine', () => {
    for (let k = 0; k < 100; k++) {
      let x = k / 100;
      const rand = () => { x = (x * 9301 + 0.4927) % 1; return x; };
      for (const it of rollChest('royal', rand).items) if (it.c !== 'special') expect(LEGACY_COLLECTION_IDS).toContain(it.c);
    }
  });
});
