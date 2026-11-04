/** Mobilier et décor propres à chaque lieu, par étape (2 = aménagé, 3 = décoré, 4 = ouvert). Meubles réels du château quand ils existent. */
import type { PlaceId } from './places';
import { PAL, SH, SW, FLOOR_Y, bloom, crown, disc, ell, glowAt, ink, line, lin, plaque, poly, put, rr, seeded, sh, softShadow, sparkle, steam, stringLights, heartPath, starPath, hexA, type C } from './artKit';

export interface PlaceCtx {
  id: PlaceId;
  stage: number;
  spec: { floor: string; floorKind: string; pattern: string };
  wall: string;
  cloth: string;
  accent: string;
  curtain: string;
}
export interface Helpers {
  windowAt(c: C, x: number, y: number, w: number, h: number, k: PlaceCtx, curtain?: string): void;
  awning(c: C, x: number, y: number, w: number, h: number, col: string): void;
  bunting(c: C, x0: number, y0: number, x1: number, y1: number, cols: string[], sag?: number): void;
}
export const FLOOR_KIND: Record<PlaceId, 'indoor' | 'outdoor'> = {
  tea: 'indoor', flowers: 'indoor', wing: 'indoor', choc: 'indoor', boutique: 'indoor', hotel: 'indoor', restaurant: 'indoor', spa: 'indoor', terrace: 'outdoor', casino: 'indoor',
};

const WOOD = '#C99A6B';
const WOOD_D = '#A87A50';

// ------------------------------------------------------------------ éléments communs

function counter(c: C, x: number, y: number, w: number, h: number, body = WOOD, top = '#F6E7D2'): void {
  softShadow(c, x + w / 2, y + h + 1, w * 0.55, 5, 0.25);
  rr(c, x, y, w, h, 3, lin(c, 0, y, 0, y + h, sh(body, 0.15), body, sh(body, -0.15)), 1.4);
  for (let px = x + 8; px < x + w - 14; px += 30) { c.strokeStyle = sh(body, -0.25); c.lineWidth = 1; c.strokeRect(px, y + 6, 22, h - 12); }
  rr(c, x - 4, y - 6, w + 8, 8, 3, lin(c, 0, y - 6, 0, y + 2, sh(top, 0.3), top), 1.4);
}
function roundTable(c: C, cx: number, ty: number, rx: number, cloth: string | null, wood = WOOD): void {
  softShadow(c, cx, ty + 30, rx * 0.9, 5, 0.25);
  rr(c, cx - 3, ty, 6, 28, 1, wood, 1);
  ell(c, cx, ty + 29, rx * 0.4, 4, WOOD_D, 1);
  if (cloth) {
    c.beginPath(); c.moveTo(cx - rx, ty);
    const n = 6; const sw = (rx * 2) / n;
    c.lineTo(cx - rx, ty + 9);
    for (let i = 0; i < n; i++) c.quadraticCurveTo(cx - rx + sw * (i + 0.5), ty + 17, cx - rx + sw * (i + 1), ty + 9);
    c.lineTo(cx + rx, ty); c.closePath();
    c.fillStyle = lin(c, 0, ty, 0, ty + 15, sh(cloth, 0.05), sh(cloth, -0.12)); c.fill(); ink(c, 1.1);
    ell(c, cx, ty, rx, rx * 0.3, sh(cloth, 0.22), 1.2);
    c.beginPath(); c.ellipse(cx, ty, rx * 0.72, rx * 0.2, 0, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.setLineDash([2, 2.5]); c.stroke(); c.setLineDash([]);
  } else ell(c, cx, ty, rx, rx * 0.3, lin(c, 0, ty - 6, 0, ty + 6, sh(wood, 0.25), wood), 1.3);
}
function teaSet(c: C, x: number, y: number): void {
  ell(c, x, y + 1, 10, 3, '#FFFDF8', 0.9);
  rr(c, x - 7, y - 11, 14, 11, 5, '#FFFDF8', 1);
  poly(c, [[x + 6, y - 8], [x + 12, y - 11], [x + 7, y - 4]], '#FFFDF8', 0.9);
  disc(c, x, y - 12, 2, '#E8558F', 0.7);
  disc(c, x - 12, y - 2, 3.4, '#FFFDF8', 0.8);
}
function cakeStand(c: C, x: number, y: number, cake: boolean, col = '#FF9EBE'): void {
  line(c, x, y - 2, x, y + 6, '#D9B27C', 2.2); ell(c, x, y + 6, 8, 2.4, '#D9B27C', 0.9);
  ell(c, x, y - 2, 12, 3.4, '#FFFDF8', 1);
  if (cake) { rr(c, x - 8, y - 12, 16, 10, 4, col, 1); ell(c, x, y - 12, 8, 2.6, sh(col, 0.4), 0.8); disc(c, x, y - 15, 2.2, '#E8484F', 0.8); }
}
function bucketFlowers(c: C, x: number, y: number, blooms: number, cols: string[], seed: number): void {
  const R = seeded(seed);
  for (let i = 0; i < blooms; i++) {
    const bx = x - 11 + R() * 22; const by = y - 14 - R() * 22;
    line(c, bx, by + 3, x + (bx - x) * 0.3, y - 8, '#5FA86E', 1.4);
    bloom(c, bx, by, 3.4 + R() * 1.6, cols[i % cols.length], false);
  }
  poly(c, [[x - 13, y - 16], [x + 13, y - 16], [x + 10, y], [x - 10, y]], lin(c, x - 13, 0, x + 13, 0, '#F5F7F8', '#B6C0C9'), 1.2);
  ell(c, x, y - 16, 13, 3, '#DDE3E8', 1);
}
function stems(c: C, x: number, y: number, n: number, seed: number): void {
  const R = seeded(seed);
  for (let i = 0; i < n; i++) { const a = -0.5 + R(); line(c, x, y - 12, x + a * 18, y - 30 - R() * 8, '#6FB67D', 1.6); poly(c, [[x + a * 18, y - 30], [x + a * 18 + 5, y - 33], [x + a * 18 + 2, y - 27]], '#7FC48A', 0.7); }
  poly(c, [[x - 13, y - 16], [x + 13, y - 16], [x + 10, y], [x - 10, y]], lin(c, x - 13, 0, x + 13, 0, '#F5F7F8', '#B6C0C9'), 1.2);
  ell(c, x, y - 16, 13, 3, '#DDE3E8', 1);
}
function hangingPlant(c: C, x: number, y: number): void {
  line(c, x, 0, x, y, '#8A6B50', 1);
  poly(c, [[x - 10, y], [x + 10, y], [x + 7, y + 11], [x - 7, y + 11]], '#E7B98F', 1.1);
  for (const a of [-1, 0, 1]) { c.beginPath(); c.moveTo(x + a * 5, y + 2); c.quadraticCurveTo(x + a * 14, y + 14, x + a * 9, y + 30); c.strokeStyle = '#5FA86E'; c.lineWidth = 2.4; c.stroke(); }
  bloom(c, x - 4, y - 3, 3, '#FF8FB1', false); bloom(c, x + 5, y - 2, 2.6, '#FFFFFF', false);
}
function lanterns(c: C, xs: number[], y: number, col: string): void {
  for (const x of xs) { line(c, x, 0, x, y, 'rgba(60,48,56,0.7)', 1); glowAt(c, x, y + 8, 18, col, 0.5); rr(c, x - 5, y, 10, 14, 4, hexA(col, 0.95), 1); }
}
function mannequin(c: C, x: number, by: number, col: string): void {
  rr(c, x - 9, by - 3, 18, 3, 1.5, '#58433F', 0.9);
  line(c, x, by - 3, x, by - 22, '#58433F', 2);
  c.beginPath(); c.moveTo(x - 8, by - 22); c.quadraticCurveTo(x - 10, by - 36, x - 5, by - 52); c.lineTo(x + 5, by - 52); c.quadraticCurveTo(x + 10, by - 36, x + 8, by - 22); c.closePath();
  c.fillStyle = lin(c, 0, by - 52, 0, by - 22, sh(col, 0.25), col); c.fill(); ink(c, 1.2);
  poly(c, [[x - 8, by - 22], [x + 8, by - 22], [x + 15, by - 2], [x - 15, by - 2]], lin(c, 0, by - 22, 0, by, sh(col, 0.15), sh(col, -0.1)), 1.2);
  ell(c, x, by - 58, 4.5, 5.6, '#F1DCC9', 1);
}
function drape(c: C, x: number, y: number, w: number, h: number, col: string): void {
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h);
  const n = 4; for (let i = n; i > 0; i--) c.quadraticCurveTo(x + (w * (i - 0.5)) / n, y + h + 6, x + (w * (i - 1)) / n, y + h);
  c.closePath(); c.fillStyle = lin(c, x, 0, x + w, 0, sh(col, 0.2), col, sh(col, -0.2)); c.fill(); ink(c, 1.2);
  for (let i = 1; i < n * 2; i++) { c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + (w * i) / (n * 2), y); c.lineTo(x + (w * i) / (n * 2), y + h); c.stroke(); }
}

