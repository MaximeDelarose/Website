/**
 * Hub « MON MONDE » : le domaine de Radia. En haut le château (illustration vivante, progression
 * réelle, bouton ENTRER), dessous sept cartes illustrées (dressing, jardin, chocolaterie, famille,
 * chat, carrière, fans) dont les messages viennent de l'état réel (voir hub/state.ts).
 * Chaque destination est chargée à la demande et s'ouvre exactement comme avant.
 */
import { attachResourceInfo } from '../../components/resourceInfo';
import type { ResInfoId } from '../../../data/resourceInfo';
import '../../styles/world-hub.css';
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { save, audio, events, reducedFx } from '../../../core/app';
import { isFreeModeUnlocked } from '../../../core/freeMode';
import { fmt, wallet } from '../../../core/wallet';
import { world, firstTime } from '../../../core/world';
import { haptic } from '../../../core/haptics';
import { RES_NAMES, ROOM_IDS, type ResKind } from '../../../data/world/ids';
import { phoneButton } from '../../../events/scheduler';
import { ev } from '../../../events/api';
import { pendingInvites, unreadCount } from '../../../events/manager';
import { onPhoneChange } from '../../../events/bus';
import { canClaimToday, showDaily } from '../../../daily';
import { wheelReady } from '../../../wheel';
import { onDailyChange } from '../../../daily/state';
import { lookKey } from '../../../game/art/world/radiaNow';
import { resIconUrl } from '../../../game/art/world/resources';
import { diamondUrl } from '../shop';
import { setBackdrop } from '../../../game/scenes/backdrop';
import { augusteSays } from '../../components/augusteSays';
import { sparkleBurst } from '../../fx/sparkle';
import { hubStatus, statusKey, BADGE_LABEL, ensureDressingBaseline, markDressingSeen, unlockedRooms, type HubId, type HubStatus } from './hub/state';
import { domainStatus, openDomainMap } from '../../../domain';
import { panoramaCanvas } from '../../../domain/art';
import { heroCanvas, dressingArt, gardenArt, chocArt, familyArt, catArt, careerArt, fansArt, catWalkCanvas, readyFlower, bloomCanvas, gardenSig } from './hub/art';

interface Dest {
  id: Exclude<HubId, 'castle'>;
  tone: string;
  wide?: boolean;
  open: () => Promise<void>;
}

const mod = async <T>(p: Promise<T>): Promise<T> => p;

const CASTLE_OPEN = async (): Promise<void> => (await mod(import('./castle'))).openCastle();

const DESTS: Dest[] = [
  { id: 'dressing', tone: 'lavande', open: async () => { await (await mod(import('./dressing'))).openDressing(); markDressingSeen(world()); save.save(); } },
  { id: 'garden', tone: 'sage', open: async () => (await mod(import('./garden'))).openGarden() },
  { id: 'choc', tone: 'choc', open: async () => (await mod(import('./chocolaterie'))).openChocolaterie() },
  { id: 'family', tone: 'peach', open: async () => (await mod(import('./family'))).openFamily() },
  { id: 'cat', tone: 'cream', open: async () => (await mod(import('./cat'))).openCat() },
  { id: 'career', tone: 'gold', open: async () => (await mod(import('./career'))).openCareer() },
  { id: 'fans', tone: 'violet', wide: true, open: async () => (await mod(import('./fans'))).openFans() },
];

const L_free = (): boolean => isFreeModeUnlocked(save.data);
const RES: ResKind[] = ['coins', 'flowers', 'fabric', 'cocoa'];
/** Badges déjà montrés (d'une ouverture à l'autre) : les paillettes ne partent que sur une vraie nouveauté. */
const shownBadge: Partial<Record<HubId, string>> = {};

