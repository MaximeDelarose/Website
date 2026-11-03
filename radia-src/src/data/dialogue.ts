/**
 * Dialogues narratifs et répliques contextuelles d'Auguste.
 * Les textes se modifient ici sans toucher au moteur.
 */

export type Speaker = 'auguste' | 'radia' | 'narrator';
export type Expr = 'neutral' | 'smile' | 'laugh' | 'surprise' | 'sad' | 'love' | 'tease' | 'shy';

export interface DialogueLine {
  who: Speaker;
  expr?: Expr;
  text: string;
  /** Tenue de Radia pour ce passage. */
  outfit?: 'hoodie' | 'stripes' | 'royal';
}

export interface Choice {
  label: string;
  value: string;
  /** Réaction (légèrement différente selon le choix). */
  reply: DialogueLine[];
}

export interface DialogueDef {
  id: string;
  /** Titre court pour l'historique. */
  title: string;
  lines: DialogueLine[];
  choice?: { prompt?: string; options: Choice[]; after: DialogueLine[] };
}

const A = (expr: Expr, text: string): DialogueLine => ({ who: 'auguste', expr, text });
const R = (expr: Expr, text: string, outfit?: DialogueLine['outfit']): DialogueLine => ({ who: 'radia', expr, text, outfit });
const N = (text: string): DialogueLine => ({ who: 'narrator', text });

