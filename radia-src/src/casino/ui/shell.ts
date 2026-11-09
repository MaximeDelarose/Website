/** Coque du casino : écran plein cadre au-dessus du jeu, en-tête (retour, titre, solde, aide), changement de scène. */
import { attachResourceInfo } from '../../ui/components/resourceInfo';
import { h } from '../../ui/dom';
import { audio } from '../../core/app';
import { haptic } from '../../core/haptics';
import { fmt } from '../../core/wallet';
import { resIconUrl as coinIcon } from '../../game/art/world/resources';
import { balance } from '../bank';
const coinUrl = (n: number): string => coinIcon('coins', n);
import { bounce, rollNumber, shake, flyChips, centerOf, type Pt } from '../fx';
import { cs, persist, notifyCasino } from '../store';
import { returnBring } from '../chips';
import { markTask } from '../tickets';

export interface Scene {
  el: HTMLElement; title: string;
  /** Contenu de l'aide (règles, probabilités) de CETTE scène. */
  help(): HTMLElement;
  onBack(): void;
  dispose?(): void;
  /** Manche en cours d'animation : le retour est suspendu. */
  busy?(): boolean;
}

export interface Shell {
  root: HTMLElement; stage: HTMLElement; balEl: HTMLElement; pill: HTMLElement;
  /** Solde réel de la table. */
  table(): number;
  /** Valeur affichée dans le compteur. */
  shown: number;
  show(s: Scene): void;
  /** Met le compteur à la valeur réelle (sans animation) ou la fait défiler. */
  sync(animate?: boolean): Promise<void>;
  setShown(n: number): void;
  fly(from: Pt | Element, n: number, value?: number): Promise<void>;
  alive(): boolean;
  exit(): void;
  openHelp(): void;
}

let current: Shell | null = null;
export const isOpen = (): boolean => !!current;

export function createShell(onClose: () => void): Shell {
  let scene: Scene | null = null;
  let dead = false;
  const balEl = h('b.cz-bal', fmt(balance()));
  const pill = h('div.cz-pill', { 'aria-label': 'Pièces' }, h('img', { src: coinUrl(36), alt: '', draggable: false }), balEl);
  attachResourceInfo(pill, 'coins');
  const title = h('h1.cz-title', '');
  const back = h('button.cz-ibtn.cz-back', { 'aria-label': 'Retour' }, '‹');
  const help = h('button.cz-ibtn.cz-helpbtn', { 'aria-label': 'Aide : règles et probabilités' }, '?');
  const stage = h('div.cz-stage');
  const root = h('div.cz-root', h('div.cz-head', back, title, pill, help), stage);
  const sh: Shell = {
    root, stage, balEl, pill, shown: balance(),
    table: () => balance(),
    show(s) {
      scene?.dispose?.();
      scene = s;
      title.textContent = s.title;
      stage.replaceChildren(s.el);
      s.el.classList.add('cz-scene');
      stage.scrollTop = 0;
    },
    setShown(n) { sh.shown = n; balEl.textContent = fmt(n); },
    async sync(animate = false) {
      const to = balance();
      if (animate) { const from = sh.shown; sh.shown = to; await rollNumber(balEl, from, to, 700); bounce(pill, 1.1); } else sh.setShown(to);
    },
    fly: (from, n, value) => flyChips('x' in from ? from : centerOf(from), pill, n, value),
    alive: () => !dead,
    exit() {
      if (dead) return;
      dead = true;
      scene?.dispose?.();
      const k = returnBring(cs());
      persist(); notifyCasino();
      root.classList.add('leaving');
      window.setTimeout(() => root.remove(), 220);
      current = null;
      onClose();
      void k;
    },
    openHelp() {
      if (!scene) return;
      audio.play('select');
      try { markTask(cs(), 'rules'); persist(); } catch { /* mini-défi : jamais bloquant */ }
      const card = h('div.cz-helpcard', { role: 'dialog', 'aria-modal': 'true' }, h('h2', `Aide · ${scene.title}`), h('div.cz-helpbody', scene.help()), h('button.btn.gold.cz-close', 'J\'ai compris ♡'));
      const bd = h('div.cz-helpback', card);
      const close = () => { bd.classList.add('leaving'); window.setTimeout(() => bd.remove(), 180); };
      bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
      card.querySelector('.cz-close')!.addEventListener('click', close);
      root.append(bd);
    },
  };
  back.addEventListener('click', () => {
    if (!scene) return;
    if (scene.busy?.()) { shake(back); haptic('error'); return; }
    audio.play('button'); scene.onBack();
  });
  help.addEventListener('click', () => sh.openHelp());
  const host = document.getElementById('ui') ?? document.body;
  host.append(root);
  current = sh;
  return sh;
}

export const currentShell = (): Shell | null => current;
