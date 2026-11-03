/**
 * Données du module « chat + famille » : accessoires du chat, actions,
 * mini-jeux familiaux (thèmes d'harmonie, recettes, symboles de mémoire).
 * Aucun prénom ni âge : les enfants ne sont désignés que par kid1/kid2/kid3.
 */
import type { CatItemId, ChocId, ColorId, FurnitureId, KidId } from './ids';

// ------------------------------------------------------------------ chat
export type CatSlot = 'bed' | 'collar' | 'toy';
export const CAT_ITEMS: Record<CatItemId, { name: string; price: number; slot: CatSlot; desc: string }> = {
  cushion: { name: 'Coussin moelleux', price: 60, slot: 'bed', desc: 'Un coussin rose pour les siestes.' },
  'toy-ball': { name: 'Balle à grelot', price: 40, slot: 'toy', desc: 'Pour jouer sans jamais se lasser.' },
  'collar-bell': { name: 'Collier à grelot', price: 80, slot: 'collar', desc: 'Un nœud rose avec un petit grelot.' },
  basket: { name: 'Petit panier', price: 120, slot: 'bed', desc: 'Un panier douillet en osier.' },
};

export type CatKind = 'pet' | 'treat' | 'play' | 'sleep' | 'walk' | 'sit' | 'purr';
export const CAT_KINDS: CatKind[] = ['pet', 'treat', 'play', 'sleep', 'walk', 'sit', 'purr'];
export const CAT_ACTIONS: Record<CatKind, { label: string; cooldown: number; bond: number }> = {
  pet: { label: 'Caresser', cooldown: 1200, bond: 1 },
  treat: { label: 'Friandise', cooldown: 3500, bond: 2 },
  play: { label: 'Jouer', cooldown: 5000, bond: 2 },
  sleep: { label: 'Dormir', cooldown: 8000, bond: 1 },
  walk: { label: 'Promenade', cooldown: 6000, bond: 1 },
  sit: { label: 'Assis', cooldown: 1500, bond: 1 },
  purr: { label: 'Ronron', cooldown: 2500, bond: 1 },
};
export const CAT_TREAT_MAX = 5;
export const CAT_TREAT_REGEN_MS = 20 * 60_000;
/** Seuils d'affection (cumul de points) pour les niveaux 1..6. */
export const CAT_BOND_LEVELS = [0, 5, 15, 30, 55, 90, 140];

// ------------------------------------------------------------------ famille
export type FamilyGameId = 'bouquet' | 'harmony' | 'memory' | 'choc';
export const FAMILY_GAME_IDS: FamilyGameId[] = ['bouquet', 'harmony', 'memory', 'choc'];
/** Mini-jeu « maison » de chaque enfant. */
export const KID_GAME: Record<KidId, FamilyGameId> = { kid1: 'bouquet', kid2: 'harmony', kid3: 'memory' };
export const GAME_INFO: Record<FamilyGameId, { title: string; rule: string }> = {
  bouquet: { title: 'Bouquet', rule: 'Touche deux fleurs identiques pour les fusionner : fabrique 3 grosses fleurs !' },
  harmony: { title: 'Harmonie', rule: 'Choisis le mur, le sol et le rideau qui s\'accordent avec le thème de la chambre.' },
  memory: { title: 'Mémoire', rule: 'Retrouve les paires cachées, puis complète la suite logique.' },
  choc: { title: 'Chocolats en famille', rule: 'Ajoute les ingrédients dans l\'ordre de la recette pour remplir la boîte.' },
};

/** Niveaux de complicité : seuils de points cumulés (niveau 0 à 5). */
export const KID_BOND_LEVELS = [0, 2, 5, 9, 14, 20];
export const KID_BOND_MAX = KID_BOND_LEVELS.length - 1;

