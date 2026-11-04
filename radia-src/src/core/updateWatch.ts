/**
 * Mises à jour du jeu : quand une nouvelle version est publiée, les anciens fichiers (chargés à la demande) disparaissent du
 * serveur. Une session restée ouverte pouvait alors « planter » en silence au premier chargement tardif (ex. pendant une fusion).
 * Ici : (1) on détecte l'échec d'un chargement tardif et on propose de recharger ; (2) quand l'onglet redevient visible, on
 * vérifie discrètement si une nouvelle version existe ; (3) on garde les dernières erreurs (localStorage) pour le diagnostic.
 * La progression est sauvegardée à chaque action : recharger ne perd rien.
 */
const ERR_KEY = 'radia-errors';
import { applyUpdate, showUpdateAvailable } from './updates';

function remember(kind: string, msg: string, stack?: string): void {
  try {
    const raw = localStorage.getItem(ERR_KEY);
    const list: { t: number; k: string; m: string; s?: string }[] = raw ? JSON.parse(raw) : [];
    list.push({ t: Date.now(), k: kind, m: String(msg).slice(0, 300), s: stack ? String(stack).slice(0, 600) : undefined });
    localStorage.setItem(ERR_KEY, JSON.stringify(list.slice(-8)));
  } catch { /* stockage indisponible : on ignore */ }
}

/** Un fichier tardif a disparu (version en cours périmée) : on propose la mise à jour, sans jamais recharger brutalement. */
export function showUpdateBar(): void {
  // hors ligne, un fichier manquant n'est PAS une version périmée : on ne propose rien (la vérification régulière s'en chargera)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  showUpdateAvailable(() => void applyUpdate());
}

const STALE = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically|Unable to preload CSS/i;

export function startUpdateWatch(): void {
  window.addEventListener('vite:preloadError', (e) => { remember('preload', String((e as { payload?: unknown }).payload ?? 'preloadError')); showUpdateBar(); });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = String((e.reason && (e.reason.message ?? e.reason)) ?? '');
    remember('rejection', msg, e.reason?.stack);
    if (STALE.test(msg)) showUpdateBar();
  });
  window.addEventListener('error', (e) => {
    remember('error', e.message, e.error?.stack);
    if (STALE.test(e.message ?? '')) showUpdateBar();
  });
}