// ------------------------------------------------------------------ SALON DE THÉ

function tea(c: C, k: PlaceCtx, H: Helpers): void {
  const s = k.stage;
  H.windowAt(c, 22, 28, 64, 84, k, k.curtain); H.windowAt(c, 274, 28, 64, 84, k, k.curtain);
  if (s < 2) return;
  if (s >= 3) { put(c, 'painting', 116, 98, 21); put(c, 'painting', 244, 98, 21); }
  counter(c, 116, 116, 128, 34);
  cakeStand(c, 142, 108, s >= 3); cakeStand(c, 180, 108, s >= 3, '#FFD9A0'); cakeStand(c, 218, 108, s >= 3, '#C9A5E8');
  if (s >= 3) put(c, 'chandelier', 180, 82, 22);
  const tables = [[80, 172, 30], [278, 176, 32]] as const;
  for (const [cx, ty, rx] of tables) {
    put(c, 'armchair', cx - rx - 14, ty + 22, 19); put(c, 'armchair', cx + rx + 14, ty + 22, 19);
    roundTable(c, cx, ty, rx, s >= 3 ? k.cloth : null);
    teaSet(c, cx - 8, ty - 1);
    if (s >= 3) { put(c, 'flower-vase', cx + 12, ty - 2, 15); put(c, 'candles', cx - 20, ty + 1, 12); }
  }
  roundTable(c, 180, 190, 22, s >= 3 ? k.cloth : null); teaSet(c, 180, 189);
  if (s >= 3) put(c, 'plant-pot', 330, 206, 18);
  if (s === 4) {
    H.bunting(c, 0, 56, 112, 62, [k.accent, '#FFFFFF', '#F3C86B', '#B9A5E8'], 8); H.bunting(c, 248, 62, 360, 56, [k.accent, '#FFFFFF', '#F3C86B', '#B9A5E8'], 8);
    H.awning(c, 14, 14, 80, 12, k.accent); H.awning(c, 266, 14, 80, 12, k.accent);
    steam(c, 72, 160, 14); steam(c, 270, 164, 14); steam(c, 178, 178, 12);
    heartPath(c, 118, 150, 8); c.fillStyle = '#FF75A8'; c.fill();
  }
}

