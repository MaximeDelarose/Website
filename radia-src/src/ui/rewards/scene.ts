/**
 * Mise en scène d'ouverture (DOM + Canvas 2D), réutilisable partout :
 * 1 apparition · 2 invitation à toucher · 3 pré-ouverture (secousse, tension) · 4 ouverture (flash, confettis)
 * · 5 révélation (récompenses une à une, puis vol vers les compteurs) · 6 confirmation.
 * Calque PROPRE (`rw-*`) qui est entièrement retiré à la fin, y compris sur sortie anticipée ; le calque de
 * paillettes partagé du jeu n'est jamais utilisé. Les récompenses sont déjà attribuées quand la scène démarre.
 */
import './rewards.css';
import { h } from '../dom';
import { holdInterface, mountInLayer, pruneLayer } from './layer';
import { audio, reducedFx } from '../../core/app';
import { haptic } from '../../core/haptics';
import { raysUrl } from '../../game/art/world/giftArt';
import { boxUrl, haloUrl, loadThumbs, rewardIconUrl, shadowUrl } from './art';
import { createFx, type FxEngine } from './fx';
import {
  BANK_LABEL, RARITY_COLOR, RARITY_NAME, bankOf, lookFor, qtyText, rarityIndex, rewardRarity, timeline,
  type BankType,
} from './logic';
import type { GiftSpec, RewardHost, Shown } from './types';

import { PARTNER } from '../../config/gift';
export interface PreparedGift { spec: GiftSpec; shown: Shown[] }

/** Ralenti pour les captures d'écran (outil de test : `RADIA.rewards.slow(8)`) ; 1 en jeu. */
const slow = (): number => { const v = (typeof window !== 'undefined' ? (window as unknown as { __rwSlow?: number }).__rwSlow : 1) ?? 1; return Number.isFinite(v) && v >= 1 && v <= 30 ? v : 1; };

const active = new Set<{ destroy: () => void }>();
export const sceneOpen = (): boolean => active.size > 0;
/** Ferme tout de suite toutes les scènes (démontage, tests). */
export function destroyAllScenes(): void { for (const s of [...active]) s.destroy(); }

const STAR_COL = ['#FFFFFF', '#FFE9A8', '#FFC0D3', '#D9CDF5'];
const CONF_COL = ['#FF75A8', '#F3C86B', '#B9A5E8', '#6FCF97', '#5AA9FF', '#FFC0A3'];
const HEART_COL = ['#FF75A8', '#FFB3CC', '#FFFFFF', '#E8558F'];
const EASE_POP = 'cubic-bezier(.34,1.56,.64,1)';

export interface GiftAction { label: string; run: () => void }

