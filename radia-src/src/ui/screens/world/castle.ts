/**
 * Le château de Radia : carte du château (pièces cliquables, verrous, aile
 * familiale), vue d'une pièce (placement tactile, glisser-déposer, couleurs),
 * boutique de meubles, soirée de réception, scène finale des chambres.
 * Les règles sont dans src/game/world/castle.ts (pures, testées).
 */
import '../../styles/world-castle.css';
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { save, audio, events, reducedFx } from '../../../core/app';
import { addHearts, stat } from '../../../core/progress';
import { wallet, fmt, fmtTime } from '../../../core/wallet';
import { addFans, addRes, firstTime } from '../../../core/world';
import { kidName } from '../../../core/family';
import { reactAuguste } from '../../../game/world/auguste';
import * as CT from '../../../game/world/castle';
import { ROOM_IDS, PALETTE, colorOf, MAGAZINE_NAMES, type RoomId, type FurnitureId, type MagazineId } from '../../../data/world/ids';
import { FURNITURE, CAT_NAMES, CAT_ORDER, furnitureOf, furnitureForRoom, type FurnitureDef, type FurnitureCat } from '../../../data/world/furniture';
import { ROOMS, roomName, isKidRoom, optionsFor, type ColorTarget } from '../../../data/world/rooms';
import { drawFurniture } from '../../../game/art/world/furniture';
import { drawRoom, drawCastle, castleHotspots, roomLayout, roomZoneAt, type RoomStyle } from '../../../game/art/world/rooms';
import { drawMagazine } from '../../../game/art/world/careers';
import { canvasUrl, paint, heartPath, sparkle, PAL, shade } from '../../../game/art/kit';
import { diamondUrl } from '../shop';
import { setBackdrop } from '../../../game/scenes/backdrop';

const world = () => save.data.world;
const cctx: CT.CastleCtx = {
  get world() { return save.data.world; },
  diamonds: { get: () => wallet.diamonds(), spend: (n) => wallet.spendDiamonds(n) },
};
const commit = () => { save.save(); events.emit('economy', undefined); };
const dprOf = () => Math.min(2, window.devicePixelRatio || 1);

const SHORT: Record<RoomId, string> = { bedroom: 'Chambre', salon: 'Salon', dressing: 'Dressing', reception: 'Réception', garden: 'Jardin', familySalon: 'Salon familial', kid1: '', kid2: '', kid3: '' };
const shortName = (r: RoomId): string => (isKidRoom(r) ? kidName(r) : SHORT[r]);
const MAP_RATIO = 361 / 520;