// ------------------------------------------------------------------ BOUTIQUE DE FLEURS

function flowers(c: C, k: PlaceCtx, H: Helpers): void {
  const s = k.stage;
  H.windowAt(c, 22, 30, 76, 82, k, undefined);
  if (s < 2) return;
  const cols = ['#FF8FB1', '#FFFFFF', '#B9A5E8', '#F3C86B', '#FFC0A3', '#FF75A8'];
  for (const [i, y] of [58, 86, 114].entries()) {
    rr(c, 252, y, 92, 5, 1.5, WOOD, 1.1);
    for (let j = 0; j < 4; j++) {
      const px = 266 + j * 22;
      rr(c, px - 7, y - 11, 14, 11, 3, '#E7B98F', 1);
      if (s >= 3) bloom(c, px, y - 17 + (j % 2), 4.2, cols[(i * 4 + j) % cols.length], false); else { line(c, px, y - 11, px, y - 20, '#6FB67D', 1.6); }
    }
  }
  counter(c, 130, 116, 100, 34, WOOD, '#FFF4E8');
  disc(c, 208, 108, 5, '#F3C86B', 0.9); rr(c, 180, 104, 20, 8, 2, '#FFFDF8', 0.9);
  if (s >= 3) { bloom(c, 150, 105, 4, '#FF8FB1', true); bloom(c, 158, 107, 3.4, '#FFFFFF', true); }
  const bx = [132, 172, 212];
  bx.forEach((x, i) => (s >= 3 ? bucketFlowers(c, x, 208, 7, cols.slice(i, i + 4).concat(cols), 11 + i) : stems(c, x, 208, 3, 3 + i)));
  put(c, 'plant-pot', 60, 210, 18);
  if (s >= 3) {
    put(c, 'flowerbed', 66, 190, 22); hangingPlant(c, 118, 30); hangingPlant(c, 230, 34); hangingPlant(c, 330, 26);
    for (let x = 6; x < SW; x += 24) { bloom(c, x, 10 + Math.sin(x) * 2, 3, cols[(x / 24) % cols.length | 0], false); }
    line(c, 0, 10, SW, 10, '#6FB67D', 1.2);
  }
  if (s === 4) {
    H.awning(c, 16, 16, 88, 14, k.accent);
    const R = seeded(9);
    for (let i = 0; i < 6; i++) { const px = 40 + R() * 280; const py = 60 + R() * 120; ell(c, px, py, 3, 1.8, i % 2 ? '#FF9EBE' : '#FFFFFF', 0); }
    for (const [x, y] of [[190, 70], [260, 40]]) { ell(c, x - 3, y, 4, 3, '#FFC857', 0.8); ell(c, x + 3, y, 4, 3, '#FF8FB1', 0.8); line(c, x, y - 2, x, y + 3, '#58433F', 1); }
  }
}

// ------------------------------------------------------------------ AILE DU CHÂTEAU

function pillar(c: C, x: number, y0: number, y1: number): void {
  rr(c, x - 9, y1 - 8, 18, 8, 2, '#F4EEF8', 1.2); rr(c, x - 7, y0 + 8, 14, y1 - y0 - 14, 1, lin(c, x - 7, 0, x + 7, 0, '#FFFFFF', '#E3D9EE', '#C9BCDD'), 1.2); rr(c, x - 10, y0, 20, 9, 2, '#F4EEF8', 1.2);
}
function wing(c: C, k: PlaceCtx, H: Helpers): void {
  const s = k.stage;
  // portail central en arc
  c.beginPath(); c.moveTo(146, FLOOR_Y); c.lineTo(146, 70); c.arc(180, 70, 34, Math.PI, 0); c.lineTo(214, FLOOR_Y); c.closePath();
  c.fillStyle = lin(c, 0, 36, 0, FLOOR_Y, s >= 1 ? sh(k.wall, -0.32) : '#7A6B60', s >= 1 ? sh(k.wall, -0.45) : '#5A4C44'); c.fill(); ink(c, 1.6);
  if (s >= 2) { drape(c, 148, 38, 64, 22, k.accent); }
  pillar(c, 120, 6, FLOOR_Y); pillar(c, 240, 6, FLOOR_Y);
  H.windowAt(c, 30, 30, 56, 84, k, k.curtain); H.windowAt(c, 274, 30, 56, 84, k, k.curtain);
  if (s < 2) return;
  put(c, 'rug-rect', 180, 216, 40);
  put(c, 'painting', 98, 98, 22); put(c, 'painting', 262, 98, 22);
  if (s >= 3) {
    put(c, 'chandelier', 180, 60, 28);
    put(c, 'mirror-standing', 62, 196, 26); put(c, 'mirror-standing', 298, 196, 26);
    put(c, 'armchair', 330, 214, 20);
    // tentures
    drape(c, 24, 14, 70, 14, k.accent); drape(c, 268, 14, 70, 14, k.accent);
  }
  if (s === 4) {
    put(c, 'banquet-table', 180, 218, 24);
    for (const x of [120, 240]) { poly(c, [[x - 12, 36], [x + 12, 36], [x + 12, 90], [x, 80], [x - 12, 90]], lin(c, 0, 36, 0, 90, sh(k.accent, 0.2), sh(k.accent, -0.1)), 1.3); crown(c, x, 54, 14); }
    put(c, 'candles', 160, 190, 12); put(c, 'candles', 200, 190, 12); put(c, 'flower-vase', 180, 188, 14);
  }
}

// ------------------------------------------------------------------ CHOCOLATERIE DE LUXE

