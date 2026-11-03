/** Décors romantiques d'intérieur : restaurant, palace, bal, hôtel. */
import {
  type PlaceDef, W, H, INK, INK_S, lin, rad, box, rr, poly, ell, glowAt, heart, star4, shadowEll, archPath, eiffel, roofs,
  flame, candle, rose, vase, chandelier, twinkle, curtain, floor, floaters, garland, plant, seeded, flower, leaf,
} from './common';

// ------------------------------------------------------------------ restaurant
const RES_FLAMES: [number, number][] = [];
const RES_LAMPS: [number, number][] = [[92, 150], [196, 130], [300, 150]];
const RES_BOK: [number, number, number][] = [];

export const restaurant: PlaceDef = {
  bg(c) {
    RES_FLAMES.length = 0; RES_BOK.length = 0;
    c.fillStyle = lin(c, 0, 0, 0, 360, '#4e2c4a', '#8d4f6b', '#c98c9b'); c.fillRect(0, 0, W, 360);
    // boiseries
    for (let x = 0; x < W; x += 66) box(c, x + 8, 232, 50, 100, 'rgba(255,220,225,0.07)', 'rgba(255,220,225,0.22)', 1.2);
    box(c, 0, 226, W, 8, '#d9a35e', 'rgba(88,67,63,0.4)');
    box(c, 0, 330, W, 8, '#c58a4b', 'rgba(88,67,63,0.4)');
    // fenêtres sur la ville nocturne
    for (const x0 of [30, 255]) {
      c.save(); archPath(c, x0, 46, 108, 180); c.clip();
      c.fillStyle = lin(c, 0, 46, 0, 226, '#2a2150', '#5b3b7a', '#d98aa0'); c.fillRect(x0, 46, 108, 180);
      const r = seeded(x0);
      for (let i = 0; i < 26; i++) { const x = x0 + r() * 108, y = 100 + r() * 120; glowAt(c, x, y, 6 + r() * 6, i % 3 ? '#ffd98c' : '#ffb4c8', 0.7); }
      c.fillStyle = 'rgba(40,25,70,0.7)'; for (let i = 0; i < 6; i++) c.fillRect(x0 + i * 20, 190 + (i % 3) * 8, 22, 40);
      c.restore();
      c.strokeStyle = '#e9c27a'; c.lineWidth = 4; archPath(c, x0, 46, 108, 180); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + 54, 46 + 54); c.lineTo(x0 + 54, 226); c.moveTo(x0, 150); c.lineTo(x0 + 108, 150); c.stroke();
    }
    // miroir central + cadre
    rr(c, 150, 70, 94, 130, 40, lin(c, 150, 70, 244, 200, '#f4dfe8', '#b995b3', '#f4dfe8'), '#e0b369', 4);
    // rideaux
    curtain(c, -1, 34, 280, '#8a2748', '#b63c63');
    curtain(c, 1, 34, 280, '#8a2748', '#b63c63');
    // sol
    floor(c, 338, '#4a2c3a', '#2f1b28', 'rgba(255,200,180,0.1)');
    // tapis rose
    poly(c, [[120, 338], [273, 338], [360, H], [33, H]], 'rgba(214,120,150,0.22)', null);
    // tables de fond
    for (const [tx, s] of [[48, 0.62], [345, 0.62]] as const) {
      const ty = 312;
      shadowEll(c, tx, ty + 24, 38 * s + 10, 7, 0.3);
      c.beginPath(); c.moveTo(tx - 40 * s, ty); c.lineTo(tx + 40 * s, ty); c.lineTo(tx + 52 * s, ty + 26); c.lineTo(tx - 52 * s, ty + 26); c.closePath(); c.fillStyle = '#fff1ee'; c.fill(); c.strokeStyle = INK_S; c.stroke();
      ell(c, tx, ty, 40 * s, 8 * s, '#fffaf6', INK_S, 1);
      RES_FLAMES.push(candle(c, tx, ty + 1, 0.8));
    }
    // table principale
    shadowEll(c, W / 2, 468, 190, 16, 0.25);
    c.beginPath(); c.moveTo(34, 392); c.lineTo(359, 392); c.lineTo(386, 478); c.lineTo(7, 478); c.closePath();
    c.fillStyle = lin(c, 0, 392, 0, 478, '#fff6f2', '#f1d3d6'); c.fill(); c.strokeStyle = INK_S; c.lineWidth = 1.2; c.stroke();
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(34 + i * 40.6, 395); c.lineTo(7 + i * 47.4, 476); c.strokeStyle = 'rgba(201,140,160,0.25)'; c.stroke(); }
    ell(c, W / 2, 392, 165, 22, lin(c, 0, 370, 0, 414, '#ffffff', '#fbe9ea'), INK_S, 1.2);
    // couverts
    for (const px of [78, 316]) {
      ell(c, px, 394, 26, 7, '#fff', INK_S, 1); ell(c, px, 393, 16, 4.4, '#fde7ee', INK_S, 0.7); heart(c, px, 393.5, 3, '#ff8fb1');
    }
    for (const gx of [128, 268]) { // verres
      c.fillStyle = 'rgba(255,255,255,0.65)'; c.strokeStyle = INK; c.lineWidth = 1;
      c.beginPath(); c.moveTo(gx - 6, 372); c.quadraticCurveTo(gx - 7, 386, gx, 387); c.quadraticCurveTo(gx + 7, 386, gx + 6, 372); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(214,70,110,0.6)'; c.beginPath(); c.moveTo(gx - 6, 378); c.quadraticCurveTo(gx - 6, 386, gx, 387); c.quadraticCurveTo(gx + 6, 386, gx + 6, 378); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(gx, 387); c.lineTo(gx, 396); c.moveTo(gx - 5, 396); c.lineTo(gx + 5, 396); c.stroke();
    }
    vase(c, W / 2, 398, 1.15, 'rgba(255,255,255,0.7)', ['#ff7fa6', '#e8558f', '#ffb3c8', '#e8558f', '#ff7fa6'], 5);
    RES_FLAMES.push(candle(c, 168, 396, 1.15), candle(c, 226, 396, 1.15));
    // lampes suspendues
    for (const [x, y] of RES_LAMPS) {
      c.strokeStyle = 'rgba(88,67,63,0.6)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y - 24); c.stroke();
      c.beginPath(); c.moveTo(x - 7, y - 24); c.lineTo(x + 7, y - 24); c.lineTo(x + 24, y); c.lineTo(x - 24, y); c.closePath();
      c.fillStyle = lin(c, x - 24, 0, x + 24, 0, '#f6c98a', '#ffe9b8', '#f6c98a'); c.fill(); c.strokeStyle = INK_S; c.stroke();
    }
    // pétales au sol
    const r = seeded(11);
    for (let i = 0; i < 14; i++) heart(c, 20 + r() * 350, 484 + r() * 12, 2 + r() * 2, '#ff8fb1', 0.6);
    // vignettage tamisé
    c.fillStyle = rad(c, W / 2, 250, 120, 340, 'rgba(0,0,0,0)', 'rgba(40,10,40,0.38)'); c.fillRect(0, 0, W, H);
  },
  fx(c, t) {
    for (const [x, y] of RES_LAMPS) glowAt(c, x, y + 4, 70 + Math.sin(t * 1.3 + x) * 4, 'rgba(255,205,130,0.9)', 0.35);
    RES_FLAMES.forEach(([x, y], i) => flame(c, x, y, 1, t, i));
    floaters(c, t, 10, 7, 'rgba(255,230,180,0.9)', 1.6, 6, 0.6);
  },
};

