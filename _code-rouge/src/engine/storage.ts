import { SAVE_VERSION, STAGE_ORDER, type GameState } from "./state";

const KEY = "code-rouge/save";

/** Sauvegarde locale : une partie interrompue (rechargement, appel, onglet fermé) peut être reprise. */
export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    if (!data || data.version !== SAVE_VERSION) return null;
    if (!Array.isArray(data.stages) || data.stages.length !== STAGE_ORDER.length) return null;
    if (typeof data.clock?.elapsedMs !== "number" || typeof data.seed !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* stockage indisponible (navigation privée) : le jeu continue sans sauvegarde */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* rien */
  }
}

const PREFS = "code-rouge/prefs";

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(PREFS) === "muted";
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(PREFS, muted ? "muted" : "on");
  } catch {
    /* rien */
  }
}
