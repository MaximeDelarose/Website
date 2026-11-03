/* Pièces d'échecs vectorielles originales « Pastel Elegance ».
   Un seul sprite SVG (symboles + dégradés) est injecté dans la page ;
   chaque pièce l'utilise via <use>. La dame blanche est celle de Radia :
   couronne dorée, gemme rose et petit cœur. */
import type { Color, PieceSymbol } from "chess.js";

const BASE = `<path d="M23 90.5 Q23 81 32 80 H68 Q77 81 77 90.5 Z"/>`;

const SHAPES: Record<PieceSymbol, (c: Color) => string> = {
  p: () => `
    <path d="M35 80.5 Q36.5 64 46 54 H54 Q63.5 64 65 80.5 Z"/>
    <rect x="37.5" y="46" width="25" height="8" rx="4"/>
    <circle cx="50" cy="33" r="12.5"/>
    ${BASE}`,
  r: () => `
    <path d="M34 80.5 L36.5 47 H63.5 L66 80.5 Z"/>
    <rect x="31.5" y="40" width="37" height="8.5" rx="3.5"/>
    <path d="M30 40.5 V19 H39.5 V26 H45.5 V19 H54.5 V26 H60.5 V19 H70 V40.5 Z"/>
    <path class="hl" d="M40 56 V74" fill="none"/>
    ${BASE}`,
  n: () => `
    <path d="M31 80.5 Q30 68 38.5 59.5 Q46 52 44.5 45.5 L35 51.5 Q28.5 56 24.5 50.5 Q20 44.5 25.5 36.5 Q33 23 43.5 18.5 L42 9.5 L50 15 L56.5 9.5 L57.5 18.5 Q73 25 72.5 47 Q72 64 68.5 80.5 Z"/>
    <path class="hl" d="M57 23 Q66.5 36 63.5 62" fill="none"/>
    <circle class="ink" cx="40.5" cy="30.5" r="2.8"/>
    <circle class="ink" cx="27.6" cy="43.6" r="1.7"/>
    ${BASE}`,
  b: () => `
    <path d="M34 80.5 Q38 66 44.5 60 H55.5 Q62 66 66 80.5 Z"/>
    <rect x="38" y="53.5" width="24" height="7.5" rx="3.7"/>
    <path d="M50 19 Q66.5 30.5 64.5 44 Q62.5 54.5 50 55 Q37.5 54.5 35.5 44 Q33.5 30.5 50 19 Z"/>
    <path class="ink-line" d="M54.5 28.5 L46 41" fill="none"/>
    <circle cx="50" cy="14.5" r="5"/>
    ${BASE}`,
  q: (c) => `
    <path d="M33.5 80.5 Q37.5 62 42 51 H58 Q62.5 62 66.5 80.5 Z"/>
    <rect x="35.5" y="46.5" width="29" height="8" rx="4"/>
    <path class="crown" d="M33 47 L27.5 26 L37.5 36 L40 19.5 L46 34 L50 14.5 L54 34 L60 19.5 L62.5 36 L72.5 26 L67 47 Z"/>
    <circle class="ball" cx="27.5" cy="24.5" r="3.6"/><circle class="ball" cx="40" cy="18" r="3.6"/>
    <circle class="ball" cx="50" cy="12.5" r="3.9"/><circle class="ball" cx="60" cy="18" r="3.6"/>
    <circle class="ball" cx="72.5" cy="24.5" r="3.6"/>
    ${c === "w" ? `<circle class="gem" cx="50" cy="50.5" r="2.6"/>
    <path class="heart" d="M50 72 C43 67 43.5 61.5 47 61 C48.6 60.8 49.6 62 50 63 C50.4 62 51.4 60.8 53 61 C56.5 61.5 57 67 50 72 Z"/>` : ""}
    ${BASE}`,
  k: () => `
    <path d="M33.5 80.5 Q37.5 62 42 51 H58 Q62.5 62 66.5 80.5 Z"/>
    <rect x="35.5" y="45.5" width="29" height="8" rx="4"/>
    <path d="M36 46 Q31 30.5 43.5 28 H56.5 Q69 30.5 64 46 Z"/>
    <path class="cross" d="M47 5.5 H53 V12 H59 V18 H53 V28.5 H47 V18 H41 V12 H47 Z"/>
    ${BASE}`,
};

export function pieceSpriteSVG(): string {
  const sym = (c: Color, t: PieceSymbol) =>
    `<symbol id="pc-${c}${t}" viewBox="0 0 100 100"><g class="pc pc-${c}">${SHAPES[t](c)}</g></symbol>`;
  const all: string[] = [];
  for (const c of ["w", "b"] as Color[]) for (const t of ["p", "n", "b", "r", "q", "k"] as PieceSymbol[]) all.push(sym(c, t));
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden">
  <defs>
    <linearGradient id="g-white" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFB"/><stop offset=".55" stop-color="#FFF3E6"/><stop offset="1" stop-color="#EBD6C6"/>
    </linearGradient>
    <linearGradient id="g-black" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7A679C"/><stop offset=".5" stop-color="#51446D"/><stop offset="1" stop-color="#33294A"/>
    </linearGradient>
    <linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE7A6"/><stop offset="1" stop-color="#E9B44F"/>
    </linearGradient>
  </defs>
  <style>
    .pc path, .pc rect, .pc circle { stroke-width: 3.1; stroke-linejoin: round; stroke-linecap: round; }
    .pc-w path, .pc-w rect, .pc-w circle { fill: url(#g-white); stroke: #58433F; }
    .pc-b path, .pc-b rect, .pc-b circle { fill: url(#g-black); stroke: #211A30; }
    .pc .hl { fill: none !important; stroke-width: 2.2; }
    .pc-w .hl { stroke: #E2CDBD; } .pc-b .hl { stroke: #9886BD; }
    .pc .ink { stroke: none !important; } .pc-w .ink { fill: #58433F !important; } .pc-b .ink { fill: #F3E9FF !important; }
    .pc .ink-line { fill: none !important; stroke-width: 2.6; }
    .pc-w .ink-line { stroke: #58433F; } .pc-b .ink-line { stroke: #CDBFEA; }
    .pc-w .crown, .pc-w .ball { fill: url(#g-gold) !important; stroke: #8A6326 !important; }
    .pc-b .ball { fill: #C9B8EC !important; }
    .pc-w .gem { fill: #FF75A8 !important; stroke: #B8406E !important; stroke-width: 1.6 !important; }
    .pc-w .heart { fill: #FF75A8 !important; stroke: #B8406E !important; stroke-width: 1.6 !important; }
  </style>
  ${all.join("\n")}
</svg>`;
}

export function pieceSVG(color: Color, type: PieceSymbol, cls = ""): string {
  return `<svg class="piece-svg ${cls}" viewBox="0 0 100 100" aria-hidden="true"><use href="#pc-${color}${type}"/></svg>`;
}

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "pion", n: "cavalier", b: "fou", r: "tour", q: "dame", k: "roi",
};
