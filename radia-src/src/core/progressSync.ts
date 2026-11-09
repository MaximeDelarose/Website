/**
 * Partage de PROGRESSION avec le créateur — UNIQUEMENT si Radia a accepté l'option distincte « Partager ma progression de jeu ♡ »
 * (jamais déduit du partage du temps de jeu). Envoyé : un instantané de progression, des jalons, le temps ACTIF par mode et un résumé d'activité
 * par session. Jamais : messages, conversations, contacts, position, détail des interactions sociales, ni les clics.
 * Léger : un seul envoi toutes les 45 s au plus, un échantillon de 5 s ; aucun envoi en arrière-plan sauf le dernier à la mise en veille.
 */
import { PUSH_API } from './push';
import { save } from './app';
import { ActivityMeter, HEARTBEAT_MS } from './statsLogic';
import { platform, readLocal, rnd, rpc, tz, uuid, writeLocal } from './stats';
import { ModeMeter, buildSnapshot, counters, detectMode, diffEvents, narrativeEvents, sessionSummary, type Counters, type ProgressEvent, type Snap } from './progressShare';

const KEY = 'radia-prog-v1';
interface Persist { snap: Snap | null; mem: number; pho: number; queue: ProgressEvent[] }
const readP = (): Persist => { try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && Array.isArray(j.queue)) return j as Persist; } catch { /* absent */ } return { snap: null, mem: -1, pho: -1, queue: [] }; };
const writeP = (p: Persist): void => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* stockage indisponible : les jalons seront simplement renvoyés plus tard */ } };

export const progressState = (): 'none' | 'on' | 'off' => readLocal().prog ?? 'none';

let meter: ActivityMeter | null = null;
let modes: ModeMeter | null = null;
let session = '', seq = 0;
let base: Counters | null = null, baseSnap: Snap | null = null;
let sampleTimer = 0, beatTimer = 0, sending = false, running = false;
const cleanups: (() => void)[] = [];

function stop(): void {
  window.clearInterval(sampleTimer); window.clearInterval(beatTimer); sampleTimer = 0; beatTimer = 0;
  for (const f of cleanups.splice(0)) f();
  meter = null; modes = null; running = false;
}

const creds = (): { p_device: string; p_secret: string } => { const s = readLocal(); return { p_device: s.device, p_secret: s.secret }; };

async function push(keepalive = false): Promise<void> {
  if (!running || !meter || !modes || (sending && !keepalive)) return;
  if (progressState() !== 'on') { stop(); return; }   // partage arrêté (ou données supprimées) : plus aucun envoi
  sending = true;
  try {
    const now = Date.now();
    sample(now);
    const d = save.data;
    const snap = buildSnapshot(d, now);
    const p = readP();
    const found = [...diffEvents(p.snap, snap, d), ...narrativeEvents(p.mem >= 0 ? { memories: p.mem, photos: p.pho } : null, d, now)];
    const queue = [...p.queue, ...found.filter((e) => !p.queue.some((q) => q.id === e.id))].slice(-60);
    writeP({ snap, mem: d.memories.length, pho: d.photos.length, queue });
    const drained = modes.drain();
    const summary = base && baseSnap ? sessionSummary(base, counters(d), baseSnap, snap) : null;
    seq++;
    const res = await rpc('radia_progress_push', { ...creds(), p_session: session, p_seq: seq, p_snap: snap, p_events: queue.slice(0, 30), p_modes: drained, p_visited: modes.visited(), p_summary: summary }, keepalive);
    if (!res) { modes.giveBack(drained); return; }                       // réseau coupé : on renverra (numéro d'ordre idempotent)
    if (res.error === 'unknown' || res.error === 'paused') { writeLocal({ ...readLocal(), prog: 'off' }); stop(); return; }
    if (res.ok) { const q = readP(); const sent = new Set(queue.slice(0, 30).map((e) => e.id)); writeP({ ...q, queue: q.queue.filter((e) => !sent.has(e.id)) }); }
  } catch { /* jamais bloquant pour le jeu */ } finally { sending = false; }
}

let lastSample = 0;
function sample(now: number): void {
  if (!meter || !modes) return;
  const s = meter.drain(now);                       // secondes d'activité RÉELLE (visible + geste récent) : 0 en arrière-plan
  const dt = Math.max(0, Math.round((now - lastSample) / 1000)); lastSample = now; void dt;
  modes.sample(detectMode((sel) => !!document.querySelector(sel)), s);
}

