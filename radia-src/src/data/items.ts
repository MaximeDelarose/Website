/**
 * Objets fusionnables — 4 collections de 10 niveaux + 10 collections d'Endless 2.0 (8 niveaux,
 * dont Pâtisseries, Sacs et Cadeaux) + 3 objets spéciaux. Utilise toujours `collMax(c)` (jamais MAX_LEVEL) pour le niveau maximal.
 * Ces chaînes sont les recettes de fusion fictives du jeu (elles ne suivent
 * pas les règles des échecs classiques pour la collection « Échecs »).
 */
export type CollectionId = 'flowers' | 'love' | 'paris' | 'chess' | 'rare' | 'choc' | 'jewel' | 'cloth' | 'perfume' | 'acc' | 'castle' | 'pastry' | 'bag' | 'gift' | 'soap';
export type ItemColl = CollectionId | 'special' | 'gen';

export interface ItemRef { c: ItemColl; l: number }

/** Niveau maximal des 4 collections d'origine (les nouvelles en ont 8 : voir `collMax`). */
export const MAX_LEVEL = 10;

/** Raretés (drops, coffres) et leurs couleurs. */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_COLOR: Record<Rarity, string> = { common: '#9FB4C7', uncommon: '#6FCF97', rare: '#5AA9FF', epic: '#B07CFF', legendary: '#FFC857' };
export const RARITY_NAME: Record<Rarity, string> = { common: 'Commun', uncommon: 'Peu commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' };

export const SPECIAL = {
  /** Étoile filante : posée sur n'importe quel objet (sauf niveau max), elle le fait monter d'un niveau. */
  STAR: 1,
  /** Clé dorée : posée sur un paquet cadeau, elle l'ouvre. */
  KEY: 2,
  /** Coffret surprise : un toucher l'ouvre et fait apparaître 3 objets. */
  BOX: 3,
} as const;

export interface CollectionDef {
  id: CollectionId;
  name: string;
  color: string;
  items: string[]; // index 0 = niveau 1
  blurbs: string[];
}

