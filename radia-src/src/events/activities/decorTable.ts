/** Décor de table / de pièce : jardin, rooftop, soirée pyjama, hôtel, palace. */
import { h } from '../../ui/dom';
import type { Activity } from '../types';
import {
  DECOR_CAT, DECOR_IDS, DECOR_KINDS, DECOR_MIN, DECOR_NAMES, DECOR_TEXT, SLOTS, THEME_OBJECTS, cleanPlaced, decorHarmony, fitsSlot, normDecorMode, starsOfDecor,
  type DecorId, type Placed, type Slot,
} from '../games/creative/decorLogic';
import { DECOR_BOX, decorUrl, sceneUrl } from '../games/creative/decorArt';
import { dots, endScreen, useStyles } from '../games/creative/creativeUi';

const CSS = `
.dt-scene{position:relative;flex:1 1 250px;min-height:220px;max-height:440px;border-radius:24px;overflow:hidden;box-shadow:0 0 0 3px rgba(255,255,255,.8) inset,0 4px 14px rgba(59,49,82,.14);touch-action:manipulation}
.dt-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block}
.dt-slot{position:absolute;transform:translate(-50%,-50%);border:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
.dt-slot.empty{width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 0 0 2.5px rgba(232,85,143,.7);color:var(--rose-deep);font-size:24px;font-weight:800;animation:crPulse 1.6s ease-in-out infinite}
.dt-slot.empty.sel{background:#fff;box-shadow:0 0 0 4px var(--or);animation:none}
.dt-slot.empty.wide{width:140px;height:34px;border-radius:17px;font-size:13px}
.dt-slot.empty.sky{width:64px;height:34px;border-radius:17px}
.dt-slot img{display:block;pointer-events:none}
.dt-slot.sel img{filter:drop-shadow(0 0 6px #f3c86b)}
.dt-gl{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.dt-obj{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 2px;min-height:62px}
.dt-obj small{font-size:11px;line-height:1.05;text-align:center}
`;

