/**
 * Moteur de conversation : à chaque tour, le personnage CHOISIT quoi dire selon sa personnalité, sa mémoire de Radia et ses règles
 * (prénom avec parcimonie, famille découverte seulement quand Radia la partage, débat sur l'amitié, demandes de photo légères et jamais
 * insistantes, relances espacées, éloignement). Pur et déterministe pour un `rng` donné : testé dans tests/brain-engine.test.ts.
 */
import { CHOICES, FADE, FLAME_NUDGE, FRIEND_CALLBACK, FRIEND_CLEAR, FRIEND_CLOSE, FRIEND_ROUND, FRIEND_Q, FRIEND_STEPBACK, HUGO_AUGUSTE, HUGO_AUGUSTE_REACT, JOKE_LEAD, KIDS_AFTER, KIDS_CALLBACK,
  KIDS_FOLLOW, KIDS_HEURT, KIDS_REFUSED, KIDS_SOME, KIDS_THANKS, NAME_LINES, NAME_REACT, PHOTO_ASK, PHOTO_COMPLIMENT_CALLBACK, PHOTO_FIRST, PHOTO_GOT, PHOTO_LATER, PHOTO_REFUSED,
  PHOTO_RELANCE, PHOTO_TEASE, REACT, RELANCE, SINGLE_ASK, SINGLE_REACT, SMALLTALK, SNAP_ANSWER, SNAP_ASK_TEXT, ASK_KIDS_OPEN, choiceById, voiceOf, type VBank } from './banks';
import { memOf } from './memory';
import { personaById } from './personas';
import type { Beat, BrainState, CharMem, Choice, Persona, RngLike, TopicId } from './types';

const DAY = 86_400_000;
export const RADIA = 'Radia';
const fill = (s: string): string => s.replace(/\{n\}/g, RADIA);

function pickFrom<T>(rng: RngLike, a: readonly T[]): T { return a[rng.int(a.length)]; }
/** Une réplique qu'il n'a pas dite récemment (14 dernières) ; si tout a servi, la plus ancienne revient. */
const CONNECT = ['Comme je te disais, ', 'Je te le redis : ', 'Oui, encore une fois : ', 'Je le répète volontiers : '];
function fresh(rng: RngLike, m: CharMem, pool0: readonly string[]): string {
  const pool = m.turns - m.lastNameTurn < 4 ? (pool0.filter((l) => !/Radia|\{n\}/.test(l)).length ? pool0.filter((l) => !/Radia|\{n\}/.test(l)) : pool0) : pool0; // pause du prénom
  if (pool.length === 1 && m.recent.includes(pool[0])) {
    // une seule formulation déjà dite : on la reprend avec une petite transition, jamais mot pour mot deux fois de suite
    const t = pickFrom(rng, CONNECT) + pool[0].charAt(0).toLowerCase() + pool[0].slice(1);
    m.recent.push(t); while (m.recent.length > 14) m.recent.shift(); return t;
  }
  const f = pool.filter((p) => !m.recent.includes(p));
  const s = f.length ? pickFrom(rng, f) : pool.filter((p) => p !== m.recent[m.recent.length - 1]).length ? pickFrom(rng, pool.filter((p) => p !== m.recent[m.recent.length - 1])) : pool[0];
  m.recent.push(s); while (m.recent.length > 14) m.recent.shift();
  return s;
}
const bank = (rng: RngLike, m: CharMem, p: Persona, b: VBank): string => fresh(rng, m, b[voiceOf(p.arch)]);
const choice = (id: string): Choice => ({ id, text: choiceById(id)!.text });
const bumpTopic = (m: CharMem, t: TopicId): void => { m.topics[t] = (m.topics[t] ?? 0) + 1; m.lastTopic = t; };

