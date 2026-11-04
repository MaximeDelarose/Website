/** Branchement du moteur Endless sur le portefeuille et le monde (LootHost) + versement UNIQUE des événements. */
import { save } from '../../core/app';
import { wallet } from '../../core/wallet';
import { addHearts } from '../../core/progress';
import { applyEvents, applyLoot, type LootHost, type LootResult } from '../../game/endless';
import type { BoardEvent, Loot } from '../../game/merge/types';
import { CLOTHES } from '../../data/world/wardrobe';
import { FURNITURE } from '../../data/world/furniture';
import type { ClothId } from '../../data/world/ids';

export function lootHost(): LootHost {
  return {
    world: save.data.world as unknown as LootHost['world'],
    giveEnergy: (n) => wallet.giveEnergy(n),
    giveDiamonds: (n) => wallet.giveDiamonds(n),
    addHearts: (n) => addHearts(n),
    giveBooster: (k, n) => { save.data.boosters[k] += n; },
  };
}

/** Verse tout ce que décrit un lot d'événements (UNE seule fois par lot), puis sauvegarde. */
export function settleEvents(ev: BoardEvent[]): LootResult {
  const r = applyEvents(lootHost(), ev);
  save.save();
  wallet.notify();
  return r;
}

/** Verse un butin (coffre, réclamation d'album) puis sauvegarde. */
export function settleLoot(loot: Loot[]): LootResult {
  const r = applyLoot(lootHost(), loot);
  save.save();
  wallet.notify();
  return r;
}

export const clothName = (id: string): string => CLOTHES[id as ClothId]?.name ?? id;
export const furnitureName = (id: string): string => (FURNITURE as Record<string, { name: string }>)[id]?.name ?? id;