export const DIALOGUES: Record<string, DialogueDef> = {
  intro: {
    id: 'intro',
    title: 'Bienvenue',
    lines: [
      N('Il était une fois un petit monde, dessiné rien que pour une seule personne.'),
      A('smile', 'Salut Radia ! Bienvenue dans ton monde. Oui, TON monde. Je l\'ai fabriqué pixel par pixel.'),
      R('surprise', 'Attends… c\'est moi, là ?'),
      A('tease', 'Avec le petit anneau au nez et tout. J\'ai même dessiné le petit point dans ton œil. Ce détail-là, il n\'y a que toi qui l\'as.'),
      A('smile', 'Ici, tout pousse quand on réunit deux choses pareilles. Je te montre ?'),
    ],
  },
  bouquet: {
    id: 'bouquet',
    title: 'Le premier bouquet',
    lines: [
      A('love', 'J\'aurais pu t\'offrir toutes les fleurs de Paris. Mais aucune n\'aurait été aussi jolie que ton sourire.'),
      N('Radia reçoit son premier cœur ♡'),
    ],
  },
  basket: {
    id: 'basket',
    title: 'Le panier magique',
    lines: [
      A('smile', 'Ce panier, c\'est mon petit cadeau : touche-le et il te donne de quoi fusionner. Il ne se vide jamais.'),
      R('tease', 'Comme toi quand tu parles ?'),
      A('laugh', '…Je vais faire semblant de ne pas avoir entendu.'),
    ],
  },
  combo: {
    id: 'combo',
    title: 'Le secret des combos',
    lines: [
      A('tease', 'Petit secret : si tu enchaînes les fusions en moins de trois secondes, ça fait des combos.'),
      A('smile', 'Et à cinq d\'affilée, une Étoile filante tombe du ciel. Rien que ça.'),
    ],
  },
  orders: {
    id: 'orders',
    title: 'Les commandes',
    lines: [
      A('tease', 'Je t\'ai préparé quelques commandes. Oui, je suis un client exigeant…'),
      A('smile', '…mais je paie en cœurs. Quand l\'objet demandé est sur le plateau, touche « Donner ».'),
    ],
  },
  gifts: {
    id: 'gifts',
    title: 'Les paquets cadeaux',
    lines: [
      A('smile', 'J\'ai caché des paquets cadeaux dans le jardin.'),
      R('tease', 'Et je les ouvre comment ?'),
      A('laugh', 'Fusionne juste à côté. Je savais que tu allais demander.'),
    ],
  },
  ch1_end: {
    id: 'ch1_end',
    title: 'Fin du chapitre 1',
    lines: [
      A('surprise', 'Une composition entière… Tu vas finir par ouvrir une boutique de fleurs.'),
      R('laugh', 'Et toi tu seras mon livreur.'),
      A('tease', 'Payé en sourires ? J\'accepte.'),
    ],
  },
  ch2_intro: {
    id: 'ch2_intro',
    title: 'Le Nord de Paris',
    lines: [
      N('Paris, le soir. Les lumières se reflètent sur les pavés mouillés.'),
      A('smile', 'C\'est cool d\'être dans le Nord de Paris bb.'),
    ],
    choice: {
      prompt: 'Que répond Radia ?',
      options: [
        { label: '« C\'est surtout cool parce que je suis là. »', value: 'moi', reply: [R('tease', 'C\'est surtout cool parce que je suis là.'), A('laugh', 'Toujours aussi modeste, toi…')] },
        { label: '« T\'es vraiment trop bête toi. »', value: 'bete', reply: [R('laugh', 'T\'es vraiment trop bête toi.'), A('tease', 'Trop bête, peut-être… mais tu souris, je le vois d\'ici.')] },
        { label: '« Galbi, viens là. »', value: 'galbi', reply: [R('love', 'Galbi, viens là.'), A('surprise', '…J\'arrive. J\'arrive !')] },
      ],
      after: [A('love', 'Bon… j\'avoue, avec toi c\'est encore mieux.')],
    },
  },
  arc_intro: {
    id: 'arc_intro',
    title: 'L\'Arc de Triomphe',
    lines: [
      A('smile', 'Tu te souviens de l\'Arc de Triomphe, sous la pluie ?'),
      A('sad', 'Le souvenir s\'est un peu mélangé… Tu m\'aides à le remettre en ordre ?'),
    ],
  },
  arc_done: {
    id: 'arc_done',
    title: 'Sous la pluie',
    lines: [
      A('smile', 'Voilà. Toi, moi, l\'Arc de Triomphe, et cette pluie qui n\'arrivait pas à gâcher la soirée.'),
      R('laugh', 'On était trempés.'),
      A('love', 'Trempés, mais bien.'),
    ],
  },
  ch2_end: {
    id: 'ch2_end',
    title: 'Fin du chapitre 2',
    lines: [
      A('smile', 'Un album entier. Et pourtant, j\'ai l\'impression qu\'on n\'a fait que commencer.'),
    ],
  },
  ch3_intro: {
    id: 'ch3_intro',
    title: 'Les petits souvenirs',
    lines: [
      A('love', 'Tu sais ce que j\'aime dans les souvenirs avec toi ? C\'est que même les moments les plus simples deviennent des moments que j\'ai envie de garder.'),
      A('smile', 'Nouvelle collection : l\'Amour. Et quelques objets magiques, pour pimenter un peu.'),
    ],
  },
  cinema: {
    id: 'cinema',
    title: 'Le cinéma',
    lines: [
      A('tease', 'J\'aurais pu regarder le film dix fois… mais je crois que je me serais encore laissé distraire par toi.'),
      R('shy', 'T\'as rien suivi du film, avoue.'),
      A('laugh', 'Rien du tout.'),
    ],
  },
  billard_intro: {
    id: 'billard_intro',
    title: 'Le billard',
    lines: [
      A('tease', 'Une petite partie de billard ? Je te préviens, je suis redoutable.'),
      R('tease', 'C\'est ce qu\'on va voir.'),
    ],
  },
  billard_done: {
    id: 'billard_done',
    title: 'La partie',
    lines: [A('smile', 'Je voulais gagner la partie… mais je crois que j\'ai surtout gagné un beau souvenir.')],
  },
  promenade: {
    id: 'promenade',
    title: 'Une promenade',
    lines: [
      R('smile', 'On marche encore un peu ?', 'stripes'),
      A('love', 'Galbi, twahechtek… Tu me manques parfois alors que je viens à peine de te quitter.'),
      R('laugh', 'Je suis juste là, bêta.', 'stripes'),
    ],
  },
  ch4_intro: {
    id: 'ch4_intro',
    title: 'Le royaume',
    lines: [
      N('Le monde se transforme. Les pavés deviennent des cases, les lampadaires des tours d\'ivoire.'),
      A('smile', 'Bienvenue dans le royaume. Il lui manque juste quelqu\'un pour le gouverner.'),
    ],
  },
  pawn: {
    id: 'pawn',
    title: 'Le petit pion',
    lines: [
      A('smile', 'Tu vois ce petit pion ? Il rêve de devenir reine un jour.'),
      R('laugh', 'Il a bon goût.'),
      A('love', 'Il a surtout un très bon modèle.'),
    ],
  },
  queen: {
    id: 'queen',
    title: 'Une seule reine',
    lines: [
      A('love', 'Dans ce royaume, il n\'y a qu\'une seule reine.'),
      A('smile', 'Et une reine, ça va où elle veut. Viens, je te montre le Mode Reine.'),
    ],
  },
  crown: {
    id: 'crown',
    title: 'Ma reine',
    lines: [
      N('Une petite couronne dorée se pose sur la tête de Radia.'),
      R('surprise', 'Une couronne ? Pour moi ?', 'royal'),
      A('love', 'Aux échecs, on dit que la reine est la pièce la plus puissante. Moi, je crois surtout qu\'elle est celle qui rend tout le jeu plus beau.'),
      A('smile', 'Le mode Échecs est ouvert. Et je te préviens : l\'IA, elle, ne te laissera pas gagner exprès.'),
      R('tease', 'Et toi, si ?', 'royal'),
      A('laugh', '…Peut-être.'),
    ],
  },
  ch5_intro: {
    id: 'ch5_intro',
    title: 'Le monde que j\'ai créé',
    lines: [
      N('Le monde devient plus lumineux. Tous les souvenirs se mettent à briller.'),
      A('smile', 'On y est presque. Il reste à réunir tous nos souvenirs.'),
    ],
  },
  thousand: {
    id: 'thousand',
    title: 'Mille mondes',
    lines: [
      A('love', 'Tu sais, Radia… J\'aurais pu créer mille mondes, inventer mille histoires et dessiner mille visages. Mais dans chacun d\'eux, c\'est toujours toi que j\'aurais voulu retrouver.'),
    ],
  },
  chemin_intro: {
    id: 'chemin_intro',
    title: 'Deux cœurs',
    lines: [A('tease', 'Deux cœurs, un chemin un peu emmêlé. Ça te rappelle quelqu\'un ?')],
  },
  chemin_done: {
    id: 'chemin_done',
    title: 'Les bons mots',
    lines: [
      A('love', 'Je ne sais pas si je réussirai toujours à trouver les bons mots. Alors j\'ai préféré te construire un petit monde pour te montrer tout ce que je n\'arrive pas à dire.'),
    ],
  },
  last: {
    id: 'last',
    title: 'Le dernier niveau',
    lines: [A('shy', 'Dernier niveau. Prends ton temps… j\'ai préparé un petit truc.')],
  },
};

