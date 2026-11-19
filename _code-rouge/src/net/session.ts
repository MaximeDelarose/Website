import type { CoopConfig } from "../config/types";
import { newSeed } from "../engine/rng";
import { LabRunner, labDurationMs, type LabProgress } from "./lab";
import { PROTOCOL, type Envelope, type LabResult, type RoomSnapshot } from "./protocol";
import {
  activeMembers, createHostState, deal, heartbeat, joinMember, kickMember, leaveMember, renameMember, setReady, settlePhase, snapshot, statusKey,
  type HostState,
} from "./roster";
import type { Transport, TransportStatus } from "./transport";

export type SessionStatus = "connecting" | "joining" | "live" | "notfound" | "full" | "kicked" | "incompatible" | "closed";
export type LinkState = "open" | "reconnecting" | "down";

export interface LogEntry { at: number; text: string; kind: "info" | "ok" | "warn" }
export interface Pulse { id: number; from: string; to: string }

export interface ViewState {
  status: SessionStatus;
  link: LinkState;
  code: string;
  meId: string;
  isHost: boolean;
  hostLost: boolean;
  snapshot: RoomSnapshot | null;
  /** Instant local de réception du dernier état (pour « depuis X s »). */
  receivedAt: number;
  pulses: Pulse[];
  labProgress: LabProgress | null;
  log: LogEntry[];
  rates: { sent: number; recv: number; sentPerSec: number; recvPerSec: number };
  /** Un coéquipier vient de nous envoyer un test (vibration / son) : on lui demande si on l'a senti. */
  probe: { kind: string; from: string; at: number } | null;
  transportKind: string;
  /** Aller-retour vers l'hôte (ms), lissé ; null tant qu'inconnu. */
  rttHost: number | null;
}

export interface SessionOptions {
  transport: Transport;
  code: string;
  me: { id: string; name: string };
  role: "host" | "client";
  cfg: CoopConfig;
  /** Hôte : état à reprendre (rechargement de la page). */
  restore?: HostState | null;
  clock?: () => number;
  onPersist?: (state: HostState) => void;
  /** Effets locaux déclenchés par un coéquipier (vibration, son). */
  onProbeEffect?: (kind: string) => void;
}

/**
 * Un salon, vu depuis un téléphone. L'hôte tient l'état (HostState) et le rediffuse ; les autres lui envoient des intentions.
 * Aucune dépendance à React : testable avec un transport en mémoire et un temps simulé.
 */
export class RoomSession {
  private o: SessionOptions;
  private listeners = new Set<() => void>();
  private handlers = new Map<string, Set<(env: Envelope) => void>>();
  private host: HostState | null = null;
  private view: ViewState;
  private n = 0;
  private pulseId = 0;
  private timers: ReturnType<typeof setInterval>[] = [];
  private joinTimer: ReturnType<typeof setTimeout> | null = null;
  private lastStatusKey = "";
  private lastHostSeen = 0;
  private hiddenAt = 0;
  private resumeAt = 0;
  private everLive = false;
  private lab: LabRunner | null = null;
  private labDeadline: ReturnType<typeof setTimeout> | null = null;
  private rateWindow: { at: number; sent: number; recv: number }[] = [];
  private offStatus: (() => void) | null = null;
  private offMsg: (() => void) | null = null;
  private rttSamples: number[] = [];
  private visHandler = () => this.onVisibility();

  constructor(opts: SessionOptions) {
    this.o = opts;
    const clock = this.clock();
    this.view = {
      status: "connecting", link: "reconnecting", code: opts.code, meId: opts.me.id, isHost: opts.role === "host", hostLost: false,
      snapshot: null, receivedAt: clock, pulses: [], labProgress: null, log: [], rates: { sent: 0, recv: 0, sentPerSec: 0, recvPerSec: 0 }, probe: null, transportKind: opts.transport.kind, rttHost: null,
    };
    if (opts.role === "host") {
      this.host = opts.restore ?? createHostState(opts.code, opts.me.id, opts.me.name, opts.cfg.maxPlayers, clock);
      this.host = { ...this.host, hostId: opts.me.id };
      this.host.members = this.host.members.map((m) => (m.id === opts.me.id ? { ...m, name: opts.me.name || m.name, lastSeen: clock, left: false, hidden: false } : m));
    }
  }

