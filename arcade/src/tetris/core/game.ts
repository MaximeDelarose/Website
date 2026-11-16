import { Board, BOARD_H, HIDDEN_ROWS, cellValue } from "./board.js";
import { type Kind, KINDS, boxSize, cellsOf, kicksFor } from "./pieces.js";
import { Rng } from "../../shared/rng.js";

/**
 * Règles du Tetris, sans rendu ni horloge réelle. `step()` = une tick à 60 Hz.
 * Les actions (gauche, rotation, chute…) s'appliquent immédiatement ; les événements
 * (verrouillage, lignes, niveau, fin) sont renvoyés par le prochain `step()` pour le son et les effets.
 */

export type TetrisEvent =
  | { type: "move" }
  | { type: "rotate" }
  | { type: "lock"; hard: boolean; distance: number; kind: Kind; cells: Array<[number, number]> }
  | { type: "lines"; count: number; rows: number[]; combo: number; b2b: boolean }
  | { type: "level"; level: number }
  | { type: "hold" }
  | { type: "gameover"; score: number };

export interface Active {
  kind: Kind;
  rot: number;
  /** Ligne et colonne du coin haut-gauche de la boîte de la pièce. */
  row: number;
  col: number;
}

export interface TetrisConfig {
  /** Frames avant l'auto-répétition (DAS) et entre deux répétitions (ARR). Réglables. */
  das: number;
  arr: number;
  /** Frames de verrouillage après contact avec le sol. */
  lockDelay: number;
  /** Nombre maximal de remises à zéro du verrouillage par mouvement. */
  lockResets: number;
}

export const DEFAULT_CONFIG: TetrisConfig = { das: 10, arr: 2, lockDelay: 30, lockResets: 15 };

/** Frames d'animation pendant lesquelles les lignes pleines restent affichées avant de disparaître. */
export const CLEAR_FRAMES = 24;

/** Points de base par nombre de lignes (1 à 4), multipliés par le niveau. */
const LINE_POINTS = [0, 100, 300, 500, 800];

/** Frames entre deux descentes automatiques au niveau donné (formule de référence, arrondie à la frame). */
export function framesPerRow(level: number): number {
  const seconds = Math.pow(0.8 - (level - 1) * 0.007, level - 1);
  return Math.max(1, Math.round(seconds * 60));
}

export class TetrisGame {
  readonly board = new Board();
  readonly config: TetrisConfig;
  score = 0;
  lines = 0;
  level = 1;
  combo = -1;
  over = false;

  active: Active | null = null;
  hold: Kind | null = null;
  private canHold = true;
  private queue: Kind[] = [];
  private bag: Kind[] = [];
  private rng: Rng;

  private gravity = 0;
  private lockTimer = 0;
  private lockResetCount = 0;
  private softDrop = false;
  private held = { left: false, right: false };
  private dasLeft = 0;
  private dasRight = 0;
  private events: TetrisEvent[] = [];
  private clearTimer = 0;
  private lastWasTetris = false;
  /** Lignes pleines en cours d'effacement (indices du plateau), vide hors animation. */
  clearRows: number[] = [];

  constructor(seed: number, config: Partial<TetrisConfig> = {}) {
    this.rng = new Rng(seed);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fillQueue();
    this.spawn();
  }

  /** Vrai si la pièce en cours peut encore être mise en réserve. */
  get holdAvailable(): boolean {
    return this.canHold;
  }

  /** Avancement de l'animation d'effacement, de 0 à 1 (0 si aucune ligne en cours). */
  get clearProgress(): number {
    return this.clearTimer > 0 ? 1 - this.clearTimer / CLEAR_FRAMES : 0;
  }

  /** Les 3 prochaines pièces, pour l'aperçu. */
  get next(): Kind[] {
    return this.queue.slice(0, 3);
  }

  /** Ligne d'atterrissage de la pièce active (pour la pièce fantôme). */
  ghostRow(): number | null {
    if (!this.active) return null;
    let row = this.active.row;
    const cells = cellsOf(this.active.kind, this.active.rot);
    while (this.board.fits(cells, row + 1, this.active.col)) row++;
    return row;
  }

  setSoftDrop(on: boolean): void {
    this.softDrop = on;
  }

  /** Direction maintenue : appelée à chaque tick par la couche input. */
  setHeld(left: boolean, right: boolean): void {
    if (left && !this.held.left) {
      this.tryShift(-1);
      this.dasLeft = 0;
    }
    if (right && !this.held.right) {
      this.tryShift(1);
      this.dasRight = 0;
    }
    if (!left) this.dasLeft = 0;
    if (!right) this.dasRight = 0;
    this.held = { left, right };
  }

  moveLeft(): void {
    this.tryShift(-1);
  }

  moveRight(): void {
    this.tryShift(1);
  }

  rotate(dir: 1 | -1): void {
    if (!this.active || this.over) return;
    const from = this.active.rot;
    const to = (from + dir + 4) % 4;
    const cells = cellsOf(this.active.kind, to);
    for (const [dx, dy] of kicksFor(this.active.kind, from, to)) {
      const row = this.active.row - dy; // y SRS vers le haut
      const col = this.active.col + dx;
      if (this.board.fits(cells, row, col)) {
        this.active = { ...this.active, rot: to, row, col };
        this.touchLock();
        this.events.push({ type: "rotate" });
        return;
      }
    }
  }

