/**
 * Conversation LIBRE : Radia écrit ce qu'elle veut, le personnage lit (understand.ts), consulte sa mémoire (CharMem) et sa personnalité,
 * puis répond : il répond à ses questions, rebondit sur ses mots, plaisante, flirte ou se retire selon son caractère, pose ses propres
 * questions (sans répéter) et se souvient de ce qu'elle a dit. Les sujets délicats (famille, amitié, photos, vie sentimentale, prénom, blagues)
 * passent par les réactions écrites à la main du moteur `react()`. Aucun réseau, déterministe pour un `rng` donné : testé.
 * Limite assumée : ce n'est PAS un modèle de langage ; ce qui sort de ses règles reçoit une réaction qui cite ses mots (voir README).
 */
import { HUGO_AUGUSTE, SINGLE_ASK, voiceOf, type VBank } from './banks';
import * as B from './chatBanks';
import { bank, bumpTopic, closeThread, fill, fresh, maybeName, pickFrom, react, trackName, type ReactCtx } from './engine';
import { factsOf } from './facts';
import { memOf } from './memory';
import { personaById } from './personas';
import type { Beat, BrainState, CharMem, Persona, RngLike, TopicId } from './types';
import { echoWord, understand, type Intent, type Understood } from './understand';

export interface ChatCtx extends ReactCtx {
  hour?: number; channel: 'snap' | 'tindeur';
  /** Données de son profil (âge, distance) pour répondre « tu as quel âge ? ». */
  age: number; km: number;
  /** Ce personnage a-t-il Snapchien ? Déjà dans les contacts de Radia ? */
  hasSnap?: boolean; inSnap?: boolean;
}

const DAY = 86_400_000;
const V3 = (w: string[], p: string[], c: string[]): VBank => ({ warm: w, play: p, cool: c });

