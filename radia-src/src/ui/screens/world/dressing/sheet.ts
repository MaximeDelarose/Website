/**
 * Glisser vertical du panneau du bas (tactile et souris) : suit le doigt, puis se cale sur un cran.
 * Un simple toucher sur une pastille reste un toucher : le glissement ne démarre qu'après quelques pixels.
 */
import { dragHeight, snapAfterDrag, type Snap } from './layout';

export interface SheetHooks {
  heights(): Record<Snap, number>;
  current(): number;
  /** Hauteur provisoire pendant le glissement (sans animation). */
  live(h: number): void;
  /** Cran final (avec animation). */
  settle(s: Snap): void;
}

const THRESHOLD = 7;

/** Attache le glissement à ces zones ; renvoie la fonction de nettoyage. */
export function attachSheetDrag(grips: HTMLElement[], hooks: SheetHooks): () => void {
  const offs: (() => void)[] = [];
  for (const g of grips) {
    let id = -1;
    let y0 = 0;
    let h0 = 0;
    let dragging = false;
    let samples: { t: number; y: number }[] = [];
    let lastH = 0;
    const down = (e: PointerEvent): void => {
      if (id !== -1 || (e.pointerType === 'mouse' && e.button !== 0)) return;
      id = e.pointerId; y0 = e.clientY; h0 = hooks.current(); dragging = false; samples = [{ t: e.timeStamp, y: e.clientY }];
      // le suivi se fait sur la fenêtre : la souris peut quitter la zone, le doigt garde la capture implicite
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    };
    const move = (e: PointerEvent): void => {
      if (e.pointerId !== id) return;
      const dy = e.clientY - y0;
      if (!dragging) {
        if (Math.abs(dy) < THRESHOLD) return;
        dragging = true;
      }
      samples.push({ t: e.timeStamp, y: e.clientY });
      if (samples.length > 6) samples.shift();
      lastH = dragHeight(h0, dy, hooks.heights());
      hooks.live(lastH);
      e.preventDefault();
    };
    const end = (e: PointerEvent): void => {
      if (e.pointerId !== id) return;
      const was = dragging;
      id = -1; dragging = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (!was) return;
      // vitesse sur les derniers instants (px/ms, positif = vers le haut)
      const a = samples[0];
      const b = samples[samples.length - 1];
      const dt = Math.max(1, b.t - a.t);
      const v = e.type === 'pointercancel' ? 0 : (a.y - b.y) / dt;
      hooks.settle(snapAfterDrag(lastH, v, hooks.heights()));
      // le relâchement ne doit pas déclencher le bouton sous le doigt
      const stop = (ev: Event): void => { ev.stopPropagation(); ev.preventDefault(); };
      g.addEventListener('click', stop, { capture: true, once: true });
      window.setTimeout(() => g.removeEventListener('click', stop, true), 80);
    };
    g.addEventListener('pointerdown', down);
    offs.push(() => { g.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); });
  }
  return () => offs.forEach((f) => f());
}
