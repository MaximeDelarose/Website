/**
 * Mises à jour de RADIA (application installée sur l'écran d'accueil comprise).
 *
 * Pourquoi : sur iPhone, une application web installée reste « suspendue » en mémoire pendant des jours — rouvrir l'icône ne
 * recharge rien. L'ancienne version continue donc de tourner, et ses fichiers tardifs disparaissent du serveur à chaque
 * déploiement. Ici, à chaque retour au premier plan (et au lancement, au retour du réseau, toutes les 10 minutes) on relit
 * `version.json` SANS cache ; si une build plus récente existe :
 *   - sur l'écran titre, sans fenêtre ouverte : la mise à jour s'applique toute seule (la sauvegarde est écrite avant) ;
 *   - ailleurs (fusion, achat, cinématique…) : une barre discrète propose « Mettre à jour » — jamais de rechargement brutal.
 * Aucune donnée n'est effacée : localStorage n'est pas touché.
 */
declare const __BUILD_ID__: string | undefined;
declare const __BUILD_TIME__: number | undefined;

export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
export const BUILD_TIME: number = typeof __BUILD_TIME__ === 'number' ? __BUILD_TIME__ : 0;

import { dbg } from './debug';

export interface RemoteVersion { version: string; built: number }
export type UpdateStatus = 'uptodate' | 'available' | 'unreachable';

/** Lecture tolérante de version.json (jamais d'exception). */
export function parseRemoteVersion(raw: unknown): RemoteVersion | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.version !== 'string' || !o.version) return null;
  const built = typeof o.built === 'number' && Number.isFinite(o.built) ? o.built : 0;
  return { version: o.version, built };
}

/** La version distante est-elle plus récente que celle qui tourne ? (jamais de « retour en arrière » vers une build plus ancienne) */
export function isNewer(remote: RemoteVersion | null, localId = BUILD_ID, localTime = BUILD_TIME): boolean {
  if (!remote || localId === 'dev') return false;
  if (remote.version === localId) return false;
  return remote.built > localTime;
}

/** Affichage lisible de la version : « 2026-11-05 · mw2kvgtp-5c52dfc ». */
export function versionLabel(id = BUILD_ID, time = BUILD_TIME): string {
  if (!time) return id;
  const d = new Date(time);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} · ${id}`;
}

export async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  try {
    const res = await fetch(new URL(`version.json?_=${Date.now()}`, document.baseURI).href, { cache: 'no-store' });
    if (!res.ok) return null;
    return parseRemoteVersion(await res.json());
  } catch { return null; }
}

// ------------------------------------------------------------------ application de la mise à jour
const GUARD = 'radia-upd-at';

/** Moment sûr pour recharger tout seul : écran titre, aucune fenêtre, aucun cadeau, rien en cours d'écriture. */
export function safeToApplyNow(): boolean {
  if (typeof document === 'undefined') return false;
  if (!document.querySelector('.title-screen')) return false;
  if (document.querySelector('.modal-backdrop, #reward-overlay .rw-root, .ev-layer, .inc-layer, .dm-reveal')) return false;
  return document.visibilityState === 'visible';
}

export async function applyUpdate(writeSave?: () => void): Promise<void> {
  try { writeSave?.(); } catch { /* la sauvegarde est de toute façon écrite à chaque action */ }
  try { sessionStorage.setItem(GUARD, String(Date.now())); } catch { /* ignore */ }
  try {
    // On lance la recherche d'un nouveau service worker et on lui laisse 6 s au plus : son installation télécharge toute la build
    // (longue en connexion lente) et ne conditionne pas le rechargement — la page est de toute façon relue sans cache par le réseau.
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await Promise.race([reg.update().catch(() => undefined), new Promise<void>((res) => window.setTimeout(res, 6000))]);
      reg.waiting?.postMessage('skip-waiting');
    }
  } catch { /* pas de service worker : le rechargement suffit */ }
  location.reload();
}

/** Évite toute boucle : si on vient juste de recharger pour la même raison, on ne le refait pas tout seul. */
const justReloaded = (): boolean => { try { return Date.now() - Number(sessionStorage.getItem(GUARD) ?? 0) < 60_000; } catch { return false; } };

let bar: HTMLElement | null = null;
export function showUpdateAvailable(onApply: () => void): void {
  if (bar || typeof document === 'undefined') return;
  bar = document.createElement('div');
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:2000;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:18px;background:#fff7fb;color:#3b3152;box-shadow:0 0 0 2px #f5a0bb,0 10px 28px rgba(59,49,82,.35);font:600 14px/1.25 Fredoka,system-ui,sans-serif';
  const label = document.createElement('span');
  label.style.flex = '1';
  label.textContent = 'Une nouvelle version de RADIA est disponible ♡';
  const btn = document.createElement('button');
  btn.textContent = 'Mettre à jour';
  btn.style.cssText = 'min-height:44px;padding:0 14px;border:0;border-radius:14px;background:linear-gradient(180deg,#ff8fb8,#e8558f);color:#fff;font:700 14px Fredoka,system-ui,sans-serif';
  btn.addEventListener('click', () => { btn.disabled = true; btn.textContent = '…'; onApply(); });
  bar.append(label, btn);
  document.body.append(bar);
}

// ------------------------------------------------------------------ vérification
let inflight: Promise<UpdateStatus> | null = null;
let writeSaveFn: (() => void) | undefined;

async function doCheck(manual: boolean): Promise<UpdateStatus> {
  try { const reg = await navigator.serviceWorker?.getRegistration(); void reg?.update().catch(() => undefined); } catch { /* ignore */ }
  const remote = await fetchRemoteVersion();
  if (!remote) return 'unreachable';
  if (!isNewer(remote)) return 'uptodate';
  if (!manual && safeToApplyNow() && !justReloaded()) { void applyUpdate(writeSaveFn); return 'available'; }
  showUpdateAvailable(() => void applyUpdate(writeSaveFn));
  return 'available';
}

/**
 * Vérifie s'il existe une version plus récente. `manual` : l'utilisatrice l'a demandé (on ne recharge pas toute seule).
 * Une vérification déjà en cours est partagée (jamais de faux « à jour » parce qu'une autre tourne).
 */
export function checkForUpdate(manual = false): Promise<UpdateStatus> {
  if (inflight) return inflight;
  inflight = doCheck(manual).finally(() => { inflight = null; });
  return inflight;
}

export function startUpdates(writeSave: () => void): void {
  writeSaveFn = writeSave;
  const run = () => void checkForUpdate(false);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); });
  window.addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) run(); });
  window.addEventListener('online', run);
  window.setInterval(run, 10 * 60_000);
  window.setTimeout(run, 4000);
}

// mode ?debug : tests de déploiement
dbg('build', { id: BUILD_ID, time: BUILD_TIME, label: () => versionLabel(), check: (manual = true) => checkForUpdate(manual), safe: () => safeToApplyNow() });
