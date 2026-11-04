/** Icône originale de « Tindeur » : un cœur-flamme blanc sur dégradé pêche → rose (dessin maison, aucune marque réelle). */
const NS = 'http://www.w3.org/2000/svg';
let uid = 0;
export function tindeurLogo(size = 56, withBg = true): SVGElement {
  const id = `tg${uid++}`;
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 64 64'); s.setAttribute('width', String(size)); s.setAttribute('height', String(size));
  s.innerHTML = `${withBg ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb36b"/><stop offset="1" stop-color="#ff4f8b"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#${id})"/>` : ''}` +
    `<path d="M32 55C14 43 9 31 17 22.5c5.2-5.4 12-3.4 15 1.6 3-5 9.8-7 15-1.6C55 31 50 43 32 55z" fill="${withBg ? '#fff' : '#ff4f8b'}"/>` +
    `<path d="M32 5.5c4.6 5.4 8.2 8.6 5 15.2-1.2-2.6-3.2-3.8-5-5.4-1.8 1.6-3.8 2.8-5 5.4-3.2-6.6.4-9.8 5-15.2z" fill="${withBg ? '#fff' : '#ff9a62'}"/>`;
  return s;
}
