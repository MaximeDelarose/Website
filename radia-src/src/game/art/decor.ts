/**
 * « Notre petit monde » : une petite place-jardin romantique au crépuscule,
 * qui s'embellit à chaque décoration achetée. Chaque décoration a sa place
 * fixe (aucun chevauchement). Les couches statiques sont mises en cache ;
 * seules les parties animées (eau, guirlande, lampes, chat, balançoire, feux
 * d'artifice) sont redessinées à chaque image.
 */
import { OUTLINE, PAL, ellipse, fillShaded, gloss, glow, groundShadow, heartPath, roundRect, seeded, shade, sparkle } from './kit';

type C = CanvasRenderingContext2D;

export const DECOR_IDS = ['bench', 'lamps', 'roses', 'fountain', 'garland', 'kiosk', 'swing', 'cat', 'arch', 'cafe', 'chessboard', 'fireworks'] as const;
export type DecorId = typeof DECOR_IDS[number];

// --------------------------------------------------------------- outils

let LW = 2.4;
const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
function fs(c: C, color: string, x: number, y: number, w: number, h: number, lw = LW, light?: number) {
  fillShaded(c, color, box(x, y, w, h), lw, light !== undefined ? { light } : {});
}
function ol(c: C, w = LW, color: string = OUTLINE) { c.lineWidth = w; c.strokeStyle = color; c.stroke(); }
function tube(c: C, path: () => void, width: number, color: string) {
  path(); c.lineWidth = width + LW * 2; c.strokeStyle = OUTLINE; c.stroke();
  path(); c.lineWidth = width; c.strokeStyle = color; c.stroke();
}
function rose(c: C, x: number, y: number, r: number, col: string) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  fs(c, col, x - r, y - r, r * 2, r * 2, LW * 0.7, 0.35);
  c.beginPath(); c.arc(x, y, r * 0.55, 0.3, Math.PI * 1.7);
  c.lineWidth = Math.max(0.8, r * 0.18); c.strokeStyle = shade(col, -0.3); c.stroke();
}
function bush(c: C, x: number, y: number, w: number, h: number, col: string = PAL.leaf) {
  c.beginPath();
  const n = 5;
  c.moveTo(x - w / 2, y);
  for (let i = 0; i <= n; i++) {
    const px = x - w / 2 + (w * i) / n;
    const py = y - h * (0.65 + 0.35 * Math.sin((i / n) * Math.PI));
    c.quadraticCurveTo(px - w / (2 * n), py - h * 0.25, px, py);
  }
  c.lineTo(x + w / 2, y);
  c.closePath();
  fs(c, col, x - w / 2, y - h, w, h);
}

// --------------------------------------------------------------- fond