// ------------------------------------------------------------------ prénom
/** Le prénom est utilisé avec parcimonie : jamais deux tours de suite, au plus un tour sur quatre en moyenne, jamais juste après « arrête ». */
export function nameChance(p: Persona, m: CharMem): number {
  if (p.nameplay === 0 || m.turns - m.lastNameTurn < 4) return 0;
  return [0, 0.08, 0.16, 0.26][p.nameplay];
}
function nameLine(rng: RngLike, m: CharMem, p: Persona): string {
  const lvl = p.nameplay >= 3 ? (rng.next() < 0.5 ? 'tease' : 'flirt') : p.nameplay === 2 ? (rng.next() < 0.6 ? 'tease' : 'light') : 'light';
  const pool = [...NAME_LINES[lvl].map(fill), fill(p.nameLine)];
  return fresh(rng, m, pool);
}
const hasName = (l: string): boolean => /Radia|\{n\}/.test(l);
/** Pendant la pause du prénom, on évite les répliques écrites avec « Radia » (si d'autres existent). */
function noName(m: CharMem, pool: readonly string[]): readonly string[] {
  if (m.turns - m.lastNameTurn >= 4) return pool;
  const f = pool.filter((l) => !hasName(l)); return f.length ? f : pool;
}
/** Toute réplique qui contient le prénom compte dans la parcimonie, qu'elle vienne du modèle commun ou de son propre texte. */
function trackName(m: CharMem, say: string[]): void { if (say.some(hasName)) { m.nameUses++; m.lastNameTurn = m.turns; } }
function maybeName(rng: RngLike, m: CharMem, p: Persona, say: string[]): boolean {
  if (say.some(hasName) || rng.next() >= nameChance(p, m)) return false;
  say.push(nameLine(rng, m, p)); m.nameUses++; m.lastNameTurn = m.turns;
  return true;
}

// ------------------------------------------------------------------ choix proposés à Radia
const BANTER = ['lol', 'jure', 'raconte', 'tease', 'same', 'day'];
function pickSome(rng: RngLike, ids: string[], n: number): string[] { const a = ids.slice(); const out: string[] = []; while (out.length < n && a.length) out.push(a.splice(rng.int(a.length), 1)[0]); return out; }

/** Réponses proposées à Radia après la réplique d'un homme. Le contexte (fil en cours) décide ; sinon un petit mélange varié. */
export function offer(b: BrainState, id: string, rng: RngLike, opts: { channel?: 'snap' | 'tindeur'; canSnap?: boolean } = {}): Choice[] {
  const m = memOf(b, id); const p = personaById(id); const t = m.thread;
  let ids: string[] = [];
  if (t?.topic === 'joke') ids = ['nul', 'bravo', 'lol'];
  else if (t?.topic === 'name') ids = pickSome(rng, ['nul', 'bravo', 'stopname', 'lol'], 3);
  else if (t?.topic === 'photo') {
    ids = ['ph_smile', 'ph_outfit', 'ph_funny', 'ph_later', 'ph_no'];
    if (p && p.bold >= 2) ids.splice(3, 0, 'ph_first');
    if (ids.length > 5) ids.length = 5;
  } else if (t?.topic === 'kids') {
    const tone = p?.kids;
    ids = tone === 'hesitant' || (t.data === 'hurt') ? ['kid_ok', 'kid_hurt'] : ['kid_time', 'kid_proud', 'kid_joke'];
    if (t.data === 'ask') ids = ['kids_all', 'kids_some', 'kids_no'];
  } else if (t?.topic === 'friend') {
    ids = t.data === 'ask' ? ['friends_only', 'friends_unsure'] : pickSome(rng, ['fr_yes', 'fr_no', 'fr_him', 'fr_joke', 'fr_open', 'fr_why'], 3).concat(m.facts.friends === 1 ? ['fr_clear'] : []);
  } else if (t?.topic === 'single') ids = ['sg_yes', 'sg_complex', 'sg_none', 'sg_single'];
  else {
    ids = pickSome(rng, BANTER, 2);
    if (m.facts.kids === 0 && m.turns >= 2 && rng.next() < 0.5) ids.push('kids_all');
    else if (m.facts.friends === 0 && m.turns >= 3 && rng.next() < 0.5) ids.push('friends_only');
    const recentSnap = m.photo.his.length ? m.photo.his[m.photo.his.length - 1] : null;
    if (opts.canSnap !== false && recentSnap && ids.length < 4) ids.push('sf_ask');
  }
  if (m.thread === null && ids.length < 3) ids.push(pickSome(rng, BANTER.filter((x) => !ids.includes(x)), 1)[0]);
  m.offered = ids;
  return ids.filter((x) => choiceById(x)).map(choice);
}

