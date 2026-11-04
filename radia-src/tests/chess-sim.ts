import { Chess } from 'chess.js';
import { detenteMove, mulberry32, DETENTE } from '../src/game/chess/detente';
import { bestMove } from '../src/game/chess/helps';

export type Opp = (c: Chess, rng: () => number) => ReturnType<Chess['moves']>[number] | any;
export const randomLegal = (c: Chess, rng: () => number) => { const m = c.moves({ verbose: true }); return m[Math.floor(rng() * m.length)]; };
/** Novice : prend la plus grosse pièce disponible (sans regarder la riposte), sinon coup au hasard ; voit un mat en un. */
export const greedy = (c: Chess, rng: () => number) => {
  const ms = c.moves({ verbose: true });
  const mate = ms.find((m) => /#$/.test(m.san));
  if (mate) return mate;
  const V: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const caps = ms.filter((m) => m.captured);
  if (caps.length) {
    const top = Math.max(...caps.map((m) => V[m.captured!]));
    const best = caps.filter((m) => V[m.captured!] === top);
    return best[Math.floor(rng() * best.length)];
  }
  return ms[Math.floor(rng() * ms.length)];
};
export const reasonable = (c: Chess, rng: () => number) => bestMove(c, 2, rng);

/** Une partie : Détente contre `foe`. Retourne 'foe' | 'detente' | 'draw'. */
export function playGame(foe: Opp, seed: number, foeColor: 'w' | 'b', maxPlies = 160) {
  const rng = mulberry32(seed);
  const c = new Chess();
  const st = { captures: 0, checks: 0, plies: 0 };
  while (!c.isGameOver() && !c.isDraw() && c.history().length < maxPlies) {
    const mine = c.turn() !== foeColor;
    const m = mine ? detenteMove(c, rng) : foe(c, rng);
    if (!m) break;
    if (mine) { if (m.captured) st.captures++; }
    c.move(m);
    if (mine && c.inCheck()) st.checks++;
  }
  st.plies = c.history().length;
  let res: 'foe' | 'detente' | 'draw' = 'draw';
  if (c.isCheckmate()) res = c.turn() === foeColor ? 'detente' : 'foe';
  // partie non terminée (limite de coups / nulle) : qui avait l'avantage de matériel ?
  const V: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let diff = 0;
  for (const row of c.board()) for (const p of row) if (p) diff += (p.color === foeColor ? 1 : -1) * V[p.type];
  return { res, ahead: res === 'draw' && diff >= 3 ? 1 : 0, ...st };
}

export function series(foe: Opp, n: number, seed0 = 1) {
  const t = { foe: 0, detente: 0, draw: 0, ahead: 0, captures: 0, checks: 0, plies: 0 };
  for (let i = 0; i < n; i++) {
    const r = playGame(foe, seed0 + i * 7919, i % 2 ? 'w' : 'b');
    t[r.res]++; t.ahead += r.ahead; t.captures += r.captures; t.checks += r.checks; t.plies += r.plies;
  }
  return { n, ...t };
}
void DETENTE;
