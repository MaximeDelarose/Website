/**
 * Vraies notifications iPhone (Web Push) : une « petite pensée » par jour, avec le CONSENTEMENT de Radia.
 *  - jamais de demande automatique : l'autorisation n'est demandée qu'après un toucher volontaire (Paramètres) ;
 *  - « activées » ne s'affiche que si l'abonnement est réellement enregistré côté serveur ;
 *  - sur iPhone, cela ne fonctionne que pour l'application ajoutée à l'écran d'accueil (iOS ≥ 16.4) : on l'explique clairement.
 * Rien n'est collecté en dehors de l'adresse d'abonnement du navigateur (fournie par Apple/Google/Mozilla), du fuseau horaire et de l'heure choisie.
 */
import { isStandalone } from './diagnostics';

/** Projet Supabase du site (adresse et clé PUBLIQUES, déjà publiées dans js/data.js). */
export const PUSH_API = { url: 'https://euxlmipqzmvnzzyalyfn.supabase.co', key: 'sb_publishable_yryevkEb0hvSSZTdTQN0xA_R1NjJsfd' } as const;

export type PushStatus =
  | { kind: 'unsupported'; why: 'browser' | 'not-installed' | 'insecure' }
  | { kind: 'denied' }
  | { kind: 'off'; canAsk: boolean }
  | { kind: 'on'; endpointShort: string };

/**
 * Règle PURE (testée) : faut-il proposer la carte « Une petite pensée pour toi » ?
 * Seulement dans l'application installée (écran d'accueil), une seule fois, si les notifications sont possibles et pas encore décidées.
 * Jamais si Radia a déjà répondu (plus tard, refusé, accepté) ou si le système les a déjà refusées : on ne redemande pas.
 */
export function shouldInvite(o: { standalone: boolean; state: 'none' | 'later' | 'accepted' | 'refused' | 'error'; status: PushStatus['kind']; canAsk?: boolean }): boolean {
  return o.standalone && o.state === 'none' && o.status === 'off' && o.canAsk !== false;
}

const hasApis = (): boolean => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;

/** Pure (testée) : ce que la plateforme permet. iPhone : seulement l'application installée (standalone). */
export function classifySupport(o: { apis: boolean; secure: boolean; ios: boolean; standalone: boolean }): 'ok' | 'browser' | 'not-installed' | 'insecure' {
  if (!o.secure) return 'insecure';
  if (o.ios && !o.standalone) return 'not-installed';
  if (!o.apis) return o.ios ? 'not-installed' : 'browser';
  return 'ok';
}

const isIos = (): boolean => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1);

