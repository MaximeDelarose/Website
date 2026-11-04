/**
 * Calendrier des cadeaux quotidiens : 6 thèmes (cycles) de 7 jours, données pures, aucun DOM.
 * Structure commune à chaque cycle : J1 pièces/ressource · J2 diamants · J3 tickets du Casino Royal · J4 accessoire de mode ·
 * J5 coffre de décoration (2 objets) · J6 tickets + objet cosmétique · J7 tenue exclusive ou décoration rare.
 * Les objets viennent des registres du monde (aucun nouvel identifiant). Une liste `pick` = candidats par ordre de
 * préférence : on offre le premier que Radia n'a pas encore ; si elle les a tous, elle reçoit la moitié du prix en pièces.
 * Joueuse au milieu d'un cycle : l'état `fun.daily` (cycle, jour, jours cochés) est inchangé ; elle continue au même jour
 * et reçoit simplement le contenu actualisé des jours restants (`migrateDaily` ne fait que rendre l'état cohérent).
 */
import { CLOTHES } from '../data/world/wardrobe';
import { FURNITURE } from '../data/world/furniture';
import { FLOWER_NAMES, RES_NAMES, type ClothId, type FlowerId, type FurnitureId, type ResKind } from '../data/world/ids';
import type { Rarity } from '../ui/fx/sparkle';

export const DAYS = 7;

export type Part =
  | { t: 'coins'; n: number }
  | { t: 'diamonds'; n: number }
  /** Tickets du Casino Royal (gratuits, jamais achetables). */
  | { t: 'tickets'; n: number }
  | { t: 'res'; k: Exclude<ResKind, 'coins'>; n: number }
  | { t: 'cloth'; pick: ClothId[] }
  | { t: 'furn'; pick: FurnitureId[] }
  | { t: 'bouquet'; flowers: FlowerId[] };

export interface DayDef { name: string; parts: Part[]; rarity: Rarity }
export interface ThemeDef { id: string; name: string; blurb: string; accent: string; days: DayDef[] }

