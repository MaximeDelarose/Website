/**
 * MODE REINE — logique pure (sans DOM), testable.
 *
 * Radia est une Reine spéciale sur un petit plateau. Règles :
 *  - Elle se déplace comme une dame d'échecs (lignes, colonnes, diagonales),
 *    sans traverser les murs, les grilles fermées ni les pièces.
 *  - Les pièces ennemies ne bougent jamais. Elles attaquent comme aux échecs
 *    (les pions ennemis attaquent les deux cases en diagonale vers le BAS).
 *  - La Reine ne peut jamais FINIR un coup sur une case attaquée…
 *    … sauf si son Bouclier est activé (une seule fois par puzzle).
 *  - Elle peut prendre une pièce ennemie en arrivant sur sa case : la pièce
 *    disparaît avec ses attaques. La prise est interdite si une AUTRE pièce
 *    protège cette case (elle finirait sur une case attaquée).
 *  - Cœur : ramassé quand la Reine termine son coup sur sa case.
 *  - Portail : finir un coup sur un portail la téléporte sur son jumeau
 *    (la case d'arrivée doit elle aussi être sûre).
 *  - Dalle dorée : finir un coup dessus ouvre toutes les grilles.
 *  - Objectif : ramasser tous les cœurs en un nombre de coups limité.
 *
 * Carte (une chaîne par rangée, de haut en bas) :
 *   .  vide          Q  Reine (départ)     h  cœur        #  mur
 *   p n b r q k  pièces ennemies           1 2  portails (paires)
 *   G  grille fermée                        g  dalle qui ouvre les grilles
 */

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface QueenPuzzle {
  id: string;
  title: string;
  hint: string;
  rows: string[];
  limit: number;
  shield?: boolean;
  /** Indications pas à pas (tutoriel). */
  steps?: string[];
}

export interface QueenLevel {
  w: number;
  h: number;
  start: number;
  hearts: number[];
  walls: Set<number>;
  gates: Set<number>;
  plates: Set<number>;
  portals: Map<number, number>;
  pieces: Map<number, PieceType>;
}

export interface QueenState {
  pos: number;
  hearts: number; // masque des cœurs restants
  captured: number; // masque des pièces prises (index dans pieceList)
  gatesOpen: boolean;
  shield: 0 | 1 | 2; // 0 : épuisé / absent · 1 : disponible · 2 : activé
  moves: number;
}

export function parseQueen(p: QueenPuzzle): QueenLevel & { pieceList: number[] } {
  const h = p.rows.length;
  const w = p.rows[0].length;
  const lv: QueenLevel & { pieceList: number[] } = {
    w, h, start: -1, hearts: [], walls: new Set(), gates: new Set(), plates: new Set(),
    portals: new Map(), pieces: new Map(), pieceList: [],
  };
  const portalCells: Record<string, number[]> = {};
  p.rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`${p.id}: rangée ${y} de longueur ${row.length} ≠ ${w}`);
    [...row].forEach((ch, x) => {
      const i = y * w + x;
      if (ch === 'Q') lv.start = i;
      else if (ch === 'h') lv.hearts.push(i);
      else if (ch === '#') lv.walls.add(i);
      else if (ch === 'G') lv.gates.add(i);
      else if (ch === 'g') lv.plates.add(i);
      else if ('pnbrqk'.includes(ch)) { lv.pieces.set(i, ch as PieceType); lv.pieceList.push(i); }
      else if (/[1-9]/.test(ch)) (portalCells[ch] ??= []).push(i);
      else if (ch !== '.') throw new Error(`${p.id}: caractère inconnu « ${ch} »`);
    });
  });
  for (const [k, cells] of Object.entries(portalCells)) {
    if (cells.length !== 2) throw new Error(`${p.id}: le portail ${k} doit avoir 2 cases`);
    lv.portals.set(cells[0], cells[1]);
    lv.portals.set(cells[1], cells[0]);
  }
  if (lv.start < 0) throw new Error(`${p.id}: pas de Reine`);
  return lv;
}

export function initialState(p: QueenPuzzle, lv: QueenLevel): QueenState {
  return { pos: lv.start, hearts: (1 << lv.hearts.length) - 1, captured: 0, gatesOpen: false, shield: p.shield ? 1 : 0, moves: 0 };
}

type Lv = ReturnType<typeof parseQueen>;

const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

function pieceAlive(lv: Lv, s: QueenState, i: number): boolean {
  const k = lv.pieceList.indexOf(i);
  return k >= 0 && !(s.captured & (1 << k));
}

/** Case bloquante pour les déplacements et les attaques glissantes (hors Reine). */
function blocks(lv: Lv, s: QueenState, i: number): boolean {
  if (lv.walls.has(i)) return true;
  if (lv.gates.has(i) && !s.gatesOpen) return true;
  return pieceAlive(lv, s, i);
}

