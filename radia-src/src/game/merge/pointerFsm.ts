/**
 * Machine à états du pointeur (toucher) du plateau — logique PURE, testée dans tests/board-pointer.test.ts.
 *
 *   repos ──down──▶ appui ──(≥ LONG_PRESS_MS sans bouger)──▶ long ──up──▶ repos   (le relâchement est AVALÉ : ni fusion, ni déplacement, ni toucher)
 *                     │
 *                     ├──(déplacement > MOVE_TOL avant le seuil)──▶ glissé ──up──▶ repos  (dépôt)
 *                     └──up (avant le seuil, sans bouger)──▶ repos                         (toucher court)
 *
 * Règles : pas d'appui long pendant un glissé ; un déplacement au-delà de la tolérance annule l'appui long et démarre le
 * glissé ; une fois l'appui long déclenché, le doigt peut bouger sans rien provoquer. Le temps est passé par l'appelant
 * (ms) : aucune horloge ici.
 */

/** Seuil d'appui long (élevé : ouvrir une fiche ne doit jamais arriver par accident). */
export const LONG_PRESS_MS = 550;
/** Tolérance de mouvement (pixels CSS) pendant l'appui. */
export const MOVE_TOL = 8;

export type PointerPhase = 'idle' | 'down' | 'long' | 'drag';
export type PointerOut = 'none' | 'long' | 'dragStart' | 'tap' | 'drop';

export class PointerFsm {
  phase: PointerPhase = 'idle';
  private t0 = 0;
  private x0 = 0;
  private y0 = 0;
  /** Vrai si cet appui peut déclencher un appui long (objet, générateur ou case verrouillée ; pas une case vide). */
  private canLong = true;

  constructor(private readonly longMs = LONG_PRESS_MS, private readonly tol = MOVE_TOL) {}

  down(t: number, x: number, y: number, canLong = true): void {
    this.phase = 'down';
    this.t0 = t;
    this.x0 = x;
    this.y0 = y;
    this.canLong = canLong;
  }

  /** Appelé à intervalles (minuteur) : renvoie 'long' une seule fois quand le seuil est franchi sans mouvement. */
  tick(t: number): PointerOut {
    if (this.phase === 'down' && this.canLong && t - this.t0 >= this.longMs) { this.phase = 'long'; return 'long'; }
    return 'none';
  }

  move(t: number, x: number, y: number): PointerOut {
    if (this.phase === 'down') {
      if (Math.hypot(x - this.x0, y - this.y0) > this.tol) { this.phase = 'drag'; return 'dragStart'; }
      return this.tick(t);
    }
    return 'none';
  }

  /** Relâchement : 'tap' (court), 'drop' (fin de glissé) ou 'none' (relâchement avalé après un appui long / pas d'appui). */
  up(t: number): PointerOut {
    const p = this.phase;
    this.phase = 'idle';
    if (p === 'down') {
      // le minuteur a pu être en retard : un appui déjà plus long que le seuil, immobile, compte comme long
      return this.canLong && t - this.t0 >= this.longMs ? 'long' : 'tap';
    }
    if (p === 'drag') return 'drop';
    return 'none';
  }

  cancel(): void { this.phase = 'idle'; }
  /** L'appui long a-t-il eu lieu pendant ce contact ? (pour ignorer le relâchement) */
  get swallowed(): boolean { return this.phase === 'long'; }
  get active(): boolean { return this.phase !== 'idle'; }
}

/** Un contact qui dure plus longtemps que ça est forcément perdu (aucun geste de jeu ne dure 20 s). */
export const MAX_GESTURE_MS = 20_000;

/**
 * Le geste mémorisé est-il « coincé » ? Vrai quand le doigt qu'il suit n'appuie plus (relâchement jamais reçu : toucher annulé
 * par Safari, geste système, relâchement sur une couche HTML), quand un nouvel appui arrive avec le même identifiant de doigt
 * (le précédent est donc fini), ou quand il dure depuis trop longtemps. Logique pure, testée dans tests/board-pointer.test.ts.
 */
export function staleGesture(o: { samePointer: boolean; pointerDown: boolean | undefined; ageMs: number }): boolean {
  if (o.samePointer) return true;
  if (o.pointerDown === false) return true;
  return o.ageMs > MAX_GESTURE_MS;
}