export function playGifts(gifts: PreparedGift[], host: RewardHost, actions: GiftAction[] = []): Promise<void> {
  return new Promise<void>((resolve) => {
    const reduced = reducedFx();
    let dead = false;
    let fast = false;
    let openAll = false;
    let ducked = false;
    const timers = new Set<number>();
    const rafs = new Set<number>();
    const wakers = new Set<() => void>();
    let tapResolve: (() => void) | null = null;
    /** Toucher donné pendant l'apparition : pris en compte à l'invitation (jamais perdu). */
    let earlyTap = false;
    let acceptEarly = false;

    const root = h('div.rw-root', { role: 'dialog', 'aria-modal': 'true', 'aria-label': gifts[0]?.spec.title ?? 'Cadeau' });
    const dim = h('div.rw-dim');
    const flash = h('div.rw-flash');
    root.append(dim);
    if (reduced) root.classList.add('rw-calm');
    const fx: FxEngine = createFx(root, reduced, slow);

    // ---------------------------------------------------------------- outils
    const later = (fn: () => void, ms: number) => { const t = window.setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms * slow()); timers.add(t); };
    /** Attente interrompue par « Passer ». */
    const wait = (ms: number) => new Promise<void>((res) => {
      if (dead) return res();
      let t = 0;
      const done = () => { window.clearTimeout(t); timers.delete(t); wakers.delete(done); res(); };
      t = window.setTimeout(done, Math.max(0, ms) * slow());
      timers.add(t); wakers.add(done);
    });
    const wake = () => { for (const w of [...wakers]) w(); };
    const mode = () => (reduced ? 'reduced' : fast ? 'fast' : 'normal') as 'normal' | 'fast' | 'reduced';
    const anim = (el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Animation | null => {
      if (dead || reduced || typeof el.animate !== 'function') return null;
      try { const k = slow(); return el.animate(frames, k > 1 ? { ...opts, duration: Number(opts.duration ?? 0) * k, delay: Number(opts.delay ?? 0) * k } : opts); } catch { return null; }
    };
    const center = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };

    // ---------------------------------------------------------------- compteurs (haut de l'écran)
    const owed: Partial<Record<BankType, number>> = {};
    for (const g of gifts) for (const r of g.shown) { const b = bankOf(r); if (b) owed[b] = (owed[b] ?? 0) + r.qty; }
    const shownVal: Partial<Record<BankType, number>> = {};
    const bankEl = h('div.rw-bank');
    const chips: Partial<Record<BankType, { el: HTMLElement; val: HTMLElement; ico: HTMLElement }>> = {};
    for (const t of Object.keys(owed) as BankType[]) {
      let base = 0;
      try { base = Math.max(0, host.balance(t) - (owed[t] ?? 0)); } catch { base = 0; }
      shownVal[t] = base;
      const type = t === 'flowers' || t === 'fabric' || t === 'cocoa' ? 'res' : t;
      const ico = h('img', { src: rewardIconUrl({ type, id: type === 'res' ? t : undefined }, 40), alt: '', draggable: false });
      const val = h('b', base.toLocaleString('fr-FR'));
      const el = h('div.rw-chip', { 'data-t': t, title: BANK_LABEL[t] }, ico, val);
      chips[t] = { el, val, ico };
      bankEl.append(el);
    }
    root.append(bankEl);

    const countTo = (t: BankType, to: number, ms: number) => {
      const c = chips[t];
      if (!c) return;
      const from = shownVal[t] ?? 0;
      shownVal[t] = to;
      if (reduced || ms <= 0 || from === to) { c.val.textContent = to.toLocaleString('fr-FR'); return; }
      const t0 = performance.now();
      const step = (now: number) => {
        const u = Math.max(0, Math.min(1, (now - t0) / ms));
        c.val.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - u, 3))).toLocaleString('fr-FR');
        if (u < 1 && !dead) { const id = requestAnimationFrame(step); rafs.add(id); } else c.val.textContent = to.toLocaleString('fr-FR');
      };
      const id = requestAnimationFrame(step); rafs.add(id);
    };
    const bump = (t: BankType) => { const c = chips[t]; if (c) anim(c.el, [{ transform: 'scale(1)' }, { transform: 'scale(1.28)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 360, easing: EASE_POP }); };

    // ---------------------------------------------------------------- pied : bouton principal, « Passer », « Tout ouvrir »
    const primary = h('button.btn.gold.rw-primary', { type: 'button' }, 'Continuer');
    const skip = h('button.rw-link.rw-skip', { type: 'button', 'aria-label': 'Passer l\'animation' }, 'Passer ›');
    const all = h('button.rw-link.rw-all', { type: 'button' }, 'Tout ouvrir ✦');
    const acts = h('div.rw-acts');
    let afterAction: (() => void) | null = null;
    const foot = h('div.rw-foot', acts, primary, h('div.rw-foot2', all, skip));
    primary.style.visibility = 'hidden';
    root.append(flash, foot);
    let primaryResolve: (() => void) | null = null;
    primary.addEventListener('click', () => { const r = primaryResolve; primaryResolve = null; primary.style.visibility = 'hidden'; if (r) r(); });
    skip.addEventListener('click', (e) => { e.stopPropagation(); fast = true; wake(); const r = tapResolve; tapResolve = null; if (r) r(); });
    all.addEventListener('click', (e) => { e.stopPropagation(); openAll = true; fast = true; all.style.display = 'none'; wake(); const r = tapResolve; tapResolve = null; if (r) r(); });
    root.addEventListener('click', (e) => {
      if ((e.target as Element).closest('.rw-foot')) return;
      const r = tapResolve; tapResolve = null;
      if (r) r(); else if (acceptEarly) earlyTap = true;
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { fast = true; wake(); const r = tapResolve; tapResolve = null; if (r) r(); }
      else if ((e.key === 'Enter' || e.key === ' ') && tapResolve) { e.preventDefault(); const r = tapResolve; tapResolve = null; r(); }
    };
    document.addEventListener('keydown', onKey);

    // ---------------------------------------------------------------- fin propre
    const handle = { destroy: () => finish(true) };
    let finished = false;
    const watchdog = window.setInterval(() => { if (!dead && !root.isConnected) finish(true); }, 700);
    function finish(immediate: boolean): void {
      if (finished) return;
      finished = true;
      dead = true;
      window.clearInterval(watchdog);
      timers.forEach((t) => window.clearTimeout(t)); timers.clear();
      rafs.forEach((r) => cancelAnimationFrame(r)); rafs.clear();
      wakers.clear();
      document.removeEventListener('keydown', onKey);
      fx.destroy();
      if (ducked) { try { audio.duckRelease(); } catch { /* ignoré */ } }
      active.delete(handle);
      const end = () => {
        root.remove(); pruneLayer(); releaseUi(); resolve();
        const a = afterAction; afterAction = null;
        if (a) window.setTimeout(() => { try { a(); } catch (e) { console.error('[rewards] action', e); } }, 0);
      };
      if (immediate || reduced || typeof root.animate !== 'function') { end(); return; }
      root.style.pointerEvents = 'none';
      root.classList.add('rw-gone');
      window.setTimeout(end, 230);
    }
    active.add(handle);
    const releaseUi = holdInterface();
    mountInLayer(root);

    // ---------------------------------------------------------------- un cadeau
    async function runGift(index: number): Promise<void> {
      const g = gifts[index];
      const look = lookFor(g.spec.kind, g.spec.rarity);
      const last = index === gifts.length - 1;
      if (!openAll) fast = false;
      const W = root.clientWidth || window.innerWidth;
      const H = root.clientHeight || window.innerHeight;
      const size = Math.round(Math.max(120, Math.min(236, W * 0.62, H * 0.32)));
      root.style.setProperty('--rw-art', `${size}px`);
      root.style.setProperty('--rw-glow', look.palette.glow);
      root.style.setProperty('--rw-main', look.palette.main);
      root.style.setProperty('--rw-rc', RARITY_COLOR[g.spec.rarity]);
      root.dataset.kind = g.spec.kind;
      root.dataset.rarity = g.spec.rarity;
      root.classList.toggle('rw-love', look.hearts);
      all.style.display = gifts.length > 1 && !openAll && !last ? '' : 'none';
      skip.style.visibility = 'visible';
      primary.style.visibility = 'hidden';
      primary.textContent = last ? (g.spec.kind === 'chest' || g.spec.kind === 'event' || g.spec.kind === 'premium' ? 'Continuer' : 'Super !') : 'Suivant';

      // décor
      const title = h('h2.rw-title', g.spec.title);
      const sub = h('p.rw-sub', g.spec.subtitle ?? '');
      if (!g.spec.subtitle) sub.classList.add('empty');
      const badge = h('span.rw-badge', { style: `--bc:${RARITY_COLOR[g.spec.rarity]}` }, RARITY_NAME[g.spec.rarity]);
      const steps = gifts.length > 1 ? h('div.rw-steps', ...gifts.map((_, i) => h(`i${i === index ? '.on' : i < index ? '.done' : ''}`))) : null;
      const days = g.spec.day ? h('div.rw-days', { 'aria-label': `Jour ${g.spec.day.n} sur ${g.spec.day.of}` },
        ...Array.from({ length: g.spec.day.of }, (_, i) => h(`i${i + 1 < g.spec.day!.n ? '.done' : i + 1 === g.spec.day!.n ? '.cur' : ''}`, i + 1 < g.spec.day!.n ? '✓' : String(i + 1)))) : null;

      const halo = h('img.rw-halo', { src: haloUrl(look.palette.glow, 256), alt: '', draggable: false });
      const aura = look.aura ? h('img.rw-aura', { src: raysUrl('#FFE9A8', 360), alt: '', draggable: false }) : null;
      const shadow = h('img.rw-shadow', { src: shadowUrl(220), alt: '', draggable: false });
      const body = h('img.rw-body', { src: boxUrl(look.art, 'body', look.palette), alt: '', draggable: false });
      const lid = h('img.rw-lid', { src: boxUrl(look.art, 'lid', look.palette), alt: '', draggable: false });
      const box = h('div.rw-box', body, lid);
      const artBtn = h('button.rw-art', { type: 'button', 'aria-label': look.invite }, h('div.rw-inner', halo, aura, shadow, box));
      const hint = h('p.rw-hint', look.invite);
      const grid = h(`div.rw-rewards${g.shown.length > 6 ? '.dense' : ''}`);
      const bubble = g.spec.message ? h('div.rw-msg', h('span.rw-msg-av', '♡'), h('div', h('small', `${PARTNER}`), h('p', g.spec.message))) : null;
      const main = h('div.rw-main', title, sub, days, steps, h('div.rw-artwrap', artBtn, badge), hint, h('div.rw-scroll', grid, bubble));
      const stage = h('div.rw-stage', main);
      root.insertBefore(stage, foot);
      anim(stage, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' });

      // 1) apparition
      earlyTap = false; acceptEarly = true;
      let T = timeline(look, mode());
      title.classList.add('pop');
      audio.play(look.tier >= 2 ? 'pop4' : 'pop1', 0.9);
      anim(artBtn, [{ transform: 'translateY(60px) scale(.25)', opacity: 0 }, { transform: 'translateY(-10px) scale(1.12)', opacity: 1, offset: 0.62 }, { transform: 'translateY(0) scale(.97)', offset: 0.82 }, { transform: 'none', opacity: 1 }], { duration: T.appear + 120, easing: 'cubic-bezier(.3,.8,.4,1)' });
      anim(halo, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 0.85, transform: 'scale(1)' }], { duration: T.appear + 200, fill: 'forwards', easing: 'ease-out' });
      if (aura) anim(aura, [{ opacity: 0 }, { opacity: 0.5 }], { duration: 700, fill: 'forwards' });
      await wait(Math.min(220, T.appear * 0.4));
      let c = center(box);
      fx.burst(c.x, c.y, { kind: 'star', n: 6 + look.tier * 2, colors: STAR_COL, speed: 170, gravity: 40, life: 1.0, size: 9 });
      if (look.hearts) fx.burst(c.x, c.y, { kind: 'heart', n: 8, colors: HEART_COL, speed: 90, gravity: -60, life: 1.8, size: 9 });
      else fx.burst(c.x, c.y - size * 0.2, { kind: 'conf', n: 6 + look.tier * 2, colors: CONF_COL, speed: 190, gravity: 330, up: 160, life: 1.5, size: 8 });
      await wait(T.appear * 0.6);

      // 2) invitation à toucher (obligatoire, sauf « Passer » / « Tout ouvrir »)
      acceptEarly = false;
      if (!fast && !earlyTap) {
        hint.classList.add('on');
        artBtn.classList.add('idle');
        await new Promise<void>((res) => { tapResolve = res; });
        tapResolve = null;
      }
      hint.classList.remove('on');
      hint.classList.add('off');
      artBtn.classList.remove('idle');
      if (dead) return;

      // 3) pré-ouverture : tremble, tension, lumière qui monte
      T = timeline(look, mode());
      haptic('select');
      if (!fast && !reduced) {
        audio.play('giftTension');
        const n = 14;
        const frames: Keyframe[] = Array.from({ length: n + 1 }, (_, i) => {
          const u = i / n, amp = look.shake * (0.4 + u * 1.3);
          return { transform: `translateX(${(i % 2 ? 1 : -1) * amp * 0.9}px) rotate(${(i % 2 ? -1 : 1) * amp}deg) scale(${1 + u * 0.1})`, filter: `brightness(${1 + u * 0.3})` };
        });
        anim(box, frames, { duration: T.pre, easing: 'linear' });
        anim(halo, [{ opacity: 0.5, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.55)' }], { duration: T.pre, fill: 'forwards', easing: 'ease-in' });
        const tick = window.setInterval(() => haptic('select'), 90);
        timers.add(tick);
        for (let k = 0; k < 3; k++) later(() => { const cc = center(box); fx.burst(cc.x, cc.y - size * 0.15, { kind: 'star', n: 3 + look.tier, colors: STAR_COL, speed: 200, gravity: 0, life: 0.7, size: 8, spread: Math.PI * 0.9 }); }, (T.pre * (k + 1)) / 4);
        await wait(T.pre);
        window.clearInterval(tick); timers.delete(tick);
      } else if (reduced) {
        halo.style.opacity = '1';
        await wait(T.pre);
      } else await wait(T.pre);
      if (dead) return;

      // 4) ouverture : flash, couvercle qui s'envole, confettis, étoiles, pluie de paillettes
      T = timeline(look, mode());
      c = center(box);
      const topY = c.y - size * 0.1;
      audio.play('giftBurst', 0.9 + look.tier * 0.04);
      if (look.sfx === 'rare') audio.play('popRare');
      else if (look.sfx === 'epic') { audio.play('giftEpic'); audio.play('sparkle'); }
      else if (look.sfx === 'legendary') { audio.play('giftEpic', 1.15); audio.play('bigWin'); audio.play('crystal'); }
      else if (look.sfx === 'love') { audio.play('giftLove'); audio.play('heart'); }
      haptic(look.haptic);
      if (!reduced && (look.tier >= 3 || look.hearts)) { try { audio.duckHold(0.3, 0.6); ducked = true; } catch { /* ignoré */ } }
      if (!reduced) {
        anim(flash, [{ opacity: 0 }, { opacity: look.flash, offset: 0.18 }, { opacity: 0 }], { duration: 480, easing: 'ease-out' });
        anim(lid, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${size * 0.12}px,${-size * 0.7}px) rotate(26deg)`, opacity: 0 }], { duration: 640, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
        anim(body, [{ transform: 'scale(1.14,.88)' }, { transform: 'scale(.97,1.05)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 460, easing: EASE_POP });
        anim(halo, [{ opacity: 1, transform: 'scale(1.3)' }, { opacity: 1, transform: 'scale(2.1)' }, { opacity: 0.8, transform: 'scale(1.6)' }], { duration: 700, fill: 'forwards', easing: 'ease-out' });
        if (aura) anim(aura, [{ opacity: 0.5 }, { opacity: 1 }], { duration: 600, fill: 'forwards', easing: 'ease-out' });
      } else { lid.style.opacity = '0'; flash.style.opacity = '0'; }
      lid.classList.add('open');
      fx.burst(c.x, topY, { kind: 'star', n: look.burst.stars, colors: [RARITY_COLOR[g.spec.rarity], ...STAR_COL], speed: 340, gravity: 120, life: 1.2, size: 12 });
      fx.burst(c.x, topY, { kind: 'conf', n: look.burst.confetti, colors: CONF_COL, speed: 360, gravity: 520, up: 240, life: 1.9, size: 9, spread: Math.PI * 1.1 });
      if (look.hearts) fx.burst(c.x, topY, { kind: 'heart', n: look.burst.hearts, colors: HEART_COL, speed: 200, gravity: -30, life: 2.2, size: 12 });
      fx.rain(look.burst.rainMs, { kind: look.hearts ? 'heart' : 'star', n: 2, colors: look.hearts ? HEART_COL : [...STAR_COL, RARITY_COLOR[g.spec.rarity]], speed: 30, gravity: 150, life: 1.8, size: look.hearts ? 9 : 8, every: 110, area: () => ({ x: W / 2, y: -10, w: W }) });
      badge.classList.add('on');
      title.classList.add('hot');
      await wait(T.open);
      if (dead) return;

      // 5) révélation : les récompenses sortent du coffre une à une
      // le contenant s'efface et libère la place (mise en page stable AVANT que les cartes n'apparaissent)
      c = center(box);
      artBtn.classList.add('gone');
      hint.remove();
      await wait(reduced ? 0 : fast ? 60 : 330);
      if (dead) return;
      const cards = g.shown.map((r, i) => {
        const rar = rewardRarity(r, g.spec.rarity);
        const q = qtyText(r);
        const ico = h('img', { src: rewardIconUrl(r, 72), alt: '', draggable: false });
        const gl = h('i.rw-card-glow');
        const card = h(`div.rw-card.r-${rar}${r.dup ? '.dup' : ''}`, { style: `--rc:${RARITY_COLOR[rar]}` },
          gl, h('div.rw-card-ico', ico), q ? h('b.rw-qty', q) : null, h('span.rw-name', r.name), r.dup ? h('small.rw-dupnote', 'Déjà à toi : converti ♡') : null);
        card.style.opacity = '0';
        grid.append(card);
        return { r, card, ico, rar, i };
      });
      await wait(40);
      for (const k of cards) {
        if (dead) return;
        const t = timeline(look, mode());
        const to = center(k.card);
        k.card.style.opacity = '1';
        anim(k.card, [
          { transform: `translate(${c.x - to.x}px,${c.y - to.y - 20}px) scale(.15)`, opacity: 0 },
          { transform: 'translate(0,-10px) scale(1.18)', opacity: 1, offset: 0.7 },
          { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.25,.9,.35,1)' });
        const ri = rarityIndex(k.rar);
        const p = center(k.card);
        fx.burst(p.x, p.y, { kind: 'star', n: [3, 4, 6, 9, 12][ri], colors: [RARITY_COLOR[k.rar], '#FFFFFF', '#FFE9A8'], speed: 150, gravity: 60, life: 0.9, size: 8 });
        if (ri >= 3) fx.burst(p.x, p.y, { kind: 'conf', n: 8, colors: CONF_COL, speed: 220, gravity: 380, up: 140, life: 1.2, size: 7, spread: Math.PI * 1.2 });
        k.card.classList.add('in');
        audio.play(ri >= 2 ? 'popRare' : k.i === 0 ? 'sparkle' : 'pop4', 1 + Math.min(0.5, k.i * 0.07));
        haptic(ri >= 3 ? 'rare' : 'select');
        await wait(t.revealStep + (ri >= 3 && !fast && !reduced ? 220 : 0));
      }
      if (bubble) {
        bubble.classList.add('on');
        audio.play(look.hearts ? 'heart' : 'select');
        await wait(fast ? 80 : 480);
      }
      await wait(fast ? 60 : 420);
      if (dead) return;

      // ... puis les ressources volent vers les compteurs du haut
      const T2 = timeline(look, mode());
      let n = 0;
      let landed = 0;
      const flights: Promise<void>[] = [];
      for (const k of cards) {
        const bt = bankOf(k.r);
        if (!bt || !chips[bt]) continue;
        const from = center(k.ico);
        const dest = center(chips[bt]!.ico);
        const delay = n++ * T2.flyStagger;
        flights.push(new Promise<void>((res) => {
          later(() => {
            const arrive = () => {
              const cur = shownVal[bt] ?? 0;
              countTo(bt, cur + k.r.qty, 420);
              bump(bt);
              k.card.classList.add('flown');
              audio.play(bt === 'tickets' ? 'ticketGet' : bt === 'diamonds' ? 'chipWin' : 'select', 1 + Math.min(0.6, landed++ * 0.08));
              res();
            };
            if (reduced || fast) { arrive(); return; }
            const fl = h('img.rw-fly', { src: k.ico.src, alt: '', draggable: false });
            fl.style.left = `${from.x - from.w / 2}px`; fl.style.top = `${from.y - from.h / 2}px`; fl.style.width = `${from.w}px`; fl.style.height = `${from.h}px`;
            root.append(fl);
            k.ico.style.visibility = 'hidden';
            const dx = dest.x - from.x, dy = dest.y - from.y;
            const a = anim(fl, [
              { transform: 'translate(0,0) scale(1)', opacity: 1 },
              { transform: `translate(${dx * 0.3}px,${dy * 0.3 + 46}px) scale(1.12)`, opacity: 1, offset: 0.3 },
              { transform: `translate(${dx}px,${dy}px) scale(.36)`, opacity: 0.95 }], { duration: T2.fly, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' });
            const done = () => { fl.remove(); k.ico.style.visibility = ''; arrive(); };
            if (a) { a.onfinish = done; a.oncancel = () => fl.remove(); } else done();
          }, delay);
        }));
      }
      if (flights.length) await Promise.race([Promise.all(flights), wait(T2.fly + n * T2.flyStagger + 900)]);
      if (dead) return;

      // 6) confirmation
      if (openAll && !last) {
        await wait(900);
        anim(stage, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
        await wait(180);
        stage.remove();
        return;
      }
      if (last) for (const a of actions.slice(0, 2)) {
        const b = h('button.btn.lavande.small.rw-act', { type: 'button' }, a.label);
        b.addEventListener('click', () => { afterAction = a.run; const r = primaryResolve; primaryResolve = null; primary.style.visibility = 'hidden'; if (r) r(); });
        acts.append(b);
      }
      primary.style.visibility = 'visible';
      skip.style.visibility = 'hidden';
      all.style.display = 'none';
      anim(primary, [{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'none' }], { duration: 360, easing: EASE_POP });
      await new Promise<void>((res) => { primaryResolve = res; });
      if (!last) {
        anim(stage, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-26px)' }], { duration: 200, fill: 'forwards' });
        await wait(fast ? 40 : 200);
      }
      stage.remove();
    }

    void (async () => {
      try {
        await loadThumbs();
        for (let i = 0; i < gifts.length && !dead; i++) await runGift(i);
      } catch (e) {
        console.error('[rewards] scène', e);
      } finally {
        finish(false);
      }
    })();
  });
}

