/**
 * Règles pures du jardin (aucun DOM, aucun import du jeu) : elles travaillent
 * sur un objet `World` et renvoient un résultat ; l'interface applique ensuite
 * les effets de bord (sauvegarde, cœurs, sons, statistiques).
 * Aucune pénalité : une fleur mûre attend aussi longtemps qu'il faut.
 */
import { FLOWER_IDS, type FlowerId, type ResKind } from '../../data/world/ids';
import type { GardenPlot, World } from '../../save/schema';
import {
  BOUQUET_MAX, BOUQUET_MIN, FLOWERS, FUSION_COST, MAX_PLOTS, nextFlower, plotPrice,
} from '../../data/world/garden';

export type Stage = 0 | 1 | 2 | 3;
export const STOCK_CAP = 999;

import { FUSION_CHAIN } from '../../data/world/garden';
/** Ordre d'affichage / de fusion (de la plus simple à la plus rare). */
export const FUSION_ORDER = FUSION_CHAIN;
export const isFlower = (id: string): id is FlowerId => (FLOWER_IDS as readonly string[]).includes(id);
const garden = (w: World) => w.garden;
const totalKey = (id: string) => `garden.total.${id}`;
/** Total de fleurs récoltées de tous temps pour une variété. */
export const totalHarvested = (w: World, id: string): number => w.extra[totalKey(id)] ?? 0;

const canPay = (w: World, cost: Partial<Record<ResKind, number>>) =>
  (Object.entries(cost) as [ResKind, number][]).every(([k, n]) => w.res[k] >= n);
const pay = (w: World, cost: Partial<Record<ResKind, number>>) => {
  for (const [k, n] of Object.entries(cost) as [ResKind, number][]) w.res[k] -= Math.floor(n);
};

// ------------------------------------------------------------------ croissance

/** Fraction de pousse (0..1) d'une parcelle à l'instant `now`. */
export function progress(p: GardenPlot | null, now: number): number {
  if (!p || !p.flower || !isFlower(p.flower)) return 0;
  const grow = FLOWERS[p.flower].growMs;
  return Math.min(1, Math.max(0, (now - p.plantedAt) / grow));
}

/** Stade d'après l'heure : 0 graine, 1 pousse, 2 bourgeon, 3 fleur épanouie. */
export function stageAt(p: GardenPlot | null, now: number): Stage {
  const f = progress(p, now);
  return f >= 1 ? 3 : f >= 0.66 ? 2 : f >= 0.33 ? 1 : 0;
}

export const isReady = (p: GardenPlot | null, now: number): boolean => !!p && !!p.flower && isFlower(p.flower) && progress(p, now) >= 1;

/** Millisecondes restantes avant la floraison (0 si prête ou vide). */
export function remainingMs(p: GardenPlot | null, now: number): number {
  if (!p || !p.flower || !isFlower(p.flower)) return 0;
  return Math.max(0, FLOWERS[p.flower].growMs - Math.max(0, now - p.plantedAt));
}

/**
 * Rattrapage hors ligne : recalcule le stade de chaque parcelle d'après
 * `plantedAt` (l'horloge peut avoir été reculée : on ne bloque jamais une
 * fleur plus d'une minute) et nettoie les données inconnues.
 */
export function syncGarden(w: World, now: number): void {
  const g = garden(w);
  g.plots = g.plots.map((p) => {
    if (!p || !p.flower || !isFlower(p.flower)) return null;
    const plantedAt = p.plantedAt > now + 60_000 ? now : p.plantedAt;
    const np: GardenPlot = { flower: p.flower, plantedAt, stage: 0 };
    np.stage = stageAt(np, now);
    return np;
  });
  while (g.plots.length < g.plotCount) g.plots.push(null);
}

// ------------------------------------------------------------------ variétés

export function isUnlocked(w: World, id: FlowerId): boolean { return garden(w).unlocked.includes(id); }

/** Une variété se débloque gratuitement après 3 récoltes de la précédente… */
export function canAutoUnlock(w: World, id: FlowerId): boolean {
  const u = FLOWERS[id].unlockHarvest;
  return !!u && totalHarvested(w, u.from) >= u.n;
}

