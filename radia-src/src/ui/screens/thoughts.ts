/** « Une petite pensée ♡ » : carte à l'ouverture depuis la notification + liste « Petites pensées ♡ » (historique conservé). */
import { h } from '../dom';
import { ui } from '../ui';
import { save } from '../../core/app';
import { collectThoughts, mergeThoughts, type Thought } from '../../core/push';

const fmt = (at: number): string => { const d = new Date(at); return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); };

/** Ramasse les pensées reçues par le service worker et les range dans la sauvegarde. Renvoie les nouvelles. */
export async function importThoughts(): Promise<Thought[]> {
  const got = await collectThoughts();
  if (!got.length) return [];
  const hist = save.data.fun.thoughts;
  const fresh = mergeThoughts(hist, got);
  // au-delà de 60, on retire d'abord les pensées NON gardées (mergeThoughts a déjà borné ; on remet les « gardées » si besoin)
  if (fresh.length) save.save();
  return fresh;
}

let cardOpen = false;
/** Petite carte (aucune animation longue obligatoire) avec la pensée ; « Garder » la protège de l'oubli. */
export async function showThoughtCard(t: Thought): Promise<void> {
  if (cardOpen) return; cardOpen = true;
  const stored = save.data.fun.thoughts.find((x) => x.at === t.at && x.text === t.text);
  const r = await ui.modal({
    title: 'Une petite pensée ♡',
    body: h('div', { style: 'text-align:center;font-size:17px;line-height:1.45;padding:6px 2px' }, h('p', { style: 'margin:0 0 8px' }, t.text), h('small.muted', fmt(t.at))),
    actions: [{ label: stored?.kept ? 'Gardée ♡' : 'Garder ♡', value: 'keep', style: 'primary' }, { label: 'Fermer', value: 'ok', style: 'secondary' }],
  });
  cardOpen = false;
  if (r === 'keep' && stored) { stored.kept = true; save.save(); ui.toast({ title: 'Gardée dans « Petites pensées »', icon: 'heart', ms: 2200 }); }
}

/** Liste des petites pensées (les plus récentes d'abord). */
export async function openThoughtsList(): Promise<void> {
  const hist = save.data.fun.thoughts.slice().reverse();
  const body = h('div', { style: 'text-align:left;max-height:55vh;overflow-y:auto;font-size:14.5px' },
    ...(hist.length ? hist.map((t) => h('div', { style: 'padding:8px 2px;border-bottom:1px solid #f0dfe8' }, h('p', { style: 'margin:0' }, t.kept ? '♡ ' : '', t.text), h('small.muted', fmt(t.at)))) : [h('p.muted', 'Les petites pensées que tu recevras apparaîtront ici ♡')]));
  await ui.modal({ title: 'Petites pensées ♡', body, actions: [{ label: 'Fermer', value: 'ok', style: 'secondary' }] });
}

// ------------------------------------------------------------------ invitation à la première ouverture (application installée)
import './thoughts.css';
import { enablePush, pushStatus, shouldInvite, type EnableResult } from '../../core/push';
import { isStandalone } from '../../core/diagnostics';

import { PARTNER } from '../../config/gift';
let inviteOpen = false;
const setInvite = (state: 'later' | 'accepted' | 'refused' | 'error'): void => { save.data.fun.pensee = { state, at: Date.now() }; save.save(); };

