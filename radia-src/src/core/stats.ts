/**
 * Statistiques de jeu partagées avec le créateur — UNIQUEMENT si Radia a accepté (jamais de collecte cachée, aucune donnée de jeu envoyée).
 * Envoyé : un identifiant ALÉATOIRE d'appareil, le type d'accès (application installée / navigateur), le fuseau horaire, l'heure d'ouverture,
 * l'heure de dernière activité et le temps de jeu ACTIF estimé. Jamais : messages, conversations, position, contenu de la partie.
 * Elle peut arrêter, voir ses données et les supprimer à tout moment (Réglages). Voir supabase/radia-stats.sql pour le serveur.
 */
import { PUSH_API } from './push';
import { isStandalone } from './diagnostics';
import { ActivityMeter, HEARTBEAT_MS } from './statsLogic';

const KEY = 'radia-stats-v1';
export interface StatsLocal { v: 1; state: 'none' | 'on' | 'off'; device: string; secret: string; at: number; asked?: boolean; pendingPause?: boolean }
const EMPTY: StatsLocal = { v: 1, state: 'none', device: '', secret: '', at: 0 };

export function readLocal(): StatsLocal {
  try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && j.v === 1 && ['none', 'on', 'off'].includes(j.state)) return { ...EMPTY, ...j }; } catch { /* absent ou illisible */ }
  return { ...EMPTY };
}
function writeLocal(s: StatsLocal): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* stockage indisponible : le partage reste désactivé */ } }

