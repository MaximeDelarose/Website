import type { Activity } from '../types';
import { h } from '../../ui/dom';
import { reducedFx } from '../../core/app';
import {
  STEPS, STEP_LABEL, DISH_NAMES, LINE_INTRO, isMenu, styleOf, defaultMenu, proposalsFor, augusteMenuFor, evaluateGuess,
  revealScript, reactionFor, askFor, isChocolateDessert, cloneMenu,
  type Step, type DishId, type MenuChoice, type Predictions,
} from '../restaurant/logic';
import { ensureStyles, dishImg } from '../restaurant/ui';
import {
  SCENE_W, SCENE_H, PLATE_L, PLATE_R, BUST_L, BUST_R, FLAME, backdropCanvas, tableCanvas, bustCanvas, waiterCanvas,
} from '../restaurant/scene';
import { dishUrl } from '../restaurant/dishes';

const pct = (v: number, tot: number): string => `${((v / tot) * 100).toFixed(2)}%`;

/** « Devine ce que je prends » : Radia devine, puis arrivée des deux commandes à la table. */
const activity: Activity = async (ctx) => {
  ensureStyles();
  const saved = ctx.data.menuPick;
  const menuMissing = !isMenu(saved);
  // Le menu de Radia est LU (copie) ; jamais modifié.
  const radiaMenu: MenuChoice = menuMissing ? defaultMenu(ctx.rng) : cloneMenu(saved as MenuChoice);
  const rawStyle = (saved as { menu?: unknown } | undefined)?.menu ?? ctx.params.menu;
  const style = styleOf(rawStyle);

  const wrap = h(`div.rs-wrap.${style}`);
  ctx.root.append(wrap);
  let dead = false;
  ctx.onDispose(() => { dead = true; });

  // ---------------------------------------------------------------- 1) devinette
  await ctx.say('auguste', LINE_INTRO, 'tease');
  if (dead) return { score: 0, ok: false };

  const predictions: Partial<Predictions> = {};
  const augFace = h('canvas.rs-aug') as HTMLCanvasElement;
  const ask = h('div.rs-ask');
  const prog = h('div.rs-prog', ...STEPS.map(() => h('i')));
  const grid = h('div.rs-grid');
  const hint = h('div.rs-hint', 'Ce n’est pas un piège, juste de l’amour ♡');
  const top = h('div', { style: 'display:flex;align-items:center;gap:10px;flex-shrink:0' },
    h('div', { style: 'width:62px;height:62px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#efe6fb;box-shadow:0 0 0 2.5px var(--c-line)' }, augFace), ask);
  wrap.append(h('div.rs-title', h('b', 'Devine ce que je prends'), h('small', 'Auguste attend ta réponse ♡')), top, prog, grid, hint);
  {
    const b = bustCanvas(ctx.avatar('auguste', 300, 750, { expr: 'tease' }), 62, 62, 0, 0.26);
    augFace.width = b.width; augFace.height = b.height; augFace.style.cssText = 'width:62px;height:62px;display:block';
    augFace.getContext('2d')!.drawImage(b, 0, 0);
  }

  const pickOne = (step: Step): Promise<DishId> => new Promise((resolve) => {
    ask.textContent = askFor(step, ctx.repeat, ctx.rng);
    const idx = STEPS.indexOf(step);
    prog.querySelectorAll('i').forEach((el, i) => { el.className = i < idx ? 'on' : i === idx ? 'cur' : ''; });
    grid.replaceChildren();
    let locked = false;
    for (const id of proposalsFor(step, ctx.rng)) {
      const card = h('button.rs-card', dishImg(id), h('span', DISH_NAMES[id])) as HTMLButtonElement;
      card.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        card.classList.add('sel');
        ctx.pop(card);
        ctx.sound(step === 'starter' ? 'pop1' : step === 'main' ? 'pop2' : 'pop3');
        for (const el of Array.from(grid.children)) if (el !== card) el.classList.add('no');
        ctx.later(() => resolve(id), 650);
      });
      grid.append(card);
    }
  });

  for (const step of STEPS) {
    const id = await pickOne(step);
    if (dead) return { score: 0, ok: false };
    (predictions as Record<Step, DishId>)[step] = id as never;
  }
  const guess = predictions as Predictions;
  const flat = Object.freeze({ ...guess }) as Predictions; // réponses validées : figées
  prog.querySelectorAll('i').forEach((el) => { el.className = 'on'; });
  ask.textContent = 'Réponses envoyées… ♡';
  ctx.sound('heart');
  await ctx.wait(700);
  if (dead) return { score: 0, ok: false };

  // ---------------------------------------------------------------- 2) évaluation (pure, sans toucher aux entrées)
  const augusteMenu = augusteMenuFor(radiaMenu);
  const ev = evaluateGuess(radiaMenu, flat);
  const script = revealScript(ev, radiaMenu, ctx.repeat, ctx.rng);

  // ---------------------------------------------------------------- 3) scène de table
  wrap.remove();
  const scene = h('div.rv');
  const lower = h('div.rv-lower');
  ctx.root.append(h('div.ev-head', h('b', 'Les plats arrivent…'), h('small', 'Une table pour deux ♡')));
  const headEl = ctx.root.lastElementChild as HTMLElement;
  ctx.root.append(scene, lower);
  const place = (el: HTMLElement, x: number, y: number): void => { el.style.left = pct(x, SCENE_W); el.style.top = pct(y, SCENE_H); };
  const cv = (c: HTMLCanvasElement, cls: string): HTMLCanvasElement => { c.className = cls; return c; };

  scene.append(cv(backdropCanvas(style).cloneNode() as HTMLCanvasElement, 'rv-bg'));
  const bgSrc = backdropCanvas(style);
  (scene.firstChild as HTMLCanvasElement).getContext('2d')!.drawImage(bgSrc, 0, 0);

  const mkBust = (who: 'radia' | 'auguste', expr: 'smile' | 'laugh'): HTMLCanvasElement =>
    bustCanvas(ctx.avatar(who, 300, 750, { expr, arms: 'down' }), BUST_L.w, BUST_L.h, 0, 0.5);
  const bustL = h('div.rv-bust'); const bustR = h('div.rv-bust');
  const setBust = (host: HTMLElement, spec: typeof BUST_L, c: HTMLCanvasElement): void => {
    c.style.cssText = 'width:100%;height:100%;display:block';
    host.replaceChildren(c);
    host.style.cssText = `width:${pct(spec.w, SCENE_W)};height:${pct(spec.h, SCENE_H)};left:${pct(spec.x - spec.w / 2, SCENE_W)};top:${pct(spec.bottom - spec.h, SCENE_H)}`;
  };
  setBust(bustL, BUST_L, mkBust('radia', 'smile'));
  setBust(bustR, BUST_R, mkBust('auguste', 'smile'));
  scene.append(bustL, bustR);

  // serveur fictif (derrière la table)
  const waiter = waiterCanvas(86); waiter.className = 'rv-wait';
  waiter.style.cssText = `left:${pct(420, SCENE_W)};top:${pct(214, SCENE_H)};opacity:1`;
  if (!reducedFx()) scene.append(waiter);
  const tb = tableCanvas(style).cloneNode() as HTMLCanvasElement;
  scene.append(cv(tb, 'rv-table'));
  tb.getContext('2d')!.drawImage(tableCanvas(style), 0, 0);

  const flame = h('i.rv-flame'); place(flame, FLAME.x, FLAME.y + 1);
  scene.append(h('div.rv-glow'), flame);

  const tagL = h('div.rv-tag', 'Radia'); place(tagL, PLATE_L.x, PLATE_L.y + 36);
  const tagR = h('div.rv-tag.a', 'Auguste'); place(tagR, PLATE_R.x, PLATE_R.y + 36);
  scene.append(tagL, tagR);

  // assiettes : celle de Radia et celle d'Auguste = mêmes plats (menu de Radia / copie pour Auguste)
  const SLOTS: Array<[number, number, number]> = [[-54, 252, 48], [0, 244, 66], [55, 254, 48]];
  const plates: Array<{ l: HTMLImageElement; r: HTMLImageElement }> = [];
  const mkPlate = (id: DishId, cx: number, dx: number, y: number, size: number): HTMLImageElement => {
    const im = h('img.rv-plate', { src: dishUrl(id, 110), alt: '' }) as HTMLImageElement;
    place(im, cx + dx, y);
    im.style.width = pct(size, SCENE_W);
    scene.append(im);
    return im;
  };
  STEPS.forEach((s, i) => {
    const [dx, y, size] = SLOTS[i];
    plates.push({ l: mkPlate(radiaMenu[s], PLATE_L.x, dx, y, size), r: mkPlate(augusteMenu[s], PLATE_R.x, dx, y, size) });
  });

  // panneau récapitulatif
  const panel = h('div.rv-dishes', { style: 'opacity:0;transition:opacity .4s' });
  lower.append(panel);

  const hearts = (n: number): void => {
    const count = reducedFx() ? Math.min(2, n) : n;
    for (let i = 0; i < count; i++) {
      ctx.later(() => {
        const e = h('i.rv-heart', '♥');
        const x = 138 + Math.random() * 84; const y = 95 + Math.random() * 80;
        place(e, x, y); e.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 60)}px`);
        e.style.fontSize = `${16 + Math.round(Math.random() * 12)}px`;
        if (i % 3 === 0) e.style.color = '#f3c86b';
        scene.append(e);
        window.setTimeout(() => e.remove(), 2500);
      }, i * 140);
    }
  };

  // arrivée du serveur
  ctx.sound('whoosh');
  await ctx.wait(500);
  if (!reducedFx()) {
    waiter.style.left = pct(200, SCENE_W);
    await ctx.wait(1400);
  }
  if (dead) return { score: 0, ok: false };
  ctx.sound('deliver');
  // entrée, plat, dessert arrivent l'un après l'autre (Radia puis Auguste)
  for (let i = 0; i < STEPS.length; i++) {
    plates[i].l.classList.add('in');
    ctx.later(() => plates[i].r.classList.add('in'), 180);
    ctx.sound(i === 0 ? 'pop1' : i === 1 ? 'pop2' : 'pop3');
    await ctx.wait(reducedFx() ? 150 : 620);
    if (dead) return { score: 0, ok: false };
  }
  await ctx.wait(400);
  if (!reducedFx()) { waiter.style.left = pct(440, SCENE_W); waiter.style.opacity = '0'; }
  headEl.querySelector('b')!.textContent = 'Bon appétit ♡';

  // ---------------------------------------------------------------- 4) verdict, étape par étape
  await ctx.say('auguste', script.transition, 'tease');
  if (dead) return { score: 0, ok: false };
  panel.style.opacity = '1';
  panel.append(h('b', ''), h('b', 'Ta devinette'), h('b', 'Dans l’assiette'));
  for (const s of STEPS) {
    const hit = ev.perStep[s];
    panel.append(
      h('b', STEP_LABEL[s]),
      h(`span${hit ? '.h' : '.m'}`, DISH_NAMES[guess[s]]),
      h(`span${hit ? '.h' : ''}`, `${DISH_NAMES[radiaMenu[s]]}${hit ? ' ✓' : ''}`),
    );
    ctx.sound(hit ? 'sparkle' : 'page');
    ctx.pop(panel);
    if (hit) hearts(3);
    await ctx.wait(650);
    if (dead) return { score: 0, ok: false };
  }
  lower.insertBefore(h('div.rs-hint', { style: 'color:#58433f;font-weight:700;font-size:14px' }, reactionFor(ev.perfect, ctx.repeat, ctx.rng)), panel);
  await ctx.wait(500);

  // ---------------------------------------------------------------- 5) dialogues d'Auguste
  const swapExpr = (who: 'radia' | 'auguste', expr: 'smile' | 'laugh'): void => {
    setBust(who === 'radia' ? bustL : bustR, who === 'radia' ? BUST_L : BUST_R, mkBust(who, expr));
  };
  for (let i = 0; i < script.lines.length; i++) {
    if (i === 0) { swapExpr('auguste', ev.perfect ? 'laugh' : 'smile'); swapExpr('radia', ev.perfect ? 'laugh' : 'smile'); }
    if (i === 1) { swapExpr('auguste', 'smile'); swapExpr('radia', 'smile'); bustL.classList.add('happy'); bustR.classList.add('happy'); hearts(10); ctx.sound('heart'); }
    if (i === 2) { swapExpr('auguste', 'laugh'); hearts(5); }
    await ctx.say('auguste', script.lines[i], i === 1 ? 'love' : i === 2 ? 'laugh' : ev.perfect ? 'love' : 'tease');
    if (dead) return { score: 0, ok: false };
  }
  hearts(14);
  const loop = (): void => { if (dead) return; hearts(4); ctx.later(loop, 1500); };
  ctx.later(loop, 1200);
  ctx.confetti(ev.perfect ? 40 : 18);
  ctx.sound(ev.perfect ? 'victory' : 'reward');
  await ctx.wait(500);

  await new Promise<void>((resolve) => {
    lower.append(ctx.button('Continuer ♡', () => resolve(), 'gold'));
    ctx.onDispose(() => resolve());
  });

  const dessertChocolate = isChocolateDessert(radiaMenu.dessert);
  return {
    score: Math.round((ev.hits / 3) * 100),
    ok: ev.hits === 3,
    data: {
      predictions: { ...guess },
      hits: ev.hits,
      perfect: ev.perfect,
      augusteMenu: { ...augusteMenu },
      dessertChocolate,
      menuMissing,
    },
    tags: ev.perfect ? ['perfect'] : [],
  };
};
export default activity;