export function openWorldHub(): Promise<void> {
  return new Promise((resolve) => {
    setBackdrop('monde');
    ensureDressingBaseline(world());
    let alive = true;
    const calm = reducedFx();
    const chips = h('div.hub-res');
    const renderChips = () => {
      chips.textContent = '';
      for (const k of RES) {
        const rc = h('span.res-chip', { title: RES_NAMES[k] }, h('img', { src: resIconUrl(k, 40), alt: RES_NAMES[k] }), h('b', fmt(world().res[k])));
        attachResourceInfo(rc, k as ResInfoId); chips.append(rc);
      }
      const dc = h('span.res-chip', { title: 'Diamants' }, h('img', { src: diamondUrl(40), alt: 'Diamants' }), h('b', fmt(wallet.diamonds())));
      attachResourceInfo(dc, 'diamonds'); chips.append(dc);
    };
    let scr: HTMLElement;
    const reshow = () => {
      scr.classList.remove('leaving');
      scr.style.pointerEvents = '';
      if (ui.screen !== scr || !scr.isConnected) ui.showScreen(scr);
    };

    /** Rebond léger au toucher puis action. */
    const press = (el: HTMLElement, fn: () => void | Promise<void>) => {
      el.addEventListener('click', tap(() => {
        haptic('select');
        if (!calm) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
        void fn();
      }));
    };
    const goTo = (open: () => Promise<void>) => async () => {
      audio.play('whoosh');
      await open();
      reshow();
      renderChips();
      refresh(true);
      setBackdrop('monde');
    };

    // ------------------------------------------------------------------ héros : le château
    const stage = h('div.hub-stage');
    const heroSlot = h('div.hub-hero-art');
    stage.append(heroSlot);
    if (!calm) {
      for (let i = 0; i < 3; i++) stage.append(h(`i.hub-cloud.c${i}`));
      for (let i = 0; i < 6; i++) stage.append(h(`i.hub-twinkle.t${i}`));
      for (let i = 0; i < 4; i++) stage.append(h(`i.hub-twinkle.x.x${i}`));
      for (let i = 0; i < 5; i++) stage.append(h(`i.hub-drop.d${i}`));
      for (let i = 0; i < 5; i++) stage.append(h(`i.hub-fly.f${i}`));
      stage.append(h('i.hub-glowring'));
    } else {
      for (let i = 0; i < 4; i++) stage.append(h(`i.hub-twinkle.t${i}.still`));
    }
    const catSlot = h('div.hub-catwalk');
    stage.append(catSlot);
    const bubbleBtn = h('button.hub-bubble', { 'aria-label': 'Ouvrir mon téléphone : un message t\'attend', title: 'Un message t\'attend' }, icon('mail', 22), h('b'));
    const giftBtn = h('button.hub-giftbtn', { 'aria-label': 'Cadeau du jour à récupérer', title: 'Cadeau du jour' }, icon('gift', 24), h('i.hub-dot'));
    const wheelBtn = h('button.hub-giftbtn.hub-wheelbtn', { 'aria-label': 'Roue de cadeaux du jour : un tirage gratuit t\'attend', title: 'Roue du jour' }, icon('star', 24), h('i.hub-dot'));
    stage.append(bubbleBtn, giftBtn, wheelBtn);
    press(bubbleBtn, async () => {
      const st = ev();
      const m = await import('../../../events/ui/phone');
      m.openPhone(pendingInvites(st).length > 0 ? 'invites' : 'messages');
    });
    press(giftBtn, () => { void showDaily(false); });
    press(wheelBtn, () => { void import('../../../wheel').then((m) => m.openWheel()).then(() => events.emit('economy', undefined)); });

    const title = h('h3.hub-title', 'Le château de Radia ♡');
    stage.append(title);
    const progress = h('p.hub-progress');
    const bar = h('div.hub-bar', h('i'));
    const hint = h('p.hub-hint');
    const enterBadge = h('span.hub-ebadge');
    const enter = h('button.hub-card.hub-enter', { 'aria-label': 'Entrer dans mon château' }, h('span.hub-enter-ico', icon('home', 24)), h('b', 'ENTRER DANS MON CHÂTEAU'), enterBadge);
    press(enter, goTo(CASTLE_OPEN));
    const hero = h('section.hub-hero', stage, h('div.hub-hero-info', progress, bar, hint, enter));

    // ------------------------------------------------------------------ cartes
    const grid = h('div.hub-grid');
    interface CardRefs { el: HTMLElement; art: HTMLElement; b: HTMLElement; small: HTMLElement; sub2: HTMLElement; badge: HTMLElement; extra: HTMLElement; artKey: string }
    const cards = new Map<HubId, CardRefs>();
    DESTS.forEach((d, i) => {
      const art = h('div.hub-art');
      const extra = h('div.hub-extra');
      art.append(extra);
      const badge = h('span.hub-badge');
      const b = h('b');
      const small = h('small');
      const sub2 = h('small.hub-sub2');
      const el = h(`button.hub-card.tone-${d.tone}${d.wide ? '.wide' : ''}`, { style: `--i:${i}` }, art, badge, h('span.hub-txt', b, small, sub2));
      press(el, goTo(d.open));
      grid.append(el);
      cards.set(d.id, { el, art, b, small, sub2, badge, extra, artKey: '' });
    });

    // ------------------------------------------------------------------ carte du domaine (lieux à rénover)
    const dArt = h('div.hd-art');
    const dSub = h('small');
    const dBadge = h('span.hd-badge');
    const domainCard = h('button.hub-domain', { 'aria-label': 'Carte du domaine' }, dArt, dBadge, h('div.hd-txt', h('b', 'Carte du domaine'), dSub));
    press(domainCard, goTo(() => openDomainMap()));
    let domainKey = '';
    const paintDomain = () => {
      const d = domainStatus(Date.now());
      const free = L_free();
      const k = `${free}|${d.open}|${d.ready}|${d.services}|${d.fresh}|${d.nextHint}`;
      if (k === domainKey) return;
      domainKey = k;
      dSub.textContent = free ? `${d.open}/${d.total} lieux ouverts${d.nextHint ? ' · ' + d.nextHint : ''}` : 'Les lieux à rénover arrivent avec le Mode libre';
      const b = !free ? '' : d.ready > 0 ? 'quest' : d.services > 0 ? 'reward' : d.fresh > 0 ? 'new' : '';
      dBadge.textContent = b === 'quest' ? 'Prêt à rénover' : b === 'reward' ? 'Récompense' : b === 'new' ? 'Nouveau' : '';
      dBadge.className = `hd-badge${b ? ' b-' + b : ''}`;
      dBadge.style.display = b ? '' : 'none';
      dArt.replaceChildren(panoramaCanvas(d.open, d.total));
    };

    const intro = h('p.hub-note.muted.center', 'Les pièces et les matériaux se gagnent en fusionnant et en livrant des commandes.');
    const body = h('div.screen-body.hub-body', chips, hero, domainCard, grid, intro);
    scr = h(`div.bg-soft.hub-screen${calm ? '.hub-calm' : ''}`, ui.header('Mon monde ♡', close, phoneButton()), body);
    ui.showScreen(scr);
    renderChips();

    // ------------------------------------------------------------------ mise à jour d'après l'état réel
    let lastKey = '';
    let heroKey = '';
    let status: HubStatus = hubStatus(save.data, Date.now());
    const setArt = (id: HubId, key: string, make: () => HTMLCanvasElement) => {
      const r = cards.get(id)!;
      if (r.artKey === key) return;
      r.artKey = key;
      const old = r.art.querySelector('canvas');
      const cv = make();
      if (old && old !== cv) old.replaceWith(cv); else if (!old) r.art.prepend(cv);
    };
    const paintHero = () => {
      const w = world();
      const n = unlockedRooms(w);
      const k = `${n}|${lookKey()}`;
      if (k === heroKey && heroSlot.firstChild) return;
      heroKey = k;
      heroSlot.textContent = '';
      heroSlot.append(heroCanvas(n));
    };
    /** Une tâche par illustration : à l'ouverture elles passent une par une (la page s'affiche tout de suite). */
    const cardJobs = (now: number): (() => void)[] => {
      const w = world();
      const lk = lookKey();
      return [
        () => paintHero(),
        () => setArt('dressing', `d|${lk}`, () => dressingArt()),
        () => setArt('garden', gardenSig(w, now), () => gardenArt(w, now)),
        () => setArt('choc', `${w.choc.collection.slice(-4).join(',')}|${w.choc.shopLevel}`, () => chocArt(w)),
        () => setArt('family', 'f', () => familyArt()),
        () => setArt('cat', `${w.cat.adopted}|${w.cat.equipped.collar}|${w.cat.equipped.bed}|${w.cat.items.length}`, () => catArt(w)),
        () => setArt('career', `${w.careers.current}|${lk}`, () => careerArt(w.careers.current)),
        () => setArt('fans', `${Math.min(9, Math.floor(Math.log10(w.fans + 1) * 2))}|${w.fans > 0}|${lk}`, () => fansArt(w.fans)),
        () => paintLife(now),
      ];
    };
    /** Éclosion animée d'une fleur réellement prête + chat qui se promène (seulement s'il est adopté). */
    const paintLife = (now: number) => {
      const w = world();
      const rf = readyFlower(w, now);
      const gx = cards.get('garden')!.extra;
      const wantBloom = rf ? `b-${rf}` : '';
      if ((gx.dataset.k ?? '') !== wantBloom) {
        gx.dataset.k = wantBloom;
        gx.textContent = '';
        if (rf) gx.append(h('span.hub-bloom', bloomCanvas(rf)), h('i.hub-spark.s1'), h('i.hub-spark.s2'));
      }
      const wantCat = w.cat.adopted ? `c-${w.cat.equipped.collar ?? ''}` : '';
      if ((catSlot.dataset.k ?? '') !== wantCat) {
        catSlot.dataset.k = wantCat;
        catSlot.textContent = '';
        if (w.cat.adopted) catSlot.append(h('span.hub-cat', catWalkCanvas(w.cat.equipped.collar, w.cat.equipped.bed)));
      }
    };
    const paintSignals = () => {
      const st = ev();
      const pending = pendingInvites(st).length;
      const n = pending > 0 ? pending : unreadCount(st);
      bubbleBtn.classList.toggle('on', n > 0);
      bubbleBtn.querySelector('b')!.textContent = n > 9 ? '9+' : String(n);
      bubbleBtn.setAttribute('aria-label', pending > 0 ? `Ouvrir mon téléphone : ${pending} invitation${pending > 1 ? 's' : ''}` : 'Ouvrir mon téléphone : un message t\'attend');
      giftBtn.classList.toggle('on', canClaimToday());
      wheelBtn.classList.toggle('on', wheelReady());
    };
    const burstOnNew = () => {
      if (calm) return;
      (Object.keys(status) as HubId[]).forEach((id) => {
        const b = status[id].badge;
        const sig = b ? `${b}|${status[id].sub}` : '';
        if (sig && shownBadge[id] !== sig) {
          shownBadge[id] = sig;
          const el = id === 'castle' ? enterBadge : cards.get(id)!.badge;
          window.setTimeout(() => {
            if (!alive || !el.isConnected) return;
            const r = el.getBoundingClientRect();
            if (r.width) sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, { rarity: 'uncommon', count: 6 });
          }, 650);
        } else if (!sig) delete shownBadge[id];
      });
    };
    /** Relit l'état, ne touche au DOM que si quelque chose a réellement changé. */
    const refresh = (force = false, first = false) => {
      if (!alive || (!force && !scr.isConnected)) return;
      const now = Date.now();
      status = hubStatus(save.data, now);
      const k = statusKey(status) + gardenSig(world(), now);
      paintSignals();
      paintDomain();
      if (!force && k === lastKey) return;
      lastKey = k;
      const c = status.castle;
      progress.textContent = c.sub;
      (bar.firstElementChild as HTMLElement).style.width = `${Math.round((unlockedRooms(world()) / ROOM_IDS.length) * 100)}%`;
      hint.textContent = c.hint ?? '';
      hint.classList.toggle('on', !!c.hint);
      hero.classList.toggle('glint', c.badge === 'new');
      enterBadge.textContent = c.badge ? BADGE_LABEL[c.badge] : '';
      enter.classList.toggle('has-badge', !!c.badge);
      for (const d of DESTS) {
        const r = cards.get(d.id)!;
        const s = status[d.id];
        r.b.textContent = s.title;
        r.small.textContent = s.sub;
        r.sub2.textContent = s.hint ?? '';
        r.el.setAttribute('aria-label', `${s.title}. ${s.sub}${s.hint ? '. ' + s.hint : ''}`);
        if (s.hint) r.el.title = s.hint; else r.el.removeAttribute('title');
        r.badge.textContent = s.badge ? BADGE_LABEL[s.badge] : '';
        r.badge.className = `hub-badge${s.badge ? ` on b-${s.badge}` : ''}`;
        r.el.classList.toggle('has-badge', !!s.badge);
      }
      const jobs = cardJobs(now);
      if (first) jobs.forEach((j, i) => window.setTimeout(() => { if (alive) j(); }, 30 + i * 40));
      else jobs.forEach((j) => j());
      burstOnNew();
    };

    refresh(true, true);
    const offEco = events.on('economy', () => { renderChips(); refresh(); });
    const offPhone = onPhoneChange(paintSignals);
    const offDaily = onDailyChange(paintSignals);
    // les fleurs poussent et le salaire se remplit avec le temps : un coup d'œil léger toutes les 10 s
    const timer = window.setInterval(() => { if (scr.isConnected && !document.hidden) refresh(); }, 10_000);
    if (firstTime('tip.hub')) window.setTimeout(() => augusteSays('Bienvenue dans ton monde, ma reine. Tout ici est à toi.', 4200), 700);

    function close() {
      alive = false;
      window.clearInterval(timer);
      offEco();
      offPhone();
      offDaily();
      resolve();
    }
  });
}
