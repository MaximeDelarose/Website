/**
 * « Famille & proches ♡ » : maman, tante, sœur, amie de confiance — personnages FICTIFS du jeu (aucun vrai contact, rien n'est envoyé nulle part).
 * Données pures (sans DOM), entièrement testables. Aucun prénom d'enfant ni de proche réel : seulement des libellés neutres.
 *
 * Disponibilité SIMULÉE : déterministe (même créneau + même proche = même réponse), jamais présentée comme un reproche,
 * jamais de compte à rebours ni de culpabilisation. Un refus propose toujours une autre solution (plan B).
 */
export const REL_IDS = ['maman', 'tante', 'soeur', 'amie'] as const;
export type RelId = (typeof REL_IDS)[number];
export const isRelId = (v: unknown): v is RelId => typeof v === 'string' && (REL_IDS as readonly string[]).includes(v);

export type HairStyle = 'bun' | 'curly' | 'long' | 'bob';
export interface RelInfo {
  id: RelId;
  /** Nom affiché (libellé neutre). */
  label: string;
  /** Lien avec Radia. */
  role: string;
  blurb: string;
  /** Portrait dessiné (palette douce, même esprit que les décors). */
  look: { skin: string; hair: string; hairStyle: HairStyle; accent: string; cheek: string };
  /** Petites phrases de bienvenue (conversation). */
  hello: readonly string[];
}

export const RELATIVES: Record<RelId, RelInfo> = {
  maman: {
    id: 'maman', label: 'Maman', role: 'Ta maman', blurb: 'Elle a toujours une part de gâteau et un conseil doux pour toi.',
    look: { skin: '#f0c4a0', hair: '#8a7a74', hairStyle: 'bun', accent: '#f4a9c4', cheek: '#f2a4a0' },
    hello: ['Coucou ma chérie, ça me fait plaisir de te voir.', 'Viens, assieds-toi, je te sers quelque chose.', 'Tu as l’air d’avoir besoin d’un câlin. Viens là.'],
  },
  tante: {
    id: 'tante', label: 'Tata', role: 'Ta tante', blurb: 'Rieuse, toujours partante pour une aventure avec les enfants.',
    look: { skin: '#e3b08a', hair: '#3b2a24', hairStyle: 'curly', accent: '#f6c36a', cheek: '#e99a8e' },
    hello: ['Ma belle ! Tu tombes bien, j’allais t’appeler.', 'Raconte-moi tout, je suis tout ouïe.', 'Si tu as besoin d’un coup de main, tu sais que je suis là.'],
  },
  soeur: {
    id: 'soeur', label: 'Ma sœur', role: 'Ta sœur', blurb: 'Complice depuis toujours. Elle te comprend avant même que tu parles.',
    look: { skin: '#e8b995', hair: '#5a3624', hairStyle: 'long', accent: '#b9a1ec', cheek: '#ef9f96' },
    hello: ['Hey toi ! Alors, quoi de neuf ?', 'Je pensais justement à toi.', 'Dis-moi tout, je ne bouge pas.'],
  },
  amie: {
    id: 'amie', label: 'Mon amie', role: 'Ton amie de confiance', blurb: 'Celle à qui on peut tout confier. Elle adore les enfants.',
    look: { skin: '#f3d2b8', hair: '#2f2420', hairStyle: 'bob', accent: '#9ad0c8', cheek: '#f2aaa0' },
    hello: ['Coucou toi ! Je suis là si tu as besoin.', 'Ça faisait longtemps ! Tu vas bien ?', 'Je te réponds tout de suite, promis.'],
  },
};

export const relLabel = (id: RelId): string => RELATIVES[id].label;

// ------------------------------------------------------------------ disponibilité simulée

export const SLOTS = [
  { id: 'tonight', label: 'Ce soir' },
  { id: 'tomorrow', label: 'Demain' },
  { id: 'weekend', label: 'Ce week-end' },
] as const;
export type SlotId = (typeof SLOTS)[number]['id'];
export type Avail = 'free' | 'maybe' | 'busy';

const hash = (s: string): number => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };

/**
 * Disponibilité d'un proche pour un créneau (déterministe). `seed` varie d'une organisation à l'autre.
 * Garantie : pour un créneau donné, AU MOINS UN proche est libre ou « peut-être » (jamais d'impasse totale).
 */
export function availability(rel: RelId, slot: SlotId, seed: string): Avail {
  const v = (id: RelId): number => hash(`${seed}|${slot}|${id}`) % 10;
  const base = (id: RelId): Avail => { const n = v(id); return n < 4 ? 'free' : n < 6 ? 'maybe' : 'busy'; };
  const all = REL_IDS.map(base);
  if (all.every((a) => a === 'busy')) { // impasse : le proche choisi par le hasard devient « peut-être »
    const lucky = REL_IDS[hash(`${seed}|${slot}|lucky`) % REL_IDS.length];
    if (rel === lucky) return 'maybe';
  }
  return base(rel);
}

// ------------------------------------------------------------------ demander de l'aide (messages simulés)

export type Tone = 'sweet' | 'direct' | 'funny';
export const TONES: { id: Tone; label: string; text: string }[] = [
  { id: 'sweet', label: 'Doux', text: 'Coucou ♡ Auguste m’invite à sortir. Est-ce que tu pourrais t’occuper des enfants ? Tu me diras si ça te va.' },
  { id: 'direct', label: 'Direct', text: 'Salut, Auguste et moi sortons. Peux-tu garder les enfants ? Réponds-moi quand tu peux.' },
  { id: 'funny', label: 'Drôle', text: 'Mission secrète : garder trois petits monstres adorables pendant que je sors. Tu acceptes la mission ?' },
];