const activity: Activity = async (ctx) => {
  const mode = normDecorMode(ctx.params.mode);
  const T = DECOR_TEXT[mode];
  useStyles(ctx);
  const st = h('style'); st.textContent = CSS; ctx.root.append(st);
  ctx.header(T.title, `Au moins ${DECOR_MIN} objets, à ton goût`);
  const wrap = h('div.cr-wrap');
  const prog = dots(1);
  const scene = h('div.dt-scene');
  const panel = h('div.cr-panel');
  wrap.append(prog.el, scene, panel);
  ctx.root.append(wrap);

  await ctx.say('auguste', T.intro, 'smile');
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const placed = new Map<string, DecorId>();
  let sel: string | null = null;
  const W = () => scene.clientWidth || 340, H = () => scene.clientHeight || 280;
  const bgImg = h('img.dt-bg', { alt: '', draggable: false }) as HTMLImageElement;
  scene.append(bgImg);
  const slotEls = new Map<string, HTMLButtonElement>();
  const layer = h('div', { style: 'position:absolute;inset:0' });
  scene.append(layer);

  const place = (s: Slot, el: HTMLElement): void => {
    el.style.left = `${s.x}%`; el.style.top = `${s.y}%`;
  };
  const scaleFor = (): number => Math.max(0.8, Math.min(1.25, W() / 340));
  const renderSlots = () => {
    const k = scaleFor();
    bgImg.src = sceneUrl(mode, Math.round(W()), Math.round(H()));
    layer.replaceChildren();
    slotEls.clear();
    // ordre de profondeur : suspendu, nappe, table, sol
    const order = [...SLOTS].sort((a, b) => (a.kind === 'cloth' ? 0 : a.kind === 'hang' ? 1 : 2) - (b.kind === 'cloth' ? 0 : b.kind === 'hang' ? 1 : 2));
    for (const s of order) {
      const obj = placed.get(s.id);
      const b = h('button.dt-slot', {}) as HTMLButtonElement;
      place(s, b);
      if (obj) {
        const [bw, bh2] = DECOR_BOX[obj];
        const sc = s.kind === 'cloth' ? W() / 340 : k;
        const wpx = Math.round(bw * sc), hpx = Math.round(bh2 * sc);
        b.append(h('img', { src: decorUrl(obj), width: wpx, height: hpx, alt: DECOR_NAMES[obj] }));
        if (s.kind === 'hang' && (obj === 'garland' || obj === 'lights')) b.style.transform = 'translate(-50%,-30%)';
        if (s.kind === 'hang' && obj === 'lantern') b.style.transform = 'translate(-50%,-10%)';
        b.style.zIndex = s.kind === 'cloth' ? '1' : s.kind === 'hang' ? '2' : s.kind === 'table' ? '4' : '5';
        if (s.kind === 'cloth') b.style.transform = 'translate(-50%,-50%)';
      } else {
        b.classList.add('empty');
        if (s.kind === 'cloth') b.classList.add('wide');
        if (s.kind === 'hang') b.classList.add('sky');
        b.textContent = '+';
        b.style.zIndex = '8';
      }
      if (sel === s.id) b.classList.add('sel');
      b.addEventListener('click', () => onSlot(s));
      layer.append(b);
      slotEls.set(s.id, b);
    }
  };

  const list = (): Placed[] => [...placed].map(([slot, obj]) => ({ slot, obj }));
  const noteEl = h('p.cr-note');
  const finishBtn = ctx.button('', () => {
    if (placed.size >= DECOR_MIN) finishUp(); else { ctx.sound('invalid'); }
  }, 'gold');
  let finishUp: () => void = () => {};
  const done = new Promise<void>((r) => { finishUp = r; });

  const updateStatus = () => {
    const n = placed.size;
    prog.set(0, `${n} objet${n > 1 ? 's' : ''}`);
    const left = DECOR_MIN - n;
    finishBtn.textContent = left > 0 ? `Encore ${left} ♡` : 'C\'est installé ♡';
    finishBtn.style.opacity = left > 0 ? '0.55' : '1';
    const hs = decorHarmony(mode, list());
    noteEl.textContent = n === 0 ? 'Touche un « + » pour placer un objet.' : n < DECOR_MIN ? 'Continue, ça prend forme !' : hs.theme < 0.6 ? 'Essaie les objets marqués ★ : ils vont avec l\'ambiance.' : hs.balance < 0.6 ? 'Un peu de lumière, de fleurs ou de gourmandises ?' : 'Quelle belle installation !';
  };

  const showTray = () => {
    panel.replaceChildren();
    const s = sel ? SLOTS.find((x) => x.id === sel) : null;
    if (!s) {
      panel.append(h('p.cr-q', 'Touche un emplacement « + » de la scène'), noteEl, finishBtn);
      // aperçu des objets conseillés
      const rec = h('div.cr-grid', { style: '--cols:4' });
      for (const id of THEME_OBJECTS[mode].slice(0, 4)) rec.append(h('div.cr-tile.rec', { style: 'min-height:54px;pointer-events:none' }, h('img', { src: decorUrl(id, 40, 40), width: 36, height: 36, alt: '' }), h('span', { style: 'font-size:10px' }, DECOR_NAMES[id])));
      panel.insertBefore(h('p', { style: 'margin:0;text-align:center;font-size:13px;color:var(--choco-soft);font-weight:700' }, 'Conseillés pour ' + T.place + ' :'), noteEl);
      panel.insertBefore(rec, noteEl);
      updateStatus();
      return;
    }
    panel.append(h('p.cr-q', s.kind === 'hang' ? 'Que suspendre ici ?' : s.kind === 'floor' ? 'Un coin douillet ?' : s.kind === 'cloth' ? 'Une nappe ?' : 'Que poser ici ?'));
    const ids = DECOR_IDS.filter((id) => fitsSlot(id, s)).sort((a, b) => Number(THEME_OBJECTS[mode].includes(b)) - Number(THEME_OBJECTS[mode].includes(a)));
    const grid = h('div.cr-grid', { style: `--cols:${ids.length <= 3 ? ids.length : 4}` });
    for (const id of ids) {
      const [bw, bh2] = DECOR_BOX[id];
      const sc = (Math.max(bw, bh2) > 150 ? 100 : Math.max(bw, bh2) > 100 ? 56 : 40) / Math.max(bw, bh2);
      const b = h('button.cr-tile.dt-obj', { class: THEME_OBJECTS[mode].includes(id) ? 'rec' : '' },
        h('img', { src: id === 'tablecloth' ? decorUrl(id, 100, 29) : decorUrl(id), width: Math.round(bw * sc), height: Math.round(bh2 * sc), alt: '' }), h('small', DECOR_NAMES[id])) as HTMLButtonElement;
      b.addEventListener('click', () => {
        placed.set(s.id, id); sel = null;
        ctx.sound(DECOR_CAT[id] === 'light' ? 'sparkle' : DECOR_CAT[id] === 'food' ? 'pop3' : 'drop');
        renderSlots(); showTray();
        const el = slotEls.get(s.id); if (el) ctx.pop(el.firstElementChild as HTMLElement ?? el);
        if (placed.size === DECOR_MIN) { ctx.sound('combo'); ctx.confetti(12); }
      });
      grid.append(b);
    }
    panel.append(grid);
    const row = h('div.cr-row', {});
    if (placed.has(s.id)) row.append(ctx.button('Retirer', () => { placed.delete(s.id); sel = null; ctx.sound('whoosh'); renderSlots(); showTray(); }, 'secondary'));
    row.append(ctx.button('Annuler', () => { sel = null; renderSlots(); showTray(); }, 'secondary'));
    panel.append(row);
  };

  const onSlot = (s: Slot) => {
    sel = sel === s.id ? null : s.id;
    ctx.sound('pickup');
    renderSlots(); showTray();
    void DECOR_KINDS;
  };

  renderSlots(); showTray();
  if (typeof ResizeObserver !== 'undefined') {
    let lw = 0, lh = 0;
    const ro = new ResizeObserver(() => { if (Math.abs(W() - lw) > 2 || Math.abs(H() - lh) > 2) { lw = W(); lh = H(); renderSlots(); } });
    ro.observe(scene);
    ctx.onDispose(() => ro.disconnect());
  }
  await done;
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const clean = cleanPlaced(list());
  const hs = decorHarmony(mode, clean);
  // aperçu final : la scène sans les « + »
  sel = null;
  const art = h('div.dt-scene', { style: 'width:min(330px,88vw);height:280px;flex:none' });
  const artBg = h('img.dt-bg', { alt: '', src: sceneUrl(mode, 330, 280) });
  art.append(artBg);
  const ak = 330 / 340;
  for (const s of SLOTS) {
    const obj = placed.get(s.id); if (!obj) continue;
    const [bw, bh2] = DECOR_BOX[obj];
    const sc = s.kind === 'cloth' ? 330 / 340 : ak;
    const b = h('div.dt-slot', {}, h('img', { src: decorUrl(obj), width: Math.round(bw * sc), height: Math.round(bh2 * sc), alt: '' }));
    place(s, b);
    if (s.kind === 'hang' && (obj === 'garland' || obj === 'lights')) b.style.transform = 'translate(-50%,-30%)';
    if (s.kind === 'hang' && obj === 'lantern') b.style.transform = 'translate(-50%,-10%)';
    b.style.zIndex = s.kind === 'cloth' ? '1' : s.kind === 'hang' ? '2' : s.kind === 'table' ? '4' : '5';
    art.append(b);
  }
  const stars = starsOfDecor(hs.score);
  const line = hs.score >= 80 ? 'C\'est magnifique, ma reine. On s\'y croirait déjà.' : hs.score >= 55 ? 'Très joli ! On va s\'y sentir bien.' : 'Fait avec cœur, c\'est ce qui compte.';
  const stEl = h('style'); stEl.textContent = CSS;
  art.append(stEl);
  await endScreen(ctx, { title: 'Tout est prêt !', art, stars, line, sub: `Harmonie : ${hs.score} / 100`, btn: 'Continuer ♡' });
  return { score: hs.score, ok: true, data: { placed: clean.map((p) => ({ ...p })) }, tags: [mode] };
};
export default activity;
