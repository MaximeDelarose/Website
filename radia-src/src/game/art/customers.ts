/**
 * Portraits des clients (médaillons ronds, Canvas 2D vectoriel, style RADIA : pastel, contours doux).
 * Tout est dessiné à partir de `PortraitSpec` (src/data/customers.ts) : 20 visages différents (teinte, forme, coiffure, hijab,
 * accessoires, yeux, bouche). Lisibles en petit format (36 px) : grandes formes, contrastes nets, aucun détail fin indispensable.
 */
import { makeCanvas, canvasUrl, texScale } from './kit';
import { CUSTOMERS, type PortraitSpec } from '../../data/customers';

export type Expr = 'neutral' | 'happy';

/** Teintes de peau (0 = la plus claire … 5 = la plus foncée) : variées, sans lecture d'origine. */
export const SKIN_TONES = ['#fbdcc8', '#f3c6a5', '#e3a982', '#c98a62', '#a86a46', '#7a4a32'];
const lighten = (hex: string, k: number): string => {
  const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.round(v + (255 - v) * k);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const darken = (hex: string, k: number): string => {
  const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.round(v * (1 - k));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

type Ctx = CanvasRenderingContext2D;
const ell = (c: Ctx, x: number, y: number, rx: number, ry: number) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
const INK = '#4a2f2a';

/** Contour de visage selon la forme. */
function facePath(c: Ctx, face: PortraitSpec['face'], cx: number, cy: number): void {
  c.beginPath();
  if (face === 'round') c.ellipse(cx, cy, 25, 24, 0, 0, Math.PI * 2);
  else if (face === 'oval') c.ellipse(cx, cy + 1, 22, 28, 0, 0, Math.PI * 2);
  else if (face === 'heart') { c.moveTo(cx - 26, cy - 4); c.bezierCurveTo(cx - 26, cy - 26, cx + 26, cy - 26, cx + 26, cy - 4); c.bezierCurveTo(cx + 26, cy + 14, cx + 8, cy + 28, cx, cy + 29); c.bezierCurveTo(cx - 8, cy + 28, cx - 26, cy + 14, cx - 26, cy - 4); }
  else { c.roundRect(cx - 24, cy - 25, 48, 52, 14); }
}

function hairBack(c: Ctx, s: PortraitSpec, cx: number, cy: number): void {
  c.fillStyle = s.hairColor;
  switch (s.hair) {
    case 'long': c.beginPath(); c.roundRect(cx - 30, cy - 28, 60, 72, 26); c.fill(); break;
    case 'bob': c.beginPath(); c.roundRect(cx - 29, cy - 28, 58, 52, 24); c.fill(); break;
    case 'bun': ell(c, cx, cy - 36, 12, 12); c.fill(); ell(c, cx, cy - 8, 28, 30); c.fill(); break;
    case 'curly': for (const [dx, dy, r] of [[-26, -12, 12], [26, -12, 12], [-30, 6, 11], [30, 6, 11], [-14, -30, 13], [14, -30, 13], [0, -34, 13]] as const) { ell(c, cx + dx, cy + dy, r, r); c.fill(); } break;
    case 'ponytail': ell(c, cx + 32, cy + 8, 9, 20); c.fill(); ell(c, cx, cy - 8, 28, 30); c.fill(); break;
    case 'braid': for (let i = 0; i < 4; i++) { ell(c, cx + 26 + (i % 2) * 2, cy + 14 + i * 9, 6, 6); c.fill(); } ell(c, cx, cy - 8, 28, 30); c.fill(); break;
    case 'afro': ell(c, cx, cy - 12, 38, 36); c.fill(); break;
    case 'wavy': c.beginPath(); c.roundRect(cx - 30, cy - 28, 60, 60, 28); c.fill(); for (const dx of [-30, 30]) { ell(c, cx + dx, cy + 26, 8, 8); c.fill(); } break;
    case 'short': ell(c, cx, cy - 10, 27, 27); c.fill(); break;
    case 'none': break;
  }
}

function hairFront(c: Ctx, s: PortraitSpec, cx: number, cy: number): void {
  if (s.hair === 'none') return;
  c.fillStyle = s.hairColor;
  c.beginPath();
  if (s.hair === 'afro') { c.ellipse(cx, cy - 18, 27, 12, 0, Math.PI, 0); }
  else if (s.hair === 'short') { c.moveTo(cx - 25, cy - 8); c.quadraticCurveTo(cx - 24, cy - 32, cx, cy - 31); c.quadraticCurveTo(cx + 24, cy - 32, cx + 25, cy - 8); c.quadraticCurveTo(cx + 12, cy - 20, cx - 5, cy - 18); c.quadraticCurveTo(cx - 16, cy - 16, cx - 25, cy - 8); }
  else { c.moveTo(cx - 26, cy - 4); c.quadraticCurveTo(cx - 28, cy - 32, cx, cy - 31); c.quadraticCurveTo(cx + 28, cy - 32, cx + 26, cy - 4); c.quadraticCurveTo(cx + 18, cy - 18, cx + 2, cy - 20); c.quadraticCurveTo(cx - 14, cy - 18, cx - 26, cy - 4); }
  c.fill();
}

function hijab(c: Ctx, col: string, cx: number, cy: number, skin: string, face: PortraitSpec['face']): void {
  // voile : large drapé (derrière) + bandeau autour du visage (devant) + plis
  c.fillStyle = col;
  c.beginPath(); c.moveTo(cx - 34, cy + 10); c.bezierCurveTo(cx - 40, cy - 40, cx + 40, cy - 40, cx + 34, cy + 10); c.bezierCurveTo(cx + 36, cy + 34, cx + 30, cy + 52, cx, cy + 56); c.bezierCurveTo(cx - 30, cy + 52, cx - 36, cy + 34, cx - 34, cy + 10); c.fill();
  c.fillStyle = darken(col, 0.1); c.beginPath(); c.moveTo(cx - 4, cy + 30); c.bezierCurveTo(cx - 20, cy + 40, cx - 24, cy + 50, cx - 26, cy + 54); c.lineTo(cx + 4, cy + 56); c.bezierCurveTo(cx + 8, cy + 46, cx + 4, cy + 38, cx - 4, cy + 30); c.fill();
  // visage par-dessus
  c.fillStyle = skin; facePath(c, face === 'heart' ? 'round' : face, cx, cy + 1); c.fill();
  // bord du voile devant le front et les joues
  c.strokeStyle = col; c.lineWidth = 8; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(cx - 24, cy + 14); c.bezierCurveTo(cx - 29, cy - 26, cx + 29, cy - 26, cx + 24, cy + 14); c.stroke();
  c.strokeStyle = lighten(col, 0.25); c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx - 20, cy - 14); c.quadraticCurveTo(cx, cy - 25, cx + 20, cy - 14); c.stroke();
}

function eyes(c: Ctx, s: PortraitSpec, cx: number, cy: number, happy: boolean): void {
  const ex = [cx - 10, cx + 10];
  for (const x of ex) {
    if (happy && s.eyes !== 'sleepy') { c.strokeStyle = INK; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.arc(x, cy + 1, 4, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); continue; }
    c.fillStyle = '#fff';
    if (s.eyes === 'round') { ell(c, x, cy, 4.6, 5); c.fill(); c.fillStyle = s.eyeColor; ell(c, x, cy + 0.5, 3, 3.4); c.fill(); }
    else if (s.eyes === 'almond') { c.beginPath(); c.moveTo(x - 6, cy + 1); c.quadraticCurveTo(x, cy - 6, x + 6, cy); c.quadraticCurveTo(x, cy + 5, x - 6, cy + 1); c.fill(); c.fillStyle = s.eyeColor; ell(c, x, cy, 2.8, 3.2); c.fill(); }
    else if (s.eyes === 'bright') { ell(c, x, cy, 5, 5.6); c.fill(); c.fillStyle = s.eyeColor; ell(c, x, cy + 0.5, 3.4, 3.8); c.fill(); c.fillStyle = '#fff'; ell(c, x - 1.2, cy - 1.4, 1.2, 1.2); c.fill(); }
    else { c.beginPath(); c.moveTo(x - 5.5, cy + 0.5); c.quadraticCurveTo(x, cy - 3, x + 5.5, cy + 0.5); c.quadraticCurveTo(x, cy + 4, x - 5.5, cy + 0.5); c.fill(); c.fillStyle = s.eyeColor; ell(c, x, cy + 0.5, 2.8, 2.4); c.fill(); }
    c.strokeStyle = INK; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.arc(x, cy + 0.5, 5.3, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  }
  // sourcils
  c.strokeStyle = darken(s.hair === 'none' && s.hijab ? '#6b4a3a' : s.hairColor, 0.1); c.lineWidth = 2.2;
  for (const [x, dir] of [[ex[0], -1], [ex[1], 1]] as const) { c.beginPath(); c.moveTo(x - 5, cy - 9 + dir * 0.8); c.quadraticCurveTo(x, cy - 12, x + 5, cy - 9 - dir * 0.8); c.stroke(); }
}

function mouth(c: Ctx, m: PortraitSpec['mouth'], cx: number, cy: number, happy: boolean): void {
  c.strokeStyle = '#b4506a'; c.lineWidth = 2.2; c.lineCap = 'round';
  const k = happy ? 1.4 : 1;
  if (m === 'grin' || happy) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx - 8 * k, cy); c.quadraticCurveTo(cx, cy + 11 * k, cx + 8 * k, cy); c.closePath(); c.fill(); c.stroke(); }
  else if (m === 'smile') { c.beginPath(); c.arc(cx, cy - 2, 7, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
  else if (m === 'smirk') { c.beginPath(); c.moveTo(cx - 6, cy + 1); c.quadraticCurveTo(cx + 2, cy + 6, cx + 8, cy - 2); c.stroke(); }
  else { c.beginPath(); c.moveTo(cx - 5, cy + 1); c.quadraticCurveTo(cx, cy + 4, cx + 5, cy + 1); c.stroke(); }
}

function accessory(c: Ctx, s: PortraitSpec, cx: number, cy: number): void {
  switch (s.accessory) {
    case 'glasses': c.strokeStyle = '#3a3a52'; c.lineWidth = 2; ell(c, cx - 10, cy, 8, 7.4); c.stroke(); ell(c, cx + 10, cy, 8, 7.4); c.stroke(); c.beginPath(); c.moveTo(cx - 2, cy - 1); c.lineTo(cx + 2, cy - 1); c.stroke(); break;
    case 'earrings': c.fillStyle = '#f3c86b'; for (const dx of [-25, 25]) { ell(c, cx + dx, cy + 14, 3, 3.4); c.fill(); } break;
    case 'flower': c.fillStyle = '#ff9fc0'; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ell(c, cx + 22 + Math.cos(a) * 5, cy - 24 + Math.sin(a) * 5, 4.4, 4.4); c.fill(); } c.fillStyle = '#ffe28a'; ell(c, cx + 22, cy - 24, 3, 3); c.fill(); break;
    case 'beret': c.fillStyle = '#c94a62'; c.beginPath(); c.ellipse(cx + 2, cy - 27, 28, 9, -0.12, 0, Math.PI * 2); c.fill(); ell(c, cx + 4, cy - 36, 3, 3); c.fill(); break;
    case 'headband': c.strokeStyle = '#ff7aa8'; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy - 4, 27, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); break;
    case 'scarf': c.fillStyle = '#ffd0a0'; c.beginPath(); c.roundRect(cx - 20, cy + 26, 40, 10, 5); c.fill(); break;
    case 'cap': c.fillStyle = '#4a8fd9'; c.beginPath(); c.ellipse(cx, cy - 22, 27, 14, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(cx + 14, cy - 18, 20, 4, 0, 0, Math.PI * 2); c.fill(); break;
    case 'none': break;
  }
}

/** Dessine un portrait dans un canvas carré de `size` px (médaillon rond). */
export function drawCustomerPortrait(spec: PortraitSpec, size: number, expr: Expr = 'neutral'): HTMLCanvasElement {
  const px = Math.round(size * texScale());
  const cv = makeCanvas(px, px);
  const c = cv.getContext('2d')!;
  c.scale(px / 100, px / 100);
  const cx = 50, cy = 46;
  const skin = SKIN_TONES[Math.max(0, Math.min(5, spec.skin))];
  c.save(); c.beginPath(); c.arc(50, 50, 50, 0, Math.PI * 2); c.clip();
  // fond pastel
  const g = c.createRadialGradient(50, 36, 6, 50, 50, 60); g.addColorStop(0, lighten(spec.bg, 0.45)); g.addColorStop(1, spec.bg); c.fillStyle = g; c.fillRect(0, 0, 100, 100);
  // épaules / haut
  c.fillStyle = spec.top; c.beginPath(); c.ellipse(50, 104, 40, 30, 0, Math.PI, 0); c.fill();
  c.fillStyle = darken(spec.top, 0.08); c.beginPath(); c.moveTo(34, 78); c.quadraticCurveTo(50, 90, 66, 78); c.lineTo(66, 96); c.lineTo(34, 96); c.fill();
  // cou
  if (!spec.hijab) { c.fillStyle = darken(skin, 0.06); c.beginPath(); c.roundRect(41, cy + 20, 18, 22, 6); c.fill(); }
  if (spec.hijab) hijab(c, spec.hijab, cx, cy, skin, spec.face);
  else { hairBack(c, spec, cx, cy); c.fillStyle = skin; facePath(c, spec.face, cx, cy); c.fill(); }
  // joues et traits
  if (spec.blush) { c.fillStyle = 'rgba(255,120,140,0.28)'; ell(c, cx - 16, cy + 9, 6, 4); c.fill(); ell(c, cx + 16, cy + 9, 6, 4); c.fill(); }
  c.fillStyle = darken(skin, 0.12); c.beginPath(); c.ellipse(cx, cy + 6, 2.4, 1.8, 0, 0, Math.PI * 2); c.fill();
  eyes(c, spec, cx, cy - 2, expr === 'happy');
  mouth(c, spec.mouth, cx, cy + 15, expr === 'happy');
  hairFront(c, spec, cx, cy);
  accessory(c, spec, cx, cy);
  c.restore();
  // liseré
  c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 3; c.beginPath(); c.arc(50, 50, 48.5, 0, Math.PI * 2); c.stroke();
  return cv;
}

/** URL (mise en cache) du portrait d'un client. */
export function customerPortraitUrl(id: string, size = 64, expr: Expr = 'neutral'): string {
  const cu = CUSTOMERS.find((x) => x.id === id);
  if (!cu) return '';
  return canvasUrl(`customer:${id}:${size}:${expr}`, () => drawCustomerPortrait(cu.portrait, size, expr));
}