function background(c: C, w: number, h: number, k: number): void {
  const hz = h * 0.4;
  const sky = c.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#8C7BC4');
  sky.addColorStop(0.45, '#D9A6D6');
  sky.addColorStop(0.85, '#FFC7C9');
  sky.addColorStop(1, '#FFDCC4');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, hz + 2);
  glow(c, w * 0.7, hz * 0.92, w * 0.32, '#FFE7A0', 0.55);
  // étoiles
  const rnd = seeded(7);
  for (let i = 0; i < 22; i++) sparkle(c, rnd() * w, rnd() * hz * 0.55, (1 + rnd() * 1.6) * k, '#FFF8E0', 0.7);
  // nuages
  for (const [x, y, s] of [[0.18, 0.12, 1], [0.8, 0.2, 0.8], [0.5, 0.07, 0.6]] as const) {
    c.fillStyle = 'rgba(255,240,248,0.55)';
    for (const [dx, dy, r] of [[0, 0, 16], [16, -6, 14], [32, 0, 12], [-14, 2, 10]] as const) {
      c.beginPath(); c.arc(x * w + dx * k * s, y * h + dy * k * s, r * k * s, 0, Math.PI * 2); c.fill();
    }
  }
  // silhouette de Paris
  c.fillStyle = '#A685B9';
  c.beginPath();
  c.moveTo(0, hz);
  const roofs = [0.06, 0.03, 0.05, 0.035, 0.06, 0.04, 0.03, 0.05, 0.045, 0.03, 0.055, 0.04];
  let x = 0;
  roofs.forEach((rh, i) => {
    const bw = w / roofs.length;
    c.lineTo(x, hz - rh * h);
    c.lineTo(x + bw * 0.5, hz - rh * h - (i % 3 === 0 ? 0.015 * h : 0));
    c.lineTo(x + bw, hz - rh * h);
    x += bw;
  });
  c.lineTo(w, hz);
  c.closePath();
  c.fill();
  // Tour Eiffel lointaine
  const ex = w * 0.3;
  const eh = h * 0.17;
  c.beginPath();
  c.moveTo(ex, hz - eh);
  c.lineTo(ex + eh * 0.04, hz - eh * 0.7);
  c.quadraticCurveTo(ex + eh * 0.09, hz - eh * 0.32, ex + eh * 0.24, hz);
  c.lineTo(ex - eh * 0.24, hz);
  c.quadraticCurveTo(ex - eh * 0.09, hz - eh * 0.32, ex - eh * 0.04, hz - eh * 0.7);
  c.closePath();
  c.fillStyle = '#93729F';
  c.fill();
  // fenêtres allumées
  const r2 = seeded(11);
  for (let i = 0; i < 18; i++) { c.fillStyle = 'rgba(255,226,150,0.85)'; c.fillRect(r2() * w, hz - (0.01 + r2() * 0.03) * h, 2 * k, 2.6 * k); }
  // herbe
  const g = c.createLinearGradient(0, hz, 0, h);
  g.addColorStop(0, '#B9D9A8');
  g.addColorStop(0.5, '#A4CF97');
  g.addColorStop(1, '#8CC58A');
  c.fillStyle = g;
  c.fillRect(0, hz, w, h - hz);
  // haies lointaines
  for (let i = 0; i < 8; i++) {
    const bx = (i + 0.5) * (w / 8);
    c.beginPath(); c.ellipse(bx, hz + 2 * k, w / 11, 9 * k, 0, Math.PI, 0); c.fillStyle = '#93C38A'; c.fill();
  }
  // deux grands arbres en fond, de chaque côté
  for (const [tx, sc] of [[0.07, 1], [0.93, 0.9]] as const) {
    const bx = tx * w;
    const by = hz + 26 * k;
    c.fillStyle = '#8A6A55';
    c.fillRect(bx - 3 * k * sc, by - 30 * k * sc, 6 * k * sc, 30 * k * sc);
    for (const [dx, dy, r, col] of [[0, -46, 22, '#7FB77E'], [-14, -36, 16, '#8DC48A'], [14, -34, 15, '#78AE77'], [2, -58, 14, '#95CC90']] as const) {
      c.beginPath(); c.arc(bx + dx * k * sc, by + dy * k * sc, r * k * sc, 0, Math.PI * 2); c.fillStyle = col; c.fill();
    }
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(bx + ((i * 9) % 26 - 13) * k * sc, by + (-40 - (i * 7) % 20) * k * sc, 2 * k, 0, Math.PI * 2); c.fillStyle = '#FFB3CB'; c.fill(); }
  }
  // allée pavée (perspective) jusqu'à la place
  c.beginPath();
  c.moveTo(w * 0.44, hz);
  c.lineTo(w * 0.56, hz);
  c.lineTo(w * 0.78, h);
  c.lineTo(w * 0.22, h);
  c.closePath();
  const pg = c.createLinearGradient(0, hz, 0, h);
  pg.addColorStop(0, '#E9D6C8');
  pg.addColorStop(1, '#F6E6D8');
  c.fillStyle = pg;
  c.fill();
  // place ronde
  ellipse(c, w * 0.5, h * 0.7, w * 0.36, h * 0.1);
  c.fillStyle = '#F4E2D3';
  c.fill();
  c.lineWidth = 2 * k;
  c.strokeStyle = 'rgba(160,120,100,0.35)';
  c.stroke();
  // pavés
  c.strokeStyle = 'rgba(160,120,100,0.25)';
  c.lineWidth = 1 * k;
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const yy = hz + (h - hz) * t * t;
    const half = w * (0.06 + 0.22 * t * t);
    c.beginPath(); c.moveTo(w * 0.5 - half, yy); c.lineTo(w * 0.5 + half, yy); c.stroke();
  }
  // fleurs sauvages
  const r3 = seeded(5);
  for (let i = 0; i < 40; i++) {
    const fx = r3() * w;
    const fy = hz + 6 * k + r3() * (h - hz);
    if (Math.abs(fx - w / 2) < w * (0.08 + 0.3 * ((fy - hz) / (h - hz)))) continue;
    c.beginPath(); c.arc(fx, fy, (1.2 + r3()) * k, 0, Math.PI * 2);
    c.fillStyle = ['#FFFFFF', '#FFB3CB', '#FFE7A0', '#D9CDF5'][i % 4];
    c.fill();
  }
}

