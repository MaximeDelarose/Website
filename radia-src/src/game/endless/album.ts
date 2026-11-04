/**
 * Album : chaque objet découvert (« coll:niveau ») est conservé pour toujours (fun.endless2.album).
 * Récompense de nouveauté modeste (pièces / un peu d'énergie), récompense de chaîne complétée et de
 * paliers du nombre d'objets. Jamais de diamants requis.
 */
import { COLLECTIONS, COLLECTION_IDS, collMax, itemKey, type CollectionId, type ItemColl, type ItemRef } from '../../data/items';
import type { FunState } from '../../save/fun';
import type { Loot } from '../merge/types';
import { ENDLESS_CFG as C } from './config';
import { bump } from './ctx';

const A = C.album;
export const albumTotal = (): number => COLLECTION_IDS.reduce((a, c) => a + collMax(c), 0);

export const isDiscovered = (fun: FunState, r: ItemRef): boolean => fun.endless2.album.includes(itemKey(r));

/** Importe les objets découverts de l'ancien album (save.data.discovered) sans récompense. */
export function syncLegacyAlbum(fun: FunState, legacy: string[]): number {
  const have = new Set(fun.endless2.album);
  let n = 0;
  for (const k of legacy) {
    const [c, l] = k.split(':');
    const lv = Number(l);
    if (!(COLLECTION_IDS as string[]).includes(c) || !Number.isInteger(lv) || lv < 1 || lv > collMax(c as ItemColl)) continue;
    if (!have.has(k)) { have.add(k); fun.endless2.album.push(k); n++; }
  }
  return n;
}

export interface DiscoverResult { isNew: boolean; reward: Loot[]; completed?: ItemColl; milestone?: string }

const chainDone = (fun: FunState, c: CollectionId): boolean => {
  const have = new Set(fun.endless2.album);
  for (let l = 1; l <= collMax(c); l++) if (!have.has(`${c}:${l}`)) return false;
  return true;
};

/** Enregistre un objet. Les objets spéciaux / générateurs ne comptent pas. */
export function discover(fun: FunState, item: ItemRef): DiscoverResult {
  if (item.c === 'special' || item.c === 'gen') return { isNew: false, reward: [] };
  if (item.l < 1 || item.l > collMax(item.c)) return { isNew: false, reward: [] };
  const key = itemKey(item);
  const e = fun.endless2;
  if (e.album.includes(key)) return { isNew: false, reward: [] };
  e.album.push(key);
  const reward: Loot[] = [];
  if (item.l >= 2) reward.push({ kind: 'coins', n: item.l * A.coinsPerLevel });
  if (item.l >= A.energyFromLevel) reward.push({ kind: 'energy', n: A.energy });
  const res: DiscoverResult = { isNew: true, reward };
  // chaîne complète ?
  const ck = `chain:${item.c}`;
  if (chainDone(fun, item.c as CollectionId) && !e.albumClaimed.includes(ck)) {
    e.albumClaimed.push(ck);
    bump(fun, 'chains');
    reward.push({ kind: 'coins', n: A.chainCoins }, { kind: 'energy', n: A.chainEnergy }, { kind: 'diamonds', n: A.chainDiamonds, rarity: 'rare' });
    res.completed = item.c;
  }
  // palier du nombre total
  const count = e.album.length;
  A.milestones.forEach((m, i) => {
    const mk = `count:${m}`;
    if (count >= m && !e.albumClaimed.includes(mk)) {
      e.albumClaimed.push(mk);
      reward.push({ kind: 'coins', n: A.milestoneCoins[i], rarity: i >= 3 ? 'epic' : 'rare' });
      if (i >= 2) reward.push({ kind: 'deco', n: 1, rarity: i >= 4 ? 'epic' : 'rare', seed: count * 31 + i });
      res.milestone = mk;
    }
  });
  return res;
}

export interface AlbumProgress {
  found: number;
  total: number;
  perColl: { coll: CollectionId; found: number; max: number; complete: boolean }[];
  chainsDone: number;
  /** Prochaine récompense visible (palier d'objets ou chaîne la plus proche). */
  next: { label: string; have: number; need: number; reward: string } | null;
}

export function albumProgress(fun: FunState): AlbumProgress {
  const have = new Set(fun.endless2.album);
  const perColl = COLLECTION_IDS.map((c) => {
    let f = 0;
    for (let l = 1; l <= collMax(c); l++) if (have.has(`${c}:${l}`)) f++;
    return { coll: c, found: f, max: collMax(c), complete: f === collMax(c) };
  });
  const found = perColl.reduce((a, p) => a + p.found, 0);
  let next: AlbumProgress['next'] = null;
  const mi = A.milestones.findIndex((m) => found < m);
  if (mi >= 0) next = { label: `${A.milestones[mi]} objets découverts`, have: found, need: A.milestones[mi], reward: `+${A.milestoneCoins[mi]} pièces${mi >= 2 ? ' et une décoration' : ''}` };
  // chaîne la plus proche d'être complétée (si plus proche que le palier)
  const open = perColl.filter((p) => !p.complete && !fun.endless2.albumClaimed.includes(`chain:${p.coll}`)).sort((a, b) => (b.found / b.max) - (a.found / a.max))[0];
  if (open && (!next || open.max - open.found <= 2)) {
    next = { label: `Compléter la chaîne « ${COLLECTIONS[open.coll].name} »`, have: open.found, need: open.max, reward: `+${A.chainCoins} pièces, +${A.chainEnergy} ⚡, +${A.chainDiamonds} 💎` };
  }
  return { found, total: albumTotal(), perColl, chainsDone: perColl.filter((p) => p.complete).length, next };
}
