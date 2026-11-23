import { useState } from "react";
import { CoreOrb } from "../components/CoreOrb";
import { RulesSheet } from "../components/Rules";
import { BrandMark, Button } from "../components/ui";
import { remainingMs } from "../engine/state";
import { newSeed } from "../engine/rng";
import { formatClock, useGame, useNow } from "../game";
import { audio } from "../services/audio";
import { goRoom } from "../route";

export function Home() {
  const { config, state, dispatch, resumePending, confirmResume } = useGame();
  const [rules, setRules] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const now = useNow(500);
  const { brand, texts } = config;
  const start = () => {
    audio.whoosh();
    confirmResume();
    dispatch({ type: "NEW_GAME", seed: newSeed() });
  };

  return (
    <main className="screen home">
      <div className="home__top">
        <BrandMark name={brand.operatorName} logoUrl={brand.logoUrl} />
        <span className="home__presents">présente</span>
      </div>

      <div className="home__hero">
        <CoreOrb unlocked={resumePending ? state.stages.filter((s) => s.status === "done").length : 0} mood="alert" className="home__core" />
        <p className="home__tagline">{texts.tagline}</p>
        <h1 className="title" data-text={brand.gameTitle}>
          {brand.gameTitle.split(" ").map((w, i) => (
            <span key={i} className={i === 1 ? "title__red" : ""}>{w}</span>
          ))}
        </h1>
      </div>

      {resumePending ? (
        <div className="home__panel panel panel--alert">
          <p className="kicker">Mission en cours</p>
          <p className="home__resume">
            Équipe <strong>{state.teamName}</strong>, votre mission n'est pas terminée
            {state.clock.runningSince !== null ? " et le chrono tourne toujours." : "."}
          </p>
          <Button block iconRight="arrow" onClick={() => { audio.whoosh(); confirmResume(); }} data-testid="resume">
            Reprendre · {formatClock(remainingMs(state, config, now))}
          </Button>
          {confirmNew ? (
            <Button block variant="danger" onClick={start}>Confirmer : effacer et recommencer</Button>
          ) : (
            <Button block variant="ghost" onClick={() => setConfirmNew(true)}>Nouvelle partie</Button>
          )}
          {config.coop.enabled && <button type="button" className="link" onClick={() => goRoom()} data-testid="multi">Jouer à plusieurs · bêta</button>}
        </div>
      ) : (
        <div className="home__panel">
          <p className="home__pitch">{texts.pitch}</p>
          <ul className="facts">
            {texts.facts.map((f) => (
              <li key={f.label} className="facts__item">
                <span className="facts__value">{f.value}</span>
                <span className="facts__label">{f.label}</span>
              </li>
            ))}
          </ul>
          <Button block iconRight="arrow" className="btn--xl" onClick={start} data-testid="start">
            Commencer la mission
          </Button>
          {config.coop.enabled && (
            <Button block variant="ghost" icon="users" onClick={() => goRoom()} data-testid="multi">
              Jouer à plusieurs · bêta
            </Button>
          )}
          <button type="button" className="link" onClick={() => setRules(true)}>Comment le score est calculé</button>
        </div>
      )}
      <RulesSheet open={rules} onClose={() => setRules(false)} />
    </main>
  );
}
