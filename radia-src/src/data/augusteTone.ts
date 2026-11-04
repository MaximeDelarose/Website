/**
 * Banque de répliques d'Auguste par situation + tirage anti-répétition.
 *
 * API stable (utilisée par les autres modules) :
 *   - `LINES: Record<Situation, string[]>`  : ≥ 6 variantes par situation, « galbi » très rare.
 *   - `pickLine(situation, rng?, opts?)`    : renvoie une réplique, sans répéter les dernières ;
 *        plafond mécanique : au plus 1 réplique avec « galbi » sur 10 tirages, jamais deux d'affilée.
 *        opts.noGalbi = true force une réplique sans « galbi » ; opts.memory = mémoire isolée (tests).
 *   - `augusteLineStats()`                  : nb de répliques, nb avec « galbi », proportion.
 *   - `resetAugusteTone()`                  : vide la mémoire (tests).
 * Ton : naturel, drôle, taquin, tendre ; jamais théâtral ; aucun prénom d'enfant.
 */

import { hasDarija } from './darija';

export type Situation =
  | 'outfitNice' | 'diamonds' | 'miniGameWin' | 'furniture' | 'rare' | 'outfitChange' | 'reward'
  | 'romantic' | 'tender' | 'fusionRare' | 'fusionMax' | 'combo' | 'chest' | 'drop' | 'dailyGift'
  | 'incidentLeak' | 'incidentPower' | 'incidentGarden' | 'incidentParcel' | 'incidentCat'
  | 'incidentRareFlower' | 'incidentChoc' | 'incidentShop' | 'tindeurKeep' | 'tindeurUninstall'
  | 'orderDone' | 'energyLow' | 'welcomeBack'
  // Endless 2.0 / Casino / événements (ajoutées avec le glossaire darija)
  | 'fusionClassic' | 'coins' | 'bigReward' | 'outfitUnlocked' | 'romanticMoment'
  | 'casinoWin' | 'casinoJackpot' | 'casinoLose' | 'eventTease' | 'eventCheer'
  | 'restaurant' | 'outing' | 'quarry' | 'castleWork' | 'chocolateFactory' | 'catPlay';

