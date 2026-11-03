/** Décors de jour / cosy : marché aux fleurs, jardin, boutique, studio, maison, pyjama, spa. */
import {
  type C, type PlaceDef, W, H, INK, INK_S, lin, rad, box, rr, poly, ell, glowAt, heart, star4, shadowEll, archPath,
  flame, candle, garland, twinkle, curtain, floor, floaters, seeded, vase, plant, flower, leaf, rose,
} from './common';

// ------------------------------------------------------------------ marché aux fleurs
function bucket(c: C, x: number, y: number, s: number, cols: string[], seed: number): void {
  const r = seeded(seed);
  for (let i = 0; i < 9; i++) {
    const fx = x - 14 * s + r() * 28 * s, fy = y - 24 * s - r() * 16 * s;
    c.strokeStyle = '#5a9a66'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + (fx - x) * 0.3, y - 6 * s); c.lineTo(fx, fy); c.stroke();
    flower(c, fx, fy, (5 + r() * 2.5) * s, cols[i % cols.length], '#ffd36b', i % 2 ? 5 : 6);
  }
  c.beginPath(); c.moveTo(x - 17 * s, y - 14 * s); c.lineTo(x - 13 * s, y); c.lineTo(x + 13 * s, y); c.lineTo(x + 17 * s, y - 14 * s); c.closePath();
  c.fillStyle = lin(c, x - 17 * s, 0, x + 17 * s, 0, '#fff', '#d9e4ee', '#b9c8d8'); c.fill(); c.strokeStyle = INK_S; c.lineWidth = 1; c.stroke();
}
export const flowerMarket: PlaceDef = {
  bg(c) {
    c.fillStyle = lin(c, 0, 0, 0, 300, '#bfe3f7', '#f9efe2'); c.fillRect(0, 0, W, 300);
    // immeuble haussmannien
    box(c, 0, 20, W, 290, lin(c, 0, 0, 0, 300, '#f3e4cf', '#e7d2b4'), null);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
      const x = 22 + i * 92, y = 36 + row * 72;
      rr(c, x, y, 46, 54, 3, lin(c, 0, y, 0, y + 54, '#9ccbe8', '#d6ecf8'), '#fff', 3);
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 23, y); c.lineTo(x + 23, y + 54); c.moveTo(x, y + 26); c.lineTo(x + 46, y + 26); c.stroke();
      box(c, x - 4, y + 54, 54, 6, '#2f3a4a', null); if (row === 1) for (let k = 0; k < 4; k++) flower(c, x + 6 + k * 11, y + 52, 4, ['#ff7fa6', '#ffd36b', '#fff'][k % 3]);
    }
    box(c, 0, 12, W, 10, '#4a5a72', null);
    for (let x = 0; x < W; x += 14) box(c, x, 4, 8, 10, '#4a5a72', null);
    // pavés
    box(c, 0, 300, W, 200, lin(c, 0, 300, 0, H, '#d9cdbf', '#b8aa9a'), null);
    const r = seeded(4);
    for (let y = 304; y < H; y += 14) for (let x = (y / 14) % 2 ? 0 : 10; x < W; x += 20) rr(c, x, y, 18, 11, 3, `rgba(${150 + r() * 40|0},${140 + r() * 30|0},${125 + r() * 30|0},0.35)`, 'rgba(88,67,63,0.1)', 0.8);
    // étals
    for (const [x0, col1, col2, seed] of [[10, '#ff8fb1', '#fff', 1], [212, '#9fd8b2', '#fff', 2]] as const) {
      const w = 170;
      // toile rayée
      for (let i = 0; i < 8; i++) {
        c.beginPath(); c.moveTo(x0 + i * w / 8, 214); c.lineTo(x0 + (i + 1) * w / 8, 214); c.lineTo(x0 + (i + 1) * w / 8 + 3, 252); c.quadraticCurveTo(x0 + (i + 0.5) * w / 8, 262, x0 + i * w / 8 - 3, 252); c.closePath();
        c.fillStyle = i % 2 ? col2 : col1; c.fill(); c.strokeStyle = INK_S; c.lineWidth = 1; c.stroke();
      }
      rr(c, x0 + 6, 252, 4, 70, 2, '#8a6a52', null); rr(c, x0 + w - 10, 252, 4, 70, 2, '#8a6a52', null);
      // table et seaux
      rr(c, x0, 322, w, 12, 3, '#c79a6a', INK_S);
      rr(c, x0 + 6, 334, w - 12, 60, 3, '#e3bf94', INK_S);
      const cols = seed === 1 ? ['#ff7fa6', '#ffd36b', '#fff', '#c9a6ff'] : ['#fff', '#ffb3c8', '#ff9a7a', '#ffd36b'];
      for (let i = 0; i < 4; i++) bucket(c, x0 + 26 + i * 40, 322, 1, cols.slice(i % 2).concat(cols), seed * 10 + i);
    }
    // petits fanions
    for (let i = 0; i < 11; i++) { const x = 8 + i * 37, y = 200 + Math.sin(i * 0.9) * 0; poly(c, [[x, y], [x + 16, y], [x + 8, y + 16]], ['#ff8fb1', '#ffd36b', '#9fd0ff', '#c9a6ff'][i % 4], INK_S); }
    c.strokeStyle = 'rgba(88,67,63,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 200); c.lineTo(W, 200); c.stroke();
    // rayons de soleil
    c.save(); c.globalAlpha = 0.14; c.fillStyle = '#fff4c8'; c.beginPath(); c.moveTo(300, 0); c.lineTo(393, 0); c.lineTo(160, 380); c.lineTo(60, 380); c.closePath(); c.fill(); c.restore();
  },
  fx(c, t) {
    for (let i = 0; i < 12; i++) {
      const x = ((i * 67 + t * 12) % (W + 40)) - 20, y = 90 + ((i * 41 + t * 18) % 300);
      c.save(); c.translate(x, y); c.rotate(t * 1.2 + i); ell(c, 0, 0, 4, 2.4, ['#ffb3c8', '#fff', '#ffd9e6'][i % 3]); c.restore();
    }
    floaters(c, t, 8, 3, 'rgba(255,248,210,0.9)', 1.6, 4, 0.5);
  },
};