function chocBox(c: C, x: number, y: number, col: string): void {
  rr(c, x - 9, y - 11, 18, 11, 2, col, 1); line(c, x - 9, y - 6, x + 9, y - 6, '#F3C86B', 1.8); line(c, x, y - 11, x, y, '#F3C86B', 1.8); heartPath(c, x, y - 13, 6); c.fillStyle = '#F3C86B'; c.fill(); ink(c, 0.7);
}
function chocFountain(c: C, cx: number, by: number, s: number): void {
  softShadow(c, cx, by, 36, 5, 0.3);
  ell(c, cx, by - 6, 32, 9, '#E7C98A', 1.3); ell(c, cx, by - 8, 28, 7, '#6B3E2E', 0.9);
  rr(c, cx - 5, by - 40, 10, 34, 2, '#E7C98A', 1.1);
  ell(c, cx, by - 30, 20, 6, '#E7C98A', 1.2); ell(c, cx, by - 31, 17, 4.5, '#6B3E2E', 0.8);
  ell(c, cx, by - 46, 12, 4, '#E7C98A', 1.2); ell(c, cx, by - 47, 9.5, 3, '#6B3E2E', 0.8);
  if (s >= 3) { for (const dx of [-14, 0, 14]) { c.beginPath(); c.moveTo(cx + dx * 0.6, by - 30); c.quadraticCurveTo(cx + dx, by - 22, cx + dx * 1.2, by - 8); c.strokeStyle = '#6B3E2E'; c.lineWidth = 2.6; c.lineCap = 'round'; c.stroke(); } }
  disc(c, cx, by - 52, 3.2, '#6B3E2E', 0.8);
}
function choc(c: C, k: PlaceCtx, H: Helpers): void {
  const s = k.stage;
  H.windowAt(c, 22, 30, 60, 80, k, s >= 3 ? k.accent : undefined); H.windowAt(c, 278, 30, 60, 80, k, s >= 3 ? k.accent : undefined);
  if (s < 2) return;
  // étagères de bocaux
  for (const y of [58, 92]) {
    rr(c, 108, y, 144, 4, 1.5, WOOD_D, 1);
    for (let j = 0; j < 6; j++) {
      const x = 118 + j * 23;
      rr(c, x - 7, y - 16, 14, 16, 4, s >= 3 ? ['#6B3E2E', '#E8558F', '#A4673F', '#F3C86B', '#8E4F34', '#FFF1DE'][(j + (y > 60 ? 2 : 0)) % 6] : 'rgba(255,255,255,0.55)', 1);
      rr(c, x - 5, y - 20, 10, 5, 2, '#E7C98A', 0.9);
    }
  }
  // comptoir de marbre
  counter(c, 90, 118, 180, 32, sh(k.accent, 0.05), '#FFFFFF');
  rr(c, 90, 118, 180, 4, 0, '#F3C86B', 0);
  // vitrine à chocolats
  rr(c, 112, 100, 60, 20, 4, 'rgba(210,235,250,0.7)', 1.2);
  [0, 1, 2, 3, 4].forEach((i) => disc(c, 122 + i * 10, 112, 3.6, s >= 3 ? ['#6B3E2E', '#A4673F', '#E8558F', '#8E4F34', '#F3C86B'][i] : '#CFC4B8', 0.8));
  put(c, 'choco-display', 46, 206, 24); put(c, 'choco-display', 316, 206, 24);
  if (s >= 3) {
    chocFountain(c, 180, 208, s);
    put(c, 'chandelier', 180, 50, 22);
    chocBox(c, 220, 108, '#E8558F'); chocBox(c, 236, 108, '#6B3E2E'); chocBox(c, 252, 110, '#B9A5E8');
    put(c, 'candles', 110, 210, 12); put(c, 'candles', 250, 210, 12);
  } else {
    put(c, 'armchair', 108, 212, 20); put(c, 'armchair', 252, 212, 20);
  }
  if (s === 4) {
    // enseigne qui « fond » : gouttes de chocolat
    for (const x of [136, 160, 188, 212, 232]) { c.beginPath(); c.moveTo(x - 3, 36); c.quadraticCurveTo(x, 54, x + 3, 36); c.fillStyle = '#6B3E2E'; c.fill(); }
    H.awning(c, 16, 16, 70, 12, '#8E4F34'); H.awning(c, 274, 16, 70, 12, '#8E4F34');
    steam(c, 200, 100, 14, 0.7);
    chocBox(c, 138, 208, '#F3C86B'); chocBox(c, 222, 210, '#E8558F');
  }
}

// ------------------------------------------------------------------ BOUTIQUE DE VÊTEMENTS

