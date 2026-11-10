/**
 * Snapchien — moteur PUR des conversations : messages spontanés des garçons, snaps (rouges = photo non ouverte, violets = vidéo),
 * ouverture, réponses de Radia, flammes. Aucune dépendance au DOM (testé dans tests/snap-chat.test.ts).
 *
 * Flammes : elles progressent UNIQUEMENT quand Radia ET le contact ont chacun envoyé au moins un SNAP le même jour (les messages
 * texte ne comptent pas), pendant des jours consécutifs ; une journée manquée remet la série à zéro. Aucune notification ne pousse
 * à entretenir une série ; rien n'est payant.
 */
import { CONTACTS, ANSWERS, BARE_SCENES, GENERIC_CAPTIONS, REPLIES, SNAP_BACK, contactById, type ChatContact, type SceneId } from './data';
import { SNAP_WITH, choiceById } from '../../brain/banks';
import { canSpeak, noteHisSnap, offer, react, start as brainStart } from '../../brain/engine';
import { memOf } from '../../brain/memory';
import { personaById } from '../../brain/personas';
import type { BrainState } from '../../brain/types';

export interface RngLike { next(): number; int(n: number): number }

export type MsgKind = 'text' | 'snap' | 'video';
export interface ChatMsg {
  id: string; from: 'in' | 'out'; kind: MsgKind; text: string; scene?: SceneId; opened?: boolean; at: number;
  /** Message de Radia : reçu / ouvert par le contact (instants SIMULÉS) ; capture d'écran (si le contact en fait une). */
  recvAt?: number; openAt?: number; shotAt?: number;
  /** Selfie fictif de Radia (sourire, tenue, grimace) ; message système « capture d'écran » ; demande de photo faite par lui. */
  pick?: 'ph_smile' | 'ph_outfit' | 'ph_funny'; sys?: 'shot'; ask?: boolean;
}
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
  /** Stories d'amis déjà regardées : identifiant du contact → jour (AAAA-MM-JJ) de la dernière story vue. */
  storiesSeen: Record<string, string>;
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
  return { v: 1, contacts, clock: 0, nextAt: 75_000, seq: 0, muted: false, joinAt: JOIN_EVERY_MS, storiesSeen: {} };
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

export interface Incoming { contactId: string; msg: ChatMsg; joined?: boolean; /** messages suivants du même contact (écrits à la suite, quelques secondes plus tard) */ extra?: ChatMsg[] }

