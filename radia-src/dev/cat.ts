import { drawCat, drawCatItem, CAT_ITEM_IDS, type CatPose } from '../src/game/art/world/cat';
const out = document.getElementById('out')!;
const poses: CatPose[] = ['sit', 'sleep', 'walk', 'play', 'purr', 'eat', 'stretch'];
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; c.style.width = w + 'px'; c.style.height = h + 'px'; const x = c.getContext('2d')!; x.scale(2, 2); return { c, x }; };
const row = () => { const d = document.createElement('div'); d.className = 'row'; out.append(d); return d; };
const tt = Number(new URLSearchParams(location.search).get('t') ?? 0.7);
let r = row();
for (const p of poses) { const { c, x } = mk(180, 170); drawCat(x, p, 180, 170, tt); r.append(c); }
r = row();
for (const p of poses) { const { c, x } = mk(180, 170); drawCat(x, p, 180, 170, tt, { collar: 'collar-bell', bed: p === 'sleep' || p === 'sit' ? 'basket' : 'cushion', toy: true }); r.append(c); }
r = row();
for (const id of CAT_ITEM_IDS) { const { c, x } = mk(100, 100); drawCatItem(x, id, 100); r.append(c); }
(window as unknown as { done: boolean }).done = true;
