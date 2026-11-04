/**
 * Auguste « Détente ♡ » : adversaire volontairement tranquille.
 *
 *  - il ne joue QUE des coups légaux (tirés de chess.js) ;
 *  - il ne regarde qu'un coup à l'avance, avec une évaluation simple
 *    (matériel + un peu de position + du bruit) et choisit au hasard pondéré ;
 *  - il rate parfois une prise, un mat en un coup, ne voit pas toujours qu'une
 *    pièce est en prise, joue de temps en temps un coup « distrait » ;
 *  - aucune triche : pas de coup perdant programmé, pas de défaite garantie.
 *    La partie se gagne par les décisions de la joueuse.
 * RNG injectable (tests, simulation).
 */
import type { Chess, Move, PieceSymbol } from 'chess.js';

export type Rng = () => number;

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 0 };

/** Réglages (exposés pour la calibration). */
export const DETENTE = {
  lapse: 0.18, // coup « distrait » : n'importe quel coup légal
  mateSeen: 0.5, // chance de voir un mat en un coup
  notice: 0.5, // chance de bien voir les prises possibles
  seeDanger: 0.3, // chance de vérifier que la case d'arrivée n'est pas attaquée
  temp: 2, // température du tirage pondéré (grande = plus de hasard)
  noise: 0.9,
};

const rank = (sq: string) => Number(sq[1]);
const file = (sq: string) => sq.charCodeAt(0) - 97;

/** Petite évaluation positionnelle d'un coup (centre, développement, roque). */
function positional(m: Move, ply: number): number {
  let s = 0;
  const cx = 3.5 - Math.abs(file(m.to) - 3.5);
  const cy = 3.5 - Math.abs(rank(m.to) - 4.5);
  if (m.piece === 'n' || m.piece === 'b' || m.piece === 'p') s += 0.06 * (cx + cy);
  if (ply < 24 && (m.piece === 'n' || m.piece === 'b')) {
    const home = m.color === 'w' ? 1 : 8;
    if (rank(m.from) === home) s += 0.35;
  }
  if (m.isKingsideCastle() || m.isQueensideCastle()) s += 0.5;
  if (m.piece === 'k' && ply < 30 && !m.isKingsideCastle() && !m.isQueensideCastle()) s -= 0.4;
  if (m.piece === 'q' && ply < 10) s -= 0.3;
  if (m.piece === 'p') s += 0.04 * (m.color === 'w' ? rank(m.to) : 9 - rank(m.to));
  return s;
}

/** Bruit approximativement gaussien (somme de 3 uniformes). */
const gauss = (rng: Rng) => (rng() + rng() + rng() - 1.5) * 2;

export function isMateIn1(c: Chess, m: Move): boolean {
  c.move(m);
  const mate = c.isCheckmate();
  c.undo();
  return mate;
}

/**
 * Choisit le coup d'Auguste « Détente » (ou null s'il n'y a aucun coup légal).
 * La position `c` est restituée telle quelle.
 */
export function detenteMove(c: Chess, rng: Rng = Math.random): Move | null {
  const moves = c.moves({ verbose: true });
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  // distraction : un coup légal quelconque
  if (rng() < DETENTE.lapse) return moves[Math.floor(rng() * moves.length)];
  const ply = c.history().length;
  const opp = c.turn() === 'w' ? 'b' : 'w';
  // un mat en un coup : vu une fois sur deux
  if (rng() < DETENTE.mateSeen) {
    const mate = moves.find((m) => /#$/.test(m.san));
    if (mate) return mate;
  }
  const noticing = rng() < DETENTE.notice;
  const checkingDanger = rng() < DETENTE.seeDanger;
  const scores = moves.map((m) => {
    let s = 0;
    if (m.captured) s += PIECE_VALUE[m.captured] * (noticing ? 1 : 0.35);
    if (m.promotion) s += (PIECE_VALUE[m.promotion] - 1) * (noticing ? 0.8 : 0.4);
    s += positional(m, ply);
    if (/[+#]$/.test(m.san)) s += 0.45;
    if (checkingDanger && m.piece !== 'k') {
      // la case d'arrivée est-elle attaquée une fois le coup joué ?
      c.move(m);
      const attacked = c.isAttacked(m.to, opp);
      const defended = attacked && c.isAttacked(m.to, m.color);
      c.undo();
      if (attacked) s -= PIECE_VALUE[m.piece] * (defended ? 0.45 : 1);
    }
    return s + gauss(rng) * DETENTE.noise;
  });
  // tirage pondéré (softmax)
  const top = Math.max(...scores);
  const w = scores.map((s) => Math.exp((s - top) / DETENTE.temp));
  const sum = w.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < moves.length; i++) {
    r -= w[i];
    if (r <= 0) return moves[i];
  }
  return moves[moves.length - 1];
}

/** Même chose en notation UCI. */
export function detenteUci(c: Chess, rng?: Rng): string | null {
  const m = detenteMove(c, rng);
  return m ? m.from + m.to + (m.promotion ?? '') : null;
}

/** PRNG déterministe (tests). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
