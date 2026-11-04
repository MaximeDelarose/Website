/** Attribution des lots du jour dans un `World` (logique pure : les diamants sortent du World et sont renvoyés). */
import type { World } from '../save/schema';
import type { ClothId } from '../data/world/ids';
import type { Ownership, Resolved } from './calendar';

const CAP = 999_999_999;

export const ownershipOf = (w: World): Ownership => ({
  cloth: (id: ClothId) => w.wardrobe.owned.includes(id),
  furn: (id) => w.castle.owned[id] ?? 0,
});

/** Verse les lots dans l'inventaire respectif (garde-robe, meubles possédés, bouquets, ressources). Renvoie les diamants à créditer. */
export function applyResolved(w: World, parts: readonly Resolved[]): { diamonds: number } {
  let diamonds = 0;
  const add = (k: 'coins' | 'fabric' | 'flowers' | 'cocoa', n: number) => { if (n > 0) w.res[k] = Math.min(CAP, w.res[k] + Math.floor(n)); };
  for (const p of parts) {
    switch (p.t) {
      case 'coins': case 'dup': add('coins', p.n); break;
      case 'res': add(p.k, p.n); break;
      case 'diamonds': diamonds += Math.max(0, Math.floor(p.n)); break;
      case 'cloth': if (!w.wardrobe.owned.includes(p.id)) w.wardrobe.owned.push(p.id); break;
      case 'furn': w.castle.owned[p.id] = (w.castle.owned[p.id] ?? 0) + 1; break;
      case 'bouquet': w.garden.bouquets[p.key] = (w.garden.bouquets[p.key] ?? 0) + 1; break;
    }
  }
  return { diamonds };
}
