import '../../styles/world-dressing.css';
import { hasPhotos } from '../../../core/photos';
import { paintedImageFor, drawPainted, warmRadia } from '../../../game/art/world/radiaNow';
/**
 * « Le dressing de Radia ♡ » : avatar en couches, essayage au toucher, achat
 * (pièces + tissus ou diamants), looks favoris. Règles : src/game/world/wardrobe.ts.
 */
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { audio, events, reducedFx } from '../../../core/app';
import { firstTime, res } from '../../../core/world';
import { wallet } from '../../../core/wallet';
import { HAIR_IDS, NECKLACE_ID, accGroup, isRetiredFaceItem, type AccGroup, type ClothId, type HairId, type Look, type StyleId } from '../../../data/world/ids';
import { CLOTHES, HAIRS } from '../../../data/world/wardrobe';
import type { Expr } from '../../../data/dialogue';
import * as W from '../../../game/world/wardrobe';
import { avatarCanvas, drawAvatar } from '../../../game/art/world/avatar';
import { BRACELET_ID, shineAt, shineStep } from '../../../game/art/world/wristShine';
import { resIconUrl } from '../../../game/art/world/resources';
import { canvasUrl, makeCanvas } from '../../../game/art/kit';
import { reactAuguste } from '../../../game/world/auguste';
import { diamondUrl } from '../shop';
import { sparkleBurst, revealItem, braceletTwinkle, rarityForPrice, type FxKind } from '../../fx/sparkle';
import { haptic } from '../../../core/haptics';
import { necklaceThumbUrl, openNecklaceShowcase } from '../../../events/necklace/showcase';
import { SHOWCASE_PRICE } from '../../../events/necklace/data';
import { announceOutfit } from '../../../apps/eventMoments';
import { gridColumns, panelHeights, gridViewport, visibleRows, nextSnap, sideMode, compactCount, type Snap } from './dressing/layout';
import { TryOn, cardState, lockReason, styleCounts, styleFilterUseful, filterByStyle, STYLE_LABEL, type CardState } from './dressing/model';
import { attachSheetDrag } from './dressing/sheet';

type ItemId = ClothId | HairId;
type CatKey = 'top' | 'bottom' | 'dress' | 'jacket' | 'shoes' | 'bag' | 'hair' | 'crown' | 'makeup' | AccGroup;
const CATS: { key: CatKey; label: string }[] = [
  { key: 'top', label: 'Hauts' }, { key: 'bottom', label: 'Pantalons & jupes' }, { key: 'dress', label: 'Robes' },
  { key: 'jacket', label: 'Vestes' }, { key: 'shoes', label: 'Chaussures' }, { key: 'bag', label: 'Sacs' },
  { key: 'hair', label: 'Coiffures' }, { key: 'head', label: 'Foulards & cheveux' }, { key: 'glasses', label: 'Lunettes' },
  { key: 'ears', label: 'Boucles d\'oreilles' }, { key: 'neck', label: 'Bijoux' }, { key: 'wrist', label: 'Bracelets' }, { key: 'crown', label: 'Couronnes' },
  { key: 'makeup', label: 'Maquillage' }, // surcouche légère : eye-liner, fards, rouge à lèvres / gloss — jamais un changement de visage
];
const isHairId = (id: string): id is HairId => (HAIR_IDS as readonly string[]).includes(id);
/** Un cadeau n'apparaît dans le dressing que s'il est possédé. */
/** (« L'Éclat Éternel ♡ » est toujours présent en vitrine : visible mais verrouillé tant qu'il n'est pas offert.) */
const visible = (id: ItemId): boolean => isHairId(id) ? true : isRetiredFaceItem(id) ? false : !CLOTHES[id].gift || W.owns(id) || id === NECKLACE_ID;
const nameOf = (id: ItemId) => (isHairId(id) ? HAIRS[id].name : CLOTHES[id].name);

// ------------------------------------------------------------------ vignettes dessinées

const THUMB_BASE: Look = { hair: 'hair-loose', top: 'top-tee-white', bottom: 'bot-jeans', dress: null, jacket: null, shoes: 'sh-sneakers-white', bag: null, acc: [], crown: null };
const CROPS: Record<CatKey, [number, number, number, number]> = {
  top: [26, 138, 188, 236], bottom: [20, 268, 200, 322], dress: [0, 140, 240, 452], jacket: [22, 138, 196, 236],
  shoes: [26, 498, 188, 104], bag: [0, 150, 240, 262], crown: [26, -14, 188, 178], hair: [8, 0, 224, 262],
  head: [44, -4, 152, 164], glasses: [60, 36, 120, 80], ears: [44, 50, 152, 104], lips: [84, 108, 72, 56], neck: [50, 128, 140, 100], wrist: [-6, 278, 64, 64],
  eyes: [66, 62, 108, 82], mouth: [72, 102, 96, 74], liner: [66, 62, 108, 82], shadow: [66, 58, 108, 86], makeup: [66, 60, 108, 84],
};
const catOf = (id: ItemId): CatKey => {
  if (isHairId(id)) return 'hair';
  if (CLOTHES[id].slot !== 'acc') return CLOTHES[id].slot as CatKey;
  const g = accGroup(id) ?? 'neck';
  return g === 'liner' || g === 'shadow' || g === 'lips' ? 'makeup' : g; // eye-liner, fards et rouge à lèvres : un seul rayon « Maquillage »
};
/** Cadrage de la vignette : les lèvres sont cadrées sur la bouche, le reste du maquillage sur les yeux. */
const cropOf = (id: ItemId): CatKey => (!isHairId(id) && accGroup(id) === 'lips' ? 'lips' : catOf(id));
const PX = 192;

