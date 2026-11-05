/**
 * Messages — moteur PUR (sans DOM) des conversations du téléphone du jeu : messages spontanés, réponses naturelles, accusés SIMULÉS
 * (« Distribué » / « Lu »), réactions. Aucun accusé de réception réel : tout est un événement de jeu. Testé dans tests/messages-engine.test.ts.
 */
import {
  AGENCY_REPLIES, AGENCY_SPONTANEOUS, AUGUSTE_REPLIES, AUGUSTE_SPONTANEOUS, CONTACT_IDS, INTENT_RULES, KID_REPLIES, KID_SPONTANEOUS,
  MAMAN_REPLIES, MAMAN_SPONTANEOUS, isContactId, isReaction, type ContactId, type Intent, type KidStyle, type Line, type ReactionId,
} from './data';

export interface RngLike { next(): number; int(n: number): number }
export interface Msg {
  id: string; from: 'me' | 'them'; text: string; at: number;
  /** Réaction posée par l'AUTRE personne sur MON message. */
  reaction?: ReactionId;
  /** Ma réaction sur SON message. */
  myReaction?: ReactionId;
  /** Mon message : « Distribué » (toujours, simulé) et « Lu » (quand le personnage l'a « lu »). */
  readAt?: number;
  /** Pièce jointe : identifiant d'une photo souvenir du jeu (jamais une vraie photo du téléphone). */
  photo?: string;
}
export interface Convo { msgs: Msg[]; unread: number; lastIn: number; recent: string[]; lastCat: string }
export interface MessagesState { v: 1; convos: Record<ContactId, Convo>; clock: number; nextAt: number; seq: number; muted: boolean }
export type StyleOf = (id: ContactId) => KidStyle;

const MAX_MSGS = 80;
const MAX_UNREAD_PER = 2;
const MAX_UNREAD_TOTAL = 4;
/** Premier message spontané après ~3 min de jeu actif (Snapchien écrit déjà à ~75 s : on évite les notifications simultanées). */
export const FIRST_AT_MS = 180_000;
const EVERY_MIN_MS = 6 * 60_000;
const EVERY_MAX_MS = 12 * 60_000;
const WEIGHTS: Record<ContactId, number> = { auguste: 5, maman: 1.6, kid1: 0.9, kid2: 0.9, kid3: 0.9, agency: 0.4 };

const emptyConvo = (): Convo => ({ msgs: [], unread: 0, lastIn: 0, recent: [], lastCat: '' });
export function defaultMessages(): MessagesState {
  const convos = {} as Record<ContactId, Convo>;
  for (const id of CONTACT_IDS) convos[id] = emptyConvo();
  return { v: 1, convos, clock: 0, nextAt: FIRST_AT_MS, seq: 0, muted: false };
}

const newId = (s: MessagesState): string => `m${(s.seq++).toString(36)}`;
const remember = (list: string[], v: string, max = 8): void => { list.push(v); while (list.length > max) list.shift(); };
export const unreadTotal = (s: MessagesState): number => CONTACT_IDS.reduce((n, id) => n + s.convos[id].unread, 0);

function push(c: Convo, m: Msg): void { c.msgs.push(m); while (c.msgs.length > MAX_MSGS) c.msgs.shift(); }

// ------------------------------------------------------------------ intention d'un message de Radia
const fold = (t: string): string => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function intentOf(text: string): Intent {
  const t = fold(text).trim();
  for (const [intent, re] of INTENT_RULES) if (re.test(t)) return intent;
  return 'generic';
}

// ------------------------------------------------------------------ messages spontanés
function bank(id: ContactId, styleOf: StyleOf): readonly Line[] {
  switch (id) {
    case 'auguste': return AUGUSTE_SPONTANEOUS;
    case 'maman': return MAMAN_SPONTANEOUS;
    case 'agency': return AGENCY_SPONTANEOUS;
    default: return KID_SPONTANEOUS[styleOf(id)];
  }
}
function pickLine(rng: RngLike, pool: readonly Line[], c: Convo): Line {
  // jamais le même texte récemment, jamais deux fois le même thème d'affilée (si on a le choix)
  const fresh = pool.filter((l) => !c.recent.includes(l.text) && l.cat !== c.lastCat);
  const alt = pool.filter((l) => !c.recent.includes(l.text));
  const from = fresh.length ? fresh : alt.length ? alt : pool.filter((l) => l.text !== c.recent[c.recent.length - 1]);
  const list = from.length ? from : pool;
  return list[rng.int(list.length)];
}

