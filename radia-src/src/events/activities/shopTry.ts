/** Shopping de luxe : trois boutiques, essayage sur l'avatar de Radia, Auguste réagit et offre UN article. */
import { h } from '../../ui/dom';
import { avatarCanvas } from '../../game/art/world/avatar';
import { previewLook } from '../../game/world/wardrobe';
import { makeCanvas, paint, canvasUrl, texScale } from '../../game/art/kit';
import { CLOTH_SLOTS, type ClothId, type Look } from '../../data/world/ids';
import type { Activity } from '../types';
import { BOUTIQUES, assignBoutiques, boutiqueCount, clothName, giftValue, reactionFor, sanitizeOptions } from '../games/creative/shopLogic';
import { drawBoutique } from '../games/creative/creativeArt';
import { endScreen, useStyles } from '../games/creative/creativeUi';

const CSS = `
.sh-tabs{display:flex;gap:6px;flex-shrink:0}
.sh-tab{flex:1;min-height:44px;border:0;border-radius:14px;background:rgba(255,255,255,.7);box-shadow:0 0 0 2px rgba(88,67,63,.14);font:inherit;font-size:11.5px;font-weight:700;color:var(--choco);line-height:1.1;padding:3px 4px;display:flex;align-items:center;justify-content:center;text-align:center}
.sh-tab.on{background:#fff;box-shadow:0 0 0 3px var(--rose-vif)}
.sh-tab.seen::after{content:' ✓';color:var(--rose-deep)}
.sh-stage{position:relative;flex:1 1 230px;min-height:200px;max-height:430px;border-radius:24px;overflow:hidden;box-shadow:0 0 0 3px rgba(255,255,255,.8) inset,0 4px 14px rgba(59,49,82,.14)}
.sh-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.sh-av{position:absolute;bottom:2%;transform:translateX(-50%);pointer-events:none}
.sh-av canvas{display:block}
.sh-cap{position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:12px;font-weight:700;color:var(--nuit);background:rgba(255,255,255,.7);border-radius:0 0 22px 22px;padding:3px 6px;pointer-events:none}
.sh-chip{position:absolute;top:44px;left:8px;z-index:4;min-height:40px;border:0;border-radius:20px;background:#fff;box-shadow:0 0 0 2.5px var(--lavande);font:inherit;font-size:13px;font-weight:700;padding:0 14px;color:var(--nuit)}
.cr-bubble.r::after{left:auto;right:34px}
.sh-info{margin:0;text-align:center;font-size:13px;color:var(--choco);min-height:34px;line-height:1.25;flex-shrink:0}
.sh-info b{color:var(--rose-deep)}
.sh-it{min-height:78px;padding:4px 3px;font-size:11px;line-height:1.1}
.sh-it canvas{border-radius:10px}
`;

type Mode = 'single' | 'duo';

const avCache = new Map<string, HTMLCanvasElement>();
const lookKey = (l: Look): string => JSON.stringify(l);
function avatarFor(look: Look, w: number, hh: number): HTMLCanvasElement {
  const k = `${lookKey(look)}|${w}x${hh}`;
  let c = avCache.get(k);
  if (!c) { c = avatarCanvas(look, w * 2, hh * 2, { arms: 'down' }); avCache.set(k, c); }
  const copy = makeCanvas(c.width, c.height); copy.getContext('2d')!.drawImage(c, 0, 0);
  copy.style.width = `${w}px`; copy.style.height = `${hh}px`;
  return copy;
}

/** Vignette d'un article : zone utile de l'avatar qui le porte. */
function thumb(look: Look, id: ClothId, size: number): HTMLCanvasElement {
  const slot = CLOTH_SLOTS[id];
  const big = avatarFor(previewLook(look, id), 160, 400);
  // zones en fraction de l'avatar (240×600 → carré visible)
  const R: Record<string, [number, number, number, number]> = {
    crown: [0.1, 0.0, 0.8, 0.32], acc: [0.1, 0.0, 0.8, 0.34], top: [0.04, 0.2, 0.92, 0.38], jacket: [0.04, 0.2, 0.92, 0.38], bag: [0.0, 0.34, 1, 0.4],
    dress: [0.0, 0.2, 1, 0.64], bottom: [0.0, 0.5, 1, 0.5], shoes: [0.0, 0.8, 1, 0.2],
  };
  const [fx, fy, fw, fh] = R[slot] ?? R.dress;
  const sx = fx * big.width, sy = fy * big.height, sw = fw * big.width, sh = fh * big.height;
  const out = makeCanvas(size * 2, size * 2);
  const g = out.getContext('2d')!;
  const sc = Math.min((size * 2) / sw, (size * 2) / sh);
  g.drawImage(big, sx, sy, sw, sh, (size * 2 - sw * sc) / 2, (size * 2 - sh * sc) / 2, sw * sc, sh * sc);
  out.style.cssText = `width:${size}px;height:${size}px;background:rgba(255,255,255,.6)`;
  return out;
}

