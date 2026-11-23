/**
 * Protocole du salon coopératif.
 *
 * Tout passe par UN canal de diffusion par salon (« code-rouge-room-XXXX ») et UN seul type d'évènement
 * (« m ») : l'enveloppe ci-dessous. Chaque téléphone reçoit tout ; `to` sert à ignorer ce qui ne le concerne pas.
 * Le canal est public : le code de 4 lettres est la seule barrière (acceptable pour un prototype).
 */
export const PROTOCOL = 1;
export const CHANNEL_PREFIX = "code-rouge-room-";

/** Alphabet sans lettres ambiguës (I, L, O) : le code se dicte et se lit sans erreur. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";

export function makeCode(rng: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 4; i++) out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return out;
}

/** Accepte « abcd », « A B C D », « a-b-c-d » ; renvoie le code normalisé ou null. */
export function normalizeCode(raw: string): string | null {
  const s = raw.toUpperCase().replace(/[^A-Z]/g, "");
  if (s.length !== 4) return null;
  return [...s].every((c) => CODE_ALPHABET.includes(c)) ? s : null;
}

export interface Envelope {
  v: number;
  from: string;
  to?: string;
  t: string;
  p?: Record<string, unknown>;
  /** Numéro d'envoi propre à l'émetteur. */
  n: number;
}

export type MemberStatus = "online" | "away" | "lost" | "left";

export interface MemberView {
  id: string;
  name: string;
  slot: number;
  status: MemberStatus;
  /** Depuis combien de temps (ms) le statut actuel dure, à l'instant de l'envoi. */
  statusAgoMs: number;
  roles: string[];
  ready: boolean;
  isHost: boolean;
  /** Aller-retour mesuré entre ce téléphone et l'hôte (ms), null si inconnu. */
  rtt: number | null;
}

export type RoomPhase = "lobby" | "dealt" | "ready";

/* ---------- Test de liaison ---------- */
export interface PairStats { n: number; lost: number; min: number; med: number; p95: number; max: number; jitter: number }
export interface BurstStats { sent: number; got: number; lost: number; ooo: number; jitter: number; gapP95: number }
export interface DeviceInfo { ua: string; transport: string; connection: string; vibrate: boolean; ios: boolean; visible: boolean }
export interface LabResult {
  from: string;
  rtt: Record<string, PairStats>;
  burst: Record<string, BurstStats>;
  msgs: { sent: number; recv: number; seconds: number };
  device: DeviceInfo;
  notes: Record<string, string>;
}
export interface LabState {
  id: number;
  status: "running" | "done";
  expected: string[];
  results: LabResult[];
}

export interface RoomSnapshot {
  v: number;
  code: string;
  /** Identifie une « vie » du salon : si l'hôte repart de zéro, les révisions repartent de 1 sans être ignorées. */
  epoch: number;
  rev: number;
  hostId: string;
  phase: RoomPhase;
  dealId: number;
  maxPlayers: number;
  members: MemberView[];
  lab: LabState | null;
}
