import { useMemo } from "react";
import { gameConfig } from "../../config/game.config";
import { CoreOrb } from "../CoreOrb";
import type { MemberView, RoomPhase } from "../../net/protocol";
import type { Pulse } from "../../net/session";

const W = 320, H = 292, CX = 160, CY = 146, R = 98;
const roles = gameConfig.coop.roles;

export const roleOf = (id: string) => roles.find((r) => r.id === id);
export function memberColor(m: MemberView): string { return (m.roles[0] && roleOf(m.roles[0])?.color) || "var(--cyan)"; }

function slotPos(slot: number, max: number) {
  const a = ((-90 + (slot * 360) / max) * Math.PI) / 180;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}

const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = (i * 5 * Math.PI) / 180, long = i % 6 === 0, r1 = 134, r2 = long ? 126 : 130;
  return `M${(CX + r1 * Math.cos(a)).toFixed(1)} ${(CY + r1 * Math.sin(a)).toFixed(1)}L${(CX + r2 * Math.cos(a)).toFixed(1)} ${(CY + r2 * Math.sin(a)).toFixed(1)}`;
}).join("");

const control = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: CX + ((a.x + b.x) / 2 - CX) * 0.2, y: CY + ((a.y + b.y) / 2 - CY) * 0.2 });

export interface ConstellationProps {
  members: MemberView[];
  maxPlayers: number;
  meId: string;
  pulses: Pulse[];
  phase: RoomPhase;
  /** Pendant une rafale du test de liaison : le téléphone qui émet est mis en avant. */
  senderId?: string | null;
  compact?: boolean;
}

/**
 * La constellation d'équipe : chaque téléphone est une perle de verre en orbite autour du noyau,
 * reliée aux autres par des fils de lumière dont l'éclat dit la qualité de la liaison.
 * Une impulsion lumineuse court sur le fil à chaque échange entre deux téléphones.
 */
export function Constellation({ members, maxPlayers, meId, pulses, phase, senderId, compact }: ConstellationProps) {
  const pos = useMemo(() => new Map(members.map((m) => [m.id, slotPos(m.slot, maxPlayers)])), [members, maxPlayers]);
  const present = members.filter((m) => m.status !== "left");
  const free = Array.from({ length: maxPlayers }, (_, s) => s).filter((s) => !members.some((m) => m.slot === s && m.status !== "left"));
  const readyCount = members.filter((m) => m.ready).length;
  const unlocked = phase === "ready" ? 4 : Math.min(3, readyCount);
  const anyLost = members.some((m) => m.status === "lost");
  const edges: { a: MemberView; b: MemberView }[] = [];
  present.forEach((a, i) => present.slice(i + 1).forEach((b) => edges.push({ a, b })));

  return (
    <div className={`const ${compact ? "const--compact" : ""} ${phase === "ready" ? "is-ready" : ""}`} data-testid="constellation" data-phase={phase}>
      <div className="const__core"><CoreOrb unlocked={unlocked} active={phase === "ready" ? -1 : unlocked} mood={phase === "ready" ? "stable" : anyLost ? "critical" : "alert"} /></div>
      <svg className="const__svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Équipe">
        <defs>
          <radialGradient id="bead-glass" cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="38%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <path d={TICKS} className="const__ticks" />
        <circle cx={CX} cy={CY} r={R} className="const__orbit" />
        <circle cx={CX} cy={CY} r={R + 24} className="const__orbit const__orbit--dash" />

        {edges.map(({ a, b }) => {
          const pa = pos.get(a.id)!, pb = pos.get(b.id)!, c = control(pa, pb);
          const down = a.status !== "online" || b.status !== "online";
          const est = (a.rtt ?? 0) + (b.rtt ?? 0);
          const q = down ? "down" : a.rtt === null && b.rtt === null && !a.isHost && !b.isHost ? "idle" : est < 200 ? "good" : est < 400 ? "ok" : "bad";
          return <path key={`${a.id}-${b.id}`} d={`M${pa.x} ${pa.y}Q${c.x} ${c.y} ${pb.x} ${pb.y}`} className={`fil fil--${q}`} />;
        })}

        {free.map((s) => { const p = slotPos(s, maxPlayers); return (
          <g key={`free${s}`} transform={`translate(${p.x} ${p.y})`} className="slot-free">
            <circle r="27" className="slot-free__ring" />
            <path d="M-7 0h14M0 -7v14" className="slot-free__plus" />
          </g>
        ); })}

        {members.filter((m) => m.status !== "left").map((m) => {
          const p = pos.get(m.id)!;
          const color = memberColor(m);
          const role = m.roles.length ? m.roles.map((r) => roleOf(r)?.name).filter(Boolean).join(" + ") : "";
          return (
            <g key={m.id} transform={`translate(${p.x} ${p.y})`} className={`bead bead--${m.status} ${m.id === meId ? "is-me" : ""} ${senderId === m.id ? "is-sender" : ""}`} style={{ ["--c" as string]: color }} data-testid={`bead-${m.slot}`} data-status={m.status}>
              <g className="bead__pop">
                <circle r="44" className="bead__halo" />
                <circle r="27" className="bead__body" />
                <circle r="27" fill="url(#bead-glass)" />
                <circle r="27" className="bead__ring" />
                <text className="bead__init" y="1" textAnchor="middle" dominantBaseline="central">{m.name.charAt(0).toUpperCase()}</text>
                {m.isHost && <path d="M-9 -34 -5 -41 0 -35 5 -41 9 -34Z" className="bead__crown" />}
                {m.ready && <g transform="translate(20 -20)"><circle r="9.5" className="bead__ready" /><path d="M-4.200 0.300 -1.300 3.200 4.400 -2.800" className="bead__tick" /></g>}
                {m.status === "away" && <g transform="translate(20 -20)"><circle r="9.5" className="bead__badge bead__badge--away" /><path d="M2 -4a5 5 0 1 0 2 8 4 4 0 0 1-2-8Z" className="bead__moon" /></g>}
                {m.status === "lost" && <g transform="translate(20 -20)"><circle r="9.5" className="bead__badge bead__badge--lost" /><path d="M0 -4v5M0 4v.1" className="bead__bang" /></g>}
              </g>
              <text className="bead__name" y="49" textAnchor="middle">{m.name}</text>
              {role && <text className="bead__role" y="64" textAnchor="middle">{role}</text>}
            </g>
          );
        })}

        {pulses.map((pl) => {
          const a = pos.get(pl.from), b = pos.get(pl.to);
          if (!a || !b) return null;
          const c = control(a, b);
          return <circle key={pl.id} r="3.6" className="pulse"><animateMotion dur="0.7s" fill="freeze" path={`M${a.x} ${a.y}Q${c.x} ${c.y} ${b.x} ${b.y}`} /></circle>;
        })}
      </svg>
      {phase === "ready" && <><span className="const__wave" /><span className="const__wave const__wave--2" /></>}
    </div>
  );
}
