import { useEffect, useRef, useState } from "react";
import { Constellation, memberColor, roleOf } from "../../components/coop/Constellation";
import { RoleEmblem } from "../../components/coop/RoleEmblem";
import { CodeTiles } from "../../components/coop/CodeTiles";
import { Sparks } from "../../components/coop/Sparks";
import { Icon } from "../../components/Icons";
import { Button } from "../../components/ui";
import { gameConfig } from "../../config/game.config";
import { haptic } from "../../net/haptics";
import type { MemberView } from "../../net/protocol";
import { room } from "../../net/room";
import type { RoomSession, ViewState } from "../../net/session";
import { roomLink } from "../../route";
import { audio } from "../../services/audio";
import { LinkLab } from "./LinkLab";
import { RoleReveal } from "./RoleReveal";

const STATUS_TEXT: Record<string, string> = { online: "En ligne", away: "En arrière-plan", lost: "Connexion perdue", left: "Parti" };
const seenKey = (code: string) => `code-rouge/net/seen-${code}`;
const readSeen = (code: string) => { try { return Number(sessionStorage.getItem(seenKey(code)) ?? 0); } catch { return 0; } };
const writeSeen = (code: string, n: number) => { try { sessionStorage.setItem(seenKey(code), String(n)); } catch { /* rien */ } };

