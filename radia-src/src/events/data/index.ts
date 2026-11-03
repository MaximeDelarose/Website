import type { EventDef } from '../types';
import { ROMANTIC } from './romantic';
import { FAMILY } from './family';
import { CAREER_EVENTS } from './career';
import { GOLDEN } from './golden';

export const EVENTS: EventDef[] = [...ROMANTIC, ...FAMILY, ...CAREER_EVENTS, ...GOLDEN];
const BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
export const eventById = (id: string): EventDef | undefined => BY_ID.get(id);

/** Petits messages du téléphone (discrets, sans pénalité). `from` = expéditeur ; aucun prénom en clair. */
export const SMALL_MESSAGES: { from: 'auguste' | 'kid1' | 'kid2' | 'kid3'; text: string }[] = [
  { from: 'auguste', text: 'Je pense à toi. C’est tout. Voilà, c’est dit ♡' },
  { from: 'auguste', text: 'Si tu lis ça, c’est que tu es en train de sourire. Je le sais.' },
  { from: 'auguste', text: 'Pause eau, pause respiration, puis tu reviens conquérir ton petit monde.' },
  { from: 'auguste', text: 'Je suis fier de toi, galbi. Même quand tu ne le sais pas.' },
  { from: 'auguste', text: 'J’ai vu ton château. Je te laisse décorer, je ne touche à rien.' },
  { from: 'auguste', text: 'Tu me manques un peu. Beaucoup. Passionnément. Tu choisis.' },
  { from: 'auguste', text: 'Qu’Allah t’apporte une belle journée. Moi, je suis là, inchallah.' },
  { from: 'auguste', text: 'Je t’ai préparé une surprise. Je ne dis pas laquelle. Ni quand.' },
  { from: 'kid1', text: 'Maman, regarde mon dessin !' },
  { from: 'kid2', text: 'Maman, tu rentres quand ? On a tout rangé (presque).' },
  { from: 'kid3', text: 'Maman, j’ai trouvé un nouveau jeu. Tu veux essayer ?' },
  { from: 'kid1', text: 'Câlin ! ♡' },
];
