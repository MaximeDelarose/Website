/**
 * Vue d'une pièce en MODE DÉCORATION : la pièce occupe presque tout l'écran, le catalogue est un panneau rétractable
 * (poignée glissable, 3 crans), caméra tactile (pincement, déplacement, recentrer, vue globale), glisser-déposer avec
 * silhouette de pose, rotation, couleurs avec aperçu, achat confirmé. Les règles sont dans placement.ts / draft.ts.
 */
import { h, tap } from '../../../dom';
import { ui } from '../../../ui';
import { icon } from '../../../icons';
import { save, audio, events, reducedFx } from '../../../../core/app';
import { haptic } from '../../../../core/haptics';
import { addHearts, stat } from '../../../../core/progress';
import { wallet, fmt, fmtTime } from '../../../../core/wallet';
import { addFans, addRes, firstTime } from '../../../../core/world';
import { reactAuguste } from '../../../../game/world/auguste';
import * as CT from '../../../../game/world/castle';
import { PALETTE, colorOf, MAGAZINE_NAMES, type RoomId, type MagazineId } from '../../../../data/world/ids';
import { SHOP_NAMES, SHOP_ORDER, furnitureForRoom, furnitureOf, type FurnitureDef, type ShopCat, type Place } from '../../../../data/world/furniture';
import { ROOMS, roomName, optionsFor, type ColorTarget } from '../../../../data/world/rooms';
import { drawMagazine } from '../../../../game/art/world/careers';
import { canvasUrl, paint, heartPath, PAL } from '../../../../game/art/kit';
import { diamondUrl } from '../../shop';
import { sparkleBurst, revealItem, rarityForPrice } from '../../../fx/sparkle';
import { softMoment } from '../../../../apps/eventMoments';
import type { RoomStyle } from '../../../../game/art/world/rooms';
import { geo } from './geometry';
import { Draft, type CommitInfo } from './draft';
import * as ops from './ops';
import { canRotate, drawOrder, nearestValid, resolveTarget, type Candidate } from './placement';
import { itemBox, hitBox, inBox } from './boxes';
import { clampCam, centerOn, ease, fitCam, limitsFor, pinch, sameCam, toScreen, toWorld, zoomAbout, type PinchStart } from './camera';
import { drawScene, thumb, type Anim, type DragState, type Particle } from './render';

const world = () => save.data.world;
const cctx: ops.Ctx = {
  get world() { return save.data.world; },
  diamonds: { get: () => wallet.diamonds(), spend: (n) => wallet.spendDiamonds(n) },
};
const commitSave = () => { save.save(); events.emit('economy', undefined); };

