/**
 * Empêche le zoom de Safari iOS (double-tap, pincement) : le jeu est conçu pour tenir
 * exactement dans l'écran. Un double toucher rapide au même endroit ne zoome plus ;
 * le second toucher reste néanmoins un vrai clic (boutons « + », etc.).
 */
export function installNoZoom(): void {
  const opt = { passive: false } as AddEventListenerOptions;
  let lastEnd = 0;
  let lx = 0;
  let ly = 0;
  document.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (!t || e.touches.length > 0) return;
    const now = Date.now();
    const same = Math.abs(t.clientX - lx) < 40 && Math.abs(t.clientY - ly) < 40;
    if (now - lastEnd < 400 && same && e.cancelable) {
      e.preventDefault(); // supprime le zoom
      const el = e.target as HTMLElement | null;
      // le clic synthétique est supprimé avec : on le rejoue pour les éléments de l'interface
      if (el && el.tagName !== 'CANVAS' && typeof el.click === 'function') el.click();
    }
    lastEnd = now;
    lx = t.clientX;
    ly = t.clientY;
  }, opt);
  document.addEventListener('dblclick', (e) => e.preventDefault(), opt);
  for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, (e) => e.preventDefault(), opt);
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 && e.cancelable) e.preventDefault(); }, opt);
}
