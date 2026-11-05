/**
 * Snapchien — moteur PUR des conversations : messages spontanés des garçons, snaps (rouges = photo non ouverte, violets = vidéo),
 * ouverture, réponses de Radia, flammes. Aucune dépendance au DOM (testé dans tests/snap-chat.test.ts).
 *
 * Flammes : elles progressent UNIQUEMENT quand Radia ET le contact ont chacun envoyé au moins un SNAP le même jour (les messages
 * texte ne comptent pas), pendant des jours consécutifs ; une journée manquée remet la série à zéro. Aucune notification ne pousse
 * à entretenir une série ; rien n'est payant.
 */
import { CONTACTS, ANSWERS, BARE_SCENES, REPLIES, SNAP_BACK, contactById, type ChatContact, type SceneId } from './data';

export interface RngLike { next(): number; int(n: number): number }

export type MsgKind = 'text' | 'snap' | 'video';
export interface ChatMsg { id: string; from: 'in' | 'out'; kind: MsgKind; text: string; scene?: SceneId; opened?: boolean; at: number }
export interface Flame { n: number; /** dernier jour où la série a été validée (AAAA-MM-JJ) */ day: string; mine: string; theirs: string }
export interface ContactState {
  added: boolean; deleted: boolean; msgs: ChatMsg[]; unread: number; lastIn: number; lastOut: number;
  /** Derniers textes / scènes proposés (jamais deux fois de suite). */
  recent: string[]; scenes: SceneId[]; flame: Flame;
}
export interface ChatState {
  v: 1; contacts: Record<string, ContactState>;
  /** Temps de jeu actif cumulé (ms) et prochaine échéance de message. */
  clock: number; nextAt: number; seq: number;
  /** Notifications de Snapchien coupées par la joueuse. */
  muted: boolean;
  /** Arrivées du moment (regroupement des notifications). */
  joinAt: number;
}

export const START_CONTACTS = ['dylan', 'maxime', 'kevin', 'thomas', 'hugo'];
const MAX_MSGS = 40;
const MAX_UNREAD_PER_CONTACT = 2;
const MAX_UNREAD_TOTAL = 6;
/** Une nouvelle arrivée de contact toutes les ~18 minutes de jeu actif (les 5 premiers sont là au départ). */
const JOIN_EVERY_MS = 18 * 60_000;

const emptyFlame = (): Flame => ({ n: 0, day: '', mine: '', theirs: '' });
const emptyContact = (added: boolean): ContactState => ({ added, deleted: false, msgs: [], unread: 0, lastIn: 0, lastOut: 0, recent: [], scenes: [], flame: emptyFlame() });

export function defaultChat(): ChatState {
  const contacts: Record<string, ContactState> = {};
  for (const c of CONTACTS) contacts[c.id] = emptyContact(START_CONTACTS.includes(c.id));
  return { v: 1, contacts, clock: 0, nextAt: 75_000, seq: 0, muted: false, joinAt: JOIN_EVERY_MS };
}

