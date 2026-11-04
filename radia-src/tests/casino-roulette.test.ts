import { describe, it, expect } from 'vitest';
import { BetBook, WHEEL_ORDER, colorOf, covered, payoutRatio, settle, spin, validBet, betProbability, type Bet } from '../src/casino/roulette';
import { seededRng } from '../src/casino/rng';
import { defaultFun } from '../src/save/fun';
import { canBet, credit, debit, grant, setBring } from '../src/casino/chips';

const b = (kind: Bet['kind'], amount: number, nums?: number[]): Bet => ({ kind, amount, nums });

describe('roue européenne', () => {
  it('37 cases, ordre réel, couleurs : 18 rouges, 18 noirs, 0 vert', () => {
    expect(WHEEL_ORDER.length).toBe(37);
    expect(new Set(WHEEL_ORDER).size).toBe(37);
    const cs = WHEEL_ORDER.map(colorOf);
    expect(cs.filter((c) => c === 'red').length).toBe(18);
    expect(cs.filter((c) => c === 'black').length).toBe(18);
    expect(colorOf(0)).toBe('green');
    expect(colorOf(32)).toBe('red'); expect(colorOf(15)).toBe('black'); expect(colorOf(17)).toBe('black'); expect(colorOf(36)).toBe('red');
  });
});

describe('paiements exacts', () => {
  it('numéro plein 35:1 (mise rendue + 35×)', () => {
    expect(settle([b('num', 10, [17])], 17).returned).toBe(360);
    expect(settle([b('num', 10, [17])], 17).net).toBe(350);
    expect(settle([b('num', 10, [17])], 18).returned).toBe(0);
    expect(settle([b('num', 5, [0])], 0).returned).toBe(180);
  });
  it('chances simples 1:1 ; le 0 les fait perdre', () => {
    for (const k of ['red', 'black', 'even', 'odd'] as const) {
      expect(settle([b(k, 10)], 0).returned).toBe(0);
      expect(settle([b(k, 10)], 0).net).toBe(-10);
    }
    expect(settle([b('red', 10)], 1).returned).toBe(20);
    expect(settle([b('red', 10)], 2).returned).toBe(0);
    expect(settle([b('black', 10)], 2).returned).toBe(20);
    expect(settle([b('even', 10)], 2).returned).toBe(20);
    expect(settle([b('even', 10)], 3).returned).toBe(0);
    expect(settle([b('odd', 10)], 3).returned).toBe(20);
  });
  it('groupes de 2, 3, 4, 6 numéros : 17:1, 11:1, 8:1, 5:1', () => {
    expect(settle([b('nums', 10, [1, 2])], 2).returned).toBe(180);
    expect(settle([b('nums', 10, [1, 2, 3])], 3).returned).toBe(120);
    expect(settle([b('nums', 10, [1, 2, 4, 5])], 5).returned).toBe(90);
    expect(settle([b('nums', 10, [1, 2, 3, 4, 5, 6])], 6).returned).toBe(60);
    expect(settle([b('nums', 10, [1, 2, 3, 4, 5, 6])], 7).returned).toBe(0);
    expect(validBet(b('nums', 10, [1, 2, 3, 4, 5]))).toBe(false); // 5 numéros : paiement non entier
    expect(validBet(b('nums', 10, [1, 1]))).toBe(false);
    expect(validBet(b('num', 10, [40]))).toBe(false);
    expect(validBet(b('red', 0))).toBe(false);
  });
  it('mises multiples simultanées', () => {
    const bets = [b('red', 10), b('odd', 10), b('num', 5, [7]), b('nums', 20, [7, 8])];
    const r = settle(bets, 7); // rouge, impair, plein, groupe
    expect(r.stake).toBe(45);
    expect(r.returned).toBe(20 + 20 + 180 + 360);
    expect(r.net).toBe(r.returned - 45);
    const z = settle(bets, 0);
    expect(z.returned).toBe(0); expect(z.net).toBe(-45);
  });
  it('probabilités et espérance : 18/37, 1/37, k/37 ; retour théorique 36/37 pour toutes les mises', () => {
    expect(betProbability({ kind: 'red' })).toBeCloseTo(18 / 37, 12);
    expect(betProbability({ kind: 'num', nums: [3] })).toBeCloseTo(1 / 37, 12);
    expect(betProbability({ kind: 'nums', nums: [1, 2, 3] })).toBeCloseTo(3 / 37, 12);
    for (const spec of [{ kind: 'red' as const }, { kind: 'odd' as const }, { kind: 'num' as const, nums: [5] }, { kind: 'nums' as const, nums: [1, 2, 3, 4] }]) {
      expect(betProbability(spec) * (payoutRatio(spec) + 1)).toBeCloseTo(36 / 37, 12);
      expect(covered(spec).length).toBeGreaterThan(0);
    }
  });
});