const rnd = (n: number): string => { const b = new Uint8Array(n); crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, '0')).join(''); };
const uuid = (): string => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${rnd(4)}-${rnd(2)}-4${rnd(2).slice(1)}-a${rnd(2).slice(1)}-${rnd(6)}`);
const platform = (): 'pwa' | 'safari' | 'other' => (isStandalone() ? 'pwa' : /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent) ? 'safari' : 'other');
const tz = (): string => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'; } catch { return 'Europe/Paris'; } };

interface RpcOut { ok?: boolean; error?: string; renew?: boolean; [k: string]: unknown }
async function rpc(fn: string, args: Record<string, unknown>, keepalive = false): Promise<RpcOut | null> {
  try {
    const r = await fetch(`${PUSH_API.url}/rest/v1/rpc/${fn}`, { method: 'POST', keepalive, headers: { 'Content-Type': 'application/json', apikey: PUSH_API.key, Authorization: `Bearer ${PUSH_API.key}` }, body: JSON.stringify(args) });
    if (!r.ok) return null;
    return (await r.json()) as RpcOut;
  } catch { return null; }
}

// ------------------------------------------------------------------ suivi (une seule instance)
let meter: ActivityMeter | null = null;
let session = '';
let timer = 0;
let started = false;
let sending = false;
const cleanups: (() => void)[] = [];

const creds = (): { p_device: string; p_secret: string } => { const s = readLocal(); return { p_device: s.device, p_secret: s.secret }; };

function stopTracking(): void {
  window.clearInterval(timer); timer = 0;
  for (const f of cleanups.splice(0)) f();
  meter = null; session = ''; started = false;
}

/** Envoi d'un battement (début, battement ou fin). Les secondes non envoyées (réseau coupé) sont rendues et renvoyées plus tard. */
async function send(event: 'start' | 'beat' | 'end', reason = 'closed', keepalive = false): Promise<void> {
  const s = readLocal();
  if (s.state !== 'on' || !meter || !session || sending && !keepalive) return;
  sending = true;
  const act = event === 'start' ? 0 : meter.drain(Date.now());
  const res = await rpc('radia_stats_beat', { ...creds(), p_session: session, p_event: event, p_act: act, p_reason: reason }, keepalive);
  sending = false;
  if (!res) { meter?.giveBack(act); return; }                 // réseau coupé : on renvoie au prochain battement
  if (res.error === 'unknown' || res.error === 'paused') { disable(false); return; } // données supprimées ou partage désactivé côté serveur : on s'arrête
  if (res.renew && event !== 'end') { session = uuid(); void send('start'); } // session close par le serveur (silence trop long) : nouvelle session
}

function beginTracking(): void {
  if (started || readLocal().state !== 'on') return;
  started = true;
  meter = new ActivityMeter(Date.now());
  meter.setVisible(document.visibilityState !== 'hidden', Date.now());
  session = uuid();
  void send('start');
  const touch = (): void => meter?.touch(Date.now());
  for (const ev of ['pointerdown', 'touchstart', 'keydown']) { window.addEventListener(ev, touch, { passive: true, capture: true }); cleanups.push(() => window.removeEventListener(ev, touch, true)); }
  const vis = (): void => {
    if (!meter) return;
    const hidden = document.visibilityState === 'hidden';
    meter.setVisible(!hidden, Date.now());
    if (hidden) { window.clearInterval(timer); timer = 0; void send('beat', 'background', true); } // dernier battement : la dernière activité connue est à jour
    else if (!timer) { timer = window.setInterval(() => { if (!document.hidden) void send('beat'); }, HEARTBEAT_MS); void send('beat'); }
  };
  document.addEventListener('visibilitychange', vis); cleanups.push(() => document.removeEventListener('visibilitychange', vis));
  const bye = (): void => { void send('end', 'closed', true); };
  window.addEventListener('pagehide', bye); cleanups.push(() => window.removeEventListener('pagehide', bye));
  if (document.visibilityState !== 'hidden') timer = window.setInterval(() => { if (!document.hidden) void send('beat'); }, HEARTBEAT_MS);
}

// ------------------------------------------------------------------ API publique
export const statsState = (): StatsLocal['state'] => readLocal().state;
export const statsAsked = (): boolean => !!readLocal().asked;
export function markStatsAsked(): void { const s = readLocal(); writeLocal({ ...s, asked: true }); }

/** À appeler au démarrage : reprend le suivi si Radia l'a accepté, et termine une désactivation restée en attente (réseau coupé). */
export function startStatsTracking(): void {
  const s = readLocal();
  if (s.state === 'off' && s.pendingPause && s.device) void rpc('radia_stats_pause', creds()).then((r) => { if (r) writeLocal({ ...readLocal(), pendingPause: false }); });
  if (s.state === 'on') beginTracking();
}

/** Le serveur de statistiques est-il en place ? (sonde sans effet : un appareil inconnu répond « unknown »). Tant qu'il ne l'est pas, aucune invitation n'est affichée. */
export async function statsServerReady(): Promise<boolean> {
  const r = await rpc('radia_stats_mine', { p_device: uuid(), p_secret: rnd(16) });
  return !!r && r.error === 'unknown';
}

export type EnableResult = 'ok' | 'server' | 'unsupported';
/** Consentement : à appeler SEULEMENT depuis un geste de Radia après l'information claire. Enregistre l'appareil (identifiant aléatoire) puis démarre le suivi. */
export async function enableStats(): Promise<EnableResult> {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) return 'unsupported';
  const cur = readLocal();
  const device = cur.device || uuid(), secret = cur.secret || `${rnd(16)}${rnd(16)}`; // 64 caractères aléatoires, jamais affichés
  const res = await rpc('radia_stats_join', { p_device: device, p_secret: secret, p_platform: platform(), p_tz: tz() });
  if (!res || !res.ok) return 'server'; // « activé » n'est affiché que si le serveur a confirmé
  writeLocal({ v: 1, state: 'on', device, secret, at: Date.now(), asked: true });
  stopTracking(); beginTracking();
  return 'ok';
}

/** Désactive le partage (plus aucun envoi). Les données déjà reçues restent jusqu'à une demande de suppression. */
export function disable(callServer = true): void {
  const s = readLocal();
  stopTracking();
  writeLocal({ ...s, state: 'off', pendingPause: callServer && !!s.device });
  if (callServer && s.device) void rpc('radia_stats_pause', { p_device: s.device, p_secret: s.secret }).then((r) => { if (r) writeLocal({ ...readLocal(), pendingPause: false }); });
}

/** Supprime TOUTES les données côté serveur et oublie l'appareil (nouvel identifiant si elle réactive plus tard). */
export async function forgetStats(): Promise<boolean> {
  const s = readLocal();
  stopTracking();
  if (s.device) { const r = await rpc('radia_stats_forget', { p_device: s.device, p_secret: s.secret }); if (!r) { writeLocal({ ...s, state: 'off', pendingPause: false }); return false; } }
  writeLocal({ ...EMPTY, asked: true });
  return true;
}

export interface MyStats { ok: boolean; platform?: string; tz?: string; consent_at?: string; paused_at?: string | null; first_seen?: string; last_seen?: string; active_total_s?: number; sessions_total?: number; days?: { day: string; active_s: number; sessions: number }[] }
/** Ce que le serveur conserve sur CET appareil (pour « Voir mes données »). */
export async function myStats(): Promise<MyStats | null> {
  const s = readLocal();
  if (!s.device) return null;
  const r = await rpc('radia_stats_mine', creds());
  return r as MyStats | null;
}

// outils de test (mode ?debug)
export const __stats = { readLocal, startStatsTracking, beginTracking, stopTracking };
