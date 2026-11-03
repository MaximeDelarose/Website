/** Mini-outil de création d'éléments HTML (sans framework). */
import { audio } from '../audio/AudioManager';
type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown> & { on?: Record<string, (e: Event) => void>; style?: Partial<CSSStyleDeclaration> | string };

/**
 * h('div.panel.big#id', { title: 'x', on: { click } }, enfants…)
 */
export function h<K extends keyof HTMLElementTagNameMap>(sel: K | `${K}.${string}` | `${K}#${string}`, attrs?: Attrs | Child, ...children: Child[]): HTMLElementTagNameMap[K];
export function h(sel: string, attrs?: Attrs | Child, ...children: Child[]): HTMLElement {
  const m = sel.match(/^([a-z0-9-]+)((?:[.#][\w-]+)*)$/i);
  const tag = m ? m[1] : 'div';
  const el = document.createElement(tag);
  if (m && m[2]) {
    for (const part of m[2].match(/[.#][\w-]+/g) ?? []) {
      if (part[0] === '.') el.classList.add(part.slice(1));
      else el.id = part.slice(1);
    }
  }
  let kids = children;
  if (attrs !== undefined && attrs !== null && (typeof attrs !== 'object' || attrs instanceof Node)) {
    kids = [attrs as Child, ...children];
  } else if (attrs && typeof attrs === 'object') {
    for (const [k, v] of Object.entries(attrs as Attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'on') {
        for (const [ev, fn] of Object.entries(v as Record<string, (e: Event) => void>)) el.addEventListener(ev, fn);
      } else if (k === 'style') {
        if (typeof v === 'string') el.setAttribute('style', v);
        else Object.assign(el.style, v);
      } else if (k === 'class') {
        el.className += ' ' + String(v);
      } else if (k === 'html') {
        el.innerHTML = String(v);
      } else if (k in el && typeof v !== 'string') {
        (el as unknown as Record<string, unknown>)[k] = v;
      } else {
        el.setAttribute(k, v === true ? '' : String(v));
      }
    }
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Enveloppe une action de bouton : son, anti double-toucher, retour visuel. */
export function tap(fn: (e: Event) => void, opts: { sound?: boolean; delay?: number } = {}): (e: Event) => void {
  let busy = false;
  return (e: Event) => {
    if (busy) return;
    busy = true;
    window.setTimeout(() => { busy = false; }, opts.delay ?? 350);
    if (opts.sound !== false) audio.play('button');
    fn(e);
  };
}

export function clear(el: HTMLElement): void { while (el.firstChild) el.removeChild(el.firstChild); }