describe('tirage honnête', () => {
  it('uniforme sur 100 000 tirages', () => {
    const rng = seededRng(2024); const c = new Array(37).fill(0);
    const N = 100_000;
    for (let i = 0; i < N; i++) c[spin(rng)]++;
    const e = N / 37;
    for (const x of c) expect(Math.abs(x - e) / e).toBeLessThan(0.1);
    const chi = c.reduce((a, x) => a + (x - e) ** 2 / e, 0);
    expect(chi).toBeLessThan(65); // 36 degrés de liberté, p ≈ 0,002
  });
  it('la case est déterminée par le RNG de la manche, une seule fois', () => {
    expect(spin(() => 0)).toBe(0);
    expect(spin(() => 0.5)).toBe(18);
    expect(spin(() => 0.9999999)).toBe(36);
    const r1 = spin(seededRng(5)); expect(spin(seededRng(5))).toBe(r1);
  });
});

describe('carnet de mises et solde', () => {
  it('place, cumule, annule, refait, plafonne', () => {
    const book = new BetBook(50);
    expect(book.place({ kind: 'red' }, 25)).toBe(true);
    expect(book.place({ kind: 'red' }, 10)).toBe(true);
    expect(book.amountOn({ kind: 'red' })).toBe(35);
    expect(book.place({ kind: 'num', nums: [7] }, 25)).toBe(false); // 60 > 50
    expect(book.place({ kind: 'num', nums: [7] }, 10)).toBe(true);
    expect(book.total()).toBe(45);
    book.undo(); expect(book.total()).toBe(35);
    book.redo(); expect(book.total()).toBe(45);
    book.clear(); expect(book.total()).toBe(0);
    book.undo(); expect(book.total()).toBe(45);
    expect(book.place({ kind: 'nums', nums: [1, 2, 3, 4, 5] }, 5)).toBe(false);
    expect(book.load([b('red', 40)])).toBe(true);
    expect(book.load([b('red', 60)])).toBe(false);
  });
  it('débit AVANT la manche, gain crédité après : le solde ne devient jamais négatif', () => {
    const s = defaultFun().casino; grant(s, 100); setBring(s, 100);
    const bets = [b('num', 50, [17]), b('red', 50)];
    const stake = 100;
    expect(canBet(s, 'roulette', stake)).toBe(true);
    expect(debit(s, stake)).toBe(true);
    expect(s.bring).toBe(0);
    const r = settle(bets, 17);
    credit(s, r.returned);
    expect(s.bring).toBe(50 * 36); // plein gagnant ; 17 est noir, donc la mise rouge est perdue
  });
  it('simulation : le solde reste ≥ 0 et la conservation tient', () => {
    const s = defaultFun().casino; grant(s, 500); setBring(s, 500);
    const rng = seededRng(11); let staked = 0, back = 0;
    for (let i = 0; i < 2000 && s.bring >= 5; i++) {
      const book = new BetBook(Math.min(s.bring, 1000));
      book.place({ kind: 'red' }, 5); book.place({ kind: 'num', nums: [(i % 36) + 1] }, 5);
      const stake = book.total();
      expect(debit(s, stake)).toBe(true);
      const r = settle(book.bets, spin(rng));
      credit(s, r.returned); staked += stake; back += r.returned;
      expect(s.bring).toBeGreaterThanOrEqual(0);
    }
    expect(s.bring).toBe(500 - staked + back);
  });
});
