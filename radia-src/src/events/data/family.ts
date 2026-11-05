/**
 * Invitations des enfants (personnages de jeu, adaptées à leurs âges, ton toujours positif).
 * Les prénoms ne sont jamais écrits ici : les locuteurs sont 'kid1' | 'kid2' | 'kid3' et le nom vient du jeu (données chiffrées).
 */
import type { EventDef, StepCond } from '../types';

export const FAMILY: EventDef[] = [
  {
    id: 'f-bouquet', title: 'Un bouquet à composer', sender: 'kid1', category: 'family', big: true, repeatable: true, weight: 9, minPlayMin: 5,
    teaser: 'Maman, on fait un bouquet ?',
    invite: 'Maman, on fait un bouquet ?',
    steps: [
      { t: 'scene', lines: [{ who: 'kid1', text: 'Les fleurs ! Les couleurs ! Maman, viens !' }] },
      { t: 'activity', id: 'bouquet', params: { mode: 'kid' } },
      { t: 'scene', lines: [{ who: 'kid1', text: 'Il est trop joli !!' }] },
      { t: 'photo', place: 'garden', title: 'Notre bouquet', withKids: ['kid1'] },
    ],
    reward: { coins: 70, flowers: 4, furniture: ['flowerbed'] }, replayReward: { coins: 25, flowers: 2 },
    memoryTitle: 'Notre bouquet', achievements: ['ev_family'],
  },
  {
    id: 'f-fashion', title: 'Séance mode', sender: 'kid2', category: 'family', big: true, repeatable: true, weight: 8, minPlayMin: 6,
    teaser: 'Maman, viens, on fait des looks !',
    invite: 'Maman, viens, on fait des looks !',
    steps: [
      { t: 'scene', lines: [{ who: 'kid2', text: 'J’ai trois thèmes pour toi. Tu vas voir, c’est facile… enfin presque !' }] },
      { t: 'activity', id: 'fashionThemes' },
      { t: 'scene', lines: [{ who: 'kid2', text: 'Bon, ça passe. Tu as du style, maman.' }] },
      { t: 'photo', place: 'home', title: 'Séance mode', withKids: ['kid2'] },
    ],
    reward: { coins: 80, fabric: 3, cloth: ['gl-heart-pink'] }, replayReward: { coins: 30, fabric: 1 },
    memoryTitle: 'Séance mode', achievements: ['ev_family'],
  },
  {
    id: 'f-challenge', title: 'Le défi surprise', sender: 'kid3', category: 'family', big: true, repeatable: true, weight: 8, minPlayMin: 7,
    teaser: 'Maman, j’ai un défi pour toi !',
    invite: 'Maman, j’ai un défi pour toi !',
    steps: [
      { t: 'scene', lines: [{ who: 'kid3', text: 'Un défi de mémoire. Tu ne vas pas y arriver… ou peut-être que si.' }] },
      { t: 'activity', id: 'memoryChallenge', params: { kid: 'kid3', level: 2 } },
      { t: 'scene', lines: [{ who: 'kid3', text: 'Pas mal du tout, maman !' }] },
      { t: 'photo', place: 'home', title: 'Le défi', withKids: ['kid3'] },
    ],
    reward: { coins: 70, diamonds: 3, furniture: ['game-shelf'] }, replayReward: { coins: 25 },
    memoryTitle: 'Le défi', achievements: ['ev_family'],
  },
  {
    id: 'f-garden', title: 'Fête dans le jardin', sender: 'kid1', category: 'family', big: true, repeatable: true, weight: 6, minPlayMin: 14,
    needs: { doneAll: ['f-bouquet'] },
    teaser: 'Maman, on fait une fête dans le jardin ?',
    invite: 'Maman, on fait une fête dans le jardin ? Avec tout le monde !',
    steps: [
      { t: 'travel', place: 'garden', label: 'Direction le jardin' },
      { t: 'scene', lines: [
        { who: 'kid1', text: 'Une fête ! Une fête !' },
        { who: 'kid2', text: 'On installe la table, et toi tu fais les bouquets, maman.' },
        { who: 'kid3', text: 'Et les chocolats, on n’oublie pas les chocolats.' },
      ] },
      { t: 'activity', id: 'decorTable', params: { mode: 'garden' } },
      { t: 'activity', id: 'bouquet', params: { mode: 'kid' } },
      { t: 'activity', id: 'chocolateBox' },
      { t: 'photo', place: 'garden', title: 'La fête du jardin', withAuguste: false, withKids: ['kid1', 'kid2', 'kid3'] },
    ],
    reward: { coins: 150, flowers: 6, cocoa: 3, diamonds: 5 }, replayReward: { coins: 45, flowers: 2 },
    memoryTitle: 'La fête du jardin', achievements: ['ev_family'],
  },
  {
    id: 'f-pajama', title: 'Soirée pyjama', sender: 'kid2', category: 'family', big: true, repeatable: true, weight: 6, minPlayMin: 16,
    teaser: 'Maman, ce soir c’est soirée pyjama !',
    invite: 'Maman, ce soir c’est soirée pyjama ! On décore le salon et on choisit un jeu.',
    steps: [
      { t: 'dress', hint: 'Choisis ton pyjama pour la soirée', style: 'casual' },
      { t: 'travel', place: 'pajama', label: 'On rejoint le salon' },
      { t: 'activity', id: 'decorTable', params: { mode: 'pajama' } },
      { t: 'activity', id: 'memoryChallenge', params: { kid: 'kid1', level: 1 } },
      { t: 'scene', lines: [{ who: 'kid2', text: 'Encore un film après ? Pas de pression, on est bien là.' }] },
      { t: 'photo', place: 'pajama', title: 'Soirée pyjama', withKids: ['kid1', 'kid2', 'kid3'] },
    ],
    reward: { coins: 140, diamonds: 5, cloth: ['dr-pajama-stars'] }, replayReward: { coins: 40 },
    memoryTitle: 'Soirée pyjama', achievements: ['ev_family'],
  },
];

