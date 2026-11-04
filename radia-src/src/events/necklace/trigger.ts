/**
 * Déclencheur AUTOMATIQUE de l'invitation « L'Éclat Éternel ♡ » (aucun serveur, aucun mot de passe, aucune commande à distance).
 *
 *  1. Chaque ouverture de l'application est comptée au plus une fois par tranche de 30 minutes (compteur persistant,
 *     non rétroactif : il démarre à la mise en ligne).
 *  2. À la 7ᵉ ouverture comptée, un minuteur de jeu ACTIF de 5 minutes démarre (persistant : si le jeu est fermé avant,
 *     la progression est conservée et reprend à la prochaine ouverture).
 *  3. Au bout des 5 minutes, à un moment techniquement sûr (`safeToNotify()`), l'invitation est déposée dans le téléphone
 *     (une seule fois). « Plus tard » la conserve à vie ; un rappel discret revient de temps en temps.
 *
 * ⚠ Tout est dans la sauvegarde LOCALE du navigateur de Radia (`save.data.fun.necklace`) : rien n'est synchronisé entre
 * appareils, et vider les données du site efface la progression.
 */
import { save } from '../../core/app';
import { ev, nextId } from '../api';
import { emitPhone } from '../bus';
import { addActive, addRemind, countLaunch, markInvited } from './state';
import { NECKLACE_EVENT_ID } from './data';

const fun = () => save.data.fun.necklace;
let unsaved = 0;

/** Une ouverture de l'application (à appeler une fois au démarrage). Renvoie vrai si elle a été comptée. */
export function necklaceLaunch(now: number = Date.now()): boolean {
  try {
    const counted = countLaunch(fun(), now);
    if (counted) save.save();
    return counted;
  } catch (e) { console.error('necklace launch', e); return false; }
}

/** L'invitation est-elle dans la boîte du téléphone (non terminée) ? */
export const inviteInInbox = (): boolean => ev().inbox.some((i) => i.eventId === NECKLACE_EVENT_ID && i.state !== 'done');

/** Dépose l'invitation dans le téléphone (état « nouvelle » : la notification apparaît au prochain moment sûr). */
export function deliverInvite(state: 'new' | 'later' = 'new'): string {
  const st = ev();
  const n = fun();
  const ex = st.inbox.find((i) => i.eventId === NECKLACE_EVENT_ID && i.state !== 'done');
  if (ex) { if (state === 'new' && ex.state !== 'seen') ex.state = 'new'; emitPhone(); return ex.runId; }
  const runId = nextId('r');
  st.inbox.push({ runId, eventId: NECKLACE_EVENT_ID, at: st.playMs, state });
  if (!n.invited) markInvited(n, runId, Date.now());
  else n.inviteRunId = runId;
  save.save();
  emitPhone();
  return runId;
}

/** Filet de sécurité : tant que la scène n'est pas terminée, l'invitation ne disparaît jamais du téléphone. */
export function ensureInvite(): void {
  const n = fun();
  if (!n.invited || n.sceneDone || inviteInInbox()) return;
  if (ev().current?.eventId === NECKLACE_EVENT_ID) return;
  deliverInvite('later');
}

/**
 * Appelée par le planificateur toutes les ~4 s. `active` = temps de jeu actif (onglet visible, entrée récente, pas d'événement).
 * `safe` = `safeToNotify()` : aucune interaction ni animation critique en cours. `unshow` oublie la notification déjà montrée.
 */
export function necklaceTick(dt: number, active: boolean, safe: boolean, unshow: (runId: string) => void): void {
  const n = fun();
  if (n.sceneDone) return;
  if (n.invited) {
    ensureInvite();
    // rappel discret : l'invitation « plus tard » revient comme notification, sans jamais disparaître
    if (addRemind(n, dt, active) && safe) {
      const inv = ev().inbox.find((i) => i.eventId === NECKLACE_EVENT_ID && i.state === 'later');
      n.remindMs = 0;
      if (inv) { unshow(inv.runId); inv.state = 'new'; save.save(); emitPhone(); }
    }
  } else if (n.armed) {
    const due = addActive(n, dt, active);
    if (due && safe) { deliverInvite('new'); return; }
    if (active) { unsaved += dt; if (unsaved >= 20_000) { unsaved = 0; save.save(); } } // progression du minuteur conservée si Safari se ferme
  }
}