/** Cases attaquées par les pièces ennemies restantes. */
export function attacked(lv: Lv, s: QueenState): Set<number> {
  const out = new Set<number>();
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < lv.w && y < lv.h;
  lv.pieceList.forEach((i, k) => {
    if (s.captured & (1 << k)) return;
    const t = lv.pieces.get(i)!;
    const x0 = i % lv.w;
    const y0 = Math.floor(i / lv.w);
    const add = (x: number, y: number) => { if (inside(x, y)) out.add(y * lv.w + x); };
    if (t === 'p') { add(x0 - 1, y0 + 1); add(x0 + 1, y0 + 1); return; }
    if (t === 'n') { for (const [dx, dy] of KNIGHT) add(x0 + dx, y0 + dy); return; }
    if (t === 'k') { for (const [dx, dy] of DIRS8) add(x0 + dx, y0 + dy); return; }
    const dirs = t === 'r' ? DIRS8.slice(0, 4) : t === 'b' ? DIRS8.slice(4) : DIRS8;
    for (const [dx, dy] of dirs) {
      let x = x0 + dx;
      let y = y0 + dy;
      while (inside(x, y)) {
        const j = y * lv.w + x;
        out.add(j);
        if (blocks(lv, s, j)) break;
        x += dx; y += dy;
      }
    }
  });
  return out;
}

/** Cases atteignables par un déplacement de dame (avant les règles de sécurité). */
export function queenTargets(lv: Lv, s: QueenState): number[] {
  const out: number[] = [];
  const x0 = s.pos % lv.w;
  const y0 = Math.floor(s.pos / lv.w);
  for (const [dx, dy] of DIRS8) {
    let x = x0 + dx;
    let y = y0 + dy;
    while (x >= 0 && y >= 0 && x < lv.w && y < lv.h) {
      const j = y * lv.w + x;
      if (lv.walls.has(j) || (lv.gates.has(j) && !s.gatesOpen)) break;
      if (pieceAlive(lv, s, j)) { out.push(j); break; } // prise
      out.push(j);
      x += dx; y += dy;
    }
  }
  return out;
}

export type MoveResult =
  | { ok: true; state: QueenState; path: number[]; captured?: number; teleported?: number; heart?: number; opened?: boolean; usedShield?: boolean }
  | { ok: false; reason: 'unreachable' | 'attacked' | 'defended' | 'portal' | 'limit' };

/** Joue un coup vers `to`. Ne modifie pas `s`. */
export function playQueen(lv: Lv, s: QueenState, to: number, limit: number): MoveResult {
  if (s.moves >= limit) return { ok: false, reason: 'limit' };
  if (!queenTargets(lv, s).includes(to)) return { ok: false, reason: 'unreachable' };
  const n: QueenState = { ...s, moves: s.moves + 1 };
  const isCapture = pieceAlive(lv, s, to);
  let captured: number | undefined;
  if (isCapture) { n.captured |= 1 << lv.pieceList.indexOf(to); captured = to; }
  const shieldOn = s.shield === 2;
  const att = attacked(lv, n);
  if (att.has(to) && !shieldOn) return { ok: false, reason: isCapture ? 'defended' : 'attacked' };
  n.pos = to;
  const path = [to];
  let teleported: number | undefined;
  const twin = lv.portals.get(to);
  if (twin !== undefined) {
    if (blocks(lv, n, twin)) return { ok: false, reason: 'portal' };
    if (att.has(twin) && !shieldOn) return { ok: false, reason: 'portal' };
    n.pos = twin;
    teleported = twin;
    path.push(twin);
  }
  let heart: number | undefined;
  const hk = lv.hearts.indexOf(n.pos);
  if (hk >= 0 && n.hearts & (1 << hk)) { n.hearts &= ~(1 << hk); heart = n.pos; }
  let opened = false;
  if (lv.plates.has(n.pos) && !n.gatesOpen) { n.gatesOpen = true; opened = true; }
  if (shieldOn) n.shield = 0;
  return { ok: true, state: n, path, captured, teleported, heart, opened, usedShield: shieldOn };
}

export const solved = (s: QueenState) => s.hearts === 0;

/** Coups légaux (cases d'arrivée) dans l'état actuel. */
export function legalTargets(lv: Lv, s: QueenState, limit: number): number[] {
  return queenTargets(lv, s).filter((t) => playQueen(lv, s, t, limit).ok);
}

/**
 * Solveur en largeur : nombre minimal de coups (le Bouclier peut être activé
 * gratuitement avant n'importe quel coup). Renvoie aussi une solution.
 */
