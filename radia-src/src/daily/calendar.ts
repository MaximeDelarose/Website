/**
 * Calendrier des cadeaux quotidiens : 6 thèmes de 7 jours (données pures, aucun DOM).
 * Le cycle 1 (index 0) est EXACTEMENT : J1 250 pièces · J2 100 diamants · J3 sac chic · J4 bouquet rare ·
 * J5 tenue élégante · J6 meuble royal · J7 robe de soirée + accessoire assorti.
 * Les objets viennent des registres du monde (aucun nouvel identifiant : les registres sont figés par id).
 * Une liste `pick` = candidats par ordre de préférence : on offre le premier que Radia n'a pas encore ;
 * s'il les a tous, elle reçoit à la place la moitié du prix en pièces (jamais un doublon inutile).
 */
import { CLOTHES } from '../data/world/wardrobe';
import { FURNITURE } from '../data/world/furniture';
import { FLOWER_NAMES, RES_NAMES, type ClothId, type FlowerId, type FurnitureId, type ResKind } from '../data/world/ids';
import type { Rarity } from '../ui/fx/sparkle';

export const DAYS = 7;

export type Part =
  | { t: 'coins'; n: number }
  | { t: 'diamonds'; n: number }
  | { t: 'res'; k: Exclude<ResKind, 'coins'>; n: number }
  | { t: 'cloth'; pick: ClothId[] }
  | { t: 'furn'; pick: FurnitureId[] }
  | { t: 'bouquet'; flowers: FlowerId[] };

export interface DayDef { name: string; parts: Part[]; rarity: Rarity }
export interface ThemeDef { id: string; name: string; blurb: string; accent: string; days: DayDef[] }

const D = (name: string, rarity: Rarity, ...parts: Part[]): DayDef => ({ name, parts, rarity });
const coins = (n: number): Part => ({ t: 'coins', n });
const dia = (n: number): Part => ({ t: 'diamonds', n });
const res = (k: Exclude<ResKind, 'coins'>, n: number): Part => ({ t: 'res', k, n });
const cloth = (...pick: ClothId[]): Part => ({ t: 'cloth', pick });
const furn = (...pick: FurnitureId[]): Part => ({ t: 'furn', pick });
const bq = (...flowers: FlowerId[]): Part => ({ t: 'bouquet', flowers });

