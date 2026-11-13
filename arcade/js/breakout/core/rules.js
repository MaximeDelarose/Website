/**
 * Règles du Breakout (sans physique ni rendu).
 * Grille de niveau : '.' vide, '1' à '3' = briques à N coups, 'X' = indestructible.
 */
export const COLS = 10;
export const MAX_LEVELS = 10;
export const START_LIVES = 3;
const POWERUPS = ["wide", "multi", "laser", "sticky"];
/** Transforme les lignes du niveau en briques (ignore les cases vides). */
export function parseLevel(level) {
    const bricks = [];
    level.rows.forEach((line, row) => {
        for (let col = 0; col < Math.min(COLS, line.length); col++) {
            const ch = line[col];
            if (ch === ".")
                continue;
            if (ch === "X") {
                bricks.push({ row, col, hits: 1, maxHits: 1, indestructible: true });
            }
            else if (ch >= "1" && ch <= "3") {
                const n = Number(ch);
                bricks.push({ row, col, hits: n, maxHits: n, indestructible: false });
            }
        }
    });
    return bricks;
}
export class BreakoutRules {
    constructor(levels, rng, dropChance = 0.12) {
        this.levels = levels;
        this.rng = rng;
        this.dropChance = dropChance;
        this.score = 0;
        this.lives = START_LIVES;
        this.level = 1;
        this.events = [];
        this.bricks = parseLevel(levels[0]);
    }
    get won() {
        return this.level > MAX_LEVELS;
    }
    get over() {
        return this.lives <= 0 || this.won;
    }
    /** Briques à détruire pour finir le niveau (les indestructibles ne comptent pas). */
    get remaining() {
        return this.bricks.filter((b) => !b.indestructible).length;
    }
    /** Coup sur la brique (row, col). Renvoie vrai si la brique a été détruite. */
    hit(row, col) {
        const brick = this.bricks.find((b) => b.row === row && b.col === col);
        if (!brick || brick.indestructible)
            return false;
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
            if (this.remaining === 0)
                this.clearLevel();
        }
        return destroyed;
    }
    /** La balle est tombée sous la raquette. */
    loseLife() {
        this.lives--;
        this.events.push({ type: "lifeLost", lives: this.lives });
        if (this.lives <= 0)
            this.events.push({ type: "gameover", score: this.score });
    }
    clearLevel() {
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
    flush() {
        const out = this.events;
        this.events = [];
        return out;
    }
}
