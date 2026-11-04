/**
 * Effet visuel persistant d'un incident dans le château : panne = la pièce s'assombrit, fuite = gouttes et flaque.
 * Se pose par-dessus la vue d'une pièce (sans modifier l'écran du château) et disparaît à la réparation.
 */
import './incidents.css';
import { h } from '../../ui/dom';
import { save } from '../../core/app';
import { ROOM_NAMES } from '../../data/world/ids';
import { incidentById } from './data';
import { roomOf } from './manager';
import { openActiveIncident } from './runtime';

let started = false;
let raf = 0;

function target(): { kind: 'leak' | 'blackout'; room: 'bedroom' | 'salon'; label: string } | null {
  const a = save.data.fun.incidents.active;
  const def = a && incidentById(a.id);
  if (!a || !def || (def.id !== 'leak' && def.id !== 'blackout')) return null;
  return { kind: def.id, room: roomOf(def, a.seed), label: def.id === 'leak' ? 'Fuite d’eau · Réparer' : 'Panne de courant · Réparer' };
}

function sync(): void {
  raf = 0;
  const t = target();
  document.querySelectorAll<HTMLElement>('.cs-stage').forEach((stage) => {
    const title = stage.closest('.cs-screen')?.querySelector('.screen-head h2')?.textContent ?? '';
    const want = !!t && title === ROOM_NAMES[t.room];
    const cur = stage.querySelector<HTMLElement>(':scope > .inc-amb');
    if (cur && (!want || cur.dataset.kind !== t!.kind)) cur.remove();
    if (want && !stage.querySelector(':scope > .inc-amb')) {
      const chip = h('button.inc-amb-chip', { on: { click: () => openActiveIncident() } }, t!.label);
      const el = h(`div.inc-amb.${t!.kind}`, { 'data-kind': t!.kind },
        t!.kind === 'leak' ? h('div.inc-drips', h('i'), h('i'), h('i'), h('i')) : h('div.inc-flick', '💡'),
        t!.kind === 'leak' ? h('div.inc-puddle') : null, chip);
      stage.append(el);
    }
  });
}

export function startAmbient(): void {
  if (started) return;
  started = true;
  const root = document.getElementById('ui');
  if (!root) return;
  new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(sync); }).observe(root, { childList: true, subtree: true });
  sync();
}

/** Petite gerbe d'étincelles quand tout est réparé. */
export function playFixed(): void {
  document.querySelectorAll<HTMLElement>('.cs-stage > .inc-amb').forEach((n) => n.remove());
  document.querySelectorAll<HTMLElement>('.cs-stage').forEach((stage) => {
    const s = h('div.inc-fixed', '✨');
    stage.append(s);
    window.setTimeout(() => s.remove(), 1400);
  });
}
