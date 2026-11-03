/** Données de la chocolaterie : recettes, coûts, niveaux de boutique. */
import { CHOC_IDS, type ChocId, type ResKind } from './ids';

export interface ChocDef {
  id: ChocId;
  /** Coût de fabrication d'une fournée. */
  cost: Partial<Record<ResKind, number>>;
  /** Valeur d'un chocolat (pièces). */
  value: number;
  /** Prix d'achat de la recette (0 = déjà connue). */
  unlockCoins: number;
  /** Niveau de boutique requis pour acheter la recette. */
  unlockLevel: number;
  color: string;
}

export const CHOCS: Record<ChocId, ChocDef> = {
  milk: { id: 'milk', cost: { cocoa: 4 }, value: 16, unlockCoins: 0, unlockLevel: 1, color: '#B97A4E' },
  dark: { id: 'dark', cost: { cocoa: 5 }, value: 20, unlockCoins: 0, unlockLevel: 1, color: '#6B3E2E' },
  praline: { id: 'praline', cost: { cocoa: 7 }, value: 32, unlockCoins: 120, unlockLevel: 1, color: '#A4673F' },
  truffle: { id: 'truffle', cost: { cocoa: 9 }, value: 46, unlockCoins: 220, unlockLevel: 2, color: '#5A352A' },
  white: { id: 'white', cost: { cocoa: 6, flowers: 3 }, value: 40, unlockCoins: 180, unlockLevel: 2, color: '#FFF1DE' },
  hazelnut: { id: 'hazelnut', cost: { cocoa: 10 }, value: 60, unlockCoins: 320, unlockLevel: 3, color: '#9C6A45' },
  heart: { id: 'heart', cost: { cocoa: 9, flowers: 6 }, value: 80, unlockCoins: 450, unlockLevel: 3, color: '#E8558F' },
  royalbox: { id: 'royalbox', cost: { cocoa: 16, flowers: 8, coins: 40 }, value: 150, unlockCoins: 800, unlockLevel: 4, color: '#F3C86B' },
};
export const CHOC_LIST: ChocDef[] = CHOC_IDS.map((id) => CHOCS[id]);

export const MAX_SHOP_LEVEL = 5;
/** Prix (pièces) pour passer du niveau `level` au suivant. */
export const SHOP_UPGRADE: Record<number, number> = { 1: 200, 2: 450, 3: 800, 4: 1400 };

export const BOX_SIZE = 4;
/** Multiplicateur de la quantité fabriquée selon l'étoile. */
export const STAR_QTY = [0, 1, 2, 3];
export const STAR_VALUE = [0, 1, 1.15, 1.35];
