/**
 * Statistiques de jeu partagées avec Auguste : information claire, consentement, désactivation, consultation et suppression des données.
 * Rien n'est envoyé tant que Radia n'a pas accepté ; refuser (ou ne rien faire) ne change rien au jeu.
 */
import { h } from '../dom';
import { ui } from '../ui';
import * as S from '../../core/stats';
import { fmtDuration, shareInviteKind } from '../../core/statsLogic';

const P = (t: string, strong = false): HTMLElement => h('p', { style: 'margin:0 0 8px' }, strong ? h('b', t) : t);

function infoBody(): HTMLElement {
  return h('div', { style: 'text-align:left;font-size:14px;line-height:1.4' },
    P('Si tu l’acceptes, RADIA partage avec Auguste, le créateur du jeu, quelques statistiques d’utilisation.'),
    h('p', { style: 'margin:0 0 8px' }, h('b', 'Ce qui est partagé : '), 'l’heure d’ouverture du jeu, ta dernière activité, ton temps de jeu actif (une estimation), le type d’accès (application installée ou navigateur), ton fuseau horaire et un identifiant aléatoire de cet appareil.'),
    h('p', { style: 'margin:0 0 8px' }, h('b', 'Jamais partagé : '), 'tes messages, tes conversations, ta position, ta partie, tes photos ni aucune autre information.'),
    h('p', { style: 'margin:0 0 8px' }, h('b', 'Pourquoi : '), 'savoir comment le jeu est utilisé et vérifier qu’il fonctionne bien pour toi.'),
    h('p', { style: 'margin:0 0 8px' }, h('b', 'Qui peut les voir : '), 'seulement Auguste, dans un espace privé protégé.'),
    h('p', { style: 'margin:0 0 8px' }, h('b', 'Conservation : '), 'le détail des sessions 90 jours, les totaux par jour 13 mois, puis suppression automatique.'),
    h('p', { style: 'margin:0' }, h('b', 'Ton choix : '), 'tu peux dire non, arrêter à tout moment, voir tes données et les supprimer ici. Refuser ne change rien au jeu ♡'));
}

const when = (iso?: string | null): string => { if (!iso) return '—'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); };