// ------------------------------------------------------------------ jardin en fête
const GD_PTS: [number, number][] = [];
export const garden: PlaceDef = {
  bg(c) {
    GD_PTS.length = 0;
    c.fillStyle = lin(c, 0, 0, 0, 280, '#a8dcf5', '#e9f6e6'); c.fillRect(0, 0, W, 280);
    // nuages
    for (const [x, y, s] of [[70, 60, 1], [290, 90, 0.8]] as const) { c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(x, y, 44 * s, 12 * s, 0, 0, 7); c.ellipse(x + 20 * s, y - 10 * s, 28 * s, 12 * s, 0, 0, 7); c.fill(); }
    // collines & arbres
    c.fillStyle = '#a5dba0'; c.beginPath(); c.ellipse(90, 300, 200, 70, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#8fcf94'; c.beginPath(); c.ellipse(310, 306, 190, 60, 0, Math.PI, 0); c.fill();
    for (const [x, y, s] of [[40, 270, 1], [352, 262, 1.1]] as const) {
      rr(c, x - 7 * s, y - 20, 14 * s, 80 * s, 4, '#a07c5e', INK_S);
      for (const [dx, dy, r] of [[0, -50, 44], [-28, -26, 30], [28, -28, 32]] as const) ell(c, x + dx * s, y + dy * s, r * s, r * s * 0.9, lin(c, 0, y + dy * s - r, 0, y + dy * s + r, '#8fd49a', '#5fb577'), INK_S, 1);
      for (let i = 0; i < 6; i++) heart(c, x - 36 * s + i * 14 * s, y - 60 * s + (i % 3) * 20, 4, '#ffb3c8', 0.9);
    }
    // haie
    box(c, 0, 300, W, 38, lin(c, 0, 300, 0, 338, '#5fb06c', '#468f59'), null);
    for (let x = 0; x < W; x += 18) ell(c, x + 9, 300, 11, 8, '#6dc07a');
    for (let i = 0; i < 18; i++) flower(c, 10 + i * 22, 318 + (i % 3) * 5, 5, ['#ff8fb1', '#fff', '#ffd36b'][i % 3]);
    // pelouse
    box(c, 0, 338, W, 162, lin(c, 0, 338, 0, H, '#9fdc8e', '#6fbf6c'), null);
    for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; c.beginPath(); c.moveTo(W / 2 + (i - 4) * 12, 338); c.lineTo(W / 2 + (i - 4) * 12 + 12, 338); c.lineTo(W / 2 + (i - 4) * 70 + 70, H); c.lineTo(W / 2 + (i - 4) * 70, H); c.fill(); }
    // table de fête
    shadowEll(c, W / 2, 440, 175, 14, 0.2);
    rr(c, 20, 396, 353, 12, 4, '#f4d8e0', INK_S);
    c.beginPath(); c.moveTo(20, 396); c.lineTo(373, 396); c.lineTo(386, 440); c.lineTo(7, 440); c.closePath(); c.fillStyle = lin(c, 0, 396, 0, 440, '#fff', '#fbd9e4'); c.fill(); c.strokeStyle = INK_S; c.stroke();
    for (let x = 12; x < 380; x += 22) { heart(c, x, 432, 4, '#ffb3c8'); }
    // gâteau + fleurs + bougies
    rr(c, 160, 360, 74, 36, 6, lin(c, 0, 360, 0, 396, '#fff', '#ffd1df'), INK_S, 1.2);
    rr(c, 172, 338, 50, 24, 6, lin(c, 0, 338, 0, 362, '#fff', '#ffc0d4'), INK_S, 1.2);
    for (let i = 0; i < 7; i++) ell(c, 168 + i * 10, 360, 5, 5, '#ff8fb1');
    heart(c, 197, 350, 8, '#ff5f93');
    vase(c, 70, 398, 1.0, 'rgba(255,255,255,0.7)', ['#ff7fa6', '#ffd36b', '#fff', '#c9a6ff'], 4);
    vase(c, 330, 398, 1.0, 'rgba(255,255,255,0.7)', ['#fff', '#ff7fa6', '#ffb3c8', '#ffd36b'], 6);
    // guirlandes de fanions + ampoules
    for (const [x0, y0, x1, y1] of [[0, 120, W / 2, 150], [W / 2, 150, W, 118]] as const) {
      c.strokeStyle = 'rgba(88,67,63,0.55)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 40, x1, y1); c.stroke();
      for (let i = 1; i < 9; i++) {
        const u = i / 9, x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * ((x0 + x1) / 2) + u * u * x1, y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * ((y0 + y1) / 2 + 40) + u * u * y1;
        poly(c, [[x - 9, y], [x + 9, y], [x, y + 20]], ['#ff8fb1', '#ffd36b', '#9fd0ff', '#c9a6ff', '#9fe0b5'][i % 5], INK_S);
      }
    }
    GD_PTS.push(...garland(c, 40, 60, 353, 56, 14, 9, '#fff0b8'));
    // ballons (les attaches)
  },
  fx(c, t) {
    twinkle(c, GD_PTS, t, 'rgba(255,230,150,0.95)', 12, 2);
    // ballons qui oscillent
    [[44, 330, '#ff8fb1'], [66, 345, '#ffd36b'], [340, 332, '#9fd0ff'], [362, 346, '#c9a6ff']].forEach(([x, y, col], i) => {
      const sw = Math.sin(t * 1.3 + i) * 5, bx = (x as number) + sw, by = (y as number) - 58 + Math.sin(t * 1.7 + i) * 3;
      c.strokeStyle = 'rgba(88,67,63,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x as number, y as number + 40); c.quadraticCurveTo(bx, by + 40, bx, by + 22); c.stroke();
      ell(c, bx, by, 16, 20, col as string, INK_S, 1); ell(c, bx - 5, by - 7, 4, 6, 'rgba(255,255,255,0.6)');
    });
    for (let i = 0; i < 3; i++) { // papillons
      const x = 90 + i * 100 + Math.sin(t * 0.8 + i * 2) * 40, y = 270 + Math.cos(t * 1.1 + i) * 20, f = Math.abs(Math.sin(t * 12 + i)) * 6;
      c.fillStyle = ['#ffb3c8', '#ffd36b', '#c9a6ff'][i]; c.beginPath(); c.ellipse(x - 3, y, 3.4, f + 1, -0.4, 0, 7); c.ellipse(x + 3, y, 3.4, f + 1, 0.4, 0, 7); c.fill();
    }
  },
};

