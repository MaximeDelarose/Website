/** Service du cadeau quotidien branché sur le jeu (sauvegarde, portefeuille). Pas de DOM. */
import { save, events } from '../core/app';
import { wallet } from '../core/wallet';
import { claim, isEligible, peek, todayKey, type Ticket } from './logic';
import { resolveDay, type Resolved } from './calendar';
import { applyResolved, ownershipOf } from './grant';

/** Décalage de jours (outils de test uniquement : `RADIA.daily.skipDay()`). */
let offset = 0;
export const dayOffset = (): number => offset;
export const setDayOffset = (n: number): void => { offset = n; notifyDaily(); };

export const dailyState = () => save.data.fun.daily;
export const currentKey = (): string => todayKey(new Date(), offset);
export const canClaimToday = (): boolean => isEligible(dailyState(), currentKey());

const listeners = new Set<() => void>();
export const onDailyChange = (fn: () => void): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function notifyDaily(): void { for (const f of [...listeners]) { try { f(); } catch { /* ignoré */ } } }

export interface Claimed { ticket: Ticket; parts: Resolved[] }

/** Aperçu de ce qui sera offert au prochain cadeau. */
export function previewNext(): Resolved[] {
  const { cycle, day } = peek(dailyState());
  return resolveDay(cycle, day, ownershipOf(save.data.world));
}

/** Réclame le cadeau du jour : marque d'abord (et écrit tout de suite), attribue ensuite. null si déjà fait. */
export function claimToday(): Claimed | null {
  const ticket = claim(dailyState(), currentKey());
  if (!ticket) return null;
  try { save.writeNow(); } catch { /* le jeu tourne même sans stockage */ }
  const w = save.data.world;
  const parts = resolveDay(ticket.cycle, ticket.day, ownershipOf(w));
  const { diamonds } = applyResolved(w, parts);
  if (diamonds > 0) wallet.giveDiamonds(diamonds);
  save.save();
  events.emit('economy', undefined);
  notifyDaily();
  return { ticket, parts };
}
