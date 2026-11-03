/** Bouquet : marché aux fleurs, mode enfant, décor floral de l'hôtel ou du palace. */
import { h } from '../../ui/dom';
import type { Activity } from '../types';
import {
  BOUQUET_MAX, BOUQUET_MIN, BOUQUET_TEXT, FLOWER_NAMES, FLOWER_TONE, THEMES, WRAP_IDS, WRAP_NAMES, bouquetChoices, bouquetHarmony, bouquetTip,
  finalBouquetScore, normBouquetMode, starsOf, type FlowerId, type Theme, type WrapId,
} from '../games/creative/bouquetLogic';
import { flowerIconUrl, headUrl, wrapUrl } from '../games/creative/creativeArt';
import { dots, endScreen, useStyles } from '../games/creative/creativeUi';

const STAGE_CSS = `
.bq-stage{position:relative;flex:1 1 220px;min-height:190px;max-height:420px;border-radius:24px;overflow:hidden;box-shadow:0 0 0 3px rgba(255,255,255,.8) inset,0 4px 14px rgba(59,49,82,.14)}
.bq-stage.market{background:linear-gradient(180deg,#fff4e8 0%,#fde0ea 100%)}
.bq-stage.kid{background:linear-gradient(180deg,#e6f6ff 0%,#ffe9f4 100%)}
.bq-stage.hotel{background:linear-gradient(180deg,#fff4e8 0%,#f3e2ce 100%)}
.bq-stage.palace{background:linear-gradient(180deg,#fbe9c9 0%,#f5d9a7 100%)}
.bq-awn{position:absolute;left:0;right:0;top:0;height:26px;background:repeating-linear-gradient(90deg,#ff9dbf 0 28px,#fff4e8 28px 56px);border-radius:0 0 18px 18px;box-shadow:0 3px 0 rgba(88,67,63,.15)}
.bq-fl{position:absolute;transform-origin:50% 100%;transition:transform .4s cubic-bezier(.34,1.56,.64,1),height .3s,top .3s,left .3s,width .3s}
.bq-fl img{position:absolute;left:0;top:0;width:100%;display:block;pointer-events:none}
.bq-stem{position:absolute;left:calc(50% - 3px);width:6px;bottom:0;border-radius:3px;background:linear-gradient(90deg,#6fbf7c,#4e9a62);box-shadow:0 0 0 2px #58433f}
.bq-wr{position:absolute;display:block;pointer-events:none}
.bq-hint{position:absolute;left:0;right:0;top:46%;text-align:center;font-size:15px;color:var(--choco-soft);pointer-events:none}
.bq-theme{flex-direction:row;gap:8px;min-height:62px;font-size:14px}
.bq-theme i{width:22px;height:22px;border-radius:50%;box-shadow:0 0 0 2px rgba(88,67,63,.25);margin-left:-8px}
.bq-theme i:first-child{margin-left:0}
`;

interface Fan { el: HTMLElement; update(fl: FlowerId[], wrap: WrapId | null, w: number, hh: number, popIdx?: number): void }

function makeFan(ctx: Parameters<Activity>[0], cls: string, hint = ''): Fan {
  const el = h(`div.bq-stage.${cls}`);
  const items: HTMLElement[] = [];
  const hintEl = hint ? h('div.bq-hint', hint) : null;
  if (hintEl) el.append(hintEl);
  const wrapEl = h('img.bq-wr', { alt: '', draggable: false }) as HTMLImageElement;
  wrapEl.style.zIndex = '30';
  let wrapId: WrapId | null = null;
  const update: Fan['update'] = (fl, wrap, w, hh, popIdx = -1) => {
    const ww = Math.min(w * 0.52, 210, hh * 0.5), wh = ww * (170 / 190);
    const py = hh - 10 - wh * 0.78;
    const Hs = Math.max(64, Math.min(w * 0.3, 118, hh * 0.36));
    const L0 = Math.max(40, py - 34 - Hs * 0.5);
    hintEl?.style.setProperty('display', fl.length ? 'none' : '');
    while (items.length > fl.length) items.pop()!.remove();
    while (items.length < fl.length) {
      const i = items.length;
      const img = h('img', { src: headUrl(fl[i], 128), alt: '', draggable: false });
      const wrp = h('div.bq-fl', {}, h('div.bq-stem'), img);
      wrp.style.transition = 'none';
      el.append(wrp);
      items.push(wrp);
      void wrp.offsetWidth;
      wrp.style.transition = '';
      if (i === popIdx || popIdx === -1) ctx.pop(img);
    }
    const n = fl.length;
    fl.forEach((id, i) => {
      const wrp = items[i];
      const img = wrp.querySelector('img') as HTMLImageElement;
      const want = headUrl(id, 128);
      if (img.getAttribute('src') !== want) img.setAttribute('src', want);
      const t = n === 1 ? 0.5 : i / (n - 1);
      const dist = Math.abs(t - 0.5) * 2;
      const ang = (t - 0.5) * (n === 1 ? 0 : Math.min(92, 30 + n * 9));
      const L = L0 * (1 - 0.2 * dist * dist) - (i % 2) * L0 * 0.05;
      const tall = L + Hs * 0.5;
      Object.assign(wrp.style, { left: `${w / 2 - Hs / 2}px`, top: `${py - tall}px`, width: `${Hs}px`, height: `${tall}px` });
      (wrp.querySelector('.bq-stem') as HTMLElement).style.top = `${Hs * 0.5}px`;
      img.style.height = `${Hs}px`;
      wrp.style.transform = `rotate(${ang.toFixed(1)}deg)`;
      wrp.style.zIndex = String(10 + Math.round((1 - dist) * 10));
    });
    if (wrap) {
      if (!wrapEl.isConnected) el.append(wrapEl);
      if (wrapId !== wrap) { wrapEl.src = wrapUrl(wrap, 190, 170); wrapId = wrap; ctx.pop(wrapEl); }
      Object.assign(wrapEl.style, { left: `${w / 2 - ww / 2}px`, top: `${py - wh * 0.22}px`, width: `${ww}px`, height: `${wh}px` });
    } else if (wrapEl.isConnected) { wrapEl.remove(); wrapId = null; }
  };
  return { el, update };
}