// --------------------------------------------------------------- décorations
// Chaque fonction dessine sa décoration avec sa base en (x, y), à l'échelle k.

function bench(c: C, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  groundShadow(c, 0, 2, 36, 6);
  for (const lx of [-24, 24]) { roundRect(c, lx - 3, -16, 6, 18, 2); fs(c, '#7A5641', lx - 3, -16, 6, 18); }
  roundRect(c, -32, -20, 64, 7, 3); fs(c, '#C98B63', -32, -20, 64, 7);
  roundRect(c, -30, -40, 60, 7, 3); fs(c, '#C98B63', -30, -40, 60, 7);
  roundRect(c, -30, -31, 60, 7, 3); fs(c, '#D9A47D', -30, -31, 60, 7);
  heartPath(c, 0, -27, 8); c.fillStyle = PAL.roseVif; c.fill();
  c.restore();
}

function lampPost(c: C, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  groundShadow(c, 0, 2, 12, 3);
  roundRect(c, -6, -8, 12, 8, 2); fs(c, PAL.nuit, -6, -8, 12, 8);
  roundRect(c, -2.5, -74, 5, 68, 2); fs(c, '#5E5372', -2.5, -74, 5, 68);
  c.beginPath(); c.moveTo(-9, -76); c.lineTo(9, -76); c.lineTo(6, -92); c.lineTo(-6, -92); c.closePath();
  fs(c, '#FFF0B8', -9, -92, 18, 16);
  c.beginPath(); c.moveTo(-11, -92); c.lineTo(11, -92); c.lineTo(0, -100); c.closePath(); fs(c, PAL.nuit, -11, -100, 22, 8);
  c.restore();
}
function lampGlow(c: C, x: number, y: number, k: number, t: number, phase: number) {
  const a = 0.45 + 0.1 * Math.sin(t * 7 + phase) + 0.05 * Math.sin(t * 13 + phase);
  glow(c, x, y - 84 * k, 34 * k, '#FFE2A0', a);
}

function rosesBed(c: C, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  groundShadow(c, 0, 2, 44, 7);
  bush(c, 0, 0, 84, 36, PAL.leafDeep);
  bush(c, -6, -2, 64, 28, PAL.leaf);
  const rnd = seeded(3);
  for (let i = 0; i < 11; i++) rose(c, -34 + rnd() * 66, -26 + rnd() * 20, 4.5 + rnd() * 2, i % 3 ? PAL.roseVif : PAL.rose);
  c.restore();
}

function fountainBase(c: C, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  groundShadow(c, 0, 4, 52, 10);
  // bassin
  ellipse(c, 0, -10, 48, 14); fs(c, '#E9E1F5', -48, -24, 96, 28);
  ellipse(c, 0, -14, 40, 9);
  const water = c.createLinearGradient(0, -24, 0, -4);
  water.addColorStop(0, '#BFE3F7'); water.addColorStop(1, '#8EC9EC');
  c.fillStyle = water; c.fill(); ol(c, LW * 0.6);
  // colonne + vasque
  roundRect(c, -6, -46, 12, 34, 3); fs(c, '#E9E1F5', -6, -46, 12, 34);
  ellipse(c, 0, -48, 20, 6); fs(c, '#F2ECFA', -20, -54, 40, 12);
  heartPath(c, 0, -60, 12); fs(c, PAL.roseVif, -6, -66, 12, 12, LW * 0.7);
  c.restore();
}
function fountainWater(c: C, x: number, y: number, k: number, t: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.strokeStyle = 'rgba(190,230,250,0.9)';
  c.lineWidth = 2.2;
  for (const s of [-1, 1]) {
    for (let j = 0; j < 2; j++) {
      const off = ((t * 1.6 + j * 0.5) % 1);
      c.globalAlpha = 0.9 - off * 0.5;
      c.beginPath();
      c.moveTo(0, -66);
      c.quadraticCurveTo(s * (14 + j * 6), -86 + off * 4, s * (22 + j * 8), -50 + off * 6);
      c.stroke();
    }
  }
  c.globalAlpha = 1;
  // gouttes et ronds dans l'eau
  for (let i = 0; i < 6; i++) {
    const p = (t * 1.3 + i / 6) % 1;
    const ax = Math.sin(i * 2.1) * 26;
    ellipse(c, ax, -14, 3 + p * 8, (3 + p * 8) * 0.3);
    c.strokeStyle = `rgba(255,255,255,${0.7 * (1 - p)})`;
    c.lineWidth = 1.2;
    c.stroke();
  }
  c.restore();
}