  private clock(): number { return (this.o.clock ?? Date.now)(); }
  private get cfg() { return this.o.cfg; }

  /* ---------- Abonnements (useSyncExternalStore) ---------- */
  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  getState = () => this.view;
  private set(patch: Partial<ViewState>) { this.view = { ...this.view, ...patch }; this.listeners.forEach((l) => l()); }
  private log(text: string, kind: LogEntry["kind"] = "info") { this.set({ log: [...this.view.log.slice(-39), { at: this.clock(), text, kind }] }); }

  /** Pour le test de liaison et les prochaines mécaniques : messages additionnels par type. */
  on(type: string, cb: (env: Envelope) => void): () => void {
    let set = this.handlers.get(type);
    if (!set) { set = new Set(); this.handlers.set(type, set); }
    set.add(cb);
    return () => { set?.delete(cb); };
  }

  /* ---------- Démarrage / arrêt ---------- */
  start(): void {
    const t = this.o.transport;
    this.offMsg = t.onMessage((env) => this.receive(env));
    this.offStatus = t.onStatus((s) => this.onTransport(s));
    t.start();
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", this.visHandler);
    this.timers.push(setInterval(() => this.tick(), 1000));
    this.timers.push(setInterval(() => this.beat(), this.cfg.heartbeatMs));
  }

