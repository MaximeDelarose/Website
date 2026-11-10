/**
 * Aides de jeu (sans DOM) : pièces menacées, captures possibles, indices
 * progressifs, petit joueur « raisonnable » (2 coups de matériel) utilisé
 * pour proposer un bon coup et pour la calibration.
 */
import type { Chess, Move, PieceSymbol, Square, Color } from 'chess.js';
import { PIECE_VALUE } from './detente';
import { PIECE_NAMES, type PieceKind } from './pieces';

import { PARTNER_DE } from '../../config/gift';
const val = (t: PieceSymbol) => (t === 'k' ? 100 : PIECE_VALUE[t]);

/** Cases des pièces de `side` attaquées et mal protégées (non défendues, ou attaquées par moins chère). */
export function threatenedSquares(c: Chess, side: Color): Square[] {
  const foe: Color = side === 'w' ? 'b' : 'w';
  const out: Square[] = [];
  for (const row of c.board()) {
    for (const p of row) {
      if (!p || p.color !== side || p.type === 'k') continue;
      const atk = c.attackers(p.square, foe);
      if (!atk.length) continue;
      const defended = c.attackers(p.square, side).length > 0;
      const cheapest = Math.min(...atk.map((sq) => val(c.get(sq)!.type)));
      if (!defended || cheapest < val(p.type) - 0.5) out.push(p.square);
    }
  }
  return out;
}

/** Cases ennemies que `side` peut capturer ce tour-ci (si c'est son tour). */
export function capturableSquares(c: Chess, side: Color): Square[] {
  if (c.turn() !== side) return [];
  return [...new Set(c.moves({ verbose: true }).filter((m) => m.captured).map((m) => m.to))];
}

