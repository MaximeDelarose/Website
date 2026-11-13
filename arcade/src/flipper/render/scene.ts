import type PhaserType from "phaser";
import type MatterType from "matter-js";
import { Phaser, Matter } from "../../shared/engines.js";
import { readPad } from "../../shared/gamepad.js";
import { loadBest, saveBest } from "../../shared/storage.js";
import { tone } from "../../shared/audio.js";
import { FlipperRules, type FlipperEvent } from "../core/rules.js";
import { type TableData, buildStatics, buildFlipper, flipperLimits } from "./table.js";

const TOP = 60; // bande du haut pour le score ; la table commence à y = TOP
const BEST_KEY = "arcade.flipper.best";
const TICK_MS = 1000 / 60;

const C = { bg: 0x0b0d12, wall: 0x5b6478, flipper: 0xf2d43a, ball: 0xe8ecf4, bumper: 0xf0505a, target: 0x34d8f0, roll: 0x3a4256, sling: 0x5fd35f, lane: 0x121723, ink: 0xe8ecf4, dim: 0x7a8294 };
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

interface Flip {
  body: MatterType.Body;
  constraint: MatterType.Constraint;
  sign: 1 | -1;
  lo: number;
  hi: number;
  side: "left" | "right";
}

export class FlipperScene extends Phaser.Scene {
  private table: TableData | null = null;
  private engine!: MatterType.Engine;
  private rules!: FlipperRules;
  private statics: MatterType.Body[] = [];
  private targetBodies = new Map<string, MatterType.Body>();
  private flips: Flip[] = [];
  private balls: MatterType.Body[] = [];
  private readyBall: MatterType.Body | null = null;
  private charge = 0;
  private plungerWasDown = false;
  private acc = 0;
  private best = 0;
  private over = false;
  private pending: Array<() => void> = [];
  private hitFlash = new Map<string, number>();
  private popups: Array<{ text: PhaserType.GameObjects.Text; life: number }> = [];
  private gfx!: PhaserType.GameObjects.Graphics;
  private hud!: { score: PhaserType.GameObjects.Text; best: PhaserType.GameObjects.Text; balls: PhaserType.GameObjects.Text; msg: PhaserType.GameObjects.Text };
  private keys!: Record<"left" | "left2" | "lshift" | "right" | "right2" | "rx" | "plunger" | "plunger2" | "restart", PhaserType.Input.Keyboard.Key>;

  constructor() {
    super("flipper");
  }

  create(): void {
    this.gfx = this.add.graphics();
    this.gfx.y = TOP;
    const style = (size: number, color = C.ink): PhaserType.Types.GameObjects.Text.TextStyle => ({ fontFamily: "monospace", fontSize: `${size}px`, color: hex(color) });
    this.hud = {
      score: this.add.text(12, 14, "", style(18)),
      best: this.add.text(12, 38, "", style(12, C.dim)),
      balls: this.add.text(300, 14, "", style(18)),
      msg: this.add.text(200, 350 + TOP, "", style(16, C.dim)).setOrigin(0.5).setDepth(10),
    };
    this.keys = this.input.keyboard!.addKeys({
      left: "Z", left2: "LEFT", lshift: "SHIFT", right: "M", right2: "RIGHT", rx: "X", plunger: "SPACE", plunger2: "DOWN", restart: "R",
    }) as unknown as typeof this.keys;
    this.input.keyboard!.on("keydown-ENTER", () => {
      if (this.over) this.reset();
    });

    this.loadTable().then(() => this.reset());
  }

  private async loadTable(): Promise<void> {
    const res = await fetch("data/arcade/table.json");
    this.table = (await res.json()) as TableData;
  }

