/**
 * Tindeur jouable — état et règles (aucun DOM, RNG injectable).
 * Sauvegardé dans `save.data.fun.apps.swipe` (objet libre : on le nettoie ici, sous 400 Ko).
 * Aucun mur de paiement, aucune pénalité : les cœurs se rechargent tout seuls, passer est illimité.
 */
import { PROFILES, OPENING, nodeOf, profileById } from './data';
import { relanceTarget } from '../../../apps/brain/tindeurNodes';
import type { Node, Profile } from './types';

export const SW = {
  /** Cœurs maximum en réserve, et délai de recharge d'un cœur (ms réelles). */
  bankMax: 12,
  refillMs: 45_000,
  /** Après N likes sans match, le suivant est un match (jamais de série malchanceuse). */
  missCap: 2,
  /** Premier message non lu : une notification possible après ce temps de JEU ACTIF (ms). */
  firstPingMs: 4 * 60_000,
  /** Écart minimal entre deux notifications Tindeur (jeu actif). */
  pingGapMs: 8 * 60_000,
  /** « Répondre plus tard » : on reparle dans… */
  snoozeMs: 12 * 60_000,
  /** Réponse d'un match quand Radia a quitté le chat : entre 3 et 6 min de jeu actif. */
  replyMinMs: 3 * 60_000,
  replySpanMs: 3 * 60_000,
  logMax: 80,
} as const;

export interface Msg { k: 'in' | 'out'; n: string; c?: number; t: number }
export interface Convo {
  pid: string;
  log: Msg[];
  status: 'active' | 'ended' | 'stopped';
  /** Nœud de fin atteint (si status === 'ended'). */
  end: string;
  /** Réponse en attente d'écriture (id de nœud), livrée à `due` (horloge de jeu actif) ; due = 0 : le chat est ouvert. */
  queue: string;
  due: number;
  unread: boolean;
  /** Horloge à partir de laquelle une notification est permise ; 0 = aucune. */
  pingAt: number;
  notified: boolean;
  at: number;
}
export interface SwipeState {
  v: 1;
  /** Temps de jeu actif cumulé (ms). */
  clock: number;
  cycle: number;
  order: string[];
  pos: number;
  seen: string[];
  liked: string[];
  passed: string[];
  matches: string[];
  convos: Record<string, Convo>;
  bank: { n: number; ts: number };
  stats: { likes: number; passes: number; matches: number; ended: number };
  endings: Record<string, string[]>;
  missStreak: number;
  lastPing: number;
  pings: number;
  welcomed: boolean;
}

export const defaultSwipe = (): SwipeState => ({
  v: 1, clock: 0, cycle: 0, order: [], pos: 0, seen: [], liked: [], passed: [], matches: [], convos: {},
  bank: { n: SW.bankMax, ts: 0 }, stats: { likes: 0, passes: 0, matches: 0, ended: 0 }, endings: {},
  missStreak: 0, lastPing: -1e12, pings: 0, welcomed: false,
});

// ------------------------------------------------------------------ nettoyage

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d: number, lo = 0, hi = 1e13) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const known = (id: unknown): id is string => typeof id === 'string' && !!profileById(id);
const ids = (v: unknown, max = 200): string[] => (Array.isArray(v) ? [...new Set(v.filter(known))].slice(0, max) : []);

