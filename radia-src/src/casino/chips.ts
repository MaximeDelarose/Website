/**
 * Portefeuille de TICKETS FICTIFS et gratuits du Casino Royal (logique pure sur `CasinoState`).
 *  - `chips` : en poche ; `bring` : sur la table (choisi sur la carte d'Auguste) — seul `bring` est misé.
 *  - Jamais de solde négatif : toute mise est validée AVANT la manche.
 *  - Mini-recharge gratuite quand le total est presque vide (toutes les ~3 min), toujours disponible.
 */
import type { CasinoState } from '../save/fun';

export const WELCOME_CHIPS = 500;
export const REFILL_MS = 3 * 60 * 1000;
/** En dessous de ce total (poche + table), la mini-recharge est proposée. */
export const REFILL_BELOW = 10;
/** Solde de base atteint par la mini-recharge. */
export const REFILL_TO = 100;
export const CHIP_CAP = 999_999_999;

export type Game = 'roulette' | 'slots' | 'blackjack';
export const LIMITS: Record<Game, { min: number; max: number; step: number }> = {
  roulette: { min: 10, max: 1_000_000, step: 10 },
  slots: { min: 10, max: 1_000_000, step: 10 },
  blackjack: { min: 10, max: 1_000_000, step: 10 },
};
export const GAME_NAMES: Record<Game, string> = { roulette: 'Roulette', slots: 'Machine à sous', blackjack: 'Blackjack' };

const int = (n: number): number => (Number.isFinite(n) ? Math.floor(n) : 0);

export const total = (s: CasinoState): number => s.chips + s.bring;

/** Allocation gratuite d'ouverture (une seule fois). Renvoie le montant versé. */
export function welcome(s: CasinoState): number {
  if (s.welcomed) return 0;
  s.welcomed = true;
  s.chips = Math.min(CHIP_CAP, s.chips + WELCOME_CHIPS);
  return WELCOME_CHIPS;
}

/** Ajoute des tickets gratuits en poche (missions, événements, cadeaux). */
export function grant(s: CasinoState, n: number): number {
  const k = Math.max(0, int(n));
  if (k <= 0) return 0;
  const before = s.chips;
  s.chips = Math.min(CHIP_CAP, s.chips + k);
  return s.chips - before;
}

/** Millisecondes avant la prochaine mini-recharge (0 = prête). Infinity si le solde est suffisant. */
export function refillIn(s: CasinoState, now: number): number {
  if (total(s) >= REFILL_BELOW) return Infinity;
  return s.refillTs > 0 ? Math.max(0, s.refillTs + REFILL_MS - now) : 0;
}
export const refillReady = (s: CasinoState, now: number): boolean => refillIn(s, now) === 0;

/** Mini-recharge gratuite : remonte le total au solde de base. Renvoie les tickets versés (0 si pas prête). */
export function refill(s: CasinoState, now: number): number {
  if (!refillReady(s, now)) return 0;
  const add = Math.max(0, REFILL_TO - total(s));
  s.chips += add;
  s.refillTs = now;
  return add;
}

/** Carte d'Auguste : fixe le montant sur la table (le reste revient en poche). Renvoie le montant retenu. */
export function setBring(s: CasinoState, n: number): number {
  const pool = total(s);
  const k = Math.min(pool, Math.max(0, int(n)));
  s.chips = pool - k;
  s.bring = k;
  return k;
}

/** En sortant : tout ce qui est sur la table revient en poche. */
export function returnBring(s: CasinoState): number {
  const k = s.bring;
  s.chips = Math.min(CHIP_CAP, s.chips + k);
  s.bring = 0;
  return k;
}

/** Valide une mise pour un jeu : entier, dans les bornes, et couverte par le solde de la table. */
export function canBet(s: CasinoState, game: Game, amount: number): boolean {
  const l = LIMITS[game];
  return Number.isInteger(amount) && amount >= l.min && amount <= l.max && amount <= s.bring;
}

/** Débite la table (tout ou rien). Faux si le solde ne suffit pas : rien ne change. */
export function debit(s: CasinoState, n: number): boolean {
  if (!Number.isInteger(n) || n <= 0 || n > s.bring) return false;
  s.bring -= n;
  return true;
}

/** Crédite la table (gain). */
export function credit(s: CasinoState, n: number): void {
  const k = Math.max(0, int(n));
  s.bring = Math.min(CHIP_CAP, s.bring + k);
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
