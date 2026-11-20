import type { BurstStats, DeviceInfo, Envelope, LabResult, PairStats } from "./protocol";
import { burstStats, pairStats } from "./stats";
import { hapticCapabilities } from "./haptics";

/**
 * Test de liaison : mesure, entre les VRAIS téléphones de l'équipe, ce dont les mécaniques ont besoin.
 *  1. Allers-retours entre chaque paire d'appareils (16 mesures, une toutes les 500 ms) : latence, gigue, pertes.
 *  2. Rafales à 20 messages/s pendant 3 s, un émetteur après l'autre : c'est la cadence prévue pour suivre un cadran
 *     ou un doigt maintenu. On mesure pertes, désordre et régularité d'arrivée.
 * Le débit total reste volontairement très inférieur aux limites du forfait gratuit (le projet est partagé avec d'autres jeux).
 */
export const LAB = { startDelay: 400, pingCount: 16, pingEveryMs: 500, pingGraceMs: 1200, burstCount: 60, burstEveryMs: 50, burstSlotMs: 4000, endGraceMs: 900 };

export function labDurationMs(participants: number): number {
  return LAB.startDelay + LAB.pingCount * LAB.pingEveryMs + LAB.pingGraceMs + participants * LAB.burstSlotMs + LAB.endGraceMs;
}

export interface LabApi {
  me: string;
  clock(): number;
  send(t: string, p: Record<string, unknown>, to?: string): void;
  on(t: string, cb: (env: Envelope) => void): () => void;
  counters(): { sent: number; recv: number };
  transportKind: string;
}

export interface LabProgress { fraction: number; label: string; senderId: string | null }

export class LabRunner {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private offs: (() => void)[] = [];
  private samples = new Map<string, number[]>();
  private pending = new Map<string, number>();
  private arrivals = new Map<string, { k: number; at: number }[]>();
  private startedAt = 0;
  private startCounters = { sent: 0, recv: 0 };
  private hiddenSeen = false;
  private done = false;

  constructor(private api: LabApi, private id: number, private participants: string[], private onProgress: (p: LabProgress) => void, private onDone: (r: LabResult) => void) {}

  start(): void {
    const { api } = this;
    const others = this.participants.filter((p) => p !== api.me);
    const myIdx = this.participants.indexOf(api.me);
    this.startedAt = api.clock();
    this.startCounters = api.counters();
    others.forEach((p) => { this.samples.set(p, []); this.arrivals.set(p, []); });

    this.offs.push(api.on("pong", (env) => {
      const p = env.p ?? {};
      if (p.id !== this.id || typeof p.k !== "number" || typeof p.t0 !== "number") return;
      const key = `${env.from}:${p.k}`;
      if (!this.pending.has(key)) return;
      this.pending.delete(key);
      this.samples.get(env.from)?.push(api.clock() - p.t0);
    }));
    this.offs.push(api.on("burst", (env) => {
      const p = env.p ?? {};
      if (p.id !== this.id || typeof p.k !== "number") return;
      this.arrivals.get(env.from)?.push({ k: p.k, at: api.clock() });
    }));

    // 1. Allers-retours : chaque appareil interroge chacun des autres, de façon décalée pour ne pas tout envoyer d'un coup.
    for (let k = 0; k < LAB.pingCount; k++) {
      others.forEach((peer, j) => {
        this.at(LAB.startDelay + k * LAB.pingEveryMs + myIdx * 130 + j * 60, () => {
          const t0 = api.clock();
          this.pending.set(`${peer}:${k}`, t0);
          api.send("ping", { id: this.id, k, t0 }, peer);
        });
      });
    }
    const pingsEnd = LAB.startDelay + LAB.pingCount * LAB.pingEveryMs + LAB.pingGraceMs;

    // 2. Rafales : à tour de rôle.
    this.participants.forEach((who, s) => {
      const t0 = pingsEnd + s * LAB.burstSlotMs;
      if (who === api.me) for (let k = 0; k < LAB.burstCount; k++) this.at(t0 + k * LAB.burstEveryMs, () => api.send("burst", { id: this.id, s, k, B: LAB.burstCount }));
      this.at(t0, () => this.onProgress({ fraction: this.fraction(), label: "burst", senderId: who }));
    });

    const total = labDurationMs(this.participants.length);
    this.at(0, () => this.onProgress({ fraction: 0, label: "ping", senderId: null }));
    const tick = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") this.hiddenSeen = true;
      const f = this.fraction();
      const elapsed = api.clock() - this.startedAt;
      const slot = Math.floor((elapsed - pingsEnd) / LAB.burstSlotMs);
      this.onProgress({ fraction: f, label: elapsed < pingsEnd ? "ping" : elapsed < total - LAB.endGraceMs ? "burst" : "wrap", senderId: slot >= 0 && slot < this.participants.length ? this.participants[slot] : null });
    }, 250);
    this.offs.push(() => clearInterval(tick));
    this.at(total, () => this.finish());
  }

  private fraction(): number {
    const total = labDurationMs(this.participants.length);
    return Math.min(1, Math.max(0, (this.api.clock() - this.startedAt) / total));
  }

  private at(ms: number, fn: () => void): void { this.timers.push(setTimeout(fn, ms)); }

  cancel(): void {
    this.timers.forEach(clearTimeout);
    this.offs.forEach((o) => o());
    this.timers = [];
    this.offs = [];
    this.done = true;
  }

  private finish(): void {
    if (this.done) return;
    const { api } = this;
    const rtt: Record<string, PairStats> = {};
    const burst: Record<string, BurstStats> = {};
    for (const [peer, s] of this.samples) rtt[peer] = pairStats(s, LAB.pingCount - s.length);
    for (const [peer, a] of this.arrivals) burst[peer] = burstStats(LAB.burstCount, a, LAB.burstEveryMs);
    const c = api.counters();
    const seconds = Math.max(1, (api.clock() - this.startedAt) / 1000);
    const caps = hapticCapabilities();
    const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
    const device: DeviceInfo = {
      ua: navigator.userAgent.replace(/^Mozilla\/5\.0 /, "").slice(0, 110),
      transport: api.transportKind, connection: nav.connection?.effectiveType ?? "n/a",
      vibrate: caps.vibrate, ios: caps.ios, visible: !this.hiddenSeen,
    };
    this.cancel();
    this.onDone({ from: api.me, rtt, burst, msgs: { sent: c.sent - this.startCounters.sent, recv: c.recv - this.startCounters.recv, seconds: Math.round(seconds) }, device, notes: {} });
  }
}
