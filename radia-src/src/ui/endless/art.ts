/** Petits dessins vectoriels du mode infini (coffre) — SVG inline, sans fichier. */
const shade = (hex: string, k: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (k > 0 ? (255 - v) * k : v * k))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

/** Coffre au trésor aux couleurs d'une rareté (`open` : couvercle relevé et lumière). */
export function chestSvg(color: string, size = 64, open = false): string {
  const dark = shade(color, -0.35);
  const mid = shade(color, -0.12);
  const light = shade(color, 0.45);
  const wood = '#8a5a3c';
  const woodD = '#5f3b27';
  const lid = open
    ? `<path d="M10 30 L16 6 H48 L54 30 Z" fill="${wood}" stroke="${woodD}" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 28 L18 9 H46 L50 28 Z" fill="${light}" opacity=".55"/>`
    : `<path d="M8 32 V22 a16 14 0 0 1 16-14 H40 a16 14 0 0 1 16 14 V32 Z" fill="${wood}" stroke="${woodD}" stroke-width="2.5" stroke-linejoin="round"/><path d="M13 29 V23 a12 10 0 0 1 12-10 H39 a12 10 0 0 1 12 10 V29" fill="none" stroke="${light}" stroke-width="2" opacity=".5" stroke-linecap="round"/>`;
  const glow = open ? `<ellipse cx="32" cy="32" rx="20" ry="7" fill="${light}" opacity=".9"/>` : '';
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    ${open ? '' : `<ellipse cx="32" cy="58" rx="22" ry="3.5" fill="rgba(59,49,82,.22)"/>`}
    <rect x="8" y="32" width="48" height="24" rx="4" fill="${wood}" stroke="${woodD}" stroke-width="2.5"/>
    ${glow}
    ${lid}
    <rect x="8" y="30" width="48" height="6" fill="${mid}" stroke="${dark}" stroke-width="2"/>
    <rect x="14" y="30" width="5" height="26" fill="${color}" stroke="${dark}" stroke-width="1.6"/>
    <rect x="45" y="30" width="5" height="26" fill="${color}" stroke="${dark}" stroke-width="1.6"/>
    <rect x="27" y="29" width="10" height="11" rx="2.5" fill="${color}" stroke="${dark}" stroke-width="2"/>
    <circle cx="32" cy="34" r="1.8" fill="${dark}"/>
  </svg>`;
}
