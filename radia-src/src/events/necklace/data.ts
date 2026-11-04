/**
 * « L'Éclat Éternel ♡ » : textes et constantes (données pures, sans DOM).
 * Les répliques ci-dessous sont exactement celles du cahier : ne pas les reformuler.
 */
import { NECKLACE_ID } from '../../data/world/ids';
export { NECKLACE_ID };

export const NECKLACE_EVENT_ID = 'n-eclat';
export const NECKLACE_REPLAY_ID = 'n-eclat-replay';
export const NECKLACE_NAME = 'L’Éclat Éternel ♡';
export const NECKLACE_RARITY = 'Légendaire';
export const NECKLACE_DESC = 'Chaîne fine en or blanc, diamants qui scintillent et grand diamant central taillé en cœur. Un bijou unique, offert un soir où le ciel portait ton prénom.';

/** Réglages du déclencheur automatique. */
export const LAUNCH_TARGET = 7;
export const LAUNCH_DEBOUNCE_MS = 30 * 60_000;
export const ACTIVE_DELAY_MS = 5 * 60_000;
/** Rappel discret de l'invitation « plus tard » (temps de jeu actif). */
export const REMIND_EVERY_MS = 45 * 60_000;

export const INVITE_SENDER = 'A ♡';
export const INVITE_TITLE = 'Une soirée rien que pour toi ♡';
export const INVITE_TEXT = 'J’ai quelque chose à te montrer ce soir. Mets une jolie tenue, je t’emmène voir un spectacle que j’ai préparé rien que pour toi.';

export const DRESS_HINT = 'Une soirée exceptionnelle t’attend : choisis ce qui te fait te sentir belle ♡';
export const TRAVEL_LABEL = 'Direction la terrasse…';
export const WOW_LINES = [
  'Ah ouais… t’es vraiment magnifique comme ça.',
  'Allez, viens. J’ai quelque chose à te montrer.',
] as const;

export const SKY_LINE = 'Regarde le ciel, j’ai préparé quelque chose pour toi.';
export const MESSAGE_TEXT = 'RADIA';

export const DECLARATION = [
  'Tu sais… j’avais envie de faire quelque chose que tu n’oublierais pas.',
  'Alors j’ai passé du temps à imaginer tout ce petit monde pour toi.',
  'Les détails, les souvenirs, les fleurs, les chocolats… Je voulais que tu retrouves ici des petites choses qui te ressemblent.',
  'Et j’ai encore une dernière surprise.',
] as const;

export const GIFT_LINES = [
  'Ce collier, tu ne pouvais pas l’acheter dans le jeu.',
  'Parce que je voulais être celui qui te l’offre, un jour, au moment que j’aurais choisi.',
  'Et je voulais qu’il représente quelque chose de plus précieux que les diamants.',
  'Tout le temps, toute l’attention et tout le cœur que j’ai mis dans ce monde pour toi.',
  'Je ne sais pas ce que demain nous réserve… Mais je veux que tu saches à quel point ce que je fais pour toi est sincère.',
  'Ce collier, c’est juste un petit éclat de tout ce que j’avais envie de t’offrir.',
] as const;

export const OBTAINED = 'L’Éclat Éternel ♡ obtenu !';
export const WEAR_QUESTION = 'Veux-tu porter ton collier ?';
export const WEAR_YES = 'Le porter ♡';
export const WEAR_NO = 'Le garder dans mon dressing';
export const OPEN_BOX = 'Ouvrir l’écrin ♡';

/** Souvenir de l'album. */
export const MEMORY_ID = 'eclat';
export const MEMORY_TITLE = 'Le ciel portait ton prénom ♡';
export const MEMORY_DESC = 'Une terrasse sur Paris, un ciel plein d’étoiles, et des feux d’artifice qui ont écrit RADIA ❤️ rien que pour toi.';
export const ACHIEVEMENT_ID = 'ev_eclat';
export const ACHIEVEMENT_NAME = 'Un éclat rien que pour toi';
export const ACHIEVEMENT_DESC = 'Recevoir L’Éclat Éternel ♡.';

/** Vitrine du dressing (objet verrouillé). */
export const SHOWCASE_PRICE = 'Prix : Inestimable ♡';
export const SHOWCASE_NOTE = 'Ce bijou ne s’achète pas. Il s’offre avec le cœur.';
export const SHOWCASE_BUTTON = 'Cadeau mystérieux — Verrouillé';

/** Mots qui ne doivent JAMAIS apparaître dans l'invitation ni la notification (surprise préservée). */
export const SPOILER_WORDS = ['collier', 'bijou', 'diamant', 'éclat', 'eclat', 'pendentif', 'écrin', 'ecrin', 'cadeau'] as const;