function hangers(c: C, x: number, y: number, n: number, cols: string[]): void {
  line(c, x - 22, y, x + 22, y, '#B8A58E', 1.8);
  for (let i = 0; i < n; i++) { const px = x - 16 + (i * 32) / Math.max(1, n - 1); poly(c, [[px - 4, y], [px + 4, y], [px + 5, y + 22], [px - 5, y + 22]], cols[i % cols.length], 1); disc(c, px, y - 1, 1.2, '#58433F'); }
}
function boutique(c: C, k: PlaceCtx, H: Helpers): void {
  const s = k.stage;
  H.windowAt(c, 22, 30, 62, 80, k, undefined); H.windowAt(c, 276, 30, 62, 80, k, undefined);
  if (s < 2) return;
  const cols = ['#FF9EBE', '#B9A5E8', '#FFFFFF', '#F3C86B', '#7FC48A', '#5AA9FF'];
  put(c, 'clothes-rack', 100, 206, 26); put(c, 'clothes-rack', 262, 206, 26);
  hangers(c, 100, 168, 5, cols); hangers(c, 262, 170, 5, cols.slice(2).concat(cols));
  put(c, 'mirror-standing', 180, 200, 26);
  put(c, 'shoe-stand', 330, 150, 26);
  counter(c, 124, 118, 112, 32, WOOD, '#FFF4E8'); rr(c, 140, 106, 20, 12, 2, '#FFFDF8', 1);
  if (s >= 3) {
    // cabines d'essayage
    drape(c, 20, 66, 70, 80, k.accent); line(c, 14, 66, 96, 66, '#C9A25B', 2.4);
    put(c, 'accessory-stand', 330, 206, 22);
    mannequin(c, 160, 208, '#FFC0D8'); mannequin(c, 216, 208, '#B9A5E8');
    for (const x of [100, 262]) { c.beginPath(); c.moveTo(x - 4, 0); c.lineTo(x + 4, 0); c.lineTo(x + 26, 148); c.lineTo(x - 26, 148); c.closePath(); c.fillStyle = 'rgba(255,248,214,0.10)'; c.fill(); }
    rr(c, 180 - 22, 60, 44, 22, 3, '#FFFDF8', 1.2);
    c.font = '700 10px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = k.accent; c.fillText('NEW', 180, 71);
  }
  if (s === 4) {
    for (const [x, col] of [[300, '#FF9EBE'], [320, '#B9A5E8']] as const) { rr(c, x - 8, 192, 16, 18, 2, col, 1); c.beginPath(); c.arc(x, 192, 6, Math.PI, 0); c.strokeStyle = '#58433F'; c.lineWidth = 1.2; c.stroke(); }
    heartPath(c, 90, 140, 9); c.fillStyle = '#FF75A8'; c.fill();
  }
}

// ------------------------------------------------------------------ HÔTEL

function hotel(c: C, k: PlaceCtx, H: Helpers): void {
  const s = k.stage;
  H.windowAt(c, 22, 30, 54, 80, k, k.curtain); H.windowAt(c, 284, 30, 54, 80, k, k.curtain);
  if (s < 2) return;
  // tableau des clés
  rr(c, 134, 40, 92, 46, 3, '#8A6B50', 1.4);
  for (let r = 0; r < 2; r++) for (let q = 0; q < 6; q++) { disc(c, 146 + q * 14, 54 + r * 20, 1.6, '#58433F'); if (s >= 3 || q % 2) rr(c, 143 + q * 14, 56 + r * 20, 6, 8, 1, '#F3C86B', 0.7); }
  counter(c, 110, 116, 140, 34, '#8A6B50', '#F6E7D2');
  disc(c, 160, 106, 5, '#F3C86B', 1); rr(c, 156, 108, 8, 2, 1, '#8A6B50', 0.7);
  put(c, 'lamp-floor', 62, 208, 24); put(c, 'lamp-floor', 306, 208, 24);
  put(c, 'rug-round', 180, 216, 28);
  put(c, 'sofa', 262, 210, 22);
  if (s >= 3) {
    put(c, 'chandelier', 180, 40, 24);
    put(c, 'plant-pot', 96, 210, 20); put(c, 'painting', 90, 112, 22); put(c, 'painting', 270, 112, 22);
    put(c, 'vanity', 330, 150, 20);
    // horloge
    disc(c, 180, 20, 0, '#fff');
  }
  if (s === 4) {
    // chariot à bagages
    line(c, 112, 180, 112, 208, '#C9A25B', 2.4); line(c, 112, 180, 142, 180, '#C9A25B', 2.4); line(c, 112, 208, 148, 208, '#C9A25B', 2.4); disc(c, 118, 211, 3, '#58433F'); disc(c, 144, 211, 3, '#58433F');
    rr(c, 114, 188, 22, 18, 3, '#B9A5E8', 1.2); rr(c, 124, 172, 16, 16, 3, '#FF9EBE', 1.2);
    H.awning(c, 16, 14, 66, 12, k.accent); H.awning(c, 278, 14, 66, 12, k.accent);
  }
}

// ------------------------------------------------------------------ RESTAURANT