const activity: Activity = async (ctx) => {
  useStyles(ctx);
  const st = h('style'); st.textContent = CSS; ctx.root.append(st);
  const options = sanitizeOptions(ctx.params.options, ctx.rng);
  const nShops = boutiqueCount(ctx.params.boutiques, options.length);
  const shops = assignBoutiques(options, nShops);
  ctx.header('Shopping de luxe', 'Un cadeau d\'Auguste : un seul article');

  const wrap = h('div.cr-wrap');
  const tabs = h('div.sh-tabs');
  const stage = h('div.sh-stage');
  const info = h('p.sh-info');
  const panel = h('div.cr-panel', { style: 'gap:6px' });
  wrap.append(...(nShops > 1 ? [tabs] : []), stage, info, panel);
  ctx.root.append(wrap);

  let shop = 0;
  let tried: ClothId | null = null;
  let previous: ClothId | null = null;
  let mode: Mode = 'single';
  const seen = new Set<number>([0]);
  const base = ctx.look;
  const W = () => stage.clientWidth || 340, H = () => stage.clientHeight || 300;

  await ctx.say('auguste', ['Tout ce que tu veux ici est pour toi, ma reine.', 'Essaie ce que tu aimes, c\'est mon cadeau.'][Math.floor(ctx.rng() * 2)], 'love');
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const bg = h('img.sh-bg', { alt: '', draggable: false }) as HTMLImageElement;
  const avLayer = h('div', { style: 'position:absolute;inset:0' });
  const chip = h('button.sh-chip', 'Comparer ⇄') as HTMLButtonElement;
  stage.append(bg, avLayer, chip);

  const paintStage = (popIt = false) => {
    const w = W(), hh = H();
    bg.src = canvasUrl(`cr:shop:${shop}:${Math.round(w)}x${Math.round(hh)}:${texScale()}`, () => paint(w, hh, texScale(), (c) => drawBoutique(c, w, hh, BOUTIQUES[shop % 3], shop)));
    avLayer.replaceChildren();
    const mk = (look: Look, cx: number, ah: number, cap?: string): HTMLElement => {
      const aw = Math.round(ah * 0.42);
      const box = h('div.sh-av', {}, avatarFor(look, aw, Math.round(ah)));
      box.style.left = `${cx}px`;
      if (cap) box.append(h('div', { style: 'text-align:center;font-size:11px;font-weight:700;color:var(--nuit);margin-top:2px' }, cap));
      avLayer.append(box);
      return box;
    };
    const look = tried ? previewLook(base, tried) : base;
    if (mode === 'duo' && tried) {
      const left = previous ? previewLook(base, previous) : base;
      mk(left, w * 0.28, hh * 0.84, previous ? clothName(previous) : 'Ma tenue');
      const r = mk(look, w * 0.72, hh * 0.84, clothName(tried));
      if (popIt) ctx.pop(r);
    } else {
      const r = mk(look, w * 0.4, hh * 0.9);
      if (popIt) ctx.pop(r);
      const ah = hh * 0.55;
      const au = h('div.sh-av', {}, ctx.avatar('auguste', Math.round(ah * 0.8), Math.round(ah * 2), { expr: 'smile', arms: tried ? 'heart' : 'down' }));
      (au.firstElementChild as HTMLElement).style.cssText = `width:${Math.round(ah * 0.4)}px;height:${Math.round(ah)}px`;
      au.style.left = `${w * 0.83}px`;
      avLayer.append(au);
    }
    chip.style.display = tried ? '' : 'none';
    chip.textContent = mode === 'duo' ? 'Un seul ⇄' : 'Comparer ⇄';
  };

  const say = (txt: string) => {
    stage.querySelectorAll('.cr-bubble').forEach((b) => b.remove());
    if (mode === 'duo') return;
    const b = h('div.cr-bubble.r', {}, txt);
    b.style.top = `${Math.round(H() * 0.3)}px`; b.style.right = '8px'; b.style.left = 'auto'; b.style.maxWidth = '46%';
    stage.append(b);
    ctx.later(() => { b.style.transition = 'opacity .3s'; b.style.opacity = '0'; ctx.later(() => b.remove(), 350); }, 3800);
  };

  const updateInfo = () => {
    if (!tried) { info.innerHTML = 'Touche un article pour l\'essayer.'; return; }
    const v = giftValue(tried);
    info.replaceChildren(h('b', clothName(tried)), document.createTextNode(v > 0 ? ` · ${v} pièces, offert par Auguste ♡` : ' · offert par Auguste ♡'));
  };

  const pickBtn = ctx.button('Je choisis celui-ci ♡', () => {
    if (!tried) { ctx.sound('invalid'); return; }
    finish(tried);
  }, 'gold');
  let finish: (id: ClothId) => void = () => {};
  const picked = new Promise<ClothId>((r) => { finish = r; });

  const renderItems = () => {
    const items = shops[shop] ?? [];
    const grid = h('div.cr-grid', { style: `--cols:${Math.min(3, Math.max(1, items.length))}` });
    for (const id of items) {
      const b = h('button.cr-tile.sh-it', {}, thumb(base, id, 54), h('span', clothName(id))) as HTMLButtonElement;
      if (id === tried) b.classList.add('on');
      b.addEventListener('click', () => {
        if (tried !== id) { previous = tried; tried = id; }
        ctx.sound('sparkle'); ctx.pop(b);
        paintStage(true); updateInfo();
        say(reactionFor(id, ctx.rng));
        grid.querySelectorAll('.cr-tile').forEach((t) => t.classList.toggle('on', t === b));
        pickBtn.style.opacity = '1';
      });
      grid.append(b);
    }
    panel.replaceChildren(h('p.cr-q', { style: 'font-size:15px' }, `${BOUTIQUES[shop % 3].name} · ${BOUTIQUES[shop % 3].tagline}`), grid, pickBtn);
  };

  const renderTabs = () => {
    tabs.replaceChildren(...shops.map((_, i) => {
      const t = h(`button.sh-tab${i === shop ? '.on' : ''}${seen.has(i) && i !== shop ? '.seen' : ''}`, BOUTIQUES[i % 3].name) as HTMLButtonElement;
      t.addEventListener('click', () => {
        if (i === shop) return;
        shop = i; seen.add(i); ctx.sound('page'); mode = 'single';
        renderTabs(); paintStage(); renderItems();
        say(['Oh, celle-ci est magnifique.', 'Regarde ces merveilles, ma reine.', 'Tu as l\'œil, galbi.'][Math.floor(ctx.rng() * 3)]);
      });
      return t;
    }));
  };
  chip.addEventListener('click', () => { mode = mode === 'duo' ? 'single' : 'duo'; ctx.sound('whoosh'); paintStage(); });

  pickBtn.style.opacity = '0.55';
  renderTabs(); paintStage(); renderItems(); updateInfo();
  if (typeof ResizeObserver !== 'undefined') {
    let lw = 0, lh = 0;
    const ro = new ResizeObserver(() => { if (Math.abs(W() - lw) > 2 || Math.abs(H() - lh) > 2) { lw = W(); lh = H(); paintStage(); } });
    ro.observe(stage);
    ctx.onDispose(() => ro.disconnect());
  }

  const pick = await picked;
  if (!ctx.isAlive()) return { score: 0, ok: false };
  ctx.sound('reward');
  await ctx.say('auguste', ['Il est à toi, ma reine. Tu le portes mieux que n\'importe qui.', 'Parfait choix, galbi. Je règle tout, ne t\'inquiète de rien.'][Math.floor(ctx.rng() * 2)], 'love');
  if (!ctx.isAlive()) return { score: 0, ok: false };
  const look = previewLook(base, pick);
  const art = avatarFor(look, 130, 310);
  const v = giftValue(pick);
  await endScreen(ctx, {
    title: clothName(pick), art, stars: 3,
    line: 'Un cadeau d\'Auguste, rien que pour toi.',
    sub: v > 0 ? `Valeur ${v} pièces · offert par Auguste ♡` : 'Offert par Auguste ♡',
    btn: 'Merci mon cœur ♡',
  });
  return { score: 100, ok: true, data: { pick }, tags: ['shop'] };
};
export default activity;
