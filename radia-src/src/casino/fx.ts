/** Effets de jeu partagés du casino : compteur qui défile, tickets qui volent, célébrations (plafonnées, doux en mode réduit). */
import { audio, reducedFx } from '../core/app';
import { haptic } from '../core/haptics';
import { confetti, sparkleBurst } from '../ui/fx/sparkle';
import { ticketUrl } from '../game/art/world/giftArt';
import { fmt } from '../core/wallet';
import { pickLine } from '../data/augusteTone';

import { PARTNER } from '../config/gift';
export interface Pt { x: number; y: number }
export const centerOf = (el: Element): Pt => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));
export { wait };
export const soft = (): boolean => { try { return reducedFx(); } catch { return false; } };

/** Fait défiler un compteur de `from` à `to` (instantané en mode réduit). */
export function rollNumber(el: HTMLElement, from: number, to: number, ms = 900): Promise<void> {
  if (soft() || from === to || !el.isConnected) { el.textContent = fmt(to); return Promise.resolve(); }
  return new Promise((resolve) => {
    const t0 = performance.now();
    let lastTick = 0;
    const step = (now: number) => {
      if (!el.isConnected) { resolve(); return; }
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - p) ** 3;
      el.textContent = fmt(from + (to - from) * e);
      if (to > from && now - lastTick > 70 && p < 1) { lastTick = now; audio.play('chip', 1 + p * 0.5); }
      if (p < 1) requestAnimationFrame(step); else { el.textContent = fmt(to); resolve(); }
    };
    requestAnimationFrame(step);
  });
}

let flying = 0;
const MAX_FLY = 18;

