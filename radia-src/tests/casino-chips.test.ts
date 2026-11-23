import { describe, it, expect } from 'vitest';
import { defaultFun } from '../src/save/fun';
import { WELCOME_COINS, recordRound, welcome, LIMITS } from '../src/casino/chips';
import { MISSIONS, claimMission, claimableCount, rewardExists, missionById, progressOf } from '../src/casino/missions';
import { defaultWorld } from '../src/save/schema';
import { defaultRng, seededRng, shuffle, randInt } from '../src/casino/rng';

const fresh = () => defaultFun().casino;

describe('casino : cadeau d\'ouverture et statistiques (pièces)', () => {
  it('cadeau d\'ouverture en PIÈCES, une seule fois', () => {
    const s = fresh();
    expect(welcome(s)).toBe(WELCOME_COINS);
    expect(welcome(s)).toBe(0);
    expect(s.welcomed).toBe(true);
  });
  it('plus aucun portefeuille de tickets dans l\'état du casino', () => {
    const s = fresh() as unknown as Record<string, unknown>;
    for (const k of ['chips', 'bring', 'refillTs']) expect(k in s, k).toBe(false);
  });
  it('limites min/max par jeu (mises en pièces)', () => {
    for (const g of ['roulette', 'slots', 'blackjack'] as const) {
      expect(LIMITS[g].min).toBe(10);
      expect(LIMITS[g].max).toBeGreaterThan(1000); // plus de plafond fixe à 1 000 : la mise dépend de la richesse (bank.ts)
    }
  });
  it('statistiques et historique plafonné', () => {
    const s = fresh();
    for (let i = 0; i < 70; i++) recordRound(s, 'slots', 10, i % 2 ? 30 : 0, i);
    expect(s.history.length).toBe(60);
    expect(s.stats['slots.parties']).toBe(70);
    expect(s.stats['slots.victoires']).toBe(35);
    expect(s.stats['slots.meilleur']).toBe(20);
  });
});

describe('rng', () => {
  it('Fisher–Yates conserve les éléments et est reproductible', () => {
    const a = Array.from({ length: 52 }, (_, i) => i);
    const s1 = shuffle(a, seededRng(7)); const s2 = shuffle(a, seededRng(7));
    expect(s1).toEqual(s2);
    expect([...s1].sort((x, y) => x - y)).toEqual(a);
    expect(a[0]).toBe(0); // l'original n'est pas modifié
  });
  it('randInt reste dans les bornes ; defaultRng dans [0,1)', () => {
    expect(randInt(() => 0.999999999, 37)).toBe(36);
    expect(randInt(() => 0, 37)).toBe(0);
    for (let i = 0; i < 100; i++) { const x = defaultRng(); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
  it('mélange sans biais grossier (position de la 1re carte)', () => {
    const rng = seededRng(99); const counts = new Array(5).fill(0);
    for (let i = 0; i < 50000; i++) counts[shuffle([0, 1, 2, 3, 4], rng)[0]]++;
    for (const c of counts) expect(Math.abs(c - 10000)).toBeLessThan(400);
  });
});

describe('missions (sans hasard, objets réels)', () => {
  it('tous les objets exclusifs existent dans le monde', () => {
    for (const m of MISSIONS) if (m.item) expect(rewardExists(m.item), `${m.id} → ${m.item.id}`).toBe(true);
  });
  it('ids uniques, objectifs atteignables, récompenses positives', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
    for (const m of MISSIONS) { expect(m.goal).toBeGreaterThan(0); expect(m.coins).toBeGreaterThan(0); }
  });
  it('réclamation unique, pièces + objet, doublon compensé en pièces', () => {
    const s = fresh(); const w = defaultWorld(); const c0 = w.res.coins;
    expect(claimMission(s, w, 'roulette-10').ok).toBe(false); // pas encore accomplie
    s.stats['roulette.parties'] = 10;
    expect(claimableCount(s)).toBe(1);
    const r = claimMission(s, w, 'roulette-10');
    expect(r.ok).toBe(true); expect(r.coins).toBe(200); expect(w.res.coins).toBe(c0 + 200);
    expect(w.wardrobe.owned).toContain('ea-stars');
    expect(claimMission(s, w, 'roulette-10').ok).toBe(false);
    expect(w.res.coins).toBe(c0 + 200); // jamais deux fois
    // doublon : objet déjà possédé
    const s2 = fresh(); s2.stats['slots.parties'] = 10;
    w.wardrobe.owned.push('gl-heart-pink' as never);
    const r2 = claimMission(s2, w, 'slots-10');
    expect(r2.duplicate).toBe(true); expect(r2.coins).toBe(400); expect(w.res.coins).toBe(c0 + 600);
    expect(w.wardrobe.owned.filter((x) => x === 'gl-heart-pink').length).toBe(1);
  });
  it('mobilier : ajouté une fois ; « trois jeux » compte les jeux différents', () => {
    const s = fresh(); const w = defaultWorld();
    s.stats['roulette.parties'] = 1; s.stats['slots.parties'] = 2;
    expect(progressOf(s, missionById('all-games')!)).toBe(2);
    s.stats['blackjack.parties'] = 1;
    expect(claimMission(s, w, 'all-games').ok).toBe(true);
    expect(w.castle.owned['red-carpet']).toBe(1);
    expect(missionById('nope')).toBeUndefined();
    expect(claimMission(s, w, 'nope').ok).toBe(false);
  });
});
