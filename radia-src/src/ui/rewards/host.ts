/**
 * Hôte par défaut : relie l'API aux fonctions EXISTANTES du jeu (portefeuille, monde, tickets du casino, coffres Endless,
 * souvenirs). Les doublons sont compensés en pièces comme ailleurs (moitié du prix).
 */
import { save, events } from '../../core/app';
import { wallet } from '../../core/wallet';
import { addHearts, unlockMemory } from '../../core/progress';
import { grantChips } from '../../casino/store';
import { giveChest } from '../../game/endless/treasure';
import { CLOTHES } from '../../data/world/wardrobe';
import { FURNITURE } from '../../data/world/furniture';
import { memoryById } from '../../data/memories';
import type { RewardHost } from './types';

const CAP = 999_999_999;
const w = () => save.data.world;

export function defaultHost(): RewardHost {
  return {
    once(key) {
      const f = w().flags;
      const k = `rw:${key}`;
      if (f[k]) return false;
      f[k] = true;
      try { save.writeNow(); } catch { /* le jeu tourne même sans stockage */ }
      return true;
    },
    addRes(kind, n) { if (n > 0) w().res[kind] = Math.min(CAP, w().res[kind] + Math.floor(n)); },
    giveDiamonds: (n) => { if (n > 0) wallet.giveDiamonds(n); },
    giveEnergy: (n) => { if (n > 0) wallet.giveEnergy(n); },
    giveTickets: (n) => { if (n > 0) grantChips(n, 'mission'); },
    addHearts: (n) => addHearts(n),
    giveBooster: (k, n) => { save.data.boosters[k] += n; },
    addChest: (n) => giveChest(save.data.fun, n),
    ownsCloth: (id) => w().wardrobe.owned.includes(id as never),
    giveCloth: (id) => { if (id in CLOTHES && !w().wardrobe.owned.includes(id as never)) w().wardrobe.owned.push(id as never); },
    clothBack: (id) => (id in CLOTHES ? Math.max(50, Math.floor((CLOTHES[id as keyof typeof CLOTHES]?.coins ?? 100) / 2)) : null),
    ownsFurniture: (id) => (w().castle.owned[id] ?? 0) > 0,
    giveFurniture: (id) => { if (id in FURNITURE) w().castle.owned[id] = (w().castle.owned[id] ?? 0) + 1; },
    furnitureBack: (id) => (id in FURNITURE ? Math.max(50, Math.floor(((FURNITURE as Record<string, { price: number }>)[id]?.price ?? 100) / 2)) : null),
    unlockMemory: (id) => unlockMemory(id),
    addBouquet: (key, n) => { w().garden.bouquets[key] = (w().garden.bouquets[key] ?? 0) + Math.floor(n); },
    nameOf(type, id) {
      if (type === 'cloth') return (CLOTHES as Record<string, { name: string }>)[id]?.name ?? null;
      if (type === 'furniture') return (FURNITURE as Record<string, { name: string }>)[id]?.name ?? null;
      if (type === 'memory') return memoryById(id)?.title ?? null;
      return null;
    },
    balance(t) {
      switch (t) {
        case 'diamonds': return wallet.diamonds();
        case 'energy': return wallet.energy();
        case 'hearts': return save.data.hearts;
        case 'tickets': return (save.data.fun.casino.chips ?? 0) + (save.data.fun.casino.bring ?? 0);
        default: return w().res[t];
      }
    },
    persist() { save.save(); events.emit('economy', undefined); },
  };
}
