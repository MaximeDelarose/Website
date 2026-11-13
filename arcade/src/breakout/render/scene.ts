import type PhaserType from "phaser";
import { Phaser } from "../../shared/engines.js";
import { readPad } from "../../shared/gamepad.js";
import { loadBest, saveBest } from "../../shared/storage.js";
import { arp, noise, tone } from "../../shared/audio.js";
import { readSeed } from "../../shared/seed.js";
import { FONT_BODY, PAL, mix } from "../../shared/theme.js";
import { Counter, MuteButton, Overlay, Particles, drawBevel, drawPanel, makeText, onBlur, popText } from "../../shared/kit.js";
import type { LevelData, PowerUp } from "../core/rules.js";
import { BALL_R, BreakoutWorld, CELL_H, CELL_W, FIELD_H, FIELD_W, PADDLE_H, PADDLE_Y, brickRect, type WorldEvent } from "../core/world.js";

const TICK_MS = 1000 / 60;
export const GAME_W = 800;
export const GAME_H = 820;
const FX = 170; // origine du terrain dans le canvas
const FY = 70;
const LX = 20;
const RX = 640;
const COL_W = 140;
const BEST_KEY = "arcade.breakout.best";

const BRICK_COLORS: Record<number, number> = { 1: PAL.leaf, 2: PAL.orangeLight, 3: PAL.berry };
const POWER_COLORS: Record<PowerUp, number> = { wide: PAL.leaf, multi: PAL.orangeLight, laser: PAL.berry, sticky: PAL.tan };
const POWER_NAMES: Record<PowerUp, string> = { wide: "RAQUETTE LARGE", multi: "MULTIBALLE", laser: "LASER", sticky: "RAQUETTE COLLANTE" };

type State = "loading" | "ready" | "playing" | "paused" | "over" | "won";

export class BreakoutScene extends Phaser.Scene {
  private levels: LevelData[] = [];
  private world!: BreakoutWorld;
  private state: State = "loading";
  private acc = 0;
  private best = 0;
  private newRecord = false;
  private gfx!: PhaserType.GameObjects.Graphics;
  private fxg!: PhaserType.GameObjects.Graphics;
  private ug!: PhaserType.GameObjects.Graphics;
  private fx = new Particles();
  private overlay!: Overlay;
  private score = new Counter();
  private wobble = new Map<string, number>();
  private trail = new Map<number, Array<{ x: number; y: number }>>();
  private texts!: Record<"score" | "level" | "levelName" | "best", PhaserType.GameObjects.Text>;
  private keys!: Record<string, PhaserType.Input.Keyboard.Key>;
  private prevPad: boolean[] = [];
  private shown = { score: -1, level: -1, best: -1 };

  constructor() {
    super("breakout");
  }

  create(): void {
    this.gfx = this.add.graphics().setDepth(10).setPosition(FX, FY);
    this.fxg = this.add.graphics().setDepth(40).setPosition(FX, FY);
    this.ug = this.add.graphics().setDepth(60);
    this.overlay = new Overlay(this, GAME_W, GAME_H);
    new MuteButton(this, GAME_W - 68, 8, 48);
    makeText(this, 20, 6, "BREAKOUT", 46, PAL.orangeLight, { strokeW: 8 }).setDepth(5);
    this.add.text(GAME_W / 2, GAME_H / 2, "chargement…", { fontFamily: FONT_BODY, fontSize: "24px", color: "#fdf3de" }).setOrigin(0.5).setName("loading");

    this.keys = this.input.keyboard!.addKeys({
      left: "LEFT", right: "RIGHT", a: "A", d: "D", space: "SPACE", up: "UP", p: "P", esc: "ESC", r: "R", enter: "ENTER",
    }) as unknown as Record<string, PhaserType.Input.Keyboard.Key>;
    this.input.on("pointermove", (p: PhaserType.Input.Pointer) => {
      if (this.state === "playing") this.world.moveTo(p.x - FX);
    });
    this.input.on("pointerdown", (p: PhaserType.Input.Pointer) => {
      if (this.state !== "playing") return;
      this.world.moveTo(p.x - FX);
      this.world.fire();
    });
    onBlur(this, () => {
      if (this.state === "playing") this.pause();
    });

    void fetch("data/arcade/levels.json")
      .then((r) => r.json())
      .then((json: { levels: LevelData[] }) => {
        this.levels = json.levels;
        this.children.getByName("loading")?.destroy();
        this.best = loadBest(BEST_KEY);
        this.buildStatic();
        this.resetGame();
        this.showStart();
      });
  }

