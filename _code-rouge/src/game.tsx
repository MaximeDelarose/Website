import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { gameConfig } from "./config/game.config";
import type { GameConfig, StageId } from "./config/types";
import { buildMemoryRounds, memoryFragment, type MemoryRoundData } from "./engine/puzzles";
import { initialState, makeReducer, STAGE_ORDER, totalScore, elapsedMs, type Action, type GameState } from "./engine/state";
import { clearState, loadMuted, loadState, saveMuted, saveState } from "./engine/storage";
import type { SymbolId } from "./engine/symbols";
import { audio } from "./services/audio";
import { createGateway } from "./services/session";

interface GameContextValue {
  config: GameConfig;
  state: GameState;
  dispatch: (action: Action) => void;
  stageId: StageId;
  memoryRounds: MemoryRoundData[];
  /** Fragment n° 1 : symbole d'amorçage de cette partie. */
  symbolFragment: SymbolId;
  muted: boolean;
  toggleMuted: () => void;
  /** Vrai si l'application vient d'être rechargée sur une partie en cours (écran de reprise). */
  resumePending: boolean;
  confirmResume: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);
const reducer = makeReducer(gameConfig);
const gateway = createGateway();

export function GameProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(() => {
    const saved = loadState();
    const resumable = saved !== null && saved.phase !== "home" && saved.phase !== "team";
    return { state: resumable ? saved : initialState(), resume: resumable && saved.phase !== "end" };
  });
  const [state, baseDispatch] = useReducer(reducer, boot.state);
  const [resumePending, setResumePending] = useState(boot.resume);
  const [muted, setMuted] = useState(() => loadMuted());

  useEffect(() => {
    audio.setMuted(muted);
    saveMuted(muted);
  }, [muted]);

  // Sauvegarde locale à chaque changement d'état.
  useEffect(() => {
    if (state.phase === "home") clearState();
    else saveState(state);
  }, [state]);

  // Passerelle de session (mode événement futur) : notifiée des jalons, sans effet en local.
  const prev = useRef(state);
  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    const base = { teamName: state.teamName, seed: state.seed, at: Date.now() };
    if (before.phase === "briefing" && state.phase === "stageIntro") gateway.gameStarted(base);
    state.stages.forEach((s, i) => {
      if (s.result && !before.stages[i].result) gateway.stageCompleted({ ...base, stage: STAGE_ORDER[i], result: s.result, totalScore: totalScore(state) });
    });
    if (state.outcome && !before.outcome) gateway.gameFinished({ ...base, outcome: state.outcome, totalScore: totalScore(state), elapsedMs: elapsedMs(state, Date.now()) });
  }, [state]);

  const dispatch = useCallback((action: Action) => baseDispatch(action), []);
  const memoryRounds = useMemo(() => buildMemoryRounds(state.seed, gameConfig.memory.rounds), [state.seed]);
  const symbolFragment = useMemo(() => memoryFragment(memoryRounds), [memoryRounds]);

  const value: GameContextValue = {
    config: gameConfig,
    state,
    dispatch,
    stageId: STAGE_ORDER[Math.min(state.stageIndex, STAGE_ORDER.length - 1)],
    memoryRounds,
    symbolFragment,
    muted,
    toggleMuted: () => setMuted((m) => !m),
    resumePending,
    confirmResume: () => setResumePending(false),
  };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame doit être utilisé dans GameProvider");
  return ctx;
}

/** Heure courante rafraîchie régulièrement (pour le chrono). */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

export function formatPoints(n: number): string {
  return String(Math.round(n));
}