export const LINES: Record<Situation, string[]> = {
  outfitNice: [
    'Attends… mais elle te va beaucoup trop bien !',
    'Là, je ne suis plus objectif du tout.',
    'Celle-là, garde-la pour les grandes occasions. Ou pour moi.',
    'Tourne un peu, que je vérifie que c\'est pas un rêve.',
    'Franchement, tu pourrais porter un sac-poubelle, mais là, c\'est du niveau au-dessus.',
    'Mashallah, t\'es magnifique.',
    'Galbi… tu comptes me laisser respirer avec cette tenue ?',
    'Mashallah, elle te va trop bien !',
  ],
  diamonds: [
    'Bon, je crois que tu vas encore vider ma boutique.',
    'Ça brille beaucoup. Presque autant que toi.',
    'Je regarde le solde de ma carte et je souris quand même.',
    'Des diamants, encore ? Tu as de l\'ambition, j\'aime ça.',
    'Allez, dépense-les, ils sont là pour ça.',
    'Bsahték, ils sont à toi !',
    'Ya latif, ça scintille là-dedans !',
  ],
  miniGameWin: [
    'Ah ouais, carrément ! Bien joué.',
    'Propre. Même pas besoin de me regarder en coin.',
    'Je note : un point pour toi, zéro pour mon ego.',
    'Pas mal du tout, madame la championne.',
    'Bon, d\'accord, tu gères.',
    'Sahha, bien joué !',
    'Mashallah, t\'as des doigts de fée.',
    'Trop forte, galbi !',
  ],
  furniture: [
    'Franchement, notre château commence à avoir de la gueule.',
    'Ça fait déjà plus chez soi.',
    'Là, ça commence à te ressembler.',
    'Je ne savais pas qu\'un fauteuil pouvait changer autant l\'ambiance.',
    'Beau coup d\'œil pour la déco.',
    'Mashallah, t\'as l\'œil pour la déco.',
    'Bsahték, c\'est chez nous maintenant.',
  ],
  rare: [
    'Mais t\'as une chance de malade !',
    'Attends, elle est vraiment rare, celle-là !',
    'Ça, on le garde précieusement.',
    'Je n\'en avais jamais vu en vrai. Waouh.',
    'Tu as le doigt magique, ou quoi ?',
    'Ya latif, t\'as trouvé quoi là ?!',
    'Wallah, t\'as une chance de malade.',
  ],
  outfitChange: [
    'Non mais attends, t\'es vraiment trop belle comme ça.',
    'Nouveau look, nouvelle Radia. J\'approuve.',
    'Celle-ci, je la valide les yeux fermés.',
    'Hop, un petit changement qui change tout.',
    'Tu me refais le coup de l\'entrée en scène ?',
    'Mashallah, regarde-moi ça.',
    'Sahha, ça te va comme un gant.',
  ],
  reward: [
    'Tiens, ça c\'est pour toi.',
    'Une petite attention, rien de plus.',
    'Tu l\'as bien mérité.',
    'Prends, prends. Je ne reprends pas.',
    'Je savais que ça te ferait sourire.',
    'Bsahték, tu l\'as bien mérité.',
    'Sahha, profite !',
  ],
  romantic: [
    'J\'avais juste envie de te faire plaisir.',
    'Ce soir, tu ne fais rien d\'autre que profiter.',
    'Pas de raison particulière. Juste toi.',
    'J\'ai prévu quelque chose, mais chut.',
    'Je voulais qu\'on ait un moment rien qu\'à nous.',
    'Ya rouhi… j\'avais envie de te faire plaisir.',
    'Habille-toi, galbi, je t\'emmène quelque part.',
  ],
  tender: [
    'Je suis content de partager tout ça avec toi.',
    'Tu sais quoi ? Je suis bien, là, avec toi.',
    'Merci d\'être toi. Voilà, c\'est dit.',
    'Si je pouvais figer un moment, ce serait celui-là.',
    'Ya aïni, je suis bien quand tu es là.',
    'Rabi yahfdek, toi.',
    'Galbi… je suis content de partager tout ça avec toi.',
  ],
  fusionRare: [
    'Oh, celle-là brille différemment.',
    'Une belle pièce ! Tu viens d\'enrichir la collection.',
    'Ça, c\'est du beau travail.',
    'Mais c\'est qu\'elle devient sérieuse, cette collection.',
    'Je te le dis : ça a de la valeur.',
    'Mashallah, regarde-moi ça !',
    'Ya latif, celle-là est rare !',
  ],
  fusionMax: [
    'Niveau maximum ! Ça se fête.',
    'Là, tu as atteint le sommet. Bravo.',
    'Une collection complète à ce niveau, c\'est du sérieux.',
    'Rien à ajouter, c\'est parfait.',
    'Je crois qu\'on vient de battre un record.',
    'Bsahték, ça c\'est du lourd !',
    'Mashallah, le niveau max !',
  ],
  combo: [
    'Ça enchaîne !',
    'Les fusions se suivent, c\'est hypnotisant.',
    'Doucement, tu vas me donner le tournis.',
    'Quelle série !',
    'Là, tu es en feu.',
    'Sahha, quelle série !',
    'Tu gères, galbi !',
  ],
  chest: [
    'Un coffre ! Voyons ce qu\'il cache.',
    'Ouvre, ouvre, j\'ai hâte.',
    'Cette fois, je mise sur quelque chose de gros.',
    'Allez, un petit suspense…',
    'Ça sent la belle surprise.',
    'Ya latif, il est lourd celui-là.',
    'Bsahték, il est pour toi !',
  ],
  drop: [
    'Tiens, un petit cadeau du hasard.',
    'Oh, ça tombe bien !',
    'On ne dit pas non à un bonus.',
    'Le plateau est généreux aujourd\'hui.',
    'Ramasse, c\'est pour toi.',
    'Sahha, un bonus !',
    'Wallah, il tombait bien celui-là.',
  ],
  dailyGift: [
    'Le cadeau du jour t\'attend.',
    'Un petit quelque chose pour bien commencer.',
    'Tu reviens, et moi je gâte.',
    'Chaque jour son cadeau, c\'est la règle.',
    'Ouvre-le, il est fait pour toi.',
    'Bsahték, c\'est le cadeau du jour !',
    'Twahechtek ! Tiens, pour la peine.',
  ],
  incidentLeak: [
    'Bon, la fuite, c\'est pour moi. Ne t\'inquiète pas.',
    'Un peu d\'eau, ce n\'est pas la fin du monde. Je m\'en occupe.',
    'Le plombier arrive. Enfin, c\'est moi, le plombier.',
    'Ça goutte… je vais voir ça.',
    'Une petite fuite, une petite pause. Ça arrive.',
    'Ya latif, ça coule de partout ! Je gère.',
  ],
  incidentPower: [
    'Plus de lumière ? Ça nous fait un dîner aux bougies.',
    'Le courant est parti, mais pas nous.',
    'Je vais voir le tableau électrique, ne bouge pas.',
    'Petite panne, rien de grave.',
    'On a connu pire, et on a la lampe de poche.',
    'Ya latif, tout est éteint ! Bouge pas, j\'arrive.',
  ],
  incidentGarden: [
    'Le jardin a eu une journée agitée.',
    'Rien qu\'un peu de terre à remettre en place.',
    'On replante, ça poussera plus beau.',
    'Les fleurs ont de la ressource.',
    'Ça se rattrape, un jardin.',
    'Sahha, on s\'y remet, ça repoussera.',
  ],
  incidentParcel: [
    'Un colis est arrivé. Je n\'ai rien commandé, promis.',
    'Tiens, une livraison ! Je regarde ce que c\'est.',
    'Le facteur a sonné deux fois.',
    'Un paquet, un mystère.',
    'Je crois que c\'est pour toi.',
    'Wallah, je n\'ai rien commandé.',
  ],
  incidentCat: [
    'Ton chat a encore fait des siennes.',
    'Il est mignon, mais il fait ce qu\'il veut.',
    'Il a l\'air très fier de lui.',
    'Je crois qu\'il nous teste.',
    'Il t\'aime, c\'est sa façon de le dire.',
    'Ya latif, regarde ce qu\'il a fait !',
  ],
  incidentRareFlower: [
    'Une fleur rare a éclos dans le jardin !',
    'Regarde, celle-là n\'était pas là hier.',
    'Elle est splendide. Il faut prendre une photo.',
    'Tu as bien fait d\'arroser, finalement.',
    'Ça n\'arrive pas tous les jours.',
    'Mashallah, elle est magnifique !',
  ],
  incidentChoc: [
    'Un petit incident à la chocolaterie. Ça sent bon, au moins.',
    'Le chocolat a débordé, mais personne ne s\'en plaindra.',
    'Je goûte pour vérifier que c\'est comestible.',
    'On rattrape ça avec une fournée de plus.',
    'Il en reste, rassure-toi.',
    'Ya latif, le chocolat est partout ! Délicieux désastre.',
  ],
  incidentShop: [
    'La boutique a besoin d\'un coup de main.',
    'Un client difficile, mais on gère.',
    'Il manque un article, je regarde en réserve.',
    'Rien d\'insurmontable.',
    'On remet de l\'ordre et on repart.',
    'Sahha, on s\'en occupe ensemble.',
  ],
  tindeurKeep: [
    'Très bien, on la garde.',
    'Noté, elle reste.',
    'D\'accord, c\'est toi qui décides.',
    'Entendu.',
    'Comme tu veux.',
    'Pas de souci, on ne change rien.',
  ],
  tindeurUninstall: [
    'C\'est fait.',
    'Voilà, c\'est réglé.',
    'D\'accord, je m\'en occupe.',
    'Terminé.',
    'Comme tu veux.',
    'Je m\'en charge, voilà.',
  ],
  orderDone: [
    'Commande livrée, et sans accroc.',
    'Un client de plus content.',
    'Nickel, on passe à la suivante ?',
    'Ça, c\'est du service.',
    'Bien emballé, bien livré.',
    'Sahha, une de plus !',
    'Bsahték, client ravi !',
  ],
  energyLow: [
    'Un petit coup de fatigue ? Respire, on a le temps.',
    'Prends une pause, le plateau ne va nulle part.',
    'L\'énergie remonte toute seule, ne t\'en fais pas.',
    'Ça ne presse pas du tout.',
    'Un thé et on reprend ?',
    'Rabi yahfdek, repose-toi un peu.',
  ],
  welcomeBack: [
    'Te revoilà !',
    'Tu m\'as manqué, tu sais.',
    'Ça faisait un moment. Tout va bien ?',
    'Je gardais la place au chaud.',
    'Alors, quoi de neuf ?',
    'Twahechtek, tu sais.',
    'Tu es là, galbi. Bonne surprise.',
  ],
  fusionClassic: [
    'Saha, propre !',
    'Bien joué ça !',
    'Ah ouais, joli !',
    'Nickel, continue.',
    'Pas mal du tout.',
    'Ça glisse tout seul.',
    'Sahha, ça roule.',
  ],
  coins: [
    'Bsahték, ça régale !',
    'Sahha, on est riches maintenant !',
    'Ça tinte dans la poche.',
    'Des pièces, des pièces, encore des pièces.',
    'On va pouvoir se faire plaisir.',
    'Tu fais pleuvoir la monnaie.',
    'Bon, ça paie le café.',
  ],
  bigReward: [
    'Mashallah, incroyable !',
    'Wallah, t\'as une chance de malade !',
    'Ya latif, le jackpot !',
    'Alors ça, c\'est du lourd.',
    'Je n\'en crois pas mes yeux.',
    'Tu me fais rêver, là.',
    'Waouh. Rien à dire.',
  ],
  outfitUnlocked: [
    'Mashallah, elle te va trop bien !',
    'Bsahték, profite !',
    'Enfin ! Elle t\'attendait.',
    'Celle-là, je veux la voir tout de suite.',
    'Nouvelle tenue, nouvelle star.',
    'Va l\'essayer, vite.',
    'Elle est faite pour toi, sans discuter.',
  ],
  romanticMoment: [
    'Mashallah, t\'es magnifique.',
    'Ya rouhi… j\'avais envie de te faire plaisir.',
    'Twahechtek, viens on passe un moment ensemble.',
    'Ya aïni, tu me regardes comme ça et j\'oublie tout.',
    'Rabi yahfdek, toi. Voilà.',
    'Rien de spécial. Juste toi et moi.',
    'Viens, on s\'assoit deux minutes.',
    'Qalbi, j\'avais besoin de te dire un truc : merci.',
  ],
  casinoWin: [
    'Sahha, ça tombe bien !',
    'Bsahték, la chance te suit.',
    'Joli coup !',
    'Tu as le sens du jeu, toi.',
    'Allez, un petit gain pour la bonne humeur.',
    'Pas mal, madame la joueuse.',
  ],
  casinoJackpot: [
    'Ya latif, le jackpot !',
    'Mashallah, incroyable !',
    'Wallah, je n\'y crois pas.',
    'Alors là, chapeau.',
    'Les jetons pleuvent, c\'est de la folie.',
    'Tu m\'as coupé le souffle.',
  ],
  casinoLose: [
    'Pas grave, ça arrive.',
    'La prochaine sera la bonne.',
    'Ce ne sont que des jetons, on rit.',
    'On respire et on rejoue si ça te dit.',
    'Même la chance a besoin d\'une pause.',
    'Je te garde ta place à la table.',
  ],
  eventTease: [
    'Alors, tu fais ta timide ?',
    'Je sais que tu as envie, avoue.',
    'Mashallah, quelle assurance !',
    'Tu me fais marcher, là.',
    'Je dis ça, je dis rien.',
    'Wallah, je te surveille.',
  ],
  eventCheer: [
    'Allez, tu y es presque.',
    'Courage, ça va le faire.',
    'Sahha, bravo, tu y es arrivée !',
    'Tu fais ça très bien.',
    'Je crois en toi, vraiment.',
    'Prends ton temps, on a toute la soirée.',
  ],
  restaurant: [
    'On prend le temps, ce soir.',
    'Choisis ce que tu veux, c\'est pour moi.',
    'Je te laisse commander, je vais encore tout prendre pareil.',
    'Sahha, ça sent bon !',
    'Bsahték, régale-toi.',
    'Tu me laisses goûter ton dessert, hein ?',
    'Et là, on ne parle pas du travail.',
  ],
  outing: [
    'Une petite sortie, rien que nous.',
    'Mets tes chaussures confortables, on marche.',
    'J\'ai prévu un petit détour, tu verras.',
    'Mashallah, quelle belle soirée.',
    'Qu\'est-ce qu\'on s\'amuse.',
    'Tu me tiens la main, ou je dois demander ?',
    'Ya rouhi, regarde cette vue.',
  ],
  quarry: [
    'Les pierres ne se casseront pas toutes seules.',
    'Casque sur la tête, madame la cheffe de chantier.',
    'Sahha, belle trouvaille !',
    'Ça fait du bien de se salir les mains.',
    'Bon, qui porte la brouette ?',
    'Une belle pierre, c\'est une belle fondation.',
    'Wallah, elle est solide celle-là.',
  ],
  castleWork: [
    'Le château avance bien.',
    'Encore une pièce de faite, bravo.',
    'On met un coup de peinture et ça repart.',
    'Bsahték, c\'est de plus en plus beau.',
    'Ça prend forme, regarde.',
    'Tu diriges le chantier mieux que moi.',
  ],
  chocolateFactory: [
    'Ça sent le chocolat jusque dans le couloir.',
    'Je goûte, c\'est pour la qualité.',
    'Sahha, une fournée de plus !',
    'Chaque bonbon est testé par mes soins.',
    'Hmm, j\'en reprendrais bien.',
    'Mashallah, quel parfum.',
  ],
  catPlay: [
    'Il a l\'air d\'avoir pris le contrôle du château.',
    'Qui est le patron ici ? Pas moi, en tout cas.',
    'Il joue la star, comme toi.',
    'Ya latif, il a encore sauté sur la table !',
    'Il ronronne, c\'est bon signe.',
    'Regarde-moi cette petite boule de poils.',
  ],
};

