/**
 * Objets fusionnables — 4 collections de 10 niveaux + 3 objets spéciaux.
 * Ces chaînes sont les recettes de fusion fictives du jeu (elles ne suivent
 * pas les règles des échecs classiques pour la collection « Échecs »).
 */
export type CollectionId = 'flowers' | 'love' | 'paris' | 'chess';
export type ItemColl = CollectionId | 'special';

export interface ItemRef { c: ItemColl; l: number }

export const MAX_LEVEL = 10;

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
};

export const SPECIAL_ITEMS: Record<number, { name: string; blurb: string }> = {
  1: { name: 'Étoile filante', blurb: 'Pose-la sur un objet pour le faire monter d\'un niveau.' },
  2: { name: 'Clé dorée', blurb: 'Pose-la sur un paquet cadeau pour l\'ouvrir tout de suite.' },
  3: { name: 'Coffret surprise', blurb: 'Touche-le pour l\'ouvrir : trois objets en sortent.' },
};

export const COLLECTION_IDS: CollectionId[] = ['flowers', 'love', 'paris', 'chess'];

export const itemKey = (r: ItemRef) => `${r.c}:${r.l}`;
export const parseKey = (k: string): ItemRef => {
  const [c, l] = k.split(':');
  return { c: c as ItemColl, l: Number(l) };
};
export const sameItem = (a: ItemRef | null | undefined, b: ItemRef | null | undefined) =>
  !!a && !!b && a.c === b.c && a.l === b.l;

export function itemName(r: ItemRef): string {
  if (r.c === 'special') return SPECIAL_ITEMS[r.l]?.name ?? 'Objet spécial';
  return COLLECTIONS[r.c].items[r.l - 1] ?? '?';
}

export function itemBlurb(r: ItemRef): string {
  if (r.c === 'special') return SPECIAL_ITEMS[r.l]?.blurb ?? '';
  return COLLECTIONS[r.c].blurbs[r.l - 1] ?? '';
}

/** Tous les objets du jeu (pour les collections, les textures et les tests). */
export function allItems(): ItemRef[] {
  const out: ItemRef[] = [];
  for (const c of COLLECTION_IDS) for (let l = 1; l <= MAX_LEVEL; l++) out.push({ c, l });
  for (const l of [1, 2, 3]) out.push({ c: 'special', l });
  return out;
}

/** Valeur en points d'un objet créé par fusion. */
export const mergePoints = (l: number) => 5 * Math.pow(2, l - 1);