/** Aperçu dessiné d'une pièce, porté par un mannequin neutre (mise en cache). */
export function thumbUrl(id: ItemId): string {
  if (id === NECKLACE_ID) return necklaceThumbUrl(PX);
  return canvasUrl(`dr:thumb:${id}`, () => {
    const look = isHairId(id) ? { ...W.cloneLook(THUMB_BASE), hair: id } : W.applyItem(THUMB_BASE, id);
    if (!isHairId(id) && (CLOTHES[id].slot !== 'crown' && CLOTHES[id].slot !== 'acc' || catOf(id) === 'wrist')) look.hair = 'hair-bun'; // dégage les épaules (et le poignet) pour bien voir la pièce
    if (!isHairId(id) && CLOTHES[id].slot === 'dress') { look.top = null; look.bottom = null; }
    const [cx, cy, cw, ch] = CROPS[cropOf(id)];
    const c = makeCanvas(PX, PX);
    const ctx = c.getContext('2d')!;
    const f = Math.min(PX / cw, PX / ch);
    ctx.translate((PX - cw * f) / 2 - cx * f, (PX - ch * f) / 2 - cy * f);
    ctx.scale(f, f);
    ctx.beginPath();
    ctx.rect(cx, cy, cw, ch);
    ctx.clip();
    drawAvatar(ctx, look, 240, 600, { expr: 'smile', arms: catOf(id) === 'wrist' ? 'open' : undefined });
    return c;
  });
}

const dpr = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1));

let busy = false;
let stopTwinkle: (() => void) | null = null; // scintillement de la vignette du bracelet d'Auguste (une seule à la fois)
let lastSnap: Snap = 'standard'; // le cran du panneau est retenu pendant la session

export interface DressingOpts { title?: string; hint?: string; cta?: string; /** ambiance « soirée exceptionnelle » */ mood?: 'gala' }

interface CardRef { el: HTMLElement; update(): void }