// ------------------------------------------------------------------ banques propres au flux
const INTERJ: VBank = V3(['Ah…', 'Oh, d\'accord.', 'Hm, je vois.'], ['Attends…', 'Nan mais…', 'Oh là.', 'Ah ouais ?!', 'Mdrr.'], ['Hm.', 'Ah.', 'Tiens.']);
/** Reprise d'un mot de Radia quand rien d'autre ne s'applique. */
const ECHO: VBank = V3(
  ['Ah, {kw}… Et ça te plaît ?', 'Tiens, {kw}. Je ne m\'y attendais pas, raconte-moi un peu.', '{kw}… j\'aime bien que tu m\'en parles. Ça compte pour toi ?'],
  ['{kw} ?! Là tu m\'intéresses. Raconte, raconte 😄', 'Ah ouais, {kw}. Je veux le détail, tout le détail.', 'Nan mais {kw}, j\'avais pas vu venir. Continue !'],
  ['Ah, {kw}. Et ça se passe comment ?', '{kw}. Je vois. Développe un peu ?', 'D\'accord pour {kw}. Tu en dis plus ?'],
);
const ECHO_TINY: VBank = V3(
  ['D\'accord ♡', 'Je vois. Tu veux qu\'on parle d\'autre chose ?', 'Hm, tu es pensive ?'],
  ['Ah ouais ? Dis-m\'en plus 😏', 'Mystérieuse, toi. J\'aime ça.', 'Laconique ! Un seul mot et déjà je décode.'],
  ['D\'accord.', 'Hm. Et sinon ?', 'Je vois. On passe à autre chose ?'],
);
const ECHO_LONG: VBank = V3(
  ['Merci de m\'avoir raconté ça, vraiment. J\'ai tout lu, avec attention.', 'C\'est beau ce que tu écris. Merci de partager ça avec moi.', 'Je comprends mieux. Merci de me faire confiance, ça compte.'],
  ['Wow, c\'est un roman ! J\'ai tout lu, je suis fier de moi 😄', 'Tu m\'as perdu à la moitié, mais j\'ai tout compris à la fin.', 'Alors ça, c\'est un message qui en jette. Merci !'],
  ['J\'ai lu, merci de ces précisions.', 'D\'accord, je comprends mieux ta situation.', 'Merci pour ce message détaillé.'],
);
const QUESTION_FALLBACK: VBank = V3(
  ['Bonne question. Je n\'ai pas de réponse toute faite, mais j\'aimerais bien connaître la tienne.', 'Hmm, difficile à dire comme ça. Et toi, tu en penses quoi ?', 'Je ne sais pas trop, honnêtement. Qu\'est-ce que tu en penses, toi ?'],
  ['Ah, question piège ! Je plaide l\'ignorance. Toi d\'abord 😄', 'Mmmh… trop profond pour moi à cette heure. Toi, tu penses quoi ?', 'Bon, je ne sais pas, mais je trouve ta question magnifique.'],
  ['Pas sûr. Et toi ?', 'Difficile à dire. Ton avis ?', 'Je n\'ai pas d\'avis tranché. Toi ?'],
);
const ACK: VBank = V3(
  ['Ah, merci de me le dire, ça me fait plaisir de mieux te connaître.', 'D\'accord, c\'est noté, j\'aime bien savoir ça de toi.', 'Ça te ressemble, je trouve.'],
  ['Ah ouais, {kw} ? J\'aurais pas deviné, mais j\'adore !', 'Noté dans mon grand carnet « Radia » 📒', 'Intéressant ! Tu es pleine de surprises.'],
  ['Je vois. Merci de me le dire.', 'D\'accord, c\'est noté.', 'Intéressant. Ça me parle.'],
);
const TOPIC_BANK: Partial<Record<Intent, VBank>> = { topic_weather: B.Q_WEATHER, topic_sleep: B.Q_SLEEP, topic_sport: B.Q_SPORT, topic_food: B.Q_FOOD, topic_work: B.Q_WORK, topic_family: B.Q_FAMILY };
const PH_AGREE: VBank = V3(
  ['Merci, ça me ferait plaisir. J\'attends ça avec curiosité.', 'Avec plaisir, prends ton temps pour l\'envoyer.', 'Oh, c\'est gentil. J\'ai hâte de voir ça.'],
  ['Oh ! Je prépare mes yeux. Envoie, envoie 👀', 'Excellent, j\'attends la photo avec un grand sourire.', 'Génial ! Je ne regarde plus mon téléphone pendant dix minutes, promis.'],
  ['D\'accord. J\'attends.', 'Très bien, envoie quand tu veux.', 'Entendu.'],
);
const SNAP_ACCEPT: string[] = ['Super ! Je t\'ajoute tout de suite. À tout de suite sur Snapchien 👻', 'Génial, je t\'ajoute. Rendez-vous là-bas !', 'Parfait, c\'est fait de mon côté aussi. Tu vas voir, c\'est plus vivant là-bas.'];
const SNAP_REFUSE: string[] = ['Aucun souci, on reste ici, c\'est très bien aussi.', 'Pas de problème. Je ne vais pas insister.'];

