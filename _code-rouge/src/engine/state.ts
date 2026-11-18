import type { GameConfig, StageId } from "../config/types";
import { scoreStage, timeLeftBonus, type ScoreBreakdown } from "./scoring";

export const STAGE_ORDER: StageId[] = ["memory", "deduction", "cipher", "finale"];
export const SAVE_VERSION = 1;

export type Phase = "home" | "team" | "briefing" | "stageIntro" | "stage" | "stageDone" | "victory" | "end";

export interface StageRecord {
  status: "locked" | "active" | "done";
  /** Temps de mission écoulé (ms) au début de l'épreuve. */
  startedAt: number;
  durationMs: number;
  errors: number;
  hints: number;
  penalties: number;
  result: ScoreBreakdown | null;
}

export interface GameState {
  version: number;
  phase: Phase;
  teamName: string;
  seed: number;
  stageIndex: number;
  /** Chrono de mission : temps cumulé + instant (epoch ms) depuis lequel il tourne, ou null s'il est en pause. */
  clock: { elapsedMs: number; runningSince: number | null };
  stages: StageRecord[];
  /** Progression interne des épreuves à étapes, pour reprendre après un rechargement. */
  memoryRound: number;
  finaleStep: number;
  outcome: "success" | "timeout" | null;
  timeBonus: number;
}

export type Action =
  | { type: "NEW_GAME"; seed: number }
  | { type: "SET_TEAM"; name: string }
  | { type: "BRIEFING_DONE" }
  | { type: "BEGIN_STAGE"; now: number }
  | { type: "ERROR" }
  | { type: "HINT" }
  | { type: "PENALTY"; points: number }
  | { type: "MEMORY_ROUND"; round: number }
  | { type: "FINALE_STEP"; step: number }
  | { type: "COMPLETE_STAGE"; now: number }
  | { type: "NEXT_STAGE" }
  | { type: "SHOW_END" }
  | { type: "TIMEOUT" }
  | { type: "GO_HOME" };

function emptyStage(): StageRecord {
  return { status: "locked", startedAt: 0, durationMs: 0, errors: 0, hints: 0, penalties: 0, result: null };
}

export function initialState(seed = 1): GameState {
  return {
    version: SAVE_VERSION,
    phase: "home",
    teamName: "",
    seed,
    stageIndex: 0,
    clock: { elapsedMs: 0, runningSince: null },
    stages: STAGE_ORDER.map(emptyStage),
    memoryRound: 0,
    finaleStep: 0,
    outcome: null,
    timeBonus: 0,
  };
}

/* ---------- Sélecteurs ---------- */

export function elapsedMs(state: GameState, now: number): number {
  const c = state.clock;
  return c.elapsedMs + (c.runningSince !== null ? Math.max(0, now - c.runningSince) : 0);
}

export function remainingMs(state: GameState, config: GameConfig, now: number): number {
  return Math.max(0, config.durationSeconds * 1000 - elapsedMs(state, now));
}

export function stagesScore(state: GameState): number {
  return state.stages.reduce((sum, s) => sum + (s.result?.total ?? 0), 0);
}

export function totalScore(state: GameState): number {
  return stagesScore(state) + state.timeBonus;
}

/** Une partie est « en cours » si elle peut être reprise. */
export function isResumable(state: GameState): boolean {
  return state.phase !== "home" && state.phase !== "end" && state.phase !== "team";
}

/* ---------- Réducteur (pur : l'heure est fournie par les actions) ---------- */

function patchStage(state: GameState, patch: (s: StageRecord) => StageRecord): GameState {
  if (state.phase !== "stage") return state;
  return { ...state, stages: state.stages.map((s, i) => (i === state.stageIndex ? patch(s) : s)) };
}

export function makeReducer(config: GameConfig) {
  return function reducer(state: GameState, action: Action): GameState {
    switch (action.type) {
      case "NEW_GAME":
        return { ...initialState(action.seed), phase: "team" };

      case "SET_TEAM":
        return { ...state, teamName: action.name.trim().slice(0, 24), phase: "briefing" };

      case "BRIEFING_DONE":
        return { ...state, phase: "stageIntro", stageIndex: 0 };

      case "BEGIN_STAGE": {
        if (state.phase !== "stageIntro") return state;
        const startedAt = state.clock.elapsedMs;
        return {
          ...state,
          phase: "stage",
          clock: { elapsedMs: startedAt, runningSince: action.now },
          stages: state.stages.map((s, i) => (i === state.stageIndex ? { ...emptyStage(), status: "active", startedAt } : s)),
        };
      }

      case "ERROR":
        return patchStage(state, (s) => ({ ...s, errors: s.errors + 1 }));
      case "HINT":
        return patchStage(state, (s) => ({ ...s, hints: s.hints + 1 }));
      case "PENALTY":
        return patchStage(state, (s) => ({ ...s, penalties: s.penalties + Math.max(0, action.points) }));

      case "MEMORY_ROUND":
        return state.phase === "stage" ? { ...state, memoryRound: action.round } : state;
      case "FINALE_STEP":
        return state.phase === "stage" ? { ...state, finaleStep: action.step } : state;

      case "COMPLETE_STAGE": {
        if (state.phase !== "stage") return state;
        const total = Math.min(config.durationSeconds * 1000, elapsedMs(state, action.now));
        const id = STAGE_ORDER[state.stageIndex];
        const current = state.stages[state.stageIndex];
        const durationMs = total - current.startedAt;
        const result = scoreStage(config.scoring.stages[id], { durationMs, errors: current.errors, hints: current.hints, penalties: current.penalties });
        const stages = state.stages.map((s, i) => (i === state.stageIndex ? { ...s, status: "done" as const, durationMs, result } : s));
        const last = state.stageIndex === STAGE_ORDER.length - 1;
        const paused = { elapsedMs: total, runningSince: null };
        if (!last) return { ...state, phase: "stageDone", clock: paused, stages };
        const left = config.durationSeconds * 1000 - total;
        return { ...state, phase: "victory", clock: paused, stages, outcome: "success", timeBonus: timeLeftBonus(config.scoring, left) };
      }

      case "NEXT_STAGE":
        if (state.phase !== "stageDone") return state;
        return { ...state, phase: "stageIntro", stageIndex: state.stageIndex + 1 };

      case "SHOW_END":
        return state.phase === "victory" ? { ...state, phase: "end" } : state;

      case "TIMEOUT":
        if (state.phase !== "stage") return state;
        return { ...state, phase: "end", outcome: "timeout", clock: { elapsedMs: config.durationSeconds * 1000, runningSince: null } };

      case "GO_HOME":
        return initialState(state.seed);
    }
  };
}