const closeThread = (m: CharMem): void => { m.thread = null; };

// ------------------------------------------------------------------ réaction à un choix de Radia
export interface ReactCtx { now: number; legacy?: (id: string) => string[] | null; sceneLabel?: string }
export function react(b: BrainState, id: string, choiceId: string, rng: RngLike, ctx: ReactCtx): Beat | null {
  const p = personaById(id); const def = choiceById(choiceId);
  if (!p) return null;
  const m = memOf(b, id);
  const say: string[] = []; let topic: TopicId = 'banter'; let wantsPhoto = false;
  m.turns++; m.talkedAt = ctx.now;
  if (m.faded && !def) { /* choix hérités (snap) : on rouvre la porte */ }
  if (m.faded) { m.faded = false; m.aff = Math.max(m.aff, 0); say.push(fresh(rng, m, ['Tiens, tu es revenue ! Ça me fait plaisir.', 'Ça fait plaisir de te relire.'])); }
  const legacy = !def ? ctx.legacy?.(choiceId) : null;
  if (!def && !legacy) return null;
  if (legacy) { say.push(fresh(rng, m, legacy)); m.aff += 0.25; closeThread(m); }
  else switch (choiceId) {
    case 'lol': case 'jure': case 'tease': case 'same': case 'day': {
      say.push(bank(rng, m, p, REACT[choiceId])); m.aff += 0.4; closeThread(m);
      if (choiceId === 'same' && rng.next() < 0.4) say.push(fresh(rng, m, ['Attends raconte, depuis quand ?', 'Mais t\'es grave toi 😭', 'Bon, je crois que je viens de me griller.']));
      break;
    }
    case 'raconte': {
      say.push(bank(rng, m, p, REACT.raconte));
      const un = p.anecdotes.filter((a) => !m.told.includes(a)); const a = un.length ? fresh(rng, m, un) : fresh(rng, m, p.anecdotes);
      say.push(a); m.told.push(a); while (m.told.length > 12) m.told.shift(); topic = 'anecdote'; m.aff += 0.5; closeThread(m);
      break;
    }
    case 'sf_ask': {
      const last = m.photo.his[m.photo.his.length - 1];
      const sc = last?.scene ?? 'selfie';
      const pool = SNAP_ANSWER[sc] ?? SNAP_ANSWER.selfie;
      say.push(fresh(rng, m, pool)); topic = 'snapfollow'; m.aff += 0.6; closeThread(m);
      break;
    }
    case 'nul': {
      const t = m.thread;
      if (t?.topic === 'joke' && t.data !== undefined) { const j = p.jokes[Number(t.data)]; if (j) say.push(j.recover); else say.push(bank(rng, m, p, NAME_REACT.nul)); }
      else say.push(bank(rng, m, p, NAME_REACT.nul));
      m.bad++; m.aff += 0.3; topic = 'joke'; closeThread(m); break;
    }
    case 'bravo': say.push(bank(rng, m, p, NAME_REACT.bravo)); m.aff += 0.7; closeThread(m); break;
    case 'stopname': say.push(bank(rng, m, p, NAME_REACT.stopname)); m.lastNameTurn = m.turns + 10; closeThread(m); break;

    case 'kids_all': case 'kids_some': {
      m.facts.kids = choiceId === 'kids_all' ? 2 : 1; if (!m.memories.includes('kids')) m.memories.push('kids'); topic = 'kids';
      if (choiceId === 'kids_all') { say.push(...p.kidsLine); } else { say.push(bank(rng, m, p, KIDS_SOME)); }
      say.push(fresh(rng, m, KIDS_FOLLOW[p.kids]));
      m.thread = { topic: 'kids', step: 1 }; if (p.kids === 'hesitant') m.aff -= 0.5; else m.aff += 1;
      break;
    }
    case 'kids_no': m.facts.kids = 3; say.push(bank(rng, m, p, KIDS_REFUSED)); topic = 'kids'; closeThread(m); break;
    case 'kid_time': case 'kid_proud': case 'kid_joke': say.push(bank(rng, m, p, KIDS_AFTER[choiceId])); topic = 'kids'; m.aff += 0.5; closeThread(m); break;
    case 'kid_ok': say.push(bank(rng, m, p, KIDS_THANKS)); topic = 'kids'; m.aff += 0.2; closeThread(m); break;
    case 'kid_hurt': say.push(bank(rng, m, p, KIDS_HEURT)); topic = 'kids'; m.aff -= 0.3; m.thread = { topic: 'kids', step: 2, data: 'hurt' }; break;

    case 'friends_only': {
      m.facts.friends = 1; if (!m.memories.includes('friends')) m.memories.push('friends'); topic = 'friend';
      say.push(p.friendLine); say.push(fresh(rng, m, FRIEND_Q[p.friend]));
      m.thread = { topic: 'friend', step: 1 };
      break;
    }
    case 'friends_unsure': m.facts.friends = 2; say.push(fresh(rng, m, ['Pas de souci, on n\'a pas besoin de décider tout de suite.', 'C\'est honnête. Un pas après l\'autre.'])); topic = 'friend'; m.aff += 0.3; closeThread(m); break;
    case 'fr_yes': case 'fr_no': case 'fr_him': case 'fr_joke': case 'fr_open': case 'fr_why': {
      const step = (m.thread?.topic === 'friend' ? m.thread.step : 1) + 1; topic = 'friend';
      say.push(...pickRound(rng, m, p, choiceId));
      m.aff += choiceId === 'fr_joke' ? 0.4 : 0.6;
      if (step >= 3) { say.push(fresh(rng, m, FRIEND_CLOSE[p.friend])); closeThread(m); m.facts.friends = Math.max(m.facts.friends, 1) as 1 | 2; }
      else m.thread = { topic: 'friend', step };
      break;
    }
    case 'fr_clear': {
      topic = 'friend'; m.facts.friends = 1;
      if (p.friend === 'honest' && rng.next() < 0.6) { say.push(fresh(rng, m, FRIEND_STEPBACK)); m.faded = true; m.aff -= 3; }
      else say.push(bank(rng, m, p, FRIEND_CLEAR));
      closeThread(m); break;
    }
    case 'ph_smile': case 'ph_outfit': case 'ph_funny': {
      topic = 'photo'; m.photo.hers.push(choiceId); while (m.photo.hers.length > 12) m.photo.hers.shift(); m.photo.pending = false; m.photo.relanced = false;
      say.push(bank(rng, m, p, PHOTO_GOT[choiceId])); m.aff += 1.2;
      if (!m.photo.his.length || ctx.now - m.photo.his[m.photo.his.length - 1].at > 2 * DAY) wantsPhoto = true;
      closeThread(m); break;
    }
    case 'ph_first': topic = 'photo'; say.push(bank(rng, m, p, PHOTO_FIRST)); wantsPhoto = true; m.photo.pending = false; closeThread(m); break;
    case 'ph_later': topic = 'photo'; say.push(bank(rng, m, p, PHOTO_LATER)); m.photo.holdUntil = ctx.now + 3 * DAY; m.photo.pending = false; closeThread(m); break;
    case 'ph_tease': topic = 'photo'; say.push(bank(rng, m, p, PHOTO_TEASE)); m.photo.holdUntil = ctx.now + 2 * DAY; m.photo.pending = false; closeThread(m); break;
    case 'ph_no': topic = 'photo'; say.push(bank(rng, m, p, PHOTO_REFUSED)); m.photo.noMore = true; m.photo.pending = false; closeThread(m); break; // refus explicite : plus jamais de demande

    case 'sg_yes': case 'sg_complex': case 'sg_none': case 'sg_single': {
      topic = 'single'; m.facts.single = choiceId === 'sg_single' ? 1 : 2;
      if (p.id === 'hugo' && m.thread?.data === 'auguste') say.push(fresh(rng, m, HUGO_AUGUSTE_REACT[choiceId]));
      else say.push(bank(rng, m, p, SINGLE_REACT[choiceId]));
      m.aff += choiceId === 'sg_none' ? -0.2 : 0.3; closeThread(m); break;
    }
    default: say.push(fresh(rng, m, ['Hmm, d\'accord.', 'Ah ouais ?'])); closeThread(m);
  }
  // le prénom, parfois, jamais pendant un sujet délicat (famille, refus, limite, éloignement)
  const delicate = topic === 'kids' || topic === 'photo' || topic === 'single' || m.faded || def?.kind === 'limit';
  if (!delicate && m.thread === null && maybeName(rng, m, p, say)) { m.thread = { topic: 'name', step: 1 }; topic = 'name'; }
  // une blague (volontairement nulle pour certains) de temps en temps, jamais juste après une autre
  if (!delicate && m.thread === null && p.jokes.length && (p.arch === 'joker' || p.arch === 'badjoker') && m.turns > 3 && rng.next() < 0.12) {
    const ji = pickJoke(rng, m, p); say.push(fresh(rng, m, [pickFrom(rng, JOKE_LEAD)]), p.jokes[ji].setup); m.thread = { topic: 'joke', step: 1, data: String(ji) }; topic = 'joke';
  }
  trackName(m, say);
  trackName(m, say);
  bumpTopic(m, topic);
  return { say: say.map(fill), topic, choices: offer(b, id, rng), wantsPhoto };
}

