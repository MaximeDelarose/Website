/**
 * « Partager ma progression de jeu ♡ » : consentement DISTINCT du partage du temps de jeu.
 * Information claire, activation, arrêt, consultation et suppression. Refuser (ou ne rien faire) ne change rien au jeu.
 */
import { h } from '../dom';
import { ui } from '../ui';
import * as P from '../../core/progressSync';
import { readLocal } from '../../core/stats';

const T = (label: string, text: string): HTMLElement => h('p', { style: 'margin:0 0 8px' }, h('b', `${label} `), text);

function infoBody(): HTMLElement {
  return h('div', { style: 'text-align:left;font-size:14px;line-height:1.4' },
    h('p', { style: 'margin:0 0 8px' }, 'Si tu l’acceptes, RADIA partage avec Auguste, le créateur du jeu, où tu en es dans ta partie, pour l’aider à améliorer le jeu.'),
    T('Ce qui est enregistré :', 'ton avancement dans l’histoire (chapitre et niveau atteints, niveaux terminés), ton niveau et ton expérience, tes commandes livrées, tes fusions, tes combos et tes objets découverts, ta progression PIMBÊCHE et dans Mon Monde, le temps actif passé dans chaque mode de jeu, et un petit résumé de chaque session (par exemple « 3 commandes livrées »).'),
    T('Jamais enregistré :', 'tes messages, tes conversations, tes contacts, ta position, le détail de tes échanges avec les autres personnages, ni tes gestes ou tes clics.'),
    T('Qui peut le voir :', 'seulement Auguste, depuis un espace privé protégé réservé aux administrateurs autorisés.'),
    T('Conservation :', 'le détail des sessions 90 jours, les jalons et le temps par mode 13 mois, puis suppression automatique.'),
    T('Arrêter :', 'à tout moment, ici, en touchant « Arrêter le partage ». Plus rien n’est envoyé.'),
    T('Supprimer :', 'ici aussi, « Supprimer mes données » efface tout ce qu’Auguste a reçu.'),
    h('p', { style: 'margin:0' }, h('b', 'Ton choix : '), 'dire non ne change rien au jeu, et ce partage est séparé du partage du temps de jeu ♡'));
}

const when = (iso?: string | null): string => { if (!iso) return '—'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); };

async function showMine(): Promise<void> {
  const m = await P.myProgress();
  const body = !m || !m.ok
    ? h('p', { style: 'text-align:left;font-size:14px' }, 'Impossible de joindre le serveur pour l’instant. Réessaie dans un moment ♡')
    : h('div', { style: 'text-align:left;font-size:14px;line-height:1.45' },
      h('p', { style: 'margin:0 0 8px' }, m.paused_at ? `Partage arrêté le ${when(m.paused_at)}` : m.consent_at ? `Partage activé depuis le ${when(m.consent_at)}` : 'Aucune donnée de progression conservée.'),
      h('p', { style: 'margin:0 0 8px' }, `Dernier envoi : ${when(m.snap_at)}`),
      h('p', { style: 'margin:0 0 8px' }, `Jalons conservés : ${m.events ?? 0} · Sessions résumées : ${m.sessions ?? 0}`),
      m.snap ? h('p', { style: 'margin:0 0 8px' }, `Chapitre ${m.snap.story.chapter}, niveau ${m.snap.story.current?.id ?? '—'} · niveau de Radia ${m.snap.xp.level} · ${m.snap.free.orders} commandes livrées`) : null);
  await ui.modal({ title: 'Ma progression partagée', body, actions: [{ label: 'Fermer', value: 'ok', style: 'secondary' }] });
}

export async function openProgressPanel(): Promise<void> {
  for (;;) {
    const on = P.progressState() === 'on';
    const hasDevice = !!readLocal().device;
    const body = h('div', infoBody(), h('p', { style: 'margin:10px 0 0;font-size:14px;font-weight:700;text-align:left' }, on ? 'Partage de la progression activé ✓' : 'Partage de la progression désactivé'));
    const r = await ui.modal({
      title: 'Partager ma progression de jeu ♡', body,
      actions: on
        ? [{ label: 'Voir mes données', value: 'view', style: 'primary' }, { label: 'Arrêter le partage', value: 'off', style: 'secondary' }, { label: 'Supprimer mes données', value: 'forget', style: 'secondary' }, { label: 'Fermer', value: 'close', style: 'secondary' }]
        : [{ label: 'Activer le partage', value: 'on', style: 'primary' }, ...(hasDevice ? [{ label: 'Voir / supprimer mes données', value: 'view', style: 'secondary' as const }] : []), { label: 'Fermer', value: 'close', style: 'secondary' }],
    });
    if (r === 'on') { const res = await P.enableProgress(); ui.toast({ title: res === 'ok' ? 'Partage de la progression activé ♡' : 'Activation impossible pour l’instant', sub: res === 'ok' ? 'Tu peux l’arrêter quand tu veux' : 'Réessaie dans un moment', icon: res === 'ok' ? 'check' : 'info', ms: 2600 }); continue; }
    if (r === 'off') { P.disableProgress(); ui.toast({ title: 'Partage arrêté', sub: 'Plus rien n’est envoyé', icon: 'info', ms: 2600 }); continue; }
    if (r === 'view') {
      await showMine();
      if (hasDevice && !on) { const del = await ui.confirm('Supprimer mes données ?', 'Toute la progression déjà reçue par Auguste sera effacée.', 'Supprimer', 'Garder'); if (del) { const ok = await P.forgetProgress(); ui.toast({ title: ok ? 'Données supprimées ♡' : 'Suppression impossible pour l’instant', icon: 'info', ms: 2600 }); } }
      continue;
    }
    if (r === 'forget') {
      const del = await ui.confirm('Supprimer mes données ?', 'Toute la progression déjà reçue par Auguste sera effacée et le partage sera arrêté.', 'Supprimer', 'Garder');
      if (del) { const ok = await P.forgetProgress(); ui.toast({ title: ok ? 'Données supprimées ♡' : 'Suppression impossible pour l’instant', sub: ok ? 'Le partage est arrêté' : 'Réessaie dans un moment', icon: 'info', ms: 2600 }); }
      continue;
    }
    return;
  }
}
