/**
 * Caisse d'échange d'Auguste : des PIÈCES du jeu contre des tickets du Casino Royal.
 * Strictement virtuel : aucun argent réel, aucun achat, aucun retour (les tickets ne se changent pas en pièces).
 * Taux et plafond dans les constantes ci-dessous ; le plafond évite qu'un joueur vide toute sa bourse d'un coup.
 */
import type { CasinoState } from '../save/fun';
import { earn, remainingToday } from './tickets';

/** 100 pièces = 10 tickets (à tester / ajuster : docs/BALANCING.md). */
export const EXCHANGE_COINS = 100;
export const EXCHANGE_TICKETS = 10;

export interface ExchangeView { rate: string; maxPacks: number; ticketsLeftToday: number }

/** Combien de lots (100 pièces → 10 tickets) sont possibles maintenant. */
export function exchangeView(coins: number, casino: CasinoState, now: number = Date.now()): ExchangeView {
  const left = remainingToday(casino, 'exchange', now);
  const byCap = Math.floor(left / EXCHANGE_TICKETS);
  const byCoins = Math.floor(Math.max(0, coins) / EXCHANGE_COINS);
  return { rate: `${EXCHANGE_COINS} pièces = ${EXCHANGE_TICKETS} tickets`, maxPacks: Math.max(0, Math.min(byCap, byCoins)), ticketsLeftToday: left === Infinity ? 0 : left };
}

/** Échange `packs` lots. `spend` retire les pièces (faux = refus, rien ne change). Renvoie les tickets reçus. */
export function exchange(packs: number, coins: number, casino: CasinoState, spend: (n: number) => boolean, now: number = Date.now()): number {
  const k = Math.min(Math.floor(packs), exchangeView(coins, casino, now).maxPacks);
  if (k <= 0) return 0;
  if (!spend(k * EXCHANGE_COINS)) return 0;
  return earn(casino, 'exchange', k * EXCHANGE_TICKETS, now);
}
