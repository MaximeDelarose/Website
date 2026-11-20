/** Lecture de la première manette connectée (mapping « standard »). Renvoie null si aucune. */
export interface PadState {
  /** -1 gauche, 0, 1 droite (croix ou stick). */
  x: number;
  /** -1 haut, 0, 1 bas. */
  y: number;
  /** Boutons pressés : index standard (0 = A/bas, 1 = B/droite, 2 = X/gauche, 3 = Y/haut). */
  buttons: boolean[];
}

const DEADZONE = 0.5;

export function readPad(): PadState | null {
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find((p): p is Gamepad => !!p && p.connected);
    if (!pad) return null;
    const b = (i: number): boolean => !!pad.buttons[i]?.pressed;
    const axisX = pad.axes[0] ?? 0;
    const axisY = pad.axes[1] ?? 0;
    return {
      x: (b(15) ? 1 : 0) - (b(14) ? 1 : 0) || (axisX > DEADZONE ? 1 : axisX < -DEADZONE ? -1 : 0),
      y: (b(13) ? 1 : 0) - (b(12) ? 1 : 0) || (axisY > DEADZONE ? 1 : axisY < -DEADZONE ? -1 : 0),
      buttons: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(b),
    };
  } catch {
    return null;
  }
}
