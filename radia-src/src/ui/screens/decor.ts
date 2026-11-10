import '../styles/shop.css';
/**
 * « Notre petit monde » : un petit square romantique que Radia décore avec
 * ses cœurs (gagnés en livrant des commandes). Chaque décoration apparaît
 * dans la scène animée, avec un mot d'Auguste.
 */
import { h, tap } from '../dom';
import { ui } from '../ui';
import { icon } from '../icons';
import { save, audio, events } from '../../core/app';
import { checkAchievements, spendHearts, stat } from '../../core/progress';
import { wallet, fmt } from '../../core/wallet';
import { DECOR } from '../../game/economy/economy';
import { drawDecorIcon, drawDecorScene, type DecorId } from '../../game/art/decor';
import { canvasUrl, paint } from '../../game/art/kit';
import { augusteSays } from '../components/augusteSays';
import { diamondUrl, diamondBurst } from './shop';
import { setBackdrop } from '../../game/scenes/backdrop';

import { PARTNER_DE } from '../../config/gift';
const iconUrl = (id: DecorId) => canvasUrl(`decor:${id}`, () => paint(72, 72, 2, (c) => drawDecorIcon(c, id, 72)));

export function openDecor(): Promise<void> {
  return new Promise((resolve) => {
    setBackdrop('monde');
    const cv = h('canvas.decor-canvas');
    const owned = () => new Set(save.data.decor);
    const progress = h('div.decor-progress');
    const hearts = h('span.chip', { style: 'color:#E8558F' }, icon('heart', 16), h('b', fmt(save.data.hearts)));
    const diamonds = h('span.chip', h('img', { src: diamondUrl(32), alt: '', style: 'width:18px;height:18px' }), h('b', fmt(wallet.diamonds())));
    const list = h('div.decor-list');
    const body = h('div.screen-body', h('div.decor-stage', cv), h('div.row', { style: 'justify-content:center;margin:8px 0' }, hearts, diamonds), progress, list);
    const scr = h('div.bg-soft.decor-screen', ui.header('Notre petit monde', close), body);
    ui.showScreen(scr);

    // animation de la scène (~20 images/s)
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 50) return;
      last = t;
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(r.width);
      const hh = Math.round(r.height);
      if (cv.width !== w * dpr || cv.height !== hh * dpr) { cv.width = w * dpr; cv.height = hh * dpr; }
      const ctx = cv.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawDecorScene(ctx, w, hh, owned(), t / 1000);
    };
    raf = requestAnimationFrame(draw);

    const render = () => {
      const o = owned();
      progress.textContent = '';
      progress.append(h('b', `${o.size}/${DECOR.length} décorations`), h('div.bar', h('i', { style: `width:${(o.size / DECOR.length) * 100}%` })));
      (hearts.lastChild as HTMLElement).textContent = fmt(save.data.hearts);
      (diamonds.lastChild as HTMLElement).textContent = fmt(wallet.diamonds());
      list.textContent = '';
      for (const d of DECOR) {
        const have = o.has(d.id);
        const priceLabel = d.diamonds ? h('span.price', h('img', { src: diamondUrl(32), alt: '' }), fmt(d.diamonds)) : h('span.price', '♡ ', fmt(d.hearts));
        const btn = have ? h('button.btn.small.secondary', { disabled: true }, '✓') : h(`button.btn.small${d.diamonds ? '.gold' : ''}`, priceLabel);
        if (!have) btn.addEventListener('click', tap(() => buy(d, btn)));
        list.append(h(`div.decor-row${have ? '.have' : ''}`, h('img', { src: iconUrl(d.id as DecorId), alt: '' }), h('div.grow', h('b', d.name), h('small', have ? d.line : d.diamonds ? 'Décoration spéciale' : 'À décorer avec tes cœurs')), btn));
      }
    };

    const buy = (d: (typeof DECOR)[number], btn: HTMLElement) => {
      const ok = d.diamonds ? wallet.spendDiamonds(d.diamonds) : spendHearts(d.hearts);
      if (!ok) {
        audio.play('invalid');
        ui.toast({ title: d.diamonds ? 'Pas assez de diamants' : 'Pas assez de cœurs', sub: d.diamonds ? `La carte ${PARTNER_DE} peut aider 😌` : 'Livre des commandes pour en gagner ♡', icon: 'heart' });
        return;
      }
      save.data.decor.push(d.id);
      stat('decorations');
      save.save();
      audio.play('chest');
      window.setTimeout(() => audio.play('reward'), 250);
      const r = btn.getBoundingClientRect();
      diamondBurst(r.left + r.width / 2, r.top, 12);
      cv.classList.remove('glow'); void cv.offsetWidth; cv.classList.add('glow');
      body.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => augusteSays(d.line, 3800), 500);
      render();
      checkAchievements();
    };

    const off = events.on('economy', render);
    const offH = events.on('hearts', render);
    render();

    function close() {
      cancelAnimationFrame(raf);
      off();
      offH();
      resolve();
    }
  });
}