const furnUrl = (id: FurnitureId, color: string, size = 44) => canvasUrl(`cs:f:${id}:${color}:${size}`, () => {
  const f = FURNITURE[id];
  return paint(f.w * size, f.h * size, 2, (c) => drawFurniture(c, id, f.w * size, f.h * size, color.startsWith('mag:') ? color : colorOf(color)));
});
const magUrl = (id: MagazineId) => canvasUrl(`cs:mag:${id}`, () => paint(40, 54, 2, (c) => drawMagazine(c, id, 40, 54)));
const coinUrl = () => canvasUrl('cs:coin', () => paint(24, 24, 2, (c) => {
  c.beginPath(); c.arc(12, 12, 10, 0, 7); c.fillStyle = PAL.or; c.fill(); c.lineWidth = 2; c.strokeStyle = PAL.choco; c.stroke();
  c.beginPath(); c.arc(12, 12, 6, 0, 7); c.strokeStyle = PAL.orDeep; c.lineWidth = 1.6; c.stroke();
  heartPath(c, 12, 12, 7); c.fillStyle = shade(PAL.or, 0.5); c.fill();
}));
const coin = () => h('img.cs-coin', { src: coinUrl(), alt: '' });
const hexRgb = (hx: string): number[] => { const n = parseInt(hx.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (v: number[]) => '#' + v.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');

// ------------------------------------------------------------------ point d'entrée

export function openCastle(room?: RoomId): Promise<void> {
  return new Promise((resolve) => {
    setBackdrop('monde');
    CT.normalizeCastle(world());
    CT.clearUndo();
    commit();
    const direct = !!room && ROOM_IDS.includes(room) && CT.isUnlocked(world(), room);
    const scr = h('div.bg-soft.cs-screen');
    ui.showScreen(scr);
    let teardown: (() => void) | null = null;
    let closed = false;
    const leave = () => { if (closed) return; closed = true; teardown?.(); resolve(); };

    const show = (header: HTMLElement, body: HTMLElement, td: () => void) => {
      teardown?.();
      teardown = td;
      scr.replaceChildren(header, body);
    };
    const goMap = () => show(...mapView(scr, leave, goRoom));
    const goRoom = (r: RoomId, fromMap = true) => show(...roomView(r, fromMap ? goMap : leave));
    if (direct) goRoom(room!, false); else goMap();
  });
}

// ------------------------------------------------------------------ carte du château

function mapView(scr: HTMLElement, leave: () => void, goRoom: (r: RoomId) => void): [HTMLElement, HTMLElement, () => void] {
  const cv = h('canvas.cs-map-canvas');
  const hots = h('div.cs-hots');
  const box = h('div.cs-map-box', cv, hots);
  const wrap = h('div.cs-map-wrap', box);
  const coinChip = h('span.chip', coin(), h('b', fmt(world().res.coins)));
  const count = h('div.cs-map-foot');
  const head = ui.header('Le château', leave, coinChip);
  const body = h('div.cs-map', wrap, count);

  const unlocked = () => new Set<string>(world().castle.unlocked);
  const pct = castleHotspots(100, 100);

  const build = () => {
    hots.textContent = '';
    for (const hs of pct) {
      const open = CT.isUnlocked(world(), hs.room);
      const rooms = ROOMS[hs.room];
      const tag = open
        ? h('span.cs-tag', shortName(hs.room), CT.roomItems(world(), hs.room).length ? h('i', String(CT.roomItems(world(), hs.room).length)) : null)
        : h('span.cs-tag.locked', icon('lock', 13), h('b', String(rooms.cost)));
      const b = h(`button.cs-hot${open ? '' : '.locked'}`, {
        'aria-label': open ? `Visiter : ${roomName(hs.room)}` : `${roomName(hs.room)} verrouillée, ${rooms.cost} pièces`,
        style: `left:${hs.x}%;top:${hs.y}%;width:${hs.w}%;height:${hs.h}%`,
        on: { click: tap(() => (open ? (audio.play('page'), goRoom(hs.room)) : askUnlock(hs.room, b)), { sound: false }) },
      }, tag);
      hots.append(b);
    }
    (coinChip.lastChild as HTMLElement).textContent = fmt(world().res.coins);
    count.textContent = '';
    count.append(h('span', `${CT.unlockedCount(world())}/${ROOM_IDS.length} pièces`), h('small', 'Touche une fenêtre pour entrer ♡'));
  };

  async function askUnlock(r: RoomId, el: HTMLElement) {
    const cost = ROOMS[r].cost;
    audio.play('button');
    const have = world().res.coins;
    const body = h('div.cs-unlock',
      h('p', ROOMS[r].blurb),
      h('div.cs-unlock-price', coin(), h('b', `${cost} pièces`)),
      h('small', have >= cost ? `Il te restera ${fmt(have - cost)} pièces.` : `Il te manque ${fmt(cost - have)} pièces. Les fusions et les commandes en rapportent ♡`));
    const v = await ui.modal({
      title: roomName(r), body,
      actions: [have >= cost ? { label: 'Débloquer', value: 'y', style: 'gold' } : { label: 'Compris', value: 'n' }, ...(have >= cost ? [{ label: 'Plus tard', value: 'n', style: 'secondary' as const }] : [])],
    });
    if (v !== 'y') return;
    const res = CT.unlockRoom(cctx, r);
    if (!res.ok) { audio.play('invalid'); ui.toast({ title: res.reason, icon: 'lock' }); return; }
    commit();
    stat('world.castle.roomUnlocked');
    audio.play('chest'); window.setTimeout(() => audio.play('reward'), 160);
    burstDom(el, 18);
    build();
    const nb = hots.querySelector<HTMLElement>(`button:nth-child(${ROOM_IDS.indexOf(r) + 1})`);
    nb?.classList.add('unlocked-pop');
    ui.toast({ title: `${roomName(r)} débloquée`, sub: 'Touche la fenêtre pour y entrer', icon: 'sparkle' });
    reactAuguste('room', 0.5);
  }

  build();
  // taille de la carte : ajuste au plus grand rectangle de même proportion
  const fit = () => {
    const r = wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const w = Math.floor(Math.min(r.width, r.height * MAP_RATIO));
    box.style.width = `${w}px`; box.style.height = `${Math.floor(w / MAP_RATIO)}px`;
  };
  const ro = new ResizeObserver(fit);
  ro.observe(wrap);
  requestAnimationFrame(fit);
  let raf = 0; let last = 0;
  const loop = (t: number) => {
    raf = requestAnimationFrame(loop);
    if (t - last < 50) return;
    last = t;
    const w = Math.round(box.clientWidth); const hh = Math.round(box.clientHeight);
    if (!w) return;
    const d = dprOf();
    if (cv.width !== w * d || cv.height !== hh * d) { cv.width = w * d; cv.height = hh * d; }
    const c = cv.getContext('2d')!;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, w, hh);
    drawCastle(c, w, hh, unlocked(), reducedFx() ? 0 : t / 1000);
  };
  raf = requestAnimationFrame(loop);
  const off = events.on('economy', () => { (coinChip.lastChild as HTMLElement).textContent = fmt(world().res.coins); });
  void scr;
  if (firstTime('tip.castle')) window.setTimeout(() => ui.toast({ title: 'Ton château ♡', sub: 'Touche une fenêtre : débloque-la ou entre pour la décorer', icon: 'sparkle', ms: 4200 }), 500);
  maybeFinale();
  return [head, body, () => { cancelAnimationFrame(raf); ro.disconnect(); off(); }];
}

/** Petite pluie d'étincelles HTML autour d'un élément. */
function burstDom(el: HTMLElement, n = 14): void {
  if (reducedFx()) return;
  const r = el.getBoundingClientRect();
  const wrap = h('div.cs-dom-burst', { style: `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px` });
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4; const d = 40 + Math.random() * 70;
    const s = h('i');
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`); s.style.setProperty('--dy', `${Math.sin(a) * d - 20}px`);
    s.style.background = [PAL.roseVif, PAL.or, PAL.lavande, '#fff'][i % 4];
    wrap.append(s);
  }
  ui.root.append(wrap);
  window.setTimeout(() => wrap.remove(), 1000);
}

// ------------------------------------------------------------------ scène finale

function maybeFinale(): void {
  if (!CT.kidRoomsFurnished(world())) return;
  if (!firstTime('scene.castle')) return;
  const cv = h('canvas.cs-finale-canvas');
  const card = h('div.cs-finale-card',
    h('p', 'Chaque pièce de ce château a sa couleur. Mais ce sont les personnes qui y vivent qui lui donnent toute sa beauté.'),
    h('button.btn.gold', { on: { click: tap(() => { back.classList.add('out'); window.setTimeout(() => back.remove(), 400); reactAuguste('castleDone', 1, true); }) } }, 'Continuer'));
  const back = h('div.cs-finale', cv, card);
  ui.root.append(back);
  audio.play('victory');
  let raf = 0;
  const loop = (t: number) => {
    if (!back.isConnected) return;
    raf = requestAnimationFrame(loop);
    const w = Math.round(back.clientWidth); const hh = Math.round(back.clientHeight);
    const d = dprOf();
    if (cv.width !== w * d || cv.height !== hh * d) { cv.width = w * d; cv.height = hh * d; }
    const c = cv.getContext('2d')!; c.setTransform(d, 0, 0, d, 0, 0);
    drawCastle(c, w, hh, new Set(ROOM_IDS), t / 1000);
  };
  raf = requestAnimationFrame(loop);
  void raf;
}

// ------------------------------------------------------------------ vue d'une pièce

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; kind: 0 | 1 | 2; col: string; s: number }
interface Anim { uid: number; t0: number; kind: 'drop' | 'pop' | 'shake' }
type Dock = 'tools' | 'shop' | 'color';

function roomView(room: RoomId, back: () => void): [HTMLElement, HTMLElement, () => void] {
  const rdef = ROOMS[room];
  let sel: number | null = null;
  let moveMode = false;
  let dock: Dock = 'tools';
  let shopReplace: number | null = null;       // uid du meuble qu'on remplace
  let pendingMove: { uid: number; gx: number; gy: number } | null = null; // « Déplacer » (poser d'un toucher)
  let drag: { uid: number; offX: number; offY: number; px: number; py: number; gx: number; gy: number; ok: boolean; started: boolean; sx: number; sy: number } | null = null;
  let press: { uid: number | null; sx: number; sy: number; zone: 'wall' | 'floor' | 'curtain' } | null = null;
  const anims: Anim[] = [];
  const parts: Particle[] = [];
  let W = 0; let Hh = 0; let dpr = 1;
  let dirty = true;

  // style affiché (transition de teinte douce) et aperçu des couleurs
  const real = (): RoomStyle => ({ ...world().castle.rooms[room] }) as RoomStyle;
  let pend: Partial<Record<ColorTarget | 'item', string>> = {};
  const targetStyle = (): RoomStyle => { const r = real(); return { wall: pend.wall ?? r.wall, floor: pend.floor ?? r.floor, curtain: pend.curtain ?? r.curtain }; };
  const disp: Record<ColorTarget, number[]> = { wall: hexRgb(colorOf(real().wall)), floor: hexRgb(colorOf(real().floor)), curtain: hexRgb(colorOf(real().curtain)) };

  // ---- DOM
  const cv = h('canvas.cs-canvas');
  const selHost = h('div.cs-sel-host');
  const stage = h('div.cs-stage', cv, selHost);
  const dockEl = h('div.cs-dock');
  const coinChip = h('span.chip', coin(), h('b', fmt(world().res.coins)));
  const head = ui.header(roomName(room), back, coinChip);
  const body = h('div.cs-room', stage, dockEl);

  const items = () => CT.roomItems(world(), room);
  const lay = () => roomLayout(room, W, Hh);
  const rectOf = (it: { id: string; x: number; y: number }) => { const L = lay(); const f = furnitureOf(it.id)!; return { x: L.grid.x + it.x * L.cell, y: L.grid.y + it.y * L.cell, w: f.w * L.cell, h: f.h * L.cell }; };
  const selItem = () => (sel === null ? undefined : CT.itemById(world(), room, sel));

  // ---- sprites
  const sprites = new Map<string, HTMLCanvasElement>();
  const sprite = (id: FurnitureId, color: string, cell: number): HTMLCanvasElement => {
    const key = `${id}|${color}|${Math.round(cell)}|${dpr}`;
    let s = sprites.get(key);
    if (!s) {
      const f = FURNITURE[id];
      s = paint(f.w * cell, f.h * cell, dpr, (c) => drawFurniture(c, id, f.w * cell, f.h * cell, color.startsWith('mag:') ? color : colorOf(color)));
      if (sprites.size > 160) sprites.delete(sprites.keys().next().value as string);
      sprites.set(key, s);
    }
    return s;
  };

  // ---- effets
  const burst = (x: number, y: number, n = 14, cols: string[] = [PAL.roseVif, PAL.or, PAL.lavande, '#fff']) => {
    if (reducedFx()) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2; const sp = 40 + Math.random() * 110;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, life: 0, max: 0.7 + Math.random() * 0.5, kind: (i % 3) as 0 | 1 | 2, col: cols[i % cols.length], s: 3 + Math.random() * 4 });
    }
    dirty = true;
  };
  const animFor = (uid: number) => anims.find((a) => a.uid === uid);
  const addAnim = (uid: number, kind: Anim['kind']) => { anims.splice(0, anims.length, ...anims.filter((a) => a.uid !== uid)); anims.push({ uid, t0: performance.now(), kind }); dirty = true; };

  // ---- rendu
  const resize = () => {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = dprOf();
    W = Math.round(r.width); Hh = Math.round(r.height);
    if (cv.width !== W * dpr || cv.height !== Hh * dpr) { cv.width = W * dpr; cv.height = Hh * dpr; }
    dirty = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  let last = performance.now(); let lastDraw = 0; let raf = 0;
  const frame = (nowMs: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (nowMs - last) / 1000); last = nowMs;
    if (!W) return;
    // transition de teinte
    const ts = targetStyle();
    let moving = false;
    for (const k of ['wall', 'floor', 'curtain'] as const) {
      const tg = hexRgb(colorOf(ts[k]));
      const f = 1 - Math.exp(-dt * 9);
      for (let i = 0; i < 3; i++) { const d = tg[i] - disp[k][i]; if (Math.abs(d) < 1.2) disp[k][i] = tg[i]; else { disp[k][i] += d * f; moving = true; } }
    }
    const active = !!drag?.started || parts.length > 0 || anims.length > 0 || moving || pendingMove !== null;
    const interval = active ? 0 : reducedFx() ? 400 : 50;
    if (!dirty && nowMs - lastDraw < interval) return;
    if (!active && !reducedFx() && nowMs - lastDraw < 50) return;
    lastDraw = nowMs; dirty = false;
    draw(nowMs, dt);
  };

  const draw = (nowMs: number, dt: number) => {
    const c = cv.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, Hh);
    const style = { wall: rgbHex(disp.wall), floor: rgbHex(disp.floor), curtain: rgbHex(disp.curtain) };
    drawRoom(c, room, W, Hh, style, reducedFx() ? 0 : nowMs / 1000);
    const L = lay();
    // grille
    const strong = moveMode || !!drag?.started || !!pendingMove;
    c.save();
    c.strokeStyle = strong ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.22)';
    c.lineWidth = strong ? 1.2 : 0.8;
    if (!strong) c.setLineDash([2, 5]);
    c.beginPath();
    for (let i = 0; i <= rdef.cols; i++) { c.moveTo(L.grid.x + i * L.cell, L.grid.y); c.lineTo(L.grid.x + i * L.cell, L.grid.y + L.grid.h); }
    for (let j = 0; j <= rdef.rows; j++) { c.moveTo(L.grid.x, L.grid.y + j * L.cell); c.lineTo(L.grid.x + L.grid.w, L.grid.y + j * L.cell); }
    c.stroke();
    c.restore();
    // meubles (tri par bord bas)
    const list = [...items()].sort((a, b) => (a.y + furnitureOf(a.id)!.h) - (b.y + furnitureOf(b.id)!.h) || a.x - b.x);
    for (const it of list) {
      const f = furnitureOf(it.id)!;
      const r = rectOf(it);
      const hidden = drag?.started && drag.uid === it.uid;
      const color = pend.item !== undefined && sel === it.uid ? pend.item : it.color;
      const a = animFor(it.uid);
      c.save();
      c.globalAlpha = hidden || (pendingMove?.uid === it.uid) ? 0.28 : 1;
      let oy = 0; let sx = 1; let sy = 1; let ox = 0;
      if (a) {
        const u = (nowMs - a.t0) / (a.kind === 'drop' ? 650 : a.kind === 'pop' ? 380 : 360);
        if (u >= 1) anims.splice(anims.indexOf(a), 1);
        else if (a.kind === 'drop') { oy = -Math.pow(1 - u, 3) * 46; sy = 1 + 0.2 * Math.sin(u * Math.PI * 3) * (1 - u); sx = 1 / sy; }
        else if (a.kind === 'pop') { sy = 1 + 0.16 * Math.sin(u * Math.PI * 2.4) * (1 - u); sx = 1 / sy; }
        else ox = Math.sin(u * Math.PI * 6) * 4 * (1 - u);
      }
      c.translate(r.x + r.w / 2 + ox, r.y + r.h + oy);
      c.scale(sx, sy);
      if (it.flip) c.scale(-1, 1);
      c.drawImage(sprite(f.id, color, L.cell), -r.w / 2, -r.h, r.w, r.h);
      c.restore();
    }
    // sélection
    const si = selItem();
    if (si && !(drag?.started)) {
      const r = rectOf(si);
      c.save();
      c.strokeStyle = PAL.roseVif; c.lineWidth = 2.2; c.setLineDash([6, 4]); c.lineDashOffset = -nowMs / 60;
      c.beginPath(); c.roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 8); c.stroke();
      c.setLineDash([]); c.fillStyle = PAL.roseVif;
      for (const [px, py] of [[r.x - 2, r.y - 2], [r.x + r.w + 2, r.y - 2], [r.x - 2, r.y + r.h + 2], [r.x + r.w + 2, r.y + r.h + 2]]) { c.beginPath(); c.arc(px, py, 3.4, 0, 7); c.fill(); }
      c.restore();
    }
    // aperçu de déplacement (glisser ou « Déplacer »)
    const ghost = drag?.started ? { uid: drag.uid, gx: drag.gx, gy: drag.gy, ok: drag.ok } : pendingMove ? { uid: pendingMove.uid, gx: pendingMove.gx, gy: pendingMove.gy, ok: CT.checkPlacement(world(), room, CT.itemById(world(), room, pendingMove.uid)!.id, pendingMove.gx, pendingMove.gy, pendingMove.uid).ok } : null;
    if (ghost) {
      const it = CT.itemById(world(), room, ghost.uid);
      if (it) {
        const f = furnitureOf(it.id)!;
        const gxp = L.grid.x + ghost.gx * L.cell; const gyp = L.grid.y + ghost.gy * L.cell;
        c.save();
        c.fillStyle = ghost.ok ? 'rgba(90,200,130,0.38)' : 'rgba(235,80,90,0.38)';
        c.strokeStyle = ghost.ok ? '#3FA866' : '#D9404C'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(gxp + 1, gyp + 1, f.w * L.cell - 2, f.h * L.cell - 2, 6); c.fill(); c.stroke();
        c.globalAlpha = 0.9;
        const dx = drag?.started ? drag.px - drag.offX : gxp; const dy = drag?.started ? drag.py - drag.offY - 6 : gyp;
        c.translate(dx + f.w * L.cell / 2, dy + f.h * L.cell / 2); if (it.flip) c.scale(-1, 1);
        c.drawImage(sprite(f.id, it.color, L.cell), -f.w * L.cell / 2, -f.h * L.cell / 2, f.w * L.cell, f.h * L.cell);
        c.restore();
      }
    }
    // particules
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt; if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt;
      const a = 1 - p.life / p.max;
      if (p.kind === 0) sparkle(c, p.x, p.y, p.s, p.col, a);
      else if (p.kind === 1) { c.save(); c.globalAlpha = a; heartPath(c, p.x, p.y, p.s * 2.2); c.fillStyle = p.col; c.fill(); c.restore(); }
      else { c.save(); c.globalAlpha = a; c.beginPath(); c.arc(p.x, p.y, p.s * 0.5, 0, 7); c.fillStyle = p.col; c.fill(); c.restore(); }
    }
  };
  raf = requestAnimationFrame(frame);

  // ---- sélection / actions
  const select = (uid: number | null) => { sel = uid; dirty = true; renderDock(); };
  const afterChange = () => { commit(); (coinChip.lastChild as HTMLElement).textContent = fmt(world().res.coins); dirty = true; renderDock(); };
  const centerOf = (uid: number) => { const it = CT.itemById(world(), room, uid); if (!it) return { x: W / 2, y: Hh / 2 }; const r = rectOf(it); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };

  const placeNew = (id: FurnitureId): boolean => {
    const spot = CT.findFreeSpot(world(), room, id);
    if (!spot) { audio.play('invalid'); ui.toast({ title: 'Plus de place ici', sub: 'Range un meuble pour en poser un autre', icon: 'info' }); return false; }
    const r = CT.placeFurniture(cctx, room, id, spot.x, spot.y);
    if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason, icon: 'info' }); return false; }
    stat('world.castle.placed');
    addAnim(r.uid, 'drop');
    const c = centerOf(r.uid); burst(c.x, c.y);
    audio.play('drop'); window.setTimeout(() => audio.play('sparkle'), 140);
    sel = r.uid;
    afterChange();
    reactAuguste('furniture', 0.22);
    maybeFinale();
    return true;
  };

  const doBuy = (def: FurnitureDef, pay: CT.PayWith) => {
    const r = CT.buyFurniture(cctx, def.id, pay);
    if (!r.ok) {
      audio.play('invalid');
      ui.toast({ title: r.reason, sub: pay === 'coins' ? `Il manque ${fmt(def.price - world().res.coins)} pièces` : undefined, icon: pay === 'gems' ? 'sparkle' : 'info' });
      return false;
    }
    stat('world.castle.bought');
    commit();
    audio.play('chest');
    if (shopReplace !== null) {
      const uid = shopReplace;
      const rr = CT.replaceFurniture(cctx, room, uid, def.id);
      if (rr.ok) { shopReplace = null; sel = rr.uid; addAnim(rr.uid, 'drop'); const c = centerOf(rr.uid); burst(c.x, c.y); stat('world.castle.placed'); closeDock(); afterChange(); return true; }
      ui.toast({ title: rr.reason, sub: 'Le meuble t\'attend dans la réserve', icon: 'info' });
      afterChange();
      return true;
    }
    placeNew(def.id);
    return true;
  };

  const store = () => {
    const it = selItem(); if (!it) return;
    const f = furnitureOf(it.id)!;
    const c = centerOf(it.uid);
    CT.storeItem(cctx, room, it.uid);
    burst(c.x, c.y, 8, ['#fff', PAL.lavande]);
    audio.play('pickup');
    sel = null;
    afterChange();
    ui.toast({ title: `${f.name} rangé`, sub: 'Retrouve-le dans la boutique › Réserve', icon: 'check' });
  };
  const flip = () => {
    const it = selItem(); if (!it) return;
    CT.flipItem(cctx, room, it.uid);
    addAnim(it.uid, 'pop'); audio.play('pop2');
    afterChange();
  };
  const undo = () => {
    const r = CT.undo(cctx, room);
    if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason, icon: 'undo' }); return; }
    if (sel !== null && !selItem()) sel = null;
    pend = {};
    audio.play('whoosh');
    afterChange();
  };

  // ---- pointeur
  const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const hit = (x: number, y: number): number | null => {
    const list = [...items()].sort((a, b) => (a.y + furnitureOf(a.id)!.h) - (b.y + furnitureOf(b.id)!.h) || a.x - b.x);
    for (let i = list.length - 1; i >= 0; i--) { const r = rectOf(list[i]); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return list[i].uid; }
    return null;
  };
  const cellFor = (it: { id: string }, px: number, py: number, offX: number, offY: number) => {
    const L = lay(); void it;
    return { gx: Math.round((px - offX - L.grid.x) / L.cell), gy: Math.round((py - offY - L.grid.y) / L.cell) };
  };
  const insideGrid = (x: number, y: number) => { const g = lay().grid; return x >= g.x - 4 && x <= g.x + g.w + 4 && y >= g.y - lay().cell * 0.9 && y <= g.y + g.h + 4; };

  cv.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    const p = pos(e);
    try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (pendingMove) {
      const it = CT.itemById(world(), room, pendingMove.uid)!; const f = furnitureOf(it.id)!; const L = lay();
      pendingMove.gx = Math.round((p.x - (f.w * L.cell) / 2 - L.grid.x) / L.cell); pendingMove.gy = Math.round((p.y - (f.h * L.cell) / 2 - L.grid.y) / L.cell);
      dirty = true; audio.play('move'); return;
    }
    const uid = hit(p.x, p.y);
    press = { uid, sx: p.x, sy: p.y, zone: roomZoneAt(room, W, Hh, p.x, p.y) };
    if (uid !== null) {
      const it = CT.itemById(world(), room, uid)!; const r = rectOf(it);
      drag = { uid, offX: p.x - r.x, offY: p.y - r.y, px: p.x, py: p.y, gx: it.x, gy: it.y, ok: true, started: false, sx: p.x, sy: p.y };
      if (moveMode) { select(uid); drag.started = true; audio.play('pickup'); dirty = true; }
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pos(e);
    drag.px = p.x; drag.py = p.y;
    if (!drag.started && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 7) { drag.started = true; select(drag.uid); audio.play('pickup'); }
    if (drag.started) {
      const it = CT.itemById(world(), room, drag.uid)!;
      const g = cellFor(it, p.x, p.y, drag.offX, drag.offY);
      drag.gx = g.gx; drag.gy = g.gy;
      drag.ok = CT.checkPlacement(world(), room, it.id, g.gx, g.gy, it.uid).ok;
      dirty = true;
    }
  });
  const finish = (e: PointerEvent, cancel: boolean) => {
    const d = drag; const pr = press;
    drag = null; press = null; dirty = true;
    try { cv.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (!pr) return;
    const p = pos(e);
    if (d?.started) {
      if (cancel || !insideGrid(p.x, p.y) || p.x < 0 || p.y < 0 || p.x > W || p.y > Hh) { audio.play('whoosh'); return; } // relâché hors de la grille : annulé
      if (!CT.itemById(world(), room, d.uid)) return;
      const r = CT.moveItem(cctx, room, d.uid, d.gx, d.gy);
      if (r.ok) {
        addAnim(d.uid, 'pop'); audio.play('drop'); { const c = centerOf(d.uid); burst(c.x, c.y + 8, 6, ['#fff', PAL.rose]); }
        afterChange();
      } else { addAnim(d.uid, 'shake'); audio.play('invalid'); }
      return;
    }
    if (cancel) return;
    // simple toucher
    if (pr.uid !== null) { audio.play('pop1'); select(pr.uid === sel ? sel : pr.uid); addAnim(pr.uid, 'pop'); return; }
    if (sel !== null) select(null);
    if (!moveMode) openColor(pr.zone);
  };
  cv.addEventListener('pointerup', (e) => finish(e, false));
  cv.addEventListener('pointercancel', (e) => finish(e, true));

  // ---- dock : outils / boutique / couleurs
  const btn = (label: string, ic: string, fn: () => void, cls = '') => h(`button.cs-tool${cls}`, { on: { click: tap(fn) } }, icon(ic, 20), h('span', label));

  function renderDock() {
    dockEl.textContent = '';
    selHost.textContent = '';
    if (dock === 'shop') { dockEl.append(shopSheet()); stageResizeSoon(); return; }
    if (dock === 'color') { dockEl.append(colorSheet()); stageResizeSoon(); return; }
    // outils
    if (room === 'reception') dockEl.append(eventBar());
    const it = selItem();
    if (pendingMove) {
      selHost.append(h('div.cs-sel', h('span.cs-hint', 'Touche la pièce pour choisir l\'endroit'),
        h('button.btn.small', { on: { click: tap(() => { const pm = pendingMove!; const r = CT.moveItem(cctx, room, pm.uid, pm.gx, pm.gy); if (r.ok) { pendingMove = null; addAnim(pm.uid, 'pop'); audio.play('drop'); afterChange(); } else { audio.play('invalid'); ui.toast({ title: r.reason, icon: 'info' }); } }, { sound: false }) } }, 'Poser ici'),
        h('button.btn.small.secondary', { on: { click: tap(() => { pendingMove = null; dirty = true; renderDock(); }) } }, 'Annuler')));
    } else if (it) {
      const f = furnitureOf(it.id)!;
      selHost.append(h('div.cs-sel',
        h('div.cs-sel-name', h('b', f.name), h('small', `${f.w}×${f.h}`)),
        h('div.cs-sel-btns',
          btn('Déplacer', 'play', () => { pendingMove = { uid: it.uid, gx: it.x, gy: it.y }; dirty = true; renderDock(); }),
          btn('Retourner', 'refresh', flip),
          btn('Couleur', 'flower', () => { if (!f.colorable) { ui.toast({ title: 'Ce meuble garde sa couleur', icon: 'info' }); return; } openColor('item'); }, f.colorable ? '' : '.dim'),
          btn('Ranger', 'basket', store),
          btn('Remplacer', 'wand', () => { shopReplace = it.uid; openShop(); }))));
    }
    const depth = CT.undoDepth(room);
    dockEl.append(h('div.cs-tools',
      btn('Boutique', 'gift', () => { shopReplace = null; openShop(); }),
      btn('Couleurs', 'flower', () => openColor(sel !== null && selItem() && furnitureOf(selItem()!.id)!.colorable ? 'item' : 'wall')),
      btn('Annuler', 'undo', undo, depth ? '' : '.dim'),
      btn('Déplacer', 'hint', () => { moveMode = !moveMode; dirty = true; audio.play('button'); renderDock(); }, moveMode ? '.on' : '')));
    stageResizeSoon();
  }
  const stageResizeSoon = () => requestAnimationFrame(resize);
  const closeDock = () => { dock = 'tools'; pend = {}; shopReplace = null; renderDock(); };
  function openShop() { dock = 'shop'; pendingMove = null; renderDock(); }
  function openColor(target: ColorTarget | 'item') {
    if (target === 'item' && !selItem()) target = 'wall';
    colorTarget = target; dock = 'color'; pendingMove = null; renderDock();
  }

  // ---- boutique
  let shopCat: FurnitureCat | 'reserve' = 'couchage';
  function shopSheet(): HTMLElement {
    const all = furnitureForRoom(room);
    const stockList = all.filter((f) => CT.stockCount(world(), f.id) > 0);
    const cats = CAT_ORDER.filter((c) => all.some((f) => f.cat === c));
    if (shopCat !== 'reserve' && !cats.includes(shopCat)) shopCat = cats[0];
    const tabs = h('div.cs-tabs',
      ...(stockList.length ? [h(`button.cs-tab${shopCat === 'reserve' ? '.on' : ''}`, { on: { click: tap(() => { shopCat = 'reserve'; renderDock(); }, { sound: false }) } }, `Réserve (${stockList.reduce((n, f) => n + CT.stockCount(world(), f.id), 0)})`)] : []),
      ...cats.map((c) => h(`button.cs-tab${shopCat === c ? '.on' : ''}`, { on: { click: tap(() => { shopCat = c; renderDock(); }, { sound: false }) } }, CAT_NAMES[c])));
    const shown = shopCat === 'reserve' ? stockList : all.filter((f) => f.cat === shopCat);
    const grid = h('div.cs-grid');
    for (const f of shown) {
      const stock = CT.stockCount(world(), f.id);
      const poor = world().res.coins < f.price;
      const act = shopReplace !== null ? 'Remplacer' : 'Poser';
      const buyBtn = h(`button.btn.small${poor ? '.locked' : ''}`, { on: { click: tap(() => doBuy(f, 'coins'), { sound: false }) } }, coin(), String(f.price));
      const gemBtn = f.gems ? h('button.btn.small.gold', { on: { click: tap(() => doBuy(f, 'gems'), { sound: false }) } }, h('img', { src: diamondUrl(32), alt: '' }), String(f.gems)) : null;
      const useBtn = stock > 0 ? h('button.btn.small.lavande', { on: { click: tap(() => {
        if (shopReplace !== null) { const r = CT.replaceFurniture(cctx, room, shopReplace, f.id); if (r.ok) { stat('world.castle.placed'); sel = r.uid; shopReplace = null; addAnim(r.uid, 'drop'); const c = centerOf(r.uid); burst(c.x, c.y); audio.play('drop'); closeDock(); afterChange(); } else { audio.play('invalid'); ui.toast({ title: r.reason, icon: 'info' }); } }
        else if (placeNew(f.id)) renderDock();
      }, { sound: false }) } }, act) : null;
      grid.append(h('div.cs-card',
        h('div.cs-thumb', h('img', { src: furnUrl(f.id, f.color), alt: f.name })),
        h('b', f.name),
        h('small', `${f.w}×${f.h}${stock ? ` · ${stock} en réserve` : ''}`),
        h('div.cs-card-btns', ...(shopCat === 'reserve' ? [useBtn] : [buyBtn, gemBtn, useBtn]))));
    }
    if (!shown.length) grid.append(h('p.cs-empty', 'Rien en réserve pour l\'instant ♡'));
    return h('div.cs-sheet',
      h('div.cs-sheet-head', h('b', shopReplace !== null ? 'Remplacer par…' : 'Boutique déco'), h('button.icon-btn.small', { 'aria-label': 'Fermer', on: { click: tap(closeDock) } }, icon('close', 20))),
      tabs, grid);
  }

  // ---- couleurs
  let colorTarget: ColorTarget | 'item' = 'wall';
  function colorSheet(): HTMLElement {
    const it = selItem();
    const f = it ? furnitureOf(it.id) : null;
    const canItem = !!f?.colorable;
    const targets: { id: ColorTarget | 'item'; label: string }[] = [
      { id: 'wall', label: rdef.wallLabel }, { id: 'floor', label: rdef.floorLabel }, { id: 'curtain', label: rdef.curtainLabel },
      ...(canItem ? [{ id: 'item' as const, label: 'Meuble' }] : []),
    ];
    if (colorTarget === 'item' && !canItem) colorTarget = 'wall';
    const current = (): string => colorTarget === 'item' ? (pend.item ?? it!.color) : (pend[colorTarget] ?? world().castle.rooms[room][colorTarget]);
    const seg = h('div.seg.cs-seg', ...targets.map((t) => h(`button${colorTarget === t.id ? '.on' : ''}`, { on: { click: tap(() => { colorTarget = t.id; renderDock(); }, { sound: false }) } }, t.label)));
    const sw = h('div.cs-swatches');
    const options: string[] = colorTarget === 'item' ? optionsFor('curtain') : optionsFor(colorTarget);
    for (const id of options) {
      const col = colorOf(id);
      sw.append(h(`button.cs-sw${current() === id ? '.on' : ''}`, {
        'aria-label': PALETTE.find((p) => p.id === id)?.name ?? id, style: `background:${col}`,
        on: { click: tap(() => { pend[colorTarget] = id; audio.play('pop1'); dirty = true; if (colorTarget === 'item') addAnim(it!.uid, 'pop'); renderDock(); }, { sound: false }) },
      }));
    }
    if (colorTarget === 'item' && it?.id === 'painting') {
      for (const m of world().magazines) {
        if (!(m in MAGAZINE_NAMES)) continue;
        const v = `mag:${m}`;
        sw.append(h(`button.cs-sw.mag${current() === v ? '.on' : ''}`, { 'aria-label': MAGAZINE_NAMES[m as MagazineId], on: { click: tap(() => { pend.item = v; audio.play('pop1'); dirty = true; addAnim(it.uid, 'pop'); renderDock(); }, { sound: false }) } }, h('img', { src: magUrl(m as MagazineId), alt: '' })));
      }
    }
    const changed = Object.keys(pend).length > 0;
    return h('div.cs-sheet.color',
      h('div.cs-sheet-head', h('b', 'Couleurs'), h('small', 'Touche un mur, le sol, un rideau ou un meuble')),
      seg, sw,
      h('div.cs-sheet-foot',
        h('button.btn.secondary', { on: { click: tap(() => { closeDock(); dirty = true; }) } }, 'Annuler'),
        h(`button.btn${changed ? '' : '.locked'}`, { on: { click: tap(() => validateColors(), { sound: false }) } }, 'Valider')));
  }
  function validateColors() {
    let n = 0;
    for (const k of ['wall', 'floor', 'curtain'] as const) {
      const v = pend[k];
      if (v !== undefined && v !== world().castle.rooms[room][k]) { const r = CT.setRoomColor(cctx, room, k, v); if (r.ok) n++; }
    }
    const it = selItem();
    if (pend.item !== undefined && it && pend.item !== it.color) { const r = CT.recolorItem(cctx, room, it.uid, pend.item); if (r.ok) { n++; addAnim(it.uid, 'pop'); } }
    if (!n) { closeDock(); return; }
    pend = {};
    for (let i = 0; i < n; i++) stat('world.castle.recolored');
    audio.play('sparkle');
    burst(W / 2, Hh * 0.35, 12, [PAL.rose, '#fff', PAL.or]);
    dock = 'tools';
    afterChange();
    reactAuguste('color', 0.3);
  }

  // ---- soirée de réception
  let eventTimer = 0;
  function eventBar(): HTMLElement {
    const s = CT.eventState(world(), Date.now());
    const sub = h('small', statusText(s));
    const b = h(`button.cs-event${s.ready ? '' : '.wait'}`, { on: { click: tap(organise, { sound: false }) } },
      h('span.cs-event-ic', icon('crown', 22)),
      h('span.cs-event-txt', h('b', 'Organiser une soirée'), sub),
      h('span.cs-event-cost', coin(), `${CT.EVENT_COST.coins}`, ' + ', icon('flower', 15), `${CT.EVENT_COST.flowers}`));
    clearInterval(eventTimer);
    eventTimer = window.setInterval(() => { sub.textContent = statusText(CT.eventState(world(), Date.now())); if (!b.isConnected) clearInterval(eventTimer); }, 1000);
    return b;
  }
  const statusText = (s: CT.EventState): string => (s.ready ? 'Les invités n\'attendent que toi ♡' : s.remainingMs > 0 && s.furniture >= CT.EVENT_MIN_FURNITURE ? `Prochaine soirée dans ${fmtTime(s.remainingMs)}` : s.reason);
  async function organise() {
    const s = CT.eventState(world(), Date.now());
    if (!s.ready) { audio.play('invalid'); ui.toast({ title: statusText(s), sub: s.furniture < CT.EVENT_MIN_FURNITURE ? `${s.furniture}/${CT.EVENT_MIN_FURNITURE} meubles` : undefined, icon: 'crown' }); return; }
    audio.play('button');
    const ok = await ui.confirm('Organiser une soirée ?', `Coût : ${CT.EVENT_COST.coins} pièces + ${CT.EVENT_COST.flowers} fleurs. Plus la salle est belle, plus les invités sont nombreux.`, 'Organiser', 'Pas maintenant');
    if (!ok) return;
    const r = CT.runEvent(cctx, Date.now());
    if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason, icon: 'info' }); return; }
    commit();
    stat('world.castle.event');
    const { fans, hearts, coins } = r.reward;
    const fr = addFans(fans);
    addHearts(hearts);
    addRes('coins', coins);
    audio.play('victory'); window.setTimeout(() => audio.play('heart'), 300);
    for (let i = 0; i < 4; i++) window.setTimeout(() => burst(W * (0.2 + Math.random() * 0.6), Hh * (0.3 + Math.random() * 0.3), 14), i * 160);
    (coinChip.lastChild as HTMLElement).textContent = fmt(world().res.coins);
    renderDock();
    await ui.modal({
      title: 'Quelle soirée !',
      body: h('div.cs-party', h('p', 'Les invités ont adoré ton château ♡'),
        h('div.cs-party-row', h('span.chip', icon('star', 16), h('b', `+${fmt(fans)} fans`)), h('span.chip', icon('heart', 16), h('b', `+${hearts}`)), h('span.chip', coin(), h('b', `+${coins}`)))),
      actions: [{ label: 'Merci ♡', value: 'ok', style: 'gold' }],
    });
    if (fr.newTiers.length) reactAuguste('fansTier', 1, true); else reactAuguste('event', 0.8);
  }

  // ---- départ
  renderDock();
  resize();
  const offEco = events.on('economy', () => { (coinChip.lastChild as HTMLElement).textContent = fmt(world().res.coins); });
  if (firstTime('tip.castle.room')) window.setTimeout(() => ui.toast({ title: 'Touche un meuble pour le choisir', sub: 'Fais-le glisser pour le déplacer ♡', icon: 'sparkle', ms: 4200 }), 600);
  maybeFinale();
  return [head, body, () => { cancelAnimationFrame(raf); ro.disconnect(); offEco(); clearInterval(eventTimer); CT.clearUndo(); }];
}
