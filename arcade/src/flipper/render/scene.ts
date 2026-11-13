import { VERSION_QUERY } from "../../shared/version.js";
import type PhaserType from "phaser";
import type MatterType from "matter-js";
import { Phaser, Matter } from "../../shared/engines.js";
import { readPad } from "../../shared/gamepad.js";
import { loadBest, saveBest } from "../../shared/storage.js";
import { arp, noise, tone } from "../../shared/audio.js";
import { Rng } from "../../shared/rng.js";
import { readSeed } from "../../shared/seed.js";
import { FONT_BODY, PAL, mix } from "../../shared/theme.js";
import { Counter, MuteButton, Overlay, Particles, TouchPad, drawPanel, isTouch, makeText, onBlur, popText } from "../../shared/kit.js";
import { Mascot, SpritePool, spriteKey } from "../../shared/art.js";
import { BALLS_PER_GAME, FlipperRules, MAX_MULT, ROULETTE, type FlipperEvent } from "../core/rules.js";
import { type TableData, CAT, ballMask, buildFlipper, buildStatics, insidePolygon } from "./table.js";
import { paintTable } from "./paint.js";

const TICK_MS = 1000 / 60;
export const TOUCH = isTouch();
export const GAME_W = 800;
export const GAME_H = TOUCH ? 1130 : 960;
const TX = 190; // origine de la table dans le canvas
const TY = 60;
const LX = 20;
const RX = 654;
const COL_W = 140;
const BEST_KEY = "arcade.flipper.best";
const SAVE_MS = 15000;
const ROULETTE_MS = 2200;

type State = "loading" | "ready" | "playing" | "paused" | "over";

interface Flip {
  body: MatterType.Body;
  sign: 1 | -1;
  side: "left" | "right";
  ang: number;
}

interface Spin {
  angle: number;
  vel: number;
  acc: number;
}

interface Roul {
  t: number;
  index: number;
  from: number;
  to: number;
  lastSector: number;
}

export class FlipperScene extends Phaser.Scene {
  private table!: TableData;
  private state: State = "loading";
  private engine!: MatterType.Engine;
  private rules!: FlipperRules;
  private laneGate!: MatterType.Body;
  private targetBodies = new Map<string, MatterType.Body>();
  private flips: Flip[] = [];
  private balls: MatterType.Body[] = [];
  private level = new Map<MatterType.Body, 1 | 2>();
  private trails = new Map<MatterType.Body, Array<{ x: number; y: number }>>();
  private readyBall: MatterType.Body | null = null;
  private charge = 0;
  private plungerWasDown = false;
  /** Vrai tant que la touche qui a démarré ou repris la partie n'est pas relâchée (sinon elle lancerait la bille). */
  private plungerIgnore = false;
  private saveUntil = 0;
  private acc = 0;
  private best = 0;
  private newRecord = false;
  private pending: Array<() => void> = [];
  private hitFlash = new Map<string, number>();
  private spin = new Map<string, Spin>();
  private roul: Roul | null = null;
  private wheelAngle = 0;
  private rouletteCooldown = 0;
  private fx = new Particles();
  private score = new Counter();
  private overlay!: Overlay;
  private pad: TouchPad | null = null;
  private tg!: PhaserType.GameObjects.Graphics;
  private ud!: PhaserType.GameObjects.Graphics;
  private fxg!: PhaserType.GameObjects.Graphics;
  private ug!: PhaserType.GameObjects.Graphics;
  private p1!: SpritePool;
  private pU!: SpritePool;
  private pB2!: SpritePool;
  private mascot: Mascot | null = null;
  private lastCheer = 0;
  private art = { ball: null as string | null, mushBig: null as string | null, mushSmall: null as string | null, firefly: null as string | null, leaf: null as string | null };
  private texts!: Record<"score" | "best" | "roulette", PhaserType.GameObjects.Text>;
  private keys!: Record<string, PhaserType.Input.Keyboard.Key>;
  private prevPad: boolean[] = [];
  private lastFlip = { left: false, right: false };

  constructor() {
    super("flipper");
  }

  create(): void {
    this.tg = this.add.graphics().setDepth(10).setPosition(TX, TY);
    this.ud = this.add.graphics().setDepth(13).setPosition(TX, TY);
    this.fxg = this.add.graphics().setDepth(40).setPosition(TX, TY);
    this.ug = this.add.graphics().setDepth(60);
    this.p1 = new SpritePool(this, 11, TX, TY);
    this.pU = new SpritePool(this, 13.2, TX, TY);
    this.pB2 = new SpritePool(this, 14, TX, TY);
    this.art = {
      ball: spriteKey(this, "bignut", 3),
      mushBig: spriteKey(this, "mushroom", 6),
      mushSmall: spriteKey(this, "mushroom", 5),
      firefly: spriteKey(this, "firefly", 3),
      leaf: spriteKey(this, "leaf", 3),
    };
    if (!TOUCH) this.mascot = new Mascot(this, "sq_noisette", LX + COL_W / 2, GAME_H - 14, 5);
    this.overlay = new Overlay(this, GAME_W, GAME_H);
    new MuteButton(this, GAME_W - 68, 8, 48);
    this.keys = this.input.keyboard!.addKeys({
      left: "LEFT", a: "A", z: "Z", lshift: "SHIFT", right: "RIGHT", d: "D", m: "M", x: "X",
      space: "SPACE", down: "DOWN", p: "P", esc: "ESC", r: "R", enter: "ENTER",
    }) as unknown as Record<string, PhaserType.Input.Keyboard.Key>;
    onBlur(this, () => {
      if (this.state === "playing") this.pause();
    });
    makeText(this, 20, 6, "FLIPPER", 46, PAL.orangeLight, { strokeW: 8 }).setDepth(5);
    this.add.text(GAME_W / 2, GAME_H / 2, "chargement…", { fontFamily: FONT_BODY, fontSize: "24px", color: "#fdf3de" }).setOrigin(0.5).setName("loading");

    void fetch(`data/arcade/table.json${VERSION_QUERY}`)
      .then((r) => r.json())
      .then((data: TableData) => {
        this.table = data;
        this.children.getByName("loading")?.destroy();
        this.best = loadBest(BEST_KEY);
        this.buildStatic();
        if (TOUCH) {
          const y = 960;
          this.pad = new TouchPad(this, [
            { id: "left", x: 20, y, w: 225, h: 150, label: "◀" },
            { id: "launch", x: 265, y, w: 230, h: 150, label: "LANCER", color: PAL.orange },
            { id: "right", x: 515, y, w: 225, h: 150, label: "▶" },
          ]);
        }
        this.resetGame();
        this.showStart();
      });
  }