export const THEMES: ThemeDef[] = [
  {
    id: 'princess', name: 'Princesse du château', blurb: 'Un petit goût de conte de fées', accent: '#E8558F',
    days: [
      D('250 pièces', 'common', coins(250)),
      D('100 diamants', 'uncommon', dia(100)),
      D('Un sac à main chic', 'rare', cloth('bg-mini-gold', 'bg-silver', 'bg-shoulder-black', 'bg-tote-beige')),
      D('Un magnifique bouquet rare', 'rare', bq('orchid', 'lily', 'peony', 'hydrangea', 'magic')),
      D('Une nouvelle tenue élégante', 'epic', cloth('dr-satin-champagne', 'jk-blazer-cream', 'dr-little-black', 'dr-bodycon-red')),
      D('Un meuble royal exclusif', 'epic', furn('chandelier', 'fireplace', 'bed-royal', 'banquet-table')),
      D('Robe de soirée et diadème', 'legendary', cloth('dr-emerald-evening', 'dr-redcarpet', 'dr-royal-gown', 'dr-white-gown'), cloth('cr-tiara', 'cr-gold', 'ac-pearls')),
    ],
  },
  {
    id: 'paris', name: 'Mode parisienne', blurb: 'Un vent de rue de la Paix', accent: '#7C6BB0',
    days: [
      D('8 tissus', 'common', res('fabric', 8)),
      D('200 pièces', 'common', coins(200)),
      D('Un béret chic', 'rare', cloth('hd-beret', 'hd-silk-blue', 'ac-scarf', 'hd-headband-velvet')),
      D('Des talons élégants', 'rare', cloth('sh-heels-nude', 'sh-strappy-black', 'sh-heels', 'sh-mules-cream')),
      D('Un trench parisien', 'epic', cloth('jk-trench-beige', 'jk-blazer-cream', 'jk-leather-black')),
      D('Un miroir de boudoir', 'epic', furn('mirror-standing', 'vanity', 'accessory-stand', 'clothes-rack')),
      D('Petite robe noire et perles', 'legendary', cloth('dr-little-black', 'dr-mini-black', 'dr-satin-champagne'), cloth('ac-pearls', 'ea-pearl-studs', 'ac-chain-gold')),
    ],
  },
  {
    id: 'garden', name: 'Jardin de rêve', blurb: 'Des pétales plein les poches', accent: '#5FB88A',
    days: [
      D('30 fleurs', 'common', res('flowers', 30)),
      D('120 pièces', 'common', coins(120), res('flowers', 10)),
      D('Un vase de fleurs', 'rare', furn('flower-vase', 'plant-pot', 'flowerbed')),
      D('Un bouquet de saison', 'rare', bq('rose', 'peony', 'lavender', 'tulip', 'daisy')),
      D('Une couronne de fleurs', 'epic', cloth('cr-flowers', 'hd-bow-pink', 'hd-pearl-pins')),
      D('Une pergola fleurie', 'epic', furn('pergola', 'fountain', 'bench')),
      D('Robe fleurie et nœud', 'legendary', cloth('dr-flowy-floral', 'dr-sundress-yellow', 'dr-sage-linen'), cloth('hd-bow-pink', 'cr-flowers', 'hd-pearl-pins')),
    ],
  },
  {
    id: 'romance', name: 'Soirée romantique', blurb: 'Bougies, velours et mots doux', accent: '#E8558F',
    days: [
      D('60 diamants', 'uncommon', dia(60)),
      D('300 pièces', 'common', coins(300)),
      D('Des bougies', 'rare', furn('candles', 'lamp-table', 'lamp-floor')),
      D('Un pendentif cœur', 'rare', cloth('ac-pendant', 'ea-hearts', 'gl-heart-pink')),
      D('Une robe rose romantique', 'epic', cloth('dr-romantic-pink', 'dr-lavender-tulle', 'top-satin-pink')),
      D('Une cheminée crépitante', 'epic', furn('fireplace', 'rug-rect', 'sofa')),
      D('Robe de bal et escarpins', 'legendary', cloth('dr-lavender-tulle', 'dr-white-gown', 'dr-romantic-pink'), cloth('sh-heels-pink', 'sh-heels-gold', 'ea-hearts')),
    ],
  },
  {
    id: 'choco', name: 'Chocolaterie royale', blurb: 'Une pluie de cacao et de douceurs', accent: '#A6785A',
    days: [
      D('20 cacao', 'common', res('cocoa', 20)),
      D('200 pièces', 'common', coins(200), res('cocoa', 8)),
      D('Une vitrine à chocolats', 'rare', furn('choco-display', 'coffee-table')),
      D('40 cacao et 5 diamants', 'rare', res('cocoa', 40), dia(5)),
      D('Une blouse de dentelle', 'epic', cloth('top-lace-cream', 'top-cardigan-lavender', 'top-satin-pink')),
      D('Une table de banquet', 'epic', furn('banquet-table', 'bookshelf', 'bench')),
      D('Robe champagne et couronne', 'legendary', cloth('dr-satin-champagne', 'dr-white-gown', 'dr-redcarpet'), cloth('cr-gold', 'cr-tiara', 'ac-chain-gold')),
    ],
  },
  {
    id: 'star', name: 'Tenues de célébrité', blurb: 'Le tapis rouge t\'attend', accent: '#D9A43C',
    days: [
      D('300 pièces', 'common', coins(300)),
      D('80 diamants', 'uncommon', dia(80)),
      D('Un sac de star', 'rare', cloth('bg-silver', 'bg-red-mini', 'bg-pearl-clutch')),
      D('Des talons dorés', 'rare', cloth('sh-heels-gold', 'sh-heels-silver', 'sh-heels-red')),
      D('Une robe de scène', 'epic', cloth('dr-bodycon-red', 'dr-stage-sequin', 'dr-mini-black')),
      D('Un tapis de gala', 'epic', furn('red-carpet', 'clothes-rack', 'mirror-standing')),
      D('Robe tapis rouge et lunettes', 'legendary', cloth('dr-redcarpet', 'dr-stage-sequin', 'dr-royal-gown'), cloth('gl-cat-eye', 'ea-big-hoops', 'gl-aviator')),
    ],
  },
];

