import { describe, it, expect, vi } from 'vitest';
import { MAX_LIVE, MAX_PER_CALL, RARITY_COLOR, RARITY_COUNT, nextGlintDelay, particleBudget, planBurst, planConfetti, rarityForPrice, sparkleBurst, confetti, revealItem } from '../src/ui/fx/sparkle';
import { shineAt } from '../src/game/art/world/wristShine';

vi.mock('../src/audio/AudioManager', () => ({ AudioManager: class {}, audio: { play() {}, setSettings() {} } }));
vi.stubGlobal('window', globalThis);

const seeded = () => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

describe('plafond des particules', () => {
  it('par appel, global et en mode réduit', () => {
    expect(particleBudget(500, 0, false)).toBe(MAX_PER_CALL);
    expect(particleBudget(20, MAX_LIVE - 5, false)).toBe(5);
    expect(particleBudget(20, MAX_LIVE + 10, false)).toBe(0);
    expect(particleBudget(20, 0, true)).toBe(3);
    expect(particleBudget(NaN, 0, false)).toBe(0);
    expect(particleBudget(-4, 0, false)).toBe(0);
  });
  it('un éclat dépend de la rareté et reste déterministe', () => {
    const a = planBurst({ rarity: 'legendary', rng: seeded() });
    const b = planBurst({ rarity: 'legendary', rng: seeded() });
    expect(a).toEqual(b);
    expect(a.length).toBe(RARITY_COUNT.legendary);
    expect(planBurst({ rarity: 'common', rng: seeded() }).length).toBe(RARITY_COUNT.common);
    expect(planBurst({ rarity: 'legendary', count: 1000, rng: seeded() }).length).toBe(MAX_PER_CALL);
    expect(a.some((p) => p.color === RARITY_COLOR.legendary)).toBe(true);
  });
  it('mode réduit : version statique douce (3 étoiles, aucune chute ni retard)', () => {
    const p = planBurst({ rarity: 'epic', reduced: true, rng: seeded() });
    expect(p.length).toBe(3);
    expect(p.every((x) => x.delay === 0 && x.fall === 0)).toBe(true);
    const c = planConfetti({ reduced: true, rng: seeded() });
    expect(c.length).toBeLessThanOrEqual(3);
    expect(c.every((x) => x.fall === 0)).toBe(true);
    expect(planConfetti({ count: 999, rng: seeded() }).length).toBe(MAX_PER_CALL);
  });
});

describe('rareté et bracelet', () => {
  it('rareté d’après le prix', () => {
    expect(rarityForPrice(50)).toBe('common');
    expect(rarityForPrice(150)).toBe('uncommon');
    expect(rarityForPrice(300)).toBe('rare');
    expect(rarityForPrice(450)).toBe('epic');
    expect(rarityForPrice(100, 5)).toBe('epic');
    expect(rarityForPrice(0, 0, true)).toBe('legendary');
  });
  it('le scintillement suit le rythme du reflet de l’avatar', () => {
    for (const t of [0, 1.3, 7.7, 12]) {
      const d = nextGlintDelay(t) / 1000;
      expect(shineAt(t + d + 0.1)).toBeGreaterThan(0);
      expect(shineAt(t + d - 0.1)).toBe(0);
    }
    expect(nextGlintDelay(NaN)).toBe(5000);
  });
});

describe('sans DOM', () => {
  it('ne plante jamais', async () => {
    expect(() => { sparkleBurst(10, 10); confetti(1, 1); }).not.toThrow();
    await expect(revealItem({ isConnected: true } as unknown as Element)).resolves.toBeUndefined();
  });
});
