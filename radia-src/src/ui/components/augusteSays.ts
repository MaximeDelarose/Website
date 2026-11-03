/** Bulle d'Auguste avec son visage (photo si disponible, sinon dessin). */
import '../styles/auguste-says.css';
import { h } from '../dom';
import { ui } from '../ui';
import { canvasUrl } from '../../game/art/kit';
import { medallionCanvas } from '../../game/art/characters';
import { hasPhotos, photoUrlNow } from '../../core/photos';

let current: HTMLElement | null = null;

export function augusteSays(text: string, ms = 3400): void {
  current?.remove();
  const src = (hasPhotos() && photoUrlNow('face-auguste')) || canvasUrl('med:auguste:laugh', () => medallionCanvas('auguste', { expr: 'laugh' }, 120));
  const el = h('div.aug-says', h('img', { src, alt: 'Auguste' }), h('div', h('b', 'Auguste'), h('span', text)));
  ui.root.append(el);
  current = el;
  window.setTimeout(() => { el.classList.add('out'); window.setTimeout(() => el.remove(), 300); if (current === el) current = null; }, ms);
}