async function showMine(): Promise<void> {
  const m = await S.myStats();
  const body = !m || !m.ok
    ? h('p', { style: 'text-align:left;font-size:14px' }, 'Impossible de joindre le serveur pour l’instant. Réessaie dans un moment ♡')
    : h('div', { style: 'text-align:left;font-size:14px;line-height:1.45' },
      P(`Premier envoi : ${when(m.first_seen)}`), P(`Dernière activité : ${when(m.last_seen)}`),
      P(`Temps de jeu total (estimé) : ${fmtDuration(m.active_total_s ?? 0)}`), P(`Sessions : ${m.sessions_total ?? 0}`),
      P(m.paused_at ? `Partage désactivé le ${when(m.paused_at)}` : `Partage activé depuis le ${when(m.consent_at)}`),
      ...(m.days?.length ? [h('p.muted', { style: 'margin:6px 0 4px;font-size:12.5px' }, 'Derniers jours'), ...m.days.slice(0, 7).map((d) => h('p', { style: 'margin:0;font-size:13px' }, `${new Date(`${d.day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtDuration(d.active_s)} · ${d.sessions} session${d.sessions > 1 ? 's' : ''}`))] : []),
      h('p.muted', { style: 'margin:8px 0 0;font-size:12px' }, 'Le temps de jeu est une estimation : il ne compte que les moments où tu touches le jeu.'));
  await ui.modal({ title: 'Mes données partagées', body, actions: [{ label: 'Fermer', value: 'ok', style: 'secondary' }] });
}

/** Panneau « Statistiques de jeu ♡ » (Réglages). */
export async function openStatsPanel(): Promise<void> {
  for (;;) {
    const st = S.statsState();
    const on = st === 'on';
    const hasDevice = !!S.readLocal().device;
    const body = h('div', infoBody(), h('p', { style: 'margin:10px 0 0;font-size:14px;font-weight:700;text-align:left' }, on ? 'Partage activé ✓' : 'Partage désactivé'));
    const r = await ui.modal({
      title: 'Statistiques de jeu ♡', body,
      actions: on
        ? [{ label: 'Voir mes données', value: 'view', style: 'primary' }, { label: 'Désactiver le partage', value: 'off', style: 'secondary' }, { label: 'Supprimer mes données', value: 'forget', style: 'secondary' }, { label: 'Fermer', value: 'ok', style: 'secondary' }]
        : [{ label: 'Activer le partage', value: 'on', style: 'primary' }, ...(hasDevice ? [{ label: 'Voir / supprimer mes données', value: 'view', style: 'secondary' as const }] : []), { label: 'Fermer', value: 'ok', style: 'secondary' }],
    });
    if (r === 'on') { const res = await S.enableStats(); ui.toast({ title: res === 'ok' ? 'Partage activé ♡' : 'Activation impossible pour l’instant', sub: res === 'ok' ? 'Tu peux l’arrêter quand tu veux' : 'Réessaie dans un moment — rien n’a été partagé', icon: res === 'ok' ? 'heart' : 'info', ms: 3000 }); continue; }
    if (r === 'off') { S.disable(); ui.toast({ title: 'Partage désactivé', sub: 'Plus rien n’est envoyé', icon: 'info', ms: 2600 }); continue; }
    if (r === 'view') { await showMine(); if (hasDevice && !on) { const del = await ui.confirm('Supprimer mes données ?', 'Toutes les statistiques déjà reçues par Auguste seront effacées.', 'Supprimer', 'Garder'); if (del) { const ok = await S.forgetStats(); ui.toast({ title: ok ? 'Données supprimées ♡' : 'Suppression impossible pour l’instant', sub: ok ? 'Rien ne reste sur le serveur' : 'Réessaie dans un moment', icon: 'info', ms: 2800 }); } } continue; }
    if (r === 'forget') {
      const del = await ui.confirm('Supprimer mes données ?', 'Toutes les statistiques déjà reçues par Auguste seront effacées et le partage sera arrêté.', 'Supprimer', 'Garder');
      if (del) { const ok = await S.forgetStats(); ui.toast({ title: ok ? 'Données supprimées ♡' : 'Suppression impossible pour l’instant', sub: ok ? 'Le partage est arrêté' : 'Réessaie dans un moment', icon: 'info', ms: 2800 }); }
      continue;
    }
    return;
  }
}

// ------------------------------------------------------------------ une seule demande, simple

function inviteBody(kind: 'full' | 'progress'): HTMLElement {
  return h('div', { style: 'text-align:left;font-size:14.5px;line-height:1.45' },
    h('p', { style: 'margin:0 0 10px' }, kind === 'full'
      ? 'Souhaites-tu partager tes statistiques de jeu avec le créateur de RADIA ? Cela comprend ton temps de jeu, tes dernières sessions, ton avancée dans les chapitres, tes niveaux, tes commandes et tes réussites. Tu peux changer d’avis à tout moment. ♡'
      : 'Une nouveauté ! Tu peux maintenant partager ta progression avec le créateur de RADIA : ton avancée dans les chapitres, tes niveaux, tes commandes et tes activités de jeu. Ton accord pour le temps de jeu ne suffit pas : c’est toi qui choisis. Tu peux changer d’avis à tout moment. ♡'),
    h('p.muted', { style: 'margin:0;font-size:12.5px' }, 'Jamais partagé : tes messages, tes conversations, tes contacts, ta position, ni tes clics. Tu peux arrêter ou supprimer tes données dans les Réglages. Refuser ne change rien au jeu.'));
}

let inviteOpen = false;
/** Ouvre l'invitation (une seule fois) ; renvoie vrai si elle a été traitée (accord ou refus). */
export async function openShareInvite(kind: 'full' | 'progress'): Promise<boolean> {
  if (inviteOpen) return false;
  inviteOpen = true;
  try {
    const r = await ui.modal({
      title: 'Partager ma progression ♡', body: inviteBody(kind),
      actions: [{ label: 'Oui, partager ♡', value: 'on', style: 'primary' }, { label: 'Non merci', value: 'no', style: 'secondary' }],
    });
    const P = await import('../../core/progressSync');
    if (r !== 'on' && r !== 'no') return false; // fenêtre fermée sans choix : rien n'est décidé (ni collecté), l'invitation reviendra à une prochaine ouverture
    if (r !== 'on') {
      // refus explicite : on ne redemande jamais et rien n'est collecté ni envoyé
      if (kind === 'full') S.markStatsAsked();
      S.declineProgress();
      return true;
    }
    let ok = true;
    if (kind === 'full') { const a = await S.enableStats(); if (a !== 'ok') ok = false; }
    if (ok) { const b = await P.enableProgress(); if (b !== 'ok') ok = false; }
    ui.toast({ title: ok ? 'Partage activé ♡' : 'Activation impossible pour l’instant', sub: ok ? 'Tu peux l’arrêter dans les Réglages' : 'Tu pourras réessayer dans les Réglages', icon: ok ? 'check' : 'info', ms: 3000 });
    return ok;
  } finally { inviteOpen = false; }
}

/**
 * Invitation UNIQUE, à un moment calme (jamais pendant un combo, une notification ou une autre fenêtre ; jamais répétée).
 *  - nouvelle joueuse : « full » (temps de jeu + progression en une seule confirmation) après `minDelayMs` ;
 *  - joueuse qui avait déjà accepté le temps de jeu : « progress », à sa prochaine ouverture (`existingDelayMs`).
 */
export function scheduleShareInvite(safe: () => boolean, minDelayMs = 150_000, existingDelayMs = 15_000): void {
  const t0 = Date.now();
  const iv = window.setInterval(() => {
    const kind = shareInviteKind(S.readLocal());
    if (!kind) { window.clearInterval(iv); return; }
    if (Date.now() - t0 < (kind === 'full' ? minDelayMs : existingDelayMs) || !safe() || inviteOpen || document.querySelector('.ti-card, .modal-backdrop:not(.leaving)')) return;
    window.clearInterval(iv);
    void S.statsServerReady().then((ready) => {
      if (!ready) return; // serveur pas prêt : on ne demande rien (et on ne marque pas « déjà demandé »)
      void openShareInvite(kind);
    });
  }, 4000);
}

/** Ouverture depuis la notification « Une nouveauté est disponible » : l'invitation si elle n'a pas encore été traitée, sinon le panneau de réglage. */
export async function openFromNotification(): Promise<void> {
  const kind = shareInviteKind(S.readLocal());
  if (kind && (await S.statsServerReady())) { await openShareInvite(kind); return; }
  const m = await import('./progressConsent');
  await m.openProgressPanel();
}
