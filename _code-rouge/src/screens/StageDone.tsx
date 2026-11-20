import { useEffect, useRef } from "react";
import { Breakdown } from "../components/Breakdown";
import { Glyph } from "../components/Glyph";
import { Button } from "../components/ui";
import { deductionCode } from "../engine/puzzles";
import { symbolLabel } from "../engine/symbols";
import { useGame } from "../game";
import { audio, buzz } from "../services/audio";
import { burstAt } from "../services/fx";

/** Bilan d'une épreuve : verrou ouvert, détail des points, fragment de clé à retenir. */
export function StageDone() {
  const { config, state, stageId, dispatch, symbolFragment } = useGame();
  const record = state.stages[state.stageIndex];
  const t = config.texts.stages[stageId];
  const badge = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audio.unlockLock();
    buzz([20, 40, 60]);
    const id = window.setTimeout(() => burstAt(badge.current, { count: 44, power: 1.25 }), 260);
    return () => window.clearTimeout(id);
  }, []);

  if (!record.result) return null;
  const fragment =
    stageId === "memory"
      ? { name: "Symbole d'amorçage", value: symbolLabel(symbolFragment), glyph: true }
      : stageId === "deduction"
        ? { name: "Code du coffre", value: deductionCode(config.deduction), glyph: false }
        : { name: "Mot de passe", value: config.cipher.plaintext, glyph: false };

  return (
    <main className="screen done" data-testid="stage-done">
      <div className="done__head">
        <div className="done__badge" ref={badge}>
          <svg viewBox="0 0 96 96" aria-hidden="true">
            <circle cx="48" cy="48" r="44" className="done__ring" />
            <path d="M30 49.500 43 62l24-27" className="done__check" />
          </svg>
        </div>
        <div>
          <p className="kicker"><span className="kicker__code">{t.code}</span>{t.name}</p>
          <h1 className="h1 done__title">Verrou ouvert</h1>
        </div>
      </div>

      <div className="panel">
        <Breakdown result={record.result} durationMs={record.durationMs} errors={record.errors} hints={record.hints} />
      </div>

      <div className="fragment" data-testid="fragment">
        <div className="fragment__tag">Fragment {state.stageIndex + 1}/3 · à retenir</div>
        <div className="fragment__body">
          {fragment.glyph && <Glyph id={symbolFragment} className="fragment__glyph" />}
          <div>
            <p className="fragment__name">{fragment.name}</p>
            <p className={`fragment__value ${fragment.glyph ? "" : "is-mono"}`} data-testid="fragment-value">{fragment.value}</p>
          </div>
        </div>
        <p className="fragment__note">Notez-le : il ne sera plus affiché et servira à stabiliser le noyau.</p>
      </div>

      <div className="screen__foot">
        <Button block iconRight="arrow" onClick={() => { audio.whoosh(); dispatch({ type: "NEXT_STAGE" }); }} data-testid="next-stage">Verrou suivant</Button>
      </div>
    </main>
  );
}
