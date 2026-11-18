import type { CipherConfig, DeductionConfig, MemoryRound } from "../config/types";
import { createRng, shuffle } from "./rng";
import { SYMBOLS, type SymbolId } from "./symbols";

/* ---------- Épreuve 1 : mémoire ---------- */

export interface MemoryRoundData {
  cols: number;
  rows: number;
  viewSeconds: number;
  /** Symbole de chaque case. */
  grid: SymbolId[];
  /** Cases à toucher, dans l'ordre. */
  sequence: number[];
}

export function buildMemoryRounds(seed: number, rounds: MemoryRound[]): MemoryRoundData[] {
  const rng = createRng(seed);
  const ids = SYMBOLS.map((s) => s.id);
  return rounds.map((r) => {
    const cells = r.cols * r.rows;
    if (cells > ids.length) throw new Error("Grille trop grande pour le nombre de symboles.");
    const grid = shuffle(ids, rng).slice(0, cells);
    const sequence = shuffle(grid.map((_, i) => i), rng).slice(0, r.sequence);
    return { cols: r.cols, rows: r.rows, viewSeconds: r.viewSeconds, grid, sequence };
  });
}

/** Fragment de clé n° 1 : le dernier symbole de la dernière séquence. */
export function memoryFragment(rounds: MemoryRoundData[]): SymbolId {
  const last = rounds[rounds.length - 1];
  return last.grid[last.sequence[last.sequence.length - 1]];
}

/** Choix proposés en finale : le bon symbole parmi cinq leurres. */
export function finaleSymbolChoices(seed: number, fragment: SymbolId, count = 6): SymbolId[] {
  const rng = createRng(seed ^ 0x9e3779b9);
  const others = shuffle(SYMBOLS.map((s) => s.id).filter((id) => id !== fragment), rng).slice(0, count - 1);
  return shuffle([fragment, ...others], rng);
}

/* ---------- Épreuve 2 : déduction ---------- */

/** Agents réellement entrés (badge cloné écarté), dans l'ordre chronologique. */
export function deductionEntrants(cfg: DeductionConfig) {
  return cfg.agents
    .filter((a) => a.entry !== null && a.name !== cfg.clonedBadgeOf)
    .sort((a, b) => (a.entry as string).localeCompare(b.entry as string));
}

/** Code du coffre : casiers des agents entrés, dans l'ordre d'entrée. */
export function deductionCode(cfg: DeductionConfig): string {
  return deductionEntrants(cfg).map((a) => String(a.locker)).join("");
}

/* ---------- Épreuve 3 : chiffre de César ---------- */

const A = 65;

export function cipherShift(cfg: CipherConfig): number {
  return cfg.relays.filter((r) => r.active).length;
}

export function shiftLetter(letter: string, shift: number): string {
  const c = letter.toUpperCase().charCodeAt(0) - A;
  if (c < 0 || c > 25) return letter;
  return String.fromCharCode(A + ((((c + shift) % 26) + 26) % 26));
}

export function shiftText(text: string, shift: number): string {
  return text.split("").map((l) => shiftLetter(l, shift)).join("");
}

/** Message intercepté : le mot de passe avancé de « shift » rangs. */
export function cipherText(cfg: CipherConfig): string {
  return shiftText(cfg.plaintext.toUpperCase(), cipherShift(cfg));
}
