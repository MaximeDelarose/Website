/** Bulle d'Auguste avec son visage (photo si disponible, sinon dessin). Passe par le gestionnaire central de notices (message important). */
import '../styles/auguste-says.css';
import { h } from '../dom';
import { ui } from '../ui';
import { notify, core } from '../notify';
import { dbg } from '../../core/debug';
import { canvasUrl } from '../../game/art/kit';
import { medallionCanvas } from '../../game/art/characters';
import { hasPhotos, photoUrlNow } from '../../core/photos';

import { PARTNER } from '../../config/gift';
export interface SaysOptions {
  /** Classe ajoutée à la bulle (ex. `en-aug` : pastille compacte du plateau). */
  className?: string;
  /** Pose la bulle quelque part de précis ; renvoie false si impossible (la bulle n'est alors pas affichée). */
  mount?: (el: HTMLElement) => boolean;
  /** Priorité (1 à 5) : une bulle nettement plus importante passe devant celle qui est affichée. */
  prio?: number;
}

export function augusteSays(text: string, ms = 3400, opts: SaysOptions = {}): void {
  notify({
    key: `aug:${text}`, channel: 'narrative', prio: opts.prio ?? 3, ttl: Math.max(1500, ms), ms,
    show: () => {
      const src = (hasPhotos() && photoUrlNow('head-new')) || canvasUrl('med:auguste:laugh', () => medallionCanvas('auguste', { expr: 'laugh' }, 120));
      const el = h('div.aug-says', h('img', { src, alt: `${PARTNER}` }), h('div', h('b', `${PARTNER}`), h('span', text)));
      if (opts.className) el.classList.add(...opts.className.split(' '));
      if (opts.mount) { if (!opts.mount(el)) return () => undefined; } else ui.root.append(el);
      return (immediate) => { if (immediate) { el.remove(); return; } el.classList.add('out'); window.setTimeout(() => el.remove(), 300); };
    },
  });
}

// mode ?debug : rafales de notices pour les tests d'anti-superposition
dbg('notify', { toast: (title: string) => ui.toast({ title }), says: (text: string, ms = 2200, prio = 3) => augusteSays(text, ms, { prio }), state: () => ({ visible: core.visibleKeys(), waiting: core.waitingKeys() }) });
