/** Choix en famille : plateau du goûter chez maman, cadeau de voyage, retrouvailles. Aucun mauvais choix, le proche réagit avec douceur. */
import { h } from '../../ui/dom';
import { endCard, injectCss, introCard } from '../games/action/common';
import { pickPreset, type PickOption } from '../games/family/picks';
import type { Activity } from '../types';

const activity: Activity = async (ctx) => {
  injectCss();
  const preset = pickPreset(String(ctx.params.preset ?? 'tea'));
  ctx.header(preset.title, preset.sub);
  const body = h('div', { style: 'flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto;padding:4px' });
  ctx.root.append(body);
  await introCard(ctx, { title: preset.title, text: preset.intro, art: h('div', { style: 'font-size:46px' }, '🫖💐') });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const chosen: PickOption[] = [];
  for (let si = 0; si < preset.steps.length; si++) {
    const step = preset.steps[si];
    const picked: PickOption[] = [];
    await new Promise<void>((resolve) => {
      const hint = h('div.ea-sub', '');
      const go = ctx.button('Valider ♡', () => resolve(), 'gold'); go.style.width = '100%';
      const refresh = (): void => {
        const left = step.count - picked.length;
        hint.textContent = left > 0 ? `Choisis ${left} élément${left > 1 ? 's' : ''}` : 'C’est parfait, tu peux valider';
        go.disabled = left > 0; go.style.opacity = left > 0 ? '0.5' : '1';
      };
      const grid = h('div.ea-grid', { style: `grid-template-columns:repeat(${step.options.length > 4 ? 3 : 2},1fr);gap:8px` });
      for (const o of step.options) {
        const t = h('button.ea-tile', { type: 'button', style: 'padding:8px 4px;min-height:84px', 'aria-label': o.label }, h('span', { style: 'font-size:34px;line-height:1' }, o.emoji), h('small', { style: 'font-size:12px;margin-top:4px' }, o.label));
        t.addEventListener('click', () => {
          const i = picked.indexOf(o);
          if (i >= 0) { picked.splice(i, 1); ctx.sound('drop'); }
          else if (step.count === 1) { picked.splice(0, picked.length, o); grid.querySelectorAll('.ea-tile').forEach((el) => el.classList.remove('on')); ctx.sound('pickup'); ctx.pop(t); }
          else if (picked.length < step.count) { picked.push(o); ctx.sound('pickup'); ctx.pop(t); }
          else { ctx.sound('invalid'); return; }
          t.classList.toggle('on', picked.includes(o));
          refresh();
        });
        grid.append(t);
      }
      body.replaceChildren(h('div.ea-sub', { style: 'margin:0;font-size:17px' }, step.prompt), hint, grid, h('div', { style: 'flex:1;min-height:8px' }), go);
      refresh();
    });
    if (!ctx.isAlive()) return { score: 0, ok: false };
    body.replaceChildren();
    for (const o of picked) { await ctx.say(preset.rel, o.react); if (!ctx.isAlive()) return { score: 0, ok: false }; }
    chosen.push(...picked);
  }
  await endCard(ctx, { title: preset.endTitle, art: h('div', { style: 'font-size:44px' }, chosen.map((o) => o.emoji).join(' ')), lines: [...preset.endLines] });
  return { score: 100, ok: true, data: { preset: preset.id, picks: chosen.map((o) => o.id) } };
};
export default activity;
