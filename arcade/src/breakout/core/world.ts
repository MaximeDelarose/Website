import { Rng } from "../../shared/rng.js";
import { BreakoutRules, type LevelData, type PowerUp } from "./rules.js";

/**
 * Monde du Breakout : raquette, balles, bonus tombants, lasers et collisions. Physique maison déterministe
 * (pas de moteur externe) : une balle avance par petits pas, rebondit à vitesse constante, et même graine +
 * mêmes entrées donnent exactement la même partie. Aucune dépendance au rendu ni à l'horloge.
 */

export const FIELD_W = 460;
export const FIELD_H = 700;
export const CELL_W = 46;
export const CELL_H = 24;
export const BRICK_TOP = 96; // haut de la rangée 0
export const PADDLE_Y = 656;
export const PADDLE_H = 14;
export const BASE_PADDLE_W = 92;
export const BALL_R = 8;

const WIDE_TICKS = 720;
const LASER_TICKS = 600;
const STICKY_TICKS = 900;
const LASER_COOLDOWN = 16;

/** Vitesse de la balle (pixels par tick) selon le niveau. */
export function speedFor(level: number): number {
  return Math.min(10, 7 + (level - 1) * 0.3);
}

/** Centre et taille d'une case de brique (la case entière sert aux collisions, sans trou entre briques). */
export function brickRect(row: number, col: number): { x: number; y: number; w: number; h: number } {
  return { x: col * CELL_W + CELL_W / 2, y: BRICK_TOP + row * CELL_H + CELL_H / 2, w: CELL_W, h: CELL_H };
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  stuck: boolean;
  /** Décalage horizontal par rapport au centre de la raquette quand la balle est collée. */
  stuckDx: number;
}

export interface Drop {
  power: PowerUp;
  x: number;
  y: number;
}

export interface Laser {
  x: number;
  y: number;
}

export type WorldEvent =
  | { type: "wall"; x: number; y: number }
  | { type: "paddle"; x: number; y: number; stuck: boolean }
  | { type: "brick"; row: number; col: number; x: number; y: number; points: number; destroyed: boolean; hitsLeft: number; maxHits: number; indestructible: boolean }
  | { type: "drop"; power: PowerUp; x: number; y: number }
  | { type: "power"; power: PowerUp }
  | { type: "launch" }
  | { type: "laser" }
  | { type: "lifeLost"; lives: number }
  | { type: "levelClear"; level: number; bonus: number }
  | { type: "levelStart"; level: number }
  | { type: "win"; score: number }
  | { type: "gameover"; score: number };

export class BreakoutWorld {
  readonly rules: BreakoutRules;
  paddleX = FIELD_W / 2;
  paddleW = BASE_PADDLE_W;
  balls: Ball[] = [];
  drops: Drop[] = [];
  lasers: Laser[] = [];
  timers = { wide: 0, laser: 0, sticky: 0, cool: 0 };
  /** Ticks restants de l'introduction d'un niveau (pour l'affichage). */
  intro = 0;
  /** Ticks écoulés depuis le début de la partie. */
  tick = 0;

  private rng: Rng;
  private targetX = FIELD_W / 2;
  private events: WorldEvent[] = [];

  constructor(levels: LevelData[], seed: number, dropChance?: number) {
    this.rng = new Rng(seed);
    this.rules = new BreakoutRules(levels, this.rng, dropChance);
    this.serve();
    this.events.push({ type: "levelStart", level: 1 });
    this.intro = 90;
  }

  get over(): boolean {
    return this.rules.over;
  }

  get won(): boolean {
    return this.rules.won;
  }

  get speed(): number {
    return speedFor(Math.min(this.rules.level, 10));
  }

  get paddleTargetW(): number {
    return this.timers.wide > 0 ? BASE_PADDLE_W * 1.5 : BASE_PADDLE_W;
  }

  /** Raquette vers x (souris, doigt) : elle y glisse en quelques ticks. */
  moveTo(x: number): void {
    this.targetX = x;
  }

  /** Raquette au clavier ou à la manette : décalage par tick. */
  nudge(dir: number): void {
    this.targetX += dir * 10;
  }