export interface Incoming { contactId: ContactId; msg: Msg }
/** Produit un message spontané (ou null s'il ne faut rien envoyer : trop de non lus, etc.). */
export function produce(s: MessagesState, now: number, rng: RngLike, styleOf: StyleOf): Incoming | null {
  if (unreadTotal(s) >= MAX_UNREAD_TOTAL) return null;
  const pool = CONTACT_IDS.filter((id) => s.convos[id].unread < MAX_UNREAD_PER);
  if (!pool.length) return null;
  // ceux qui n'ont pas écrit depuis longtemps reviennent un peu plus souvent
  const weights = pool.map((id) => WEIGHTS[id] * (1 + Math.min(3, s.convos[id].lastIn ? (now - s.convos[id].lastIn) / 86_400_000 : 2)));
  let r = rng.next() * weights.reduce((a, b) => a + b, 0); let k = 0;
  for (; k < pool.length - 1; k++) { r -= weights[k]; if (r <= 0) break; }
  const id = pool[k]; const c = s.convos[id];
  const line = pickLine(rng, bank(id, styleOf), c);
  const msg: Msg = { id: newId(s), from: 'them', text: line.text, at: now };
  push(c, msg); c.unread++; c.lastIn = now; c.lastCat = line.cat; remember(c.recent, line.text);
  return { contactId: id, msg };
}

/** Temps de jeu ACTIF écoulé : renvoie un message spontané à l'échéance. */
export function advance(s: MessagesState, dtMs: number, now: number, rng: RngLike, styleOf: StyleOf): Incoming | null {
  s.clock += Math.max(0, dtMs);
  if (s.clock < s.nextAt) return null;
  s.nextAt = s.clock + EVERY_MIN_MS + Math.floor(rng.next() * (EVERY_MAX_MS - EVERY_MIN_MS));
  return produce(s, now, rng, styleOf);
}

// ------------------------------------------------------------------ échanges
/** Radia envoie un message. Renvoie null s'il est vide. Le message est « Distribué » tout de suite (simulé). */
export function send(s: MessagesState, id: ContactId, text: string, now: number, photo?: string): Msg | null {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!t && !photo) return null;
  const m: Msg = { id: newId(s), from: 'me', text: t, at: now, ...(photo ? { photo: photo.slice(0, 40) } : {}) };
  push(s.convos[id], m);
  return m;
}
export function markRead(s: MessagesState, id: ContactId): void { s.convos[id].unread = 0; }