  // ---------- décor fixe et panneaux ----------

  private buildStatic(): void {
    const d = this.table;
    paintTable(this, d, TX, TY);
    const bg = this.add.graphics().setDepth(0);
    const panel = (x: number, y: number, h: number, title: string): void => {
      drawPanel(bg, x, y, COL_W, h, { fill: PAL.field, depth: 6, bw: 4 });
      bg.fillStyle(PAL.ink0, 1);
      bg.fillRect(x + 4, y + 4, COL_W - 8, 30);
      makeText(this, x + COL_W / 2, y + 19, title, 21, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
    };
    const small = (x: number, y: number, text: string, size = 14): void => {
      makeText(this, x, y, text, size, PAL.panel2, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5);
    };
    panel(LX, TY, 130, "SCORE");
    panel(LX, TY + 152, 110, "BILLES");
    panel(LX, TY + 284, 200, "BONUS");
    panel(LX, TY + 506, 100, "MEILLEUR");
    panel(RX, TY, 300, "MISSIONS");
    small(RX + 12, TY + 44, "3 cibles = bille");
    small(RX + 12, TY + 114, "3 lettres = bonus");
    small(RX + 12, TY + 184, "3 rampes = jackpot");
    small(RX + 12, TY + 254, "Roulette :");
    for (let i = 0; i < 5; i++) {
      makeText(this, LX + 70, TY + 330 + (4 - i) * 30, `×${i + 1}`, 18, PAL.panel2, { font: FONT_BODY, origin: [0, 0.5], strokeW: 3, shadow: false }).setDepth(5);
    }
    this.texts = {
      score: makeText(this, LX + COL_W / 2, TY + 88, "0", 38, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 }).setDepth(5),
      best: makeText(this, LX + COL_W / 2, TY + 506 + 66, "0", 32, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 5 }).setDepth(5),
      roulette: makeText(this, RX + 100, TY + 268, "—", 22, PAL.orangeLight, { origin: [0.5, 0], strokeW: 4 }).setDepth(5),
    };
    if (!TOUCH) {
      drawPanel(bg, RX, TY + 322, COL_W, 300, { fill: PAL.field, depth: 6, bw: 4 });
      bg.fillStyle(PAL.ink0, 1);
      bg.fillRect(RX + 4, TY + 326, COL_W - 8, 30);
      makeText(this, RX + COL_W / 2, TY + 341, "COMMANDES", 21, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
      const rows: Array<[string, string]> = [["← Z", "gauche"], ["→ M", "droit"], ["ESPACE", "lancer"], ["P", "pause"], ["M", "son"]];
      rows.forEach(([k, label], i) => {
        const y = TY + 372 + i * 40;
        makeText(this, RX + 12, y, k, 16, PAL.leaf, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5).setFontStyle("800");
        makeText(this, RX + COL_W - 12, y + 2, label, 14, PAL.panel2, { font: FONT_BODY, origin: [1, 0], strokeW: 3, shadow: false }).setDepth(5);
      });
    }
  }

  // ---------- états ----------