const GALBI = /galbi/i;
export const hasGalbi = (s: string): boolean => GALBI.test(s);

/** Mémoire de tirage : dernières répliques, historique des 10 derniers tirages (avec galbi ou non). */
export interface ToneMemory { recent: string[]; galbiHistory: boolean[]; darijaHistory?: boolean[] }
const defaultMemory: ToneMemory = { recent: [], galbiHistory: [], darijaHistory: [] };
/** Au plus 2 répliques arabes/darija d'affilée (pas dans chaque dialogue). */
const DARIJA_STREAK = 2;
const RECENT_MAX = 12;
const WINDOW = 10;

export interface PickOpts { noGalbi?: boolean; memory?: ToneMemory }

export function resetAugusteTone(mem: ToneMemory = defaultMemory): void {
  mem.recent.length = 0;
  mem.galbiHistory.length = 0;
  if (mem.darijaHistory) mem.darijaHistory.length = 0;
}

export function pickLine(situation: Situation, rng: () => number = Math.random, opts: PickOpts = {}): string {
  const mem = opts.memory ?? defaultMemory;
  const all = LINES[situation];
  const last = mem.galbiHistory[mem.galbiHistory.length - 1] === true;
  const recentGalbi = mem.galbiHistory.slice(-(WINDOW - 1)).some(Boolean);
  const galbiAllowed = !opts.noGalbi && !last && !recentGalbi;
  const dh = mem.darijaHistory ?? (mem.darijaHistory = []);
  const streak = dh.length >= DARIJA_STREAK && dh.slice(-DARIJA_STREAK).every(Boolean);
  const avoid = mem.recent.slice(-(all.length - 1));
  const okD = (l: string): boolean => !streak || !hasDarija(l);
  let pool = all.filter((l) => (galbiAllowed || !hasGalbi(l)) && !avoid.includes(l) && okD(l));
  if (!pool.length || (pool.length === 1 && pool[0] === mem.recent[mem.recent.length - 1])) {
    const relaxed = all.filter((l) => (galbiAllowed || !hasGalbi(l)) && okD(l) && l !== mem.recent[mem.recent.length - 1]);
    if (relaxed.length) pool = relaxed;
  }
  if (!pool.length) pool = all.filter((l) => (galbiAllowed || !hasGalbi(l)) && !avoid.includes(l));
  if (!pool.length) pool = all.filter((l) => galbiAllowed || !hasGalbi(l));
  if (!pool.length) pool = all.filter((l) => !hasGalbi(l));
  // jamais la même réplique deux fois de suite, quelles que soient les contraintes
  const lastLine = mem.recent[mem.recent.length - 1];
  if (pool.length > 1) pool = pool.filter((l) => l !== lastLine);
  else if (pool.length === 1 && pool[0] === lastLine) {
    const alt = all.filter((l) => l !== lastLine && (galbiAllowed || !hasGalbi(l)));
    pool = alt.length ? alt : all.filter((l) => l !== lastLine && !hasGalbi(l));
  }
  // la minorité « galbi » est tirée plus rarement encore
  const plain = pool.filter((l) => !hasGalbi(l));
  if (plain.length && pool.length > plain.length && rng() > 0.25) pool = plain;
  const line = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  mem.recent.push(line);
  if (mem.recent.length > RECENT_MAX) mem.recent.shift();
  mem.galbiHistory.push(hasGalbi(line));
  if (mem.galbiHistory.length > 50) mem.galbiHistory.shift();
  dh.push(hasDarija(line));
  if (dh.length > 50) dh.shift();
  return line;
}

export function augusteLineStats(): { total: number; galbi: number; ratio: number; situations: number; darija: number; darijaRatio: number } {
  const all = Object.values(LINES).flat();
  const galbi = all.filter(hasGalbi).length;
  const darija = all.filter(hasDarija).length;
  return { total: all.length, galbi, ratio: all.length ? galbi / all.length : 0, situations: Object.keys(LINES).length, darija, darijaRatio: all.length ? darija / all.length : 0 };
}
