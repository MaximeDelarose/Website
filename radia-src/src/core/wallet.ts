/**
 * Portefeuille du jeu (énergie, diamants, sac, apparence) relié à la
 * sauvegarde et à l'interface. Aucune transaction réelle n'existe.
 */
import { save, events } from './app';
import * as E from '../game/economy/economy';
import type { ItemRef } from '../data/items';

const eco = () => save.data.economy;
const changed = () => { save.save(); events.emit('economy', undefined); };

export const wallet = {
  energy(): number { E.syncEnergy(eco(), Date.now()); return eco().energy; },
  diamonds: () => eco().diamonds,
  nextEnergyIn: () => E.nextEnergyIn(eco(), Date.now()),
  freeRefillIn: () => E.freeRefillIn(eco(), Date.now()),

  useEnergy(n = 1): boolean {
    const ok = E.spendEnergy(eco(), n, Date.now());
    if (ok) changed();
    return ok;
  },
  /** Donne de l'énergie SANS dépasser 100 ; renvoie le gain réel. */
  giveEnergy(n: number): number { if (n <= 0) return 0; const g = E.addEnergy(eco(), n, Date.now()); changed(); return g; },
  /** Réserve héritée (ancien surplus), utilisée seulement quand l'énergie tombe à 0. */
  reserve: () => eco().reserve ?? 0,
  energyFull: (): boolean => { E.syncEnergy(eco(), Date.now()); return eco().energy >= E.ENERGY_MAX; },
  takeFreeRefill(): boolean { const ok = E.takeFreeRefill(eco(), Date.now()); if (ok) changed(); return ok; },

  giveDiamonds(n: number): void { if (n > 0) { E.addDiamonds(eco(), n); changed(); } },
  spendDiamonds(n: number): boolean { const ok = E.spendDiamonds(eco(), n); if (ok) changed(); return ok; },

  bag: () => eco().bag as ItemRef[],
  bagSlots: () => eco().bagSlots,
  bagHasRoom: () => !E.bagFull(eco()),
  bagPut(r: ItemRef): boolean { const ok = E.bagPut(eco(), r); if (ok) changed(); return ok; },
  bagTake(i: number): ItemRef | null { const r = E.bagTake(eco(), i); if (r) changed(); return r; },

  skin: () => save.data.cosmetics.tiles,
  fxStyle: () => save.data.cosmetics.fx,
  notify: changed,
};

/** Formatage « 1 400 » à la française. */
export const fmt = (n: number) => Math.floor(n).toLocaleString('fr-FR').replace(/ /g, ' ');

export function fmtTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, '0')}` : `${s} s`;
}
