/** Objectifs court / moyen / long terme (toujours un objectif réalisable à court terme). */
import { xpView } from './xp';
import { COLLECTIONS, itemName } from '../../data/items';
import type { FunState } from '../../save/fun';
import type { Loot, RunState } from '../merge/types';
import { albumProgress } from './album';
import { ENDLESS_CFG as C } from './config';
import { lootLabel } from './loot';
import { progressOf } from './orders';
import { secondaryView } from './secondary';
import { pendingChests, treasureView } from './treasure';
import { nextUnlock } from './unlocks';

export interface Goal {
  id: string;
  kind: 'order' | 'generator' | 'chest' | 'secondary' | 'unlock' | 'album' | 'level';
  label: string;
  progress: number;
  goal: number;
  ratio: number;
  /** Prochaine récompense, en clair. */
  reward: string;
}
export interface Goals { immediate: Goal; mid: Goal; long: Goal }

const mk = (id: string, kind: Goal['kind'], label: string, progress: number, goal: number, reward: string): Goal =>
  ({ id, kind, label, progress, goal, ratio: goal > 0 ? Math.min(1, progress / goal) : 0, reward });

const rewardText = (l: Loot[]) => l.map(lootLabel).join(', ');

export function goals(run: RunState, fun: FunState): Goals {
  // --- immédiat : la commande la plus proche d'être livrée
  let imm: Goal | null = null;
  let bestRatio = -1;
  run.orders.forEach((o, slot) => {
    if (!o) return;
    const p = progressOf(run.cells, o);
    const r = p.ready ? 2 : p.ratio;
    if (r > bestRatio) {
      bestRatio = r;
      const first = o.items[0];
      const rw = o.reward;
      imm = mk(`order:${slot}`, 'order', p.ready ? `Livre « ${itemName(first)} » : elle est prête !` : `Fabrique « ${o.items.map(itemName).join(' + ')} »`, p.have, p.need,
        rw ? `+${rw.coins} pièces, +${rw.hearts} ♡${rw.matN ? `, +${rw.matN} ${rw.mat === 'flowers' ? 'fleurs' : rw.mat === 'fabric' ? 'tissu' : 'cacao'}` : ''}` : `+${o.items.length} ♡`);
    }
  });
  const immediate = imm ?? mk('tap', 'generator', 'Touche un générateur pour produire des objets', 0, 1, '+ des objets à fusionner');

  // --- moyen terme : coffre ou événement secondaire, le plus avancé
  const tv = treasureView(fun);
  const chest = pendingChests(fun) > 0
    ? mk('chest:open', 'chest', 'Ouvre ton coffre', 0, 1, 'Un butin garanti')
    : mk('chest', 'chest', 'Remplis la jauge de trésor', tv.points, tv.goal, 'Un coffre (tirage à raretés publiées)');
  let mid = chest;
  for (const sv of secondaryView(fun)) {
    const g = mk(`sec:${sv.id}`, 'secondary', `${sv.name} : ${sv.text}`, sv.progress, sv.goal, rewardText(sv.nextReward));
    if (mid.id !== 'chest:open' && g.ratio > mid.ratio) mid = g;
  }

  // --- long terme : prochaine collection, sinon album
  const nu = nextUnlock(fun);
  let long: Goal;
  if (nu) {
    long = mk(`unlock:${nu.coll}`, 'unlock', `Débloque « ${COLLECTIONS[nu.coll].name} »`, nu.have, nu.need, `Nouveau générateur et nouvelles commandes (livre des commandes : +${C.unlock.chainBonus} par chaîne d'album complétée)`);
  } else {
    const ap = albumProgress(fun);
    long = ap.next ? mk('album', 'album', ap.next.label, ap.next.have, ap.next.need, ap.next.reward) : mk('album', 'album', 'Album complet', ap.found, ap.total, 'Bravo ♡');
  }
  // le niveau de Radia est un objectif long toujours présent : on le montre quand il est plus proche que la prochaine collection
  const xv = xpView(fun);
  if (xv.need > 0 && xv.ratio > long.ratio) long = mk('level', 'level', `Atteins le niveau ${xv.level + 1} de Radia`, xv.into, xv.need, 'Pièces, énergie et nouveautés de la boutique PIMBÊCHE');
  return { immediate, mid, long };
}
