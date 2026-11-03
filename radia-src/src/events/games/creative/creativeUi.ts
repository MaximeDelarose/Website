/** Interface partagée des mini-jeux créatifs (DOM). */
import { h } from '../../../ui/dom';
import type { ActivityCtx } from '../../types';

const CSS = `
.cr-wrap{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;position:relative}
.cr-dots{display:flex;gap:6px;justify-content:center;align-items:center;flex-shrink:0;min-height:18px}
.cr-dots i{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.75);box-shadow:0 0 0 1.5px rgba(88,67,63,.18);transition:transform .2s}
.cr-dots i.done{background:var(--rose-deep)}
.cr-dots i.cur{background:var(--or);transform:scale(1.4)}
.cr-dots small{margin-left:8px;color:var(--choco-soft);font-size:13px}
.cr-panel{flex:none;display:flex;flex-direction:column;gap:8px;background:rgba(255,255,255,.62);border-radius:22px;padding:10px;box-shadow:0 0 0 2px rgba(255,255,255,.7) inset,0 4px 14px rgba(59,49,82,.12)}
.cr-q{margin:0;text-align:center;font-size:17px;font-weight:700;color:var(--nuit);line-height:1.2;flex-shrink:0}
.cr-grid{display:grid;grid-template-columns:repeat(var(--cols,4),1fr);gap:7px;flex-shrink:0}
.cr-tile{position:relative;min-height:54px;border:0;border-radius:16px;background:#fff;box-shadow:0 0 0 2.5px rgba(88,67,63,.14),0 3px 0 rgba(88,67,63,.1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:3px 2px;font:inherit;font-size:12px;font-weight:700;color:var(--choco);text-align:center;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.cr-tile:active{transform:translateY(2px)}
.cr-tile img,.cr-tile canvas{display:block;pointer-events:none}
.cr-tile.on{box-shadow:0 0 0 3px var(--rose-vif),0 3px 0 rgba(232,85,143,.35);background:#fff3f8}
.cr-tile.rec::after{content:'\\2605';position:absolute;top:1px;left:5px;color:var(--or);font-size:13px}
.cr-tile .cnt{position:absolute;top:-4px;right:-2px;min-width:20px;height:20px;border-radius:10px;background:var(--rose-deep);color:#fff;font-size:12px;line-height:20px;text-align:center;box-shadow:0 0 0 2px #fff}
.cr-tile[disabled]{opacity:.45}
.cr-row{display:flex;gap:8px;flex-shrink:0}
.cr-row .btn{flex:1;min-width:0;padding-left:8px;padding-right:8px}
.cr-note{margin:0;text-align:center;font-size:13px;color:var(--choco-soft);min-height:18px;flex-shrink:0}
.cr-spacer{flex:1;min-height:0}
.cr-end{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:6px}
.cr-end h3{margin:0;font-size:22px;color:var(--nuit)}
.cr-end p{margin:0;font-size:16px;color:var(--choco);max-width:300px}
.cr-end .stars{font-size:34px;letter-spacing:4px;color:var(--or);text-shadow:0 2px 0 rgba(88,67,63,.2)}
.cr-end .art{animation:crFloat 2.4s ease-in-out infinite}
@keyframes crFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.cr-bubble{position:absolute;z-index:5;max-width:210px;background:#fffaf5;border-radius:16px;padding:7px 11px;font-size:14px;line-height:1.25;color:var(--choco);box-shadow:0 0 0 2.5px #f5a0bb,0 4px 12px rgba(59,49,82,.2);animation:evPop .35s var(--ease-pop)}
.cr-bubble::after{content:'';position:absolute;bottom:-9px;left:24px;width:14px;height:14px;background:#fffaf5;transform:rotate(45deg);box-shadow:3px 3px 0 0 #f5a0bb}
@keyframes crPulse{0%,100%{opacity:.7}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.cr-end .art{animation:none}}
`;

/** Ajoute (une fois) la feuille de style partagée dans le conteneur de l'activité. */
export function useStyles(ctx: ActivityCtx): void {
  if (ctx.root.querySelector('style[data-cr]')) return;
  const s = h('style', { 'data-cr': '1' });
  s.textContent = CSS;
  ctx.root.append(s);
}

export function dots(total: number): { el: HTMLElement; set(cur: number, note?: string): void } {
  const el = h('div.cr-dots');
  const set = (cur: number, note?: string) => {
    el.replaceChildren(...Array.from({ length: total }, (_, i) => h(`i${i < cur ? '.done' : i === cur ? '.cur' : ''}`)), ...(note ? [h('small', note)] : []));
  };
  set(0);
  return { el, set };
}

export const starString = (n: number): string => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));

/** Écran de fin : remplace le contenu de l'activité et attend le bouton. */
export async function endScreen(ctx: ActivityCtx, o: { title: string; art?: HTMLElement | null; stars?: number; line: string; sub?: string; btn?: string }): Promise<void> {
  ctx.root.replaceChildren();
  useStyles(ctx);
  const done = new Promise<void>((resolve) => {
    const btn = ctx.button(o.btn ?? 'Continuer ♡', () => resolve(), 'gold');
    const box = h('div.cr-end', {},
      o.art ? h('div.art', o.art) : null,
      h('h3', o.title),
      o.stars ? h('div.stars', starString(o.stars)) : null,
      h('p', o.line),
      o.sub ? h('p', { style: 'font-size:13px;color:var(--choco-soft)' }, o.sub) : null,
      btn);
    ctx.root.append(box);
    ctx.pop(box);
    if (o.art) ctx.pop(o.art);
  });
  ctx.sound('victory');
  ctx.confetti(34);
  await done;
}

/** Résout quand `cond` devient vrai (clic sur un bouton « suivant »). */
export function gate(): { wait: Promise<void>; open(): void } {
  let open!: () => void;
  const wait = new Promise<void>((r) => { open = r; });
  return { wait, open };
}

/** Bulle de réaction non bloquante (se remplace à chaque appel). */
export function bubble(ctx: ActivityCtx, host: HTMLElement, text: string, css: string): HTMLElement {
  host.querySelectorAll('.cr-bubble').forEach((b) => b.remove());
  const b = h('div.cr-bubble', { style: css }, text);
  host.append(b);
  ctx.later(() => { b.style.transition = 'opacity .3s'; b.style.opacity = '0'; ctx.later(() => b.remove(), 350); }, 3600);
  return b;
}
