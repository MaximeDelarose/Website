/**
 * Joueur automatique simple. Sert :
 *  - aux tests (chaque niveau doit pouvoir être gagné),
 *  - à l'indice en jeu (on montre la fusion qu'il choisirait).
 */
import { SPECIAL, sameItem } from '../../data/items';
import {
  canMerge, deliver, generatorCells, isStuck, move, neighbors, orderCells, recover, tapGenerator, tapItem,
} from './rules';
import { GENERATORS } from '../../data/items';
import { Rng } from '../../utils/rng';
import { BOARD_SIZE, type BoardEvent, type LevelDef, type RunState } from './types';

export interface Suggestion { from: number; to: number }

const nearGift = (s: RunState, i: number) => neighbors(i).some((n) => !!s.cells[n].gift);

/** Meilleure fusion disponible selon une heuristique simple (ou null). */
export function suggestMerge(s: RunState, def?: LevelDef): Suggestion | null {
  const giftsLeft = s.cells.some((c) => c.gift);
  // 1. Une clé dorée à côté d'un paquet ?
  if (giftsLeft) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      const it = s.cells[i].item;
      if (it?.c === 'special' && it.l === SPECIAL.KEY) {
        const g = s.cells.findIndex((c) => !!c.gift);
        if (g >= 0) return { from: i, to: g };
      }
    }
  }
  const targetColl = def?.dominant;
  let best: Suggestion | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < BOARD_SIZE; i++) {
    const a = s.cells[i].item;
    if (!a) continue;
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (i === j) continue;
      const b = s.cells[j].item;
      if (!canMerge(a, b) || !b) continue;
      const isStar = a.c === 'special';
      if (!isStar && j < i && !nearGift(s, i) && !nearGift(s, j)) continue; // paire symétrique
      let score = 0;
      if (giftsLeft && nearGift(s, j)) score += 100;
      if (isStar) score += 20 + b.l * 3 + (b.c === targetColl ? 10 : 0);
      else score += 30 - b.l; // d'abord les petits objets (libère de la place)
      if (score > bestScore) { bestScore = score; best = { from: i, to: j }; }
    }
  }
  return best;
}

/** Joue une action. Renvoie les événements (vide si plus rien à faire). */
export function botStep(s: RunState, def: LevelDef, now: number): BoardEvent[] {
  for (let k = 0; k < s.orders.length; k++) if (orderCells(s, k)) return deliver(s, def, k);
  const box = s.cells.findIndex((c) => c.item?.c === 'special' && c.item.l === SPECIAL.BOX);
  if (box >= 0) return tapItem(s, def, box);

  // Garde une réserve pour les commandes : ne fusionne pas un objet qu'une commande attend
  // s'il est seul de son espèce… (heuristique légère : on laisse faire.)
  const sug = suggestMerge(s, def);
  const giftsLeft = s.cells.some((c) => c.gift);
  if (sug) {
    // Rapprocher une paire d'un paquet si possible.
    if (giftsLeft && !nearGift(s, sug.to) && s.cells[sug.from].item?.c !== 'special') {
      const spot = s.cells.findIndex((c, i) => !c.item && !c.gift && nearGift(s, i));
      if (spot >= 0) return move(s, def, sug.to, spot, now);
    }
    return move(s, def, sug.from, sug.to, now);
  }
  const ev = tapGenerator(s, def, pickGenerator(s, def));
  if (ev.length && ev[0].t === 'full') {
    if (isStuck(s)) return recover(s, def);
    return [];
  }
  return ev;
}

/** Choisit quel générateur toucher (au hasard, pondéré par le panier du niveau). */
export function pickGenerator(s: RunState, def: LevelDef): number | undefined {
  const gens = generatorCells(s);
  if (gens.length <= 1) return gens[0];
  const w = gens.map((g) => {
    const coll = GENERATORS[s.cells[g].item!.l].coll;
    return def.gen.filter(([c]) => c === coll).reduce((a, [, , x]) => a + x, 0) || 1;
  });
  const r = new Rng((s.rng ^ (s.taps * 2654435761)) >>> 0);
  return r.weighted(gens.map((g, k) => [g, w[k]] as const));
}

export interface SimResult { won: boolean; taps: number; actions: number; recoveries: number }

/**
 * `pace` : 'fast' enchaîne les actions (combos faciles), 'human' marque une
 * pause de réflexion toutes les 3 actions (combos de 3 au plus).
 */
export function simulate(s: RunState, def: LevelDef, maxActions = 600, pace: 'fast' | 'human' = 'fast'): SimResult {
  let now = 10_000;
  let recoveries = 0;
  let actions = 0;
  for (; actions < maxActions && !s.won; actions++) {
    now += pace === 'fast' ? 700 : 1500 + (actions % 3 === 0 ? 2500 : 0);
    const ev = botStep(s, def, now);
    if (!ev.length) {
      const r = recover(s, def);
      recoveries++;
      if (!r.length) break;
    } else if (ev.some((e) => e.t === 'remove')) recoveries++;
  }
  return { won: s.won, taps: s.taps, actions, recoveries };
}

export const hasSame = (s: RunState, i: number) =>
  s.cells.some((c, j) => j !== i && sameItem(c.item, s.cells[i].item));