  stop(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
    if (this.joinTimer) clearTimeout(this.joinTimer);
    if (this.labDeadline) clearTimeout(this.labDeadline);
    this.lab?.cancel();
    this.offMsg?.();
    this.offStatus?.();
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.visHandler);
    this.o.transport.close();
    this.set({ status: "closed", link: "down" });
  }

  /** Quitte proprement (le salon garde la place un moment ; l'hôte voit « parti »). */
  leave(): void {
    if (!this.view.isHost) this.send("leave", {});
    this.stop();
  }

  /* ---------- Envoi ---------- */
  send(t: string, p: Record<string, unknown> = {}, to?: string): void {
    this.o.transport.send({ v: PROTOCOL, from: this.o.me.id, ...(to ? { to } : {}), t, p, n: ++this.n });
  }

  private pulse(from: string, to: string) {
    const id = ++this.pulseId;
    this.set({ pulses: [...this.view.pulses.slice(-6), { id, from, to }] });
    setTimeout(() => this.set({ pulses: this.view.pulses.filter((p) => p.id !== id) }), 900);
  }

  /* ---------- Transport ---------- */
  private onTransport(s: TransportStatus): void {
    if (s === "connecting") { this.set({ link: "reconnecting" }); return; }
    if (s === "error" || s === "closed") {
      if (this.view.status === "closed") return;
      this.set({ link: "down" });
      this.log(s === "error" ? "Liaison interrompue" : "Canal fermé", "warn");
      return;
    }
    // open
    this.set({ link: "open" });
    if (this.view.isHost) {
      if (this.view.status === "connecting") this.set({ status: "live" });
      this.broadcastSnapshot();
      this.publishView();
    } else {
      this.set({ status: this.everLive ? this.view.status : "joining" });
      this.sendHello();
      if (!this.everLive) {
        if (this.joinTimer) clearTimeout(this.joinTimer);
        this.joinTimer = setTimeout(() => { if (!this.everLive) { this.set({ status: "notfound" }); } }, this.cfg.joinTimeoutMs);
      }
    }
  }

  private sendHello(): void {
    this.send("hello", { name: this.o.me.name, resume: this.everLive });
  }

  /** Nouvelle tentative après « salle introuvable ». */
  retry(): void {
    this.set({ status: "joining" });
    this.sendHello();
    if (this.joinTimer) clearTimeout(this.joinTimer);
    this.joinTimer = setTimeout(() => { if (!this.everLive) this.set({ status: "notfound" }); }, this.cfg.joinTimeoutMs);
  }

  /* ---------- Réception ---------- */
  private receive(env: Envelope): void {
    if (env.from === this.o.me.id) return;
    if (env.to && env.to !== this.o.me.id) return;
    if (env.v !== PROTOCOL) { if (!this.view.isHost && env.t === "snap") this.set({ status: "incompatible" }); return; }
    if (env.from === this.view.snapshot?.hostId) this.lastHostSeen = this.clock();
    const p = env.p ?? {};

    switch (env.t) {
      case "probe": if (this.view.isHost) this.send("host_here", {}, env.from); break;
      case "ping": this.send("pong", { id: p.id, k: p.k, t0: p.t0 }, env.from); this.pulse(env.from, this.o.me.id); break;
      case "pong": this.pulse(env.from, this.o.me.id); break;
      case "ack": {
        if (typeof p.t0 !== "number") break;
        this.rttSamples = [...this.rttSamples.slice(-4), this.clock() - p.t0];
        const sorted = [...this.rttSamples].sort((a, b) => a - b);
        this.set({ rttHost: sorted[Math.floor(sorted.length / 2)] });
        break;
      }
      case "probe_fx": this.set({ probe: { kind: String(p.kind), from: env.from, at: this.clock() } }); this.o.onProbeEffect?.(String(p.kind)); break;
      case "lab_start": if (!this.view.isHost) this.runLab(Number(p.id), (p.peers as string[]) ?? []); break;
      default: break;
    }
    if (this.view.isHost) this.hostReceive(env, p); else this.clientReceive(env, p);
    this.handlers.get(env.t)?.forEach((h) => h(env));
  }

  private clientReceive(env: Envelope, p: Record<string, unknown>): void {
    if (env.t === "snap") {
      const snap = p.snapshot as RoomSnapshot;
      if (!snap || snap.code !== this.o.code) return;
      const cur = this.view.snapshot;
      if (cur && snap.epoch === cur.epoch && snap.hostId === cur.hostId && snap.rev < cur.rev) return;
      this.lastHostSeen = this.clock();
      const me = snap.members.find((m) => m.id === this.o.me.id);
      if (!me) { if (this.everLive) { this.set({ status: "kicked", snapshot: snap }); } return; }
      if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null; }
      const wasLive = this.everLive;
      this.everLive = true;
      if (this.resumeAt) { this.log(`Retour d'arrière-plan après ${Math.round((this.resumeAt - this.hiddenAt) / 1000)} s · resynchronisé en ${this.clock() - this.resumeAt} ms`, "ok"); this.resumeAt = 0; }
      else if (!wasLive) this.log("Salle rejointe", "ok");
      this.set({ status: "live", snapshot: snap, receivedAt: this.clock(), hostLost: false });
    } else if (env.t === "reject") {
      this.set({ status: p.reason === "full" ? "full" : "notfound" });
    }
  }

  /* ---------- Hôte ---------- */
  private hostReceive(env: Envelope, p: Record<string, unknown>): void {
    if (!this.host) return;
    const now = this.clock();
    const cfg = this.cfg;
    const id = env.from;
    switch (env.t) {
      case "hello": {
        const { state, result } = joinMember(this.host, { id, name: String(p.name ?? "Agent") }, now, cfg);
        if (result === "full") { this.send("reject", { reason: "full" }, id); return; }
        this.commit(state);
        this.log(result === "joined" ? `${this.nameOf(id)} rejoint le salon` : `${this.nameOf(id)} est de retour`, "ok");
        break;
      }
      case "hb": {
        const before = this.host;
        this.send("ack", { t0: p.t0 }, id);
        const next = heartbeat(before, id, now, p.vis === false, typeof p.rtt === "number" ? p.rtt : undefined);
        if (next !== before) this.commit(next); // changement d'état (arrière-plan) : rediffusion immédiate
        else if (!before.members.some((m) => m.id === id)) this.send("snap", { snapshot: snapshot(before, now, cfg) }, id); // inconnu : on lui renvoie l'état
        break;
      }
      case "leave": this.commit(leaveMember(this.host, id, now)); this.log(`${this.nameOf(id)} a quitté le salon`, "warn"); break;
      case "rename": this.commit(renameMember(this.host, id, String(p.name ?? ""))); break;
      case "ready": this.commit(settlePhase(setReady(this.host, id, p.ready !== false), now, cfg)); this.pulse(id, this.o.me.id); break;
      case "lab_result": this.collectLab(p.result as LabResult); break;
      case "lab_note": {
        if (!this.host.lab) break;
        const lab = { ...this.host.lab, results: this.host.lab.results.map((r) => (r.from === id ? { ...r, notes: { ...r.notes, [String(p.key)]: String(p.value) } } : r)) };
        this.commit({ ...this.host, rev: this.host.rev + 1, lab });
        break;
      }
      default: break;
    }
  }

  private nameOf(id: string): string { return this.host?.members.find((m) => m.id === id)?.name ?? "Un joueur"; }

  private commit(next: HostState): void {
    this.host = settlePhase(next, this.clock(), this.cfg);
    this.o.onPersist?.(this.host);
    this.lastStatusKey = statusKey(this.host, this.clock(), this.cfg);
    this.broadcastSnapshot();
    this.publishView();
  }

  private broadcastSnapshot(): void {
    if (!this.host) return;
    this.send("snap", { snapshot: snapshot(this.host, this.clock(), this.cfg) });
  }

  private publishView(): void {
    if (!this.host) return;
    this.set({ snapshot: snapshot(this.host, this.clock(), this.cfg), receivedAt: this.clock() });
  }

  /* ---------- Actions de l'hôte ---------- */
  dealRoles(): void {
    if (!this.host) return;
    const now = this.clock();
    if (activeMembers(this.host, now, this.cfg).length < this.cfg.minPlayers) return;
    this.commit(deal(this.host, this.cfg.roles.map((r) => r.id), newSeed(), now, this.cfg));
  }

  kick(id: string): void { if (this.host) this.commit(kickMember(this.host, id)); }

  /* ---------- Actions de tous ---------- */
  setReady(ready: boolean): void {
    if (this.host) this.commit(settlePhase(setReady(this.host, this.o.me.id, ready), this.clock(), this.cfg));
    else this.send("ready", { ready });
  }

  rename(name: string): void {
    this.o.me.name = name;
    if (this.host) this.commit(renameMember(this.host, this.o.me.id, name)); else this.send("rename", { name });
  }

  sendProbe(kind: "haptic" | "sound"): void {
    this.send("probe_fx", { kind });
    this.view.snapshot?.members.filter((m) => m.id !== this.o.me.id).forEach((m) => this.pulse(this.o.me.id, m.id));
  }

  note(key: string, value: string): void {
    if (this.host) {
      if (!this.host.lab) return;
      const me = this.o.me.id;
      const lab = { ...this.host.lab, results: this.host.lab.results.map((r) => (r.from === me ? { ...r, notes: { ...r.notes, [key]: value } } : r)) };
      this.commit({ ...this.host, rev: this.host.rev + 1, lab });
    } else this.send("lab_note", { key, value });
    this.set({ probe: null });
  }

  dismissProbe(): void { this.set({ probe: null }); }

  /* ---------- Test de liaison ---------- */
  startLab(): void {
    if (!this.host) return;
    const now = this.clock();
    const players = activeMembers(this.host, now, this.cfg).filter((m) => !m.hidden && now - m.lastSeen < this.cfg.lostAfterMs);
    if (players.length < 2) return;
    const peers = players.map((m) => m.id).sort();
    const id = (this.host.lab?.id ?? 0) + 1;
    this.commit({ ...this.host, rev: this.host.rev + 1, lab: { id, status: "running", expected: peers, results: [] } });
    this.send("lab_start", { id, peers });
    this.runLab(id, peers);
    this.labDeadline = setTimeout(() => this.finishLab(), labDurationMs(peers.length) + 6000);
  }

  private runLab(id: number, peers: string[]): void {
    if (!peers.includes(this.o.me.id)) return;
    this.lab?.cancel();
    const api = {
      me: this.o.me.id, clock: () => this.clock(), send: (t: string, p: Record<string, unknown>, to?: string) => this.send(t, p, to),
      on: (t: string, cb: (e: Envelope) => void) => this.on(t, cb), counters: () => this.o.transport.counters(), transportKind: this.o.transport.kind,
    };
    this.lab = new LabRunner(api, id, peers, (labProgress) => this.set({ labProgress }), (result) => {
      this.set({ labProgress: null });
      if (this.host) this.collectLab(result); else this.send("lab_result", { result }, this.view.snapshot?.hostId);
    });
    this.lab.start();
  }

  private collectLab(result: LabResult): void {
    if (!this.host?.lab || this.host.lab.status !== "running") return;
    if (this.host.lab.results.some((r) => r.from === result.from)) return;
    const lab = { ...this.host.lab, results: [...this.host.lab.results, result] };
    this.commit({ ...this.host, rev: this.host.rev + 1, lab });
    if (lab.results.length >= lab.expected.length) this.finishLab();
  }

  private finishLab(): void {
    if (!this.host?.lab || this.host.lab.status === "done") return;
    if (this.labDeadline) { clearTimeout(this.labDeadline); this.labDeadline = null; }
    this.commit({ ...this.host, rev: this.host.rev + 1, lab: { ...this.host.lab, status: "done" } });
    this.log("Test de liaison terminé", "ok");
  }

  /* ---------- Horloges ---------- */
  private beat(): void {
    if (this.view.link !== "open") return;
    if (this.view.isHost) this.broadcastSnapshot();
    else if (this.view.status === "live") this.send("hb", { vis: this.visible(), t0: this.clock(), rtt: this.view.rttHost });
    else this.send("hello", { name: this.o.me.name, resume: this.everLive });
  }

  private visible(): boolean { return typeof document === "undefined" || document.visibilityState !== "hidden"; }

  private tick(): void {
    const now = this.clock();
    if (this.host) {
      // L'hôte est un téléphone comme les autres : il se déclare présent à chaque tick (sinon il se croirait « perdu »).
      this.host = heartbeat(this.host, this.o.me.id, now, !this.visible());
      const key = statusKey(this.host, now, this.cfg);
      if (key !== this.lastStatusKey) {
        const before = new Map(this.lastStatusKey.split("|").map((s) => s.split(":") as [string, string]));
        for (const part of key.split("|")) {
          const [id, st] = part.split(":");
          if (before.get(id) && before.get(id) !== st && id !== this.o.me.id) {
            const name = this.nameOf(id);
            if (st === "lost") this.log(`${name} : connexion perdue`, "warn");
            else if (st === "away") this.log(`${name} est passé en arrière-plan`, "warn");
            else if (st === "online") this.log(`${name} est de retour`, "ok");
          }
        }
        this.commit(this.host);
      }
      this.rates(now);
      return;
    }
    const lost = this.everLive && now - this.lastHostSeen > Math.max(this.cfg.lostAfterMs, this.cfg.heartbeatMs * 3);
    if (lost !== this.view.hostLost) {
      this.set({ hostLost: lost });
      if (lost) this.log("L'hôte ne répond plus", "warn");
    }
    this.rates(now);
  }

  private rates(now: number): void {
    const c = this.o.transport.counters();
    this.rateWindow.push({ at: now, sent: c.sent, recv: c.recv });
    this.rateWindow = this.rateWindow.filter((w) => now - w.at <= 6000);
    const first = this.rateWindow[0];
    const dt = Math.max(1, (now - first.at) / 1000);
    this.set({ rates: { sent: c.sent, recv: c.recv, sentPerSec: Math.round(((c.sent - first.sent) / dt) * 10) / 10, recvPerSec: Math.round(((c.recv - first.recv) / dt) * 10) / 10 } });
  }

  /* ---------- Écran verrouillé / application en arrière-plan ---------- */
  private onVisibility(): void {
    const now = this.clock();
    if (!this.visible()) {
      this.hiddenAt = now;
      if (this.host) this.commit(heartbeat(this.host, this.o.me.id, now, true));
      else this.send("hb", { vis: false });
      return;
    }
    const away = now - this.hiddenAt;
    if (this.hiddenAt && away > 2500) {
      // Les sockets mobiles meurent souvent en silence pendant le verrouillage : on reconstruit la liaison.
      this.resumeAt = now;
      this.log(`Écran rallumé après ${Math.round(away / 1000)} s : reconnexion…`);
      this.o.transport.reconnect();
    } else if (this.hiddenAt) {
      this.send("hb", { vis: true });
    }
    if (this.host) this.commit(heartbeat(this.host, this.o.me.id, now, false));
  }
}
