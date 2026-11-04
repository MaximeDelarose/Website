import { describe, it, expect } from 'vitest';
import { LOTS, TOTAL_WEIGHT, probOf, FASHION_POOL, DECO_POOL, DUP_COINS } from '../src/wheel/table';
import { applyLot, canSpin, claimSpin, dayKey, msUntilNextDay, rollLot, type WheelCtx } from '../src/wheel/logic';
import { defaultFun, sanitizeFun } from '../src/save/fun';
import { seededRng } from '../src/casino/rng';
import { CLOTHES } from '../src/data/world/wardrobe';
import { FURNITURE } from '../src/data/world/furniture';

function ctx(owned: string[] = []) {
  const log: Record<string, number> = {}; const items: string[] = [...owned];
  const add = (k: string, n: number) => { log[k] = (log[k] ?? 0) + n; };
  const c: WheelCtx = {
    addCoins: (n) => add('coins', n), giveDiamonds: (n) => add('diamonds', n), giveEnergy: (n) => add('energy', n), grantChips: (n) => add('chips', n),
    ownsCloth: (id) => items.includes(id), giveCloth: (id) => { items.push(id); add('cloth', 1); },
    ownsDeco: (id) => items.includes(id), giveDeco: (id) => { items.push(id); add('deco', 1); },
    addFragment: (k, n) => add('frag:' + k, n),
  };
  return { c, log, items };
}

describe('table et probabilités', () => {
  it('poids = 100, % affichés = poids, ids uniques', () => {
    expect(TOTAL_WEIGHT).toBe(100);
    expect(new Set(LOTS.map((l) => l.id)).size).toBe(LOTS.length);
    expect(LOTS.reduce((a, l) => a + probOf(l), 0)).toBeCloseTo(1, 12);
    for (const l of LOTS) expect(probOf(l) * 100).toBeCloseTo(l.weight, 9);
  });
  it('tous les types attendus sont présents et les objets sont réels', () => {
    const kinds = new Set(LOTS.map((l) => l.kind));
    for (const k of ['coins', 'diamonds', 'energy', 'chips', 'fashion', 'deco', 'fragment']) expect(kinds.has(k as never)).toBe(true);
    for (const id of FASHION_POOL) expect(id in CLOTHES, id).toBe(true);
    for (const id of DECO_POOL) expect(id in FURNITURE, id).toBe(true);
  });
  it('simulation de 200 000 tirages ≈ table', () => {
    const rng = seededRng(31); const N = 200_000; const c: Record<string, number> = {};
    for (let i = 0; i < N; i++) { const l = rollLot(rng); c[l.id] = (c[l.id] ?? 0) + 1; }
    for (const l of LOTS) expect(Math.abs(c[l.id] / N - probOf(l))).toBeLessThan(0.006);
  });
});

describe('un tirage par jour', () => {
  it('claim atomique : deuxième tentative le même jour = rien', () => {
    const w = defaultFun().wheel; const rng = seededRng(1);
    expect(canSpin(w, '2026-11-04')).toBe(true);
    const a = claimSpin(w, '2026-11-04', rng);
    expect(a).not.toBeNull();
    expect(w.lastKey).toBe('2026-11-04'); expect(w.spins).toBe(1); expect(w.last).toBe(a!.id);
    expect(claimSpin(w, '2026-11-04', rng)).toBeNull();
    expect(w.spins).toBe(1);
    expect(claimSpin(w, '2026-11-05', rng)).not.toBeNull();
    expect(w.spins).toBe(2);
  });
  it('chaque tirage garantit un lot de la table ; clé invalide refusée', () => {
    const rng = seededRng(2);
    for (let i = 0; i < 50; i++) {
      const w = defaultFun().wheel;
      const l = claimSpin(w, '2026-01-01', rng)!;
      expect(LOTS.map((x) => x.id)).toContain(l.id);
    }
    const w = defaultFun().wheel;
    expect(claimSpin(w, 'hier', rng)).toBeNull(); expect(claimSpin(w, '', rng)).toBeNull();
  });
  it('rechargement : l\'état sauvegardé empêche un second tirage', () => {
    const f = defaultFun(); claimSpin(f.wheel, '2026-11-04', seededRng(3));
    const reloaded = sanitizeFun(JSON.parse(JSON.stringify(f)));
    expect(reloaded.wheel.lastKey).toBe('2026-11-04');
    expect(claimSpin(reloaded.wheel, '2026-11-04', seededRng(4))).toBeNull();
  });
  it('sanitize : valeurs invalides retombent sur le défaut', () => {
    const f = sanitizeFun({ wheel: { lastKey: 'n\'importe quoi', spins: -3, last: 12 } });
    expect(f.wheel).toEqual({ lastKey: '', spins: 0, last: '' });
    expect(sanitizeFun({ wheel: 'x' }).wheel.spins).toBe(0);
  });
  it('forcer un lot (debug)', () => {
    expect(claimSpin(defaultFun().wheel, '2026-02-02', seededRng(1), 'diamonds6')!.id).toBe('diamonds6');
  });
  it('clé locale AAAA-MM-JJ et prochain tirage à minuit', () => {
    expect(dayKey(new Date(2026, 10, 4, 23, 59))).toBe('2026-11-04');
    expect(dayKey(new Date(2026, 10, 4, 0, 1))).toBe('2026-11-04');
    expect(dayKey(new Date(2026, 10, 4, 10), 1)).toBe('2026-11-05');
    expect(dayKey(new Date(2026, 11, 31, 10), 1)).toBe('2027-01-01');
    expect(msUntilNextDay(new Date(2026, 10, 4, 23, 0))).toBe(3600_000);
    expect(msUntilNextDay(new Date(2026, 10, 4, 0, 0, 0))).toBeGreaterThanOrEqual(23 * 3600_000);
  });
});

describe('attribution', () => {
  const lot = (id: string) => LOTS.find((l) => l.id === id)!;
  it('pièces, diamants, énergie, jetons, fragment', () => {
    const { c, log } = ctx(); const rng = seededRng(1);
    applyLot(lot('coins300'), c, rng); applyLot(lot('diamonds6'), c, rng); applyLot(lot('energy3'), c, rng); applyLot(lot('chips600'), c, rng); applyLot(lot('fragment'), c, rng);
    expect(log).toEqual({ coins: 300, diamonds: 6, energy: 3, chips: 600, 'frag:cloth': 1 });
  });
  it('accessoire / décoration : objet réel donné, jamais deux fois le même tant qu\'il en reste', () => {
    const { c, items } = ctx(); const rng = seededRng(5);
    for (let i = 0; i < FASHION_POOL.length; i++) applyLot(lot('fashion'), c, rng);
    expect(new Set(items).size).toBe(FASHION_POOL.length);
  });
  it('doublon : compensation en pièces quand tout est déjà possédé', () => {
    const { c, log } = ctx([...FASHION_POOL, ...DECO_POOL]);
    const g = applyLot(lot('fashion'), c, seededRng(1));
    expect(g.duplicate).toBe(true); expect(log.coins).toBe(DUP_COINS); expect(log.cloth).toBeUndefined();
    const g2 = applyLot(lot('deco'), c, seededRng(1));
    expect(g2.duplicate).toBe(true); expect(log.coins).toBe(2 * DUP_COINS);
  });
});
