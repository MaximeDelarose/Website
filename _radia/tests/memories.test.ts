import { describe, it, expect } from "vitest";
import { pickCard, tierAllowed } from "../src/core/memories";
import type { MemoryCard } from "../src/content/types";
import realOrExample from "@content";

const cards: MemoryCard[] = [
  { id: "a", title: "", text: "", kind: "message", tier: 1 },
  { id: "b", title: "", text: "", kind: "message", tier: 1 },
  { id: "c", title: "", text: "", kind: "message", tier: 2 },
  { id: "d", title: "", text: "", kind: "declaration", tier: 3 },
  { id: "q", title: "", text: "", kind: "declaration", tier: 1, trigger: "queen" },
  { id: "s", title: "", text: "", kind: "rare", tier: 1, secret: true },
];
const ctx = (o: Partial<Parameters<typeof pickCard>[1]> = {}) => ({
  captured: "p" as const, captureIndex: 1, gamesPlayed: 0, shownThisGame: new Set<string>(), seen: {}, ...o,
});

describe("cartes souvenirs", () => {
  it("la dame noire déclenche sa carte", () => {
    expect(pickCard(cards, ctx({ captured: "q" }))?.id).toBe("q");
    expect(pickCard(cards, ctx({ captured: "q", shownThisGame: new Set(["q"]) }))?.id).not.toBe("q");
  });
  it("pas de déclaration trop tôt", () => {
    for (let i = 0; i < 300; i++) expect(["a", "b"]).toContain(pickCard(cards, ctx())!.id);
    expect(tierAllowed(3, 7, 0)).toBe(true);
    expect(tierAllowed(3, 2, 2)).toBe(true);
    expect(tierAllowed(2, 2, 0)).toBe(false);
  });
  it("pas de répétition dans une partie tant qu'il reste des cartes", () => {
    const shown = new Set<string>();
    const ids: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const c = pickCard(cards, ctx({ captureIndex: i + 6, shownThisGame: shown }))!;
      ids.push(c.id); shown.add(c.id);
    }
    expect(new Set(ids).size).toBe(4);
    // tout vu : on recommence par la moins vue, jamais la carte secrète
    const again = pickCard(cards, ctx({ captureIndex: 12, shownThisGame: shown, seen: { a: 3, b: 1, c: 3, d: 3 } }))!;
    expect(again.id).toBe("b");
  });
  it("toujours une carte, jamais la carte secrète", () => {
    for (let i = 0; i < 200; i++) expect(pickCard(cards, ctx({ captureIndex: 1 + (i % 15) }))!.id).not.toBe("s");
  });
  it("le contenu fourni a au moins 12 cartes valides", () => {
    const cs = realOrExample.cards;
    expect(cs.length).toBeGreaterThanOrEqual(12);
    expect(new Set(cs.map((c) => c.id)).size).toBe(cs.length);
    for (const c of cs) expect(c.image || c.art, c.id).toBeTruthy();
  });
});