// ------------------------------------------------------------------ dates (jours locaux)
const p2 = (n: number) => String(n).padStart(2, '0');
export const dayKey = (ms: number): string => { const d = new Date(ms); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
export const prevDay = (key: string): string => { const [y, m, d] = key.split('-').map(Number); const t = new Date(y, m - 1, d - 1); return `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}`; };
const daysBetween = (a: number, b: number): number => Math.floor((b - a) / 86_400_000);

// ------------------------------------------------------------------ flammes
/** Valide la série du jour si Radia et le contact ont chacun envoyé un snap aujourd'hui. */
export function updateFlame(f: Flame, today: string): void {
  if (f.mine === today && f.theirs === today && f.day !== today) { f.n = f.day === prevDay(today) ? f.n + 1 : 1; f.day = today; }
}
/** Série visible : 0 si elle est interrompue (aucune validation hier ni aujourd'hui). */
export function flameCount(f: Flame, today: string): number { return f.n > 0 && (f.day === today || f.day === prevDay(today)) ? f.n : 0; }
/** Remet à zéro les séries interrompues (sans jamais demander de paiement ni de rappel). */
export function refreshFlames(s: ChatState, now: number): void {
  const today = dayKey(now);
  for (const c of Object.values(s.contacts)) if (c.flame.n > 0 && c.flame.day !== today && c.flame.day !== prevDay(today)) c.flame.n = 0;
}

// ------------------------------------------------------------------ messages
const newId = (s: ChatState): string => `m${(s.seq++).toString(36)}`;
function remember(list: string[], v: string, max = 6): void { list.push(v); while (list.length > max) list.shift(); }
function pickFresh<T extends string>(rng: RngLike, pool: readonly T[], recent: readonly string[]): T {
  const fresh = pool.filter((p) => !recent.includes(p));
  // si tout a déjà servi récemment, on évite au moins de répéter la toute dernière phrase
  const from = fresh.length ? fresh : pool.filter((p) => p !== recent[recent.length - 1]);
  const list = from.length ? from : pool;
  return list[rng.int(list.length)];
}
function push(c: ContactState, m: ChatMsg): void { c.msgs.push(m); while (c.msgs.length > MAX_MSGS) c.msgs.shift(); }

export const unreadTotal = (s: ChatState): number => Object.values(s.contacts).reduce((a, c) => a + (c.added && !c.deleted ? c.unread : 0), 0);
/** Snaps non ouverts (indicateur rouge pour les photos, violet pour les vidéos). */
export const unopenedSnaps = (s: ChatState): number => Object.values(s.contacts).reduce((a, c) => a + (c.added && !c.deleted ? c.msgs.filter((m) => m.from === 'in' && m.kind !== 'text' && !m.opened).length : 0), 0);
export const activeContacts = (s: ChatState): ChatContact[] => CONTACTS.filter((c) => s.contacts[c.id]?.added && !s.contacts[c.id].deleted);

export interface Incoming { contactId: string; msg: ChatMsg; joined?: boolean }

/** Produit un message ou un snap spontané d'un garçon (ou l'arrivée d'un nouveau contact). Renvoie null si rien ne doit arriver. */
export function produce(s: ChatState, now: number, rng: RngLike): Incoming | null {
  // arrivée d'un nouveau contact (jamais s'il a été supprimé : on ne le rétablit pas tout seul)
  if (s.clock >= s.joinAt && unreadTotal(s) < MAX_UNREAD_TOTAL) {
    s.joinAt = s.clock + JOIN_EVERY_MS;
    const waiting = CONTACTS.filter((c) => !s.contacts[c.id].added && !s.contacts[c.id].deleted);
    if (waiting.length) {
      const c = waiting[rng.int(waiting.length)]; const st = s.contacts[c.id];
      st.added = true;
      const msg: ChatMsg = { id: newId(s), from: 'in', kind: 'text', text: 'Ahhh t\'es enfin sur Snapchien !', at: now };
      push(st, msg); st.unread++; st.lastIn = now;
      return { contactId: c.id, msg, joined: true };
    }
  }
  if (unreadTotal(s) >= MAX_UNREAD_TOTAL) return null;
  const pool = activeContacts(s).filter((c) => s.contacts[c.id].unread < MAX_UNREAD_PER_CONTACT);
  if (!pool.length) return null;
  // ceux qui n'ont pas écrit depuis longtemps reviennent plus souvent
  const weights = pool.map((c) => 1 + Math.min(5, s.contacts[c.id].lastIn ? daysBetween(s.contacts[c.id].lastIn, now) : 3));
  let r = rng.next() * weights.reduce((a, b) => a + b, 0); let idx = 0;
  for (; idx < pool.length - 1; idx++) { r -= weights[idx]; if (r <= 0) break; }
  const c = pool[idx]; const st = s.contacts[c.id];
  const wantsSnap = rng.next() < 0.42;
  let msg: ChatMsg;
  if (wantsSnap) {
    const scene = pickFresh(rng, c.scenes, st.scenes);
    remember(st.scenes, scene, 2);
    const caps = c.captions[scene] ?? ['Un petit snap.'];
    const text = pickFresh(rng, caps, st.recent);
    remember(st.recent, text);
    msg = { id: newId(s), from: 'in', kind: rng.next() < 0.2 ? 'video' : 'snap', text, scene, opened: false, at: now };
    st.flame.theirs = dayKey(now); updateFlame(st.flame, st.flame.theirs);
  } else {
    const long = st.lastIn > 0 && daysBetween(st.lastIn, now) >= 3;
    const text = pickFresh(rng, long ? c.relances : c.openers, st.recent);
    remember(st.recent, text);
    msg = { id: newId(s), from: 'in', kind: 'text', text, at: now };
  }
  push(st, msg); st.unread++; st.lastIn = now;
  return { contactId: c.id, msg };
}

/** Fait avancer le temps de jeu ACTIF (ms) et renvoie les messages arrivés. Au plus un message par appel. */
export function advance(s: ChatState, activeMs: number, now: number, rng: RngLike): Incoming | null {
  s.clock += Math.max(0, Math.min(activeMs, 60_000));
  refreshFlames(s, now);
  if (s.clock < s.nextAt) return null;
  s.nextAt = s.clock + 4 * 60_000 + rng.int(5 * 60_000); // prochaine arrivée dans 4 à 9 minutes de jeu
  return produce(s, now, rng);
}

/** Ouvre un snap reçu : statut « Ouvert ». */
export function openSnap(s: ChatState, contactId: string, msgId: string): ChatMsg | null {
  const c = s.contacts[contactId]; const m = c?.msgs.find((x) => x.id === msgId);
  if (!c || !m || m.from !== 'in' || m.kind === 'text') return null;
  if (!m.opened) { m.opened = true; c.unread = Math.max(0, c.unread - 1); }
  return m;
}
/** Lit les messages texte d'un contact (les snaps restent à ouvrir). */
export function readText(s: ChatState, contactId: string): void {
  const c = s.contacts[contactId]; if (!c) return;
  for (const m of c.msgs) if (m.from === 'in' && m.kind === 'text') m.opened = true;
  c.unread = c.msgs.filter((m) => m.from === 'in' && m.kind !== 'text' && !m.opened).length;
}

/** Réponses proposables après un snap (le choix « t-shirt » seulement pour les scènes torse nu). */
export function replyChoices(scene?: SceneId): typeof REPLIES { return REPLIES.filter((r) => !r.bare || (scene && BARE_SCENES.includes(scene))); }

/** Radia répond par un texte ; renvoie le message du contact (selon sa personnalité). */
export function reply(s: ChatState, contactId: string, choiceId: string, now: number, rng: RngLike): { mine: ChatMsg; theirs: ChatMsg } | null {
  const ct = contactById(contactId); const c = s.contacts[contactId]; const choice = REPLIES.find((r) => r.id === choiceId);
  if (!ct || !c || !choice) return null;
  const mine: ChatMsg = { id: newId(s), from: 'out', kind: 'text', text: choice.text, at: now };
  push(c, mine); c.lastOut = now;
  const bank = ANSWERS[ct.style][choice.id] ?? ANSWERS[ct.style].vu;
  const text = pickFresh(rng, bank, c.recent); remember(c.recent, text);
  const theirs: ChatMsg = { id: newId(s), from: 'in', kind: 'text', text, opened: true, at: now + 1000 };
  push(c, theirs); c.lastIn = now + 1000;
  return { mine, theirs };
}

/** Radia envoie un snap : le contact répond par un snap (échange réciproque → les flammes progressent). */
export function sendSnap(s: ChatState, contactId: string, now: number, rng: RngLike, caption = 'Mon snap du jour'): { mine: ChatMsg; theirs: ChatMsg } | null {
  const ct = contactById(contactId); const c = s.contacts[contactId];
  if (!ct || !c || !c.added || c.deleted) return null;
  const mine: ChatMsg = { id: newId(s), from: 'out', kind: 'snap', text: caption, opened: false, at: now };
  push(c, mine); c.lastOut = now; c.flame.mine = dayKey(now);
  const scene = pickFresh(rng, ct.scenes, c.scenes); remember(c.scenes, scene, 2);
  const text = pickFresh(rng, SNAP_BACK[ct.style], c.recent); remember(c.recent, text);
  const theirs: ChatMsg = { id: newId(s), from: 'in', kind: 'snap', text, scene, opened: false, at: now + 1500 };
  push(c, theirs); c.unread++; c.lastIn = now + 1500; c.flame.theirs = dayKey(now); updateFlame(c.flame, dayKey(now));
  return { mine, theirs };
}

/** Supprime un contact : il ne peut plus écrire et n'est jamais rétabli automatiquement ; l'historique reste sauvegardé. */
export function deleteContact(s: ChatState, contactId: string): void { const c = s.contacts[contactId]; if (c) { c.deleted = true; c.added = false; c.unread = 0; } }
export const setMuted = (s: ChatState, muted: boolean): void => { s.muted = muted; };

/** Ligne de la liste : état du dernier échange. */
export type RowStatus = 'snap-red' | 'video' | 'text-new' | 'opened' | 'sent' | 'empty';
export function rowStatus(c: ContactState): { status: RowStatus; at: number } {
  const last = c.msgs[c.msgs.length - 1];
  if (!last) return { status: 'empty', at: 0 };
  if (last.from === 'in') {
    if (last.kind === 'snap' && !last.opened) return { status: 'snap-red', at: last.at };
    if (last.kind === 'video' && !last.opened) return { status: 'video', at: last.at };
    if (last.kind === 'text' && !last.opened) return { status: 'text-new', at: last.at };
    return { status: 'opened', at: last.at };
  }
  return { status: 'sent', at: last.at };
}

// ------------------------------------------------------------------ sauvegarde
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d: number, lo = 0, hi = 1e14): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v: unknown, max = 160): string => (typeof v === 'string' ? v.slice(0, max) : '');
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export function sanitizeChat(raw: unknown): ChatState {
  const d = defaultChat();
  if (!isObj(raw)) return d;
  d.clock = Math.floor(num(raw.clock, 0)); d.nextAt = Math.floor(num(raw.nextAt, d.nextAt)); d.seq = Math.floor(num(raw.seq, 0, 0, 1e9));
  d.joinAt = Math.floor(num(raw.joinAt, d.joinAt)); d.muted = raw.muted === true;
  if (isObj(raw.contacts)) for (const c of CONTACTS) {
    const r = raw.contacts[c.id]; if (!isObj(r)) continue;
    const st = d.contacts[c.id];
    st.added = r.added === true; st.deleted = r.deleted === true; if (st.deleted) st.added = false;
    st.unread = Math.floor(num(r.unread, 0, 0, 99)); st.lastIn = num(r.lastIn, 0); st.lastOut = num(r.lastOut, 0);
    st.recent = (Array.isArray(r.recent) ? r.recent : []).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 160)).slice(-6);
    st.scenes = (Array.isArray(r.scenes) ? r.scenes : []).filter((x): x is SceneId => typeof x === 'string' && c.scenes.includes(x as SceneId)).slice(-2);
    if (isObj(r.flame)) st.flame = { n: Math.floor(num(r.flame.n, 0, 0, 9999)), day: DAY_RE.test(str(r.flame.day)) ? str(r.flame.day) : '', mine: DAY_RE.test(str(r.flame.mine)) ? str(r.flame.mine) : '', theirs: DAY_RE.test(str(r.flame.theirs)) ? str(r.flame.theirs) : '' };
    if (Array.isArray(r.msgs)) st.msgs = r.msgs.filter(isObj).slice(-MAX_MSGS).map((m): ChatMsg => ({
      id: str(m.id, 12).replace(/[^a-z0-9]/g, '') || 'm0', from: m.from === 'out' ? 'out' : 'in', kind: m.kind === 'snap' || m.kind === 'video' ? m.kind : 'text', text: str(m.text),
      ...(typeof m.scene === 'string' && c.scenes.includes(m.scene as SceneId) ? { scene: m.scene as SceneId } : {}), opened: m.opened === true, at: num(m.at, 0),
    }));
  }
  // Sauvegardes antérieures : les contacts de départ (dont Hugo) sont présents, sauf s'ils ont été supprimés par la joueuse.
  for (const id of START_CONTACTS) { const st = d.contacts[id]; if (st && !st.deleted) st.added = true; }
  return d;
}