export interface ReplyPlan { readAfterMs: number; typingMs: number; text: string; reaction: ReactionId | null }
/** Prévoit comment le personnage réagit à un message de Radia : quand il le « lit », combien de temps il « écrit », sa réponse. */
export function planReply(id: ContactId, myText: string, rng: RngLike, styleOf: StyleOf, c?: Convo): ReplyPlan {
  const intent = intentOf(myText);
  let text: string;
  if (id === 'auguste') text = pick(rng, AUGUSTE_REPLIES[intent], c);
  else if (id === 'maman') text = pick(rng, MAMAN_REPLIES, c);
  else if (id === 'agency') text = pick(rng, AGENCY_REPLIES, c);
  else text = pick(rng, KID_REPLIES[styleOf(id)], c);
  const quick = id === 'auguste';
  const reaction: ReactionId | null = rng.next() < (intent === 'love' ? 0.7 : intent === 'laugh' ? 0.5 : 0.18) ? (intent === 'laugh' ? 'laugh' : intent === 'love' ? 'heart' : 'like') : null;
  return { readAfterMs: (quick ? 400 : 900) + rng.int(quick ? 900 : 1800), typingMs: 900 + rng.int(1500) + Math.min(1200, text.length * 12), text, reaction };
}
function pick(rng: RngLike, pool: readonly string[], c?: Convo): string {
  const recent = c?.recent ?? [];
  const fresh = pool.filter((p) => !recent.includes(p));
  const list = fresh.length ? fresh : pool.filter((p) => p !== recent[recent.length - 1]);
  const from = list.length ? list : pool;
  return from[rng.int(from.length)];
}
export function applyRead(s: MessagesState, id: ContactId, msgId: string, now: number): void {
  const m = s.convos[id].msgs.find((x) => x.id === msgId && x.from === 'me');
  if (m && !m.readAt) m.readAt = now;
}
export function applyReply(s: MessagesState, id: ContactId, text: string, now: number): Msg {
  const c = s.convos[id];
  const m: Msg = { id: newId(s), from: 'them', text, at: now };
  push(c, m); c.lastIn = now; remember(c.recent, text);
  return m;
}
export function theirReaction(s: MessagesState, id: ContactId, msgId: string, r: ReactionId): void {
  const m = s.convos[id].msgs.find((x) => x.id === msgId && x.from === 'me');
  if (m) m.reaction = r;
}
/** Radia (ré)agit à un message reçu : même réaction = on la retire. Renvoie la réaction finale. */
export function react(s: MessagesState, id: ContactId, msgId: string, r: ReactionId): ReactionId | null {
  const m = s.convos[id].msgs.find((x) => x.id === msgId && x.from === 'them');
  if (!m) return null;
  if (m.myReaction === r) { delete m.myReaction; return null; }
  m.myReaction = r; return r;
}

/** Statut sous mon DERNIER message envoyé : « Distribué » ou « Lu 14:35 » (simulés). */
export function lastSentStatus(c: Convo, time: (ms: number) => string): { msgId: string; label: string } | null {
  for (let i = c.msgs.length - 1; i >= 0; i--) {
    const m = c.msgs[i];
    if (m.from === 'me') return { msgId: m.id, label: m.readAt ? `Lu ${time(m.readAt)}` : 'Distribué' };
  }
  return null;
}

// ------------------------------------------------------------------ sauvegarde
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number, lo = 0, hi = 1e15): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.slice(0, max) : '');
export function sanitizeMessages(raw: unknown): MessagesState {
  const d = defaultMessages();
  if (!isObj(raw)) return d;
  d.clock = Math.floor(num(raw.clock, 0)); d.nextAt = Math.floor(num(raw.nextAt, d.nextAt)); d.seq = Math.floor(num(raw.seq, 0, 0, 1e9)); d.muted = raw.muted === true;
  if (isObj(raw.convos)) for (const id of CONTACT_IDS) {
    const r = raw.convos[id]; if (!isObj(r)) continue;
    const c = d.convos[id];
    c.unread = Math.floor(num(r.unread, 0, 0, 99)); c.lastIn = num(r.lastIn, 0);
    c.recent = (Array.isArray(r.recent) ? r.recent : []).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 200)).slice(-8);
    c.lastCat = str(r.lastCat, 24);
    if (Array.isArray(r.msgs)) c.msgs = r.msgs.filter(isObj).slice(-MAX_MSGS).map((m): Msg => ({
      id: str(m.id, 12).replace(/[^a-z0-9]/g, '') || 'm0', from: m.from === 'me' ? 'me' : 'them', text: str(m.text), at: num(m.at, 0),
      ...(isReaction(m.reaction) ? { reaction: m.reaction } : {}), ...(isReaction(m.myReaction) ? { myReaction: m.myReaction } : {}),
      ...(typeof m.readAt === 'number' && Number.isFinite(m.readAt) ? { readAt: m.readAt } : {}),
      ...(typeof m.photo === 'string' && m.photo ? { photo: m.photo.slice(0, 40) } : {}),
    }));
  }
  return d;
}
export { isContactId };
