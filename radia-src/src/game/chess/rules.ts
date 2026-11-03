/** Petits outils de règles au-dessus de chess.js (sans DOM). */
import { Chess, type Move } from 'chess.js';

export const toUci = (m: Pick<Move, 'from' | 'to' | 'promotion'>) => m.from + m.to + (m.promotion ?? '');

export function playUci(c: Chess, u: string): Move | null {
  try {
    return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  } catch {
    return null;
  }
}

/** Ce coup donne-t-il mat ? (la position n'est pas modifiée) */
export function isMatingMove(c: Chess, u: string): boolean {
  const m = playUci(c, u);
  if (!m) return false;
  const mate = c.isCheckmate();
  c.undo();
  return mate;
}

/** Après le coup de la joueuse : toute réponse adverse permet-elle un mat immédiat ? */
export function forcesMateIn1(c: Chess): boolean {
  if (c.isGameOver()) return false;
  for (const r of c.moves({ verbose: true })) {
    c.move(r);
    const ok = c.moves({ verbose: true }).some((m) => isMatingMove(c, toUci(m)));
    c.undo();
    if (!ok) return false;
  }
  return true;
}

export type GameEnd =
  | { kind: 'mate'; winner: 'w' | 'b' }
  | { kind: 'draw'; reason: 'pat' | 'répétition' | '50 coups' | 'matériel insuffisant' };

export function gameEnd(c: Chess): GameEnd | null {
  if (c.isCheckmate()) return { kind: 'mate', winner: c.turn() === 'w' ? 'b' : 'w' };
  if (c.isStalemate()) return { kind: 'draw', reason: 'pat' };
  if (c.isInsufficientMaterial()) return { kind: 'draw', reason: 'matériel insuffisant' };
  if (c.isThreefoldRepetition()) return { kind: 'draw', reason: 'répétition' };
  if (c.isDrawByFiftyMoves()) return { kind: 'draw', reason: '50 coups' };
  return null;
}
