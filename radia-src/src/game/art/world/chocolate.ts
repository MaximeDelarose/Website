/**
 * Art de la chocolaterie : 8 chocolats, coffret, boutique animée, toppings et
 * casserole du mini-jeu. Repère 100×100 pour les chocolats (contours chocolat,
 * lumière en haut à gauche).
 */
import type { ChocId } from '../../../data/world/ids';
import { CHOCS } from '../../../data/world/chocolate';
import { OUTLINE, PAL, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, makeCanvas, roundRect, seeded, sparkle } from '../kit';

type C = CanvasRenderingContext2D;
const LW = 3;
const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

function hx(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}
function fo(c: C, color: string, b: { x: number; y: number; w: number; h: number }, lw = LW, light = 0.3): void {
  fillShaded(c, color, b, lw, { light, dark: 0.16 });
}

/** Caissette de papier cannelée. */
function cup(c: C, x: number, y: number, w: number, h: number, color = '#FFF4E8'): void {
  c.beginPath();
  c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w * 0.86, y + h); c.lineTo(x + w * 0.14, y + h); c.closePath();
  fo(c, color, box(x, y, w, h), LW * 0.8, 0.25);
  c.strokeStyle = 'rgba(88,67,63,0.35)'; c.lineWidth = 1;
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(x + (w * i) / 6, y); c.lineTo(x + w * 0.14 + (w * 0.72 * i) / 6, y + h); c.stroke(); }
}

function drizzle(c: C, x0: number, x1: number, y: number, amp: number, color: string, n = 5): void {
  c.beginPath(); c.moveTo(x0, y);
  for (let i = 1; i <= n; i++) c.lineTo(x0 + ((x1 - x0) * i) / n, y + (i % 2 ? amp : -amp));
  c.lineWidth = 2.6; c.strokeStyle = color; c.stroke();
}