export const COLLECTIONS: Record<CollectionId, CollectionDef> = {
  flowers: {
    id: 'flowers',
    name: 'Fleurs',
    color: '#FF75A8',
    items: ['Graine', 'Pousse', 'Bourgeon', 'Fleur', 'Bouquet', 'Composition', 'Jardin', 'Jardin enchanté', 'Fleur légendaire', 'Rose éternelle'],
    blurbs: [
      'Toute petite, mais pleine de promesses.',
      'Elle pousse doucement, comme un sourire.',
      'Encore fermé… mais plus pour longtemps.',
      'La première fleur, rien que pour toi.',
      'Un bouquet, parce qu\'une seule fleur ne suffisait pas.',
      'Une composition digne d\'une vitrine parisienne.',
      'Un jardin entier. Il a fallu beaucoup de graines.',
      'Les fleurs y brillent même la nuit.',
      'On raconte qu\'elle ne fleurit que pour une reine.',
      'Elle ne fane jamais. Comme certaines choses.',
    ],
  },
  love: {
    id: 'love',
    name: 'Amour',
    color: '#E8558F',
    items: ['Étincelle', 'Petit cœur', 'Mot doux', 'Lettre', 'Enveloppe', 'Cadeau', 'Coffret', 'Bijou', 'Cœur précieux', 'Trésor du cœur'],
    blurbs: [
      'Tout commence par une petite étincelle.',
      'Petit, mais il bat fort.',
      '« Galbi. » Tout est dit.',
      'Écrite à la main, avec trois ratures.',
      'Scellée avec un cœur, évidemment.',
      'Emballé avec beaucoup trop de ruban.',
      'Un coffret… qu\'est-ce qu\'il peut bien cacher ?',
      'Il brille presque autant que tes yeux.',
      'Rare, fragile, inestimable.',
      'Le plus beau trésor du royaume.',
    ],
  },
  paris: {
    id: 'paris',
    name: 'Paris',
    color: '#B9A5E8',
    items: ['Ticket', 'Café', 'Photo', 'Souvenir', 'Carte postale', 'Album', 'Cadre', 'Lumière de Paris', 'Souvenir doré', 'Paris enchanté'],
    blurbs: [
      'Un ticket de métro, direction le Nord de Paris bb.',
      'Un café en terrasse, pour se réchauffer.',
      'Une photo un peu floue, mais parfaite.',
      'Un petit souvenir qu\'on garde dans sa poche.',
      '« C\'est cool dans le Nord de Paris bb. »',
      'Un album rempli de moments simples.',
      'Certains souvenirs méritent un cadre.',
      'Les lumières de Paris, la nuit, sous la pluie.',
      'Un souvenir si beau qu\'il en devient doré.',
      'Paris, mais en mieux : avec toi.',
    ],
  },
  chess: {
    id: 'chess',
    name: 'Échecs',
    color: '#F3C86B',
    items: ['Pion', 'Cavalier', 'Fou', 'Tour', 'Dame', 'Couronne', 'Trône', 'Royaume', 'Château', 'Reine éternelle'],
    blurbs: [
      'Un petit pion qui rêve de grandeur.',
      'Il saute partout, un peu comme Auguste.',
      'Il avance en diagonale… et en riant.',
      'Solide, fidèle, toujours là.',
      'La pièce la plus puissante de l\'échiquier.',
      'Une couronne à ta taille.',
      'Un trône pour la reine du royaume.',
      'Le royaume de Radia, enfin réuni.',
      'Un château de lumière au bord de l\'échiquier.',
      'Dans ce royaume, il n\'y a qu\'une seule reine.',
    ],
  },
  rare: {
    id: 'rare',
    name: 'Fleurs rares',
    color: '#F29BD0',
    items: ['Pétale d\'or', 'Orchidée', 'Pivoine', 'Lys', 'Lotus', 'Bouquet rare', 'Serre cristal', 'Fleur de lune'],
    blurbs: [
      'Un pétale qui brille un peu trop pour être honnête.',
      'Capricieuse, élégante… ça te rappelle quelqu\'un ?',
      'Elle a l\'air d\'un gros câlin rose.',
      'Blanc, pur, et il sent divinement bon.',
      'Il flotte sur l\'eau et sur tous tes soucis.',
      'Un bouquet que même le fleuriste n\'ose pas vendre.',
      'Une serre en cristal : les fleurs y sont aux petits soins.',
      'Elle ne s\'ouvre que la nuit, pour les amoureux.',
    ],
  },
  choc: {
    id: 'choc',
    name: 'Chocolats',
    color: '#9A5B3A',
    items: ['Fève', 'Truffe', 'Praliné', 'Bonbon', 'Boîte', 'Coffret', 'Fontaine', 'Chocolaterie royale'],
    blurbs: [
      'Petite fève, grand destin.',
      'Elle fond dans la bouche… et dans le cœur.',
      'Croquant dehors, tendre dedans. Comme Auguste.',
      'Un bonbon emballé avec soin (et un peu de gourmandise).',
      'Une boîte qu\'on ouvre en cachette.',
      'Un coffret pour les grandes occasions. Ou les mardis.',
      'Une fontaine de chocolat. Oui, c\'est légal.',
      'Le palais du cacao, avec vue sur le bonheur.',
    ],
  },
  jewel: {
    id: 'jewel',
    name: 'Bijoux',
    color: '#7FD6E8',
    items: ['Perle', 'Bague', 'Boucle', 'Collier', 'Bracelet', 'Diadème', 'Écrin', 'Parure royale'],
    blurbs: [
      'Une perle, pour commencer en douceur.',
      'Un petit cercle, une grosse promesse.',
      'Elle accroche la lumière (et les regards).',
      'Il se fait discret, puis il éblouit.',
      'Il tinte à chaque geste. Musique garantie.',
      'Un diadème : pas besoin de raison pour le porter.',
      'Un écrin de velours, rien que pour elle.',
      'La parure complète. Le royaume retient son souffle.',
    ],
  },
  cloth: {
    id: 'cloth',
    name: 'Vêtements',
    color: '#E58FB6',
    items: ['Ruban', 'Écharpe', 'Chemisier', 'Jupe', 'Veste', 'Robe', 'Robe de soirée', 'Tenue de gala'],
    blurbs: [
      'Un simple ruban, mais il fait tout le style.',
      'Douce, longue, parfaite contre le vent de Paris.',
      'Repassé avec amour (et un peu de panique).',
      'Elle tourne bien. Très bien, même.',
      'Pour les soirs où il fait un peu frais.',
      'La robe. Celle dont on se souvient.',
      'Elle brille, elle danse, elle fait taire la salle.',
      'La tenue de gala : tout le monde se retourne.',
    ],
  },
  perfume: {
    id: 'perfume',
    name: 'Parfums',
    color: '#C79BE8',
    items: ['Pétale parfumé', 'Fiole', 'Flacon', 'Brume', 'Eau de parfum', 'Coffret parfum', 'Cristal', 'Essence rare'],
    blurbs: [
      'Un pétale qui sent le printemps.',
      'Une toute petite fiole, un grand souvenir.',
      'Le flacon qu\'on ne prête à personne.',
      'Un nuage léger, juste derrière l\'oreille.',
      'Elle entre dans la pièce avant toi.',
      'Trois parfums dans une boîte. Dur de choisir.',
      'Un cristal taillé pour contenir un souvenir.',
      'Une essence introuvable. Elle sent… toi.',
    ],
  },
  acc: {
    id: 'acc',
    name: 'Accessoires',
    color: '#E8A25A',
    items: ['Épingle', 'Lunettes', 'Foulard', 'Gants', 'Sac', 'Chapeau', 'Malle', 'Sac iconique'],
    blurbs: [
      'Une épingle pour tenir les idées en place.',
      'Elles font très sérieux. Jusqu\'au premier fou rire.',
      'Noué avec un petit je-ne-sais-quoi.',
      'Pour les mains froides (et les entrées remarquées).',
      'Assez grand pour ranger un livre, un goûter, un secret.',
      'Un chapeau qui change l\'allure, et un peu l\'humeur.',
      'Une malle de voyage. Direction : n\'importe où, avec toi.',
      'Le sac que tout le monde reconnaît.',
    ],
  },
  castle: {
    id: 'castle',
    name: 'Objets du château',
    color: '#8FA0D8',
    items: ['Brique', 'Bougeoir', 'Coussin', 'Tapis', 'Fauteuil', 'Lustre', 'Canapé royal', 'Trône doré'],
    blurbs: [
      'La première brique du château. Solide.',
      'Il éclaire les couloirs et les confidences.',
      'Mou, moelleux, volé par le chat dans la minute.',
      'Il étouffe le bruit des pas… et des surprises.',
      'Le meilleur fauteuil pour ne rien faire.',
      'Mille petites lumières au plafond.',
      'Un canapé où l\'on tient à plusieurs. Surtout avec le chat.',
      'Un trône en or, parce que ma reine le mérite.',
    ],
  },
  pastry: {
    id: 'pastry',
    name: 'Pâtisseries',
    color: '#F6A5BE',
    items: ['Macaron', 'Éclair', 'Tartelette', 'Cupcake', 'Gâteau', 'Entremets', 'Pièce montée', 'Pâtisserie royale'],
    blurbs: [
      'Un macaron rose : il ne dure jamais plus de dix secondes.',
      'Long, brillant, glacé. Auguste en a déjà volé un.',
      'Une tartelette aux fruits rouges, posée avec amour.',
      'Une cerise sur le dessus, comme sur le reste.',
      'Un vrai gâteau, avec des bougies et des vœux.',
      'Des couches de crème, de biscuit et de patience.',
      'Un édifice de choux dorés. Ça se mange avec les yeux d\'abord.',
      'La plus belle vitrine du royaume, entièrement comestible.',
    ],
  },
  bag: {
    id: 'bag',
    name: 'Sacs',
    color: '#C98B6B',
    items: ['Pochette', 'Tote bag', 'Besace', 'Cabas', 'Sac à main', 'Sac du soir', 'Sac de créateur', 'Sac légendaire'],
    blurbs: [
      'Juste assez grande pour un rouge à lèvres et un secret.',
      'Léger, pratique, déjà plein de livres.',
      'Pour les balades à Paris, les mains libres.',
      'On y met tout. Même ce qui n\'est pas à nous.',
      'Un classique : il va avec absolument tout.',
      'Petit, brillant, il ne contient que le nécessaire.',
      'Une pièce signée, cousue main, rare comme un sourire.',
      'On le reconnaît de loin. Les regards aussi.',
    ],
  },
  gift: {
    id: 'gift',
    name: 'Cadeaux',
    color: '#E86F9B',
    items: ['Nœud', 'Petit mot', 'Paquet', 'Boîte à ruban', 'Coffret cadeau', 'Grand coffret', 'Surprise étoilée', 'Cadeau royal'],
    blurbs: [
      'Un petit nœud. Le début de toute surprise.',
      'Quelques mots doux glissés sous le ruban.',
      'Emballé avec soin (et beaucoup trop de scotch).',
      'Un ruban si bien noué qu\'on n\'ose plus l\'ouvrir.',
      'Un coffret garni, avec une carte écrite à la main.',
      'Plus grand qu\'il n\'en a l\'air. Beaucoup plus.',
      'Des étoiles s\'en échappent dès qu\'on le regarde.',
      'Le cadeau parfait : celui qui dit « je pense à toi ».',
    ],
  },
  // PIMBÊCHE : TOUS les savons sont au LAIT DE CHÈVRE (identité de la marque). Chaîne : ingrédient → préparation → moulage → parfum → savon terminé → emballage → coffret.
  // Les variantes (rose, lavande, miel…) sont des recettes fictives du jeu, jamais des formulations officielles de la marque ; elles gardent toujours la base au lait de chèvre.
  soap: {
    id: 'soap',
    name: 'Savons PIMBÊCHE au lait de chèvre',
    color: '#E9A8C6',
    items: ['Lait de chèvre PIMBÊCHE', 'Pâte de savon au lait de chèvre', 'Savon moulé au lait de chèvre', 'Savon parfumé au lait de chèvre', 'Savon PIMBÊCHE terminé', 'Savon PIMBÊCHE emballé', 'Coffret de savons PIMBÊCHE', 'Coffret PIMBÊCHE de luxe'],
    blurbs: [
      'Le lait de chèvre frais de la maison. Tous les savons PIMBÊCHE commencent ici.',
      'Le lait de chèvre est mélangé à la base : une pâte douce et crémeuse.',
      'Le mélange est versé dans le moule : un petit cœur en relief, sans une bulle.',
      'Rose, lavande ou miel : la recette change, la base au lait de chèvre reste.',
      'Le savon est terminé : une petite fleur de lait de chèvre, presque trop jolie pour servir.',
      'Emballé avec soin, signé du P doré de PIMBÊCHE.',
      'Trois savons au lait de chèvre, un ruban : le cadeau qu\'on garde pour soi.',
      'Le coffret de la maison PIMBÊCHE. Doré, doux, au lait de chèvre.',
    ],
  },
};

