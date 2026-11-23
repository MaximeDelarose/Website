import { describe, expect, it } from "vitest";
import { buildReport, deviceLabel, summarizeLab } from "../src/net/labSummary";
import type { LabResult, RoomSnapshot } from "../src/net/protocol";

const dev = (ua: string) => ({ ua, transport: "supabase", connection: "4g", vibrate: false, ios: true, visible: true });
const pair = (med: number, p95: number, lost = 0) => ({ n: 16 - lost, lost, min: med - 5, med, p95, max: p95, jitter: 3 });
const burst = (got: number) => ({ sent: 60, got, lost: 60 - got, ooo: 0, jitter: 5, gapP95: 60 });
const result = (from: string, others: Record<string, [number, number, number?]>, got = 60): LabResult => ({
  from, rtt: Object.fromEntries(Object.entries(others).map(([k, v]) => [k, pair(v[0], v[1], v[2] ?? 0)])),
  burst: Object.fromEntries(Object.keys(others).map((k) => [k, burst(got)])), msgs: { sent: 130, recv: 260, seconds: 23 },
  device: dev("Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15"), notes: {},
});
const snap = (results: LabResult[]): RoomSnapshot => ({
  v: 1, code: "ABCD", epoch: 1, rev: 9, hostId: "a", phase: "lobby", dealId: 0, maxPlayers: 3,
  members: ["a", "b", "c"].map((id, i) => ({ id, name: ["Maxime", "Léa", "Sam"][i], slot: i, status: "online" as const, statusAgoMs: 0, roles: [], ready: false, isHost: i === 0, rtt: null })),
  lab: { id: 1, status: "done", expected: ["a", "b", "c"], results },
});

describe("synthèse du test de liaison", () => {
  it("fusionne les deux sens d'une paire et classe la liaison", () => {
    const s = summarizeLab(snap([result("a", { b: [90, 120], c: [100, 150] }), result("b", { a: [110, 180], c: [95, 130] }), result("c", { a: [85, 110], b: [120, 160] })]))!;
    expect(s.pairs).toHaveLength(3);
    const ab = s.pairs.find((p) => p.a === "a" && p.b === "b")!;
    expect(ab.med).toBe(100);
    expect(ab.p95).toBe(180);
    expect(s.overall).toBe("excellent");
  });
  it("une paire lente ou des pertes dégradent le verdict global", () => {
    const slow = summarizeLab(snap([result("a", { b: [300, 450] }), result("b", { a: [320, 480] })]))!;
    expect(slow.overall).toBe("limit");
    const lossy = summarizeLab(snap([result("a", { b: [90, 120] }, 40), result("b", { a: [90, 120] }, 40)]))!;
    expect(lossy.overall).toBe("bad");
    const lostPings = summarizeLab(snap([result("a", { b: [90, 120, 4] }), result("b", { a: [90, 120, 4] })]))!;
    expect(lostPings.overall).toBe("bad");
  });
  it("reconnaît les appareils et produit un rapport lisible", () => {
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X)")).toBe("iPhone · iOS 18.2");
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/131.0")).toBe("Android 14 · Chrome");
    const r = buildReport(snap([result("a", { b: [90, 120] }), result("b", { a: [110, 180] })]), [], "supabase", new Date("2026-11-19T12:00:00Z"));
    expect(r).toContain("Salle ABCD");
    expect(r).toContain("Maxime ↔ Léa : 100 ms / 180 ms / 0 sur 32");
    expect(r).toContain("Maxime → Léa");
    expect(buildReport({ ...snap([]), lab: null }, [], "bc")).toContain("Aucun test");
  });
});
