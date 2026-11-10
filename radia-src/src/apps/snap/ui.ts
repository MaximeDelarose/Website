/**
 * Snapchien — photos virtuelles et stories dans le téléphone du jeu : décors, poses, cadres, filtres,
 * autocollants déplaçables, obturateur + flash, enregistrement dans l'album interne (Photos souvenirs), stories de
 * 1 à 5 images avec réactions fictives, stories proposées par les activités. Rien ne sort du jeu sans action explicite.
 */
import './snap.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { registerBusy, emitPhone } from '../../events/bus';
import { haptic } from '../../core/haptics';
import type { PhotoRec, PlaceId } from '../../events/types';
import { PLACE_NAMES } from '../../events/places';
import { POSES, FRAMES, FILTERS } from '../../events/photo/data';
import { exportFileName } from '../../events/photo/data';
import { currentLook } from '../../game/world/look';
import { warmPhotos } from '../../events/photo/render';
import { drawSnap, renderSnap, RATIO } from './render';
import { drawSticker, stickerHit } from '../art';
import { snapState, persist, photoById, catAdopted, catName, catOpts, reduced } from '../store';
import { SHAPE_STICKERS, TEXT_STICKERS, ANIM_NAMES, SNAP_PLACES, MAX_STICKERS, defaultCam, makeSticker, camForMoment, visibleReactions, unviewedStories, randomCaption, type CamDraft, type Pending, type Story } from './model';
import { savePhoto, deleteSnapPhoto, postStory, publishPendingStory, snapOfferClosed, ignorePending, publishPhotoClip } from '../service';
import { ico, tick, note, heartBurst, animate, fitBox } from '../kit';
import { makeCanvas } from '../../game/art/kit';
import { cleanText } from '../util';
import { addFansNote } from './fansNote';
import { flags } from './ui-state';
import { chatView, openFriendStory, type SnapTab } from './chat/view';
import { contactById } from './chat/data';
import { faceUrl } from './chat/selfie';
import { dayKey, friendStories, unopenedSnapCount, unseenStories, unreadTotal } from './chat/engine';

import { PARTNER } from '../../config/gift';
let layer: HTMLElement | null = null;
registerBusy(() => !!layer);

type View = 'home' | 'camera' | 'chat' | 'snaps' | 'friends' | 'stories';
const thumbCache = new Map<string, HTMLCanvasElement>();
export function snapThumb(id: string, w = 220): HTMLCanvasElement | null {
  const rec = photoById(id); if (!rec) return null;
  const key = `${id}|${w}`;
  let c = thumbCache.get(key);
  if (!c) {
    const m = snapState().photos.find((p) => p.id === id);
    c = renderSnap(rec, { cat: !!m?.cat, stickers: m?.stickers ?? [], catOpts: catOpts() }, w);
    if (thumbCache.size > 60) thumbCache.delete(thumbCache.keys().next().value as string);
    thumbCache.set(key, c);
  }
  const copy = makeCanvas(c.width, c.height); copy.getContext('2d')!.drawImage(c, 0, 0);
  return copy;
}
const recFor = (cam: CamDraft): PhotoRec => ({ id: 'draft', eventId: 'snap', place: cam.place as PlaceId, title: cam.title, ts: 1_700_000_000_000, look: currentLook(), auguste: cam.aug, kids: [], pose: cam.pose, frame: cam.frame, filter: cam.filter });

