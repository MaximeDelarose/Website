import { describe, it, expect } from "vitest";
import { BubbleManager } from "../src/ui/bubbles";
import content from "@content";

const fakeEl = () => ({ textContent: "", classList: { add() {}, remove() {} }, offsetWidth: 0 }) as unknown as HTMLElement;
(globalThis as Record<string, unknown>).window = { setTimeout: () => 0 };

describe("bulles d'Auguste", () => {
  it("délai minimal entre deux bulles, sauf événements prioritaires", () => {
    let t = 0;
    const b = new BubbleManager(fakeEl(), content.bubbles, () => {}, () => t, () => 0);
    expect(b.trigger("capturePawn")).toBeTruthy();
    t += 1000;
    expect(b.trigger("check")).toBeNull();
    expect(b.trigger("captureQueen")).toBeTruthy();
    t += 8000;
    expect(b.trigger("check")).toBeTruthy();
  });
  it("en attente pendant une carte souvenir, puis affichée", () => {
    let t = 0; const shown: string[] = [];
    const b = new BubbleManager(fakeEl(), content.bubbles, (e) => shown.push(e), () => t, () => 0);
    b.hold(true);
    expect(b.trigger("captureRook")).toBeNull();
    b.hold(false);
    expect(shown).toEqual(["captureRook"]);
  });
  it("pas deux fois la même phrase de suite", () => {
    let t = 0; const lines: string[] = [];
    const b = new BubbleManager(fakeEl(), content.bubbles, () => {}, () => t, () => 0);
    for (let i = 0; i < 4; i++) { t += 10000; lines.push(b.trigger("check")!); }
    for (let i = 1; i < lines.length; i++) if (content.bubbles.check.length > 1) expect(lines[i]).not.toBe(lines[i - 1]);
  });
});
