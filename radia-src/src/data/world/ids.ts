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
export const HAIR_IDS = ['hair-loose', 'hair-wavy', 'hair-ponytail', 'hair-bun', 'hair-half',
  'hair-sleek-part', 'hair-medium', 'hair-bob', 'hair-braid', 'hair-curly', 'hair-space-buns', 'hair-high-pony'] as const;
export type HairId = (typeof HAIR_IDS)[number];

export type ClothSlot = 'top' | 'bottom' | 'dress' | 'jacket' | 'shoes' | 'bag' | 'acc' | 'crown';
export type StyleId = 'casual' | 'chic' | 'romantic' | 'royal' | 'stage';

/** Identifiant → emplacement. (≥ 25 pièces utilisables.) Détails : src/data/world/wardrobe.ts. */
export const CLOTH_SLOTS = {
  'top-tee-white': 'top', 'top-tee-pink': 'top', 'top-hoodie-black': 'top', 'top-hoodie-cream': 'top',
  'top-cardigan-lavender': 'top', 'top-blouse-silk': 'top', 'top-stripe-shirt': 'top',
  'bot-jeans': 'bottom', 'bot-wide-black': 'bottom', 'bot-skirt-pleated': 'bottom', 'bot-trousers-chic': 'bottom',
  'dr-black-mini-ls': 'dress', 'dr-pink-satin': 'dress', 'dr-flowy-floral': 'dress', 'dr-romantic-pink': 'dress', 'dr-royal-gown': 'dress', 'dr-stage-sequin': 'dress', 'dr-redcarpet': 'dress',
  'dr-sundress-yellow': 'dress', 'dr-little-black': 'dress', 'dr-gingham-red': 'dress', 'dr-denim': 'dress',
  'dr-lavender-tulle': 'dress', 'dr-bathrobe': 'dress', 'dr-pajama-pink': 'dress', 'dr-pajama-stars': 'dress', 'dr-nightgown-silk': 'dress', 'dr-white-gown': 'dress', 'dr-emerald-evening': 'dress', 'dr-striped-navy': 'dress',
  'jk-blazer-cream': 'jacket', 'jk-leather-black': 'jacket', 'jk-denim': 'jacket',
  'sh-sneakers-white': 'shoes', 'sh-heels': 'shoes', 'sh-boots': 'shoes', 'sh-flats-red': 'shoes',
  'bg-crossbody-black': 'bag', 'bg-mini-gold': 'bag',
  'ac-pearls': 'acc', 'ac-hoops': 'acc', 'ac-scarf': 'acc', 'ac-sunglasses': 'acc',
  // --- hauts, bas, robes, vestes (inspirés des tenues de Radia)
  'top-stripe-blue': 'top', 'top-pinstripe-brown': 'top', 'top-satin-pink': 'top', 'top-tank-white': 'top',
  'top-stripe-yellow': 'top', 'top-crop-black': 'top', 'top-lace-cream': 'top',
  'bot-jeans-light': 'bottom', 'bot-wide-brown': 'bottom', 'bot-pencil-pink': 'bottom', 'bot-gingham-pants': 'bottom',
  'bot-sweat-grey': 'bottom', 'bot-track-red': 'bottom', 'bot-mini-black': 'bottom',
  'dr-mini-black': 'dress', 'dr-bodycon-red': 'dress', 'dr-satin-champagne': 'dress', 'dr-sage-linen': 'dress',
  'jk-track-red': 'jacket', 'jk-trench-beige': 'jacket', 'jk-cropped-pink': 'jacket',
  // --- chaussures (talons et autres), sacs
  'sh-sandals-red': 'shoes', 'sh-platform-boots': 'shoes', 'sh-heels-nude': 'shoes', 'sh-heels-red': 'shoes',
  'sh-heels-gold': 'shoes', 'sh-heels-silver': 'shoes', 'sh-heels-pink': 'shoes', 'sh-mules-cream': 'shoes', 'sh-strappy-black': 'shoes',
  'bg-shoulder-black': 'bag', 'bg-clutch-pink': 'bag', 'bg-silver': 'bag', 'bg-tote-beige': 'bag', 'bg-red-mini': 'bag', 'bg-pearl-clutch': 'bag',
  // --- accessoires : foulards/cheveux, lunettes, boucles d'oreilles, rouge à lèvres, bijoux de cou
  'hd-bandana-orange': 'acc', 'hd-bandana-pink': 'acc', 'hd-headband-velvet': 'acc', 'hd-silk-blue': 'acc',
  'hd-bow-pink': 'acc', 'hd-beret': 'acc', 'hd-claw-clip': 'acc', 'hd-pearl-pins': 'acc',
  'gl-aviator': 'acc', 'gl-round-gold': 'acc', 'gl-cat-eye': 'acc', 'gl-heart-pink': 'acc', 'gl-clear-round': 'acc',
  'ea-pearl-studs': 'acc', 'ea-drop-gold': 'acc', 'ea-hoops-silver': 'acc', 'ea-hearts': 'acc', 'ea-stars': 'acc', 'ea-big-hoops': 'acc',
  'lp-red': 'acc', 'lp-rose': 'acc', 'lp-nude': 'acc', 'lp-berry': 'acc', 'lp-coral': 'acc', 'lp-gloss': 'acc',
  // --- beauté : yeux, bouche, trait d'eye-liner, fards à paupières
  'ey-brown': 'acc', 'ey-hazel': 'acc', 'ey-honey': 'acc', 'ey-green': 'acc', 'ey-blue': 'acc', 'ey-violet': 'acc', 'ey-black': 'acc',
  'mo-full': 'acc', 'mo-thin': 'acc', 'mo-cupid': 'acc', 'mo-wide': 'acc', 'mo-closed': 'acc',
  'el-wing': 'acc', 'el-soft': 'acc', 'el-none': 'acc', 'el-bold': 'acc',
  'es-rose': 'acc', 'es-lavender': 'acc', 'es-gold': 'acc', 'es-bronze': 'acc', 'es-smoky': 'acc', 'es-green': 'acc', 'es-blue': 'acc',
  'br-promise': 'acc', 'ac-chain-gold': 'acc', 'ac-choker': 'acc', 'ac-pendant': 'acc',
  // cadeau unique et légendaire (jamais en vente, ni butin, ni récompense : voir src/events/necklace)
  'ac-eclat': 'acc',
  'cr-gold': 'crown', 'cr-flowers': 'crown', 'cr-tiara': 'crown',
} as const;
export type ClothId = keyof typeof CLOTH_SLOTS;

