/** Cabine photo souvenir : aperçu animé du lieu, pose / cadre / filtre, compte à rebours, flash, polaroïd. */
import type { Activity, PhotoRec } from '../types';
import type { KidId } from '../../data/world/ids';
import { reducedFx } from '../../core/app';
import { PLACE_NAMES } from '../places';
import { drawPhoto, renderPhoto, exportPng, warmPhotos } from '../photo/render';
import { POSES, FRAMES, FILTERS, frameAt } from '../photo/data';
import { ensurePhotoStyles } from '../photo/styles';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const FILTER_SW: Record<string, string> = { none: '#ffffff', doux: '#ffe9f2', chaud: '#ffb866', rose: '#ff8fb5', vintage: '#d9b88a', nuit: '#5a60b0' };

const activity: Activity = async (ctx) => {
  ensurePhotoStyles();
  void warmPhotos();
  const p = ctx.params as { place?: PhotoRec['place']; title?: string; withAuguste?: boolean; withKids?: KidId[] | boolean; pose?: number; frame?: string; filter?: string };
  const place = p.place ?? 'home';
  const title = p.title ?? 'Notre souvenir';
  const kids: KidId[] = Array.isArray(p.withKids) ? p.withKids.slice(0, 3) : [];
  const cur = {
    pose: Math.max(0, Math.min(POSES.length - 1, Math.round(p.pose ?? 0))),
    frame: FRAMES.some((f) => f.id === p.frame) ? (p.frame as string) : 'rose',
    filter: FILTERS.some((f) => f.id === p.filter) ? (p.filter as string) : 'doux',
  };
  const rec = (): PhotoRec => ({ id: 'preview', eventId: ctx.eventId, place, title, ts: Date.now(), look: ctx.look, auguste: !!p.withAuguste, kids, pose: cur.pose, frame: cur.frame, filter: cur.filter });

  ctx.header('Photo souvenir', PLACE_NAMES[place]);
  const wrap = el('div', 'pb-wrap');
  const stage = el('div', 'pb-stage');
  const cv = el('canvas', 'pb-prev');
  stage.append(cv);
  const rows = el('div', 'pb-rows');
  const acts = el('div', 'pb-acts');
  wrap.append(stage, rows, acts);
  ctx.root.append(wrap);

  // ---- sélecteurs
  const chipSets: HTMLButtonElement[] = [];
  const mkRow = (label: string, items: { id: string; label: string; sw?: string }[], get: () => string, set: (id: string) => void): void => {
    const row = el('div', 'pb-row');
    row.append(el('div', 'pb-lab', label));
    const chips = el('div', 'pb-chips');
    const btns = items.map((it) => {
      const b = el('button', 'pb-chip');
      b.type = 'button';
      if (it.sw) { const i = el('i'); i.style.background = it.sw; b.append(i); }
      b.append(document.createTextNode(it.label));
      b.addEventListener('click', () => { set(it.id); ctx.sound('pop1'); refresh(); ctx.pop(b); });
      chips.append(b); chipSets.push(b);
      return b;
    });
    const refresh = (): void => btns.forEach((b, i) => { const on = items[i].id === get(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    refresh();
    row.append(chips);
    rows.append(row);
  };
  mkRow('Pose', POSES.map((x) => ({ id: x.id, label: x.label })), () => POSES[cur.pose].id, (id) => { cur.pose = Math.max(0, POSES.findIndex((x) => x.id === id)); });
  mkRow('Cadre', FRAMES.map((f) => ({ id: f.id, label: f.label, sw: f.accent })), () => cur.frame, (id) => { cur.frame = id; });
  mkRow('Filtre', FILTERS.map((f) => ({ id: f.id, label: f.label, sw: FILTER_SW[f.id] })), () => cur.filter, (id) => { cur.filter = id; });

  const goBtn = ctx.button('📸 Photo !', () => void shoot(), 'gold pb-go');
  acts.append(goBtn);

  // ---- aperçu animé
  let cw = 0, raf = 0, last = 0, live = true;
  const t0 = performance.now();
  const fit = (): boolean => {
    const bw = stage.clientWidth, bh = stage.clientHeight;
    if (bw < 20 || bh < 20) return false;
    const w = Math.floor(Math.min(bw - 4, (bh - 4) * 0.8)), h = Math.floor(w * 1.25);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w !== cw) {
      cw = w; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`; cv.style.height = `${h}px`;
    }
    return true;
  };
  const paint = (now: number): void => {
    if (!fit()) return;
    const g = cv.getContext('2d')!;
    drawPhoto(g, rec(), cv.width, cv.height, reducedFx() ? 0 : (now - t0) / 1000);
  };
  const loop = (now: number): void => {
    if (!live || !ctx.isAlive()) return;
    raf = requestAnimationFrame(loop);
    if (now - last < 48) return; // ~20 images/s
    last = now; paint(now);
  };
  raf = requestAnimationFrame(loop);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => paint(performance.now())) : null;
  ro?.observe(stage);
  ctx.onDispose(() => { live = false; cancelAnimationFrame(raf); ro?.disconnect(); });

  // ---- prise de vue
  let finish!: (r: { score: number; ok: boolean; data?: Record<string, unknown> }) => void;
  const done = new Promise<{ score: number; ok: boolean; data?: Record<string, unknown> }>((res) => { finish = res; });
  ctx.onDispose(() => finish({ score: 0, ok: false }));
  let busy = false;

  async function shoot(): Promise<void> {
    if (busy) return;
    busy = true;
    chipSets.forEach((b) => { b.disabled = true; });
    goBtn.disabled = true;
    ctx.sound('button');
    for (const n of ['3', '2', '1']) {
      const c = el('div', 'pb-count in', n);
      stage.append(c);
      ctx.sound(n === '1' ? 'pop3' : 'pop1');
      await ctx.wait(reducedFx() ? 450 : 650);
      c.remove();
      if (!ctx.isAlive()) return;
    }
    // FLASH
    const flash = el('div', 'pb-flash go');
    stage.append(flash);
    ctx.sound('sparkle');
    ctx.later(() => flash.remove(), 700);
    await ctx.wait(160);
    if (!ctx.isAlive()) return;
    paint(performance.now());
    const saved = ctx.addPhoto({ place, title, auguste: !!p.withAuguste, kids, pose: cur.pose, frame: cur.frame, filter: cur.filter });
    live = false; cancelAnimationFrame(raf);
    // polaroïd qui sort et se pose
    const w = Math.round(cw * 0.86), h = Math.round(w * 1.25);
    const card = renderPhoto(saved, Math.round(w * Math.min(2, window.devicePixelRatio || 1)), undefined, 0);
    card.className = 'pb-card';
    card.style.width = `${w}px`; card.style.height = `${h}px`;
    card.style.left = `${Math.round((stage.clientWidth - w) / 2)}px`;
    card.style.top = `${Math.round((stage.clientHeight - h) / 2)}px`;
    stage.append(card);
    ctx.sound('pickup');
    const fy = -(stage.clientHeight / 2 + h / 2 + 20);
    if (!reducedFx() && card.animate) {
      card.animate([
        { transform: `translateY(${fy}px) rotate(10deg) scale(0.8)`, opacity: 0 },
        { transform: `translateY(${fy * 0.25}px) rotate(-8deg) scale(1.03)`, opacity: 1, offset: 0.55 },
        { transform: 'translateY(6px) rotate(-1deg) scale(1)', offset: 0.8 },
        { transform: 'translateY(0) rotate(-3deg) scale(1)' },
      ], { duration: 1100, easing: 'cubic-bezier(0.3,0.7,0.3,1)', fill: 'forwards' });
    } else card.style.transform = 'rotate(-3deg)';
    cv.style.transition = 'opacity 0.5s, transform 0.5s'; cv.style.opacity = '0.12'; cv.style.transform = 'scale(0.96)';
    await ctx.wait(reducedFx() ? 200 : 1000);
    if (!ctx.isAlive()) return;
    ctx.confetti(26); ctx.sound('reward');
    rows.remove(); acts.replaceChildren();
    const png = ctx.button('Enregistrer en PNG', () => { png.disabled = true; void exportPng(saved).finally(() => { png.disabled = false; }); }, 'secondary');
    const next = ctx.button('Continuer', () => finish({ score: 100, ok: true, data: { photoId: saved.id } }), 'gold');
    acts.append(png, next);
    ctx.pop(next);
    void frameAt;
  }

  return done;
};
export default activity;
