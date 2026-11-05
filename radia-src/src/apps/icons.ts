/** Icônes ORIGINALES des deux applications (dessin maison, aucune marque réelle). */
let uid = 0;
function wrap(size: number, svg: string): HTMLElement {
  const s = document.createElement('span');
  s.style.cssText = `display:inline-flex;width:${size}px;height:${size}px;line-height:0`;
  s.innerHTML = svg.split("__S__").join(String(size));
  return s;
}
/** TikTak : dégradé violet → rose, cœur-lecture blanc et petite étincelle. */
export function clipsIcon(size = 52): HTMLElement {
  const id = `ci${uid++}`;
  return wrap(size, `<svg viewBox="0 0 64 64" width="__S__" height="__S__"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f6cf0"/><stop offset="1" stop-color="#ff5f9b"/></linearGradient></defs>` +
    `<rect x="2" y="2" width="60" height="60" rx="17" fill="url(#${id})"/>` +
    `<path d="M32 51C16 40 11 30 18 22.5c4.6-4.7 10.6-3 14 1.6 3.4-4.6 9.4-6.3 14-1.6C53 30 48 40 32 51z" fill="#fff"/>` +
    `<path d="M27.5 27.5v11.5l10-5.750z" fill="#b567e8"/><path d="M48 8.5l1.6 3.7 3.7 1.6-3.7 1.6L48 19l-1.6-3.6-3.7-1.6 3.7-1.6z" fill="#fff" opacity=".9"/></svg>`);
}
/**
 * Snapchien : fond jaune vif, petite mascotte BLANCHE « chien-fantôme » (corps de fantôme à bas ondulé, oreilles tombantes de chien,
 * truffe, langue rose). Dessin original, lisible dès 40 px : contour sombre, grands yeux, aucune ressemblance avec un logo existant.
 */
export function snapIcon(size = 52): HTMLElement {
  const id = `si${uid++}`;
  return wrap(size, `<svg viewBox="0 0 64 64" width="__S__" height="__S__"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffea3d"/><stop offset="1" stop-color="#ffc700"/></linearGradient></defs>` +
    `<rect x="2" y="2" width="60" height="60" rx="17" fill="url(#${id})"/>` +
    // oreilles tombantes (derrière le corps)
    `<path d="M17.500 17.500C8.500 15 6.500 27.500 9.500 35.500c2.200 3.600 6.800 2.200 8.700-3.200z" fill="#fff" stroke="#2a2a33" stroke-width="2.200" stroke-linejoin="round"/>` +
    `<path d="M46.500 17.500c9-2.500 11 10 8 18-2.200 3.600-6.800 2.200-8.700-3.200z" fill="#fff" stroke="#2a2a33" stroke-width="2.200" stroke-linejoin="round"/>` +
    // corps de fantôme, bas ondulé
    `<path d="M32 9.500C21 9.500 15.500 18 15.500 28.500V48c0 3.800 3.200 4.800 5.200 2.800 1.800-1.800 3.800-1.900 5.600.2 1.700 2 3.800 2 5.700 0 1.900-2 3.900-2 5.700 0 1.800 2 3.900 2 5.600-.2 2-2 5.200-1 5.200 2.800V28.500C48.500 18 43 9.500 32 9.500z" fill="#fff" stroke="#2a2a33" stroke-width="2.200" stroke-linejoin="round"/>` +
    // visage
    `<circle cx="25.500" cy="28" r="3" fill="#2a2a33"/><circle cx="38.500" cy="28" r="3" fill="#2a2a33"/><circle cx="26.500" cy="27" r="1" fill="#fff"/><circle cx="39.500" cy="27" r="1" fill="#fff"/>` +
    `<ellipse cx="32" cy="34" rx="3.600" ry="2.600" fill="#2a2a33"/><ellipse cx="31" cy="33.200" rx="1" ry=".6" fill="#fff" opacity=".7"/>` +
    `<path d="M32 36.600v1.200M27.600 38.200c1.500 2.800 5.300 2.800 6.800 0" fill="none" stroke="#2a2a33" stroke-width="1.800" stroke-linecap="round"/>` +
    `<path d="M30 40.200c.4 3.400 3.600 3.400 4 0z" fill="#ff7aa8" stroke="#2a2a33" stroke-width="1.200" stroke-linejoin="round"/>` +
    `<ellipse cx="20.500" cy="35" rx="2.800" ry="1.800" fill="#ff9bbf" opacity=".6"/><ellipse cx="43.500" cy="35" rx="2.800" ry="1.800" fill="#ff9bbf" opacity=".6"/>` +
    `</svg>`);
}