  /** Lance les balles collées, sinon tire si le laser est actif. */
  fire(): void {
    const stuck = this.balls.filter((b) => b.stuck);
    if (stuck.length > 0) {
      for (const b of stuck) this.release(b);
      this.events.push({ type: "launch" });
      return;
    }
    if (this.timers.laser > 0 && this.timers.cool <= 0) {
      const half = this.paddleW / 2 - 8;
      this.lasers.push({ x: this.paddleX - half, y: PADDLE_Y - 10 }, { x: this.paddleX + half, y: PADDLE_Y - 10 });
      this.timers.cool = LASER_COOLDOWN;
      this.events.push({ type: "laser" });
    }
  }

  /** Un tick (60 Hz). */
  step(): WorldEvent[] {
    if (this.over) return this.flush();
    this.tick++;
    if (this.intro > 0) this.intro--;
    for (const key of ["wide", "laser", "sticky", "cool"] as const) {
      if (this.timers[key] > 0) this.timers[key]--;
    }
    this.movePaddle();
    this.moveBalls();
    this.moveLasers();
    this.moveDrops();
    this.collect();
    return this.flush();
  }

  // ---------- raquette ----------

  private movePaddle(): void {
    const targetW = this.paddleTargetW;
    this.paddleW += (targetW - this.paddleW) * 0.25;
    if (Math.abs(targetW - this.paddleW) < 0.3) this.paddleW = targetW;
    const half = this.paddleW / 2;
    this.targetX = Math.max(half, Math.min(FIELD_W - half, this.targetX));
    const dx = (this.targetX - this.paddleX) * 0.6;
    this.paddleX += Math.max(-30, Math.min(30, dx));
    this.paddleX = Math.max(half, Math.min(FIELD_W - half, this.paddleX));
  }

  // ---------- balles ----------

  private serve(): void {
    const ball: Ball = { x: this.paddleX, y: PADDLE_Y - PADDLE_H / 2 - BALL_R, vx: 0, vy: 0, stuck: true, stuckDx: 0 };
    this.balls = [ball];
  }

  private release(ball: Ball): void {
    const rel = Math.max(-1, Math.min(1, ball.stuckDx / (this.paddleW / 2)));
    let angle = rel * (Math.PI / 3.2);
    if (Math.abs(angle) < 0.12) angle += (this.rng.next() < 0.5 ? -1 : 1) * 0.16;
    const s = this.speed;
    ball.stuck = false;
    ball.vx = Math.sin(angle) * s;
    ball.vy = -Math.cos(angle) * s;
  }

  private moveBalls(): void {
    const keep: Ball[] = [];
    for (const ball of this.balls) {
      if (ball.stuck) {
        ball.x = this.paddleX + ball.stuckDx;
        ball.y = PADDLE_Y - PADDLE_H / 2 - BALL_R;
        keep.push(ball);
        continue;
      }
      if (this.advance(ball)) keep.push(ball);
    }
    this.balls = keep;
    if (this.balls.length === 0) {
      this.rules.loseLife();
      this.clearPowers();
      if (!this.rules.over) this.serve();
    }
  }

  /** Avance la balle par petits pas ; renvoie faux si elle est tombée. */
  private advance(ball: Ball): boolean {
    const s = Math.hypot(ball.vx, ball.vy);
    const n = Math.max(1, Math.ceil(s / 3));
    for (let i = 0; i < n; i++) {
      ball.x += ball.vx / n;
      ball.y += ball.vy / n;
      this.wallBounce(ball);
      if (ball.vy > 0) this.paddleBounce(ball);
      if (ball.stuck) return true;
      this.brickBounce(ball);
      if (ball.y - BALL_R > FIELD_H + 24) return false;
    }
    return true;
  }

