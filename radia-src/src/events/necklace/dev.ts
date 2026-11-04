/**
 * Mode PRÉVISUALISATION développeur (`?debug` uniquement) : `window.RADIA.necklace`. Invisible dans la version de Radia
 * (rien n'est enregistré sans `?debug`). `preview()` ne touche ni au collier ni à la sauvegarde.
 */
import { dbg } from '../../core/debug';
import { save } from '../../core/app';
import { world } from '../../core/world';
import { ev } from '../api';
import { emitPhone } from '../bus';
import { defaultNecklace } from './state';
import { NECKLACE_EVENT_ID, NECKLACE_ID } from './data';
import { addActive, countLaunch } from './state';
import { deliverInvite, necklaceTick } from './trigger';
import { finishScene, grantNecklace } from './grant';

export function installNecklaceDebug(unshow: (runId: string) => void, safe: () => boolean): void {
  dbg('necklace', {
    /** Force l'invitation (sans toucher au collier ni au compteur). */
    invite: (): string => { const id = deliverInvite('new'); unshow(id); return id; },
    /** Joue toute la scène SANS attribuer le collier ni écrire la sauvegarde. */
    preview: async (part?: 'show' | 'gift'): Promise<void> => {
      const [{ startEvent }, { NECKLACE_PREVIEW }, { nextId }] = await Promise.all([import('../runner'), import('./event'), import('../api')]);
      // `part` : ne jouer qu'une partie (« show » ou « gift ») pour gagner du temps pendant les essais
      const def = part ? { ...NECKLACE_PREVIEW, steps: NECKLACE_PREVIEW.steps.filter((s) => s.t === 'activity' && (s.params as { part?: string } | undefined)?.part === part) } : NECKLACE_PREVIEW;
      await startEvent(def, nextId('rp'));
    },
    /** Attribue pour de vrai (test) : passe par les mêmes garde-fous que la fin de scène. */
    grant: (): boolean => { finishScene(); return grantNecklace(); },
    /** Simule n ouvertures comptées (ignore le délai de 30 min). */
    skipLaunches: (n = 1): number => { const s = save.data.fun.necklace; for (let i = 0; i < n; i++) { s.lastLaunchAt = 0; countLaunch(s, Date.now()); } save.save(); return s.launches; },
    /** Avance le minuteur de jeu actif (minutes) ; l'invitation est déposée dès que c'est possible. */
    advance: (min = 5): void => { const s = save.data.fun.necklace; if (s.armed && !s.invited) addActive(s, min * 60_000, true); necklaceTick(0, true, safe(), unshow); save.save(); },
    /** Remet tout à zéro (compteurs, invitation, collier, souvenir). */
    reset: (): void => {
      save.data.fun.necklace = defaultNecklace();
      const w = world();
      w.wardrobe.owned = w.wardrobe.owned.filter((id) => id !== NECKLACE_ID);
      w.wardrobe.look.acc = w.wardrobe.look.acc.filter((id) => id !== NECKLACE_ID);
      const st = ev();
      st.inbox = st.inbox.filter((i) => i.eventId !== NECKLACE_EVENT_ID);
      if (st.current?.eventId === NECKLACE_EVENT_ID) st.current = null;
      delete st.done[NECKLACE_EVENT_ID];
      save.save(); emitPhone();
    },
    state: () => ({ ...save.data.fun.necklace }),
  });
}