function garlandPoles(c: C, x1: number, x2: number, y: number, k: number) {
  for (const x of [x1, x2]) {
    c.save(); c.translate(x, y); c.scale(k, k);
    roundRect(c, -2, -70, 4, 70, 2); fs(c, '#B48A6A', -2, -70, 4, 70);
    c.restore();
  }
}
function garlandLights(c: C, x1: number, x2: number, y: number, k: number, t: number) {
  const top = y - 68 * k;
  const sag = 22 * k;
  c.beginPath();
  c.moveTo(x1, top);
  c.quadraticCurveTo((x1 + x2) / 2, top + sag * 2, x2, top);
  c.lineWidth = 1.4 * k; c.strokeStyle = '#6B5A7A'; c.stroke();
  const n = 11;
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const bx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * ((x1 + x2) / 2) + u * u * x2;
    const by = (1 - u) * (1 - u) * top + 2 * (1 - u) * u * (top + sag * 2) + u * u * top + 3 * k;
    const on = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7);
    const col = ['#FFE7A0', '#FFB3CB', '#D9CDF5'][i % 3];
    glow(c, bx, by, 8 * k, col, 0.6 * on);
    c.beginPath(); c.arc(bx, by, 2.4 * k, 0, Math.PI * 2);
    c.fillStyle = col; c.fill();
    c.lineWidth = 0.8 * k; c.strokeStyle = OUTLINE; c.stroke();
  }
}

function kiosk(c: C, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  groundShadow(c, 0, 2, 44, 8);
  ellipse(c, 0, -4, 40, 9); fs(c, '#F2E6DA', -40, -13, 80, 18);
  for (const px of [-32, -12, 12, 32]) { roundRect(c, px - 2.5, -56, 5, 52, 2); fs(c, PAL.ivory, px - 2.5, -56, 5, 52, LW * 0.8); }
  // rambarde
  c.beginPath(); c.moveTo(-36, -22); c.lineTo(36, -22); c.lineWidth = 3; c.strokeStyle = PAL.ivory; c.stroke();
  c.beginPath(); c.moveTo(-36, -22); c.lineTo(36, -22); c.lineWidth = 0.8; c.strokeStyle = OUTLINE; c.stroke();
  // toit
  c.beginPath(); c.moveTo(-46, -54); c.quadraticCurveTo(-10, -66, 0, -92); c.quadraticCurveTo(10, -66, 46, -54); c.quadraticCurveTo(0, -46, -46, -54); c.closePath();
  fs(c, PAL.roseVif, -46, -92, 92, 46);
  c.beginPath(); c.moveTo(-46, -54); c.quadraticCurveTo(0, -46, 46, -54); c.lineWidth = 3; c.strokeStyle = '#FFFFFF'; c.stroke();
  heartPath(c, 0, -96, 9); fs(c, PAL.or, -5, -101, 10, 10, LW * 0.6);
  gloss(c, -20, -62, 6, 2.4, 0.5, -0.4);
  c.restore();
}

