import { Phaser } from "../../shared/engines.js";
import { readPad } from "../../shared/gamepad.js";
import { loadBest, saveBest } from "../../shared/storage.js";
import { tone } from "../../shared/audio.js";
import { TetrisGame } from "../core/game.js";
import { BOARD_H, BOARD_W, HIDDEN_ROWS } from "../core/board.js";
import { KINDS, cellsOf, boxSize } from "../core/pieces.js";
import { readSeed } from "../../shared/seed.js";
const TICK_MS = 1000 / 60;
const CELL = 24;
const BOARD_X = 40;
const BOARD_Y = 40;
const PANEL_X = 316;
const BEST_KEY = "arcade.tetris.best";
/** Palette limitée : une couleur par pièce (index = KINDS). */
const COLORS = {
    I: 0x34d8f0,
    O: 0xf2d43a,
    T: 0xb363e8,
    S: 0x5fd35f,
    Z: 0xf0505a,
    J: 0x4b7bec,
    L: 0xf39a3a,
};
const BG = 0x0b0d12;
const GRID = 0x1a1f2b;
const INK = 0xe8ecf4;
const DIM = 0x7a8294;
/** Lit clavier et manette et pilote le jeu. Le tactile est géré à part (glisser / toucher). */
export class TetrisScene extends Phaser.Scene {
    constructor() {
        super("tetris");
        this.seed = 0;
        this.acc = 0;
        this.paused = false;
        this.best = 0;
        this.prevPad = [];
        this.flash = 0;
        this.touch = null;
        this.touchDown = false;
        this.popups = [];
    }
    create() {
        this.best = loadBest(BEST_KEY);
        this.gfx = this.add.graphics();
        const style = (size, color = INK) => ({
            fontFamily: "monospace",
            fontSize: `${size}px`,
            color: `#${color.toString(16).padStart(6, "0")}`,
        });
        this.texts = {
            score: this.add.text(PANEL_X, 150, "", style(16)),
            lines: this.add.text(PANEL_X, 190, "", style(16)),
            level: this.add.text(PANEL_X, 220, "", style(16)),
            best: this.add.text(PANEL_X, 250, "", style(14, DIM)),
            over: this.add.text(BOARD_X + 20, BOARD_Y + 200, "", style(22)).setDepth(10),
            hint: this.add.text(PANEL_X, 430, "←→ bouger  ↑ tourner\n↓ descendre  ESPACE chute\nC garder  P pause", style(11, DIM)),
        };
        this.add.text(PANEL_X, 20, "TETRIS", style(22));
        this.add.text(PANEL_X, 60, "garder", style(12, DIM));
        this.add.text(PANEL_X, 340, "suivantes", style(12, DIM));
        const kb = this.input.keyboard;
        const k = kb.addKeys({
            left: "LEFT", right: "RIGHT", down: "DOWN", rotCw: "UP", rotCcw: "Z", drop: "SPACE", hold: "C", pause: "P", restart: "R",
        });
        this.keys = k;
        const extra = kb.addKeys({ a: "A", d: "D", s: "S", w: "W", x: "X", shift: "SHIFT", enter: "ENTER" });
        kb.on("keydown-ENTER", () => {
            if (this.isOver())
                this.restart();
        });
        this.extra = extra;
        this.input.on("pointerdown", (p) => this.onTouchStart(p));
        this.input.on("pointermove", (p) => this.onTouchMove(p));
        this.input.on("pointerup", (p) => this.onTouchEnd(p));
        this.restart();
    }
    isOver() {
        return this.tetris?.over ?? false;
    }
    restart() {
        this.seed = readSeed();
        this.tetris = new TetrisGame(this.seed);
        this.paused = false;
        this.acc = 0;
        this.texts.over.setText("");
    }
    update(_time, delta) {
        this.acc += delta;
        while (this.acc >= TICK_MS) {
            this.acc -= TICK_MS;
            if (!this.paused && !this.tetris.over)
                this.tick();
        }
        this.handleOneShots();
        this.render();
    }
    tick() {
        const pad = readPad();
        const kLeft = this.keys.left.isDown || this.extra.a.isDown || (pad?.x ?? 0) < 0;
        const kRight = this.keys.right.isDown || this.extra.d.isDown || (pad?.x ?? 0) > 0;
        const kDown = this.keys.down.isDown || this.extra.s.isDown || (pad?.y ?? 0) > 0 || this.touchDown;
        this.tetris.setHeld(kLeft, kRight);
        this.tetris.setSoftDrop(kDown);
        const events = this.tetris.step();
        this.onEvents(events);
    }
    /** Actions ponctuelles : une seule fois par appui (JustDown), clavier et manette. */
    handleOneShots() {
        const kb = this.keys;
        const jd = Phaser.Input.Keyboard.JustDown;
        if (jd(this.keys.restart)) {
            this.restart();
            return;
        }
        if (jd(this.keys.pause))
            this.paused = !this.paused;
        if (this.tetris.over || this.paused)
            return;
        if (jd(kb.rotCw) || jd(this.extra.w) || jd(this.extra.x))
            this.tetris.rotate(1);
        if (jd(kb.rotCcw) || jd(this.extra.shift))
            this.tetris.rotate(-1);
        if (jd(kb.drop)) {
            this.tetris.hardDrop();
        }
        if (jd(kb.hold))
            this.tetris.holdPiece();
        const pad = readPad();
        if (pad) {
            const pressed = (i) => !!pad.buttons[i] && !this.prevPad[i];
            if (pressed(0))
                this.tetris.rotate(1);
            if (pressed(1))
                this.tetris.rotate(-1);
            if (pressed(2)) {
                this.tetris.hardDrop();
            }
            if (pressed(3))
                this.tetris.holdPiece();
            if (pressed(9))
                this.paused = !this.paused;
            this.prevPad = pad.buttons.slice();
        }
        else {
            this.prevPad = [];
        }
    }
    onEvents(events) {
        for (const e of events) {
            switch (e.type) {
                case "move":
                    tone(220, 0.03, { vol: 0.02, type: "triangle" });
                    break;
                case "rotate":
                    tone(330, 0.04, { vol: 0.025, type: "triangle" });
                    break;
                case "lock":
                    tone(110, 0.06, { vol: 0.05, type: "square" });
                    break;
                case "lines": {
                    const notes = e.count >= 4 ? [523, 659, 784, 1047] : [523, 659];
                    notes.forEach((f, i) => tone(f, 0.12, { vol: 0.05, delay: i * 0.07 }));
                    this.popup(e.count >= 4 ? "TETRIS !" : e.count === 1 ? "+1 ligne" : `+${e.count} lignes`, e.count >= 4 ? 0xf2d43a : INK);
                    if (this.tetris.combo > 0)
                        this.popup(`combo x${this.tetris.combo + 1}`, 0x34d8f0);
                    this.flash = e.count >= 4 ? 10 : 4;
                    break;
                }
                case "level":
                    tone(660, 0.3, { vol: 0.05, freqEnd: 1320, type: "sine" });
                    this.popup(`niveau ${e.level}`, 0x5fd35f);
                    break;
                case "hold":
                    tone(440, 0.05, { vol: 0.03, type: "sine" });
                    break;
                case "gameover":
                    tone(400, 0.6, { vol: 0.05, freqEnd: 80, type: "sawtooth" });
                    this.onGameOver();
                    break;
            }
        }
    }
    onGameOver() {
        if (this.tetris.score > this.best) {
            this.best = this.tetris.score;
            saveBest(BEST_KEY, this.best);
        }
        this.texts.over.setText("PARTIE TERMINÉE\nESPACE / R : rejouer");
    }
    popup(message, color) {
        const text = this.add.text(BOARD_X + (BOARD_W * CELL) / 2, BOARD_Y + 120, message, {
            fontFamily: "monospace",
            fontSize: "18px",
            color: `#${color.toString(16).padStart(6, "0")}`,
        }).setOrigin(0.5).setDepth(20);
        this.popups.push({ text, life: 50 });
    }
    render() {
        const g = this.gfx;
        g.clear();
        g.fillStyle(BG, 1);
        g.fillRect(0, 0, 440, 520);
        // Plateau
        g.fillStyle(GRID, 1);
        g.fillRect(BOARD_X - 2, BOARD_Y - 2, BOARD_W * CELL + 4, (BOARD_H - HIDDEN_ROWS) * CELL + 4);
        for (let r = HIDDEN_ROWS; r < BOARD_H; r++) {
            for (let c = 0; c < BOARD_W; c++) {
                const v = this.tetris.board.grid[r][c];
                const x = BOARD_X + c * CELL;
                const y = BOARD_Y + (r - HIDDEN_ROWS) * CELL;
                if (v)
                    this.block(x, y, KINDS[v - 1], 1);
                else {
                    g.fillStyle(0x121723, 1);
                    g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
                }
            }
        }
        const active = this.tetris.active;
        if (active) {
            const ghostRow = this.tetris.ghostRow() ?? active.row;
            for (const [dr, dc] of cellsOf(active.kind, active.rot)) {
                const r = ghostRow + dr - HIDDEN_ROWS;
                if (r < 0)
                    continue;
                g.lineStyle(1, COLORS[active.kind], 0.5);
                g.strokeRect(BOARD_X + (active.col + dc) * CELL + 2, BOARD_Y + r * CELL + 2, CELL - 4, CELL - 4);
            }
            for (const [dr, dc] of cellsOf(active.kind, active.rot)) {
                const r = active.row + dr - HIDDEN_ROWS;
                if (r < 0)
                    continue;
                this.block(BOARD_X + (active.col + dc) * CELL, BOARD_Y + r * CELL, active.kind, 1);
            }
        }
        // Panneau : garder et suivantes
        this.previewBox(PANEL_X, 80, this.tetris.hold, 1);
        this.tetris.next.forEach((kind, i) => this.previewBox(PANEL_X, 360 + i * 52, kind, 0.8));
        if (this.flash > 0) {
            this.flash--;
            g.fillStyle(0xffffff, 0.06 * this.flash);
            g.fillRect(BOARD_X, BOARD_Y, BOARD_W * CELL, (BOARD_H - HIDDEN_ROWS) * CELL);
        }
        this.texts.score.setText(`score ${this.tetris.score}`);
        this.texts.lines.setText(`lignes ${this.tetris.lines}`);
        this.texts.level.setText(`niveau ${this.tetris.level}`);
        this.texts.best.setText(`meilleur ${Math.max(this.best, this.tetris.score)}`);
        this.texts.over.setVisible(this.tetris.over || this.paused);
        if (this.paused && !this.tetris.over)
            this.texts.over.setText("PAUSE  (P)");
        this.texts.hint.setVisible(true);
        this.popups = this.popups.filter((p) => {
            p.life--;
            p.text.y -= 0.4;
            p.text.setAlpha(Math.min(1, p.life / 20));
            if (p.life <= 0) {
                p.text.destroy();
                return false;
            }
            return true;
        });
    }
    block(x, y, kind, alpha) {
        const g = this.gfx;
        g.fillStyle(COLORS[kind], alpha);
        g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        g.fillStyle(0xffffff, 0.25 * alpha);
        g.fillRect(x + 3, y + 3, CELL - 8, 3);
    }
    previewBox(x, y, kind, scale) {
        const g = this.gfx;
        g.fillStyle(GRID, 1);
        g.fillRect(x, y, 90, 44);
        if (!kind)
            return;
        const size = CELL * 0.6 * scale;
        const boxW = boxSize(kind);
        const offX = x + (90 - boxW * size) / 2;
        const offY = y + (44 - boxW * size) / 2;
        for (const [dr, dc] of cellsOf(kind, 0)) {
            g.fillStyle(COLORS[kind], 1);
            g.fillRect(offX + dc * size + 1, offY + dr * size + 1, size - 2, size - 2);
        }
    }
    // ---- Tactile : glisser gauche/droite = déplacer, toucher = tourner, glisser vers le bas = chute,
    // maintenir dans le bas de l'écran = chute douce, toucher la zone « garder » = garder.
    onTouchStart(p) {
        this.touch = { x: p.x, y: p.y, t: p.time, moved: false };
        if (p.x > PANEL_X && p.y > 60 && p.y < 110) {
            this.tetris.holdPiece();
            this.touch = null;
            return;
        }
        if (p.y > 420)
            this.touchDown = true;
        if (this.tetris.over)
            this.restart();
    }
    onTouchMove(p) {
        if (!this.touch || !p.isDown)
            return;
        const dx = p.x - this.touch.x;
        if (Math.abs(dx) > 24) {
            if (dx > 0)
                this.tetris.moveRight();
            else
                this.tetris.moveLeft();
            this.touch.x = p.x;
            this.touch.moved = true;
        }
        if (p.y - this.touch.y > 70 && p.time - this.touch.t < 400) {
            this.tetris.hardDrop();
            this.touch = null;
        }
    }
    onTouchEnd(p) {
        this.touchDown = false;
        if (this.touch && !this.touch.moved && p.time - this.touch.t < 300) {
            this.tetris.rotate(1);
        }
        this.touch = null;
    }
    /** État lisible pour les tests de fumée (aucune action). */
    debugState() {
        return { score: this.tetris.score, lines: this.tetris.lines, over: this.tetris.over, seed: this.seed };
    }
}