  private reset(): void {
    if (!this.table) return;
    const d = this.table;
    this.best = loadBest(BEST_KEY);
    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } });
    this.engine.positionIterations = 8;
    this.engine.velocityIterations = 8;
    this.statics = buildStatics(d);
    this.targetBodies.clear();
    for (const b of this.statics) {
      if (b.label.startsWith("target:")) this.targetBodies.set(b.label.slice(7), b);
    }
    this.flips = (["left", "right"] as const).map((side) => {
      const f = buildFlipper(d, side);
      const lim = flipperLimits(d, f.sign);
      return { body: f.body, constraint: f.constraint, sign: f.sign, lo: lim.lo, hi: lim.hi, side };
    });
    Matter.Composite.add(this.engine.world, [...this.statics, ...this.flips.map((f) => f.body), ...this.flips.map((f) => f.constraint)]);

    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) this.onPair(pair.bodyA, pair.bodyB);
    });

    this.rules = new FlipperRules(
      d.targets.map((t) => t.id),
      d.rollovers.map((r) => r.id),
    );
    this.balls = [];
    this.pending = [];
    this.over = false;
    this.charge = 0;
    this.spawnReady();
  }

  private spawnReady(): void {
    const d = this.table!;
    const ball = Matter.Bodies.circle(d.launch.x, d.launch.y, d.ball.radius, {
      restitution: d.ball.restitution,
      friction: d.ball.friction,
      frictionAir: d.ball.frictionAir,
      density: d.ball.density,
      label: "ball",
    });
    this.readyBall = ball;
    this.balls.push(ball);
    Matter.Composite.add(this.engine.world, ball);
  }

  update(_time: number, delta: number): void {
    if (!this.table || !this.engine) {
      this.drawLoading();
      return;
    }
    if (this.over) {
      const jd = Phaser.Input.Keyboard.JustDown;
      if (jd(this.keys.restart) || jd(this.keys.plunger) || jd(this.keys.plunger2)) this.reset();
      this.render();
      return;
    }
    this.acc += delta;
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      if (!this.over) this.tick();
    }
    this.render();
  }

  private inputs(): { left: boolean; right: boolean; plunger: boolean } {
    const k = this.keys;
    const pad = readPad();
    const touch = this.touchZones();
    return {
      left: k.left.isDown || k.left2.isDown || k.lshift.isDown || !!pad?.buttons[4] || !!pad?.buttons[6] || touch.left,
      right: k.right.isDown || k.right2.isDown || k.rx.isDown || !!pad?.buttons[5] || !!pad?.buttons[7] || touch.right,
      plunger: k.plunger.isDown || k.plunger2.isDown || !!pad?.buttons[0] || touch.plunger,
    };
  }

  /** Zones tactiles : moitié gauche = flipper gauche, moitié droite = flipper droit, couloir = plongeur. */
  private touchZones(): { left: boolean; right: boolean; plunger: boolean } {
    const out = { left: false, right: false, plunger: false };
    for (const p of [this.input.pointer1, this.input.pointer2]) {
      if (!p || !p.isDown) continue;
      if (p.x > 345) out.plunger = true;
      else if (p.x < 200) out.left = true;
      else out.right = true;
    }
    return out;
  }

  private tick(): void {
    const d = this.table!;
    const i = this.inputs();
    const sub = d.substeps;
    const dt = TICK_MS / sub;

    // Plongeur : tenir pour charger, relâcher pour lancer.
    if (this.readyBall && this.rules.ballInPlay === false) {
      if (i.plunger) this.charge = Math.min(1, this.charge + 1 / d.launch.chargeFrames);
      if (!i.plunger && this.plungerWasDown && this.charge > 0.02) {
        const power = d.launch.powerMin + this.charge * (d.launch.powerMax - d.launch.powerMin);
        Matter.Body.setVelocity(this.readyBall, { x: 0, y: -power });
        this.readyBall = null;
        this.rules.launch();
        this.charge = 0;
      }
    }
    this.plungerWasDown = i.plunger;

    for (let s = 0; s < sub; s++) {
      for (const f of this.flips) {
        const pressed = f.side === "left" ? i.left : i.right;
        const speed = d.flipper.speed;
        Matter.Body.setAngularVelocity(f.body, pressed ? -f.sign * speed : f.sign * speed);
      }
      Matter.Engine.update(this.engine, dt);
      for (const f of this.flips) {
        if (f.body.angle < f.lo) {
          Matter.Body.setAngle(f.body, f.lo);
          Matter.Body.setAngularVelocity(f.body, 0);
        } else if (f.body.angle > f.hi) {
          Matter.Body.setAngle(f.body, f.hi);
          Matter.Body.setAngularVelocity(f.body, 0);
        }
      }
      for (const b of this.balls) {
        const v = b.velocity;
        const speed = Math.hypot(v.x, v.y);
        if (speed > d.ball.maxSpeed) Matter.Body.setVelocity(b, { x: (v.x / speed) * d.ball.maxSpeed, y: (v.y / speed) * d.ball.maxSpeed });
      }
      if (this.readyBall) {
        Matter.Body.setPosition(this.readyBall, { x: d.launch.x, y: d.launch.y });
        Matter.Body.setVelocity(this.readyBall, { x: 0, y: 0 });
      }
      this.flushPending();
    }

    for (const e of this.rules.flush()) this.onRuleEvent(e);
  }

  /** Collisions : seulement noter l'événement ; les modifications du monde sont faites après le pas. */
  private onPair(a: MatterType.Body, b: MatterType.Body): void {
    const ball = a.label === "ball" ? a : b.label === "ball" ? b : null;
    if (!ball) return;
    const other = ball === a ? b : a;
    const label = other.label;
    if (label === "drain") {
      this.pending.push(() => this.drainBall(ball));
    } else if (label.startsWith("bumper:")) {
      const id = label.slice(7);
      this.pending.push(() => {
        this.rules.bumper();
        this.hitFlash.set(id, 12);
        tone(880, 0.05, { vol: 0.04, type: "square" });
      });
    } else if (label === "slingshot") {
      this.pending.push(() => {
        this.rules.slingshot();
        tone(440, 0.04, { vol: 0.03, type: "triangle" });
      });
    } else if (label.startsWith("target:")) {
      const id = label.slice(7);
      this.pending.push(() => {
        const body = this.targetBodies.get(id);
        if (!body || !this.balls.length) return;
        Matter.Composite.remove(this.engine.world, body);
        const bank = this.rules.target(id);
        tone(660, 0.06, { vol: 0.04, type: "square" });
        if (bank) {
          for (const [, tb] of this.targetBodies) {
            if (!this.engine.world.bodies.includes(tb)) Matter.Composite.add(this.engine.world, tb);
          }
          this.spawnExtraBall();
        }
      });
    } else if (label.startsWith("rollover:")) {
      const id = label.slice(9);
      this.pending.push(() => {
        this.rules.rollover(id);
        this.hitFlash.set(`r:${id}`, 12);
        tone(990, 0.04, { vol: 0.03, type: "sine" });
      });
    }
  }

  private flushPending(): void {
    const work = this.pending;
    this.pending = [];
    for (const fn of work) fn();
  }

  private drainBall(ball: MatterType.Body): void {
    if (!this.balls.includes(ball)) return;
    Matter.Composite.remove(this.engine.world, ball);
    this.balls = this.balls.filter((b) => b !== ball);
    if (this.readyBall === ball) this.readyBall = null;
    if (this.balls.length > 0) return; // multibille : la bille restante continue
    this.rules.drain();
    if (this.rules.over) return;
    this.spawnReady();
  }

  private spawnExtraBall(): void {
    const d = this.table!;
    const ball = Matter.Bodies.circle(d.launch.x - 12, d.launch.y - 40, d.ball.radius, {
      restitution: d.ball.restitution,
      friction: d.ball.friction,
      frictionAir: d.ball.frictionAir,
      density: d.ball.density,
      label: "ball",
    });
    Matter.Body.setVelocity(ball, { x: -1, y: -2 });
    this.balls.push(ball);
    Matter.Composite.add(this.engine.world, ball);
  }

  private onRuleEvent(e: FlipperEvent): void {
    switch (e.type) {
      case "score":
        this.popup(`+${e.points}`, C.ink);
        break;
      case "bank":
        this.popup(`BANQUE +${e.points}`, C.target);
        tone(523, 0.3, { vol: 0.05, freqEnd: 1046, type: "sine" });
        break;
      case "lightAll":
        this.popup(`TOUTES LES LETTRES +${e.points}`, C.flipper);
        break;
      case "ballLost":
        tone(180, 0.3, { vol: 0.05, freqEnd: 60, type: "sawtooth" });
        if (e.bonus > 0) this.popup(`bonus bille +${e.bonus}`, C.dim);
        break;
      case "gameover":
        this.over = true;
        if (e.score > this.best) {
          this.best = e.score;
          saveBest(BEST_KEY, this.best);
        }
        break;
    }
  }

  private popup(message: string, color: number): void {
    const x = 160 + Math.random() * 60;
    const text = this.add.text(x, 260 + TOP, message, { fontFamily: "monospace", fontSize: "14px", color: hex(color) }).setOrigin(0.5).setDepth(20);
    this.popups.push({ text, life: 40 });
  }

  private drawLoading(): void {
    this.hud?.msg?.setText("chargement…");
  }

  private render(): void {
    const d = this.table!;
    const g = this.gfx;
    g.clear();

    // Table
    g.fillStyle(C.lane, 1);
    g.fillRect(0, 0, d.width, d.height);
    g.fillStyle(C.bg, 1);
    g.fillRect(360, 0, 40, d.height);
    g.lineStyle(4, C.wall, 1);
    for (const line of d.walls) {
      g.beginPath();
      g.moveTo(line[0][0], line[0][1]);
      for (let i = 1; i < line.length; i++) g.lineTo(line[i][0], line[i][1]);
      g.strokePath();
    }
    for (const b of d.bumpers) {
      const flash = this.hitFlash.get(b.id) ?? 0;
      g.fillStyle(C.bumper, flash > 0 ? 1 : 0.85);
      g.fillCircle(b.x, b.y, b.r);
      g.lineStyle(3, 0xffffff, 0.3);
      g.strokeCircle(b.x, b.y, b.r - 4);
    }
    for (const t of d.targets) {
      if (!this.targetBodies.has(t.id)) continue;
      const present = this.engine.world.bodies.includes(this.targetBodies.get(t.id)!);
      if (!present) continue;
      g.fillStyle(C.target, 1);
      g.fillRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
    }
    for (const r of d.rollovers) {
      const flash = this.hitFlash.get(`r:${r.id}`) ?? 0;
      g.fillStyle(flash > 0 ? C.flipper : C.roll, 1);
      g.fillRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h);
    }
    for (const s of d.slingshots) {
      g.fillStyle(C.sling, 1);
      g.fillTriangle(s.points[0][0], s.points[0][1], s.points[1][0], s.points[1][1], s.points[2][0], s.points[2][1]);
    }
    // Couloir du plongeur : jauge de charge
    g.fillStyle(C.dim, 0.4);
    g.fillRect(d.launch.x - 3, d.launch.y - 60, 6, 60);
    g.fillStyle(C.flipper, 1);
    g.fillRect(d.launch.x - 3, d.launch.y - 60 * this.charge, 6, 60 * this.charge);

    for (const f of this.flips) {
      const verts = f.body.vertices;
      g.fillStyle(C.flipper, 1);
      g.beginPath();
      g.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) g.lineTo(verts[i].x, verts[i].y);
      g.closePath();
      g.fillPath();
    }
    for (const b of this.balls) {
      g.fillStyle(C.ball, 1);
      g.fillCircle(b.position.x, b.position.y, d.ball.radius);
    }
    for (const [k, v] of [...this.hitFlash.entries()]) {
      if (v <= 1) this.hitFlash.delete(k);
      else this.hitFlash.set(k, v - 1);
    }

    this.hud.score.setText(`score ${this.rules.score}`);
    this.hud.best.setText(`meilleur ${Math.max(this.best, this.rules.score)}`);
    this.hud.balls.setText(`billes ${this.rules.ballsLeft}`);
    if (this.over) this.hud.msg.setText("PARTIE TERMINÉE — ESPACE pour rejouer").setVisible(true);
    else if (this.readyBall) this.hud.msg.setText("tenir ESPACE (ou zone droite) pour lancer").setVisible(true);
    else this.hud.msg.setVisible(false);

    this.popups = this.popups.filter((p) => {
      p.life--;
      p.text.y -= 0.6;
      p.text.setAlpha(Math.min(1, p.life / 16));
      if (p.life <= 0) {
        p.text.destroy();
        return false;
      }
      return true;
    });
  }
}