export function openSnap(view: View = 'chat', opts: { pending?: Pending } = {}): void {
  if (layer) return;
  flags.open = true;
  void warmPhotos().catch(() => undefined);
  const st = snapState();
  const root = h('div.snp-layer');
  layer = root;
  const toast = (title: string, sub?: string, ms?: number) => note(root, title, sub, ms);
  ui.root.append(root);
  tick('pop2');
  let stopAnim: (() => void) | null = null;

  const close = () => { stopAnim?.(); chatOff?.(); chatOff = null; root.classList.add('out'); window.setTimeout(() => root.remove(), 240); layer = null; flags.open = false; persist(); emitPhone(); };
  const go = (v: View, p?: Pending) => { stopAnim?.(); stopAnim = null; root.querySelectorAll('.snp-view').forEach((e) => e.remove()); if (v === 'home') homeView(); else if (v === 'stories') storiesView(); else if (v === 'chat' || v === 'snaps' || v === 'friends') chatScreen(v); else cameraView(p); };

  // ================================================================ CHAT (conversations, snaps rouges, flammes)
  let chatOff: (() => void) | null = null;
  /** Barre d'onglets du bas : Chat / Souvenirs. */
  const tabs = (active: SnapTab): HTMLElement => {
    const t = (id: SnapTab, label: string, icon: string, badge: number): HTMLElement => h(`button.snc-tab${active === id ? '.on' : ''}`, { 'aria-label': badge ? `${label}, ${badge} nouveau${badge > 1 ? 'x' : ''}` : label, 'data-tab': id, on: { click: tap(() => { if (active !== id) go(id); }, { sound: false }) } }, ico(icon, 24), h('span', label), badge ? h('i.snc-dot', String(Math.min(99, badge))) : null);
    return h('nav.snc-tabs', t('chat', 'Chats', 'comment', snapUnread()), t('snaps', 'Snaps', 'camera', unopenedSnapCount(st.chat)), t('friends', 'Amis', 'user', 0), t('stories', 'Stories', 'play', unseenStories(st.chat, dayKey(Date.now()))), t('home', 'Souvenirs', 'image', 0));
  };
  const snapUnread = (): number => unreadTotal(st.chat);
  function chatScreen(mode: 'chat' | 'snaps' | 'friends' = 'chat'): void {
    chatOff?.();
    const v = h('div.snp-view.snp-chat');
    root.append(v);
    chatOff = chatView({ root, toast, tabs, close }, v, mode);
  }

  // ================================================================ STORIES (amis + les miennes + moments à publier)
  function storiesView(): void {
    const v = h('div.snp-view.snp-home.snp-stories');
    const head = h('div.snp-head',
      h('button.snp-x', { 'aria-label': 'Fermer', on: { click: tap(close, { sound: false }) } }, ico('close', 22)),
      h('div.snp-brand', h('i'), h('b', 'Stories')),
      h('button.snp-x.snp-cam', { 'aria-label': 'Prendre une photo', on: { click: tap(() => go('camera'), { sound: false }) } }, ico('camera', 22)));
    const bar = h('div.snp-stories');
    const addBtn = h('button.snp-story.add', { on: { click: tap(() => openStoryComposer(), { sound: false }) } }, h('span.snp-ring.plain', h('i', '+')), h('small', 'Ma story'));
    bar.append(addBtn);
    for (const p of st.pending.filter((x) => x.snap)) {
      bar.append(h('button.snp-story.moment', { 'aria-label': `Moment : ${p.title}`, on: { click: tap(() => document.getElementById(`pd-${p.id}`)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }), { sound: false }) } }, h('span.snp-ring.moment', h('i', '✦')), h('small', 'Moment')));
    }
    for (const s2 of st.stories.slice().reverse()) {
      const th = snapThumb(s2.frames[0].photo, 120);
      bar.append(h(`button.snp-story${s2.viewed ? '.seen' : ''}`, { 'aria-label': 'Voir la story', on: { click: tap(() => openStoryViewer(s2.id), { sound: false }) } }, h('span.snp-ring', th ?? h('i', '♡')), h('small', 'Moi')));
    }
    const body = h('div.snp-hbody');
    // stories des amis : une par jour et par ami, jamais d'obligation de les regarder
    const fs = friendStories(st.chat, dayKey(Date.now()));
    body.append(h('h3.snp-h', 'Stories des amis'));
    if (!fs.length) body.append(h('p.snp-fine', 'Pas de story pour le moment. Reviens plus tard ♡'));
    const frow = h('div.snp-stories.friends');
    for (const f of fs) {
      const ct = contactById(f.cid);
      frow.append(h(`button.snp-story${f.seen ? '.seen' : ''}`, { 'aria-label': `Story de ${ct?.name ?? ''}${f.seen ? ' (vue)' : ''}`, 'data-cid': f.cid, on: { click: tap(() => openFriendStory({ root }, f, { onClose: () => go('stories'), onReply: (cid) => { go('chat'); window.setTimeout(() => (root.querySelector(`.snc-row[data-cid="${cid}"]`) as HTMLElement | null)?.click(), 60); } }), { sound: false }) } },
        h('span.snp-ring', h('img.snc-face', { src: faceUrl(f.cid, 96), alt: '' })), h('small', ct?.name ?? '')));
    }
    body.append(frow);
    const pend = st.pending.filter((p) => p.snap);
    if (pend.length) {
      body.append(h('h3.snp-h', 'Moments à publier'));
      for (const p of pend) body.append(pendingCard(p));
    }
    v.append(head, bar, body, tabs('stories'));
    root.append(v);
  }

  // ================================================================ SOUVENIRS (mon album)
  function homeView(): void {
    const v = h('div.snp-view.snp-home');
    const head = h('div.snp-head',
      h('button.snp-x', { 'aria-label': 'Fermer', on: { click: tap(close, { sound: false }) } }, ico('close', 22)),
      h('div.snp-brand', h('i'), h('b', 'Souvenirs')),
      h('button.snp-x.snp-cam', { 'aria-label': 'Prendre une photo', on: { click: tap(() => go('camera'), { sound: false }) } }, ico('camera', 22)));
    const body = h('div.snp-hbody');
    body.append(h('h3.snp-h', 'Mon album'));
    const photos = st.photos.slice().reverse();
    if (!photos.length) body.append(h('div.snp-empty', h('p', 'Aucune photo pour l’instant.'), h('button.btn', { on: { click: tap(() => go('camera'), { sound: false }) } }, 'Prendre ma première photo')));
    else {
      const grid = h('div.snp-grid');
      for (const p of photos) {
        const th = snapThumb(p.id, 240);
        if (!th) continue;
        th.className = 'snp-th';
        grid.append(h('button.snp-cell', { 'aria-label': 'Voir la photo', on: { click: tap(() => openPhotoViewer(p.id), { sound: false }) } }, th));
      }
      body.append(grid);
    }
    body.append(h('p.snp-fine', 'Tes photos sont enregistrées dans « Photos souvenirs » du téléphone. Rien n’est publié hors du jeu.'));
    const fab = h('button.snp-fab', { 'aria-label': 'Prendre une photo', on: { click: tap(() => go('camera'), { sound: false }) } }, ico('camera', 28));
    v.append(head, body, fab, tabs('home'));
    root.append(v);
  }

  function pendingCard(p: Pending): HTMLElement {
    const cam = camForMoment(p, catAdopted());
    const cv = h('canvas.snp-pcv') as HTMLCanvasElement;
    const rec = recFor(cam);
    const draw = () => { const w = 150; cv.width = w; cv.height = Math.round(w / RATIO); drawSnap(cv.getContext('2d')!, rec, { cat: cam.cat, stickers: cam.stickers, catOpts: catOpts() }, cv.width, cv.height, 0.8, '', false); };
    draw(); window.setTimeout(draw, 700); // l'illustration d'Auguste peut arriver après
    const done = (msg: string) => { card.classList.add('out'); window.setTimeout(() => { go('home'); toast(msg); }, 220); };
    const card = h('div.snp-pcard', { id: `pd-${p.id}` }, cv,
      h('div.snp-pbody', h('b', p.title), h('small', 'Publier cette story ?'), h('p', p.caption || 'Un joli souvenir à partager dans le jeu ♡'),
        h('div.snp-prow',
          h('button.btn.small', { on: { click: tap(() => { const r = publishPendingStory(p); tick('reward'); haptic('reward'); done(r.story ? 'Story publiée ♡' : 'Photo enregistrée'); }, { sound: false }) } }, 'Publier'),
          h('button.btn.small.secondary', { on: { click: tap(() => go('camera', p), { sound: false }) } }, 'Retoucher'),
          h('button.snp-link', { on: { click: tap(() => { ignorePending(p.id); done('Moment ignoré'); }, { sound: false }) } }, 'Ignorer'))));
    return card;
  }

  // ================================================================ APPAREIL
  function cameraView(p?: Pending): void {
    const cam: CamDraft = p ? camForMoment(p, catAdopted()) : (st.cam ? { ...st.cam, stickers: st.cam.stickers.map((s) => ({ ...s })) } : defaultCam());
    if (!catAdopted()) cam.cat = false;
    let sel = '';
    let tab = (p ? 'stickers' : 'decor') as 'decor' | 'pose' | 'cadre' | 'filtre' | 'stickers' | 'persos';
    let dirty = true;
    const save = () => { st.cam = { ...cam, stickers: cam.stickers.map((s) => ({ ...s })) }; persist(); };
    const v = h('div.snp-view.snp-cam-view');
    const cv = h('canvas.snp-prev') as HTMLCanvasElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(360 * Math.min(dpr, 1.5)); cv.height = Math.round(cv.width / RATIO);
    const g = cv.getContext('2d')!;
    const fr = h('div.snp-fr', cv, h('div.snp-bin', ico('trash', 22), h('small', 'Supprimer')), h('div.snp-rec', h('i'), 'ENREGISTRÉ'), h('div.snp-iris'), h('div.snp-flash'));
    const stage = h('div.snp-stage', fr);
    const ctrl = h('div.snp-ctrl');
    const panel = h('div.snp-panel');
    const tabs = h('div.snp-tabs');
    const shutter = h('button.snp-shutter', { 'aria-label': 'Prendre la photo', on: { click: tap(() => shoot(), { sound: false }) } }, h('i'));
    const back = h('button.snp-x', { 'aria-label': 'Retour', on: { click: tap(() => { save(); go('home'); }, { sound: false }) } }, ico('back', 22));
    const titleIn = h('input.snp-title', { type: 'text', maxLength: 40, 'aria-label': 'Titre de la photo', placeholder: 'Titre' }) as HTMLInputElement;
    titleIn.value = cam.title;
    titleIn.addEventListener('input', () => { cam.title = cleanText(titleIn.value, 40) || 'Un joli souvenir'; dirty = true; });
    titleIn.addEventListener('change', save);
    const head = h('div.snp-head', back, titleIn, h('span.snp-spacer'));
    v.append(head, stage, ctrl, panel, tabs, h('div.snp-shutrow', shutter));
    root.append(v);
    fitBox(stage, fr);

    const meta = () => ({ cat: cam.cat && catAdopted(), stickers: cam.stickers, catOpts: catOpts() });
    const rec = () => recFor(cam);
    let lastDraw = 0, raf = 0, cost = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const anim = !reduced() && (cam.stickers.length > 0 || FILTERS.find((f) => f.id === cam.filter)?.sparkle || true);
      if (!dirty && (!anim || now - lastDraw < Math.max(66, cost * 2.5))) return;
      if (now - lastDraw < Math.max(40, cost * 1.5)) return;
      lastDraw = now; dirty = false;
      const t1 = performance.now();
      g.clearRect(0, 0, cv.width, cv.height);
      drawSnap(g, rec(), meta(), cv.width, cv.height, reduced() ? 0.8 : now / 1000, sel, !reduced());
      cost = cost * 0.7 + (performance.now() - t1) * 0.3;
    };
    raf = requestAnimationFrame(loop);
    stopAnim = () => cancelAnimationFrame(raf);
    window.setTimeout(() => { dirty = true; }, 600);
    window.setTimeout(() => { dirty = true; }, 1600);

    // ---- autocollants au doigt (glisser, pincer, supprimer)
    const pts = new Map<number, { x: number; y: number }>();
    let drag: { id: string; dx: number; dy: number } | null = null;
    let pinch: { d: number; a: number; s: number; r: number } | null = null;
    const local = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width), y: ((e.clientY - r.top) / r.height) }; };
    const hit = (x: number, y: number) => { for (let i = cam.stickers.length - 1; i >= 0; i--) if (stickerHit(cam.stickers[i], cv.width, cv.height, x * cv.width, y * cv.height)) return cam.stickers[i]; return null; };
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      const l = local(e); pts.set(e.pointerId, l);
      const s = hit(l.x, l.y);
      if (pts.size === 1) {
        if (s) { sel = s.id; drag = { id: s.id, dx: s.x - l.x, dy: s.y - l.y }; stage.classList.add('dragging'); haptic('select'); renderCtrl(); }
        else { sel = ''; drag = null; renderCtrl(); }
      } else if (pts.size === 2 && sel) {
        const cur = cam.stickers.find((x) => x.id === sel);
        const [a, b] = [...pts.values()];
        if (cur) pinch = { d: Math.hypot((a.x - b.x) * cv.width, (a.y - b.y) * cv.height) || 1, a: Math.atan2(b.y - a.y, b.x - a.x), s: cur.s, r: cur.r };
        drag = null;
      }
      dirty = true;
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const l = local(e); pts.set(e.pointerId, l);
      const cur = cam.stickers.find((x) => x.id === sel);
      if (pinch && cur && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot((a.x - b.x) * cv.width, (a.y - b.y) * cv.height) || 1;
        cur.s = Math.min(3, Math.max(0.4, pinch.s * (d / pinch.d)));
        cur.r = pinch.r + (Math.atan2(b.y - a.y, b.x - a.x) - pinch.a);
      } else if (drag && cur) {
        cur.x = Math.min(1, Math.max(0, l.x + drag.dx)); cur.y = Math.min(1, Math.max(0, l.y + drag.dy));
        stage.classList.toggle('bin-on', l.y > 0.88);
      }
      dirty = true;
    });
    const up = (e: PointerEvent) => {
      const l = pts.get(e.pointerId);
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!pts.size) {
        if (drag && l && l.y > 0.88) { removeSticker(drag.id); }
        stage.classList.remove('dragging', 'bin-on'); drag = null; save();
      }
      dirty = true;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    function removeSticker(id: string): void {
      cam.stickers = cam.stickers.filter((s) => s.id !== id);
      if (sel === id) sel = '';
      haptic('select'); tick('pop1'); renderCtrl(); save(); dirty = true;
    }
    function renderCtrl(): void {
      ctrl.textContent = '';
      const cur = cam.stickers.find((s) => s.id === sel);
      if (!cur) { ctrl.append(h('small.snp-hint', cam.stickers.length ? 'Touche un autocollant pour le modifier · pince pour agrandir' : 'Ajoute des autocollants, puis déplace-les au doigt ♡')); return; }
      const b = (label: string, ic: string, fn: () => void) => h('button.snp-cb', { 'aria-label': label, on: { click: tap(() => { fn(); save(); dirty = true; }, { sound: false }) } }, ico(ic, 18));
      ctrl.append(
        b('Réduire', 'plusMinus', () => { cur.s = Math.max(0.4, cur.s * 0.85); }),
        b('Agrandir', 'plus', () => { cur.s = Math.min(3, cur.s * 1.18); }),
        b('Pivoter', 'rotate', () => { cur.r += 0.26; }),
        h('button.snp-cb.wide', { 'aria-label': 'Animation', on: { click: tap(() => { cur.a = (cur.a + 1) % ANIM_NAMES.length; renderCtrl(); save(); dirty = true; }, { sound: false }) } }, ico('sparkle', 16), h('span', ANIM_NAMES[cur.a])),
        b('Supprimer', 'trash', () => removeSticker(cur.id)));
    }

    // ---- panneaux
    const chip = (label: string, on: boolean, fn: () => void) => h(`button.snp-chip${on ? '.on' : ''}`, { on: { click: tap(() => { fn(); save(); dirty = true; renderPanel(); }, { sound: false }) } }, label);
    function renderPanel(): void {
      panel.textContent = '';
      tabs.querySelectorAll('.snp-tab').forEach((t) => t.classList.toggle('on', (t as HTMLElement).dataset.t === tab));
      if (tab === 'decor') for (const id of SNAP_PLACES) panel.append(chip(PLACE_NAMES[id as PlaceId] ?? id, cam.place === id, () => { cam.place = id; }));
      else if (tab === 'pose') POSES.forEach((po, i) => panel.append(chip(po.label, cam.pose === i, () => { cam.pose = i; })));
      else if (tab === 'cadre') for (const f of FRAMES) panel.append(chip(f.label, cam.frame === f.id, () => { cam.frame = f.id; }));
      else if (tab === 'filtre') for (const f of FILTERS) panel.append(chip(f.label, cam.filter === f.id, () => { cam.filter = f.id; }));
      else if (tab === 'persos') {
        panel.append(
          chip('Radia', true, () => undefined),
          chip(cam.aug ? `${PARTNER} ✓` : `Avec ${PARTNER}`, cam.aug, () => { cam.aug = !cam.aug; }),
          catAdopted() ? chip(cam.cat ? `${catName()} ✓` : 'Avec le chat', cam.cat, () => { cam.cat = !cam.cat; }) : h('small.snp-hint', 'Le chat viendra quand tu l’adopteras au château.'));
      } else {
        panel.classList.add('stk');
        for (const sh of SHAPE_STICKERS) {
          const mini = makeCanvas(56, 56); drawSticker(mini.getContext('2d')!, { ...makeSticker(sh.k), x: 0.5, y: 0.5, s: 1.9 }, 56, 56, 0, false, false);
          panel.append(h('button.snp-sk', { 'aria-label': sh.label, on: { click: tap(() => addSticker(makeSticker(sh.k)), { sound: false }) } }, mini));
        }
        for (const t of TEXT_STICKERS) panel.append(h('button.snp-chip.txt', { on: { click: tap(() => addSticker(makeSticker('text', t)), { sound: false }) } }, t));
      }
      if (tab !== 'stickers') panel.classList.remove('stk');
    }
    function addSticker(s: ReturnType<typeof makeSticker>): void {
      if (cam.stickers.length >= MAX_STICKERS) { toast('Ça fait beaucoup d’autocollants !', 'Supprime-en un pour en ajouter ♡'); haptic('error'); return; }
      const n = cam.stickers.length;
      s.x = 0.3 + ((n * 0.17) % 0.45); s.y = 0.25 + ((n * 0.13) % 0.4);
      cam.stickers.push(s); sel = s.id; tick('sparkle'); renderCtrl(); save(); dirty = true;
    }
    const TABS: [typeof tab, string][] = [['decor', 'Décor'], ['pose', 'Pose'], ['persos', 'Persos'], ['cadre', 'Cadre'], ['filtre', 'Filtre'], ['stickers', 'Stickers']];
    for (const [k, l] of TABS) tabs.append(h('button.snp-tab', { 'data-t': k, on: { click: tap(() => { tab = k; renderPanel(); }, { sound: false }) } }, l));
    renderPanel(); renderCtrl();

    // ---- obturateur : iris + flash + enregistrement dans l'album
    let busy = false;
    function shoot(): void {
      if (busy) return;
      busy = true; sel = ''; dirty = true;
      haptic('drop'); tick('sparkle');
      stage.classList.remove('shot'); void stage.offsetWidth; stage.classList.add('shot');
      window.setTimeout(() => {
        cam.title = cleanText(titleIn.value, 40) || 'Un joli souvenir';
        const photo = savePhoto(cam);
        thumbCache.clear();
        stage.classList.add('saved');
        haptic('reward');
        toast('Enregistré dans l’album ♡', 'Retrouve-la dans Photos souvenirs.', 2400);
        st.cam = { ...cam, stickers: [] }; persist();
        window.setTimeout(() => { stage.classList.remove('shot', 'saved'); busy = false; }, reduced() ? 200 : 1300);
        window.setTimeout(() => openPhotoViewer(photo.id, true), reduced() ? 250 : 900);
        if (p) { snapOfferClosed(p.id); }
      }, reduced() ? 80 : 320);
    }
  }

  // ================================================================ VISIONNEUSE
  function openPhotoViewer(id: string, fresh = false): void {
    const r = photoById(id); const m = st.photos.find((x) => x.id === id);
    if (!r || !m) return;
    const back = h('div.snp-ov');
    const cv = h('canvas.snp-vcv') as HTMLCanvasElement;
    cv.width = 540; cv.height = Math.round(540 / RATIO);
    const g = cv.getContext('2d')!;
    const stop = animate((t) => { if (reduced() && cv.dataset.d) return; g.clearRect(0, 0, cv.width, cv.height); drawSnap(g, r, { cat: m.cat, stickers: m.stickers, catOpts: catOpts() }, cv.width, cv.height, reduced() ? 0.8 : t, '', !reduced()); cv.dataset.d = '1'; });
    const done = () => { stop(); back.classList.add('out'); window.setTimeout(() => back.remove(), 220); if (fresh) go('home'); else go('home'); };
    const act = (label: string, ic: string, fn: () => void, cls = '') => h(`button.snp-act${cls}`, { on: { click: tap(fn, { sound: false }) } }, ico(ic, 20), h('span', label));
    const actions = h('div.snp-acts',
      act('Story', 'camera', () => { stop(); back.remove(); openStoryComposer([id]); }),
      act('TikTak', 'play', () => {
        const res = publishPhotoClip(id, '', r.title); tick('reward'); haptic('reward');
        toast('Publié dans TikTak ♡', addFansNote(res.fans), 3000);
      }),
      act('PNG', 'image', () => { void exportSnap(r, { cat: m.cat, stickers: m.stickers, catOpts: catOpts() }); }),
      act('Suppr.', 'trash', () => { void ui.confirm('Supprimer cette photo ?', 'Elle disparaît aussi de Photos souvenirs.', 'Supprimer', 'Garder').then((ok) => { if (ok) { deleteSnapPhoto(id); thumbCache.clear(); done(); } }); }));
    const vw = h('div.snp-vwrap', h('div.snp-fr', cv));
    back.append(h('div.snp-vhead', h('button.snp-x', { 'aria-label': 'Fermer', on: { click: tap(done, { sound: false }) } }, ico('close', 22)), h('b', r.title)), vw, actions, h('p.snp-fine.light', 'L’export PNG est local : tu choisis où l’enregistrer.'));
    root.append(back);
    fitBox(vw, vw.firstElementChild as HTMLElement);
    if (fresh && !reduced()) window.setTimeout(() => heartBurst(back, back.clientWidth / 2, back.clientHeight * 0.4, 8), 250);
  }

  // ================================================================ STORIES
  function openStoryComposer(pre: string[] = st.storyDraft?.photos ?? []): void {
    const photos = st.photos.slice().reverse();
    let chosen = pre.filter((p) => photos.some((x) => x.id === p)).slice(0, 5);
    let cap = st.storyDraft?.caption ?? '';
    const back = h('div.snp-ov.light');
    const grid = h('div.snp-grid.pick');
    const capIn = h('input.snp-title.dark', { type: 'text', maxLength: 80, placeholder: 'Une légende pour ta story', 'aria-label': 'Légende' }) as HTMLInputElement;
    capIn.value = cap;
    const goBtn = h('button.btn.snp-go', 'Publier la story') as HTMLButtonElement;
    const strip = h('small.snp-hint', '');
    const sync = () => {
      goBtn.disabled = !chosen.length;
      strip.textContent = chosen.length ? `${chosen.length} / 5 image${chosen.length > 1 ? 's' : ''}` : 'Choisis de 1 à 5 photos de ton album.';
      grid.querySelectorAll('button').forEach((b) => { const i = chosen.indexOf((b as HTMLElement).dataset.id!); b.classList.toggle('on', i >= 0); b.querySelector('em')!.textContent = i >= 0 ? String(i + 1) : ''; });
    };
    for (const p of photos) {
      const th = snapThumb(p.id, 200); if (!th) continue; th.className = 'snp-th';
      grid.append(h('button.snp-cell', { 'data-id': p.id, on: { click: tap(() => { const i = chosen.indexOf(p.id); if (i >= 0) chosen.splice(i, 1); else if (chosen.length < 5) chosen.push(p.id); else haptic('error'); sync(); }, { sound: false }) } }, th, h('em')));
    }
    const chips = h('div.snp-chips', ...['Un petit moment à garder ♡', 'Juste nous deux.', 'Aujourd’hui était parfait.'].map((t) => h('button.snp-chip', { on: { click: tap(() => { capIn.value = t; }, { sound: false }) } }, t)), h('button.snp-chip', { on: { click: tap(() => { capIn.value = randomCaption(); }, { sound: false }) } }, 'Surprise ✨'));
    const saveDraft = () => { if (chosen.length && !published) { st.storyDraft = { photos: chosen.slice(), caption: cleanText(capIn.value, 80) }; persist(); } };
    let published = false;
    const closeC = () => { saveDraft(); back.classList.add('out'); window.setTimeout(() => back.remove(), 220); };
    goBtn.addEventListener('click', () => {
      published = true;
      const s = postStory(chosen, capIn.value);
      if (s) { tick('reward'); haptic('reward'); back.remove(); thumbCache.clear(); go('home'); window.setTimeout(() => openStoryViewer(s.id), 260); }
    });
    back.append(h('div.snp-vhead.dark', h('button.snp-x.dark', { 'aria-label': 'Fermer', on: { click: tap(closeC, { sound: false }) } }, ico('close', 22)), h('b', 'Nouvelle story')),
      h('div.snp-cbody', ...(photos.length ? [strip, grid, capIn, chips, goBtn] : [h('div.snp-empty', h('p', 'Il te faut au moins une photo pour créer une story.'), h('button.btn', { on: { click: tap(() => { back.remove(); go('camera'); }, { sound: false }) } }, 'Prendre une photo'))])));
    root.append(back);
    sync();
  }

  function openStoryViewer(id: string): void {
    const s = st.stories.find((x) => x.id === id);
    if (!s) return;
    let idx = 0, t0 = performance.now(), paused = false, held = 0, shown = 0;
    let stopLoop: () => void = () => undefined;
    const FRAME_MS = 3200;
    const back = h('div.snp-ov.story');
    const bars = h('div.snp-bars', ...s.frames.map(() => h('i', h('b'))));
    const cv = h('canvas.snp-scv') as HTMLCanvasElement; cv.width = 540; cv.height = Math.round(540 / RATIO);
    const g = cv.getContext('2d')!;
    const cap = h('div.snp-scap');
    const reacts = h('div.snp-reacts');
    const x = h('button.snp-x', { 'aria-label': 'Fermer', on: { click: tap(() => end(), { sound: false }) } }, ico('close', 22));
    const del = h('button.snp-x', { 'aria-label': 'Supprimer la story', on: { click: tap(async () => { if (await ui.confirm('Supprimer cette story ?', 'Les photos restent dans ton album.', 'Supprimer', 'Garder')) { st.stories = st.stories.filter((q) => q.id !== id); persist(); end(); } }, { sound: false }) } }, ico('trash', 20));
    back.append(bars, h('div.snp-stop', x, h('b', 'Ma story'), del), h('div.snp-swrap', h('div.snp-fr', cv)), cap, reacts, h('div.snp-tapl'), h('div.snp-tapr'));
    root.append(back);
    { const sw = back.querySelector('.snp-swrap') as HTMLElement; fitBox(sw, sw.firstElementChild as HTMLElement); }
    function end(): void { stopLoop(); s!.viewed = true; persist(); back.classList.add('out'); window.setTimeout(() => back.remove(), 220); go('home'); emitPhone(); }
    function showFrame(): void {
      const f = s!.frames[idx];
      const rec = photoById(f.photo); const m = st.photos.find((p) => p.id === f.photo);
      cap.textContent = s!.caption || '';
      cap.classList.toggle('empty', !s!.caption);
      void rec; void m;
      bars.querySelectorAll('i').forEach((b, i) => { (b.firstElementChild as HTMLElement).style.width = i < idx ? '100%' : '0%'; });
      t0 = performance.now(); held = 0;
    }
    function drawReacts(): void {
      const list = visibleReactions(s!, Date.now());
      if (list.length === shown) return;
      for (let i = shown; i < list.length; i++) {
        const r = list[i];
        reacts.prepend(h('div.snp-react', h('span.snp-ravatar', r.who.slice(0, 1)), h('div', h('b', r.who), h('p', r.txt))));
        if (i >= 0 && shown > 0) { tick('pop1'); }
      }
      while (reacts.children.length > 3) reacts.lastElementChild?.remove();
      shown = list.length;
    }
    const loop = (_t: number, now: number) => {
      const f = s.frames[idx];
      const rec = photoById(f.photo), m = st.photos.find((p) => p.id === f.photo);
      g.clearRect(0, 0, cv.width, cv.height);
      if (rec) drawSnap(g, rec, { cat: !!m?.cat, stickers: m?.stickers ?? [], catOpts: catOpts() }, cv.width, cv.height, reduced() ? 0.8 : now / 1000, '', !reduced());
      if (!paused) {
        const k = Math.min(1, (now - t0 - held) / FRAME_MS);
        (bars.children[idx].firstElementChild as HTMLElement).style.width = `${k * 100}%`;
        if (k >= 1) { if (idx < s.frames.length - 1) { idx++; showFrame(); } else { end(); return; } }
      } else held = now - t0 - (parseFloat((bars.children[idx].firstElementChild as HTMLElement).style.width) / 100) * FRAME_MS;
      drawReacts();
    };
    back.querySelector('.snp-tapl')!.addEventListener('click', () => { if (idx > 0) { idx--; showFrame(); } });
    back.querySelector('.snp-tapr')!.addEventListener('click', () => { if (idx < s.frames.length - 1) { idx++; showFrame(); } else end(); });
    for (const z of ['.snp-tapl', '.snp-tapr']) { const el = back.querySelector(z)!; el.addEventListener('pointerdown', () => { paused = true; }); el.addEventListener('pointerup', () => { paused = false; }); el.addEventListener('pointercancel', () => { paused = false; }); el.addEventListener('pointerleave', () => { paused = false; }); }
    showFrame();
    stopLoop = animate(loop, 33);
    s.viewed = true; persist();
  }

  if (view === 'camera') cameraView(opts.pending); else if (view === 'home') homeView(); else chatScreen();
}

/** Export PNG LOCAL (action volontaire) : partage système avec fichier si possible, sinon téléchargement. */
async function exportSnap(rec: PhotoRec, meta: { cat: boolean; stickers: ReturnType<typeof snapState>['photos'][number]['stickers']; catOpts?: ReturnType<typeof catOpts> }): Promise<void> {
  const cv = renderSnap(rec, meta, 1080);
  const blob: Blob | null = await new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
  if (!blob) return;
  const name = exportFileName(rec.title);
  try {
    const file = new File([blob], name, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] }) && nav.share) { await nav.share({ files: [file], title: rec.title }); return; }
  } catch (e) { if ((e as Error)?.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export const unviewedCount = (): number => unviewedStories(snapState());
export type { Story };
