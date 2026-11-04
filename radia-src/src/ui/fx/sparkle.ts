/**
 * Paillettes réutilisables (DOM + CSS + Web Animations, aucune dépendance) pour mettre en valeur
 * un NOUVEL objet : révélation, éclat d'étoiles, confettis, éclosion, doré légendaire, scintillement
 * du bracelet d'Auguste. Tout vit dans une couche fixe qui ne capte jamais les touchers.
 * Animations réduites (`reducedMotion` / effets réduits) : version statique et douce (halo + 3 étoiles
 * qui s'estompent, sans mouvement). Le nombre de particules est plafonné globalement.
 */
import './fx.css';
import { reducedFx } from '../../core/app';
import { shineAt, SHINE_PERIOD } from '../../game/art/world/wristShine';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type FxKind = 'item' | 'furniture' | 'dress' | 'bag' | 'flower' | 'building' | 'bracelet';

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9FB4C7', uncommon: '#6FCF97', rare: '#5AA9FF', epic: '#B07CFF', legendary: '#FFC857',
};
/** Particules de base par rareté (avant plafonds). */
export const RARITY_COUNT: Record<Rarity, number> = { common: 6, uncommon: 8, rare: 12, epic: 16, legendary: 22 };
/** Plafonds : par appel et simultanés à l'écran. */
export const MAX_PER_CALL = 28;
export const MAX_LIVE = 64;

export type Shape = 'star' | 'dot' | 'heart' | 'petal' | 'conf';
export interface Particle { shape: Shape; color: string; dx: number; dy: number; rot: number; size: number; dur: number; delay: number; fall: number }

// ------------------------------------------------------------------ logique pure (testable sans DOM)

/** Rareté d'un objet d'après son prix (pièces, diamants) ; un cadeau unique est légendaire. */
export function rarityForPrice(coins: number, diamonds = 0, gift = false): Rarity {
  if (gift) return 'legendary';
  if (diamonds > 0 || coins >= 400) return 'epic';
  if (coins >= 250) return 'rare';
  if (coins >= 120) return 'uncommon';
  return 'common';
}

/** Nombre de particules réellement créées : plafonné par appel, par budget restant et par le mode réduit (3). */
export function particleBudget(requested: number, live: number, reduced: boolean): number {
  const want = Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 0;
  if (reduced) return Math.min(want, 3);
  return Math.max(0, Math.min(want, MAX_PER_CALL, MAX_LIVE - Math.max(0, live)));
}

/** Plan d'un éclat : positions relatives, couleurs et durées (déterministe pour un `rng` donné). */
export function planBurst(opts: { rarity?: Rarity; count?: number; live?: number; reduced?: boolean; rng?: () => number; shapes?: Shape[]; colors?: string[]; radius?: number }): Particle[] {
  const rng = opts.rng ?? Math.random;
  const rarity = opts.rarity ?? 'rare';
  const reduced = !!opts.reduced;
  const n = particleBudget(opts.count ?? RARITY_COUNT[rarity], opts.live ?? 0, reduced);
  const colors = opts.colors ?? [RARITY_COLOR[rarity], '#FFFFFF', '#FFE9A8'];
  const shapes = opts.shapes ?? ['star', 'dot', 'star'];
  const R = opts.radius ?? 54;
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / Math.max(1, n)) * Math.PI * 2 + rng() * 0.7;
    const d = reduced ? 22 + rng() * 14 : R * (0.55 + rng() * 0.9);
    out.push({
      shape: shapes[Math.floor(rng() * shapes.length) % shapes.length], color: colors[Math.floor(rng() * colors.length) % colors.length],
      dx: reduced ? Math.cos(a) * d : Math.cos(a) * d, dy: Math.sin(a) * d - (reduced ? 0 : 10), rot: Math.round(rng() * 160 - 80),
      size: Math.round((reduced ? 9 : 7 + rng() * 9) * 10) / 10, dur: reduced ? 1300 : 650 + rng() * 650, delay: reduced ? 0 : Math.round(rng() * 140), fall: 0,
    });
  }
  return out;
}

/** Plan de confettis : tombent en éventail (plafonné). */
export function planConfetti(opts: { count?: number; live?: number; reduced?: boolean; rng?: () => number }): Particle[] {
  const rng = opts.rng ?? Math.random;
  const reduced = !!opts.reduced;
  const n = particleBudget(opts.count ?? 24, opts.live ?? 0, reduced);
  const cols = ['#FF75A8', '#F3C86B', '#B9A5E8', '#6FCF97', '#5AA9FF', '#FFC0A3'];
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      shape: 'conf', color: cols[i % cols.length], dx: (rng() - 0.5) * (reduced ? 40 : 190), dy: reduced ? -20 : -50 - rng() * 70, rot: Math.round(rng() * 720 - 360),
      size: 6 + Math.round(rng() * 5), dur: reduced ? 1400 : 1100 + rng() * 900, delay: reduced ? 0 : Math.round(rng() * 180), fall: reduced ? 0 : 90 + rng() * 120,
    });
  }
  return out;
}