/** Carte unique « Une petite pensée pour toi, chaque jour ♡ ». Le bouton rose déclenche TOUT DE SUITE la demande native d'iOS (dans le geste). */
export async function showThoughtInvite(): Promise<void> {
  if (inviteOpen) return; inviteOpen = true;
  let face = '';
  try { face = (await import('../../events/ctx')).speakerFace('auguste'); } catch { /* sans portrait : la carte reste complète */ }
  const card = h('div.modal.panel.ti-card', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Une petite pensée pour toi, chaque jour' });
  const back = h('div.modal-backdrop.ti-back', card);
  const close = (): void => { back.classList.add('leaving'); window.setTimeout(() => back.remove(), 220); inviteOpen = false; };
  const show = (title: string, text: string, sub: string, btn?: HTMLElement): void => {
    card.replaceChildren(face ? h('img.ti-face', { src: face, alt: '' }) : h('div.ti-heart', '♡'), h('h3', title), h('p', text), sub ? h('small.ti-sub', sub) : '', ...(btn ? [btn] : []));
  };
  const done = (label = 'Merci ♡'): HTMLElement => { const b = h('button.btn.ti-yes', { type: 'button' }, label); b.addEventListener('click', close); return b; };
  const outcome = (r: EnableResult): void => {
    if (r === 'ok') { setInvite('accepted'); show('C’est activé ♡', 'Une petite pensée t’attendra bientôt, chaque jour.', 'Tu peux les arrêter quand tu veux, dans Réglages.', done()); }
    else if (r === 'denied') { setInvite('refused'); show('Pas de souci ♡', 'C’est ton choix, je le respecte. Tu pourras les activer plus tard dans Réglages.', '', done()); }
    else { setInvite('error'); show('Pas pour l’instant', 'Je n’ai pas pu les activer maintenant. Tu pourras réessayer dans Réglages ♡', '', done()); }
  };
  const yes = h('button.btn.ti-yes', { type: 'button' }, 'Recevoir mes petites pensées ♡');
  const later = h('button.ti-later', { type: 'button' }, 'Plus tard');
  let busy = false;
  // IMPORTANT : pas de `await` ni de wrapper asynchrone entre le toucher et la demande d'autorisation (iOS l'ignorerait)
  yes.addEventListener('click', () => {
    if (busy) return; busy = true; (yes as HTMLButtonElement).disabled = true; yes.textContent = '…';
    const p = enablePush(9); // appelle Notification.requestPermission() immédiatement, dans ce geste
    void p.then(outcome, () => outcome('error'));
  });
  later.addEventListener('click', () => { if (busy) return; setInvite('later'); close(); ui.toast({ title: 'Tu les retrouveras dans Réglages ♡', icon: 'heart', ms: 2400 }); });
  card.append(face ? h('img.ti-face', { src: face, alt: '' }) : h('div.ti-heart', '♡'), h('h3', 'Une petite pensée pour toi, chaque jour ♡'),
    h('p', `${PARTNER} aimerait t’envoyer une petite pensée quotidienne pour te souhaiter une belle journée.`),
    h('small.ti-sub', 'Une seule notification par jour, jamais la nuit.'), yes, later);
  ui.root.append(back);
}

/**
 * Propose l'invitation UNE seule fois, dans les premières minutes, à un moment calme (jamais par-dessus une autre fenêtre, une fusion, une scène…).
 * Uniquement dans l'application installée sur l'écran d'accueil ; jamais si Radia a déjà répondu ou si le système a refusé.
 */
export function scheduleThoughtInvite(safe: () => boolean, minDelayMs = 20_000): void {
  const t0 = Date.now(); let tries = 0;
  const tick = async (): Promise<void> => {
    if (++tries > 900) return; // ~ 40 minutes d'attente au plus
    try {
      if (save.data.fun.pensee.state !== 'none') return;
      const st = await pushStatus();
      if (!shouldInvite({ standalone: isStandalone(), state: save.data.fun.pensee.state, status: st.kind, canAsk: st.kind === 'off' ? st.canAsk : undefined })) {
        if (st.kind === 'on' && save.data.fun.pensee.state === 'none') setInvite('accepted'); // déjà abonnée : rien à proposer
        return;
      }
      if (Date.now() - t0 >= minDelayMs && !document.hidden && safe() && !document.querySelector('.modal-backdrop:not(.leaving), .dy-back, .ti-back')) { await showThoughtInvite(); return; }
    } catch { /* ne bloque jamais le jeu */ }
    window.setTimeout(() => void tick(), 2800);
  };
  window.setTimeout(() => void tick(), 2800);
}
