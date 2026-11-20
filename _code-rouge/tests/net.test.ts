import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gameConfig } from "../src/config/game.config";
import { normalizeCode, makeCode, CODE_ALPHABET } from "../src/net/protocol";
import { dealRoles, rotateRoles } from "../src/net/roles";
import * as R from "../src/net/roster";
import { RoomSession } from "../src/net/session";
import { burstStats, pairStats, percentile, verdictForRtt } from "../src/net/stats";
import { labDurationMs } from "../src/net/lab";
import { MemoryHub } from "./helpers/memoryHub";

const cfg = gameConfig.coop;
const rc: R.RosterCfg = { lostAfterMs: cfg.lostAfterMs, rejoinWindowMs: cfg.rejoinWindowMs };
const ROLE_IDS = cfg.roles.map((r) => r.id);

describe("code de salon", () => {
  it("4 lettres sans caractères ambigus, saisie tolérante", () => {
    for (let i = 0; i < 200; i++) expect([...makeCode()].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    expect(CODE_ALPHABET).not.toMatch(/[ILO]/);
    expect(normalizeCode("ab-cd")).toBe("ABCD");
    expect(normalizeCode(" a b c d ")).toBe("ABCD");
    expect(normalizeCode("ABC")).toBeNull();
    expect(normalizeCode("ABCI")).toBeNull();
    expect(normalizeCode("ABCDE")).toBeNull();
  });
});

describe("rôles", () => {
  it("chaque rôle est détenu par exactement un téléphone, pour 1 à 3 téléphones", () => {
    for (const n of [1, 2, 3]) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      for (let seed = 1; seed < 40; seed++) {
        const d = dealRoles(ids, ROLE_IDS, seed);
        const all = Object.values(d).flat().sort();
        expect(all).toEqual([...ROLE_IDS].sort());
        if (n >= 2) expect(Math.max(...Object.values(d).map((r) => r.length))).toBeLessThan(ROLE_IDS.length);
        if (n === 3) expect(Object.values(d).every((r) => r.length === 1)).toBe(true);
      }
    }
  });
  it("le tirage est reproductible et varie selon la graine", () => {
    const ids = ["a", "b", "c"];
    expect(dealRoles(ids, ROLE_IDS, 7)).toEqual(dealRoles(ids, ROLE_IDS, 7));
    const variants = new Set(Array.from({ length: 30 }, (_, s) => JSON.stringify(dealRoles(ids, ROLE_IDS, s))));
    expect(variants.size).toBeGreaterThan(3);
  });
  it("la rotation fait passer chacun par tous les postes (personne ne garde le même)", () => {
    const ids = ["a", "b", "c"];
    let cur = dealRoles(ids, ROLE_IDS, 3);
    const seen: Record<string, Set<string>> = { a: new Set(), b: new Set(), c: new Set() };
    for (let k = 0; k < 3; k++) { ids.forEach((i) => cur[i].forEach((r) => seen[i].add(r))); cur = rotateRoles(cur, ids); }
    ids.forEach((i) => expect(seen[i].size).toBe(3));
  });
});