/** Produit un message ou un snap spontané d'un garçon (ou l'arrivée d'un nouveau contact). Renvoie null si rien ne doit arriver. */
export function produce(s: ChatState, now: number, rng: RngLike, brain?: BrainState): Incoming | null {
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
  const hour = new Date(now).getHours();
  // rythme propre à chacun : plage horaire préférée et délai minimal depuis son dernier mot (les contacts ne s'écrivent jamais tous en même temps)
  const pool = activeContacts(s).filter((c) => s.contacts[c.id].unread < MAX_UNREAD_PER_CONTACT && (!brain || canSpeak(brain, c.id, now, hour, rng)));
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
    const caps = c.captions[scene] ?? GENERIC_CAPTIONS[scene] ?? ['Un petit snap.'];
    const text = pickFresh(rng, caps, st.recent);
    remember(st.recent, text);
    msg = { id: newId(s), from: 'in', kind: rng.next() < 0.2 ? 'video' : 'snap', text, scene, opened: false, at: now };
    st.flame.theirs = dayKey(now); updateFlame(st.flame, st.flame.theirs);
    if (brain) {
      noteHisSnap(brain, c.id, scene, now); const bm = memOf(brain, c.id); bm.talkedAt = now; bm.turns++;
      push(st, msg); st.unread++; st.lastIn = now;
      const extra: ChatMsg[] = [];
      if (rng.next() < 0.35) { const w: ChatMsg = { id: newId(s), from: 'in', kind: 'text', text: pickFresh(rng, SNAP_WITH, st.recent), at: now + 2200 }; remember(st.recent, w.text); push(st, w); extra.push(w); }
      return { contactId: c.id, msg, ...(extra.length ? { extra } : {}) };
    }
  } else if (brain) {
    // texte : le cerveau choisit selon la personnalité, la mémoire de Radia et les règles (jamais d'insistance)
    const beat = brainStart(brain, c.id, rng, { now, hour, channel: 'snap', canSnap: true, flameAtRisk: flameAtRisk(st, now) });
    if (!beat || !beat.say.length) return null;
    const msgs = beat.say.map((text, i): ChatMsg => ({ id: newId(s), from: 'in', kind: 'text', text, at: now + i * 1600, ...(beat.wantsPhoto && i === beat.say.length - 1 ? { ask: true } : {}) }));
    for (const m of msgs) push(st, m); st.unread++; st.lastIn = now;
    return { contactId: c.id, msg: msgs[0], ...(msgs.length > 1 ? { extra: msgs.slice(1) } : {}) };
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
export function advance(s: ChatState, activeMs: number, now: number, rng: RngLike, brain?: BrainState): Incoming | null {
  s.clock += Math.max(0, Math.min(activeMs, 60_000));
  refreshFlames(s, now);
  if (s.clock < s.nextAt) return null;
  s.nextAt = s.clock + 4 * 60_000 + rng.int(5 * 60_000); // prochaine arrivée dans 4 à 9 minutes de jeu
  return produce(s, now, rng, brain);
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
export function rowStatus(c: ContactState, now?: number): { status: RowStatus; at: number } {
  const vis = now === undefined ? c.msgs : visibleMsgs(c, now).filter((m) => m.sys !== 'shot');
  const last = vis[vis.length - 1];
  if (!last) return { status: 'empty', at: 0 };
  if (last.from === 'in') {
    if (last.kind === 'snap' && !last.opened) return { status: 'snap-red', at: last.at };
    if (last.kind === 'video' && !last.opened) return { status: 'video', at: last.at };
    if (last.kind === 'text' && !last.opened) return { status: 'text-new', at: last.at };
    return { status: 'opened', at: last.at };
  }
  return { status: 'sent', at: last.at };
}

// ------------------------------------------------------------------ stories d'amis (une illustration par jour, jamais d'obligation)
export interface FriendStory { cid: string; scene: SceneId; caption: string; seen: boolean }
const h32 = (t: string): number => { let h = 2166136261 >>> 0; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
/** Stories du jour : déterministes (mêmes amis, même jour → mêmes stories), environ deux amis sur trois en publient une. */
export function friendStories(s: ChatState, today: string): FriendStory[] {
  const out: FriendStory[] = [];
  for (const c of CONTACTS) {
    const st = s.contacts[c.id];
    if (!st || !st.added || st.deleted) continue;
    const hh = h32(`${c.id}|${today}`);
    if (hh % 3 === 0) continue;
    const scene = c.scenes[hh % c.scenes.length];
    const caps = c.captions[scene] ?? [];
    out.push({ cid: c.id, scene, caption: caps.length ? caps[(hh >>> 4) % caps.length] : 'Petit coucou du jour ♡', seen: s.storiesSeen[c.id] === today });
  }
  return out.sort((a, b) => Number(a.seen) - Number(b.seen));
}
export function markStorySeen(s: ChatState, cid: string, today: string): void { if (contactById(cid)) s.storiesSeen[cid] = today; }
export const unseenStories = (s: ChatState, today: string): number => friendStories(s, today).filter((x) => !x.seen).length;
/** Contacts que Radia peut ajouter à la main (pas encore là, jamais supprimés). */
export const suggestions = (s: ChatState): ChatContact[] => CONTACTS.filter((c) => !s.contacts[c.id].added && !s.contacts[c.id].deleted);
export function addFriend(s: ChatState, cid: string, now: number): boolean {
  const st = s.contacts[cid]; if (!st || st.added || st.deleted) return false;
  st.added = true; st.lastIn = st.lastIn || now;
  return true;
}
export const unopenedSnapCount = (s: ChatState): number => CONTACTS.reduce((n, c) => n + s.contacts[c.id].msgs.filter((m) => m.from === 'in' && m.kind !== 'text' && !m.opened).length, 0);


// ------------------------------------------------------------------ flamme en danger, messages visibles, états « Envoyé / Reçu / Ouvert »
/** Une série d'au moins 2 jours risque de s'arrêter ce soir : Radia n'a pas encore envoyé de snap aujourd'hui. */
export function flameAtRisk(c: ContactState, now: number): boolean {
  const today = dayKey(now); const f = c.flame;
  return f.n >= 2 && f.day === prevDay(today) && f.mine !== today && new Date(now).getHours() >= 16;
}
/** Messages déjà « arrivés » (les réponses sont échelonnées de quelques secondes : elles n'apparaissent pas toutes d'un coup). */
export const visibleMsgs = (c: ContactState, now: number): ChatMsg[] => c.msgs.filter((m) => m.at <= now && (m.sys !== 'shot' || (m.shotAt ?? m.at) <= now));
export type DeliveryState = 'sent' | 'received' | 'opened';
/** État d'un message de Radia dans la simulation : envoyé → reçu → ouvert. */
export function deliveryOf(m: ChatMsg, now: number): DeliveryState {
  if (m.openAt !== undefined && now >= m.openAt) return 'opened';
  if (m.recvAt !== undefined && now >= m.recvAt) return 'received';
  return m.recvAt === undefined && m.openAt === undefined ? 'opened' : 'sent'; // anciens messages (sans horaires) : considérés ouverts
}
export const DELIVERY_LABEL: Record<DeliveryState, string> = { sent: 'Envoyé', received: 'Reçu', opened: 'Ouvert' };

// ------------------------------------------------------------------ présence (avatar du contact dans la conversation)
export type PresenceState = 'away' | 'here' | 'typing' | 'lingering';
export interface Presence { state: PresenceState; mood: import('../../../events/tindeur/swipe/types').Mood; label: string }
const h32b = (t: string): number => { let h = 2166136261 >>> 0; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
type MoodT = import('../../../events/tindeur/swipe/types').Mood;
const MOODS: Record<string, MoodT[]> = { joker: ['grin', 'tongue', 'wink', 'smile'], badjoker: ['grin', 'tongue', 'proud'], flirt: ['wink', 'smirk', 'smile', 'grin'], sporty: ['proud', 'grin', 'smirk', 'smile'],
  serious: ['calm', 'smile', 'proud'], shy: ['shy', 'smile', 'calm'], gentle: ['smile', 'shy', 'calm'], chill: ['calm', 'smirk', 'smile'], skeptic: ['smirk', 'calm', 'surprised'] };
/** Expression de l'avatar : propre au caractère, et adaptée à ce dont on vient de parler (surpris par la famille, clin d'œil après un selfie, langue tirée après une blague). */
export function moodOf(cid: string, lastId: string, brain?: BrainState): MoodT {
  const p = personaById(cid); const palette = MOODS[p?.arch ?? 'chill'];
  if (brain) {
    const m = memOf(brain, cid);
    if (m.lastTopic === 'kids') return p?.kids === 'surprised' || p?.kids === 'hesitant' ? 'surprised' : p?.kids === 'funny' ? 'grin' : 'smile';
    if (m.lastTopic === 'photo') return 'wink'; if (m.lastTopic === 'joke') return 'tongue'; if (m.lastTopic === 'friend') return p?.friend === 'cheeky' ? 'smirk' : 'smile';
  }
  return palette[h32b(`${cid}|${lastId}`) % palette.length];
}
/** Pseudo-hasard stable : est-il « dans l'appli » en ce moment (par tranches de 10 minutes, selon ses heures préférées) ? */
export function isOnline(cid: string, now: number): boolean {
  const p = personaById(cid); if (!p) return false;
  const hour = new Date(now).getHours(); const w = (p.hours === 'night' ? (hour >= 19 || hour < 2) : p.hours === 'morning' ? (hour >= 6 && hour < 11) : (hour >= 10 && hour < 19)) ? 0.55 : 0.12;
  return (h32b(`${cid}|${Math.floor(now / 600_000)}`) % 1000) / 1000 < w;
}
export function presenceOf(s: ChatState, cid: string, now: number, brain?: BrainState): Presence {
  const c = s.contacts[cid]; const ct = contactById(cid);
  const last = c?.msgs[c.msgs.length - 1];
  const mood = moodOf(cid, last?.id ?? 'x', brain);
  if (!c || !ct) return { state: 'away', mood, label: '' };
  if (c.msgs.some((m) => m.from === 'in' && m.at > now && m.at - now < 4000 && m.sys !== 'shot')) return { state: 'typing', mood, label: 'écrit…' };
  const lastOut = [...c.msgs].reverse().find((m) => m.from === 'out');
  if (lastOut?.openAt !== undefined && now >= lastOut.openAt && now < lastOut.openAt + 7000 && !c.msgs.some((m) => m.from === 'in' && m.at > lastOut.openAt!)) return { state: 'lingering', mood, label: `${ct.name} consulte la conversation` };
  const lastIn = [...c.msgs].reverse().find((m) => m.from === 'in' && m.sys !== 'shot' && m.at <= now);
  if (lastIn && now - lastIn.at < 45_000) return { state: 'here', mood, label: `${ct.name} est là` };
  if (isOnline(cid, now)) return { state: 'here', mood, label: `${ct.name} est en ligne` };
  return { state: 'away', mood, label: '' };
}

// ------------------------------------------------------------------ conversation pilotée par le cerveau
const SHOT_LINES = ['Oups, j\'ai fait une capture d\'écran, pardon 😅 elle était trop belle.', 'Je t\'avoue, j\'ai fait une capture. Je ne la montre à personne, promis.', 'Capture d\'écran faite, je préviens pour être honnête 😇', 'Bon, j\'ai fait une capture d\'écran. Je te dois une explication : j\'adore.'];
export interface Conversation { mine: ChatMsg; theirs: ChatMsg[]; viewedOnly: boolean; snapBack: boolean; beatTopic: string }
const LEGACY_IDS = ['dors', 'pourquoi', 'quoi', 'carrement', 'dormir', 'nuit', 'vu', 'tshirt'];

/** Radia choisit une réponse : le contact y répond selon sa personnalité et sa mémoire (plusieurs bulles, parfois un snap en retour). */
export function converse(s: ChatState, brain: BrainState, contactId: string, choiceId: string, now: number, rng: RngLike): Conversation | null {
  const ct = contactById(contactId); const c = s.contacts[contactId];
  if (!ct || !c || !c.added || c.deleted) return null;
  const def = choiceById(choiceId); const legacy = REPLIES.find((r) => r.id === choiceId);
  if (!def && !legacy) return null;
  const isSelfie = choiceId === 'ph_smile' || choiceId === 'ph_outfit' || choiceId === 'ph_funny';
  const text = def ? def.text : legacy!.text;
  const style = ct.style;
  const beat = react(brain, contactId, choiceId, rng, { now, legacy: (id) => (LEGACY_IDS.includes(id) ? (ANSWERS[style][id] ?? ANSWERS[style].vu) : null) });
  if (!beat) return null;
  const mine: ChatMsg = { id: newId(s), from: 'out', kind: isSelfie ? 'snap' : 'text', text: isSelfie ? ({ ph_smile: 'Mon sourire du jour', ph_outfit: 'Ma tenue du jour', ph_funny: 'Ma plus belle grimace' } as Record<string, string>)[choiceId] : text, at: now, recvAt: now + 900 + rng.int(900), ...(isSelfie ? { pick: choiceId as ChatMsg['pick'], opened: false } : {}) };
  // il « consulte sans répondre » parfois quand elle ferme la conversation (bonne nuit, vu) ou fait la mystérieuse : on le voit, sans réponse tout de suite
  const viewedOnly = (choiceId === 'nuit' || choiceId === 'vu' || choiceId === 'ph_tease') && rng.next() < 0.45;
  const delay = viewedOnly ? 1200 : 900;
  mine.openAt = (mine.recvAt as number) + delay - 300 + (isSelfie ? 3000 + rng.int(6000) : 0); // ouvert APRÈS avoir été reçu
  push(c, mine); c.lastOut = now;
  const theirs: ChatMsg[] = [];
  if (!viewedOnly) {
    const base = mine.openAt + 400;
    beat.say.forEach((t, i) => theirs.push({ id: newId(s), from: 'in', kind: 'text', text: t, opened: true, at: base + i * 1700, ...(beat.topic === 'photo' && beat.wantsPhoto && i === beat.say.length - 1 && !isSelfie ? { ask: true } : {}) }));
  }
  // capture d'écran : seulement quand il a vraiment de quoi en faire (un selfie de Radia), de façon rare ; il en parle franchement
  if (isSelfie && !viewedOnly && rng.next() < 0.1 && theirs.length) {
    mine.shotAt = mine.openAt + 2500;
    const sys: ChatMsg = { id: newId(s), from: 'in', kind: 'text', text: `${ct.name} a fait une capture d'écran`, at: mine.shotAt, shotAt: mine.shotAt, sys: 'shot', opened: true };
    const say: ChatMsg = { id: newId(s), from: 'in', kind: 'text', text: pickFresh(rng, SHOT_LINES, c.recent), at: mine.shotAt + 1600, opened: true };
    remember(c.recent, say.text); theirs.push(sys, say);
  }
  let snapBack = false;
  if (beat.wantsPhoto && !viewedOnly) {
    snapBack = true;
    const scene = ct.scenes.includes('selfie') ? 'selfie' : ct.scenes[0];
    const at = (theirs.length ? theirs[theirs.length - 1].at : now) + 1800;
    const sm: ChatMsg = { id: newId(s), from: 'in', kind: 'snap', text: pickFresh(rng, (ct.captions[scene] ?? GENERIC_CAPTIONS[scene] ?? ['Mon tour : un petit snap.']), c.recent), scene, opened: false, at };
    theirs.push(sm); noteHisSnap(brain, contactId, scene, at); c.unread++; c.flame.theirs = dayKey(now);
  }
  if (isSelfie) { c.flame.mine = dayKey(now); }
  for (const m of theirs) push(c, m);
  if (theirs.length) c.lastIn = theirs[theirs.length - 1].at;
  updateFlame(c.flame, dayKey(now));
  return { mine, theirs, viewedOnly, snapBack, beatTopic: beat.topic };
}

/** Choix proposés à Radia dans la conversation (stables entre deux réponses, mémorisés dans la mémoire du personnage). */
export function choicesFor(s: ChatState, brain: BrainState, cid: string, rng: RngLike, now: number): { id: string; text: string }[] {
  const m = memOf(brain, cid);
  const c = s.contacts[cid];
  const lastIn = c ? [...c.msgs].reverse().find((x) => x.from === 'in' && x.kind !== 'text' && x.opened && x.sys !== 'shot') : undefined;
  // la réponse à un snap qu'il vient d'envoyer : les anciens choix (« t-shirt », « tu voulais montrer quoi »…) restent proposés après un snap ouvert
  const out = (m.offered.length ? m.offered.filter((id) => choiceById(id)).map((id) => ({ id, text: choiceById(id)!.text })) : offer(brain, cid, rng, { channel: 'snap' }));
  void lastIn; void now;
  return out;
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
  if (isObj(raw.storiesSeen)) for (const [k, v] of Object.entries(raw.storiesSeen).slice(0, 40)) if (contactById(k) && typeof v === 'string' && DAY_RE.test(v)) d.storiesSeen[k] = v;
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
      ...(typeof m.recvAt === 'number' ? { recvAt: num(m.recvAt, 0) } : {}), ...(typeof m.openAt === 'number' ? { openAt: num(m.openAt, 0) } : {}), ...(typeof m.shotAt === 'number' ? { shotAt: num(m.shotAt, 0) } : {}),
      ...(m.pick === 'ph_smile' || m.pick === 'ph_outfit' || m.pick === 'ph_funny' ? { pick: m.pick } : {}), ...(m.sys === 'shot' ? { sys: 'shot' as const } : {}), ...(m.ask === true ? { ask: true } : {}),
    }));
  }
  // Sauvegardes antérieures : les contacts de départ (dont Hugo) sont présents, sauf s'ils ont été supprimés par la joueuse.
  for (const id of START_CONTACTS) { const st = d.contacts[id]; if (st && !st.deleted) st.added = true; }
  return d;
}