/** Questions qu'il pose à son tour (une catégorie à la fois, jamais deux fois la même de suite). */
const FOLLOW: Record<string, VBank> = {
  day: V3(['Et toi, ta journée s\'est passée comment ?', 'Raconte-moi ta journée, si tu as un moment.'], ['Et toi, ta journée ? Épique ou ennuyeuse ?', 'Dis-moi tout : ta journée en trois mots !'], ['Et ta journée ?', 'Ta journée, ça va ?']),
  job: V3(['Tu fais quoi dans la vie, toi ?', 'Tu travailles dans quoi ? J\'aime bien savoir ce qui occupe les gens.'], ['Et toi, tu fais quoi comme métier ? Dis-moi que c\'est cool 😄', 'Allez, ton métier. Je devine : astronaute ?'], ['Tu fais quoi comme métier ?', 'Tu travailles dans quoi ?']),
  hobby: V3(['Qu\'est-ce que tu aimes faire quand tu as du temps pour toi ?', 'Tu as une passion, quelque chose qui te fait du bien ?'], ['Et toi, c\'est quoi ton truc ? Une passion cachée ?', 'Qu\'est-ce que tu fais pour t\'amuser ? Avoue, tu fais de la poterie.'], ['Tu fais quoi comme loisirs ?', 'Qu\'est-ce que tu aimes faire de ton temps libre ?']),
  weekend: V3(['Tu fais quoi ce week-end ? Quelque chose de prévu ?', 'Tu as des projets pour les prochains jours ?'], ['Et ce week-end, tu fais quoi de beau ?', 'Des plans pour ce week-end ? Ou canapé ?'], ['Tu as des plans ce week-end ?', 'Ce week-end, tu fais quoi ?']),
  food: V3(['Tu aimes cuisiner ? C\'est quoi ton plat réconfort ?', 'Tu manges quoi quand tu te fais plaisir ?'], ['Question vitale : pizza ou sushis ? Choisis bien, je juge.', 'Ton plat préféré ? Je te juge sur ta réponse 😄'], ['Qu\'est-ce que tu aimes manger ?', 'Un plat préféré ?']),
  movie: V3(['Tu as un film ou une série que tu adores ?', 'Tu regardes quoi en ce moment ?'], ['Série ou film ce soir ? Réponds vite !', 'Donne-moi un film à voir, je suis en panne d\'idées.'], ['Tu regardes quoi en ce moment ?', 'Un film que tu me recommandes ?']),
  dream: V3(['Qu\'est-ce que tu cherches ici, au fond ?', 'Si tu pouvais changer une chose dans ta vie, ce serait quoi ?'], ['Allez, un rêve fou. Je garde le secret (peut-être).', 'Si tu gagnais au loto demain, tu fais quoi ?'], ['Qu\'est-ce que tu cherches ici ?', 'Qu\'attends-tu de cette appli ?']),
  pet: V3(['Tu as des animaux de compagnie ?', 'Plutôt chien ou plutôt chat, toi ?'], ['Team chien ou team chat ? Je te juge 😄', 'Un animal à la maison ? Dis oui, je suis fan.'], ['Tu as un animal ?', 'Chien ou chat ?']),
};
const FOLLOW_ORDER = ['day', 'job', 'hobby', 'weekend', 'food', 'movie', 'pet', 'dream'];

// ------------------------------------------------------------------ outils
const line = (rng: RngLike, m: CharMem, p: Persona, b: VBank, vars: Record<string, string> = {}): string =>
  sub(bank(rng, m, p, b), vars);
const sub = (s: string, vars: Record<string, string>): string => fill(s.replace(/\{(kw|age|name|km|date)\}/g, (_x, k: string) => vars[k] ?? ''));
const has = (u: Understood, i: Intent): boolean => u.intents.includes(i);
const one = <T,>(rng: RngLike, a: readonly T[]): T => pickFrom(rng, a);
const rememberKw = (m: CharMem, u: Understood): void => {
  const w = echoWord(u); if (!w) return;
  m.said = m.said.filter((x) => x !== w); m.said.push(w); while (m.said.length > 8) m.said.shift();
};
const CATS_ASKED = (m: CharMem): string[] => m.told.filter((t) => t.startsWith('q:')).map((t) => t.slice(2));
function markAsked(m: CharMem, cat: string): void { m.told = m.told.filter((t) => t !== `q:${cat}`); m.told.push(`q:${cat}`); while (m.told.length > 12) m.told.shift(); m.ask = cat; }
/** Prochaine question à lui poser, qu'il n'a pas encore posée (ou la plus ancienne si tout a été posé). */
function nextFollow(m: CharMem): string | null {
  const asked = CATS_ASKED(m);
  const left = FOLLOW_ORDER.filter((c) => !asked.includes(c));
  return left.length ? left[0] : null;
}
/** Quand il a déjà tout demandé, il revient sur un mot qu'elle a employé (« tu parlais de … ») : preuve qu'il écoute. */
const SAID_BACK: VBank = V3(['Au fait, tu parlais de {kw} tout à l\'heure. Ça compte pour toi ?', 'Je repensais à {kw}, que tu as mentionné. Raconte-m\'en un peu plus ?'], ['Au fait ! {kw} : je n\'ai pas oublié. Dis-m\'en plus 😏', 'Retour sur {kw}, parce que je suis un détective.'], ['Tu avais parlé de {kw}. On y revient ?', 'Sur {kw} que tu évoquais : qu\'en penses-tu ?']);