/** Migration tolérante : toute valeur invalide retombe sur sa valeur par défaut ; les ids inconnus sont écartés. */
export function sanitizeSwipe(raw: unknown): SwipeState {
  const d = defaultSwipe();
  if (!isObj(raw)) return d;
  d.clock = num(raw.clock, 0);
  d.cycle = Math.floor(num(raw.cycle, 0, 0, 1e6));
  d.order = ids(raw.order);
  d.pos = Math.floor(num(raw.pos, 0, 0, d.order.length));
  d.seen = ids(raw.seen);
  d.liked = ids(raw.liked);
  d.passed = ids(raw.passed);
  if (isObj(raw.bank)) d.bank = { n: Math.floor(num(raw.bank.n, SW.bankMax, 0, SW.bankMax)), ts: num(raw.bank.ts, 0) };
  if (isObj(raw.stats)) {
    const s = raw.stats;
    d.stats = { likes: Math.floor(num(s.likes, 0, 0, 1e7)), passes: Math.floor(num(s.passes, 0, 0, 1e7)), matches: Math.floor(num(s.matches, 0, 0, 1e7)), ended: Math.floor(num(s.ended, 0, 0, 1e7)) };
  }
  d.missStreak = Math.floor(num(raw.missStreak, 0, 0, 99));
  d.lastPing = num(raw.lastPing, -1e12, -1e12);
  d.pings = Math.floor(num(raw.pings, 0, 0, 1e6));
  d.welcomed = raw.welcomed === true;
  if (isObj(raw.convos)) {
    for (const [pid, c] of Object.entries(raw.convos).slice(0, 80)) {
      const p = profileById(pid);
      if (!p || !isObj(c)) continue;
      const cv = sanitizeConvo(p, c, d.clock);
      if (cv) d.convos[pid] = cv;
    }
  }
  d.matches = ids(raw.matches).filter((id) => !!d.convos[id]);
  for (const pid of Object.keys(d.convos)) if (!d.matches.includes(pid)) d.matches.push(pid);
  if (isObj(raw.endings)) {
    for (const [pid, arr] of Object.entries(raw.endings)) {
      const p = profileById(pid);
      if (!p || !Array.isArray(arr)) continue;
      d.endings[pid] = [...new Set(arr.filter((x): x is string => typeof x === 'string' && !!nodeOf(p, x)?.end))];
    }
  }
  return d;
}

function sanitizeConvo(p: Profile, c: Record<string, unknown>, clock: number): Convo | null {
  const log: Msg[] = [];
  if (Array.isArray(c.log)) {
    for (const m of c.log.slice(-SW.logMax)) {
      if (!isObj(m) || typeof m.n !== 'string' || !nodeOf(p, m.n)) continue;
      const t = num(m.t, 0);
      if (m.k === 'in') log.push({ k: 'in', n: m.n, t });
      else if (m.k === 'out') {
        const node = nodeOf(p, m.n)!;
        const ci = Math.floor(num(m.c, -1, -1, 9));
        if (ci >= 0 && ci < node.ch.length) log.push({ k: 'out', n: m.n, c: ci, t });
      }
    }
  }
  // le dernier message doit être entrant, ou sortant avec une réponse en attente
  if (!log.length || log[0].k !== 'in') { log.length = 0; log.push({ k: 'in', n: p.start, t: num(c.at, 0) }); }
  const last = log[log.length - 1];
  let queue = typeof c.queue === 'string' && nodeOf(p, c.queue) ? c.queue : '';
  if (last.k === 'out') {
    const to = nodeOf(p, last.n)!.ch[last.c!].to;
    queue = nodeOf(p, to) ? to : '';
    if (!queue) log.pop();
  } else queue = '';
  const cur = log[log.length - 1];
  const node = nodeOf(p, cur.n)!;
  let status: Convo['status'] = c.status === 'stopped' ? 'stopped' : 'active';
  let end = '';
  if (node.end && !queue) { status = 'ended'; end = node.id; }
  return {
    pid: p.id, log, status, end, queue, due: queue ? num(c.due, clock + SW.replyMinMs, 0) : 0,
    unread: c.unread === true, pingAt: num(c.pingAt, 0), notified: c.notified === true, at: num(c.at, 0),
  };
}

// ------------------------------------------------------------------ cœurs

