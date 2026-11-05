/**
 * Diagnostic « Safari ou application installée ? » : affiche des faits objectifs (build, adresse, mode, service worker, mémoire du jeu)
 * pour comparer deux installations. Aucune donnée personnelle : l'adresse est affichée SANS sa partie après « # » (là où voyage la
 * clé des photos), et la clé n'est jamais montrée — seulement sa présence.
 */
import { SAVE_VERSION } from '../save/schema';
import { BUILD_ID, BUILD_TIME, fetchRemoteVersion, isNewer, versionLabel, type RemoteVersion } from './updates';

export interface DiagInput {
  buildId: string;
  buildTime: number;
  launchUrl: string;
  standalone: boolean;
  manifestStart: string;
  sw: { supported: boolean; controlled: boolean; scope: string; script: string; state: string; caches: string[] };
  remote: RemoteVersion | 'unreachable';
  /** Pack de personnages : empreinte du fichier chiffré servi (identique dans les deux modes si les fichiers sont les mêmes) + essai de déchiffrement. */
  chars?: { file: string; fingerprint: string; decrypt: 'ok' | 'échec' | 'sans clé' | 'fichier introuvable' };
  schema?: number;
  scope?: string;
  save: { hadSave: boolean; storyStep: number; hearts: number; coins: number; updatedAt: number; hasPhotoKey: boolean; storageOk: boolean };
}

/** Mode d'exécution : application ajoutée à l'écran d'accueil (iOS : navigator.standalone) ou onglet Safari / navigateur. */
export function isStandalone(): boolean {
  try {
    if ((navigator as { standalone?: boolean }).standalone === true) return true;
    return typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
  } catch { return false; }
}

/** Adresse sans la partie « # » (la clé des photos n'est jamais affichée ni copiée). */
export const safeUrl = (href: string): string => { try { const u = new URL(href); return `${u.origin}${u.pathname}${u.search}`; } catch { return href.split('#')[0]; } };

const pad = (n: number) => String(n).padStart(2, '0');
const when = (t: number): string => { if (!t) return '—'; const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/** Lignes « libellé : valeur » (pures, testées). */
export function formatDiagnostics(d: DiagInput): [string, string][] {
  const status = d.remote === 'unreachable' ? 'impossible de vérifier (pas de réseau ?)' : isNewer(d.remote, d.buildId, d.buildTime) ? `nouvelle version disponible (${d.remote.version})` : 'à jour';
  const sw = !d.sw.supported ? 'non pris en charge' : d.sw.script ? `${d.sw.state}${d.sw.controlled ? ' · contrôle cette page' : ' · ne contrôle pas encore cette page'}` : 'aucun';
  return [
    ['Build', d.buildId],
    ['Date de la build', versionLabel(d.buildId, d.buildTime).split(' · ')[0]],
    ['Dernier déploiement publié', d.remote === 'unreachable' ? '—' : `${d.remote.version} (${when(d.remote.built)})`],
    ['Mise à jour', status],
    ['Adresse de lancement', d.launchUrl],
    ['start_url du manifeste', d.manifestStart || '—'],
    ['Mode', d.standalone ? 'APPLICATION INSTALLÉE (plein écran, mémoire séparée de Safari)' : 'Safari / navigateur'],
    ['Scope du manifeste', d.scope || '—'],
    ['Service worker', sw],
    ['Cache du service worker', d.sw.caches.join(', ') || '—'],
    ['Partie dans ce mode', d.save.storageOk ? (d.save.hadSave ? `existante · histoire étape ${d.save.storyStep} · ${d.save.hearts} ♡ · ${d.save.coins} pièces · modifiée ${when(d.save.updatedAt)}` : 'NEUVE (aucune partie enregistrée ici)') : 'stockage indisponible'],
    ['Schéma de sauvegarde', d.schema == null ? '—' : `v${d.schema}`],
    ['Pack de personnages', d.chars ? `${d.chars.file} · empreinte ${d.chars.fingerprint} · déchiffrement : ${d.chars.decrypt}` : '—'],
    ['Photos (clé)', d.save.hasPhotoKey ? 'présente' : 'ABSENTE → personnages dessinés au lieu des photos'],
  ];
}

/** Empreinte (SHA-256 court) du fichier chiffré du visage de Radia + test de déchiffrement avec la clé locale. Aucune clé ni image n'est affichée. */
async function charsProbe(hasKey: boolean): Promise<NonNullable<DiagInput['chars']>> {
  const file = 'char-radia.bin';
  try {
    const res = await fetch(`./assets/p/${file}`, { cache: 'no-store' });
    if (!res.ok) return { file, fingerprint: '—', decrypt: 'fichier introuvable' };
    const buf = await res.arrayBuffer();
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
    const fingerprint = [...h.slice(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (!hasKey) return { file, fingerprint, decrypt: 'sans clé' };
    const { decryptAsset } = await import('./photos');
    return { file, fingerprint, decrypt: (await decryptAsset('char-radia')) ? 'ok' : 'échec' };
  } catch { return { file, fingerprint: '—', decrypt: 'échec' }; }
}

export async function gatherDiagnostics(save: { hadSave: boolean; data: { story?: { step?: number }; hearts?: number; world?: { res?: { coins?: number } }; updatedAt?: number } }, photoKey: () => string | null): Promise<DiagInput> {
  let sw: DiagInput['sw'] = { supported: false, controlled: false, scope: '', script: '', state: '', caches: [] };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const w = reg?.active ?? reg?.waiting ?? reg?.installing ?? null;
      sw = { supported: true, controlled: !!navigator.serviceWorker.controller, scope: reg?.scope ?? '', script: w?.scriptURL ?? '', state: w?.state ?? '', caches: [] };
    }
  } catch { /* ignore */ }
  try { sw.caches = (await caches.keys()).filter((k) => k.startsWith('radia-')); } catch { /* ignore */ }
  let manifestStart = '';
  try {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (link) { const m = await (await fetch(link.href, { cache: 'no-store' })).json(); manifestStart = new URL(m.start_url ?? './', link.href).href; }
  } catch { /* ignore */ }
  let scope = '';
  try {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (link) { const m = await (await fetch(link.href, { cache: 'no-store' })).json(); scope = new URL(m.scope ?? './', link.href).href; }
  } catch { /* ignore */ }
  const chars = await charsProbe(!!photoKey());
  const remote = (await fetchRemoteVersion()) ?? 'unreachable';
  let storageOk = true;
  try { localStorage.setItem('__d__', '1'); localStorage.removeItem('__d__'); } catch { storageOk = false; }
  return {
    buildId: BUILD_ID, buildTime: BUILD_TIME, launchUrl: safeUrl(location.href), standalone: isStandalone(), manifestStart, scope, schema: SAVE_VERSION, chars, sw, remote,
    save: { hadSave: save.hadSave, storyStep: save.data.story?.step ?? 0, hearts: save.data.hearts ?? 0, coins: save.data.world?.res?.coins ?? 0, updatedAt: save.data.updatedAt ?? 0, hasPhotoKey: !!photoKey(), storageOk },
  };
}

/** Texte à copier-coller (pour comparer Safari et l'application installée). */
export const diagnosticsText = (rows: [string, string][]): string => rows.map(([k, v]) => `${k} : ${v}`).join('\n');
