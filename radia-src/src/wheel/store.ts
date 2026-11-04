/** Roue du jour reliée au jeu : sauvegarde (`fun.wheel`), vraies APIs de récompense. Pas de DOM. */
import { save, events } from '../core/app';
import { wallet } from '../core/wallet';
import { addRes } from '../core/world';
import { cs, grantChips } from '../casino/store';
import { markTask } from '../casino/tickets';
import { defaultRng, type Rng } from '../casino/rng';
import type { WheelState } from '../save/fun';
import { applyLot, canSpin, claimSpin, dayKey, msUntilNextDay, type Granted, type WheelCtx } from './logic';
import type { LotDef } from './table';

/** Décalage de jours (outils de test uniquement). */
let offset = 0;
export const setDayOffset = (n: number): void => { offset = n; };
export const dayOffset = (): number => offset;
/** Lot imposé au prochain tirage (outil de test uniquement : n'est posé que par l'API `?debug`). */
export const force: { id: string | null } = { id: null };

export const wheelState = (): WheelState => save.data.fun.wheel;
const toDate = (now?: Date | number): Date => (now instanceof Date ? now : typeof now === 'number' ? new Date(now) : new Date());
export const currentKey = (now?: Date | number): string => dayKey(toDate(now), offset);

/** Le tirage gratuit du jour est-il disponible ? */
export const wheelReady = (now?: Date | number): boolean => canSpin(wheelState(), currentKey(now));
/** Millisecondes avant le prochain tirage (0 s'il est disponible). */
export const nextWheelIn = (now?: Date | number): number => (wheelReady(now) ? 0 : msUntilNextDay(toDate(now)));

/** Les vraies récompenses du jeu. */
export function realCtx(): WheelCtx {
  const w = () => save.data.world;
  return {
    addCoins: (n) => addRes('coins', n),
    giveDiamonds: (n) => wallet.giveDiamonds(n),
    giveEnergy: (n) => wallet.giveEnergy(n),
    grantChips: (n) => { grantChips(n, 'wheel'); },
    ownsCloth: (id) => w().wardrobe.owned.includes(id as never),
    giveCloth: (id) => { if (!w().wardrobe.owned.includes(id as never)) w().wardrobe.owned.push(id as never); },
    ownsDeco: (id) => (w().castle.owned[id] ?? 0) > 0,
    giveDeco: (id) => { w().castle.owned[id] = (w().castle.owned[id] ?? 0) + 1; },
    addFragment: (k, n) => { const f = save.data.fun.endless2.fragments; f[k] = (f[k] ?? 0) + n; },
  };
}

export interface SpinOutcome { lot: LotDef; granted: Granted }

/**
 * Tirage du jour : le jour est marqué ET écrit AVANT toute attribution (jamais deux fois, même en rechargeant),
 * puis le lot (tiré avant l'animation) est versé. null si déjà fait aujourd'hui.
 */
export function spinToday(rng: Rng = defaultRng, ctx: WheelCtx = realCtx()): SpinOutcome | null {
  const lot = claimSpin(wheelState(), currentKey(), rng, force.id ?? undefined);
  force.id = null;
  if (!lot) return null;
  try { markTask(cs(), 'wheel'); } catch { /* mini-défi du casino : jamais bloquant */ }
  try { save.writeNow(); } catch { /* le jeu tourne même sans stockage */ }
  const granted = applyLot(lot, ctx, rng);
  save.save();
  events.emit('economy', undefined);
  return { lot, granted };
}