/** Recharge d'un cœur toutes les 45 s réelles (jusqu'au plafond). Aucune attente forcée. */
export function refillBank(s: SwipeState, now: number): void {
  const b = s.bank;
  if (b.n >= SW.bankMax) { b.n = SW.bankMax; b.ts = now; return; }
  if (!b.ts || b.ts > now) { b.ts = now; return; }
  const k = Math.floor((now - b.ts) / SW.refillMs);
  if (k > 0) { b.n = Math.min(SW.bankMax, b.n + k); b.ts = b.n >= SW.bankMax ? now : b.ts + k * SW.refillMs; }
}
/** Secondes avant le prochain cœur (0 si la réserve est pleine). */
export function nextHeartIn(s: SwipeState, now: number): number {
  if (s.bank.n >= SW.bankMax) return 0;
  return Math.max(1, Math.ceil((s.bank.ts + SW.refillMs - now) / 1000));
}

// ------------------------------------------------------------------ pile de cartes

function shuffle<T>(a: T[], rng: () => number): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

/** Remplit la pile quand elle est finie : la pile se renouvelle toujours (profils déjà passés revenus, jamais les matchs en cours). */
export function ensureDeck(s: SwipeState, rng: () => number = Math.random): void {
  if (s.pos < s.order.length) return;
  const pool = PROFILES.filter((p) => !s.matches.includes(p.id)).map((p) => p.id);
  if (!pool.length) { s.order = []; s.pos = 0; return; }
  const first = s.cycle === 0 && s.seen.length === 0;
  const head = first ? OPENING.filter((id) => pool.includes(id)) : [];
  let rest = shuffle(pool.filter((id) => !head.includes(id)), rng);
  // jamais la même carte deux fois de suite à la jonction de deux cycles
  const lastSeen = s.order[s.order.length - 1];
  if (!first && rest.length > 1 && rest[0] === lastSeen) rest = [...rest.slice(1), rest[0]];
  s.order = [...head, ...rest];
  s.pos = 0;
  s.cycle++;
}
export const currentId = (s: SwipeState): string | null => (s.pos < s.order.length ? s.order[s.pos] : null);
export const peekIds = (s: SwipeState, n = 2): string[] => s.order.slice(s.pos, s.pos + n);
export const deckLeft = (s: SwipeState): number => Math.max(0, s.order.length - s.pos);

function advance(s: SwipeState, rng: () => number): void {
  s.pos++;
  if (s.pos >= s.order.length) ensureDeck(s, rng);
}
function markSeen(s: SwipeState, id: string): void { if (!s.seen.includes(id)) s.seen.push(id); }

export function pass(s: SwipeState, rng: () => number = Math.random): string | null {
  ensureDeck(s, rng);
  const id = currentId(s);
  if (!id) return null;
  markSeen(s, id);
  if (!s.passed.includes(id)) s.passed.push(id);
  s.stats.passes++;
  advance(s, rng);
  return id;
}

export interface LikeResult { ok: boolean; id: string | null; match: boolean; reason?: 'empty-bank' | 'no-card' }

/** Like : consomme un cœur ; match si le tirage le permet (premier like et série de 2 ratés : match garanti). */
export function like(s: SwipeState, now: number, rng: () => number = Math.random): LikeResult {
  ensureDeck(s, rng);
  const id = currentId(s);
  if (!id) return { ok: false, id: null, match: false, reason: 'no-card' };
  refillBank(s, now);
  if (s.bank.n <= 0) return { ok: false, id, match: false, reason: 'empty-bank' };
  const p = profileById(id)!;
  if (s.bank.n >= SW.bankMax) s.bank.ts = now;
  s.bank.n--;
  markSeen(s, id);
  if (!s.liked.includes(id)) s.liked.push(id);
  s.stats.likes++;
  const guaranteed = s.stats.matches === 0 || s.missStreak >= SW.missCap;
  const match = !s.matches.includes(id) && (guaranteed || rng() < p.like);
  if (match) { startMatch(s, p, now); s.missStreak = 0; } else s.missStreak++;
  advance(s, rng);
  return { ok: true, id, match };
}