/** Choisit, si la phrase s'y prête, une réponse « écrite à la main » du moteur (famille, amitié, photo, vie sentimentale, prénom, blagues). */
function mapChoice(u: Understood, m: CharMem): string | null {
  const t = m.thread; const norm = u.norm;
  if (has(u, 'kids_all')) return 'kids_all';
  if (has(u, 'kids_some')) return 'kids_some';
  if (has(u, 'kids_no')) return 'kids_no';
  if (has(u, 'friends_only')) return t?.topic === 'friend' && /c est tout|rien d autre|rien de plus|clair|franchement/.test(norm) ? 'fr_clear' : 'friends_only';
  if (has(u, 'friends_unsure')) return 'friends_unsure';
  if (has(u, 'name_stop')) return 'stopname';
  if (has(u, 'ph_no') && (m.photo.pending || /\bphoto|selfie\b/.test(norm))) return 'ph_no';
  if (m.photo.pending || t?.topic === 'photo') {
    if (has(u, 'ph_first')) return 'ph_first';
    if (has(u, 'ph_later') || (has(u, 'maybe') && t?.topic === 'photo')) return 'ph_later';
    if (has(u, 'ph_tease')) return 'ph_tease';
  }
  if (t?.topic === 'single' || (/\bcelibataire\b/.test(norm) && !u.question && !has(u, 'q_single'))) {
    if (has(u, 'single_complex') || has(u, 'maybe')) return 'sg_complex';
    if (has(u, 'single_none') || has(u, 'disagree')) return 'sg_none';
    if (/\bcelibataire\b/.test(norm) && !u.question) return 'sg_single';
    if (t?.topic === 'single' && (has(u, 'agree') || has(u, 'single_yes'))) return 'sg_yes';
  }
  if (t?.topic === 'friend' && !u.question || (t?.topic === 'friend' && has(u, 'q_you'))) {
    if (has(u, 'q_you')) return 'fr_him';
    if (has(u, 'laugh')) return 'fr_joke';
    if (has(u, 'agree')) return 'fr_yes';
    if (has(u, 'disagree')) return 'fr_no';
    if (has(u, 'maybe')) return 'fr_open';
    if (has(u, 'why') || has(u, 'sure')) return 'fr_why';
    if (u.size !== 'tiny') return 'fr_open';
  }
  if (t?.topic === 'friend' && u.question) return has(u, 'why') ? 'fr_why' : 'fr_him';
  if (has(u, 'friend_talk') && !t) return null;
  if (t?.topic === 'joke' || t?.topic === 'name') {
    if (has(u, 'joke_bad') || (has(u, 'rude') && t.topic === 'joke')) return 'nul';
    if (has(u, 'joke_good')) return 'bravo';
    if (has(u, 'laugh') && t.topic === 'joke') return 'bravo';
  }
  if (has(u, 'joke_bad')) return 'nul';
  if (has(u, 'joke_good')) return 'bravo';
  if (t?.topic === 'kids' && !u.question) {
    if (has(u, 'agree') || has(u, 'compliment')) return 'kid_ok';
    if (/(fier|fierte|amour|ma vie|tout pour moi|merveilleux)/.test(norm)) return 'kid_proud';
    if (/(pas de temps|jamais|fatigu|courir|temps pour moi|epuis)/.test(norm)) return 'kid_time';
    if (has(u, 'laugh')) return 'kid_joke';
    if (has(u, 'sad')) return 'kid_hurt';
  }
  return null;
}

/**
 * Réponse à un message libre. `null` : le personnage ne répond plus (bloqué). Le `Beat` contient 1 à 3 bulles courtes.
 */
