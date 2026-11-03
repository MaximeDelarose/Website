/**
 * Séance photo avec le photographe : pose (5) × décor (5) × cadre (4), compte à rebours facultatif,
 * flash, polaroïd qui apparaît, « Garder ce souvenir » (album) et « Enregistrer en PNG ».
 */
import type { Activity, PhotoRec, PlaceId } from '../types';
import { reducedFx } from '../../core/app';
import { drawPhoto, renderPhoto, exportPng, warmPhotos } from '../photo/render';
import { POSES, SHOOT_POSES, SHOOT_DECORS, SHOOT_FRAMES } from '../photo/data';
import { ensurePhotoStyles } from '../photo/styles';
import { photographerCanvas, PHOTO_INTRO, PHOTO_LINES, pick } from '../photo/photographer';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

let styled = false;
function ensureStyles(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.dataset.src = 'events-shoot';
  s.textContent = `
.ps-strip { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 62px; }
.ps-man { flex: 0 0 auto; width: 56px; height: 62px; border-radius: 50%; background: radial-gradient(circle at 50% 35%, #fff, #f3dcec); box-shadow: 0 0 0 2px rgba(185,165,232,0.7); overflow: hidden; display: flex; align-items: flex-end; justify-content: center; }
.ps-man canvas { display: block; width: 56px; height: 62px; }
.ps-bubble { position: relative; flex: 1; min-width: 0; padding: 8px 12px; border-radius: 16px; background: #fffdf9; color: var(--choco, #58433f); font-size: 14px; line-height: 1.25; box-shadow: 0 0 0 2px rgba(245,160,187,0.7), 0 3px 8px rgba(59,49,82,0.18); }
.ps-bubble::before { content: ''; position: absolute; left: -7px; top: 22px; width: 12px; height: 12px; background: #fffdf9; transform: rotate(45deg); box-shadow: -2px 2px 0 0 rgba(245,160,187,0.7); }
.ps-bubble.in { animation: evPop 0.3s var(--ease-pop); }
.ps-skip { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); z-index: 8; }
.ps-keep { margin-top: 2px; }
.ps-row2 { display: flex; gap: 8px; }
.ps-row2 .btn { flex: 1; min-width: 0; padding-left: 8px; padding-right: 8px; font-size: 15px; }
.ps-hide { display: none !important; }
`;
  document.head.append(s);
}