// ------------------------------------------------------------------ palace
const PAL_PTS: [number, number][] = [];
export const palace: PlaceDef = {
  bg(c) {
    PAL_PTS.length = 0;
    c.fillStyle = lin(c, 0, 0, 0, 340, '#f8ecd9', '#f3dcc8'); c.fillRect(0, 0, W, 340);
    // grande baie
    c.save(); archPath(c, 82, 34, 229, 290); c.clip();
    c.fillStyle = lin(c, 0, 34, 0, 324, '#7e86d4', '#e7a4c4', '#ffd9b0'); c.fillRect(82, 34, 229, 290);
    glowAt(c, 196, 250, 120, 'rgba(255,230,170,0.9)', 0.7);
    for (let i = 0; i < 18; i++) { const r = seeded(i + 2); star4(c, 100 + r() * 190, 50 + r() * 100, 1.6, '#fff', 0.8); }
    eiffel(c, 196, 322, 0.9, 'rgba(110,80,130,0.78)');
    roofs(c, 268, 56, 'rgba(100,80,130,0.6)', 5);
    roofs(c, 290, 40, 'rgba(80,60,110,0.8)', 9, '#ffd98c');
    c.restore();
    c.strokeStyle = '#d9a43c'; c.lineWidth = 5; archPath(c, 82, 34, 229, 290); c.stroke();
    c.strokeStyle = 'rgba(217,164,60,0.7)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(196, 34 + 0); c.lineTo(196, 324); c.moveTo(82, 170); c.lineTo(311, 170); c.stroke();
    // colonnes
    for (const x of [18, 48, 321, 351]) {
      rr(c, x - 12, 60, 24, 276, 3, lin(c, x - 12, 0, x + 12, 0, '#f1e3cd', '#fffaf0', '#e5d3b8'), INK_S);
      rr(c, x - 17, 48, 34, 16, 3, '#e9c26a', INK_S); rr(c, x - 16, 330, 32, 12, 2, '#e9c26a', INK_S);
      c.strokeStyle = 'rgba(160,120,70,0.25)'; for (let k = -6; k <= 6; k += 6) { c.beginPath(); c.moveTo(x + k, 66); c.lineTo(x + k, 330); c.stroke(); }
    }
    // frise dorée
    box(c, 0, 18, W, 12, '#e9c26a', INK_S);
    for (let x = 6; x < W; x += 24) heart(c, x, 24, 3.6, '#fff1c8', 0.9);
    // balustrade
    rr(c, 0, 318, W, 10, 3, '#fff6e6', INK_S);
    for (let x = 6; x < W; x += 20) { c.beginPath(); c.moveTo(x, 328); c.quadraticCurveTo(x + 5, 340, x, 352); c.quadraticCurveTo(x - 5, 340, x, 328); c.fillStyle = '#fbf0dc'; c.fill(); c.strokeStyle = INK_S; c.stroke(); }
    rr(c, 0, 350, W, 8, 2, '#f1e1c8', INK_S);
    // sol de marbre en damier
    c.fillStyle = '#f7ead5'; c.fillRect(0, 358, W, H - 358);
    c.save(); c.beginPath(); c.rect(0, 358, W, H - 358); c.clip();
    const rows = 6;
    for (let j = 0; j < rows; j++) {
      const y0 = 358 + (142 * j * j) / (rows * rows), y1 = 358 + (142 * (j + 1) * (j + 1)) / (rows * rows);
      const n = 10;
      for (let i = -4; i < n + 4; i++) {
        const xa0 = W / 2 + (i - n / 2) * (20 + j * 8), xa1 = W / 2 + (i + 1 - n / 2) * (20 + j * 8);
        const xb0 = W / 2 + (i - n / 2) * (20 + (j + 1) * 8), xb1 = W / 2 + (i + 1 - n / 2) * (20 + (j + 1) * 8);
        if ((i + j) % 2) poly(c, [[xa0, y0], [xa1, y0], [xb1, y1], [xb0, y1]], 'rgba(230,200,205,0.55)', null);
      }
    }
    c.restore();
    // tapis rouge central
    poly(c, [[170, 358], [223, 358], [300, H], [93, H]], lin(c, 0, 358, 0, H, '#c94a6a', '#a8284c'), null);
    poly(c, [[170, 358], [174, 358], [100, H], [93, H]], '#e9c26a', null); poly(c, [[219, 358], [223, 358], [300, H], [293, H]], '#e9c26a', null);
    // escaliers latéraux
    for (const s of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const y = 340 + k * 22, w = 56 + k * 12;
        const x = s < 0 ? 0 : W - w;
        box(c, x, y, w, 22, k % 2 ? '#f6e7d0' : '#fbefdc', INK_S);
        box(c, x, y + 16, w, 6, 'rgba(201,160,100,0.45)', null);
      }
      rr(c, s < 0 ? 0 : W - 10, 300, 10, 200, 3, '#e9c26a', INK_S);
    }
    // lustres
    PAL_PTS.push(...chandelier(c, 196, 46, 1.55), ...chandelier(c, 62, 40, 0.85), ...chandelier(c, 330, 40, 0.85));
    c.fillStyle = rad(c, W / 2, 260, 150, 360, 'rgba(0,0,0,0)', 'rgba(110,60,60,0.16)'); c.fillRect(0, 0, W, H);
  },
  fx(c, t) {
    twinkle(c, PAL_PTS, t, 'rgba(255,236,170,0.95)', 16, 2.2);
    floaters(c, t, 16, 21, '#ffe9a8', 2.2, 8, 0.8);
  },
};

