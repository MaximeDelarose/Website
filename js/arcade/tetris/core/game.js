import { Board, BOARD_H, HIDDEN_ROWS, cellValue } from "./board.js";
import { KINDS, boxSize, cellsOf, kicksFor } from "./pieces.js";
import { Rng } from "../../shared/rng.js";
export const DEFAULT_CONFIG = { das: 10, arr: 2, lockDelay: 30, lockResets: 15 };
/** Points de base par nombre de lignes (1 à 4), multipliés par le niveau. */
const LINE_POINTS = [0, 100, 300, 500, 800];
/** Frames entre deux descentes automatiques au niveau donné (formule de référence, arrondie à la frame). */
export function framesPerRow(level) {
    const seconds = Math.pow(0.8 - (level - 1) * 0.007, level - 1);
    return Math.max(1, Math.round(seconds * 60));
}
export class TetrisGame {
    constructor(seed, config = {}) {
        this.board = new Board();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.combo = -1;
        this.over = false;
        this.active = null;
        this.hold = null;
        this.canHold = true;
        this.queue = [];
        this.bag = [];
        this.gravity = 0;
        this.lockTimer = 0;
        this.lockResetCount = 0;
        this.softDrop = false;
        this.held = { left: false, right: false };
        this.dasLeft = 0;
        this.dasRight = 0;
        this.events = [];
        this.rng = new Rng(seed);
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.fillQueue();
        this.spawn();
    }
    /** Les 3 prochaines pièces, pour l'aperçu. */
    get next() {
        return this.queue.slice(0, 3);
    }
    /** Ligne d'atterrissage de la pièce active (pour la pièce fantôme). */
    ghostRow() {
        if (!this.active)
            return null;
        let row = this.active.row;
        const cells = cellsOf(this.active.kind, this.active.rot);
        while (this.board.fits(cells, row + 1, this.active.col))
            row++;
        return row;
    }
    setSoftDrop(on) {
        this.softDrop = on;
    }
    /** Direction maintenue : appelée à chaque tick par la couche input. */
    setHeld(left, right) {
        if (left && !this.held.left) {
            this.tryShift(-1);
            this.dasLeft = 0;
        }
        if (right && !this.held.right) {
            this.tryShift(1);
            this.dasRight = 0;
        }
        if (!left)
            this.dasLeft = 0;
        if (!right)
            this.dasRight = 0;
        this.held = { left, right };
    }
    moveLeft() {
        this.tryShift(-1);
    }
    moveRight() {
        this.tryShift(1);
    }
    rotate(dir) {
        if (!this.active || this.over)
            return;
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
    hardDrop() {
        if (!this.active || this.over)
            return;
        let dropped = 0;
        const cells = cellsOf(this.active.kind, this.active.rot);
        while (this.board.fits(cells, this.active.row + 1, this.active.col)) {
            this.active.row++;
            dropped++;
        }
        this.score += dropped * 2;
        this.lock(true);
    }
    holdPiece() {
        if (!this.active || this.over || !this.canHold)
            return;
        const current = this.active.kind;
        if (this.hold === null) {
            this.hold = current;
            this.spawn();
        }
        else {
            const swapped = this.hold;
            this.hold = current;
            this.spawn(swapped);
        }
        this.canHold = false;
        this.events.push({ type: "hold" });
    }
    /** Une tick : DAS/ARR, gravité ou chute rapide, verrouillage. */
    step() {
        if (this.over || !this.active)
            return this.flush();
        this.autoRepeat();
        const perRow = this.softDrop ? 2 : framesPerRow(this.level);
        this.gravity++;
        if (this.gravity >= perRow) {
            this.gravity = 0;
            if (this.board.fits(cellsOf(this.active.kind, this.active.rot), this.active.row + 1, this.active.col)) {
                this.active.row++;
                if (this.softDrop)
                    this.score += 1;
                this.lockTimer = 0;
            }
        }
        if (this.grounded()) {
            this.lockTimer++;
            if (this.lockTimer >= this.config.lockDelay)
                this.lock(false);
        }
        else {
            this.lockTimer = 0;
        }
        return this.flush();
    }
    autoRepeat() {
        const dir = this.held.left && !this.held.right ? -1 : this.held.right && !this.held.left ? 1 : 0;
        if (dir === 0)
            return;
        if (dir === -1)
            this.dasLeft++;
        else
            this.dasRight++;
        const counter = dir === -1 ? this.dasLeft : this.dasRight;
        if (counter > this.config.das) {
            const sinceDas = counter - this.config.das;
            if (sinceDas % Math.max(1, this.config.arr) === 0)
                this.tryShift(dir);
        }
    }
    tryShift(dx) {
        if (!this.active || this.over)
            return;
        const cells = cellsOf(this.active.kind, this.active.rot);
        if (this.board.fits(cells, this.active.row, this.active.col + dx)) {
            this.active.col += dx;
            this.touchLock();
            this.events.push({ type: "move" });
        }
    }
    grounded() {
        if (!this.active)
            return false;
        return !this.board.fits(cellsOf(this.active.kind, this.active.rot), this.active.row + 1, this.active.col);
    }
    /** Remise à zéro du verrouillage après un mouvement au sol, dans la limite de `lockResets`. */
    touchLock() {
        if (this.grounded() && this.lockResetCount < this.config.lockResets) {
            this.lockTimer = 0;
            this.lockResetCount++;
        }
    }
    lock(hard) {
        if (!this.active)
            return;
        const { kind, rot, row, col } = this.active;
        this.board.place(cellsOf(kind, rot), row, col, cellValue(kind));
        this.events.push({ type: "lock", hard });
        const cleared = this.board.clearFullRows();
        if (cleared > 0) {
            this.combo++;
            this.lines += cleared;
            this.score += LINE_POINTS[cleared] * this.level;
            if (this.combo > 0)
                this.score += 50 * this.combo * this.level;
            this.events.push({ type: "lines", count: cleared, combo: this.combo });
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.events.push({ type: "level", level: newLevel });
            }
        }
        else {
            this.combo = -1;
        }
        this.canHold = true;
        this.spawn();
    }
    spawn(kind) {
        const k = kind ?? this.takeFromQueue();
        const origin = { kind: k, rot: 0, row: 0, col: Math.floor((10 - boxSize(k)) / 2) };
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
    takeFromQueue() {
        this.fillQueue();
        return this.queue.shift();
    }
    /** Sac de 7 : chaque pièce apparaît une fois par sac, ordre mélangé. */
    fillQueue() {
        while (this.queue.length < 4) {
            if (this.bag.length === 0)
                this.bag = this.rng.shuffle([...KINDS]);
            this.queue.push(this.bag.pop());
        }
    }
    flush() {
        const out = this.events;
        this.events = [];
        return out;
    }
    /** Vue pour le rendu : plateau (lignes cachées incluses, à ignorer à l'affichage). */
    get rows() {
        return BOARD_H - HIDDEN_ROWS;
    }
}
