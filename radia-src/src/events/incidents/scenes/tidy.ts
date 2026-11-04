/** Scène : le chat a fait une bêtise — animation amusante puis rangement (glisser les objets à leur place). */
import { h } from '../../../ui/dom';
import { audio, save } from '../../../core/app';
import { haptic } from '../../../core/haptics';
import { paint } from '../../../game/art/kit';
import { drawCat, drawCatItem } from '../../../game/art/world/cat';
import type { CatItemId } from '../../../data/world/ids';
import { openFrame, confettiBurst } from './frame';

const ITEMS: { id: CatItemId; name: string }[] = [
  { id: 'cushion', name: 'le coussin' }, { id: 'toy-ball', name: 'la balle' }, { id: 'basket', name: 'le panier' }, { id: 'collar-bell', name: 'le collier' },
];

export function runTidy(): Promise<boolean> {
  const f = openFrame('Le chat a fait une bêtise', 'Glisse chaque objet sur son emplacement.', 'td');
  const cat = h('div.td-cat', paint(110, 90, 2, (c) => drawCat(c, 'play', 110, 90, 0, { toy: true, collar: save.data.world.cat.equipped.collar })));
  const bubble = h('div.td-bub', 'Miaou ? (Moi ? Jamais.)');
  const targets = h('div.td-targets');
  const mess = h('div.td-mess');
  let left = ITEMS.length;
  const slots = ITEMS.map((it, i) => {
    const t = h('div.td-slot', { 'data-i': i }, paint(54, 54, 2, (c) => { c.globalAlpha = 0.35; drawCatItem(c, it.id, 54); }));
    targets.append(t);
    return t;
  });
  ITEMS.forEach((it, i) => {
    const el = h('div.td-item', { 'data-i': i, style: `left:${8 + ((i * 53 + 17) % 70)}%;top:${10 + ((i * 37 + 11) % 60)}%;--tilt:${(i % 2 ? 1 : -1) * (8 + i * 6)}deg` }, paint(58, 58, 2, (c) => drawCatItem(c, it.id, 58)));
    let sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
    el.addEventListener('pointerdown', (e) => {
      if (el.classList.contains('placed')) return;
      drag = true; try { el.setPointerCapture(e.pointerId); } catch { /* pointeur synthétique */ } sx = e.clientX; sy = e.clientY; el.classList.add('drag'); audio.play('pickup'); haptic('select');
    });
    el.addEventListener('pointermove', (e) => { if (!drag) return; el.style.transform = `translate(${ox + e.clientX - sx}px, ${oy + e.clientY - sy}px) scale(1.12)`; });
    const end = (e: PointerEvent) => {
      if (!drag) return;
      drag = false; el.classList.remove('drag');
      const r = slots[i].getBoundingClientRect();
      const cx = e.clientX, cy = e.clientY;
      if (cx >= r.left - 14 && cx <= r.right + 14 && cy >= r.top - 14 && cy <= r.bottom + 14) {
        const er = el.getBoundingClientRect();
        // décalage déjà appliqué par le glisser + reste à parcourir jusqu'au centre de l'emplacement
        ox += (e.clientX - sx) + (r.left + r.width / 2 - (er.left + er.width / 2)); oy += (e.clientY - sy) + (r.top + r.height / 2 - (er.top + er.height / 2));
        el.style.transform = `translate(${ox}px, ${oy}px)`; el.classList.add('placed'); slots[i].classList.add('ok');
        audio.play('drop'); haptic('drop');
        bubble.textContent = left > 1 ? ['Miaou… (OK, c’était moi.)', 'Prrr ? (Tu as de bons réflexes.)', 'Mrrp ! (Presque fini !)'][ITEMS.length - left] ?? 'Miaou !' : 'Prrrrr ♡';
        if (--left === 0) { audio.play('reward'); haptic('reward'); f.setHint('Tout est rangé, et le chat ronronne ♡'); cat.classList.add('purr'); f.later(() => confettiBurst(f.layer), 200); f.finish(true, 1800); }
      } else { el.style.transform = `translate(${ox}px, ${oy}px)`; audio.play('invalid'); }
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    mess.append(el);
  });
  f.body.append(h('div.td-top', cat, bubble), mess, targets);
  return f.result;
}
