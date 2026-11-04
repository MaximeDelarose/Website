/**
 * Banque de répliques d'Auguste par situation + tirage anti-répétition.
 *
 * API stable (utilisée par les autres modules) :
 *   - `LINES: Record<Situation, string[]>`  : ≥ 5 variantes par situation, « galbi » très rare.
 *   - `pickLine(situation, rng?, opts?)`    : renvoie une réplique, sans répéter les dernières ;
 *        plafond mécanique : au plus 1 réplique avec « galbi » sur 10 tirages, jamais deux d'affilée.
 *        opts.noGalbi = true force une réplique sans « galbi » ; opts.memory = mémoire isolée (tests).
 *   - `augusteLineStats()`                  : nb de répliques, nb avec « galbi », proportion.
 *   - `resetAugusteTone()`                  : vide la mémoire (tests).
 * Ton : naturel, drôle, taquin, tendre ; jamais théâtral ; aucun prénom d'enfant.
 */

export type Situation =
  | 'outfitNice' | 'diamonds' | 'miniGameWin' | 'furniture' | 'rare' | 'outfitChange' | 'reward'
  | 'romantic' | 'tender' | 'fusionRare' | 'fusionMax' | 'combo' | 'chest' | 'drop' | 'dailyGift'
  | 'incidentLeak' | 'incidentPower' | 'incidentGarden' | 'incidentParcel' | 'incidentCat'
  | 'incidentRareFlower' | 'incidentChoc' | 'incidentShop' | 'tindeurKeep' | 'tindeurUninstall'
  | 'orderDone' | 'energyLow' | 'welcomeBack';

