import { describe, it, expect } from 'vitest';
import { SlotsRun, drawReels, evaluate, exactRtp, playSpin, symDef, type Ledger, type Reels } from '../src/casino/slots';
import { SYMBOLS, TOTAL_WEIGHT } from '../src/casino/slotsTable';
import { seededRng } from '../src/casino/rng';

const ledger = (start: number): Ledger & { b: number } => ({
  b: start, balance() { return this.b; }, debit(n) { if (n > this.b) return false; this.b -= n; return true; }, credit(n) { this.b += n; },
});

describe('table des gains', () => {
  it('7 symboles, poids positifs, somme 100', () => {
    expect(SYMBOLS.map((s) => s.id)).toEqual(['heart', 'flower', 'choco', 'bag', 'star', 'crown', 'diamond']);
    expect(TOTAL_WEIGHT).toBe(100);
    for (const s of SYMBOLS) expect(s.weight).toBeGreaterThan(0);
  });
  it('RTP exact entre 92 % et 96 %', () => {
    const r = exactRtp();
    expect(r.den).toBe(1_000_000);
    expect(r.num).toBe(r.rtp * r.den);
    expect(r.rtp).toBeGreaterThanOrEqual(0.92);
    expect(r.rtp).toBeLessThanOrEqual(0.96);
    expect(r.hit).toBeGreaterThan(0.25);
  });
  it('RTP exact == simulation (3 millions de tirages)', () => {
    const rng = seededRng(77); const N = 3_000_000; let sum = 0;
    for (let i = 0; i < N; i++) sum += evaluate(drawReels(rng)).mult;
    expect(Math.abs(sum / N - exactRtp().rtp)).toBeLessThan(0.02);
  });
  it('évaluation : triple, paire exacte, rien', () => {
    expect(evaluate(['diamond', 'diamond', 'diamond'])).toMatchObject({ mult: 500, kind: 'triple' });
    expect(evaluate(['heart', 'heart', 'bag'])).toMatchObject({ mult: 2, kind: 'pair' });
    expect(evaluate(['heart', 'bag', 'heart'])).toMatchObject({ mult: 2 });
    expect(evaluate(['flower', 'flower', 'star'])).toMatchObject({ mult: 1 });
    expect(evaluate(['choco', 'choco', 'star']).mult).toBe(0);
    expect(evaluate(['heart', 'flower', 'star']).mult).toBe(0);
    expect(symDef('crown').triple).toBe(120);
  });
  it('fréquences de symboles ≈ poids', () => {
    const rng = seededRng(3); const c: Record<string, number> = {}; const N = 300_000;
    for (let i = 0; i < N; i++) for (const s of drawReels(rng)) c[s] = (c[s] ?? 0) + 1;
    for (const s of SYMBOLS) expect(Math.abs(c[s.id] / (N * 3) - s.weight / 100)).toBeLessThan(0.005);
  });
});

describe('multi-tirage = même fonction pure', () => {
  it('une série de 10 produit exactement les mêmes manches que 10 tirages simples (même RNG)', () => {
    const a = seededRng(42); const b = seededRng(42);
    const run = new SlotsRun(ledger(1000), 10, 10);
    const multi = []; for (let r = run.next(a); r; r = run.next(a)) multi.push(r);
    const single = Array.from({ length: 10 }, () => playSpin(10, b));
    expect(multi).toEqual(single);
  });
  it('même distribution : RTP d\'une série ≈ RTP simple', () => {
    const rng = seededRng(5); let staked = 0, won = 0;
    for (let i = 0; i < 20000; i++) {
      const L = ledger(1000); const run = new SlotsRun(L, 10, 10);
      while (run.next(rng)) { /* joue tout */ }
      const s = run.summary(); staked += s.staked; won += s.won;
    }
    expect(Math.abs(won / staked - exactRtp().rtp)).toBeLessThan(0.02);
  });
  it('débit total correct : solde = départ − mises + gains', () => {
    const L = ledger(500); const run = new SlotsRun(L, 20, 5); const rng = seededRng(9);
    expect(run.totalBet).toBe(100);
    while (run.next(rng)) { /* */ }
    const s = run.summary();
    expect(s.played).toBe(5); expect(s.staked).toBe(100);
    expect(L.b).toBe(500 - s.staked + s.won);
    expect(s.net).toBe(s.won - s.staked);
    expect(s.stoppedEarly).toBe(false);
  });
  it('arrêt entre deux tirages : rien n\'est débité pour la suite', () => {
    const L = ledger(500); const run = new SlotsRun(L, 50, 10); const rng = seededRng(1);
    run.next(rng); run.next(rng);
    run.stop();
    expect(run.next(rng)).toBeNull();
    const s = run.summary();
    expect(s.played).toBe(2); expect(s.stoppedEarly).toBe(true); expect(s.staked).toBe(100);
    expect(L.b).toBe(500 - 100 + s.won);
  });
  it('mise totale invalide : rien ne part (solde insuffisant, plafond, > 10 tirages)', () => {
    const L = ledger(100); const rng = seededRng(1);
    const r = new SlotsRun(L, 10, 10); expect(r.canStart()).toBe(true);
    const poor = new SlotsRun(L, 10, 10); L.b = 99; expect(poor.canStart()).toBe(false);
    expect(poor.next(rng)).toBeNull(); expect(L.b).toBe(99); expect(poor.summary().played).toBe(0);
    const big = new SlotsRun(ledger(100000), 200, 10); expect(big.canStart()).toBe(false); // 2000 > plafond
    expect(new SlotsRun(ledger(1e6), 10, 99).count).toBe(10);
    expect(new SlotsRun(ledger(1e6), 15, 1).canStart()).toBe(false); // pas multiple du pas
  });
  it('le solde ne devient jamais négatif', () => {
    const L = ledger(35); const rng = seededRng(2); const run = new SlotsRun(L, 10, 5);
    expect(run.canStart()).toBe(false); // 50 > 35
    expect(run.next(rng)).toBeNull(); expect(L.b).toBe(35);
  });
  it('le tirage dépend uniquement du RNG de la manche', () => {
    const r: Reels = drawReels(seededRng(8)); expect(drawReels(seededRng(8))).toEqual(r);
  });
});
