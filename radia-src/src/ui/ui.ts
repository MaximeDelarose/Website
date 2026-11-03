/**
 * Gestion de l'interface HTML posée au-dessus du canvas Phaser :
 * écrans plein cadre, fenêtres modales, notifications, bulles.
 */
import { h, tap } from './dom';
import { icon } from './icons';

const root = () => document.getElementById('ui')!;

let currentScreen: HTMLElement | null = null;
let toastWrap: HTMLElement | null = null;

export interface ModalAction { label: string; value: string; style?: 'primary' | 'secondary' | 'lavande' | 'gold' }

export const ui = {
  get root() { return root(); },

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
      root().append(toastWrap);
    }
    const ic = o.img
      ? h('img', { src: o.img, alt: '', style: 'width:38px;height:38px;object-fit:contain' })
      : h('span.t-icon', icon(o.icon ?? 'star', 20));
    const t = h('div.toast', ic, h('div', o.title, o.sub ? h('small', o.sub) : null));
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