// ------------------------------------------------------------------ proches : maman, aéroport, sortie avec Auguste
const ARRANGED: StepCond = { activity: 'arrangeCare', field: 'outcome', in: ['arranged'] };
const FAMILY_OUT: StepCond = { activity: 'arrangeCare', field: 'outcome', in: ['family'] };
const POSTPONED: StepCond = { activity: 'arrangeCare', field: 'outcome', in: ['postponed'] };

export const FAMILY_RELATIVES: EventDef[] = [
  // A — visite chez maman
  {
    id: 'fm-mom-visit', title: 'Une visite chez maman', sender: 'maman', category: 'family', big: true, repeatable: true, weight: 7, minPlayMin: 8,
    teaser: 'Maman aimerait te voir ♡',
    invite: 'Coucou ma chérie, ça fait un moment ! Tu passes prendre un thé ? J’ai fait des gâteaux et j’ai plein de choses à te raconter.',
    steps: [
      { t: 'dress', hint: 'Une tenue douce pour aller chez maman', style: 'casual' },
      { t: 'travel', place: 'momHome', label: 'Direction chez maman' },
      { t: 'scene', lines: [
        { who: 'maman', text: 'Entre, entre ! Enlève ton manteau, tu es chez toi.' },
        { who: 'radia', text: 'Ça sent tellement bon, maman…' },
        { who: 'maman', text: 'J’ai tout préparé. Viens m’aider à composer le plateau du goûter.' },
      ] },
      { t: 'activity', id: 'familyPick', params: { preset: 'tea' } },
      { t: 'scene', lines: [
        { who: 'maman', text: 'Raconte-moi, comment vont les enfants ? Et toi, tu te reposes un peu ?' },
        { who: 'radia', text: 'Oui maman, tout va bien. Ça me fait du bien d’être là.' },
        { who: 'maman', text: 'Reviens quand tu veux, ma porte est toujours ouverte. Je t’embrasse fort.' },
      ] },
      { t: 'photo', place: 'momHome', title: 'Chez maman', withAuguste: false },
    ],
    reward: { coins: 90, flowers: 3, cocoa: 2, furniture: ['plant-pot'] }, replayReward: { coins: 30, flowers: 1 },
    memoryTitle: 'Chez maman', achievements: ['ev_family'],
  },
  // B — accompagner maman à l'aéroport (histoire en une fois ; les retrouvailles arrivent plus tard)
  {
    id: 'fm-airport', title: 'À l’aéroport avec maman', sender: 'maman', category: 'family', big: true, repeatable: false, weight: 6, minPlayMin: 12,
    teaser: 'Maman part en voyage ♡',
    invite: 'Ma chérie, je pars en voyage. Tu peux m’accompagner à l’aéroport ? Ça me ferait tellement plaisir de partir avec ton sourire.',
    steps: [
      { t: 'dress', hint: 'Une tenue confortable pour l’aéroport', style: 'casual' },
      { t: 'travel', place: 'airport', label: 'Direction l’aéroport' },
      { t: 'scene', lines: [
        { who: 'maman', text: 'Voilà, le grand hall. Mon cœur bat un peu plus vite…' },
        { who: 'radia', text: 'Tu vas passer un merveilleux voyage, maman.' },
        { who: 'maman', text: 'Oui. Mais tu vas me manquer, tu sais.' },
      ] },
      { t: 'activity', id: 'familyPick', params: { preset: 'farewell' } },
      { t: 'scene', lines: [
        { who: 'maman', text: 'Je t’appelle dès que j’atterris. Embrasse bien tout le monde.' },
        { who: 'radia', text: 'Bon voyage, maman. Je t’aime.' },
        { who: 'narrator', text: 'Maman franchit la porte d’embarquement et se retourne une dernière fois pour te faire signe.' },
      ] },
      { t: 'photo', place: 'airport', title: 'Avant le départ', withAuguste: false },
    ],
    reward: { coins: 110, diamonds: 3, cloth: ['ac-scarf'] },
    memoryTitle: 'Avant le départ', achievements: ['ev_family'],
  },
  // B2 — les retrouvailles, quelque temps après le départ
  {
    id: 'fm-airport-return', title: 'Les retrouvailles', sender: 'maman', category: 'family', big: true, repeatable: false, weight: 12, minPlayMin: 12,
    needs: { doneAll: ['fm-airport'], afterMin: { id: 'fm-airport', min: 22 } },
    teaser: 'Maman rentre de voyage ♡',
    invite: 'Je suis de retour, ma chérie ! Tu viens me chercher à l’aéroport ? J’ai tellement de choses à te raconter.',
    steps: [
      { t: 'travel', place: 'airport', label: 'Direction l’aéroport' },
      { t: 'scene', lines: [
        { who: 'narrator', text: 'Les portes s’ouvrent. Une silhouette familière agite la main au loin.' },
        { who: 'maman', text: 'Ma chérie ! Viens là, que je te serre dans mes bras.' },
      ] },
      { t: 'activity', id: 'familyPick', params: { preset: 'welcome' } },
      { t: 'scene', lines: [
        { who: 'maman', text: 'Le voyage était magnifique, mais rien ne vaut de rentrer. Je te raconte tout dans la voiture.' },
        { who: 'radia', text: 'Tu m’as tellement manqué, maman. Bienvenue à la maison.' },
      ] },
      { t: 'photo', place: 'airport', title: 'Les retrouvailles', withAuguste: false },
    ],
    reward: { coins: 130, diamonds: 4, flowers: 4 },
    memoryTitle: 'Les retrouvailles', achievements: ['ev_family'],
  },
  // C — Auguste invite Radia à sortir (il faut d'abord organiser les enfants ; toutes les issues sont bonnes)
  {
    id: 'fm-auguste-out', title: 'Auguste t’invite à sortir', sender: 'auguste', category: 'romantic', big: true, repeatable: true, weight: 7, minPlayMin: 10,
    teaser: 'Une sortie rien que tous les deux ?',
    invite: 'Et si on sortait tous les deux ? J’ai une idée de soirée. Il faudra voir qui peut s’occuper des enfants, mais on trouvera une solution, promis.',
    steps: [
      { t: 'scene', lines: [
        { who: 'auguste', text: 'J’ai envie d’une soirée rien que pour toi. Tu mérites de souffler.' },
        { who: 'auguste', text: 'Regarde qui peut s’occuper des enfants. Et si personne n’est libre, aucun souci : on trouve autre chose.' },
      ] },
      { t: 'activity', id: 'arrangeCare', params: { occasion: 'Auguste t’invite à sortir' } },
      { t: 'scene', onlyIf: ARRANGED, lines: [
        { who: 'auguste', text: 'Parfait ! Les enfants sont entre de bonnes mains. Va te préparer, je t’attends.' },
      ] },
      { t: 'dress', onlyIf: ARRANGED, hint: 'Une tenue pour une soirée à deux', style: 'chic' },
      { t: 'travel', onlyIf: ARRANGED, place: 'rooftop', label: 'Direction le rooftop' },
      { t: 'scene', onlyIf: ARRANGED, lines: [
        { who: 'auguste', text: 'Regarde comme Paris scintille. J’avais besoin de te voir sans rien d’autre autour.' },
        { who: 'radia', text: 'C’est magnifique. Merci d’avoir pensé à nous.' },
        { who: 'auguste', text: 'Toujours. Toi et moi, c’est ma plus belle habitude.' },
      ] },
      { t: 'photo', onlyIf: ARRANGED, place: 'rooftop', title: 'Une soirée rien qu’à nous', withAuguste: true },
      { t: 'scene', onlyIf: FAMILY_OUT, lines: [
        { who: 'auguste', text: 'Alors on sort tous ensemble ! Les enfants vont être ravis. Direction le jardin.' },
      ] },
      { t: 'travel', onlyIf: FAMILY_OUT, place: 'garden', label: 'Direction le jardin' },
      { t: 'photo', onlyIf: FAMILY_OUT, place: 'garden', title: 'Une sortie en famille', withAuguste: true, withKids: ['kid1', 'kid2', 'kid3'] },
      { t: 'scene', onlyIf: POSTPONED, lines: [
        { who: 'auguste', text: 'Aucun problème. On garde ça pour une autre fois, sans pression. L’important, c’est qu’on le fasse ♡' },
        { who: 'radia', text: 'Merci de ta patience. On trouvera le bon moment.' },
      ] },
    ],
    reward: { coins: 100, diamonds: 3, flowers: 3 }, replayReward: { coins: 35, flowers: 1 },
    memoryTitle: 'Une sortie avec Auguste', achievements: ['ev_family'],
  },
];