/** Dessine un chocolat dans un carré `size`×`size`. */
export function drawChocolate(ctx: C, id: ChocId, size: number): void {
  const c = ctx;
  c.save();
  c.scale(size / 100, size / 100);
  c.lineJoin = 'round'; c.lineCap = 'round';
  groundShadow(c, 50, 88, 34, 5, 0.25);
  const col = CHOCS[id].color;
  switch (id) {
    case 'milk': {
      c.beginPath(); roundRect(c, 20, 30, 60, 54, 14); fo(c, col, box(20, 30, 60, 54));
      c.beginPath(); roundRect(c, 29, 39, 42, 36, 9); c.fillStyle = hx(col, 0.12); c.fill(); c.strokeStyle = hx(col, -0.3); c.lineWidth = 1.6; c.stroke();
      c.beginPath(); c.arc(50, 57, 9, 0.5, 5.5); c.strokeStyle = hx(col, -0.25); c.lineWidth = 2.2; c.stroke();
      gloss(c, 33, 40, 8, 3, 0.6); break;
    }
    case 'dark': {
      c.beginPath(); roundRect(c, 18, 32, 64, 52, 8); fo(c, col, box(18, 32, 64, 52));
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        c.beginPath(); roundRect(c, 24 + i * 29, 38 + j * 23, 23, 19, 4); c.fillStyle = hx(col, 0.14 - j * 0.06); c.fill(); c.strokeStyle = hx(col, -0.35); c.lineWidth = 1.4; c.stroke();
      }
      gloss(c, 30, 40, 7, 2.6, 0.55); break;
    }
    case 'praline': {
      cup(c, 22, 58, 56, 28, '#FFE9D6');
      c.beginPath(); c.ellipse(50, 52, 31, 24, 0, Math.PI, 0); c.lineTo(81, 60); c.lineTo(19, 60); c.closePath(); fo(c, col, box(19, 28, 62, 32));
      drizzle(c, 28, 72, 44, 4, '#F3C86B', 6);
      gloss(c, 36, 38, 8, 3, 0.55);
      c.beginPath(); c.ellipse(50, 33, 7, 5, 0, 0, 6.28); fo(c, '#D9A56B', box(43, 28, 14, 10), LW * 0.6); break;
    }
    case 'truffle': {
      cup(c, 22, 58, 56, 28, '#F5B5C8');
      c.beginPath(); c.arc(50, 48, 28, 0, 6.28); fo(c, col, box(22, 20, 56, 56));
      const r = seeded(4); c.fillStyle = 'rgba(255,240,225,0.55)';
      for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 24; c.beginPath(); c.arc(50 + Math.cos(a) * d, 48 + Math.sin(a) * d, 1.3, 0, 6.28); c.fill(); }
      gloss(c, 38, 34, 8, 4, 0.5); break;
    }
    case 'white': {
      c.beginPath(); roundRect(c, 18, 34, 64, 48, 18); fo(c, '#FFF6EA', box(18, 34, 64, 48), LW, 0.2);
      drizzle(c, 26, 74, 52, 5, '#F587AE', 7);
      c.beginPath(); c.arc(50, 44, 5, 0, 6.28); fo(c, '#E8558F', box(45, 39, 10, 10), LW * 0.6);
      gloss(c, 31, 42, 7, 3, 0.8); break;
    }
    case 'hazelnut': {
      cup(c, 22, 58, 56, 28, '#E8D5BC');
      c.beginPath(); c.ellipse(50, 52, 31, 24, 0, Math.PI, 0); c.lineTo(81, 60); c.lineTo(19, 60); c.closePath(); fo(c, col, box(19, 28, 62, 32));
      c.beginPath(); c.ellipse(50, 30, 12, 14, 0.2, 0, 6.28); fo(c, '#C98F52', box(38, 16, 24, 28), LW * 0.8, 0.35);
      c.beginPath(); c.ellipse(50, 22, 8, 4, 0.2, 0, 6.28); c.fillStyle = '#9A6A3A'; c.fill();
      gloss(c, 45, 25, 3, 6, 0.6, 0.3); break;
    }
    case 'heart': {
      heartPath(c, 50, 50, 72); fo(c, '#C93B6E', box(14, 14, 72, 72), LW * 1.1, 0.3);
      heartPath(c, 50, 52, 52); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fill();
      gloss(c, 33, 36, 9, 4, 0.7);
      sparkle(c, 70, 34, 4, '#FFFFFF', 0.9); sparkle(c, 60, 62, 3, '#F3C86B', 0.9); break;
    }
    case 'royalbox': {
      c.beginPath(); roundRect(c, 16, 44, 68, 42, 7); fo(c, '#F3C86B', box(16, 44, 68, 42), LW, 0.3);
      c.beginPath(); roundRect(c, 12, 34, 76, 16, 6); fo(c, '#FFD97F', box(12, 34, 76, 16), LW, 0.35);
      c.beginPath(); roundRect(c, 44, 34, 12, 52, 2); fo(c, '#E8558F', box(44, 34, 12, 52), LW * 0.7, 0.3);
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(50 + s * 9, 30, 10, 6, s * 0.4, 0, 6.28); fo(c, '#FF75A8', box(40, 24, 20, 12), LW * 0.7, 0.35); }
      c.beginPath(); c.arc(50, 31, 4, 0, 6.28); fo(c, '#E8558F', box(46, 27, 8, 8), LW * 0.6);
      c.beginPath(); c.moveTo(30, 22); c.lineTo(34, 8); c.lineTo(42, 17); c.lineTo(50, 4); c.lineTo(58, 17); c.lineTo(66, 8); c.lineTo(70, 22); c.closePath();
      fo(c, '#F3C86B', box(30, 4, 40, 18), LW * 0.8, 0.4);
      for (const x of [34, 50, 66]) { c.beginPath(); c.arc(x, x === 50 ? 4 : 8, 2.2, 0, 6.28); c.fillStyle = '#E8558F'; c.fill(); }
      sparkle(c, 78, 56, 5, '#FFFFFF', 0.95); sparkle(c, 22, 70, 3.2, '#FFFFFF', 0.8); break;
    }
  }
  c.restore();
}

export function drawChocSilhouette(ctx: C, id: ChocId, size: number): void {
  const cv = makeCanvas(size, size);
  const k = cv.getContext('2d')!;
  drawChocolate(k, id, size);
  k.globalCompositeOperation = 'source-in';
  k.fillStyle = 'rgba(88,67,63,0.32)';
  k.fillRect(0, 0, size, size);
  ctx.drawImage(cv, 0, 0);
}