function ago(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min`;
}

/** Salle d'équipe : constellation, rôles, confirmation « prêt », test de liaison. */
export function Lobby({ session, view }: { session: RoomSession; view: ViewState }) {
  const snap = view.snapshot!;
  const me = snap.members.find((m) => m.id === view.meId) as MemberView;
  const [tab, setTab] = useState<"team" | "lab">("team");
  const [reveal, setReveal] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const prevCount = useRef(snap.members.filter((m) => m.status !== "left").length);
  const prevPhase = useRef(snap.phase);
  const prevStatus = useRef(new Map(snap.members.map((m) => [m.id, m.status])));
  const online = snap.members.filter((m) => m.status === "online");

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Rôles distribués : tout le monde joue la révélation (une seule fois par distribution).
  useEffect(() => {
    if (snap.dealId > 0 && snap.dealId > readSeen(snap.code) && me?.roles.length) setReveal(true);
  }, [snap.dealId, snap.code, me?.roles.length]);

  // Le test démarre chez tout le monde : on bascule sur l'onglet Liaison.
  useEffect(() => { if (snap.lab?.status === "running") setTab("lab"); }, [snap.lab?.id, snap.lab?.status]);

  // Retours sonores et haptiques : arrivée d'un coéquipier, départ, salle prête.
  useEffect(() => {
    const count = snap.members.filter((m) => m.status !== "left").length;
    if (count > prevCount.current) { audio.join(); haptic("tick"); }
    prevCount.current = count;
    snap.members.forEach((m) => {
      const before = prevStatus.current.get(m.id);
      if (before && before === "online" && (m.status === "lost" || m.status === "away") && m.id !== view.meId) audio.drop();
      prevStatus.current.set(m.id, m.status);
    });
    if (snap.phase === "ready" && prevPhase.current !== "ready") { audio.chord(); haptic("success"); }
    prevPhase.current = snap.phase;
  }, [snap, view.meId]);

  const dismissReveal = () => { writeSeen(snap.code, snap.dealId); setReveal(false); audio.tap(); };
  const link = roomLink(snap.code);
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(link); } catch { /* rien */ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: gameConfig.brand.gameTitle, text: `Rejoins mon équipe CODE ROUGE (salon ${snap.code})`, url: link }); else await copyLink(); } catch { /* annulé */ }
  };

  const rtt = view.isHost ? null : view.rttHost;
  const quality = view.link !== "open" ? "down" : rtt === null ? "idle" : rtt < 200 ? "good" : rtt < 400 ? "ok" : "bad";
  const canDeal = view.isHost && online.length >= gameConfig.coop.minPlayers;
  const waiting = snap.maxPlayers - snap.members.filter((m) => m.status !== "left").length;

  const full = waiting <= 0;
  const compactCode = snap.phase !== "lobby" || full;

  return (
    <main className="screen lobby" data-testid="lobby" data-phase={snap.phase}>
      <header className="lobby__bar">
        <button type="button" className={`link lobby__leave ${confirmLeave ? "is-confirm" : ""}`} onClick={() => { if (confirmLeave) { room.leave(); } else { setConfirmLeave(true); setTimeout(() => setConfirmLeave(false), 3000); } }} data-testid="room-leave">
          {confirmLeave ? "Confirmer : quitter" : "‹ Quitter"}
        </button>
        <span className={`pill pill--${quality}`} data-testid="link-pill"><i />{view.link !== "open" ? "Reconnexion…" : view.isHost ? "Hôte" : rtt === null ? "Liaison…" : `${rtt} ms`}</span>
      </header>

      <div className="lobby__scroll">
        {view.hostLost && <p className="banner banner--bad" role="alert" data-testid="host-lost">L'hôte ne répond plus. La partie est en pause ; la reconnexion est automatique.</p>}
        {!view.hostLost && view.link !== "open" && <p className="banner banner--warn" role="status">Liaison interrompue… reconnexion en cours. Vous ne perdez rien.</p>}

        {compactCode ? (
          <section className="codebar">
            <div><p className="kicker">Salon</p><CodeTiles code={snap.code} small /></div>
            <button type="button" className="chipbtn" onClick={copyLink} data-testid="copy-link"><Icon name="share" size={18} />{copied ? "Copié ✓" : "Lien"}</button>
          </section>
        ) : (
          <section className="lobby__code">
            <p className="kicker">Code du salon</p>
            <CodeTiles code={snap.code} />
            <div className="lobby__share">
              <button type="button" className="chipbtn" onClick={copyLink} data-testid="copy-link"><Icon name="share" size={18} />{copied ? "Lien copié ✓" : "Copier le lien"}</button>
              <button type="button" className="chipbtn" onClick={share}><Icon name="users" size={18} />Inviter</button>
            </div>
          </section>
        )}

        <div className="lobby__stage">
          <Constellation members={snap.members} maxPlayers={snap.maxPlayers} meId={view.meId} pulses={view.pulses} phase={snap.phase} senderId={view.labProgress?.label === "burst" ? view.labProgress.senderId : null} compact={tab === "lab"} />
          {snap.phase === "ready" && <Sparks key={snap.dealId} color="#3fe6ff" count={70} power={1.2} origin={[0.5, 0.5]} />}
        </div>

        <div className="tabs tabs--two" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "team"} className={`tab ${tab === "team" ? "is-on" : ""}`} onClick={() => { audio.flip(); setTab("team"); }} data-testid="tab-team"><Icon name="users" size={20} /><span>Équipe</span></button>
          <button type="button" role="tab" aria-selected={tab === "lab"} className={`tab ${tab === "lab" ? "is-on" : ""}`} onClick={() => { audio.flip(); setTab("lab"); }} data-testid="tab-link"><Icon name="wheel" size={20} /><span>Liaison</span></button>
        </div>

        {tab === "team" ? (
          <>
            {snap.phase !== "lobby" && me?.roles.length > 0 && !reveal && (
              <button type="button" className="myrole" style={{ ["--c" as string]: memberColor(me) }} onClick={() => setReveal(true)} data-testid="my-role">
                <RoleEmblem id={me.roles[0]} />
                <span>Votre rôle : <b>{me.roles.map((r) => roleOf(r)?.name).join(" + ")}</b></span>
              </button>
            )}
            <ul className="roster" data-testid="roster">
              {snap.members.filter((m) => m.status !== "left").map((m) => (
                <li key={m.id} className={`member member--${m.status}`} style={{ ["--c" as string]: memberColor(m) }} data-testid="member" data-status={m.status} data-name={m.name}>
                  <span className="member__dot">{m.name.charAt(0).toUpperCase()}</span>
                  <span className="member__main">
                    <span className="member__name">{m.name}{m.id === view.meId && <em>vous</em>}{m.isHost && <em>hôte</em>}</span>
                    <span className="member__status">
                      {STATUS_TEXT[m.status]}{m.status !== "online" && ` · depuis ${ago(m.statusAgoMs + Math.max(0, now - view.receivedAt))}`}
                      {m.status === "online" && m.rtt !== null && !m.isHost && ` · ${m.rtt} ms`}
                    </span>
                  </span>
                  <span className="member__roles">
                    {m.roles.map((r) => <span key={r} className="rolechip" style={{ ["--c" as string]: roleOf(r)?.color }}><RoleEmblem id={r} />{roleOf(r)?.name}</span>)}
                    {m.ready && <span className="member__ok" aria-label="Prêt"><Icon name="check" size={18} /></span>}
                  </span>
                  {view.isHost && m.id !== view.meId && (m.status === "lost" || m.status === "away") && (
                    <button type="button" className="iconbtn member__kick" aria-label={`Retirer ${m.name}`} onClick={() => session.kick(m.id)}><Icon name="close" size={16} /></button>
                  )}
                </li>
              ))}
              {waiting > 0 && snap.phase === "lobby" && <li className="member member--empty"><span className="member__dot">+</span><span className="member__main"><span className="member__name">{waiting} place{waiting > 1 ? "s" : ""} libre{waiting > 1 ? "s" : ""}</span><span className="member__status">Partagez le code ou le lien</span></span></li>}
            </ul>
            {view.isHost && snap.phase !== "lobby" && (
              <button type="button" className="link" onClick={() => session.dealRoles()} data-testid="redeal">Redistribuer les rôles</button>
            )}
          </>
        ) : (
          <LinkLab session={session} view={view} snap={snap} />
        )}
      </div>

      {tab === "team" && (
        <footer className="lobby__foot">
          {snap.phase === "lobby" && (view.isHost ? (
            <>
              <Button block iconRight="arrow" disabled={!canDeal} onClick={() => session.dealRoles()} data-testid="deal">Distribuer les rôles</Button>
              {!canDeal && <p className="note">Il faut au moins {gameConfig.coop.minPlayers} téléphones en ligne.</p>}
            </>
          ) : <p className="note note--strong">En attente de l'hôte…</p>)}
          {snap.phase === "dealt" && (
            <Button block variant={me?.ready ? "ghost" : "primary"} icon={me?.ready ? "check" : undefined} onClick={() => { session.setReady(!me?.ready); haptic("tick"); }} data-testid="ready">
              {me?.ready ? "Prêt · annuler" : "Je suis prêt"}
            </Button>
          )}
          {snap.phase === "ready" && (
            <>
              <p className="readybanner" data-testid="room-ready">Salle prête : toute l'équipe est en place</p>
              <Button block disabled data-testid="launch">Première épreuve · bientôt</Button>
            </>
          )}
        </footer>
      )}

      {reveal && me?.roles.length > 0 && <RoleReveal roleIds={me.roles} onDone={dismissReveal} />}
    </main>
  );
}
