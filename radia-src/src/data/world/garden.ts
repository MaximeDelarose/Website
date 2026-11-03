/** Données du jardin : variétés, coûts, durées de pousse, chaîne de fusion. */
import { FLOWER_IDS, type FlowerId, type ResKind } from './ids';

export interface FlowerDef {
  id: FlowerId;
  /** Durée de pousse (ms) : 20 s à 2 min. */
  growMs: number;
  /** Coût d'une plantation. */
  cost: Partial<Record<ResKind, number>>;
  /** Fleurs (ressource) rendues à la récolte. */
  yieldFlowers: number;
  /** Valeur de base pour les bouquets (pièces). */
  value: number;
  /** Prix pour débloquer la variété avec des pièces. */
  unlockCoins: number;
  /** Sinon : récolter `n` fleurs de la variété `from` la débloque gratuitement. */
  unlockHarvest: { from: FlowerId; n: number } | null;
  color: string;
}

/** Ordre de fusion : 3 fleurs identiques → 1 fleur de la variété suivante. */
export const FUSION_CHAIN: FlowerId[] = ['daisy', 'tulip', 'rose', 'peony', 'lavender', 'hydrangea', 'lily', 'orchid', 'sunflower', 'magic'];
export const FUSION_COST = 3;

export const STARTER_FLOWERS: FlowerId[] = ['rose', 'daisy', 'tulip'];

const D = (id: FlowerId, growS: number, cost: FlowerDef['cost'], yieldFlowers: number, value: number, unlockCoins: number, from: FlowerId | null, color: string): FlowerDef => ({
  id, growMs: growS * 1000, cost, yieldFlowers, value, unlockCoins, unlockHarvest: from ? { from, n: 3 } : null, color,
});

export const FLOWERS: Record<FlowerId, FlowerDef> = {
  daisy: D('daisy', 20, { flowers: 1 }, 2, 6, 0, null, '#FFFFFF'),
  tulip: D('tulip', 30, { flowers: 2 }, 3, 9, 0, null, '#FF8FB1'),
  rose: D('rose', 40, { flowers: 3 }, 4, 14, 0, null, '#E8558F'),
  peony: D('peony', 55, { flowers: 4 }, 5, 22, 60, 'rose', '#F9A8C4'),
  lavender: D('lavender', 65, { coins: 25 }, 6, 30, 90, 'peony', '#B9A5E8'),
  hydrangea: D('hydrangea', 80, { coins: 40 }, 8, 42, 140, 'lavender', '#8FB6F0'),
  lily: D('lily', 90, { coins: 60 }, 9, 56, 200, 'hydrangea', '#FFF4E8'),
  orchid: D('orchid', 100, { coins: 80 }, 11, 74, 280, 'lily', '#C77DDB'),
  sunflower: D('sunflower', 75, { coins: 100 }, 12, 95, 360, 'orchid', '#F3C86B'),
  magic: D('magic', 120, { coins: 150 }, 15, 150, 520, 'sunflower', '#9FD8FF'),
};

export const FLOWER_LIST: FlowerDef[] = FLOWER_IDS.map((id) => FLOWERS[id]);

export const nextFlower = (id: string): FlowerId | null => {
  const i = FUSION_CHAIN.indexOf(id as FlowerId);
  return i >= 0 && i < FUSION_CHAIN.length - 1 ? FUSION_CHAIN[i + 1] : null;
};

export const MAX_PLOTS = 12;
export const START_PLOTS = 4;
/** Prix (pièces) pour passer de `count` à `count + 1` parcelles. */
export const plotPrice = (count: number): number => 120 + (count - START_PLOTS) * 130;

export const BOUQUET_MIN = 3;
export const BOUQUET_MAX = 5;
