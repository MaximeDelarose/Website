/**
 * Orchestrateur des incidents — logique PURE (aucun DOM), testable.
 * Le temps est le temps de jeu ACTIF (`st.activeMs`), jamais l'horloge murale : hors jeu / onglet caché
 * rien ne compte. Un seul incident actif à la fois ; jamais de rafale ; jamais de punition.
 */
import type { IncidentState } from '../../save/fun';
import { INCIDENTS, MIN, type IncidentDef } from './data';
import { rng } from './rng';

export const INCIDENT_CONFIG = {
  /** Premier incident : après ce temps de jeu actif. */
  firstMs: 8 * MIN,
  /** Écart entre deux incidents (jeu actif), tiré dans [min, max]. */
  gapMinMs: 14 * MIN,
  gapMaxMs: 24 * MIN,
} as const;

export interface WorldCtx { catAdopted: boolean; hasGarden: boolean }

/** Mémorise le dernier incident dans `done` (clé réservée « ~last », valeur = rang + 1). */
export const LAST_KEY = '~last';
export const lastIncidentId = (st: IncidentState, defs: IncidentDef[] = INCIDENTS): string => defs[(st.done[LAST_KEY] ?? 0) - 1]?.id ?? '';

/** Avance le compteur de temps actif. */
export function trackActive(st: IncidentState, dt: number, active: boolean): void {
  if (active && dt > 0) st.activeMs += Math.min(dt, 60_000);
}

/** Planifie le prochain incident (écart aléatoire en temps actif). */
export function scheduleNext(st: IncidentState, r: () => number = Math.random, first = false): void {
  const c = INCIDENT_CONFIG;
  st.nextAtActive = st.activeMs + (first ? c.firstMs : Math.round(c.gapMinMs + r() * (c.gapMaxMs - c.gapMinMs)));
}

export const isDue = (st: IncidentState): boolean => !st.active && st.nextAtActive > 0 && st.activeMs >= st.nextAtActive;

export function eligible(def: IncidentDef, st: IncidentState, ctx: WorldCtx, defs = INCIDENTS): boolean {
  if (def.needs === 'cat' && !ctx.catAdopted) return false;
  if (def.needs === 'garden' && !ctx.hasGarden) return false;
  return lastIncidentId(st, defs) !== def.id || defs.length === 1;
}

/** Tirage pondéré parmi les incidents éligibles. */
export function pickIncident(st: IncidentState, ctx: WorldCtx, r: () => number = Math.random, defs: IncidentDef[] = INCIDENTS): IncidentDef | null {
  const pool = defs.filter((d) => eligible(d, st, ctx, defs));
  const total = pool.reduce((s, d) => s + d.weight, 0);
  if (!pool.length || total <= 0) return null;
  let x = r() * total;
  for (const d of pool) { x -= d.weight; if (x < 0) return d; }
  return pool[pool.length - 1];
}

/** Fait apparaître un incident (refuse s'il y en a déjà un). */
export function spawn(st: IncidentState, def: IncidentDef, now: number, seed: number): boolean {
  if (st.active) return false;
  st.active = { id: def.id, at: now, deferActive: -1, cost: def.baseCost, seed: Math.floor(seed) % 2 ** 31 };
  st.lastAt = now;
  return true;
}

/** Coût courant : base, puis plafond après `escalateMs` de jeu actif depuis le report. Jamais au-dessus du plafond. */
export function costNow(def: IncidentDef, a: NonNullable<IncidentState['active']>, activeMs: number): number {
  if (def.baseCost <= 0) return 0;
  if (def.escalateMs > 0 && a.deferActive >= 0 && activeMs - a.deferActive >= def.escalateMs) return Math.min(def.capCost, Math.max(def.baseCost, def.capCost));
  return Math.min(def.baseCost, def.capCost);
}
/** Met à jour `active.cost` ; renvoie le coût. */
export function syncCost(st: IncidentState, def: IncidentDef): number {
  if (!st.active) return 0;
  st.active.cost = costNow(def, st.active, st.activeMs);
  return st.active.cost;
}
/** Reporter : ne démarre l'horloge qu'une fois (reporter de nouveau ne remet rien à zéro). */
export function defer(st: IncidentState): void {
  if (st.active && st.active.deferActive < 0) st.active.deferActive = st.activeMs;
}
/** Temps de jeu actif restant avant la hausse (ms) ; null si pas reporté ou pas d'escalade. */
export function escalationIn(def: IncidentDef, st: IncidentState): number | null {
  const a = st.active;
  if (!a || def.escalateMs <= 0 || def.baseCost <= 0 || a.deferActive < 0) return null;
  return Math.max(0, def.escalateMs - (st.activeMs - a.deferActive));
}
/** Conséquence affichée dès le premier choix. */
export function consequenceText(def: IncidentDef): string | null {
  if (def.escalateMs <= 0 || def.capCost <= def.baseCost) return null;
  return `Si tu reportes : ${def.capCost} pièces dans ${Math.round(def.escalateMs / MIN)} min de jeu`;
}
export const canPay = (coins: number, cost: number): boolean => cost > 0 && coins >= cost;

/** Incident résolu (par n'importe quelle solution) : compteur, mémoire du dernier, prochain tirage. */
export function resolve(st: IncidentState, now: number, r: () => number = Math.random, defs: IncidentDef[] = INCIDENTS): string | null {
  const a = st.active;
  if (!a) return null;
  st.done[a.id] = (st.done[a.id] ?? 0) + 1;
  const idx = defs.findIndex((d) => d.id === a.id);
  if (idx >= 0) st.done[LAST_KEY] = idx + 1;
  st.active = null;
  st.lastAt = now;
  scheduleNext(st, r);
  return a.id;
}

/** Pièce touchée par l'effet visuel (stable d'après la graine, donc identique après rechargement). */
export function roomOf(def: IncidentDef, seed: number): 'bedroom' | 'salon' {
  const list = def.rooms ?? ['salon'];
  return list[Math.floor(rng(seed)() * list.length)];
}

/** Un pas de planificateur : renvoie l'incident à faire apparaître (ou null). `safe` : moment techniquement sûr. */
export function step(st: IncidentState, ctx: WorldCtx, safe: boolean, now: number, r: () => number = Math.random): IncidentDef | null {
  if (st.active) return null;
  if (st.nextAtActive <= 0) { scheduleNext(st, r, true); return null; }
  if (!isDue(st) || !safe) return null;
  const def = pickIncident(st, ctx, r);
  if (!def) { scheduleNext(st, r); return null; }
  spawn(st, def, now, Math.floor(r() * 2 ** 30) + 1);
  return def;
}