// ------------------------------------------------------------------ bal
const BAL_PTS: [number, number][] = [];
export const ballroom: PlaceDef = {
  bg(c) {
    BAL_PTS.length = 0;
    c.fillStyle = lin(c, 0, 0, 0, 340, '#f5dbb4', '#fbe9cc', '#f3cfa0'); c.fillRect(0, 0, W, 340);
    // fenêtres hautes avec rideaux
    for (const x0 of [78, 158, 238]) {
      c.save(); archPath(c, x0, 62, 78, 240); c.clip();
      c.fillStyle = lin(c, 0, 62, 0, 302, '#9a9be0', '#f2b4cd', '#ffe0b8'); c.fillRect(x0, 62, 78, 240);
      for (let i = 0; i < 5; i++) star4(c, x0 + 14 + i * 14, 80 + (i % 2) * 22, 2, '#fff', 0.8);
      c.restore();
      c.strokeStyle = '#d9a43c'; c.lineWidth = 3.5; archPath(c, x0, 62, 78, 240); c.stroke();
      c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0 + 39, 101); c.lineTo(x0 + 39, 302); c.stroke();
    }
    curtain(c, -1, 74, 320, '#c44a74', '#e87a9c', 36); curtain(c, 1, 74, 320, '#c44a74', '#e87a9c', 36);
    box(c, 0, 28, W, 14, '#e9c26a', INK_S);
    for (let x = 0; x < W; x += 20) { ell(c, x + 10, 50, 7, 7, '#d9a43c'); }
    // miroirs / panneaux dorés
    for (const x of [8, 332]) { rr(c, x, 120, 53, 150, 24, lin(c, x, 120, x + 53, 270, '#f3e3f2', '#c7b0e0', '#f3e3f2'), '#d9a43c', 3.5); }
    // sol parquet brillant
    floor(c, 330, '#d9a36a', '#a86e43', 'rgba(255,240,210,0.25)');
    for (let k = 0; k < 9; k++) { c.fillStyle = k % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; c.fillRect(0, 330 + k * 19, W, 19); }
    c.save(); c.globalAlpha = 0.55; c.fillStyle = rad(c, W / 2, 430, 0, 190, 'rgba(255,240,200,1)', 'rgba(255,240,200,0)'); c.fillRect(0, 330, W, 170); c.restore();
    // cœur au sol
    heart(c, W / 2, 440, 46, 'rgba(255,255,255,0.1)');
    // lustres
    BAL_PTS.push(...chandelier(c, 196, 56, 1.4), ...chandelier(c, 75, 50, 1), ...chandelier(c, 318, 50, 1));
    // colonnes de côté
    for (const x of [0, W - 14]) rr(c, x, 0, 14, 340, 2, lin(c, x, 0, x + 14, 0, '#e8cfa0', '#fff3d8', '#d9b57a'), INK_S);
  },
  fx(c, t) {
    twinkle(c, BAL_PTS, t, 'rgba(255,240,180,1)', 18, 2.6);
    floaters(c, t, 26, 31, '#fff2c2', 2.4, 10, 0.85);
    for (let i = 0; i < 6; i++) heart(c, 40 + i * 62 + Math.sin(t + i) * 8, 470 - ((t * 14 + i * 40) % 160), 4, '#ff9bbd', 0.4);
  },
};

