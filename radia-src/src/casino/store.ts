/** Liaison du portefeuille du casino avec la sauvegarde (`save.data.fun.casino`). Pas de DOM. */
import { save } from '../core/app';
import type { CasinoState } from '../save/fun';
import * as C from './chips';
import { claimableCount } from './missions';
import { claimableTasks, earn, sourceOf, type TicketSource } from './tickets';
import type { Rng } from './rng';

import { usePurse } from './bank';
/** Le casino mise les pièces du monde : un seul portefeuille pour tout RADIA. */
usePurse({ get: () => save.data.world.res.coins, set: (n) => { save.data.world.res.coins = n; } });

export const cs = (): CasinoState => save.data.fun.casino;
export const persist = (): void => { try { save.save(); } catch { /* jamais bloquant */ } };

const listeners = new Set<() => void>();
export const onCasinoChange = (fn: () => void): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function notifyCasino(): void { for (const f of [...listeners]) { try { f(); } catch { /* ignoré */ } } }

/**
 * Donne des TICKETS gratuits (missions, événements, récompenses quotidiennes…). `reason` = source (`TicketSource`) ou
 * libellé libre ; les sources « ouvertes » sont plafonnées par jour (tickets.ts). Renvoie le nombre versé.
 */
export function grantChips(n: number, reason: TicketSource | string = ''): number {
  const g = earn(cs(), sourceOf(reason), n);
  if (g > 0) { persist(); notifyCasino(); }
  return g;
}

export interface CasinoStatus {
  /** Tickets possédés au total (poche + table). */
  chips: number; pocket: number; table: number;
  /** Missions et mini-défis du jour prêts à être réclamés. */
  tasks: number;
  /** Missions prêtes à être réclamées. */
  claimable: number;
  /** Mini-recharge gratuite disponible maintenant. */
  refillReady: boolean;
  /** Première visite : l'allocation d'ouverture attend. */
  isNew: boolean;
  /** Il y a quelque chose de nouveau à voir (badge). */
  hasNews: boolean;
}

export function casinoStatus(now = Date.now()): CasinoStatus {
  const s = cs();
  const claimable = claimableCount(s);
  const tasks = claimableTasks(s, now);
  const refillOk = C.refillReady(s, now);
  return { chips: C.total(s), pocket: s.chips, table: s.bring, claimable, tasks, refillReady: refillOk, isNew: !s.welcomed, hasNews: !s.welcomed || claimable > 0 || tasks > 0 || refillOk };
}

/** Outils de test (mode debug uniquement : branchés seulement quand `?debug` est présent). */
export const hooks: { rng: Rng | null; roulette: number | null; deckSeed: number | null } = { rng: null, roulette: null, deckSeed: null };
