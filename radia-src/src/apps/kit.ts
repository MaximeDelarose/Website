import './apps.css';
/** Petits éléments d'interface partagés par Clips et Snap (DOM). */
import { haptic } from '../core/haptics';
import { audio, reducedFx } from '../core/app';

const NS = 'http://www.w3.org/2000/svg';
const P: Record<string, string> = {
  heart: '<path d="M12 20.5s-8-4.8-8-10.700A4.4 4.4 0 0112 7a4.4 4.4 0 018 2.800c0 5.9-8 10.7-8 10.700z"/>',
  comment: '<path d="M4 5.500h16v11H10l-5 4v-4H4z"/>',
  bookmark: '<path d="M6.5 3.500h11v17L12 16l-5.5 4.500z"/>',
  share: '<path d="M4 12.500l16-8-5.5 16-3-6.500z"/><path d="M11.5 14l4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20.500a2 2 0 004 0"/>',
  bellOff: '<path d="M6 16V11a6 6 0 019-5.200M18 11v5l1.500 2H8"/><path d="M10 20.500a2 2 0 004 0M4 4l16 16"/>',
  more: '<circle cx="6" cy="12" r="1.400"/><circle cx="12" cy="12" r="1.400"/><circle cx="18" cy="12" r="1.400"/>',
  camera: '<path d="M4 8.200h3l1.6-2.400h6.800L17 8.200h3V19H4z"/><circle cx="12" cy="13.5" r="3.4"/>',
  sparkle: '<path d="M12 3l1.8 6.200L20 11l-6.2 1.800L12 19l-1.8-6.200L4 11l6.2-1.800z"/>',
  trash: '<path d="M5 7h14M9 7V4.500h6V7M7 7l1 13h8l1-13"/>',
  check: '<path d="M5 12.500l4.5 4.500L19 7.5"/>',
  send: '<path d="M4 12l16-7-6 15-2.5-6z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1-4 4-5.5 7.5-5.500s6.5 1.5 7.5 5.5"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  plusMinus: '<path d="M5 12h14"/>',
  rotate: '<path d="M19 12a7 7 0 11-2.1-5"/><path d="M19 4.500V8h-3.5"/>',
  play: '<path d="M8 5.500v13l10.5-6.500z"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
};
export function ico(name: string, size = 24): SVGSVGElement {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', String(size)); s.setAttribute('height', String(size));
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.2');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = P[name] ?? P.sparkle;
  return s;
}
export function fmtCount(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 10_000) return (n / 1000).toFixed(1).replace('.', ',') + ' k';
  if (n < 1_000_000) return Math.round(n / 1000) + ' k';
  return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M';
}
/** Petit retour sonore + haptique discret. */
export function tick(sound: 'pop1' | 'pop2' | 'sparkle' | 'heart' | 'check' | 'reward' = 'pop1'): void {
  haptic('select');
  try { audio.play(sound); } catch { /* son indisponible */ }
}
/** Éclat de cœurs DOM à (x, y) relatif au conteneur. */
export function heartBurst(host: HTMLElement, x: number, y: number, n = 7): void {
  if (reducedFx()) n = 1;
  for (let i = 0; i < n; i++) {
    const e = document.createElement('i');
    e.className = 'apx-heart'; e.textContent = '♥';
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.6, d = n === 1 ? 0 : 30 + Math.random() * 46;
    e.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;--r:${(Math.random() - 0.5) * 50}deg;font-size:${n === 1 ? 64 : 18 + Math.random() * 18}px`;
    host.append(e);
    window.setTimeout(() => e.remove(), 950);
  }
}

/** Petite notification DANS une application (les toasts du jeu passent sous les écrans plein format). */
export function note(host: HTMLElement, title: string, sub?: string, ms = 2600): void {
  host.querySelectorAll('.apx-note').forEach((n, i, all) => { if (all.length >= 2 && i === 0) n.remove(); });
  const el = document.createElement('div');
  el.className = 'apx-note'; el.setAttribute('role', 'status');
  const b = document.createElement('b'); b.textContent = title; el.append(b);
  if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
  host.append(el);
  window.setTimeout(() => { el.classList.add('out'); window.setTimeout(() => el.remove(), 320); }, ms);
}

/** Boucle d'animation à cadence adaptative (≈ 25 i/s, moins si le dessin coûte cher). Renvoie la fonction d'arrêt. */
export function animate(draw: (tSec: number, now: number) => void, minGap = 40): () => void {
  let raf = 0, last = 0, cost = 0;
  const loop = (now: number): void => {
    raf = requestAnimationFrame(loop);
    if (now - last < Math.max(minGap, cost * 2.2)) return;
    last = now;
    const t1 = performance.now();
    draw(now / 1000, now);
    cost = cost * 0.7 + (performance.now() - t1) * 0.3;
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

/** Ajuste `box` (4:5 par défaut) au plus grand rectangle contenu dans `host` ; suit les changements de taille. */
export function fitBox(host: HTMLElement, box: HTMLElement, ratio = 4 / 5): void {
  const fit = (): void => {
    const r = host.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const w = Math.floor(Math.min(r.width, r.height * ratio));
    box.style.width = `${w}px`; box.style.height = `${Math.floor(w / ratio)}px`;
  };
  fit();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(host);
  window.requestAnimationFrame(fit);
}
