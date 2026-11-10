/**
 * Tindeur : nœuds de conversation DYNAMIQUES (identifiants commençant par « ~ »). Ils sont régénérés à l'identique à partir de leur seul
 * identifiant (déterministe : aucune donnée à sauvegarder, l'historique des anciennes conversations reste valide) :
 *   ~k:<n>            réaction à « divorcée, trois enfants »     ~kr:<n>:<choix>      suite de cette discussion
 *   ~f:<n>            débat sur l'amitié homme-femme             ~fr:<n>:<choix>:<tour>
 *   ~s:<n>            « Tu as Snapchien ? »                      ~sy / ~sn : <n>      réponse
 *   ~rl:<n>:<k>       relance après plusieurs jours              ~fade                 il s'éloigne (fin)
 * <n> = le nœud écrit à la main où la conversation reprend après le détour (ses réponses reviennent à la fin du détour).
 */
import type { Choice, Node, Profile } from '../../events/tindeur/swipe/types';
import { FADE, FLAME_NUDGE, FRIEND_CLEAR, FRIEND_CLOSE, FRIEND_Q, FRIEND_ROUND, FRIEND_STEPBACK, KIDS_AFTER, KIDS_FOLLOW, KIDS_HEURT, KIDS_THANKS, NAME_LINES, RELANCE, voiceOf, type VBank } from './banks';
import { personaById } from './personas';
import { memOf } from './memory';
import type { BrainState, Persona } from './types';
void FLAME_NUDGE;

