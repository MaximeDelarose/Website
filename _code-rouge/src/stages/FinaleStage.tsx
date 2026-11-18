import { useEffect, useMemo, useRef, useState } from "react";
import { CoreOrb } from "../components/CoreOrb";
import { Glyph } from "../components/Glyph";
import { StageFrame } from "../components/StageFrame";
import { HoldButton, Keypad, LetterPad, Slots } from "../components/ui";
import { deductionCode, finaleSymbolChoices } from "../engine/puzzles";
import { symbolLabel, type SymbolId } from "../engine/symbols";
import { useGame } from "../game";
import { audio, buzz } from "../services/audio";
import { burstAt, burstBus, scoreBus, shakeBus } from "../services/fx";

const STEPS = ["Amorçage", "Accès", "Synchronisation", "Rétablissement"];

/** Épreuve 4 — stabiliser le noyau : quatre manœuvres, une jauge qui chute, les trois fragments à réutiliser. */
export function FinaleStage() {
  const { config, state, dispatch, symbolFragment } = useGame();
  const f = config.finale;
  const rule = config.scoring.stages.finale;
  const step = Math.min(state.finaleStep, STEPS.length - 1);
  const [stability, setStability] = useState(100);
  const stab = useRef(100);
  const [overload, setOverload] = useState(false);
  const [finished, setFinished] = useState(false);
  const frozen = useRef(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const orb = useRef<HTMLDivElement>(null);
  const code = useMemo(() => deductionCode(config.deduction), [config]);
  const word = config.cipher.plaintext.toUpperCase();

  // La stabilité chute en continu ; à zéro : surcharge (pénalité) puis redémarrage partiel.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (frozen.current) return;
      stab.current = Math.max(0, stab.current - f.drainPerSecond * 0.2);
      if (stab.current <= 0) {
        stab.current = 60;
        dispatch({ type: "PENALTY", points: config.scoring.overloadPenalty });
        scoreBus.emit(-config.scoring.overloadPenalty);
        audio.alarm();
        buzz([80, 60, 80, 60, 80]);
        shakeBus.emit("hard");
        setOverload(true);
        window.setTimeout(() => setOverload(false), 1500);
      }
      setStability(stab.current);
    }, 200);
    return () => window.clearInterval(id);
  }, [f.drainPerSecond, config.scoring.overloadPenalty, dispatch]);

  useEffect(() => {
    audio.setAmbient("tense");
  }, []);

  const fail = () => {
    stab.current = Math.max(0.5, stab.current - f.errorDrain);
    setStability(stab.current);
    dispatch({ type: "ERROR" });
    scoreBus.emit(-rule.errorPenalty);
    audio.bad();
    buzz([30, 40, 30]);
    shakeBus.emit("soft");
  };

  const advance = () => {
    stab.current = Math.min(100, stab.current + f.stepGain);
    setStability(stab.current);
    audio.unlockLock();
    buzz([20, 30, 40]);
    burstAt(orb.current, { count: 46, power: 1.3 });
    dispatch({ type: "FINALE_STEP", step: step + 1 });
  };

  const complete = () => {
    frozen.current = true;
    setFinished(true);
    burstAt(orb.current, { count: 80, power: 1.8, color: "#ffffff" });
    window.setTimeout(() => dispatch({ type: "COMPLETE_STAGE", now: Date.now() }), 650);
  };

  const hintTexts = [f.hints.symbol, f.hints.code.replace("{value}", code), null, f.hints.word.replace("{value}", word)];
  const hintText = hintTexts[step];
  const mood = stability < 30 ? "critical" : "alert";

  return (
    <StageFrame
      step={`Manœuvre ${step + 1}/${STEPS.length}`}
      hint={{
        revealed: revealed[step] && hintText ? [hintText] : [],
        available: hintText !== null && !revealed[step],
        actionLabel: "Retrouver le fragment",
        emptyText: hintText === null ? "Aucun indice pour cette manœuvre : c'est une affaire de timing. Désignez celui ou celle qui a le meilleur sens du rythme." : undefined,
        onTake: () => setRevealed((r) => ({ ...r, [step]: true })),
      }}
    >
      <div className={`finale ${overload ? "is-overload" : ""} ${finished ? "is-finished" : ""}`}>
        <div className="finale__top">
          <div className="finale__orb" ref={orb}>
            <CoreOrb unlocked={finished ? 4 : 3} active={3} mood={finished ? "stable" : mood} />
          </div>
          <div className="finale__gauge">
            <p className="finale__gauge-label">Stabilité du noyau</p>
            <p className={`finale__gauge-value ${stability < 30 ? "is-low" : ""}`} data-testid="stability">{Math.ceil(stability)}<small>%</small></p>
            <div className={`gauge ${stability < 30 ? "is-low" : ""}`}><div className="gauge__fill" style={{ transform: `scaleX(${stability / 100})` }} /></div>
            <ol className="finale__steps">
              {STEPS.map((s, i) => (
                <li key={s} className={`${i < step || finished ? "is-done" : ""} ${i === step && !finished ? "is-active" : ""}`}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
        {overload && <p className="finale__alert" role="alert">Surcharge ! −{config.scoring.overloadPenalty} pts · le noyau redémarre à 60 %</p>}

        <div className="finale__panel panel" key={step}>
          {step === 0 && <IgniteStep choices={finaleSymbolChoices(state.seed, symbolFragment)} answer={symbolFragment} holdSeconds={f.holdSeconds} highlight={!!revealed[0]} onFail={fail} onDone={advance} />}
          {step === 1 && <CodeStep answer={code} onFail={fail} onDone={advance} />}
          {step === 2 && <SyncStep rings={f.syncRings} onFail={fail} onDone={advance} />}
          {step === 3 && <RestoreStep answer={word} onFail={fail} onDone={complete} />}
        </div>
      </div>
    </StageFrame>
  );
}

/* ----- Manœuvre 1 : symbole d'amorçage (fragment 1) puis double verrou tenu à deux ----- */
function IgniteStep({ choices, answer, holdSeconds, highlight, onFail, onDone }: { choices: SymbolId[]; answer: SymbolId; holdSeconds: number; highlight: boolean; onFail: () => void; onDone: () => void }) {
  const [picked, setPicked] = useState(false);
  const [wrong, setWrong] = useState<SymbolId | null>(null);
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState([false, false]);
  const until = useRef([0, 0]);
  const down = useRef([false, false]);
  const value = useRef(0);
  const finished = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!picked) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      const a = down.current[0] || t < until.current[0];
      const b = down.current[1] || t < until.current[1];
      setArmed((prev) => (prev[0] === a && prev[1] === b ? prev : [a, b]));
      if (!finished.current) {
        const both = a && b;
        const before = value.current;
        value.current = Math.max(0, Math.min(1, before + (both ? dt / holdSeconds : -dt * 1.2)));
        if (value.current !== before) setProgress(value.current);
        audio.setCharge(both ? value.current : null);
        if (value.current >= 1) {
          finished.current = true;
          audio.setCharge(null);
          done.current();
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); audio.setCharge(null); };
  }, [picked, holdSeconds]);

  // Au doigt, il faut tenir les deux verrous en même temps. À la souris (un seul pointeur),
  // un verrou reste armé 6 s après le relâchement pour pouvoir aller tenir le second.
  const press = (i: number, isDown: boolean, pointerType: string) => {
    if (isDown) { audio.unlock(); audio.tap(); buzz(10); }
    else if (down.current[i]) until.current[i] = performance.now() + (pointerType === "touch" ? 150 : 6000);
    down.current[i] = isDown;
  };

  if (!picked) {
    return (
      <>
        <p className="finale__ask"><strong>Fragment 1.</strong> Sélectionnez le symbole d'amorçage obtenu au verrou 01.</p>
        <div className="symbols" data-testid="finale-symbols">
          {choices.map((id) => (
            <button
              key={id}
              type="button"
              className={`symbol ${wrong === id ? "is-wrong" : ""} ${highlight && id === answer ? "is-hint" : ""}`}
              aria-label={symbolLabel(id)}
              data-symbol={id}
              onClick={() => {
                audio.unlock();
                if (id === answer) { audio.good(2); setPicked(true); }
                else { setWrong(id); onFail(); window.setTimeout(() => setWrong(null), 600); }
              }}
            >
              <Glyph id={id} />
            </button>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <p className="finale__ask"><strong>À deux.</strong> Maintenez les deux verrous en même temps jusqu'à la charge complète.</p>
      <div className="dual" style={{ ["--p" as string]: progress }}>
        {[0, 1].map((i) => (
          <button
            key={i}
            type="button"
            className={`dual__pad ${armed[i] ? "is-armed" : ""}`}
            onPointerDown={(e) => press(i, true, e.pointerType)}
            onPointerUp={(e) => press(i, false, e.pointerType)}
            onPointerLeave={(e) => press(i, false, e.pointerType)}
            onPointerCancel={(e) => press(i, false, e.pointerType)}
            onContextMenu={(e) => e.preventDefault()}
            data-testid={`pad-${i}`}
          >
            <span className="dual__ring" />
            <span className="dual__name">Verrou {i === 0 ? "A" : "B"}</span>
            <span className="dual__state">{armed[i] ? "Tenu" : "Maintenir"}</span>
          </button>
        ))}
        <div className="dual__bar"><div className="dual__fill" /></div>
      </div>
    </>
  );
}

/* ----- Manœuvre 2 : code du coffre (fragment 2) ----- */
function CodeStep({ answer, onFail, onDone }: { answer: string; onFail: () => void; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const submit = () => {
    if (code === answer) {
      setStatus("success");
      window.setTimeout(onDone, 450);
    } else {
      setStatus("error");
      onFail();
      window.setTimeout(() => { setStatus("idle"); setCode(""); }, 700);
    }
  };
  return (
    <>
      <p className="finale__ask"><strong>Fragment 2.</strong> Saisissez le code du coffre trouvé au verrou 02.</p>
      <Slots value={code} length={answer.length} state={status} />
      <Keypad
        onDigit={(d) => status === "idle" && setCode((c) => (c.length < answer.length ? c + d : c))}
        onBack={() => status === "idle" && setCode((c) => c.slice(0, -1))}
        onSubmit={submit}
        canSubmit={code.length === answer.length && status === "idle"}
      />
    </>
  );
}

/* ----- Manœuvre 3 : synchroniser les anneaux (timing) ----- */
function SyncStep({ rings, onFail, onDone }: { rings: number; onFail: () => void; onDone: () => void }) {
  const [locked, setLocked] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const marker = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const lockedRef = useRef(0);
  const zone = useMemo(() => Array.from({ length: rings }, (_, i) => ({ center: (70 + i * 137) % 360, width: 62 - i * 10, speed: (150 + i * 55) * (i % 2 === 0 ? 1 : -1) })), [rings]);
  const current = zone[Math.min(locked, rings - 1)];

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const z = zone[Math.min(lockedRef.current, rings - 1)];
      angle.current = (angle.current + z.speed * dt + 360) % 360;
      if (marker.current) marker.current.style.transform = `rotate(${angle.current}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [zone, rings]);

  const lock = () => {
    audio.unlock();
    if (lockedRef.current >= rings) return;
    const diff = Math.abs(((angle.current - current.center + 540) % 360) - 180);
    if (diff <= current.width / 2) {
      lockedRef.current += 1;
      setLocked(lockedRef.current);
      setFlash("hit");
      audio.good(lockedRef.current);
      buzz(15);
      if (lockedRef.current >= rings) window.setTimeout(onDone, 450);
    } else {
      setFlash("miss");
      onFail();
    }
    window.setTimeout(() => setFlash(null), 350);
  };

  const r = 54;
  const arcLen = (current.width / 360) * 2 * Math.PI * r;
  return (
    <>
      <p className="finale__ask"><strong>Timing.</strong> Verrouillez quand le curseur traverse la zone. {rings} anneaux, de plus en plus rapides.</p>
      <div className="sync">
        <div className={`sync__dial ${flash ? `is-${flash}` : ""}`} data-testid="sync-dial" data-center={current.center} data-width={current.width}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r={r} className="sync__track" />
            <circle cx="60" cy="60" r={r} className="sync__zone" strokeDasharray={`${arcLen} 999`} transform={`rotate(${current.center - current.width / 2 - 90} 60 60)`} />
          </svg>
          <div className="sync__marker" ref={marker}><span /></div>
          <div className="sync__count">{locked}<small>/{rings}</small></div>
        </div>
        <button type="button" className="bigbtn" onPointerDown={lock} data-testid="sync-lock">Verrouiller</button>
      </div>
    </>
  );
}

/* ----- Manœuvre 4 : mot de passe (fragment 3) puis rétablissement ----- */
function RestoreStep({ answer, onFail, onDone }: { answer: string; onFail: () => void; onDone: () => void }) {
  const [word, setWord] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const submit = () => {
    if (word === answer) {
      setStatus("success");
      audio.good(5);
      burstBus.emit({ x: window.innerWidth / 2, y: window.innerHeight * 0.6, count: 30 });
    } else {
      setStatus("error");
      onFail();
      window.setTimeout(() => { setStatus("idle"); setWord(""); }, 700);
    }
  };
  if (status === "success") {
    return (
      <>
        <p className="finale__ask"><strong>Mot de passe accepté.</strong> Tout est prêt : maintenez pour rétablir les communications.</p>
        <HoldButton seconds={1.8} label="Rétablir les communications" hint="Maintenez appuyé" onDone={onDone} testId="restore" />
      </>
    );
  }
  return (
    <>
      <p className="finale__ask"><strong>Fragment 3.</strong> Saisissez le mot de passe déchiffré au verrou 03.</p>
      <Slots value={word} length={answer.length} state={status} />
      <LetterPad
        onLetter={(l) => status === "idle" && setWord((w) => (w.length < answer.length ? w + l : w))}
        onBack={() => status === "idle" && setWord((w) => w.slice(0, -1))}
        onSubmit={submit}
        canSubmit={word.length === answer.length && status === "idle"}
      />
    </>
  );
}