/** `opts` : mode « préparation d'événement » (titre, conseil, gros bouton « prête » qui ferme l'écran). */
export function openDressing(opts: DressingOpts = {}): Promise<void> {
  if (busy) return Promise.resolve();
  busy = true;
  W.ensureWardrobe();
  return new Promise<void>((resolve) => {
    let tab: CatKey = 'top';
    let style: StyleId | 'all' = 'all';
    let styleOpen = false;
    let confirming = false;
    let expr: Expr = 'smile';
    let blink = false;
    let heldUntil = 0;
    let snap: Snap = lastSnap === 'expanded' ? 'standard' : lastSnap; // on ne rouvre jamais en mode agrandi (Radia réduite)
    let popAlt = false;
    let lastFx = 0;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => { const t = window.setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
    const cleanups: (() => void)[] = [];

    const isShowcase = (id: string): boolean => id === NECKLACE_ID && !W.owns(NECKLACE_ID);
    const ownedNow = (id: ItemId) => (isHairId(id) ? W.ownsHair(id) : W.owns(id));
    const wornNow = (id: ItemId) => (isHairId(id) ? W.getLook().hair === id : W.isEquipped(id));
    const keyOf = (id: string): string => {
      if (isHairId(id)) return 'hair';
      const slot = CLOTHES[id as ClothId].slot;
      return slot === 'acc' ? `acc:${accGroup(id as ClothId) ?? id}` : slot === 'top' || slot === 'bottom' || slot === 'dress' ? `body:${slot}` : slot;
    };
    // haut / bas / robe s'excluent entre eux dans previewLook ; ici seules les pièces de même rayon se remplacent
    const tryon = new TryOn({
      owned: (id) => ownedNow(id as ItemId),
      worn: (id) => wornNow(id as ItemId),
      keyOf,
      showcase: isShowcase,
      removable: (id) => { if (isHairId(id)) return false; const s = CLOTHES[id as ClothId].slot; return s !== 'top' && s !== 'bottom' && s !== 'dress'; },
    });

    // ---------------------------------------------------------- scène
    const AW = 160;
    const AH = 400;
    const cv = h('canvas.dr2-avatar', { 'aria-label': 'Radia' });
    const cvs = cv as HTMLCanvasElement;
    const wrap = h('div.dr2-avatar-wrap', cv);
    const stage = h('div.dr-stage.dr2-stage', h('div.dr2-floor'), wrap);
    if (reducedFx()) wrap.classList.add('calm');
    wrap.addEventListener('animationend', (e) => { if (e.animationName === 'dr2Pop' || e.animationName === 'dr2Twirl') wrap.classList.remove('pop', 'twirl'); });

    const shown = (): Look => tryon.lookFor(W.getLook(), (l, id) => W.previewLook(l, id as ItemId));

    /** Reflet périodique du bracelet (0 si effets réduits ou bracelet non porté). */
    const curShine = (): number => (reducedFx() || !(shown().acc.includes(BRACELET_ID) || shown().acc.includes(NECKLACE_ID)) ? 0 : shineAt(performance.now() / 1000));
    let lastStep = 0;
    const shineLoop = () => {
      const st = shineStep(curShine());
      if (st !== lastStep) { lastStep = st; paint(); }
      later(shineLoop, 110);
    };
    later(shineLoop, 600);

    const paintNow = () => {
      const d = dpr();
      const wpx = Math.round(AW * d);
      const hpx = Math.round(AH * d);
      if (cvs.width !== wpx) { cvs.width = wpx; cvs.height = hpx; }
      const ctx = cvs.getContext('2d')!;
      ctx.clearRect(0, 0, wpx, hpx);
      // tenue de l'illustration (et lien secret) : Radia peinte, comme sur l'accueil ; toute autre tenue : dessin qui suit l'essayage
      const pim = paintedImageFor(shown());
      if (pim) drawPainted(ctx, pim, wpx, hpx);
      else ctx.drawImage(avatarCanvas(shown(), wpx, hpx, { expr, blink, arms: 'down', shine: curShine() }), 0, 0);
    };
    const paint = () => { if (Date.now() >= heldUntil) paintNow(); };
    void warmRadia().then(() => paint()); // les illustrations arrivent après le premier dessin : on repeint une fois prêtes

    /** Petit tour sur soi-même (bouton « Tourner », équipement) : le nouveau look apparaît à mi-chemin. */
    const twirl = (e: Expr = 'love') => {
      expr = e;
      later(() => { expr = 'smile'; paint(); }, 1400);
      if (reducedFx()) { paintNow(); return; }
      heldUntil = Date.now() + 260;
      wrap.classList.remove('twirl', 'pop'); void wrap.offsetWidth; wrap.classList.add('twirl');
      later(() => { heldUntil = 0; paintNow(); }, 270);
    };

    /** Essayage : rebond léger + quelques paillettes ; un nouveau toucher remplace l'animation en cours (plafonné). */
    const popAvatar = () => {
      paintNow();
      if (reducedFx()) return;
      wrap.classList.remove('twirl', 'pop'); void wrap.offsetWidth; wrap.classList.add('pop');
      const now = Date.now();
      if (now - lastFx > 380) {
        lastFx = now;
        const r = cvs.getBoundingClientRect();
        sparkleBurst(r.left + r.width * 0.5, r.top + r.height * 0.42, { rarity: 'common', count: 5 });
      }
    };

    // clignement aléatoire (on ne redessine qu'aux événements)
    const blinkLoop = () => {
      blink = true; paint();
      later(() => { blink = false; paint(); }, 130);
      later(blinkLoop, 2600 + Math.random() * 2600);
    };
    later(blinkLoop, 1800);

    // ---------------------------------------------------------- monnaies (compactes, dans l'en-tête)
    const balCoins = h('b'); const balFabric = h('b'); const balDia = h('b');
    const chip = (src: string, alt: string, b: HTMLElement) => h('span.dr2-chip', { title: alt }, h('img', { src, alt }), b);
    const bal = h('div.dr2-bal', chip(resIconUrl('coins', 40), 'Pièces', balCoins), chip(resIconUrl('fabric', 40), 'Tissus', balFabric), chip(diamondUrl(40), 'Diamants', balDia));
    const refreshBal = () => {
      balCoins.textContent = compactCount(res('coins'));
      balFabric.textContent = compactCount(res('fabric'));
      balDia.textContent = compactCount(wallet.diamonds());
    };

    // ---------------------------------------------------------- colonnes de la scène
    const turnBtn = h('button.dr2-mini', { 'aria-label': 'Faire tourner Radia', on: { click: tap(() => { audio.play('whoosh'); twirl('smile'); }) } }, icon('refresh', 18), h('small', 'Tourner'));
    const cmpBtn = h('button.dr2-mini.dr2-cmp', { 'aria-label': 'Avant / Après : comparer avec ma tenue actuelle', 'aria-pressed': 'false', on: { click: tap(() => compare(), { sound: false }) } }, icon('eye', 18), h('small', 'Avant / Après'));
    // tenue de l'illustration peinte (même artiste qu'Auguste) en un geste
    const illuBtn = h('button.dr2-mini.dr2-illu', { 'aria-label': 'Tenue illustrée : remettre la tenue de l’illustration de Radia', on: { click: tap(() => {
      tryon.clear();
      const r = W.equipIllustrated();
      if (!r.ok) return;
      audio.play('heart'); haptic('select'); twirl('love');
      ui.toast({ title: 'Tenue illustrée ♡', sub: !hasPhotos() ? 'Avec le lien secret, Radia apparaît en illustration, comme Auguste' : 'Radia apparaît en illustration, comme Auguste', icon: 'heart' });
      renderAll();
    }) } }, icon('heart', 18), h('small', 'Tenue illustrée'));
    const left = h('div.dr2-col.left', turnBtn, cmpBtn, illuBtn);
    const slotBtns = [0, 1, 2].map((i) => {
      const b = h('button.dr2-slot', { 'aria-label': `Mon look ${i + 1}` });
      b.addEventListener('click', tap(() => void favoriteSheet(i)));
      return b;
    });
    const right = h('div.dr2-col.right', h('small.dr-col-title.dr2-col-title', 'Mes looks ♡'), ...slotBtns);
    const tryBadge = h('span.dr2-badge', { 'aria-live': 'polite' });
    stage.append(left, right, tryBadge);

    const refreshSlots = () => {
      const favs = W.favorites();
      slotBtns.forEach((b, i) => {
        b.textContent = '';
        const f = favs[i];
        if (f) {
          const mini = h('canvas.dr2-slot-av');
          const d = dpr();
          mini.width = Math.round(22 * d); mini.height = Math.round(54 * d);
          mini.getContext('2d')!.drawImage(avatarCanvas(f.look, mini.width, mini.height, { expr: 'smile' }), 0, 0);
          b.append(mini);
          b.title = f.name;
          b.classList.add('full');
        } else {
          b.classList.remove('full');
          b.title = 'Emplacement vide';
          b.append(h('i.dr2-plus', '+'));
        }
      });
    };

    // ---------------------------------------------------------- panneau : poignée, familles, rayons, filtre, galerie, barre
    const GROUPS: { label: string; ic: string; subs: CatKey[] }[] = [
      { label: 'Tenues', ic: 'sparkle', subs: ['top', 'bottom', 'dress', 'jacket'] },
      { label: 'Sacs & souliers', ic: 'basket', subs: ['shoes', 'bag'] },
      { label: 'Cheveux', ic: 'wand', subs: ['hair', 'head', 'crown'] },
      { label: 'Bijoux', ic: 'crown', subs: ['glasses', 'ears', 'neck', 'wrist'] },
      { label: 'Maquillage', ic: 'smile', subs: ['makeup'] },
    ];
    const groupOf = (k: CatKey) => GROUPS.findIndex((g) => g.subs.includes(k));
    const SHORT: Partial<Record<CatKey, string>> = { top: 'Hauts', bottom: 'Bas', dress: 'Robes', jacket: 'Vestes', shoes: 'Chaussures', bag: 'Sacs', hair: 'Coiffures', head: 'Foulards', glasses: 'Lunettes', ears: 'Boucles', neck: 'Colliers', wrist: 'Bracelets', crown: 'Couronnes', makeup: 'Maquillage' };
    const labelOf = (k: CatKey) => SHORT[k] ?? CATS.find((c) => c.key === k)?.label ?? '';
    const handle = h('button.dr2-handle', { 'aria-label': 'Agrandir ou réduire la galerie' }, h('i'));
    handle.addEventListener('click', () => { setSnap(nextSnap(snap)); });
    const tabs = h('div.dr-groups.dr2-groups', { role: 'tablist' });
    const groupEls = GROUPS.map((g) => {
      const b = h('button.dr-group.dr2-group', { role: 'tab' }, icon(g.ic, 20), h('span', g.label));
      b.addEventListener('click', tap(() => { if (!g.subs.includes(tab)) { tab = g.subs[0]; style = 'all'; confirming = false; renderAll(); } }, { sound: false }));
      tabs.append(b);
      return b;
    });
    const subRow = h('div.dr-tabs.dr2-tabs');
    const styleBtn = h('button.dr2-stylebtn', { 'aria-label': 'Filtrer par style (facultatif)', 'aria-expanded': 'false' }, h('span', 'Style'), h('i', '▾'));
    styleBtn.addEventListener('click', tap(() => { styleOpen = !styleOpen; if (!styleOpen) style = 'all'; renderAll(); layout(); }, { sound: false }));
    const subbar = h('div.dr2-subbar', subRow, styleBtn);
    const styleRow = h('div.dr2-styles');
    const headEl = h('div.dr2-head', handle, tabs, subbar, styleRow);
    const grid = h('div.dr2-grid');
    const bar = h('div.dr2-bar');
    const panel = h('div.dr2-panel', headEl, grid, bar);

    const readyBtn = opts.cta ? h('button.btn.dr-ready.dr2-ready', opts.cta) : null;
    readyBtn?.addEventListener('click', tap(() => { ui.closeScreen(); close(); }));
    const hintEl = opts.hint ? h('p.dr-evhint.dr2-evhint', opts.hint) : null;
    const body = h('div.dr2-body', stage, panel);
    const screen = h(`div.bg-soft.dr-screen.dr2-screen${opts.cta ? '.dr-event' : ''}${opts.mood === 'gala' ? '.dr-gala' : ''}`,
      ui.header(opts.title ?? 'Mon dressing ♡', () => { if (opts.cta) ui.closeScreen(); close(); }, bal), hintEl, body);
    ui.showScreen(screen);

    // ---------------------------------------------------------- mise en page : crans du panneau, colonnes, rangées
    let heights = { collapsed: 150, standard: 380, expanded: 560 };
    const num = (v: string, d: number): number => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
    function layout(): void {
      const avail = body.clientHeight;
      if (avail <= 0) return;
      const cs = getComputedStyle(grid);
      const gap = num(cs.rowGap, 8);
      const pad = num(cs.paddingTop, 4) + num(cs.paddingBottom, 8);
      const first = grid.querySelector<HTMLElement>('.dr2-card');
      const row = first ? first.offsetHeight : 118;
      grid.style.setProperty('--dr2-cols', String(gridColumns(grid.clientWidth || body.clientWidth)));
      heights = panelHeights({ avail, head: headEl.offsetHeight, bar: bar.offsetHeight, row, gap, pad, minStage: Math.max(190, Math.min(300, Math.round(avail * 0.34))), wantRows: 2 });
      applySnap(false);
    }
    function applySnap(animate: boolean): void {
      const hgt = heights[snap];
      panel.classList.toggle('dr2-anim', animate && !reducedFx());
      panel.style.height = `${hgt}px`;
      screen.dataset.snap = snap;
      const stageH = body.clientHeight - hgt;
      const sm = sideMode(stageH);
      screen.dataset.side = sm;
      const vis = visibleRows(gridViewport(hgt, headEl.offsetHeight, bar.offsetHeight), grid.querySelector<HTMLElement>('.dr2-card')?.offsetHeight ?? 118, 8, 12);
      screen.dataset.rows = String(vis.full);
    }
    function setSnap(s: Snap): void {
      snap = s; lastSnap = s;
      screen.classList.remove('dr2-drag');
      applySnap(true);
      handle.setAttribute('aria-label', s === 'expanded' ? 'Réduire la galerie' : 'Agrandir la galerie');
      later(() => { layout(); }, 340); // les mesures définitives (rangées visibles) après l'animation
    }
    cleanups.push(attachSheetDrag([handle, tabs, subRow, styleRow], {
      heights: () => heights,
      current: () => panel.getBoundingClientRect().height,
      live: (hgt) => { screen.classList.add('dr2-drag'); panel.classList.remove('dr2-anim'); panel.style.height = `${hgt}px`; screen.dataset.side = sideMode(body.clientHeight - hgt); },
      settle: (s) => { haptic('select'); setSnap(s); },
    }));
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => layout());
      ro.observe(body);
      cleanups.push(() => ro.disconnect());
    }

    // ---------------------------------------------------------- rendu
    const missing = (id: ItemId): string | null => {
      const c = isHairId(id) ? W.canBuyHair(id) : W.canBuy(id, 'coins');
      if (c.ok || c.reason === 'owned') return null;
      return c.reason === 'fabric' ? `Il te manque ${(isHairId(id) ? 0 : W.priceOf(id).fabric) - res('fabric')} tissus` : `Il te manque ${(isHairId(id) ? W.hairPrice(id) : W.priceOf(id).coins) - res('coins')} pièces`;
    };

    const allOf = (k: CatKey): ItemId[] => (k === 'hair' ? [...HAIR_IDS] : (Object.keys(CLOTHES) as ClothId[]).filter((id) => visible(id) && catOf(id) === k));
    const items = (): ItemId[] => {
      if (tab === 'hair') return [...HAIR_IDS];
      let list = allOf(tab) as ClothId[];
      if (styleOpen && style !== 'all') list = filterByStyle(list.map((id) => ({ id, styles: CLOTHES[id].styles })), style).map((x) => x.id);
      return tab === 'neck' ? [...list.filter((id) => id === NECKLACE_ID), ...list.filter((id) => id !== NECKLACE_ID)] : list; // la vitrine en premier
    };

    const cards = new Map<ItemId, CardRef>();

    function price(coins: number, fabric: number, dia: number): HTMLElement {
      const p = h('div.dr-price.dr2-price');
      if (coins > 0) p.append(h('span.pr', h('img', { src: resIconUrl('coins', 32), alt: '' }), String(coins)));
      else p.append(h('span.pr.free', 'Offert'));
      if (fabric > 0) p.append(h('span.pr', h('img', { src: resIconUrl('fabric', 32), alt: '' }), String(fabric)));
      if (dia > 0) p.append(h('span.pr.dia', h('img', { src: diamondUrl(32), alt: '' }), String(dia)));
      return p;
    }
    const priceOfItem = (id: ItemId) => (isHairId(id) ? { coins: HAIRS[id].coins, fabric: 0, diamonds: 0 } : W.priceOf(id));

    /** Une carte : vignette, nom, état (équipé / possédé / prix / verrou). Mise à jour sur place (la galerie ne saute jamais). */
    function makeCard(id: ItemId): CardRef {
      const showcase = id === NECKLACE_ID;
      const c = h('button.dr-card.dr2-card', { type: 'button' });
      const thumbImg = h('img', { src: thumbUrl(id), alt: '', loading: 'lazy', decoding: 'async' });
      const mark = h('span.dr2-check', icon('check', 13));
      const lockEl = h('span.dr2-lock', icon('lock', 13));
      const status = h('div.dr-status.dr2-status');
      c.append(h('div.dr-thumb.dr2-thumb', thumbImg), mark, lockEl, h('div.dr2-name', nameOf(id)), status);
      let twinkling = false;
      const update = () => {
        const own = ownedNow(id);
        const locked = showcase ? lockReason({ gift: true }, own, true) : isHairId(id) ? null : lockReason(CLOTHES[id], own, false);
        const st: CardState = cardState({ locked, owned: own, worn: own && wornNow(id) });
        const sel = tryon.focus === id || tryon.isTrying(id);
        c.className = `dr-card dr2-card ${st === 'equipped' ? 'worn equipped' : st === 'owned' ? 'own' : st} ${sel ? 'sel try' : ''} ${showcase && st === 'locked' ? 'eclat-locked' : ''}`.replace(/\s+/g, ' ').trim();
        if (st === 'buy' && missing(id)) c.classList.add('poor');
        c.setAttribute('aria-pressed', String(sel));
        c.setAttribute('aria-label', st === 'locked' ? `${nameOf(id)} : verrouillé` : `${nameOf(id)}${st === 'equipped' ? ', équipé' : st === 'owned' ? ', possédé' : ''}`);
        status.textContent = '';
        if (st === 'locked') status.append(h('span.dr-pill.dr2-pill.priceless', icon('lock', 12), showcase ? SHOWCASE_PRICE.replace('Prix : ', '') : (locked ?? 'Verrouillé')));
        else if (st === 'equipped') status.append(h('span.dr-pill.dr2-pill.worn', icon('heart', 11), 'Équipé'));
        else if (st === 'owned') status.append(h('span.dr-pill.dr2-pill.own', icon('check', 11), 'Possédé'));
        else { const p = priceOfItem(id); status.append(price(p.coins, p.fabric, p.diamonds)); }
        if (id === BRACELET_ID && own && !twinkling) { twinkling = true; stopTwinkle?.(); stopTwinkle = braceletTwinkle(thumbImg, { x: 0.5, y: 0.5 }); }
      };
      c.addEventListener('click', tap(() => pick(id), { sound: false, delay: 120 }));
      update();
      return { el: c, update };
    }

    function renderGrid(): void {
      cards.clear();
      grid.textContent = '';
      grid.scrollTop = 0;
      const list = items();
      if (!list.length) grid.append(h('p.dr2-empty', 'Rien dans ce style pour l’instant.'));
      for (const id of list) { const r = makeCard(id); cards.set(id, r); grid.append(r.el); }
    }
    const refreshCards = () => { for (const r of cards.values()) r.update(); };

    function renderStyles(): void {
      const base = (tab === 'hair' ? [] : (allOf(tab) as ClothId[])).map((id) => ({ id, styles: CLOTHES[id].styles }));
      const useful = styleFilterUseful(tab, base);
      subbar.classList.toggle('has-style', useful);
      if (!useful) { styleOpen = false; style = 'all'; }
      styleBtn.setAttribute('aria-expanded', String(styleOpen));
      styleBtn.classList.toggle('on', styleOpen);
      styleRow.textContent = '';
      styleRow.classList.toggle('open', useful && styleOpen);
      if (!useful || !styleOpen) return;
      const mk = (key: StyleId | 'all', label: string, n: number) => {
        const b = h(`button.dr2-sty${style === key ? '.on' : ''}`, label, h('small', String(n)));
        b.addEventListener('click', tap(() => { style = key; renderAll(); layout(); }, { sound: false }));
        return b;
      };
      styleRow.append(mk('all', 'Tous', base.length), ...styleCounts(base).map((x) => mk(x.style, STYLE_LABEL[x.style], x.n)));
    }

    /** Barre d'action : toujours visible, jamais par-dessus les cartes. */
    function renderBar(): void {
      bar.textContent = '';
      const act = tryon.action();
      const id = tryon.focus as ItemId | null;
      if (!id || act === 'none' || act === 'locked') {
        confirming = false;
        if (readyBtn) bar.append(readyBtn);
        else bar.append(h('p.dr2-hint', tryon.active ? 'Essaie aussi autre chose, ou appuie sur ✕ pour annuler.' : 'Touche un vêtement : il apparaît sur Radia ♡'));
        return;
      }
      const stop = h('button.icon-btn.dr2-x', { 'aria-label': confirming ? 'Annuler l’achat' : 'Annuler l’essayage', on: { click: tap(() => { if (confirming) confirming = false; else tryon.clear(); renderAll(); paint(); }, { sound: false }) } }, icon(confirming ? 'back' : 'close', 20));
      const tag = act === 'buy' ? (confirming ? 'Confirmer l’achat ?' : 'Essayage') : act === 'equip' ? 'Dans ton dressing' : 'Équipé ♡';
      const priceEl = act === 'buy' ? (() => { const p = priceOfItem(id); return price(p.coins, p.fabric, p.diamonds); })() : null;
      const info = h('div.dr2-bar-info', h('small.dr2-tag', tag), h('b', nameOf(id)), priceEl);
      const main = h('button.btn.small.dr2-act');
      if (act === 'equip') { main.textContent = 'Équiper'; main.addEventListener('click', tap(() => equipFocus(), { sound: false })); }
      else if (act === 'remove') { main.textContent = 'Retirer'; main.classList.add('secondary'); main.addEventListener('click', tap(() => removeFocus(), { sound: false })); }
      else if (act === 'worn') { main.textContent = 'Équipé ✓'; main.classList.add('secondary'); main.setAttribute('disabled', ''); }
      else {
        const p = priceOfItem(id);
        const coinOk = isHairId(id) ? W.canBuyHair(id).ok : W.canBuy(id, 'coins').ok;
        const diaOk = !isHairId(id) && p.diamonds > 0 && W.canBuy(id, 'diamonds').ok;
        if (!confirming) {
          main.textContent = 'Acheter';
          if (!coinOk && !diaOk) main.classList.add('locked');
          main.addEventListener('click', tap(() => {
            if (!coinOk && !diaOk) { audio.play('invalid'); haptic('error'); ui.toast({ title: missing(id) ?? 'Pas assez de ressources', sub: 'Continue de fusionner pour en gagner ♡', icon: 'info' }); return; }
            confirming = true; renderBar();
          }, { sound: false }));
        } else {
          if (coinOk) { main.textContent = 'Confirmer'; main.addEventListener('click', tap(() => void purchase(id, 'coins'), { sound: false })); }
          else { main.textContent = `Payer ${p.diamonds} ◆`; main.classList.add('lavande'); main.addEventListener('click', tap(() => void purchase(id, 'diamonds'), { sound: false })); }
          bar.append(stop, info, main);
          if (coinOk && diaOk) {
            const alt = h('button.btn.small.lavande.dr2-alt', { 'aria-label': `Payer ${p.diamonds} diamants` }, h('img', { src: diamondUrl(32), alt: '' }), String(p.diamonds));
            alt.addEventListener('click', tap(() => void purchase(id, 'diamonds'), { sound: false }));
            bar.append(alt);
          }
          return;
        }
      }
      bar.append(stop, info, main);
    }

    function renderAll(): void {
      refreshBal();
      const gi = groupOf(tab);
      groupEls.forEach((el, k) => { el.classList.toggle('on', k === gi); el.setAttribute('aria-selected', String(k === gi)); });
      subRow.textContent = '';
      const subs = (GROUPS[gi]?.subs ?? []).filter((k) => k !== 'wrist' || allOf('wrist').length > 0);
      for (const k of subs) {
        const all = allOf(k);
        const have = all.filter((id) => ownedNow(id)).length;
        const b = h(`button.dr-tab.dr2-tab${k === tab ? '.on' : ''}`, { role: 'tab' }, labelOf(k), h('small', `${have}/${all.length}`));
        b.addEventListener('click', tap(() => { tab = k; style = 'all'; confirming = false; renderAll(); }, { sound: false }));
        subRow.append(b);
      }
      subRow.classList.toggle('single', subs.length < 2);
      const onTab = subRow.querySelector<HTMLElement>('.dr2-tab.on');
      if (onTab) { // l'onglet choisi reste entièrement visible
        const l = onTab.offsetLeft; const r = l + onTab.offsetWidth;
        if (r > subRow.scrollLeft + subRow.clientWidth) subRow.scrollLeft = r - subRow.clientWidth + 8;
        else if (l < subRow.scrollLeft) subRow.scrollLeft = Math.max(0, l - 8);
      } else subRow.scrollLeft = 0;
      renderStyles();
      renderGrid();
      renderBar();
      refreshSlots();
      updateBadge();
      paint();
      layout();
    }

    /** Mise à jour légère après un toucher : aucune carte recréée, la galerie garde sa position. */
    function refreshLight(): void {
      refreshBal();
      refreshCards();
      renderBar();
      updateBadge();
    }

    function updateBadge(): void {
      const on = tryon.active;
      tryBadge.classList.toggle('on', on);
      tryBadge.textContent = on ? (tryon.before ? 'Ma tenue actuelle' : tryon.trials.length > 1 ? `Essayage · ${tryon.trials.length} pièces` : 'Essayage') : '';
      cmpBtn.classList.toggle('ready', on);
      cmpBtn.classList.toggle('on', on && tryon.before);
      cmpBtn.setAttribute('aria-pressed', String(on && tryon.before));
      cmpBtn.toggleAttribute('data-off', !on);
    }

    // ---------------------------------------------------------- actions
    /** Un toucher sur une carte : la pièce s'applique tout de suite sur Radia (aucune fenêtre). */
    function pick(id: ItemId): void {
      confirming = false;
      const r = tryon.select(id);
      if (r === 'showcase') { void openNecklaceShowcase(); return; } // jamais d'essayage ni d'achat : vitrine seulement
      audio.play((popAlt = !popAlt) ? 'pop1' : 'pop2', 0.8);
      haptic('select');
      expr = 'smile';
      refreshLight();
      popAvatar();
    }

    function compare(): void {
      if (!tryon.toggleBefore()) {
        ui.toast({ title: 'Essaie d’abord une pièce', sub: 'Touche un vêtement pour le comparer à ta tenue ♡', icon: 'info' });
        return;
      }
      audio.play('whoosh', 0.6);
      haptic('select');
      updateBadge();
      popAvatar();
    }

    /** Équipe la pièce au centre (déjà possédée) : la tenue enregistrée change maintenant. */
    function equipFocus(): void {
      const id = tryon.focus as ItemId | null;
      if (!id || !ownedNow(id)) return;
      const r = isHairId(id) ? W.setHair(id) : W.equip(id);
      if (!r.ok) return fail(r.reason);
      equipFx(id, false);
    }

    function removeFocus(): void {
      const id = tryon.focus as ItemId | null;
      if (!id || isHairId(id)) return;
      W.unequip(id);
      audio.play('drop');
      haptic('select');
      refreshLight();
      paintNow();
    }

    /** Animation d'équipement : paillettes autour de Radia, petit tour, réaction d'Auguste. */
    function equipFx(id: ItemId, bought: boolean): void {
      tryon.committed(id);
      if (readyBtn) tryon.focus = null; // en préparation d'événement, le bouton « prête » revient aussitôt
      confirming = false;
      haptic(bought ? 'reward' : 'select');
      if (id === NECKLACE_ID) necklaceFx();
      else {
        audio.play('heart');
        const def = isHairId(id) ? null : CLOTHES[id];
        const kind: FxKind = def?.slot === 'bag' ? 'bag' : def?.slot === 'dress' ? 'dress' : 'item';
        const rarity = def ? rarityForPrice(def.coins, def.diamonds ?? 0, !!def.gift) : 'uncommon';
        if (bought) void revealItem(wrap, { rarity, kind });
        else { const r = cvs.getBoundingClientRect(); sparkleBurst(r.left + r.width * 0.5, r.top + r.height * 0.4, { rarity: rarity === 'common' ? 'uncommon' : rarity, count: 12 }); }
      }
      twirl('love');
      refreshLight();
      const look = W.getLook();
      reactAuguste(isHairId(id) ? 'hair' : W.isElegant(look) ? 'outfitElegant' : bought ? 'outfitBuy' : 'outfit', bought ? 0.6 : 0.35);
    }

    /** Apparition du collier : étincelles autour du cou, tintement cristallin, retour tactile doux (si supporté). */
    function necklaceFx() {
      audio.play('crystalSoft');
      haptic('reward');
      const r = cvs.getBoundingClientRect();
      sparkleBurst(r.left + r.width * 0.5, r.top + r.height * 0.36, { rarity: 'legendary', count: 18 });
      later(() => audio.play('sparkle'), 180);
    }

    function fail(reason?: string) {
      audio.play('invalid');
      haptic('error');
      ui.toast({ title: 'Oups…', sub: reason === 'not-owned' ? 'Cette pièce n’est pas encore à toi' : 'Impossible pour le moment', icon: 'info' });
    }

    /** Achat confirmé dans la barre : débit réel, la pièce est équipée aussitôt (rien n'est perdu : tout reste dans le dressing). */
    function purchase(id: ItemId, pay: 'coins' | 'diamonds'): void {
      if (!isHairId(id) && CLOTHES[id].gift) return fail('gift'); // un cadeau ne s'achète pas
      const r = isHairId(id) ? W.buyHair(id) : W.buy(id, pay);
      if (!r.ok) return fail(r.reason);
      refreshBal();
      if (balCoins.parentElement) { balCoins.parentElement.classList.remove('bump'); void balCoins.parentElement.offsetWidth; balCoins.parentElement.classList.add('bump'); }
      later(() => balCoins.parentElement?.classList.remove('bump'), 700);
      audio.play('reward');
      later(() => audio.play('pop2', 1.0), 160);
      const e = isHairId(id) ? W.setHair(id) : W.equip(id);
      if (!e.ok) { tryon.committed(id); refreshLight(); return; }
      equipFx(id, true);
      announceOutfit(id, nameOf(id));
      ui.toast({ title: 'Acheté et équipé ♡', sub: nameOf(id), icon: 'heart' });
    }

    // ---------------------------------------------------------- looks favoris
    async function favoriteSheet(i: number) {
      const f = W.favorites()[i];
      const input = h('input.dr-name-input.dr2-name-input', { type: 'text', maxLength: W.NAME_MAX, value: f?.name ?? `Look ${i + 1}`, 'aria-label': 'Nom du look', autocomplete: 'off', spellcheck: false }) as HTMLInputElement;
      const cur = W.getLook();
      const dl = dpr();
      const mk = (look: Look, label: string) => {
        const c = h('canvas.dr2-sheet-av');
        c.width = Math.round(64 * dl); c.height = Math.round(160 * dl);
        c.getContext('2d')!.drawImage(avatarCanvas(look, c.width, c.height, { expr: 'smile' }), 0, 0);
        return h('div.dr2-sheet-col', c, h('small', label));
      };
      const body2 = h('div.dr2-sheet',
        h('div.dr2-sheet-row', ...(f ? [mk(f.look, 'Enregistré')] : []), mk(cur, 'Ma tenue')),
        h('label.dr2-label', 'Nom du look', input));
      const actions = [] as { label: string; value: string; style?: 'primary' | 'secondary' | 'lavande' | 'gold' }[];
      if (f) actions.push({ label: 'Porter ce look', value: 'equip' });
      actions.push({ label: f ? 'Remplacer par ma tenue' : 'Sauvegarder ma tenue', value: 'save', style: f ? 'lavande' : 'primary' });
      if (f) actions.push({ label: 'Renommer', value: 'rename', style: 'secondary' });
      actions.push({ label: 'Fermer', value: 'close', style: 'secondary' });
      const v = await ui.modal({ title: `Mon look ${i + 1}`, body: body2, actions });
      if (v === 'save') {
        const r = W.saveLook(i, input.value);
        if (r.ok) { audio.play('check'); ui.toast({ title: 'Look sauvegardé ♡', sub: W.favorites()[i]?.name, icon: 'heart' }); }
      } else if (v === 'equip') {
        tryon.clear();
        const r = W.equipFavorite(i);
        if (r.ok) { audio.play('heart'); haptic('select'); twirl('love'); const l = W.getLook(); reactAuguste(W.isElegant(l) ? 'outfitElegant' : 'outfit', 0.4); }
      } else if (v === 'rename') {
        const r = W.renameFavorite(i, input.value);
        if (r.ok) audio.play('check'); else { audio.play('invalid'); ui.toast({ title: 'Choisis un nom', sub: '1 à 24 caractères', icon: 'info' }); }
      }
      renderAll();
    }

    // ---------------------------------------------------------- tutoriel très court
    if (firstTime('tip.dressing')) {
      const tip = h('div.dr-tip.dr2-tip', h('b', 'Bienvenue dans ton dressing ♡'), h('span', 'Touche une pièce : elle apparaît tout de suite sur Radia. Fais glisser la poignée vers le haut pour voir plus de choix.'),
        h('button.btn.small', { on: { click: tap(() => { tip.classList.add('out'); later(() => tip.remove(), 240); }) } }, 'Compris'));
      screen.append(tip);
    }

    const off = events.on('economy', () => { refreshBal(); });
    renderAll();
    later(layout, 420); // après l'animation d'entrée de l'écran

    function close() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      for (const f of cleanups) f();
      stopTwinkle?.(); stopTwinkle = null;
      off();
      busy = false;
      resolve();
    }
  });
}
