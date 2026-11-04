/** Cadre commun des scènes d'incident : calque plein écran, titre, bouton « plus tard », nettoyage. */
import '../incidents.css';
import { h, tap } from '../../../ui/dom';
import { ui } from '../../../ui/ui';
import { icon } from '../../../ui/icons';
import { reducedFx } from '../../../core/app';

export interface Frame {
  layer: HTMLElement;
  body: HTMLElement;
  /** Termine la scène (ok = réussie). */
  finish(ok: boolean, delay?: number): void;
  result: Promise<boolean>;
  alive(): boolean;
  later(fn: () => void, ms: number): void;
  onDispose(fn: () => void): void;
  setHint(t: string): void;
}

export function openFrame(title: string, hint = '', cls = ''): Frame {
  let done = false;
  const disposers: (() => void)[] = [];
  const timers = new Set<number>();
  let resolve!: (ok: boolean) => void;
  const result = new Promise<boolean>((r) => { resolve = r; });
  const hintEl = h('p.inc-hint', hint);
  const body = h('div.inc-body');
  const layer = h(`div.inc-layer${cls ? '.' + cls : ''}`,
    h('div.inc-top',
      h('button.icon-btn', { 'aria-label': 'Plus tard', on: { click: tap(() => finish(false), { sound: false }) } }, icon('close', 20)),
      h('b', title), h('span.spacer')),
    hintEl, body);
  ui.root.append(layer);
  function finish(ok: boolean, delay = 0) {
    if (done) return;
    const go = () => {
      if (done) return;
      done = true;
      for (const t of timers) window.clearTimeout(t);
      disposers.forEach((d) => { try { d(); } catch { /* ignore */ } });
      layer.classList.add('out');
      window.setTimeout(() => layer.remove(), reducedFx() ? 0 : 240);
      resolve(ok);
    };
    if (delay > 0) timers.add(window.setTimeout(go, delay)); else go();
  }
  return {
    layer, body, finish, result, alive: () => !done,
    later: (fn, ms) => { const t = window.setTimeout(() => { timers.delete(t); if (!done) fn(); }, ms); timers.add(t); },
    onDispose: (fn) => { disposers.push(fn); },
    setHint: (t) => { hintEl.textContent = t; },
  };
}

/** Pluie de confettis DOM légère (réduite si animations réduites). */
export function confettiBurst(host: HTMLElement, n = 22): void {
  const k = reducedFx() ? 6 : n;
  const cols = ['#ff75a8', '#f3c86b', '#b9a5e8', '#6fcf97', '#5aa9ff'];
  for (let i = 0; i < k; i++) {
    const c = h('i.inc-conf', { style: `left:${10 + Math.random() * 80}%;background:${cols[i % cols.length]};--dx:${Math.round((Math.random() - 0.5) * 120)}px;--rot:${Math.round(Math.random() * 540)}deg;animation-delay:${Math.round(Math.random() * 180)}ms` });
    host.append(c);
    window.setTimeout(() => c.remove(), 1700);
  }
}