// ------------------------------------------------------------------ Harmonie
export interface HarmonyTheme {
  id: string;
  name: string;
  hint: string;
  /** Couleurs idéales (3 points) puis acceptables (2 points) pour chaque emplacement. */
  wall: { best: ColorId[]; ok: ColorId[] };
  floor: { best: ColorId[]; ok: ColorId[] };
  curtain: { best: ColorId[]; ok: ColorId[] };
}
export const HARMONY_THEMES: HarmonyTheme[] = [
  { id: 'douceur', name: 'Douceur rosée', hint: 'Des tons tendres et chauds.',
    wall: { best: ['rose'], ok: ['peach', 'cream'] }, floor: { best: ['cream'], ok: ['beige', 'white'] }, curtain: { best: ['lavender'], ok: ['peach', 'rose'] } },
  { id: 'foret', name: 'Clairière', hint: 'La nature, le bois et la mousse.',
    wall: { best: ['sage'], ok: ['cream', 'beige'] }, floor: { best: ['brown'], ok: ['beige', 'cream'] }, curtain: { best: ['cream'], ok: ['white', 'sage'] } },
  { id: 'ciel', name: 'Ciel d\'été', hint: 'Frais, clair et lumineux.',
    wall: { best: ['sky'], ok: ['white', 'lavender'] }, floor: { best: ['white'], ok: ['cream', 'beige'] }, curtain: { best: ['lavender'], ok: ['sky', 'white'] } },
  { id: 'royal', name: 'Conte royal', hint: 'Violet et or, comme dans un conte.',
    wall: { best: ['violet'], ok: ['lavender', 'noir'] }, floor: { best: ['gold'], ok: ['cream', 'beige'] }, curtain: { best: ['rose'], ok: ['gold', 'lavender'] } },
  { id: 'gouter', name: 'Goûter doré', hint: 'Pêche, miel et crème.',
    wall: { best: ['peach'], ok: ['cream', 'gold'] }, floor: { best: ['beige'], ok: ['brown', 'cream'] }, curtain: { best: ['gold'], ok: ['cream', 'peach'] } },
  { id: 'soiree', name: 'Soirée étoilée', hint: 'Une nuit douce et brillante.',
    wall: { best: ['noir'], ok: ['violet'] }, floor: { best: ['violet'], ok: ['lavender', 'noir'] }, curtain: { best: ['gold'], ok: ['sky', 'rose'] } },
];
/** Meubles possibles en récompense d'Harmonie (petits objets de déco). */
export const HARMONY_FURNITURE: FurnitureId[] = ['rug-round', 'lamp-table', 'plant-pot', 'painting', 'flower-vase', 'candles', 'plush-toys', 'easel'];

// ------------------------------------------------------------------ Mémoire
export const MEMORY_SYMBOLS = ['flower', 'heart', 'star', 'moon', 'cat', 'key', 'crown', 'cake'] as const;
export type MemorySymbol = (typeof MEMORY_SYMBOLS)[number];
export const MEMORY_NAMES: Record<MemorySymbol, string> = {
  flower: 'Fleur', heart: 'Cœur', star: 'Étoile', moon: 'Lune', cat: 'Chat', key: 'Clé', crown: 'Couronne', cake: 'Gâteau',
};

// ------------------------------------------------------------------ Chocolats
export const INGREDIENTS = ['cocoa', 'milk', 'sugar', 'hazelnut', 'cream', 'vanilla', 'mold', 'ribbon', 'lemon', 'mint'] as const;
export type IngredientId = (typeof INGREDIENTS)[number];
export const INGREDIENT_NAMES: Record<IngredientId, string> = {
  cocoa: 'Cacao', milk: 'Lait', sugar: 'Sucre', hazelnut: 'Noisettes', cream: 'Crème', vanilla: 'Vanille',
  mold: 'Moule cœur', ribbon: 'Ruban', lemon: 'Citron', mint: 'Menthe',
};
export interface ChocRecipe { id: ChocId; steps: IngredientId[]; tray: IngredientId[] }
export const CHOC_RECIPES: ChocRecipe[] = [
  { id: 'milk', steps: ['cocoa', 'milk', 'sugar'], tray: ['sugar', 'lemon', 'cocoa', 'milk', 'mint', 'ribbon'] },
  { id: 'praline', steps: ['hazelnut', 'sugar', 'cocoa', 'cream'], tray: ['cream', 'mint', 'sugar', 'cocoa', 'lemon', 'hazelnut', 'milk', 'ribbon'] },
  { id: 'heart', steps: ['cocoa', 'cream', 'vanilla', 'mold', 'ribbon'], tray: ['ribbon', 'lemon', 'cream', 'mold', 'hazelnut', 'cocoa', 'mint', 'vanilla', 'milk', 'sugar'] },
];

// ------------------------------------------------------------------ textes
export const GARDEN_SCENE_LINES = [
  'Le plus beau des jardins, c\'est celui dans lequel ceux qu\'on aime peuvent grandir et s\'épanouir.',
  'Pour la plus belle des mamans ♡',
];
export const MOTHER_SCENE_LINES: { text: string }[] = [
  { text: 'Tu sais ce que j\'admire aussi chez toi ? C\'est tout l\'amour et l\'énergie que tu donnes chaque jour à ta famille.' },
  { text: 'Moi, je t\'ai construit un château… Mais toi, tu as déjà construit quelque chose de bien plus précieux : une famille.' },
];

/** Noms des meubles pouvant être gagnés à « Harmonie ». */
export const FURNITURE_LABEL: Partial<Record<FurnitureId, string>> = {
  'rug-round': 'Tapis rond', 'lamp-table': 'Lampe de chevet', 'plant-pot': 'Plante en pot', painting: 'Tableau',
  'flower-vase': 'Vase de fleurs', candles: 'Bougies', 'plush-toys': 'Peluches', easel: 'Chevalet',
};
