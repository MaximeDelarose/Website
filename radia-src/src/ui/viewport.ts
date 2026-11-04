/**
 * Hauteur réelle de la fenêtre sous Safari (barres, clavier) : variables CSS `--vvh` (hauteur visible) et `--kb` (hauteur du clavier
 * estimée), classe `kb-open` sur <html>. Les fenêtres et feuilles s'en servent pour rester accessibles quand un champ de texte a le focus.
 */
import { keyboardHeight, isTextField } from './viewportLogic';

let started = false;

export function initViewport(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const root = document.documentElement;
  const apply = () => {
    const vv = window.visualViewport;
    const kb = vv ? keyboardHeight(window.innerHeight, vv.height, vv.offsetTop) : 0;
    try {
      root.style.setProperty('--vvh', `${Math.round(vv?.height ?? window.innerHeight)}px`);
      root.style.setProperty('--kb', `${kb}px`);
      root.classList.toggle('kb-open', kb > 0);
    } catch { /* styles indisponibles : sans importance */ }
  };
  apply();
  window.visualViewport?.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('scroll', apply);
  window.addEventListener('orientationchange', apply);
  // un champ qui prend le focus reste visible au-dessus du clavier
  document.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement | null;
    if (!t || !isTextField(t.tagName, t.isContentEditable)) return;
    window.setTimeout(() => { try { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { /* ancien navigateur */ } }, 320);
  });
  // le clavier se ferme : on remet la page à sa place (Safari laisse parfois un décalage)
  document.addEventListener('focusout', () => { window.setTimeout(() => { if (!isTextField(document.activeElement?.tagName ?? '', false)) window.scrollTo(0, 0); }, 120); });
}
