/**
 * Bulles-cadeaux : de temps en temps, une petite bulle flotte à l'écran. Si on la touche, elle éclate
 * et livre une récompense (pièces, diamants, énergie, fleurs, tissu, cacao). Si on la laisse passer,
 * elle s'éloigne toute seule : aucune pénalité. Jamais pendant un moment important.
 */
import { h } from '../dom';
import { ui } from '../ui';
import { audio, events, reducedFx } from '../../core/app';
import { addRes } from '../../core/world';
import { wallet } from '../../core/wallet';
import { safeToNotify } from '../../events/scheduler';
import { resIconUrl } from '../../game/art/world/resources';
import { diamondUrl } from '../screens/shop';

export type GiftKind = 'coins' | 'diamonds' | 'energy' | 'flowers' | 'fabric' | 'cocoa';
export interface Gift { kind: GiftKind; amount: number }

/** Tirage pondéré d'une récompense (pur : testable). `r` ∈ [0,1[. */
export function rollGift(r1: number, r2: number): Gift {
  const t = r1 * 100;
  const span = (a: number, b: number) => a + Math.floor(r2 * (b - a + 1));
  if (t < 52) return { kind: 'coins', amount: span(20, 60) };
  if (t < 66) return { kind: 'diamonds', amount: span(1, 3) };
  if (t < 82) return { kind: 'energy', amount: span(10, 25) };
  if (t < 90) return { kind: 'flowers', amount: span(2, 5) };
  if (t < 96) return { kind: 'fabric', amount: span(1, 3) };
  return { kind: 'cocoa', amount: span(2, 5) };
}

const LABEL: Record<GiftKind, string> = { coins: 'pièces', diamonds: 'diamants', energy: 'énergie', flowers: 'fleurs', fabric: 'tissu', cocoa: 'cacao' };

function applyGift(g: Gift): void {
  if (g.kind === 'diamonds') wallet.giveDiamonds(g.amount);
  else if (g.kind === 'energy') wallet.giveEnergy(g.amount);
  else addRes(g.kind, g.amount);
  events.emit('economy', undefined);
}

let current: HTMLElement | null = null;
let started = false;
let playedMs = 0;
let nextAt = 150_000;
let last = Date.now();

function spawn(): void {
  if (current) return;
  const fromLeft = Math.random() < 0.5;
  const y = 28 + Math.random() * 30; // % de la hauteur : ni sous le HUD ni sur la barre d'outils
  const el = h('button.gift-bub', { 'aria-label': 'Cadeau à récupérer', style: `--y:${y}%;--dir:${fromLeft ? 1 : -1};${fromLeft ? 'left' : 'right'}:-80px` },
    h('span.gb-ball', h('i.gb-ribbon'), h('i.gb-bow', '♡')), h('i.gb-glint'));
  current = el;
  ui.root.append(el);
  audio.play('pop1');
  const done = () => { if (current === el) current = null; el.remove(); };
  el.addEventListener('click', () => {
    if (!el.classList.contains('go')) return;
    el.classList.remove('go');
    el.classList.add('pop');
    const g = rollGift(Math.random(), Math.random());
    applyGift(g);
    audio.play('reward');
    audio.play('sparkle');
    const icon = g.kind === 'diamonds' ? diamondUrl(48) : g.kind === 'energy' ? '' : resIconUrl(g.kind, 48);
    const rect = el.getBoundingClientRect();
    const vw = ui.root.clientWidth || window.innerWidth;
    const cx = Math.min(vw - 90, Math.max(90, rect.left + rect.width / 2));
    const toast = h('div.gb-reward', { style: `left:${cx}px;top:${Math.max(70, rect.top)}px` }, icon ? h('img', { src: icon, alt: '' }) : h('span', '⚡'), h('b', `+${g.amount} ${LABEL[g.kind]}`));
    ui.root.append(toast);
    if (!reducedFx()) for (let i = 0; i < 10; i++) ui.root.append(h('i.gb-spark', { style: `left:${cx}px;top:${Math.max(70, rect.top) + 20}px;--a:${i * 36}deg` }));
    window.setTimeout(() => { document.querySelectorAll('.gb-spark').forEach((s) => s.remove()); toast.remove(); }, 1800);
    window.setTimeout(done, 300);
  });
  window.requestAnimationFrame(() => el.classList.add('go'));
  // elle s'éloigne toute seule
  window.setTimeout(() => { if (current === el && !el.classList.contains('pop')) { el.classList.add('leave'); window.setTimeout(done, 600); } }, 12_000);
}

export function startGiftBubbles(): void {
  if (started) return;
  started = true;
  last = Date.now();
  window.setInterval(() => {
    const now = Date.now();
    const dt = Math.min(10_000, now - last);
    last = now;
    if (document.hidden || current || !safeToNotify()) return;
    playedMs += dt;
    if (playedMs < nextAt) return;
    playedMs = 0;
    nextAt = 4 * 60_000 + Math.random() * 3 * 60_000; // ensuite toutes les 4 à 7 minutes de jeu
    spawn();
  }, 5000);
}

/** Debug : fait apparaître une bulle tout de suite. */
export const spawnGiftNow = (): void => spawn();
