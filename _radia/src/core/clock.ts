/* Pendule d'échecs fondée sur le temps réellement écoulé (performance.now),
   jamais sur un compte de setInterval : l'affichage peut se rafraîchir à n'importe
   quel rythme, le temps restant reste exact. Plusieurs raisons de pause peuvent
   se cumuler (carte souvenir, appli en arrière-plan, menu…). */
import type { Color } from "chess.js";

export type PauseReason = "card" | "hidden" | "menu" | "promotion" | "intro";

export interface ClockSnapshot { w: number | null; b: number | null; active: Color | null }

export class ChessClock {
  private rem: { w: number; b: number };
  private activeSide: Color | null = null;
  private since = 0;
  private readonly reasons = new Set<PauseReason>();
  private stopped = false;
  readonly unlimited: boolean;

  constructor(initialMs: number | null, private readonly now: () => number = () => performance.now()) {
    this.unlimited = initialMs === null;
    const ms = initialMs ?? Number.POSITIVE_INFINITY;
    this.rem = { w: ms, b: ms };
  }

  get active(): Color | null { return this.activeSide; }
  get paused(): boolean { return this.reasons.size > 0; }
  get running(): boolean { return !!this.activeSide && !this.paused && !this.stopped; }
  hasReason(r: PauseReason): boolean { return this.reasons.has(r); }

  /** Temps restant (ms) en tenant compte du temps écoulé depuis le dernier relevé. */
  remaining(c: Color): number {
    if (this.unlimited) return Number.POSITIVE_INFINITY;
    let r = this.rem[c];
    if (this.running && this.activeSide === c) r -= this.now() - this.since;
    return Math.max(0, r);
  }

  /** Côté dont le drapeau est tombé, s'il y en a un. */
  flagged(): Color | null {
    if (this.unlimited) return null;
    if (this.remaining("w") <= 0) return "w";
    if (this.remaining("b") <= 0) return "b";
    return null;
  }

  private commit(): void {
    if (this.running && this.activeSide) {
      const t = this.now();
      this.rem[this.activeSide] = Math.max(0, this.rem[this.activeSide] - (t - this.since));
      this.since = t;
    }
  }

  /** Démarre (ou bascule) la pendule de `c`. Arrête celle de l'autre. */
  start(c: Color): void {
    this.commit();
    this.activeSide = c;
    this.since = this.now();
  }

  pause(reason: PauseReason): void {
    if (this.reasons.has(reason)) return;
    this.commit();
    this.reasons.add(reason);
  }

  resume(reason: PauseReason): void {
    if (!this.reasons.has(reason)) return;
    this.commit();
    this.reasons.delete(reason);
    if (!this.paused) this.since = this.now();
  }

  /** Fin de partie : fige définitivement les temps. */
  stop(): void {
    this.commit();
    this.stopped = true;
  }
  get isStopped(): boolean { return this.stopped; }

  snapshot(): ClockSnapshot {
    return {
      w: this.unlimited ? null : this.remaining("w"),
      b: this.unlimited ? null : this.remaining("b"),
      active: this.activeSide,
    };
  }

  static restore(s: ClockSnapshot, now?: () => number): ChessClock {
    const c = new ChessClock(s.w === null ? null : 1, now);
    if (s.w !== null && s.b !== null) c.rem = { w: s.w, b: s.b };
    c.activeSide = s.active;
    c.since = c.now();
    return c;
  }
}

export function formatClock(ms: number): string {
  if (!Number.isFinite(ms)) return "∞";
  if (ms < 10_000) {
    // sous 10 s : dixièmes de seconde
    const t = Math.ceil(ms / 100) / 10;
    return "0:0" + t.toFixed(1);
  }
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ":" + String(s).padStart(2, "0");
}