/** Les accessoires sont rangés par famille : un seul objet par famille à la fois. */
export type AccGroup = 'head' | 'glasses' | 'ears' | 'lips' | 'neck' | 'wrist' | 'eyes' | 'mouth' | 'liner' | 'shadow';
export const ACC_GROUP_NAMES: Record<AccGroup, string> = { head: 'Cheveux & foulards', glasses: 'Lunettes', ears: 'Boucles d\'oreilles', lips: 'Rouge à lèvres', neck: 'Bijoux', wrist: 'Bracelets', eyes: 'Yeux', mouth: 'Bouche', liner: 'Eye-liner', shadow: 'Fards à paupières' };
export const accGroup = (id: string): AccGroup | null => {
  if (id.startsWith('hd-')) return 'head';
  if (id.startsWith('gl-') || id === 'ac-sunglasses') return 'glasses';
  if (id.startsWith('ea-') || id === 'ac-hoops') return 'ears';
  if (id.startsWith('lp-')) return 'lips';
  if (id.startsWith('br-')) return 'wrist';
  if (id.startsWith('ey-')) return 'eyes';
  if (id.startsWith('mo-')) return 'mouth';
  if (id.startsWith('el-')) return 'liner';
  if (id.startsWith('es-')) return 'shadow';
  if (id === 'ac-scarf' || id === 'ac-pearls' || id.startsWith('ac-')) return 'neck';
  return null;
};
/**
 * Objets RETIRÉS du dressing : ils modifiaient la structure du visage (yeux, bouche) ou n'avaient plus d'effet sur la tête peinte (eye-liner
 * « doux » / « sans » / « ailé » : le tracé de l'illustration est la référence). Ils restent dans l'inventaire (rien n'est perdu) mais ne s'équipent plus.
 */
export const isRetiredFaceItem = (id: string): boolean => id.startsWith('ey-') || id.startsWith('mo-') || id === 'el-wing' || id === 'el-soft' || id === 'el-none';
/** Couleur des yeux (iris). La marque pigmentée dans l'œil de Radia reste toujours là. */
export const EYE_COLOR: Record<string, string> = {
  'ey-brown': '#5A3520', 'ey-hazel': '#8A6A3A', 'ey-honey': '#C08A38', 'ey-green': '#4E8F6A', 'ey-blue': '#6C8FAF', 'ey-violet': '#8A6CC0', 'ey-black': '#2A1A14',
};
export type MouthShape = 'full' | 'thin' | 'cupid' | 'wide' | 'closed';
export const MOUTH_SHAPE: Record<string, MouthShape> = { 'mo-full': 'full', 'mo-thin': 'thin', 'mo-cupid': 'cupid', 'mo-wide': 'wide', 'mo-closed': 'closed' };
export type LinerStyle = 'wing' | 'soft' | 'none' | 'bold';
export const LINER_STYLE: Record<string, LinerStyle> = { 'el-wing': 'wing', 'el-soft': 'soft', 'el-none': 'none', 'el-bold': 'bold' };
export const SHADOW_COLOR: Record<string, string> = {
  'es-rose': '#F08FB4', 'es-lavender': '#B9A5E8', 'es-gold': '#E8C168', 'es-bronze': '#B9774A', 'es-smoky': '#5B4A66', 'es-green': '#7FC48A', 'es-blue': '#7FA8E8',
};
/** Couleur de chaque rouge à lèvres (utilisée par l'avatar). */
export const LIP_COLOR: Record<string, string> = {
  'lp-red': '#C4202F', 'lp-rose': '#E0617E', 'lp-nude': '#C08F80', 'lp-berry': '#8C2A55', 'lp-coral': '#E8674F', 'lp-gloss': '#E2909A',
};
/** « L'Éclat Éternel ♡ » : cadeau unique, obtenu uniquement à la fin de la scène du feu d'artifice (src/events/necklace). */
export const NECKLACE_ID = 'ac-eclat' as const;
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