/** Coffret ouvert : 4 alvéoles (2×2) garnies de `contents` (identifiants de chocolats). */
export function drawChocBox(ctx: C, size: number, contents: string[]): void {
  const c = ctx;
  c.save();
  c.scale(size / 100, size / 100);
  c.lineJoin = 'round'; c.lineCap = 'round';
  groundShadow(c, 50, 90, 44, 6, 0.25);
  c.beginPath(); roundRect(c, 6, 18, 88, 70, 12); fo(c, '#F5B5C8', box(6, 18, 88, 70), LW * 1.1, 0.25);
  c.beginPath(); roundRect(c, 13, 25, 74, 56, 8); fo(c, '#8B5A48', box(13, 25, 74, 56), LW * 0.8, 0.1);
  c.beginPath(); c.moveTo(50, 26); c.lineTo(50, 80); c.moveTo(14, 53); c.lineTo(86, 53); c.strokeStyle = OUTLINE; c.lineWidth = 2; c.stroke();
  for (let i = 0; i < 4; i++) {
    const x = 14 + (i % 2) * 36, y = 26 + Math.floor(i / 2) * 27;
    const id = contents[i];
    c.beginPath(); roundRect(c, x + 3, y + 2, 30, 23, 6); c.fillStyle = '#FFE9D6'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1.4; c.stroke();
    if (id && id in CHOCS) { c.save(); c.translate(x - 1, y - 8); drawChocolate(c, id as ChocId, 38); c.restore(); }
  }
  // liseré doré du couvercle (ruban)
  c.beginPath(); roundRect(c, 6, 10, 88, 12, 6); fo(c, '#FF75A8', box(6, 10, 88, 12), LW, 0.35);
  c.beginPath(); c.arc(50, 16, 3.6, 0, 6.28); fo(c, '#F3C86B', box(46, 12, 8, 8), LW * 0.6);
  c.restore();
}

// ------------------------------------------------------------------ toppings du mini-jeu

export const TOPPINGS = ['star', 'berry', 'nut', 'heart', 'sprinkle', 'leaf'] as const;
export type Topping = (typeof TOPPINGS)[number];
export const TOPPING_NAMES: Record<Topping, string> = { star: 'Étoile dorée', berry: 'Framboise', nut: 'Noisette', heart: 'Cœur', sprinkle: 'Vermicelles', leaf: 'Feuille de menthe' };

export function drawTopping(ctx: C, kind: Topping, size: number): void {
  const c = ctx;
  c.save(); c.scale(size / 100, size / 100); c.lineJoin = 'round'; c.lineCap = 'round';
  switch (kind) {
    case 'star': {
      c.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 17 : 38, a = -Math.PI / 2 + (i * Math.PI) / 5; c.lineTo(50 + Math.cos(a) * r, 52 + Math.sin(a) * r); }
      c.closePath(); fo(c, '#F3C86B', box(12, 14, 76, 76), LW * 1.3, 0.4); gloss(c, 40, 40, 8, 3.5, 0.7); break;
    }
    case 'berry': {
      for (const [x, y] of [[50, 36], [34, 52], [66, 52], [42, 68], [58, 68], [50, 54]] as const) {
        c.beginPath(); c.arc(x, y, 14, 0, 6.28); fo(c, '#E8484F', box(x - 14, y - 14, 28, 28), LW * 0.9, 0.3);
      }
      c.beginPath(); c.ellipse(50, 22, 12, 6, 0, 0, 6.28); fo(c, '#7FC48A', box(38, 16, 24, 12), LW * 0.8); gloss(c, 42, 36, 4, 2, 0.6); break;
    }
    case 'nut': {
      c.beginPath(); c.ellipse(50, 54, 28, 32, 0.2, 0, 6.28); fo(c, '#C98F52', box(22, 22, 56, 64), LW * 1.2, 0.35);
      c.beginPath(); c.ellipse(50, 28, 18, 8, 0.2, 0, 6.28); c.fillStyle = '#9A6A3A'; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 2; c.stroke(); gloss(c, 42, 48, 5, 12, 0.5, 0.3); break;
    }
    case 'heart': { heartPath(c, 50, 52, 74); fo(c, '#FF75A8', box(13, 15, 74, 74), LW * 1.3, 0.4); gloss(c, 34, 36, 8, 4, 0.7); break; }
    case 'sprinkle': {
      const cols = ['#FF75A8', '#B9A5E8', '#F3C86B', '#7FC48A'];
      [[28, 34, 0.6], [56, 28, -0.4], [72, 50, 1.1], [40, 58, -0.9], [60, 72, 0.3], [26, 74, 1.4]].forEach(([x, y, a], i) => {
        c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); roundRect(c, -15, -5, 30, 10, 5); fo(c, cols[i % 4], box(-15, -5, 30, 10), LW * 0.8, 0.35); c.restore();
      }); break;
    }
    case 'leaf': {
      c.save(); c.translate(50, 54); c.rotate(-0.5); c.beginPath(); c.moveTo(-34, 0); c.bezierCurveTo(-14, -34, 20, -30, 36, 0); c.bezierCurveTo(20, 30, -14, 34, -34, 0); c.closePath();
      fo(c, '#7FC48A', box(-34, -30, 70, 60), LW * 1.2, 0.35); c.beginPath(); c.moveTo(-28, 0); c.lineTo(30, 0); c.strokeStyle = '#4E9A62'; c.lineWidth = 2.4; c.stroke(); c.restore(); break;
    }
  }
  c.restore();
}