function begin(): void {
  if (running || progressState() !== 'on') return;
  running = true; seq = 0; session = uuid(); lastSample = Date.now();
  meter = new ActivityMeter(Date.now()); meter.setVisible(document.visibilityState !== 'hidden', Date.now());
  modes = new ModeMeter();
  base = counters(save.data); baseSnap = buildSnapshot(save.data);
  const touch = (): void => meter?.touch(Date.now());
  for (const ev of ['pointerdown', 'touchstart', 'keydown']) { window.addEventListener(ev, touch, { passive: true, capture: true }); cleanups.push(() => window.removeEventListener(ev, touch, true)); }
  const vis = (): void => {
    if (!meter) return;
    const hidden = document.visibilityState === 'hidden';
    if (hidden) { sample(Date.now()); meter.setVisible(false, Date.now()); void push(true); }
    else { meter.setVisible(true, Date.now()); lastSample = Date.now(); }
  };
  document.addEventListener('visibilitychange', vis); cleanups.push(() => document.removeEventListener('visibilitychange', vis));
  const bye = (): void => { void push(true); };
  window.addEventListener('pagehide', bye); cleanups.push(() => window.removeEventListener('pagehide', bye));
  sampleTimer = window.setInterval(() => { if (!document.hidden) sample(Date.now()); }, 5000);
  beatTimer = window.setInterval(() => { if (!document.hidden) void push(); }, HEARTBEAT_MS);
  void push();
}

/** À appeler au démarrage : reprend le partage si Radia l'a accepté ; termine un arrêt resté en attente (réseau coupé). */
export function startProgressSync(): void {
  const s = readLocal();
  if (s.prog === 'off' && s.progPause && s.device) void rpc('radia_progress_pause', creds()).then((r) => { if (r) writeLocal({ ...readLocal(), progPause: false }); });
  if (s.prog === 'on') begin();
}

export type EnableProgress = 'ok' | 'server' | 'unsupported';
/** Consentement : SEULEMENT depuis un geste de Radia, après l'information claire. « Activé » n'est affiché que si le serveur a confirmé. */
export async function enableProgress(): Promise<EnableProgress> {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) return 'unsupported';
  const cur = readLocal();
  const device = cur.device || uuid(), secret = cur.secret || `${rnd(16)}${rnd(16)}`;
  const res = await rpc('radia_progress_join', { p_device: device, p_secret: secret, p_platform: platform(), p_tz: tz() });
  if (!res || !res.ok) return 'server';
  writeLocal({ ...cur, v: 1, device, secret, at: cur.at || Date.now(), prog: 'on', progPause: false, progAsked: true });
  writeP({ snap: null, mem: -1, pho: -1, queue: [] }); // état de départ : rien n'est reconstitué
  stop(); begin();
  return 'ok';
}

/** Arrête le partage (plus aucun envoi). Les données déjà reçues restent jusqu'à une demande de suppression. */
export function disableProgress(): void {
  const s = readLocal();
  stop();
  writeLocal({ ...s, prog: 'off', progPause: !!s.device });
  if (s.device) void rpc('radia_progress_pause', { p_device: s.device, p_secret: s.secret }).then((r) => { if (r) writeLocal({ ...readLocal(), progPause: false }); });
}

/** Supprime les données de PROGRESSION côté serveur (le temps de jeu n'est pas touché). */
export async function forgetProgress(): Promise<boolean> {
  const s = readLocal();
  stop();
  if (s.device) {
    let ok = false;
    try { const r = await fetch(`${PUSH_API.url}/functions/v1/radia-push`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUSH_API.key, Authorization: `Bearer ${PUSH_API.key}` }, body: JSON.stringify({ action: 'progress-forget', device: s.device, secret: s.secret }) }); ok = r.ok && !!(await r.json()).ok; } catch { ok = false; }
    if (!ok) { writeLocal({ ...s, prog: 'off', progPause: false }); return false; }
  }
  writeLocal({ ...readLocal(), prog: 'off', progPause: false });
  writeP({ snap: null, mem: -1, pho: -1, queue: [] });
  return true;
}

export interface MyProgress { ok: boolean; consent_at?: string | null; paused_at?: string | null; snap_at?: string | null; events?: number; sessions?: number; snap?: Snap | null }
export async function myProgress(): Promise<MyProgress | null> {
  const s = readLocal();
  if (!s.device) return null;
  return (await rpc('radia_progress_mine', creds())) as MyProgress | null;
}

export const __progress = { begin, stop, push };
