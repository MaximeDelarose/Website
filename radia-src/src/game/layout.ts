/** Mesures de l'écran : taille CSS, densité de pixels, zones sûres (encoche, Dynamic Island…). */
export interface Insets { top: number; bottom: number; left: number; right: number }

let probe: HTMLDivElement | null = null;

export function safeInsets(): Insets {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}

export function viewport(): { w: number; h: number; dpr: number } {
  const app = document.getElementById('app');
  const w = Math.max(1, Math.round(app?.clientWidth ?? window.innerWidth));
  const h = Math.max(1, Math.round(app?.clientHeight ?? window.innerHeight));
  return { w, h, dpr: renderDpr() };
}

let lowFx = false;
export const setLowFx = (v: boolean) => { lowFx = v; };

/** Densité de rendu du canvas : 3 max (iPhone), 2 en mode effets réduits. */
export function renderDpr(): number {
  const d = window.devicePixelRatio || 1;
  return Math.min(lowFx ? 2 : 3, Math.max(1, d));
}
