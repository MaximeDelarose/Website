import { describe, it, expect } from 'vitest';
import { generateLevel, flow, isSolved, rotateTile, solvable, solve, SIZES, maskOf } from '../src/events/incidents/pipes';
import { generateWires, linkOk, wiresSolved } from '../src/events/incidents/wires';

describe('plomberie : niveaux toujours solubles', () => {
  it('500 graines × 3 difficultés : soluble (résolveur indépendant), jamais déjà résolu, tailles correctes', () => {
    for (const d of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 500; seed++) {
        const l = generateLevel(seed, d);
        expect(l.n).toBe(SIZES[d]);
        expect(solvable(l)).toBe(true);
        expect(isSolved(l)).toBe(false);
        expect(l.src).toBeGreaterThanOrEqual(0); expect(l.src).toBeLessThan(l.n);
      }
    }
  }, 60_000);
  it('déterministe : même graine → même niveau', () => {
    expect(JSON.stringify(generateLevel(42, 2).tiles)).toBe(JSON.stringify(generateLevel(42, 2).tiles));
    expect(JSON.stringify(generateLevel(42, 2).tiles)).not.toBe(JSON.stringify(generateLevel(43, 2).tiles));
  });
  it('le résolveur indépendant fournit des rotations pour lesquelles flow() annonce « résolu » (cohérence solveur / eau)', () => {
    for (const d of [1, 2, 3] as const) for (let seed = 1; seed <= 500; seed++) {
      const l = generateLevel(seed, d);
      const sol = solve(l)!;
      expect(sol).toBeTruthy();
      for (const p of sol) l.tiles[p.y][p.x].rot = p.rot;
      expect(isSolved(l)).toBe(true);
    }
  }, 60_000);
  it('rotation : 4 quarts de tour = identité', () => {
    const l = generateLevel(7, 1);
    const before = maskOf(l.tiles[0][0]);
    for (let i = 0; i < 4; i++) rotateTile(l, 0, 0);
    expect(maskOf(l.tiles[0][0])).toBe(before);
    expect(flow(l).wet instanceof Set).toBe(true);
  });
});

describe('puzzle électrique', () => {
  it('toujours soluble et jamais déjà résolu (500 graines)', () => {
    for (const d of [1, 2, 3] as const) for (let seed = 1; seed <= 500; seed++) {
      const l = generateWires(seed, d);
      expect(l.n).toBe(2 + d);
      expect([...l.right].sort()).toEqual(Array.from({ length: l.n }, (_, i) => i));
      expect(l.right.every((v, i) => v === i)).toBe(false);
      // la solution évidente existe : chaque fil va vers sa prise de même couleur
      const links = Array.from({ length: l.n }, (_, i) => l.right.indexOf(i));
      links.forEach((row, i) => expect(linkOk(l, i, row)).toBe(true));
      expect(wiresSolved(l, links)).toBe(true);
      expect(wiresSolved(l, Array(l.n).fill(-1))).toBe(false);
    }
  });
});
