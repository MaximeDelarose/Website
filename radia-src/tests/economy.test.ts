import { describe, it, expect } from 'vitest';
import { defaultEconomy, migrate, sanitize, SAVE_VERSION } from '../src/save/schema';
import {
  ENERGY_MAX, REGEN_MS, FREE_REFILL, syncEnergy, spendEnergy, addEnergy, takeFreeRefill, freeRefillIn,
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
  // CHANGEMENT DE RÈGLE VOULU (demande de la joueuse) : l'ancien test « les récompenses peuvent dépasser le maximum » (95 + 20 = 115)
  // n'est plus valable ; l'énergie est désormais plafonnée à 100 (plus de « 644 / 100 »).
  it('l\'énergie ne dépasse JAMAIS le maximum : 95 + 20 → 100, gain réel = 5', () => {
    const e = { ...defaultEconomy(), energy: 95, energyTs: 0 };
    expect(addEnergy(e, 20, 0)).toBe(5);
    expect(e.energy).toBe(ENERGY_MAX);
    expect(addEnergy(e, 500, 0)).toBe(0);
    expect(e.energy).toBe(100);
  });
  it('un gain négatif ou fractionnaire est sans danger', () => {
    const e = { ...defaultEconomy(), energy: 50, energyTs: 0 };
    expect(addEnergy(e, -10, 0)).toBe(0);
    expect(addEnergy(e, 2.9, 0)).toBe(2);
    expect(e.energy).toBe(52);
  });
  it('la réserve héritée ne sert qu\'à 0 d\'énergie, 1 pour 1, sans jamais devenir négative', () => {
    const e = { ...defaultEconomy(), energy: 2, reserve: 3, energyTs: 0 };
    expect(spendEnergy(e, 1, 1)).toBe(true); expect(e.energy).toBe(1); expect(e.reserve).toBe(3); // l'énergie normale d'abord
    expect(spendEnergy(e, 3, 1)).toBe(true); expect(e.energy).toBe(0); expect(e.reserve).toBe(1); // 1 d'énergie + 2 de réserve
    expect(spendEnergy(e, 2, 1)).toBe(false); expect(e.reserve).toBe(1); // pas assez : rien n'est consommé
  });
  // CHANGEMENT DE RÈGLE VOULU (refonte de l'économie) : l'attention d'Auguste (+30) est désormais QUOTIDIENNE (avant : toutes les 10 minutes) ;
  // la recharge naturelle passe à 1 énergie / 2 min 30 (avant : 45 s). Voir docs/BALANCING.md.
  const T0 = new Date(2026, 10, 9, 10, 0, 0).getTime(); // 9 novembre 2026, 10 h (heure locale)
  it('recharge naturelle : 1 énergie toutes les 2 minutes (plein en environ 3 h 20)', () => {
    expect(REGEN_MS).toBe(120_000);
    const e = { ...defaultEconomy(), energy: 0, energyTs: T0 };
    syncEnergy(e, T0 + 60 * 60_000);
    expect(e.energy).toBeGreaterThanOrEqual(30); expect(e.energy).toBeLessThanOrEqual(32); // 3 énergies en 3 min sous le plancher, puis 1 / 2 min
  });
  it('attention d\'Auguste : jamais consommée si l\'énergie est déjà pleine', () => {
    const e = { ...defaultEconomy(), energy: 100, energyTs: T0, freeRefillTs: 0 };
    expect(takeFreeRefill(e, T0)).toBe(false);
    expect(e.freeRefillTs).toBe(0);
  });
  it('attention d\'Auguste : n\'ajoute jamais plus que la place restante', () => {
    const e = { ...defaultEconomy(), energy: 90, energyTs: T0, freeRefillTs: 0 };
    expect(takeFreeRefill(e, T0)).toBe(true);
    expect(e.energy).toBe(100);
  });
  it('attention d\'Auguste : UNE fois par jour, de nouveau disponible le lendemain, état d\'attente visible', () => {
    const e = { ...defaultEconomy(), energy: 0, energyTs: T0, freeRefillTs: 0 };
    expect(freeRefillIn(e, T0)).toBe(0); // disponible
    expect(takeFreeRefill(e, T0)).toBe(true);
    expect(e.energy).toBeGreaterThanOrEqual(FREE_REFILL);
    expect(e.energy).toBeLessThanOrEqual(ENERGY_MAX);
    e.energy = 0; e.energyTs = T0 + 3 * 3600_000;
    expect(takeFreeRefill(e, T0 + 3 * 3600_000)).toBe(false); // même jour : refusé
    const wait = freeRefillIn(e, T0 + 3 * 3600_000);
    expect(wait).toBeGreaterThan(0); expect(wait).toBeLessThanOrEqual(14 * 3600_000); // jusqu'à minuit
    const tomorrow = new Date(2026, 10, 10, 8, 0, 0).getTime();
    expect(freeRefillIn(e, tomorrow)).toBe(0);
    e.energy = 10; e.energyTs = tomorrow; // (l'énergie ne doit pas être pleine : la recharge offerte n'est jamais consommée pour rien)
    expect(takeFreeRefill(e, tomorrow)).toBe(true);
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
    expect(PACKS.map((p) => [p.euros, p.diamonds])).toEqual([[1, 50], [5, 275], [10, 600], [20, 1300], [50, 3500]]);
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
    expect(m.data.economy.diamonds).toBe(15);
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

describe('migration du plafond d\'énergie (sauvegardes existantes)', () => {
  it('644 d\'énergie → 100 + réserve de 544 : rien n\'est perdu', () => {
    const s = sanitize({ v: SAVE_VERSION, economy: { energy: 644, diamonds: 12 } });
    expect(s.economy.energy).toBe(100);
    expect(s.economy.reserve).toBe(544);
    expect(s.economy.diamonds).toBe(12);
  });
  it('idempotent : re-sanitiser l\'état déjà migré ne crée pas de réserve en plus', () => {
    const once = sanitize({ v: SAVE_VERSION, economy: { energy: 644 } });
    const twice = sanitize(JSON.parse(JSON.stringify(once)));
    expect(twice.economy.energy).toBe(100);
    expect(twice.economy.reserve).toBe(544);
  });
  it('énergie ≤ 100 : réserve à 0 ; valeurs absurdes bornées', () => {
    expect(sanitize({ v: SAVE_VERSION, economy: { energy: 40 } }).economy.reserve).toBe(0);
    expect(sanitize({ v: SAVE_VERSION, economy: { energy: 1e9, reserve: 1e9 } }).economy.reserve).toBe(9999);
    expect(sanitize({ v: SAVE_VERSION, economy: { energy: -5 } }).economy.energy).toBe(0);
  });
});
