import type { Node, Profile } from './types';
import { PROFILES_A } from './profilesA';
import { PROFILES_B } from './profilesB';
import { PROFILES_C } from './profilesC';
import { dynNode, extrasFor } from '../../../apps/brain/tindeurNodes';

/** Tous les profils fictifs (hommes adultes imaginaires). */
export const PROFILES: Profile[] = [...PROFILES_A, ...PROFILES_B, ...PROFILES_C];
const byId = new Map(PROFILES.map((p) => [p.id, p]));
export const profileById = (id: string): Profile | undefined => byId.get(id);
const authored = (p: Profile, id: string): Node | undefined => p.nodes.find((n) => n.id === id);
const dynCache = new Map<string, Node | undefined>();
/**
 * Un nœud de conversation : écrit à la main (auquel on ajoute les réponses « en plus » : famille, amitié, Snapchien) ou dynamique (« ~… »,
 * régénéré à l'identique depuis son identifiant : voir src/apps/brain/tindeurNodes.ts).
 */
export function nodeOf(p: Profile, id: string): Node | undefined {
  if (id.charCodeAt(0) === 126) {
    const k = `${p.id}|${id}`;
    if (!dynCache.has(k)) dynCache.set(k, dynNode(p, id, (x) => authored(p, x)));
    return dynCache.get(k);
  }
  const n = authored(p, id);
  if (!n || n.end || !n.ch.length) return n;
  return { ...n, ch: [...n.ch, ...extrasFor(p, n)] };
}
/** Le nœud écrit à la main (sans réponses « en plus »), pour les statistiques et les fins. */
export const authoredNode = authored;
/** Ordre des premières cartes : de bonnes accroches, puis le reste est mélangé. */
export const OPENING = ['kevin', 'hugo', 'maxime'];

/** Phrases de notification (le match « t'écrit » pendant que Radia joue ailleurs). */
export const PINGS: Record<string, string> = {
  kevin: 'Kevin veut te montrer son nouveau tracteur.', dylan: 'Dylan voudrait te présenter son projet (le troisième).',
  maxime: 'Maxime t’a envoyé un message.', thomas: 'Thomas t’a écrit, en toute transparence.',
  jordan: 'Jordan t’a écrit. Il est différent des autres.', julien: 'Julien a quelque chose à te raconter. Sur lui.',
  nicolas: 'Nicolas t’a préparé un programme.', alexandre: 'Alexandre a repéré un restaurant pour toi.',
  baptiste: 'Baptiste a un petit critère de plus à te soumettre.', hugo: 'Hugo t’a écrit, tranquillement.',
  theo: 'Théo a écrit, finalement. Ou pas. Si, il a écrit.', lucas: 'Lucas t’invite à rejoindre sa partie.',
  antoine: 'Antoine t’a laissé un petit mot.', romain: 'Romain a un avis sur ton avis.',
  mathieu: 'Mathieu ne dit rien, mais il a écrit.', florian: 'Florian t’a écrit. En toute sincérité.',
  clement: 'Clément te donne des nouvelles de Gérard.', pierre: 'Pierre a une blague. Elle est nulle.',
  samuel: 'Samuel a écrit une chanson. Et un message.', victor: 'Victor t’a écrit. Il est prêt.',
  adrien: 'Adrien dit que Mercure est rétrograde.', paul: 'Paul a écrit un message. (Version 4.)',
  karim: 'Karim t’a gardé une part de gâteau.', leo: 'Léo a une nouvelle idée de métier.',
};
export const pingText = (p: Profile): string => PINGS[p.id] ?? `${p.name} t’a envoyé un message.`;
