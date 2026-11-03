/**
 * Icônes de l'interface (SVG en ligne, trait arrondi homogène 2.4 px).
 * icon('heart') renvoie un élément <svg>.
 */
const P: Record<string, string> = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  handset: '<path d="M5.2 3.5h3.3l1.6 4.2-2 1.4a10.6 10.6 0 004.8 4.8l1.4-2 4.2 1.6v3.3a1.9 1.9 0 01-2 1.9A15.6 15.6 0 013.3 5.5a1.9 1.9 0 011.9-2z" fill="currentColor"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.8"/><path d="M10.5 18.2h3"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.6"/><path d="M3.6 7.2l8.4 6 8.4-6"/>',
  camera: '<path d="M4 8.2h3l1.6-2.4h6.8L17 8.2h3V19H4z"/><circle cx="12" cy="13.4" r="3.4"/>',
  chat: '<path d="M4 5.5h16v11H9.5L5 19.8V16.5H4z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  pause: '<rect x="7" y="5" width="3.5" height="14" rx="1.5" fill="currentColor"/><rect x="13.5" y="5" width="3.5" height="14" rx="1.5" fill="currentColor"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor"/>',
  'music-off': '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor"/><path d="M3 3l18 18"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>',
  album: '<rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/><path d="M8 3.5v17"/><path d="M14 12.5c-1.6-1.4-3-2.2-3-3.5a1.5 1.5 0 013-.3 1.5 1.5 0 013 .3c0 1.3-1.4 2.1-3 3.5z" fill="currentColor"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  cup: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  chess: '<path d="M9 20h6M8 17h8l-1-3H9z"/><path d="M10 14l-.5-4.5h5L14 14"/><circle cx="12" cy="6.5" r="2.6"/>',
  queen: '<path d="M5 18h14l-1.5-8-3.5 4-2-6-2 6-3.5-4z" fill="currentColor"/><path d="M6 21h12"/>',
  crown: '<path d="M4 17h16l-1.5-9-4.5 4.5L12 6l-2 6.5L5.5 8z" fill="currentColor"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z" fill="currentColor"/>',
  star: '<path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z" fill="currentColor"/>',
  sparkle: '<path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z" fill="currentColor"/>',
  wand: '<path d="M5 19l10-10"/><path d="M17 3l.8 2.2L20 6l-2.2.8L17 9l-.8-2.2L14 6l2.2-.8z" fill="currentColor"/>',
  wind: '<path d="M3 9h11a3 3 0 10-3-3M3 14h15a3 3 0 11-3 3M3 11.5h7"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="10" rx="2.5" fill="currentColor"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  refresh: '<path d="M19 12a7 7 0 11-2.1-5"/><path d="M19 4.5V8h-3.5"/>',
  undo: '<path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 010 10h-2"/>',
  flag: '<path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/>',
  hint: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3z"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" fill="currentColor"/>',
  flower: '<circle cx="12" cy="9" r="2.4" fill="currentColor"/><path d="M12 4.2a2.6 2.6 0 012.4 3.6 2.6 2.6 0 012.2 4 2.6 2.6 0 01-3.9 1.6 2.6 2.6 0 01-1.4 0 2.6 2.6 0 01-3.9-1.6 2.6 2.6 0 012.2-4A2.6 2.6 0 0112 4.2z"/><path d="M12 14v7M12 18c-2 0-3.5-1-4-2.5M12 19c1.5 0 3-.8 3.5-2"/>',
  arc: '<path d="M4 20V8h16v12M4 8l1-3h14l1 3"/><path d="M9 20v-5a3 3 0 016 0v5"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/>',
  infinity: '<path d="M7.5 15.5a3.5 3.5 0 110-7c3 0 6 7 9 7a3.5 3.5 0 100-7c-3 0-6 7-9 7z"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4.2 4.2 0 007 0"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/>',
  map: '<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-2.5 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2.5 3-5 3z"/>',
  basket: '<path d="M4 10h16l-1.5 9.5h-13z"/><path d="M8 10l3-6M16 10l-3-6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
};

export function icon(name: string, size = 24): SVGSVGElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? P.info}</svg>`;
  return wrap.firstChild as SVGSVGElement;
}

export const iconNames = Object.keys(P);
