/** Gestion du plateau plein : valeur de revente, protections, taux d'occupation. Pur (aucun DOM). */
import type { ItemRef } from '../../data/items';
import type { RunState } from '../merge/types';
import { collMax } from '../../data/items';

/** Au-delà de ce taux d'occupation, un petit conseil discret apparaît (jamais pendant une fusion). */
export const FULL_HINT_RATIO = 0.8;
/** Niveau à partir duquel un objet est « précieux » : double confirmation avant de le vendre. */
export const PRECIOUS_FROM = 6;

/** Cases utilisables = pas verrouillées ; occupées = objet ou cadeau. */
export function occupancy(s: Pick<RunState, 'cells'>): { used: number; usable: number; ratio: number } {
  let used = 0, usable = 0;
  for (const c of s.cells) { if (c.lock) continue; usable++; if (c.item || c.gift) used++; }
  return { used, usable, ratio: usable ? used / usable : 0 };
}

/** Générateurs et objets spéciaux ne se vendent jamais ; les objets d'une commande en cours sont signalés par l'appelant. */
export const sellable = (r: ItemRef): boolean => r.c !== 'gen' && r.c !== 'special';
export const isPrecious = (r: ItemRef): boolean => r.l >= PRECIOUS_FROM || r.l >= collMax(r.c);
/** Petit prix de revente (pièces) : volontairement bas pour ne pas devenir une source de revenus. */
export const saleValue = (r: ItemRef): number => (sellable(r) ? Math.max(1, Math.floor(r.l / 2)) : 0);
