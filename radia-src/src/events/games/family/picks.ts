/**
 * Choix partagés des événements de famille (« goûter chez maman », « cadeau de voyage », « retrouvailles »).
 * Données pures : chaque préréglage est une suite d'étapes « choisis N éléments » ; le proche réagit à chaque choix.
 * Aucune mauvaise réponse : tout choix est bien reçu (ton chaleureux), seul le détail de la réaction change.
 */
import type { RelId } from '../../../data/family/relatives';

export interface PickOption { id: string; emoji: string; label: string; react: string }
export interface PickStep { prompt: string; count: number; options: readonly PickOption[] }
export interface PickPreset { id: string; rel: RelId; title: string; sub: string; intro: string; steps: readonly PickStep[]; endTitle: string; endLines: readonly string[] }

const O = (id: string, emoji: string, label: string, react: string): PickOption => ({ id, emoji, label, react });

export const PICK_PRESETS: Record<string, PickPreset> = {
  tea: {
    id: 'tea', rel: 'maman', title: 'Le goûter de maman', sub: 'Un moment rien que pour vous deux',
    intro: 'Maman a sorti la jolie vaisselle. Aide-la à composer le plateau du goûter !',
    steps: [
      { prompt: 'Que mettez-vous sur la table ?', count: 3, options: [
        O('tea', '🍵', 'Thé à la menthe', 'Le thé à la menthe, rien de tel pour bavarder.'),
        O('honey', '🍯', 'Gâteaux au miel', 'Ceux-là, je les ai faits ce matin, goûte !'),
        O('crepes', '🥞', 'Crêpes', 'Des crêpes ! Tu en faisais déjà la queue quand tu étais petite.'),
        O('fruit', '🍓', 'Fruits frais', 'Des fruits frais, bonne idée, ça fait du bien.'),
        O('coffee', '☕', 'Café', 'Un petit café, oui. Doucement, pour que ça dure.'),
        O('juice', '🧃', 'Jus d’orange', 'Un jus bien frais pour les petits, ils vont adorer.'),
        O('madeleine', '🥐', 'Madeleines', 'Mes madeleines… tu les reconnais avant même de les goûter.'),
        O('dates', '🌴', 'Dattes et amandes', 'Les dattes, c’est parfait avec le thé.'),
      ] },
    ],
    endTitle: 'Un goûter de rêve ♡',
    endLines: ['Le plateau est prêt, ça sent bon dans toute la maison.', 'Maman sourit : « Ça me fait tellement plaisir de te voir. »'],
  },
  farewell: {
    id: 'farewell', rel: 'maman', title: 'Un petit cadeau pour le voyage', sub: 'Avant l’embarquement',
    intro: 'Maman part pour un voyage. Choisis un petit cadeau et un mot doux pour l’accompagner.',
    steps: [
      { prompt: 'Quel cadeau glisses-tu dans son sac ?', count: 1, options: [
        O('scarf', '🧣', 'Une écharpe douce', 'Elle sentira ton parfum, ça me fera du bien.'),
        O('book', '📖', 'Un livre', 'Un livre ! Je le lirai dans l’avion en pensant à toi.'),
        O('choc', '🍫', 'Des chocolats', 'Des chocolats… je ne vais pas résister jusqu’à l’arrivée.'),
        O('photo', '🖼️', 'Une photo de vous', 'Oh, une photo. Je la garde près de moi, toujours.'),
        O('bracelet', '📿', 'Un petit bracelet', 'Il est magnifique, je le porterai tout le voyage.'),
        O('soap', '🧼', 'Un savon de l’Atelier', 'Un savon parfumé, quelle délicate attention !'),
      ] },
      { prompt: 'Et un petit mot, que dis-tu ?', count: 1, options: [
        O('sweet', '💌', 'Je penserai à toi chaque jour', 'Moi aussi, ma chérie. Chaque jour.'),
        O('funny', '😄', 'Rapporte-moi des souvenirs !', 'Promis, je ramène des souvenirs et des histoires.'),
        O('calm', '🌿', 'Fais bon voyage, sans stress', 'Merci, tu as raison. Je respire et je pars sereine.'),
      ] },
    ],
    endTitle: 'Un départ plein de tendresse ♡',
    endLines: ['Le cadeau est glissé dans le sac, le mot dans la poche.', 'Maman te serre fort dans ses bras avant de passer la porte.'],
  },
  welcome: {
    id: 'welcome', rel: 'maman', title: 'Les retrouvailles', sub: 'Elle est de retour',
    intro: 'Maman revient de voyage ! Prépare un petit accueil pour fêter ça.',
    steps: [
      { prompt: 'Quelle attention lui prépares-tu ?', count: 2, options: [
        O('flowers', '💐', 'Un bouquet', 'Des fleurs ! Elles embaument tout le hall.'),
        O('sign', '🪧', 'Une pancarte « Bienvenue »', 'Oh, une pancarte ! Tout le monde me regarde, j’adore.'),
        O('hug', '🤗', 'Un long câlin', 'Rien ne vaut un câlin comme celui-là.'),
        O('choc', '🍬', 'Une petite gourmandise', 'Tu as pensé à tout, ma chérie.'),
        O('cards', '🃏', 'Les dessins des enfants', 'Leurs dessins… je les accroche dès ce soir.'),
        O('tea', '🍵', 'Un thé chaud pour la route', 'Un thé chaud, exactement ce qu’il me fallait.'),
      ] },
    ],
    endTitle: 'Quel beau retour ♡',
    endLines: ['Maman a raconté son voyage jusque dans la voiture.', '« On se refait ça bientôt, une petite sortie ensemble ? »'],
  },
};

export const pickPreset = (id: string): PickPreset => PICK_PRESETS[id] ?? PICK_PRESETS.tea;
