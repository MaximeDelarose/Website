/**
 * Scène secrète « Tindeur » : une fausse appli de rencontres DANS le jeu (aucune vraie appli, aucune connexion, aucun accès
 * à l'appareil). Notification, écran de l'appli, deux choix fonctionnels. Aucun malus, aucun jugement.
 */
import './tindeur.css';
import '../events.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { audio, save, reducedFx } from '../../core/app';
import { haptic } from '../../core/haptics';
import { emitPhone, registerBusy } from '../bus';
import { showNotice } from '../incidents/notice';
import { tindeurLogo } from './icon';
import { choose, setInstalled, TEXTS, tryUninstall, UNINSTALL_REFUSAL } from './logic';
import { speakerFace } from '../ctx';

let layer: HTMLElement | null = null;
registerBusy(() => !!layer);

/** Les deux notifications successives : « 2 500 matchs » puis « nouveau match » avec « Voir ». */
export function announceTindeur(): void {
  const n = showNotice({ icon: 'tindeur', title: 'Tindeur', text: TEXTS.matches, actions: [], variant: 'tindeur' });
  if (!n) return;
  window.setTimeout(() => {
    n.setText(TEXTS.newMatch);
    n.setActions([{ label: 'Voir', run: () => openTindeur() }, { label: 'Plus tard', secondary: true, run: () => undefined }]);
    audio.play('sparkle'); haptic('reward');
  }, 2600);
}

/** Ouvre Tindeur : la scène « 2 500 matchs » tant que la joueuse n'a pas répondu, sinon l'appli jouable (pile de cartes + messages). */
export function openTindeur(): void {
  const t = save.data.fun.tindeur;
  if (layer || document.querySelector('.sw-app')) return;
  if (t.installed && t.shown && t.choice === 'none') { openTindeurScene(); return; }
  void import('./swipe/ui').then((m) => m.openSwipeApp());
}

/** Scène secrète : compteur de matchs, nouveau match, choix garder / désinstaller. */
export function openTindeurScene(): void {
  if (layer) return;
  const t = save.data.fun.tindeur;
  let step: 'count' | 'match' = 'count';
  const root = h('div.tdr-layer');
  layer = root;
  ui.root.append(root);
  const close = () => { root.classList.add('out'); window.setTimeout(() => root.remove(), 260); layer = null; emitPhone(); };

  const counter = h('b.tdr-num', '0');
  const render = () => {
    root.replaceChildren();
    const head = h('div.tdr-head', h('button.icon-btn.tdr-x', { 'aria-label': 'Fermer', on: { click: tap(close, { sound: false }) } }, '×'), h('div.tdr-brand', tindeurLogo(34, false), h('b', 'Tindeur')), h('span.spacer'));
    const foot = h('p.tdr-fine', 'Appli imaginaire du jeu RADIA : rien n’est connecté à ton vrai téléphone.');
    if (step === 'count') {
      root.append(head, h('div.tdr-count',
        h('div.tdr-hearts', ...Array.from({ length: 9 }, (_, i) => h('i', { style: `left:${8 + i * 10}%;animation-delay:${i * 230}ms` }, '♥'))),
        h('p', 'Vous avez'), counter, h('p', 'matchs !'),
        h('button.btn.tdr-go', { on: { click: tap(() => { step = 'match'; render(); }) } }, 'Voir le nouveau match')), foot);
      const target = 2500; const t0 = performance.now(); const dur = reducedFx() ? 1 : 1400;
      const tick = (now: number) => { const k = Math.min(1, (now - t0) / dur); counter.textContent = Math.round(target * (1 - (1 - k) ** 3)).toLocaleString('fr-FR'); if (k < 1 && counter.isConnected) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      return;
    }
    const portrait = h('div.tdr-pic', h('div.tdr-sil', h('i.head'), h('i.body')), h('span.tdr-ques', '?'));
    const card = h('div.tdr-card', portrait,
      h('div.tdr-who', h('b', 'Un nouveau match'), h('small', 'à 2 km · très mystérieux')),
      h('p.tdr-bio', '« J’aime les balades, les fusions de fleurs et dire “bb” à tout le monde. »'),
      h('div.tdr-bubble', 'Salut toi 😏 On discute ?'));
    const q = h('div.tdr-ask', h('h3', TEXTS.question),
      h('button.btn.tdr-opt.un', { on: { click: tap(() => answer('uninstall')) } }, TEXTS.uninstall),
      h('button.btn.secondary.tdr-opt.keep', { on: { click: tap(() => answer('keep')) } }, TEXTS.keep));
    root.append(head, card, q, foot);
  };

  function answer(c0: 'keep' | 'uninstall') {
    let c = c0;
    let refused = false;
    if (c0 === 'uninstall') {
      const r = tryUninstall(t, Date.now());
      if (!r.ok) { refused = true; c = 'keep'; }
    } else choose(t, c0, Date.now());
    save.save();
    audio.play(c === 'keep' ? 'pop2' : 'whoosh');
    haptic('select');
    root.replaceChildren();
    const logo = h('div.tdr-bigico', tindeurLogo(96));
    const say = refused ? UNINSTALL_REFUSAL : c === 'keep' ? 'Gardée ! Aucun souci, c’est ton téléphone ♡' : 'Désinstallée. Comme tu veux, ma reine ♡';
    root.append(h('div.tdr-bye', logo, h('p.tdr-say', h('img', { src: speakerFace('auguste'), alt: '' }), h('span', say))));
    if (c === 'uninstall') { window.setTimeout(() => logo.classList.add('poof'), 350); window.setTimeout(() => audio.play('pop3'), 700); }
    else logo.classList.add('happy');
    emitPhone();
    window.setTimeout(close, c === 'uninstall' ? 2200 : 1700);
  }
  render();
  audio.play('pop2');
}

/** Animation de suppression d'une icône (téléphone du jeu). */
export function poofIcon(el: HTMLElement, done: () => void): void {
  el.classList.add('tdr-poof');
  window.setTimeout(done, reducedFx() ? 0 : 520);
}

export function applyInstalled(installed: boolean): void {
  setInstalled(save.data.fun.tindeur, installed, Date.now());
  save.save();
  emitPhone();
}

/**
 * Désinstallation demandée depuis les réglages du téléphone : les deux premiers essais sont refusés
 * (renvoie false, l'appli reste), le troisième désinstalle (renvoie true).
 */
export function attemptUninstall(): boolean {
  const r = tryUninstall(save.data.fun.tindeur, Date.now());
  save.save();
  emitPhone();
  return r.ok;
}