/** Casserole de chocolat fondu (`heat` 0..1 : couleur/vapeur ; `swirl` : angle de la cuillère). */
export function drawMeltPot(ctx: C, w: number, h: number, heat: number, t: number, swirl: number): void {
  const c = ctx;
  c.lineJoin = 'round'; c.lineCap = 'round';
  const cx = w / 2, cy = h * 0.58, rx = Math.min(w * 0.36, h * 0.4), ry = rx * 0.3;
  groundShadow(c, cx, cy + rx * 0.78, rx * 1.15, ry * 0.9, 0.28);
  // flamme / plaque
  const flame = 0.4 + heat * 0.9;
  for (let i = -2; i <= 2; i++) {
    const fx = cx + i * rx * 0.3, fh = (10 + Math.sin(t * 9 + i) * 3) * flame * 1.6;
    c.beginPath(); c.moveTo(fx - 6, cy + rx * 0.85); c.quadraticCurveTo(fx, cy + rx * 0.85 - fh * 1.4, fx + 6, cy + rx * 0.85); c.closePath();
    c.fillStyle = heat > 0.85 ? '#FF6B4A' : '#FFB86B'; c.globalAlpha = 0.5 + heat * 0.5; c.fill(); c.globalAlpha = 1;
  }
  // corps
  c.beginPath(); c.moveTo(cx - rx, cy); c.lineTo(cx - rx * 0.9, cy + rx * 0.7); c.quadraticCurveTo(cx, cy + rx * 0.95, cx + rx * 0.9, cy + rx * 0.7); c.lineTo(cx + rx, cy); c.closePath();
  fo(c, '#B9A5E8', box(cx - rx, cy, rx * 2, rx * 0.9), 3, 0.3);
  // manche
  c.beginPath(); roundRect(c, cx + rx * 0.95, cy + 2, rx * 0.75, 12, 6); fo(c, '#F5B5C8', box(cx + rx, cy, rx * 0.7, 12), 2.6);
  // chocolat
  const melt = Math.min(1, 0.25 + heat);
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 6.28); fo(c, '#C9A98F', box(cx - rx, cy - ry, rx * 2, ry * 2), 3, 0.2);
  c.beginPath(); c.ellipse(cx, cy + 1, rx * 0.86, ry * 0.8, 0, 0, 6.28);
  c.fillStyle = melt > 0.8 ? '#6B3E2E' : '#8A5A44'; c.fill();
  gloss(c, cx - rx * 0.35, cy - ry * 0.2, rx * 0.22, ry * 0.18, 0.55, -0.2);
  // spirale
  c.beginPath();
  for (let a = 0; a < 9; a += 0.4) { const r = a * 0.1; c.lineTo(cx + Math.cos(a + swirl) * r * rx * 0.9, cy + 1 + Math.sin(a + swirl) * r * ry * 0.78); }
  c.strokeStyle = 'rgba(255,220,190,0.35)'; c.lineWidth = 2; c.stroke();
  // cuillère
  c.save(); c.translate(cx + Math.cos(swirl) * rx * 0.3, cy + Math.sin(swirl) * ry * 0.4); c.rotate(-0.5);
  c.beginPath(); roundRect(c, -3, -rx * 1.2, 6, rx * 1.2, 3); fo(c, '#E8C79A', box(-3, -rx * 1.2, 6, rx * 1.2), 2); c.restore();
  // vapeur
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.6 + i / 3) % 1;
    c.beginPath(); c.arc(cx + (i - 1) * rx * 0.5 + Math.sin(t * 2 + i) * 5, cy - ry - ph * rx * 0.9, 5 + ph * 6, 0, 6.28);
    c.fillStyle = `rgba(255,255,255,${(1 - ph) * 0.45 * (0.3 + heat)})`; c.fill();
  }
}

