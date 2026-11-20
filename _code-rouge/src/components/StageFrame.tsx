import { useState, type ReactNode } from "react";
import { nextHintCost } from "../engine/scoring";
import { useGame } from "../game";
import { audio } from "../services/audio";
import { scoreBus } from "../services/fx";
import { Button, Sheet } from "./ui";

export interface HintModel {
  /** Indices déjà révélés (texte). */
  revealed: string[];
  /** Reste-t-il un indice à prendre ? */
  available: boolean;
  /** Libellé de l'action (ex. « Revoir la grille »). */
  actionLabel?: string;
  /** Message quand aucun indice n'est disponible. */
  emptyText?: string;
  /** Appelé quand l'équipe confirme : l'épreuve révèle l'indice. */
  onTake: () => void;
  /** Ferme la feuille juste après la prise (indices « action »). */
  closeOnTake?: boolean;
}

/** Cadre commun des épreuves : en-tête, zone de jeu défilante, barre d'action avec le bouton Indice. */
export function StageFrame({ children, footer, hint, step }: { children: ReactNode; footer?: ReactNode; hint: HintModel; step?: string }) {
  const { config, state, stageId, dispatch } = useGame();
  const [open, setOpen] = useState(false);
  const texts = config.texts.stages[stageId];
  const used = state.stages[state.stageIndex].hints;
  const cost = nextHintCost(config.scoring.stages[stageId], used);

  const take = () => {
    dispatch({ type: "HINT" });
    scoreBus.emit(-cost);
    audio.reveal();
    hint.onTake();
    if (hint.closeOnTake) setOpen(false);
  };

  return (
    <section className="stage" data-stage={stageId}>
      <div className="stage__head">
        <p className="kicker">
          <span className="kicker__code">{texts.code}</span>
          {texts.name}
          {step && <span className="kicker__step">{step}</span>}
        </p>
        <p className="stage__goal">{texts.goal}</p>
      </div>
      <div className="stage__body">{children}</div>
      <div className="stage__foot">
        <div className="stage__foot-main">{footer}</div>
        <button type="button" className="hintbtn" onClick={() => { audio.unlock(); audio.tap(); setOpen(true); }} data-testid="hint-open">
          <span className="hintbtn__icon">?</span>
          <span>Indice</span>
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Un coup de pouce ?" kicker="Centre de commandement">
        {hint.revealed.length > 0 && (
          <ol className="hints">
            {hint.revealed.map((h, i) => (
              <li key={i} className="hints__item">
                <span className="hints__n">{i + 1}</span>
                <p>{h}</p>
              </li>
            ))}
          </ol>
        )}
        {hint.available ? (
          <>
            <p className="sheet__text">
              Un indice coûte des points, pas du temps. Le prochain retire <strong>{cost} points</strong> au score de cette épreuve.
            </p>
            <Button variant="amber" block icon="hint" onClick={take} silent data-testid="hint-take">
              {hint.actionLabel ?? "Révéler un indice"} · −{cost} pts
            </Button>
          </>
        ) : (
          <p className="sheet__text">{hint.emptyText ?? "Tous les indices de cette épreuve sont révélés."}</p>
        )}
      </Sheet>
    </section>
  );
}
