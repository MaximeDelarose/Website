/**
 * Règles pures de la chocolaterie : recettes, qualité du mini-jeu, fabrication,
 * coffrets, amélioration de la boutique. Aucun DOM.
 */
import { CHOC_IDS, type ChocId, type ResKind } from '../../data/world/ids';
import type { World } from '../../save/schema';
import { BOX_SIZE, CHOCS, MAX_SHOP_LEVEL, SHOP_UPGRADE, STAR_QTY, STAR_VALUE } from '../../data/world/chocolate';

export const isChoc = (id: string): id is ChocId => (CHOC_IDS as readonly string[]).includes(id);
const stockKey = (id: string) => `choc.stock.${id}`;
export const stock = (w: World, id: string): number => w.extra[stockKey(id)] ?? 0;
export const totalStock = (w: World): number => CHOC_IDS.reduce((s, id) => s + stock(w, id), 0);

const canPay = (w: World, cost: Partial<Record<ResKind, number>>) =>
  (Object.entries(cost) as [ResKind, number][]).every(([k, n]) => w.res[k] >= n);

// ------------------------------------------------------------------ recettes

export const hasRecipe = (w: World, id: string): boolean => w.choc.recipes.includes(id);

export function buyRecipe(w: World, id: ChocId): { ok: boolean; reason?: string } {
  if (hasRecipe(w, id)) return { ok: false, reason: 'Recette déjà connue' };
  const def = CHOCS[id];
  if (w.choc.shopLevel < def.unlockLevel) return { ok: false, reason: `Boutique niveau ${def.unlockLevel} requis` };
  if (w.res.coins < def.unlockCoins) return { ok: false, reason: 'Pas assez de pièces' };
  w.res.coins -= def.unlockCoins;
  w.choc.recipes.push(id);
  return { ok: true };
}

export function canCook(w: World, id: ChocId): { ok: boolean; reason?: string } {
  if (!hasRecipe(w, id)) return { ok: false, reason: 'Recette inconnue' };
  if (!canPay(w, CHOCS[id].cost)) return { ok: false, reason: 'Pas assez d\'ingrédients' };
  return { ok: true };
}

// ------------------------------------------------------------------ qualité (mini-jeu)

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));

/** Étape 1 (fondre) : 1 point, −0,25 par surchauffe, jamais sous 0,3. */
export const scoreMelt = (burns: number): number => clamp01(Math.max(0.3, 1 - 0.25 * Math.max(0, burns)));
/** Étape 2 (verser) : `dist` = écart au centre de la zone (0..1), `halfWidth` = demi-largeur de la zone verte. */
export function scorePour(dist: number, halfWidth: number): number {
  const d = Math.abs(dist);
  if (d <= halfWidth * 0.4) return 1;
  if (d <= halfWidth) return 0.75;
  return clamp01(0.75 - (d - halfWidth) * 1.6) || 0.2;
}
/** Étape 3 (décorer) : part de touches justes. */
export const scoreDecor = (correct: number, mistakes: number): number => (correct <= 0 ? 0.3 : clamp01(correct / (correct + Math.max(0, mistakes))));

/** Moyenne des trois étapes → 1 à 3 étoiles (toujours au moins 1). */
export function starsFrom(scores: number[]): 1 | 2 | 3 {
  const s = scores.length ? scores.reduce((a, b) => a + clamp01(b), 0) / scores.length : 0;
  return s >= 0.82 ? 3 : s >= 0.55 ? 2 : 1;
}

// ------------------------------------------------------------------ fabrication

export interface CookResult { ok: boolean; id?: ChocId; qty?: number; stars?: number; value?: number; firstOfKind?: boolean; reason?: string }

/** Débite les ingrédients et ajoute la fournée (étoiles → quantité). */
export function cook(w: World, id: ChocId, stars: number): CookResult {
  const c = canCook(w, id);
  if (!c.ok) return c;
  const st = Math.min(3, Math.max(1, Math.floor(stars)));
  for (const [k, n] of Object.entries(CHOCS[id].cost) as [ResKind, number][]) w.res[k] -= n;
  const qty = STAR_QTY[st];
  w.extra[stockKey(id)] = stock(w, id) + qty;
  w.choc.made[id] = (w.choc.made[id] ?? 0) + qty;
  const firstOfKind = !w.choc.collection.includes(id);
  if (firstOfKind) w.choc.collection.push(id);
  return { ok: true, id, qty, stars: st, value: Math.round(CHOCS[id].value * STAR_VALUE[st]), firstOfKind };
}

// ------------------------------------------------------------------ coffrets

export interface BoxValue { coins: number; hearts: number; distinct: number; decorative: boolean }

/** Un coffret décoratif contient 4 chocolats tous différents. */
export function boxValue(ids: string[]): BoxValue {
  const cs = ids.filter(isChoc);
  const distinct = new Set(cs).size;
  const base = cs.reduce((s, id) => s + CHOCS[id].value, 0);
  const decorative = cs.length === BOX_SIZE && distinct === BOX_SIZE;
  const coins = Math.round(base * (decorative ? 1.6 : 1.25));
  const hearts = distinct + (decorative ? 2 : 0);
  return { coins, hearts, distinct, decorative };
}

export function checkBox(w: World, ids: string[]): { ok: boolean; reason?: string } {
  if (ids.length !== BOX_SIZE) return { ok: false, reason: `Un coffret contient ${BOX_SIZE} chocolats` };
  if (!ids.every(isChoc)) return { ok: false, reason: 'Chocolat inconnu' };
  const need: Record<string, number> = {};
  for (const id of ids) need[id] = (need[id] ?? 0) + 1;
  for (const [id, n] of Object.entries(need)) if (stock(w, id) < n) return { ok: false, reason: 'Pas assez de chocolats' };
  return { ok: true };
}

export interface BoxResult { ok: boolean; coins?: number; hearts?: number; decorative?: boolean; furniture?: boolean; reason?: string }

export function assembleBox(w: World, ids: string[]): BoxResult {
  const c = checkBox(w, ids);
  if (!c.ok) return c;
  for (const id of ids) w.extra[stockKey(id)] = stock(w, id) - 1;
  const v = boxValue(ids);
  w.choc.boxes += 1;
  w.res.coins = Math.min(999_999_999, w.res.coins + v.coins);
  let furniture = false;
  if (v.decorative && (w.castle.owned['choco-display'] ?? 0) === 0) {
    w.castle.owned['choco-display'] = 1;
    furniture = true;
  }
  return { ok: true, coins: v.coins, hearts: v.hearts, decorative: v.decorative, furniture };
}

// ------------------------------------------------------------------ boutique

export const upgradePrice = (w: World): number | null => (w.choc.shopLevel >= MAX_SHOP_LEVEL ? null : SHOP_UPGRADE[w.choc.shopLevel] ?? null);

export function upgradeShop(w: World): { ok: boolean; level?: number; reason?: string } {
  const p = upgradePrice(w);
  if (p === null) return { ok: false, reason: 'Boutique au niveau maximum' };
  if (w.res.coins < p) return { ok: false, reason: 'Pas assez de pièces' };
  w.res.coins -= p;
  w.choc.shopLevel += 1;
  return { ok: true, level: w.choc.shopLevel };
}
