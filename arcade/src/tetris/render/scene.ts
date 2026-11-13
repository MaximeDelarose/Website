import type PhaserType from "phaser";
import { Phaser } from "../../shared/engines.js";
import { readPad } from "../../shared/gamepad.js";
import { loadBest, saveBest } from "../../shared/storage.js";
import { arp, noise, tone } from "../../shared/audio.js";
import { readSeed } from "../../shared/seed.js";
import { FONT_BODY, PAL, mix } from "../../shared/theme.js";
import { Counter, MuteButton, Overlay, Particles, TouchPad, drawBlock, drawPanel, isTouch, makeText, onBlur, popText } from "../../shared/kit.js";
import { Mascot, SQUIRREL_NAMES, SpritePool, spriteKey } from "../../shared/art.js";
import { TetrisGame, type TetrisEvent } from "../core/game.js";
import { BOARD_H, BOARD_W, HIDDEN_ROWS } from "../core/board.js";
import { KINDS, type Kind, cellsOf } from "../core/pieces.js";

const TICK_MS = 1000 / 60;
export const TOUCH = isTouch();
export const GAME_W = 760;
export const GAME_H = TOUCH ? 1010 : 820;

const C = 36; // taille d'une case
const BX = 200;
const BY = 64;
const BW = BOARD_W * C;
const BH = (BOARD_H - HIDDEN_ROWS) * C;
const LX = 20; // colonne de gauche
const RX = 580; // colonne de droite
const COL_W = 160;
const BEST_KEY = "arcade.tetris.best";

/** Une couleur par pièce, tirée de la palette du site. */
const COLORS: Record<Kind, number> = {
  I: PAL.leaf,
  O: PAL.orangeLight,
  T: 0xd9a0e8,
  S: PAL.moss2,
  Z: PAL.berry,
  J: 0x7fb4d8,
  L: PAL.orange,
};

/** Une icône du site par pièce, dessinée dans chaque case. */
const ICONS: Record<Kind, string> = { I: "leaf", O: "acorn", T: "mushroom", S: "clover", Z: "berry", J: "pinecone", L: "nut" };

type State = "ready" | "playing" | "paused" | "over";

interface Trail { x: number; y0: number; y1: number; color: number; life: number }
interface Flash { x: number; y: number; life: number }

export class TetrisScene extends Phaser.Scene {
  private tetris!: TetrisGame;
  private state: State = "ready";
  private seed = 0;
  private acc = 0;
  private best = 0;
  private newRecord = false;
  private gfx!: PhaserType.GameObjects.Graphics;
  private fxGfx!: PhaserType.GameObjects.Graphics;
  private fx = new Particles();
  private sprites!: SpritePool;
  private mascot: Mascot | null = null;
  private iconBig: Partial<Record<Kind, string | null>> = {};
  private iconSmall: Partial<Record<Kind, string | null>> = {};
  private overlay!: Overlay;
  private pad: TouchPad | null = null;
  private trails: Trail[] = [];
  private flashes: Flash[] = [];
  private flashWhite = 0;
  private scoreCounter = new Counter();
  private texts!: Record<"score" | "lines" | "level" | "best", PhaserType.GameObjects.Text>;
  private shown = { lines: -1, level: -1, best: -1, score: -1 };
  private keys!: Record<string, PhaserType.Input.Keyboard.Key>;
  private prevPad: boolean[] = [];
  private just: Record<string, boolean> = {};

  constructor() {
    super("tetris");
  }

