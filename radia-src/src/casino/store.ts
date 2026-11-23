/** Liaison du casino avec la sauvegarde (`save.data.fun.casino`) et avec le portefeuille de PIÈCES unique du jeu. Pas de DOM. */
import { save } from '../core/app';
import { addRes } from '../core/world';
import type { CasinoState } from '../save/fun';
import { claimableCount } from './missions';
import { allow, claimableTasks, sourceOf, type CoinSource } from './rewards';
import type { Rng } from './rng';

import { balance, usePurse } from './bank';
/** Le casino mise les pièces du monde : un seul portefeuille pour tout RADIA. */
usePurse({ get: () => save.data.world.res.coins, set: (n) => { save.data.world.res.coins = n; } });

export const cs = (): CasinoState => save.data.fun.casino;
export const persist = (): void => { try { save.save(); } catch { /* jamais bloquant */ } };

const listeners = new Set<() => void>();
export const onCasinoChange = (fn: () => void): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function notifyCasino(): void { for (const f of [...listeners]) { try { f(); } catch { /* ignoré */ } } }

/**
 * Donne des PIÈCES gratuites (mini-défis, événements, récompenses…). `reason` = source (`CoinSource`) ou libellé libre ;
 * les sources « ouvertes » sont plafonnées par jour (rewards.ts). Renvoie le nombre de pièces versées.
 */
export function grantCoins(n: number, reason: CoinSource | string = ''): number {
  const g = allow(cs(), sourceOf(reason), n);
  if (g > 0) { addRes('coins', g); persist(); notifyCasino(); }
  return g;
}

export interface CasinoStatus {
  /** Pièces possédées (le portefeuille de tout le jeu). */
  coins: number;
  /** Missions et mini-défis du jour prêts à être réclamés. */
  tasks: number;
  /** Missions prêtes à être réclamées. */
  claimable: number;
  /** Première visite : le cadeau d'ouverture attend. */
  isNew: boolean;
  /** Il y a quelque chose de nouveau à voir (badge). */
  hasNews: boolean;
}

export function casinoStatus(now = Date.now()): CasinoStatus {
  const s = cs();
  const claimable = claimableCount(s);
  const tasks = claimableTasks(s, now);
  return { coins: balance(), tasks, claimable, isNew: !s.welcomed, hasNews: !s.welcomed || claimable > 0 || tasks > 0 };
}

/** Outils de test (mode debug uniquement : branchés seulement quand `?debug` est présent). */
export const hooks: { rng: Rng | null; roulette: number | null; deckSeed: number | null } = { rng: null, roulette: null, deckSeed: null };