function swing(c: C, x: number, y: number, k: number, t: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  groundShadow(c, 0, 2, 32, 5);
  // portique
  for (const s of [-1, 1]) {
    tube(c, () => { c.beginPath(); c.moveTo(s * 30, 0); c.lineTo(s * 22, -76); }, 4, '#B48A6A');
  }
  tube(c, () => { c.beginPath(); c.moveTo(-24, -74); c.lineTo(24, -74); }, 5, '#C98B63');
  // siège qui se balance
  const a = Math.sin(t * 1.8) * 0.22;
  c.translate(0, -74);
  c.rotate(a);
  c.beginPath(); c.moveTo(-11, 0); c.lineTo(-11, 54); c.moveTo(11, 0); c.lineTo(11, 54);
  c.lineWidth = 1.4; c.strokeStyle = '#7A5641'; c.stroke();
  roundRect(c, -15, 52, 30, 6, 3); fs(c, PAL.rose, -15, 52, 30, 6, LW * 0.8);
  for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 11, 14, 2.6, 0, Math.PI * 2); c.fillStyle = PAL.roseVif; c.fill(); }
  c.restore();
}

function catBody(c: C, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  groundShadow(c, 0, 1, 16, 3);
  ellipse(c, 0, -10, 12, 11); fs(c, '#F4A261', -12, -21, 24, 22);
  ellipse(c, 0, -26, 10, 9); fs(c, '#FFD9B0', -10, -35, 20, 18);
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(s * 9, -30); c.lineTo(s * 8, -40); c.lineTo(s * 2, -33); c.closePath(); fs(c, '#F4A261', -9, -40, 18, 10, LW * 0.7);
  }
  for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 3.8, -27, 1.3, 0, Math.PI * 2); c.fillStyle = OUTLINE; c.fill(); }
  ellipse(c, 0, -23.5, 1.4, 1); c.fillStyle = PAL.roseDeep; c.fill();
  // nœud
  heartPath(c, 0, -17, 6); c.fillStyle = PAL.roseVif; c.fill();
  c.restore();
}
function catTail(c: C, x: number, y: number, k: number, t: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  const w = Math.sin(t * 2.4) * 6;
  tube(c, () => { c.beginPath(); c.moveTo(10, -6); c.quadraticCurveTo(22, -8, 20 + w * 0.4, -22 + w * 0.3); }, 3.4, '#F4A261');
  c.restore();
}

function arch(c: C, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  for (const s of [-1, 1]) { roundRect(c, s * 30 - 3, -64, 6, 64, 2); fs(c, PAL.ivory, s * 30 - 3, -64, 6, 64, LW * 0.8); }
  c.beginPath(); c.arc(0, -64, 30, Math.PI, 0);
  c.lineWidth = 6 + LW * 2; c.strokeStyle = OUTLINE; c.stroke();
  c.lineWidth = 6; c.strokeStyle = PAL.ivory; c.stroke();
  // feuillage et roses le long de l'arche
  const rnd = seeded(9);
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI + (i / 14) * Math.PI;
    const px = Math.cos(a) * 30;
    const py = -64 + Math.sin(a) * 30;
    c.beginPath(); c.arc(px + (rnd() - 0.5) * 4, py, 6, 0, Math.PI * 2); c.fillStyle = i % 2 ? PAL.leaf : PAL.leafDeep; c.fill();
  }
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + ((i + 0.5) / 9) * Math.PI;
    rose(c, Math.cos(a) * 30, -64 + Math.sin(a) * 30, 3.8, i % 2 ? PAL.roseVif : PAL.rose);
  }
  for (const s of [-1, 1]) for (let j = 0; j < 3; j++) rose(c, s * 30 + (j % 2 ? 4 : -4), -16 - j * 16, 3.4, PAL.roseVif);
  c.restore();
}