const h32 = (t: string): number => { let h = 2166136261 >>> 0; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const pickH = <T>(a: readonly T[], seed: string): T => a[h32(seed) % a.length];
const vb = (b: VBank, p: Persona, seed: string): string => pickH(b[voiceOf(p.arch)], seed);

export const EXTRA_TEXT = { kids: 'Je suis divorcée et j\'ai trois enfants.', friends: 'Je cherche surtout des amis ici.', snap: 'Tu as Snapchien ?' } as const;
/** Identifiants des personnages qui ont aussi un compte Snapchien (renseigné par l'application : évite une dépendance circulaire). */
export const SNAP_IDS = new Set(['dylan', 'maxime', 'kevin', 'thomas', 'nicolas', 'jordan', 'alexandre', 'lucas', 'enzo', 'hugo']);

const isDyn = (id: string): boolean => id.startsWith('~');
/** Réponses « en plus » ajoutées à chaque nœud écrit à la main (fin d'histoire exclue). */
export function extrasFor(p: Profile, authored: Node): Choice[] {
  if (authored.end || !authored.ch.length) return [];
  const out: Choice[] = [
    { t: EXTRA_TEXT.kids, to: `~k:${authored.id}`, ex: 'kids', fx: 'kids_all' },
    { t: EXTRA_TEXT.friends, to: `~f:${authored.id}`, ex: 'friends', fx: 'friends_only' },
  ];
  if (SNAP_IDS.has(p.id)) out.push({ t: EXTRA_TEXT.snap, to: `~s:${authored.id}`, ask: true, ex: 'snap', fx: 'snap_ask' });
  return out;
}
/** Réponses d'un nœud écrit à la main + les « en plus » (utilisé après un détour pour reprendre la conversation). */
const backChoices = (p: Profile, authored: Node | undefined): Choice[] => (authored ? [...authored.ch, ...extrasFor(p, authored)] : []);

const KID_CH: Record<'hesitant' | 'other', { id: string; t: string }[]> = {
  hesitant: [{ id: 'kid_ok', t: 'Je comprends, merci d\'être honnête' }, { id: 'kid_hurt', t: 'Ça me fait un peu de peine, mais ok' }],
  other: [{ id: 'kid_time', t: 'Du temps pour moi ? Presque jamais 😅' }, { id: 'kid_proud', t: 'Ils sont ma plus belle fierté' }, { id: 'kid_joke', t: 'T\'inquiète, ils ne mordent presque pas' }],
};
const FR_CH = [{ id: 'fr_yes', t: 'Si, je crois à l\'amitié homme-femme' }, { id: 'fr_no', t: 'Pas vraiment, mais j\'aimerais essayer' }, { id: 'fr_him', t: 'Et toi, tu y crois ?' }, { id: 'fr_joke', t: 'J\'ai déjà assez de copains jaloux 😂' }, { id: 'fr_open', t: 'On verra comment ça se passe' }, { id: 'fr_why', t: 'Pourquoi pas être amis, tout simplement ?' }];

/** Le nœud dynamique `id` du profil `p` (undefined si l'identifiant est inconnu). `authoredOf` retrouve un nœud écrit à la main. */
export function dynNode(p: Profile, id: string, authoredOf: (id: string) => Node | undefined): Node | undefined {
  if (!isDyn(id)) return undefined;
  const per = personaById(p.id); if (!per) return undefined;
  const [kind, a, b, c] = id.slice(1).split(':');
  const seed = `${p.id}|${id}`;
  switch (kind) {
    case 'k': {
      const au = authoredOf(a); if (!au) return undefined;
      const say = [...per.kidsLine, pickH(KIDS_FOLLOW[per.kids], seed)];
      const chs = per.kids === 'hesitant' ? KID_CH.hesitant : KID_CH.other;
      return { id, say, ch: chs.map((x) => ({ t: x.t, to: `~kr:${a}:${x.id}`, fx: x.id })) };
    }
    case 'kr': {
      const au = authoredOf(a); if (!au || !b) return undefined;
      const bank = b === 'kid_ok' ? KIDS_THANKS : b === 'kid_hurt' ? KIDS_HEURT : KIDS_AFTER[b as 'kid_time' | 'kid_proud' | 'kid_joke'];
      if (!bank) return undefined;
      return { id, say: [vb(bank, per, seed)], ch: backChoices(p, au) };
    }
    case 'f': {
      const au = authoredOf(a); if (!au) return undefined;
      const picks = [0, 1, 2, 3, 4, 5].map((i) => ({ i, k: h32(`${seed}|${i}`) })).sort((x, y) => x.k - y.k).slice(0, 3).map((x) => FR_CH[x.i]);
      const ch: Choice[] = picks.map((x) => ({ t: x.t, to: `~fr:${a}:${x.id}:2`, fx: x.id }));
      ch.push({ t: 'Je te le dis franchement : amis, c\'est tout', to: `~fr:${a}:fr_clear:9`, fx: 'fr_clear' });
      return { id, say: [per.friendLine, pickH(FRIEND_Q[per.friend], seed)], ch };
    }
    case 'fr': {
      const au = authoredOf(a); const cid = b as keyof (typeof FRIEND_ROUND)['believer'] | 'fr_clear'; const step = Number(c);
      if (!au || !cid || !Number.isFinite(step)) return undefined;
      if (cid === 'fr_clear') {
        // un homme franc peut décider de s'éloigner (décision stable : calculée à partir de l'identifiant, jamais du hasard)
        if (per.friend === 'honest' && h32(seed) % 5 < 3) return { id, say: [pickH(FRIEND_STEPBACK, seed)], ch: [], end: { title: 'Il s\'est éloigné', note: `${p.name} a préféré être clair : il cherche autre chose. Aucun mal, il te souhaite le meilleur.`, kind: 'calm' } };
        return { id, say: [vb(FRIEND_CLEAR, per, seed)], ch: backChoices(p, au) };
      }
      const line = pickH(FRIEND_ROUND[per.friend][cid], seed);
      if (step >= 3) return { id, say: [line, pickH(FRIEND_CLOSE[per.friend], seed + 'c')], ch: backChoices(p, au) };
      const picks = [0, 1, 2, 3, 4, 5].filter((i) => FR_CH[i].id !== cid).map((i) => ({ i, k: h32(`${seed}|n${i}`) })).sort((x, y) => x.k - y.k).slice(0, 3).map((x) => FR_CH[x.i]);
      return { id, say: [line], ch: picks.map((x) => ({ t: x.t, to: `~fr:${a}:${x.id}:${step + 1}`, fx: x.id })) };
    }
    case 's': {
      const au = authoredOf(a); if (!au) return undefined;
      return { id, say: [pickH(['Oui, j\'ai Snapchien ! Tu veux m\'ajouter ?', 'Bien sûr que j\'ai Snapchien. Je t\'ajoute si tu veux.', 'Ah ouais, j\'y suis. Dis-moi si tu veux qu\'on continue par là.'], seed)], ch: [
        { t: 'Oui, ajoute-moi', to: `~sy:${a}`, fx: 'snap_yes' }, { t: 'On reste ici pour l\'instant', to: `~sn:${a}`, fx: 'snap_here' }, { t: 'Non merci', to: `~sn:${a}`, fx: 'snap_no' }] };
    }
    case 'sy': { const au = authoredOf(a); if (!au) return undefined; return { id, say: [pickH(['Super ! Je te retrouve là-bas. Je t\'envoie un petit signe.', 'Génial. Tu verras, je suis meilleur en snaps qu\'en messages.'], seed)], ch: backChoices(p, au) }; }
    case 'sn': { const au = authoredOf(a); if (!au) return undefined; return { id, say: [pickH(['Aucun souci, on reste ici, c\'est très bien aussi.', 'Pas de problème. Je ne vais pas insister.'], seed)], ch: backChoices(p, au) }; }
    case 'rl': {
      const au = authoredOf(a); if (!au) return undefined;
      return { id, say: [vb(RELANCE, per, seed + (b ?? ''))], ch: backChoices(p, au) };
    }
    case 'fade': return { id, say: [vb(FADE, per, seed)], ch: [], end: { title: 'Il s\'est éloigné', note: `${p.name} a repris son chemin, sans rancune. Tu peux supprimer ce match ou le garder en souvenir.`, kind: 'calm' } };
    default: return undefined;
  }
}

// ------------------------------------------------------------------ petites touches du personnage avant ses répliques (prénom, interjections)
const INTERJ: Record<'warm' | 'play' | 'cool', string[]> = {
  warm: ['Haha 😊', 'Ah, je vois ♡', 'Merci de me répondre comme ça.'],
  play: ['Mdrrrr', 'Mais t\'es grave toi 😭', 'Attends attends…', 'Ah ouais ?!'],
  cool: ['Haha, ok.', 'Intéressant.', 'Tiens donc.'],
};
/**
 * Bulles ajoutées AVANT les répliques écrites à la main d'un nœud (jamais dans les détours dynamiques ni les fins) : le prénom « Radia »
 * (blague, taquinerie) ou une petite interjection. Déterministe (identifiant du nœud + rang dans la conversation) : identique en direct
 * et quand on rouvre l'historique, jamais deux fois de suite, avec une fréquence propre à chaque personnage.
 */
export function prefixFor(p: Profile, nodeId: string, prev: { had: boolean; at: number }, rank: number): string | null {
  const per = personaById(p.id); if (!per || isDyn(nodeId) || rank < 1) return null;
  if (prev.had && rank - prev.at < 2) return null;
  const x = h32(`${p.id}|${nodeId}`);
  const nameMod = [0, 9, 6, 4][per.nameplay];
  if (nameMod && x % nameMod === 0) { const lvl = per.nameplay >= 3 ? (x % 2 ? 'tease' : 'flirt') : per.nameplay === 2 ? (x % 2 ? 'tease' : 'light') : 'light'; return pickH([...NAME_LINES[lvl].map((l) => l.replace(/\{n\}/g, 'Radia')), per.nameLine], `${p.id}|${nodeId}|n`); }
  if (x % 7 === 1) return pickH(INTERJ[voiceOf(per.arch)], `${p.id}|${nodeId}|i`);
  return null;
}

/** Ce que le choix de Radia apprend au personnage (mémoire partagée avec Snapchien : il s'en souviendra là-bas aussi). */
export function applyFx(brain: BrainState, pid: string, fx: string | undefined): void {
  if (!fx) return;
  const m = memOf(brain, pid);
  const mem = (k: string): void => { if (!m.memories.includes(k)) m.memories.push(k); };
  switch (fx) {
    case 'kids_all': m.facts.kids = 2; mem('kids'); m.turns++; break;
    case 'kid_hurt': m.aff -= 0.5; break;
    case 'kid_proud': case 'kid_time': case 'kid_joke': m.aff += 0.5; break;
    case 'friends_only': m.facts.friends = 1; mem('friends'); m.turns++; break;
    case 'fr_clear': m.facts.friends = 1; break;
    case 'fr_yes': case 'fr_open': case 'fr_him': case 'fr_joke': case 'fr_why': case 'fr_no': m.facts.friends = Math.max(m.facts.friends, 1) as 1 | 2; break;
    case 'snap_yes': m.told.includes('snap') || m.told.push('snap'); m.aff += 0.5; break;
    default: break;
  }
}
/** Réponses « en plus » à masquer car déjà évoquées (la mémoire du personnage fait foi). */
export function hiddenExtra(brain: BrainState, pid: string, ex: Choice['ex']): boolean {
  const m = brain.chars[pid]; if (!m || !ex) return false;
  if (ex === 'kids') return m.facts.kids !== 0;
  if (ex === 'friends') return m.facts.friends !== 0;
  if (ex === 'snap') return m.told.includes('snap');
  return false;
}
/** Bulles d'introduction (prénom / interjection) de chaque message entrant du journal ; `null` = aucune. */
export function prefixesOf(p: Profile, log: readonly { k: string; n: string }[]): (string | null)[] {
  let rank = 0; const prev = { had: false, at: -9 };
  return log.map((m) => {
    if (m.k !== 'in') return null;
    rank++;
    const x = prefixFor(p, m.n, prev, rank);
    prev.had = !!x; if (x) prev.at = rank;
    return x;
  });
}
const DAY = 86_400_000;
/** Relance réelle : plus de 3 jours sans réponse de Radia → une relance ; encore 3 jours → il s'éloigne. Renvoie l'id du nœud à livrer. */
export function relanceTarget(lastIn: string, lastAt: number, now: number, answered: boolean): string | null {
  if (answered || !lastAt || now - lastAt < 3 * DAY) return null;
  if (lastIn.startsWith('~fade')) return null;
  if (lastIn.startsWith('~rl:')) return '~fade';
  const hub = lastIn.startsWith('~') ? lastIn.split(':')[1] : lastIn;
  return hub ? `~rl:${hub}:${Math.floor(now / DAY) % 7}` : null;
}