/** Une blague dont le texte ne contient pas le prénom pendant la pause du prénom (s'il y en a une autre). */
function pickJoke(rng: RngLike, m: CharMem, p: Persona): number {
  const ok = p.jokes.map((_j, i) => i).filter((i) => !hasName(p.jokes[i].setup) || m.turns - m.lastNameTurn >= 4);
  return ok.length ? pickFrom(rng, ok) : rng.int(p.jokes.length);
}
function pickRound(rng: RngLike, m: CharMem, p: Persona, cid: 'fr_yes' | 'fr_no' | 'fr_him' | 'fr_joke' | 'fr_open' | 'fr_why'): string[] {
  const pool = FRIEND_ROUND[p.friend][cid]; return [fresh(rng, m, pool)];
}

// ------------------------------------------------------------------ à lui de parler
export interface StartCtx { now: number; hour?: number; channel?: 'snap' | 'tindeur'; /** il peut proposer / répondre par un snap */ canSnap?: boolean; flameAtRisk?: boolean }

/** Heure agréable pour ce personnage (0..1) : pour étaler les messages spontanés et respecter les rythmes. */
export function hourWeight(p: Persona, hour: number): number {
  const night = hour >= 19 || hour < 2; const morning = hour >= 6 && hour < 11; const day = hour >= 10 && hour < 19;
  const want = p.hours === 'night' ? night : p.hours === 'morning' ? morning : day;
  return want ? 1 : (hour >= 2 && hour < 6 ? 0.05 : 0.35);
}
/** Peut-il écrire spontanément maintenant ? (rythme propre : délai minimal en heures depuis son dernier mot, plage horaire, pas éloigné). */
export function canSpeak(b: BrainState, id: string, now: number, hour: number, rng: RngLike): boolean {
  const p = personaById(id); const m = memOf(b, id);
  if (!p || m.blocked || m.faded) return false;
  if (m.talkedAt && now - m.talkedAt < p.gapH * 3_600_000) return false;
  return rng.next() < hourWeight(p, hour);
}

