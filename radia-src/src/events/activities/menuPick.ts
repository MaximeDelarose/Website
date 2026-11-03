import type { Activity } from '../types';
import { h } from '../../ui/dom';
import {
  STEPS, STEP_IDS, STEP_LABEL, DISH_NAMES, MENU_TITLES, styleOf, isMenu,
  type Step, type DishId, type MenuChoice,
} from '../restaurant/logic';
import { ensureStyles, dishImg } from '../restaurant/ui';

type View = Step | 'summary';

/** Vrai menu interactif : UNE entrée, UN plat, UN dessert, résumé puis validation. */
const activity: Activity = async (ctx) => {
  ensureStyles();
  const style = styleOf(ctx.params.menu);
  const T = MENU_TITLES[style];
  const picks: Partial<Record<Step, DishId>> = {};
  let view: View = 'starter';
  let finished = false;

  const wrap = h(`div.rs-wrap.${style}`);
  ctx.root.append(wrap);

  const title = h('div.rs-title', h('b', T.title), h('small', T.sub));
  const tabs = h('div.rs-tabs');
  const body = h('div.rs-grid');
  const hint = h('div.rs-hint');
  const foot = h('div.rs-foot');
  wrap.append(title, tabs, body, hint, foot);

  const complete = (): boolean => STEPS.every((s) => !!picks[s]);

  const renderTabs = (): void => {
    tabs.replaceChildren();
    for (const s of STEPS) {
      const p = picks[s];
      const t = h(`button.rs-tab${view === s ? '.cur' : ''}${p ? '.done' : ''}`, STEP_LABEL[s], h('small', p ? DISH_NAMES[p] : '—')) as HTMLButtonElement;
      t.addEventListener('click', () => { if (view !== s) { ctx.sound('page'); view = s; render(); } });
      tabs.append(t);
    }
  };

  const choose = (s: Step, id: DishId, card: HTMLElement): void => {
    picks[s] = id;
    ctx.sound(s === 'starter' ? 'pop1' : s === 'main' ? 'pop2' : 'pop3');
    ctx.pop(card);
    for (const el of Array.from(body.children)) el.classList.toggle('sel', el === card);
    renderTabs();
    const next: View = s === 'starter' ? (picks.main ? (picks.dessert ? 'summary' : 'dessert') : 'main')
      : s === 'main' ? (picks.dessert ? 'summary' : 'dessert') : 'summary';
    ctx.later(() => { if (finished) return; view = next; render(); }, 520);
  };

  const renderChoices = (s: Step): void => {
    body.className = 'rs-grid';
    body.replaceChildren();
    for (const id of STEP_IDS[s]) {
      const card = h(`button.rs-card${picks[s] === id ? '.sel' : ''}`, dishImg(id), h('span', DISH_NAMES[id])) as HTMLButtonElement;
      card.addEventListener('click', () => choose(s, id, card));
      body.append(card);
    }
    hint.textContent = s === 'starter' ? 'Touche un plat pour le choisir ♡' : `Choisis ton ${STEP_LABEL[s].toLowerCase()}`;
    foot.replaceChildren();
    if (complete()) foot.append(ctx.button('Voir mon menu', () => { view = 'summary'; render(); }, 'secondary'));
  };

  const renderSummary = (): void => {
    body.className = 'rs-sum';
    body.replaceChildren();
    for (const s of STEPS) {
      const id = picks[s];
      if (!id) continue;
      const row = h('button.rs-row', dishImg(id, 80), h('div', h('small', STEP_LABEL[s]), h('b', DISH_NAMES[id]), h('em', 'Modifier'))) as HTMLButtonElement;
      row.addEventListener('click', () => { ctx.sound('page'); view = s; render(); });
      body.append(row);
    }
    hint.textContent = complete() ? 'Ton menu est prêt, ma reine ♡' : 'Il manque encore un plat…';
    foot.replaceChildren();
    const ok = ctx.button('Valider mon menu ♡', () => { void validate(); }, 'gold');
    if (!complete()) ok.disabled = true;
    foot.append(ok);
  };

  let resolveFn: (r: { score: number; ok: boolean; data: Record<string, unknown> }) => void = () => {};
  const done = new Promise<{ score: number; ok: boolean; data: Record<string, unknown> }>((res) => { resolveFn = res; });

  const validate = async (): Promise<void> => {
    if (finished || !complete()) return;
    finished = true;
    const menu: MenuChoice = { starter: picks.starter as MenuChoice['starter'], main: picks.main as MenuChoice['main'], dessert: picks.dessert as MenuChoice['dessert'] };
    if (!isMenu(menu)) { finished = false; return; }
    ctx.sound('victory');
    ctx.confetti(30);
    for (const el of Array.from(body.children)) ctx.pop(el as HTMLElement);
    foot.replaceChildren();
    hint.textContent = 'Commande envoyée en cuisine ♡';
    await ctx.wait(1200);
    resolveFn({ score: 100, ok: true, data: { menu: style, starter: menu.starter, main: menu.main, dessert: menu.dessert } });
  };

  const render = (): void => {
    renderTabs();
    if (view === 'summary') renderSummary(); else renderChoices(view);
  };
  render();

  ctx.onDispose(() => { finished = true; resolveFn({ score: 0, ok: false, data: {} }); });
  return done;
};
export default activity;
