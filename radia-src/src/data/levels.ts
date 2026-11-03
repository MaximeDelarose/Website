/**
 * Les 30 niveaux de l'histoire (6 par chapitre).
 * Tout est modifiable ici sans toucher au moteur : panier (`gen`), objets de
 * départ (`start`), paquets cadeaux (`gifts`), commandes (`orders`),
 * objectifs, nombre de touches pour 3 étoiles (`par`) et récompense.
 *
 * Coordonnées du plateau : x de 0 à 5 (gauche → droite), y de 0 à 5 (haut → bas).
 * La récupération en cas de blocage (Souffle magique) est commune à tous les niveaux.
 */
import type { LevelDef, PlacedItem } from '../game/merge/types';

const P = (x: number, y: number, c: PlacedItem['c'], l: number): PlacedItem => ({ x, y, c, l });

export const LEVELS: LevelDef[] = [
  // ================================================== CHAPITRE 1 — Une fleur pour toi
  {
    id: 1, chapter: 1, title: 'Une petite graine', difficulty: 1, dominant: 'flowers', tutorial: true,
    hint: 'Fais glisser une graine sur une graine identique pour les fusionner.',
    gen: [['flowers', 1, 1]],
    start: [P(1, 3, 'flowers', 1), P(2, 3, 'flowers', 1), P(3, 3, 'flowers', 1), P(4, 3, 'flowers', 1)],
    objectives: [{ t: 'create', item: ['flowers', 3] }],
    par: 1, reward: { hearts: 5 },
  },
  {
    id: 2, chapter: 1, title: 'Ça pousse !', difficulty: 1, dominant: 'flowers',
    hint: 'Touche le pot de fleurs magique pour faire apparaître des graines (1 ⚡ par toucher).',
    gen: [['flowers', 1, 8], ['flowers', 2, 2]],
    start: [P(2, 2, 'flowers', 2), P(3, 2, 'flowers', 1)],
    objectives: [{ t: 'create', item: ['flowers', 4] }],
    par: 5, reward: { hearts: 6 },
  },
  {
    id: 3, chapter: 1, title: 'Le premier bouquet', difficulty: 1, dominant: 'flowers',
    hint: 'Une fleur, c\'est bien. Un bouquet, c\'est mieux.',
    gen: [['flowers', 1, 7], ['flowers', 2, 3]],
    start: [P(2, 2, 'flowers', 2), P(3, 2, 'flowers', 1)],
    objectives: [{ t: 'create', item: ['flowers', 5] }],
    par: 10, reward: { hearts: 8 },
  },
  {
    id: 4, chapter: 1, title: 'Les commandes d\'Auguste', difficulty: 2, dominant: 'flowers',
    hint: 'Les commandes en haut : quand l\'objet demandé est sur le plateau, touche « Donner ».',
    gen: [['flowers', 1, 6], ['flowers', 2, 4]],
    start: [P(0, 0, 'flowers', 2), P(5, 0, 'flowers', 2)],
    orders: [[['flowers', 3]], [['flowers', 4]], [['flowers', 3], ['flowers', 2]], [['flowers', 4]]],
    objectives: [{ t: 'orders', count: 4 }],
    par: 16, reward: { hearts: 10 },
  },
  {
    id: 5, chapter: 1, title: 'Des surprises dans le jardin', difficulty: 2, dominant: 'flowers',
    hint: 'Les paquets cadeaux s\'ouvrent quand tu fusionnes juste à côté.',
    gen: [['flowers', 1, 6], ['flowers', 2, 4]],
    gifts: [P(1, 1, 'flowers', 3), P(4, 1, 'flowers', 3), P(1, 4, 'flowers', 2), P(4, 4, 'love', 1)],
    start: [P(2, 2, 'flowers', 1), P(3, 3, 'flowers', 1)],
    objectives: [{ t: 'gifts' }, { t: 'create', item: ['flowers', 5], count: 2 }],
    par: 15, reward: { hearts: 10, wind: 1 },
  },
  {
    id: 6, chapter: 1, title: 'Une composition pour toi', difficulty: 3, dominant: 'flowers',
    hint: 'Enchaîne les fusions en moins de 3 secondes pour faire un combo !',
    gen: [['flowers', 1, 5], ['flowers', 2, 5]],
    start: [P(0, 1, 'flowers', 2), P(1, 1, 'flowers', 2), P(4, 1, 'flowers', 1), P(5, 1, 'flowers', 1)],
    objectives: [{ t: 'create', item: ['flowers', 6] }, { t: 'combo', value: 3 }],
    par: 13, reward: { hearts: 14, wand: 1 },
  },

  // ================================================== CHAPITRE 2 — C'est cool dans le Nord de Paris bb
  {
    id: 7, chapter: 2, title: 'Un ticket pour Paris', difficulty: 1, dominant: 'paris',
    hint: 'Nouvelle collection : Paris. Ticket → Café → Photo…',
    gen: [['paris', 1, 7], ['paris', 2, 3]],
    start: [P(2, 2, 'paris', 1), P(3, 2, 'paris', 1)],
    objectives: [{ t: 'create', item: ['paris', 4], count: 2 }],
    par: 11, reward: { hearts: 10 },
  },
  {
    id: 8, chapter: 2, title: 'Un café en terrasse', difficulty: 2, dominant: 'paris',
    hint: 'Deux générateurs maintenant : le pot de fleurs et l\'appareil photo.',
    gen: [['paris', 1, 5], ['paris', 2, 3], ['flowers', 1, 2], ['flowers', 2, 2]],
    orders: [[['paris', 3]], [['flowers', 3]], [['paris', 3], ['flowers', 3]], [['paris', 4]]],
    objectives: [{ t: 'orders', count: 4 }],
    par: 23, reward: { hearts: 14 },
  },
  {
    id: 9, chapter: 2, title: 'Sous l\'Arc de Triomphe', difficulty: 3, dominant: 'paris',
    hint: 'Ouvre tous les paquets : ils dessinent quelque chose…',
    gen: [['paris', 1, 7], ['paris', 2, 3]],
    gifts: [
      P(1, 0, 'paris', 1), P(2, 0, 'paris', 1), P(3, 0, 'paris', 1), P(4, 0, 'paris', 1),
      P(1, 1, 'paris', 2), P(4, 1, 'paris', 2), P(1, 2, 'flowers', 2), P(4, 2, 'flowers', 2),
    ],
    objectives: [{ t: 'gifts' }, { t: 'create', item: ['paris', 5] }],
    par: 8, reward: { hearts: 15 },
  },
  {
    id: 10, chapter: 2, title: 'Balade du soir', difficulty: 1, dominant: 'paris',
    hint: 'Un niveau tout doux : fais simplement des points.',
    gen: [['paris', 1, 4], ['paris', 2, 3], ['flowers', 1, 2], ['flowers', 2, 2]],
    start: [P(0, 0, 'flowers', 3), P(5, 0, 'paris', 3)],
    objectives: [{ t: 'score', value: 500 }],
    par: 20, reward: { hearts: 12, wind: 1 },
  },
  {
    id: 11, chapter: 2, title: 'Des cartes postales', difficulty: 3, dominant: 'paris',
    hint: 'Fais un combo ×4 : prépare tes paires avant de fusionner.',
    gen: [['paris', 1, 4], ['paris', 2, 5], ['paris', 3, 1]],
    start: [P(0, 2, 'paris', 3), P(5, 2, 'paris', 3), P(2, 0, 'paris', 2), P(3, 0, 'paris', 2)],
    objectives: [{ t: 'create', item: ['paris', 5], count: 2 }, { t: 'combo', value: 4 }],
    par: 11, reward: { hearts: 16 },
  },
  {
    id: 12, chapter: 2, title: 'Le Nord de Paris bb', difficulty: 3, dominant: 'paris',
    hint: 'Un album de souvenirs… et quelques commandes en route.',
    gen: [['paris', 1, 3], ['paris', 2, 5], ['paris', 3, 2], ['flowers', 2, 2]],
    start: [P(2, 1, 'paris', 4), P(4, 4, 'paris', 3)],
    orders: [[['paris', 4]], [['flowers', 3], ['paris', 3]]],
    objectives: [{ t: 'create', item: ['paris', 6] }, { t: 'orders', count: 2 }],
    par: 21, reward: { hearts: 20, wand: 1 },
  },

  // ================================================== CHAPITRE 3 — Les petits souvenirs
  {
    id: 13, chapter: 3, title: 'Une petite étincelle', difficulty: 2, dominant: 'love',
    hint: 'Nouvelle collection : Amour. L\'Étoile filante fait monter n\'importe quel objet d\'un niveau.',
    gen: [['love', 1, 6], ['love', 2, 4]],
    start: [P(2, 2, 'special', 1), P(3, 2, 'love', 2), P(0, 4, 'love', 1)],
    objectives: [{ t: 'create', item: ['love', 4], count: 3 }],
    par: 14, reward: { hearts: 14 },
  },
  {
    id: 14, chapter: 3, title: 'Une séance de cinéma', difficulty: 3, dominant: 'love',
    hint: 'Le Coffret surprise : touche-le pour l\'ouvrir.',
    gen: [['love', 1, 4], ['love', 2, 3], ['paris', 1, 2], ['paris', 2, 2], ['special', 3, 0.6]],
    start: [P(5, 0, 'special', 3)],
    orders: [[['love', 3]], [['paris', 3]], [['love', 4]], [['love', 3], ['paris', 3]], [['paris', 4]]],
    objectives: [{ t: 'orders', count: 5 }],
    par: 22, reward: { hearts: 18 },
  },
  {
    id: 15, chapter: 3, title: 'Des clés dorées', difficulty: 3, dominant: 'love',
    hint: 'Une Clé dorée ouvre un paquet cadeau tout de suite.',
    gen: [['love', 1, 5], ['love', 2, 4], ['flowers', 2, 2]],
    start: [P(0, 5, 'special', 2), P(5, 5, 'special', 2)],
    gifts: [
      P(0, 0, 'love', 3), P(5, 0, 'love', 3), P(2, 1, 'flowers', 4), P(3, 1, 'love', 4),
      P(0, 3, 'special', 1), P(5, 3, 'love', 2),
    ],
    objectives: [{ t: 'gifts' }, { t: 'create', item: ['love', 6] }],
    par: 6, reward: { hearts: 18, wind: 1 },
  },
  {
    id: 16, chapter: 3, title: 'Une partie de billard', difficulty: 1, dominant: 'love',
    hint: 'Pause douceur : 18 fusions, à ton rythme.',
    gen: [['love', 1, 4], ['love', 2, 2], ['flowers', 1, 2], ['paris', 1, 2]],
    objectives: [{ t: 'merges', count: 18 }],
    par: 24, reward: { hearts: 14 },
  },
  {
    id: 17, chapter: 3, title: 'Un cadeau pour toi', difficulty: 4, dominant: 'love',
    hint: 'Garde de la place : le cadeau demande beaucoup d\'étincelles.',
    gen: [['love', 1, 4], ['love', 2, 5], ['love', 3, 1], ['special', 1, 0.4]],
    start: [P(1, 1, 'love', 4), P(4, 1, 'love', 3)],
    orders: [[['love', 4]], [['love', 3], ['love', 3]]],
    objectives: [{ t: 'create', item: ['love', 6] }, { t: 'orders', count: 2 }],
    par: 20, reward: { hearts: 22, wand: 1 },
  },
  {
    id: 18, chapter: 3, title: 'Une promenade', difficulty: 3, dominant: 'love',
    hint: 'Deux enveloppes et un combo ×5 : à toi de jouer, galbi.',
    gen: [['love', 1, 4], ['love', 2, 5], ['love', 3, 1]],
    start: [P(0, 0, 'love', 2), P(1, 0, 'love', 2), P(4, 0, 'love', 2), P(5, 0, 'love', 2)],
    objectives: [{ t: 'create', item: ['love', 5], count: 2 }, { t: 'combo', value: 5 }],
    par: 11, reward: { hearts: 22 },
  },

  // ================================================== CHAPITRE 4 — Ma reine
  {
    id: 19, chapter: 4, title: 'Le petit pion', difficulty: 2, dominant: 'chess',
    hint: 'Nouvelle collection : Échecs. Pion → Cavalier → Fou → Tour → Dame…',
    gen: [['chess', 1, 7], ['chess', 2, 3]],
    start: [P(2, 3, 'chess', 2), P(3, 3, 'chess', 1)],
    objectives: [{ t: 'create', item: ['chess', 4], count: 2 }],
    par: 10, reward: { hearts: 16 },
  },
  {
    id: 20, chapter: 4, title: 'La cour du royaume', difficulty: 3, dominant: 'chess',
    hint: 'Les sujets du royaume ont des demandes.',
    gen: [['chess', 1, 4], ['chess', 2, 3], ['love', 1, 2], ['love', 2, 2]],
    orders: [[['chess', 3]], [['love', 3]], [['chess', 4]], [['chess', 3], ['love', 3]]],
    objectives: [{ t: 'orders', count: 4 }],
    par: 21, reward: { hearts: 22 },
  },
  {
    id: 21, chapter: 4, title: 'L\'échiquier secret', difficulty: 4, dominant: 'chess',
    hint: 'Un échiquier de paquets cadeaux. Ouvre-les tous !',
    gen: [['chess', 1, 4], ['chess', 2, 5], ['special', 2, 0.4]],
    gifts: [
      P(0, 0, 'chess', 1), P(2, 0, 'chess', 1), P(4, 0, 'chess', 2),
      P(1, 1, 'chess', 2), P(3, 1, 'love', 2), P(5, 1, 'chess', 1),
      P(0, 2, 'love', 1), P(2, 2, 'chess', 1), P(4, 2, 'chess', 2),
    ],
    objectives: [{ t: 'gifts' }, { t: 'create', item: ['chess', 4], count: 2 }],
    par: 5, reward: { hearts: 22, wind: 1 },
  },
  {
    id: 22, chapter: 4, title: 'Une seule reine', difficulty: 4, dominant: 'chess',
    hint: 'Crée la Dame, la pièce la plus puissante.',
    gen: [['chess', 1, 6], ['chess', 2, 4]],
    start: [P(2, 2, 'chess', 1)],
    objectives: [{ t: 'create', item: ['chess', 5] }],
    par: 11, reward: { hearts: 24 },
  },
  {
    id: 23, chapter: 4, title: 'Le bal du royaume', difficulty: 2, dominant: 'chess',
    hint: 'Un niveau plus léger : fais la fête et des points.',
    gen: [['chess', 1, 3], ['chess', 2, 3], ['love', 1, 2], ['flowers', 2, 2], ['special', 3, 0.5]],
    objectives: [{ t: 'score', value: 550 }],
    par: 21, reward: { hearts: 18, wind: 1 },
  },
  {
    id: 24, chapter: 4, title: 'Ma reine', difficulty: 5, dominant: 'chess',
    hint: 'La couronne t\'attend. Le royaume aussi.',
    gen: [['chess', 2, 4], ['chess', 3, 4], ['love', 2, 2], ['special', 1, 0.5]],
    start: [P(2, 1, 'chess', 5), P(0, 4, 'chess', 4)],
    orders: [[['chess', 4]], [['love', 3]], [['chess', 4], ['love', 3]]],
    objectives: [{ t: 'create', item: ['chess', 6] }, { t: 'orders', count: 3 }],
    par: 26, reward: { hearts: 30, wand: 1 },
  },

  // ================================================== CHAPITRE 5 — Le monde que j'ai créé
  {
    id: 25, chapter: 5, title: 'Tous nos souvenirs', difficulty: 3, dominant: 'paris',
    hint: 'Tous les générateurs sont réunis sur le plateau.',
    gen: [['flowers', 2, 3], ['love', 2, 3], ['paris', 2, 3], ['chess', 2, 3], ['special', 3, 0.4]],
    orders: [
      [['flowers', 4]], [['love', 4]], [['paris', 4]], [['chess', 4]],
      [['flowers', 3], ['love', 3]],
    ],
    ordersVisible: 3,
    objectives: [{ t: 'orders', count: 5 }],
    par: 27, reward: { hearts: 28 },
  },
  {
    id: 26, chapter: 5, title: 'Les souvenirs cachés', difficulty: 4, dominant: 'love',
    hint: 'Les paquets cachent des souvenirs précieux.',
    gen: [['love', 2, 4], ['love', 3, 3], ['flowers', 2, 2], ['special', 2, 0.5]],
    gifts: [
      P(0, 0, 'love', 3), P(5, 0, 'flowers', 5), P(2, 0, 'paris', 5), P(3, 0, 'chess', 5),
      P(0, 2, 'love', 2), P(5, 2, 'love', 2), P(2, 2, 'love', 1), P(3, 2, 'love', 1),
    ],
    objectives: [{ t: 'gifts' }, { t: 'create', item: ['love', 7] }],
    par: 24, reward: { hearts: 28, wind: 1 },
  },
  {
    id: 27, chapter: 5, title: 'Le chemin des deux cœurs', difficulty: 2, dominant: 'love',
    hint: 'Un combo ×6 pour éclairer le chemin.',
    gen: [['love', 1, 5], ['love', 2, 3], ['flowers', 1, 2]],
    start: [
      P(0, 1, 'love', 1), P(1, 1, 'love', 1), P(2, 1, 'love', 2), P(3, 1, 'love', 2),
      P(4, 1, 'love', 3), P(5, 1, 'love', 3), P(0, 3, 'flowers', 2), P(5, 3, 'flowers', 2),
    ],
    objectives: [{ t: 'combo', value: 6 }, { t: 'merges', count: 20 }],
    par: 16, reward: { hearts: 22 },
  },
  {
    id: 28, chapter: 5, title: 'Les lumières de Paris', difficulty: 4, dominant: 'paris',
    hint: 'Un cadre pour nos plus beaux souvenirs.',
    gen: [['paris', 2, 4], ['paris', 3, 5], ['special', 1, 0.6]],
    start: [P(2, 2, 'paris', 5), P(3, 2, 'paris', 4)],
    orders: [[['paris', 5]], [['paris', 4], ['paris', 4]]],
    objectives: [{ t: 'create', item: ['paris', 7] }, { t: 'orders', count: 2 }],
    par: 20, reward: { hearts: 30 },
  },
  {
    id: 29, chapter: 5, title: 'Un bijou pour la reine', difficulty: 4, dominant: 'love',
    hint: 'Le bijou est presque prêt…',
    gen: [['love', 3, 5], ['love', 4, 3], ['special', 1, 0.6]],
    start: [P(1, 1, 'love', 6), P(4, 1, 'love', 5)],
    objectives: [{ t: 'create', item: ['love', 8] }],
    par: 12, reward: { hearts: 30, wand: 1 },
  },
  {
    id: 30, chapter: 5, title: 'Le dernier cœur', difficulty: 3, dominant: 'love',
    hint: 'Réunis tous les souvenirs en un seul cœur.',
    gen: [['love', 3, 4], ['love', 4, 4], ['love', 5, 1]],
    start: [
      P(2, 1, 'love', 7), P(3, 1, 'love', 6), P(1, 3, 'love', 5),
      P(0, 0, 'flowers', 8), P(5, 0, 'paris', 8), P(0, 5, 'chess', 8), P(5, 5, 'flowers', 7),
    ],
    objectives: [{ t: 'create', item: ['love', 9] }],
    par: 21, reward: { hearts: 50 },
  },
];

export const levelById = (id: number) => LEVELS.find((l) => l.id === id);
