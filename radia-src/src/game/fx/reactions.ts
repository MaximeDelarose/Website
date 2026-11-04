/**
 * Réactions d'Auguste pendant les fusions (affichées par l'interface via
 * `augusteSays`). Naturelles, courtes, variées : humour, surprise, admiration,
 * tendresse. Jamais théâtral ; « galbi » reste rarissime (1 réplique sur ~12 au plus).
 */
import { hasDarija } from '../../data/darija';

export type ReactionKey = 'classic' | 'rare' | 'maxMerge' | 'combo3' | 'combo5' | 'chest' | 'drop';

export const AUGUSTE_REACTIONS: Record<ReactionKey, string[]> = {
  classic: [
    'Saha, propre !',
    'Bien joué ça !',
    'Ah ouais, joli !',
    'Nickel.',
    'Ça glisse tout seul.',
    'Pas mal du tout.',
    'Sahha, continue.',
    'Joli geste.',
  ],
  rare: [
    'Mais t\'as une chance de malade !',
    'Ah ouais, carrément ! Bien joué.',
    'Celle-là, elle est belle.',
    'Oh, tu vois ça ? Pas mal du tout.',
    'Franchement, tu t\'y prends bien.',
    'Hé, ça brille. Ça me plaît.',
    'Tu fais ça comme si c\'était facile.',
    'Rare, en plus. Tu m\'impressionnes.',
    'Ça, c\'est du beau travail.',
    'Mashallah, regarde-moi ça !',
    'Ya latif, t\'as trouvé quoi là ?!',
    'Mon cœur a fait un petit bond. Galbi.',
    'Attends, je la regarde encore un peu.',
    'Elle est vraiment jolie, celle-là.',
  ],
  maxMerge: [
    'Là, je dis bravo. Sincèrement.',
    'Le niveau max ! Je ne m\'y attendais pas.',
    'Eh ben… Tu viens de faire un truc énorme.',
    'Je suis fier de toi, tu sais.',
    'Elle est magnifique. Presque autant que toi.',
    'Regarde-moi ça. Je n\'ai pas de mots.',
    'Un chef-d\'œuvre. Et c\'est toi qui l\'as fait.',
    'Ça mérite de s\'asseoir deux secondes pour l\'admirer.',
    'Pas mal, pour une fusion du mardi.',
    'Waouh. Là, j\'applaudis tout seul.',
    'Bsahték, ça c\'est du lourd !',
    'Mashallah, le niveau max !',
    'C\'est le plus bel objet du plateau, sans discuter.',
    'Tu me surprends encore. J\'adore.',
  ],
  combo3: [
    'Ça s\'enchaîne bien, dis donc.',
    'Trois d\'affilée, tu es en forme.',
    'Continue, tu es lancée.',
    'Joli rythme.',
    'Oh, ça roule.',
    'Tu as les doigts qui dansent.',
    'Pas mal, pas mal du tout.',
    'Ça devient presque trop facile pour toi.',
    'Sahha, ça enchaîne !',
    'Mashallah, tu as des doigts de fée.',
  ],
  combo5: [
    'Cinq ! Tu es complètement dans ta bulle.',
    'Je n\'ose plus respirer, ne t\'arrête pas.',
    'Ah ouais, carrément ! Quelle série.',
    'C\'est de la magie, ce truc.',
    'Tu as vu ce combo ? Moi, oui. Bravo.',
    'Là, tu m\'épates vraiment.',
    'Ça vole, je ne sais pas comment tu fais.',
    'Si ça continue, je vais devoir t\'applaudir debout.',
    'Wallah, tu es en feu !',
    'Ya latif, quelle série !',
  ],
  chest: [
    'Tiens, ça c\'est pour toi.',
    'Un coffre ! Voyons ce qu\'il y a dedans.',
    'Ouvre, ouvre, je suis curieux.',
    'J\'espère qu\'il y a quelque chose de joli.',
    'Un petit cadeau du royaume.',
    'Oh, ça sent la bonne surprise.',
    'Je le gardais pour toi, celui-là. Enfin, presque.',
    'Alors, qu\'est-ce que ça donne ?',
    'Bsahték, c\'est pour toi !',
    'Ya latif, il est lourd, celui-là.',
  ],
  drop: [
    'Oh, un petit cadeau est tombé.',
    'Tiens, regarde ce qui est apparu.',
    'Ça, je ne l\'avais pas vu venir.',
    'La chance est de ton côté.',
    'Prends-le, il est pour toi.',
    'Hé, une trouvaille !',
    'Ça tombe bien, j\'en avais besoin. Enfin, toi.',
    'Quelle belle surprise.',
    'Sahha, un bonus !',
    'Wallah, il tombait bien, celui-là.',
  ],
};

/** Dernières réactions arabes/darija (au plus 2 d'affilée, toutes clés confondues). */
const darijaRun: boolean[] = [];

/** Mémoire anti-répétition : dernières répliques par clé. */
const recent = new Map<ReactionKey, string[]>();
const MEMORY = 3;

/**
 * Choisit une réplique au hasard sans répéter les 3 dernières de la même clé.
 * `rng` ∈ [0,1[ (par défaut Math.random).
 */
export function pickReaction(key: ReactionKey, rng: () => number = Math.random): string {
  const all = AUGUSTE_REACTIONS[key];
  const mem = recent.get(key) ?? [];
  const streak = darijaRun.length >= 2 && darijaRun.slice(-2).every(Boolean);
  let pool = all.filter((l) => !mem.includes(l) && !(streak && hasDarija(l)));
  if (!pool.length) pool = all.filter((l) => !mem.includes(l));
  const from = pool.length ? pool : all.filter((l) => l !== mem[mem.length - 1]);
  const line = from[Math.min(from.length - 1, Math.floor(rng() * from.length))];
  recent.set(key, [...mem, line].slice(-MEMORY));
  darijaRun.push(hasDarija(line));
  if (darijaRun.length > 10) darijaRun.shift();
  return line;
}

/** Tests : oublie les répliques récentes. */
export function resetReactionMemory(): void { recent.clear(); darijaRun.length = 0; }
