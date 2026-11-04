/**
 * Pont entre les « moments » du jeu et les deux applications : un moment devient une PROPOSITION discrète
 * (carte « Publier cette story ? » : Publier / Plus tard / Ignorer). Jamais de publication sans action de la joueuse.
 */
import './snap/snap.css';
import { h, tap } from '../ui/dom';
import { ui } from '../ui/ui';
import { audio } from '../core/app';
import { haptic } from '../core/haptics';
import { onMoment, type Moment } from './moments';
import { receiveMoment, publishPendingStory, ignorePending } from './service';
import { clipsOpen } from './clips/ui-state';
import { snapOpenFlag } from './snap/ui-state';
import { isCareerKind } from './clips/model';
import { snapState } from './store';
import type { Pending } from './snap/model';
import { snapIcon } from './icons';
import { sparkleBurst } from '../ui/fx/sparkle';

let card: HTMLElement | null = null;
const queue: Pending[] = [];
const KIND_TITLES: Record<string, string> = {
  shooting: 'Séance photo terminée', runway: 'Défilé terminé', scene: 'Spectacle terminé', concert: 'Concert terminé', restaurant: 'Belle soirée au restaurant',
  fireworks: 'Feu d’artifice', castle: 'Le château change de visage', outfit: 'Nouvelle tenue', garden: 'Le jardin est en fleurs', chocolate: 'Chocolats prêts', cat: 'Un moment avec le chat', casino: 'Soirée au casino', necklace: 'Un collier à ton cou',
};

function dismiss(): void {
  const c = card; card = null;
  if (!c) return;
  c.classList.add('out'); window.setTimeout(() => c.remove(), 260);
  window.setTimeout(next, 500);
}
function next(): void {
  if (card || clipsOpen() || snapOpenFlag()) return;
  const p = queue.shift();
  if (!p) return;
  if (!snapState().pending.some((x) => x.id === p.id && x.snap)) return next();
  show(p);
}
function show(p: Pending): void {
  const career = isCareerKind(p.kind);
  const timer = window.setTimeout(dismiss, 9000);
  const end = (fn?: () => void) => { window.clearTimeout(timer); fn?.(); dismiss(); };
  const acts = h('div.snp-prop-a',
    h('button.btn.small', { on: { click: tap(() => end(() => { const r = publishPendingStory(p); audio.play('sparkle'); haptic('reward'); sparkleBurst(window.innerWidth / 2, 60, { rarity: 'rare' }); ui.toast({ title: r.story ? 'Story publiée ♡' : 'Photo enregistrée ♡', sub: 'Retrouve-la dans RADIA Snap.' }); }), { sound: false }) } }, 'Publier'),
    career ? h('button.btn.small.secondary', { on: { click: tap(() => end(() => { void import('./clips/ui').then((m) => m.openClips('foryou', { moment: p.id })); }), { sound: false }) } }, 'Dans Clips') : null,
    h('button.btn.small.secondary', { on: { click: tap(() => end(), { sound: false }) } }, 'Plus tard'),
    h('button.snp-link', { on: { click: tap(() => end(() => ignorePending(p.id)), { sound: false }) } }, 'Ignorer'));
  card = h('div.snp-prop', { role: 'status' }, h('div.snp-prop-h', snapIcon(40), h('div', h('b', p.title || KIND_TITLES[p.kind] || 'Un joli moment'), h('small', career ? 'Publier cette story, ou une vidéo dans Clips ?' : 'Publier cette story ?'))), acts);
  ui.root.append(card);
  audio.play('pop2'); haptic('select');
}

let installed = false;
export function installMomentPrompt(): void {
  if (installed) return;
  installed = true;
  onMoment((m: Moment) => {
    const title = m.title || KIND_TITLES[m.kind] || 'Un joli moment';
    const p = receiveMoment({ kind: m.kind, title, caption: m.caption, data: m.data });
    if (!p) return;
    queue.push(p);
    window.setTimeout(next, 1400);
  });
}
export { KIND_TITLES };