function startMatch(s: SwipeState, p: Profile, now: number): void {
  s.stats.matches++;
  if (!s.matches.includes(p.id)) s.matches.unshift(p.id);
  s.convos[p.id] = {
    pid: p.id, log: [{ k: 'in', n: p.start, t: now }], status: 'active', end: '', queue: '', due: 0,
    unread: true, pingAt: s.clock + SW.firstPingMs, notified: false, at: now,
  };
}

// ------------------------------------------------------------------ conversations

export function currentNode(s: SwipeState, pid: string): Node | undefined {
  const p = profileById(pid); const c = s.convos[pid];
  if (!p || !c) return undefined;
  for (let i = c.log.length - 1; i >= 0; i--) if (c.log[i].k === 'in') return nodeOf(p, c.log[i].n);
  return undefined;
}
/** Réponses proposées à Radia (vide si elle attend une réponse, ou si l'histoire est finie). */
export function choicesOf(s: SwipeState, pid: string): Node['ch'] {
  const c = s.convos[pid];
  if (!c || c.status !== 'active' || c.queue) return [];
  return currentNode(s, pid)?.ch ?? [];
}

/** Radia choisit une réponse : la réplique est mise en file (le match « écrit »…). */
export function choose(s: SwipeState, pid: string, ci: number, now: number): boolean {
  const c = s.convos[pid]; const node = currentNode(s, pid);
  if (!c || !node || c.status !== 'active' || c.queue || ci < 0 || ci >= node.ch.length) return false;
  c.log.push({ k: 'out', n: node.id, c: ci, t: now });
  if (c.log.length > SW.logMax) c.log.splice(0, c.log.length - SW.logMax);
  c.queue = node.ch[ci].to;
  c.due = 0;
  c.unread = false;
  c.pingAt = 0;
  return true;
}

/** Livre la réplique en attente. `unread` : Radia n'est pas dans le chat. Renvoie le nœud livré. */
export function deliver(s: SwipeState, pid: string, now: number, unread: boolean): Node | null {
  const p = profileById(pid); const c = s.convos[pid];
  if (!p || !c || !c.queue) return null;
  const node = nodeOf(p, c.queue);
  c.queue = ''; c.due = 0;
  if (!node) return null;
  c.log.push({ k: 'in', n: node.id, t: now });
  if (c.log.length > SW.logMax) c.log.splice(0, c.log.length - SW.logMax);
  if (node.end) {
    c.status = 'ended'; c.end = node.id; s.stats.ended++;
    const e = (s.endings[pid] ??= []);
    if (!e.includes(node.id)) e.push(node.id);
  }
  c.unread = unread;
  c.notified = false;
  c.pingAt = unread ? s.clock + 60_000 : 0;
  return node;
}

/** Radia quitte le chat pendant que le match « écrit » : la réponse arrivera plus tard (jeu actif). */
export function deferQueue(s: SwipeState, pid: string, rng: () => number = Math.random): void {
  const c = s.convos[pid];
  if (c?.queue && c.due === 0) c.due = s.clock + SW.replyMinMs + Math.floor(rng() * SW.replySpanMs);
}
export function markRead(s: SwipeState, pid: string): void {
  const c = s.convos[pid];
  if (c) { c.unread = false; c.pingAt = 0; }
}

/** Fait avancer l'horloge de jeu ACTIF ; renvoie les matchs dont la réponse vient d'arriver. */
export function tickClock(s: SwipeState, dt: number, active: boolean, now = Date.now()): string[] {
  if (!(dt > 0) || !active) return [];
  s.clock += Math.min(dt, 30_000);
  const out: string[] = [];
  for (const c of Object.values(s.convos)) {
    if (c.queue && c.due > 0 && s.clock >= c.due && c.status === 'active') { if (deliver(s, c.pid, now, true)) out.push(c.pid); }
  }
  return out;
}

// ------------------------------------------------------------------ arrêter / supprimer / reprendre

