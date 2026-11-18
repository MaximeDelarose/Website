import { useEffect, useMemo, useState } from "react";
import { CoreOrb } from "../components/CoreOrb";
import { Button } from "../components/ui";
import { useGame } from "../game";
import { audio } from "../services/audio";

const CHAR_MS = 30;
const LINE_PAUSE = 520;

/** Briefing narratif (≈ 25 s) : texte tapé ligne à ligne, que l'on peut passer. */
export function Briefing() {
  const { config, state, dispatch } = useGame();
  const lines = useMemo(
    () => config.texts.briefing.map((l) => l.replace("{team}", state.teamName).replace("{client}", config.brand.clientName)),
    [config, state.teamName],
  );
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const done = line >= lines.length;

  useEffect(() => {
    if (done) return;
    const full = lines[line].length;
    if (chars >= full) {
      const id = window.setTimeout(() => { setLine((l) => l + 1); setChars(0); }, LINE_PAUSE);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setChars((c) => Math.min(full, c + 2));
      audio.type();
    }, CHAR_MS * 2);
    return () => window.clearTimeout(id);
  }, [line, chars, done, lines]);

  return (
    <main className="screen briefing">
      <div className="briefing__head">
        <CoreOrb unlocked={0} mood="alert" className="briefing__core" />
        <div>
          <p className="kicker"><span className="kicker__code">PRIORITÉ ABSOLUE</span>Briefing</p>
          <h1 className="h1">Transmission entrante</h1>
        </div>
      </div>
      <div className="briefing__log panel" aria-live="polite">
        {lines.map((text, i) => {
          if (i > line) return null;
          const shown = i < line ? text : text.slice(0, chars);
          return (
            <p key={i} className={`briefing__line ${i === line ? "is-typing" : ""}`}>
              <span className="briefing__n">{String(i + 1).padStart(2, "0")}</span>
              <span>{shown}</span>
            </p>
          );
        })}
      </div>
      <div className="screen__foot">
        {done ? (
          <Button block iconRight="arrow" onClick={() => { audio.whoosh(); dispatch({ type: "BRIEFING_DONE" }); }} data-testid="briefing-go">Nous sommes prêts</Button>
        ) : (
          <Button block variant="ghost" onClick={() => setLine(lines.length)} data-testid="briefing-skip">Passer le briefing</Button>
        )}
      </div>
    </main>
  );
}
