/** Feuille du bas (compacte) pour les détails du mode infini : on la ferme d'un toucher à côté. */
import { h, tap } from '../dom';
import { icon } from '../icons';
import { ui } from '../ui';
import { easeCount } from './logic';
import { reducedFx } from '../../core/app';

export interface SheetHandle { el: HTMLElement; close(): void; closed: Promise<void> }

export function openSheet(opts: { title: string; body: Node; accent?: string; sub?: string; className?: string }): SheetHandle {
  let done = false;
  let resolve!: () => void;
  const closed = new Promise<void>((r) => { resolve = r; });
  const close = () => {
    if (done) return;
    done = true;
    back.classList.add('leaving');
    window.setTimeout(() => back.remove(), 200);
    resolve();
  };
  const head = h('div.en-sheet-head',
    h('div.en-sheet-title', h('b', opts.title), opts.sub ? h('small', opts.sub) : null),
    h('button.icon-btn.en-sheet-x', { 'aria-label': 'Fermer', on: { click: tap(close, { sound: false }) } }, icon('close', 20)));
  const card = h('div.en-sheet', { role: 'dialog', 'aria-modal': 'true' }, h('i.en-grab'), head, h('div.en-sheet-body', opts.body));
  if (opts.accent) card.style.setProperty('--ac', opts.accent);
  if (opts.className) card.classList.add(opts.className);
  const back = h('div.en-sheet-back', card);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  ui.root.append(back);
  return { el: card, close, closed };
}

/** Compteur qui défile vers sa nouvelle valeur (sans animation si effets réduits). */
export function countTo(el: HTMLElement, to: number, fmtFn: (n: number) => string, delayMs = 0, ms = 600): void {
  const from = Number((el as HTMLElement & { _v?: number })._v ?? to);
  (el as HTMLElement & { _v?: number })._v = to;
  const stamp = (el as HTMLElement & { _t?: number })._t = (el as HTMLElement & { _t?: number })._t ? ((el as HTMLElement & { _t?: number })._t! + 1) : 1;
  if (from === to || reducedFx()) { el.textContent = fmtFn(to); return; }
  const t0 = performance.now() + delayMs;
  const step = (t: number) => {
    if ((el as HTMLElement & { _t?: number })._t !== stamp) return; // une valeur plus récente a pris le relais
    const k = (t - t0) / ms;
    if (k < 0) { requestAnimationFrame(step); return; }
    el.textContent = fmtFn(easeCount(from, to, k));
    if (k < 1) requestAnimationFrame(step);
    else el.textContent = fmtFn(to);
  };
  requestAnimationFrame(step);
}