/** Meilleur gain matériel sur 2 demi-coups (négamax simple, alpha-bêta). */
function search(c: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0) return 0;
  const ms = c.moves({ verbose: true });
  if (!ms.length) return c.inCheck() ? -1000 - depth : 0;
  const gain = (m: Move) => (m.captured ? val(m.captured) : 0) + (m.promotion ? val(m.promotion) - 1 : 0);
  if (depth === 1) {
    // dernier demi-coup : meilleur gain immédiat (ou mat), sans jouer les coups
    let b = -Infinity;
    for (const m of ms) b = Math.max(b, m.san.endsWith('#') ? 1000 : gain(m));
    return b;
  }
  ms.sort((a, b) => gain(b) - gain(a));
  let best = -Infinity;
  for (const m of ms) {
    const g = gain(m);
    c.move(m);
    const s = g - search(c, depth - 1, -beta + g, -alpha + g);
    c.undo();
    if (s > best) best = s;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export interface Scored { move: Move; score: number }

/** Évalue tous les coups légaux (matériel sur `depth` demi-coups + petits bonus). */
export function scoreMoves(c: Chess, depth = 2): Scored[] {
  const ms = c.moves({ verbose: true });
  const ply = c.history().length;
  return ms.map((m) => {
    const g = (m.captured ? val(m.captured) : 0) + (m.promotion ? val(m.promotion) - 1 : 0);
    c.move(m);
    let s: number;
    if (c.isCheckmate()) s = 1000;
    else s = g - search(c, depth - 1, -Infinity, Infinity);
    const check = c.inCheck();
    c.undo();
    if (s < 900) {
      if (check) s += 0.3;
      if (m.piece === 'p') s += 0.05 * (m.color === 'w' ? Number(m.to[1]) : 9 - Number(m.to[1])) + (m.promotion ? 0 : 0);
      if (ply < 20 && (m.piece === 'n' || m.piece === 'b') && Number(m.from[1]) === (m.color === 'w' ? 1 : 8)) s += 0.25;
      if (m.isKingsideCastle() || m.isQueensideCastle()) s += 0.3;
      const cx = 3.5 - Math.abs(m.to.charCodeAt(0) - 97 - 3.5);
      s += 0.03 * cx;
    }
    return { move: m, score: s };
  });
}

/** Le meilleur coup (ex æquo départagés par `rng`) ; null s'il n'y a aucun coup. */
export function bestMove(c: Chess, depth = 2, rng: () => number = Math.random): Move | null {
  const sc = scoreMoves(c, depth);
  if (!sc.length) return null;
  const top = Math.max(...sc.map((x) => x.score));
  const best = sc.filter((x) => x.score >= top - 0.02);
  return best[Math.floor(rng() * best.length)].move;
}

// ------------------------------------------------------------------ indices

export type HintTheme = 'mate' | 'check-escape' | 'capture' | 'promotion' | 'save' | 'castle' | 'check' | 'develop' | 'center';
export interface Hint {
  level: 1 | 2 | 3;
  theme: HintTheme;
  /** Texte court, en français. */
  text: string;
  /** Coup conseillé (toujours légal). */
  move: Move;
  /** Cases à mettre en évidence selon le niveau (1 : aucune, 2 : départ, 3 : départ + arrivée). */
  from?: Square;
  to?: Square;
}

const nom = (t: PieceSymbol) => PIECE_NAMES[t as PieceKind].toLowerCase();
const un = (t: PieceSymbol) => (t === 'p' || t === 'n' || t === 'b' || t === 'k' ? 'un' : 'une') + ' ' + nom(t);
const le = (t: PieceSymbol) => (t === 'n' || t === 'p' || t === 'b' || t === 'k' ? 'ton ' : 'ta ') + nom(t);

function themeOf(c: Chess, m: Move): HintTheme {
  c.move(m);
  const mate = c.isCheckmate();
  c.undo();
  if (mate) return 'mate';
  if (c.inCheck()) return 'check-escape';
  if (m.promotion) return 'promotion';
  if (m.captured) return 'capture';
  if (m.isKingsideCastle() || m.isQueensideCastle()) return 'castle';
  if (threatenedSquares(c, m.color).includes(m.from)) return 'save';
  c.move(m);
  const chk = c.inCheck();
  c.undo();
  if (chk) return 'check';
  if ((m.piece === 'n' || m.piece === 'b') && Number(m.from[1]) === (m.color === 'w' ? 1 : 8)) return 'develop';
  return 'center';
}

function describe(theme: HintTheme, m: Move, level: 1 | 2 | 3): string {
  const piece = m.piece;
  switch (theme) {
    case 'mate': return level === 1 ? 'Il y a un échec et mat en un coup. Cherche bien !' : `Échec et mat possible avec ${le(piece)}.`;
    case 'check-escape': return level === 1 ? 'Ton roi est menacé : sors-le d\'échec.' : 'Ton roi est menacé : il faut parer l\'échec.';
    case 'capture': return level === 1 ? `Tu peux capturer ${un(m.captured!)}.` : `Tu peux capturer ${un(m.captured!)} avec ${le(piece)}.`;
    case 'promotion': return 'Un de tes pions peut devenir une pièce : avance-le jusqu\'au bout.';
    case 'save': return level === 1 ? `${le(piece)[0].toUpperCase() + le(piece).slice(1)} est attaqué${piece === 'q' || piece === 'r' ? 'e' : ''} : mets-${piece === 'q' || piece === 'r' ? 'la' : 'le'} à l'abri.` : `Mets ${le(piece)} à l'abri.`;
    case 'castle': return 'Tu peux roquer : ton roi sera plus en sécurité.';
    case 'check': return `Tu peux mettre le roi ${PARTNER_DE} en échec.`;
    case 'develop': return `Sors ${le(piece)} : plus tes pièces sont actives, mieux c'est.`;
    default: return 'Rien d\'urgent : rapproche une pièce du centre.';
  }
}

/** Indice de niveau 1 à 3 pour le joueur dont c'est le tour (null si aucun coup). */
export function hintFor(c: Chess, level: 1 | 2 | 3 = 1, rng: () => number = Math.random, cached?: Move): Hint | null {
  let move = cached;
  if (!move) {
    const sc = scoreMoves(c, 2);
    if (!sc.length) return null;
    const top = Math.max(...sc.map((x) => x.score));
    const pool = sc.filter((x) => x.score >= top - 0.02);
    move = pool[Math.floor(rng() * pool.length)].move;
  }
  const theme = themeOf(c, move);
  const hint: Hint = { level, theme, text: describe(theme, move, level), move };
  if (level >= 2) hint.from = move.from;
  if (level >= 3) hint.to = move.to;
  return hint;
}

// ------------------------------------------------------------------ annulation

/** La joueuse peut annuler (son coup + la réponse d'Auguste) ? Jamais le premier coup d'Auguste si elle a les noirs. */
export function canUndo(c: Chess, player: Color): boolean {
  return c.turn() === player && c.history().length >= (player === 'w' ? 2 : 3);
}

/** Annule son dernier coup ET la réponse d'Auguste. Renvoie false si impossible. */
export function undoPair(c: Chess, player: Color): boolean {
  if (!canUndo(c, player)) return false;
  c.undo();
  c.undo();
  return true;
}
