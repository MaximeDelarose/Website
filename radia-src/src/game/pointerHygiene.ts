/**
 * Hygiène des pointeurs tactiles de Phaser (cause réelle du bug « les cases du plateau ne répondent plus, mais les boutons oui »).
 *
 * Phaser n'attribue un nouveau toucher qu'à un pointeur « non actif » et ne libère un pointeur que sur un `touchend` / `touchcancel`
 * portant le même identifiant. Sur iPhone, un relâchement peut ne JAMAIS arriver à la page (balayage depuis le bord, centre de
 * contrôle, bandeau de notification, changement d'application, appel…). Le pointeur reste alors « actif » pour toujours ; avec peu de
 * pointeurs (le jeu en déclare 2), deux relâchements perdus suffisent : plus aucun toucher n'est attribué, la grille (dans le canvas) ne
 * reçoit plus rien alors que les boutons HTML fonctionnent. Fermer et relancer l'application remet les pointeurs à zéro.
 *
 * Correctif : à chaque nouveau toucher, la liste RÉELLE des doigts posés (`event.touches`, fournie par le système) fait foi ; tout pointeur
 * actif qui ne correspond à aucun doigt est libéré AVANT que Phaser n'attribue le nouveau toucher. Même nettoyage quand plus aucun doigt
 * n'est posé, quand la page passe en arrière-plan ou revient. Aucun objet, aucune énergie, aucune sauvegarde n'est touché : on ne
 * ferme que l'état « doigt posé » d'un pointeur.
 */
import type Phaser from 'phaser';

export interface PointerInfo { index: number; active: boolean; identifier: number }

/** Pure (testée) : indices des pointeurs actifs qui ne correspondent à aucun doigt réellement posé. */
export function stalePointerIndexes(pointers: readonly PointerInfo[], liveIdentifiers: readonly number[]): number[] {
  const live = new Set(liveIdentifiers);
  return pointers.filter((p) => p.index >= 1 && p.active && !live.has(p.identifier)).map((p) => p.index);
}

type AnyPointer = { active: boolean; isDown: boolean; primaryDown: boolean; buttons: number; identifier: number; wasCanceled: boolean; wasTouch: boolean };

/** Ferme l'état « doigt posé » d'un pointeur (équivalent d'un touchcancel qui aurait bien été reçu). */
export function releasePointer(p: AnyPointer): void {
  p.isDown = false; p.primaryDown = false; p.buttons = 0; p.active = false; p.wasCanceled = true; p.wasTouch = true;
}

export const POINTERS_RESET_EVENT = 'radia-pointers-reset';

export interface HygieneApi { stop: () => void; releaseAll: (why: string) => number; lastReason: () => string }

let current: HygieneApi | null = null;
export const hygiene = (): HygieneApi | null => current;

export function installPointerHygiene(game: Phaser.Game): HygieneApi {
  let last = '';
  const pointers = (): AnyPointer[] => ((game.input as unknown as { pointers?: AnyPointer[] }).pointers ?? []);
  const info = (): PointerInfo[] => pointers().map((p, index) => ({ index, active: !!p.active, identifier: p.identifier }));
  const release = (idx: number[], why: string): number => {
    const ps = pointers();
    for (const i of idx) { if (ps[i]) releasePointer(ps[i]); }
    if (idx.length) { last = `${why} (${idx.length})`; window.dispatchEvent(new CustomEvent(POINTERS_RESET_EVENT, { detail: { why, n: idx.length } })); }
    return idx.length;
  };
  const releaseAll = (why: string): number => release(info().filter((p) => p.index >= 1 && p.active).map((p) => p.index), why);
  const live = (e: TouchEvent): number[] => Array.from(e.touches, (t) => t.identifier);

  // Nouveau toucher : la liste réelle des doigts fait foi. Phase de capture : exécuté AVANT l'attribution d'un pointeur par Phaser.
  let fingers = 0; // doigts réellement posés d'après le dernier événement reçu
  const onStart = (e: TouchEvent) => { fingers = e.touches.length; release(stalePointerIndexes(info(), live(e)), 'toucher perdu'); };
  // Plus aucun doigt posé : aucun pointeur ne peut rester actif (on laisse d'abord Phaser traiter son propre relâchement).
  const onEnd = (e: TouchEvent) => { fingers = e.touches.length; if (fingers === 0) window.setTimeout(() => { if (fingers === 0) releaseAll('plus aucun doigt'); }, 80); };
  const onGone = () => { releaseAll('application quittée / revenue'); };
  const onVis = () => { releaseAll(document.visibilityState === 'hidden' ? 'arrière-plan' : 'retour au premier plan'); };
  window.addEventListener('touchstart', onStart, { capture: true, passive: true });
  window.addEventListener('touchend', onEnd, { capture: true, passive: true });
  window.addEventListener('touchcancel', onEnd, { capture: true, passive: true });
  window.addEventListener('pagehide', onGone); window.addEventListener('pageshow', onGone);
  window.addEventListener('blur', onGone); window.addEventListener('focus', onGone);
  document.addEventListener('visibilitychange', onVis);
  current = {
    stop: () => {
      window.removeEventListener('touchstart', onStart, true); window.removeEventListener('touchend', onEnd, true); window.removeEventListener('touchcancel', onEnd, true);
      window.removeEventListener('pagehide', onGone); window.removeEventListener('pageshow', onGone); window.removeEventListener('blur', onGone); window.removeEventListener('focus', onGone);
      document.removeEventListener('visibilitychange', onVis);
    },
    releaseAll, lastReason: () => last,
  };
  return current;
}