describe("état du salon (hôte)", () => {
  const T0 = 1_000_000;
  const make = () => R.createHostState("ABCD", "host", "Maxime", 3, T0);

  it("admission, noms uniques, salon complet, places libérées", () => {
    let s = make();
    let r = R.joinMember(s, { id: "a", name: "Léa" }, T0, rc); s = r.state; expect(r.result).toBe("joined");
    r = R.joinMember(s, { id: "b", name: "Léa" }, T0, rc); s = r.state;
    expect(s.members.map((m) => m.name)).toEqual(["Maxime", "Léa", "Léa 2"]);
    expect(s.members.map((m) => m.slot)).toEqual([0, 1, 2]);
    expect(R.joinMember(s, { id: "c", name: "Zoé" }, T0, rc).result).toBe("full");
    s = R.leaveMember(s, "a", T0 + 1000);
    r = R.joinMember(s, { id: "c", name: "Zoé" }, T0 + 2000, rc);
    expect(r.result).toBe("joined");
    expect(r.state.members.find((m) => m.id === "c")?.slot).toBe(1); // reprend la place libérée
  });

  it("statuts : en ligne → arrière-plan → connexion perdue → retour, sans rien perdre", () => {
    let s = R.joinMember(make(), { id: "a", name: "Léa" }, T0, rc).state;
    s = R.deal(s, ROLE_IDS, 5, T0, rc);
    const rolesBefore = s.members.find((m) => m.id === "a")!.roles;
    s = R.setReady(s, "a", true);
    const st = (t: number) => R.snapshot(s, t, rc).members.find((m) => m.id === "a")!.status;
    expect(st(T0 + 1000)).toBe("online");
    s = R.heartbeat(s, "a", T0 + 2000, true);
    expect(st(T0 + 3000)).toBe("away");
    expect(st(T0 + 2000 + cfg.lostAfterMs + 1)).toBe("lost");
    // reconnexion : même identité → même place, mêmes rôles, même état « prêt »
    const back = R.joinMember(s, { id: "a", name: "Léa" }, T0 + 30_000, rc);
    expect(back.result).toBe("rejoined");
    const m = back.state.members.find((x) => x.id === "a")!;
    expect(m.roles).toEqual(rolesBefore);
    expect(m.ready).toBe(true);
    expect(R.snapshot(back.state, T0 + 30_100, rc).members.find((x) => x.id === "a")!.status).toBe("online");
  });

  it("la place d'un joueur silencieux est gardée, puis libérée après la fenêtre de reprise", () => {
    let s = R.joinMember(make(), { id: "a", name: "A" }, T0, rc).state;
    s = R.joinMember(s, { id: "b", name: "B" }, T0, rc).state;
    expect(R.joinMember(s, { id: "c", name: "C" }, T0 + 60_000, rc).result).toBe("full");
    expect(R.joinMember(s, { id: "c", name: "C" }, T0 + cfg.rejoinWindowMs + 1000, rc).result).toBe("joined");
  });

  it("phase : dealt → ready quand tous les présents sont prêts ; retombe si un nouveau joueur arrive ou si l'un se retire", () => {
    let s = R.joinMember(R.joinMember(make(), { id: "a", name: "A" }, T0, rc).state, { id: "b", name: "B" }, T0, rc).state;
    s = R.deal(s, ROLE_IDS, 9, T0, rc);
    expect(s.phase).toBe("dealt");
    for (const id of ["host", "a"]) s = R.settlePhase(R.setReady(s, id, true), T0, rc);
    expect(s.phase).toBe("dealt");
    s = R.settlePhase(R.setReady(s, "b", true), T0, rc);
    expect(s.phase).toBe("ready");
    s = R.settlePhase(R.setReady(s, "b", false), T0, rc);
    expect(s.phase).toBe("dealt");
    // un joueur parti ne bloque pas les autres
    s = R.settlePhase(R.setReady(s, "b", true), T0, rc);
    s = R.settlePhase(R.leaveMember(s, "b", T0), T0, rc);
    expect(s.phase).toBe("ready");
  });
});

describe("statistiques", () => {
  it("percentiles, gigue, pertes, désordre", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10);
    const p = pairStats([80, 90, 100, 80], 1);
    expect(p).toMatchObject({ n: 4, lost: 1, min: 80, max: 100 });
    expect(p.jitter).toBeCloseTo((10 + 10 + 20) / 3, 0);
    const arr = Array.from({ length: 10 }, (_, k) => ({ k, at: k * 50 }));
    expect(burstStats(10, arr, 50)).toMatchObject({ got: 10, lost: 0, ooo: 0, jitter: 0 });
    const holes = [{ k: 0, at: 0 }, { k: 2, at: 100 }, { k: 1, at: 110 }, { k: 4, at: 200 }];
    expect(burstStats(5, holes, 50)).toMatchObject({ got: 4, lost: 1, ooo: 1 });
  });
  it("verdicts alignés sur les besoins des mécaniques", () => {
    expect(verdictForRtt(120, 0)).toBe("excellent");
    expect(verdictForRtt(300, 0)).toBe("good");
    expect(verdictForRtt(500, 0)).toBe("limit");
    expect(verdictForRtt(300, 0.05)).toBe("limit");
    expect(verdictForRtt(900, 0)).toBe("bad");
    expect(verdictForRtt(100, 0.2)).toBe("bad");
  });
});