// ------------------------------------------------------------------ boutique

const shopBg = new Map<string, HTMLCanvasElement>();

function staticShop(w: number, h: number, level: number, dpr: number): HTMLCanvasElement {
  const key = `${w}x${h}:${level}:${dpr}`;
  let cv = shopBg.get(key);
  if (cv) return cv;
  shopBg.clear();
  cv = makeCanvas(w * dpr, h * dpr);
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr); c.lineJoin = 'round'; c.lineCap = 'round';
  // mur rayé
  const wallH = h * 0.62;
  c.fillStyle = '#FFF0E0'; c.fillRect(0, 0, w, wallH);
  c.fillStyle = level >= 3 ? '#F9C9D8' : '#F5D3DE';
  for (let x = 0; x < w; x += 36) c.fillRect(x, 0, 18, wallH);
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 0, w, 10);
  // plinthe
  c.fillStyle = '#C79A7C'; c.fillRect(0, wallH - 8, w, 8); c.fillStyle = OUTLINE; c.fillRect(0, wallH - 1, w, 2);
  // sol damier
  const fy = wallH;
  for (let y = fy; y < h; y += 26) for (let x = -26; x < w; x += 52) {
    c.fillStyle = ((y - fy) / 26) % 2 === 0 ? '#FFE9D6' : '#F0CFC0';
    c.fillRect(x + (((y - fy) / 26) % 2 === 0 ? 0 : 26), y, 26, 26);
  }
  // étagères
  const shelf = (x: number, y: number, ww: number, items: ChocId[]) => {
    c.beginPath(); roundRect(c, x, y, ww, 7, 3); fo(c, '#B07A58', box(x, y, ww, 7), 2);
    items.forEach((id, i) => { c.save(); c.translate(x + 6 + i * ((ww - 12) / items.length), y - 30); drawChocolate(c, id, 30); c.restore(); });
  };
  shelf(w * 0.05, wallH * 0.38, w * 0.4, ['milk', 'dark', 'praline'].slice(0, 2 + Math.min(1, level - 1)) as ChocId[]);
  if (level >= 2) shelf(w * 0.55, wallH * 0.38, w * 0.4, ['truffle', 'white', 'hazelnut'].slice(0, level >= 3 ? 3 : 2) as ChocId[]);
  if (level >= 3) shelf(w * 0.05, wallH * 0.66, w * 0.4, ['heart', 'milk', 'dark']);
  if (level >= 4) shelf(w * 0.55, wallH * 0.66, w * 0.4, ['royalbox', 'heart', 'truffle']);
  // enseigne
  const sw = w * 0.5, sx = (w - sw) / 2;
  c.beginPath(); roundRect(c, sx, 24, sw, 30, 10);
  fo(c, level >= 5 ? '#F3C86B' : '#B9A5E8', box(sx, 24, sw, 30), 3);
  c.fillStyle = level >= 5 ? '#58433F' : '#FFF4E8'; c.font = '700 17px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('Chocolaterie', w / 2, 40);
  // auvent à festons
  for (let i = 0; i < Math.ceil(w / 36); i++) {
    c.beginPath(); c.moveTo(i * 36, 0); c.lineTo(i * 36 + 36, 0); c.lineTo(i * 36 + 36, 12); c.arc(i * 36 + 18, 12, 18, 0, Math.PI); c.closePath();
    fo(c, i % 2 ? '#FFF4E8' : '#F5B5C8', box(i * 36, 0, 36, 30), 2.4, 0.3);
  }
  // comptoir + vitrine
  const cy = h * 0.6, ch = h * 0.38;
  c.beginPath(); roundRect(c, 8, cy, w - 16, ch, 14); fo(c, '#D9A57F', box(8, cy, w - 16, ch), 3, 0.25);
  c.beginPath(); roundRect(c, 20, cy + 22, w - 40, ch - 38, 10);
  const gl = c.createLinearGradient(0, cy + 22, 0, cy + ch - 16); gl.addColorStop(0, 'rgba(255,255,255,0.85)'); gl.addColorStop(1, 'rgba(205,230,250,0.65)');
  c.fillStyle = gl; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUTLINE; c.stroke();
  c.beginPath(); roundRect(c, 8, cy - 4, w - 16, 16, 8); fo(c, '#FFE9D6', box(8, cy - 4, w - 16, 16), 3, 0.3);
  // plateau de chocolats dans la vitrine : un de plus par niveau
  const trayY = cy + ch - 56, n = 3 + level;
  const ids: ChocId[] = ['milk', 'dark', 'praline', 'truffle', 'white', 'hazelnut', 'heart', 'royalbox'];
  const span = w - 64;
  for (let i = 0; i < Math.min(8, n); i++) {
    c.save(); c.translate(32 + (span * i) / Math.min(8, n), trayY); drawChocolate(c, ids[i], 36); c.restore();
  }
  // plantes / décor des niveaux
  if (level >= 2) { for (const x of [w - 40]) { c.beginPath(); roundRect(c, x - 11, cy - 22, 22, 20, 5); fo(c, '#F5B5C8', box(x - 11, cy - 22, 22, 20), 2); for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x + (i - 1) * 9, cy - 32, 6, 10, (i - 1) * 0.5, 0, 6.28); fo(c, '#7FC48A', box(x - 6, cy - 42, 12, 20), 2); } } }
  if (level >= 3) { c.beginPath(); roundRect(c, 24, cy - 24, 24, 22, 6); fo(c, '#FFF4E8', box(24, cy - 24, 24, 22), 2); heartPath(c, 36, cy - 14, 12); fo(c, '#E8558F', box(30, cy - 20, 12, 12), 1.6); }
  cv.getContext('2d');
  shopBg.set(key, cv);
  return cv;
}

