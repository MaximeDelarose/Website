import { useEffect, useSyncExternalStore } from "react";
import { CoreOrb } from "../../components/CoreOrb";
import { Button } from "../../components/ui";
import { room } from "../../net/room";
import { goSolo, useRoute } from "../../route";
import { Lobby } from "./Lobby";
import { RoomEntry } from "./RoomEntry";

function Wait({ title, text, children, tone = "alert" }: { title: string; text?: string; children?: React.ReactNode; tone?: "alert" | "critical" }) {
  return (
    <main className="screen wait" data-testid="room-wait">
      <CoreOrb unlocked={0} mood={tone} className="wait__core" />
      <h1 className="h1">{title}</h1>
      {text && <p className="lead">{text}</p>}
      <div className="screen__foot">{children}</div>
    </main>
  );
}

/** Racine du mode coopératif (#salle) : entrée, connexion, salle. Le mode solo n'est jamais touché. */
export function RoomApp() {
  const route = useRoute();
  const mgr = useSyncExternalStore(room.subscribe, room.getState);
  const session = mgr.session;
  const view = useSyncExternalStore(session ? session.subscribe : () => () => {}, session ? session.getState : () => null);

  useEffect(() => { if (!room.getState().session) room.resume(); }, []);
  // Un lien #salle=CODE ouvert pendant qu'on est dans un autre salon : on ne change pas de salon sans le dire.

  if (!session || !view) return <RoomEntry presetCode={route.code} />;
  const leave = () => { room.leave(); };
  if (view.status === "connecting" || view.status === "joining") {
    return <Wait title="Connexion au salon…" text={`Salon ${view.code}`}><Button block variant="ghost" onClick={leave}>Annuler</Button></Wait>;
  }
  if (view.status === "notfound") {
    return (
      <Wait title="Salon introuvable" text={`Aucun hôte ne répond sur le code ${view.code}. Vérifiez le code, ou que l'hôte a gardé l'application ouverte.`} tone="critical">
        <Button block onClick={() => session.retry()} data-testid="room-retry">Réessayer</Button>
        <Button block variant="ghost" onClick={leave}>Changer de code</Button>
      </Wait>
    );
  }
  if (view.status === "full") return <Wait title="Salon complet" text="Cette équipe a déjà tous ses joueurs." tone="critical"><Button block variant="ghost" onClick={leave}>Retour</Button></Wait>;
  if (view.status === "kicked") return <Wait title="Vous avez été retiré" text="L'hôte a retiré ce téléphone du salon." tone="critical"><Button block variant="ghost" onClick={leave}>Retour</Button></Wait>;
  if (view.status === "incompatible") return <Wait title="Version différente" text="Rechargez la page pour utiliser la même version que l'hôte." tone="critical"><Button block onClick={() => location.reload()}>Recharger</Button></Wait>;
  if (view.status === "closed" || !view.snapshot) return <RoomEntry presetCode={route.code} />;
  return <Lobby session={session} view={view} />;
}

export { goSolo };
