/** Carte-souvenir « Une promesse au poignet ♡ » (à insérer dans le téléphone) + styles de la cérémonie du bracelet. */
import type { PhotoRec } from '../types';
import { renderPhoto } from '../photo/render';
import { drawBraceletBig } from '../../game/art/world/avatarWrist';
import { glow, makeCanvas } from '../../game/art/kit';
import { PROMISE_DESC, PROMISE_LINES, PROMISE_MEMORY, PROMISE_TITLE } from '../bracelet/data';

const CSS = `
.br-cv { position: absolute; left: calc(-1 * (var(--sal, 0px) + 14px)); top: calc(-1 * (var(--sat, 0px) + 10px)); width: calc(100% + var(--sal, 0px) + var(--sar, 0px) + 28px); height: calc(100% + var(--sat, 0px) + var(--sab, 0px) + 22px); display: block; z-index: 0; pointer-events: none; }
.br-act { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 7; min-width: 230px; max-width: 92%; animation: brIn 0.45s var(--ease-pop, ease-out) backwards; }
.br-act.out { animation: fadeOut 0.2s ease forwards; pointer-events: none; }
.br-ask { position: absolute; left: 0; right: 0; bottom: 0; z-index: 7; display: flex; flex-direction: column; align-items: stretch; gap: 8px; padding: 14px 14px 14px; border-radius: 24px; background: rgba(255, 250, 245, 0.96); box-shadow: 0 0 0 3px #f3c86b, 0 -8px 26px rgba(30, 14, 50, 0.4); animation: brIn 0.45s var(--ease-pop, ease-out) backwards; }
.br-ask.out { animation: fadeOut 0.2s ease forwards; pointer-events: none; }
.br-ask p { margin: 0 0 2px; text-align: center; font-size: 20px; font-weight: 700; color: var(--rose-deep, #e8558f); }
.br-ask .btn { width: 100%; }
@keyframes brIn { from { opacity: 0; transform: translate(-50%, 18px) scale(0.92); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
.br-ask { animation-name: brAskIn; }
@keyframes brAskIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
.pc-card { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 14px 12px 14px; border-radius: 22px; background: linear-gradient(180deg, #fffaf0, #fff0f5); box-shadow: 0 0 0 2.5px #f3c86b; text-align: center; }
.pc-title { margin: 0; font-size: 19px; color: var(--rose-deep, #e8558f); }
.pc-photo { width: min(70%, 230px); height: auto; border-radius: 10px; box-shadow: 0 6px 18px rgba(59, 49, 82, 0.35); transform: rotate(-1.5deg); background: #fff; }
.pc-jewel { width: min(78%, 250px); height: auto; display: block; }
.pc-name { margin: 0; font-size: 17px; font-weight: 800; color: var(--choco, #58433f); }
.pc-desc { margin: 0; font-size: 14px; line-height: 1.35; color: var(--choco-soft, #7d6862); }
.pc-quotes { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.pc-quotes blockquote { margin: 0; padding: 9px 12px; border-radius: 16px 16px 16px 5px; background: #f1e8ff; font-size: 14.5px; line-height: 1.35; color: var(--choco, #58433f); text-align: left; }
.pc-card .btn { width: 100%; min-height: 46px; }
`;

let injected = false;
export function ensurePromiseStyles(): void {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const st = document.createElement('style');
  st.id = 'br-styles';
  st.textContent = CSS;
  document.head.append(st);
}

/** Illustration du bracelet seul, en grand (canvas), sur un halo doré. */
export function braceletIllustration(w = 250, h = 165, shine = 0): HTMLCanvasElement {
  const dpr = Math.min(2, Math.max(1, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));
  const c = makeCanvas(w * dpr, h * dpr);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  glow(g, w / 2, h * 0.5, Math.min(w, h) * 0.62, '#FFD98A', 0.55);
  drawBraceletBig(g, w / 2, h * 0.42, Math.min(w * 0.62, h * 0.95), shine);
  c.style.aspectRatio = `${w} / ${h}`;
  return c;
}

/** Carte du souvenir : photo de la soirée (si fournie), bracelet, description, les quatre phrases, « Revoir la scène ». */
export function buildPromiseCard(opts: { photo?: PhotoRec; onReplay?: () => void }): HTMLElement {
  ensurePromiseStyles();
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag);
    e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const card = el('div', 'pc-card');
  card.append(el('h3', 'pc-title', PROMISE_MEMORY));
  if (opts.photo) {
    try {
      const p = renderPhoto(opts.photo, 300, 375);
      p.className = 'pc-photo';
      card.append(p);
    } catch { /* la carte reste complète sans la photo */ }
  }
  const jewel = braceletIllustration();
  jewel.className = 'pc-jewel';
  card.append(jewel, el('p', 'pc-name', PROMISE_TITLE), el('p', 'pc-desc', PROMISE_DESC));
  const quotes = el('div', 'pc-quotes');
  for (const l of PROMISE_LINES) quotes.append(el('blockquote', '', l));
  card.append(quotes);
  const btn = el('button', 'btn small ev-btn gold', 'Revoir la scène');
  btn.type = 'button';
  btn.addEventListener('click', () => opts.onReplay?.());
  card.append(btn);
  return card;
}
