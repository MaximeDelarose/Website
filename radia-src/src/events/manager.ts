/**
 * Logique pure des invitations : éligibilité, tirage pondéré, limites de fréquence,
 * file d'attente, récompense unique. Aucune dépendance au DOM : entièrement testable.
 * Le temps est mesuré en « temps de jeu actif » (state.playMs), pas en temps réel.
 */
import type { EventDef, EventsState, Invite, Msg, Sender } from './types';

/** Réglages faciles à ajuster (tout est ici). */
export const EVENT_CONFIG = {
  /** Première invitation après quelques minutes de jeu actif. */
  firstAfterMs: 3 * 60_000,
  /** Fenêtre glissante et maximum de GRANDES invitations dans cette fenêtre (2 par 30 min). */
  bigWindowMs: 30 * 60_000,
  bigMax: 2,
  /** Écart minimal entre deux grandes invitations. */
  bigGapMs: 8 * 60_000,
  /** Petits messages (conversations du téléphone) : plus fréquents, discrets. */
  smallGapMs: 9 * 60_000,
  /** Au plus N invitations en attente (« plus tard ») avant d'en proposer de nouvelles. */
  maxPending: 4,
  /** Un événement rejouable n'est reproposé qu'après ce temps de jeu actif. */
  repeatGapMs: 45 * 60_000,
  /** Enveloppe dorée : rare. */
  goldenMinPlayMs: 25 * 60_000,
  goldenGapMs: 60 * 60_000,
  /** Sécurité : une invitation reste « nouvelle » au plus ce temps avant de passer en « plus tard ». */
  staleNewMs: 20 * 60_000,
} as const;

export interface Progress {
  chapter: number;
  chessUnlocked: boolean;
  careerCurrent: string | null;
  /** Carrières déjà pratiquées (au moins une séance). */
  careersTried: string[];
}

const PENDING = new Set<Invite['state']>(['new', 'seen', 'later']);

export const pendingInvites = (st: EventsState): Invite[] => st.inbox.filter((i) => PENDING.has(i.state));
export const isPending = (st: EventsState, eventId: string): boolean => st.inbox.some((i) => i.eventId === eventId && PENDING.has(i.state));

export function eligible(def: EventDef, st: EventsState, pr: Progress): boolean {
  if (st.lastEventId === def.id) return false; // pas de répétition immédiate
  if (isPending(st, def.id)) return false;
  if (st.current && st.current.eventId === def.id) return false;
  const done = st.done[def.id];
  if (done) {
    if (!def.repeatable) return false;
    if (st.playMs - done.last < EVENT_CONFIG.repeatGapMs) return false;
  }
  if ((def.minPlayMin ?? 0) * 60_000 > st.playMs) return false;
  const n = def.needs;
  if (n) {
    if (n.career) {
      if (n.career === 'any' ? !pr.careerCurrent : !(pr.careerCurrent === n.career || pr.careersTried.includes(n.career))) return false;
    }
    if (n.chapter && pr.chapter < n.chapter) return false;
    if (n.chess && !pr.chessUnlocked) return false;
    if (n.doneAll && !n.doneAll.every((id) => (st.done[id]?.count ?? 0) > 0)) return false;
    if (n.afterMin) { const d = st.done[n.afterMin.id]; if (!d || st.playMs - d.last < n.afterMin.min * 60_000) return false; }
  }
  if (def.golden) {
    if (st.playMs < EVENT_CONFIG.goldenMinPlayMs) return false;
    const lastGolden = Math.max(0, ...st.inbox.filter((i) => i.eventId.startsWith('g-')).map((i) => i.at));
    if (lastGolden && st.playMs - lastGolden < EVENT_CONFIG.goldenGapMs) return false;
  }
  return true;
}

/** Peut-on proposer une GRANDE invitation maintenant ? (limites de fréquence, file d'attente) */
export function canOfferBig(st: EventsState): boolean {
  const c = EVENT_CONFIG;
  if (st.current) return false; // une activité est déjà en cours (ou suspendue)
  if (pendingInvites(st).some((i) => i.state === 'new')) return false; // pas de notifications superposées
  if (pendingInvites(st).length >= c.maxPending) return false;
  if (st.bigLog.length === 0 && st.playMs < c.firstAfterMs) return false;
  const recent = st.bigLog.filter((t) => t > st.playMs - c.bigWindowMs);
  if (recent.length >= c.bigMax) return false;
  const last = st.bigLog.length ? st.bigLog[st.bigLog.length - 1] : -Infinity;
  if (st.playMs - last < c.bigGapMs) return false;
  return true;
}