function cafe(c: C, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  groundShadow(c, 0, 2, 38, 6);
  // chaises
  for (const s of [-1, 1]) {
    c.save(); c.translate(s * 26, 0);
    roundRect(c, -9, -22, 18, 4, 2); fs(c, PAL.nuit, -9, -22, 18, 4, LW * 0.7);
    tube(c, () => { c.beginPath(); c.moveTo(s * -7, -20); c.lineTo(s * -7, 0); c.moveTo(s * 7, -20); c.lineTo(s * 7, 0); }, 1.6, '#6B5A7A');
    tube(c, () => { c.beginPath(); c.moveTo(s * 7, -22); c.lineTo(s * 9, -42); }, 1.6, '#6B5A7A');
    c.beginPath(); c.arc(s * 9, -44, 5, 0, Math.PI * 2); fs(c, PAL.rose, s * 9 - 5, -49, 10, 10, LW * 0.6);
    c.restore();
  }
  // table
  tube(c, () => { c.beginPath(); c.moveTo(0, -28); c.lineTo(0, 0); }, 3, '#6B5A7A');
  ellipse(c, 0, 0, 10, 3); fs(c, '#6B5A7A', -10, -3, 20, 6, LW * 0.6);
  ellipse(c, 0, -30, 20, 6); fs(c, PAL.ivory, -20, -36, 40, 12);
  // tasses + cœur
  for (const s of [-1, 1]) { roundRect(c, s * 8 - 4, -40, 8, 7, 2); fs(c, PAL.creme, s * 8 - 4, -40, 8, 7, LW * 0.6); }
  heartPath(c, 0, -43, 7); c.fillStyle = PAL.roseVif; c.fill();
  c.restore();
}

function chessboard(c: C, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  // damier en perspective
  const W = 64;
  const H = 24;
  for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
    const y0 = -H + (r * H) / 4;
    const y1 = -H + ((r + 1) * H) / 4;
    const w0 = (W / 2) * (0.75 + 0.25 * (r / 4));
    const w1 = (W / 2) * (0.75 + 0.25 * ((r + 1) / 4));
    c.beginPath();
    c.moveTo(-w0 + (2 * w0 * q) / 4, y0);
    c.lineTo(-w0 + (2 * w0 * (q + 1)) / 4, y0);
    c.lineTo(-w1 + (2 * w1 * (q + 1)) / 4, y1);
    c.lineTo(-w1 + (2 * w1 * q) / 4, y1);
    c.closePath();
    c.fillStyle = (r + q) % 2 ? '#F0A9BF' : PAL.ivory;
    c.fill();
  }
  c.beginPath(); c.moveTo(-W * 0.375, -H); c.lineTo(W * 0.375, -H); c.lineTo(W / 2, 0); c.lineTo(-W / 2, 0); c.closePath(); ol(c, LW * 0.8);
  // grandes pièces
  const piece = (px: number, py: number, s: number, col: string, top: (c: C) => void) => {
    c.save(); c.translate(px, py); c.scale(s, s);
    ellipse(c, 0, 0, 9, 3); fs(c, col, -9, -3, 18, 6, LW * 0.8);
    c.beginPath(); c.moveTo(-7, -1); c.quadraticCurveTo(-4, -14, -3, -20); c.lineTo(3, -20); c.quadraticCurveTo(4, -14, 7, -1); c.closePath();
    fs(c, col, -7, -20, 14, 20, LW * 0.8);
    top(c);
    c.restore();
  };
  piece(-16, -8, 1.1, PAL.ivory, (cc) => { cc.beginPath(); cc.arc(0, -24, 5.5, 0, Math.PI * 2); fs(cc, PAL.ivory, -5.5, -30, 11, 11, LW * 0.8); });
  piece(16, -6, 1.25, PAL.nuit, (cc) => {
    cc.beginPath(); cc.moveTo(-6, -20); cc.lineTo(-7, -30); cc.lineTo(-3, -25); cc.lineTo(0, -32); cc.lineTo(3, -25); cc.lineTo(7, -30); cc.lineTo(6, -20); cc.closePath();
    fs(cc, PAL.or, -7, -32, 14, 12, LW * 0.7);
  });
  c.restore();
}