const hexRgb = (hx: string): number[] => { const n = parseInt(hx.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (v: number[]) => '#' + v.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
const coinUrl = () => canvasUrl('cs:coin', () => paint(24, 24, 2, (c) => {
  c.beginPath(); c.arc(12, 12, 10, 0, 7); c.fillStyle = PAL.or; c.fill(); c.lineWidth = 2; c.strokeStyle = PAL.choco; c.stroke();
  c.beginPath(); c.arc(12, 12, 6, 0, 7); c.strokeStyle = PAL.orDeep; c.lineWidth = 1.6; c.stroke();
  heartPath(c, 12, 12, 7); c.fillStyle = PAL.or; c.fill();
}));
const coin = () => h('img.cs-coin', { src: coinUrl(), alt: '' });
const magUrl = (id: MagazineId) => canvasUrl(`cs:mag:${id}`, () => paint(40, 54, 2, (c) => drawMagazine(c, id, 40, 54)));
const thumbUrl = (def: FurnitureDef, color?: string) => canvasUrl(`dc2:t:${def.id}:${color ?? def.color}`, () => thumb(def, 56, color));

const PLACE_LABEL: Record<Place, string> = { floor: 'Au sol', wall: 'Au mur', ceiling: 'Plafond', window: 'Fenêtre', rug: 'Tapis', surface: 'Se pose dessus' };
const PEEK_H = 150;
const dprNow = () => Math.min(3, window.devicePixelRatio || 1);

type Panel = 'none' | 'shop' | 'color';
type Gesture =
  | { k: 'press'; uid: number | null; sx: number; sy: number }
  | { k: 'pan'; lx: number; ly: number }
  | { k: 'drag'; uid: number; off: { x: number; y: number }; pid: number }
  | { k: 'pinch'; st: PinchStart };

export function roomView(room: RoomId, back: () => void, maybeFinale: () => void, fail?: (e: unknown) => void): [HTMLElement, HTMLElement, () => void] {
  const rdef = ROOMS[room];
  const G = geo(room);
  const draft = new Draft(cctx, room);
  let sel: number | null = null;
  let panel: Panel = 'none';
  let stop: 0 | 1 | 2 = 0;
  let shopTab: ShopCat | 'reserve' = 'reserve';
  let colorTarget: ColorTarget | 'item' = 'wall';
  let pend: Partial<Record<ColorTarget | 'item', string>> = {};
  let drag: DragState | null = null;
  let hint = '';
  const anims: Anim[] = [];
  const parts: Particle[] = [];
  let view = { w: 0, h: 0 };
  let dpr = dprNow();
  let cam = { s: 1, x: 0, y: 0 }; let camT = { ...cam };
  let fitMode = true;
  let dirtyFrame = true;
  let gesture: Gesture | null = null;
  const ptrs = new Map<number, { x: number; y: number }>();

  // couleurs affichées (transition douce) et aperçu
  const real = (): RoomStyle => ({ ...world().castle.rooms[room] }) as RoomStyle;
  const targetStyle = (): RoomStyle => { const r = real(); return { wall: pend.wall ?? r.wall, floor: pend.floor ?? r.floor, curtain: pend.curtain ?? r.curtain }; };
  const disp: Record<ColorTarget, number[]> = { wall: hexRgb(colorOf(real().wall)), floor: hexRgb(colorOf(real().floor)), curtain: hexRgb(colorOf(real().curtain)) };

  // ---- DOM
  const cv = h('canvas.cs-canvas');
  const camBox = h('div.dc2-cam',
    h('button.dc2-pill', { 'aria-label': 'Vue globale', on: { click: tap(() => globalView(), { sound: false }) } }, icon('map', 18), h('span', 'Vue globale')),
    h('button.dc2-pill', { 'aria-label': 'Recentrer', on: { click: tap(() => recenter(), { sound: false }) } }, icon('hint', 18), h('span', 'Recentrer')));
  const stage = h('div.cs-stage.dc2-stage', cv, camBox);
  const handle = h('button.dc2-handle', { 'aria-label': 'Ouvrir ou fermer le catalogue' }, h('i'));
  const info = h('div.dc2-info');
  const actions = h('div.dc2-actions');
  const sheet = h('div.dc2-sheet');
  const dock = h('div.dc2-dock', handle, info, actions, sheet);
  const coinChip = h('span.chip', coin(), h('b', fmt(world().res.coins)));
  const head = ui.header(roomName(room), () => leave(), coinChip);
  const body = h('div.cs-room.dc2-room', stage, dock);
  const refreshCoins = () => { (coinChip.lastChild as HTMLElement).textContent = fmt(world().res.coins); };

  // ---- utilitaires
  const openH = () => Math.max(PEEK_H + 60, Math.min(Math.round(window.innerHeight * 0.44), 390));
  const stopH = (s: number) => (s === 0 ? 0 : s === 1 ? (panel === 'color' ? 212 : PEEK_H) : openH());
  const selItem = () => (sel === null ? undefined : draft.get(sel));
  const markDirty = () => { dirtyFrame = true; };
  const stageRect = () => stage.getBoundingClientRect();
  const addAnim = (uid: number, kind: Anim['kind']) => { const i = anims.findIndex((a) => a.uid === uid); if (i >= 0) anims.splice(i, 1); anims.push({ uid, t0: performance.now(), kind }); markDirty(); };
  const burst = (x: number, y: number, n = 14, cols: string[] = [PAL.roseVif, PAL.or, PAL.lavande, '#fff']) => {
    if (reducedFx()) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2; const sp = 40 + Math.random() * 110;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, life: 0, max: 0.7 + Math.random() * 0.5, kind: (i % 3) as 0 | 1 | 2, col: cols[i % cols.length], s: 3 + Math.random() * 4 });
    }
    markDirty();
  };
  const boxOf = (uid: number, items = draft.items) => { const it = items.find((i) => i.uid === uid); return it ? itemBox(G, it, items) : null; };
  const centerWorld = (uid: number, items = draft.items) => { const b = boxOf(uid, items); return b ? { x: b.sprite.x + b.sprite.w / 2, y: b.sprite.y + b.sprite.h / 2 } : { x: G.W / 2, y: G.H / 2 }; };

  // ---- caméra
  const recomputeView = () => {
    const r = stageRect();
    if (!r.width || !r.height) return false;
    dpr = dprNow();
    view = { w: Math.round(r.width), h: Math.round(r.height) };
    if (cv.width !== view.w * dpr || cv.height !== view.h * dpr) { cv.width = view.w * dpr; cv.height = view.h * dpr; }
    return true;
  };
  const worldSize = { w: G.W, h: G.H };
  const lims = () => limitsFor(view, worldSize);
  const applyFit = (instant = false) => { camT = fitCam(view, worldSize); if (instant) cam = { ...camT }; markDirty(); };
  const onResize = () => {
    const first = view.w === 0;
    if (!recomputeView()) return;
    if (fitMode) applyFit(first); else { camT = clampCam(camT, view, worldSize, lims()); if (first) cam = { ...camT }; }
    markDirty();
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(stage);
  function globalView() { fitMode = true; applyFit(); audio.play('whoosh'); }
  function recenter() {
    fitMode = false;
    const it = selItem();
    const p = it ? centerWorld(it.uid) : { x: G.W / 2, y: G.H / 2 };
    const s = it ? Math.max(cam.s, fitCam(view, worldSize).s * 1.6) : cam.s;
    camT = clampCam(centerOn(camT, view, p.x, p.y, s), view, worldSize, lims());
    audio.play('whoosh'); markDirty();
  }
  /** Si le meuble sélectionné sort de l'écran, la caméra le ramène (sans changer le zoom). */
  function ensureVisible(uid: number) {
    if (fitMode) return;
    const b = boxOf(uid); if (!b) return;
    const a = toScreen(camT, b.sprite.x, b.sprite.y); const z = toScreen(camT, b.sprite.x + b.sprite.w, b.sprite.y + b.sprite.h);
    if (a.x < 8 || a.y < 8 || z.x > view.w - 8 || z.y > view.h - 8) {
      const p = centerWorld(uid); camT = clampCam(centerOn(camT, view, p.x, p.y), view, worldSize, lims());
    }
  }

  // ---- boucle de rendu
  let last = performance.now(); let lastDraw = 0; let raf = 0;
  let drawErrors = 0; let everDrawn = false; let failed = false;
  const giveUp = (e: unknown) => { if (failed) return; failed = true; cancelAnimationFrame(raf); try { console.error('[castle] pièce illisible', e); } catch { /* ignore */ } fail?.(e); };
  window.setTimeout(() => { if (!everDrawn && !failed) giveUp(new Error('aucun dessin après 3 s')); }, 3000);
  const frame = (nowMs: number) => {
    if (failed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (nowMs - last) / 1000); last = nowMs;
    if (!view.w) return;
    // transition de teinte
    const ts = targetStyle();
    let moving = false;
    for (const k of ['wall', 'floor', 'curtain'] as const) {
      const tg = hexRgb(colorOf(ts[k]));
      const f = 1 - Math.exp(-dt * 9);
      for (let i = 0; i < 3; i++) { const d = tg[i] - disp[k][i]; if (Math.abs(d) < 1.2) disp[k][i] = tg[i]; else { disp[k][i] += d * f; moving = true; } }
    }
    if (!sameCam(cam, camT)) { cam = reducedFx() ? { ...camT } : ease(cam, camT, dt); moving = true; }
    const active = !!drag || parts.length > 0 || anims.length > 0 || moving || gesture !== null;
    const interval = active ? 0 : reducedFx() ? 400 : 50;
    if (!dirtyFrame && nowMs - lastDraw < interval) return;
    if (!active && nowMs - lastDraw < interval) return;
    lastDraw = nowMs; dirtyFrame = false;
    const c = cv.getContext('2d')!;
    const pendColor = new Map<number, string>();
    if (sel !== null && pend.item) pendColor.set(sel, pend.item);
    try {
      drawScene(c, {
        room, G, items: draft.items, style: { wall: rgbHex(disp.wall), floor: rgbHex(disp.floor), curtain: rgbHex(disp.curtain) },
        sel, drag, pendColor, anims, parts, now: nowMs, dt, reduced: reducedFx(), cam, view, dpr,
      });
      everDrawn = true; drawErrors = 0;
    } catch (e) { if (++drawErrors >= 3) giveUp(e); }
  };
  raf = requestAnimationFrame(frame);

  // ---- sélection
  function select(uid: number | null, collapse = true) {
    sel = uid;
    if (uid !== null && collapse && stop > 0) setStop(0);
    if (uid === null && panel === 'color' && colorTarget === 'item') colorTarget = 'wall';
    renderBar(); markDirty();
  }

  // ---- pointeur : toucher, glisser, pincer
  const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function hit(wx: number, wy: number): number | null {
    const order = drawOrder(draft.items);
    for (let i = order.length - 1; i >= 0; i--) {
      const it = order[i]; const ib = itemBox(G, it, draft.items); if (!ib) continue;
      const hb = hitBox(ib.layer === 'floor' || ib.layer === 'rug' ? ib.foot : ib.sprite, cam.s);
      const sp = hitBox(ib.sprite, cam.s);
      if (inBox(hb, wx, wy) || (ib.layer !== 'window' && inBox(sp, wx, wy))) return it.uid;
    }
    return null;
  }
  const targetFor = (uid: number, finger: { x: number; y: number }, off: { x: number; y: number }) => {
    const it = draft.get(uid)!;
    const ignore = [uid, ...draft.kids(uid).map((k) => k.uid)];
    return resolveTarget(room, draft.items, it.id, it.rot ?? 0, finger, ignore, off);
  };

  function startDrag(uid: number, p: { x: number; y: number }, pid: number) {
    const w = toWorld(cam, p.x, p.y);
    const c = centerWorld(uid);
    const off = { x: w.x - c.x, y: w.y - c.y };
    gesture = { k: 'drag', uid, off, pid };
    if (sel !== uid) select(uid, true);
    drag = { uid, finger: w, off, target: targetFor(uid, w, off) };
    audio.play('pickup'); haptic('select');
    renderBar(); markDirty();
  }
  function endDrag(cancel: boolean) {
    const d = drag; drag = null;
    if (!d) return;
    const it = draft.get(d.uid);
    if (!it || cancel) { renderBar(); markDirty(); return; }
    let cand: Candidate | null = d.target.check.ok ? d.target.cand : nearestValid(room, draft.items, d.target.cand, [d.uid, ...draft.kids(d.uid).map((k) => k.uid)], 1.5);
    if (cand) {
      const r = draft.move(d.uid, cand);
      if (r.ok) { addAnim(d.uid, 'pop'); audio.play('drop'); haptic('select'); hint = ''; }
      else cand = null;
    }
    if (!cand) { addAnim(d.uid, 'shake'); audio.play('invalid'); haptic('error'); hint = d.target.check.reason; }
    renderBar(); markDirty();
  }

  cv.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    const p = pos(e);
    try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    ptrs.set(e.pointerId, p);
    if (ptrs.size >= 2) {
      // deuxième doigt : on passe en caméra (un éventuel glisser de meuble est validé tel quel)
      if (gesture?.k === 'drag') endDrag(false);
      const [a, b] = [...ptrs.values()];
      fitMode = false;
      gesture = { k: 'pinch', st: { cam: { ...camT }, a: { ...a }, b: { ...b } } };
      return;
    }
    const w = toWorld(cam, p.x, p.y);
    gesture = { k: 'press', uid: hit(w.x, w.y), sx: p.x, sy: p.y };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const p = pos(e);
    ptrs.set(e.pointerId, p);
    const g = gesture;
    if (!g) return;
    if (g.k === 'pinch') {
      const pts = [...ptrs.values()];
      if (pts.length >= 2) { const c = pinch(g.st, pts[0], pts[1], lims()); camT = clampCam(c, view, worldSize, lims()); cam = { ...camT }; markDirty(); }
      return;
    }
    if (g.k === 'press') {
      if (Math.hypot(p.x - g.sx, p.y - g.sy) < 8) return;
      if (g.uid !== null) startDrag(g.uid, p, e.pointerId);
      else { gesture = { k: 'pan', lx: g.sx, ly: g.sy }; }
      if (gesture?.k !== 'pan') return;
    }
    if (gesture?.k === 'pan') {
      fitMode = false;
      const dx = p.x - gesture.lx; const dy = p.y - gesture.ly;
      gesture.lx = p.x; gesture.ly = p.y;
      camT = clampCam({ ...camT, x: camT.x + dx, y: camT.y + dy }, view, worldSize, lims()); cam = { ...camT }; markDirty();
      return;
    }
    if (gesture?.k === 'drag' && drag) {
      const w = toWorld(cam, p.x, p.y);
      drag.finger = w; drag.target = targetFor(drag.uid, w, drag.off);
      hint = drag.target.check.ok ? '' : drag.target.check.reason;
      renderInfoOnly(); markDirty();
    }
  });
  const up = (e: PointerEvent, cancel: boolean) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    try { cv.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const g = gesture;
    if (g?.k === 'pinch') {
      if (ptrs.size === 1) { const [r] = [...ptrs.values()]; gesture = { k: 'pan', lx: r.x, ly: r.y }; } else if (ptrs.size === 0) gesture = null;
      else { const [a, b] = [...ptrs.values()]; gesture = { k: 'pinch', st: { cam: { ...camT }, a: { ...a }, b: { ...b } } }; }
      return;
    }
    if (ptrs.size > 0) return;
    gesture = null;
    if (g?.k === 'drag') { endDrag(cancel); return; }
    if (cancel) { markDirty(); return; }
    if (g?.k === 'press') {
      if (g.uid !== null) { audio.play('pop1'); haptic('select'); select(g.uid === sel ? sel : g.uid); addAnim(g.uid, 'pop'); ensureVisible(g.uid); }
      else if (sel !== null) select(null);
    }
    markDirty();
  };
  cv.addEventListener('pointerup', (e) => up(e, false));
  cv.addEventListener('pointercancel', (e) => up(e, true));
  // molette / trackpad (ordinateur)
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = pos(e as unknown as PointerEvent);
    fitMode = false;
    camT = clampCam(zoomAbout(camT, p.x, p.y, camT.s * Math.exp(-(e as WheelEvent).deltaY * 0.0015), lims()), view, worldSize, lims());
    markDirty();
  }, { passive: false });

  // ---- panneau coulissant
  function setStop(s: 0 | 1 | 2) {
    stop = s;
    sheet.style.height = `${stopH(s)}px`;
    sheet.classList.toggle('open', s === 2); sheet.classList.toggle('peek', s === 1);
    handle.setAttribute('aria-expanded', String(s > 0));
    if (s > 0 && panel === 'none') { panel = 'shop'; renderSheet(); }
  }
  let hDrag: { y0: number; h0: number; t0: number } | null = null;
  handle.addEventListener('pointerdown', (e) => {
    hDrag = { y0: e.clientY, h0: stopH(stop), t0: performance.now() };
    try { handle.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    sheet.classList.add('drag');
  });
  handle.addEventListener('pointermove', (e) => {
    if (!hDrag) return;
    const hh = Math.max(0, Math.min(openH(), hDrag.h0 + (hDrag.y0 - e.clientY)));
    sheet.style.height = `${hh}px`;
    if (hh > 0 && panel === 'none') { panel = 'shop'; renderSheet(); }
  });
  const endH = (e: PointerEvent) => {
    if (!hDrag) return;
    const d = hDrag; hDrag = null;
    sheet.classList.remove('drag');
    const moved = Math.abs(e.clientY - d.y0);
    if (moved < 6) { setStop(stop === 0 ? 2 : 0); return; } // simple toucher : ouvre / ferme
    const cur = parseFloat(sheet.style.height) || 0;
    const vel = (d.y0 - e.clientY) / Math.max(1, performance.now() - d.t0); // px/ms (haut > 0)
    const target = cur + vel * 140;
    const stops = [0, stopH(1), openH()];
    let best = 0; for (let i = 1; i < 3; i++) if (Math.abs(stops[i] - target) < Math.abs(stops[best] - target)) best = i;
    setStop(best as 0 | 1 | 2);
  };
  handle.addEventListener('pointerup', endH);
  handle.addEventListener('pointercancel', endH);

  // ---- barre d'info + actions
  const btn = (label: string, ic: string, fn: () => void, cls = '') => h(`button.dc2-btn${cls}`, { 'aria-label': label, on: { click: tap(fn, { sound: false }) } }, icon(ic, 22), h('span', label));

  function renderInfoOnly() {
    const it = selItem();
    info.textContent = '';
    info.className = 'dc2-info';
    if (it) {
      const f = furnitureOf(it.id)!;
      const need = draft.free(it.id) < 0;
      const t = drag?.target;
      info.append(h('b', f.name), h('span', `${PLACE_LABEL[f.place === 'surface' && it.on === undefined ? 'floor' : f.place]}`));
      if (need) info.append(h('span.dc2-price', coin(), String(f.price)));
      else if (draft.isNew(it.uid)) info.append(h('span.dc2-tag', 'en réserve'));
      if (t && !t.check.ok) { info.classList.add('bad'); info.append(h('em', t.check.reason)); }
      else if (hint) { info.classList.add('bad'); info.append(h('em', hint)); }
      else if (t && t.check.ok) { info.classList.add('good'); info.append(h('em', 'Place valide')); }
    } else if (draft.dirty()) {
      info.append(h('b', 'Modifications non enregistrées'), h('span', 'Valide pour les garder'));
    } else {
      info.append(h('span.dc2-soft', hint || 'Touche un meuble · pince pour zoomer'));
    }
  }
  function renderBar() {
    renderInfoOnly();
    actions.textContent = '';
    const it = selItem();
    const dirty = draft.dirty();
    if (it) {
      const f = furnitureOf(it.id)!;
      const rotOk = canRotate(f);
      const fresh = draft.isNew(it.uid);
      actions.append(
        btn(f.orient === 'mirror' ? 'Retourner' : 'Tourner', 'refresh', rotate, rotOk ? '' : '.dim'),
        btn(fresh ? 'Retirer' : 'Ranger', 'basket', store),
        ...(f.variants.length > 1 ? [btn('Style', 'wand', cycleVariant)] : []),
        ...(f.colorable ? [btn('Couleur', 'flower', () => openColor('item'))] : []),
        btn('Annuler', 'close', cancelAll, '.cancel'),
        btn('Valider', 'check', validateAll, '.ok'));
    } else if (dirty) {
      actions.append(btn('Annuler', 'close', cancelAll, '.cancel'), btn('Valider', 'check', validateAll, '.ok'));
    } else {
      const reserve = reserveCount();
      actions.append(
        btn('Boutique', 'gift', () => openShop(), reserve ? '.badge' : ''),
        btn('Couleurs', 'flower', () => openColor(selItem() && furnitureOf(selItem()!.id)!.colorable ? 'item' : 'wall'), Object.keys(pend).length ? '.badge' : ''),
        ...(room === 'reception' ? [btn('Soirée', 'crown', organise)] : []),
        btn('Défaire', 'undo', undoLast, ops.undoDepth(room) ? '' : '.dim'));
      if (reserve) (actions.firstChild as HTMLElement).dataset.n = String(reserve);
    }
  }
  const reserveCount = () => furnitureForRoom(room).reduce((n, f) => n + Math.max(0, draft.free(f.id)), 0);

  // ---- actions sur le meuble
  function rotate() {
    const it = selItem(); if (!it) return;
    const r = draft.rotate(it.uid);
    if (!r.ok) { audio.play('invalid'); haptic('error'); hint = r.reason; addAnim(it.uid, 'shake'); renderBar(); return; }
    hint = ''; addAnim(it.uid, 'pop'); audio.play('pop2'); haptic('select'); ensureVisible(it.uid); renderBar(); markDirty();
  }
  function cycleVariant() {
    const it = selItem(); const f = it && furnitureOf(it.id); if (!it || !f || !f.variants.length) return;
    const i = f.variants.findIndex((v) => v.id === it.variant);
    const nxt = f.variants[(i + 1) % f.variants.length];
    draft.setVariant(it.uid, nxt.id); addAnim(it.uid, 'pop'); audio.play('pop1');
    ui.toast({ title: `${f.name} · ${nxt.name}`, icon: 'wand', ms: 1200 });
    renderBar(); markDirty();
  }
  function store() {
    const it = selItem(); if (!it) return;
    const f = furnitureOf(it.id)!; const c = centerWorld(it.uid);
    const fresh = draft.isNew(it.uid);
    const r = draft.remove(it.uid);
    if (!r.ok) return;
    burst(c.x, c.y, 8, ['#fff', PAL.lavande]);
    audio.play('pickup'); haptic('select');
    sel = null; hint = '';
    if (!fresh) ui.toast({ title: `${f.name} rangé`, sub: 'Valide pour l\'enregistrer · retrouve-le dans la Réserve', icon: 'check', ms: 2200 });
    renderBar(); renderSheet(); markDirty();
  }
  function cancelAll() {
    draft.reset(); sel = null; hint = ''; pend = {}; drag = null;
    audio.play('whoosh'); renderBar(); renderSheet(); markDirty();
  }
  function undoLast() {
    const r = ops.undo(cctx, room);
    if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason, icon: 'undo' }); return; }
    draft.reset(); sel = null; pend = {};
    audio.play('whoosh'); commitSave(); refreshCoins(); renderBar(); renderSheet(); markDirty();
  }

  // ---- validation (et achat confirmé)
  async function validateAll() {
    if (!draft.dirty()) { select(null); return; }
    const chk = draft.check();
    if (!chk.ok) {
      audio.play('invalid'); haptic('error');
      const cost = draft.cost();
      ui.toast({ title: chk.reason, sub: chk.reason.includes('pièces') ? `Il manque ${fmt(Math.max(0, cost.coins - world().res.coins))} pièces` : undefined, icon: 'info' });
      hint = chk.reason; renderInfoOnly(); return;
    }
    const need = draft.toBuy(); const cost = draft.cost();
    let pay: CT.PayWith = 'coins';
    if (cost.coins > 0) {
      const ids = Object.keys(need);
      const gemOk = ids.every((id) => !!furnitureOf(id)?.gems) && wallet.diamonds() >= cost.gems;
      const rows = ids.map((id) => { const f = furnitureOf(id)!; return h('div.dc2-buy-row', h('img', { src: thumbUrl(f), alt: '' }), h('b', f.name), h('span', coin(), `${f.price * need[id]}`)); });
      const left = world().res.coins - cost.coins;
      const bodyEl = h('div.dc2-buy', ...rows, h('small', left >= 0 ? `Il te restera ${fmt(left)} pièces.` : `Il te manque ${fmt(-left)} pièces.`));
      const v = await ui.modal({
        title: ids.length > 1 ? 'Acheter ces objets ?' : 'Acheter cet objet ?', body: bodyEl,
        actions: [
          ...(left >= 0 ? [{ label: `Acheter · ${fmt(cost.coins)} pièces`, value: 'coins', style: 'gold' as const }] : []),
          ...(gemOk ? [{ label: `Payer en diamants · ${cost.gems}`, value: 'gems', style: 'lavande' as const }] : []),
          { label: left >= 0 ? 'Pas maintenant' : 'Compris', value: 'no', style: 'secondary' as const },
        ],
      });
      if (v !== 'coins' && v !== 'gems') return;
      pay = v;
    }
    const res = draft.commit(pay);
    if (!res.ok) { audio.play('invalid'); haptic('error'); ui.toast({ title: res.reason, icon: 'info' }); return; }
    afterCommit(res);
  }

  function afterCommit(res: CommitInfo & { ok: true }) {
    sel = null; hint = ''; drag = null;
    const cr = cv.getBoundingClientRect();
    for (const id of res.bought) { stat('world.castle.bought'); void id; }
    commitSave(); refreshCoins();
    const rareBest = { r: 'common' as ReturnType<typeof rarityForPrice>, uid: 0 };
    const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (const uid of res.placed) {
      const it = world().castle.rooms[room].items.find((i) => i.uid === uid); const f = it && furnitureOf(it.id); if (!it || !f) continue;
      stat('world.castle.placed');
      const c = centerWorld(uid, world().castle.rooms[room].items);
      addAnim(uid, 'drop'); burst(c.x, c.y);
      const s = toScreen(cam, c.x, c.y);
      const rar = rarityForPrice(f.price, f.gems ? 1 : 0);
      sparkleBurst(cr.left + s.x, cr.top + s.y, { rarity: rar, count: 12 });
      if (order.indexOf(rar) > order.indexOf(rareBest.r)) { rareBest.r = rar; rareBest.uid = uid; }
    }
    for (const uid of res.moved) addAnim(uid, 'pop');
    if (res.placed.length) {
      haptic('drop'); audio.play('drop'); window.setTimeout(() => audio.play('sparkle'), 140);
      const first = world().castle.rooms[room].items.find((i) => i.uid === res.placed[0]);
      softMoment('castle', 'Le château change de visage', 480_000, first ? { furniture: first.id } : undefined);
      reactAuguste('furniture', 0.22);
      // objet rare ou nouveau de prix élevé : un peu plus spectaculaire (halo + étoiles), jamais bloquant
      if (rareBest.uid && (rareBest.r === 'rare' || rareBest.r === 'epic' || rareBest.r === 'legendary')) {
        const c = centerWorld(rareBest.uid, world().castle.rooms[room].items); const s = toScreen(cam, c.x, c.y);
        const anchor = h('div.dc2-anchor', { style: `left:${cr.left + s.x}px;top:${cr.top + s.y}px` });
        ui.root.append(anchor);
        void revealItem(anchor, { rarity: rareBest.r, kind: 'furniture' });
        window.setTimeout(() => anchor.remove(), 3400);
        audio.play('chest');
      }
    } else if (res.moved.length) { audio.play('drop'); haptic('select'); }
    renderBar(); renderSheet(); markDirty();
    maybeFinale();
  }

  // ---- boutique
  function openShop() { panel = 'shop'; renderSheet(); setStop(2); }
  function addFromShop(def: FurnitureDef) {
    const r = draft.add(def.id);
    if (!r.ok) { audio.play('invalid'); haptic('error'); ui.toast({ title: r.reason, icon: 'info' }); return; }
    audio.play('pickup'); haptic('select');
    select(r.uid, true); addAnim(r.uid, 'pop'); ensureVisible(r.uid);
    hint = ''; renderSheet();
    if (!reducedFx()) { const c = centerWorld(r.uid); burst(c.x, c.y, 5, ['#fff', PAL.rose]); }
  }
  function renderSheet() {
    sheet.textContent = '';
    if (panel === 'shop') sheet.append(shopPanel());
    else if (panel === 'color') sheet.append(colorPanel());
    else sheet.append(h('p.dc2-empty', 'Touche « Boutique » ou « Couleurs » ♡'));
  }
  function shopPanel(): HTMLElement {
    const all = furnitureForRoom(room);
    const cats = SHOP_ORDER.filter((c) => all.some((f) => f.shop === c));
    const stockList = all.filter((f) => draft.free(f.id) > 0);
    if (shopTab === 'reserve' && !stockList.length) shopTab = cats[0];
    if (shopTab !== 'reserve' && !cats.includes(shopTab)) shopTab = cats[0];
    const stockN = stockList.reduce((n, f) => n + draft.free(f.id), 0);
    const tabs = h('div.dc2-tabs',
      ...(stockList.length ? [h(`button.dc2-tab${shopTab === 'reserve' ? '.on' : ''}`, { on: { click: tap(() => { shopTab = 'reserve'; renderSheet(); }, { sound: false }) } }, `Réserve (${stockN})`)] : []),
      ...cats.map((c) => h(`button.dc2-tab${shopTab === c ? '.on' : ''}`, { on: { click: tap(() => { shopTab = c; renderSheet(); }, { sound: false }) } }, SHOP_NAMES[c])));
    const shown = shopTab === 'reserve' ? stockList : all.filter((f) => f.shop === shopTab);
    const grid = h('div.dc2-grid');
    for (const f of shown) {
      const free = draft.free(f.id); const owned = draft.owned(f.id);
      const poor = free <= 0 && world().res.coins < f.price;
      const sub = free > 0 ? h('span.dc2-tag', `En réserve ×${free}`) : owned > 0 ? h('span.dc2-tag.dim', `Posé ×${owned}`) : null;
      grid.append(h(`button.dc2-card${poor ? '.poor' : ''}`, { 'aria-label': `${f.name}${free > 0 ? ', en réserve' : `, ${f.price} pièces`}`, on: { click: tap(() => addFromShop(f), { sound: false }) } },
        h('div.dc2-thumb', h('img', { src: thumbUrl(f), alt: '' })),
        h('b', f.name),
        h('small', PLACE_LABEL[f.place]),
        free > 0 ? sub : h('span.dc2-cost', coin(), String(f.price), f.gems ? h('i', h('img', { src: diamondUrl(32), alt: '' }), String(f.gems)) : null),
        free <= 0 ? sub : null));
    }
    if (!shown.length) grid.append(h('p.dc2-empty', 'Rien en réserve pour l\'instant ♡'));
    return h('div.dc2-shop', tabs, grid);
  }

  // ---- couleurs
  function openColor(target: ColorTarget | 'item') {
    if (target === 'item' && !(selItem() && furnitureOf(selItem()!.id)!.colorable)) target = 'wall';
    colorTarget = target; panel = 'color'; renderSheet(); setStop(1);
    renderBar();
  }
  function colorPanel(): HTMLElement {
    const it = selItem(); const f = it ? furnitureOf(it.id) : null;
    const canItem = !!f?.colorable;
    const targets: { id: ColorTarget | 'item'; label: string }[] = [
      { id: 'wall', label: rdef.wallLabel }, { id: 'floor', label: rdef.floorLabel }, { id: 'curtain', label: rdef.curtainLabel },
      ...(canItem ? [{ id: 'item' as const, label: 'Meuble' }] : []),
    ];
    if (colorTarget === 'item' && !canItem) colorTarget = 'wall';
    const current = (): string => colorTarget === 'item' ? (pend.item ?? it!.color) : (pend[colorTarget] ?? world().castle.rooms[room][colorTarget]);
    const seg = h('div.seg.cs-seg', ...targets.map((t) => h(`button${colorTarget === t.id ? '.on' : ''}`, { on: { click: tap(() => { colorTarget = t.id; renderSheet(); }, { sound: false }) } }, t.label)));
    const sw = h('div.dc2-swatches');
    const options: string[] = colorTarget === 'item' ? optionsFor('curtain') : optionsFor(colorTarget);
    for (const id of options) {
      sw.append(h(`button.cs-sw${current() === id ? '.on' : ''}`, {
        'aria-label': PALETTE.find((p) => p.id === id)?.name ?? id, style: `background:${colorOf(id)}`,
        on: { click: tap(() => { pend[colorTarget] = id; audio.play('pop1'); markDirty(); if (colorTarget === 'item' && it) addAnim(it.uid, 'pop'); renderSheet(); renderBar(); }, { sound: false }) },
      }));
    }
    if (colorTarget === 'item' && it?.id === 'painting') {
      for (const m of world().magazines) {
        if (!(m in MAGAZINE_NAMES)) continue;
        const v = `mag:${m}`;
        sw.append(h(`button.cs-sw.mag${current() === v ? '.on' : ''}`, { 'aria-label': MAGAZINE_NAMES[m as MagazineId], on: { click: tap(() => { pend.item = v; audio.play('pop1'); markDirty(); addAnim(it.uid, 'pop'); renderSheet(); }, { sound: false }) } }, h('img', { src: magUrl(m as MagazineId), alt: '' })));
      }
    }
    const changed = Object.keys(pend).length > 0;
    return h('div.dc2-color',
      h('div.dc2-color-head', h('b', 'Couleurs'), h('small', 'Aperçu immédiat · rien n\'est gardé avant « Valider »')),
      seg, sw,
      h('div.dc2-color-foot',
        h('button.btn.secondary', { on: { click: tap(() => { pend = {}; markDirty(); closePanel(); }) } }, 'Annuler'),
        h(`button.btn${changed ? '' : '.locked'}`, { on: { click: tap(() => validateColors(), { sound: false }) } }, 'Valider')));
  }
  function closePanel() { panel = 'none'; setStop(0); renderBar(); }
  function validateColors() {
    const it = selItem();
    if (pend.item !== undefined && it) { draft.setColor(it.uid, pend.item); }
    const rc = ops.applyColors(cctx, room, { wall: pend.wall, floor: pend.floor, curtain: pend.curtain });
    const n = rc.ok ? rc.changed : 0;
    if (!rc.ok) { audio.play('invalid'); ui.toast({ title: rc.reason, icon: 'info' }); return; }
    const itemChanged = pend.item !== undefined;
    pend = {};
    if (!n && !itemChanged) { closePanel(); return; }
    for (let i = 0; i < n + (itemChanged ? 1 : 0); i++) stat('world.castle.recolored');
    audio.play('sparkle'); haptic('select');
    burst(G.W / 2, G.H * 0.3, 12, [PAL.rose, '#fff', PAL.or]);
    commitSave();
    if (itemChanged && Object.keys(draft.toBuy()).length === 0 && draft.check().ok) { const r = draft.commit(); if (r.ok) { for (const uid of r.moved) addAnim(uid, 'pop'); } }
    panel = 'none'; setStop(0); renderBar(); renderSheet(); markDirty();
    reactAuguste('color', 0.3);
  }

  // ---- soirée de réception
  let eventTimer = 0;
  const statusText = (s: CT.EventState): string => (s.ready ? 'Les invités n\'attendent que toi ♡' : s.remainingMs > 0 && s.furniture >= CT.EVENT_MIN_FURNITURE ? `Prochaine soirée dans ${fmtTime(s.remainingMs)}` : s.reason);
  async function organise() {
    const s = CT.eventState(world(), Date.now());
    if (!s.ready) { audio.play('invalid'); ui.toast({ title: statusText(s), sub: s.furniture < CT.EVENT_MIN_FURNITURE ? `${s.furniture}/${CT.EVENT_MIN_FURNITURE} meubles` : undefined, icon: 'crown' }); return; }
    audio.play('button');
    const ok = await ui.confirm('Organiser une soirée ?', `Coût : ${CT.EVENT_COST.coins} pièces + ${CT.EVENT_COST.flowers} fleurs. Plus la salle est belle, plus les invités sont nombreux.`, 'Organiser', 'Pas maintenant');
    if (!ok) return;
    const r = CT.runEvent(cctx, Date.now());
    if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason, icon: 'info' }); return; }
    commitSave();
    stat('world.castle.event');
    const { fans, hearts, coins } = r.reward;
    const fr = addFans(fans);
    addHearts(hearts);
    addRes('coins', coins);
    audio.play('victory'); window.setTimeout(() => audio.play('heart'), 300);
    for (let i = 0; i < 4; i++) window.setTimeout(() => burst(G.W * (0.2 + Math.random() * 0.6), G.H * (0.3 + Math.random() * 0.3), 14), i * 160);
    refreshCoins();
    await ui.modal({
      title: 'Quelle soirée !',
      body: h('div.cs-party', h('p', 'Les invités ont adoré ton château ♡'),
        h('div.cs-party-row', h('span.chip', icon('star', 16), h('b', `+${fmt(fans)} fans`)), h('span.chip', icon('heart', 16), h('b', `+${hearts}`)), h('span.chip', coin(), h('b', `+${coins}`)))),
      actions: [{ label: 'Merci ♡', value: 'ok', style: 'gold' }],
    });
    if (fr.newTiers.length) reactAuguste('fansTier', 1, true); else reactAuguste('event', 0.8);
  }
  eventTimer = 0;

  // ---- enregistrement automatique (sortie de la pièce, Safari en arrière-plan)
  function autoSave(): boolean {
    if (!draft.dirty()) return true;
    if (Object.keys(draft.toBuy()).length > 0) return false; // un achat ne se fait jamais sans confirmation
    const r = draft.commit();
    if (r.ok) { commitSave(); return true; }
    return false;
  }
  function leave() {
    const had = draft.dirty();
    const ok = autoSave();
    if (had && !ok) ui.toast({ title: 'Achat non confirmé', sub: 'Rien n\'a été payé', icon: 'info', ms: 2200 });
    back();
  }
  const onHide = () => { if (document.visibilityState === 'hidden') autoSave(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onHide);

  // ---- point d'accès de test (mode ?debug uniquement) : coordonnées écran d'un point de la pièce
  const dbgHost = (window as unknown as { RADIA?: Record<string, unknown> }).RADIA;
  if (dbgHost) {
    const toClient = (wx: number, wy: number) => { const r = cv.getBoundingClientRect(); const p = toScreen(cam, wx, wy); return { x: r.left + p.x, y: r.top + p.y }; };
    dbgHost.decor = {
      floor: (cx: number, cy: number) => toClient(G.grid.x + cx * G.cell, G.grid.y + cy * G.cell),
      wall: (cx: number, cy: number) => toClient(G.grid.x + cx * G.cell, cy * G.cell),
      sel: () => sel, cam: () => ({ ...cam }), items: () => draft.items.map((i) => ({ ...i })), dirty: () => draft.dirty(),
      itemCenter: (uid: number) => { const c = centerWorld(uid); return toClient(c.x, c.y); },
    };
  }

  // ---- départ
  const offEco = events.on('economy', refreshCoins);
  renderBar(); renderSheet(); setStop(0);
  window.setTimeout(onResize, 0);
  if (firstTime('tip.castle.room2')) window.setTimeout(() => ui.toast({ title: 'Décore ta pièce ♡', sub: 'Touche un meuble, glisse-le · pince pour zoomer · glisse le fond pour te déplacer', icon: 'sparkle', ms: 5200 }), 600);
  maybeFinale();
  return [head, body, () => {
    cancelAnimationFrame(raf); ro.disconnect(); offEco(); clearInterval(eventTimer);
    if (dbgHost) delete dbgHost.decor;
    document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onHide);
    ops.clearUndo(); CT.clearUndo();
  }];
}