export function pickEvent(defs: EventDef[], st: EventsState, pr: Progress, rng: () => number): EventDef | null {
  const pool = defs.filter((d) => d.big && eligible(d, st, pr));
  if (!pool.length) return null;
  // les nouveautés (jamais jouées) sont un peu favorisées ; les dorées restent rares
  const weights = pool.map((d) => Math.max(0.01, d.weight * (st.done[d.id] ? 0.6 : 1.4) * (d.golden ? 0.5 : 1)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

export function offerInvite(st: EventsState, def: EventDef, now: number, runId: string): Invite {
  const inv: Invite = { runId, eventId: def.id, at: st.playMs, ...(now > 0 ? { ts: now } : {}), state: 'new' };
  st.inbox.push(inv);
  if (st.inbox.length > 60) st.inbox.splice(0, st.inbox.length - 60);
  st.lastEventId = def.id;
  st.lastInviteAt = st.playMs;
  st.bigLog.push(st.playMs);
  if (st.bigLog.length > 20) st.bigLog.splice(0, st.bigLog.length - 20);
  return inv;
}

/** Heure réelle d'une invitation : `ts` si connue, sinon estimée (temps de jeu actif écoulé depuis sa réception, jamais dans le futur). */
export function inviteTime(st: EventsState, i: Invite, now: number): number { return i.ts ?? Math.max(1, now - Math.max(0, st.playMs - i.at)); }
/** Donne une heure réelle aux anciennes invitations (sauvegardes d'avant) : estimée une seule fois, puis stable. */
export function ensureInviteTs(st: EventsState, now: number): number {
  let n = 0; for (const i of st.inbox) if (i.ts === undefined) { i.ts = inviteTime(st, i, now); n++; } return n;
}

/** Une notification trop ancienne et jamais vue passe en « plus tard » (jamais perdue). */
export function settleStale(st: EventsState): void {
  for (const i of st.inbox) if (i.state === 'new' && st.playMs - i.at > EVENT_CONFIG.staleNewMs) i.state = 'later';
}

export function setInviteState(st: EventsState, runId: string, state: Invite['state']): boolean {
  const i = st.inbox.find((x) => x.runId === runId);
  if (!i) return false;
  i.state = state;
  return true;
}

/** Verse la récompense UNE seule fois par run. Renvoie vrai si c'est la première demande. */
export function claimOnce(st: EventsState, runId: string, now: number): boolean {
  if (st.claimed[runId]) return false;
  st.claimed[runId] = now;
  const keys = Object.keys(st.claimed);
  if (keys.length > 300) for (const k of keys.slice(0, keys.length - 300)) delete st.claimed[k];
  return true;
}

export function recordDone(st: EventsState, eventId: string, score: number, now: number): { first: boolean; count: number } {
  const cur = st.done[eventId];
  const first = !cur;
  const next = { count: (cur?.count ?? 0) + 1, last: st.playMs, best: Math.max(cur?.best ?? 0, Math.round(score)) };
  st.done[eventId] = next;
  void now;
  return { first, count: next.count };
}

// ------------------------------------------------------------------ petits messages (téléphone)

export function canSendSmall(st: EventsState): boolean {
  const last = st.smallLog.length ? st.smallLog[st.smallLog.length - 1] : -Infinity;
  return st.playMs - last >= EVENT_CONFIG.smallGapMs && st.playMs > 2 * 60_000;
}

export function pushMessage(st: EventsState, from: Sender, text: string, now: number): Msg {
  const m: Msg = { at: now, from, text, read: false };
  st.msgs.push(m);
  if (st.msgs.length > 60) st.msgs.splice(0, st.msgs.length - 60);
  st.smallLog.push(st.playMs);
  if (st.smallLog.length > 20) st.smallLog.splice(0, st.smallLog.length - 20);
  return m;
}

export const unreadCount = (st: EventsState): number => st.msgs.filter((m) => !m.read).length + st.inbox.filter((i) => i.state === 'new').length;
