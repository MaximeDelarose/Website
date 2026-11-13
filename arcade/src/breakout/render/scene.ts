import type PhaserType from "phaser";
import type MatterType from "matter-js";
import { Phaser, Matter } from "../../shared/engines.js";
import { readPad } from "../../shared/gamepad.js";
import { loadBest, saveBest } from "../../shared/storage.js";
import { tone } from "../../shared/audio.js";
import { Rng } from "../../shared/rng.js";
import { readSeed } from "../../shared/seed.js";
import { BreakoutRules, COLS, type LevelData, type BreakoutEvent, type PowerUp } from "../core/rules.js";

const TOP = 50; // bande HUD ; le terrain commence à y = TOP
const W = 400;
const H = 560;
const PADDLE_Y = 520;
const PADDLE_BASE_W = 80;
const SUBSTEPS = 4;
const TICK_MS = 1000 / 60;
const BEST_KEY = "arcade.breakout.best";
const BRICK_W = 36;
const BRICK_H = 16;
const CELL_W = 40;
const CELL_H = 20;
const BRICK_TOP = 70;
const FLOOR_Y = 590;

const COLORS = { 1: 0x5fd35f, 2: 0xf2d43a, 3: 0xf0505a, X: 0x5b6478 };
const POWER_COLORS: Record<PowerUp, number> = { wide: 0x34d8f0, multi: 0xb363e8, laser: 0xf0505a, sticky: 0xf39a3a };
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

const brickCenter = (r: number, c: number) => ({ x: c * CELL_W + CELL_W / 2, y: BRICK_TOP + r * CELL_H });

interface Drop { power: PowerUp; x: number; y: number }
interface Laser { x: number; y: number }

export class BreakoutScene extends Phaser.Scene {
  private levels: LevelData[] = [];
  private rules!: BreakoutRules;
  private engine!: MatterType.Engine;
  private paddle!: MatterType.Body;
  private paddleX = W / 2;
  private paddleW = PADDLE_BASE_W;
  private lastPointerX = -1;
  private balls: MatterType.Body[] = [];
  private stuck: MatterType.Body | null = null;
  private brickBodies = new Map<string, MatterType.Body>();
  private drops: Drop[] = [];
  private lasers: Laser[] = [];
  private timers = { wide: 0, laser: 0, sticky: 0, laserCool: 0 };
  private fireQueued = false;
  private pending: Array<() => void> = [];
  private acc = 0;
  private best = 0;
  private state: "playing" | "over" | "won" = "playing";
  private popups: Array<{ text: PhaserType.GameObjects.Text; life: number }> = [];
  private gfx!: PhaserType.GameObjects.Graphics;
  private hud!: { score: PhaserType.GameObjects.Text; best: PhaserType.GameObjects.Text; lives: PhaserType.GameObjects.Text; level: PhaserType.GameObjects.Text; msg: PhaserType.GameObjects.Text };
  private keys!: Record<"left" | "left2" | "right" | "right2" | "fire" | "fire2" | "restart", PhaserType.Input.Keyboard.Key>;
  private rng!: Rng;

  constructor() {
    super("breakout");
  }

  create(): void {
    this.gfx = this.add.graphics();
    this.gfx.y = TOP;
    const style = (size: number, color = 0xe8ecf4): PhaserType.Types.GameObjects.Text.TextStyle => ({ fontFamily: "monospace", fontSize: `${size}px`, color: hex(color) });
    this.hud = {
      score: this.add.text(10, 12, "", style(16)),
      best: this.add.text(10, 32, "", style(11, 0x7a8294)),
      lives: this.add.text(230, 12, "", style(16)),
      level: this.add.text(230, 32, "", style(11, 0x7a8294)),
      msg: this.add.text(W / 2, TOP + 330, "", style(15, 0x7a8294)).setOrigin(0.5).setDepth(10),
    };
    this.keys = this.input.keyboard!.addKeys({
      left: "LEFT", left2: "A", right: "RIGHT", right2: "D", fire: "SPACE", fire2: "UP", restart: "R",
    }) as unknown as typeof this.keys;
    this.input.on("pointerdown", () => {
      this.fireQueued = true;
    });
    this.loadLevels().then(() => this.newGame());
  }

