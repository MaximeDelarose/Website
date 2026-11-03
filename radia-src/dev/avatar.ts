/** Planche de l'avatar en couches : ?m=board | one | hair | perf | combos  (&w=largeur d'une vignette) */
import { drawAvatar, avatarCanvas } from '../src/game/art/world/avatar';
import { CLOTH_IDS, HAIR_IDS, DEFAULT_LOOK, type Look, type ClothId } from '../src/data/world/ids';
import { CLOTHES, HAIRS } from '../src/data/world/wardrobe';

const out = document.getElementById('out')!;
const q = new URLSearchParams(location.search);
const mode = q.get('m') ?? 'board';
const W = +(q.get('w') ?? 150);
const H = Math.round(W * 2.5);
const dpr = 2;

const base = (): Look => ({ ...DEFAULT_LOOK, acc: [] });
function withItem(id: ClothId): Look {
  const l = base();
  const slot = CLOTHES[id].slot;
  if (slot === 'dress') { l.dress = id; l.top = null; l.bottom = null; }
  else if (slot === 'acc') l.acc = [id];
  else (l as unknown as Record<string, unknown>)[slot] = id;
  return l;
}
function cell(look: Look, label: string, w = W, opts = {}): HTMLElement {
  const c = document.createElement('canvas');
  c.width = w * dpr; c.height = Math.round(w * 2.5) * dpr;
  c.style.width = w + 'px'; c.style.height = Math.round(w * 2.5) + 'px';
  drawAvatar(c.getContext('2d')!, look, c.width, c.height, opts);
  const d = document.createElement('div'); d.className = 'c'; d.append(c, document.createTextNode(label));
  return d;
}
const row = () => { const d = document.createElement('div'); d.className = 'row'; out.append(d); return d; };

if (mode === 'board') {
  const r = row();
  r.append(cell(base(), 'défaut'));
  for (const id of CLOTH_IDS) r.append(cell(withItem(id), id));
} else if (mode === 'hair') {
  const r = row();
  for (const hid of HAIR_IDS) r.append(cell({ ...base(), hair: hid }, HAIRS[hid].name));
  for (const hid of HAIR_IDS) r.append(cell({ ...base(), hair: hid, crown: 'cr-gold', dress: 'dr-romantic-pink', top: null, bottom: null }, hid + ' +couronne'));
} else if (mode === 'one') {
  const id = q.get('id') as ClothId;
  const l = id ? withItem(id) : base();
  const r = row();
  for (const e of ['smile', 'love', 'surprise'] as const) r.append(cell(l, e, 300, { expr: e, arms: e === 'smile' ? undefined : e === 'love' ? 'heart' : 'wave' }));
} else if (mode === 'combos') {
  const r = row();
  const royal: Look = { ...base(), dress: 'dr-royal-gown', top: null, bottom: null, shoes: 'sh-heels', bag: null, crown: 'cr-gold', acc: ['ac-pearls'] };
  r.append(cell(royal, 'royale+couronne', 220));
  r.append(cell({ ...royal, hair: 'hair-bun', crown: 'cr-tiara', acc: ['ac-hoops'] }, 'royale+chignon+diadème', 220));
  r.append(cell({ ...base(), hair: 'hair-ponytail', top: 'top-stripe-shirt', bottom: 'bot-jeans', jacket: 'jk-denim', shoes: 'sh-boots', bag: 'bg-mini-gold', acc: ['ac-sunglasses', 'ac-hoops'] }, 'casual', 220));
  r.append(cell({ ...base(), dress: 'dr-redcarpet', top: null, bottom: null, shoes: 'sh-heels', bag: 'bg-mini-gold', crown: 'cr-flowers', hair: 'hair-wavy' }, 'tapis rouge', 220));
  r.append(cell({ ...base(), top: 'top-blouse-silk', bottom: 'bot-skirt-pleated', jacket: 'jk-blazer-cream', shoes: 'sh-flats-red', acc: ['ac-scarf', 'ac-pearls', 'ac-hoops'], hair: 'hair-half' }, 'chic', 220));
  r.append(cell({ ...base(), top: null, bottom: null, shoes: null, bag: null, jacket: 'jk-leather-black' }, 'minimal', 220));
  r.append(cell({ ...base(), dress: 'dr-stage-sequin', top: null, bottom: null, shoes: 'sh-heels', crown: 'cr-tiara' }, 'scène', 220));
} else if (mode === 'perf') {
  const c = document.createElement('canvas'); c.width = 240; c.height = 600; const ctx = c.getContext('2d')!;
  const looks = [base(), { ...base(), dress: 'dr-royal-gown', top: null, bottom: null, crown: 'cr-tiara', acc: ['ac-pearls', 'ac-hoops'] } as Look, { ...base(), dress: 'dr-stage-sequin', top: null, bottom: null } as Look];
  const res: string[] = [];
  for (const l of looks) {
    for (let i = 0; i < 5; i++) { ctx.clearRect(0, 0, 240, 600); drawAvatar(ctx, l, 240, 600); }
    const t = performance.now(); const N = 60;
    for (let i = 0; i < N; i++) { ctx.clearRect(0, 0, 240, 600); drawAvatar(ctx, l, 240, 600, { step: Math.sin(i) * 0.3 }); ctx.getImageData(0, 0, 1, 1); }
    res.push(`${((performance.now() - t) / N).toFixed(2)} ms`);
  }
  out.textContent = 'PERF ' + res.join(' | ');
  console.log('PERF', res.join(' | '));
  void avatarCanvas;
}
(window as unknown as { done: boolean }).done = true;
