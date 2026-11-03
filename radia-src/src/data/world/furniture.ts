/**
 * Catalogue des meubles du château : nom, catégorie, prix, emprise en cases,
 * pièces autorisées, couleur par défaut. Les 36 identifiants viennent de ids.ts.
 */
import { FURNITURE_IDS, type ColorId, type FurnitureId, type RoomId } from './ids';

export type FurnitureCat = 'couchage' | 'assises' | 'tables' | 'rangement' | 'eclairage' | 'deco' | 'plantes' | 'jardin' | 'enfants' | 'reception' | 'mode';

export const CAT_ORDER: FurnitureCat[] = ['couchage', 'assises', 'tables', 'rangement', 'eclairage', 'deco', 'plantes', 'jardin', 'enfants', 'reception', 'mode'];
export const CAT_NAMES: Record<FurnitureCat, string> = {
  couchage: 'Couchage', assises: 'Assises', tables: 'Tables', rangement: 'Rangement', eclairage: 'Éclairage', deco: 'Déco',
  plantes: 'Plantes', jardin: 'Jardin', enfants: 'Enfants', reception: 'Réception', mode: 'Mode',
};

export interface FurnitureDef {
  id: FurnitureId;
  name: string;
  cat: FurnitureCat;
  /** Prix en pièces. */
  price: number;
  /** Prix alternatif de luxe en diamants (facultatif, jamais obligatoire). */
  gems?: number;
  /** Emprise en cases (1 à 3). */
  w: number;
  h: number;
  rooms: readonly RoomId[];
  colorable: boolean;
  color: ColorId;
}

const KIDS = ['kid1', 'kid2', 'kid3'] as const;
const LIVING = ['salon', 'familySalon', 'reception'] as const;
const ALL_IN = ['bedroom', 'salon', 'dressing', 'reception', 'familySalon', ...KIDS] as const;
const ALL = [...ALL_IN, 'garden'] as const;

const D = (id: FurnitureId, name: string, cat: FurnitureCat, price: number, w: number, h: number, rooms: readonly RoomId[], color: ColorId, colorable = true, gems?: number): FurnitureDef =>
  ({ id, name, cat, price, w, h, rooms, color, colorable, gems });

