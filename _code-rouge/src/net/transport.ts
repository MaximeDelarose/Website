import type { CoopConfig } from "../config/types";
import { CHANNEL_PREFIX, type Envelope } from "./protocol";

export type TransportStatus = "connecting" | "open" | "closed" | "error";

/** Un canal de diffusion par salon. Implémentations : Supabase Realtime (réel), BroadcastChannel (tests, même navigateur). */
export interface Transport {
  readonly kind: "supabase" | "bc" | "memory";
  /** Démarre la connexion ; le statut « open » est notifié quand le canal est prêt. */
  start(): void;
  send(env: Envelope): void;
  onMessage(cb: (env: Envelope) => void): () => void;
  onStatus(cb: (s: TransportStatus) => void): () => void;
  /** Reconstruit la connexion (retour d'écran verrouillé : la socket est souvent morte sans le savoir). */
  reconnect(): void;
  close(): void;
  counters(): { sent: number; recv: number };
}

class Emitter<T> {
  private subs = new Set<(v: T) => void>();
  on(cb: (v: T) => void) { this.subs.add(cb); return () => { this.subs.delete(cb); }; }
  emit(v: T) { this.subs.forEach((cb) => { try { cb(v); } catch (e) { console.error(e); } }); }
}

/* ---------- Supabase Realtime ---------- */
export class SupabaseTransport implements Transport {
  readonly kind = "supabase" as const;
  private msgs = new Emitter<Envelope>();
  private stat = new Emitter<TransportStatus>();
  private client: { disconnect: () => void; removeChannel: (c: unknown) => unknown } | null = null;
  private channel: { send: (m: unknown) => unknown } | null = null;
  private sent = 0;
  private recv = 0;
  private generation = 0;
  private closed = false;

  constructor(private code: string, private cfg: NonNullable<CoopConfig["supabase"]>, private wsImpl?: unknown) {}

  start(): void { void this.connect(); }

  private async connect(): Promise<void> {
    const gen = ++this.generation;
    this.stat.emit("connecting");
    try {
      // Chargé à la demande : le mode solo ne télécharge rien de plus.
      const { RealtimeClient } = await import("@supabase/realtime-js");
      if (gen !== this.generation || this.closed) return;
      const endpoint = this.cfg.url.replace(/^http/, "ws") + "/realtime/v1";
      const client = new RealtimeClient(endpoint, {
        params: { apikey: this.cfg.key, eventsPerSecond: 40 },
        ...(this.wsImpl ? { transport: this.wsImpl as never } : {}),
      });
      client.setAuth(this.cfg.key);
      const channel = client.channel(CHANNEL_PREFIX + this.code, { config: { broadcast: { self: false, ack: false } } });
      channel.on("broadcast", { event: "m" }, (m) => {
        if (gen !== this.generation || !m.payload) return;
        this.recv++;
        this.msgs.emit(m.payload as unknown as Envelope);
      });
      this.client = client as never;
      this.channel = channel as never;
      // On attend que la socket soit réellement ouverte avant de rejoindre le canal : ne pas compter sur la file d'attente interne.
      client.connect();
      for (let waited = 0; !client.isConnected() && waited < 8000; waited += 25) {
        await new Promise((r) => setTimeout(r, 25));
        if (gen !== this.generation || this.closed) return;
      }
      if (gen !== this.generation || this.closed) return;
      channel.subscribe((status: string) => {
        if (gen !== this.generation) return;
        if (status === "SUBSCRIBED") this.stat.emit("open");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") this.stat.emit("error");
        else if (status === "CLOSED") this.stat.emit("closed");
      });
    } catch (e) {
      console.error(e);
      if (gen === this.generation) this.stat.emit("error");
    }
  }

  private teardown(): void {
    this.generation++;
    try { if (this.client && this.channel) this.client.removeChannel(this.channel); } catch { /* rien */ }
    try { this.client?.disconnect(); } catch { /* rien */ }
    this.client = null;
    this.channel = null;
  }

  send(env: Envelope): void {
    if (!this.channel) return;
    this.sent++;
    try { void this.channel.send({ type: "broadcast", event: "m", payload: env }); } catch { /* rien */ }
  }
  onMessage(cb: (env: Envelope) => void) { return this.msgs.on(cb); }
  onStatus(cb: (s: TransportStatus) => void) { return this.stat.on(cb); }
  reconnect(): void { this.teardown(); this.closed = false; void this.connect(); }
  close(): void { this.closed = true; this.teardown(); this.stat.emit("closed"); }
  counters() { return { sent: this.sent, recv: this.recv }; }
}

/* ---------- BroadcastChannel : deux onglets d'un même navigateur (tests automatisés, démonstration sans réseau) ---------- */
export interface SimNet { latency: number; jitter: number; loss: number }

export class BroadcastTransport implements Transport {
  readonly kind = "bc" as const;
  private msgs = new Emitter<Envelope>();
  private stat = new Emitter<TransportStatus>();
  private bc: BroadcastChannel | null = null;
  private sent = 0;
  private recv = 0;
  private offline = false;

  constructor(private code: string, private sim: SimNet = { latency: 0, jitter: 0, loss: 0 }) {}

  start(): void {
    this.open();
    setTimeout(() => this.stat.emit("open"), 30);
  }
  private open() {
    this.bc?.close();
    this.bc = new BroadcastChannel(CHANNEL_PREFIX + this.code);
    this.bc.onmessage = (ev: MessageEvent<Envelope>) => {
      if (this.offline || Math.random() < this.sim.loss) return;
      const d = this.sim.latency + Math.random() * this.sim.jitter;
      const deliver = () => { this.recv++; this.msgs.emit(ev.data); };
      if (d > 0) setTimeout(deliver, d); else deliver();
    };
  }
  send(env: Envelope): void {
    if (this.offline || !this.bc) return;
    this.sent++;
    const d = this.sim.latency + Math.random() * this.sim.jitter;
    const go = () => { try { this.bc?.postMessage(env); } catch { /* rien */ } };
    if (d > 0) setTimeout(go, d); else go();
  }
  onMessage(cb: (env: Envelope) => void) { return this.msgs.on(cb); }
  onStatus(cb: (s: TransportStatus) => void) { return this.stat.on(cb); }
  reconnect(): void { this.open(); this.stat.emit("connecting"); setTimeout(() => this.stat.emit("open"), 30); }
  close(): void { this.bc?.close(); this.bc = null; this.stat.emit("closed"); }
  counters() { return { sent: this.sent, recv: this.recv }; }
  /** Pour les tests : coupe / rétablit la liaison sans fermer le canal. */
  setOffline(v: boolean) { this.offline = v; }
}

/** Choix du transport : `?net=bc` (+ `&lat=80&jit=40&loss=0.05`) pour les tests, Supabase sinon. */
export function createTransport(code: string, coop: CoopConfig, search = location.search): Transport | null {
  const q = new URLSearchParams(search);
  if (q.get("net") === "bc" && typeof BroadcastChannel !== "undefined") {
    return new BroadcastTransport(code, { latency: Number(q.get("lat") ?? 0), jitter: Number(q.get("jit") ?? 0), loss: Number(q.get("loss") ?? 0) });
  }
  if (!coop.supabase) return null;
  return new SupabaseTransport(code, coop.supabase);
}