export const LINES: Record<Situation, string[]> = {
  outfitNice: [
    'Attends… mais elle te va beaucoup trop bien !',
    'Là, je ne suis plus objectif du tout.',
    'Celle-là, garde-la pour les grandes occasions. Ou pour moi.',
    'Tourne un peu, que je vérifie que c\'est pas un rêve.',
    'Franchement, tu pourrais porter un sac-poubelle, mais là, c\'est du niveau au-dessus.',
    'Galbi… tu comptes me laisser respirer avec cette tenue ?',
  ],
  diamonds: [
    'Bon, je crois que tu vas encore vider ma boutique.',
    'Ça brille beaucoup. Presque autant que toi.',
    'Je regarde le solde de ma carte et je souris quand même.',
    'Des diamants, encore ? Tu as de l\'ambition, j\'aime ça.',
    'Allez, dépense-les, ils sont là pour ça.',
  ],
  miniGameWin: [
    'Ah ouais, carrément ! Bien joué.',
    'Propre. Même pas besoin de me regarder en coin.',
    'Je note : un point pour toi, zéro pour mon ego.',
    'Pas mal du tout, madame la championne.',
    'Bon, d\'accord, tu gères.',
    'Trop forte, galbi !',
  ],
  furniture: [
    'Franchement, notre château commence à avoir de la gueule.',
    'Ça fait déjà plus chez soi.',
    'Là, ça commence à te ressembler.',
    'Je ne savais pas qu\'un fauteuil pouvait changer autant l\'ambiance.',
    'Beau coup d\'œil pour la déco.',
  ],
  rare: [
    'Mais t\'as une chance de malade !',
    'Attends, elle est vraiment rare, celle-là !',
    'Ça, on le garde précieusement.',
    'Je n\'en avais jamais vu en vrai. Waouh.',
    'Tu as le doigt magique, ou quoi ?',
  ],
  outfitChange: [
    'Non mais attends, t\'es vraiment trop belle comme ça.',
    'Nouveau look, nouvelle Radia. J\'approuve.',
    'Celle-ci, je la valide les yeux fermés.',
    'Hop, un petit changement qui change tout.',
    'Tu me refais le coup de l\'entrée en scène ?',
  ],
  reward: [
    'Tiens, ça c\'est pour toi.',
    'Une petite attention, rien de plus.',
    'Tu l\'as bien mérité.',
    'Prends, prends. Je ne reprends pas.',
    'Je savais que ça te ferait sourire.',
  ],
  romantic: [
    'J\'avais juste envie de te faire plaisir.',
    'Ce soir, tu ne fais rien d\'autre que profiter.',
    'Pas de raison particulière. Juste toi.',
    'J\'ai prévu quelque chose, mais chut.',
    'Je voulais qu\'on ait un moment rien qu\'à nous.',
    'Habille-toi, galbi, je t\'emmène quelque part.',
  ],
  tender: [
    'Je suis content de partager tout ça avec toi.',
    'Tu sais quoi ? Je suis bien, là, avec toi.',
    'Merci d\'être toi. Voilà, c\'est dit.',
    'Si je pouvais figer un moment, ce serait celui-là.',
    'Galbi… je suis content de partager tout ça avec toi.',
  ],
  fusionRare: [
    'Oh, celle-là brille différemment.',
    'Une belle pièce ! Tu viens d\'enrichir la collection.',
    'Ça, c\'est du beau travail.',
    'Mais c\'est qu\'elle devient sérieuse, cette collection.',
    'Je te le dis : ça a de la valeur.',
  ],
  fusionMax: [
    'Niveau maximum ! Ça se fête.',
    'Là, tu as atteint le sommet. Bravo.',
    'Une collection complète à ce niveau, c\'est du sérieux.',
    'Rien à ajouter, c\'est parfait.',
    'Je crois qu\'on vient de battre un record.',
  ],
  combo: [
    'Ça enchaîne !',
    'Les fusions se suivent, c\'est hypnotisant.',
    'Doucement, tu vas me donner le tournis.',
    'Quelle série !',
    'Là, tu es en feu.',
    'Tu gères, galbi !',
  ],
  chest: [
    'Un coffre ! Voyons ce qu\'il cache.',
    'Ouvre, ouvre, j\'ai hâte.',
    'Cette fois, je mise sur quelque chose de gros.',
    'Allez, un petit suspense…',
    'Ça sent la belle surprise.',
  ],
  drop: [
    'Tiens, un petit cadeau du hasard.',
    'Oh, ça tombe bien !',
    'On ne dit pas non à un bonus.',
    'Le plateau est généreux aujourd\'hui.',
    'Ramasse, c\'est pour toi.',
  ],
  dailyGift: [
    'Le cadeau du jour t\'attend.',
    'Un petit quelque chose pour bien commencer.',
    'Tu reviens, et moi je gâte.',
    'Chaque jour son cadeau, c\'est la règle.',
    'Ouvre-le, il est fait pour toi.',
  ],
  incidentLeak: [
    'Bon, la fuite, c\'est pour moi. Ne t\'inquiète pas.',
    'Un peu d\'eau, ce n\'est pas la fin du monde. Je m\'en occupe.',
    'Le plombier arrive. Enfin, c\'est moi, le plombier.',
    'Ça goutte… je vais voir ça.',
    'Une petite fuite, une petite pause. Ça arrive.',
  ],
  incidentPower: [
    'Plus de lumière ? Ça nous fait un dîner aux bougies.',
    'Le courant est parti, mais pas nous.',
    'Je vais voir le tableau électrique, ne bouge pas.',
    'Petite panne, rien de grave.',
    'On a connu pire, et on a la lampe de poche.',
  ],
  incidentGarden: [
    'Le jardin a eu une journée agitée.',
    'Rien qu\'un peu de terre à remettre en place.',
    'On replante, ça poussera plus beau.',
    'Les fleurs ont de la ressource.',
    'Ça se rattrape, un jardin.',
  ],
  incidentParcel: [
    'Un colis est arrivé. Je n\'ai rien commandé, promis.',
    'Tiens, une livraison ! Je regarde ce que c\'est.',
    'Le facteur a sonné deux fois.',
    'Un paquet, un mystère.',
    'Je crois que c\'est pour toi.',
  ],
  incidentCat: [
    'Ton chat a encore fait des siennes.',
    'Il est mignon, mais il fait ce qu\'il veut.',
    'Il a l\'air très fier de lui.',
    'Je crois qu\'il nous teste.',
    'Il t\'aime, c\'est sa façon de le dire.',
  ],
  incidentRareFlower: [
    'Une fleur rare a éclos dans le jardin !',
    'Regarde, celle-là n\'était pas là hier.',
    'Elle est splendide. Il faut prendre une photo.',
    'Tu as bien fait d\'arroser, finalement.',
    'Ça n\'arrive pas tous les jours.',
  ],
  incidentChoc: [
    'Un petit incident à la chocolaterie. Ça sent bon, au moins.',
    'Le chocolat a débordé, mais personne ne s\'en plaindra.',
    'Je goûte pour vérifier que c\'est comestible.',
    'On rattrape ça avec une fournée de plus.',
    'Il en reste, rassure-toi.',
  ],
  incidentShop: [
    'La boutique a besoin d\'un coup de main.',
    'Un client difficile, mais on gère.',
    'Il manque un article, je regarde en réserve.',
    'Rien d\'insurmontable.',
    'On remet de l\'ordre et on repart.',
  ],
  tindeurKeep: [
    'Très bien, on la garde.',
    'Noté, elle reste.',
    'D\'accord, c\'est toi qui décides.',
    'Entendu.',
    'Comme tu veux.',
  ],
  tindeurUninstall: [
    'C\'est fait.',
    'Voilà, c\'est réglé.',
    'D\'accord, je m\'en occupe.',
    'Terminé.',
    'Comme tu veux.',
  ],
  orderDone: [
    'Commande livrée, et sans accroc.',
    'Un client de plus content.',
    'Nickel, on passe à la suivante ?',
    'Ça, c\'est du service.',
    'Bien emballé, bien livré.',
  ],
  energyLow: [
    'Un petit coup de fatigue ? Respire, on a le temps.',
    'Prends une pause, le plateau ne va nulle part.',
    'L\'énergie remonte toute seule, ne t\'en fais pas.',
    'Ça ne presse pas du tout.',
    'Un thé et on reprend ?',
  ],
  welcomeBack: [
    'Te revoilà !',
    'Tu m\'as manqué, tu sais.',
    'Ça faisait un moment. Tout va bien ?',
    'Je gardais la place au chaud.',
    'Alors, quoi de neuf ?',
    'Tu es là, galbi. Bonne surprise.',
  ],
};

