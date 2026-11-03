/**
 * CONTRAT COMMUN de la mise à jour « Le château de Radia » : identifiants,
 * palettes et types partagés. Ne pas renommer un identifiant (les sauvegardes
 * et tous les modules s'y réfèrent). On peut AJOUTER des entrées à la fin.
 *
 * Confidentialité : les prénoms et âges des enfants ne figurent JAMAIS dans le
 * code (dépôt public) : voir src/core/family.ts (données chiffrées).
 */

// ------------------------------------------------------------------ pièces
export const ROOM_IDS = ['bedroom', 'salon', 'dressing', 'reception', 'garden', 'familySalon', 'kid1', 'kid2', 'kid3'] as const;
export type RoomId = (typeof ROOM_IDS)[number];

export const ROOM_NAMES: Record<RoomId, string> = {
  bedroom: 'Chambre de Radia',
  salon: 'Grand salon',
  dressing: 'Dressing',
  reception: 'Salle de réception',
  garden: 'Jardin royal',
  familySalon: 'Salon familial',
  kid1: 'Chambre de la petite',
  kid2: 'Chambre de l\'aînée',
  kid3: 'Chambre de la cadette',
};

// ------------------------------------------------------------------ enfants
export const KID_IDS = ['kid1', 'kid2', 'kid3'] as const;
export type KidId = (typeof KID_IDS)[number];
/** Libellés neutres utilisés tant que les données chiffrées ne sont pas chargées. */
export const KID_FALLBACK: Record<KidId, { name: string; age: number }> = {
  kid1: { name: 'La petite', age: 3 },
  kid2: { name: 'L\'aînée', age: 13 },
  kid3: { name: 'La cadette', age: 12 },
};

// ------------------------------------------------------------------ couleurs
/** Palette des murs / sols / rideaux / tissus (nom, couleur). */
export const PALETTE = [
  { id: 'rose', name: 'Rose', color: '#F5B5C8' },
  { id: 'cream', name: 'Crème', color: '#FFF1DE' },
  { id: 'lavender', name: 'Lavande', color: '#CDBDF0' },
  { id: 'beige', name: 'Beige', color: '#E8D5BC' },
  { id: 'sage', name: 'Vert sauge', color: '#B5CDB0' },
  { id: 'brown', name: 'Brun', color: '#A6785A' },
  { id: 'white', name: 'Blanc', color: '#FFFFFF' },
  { id: 'noir', name: 'Noir élégant', color: '#3A3340' },
  { id: 'peach', name: 'Pêche', color: '#FFC0A3' },
  { id: 'gold', name: 'Or doux', color: '#F3C86B' },
  { id: 'violet', name: 'Violet doux', color: '#8E7BC4' },
  { id: 'sky', name: 'Ciel', color: '#A9D4F5' },
] as const;
export type ColorId = (typeof PALETTE)[number]['id'];
export const colorOf = (id: string): string => PALETTE.find((p) => p.id === id)?.color ?? '#FFF1DE';

// ------------------------------------------------------------------ meubles
/** Identifiants des meubles (≥ 20 fonctionnels). Détails dans src/data/world/furniture.ts. */
export const FURNITURE_IDS = [
  'bed-royal', 'bed-kid', 'crib-bed', 'nightstand', 'rug-round', 'rug-rect', 'vanity', 'mirror-standing',
  'lamp-floor', 'lamp-table', 'plant-pot', 'painting', 'sofa', 'armchair', 'coffee-table', 'bookshelf',
  'fireplace', 'candles', 'choco-display', 'wardrobe', 'clothes-rack', 'shoe-stand', 'accessory-stand', 'chandelier',
  'red-carpet', 'banquet-table', 'flower-vase', 'bench', 'pergola', 'fountain', 'flowerbed', 'desk',
  'plush-toys', 'toy-blocks', 'easel', 'game-shelf',
] as const;
export type FurnitureId = (typeof FURNITURE_IDS)[number];

// ------------------------------------------------------------------ vêtements
export const HAIR_IDS = ['hair-loose', 'hair-wavy', 'hair-ponytail', 'hair-bun', 'hair-half'] as const;
export type HairId = (typeof HAIR_IDS)[number];

export type ClothSlot = 'top' | 'bottom' | 'dress' | 'jacket' | 'shoes' | 'bag' | 'acc' | 'crown';
export type StyleId = 'casual' | 'chic' | 'romantic' | 'royal' | 'stage';