function pans(c: C, xs: number[], y: number): void {
  line(c, 232, y - 6, 352, y - 6, '#8A6B50', 2);
  for (const x of xs) { line(c, x, y - 6, x, y, '#58433F', 1); disc(c, x, y + 8, 7, '#B8BEC6', 1.2); disc(c, x, y + 8, 3.6, '#8A929C', 0.7); }
}
function restaurant(c: C, k: PlaceCtx, H: Helpers): void {
  const s = k.stage;
  H.windowAt(c, 22, 28, 60, 80, k, k.curtain);
  if (s < 2) return;
  // cuisine ouverte à droite
  rr(c, 238, 62, 112, 56, 3, '#E9ECEF', 1.3);
  poly(c, [[254, 60], [334, 60], [322, 36], [266, 36]], lin(c, 0, 36, 0, 60, '#C9CFD6', '#8A929C'), 1.3);
  counter(c, 232, 118, 124, 32, '#D6DBE0', '#F4F6F8');
  rr(c, 252, 106, 36, 12, 2, '#58433F', 1.2); disc(c, 262, 112, 3, '#8A929C'); disc(c, 278, 112, 3, '#8A929C');
  rr(c, 300, 98, 28, 20, 3, '#B8BEC6', 1.2); rr(c, 298, 94, 32, 6, 3, '#8A929C', 1.2);
  if (s >= 3) { pans(c, [250, 276, 304, 332], 66); steam(c, 314, 92, 16); steam(c, 266, 102, 12); }
  // tableau de menu
  rr(c, 96, 40, 62, 58, 3, '#58433F', 1.4); rr(c, 100, 44, 54, 50, 2, '#3F4A47', 0);
  if (s >= 3) { c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = '700 8px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText('MENU', 127, 55); for (let i = 0; i < 4; i++) { c.fillRect(106, 62 + i * 8, 24 + (i % 2) * 8, 1.6); c.fillRect(138, 62 + i * 8, 10, 1.6); } }
  const tbl = [[70, 176, 28], [168, 190, 30], [262, 186, 28]] as const;
  for (const [cx, ty, rx] of tbl) {
    put(c, 'armchair', cx - rx - 12, ty + 22, 17); put(c, 'armchair', cx + rx + 12, ty + 22, 17);
    roundTable(c, cx, ty, rx, s >= 3 ? k.cloth : null);
    if (s >= 3) { put(c, 'candles', cx, ty + 2, 12); disc(c, cx - 14, ty - 3, 3, '#FFFFFF', 0.8); disc(c, cx + 14, ty - 3, 3, '#FFFFFF', 0.8); }
    else disc(c, cx, ty - 1, 3, '#FFFDF8', 0.8);
  }
  if (s >= 3) put(c, 'chandelier', 168, 74, 22);
  if (s === 4) { glowAt(c, 168, 150, 90, '#FFD79A', 0.25); H.awning(c, 14, 12, 74, 12, k.accent); for (const [cx, ty] of [[70, 176], [168, 190], [262, 186]]) glowAt(c, cx, ty - 6, 14, '#FFE9A8', 0.7); }
}

// ------------------------------------------------------------------ SPA

function spa(c: C, k: PlaceCtx, H: Helpers): void {
  const s = k.stage;
  H.windowAt(c, 22, 28, 60, 82, k, s >= 2 ? '#FFFFFF' : undefined); H.windowAt(c, 278, 28, 60, 82, k, s >= 2 ? '#FFFFFF' : undefined);
  // bassin (toujours là : vide et sale à l'étape 0, propre à l'étape 1, rempli ensuite)
  const cx = 180; const cy = 188; const rx = 108; const ry = 26;
  ell(c, cx, cy + 4, rx + 8, ry + 6, s >= 1 ? '#F6FAFD' : '#B9B2A8', 1.5);
  const filled = s >= 2;
  ell(c, cx, cy, rx, ry, filled ? lin(c, 0, cy - ry, 0, cy + ry, '#8FE0EE', '#3FB6CE') : (s === 0 ? '#8F867C' : '#D5DDE2'), 1.4);
  if (filled) {
    c.save(); c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.clip();
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(cx - 30 + i * 22, cy - 4 + (i % 2) * 8, 22, 4, 0, 0, Math.PI); c.stroke(); }
    c.restore();
  } else if (s === 0) { for (const [x, y] of [[cx - 40, cy - 4], [cx + 30, cy + 6], [cx - 6, cy + 10]] as const) poly(c, [[x, y], [x + 8, y - 3], [x + 6, y + 3]], '#7C8B5E', 0.8); }
  if (s < 2) return;
  put(c, 'bench', 52, 214, 24); put(c, 'bench', 308, 214, 24);
  put(c, 'plant-pot', 20, 150, 22); put(c, 'plant-pot', 340, 150, 22);
  put(c, 'fountain', 180, 146, 26);
  // pile de serviettes
  for (let i = 0; i < 3; i++) rr(c, 258, 134 - i * 7, 26, 7, 3, ['#FFFFFF', '#CDE8F6', '#FFE0EA'][i], 1);
  if (s >= 3) {
    // étagère de flacons de parfum
    rr(c, 100, 52, 60, 4, 1.5, WOOD_D, 1);
    ['#FF9EBE', '#B9A5E8', '#7FD6E8', '#F3C86B'].forEach((col, i) => { rr(c, 106 + i * 14, 36, 9, 16, 3, col, 1); rr(c, 108 + i * 14, 31, 5, 6, 1, '#E7C98A', 0.8); });
    for (const x of [60, 120, 240, 300]) put(c, 'candles', x, 176 + (x % 40), 13);
    const R = seeded(4);
    for (let i = 0; i < 9; i++) ell(c, cx - 70 + R() * 140, cy - 8 + R() * 16, 4, 2, i % 2 ? '#FF9EBE' : '#FFFFFF', 0);
    steam(c, 140, 156, 14); steam(c, 220, 156, 14);
  }
  if (s === 4) { glowAt(c, 180, 160, 110, '#BFF2FF', 0.35); H.awning(c, 16, 12, 70, 12, k.accent); H.awning(c, 274, 12, 70, 12, k.accent); }
}

// ------------------------------------------------------------------ TERRASSE ROMANTIQUE (extérieur)