/** Explosion de feu d'artifice (cycle de 2,4 s, plusieurs foyers). */
function fireworks(c: C, w: number, h: number, k: number, t: number) {
  const spots = [[0.2, 0.14, 0], [0.78, 0.1, 0.8], [0.52, 0.2, 1.6]] as const;
  const cols = ['#FFE7A0', '#FF9CC0', '#D9CDF5'];
  spots.forEach(([fx, fy, off], i) => {
    const p = ((t + off) % 2.4) / 2.4;
    const cx = fx * w;
    const cy = fy * h;
    if (p < 0.25) {
      // fusée qui monte
      const q = p / 0.25;
      const yy = h * 0.4 - (h * 0.4 - cy) * q;
      c.beginPath(); c.arc(cx, yy, 1.6 * k, 0, Math.PI * 2); c.fillStyle = '#FFF6D0'; c.fill();
      return;
    }
    const q = (p - 0.25) / 0.75;
    const r = (10 + 46 * Math.sqrt(q)) * k;
    const a = 1 - q;
    glow(c, cx, cy, r * 1.2, cols[i], 0.45 * a);
    const n = 14;
    for (let j = 0; j < n; j++) {
      const ang = (j / n) * Math.PI * 2 + i;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r + q * q * 10 * k;
      c.globalAlpha = a;
      // traînée lumineuse
      c.beginPath();
      c.moveTo(cx + Math.cos(ang) * r * 0.55, cy + Math.sin(ang) * r * 0.55);
      c.lineTo(px, py);
      c.strokeStyle = cols[i];
      c.lineWidth = 1.6 * k;
      c.stroke();
      if (j % 2) { heartPath(c, px, py, 8 * k); c.fillStyle = cols[i]; c.fill(); }
      else sparkle(c, px, py, 4.5 * k, '#FFFFFF');
    }
    c.globalAlpha = 1;
  });
}

// --------------------------------------------------------------- placement

interface Spot { x: number; y: number; s: number }
/** Positions (fractions de la largeur/hauteur) et taille relative. */
const SPOTS: Record<Exclude<DecorId, 'fireworks' | 'garland' | 'lamps'>, Spot> = {
  kiosk: { x: 0.2, y: 0.55, s: 0.85 },
  arch: { x: 0.5, y: 0.53, s: 0.75 },
  chessboard: { x: 0.8, y: 0.56, s: 0.95 },
  fountain: { x: 0.5, y: 0.75, s: 0.82 },
  bench: { x: 0.2, y: 0.76, s: 0.82 },
  cafe: { x: 0.8, y: 0.78, s: 0.88 },
  roses: { x: 0.17, y: 0.96, s: 0.85 },
  cat: { x: 0.56, y: 0.95, s: 1.0 },
  swing: { x: 0.84, y: 0.97, s: 0.82 },
};
const LAMPS = [{ x: 0.06, y: 0.86 }, { x: 0.94, y: 0.86 }];
const GARLAND = { x1: 0.31, x2: 0.69, y: 0.62 };

// --------------------------------------------------------------- scène

interface Cache { key: string; cv: HTMLCanvasElement }
let cache: Cache | null = null;

function scaleOf(w: number, h: number): number { return Math.min(w / 360, h / 480); }

function drawStatic(c: C, w: number, h: number, owned: ReadonlySet<string>): void {
  const k = scaleOf(w, h);
  LW = 2.4;
  background(c, w, h, k);
  const P = (id: keyof typeof SPOTS) => SPOTS[id];
  // ordre d'affichage : du fond vers l'avant
  if (owned.has('kiosk')) kiosk(c, P('kiosk').x * w, P('kiosk').y * h, k * P('kiosk').s);
  if (owned.has('arch')) arch(c, P('arch').x * w, P('arch').y * h, k * P('arch').s);
  if (owned.has('chessboard')) chessboard(c, P('chessboard').x * w, P('chessboard').y * h, k * P('chessboard').s);
  if (owned.has('garland')) garlandPoles(c, GARLAND.x1 * w, GARLAND.x2 * w, GARLAND.y * h, k);
  if (owned.has('fountain')) fountainBase(c, P('fountain').x * w, P('fountain').y * h, k * P('fountain').s);
  if (owned.has('bench')) bench(c, P('bench').x * w, P('bench').y * h, k * P('bench').s);
  if (owned.has('cafe')) cafe(c, P('cafe').x * w, P('cafe').y * h, k * P('cafe').s);
  if (owned.has('lamps')) for (const l of LAMPS) lampPost(c, l.x * w, l.y * h, k * 0.9);
  if (owned.has('roses')) rosesBed(c, P('roses').x * w, P('roses').y * h, k * P('roses').s);
  if (owned.has('cat')) catBody(c, P('cat').x * w, P('cat').y * h, k * P('cat').s);
}

