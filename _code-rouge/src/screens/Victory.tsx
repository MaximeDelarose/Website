import { useEffect, useState } from "react";
import { CoreOrb } from "../components/CoreOrb";
import { Button } from "../components/ui";
import { useGame } from "../game";
import { audio, buzz } from "../services/audio";
import { burstBus } from "../services/fx";

/** Séquence de victoire : flash, noyau stabilisé, ondes et étincelles. */
export function Victory() {
  const { config, state, dispatch } = useGame();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    audio.win();
    buzz([40, 60, 40, 60, 200]);
    const timers: number[] = [];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.36;
    const css = getComputedStyle(document.documentElement);
    const colors = [css.getPropertyValue("--cyan").trim(), css.getPropertyValue("--electric").trim(), "#ffffff", css.getPropertyValue("--amber").trim()];
    for (let i = 0; i < 9; i++) {
      timers.push(window.setTimeout(() => {
        burstBus.emit({
          x: i === 0 ? cx : cx + (Math.random() - 0.5) * window.innerWidth * 0.8,
          y: i === 0 ? cy : cy + (Math.random() - 0.5) * window.innerHeight * 0.4,
          count: i === 0 ? 90 : 34,
          power: i === 0 ? 1.9 : 1.2,
          color: colors[i % colors.length],
        });
      }, 250 + i * 330));
    }
    timers.push(window.setTimeout(() => setReady(true), 2600));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <main className="screen victory" data-testid="victory">
      <div className="victory__flash" aria-hidden="true" />
      <div className="victory__core">
        <span className="victory__wave" /><span className="victory__wave" /><span className="victory__wave" />
        <CoreOrb unlocked={4} mood="stable" />
      </div>
      <div className="victory__text">
        <p className="kicker"><span className="kicker__code">NOYAU ORION</span>Stabilisé</p>
        <h1 className="victory__title">{config.texts.victoryTitle}</h1>
        <p className="lead">Bravo, équipe {state.teamName}. {config.texts.victoryLine}</p>
      </div>
      <div className={`screen__foot victory__foot ${ready ? "is-ready" : ""}`}>
        <Button block iconRight="arrow" onClick={() => dispatch({ type: "SHOW_END" })} data-testid="see-report">Voir le rapport de mission</Button>
      </div>
    </main>
  );
}
