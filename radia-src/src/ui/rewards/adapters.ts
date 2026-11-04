/**
 * Adaptateurs : transforment les résultats DÉJÀ versés par les modules du jeu (carrière, événements, incidents, rénovation,
 * casino, quotidien) en cadeaux à mettre en scène. Tout est marqué `granted` : l'ouverture n'ajoute jamais rien en plus.
 * Types structurels (aucun import des modules du jeu) pour rester sans dépendance et testable.
 */
import type { GiftRarity, GiftSpec, Reward } from './types';

const push = (list: Reward[], r: Reward): void => { if (r.qty > 0) list.push({ ...r, granted: true }); };

// ---- carrière : palier franchi
export interface CareerRewardLike { coins?: number; diamonds?: number; energy?: number; fabric?: number; flowers?: number; cocoa?: number; fans?: number; cloth?: readonly string[]; furniture?: readonly string[] }
export interface GrantedItemsLike { cloth: readonly string[]; dupCoins: number; furniture: readonly string[] }

export function careerMilestoneSpec(o: { career: string; level: number; of?: number; tierTitle: string; goal?: string; reward: CareerRewardLike; items: GrantedItemsLike; coins?: number }): GiftSpec {
  const r: Reward[] = [];
  push(r, { type: 'coins', qty: (o.reward.coins ?? 0) });
  push(r, { type: 'diamonds', qty: o.reward.diamonds ?? 0 });
  push(r, { type: 'energy', qty: o.reward.energy ?? 0 });
  push(r, { type: 'res', id: 'fabric', qty: o.reward.fabric ?? 0 });
  push(r, { type: 'res', id: 'flowers', qty: o.reward.flowers ?? 0 });
  push(r, { type: 'res', id: 'cocoa', qty: o.reward.cocoa ?? 0 });
  push(r, { type: 'item', id: 'fans', label: 'fans', qty: o.reward.fans ?? 0 });
  for (const c of o.items.cloth) r.push({ type: 'cloth', id: c, qty: 1, granted: true });
  for (const f of o.items.furniture) r.push({ type: 'furniture', id: f, qty: 1, granted: true });
  push(r, { type: 'coins', qty: o.items.dupCoins, label: 'pièces (doublon converti)' });
  const of = o.of ?? 5;
  const rarity: GiftRarity = o.level >= of ? 'legendary' : o.level >= of - 1 ? 'epic' : o.level >= 3 ? 'rare' : 'uncommon';
  return { kind: 'event', rarity, title: `Palier ${o.level} : ${o.tierTitle}`, subtitle: o.goal ? `${o.goal} : réussi !` : undefined, rewards: r };
}

// ---- événement (sortie, invitation, restaurant…)
export interface EventOutcomeLike { coins: number; diamonds: number; fabric: number; flowers: number; cocoa: number; fans: number; cloth: readonly string[]; furniture: readonly string[]; dupCoins?: number }
export function eventGiftSpec(o: { title?: string; outcome: EventOutcomeLike; first: boolean }): GiftSpec | null {
  const x = o.outcome;
  const r: Reward[] = [];
  push(r, { type: 'coins', qty: x.coins });
  push(r, { type: 'diamonds', qty: x.diamonds });
  push(r, { type: 'res', id: 'fabric', qty: x.fabric });
  push(r, { type: 'res', id: 'flowers', qty: x.flowers });
  push(r, { type: 'res', id: 'cocoa', qty: x.cocoa });
  push(r, { type: 'item', id: 'fans', label: 'fans', qty: x.fans });
  for (const c of x.cloth) r.push({ type: 'cloth', id: c, qty: 1, granted: true });
  for (const f of x.furniture) r.push({ type: 'furniture', id: f, qty: 1, granted: true });
  if (!r.length) return null;
  const rich = x.cloth.length + x.furniture.length > 0 || x.diamonds >= 50;
  return { kind: 'event', rarity: rich ? (o.first ? 'epic' : 'rare') : o.first ? 'rare' : 'uncommon', title: 'Surprise pour toi ♡', subtitle: o.title, rewards: r };
}

// ---- incidents : colis, lot de boutique
export interface ParcelRewardLike { kind: 'coins' | 'cloth' | 'decor'; id?: string; coins?: number; label: string }
export function parcelSpec(o: { title: string; subtitle?: string; rewards: readonly ParcelRewardLike[]; rarity?: GiftRarity }): GiftSpec {
  const r: Reward[] = o.rewards.map((p): Reward => p.kind === 'coins' ? { type: 'coins', qty: p.coins ?? 0, label: p.label, granted: true } : p.kind === 'cloth' ? { type: 'cloth', id: p.id, qty: 1, label: p.label, granted: true } : { type: 'furniture', id: p.id, qty: 1, label: p.label, granted: true });
  return { kind: 'event', rarity: o.rarity ?? (o.rewards.length > 1 ? 'epic' : 'rare'), title: o.title, subtitle: o.subtitle, rewards: r };
}

// ---- casino : mission accomplie
export function casinoMissionSpec(o: { name: string; chips: number; item?: { t: 'cloth' | 'furn'; id: string }; duplicate?: boolean }): GiftSpec {
  const r: Reward[] = [];
  push(r, { type: 'tickets', qty: o.chips });
  if (o.item && !o.duplicate) r.push({ type: o.item.t === 'cloth' ? 'cloth' : 'furniture', id: o.item.id, qty: 1, granted: true });
  return { kind: 'event', rarity: o.item && !o.duplicate ? 'epic' : 'rare', title: 'Mission accomplie !', subtitle: o.name + (o.duplicate ? ' · objet déjà possédé : tickets en plus ♡' : ''), rewards: r };
}