/** Identifiant → emplacement. (≥ 25 pièces utilisables.) Détails : src/data/world/wardrobe.ts. */
export const CLOTH_SLOTS = {
  'top-tee-white': 'top', 'top-tee-pink': 'top', 'top-hoodie-black': 'top', 'top-hoodie-cream': 'top',
  'top-cardigan-lavender': 'top', 'top-blouse-silk': 'top', 'top-stripe-shirt': 'top',
  'bot-jeans': 'bottom', 'bot-wide-black': 'bottom', 'bot-skirt-pleated': 'bottom', 'bot-trousers-chic': 'bottom',
  'dr-flowy-floral': 'dress', 'dr-romantic-pink': 'dress', 'dr-royal-gown': 'dress', 'dr-stage-sequin': 'dress', 'dr-redcarpet': 'dress',
  'jk-blazer-cream': 'jacket', 'jk-leather-black': 'jacket', 'jk-denim': 'jacket',
  'sh-sneakers-white': 'shoes', 'sh-heels': 'shoes', 'sh-boots': 'shoes', 'sh-flats-red': 'shoes',
  'bg-crossbody-black': 'bag', 'bg-mini-gold': 'bag',
  'ac-pearls': 'acc', 'ac-hoops': 'acc', 'ac-scarf': 'acc', 'ac-sunglasses': 'acc',
  'cr-gold': 'crown', 'cr-flowers': 'crown', 'cr-tiara': 'crown',
} as const;
export type ClothId = keyof typeof CLOTH_SLOTS;
export const CLOTH_IDS = Object.keys(CLOTH_SLOTS) as ClothId[];

/** Un look = ce que porte Radia. `dress` remplace `top` + `bottom`. */
export interface Look {
  hair: HairId;
  top: ClothId | null;
  bottom: ClothId | null;
  dress: ClothId | null;
  jacket: ClothId | null;
  shoes: ClothId | null;
  bag: ClothId | null;
  acc: ClothId[];
  crown: ClothId | null;
}

/** Tenue de départ : celle du jeu (sweat noir, pantalon large, baskets, sac). */
export const DEFAULT_LOOK: Look = {
  hair: 'hair-loose', top: 'top-hoodie-black', bottom: 'bot-wide-black', dress: null, jacket: null,
  shoes: 'sh-sneakers-white', bag: 'bg-crossbody-black', acc: [], crown: null,
};
export const STARTER_CLOTHES: ClothId[] = ['top-hoodie-black', 'bot-wide-black', 'sh-sneakers-white', 'bg-crossbody-black', 'top-tee-white', 'bot-jeans'];

// ------------------------------------------------------------------ chat
export const CAT_ITEM_IDS = ['cushion', 'toy-ball', 'collar-bell', 'basket'] as const;
export type CatItemId = (typeof CAT_ITEM_IDS)[number];

// ------------------------------------------------------------------ fleurs & chocolats
export const FLOWER_IDS = ['rose', 'tulip', 'peony', 'daisy', 'lavender', 'hydrangea', 'orchid', 'lily', 'sunflower', 'magic'] as const;
export type FlowerId = (typeof FLOWER_IDS)[number];
export const FLOWER_NAMES: Record<FlowerId, string> = {
  rose: 'Rose', tulip: 'Tulipe', peony: 'Pivoine', daisy: 'Marguerite', lavender: 'Lavande',
  hydrangea: 'Hortensia', orchid: 'Orchidée', lily: 'Lys', sunflower: 'Tournesol', magic: 'Fleur de lune',
};

export const CHOC_IDS = ['milk', 'dark', 'praline', 'truffle', 'white', 'hazelnut', 'heart', 'royalbox'] as const;
export type ChocId = (typeof CHOC_IDS)[number];
export const CHOC_NAMES: Record<ChocId, string> = {
  milk: 'Chocolat au lait', dark: 'Chocolat noir', praline: 'Praliné', truffle: 'Truffe', white: 'Chocolat blanc',
  hazelnut: 'Chocolat noisette', heart: 'Cœur en chocolat', royalbox: 'Coffret royal',
};

// ------------------------------------------------------------------ carrières, fans, magazines
export const CAREER_IDS = ['photo', 'model', 'actress', 'singer'] as const;
export type CareerId = (typeof CAREER_IDS)[number];
export const CAREER_NAMES: Record<CareerId, string> = { photo: 'Modèle photo', model: 'Mannequin', actress: 'Actrice', singer: 'Chanteuse' };

export const FAN_TIERS = [10, 100, 1000, 10_000, 100_000, 1_000_000] as const;
/** Palier atteint (−1 si moins de 10 fans). */
export const fansTier = (n: number): number => FAN_TIERS.reduce((t, v, i) => (n >= v ? i : t), -1);

export const MAGAZINE_IDS = ['radia-mag', 'queen-paris', 'radia-show', 'radia-fashion', 'star-royaume'] as const;
export type MagazineId = (typeof MAGAZINE_IDS)[number];
export const MAGAZINE_NAMES: Record<MagazineId, string> = {
  'radia-mag': 'RADIA Magazine', 'queen-paris': 'Queen of Paris', 'radia-show': 'The Radia Show',
  'radia-fashion': 'Radia Fashion', 'star-royaume': 'Star du Royaume',
};

// ------------------------------------------------------------------ ressources
export type ResKind = 'coins' | 'flowers' | 'fabric' | 'cocoa';
export const RES_NAMES: Record<ResKind, string> = { coins: 'Pièces', flowers: 'Fleurs', fabric: 'Tissus', cocoa: 'Cacao' };
