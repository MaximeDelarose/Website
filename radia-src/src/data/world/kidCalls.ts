/**
 * Les petits appels « Maman ! » : de temps en temps, pendant qu'elle joue, les enfants
 * demandent un coup de main (déposer à l'école, faire à manger, calmer une chamaillerie).
 * Aucune pénalité : si Radia est occupée, la bulle s'en va toute seule.
 * Les prénoms ne sont JAMAIS écrits ici : ils arrivent par `name()` (données chiffrées,
 * libellés neutres sans la clé).
 */
import type { KidId } from './ids';

export interface CallLine { kid: KidId; text: string }
export interface CallDef {
  id: string;
  kids: KidId[];
  cta: string;
  done: string;
  coins: number;
  /** Si on la fait attendre, l'enfant redemande aussitôt, de plus en plus fort (aucune pénalité). */
  escalate?: boolean;
  lines: (name: (k: KidId) => string, says: (k: KidId) => string[], pick: <T>(a: T[]) => T) => CallLine[];
}

const up = (s: string) => s.toUpperCase();

export const CALLS: CallDef[] = [
  {
    id: 'hungry', kids: ['kid1', 'kid2'], cta: 'Préparer à manger', done: 'Miam ! Un bon repas, et tout le monde sourit ♡', coins: 15,
    lines: (n, _s, _p) => [
      { kid: 'kid1', text: 'MAMANNN !' },
      { kid: 'kid2', text: `Maman, ${n('kid1')} a faim !` },
    ],
  },
  {
    id: 'school', kids: ['kid2', 'kid3'], cta: 'Les déposer à l\'école', done: 'Déposées à l\'heure, cartable sur le dos. Bonne journée ♡', coins: 15,
    lines: () => [
      { kid: 'kid3', text: 'Maman, on va être en retard à l\'école !' },
      { kid: 'kid2', text: 'Dépêche-toi, maman !' },
    ],
  },
  {
    id: 'tease', kids: ['kid1', 'kid2', 'kid3'], cta: 'Calmer tout le monde', done: 'Un gros câlin, et la paix est revenue ♡', coins: 10,
    lines: (n) => [
      { kid: 'kid3', text: up(`Maman, ${n('kid1')} nous embête !`) },
      { kid: 'kid2', text: 'MAMAN, ARRÊTE !' },
    ],
  },
  {
    id: 'cuddle', kids: ['kid1'], cta: 'Faire un câlin', done: 'Voilà ! Un grand sourire et un gros câlin ♡', coins: 10, escalate: true,
    lines: (_n, says, pick) => {
      const own = says('kid1');
      return [{ kid: 'kid1', text: own.length ? pick(own) : 'MAMANNN !' }];
    },
  },
  {
    id: 'dinner', kids: ['kid2', 'kid3'], cta: 'Faire à manger', done: 'Le repas est servi. Ça sent très bon ♡', coins: 15,
    lines: () => [
      { kid: 'kid2', text: 'C\'est l\'heure de manger, maman !' },
      { kid: 'kid3', text: 'J\'ai trop faim !' },
    ],
  },
  {
    id: 'story', kids: ['kid1'], cta: 'Lire une histoire', done: 'Une belle histoire, et les yeux se ferment doucement ♡', coins: 10,
    lines: (_n, says, pick) => {
      const own = says('kid1');
      return [{ kid: 'kid1', text: 'MAMANNN !' }, { kid: 'kid1', text: own.length ? pick(own) : 'Histoire, maman !' }];
    },
  },
];
