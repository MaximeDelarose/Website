import { describe, expect, it } from "vitest";
import { Rng, chance, nextFloat, nextInt, pickN } from "../src/engine";

describe("RNG mulberry32", () => {
  it("même seed => même suite", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 1000; i++) expect(a.float()).toBe(b.float());
  });

  it("seeds différentes => suites différentes", () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const sa = Array.from({ length: 10 }, () => a.float());
    const sb = Array.from({ length: 10 }, () => b.float());
    expect(sa).not.toEqual(sb);
  });

  it("reste dans [0,1) et les entiers dans leurs bornes", () => {
    const r = new Rng(7);
    for (let i = 0; i < 5000; i++) {
      const f = nextFloat(r);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = nextInt(r, -3, 3);
      expect(n).toBeGreaterThanOrEqual(-3);
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it("l'état se sauvegarde et se restaure", () => {
    const r = new Rng(99);
    r.float();
    const saved = r.rngState;
    const next = [r.float(), r.float()];
    const r2 = new Rng(0);
    r2.rngState = saved;
    expect([r2.float(), r2.float()]).toEqual(next);
  });

  it("chance(1) et chance(0) ne consomment pas d'aléatoire", () => {
    const r = new Rng(5);
    const s = r.rngState;
    expect(chance(r, 1)).toBe(true);
    expect(chance(r, 0)).toBe(false);
    expect(r.rngState).toBe(s);
  });

  it("pickN rend des éléments distincts", () => {
    const r = new Rng(3);
    const out = pickN(r, [1, 2, 3, 4, 5], 3);
    expect(new Set(out).size).toBe(3);
    expect(pickN(r, [1, 2], 5)).toHaveLength(2);
  });

  it("distribution à peu près uniforme", () => {
    const r = new Rng(123);
    const buckets = [0, 0, 0, 0];
    for (let i = 0; i < 40000; i++) buckets[nextInt(r, 0, 3)]++;
    for (const b of buckets) expect(Math.abs(b - 10000)).toBeLessThan(400);
  });
});