export function solveQueen(p: QueenPuzzle, maxMoves = 30, from?: QueenState): { moves: number; line: { to: number; shield: boolean }[] } | null {
  const lv = parseQueen(p);
  const s0 = from ? { ...from, moves: 0 } : initialState(p, lv);
  if (solved(s0)) return { moves: 0, line: [] };
  const key = (s: QueenState) => `${s.pos}|${s.hearts}|${s.captured}|${s.gatesOpen ? 1 : 0}|${s.shield}`;
  type Node = { s: QueenState; line: { to: number; shield: boolean }[] };
  let frontier: Node[] = [{ s: s0, line: [] }];
  const seen = new Set([key(s0)]);
  for (let d = 0; d < maxMoves && frontier.length; d++) {
    const next: Node[] = [];
    for (const { s, line } of frontier) {
      const variants: [QueenState, boolean][] = [[s, false]];
      if (s.shield === 1) variants.push([{ ...s, shield: 2 }, true]);
      for (const [v, sh] of variants) {
        for (const t of queenTargets(lv, v)) {
          const r = playQueen(lv, v, t, maxMoves);
          if (!r.ok) continue;
          const nl = [...line, { to: t, shield: sh }];
          if (solved(r.state)) return { moves: d + 1, line: nl };
          const k = key(r.state);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push({ s: r.state, line: nl });
        }
      }
    }
    frontier = next;
  }
  return null;
}

// ------------------------------------------------------------- les puzzles

export const QUEEN_PUZZLES: QueenPuzzle[] = [
  {
    id: 'q1', title: 'Premiers pas', limit: 3,
    hint: 'La Reine va tout droit ou en diagonale, aussi loin qu\'elle veut.',
    steps: [
      'Touche la Reine (ou fais-la glisser) puis le cœur tout en haut : elle file en ligne droite.',
      'Bravo ! Maintenant le dernier cœur, en diagonale.',
    ],
    rows: [
      'h.....',
      '......',
      '......',
      '...h..',
      '......',
      'Q.....',
    ],
  },
  {
    id: 'q2', title: 'La tour qui surveille', limit: 4,
    hint: 'Les cases attaquées par la tour sont interdites pour finir un coup.',
    rows: [
      '...r..',
      '......',
      'h.....',
      '......',
      '.....h',
      'Q.....',
    ],
  },
  {
    id: 'q3', title: 'Une pièce seule', limit: 3,
    hint: 'Une pièce que personne ne protège peut être prise : ses attaques disparaissent.',
    rows: [
      'h.....',
      '......',
      '......',
      'h..b..',
      '......',
      '.....Q',
    ],
  },
  {
    id: 'q4', title: 'Les gardes du corps', limit: 5,
    hint: 'Une pièce protégée par une autre ne peut pas être prise.',
    rows: [
      'h....h',
      '...n..',
      '......',
      '...r..',
      '......',
      'Q.....',
    ],
  },
  {
    id: 'q5', title: 'Le jardin de pierre', limit: 4,
    hint: 'Les murs bloquent la Reine… et les attaques.',
    rows: [
      'h.....h',
      '.......',
      '.##.##.',
      '.#.r.#.',
      '.#####.',
      '.......',
      'Q.....h',
    ],
  },
  {
    id: 'q6', title: 'Les portails', limit: 4,
    hint: 'Finis un coup sur un portail : la Reine réapparaît sur son jumeau.',
    rows: [
      'h..#.h',
      '...#..',
      '2.1#..',
      '####..',
      '...#..',
      'Q.1#.2',
    ],
  },
  {
    id: 'q7', title: 'La dalle dorée', limit: 4,
    hint: 'Finis un coup sur la dalle pour ouvrir les grilles.',
    rows: [
      'h..G..h',
      '...#...',
      '...#...',
      'G###..g',
      '.......',
      '..p....',
      'Q......',
    ],
  },
  {
    id: 'q8', title: 'Le bouclier', limit: 2, shield: true,
    hint: 'Active le Bouclier : ton prochain coup peut finir sur une case attaquée. Une seule fois !',
    rows: [
      '...r...',
      '.......',
      '.......',
      '...h...',
      '.......',
      '.......',
      'Q.....h',
    ],
  },
  {
    id: 'q9', title: 'La cour du roi', limit: 7, shield: true,
    hint: 'Choisis bien le moment d\'utiliser ton Bouclier.',
    rows: [
      'h...k..h',
      '..#.....',
      '.....n..',
      '........',
      '#..b...#',
      '........',
      '.r.....h',
      'Q.......',
    ],
  },
  {
    id: 'q10', title: 'Le labyrinthe doré', limit: 8,
    hint: 'Dalle, portail, captures : tout le royaume est là.',
    rows: [
      'h..#...h',
      '...G....',
      '####.n..',
      '1..#....',
      '...#....',
      '.g.####.',
      '...#...1',
      'Q..#....',
    ],
  },
  {
    id: 'q11', title: 'La reine du royaume', limit: 6, shield: true,
    hint: 'Le dernier défi. Prends ton temps, ma reine.',
    rows: [
      'h.#...bh',
      '..#.....',
      '..G..q..',
      'g.#.....',
      '..####2.',
      '.r......',
      '2.....n.',
      'Q.h....h',
    ],
  },
];
