import type { EventDef } from '../types';
import { ROMANTIC } from './romantic';
import { FAMILY, FAMILY_RELATIVES } from './family';
import { CAREER_EVENTS } from './career';
import { GOLDEN } from './golden';
import { SECRET } from './secret';
import { NECKLACE_EVENT } from '../necklace/event';
export { SECRET_ID } from './secret';

export const EVENTS: EventDef[] = [...ROMANTIC, ...FAMILY, ...FAMILY_RELATIVES, ...CAREER_EVENTS, ...GOLDEN, SECRET, NECKLACE_EVENT];
const BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
export const eventById = (id: string): EventDef | undefined => BY_ID.get(id);

/** Petits messages du téléphone (discrets, sans pénalité). `from` = expéditeur ; aucun prénom en clair. */
/** Seuls les contacts qui ont une conversation dans Messages peuvent écrire (sinon le message serait invisible). */
export const SMALL_MESSAGES: { from: 'auguste' | 'kid1' | 'kid2' | 'kid3' | 'maman'; text: string }[] = [
  { from: 'auguste', text: 'Je pense à toi. C’est tout. Voilà, c’est dit ♡' },
  { from: 'auguste', text: 'Si tu lis ça, c’est que tu es en train de sourire. Je le sais.' },
  { from: 'auguste', text: 'Pause eau, pause respiration, puis tu reviens conquérir ton petit monde.' },
  { from: 'auguste', text: 'Je suis fier de toi. Même quand tu ne le sais pas.' },
  { from: 'auguste', text: 'J’ai vu ton château. Je te laisse décorer, je ne touche à rien.' },
  { from: 'auguste', text: 'Tu me manques un peu. Beaucoup. Passionnément. Tu choisis.' },
  { from: 'auguste', text: 'Qu’Allah t’apporte une belle journée. Moi, je suis là, inchallah.' },
  { from: 'auguste', text: 'Je t’ai préparé une surprise. Je ne dis pas laquelle. Ni quand.' },
  { from: 'auguste', text: 'Mashallah, ton château devient magnifique. Je passe juste te le dire.' },
  { from: 'auguste', text: 'Bsahték pour aujourd’hui : tu as bien travaillé, tu peux souffler.' },
  { from: 'auguste', text: 'Wallah, je pensais à toi à l’instant. Coïncidence ? Je ne crois pas.' },
  { from: 'auguste', text: 'Twahechtek. Voilà, c’est dit, je retourne travailler.' },
  { from: 'auguste', text: 'Un petit message pour te dire de ne pas oublier de manger. Sahha !' },
  { from: 'kid1', text: 'Maman, regarde mon dessin !' },
  { from: 'kid2', text: 'Maman, tu rentres quand ? On a tout rangé (presque).' },
  { from: 'kid3', text: 'Maman, j’ai trouvé un nouveau jeu. Tu veux essayer ?' },
  { from: 'kid1', text: 'Câlin ! ♡' },
  { from: 'maman', text: 'Coucou ma chérie, j’ai pensé à toi ce matin ♡' },
  { from: 'maman', text: 'N’oublie pas de bien manger, tu as l’air fatiguée sur les photos.' },
];