  private resetGame(): void {
    const d = this.table;
    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: d.gravityScale } });
    this.engine.positionIterations = 10;
    this.engine.velocityIterations = 10;
    const statics = buildStatics(d);
    this.laneGate = statics.laneGate;
    this.targetBodies.clear();
    for (const b of statics.bodies) if (b.label.startsWith("target:")) this.targetBodies.set(b.label.slice(7), b);
    this.flips = (["left", "right"] as const).map((side) => {
      const f = buildFlipper(d, side);
      return { body: f.body, sign: f.sign, side, ang: f.sign * d.flipper.restAngle };
    });
    Matter.Composite.add(this.engine.world, [...statics.bodies, ...this.flips.map((f) => f.body)]);
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) this.onPair(pair.bodyA, pair.bodyB);
    });
    this.rules = new FlipperRules(d.targets.map((t) => t.id), d.rollovers.filter((r) => r.kind === "letter").map((r) => r.id), new Rng(readSeed()));
    this.balls = [];
    this.level.clear();
    this.trails.clear();
    this.pending = [];
    this.charge = 0;
    this.saveUntil = 0;
    this.newRecord = false;
    this.roul = null;
    this.spin.clear();
    for (const s of d.spinners) this.spin.set(s.id, { angle: s.angle, vel: 0, acc: 0 });
    this.fx.clear();
    this.score.reset(0);
    this.texts.roulette.setText("—");
    this.spawnReady();
  }

  private showStart(): void {
    this.state = "ready";
    this.overlay.show(
      {
        title: "FLIPPER",
        subtitle: this.best > 0 ? `Meilleur score : ${this.best}` : "Un vrai flipper de bar",
        lines: TOUCH ? ["Touche LANCER, puis ◀ ▶ pour les flippers"] : ["Tiens ESPACE pour charger le plongeur", "← → pour les flippers"],
        button: "Jouer",
        hint: TOUCH ? "Touche pour jouer" : "ESPACE ou clic",
      },
      () => this.startGame(),
    );
  }

  private startGame(): void {
    this.overlay.hide();
    if (this.state === "over" || this.rules.ballsLeft < BALLS_PER_GAME || this.rules.score > 0) this.resetGame();
    this.state = "playing";
    this.mascot?.reset();
    this.plungerIgnore = true;
    arp([392, 523, 659], 0.07, { vol: 0.04 });
  }

  private pause(): void {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.overlay.show({ title: "PAUSE", lines: ["Ta partie est en attente"], button: "Reprendre", hint: "P ou ESPACE" }, () => this.resume());
  }

  private resume(): void {
    if (this.state !== "paused") return;
    this.overlay.hide();
    this.state = "playing";
    this.plungerIgnore = true;
  }

  private gameOver(score: number): void {
    this.state = "over";
    if (score > this.best) {
      this.best = score;
      this.newRecord = true;
      saveBest(BEST_KEY, this.best);
    }
    [0, 1, 2, 3].forEach((i) => tone(330 - i * 60, 0.22, { vol: 0.05, type: "sawtooth", delay: i * 0.12, freqEnd: 200 - i * 40 }));
    this.time.delayedCall(800, () => {
      if (this.state !== "over") return;
      this.overlay.show(
        { title: "PARTIE FINIE", subtitle: `Score ${score}`, lines: [this.newRecord ? "★ Nouveau record ! ★" : `Meilleur : ${this.best}`], button: "Rejouer", hint: "ESPACE ou R" },
        () => this.startGame(),
      );
    });
  }

  // ---------- billes ----------

  private makeBall(x: number, y: number, level: 1 | 2 = 1): MatterType.Body {
    const b = this.table.ball;
    const ball = Matter.Bodies.circle(x, y, b.radius, {
      frictionStatic: 0,
      restitution: b.restitution,
      friction: b.friction,
      frictionAir: b.frictionAir,
      density: b.density,
      label: "ball",
      collisionFilter: { category: CAT.BALL, mask: ballMask(level) },
    });
    this.balls.push(ball);
    this.level.set(ball, level);
    this.trails.set(ball, []);
    Matter.Composite.add(this.engine.world, ball);
    return ball;
  }

  private setLevel(ball: MatterType.Body, level: 1 | 2): void {
    if (this.level.get(ball) === level) return;
    this.level.set(ball, level);
    ball.collisionFilter.mask = ballMask(level);
    this.fx.burst(ball.position.x, ball.position.y, { n: 8, color: [PAL.cream, PAL.orangeLight], speed: 160, life: 360, size: 6, gravity: 200 });
    tone(level === 2 ? 420 : 300, 0.12, { vol: 0.035, type: "triangle", freqEnd: level === 2 ? 760 : 200 });
  }

  private spawnReady(): void {
    const l = this.table.launch;
    this.readyBall = this.makeBall(l.x, l.y);
  }

  private removeBall(ball: MatterType.Body): void {
    Matter.Composite.remove(this.engine.world, ball);
    this.balls = this.balls.filter((b) => b !== ball);
    this.trails.delete(ball);
    this.level.delete(ball);
    if (this.readyBall === ball) this.readyBall = null;
  }

  private launchReady(power: number): void {
    const ball = this.readyBall;
    if (!ball) return;
    Matter.Body.setVelocity(ball, { x: 0, y: -power });
    this.readyBall = null;
    this.mascot?.reset();
    this.rules.launch();
    if (this.saveUntil === 0) this.saveUntil = this.time.now + SAVE_MS;
    noise(0.18, { vol: 0.06, freq: 1400 });
    tone(180, 0.2, { vol: 0.05, type: "sawtooth", freqEnd: 520 });
  }

  // ---------- boucle ----------

  update(_time: number, delta: number): void {
    if (this.state === "loading") return;
    this.fx.update(delta);
    this.mascot?.update(delta);
    this.pad?.poll();
    const j: Record<string, boolean> = {};
    for (const name of Object.keys(this.keys)) j[name] = Phaser.Input.Keyboard.JustDown(this.keys[name]);
    if (j.r && this.state !== "ready") this.startGame();
    if ((j.space || j.enter) && this.overlay.visible) this.overlay.activate();
    if (j.p || j.esc) {
      if (this.state === "playing") this.pause();
      else if (this.state === "paused") this.resume();
    }
    const pad = readPad();
    if (pad && pad.buttons[9] && !this.prevPad[9]) {
      if (this.state === "playing") this.pause();
      else if (this.overlay.visible) this.overlay.activate();
    }
    this.prevPad = pad ? pad.buttons.slice() : [];

    if (this.state === "playing") {
      this.acc += delta;
      const k = this.keys;
      const left = k.left.isDown || k.a.isDown || k.z.isDown || k.lshift.isDown || !!pad?.buttons[4] || !!pad?.buttons[6] || (pad?.x ?? 0) < 0 || !!this.pad?.isDown("left");
      const right = k.right.isDown || k.d.isDown || k.m.isDown || k.x.isDown || !!pad?.buttons[5] || !!pad?.buttons[7] || (pad?.x ?? 0) > 0 || !!this.pad?.isDown("right");
      const plunger = k.space.isDown || k.down.isDown || !!pad?.buttons[0] || !!this.pad?.isDown("launch");
      this.handlePlunger(plunger, delta);
      if (this.flipEdge(left, right)) tone(150, 0.04, { vol: 0.04, type: "square", freqEnd: 90 });
      while (this.acc >= TICK_MS) {
        this.acc -= TICK_MS;
        this.physicsTick(left, right);
      }
      this.afterTick(delta);
    }
    this.render(delta);
  }

  private flipEdge(left: boolean, right: boolean): boolean {
    const edge = (left && !this.lastFlip.left) || (right && !this.lastFlip.right);
    this.lastFlip = { left, right };
    return edge;
  }

  private handlePlunger(down: boolean, delta: number): void {
    const l = this.table.launch;
    if (this.plungerIgnore) {
      if (!down) this.plungerIgnore = false;
      this.plungerWasDown = false;
      return;
    }
    if (this.readyBall) {
      if (down) this.charge = Math.min(1, this.charge + delta / (l.chargeFrames * TICK_MS));
      if (!down && this.plungerWasDown) {
        const c = Math.max(this.charge, 0.3);
        this.launchReady(l.powerMin + c * (l.powerMax - l.powerMin));
        this.charge = 0;
      }
    } else if (!down) {
      this.charge = 0;
    }
    this.plungerWasDown = down;
  }

  /** Place le flipper autour de son pivot ; la vitesse est mise à jour pour transmettre le coup à la bille. */
  private poseFlipper(f: Flip): void {
    const fl = this.table.flipper;
    const [px, py] = fl.pivots[f.side];
    const half = fl.length / 2;
    const api = Matter.Body as unknown as {
      setAngle(b: MatterType.Body, a: number, updateVelocity?: boolean): void;
      setPosition(b: MatterType.Body, p: { x: number; y: number }, updateVelocity?: boolean): void;
    };
    api.setAngle(f.body, f.ang, true);
    api.setPosition(f.body, { x: px + f.sign * half * Math.cos(f.ang), y: py + f.sign * half * Math.sin(f.ang) }, true);
  }

  /** Porte du couloir : traversable tant qu'une bille monte dans le couloir, fermée sinon (la bille ne peut pas revenir au plongeur). */
  private updateGate(): void {
    const d = this.table;
    let open = false;
    for (const b of this.balls) {
      if (b === this.readyBall) continue;
      if (b.position.x > d.laneGate.to[0] && b.position.y > d.laneGate.openBelowY && b.velocity.y < -2) open = true;
    }
    this.laneGate.isSensor = open;
  }

  private physicsTick(left: boolean, right: boolean): void {
    const d = this.table;
    const sub = d.substeps;
    const dt = TICK_MS / sub;
    for (let s = 0; s < sub; s++) {
      for (const f of this.flips) {
        const pressed = f.side === "left" ? left : right;
        const fl = d.flipper;
        const target = pressed ? -f.sign * fl.upAngle : f.sign * fl.restAngle;
        const step = fl.speed / sub;
        f.ang += Math.max(-step, Math.min(step, target - f.ang));
        this.poseFlipper(f);
      }
      this.updateGate();
      Matter.Engine.update(this.engine, dt);
      for (const b of this.balls) {
        const v = b.velocity;
        const speed = Math.hypot(v.x, v.y);
        if (speed > d.ball.maxSpeed) Matter.Body.setVelocity(b, { x: (v.x / speed) * d.ball.maxSpeed, y: (v.y / speed) * d.ball.maxSpeed });
      }
      if (this.readyBall) {
        Matter.Body.setPosition(this.readyBall, { x: d.launch.x, y: d.launch.y + this.charge * d.launch.pull });
        Matter.Body.setVelocity(this.readyBall, { x: 0, y: 0 });
      }
      this.flushPending();
    }
  }

  /** Une fois par frame : traînées, spinners, roulette, bille rendue au plongeur, événements de règles. */
  private afterTick(delta: number): void {
    const d = this.table;
    for (const b of this.balls) {
      const tr = this.trails.get(b);
      if (tr) {
        tr.push({ x: b.position.x, y: b.position.y });
        if (tr.length > 14) tr.shift();
      }
      if (this.level.get(b) === 2 && !insidePolygon(d.deckZone, b.position.x, b.position.y)) this.setLevel(b, 1);
      const speed = Math.hypot(b.velocity.x, b.velocity.y);
      // Garde-fou : une bille immobile dans le couloir est rendue au plongeur.
      if (!this.readyBall && this.balls.length === 1 && !this.roul && b.position.x > d.launch.x - 16 && b.position.y > d.launch.y - 60 && speed < 1) {
        Matter.Body.setVelocity(b, { x: 0, y: 0 });
        this.readyBall = b;
      }
    }
    for (const [id, s] of this.spin) {
      if (s.vel === 0) continue;
      s.angle += s.vel;
      s.acc += Math.abs(s.vel);
      while (s.acc >= Math.PI) {
        s.acc -= Math.PI;
        this.rules.spinner();
        tone(1100 + Math.random() * 120, 0.025, { vol: 0.025, type: "square" });
        this.hitFlash.set(`sp:${id}`, 5);
      }
      s.vel *= 0.985;
      if (Math.abs(s.vel) < 0.015) s.vel = 0;
    }
    if (this.roul) this.updateRoulette(delta);
    for (const e of this.rules.flush()) this.onRuleEvent(e);
    for (const [k, v] of [...this.hitFlash]) {
      if (v <= 1) this.hitFlash.delete(k);
      else this.hitFlash.set(k, v - 1);
    }
  }

  // ---------- roulette ----------

  private captureRoulette(ball: MatterType.Body): void {
    if (this.roul || this.time.now < this.rouletteCooldown || !this.balls.includes(ball)) return;
    const d = this.table.roulette;
    this.removeBall(ball);
    const index = this.rules.roulette();
    const sector = (Math.PI * 2) / ROULETTE.length;
    let to = -(index + 0.5) * sector;
    while (to > this.wheelAngle - 5 * Math.PI * 2) to -= Math.PI * 2;
    this.roul = { t: 0, index, from: this.wheelAngle, to, lastSector: -1 };
    this.fx.burst(d.x, d.y, { n: 14, color: [PAL.orangeLight, PAL.cream], speed: 220, life: 500, size: 7, gravity: 200 });
    tone(260, 0.2, { vol: 0.05, type: "square", freqEnd: 120 });
  }

  private updateRoulette(delta: number): void {
    const r = this.roul;
    if (!r) return;
    r.t += delta;
    const k = Math.min(1, r.t / ROULETTE_MS);
    const ease = 1 - Math.pow(1 - k, 3);
    this.wheelAngle = r.from + (r.to - r.from) * ease;
    const sector = Math.floor(((-this.wheelAngle % (Math.PI * 2)) + Math.PI * 2) / ((Math.PI * 2) / ROULETTE.length));
    if (sector !== r.lastSector) {
      r.lastSector = sector;
      tone(700 + (sector % 3) * 90, 0.03, { vol: 0.03, type: "square" });
    }
    if (k >= 1) {
      const d = this.table.roulette;
      const prize = ROULETTE[r.index];
      this.texts.roulette.setText(prize.label);
      popText(this, TX + d.x - 40, TY + d.y - 50, prize.label, 36, PAL.orangeLight, { ms: 1200 });
      arp([523, 659, 784], 0.06, { vol: 0.05 });
      // éjection vers le bas-gauche du plateau
      const a = Math.PI * (0.62 + Math.random() * 0.2);
      const ball = this.makeBall(d.x + Math.cos(a) * (d.r + 18), d.y + Math.sin(a) * (d.r + 18));
      Matter.Body.setVelocity(ball, { x: Math.cos(a) * 14, y: Math.sin(a) * 14 });
      this.rouletteCooldown = this.time.now + 1500;
      this.roul = null;
    }
  }

  // ---------- collisions ----------

  private onPair(a: MatterType.Body, b: MatterType.Body): void {
    const ball = a.label === "ball" ? a : b.label === "ball" ? b : null;
    if (!ball) return;
    const other = ball === a ? b : a;
    const label = other.label;
    const d = this.table;
    if (label === "drain") {
      this.pending.push(() => this.drainBall(ball));
    } else if (label.startsWith("bumper:")) {
      const id = label.slice(7);
      const bumper = d.bumpers.find((x) => x.id === id);
      this.pending.push(() => {
        if (bumper) this.kick(ball, bumper.x, bumper.y, 12);
        this.rules.bumper(id === "d1" ? 150 : 100);
        this.hitFlash.set(id, 14);
        if (bumper) this.fx.burst(bumper.x, bumper.y, { n: 10, color: [PAL.cream, PAL.orangeLight, PAL.berry], speed: 260, life: 420, size: 7, gravity: 300 });
        this.cameras.main.shake(70, 0.0016);
        this.cheer();
        tone(780 + Math.random() * 260, 0.07, { vol: 0.045, type: "square", freqEnd: 1100 });
        noise(0.05, { vol: 0.03, freq: 3000 });
      });
    } else if (label === "slingshot") {
      this.pending.push(() => {
        this.kick(ball, other.position.x, other.position.y, 12);
        this.rules.slingshot();
        this.hitFlash.set(`s${other.position.x > d.width / 2 ? 1 : 0}`, 12);
        this.fx.burst(ball.position.x, ball.position.y, { n: 6, color: [PAL.leaf, PAL.cream], speed: 200, life: 320, size: 6, gravity: 300 });
        tone(300, 0.06, { vol: 0.04, type: "square", freqEnd: 520 });
      });
    } else if (label.startsWith("target:")) {
      const id = label.slice(7);
      this.pending.push(() => {
        const body = this.targetBodies.get(id);
        if (!body || !this.engine.world.bodies.includes(body)) return;
        Matter.Composite.remove(this.engine.world, body);
        const bank = this.rules.target(id);
        this.fx.burst(body.position.x, body.position.y, { n: 10, color: [PAL.leaf, PAL.cream], speed: 220, life: 420, size: 6 });
        tone(620, 0.07, { vol: 0.045, type: "square", freqEnd: 860 });
        if (bank) {
          for (const [, tb] of this.targetBodies) if (!this.engine.world.bodies.includes(tb)) Matter.Composite.add(this.engine.world, tb);
          this.spawnExtraBall();
        }
      });
    } else if (label.startsWith("rollover:")) {
      const id = label.slice(9);
      const ro = d.rollovers.find((x) => x.id === id);
      this.pending.push(() => {
        if (!ro) return;
        this.hitFlash.set(`r:${id}`, 16);
        if (ro.kind === "letter") {
          if (this.rules.lit(id)) return;
          this.rules.rollover(id);
          tone(990, 0.06, { vol: 0.04, type: "sine", freqEnd: 1320 });
        } else {
          this.rules.lane(ro.kind);
          tone(ro.kind === "outlane" ? 330 : 660, 0.06, { vol: 0.035, type: "triangle" });
        }
      });
    } else if (label.startsWith("spinner:")) {
      const id = label.slice(8);
      this.pending.push(() => {
        const s = this.spin.get(id);
        if (!s) return;
        const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
        s.vel += Math.min(0.9, 0.2 + speed * 0.03);
      });
    } else if (label.startsWith("gate:")) {
      const id = label.slice(5);
      const g = d.levelGates.find((x) => x.id === id);
      this.pending.push(() => {
        if (!g || !this.balls.includes(ball)) return;
        if (g.role === "top") {
          if (ball.velocity.y < 0) this.rampDone(ball);
        } else if (g.set === 2) {
          if (ball.velocity.y < -1 && ball.position.x > 46 && ball.position.x < 78) this.setLevel(ball, 2);
        } else if (g.id === "ramp_out") {
          if (ball.velocity.y > 0) this.setLevel(ball, 1);
        } else {
          this.setLevel(ball, 1);
        }
      });
    } else if (label === "roulette") {
      this.pending.push(() => this.captureRoulette(ball));
    } else if (label.startsWith("flipper:")) {
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      if (speed > 6) this.pending.push(() => tone(210, 0.04, { vol: 0.03, type: "triangle" }));
    }
  }

  private rampDone(ball: MatterType.Body): void {
    const jackpot = this.rules.ramp();
    this.fx.burst(ball.position.x, ball.position.y, { n: 12, color: [PAL.orangeLight, PAL.cream], speed: 240, life: 520, size: 7, gravity: 200 });
    arp([523, 659, 784], 0.05, { vol: 0.045 });
    if (jackpot) this.spawnExtraBall();
  }

  private cheer(): void {
    if (this.time.now - this.lastCheer > 1200) {
      this.lastCheer = this.time.now;
      this.mascot?.cheer();
    }
  }

  /** Coup actif d'un bumper ou d'une élingue : la bille repart à l'opposé du centre, jamais moins vite que `min`. */
  private kick(ball: MatterType.Body, cx: number, cy: number, min: number): void {
    const dx = ball.position.x - cx;
    const dy = ball.position.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const speed = Math.min(this.table.ball.maxSpeed, Math.max(Math.hypot(ball.velocity.x, ball.velocity.y) * 0.95, min));
    Matter.Body.setVelocity(ball, { x: (dx / len) * speed, y: (dy / len) * speed });
  }

  private flushPending(): void {
    const work = this.pending;
    this.pending = [];
    for (const fn of work) fn();
  }

  private drainBall(ball: MatterType.Body): void {
    if (!this.balls.includes(ball)) return;
    const d = this.table;
    this.removeBall(ball);
    if (this.balls.length > 0 || this.roul) return; // multibille ou roulette en cours : la partie continue
    if (this.time.now < this.saveUntil) {
      // Bille sauvée : elle revient au plongeur sans coûter de bille.
      this.spawnReady();
      popText(this, TX + d.width / 2, TY + d.height / 2, "BILLE SAUVÉE", 44, PAL.leaf, { ms: 1100 });
      arp([523, 659, 784], 0.07, { vol: 0.045 });
      return;
    }
    this.rules.drain();
    this.saveUntil = 0;
    this.mascot?.sad();
    if (!this.rules.over) this.spawnReady();
  }

  private spawnExtraBall(): void {
    const ball = this.makeBall(250, 120);
    Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 8, y: 5 });
    popText(this, TX + 250, TY + 200, "MULTIBILLE !", 40, PAL.orangeLight, { ms: 1100 });
    arp([523, 659, 784, 1047], 0.06, { vol: 0.05 });
    this.mascot?.cheer();
  }

  private onRuleEvent(e: FlipperEvent): void {
    const cx = TX + this.table.width / 2;
    switch (e.type) {
      case "bank":
        popText(this, cx, TY + 300, `BANQUE +${e.points}`, 40, PAL.leaf, { ms: 1100 });
        this.mascot?.cheer();
        break;
      case "lightAll":
        popText(this, cx, TY + 120, `LETTRES +${e.points}`, 38, PAL.orangeLight, { ms: 1100 });
        arp([659, 784, 988, 1319], 0.06, { vol: 0.05 });
        break;
      case "mult":
        popText(this, cx, TY + 220, `BONUS X${e.mult}`, 46, PAL.orangeLight, { ms: 1200 });
        arp([440, 554, 659], 0.06, { vol: 0.05 });
        break;
      case "ramp":
        popText(this, TX + 120, TY + 300, `RAMPE +${e.points}`, 30, PAL.cream, { ms: 1000 });
        break;
      case "jackpot":
        popText(this, cx, TY + 380, `JACKPOT +${e.points}`, 52, PAL.orangeLight, { ms: 1500 });
        this.cameras.main.shake(260, 0.008);
        arp([523, 659, 784, 1047, 1319, 1568], 0.06, { vol: 0.055 });
        break;
      case "extraBall":
        popText(this, cx, TY + 420, "BILLE BONUS !", 40, PAL.leaf, { ms: 1300 });
        arp([784, 988, 1175], 0.07, { vol: 0.05 });
        break;
      case "save":
        this.saveUntil = this.time.now + 10000;
        popText(this, cx, TY + 420, "BILLE SAUVÉE 10 s", 32, PAL.leaf, { ms: 1300 });
        break;
      case "ballLost":
        tone(180, 0.35, { vol: 0.05, type: "sawtooth", freqEnd: 60 });
        if (e.bonus > 0) popText(this, cx, TY + 560, `BONUS BILLE +${e.bonus}`, 30, PAL.cream, { ms: 1300 });
        break;
      case "gameover":
        this.gameOver(e.score);
        break;
      default:
        break;
    }
  }

  // ---------- rendu ----------

  private render(delta: number): void {
    const d = this.table;
    const g = this.tg;
    g.clear();
    const ud = this.ud;
    ud.clear();
    const fxg = this.fxg;
    fxg.clear();
    const ug = this.ug;
    ug.clear();
    this.p1.begin();
    this.pU.begin();
    this.pB2.begin();
    const now = this.time.now;

    // élingues
    d.slingshots.forEach((s, i) => {
      const flash = (this.hitFlash.get(`s${i}`) ?? 0) / 12;
      const p = s.points;
      g.fillStyle(PAL.ink0, 1);
      g.fillTriangle(p[0][0] - 3, p[0][1] - 5, p[1][0] + (i ? -6 : 6), p[1][1], p[2][0] - 3, p[2][1] + 5);
      g.fillStyle(mix(PAL.moss2, 0xffffff, flash * 0.7), 1);
      g.fillTriangle(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]);
      this.p1.draw(this.art.leaf, (p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3, { scale: 0.9, flip: i === 1 });
    });

    // rollovers : lettres (lucioles) et voies latérales (voyants)
    for (const r of d.rollovers) {
      const flash = (this.hitFlash.get(`r:${r.id}`) ?? 0) / 16;
      if (r.kind === "letter") {
        const lit = this.rules.lit(r.id);
        g.fillStyle(PAL.ink0, 1);
        g.fillCircle(r.x, r.y, 13);
        g.fillStyle(lit ? 0x6b5a1a : 0x1d3a2a, 1);
        g.fillCircle(r.x, r.y, 10);
        if (lit || flash > 0) {
          g.fillStyle(PAL.orangeLight, 0.35 + flash * 0.4);
          g.fillCircle(r.x, r.y, 17);
        }
        this.p1.draw(this.art.firefly, r.x, r.y, lit ? { scale: 0.9 + flash * 0.3 } : { alpha: 0.55, tint: 0x4a6a55, scale: 0.85 });
      } else {
        const on = flash > 0;
        g.fillStyle(PAL.ink0, 1);
        g.fillRect(r.x - r.w / 2 - 3, r.y - r.h / 2 - 3, r.w + 6, r.h + 6);
        g.fillStyle(on ? (r.kind === "outlane" ? PAL.berry : PAL.orangeLight) : 0x2d4f3a, 1);
        g.fillRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h);
      }
    }

    // cibles
    for (const t of d.targets) {
      const down = this.rules.targetDown(t.id);
      const h = down ? t.h * 0.3 : t.h;
      const y = t.y + t.h / 2 - h;
      g.fillStyle(PAL.ink0, 1);
      g.fillRect(t.x - t.w / 2 - 3, y - 3, t.w + 6, h + 6);
      g.fillStyle(down ? PAL.moss2 : PAL.leaf, 1);
      g.fillRect(t.x - t.w / 2, y, t.w, h);
    }

    for (const s of d.spinners) if (s.level === 1) this.drawSpinner(g, s);

    // bumpers du plateau
    for (const b of d.bumpers) {
      if (b.level !== 1) continue;
      const pulse = (this.hitFlash.get(b.id) ?? 0) / 14;
      const r = b.r + pulse * 4;
      g.fillStyle(PAL.ink0, 1);
      g.fillCircle(b.x, b.y + 4, r + 5);
      g.fillCircle(b.x, b.y, r + 5);
      g.fillStyle(mix(0x2c4a34, PAL.orangeLight, pulse * 0.7), 1);
      g.fillCircle(b.x, b.y, r);
      this.p1.draw(b.r >= 26 ? this.art.mushBig : this.art.mushSmall, b.x, b.y - 2, { scale: 1 + pulse * 0.16 });
    }

    this.drawRoulette(g);

    // plongeur : ressort et tête
    const l = d.launch;
    const headY = l.y + this.charge * l.pull + d.ball.radius + 3;
    g.fillStyle(PAL.ink0, 1);
    g.fillRect(l.x - 15, headY - 1, 30, 11);
    g.fillStyle(PAL.cream, 1);
    g.fillRect(l.x - 12, headY + 1, 24, 6);
    g.lineStyle(4, PAL.dim, 1);
    g.beginPath();
    g.moveTo(l.x, headY + 8);
    const bottom = d.height - 6;
    const coils = 6;
    for (let i = 1; i <= coils; i++) g.lineTo(l.x + (i % 2 ? 9 : -9), headY + 8 + ((bottom - headY - 8) * i) / coils);
    g.strokePath();

    // flippers
    for (const f of this.flips) {
      const pressed = f.side === "left" ? this.lastFlip.left : this.lastFlip.right;
      const verts = f.body.vertices.map((v) => new Phaser.Math.Vector2(v.x, v.y));
      g.fillStyle(PAL.ink0, 1);
      g.lineStyle(10, PAL.ink0, 1);
      g.strokePoints(verts, true);
      g.fillStyle(pressed ? PAL.orangeLight : PAL.orange, 1);
      g.fillPoints(verts, true);
      g.lineStyle(3, 0xffffff, 0.45);
      g.beginPath();
      g.moveTo(verts[0].x, verts[0].y);
      g.lineTo(verts[Math.floor(verts.length / 4)].x, verts[Math.floor(verts.length / 4)].y);
      g.strokePath();
      const [px, py] = d.flipper.pivots[f.side];
      g.fillStyle(PAL.ink0, 1);
      g.fillCircle(px, py, 8);
      g.fillStyle(PAL.cream, 1);
      g.fillCircle(px, py, 4);
    }

    // étage : bumper, spinner et flèches lumineuses de la rampe
    for (const s of d.spinners) if (s.level === 2) this.drawSpinner(ud, s);
    for (const b of d.bumpers) {
      if (b.level !== 2) continue;
      const pulse = (this.hitFlash.get(b.id) ?? 0) / 14;
      const r = b.r + pulse * 4;
      ud.fillStyle(PAL.ink0, 0.35);
      ud.fillCircle(b.x + 6, b.y + 9, r + 5);
      ud.fillStyle(PAL.ink0, 1);
      ud.fillCircle(b.x, b.y, r + 5);
      ud.fillStyle(mix(0x5a3b24, PAL.orangeLight, pulse * 0.7), 1);
      ud.fillCircle(b.x, b.y, r);
      this.pU.draw(this.art.mushSmall, b.x, b.y - 2, { scale: 1 + pulse * 0.16 });
    }
    const chase = Math.floor(now / 140) % 4;
    for (let i = 0; i < 4; i++) {
      const y = 470 - i * 34;
      ud.fillStyle(i === chase ? PAL.orangeLight : 0x5a3b24, 1);
      ud.fillTriangle(62 - 9, y + 6, 62 + 9, y + 6, 62, y - 8);
    }

    // billes : traînée, ombre portée à l'étage, sprite
    for (const b of this.balls) {
      const lv = this.level.get(b) ?? 1;
      const layer = lv === 1 ? g : ud;
      const tr = this.trails.get(b) ?? [];
      tr.forEach((p, i) => {
        const k = i / Math.max(1, tr.length);
        layer.fillStyle(PAL.orangeLight, 0.28 * k);
        layer.fillCircle(p.x, p.y, d.ball.radius * (0.4 + 0.5 * k));
      });
      if (lv === 2) {
        ud.fillStyle(PAL.ink0, 0.4);
        ud.fillCircle(b.position.x + 6, b.position.y + 9, d.ball.radius);
        this.pB2.draw(this.art.ball, b.position.x, b.position.y, { rotation: b.angle, scale: 1.4 });
      } else {
        this.p1.draw(this.art.ball, b.position.x, b.position.y, { rotation: b.angle, scale: 1.2 });
      }
    }

    this.fx.draw(fxg);
    this.drawPanels(ug, now);
    this.pad?.draw(ug);
    this.p1.end();
    this.pU.end();
    this.pB2.end();

    const shown = this.score.update(this.rules.score, delta);
    if (this.texts.score.text !== String(shown)) this.texts.score.setText(String(shown));
    const best = String(Math.max(this.best, this.rules.score));
    if (this.texts.best.text !== best) this.texts.best.setText(best);
  }

  private drawSpinner(g: PhaserType.GameObjects.Graphics, s: { id: string; x: number; y: number; w: number }): void {
    const st = this.spin.get(s.id);
    const a = st ? st.angle : 0;
    const flash = (this.hitFlash.get(`sp:${s.id}`) ?? 0) / 5;
    const dx = Math.cos(a) * (s.w / 2);
    const dy = Math.sin(a) * (s.w / 2);
    g.lineStyle(10, PAL.ink0, 1);
    g.beginPath();
    g.moveTo(s.x - dx, s.y - dy);
    g.lineTo(s.x + dx, s.y + dy);
    g.strokePath();
    g.lineStyle(5, mix(PAL.cream, PAL.orangeLight, flash), 1);
    g.beginPath();
    g.moveTo(s.x - dx, s.y - dy);
    g.lineTo(s.x + dx, s.y + dy);
    g.strokePath();
    g.fillStyle(PAL.ink0, 1);
    g.fillCircle(s.x, s.y, 6);
    g.fillStyle(PAL.orange, 1);
    g.fillCircle(s.x, s.y, 3);
  }

  /** Roulette : disque de huit cases, repère fixe en haut ; la bille y est capturée puis relancée. */
  private drawRoulette(g: PhaserType.GameObjects.Graphics): void {
    const r = this.table.roulette;
    const R = r.r + 13;
    const n = ROULETTE.length;
    const colors = [PAL.berry, PAL.cream, PAL.leaf, PAL.orangeLight, PAL.berry, PAL.cream, PAL.leaf, PAL.orangeLight];
    g.fillStyle(PAL.ink0, 1);
    g.fillCircle(r.x, r.y + 3, R + 5);
    g.fillCircle(r.x, r.y, R + 5);
    for (let i = 0; i < n; i++) {
      const a0 = this.wheelAngle + (i * Math.PI * 2) / n - Math.PI / 2;
      const a1 = a0 + (Math.PI * 2) / n;
      g.fillStyle(colors[i], 1);
      g.beginPath();
      g.moveTo(r.x, r.y);
      g.arc(r.x, r.y, R, a0, a1, false);
      g.closePath();
      g.fillPath();
    }
    g.fillStyle(PAL.ink0, 1);
    g.fillCircle(r.x, r.y, r.r - 2);
    g.fillStyle(this.roul ? PAL.orangeLight : 0x1d3a2a, 1);
    g.fillCircle(r.x, r.y, r.r - 6);
    g.fillStyle(PAL.ink0, 1);
    g.fillTriangle(r.x - 8, r.y - R - 10, r.x + 8, r.y - R - 10, r.x, r.y - R + 2);
    g.fillStyle(PAL.cream, 1);
    g.fillTriangle(r.x - 5, r.y - R - 8, r.x + 5, r.y - R - 8, r.x, r.y - R - 1);
  }

  private drawPanels(ug: PhaserType.GameObjects.Graphics, now: number): void {
    const d = this.table;
    for (let i = 0; i < BALLS_PER_GAME + 2; i++) {
      if (i >= BALLS_PER_GAME && i >= this.rules.ballsLeft) break;
      const x = LX + 24 + (i % 4) * 30;
      const y = TY + 152 + 66 + Math.floor(i / 4) * 28;
      const alive = i < this.rules.ballsLeft;
      ug.fillStyle(PAL.ink0, 1);
      ug.fillCircle(x, y, 12);
      ug.fillStyle(alive ? PAL.cream : 0x2d4f3a, 1);
      ug.fillCircle(x, y, 9);
      if (alive) {
        ug.fillStyle(0xffffff, 0.9);
        ug.fillCircle(x - 3, y - 3, 2.5);
      }
    }
    for (let i = 0; i < MAX_MULT; i++) {
      const y = TY + 330 + (MAX_MULT - 1 - i) * 30;
      const on = this.rules.mult > i;
      const blink = on && i === this.rules.mult - 1 ? 0.65 + 0.35 * Math.sin(now / 160) : 1;
      ug.fillStyle(PAL.ink0, 1);
      ug.fillCircle(LX + 44, y, 13);
      ug.fillStyle(on ? mix(PAL.orange, PAL.orangeLight, blink) : 0x2d4f3a, 1);
      ug.fillCircle(LX + 44, y, 10);
    }
    d.targets.forEach((t, i) => {
      const x = RX + 28 + i * 40;
      const y = TY + 82;
      ug.fillStyle(PAL.ink0, 1);
      ug.fillRect(x - 13, y - 14, 26, 28);
      ug.fillStyle(this.rules.targetDown(t.id) ? PAL.leaf : 0x2d4f3a, 1);
      ug.fillRect(x - 10, y - 11, 20, 22);
    });
    d.rollovers
      .filter((r) => r.kind === "letter")
      .forEach((r, i) => {
        const x = RX + 28 + i * 40;
        const y = TY + 152;
        ug.fillStyle(PAL.ink0, 1);
        ug.fillCircle(x, y, 15);
        ug.fillStyle(this.rules.lit(r.id) ? PAL.orangeLight : 0x2d4f3a, 1);
        ug.fillCircle(x, y, 11);
      });
    for (let i = 0; i < 3; i++) {
      const x = RX + 28 + i * 40;
      const y = TY + 222;
      const on = i < this.rules.rampCount % 3;
      ug.fillStyle(PAL.ink0, 1);
      ug.fillCircle(x, y, 15);
      ug.fillStyle(on ? PAL.berry : 0x2d4f3a, 1);
      ug.fillCircle(x, y, 11);
    }
  }
}
