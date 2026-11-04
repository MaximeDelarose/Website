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

/** Où un objet se pose (logique de placement très différente selon le type). */
export type Place = 'floor' | 'wall' | 'ceiling' | 'window' | 'rug' | 'surface';
/** Rotation : none = aucune ; mirror = symétrique (miroir propre) ; turn = pivote (emprise échangée, objet plat) ; full = 4 vues dessinées. */
export type Orient = 'none' | 'mirror' | 'turn' | 'full';
/** Catégories de la boutique de déco (panneau rétractable). */
export type ShopCat = 'lits' | 'canapes' | 'tables' | 'rangements' | 'plantes' | 'tapis' | 'luminaires' | 'murales' | 'rideaux' | 'divers';
export const SHOP_ORDER: ShopCat[] = ['lits', 'canapes', 'tables', 'rangements', 'plantes', 'tapis', 'luminaires', 'murales', 'rideaux', 'divers'];
export const SHOP_NAMES: Record<ShopCat, string> = {
  lits: 'Lits', canapes: 'Canapés', tables: 'Tables', rangements: 'Rangements', plantes: 'Plantes', tapis: 'Tapis',
  luminaires: 'Luminaires', murales: 'Décos murales', rideaux: 'Rideaux', divers: 'Divers',
};
/** Types de supports (objets « surface » : coussin sur un canapé, vase sur une table…). */
export type HostKind = 'table' | 'seat' | 'shelf' | 'bed';
export interface Variant { id: string; name: string }

const EXTRA_IDS = ['cushion', 'wall-shelf', 'mirror-wall', 'wall-clock', 'garland', 'pendant', 'sheer-curtain', 'roman-blind', 'valance', 'dresser', 'rug-heart'] as const;
/** Objets ajoutés par la refonte de la décoration (la liste historique de ids.ts reste intacte). */
export type ExtraFurnitureId = (typeof EXTRA_IDS)[number];
export const EXTRA_FURNITURE_IDS: readonly ExtraFurnitureId[] = EXTRA_IDS;
export type AnyFurnitureId = FurnitureId | ExtraFurnitureId;

export interface FurnitureDef {
  id: AnyFurnitureId;
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
  /** Type de placement. */
  place: Place;
  /** Autres plans acceptés (un objet « surface » peut aussi se poser au sol). */
  also: Place[];
  shop: ShopCat;
  orient: Orient;
  /** Emprise sur le mur (mur) ou accrochée au plafond (plafond), en cases. */
  dims?: { w: number; h: number };
  /** Support : hauteur du plateau au-dessus du sol (cases) et sorte de support. */
  host?: { lift: number; kind: HostKind };
  /** Sur quels supports cet objet « surface » peut se poser. */
  onKinds: HostKind[];
  /** Calque de fenêtre (un seul objet par calque). */
  layer?: 'sheer' | 'blind' | 'valance';
  variants: Variant[];
}

const KIDS = ['kid1', 'kid2', 'kid3'] as const;
const LIVING = ['salon', 'familySalon', 'reception'] as const;
const ALL_IN = ['bedroom', 'salon', 'dressing', 'reception', 'familySalon', ...KIDS] as const;
const ALL = [...ALL_IN, 'garden'] as const;

type Base = Pick<FurnitureDef, 'id' | 'name' | 'cat' | 'price' | 'w' | 'h' | 'rooms' | 'color' | 'colorable' | 'gems'>;
const D = (id: AnyFurnitureId, name: string, cat: FurnitureCat, price: number, w: number, h: number, rooms: readonly RoomId[], color: ColorId, colorable = true, gems?: number): Base =>
  ({ id, name, cat, price, w, h, rooms, color, colorable, gems });

