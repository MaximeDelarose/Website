import type { Rng } from "../../shared/rng.js";

/**
 * Règles du Breakout (sans physique ni rendu).
 * Grille de niveau : '.' vide, '1' à '3' = briques à N coups, 'X' = indestructible.
 */

export const COLS = 10;
export const MAX_LEVELS = 10;
export const START_LIVES = 3;

export type PowerUp = "wide" | "multi" | "laser" | "sticky";
const POWERUPS: PowerUp[] = ["wide", "multi", "laser", "sticky"];

export interface LevelData {
  name: string;
  rows: string[];
}

export interface Brick {
  row: number;
  col: number;
  hits: number;
  /** Coups d'origine : sert au calcul des points (10 par coup). */
  maxHits: number;
  indestructible: boolean;
}

/** Transforme les lignes du niveau en briques (ignore les cases vides). */
export function parseLevel(level: LevelData): Brick[] {
  const bricks: Brick[] = [];
  level.rows.forEach((line, row) => {
    for (let col = 0; col < Math.min(COLS, line.length); col++) {
      const ch = line[col];
      if (ch === ".") continue;
      if (ch === "X") {
        bricks.push({ row, col, hits: 1, maxHits: 1, indestructible: true });
      } else if (ch >= "1" && ch <= "3") {
        const n = Number(ch);
        bricks.push({ row, col, hits: n, maxHits: n, indestructible: false });
      }
    }
  });
  return bricks;
}

export type BreakoutEvent =
  | { type: "hit"; row: number; col: number; points: number; destroyed: boolean }
  | { type: "drop"; power: PowerUp; row: number; col: number }
  | { type: "lifeLost"; lives: number }
  | { type: "levelClear"; level: number; bonus: number }
  | { type: "win"; score: number }
  | { type: "gameover"; score: number };

export class BreakoutRules {
  score = 0;
  lives = START_LIVES;
  level = 1;
  bricks: Brick[];
  private events: BreakoutEvent[] = [];

  constructor(
    private readonly levels: LevelData[],
    private readonly rng: Rng,
    private readonly dropChance = 0.12,
  ) {
    this.bricks = parseLevel(levels[0]);
  }

  get won(): boolean {
    return this.level > MAX_LEVELS;
  }

  get over(): boolean {
    return this.lives <= 0 || this.won;
  }

  /** Briques à détruire pour finir le niveau (les indestructibles ne comptent pas). */
  get remaining(): number {
    return this.bricks.filter((b) => !b.indestructible).length;
  }

  /** Coup sur la brique (row, col). Renvoie vrai si la brique a été détruite. */
  hit(row: number, col: number): boolean {
    const brick = this.bricks.find((b) => b.row === row && b.col === col);
    if (!brick || brick.indestructible) return false;
    brick.hits--;
    const destroyed = brick.hits <= 0;
    const points = destroyed ? 10 * brick.maxHits : 0;
    this.score += points;
    this.events.push({ type: "hit", row, col, points, destroyed });
    if (destroyed) {
      this.bricks = this.bricks.filter((b) => b !== brick);
      if (this.rng.next() < this.dropChance) {
        const power = POWERUPS[this.rng.int(POWERUPS.length)];
        this.events.push({ type: "drop", power, row, col });
      }
      if (this.remaining === 0) this.clearLevel();
    }
    return destroyed;
  }

  /** La balle est tombée sous la raquette. */
  loseLife(): void {
    this.lives--;
    this.events.push({ type: "lifeLost", lives: this.lives });
    if (this.lives <= 0) this.events.push({ type: "gameover", score: this.score });
  }

  private clearLevel(): void {
    const bonus = 100 * this.level;
    this.score += bonus;
    this.events.push({ type: "levelClear", level: this.level, bonus });
    this.level++;
    if (this.won) {
      this.events.push({ type: "win", score: this.score });
      this.bricks = [];
      return;
    }
    this.bricks = parseLevel(this.levels[this.level - 1]);
  }

  flush(): BreakoutEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}