export interface Reply { state: 'yes' | 'later' | 'no'; text: string; /** proposition spontanée d'un autre créneau ou proche */ suggest?: { slot?: SlotId; rel?: RelId } }

const YES: Record<RelId, readonly string[]> = {
  maman: ['Bien sûr ma chérie, apporte-les. Profite bien de ta soirée.', 'Avec plaisir, je ferai des crêpes. Amuse-toi bien !'],
  tante: ['Oh oui, avec joie ! On va bien s’amuser.', 'Pas de souci, ma belle. Va, et reviens-moi toute joyeuse.'],
  soeur: ['Évidemment ! File, je gère.', 'Carrément. Et toi, tu t’amuses, c’est un ordre.'],
  amie: ['Oui, avec plaisir ! Ils sont adorables. Sors tranquille.', 'Bien sûr ! Je m’en occupe, ne t’inquiète de rien.'],
};
const LATER: Record<RelId, readonly string[]> = {
  maman: ['Je regarde mon programme et je te confirme tout à l’heure, d’accord ?', 'Peut-être, laisse-moi vérifier deux petites choses.'],
  tante: ['Hmm, je crois que oui, mais je te confirme dans un moment.', 'Laisse-moi un instant, je regarde si j’ai un truc de prévu.'],
  soeur: ['Je te dis ça dans un moment, je vérifie mon agenda.', 'Probablement oui ! Je confirme très vite.'],
  amie: ['Je pense que c’est bon, je te confirme bientôt !', 'Je regarde et je te réponds, promis.'],
};
const NO: Record<RelId, readonly string[]> = {
  maman: ['Ce soir je ne peux pas, ma chérie. Mais demande à ta sœur, elle adore ça.', 'Je suis navrée, je suis prise. Une autre fois avec grand plaisir !'],
  tante: ['Oh, ce soir je ne peux pas… Et si on faisait ça un autre jour ?', 'Pas possible aujourd’hui, mais je suis partante pour un autre créneau !'],
  soeur: ['Zut, pas possible de mon côté. Tu as pensé à demander à Maman ?', 'Je suis prise là. Mais je peux un autre jour, dis-moi !'],
  amie: ['Pas dispo sur ce créneau, désolée ! Un autre moment, avec joie.', 'Je ne peux pas là, mais n’hésite pas pour une autre fois ♡'],
};
/** Mots à ne JAMAIS employer dans une réponse (culpabilisation, reproche, pression). Vérifié par les tests. */
export const BANNED_REPLY = /(tant pis pour toi|égoïste|honte|tu aurais dû|c'est de ta faute|dépêche|vite !|dernière chance|tu ne penses qu)/i;

function pick<T>(a: readonly T[], rng: () => number): T { return a[Math.min(a.length - 1, Math.floor(rng() * a.length))]; }

/** Réponse simulée d'un proche. Un « non » propose toujours une alternative. */
export function askCare(rel: RelId, slot: SlotId, tone: Tone, seed: string, rng: () => number): Reply {
  void tone; // le ton agrémente la conversation mais ne change jamais la bienveillance de la réponse
  const a = availability(rel, slot, seed);
  if (a === 'free') return { state: 'yes', text: pick(YES[rel], rng) };
  if (a === 'maybe') return { state: 'later', text: pick(LATER[rel], rng) };
  const other = REL_IDS.find((r) => r !== rel && availability(r, slot, seed) !== 'busy');
  const slotAlt = SLOTS.map((s) => s.id).find((s) => s !== slot && availability(rel, s, seed) !== 'busy');
  return { state: 'no', text: pick(NO[rel], rng), suggest: { rel: other, slot: slotAlt } };
}

/** « Peut-être » → confirmation plus tard : OUI si le hasard déterministe le veut, sinon un gentil non avec alternative. */
export function confirmLater(rel: RelId, slot: SlotId, seed: string): 'yes' | 'no' { return hash(`${seed}|confirm|${slot}|${rel}`) % 3 === 0 ? 'no' : 'yes'; }

// ------------------------------------------------------------------ plan B

export type CareOutcome = 'arranged' | 'family' | 'postponed';
export const PLAN_B = [
  { id: 'other-rel', label: 'Demander à quelqu’un d’autre', hint: 'Un autre proche est peut-être disponible.' },
  { id: 'other-slot', label: 'Choisir un autre créneau', hint: 'Ce soir, demain ou ce week-end.' },
  { id: 'family', label: 'Une sortie en famille', hint: 'On emmène les enfants, tous ensemble.' },
  { id: 'postpone', label: 'Reporter à plus tard', hint: 'Aucun souci : l’invitation reste dans ton téléphone.' },
] as const;
export type PlanBId = (typeof PLAN_B)[number]['id'];

export const CARE_OUTCOME_TEXT: Record<CareOutcome, string> = {
  arranged: 'Tout est organisé. Les enfants sont entre de bonnes mains ♡',
  family: 'Sortie en famille : les enfants viennent aussi, ce sera une belle journée.',
  postponed: 'Report décidé sans stress : tu pourras y revenir quand tu le souhaites ♡',
};
