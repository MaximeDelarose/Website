/**
 * Pont pour les coffres de l'Endless : transforme le butin DÉJÀ versé (settleLoot / placeLoot) en cadeau à montrer.
 * Tout est marqué `granted` : l'ouverture n'ajoute RIEN, elle met seulement en scène.
 *
 * Appel prévu dans chestFlow.ts (à la place des lignes « Un coffre pour toi ! »), après `settleLoot` :
 *   await openGift(endlessChestSpec({ rarity, loot: placed.loot, cloth: out.cloth, furniture: out.furniture, dupCoins: out.dupCoins,
 *                                      names: { cloth: clothName, furniture: furnitureName }, more: left }));
 */
import type { GiftRarity, GiftSpec, Reward } from './types';

/** Forme minimale d'un butin Endless (`Loot` de merge/types.ts). */
export interface LootLike { kind: string; n: number; rarity?: string; item?: unknown }
export interface EndlessChestInput {
  rarity: GiftRarity;
  loot: readonly LootLike[];
  cloth?: readonly string[];
  furniture?: readonly string[];
  /** Pièces rendues pour les doublons (déjà versées). */
  dupCoins?: number;
  /** Vignette (URL) d'un objet de plateau, si disponible. */
  itemIcon?: (l: LootLike) => string | undefined;
  names?: { cloth?: (id: string) => string; furniture?: (id: string) => string };
  title?: string;
  subtitle?: string;
}

const TITLE: Record<GiftRarity, string> = { common: 'Un coffre pour toi !', uncommon: 'Joli coffre !', rare: 'Coffre rare !', epic: 'Coffre épique !', legendary: 'Coffre légendaire !' };

export function endlessChestSpec(i: EndlessChestInput): GiftSpec {
  const rewards: Reward[] = [];
  for (const l of i.loot) {
    const qty = Math.max(0, Math.floor(l.n));
    if (qty <= 0) continue;
    switch (l.kind) {
      case 'coins': rewards.push({ type: 'coins', qty, granted: true }); break;
      case 'diamonds': rewards.push({ type: 'diamonds', qty, granted: true }); break;
      case 'energy': rewards.push({ type: 'energy', qty, granted: true }); break;
      case 'hearts': rewards.push({ type: 'hearts', qty, granted: true }); break;
      case 'flowers': case 'fabric': case 'cocoa': rewards.push({ type: 'res', id: l.kind, qty, granted: true }); break;
      case 'chest': rewards.push({ type: 'chest', qty, granted: true }); break;
      case 'wand': case 'wind': rewards.push({ type: 'item', id: l.kind, qty, granted: true }); break;
      case 'ticket': rewards.push({ type: 'item', id: 'ticket', qty, label: 'Ticket d\'événement', granted: true }); break;
      case 'fragment': rewards.push({ type: 'item', id: 'fragment', qty, label: 'Fragment de vêtement', granted: true }); break;
      case 'star': case 'rareItem': rewards.push({ type: 'item', id: l.kind, qty, label: l.kind === 'star' ? 'Étoile filante' : 'Objet rare', icon: i.itemIcon?.(l), granted: true }); break;
      default: break; // cloth / bag / accessory / deco : listés ci-dessous (versés par le butin)
    }
  }
  for (const c of i.cloth ?? []) rewards.push({ type: 'cloth', id: c, qty: 1, label: i.names?.cloth?.(c), granted: true });
  for (const f of i.furniture ?? []) rewards.push({ type: 'furniture', id: f, qty: 1, label: i.names?.furniture?.(f), granted: true });
  if ((i.dupCoins ?? 0) > 0) rewards.push({ type: 'coins', qty: i.dupCoins!, label: 'pièces (doublon converti)', granted: true });
  return { kind: i.rarity === 'legendary' || i.rarity === 'epic' ? 'premium' : 'chest', rarity: i.rarity, title: i.title ?? TITLE[i.rarity], subtitle: i.subtitle, rewards };
}
