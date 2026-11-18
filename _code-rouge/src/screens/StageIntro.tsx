import { CoreOrb } from "../components/CoreOrb";
import { Button } from "../components/ui";
import { remainingMs } from "../engine/state";
import { formatClock, useGame } from "../game";
import { audio } from "../services/audio";

/** Transition d'entrée dans une épreuve. Le chrono (re)démarre au clic. */
export function StageIntro() {
  const { config, state, stageId, dispatch } = useGame();
  const t = config.texts.stages[stageId];
  const first = state.stageIndex === 0;
  return (
    <main className="screen intro" data-testid="stage-intro">
      <div className="intro__wipe" aria-hidden="true" />
      <div className="intro__core">
        <CoreOrb unlocked={state.stageIndex} active={state.stageIndex} mood={stageId === "finale" ? "critical" : "alert"} />
        <span className="intro__num">{String(state.stageIndex + 1).padStart(2, "0")}</span>
      </div>
      <div className="intro__text">
        <p className="kicker"><span className="kicker__code">{t.code}</span>{t.skill}</p>
        <h1 className="intro__name">{t.name}</h1>
        <p className="lead">{t.intro}</p>
      </div>
      <div className="screen__foot">
        <p className="note">
          {first ? "Le compte à rebours démarre au lancement" : "Le chrono reprend au lancement"} · {formatClock(remainingMs(state, config, Date.now()))}
        </p>
        <Button block iconRight="arrow" onClick={() => { audio.whoosh(); dispatch({ type: "BEGIN_STAGE", now: Date.now() }); }} data-testid="stage-go">
          {first ? "Lancer le chrono" : "Lancer l'épreuve"}
        </Button>
      </div>
    </main>
  );
}
