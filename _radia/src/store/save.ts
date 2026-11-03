/* Sauvegarde locale (localStorage) : préférences, statistiques réelles,
   souvenirs débloqués, partie en cours. Tout accès est protégé (navigation
   privée, stockage bloqué) : le jeu fonctionne même sans. */
import type { Difficulty } from "../ai/persona";
import type { ClockSnapshot } from "../core/clock";

export type Cadence = "5" | "10" | "15" | "inf";
export const CADENCES: Record<Cadence, { label: string; ms: number | null }> = {
  "5": { label: "5 min", ms: 5 * 60_000 },
  "10": { label: "10 min", ms: 10 * 60_000 },
  "15": { label: "15 min", ms: 15 * 60_000 },
  inf: { label: "Sans limite", ms: null },
};

export interface Prefs {
  difficulty: Difficulty;
  cadence: Cadence;
  music: boolean;
  musicVolume: number; // 0..1
  sfx: boolean;
  sfxVolume: number;
  reducedFx: boolean;
  showCoords: boolean;
  showLegal: boolean;
  haptics: boolean;
  outfit: "hoodie" | "elegant";
}

export interface Stats {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  captures: number;
  queensCaptured: number;
  rematches: number;
  byDifficulty: Record<Difficulty, number>;
  byCadence: Record<Cadence, number>;
  bestWinMoves: number | null;
}

export interface SavedGame {
  moves: string[];
  clock: ClockSnapshot;
  difficulty: Difficulty;
  cadence: Cadence;
  shownCards: string[];
  radiaCaptures: number;
  startedAt: number;
}

export interface SaveData {
  v: 1;
  prefs: Prefs;
  stats: Stats;
  /** id de carte → ordre de découverte et date. */
  unlocked: Record<string, { order: number; at: number }>;
  /** Nombre d'affichages de chaque carte (pour varier d'une partie à l'autre). */
  seen: Record<string, number>;
  introSeen: boolean;
  finaleSeen: boolean;
  current: SavedGame | null;
}

export function defaultSave(): SaveData {
  return {
    v: 1,
    prefs: {
      difficulty: "doux", cadence: "10", music: true, musicVolume: 0.35, sfx: true, sfxVolume: 0.7,
      reducedFx: false, showCoords: true, showLegal: true, haptics: true, outfit: "hoodie",
    },
    stats: {
      games: 0, wins: 0, losses: 0, draws: 0, captures: 0, queensCaptured: 0, rematches: 0,
      byDifficulty: { doux: 0, joueur: 0, defi: 0 },
      byCadence: { "5": 0, "10": 0, "15": 0, inf: 0 },
      bestWinMoves: null,
    },
    unlocked: {}, seen: {}, introSeen: false, finaleSeen: false, current: null,
  };
}

const KEY = "radia-save-v1";

export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

function safeStorage(): StorageLike | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const t = "__radia_t";
    s.setItem(t, "1"); s.removeItem(t);
    return s;
  } catch { return null; }
}

/** Fusion profonde « défauts ← sauvegarde » pour supporter les anciennes versions. */
function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(base) || typeof base !== "object" || base === null) {
    return (over === undefined ? base : (over as T));
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" ? merge(b, v) : v;
  }
  return out as T;
}

export class Store {
  data: SaveData;
  private readonly storage: StorageLike | null;

  constructor(storage?: StorageLike | null) {
    this.storage = storage === undefined ? safeStorage() : storage;
    this.data = defaultSave();
    try {
      const raw = this.storage?.getItem(KEY);
      if (raw) this.data = merge(defaultSave(), JSON.parse(raw));
    } catch { /* sauvegarde illisible : on repart des défauts */ }
  }

  save(): void {
    try { this.storage?.setItem(KEY, JSON.stringify(this.data)); } catch { /* quota, mode privé */ }
  }

  get prefs(): Prefs { return this.data.prefs; }
  get stats(): Stats { return this.data.stats; }

  setPref<K extends keyof Prefs>(k: K, v: Prefs[K]): void { this.data.prefs[k] = v; this.save(); }

  unlock(cardId: string): boolean {
    this.data.seen[cardId] = (this.data.seen[cardId] ?? 0) + 1;
    if (this.data.unlocked[cardId]) { this.save(); return false; }
    this.data.unlocked[cardId] = { order: Object.keys(this.data.unlocked).length + 1, at: Date.now() };
    this.save();
    return true;
  }

  isUnlocked(cardId: string): boolean { return !!this.data.unlocked[cardId]; }

  /** Parties terminées (victoires + défaites + nulles). */
  get completedGames(): number { return this.stats.wins + this.stats.losses + this.stats.draws; }

  /** La surprise finale : après la 1re victoire OU après 3 parties complètes. */
  get finaleUnlocked(): boolean { return this.stats.wins >= 1 || this.completedGames >= 3; }

  recordResult(r: "win" | "loss" | "draw", moves: number): void {
    const s = this.stats;
    if (r === "win") { s.wins++; if (s.bestWinMoves === null || moves < s.bestWinMoves) s.bestWinMoves = moves; }
    else if (r === "loss") s.losses++;
    else s.draws++;
    this.data.current = null;
    this.save();
  }

  recordStart(d: Difficulty, c: Cadence, rematch: boolean): void {
    const s = this.stats;
    s.games++;
    s.byDifficulty[d] = (s.byDifficulty[d] ?? 0) + 1;
    s.byCadence[c] = (s.byCadence[c] ?? 0) + 1;
    if (rematch) s.rematches++;
    this.save();
  }

  recordCapture(piece: string): void {
    this.stats.captures++;
    if (piece === "q") this.stats.queensCaptured++;
    this.save();
  }

  favourite<K extends string>(rec: Record<K, number>): K | null {
    let best: K | null = null, n = 0;
    for (const [k, v] of Object.entries(rec) as [K, number][]) if (v > n) { n = v; best = k; }
    return best;
  }

  resetAll(): void {
    this.data = defaultSave();
    this.save();
  }
}
