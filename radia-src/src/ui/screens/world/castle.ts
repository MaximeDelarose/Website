/**
 * Le château de Radia : carte du château (pièces cliquables, verrous, aile familiale), scène finale des chambres.
 * La vue d'une pièce (mode décoration : caméra, glisser-déposer, catalogue rétractable, couleurs, soirée) est dans
 * ./castle/view.ts ; le placement (pur, testé) dans ./castle/placement.ts, ./castle/draft.ts, ./castle/migrate.ts.
 * Les règles économiques sont dans src/game/world/castle.ts (pures, testées).
 */
import { missingCoins } from '../../../data/world/prices';
import '../../styles/world-castle.css';
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { save, audio, events, reducedFx } from '../../../core/app';
import { stat } from '../../../core/progress';
import { wallet, fmt } from '../../../core/wallet';
import { firstTime } from '../../../core/world';
import { kidName } from '../../../core/family';
import { reactAuguste } from '../../../game/world/auguste';
import * as CT from '../../../game/world/castle';
import { ROOM_IDS, type RoomId } from '../../../data/world/ids';
import { ROOMS, roomName, isKidRoom } from '../../../data/world/rooms';
import { drawCastle, castleHotspots } from '../../../game/art/world/rooms';
import { canvasUrl, paint, heartPath, PAL, shade } from '../../../game/art/kit';
import { revealItem } from '../../fx/sparkle';
import { setBackdrop } from '../../../game/scenes/backdrop';
import { roomView } from './castle/view';
import { migrateCastle } from './castle/migrate';
import { clearUndo as clearDecorUndo } from './castle/ops';

const world = () => save.data.world;
const cctx: CT.CastleCtx = {
  get world() { return save.data.world; },
  diamonds: { get: () => wallet.diamonds(), spend: (n) => wallet.spendDiamonds(n) },
};
const commit = () => { save.save(); events.emit('economy', undefined); };
const dprOf = () => Math.min(2, window.devicePixelRatio || 1);

const SHORT: Record<RoomId, string> = { bedroom: 'Chambre', salon: 'Salon', dressing: 'Dressing', reception: 'Réception', garden: 'Jardin', familySalon: 'Salon familial', kid1: '', kid2: '', kid3: '' };
const shortName = (r: RoomId): string => (isKidRoom(r) ? kidName(r) : SHORT[r]);
const MAP_RATIO = 0.64;

const coinUrl = () => canvasUrl('cs:coin', () => paint(24, 24, 2, (c) => {
  c.beginPath(); c.arc(12, 12, 10, 0, 7); c.fillStyle = PAL.or; c.fill(); c.lineWidth = 2; c.strokeStyle = PAL.choco; c.stroke();
  c.beginPath(); c.arc(12, 12, 6, 0, 7); c.strokeStyle = PAL.orDeep; c.lineWidth = 1.6; c.stroke();
  heartPath(c, 12, 12, 7); c.fillStyle = shade(PAL.or, 0.5); c.fill();
}));
const coin = () => h('img.cs-coin', { src: coinUrl(), alt: '' });

// ------------------------------------------------------------------ point d'entrée

export function openCastle(room?: RoomId): Promise<void> {
  return new Promise((resolve) => {
    setBackdrop('monde');
    migrateCastle(world());
    CT.clearUndo(); clearDecorUndo();
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
    const goMap = () => { scr.classList.remove('dc2-screen'); show(...mapView(scr, leave, goRoom)); };
    const roomError = (r: RoomId, fromMap: boolean) => {
      scr.classList.remove('dc2-screen');
      const hd = ui.header('Oups…', () => (fromMap ? goMap() : leave()));
      const retry = h('button.btn', { on: { click: tap(() => goRoom(r, fromMap)) } }, 'Réessayer');
      const home = h('button.btn.secondary', { on: { click: tap(() => leave()) } }, 'Retour à MON MONDE');
      const bd = h('div.dc2-error', h('h3', 'Cette pièce n’a pas pu s’afficher'), h('p', 'Rien n’est perdu : tes meubles et ta sauvegarde sont intacts.'), retry, home);
      show(hd, bd, () => undefined);
    };
    const goRoom = (r: RoomId, fromMap = true) => {
      scr.classList.add('dc2-screen');
      try { show(...roomView(r, fromMap ? goMap : leave, maybeFinale, () => roomError(r, fromMap))); }
      catch (e) { try { console.error('[castle] ouverture de pièce', e); } catch { /* ignore */ } roomError(r, fromMap); }
    };
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
    hots.append(h('span.cs-wing', 'Aile familiale ♡'));
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
      h('small', have >= cost ? `Il te restera ${fmt(have - cost)} pièces.` : `${missingCoins(cost - have)}. Les commandes du mode libre en rapportent ♡`));
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
    void revealItem(el, { rarity: 'epic', kind: 'building' }); // révélation + confettis
    build();
    const nb = hots.querySelectorAll<HTMLElement>('button')[ROOM_IDS.indexOf(r)];
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

