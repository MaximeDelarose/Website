import { useState } from "react";
import { Button } from "../../components/ui";
import { buildReport, NOTE_LABELS, summarizeLab, VERDICT_TEXT } from "../../net/labSummary";
import { haptic, hapticCapabilities } from "../../net/haptics";
import { labDurationMs } from "../../net/lab";
import type { RoomSnapshot } from "../../net/protocol";
import type { RoomSession, ViewState } from "../../net/session";
import type { Verdict } from "../../net/stats";
import { audio } from "../../services/audio";

const VERDICT_LABEL: Record<Verdict, string> = { excellent: "Excellente", good: "Bonne", limit: "Limite", bad: "Insuffisante" };

/** Onglet « Liaison » : mesure réelle entre les téléphones de l'équipe, rapport, tests de sensations, journal. */
export function LinkLab({ session, view, snap }: { session: RoomSession; view: ViewState; snap: RoomSnapshot }) {
  const [copied, setCopied] = useState(false);
  const [localAsk, setLocalAsk] = useState(false);
  const name = (id: string | null | undefined) => snap.members.find((m) => m.id === id)?.name ?? "—";
  const sum = summarizeLab(snap);
  const running = snap.lab?.status === "running" || view.labProgress !== null;
  const prog = view.labProgress;
  const online = snap.members.filter((m) => m.status === "online").length;
  const caps = hapticCapabilities();
  const duration = Math.round(labDurationMs(Math.max(2, online)) / 1000);

  const copy = async () => {
    const text = buildReport(snap, view.log, view.transportKind);
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch { /* rien */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="lab" data-testid="lab">
      {!running && !sum && (
        <div className="panel lab__intro">
          <p className="kicker">Mesure réelle</p>
          <p className="lab__text">Avant de jouer, on vérifie que vos téléphones se parlent assez vite. Le test dure environ {duration} secondes et ne demande rien : gardez simplement l'écran allumé.</p>
          {view.isHost ? (
            <Button block icon="replay" disabled={online < 2} onClick={() => session.startLab()} data-testid="lab-start">Lancer le test de liaison</Button>
          ) : (
            <p className="note">L'hôte lance le test : il démarrera tout seul sur votre téléphone.</p>
          )}
          {view.isHost && online < 2 && <p className="note">Il faut au moins 2 téléphones en ligne.</p>}
        </div>
      )}

      {running && (
        <div className="panel lab__run" data-testid="lab-running">
          <p className="kicker"><span className="dot" />Test en cours</p>
          <p className="lab__phase">
            {prog?.label === "burst" && prog.senderId ? `${name(prog.senderId)} émet une rafale…` : prog?.label === "wrap" ? "Bilan…" : "Allers-retours entre les téléphones…"}
          </p>
          <div className="bar"><div className="bar__fill bar__fill--static" style={{ transform: `scaleX(${prog?.fraction ?? 0})` }} /></div>
          <p className="note">Gardez l'écran allumé jusqu'à la fin.</p>
        </div>
      )}

      {sum && !running && (
        <>
          <div className={`verdict verdict--${sum.overall}`} data-testid="lab-verdict" data-verdict={sum.overall}>
            <p className="verdict__tag">{VERDICT_LABEL[sum.overall]}</p>
            <h2 className="verdict__title">{VERDICT_TEXT[sum.overall].title}</h2>
            <p className="verdict__text">{VERDICT_TEXT[sum.overall].text}</p>
          </div>

          <section className="panel lab__sec">
            <h3 className="lab__h">Allers-retours</h3>
            {sum.pairs.map((p) => (
              <div key={p.a + p.b} className="row" data-testid="lab-pair">
                <span className={`led led--${p.verdict}`} />
                <span className="row__main"><span>{name(p.a)} <i>↔</i> {name(p.b)}</span></span>
                <span className="row__val"><b>{p.med}</b> ms<small>p95 {p.p95} · {p.lost} perdu{p.lost > 1 ? "s" : ""}</small></span>
              </div>
            ))}
          </section>

          <section className="panel lab__sec">
            <h3 className="lab__h">Rafales à 20 messages/s</h3>
            {sum.bursts.map((b) => (
              <div key={b.from + b.to} className="row">
                <span className={`led led--${b.got === b.sent ? "excellent" : b.got / b.sent > 0.95 ? "good" : "bad"}`} />
                <span className="row__main"><span>{name(b.from)} <i>→</i> {name(b.to)}</span></span>
                <span className="row__val"><b>{b.got}</b>/{b.sent}<small>gigue {b.jitter} ms · désordre {b.ooo}</small></span>
              </div>
            ))}
          </section>

          <section className="panel lab__sec">
            <h3 className="lab__h">Appareils et débit</h3>
            {sum.devices.map((d) => (
              <div key={d.id} className="row row--tall">
                <span className="row__main">{d.name}<small>{d.label} · vibration {d.vibrate ? "oui" : "non"}</small></span>
                <span className="row__val"><b>{d.sentPerSec}</b>/s<small>{d.recvPerSec}/s reçus</small></span>
              </div>
            ))}
            <p className="note">Le projet partagé accepte 100 messages/s au total : l'équipe en utilise quelques dizaines.</p>
          </section>

          <section className="panel lab__sec" data-testid="lab-feel">
            <h3 className="lab__h">Sensations</h3>
            <p className="lab__text">Essayez, puis répondez honnêtement : c'est ce qui décidera des effets que le jeu peut promettre.</p>
            <div className="lab__btns">
              <Button variant="ghost" onClick={() => { haptic("success"); setLocalAsk(true); }} silent data-testid="feel-local">Ma vibration</Button>
              <Button variant="ghost" onClick={() => session.sendProbe("haptic")} data-testid="feel-send-haptic">Vibration aux autres</Button>
              <Button variant="ghost" onClick={() => session.sendProbe("sound")} data-testid="feel-send-sound">Son aux autres</Button>
            </div>
            {!caps.vibrate && <p className="note">Ce navigateur n'expose pas l'API vibration{caps.ios ? " (iPhone : on tente l'astuce du commutateur, uniquement sous le doigt)." : "."}</p>}
            {localAsk && (
              <div className="ask" data-testid="ask-local">
                <p>Avez-vous senti une vibration ?</p>
                <div className="ask__btns">
                  <Button variant="primary" onClick={() => { session.note("local-haptic", "oui"); setLocalAsk(false); }}>Oui</Button>
                  <Button variant="ghost" onClick={() => { session.note("local-haptic", "non"); setLocalAsk(false); }}>Non</Button>
                </div>
              </div>
            )}
            {view.probe && (
              <div className="ask ask--remote" data-testid="ask-remote">
                <p>{name(view.probe.from)} vous a envoyé {view.probe.kind === "sound" ? "un son" : "une vibration"}. {view.probe.kind === "sound" ? "L'avez-vous entendu ?" : "L'avez-vous sentie ?"}</p>
                <div className="ask__btns">
                  <Button variant="primary" onClick={() => session.note(`remote-${view.probe!.kind}`, "oui")} data-testid="ask-yes">Oui</Button>
                  <Button variant="ghost" onClick={() => session.note(`remote-${view.probe!.kind}`, "non")} data-testid="ask-no">Non</Button>
                </div>
              </div>
            )}
            {sum.devices.some((d) => Object.keys(d.notes).length) && (
              <ul className="lab__notes">
                {sum.devices.filter((d) => Object.keys(d.notes).length).map((d) => (
                  <li key={d.id}><b>{d.name}</b> — {Object.entries(d.notes).map(([k, v]) => `${NOTE_LABELS[k] ?? k} : ${v}`).join(" · ")}</li>
                ))}
              </ul>
            )}
          </section>

          <div className="lab__actions">
            <Button block icon="share" onClick={copy} data-testid="lab-copy">{copied ? "Rapport copié ✓" : "Copier le rapport"}</Button>
            {view.isHost && <Button block variant="ghost" icon="replay" onClick={() => session.startLab()} data-testid="lab-again">Relancer le test</Button>}
          </div>
        </>
      )}

      <section className="panel lab__sec lab__lock">
        <h3 className="lab__h">Test de verrouillage</h3>
        <ol className="steps">
          <li>Verrouillez votre téléphone pendant 15 secondes.</li>
          <li>Les autres voient votre perle passer en « arrière-plan », puis « connexion perdue ».</li>
          <li>Rallumez-le : il se reconnecte et retrouve son rôle, sans rien perdre.</li>
        </ol>
        <h3 className="lab__h">Journal de cet appareil</h3>
        <ul className="log" data-testid="lab-log">
          {view.log.length === 0 && <li className="log__empty">Rien pour l'instant.</li>}
          {[...view.log].reverse().slice(0, 10).map((l, i) => (
            <li key={i} className={`log__${l.kind}`}><time>{new Date(l.at).toLocaleTimeString("fr-FR")}</time> {l.text}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export { audio };
