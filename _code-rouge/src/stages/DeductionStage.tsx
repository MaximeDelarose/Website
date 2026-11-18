import { useMemo, useState } from "react";
import { Icon, type IconName } from "../components/Icons";
import { StageFrame } from "../components/StageFrame";
import { Keypad, Sheet, Slots } from "../components/ui";
import { deductionCode } from "../engine/puzzles";
import { useGame } from "../game";
import { audio, buzz } from "../services/audio";
import { burstBus, scoreBus, shakeBus } from "../services/fx";

const DOCS: { id: string; label: string; icon: IconName }[] = [
  { id: "note", label: "Note", icon: "note" },
  { id: "journal", label: "Journal", icon: "list" },
  { id: "vestiaire", label: "Vestiaire", icon: "grid" },
  { id: "voyage", label: "Billet", icon: "plane" },
];

/** Épreuve 2 — quatre documents à croiser pour reconstituer le code du coffre. */
export function DeductionStage() {
  const { config, state, dispatch } = useGame();
  const d = config.deduction;
  const answer = useMemo(() => deductionCode(d), [d]);
  const [doc, setDoc] = useState(0);
  const [seen, setSeen] = useState<number[]>([0]);
  const [pad, setPad] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const hints = state.stages[state.stageIndex].hints;
  const journal = d.agents.filter((a) => a.entry !== null);
  const cloned = d.agents.find((a) => a.name === d.clonedBadgeOf);

  const open = (i: number) => {
    audio.unlock();
    audio.flip();
    setDoc(i);
    setSeen((s) => (s.includes(i) ? s : [...s, i]));
  };

  const submit = () => {
    if (code.length !== answer.length || status !== "idle") return;
    if (code === answer) {
      setStatus("success");
      audio.good(4);
      buzz([15, 30, 15]);
      burstBus.emit({ x: window.innerWidth / 2, y: window.innerHeight * 0.55, count: 40 });
      window.setTimeout(() => dispatch({ type: "COMPLETE_STAGE", now: Date.now() }), 1100);
    } else {
      setStatus("error");
      audio.bad();
      buzz([30, 40, 30]);
      shakeBus.emit("soft");
      scoreBus.emit(-config.scoring.stages.deduction.errorPenalty);
      dispatch({ type: "ERROR" });
      window.setTimeout(() => { setStatus("idle"); setCode(""); }, 800);
    }
  };

  return (
    <StageFrame
      hint={{ revealed: d.hints.slice(0, hints), available: hints < d.hints.length, onTake: () => {} }}
      footer={
        <button type="button" className="answerbar" onClick={() => { audio.unlock(); audio.tap(); setPad(true); }} data-testid="code-open">
          <span className="answerbar__label">Réponse</span>
          <Slots value={code} length={answer.length} />
        </button>
      }
    >
      <div className="dossier">
        <div className="tabs" role="tablist">
          {DOCS.map((t, i) => (
            <button key={t.id} type="button" role="tab" aria-selected={doc === i} className={`tab ${doc === i ? "is-on" : ""} ${seen.includes(i) ? "is-seen" : ""}`} onClick={() => open(i)} data-testid={`doc-${t.id}`}>
              <Icon name={t.icon} size={20} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="doc" key={doc} role="tabpanel">
          {doc === 0 && (
            <article className="paper">
              <header className="paper__head">Note interne — R. Castel, chef de la sécurité</header>
              <p>Le code du coffre change chaque nuit, sans que personne ait à le retenir :</p>
              <p className="paper__rule">un chiffre par agent entré dans la salle — son <u>numéro de casier</u> — dans l'<u>ordre des entrées</u>.</p>
              <p>Attention, {d.nightLabel} : un badge a été <u>cloné</u>. Son vrai titulaire n'était même pas dans le pays : son passage ne compte pas.</p>
            </article>
          )}
          {doc === 1 && (
            <article className="terminal">
              <header className="terminal__head"><span>JOURNAL DES BADGES</span><span>SALLE SERVEUR · {d.nightLabel.toUpperCase()}</span></header>
              <table className="terminal__table">
                <thead><tr><th>Badge</th><th>Agent</th><th>Entrée</th></tr></thead>
                <tbody>
                  {journal.map((a) => (
                    <tr key={a.name}><td>B-{String(a.locker * 37 + 104).padStart(3, "0")}</td><td>{a.name}</td><td>{a.entry}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="terminal__foot">{journal.length} passages enregistrés · tri alphabétique</p>
            </article>
          )}
          {doc === 2 && (
            <article className="lockers">
              <header className="lockers__head">Vestiaire du personnel — photo de contrôle</header>
              <div className="lockers__grid">
                {d.agents.map((a) => (
                  <div key={a.name} className="locker">
                    <span className="locker__num">{a.locker}</span>
                    <span className="locker__vents" />
                    <span className="locker__name">{a.name}</span>
                    <span className="locker__handle" />
                  </div>
                ))}
              </div>
            </article>
          )}
          {doc === 3 && cloned && (
            <article className="pass">
              <div className="pass__main">
                <header className="pass__head"><span>CARTE D'EMBARQUEMENT</span><span>{d.trip.flight}</span></header>
                <p className="pass__label">Passager</p>
                <p className="pass__name">{cloned.name} / AGENT</p>
                <div className="pass__route">
                  <div><strong>CDG</strong><span>PARIS</span></div>
                  <Icon name="plane" size={26} />
                  <div><strong>{d.trip.code}</strong><span>{d.trip.city}</span></div>
                </div>
                <div className="pass__dates">
                  <div><span>Aller</span><strong>{d.trip.from}</strong></div>
                  <div><span>Retour</span><strong>{d.trip.to}</strong></div>
                  <div><span>Siège</span><strong>14C</strong></div>
                </div>
              </div>
              <div className="pass__stub"><span>Pièce à conviction</span></div>
            </article>
          )}
        </div>
      </div>

      <Sheet open={pad} onClose={() => setPad(false)} title="Code du coffre" kicker="Quatre chiffres">
        <div className="entry">
          <Slots value={code} length={answer.length} state={status} size="lg" />
          <p className="entry__msg" data-testid="code-msg">
            {status === "error" ? `Code refusé · −${config.scoring.stages.deduction.errorPenalty} pts` : status === "success" ? "Coffre déverrouillé" : "Chaque erreur coûte des points : vérifiez à plusieurs."}
          </p>
          <Keypad
            onDigit={(x) => status === "idle" && setCode((c) => (c.length < answer.length ? c + x : c))}
            onBack={() => status === "idle" && setCode((c) => c.slice(0, -1))}
            onSubmit={submit}
            canSubmit={code.length === answer.length && status === "idle"}
          />
        </div>
      </Sheet>
    </StageFrame>
  );
}
