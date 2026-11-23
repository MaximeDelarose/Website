import { useMemo, useState } from "react";
import { Icon } from "../components/Icons";
import { StageFrame } from "../components/StageFrame";
import { LetterPad, Sheet, Slots } from "../components/ui";
import { cipherText, shiftLetter } from "../engine/puzzles";
import { useGame } from "../game";
import { audio, buzz } from "../services/audio";
import { burstBus, scoreBus, shakeBus } from "../services/fx";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const STEP = 360 / 26;
// Disposition des relais sur la carte (x, y en % du schéma).
const RELAY_POS = [[14, 20], [38, 10], [66, 13], [88, 30], [90, 68], [64, 88], [34, 90], [10, 64]];

/** Épreuve 3 — un message chiffré, trois indices, une roue : il faut se parler pour s'en sortir. */
export function CipherStage() {
  const { config, state, dispatch } = useGame();
  const c = config.cipher;
  const message = useMemo(() => cipherText(c), [c]);
  const answer = c.plaintext.toUpperCase();
  const [tab, setTab] = useState<"clues" | "wheel">("clues");
  const [turns, setTurns] = useState(0);
  const [selected, setSelected] = useState(0);
  const [pad, setPad] = useState(false);
  const [word, setWord] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const hints = state.stages[state.stageIndex].hints;
  const shift = ((turns % 26) + 26) % 26;
  const outerLetter = message[selected];
  const innerLetter = shiftLetter(outerLetter, -shift);

  const rotate = (dir: number) => {
    audio.unlock();
    audio.key();
    buzz(5);
    setTurns((t) => t + dir);
  };

  const submit = () => {
    if (word.length !== answer.length || status !== "idle") return;
    if (word === answer) {
      setStatus("success");
      audio.good(4);
      buzz([15, 30, 15]);
      burstBus.emit({ x: window.innerWidth / 2, y: window.innerHeight * 0.5, count: 40 });
      window.setTimeout(() => dispatch({ type: "COMPLETE_STAGE", now: Date.now() }), 1100);
    } else {
      setStatus("error");
      audio.bad();
      buzz([30, 40, 30]);
      shakeBus.emit("soft");
      scoreBus.emit(-config.scoring.stages.cipher.errorPenalty);
      dispatch({ type: "ERROR" });
      window.setTimeout(() => { setStatus("idle"); setWord(""); }, 800);
    }
  };

  return (
    <StageFrame
      hint={{ revealed: c.hints.slice(0, hints), available: hints < c.hints.length, onTake: () => {} }}
      footer={
        <button type="button" className="answerbar" onClick={() => { audio.unlock(); audio.tap(); setPad(true); }} data-testid="word-open">
          <span className="answerbar__label">Réponse</span>
          <Slots value={word} length={answer.length} />
        </button>
      }
    >
      <div className="cipher">
        <div className="intercept panel">
          <p className="intercept__label"><span className="dot" />Message intercepté</p>
          <div className="intercept__tiles" data-testid="cipher-message" data-message={message}>
            {message.split("").map((l, i) => (
              <button key={i} type="button" className={`tile ${selected === i ? "is-on" : ""}`} onClick={() => { audio.unlock(); audio.key(); setSelected(i); setTab("wheel"); }} aria-label={`Lettre ${i + 1} : ${l}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="tabs tabs--two" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "clues"} className={`tab ${tab === "clues" ? "is-on" : ""}`} onClick={() => { audio.flip(); setTab("clues"); }} data-testid="tab-clues">
            <Icon name="note" size={20} /><span>Indices terrain</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === "wheel"} className={`tab ${tab === "wheel" ? "is-on" : ""}`} onClick={() => { audio.flip(); setTab("wheel"); }} data-testid="tab-wheel">
            <Icon name="wheel" size={20} /><span>Roue de déchiffrement</span>
          </button>
        </div>

        {tab === "clues" ? (
          <div className="clues" key="clues">
            <article className="clue">
              <header className="clue__head"><span className="clue__n">A</span>Carte du réseau</header>
              <div className="relaymap" data-testid="relaymap">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relaymap__links" aria-hidden="true">
                  {c.relays.map((r, i) => (
                    <line key={r.id} x1="50" y1="50" x2={RELAY_POS[i % 8][0]} y2={RELAY_POS[i % 8][1]} className={r.active ? "is-active" : ""} />
                  ))}
                </svg>
                <span className="relaymap__core">ORION</span>
                {c.relays.map((r, i) => (
                  <span key={r.id} className={`relay ${r.active ? "is-active" : "is-down"}`} style={{ left: `${RELAY_POS[i % 8][0]}%`, top: `${RELAY_POS[i % 8][1]}%` }}>
                    <span className="relay__dot">{r.active ? "" : "✕"}</span>
                    <span className="relay__id">{r.id}</span>
                  </span>
                ))}
              </div>
              <p className="clue__legend"><span className="legend legend--on" />relais actif<span className="legend legend--off" />relais hors service</p>
            </article>
            <article className="clue clue--paper">
              <header className="clue__head"><span className="clue__n">B</span>Note de l'agent infiltré</header>
              <p className="handwritten">« J'ai chiffré en <u>avançant</u> dans l'alphabet, d'autant de lettres qu'il reste de relais actifs. Pour me lire, il vous faudra donc <u>reculer</u> d'autant. »</p>
            </article>
            <article className="clue">
              <header className="clue__head"><span className="clue__n">C</span>Protocole de vérification</header>
              <p>Le mot de passe compte {answer.length} lettres et désigne une lumière qui précède le lever du jour. Si votre résultat ne veut rien dire, la roue est mal réglée.</p>
            </article>
          </div>
        ) : (
          <div className="wheelbox" key="wheel">
            <div className="wheel" style={{ ["--rot" as string]: `${turns * STEP}deg` }} data-testid="wheel" data-shift={shift}>
              <div className="wheel__pointer" style={{ transform: `rotate(${(outerLetter.charCodeAt(0) - 65) * STEP}deg)` }} />
              <div className="wheel__outer">
                {ALPHABET.map((l, i) => (
                  <span key={l} className={`wheel__l ${l === outerLetter ? "is-on" : ""}`} style={{ ["--a" as string]: `${i * STEP}deg` }}><i>{l}</i></span>
                ))}
              </div>
              <div className="wheel__inner">
                {ALPHABET.map((l, i) => (
                  <span key={l} className={`wheel__l ${l === innerLetter ? "is-on" : ""}`} style={{ ["--a" as string]: `${i * STEP}deg` }}><i>{l}</i></span>
                ))}
              </div>
              <div className="wheel__hub">
                <span className="wheel__hub-label">Recul</span>
                <span className="wheel__hub-value" data-testid="wheel-shift">{shift}</span>
              </div>
            </div>
            <div className="wheel__controls">
              <button type="button" className="rotbtn" onClick={() => rotate(-1)} aria-label="Diminuer le recul" data-testid="wheel-minus"><Icon name="left" /></button>
              <p className="wheel__read">
                <span>Anneau extérieur : lettre reçue</span>
                <span>Anneau intérieur : lettre réelle</span>
              </p>
              <button type="button" className="rotbtn" onClick={() => rotate(1)} aria-label="Augmenter le recul" data-testid="wheel-plus"><Icon name="right" /></button>
            </div>
          </div>
        )}
      </div>

      <Sheet open={pad} onClose={() => setPad(false)} title="Mot de passe" kicker={`${answer.length} lettres`}>
        <div className="entry">
          <Slots value={word} length={answer.length} state={status} size="lg" />
          <p className="entry__msg" data-testid="word-msg">
            {status === "error" ? `Mot refusé · −${config.scoring.stages.cipher.errorPenalty} pts` : status === "success" ? "Message authentifié" : "Le scribe dicte, l'équipe valide avant d'envoyer."}
          </p>
          <LetterPad
            onLetter={(l) => status === "idle" && setWord((w) => (w.length < answer.length ? w + l : w))}
            onBack={() => status === "idle" && setWord((w) => w.slice(0, -1))}
            onSubmit={submit}
            canSubmit={word.length === answer.length && status === "idle"}
          />
        </div>
      </Sheet>
    </StageFrame>
  );
}
