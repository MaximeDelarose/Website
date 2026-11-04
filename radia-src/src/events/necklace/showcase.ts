/**
 * Vitrine de « L'Éclat Éternel ♡ » (dressing) : on voit le bijou, mais il ne s'achète pas.
 * Aucun prix numérique ; bouton « Cadeau mystérieux — Verrouillé » à la place d'« Acheter ».
 */
import './necklace.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { icon } from '../../ui/icons';
import { audio, reducedFx } from '../../core/app';
import { canvasUrl, makeCanvas } from '../../game/art/kit';
import { drawNecklaceBig } from '../../game/art/world/avatarNecklace';
import { shineAt } from '../../game/art/world/wristShine';
import { NECKLACE_DESC, NECKLACE_NAME, NECKLACE_RARITY, SHOWCASE_BUTTON, SHOWCASE_NOTE, SHOWCASE_PRICE } from './data';

/** Illustration du collier (dessin en cache) pour les vignettes du dressing, en data-URL carrée. */
export function necklaceThumbUrl(px = 192): string {
  return canvasUrl(`nl:thumb:${px}`, () => {
    const c = makeCanvas(px, px);
    const g = c.getContext('2d')!;
    drawNecklaceBig(g, px / 2, px * 0.42, px * 0.78, 0, 0);
    return c;
  });
}

const dprNow = (): number => Math.min(2, Math.max(1, window.devicePixelRatio || 1));

/** Canvas animé (reflets périodiques) ; renvoie l'élément et une fonction d'arrêt. */
export function animatedNecklace(w = 300, hh = 230, bg = true): { el: HTMLCanvasElement; stop: () => void } {
  const d = dprNow();
  const el = document.createElement('canvas');
  el.width = Math.round(w * d); el.height = Math.round(hh * d);
  el.className = 'nl-art';
  const g = el.getContext('2d')!;
  let raf = 0; let last = 0; let alive = true;
  const draw = (t: number): void => {
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, w, hh);
    void bg;
    drawNecklaceBig(g, w / 2, hh * 0.33, w * 0.62, shineAt(t, reducedFx()), 1);
  };
  const loop = (now: number): void => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    if (now - last < 50) return;
    last = now;
    draw(now / 1000);
  };
  draw(0);
  if (!reducedFx()) raf = requestAnimationFrame(loop);
  return { el, stop: () => { alive = false; cancelAnimationFrame(raf); } };
}

/** Fiche de la vitrine : illustration, rareté, description, « Prix : Inestimable ♡ », bouton verrouillé. */
export function openNecklaceShowcase(): Promise<void> {
  return new Promise((resolve) => {
    const art = animatedNecklace();
    const lock = h('button.nl-lock', { disabled: true, 'aria-disabled': 'true' }, icon('lock', 18), SHOWCASE_BUTTON);
    const close = h('button.btn.secondary.nl-close', { on: { click: tap(() => end(), { sound: false }) } }, 'Fermer');
    const card = h('div.nl-show', { role: 'dialog', 'aria-modal': 'true', 'aria-label': NECKLACE_NAME },
      h('h3', NECKLACE_NAME),
      h('span.nl-rarity', icon('star', 12), NECKLACE_RARITY),
      art.el,
      h('p.nl-desc', NECKLACE_DESC),
      h('p.nl-price', SHOWCASE_PRICE),
      h('p.nl-note', SHOWCASE_NOTE),
      lock, close);
    const back = h('div.nl-show-back', card);
    back.addEventListener('click', (e) => { if (e.target === back) end(); });
    ui.root.append(back);
    audio.play('sparkle');
    function end(): void {
      art.stop();
      back.classList.add('out');
      window.setTimeout(() => back.remove(), 230);
      resolve();
    }
  });
}
