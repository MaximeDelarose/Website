import '../../styles/world-dressing.css';
/**
 * « Le dressing de Radia ♡ » : avatar en couches, essayage au toucher, achat
 * (pièces + tissus ou diamants), looks favoris. Règles : src/game/world/wardrobe.ts.
 */
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { audio, events, reducedFx } from '../../../core/app';
import { firstTime, res } from '../../../core/world';
import { wallet, fmt } from '../../../core/wallet';
import { HAIR_IDS, type ClothId, type HairId, type Look, type StyleId } from '../../../data/world/ids';
import { CLOTHES, HAIRS, STYLE_NAMES } from '../../../data/world/wardrobe';
import type { Expr } from '../../../data/dialogue';
import * as W from '../../../game/world/wardrobe';
import { avatarCanvas, drawAvatar } from '../../../game/art/world/avatar';
import { resIconUrl } from '../../../game/art/world/resources';
import { canvasUrl, makeCanvas } from '../../../game/art/kit';
import { reactAuguste } from '../../../game/world/auguste';
import { diamondUrl } from '../shop';

type ItemId = ClothId | HairId;
type CatKey = 'top' | 'bottom' | 'dress' | 'jacket' | 'shoes' | 'bag' | 'acc' | 'hair' | 'crown';
const CATS: { key: CatKey; label: string }[] = [
  { key: 'top', label: 'Hauts' }, { key: 'bottom', label: 'Pantalons & jupes' }, { key: 'dress', label: 'Robes' },
  { key: 'jacket', label: 'Vestes' }, { key: 'shoes', label: 'Chaussures' }, { key: 'bag', label: 'Sacs' },
  { key: 'acc', label: 'Accessoires' }, { key: 'hair', label: 'Coiffures' }, { key: 'crown', label: 'Couronnes' },
];
const STYLES: StyleId[] = ['casual', 'chic', 'romantic', 'royal', 'stage'];
const isHairId = (id: string): id is HairId => (HAIR_IDS as readonly string[]).includes(id);
const nameOf = (id: ItemId) => (isHairId(id) ? HAIRS[id].name : CLOTHES[id].name);

// ------------------------------------------------------------------ vignettes dessinées

const THUMB_BASE: Look = { hair: 'hair-loose', top: 'top-tee-white', bottom: 'bot-jeans', dress: null, jacket: null, shoes: 'sh-sneakers-white', bag: null, acc: [], crown: null };
const CROPS: Record<CatKey, [number, number, number, number]> = {
  top: [26, 138, 188, 236], bottom: [20, 268, 200, 322], dress: [0, 140, 240, 452], jacket: [22, 138, 196, 236],
  shoes: [26, 498, 188, 104], bag: [0, 150, 240, 262], acc: [28, 8, 184, 206], crown: [26, -14, 188, 178], hair: [8, 0, 224, 262],
};
const catOf = (id: ItemId): CatKey => (isHairId(id) ? 'hair' : (CLOTHES[id].slot as CatKey));
const PX = 192;

/** Aperçu dessiné d'une pièce, porté par un mannequin neutre (mise en cache). */
export function thumbUrl(id: ItemId): string {
  return canvasUrl(`dr:thumb:${id}`, () => {
    const look = isHairId(id) ? { ...W.cloneLook(THUMB_BASE), hair: id } : W.applyItem(THUMB_BASE, id);
    if (!isHairId(id) && CLOTHES[id].slot !== 'crown') look.hair = 'hair-bun'; // dégage les épaules pour bien voir la pièce
    if (!isHairId(id) && CLOTHES[id].slot === 'dress') { look.top = null; look.bottom = null; }
    const [cx, cy, cw, ch] = CROPS[catOf(id)];
    const c = makeCanvas(PX, PX);
    const ctx = c.getContext('2d')!;
    const f = Math.min(PX / cw, PX / ch);
    ctx.translate((PX - cw * f) / 2 - cx * f, (PX - ch * f) / 2 - cy * f);
    ctx.scale(f, f);
    ctx.beginPath();
    ctx.rect(cx, cy, cw, ch);
    ctx.clip();
    drawAvatar(ctx, look, 240, 600, { expr: 'smile' });
    return c;
  });
}