  hardDrop(): void {
    if (!this.active || this.over) return;
    let dropped = 0;
    const cells = cellsOf(this.active.kind, this.active.rot);
    while (this.board.fits(cells, this.active.row + 1, this.active.col)) {
      this.active.row++;
      dropped++;
    }
    this.score += dropped * 2;
    this.lock(true, dropped);
  }

  holdPiece(): void {
    if (!this.active || this.over || !this.canHold) return;
    const current = this.active.kind;
    if (this.hold === null) {
      this.hold = current;
      this.spawn();
    } else {
      const swapped = this.hold;
      this.hold = current;
      this.spawn(swapped);
    }
    this.canHold = false;
    this.events.push({ type: "hold" });
  }

  /** Une tick : DAS/ARR, gravité ou chute rapide, verrouillage. */
  step(): TetrisEvent[] {
    if (this.clearTimer > 0) {
      this.clearTimer--;
      if (this.clearTimer === 0) {
        this.board.removeRows(this.clearRows);
        this.clearRows = [];
        this.spawn();
      }
      return this.flush();
    }
    if (this.over || !this.active) return this.flush();

    this.autoRepeat();

    const perRow = this.softDrop ? 2 : framesPerRow(this.level);
    this.gravity++;
    if (this.gravity >= perRow) {
      this.gravity = 0;
      if (this.board.fits(cellsOf(this.active.kind, this.active.rot), this.active.row + 1, this.active.col)) {
        this.active.row++;
        if (this.softDrop) this.score += 1;
        this.lockTimer = 0;
      }
    }

    if (this.grounded()) {
      this.lockTimer++;
      if (this.lockTimer >= this.config.lockDelay) this.lock(false);
    } else {
      this.lockTimer = 0;
    }
    return this.flush();
  }

  private autoRepeat(): void {
    const dir = this.held.left && !this.held.right ? -1 : this.held.right && !this.held.left ? 1 : 0;
    if (dir === 0) return;
    if (dir === -1) this.dasLeft++;
    else this.dasRight++;
    const counter = dir === -1 ? this.dasLeft : this.dasRight;
    if (counter > this.config.das) {
      const sinceDas = counter - this.config.das;
      if (sinceDas % Math.max(1, this.config.arr) === 0) this.tryShift(dir);
    }
  }

  private tryShift(dx: number): void {
    if (!this.active || this.over) return;
    const cells = cellsOf(this.active.kind, this.active.rot);
    if (this.board.fits(cells, this.active.row, this.active.col + dx)) {
      this.active.col += dx;
      this.touchLock();
      this.events.push({ type: "move" });
    }
  }

  private grounded(): boolean {
    if (!this.active) return false;
    return !this.board.fits(cellsOf(this.active.kind, this.active.rot), this.active.row + 1, this.active.col);
  }

  /** Remise à zéro du verrouillage après un mouvement au sol, dans la limite de `lockResets`. */
  private touchLock(): void {
    if (this.grounded() && this.lockResetCount < this.config.lockResets) {
      this.lockTimer = 0;
      this.lockResetCount++;
    }
  }

  private lock(hard: boolean, distance = 0): void {
    if (!this.active) return;
    const { kind, rot, row, col } = this.active;
    const cells = cellsOf(kind, rot);
    this.board.place(cells, row, col, cellValue(kind));
    this.events.push({ type: "lock", hard, distance, kind, cells: cells.map(([dr, dc]) => [row + dr, col + dc] as [number, number]) });

    const rows = this.board.fullRows();
    this.canHold = true;
    if (rows.length === 0) {
      this.combo = -1;
      this.spawn();
      return;
    }

    const count = rows.length;
    this.combo++;
    this.lines += count;
    let points = LINE_POINTS[count] * this.level;
    const b2b = count === 4 && this.lastWasTetris;
    if (b2b) points = Math.floor(points * 1.5);
    this.lastWasTetris = count === 4;
    this.score += points;
    if (this.combo > 0) this.score += 50 * this.combo * this.level;
    this.events.push({ type: "lines", count, rows: [...rows], combo: this.combo, b2b });
    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.events.push({ type: "level", level: newLevel });
    }
    // Les lignes restent visibles pendant l'animation, puis step() les retire et fait apparaître la pièce suivante.
    this.clearRows = rows;
    this.clearTimer = CLEAR_FRAMES;
    this.active = null;
  }

  private spawn(kind?: Kind): void {
    const k = kind ?? this.takeFromQueue();
    const origin = { kind: k, rot: 0, row: 1, col: Math.floor((10 - boxSize(k)) / 2) };
    this.active = origin;
    this.gravity = 0;
    this.lockTimer = 0;
    this.lockResetCount = 0;
    if (!this.board.fits(cellsOf(k, 0), origin.row, origin.col)) {
      this.over = true;
      this.active = null;
      this.events.push({ type: "gameover", score: this.score });
    }
  }

  private takeFromQueue(): Kind {
    this.fillQueue();
    return this.queue.shift() as Kind;
  }

  /** Sac de 7 : chaque pièce apparaît une fois par sac, ordre mélangé. */
  private fillQueue(): void {
    while (this.queue.length < 4) {
      if (this.bag.length === 0) this.bag = this.rng.shuffle([...KINDS]);
      this.queue.push(this.bag.pop() as Kind);
    }
  }

  private flush(): TetrisEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Vue pour le rendu : plateau (lignes cachées incluses, à ignorer à l'affichage). */
  get rows(): number {
    return BOARD_H - HIDDEN_ROWS;
  }
}
