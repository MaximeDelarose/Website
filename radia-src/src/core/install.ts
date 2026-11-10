/**
 * Installation sur l'écran d'accueil. Sur iPhone, iOS ne permet PAS de déclencher l'installation depuis une page :
 * on affiche donc des instructions adaptées à Safari. Sur Android/Chrome, le navigateur fournit `beforeinstallprompt` : on l'utilise.
 */
export type InstallKind = 'installed' | 'prompt' | 'ios-safari' | 'ios-other' | 'other';

export interface InstallEnv { standalone: boolean; ios: boolean; safari: boolean; hasPrompt: boolean }

/** Décision pure (testée). `safari` = Safari d'iOS lui-même (pas Chrome/Firefox/Edge/une application intégrée). */
export function installKind(e: InstallEnv): InstallKind {
  if (e.standalone) return 'installed';
  if (e.hasPrompt) return 'prompt';
  if (e.ios) return e.safari ? 'ios-safari' : 'ios-other';
  return 'other';
}

/** Lecture de l'environnement réel. */
export function detectEnv(hasPrompt: boolean, standalone: boolean): InstallEnv {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  // iPadOS 13+ se présente comme un Mac : on le reconnaît à l'écran tactile
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
  const safari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line\/|MicroMessenger/.test(ua);
  return { standalone, ios, safari, hasPrompt };
}

interface DeferredPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: DeferredPrompt | null = null;
const listeners = new Set<() => void>();

export function listenInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); deferred = ev as DeferredPrompt; listeners.forEach((f) => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((f) => f()); });
}
export const onInstallChange = (f: () => void): (() => void) => { listeners.add(f); return () => listeners.delete(f); };
export const hasDeferredPrompt = (): boolean => deferred !== null;

/** Lance la boîte d'installation du navigateur (Android/Chrome). Renvoie vrai si la joueuse a accepté. */
export async function promptInstall(): Promise<boolean> {
  const d = deferred; if (!d) return false;
  deferred = null;
  try { await d.prompt(); return (await d.userChoice).outcome === 'accepted'; } catch { return false; }
}