const dpr = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1));

let busy = false;

export function openDressing(): Promise<void> {
  if (busy) return Promise.resolve();
  busy = true;
  W.ensureWardrobe();
  return new Promise<void>((resolve) => {
    let tab: CatKey = 'top';
    let style: StyleId | 'all' = 'all';
    let preview: ItemId | null = null;
    let expr: Expr = 'smile';
    let blink = false;
    let heldUntil = 0;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => { const t = window.setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

    // ---------------------------------------------------------- scène
    const AW = 124;
    const AH = 310;
    const cv = h('canvas.dr-avatar', { 'aria-label': 'Radia' });
    const cvs = cv as HTMLCanvasElement;
    const wrap = h('div.dr-avatar-wrap', cv);
    const tryBadge = h('div.dr-try-badge', icon('eye', 14), h('span', 'Essayage'));
    const stage = h('div.dr-stage', h('div.dr-floor'), wrap, tryBadge);
    if (reducedFx()) wrap.classList.add('calm');

    const shown = (): Look => (preview ? W.previewLook(W.getLook(), preview) : W.getLook());
    const paintNow = () => {
      const d = dpr();
      const wpx = Math.round(AW * d);
      const hpx = Math.round(AH * d);
      if (cvs.width !== wpx) { cvs.width = wpx; cvs.height = hpx; }
      const ctx = cvs.getContext('2d')!;
      ctx.clearRect(0, 0, wpx, hpx);
      ctx.drawImage(avatarCanvas(shown(), wpx, hpx, { expr, blink }), 0, 0);
    };
    const paint = () => { if (Date.now() >= heldUntil) paintNow(); };

    /** Petit tour sur soi-même : le nouveau look apparaît à mi-chemin. */
    const twirl = (e: Expr = 'love') => {
      expr = e;
      later(() => { expr = 'smile'; paint(); }, 1400);
      if (reducedFx()) { paintNow(); return; }
      heldUntil = Date.now() + 260;
      wrap.classList.remove('twirl'); void wrap.offsetWidth; wrap.classList.add('twirl');
      later(() => { heldUntil = 0; paintNow(); }, 270);
      burst(stage, 7, 'sparkle');
    };

    function burst(host: HTMLElement, n: number, kind = 'star') {
      if (reducedFx()) return;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
        const d = 50 + Math.random() * 60;
        const s = h(`span.dr-star.${kind}`, { style: `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 20}px;--r:${Math.round(Math.random() * 90)}deg;--s:${(0.7 + Math.random() * 0.8).toFixed(2)}` });
        host.append(s);
        later(() => s.remove(), 1000);
      }
    }

    // clignement aléatoire (≈ 20 images/s max : on ne redessine qu'aux événements)
    const blinkLoop = () => {
      blink = true; paint();
      later(() => { blink = false; paint(); }, 130);
      later(blinkLoop, 2600 + Math.random() * 2600);
    };
    later(blinkLoop, 1800);

    // ---------------------------------------------------------- soldes
    const balCoins = h('b'); const balFabric = h('b'); const balDia = h('b');
    const bal = h('div.dr-bal',
      h('span.chip', h('img', { src: resIconUrl('coins', 40), alt: 'Pièces' }), balCoins),
      h('span.chip', h('img', { src: resIconUrl('fabric', 40), alt: 'Tissus' }), balFabric),
      h('span.chip', h('img', { src: diamondUrl(40), alt: 'Diamants' }), balDia));
    const refreshBal = () => {
      balCoins.textContent = fmt(res('coins'));
      balFabric.textContent = fmt(res('fabric'));
      balDia.textContent = fmt(wallet.diamonds());
    };

    // ---------------------------------------------------------- colonnes de la scène
    const styleBadge = h('span.chip.dr-style');
    const turnBtn = h('button.dr-mini', { 'aria-label': 'Faire tourner Radia', on: { click: tap(() => { audio.play('whoosh'); twirl('smile'); }) } }, icon('refresh', 20), h('small', 'Tourner'));
    const left = h('div.dr-col.left', styleBadge, turnBtn);
    const slotBtns = [0, 1, 2].map((i) => {
      const b = h('button.dr-slot', { 'aria-label': `Mon look ${i + 1}` });
      b.addEventListener('click', tap(() => void favoriteSheet(i)));
      return b;
    });
    const right = h('div.dr-col.right', h('small.dr-col-title', 'Mes looks ♡'), ...slotBtns);
    stage.prepend(left);
    stage.append(right);

    const refreshSlots = () => {
      const favs = W.favorites();
      slotBtns.forEach((b, i) => {
        b.textContent = '';
        const f = favs[i];
        if (f) {
          const mini = h('canvas.dr-slot-av');
          const d = dpr();
          mini.width = Math.round(30 * d); mini.height = Math.round(75 * d);
          mini.getContext('2d')!.drawImage(avatarCanvas(f.look, mini.width, mini.height, { expr: 'smile' }), 0, 0);
          b.append(mini, h('span', f.name));
          b.classList.add('full');
        } else {
          b.classList.remove('full');
          b.append(h('i.dr-plus', '+'), h('span', 'Vide'));
        }
      });
    };

    // ---------------------------------------------------------- panneau : onglets, styles, grille, barre d'achat
    const tabs = h('div.dr-tabs', { role: 'tablist' });
    const tabEls = new Map<CatKey, HTMLElement>();
    for (const c of CATS) {
      const b = h('button.dr-tab', { role: 'tab' }, c.label);
      b.addEventListener('click', tap(() => { tab = c.key; renderAll(); b.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: reducedFx() ? 'auto' : 'smooth' }); }, { sound: false }));
      tabEls.set(c.key, b);
      tabs.append(b);
    }
    const styles = h('div.dr-styles');
    const styleEls = new Map<string, HTMLElement>();
    for (const s of ['all', ...STYLES] as const) {
      const b = h('button.dr-sty', s === 'all' ? 'Tous' : STYLE_NAMES[s]);
      b.addEventListener('click', tap(() => { style = s; renderAll(); }, { sound: false }));
      styleEls.set(s, b);
      styles.append(b);
    }
    const grid = h('div.dr-grid');
    const bar = h('div.dr-bar');
    const panel = h('div.dr-panel', tabs, styles, grid, bar);

    const screen = h('div.bg-soft.dr-screen', ui.header('Le dressing de Radia ♡', close), bal, stage, panel);
    ui.showScreen(screen);

    // ---------------------------------------------------------- rendu
    const missing = (id: ItemId): string | null => {
      const c = isHairId(id) ? W.canBuyHair(id) : W.canBuy(id, 'coins');
      if (c.ok || c.reason === 'owned') return null;
      return c.reason === 'fabric' ? `Il te manque ${(isHairId(id) ? 0 : W.priceOf(id).fabric) - res('fabric')} tissus` : `Il te manque ${(isHairId(id) ? W.hairPrice(id) : W.priceOf(id).coins) - res('coins')} pièces`;
    };

    const items = (): ItemId[] => {
      if (tab === 'hair') return [...HAIR_IDS];
      return (Object.keys(CLOTHES) as ClothId[]).filter((id) => CLOTHES[id].slot === tab && (style === 'all' || CLOTHES[id].styles.includes(style)));
    };

    const ownedNow = (id: ItemId) => (isHairId(id) ? W.ownsHair(id) : W.owns(id));
    const wornNow = (id: ItemId) => (isHairId(id) ? W.getLook().hair === id : W.isEquipped(id));

    function card(id: ItemId): HTMLElement {
      const own = ownedNow(id);
      const worn = own && wornNow(id);
      const c = h(`button.dr-card${worn ? '.worn' : own ? '.own' : ''}${preview === id ? '.try' : ''}`, { 'aria-label': nameOf(id), 'aria-pressed': preview === id });
      const status = h('div.dr-status');
      if (worn) status.append(h('span.dr-pill.worn', icon('heart', 12), 'Porté'));
      else if (own) status.append(h('span.dr-pill.own', icon('check', 12), 'Possédé'));
      else if (isHairId(id)) status.append(price(HAIRS[id].coins, 0, 0));
      else { const p = W.priceOf(id); status.append(price(p.coins, p.fabric, p.diamonds)); }
      c.append(h('div.dr-thumb', h('img', { src: thumbUrl(id), alt: '', loading: 'lazy', decoding: 'async' })), h('div.dr-name', nameOf(id)), status);
      if (!isHairId(id)) c.append(h('div.dr-dots', ...CLOTHES[id].styles.slice(0, 3).map((s) => h(`i.sd.${s}`, { title: STYLE_NAMES[s] }))));
      c.addEventListener('click', tap(() => pick(id), { sound: false }));
      return c;
    }

    function price(coins: number, fabric: number, dia: number): HTMLElement {
      const p = h('div.dr-price');
      if (coins > 0) p.append(h('span.pr', h('img', { src: resIconUrl('coins', 32), alt: '' }), String(coins)));
      else p.append(h('span.pr.free', 'Offert'));
      if (fabric > 0) p.append(h('span.pr', h('img', { src: resIconUrl('fabric', 32), alt: '' }), String(fabric)));
      if (dia > 0) p.append(h('span.pr.dia', h('img', { src: diamondUrl(32), alt: '' }), String(dia)));
      return p;
    }

    function renderBar() {
      bar.textContent = '';
      if (!preview) {
        bar.append(h('p.dr-hint', 'Touche un vêtement pour l’essayer sur Radia ♡'));
        return;
      }
      const id = preview;
      const own = ownedNow(id);
      const info = h('div.dr-bar-info', h('b', nameOf(id)), own ? h('small', 'Déjà dans ton dressing') : (isHairId(id) ? price(HAIRS[id].coins, 0, 0) : (() => { const p = W.priceOf(id); return price(p.coins, p.fabric, p.diamonds); })()));
      const stop = h('button.icon-btn.dr-x', { 'aria-label': 'Arrêter l’essayage', on: { click: tap(() => { preview = null; renderAll(); paint(); }) } }, icon('close', 20));
      const go = h(`button.btn.small${missing(id) ? '.locked' : ''}`, own ? 'Porter' : 'Acheter');
      go.addEventListener('click', tap(() => { if (own) { wear(id); preview = null; renderAll(); } else void purchase(id); }));
      bar.append(stop, info, go);
    }

    function renderAll() {
      refreshBal();
      for (const [k, el] of tabEls) { el.classList.toggle('on', k === tab); el.setAttribute('aria-selected', String(k === tab)); }
      styles.classList.toggle('off', tab === 'hair');
      for (const [k, el] of styleEls) el.classList.toggle('on', k === style);
      grid.textContent = '';
      const list = items();
      if (!list.length) grid.append(h('p.dr-empty', 'Rien dans ce style pour l’instant.'));
      for (const id of list) grid.append(card(id));
      renderBar();
      styleBadge.textContent = '';
      styleBadge.append(icon('sparkle', 14), `${STYLE_NAMES[W.styleOf(shown())]}`);
      tryBadge.classList.toggle('on', !!preview && !ownedNow(preview));
      refreshSlots();
      paint();
    }

    // ---------------------------------------------------------- actions
    function pick(id: ItemId) {
      if (preview === id) { preview = null; renderAll(); return; }
      if (ownedNow(id)) {
        preview = null;
        wear(id, true);
        renderAll();
        return;
      }
      audio.play('pickup');
      preview = id;
      expr = 'smile';
      renderAll();
      twirl('smile');
    }

    /** Porte une pièce possédée (ou retire celle qui est déjà portée, sauf haut / bas / robe / coiffure). */
    function wear(id: ItemId, toggle = false) {
      if (isHairId(id)) {
        if (W.getLook().hair === id) return;
        const r = W.setHair(id);
        if (!r.ok) return fail(r.reason);
        audio.play('sparkle');
        twirl('love');
        reactAuguste('hair', 0.35);
        return;
      }
      const slot = CLOTHES[id].slot;
      if (toggle && W.isEquipped(id) && slot !== 'top' && slot !== 'bottom' && slot !== 'dress') {
        W.unequip(id);
        audio.play('drop');
        paintNow();
        return;
      }
      const r = W.equip(id);
      if (!r.ok) return fail(r.reason);
      audio.play('heart');
      twirl('love');
      const look = W.getLook();
      reactAuguste(W.isElegant(look) ? 'outfitElegant' : 'outfit', W.isElegant(look) ? 0.55 : 0.3);
    }

    function fail(reason?: string) {
      audio.play('invalid');
      ui.toast({ title: 'Oups…', sub: reason === 'not-owned' ? 'Cette pièce n’est pas encore à toi' : 'Impossible pour le moment', icon: 'info' });
    }

    async function purchase(id: ItemId) {
      const hair = isHairId(id);
      const p = hair ? { coins: HAIRS[id].coins, fabric: 0, diamonds: 0 } : W.priceOf(id);
      const coinOk = hair ? W.canBuyHair(id).ok : W.canBuy(id, 'coins').ok;
      const diaOk = !hair && p.diamonds > 0 && W.canBuy(id, 'diamonds').ok;
      if (!coinOk && !diaOk) {
        audio.play('invalid');
        ui.toast({ title: missing(id) ?? 'Pas assez de ressources', sub: 'Continue de fusionner pour en gagner ♡', icon: 'info' });
        return;
      }
      const body = h('div.dr-confirm', h('img', { src: thumbUrl(id), alt: '' }), h('b', nameOf(id)), price(p.coins, p.fabric, p.diamonds),
        h('small', `Dans ta bourse : ${fmt(res('coins'))} pièces · ${fmt(res('fabric'))} tissus · ${fmt(wallet.diamonds())} diamants`));
      const actions = [] as { label: string; value: string; style?: 'primary' | 'secondary' | 'lavande' | 'gold' }[];
      if (coinOk) actions.push({ label: 'Acheter', value: 'coins' });
      if (diaOk) actions.push({ label: `Payer ${p.diamonds} diamants`, value: 'diamonds', style: 'lavande' });
      actions.push({ label: 'Plus tard', value: 'no', style: 'secondary' });
      const v = await ui.modal({ title: 'Acheter cette pièce ?', body, actions });
      if (v !== 'coins' && v !== 'diamonds') return;
      const r = hair ? W.buyHair(id) : W.buy(id, v);
      if (!r.ok) return fail(r.reason);
      refreshBal();
      await buyCelebration(id);
    }

    function buyCelebration(id: ItemId): Promise<void> {
      return new Promise((done) => {
        audio.play('reward');
        later(() => audio.play('pop2', 1.2), 160);
        const dl = dpr();
        const mini = h('canvas.dr-cel-av');
        mini.width = Math.round(96 * dl); mini.height = Math.round(240 * dl);
        const look = W.previewLook(W.getLook(), id);
        const draw = (e: Expr, arms?: 'heart') => {
          const c = mini.getContext('2d')!;
          c.clearRect(0, 0, mini.width, mini.height);
          c.drawImage(avatarCanvas(look, mini.width, mini.height, { expr: e, arms }), 0, 0);
        };
        draw('laugh');
        later(() => draw('love', 'heart'), 900);
        const stars = h('div.dr-cel-stars');
        const big = h('div.dr-cel-item', h('img', { src: thumbUrl(id), alt: '' }));
        const end = (wearNow: boolean) => {
          layer.classList.add('out');
          later(() => layer.remove(), 220);
          if (wearNow) {
            if (isHairId(id)) W.setHair(id); else W.equip(id);
            preview = null;
            audio.play('heart');
            const l = W.getLook();
            reactAuguste(isHairId(id) ? 'hair' : W.isElegant(l) ? 'outfitElegant' : 'outfit', 0.6);
            renderAll();
            twirl('love');
          } else {
            preview = null;
            reactAuguste('outfitBuy', 0.5);
            renderAll();
          }
          done();
        };
        const layer = h('div.dr-cel',
          h('div.dr-cel-card',
            h('div.dr-cel-title', 'Nouveau dans ton dressing !'),
            h('div.dr-cel-stage', big, stars, mini),
            h('b.dr-cel-name', nameOf(id)),
            h('div.dr-cel-actions',
              h('button.btn', { on: { click: tap(() => end(true)) } }, 'Porter maintenant'),
              h('button.btn.secondary.small', { on: { click: tap(() => end(false)) } }, 'Plus tard'))));
        screen.append(layer);
        burst(stars, 14, 'star');
        later(() => burst(stars, 10, 'heart'), 450);
        if (!reducedFx()) { mini.classList.add('jump'); }
        if (balCoins.parentElement) balCoins.parentElement.classList.add('bump');
        later(() => balCoins.parentElement?.classList.remove('bump'), 700);
      });
    }

    // ---------------------------------------------------------- looks favoris
    async function favoriteSheet(i: number) {
      const f = W.favorites()[i];
      const input = h('input.dr-name-input', { type: 'text', maxLength: W.NAME_MAX, value: f?.name ?? `Look ${i + 1}`, 'aria-label': 'Nom du look', autocomplete: 'off', spellcheck: false }) as HTMLInputElement;
      const cur = W.getLook();
      const dl = dpr();
      const mk = (look: Look, label: string) => {
        const c = h('canvas.dr-sheet-av');
        c.width = Math.round(64 * dl); c.height = Math.round(160 * dl);
        c.getContext('2d')!.drawImage(avatarCanvas(look, c.width, c.height, { expr: 'smile' }), 0, 0);
        return h('div.dr-sheet-col', c, h('small', label));
      };
      const body = h('div.dr-sheet',
        h('div.dr-sheet-row', ...(f ? [mk(f.look, 'Enregistré')] : []), mk(cur, 'Ma tenue')),
        h('label.dr-label', 'Nom du look', input));
      const actions = [] as { label: string; value: string; style?: 'primary' | 'secondary' | 'lavande' | 'gold' }[];
      if (f) actions.push({ label: 'Porter ce look', value: 'equip' });
      actions.push({ label: f ? 'Remplacer par ma tenue' : 'Sauvegarder ma tenue', value: 'save', style: f ? 'lavande' : 'primary' });
      if (f) actions.push({ label: 'Renommer', value: 'rename', style: 'secondary' });
      actions.push({ label: 'Fermer', value: 'close', style: 'secondary' });
      const v = await ui.modal({ title: `Mon look ${i + 1}`, body, actions });
      if (v === 'save') {
        const r = W.saveLook(i, input.value);
        if (r.ok) { audio.play('check'); ui.toast({ title: 'Look sauvegardé ♡', sub: W.favorites()[i]?.name, icon: 'heart' }); burst(right, 6, 'heart'); }
      } else if (v === 'equip') {
        preview = null;
        const r = W.equipFavorite(i);
        if (r.ok) { audio.play('heart'); twirl('love'); const l = W.getLook(); reactAuguste(W.isElegant(l) ? 'outfitElegant' : 'outfit', 0.4); }
      } else if (v === 'rename') {
        const r = W.renameFavorite(i, input.value);
        if (r.ok) audio.play('check'); else { audio.play('invalid'); ui.toast({ title: 'Choisis un nom', sub: '1 à 24 caractères', icon: 'info' }); }
      }
      renderAll();
    }

    // ---------------------------------------------------------- tutoriel très court
    if (firstTime('tip.dressing')) {
      const tip = h('div.dr-tip', h('b', 'Bienvenue dans ton dressing ♡'), h('span', 'Touche une pièce pour l’essayer. Elle est à toi ? Radia la porte aussitôt.'),
        h('button.btn.small', { on: { click: tap(() => { tip.classList.add('out'); later(() => tip.remove(), 240); }) } }, 'Compris'));
      panel.append(tip);
    }

    const off = events.on('economy', () => { refreshBal(); });
    renderAll();

    function close() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      off();
      busy = false;
      resolve();
    }
  });
}
