/** Scène : commande spéciale de chocolats — consultable à tout moment, remplie à la main (gratuit) ou via les fusions Endless. */
import { h, tap } from '../../../ui/dom';
import { audio } from '../../../core/app';
import { haptic } from '../../../core/haptics';
import { paint } from '../../../game/art/kit';
import { drawChocolate } from '../../../game/art/world/chocolate';
import type { ChocId } from '../../../data/world/ids';
import { openFrame, confettiBurst } from './frame';
import { completeSpecialOrder, deliverSpecialItem, getSpecialOrder } from '../chocOrder';

const CHOC_LEVEL_NAMES = ['Fève', 'Truffe', 'Praliné', 'Bonbon', 'Boîte', 'Coffret', 'Fontaine', 'Chocolaterie royale'];
/** Dessin du chocolat de la chocolaterie qui ressemble le plus à chaque niveau de fusion. */
const ART: ChocId[] = ['milk', 'truffle', 'praline', 'hazelnut', 'heart', 'royalbox', 'royalbox', 'royalbox'];
const chocArt = (level: number, size = 54) => paint(size, size, 2, (c) => drawChocolate(c, ART[Math.min(ART.length, Math.max(1, level)) - 1], size));

export function runOrder(): Promise<boolean> {
  const f = openFrame('Commande spéciale', 'Une grosse commande de chocolats. Elle t’attend sans limite de temps.', 'od');
  const list = h('div.od-list');
  const reward = h('div.od-reward');
  const foot = h('p.inc-foot', 'Les chocolats de la fusion (mode Endless) comptent aussi pour cette commande. Ici, tu peux aussi les préparer à la main, gratuitement.');
  f.body.append(list, reward, foot);
  let busy = false;
  const render = () => {
    const o = getSpecialOrder();
    if (!o) { f.finish(false); return; }
    list.replaceChildren(...o.lines.map((ln) => {
      const row = h('div.od-row', h('div.od-art', chocArt(ln.l)), h('div.od-name', h('b', CHOC_LEVEL_NAMES[ln.l - 1] ?? `Niveau ${ln.l}`), h('small', `Niveau ${ln.l}`)),
        h('div.od-slots', ...Array.from({ length: ln.n }, (_, k) => h(`i.od-dot${k < ln.have ? '.on' : ''}`))));
      if (ln.have < ln.n) {
        const mk = h('button.btn.small.od-make', { on: { click: tap(() => { if (busy) return; busy = true; audio.play('pop3'); haptic('drop'); row.classList.add('mixing'); window.setTimeout(() => { deliverSpecialItem(ln.l); busy = false; render(); }, 380); }, { sound: false }) } }, 'Préparer');
        row.append(mk);
      } else row.append(h('span.od-ok', '✓'));
      return row;
    }));
    reward.replaceChildren(h('span', 'Récompense : '), h('b', `${o.reward.coins} pièces`), h('span', ` · ${o.reward.diamonds} diamants · ${o.reward.cocoa} cacao`));
    if (o.complete) {
      const go = h('button.btn.od-go', { on: { click: tap(() => {
        const r = completeSpecialOrder();
        if (r.ok) { audio.play('reward'); haptic('reward'); confettiBurst(f.layer, 30); f.finish(true, 1500); }
      }, { sound: false }) } }, 'Livrer la commande ♡');
      foot.replaceChildren(go);
    }
  };
  render();
  return f.result;
}