// ------------------------------------------------------------------ boutique de mode
export const boutique: PlaceDef = {
  bg(c) {
    c.fillStyle = lin(c, 0, 0, 0, 340, '#fff3f3', '#fbe3ea'); c.fillRect(0, 0, W, 340);
    for (let x = 0; x < W; x += 56) box(c, x + 4, 40, 48, 270, 'rgba(255,255,255,0.4)', 'rgba(217,164,60,0.55)', 1.4);
    box(c, 0, 0, W, 16, '#e9c26a', INK_S);
    // enseigne
    rr(c, 126, 22, 141, 30, 15, '#fffaf0', '#e9c26a', 3);
    c.fillStyle = '#58433f'; c.font = 'italic 700 17px Georgia, serif'; c.textAlign = 'center'; c.fillText('Maison Rose', 196, 43);
    // miroir doré central
    rr(c, 146, 62, 101, 190, 50, lin(c, 146, 62, 247, 252, '#f6eefa', '#cdbbe6', '#fbf6ff'), '#d9a43c', 5);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 5; c.beginPath(); c.moveTo(168, 150); c.lineTo(190, 100); c.stroke();
    // portants
    for (const [x0, cols] of [[8, ['#ff9bbd', '#c9a6ff', '#fff', '#ffd36b']], [262, ['#9fd0ff', '#ff9bbd', '#9fe0b5', '#fff']]] as const) {
      c.strokeStyle = '#d9a43c'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, 184); c.lineTo(x0 + 123, 184); c.stroke();
      rr(c, x0 + 58, 184, 5, 150, 2, '#d9a43c', null); rr(c, x0 + 36, 334, 50, 6, 3, '#d9a43c', null);
      cols.forEach((col, i) => {
        const x = x0 + 16 + i * 29;
        c.strokeStyle = '#b8892e'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, 184); c.lineTo(x, 192); c.stroke();
        c.beginPath(); c.moveTo(x - 9, 192); c.lineTo(x + 9, 192); c.lineTo(x + 12, 234); c.quadraticCurveTo(x + 15, 258, x + 17, 282); c.lineTo(x - 17, 282); c.quadraticCurveTo(x - 15, 258, x - 12, 234); c.closePath();
        c.fillStyle = lin(c, x - 17, 0, x + 17, 0, col, '#ffffff66', col); c.fill(); c.strokeStyle = INK_S; c.lineWidth = 1; c.stroke();
        heart(c, x, 214, 3.5, 'rgba(255,255,255,0.8)');
      });
    }
    // étagères sacs / chaussures
    for (const x0 of [8, 262]) {
      rr(c, x0, 110, 123, 6, 2, '#d9a43c', null);
      for (let i = 0; i < 3; i++) { rr(c, x0 + 10 + i * 38, 84, 30, 26, 5, ['#ff9bbd', '#fff', '#c9a6ff'][(i + x0) % 3], INK_S); c.strokeStyle = '#58433f'; c.lineWidth = 1.2; c.beginPath(); c.arc(x0 + 25 + i * 38, 84, 8, Math.PI, 0); c.stroke(); }
    }
    // sol marbre
    floor(c, 340, '#f6ebe4', '#e6d4cc', 'rgba(160,110,110,0.14)');
    rr(c, 70, 395, 253, 80, 40, 'rgba(255,214,228,0.4)', 'rgba(217,164,60,0.4)', 2);
    // pouf
    rr(c, 314, 396, 66, 40, 16, lin(c, 0, 396, 0, 436, '#ff9bbd', '#e05c8a'), INK_S, 1.2); heart(c, 347, 412, 8, 'rgba(255,255,255,0.7)');
    plant(c, 22, 470, 0.9, '#f1c3d0');
  },
  fx(c, t) {
    const pts: [number, number][] = [[170, 100], [226, 200], [196, 160], [16, 220], [370, 220], [40, 96]];
    pts.forEach(([x, y], i) => star4(c, x, y, 3 + (Math.sin(t * 2.4 + i * 1.7) + 1) * 4, '#fff', 0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7)));
    floaters(c, t, 10, 22, '#ffe9a8', 1.8, 6, 0.7);
  },
};

