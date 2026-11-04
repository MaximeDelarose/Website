/** Répliques contextuelles d'Auguste (données pures, testables). */
export type AugTopic =
  | 'outfit' | 'outfitElegant' | 'outfitBuy' | 'hair'
  | 'furniture' | 'color' | 'room' | 'castleDone'
  | 'cat' | 'catName' | 'catPet' | 'catPlay'
  | 'family' | 'kidGame' | 'garden' | 'flowers' | 'chocolate'
  | 'career' | 'careerUp' | 'fans' | 'fansTier' | 'magazine' | 'shop' | 'event' | 'checkin';

export const AUG_LINES: Record<AugTopic, string[]> = {
  outfit: [
    'Attends… mais elle te va beaucoup trop bien !',
    'Mais comment tu fais pour être aussi jolie dans toutes les tenues ?',
    'Même les pixels sont impressionnés.',
    'Attends… tourne encore une fois, je veux voir.',
    'Je crois que je vais passer ma vie à t\'admirer.',
    'Celle-là, elle te va comme si elle avait été cousue pour toi.',
  ],
  outfitElegant: [
    '…',
    'Je n\'ai plus de mots. Vraiment. Même pas une blague.',
    'Bouche bée. Complètement bouche bée. 😍',
  ],
  outfitBuy: ['Un petit cadeau de plus pour ma reine ? Je ne dis rien.', 'Bon choix. Enfin… tous tes choix sont de bons choix.', 'Bsahték, profites-en !', 'Sahha, on le porte dès ce soir ?', 'Mashallah, je sens que ça va te plaire.', 'Encore un ? J\'adore ton audace.'],
  hair: ['Cette coiffure… je suis sans voix.', 'Tu changes de tête et je retombe amoureux à chaque fois.'],
  furniture: ['Ça fait déjà plus chez soi.', 'Là, ça commence à te ressembler.', 'Tu as l\'œil pour la déco.', 'Mashallah, quel goût.', 'Bsahték, c\'est chez nous maintenant.', 'Ce coin-là, je vais y passer ma vie.'],
  color: ['Cette couleur, c\'est toi tout craché.', 'Oh… c\'est joli. C\'est vraiment joli.'],
  room: ['Une pièce de plus dans ton royaume.', 'Ce château grandit avec toi.'],
  castleDone: ['Chaque pièce a sa couleur. Mais c\'est toi qui lui donnes toute sa lumière.'],
  cat: ['Bon… je crois qu\'il t\'aime déjà plus que moi.', 'Même ton chat a compris qu\'il était tombé dans le meilleur château.', 'Maintenant on est trois dans ton petit monde.'],
  catName: ['Excellent prénom. Il va adorer.', 'Ce nom lui va à ravir.'],
  catPet: ['Il ronronne… traître, il ne ronronne jamais comme ça pour moi.', 'Je crois qu\'il t\'a choisie.'],
  catPlay: ['Ce chat a plus d\'énergie que moi un lundi.', 'Regarde-le courir ! Il est aussi heureux que toi quand tu gagnes.', 'Ya latif, il a sauté sur l\'étagère !', 'Il joue la star, comme toi.', 'Il ne fait jamais ça avec moi.', 'Mashallah, quelle énergie.'],
  family: ['Tout l\'amour et l\'énergie que tu donnes chaque jour… c\'est ce que j\'admire le plus chez toi.', 'Je suis tellement fier de la voir sourire comme ça.'],
  kidGame: ['Bravo ! Quelle équipe !', 'On dirait que tout le monde s\'amuse.', 'Sahha, quelle belle équipe !', 'Ça rit de partout, j\'adore.', 'Rabi yahfdek, ma petite famille.', 'Qui a gagné ? Peu importe, on a bien ri.'],
  garden: ['Le plus beau des jardins, c\'est celui où ceux qu\'on aime peuvent grandir.', 'J\'aurais pu t\'offrir toutes les fleurs de Paris… mais celles-ci sont meilleures : c\'est toi qui les as fait pousser.'],
  flowers: ['Ces fleurs sentent presque aussi bon que toi.', 'Un bouquet pour ma reine !', 'Mashallah, elles sont superbes.', 'Je n\'aurais pas fait mieux.', 'Sahha, le jardin te remercie.', 'Une pour le salon, une pour moi.'],
  chocolate: ['Je savais que les fleurs te feraient plaisir… mais j\'ai quand même prévu les chocolats.', 'Hmm… je peux goûter ? Juste un.', 'Sahha, ça sent trop bon.', 'Bsahték, tu as bien travaillé.', 'Je teste pour la qualité, évidemment.', 'Le dernier est pour moi, non ?'],
  career: ['Ta carrière ne fait que commencer.', 'Tu as le talent. Et moi j\'ai les applaudissements.', 'Mashallah, tu avances vite.', 'Sahha, continue comme ça.', 'On dirait que ça te réussit.', 'Je suis ton premier fan, je précise.'],
  careerUp: ['Je savais déjà que t\'étais une star avant que tout le monde s\'en rende compte.', 'Un palier de plus ! Regarde tout ce que tu accomplis.', 'Bsahték, c\'est amplement mérité !', 'Mashallah, un palier de plus.', 'Doucement, tu vas m\'éclipser.', 'Ça mérite une petite fête.'],
  fans: ['C\'est peut-être eux qui t\'applaudissent, mais moi je suis fier de toi même quand personne ne regarde.', 'Je crois que mon plus beau rôle, c\'est de t\'encourager.'],
  fansTier: ['T\'auras beau avoir un million de fans, je garde ma place de premier.', 'Franchement, regarde tout ce que tu accomplis.'],
  magazine: ['En couverture ! Évidemment.', 'Ils ont enfin compris ce que je sais depuis le début.'],
  shop: ['T\'inquiète, c\'est cadeau.', 'Même ici, j\'arrive pas à te dire non.'],
  checkin: [
    'J\'espère que tu passes un bon moment, ma reine ♡',
    'Si tu as besoin de moi, je suis juste là.',
    'Je pense à toi. Prends ton temps : ici, il n\'y a aucune pression.',
    'Un petit coucou d\'Auguste : j\'espère que ta journée se passe bien ♡',
    'N\'oublie pas de boire un verre d\'eau et de respirer un peu. Je suis fier de toi.',
    'Quoi qu\'il arrive, je suis là pour toi. Toujours.',
    'Si la journée est lourde, pose le téléphone un instant. Je t\'attends ici, sans souci ♡',
    'Tu fais tellement de choses pour les autres… j\'espère que tu prends aussi du temps pour toi.',
    'Je suis juste là, si tu veux parler. Tu me trouves toujours.',
    'Je te souhaite une journée toute douce. Moi, je suis là ♡',
    'Tu n\'as rien à prouver ici. Joue comme ça te fait plaisir.',
    'Même de loin, je pense à toi. Prends soin de toi, ma reine.',
  ],
  event: ['Quelle soirée ! Tout le monde parle de toi.', 'Tu as organisé ça comme une vraie reine.', 'Sahha, quelle réussite !', 'Ya latif, tout le monde est venu.', 'Je te l\'avais dit, ça allait être parfait.', 'Bsahték, belle soirée.'],
};


/** Nombre total de répliques contextuelles (≥ 20 exigé). */
export const AUG_LINE_COUNT = Object.values(AUG_LINES).reduce((a, l) => a + l.length, 0);

/** Attention d'Auguste selon l'heure (0–23) : matin, soirée, nuit, ou une phrase de la journée. */
export function checkinLine(hour: number, pickIndex: (n: number) => number): string {
  const t = hour >= 23 || hour < 5 ? 'night' : hour < 11 ? 'morning' : hour >= 18 ? 'evening' : 'day';
  const specials: Record<string, string[]> = {
    night: ['Il est tard, ma reine. Repose-toi : je serai toujours là demain, inchallah ♡', 'Il se fait tard… dors bien. Je suis là quand tu reviens ♡'],
    morning: ['Bonjour ma reine ♡ J\'espère que ta journée commence en douceur.', 'Bonne matinée à toi. Si tu as besoin de moi, je suis là, inchallah.'],
    evening: ['Bonne soirée à toi. J\'espère que tu passes un bon moment ♡', 'Une belle soirée, ma reine. Je suis là si tu as besoin de moi, inchallah.'],
    day: [],
  };
  const pool = [...specials[t], ...AUG_LINES.checkin];
  return pool[pickIndex(pool.length)];
}