const GALBI = /galbi/i;
export const hasGalbi = (s: string): boolean => GALBI.test(s);

/** Mémoire de tirage : dernières répliques, historique des 10 derniers tirages (avec galbi ou non). */
export interface ToneMemory { recent: string[]; galbiHistory: boolean[] }
const defaultMemory: ToneMemory = { recent: [], galbiHistory: [] };
const RECENT_MAX = 12;
const WINDOW = 10;

export interface PickOpts { noGalbi?: boolean; memory?: ToneMemory }

export function resetAugusteTone(mem: ToneMemory = defaultMemory): void {
  mem.recent.length = 0;
  mem.galbiHistory.length = 0;
}

export function pickLine(situation: Situation, rng: () => number = Math.random, opts: PickOpts = {}): string {
  const mem = opts.memory ?? defaultMemory;
  const all = LINES[situation];
  const last = mem.galbiHistory[mem.galbiHistory.length - 1] === true;
  const recentGalbi = mem.galbiHistory.slice(-(WINDOW - 1)).some(Boolean);
  const galbiAllowed = !opts.noGalbi && !last && !recentGalbi;
  const avoid = mem.recent.slice(-(all.length - 1));
  let pool = all.filter((l) => (galbiAllowed || !hasGalbi(l)) && !avoid.includes(l));
  if (!pool.length) pool = all.filter((l) => galbiAllowed || !hasGalbi(l));
  if (!pool.length) pool = all.filter((l) => !hasGalbi(l));
  // la minorité « galbi » est tirée plus rarement encore
  const plain = pool.filter((l) => !hasGalbi(l));
  if (plain.length && pool.length > plain.length && rng() > 0.25) pool = plain;
  const line = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  mem.recent.push(line);
  if (mem.recent.length > RECENT_MAX) mem.recent.shift();
  mem.galbiHistory.push(hasGalbi(line));
  if (mem.galbiHistory.length > 50) mem.galbiHistory.shift();
  return line;
}

export function augusteLineStats(): { total: number; galbi: number; ratio: number; situations: number } {
  const all = Object.values(LINES).flat();
  const galbi = all.filter(hasGalbi).length;
  return { total: all.length, galbi, ratio: all.length ? galbi / all.length : 0, situations: Object.keys(LINES).length };
}