// ------------------------------------------------------------------ hôtel
const HOT_LAMPS: [number, number][] = [[46, 232], [347, 232]];
export const hotel: PlaceDef = {
  bg(c) {
    c.fillStyle = lin(c, 0, 0, 0, 360, '#f6dce4', '#f9eaee'); c.fillRect(0, 0, W, 360);
    // moulures
    for (let x = 0; x < 220; x += 70) box(c, x + 8, 50, 56, 190, 'rgba(255,255,255,0.35)', 'rgba(201,140,160,0.45)', 1.4);
    box(c, 0, 0, W, 16, '#fffaf5', INK_S);
    // balcon / porte-fenêtre à droite
    c.save(); archPath(c, 240, 46, 130, 280); c.clip();
    c.fillStyle = lin(c, 0, 46, 0, 326, '#6c7bd0', '#e9a0c4', '#ffd6aa'); c.fillRect(240, 46, 130, 280);
    glowAt(c, 305, 290, 100, 'rgba(255,230,170,0.9)', 0.6);
    eiffel(c, 305, 322, 0.62, 'rgba(110,80,140,0.8)');
    roofs(c, 290, 40, 'rgba(90,70,125,0.85)', 4, '#ffd98c');
    for (let i = 0; i < 14; i++) { const r = seeded(i + 40); star4(c, 250 + r() * 110, 56 + r() * 90, 1.4, '#fff', 0.8); }
    c.restore();
    c.strokeStyle = '#fffaf5'; c.lineWidth = 6; archPath(c, 240, 46, 130, 280); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(305, 46 + 65); c.lineTo(305, 326); c.moveTo(240, 180); c.lineTo(370, 180); c.stroke();
    // garde-corps du balcon
    rr(c, 232, 276, 146, 7, 3, '#fffaf5', INK_S);
    for (let x = 238; x < 376; x += 12) { c.strokeStyle = '#e9c2cf'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, 283); c.lineTo(x, 326); c.stroke(); }
    curtain(c, 1, 40, 290, '#fff2f6', '#f3cdd9', 20);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(0, 0, 0, 0);
    // tête de lit capitonnée
    rr(c, 20, 100, 214, 150, 36, lin(c, 0, 100, 0, 250, '#d98aa8', '#c26a8b'), 'rgba(88,67,63,0.45)', 2);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const x = 52 + i * 41, y = 134 + j * 38; ell(c, x, y, 6, 6, '#f6c9d8', INK_S, 0.8); c.strokeStyle = 'rgba(88,40,60,0.2)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20, y + 19); c.moveTo(x, y); c.lineTo(x - 20, y + 19); c.stroke(); }
    // sol
    floor(c, 340, '#e4c4a8', '#bf977a', 'rgba(120,80,60,0.12)');
    poly(c, [[60, 372], [333, 372], [388, H], [5, H]], 'rgba(255,248,252,0.55)', 'rgba(201,140,160,0.35)');
    // lit
    shadowEll(c, 128, 392, 130, 12, 0.22);
    rr(c, 14, 270, 228, 124, 22, lin(c, 0, 270, 0, 394, '#ffffff', '#f6e6ee'), INK, 1.6);
    rr(c, 14, 322, 228, 72, 14, lin(c, 0, 322, 0, 394, '#fff8fb', '#f1d4df'), INK_S, 1.2);
    rr(c, 14, 346, 228, 48, 12, lin(c, 0, 346, 0, 394, '#e87aa0', '#c9486f'), INK_S, 1.2);
    for (const [px, py] of [[50, 292], [110, 288], [170, 292], [215, 294]] as const) rr(c, px - 26, py - 16, 52, 36, 14, lin(c, 0, py - 16, 0, py + 20, '#ffffff', '#f4dde8'), INK_S, 1);
    heart(c, 112, 332, 14, '#ff6f9f'); heart(c, 154, 330, 9, '#ff9bbd');
    // pétales en cœur sur le lit
    const r = seeded(8);
    for (let i = 0; i < 20; i++) { const a = r() * 6.28, d = r() * 20; heart(c, 85 + Math.cos(a) * d * 1.3, 358 + Math.sin(a) * d * 0.45, 2.6, '#ff5f93', 0.9); }
    // tables de nuit + lampes
    for (const [x] of [[12], [362]] as const) {
      rr(c, x - 28, 262, 56, 80, 6, '#fff0e6', INK_S);
      box(c, x - 24, 300, 48, 1.5, 'rgba(88,67,63,0.3)', null);
    }
    for (const [x, y] of HOT_LAMPS) {
      if (x > 100) continue;
      c.beginPath(); c.moveTo(x - 14, y); c.lineTo(x - 22, y - 26); c.lineTo(x + 22, y - 26); c.lineTo(x + 14, y); c.closePath(); c.fillStyle = lin(c, x - 20, 0, x + 20, 0, '#ffe9c8', '#fff7e4', '#ffe0b0'); c.fill(); c.strokeStyle = INK_S; c.stroke();
      rr(c, x - 3, y, 6, 22, 2, '#e9c26a', INK_S, 0.8);
    }
    vase(c, 362, 268, 0.9, 'rgba(255,255,255,0.7)', ['#ff7fa6', '#ffb3c8', '#ff7fa6'], 2);
    // guirlande de lumières
    c.save(); garland(c, 0, 22, W, 22, 14, 14, '#fff0b8'); c.restore();
    c.fillStyle = rad(c, W / 2, 260, 150, 360, 'rgba(0,0,0,0)', 'rgba(120,40,80,0.14)'); c.fillRect(0, 0, W, H);
  },
  fx(c, t) {
    for (const [x, y] of HOT_LAMPS) glowAt(c, x, y - 10, 62 + Math.sin(t * 1.4 + x) * 3, 'rgba(255,214,150,0.9)', 0.28);
    floaters(c, t, 10, 17, 'rgba(255,255,255,0.95)', 1.8, 6, 0.7);
    star4(c, 305 + 40, 120, 3 + Math.sin(t * 3) * 1.4, '#fff', 0.8);
  },
};
void flower; void leaf; void plant; void rose; void H;