const BASE: Base[] = [
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

const INDOOR = ALL_IN;
BASE.push(
  D('cushion', 'Coussin', 'deco', 40, 1, 1, INDOOR, 'rose'),
  D('wall-shelf', 'Étagère murale', 'deco', 120, 2, 1, INDOOR, 'cream'),
  D('mirror-wall', 'Miroir mural', 'deco', 170, 1, 1, INDOOR, 'gold', true),
  D('wall-clock', 'Horloge dorée', 'deco', 90, 1, 1, INDOOR, 'gold', false),
  D('garland', 'Guirlande lumineuse', 'eclairage', 110, 3, 1, INDOOR, 'gold', false),
  D('pendant', 'Suspension', 'eclairage', 160, 1, 1, INDOOR, 'rose'),
  D('sheer-curtain', 'Voilage', 'deco', 100, 1, 1, INDOOR, 'white'),
  D('roman-blind', 'Store festonné', 'deco', 90, 1, 1, INDOOR, 'cream'),
  D('valance', 'Cantonnière', 'deco', 130, 1, 1, INDOOR, 'rose'),
  D('dresser', 'Commode', 'rangement', 220, 2, 1, [...LIVING, 'bedroom', 'dressing', 'kid2', 'kid3'], 'cream'),
  D('rug-heart', 'Tapis cœur', 'deco', 150, 2, 2, INDOOR, 'rose'),
);

/** Spécification de placement de chaque objet (le reste prend les valeurs par défaut : sol, pas de rotation). */
interface Spec { place?: Place; also?: Place[]; shop: ShopCat; orient?: Orient; dims?: { w: number; h: number }; host?: { lift: number; kind: HostKind }; onKinds?: HostKind[]; layer?: FurnitureDef['layer']; variants?: Variant[] }
const V = (...p: [string, string][]): Variant[] => p.map(([id, name]) => ({ id, name }));
const SPEC: Record<AnyFurnitureId, Spec> = {
  'bed-royal': { shop: 'lits', orient: 'full', host: { lift: 0.5, kind: 'bed' } },
  'bed-kid': { shop: 'lits', orient: 'full', host: { lift: 0.4, kind: 'bed' } },
  'crib-bed': { shop: 'lits', orient: 'mirror', host: { lift: 0.4, kind: 'bed' } },
  nightstand: { shop: 'tables', orient: 'mirror', host: { lift: 0.55, kind: 'table' } },
  'rug-round': { shop: 'tapis', place: 'rug', orient: 'none' },
  'rug-rect': { shop: 'tapis', place: 'rug', orient: 'turn' },
  'rug-heart': { shop: 'tapis', place: 'rug', orient: 'none' },
  vanity: { shop: 'tables', orient: 'mirror', host: { lift: 0.7, kind: 'table' } },
  'mirror-standing': { shop: 'divers', orient: 'mirror' },
  'lamp-floor': { shop: 'luminaires', orient: 'mirror' },
  'lamp-table': { shop: 'luminaires', place: 'surface', also: ['floor'], onKinds: ['table', 'shelf'] },
  'plant-pot': { shop: 'plantes', orient: 'mirror' },
  painting: { shop: 'murales', place: 'wall', orient: 'none', dims: { w: 1, h: 1.5 }, variants: V(['paysage', 'Paysage'], ['coeur', 'Cœurs'], ['etoiles', 'Étoiles']) },
  sofa: { shop: 'canapes', orient: 'full', host: { lift: 0.5, kind: 'seat' } },
  armchair: { shop: 'canapes', orient: 'full', host: { lift: 0.45, kind: 'seat' } },
  'coffee-table': { shop: 'tables', orient: 'full', host: { lift: 0.4, kind: 'table' } },
  bookshelf: { shop: 'rangements', orient: 'full', host: { lift: 1.1, kind: 'shelf' } },
  fireplace: { shop: 'divers', orient: 'mirror', host: { lift: 1.0, kind: 'shelf' } },
  candles: { shop: 'luminaires', place: 'surface', also: ['floor'], onKinds: ['table', 'shelf'] },
  'choco-display': { shop: 'rangements', orient: 'mirror', host: { lift: 0.9, kind: 'shelf' } },
  wardrobe: { shop: 'rangements', orient: 'full' },
  'clothes-rack': { shop: 'rangements', orient: 'mirror' },
  'shoe-stand': { shop: 'rangements', orient: 'mirror' },
  'accessory-stand': { shop: 'rangements', orient: 'mirror' },
  chandelier: { shop: 'luminaires', place: 'ceiling', orient: 'none', dims: { w: 2, h: 1.5 } },
  'red-carpet': { shop: 'tapis', place: 'rug', orient: 'turn' },
  'banquet-table': { shop: 'tables', orient: 'full', host: { lift: 0.55, kind: 'table' } },
  'flower-vase': { shop: 'plantes', place: 'surface', also: ['floor'], onKinds: ['table', 'shelf'] },
  bench: { shop: 'canapes', orient: 'full', host: { lift: 0.3, kind: 'seat' } },
  pergola: { shop: 'divers', orient: 'mirror' },
  fountain: { shop: 'divers', orient: 'none' },
  flowerbed: { shop: 'plantes', orient: 'turn' },
  desk: { shop: 'tables', orient: 'full', host: { lift: 0.65, kind: 'table' } },
  'plush-toys': { shop: 'divers', place: 'surface', also: ['floor'], onKinds: ['table', 'shelf', 'seat', 'bed'] },
  'toy-blocks': { shop: 'divers', place: 'surface', also: ['floor'], onKinds: ['table', 'shelf'] },
  easel: { shop: 'divers', orient: 'mirror' },
  'game-shelf': { shop: 'rangements', orient: 'full', host: { lift: 1.0, kind: 'shelf' } },
  cushion: { shop: 'divers', place: 'surface', also: [], onKinds: ['seat', 'bed'], variants: V(['coeur', 'Cœur'], ['rond', 'Rond'], ['carre', 'Carré']) },
  'wall-shelf': { shop: 'murales', place: 'wall', orient: 'none', dims: { w: 2, h: 0.5 } },
  'mirror-wall': { shop: 'murales', place: 'wall', orient: 'none', dims: { w: 1, h: 1.5 }, variants: V(['ovale', 'Ovale'], ['rond', 'Rond']) },
  'wall-clock': { shop: 'murales', place: 'wall', orient: 'none', dims: { w: 1, h: 1 } },
  garland: { shop: 'luminaires', place: 'ceiling', orient: 'none', dims: { w: 3, h: 0.9 } },
  pendant: { shop: 'luminaires', place: 'ceiling', orient: 'none', dims: { w: 1, h: 1.6 } },
  'sheer-curtain': { shop: 'rideaux', place: 'window', orient: 'none', layer: 'sheer' },
  'roman-blind': { shop: 'rideaux', place: 'window', orient: 'none', layer: 'blind' },
  valance: { shop: 'rideaux', place: 'window', orient: 'none', layer: 'valance' },
  dresser: { shop: 'rangements', orient: 'full', host: { lift: 0.75, kind: 'shelf' } },
};

const LIST: FurnitureDef[] = BASE.map((b) => {
  const s = SPEC[b.id];
  return {
    ...b, place: s.place ?? 'floor', also: s.also ?? [], shop: s.shop, orient: s.orient ?? 'none', dims: s.dims, host: s.host,
    onKinds: s.onKinds ?? [], layer: s.layer, variants: s.variants ?? [],
  };
});

export const FURNITURE: Record<FurnitureId, FurnitureDef> = Object.fromEntries(LIST.filter((f) => isLegacy(f.id)).map((f) => [f.id, f])) as Record<FurnitureId, FurnitureDef>;
/** Tous les objets (historiques + ajoutés par la refonte de la décoration). */
export const FURNITURE_ALL: Record<string, FurnitureDef> = Object.fromEntries(LIST.map((f) => [f.id, f]));
function isLegacy(id: string): boolean { return (FURNITURE_IDS as readonly string[]).includes(id); }
export const isFurnitureId = (s: string): s is FurnitureId => isLegacy(s);
export const isAnyFurnitureId = (s: string): s is AnyFurnitureId => Object.prototype.hasOwnProperty.call(FURNITURE_ALL, s);
export const furnitureOf = (id: string): FurnitureDef | null => (isAnyFurnitureId(id) ? FURNITURE_ALL[id] : null);
export const furnitureForRoom = (room: RoomId): FurnitureDef[] => LIST.filter((f) => f.rooms.includes(room));
