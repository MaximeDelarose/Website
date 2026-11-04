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
/** Snapchien : jaune vif, objectif d'appareil avec reflet et étoile. */
export function snapIcon(size = 52): HTMLElement {
  const id = `si${uid++}`;
  return wrap(size, `<svg viewBox="0 0 64 64" width="__S__" height="__S__"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe14d"/><stop offset="1" stop-color="#ffc400"/></linearGradient></defs>` +
    `<rect x="2" y="2" width="60" height="60" rx="17" fill="url(#${id})"/>` +
    `<path d="M13 23h8l3-5h16l3 5h8v24H13z" fill="#fff"/>` +
    `<circle cx="32" cy="34" r="9.5" fill="#ffb800"/><circle cx="32" cy="34" r="5.5" fill="#fff" opacity=".9"/><circle cx="29.5" cy="31.5" r="2" fill="#ff5f9b"/>` +
    `<path d="M48 8.5l1.6 3.7 3.7 1.6-3.7 1.6L48 19l-1.6-3.6-3.7-1.6 3.7-1.6z" fill="#fff"/></svg>`);
}
