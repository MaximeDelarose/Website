/**
 * Règles communes des jeux du Casino Royal (logique pure sur `CasinoState`) : limites de mise, noms, statistiques.
 * Les jeux se jouent avec les PIÈCES de RADIA (portefeuille unique, voir `bank.ts`) : plus de jetons ni de tickets à part.
 */
import type { CasinoState } from '../save/fun';

/** Cadeau d'ouverture (une seule fois, première visite) : de quoi essayer sans toucher à ses économies. */
export const WELCOME_COINS = 300;

export type Game = 'roulette' | 'slots' | 'blackjack';
export const LIMITS: Record<Game, { min: number; max: number; step: number }> = {
  roulette: { min: 10, max: 1_000_000, step: 10 },
  slots: { min: 10, max: 1_000_000, step: 10 },
  blackjack: { min: 10, max: 1_000_000, step: 10 },
};
export const GAME_NAMES: Record<Game, string> = { roulette: 'Roulette', slots: 'Machine à sous', blackjack: 'Blackjack' };

const int = (n: number): number => (Number.isFinite(n) ? Math.floor(n) : 0);

/** Cadeau d'ouverture : marque d'abord (jamais deux fois) puis renvoie les pièces à verser (0 si déjà reçu). */
export function welcome(s: CasinoState): number {
  if (s.welcomed) return 0;
  s.welcomed = true;
  return WELCOME_COINS;
}

/** Statistiques + historique (plafonné à 60) d'une manche terminée. `bet` = mise totale, `win` = total rendu. */
export function recordRound(s: CasinoState, game: Game, bet: number, win: number, now: number, extra: string[] = []): void {
  const st = s.stats;
  const add = (k: string, n: number) => { st[k] = (st[k] ?? 0) + n; };
  add(`${game}.parties`, 1);
  add('total.parties', 1);
  add(`${game}.mises`, bet);
  add(`${game}.gains`, win);
  if (win > bet) { add(`${game}.victoires`, 1); add('total.victoires', 1); }
  st[`${game}.meilleur`] = Math.max(st[`${game}.meilleur`] ?? 0, win - bet);
  for (const k of extra) add(k, 1);
  s.history.push({ g: game, bet: int(bet), win: int(win), at: now });
  if (s.history.length > 60) s.history.splice(0, s.history.length - 60);
}
