/**
 * Effets communs des écrans « carrières » et « fans » : confettis, compteur
 * animé, puces de récompense, et les trois célébrations (palier de carrière,
 * palier de fans, nouvelle couverture de magazine).
 */
import { h, tap } from '../../dom';
import { icon } from '../../icons';
import { ui } from '../../ui';
import { audio, reducedFx } from '../../../core/app';
import { fmt } from '../../../core/wallet';
import { canvasUrl, paint } from '../../../game/art/kit';
import { drawCareerIcon, drawMagazine } from '../../../game/art/world/careers';
import { CAREERS, FAN_TIER_DEFS, FURN_NAMES, MAGAZINES, REWARD_LABELS, type Reward, type TierDef } from '../../../data/world/careers';
import { CAREER_NAMES, type CareerId, type MagazineId } from '../../../data/world/ids';
import { CLOTHES } from '../../../data/world/wardrobe';
import { diamondUrl, energyUrl } from '../shop';
import type { FanTierClaim, GrantedItems } from '../../../game/world/careers';

// ------------------------------------------------------------------ utilitaires
export const careerIconUrl = (id: CareerId, size = 96): string => canvasUrl(`career:${id}:${size}`, () => paint(size, size, 2, (c) => drawCareerIcon(c, id, size)));

/** Compteur animé (ease-out) de `from` à `to`. */
export function countUp(el: HTMLElement, from: number, to: number, ms = 1200, format: (n: number) => string = fmt): () => void {
  if (reducedFx() || from === to) { el.textContent = format(to); return () => undefined; }
  const t0 = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = format(Math.round(from + (to - from) * e));
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/** Confettis (canvas plein écran, ~24 images/s, désactivé en effets réduits). */
export function confetti(ms = 2400, amount = 90): void {
  if (reducedFx()) return;
  const cv = h('canvas.fx-confetti');
  const W = ui.root.clientWidth || 393, H = ui.root.clientHeight || 852;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  ui.root.append(cv);
  const ctx = cv.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const cols = ['#F5B5C8', '#B9A5E8', '#F3C86B', '#FFC0A3', '#FF75A8', '#FFFFFF', '#7FC48A'];
  const ps = Array.from({ length: amount }, () => ({
    x: W * (0.2 + Math.random() * 0.6), y: H * 0.35 + Math.random() * 40, vx: (Math.random() - 0.5) * 9, vy: -6 - Math.random() * 9,
    r: 4 + Math.random() * 5, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[Math.floor(Math.random() * cols.length)], heart: Math.random() < 0.25,
  }));
  const t0 = performance.now();
  let last = 0;
  const frame = (now: number) => {
    const t = now - t0;
    if (t > ms || !cv.isConnected) { cv.remove(); return; }
    if (now - last > 40) {
      last = now;
      ctx.clearRect(0, 0, W, H);
      const fade = Math.min(1, (ms - t) / 600);
      for (const p of ps) {
        p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        if (p.heart) { ctx.beginPath(); ctx.moveTo(0, p.r * 0.9); ctx.bezierCurveTo(-p.r * 1.6, 0, -p.r * 0.8, -p.r * 1.3, 0, -p.r * 0.4); ctx.bezierCurveTo(p.r * 0.8, -p.r * 1.3, p.r * 1.6, 0, 0, p.r * 0.9); ctx.fill(); }
        else ctx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r * 0.66);
        ctx.restore();
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

type RewardKind = 'coins' | 'diamonds' | 'energy' | 'fabric' | 'flowers' | 'cocoa' | 'fans' | 'cloth' | 'furniture';
function chip(kind: RewardKind, text: string): HTMLElement {
  const img = kind === 'diamonds' ? h('img', { src: diamondUrl(40), alt: '' })
    : kind === 'energy' ? h('img', { src: energyUrl(40), alt: '' })
    : h('span.rc-ico', icon(kind === 'fans' ? 'heart' : kind === 'coins' ? 'star' : kind === 'cloth' ? 'gift' : kind === 'furniture' ? 'home' : 'flower', 16));
  return h(`span.rc.rc-${kind}`, img, text);
}

/** Puces de récompense (pièces, diamants, énergie, matériaux, fans, tenues, meubles). */
export function rewardChips(r: Reward, items?: GrantedItems): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const k of ['coins', 'diamonds', 'energy', 'fabric', 'flowers', 'cocoa', 'fans'] as const) if (r[k]) out.push(chip(k, `+${fmt(r[k]!)} ${REWARD_LABELS[k]}`));
  for (const c of r.cloth ?? []) {
    const dup = items && !items.cloth.includes(c);
    out.push(chip('cloth', dup ? `${CLOTHES[c]?.name ?? c} (déjà possédée : pièces)` : (CLOTHES[c]?.name ?? c)));
  }
  for (const f of r.furniture ?? []) out.push(chip('furniture', FURN_NAMES[f] ?? f));
  return out;
}

// ------------------------------------------------------------------ calque de célébration
function layer(inner: Node[], cls = ''): { el: HTMLElement; closed: Promise<void>; close: () => void } {
  let done: () => void = () => undefined;
  const closed = new Promise<void>((r) => { done = r; });
  const el = h(`div.fx-layer${cls ? '.' + cls : ''}`, h('div.fx-rays'), h('div.fx-glow'), ...inner);
  const close = () => { el.classList.add('leaving'); window.setTimeout(() => { el.remove(); done(); }, 240); };
  ui.root.append(el);
  return { el, closed, close };
}

/** Palier de carrière franchi. */
export function showLevelUp(id: CareerId, to: number, tier: TierDef, items: GrantedItems): Promise<void> {
  const btn = h('button.btn.wide', 'Merci ♡');
  const card = h('div.fx-card.panel',
    h('img.fx-badge', { src: careerIconUrl(id, 120), alt: '' }),
    h('small.fx-kicker', `${CAREER_NAMES[id]} · palier ${to} sur 5`),
    h('h2.fx-title', tier.title),
    h('p.fx-sub', tier.goal + ' : réussi !'),
    h('div.rc-row', ...rewardChips(tier.reward, items)),
    btn);
  const L = layer([card]);
  btn.addEventListener('click', tap(L.close));
  audio.play('achievement');
  window.setTimeout(() => { audio.play('reward'); confetti(2600, 80); }, 250);
  return L.closed;
}

/** Palier de fans franchi : compteur animé, lumière, confettis, récompense. */
export function showFanTier(c: FanTierClaim): Promise<void> {
  const prev = c.tier > 0 ? FAN_TIER_DEFS[c.tier - 1].n : 0;
  const count = h('b.fx-count', fmt(prev));
  const btn = h('button.btn.gold.wide', 'Génial ♡');
  const card = h('div.fx-card.panel.fx-fans',
    h('small.fx-kicker', 'Nouveau palier de fans'),
    h('div.fx-heart', icon('heart', 34)),
    h('div.fx-counter', count, h('span', 'fans')),
    h('h2.fx-title', c.def.title),
    h('p.fx-sub', c.def.note),
    c.def.event ? h('p.fx-event', `Événement : ${c.def.event}`) : null,
    h('div.rc-row', ...rewardChips(c.def.reward, c.items)),
    h('small.fx-fict', 'popularité fictive du jeu'),
    btn);
  const L = layer([card], 'fx-big');
  btn.addEventListener('click', tap(L.close));
  audio.play('victory');
  window.setTimeout(() => { countUp(count, prev, c.def.n, 1500); audio.play('reward'); confetti(3200, 130); }, 350);
  window.setTimeout(() => { audio.play('sparkle'); confetti(2400, 70); }, 1700);
  return L.closed;
}

export const magazineUrl = (id: MagazineId, w = 300, h2 = 400, look?: Parameters<typeof drawMagazine>[4], cacheKey = ''): string =>
  look || cacheKey ? paint(w, h2, 2, (c) => drawMagazine(c, id, w, h2, look)).toDataURL('image/png') : canvasUrl(`mag:${id}:${w}`, () => paint(w, h2, 2, (c) => drawMagazine(c, id, w, h2)));

/** Une nouvelle couverture : elle tourne et se pose, avec des éclats. */
export function showMagazineReveal(id: MagazineId): Promise<void> {
  const m = MAGAZINES[id];
  const cover = h('img.mag-cover', { src: paint(300, 400, 2, (c) => drawMagazine(c, id, 300, 400)).toDataURL('image/png'), alt: m.name });
  const sparks = Array.from({ length: 14 }, (_, i) => h('i.mag-spark', { style: `--a:${(i / 14) * 360}deg;--d:${90 + (i % 3) * 30}px;--t:${0.55 + (i % 4) * 0.05}s` }));
  const btn = h('button.btn.wide', 'Superbe ♡');
  const card = h('div.fx-card.fx-mag',
    h('small.fx-kicker.light', 'Nouvelle couverture !'),
    h('div.mag-stage', cover, ...sparks),
    h('h2.fx-title.light', m.name),
    h('p.fx-sub.light', 'Ajoutée à ton album. Tu peux l\'accrocher dans ton château.'),
    btn);
  const L = layer([card], 'fx-mag-layer');
  btn.addEventListener('click', tap(L.close));
  audio.play('page');
  window.setTimeout(() => { audio.play('sparkle'); confetti(1800, 50); }, 700);
  return L.closed;
}

/** Affiche en file les célébrations (une à la fois). */
export async function runQueue(jobs: (() => Promise<void>)[]): Promise<void> {
  for (const j of jobs) await j();
}

export { CAREERS };