const LIST: FurnitureDef[] = [
  D('bed-royal', 'Lit royal', 'couchage', 480, 3, 2, ['bedroom'], 'rose', true, 40),
  D('bed-kid', 'Lit d\'enfant', 'couchage', 220, 2, 2, KIDS, 'peach'),
  D('crib-bed', 'Lit à barreaux', 'couchage', 200, 2, 2, ['kid1'], 'cream'),
  D('nightstand', 'Table de chevet', 'tables', 90, 1, 1, ['bedroom', ...KIDS], 'beige'),
  D('rug-round', 'Tapis rond', 'deco', 110, 2, 2, ALL_IN, 'lavender'),
  D('rug-rect', 'Grand tapis', 'deco', 140, 3, 2, ALL_IN, 'cream'),
  D('vanity', 'Coiffeuse', 'mode', 320, 2, 2, ['bedroom', 'dressing', 'kid2', 'kid3'], 'white', true, 28),
  D('mirror-standing', 'Miroir sur pied', 'mode', 180, 1, 2, ['bedroom', 'dressing', 'reception', 'kid2', 'kid3'], 'gold'),
  D('lamp-floor', 'Lampadaire', 'eclairage', 130, 1, 2, ALL, 'gold'),
  D('lamp-table', 'Lampe de table', 'eclairage', 70, 1, 1, ALL_IN, 'rose'),
  D('plant-pot', 'Plante en pot', 'plantes', 60, 1, 1, ALL, 'peach'),
  D('painting', 'Tableau', 'deco', 150, 1, 2, ALL_IN, 'gold'),
  D('sofa', 'Canapé', 'assises', 350, 3, 2, [...LIVING, 'dressing'], 'lavender', true, 30),
  D('armchair', 'Fauteuil', 'assises', 190, 2, 2, [...LIVING, 'bedroom', 'dressing', 'kid2', 'kid3'], 'rose'),
  D('coffee-table', 'Table basse', 'tables', 100, 2, 1, [...LIVING, 'bedroom', 'kid2', 'kid3'], 'beige'),
  D('bookshelf', 'Bibliothèque', 'rangement', 260, 2, 2, [...LIVING, 'bedroom', 'kid2', 'kid3'], 'brown'),
  D('fireplace', 'Cheminée', 'deco', 420, 2, 2, LIVING, 'cream', true, 35),
  D('candles', 'Bougies', 'eclairage', 50, 1, 1, ALL, 'cream', false),
  D('choco-display', 'Vitrine à chocolats', 'rangement', 280, 2, 2, [...LIVING], 'brown', false),
  D('wardrobe', 'Armoire', 'rangement', 300, 2, 2, ['bedroom', 'dressing', ...KIDS], 'cream'),
  D('clothes-rack', 'Portant à vêtements', 'mode', 160, 2, 2, ['dressing', 'bedroom'], 'gold', false),
  D('shoe-stand', 'Présentoir à chaussures', 'mode', 140, 1, 2, ['dressing'], 'beige'),
  D('accessory-stand', 'Présentoir à bijoux', 'mode', 120, 1, 2, ['dressing', 'bedroom'], 'rose'),
  D('chandelier', 'Lustre', 'eclairage', 500, 2, 1, ['salon', 'reception', 'familySalon', 'bedroom', 'dressing'], 'gold', false, 45),
  D('red-carpet', 'Tapis de gala', 'reception', 260, 3, 1, ['reception', 'salon'], 'rose'),
  D('banquet-table', 'Table de banquet', 'reception', 380, 3, 2, ['reception', 'familySalon'], 'cream'),
  D('flower-vase', 'Vase de fleurs', 'plantes', 80, 1, 1, ALL, 'sky'),
  D('bench', 'Banc', 'assises', 150, 2, 1, ['garden', 'dressing', 'familySalon', 'reception'], 'brown'),
  D('pergola', 'Pergola fleurie', 'jardin', 520, 3, 3, ['garden'], 'white', true, 45),
  D('fountain', 'Fontaine', 'jardin', 450, 2, 2, ['garden', 'reception'], 'sky', false, 40),
  D('flowerbed', 'Parterre de fleurs', 'jardin', 120, 2, 1, ['garden'], 'rose', false),
  D('desk', 'Bureau', 'tables', 210, 2, 2, ['bedroom', 'familySalon', 'kid2', 'kid3'], 'beige'),
  D('plush-toys', 'Peluches', 'enfants', 90, 1, 1, ['kid1', 'kid2', 'kid3', 'familySalon'], 'peach', false),
  D('toy-blocks', 'Cubes de jeu', 'enfants', 70, 1, 1, ['kid1', 'kid2', 'kid3', 'familySalon'], 'sky'),
  D('easel', 'Chevalet', 'enfants', 160, 1, 2, ['kid1', 'kid2', 'kid3', 'familySalon', 'garden'], 'cream'),
  D('game-shelf', 'Étagère de jeux', 'enfants', 190, 2, 2, ['kid1', 'kid2', 'kid3', 'familySalon'], 'sage'),
];

export const FURNITURE: Record<FurnitureId, FurnitureDef> = Object.fromEntries(LIST.map((f) => [f.id, f])) as Record<FurnitureId, FurnitureDef>;
export const isFurnitureId = (s: string): s is FurnitureId => (FURNITURE_IDS as readonly string[]).includes(s);
export const furnitureOf = (id: string): FurnitureDef | null => (isFurnitureId(id) ? FURNITURE[id] : null);
export const furnitureForRoom = (room: RoomId): FurnitureDef[] => LIST.filter((f) => f.rooms.includes(room));