/** Boutique cozy animée ; plus riche aux niveaux supérieurs (1 à 5). */
export function drawChocShop(ctx: C, w: number, h: number, level: number, t: number, dpr = 1): void {
  const lv = Math.max(1, Math.min(5, Math.floor(level)));
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(staticShop(w, h, lv, dpr), 0, 0, w, h);
  // lampes suspendues qui se balancent
  const lamps = lv >= 4 ? 3 : lv >= 2 ? 2 : 1;
  for (let i = 0; i < lamps; i++) {
    const x = (w * (i + 1)) / (lamps + 1);
    const sw = Math.sin(t * 1.3 + i) * 3;
    ctx.beginPath(); ctx.moveTo(x, 54); ctx.lineTo(x + sw, 76); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke();
    glow(ctx, x + sw, 88, 34, '#FFE7A0', 0.5 + Math.sin(t * 2 + i) * 0.06);
    ctx.beginPath(); ctx.moveTo(x + sw - 11, 88); ctx.quadraticCurveTo(x + sw, 66, x + sw + 11, 88); ctx.closePath();
    fillShaded(ctx, lv >= 5 ? '#F3C86B' : '#F5B5C8', box(x + sw - 11, 70, 22, 18), 2.4, {});
  }
  // étincelles sur la vitrine
  const cy = h * 0.6;
  for (let i = 0; i < 3; i++) { const a = (Math.sin(t * 2 + i * 2) + 1) / 2; sparkle(ctx, w * (0.2 + i * 0.3), cy + 40 + (i % 2) * 14, 3 + a * 4, '#FFFFFF', 0.4 + a * 0.6); }
  if (lv >= 5) for (let i = 0; i < 5; i++) { const a = (Math.sin(t * 1.6 + i * 1.7) + 1) / 2; sparkle(ctx, w * (0.1 + i * 0.2), 70 + (i % 3) * 22, 2 + a * 3, '#F3C86B', 0.3 + a * 0.7); }
  // petit cœur qui monte
  const hp = (t * 0.25) % 1;
  heartPath(ctx, w * 0.84, cy - 10 - hp * 70, 12); ctx.fillStyle = `rgba(255,117,168,${1 - hp})`; ctx.fill();
}

void ellipse; void PAL;
