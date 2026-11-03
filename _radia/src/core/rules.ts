/* Règles officielles : chess.js valide chaque coup ; ce module ajoute ce que la FIDE
   prévoit en plus (quintuple répétition et 75 coups automatiques, nulles réclamables,
   possibilité de mater pour la perte au temps). Aucune dépendance au DOM. */
import { Chess, type Move, type Square, type PieceSymbol, type Color } from "chess.js";

export type { Square, PieceSymbol, Color, Move };

export type EndReason =
  | "checkmate" | "stalemate" | "insufficient" | "fivefold" | "seventyfive"
  | "threefold" | "fifty" | "timeout" | "timeout-insufficient" | "resign";

export interface Outcome {
  /** Vainqueur, ou null pour une nulle. */
  winner: Color | null;
  reason: EndReason;
}

export interface MoveInput { from: Square; to: Square; promotion?: PieceSymbol }

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Clé de position pour les répétitions : placement, trait, roques, prise en passant. */
export function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export class ChessGame {
  readonly chess: Chess;
  private readonly counts = new Map<string, number>();
  private readonly startFen: string;

  constructor(fen?: string) {
    this.chess = fen ? new Chess(fen) : new Chess();
    this.startFen = this.chess.fen();
    this.bump();
  }

  /** Rejoue une partie depuis une liste de coups UCI (reprise d'une sauvegarde). */
  static fromUci(moves: string[], fen?: string): ChessGame {
    const g = new ChessGame(fen);
    for (const u of moves) if (!g.play(uciToInput(u))) break;
    return g;
  }

  private bump(): void {
    const k = positionKey(this.chess.fen());
    this.counts.set(k, (this.counts.get(k) ?? 0) + 1);
  }

  get turn(): Color { return this.chess.turn(); }
  get fen(): string { return this.chess.fen(); }
  get initialFen(): string { return this.startFen; }

  legalFrom(square: Square): Move[] {
    return this.chess.moves({ square, verbose: true });
  }
  allLegal(): Move[] { return this.chess.moves({ verbose: true }); }

  isLegal(m: MoveInput): boolean {
    return this.legalFrom(m.from).some((x) => x.to === m.to && (!x.promotion || !m.promotion || x.promotion === m.promotion));
  }

  needsPromotion(from: Square, to: Square): boolean {
    return this.legalFrom(from).some((x) => x.to === to && !!x.promotion);
  }

  /** Joue un coup s'il est légal ; renvoie le coup détaillé ou null (jamais d'exception). */
  play(m: MoveInput): Move | null {
    if (!this.isLegal(m)) return null;
    try {
      const mv = this.chess.move({ from: m.from, to: m.to, promotion: m.promotion ?? "q" });
      this.bump();
      return mv;
    } catch {
      return null;
    }
  }

  history(): Move[] { return this.chess.history({ verbose: true }); }
  uciHistory(): string[] { return this.history().map((m) => m.from + m.to + (m.promotion ?? "")); }
  sanHistory(): string[] { return this.chess.history(); }

  inCheck(): boolean { return this.chess.inCheck(); }

  kingSquare(color: Color): Square | null {
    return this.chess.findPiece({ type: "k", color })[0] ?? null;
  }

  repetitions(): number { return this.counts.get(positionKey(this.chess.fen())) ?? 0; }
  halfmoveClock(): number { return Number(this.chess.fen().split(" ")[4]) || 0; }

  /** Fin de partie imposée par l'échiquier (sans pendule ni abandon). */
  outcome(): Outcome | null {
    const c = this.chess;
    if (c.isCheckmate()) return { winner: c.turn() === "w" ? "b" : "w", reason: "checkmate" };
    if (c.isStalemate()) return { winner: null, reason: "stalemate" };
    if (c.isInsufficientMaterial()) return { winner: null, reason: "insufficient" };
    if (this.repetitions() >= 5) return { winner: null, reason: "fivefold" };
    if (this.halfmoveClock() >= 150) return { winner: null, reason: "seventyfive" };
    return null;
  }

  /** Nulle que le joueur au trait peut réclamer (triple répétition, 50 coups). */
  claimableDraw(): "threefold" | "fifty" | null {
    if (this.repetitions() >= 3) return "threefold";
    if (this.halfmoveClock() >= 100) return "fifty";
    return null;
  }

  material(color: Color): number {
    let s = 0;
    for (const row of this.chess.board()) for (const p of row) if (p && p.color === color) s += PIECE_VALUE[p.type];
    return s;
  }

  /**
   * La couleur `color` peut-elle encore mater par une suite de coups légaux ?
   * Sert à la perte au temps (FIDE 6.9) : si l'adversaire de celui qui tombe
   * ne peut pas mater, la partie est nulle.
   */
  canMate(color: Color): boolean {
    const mine: PieceSymbol[] = [];
    let theirs = 0;
    const bishopsSq: number[] = [];
    this.chess.board().forEach((row, r) => row.forEach((p, f) => {
      if (!p || p.type === "k") return;
      if (p.color === color) { mine.push(p.type); if (p.type === "b") bishopsSq.push((r + f) % 2); }
      else theirs++;
    }));
    if (mine.length === 0) return false;
    if (mine.some((t) => t === "p" || t === "r" || t === "q")) return true;
    // uniquement des pièces mineures
    if (mine.length >= 2) {
      // fous tous sur la même couleur et rien d'autre : mat impossible sans aide adverse
      const onlyBishops = mine.every((t) => t === "b");
      if (onlyBishops && new Set(bishopsSq).size === 1) return theirs > 0;
      return true;
    }
    // un seul cavalier ou fou : il faut que l'adversaire ait du matériel pour s'enfermer
    return theirs > 0;
  }

  /** Résultat officiel quand la pendule de `flagged` tombe. */
  timeoutOutcome(flagged: Color): Outcome {
    const other: Color = flagged === "w" ? "b" : "w";
    return this.canMate(other) ? { winner: other, reason: "timeout" } : { winner: null, reason: "timeout-insufficient" };
  }

  boardArray() { return this.chess.board(); }
  get(square: Square) { return this.chess.get(square); }
}

export function uciToInput(u: string): MoveInput {
  return {
    from: u.slice(0, 2) as Square,
    to: u.slice(2, 4) as Square,
    promotion: (u[4] as PieceSymbol | undefined) || undefined,
  };
}

export const FILES = "abcdefgh";
export function squareAt(file: number, rank: number): Square {
  return (FILES[file] + (rank + 1)) as Square;
}
export function squareCoords(sq: Square): { file: number; rank: number } {
  return { file: sq.charCodeAt(0) - 97, rank: Number(sq[1]) - 1 };
}
