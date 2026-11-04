import { describe, it, expect } from 'vitest';
import { defaultFun } from '../src/save/fun';
import { WELCOME_CHIPS, REFILL_MS, REFILL_TO, canBet, credit, debit, grant, recordRound, refill, refillIn, returnBring, setBring, total, welcome, LIMITS } from '../src/casino/chips';
import { MISSIONS, claimMission, claimableCount, rewardExists, missionById, progressOf } from '../src/casino/missions';
import { defaultWorld } from '../src/save/schema';
import { defaultRng, seededRng, shuffle, randInt } from '../src/casino/rng';

const fresh = () => defaultFun().casino;

describe('jetons : allocation, bring, mises', () => {
  it('allocation gratuite une seule fois', () => {
    const s = fresh();
    expect(welcome(s)).toBe(WELCOME_CHIPS);
    expect(welcome(s)).toBe(0);
    expect(s.chips).toBe(WELCOME_CHIPS);
  });
  it('carte d\'Auguste : le montant est borné et le reste revient en poche', () => {
    const s = fresh(); welcome(s);
    expect(setBring(s, 200)).toBe(200);
    expect(s.chips).toBe(300); expect(s.bring).toBe(200);
    expect(setBring(s, 99999)).toBe(500); expect(s.chips).toBe(0);
    expect(setBring(s, -5)).toBe(0); expect(s.chips).toBe(500);
    expect(setBring(s, NaN)).toBe(0);
    setBring(s, 120);
    expect(returnBring(s)).toBe(120);
    expect(s.chips).toBe(500); expect(s.bring).toBe(0);
  });
  it('mise validée avant la manche, jamais de solde négatif', () => {
    const s = fresh(); grant(s, 100); setBring(s, 100);
    expect(canBet(s, 'roulette', 5)).toBe(true);
    expect(canBet(s, 'roulette', 4)).toBe(false);
    expect(canBet(s, 'slots', 5)).toBe(false);
    expect(canBet(s, 'blackjack', 200)).toBe(false);
    expect(canBet(s, 'roulette', 2.5)).toBe(false);
    expect(debit(s, 101)).toBe(false); expect(s.bring).toBe(100);
    expect(debit(s, 60)).toBe(true); expect(debit(s, 60)).toBe(false);
    expect(s.bring).toBe(40);
    expect(debit(s, 0)).toBe(false); expect(debit(s, -3)).toBe(false); expect(debit(s, NaN)).toBe(false);
    expect(s.bring).toBeGreaterThanOrEqual(0);
    credit(s, 25.9); expect(s.bring).toBe(65);
  });
  it('limites min/max par jeu', () => {
    const s = fresh(); grant(s, 5000); setBring(s, 5000);
    for (const g of ['roulette', 'slots', 'blackjack'] as const) {
      expect(canBet(s, g, LIMITS[g].min)).toBe(true);
      expect(canBet(s, g, LIMITS[g].max)).toBe(true);
      expect(canBet(s, g, LIMITS[g].max + 1)).toBe(false);
    }
  });
  it('mini-recharge gratuite : seulement quand le solde est vide, toutes les ~3 min, toujours dispo', () => {
    const s = fresh(); welcome(s);
    expect(refillIn(s, 1000)).toBe(Infinity);
    expect(refill(s, 1000)).toBe(0);
    s.chips = 3;
    expect(refillIn(s, 5000)).toBe(0);
    expect(refill(s, 5000)).toBe(REFILL_TO - 3);
    expect(total(s)).toBe(REFILL_TO);
    s.chips = 0;
    expect(refillIn(s, 5000 + 1000)).toBe(REFILL_MS - 1000);
    expect(refill(s, 6000)).toBe(0);
    expect(refill(s, 5000 + REFILL_MS)).toBe(REFILL_TO);
    // l'argent sur la table compte dans le total
    const t = fresh(); t.bring = 50; expect(refillIn(t, 1e9)).toBe(Infinity);
  });
  it('statistiques et historique plafonné', () => {
    const s = fresh();
    for (let i = 0; i < 70; i++) recordRound(s, 'slots', 10, i % 2 ? 30 : 0, i);
    expect(s.history.length).toBe(60);
    expect(s.stats['slots.parties']).toBe(70);
    expect(s.stats['slots.victoires']).toBe(35);
    expect(s.stats['slots.meilleur']).toBe(20);
  });
  it('grant ignore les valeurs invalides', () => {
    const s = fresh();
    expect(grant(s, -4)).toBe(0); expect(grant(s, NaN)).toBe(0); expect(grant(s, 12.7)).toBe(12);
    expect(s.chips).toBe(12);
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
    for (const m of MISSIONS) { expect(m.goal).toBeGreaterThan(0); expect(m.chips).toBeGreaterThan(0); }
  });
  it('réclamation unique, jetons + objet, doublon compensé', () => {
    const s = fresh(); const w = defaultWorld();
    expect(claimMission(s, w, 'roulette-10').ok).toBe(false); // pas encore accomplie
    s.stats['roulette.parties'] = 10;
    expect(claimableCount(s)).toBe(1);
    const r = claimMission(s, w, 'roulette-10');
    expect(r.ok).toBe(true); expect(s.chips).toBe(150);
    expect(w.wardrobe.owned).toContain('ea-stars');
    expect(claimMission(s, w, 'roulette-10').ok).toBe(false);
    expect(s.chips).toBe(150);
    // doublon : objet déjà possédé
    const s2 = fresh(); s2.stats['slots.parties'] = 10;
    w.wardrobe.owned.push('gl-heart-pink' as never);
    const r2 = claimMission(s2, w, 'slots-10');
    expect(r2.duplicate).toBe(true); expect(s2.chips).toBe(350);
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
