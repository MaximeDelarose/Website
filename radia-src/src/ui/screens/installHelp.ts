/** Bouton « Installer mon petit monde ❤️ » + instructions adaptées au navigateur. Absent une fois le jeu lancé depuis l'écran d'accueil. */
import { GIFT } from '../../config/gift';
import { h, tap } from '../dom';
import { ui } from '../ui';
import { icon } from '../icons';
import { isStandalone } from '../../core/diagnostics';
import { detectEnv, installKind, hasDeferredPrompt, promptInstall, onInstallChange, type InstallKind } from '../../core/install';

export const currentInstallKind = (): InstallKind => installKind(detectEnv(hasDeferredPrompt(), isStandalone()));

function steps(items: Array<string | Node>): HTMLElement {
  return h('ol', { style: 'text-align:left;font-size:15px;line-height:1.45;padding-left:22px;margin:6px 0 0' }, ...items.map((t) => h('li', { style: 'margin:6px 0' }, t)));
}

export async function openInstallHelp(): Promise<void> {
  const kind = currentInstallKind();
  if (kind === 'installed') return;
  if (kind === 'prompt') { await promptInstall(); return; }
  if (kind === 'ios-safari') {
    await ui.modal({
      title: 'Installer mon petit monde ❤️',
      body: h('div',
        h('p', { style: 'margin:0 0 4px;font-size:14px' }, 'En 3 gestes, le jeu devient une vraie appli, avec sa propre icône :'),
        steps([
          h('span', 'Touche le bouton ', h('b', 'Partager'), ' ', h('span', { 'aria-hidden': 'true' }, '(le carré avec la flèche ⬆︎, en bas de Safari)')),
          h('span', 'Fais défiler et touche ', h('b', '« Sur l\'écran d\'accueil »')),
          h('span', 'Touche ', h('b', 'Ajouter'), `, puis ouvre ${GIFT.app.shortName} depuis ton écran d\'accueil ♡`),
        ]),
        h('p', { style: 'margin:10px 0 0;font-size:12px;opacity:.75' }, 'Ta partie est conservée. Pas de réinstallation pour les nouveautés : le jeu se met à jour tout seul.')),
      actions: [{ label: 'J\'ai compris', value: 'ok', style: 'primary' }],
    });
    return;
  }
  if (kind === 'ios-other') {
    await ui.modal({
      title: 'Ouvre le lien dans Safari ♡',
      body: h('div', { style: 'font-size:15px;line-height:1.45' },
        h('p', { style: 'margin:0 0 6px' }, 'Sur iPhone, seule l\'appli Safari peut ajouter un jeu à l\'écran d\'accueil.'),
        steps(['Copie l\'adresse de cette page', 'Ouvre Safari et colle-la', 'Touche Partager → « Sur l\'écran d\'accueil »'])),
      actions: [{ label: 'J\'ai compris', value: 'ok', style: 'primary' }],
    });
    return;
  }
  await ui.modal({
    title: 'Installer mon petit monde ❤️',
    body: h('div', { style: 'font-size:15px;line-height:1.45' },
      h('p', { style: 'margin:0 0 6px' }, 'Dans le menu de ton navigateur (⋮ ou ⋯), choisis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».')),
    actions: [{ label: 'J\'ai compris', value: 'ok', style: 'primary' }],
  });
}

/** Le bouton (ou `null` si l'application est déjà installée). Il se retire tout seul si l'installation aboutit. */
export function installButton(): HTMLElement | null {
  if (currentInstallKind() === 'installed') return null;
  const b = h('button.btn.secondary.install-btn', icon('heart', 18), 'Installer mon petit monde ❤️');
  b.addEventListener('click', tap(() => void openInstallHelp()));
  const off = onInstallChange(() => { if (!b.isConnected) { off(); return; } if (currentInstallKind() === 'installed') b.remove(); });
  return b;
}
