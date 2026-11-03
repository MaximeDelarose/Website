import { describe, it, expect } from "vitest";
import { pickMove, DIFFICULTIES, thinkDelay } from "../src/ai/persona";
import { parseInfo, mateToCp, type Candidate } from "../src/ai/uci";

function rngSeq(seed = 1) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const c = (uci: string, cp: number, extra: Partial<Candidate> = {}): Candidate => ({ uci, cp, pv: [uci, "e7e5"], depth: 8, ...extra });

describe("analyse des lignes UCI", () => {
  it("score cp, multipv et pv", () => {
    const r = parseInfo("info depth 8 seldepth 10 multipv 2 score cp -34 nodes 1000 nps 1 pv e2e4 e7e5 g1f3");
    expect(r).toMatchObject({ depth: 8, multipv: 2, cp: -34, uci: "e2e4", pv: ["e2e4", "e7e5", "g1f3"] });
  });
  it("mat converti", () => {
    const r = parseInfo("info depth 5 multipv 1 score mate 2 pv d1h5 g7g6 h5f7");
    expect(r?.mate).toBe(2);
    expect(r?.cp).toBe(mateToCp(2));
    expect(mateToCp(-1)).toBeLessThan(-19000);
  });
  it("ignore les bornes et les lignes sans pv", () => {
    expect(parseInfo("info depth 8 score cp 10 lowerbound pv e2e4")).toBeNull();
    expect(parseInfo("info depth 8 currmove e2e4 currmovenumber 1")).toBeNull();
  });
});

describe("personnalité d'Auguste", () => {
  const cands = [c("a", 50), c("b", 30), c("c", -20), c("d", -150), c("e", -400), c("q", -880)];

  it("ne lâche jamais sa dame (perte ≥ 800 cp) quand il a mieux", () => {
    for (const d of Object.values(DIFFICULTIES)) {
      const rng = rngSeq(7);
      for (let i = 0; i < 3000; i++) expect(pickMove(cands, d, rng, { ply: 30 })!.uci).not.toBe("q");
    }
  });

  it("ne se jette jamais dans un mat", () => {
    const list = [c("a", 0), c("m", -19990, { mate: -1 })];
    const rng = rngSeq(3);
    for (let i = 0; i < 2000; i++) expect(pickMove(list, DIFFICULTIES.doux, rng, { ply: 30 })!.uci).toBe("a");
  });

  it("Doux fait des erreurs, Petit défi beaucoup moins", () => {
    const stats = (d: keyof typeof DIFFICULTIES) => {
      const rng = rngSeq(11); let best = 0, bad = 0; const N = 4000;
      for (let i = 0; i < N; i++) {
        const ch = pickMove(cands, DIFFICULTIES[d], rng, { ply: 30 })!;
        if (ch.uci === "a") best++;
        if (ch.loss >= 180) bad++;
      }
      return { best: best / N, bad: bad / N };
    };
    const doux = stats("doux"), defi = stats("defi");
    expect(doux.best).toBeLessThan(defi.best);
    expect(doux.bad).toBeGreaterThan(0.02);   // donne de vraies occasions
    expect(doux.bad).toBeLessThan(0.3);        // mais pas à chaque coup
    expect(defi.bad).toBeLessThan(0.05);
  });

  it("pas de gaffe en ouverture", () => {
    const rng = rngSeq(5);
    for (let i = 0; i < 2000; i++) expect(pickMove(cands, DIFFICULTIES.doux, rng, { ply: 4 })!.loss).toBeLessThanOrEqual(120);
  });

  it("coup forcé", () => {
    expect(pickMove([c("a", -300)], DIFFICULTIES.doux, Math.random, { ply: 10 })?.quality).toBe("forced");
    expect(pickMove([], DIFFICULTIES.doux, Math.random, { ply: 10 })).toBeNull();
  });

  it("voit souvent le mat", () => {
    const list = [c("m", 19990, { mate: 1 }), c("a", 300)];
    const rng = rngSeq(9); let seen = 0;
    for (let i = 0; i < 2000; i++) if (pickMove(list, DIFFICULTIES.doux, rng, { ply: 40 })!.uci === "m") seen++;
    expect(seen / 2000).toBeGreaterThan(0.65);
    const r2 = rngSeq(9); let s2 = 0;
    for (let i = 0; i < 500; i++) if (pickMove(list, DIFFICULTIES.defi, r2, { ply: 40 })!.uci === "m") s2++;
    expect(s2).toBe(500);
  });

  it("réflexion plus courte quand la pendule presse", () => {
    const r = () => 0.5;
    expect(thinkDelay(r, 5000, "good", 20)).toBeLessThan(thinkDelay(r, 500_000, "good", 20));
    expect(thinkDelay(r, 500_000, "good", 1)).toBe(350);
  });
});
