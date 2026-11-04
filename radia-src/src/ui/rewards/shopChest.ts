/**
 * Coffre d'Auguste (gratuit, toutes les 4 h) et Coffre du royaume (boutique) : le butin est DÉJÀ versé par l'appelant (tables de
 * `rollChest` inchangées) ; ce module en fait seulement le cadeau à mettre en scène via `openGift`.
 */
import type { GiftSpec, Reward } from './types';

export interface ShopChestLoot { energy: number; hearts: number; diamonds: number; wands: number; winds: number }
export interface StoredItem { name: string; icon?: string }

export function shopChestSpec(kind: 'free' | 'royal', loot: ShopChestLoot, stored: readonly StoredItem[], lostHearts = 0): GiftSpec {
  const rewards: Reward[] = [];
  const add = (r: Reward) => { if (r.qty > 0) rewards.push({ ...r, granted: true }); };
  add({ type: 'energy', qty: loot.energy });
  add({ type: 'hearts', qty: loot.hearts + lostHearts });
  add({ type: 'diamonds', qty: loot.diamonds });
  add({ type: 'item', id: 'wand', qty: loot.wands });
  add({ type: 'item', id: 'wind', qty: loot.winds });
  for (const s of stored) add({ type: 'item', qty: 1, label: s.name, icon: s.icon, rarity: kind === 'royal' ? 'epic' : 'rare' });
  const royal = kind === 'royal';
  return {
    kind: royal ? 'premium' : 'chest',
    rarity: royal ? 'epic' : stored.length || loot.diamonds ? 'rare' : 'uncommon',
    title: royal ? 'Coffre du royaume' : 'Coffre d\'Auguste',
    subtitle: stored.length ? 'Les objets sont rangés dans ton sac.' : undefined,
    rewards,
    message: royal ? 'Rien que pour toi, Radia ♡' : undefined,
  };
}
