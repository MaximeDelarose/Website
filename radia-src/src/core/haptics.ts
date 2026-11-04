/**
 * Retours haptiques légers. Trois mécanismes, dans cet ordre :
 *  1. navigator.vibrate (Android / Chrome) ;
 *  2. Safari iOS 17.4+ : activer un <input type="checkbox" switch> déclenche un petit « tick »
 *     système (mécanisme WebKit non standard, uniquement sur un vrai geste de l'utilisateur) ;
 *  3. rien (le jeu garde alors ses retours audio et visuels, toujours présents).
 * Aucune promesse : sur un appareil sans support, `haptic()` ne fait simplement rien.
 * Les motifs sont courts et discrets ; un anti-rafale évite toute répétition désagréable.
 */
import { save } from './app';

export type HapticKind =
  | 'select' | 'drop' | 'merge' | 'rare' | 'maxMerge' | 'combo' | 'reward' | 'chest' | 'error' | 'daily'
  | 'chessSelect' | 'chessMove' | 'chessCapture' | 'chessCheck' | 'chessMate'
  // Casino Royal et roue du jour
  | 'bet' | 'rouletteStop' | 'reelStop' | 'cardDeal' | 'chipWin' | 'wheelWin';

/** Durées en ms ([vibre, pause, vibre…]) pour navigator.vibrate ; la longueur = nombre de ticks iOS. */
export const PATTERNS: Record<HapticKind, number[]> = {
  select: [8], drop: [10], merge: [14], rare: [18, 40, 22], maxMerge: [20, 50, 20, 50, 28], combo: [12, 30, 12],
  reward: [14, 40, 14], chest: [16, 50, 16, 50, 24], error: [22], daily: [14, 40, 14, 40, 20],
  chessSelect: [6], chessMove: [10], chessCapture: [18], chessCheck: [14, 40, 14], chessMate: [20, 60, 26],
  bet: [7], rouletteStop: [16, 50, 10], reelStop: [11], cardDeal: [6], chipWin: [12, 40, 12, 40, 18], wheelWin: [14, 40, 14, 40, 22],
};

const MIN_GAP_MS = 45;
let last = -1e9;
let sw: HTMLLabelElement | null = null;
let probe: { vibrate: boolean; ios: boolean } | null = null;

/** iPhone / iPad (y compris iPadOS qui se déclare « Macintosh » avec écran tactile). */
export function isIosLike(nav: { userAgent?: string; platform?: string; maxTouchPoints?: number } | undefined = typeof navigator !== 'undefined' ? navigator : undefined): boolean {
  if (!nav) return false;
  const ua = nav.userAgent ?? '';
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return (nav.platform === 'MacIntel' || /Macintosh/.test(ua)) && (nav.maxTouchPoints ?? 0) > 1;
}

export function hapticSupport(): { vibrate: boolean; ios: boolean } {
  if (probe) return probe;
  const vibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const ios = !vibrate && typeof document !== 'undefined' && isIosLike();
  probe = { vibrate, ios };
  return probe;
}

/** Tests : remet à zéro le cache de détection et l'anti-rafale. */
export function resetHapticsForTests(): void { probe = null; last = -1e9; sw = null; }

function ensureSwitch(): HTMLLabelElement | null {
  if (sw || typeof document === 'undefined' || !document.body) return sw;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.append(input);
  document.body.append(label);
  sw = label;
  return sw;
}

/** Déclenche un retour tactile discret (sans effet si désactivé dans les paramètres). */
export function haptic(kind: HapticKind): void {
  try {
    if (save.data.settings.haptics === false) return;
    const now = performance.now();
    if (now - last < MIN_GAP_MS) return;
    last = now;
    const pat = PATTERNS[kind];
    const sup = hapticSupport();
    if (sup.vibrate) { navigator.vibrate(pat); return; }
    if (sup.ios) {
      const el = ensureSwitch();
      if (!el) return;
      const ticks = Math.ceil(pat.length / 2);
      // 1er tick tout de suite (geste en cours), les suivants un peu plus tard (au mieux)
      el.click();
      for (let i = 1; i < ticks; i++) setTimeout(() => { try { el.click(); } catch { /* ignoré */ } }, i * 70);
    }
  } catch { /* jamais bloquant */ }
}

/** Pour les réglages : y a-t-il une chance que l'appareil réponde ? (jamais une certitude) */
export const hapticMaybeSupported = (): boolean => { const s = hapticSupport(); return s.vibrate || s.ios; };