export function chatReply(b: BrainState, id: string, text: string, rng: RngLike, ctx: ChatCtx): Beat | null {
  const p = personaById(id); if (!p) return null;
  const m = memOf(b, id);
  if (m.blocked) return null;
  const u = understand(text);
  const facts = factsOf(id);
  const vars = { kw: echoWord(u), age: String(ctx.age), name: p.name, km: String(ctx.km), date: '' };
  const say: string[] = []; let topic: TopicId = 'smalltalk'; let wantsPhoto = false; let addSnap = false; let offersSnap = false;
  rememberKw(m, u);

  // 0. limites : elle ne veut plus qu'il écrive → il respecte immédiatement
  if (has(u, 'stop')) {
    m.turns++; m.talkedAt = ctx.now; m.faded = true; m.aff = Math.min(m.aff, -3); closeThread(m); m.ask = '';
    return { say: [fill(fresh(rng, m, B.STOP_REPLY))], topic: 'relance', choices: [] };
  }

  // 1. sujets délicats ou déjà écrits à la main
  const wasSnapOffer = m.thread?.topic === 'snapfollow' && m.thread.data === 'offer';
  const cid = wasSnapOffer ? null : mapChoice(u, m);
  if (cid) {
    const beat = react(b, id, cid, rng, ctx);
    if (beat) {
      m.ask = ''; // elle a répondu : la question en attente est close
      return { ...beat, choices: [] };
    }
  }

  // 2. échange libre
  m.turns++; m.talkedAt = ctx.now;
  if (m.faded) { m.faded = false; m.aff = Math.max(m.aff, 0); say.push(fresh(rng, m, ['Tiens, tu es revenue ! Ça me fait plaisir.', 'Ça fait plaisir de te relire.'])); }
  const answered: string[] = [];
  let delicate = false;
  const push = (s: string | null | undefined): void => { if (s) say.push(sub(s, vars)); };

  // 2a. Snapchien
  if (wasSnapOffer) {
    closeThread(m);
    if (has(u, 'disagree') || has(u, 'ph_no') || has(u, 'maybe')) { push(fresh(rng, m, SNAP_REFUSE)); m.told.push('snap-no'); }
    else if (has(u, 'agree') || has(u, 'ph_yes') || /ajoute|ajoute|j ai ajoute|c est fait|je t ajoute|voila|ok pour|d accord|oui/.test(u.norm)) { push(fresh(rng, m, SNAP_ACCEPT)); addSnap = true; m.told.push('snap'); m.aff += 0.7; }
    else if (!u.question) push(fresh(rng, m, SNAP_REFUSE));
  } else if (has(u, 'q_snap')) {
    if (ctx.inSnap) { push(fresh(rng, m, ['On est déjà amis sur Snapchien, tu as oublié ? 😄', 'Mais on s\'est déjà ajoutés sur Snapchien !'])); }
    else if (ctx.hasSnap) { push(fresh(rng, m, B.SNAP_ASKED_REPLY)); m.thread = { topic: 'snapfollow', step: 1, data: 'offer' }; offersSnap = true; topic = 'snapfollow'; }
    else push(line(rng, m, p, B.SNAP_NONE_REPLY));
    answered.push('snap');
  }

  // 2b. questions et intentions : on répond à ce qu'elle a vraiment dit (jusqu'à 2 réponses)
  const handlers: [Intent, () => string | null][] = [
    ['greet', () => line(rng, m, p, B.GREET)],
    ['how', () => line(rng, m, p, B.HOW_ANSWER)],
    ['doing', () => line(rng, m, p, B.DOING_ANSWER)],
    ['q_age', () => line(rng, m, p, B.Q_AGE, vars)],
    ['q_name', () => line(rng, m, p, B.Q_NAME, vars)],
    ['q_where', () => line(rng, m, p, B.Q_WHERE, vars)],
    ['q_single', () => (p.id === 'hugo' && m.facts.single === 0 ? 'Célibataire, oui. Et toi, tu es toujours en contact avec l\'autre ? Je demande par curiosité, hein.' : line(rng, m, p, B.Q_SINGLE_REPLY))],
    ['q_meet', () => {
      const ready = m.turns >= 8 && m.aff >= 2.5; const date = facts ? one(rng, facts.date) : '';
      if (!ready) return line(rng, m, p, B.Q_MEET_YOUNG);
      m.thread = null; topic = 'smalltalk'; vars.date = date; return line(rng, m, p, B.Q_MEET_READY, vars);
    }],
    ['q_job', () => (facts ? one(rng, facts.job) : null)],
    ['q_hobby', () => (facts ? one(rng, facts.hobby) : null)],
    ['q_dream', () => (facts ? one(rng, facts.dream) : null)],
    ['q_weekend', () => (facts ? one(rng, facts.weekend) : null)],
    ['q_kids', () => line(rng, m, p, B.Q_KIDS_REPLY)],
    ['q_pet', () => line(rng, m, p, B.Q_PET)],
    ['q_music', () => line(rng, m, p, B.Q_MUSIC)],
    ['q_movie', () => line(rng, m, p, B.Q_MOVIE)],
    ['q_food', () => line(rng, m, p, B.Q_FOOD)],
    ['coupled', () => { m.aff -= 1; delicate = true; return line(rng, m, p, B.COUPLED_REPLY); }],
    ['sexual', () => { m.aff -= 0.6; delicate = true; return line(rng, m, p, B.SEXUAL_REPLY); }],
    ['rude', () => { m.aff -= 1; delicate = true; return line(rng, m, p, B.RUDE_REPLY); }],
    ['sad', () => { delicate = true; m.aff += 0.4; return line(rng, m, p, B.SAD_REPLY); }],
    ['busy', () => { delicate = true; return line(rng, m, p, B.BUSY_REPLY); }],
    ['night', () => { delicate = true; m.aff += 0.2; return line(rng, m, p, B.NIGHT_REPLY); }],
    ['bye', () => { delicate = true; return line(rng, m, p, B.BYE_REPLY); }],
    ['thanks', () => line(rng, m, p, B.THANKS_REPLY)],
    ['miss', () => { m.aff += 1; return line(rng, m, p, B.MISS_REPLY); }],
    ['flirt', () => { m.aff += 0.7; return line(rng, m, p, B.FLIRT_REPLY); }],
    ['compliment', () => { m.aff += 0.6; return line(rng, m, p, B.COMPLIMENT_REPLY); }],
    ['ask_photo', () => { wantsPhoto = true; m.aff += 0.2; return line(rng, m, p, B.ASK_PHOTO_REPLY); }],
    ['ph_yes', () => { if (m.photo.pending) { m.photo.pending = false; m.aff += 0.5; return line(rng, m, p, PH_AGREE); } return null; }],
    ['sure', () => line(rng, m, p, B.SURE_REPLY)],
    ['laugh', () => line(rng, m, p, B.LAUGH_REPLY)],
    ['nothing', () => line(rng, m, p, B.NOTHING_REPLY)],
    ['maybe', () => line(rng, m, p, B.MAYBE_REPLY)],
    ['disagree', () => (u.size === 'tiny' ? line(rng, m, p, B.DISAGREE_REPLY) : null)],
    ['agree', () => (u.size === 'tiny' && !m.ask ? line(rng, m, p, B.AGREE_REPLY) : null)],
  ];
  // mots de son univers (« apiculteur » pour Léo) : réponse personnelle prioritaire
  let kwHit = false;
  if (facts) for (const [re, lines] of facts.kw) if (new RegExp(re).test(u.norm) && lines.some((l) => !m.recent.includes(l))) { push(fresh(rng, m, lines)); kwHit = true; m.aff += 0.5; break; }
  if (has(u, 'why') && !kwHit && !answered.length) { /* « pourquoi ? » sans sujet précis : réponse générale plus bas */ }
  let given = kwHit ? 1 : 0;
  for (const [it, f] of handlers) {
    if (given >= 2) break;
    if (!has(u, it) || answered.includes(it)) continue;
    if (kwHit && !u.question && /^(q_music|q_movie|q_food|q_pet|q_hobby|q_job|q_dream|q_weekend|q_kids)$/.test(it)) continue; // énoncé sur son univers : sa réplique personnelle suffit
    // « pourquoi » / question inconnue ne se traitent qu'en dernier
    const s = f(); if (s) { push(s); given++; answered.push(it); }
  }
  if (has(u, 'why') && !kwHit && given === 0) { push(line(rng, m, p, B.WHY_REPLY)); given++; }
  if (given === 0) for (const it of u.intents) { const bk = TOPIC_BANK[it]; if (bk) { push(line(rng, m, p, bk)); given++; break; } }

  // 2c. rien de reconnu : il réagit à ce qu'elle a écrit
  if (given === 0 && !say.some(Boolean)) {
    if (m.ask && !u.question) { push(line(rng, m, p, ACK, vars)); m.aff += 0.4; if (m.ask === 'dream' || m.ask === 'job') m.memories.includes('said-' + m.ask) || m.memories.push('said-' + m.ask); }
    else if (u.question) push(line(rng, m, p, QUESTION_FALLBACK));
    else if (u.size === 'tiny' || !vars.kw) push(line(rng, m, p, ECHO_TINY));
    else if (u.size === 'long') push(line(rng, m, p, ECHO_LONG));
    else push(line(rng, m, p, ECHO, vars));
    m.aff += 0.15;
  }
  m.ask = '';

  // 2d. petites touches vivantes : interjection avant, question ensuite, prénom, blague
  const sensitive = delicate || has(u, 'sad') || has(u, 'rude') || has(u, 'sexual');
  if (!sensitive && say.length === 1 && rng.next() < (voiceOf(p.arch) === 'play' ? 0.22 : 0.1)) say.unshift(fresh(rng, m, INTERJ[voiceOf(p.arch)]));
  const asked = say.some((s) => /\?\s*$/.test(s));
  const mirror: Partial<Record<Intent, string>> = { q_job: 'job', q_hobby: 'hobby', q_weekend: 'weekend', q_dream: 'dream', q_food: 'food', q_movie: 'movie', q_pet: 'pet', how: 'day', doing: 'day' };
  const back = u.intents.map((i) => mirror[i]).find((c): c is string => !!c && !say.some((x) => /\bet toi\b|\btoi\b.*\?/i.test(x)));
  const quiet = has(u, 'bye') || has(u, 'night') || has(u, 'busy') || wasSnapOffer || addSnap || offersSnap;
  if (!sensitive && !quiet && !m.thread && say.length <= 2 && (!asked || back)) {
    const p0 = back ? 0.9 : u.question ? 0.35 : voiceOf(p.arch) === 'cool' ? 0.45 : 0.65;
    if (rng.next() < p0) {
      const cat = back && !CATS_ASKED(m).slice(-1).includes(back) ? back : nextFollow(m);
      if (cat) { say.push(sub(fresh(rng, m, FOLLOW[cat][voiceOf(p.arch)]), vars)); markAsked(m, cat); }
      else { const old = m.said.slice(0, -1).filter((w) => w !== vars.kw); if (old.length && rng.next() < 0.5) say.push(sub(fresh(rng, m, SAID_BACK[voiceOf(p.arch)]), { ...vars, kw: old[old.length - 1] })); }
    }
  }
  // sa vie sentimentale : certains hommes la demandent une fois (Hugo pense à Auguste : « t'es toujours en contact avec l'autre ? »)
  if (!sensitive && !quiet && !m.thread && m.facts.single === 0 && (m.topics.single ?? 0) === 0 && say.length <= 2 && !has(u, 'coupled')
      && ((p.id === 'hugo' && m.turns >= 3) || (m.turns >= 5 && (p.arch === 'flirt' || p.arch === 'serious' || p.arch === 'skeptic') && rng.next() < 0.3))) {
    if (p.id === 'hugo') { say.push(fresh(rng, m, HUGO_AUGUSTE)); m.thread = { topic: 'single', step: 1, data: 'auguste' }; }
    else { say.push(line(rng, m, p, SINGLE_ASK)); m.thread = { topic: 'single', step: 1 }; }
    topic = 'single'; m.ask = '';
  }
  if (!sensitive && m.thread === null && maybeName(rng, m, p, say)) { m.thread = { topic: 'name', step: 1 }; topic = 'name'; }
  if (rng.next() < 0.07 && !sensitive && m.thread === null && (p.arch === 'joker' || p.arch === 'badjoker') && p.jokes.length && m.turns > 4) {
    const j = p.jokes[rng.int(p.jokes.length)]; say.push(fill(j.setup)); m.thread = { topic: 'joke', step: 1, data: String(p.jokes.indexOf(j)) }; topic = 'joke';
  }
  trackName(m, say);
  bumpTopic(m, topic);
  if (m.aff > 12) m.aff = 12;
  const out = say.map((s) => s.trim()).filter(Boolean).slice(0, 4);
  return { say: out, topic, choices: [], wantsPhoto, addSnap, offersSnap };
}

/** Âge de la dernière activité en jours (pour les relances). */
export const daysSince = (m: CharMem, now: number): number => (m.talkedAt ? (now - m.talkedAt) / DAY : 0);
