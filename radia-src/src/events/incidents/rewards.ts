/**
 * Récompenses concrètes des incidents (colis, fleur rare, nouvelle boutique) — pures : elles lisent/modifient un
 * objet `World` passé en paramètre, en s'appuyant sur les registres réels du monde (vêtements, meubles, jardin).
 */
import type { World } from '../../save/schema';
import { CLOTHES } from '../../data/world/wardrobe';
import { FURNITURE } from '../../data/world/furniture';
import { FLOWER_IDS, FLOWER_NAMES, type FlowerId } from '../../data/world/ids';
import { rng, rint, shuffle } from './rng';

export type Reward =
  | { kind: 'coins'; coins: number; label: string }
  | { kind: 'cloth'; id: string; label: string }
  | { kind: 'decor'; id: string; label: string };

const clothName = (id: string): string => (CLOTHES as Record<string, { name: string }>)[id]?.name ?? id;
const buyable = (id: string): boolean => { const c = (CLOTHES as Record<string, { coins: number; gift?: boolean; free?: boolean; starter?: boolean; slot: string }>)[id]; return !!c && c.coins >= 40 && c.coins <= 260 && !c.gift && !c.free && !c.starter && c.slot !== 'crown'; };
export const missingClothes = (w: World): string[] => Object.keys(CLOTHES).filter((id) => buyable(id) && !w.wardrobe.owned.includes(id));
export const missingDecor = (w: World): string[] => Object.values(FURNITURE).filter((f) => f.price > 0 && f.price <= 220 && (w.castle.owned[f.id] ?? 0) === 0).map((f) => f.id);

/** Colis surprise : vêtement, pièces ou décoration (selon la graine, parmi ce qui manque). */
export function rollParcel(seed: number, w: World): Reward {
  const r = rng(seed);
  const roll = r();
  const cl = missingClothes(w), dc = missingDecor(w);
  if (roll < 0.34 && cl.length) { const id = cl[rint(r, cl.length)]; return { kind: 'cloth', id, label: clothName(id) }; }
  if (roll < 0.67 && dc.length) { const id = dc[rint(r, dc.length)]; return { kind: 'decor', id, label: FURNITURE[id as keyof typeof FURNITURE].name }; }
  const coins = 90 + rint(r, 8) * 15;
  return { kind: 'coins', coins, label: `${coins} pièces` };
}
export function applyReward(w: World, rw: Reward): void {
  if (rw.kind === 'coins') w.res.coins = Math.min(999_999_999, w.res.coins + rw.coins);
  else if (rw.kind === 'cloth') { if (!w.wardrobe.owned.includes(rw.id)) w.wardrobe.owned.push(rw.id); }
  else w.castle.owned[rw.id] = (w.castle.owned[rw.id] ?? 0) + 1;
}

/** Lot d'ouverture de la nouvelle boutique : 3 tenues/accessoires + 1 décoration (réels, jamais déjà possédés). */
export function shopLot(seed: number, w: World): Reward[] {
  const r = rng(seed ^ 0x5bd1e995);
  const cl = shuffle(missingClothes(w), r);
  const pick: Reward[] = [];
  const slots = new Set<string>();
  for (const id of cl) {
    const slot = (CLOTHES as Record<string, { slot: string }>)[id].slot;
    if (slots.has(slot) && cl.length > 6) continue;
    slots.add(slot);
    pick.push({ kind: 'cloth', id, label: clothName(id) });
    if (pick.length >= 3) break;
  }
  const dc = shuffle(missingDecor(w), r);
  if (dc.length) pick.push({ kind: 'decor', id: dc[0], label: FURNITURE[dc[0] as keyof typeof FURNITURE].name });
  if (!pick.length) pick.push({ kind: 'coins', coins: 200, label: '200 pièces' });
  return pick;
}

/** Fleur rare : une variété pas encore débloquée ; sinon null (alors on offre des fleurs). */
export function rollRareFlower(seed: number, w: World): FlowerId | null {
  const locked = FLOWER_IDS.filter((id) => !w.garden.unlocked.includes(id));
  if (!locked.length) return null;
  return locked[rint(rng(seed), locked.length)];
}
export function applyRareFlower(w: World, id: FlowerId | null): string {
  if (!id) { w.res.flowers = Math.min(999_999_999, w.res.flowers + 12); return '12 fleurs pour tes bouquets'; }
  if (!w.garden.unlocked.includes(id)) w.garden.unlocked.push(id);
  w.garden.harvested[id] = (w.garden.harvested[id] ?? 0) + 3;
  w.extra[`garden.total.${id}`] = (w.extra[`garden.total.${id}`] ?? 0) + 3;
  return `${FLOWER_NAMES[id]} — 3 fleurs récoltées`;
}