  // ---------- décor fixe ----------

  private buildStatic(): void {
    const bg = this.add.graphics().setDepth(0);
    drawPanel(bg, FX - 14, FY - 14, FIELD_W + 28, FIELD_H + 28, { fill: 0x1b3224, depth: 8, bw: 8 });
    for (let r = 0; r < FIELD_H / CELL_H; r++) {
      for (let c = 0; c < FIELD_W / CELL_W; c++) {
        bg.fillStyle((r + c) % 2 === 0 ? 0x213f2d : 0x264833, 1);
        bg.fillRect(FX + c * CELL_W, FY + r * CELL_H, CELL_W, CELL_H);
      }
    }
    // zone raquette : sol légèrement plus sombre
    bg.fillStyle(0x16291f, 0.8);
    bg.fillRect(FX, FY + PADDLE_Y - 34, FIELD_W, FIELD_H - PADDLE_Y + 34);

    const panel = (x: number, y: number, h: number, title: string): void => {
      drawPanel(bg, x, y, COL_W, h, { fill: PAL.field, depth: 6, bw: 4 });
      bg.fillStyle(PAL.ink0, 1);
      bg.fillRect(x + 4, y + 4, COL_W - 8, 30);
      makeText(this, x + COL_W / 2, y + 19, title, 21, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
    };
    panel(LX, FY, 120, "SCORE");
    panel(LX, FY + 142, 96, "VIES");
    panel(LX, FY + 260, 120, "NIVEAU");
    panel(LX, FY + 402, 96, "MEILLEUR");
    panel(RX, FY, 250, "BONUS");
    this.texts = {
      score: makeText(this, LX + COL_W / 2, FY + 82, "0", 36, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 }).setDepth(5),
      level: makeText(this, LX + COL_W / 2, FY + 260 + 66, "1/10", 34, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 }).setDepth(5),
      levelName: makeText(this, LX + COL_W / 2, FY + 260 + 100, "", 15, PAL.dim, { font: FONT_BODY, origin: [0.5, 0.5], strokeW: 3, shadow: false }).setDepth(5),
      best: makeText(this, LX + COL_W / 2, FY + 402 + 64, "0", 32, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 5 }).setDepth(5),
    };

    drawPanel(bg, RX, FY + 272, COL_W, 250, { fill: PAL.field, depth: 6, bw: 4 });
    bg.fillStyle(PAL.ink0, 1);
    bg.fillRect(RX + 4, FY + 276, COL_W - 8, 30);
    makeText(this, RX + COL_W / 2, FY + 291, "COMMANDES", 21, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
    const rows: Array<[string, string]> = [["← →", "bouger"], ["souris", "bouger"], ["ESPACE", "lancer"], ["clic", "lancer"], ["P", "pause"], ["M", "son"]];
    rows.forEach(([k, label], i) => {
      const y = FY + 318 + i * 32;
      makeText(this, RX + 12, y, k, 16, PAL.leaf, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5).setFontStyle("800");
      makeText(this, RX + COL_W - 12, y + 2, label, 14, PAL.panel2, { font: FONT_BODY, origin: [1, 0], strokeW: 3, shadow: false }).setDepth(5);
    });
  }

  // ---------- états ----------

  private resetGame(): void {
    this.world = new BreakoutWorld(this.levels, readSeed());
    this.acc = 0;
    this.newRecord = false;
    this.fx.clear();
    this.wobble.clear();
    this.trail.clear();
    this.score.reset(0);
    this.shown = { score: -1, level: -1, best: -1 };
  }

  private showStart(): void {
    this.state = "ready";
    this.overlay.show(
      { title: "BREAKOUT", subtitle: this.best > 0 ? `Meilleur score : ${this.best}` : "Dix niveaux de briques", lines: ["Casse tout, attrape les bonus", "L'impact sur la raquette oriente la balle"], button: "Jouer", hint: "ESPACE ou clic" },
      () => this.startGame(),
    );
  }

  private startGame(): void {
    this.overlay.hide();
    if (this.state !== "ready") this.resetGame();
    this.state = "playing";
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
  }

  private finish(won: boolean, score: number): void {
    this.state = won ? "won" : "over";
    if (score > this.best) {
      this.best = score;
      this.newRecord = true;
      saveBest(BEST_KEY, this.best);
    }
    if (won) arp([523, 659, 784, 1047, 784, 1047, 1319], 0.1, { vol: 0.05 });
    else [0, 1, 2, 3].forEach((i) => tone(330 - i * 60, 0.22, { vol: 0.05, type: "sawtooth", delay: i * 0.12, freqEnd: 200 - i * 40 }));
    this.time.delayedCall(won ? 900 : 700, () => {
      if (this.state !== "over" && this.state !== "won") return;
      this.overlay.show(
        {
          title: won ? "VICTOIRE !" : "PARTIE FINIE",
          subtitle: `Score ${score}`,
          lines: [won ? "Les dix niveaux sont à toi" : `Niveau ${Math.min(this.world.rules.level, 10)} atteint`, this.newRecord ? "★ Nouveau record ! ★" : `Meilleur : ${this.best}`],
          button: "Rejouer",
          hint: "ESPACE ou R",
        },
        () => this.startGame(),
      );
    });
  }

  // ---------- boucle ----------

  update(_time: number, delta: number): void {
    if (this.state === "loading") return;
    this.fx.update(delta);
    const j: Record<string, boolean> = {};
    for (const name of Object.keys(this.keys)) j[name] = Phaser.Input.Keyboard.JustDown(this.keys[name]);
    if (j.r && this.state !== "ready") this.startGame();
    if ((j.space || j.enter) && this.overlay.visible) {
      this.overlay.activate();
      j.space = false; // la touche a servi à l'écran superposé : elle ne lance pas la balle
      j.enter = false;
    }
    if (j.p || j.esc) {
      if (this.state === "playing") this.pause();
      else if (this.state === "paused") this.resume();
    }
    const pad = readPad();
    if (pad && pad.buttons[9] && !this.prevPad[9]) {
      if (this.state === "playing") this.pause();
      else if (this.overlay.visible) this.overlay.activate();
    }

    if (this.state === "playing") {
      const k = this.keys;
      const dir = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0) + (pad ? pad.x : 0);
      if (j.space || j.up || (pad && pad.buttons[0] && !this.prevPad[0])) this.world.fire();
      this.acc += delta;
      while (this.acc >= TICK_MS) {
        this.acc -= TICK_MS;
        if (dir !== 0) this.world.nudge(dir);
        this.onEvents(this.world.step());
        if (this.state !== "playing") break;
      }
    }
    this.prevPad = pad ? pad.buttons.slice() : [];
    this.render(delta);
  }

  private onEvents(events: WorldEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case "wall":
          tone(210, 0.03, { vol: 0.02, type: "triangle" });
          break;
        case "paddle":
          tone(e.stuck ? 260 : 340, 0.05, { vol: 0.035, type: "triangle", freqEnd: 260 });
          this.fx.burst(e.x, e.y, { n: 3, color: [PAL.cream], speed: 120, life: 220, size: 4, gravity: 300, angle: -Math.PI / 2, spread: Math.PI });
          break;
        case "brick":
          this.onBrick(e);
          break;
        case "drop":
          break;
        case "power":
          this.onPower(e.power);
          break;
        case "launch":
          noise(0.1, { vol: 0.04, freq: 1400 });
          tone(300, 0.1, { vol: 0.04, type: "sawtooth", freqEnd: 600 });
          break;
        case "laser":
          tone(1200, 0.04, { vol: 0.02, type: "square", freqEnd: 500 });
          break;
        case "lifeLost":
          tone(220, 0.4, { vol: 0.05, type: "sawtooth", freqEnd: 70 });
          this.cameras.main.shake(260, 0.01);
          popText(this, FX + FIELD_W / 2, FY + 440, e.lives > 0 ? `PLUS QUE ${e.lives} ${e.lives > 1 ? "VIES" : "VIE"}` : "DERNIÈRE BALLE PERDUE", 38, PAL.red, { ms: 1100 });
          break;
        case "levelClear":
          arp([523, 659, 784, 1047], 0.07, { vol: 0.05 });
          this.cameras.main.shake(200, 0.006);
          popText(this, FX + FIELD_W / 2, FY + 330, `NIVEAU ${e.level} TERMINÉ`, 40, PAL.leaf, { ms: 1100 });
          popText(this, FX + FIELD_W / 2, FY + 380, `BONUS +${e.bonus}`, 28, PAL.orangeLight, { ms: 1100, rise: 30 });
          break;
        case "levelStart": {
          const name = this.levels[Math.min(e.level, 10) - 1]?.name ?? "";
          popText(this, FX + FIELD_W / 2, FY + 440, `NIVEAU ${e.level}`, 54, PAL.orangeLight, { ms: 1500, rise: 30 });
          popText(this, FX + FIELD_W / 2, FY + 492, name, 26, PAL.cream, { ms: 1500, rise: 20 });
          break;
        }
        case "win":
          this.finish(true, e.score);
          break;
        case "gameover":
          this.finish(false, e.score);
          break;
      }
    }
  }

  private onBrick(e: Extract<WorldEvent, { type: "brick" }>): void {
    if (e.indestructible) {
      tone(130, 0.06, { vol: 0.04, type: "square", freqEnd: 90 });
      this.wobble.set(`${e.row}:${e.col}`, 120);
      return;
    }
    const color = BRICK_COLORS[e.maxHits] ?? PAL.leaf;
    const pitch = 360 + Math.max(0, 8 - e.row) * 55;
    this.wobble.set(`${e.row}:${e.col}`, 140);
    if (e.destroyed) {
      tone(pitch, 0.07, { vol: 0.045, type: "square", freqEnd: pitch * 1.4 });
      noise(0.06, { vol: 0.04, freq: 2600 });
      this.fx.burst(e.x, e.y, { n: 12, color: [color, PAL.cream, mix(color, 0xffffff, 0.5)], speed: 300, life: 560, size: 8, gravity: 800 });
      this.cameras.main.shake(70, 0.0014);
      popText(this, FX + e.x, FY + e.y, `+${e.points}`, 20, PAL.cream, { ms: 600, rise: 30 });
    } else {
      tone(pitch * 0.7, 0.05, { vol: 0.04, type: "square", freqEnd: pitch * 0.6 });
      this.fx.burst(e.x, e.y, { n: 4, color: [color, PAL.cream], speed: 180, life: 320, size: 5, gravity: 600 });
    }
  }

  private onPower(power: PowerUp): void {
    arp([660, 880, 1100], 0.05, { vol: 0.045, type: "triangle" });
    popText(this, FX + this.world.paddleX, FY + PADDLE_Y - 50, POWER_NAMES[power], 26, POWER_COLORS[power], { ms: 1000, rise: 40 });
    this.fx.burst(this.world.paddleX, PADDLE_Y, { n: 14, color: [POWER_COLORS[power], PAL.cream], speed: 260, life: 520, size: 7, gravity: 300 });
  }

  // ---------- rendu ----------

  private render(delta: number): void {
    const g = this.gfx;
    g.clear();
    this.fxg.clear();
    const ug = this.ug;
    ug.clear();
    const w = this.world;

    // briques (chute d'introduction, secousse au coup, fissures)
    const introP = (r: number, c: number): number => {
      if (w.intro <= 0) return 1;
      const t = (90 - w.intro) / 40 - (r * 0.09 + c * 0.015);
      const p = Math.max(0, Math.min(1, t));
      return 1 - Math.pow(1 - p, 3);
    };
    for (const b of w.rules.bricks) {
      const rect = brickRect(b.row, b.col);
      const key = `${b.row}:${b.col}`;
      const wob = this.wobble.get(key) ?? 0;
      const p = introP(b.row, b.col);
      if (p <= 0) continue;
      const jitter = wob > 0 ? Math.sin(wob * 0.6) * 2.5 * (wob / 140) : 0;
      const bw = rect.w - 4;
      const bh = rect.h - 4;
      const x = rect.x - bw / 2 + jitter;
      const y = rect.y - bh / 2 - (1 - p) * 320;
      const base = b.indestructible ? PAL.cap : BRICK_COLORS[b.maxHits] ?? PAL.leaf;
      const damaged = !b.indestructible && b.hits < b.maxHits;
      drawBevel(g, x, y, bw, bh, wob > 100 ? mix(base, 0xffffff, 0.6) : base, p);
      if (b.indestructible) {
        g.fillStyle(PAL.tan, 0.8 * p);
        g.fillRect(x + 6, y + bh / 2 - 1, bw - 12, 2);
        g.fillCircle(x + 8, y + 7, 2);
        g.fillCircle(x + bw - 8, y + bh - 7, 2);
      } else if (damaged) {
        g.lineStyle(2, PAL.ink0, 0.75 * p);
        g.beginPath();
        g.moveTo(x + bw * 0.3, y + 3);
        g.lineTo(x + bw * 0.42, y + bh * 0.5);
        g.lineTo(x + bw * 0.34, y + bh - 3);
        g.moveTo(x + bw * 0.42, y + bh * 0.5);
        g.lineTo(x + bw * 0.62, y + bh * 0.62);
        g.strokePath();
      }
    }
    for (const [k, v] of [...this.wobble]) {
      if (v - delta <= 0) this.wobble.delete(k);
      else this.wobble.set(k, v - delta);
    }

    // lasers
    for (const l of w.lasers) {
      g.fillStyle(PAL.ink0, 1);
      g.fillRect(l.x - 3, l.y - 2, 6, 16);
      g.fillStyle(PAL.orangeLight, 1);
      g.fillRect(l.x - 1.5, l.y, 3, 12);
    }

    // bonus tombants : capsules avec icône
    for (const d of w.drops) this.drawCapsule(g, d.power, d.x, d.y);

    // raquette
    const pw = w.paddleW;
    const px = w.paddleX - pw / 2;
    const py = PADDLE_Y - PADDLE_H / 2;
    if (w.timers.sticky > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 120);
      g.fillStyle(PAL.cream, 0.15 + 0.2 * pulse);
      g.fillRect(px - 6, py - 6, pw + 12, PADDLE_H + 12);
    }
    drawBevel(g, px, py, pw, PADDLE_H, PAL.orange);
    g.fillStyle(PAL.ink0, 1);
    g.fillRect(px - 3, py + 2, 6, PADDLE_H - 4);
    g.fillRect(px + pw - 3, py + 2, 6, PADDLE_H - 4);
    if (w.timers.laser > 0) {
      g.fillStyle(PAL.ink0, 1);
      g.fillRect(px + 4, py - 10, 10, 12);
      g.fillRect(px + pw - 14, py - 10, 10, 12);
      g.fillStyle(PAL.berry, 1);
      g.fillRect(px + 6, py - 8, 6, 8);
      g.fillRect(px + pw - 12, py - 8, 6, 8);
    }

    // balles : traînée puis balle
    const alive = new Set<number>();
    w.balls.forEach((b, i) => {
      alive.add(i);
      let tr = this.trail.get(i);
      if (!tr) {
        tr = [];
        this.trail.set(i, tr);
      }
      if (!b.stuck) {
        tr.push({ x: b.x, y: b.y });
        if (tr.length > 12) tr.shift();
      } else tr.length = 0;
      tr.forEach((p, idx) => {
        const k = idx / Math.max(1, tr!.length);
        g.fillStyle(PAL.orangeLight, 0.3 * k);
        g.fillCircle(p.x, p.y, BALL_R * (0.35 + 0.55 * k));
      });
      g.fillStyle(PAL.ink0, 1);
      g.fillCircle(b.x, b.y, BALL_R + 2);
      g.fillStyle(PAL.cream, 1);
      g.fillCircle(b.x, b.y, BALL_R);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(b.x - 2.5, b.y - 2.5, 2.8);
    });
    for (const k of [...this.trail.keys()]) if (!alive.has(k)) this.trail.delete(k);

    // direction de lancement : petit repère au-dessus de la balle collée
    const stuck = w.balls.find((b) => b.stuck);
    if (stuck && this.state === "playing") {
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 180);
      g.lineStyle(3, PAL.cream, 0.35 + 0.35 * pulse);
      g.beginPath();
      g.moveTo(stuck.x, stuck.y - 18);
      g.lineTo(stuck.x, stuck.y - 52 - pulse * 6);
      g.strokePath();
      g.fillStyle(PAL.cream, 0.5 + 0.4 * pulse);
      g.fillTriangle(stuck.x - 7, stuck.y - 52 - pulse * 6, stuck.x + 7, stuck.y - 52 - pulse * 6, stuck.x, stuck.y - 64 - pulse * 6);
    }

    this.fx.draw(this.fxg);

    // vies : cœurs
    for (let i = 0; i < 3; i++) {
      const x = LX + 30 + i * 40;
      const y = FY + 142 + 66;
      this.drawHeart(ug, x, y, i < w.rules.lives);
    }

    // bonus actifs : une ligne par bonus avec barre de temps
    const power: Array<[PowerUp, number, number]> = [["wide", w.timers.wide, 720], ["laser", w.timers.laser, 600], ["sticky", w.timers.sticky, 900]];
    power.forEach(([p, left, max], i) => {
      const y = FY + 56 + i * 58;
      const on = left > 0;
      this.drawCapsule(ug, p, RX + 34, y + 12, on ? 1 : 0.3);
      ug.fillStyle(PAL.ink0, 1);
      ug.fillRect(RX + 62, y + 6, 66, 14);
      ug.fillStyle(on ? POWER_COLORS[p] : 0x2d4f3a, 1);
      ug.fillRect(RX + 64, y + 8, 62 * (left / max), 10);
    });
    ug.fillStyle(PAL.dim, 0.7);
    ug.fillRect(RX + 14, FY + 56 + 3 * 58 - 6, COL_W - 28, 2);
    this.drawCapsule(ug, "multi", RX + 34, FY + 56 + 3 * 58 + 20, 0.9);

    // valeurs
    const sc = this.score.update(w.rules.score, delta);
    if (sc !== this.shown.score) {
      this.texts.score.setText(String(sc));
      this.shown.score = sc;
    }
    const lvl = Math.min(w.rules.level, 10);
    if (lvl !== this.shown.level) {
      this.texts.level.setText(`${lvl}/10`);
      this.texts.levelName.setText(this.levels[lvl - 1]?.name ?? "");
      this.shown.level = lvl;
    }
    const best = Math.max(this.best, w.rules.score);
    if (best !== this.shown.best) {
      this.texts.best.setText(String(best));
      this.shown.best = best;
    }
  }

  /** Capsule de bonus : fond coloré, contour sombre, icône. */
  private drawCapsule(g: PhaserType.GameObjects.Graphics, power: PowerUp, x: number, y: number, alpha = 1): void {
    const color = POWER_COLORS[power];
    drawBevel(g, x - 18, y - 11, 36, 22, color, alpha);
    g.fillStyle(PAL.ink0, alpha);
    switch (power) {
      case "wide":
        g.fillRect(x - 9, y - 1.5, 18, 3);
        g.fillTriangle(x - 13, y, x - 7, y - 5, x - 7, y + 5);
        g.fillTriangle(x + 13, y, x + 7, y - 5, x + 7, y + 5);
        break;
      case "multi":
        g.fillCircle(x - 8, y, 3.2);
        g.fillCircle(x, y, 3.2);
        g.fillCircle(x + 8, y, 3.2);
        break;
      case "laser":
        g.fillRect(x - 7, y - 6, 3, 12);
        g.fillRect(x + 4, y - 6, 3, 12);
        break;
      case "sticky":
        g.fillCircle(x, y + 1, 5);
        g.fillTriangle(x - 4, y - 1, x + 4, y - 1, x, y - 8);
        break;
    }
  }

  private drawHeart(g: PhaserType.GameObjects.Graphics, x: number, y: number, full: boolean): void {
    const c = full ? PAL.berry : 0x2d4f3a;
    g.fillStyle(PAL.ink0, 1);
    g.fillCircle(x - 7, y - 3, 11);
    g.fillCircle(x + 7, y - 3, 11);
    g.fillTriangle(x - 17, y, x + 17, y, x, y + 18);
    g.fillStyle(c, 1);
    g.fillCircle(x - 7, y - 3, 8);
    g.fillCircle(x + 7, y - 3, 8);
    g.fillTriangle(x - 14, y, x + 14, y, x, y + 14);
    if (full) {
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(x - 9, y - 6, 2.5);
    }
  }
}