  private async loadLevels(): Promise<void> {
    const res = await fetch("data/levels.json");
    const json = (await res.json()) as { levels: LevelData[] };
    this.levels = json.levels;
  }

  private newGame(): void {
    this.best = loadBest(BEST_KEY);
    this.rng = new Rng(readSeed());
    this.rules = new BreakoutRules(this.levels, this.rng);
    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
    const wallOpts = { isStatic: true, restitution: 1, friction: 0, label: "wall" };
    Matter.Composite.add(this.engine.world, [
      Matter.Bodies.rectangle(-10, H / 2, 20, H * 2, wallOpts),
      Matter.Bodies.rectangle(W + 10, H / 2, 20, H * 2, wallOpts),
      Matter.Bodies.rectangle(W / 2, -10, W * 2, 20, wallOpts),
      Matter.Bodies.rectangle(W / 2, FLOOR_Y, W * 2, 30, { isStatic: true, isSensor: true, label: "floor" }),
    ]);
    this.paddle = Matter.Bodies.rectangle(this.paddleX, PADDLE_Y, this.paddleW, 12, { isStatic: true, restitution: 1, friction: 0, label: "paddle" });
    Matter.Composite.add(this.engine.world, this.paddle);
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) this.onPair(pair.bodyA, pair.bodyB);
    });
    this.buildBricks();
    this.spawnBall(true);
    this.state = "playing";
    this.drops = [];
    this.lasers = [];
    this.timers = { wide: 0, laser: 0, sticky: 0, laserCool: 0 };
  }

  private buildBricks(): void {
    for (const body of this.brickBodies.values()) Matter.Composite.remove(this.engine.world, body);
    this.brickBodies.clear();
    for (const b of this.rules.bricks) {
      const { x, y } = brickCenter(b.row, b.col);
      const body = Matter.Bodies.rectangle(x, y, BRICK_W, BRICK_H, { isStatic: true, restitution: 1, friction: 0, label: `brick:${b.row}:${b.col}` });
      this.brickBodies.set(`${b.row}:${b.col}`, body);
      Matter.Composite.add(this.engine.world, body);
    }
  }

  private speed(): number {
    return 5.2 + (this.rules.level - 1) * 0.15;
  }

  private makeBall(x: number, y: number): MatterType.Body {
    return Matter.Bodies.circle(x, y, 6, { restitution: 1, friction: 0, frictionAir: 0, inertia: Infinity, label: "ball" });
  }

  /** Balle collée à la raquette (début de niveau, perte de vie, ou effet collant). */
  private spawnBall(sticky: boolean): void {
    const ball = this.makeBall(this.paddleX, PADDLE_Y - 12);
    this.balls.push(ball);
    Matter.Composite.add(this.engine.world, ball);
    if (sticky) this.stuck = ball;
  }

  private launch(ball: MatterType.Body, angle = -Math.PI / 2 + (this.rng.next() - 0.5) * 0.6): void {
    const s = this.speed() / SUBSTEPS;
    Matter.Body.setVelocity(ball, { x: Math.cos(angle) * s, y: Math.sin(angle) * s });
  }

  update(_time: number, delta: number): void {
    if (!this.engine) {
      this.hud?.msg?.setText("chargement…");
      return;
    }
    if (this.state !== "playing") {
      const jd = Phaser.Input.Keyboard.JustDown;
      if (jd(this.keys.restart) || jd(this.keys.fire) || this.fireQueued) {
        this.fireQueued = false;
        this.newGame();
      }
      this.render();
      return;
    }
    this.acc += delta;
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      this.tick();
      if (this.state !== "playing") break;
    }
    this.render();
  }

  private tick(): void {
    const pad = readPad();
    const left = this.keys.left.isDown || this.keys.left2.isDown || (pad?.x ?? 0) < 0;
    const right = this.keys.right.isDown || this.keys.right2.isDown || (pad?.x ?? 0) > 0;
    const ptr = this.input.activePointer;
    if (ptr.x !== this.lastPointerX && ptr.isDown) this.setPaddleX(ptr.x);
    this.lastPointerX = ptr.x;
    if (left) this.setPaddleX(this.paddleX - 6);
    if (right) this.setPaddleX(this.paddleX + 6);

    const jd = Phaser.Input.Keyboard.JustDown;
    const fire = jd(this.keys.fire) || jd(this.keys.fire2) || this.fireQueued || (pad ? pad.buttons[0] : false);
    this.fireQueued = false;
    if (fire) this.onFire();

    this.tickTimers();
    this.moveDrops();
    this.moveLasers();

    for (let s = 0; s < SUBSTEPS; s++) {
      if (this.stuck) {
        Matter.Body.setPosition(this.stuck, { x: this.paddleX, y: PADDLE_Y - 12 });
        Matter.Body.setVelocity(this.stuck, { x: 0, y: 0 });
      }
      Matter.Engine.update(this.engine, TICK_MS / SUBSTEPS);
      for (const b of this.balls) {
        if (b === this.stuck) continue;
        const v = b.velocity;
        const sp = Math.hypot(v.x, v.y);
        const target = this.speed() / SUBSTEPS;
        if (sp > 0) Matter.Body.setVelocity(b, { x: (v.x / sp) * target, y: (v.y / sp) * target });
      }
      this.flushPending();
      if (this.state !== "playing") break;
    }
    this.flushEvents();
  }

  private setPaddleX(x: number): void {
    this.paddleX = Math.max(this.paddleW / 2, Math.min(W - this.paddleW / 2, x));
    Matter.Body.setPosition(this.paddle, { x: this.paddleX, y: PADDLE_Y });
  }

  private onFire(): void {
    if (this.stuck) {
      const ball = this.stuck;
      this.stuck = null;
      this.launch(ball, -Math.PI / 2 + ((this.paddleX - W / 2) / W) * 0.3);
      return;
    }
    if (this.timers.laser > 0 && this.timers.laserCool <= 0) {
      this.lasers.push({ x: this.paddleX - this.paddleW / 2 + 6, y: PADDLE_Y - 8 }, { x: this.paddleX + this.paddleW / 2 - 6, y: PADDLE_Y - 8 });
      this.timers.laserCool = 18;
      tone(1200, 0.03, { vol: 0.02, freqEnd: 400, type: "square" });
    }
  }

  private tickTimers(): void {
    if (this.timers.laserCool > 0) this.timers.laserCool--;
    for (const key of ["wide", "laser", "sticky"] as const) {
      if (this.timers[key] > 0) {
        this.timers[key]--;
        if (this.timers[key] === 0) this.endPower(key);
      }
    }
  }

  private endPower(key: "wide" | "laser" | "sticky"): void {
    if (key === "wide") {
      Matter.Body.scale(this.paddle, 1 / 1.5, 1);
      this.paddleW = PADDLE_BASE_W;
    }
  }

  private applyPower(power: PowerUp): void {
    tone(660, 0.12, { vol: 0.04, freqEnd: 990, type: "triangle" });
    this.popup(power.toUpperCase(), POWER_COLORS[power]);
    if (power === "wide") {
      if (this.timers.wide === 0) {
        Matter.Body.scale(this.paddle, 1.5, 1);
        this.paddleW = PADDLE_BASE_W * 1.5;
      }
      this.timers.wide = 720;
    } else if (power === "laser") {
      this.timers.laser = 600;
    } else if (power === "sticky") {
      this.timers.sticky = 900;
    } else if (power === "multi") {
      const current = this.balls.filter((b) => b !== this.stuck);
      for (const b of current) {
        for (const dir of [-1, 1]) {
          const nb = this.makeBall(b.position.x, b.position.y);
          this.balls.push(nb);
          Matter.Composite.add(this.engine.world, nb);
          const a = Math.atan2(b.velocity.y, b.velocity.x) + dir * 0.35;
          this.launch(nb, a);
        }
      }
      if (current.length === 0 && this.stuck) this.launch(this.spawnExtra(), -Math.PI / 2 - 0.3);
    }
  }

  private spawnExtra(): MatterType.Body {
    const nb = this.makeBall(this.paddleX, PADDLE_Y - 12);
    this.balls.push(nb);
    Matter.Composite.add(this.engine.world, nb);
    return nb;
  }

  private moveDrops(): void {
    this.drops = this.drops.filter((d) => {
      d.y += 2.2;
      const caught = d.y >= PADDLE_Y - 8 && d.y <= PADDLE_Y + 12 && Math.abs(d.x - this.paddleX) < this.paddleW / 2;
      if (caught) {
        this.applyPower(d.power);
        return false;
      }
      return d.y < H + 20;
    });
  }

  private moveLasers(): void {
    this.lasers = this.lasers.filter((l) => {
      l.y -= 8;
      if (l.y < 0) return false;
      const row = Math.floor((l.y - BRICK_TOP + CELL_H / 2) / CELL_H);
      const col = Math.floor(l.x / CELL_W);
      if (row < 0 || col < 0 || col >= COLS) return true;
      const brick = this.rules.bricks.find((b) => b.row === row && b.col === col);
      if (brick && !brick.indestructible) {
        this.rules.hit(row, col);
        return false;
      }
      return !(brick?.indestructible);
    });
  }

  private onPair(a: MatterType.Body, b: MatterType.Body): void {
    const ball = a.label === "ball" ? a : b.label === "ball" ? b : null;
    if (!ball) return;
    const other = ball === a ? b : a;
    const label = other.label;
    if (label === "paddle") {
      this.pending.push(() => {
        const rel = Math.max(-1, Math.min(1, (ball.position.x - this.paddleX) / (this.paddleW / 2)));
        const angle = -Math.PI / 2 + rel * (Math.PI / 3);
        if (this.timers.sticky > 0 && !this.stuck) {
          this.stuck = ball;
        } else if (this.stuck !== ball) {
          this.launch(ball, angle);
        }
        tone(330, 0.03, { vol: 0.03, type: "triangle" });
      });
    } else if (label.startsWith("brick:")) {
      const [, r, c] = label.split(":");
      this.pending.push(() => {
        const row = Number(r);
        const col = Number(c);
        if (this.rules.hit(row, col)) {
          const key = `${row}:${col}`;
          const body = this.brickBodies.get(key);
          if (body) {
            Matter.Composite.remove(this.engine.world, body);
            this.brickBodies.delete(key);
          }
        }
        tone(520, 0.03, { vol: 0.03, type: "square" });
      });
    } else if (label === "floor") {
      this.pending.push(() => {
        Matter.Composite.remove(this.engine.world, ball);
        this.balls = this.balls.filter((x) => x !== ball);
        if (this.stuck === ball) this.stuck = null;
        if (this.balls.length === 0) {
          this.rules.loseLife();
          this.spawnBall(true);
        }
      });
    }
  }

  private flushPending(): void {
    const work = this.pending;
    this.pending = [];
    for (const fn of work) fn();
  }

  private flushEvents(): void {
    for (const e of this.rules.flush()) this.onEvent(e);
  }

  private onEvent(e: BreakoutEvent): void {
    switch (e.type) {
      case "hit":
        if (e.points) this.popup(`+${e.points}`, 0xe8ecf4);
        break;
      case "drop": {
        const { x, y } = brickCenter(e.row, e.col);
        this.drops.push({ power: e.power, x, y });
        break;
      }
      case "lifeLost":
        tone(180, 0.3, { vol: 0.05, freqEnd: 60, type: "sawtooth" });
        this.clearPowers();
        break;
      case "levelClear":
        tone(523, 0.3, { vol: 0.05, freqEnd: 1046, type: "sine" });
        this.popup(`niveau ${e.level} terminé +${e.bonus}`, 0x5fd35f);
        this.clearPowers();
        this.buildBricks();
        this.balls.forEach((b) => Matter.Composite.remove(this.engine.world, b));
        this.balls = [];
        this.stuck = null;
        this.spawnBall(true);
        break;
      case "win":
        this.finish("won", e.score);
        break;
      case "gameover":
        this.finish("over", e.score);
        break;
    }
  }

  private clearPowers(): void {
    this.drops = [];
    this.lasers = [];
    for (const key of ["wide", "laser", "sticky"] as const) {
      if (this.timers[key] > 0) this.endPower(key);
      this.timers[key] = 0;
    }
  }

  private finish(state: "won" | "over", score: number): void {
    this.state = state;
    if (score > this.best) {
      this.best = score;
      saveBest(BEST_KEY, this.best);
    }
  }

  private popup(message: string, color: number): void {
    const text = this.add.text(W / 2 + (Math.random() - 0.5) * 120, TOP + 260, message, { fontFamily: "monospace", fontSize: "13px", color: hex(color) }).setOrigin(0.5).setDepth(20);
    this.popups.push({ text, life: 36 });
  }

  private render(): void {
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x121723, 1);
    g.fillRect(0, 0, W, H);
    for (const b of this.rules.bricks) {
      const { x, y } = brickCenter(b.row, b.col);
      const base = b.indestructible ? COLORS.X : COLORS[b.maxHits as 1 | 2 | 3];
      g.fillStyle(base, b.indestructible ? 1 : 0.45 + 0.55 * (b.hits / b.maxHits));
      g.fillRect(x - BRICK_W / 2, y - BRICK_H / 2, BRICK_W, BRICK_H);
    }
    g.fillStyle(0xe8ecf4, 1);
    g.fillRect(this.paddleX - this.paddleW / 2, PADDLE_Y - 6, this.paddleW, 12);
    if (this.timers.laser > 0) {
      g.fillStyle(0xf0505a, 1);
      g.fillRect(this.paddleX - this.paddleW / 2, PADDLE_Y - 12, 4, 6);
      g.fillRect(this.paddleX + this.paddleW / 2 - 4, PADDLE_Y - 12, 4, 6);
    }
    g.fillStyle(0xe8ecf4, 1);
    for (const b of this.balls) g.fillCircle(b.position.x, b.position.y, 6);
    g.fillStyle(0xf2d43a, 1);
    for (const l of this.lasers) g.fillRect(l.x - 1, l.y, 2, 10);
    for (const d of this.drops) {
      g.fillStyle(POWER_COLORS[d.power], 1);
      g.fillRect(d.x - 8, d.y - 5, 16, 10);
    }
    g.lineStyle(2, 0x34d8f0, 0.25);
    g.strokeRect(0, 0, W, H);

    this.hud.score.setText(`score ${this.rules.score}`);
    this.hud.best.setText(`meilleur ${Math.max(this.best, this.rules.score)}`);
    this.hud.lives.setText(`vies ${this.rules.lives}`);
    this.hud.level.setText(`niveau ${this.rules.level}/10 · ${this.levels[Math.min(this.rules.level, 10) - 1]?.name ?? ""}`);
    if (this.state === "won") this.hud.msg.setText("VICTOIRE — ESPACE pour rejouer");
    else if (this.state === "over") this.hud.msg.setText("PARTIE TERMINÉE — ESPACE pour rejouer");
    else if (this.stuck) this.hud.msg.setText("ESPACE ou clic pour lancer");
    else this.hud.msg.setText("");

    this.popups = this.popups.filter((p) => {
      p.life--;
      p.text.y -= 0.5;
      p.text.setAlpha(Math.min(1, p.life / 14));
      if (p.life <= 0) {
        p.text.destroy();
        return false;
      }
      return true;
    });
  }
}
