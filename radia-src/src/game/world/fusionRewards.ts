/**
 * Ce que la fusion rapporte au château (logique pure, testée) :
 *  - chaque fusion → des pièces (= niveau de l'objet créé) ;
 *  - fusionner des fleurs / de Paris / d'amour → des fleurs / des tissus / du cacao
 *    (à partir du niveau 3), les échecs rapportent des pièces en bonus ;
 *  - livrer une commande → pièces (+ matériaux de la collection des objets livrés) ;
 *  - terminer un niveau → pièces selon la récompense du niveau.
 */
import type { ItemRef } from '../../data/items';
import type { ResKind } from '../../data/world/ids';
import type { OrderReward } from '../merge/types';

export type Gain = Partial<Record<ResKind, number>>;

/**
 * Collection → matériau du monde (Endless 2.0) :
 *  fleurs / fleurs rares → fleurs · amour / chocolats → cacao · Paris / vêtements / accessoires / sacs → tissu · pâtisseries → cacao ;
 *  échecs, bijoux, parfums, château, cadeaux → pièces en bonus (voir COIN_BONUS).
 */
export const MATERIAL_OF: Record<string, ResKind | undefined> = {
  flowers: 'flowers', rare: 'flowers', paris: 'fabric', cloth: 'fabric', acc: 'fabric', bag: 'fabric', love: 'cocoa', choc: 'cocoa', pastry: 'cocoa',
};
/** Pièces bonus par fusion pour les collections sans matériau dédié. */
export const COIN_BONUS: Record<string, number> = { chess: 2, jewel: 2, perfume: 1, castle: 2, gift: 2 };

export function mergeReward(result: ItemRef, combo = 1): Gain {
  const g: Gain = { coins: Math.max(1, result.l) };
  const bonus = COIN_BONUS[result.c];
  if (bonus) g.coins = (g.coins ?? 0) + bonus;
  const m = MATERIAL_OF[result.c];
  if (m && result.l >= 3) g[m] = 1 + (result.l >= 6 ? 1 : 0);
  if (combo >= 3) g.coins = (g.coins ?? 0) + combo;
  return g;
}

export function deliverReward(items: ItemRef[], hearts: number): Gain {
  const g: Gain = { coins: Math.max(5, hearts * 2) };
  for (const it of items) {
    const m = MATERIAL_OF[it.c];
    if (m) g[m] = (g[m] ?? 0) + 2;
  }
  return g;
}

/**
 * Endless 2.0 : gains « monde » d'une commande, tels qu'annoncés par `order.reward`
 * (pièces + matériau lié à la collection demandée).
 */
export function orderGain(r: OrderReward): Gain {
  const g: Gain = { coins: Math.max(1, r.coins) };
  if (r.mat && r.matN > 0) g[r.mat] = r.matN;
  return g;
}

export const levelReward = (hearts: number, first: boolean): Gain => ({ coins: Math.round(hearts * (first ? 3 : 1)) });

export function addGain(a: Gain, b: Gain): Gain {
  const out: Gain = { ...a };
  for (const [k, n] of Object.entries(b) as [ResKind, number][]) out[k] = (out[k] ?? 0) + n;
  return out;
}
