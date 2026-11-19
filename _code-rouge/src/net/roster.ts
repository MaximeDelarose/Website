import type { LabState, MemberStatus, MemberView, RoomPhase, RoomSnapshot } from "./protocol";
import { PROTOCOL } from "./protocol";
import { dealRoles } from "./roles";

/**
 * État du salon tenu par l'HÔTE (source de vérité). Fonctions pures : l'heure est toujours fournie,
 * ce qui permet de tester déconnexions, verrouillage d'écran et reprises sans attendre.
 */
export interface HostMember {
  id: string;
  name: string;
  slot: number;
  joinedAt: number;
  lastSeen: number;
  /** Le téléphone a signalé qu'il passe en arrière-plan (écran verrouillé, autre application). */
  hidden: boolean;
  left: boolean;
  roles: string[];
  ready: boolean;
  statusSince: number;
  rtt: number | null;
}

export interface HostState {
  code: string;
  hostId: string;
  rev: number;
  phase: RoomPhase;
  dealId: number;
  maxPlayers: number;
  createdAt: number;
  members: HostMember[];
  lab: LabState | null;
}

export interface RosterCfg { lostAfterMs: number; rejoinWindowMs: number }

export function createHostState(code: string, hostId: string, hostName: string, maxPlayers: number, now: number): HostState {
  return {
    code, hostId, rev: 1, phase: "lobby", dealId: 0, maxPlayers, createdAt: now, lab: null,
    members: [{ id: hostId, name: cleanName(hostName), slot: 0, joinedAt: now, lastSeen: now, hidden: false, left: false, roles: [], ready: false, statusSince: now, rtt: null }],
  };
}

export function cleanName(raw: string): string {
  const s = raw.replace(/\s+/g, " ").trim().slice(0, 14);
  return s || "Agent";
}

export function statusOf(m: HostMember, now: number, cfg: RosterCfg): MemberStatus {
  if (m.left) return "left";
  if (now - m.lastSeen > cfg.lostAfterMs) return "lost";
  if (m.hidden) return "away";
  return "online";
}

/** Une place est libre si son occupant est parti, ou silencieux depuis plus que la fenêtre de reprise. */
function holdsSlot(m: HostMember, now: number, cfg: RosterCfg): boolean {
  return !m.left && now - m.lastSeen <= cfg.rejoinWindowMs;
}

export type JoinResult = "joined" | "rejoined" | "full";

export function joinMember(state: HostState, who: { id: string; name: string }, now: number, cfg: RosterCfg): { state: HostState; result: JoinResult } {
  const existing = state.members.find((m) => m.id === who.id);
  if (existing) {
    const members = state.members.map((m) => (m.id === who.id ? { ...m, left: false, hidden: false, lastSeen: now, statusSince: now, name: cleanName(who.name) || m.name } : m));
    return { state: { ...state, rev: state.rev + 1, members }, result: "rejoined" };
  }
  const holders = state.members.filter((m) => holdsSlot(m, now, cfg));
  if (holders.length >= state.maxPlayers) return { state, result: "full" };
  const taken = new Set(holders.map((m) => m.slot));
  let slot = 0;
  while (taken.has(slot)) slot++;
  // Un nom déjà pris reçoit un numéro : « Léa », « Léa 2 ».
  const base = cleanName(who.name);
  const names = new Set(state.members.filter((m) => !m.left).map((m) => m.name));
  let name = base;
  for (let i = 2; names.has(name); i++) name = `${base.slice(0, 12)} ${i}`;
  const members = state.members.filter((m) => holdsSlot(m, now, cfg) || m.id === state.hostId);
  members.push({ id: who.id, name, slot, joinedAt: now, lastSeen: now, hidden: false, left: false, roles: [], ready: false, statusSince: now, rtt: null });
  return { state: { ...state, rev: state.rev + 1, members }, result: "joined" };
}