const activity: Activity = async (ctx) => {
  const mode = normBouquetMode(ctx.params.mode);
  const kid = mode === 'kid';
  const T = BOUQUET_TEXT[mode];
  useStyles(ctx);
  const st = h('style'); st.textContent = STAGE_CSS; ctx.root.append(st);
  ctx.header(T.title, T.sub);
  const wrap = h('div.cr-wrap');
  const steps = kid ? ['Fleurs', 'Emballage'] : ['Ambiance', 'Fleurs', 'Emballage'];
  const prog = dots(steps.length);
  const fan = makeFan(ctx, mode, 'Touche une fleur pour commencer');
  if (mode === 'market') fan.el.append(h('div.bq-awn'));
  const panel = h('div.cr-panel');
  wrap.append(prog.el, fan.el, panel);
  ctx.root.append(wrap);

  const flowers: FlowerId[] = [];
  let wrapId: WrapId | null = null;
  let theme: Theme | null = null;
  let finished = false;

  const draw = (popIdx = -1) => {
    const w = fan.el.clientWidth || 340, hh = fan.el.clientHeight || 240;
    fan.update(flowers, wrapId, w, hh, popIdx);
  };
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => { if (!finished) draw(-2); });
    ro.observe(fan.el);
    ctx.onDispose(() => ro.disconnect());
  }

  await ctx.say('auguste', T.intro, 'smile');
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const next = <T2>(build: (done: (v: T2) => void) => void): Promise<T2> => new Promise<T2>((res) => build(res));

  // --- étape ambiance
  if (!kid) {
    prog.set(0, steps[0]);
    theme = await next<Theme>((done) => {
      panel.replaceChildren(h('p.cr-q', 'Quelle ambiance pour ton bouquet ?'));
      const grid = h('div.cr-grid', { style: '--cols:2' });
      for (const th of THEMES) {
        const b = h('button.cr-tile.bq-theme', {}, h('span', {}, ...th.swatch.map((c) => h('i', { style: `background:${c}` }))), h('span', th.name)) as HTMLButtonElement;
        b.addEventListener('click', () => { ctx.sound('sparkle'); b.classList.add('on'); ctx.pop(b); ctx.later(() => done(th), 380); }, { once: true });
        grid.append(b);
      }
      panel.append(grid, h('p.cr-note', 'Tu pourras mélanger comme tu veux.'));
    });
  }
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // --- étape fleurs
  const stepFl = kid ? 0 : 1;
  prog.set(stepFl, steps[stepFl]);
  draw(-2);
  await next<void>((done) => {
    const choices = bouquetChoices(mode);
    const cols = kid ? 3 : 5;
    panel.replaceChildren(h('p.cr-q', kid ? 'Touche les fleurs que tu aimes !' : `Choisis ${BOUQUET_MIN} à ${BOUQUET_MAX} fleurs`));
    const grid = h('div.cr-grid', { style: `--cols:${cols}` });
    const tiles = new Map<FlowerId, HTMLButtonElement>();
    const note = h('p.cr-note');
    const nextBtn = ctx.button('', () => { if (flowers.length >= BOUQUET_MIN) done(); else ctx.sound('invalid'); }, 'gold');
    const undo = ctx.button('↶ Retirer', () => {
      if (!flowers.length) return;
      flowers.pop(); ctx.sound('whoosh'); refresh(); draw(-2);
    }, 'secondary');
    const refresh = () => {
      for (const [id, b] of tiles) {
        const n = flowers.filter((f) => f === id).length;
        b.querySelector('.cnt')?.remove();
        if (n) b.append(h('span.cnt', n));
        b.classList.toggle('on', n > 0);
      }
      const left = BOUQUET_MIN - flowers.length;
      nextBtn.textContent = left > 0 ? `Encore ${left} ♡` : 'Suite ›';
      nextBtn.style.opacity = left > 0 ? '0.55' : '1';
      note.textContent = flowers.length >= BOUQUET_MAX ? 'Bouquet complet ! Tu peux retirer une fleur.' : bouquetTip(bouquetHarmony(flowers, wrapId ?? '', theme?.tones));
      if (kid) note.textContent = flowers.length < BOUQUET_MIN ? `${flowers.length} / ${BOUQUET_MIN}` : flowers.length >= BOUQUET_MAX ? 'Bouquet complet !' : 'Superbe ! Tu peux continuer ♡';
    };
    const order = theme ? [...choices].sort((a, b) => Number(theme!.tones.includes(FLOWER_TONE[b])) - Number(theme!.tones.includes(FLOWER_TONE[a]))) : choices;
    for (const id of order) {
      const sz = kid ? 54 : 38;
      const b = h('button.cr-tile', { style: kid ? 'min-height:76px;font-size:13px' : '', class: theme?.tones.includes(FLOWER_TONE[id]) ? 'rec' : '' },
        h('img', { src: flowerIconUrl(id, sz), width: sz, height: sz, alt: '' }), h('span', FLOWER_NAMES[id])) as HTMLButtonElement;
      b.addEventListener('click', () => {
        if (flowers.length >= BOUQUET_MAX) { ctx.sound('invalid'); ctx.pop(b); return; }
        flowers.push(id);
        ctx.sound((['pop1', 'pop2', 'pop3'] as const)[flowers.length % 3]);
        ctx.pop(b); refresh(); draw(flowers.length - 1);
        if (flowers.length === BOUQUET_MAX) { ctx.sound('combo'); ctx.confetti(10); }
      });
      tiles.set(id, b); grid.append(b);
    }
    refresh();
    panel.append(grid, note, h('div.cr-row', {}, undo, nextBtn));
  });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // --- étape emballage
  const stepWr = steps.length - 1;
  prog.set(stepWr, steps[stepWr]);
  await next<void>((done) => {
    panel.replaceChildren(h('p.cr-q', 'Choisis l\'emballage'));
    const grid = h('div.cr-grid', { style: `--cols:${kid ? 3 : 5}` });
    const note = h('p.cr-note', 'Touche pour essayer.');
    const tiles: HTMLButtonElement[] = [];
    const ok = ctx.button('Terminer ♡', () => { if (wrapId) done(); else { ctx.sound('invalid'); note.textContent = 'Choisis un emballage ♡'; } }, 'gold');
    for (const id of WRAP_IDS) {
      const b = h('button.cr-tile', { style: kid ? 'min-height:92px;font-size:13px' : 'min-height:84px' },
        h('img', { src: wrapUrl(id, 62, 56), width: 44, height: 40, alt: '' }), h('span', WRAP_NAMES[id])) as HTMLButtonElement;
      b.addEventListener('click', () => {
        wrapId = id; ctx.sound('sparkle'); ctx.pop(b);
        tiles.forEach((t) => t.classList.toggle('on', t === b));
        draw(-2);
        note.textContent = kid ? 'Joli choix !' : bouquetTip(bouquetHarmony(flowers, id, theme?.tones));
      });
      tiles.push(b); grid.append(b);
    }
    panel.append(grid, note, ok);
  });
  if (!ctx.isAlive()) return { score: 0, ok: false };
  finished = true;

  const harmony = bouquetHarmony(flowers, wrapId ?? 'kraft', theme?.tones);
  const score = finalBouquetScore(mode, harmony);
  const stars = Math.max(kid ? 2 : 1, starsOf(score));
  ctx.sound('reward');
  const art = makeFan(ctx, mode);
  art.el.style.cssText = 'width:min(300px,86vw);height:300px;flex:none';
  ctx.root.replaceChildren();
  const probe = art.el;
  const st2 = h('style'); st2.textContent = STAGE_CSS; probe.append(st2);
  ctx.root.append(probe);
  art.update(flowers, wrapId ?? 'kraft', 300, 300, -2);
  probe.remove();
  const tipLine = kid ? T.end : harmony.score >= 85 ? T.end : bouquetTip(harmony);
  await endScreen(ctx, {
    title: kid ? 'Quel joli bouquet !' : 'Ton bouquet est prêt',
    art: probe, stars, line: tipLine,
    sub: kid ? undefined : `Harmonie : ${score} / 100`,
    btn: 'Offrir ♡',
  });
  return { score, ok: true, data: { flowers: [...flowers], wrap: wrapId ?? 'kraft', harmony: harmony.score }, tags: [mode] };
};
export default activity;