export function unlockWithCoins(w: World, id: FlowerId): { ok: boolean; reason?: string } {
  if (isUnlocked(w, id)) return { ok: false, reason: 'Déjà débloquée' };
  const price = FLOWERS[id].unlockCoins;
  if (w.res.coins < price) return { ok: false, reason: 'Pas assez de pièces' };
  w.res.coins -= price;
  garden(w).unlocked.push(id);
  return { ok: true };
}

function unlockIfEarned(w: World): FlowerId[] {
  const out: FlowerId[] = [];
  for (const id of FLOWER_IDS) if (!isUnlocked(w, id) && canAutoUnlock(w, id)) { garden(w).unlocked.push(id); out.push(id); }
  return out;
}

// ------------------------------------------------------------------ plantation / récolte

export function plant(w: World, index: number, id: FlowerId, now: number): { ok: boolean; reason?: string } {
  const g = garden(w);
  if (index < 0 || index >= g.plotCount || index >= g.plots.length) return { ok: false, reason: 'Parcelle inconnue' };
  if (g.plots[index]) return { ok: false, reason: 'Parcelle occupée' };
  if (!isFlower(id) || !isUnlocked(w, id)) return { ok: false, reason: 'Variété verrouillée' };
  const cost = FLOWERS[id].cost;
  if (!canPay(w, cost)) return { ok: false, reason: 'Pas assez de ressources' };
  pay(w, cost);
  g.plots[index] = { flower: id, plantedAt: now, stage: 0 };
  return { ok: true };
}

/** Prix en diamants pour accélérer (1 à 3 selon le temps restant). */
export function speedupCost(p: GardenPlot | null, now: number): number {
  const r = remainingMs(p, now);
  if (r <= 0) return 0;
  return r <= 40_000 ? 1 : r <= 80_000 ? 2 : 3;
}

/** Accélère une pousse : `spend(n)` débite les diamants (faux si insuffisant). */
export function speedup(w: World, index: number, now: number, spend: (n: number) => boolean): { ok: boolean; cost: number; reason?: string } {
  const p = garden(w).plots[index];
  const cost = speedupCost(p, now);
  if (!p || !p.flower || cost === 0) return { ok: false, cost: 0, reason: 'Rien à accélérer' };
  if (!spend(cost)) return { ok: false, cost, reason: 'Pas assez de diamants' };
  p.plantedAt = now - FLOWERS[p.flower as FlowerId].growMs;
  p.stage = 3;
  return { ok: true, cost };
}

export interface HarvestResult { ok: boolean; id?: FlowerId; flowers?: number; unlocked?: FlowerId[]; reason?: string }

export function harvest(w: World, index: number, now: number): HarvestResult {
  const g = garden(w);
  const p = g.plots[index];
  if (!p || !p.flower || !isFlower(p.flower)) return { ok: false, reason: 'Parcelle vide' };
  if (!isReady(p, now)) return { ok: false, reason: 'Pas encore épanouie' };
  const id = p.flower;
  g.plots[index] = null;
  g.harvested[id] = Math.min(STOCK_CAP, (g.harvested[id] ?? 0) + 1);
  w.extra[totalKey(id)] = totalHarvested(w, id) + 1;
  const flowers = FLOWERS[id].yieldFlowers;
  w.res.flowers = Math.min(999_999_999, w.res.flowers + flowers);
  return { ok: true, id, flowers, unlocked: unlockIfEarned(w) };
}

// ------------------------------------------------------------------ parcelles

export const canBuyPlot = (w: World): boolean => garden(w).plotCount < MAX_PLOTS;
export const nextPlotPrice = (w: World): number => plotPrice(garden(w).plotCount);

export function buyPlot(w: World): { ok: boolean; reason?: string } {
  const g = garden(w);
  if (g.plotCount >= MAX_PLOTS) return { ok: false, reason: 'Jardin complet' };
  const price = plotPrice(g.plotCount);
  if (w.res.coins < price) return { ok: false, reason: 'Pas assez de pièces' };
  w.res.coins -= price;
  g.plotCount++;
  g.plots.push(null);
  return { ok: true };
}

// ------------------------------------------------------------------ fusion