const activity: Activity = async (ctx) => {
  ensurePhotoStyles(); ensureStyles();
  void warmPhotos();
  const p = ctx.params as { title?: string; defaultDecor?: string };
  const title = p.title ?? 'Notre soirée';
  const decorOf = (id: string) => SHOOT_DECORS.find((d) => d.id === id || d.place === id) ?? SHOOT_DECORS[0];
  const cur = { pose: SHOOT_POSES[0].id, decor: decorOf(p.defaultDecor ?? '').id, frame: SHOOT_FRAMES[0].id };
  const poseIndex = (): number => Math.max(0, POSES.findIndex((x) => x.id === cur.pose));
  const rec = (): PhotoRec => {
    const d = decorOf(cur.decor);
    return { id: 'preview', eventId: ctx.eventId, place: d.place as PlaceId, title, ts: Date.now(), look: ctx.look, auguste: true, kids: [], pose: poseIndex(), frame: cur.frame, filter: d.filter };
  };

  ctx.header('Séance photo', 'Avec le photographe');
  const wrap = el('div', 'pb-wrap');
  const strip = el('div', 'ps-strip');
  const man = el('div', 'ps-man');
  const bubble = el('div', 'ps-bubble');
  strip.append(man, bubble);
  const stage = el('div', 'pb-stage');
  const cv = el('canvas', 'pb-prev');
  stage.append(cv);
  const rows = el('div', 'pb-rows');
  const acts = el('div', 'pb-acts');
  wrap.append(strip, stage, rows, acts);
  ctx.root.append(wrap);

  // ---- photographe
  const dprMan = Math.min(2, window.devicePixelRatio || 1);
  const drawMan = (mood: 'idle' | 'aim' | 'happy', flash = 0): void => {
    man.replaceChildren(photographerCanvas(Math.round(56 * dprMan), Math.round(62 * dprMan), mood, { bust: true, flash }));
    const c = man.firstElementChild as HTMLCanvasElement | null;
    if (c) { c.style.width = '56px'; c.style.height = '62px'; }
  };
  const speak = (text: string, mood: 'idle' | 'aim' | 'happy' = 'idle'): void => {
    bubble.textContent = text;
    bubble.classList.remove('in'); void bubble.offsetWidth; bubble.classList.add('in');
    drawMan(mood);
  };
  speak('…', 'idle');

  // ---- sélecteurs
  const chips: HTMLButtonElement[] = [];
  const mkRow = (label: string, items: { id: string; label: string }[], get: () => string, set: (id: string) => void, say: (id: string) => string): void => {
    const row = el('div', 'pb-row');
    row.append(el('div', 'pb-lab', label));
    const box = el('div', 'pb-chips');
    const btns = items.map((it) => {
      const b = el('button', 'pb-chip', it.label);
      b.type = 'button';
      b.dataset.id = it.id;
      b.addEventListener('click', () => {
        set(it.id); ctx.sound('pop1'); refresh(); ctx.pop(b);
        speak(say(it.id));
        if (cur.pose === 'elegante' && decorOf(cur.decor).place !== 'palace' && label === 'Pose') speak('Pose élégante ! Elle est encore plus belle devant le Grand escalier.');
      });
      box.append(b); chips.push(b);
      return b;
    });
    const refresh = (): void => btns.forEach((b, i) => { const on = items[i].id === get(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    refresh();
    row.append(box);
    rows.append(row);
  };
  mkRow('Pose', SHOOT_POSES, () => cur.pose, (id) => { cur.pose = id; }, (id) => PHOTO_LINES.pose[id] ?? '');
  mkRow('Décor', SHOOT_DECORS, () => cur.decor, (id) => { cur.decor = id; }, (id) => PHOTO_LINES.decor[id] ?? '');
  mkRow('Cadre', SHOOT_FRAMES, () => cur.frame, (id) => { cur.frame = id; }, (id) => PHOTO_LINES.frame[id] ?? '');

  const goBtn = ctx.button('📸 Prendre la photo', () => void shoot(), 'gold pb-go');
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
    drawPhoto(cv.getContext('2d')!, rec(), cv.width, cv.height, reducedFx() ? 0 : (now - t0) / 1000);
  };
  const loop = (now: number): void => {
    if (!live || !ctx.isAlive()) return;
    raf = requestAnimationFrame(loop);
    if (now - last < 50) return; // ~20 images/s
    last = now; paint(now);
  };
  const startLoop = (): void => { live = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); };
  startLoop();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => paint(performance.now())) : null;
  ro?.observe(stage);
  ctx.onDispose(() => { live = false; cancelAnimationFrame(raf); ro?.disconnect(); });

  // ---- issue
  type Res = { score: number; ok: boolean; data?: Record<string, unknown> };
  let finish!: (r: Res) => void;
  const done = new Promise<Res>((res) => { finish = res; });
  ctx.onDispose(() => finish({ score: 0, ok: false }));
  let busy = false;

  // introduction
  await ctx.say('narrator', 'Le photographe de la soirée vous attend, appareil en main.');
  if (!ctx.isAlive()) return done;
  speak(PHOTO_INTRO, 'happy');

  async function shoot(): Promise<void> {
    if (busy) return;
    busy = true;
    chips.forEach((b) => { b.disabled = true; });
    goBtn.disabled = true;
    ctx.sound('button');
    speak(pick(PHOTO_LINES.ready, ctx.rng), 'aim');
    // compte à rebours facultatif
    let skip = false;
    const skipBtn = ctx.button('Passer le compte à rebours', () => { skip = true; }, 'secondary small ps-skip');
    stage.append(skipBtn);
    for (const n of ['3', '2', '1']) {
      if (skip) break;
      const c = el('div', 'pb-count in', n);
      stage.append(c);
      ctx.sound(n === '1' ? 'pop3' : 'pop1');
      const until = performance.now() + (reducedFx() ? 450 : 700);
      while (!skip && performance.now() < until && ctx.isAlive()) await ctx.wait(40);
      c.remove();
      if (!ctx.isAlive()) return;
      if (n === '3') speak(pick(PHOTO_LINES.count, ctx.rng), 'aim');
    }
    skipBtn.remove();
    // FLASH + bruit d'appareil
    const flash = el('div', 'pb-flash go');
    stage.append(flash);
    ctx.sound('pickup'); ctx.later(() => ctx.sound('sparkle'), 90);
    ctx.later(() => flash.remove(), 700);
    drawMan('aim', 1);
    await ctx.wait(160);
    if (!ctx.isAlive()) return;
    paint(performance.now());
    const d = decorOf(cur.decor);
    const draft: PhotoRec = { ...rec(), id: 'draft', ts: Date.now() };
    live = false; cancelAnimationFrame(raf);
    // polaroïd qui sort et se pose
    const w = Math.round(cw * 0.86), h = Math.round(w * 1.25);
    const card = renderPhoto(draft, Math.round(w * Math.min(2, window.devicePixelRatio || 1)), undefined, 0);
    card.className = 'pb-card';
    card.style.width = `${w}px`; card.style.height = `${h}px`;
    card.style.left = `${Math.round((stage.clientWidth - w) / 2)}px`;
    card.style.top = `${Math.round((stage.clientHeight - h) / 2)}px`;
    stage.append(card);
    ctx.sound('reward');
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
    speak(pick(PHOTO_LINES.shot, ctx.rng), 'happy');
    await ctx.wait(reducedFx() ? 200 : 1000);
    if (!ctx.isAlive()) return;
    ctx.confetti(26);
    rows.classList.add('ps-hide'); acts.replaceChildren();
    let saved: PhotoRec | null = null;
    const png = ctx.button('Enregistrer en PNG', () => { png.disabled = true; void exportPng(saved ?? draft).finally(() => { png.disabled = false; }); }, 'secondary');
    const again = ctx.button('Reprendre une photo', () => {
      card.remove(); cv.style.opacity = '1'; cv.style.transform = '';
      rows.classList.remove('ps-hide'); acts.replaceChildren(goBtn);
      chips.forEach((b) => { b.disabled = false; }); goBtn.disabled = false; busy = false;
      speak('Avec plaisir, on la refait !', 'happy');
      startLoop();
    }, 'secondary');
    const keep = ctx.button('Garder ce souvenir ♡', () => {
      if (!saved) {
        keep.disabled = true;
        saved = ctx.addPhoto({ place: d.place as PlaceId, title, auguste: true, kids: [], pose: poseIndex(), frame: cur.frame, filter: d.filter });
        ctx.sound('heart'); ctx.confetti(18);
        speak(pick(PHOTO_LINES.kept, ctx.rng), 'happy');
        again.remove();
        keep.textContent = 'Continuer ♡'; keep.disabled = false; ctx.pop(keep);
        return;
      }
      finish({ score: 100, ok: true, data: { photoId: saved.id, decor: cur.decor, pose: cur.pose, frame: cur.frame } });
    }, 'gold ps-keep');
    const row2 = el('div', 'ps-row2'); row2.append(png, again);
    acts.append(keep, row2);
    ctx.pop(keep);
  }

  return done;
};
export default activity;
