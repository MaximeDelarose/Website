/**
 * Pièces d'échecs en SVG (repère 100 × 100) : silhouettes classiques et très
 * lisibles. Blancs : crème + contour chocolat. Noirs : violet nuit + détails
 * crème. Petites touches romantiques (cœur sur la dame, perles dorées).
 */
export type PieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Side = 'w' | 'b';

const BASE = '<path d="M24 80h52a4 4 0 0 1 4 4v5a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3v-5a4 4 0 0 1 4-4z"/>';

const BODY: Record<PieceKind, string> = {
  p: `<circle cx="50" cy="29" r="12.5"/><path d="M37 45h26l-3 7H40z"/><path d="M41 52c-1 12-7 20-11 28h40c-4-8-10-16-11-28z"/>${BASE}`,
  r: `<path d="M27 16h10v8h7v-8h12v8h7v-8h10v18l-7 6v31l6 9H28l6-9V40l-7-6z"/>${BASE}`,
  b: `<circle cx="50" cy="13" r="5.5"/><path d="M50 19c-14 9-18 22-13 35h26c5-13 1-26-13-35z"/><path d="M35 54h30l-3 7H38z"/><path d="M40 61c0 8-6 13-10 19h40c-4-6-10-11-10-19z"/>${BASE}`,
  n: `<path d="M70 80H31c0-13 6-20 14-27-6 1-11 4-16 5-6 1-9-4-7-9l16-20c2-6 6-10 12-12l2-7 5 6c13 4 19 18 17 33-1 12-4 21-4 31z"/>${BASE}`,
  q: `<circle cx="20" cy="27" r="5.5"/><circle cx="35" cy="17" r="5.5"/><circle cx="50" cy="13" r="5.5"/><circle cx="65" cy="17" r="5.5"/><circle cx="80" cy="27" r="5.5"/><path d="M21 32l12 30 3-38 14 30 14-30 3 38 12-30-8 38H29z"/><path d="M29 70h42l4 10H25z"/>${BASE}`,
  k: `<path d="M46 5h8v7h7v8h-7v8h-8v-8h-7v-8h7z"/><path d="M29 38c0-9 10-12 21-5 11-7 21-4 21 5 0 11-9 19-9 30H38c0-11-9-19-9-30z"/><path d="M36 68h28l5 12H31z"/>${BASE}`,
};

/** Détails intérieurs (traits, reflets) dessinés par-dessus le corps. */
const DETAIL: Record<PieceKind, string> = {
  p: '<path d="M44 24a7 7 0 0 1 6-4" class="hl"/>',
  r: '<path d="M34 40h32M33 71h34" class="ln"/>',
  b: '<path d="M55 30l-9 13" class="ln"/><path d="M43 30a10 10 0 0 1 5-6" class="hl"/>',
  n: '<circle cx="47" cy="30" r="3" class="eye"/><path d="M56 22c6 6 9 15 8 27M60 18c8 8 11 19 9 33" class="ln"/>',
  q: '<path d="M50 61c-3-2-6-4-6-7a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 3-3 5-6 7z" class="heart"/><path d="M32 74h36" class="ln"/>',
  k: '<path d="M38 74h24" class="ln"/><path d="M40 37a7 7 0 0 1 6-3" class="hl"/>',
};

const COLORS: Record<Side, { fill: string; fill2: string; stroke: string; line: string; hl: string; heart: string }> = {
  w: { fill: '#FFF8EC', fill2: '#F3DCC6', stroke: '#58433F', line: '#B39488', hl: 'rgba(255,255,255,0.95)', heart: '#FF75A8' },
  b: { fill: '#6A5A8C', fill2: '#3E3358', stroke: '#2A2140', line: '#FFF4E8', hl: 'rgba(255,255,255,0.35)', heart: '#F3C86B' },
};

const cache = new Map<string, string>();

/** Balisage SVG complet d'une pièce. */
export function pieceSvg(side: Side, kind: PieceKind): string {
  const key = side + kind;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = COLORS[side];
  const gid = `pg-${key}`;
  const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="${c.fill}"/><stop offset="1" stop-color="${c.fill2}"/></linearGradient></defs>
<g fill="url(#${gid})" stroke="${c.stroke}" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round">${BODY[kind]}</g>
<g fill="none" stroke-linecap="round" stroke-width="3">${DETAIL[kind]
    .replace(/class="ln"/g, `stroke="${c.line}"`)
    .replace(/class="hl"/g, `stroke="${c.hl}"`)
    .replace(/class="eye"/g, `fill="${c.stroke}" stroke="none"`)
    .replace(/class="heart"/g, `fill="${c.heart}" stroke="${c.stroke}" stroke-width="1.6"`)}</g>
</svg>`;
  cache.set(key, svg);
  return svg;
}

export const PIECE_NAMES: Record<PieceKind, string> = { p: 'Pion', n: 'Cavalier', b: 'Fou', r: 'Tour', q: 'Dame', k: 'Roi' };