  create(): void {
    this.best = loadBest(BEST_KEY);
    this.buildStatic();
    this.gfx = this.add.graphics().setDepth(10);
    this.fxGfx = this.add.graphics().setDepth(40);
    this.sprites = new SpritePool(this, 11);
    for (const kind of KINDS) {
      this.iconBig[kind] = spriteKey(this, ICONS[kind], 3);
      this.iconSmall[kind] = spriteKey(this, ICONS[kind], 2);
    }
    if (!TOUCH) this.mascot = new Mascot(this, SQUIRREL_NAMES[0], LX + COL_W / 2, GAME_H - 14, 5);
    this.overlay = new Overlay(this, GAME_W, GAME_H);
    new MuteButton(this, GAME_W - 68, 8, 48);
    if (TOUCH) {
      const y = 810;
      this.pad = new TouchPad(this, [
        { id: "left", x: 20, y, w: 150, h: 170, label: "◀" },
        { id: "down", x: 186, y, w: 150, h: 170, label: "▼" },
        { id: "right", x: 352, y, w: 150, h: 170, label: "▶" },
        { id: "hold", x: 520, y, w: 100, h: 170, label: "C", color: PAL.moss2 },
        { id: "rot", x: 632, y, w: 108, h: 80, label: "⟳", color: PAL.orange },
        { id: "drop", x: 632, y: y + 90, w: 108, h: 80, label: "⤓", color: PAL.berry },
      ]);
    }

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      left: "LEFT", right: "RIGHT", down: "DOWN", up: "UP", a: "A", d: "D", s: "S", w: "W", x: "X", z: "Z",
      space: "SPACE", c: "C", shift: "SHIFT", p: "P", esc: "ESC", r: "R", enter: "ENTER",
    }) as unknown as Record<string, PhaserType.Input.Keyboard.Key>;
    onBlur(this, () => {
      if (this.state === "playing") this.pause();
    });

    this.resetGame();
    this.showStart();
  }

  // ---------- décor fixe ----------

  private buildStatic(): void {
    const bg = this.add.graphics().setDepth(0);
    // plateau : cadre + damier discret
    drawPanel(bg, BX - 14, BY - 14, BW + 28, BH + 28, { fill: 0x1b3224, depth: 8, bw: 8 });
    for (let r = 0; r < BOARD_H - HIDDEN_ROWS; r++) {
      for (let c = 0; c < BOARD_W; c++) {
        bg.fillStyle((r + c) % 2 === 0 ? 0x213f2d : 0x264833, 1);
        bg.fillRect(BX + c * C, BY + r * C, C, C);
      }
    }
    makeText(this, LX, 6, "TETRIS", 46, PAL.orangeLight, { strokeW: 8 }).setDepth(5);

    const panel = (x: number, y: number, h: number, title: string): void => {
      drawPanel(bg, x, y, COL_W, h, { fill: PAL.field, depth: 6, bw: 4 });
      bg.fillStyle(PAL.ink0, 1);
      bg.fillRect(x + 4, y + 4, COL_W - 8, 30);
      makeText(this, x + COL_W / 2, y + 19, title, 22, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
    };
    panel(LX, BY, 170, "GARDER");
    panel(LX, 252, 120, "SCORE");
    panel(LX, 394, 84, "LIGNES");
    panel(LX, 500, 84, "NIVEAU");
    panel(LX, 606, 84, "MEILLEUR");
    panel(RX, BY, 330, "SUIVANTES");

    const value = (x: number, y: number, size = 40): PhaserType.GameObjects.Text =>
      makeText(this, x + COL_W / 2, y, "0", size, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 }).setDepth(5);
    this.texts = {
      score: value(LX, 252 + 80, 44),
      lines: value(LX, 394 + 58),
      level: value(LX, 500 + 58),
      best: value(LX, 606 + 58, 34).setColor("#f2b05e"),
    };

    if (!TOUCH) {
      drawPanel(bg, RX, 416, COL_W, 368, { fill: PAL.field, depth: 6, bw: 4 });
      bg.fillStyle(PAL.ink0, 1);
      bg.fillRect(RX + 4, 420, COL_W - 8, 30);
      makeText(this, RX + COL_W / 2, 435, "COMMANDES", 22, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
      const rows: Array<[string, string]> = [
        ["← →", "bouger"], ["↑  X", "tourner"], ["Z", "tourner ↺"], ["↓", "descendre"], ["ESPACE", "chute"], ["C", "garder"], ["P", "pause"], ["M", "son"],
      ];
      rows.forEach(([k, label], i) => {
        const y = 468 + i * 38;
        makeText(this, RX + 14, y, k, 20, PAL.leaf, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5).setFontStyle("800");
        makeText(this, RX + COL_W - 14, y, label, 18, PAL.panel2, { font: FONT_BODY, origin: [1, 0], strokeW: 3, shadow: false }).setDepth(5);
      });
    }
  }

  // ---------- états ----------

  private resetGame(): void {
    this.seed = readSeed();
    this.tetris = new TetrisGame(this.seed);
    this.acc = 0;
    this.newRecord = false;
    this.trails = [];
    this.flashes = [];
    this.fx.clear();
    this.scoreCounter.reset(0);
    this.shown = { lines: -1, level: -1, best: -1, score: -1 };
  }

  private showStart(): void {
    this.state = "ready";
    this.overlay.show(
      { title: "TETRIS", subtitle: this.best > 0 ? `Meilleur score : ${this.best}` : "Empile, complète des lignes", lines: TOUCH ? ["Boutons en bas de l'écran"] : ["← → bouger · ↑ tourner · ESPACE chute"], button: "Jouer", hint: TOUCH ? "Touche pour jouer" : "ESPACE ou clic" },
      () => this.startGame(),
    );
  }

  private startGame(): void {
    this.overlay.hide();
    this.resetGame();
    this.mascot?.reset();
    this.state = "playing";
    arp([392, 523, 659], 0.07, { vol: 0.04, type: "square" });
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

  private gameOver(): void {
    this.state = "over";
    const score = this.tetris.score;
    if (score > this.best) {
      this.best = score;
      this.newRecord = true;
      saveBest(BEST_KEY, this.best);
    }
    this.cameras.main.shake(260, 0.012);
    this.mascot?.sad();
    [0, 1, 2, 3].forEach((i) => tone(330 - i * 60, 0.22, { vol: 0.05, type: "sawtooth", delay: i * 0.12, freqEnd: 200 - i * 40 }));
    this.time.delayedCall(700, () => {
      if (this.state !== "over") return;
      this.overlay.show(
        {
          title: "PARTIE FINIE",
          subtitle: `Score ${score}`,
          lines: [`${this.tetris.lines} lignes · niveau ${this.tetris.level}`, this.newRecord ? "★ Nouveau record ! ★" : `Meilleur : ${this.best}`],
          button: "Rejouer",
          hint: "ESPACE ou R",
        },
        () => this.startGame(),
      );
    });
  }

  // ---------- boucle ----------

  update(_time: number, delta: number): void {
    this.fx.update(delta);
    this.mascot?.update(delta);
    this.trails = this.trails.filter((t) => (t.life -= delta) > 0);
    this.flashes = this.flashes.filter((f) => (f.life -= delta) > 0);
    if (this.flashWhite > 0) this.flashWhite = Math.max(0, this.flashWhite - delta);
    this.pad?.poll();

    // JustDown est consommé à la première lecture : on lit chaque touche une seule fois par frame.
    const j: Record<string, boolean> = {};
    for (const name of Object.keys(this.keys)) j[name] = Phaser.Input.Keyboard.JustDown(this.keys[name]);
    this.just = j;
    if (j.r && this.state !== "ready") this.startGame();
    if ((j.space || j.enter) && this.overlay.visible) {
      this.overlay.activate();
      j.space = false; // la touche a servi à l'écran superposé : elle ne fait pas tomber la pièce
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

    if (this.state === "playing") this.playFrame(delta, pad);
    if (pad) this.prevPad = pad.buttons.slice();
    else this.prevPad = [];

    this.render(delta);
  }

  private playFrame(delta: number, pad: ReturnType<typeof readPad>): void {
    const j = this.just;
    const k = this.keys;
    const g = this.tetris;
    const edge = (i: number): boolean => !!pad && !!pad.buttons[i] && !this.prevPad[i];

    if (j.up || j.w || j.x || edge(0) || this.pad?.pressed("rot")) g.rotate(1);
    if (j.z || edge(1)) g.rotate(-1);
    if (j.shift || j.c || edge(3) || this.pad?.pressed("hold")) g.holdPiece();
    if (j.space || edge(2) || this.pad?.pressed("drop")) g.hardDrop();

    const left = k.left.isDown || k.a.isDown || (pad?.x ?? 0) < 0 || !!this.pad?.isDown("left");
    const right = k.right.isDown || k.d.isDown || (pad?.x ?? 0) > 0 || !!this.pad?.isDown("right");
    const down = k.down.isDown || k.s.isDown || (pad?.y ?? 0) > 0 || !!this.pad?.isDown("down");

    this.acc += delta;
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      g.setHeld(left, right);
      g.setSoftDrop(down);
      this.onEvents(g.step());
      if (g.over) break;
    }
  }

  private onEvents(events: TetrisEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case "move":
          tone(250, 0.025, { vol: 0.018, type: "triangle" });
          break;
        case "rotate":
          tone(430, 0.05, { vol: 0.025, type: "triangle", freqEnd: 520 });
          break;
        case "hold":
          tone(380, 0.06, { vol: 0.03, type: "sine" });
          tone(560, 0.07, { vol: 0.03, type: "sine", delay: 0.05 });
          break;
        case "lock":
          this.onLock(e);
          break;
        case "lines":
          this.onLines(e);
          break;
        case "level":
          arp([523, 659, 784, 1047, 1319], 0.06, { vol: 0.05, type: "square" });
          this.flashWhite = 220;
          this.mascot?.set(SQUIRREL_NAMES[(e.level - 1) % SQUIRREL_NAMES.length]);
          this.mascot?.cheer();
          popText(this, BX + BW / 2, BY + BH / 2 - 90, `NIVEAU ${e.level}`, 54, PAL.leaf, { ms: 1100 });
          break;
        case "gameover":
          this.gameOver();
          break;
      }
    }
  }

  private cellPos(row: number, col: number): { x: number; y: number } {
    return { x: BX + col * C, y: BY + (row - HIDDEN_ROWS) * C };
  }

  private onLock(e: Extract<TetrisEvent, { type: "lock" }>): void {
    const color = COLORS[e.kind];
    noise(0.06, { vol: 0.05, freq: 900 });
    tone(110, 0.08, { vol: 0.05, type: "square", freqEnd: 70 });
    for (const [r, c] of e.cells) {
      const p = this.cellPos(r, c);
      this.flashes.push({ x: p.x, y: p.y, life: 110 });
    }
    if (e.hard && e.distance > 0) {
      noise(0.12, { vol: 0.07, freq: 650 });
      this.cameras.main.shake(90, Math.min(0.012, 0.003 + e.distance * 0.0004));
      const cols = new Map<number, number>();
      for (const [r, c] of e.cells) cols.set(c, Math.min(cols.get(c) ?? 99, r));
      for (const [c, top] of cols) {
        const x = BX + c * C;
        const yEnd = this.cellPos(top, c).y;
        this.trails.push({ x, y0: yEnd - e.distance * C, y1: yEnd, color, life: 200 });
        this.fx.burst(x + C / 2, this.cellPos(Math.max(...e.cells.filter(([, cc]) => cc === c).map(([r]) => r)), c).y + C, { n: 4, color: [color, PAL.cream], speed: 160, life: 380, size: 6, gravity: 500, angle: -Math.PI / 2, spread: Math.PI * 0.9 });
      }
    }
  }

  private onLines(e: Extract<TetrisEvent, { type: "lines" }>): void {
    const names = ["", "SIMPLE", "DOUBLE", "TRIPLE", "TETRIS !"];
    const notes = e.count >= 4 ? [523, 659, 784, 1047, 1319] : e.count === 3 ? [523, 659, 784, 988] : e.count === 2 ? [523, 659, 784] : [523, 659];
    arp(notes, 0.055, { vol: 0.055, type: "square" });
    noise(0.18, { vol: 0.06, freq: 3200 });
    this.cameras.main.shake(140 + e.count * 40, 0.003 + e.count * 0.0028);
    this.flashWhite = e.count >= 4 ? 260 : 120;
    this.mascot?.cheer();
    for (const r of e.rows) {
      for (let c = 0; c < BOARD_W; c++) {
        const v = this.tetris.board.grid[r][c];
        const color = v > 0 ? COLORS[KINDS[v - 1]] : PAL.cream;
        const p = this.cellPos(r, c);
        this.fx.burst(p.x + C / 2, p.y + C / 2, { n: e.count >= 4 ? 4 : 2, color: [color, PAL.cream], speed: 280 + e.count * 50, life: 700, size: 8, gravity: 700 });
      }
    }
    const midY = this.cellPos(e.rows[Math.floor(e.rows.length / 2)], 0).y;
    popText(this, BX + BW / 2, midY, names[e.count] ?? "", e.count >= 4 ? 64 : 48, e.count >= 4 ? PAL.orangeLight : PAL.cream, { ms: 900, rise: 70 });
    if (e.b2b) popText(this, BX + BW / 2, midY + 54, "BACK-TO-BACK ×1,5", 26, PAL.leaf, { ms: 1000, rise: 40 });
    if (e.combo > 0) popText(this, BX + BW / 2, midY - 52, `COMBO ×${e.combo + 1}`, 28, PAL.leaf, { ms: 900, rise: 30 });
  }

  // ---------- rendu ----------

  private render(delta: number): void {
    const g = this.gfx;
    g.clear();
    const fxg = this.fxGfx;
    fxg.clear();
    const game = this.tetris;
    this.sprites.begin();

    // pile : cases posées, avec animation d'effacement
    const clearing = new Set(game.clearRows);
    const p = game.clearProgress;
    let topRow = BOARD_H;
    for (let r = HIDDEN_ROWS; r < BOARD_H; r++) {
      for (let c = 0; c < BOARD_W; c++) {
        const v = game.board.grid[r][c];
        if (!v) continue;
        topRow = Math.min(topRow, r);
        const { x, y } = this.cellPos(r, c);
        if (clearing.has(r)) {
          if (p < 0.4) {
            const blink = Math.floor(p * 24) % 2 === 0;
            drawBlock(g, x, y, C, blink ? 0xffffff : COLORS[KINDS[v - 1]]);
          } else {
            const k = 1 - (p - 0.4) / 0.6;
            const s = Math.max(2, C * k);
            drawBlock(g, x + (C - s) / 2, y + (C - s) / 2, s, mix(COLORS[KINDS[v - 1]], 0xffffff, 0.7));
          }
        } else {
          drawBlock(g, x, y, C, COLORS[KINDS[v - 1]]);
          this.sprites.draw(this.iconBig[KINDS[v - 1]] ?? null, x + C / 2, y + C / 2 + 1);
        }
      }
    }

    // pièce fantôme et pièce active
    const active = game.active;
    if (active && this.state !== "ready") {
      const color = COLORS[active.kind];
      const ghost = game.ghostRow() ?? active.row;
      if (ghost !== active.row) {
        for (const [dr, dc] of cellsOf(active.kind, active.rot)) {
          const r = ghost + dr;
          if (r < HIDDEN_ROWS) continue;
          const { x, y } = this.cellPos(r, active.col + dc);
          g.fillStyle(color, 0.16);
          g.fillRect(x + 2, y + 2, C - 4, C - 4);
          g.lineStyle(3, color, 0.7);
          g.strokeRect(x + 3, y + 3, C - 6, C - 6);
        }
      }
      for (const [dr, dc] of cellsOf(active.kind, active.rot)) {
        const r = active.row + dr;
        if (r < HIDDEN_ROWS) continue;
        const { x, y } = this.cellPos(r, active.col + dc);
        drawBlock(g, x, y, C, color);
        this.sprites.draw(this.iconBig[active.kind] ?? null, x + C / 2, y + C / 2 + 1);
      }
    }

    // éclats de verrouillage et traînées de chute
    for (const f of this.flashes) {
      fxg.fillStyle(0xffffff, 0.75 * (f.life / 110));
      fxg.fillRect(f.x, f.y, C, C);
    }
    for (const t of this.trails) {
      const a = 0.35 * (t.life / 200);
      fxg.fillStyle(t.color, a);
      fxg.fillRect(t.x + 4, t.y0, C - 8, t.y1 - t.y0);
    }
    this.fx.draw(fxg);

    // cadre du plateau : rouge qui pulse quand la pile est haute
    const danger = topRow <= HIDDEN_ROWS + 5 && this.state === "playing";
    const pulse = danger ? 0.5 + 0.5 * Math.sin(this.time.now / 110) : 0;
    g.lineStyle(8, mix(PAL.ink0, PAL.red, pulse), 1);
    g.strokeRect(BX - 4, BY - 4, BW + 8, BH + 8);
    if (this.flashWhite > 0) {
      g.fillStyle(0xffffff, 0.22 * (this.flashWhite / 260));
      g.fillRect(BX, BY, BW, BH);
    }

    // panneaux : garder et suivantes
    this.drawPreview(g, game.hold, LX + COL_W / 2, BY + 105, 28, game.holdAvailable ? 1 : 0.4);
    game.next.forEach((kind, i) => {
      const size = i === 0 ? 30 : 22;
      const cy = i === 0 ? BY + 100 : i === 1 ? BY + 200 : BY + 270;
      this.drawPreview(g, kind, RX + COL_W / 2, cy, size, i === 0 ? 1 : 0.85);
    });
    this.pad?.draw(g);
    this.sprites.end();

    // valeurs
    const score = this.scoreCounter.update(game.score, delta);
    if (score !== this.shown.score) {
      this.texts.score.setText(String(score));
      this.shown.score = score;
    }
    if (game.lines !== this.shown.lines) {
      this.texts.lines.setText(String(game.lines));
      this.shown.lines = game.lines;
      this.bump(this.texts.lines);
    }
    if (game.level !== this.shown.level) {
      this.texts.level.setText(String(game.level));
      this.shown.level = game.level;
      this.bump(this.texts.level);
    }
    const best = Math.max(this.best, game.score);
    if (best !== this.shown.best) {
      this.texts.best.setText(String(best));
      this.shown.best = best;
    }
  }

  private bump(t: PhaserType.GameObjects.Text): void {
    this.tweens.add({ targets: t, scale: 1.25, duration: 90, yoyo: true, ease: "Sine.Out" });
  }

  /** Pièce centrée dans un cadre (aperçu). */
  private drawPreview(g: PhaserType.GameObjects.Graphics, kind: Kind | null, cx: number, cy: number, size: number, alpha: number): void {
    if (!kind) return;
    const cells = cellsOf(kind, 0);
    const rows = cells.map(([r]) => r);
    const cols = cells.map(([, c]) => c);
    const minR = Math.min(...rows), maxR = Math.max(...rows), minC = Math.min(...cols), maxC = Math.max(...cols);
    const w = (maxC - minC + 1) * size;
    const h = (maxR - minR + 1) * size;
    for (const [r, c] of cells) {
      const px = cx - w / 2 + (c - minC) * size;
      const py = cy - h / 2 + (r - minR) * size;
      drawBlock(g, px, py, size, COLORS[kind], alpha);
      this.sprites.draw(this.iconSmall[kind] ?? null, px + size / 2, py + size / 2 + 0.5, { scale: size / 26, alpha });
    }
  }
}