// ------------------------------------------------------------------ studio photo
export const studio: PlaceDef = {
  bg(c) {
    c.fillStyle = lin(c, 0, 0, 0, H, '#d9d4e4', '#cfc8de'); c.fillRect(0, 0, W, H);
    // fond de papier continu (cyclo)
    c.beginPath(); c.moveTo(60, 0); c.lineTo(333, 0); c.lineTo(333, 340); c.quadraticCurveTo(333, 392, 380, 400); c.lineTo(13, 400); c.quadraticCurveTo(60, 392, 60, 340); c.closePath();
    c.fillStyle = lin(c, 0, 0, 0, 400, '#fbe6ee', '#f7d1e0', '#f2c3d7'); c.fill();
    c.fillStyle = rad(c, W / 2, 200, 20, 260, 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0)'); c.fillRect(60, 0, 273, 400);
    // sol
    box(c, 0, 400, W, 100, lin(c, 0, 400, 0, H, '#bcb4cc', '#9d94b4'), null);
    // support du fond
    box(c, 40, 0, 313, 10, '#4a4a5a', null);
    // softboxes
    for (const [x, s] of [[34, -1], [359, 1]] as const) {
      c.strokeStyle = '#4a4a5a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, 240); c.lineTo(x, 470); c.moveTo(x - 24, 480); c.lineTo(x, 466); c.lineTo(x + 24, 480); c.stroke();
      poly(c, [[x - 28 * s, 110], [x + 18 * s, 80], [x + 18 * s, 232], [x - 28 * s, 206]], lin(c, x, 0, x + 40, 0, '#fffaf0', '#f2e9d4'), 'rgba(88,67,63,0.5)', 2);
      poly(c, [[x - 20 * s, 122], [x + 10 * s, 102], [x + 10 * s, 210], [x - 20 * s, 192]], '#fffef6', null);
    }
    // trépied + appareil
    c.strokeStyle = '#3d3a4c'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(196, 454); c.lineTo(170, 498); c.moveTo(196, 454); c.lineTo(222, 498); c.moveTo(196, 454); c.lineTo(196, 498); c.stroke();
    rr(c, 168, 418, 56, 36, 7, lin(c, 0, 418, 0, 454, '#4a4a5a', '#2c2a38'), INK_S, 1.2);
    ell(c, 196, 436, 12, 12, '#1d1b28', '#b9a5e8', 2); ell(c, 192, 432, 3.5, 3.5, 'rgba(255,255,255,0.8)');
    // rouleaux de papier
    for (const [x, col] of [[10, '#9fd0ff'], [26, '#ffd36b'], [42, '#c9a6ff']] as const) rr(c, x, 422, 14, 60, 4, col, INK_S);
    // reflecteur
    ell(c, 346, 438, 28, 28, lin(c, 318, 410, 374, 466, '#fffaf0', '#e9dfc8'), INK_S, 1.4);
    // ampoules de cabine
    for (let i = 0; i < 9; i++) ell(c, 100 + i * 24, 20, 5, 5, '#fff3bf', INK_S, 0.8);
    heart(c, W / 2, 80, 16, 'rgba(255,255,255,0.6)');
  },
  fx(c, t) {
    for (let i = 0; i < 9; i++) glowAt(c, 100 + i * 24, 20, 16, 'rgba(255,240,170,1)', 0.35 + 0.3 * Math.sin(t * 2 + i));
    for (const x of [34, 359]) glowAt(c, x, 156, 90 + Math.sin(t * 1.5) * 6, 'rgba(255,248,220,1)', 0.22);
    floaters(c, t, 12, 15, 'rgba(255,255,255,0.95)', 1.8, 5, 0.6);
  },
};

