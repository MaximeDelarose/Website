import { gameConfig } from "../config/game.config";
import { haptic } from "./haptics";
import { audio } from "../services/audio";
import { makeCode, normalizeCode, PROTOCOL, type Envelope } from "./protocol";
import type { HostState } from "./roster";
import { RoomSession } from "./session";
import { createTransport, type Transport } from "./transport";

/**
 * Point d'entrée unique du mode coopératif : crée / rejoint / reprend un salon.
 * Singleton hors de React : un rechargement de composant ou le double rendu du mode strict ne coupent jamais la liaison.
 */
const cfg = gameConfig.coop;
const K = { id: "code-rouge/net/id", name: "code-rouge/net/name", current: "code-rouge/net/current", host: "code-rouge/net/host" };
const HOST_STATE_MAX_AGE = 6 * 60 * 60 * 1000;

export interface Identity { id: string; name: string }
export interface ManagerState { busy: boolean; error: string | null; session: RoomSession | null }

function store(kind: "local" | "session"): Storage | null {
  try { return kind === "local" ? localStorage : sessionStorage; } catch { return null; }
}
const read = (s: Storage | null, k: string) => { try { return s?.getItem(k) ?? null; } catch { return null; } };
const write = (s: Storage | null, k: string, v: string | null) => { try { if (v === null) s?.removeItem(k); else s?.setItem(k, v); } catch { /* rien */ } };

export function identity(): Identity {
  const q = new URLSearchParams(location.search);
  let id = q.get("cid") ?? read(store("local"), K.id);
  if (!id) { id = Math.random().toString(36).slice(2, 12); write(store("local"), K.id, id); }
  return { id, name: read(store("local"), K.name) ?? "" };
}

export function rememberName(name: string): void { write(store("local"), K.name, name); }

class RoomManager {
  private state: ManagerState = { busy: false, error: null, session: null };
  private listeners = new Set<() => void>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  getState = () => this.state;
  private set(p: Partial<ManagerState>) { this.state = { ...this.state, ...p }; this.listeners.forEach((l) => l()); }

  private transport(code: string): Transport | null { return createTransport(code, cfg); }

  /** Cherche si un salon répond déjà sur ce code (collision) : on attend brièvement un « host_here ». */
  private probe(code: string): Promise<"free" | "taken" | "unreachable"> {
    return new Promise((resolve) => {
      const t = this.transport(code);
      if (!t) return resolve("unreachable");
      let settled = false;
      const done = (r: "free" | "taken" | "unreachable") => { if (!settled) { settled = true; t.close(); resolve(r); } };
      t.onMessage((e: Envelope) => { if (e.t === "host_here") done("taken"); });
      t.onStatus((s) => {
        if (s === "open") {
          t.send({ v: PROTOCOL, from: "probe-" + Math.random().toString(36).slice(2, 6), t: "probe", n: 1 });
          setTimeout(() => done("free"), 1200);
        } else if (s === "error") done("unreachable");
      });
      t.start();
      setTimeout(() => done("unreachable"), 9000);
    });
  }

  async create(name: string): Promise<void> {
    if (this.state.busy) return;
    this.set({ busy: true, error: null });
    const me = { ...identity(), name };
    rememberName(name);
    for (let i = 0; i < 6; i++) {
      const code = makeCode();
      const r = await this.probe(code);
      if (r === "unreachable") { this.set({ busy: false, error: "Impossible de joindre le serveur de jeu. Vérifiez la connexion et réessayez." }); return; }
      if (r === "taken") continue;
      this.open("host", code, me, null);
      return;
    }
    this.set({ busy: false, error: "Aucun code libre trouvé, réessayez." });
  }

  join(rawCode: string, name: string): void {
    const code = normalizeCode(rawCode);
    if (!code) { this.set({ error: "Code invalide : 4 lettres (sans I, L ni O)." }); return; }
    rememberName(name);
    this.open("client", code, { ...identity(), name }, null);
  }

  /** Reprise après rechargement : même onglet → même salon, même rôle. */
  resume(): boolean {
    if (this.state.session) return true;
    const raw = read(store("session"), K.current);
    if (!raw) return false;
    try {
      const cur = JSON.parse(raw) as { role: "host" | "client"; code: string };
      const me = identity();
      if (cur.role === "client") { this.open("client", cur.code, me, null); return true; }
      const saved = JSON.parse(read(store("local"), K.host) ?? "null") as { state: HostState; savedAt: number } | null;
      if (!saved || saved.state.code !== cur.code || saved.state.hostId !== me.id || Date.now() - saved.savedAt > HOST_STATE_MAX_AGE) { write(store("session"), K.current, null); return false; }
      if (saved.state.lab?.status === "running") saved.state.lab = { ...saved.state.lab, status: "done" };
      this.open("host", cur.code, { ...me, name: saved.state.members.find((m) => m.id === me.id)?.name ?? me.name }, saved.state);
      return true;
    } catch { write(store("session"), K.current, null); return false; }
  }

  private open(role: "host" | "client", code: string, me: Identity, restore: HostState | null): void {
    const transport = this.transport(code);
    if (!transport) { this.set({ busy: false, error: "Le mode coopératif n'est pas disponible." }); return; }
    const session = new RoomSession({
      transport, code, me, role, cfg, restore,
      onPersist: role === "host" ? (state) => this.persistHost(state) : undefined,
      onProbeEffect: (kind) => { if (kind === "sound") audio.reveal(); else haptic("success"); },
    });
    write(store("session"), K.current, JSON.stringify({ role, code }));
    this.set({ busy: false, error: null, session });
    session.start();
  }

  private persistHost(state: HostState): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => write(store("local"), K.host, JSON.stringify({ state, savedAt: Date.now() })), 300);
  }

  leave(): void {
    this.state.session?.leave();
    write(store("session"), K.current, null);
    if (this.state.session?.getState().isHost) write(store("local"), K.host, null);
    this.set({ session: null, busy: false, error: null });
  }

  clearError(): void { this.set({ error: null }); }
}

export const room = new RoomManager();

// Outils de test (navigateur automatisé) : jamais actifs sans ?net=bc ou ?debug dans l'adresse.
if (typeof window !== "undefined" && /[?&](debug|net=bc)/.test(location.search)) (window as unknown as { __cr: unknown }).__cr = { room };
