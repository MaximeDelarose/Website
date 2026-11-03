/**
 * API commune du « château de Radia » (ressources, fans, aides).
 * Tout passe par ici pour que les achats, récompenses et notifications
 * restent cohérents (et que l'interface se mette à jour via l'événement
 * 'economy').
 */
import { save, events } from './app';
import { fansTier, RES_NAMES, type ResKind } from '../data/world/ids';
import type { World } from '../save/schema';

export const world = (): World => save.data.world;
const changed = () => { save.save(); events.emit('economy', undefined); };

export const res = (k: ResKind): number => world().res[k];

export function addRes(k: ResKind, n: number): void {
  if (!(n > 0)) return;
  world().res[k] = Math.min(999_999_999, world().res[k] + Math.floor(n));
  changed();
}

/** Dépense `n` d'une ressource ; faux (et rien ne change) s'il n'y en a pas assez. */
export function spendRes(k: ResKind, n: number): boolean {
  if (n < 0 || world().res[k] < n) return false;
  world().res[k] -= Math.floor(n);
  changed();
  return true;
}

/** Plusieurs ressources d'un coup (tout ou rien). */
export function spendMany(cost: Partial<Record<ResKind, number>>): boolean {
  for (const [k, n] of Object.entries(cost) as [ResKind, number][]) if (world().res[k] < n) return false;
  for (const [k, n] of Object.entries(cost) as [ResKind, number][]) world().res[k] -= Math.floor(n);
  changed();
  return true;
}

export const canAfford = (cost: Partial<Record<ResKind, number>>): boolean =>
  (Object.entries(cost) as [ResKind, number][]).every(([k, n]) => world().res[k] >= n);

export const costLabel = (cost: Partial<Record<ResKind, number>>): string =>
  (Object.entries(cost) as [ResKind, number][]).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${RES_NAMES[k].toLowerCase()}`).join(' + ');

// ------------------------------------------------------------------ fans

export { fansTier };

/**
 * Ajoute des fans (popularité FICTIVE du jeu). Renvoie les paliers franchis
 * (pour déclencher animation, récompense et réaction d'Auguste).
 */
export function addFans(n: number): { total: number; newTiers: number[] } {
  const w = world();
  const before = fansTier(w.fans);
  w.fans = Math.min(999_999_999, w.fans + Math.max(0, Math.floor(n)));
  const after = fansTier(w.fans);
  const newTiers: number[] = [];
  for (let t = before + 1; t <= after; t++) newTiers.push(t);
  changed();
  return { total: w.fans, newTiers };
}

/** Débloque un flag une seule fois (renvoie vrai la première fois). */
export function firstTime(flag: string): boolean {
  const f = world().flags;
  if (f[flag]) return false;
  f[flag] = true;
  save.save();
  return true;
}

export function bump(key: string, n = 1): number {
  const e = world().extra;
  e[key] = (e[key] ?? 0) + n;
  save.save();
  return e[key];
}