// ------------------------------------------------------------------ maison (neutre doux)
export const home: PlaceDef = {
  bg(c) {
    c.fillStyle = lin(c, 0, 0, 0, 350, '#fdeedd', '#fbe3e0'); c.fillRect(0, 0, W, 350);
    box(c, 0, 296, W, 6, '#fffaf0', INK_S);
    box(c, 0, 302, W, 48, 'rgba(255,255,255,0.35)', null);
    // fenêtre
    rr(c, 118, 56, 157, 170, 6, lin(c, 0, 56, 0, 226, '#bfe3f7', '#f6f0e0'), '#fffaf0', 6);
    c.strokeStyle = '#fffaf0'; c.lineWidth = 4; c.beginPath(); c.moveTo(196, 56); c.lineTo(196, 226); c.moveTo(118, 140); c.lineTo(275, 140); c.stroke();
    rr(c, 108, 224, 177, 10, 3, '#fffaf0', INK_S);
    curtain(c, -1, 66, 250, '#f9c9d4', '#fbdce3', 30); curtain(c, 1, 66, 250, '#f9c9d4', '#fbdce3', 30);
    box(c, 0, 24, W, 6, '#d9a43c', INK_S);
    // étagère + cadres
    rr(c, 28, 150, 70, 6, 2, '#c79a6a', INK_S);
    for (const [x, col] of [[34, '#ffb3c8'], [60, '#c9a6ff']] as const) { rr(c, x, 116, 22, 34, 3, '#fff', '#d9a43c', 2); rr(c, x + 3, 119, 16, 28, 2, col, null); }
    plant(c, 82, 150, 0.45, '#f1c3d0');
    for (const [x, y] of [[300, 90], [330, 130], [310, 168]] as const) { rr(c, x - 14, y - 14, 28, 28, 3, '#fff', '#d9a43c', 2); heart(c, x, y, 9, '#ffb3c8'); }
    // sol
    floor(c, 350, '#e9c9a4', '#cfa77c', 'rgba(120,80,50,0.12)');
    rr(c, 54, 404, 285, 84, 40, 'rgba(255,214,228,0.5)', 'rgba(217,164,60,0.4)', 2);
    plant(c, 354, 362, 1.1);
    // pouf
    rr(c, 14, 392, 62, 44, 18, lin(c, 0, 392, 0, 436, '#c9b6f0', '#a58bd6'), INK_S, 1.2);
  },
  fx(c, t) {
    c.save(); c.globalAlpha = 0.14; c.fillStyle = '#fff6cf';
    c.beginPath(); c.moveTo(130, 70); c.lineTo(262, 70); c.lineTo(320, 480); c.lineTo(100, 480); c.closePath(); c.fill(); c.restore();
    for (let i = 0; i < 16; i++) { const x = 110 + ((i * 53 + Math.sin(t * 0.4 + i) * 20) % 190), y = ((i * 61 - t * 8) % 340 + 340) % 340 + 80; c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(x, y, 1.5, 0, 7); c.fill(); }
  },
};