/** Intervalle (ms) avant le prochain reflet du bracelet à partir de l'instant `t` (s) : suit le cycle de l'avatar. */
export function nextGlintDelay(t: number): number {
  if (!Number.isFinite(t)) return 5000;
  for (let k = 1; k <= 400; k++) {
    const s = t + k * 0.05;
    const prev = shineAt(s - 0.05);
    if (prev === 0 && shineAt(s) > 0) return Math.round(k * 50);
  }
  return Math.round(SHINE_PERIOD * 1000);
}

// ------------------------------------------------------------------ DOM

let layer: HTMLElement | null = null;
let live = 0;
const hasDom = (): boolean => typeof document !== 'undefined' && typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
const reduced = (): boolean => { try { return reducedFx(); } catch { return false; } };

function getLayer(): HTMLElement | null {
  if (!hasDom()) return null;
  if (layer && layer.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'fx-layer';
  layer.setAttribute('aria-hidden', 'true');
  (document.getElementById('ui') ?? document.body).append(layer);
  return layer;
}

function spawn(x: number, y: number, p: Particle): void {
  const L = getLayer();
  if (!L) return;
  const el = document.createElement('i');
  el.className = `fx-p fx-${p.shape}`;
  el.style.setProperty('--c', p.color);
  el.style.width = el.style.height = `${p.size}px`;
  el.style.left = `${x - p.size / 2}px`;
  el.style.top = `${y - p.size / 2}px`;
  if (p.shape === 'heart') { el.textContent = '♥'; el.style.fontSize = `${p.size}px`; }
  L.append(el);
  live++;
  const soft = reduced();
  const frames: Keyframe[] = soft
    ? [{ opacity: 0, transform: `translate(${p.dx}px,${p.dy}px) scale(.8)` }, { opacity: 1, transform: `translate(${p.dx}px,${p.dy}px) scale(1)`, offset: 0.3 }, { opacity: 0, transform: `translate(${p.dx}px,${p.dy}px) scale(1)` }]
    : [
      { opacity: 0, transform: 'translate(0,0) scale(0) rotate(0deg)' },
      { opacity: 1, transform: `translate(${p.dx * 0.6}px,${p.dy * 0.6}px) scale(1.15) rotate(${p.rot / 2}deg)`, offset: 0.35 },
      { opacity: 0, transform: `translate(${p.dx}px,${p.dy + p.fall}px) scale(.5) rotate(${p.rot}deg)` },
    ];
  const a = el.animate(frames, { duration: p.dur, delay: p.delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
  const done = () => { live = Math.max(0, live - 1); el.remove(); };
  a.onfinish = done;
  a.oncancel = done;
}

/** Éclat d'étoiles et de paillettes centré sur (x, y) en pixels de l'écran. */
export function sparkleBurst(x: number, y: number, opts: { rarity?: Rarity; count?: number } = {}): void {
  if (!hasDom() || !Number.isFinite(x) || !Number.isFinite(y)) return;
  for (const p of planBurst({ rarity: opts.rarity, count: opts.count, live, reduced: reduced() })) spawn(x, y, p);
}

/** Confettis qui retombent depuis (x, y). */
export function confetti(x: number, y: number): void {
  if (!hasDom() || !Number.isFinite(x) || !Number.isFinite(y)) return;
  for (const p of planConfetti({ live, reduced: reduced() })) spawn(x, y, p);
}

const centerOf = (el: Element): { x: number; y: number; w: number; h: number } => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
};

/** Halo doux derrière un point (pulsation puis fondu). */
function halo(x: number, y: number, size: number, color: string, ms: number): void {
  const L = getLayer();
  if (!L) return;
  const el = document.createElement('i');
  el.className = 'fx-halo';
  el.style.setProperty('--c', color);
  el.style.width = el.style.height = `${size}px`;
  el.style.left = `${x - size / 2}px`;
  el.style.top = `${y - size / 2}px`;
  L.append(el);
  const soft = reduced();
  const a = el.animate(soft
    ? [{ opacity: 0 }, { opacity: 0.8, offset: 0.25 }, { opacity: 0.8, offset: 0.7 }, { opacity: 0 }]
    : [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 0.95, transform: 'scale(1)', offset: 0.22 }, { opacity: 0.55, transform: 'scale(1.12)', offset: 0.6 }, { opacity: 0, transform: 'scale(1.3)' }],
  { duration: ms, easing: 'ease-out', fill: 'both' });
  a.onfinish = () => el.remove();
  a.oncancel = () => el.remove();
}

/** Nouvel objet : rebond léger, halo de sa rareté, étoiles et paillettes, puis il reste interactif (rien n'est bloqué). */
export function revealItem(el: Element, opts: { rarity?: Rarity; kind?: FxKind } = {}): Promise<void> {
  const rarity = opts.rarity ?? 'rare';
  if (!hasDom() || !el.isConnected) return Promise.resolve();
  const c = centerOf(el);
  const color = RARITY_COLOR[rarity];
  const big = opts.kind === 'building' || opts.kind === 'furniture' ? 1.25 : 1;
  const ms = rarity === 'legendary' ? 3200 : rarity === 'epic' ? 2800 : 2200;
  halo(c.x, c.y, Math.max(70, Math.min(260, Math.max(c.w, c.h) * 1.7 * big)), color, ms);
  if (!reduced()) {
    el.animate([{ transform: 'scale(.55)', opacity: 0.2 }, { transform: 'scale(1.14)', opacity: 1, offset: 0.55 }, { transform: 'scale(.96)', offset: 0.78 }, { transform: 'scale(1)' }], { duration: 560, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }
  sparkleBurst(c.x, c.y, { rarity, count: opts.kind === 'bag' ? Math.min(8, RARITY_COUNT[rarity]) : undefined });
  if (!reduced() && (rarity === 'epic' || rarity === 'legendary')) window.setTimeout(() => sparkleBurst(c.x, c.y, { rarity, count: 10 }), 420);
  if (rarity === 'legendary') legendaryGold(el);
  if (opts.kind === 'building') window.setTimeout(() => confetti(c.x, c.y - c.h * 0.4), 260);
  return new Promise((r) => window.setTimeout(r, reduced() ? 300 : 700));
}

/** Éclosion en un point de l'écran (pas d'élément à animer) : halo rose et pétales. */
export function bloomAt(x: number, y: number): void {
  if (!hasDom() || !Number.isFinite(x) || !Number.isFinite(y)) return;
  halo(x, y, 90, '#FF9EC4', 1400);
  for (const p of planBurst({ count: 9, live, reduced: reduced(), shapes: ['petal', 'petal', 'dot'], colors: ['#FF9EC4', '#FFD3E2', '#FFFFFF'], radius: 40 })) spawn(x, y, p);
}

/** Éclosion d'une fleur : elle s'ouvre (échelle + légère rotation) en lâchant quelques pétales. */
export function bloom(el: Element): void {
  if (!hasDom() || !el.isConnected) return;
  const c = centerOf(el);
  if (!reduced()) el.animate([{ transform: 'scale(.25) rotate(-25deg)', opacity: 0 }, { transform: 'scale(1.18) rotate(6deg)', opacity: 1, offset: 0.6 }, { transform: 'scale(1) rotate(0)' }], { duration: 700, easing: 'cubic-bezier(.34,1.4,.64,1)' });
  halo(c.x, c.y, Math.max(60, c.w * 1.6), '#FF9EC4', 1400);
  for (const p of planBurst({ count: 9, live, reduced: reduced(), shapes: ['petal', 'petal', 'dot'], colors: ['#FF9EC4', '#FFD3E2', '#FFFFFF'], radius: 40 })) spawn(c.x, c.y, p);
}

/** Objet légendaire : lueur dorée qui respire quelques secondes + reflet. */
export function legendaryGold(el: Element): void {
  if (!hasDom() || !el.isConnected) return;
  const c = centerOf(el);
  halo(c.x, c.y, Math.max(90, Math.max(c.w, c.h) * 1.9), RARITY_COLOR.legendary, 3400);
  if (!reduced()) {
    el.animate([{ filter: 'drop-shadow(0 0 0 rgba(255,200,87,0))' }, { filter: 'drop-shadow(0 0 10px rgba(255,200,87,.95))' }, { filter: 'drop-shadow(0 0 3px rgba(255,200,87,.5))' }, { filter: 'drop-shadow(0 0 10px rgba(255,200,87,.95))' }, { filter: 'drop-shadow(0 0 0 rgba(255,200,87,0))' }], { duration: 3200, easing: 'ease-in-out' });
    sparkleBurst(c.x, c.y, { rarity: 'legendary', count: 14 });
  }
}

/**
 * Scintillement personnel du bracelet d'Auguste sur un élément qui le montre (ex. sa vignette) :
 * de petites étoiles dorées au même rythme que le reflet de l'avatar. Renvoie `stop()`.
 * (x, y) = position relative (0..1) du poignet dans l'élément. Rien en mode réduit.
 */
export function braceletTwinkle(el: Element, pos: { x?: number; y?: number } = {}): () => void {
  if (!hasDom() || reduced()) return () => undefined;
  let stopped = false;
  let timer = 0;
  const fx = pos.x ?? 0.5;
  const fy = pos.y ?? 0.5;
  const tick = () => {
    if (stopped || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && !document.hidden) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      spawn(x, y, { shape: 'star', color: '#FFF3C4', dx: -5, dy: -9, rot: 40, size: 11, dur: 900, delay: 0, fall: 0 });
      spawn(x, y, { shape: 'star', color: '#FF8DB4', dx: 9, dy: -3, rot: -30, size: 7, dur: 800, delay: 160, fall: 0 });
    }
    timer = window.setTimeout(tick, nextGlintDelay(performance.now() / 1000) + 200);
  };
  timer = window.setTimeout(tick, 600);
  return () => { stopped = true; window.clearTimeout(timer); };
}