export function stopConvo(s: SwipeState, pid: string): void {
  const c = s.convos[pid];
  if (c && c.status === 'active') { c.status = 'stopped'; c.queue = ''; c.due = 0; c.pingAt = 0; c.unread = false; }
}
export function resumeConvo(s: SwipeState, pid: string): void {
  const c = s.convos[pid];
  if (!c || c.status !== 'stopped') return;
  c.status = 'active';
  const last = c.log[c.log.length - 1];
  if (last.k === 'out') c.log.pop();
}
/** Supprime le match : la conversation disparaît, le profil pourra revenir plus tard dans la pile. */
export function removeMatch(s: SwipeState, pid: string): void {
  delete s.convos[pid];
  s.matches = s.matches.filter((x) => x !== pid);
}

// ------------------------------------------------------------------ notifications

/**
 * Prochain match qui peut « écrire » pendant le jeu : message non lu, pas encore notifié, délai atteint,
 * et jamais en rafale (écart minimal entre deux notifications). Aucune action si `allowed` est faux.
 */
export function pickPing(s: SwipeState, allowed: boolean): string | null {
  if (!allowed || s.clock - s.lastPing < SW.pingGapMs) return null;
  let best: Convo | null = null;
  for (const c of Object.values(s.convos)) {
    if (c.status === 'stopped' || !c.unread || c.notified || !c.pingAt || s.clock < c.pingAt) continue;
    if (!best || c.pingAt < best.pingAt) best = c;
  }
  return best ? best.pid : null;
}
export function markPinged(s: SwipeState, pid: string): void {
  const c = s.convos[pid];
  if (c) c.notified = true;
  s.lastPing = s.clock;
  s.pings++;
}
/** « Répondre plus tard » : une seule relance, bien plus tard. « Ignorer » : plus de relance pour ce message. */
export function snoozePing(s: SwipeState, pid: string): void {
  const c = s.convos[pid];
  if (c) { c.notified = false; c.pingAt = s.clock + SW.snoozeMs; }
}
export function ignorePing(s: SwipeState, pid: string): void { const c = s.convos[pid]; if (c) c.notified = true; }

export const unreadCount = (s: SwipeState): number => Object.values(s.convos).filter((c) => c.unread && c.status !== 'stopped').length;
export const lastLine = (s: SwipeState, pid: string): string => {
  const p = profileById(pid); const c = s.convos[pid];
  if (!p || !c) return '';
  for (let i = c.log.length - 1; i >= 0; i--) {
    const m = c.log[i]; const n = nodeOf(p, m.n);
    if (!n) continue;
    return m.k === 'in' ? n.say[n.say.length - 1] : `Toi : ${n.ch[m.c ?? 0]?.t ?? ''}`;
  }
  return '';
};
/** Nombre de fins découvertes / total de fins du catalogue. */
export const endingsFound = (s: SwipeState): number => Object.values(s.endings).reduce((a, e) => a + e.length, 0);
export const endingsTotal = (): number => PROFILES.reduce((a, p) => a + p.nodes.filter((n) => n.end).length, 0);
/** Fins écrites à la main découvertes (les fins dynamiques « ~… » ne comptent pas dans le catalogue). */
export const authoredFound = (s: SwipeState, pid: string): number => (s.endings[pid] ?? []).filter((x) => !x.startsWith('~')).length;

/** Relance après plusieurs jours (vraies dates) : livre le nœud de relance / d'éloignement. Renvoie vrai si la conversation a changé. */
export function maybeRelance(s: SwipeState, pid: string, now: number): boolean {
  const c = s.convos[pid];
  if (!c || c.status !== 'active' || c.queue || !c.log.length) return false;
  const last = c.log[c.log.length - 1];
  if (last.k !== 'in' || !last.t) return false;
  const to = relanceTarget(last.n, last.t, now, false);
  if (!to) return false;
  c.queue = to;
  return !!deliver(s, pid, now, true);
}
