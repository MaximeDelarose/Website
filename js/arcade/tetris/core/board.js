import { KINDS } from "./pieces.js";
export const BOARD_W = 10;
/** 20 lignes visibles + 2 lignes cachées au-dessus pour le spawn. */
export const BOARD_H = 22;
export const HIDDEN_ROWS = 2;
export function cellValue(kind) {
    return KINDS.indexOf(kind) + 1;
}
export class Board {
    constructor() {
        this.grid = Array.from({ length: BOARD_H }, () => new Array(BOARD_W).fill(0));
    }
    get(row, col) {
        if (col < 0 || col >= BOARD_W || row >= BOARD_H)
            return -1; // hors plateau = mur/sol
        if (row < 0)
            return 0;
        return this.grid[row][col];
    }
    /** Vrai si les cases décalées de la pièce sont libres et dans le plateau. */
    fits(cells, originRow, originCol) {
        for (const [dr, dc] of cells) {
            const r = originRow + dr;
            const c = originCol + dc;
            if (c < 0 || c >= BOARD_W || r >= BOARD_H)
                return false;
            if (r >= 0 && this.grid[r][c] !== 0)
                return false;
        }
        return true;
    }
    place(cells, originRow, originCol, value) {
        for (const [dr, dc] of cells) {
            const r = originRow + dr;
            const c = originCol + dc;
            if (r >= 0 && r < BOARD_H && c >= 0 && c < BOARD_W)
                this.grid[r][c] = value;
        }
    }
    /** Indices des lignes pleines, de haut en bas. */
    fullRows() {
        const rows = [];
        for (let r = 0; r < BOARD_H; r++) {
            if (this.grid[r].every((cell) => cell !== 0))
                rows.push(r);
        }
        return rows;
    }
    /** Supprime les lignes données ; celles du dessus descendent. */
    removeRows(rows) {
        if (rows.length === 0)
            return;
        const drop = new Set(rows);
        const kept = this.grid.filter((_, r) => !drop.has(r));
        const empty = Array.from({ length: rows.length }, () => new Array(BOARD_W).fill(0));
        this.grid.splice(0, this.grid.length, ...empty, ...kept);
    }
    /** Supprime les lignes pleines (les lignes au-dessus descendent) et renvoie leur nombre. */
    clearFullRows() {
        const kept = this.grid.filter((row) => !row.every((cell) => cell !== 0));
        const cleared = BOARD_H - kept.length;
        if (cleared === 0)
            return 0;
        const empty = Array.from({ length: cleared }, () => new Array(BOARD_W).fill(0));
        this.grid.splice(0, this.grid.length, ...empty, ...kept);
        return cleared;
    }
}
