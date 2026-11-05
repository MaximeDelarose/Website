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
  /** Toujours possédé (gratuit) : options de visage à changer librement. */
  free?: boolean;
  /** Cadeau : jamais en vente ; n'apparaît dans le dressing qu'une fois reçu. */
  gift?: boolean;
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
  'dr-black-mini-ls': C('dr-black-mini-ls', 'Robe noire courte, collants noirs', ['chic', 'stage'], 280, { fabric: 3 }),
  'dr-pink-satin': C('dr-pink-satin', 'Robe rose satinée', ['chic', 'romantic'], 260, { fabric: 4 }),
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
  'top-stripe-blue': C('top-stripe-blue', 'Pull rayé bleu', ['casual'], 140, { fabric: 2 }),
  'top-pinstripe-brown': C('top-pinstripe-brown', 'Chemise à rayures brune', ['chic'], 190, { fabric: 3 }),
  'top-satin-pink': C('top-satin-pink', 'Haut satiné rose', ['romantic', 'chic'], 210, { fabric: 3 }),
  'top-tank-white': C('top-tank-white', 'Débardeur côtelé blanc', ['casual'], 70),
  'top-stripe-yellow': C('top-stripe-yellow', 'Pull marinière jaune', ['casual'], 120, { fabric: 2 }),
  'top-crop-black': C('top-crop-black', 'Top court noir', ['casual', 'stage'], 90),
  'top-lace-cream': C('top-lace-cream', 'Blouse en dentelle crème', ['romantic'], 230, { fabric: 3 }),
  'bot-jeans-light': C('bot-jeans-light', 'Jean bleu clair', ['casual'], 110),
  'bot-wide-brown': C('bot-wide-brown', 'Pantalon large taupe', ['chic', 'casual'], 180, { fabric: 2 }),
  'bot-pencil-pink': C('bot-pencil-pink', 'Jupe crayon rose', ['chic', 'romantic'], 190, { fabric: 3 }),
  'bot-gingham-pants': C('bot-gingham-pants', 'Pantalon vichy rouge', ['casual'], 120, { fabric: 2 }),
  'bot-sweat-grey': C('bot-sweat-grey', 'Jogging gris', ['casual'], 80),
  'bot-track-red': C('bot-track-red', 'Pantalon de survêt rouge', ['casual'], 130, { fabric: 2 }),
  'bot-mini-black': C('bot-mini-black', 'Mini-jupe noire', ['chic', 'stage'], 140, { fabric: 2 }),
  'dr-mini-black': C('dr-mini-black', 'Mini-robe noire à manches', ['chic', 'stage'], 300, { fabric: 4 }),
  'dr-bodycon-red': C('dr-bodycon-red', 'Robe moulante rouge', ['stage'], 340, { fabric: 4 }),
  'dr-satin-champagne': C('dr-satin-champagne', 'Robe satin champagne', ['chic', 'romantic'], 380, { fabric: 5, diamonds: 15 }),
  'dr-sage-linen': C('dr-sage-linen', 'Robe en lin sauge', ['casual', 'romantic'], 190, { fabric: 3 }),
  'jk-track-red': C('jk-track-red', 'Veste de survêt rouge', ['casual'], 180, { fabric: 2 }),
  'jk-trench-beige': C('jk-trench-beige', 'Trench beige', ['chic'], 330, { fabric: 4 }),
  'jk-cropped-pink': C('jk-cropped-pink', 'Veste courte rose', ['romantic'], 220, { fabric: 3 }),
  'sh-sandals-red': C('sh-sandals-red', 'Sandales rouges', ['casual', 'romantic'], 120),
  'sh-platform-boots': C('sh-platform-boots', 'Bottes à plateforme', ['stage', 'chic'], 260),
  'sh-heels-nude': C('sh-heels-nude', 'Talons nude', ['chic'], 190),
  'sh-heels-red': C('sh-heels-red', 'Talons rouges', ['stage', 'chic'], 210),
  'sh-heels-gold': C('sh-heels-gold', 'Talons dorés', ['stage', 'royal'], 300, { diamonds: 10 }),
  'sh-heels-silver': C('sh-heels-silver', 'Talons argentés', ['stage'], 280),
  'sh-heels-pink': C('sh-heels-pink', 'Talons rose poudré', ['romantic'], 200),
  'sh-mules-cream': C('sh-mules-cream', 'Mules crème', ['casual', 'chic'], 150),
  'sh-strappy-black': C('sh-strappy-black', 'Sandales à brides noires', ['chic', 'stage'], 230),
  'bg-shoulder-black': C('bg-shoulder-black', 'Sac épaule noir', ['chic', 'casual'], 160),
  'bg-clutch-pink': C('bg-clutch-pink', 'Pochette rose perlée', ['romantic'], 190),
  'bg-silver': C('bg-silver', 'Sac baguette argenté', ['stage', 'chic'], 260),
  'bg-tote-beige': C('bg-tote-beige', 'Cabas beige', ['casual'], 140),
  'bg-red-mini': C('bg-red-mini', 'Mini sac rouge', ['stage'], 170),
  'bg-pearl-clutch': C('bg-pearl-clutch', 'Pochette nacrée', ['royal', 'romantic'], 280, { diamonds: 15 }),
  'hd-bandana-orange': C('hd-bandana-orange', 'Bandana orange fleuri', ['casual'], 70),
  'hd-bandana-pink': C('hd-bandana-pink', 'Bandana rose', ['casual', 'romantic'], 70),
  'hd-headband-velvet': C('hd-headband-velvet', 'Bandeau velours noir', ['chic'], 80),
  'hd-silk-blue': C('hd-silk-blue', 'Foulard de soie bleu', ['chic', 'romantic'], 90),
  'hd-bow-pink': C('hd-bow-pink', 'Grand nœud rose', ['romantic'], 60),
  'hd-beret': C('hd-beret', 'Béret noir', ['chic'], 100),
  'hd-claw-clip': C('hd-claw-clip', 'Pince crabe écaille', ['casual'], 50),
  'hd-pearl-pins': C('hd-pearl-pins', 'Épingles perlées', ['royal', 'romantic'], 120),
  'gl-aviator': C('gl-aviator', 'Lunettes aviateur', ['casual', 'stage'], 120),
  'gl-round-gold': C('gl-round-gold', 'Lunettes rondes dorées', ['chic'], 110),
  'gl-cat-eye': C('gl-cat-eye', 'Lunettes œil de chat', ['chic', 'stage'], 130),
  'gl-heart-pink': C('gl-heart-pink', 'Lunettes cœur', ['romantic'], 100),
  'gl-clear-round': C('gl-clear-round', 'Rondes transparentes', ['casual'], 90),
  'ea-pearl-studs': C('ea-pearl-studs', 'Puces perlées', ['chic', 'romantic'], 70),
  'ea-drop-gold': C('ea-drop-gold', 'Pendantes dorées', ['chic', 'stage'], 110),
  'ea-hoops-silver': C('ea-hoops-silver', 'Créoles argentées', ['casual', 'chic'], 90),
  'ea-hearts': C('ea-hearts', 'Boucles cœurs', ['romantic'], 80),
  'ea-stars': C('ea-stars', 'Boucles étoiles', ['romantic', 'stage'], 80),
  'ea-big-hoops': C('ea-big-hoops', 'Grandes créoles', ['stage', 'casual'], 100),
  'lp-red': C('lp-red', 'Rouge à lèvres rouge', ['chic', 'stage'], 60),
  'lp-rose': C('lp-rose', 'Rouge rose poudré', ['romantic', 'casual'], 50),
  'lp-nude': C('lp-nude', 'Rouge nude', ['casual', 'chic'], 40),
  'lp-berry': C('lp-berry', 'Rouge prune', ['chic', 'stage'], 60),
  'lp-coral': C('lp-coral', 'Rouge corail', ['casual', 'romantic'], 50),
  'lp-gloss': C('lp-gloss', 'Gloss brillant', ['romantic', 'casual'], 40),
  'ac-chain-gold': C('ac-chain-gold', 'Chaîne dorée', ['chic', 'stage'], 120),
  'ac-choker': C('ac-choker', 'Tour de cou noir', ['stage', 'casual'], 70),
  'ac-pendant': C('ac-pendant', 'Pendentif cœur', ['romantic'], 110),
  'dr-bathrobe': C('dr-bathrobe', 'Peignoir blanc', ['casual', 'romantic'], 170, { fabric: 3 }),
  'dr-pajama-pink': C('dr-pajama-pink', 'Pyjama rose à pois', ['casual', 'romantic'], 90, {}),
  'dr-pajama-stars': C('dr-pajama-stars', 'Pyjama étoilé', ['casual', 'romantic'], 100, {}),
  'dr-nightgown-silk': C('dr-nightgown-silk', 'Nuisette en soie', ['romantic', 'chic'], 160, { fabric: 3 }),
  'ey-brown': C('ey-brown', 'Yeux marron (naturels)', ['romantic', 'casual'], 0, { free: true }),
  'ey-hazel': C('ey-hazel', 'Yeux noisette', ['romantic', 'casual'], 0, { free: true }),
  'ey-honey': C('ey-honey', 'Yeux miel', ['romantic', 'casual'], 0, { free: true }),
  'ey-green': C('ey-green', 'Yeux verts', ['romantic', 'casual'], 0, { free: true }),
  'ey-blue': C('ey-blue', 'Yeux bleu-gris', ['romantic', 'casual'], 0, { free: true }),
  'ey-violet': C('ey-violet', 'Yeux violets', ['romantic', 'casual'], 0, { free: true }),
  'ey-black': C('ey-black', 'Yeux noirs', ['romantic', 'casual'], 0, { free: true }),
  'mo-full': C('mo-full', 'Lèvres pulpeuses', ['romantic', 'casual'], 0, { free: true }),
  'mo-thin': C('mo-thin', 'Lèvres fines', ['romantic', 'casual'], 0, { free: true }),
  'mo-cupid': C('mo-cupid', 'Arc de Cupidon', ['romantic', 'casual'], 0, { free: true }),
  'mo-wide': C('mo-wide', 'Grand sourire', ['romantic', 'casual'], 0, { free: true }),
  'mo-closed': C('mo-closed', 'Sourire fermé', ['romantic', 'casual'], 0, { free: true }),
  'el-wing': C('el-wing', 'Trait ailé (naturel)', ['romantic', 'casual'], 0, { free: true }),
  'el-soft': C('el-soft', 'Trait doux', ['romantic', 'casual'], 0, { free: true }),
  'el-none': C('el-none', 'Sans eye-liner', ['romantic', 'casual'], 0, { free: true }),
  'el-bold': C('el-bold', 'Trait appuyé', ['romantic', 'casual'], 0, { free: true }),
  'es-rose': C('es-rose', 'Fard rose', ['romantic', 'stage'], 40),
  'es-lavender': C('es-lavender', 'Fard lavande', ['romantic', 'stage'], 40),
  'es-gold': C('es-gold', 'Fard doré', ['romantic', 'stage'], 40),
  'es-bronze': C('es-bronze', 'Fard bronze', ['romantic', 'stage'], 40),
  'es-smoky': C('es-smoky', 'Fard smoky', ['romantic', 'stage'], 40),
  'es-green': C('es-green', 'Fard vert tendre', ['romantic', 'stage'], 40),
  'es-blue': C('es-blue', 'Fard bleu ciel', ['romantic', 'stage'], 40),
  // cadeau d'Auguste : ni achetable ni vendu, il se reçoit pendant « Une soirée avec A ♡ »
  'br-promise': C('br-promise', 'La promesse d’Auguste ♡', ['romantic', 'royal'], 0, { gift: true }),
  // cadeau légendaire unique : aucun prix, jamais en vente ni dans un butin (la scène du feu d'artifice l'attribue)
  'ac-eclat': C('ac-eclat', 'L’Éclat Éternel ♡', ['romantic', 'royal'], 0, { gift: true }),
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
  'hair-sleek-part': { id: 'hair-sleek-part', name: 'Lisses, raie au milieu', coins: 60 },
  'hair-medium': { id: 'hair-medium', name: 'Mi-longs', coins: 70 },
  'hair-bob': { id: 'hair-bob', name: 'Carré', coins: 90 },
  'hair-braid': { id: 'hair-braid', name: 'Tresse', coins: 100 },
  'hair-curly': { id: 'hair-curly', name: 'Boucles volumineuses', coins: 110 },
  'hair-space-buns': { id: 'hair-space-buns', name: 'Deux chignons', coins: 100 },
  'hair-high-pony': { id: 'hair-high-pony', name: 'Queue haute lisse', coins: 90 },
};

export const STYLE_NAMES: Record<StyleId, string> = {
  casual: 'Casual', chic: 'Chic', romantic: 'Romantique', royal: 'Royal', stage: 'Scène',
};

/** Une tenue « particulièrement élégante » (réaction spéciale d'Auguste). */
export const ELEGANT_CLOTHES: ClothId[] = ['dr-bodycon-red', 'dr-satin-champagne', 'dr-white-gown', 'dr-emerald-evening', 'dr-little-black', 'dr-lavender-tulle', 'dr-royal-gown', 'dr-redcarpet', 'dr-romantic-pink', 'dr-stage-sequin', 'jk-blazer-cream'];