export const SPECIAL_ITEMS: Record<number, { name: string; blurb: string }> = {
  1: { name: 'Étoile filante', blurb: 'Pose-la sur un objet pour le faire monter d\'un niveau.' },
  2: { name: 'Clé dorée', blurb: 'Pose-la sur un paquet cadeau pour l\'ouvrir tout de suite.' },
  3: { name: 'Coffret surprise', blurb: 'Touche-le pour l\'ouvrir : trois objets en sortent.' },
};

/** Ordre = ordre des générateurs (kind = index + 1) et ordre de déblocage dans Endless 2.0. */
export const COLLECTION_IDS: CollectionId[] = ['flowers', 'love', 'paris', 'chess', 'rare', 'choc', 'jewel', 'cloth', 'perfume', 'acc', 'castle', 'pastry', 'bag', 'gift', 'soap'];
/** Les 4 collections d'origine (10 niveaux, mode histoire). */
export const LEGACY_COLLECTION_IDS: CollectionId[] = ['flowers', 'love', 'paris', 'chess'];

/** Niveau maximal d'une collection (10 pour les anciennes, 8 pour les nouvelles ; 1 pour spécial/générateur). */
export function collMax(c: ItemColl): number {
  if (c === 'special' || c === 'gen') return 1;
  return COLLECTIONS[c]?.items.length ?? MAX_LEVEL;
}