// ------------------------------------------------------- répliques contextuelles

export type BarkTrigger =
  | 'combo3' | 'combo5' | 'discover' | 'win' | 'invalid' | 'stuck' | 'chessWin' | 'chessLoss'
  | 'tapAuguste' | 'memory' | 'achievement' | 'rare' | 'idle';

export const BARKS: Record<BarkTrigger, string[]> = {
  combo3: ['Trop forte !', 'Galbi, tu gères !', 'Quelle reine !'],
  combo5: ['MachaAllah, même les pixels sont impressionnés.', 'Bon, tu peux arrêter de m\'humilier devant tout le royaume ?'],
  discover: ['Oh non… elle a encore découvert un truc que j\'avais caché.'],
  rare: ['MachaAllah, même les pixels sont impressionnés.', 'Quelle reine !'],
  win: ['Trop forte !', 'Quelle reine !', 'Galbi, tu gères !'],
  invalid: ['Ça va galbi, même les reines ont le droit de se tromper.'],
  stuck: ['Ça va galbi, même les reines ont le droit de se tromper.'],
  chessWin: ['Même dans mon propre jeu, tu trouves le moyen de me battre…', 'Bon, tu peux arrêter de m\'humilier devant tout le royaume ?'],
  chessLoss: ['Ça va galbi, même les reines ont le droit de se tromper.'],
  tapAuguste: [
    'Radia, je t\'aime bien, mais tu vas finir par casser mon personnage.',
    'Eh ! Ça chatouille.',
    'Twahechtek… même quand t\'es juste de l\'autre côté de l\'écran.',
    'Je suis en pause, là. Une pause très importante.',
  ],
  memory: ['Twahechtek… même quand t\'es juste de l\'autre côté de l\'écran.'],
  achievement: ['Oh non… elle a encore découvert un truc que j\'avais caché.'],
  idle: ['Tu réfléchis ou tu admires le paysage ?', 'Je peux te donner un indice, si tu veux. Touche l\'ampoule.'],
};

/** Délai minimum (ms) avant de répéter une réplique d'un même déclencheur. */
export const BARK_COOLDOWN: Record<BarkTrigger, number> = {
  combo3: 25_000, combo5: 40_000, discover: 60_000, rare: 30_000, win: 5_000, invalid: 45_000, stuck: 20_000,
  chessWin: 5_000, chessLoss: 5_000, tapAuguste: 1_500, memory: 20_000, achievement: 30_000, idle: 90_000,
};
