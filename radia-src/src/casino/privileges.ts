/**
 * Privilèges du Casino Royal : à quoi servent les TICKETS (ressource rare, jamais achetable, ne servent plus à miser).
 *  - tenues, bijoux et décors de prestige (des objets réels du monde, aussi accessibles en pièces à prix de prestige) ;
 *  - cadeaux spéciaux (diamants, matériaux) ;
 *  - la « Soirée du Casino Royal » : 3 tours de machine à sous OFFERTS (mise de 100 pièces offerte), une fois par jour.
 * Logique pure : les effets sur le monde passent par des fonctions passées en paramètre.
 */
import type { CasinoState } from '../save/fun';
import type { World } from '../save/schema';
import { CLOTHES } from '../data/world/wardrobe';
import { FURNITURE } from '../data/world/furniture';
import { SlotsRun } from './slots';
import type { Rng } from './rng';
import { dayNum } from './tickets';

export type PrivReward =
  | { t: 'cloth'; id: string } | { t: 'furn'; id: string }
  | { t: 'diamonds'; n: number } | { t: 'mats'; n: number }
  | { t: 'event' };
export interface Privilege { id: string; name: string; desc: string; price: number; reward: PrivReward }

export const EVENT_SPINS = 3;
export const EVENT_STAKE = 100;

export const PRIVILEGES: readonly Privilege[] = [
  { id: 'soiree', name: 'Soirée du Casino Royal', desc: `${EVENT_SPINS} tours de machine à sous offerts (mise de ${EVENT_STAKE} pièces offerte). Une fois par jour.`, price: 50, reward: { t: 'event' } },
  { id: 'gift-diamonds', name: 'Cadeau d’Auguste', desc: '5 diamants dans un petit coffret doré.', price: 60, reward: { t: 'diamonds', n: 5 } },
  { id: 'gift-mats', name: 'Coffret de l’atelier', desc: '10 fleurs, 10 tissus et 10 cacaos.', price: 40, reward: { t: 'mats', n: 10 } },
  { id: 'cloth-pearls', name: 'Collier de perles', desc: 'Un bijou exclusif pour Radia.', price: 150, reward: { t: 'cloth', id: 'ac-pearls' } },
  { id: 'cloth-tiara', name: 'Diadème de perles', desc: 'Le diadème des soirées de gala.', price: 500, reward: { t: 'cloth', id: 'cr-tiara' } },
  { id: 'cloth-redcarpet', name: 'Robe de tapis rouge', desc: 'Pour entrer au casino en reine.', price: 450, reward: { t: 'cloth', id: 'dr-redcarpet' } },
  { id: 'furn-fireplace', name: 'Cheminée du salon', desc: 'Une cheminée en marbre pour MON MONDE.', price: 250, reward: { t: 'furn', id: 'fireplace' } },
  { id: 'furn-pergola', name: 'Pergola fleurie', desc: 'Un coin de jardin romantique.', price: 300, reward: { t: 'furn', id: 'pergola' } },
  { id: 'furn-fountain', name: 'Fontaine du jardin', desc: 'Une fontaine pour MON MONDE.', price: 350, reward: { t: 'furn', id: 'fountain' } },
];
export const privilegeById = (id: string): Privilege | undefined => PRIVILEGES.find((p) => p.id === id);
/** Tous les objets promis existent-ils vraiment dans le monde ? (vérifié par test) */
export const rewardExists = (r: PrivReward): boolean => (r.t === 'cloth' ? r.id in CLOTHES : r.t === 'furn' ? r.id in FURNITURE : true);

export const EVENT_KEY = 'priv.soiree.day';
export const eventAvailable = (s: CasinoState, now: number = Date.now()): boolean => s.stats[EVENT_KEY] !== dayNum(now);

export const owned = (p: Privilege, w: World): boolean =>
  p.reward.t === 'cloth' ? w.wardrobe.owned.includes(p.reward.id as never) : p.reward.t === 'furn' ? (w.castle.owned[p.reward.id] ?? 0) > 0 : false;

export interface BuyEffects { giveDiamonds(n: number): void; giveCoins(n: number): void }
export type PrivBuy = { ok: true; spent: number; spins?: { bet: number; win: number }[] } | { ok: false; reason: 'unknown' | 'tickets' | 'owned' | 'today' };

/**
 * Achète un privilège avec des tickets EN POCHE (jamais de solde négatif). L'objet est donné une seule fois ;
 * un objet déjà possédé ou une soirée déjà faite aujourd'hui sont refusés SANS débiter.
 */
export function buyPrivilege(s: CasinoState, w: World, id: string, fx: BuyEffects & { rng: Rng }, now: number = Date.now()): PrivBuy {
  const p = privilegeById(id);
  if (!p) return { ok: false, reason: 'unknown' };
  if (s.chips < p.price) return { ok: false, reason: 'tickets' };
  if (owned(p, w)) return { ok: false, reason: 'owned' };
  if (p.reward.t === 'event' && !eventAvailable(s, now)) return { ok: false, reason: 'today' };
  s.chips -= p.price;
  s.stats['priv.spent'] = (s.stats['priv.spent'] ?? 0) + p.price;
  const r = p.reward;
  if (r.t === 'cloth') w.wardrobe.owned.push(r.id as never);
  else if (r.t === 'furn') w.castle.owned[r.id] = 1;
  else if (r.t === 'diamonds') fx.giveDiamonds(r.n);
  else if (r.t === 'mats') { w.res.flowers += r.n; w.res.fabric += r.n; w.res.cocoa += r.n; }
  else {
    s.stats[EVENT_KEY] = dayNum(now);
    // mise offerte : le portefeuille virtuel ne débite rien, les gains vont aux pièces (cadeau ≈ 3 × 100 pièces × retour théorique)
    const led = { balance: () => EVENT_STAKE, debit: () => true, credit: (n: number) => fx.giveCoins(n) };
    const spins: { bet: number; win: number }[] = [];
    for (let i = 0; i < EVENT_SPINS; i++) { const run = new SlotsRun(led, EVENT_STAKE, 1); const x = run.next(fx.rng); if (x) spins.push({ bet: x.bet, win: x.win }); }
    return { ok: true, spent: p.price, spins };
  }
  return { ok: true, spent: p.price };
}