  private wallBounce(ball: Ball): void {
    if (ball.x < BALL_R) {
      ball.x = BALL_R;
      ball.vx = Math.abs(ball.vx);
      this.events.push({ type: "wall", x: 0, y: ball.y });
    } else if (ball.x > FIELD_W - BALL_R) {
      ball.x = FIELD_W - BALL_R;
      ball.vx = -Math.abs(ball.vx);
      this.events.push({ type: "wall", x: FIELD_W, y: ball.y });
    }
    if (ball.y < BALL_R) {
      ball.y = BALL_R;
      ball.vy = Math.abs(ball.vy);
      this.events.push({ type: "wall", x: ball.x, y: 0 });
    }
  }

  private paddleBounce(ball: Ball): void {
    const top = PADDLE_Y - PADDLE_H / 2;
    if (ball.y + BALL_R < top || ball.y - BALL_R > PADDLE_Y + PADDLE_H) return;
    const half = this.paddleW / 2;
    if (ball.x < this.paddleX - half - BALL_R * 0.6 || ball.x > this.paddleX + half + BALL_R * 0.6) return;
    const rel = Math.max(-1, Math.min(1, (ball.x - this.paddleX) / half));
    ball.y = top - BALL_R;
    if (this.timers.sticky > 0) {
      ball.stuck = true;
      ball.stuckDx = ball.x - this.paddleX;
      ball.vx = 0;
      ball.vy = 0;
      this.events.push({ type: "paddle", x: ball.x, y: top, stuck: true });
      return;
    }
    const angle = rel * (Math.PI / 3.1);
    const s = this.speed;
    ball.vx = Math.sin(angle) * s;
    ball.vy = -Math.cos(angle) * s;
    this.events.push({ type: "paddle", x: ball.x, y: top, stuck: false });
  }