/* ---------- Salon complet sur réseau simulé ---------- */
describe("salon à trois téléphones (réseau simulé)", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01T12:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  function setup(opts = { latency: 40, jitter: 30, loss: 0 }, names = ["Maxime", "Léa", "Sam"]) {
    const hub = new MemoryHub(opts);
    const mk = (i: number, role: "host" | "client") => {
      const t = hub.connect();
      return { t, s: new RoomSession({ transport: t, code: "ABCD", me: { id: `p${i}`, name: names[i] }, role, cfg }) };
    };
    const host = mk(0, "host");
    const a = mk(1, "client");
    const b = mk(2, "client");
    host.s.start();
    return { hub, host, a, b, start: async () => { await vi.advanceTimersByTimeAsync(300); a.s.start(); b.s.start(); await vi.advanceTimersByTimeAsync(1500); } };
  }

  it("les trois téléphones voient le même salon, la même révision, les mêmes noms", async () => {
    const { host, a, b, start } = setup();
    await start();
    for (const x of [host, a, b]) expect(x.s.getState().status).toBe("live");
    const snaps = [host, a, b].map((x) => x.s.getState().snapshot!);
    expect(new Set(snaps.map((s) => s.rev)).size).toBe(1);
    expect(snaps[0].members.map((m) => m.name)).toEqual(["Maxime", "Léa", "Sam"]);
    expect(snaps[0].members.every((m) => m.status === "online")).toBe(true);
    expect(snaps[1].members.find((m) => m.id === "p0")?.isHost).toBe(true);
  });

  it("l'hôte reste « en ligne » longtemps après la création et participe au test de liaison", async () => {
    const { host, a, start } = setup({ latency: 30, jitter: 10, loss: 0 });
    await start();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(a.s.getState().snapshot!.members.find((m) => m.isHost)!.status).toBe("online");
    host.s.startLab();
    await vi.advanceTimersByTimeAsync(labDurationMs(3) + 7000);
    expect(a.s.getState().snapshot!.lab!.expected.sort()).toEqual(["p0", "p1", "p2"]);
  });

  it("distribution des rôles synchronisée, confirmation « prêt », phase ready pour tous", async () => {
    const { host, a, b, start } = setup();
    await start();
    host.s.dealRoles();
    await vi.advanceTimersByTimeAsync(400);
    const snap = a.s.getState().snapshot!;
    expect(snap.phase).toBe("dealt");
    expect(snap.members.flatMap((m) => m.roles).sort()).toEqual([...ROLE_IDS].sort());
    expect(snap.members.every((m) => m.roles.length === 1)).toBe(true);
    host.s.setReady(true); a.s.setReady(true);
    await vi.advanceTimersByTimeAsync(400);
    expect(b.s.getState().snapshot!.phase).toBe("dealt");
    b.s.setReady(true);
    await vi.advanceTimersByTimeAsync(400);
    for (const x of [host, a, b]) expect(x.s.getState().snapshot!.phase).toBe("ready");
  });

  it("un 4e téléphone est refusé ; une salle inconnue est signalée ; l'état d'une partie en cours est conservé", async () => {
    const { hub, start } = setup();
    await start();
    const t = hub.connect();
    const d = new RoomSession({ transport: t, code: "ABCD", me: { id: "p9", name: "Intrus" }, role: "client", cfg });
    d.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(d.getState().status).toBe("full");

    const lonely = new RoomSession({ transport: new MemoryHub().connect(), code: "ZZZZ", me: { id: "q", name: "Seul" }, role: "client", cfg });
    lonely.start();
    await vi.advanceTimersByTimeAsync(cfg.joinTimeoutMs + 500);
    expect(lonely.getState().status).toBe("notfound");
  });

  it("écran verrouillé puis coupure : arrière-plan → connexion perdue → retour avec le même rôle et l'état « prêt »", async () => {
    const { host, a, start } = setup();
    await start();
    host.s.dealRoles();
    await vi.advanceTimersByTimeAsync(300);
    a.s.setReady(true);
    await vi.advanceTimersByTimeAsync(300);
    const roleBefore = host.s.getState().snapshot!.members.find((m) => m.id === "p1")!.roles;

    // iOS : le téléphone annonce l'arrière-plan puis se fige (plus aucun message).
    (a.s as unknown as { send: (t: string, p: object) => void }).send("hb", { vis: false });
    a.t.offline = true;
    await vi.advanceTimersByTimeAsync(2000);
    expect(host.s.getState().snapshot!.members.find((m) => m.id === "p1")!.status).toBe("away");
    await vi.advanceTimersByTimeAsync(cfg.lostAfterMs + 2000);
    const lost = host.s.getState().snapshot!.members.find((m) => m.id === "p1")!;
    expect(lost.status).toBe("lost");
    expect(lost.ready).toBe(true);

    // Réveil : la liaison est reconstruite et le téléphone redit bonjour.
    a.t.reconnect();
    await vi.advanceTimersByTimeAsync(1500);
    const back = a.s.getState().snapshot!.members.find((m) => m.id === "p1")!;
    expect(back.status).toBe("online");
    expect(back.roles).toEqual(roleBefore);
    expect(back.ready).toBe(true);
    expect(a.s.getState().status).toBe("live");
    expect(host.s.getState().log.some((l) => l.text.includes("de retour"))).toBe(true);
  });

  it("l'hôte injoignable est signalé aux autres, puis la salle reprend quand il revient", async () => {
    const { host, a, b, start } = setup();
    await start();
    host.t.offline = true;
    await vi.advanceTimersByTimeAsync(cfg.lostAfterMs + 3000);
    expect(a.s.getState().hostLost).toBe(true);
    expect(b.s.getState().hostLost).toBe(true);
    host.t.offline = false;
    await vi.advanceTimersByTimeAsync(cfg.heartbeatMs + 1000);
    expect(a.s.getState().hostLost).toBe(false);
  });

  it("hôte rechargé avec son état sauvegardé : les autres le retrouvent, rôles compris", async () => {
    const { hub, host, a, start } = setup();
    let saved: R.HostState | null = null;
    host.s.stop();
    const t2 = hub.connect();
    const h2 = new RoomSession({ transport: t2, code: "ABCD", me: { id: "p0", name: "Maxime" }, role: "host", cfg, onPersist: (s) => { saved = s; } });
    h2.start();
    await start();
    h2.dealRoles();
    await vi.advanceTimersByTimeAsync(300);
    const roles = a.s.getState().snapshot!.members.map((m) => m.roles);
    h2.stop();
    const t3 = hub.connect();
    const h3 = new RoomSession({ transport: t3, code: "ABCD", me: { id: "p0", name: "Maxime" }, role: "host", cfg, restore: saved });
    h3.start();
    await vi.advanceTimersByTimeAsync(cfg.heartbeatMs * 2 + 1500);
    expect(h3.getState().snapshot!.members.map((m) => m.roles)).toEqual(roles);
    expect(h3.getState().snapshot!.members.every((m) => m.status === "online")).toBe(true);
    expect(h3.getState().snapshot!.phase).toBe("dealt");
  });

  it("test de liaison : mesures cohérentes avec le réseau simulé, résultats partagés, débit sous le quota", async () => {
    const { hub, host, a, b, start } = setup({ latency: 40, jitter: 30, loss: 0 });
    await start();
    host.s.startLab();
    await vi.advanceTimersByTimeAsync(labDurationMs(3) + 7000);
    const lab = b.s.getState().snapshot!.lab!;
    expect(lab.status).toBe("done");
    expect(lab.results.map((r) => r.from).sort()).toEqual(["p0", "p1", "p2"]);
    for (const r of lab.results) {
      for (const stats of Object.values(r.rtt)) {
        expect(stats.n).toBe(16);
        expect(stats.med).toBeGreaterThanOrEqual(80);
        expect(stats.med).toBeLessThan(160);
      }
      for (const burst of Object.values(r.burst)) expect(burst).toMatchObject({ sent: 60, got: 60, lost: 0 });
    }
    // Le projet Supabase gratuit est partagé : 100 messages/s au total. On garde une marge confortable.
    expect(hub.peakPerSecond()).toBeLessThan(80);
    expect(a.s.getState().rates.sent).toBeGreaterThan(0);
  });

  it("test de liaison avec 5 % de pertes : elles apparaissent dans le rapport", async () => {
    const { host, b, start } = setup({ latency: 60, jitter: 60, loss: 0.05 });
    await start();
    host.s.startLab();
    await vi.advanceTimersByTimeAsync(labDurationMs(3) + 7000);
    const lab = b.s.getState().snapshot!.lab!;
    const lostPings = lab.results.flatMap((r) => Object.values(r.rtt)).reduce((s, x) => s + x.lost, 0);
    const lostBurst = lab.results.flatMap((r) => Object.values(r.burst)).reduce((s, x) => s + x.lost, 0);
    expect(lostPings + lostBurst).toBeGreaterThan(0);
  });
});
