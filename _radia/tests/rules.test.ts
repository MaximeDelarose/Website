import { describe, it, expect } from "vitest";
import { ChessGame, uciToInput } from "../src/core/rules";

const play = (g: ChessGame, ...ucis: string[]) => ucis.forEach((u) => expect(g.play(uciToInput(u)), u).not.toBeNull());

describe("règles officielles", () => {
  it("20 coups légaux au départ, perft(3) = 8902", () => {
    const g = new ChessGame();
    expect(g.allLegal()).toHaveLength(20);
    const perft = (c: ChessGame["chess"], d: number): number => {
      if (d === 0) return 1;
      let n = 0;
      for (const m of c.moves({ verbose: true })) { c.move(m); n += perft(c, d - 1); c.undo(); }
      return n;
    };
    expect(perft(g.chess, 3)).toBe(8902);
  });

  it("refuse les coups illégaux sans exception", () => {
    const g = new ChessGame();
    expect(g.play({ from: "e2", to: "e5" })).toBeNull();
    expect(g.play({ from: "e7", to: "e5" })).toBeNull(); // pas le trait
    expect(g.play({ from: "g1", to: "g3" })).toBeNull();
    expect(g.turn).toBe("w");
  });

  it("roque des deux côtés", () => {
    const g = new ChessGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const m = g.play({ from: "e1", to: "g1" });
    expect(m?.isKingsideCastle()).toBe(true);
    expect(g.get("f1")?.type).toBe("r");
    const m2 = g.play({ from: "e8", to: "c8" });
    expect(m2?.isQueensideCastle()).toBe(true);
    expect(g.get("d8")?.type).toBe("r");
  });

  it("pas de roque à travers un échec", () => {
    const g = new ChessGame("4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1");
    expect(g.play({ from: "e1", to: "g1" })).toBeNull();
  });

  it("prise en passant", () => {
    const g = new ChessGame();
    play(g, "e2e4", "a7a6", "e4e5", "d7d5");
    const m = g.play({ from: "e5", to: "d6" });
    expect(m?.isEnPassant()).toBe(true);
    expect(g.get("d5")).toBeFalsy();
  });

  it("promotion au choix", () => {
    const g = new ChessGame("8/P6k/8/8/8/8/8/K7 w - - 0 1");
    expect(g.needsPromotion("a7", "a8")).toBe(true);
    const m = g.play({ from: "a7", to: "a8", promotion: "n" });
    expect(m?.promotion).toBe("n");
    expect(g.get("a8")?.type).toBe("n");
  });

  it("mat du berger", () => {
    const g = new ChessGame();
    play(g, "e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7");
    expect(g.outcome()).toEqual({ winner: "w", reason: "checkmate" });
  });

  it("pat", () => {
    const g = new ChessGame("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(g.outcome()).toEqual({ winner: null, reason: "stalemate" });
  });

  it("matériel insuffisant", () => {
    expect(new ChessGame("8/8/8/4k3/8/8/2B5/4K3 w - - 0 1").outcome()?.reason).toBe("insufficient");
  });

  it("triple répétition réclamable, quintuple automatique", () => {
    const g = new ChessGame();
    const cycle = ["g1f3", "g8f6", "f3g1", "f6g8"];
    play(g, ...cycle);
    expect(g.claimableDraw()).toBeNull();
    play(g, ...cycle);
    expect(g.claimableDraw()).toBe("threefold");
    expect(g.outcome()).toBeNull();
    play(g, ...cycle, ...cycle);
    expect(g.outcome()?.reason).toBe("fivefold");
  });

  it("50 coups réclamables, 75 automatiques", () => {
    const g50 = new ChessGame("4k3/8/8/8/8/8/8/R3K3 w - - 100 80");
    expect(g50.claimableDraw()).toBe("fifty");
    expect(g50.outcome()).toBeNull();
    expect(new ChessGame("4k3/8/8/8/8/8/8/R3K3 w - - 150 100").outcome()?.reason).toBe("seventyfive");
  });

  it("perte au temps : nulle si l'adversaire ne peut pas mater", () => {
    // les Blancs tombent, les Noirs n'ont que roi + cavalier et les Blancs un roi seul
    const g = new ChessGame("4k3/8/8/8/8/8/6n1/4K3 w - - 0 1");
    expect(g.timeoutOutcome("w")).toEqual({ winner: null, reason: "timeout-insufficient" });
    // les Noirs ont une tour : victoire au temps
    const g2 = new ChessGame("4k3/8/8/8/8/8/6r1/4K3 w - - 0 1");
    expect(g2.timeoutOutcome("w")).toEqual({ winner: "b", reason: "timeout" });
    // roi + cavalier contre roi + pion : un mat aidé existe → victoire
    const g3 = new ChessGame("4k3/8/8/8/8/8/P5n1/4K3 w - - 0 1");
    expect(g3.timeoutOutcome("w").winner).toBe("b");
    // roi seul contre tout : nulle
    expect(new ChessGame("4k3/8/8/8/8/8/PPPP4/4K3 b - - 0 1").timeoutOutcome("w").winner).toBe(null);
  });

  it("reprise depuis l'historique UCI", () => {
    const g = new ChessGame();
    play(g, "e2e4", "e7e5", "g1f3");
    const g2 = ChessGame.fromUci(g.uciHistory());
    expect(g2.fen).toBe(g.fen);
  });
});
