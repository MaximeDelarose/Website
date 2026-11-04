import { describe, it, expect } from 'vitest';
import { canDouble, compare, dealerPlay, doubleDown, freshShuffledDeck, handValue, hit, isBlackjack, newDeck, returned, returnedFor, stakeOf, stand, startRound, type Card } from '../src/casino/blackjack';
import { seededRng } from '../src/casino/rng';

const c = (rank: number, suit = 0): Card => ({ rank, suit });
/** Paquet « arrangé » : on pop depuis la fin, donc on liste dans l'ordre de distribution inversé. */
const stacked = (...order: number[]): Card[] => order.map((r) => c(r)).reverse();

describe('valeurs et As', () => {
  it('figures = 10, As = 11 ou 1', () => {
    expect(handValue([c(13), c(12)]).total).toBe(20);
    expect(handValue([c(1), c(13)])).toEqual({ total: 21, soft: true });
    expect(handValue([c(1), c(1)])).toEqual({ total: 12, soft: true });
    expect(handValue([c(1), c(9), c(5)])).toEqual({ total: 15, soft: false });
    expect(handValue([c(1), c(1), c(1), c(8)]).total).toBe(21);
    expect(handValue([c(10), c(5), c(9)]).total).toBe(24);
    expect(handValue([c(1), c(6)])).toEqual({ total: 17, soft: true });
  });
  it('blackjack naturel = 2 cartes à 21 seulement', () => {
    expect(isBlackjack([c(1), c(13)])).toBe(true);
    expect(isBlackjack([c(7), c(7), c(7)])).toBe(false);
  });
  it('paquet : 52 cartes uniques, mélange honnête', () => {
    const d = freshShuffledDeck(seededRng(4));
    expect(d.length).toBe(52);
    expect(new Set(d.map((x) => `${x.rank}/${x.suit}`)).size).toBe(52);
    expect(freshShuffledDeck(seededRng(4))).toEqual(d);
    expect(d).not.toEqual(newDeck());
  });
});

describe('gains', () => {
  it('3:2 sur blackjack, 1:1 victoire, push rend la mise, défaite 0', () => {
    expect(returnedFor('blackjack', 100)).toBe(250);
    expect(returnedFor('blackjack', 10)).toBe(25);
    expect(returnedFor('win', 50)).toBe(100);
    expect(returnedFor('push', 50)).toBe(50);
    expect(returnedFor('lose', 50)).toBe(0);
    expect(returnedFor('bust', 50)).toBe(0);
  });
  it('donne : naturel de la joueuse payé 3:2', () => {
    const r = startRound(stacked(1, 5, 13, 9, 2), 20); // joueuse A, croupier 5, joueuse R, croupier 9
    expect(r.phase).toBe('done'); expect(r.outcome).toBe('blackjack');
    expect(returned(r)).toBe(50);
  });
  it('les deux naturels : égalité ; naturel du croupier : perdu', () => {
    expect(startRound(stacked(1, 1, 13, 13), 10).outcome).toBe('push');
    expect(startRound(stacked(9, 1, 8, 13), 10).outcome).toBe('lose');
  });
});

describe('déroulement', () => {
  it('le croupier tire jusqu\'à 17 et reste sur 17 (même souple)', () => {
    const r = startRound(stacked(10, 6, 9, 10, 5, 2), 10); // joueuse 19, croupier 16 → tire 5 = 21? (6+10 puis 5)
    expect(r.dealer.map((x) => x.rank)).toEqual([6, 10]);
    const drawn = stand(r);
    expect(drawn.map((x) => x.rank)).toEqual([5]);
    expect(handValue(r.dealer).total).toBe(21);
    expect(r.outcome).toBe('lose');
    const soft = startRound(stacked(10, 1, 8, 6), 10); // croupier A+6 = 17 souple : reste
    expect(dealerPlay(soft)).toEqual([]);
    expect(compare([c(10), c(8)], soft.dealer)).toBe('win');
  });
  it('dépassement de 21 : perdu immédiatement, le croupier ne joue pas', () => {
    const r = startRound(stacked(10, 6, 6, 10, 13), 10);
    hit(r);
    expect(r.outcome).toBe('bust'); expect(r.phase).toBe('done');
    expect(returned(r)).toBe(0); expect(hit(r)).toBeNull();
  });
  it('croupier qui dépasse : victoire ; égalité : push', () => {
    const r = startRound(stacked(10, 6, 8, 10, 13), 10); // joueuse 18, croupier 16 + R = 26
    stand(r); expect(r.outcome).toBe('win'); expect(returned(r)).toBe(20);
    const p = startRound(stacked(10, 10, 8, 8), 10); // 18 contre 18
    stand(p); expect(p.outcome).toBe('push'); expect(returned(p)).toBe(10);
  });
  it('doubler : seulement sur 2 cartes, mise x2, une seule carte, gain sur la mise doublée', () => {
    const r = startRound(stacked(5, 10, 6, 7, 10, 5), 20); // joueuse 11, croupier 17 → double : tire 10 = 21
    expect(canDouble(r)).toBe(true);
    const d = doubleDown(r)!;
    expect(d.card.rank).toBe(10); expect(r.doubled).toBe(true); expect(stakeOf(r)).toBe(40);
    expect(r.outcome).toBe('win'); expect(returned(r)).toBe(80);
    expect(canDouble(r)).toBe(false); expect(doubleDown(r)).toBeNull();
    const h = startRound(stacked(2, 10, 3, 7, 4, 4), 10); hit(h);
    expect(canDouble(h)).toBe(false); // plus de 2 cartes
  });
  it('doubler et dépasser : perdu avec la mise doublée', () => {
    const r = startRound(stacked(10, 10, 6, 7, 13), 10);
    doubleDown(r); expect(r.outcome).toBe('bust'); expect(stakeOf(r)).toBe(20); expect(returned(r)).toBe(0);
  });
  it('simulation : distribution des issues plausible (stratégie « reste sur 17 »)', () => {
    const rng = seededRng(21); const N = 40000; let net = 0; const cnt: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const r = startRound(freshShuffledDeck(rng), 10);
      while (r.phase === 'player' && handValue(r.player).total < 17) hit(r);
      if (r.phase === 'player') stand(r);
      cnt[r.outcome!] = (cnt[r.outcome!] ?? 0) + 1;
      net += returned(r) - stakeOf(r);
    }
    expect(cnt.blackjack / N).toBeGreaterThan(0.035); expect(cnt.blackjack / N).toBeLessThan(0.055);
    expect(net / (N * 10)).toBeGreaterThan(-0.1); expect(net / (N * 10)).toBeLessThan(0.02);
  });
});
