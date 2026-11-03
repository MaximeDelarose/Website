/**
 * Logique pure de la famille : complicité, enregistrement des parties,
 * récompenses des quatre mini-jeux. Rien ne baisse jamais avec l'absence.
 */
import type { World } from '../../save/schema';
import { CHOC_IDS, type ChocId, type FurnitureId, type KidId } from '../../data/world/ids';
import { HARMONY_FURNITURE, KID_BOND_LEVELS, KID_BOND_MAX, type FamilyGameId } from '../../data/world/family';
import type { Rng } from './familyGames/rng';

export function kidBondLevel(bond: number): { level: number; frac: number; next: number | null } {
  let level = 0;
  for (let i = 0; i < KID_BOND_LEVELS.length; i++) if (bond >= KID_BOND_LEVELS[i]) level = i;
  if (level >= KID_BOND_MAX) return { level, frac: 1, next: null };
  const a = KID_BOND_LEVELS[level];
  const b = KID_BOND_LEVELS[level + 1];
  return { level, frac: (bond - a) / (b - a), next: b };
}

export const allKidsBondAtLeast = (w: World, level: number): boolean =>
  (['kid1', 'kid2', 'kid3'] as KidId[]).every((k) => kidBondLevel(w.family.kids[k].bond).level >= level);

/** Nombre total de bouquets composés dans le jardin (déclencheur de la scène du jardin). */
export const totalBouquets = (w: World): number => Object.values(w.garden.bouquets).reduce((a, b) => a + b, 0);

/** Visite d'une chambre : +1 de complicité, au plus une fois toutes les 5 minutes par enfant. */
export function recordVisit(w: World, kid: KidId, now: number): { gained: boolean; levelUp: boolean } {
  const key = `family.visit.${kid}`;
  const last = w.extra[key] ?? 0;
  if (now >= last && now - last < 5 * 60_000) return { gained: false, levelUp: false };
  w.extra[key] = now;
  return { gained: true, levelUp: addBond(w, kid, 1) };
}

function addBond(w: World, kid: KidId, n: number): boolean {
  const k = w.family.kids[kid];
  const before = kidBondLevel(k.bond).level;
  k.bond += n;
  return kidBondLevel(k.bond).level > before;
}

export interface GameRecord { newBest: boolean; bondGain: number; levelUp: boolean }

/**
 * Enregistre une partie terminée : meilleur score, nombre de parties, complicité.
 * `who` = un enfant, ou 'all' pour un jeu en famille (les trois enfants).
 */
export function recordGame(w: World, who: KidId | 'all', game: FamilyGameId, score: number, stars: number): GameRecord {
  const kids: KidId[] = who === 'all' ? ['kid1', 'kid2', 'kid3'] : [who];
  const bondGain = who === 'all' ? 1 : stars >= 3 ? 3 : 2;
  let newBest = false;
  let levelUp = false;
  for (const kid of kids) {
    const g = w.family.kids[kid].games[game] ?? { best: 0, plays: 0 };
    if (score > g.best) { g.best = score; newBest = true; }
    g.plays += 1;
    w.family.kids[kid].games[game] = g;
    if (addBond(w, kid, bondGain)) levelUp = true;
  }
  return { newBest, bondGain, levelUp };
}

// ------------------------------------------------------------------ récompenses
export interface Reward {
  coins: number;
  hearts: number;
  flowers: number;
  cocoa: number;
  diamonds: number;
  furniture: FurnitureId | null;
  box: number;
  newChocs: ChocId[];
}
export const emptyReward = (): Reward => ({ coins: 0, hearts: 0, flowers: 0, cocoa: 0, diamonds: 0, furniture: null, box: 0, newChocs: [] });

/** Récompense (hors application) selon le jeu et le nombre d'étoiles (1–3). */
export function rewardFor(game: FamilyGameId, stars: number, rng: Rng): Reward {
  const s = Math.max(1, Math.min(3, Math.floor(stars)));
  const r = emptyReward();
  if (game === 'bouquet') { r.hearts = s; r.flowers = 8 * s; r.coins = 10 * s; }
  else if (game === 'harmony') {
    r.coins = 20 * s;
    if (s >= 2) r.furniture = HARMONY_FURNITURE[Math.floor(rng() * HARMONY_FURNITURE.length)];
    r.hearts = s >= 3 ? 1 : 0;
  } else if (game === 'memory') { r.coins = 15 * s; r.diamonds = s; }
  else { r.box = 1; r.cocoa = 10 * s; r.coins = 10 * s; r.hearts = s >= 3 ? 1 : 0; }
  return r;
}

/**
 * Applique à la sauvegarde ce qui relève de `World` (pièces, fleurs, cacao,
 * meubles, coffrets, collection de chocolats). Les cœurs et les diamants sont
 * à créditer par l'appelant (addHearts / wallet.giveDiamonds). `made` = les
 * chocolats fabriqués pendant la partie.
 */
export function applyReward(w: World, r: Reward, made: ChocId[] = []): Reward {
  const cap = (v: number) => Math.min(999_999_999, v);
  w.res.coins = cap(w.res.coins + r.coins);
  w.res.flowers = cap(w.res.flowers + r.flowers);
  w.res.cocoa = cap(w.res.cocoa + r.cocoa);
  if (r.furniture) w.castle.owned[r.furniture] = (w.castle.owned[r.furniture] ?? 0) + 1;
  w.choc.boxes += r.box;
  r.newChocs = [];
  for (const id of made) {
    if (!(CHOC_IDS as readonly string[]).includes(id)) continue;
    w.choc.made[id] = (w.choc.made[id] ?? 0) + 1;
    if (!w.choc.collection.includes(id)) { w.choc.collection.push(id); r.newChocs.push(id); }
  }
  return r;
}