// ------------------------------------------------------------------ salon pyjama
const PJ_PTS: [number, number][] = [];
export const pajama: PlaceDef = {
  bg(c) {
    PJ_PTS.length = 0;
    c.fillStyle = lin(c, 0, 0, 0, 400, '#d7c4f2', '#f0cde6'); c.fillRect(0, 0, W, 400);
    // étoiles décoratives sur le mur
    const r = seeded(6);
    for (let i = 0; i < 20; i++) star4(c, r() * W, r() * 220, 2 + r() * 2.5, '#fff', 0.4);
    // fenêtre avec lune
    rr(c, 128, 40, 137, 150, 66, lin(c, 0, 40, 0, 190, '#2e2a63', '#5a4d94'), '#fffaf0', 6);
    ell(c, 215, 92, 20, 20, '#fff5d0'); ell(c, 224, 86, 18, 18, '#3d3578');
    for (let i = 0; i < 9; i++) star4(c, 144 + r() * 104, 62 + r() * 100, 1.4, '#fff', 0.9);
    // guirlande douce
    PJ_PTS.push(...garland(c, 0, 22, W / 2, 46, 14, 9, '#ffe3f0'), ...garland(c, W / 2, 46, W, 22, 14, 9, '#ffe3f0'));
    // lampe
    c.beginPath(); c.moveTo(40, 236); c.lineTo(28, 206); c.lineTo(76, 206); c.lineTo(64, 236); c.closePath(); c.fillStyle = '#fff1cc'; c.fill(); c.strokeStyle = INK_S; c.stroke();
    rr(c, 49, 236, 6, 40, 2, '#e9c26a', INK_S);
    // canapé
    shadowEll(c, 196, 395, 190, 12, 0.2);
    rr(c, 14, 252, 365, 140, 34, lin(c, 0, 252, 0, 392, '#e49ac0', '#c97aa6'), INK, 1.6);
    rr(c, 36, 296, 155, 78, 22, lin(c, 0, 296, 0, 374, '#f3b3d0', '#e08fb8'), INK_S, 1.2);
    rr(c, 202, 296, 155, 78, 22, lin(c, 0, 296, 0, 374, '#f3b3d0', '#e08fb8'), INK_S, 1.2);
    // coussins
    for (const [x, y, col, rot] of [[56, 300, '#c9a6ff', -0.2], [330, 300, '#ffd36b', 0.2], [100, 310, '#fff', 0.1]] as const) {
      c.save(); c.translate(x, y); c.rotate(rot); rr(c, -27, -27, 54, 54, 12, col, INK_S, 1.2); heart(c, 0, 2, 8, 'rgba(255,255,255,0.8)'); c.restore();
    }
    // plaid sur le canapé
    c.beginPath(); c.moveTo(222, 304); c.quadraticCurveTo(270, 284, 338, 320); c.lineTo(344, 372); c.quadraticCurveTo(290, 382, 228, 372); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = INK_S; c.stroke();
    c.strokeStyle = 'rgba(255,143,177,0.7)'; c.lineWidth = 2; for (let x = 240; x < 350; x += 18) { c.beginPath(); c.moveTo(x, 312); c.lineTo(x + 4, 372); c.stroke(); }
    // sol et tapis
    floor(c, 394, '#e8cfb2', '#c9a583', 'rgba(120,80,50,0.12)');
    ell(c, 196, 452, 190, 40, 'rgba(255,255,255,0.7)', 'rgba(255,143,177,0.4)', 2);
    ell(c, 196, 452, 150, 28, 'rgba(255,214,228,0.6)');
    // mugs & bougie sur pouf droite
    rr(c, 332, 424, 56, 36, 6, '#a58bd6', INK_S);
    rr(c, 342, 408, 14, 16, 3, '#fff', INK_S); rr(c, 362, 408, 14, 16, 3, '#ffd1df', INK_S);
    PJ_PTS.push(candle(c, 378, 424, 0.8));
    plant(c, 24, 380, 0.9, '#f1c3d0');
  },
  fx(c, t) {
    twinkle(c, PJ_PTS.slice(0, -1), t, 'rgba(255,225,240,0.95)', 13, 1.8);
    const [fx, fy] = PJ_PTS[PJ_PTS.length - 1];
    flame(c, fx, fy, 0.8, t, 1);
    for (let i = 0; i < 2; i++) { const y = 400 - ((t * 10 + i * 12) % 26); c.strokeStyle = `rgba(255,255,255,${0.5 - (400 - y) / 60})`; c.lineWidth = 1.6; c.beginPath(); c.moveTo(349 + i * 20, y); c.quadraticCurveTo(352 + i * 20, y - 6, 349 + i * 20, y - 12); c.stroke(); }
    star4(c, 215, 92, 3 + Math.sin(t * 2) * 1.2, '#fff', 0.9);
  },
};

