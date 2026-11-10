/**
 * Champ de saisie de messagerie (Tindeur, Snapchien) : vrai <input> natif (le clavier iOS s'ouvre au toucher), bouton d'envoi, Entrée = envoi.
 * Le clavier reste ouvert après l'envoi. Police de 16 px (en dessous, Safari zoome la page). `trackKeyboard` adapte la mise en page
 * quand le clavier apparaît (visualViewport) pour ne cacher ni les messages ni le champ.
 */
import './composer.css';
import { h } from './dom';

export interface Composer { el: HTMLFormElement; input: HTMLInputElement; send: HTMLButtonElement; focus(): void; setDisabled(v: boolean): void }

export function createComposer(opts: { placeholder?: string; onSend: (text: string) => void; leading?: HTMLElement | null; maxLength?: number }): Composer {
  const input = h('input.cmp-in', { type: 'text', name: 'message', 'aria-label': 'Écrire un message', placeholder: opts.placeholder ?? 'Écrire un message…', maxlength: String(opts.maxLength ?? 500), autocomplete: 'off', autocapitalize: 'sentences', enterkeyhint: 'send', inputmode: 'text', spellcheck: 'true' }) as HTMLInputElement;
  const send = h('button.cmp-send', { type: 'submit', 'aria-label': 'Envoyer', disabled: 'true' }, h('span', '➤')) as HTMLButtonElement;
  const el = h('form.cmp', { autocomplete: 'off' }, opts.leading ?? null, input, send) as HTMLFormElement;
  const sync = (): void => { send.disabled = !input.value.trim(); };
  input.addEventListener('input', sync);
  el.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = input.value.trim(); if (!t) return;
    input.value = ''; sync();
    opts.onSend(t);
    input.focus({ preventScroll: true }); // le clavier reste ouvert pour enchaîner
  });
  // le bouton d'envoi ne vole pas le focus (sinon le clavier se ferme entre deux messages)
  send.addEventListener('pointerdown', (e) => { if (input.value.trim()) e.preventDefault(); });
  return { el, input, send, focus: () => input.focus({ preventScroll: true }), setDisabled: (v) => { input.disabled = v; if (v) send.disabled = true; else sync(); } };
}

/**
 * Suit le clavier virtuel : `el` (position absolue, plein cadre) remonte de la hauteur du clavier, de sorte que le champ et les derniers
 * messages restent visibles. Renvoie la fonction d'arrêt. Sans visualViewport (ordinateur), ne fait rien.
 */
export function trackKeyboard(el: HTMLElement, onChange?: (kb: number) => void): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => undefined;
  let last = -1;
  const apply = (): void => {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    const open = kb > 80;
    el.style.bottom = open ? `${kb}px` : '';
    el.classList.toggle('kb-open', open);
    if (vv.offsetTop > 0) window.scrollTo(0, 0); // Safari décale parfois la page : on la remet en place
    if (kb !== last) { last = kb; onChange?.(open ? kb : 0); }
  };
  vv.addEventListener('resize', apply); vv.addEventListener('scroll', apply); apply();
  return () => { vv.removeEventListener('resize', apply); vv.removeEventListener('scroll', apply); el.style.bottom = ''; el.classList.remove('kb-open'); };
}