export const themeOf = (cycle: number): ThemeDef => THEMES[Math.max(0, Math.floor(cycle)) % THEMES.length];
/** Nombre de tours complets de thèmes déjà faits (augmente doucement les montants). */
const loops = (cycle: number): number => Math.floor(Math.max(0, cycle) / THEMES.length);
const roundTo = (n: number, step: number): number => Math.max(step, Math.round(n / step) * step);

/** Fiche du jour (0..6) d'un cycle ; les montants montent de 15 % par tour de thèmes (plafond ×2). */
export function dayDef(cycle: number, day: number): DayDef {
  const d = themeOf(cycle).days[Math.min(DAYS - 1, Math.max(0, Math.floor(day)))];
  const mult = Math.min(2, 1 + 0.15 * loops(cycle));
  if (mult === 1) return d;
  return { ...d, parts: d.parts.map((p) => (p.t === 'coins' ? { ...p, n: roundTo(p.n * mult, 10) } : p.t === 'diamonds' ? { ...p, n: roundTo(p.n * mult, 5) } : p.t === 'res' ? { ...p, n: roundTo(p.n * mult, 2) } : p)) };
}

// ------------------------------------------------------------------ résolution (ce qui est vraiment offert)

export interface Ownership { cloth: (id: ClothId) => boolean; furn: (id: FurnitureId) => number }
export type Resolved =
  | { t: 'coins'; n: number }
  | { t: 'diamonds'; n: number }
  | { t: 'res'; k: Exclude<ResKind, 'coins'>; n: number }
  | { t: 'cloth'; id: ClothId }
  | { t: 'furn'; id: FurnitureId }
  | { t: 'bouquet'; ids: FlowerId[]; key: string }
  /** Tous les candidats déjà possédés : on offre des pièces à la place. */
  | { t: 'dup'; n: number; name: string };

export const bouquetKeyOf = (ids: readonly string[]): string => [...ids].sort().join('+');

export function resolveDay(cycle: number, day: number, own: Ownership): Resolved[] {
  const taken = new Set<string>(); // deux pièces d'une même journée ne se marchent pas dessus
  return dayDef(cycle, day).parts.map((p): Resolved => {
    if (p.t === 'coins' || p.t === 'diamonds' || p.t === 'res') return { ...p };
    if (p.t === 'bouquet') return { t: 'bouquet', ids: [...p.flowers], key: bouquetKeyOf(p.flowers) };
    if (p.t === 'cloth') {
      const id = p.pick.find((c) => !own.cloth(c) && !taken.has(c));
      if (id) { taken.add(id); return { t: 'cloth', id }; }
      return { t: 'dup', n: Math.max(50, Math.floor((CLOTHES[p.pick[0]]?.coins ?? 100) / 2)), name: CLOTHES[p.pick[0]]?.name ?? 'Pièce' };
    }
    const id = p.pick.find((f) => own.furn(f) === 0 && !taken.has(f));
    if (id) { taken.add(id); return { t: 'furn', id }; }
    return { t: 'dup', n: Math.max(50, Math.floor((FURNITURE[p.pick[0]]?.price ?? 100) / 2)), name: FURNITURE[p.pick[0]]?.name ?? 'Meuble' };
  });
}

/** Libellé court d'un lot résolu (« 250 pièces », « Robe de soirée émeraude »…). */
export function describe(r: Resolved): { title: string; sub?: string } {
  switch (r.t) {
    case 'coins': return { title: `${r.n} pièces` };
    case 'diamonds': return { title: `${r.n} diamants` };
    case 'res': return { title: `${r.n} ${RES_NAMES[r.k].toLowerCase()}` };
    case 'cloth': return { title: CLOTHES[r.id].name };
    case 'furn': return { title: FURNITURE[r.id].name };
    case 'bouquet': return { title: 'Bouquet rare', sub: r.ids.map((i) => FLOWER_NAMES[i]).join(', ') };
    case 'dup': return { title: `${r.n} pièces`, sub: `${r.name} : tu l’as déjà ♡` };
  }
}