/**
 * Générateurs posés sur le plateau ({ c: 'gen', l: 1..4 }) : on les touche pour
 * produire des objets de leur collection (1 énergie par toucher).
 */
export const GENERATORS: Record<number, { coll: CollectionId; name: string; blurb: string }> = {
  1: { coll: 'flowers', name: 'Pot de fleurs magique', blurb: 'Touche-le : il fait pousser des graines (1 ⚡).' },
  2: { coll: 'love', name: 'Boîte aux lettres', blurb: 'Touche-la : elle offre des étincelles d\'amour (1 ⚡).' },
  3: { coll: 'paris', name: 'Appareil photo', blurb: 'Touche-le : il imprime des souvenirs de Paris (1 ⚡).' },
  4: { coll: 'chess', name: 'Coffret d\'échecs', blurb: 'Touche-le : il libère des pièces du royaume (1 ⚡).' },
  5: { coll: 'rare', name: 'Serre miniature', blurb: 'Touche-la : elle fait éclore des fleurs rares (1 ⚡).' },
  6: { coll: 'choc', name: 'Chocolatière', blurb: 'Touche-la : elle prépare des chocolats tout chauds (1 ⚡).' },
  7: { coll: 'jewel', name: 'Coffre à bijoux', blurb: 'Touche-le : il laisse tomber des perles et des bagues (1 ⚡).' },
  8: { coll: 'cloth', name: 'Machine à coudre', blurb: 'Touche-la : elle coud des rubans et des étoffes (1 ⚡).' },
  9: { coll: 'perfume', name: 'Alambic parfumé', blurb: 'Touche-le : il distille des pétales parfumés (1 ⚡).' },
  10: { coll: 'acc', name: 'Boîte à chapeaux', blurb: 'Touche-la : elle offre des accessoires chics (1 ⚡).' },
  11: { coll: 'castle', name: 'Malle du château', blurb: 'Touche-la : elle livre des objets pour le château (1 ⚡).' },
  12: { coll: 'pastry', name: 'Four du pâtissier', blurb: 'Touche-le : il sort des macarons tout chauds (1 ⚡).' },
  13: { coll: 'bag', name: 'Vitrine à sacs', blurb: 'Touche-la : elle présente des sacs de saison (1 ⚡).' },
  14: { coll: 'gift', name: 'Atelier d\'emballage', blurb: 'Touche-le : il noue des rubans et des surprises (1 ⚡).' },
  15: { coll: 'soap', name: 'Atelier PIMBÊCHE', blurb: 'Touche-le : il sort du lait de chèvre et des pâtes de savon à fusionner (1 ⚡).' },
};
export const genKindOf = (c: CollectionId): number => COLLECTION_IDS.indexOf(c) + 1;
export const isGen = (r: ItemRef | null | undefined): boolean => !!r && r.c === 'gen';

