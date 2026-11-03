/** Actions de haut niveau sur les invitations : voir, accepter, reporter, reprendre, rejouer. */
import { ui } from '../ui/ui';
import { save } from '../core/app';
import { eventById } from './data';
import { ev, nextId } from './api';
import { setInviteState } from './manager';
import { abandonCurrent, isEventRunning, resumeCurrent, startEvent } from './runner';
import { openInviteSheet } from './ui/invite';
import { emitPhone } from './bus';

/** Ouvre la feuille d'invitation puis démarre ou reporte selon le choix. */
export async function openInvite(runId: string): Promise<void> {
  const st = ev();
  const inv = st.inbox.find((i) => i.runId === runId);
  const def = inv ? eventById(inv.eventId) : undefined;
  if (!inv || !def || isEventRunning()) return;
  if (inv.state === 'new') { inv.state = 'seen'; save.save(); emitPhone(); }
  const choice = await openInviteSheet(def.id);
  if (choice === 'later') { setInviteState(st, runId, 'later'); save.save(); emitPhone(); return; }
  // « J'arrive » : s'il y a déjà une activité suspendue, on demande avant de l'abandonner
  if (st.current && st.current.runId !== runId) {
    const ok = await ui.confirm('Une activité est déjà en cours', 'Tu peux la reprendre depuis ton téléphone. Veux-tu l’abandonner pour celle-ci ?', 'Abandonner', 'Garder');
    if (!ok) { setInviteState(st, runId, 'later'); save.save(); emitPhone(); return; }
    abandonCurrent();
  }
  await startEvent(def, runId, st.current?.runId === runId ? st.current : undefined);
  emitPhone();
}

export async function resumeFlow(): Promise<void> {
  if (isEventRunning()) return;
  await resumeCurrent();
  emitPhone();
}

/** Rejoue un événement déjà terminé (rejouable) : nouvelle instance, récompense réduite. */
export async function replay(eventId: string): Promise<void> {
  const def = eventById(eventId);
  const st = ev();
  if (!def || !def.repeatable || isEventRunning()) return;
  if (st.current) {
    const ok = await ui.confirm('Une activité est déjà en cours', 'L’abandonner pour jouer celle-ci ?', 'Abandonner', 'Garder');
    if (!ok) return;
    abandonCurrent();
  }
  const runId = nextId('r');
  st.inbox.push({ runId, eventId, at: st.playMs, state: 'seen' });
  if (st.inbox.length > 60) st.inbox.splice(0, st.inbox.length - 60);
  save.save();
  await startEvent(def, runId);
  emitPhone();
}
