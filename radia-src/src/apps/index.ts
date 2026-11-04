/**
 * Point d'entrée des applications du téléphone du jeu : RADIA Clips et RADIA Snap s'enregistrent ici
 * (registerPhoneApp), écoutent les « moments » des activités et exposent `RADIA.apps` en mode ?debug.
 */
import { registerPhoneApp } from '../events/ui/phoneApps';
import { ev } from '../events/api';
import { save } from '../core/app';
import { dbg } from '../core/debug';
import { clipsIcon, snapIcon } from './icons';
import { clipsState, snapState, persist, worldFans } from './store';
import { clipsBadge, snapBadge, defaultSnap, type SnapState } from './snap/model';
import { defaultClips, type ClipsState } from './clips/model';
import { assignInPlace } from './util';
import { emitMoment, type MomentKind } from './moments';
import { installMomentPrompt, KIND_TITLES } from './prompt';

registerPhoneApp({
  id: 'clips', name: 'RADIA Clips', icon: clipsIcon,
  open: () => { void import('./clips/ui').then((m) => m.openClips()); },
  badge: () => clipsBadge(snapState()) || null,
});
registerPhoneApp({
  id: 'snap', name: 'RADIA Snap', icon: snapIcon,
  open: () => { void import('./snap/ui').then((m) => m.openSnap()); },
  badge: () => snapBadge(snapState()) || null,
});
installMomentPrompt();

dbg('apps', {
  /** Émet un moment comme le ferait une activité. */
  emit: (kind: MomentKind, title?: string) => emitMoment({ kind, title: title ?? KIND_TITLES[kind] ?? 'Un moment' }),
  state: (): { clips: ClipsState; snap: SnapState; fans: number; albumSnap: number } => ({ clips: clipsState(), snap: snapState(), fans: worldFans(), albumSnap: ev().photos.filter((p) => p.eventId === 'snap').length }),
  reset: () => {
    assignInPlace(save.data.fun.apps.clips, defaultClips() as unknown as Record<string, unknown>);
    assignInPlace(save.data.fun.apps.snap, defaultSnap() as unknown as Record<string, unknown>);
    ev().photos = ev().photos.filter((p) => p.eventId !== 'snap');
    persist();
  },
  /** Mesure (ms par image) du rendu des photos Snap et de chaque scène de Clips. */
  bench: async (n = 6) => {
    const [{ drawSnap }, { makeScene, SW, SH }, { TEMPLATES }, { camForMoment }, { currentLook }] = await Promise.all([import('./snap/render'), import('./clips/scenes'), import('./clips/gen'), import('./snap/model'), import('../game/world/look')]);
    const res: Record<string, number> = {};
    const time = (fn: (t: number) => void): number => { fn(0); const t0 = performance.now(); for (let i = 1; i <= n; i++) fn(i * 0.07); return +((performance.now() - t0) / n).toFixed(1); };
    const cam = camForMoment({ kind: 'restaurant', title: 'x' }, false);
    const rec = { id: 'b', eventId: 'snap', place: cam.place, title: 'Bench', ts: 1, look: currentLook(), auguste: true, kids: [], pose: 2, frame: 'rose', filter: 'soir' } as never;
    const c = document.createElement('canvas'); c.width = 540; c.height = 675; const g = c.getContext('2d')!;
    res['snap540'] = time((t) => drawSnap(g, rec, { cat: false, stickers: cam.stickers }, 540, 675, t));
    const c2 = document.createElement('canvas'); c2.width = SW * 2; c2.height = SH * 2; const g2 = c2.getContext('2d')!; g2.scale(2, 2);
    for (const tp of TEMPLATES) { const d = makeScene(tp.scene, { fans: 1234, title: tp.title, dur: 4 }); res[tp.id] = time((t) => d(g2, SW, SH, t)); }
    return res;
  },
  openClips: () => import('./clips/ui').then((m) => m.openClips()),
  openSnap: () => import('./snap/ui').then((m) => m.openSnap()),
});