/** Service worker de l'application. `waitMs` : combien de temps attendre son activation (jamais indéfiniment : le démarrage peut le retarder). */
async function registration(waitMs = 4000): Promise<ServiceWorkerRegistration | null> {
  try {
    const r = await navigator.serviceWorker.getRegistration();
    if (r) return r;
    return await Promise.race([navigator.serviceWorker.ready, new Promise<null>((res) => window.setTimeout(() => res(null), waitMs))]);
  } catch { return null; }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  try {
    const r = await fetch(`${PUSH_API.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUSH_API.key, Authorization: `Bearer ${PUSH_API.key}` }, body: JSON.stringify(args) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

const b64uToBytes = (s: string): Uint8Array => { const t = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4); const r = atob(t); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
const bytesToB64u = (b: ArrayBuffer | null): string => { if (!b) return ''; let s = ''; for (const x of new Uint8Array(b)) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };

export const localTz = (): string => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'; } catch { return 'Europe/Paris'; } };

/** État réel : permission du système + abonnement existant. */
export async function pushStatus(): Promise<PushStatus> {
  const s = classifySupport({ apis: hasApis(), secure: typeof isSecureContext === 'boolean' ? isSecureContext : true, ios: isIos(), standalone: isStandalone() });
  if (s !== 'ok') return { kind: 'unsupported', why: s };
  if (Notification.permission === 'denied') return { kind: 'denied' };
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub && Notification.permission === 'granted') return { kind: 'on', endpointShort: sub.endpoint.slice(-8) };
  return { kind: 'off', canAsk: true };
}

export type EnableResult = 'ok' | 'denied' | 'unsupported' | 'server' | 'no-key' | 'error';
/**
 * À appeler SEULEMENT depuis un toucher de Radia. Demande l'autorisation, s'abonne, enregistre l'abonnement côté serveur et ne renvoie 'ok'
 * qu'une fois l'enregistrement confirmé (sinon l'abonnement local est annulé : on n'affiche jamais « activées » à tort).
 */
export function enablePush(hour = 9): Promise<EnableResult> {
  // iOS exige que Notification.requestPermission() soit appelé DIRECTEMENT par le geste de Radia : on le lance de façon synchrone,
  // avant toute attente (lecture du service worker, réseau…), sinon Safari peut ignorer la demande.
  const sup = classifySupport({ apis: hasApis(), secure: typeof isSecureContext === 'boolean' ? isSecureContext : true, ios: isIos(), standalone: isStandalone() });
  if (sup !== 'ok') return Promise.resolve('unsupported');
  if (Notification.permission === 'denied') return Promise.resolve('denied');
  const asked: Promise<NotificationPermission> = Notification.permission === 'granted' ? Promise.resolve('granted') : Notification.requestPermission();
  return enableAfterPermission(asked, hour);
}
async function enableAfterPermission(asked: Promise<NotificationPermission>, hour: number): Promise<EnableResult> {
  const perm = await asked;
  if (perm !== 'granted') return 'denied';
  const reg = await registration(12_000); if (!reg) return 'error'; // elle vient de toucher le bouton : on laisse le temps au service worker de s'activer
  const key = await rpc<string>('radia_push_public_key', {});
  if (!key) return 'no-key';
  let sub: PushSubscription | null = null;
  try { sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(key) as BufferSource })); } catch { return 'error'; }
  const res = await rpc<{ ok: boolean }>('radia_push_register', { p_endpoint: sub.endpoint, p_p256dh: bytesToB64u(sub.getKey('p256dh')), p_auth: bytesToB64u(sub.getKey('auth')), p_tz: localTz(), p_hour: hour });
  if (!res || !res.ok) { try { await sub.unsubscribe(); } catch { /* ignoré */ } return 'server'; }
  return 'ok';
}

/** Désactive : désabonne l'appareil ET supprime l'abonnement côté serveur. */
export async function disablePush(): Promise<boolean> {
  const reg = await registration(); const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return true;
  const ep = sub.endpoint;
  await rpc('radia_push_unregister', { p_endpoint: ep });
  try { await sub.unsubscribe(); } catch { return false; }
  return true;
}

/** Réabonnement silencieux si le système a renouvelé l'abonnement (aucune nouvelle demande d'autorisation). */
export async function refreshPushIfNeeded(): Promise<void> {
  if ((await pushStatus()).kind !== 'on') return;
  const reg = await registration(); const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return;
  await rpc('radia_push_register', { p_endpoint: sub.endpoint, p_p256dh: bytesToB64u(sub.getKey('p256dh')), p_auth: bytesToB64u(sub.getKey('auth')), p_tz: localTz(), p_hour: 9 }); // met aussi le fuseau à jour (voyage)
}

/** Demande au serveur d'envoyer TOUT DE SUITE une pensée à cet appareil (vérifier la réception réelle). */
export async function sendTestPush(): Promise<'ok' | 'limit' | 'error'> {
  const reg = await registration(); const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return 'error';
  try {
    const r = await fetch(`${PUSH_API.url}/functions/v1/radia-push`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUSH_API.key }, body: JSON.stringify({ action: 'test', endpoint: sub.endpoint }) });
    if (r.status === 429) return 'limit';
    const j = await r.json().catch(() => ({ ok: false }));
    return j.ok ? 'ok' : 'error';
  } catch { return 'error'; }
}

// ------------------------------------------------------------------ « Petites pensées ♡ » : historique local
export interface Thought { at: number; text: string; idx?: number }
const CACHE = 'rthoughts';
/** Ramasse les pensées reçues par le service worker (même si la notification n'a pas été touchée) ; les vide du cache. */
export async function collectThoughts(): Promise<Thought[]> {
  const out: Thought[] = [];
  try {
    const c = await caches.open(CACHE);
    for (const req of await c.keys()) {
      const res = await c.match(req); if (!res) continue;
      try { const j = await res.json(); if (typeof j.text === 'string' && typeof j.at === 'number') out.push({ at: j.at, text: j.text.slice(0, 700), idx: typeof j.idx === 'number' ? j.idx : undefined }); } catch { /* entrée illisible */ }
      await c.delete(req);
    }
  } catch { /* Cache API indisponible */ }
  return out.sort((a, b) => a.at - b.at);
}
/** Ajoute des pensées à l'historique (sans doublon, 60 au plus). Renvoie les nouvelles. */
export function mergeThoughts(history: Thought[], incoming: Thought[]): Thought[] {
  const fresh: Thought[] = [];
  for (const t of incoming) if (!history.some((h) => h.at === t.at && h.text === t.text)) { history.push(t); fresh.push(t); }
  history.sort((a, b) => a.at - b.at);
  while (history.length > 60) history.shift();
  return fresh;
}