/** Tickets qui volent de `from` vers `target` (le compteur). Au plus ~10 par appel, 18 à l'écran ; en mode réduit : juste une pulsation. */
export async function flyChips(from: Pt, target: Element, count: number, _value = 25): Promise<void> {
  const n = Math.max(0, Math.min(10, Math.ceil(count), MAX_FLY - flying));
  const to = centerOf(target);
  const pulse = () => { try { target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' }); } catch { /* ignoré */ } };
  if (n === 0 || soft() || typeof Element.prototype.animate !== 'function') { pulse(); await wait(soft() ? 200 : 0); return; }
  const layer = document.getElementById('ui') ?? document.body;
  const jobs: Promise<void>[] = [];
  for (let i = 0; i < n; i++) {
    const img = document.createElement('img');
    img.src = ticketUrl(44); img.alt = ''; img.draggable = false;
    img.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px;pointer-events:none;z-index:400;will-change:transform,opacity;filter:drop-shadow(0 2px 3px rgba(30,18,56,.4))';
    layer.append(img);
    flying++;
    const sx = from.x + (Math.random() - 0.5) * 50, sy = from.y + (Math.random() - 0.5) * 24;
    const mx = (sx + to.x) / 2 + (Math.random() - 0.5) * 90, my = Math.min(sy, to.y) - 40 - Math.random() * 40;
    const a = img.animate([
      { transform: `translate(${sx - 15}px,${sy - 15}px) scale(.3) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${sx - 15}px,${sy - 15}px) scale(1.15) rotate(40deg)`, opacity: 1, offset: 0.14 },
      { transform: `translate(${mx - 15}px,${my - 15}px) scale(1) rotate(220deg)`, offset: 0.55 },
      { transform: `translate(${to.x - 15}px,${to.y - 15}px) scale(.55) rotate(420deg)`, opacity: 0.9 },
    ], { duration: 760 + i * 20, delay: i * 70, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
    jobs.push(new Promise((res) => {
      const fin = () => { flying = Math.max(0, flying - 1); img.remove(); audio.play('ticketGet', 1 + i * 0.05); if (i % 3 === 0) pulse(); res(); };
      a.onfinish = fin; a.oncancel = fin;
    }));
  }
  await Promise.all(jobs);
}

export type Level = 'small' | 'mid' | 'big' | 'jackpot';

/** Niveau de célébration d'après le gain net en multiples de la mise. */
export function levelFor(win: number, stake: number): Level | null {
  if (win <= 0 || stake <= 0) return null;
  const r = win / stake;
  return r >= 100 ? 'jackpot' : r >= 20 ? 'big' : r >= 4 ? 'mid' : r > 1 ? 'small' : null;
}

/** Célébration d'un gain, de plus en plus riche mais jamais agressive. Les particules passent par sparkle.ts (plafonnées). */
export function celebrate(level: Level, at: Pt): void {
  const bursts: [number, number, number, 'uncommon' | 'rare' | 'epic' | 'legendary'][] = {
    small: [[0, 0, 8, 'uncommon']], mid: [[0, 0, 14, 'rare'], [260, -40, 8, 'rare']],
    big: [[0, 0, 20, 'epic'], [240, -50, 14, 'epic'], [480, 50, 12, 'rare']],
    jackpot: [[0, 0, 24, 'legendary'], [220, -70, 18, 'legendary'], [440, 70, 18, 'epic'], [660, 0, 20, 'legendary']],
  }[level] as [number, number, number, 'uncommon' | 'rare' | 'epic' | 'legendary'][];
  for (const [d, dx, n, r] of bursts) window.setTimeout(() => sparkleBurst(at.x + dx, at.y, { rarity: r, count: n }), d);
  if (level === 'big' || level === 'jackpot') window.setTimeout(() => confetti(at.x, at.y - 40), 120);
  if (level === 'jackpot') window.setTimeout(() => confetti(at.x - 60, at.y - 60), 520);
  audio.play(level === 'jackpot' ? 'jackpot' : level === 'big' ? 'bigWin' : level === 'mid' ? 'reward' : 'chipWin');
  if (level === 'mid') window.setTimeout(() => audio.play('chipWin'), 260);
  haptic(level === 'small' ? 'chipWin' : level === 'mid' ? 'reward' : 'chest');
  if (level === 'jackpot' && !soft()) glowScreen();
}

/** Voile doré très doux (une seule pulsation lente, pas de clignotement). */
function glowScreen(): void {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:310;background:radial-gradient(circle at 50% 45%,rgba(255,226,140,.32),rgba(255,160,200,.12) 55%,transparent 75%)';
  document.body.append(el);
  const a = el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], { duration: 1800, easing: 'ease-in-out' });
  a.onfinish = () => el.remove(); a.oncancel = () => el.remove();
}

/** Petit rebond / secousse d'un élément (ignoré en mode réduit). */
export function bounce(el: Element, amp = 1.12): void { if (!soft() && el.isConnected) el.animate([{ transform: 'scale(1)' }, { transform: `scale(${amp})` }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
export function shake(el: Element): void { if (!soft() && el.isConnected) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 320 }); }

/**
 * GROSSE VICTOIRE (virtuelle) : courte bannière dorée, décompte progressif du gain, félicitations.
 * Pas de clignotement : un fondu, une lente rotation de rayons (désactivée en mode réduit). ~2,6 s, un toucher la ferme.
 * Jamais appelée pour une perte ni un gain égal à la mise : l'appelant ne la montre que pour un gain net >= 20 fois la mise.
 */
export function bigWinBanner(net: number, level: 'big' | 'jackpot'): Promise<void> {
  const host = document.getElementById('ui') ?? document.body;
  const quick = soft();
  const num = document.createElement('b'); num.className = 'cz-bw-num'; num.textContent = '+0';
  const card = document.createElement('div'); card.className = `cz-bw-card ${level}`;
  const title = document.createElement('div'); title.className = 'cz-bw-title'; title.textContent = level === 'jackpot' ? '♛ JACKPOT ♛' : '✦ GROSSE VICTOIRE ✦';
  // félicitations + une réplique d'Auguste (rare : seulement pour les grosses victoires)
  const sub = document.createElement('div'); sub.className = 'cz-bw-sub';
  let quip = ''; try { quip = pickLine('reward', Math.random, { noGalbi: true }); } catch { /* sans réplique */ }
  sub.textContent = (level === 'jackpot' ? 'Incroyable, Radia ! Les lustres en tremblent ♡' : 'Bravo Radia, quelle belle chance ♡') + (quip ? ` — ${PARTNER} : « ${quip} »` : '');
  const unit = document.createElement('small'); unit.textContent = net > 1 ? 'tickets' : 'ticket';
  const rays = document.createElement('i'); rays.className = 'cz-bw-rays';
  card.append(rays, title, num, unit, sub);
  const wrap = document.createElement('div'); wrap.className = `cz-bw${quick ? ' soft' : ''}`; wrap.setAttribute('role', 'status'); wrap.append(card);
  host.append(wrap);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; wrap.classList.add('out'); window.setTimeout(() => { wrap.remove(); resolve(); }, 260); };
    wrap.addEventListener('click', finish);
    const t0 = performance.now(), dur = quick ? 400 : 1500;
    const tick = (now: number) => {
      if (done || !wrap.isConnected) return;
      const p = Math.min(1, (now - t0) / dur), e = 1 - (1 - p) ** 3;
      num.textContent = `+${fmt(Math.round(net * e))}`;
      if (p < 1) requestAnimationFrame(tick); else window.setTimeout(finish, quick ? 1100 : 1100);
    };
    requestAnimationFrame(tick);
    if (!quick) { let k = 0; const iv = window.setInterval(() => { if (done || k++ > 16) { window.clearInterval(iv); return; } audio.play('chip', 1 + k * 0.03); }, 90); }
  });
}
