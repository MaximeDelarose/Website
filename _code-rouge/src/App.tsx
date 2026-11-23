import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Backdrop } from "./components/Backdrop";
import { Hud } from "./components/Hud";
import { STAGE_ORDER } from "./engine/state";
import { useGame } from "./game";
import { Briefing } from "./screens/Briefing";
import { End } from "./screens/End";
import { Home } from "./screens/Home";
import { StageDone } from "./screens/StageDone";
import { StageIntro } from "./screens/StageIntro";
import { TeamSetup } from "./screens/TeamSetup";
import { Victory } from "./screens/Victory";
import { audio } from "./services/audio";
import { useRoute } from "./route";
// Le mode coopératif est chargé à la demande : le jeu solo ne télécharge rien de plus.
const RoomApp = lazy(() => import("./screens/room/RoomApp").then((m) => ({ default: m.RoomApp })));
import { CipherStage } from "./stages/CipherStage";
import { DeductionStage } from "./stages/DeductionStage";
import { FinaleStage } from "./stages/FinaleStage";
import { MemoryStage } from "./stages/MemoryStage";

const STAGES = { memory: MemoryStage, deduction: DeductionStage, cipher: CipherStage, finale: FinaleStage };

export function App() {
  const { state, config, resumePending } = useGame();
  const route = useRoute();
  const inRoom = route.kind === "room";
  const phase = resumePending && state.phase !== "end" ? "home" : state.phase;
  const stageId = STAGE_ORDER[Math.min(state.stageIndex, STAGE_ORDER.length - 1)];

  // Couleurs de la configuration → variables CSS.
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(config.theme).forEach(([k, v]) => root.style.setProperty(`--${k}`, v));
  }, [config.theme]);

  // Ambiance sonore selon le moment du jeu.
  useEffect(() => {
    const win = state.outcome === "success";
    if (phase === "home" || phase === "team") audio.setAmbient("calm");
    else if (phase === "victory" || (phase === "end" && win)) audio.setAmbient("bright");
    else if (phase === "end") audio.setAmbient("off");
    else if (phase === "stage" && stageId === "finale") audio.setAmbient("tense");
    else audio.setAmbient("calm");
  }, [phase, stageId, state.outcome]);

  // Premier geste : déverrouille l'audio (iOS).
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, { passive: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  let screen: ReactNode;
  let key: string = phase;
  if (phase === "home") screen = <Home />;
  else if (phase === "team") screen = <TeamSetup />;
  else if (phase === "briefing") screen = <Briefing />;
  else if (phase === "stageIntro") { screen = <StageIntro />; key = `intro-${state.stageIndex}`; }
  else if (phase === "stage") { const Stage = STAGES[stageId]; screen = <Stage />; key = `stage-${state.stageIndex}`; }
  else if (phase === "stageDone") { screen = <StageDone />; key = `done-${state.stageIndex}`; }
  else if (phase === "victory") screen = <Victory />;
  else screen = <End />;

  const showHud = !inRoom && (phase === "stageIntro" || phase === "stage" || phase === "stageDone");
  const mood = inRoom ? "coop" : phase === "victory" || (phase === "end" && state.outcome === "success") ? "stable" : phase === "stage" ? "focus" : "alert";

  return (
    <>
      <Backdrop mood={mood} />
      <div className="rotate" role="alert">Tournez l'appareil à la verticale pour poursuivre la mission</div>
      <div id="app-shell" className={`shell phase-${phase}`} onAnimationEnd={(e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove("shake-soft", "shake-hard"); }}>
        {showHud && <Hud />}
        <div className="shell__view" key={inRoom ? "room" : key}>{inRoom ? <Suspense fallback={<div className="screen" />}><RoomApp /></Suspense> : screen}</div>
      </div>
    </>
  );
}
