/**
 * Invitations dorées : rares, jamais limitées dans le temps. « Plus tard » ne fait rien perdre :
 * l'enveloppe reste dans le téléphone tant qu'elle n'est pas ouverte.
 */
import type { EventDef } from '../types';

export const GOLDEN: EventDef[] = [
  {
    id: 'g-day', title: 'Une journée surprise avec Auguste ♡', sender: 'auguste', category: 'golden', golden: true, big: true, repeatable: false, weight: 3, minPlayMin: 25,
    needs: { doneAll: ['r-restaurant'] },
    teaser: 'Galbi, pour une fois, ne prévois rien.',
    invite: 'Galbi, pour une fois, ne prévois rien. J’ai organisé toute une journée pour toi.',
    steps: [
      { t: 'scene', lines: [
        { who: 'narrator', text: 'Ce matin-là, un message, une enveloppe dorée, et plus aucun programme.' },
        { who: 'auguste', text: 'Aujourd’hui, tu ne gères rien. Ni les autres, ni la logistique. Juste toi. Et moi qui te suis.', expr: 'love' },
      ] },
      { t: 'dress', hint: 'Une tenue pour la grande journée', style: 'chic' },
      { t: 'travel', place: 'boutique', label: 'Première étape : le shopping' },
      { t: 'activity', id: 'shopTry', params: { options: ['sh-heels-gold', 'bg-pearl-clutch', 'dr-white-gown', 'jk-cropped-pink'] } },
      { t: 'travel', place: 'restaurant', label: 'Deuxième étape : le restaurant' },
      { t: 'activity', id: 'menuPick', params: { menu: 'restaurant' } },
      { t: 'activity', id: 'guessMenu' },
      { t: 'travel', place: 'palace', label: 'Dernière étape : le palace' },
      { t: 'scene', lines: [{ who: 'auguste', text: 'Le palace pour finir. Parce que tu mérites un dernier tour d’honneur, ma reine.', expr: 'love' }] },
      { t: 'photo', place: 'palace', title: 'La journée surprise', withAuguste: true },
    ],
    reward: { coins: 500, diamonds: 40, cloth: ['bg-pearl-clutch'] }, memoryTitle: 'La journée surprise', achievements: ['ev_golden'],
  },
];
