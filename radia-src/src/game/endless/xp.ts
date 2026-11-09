/**
 * Niveau permanent de Radia (mode libre) : XP gagnée en livrant des commandes, en fabriquant des savons PIMBÊCHE…
 * Tout est calculé depuis `fun.endless2.counters.xp` (aucun changement de schéma de sauvegarde, aucune perte possible).
 * Les valeurs sont dans ENDLESS_CFG.xp (docs/BALANCING.md).
 */
import type { FunState } from '../../save/fun';
import type { ItemRef } from '../../data/items';
import { ENDLESS_CFG as C } from './config';
import { bump, counter } from './ctx';

export interface XpView { level: number; xp: number; into: number; need: number; ratio: number }
export interface LevelUp { from: number; to: number; coins: number; energy: number; unlock?: string }

/** XP cumulée nécessaire pour ATTEINDRE le niveau `l` (niveau 1 = 0). */
export const xpToReach = (l: number): number => (l <= 1 ? 0 : Math.round(C.xp.base * Math.pow(l - 1, C.xp.curve)));

export function levelOf(total: number): number {
  let l = 1;
  while (l < C.xp.maxLevel && total >= xpToReach(l + 1)) l++;
  return l;
}

export function xpView(fun: FunState): XpView {
  const xp = counter(fun, 'xp');
  const level = levelOf(xp);
  const lo = xpToReach(level);
  const hi = level >= C.xp.maxLevel ? lo : xpToReach(level + 1);
  const need = Math.max(0, hi - lo);
  const into = xp - lo;
  return { level, xp, into, need, ratio: need ? Math.min(1, into / need) : 1 };
}

/** XP d'une livraison : palier + bonus savon PIMBÊCHE (pilier de la boutique). */
export function orderXp(tier: 'easy' | 'mid' | 'hard', items: ItemRef[]): number {
  return C.xp.order[tier] + (items.some((r) => r.c === 'soap') ? C.xp.soapBonus : 0);
}

/** Récompense (pièces / énergie) d'un niveau gagné. */
export function levelReward(level: number): { coins: number; energy: number; unlock?: string } {
  return { coins: C.xp.levelCoins + C.xp.levelCoinsPer * level, energy: level % 2 === 0 ? C.xp.levelEnergy : 0, unlock: C.xp.unlocks[level] };
}

/** Ajoute de l'XP ; renvoie les niveaux franchis avec leurs récompenses (à créditer UNE fois par l'appelant). */
export function addXp(fun: FunState, n: number): LevelUp | null {
  if (n <= 0) return null;
  const before = levelOf(counter(fun, 'xp'));
  bump(fun, 'xp', n);
  const after = levelOf(counter(fun, 'xp'));
  if (after <= before) return null;
  let coins = 0, energy = 0; let unlock: string | undefined;
  for (let l = before + 1; l <= after; l++) { const r = levelReward(l); coins += r.coins; energy += r.energy; unlock = r.unlock ?? unlock; }
  return { from: before, to: after, coins, energy, unlock };
}