export const stock = (w: World, id: string): number => garden(w).harvested[id] ?? 0;
export const canFuse = (w: World, id: string): boolean => nextFlower(id) !== null && stock(w, id) >= FUSION_COST;

/** 3 fleurs récoltées identiques → 1 fleur de la variété supérieure. */
export function fuse(w: World, id: string): { ok: boolean; to?: FlowerId; reason?: string } {
  const to = nextFlower(id);
  if (!to) return { ok: false, reason: 'Variété suprême : rien au-dessus' };
  if (stock(w, id) < FUSION_COST) return { ok: false, reason: `Il faut ${FUSION_COST} fleurs identiques` };
  const g = garden(w);
  g.harvested[id] -= FUSION_COST;
  g.harvested[to] = Math.min(STOCK_CAP, (g.harvested[to] ?? 0) + 1);
  if (!isUnlocked(w, to)) g.unlocked.push(to);
  return { ok: true, to };
}

// ------------------------------------------------------------------ bouquets

/** Clé canonique d'une composition : identifiants triés, séparés par « + ». */
export const bouquetKey = (ids: string[]): string => [...ids].sort().join('+');
export const keyToIds = (key: string): FlowerId[] => key.split('+').filter(isFlower);

export interface BouquetValue { coins: number; hearts: number; distinct: number }

/** Valeur selon la diversité : +25 % par variété différente supplémentaire. */
export function bouquetValue(ids: string[]): BouquetValue {
  const fl = ids.filter(isFlower);
  const distinct = new Set(fl).size;
  const base = fl.reduce((s, id) => s + FLOWERS[id].value, 0);
  const coins = Math.round(base * (1 + 0.25 * Math.max(0, distinct - 1)));
  const hearts = Math.max(1, distinct + (fl.length >= 5 ? 1 : 0));
  return { coins, hearts, distinct };
}

export function checkBouquet(w: World, ids: string[]): { ok: boolean; reason?: string } {
  if (ids.length < BOUQUET_MIN) return { ok: false, reason: `Au moins ${BOUQUET_MIN} fleurs` };
  if (ids.length > BOUQUET_MAX) return { ok: false, reason: `${BOUQUET_MAX} fleurs au maximum` };
  if (!ids.every(isFlower)) return { ok: false, reason: 'Fleur inconnue' };
  const need: Record<string, number> = {};
  for (const id of ids) need[id] = (need[id] ?? 0) + 1;
  for (const [id, n] of Object.entries(need)) if (stock(w, id) < n) return { ok: false, reason: 'Pas assez de fleurs récoltées' };
  return { ok: true };
}

export function makeBouquet(w: World, ids: string[]): { ok: boolean; key?: string; reason?: string; first?: boolean } {
  const c = checkBouquet(w, ids);
  if (!c.ok) return c;
  const g = garden(w);
  for (const id of ids) g.harvested[id] -= 1;
  const key = bouquetKey(ids);
  const first = Object.values(g.bouquets).every((n) => n === 0) && (w.extra['garden.bouquetsMade'] ?? 0) === 0;
  g.bouquets[key] = (g.bouquets[key] ?? 0) + 1;
  w.extra['garden.bouquetsMade'] = (w.extra['garden.bouquetsMade'] ?? 0) + 1;
  return { ok: true, key, first };
}

export const bouquetCount = (w: World): number => Object.values(garden(w).bouquets).reduce((a, b) => a + b, 0);

export interface BouquetReward { coins: number; hearts: number }

/** Vendre = plus de pièces ; offrir = plus de cœurs. */
export function giveBouquet(w: World, key: string, mode: 'sell' | 'gift'): { ok: boolean; reward?: BouquetReward; reason?: string } {
  const g = garden(w);
  if ((g.bouquets[key] ?? 0) <= 0) return { ok: false, reason: 'Pas de bouquet' };
  const v = bouquetValue(keyToIds(key));
  g.bouquets[key] -= 1;
  if (g.bouquets[key] <= 0) delete g.bouquets[key];
  const reward: BouquetReward = mode === 'sell' ? { coins: v.coins, hearts: 1 } : { coins: Math.round(v.coins * 0.4), hearts: v.hearts * 2 };
  w.res.coins = Math.min(999_999_999, w.res.coins + reward.coins);
  return { ok: true, reward };
}
