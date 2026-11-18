import { useEffect, useState } from "react";
import { Breakdown } from "../components/Breakdown";
import { CoreOrb } from "../components/CoreOrb";
import { RulesSheet } from "../components/Rules";
import { Button, CountUp } from "../components/ui";
import { rankFor } from "../engine/scoring";
import { STAGE_ORDER, totalScore } from "../engine/state";
import { newSeed } from "../engine/rng";
import { formatDuration, formatPoints, useGame } from "../game";
import { audio } from "../services/audio";

/** Rapport de mission : score final, détail par épreuve, grade, rejouer. */
export function End() {
  const { config, state, dispatch } = useGame();
  const [open, setOpen] = useState<number | null>(null);
  const [rules, setRules] = useState(false);
  const [shared, setShared] = useState("");
  const success = state.outcome === "success";
  const total = totalScore(state);
  const rank = rankFor(config.scoring, total);
  const done = state.stages.filter((s) => s.status === "done").length;
  const left = config.durationSeconds * 1000 - state.clock.elapsedMs;

  useEffect(() => {
    if (!success) audio.lose();
  }, [success]);

  const share = async () => {
    const text = `${config.brand.gameTitle} — équipe ${state.teamName} : ${formatPoints(total)} points, ${done}/4 verrous${success ? `, mission réussie en ${formatDuration(state.clock.elapsedMs)}` : ""}. Grade : ${rank.title}.`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setShared("Résultat copié dans le presse-papiers.");
      }
    } catch {
      /* partage annulé */
    }
  };

  return (
    <main className={`screen end ${success ? "end--win" : "end--fail"}`} data-testid="end">
      <div className="end__head">
        <CoreOrb unlocked={done} mood={success ? "stable" : "critical"} className="end__core" />
        <div>
          <p className="kicker"><span className="kicker__code">RAPPORT DE MISSION</span>{state.teamName}</p>
          <h1 className="h1" data-testid="end-title">{success ? config.texts.victoryTitle : config.texts.failTitle}</h1>
          {!success && <p className="lead">{config.texts.failLine}</p>}
        </div>
      </div>

      <div className="scorecard">
        <p className="scorecard__label">Score final</p>
        <p className="scorecard__value" data-testid="final-score" data-value={total}><CountUp value={total} duration={1600} delay={300} sound /></p>
        <p className="scorecard__rank">{rank.title}</p>
        <p className="scorecard__line">{rank.line}</p>
        <ul className="scorecard__stats">
          <li><strong>{done}/4</strong>verrous ouverts</li>
          <li><strong>{formatDuration(state.clock.elapsedMs)}</strong>de mission</li>
          <li><strong>{state.stages.reduce((a, s) => a + s.hints, 0)}</strong>indices utilisés</li>
        </ul>
      </div>

      <div className="report">
        {STAGE_ORDER.map((id, i) => {
          const rec = state.stages[i];
          const t = config.texts.stages[id];
          return (
            <div key={id} className={`report__item ${rec.result ? "is-done" : "is-missed"}`}>
              <button type="button" className="report__row" disabled={!rec.result} aria-expanded={open === i} onClick={() => { audio.tap(); setOpen(open === i ? null : i); }}>
                <span className="report__n">{i + 1}</span>
                <span className="report__name">{t.name}<small>{rec.result ? formatDuration(rec.durationMs) : "Verrou non ouvert"}</small></span>
                <span className="report__pts">{rec.result ? formatPoints(rec.result.total) : "—"}</span>
              </button>
              {open === i && rec.result && <Breakdown result={rec.result} durationMs={rec.durationMs} errors={rec.errors} hints={rec.hints} animate={false} />}
            </div>
          );
        })}
        <div className={`report__item ${success ? "is-done" : "is-missed"}`}>
          <div className="report__row">
            <span className="report__n">+</span>
            <span className="report__name">Temps restant<small>{success ? `${formatDuration(left)} × ${config.scoring.pointsPerSecondLeft} pts/s` : "Réservé aux missions réussies"}</small></span>
            <span className="report__pts">{success ? formatPoints(state.timeBonus) : "—"}</span>
          </div>
        </div>
      </div>

      <div className="end__actions">
        <Button block icon="replay" onClick={() => { audio.whoosh(); dispatch({ type: "NEW_GAME", seed: newSeed() }); }} data-testid="replay">Rejouer</Button>
        <div className="end__row">
          <Button variant="ghost" icon="share" onClick={share}>Partager</Button>
          <Button variant="ghost" onClick={() => setRules(true)}>Barème</Button>
        </div>
        {shared && <p className="note">{shared}</p>}
        <button type="button" className="link" onClick={() => dispatch({ type: "GO_HOME" })}>Retour à l'accueil</button>
      </div>
      <RulesSheet open={rules} onClose={() => setRules(false)} />
    </main>
  );
}
