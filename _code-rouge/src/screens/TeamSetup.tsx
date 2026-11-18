import { useState } from "react";
import { Button } from "../components/ui";
import { useGame } from "../game";
import { audio } from "../services/audio";

export function TeamSetup() {
  const { config, dispatch } = useGame();
  const [name, setName] = useState("");
  const valid = name.trim().length >= 2;
  const submit = () => {
    if (!valid) return;
    audio.reveal();
    dispatch({ type: "SET_TEAM", name });
  };
  return (
    <main className="screen team">
      <div className="team__head">
        <p className="kicker"><span className="kicker__code">ÉTAPE 1</span>Identification</p>
        <h1 className="h1">Quel est le nom de votre équipe ?</h1>
        <p className="lead">Il apparaîtra sur votre rapport de mission. Mettez-vous d'accord : c'est votre première décision collective.</p>
      </div>
      <form className="team__form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label className="field">
          <span className="field__label">Nom de code</span>
          <input
            className="field__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="Ex. Unité Phénix"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="go"
            data-testid="team-input"
          />
          <span className="field__count">{name.trim().length}/24</span>
        </label>
        <div className="chips" aria-label="Suggestions">
          {config.texts.teamSuggestions.map((s) => (
            <button key={s} type="button" className={`chip ${name === s ? "is-on" : ""}`} onClick={() => { audio.unlock(); audio.key(); setName(s); }}>{s}</button>
          ))}
        </div>
      </form>
      <div className="screen__foot">
        <Button block iconRight="arrow" disabled={!valid} onClick={submit} silent data-testid="team-ok">Valider l'équipe</Button>
      </div>
    </main>
  );
}