// ------------------------------------------------------------------ spa
export const spa: PlaceDef = {
  bg(c) {
    c.fillStyle = lin(c, 0, 0, 0, 340, '#d9f0ec', '#f2f0e6'); c.fillRect(0, 0, W, 340);
    // carrelage mural
    c.strokeStyle = 'rgba(88,67,63,0.1)'; c.lineWidth = 1;
    for (let x = 0; x < W; x += 28) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 330); c.stroke(); }
    for (let y = 0; y < 330; y += 28) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // fenêtre bambou / jour doux
    rr(c, 128, 40, 137, 160, 10, lin(c, 0, 40, 0, 200, '#e6f7fb', '#fdf5e6'), '#c79a6a', 5);
    for (let i = 0; i < 5; i++) { c.strokeStyle = '#8fc79a'; c.lineWidth = 4; c.beginPath(); c.moveTo(150 + i * 25, 200); c.lineTo(150 + i * 25, 60); c.stroke(); leaf(c, 150 + i * 25, 100, 18, -0.5, '#7fc48a'); leaf(c, 150 + i * 25, 140, 18, -2.6, '#6fb77f'); }
    // étagère + serviettes + bougies
    rr(c, 8, 150, 100, 7, 2, '#c79a6a', INK_S);
    for (let i = 0; i < 3; i++) rr(c, 14 + i * 30, 124, 26, 26, 6, ['#fff', '#fbd0dc', '#d9ccf3'][i], INK_S);
    rr(c, 290, 150, 100, 7, 2, '#c79a6a', INK_S);
    for (let i = 0; i < 3; i++) { rr(c, 300 + i * 30, 126, 18, 24, 6, ['#fbd0dc', '#bfe3f7', '#fff'][i], INK_S); rr(c, 304 + i * 30, 120, 10, 6, 2, '#e9c26a', INK_S); }
    // sol pierre
    floor(c, 330, '#e8e0d2', '#cdc2b0', 'rgba(88,67,63,0.1)');
    // jacuzzi
    shadowEll(c, 196, 470, 190, 14, 0.2);
    rr(c, 4, 338, 385, 130, 50, lin(c, 0, 338, 0, 468, '#fffaf2', '#e6dccb'), INK, 1.6);
    rr(c, 22, 352, 349, 98, 40, lin(c, 0, 352, 0, 450, '#8fdcdf', '#58b9d1'), INK_S, 1.2);
    // bords : bougies, orchidées
    const cs = [candle(c, 40, 346, 1), candle(c, 80, 344, 0.9), candle(c, 320, 344, 0.9), candle(c, 358, 346, 1)];
    SPA_FL.length = 0; SPA_FL.push(...cs);
    plant(c, 26, 336, 1.1); plant(c, 368, 336, 1.1, '#f1c3d0');
    // galets
    for (const [x, y, s] of [[170, 340, 1], [196, 342, 1.2], [222, 340, 1]] as const) ell(c, x, y, 9 * s, 6 * s, '#d8d2c6', INK_S, 0.9);
    flower(c, 196, 330, 7, '#fff', '#ffd36b', 6);
  },
  fx(c, t) {
    // eau qui brille
    c.save(); c.beginPath(); c.roundRect(22, 352, 349, 98, 40); c.clip();
    for (let i = 0; i < 6; i++) {
      const y = 372 + i * 14;
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath();
      for (let x = 22; x <= 371; x += 8) { const yy = y + Math.sin(x * 0.05 + t * 1.6 + i) * 3; x === 22 ? c.moveTo(x, yy) : c.lineTo(x, yy); }
      c.stroke();
    }
    for (let i = 0; i < 16; i++) { const x = 40 + ((i * 47) % 310), y = 440 - ((t * 20 + i * 23) % 80); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 2.5 + (i % 3), 0, 7); c.stroke(); }
    c.restore();
    SPA_FL.forEach(([x, y], i) => flame(c, x, y, 1, t, i));
    // vapeur
    for (let i = 0; i < 5; i++) {
      const p = ((t * 0.12 + i * 0.2) % 1), x = 60 + i * 70 + Math.sin(t + i) * 10;
      glowAt(c, x, 330 - p * 160, 34 + p * 20, 'rgba(255,255,255,1)', 0.22 * (1 - p));
    }
  },
};
const SPA_FL: [number, number][] = [];
void archPath; void rad; void vase; void rose; void INK; void H;