export function terraceSky(c: C, k: PlaceCtx): void {
  const s = k.stage;
  const night = s >= 2;
  c.fillStyle = s === 0 ? lin(c, 0, 0, 0, FLOOR_Y, '#9C97AE', '#D8CFC4') : night ? lin(c, 0, 0, 0, FLOOR_Y, s >= 4 ? '#2B2250' : '#3A2F63', '#8A62A8', '#F5B5C8') : lin(c, 0, 0, 0, FLOOR_Y, '#7FB8F0', '#FBD9E2');
  c.fillRect(0, 0, SW, FLOOR_Y);
  if (night) {
    const R = seeded(12);
    for (let i = 0; i < 38; i++) sparkle(c, R() * SW, R() * 100, 0.9 + R() * 1.8, '#FFFFFF', 0.4 + R() * 0.6);
    disc(c, 300, 34, 14, '#FFF3C8', 0); disc(c, 305, 31, 12, s >= 4 ? '#3A2F63' : '#4A3C75', 0);
  } else {
    ell(c, 90, 40, 36, 9, 'rgba(255,255,255,0.9)'); ell(c, 120, 34, 26, 8, 'rgba(255,255,255,0.9)'); ell(c, 280, 56, 32, 8, 'rgba(255,255,255,0.8)');
  }
  // silhouette du château au loin
  c.fillStyle = night ? 'rgba(48,36,86,0.85)' : 'rgba(150,130,180,0.55)';
  c.fillRect(150, 90, 60, 58); c.fillRect(140, 70, 14, 78); c.fillRect(206, 62, 14, 86); c.fillRect(170, 76, 20, 14);
  poly(c, [[138, 70], [147, 50], [156, 70]], night ? 'rgba(48,36,86,0.85)' : 'rgba(150,130,180,0.55)', 0); poly(c, [[204, 62], [213, 40], [222, 62]], night ? 'rgba(48,36,86,0.85)' : 'rgba(150,130,180,0.55)', 0);
  if (night) for (const [x, y] of [[148, 90], [212, 84], [180, 104], [168, 120], [196, 120]]) glowAt(c, x, y, 5, '#FFE9A8', 0.9);
  // collines
  c.fillStyle = night ? '#241B48' : '#B6A3D6'; c.beginPath(); c.moveTo(0, 138); c.quadraticCurveTo(70, 112, 130, 138); c.lineTo(0, 148); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(360, 132); c.quadraticCurveTo(300, 108, 230, 138); c.lineTo(360, 148); c.closePath(); c.fill();
}
function balustrade(c: C, k: PlaceCtx): void {
  const s = k.stage;
  const R = seeded(8);
  rr(c, -4, 112, SW + 8, 7, 2, '#F7F1EA', 1.3);
  for (let x = 10; x < SW; x += 22) {
    if (s === 0 && (x === 54 || x === 120 || x === 252)) { poly(c, [[x - 4, 144], [x + 4, 144], [x + 2, 138]], '#D9CFC4', 0.8); continue; }
    c.beginPath(); c.moveTo(x - 4, 119); c.quadraticCurveTo(x - 7, 131, x - 3, 143); c.lineTo(x + 3, 143); c.quadraticCurveTo(x + 7, 131, x + 4, 119); c.closePath();
    c.fillStyle = lin(c, x - 6, 0, x + 6, 0, '#FFFFFF', '#E9DFD4'); c.fill(); ink(c, 1);
  }
  rr(c, -4, 142, SW + 8, 8, 2, '#EFE6DB', 1.3);
  if (s === 0) { for (let i = 0; i < 7; i++) { const x = R() * SW; c.strokeStyle = '#5E7F4E'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, 150); c.quadraticCurveTo(x - 4, 140, x - 7, 132); c.moveTo(x, 150); c.quadraticCurveTo(x + 3, 138, x + 6, 134); c.stroke(); } }
}
function terrace(c: C, k: PlaceCtx): void {
  const s = k.stage;
  balustrade(c, k);
  if (s >= 2) {
    // pergola
    for (const x of [26, 334]) { rr(c, x - 6, 30, 12, 160, 2, '#F4EEE6', 1.4); }
    rr(c, 14, 24, 332, 9, 2, '#F4EEE6', 1.4);
    for (let x = 40; x < 330; x += 28) rr(c, x - 3, 30, 6, 8, 1, '#E3D8CC', 1);
    const R = seeded(2);
    for (let i = 0; i < 26; i++) { const x = 16 + R() * 328; disc(c, x, 28 + R() * 12, 3.4, '#6FB67D'); if (i % 3 === 0) bloom(c, x, 30 + R() * 10, 2.6, ['#FF8FB1', '#FFFFFF', '#B9A5E8'][i % 3 === 0 ? (i / 3) % 3 | 0 : 0], false); }
    put(c, 'lamp-floor', 56, 210, 24); put(c, 'lamp-floor', 304, 210, 24);
    put(c, 'flowerbed', 100, 152, 22); put(c, 'flowerbed', 260, 152, 22);
    if (s === 2) put(c, 'bench', 180, 212, 24);
  }
  if (s >= 3) {
    stringLights(c, 26, 36, 180, 44, k.accent, 10, true); stringLights(c, 180, 44, 334, 36, k.accent, 10, true);
    roundTable(c, 180, 176, 34, k.cloth);
    put(c, 'flower-vase', 180, 177, 15); put(c, 'candles', 160, 179, 12); put(c, 'candles', 200, 179, 12);
    put(c, 'armchair', 126, 204, 22); put(c, 'armchair', 234, 204, 22);
    ell(c, 166, 177, 8, 2.4, '#FFFDF8', 0.8); ell(c, 196, 177, 8, 2.4, '#FFFDF8', 0.8);
    glowAt(c, 160, 168, 18, '#FFD79A', 0.7); glowAt(c, 200, 168, 18, '#FFD79A', 0.7);
  }
  if (s === 4) {
    lanterns(c, [60, 108, 262, 306], 56, '#FFD79A');
    const R = seeded(21);
    for (let i = 0; i < 7; i++) { c.save(); c.translate(40 + R() * 280, 60 + R() * 70); heartPath(c, 0, 0, 7); c.globalAlpha = 0.85; c.fillStyle = '#FF75A8'; c.fill(); c.restore(); }
    glowAt(c, 180, 150, 120, '#FFB8D4', 0.22);
  }
}

// ------------------------------------------------------------------ CASINO ROYAL

