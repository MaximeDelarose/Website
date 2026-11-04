/**
 * Gestion de l'interface HTML posée au-dessus du canvas Phaser :
 * écrans plein cadre, fenêtres modales, notifications, bulles.
 */
import { h, tap } from './dom';
import { icon } from './icons';
import { initViewport } from './viewport';

const root = () => document.getElementById('ui')!;

let currentScreen: HTMLElement | null = null;
let toastWrap: HTMLElement | null = null;
let toastDock: HTMLElement | null = null;

/**
 * Filet de sécurité durable : un enfant direct de #ui qui garde `leaving`/`out` plus de 1,6 s (minuteur perdu, onglet mis en veille,
 * exception pendant la fermeture) est retiré. Sans cela, un calque invisible ou assombri pourrait rester au-dessus de l'interface.
 */
let janitor: MutationObserver | null = null;
const STALE_MS = 1600;
const isLeaving = (e: Element) => e.classList.contains('leaving') || e.classList.contains('out');
function watchStale(el: Element): void {
  if (!isLeaving(el)) return;
  window.setTimeout(() => { if (el.isConnected && el.parentElement === root() && isLeaving(el)) el.remove(); }, STALE_MS);
}
function ensureJanitor(): void {
  if (janitor || typeof MutationObserver === 'undefined') return;
  const r = document.getElementById('ui');
  if (!r) return;
  initViewport();
  janitor = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && m.target.parentElement === r) watchStale(m.target as Element);
      else if (m.type === 'childList') m.addedNodes.forEach((n) => { if (n instanceof Element) watchStale(n); });
    }
  });
  janitor.observe(r, { childList: true, attributes: true, attributeFilter: ['class'], subtree: true });
}

export interface ModalAction { label: string; value: string; style?: 'primary' | 'secondary' | 'lavande' | 'gold' }

export const ui = {
  get root() { ensureJanitor(); return root(); },

  /**
   * Retire TOUT de suite les écrans qui sont déjà en train de partir (ou tous sauf l'écran courant) : à appeler quand un calque de jeu
   * (HUD du plateau…) s'affiche, pour qu'un écran en fondu ne transparaisse pas derrière lui.
   */
  flushScreens(): void {
    for (const e of Array.from(root().children)) {
      if (e.classList.contains('screen') && e !== currentScreen) e.remove();
    }
  },

  /** Les notifications de `toast` s'empilent dans ce conteneur (au-dessus des boutons, pas sur eux) ; `null` : retour au calque général. */
  setToastDock(el: HTMLElement | null): void {
    toastDock = el;
    if (toastWrap && toastWrap.isConnected) { (el && el.isConnected ? el : root()).append(toastWrap); }
  },

  /** Remplace l'écran courant (animation de sortie/entrée). */
  showScreen(el: HTMLElement): HTMLElement {
    const prev = currentScreen;
    if (prev) {
      prev.classList.add('leaving');
      prev.style.pointerEvents = 'none';
      window.setTimeout(() => prev.remove(), 240);
    }
    currentScreen = el;
    el.classList.add('screen');
    ensureJanitor();
    root().prepend(el);
    return el;
  },

  closeScreen(): void {
    const prev = currentScreen;
    currentScreen = null;
    if (!prev) return;
    prev.classList.add('leaving');
    prev.style.pointerEvents = 'none';
    window.setTimeout(() => prev.remove(), 240);
  },

  get screen() { return currentScreen; },

  /** En-tête d'écran standard : bouton retour + titre. */
  header(title: string, onBack: () => void, right?: Node): HTMLElement {
    return h('div.screen-head',
      h('button.icon-btn', { 'aria-label': 'Retour', on: { click: tap(onBack) } }, icon('back')),
      h('h2', title),
      right ?? h('div.spacer'),
    );
  },

  /** Fenêtre modale ; résout la valeur du bouton choisi (ou null si fermée). */
  modal(opts: { title?: string; body?: Node | string; actions: ModalAction[]; dismissible?: boolean; row?: boolean; className?: string }): Promise<string | null> {
    return new Promise((resolve) => {
      let done = false;
      const close = (v: string | null) => {
        if (done) return;
        done = true;
        back.classList.add('leaving');
        window.setTimeout(() => back.remove(), 180);
        resolve(v);
      };
      const body = typeof opts.body === 'string' ? h('p', opts.body) : opts.body ?? null;
      const card = h('div.modal.panel', { role: 'dialog', 'aria-modal': 'true' },
        opts.title ? h('h2', opts.title) : null,
        body,
        h(`div.actions${opts.row ? '.row' : ''}`,
          ...opts.actions.map((a) => h(`button.btn${a.style && a.style !== 'primary' ? '.' + a.style : ''}`, { on: { click: tap(() => close(a.value)) } }, a.label))),
      );
      if (opts.className) card.classList.add(opts.className);
      const back = h('div.modal-backdrop', card);
      back.addEventListener('click', (e) => { if (e.target === back && opts.dismissible !== false) close(null); });
      ensureJanitor();
      root().append(back);
    });
  },

  async confirm(title: string, text: string, yes = 'Oui', no = 'Annuler'): Promise<boolean> {
    const v = await ui.modal({ title, body: text, actions: [{ label: yes, value: 'y' }, { label: no, value: 'n', style: 'secondary' }] });
    return v === 'y';
  },

  /** Notification en haut de l'écran. `img` : URL d'image ou nom d'icône. */
  toast(o: { title: string; sub?: string; icon?: string; img?: string; ms?: number }): void {
    if (!toastWrap || !toastWrap.isConnected) {
      toastWrap = h('div.toasts.passthrough');
      ensureJanitor();
      (toastDock && toastDock.isConnected ? toastDock : root()).append(toastWrap);
    } else if (toastDock && toastDock.isConnected && toastWrap.parentElement !== toastDock) toastDock.append(toastWrap);
    else if (!toastDock && toastWrap.parentElement !== root()) root().append(toastWrap);
    const ic = o.img
      ? h('img', { src: o.img, alt: '', style: 'width:38px;height:38px;object-fit:contain' })
      : h('span.t-icon', icon(o.icon ?? 'star', 20));
    const t = h('div.toast', ic, h('div', o.title, o.sub ? h('small', o.sub) : null));
    // au plus 2 notifications à la fois : la plus ancienne s'efface
    while (toastWrap.children.length >= 2) toastWrap.firstElementChild?.remove();
    toastWrap.append(t);
    window.setTimeout(() => { t.classList.add('out'); window.setTimeout(() => t.remove(), 320); }, o.ms ?? 2600);
  },

  /** Bulle de dialogue ancrée à un point de l'écran (coordonnées CSS). */
  bubble(text: string, x: number, y: number, ms = 3200): HTMLElement {
    const b = h('div.bubble', text);
    b.style.left = `${Math.max(8, x)}px`;
    b.style.bottom = `${Math.max(8, window.innerHeight - y)}px`;
    root().append(b);
    window.setTimeout(() => { b.classList.add('out'); window.setTimeout(() => b.remove(), 320); }, ms);
    return b;
  },
};