export const itemKey = (r: ItemRef) => `${r.c}:${r.l}`;
export const parseKey = (k: string): ItemRef => {
  const [c, l] = k.split(':');
  return { c: c as ItemColl, l: Number(l) };
};
export const sameItem = (a: ItemRef | null | undefined, b: ItemRef | null | undefined) =>
  !!a && !!b && a.c === b.c && a.l === b.l;

export function itemName(r: ItemRef): string {
  if (r.c === 'special') return SPECIAL_ITEMS[r.l]?.name ?? 'Objet spécial';
  if (r.c === 'gen') return GENERATORS[r.l]?.name ?? 'Générateur';
  return COLLECTIONS[r.c].items[r.l - 1] ?? '?';
}

export function itemBlurb(r: ItemRef): string {
  if (r.c === 'special') return SPECIAL_ITEMS[r.l]?.blurb ?? '';
  if (r.c === 'gen') return GENERATORS[r.l]?.blurb ?? '';
  return COLLECTIONS[r.c].blurbs[r.l - 1] ?? '';
}

/** Tous les objets du jeu (pour les collections, les textures et les tests). */
export function allItems(): ItemRef[] {
  const out: ItemRef[] = [];
  for (const c of COLLECTION_IDS) for (let l = 1; l <= collMax(c); l++) out.push({ c, l });
  for (const l of [1, 2, 3]) out.push({ c: 'special', l });
  return out;
}

/** Valeur en points d'un objet créé par fusion. */
export const mergePoints = (l: number) => 5 * Math.pow(2, l - 1);