function slot(c: C, x: number, by: number, col: string): void {
  rr(c, x - 13, by - 40, 26, 40, 4, lin(c, x - 13, 0, x + 13, 0, sh(col, 0.2), col), 1.3);
  rr(c, x - 9, by - 33, 18, 12, 2, '#FFFDF8', 1);
  for (let i = 0; i < 3; i++) { line(c, x - 5 + i * 5, by - 31, x - 5 + i * 5, by - 23, '#E8484F', 1.6); }
  disc(c, x + 16, by - 26, 2, '#E8484F', 0.8); line(c, x + 13, by - 26, x + 16, by - 26, '#58433F', 1.2);
  rr(c, x - 7, by - 15, 14, 5, 2, '#F3C86B', 0.9);
}
function roulette(c: C, cx: number, ty: number, felt: string, filled: boolean): void {
  softShadow(c, cx, ty + 30, 70, 6, 0.3);
  rr(c, cx - 62, ty, 124, 26, 8, '#6B3E2E', 1.4);
  rr(c, cx - 58, ty + 3, 116, 20, 6, felt, 1);
  ell(c, cx - 22, ty + 12, 24, 9, '#2B2E33', 1.2);
  const segs = ['#E8484F', '#2B2E33'];
  for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(cx - 22, ty + 12); c.ellipse(cx - 22, ty + 12, 20, 7.4, 0, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2); c.closePath(); c.fillStyle = segs[i % 2]; c.fill(); }
  ell(c, cx - 22, ty + 12, 7, 2.6, '#F3C86B', 0.9); disc(c, cx - 22, ty + 11, 1.4, '#FFFFFF');
  if (filled) { for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { rr(c, cx + 6 + i * 12, ty + 6 + j * 5, 10, 4, 1, ['#FFFFFF', '#E8484F', '#F3C86B'][(i + j) % 3], 0.6); } }
}
function chips(c: C, x: number, y: number, n: number, col: string): void {
  for (let i = 0; i < n; i++) { ell(c, x, y - i * 3, 7, 2.6, col, 0.8); ell(c, x, y - i * 3 - 1, 4, 1.4, 'rgba(255,255,255,0.8)'); }
}
function casino(c: C, k: PlaceCtx, H: Helpers): void {
  const s = k.stage;
  H.windowAt(c, 24, 30, 54, 78, k, k.curtain);
  if (s < 2) return;
  slot(c, 296, 148, '#B9A5E8'); slot(c, 322, 148, '#F5B5C8'); slot(c, 270, 148, '#7FD6E8');
  const felt = k.accent;
  roulette(c, 128, 164, felt, s >= 3);
  // table de cartes
  rr(c, 214, 176, 100, 30, 14, '#6B3E2E', 1.4); rr(c, 218, 179, 92, 24, 11, felt, 1);
  for (let i = 0; i < 3; i++) { c.save(); c.translate(244 + i * 16, 190); c.rotate(-0.15 + i * 0.12); rr(c, -5, -7, 10, 14, 1.5, '#FFFFFF', 0.9); heartPath(c, 0, 0, 5); c.fillStyle = '#E8484F'; c.fill(); c.restore(); }
  chips(c, 296, 196, 4, '#E8484F'); chips(c, 286, 198, 3, '#2B2E33'); chips(c, 100, 202, 4, '#F3C86B');
  if (s >= 3) {
    put(c, 'chandelier', 120, 70, 24); put(c, 'chandelier', 250, 74, 24);
    drape(c, 4, 10, 36, 90, '#C0334D'); drape(c, 320, 10, 36, 90, '#C0334D');
    // cordons dorés
    for (const x of [46, 80, 114]) { line(c, x, 226, x, 206, '#C9A25B', 2.4); disc(c, x, 205, 2.6, '#F3C86B', 0.8); }
    c.beginPath(); c.moveTo(46, 206); c.quadraticCurveTo(63, 216, 80, 206); c.moveTo(80, 206); c.quadraticCurveTo(97, 216, 114, 206); c.strokeStyle = '#C0334D'; c.lineWidth = 2.2; c.stroke();
  }
  if (s === 4) {
    // marquise lumineuse
    for (let i = 0; i < 18; i++) { const x = 100 + i * 9; glowAt(c, x, 52, 7, '#FFE9A8', 0.7); disc(c, x, 52, 1.8, '#FFF8D8', 0.6); }
    crown(c, 180, 8, 22);
    for (const x of [70, 290]) { c.beginPath(); c.moveTo(x - 3, 0); c.lineTo(x + 3, 0); c.lineTo(x + 34, 160); c.lineTo(x - 34, 160); c.closePath(); c.fillStyle = 'rgba(255,240,190,0.12)'; c.fill(); }
    const R = seeded(33);
    for (let i = 0; i < 6; i++) { starPath(c, 30 + R() * 300, 80 + R() * 70, 3, 1.3); c.fillStyle = '#FFE9A8'; c.fill(); }
  }
}

// ------------------------------------------------------------------ distribution

export function drawPlaceProps(c: C, k: PlaceCtx, H: Helpers): void {
  void PAL; void SH; void plaque; void ink;
  switch (k.id) {
    case 'tea': return tea(c, k, H);
    case 'flowers': return flowers(c, k, H);
    case 'wing': return wing(c, k, H);
    case 'choc': return choc(c, k, H);
    case 'boutique': return boutique(c, k, H);
    case 'hotel': return hotel(c, k, H);
    case 'restaurant': return restaurant(c, k, H);
    case 'spa': return spa(c, k, H);
    case 'terrace': return terrace(c, k);
    case 'casino': return casino(c, k, H);
  }
}
