/** Répliques contextuelles d'Auguste (données pures, testables). */
export type AugTopic =
  | 'outfit' | 'outfitElegant' | 'outfitBuy' | 'hair'
  | 'furniture' | 'color' | 'room' | 'castleDone'
  | 'cat' | 'catName' | 'catPet' | 'catPlay'
  | 'family' | 'kidGame' | 'garden' | 'flowers' | 'chocolate'
  | 'career' | 'careerUp' | 'fans' | 'fansTier' | 'magazine' | 'shop' | 'event';

export const AUG_LINES: Record<AugTopic, string[]> = {
  outfit: [
    'Galbi… tu comptes me laisser respirer avec cette tenue ?',
    'Mais comment tu fais pour être aussi jolie dans toutes les tenues ?',
    'MachaAllah, même les pixels sont impressionnés.',
    'Attends… tourne encore une fois, je veux voir.',
    'Je crois que je vais passer ma vie à t\'admirer.',
    'Celle-là, elle te va comme si elle avait été cousue pour toi.',
  ],
  outfitElegant: [
    '…',
    'Je n\'ai plus de mots. Vraiment. Même pas un « galbi ».',
    'Bouche bée. Complètement bouche bée. 😍',
  ],
  outfitBuy: ['Un petit cadeau de plus pour ma reine ? Je ne dis rien.', 'Bon choix. Enfin… tous tes choix sont de bons choix.'],
  hair: ['Cette coiffure… je suis sans voix.', 'Tu changes de tête et je retombe amoureux à chaque fois.'],
  furniture: ['Ça fait déjà plus chez soi.', 'Là, ça commence à te ressembler.', 'Tu as l\'œil pour la déco, galbi.'],
  color: ['Cette couleur, c\'est toi tout craché.', 'Oh… c\'est joli. C\'est vraiment joli.'],
  room: ['Une pièce de plus dans ton royaume.', 'Ce château grandit avec toi.'],
  castleDone: ['Chaque pièce a sa couleur. Mais c\'est toi qui lui donnes toute sa lumière.'],
  cat: ['Bon… je crois qu\'il t\'aime déjà plus que moi.', 'Même ton chat a compris qu\'il était tombé dans le meilleur château.', 'Galbi, maintenant on est trois dans ton petit monde.'],
  catName: ['Excellent prénom. Il va adorer.', 'Ce nom lui va à ravir.'],
  catPet: ['Il ronronne… traître, il ne ronronne jamais comme ça pour moi.', 'Je crois qu\'il t\'a choisie.'],
  catPlay: ['Ce chat a plus d\'énergie que moi un lundi.', 'Regarde-le courir ! Il est aussi heureux que toi quand tu gagnes.'],
  family: ['Tout l\'amour et l\'énergie que tu donnes chaque jour… c\'est ce que j\'admire le plus chez toi.', 'Je suis tellement fier de la voir sourire comme ça.'],
  kidGame: ['Bravo ! Quelle équipe !', 'On dirait que tout le monde s\'amuse.'],
  garden: ['Le plus beau des jardins, c\'est celui où ceux qu\'on aime peuvent grandir.', 'J\'aurais pu t\'offrir toutes les fleurs de Paris… mais celles-ci sont meilleures : c\'est toi qui les as fait pousser.'],
  flowers: ['Ces fleurs sentent presque aussi bon que toi.', 'Un bouquet pour ma reine !'],
  chocolate: ['Je savais que les fleurs te feraient plaisir… mais j\'ai quand même prévu les chocolats.', 'Hmm… je peux goûter ? Juste un.'],
  career: ['Ta carrière ne fait que commencer.', 'Tu as le talent. Et moi j\'ai les applaudissements.'],
  careerUp: ['Je savais déjà que t\'étais une star avant que tout le monde s\'en rende compte.', 'Un palier de plus ! MachaAllah, regarde tout ce que tu accomplis.'],
  fans: ['C\'est peut-être eux qui t\'applaudissent, mais moi je suis fier de toi même quand personne ne regarde.', 'Je crois que mon plus beau rôle, c\'est de t\'encourager.'],
  fansTier: ['T\'auras beau avoir un million de fans, je garde ma place de premier, galbi.', 'MachaAllah, regarde tout ce que tu accomplis.'],
  magazine: ['En couverture ! Évidemment.', 'Ils ont enfin compris ce que je sais depuis le début.'],
  shop: ['T\'inquiète, c\'est cadeau. Twahechtek.', 'Même ici, j\'arrive pas à te dire non.'],
  event: ['Quelle soirée ! Tout le monde parle de toi.', 'Tu as organisé ça comme une vraie reine.'],
};


/** Nombre total de répliques contextuelles (≥ 20 exigé). */
export const AUG_LINE_COUNT = Object.values(AUG_LINES).reduce((a, l) => a + l.length, 0);
