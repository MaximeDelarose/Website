import { describe, it, expect } from "vitest";
import { Store, type StorageLike } from "../src/store/save";

function mem(): StorageLike & { m: Map<string, string> } {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

describe("sauvegarde et statistiques", () => {
  it("statistiques issues des vraies parties + surprise finale", () => {
    const st = mem();
    const s = new Store(st);
    expect(s.finaleUnlocked).toBe(false);
    s.recordStart("doux", "10", false); s.recordResult("loss", 30);
    s.recordStart("doux", "10", true); s.recordResult("draw", 40);
    expect(s.finaleUnlocked).toBe(false);
    s.recordStart("joueur", "5", true); s.recordResult("loss", 25);
    expect(s.finaleUnlocked).toBe(true); // 3 parties complètes, même sans victoire
    const s2 = new Store(st);
    expect(s2.stats).toMatchObject({ games: 3, wins: 0, losses: 2, draws: 1, rematches: 2 });
    expect(s2.favourite(s2.stats.byDifficulty)).toBe("doux");
  });
  it("une victoire suffit pour la surprise finale", () => {
    const s = new Store(mem());
    s.recordStart("doux", "10", false); s.recordResult("win", 22);
    expect(s.finaleUnlocked).toBe(true);
    expect(s.stats.bestWinMoves).toBe(22);
  });
  it("souvenirs débloqués avec ordre, captures et dames", () => {
    const s = new Store(mem());
    expect(s.unlock("a")).toBe(true);
    expect(s.unlock("a")).toBe(false);
    expect(s.unlock("b")).toBe(true);
    expect(s.data.unlocked.b.order).toBe(2);
    expect(s.data.seen.a).toBe(2);
    s.recordCapture("p"); s.recordCapture("q");
    expect(s.stats).toMatchObject({ captures: 2, queensCaptured: 1 });
  });
  it("sauvegarde corrompue ou stockage absent : valeurs par défaut", () => {
    const st = mem(); st.m.set("radia-save-v1", "{pas du json");
    expect(new Store(st).prefs.difficulty).toBe("doux");
    const s = new Store(null);
    s.setPref("cadence", "5");
    expect(s.prefs.cadence).toBe("5");
    expect(s.prefs.musicVolume).toBe(0.35);
  });
  it("anciennes sauvegardes complétées par les nouveaux champs", () => {
    const st = mem(); st.m.set("radia-save-v1", JSON.stringify({ v: 1, prefs: { difficulty: "defi" }, stats: { wins: 4 } }));
    const s = new Store(st);
    expect(s.prefs.difficulty).toBe("defi");
    expect(s.prefs.cadence).toBe("10");
    expect(s.stats.wins).toBe(4);
    expect(s.stats.byCadence["10"]).toBe(0);
  });
});