export function start(b: BrainState, id: string, rng: RngLike, ctx: StartCtx): Beat | null {
  const p = personaById(id); if (!p) return null;
  const m = memOf(b, id); const hour = ctx.hour ?? 12;
  const say: string[] = []; let topic: TopicId = 'smalltalk'; let wantsPhoto = false;
  const since = m.talkedAt ? (ctx.now - m.talkedAt) / DAY : 0;
  m.turns++; 
  // 1. éloignement : une relance, puis un adieu poli s'il n'y a jamais de réponse
  if (m.talkedAt && since >= 3) {
    const staleRelances = m.topics.relance ?? 0;
    if (m.aff <= 0 && staleRelances >= 2 && since >= 10) { say.push(bank(rng, m, p, FADE)); m.faded = true; topic = 'relance'; m.talkedAt = ctx.now; bumpTopic(m, topic); closeThread(m); return { say: say.map(fill), topic, choices: offer(b, id, rng) }; }
    say.push(bank(rng, m, p, RELANCE)); topic = 'relance';
    if (m.memories.includes('kids') && rng.next() < 0.3) say.push(bank(rng, m, p, KIDS_CALLBACK));
    m.talkedAt = ctx.now; closeThread(m);
    bumpTopic(m, topic);
    return { say: say.map(fill), topic, choices: offer(b, id, rng) };
  }
  // 2. flamme en danger (une petite phrase, sans pression)
  if (ctx.flameAtRisk && ctx.canSnap !== false && rng.next() < 0.5 && (p.arch === 'joker' || p.arch === 'flirt' || p.arch === 'sporty' || p.arch === 'gentle' || p.arch === 'chill')) {
    say.push(bank(rng, m, p, FLAME_NUDGE)); topic = 'flame'; m.talkedAt = ctx.now; bumpTopic(m, topic); closeThread(m);
    return { say: say.map(fill), topic, choices: offer(b, id, rng) };
  }
  // 3. relance légère d'une demande de selfie sans réponse (une seule)
  const ph = m.photo;
  if (ph.pending && !ph.relanced && ctx.now - ph.lastAskAt > 20 * 3_600_000 && p.bold >= 1 && !ph.noMore) {
    say.push(bank(rng, m, p, PHOTO_RELANCE)); ph.relanced = true; ph.pending = false; topic = 'photo'; wantsPhoto = true;
    m.thread = { topic: 'photo', step: 2 }; m.talkedAt = ctx.now; bumpTopic(m, topic);
    return { say: say.map(fill), topic, choices: offer(b, id, rng), wantsPhoto };
  }
  // 4. demande de selfie (légère, jamais intime, jamais insistante)
  if (ctx.channel !== 'tindeur' && ctx.canSnap !== false && p.bold >= 1 && !ph.noMore && ctx.now >= ph.holdUntil && ph.asks < 3 && m.turns >= 3 && m.aff >= 0
      && ctx.now - ph.lastAskAt > 36 * 3_600_000 && !ph.pending && rng.next() < [0, 0.18, 0.3, 0.4][p.bold]) {
    say.push(fresh(rng, m, PHOTO_ASK[p.bold as 1 | 2 | 3])); ph.asks++; ph.lastAskAt = ctx.now; ph.pending = true; topic = 'photo';
    m.thread = { topic: 'photo', step: 1 }; m.talkedAt = ctx.now; bumpTopic(m, topic);
    return { say: say.map(fill), topic, choices: offer(b, id, rng), wantsPhoto: true };
  }
  // 5. question sur sa vie sentimentale (une seule fois) : Hugo pense à Auguste
  if (m.facts.single === 0 && (m.topics.single ?? 0) === 0 && m.turns >= 4 && (p.id === 'hugo' || p.arch === 'flirt' || p.arch === 'serious' || p.arch === 'skeptic') && rng.next() < 0.35) {
    if (p.id === 'hugo') { say.push(fresh(rng, m, HUGO_AUGUSTE)); m.thread = { topic: 'single', step: 1, data: 'auguste' }; }
    else { say.push(bank(rng, m, p, SINGLE_ASK)); m.thread = { topic: 'single', step: 1 }; }
    topic = 'single'; m.talkedAt = ctx.now; bumpTopic(m, topic);
    return { say: say.map(fill), topic, choices: offer(b, id, rng) };
  }
  // 6. il demande des nouvelles de la famille / de l'amitié dont elle a parlé (sujets repris naturellement, pas à chaque tour)
  if (m.memories.includes('kids') && m.facts.kids >= 1 && m.facts.kids <= 2 && (m.topics.callback ?? 0) < 6 && m.turns % 5 === 0 && rng.next() < 0.7) {
    say.push(bank(rng, m, p, KIDS_CALLBACK)); topic = 'callback'; m.thread = { topic: 'kids', step: 1 };
  } else if (m.memories.includes('friends') && m.facts.friends === 1 && m.turns % 7 === 0 && rng.next() < 0.7) {
    say.push(bank(rng, m, p, FRIEND_CALLBACK)); topic = 'callback'; m.thread = { topic: 'friend', step: 1 };
  } else if (ph.hers.length && ctx.canSnap !== false && rng.next() < 0.12) {
    say.push(fresh(rng, m, PHOTO_COMPLIMENT_CALLBACK)); topic = 'callback';
  } else if (m.facts.kids === 0 && m.turns >= 3 && (p.kids === 'interested' || p.arch === 'serious') && rng.next() < 0.3) {
    say.push(bank(rng, m, p, ASK_KIDS_OPEN)); m.thread = { topic: 'kids', step: 0, data: 'ask' }; topic = 'kids';
  } else if (m.facts.friends === 0 && m.turns >= 5 && rng.next() < 0.12) {
    say.push(fresh(rng, m, ['Au fait, tu cherches quoi, ici ? Du sérieux, des rencontres, des amis ?', 'Dis-moi, qu\'est-ce que tu viens chercher sur cette appli ?'])); m.thread = { topic: 'friend', step: 0, data: 'ask' }; topic = 'friend';
  } else if ((p.arch === 'joker' || p.arch === 'badjoker') && p.jokes.length && rng.next() < 0.3) {
    const ji = pickJoke(rng, m, p); say.push(fresh(rng, m, [pickFrom(rng, JOKE_LEAD)]), p.jokes[ji].setup); m.thread = { topic: 'joke', step: 1, data: String(ji) }; topic = 'joke';
  } else {
    const r = rng.next();
    if (r < 0.5) say.push(fresh(rng, m, noName(m, p.openers))); else if (r < 0.8) say.push(fresh(rng, m, SMALLTALK[voiceOf(p.arch)])); else { const a = p.anecdotes.filter((x) => !m.told.includes(x)); const pick = a.length ? fresh(rng, m, a) : fresh(rng, m, p.anecdotes); say.push(pick); m.told.push(pick); while (m.told.length > 12) m.told.shift(); topic = 'anecdote'; }
    if (m.thread === null && maybeName(rng, m, p, say)) { m.thread = { topic: 'name', step: 1 }; topic = 'name'; }
  }
  trackName(m, say);
  m.talkedAt = ctx.now; bumpTopic(m, topic);
  void hour;
  return { say: say.map(fill), topic, choices: offer(b, id, rng) };
}

/** Il vient d'envoyer un snap (scène) : on s'en souvient pour que Radia puisse en parler. */
export function noteHisSnap(b: BrainState, id: string, scene: string, now: number): void {
  const m = memOf(b, id); m.photo.his.push({ scene, at: now }); while (m.photo.his.length > 6) m.photo.his.shift();
}
/** Réponse à une demande de photo : étiquettes lisibles de la question « alors, cette photo ? ». */
export const snapAskText = (scene: string): string => SNAP_ASK_TEXT[scene] ?? SNAP_ASK_TEXT.selfie;
export const CHOICE_IDS = CHOICES.map((c) => c.id);