export function drawDecorScene(ctx: CanvasRenderingContext2D, w: number, h: number, owned: ReadonlySet<string>, t: number): void {
  const tr = ctx.getTransform();
  const dpr = Math.max(1, Math.min(3, Math.hypot(tr.a, tr.b) || 1));
  const key = `${w}x${h}@${dpr}:${[...owned].sort().join(',')}`;
  if (!cache || cache.key !== key) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const c = cv.getContext('2d')!;
    c.scale(dpr, dpr);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    drawStatic(c, w, h, owned);
    cache = { key, cv };
  }
  ctx.drawImage(cache.cv, 0, 0, w, h);
  // parties animées
  const k = scaleOf(w, h);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  LW = 2.4;
  if (owned.has('fireworks')) fireworks(ctx, w, h, k, t);
  if (owned.has('garland')) garlandLights(ctx, GARLAND.x1 * w, GARLAND.x2 * w, GARLAND.y * h, k, t);
  if (owned.has('fountain')) fountainWater(ctx, SPOTS.fountain.x * w, SPOTS.fountain.y * h, k * SPOTS.fountain.s, t);
  if (owned.has('lamps')) LAMPS.forEach((l, i) => lampGlow(ctx, l.x * w, l.y * h, k * 0.9, t, i * 2));
  if (owned.has('cat')) catTail(ctx, SPOTS.cat.x * w, SPOTS.cat.y * h, k * SPOTS.cat.s, t);
  if (owned.has('swing')) swing(ctx, SPOTS.swing.x * w, SPOTS.swing.y * h, k * SPOTS.swing.s, t);
  // un petit cœur flottant quand tout est acheté
  if (owned.size >= DECOR_IDS.length) {
    const yy = h * 0.3 + Math.sin(t * 1.5) * 6 * k;
    heartPath(ctx, w * 0.5, yy, 22 * k);
    ctx.fillStyle = 'rgba(255,117,168,0.85)';
    ctx.fill();
    sparkle(ctx, w * 0.5 - 6 * k, yy - 4 * k, 3 * k);
  }
  ctx.restore();
}

/** Vignette d'une décoration seule (boutique). */
export function drawDecorIcon(ctx: CanvasRenderingContext2D, id: DecorId, size: number): void {
  const c = ctx;
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  LW = 2.4;
  const s = size / 100;
  const base = size * 0.88;
  switch (id) {
    case 'bench': bench(c, size / 2, base, s * 1.2); break;
    case 'lamps': lampPost(c, size * 0.36, base, s * 0.78); lampPost(c, size * 0.66, base, s * 0.78); glow(c, size * 0.36, base - 66 * s, 20 * s, '#FFE2A0', 0.5); glow(c, size * 0.66, base - 66 * s, 20 * s, '#FFE2A0', 0.5); break;
    case 'roses': rosesBed(c, size / 2, base, s * 1.05); break;
    case 'fountain': fountainBase(c, size / 2, base, s * 0.95); fountainWater(c, size / 2, base, s * 0.95, 0.3); break;
    case 'garland': garlandPoles(c, size * 0.14, size * 0.86, base, s * 1.1); garlandLights(c, size * 0.14, size * 0.86, base, s * 1.1, 0.5); break;
    case 'kiosk': kiosk(c, size / 2, base, s * 0.8); break;
    case 'swing': swing(c, size / 2, base, s * 1.05, 0.6); break;
    case 'cat': catBody(c, size * 0.46, base, s * 2); catTail(c, size * 0.46, base, s * 2, 0.4); break;
    case 'arch': arch(c, size / 2, base, s * 0.85); break;
    case 'cafe': cafe(c, size / 2, base, s * 1.15); break;
    case 'chessboard': chessboard(c, size / 2, base - 4 * s, s * 1.3); break;
    case 'fireworks': {
      c.save();
      c.beginPath(); c.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
      const g = c.createLinearGradient(0, 0, 0, size);
      g.addColorStop(0, '#6B5A8C'); g.addColorStop(1, '#D9A6D6');
      c.fillStyle = g; c.fill(); c.clip();
      // on centre la première gerbe (placée à 20 % / 14 % de la scène)
      c.translate(size * 0.3, size * 0.5 - size * 2.2 * 0.14);
      fireworks(c, size, size * 2.2, s * 0.8, 1.3);
      c.restore();
      c.beginPath(); c.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
      c.lineWidth = 2.4 * s; c.strokeStyle = OUTLINE; c.stroke();
      break;
    }
  }
  c.restore();
  void gloss;
}
