/** Petit bus d'événements pour les effets visuels (étincelles, variation de score, secousse d'écran). */
export interface BurstOptions {
  x: number;
  y: number;
  color?: string;
  count?: number;
  power?: number;
}

type Listener<T> = (payload: T) => void;

function channel<T>() {
  const listeners = new Set<Listener<T>>();
  return {
    emit(payload: T) {
      listeners.forEach((l) => l(payload));
    },
    on(listener: Listener<T>) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const burstBus = channel<BurstOptions>();
export const scoreBus = channel<number>();
export const shakeBus = channel<"soft" | "hard">();

/** Étincelles au centre d'un élément. */
export function burstAt(el: Element | null, opts: Omit<BurstOptions, "x" | "y"> = {}): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burstBus.emit({ x: r.left + r.width / 2, y: r.top + r.height / 2, ...opts });
}