export function heartbeat(state: HostState, id: string, now: number, hidden: boolean, rtt?: number | null): HostState {
  const m = state.members.find((x) => x.id === id);
  if (!m || m.left) return state;
  const changed = m.hidden !== hidden;
  if (!changed) { m.lastSeen = now; if (typeof rtt === "number") m.rtt = rtt; return state; }   // pas de nouvelle révision : simple signe de vie
  return { ...state, rev: state.rev + 1, members: state.members.map((x) => (x.id === id ? { ...x, lastSeen: now, hidden, statusSince: now } : x)) };
}

export function leaveMember(state: HostState, id: string, now: number): HostState {
  if (id === state.hostId) return state;
  return { ...state, rev: state.rev + 1, members: state.members.map((m) => (m.id === id ? { ...m, left: true, ready: false, roles: m.roles, statusSince: now } : m)) };
}

export function kickMember(state: HostState, id: string): HostState {
  if (id === state.hostId) return state;
  return { ...state, rev: state.rev + 1, members: state.members.filter((m) => m.id !== id) };
}

export function renameMember(state: HostState, id: string, name: string): HostState {
  return { ...state, rev: state.rev + 1, members: state.members.map((m) => (m.id === id ? { ...m, name: cleanName(name) } : m)) };
}

export function setReady(state: HostState, id: string, ready: boolean): HostState {
  if (state.phase === "lobby") return state;
  return { ...state, rev: state.rev + 1, members: state.members.map((m) => (m.id === id ? { ...m, ready } : m)) };
}

/** Joueurs actuellement dans le salon (ni partis, ni perdus de vue depuis trop longtemps). */
export function activeMembers(state: HostState, now: number, cfg: RosterCfg): HostMember[] {
  return state.members.filter((m) => holdsSlot(m, now, cfg) && statusOf(m, now, cfg) !== "left");
}

export function deal(state: HostState, roleIds: string[], seed: number, now: number, cfg: RosterCfg): HostState {
  const players = activeMembers(state, now, cfg);
  const roles = dealRoles(players.map((m) => m.id), roleIds, seed);
  return {
    ...state, rev: state.rev + 1, phase: "dealt", dealId: state.dealId + 1,
    members: state.members.map((m) => ({ ...m, roles: roles[m.id] ?? [], ready: false })),
  };
}

/** Passe en « ready » quand tous les joueurs présents ont confirmé ; revient en « dealt » si l'un se retire. */
export function settlePhase(state: HostState, now: number, cfg: RosterCfg): HostState {
  if (state.phase === "lobby") return state;
  const players = activeMembers(state, now, cfg);
  const all = players.length >= 2 && players.every((m) => m.ready);
  const phase: RoomPhase = all ? "ready" : "dealt";
  return phase === state.phase ? state : { ...state, rev: state.rev + 1, phase };
}

export function snapshot(state: HostState, now: number, cfg: RosterCfg): RoomSnapshot {
  const members: MemberView[] = state.members
    .filter((m) => holdsSlot(m, now, cfg) || m.id === state.hostId)
    .sort((a, b) => a.slot - b.slot)
    .map((m) => ({
      id: m.id, name: m.name, slot: m.slot, status: statusOf(m, now, cfg), statusAgoMs: Math.max(0, now - m.statusSince),
      roles: m.roles, ready: m.ready, isHost: m.id === state.hostId, rtt: m.rtt,
    }));
  return { v: PROTOCOL, code: state.code, epoch: state.createdAt, rev: state.rev, hostId: state.hostId, phase: state.phase, dealId: state.dealId, maxPlayers: state.maxPlayers, members, lab: state.lab };
}

/** Empreinte des statuts : si elle change entre deux ticks, l'hôte rediffuse l'état. */
export function statusKey(state: HostState, now: number, cfg: RosterCfg): string {
  return state.members.map((m) => `${m.id}:${statusOf(m, now, cfg)}`).join("|");
}
