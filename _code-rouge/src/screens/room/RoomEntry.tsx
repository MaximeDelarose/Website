import { useState } from "react";
import { CoreOrb } from "../../components/CoreOrb";
import { Button } from "../../components/ui";
import { gameConfig } from "../../config/game.config";
import { goSolo } from "../../route";
import { identity, room } from "../../net/room";
import { normalizeCode } from "../../net/protocol";
import { audio } from "../../services/audio";
import { useSyncExternalStore } from "react";

/** Entrée du mode coopératif : créer un salon (on devient l'hôte de l'équipe) ou en rejoindre un avec son code. */
export function RoomEntry({ presetCode }: { presetCode: string | null }) {
  const mgr = useSyncExternalStore(room.subscribe, room.getState);
  const [name, setName] = useState(() => identity().name);
  const [code, setCode] = useState(presetCode ?? "");
  const nameOk = name.trim().length >= 2;
  const codeOk = normalizeCode(code) !== null;
  const { coop } = gameConfig;

  return (
    <main className="screen entry" data-testid="room-entry">
      <div className="entry__head">
        <CoreOrb unlocked={0} mood="alert" className="entry__core" />
        <div>
          <p className="kicker"><span className="kicker__code">BÊTA</span>Coopération</p>
          <h1 className="h1">Jouer à plusieurs</h1>
        </div>
      </div>
      <p className="lead">{coop.minPlayers} à {coop.maxPlayers} téléphones, une seule équipe. Chacun reçoit des informations que les autres n'ont pas : il faudra parler.</p>

      <label className="field">
        <span className="field__label">Votre prénom</span>
        <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} maxLength={14} placeholder="Ex. Léa" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" data-testid="room-name" />
        <span className="field__count">{name.trim().length}/14</span>
      </label>

      <div className="entry__choices">
        <div className="panel entry__card">
          <p className="kicker">Vous êtes l'hôte de l'équipe</p>
          <Button block icon="users" disabled={!nameOk || mgr.busy} onClick={() => { audio.whoosh(); void room.create(name.trim()); }} data-testid="room-create">
            {mgr.busy ? "Création…" : "Créer un salon"}
          </Button>
        </div>
        <div className="panel entry__card">
          <p className="kicker">Un coéquipier a déjà un salon</p>
          <input
            className="field__input field__input--code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
            placeholder="CODE"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Code du salon"
            data-testid="room-code-input"
          />
          <Button block variant="ghost" iconRight="arrow" disabled={!nameOk || !codeOk} onClick={() => { audio.whoosh(); room.join(code, name.trim()); }} data-testid="room-join">
            Rejoindre
          </Button>
        </div>
      </div>

      {mgr.error && <p className="entry__error" role="alert" data-testid="room-error">{mgr.error}</p>}
      <button type="button" className="link" onClick={() => { room.clearError(); goSolo(); }}>Retour — jouer avec un seul téléphone</button>
    </main>
  );
}
