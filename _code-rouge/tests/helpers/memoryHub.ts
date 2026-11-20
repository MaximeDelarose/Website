import type { Envelope } from "../../src/net/protocol";
import type { Transport, TransportStatus } from "../../src/net/transport";

export interface HubOptions { latency?: number; jitter?: number; loss?: number }

/** Réseau simulé en mémoire : latence, gigue, pertes, coupures. Comptabilise les messages par seconde (quota Supabase gratuit : 100/s). */
export class MemoryHub {
  nodes = new Set<MemoryTransport>();
  perSecond = new Map<number, number>();
  private seed = 12345;
  constructor(public opts: HubOptions = {}) {}
  rng() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  connect(): MemoryTransport { return new MemoryTransport(this); }
  peakPerSecond(): number { return Math.max(0, ...this.perSecond.values()); }
}

export class MemoryTransport implements Transport {
  readonly kind = "memory" as const;
  private msgSubs = new Set<(e: Envelope) => void>();
  private statSubs = new Set<(s: TransportStatus) => void>();
  private sent = 0;
  private recv = 0;
  offline = false;
  closed = false;
  reconnects = 0;
  constructor(private hub: MemoryHub) {}
  private emit(s: TransportStatus) { this.statSubs.forEach((cb) => cb(s)); }
  start() { this.hub.nodes.add(this); this.emit("connecting"); setTimeout(() => this.emit("open"), 20); }
  send(env: Envelope) {
    if (this.offline || this.closed) return;
    this.sent++;
    for (const peer of this.hub.nodes) {
      if (peer === this) continue;
      if (this.hub.rng() < (this.hub.opts.loss ?? 0)) continue;
      const d = (this.hub.opts.latency ?? 0) + this.hub.rng() * (this.hub.opts.jitter ?? 0);
      setTimeout(() => {
        if (peer.offline || peer.closed) return;
        peer.recv++;
        const sec = Math.floor(Date.now() / 1000);
        this.hub.perSecond.set(sec, (this.hub.perSecond.get(sec) ?? 0) + 1);
        peer.msgSubs.forEach((cb) => cb(JSON.parse(JSON.stringify(env))));
      }, d);
    }
  }
  onMessage(cb: (e: Envelope) => void) { this.msgSubs.add(cb); return () => { this.msgSubs.delete(cb); }; }
  onStatus(cb: (s: TransportStatus) => void) { this.statSubs.add(cb); return () => { this.statSubs.delete(cb); }; }
  reconnect() { this.reconnects++; this.offline = false; this.emit("connecting"); setTimeout(() => this.emit("open"), 50); }
  close() { this.closed = true; this.hub.nodes.delete(this); this.emit("closed"); }
  counters() { return { sent: this.sent, recv: this.recv }; }
}
