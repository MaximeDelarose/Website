/** Logique pure des mesures de fenêtre (testée sans navigateur). */

/** Hauteur du clavier : différence entre la fenêtre de mise en page et la fenêtre visible. Sous 80 px : barres Safari, pas de clavier. */
export function keyboardHeight(innerH: number, visibleH: number, offsetTop = 0): number {
  const d = Math.round(innerH - visibleH - offsetTop);
  return d >= 80 ? d : 0;
}

export function isTextField(tag: string, editable: boolean): boolean {
  const t = tag.toUpperCase();
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || editable;
}

/** Espace laissé libre en bas : marge de sécurité + clavier. */
export function bottomGap(sab: number, kb: number, base = 14): number {
  return Math.max(0, sab) + Math.max(0, kb) + base;
}
