/**
 * Catalogue du dressing (noms, emplacements, styles, prix). Le module
 * « dressing » peut ajuster les prix et ajouter des champs, mais pas les
 * identifiants (voir ids.ts). `coins` = pièces gagnées en jouant ; `diamonds`
 * = diamants virtuels (facultatifs : les tenues classiques s'achètent en pièces).
 */
import { CLOTH_SLOTS, type ClothId, type ClothSlot, type HairId, type StyleId } from './ids';

export interface ClothDef {
  id: ClothId;
  name: string;
  slot: ClothSlot;
  styles: StyleId[];
  /** Prix en pièces (0 = offert). */
  coins: number;
  /** Tissus nécessaires en plus (récoltés en fusionnant les objets de Paris). */
  fabric?: number;
  /** Prix en diamants (pièces de luxe uniquement). */
  diamonds?: number;
  /** Possédé dès le départ. */
  starter?: boolean;
}

const C = (id: ClothId, name: string, styles: StyleId[], coins: number, extra: Partial<ClothDef> = {}): ClothDef => ({ id, name, slot: CLOTH_SLOTS[id], styles, coins, ...extra });

export const CLOTHES: Record<ClothId, ClothDef> = {
  'top-tee-white': C('top-tee-white', 'Tee-shirt blanc', ['casual'], 0, { starter: true }),
  'top-tee-pink': C('top-tee-pink', 'Tee-shirt rose', ['casual', 'romantic'], 60),
  'top-hoodie-black': C('top-hoodie-black', 'Sweat noir oversize', ['casual'], 0, { starter: true }),
  'top-hoodie-cream': C('top-hoodie-cream', 'Sweat crème', ['casual', 'romantic'], 90),
  'top-cardigan-lavender': C('top-cardigan-lavender', 'Cardigan lavande', ['romantic', 'chic'], 140, { fabric: 2 }),
  'top-blouse-silk': C('top-blouse-silk', 'Chemisier en soie', ['chic'], 220, { fabric: 3 }),
  'top-stripe-shirt': C('top-stripe-shirt', 'Chemise à fines rayures', ['chic', 'casual'], 160, { fabric: 2 }),
  'bot-jeans': C('bot-jeans', 'Jean droit', ['casual'], 0, { starter: true }),
  'bot-wide-black': C('bot-wide-black', 'Pantalon large noir', ['casual', 'chic'], 0, { starter: true }),
  'bot-skirt-pleated': C('bot-skirt-pleated', 'Jupe plissée', ['romantic', 'chic'], 130, { fabric: 2 }),
  'bot-trousers-chic': C('bot-trousers-chic', 'Pantalon élégant', ['chic'], 200, { fabric: 3 }),
  'dr-flowy-floral': C('dr-flowy-floral', 'Robe fluide fleurie', ['romantic'], 260, { fabric: 4 }),
  'dr-romantic-pink': C('dr-romantic-pink', 'Robe rose romantique', ['romantic'], 300, { fabric: 4 }),
  'dr-royal-gown': C('dr-royal-gown', 'Robe royale', ['royal'], 520, { fabric: 8, diamonds: 40 }),
  'dr-stage-sequin': C('dr-stage-sequin', 'Robe de scène à paillettes', ['stage'], 420, { fabric: 6 }),
  'dr-redcarpet': C('dr-redcarpet', 'Robe de tapis rouge', ['stage', 'royal'], 600, { fabric: 9, diamonds: 60 }),
  'dr-sundress-yellow': C('dr-sundress-yellow', 'Robe d\'été jaune', ['casual', 'romantic'], 150, { fabric: 2 }),
  'dr-little-black': C('dr-little-black', 'Petite robe noire', ['chic'], 240, { fabric: 3 }),
  'dr-gingham-red': C('dr-gingham-red', 'Robe vichy rouge', ['romantic', 'casual'], 200, { fabric: 3 }),
  'dr-denim': C('dr-denim', 'Robe en jean', ['casual'], 170, { fabric: 2 }),
  'dr-lavender-tulle': C('dr-lavender-tulle', 'Robe lavande en tulle', ['romantic', 'royal'], 380, { fabric: 6 }),
  'dr-white-gown': C('dr-white-gown', 'Robe blanche en dentelle', ['romantic', 'royal'], 460, { fabric: 7, diamonds: 30 }),
  'dr-emerald-evening': C('dr-emerald-evening', 'Robe de soirée émeraude', ['chic', 'stage'], 440, { fabric: 6, diamonds: 25 }),
  'dr-striped-navy': C('dr-striped-navy', 'Robe marinière', ['casual'], 130, { fabric: 2 }),
  'jk-blazer-cream': C('jk-blazer-cream', 'Blazer crème', ['chic'], 240, { fabric: 3 }),
  'jk-leather-black': C('jk-leather-black', 'Veste en cuir noire', ['casual', 'stage'], 280, { fabric: 3 }),
  'jk-denim': C('jk-denim', 'Veste en jean', ['casual'], 150, { fabric: 2 }),
  'sh-sneakers-white': C('sh-sneakers-white', 'Baskets blanches', ['casual'], 0, { starter: true }),
  'sh-heels': C('sh-heels', 'Escarpins', ['chic', 'royal', 'stage'], 180),
  'sh-boots': C('sh-boots', 'Bottines', ['casual', 'chic'], 170),
  'sh-flats-red': C('sh-flats-red', 'Ballerines rouges', ['romantic', 'casual'], 110),
  'bg-crossbody-black': C('bg-crossbody-black', 'Petit sac noir bandoulière', ['casual', 'chic'], 0, { starter: true }),
  'bg-mini-gold': C('bg-mini-gold', 'Mini sac doré', ['chic', 'stage', 'royal'], 210),
  'ac-pearls': C('ac-pearls', 'Collier de perles', ['chic', 'romantic', 'royal'], 150),
  'ac-hoops': C('ac-hoops', 'Créoles dorées', ['casual', 'chic', 'stage'], 90),
  'ac-scarf': C('ac-scarf', 'Foulard de soie', ['chic', 'romantic'], 80),
  'ac-sunglasses': C('ac-sunglasses', 'Lunettes de soleil', ['casual', 'stage'], 100),
  'cr-gold': C('cr-gold', 'Couronne dorée', ['royal'], 300, { diamonds: 25 }),
  'cr-flowers': C('cr-flowers', 'Couronne de fleurs', ['romantic'], 140),
  'cr-tiara': C('cr-tiara', 'Diadème de perles', ['royal', 'stage'], 380, { diamonds: 35 }),
};

export interface HairDef { id: HairId; name: string; coins: number; starter?: boolean }
export const HAIRS: Record<HairId, HairDef> = {
  'hair-loose': { id: 'hair-loose', name: 'Cheveux lâchés', coins: 0, starter: true },
  'hair-wavy': { id: 'hair-wavy', name: 'Cheveux ondulés', coins: 0, starter: true },
  'hair-ponytail': { id: 'hair-ponytail', name: 'Queue de cheval', coins: 80 },
  'hair-bun': { id: 'hair-bun', name: 'Chignon', coins: 100 },
  'hair-half': { id: 'hair-half', name: 'Demi-attache', coins: 120 },
};

export const STYLE_NAMES: Record<StyleId, string> = {
  casual: 'Casual', chic: 'Chic', romantic: 'Romantique', royal: 'Royal', stage: 'Scène',
};

/** Une tenue « particulièrement élégante » (réaction spéciale d'Auguste). */
export const ELEGANT_CLOTHES: ClothId[] = ['dr-white-gown', 'dr-emerald-evening', 'dr-little-black', 'dr-lavender-tulle', 'dr-royal-gown', 'dr-redcarpet', 'dr-romantic-pink', 'dr-stage-sequin', 'jk-blazer-cream'];
