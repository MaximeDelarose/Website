/** La quête secrète « Une soirée avec A ♡ » : appel vocal, dressing, restaurant de palace, photos, bracelet. */
import type { EventDef } from '../types';

import { PARTNER, PARTNER_DE_TYPO } from '../../config/gift';
export const SECRET_ID = 's-evening';

export const SECRET: EventDef = {
  id: SECRET_ID, title: 'Une soirée avec A ♡', sender: 'auguste', senderLabel: 'A', category: 'romantic',
  big: false, repeatable: true, weight: 0,
  teaser: 'A t’a laissé un message vocal ♡',
  invite: 'Un appel de A : une soirée surprise t’attend. Mets-toi sur ton trente et un !',
  phases: [
    { label: 'Se préparer', goal: 'Choisis ta tenue pour la soirée', from: 0 },
    { label: `Rejoindre ${PARTNER}`, goal: 'Direction le restaurant du palace', from: 2 },
    { label: 'Dîner', goal: `Choisis ton menu… et devine celui ${PARTNER_DE_TYPO}`, from: 4 },
    { label: 'Séance photo', goal: `Pose avec ${PARTNER} devant l’objectif`, from: 6 },
    { label: 'La surprise', goal: `${PARTNER} a encore un petit quelque chose pour toi`, from: 8 },
  ],
  steps: [
    { t: 'dress', hint: 'Mets-toi sur ton trente et un ♡', style: 'chic' },
    { t: 'activity', id: 'dressVerdict' },
    { t: 'travel', place: 'palace', label: 'Direction le restaurant du palace' },
    { t: 'scene', lines: [
      { who: 'narrator', text: 'Des lustres, des fleurs roses, de grandes fenêtres sur Paris la nuit…' },
      { who: 'auguste', text: 'Après toi, ma reine.', expr: 'love' },
    ] },
    { t: 'activity', id: 'menuPick', params: { menu: 'palace' } },
    { t: 'activity', id: 'guessMenu', params: { lines: 'secret' } },
    { t: 'scene', lines: [
      { who: 'auguste', text: 'Bon, tu te souviens de ce que je t’ai dit au téléphone ? J’ai prévu un photographe.', expr: 'tease' },
      { who: 'auguste', text: 'Faut qu’on soit le meilleur duo de la soirée, galbi.', expr: 'laugh' },
    ] },
    { t: 'activity', id: 'photoShoot', params: { title: 'Une soirée avec A ♡' } },
    { t: 'activity', id: 'braceletReveal' },
  ],
  // le bracelet n'est donné qu'une fois (les rejeux ne redonnent ni objet ni récompense)
  reward: { coins: 100, diamonds: 15, cloth: ['br-promise'] },
  replayReward: {},
  memoryTitle: 'Une promesse au poignet ♡',
  achievements: ['ev_promise'],
};

/** « Revoir la scène » du bracelet depuis le souvenir : même cérémonie, aucune récompense ni nouvel objet. */
export const SECRET_SCENE: EventDef = {
  id: 's-replay', title: 'Une promesse au poignet ♡', sender: 'auguste', category: 'romantic', big: false, repeatable: false, weight: 0, ephemeral: true,
  teaser: '', invite: '',
  steps: [{ t: 'activity', id: 'braceletReveal', params: { replay: true } }],
  reward: {}, memoryTitle: 'Une promesse au poignet ♡',
};
