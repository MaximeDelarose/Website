import { useEffect, useRef, useState } from "react";
import { hintCost } from "../engine/scoring";
import { remainingMs, stagesScore } from "../engine/state";
import { formatClock, formatPoints, useGame, useNow } from "../game";
import { audio } from "../services/audio";
import { scoreBus } from "../services/fx";
import { Icon } from "./Icons";

/** Bandeau permanent : chrono, verrous, score, son. Déclenche aussi la fin au temps écoulé. */
export function Hud() {
  const { state, config, dispatch, stageId, muted, toggleMuted } = useGame();
  const now = useNow(200);
  const left = remainingMs(state, config, now);
  const running = state.clock.runningSince !== null;
  const seconds = Math.ceil(left / 1000);
  const lastTick = useRef(seconds);
  const [deltas, setDeltas] = useState<{ id: number; value: number }[]>([]);

  useEffect(() => {
    if (state.phase === "stage" && left <= 0) dispatch({ type: "TIMEOUT" });
  }, [left, state.phase, dispatch]);

  // Tic-tac de la dernière minute.
  useEffect(() => {
    if (running && seconds !== lastTick.current && seconds <= 60 && seconds > 0) audio.tick(seconds <= 10);
    lastTick.current = seconds;
  }, [seconds, running]);

  useEffect(() => scoreBus.on((value) => {
    const id = Math.random();
    setDeltas((d) => [...d, { id, value }]);
    window.setTimeout(() => setDeltas((d) => d.filter((x) => x.id !== id)), 1400);
  }), []);

  // Score affiché : points acquis − pénalités de l'épreuve en cours (le détail exact figure au bilan).
  const current = state.stages[state.stageIndex];
  const rule = config.scoring.stages[stageId];
  const pending = state.phase === "stage" ? current.errors * rule.errorPenalty + hintCost(rule, current.hints) + current.penalties : 0;
  const score = Math.max(0, stagesScore(state) - pending);
  const level = seconds <= 10 ? "critical" : seconds <= 60 ? "urgent" : "normal";

  return (
    <header className="hud">
      <div className={`hud__timer hud__timer--${level} ${running ? "" : "is-paused"}`} data-testid="timer">
        <span className="hud__label">{running ? "Temps restant" : "Chrono en pause"}</span>
        <span className="hud__clock">{formatClock(left)}</span>
      </div>
      <div className="hud__locks" aria-label={`${state.stages.filter((s) => s.status === "done").length} verrous ouverts sur 4`}>
        {state.stages.map((s, i) => (
          <span key={i} className={`pip ${s.status === "done" ? "is-done" : ""} ${i === state.stageIndex && s.status !== "done" ? "is-active" : ""}`}>
            <i>{i + 1}</i>
          </span>
        ))}
      </div>
      <div className="hud__score">
        <span className="hud__label">Score</span>
        <span className="hud__points" data-testid="score">{formatPoints(score)}</span>
        {deltas.map((d) => (
          <span key={d.id} className={`hud__delta ${d.value < 0 ? "is-neg" : "is-pos"}`}>
            {d.value > 0 ? "+" : "−"}{Math.abs(d.value)}
          </span>
        ))}
      </div>
      <button type="button" className="iconbtn hud__sound" onClick={() => { audio.unlock(); toggleMuted(); }} aria-label={muted ? "Activer le son" : "Couper le son"} aria-pressed={muted}>
        <Icon name={muted ? "mute" : "sound"} size={20} />
      </button>
    </header>
  );
}
