import { useEffect, useRef, useState } from "react";
import { Glyph } from "../components/Glyph";
import { StageFrame } from "../components/StageFrame";
import { Button } from "../components/ui";
import { useGame } from "../game";
import { audio, buzz } from "../services/audio";
import { burstAt, scoreBus, shakeBus } from "../services/fx";

type Step = "ready" | "showing" | "recall" | "replay" | "won";

/** Épreuve 1 — la grille s'affiche, se brouille, puis il faut retrouver une séquence de symboles. */
export function MemoryStage() {
  const { config, state, dispatch, memoryRounds } = useGame();
  const roundIndex = Math.min(state.memoryRound, memoryRounds.length - 1);
  const round = memoryRounds[roundIndex];
  const [step, setStep] = useState<Step>("ready");
  const [found, setFound] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const penalty = config.scoring.stages.memory.errorPenalty;
  const foundCells = round.sequence.slice(0, found);
  const faceUp = step === "showing" || step === "replay" || step === "won";

  const show = () => {
    audio.flip();
    setStep("showing");
    later(() => { audio.flip(); setStep("recall"); }, round.viewSeconds * 1000);
  };

  const replay = () => {
    setStep("replay");
    audio.flip();
    later(() => { audio.flip(); setStep("recall"); }, config.memory.replaySeconds * 1000);
  };

  const tap = (cell: number) => {
    if (step !== "recall" || foundCells.includes(cell) || wrong !== null) return;
    audio.unlock();
    if (cell === round.sequence[found]) {
      const next = found + 1;
      audio.good(found);
      buzz(12);
      burstAt(cells.current[cell], { count: 16, power: 0.7 });
      setFound(next);
      if (next === round.sequence.length) {
        setStep("won");
        later(() => {
          if (roundIndex + 1 < memoryRounds.length) {
            dispatch({ type: "MEMORY_ROUND", round: roundIndex + 1 });
            setFound(0);
            setStep("ready");
          } else {
            dispatch({ type: "COMPLETE_STAGE", now: Date.now() });
          }
        }, 1500);
      }
    } else {
      audio.bad();
      buzz([30, 40, 30]);
      shakeBus.emit("soft");
      scoreBus.emit(-penalty);
      dispatch({ type: "ERROR" });
      setWrong(cell);
      later(() => setWrong(null), 750);
    }
  };

  const target = step === "recall" ? round.grid[round.sequence[found]] : null;

  return (
    <StageFrame
      step={`Manche ${roundIndex + 1}/${memoryRounds.length}`}
      hint={{
        revealed: [],
        available: step === "recall",
        actionLabel: `Revoir la grille ${config.memory.replaySeconds} s`,
        emptyText: "L'indice de cette épreuve permet de revoir la grille quelques secondes. Il est disponible une fois la grille masquée.",
        onTake: replay,
        closeOnTake: true,
      }}
      footer={
        step === "ready" ? (
          <Button block icon="eye" onClick={show} silent data-testid="memory-show">Afficher la grille</Button>
        ) : (
          <p className="stage__status" data-testid="memory-status">
            {step === "showing" && "Mémorisez… répartissez-vous les lignes."}
            {step === "replay" && "Dernier coup d'œil…"}
            {step === "recall" && `Symbole ${found + 1} sur ${round.sequence.length}`}
            {step === "won" && "Séquence validée"}
          </p>
        )
      }
    >
      <div className="memory">
        <div className={`memory__prompt panel ${step === "recall" || step === "won" ? "is-live" : ""}`}>
          {step === "ready" && (
            <p className="memory__brief">
              <strong>{round.cols} × {round.rows} symboles</strong> vont apparaître pendant {round.viewSeconds} secondes. Vous devrez ensuite en retrouver <strong>{round.sequence.length}</strong>, dans l'ordre demandé.
            </p>
          )}
          {(step === "showing" || step === "replay") && (
            <div className="memory__timer">
              <span>{step === "showing" ? "Mémorisation" : "Rappel"}</span>
              <div className="bar"><div className="bar__fill" style={{ animationDuration: `${step === "showing" ? round.viewSeconds : config.memory.replaySeconds}s` }} /></div>
            </div>
          )}
          {(step === "recall" || step === "won") && (
            <>
              <p className="memory__ask">Retrouvez ces symboles, dans l'ordre :</p>
              <ol className="memory__seq" data-testid="memory-seq">
                {round.sequence.map((cell, i) => (
                  <li key={cell} className={`seq ${i < found ? "is-found" : ""} ${i === found && step === "recall" ? "is-target" : ""}`} data-symbol={round.grid[cell]}>
                    <span className="seq__n">{i + 1}</span>
                    <Glyph id={round.grid[cell]} />
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        <div className={`memory__grid memory__grid--c${round.cols} memory__grid--r${round.rows} ${step === "won" ? "is-won" : ""}`} data-testid="memory-grid" data-target={target ?? ""}>
          {round.grid.map((symbol, i) => {
            const isFound = foundCells.includes(i);
            const up = faceUp || isFound || wrong === i;
            return (
              <button
                key={`${roundIndex}-${i}`}
                ref={(el) => { cells.current[i] = el; }}
                type="button"
                className={`card ${up ? "is-up" : ""} ${isFound ? "is-found" : ""} ${wrong === i ? "is-wrong" : ""}`}
                style={{ ["--i" as string]: i }}
                onClick={() => tap(i)}
                disabled={step !== "recall"}
                aria-label={up ? undefined : `Case ${i + 1}`}
                data-symbol={symbol}
              >
                <span className="card__inner">
                  <span className="card__back" />
                  <span className="card__face"><Glyph id={symbol} /></span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </StageFrame>
  );
}
