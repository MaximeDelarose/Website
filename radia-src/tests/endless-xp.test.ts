import { describe, it, expect } from 'vitest';
import { defaultFun } from '../src/save/fun';
import { addXp, levelOf, xpToReach, xpView, orderXp, levelReward } from '../src/game/endless/xp';
import { isUnlocked } from '../src/game/endless/unlocks';
import { bump } from '../src/game/endless/ctx';
import { COLLECTIONS } from '../src/data/items';

describe('niveau de Radia (XP)', () => {
  it('seuils croissants, niveau 1 à 0 XP, jamais de perte', () => {
    expect(levelOf(0)).toBe(1);
    for (let l = 2; l < 30; l++) expect(xpToReach(l)).toBeGreaterThan(xpToReach(l - 1));
    expect(levelOf(xpToReach(5))).toBe(5);
    expect(levelOf(xpToReach(5) - 1)).toBe(4);
  });
  it('les commandes difficiles rapportent plus, le savon PIMBÊCHE un bonus', () => {
    expect(orderXp('hard', [])).toBeGreaterThan(orderXp('mid', []));
    expect(orderXp('mid', [])).toBeGreaterThan(orderXp('easy', []));
    expect(orderXp('easy', [{ c: 'soap', l: 3 }])).toBeGreaterThan(orderXp('easy', [{ c: 'love', l: 3 }]));
  });
  it('un niveau gagné donne sa récompense une seule fois', () => {
    const f = defaultFun();
    let ups = 0; let coins = 0;
    for (let i = 0; i < 60; i++) { const u = addXp(f, 10); if (u) { ups++; coins += u.coins; } }
    expect(ups).toBeGreaterThan(2);
    expect(coins).toBeGreaterThan(0);
    const v = xpView(f);
    expect(v.level).toBe(levelOf(600));
    expect(v.ratio).toBeGreaterThanOrEqual(0); expect(v.ratio).toBeLessThanOrEqual(1);
    expect(levelReward(2).coins).toBeGreaterThan(0);
  });
});

describe('PIMBÊCHE : accessible très tôt, toujours au lait de chèvre', () => {
  it('l\'atelier s\'ouvre dès les premières commandes', () => {
    const f = defaultFun();
    expect(isUnlocked(f, 'soap')).toBe(false);
    bump(f, 'orders', 3);
    expect(isUnlocked(f, 'soap')).toBe(true);
  });
  it('chaque niveau de la chaîne cite le lait de chèvre ou la marque', () => {
    const c = COLLECTIONS.soap;
    expect(c.name).toMatch(/chèvre/i);
    c.blurbs.forEach((b, i) => expect(b.length, `niveau ${i + 1}`).toBeGreaterThan(10));
    expect(c.items.slice(0, 4).every((n) => /chèvre/i.test(n))).toBe(true);
    expect(c.items.slice(4).every((n) => /PIMBÊCHE/.test(n))).toBe(true);
  });
});
