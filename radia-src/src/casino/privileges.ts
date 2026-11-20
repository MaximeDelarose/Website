/**
 * Boutique du Casino Royal : objets EXCLUSIFS achetés avec des PIÈCES (le portefeuille unique de RADIA). Ces mêmes objets se débloquent aussi
 * gratuitement par les missions du casino (voir missions.ts). Les prix reprennent la valeur de l'ancienne boutique en tickets
 * (1 ticket = 10 pièces) et restent sous les prix de prestige des boutiques classiques (src/data/world/prices.ts).
 * Logique pure : les effets sur le monde passent par des fonctions passées en paramètre.
 */
import type { CasinoState } from '../save/fun';
import type { World } from '../save/schema';
import { CLOTHES } from '../data/world/wardrobe';
import { FURNITURE } from '../data/world/furniture';

export type PrivReward =
  | { t: 'cloth'; id: string } | { t: 'furn'; id: string }
  | { t: 'mats'; n: number };
/** `price` en PIÈCES. */
export interface Privilege { id: string; name: string; desc: string; price: number; reward: PrivReward }

export const PRIVILEGES: readonly Privilege[] = [
  { id: 'gift-mats', name: 'Coffret de l’atelier', desc: '10 fleurs, 10 tissus et 10 cacaos.', price: 400, reward: { t: 'mats', n: 10 } },
  { id: 'cloth-pearls', name: 'Collier de perles', desc: 'Un bijou exclusif pour Radia.', price: 1500, reward: { t: 'cloth', id: 'ac-pearls' } },
  { id: 'furn-fireplace', name: 'Cheminée du salon', desc: 'Une cheminée en marbre pour MON MONDE.', price: 2500, reward: { t: 'furn', id: 'fireplace' } },
  { id: 'furn-pergola', name: 'Pergola fleurie', desc: 'Un coin de jardin romantique.', price: 3000, reward: { t: 'furn', id: 'pergola' } },
  { id: 'furn-fountain', name: 'Fontaine du jardin', desc: 'Une fontaine pour MON MONDE.', price: 3500, reward: { t: 'furn', id: 'fountain' } },
  { id: 'cloth-redcarpet', name: 'Robe de tapis rouge', desc: 'Pour entrer au casino en reine.', price: 4500, reward: { t: 'cloth', id: 'dr-redcarpet' } },
  { id: 'cloth-tiara', name: 'Diadème de perles', desc: 'Le diadème des soirées de gala.', price: 5000, reward: { t: 'cloth', id: 'cr-tiara' } },
];
export const privilegeById = (id: string): Privilege | undefined => PRIVILEGES.find((p) => p.id === id);
/** Tous les objets promis existent-ils vraiment dans le monde ? (vérifié par test) */
export const rewardExists = (r: PrivReward): boolean => (r.t === 'cloth' ? r.id in CLOTHES : r.t === 'furn' ? r.id in FURNITURE : true);

export const owned = (p: Privilege, w: World): boolean =>
  p.reward.t === 'cloth' ? w.wardrobe.owned.includes(p.reward.id as never) : p.reward.t === 'furn' ? (w.castle.owned[p.reward.id] ?? 0) > 0 : false;

export type PrivBuy = { ok: true; spent: number } | { ok: false; reason: 'unknown' | 'coins' | 'owned' };

/**
 * Achète un privilège avec des PIÈCES (jamais de solde négatif : débit tout ou rien). L'objet est donné une seule fois ;
 * un objet déjà possédé est refusé SANS débiter.
 */
export function buyPrivilege(s: CasinoState, w: World, id: string): PrivBuy {
  const p = privilegeById(id);
  if (!p) return { ok: false, reason: 'unknown' };
  if (owned(p, w)) return { ok: false, reason: 'owned' };
  if (w.res.coins < p.price) return { ok: false, reason: 'coins' };
  w.res.coins -= p.price;
  s.stats['privileges.depense'] = (s.stats['privileges.depense'] ?? 0) + p.price;
  const r = p.reward;
  if (r.t === 'cloth') w.wardrobe.owned.push(r.id as never);
  else if (r.t === 'furn') w.castle.owned[r.id] = 1;
  else { w.res.flowers += r.n; w.res.fabric += r.n; w.res.cocoa += r.n; }
  return { ok: true, spent: p.price };
}