  /** Cercle contre cases de briques : on traite la plus enfoncée, on renvoie la balle à vitesse constante. */
  private brickBounce(ball: Ball): void {
    let best: { row: number; col: number; nx: number; ny: number; pen: number } | null = null;
    for (const b of this.rules.bricks) {
      const r = brickRect(b.row, b.col);
      const cx = Math.max(r.x - r.w / 2, Math.min(ball.x, r.x + r.w / 2));
      const cy = Math.max(r.y - r.h / 2, Math.min(ball.y, r.y + r.h / 2));
      let dx = ball.x - cx;
      let dy = ball.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= BALL_R * BALL_R) continue;
      let pen: number;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        pen = BALL_R - d;
        dx /= d;
        dy /= d;
      } else {
        // centre dans la brique : on ressort par le côté le plus proche
        const left = ball.x - (r.x - r.w / 2);
        const right = r.x + r.w / 2 - ball.x;
        const topD = ball.y - (r.y - r.h / 2);
        const bottom = r.y + r.h / 2 - ball.y;
        const m = Math.min(left, right, topD, bottom);
        dx = m === left ? -1 : m === right ? 1 : 0;
        dy = m === topD ? -1 : m === bottom ? 1 : 0;
        pen = BALL_R + m;
      }
      if (!best || pen > best.pen) best = { row: b.row, col: b.col, nx: dx, ny: dy, pen };
    }
    if (!best) return;

    ball.x += best.nx * best.pen;
    ball.y += best.ny * best.pen;
    const dot = ball.vx * best.nx + ball.vy * best.ny;
    if (dot < 0) {
      ball.vx -= 2 * dot * best.nx;
      ball.vy -= 2 * dot * best.ny;
    }
    this.normalize(ball);

    const brick = this.rules.bricks.find((b) => b.row === best!.row && b.col === best!.col);
    const rect = brickRect(best.row, best.col);
    if (brick && brick.indestructible) {
      this.events.push({ type: "brick", row: best.row, col: best.col, x: rect.x, y: rect.y, points: 0, destroyed: false, hitsLeft: 1, maxHits: 1, indestructible: true });
    } else {
      this.rules.hit(best.row, best.col);
    }
  }

  /** Remet la vitesse au niveau voulu et empêche les trajectoires quasi horizontales. */
  private normalize(ball: Ball): void {
    const s = this.speed;
    let len = Math.hypot(ball.vx, ball.vy) || 1;
    ball.vx = (ball.vx / len) * s;
    ball.vy = (ball.vy / len) * s;
    const minVy = s * 0.22;
    if (Math.abs(ball.vy) < minVy) {
      ball.vy = (ball.vy < 0 ? -1 : 1) * minVy;
      len = Math.hypot(ball.vx, ball.vy);
      ball.vx = (ball.vx / len) * s;
      ball.vy = (ball.vy / len) * s;
    }
  }

  // ---------- lasers, bonus ----------

  private moveLasers(): void {
    this.lasers = this.lasers.filter((l) => {
      l.y -= 12;
      if (l.y < 0) return false;
      for (const b of this.rules.bricks) {
        const r = brickRect(b.row, b.col);
        if (Math.abs(l.x - r.x) <= r.w / 2 && Math.abs(l.y - r.y) <= r.h / 2) {
          if (b.indestructible) this.events.push({ type: "brick", row: b.row, col: b.col, x: r.x, y: r.y, points: 0, destroyed: false, hitsLeft: 1, maxHits: 1, indestructible: true });
          else this.rules.hit(b.row, b.col);
          return false;
        }
      }
      return true;
    });
  }

  private moveDrops(): void {
    this.drops = this.drops.filter((d) => {
      d.y += 2.6;
      const caught = d.y >= PADDLE_Y - PADDLE_H && d.y <= PADDLE_Y + PADDLE_H && Math.abs(d.x - this.paddleX) < this.paddleW / 2 + 12;
      if (caught) {
        this.applyPower(d.power);
        return false;
      }
      return d.y < FIELD_H + 30;
    });
  }

  private applyPower(power: PowerUp): void {
    this.events.push({ type: "power", power });
    if (power === "wide") this.timers.wide = WIDE_TICKS;
    else if (power === "laser") this.timers.laser = LASER_TICKS;
    else if (power === "sticky") this.timers.sticky = STICKY_TICKS;
    else {
      // multi : libère une balle collée si besoin, puis chaque balle en jeu en donne deux autres
      for (const b of this.balls.filter((x) => x.stuck)) this.release(b);
      for (const b of [...this.balls]) {
        const angle = Math.atan2(b.vy, b.vx);
        for (const dir of [-1, 1]) {
          const nb: Ball = { x: b.x, y: b.y, vx: 0, vy: 0, stuck: false, stuckDx: 0 };
          nb.vx = Math.cos(angle + dir * 0.4) * this.speed;
          nb.vy = Math.sin(angle + dir * 0.4) * this.speed;
          this.balls.push(nb);
        }
      }
    }
  }

  private clearPowers(): void {
    this.drops = [];
    this.lasers = [];
    this.timers = { wide: 0, laser: 0, sticky: 0, cool: 0 };
  }

  // ---------- règles ----------

  /** Traduit les événements des règles (briques, bonus, vies, niveaux) en événements du monde. */
  private collect(): void {
    for (const e of this.rules.flush()) {
      if (e.type === "hit") {
        const r = brickRect(e.row, e.col);
        const brick = this.rules.bricks.find((b) => b.row === e.row && b.col === e.col);
        this.events.push({ type: "brick", row: e.row, col: e.col, x: r.x, y: r.y, points: e.points, destroyed: e.destroyed, hitsLeft: brick ? brick.hits : 0, maxHits: brick ? brick.maxHits : 1, indestructible: false });
      } else if (e.type === "drop") {
        const r = brickRect(e.row, e.col);
        this.drops.push({ power: e.power, x: r.x, y: r.y });
        this.events.push({ type: "drop", power: e.power, x: r.x, y: r.y });
      } else if (e.type === "lifeLost") {
        this.events.push({ type: "lifeLost", lives: e.lives });
      } else if (e.type === "levelClear") {
        this.events.push({ type: "levelClear", level: e.level, bonus: e.bonus });
        this.clearPowers();
        this.serve();
        if (!this.rules.won) {
          this.intro = 90;
          this.events.push({ type: "levelStart", level: this.rules.level });
        }
      } else if (e.type === "win") {
        this.events.push({ type: "win", score: e.score });
      } else if (e.type === "gameover") {
        this.events.push({ type: "gameover", score: e.score });
      }
    }
  }

  private flush(): WorldEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}