const D = (name: string, rarity: Rarity, ...parts: Part[]): DayDef => ({ name, parts, rarity });
const coins = (n: number): Part => ({ t: 'coins', n });
const dia = (n: number): Part => ({ t: 'diamonds', n });
const tix = (n: number): Part => ({ t: 'tickets', n });
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
      D('Des tickets du Casino Royal', 'rare', tix(250)),
      D('Un sac à main chic', 'rare', cloth('bg-mini-gold', 'bg-silver', 'bg-shoulder-black', 'bg-tote-beige')),
      D('Un coffre de décoration', 'epic', furn('chandelier', 'fireplace', 'bed-royal', 'banquet-table'), furn('candles', 'lamp-table', 'plant-pot'), coins(80)),
      D('Tickets et accessoire précieux', 'epic', tix(400), cloth('cr-gold', 'ac-pearls', 'hd-pearl-pins')),
      D('Robe de soirée et diadème', 'legendary', cloth('dr-emerald-evening', 'dr-redcarpet', 'dr-royal-gown', 'dr-white-gown'), cloth('cr-tiara', 'cr-gold', 'ac-pearls')),
    ],
  },
  {
    id: 'paris', name: 'Mode parisienne', blurb: 'Un vent de rue de la Paix', accent: '#7C6BB0',
    days: [
      D('8 tissus', 'common', res('fabric', 8)),
      D('80 diamants', 'uncommon', dia(80)),
      D('Des tickets du Casino Royal', 'rare', tix(250)),
      D('Un béret chic', 'rare', cloth('hd-beret', 'hd-silk-blue', 'ac-scarf', 'hd-headband-velvet')),
      D('Un coffre de décoration', 'epic', furn('mirror-standing', 'vanity'), furn('accessory-stand', 'clothes-rack'), coins(80)),
      D('Tickets et talons élégants', 'epic', tix(400), cloth('sh-heels-nude', 'sh-strappy-black', 'sh-heels', 'sh-mules-cream')),
      D('Petite robe noire et perles', 'legendary', cloth('dr-little-black', 'dr-mini-black', 'dr-satin-champagne'), cloth('ac-pearls', 'ea-pearl-studs', 'ac-chain-gold')),
    ],
  },
  {
    id: 'garden', name: 'Jardin de rêve', blurb: 'Des pétales plein les poches', accent: '#5FB88A',
    days: [
      D('30 fleurs', 'common', res('flowers', 30)),
      D('70 diamants', 'uncommon', dia(70)),
      D('Des tickets du Casino Royal', 'rare', tix(250)),
      D('Un nœud fleuri', 'rare', cloth('hd-bow-pink', 'hd-pearl-pins', 'cr-flowers')),
      D('Un coffre de décoration', 'epic', furn('flower-vase', 'plant-pot', 'flowerbed'), furn('bench', 'fountain'), bq('rose', 'peony', 'lavender', 'tulip', 'daisy')),
      D('Tickets et couronne de fleurs', 'epic', tix(400), cloth('cr-flowers', 'hd-bow-pink', 'hd-pearl-pins')),
      D('Pergola fleurie et robe d\'été', 'legendary', furn('pergola', 'fountain', 'flowerbed'), cloth('dr-flowy-floral', 'dr-sundress-yellow', 'dr-sage-linen')),
    ],
  },
  {
    id: 'romance', name: 'Soirée romantique', blurb: 'Bougies, velours et mots doux', accent: '#E8558F',
    days: [
      D('300 pièces', 'common', coins(300)),
      D('60 diamants', 'uncommon', dia(60)),
      D('Des tickets du Casino Royal', 'rare', tix(250)),
      D('Un pendentif cœur', 'rare', cloth('ac-pendant', 'ea-hearts', 'gl-heart-pink')),
      D('Un coffre de décoration', 'epic', furn('candles', 'lamp-table', 'lamp-floor'), furn('rug-rect', 'sofa', 'fireplace'), coins(80)),
      D('Tickets et escarpins roses', 'epic', tix(400), cloth('sh-heels-pink', 'sh-heels-gold', 'ea-hearts')),
      D('Cheminée de velours et robe de bal', 'legendary', furn('fireplace', 'sofa', 'rug-rect'), cloth('dr-lavender-tulle', 'dr-white-gown', 'dr-romantic-pink')),
    ],
  },
  {
    id: 'choco', name: 'Chocolaterie royale', blurb: 'Une pluie de cacao et de douceurs', accent: '#A6785A',
    days: [
      D('20 cacao', 'common', res('cocoa', 20)),
      D('60 diamants', 'uncommon', dia(60)),
      D('Des tickets du Casino Royal', 'rare', tix(250)),
      D('Une pochette de soirée', 'rare', cloth('bg-pearl-clutch', 'bg-tote-beige', 'bg-shoulder-black')),
      D('Un coffre de décoration', 'epic', furn('choco-display', 'coffee-table'), furn('banquet-table', 'bookshelf', 'bench'), res('cocoa', 15)),
      D('Tickets et blouse de dentelle', 'epic', tix(400), cloth('top-lace-cream', 'top-cardigan-lavender', 'top-satin-pink')),
      D('Robe champagne et couronne', 'legendary', cloth('dr-satin-champagne', 'dr-white-gown', 'dr-redcarpet'), cloth('cr-gold', 'cr-tiara', 'ac-chain-gold')),
    ],
  },
  {
    id: 'star', name: 'Tenues de célébrité', blurb: 'Le tapis rouge t\'attend', accent: '#D9A43C',
    days: [
      D('300 pièces', 'common', coins(300)),
      D('80 diamants', 'uncommon', dia(80)),
      D('Des tickets du Casino Royal', 'rare', tix(250)),
      D('Des lunettes de star', 'rare', cloth('gl-cat-eye', 'gl-aviator', 'ea-big-hoops')),
      D('Un coffre de décoration', 'epic', furn('red-carpet', 'clothes-rack'), furn('mirror-standing', 'chandelier'), coins(80)),
      D('Tickets et talons dorés', 'epic', tix(400), cloth('sh-heels-gold', 'sh-heels-silver', 'sh-heels-red')),
      D('Robe tapis rouge et sac de star', 'legendary', cloth('dr-redcarpet', 'dr-stage-sequin', 'dr-royal-gown'), cloth('bg-silver', 'bg-red-mini', 'bg-pearl-clutch')),
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
  return { ...d, parts: d.parts.map((p) => (p.t === 'coins' ? { ...p, n: roundTo(p.n * mult, 10) } : p.t === 'diamonds' ? { ...p, n: roundTo(p.n * mult, 5) } : p.t === 'tickets' ? { ...p, n: roundTo(p.n * mult, 10) } : p.t === 'res' ? { ...p, n: roundTo(p.n * mult, 2) } : p)) };
}

// ------------------------------------------------------------------ résolution (ce qui est vraiment offert)

export interface Ownership { cloth: (id: ClothId) => boolean; furn: (id: FurnitureId) => number }
export type Resolved =
  | { t: 'coins'; n: number }
  | { t: 'diamonds'; n: number }
  | { t: 'tickets'; n: number }
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
    if (p.t === 'coins' || p.t === 'diamonds' || p.t === 'tickets' || p.t === 'res') return { ...p };
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
    case 'tickets': return { title: `${r.n} tickets du Casino Royal`, sub: 'À jouer au casino, gratuit ♡' };
    case 'res': return { title: `${r.n} ${RES_NAMES[r.k].toLowerCase()}` };
    case 'cloth': return { title: CLOTHES[r.id].name };
    case 'furn': return { title: FURNITURE[r.id].name };
    case 'bouquet': return { title: 'Bouquet rare', sub: r.ids.map((i) => FLOWER_NAMES[i]).join(', ') };
    case 'dup': return { title: `${r.n} pièces`, sub: `${r.name} : tu l’as déjà ♡` };
  }
}
