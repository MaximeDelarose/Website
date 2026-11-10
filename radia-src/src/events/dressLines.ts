/**
 * Compliments d'Auguste au dressing (« 10 / 10 » toujours, quelle que soit la tenue).
 * Pur (aucun DOM) : testable. La note est une réaction affectueuse, jamais une évaluation.
 */
import type { Look } from '../data/world/ids';

import { PARTNER } from '../config/gift';
export const VERDICT_NOTE = 10;
export const VERDICT_FIRST = 'MachaAllah, galbi… T’es magnifique.';
export const VERDICT_SECOND = 'Enfin, ça, je le savais déjà. Mais là, franchement… 10 sur 10.';

/** Variantes de compliments (toutes positives, aucune critique possible). */
export const VERDICT_EXTRAS = [
  'Je crois que je vais avoir du mal à manger avec toi en face de moi.',
  'Tu entres dans une pièce et la pièce se tait. C’est un talent.',
  'Les lustres du palace vont être jaloux ce soir.',
  'Tourne encore une fois… pour la science.',
  'Je suis officiellement l’homme le plus chanceux de Paris.',
  'Quoi que tu aies choisi, ça te va comme si ça avait été inventé pour toi.',
  'Mon cœur vient de faire un petit bruit bizarre. C’est normal, ne t’inquiète pas.',
  'Tu veux bien me prévenir la prochaine fois que tu es aussi belle ? Je me préparerais.',
  'Mashallah, tu vas faire des jaloux.',
  'Bsahték, cette tenue, vraiment.',
] as const;

/** Compliments adaptés à ce qu'elle porte (jamais de critique, jamais d'absence de compliment). */
export function specificCompliments(look: Look): string[] {
  const out: string[] = [];
  if (look.dress) out.push('Cette robe… je n’ai plus de mots. Enfin si : MachaAllah.');
  if (look.shoes && /^sh-(heels|strappy|sandals|platform)/.test(look.shoes)) out.push('Et les chaussures ! Tu vas faire tourner toutes les têtes.');
  if (look.shoes === 'sh-sneakers-white') out.push('Des baskets blanches avec ce sourire : impossible de faire mieux.');
  if (look.acc.some((a) => a.startsWith('hd-'))) out.push('Ce petit détail dans les cheveux… tu l’as fait exprès pour me faire fondre ?');
  if (look.acc.some((a) => a.startsWith('br-'))) out.push('Et ce bracelet qui brille à ton poignet… il te va à ravir.');
  if (look.acc.some((a) => a.startsWith('ea-') || a === 'ac-hoops')) out.push('Les boucles d’oreilles… tu sais que tu fais exprès, hein ?');
  if (look.acc.some((a) => a.startsWith('lp-'))) out.push(`Cette couleur sur tes lèvres… concentre-toi, ${PARTNER}, concentre-toi.`);
  if (look.crown) out.push('Une couronne ? Pour une fois, le protocole est respecté.');
  if (look.bag) out.push('Le petit sac est parfait. Tout est parfait, en fait.');
  return out;
}

export interface Verdict { note: number; lines: string[] }

/** Toujours 10/10. `r` ∈ [0,1[ choisit les variantes. */
export function verdictFor(look: Look, rnd: () => number): Verdict {
  const specific = specificCompliments(look);
  const lines = [VERDICT_FIRST, VERDICT_SECOND];
  const extras: string[] = [];
  if (specific.length) extras.push(specific[Math.floor(rnd() * specific.length)]);
  extras.push(VERDICT_EXTRAS[Math.floor(rnd() * VERDICT_EXTRAS.length)]);
  return { note: VERDICT_NOTE, lines: [...lines, ...extras] };
}
