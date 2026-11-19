import { useEffect, useState } from "react";
import { RoleEmblem } from "../../components/coop/RoleEmblem";
import { Sparks } from "../../components/coop/Sparks";
import { Button } from "../../components/ui";
import { gameConfig } from "../../config/game.config";
import { haptic } from "../../net/haptics";
import { audio } from "../../services/audio";

const SHUFFLE_MS = 1100;

/** Révélation des rôles : tous les téléphones jouent la même séquence au même moment (cliquet → carte qui se retourne). */
export function RoleReveal({ roleIds, onDone }: { roleIds: string[]; onDone: () => void }) {
  const [stage, setStage] = useState<"shuffle" | "show">("shuffle");
  const [canClose, setCanClose] = useState(false);
  const defs = roleIds.map((id) => gameConfig.coop.roles.find((r) => r.id === id)).filter(Boolean) as typeof gameConfig.coop.roles;
  const color = defs[0]?.color ?? "#3fe6ff";

  useEffect(() => {
    audio.ratchet();
    const a = setTimeout(() => { setStage("show"); audio.chord(); audio.unlockLock(); haptic("success"); }, SHUFFLE_MS);
    const b = setTimeout(() => setCanClose(true), SHUFFLE_MS + 1500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  return (
    <div className="reveal" role="dialog" aria-modal="true" aria-label="Votre rôle" data-testid="role-reveal" data-stage={stage} style={{ ["--rc" as string]: color }}>
      <div className="reveal__glow" />
      {stage === "shuffle" ? (
        <div className="reveal__shuffle" aria-live="polite">
          <div className="reveal__rings"><i /><i /><i /></div>
          <p className="kicker">Distribution des rôles</p>
        </div>
      ) : (
        <>
          <Sparks color={color} count={90} power={1.3} origin={[0.5, 0.4]} />
          <div className="reveal__body">
            <p className="kicker reveal__kicker">{defs.length > 1 ? "Vous détenez deux rôles" : "Votre rôle"}</p>
            <div className="reveal__cards">
              {defs.map((r, i) => (
                <article key={r.id} className="rolecard" style={{ ["--c" as string]: r.color, animationDelay: `${i * 160}ms` }} data-testid="role-card" data-role={r.id}>
                  <RoleEmblem id={r.id} className="rolecard__emblem" />
                  <h2 className="rolecard__name">{r.name}</h2>
                  <p className="rolecard__tag">{r.tagline}</p>
                </article>
              ))}
            </div>
            <p className="reveal__hint">Ce que vous voyez, personne d'autre ne le voit. Parlez-vous.</p>
          </div>
          <div className={`reveal__foot ${canClose ? "is-on" : ""}`}>
            <Button block iconRight="arrow" disabled={!canClose} onClick={() => onDone()} data-testid="role-ok">Compris</Button>
          </div>
        </>
      )}
    </div>
  );
}
