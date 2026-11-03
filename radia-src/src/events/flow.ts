/** Actions de haut niveau sur les invitations : voir, accepter, reporter, reprendre, rejouer. */
import { ui } from '../ui/ui';
import { save } from '../core/app';
import { eventById } from './data';
import { ev, nextId } from './api';
import { setInviteState } from './manager';
import { abandonCurrent, isEventRunning, resumeCurrent, startEvent } from './runner';
import { openInviteSheet } from './ui/invite';
import { emitPhone } from './bus';
import { runCall } from './ui/call';
import { SECRET_ID } from './data';
import { SECRET_SCENE } from './data/secret';

/** Ouvre la feuille d'invitation puis démarre ou reporte selon le choix. */
export async function openInvite(runId: string): Promise<void> {
  const st = ev();
  const inv = st.inbox.find((i) => i.runId === runId);
  const def = inv ? eventById(inv.eventId) : undefined;
  if (!inv || !def || isEventRunning()) return;
  if (inv.state === 'new') { inv.state = 'seen'; save.save(); emitPhone(); }
  if (def.id === SECRET_ID) {
    // la quête secrète : on réécoute le message vocal avant de décider
    const r = await runCall({ mode: 'replay', canStart: true });
    if (r === 'later') { setInviteState(st, runId, 'later'); save.save(); emitPhone(); return; }
    await startEvent(def, runId, st.current?.runId === runId ? st.current : undefined);
    emitPhone();
    return;
  }
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

/** Déclenche l'appel de A (automatique après 20-30 min de jeu actif, ou depuis le mode développeur). */
export async function triggerSecretCall(): Promise<void> {
  const st = ev();
  const def = eventById(SECRET_ID);
  if (!def || isEventRunning()) return;
  let inv = st.inbox.find((i) => i.eventId === SECRET_ID && i.state !== 'done');
  if (!inv) {
    inv = { runId: nextId('r'), eventId: SECRET_ID, at: st.playMs, state: 'new' };
    st.inbox.push(inv);
  }
  st.secret.triggered = true;
  st.secret.runId = inv.runId;
  st.secret.heard += 1;
  st.msgs.push({ at: Date.now(), from: 'auguste', text: '🎙 Message vocal de A', read: false });
  save.save();
  emitPhone();
  const runId = inv.runId;
  const r = await runCall({ mode: 'incoming', canStart: true });
  if (r === 'start') {
    inv.state = 'seen';
    save.save();
    await startEvent(def, runId);
  } else {
    // refusé ou reporté : rien n'est perdu, le message reste dans le téléphone
    setInviteState(st, runId, 'later');
    save.save();
    ui.toast({ title: 'Message enregistré ♡', sub: 'Tu peux le réécouter dans ton téléphone.', icon: 'phone', ms: 3200 });
  }
  emitPhone();
}

/** Réécoute du message depuis le téléphone (jamais d'effet sur les récompenses). */
export async function replayVoice(): Promise<'start' | 'later'> {
  const st = ev();
  const done = (st.done[SECRET_ID]?.count ?? 0) > 0;
  const r = await runCall({ mode: 'replay', canStart: !done && !isEventRunning() });
  if (r === 'start') {
    const inv = st.inbox.find((i) => i.eventId === SECRET_ID && i.state !== 'done');
    const def = eventById(SECRET_ID);
    if (inv && def) await startEvent(def, inv.runId, st.current?.runId === inv.runId ? st.current : undefined);
  }
  emitPhone();
  return r;
}

/** Revoir la scène de remise du bracelet (aucune récompense, aucun nouvel objet). */
export async function replayBraceletScene(): Promise<void> {
  if (isEventRunning()) return;
  await startEvent(SECRET_SCENE, nextId('rs'));
  emitPhone();
}
