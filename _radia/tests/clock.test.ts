import { describe, it, expect } from "vitest";
import { ChessClock, formatClock } from "../src/core/clock";

function fake() { let t = 0; return { now: () => t, adv: (ms: number) => { t += ms; } }; }

describe("pendule", () => {
  it("décompte uniquement le joueur actif", () => {
    const f = fake(); const c = new ChessClock(600_000, f.now);
    c.start("w"); f.adv(5000);
    expect(c.remaining("w")).toBe(595_000);
    expect(c.remaining("b")).toBe(600_000);
    c.start("b"); f.adv(2000);
    expect(c.remaining("w")).toBe(595_000);
    expect(c.remaining("b")).toBe(598_000);
  });

  it("la carte souvenir met les deux pendules en pause sans perte de temps", () => {
    const f = fake(); const c = new ChessClock(600_000, f.now);
    c.start("w"); f.adv(1000);
    c.start("b");            // Radia vient de capturer : c'est au tour d'Auguste
    c.pause("card");
    f.adv(60_000);           // elle lit la carte pendant une minute
    expect(c.remaining("w")).toBe(599_000);
    expect(c.remaining("b")).toBe(600_000);
    c.resume("card");
    f.adv(500);
    expect(c.remaining("b")).toBe(599_500);
    expect(c.remaining("w")).toBe(599_000);
  });

  it("raisons de pause cumulables", () => {
    const f = fake(); const c = new ChessClock(60_000, f.now);
    c.start("w"); c.pause("card"); c.pause("hidden");
    c.resume("card"); f.adv(10_000);
    expect(c.remaining("w")).toBe(60_000);
    c.resume("hidden"); f.adv(10_000);
    expect(c.remaining("w")).toBe(50_000);
  });

  it("drapeau", () => {
    const f = fake(); const c = new ChessClock(1000, f.now);
    c.start("b"); f.adv(1500);
    expect(c.flagged()).toBe("b");
    expect(c.remaining("b")).toBe(0);
  });

  it("sans limite", () => {
    const f = fake(); const c = new ChessClock(null, f.now);
    c.start("w"); f.adv(1e9);
    expect(c.flagged()).toBeNull();
    expect(formatClock(c.remaining("w"))).toBe("∞");
  });

  it("stop fige les temps, snapshot/restore", () => {
    const f = fake(); const c = new ChessClock(10_000, f.now);
    c.start("w"); f.adv(3000); c.stop(); f.adv(3000);
    expect(c.remaining("w")).toBe(7000);
    const c2 = ChessClock.restore({ w: 7000, b: 9000, active: "b" }, f.now);
    f.adv(1000);
    expect(c2.remaining("b")).toBe(8000);
  });

  it("format", () => {
    expect(formatClock(600_000)).toBe("10:00");
    expect(formatClock(59_001)).toBe("1:00");
    expect(formatClock(30_000)).toBe("0:30");
    expect(formatClock(9_420)).toBe("0:09.5");
    expect(formatClock(0)).toBe("0:00.0");
  });
});
