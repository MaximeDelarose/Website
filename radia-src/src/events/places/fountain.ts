/** Décor « Devant une fontaine » : place pavée de nuit douce, fontaine de pierre, jets animés, lumières chaudes. */
import {
  type PlaceDef, W, H, INK_S, lin, rad, box, rr, poly, ell, glowAt, star4, shadowEll, skyline, garland, twinkle, seeded,
} from './common';

const CX = W / 2;
const POOL_Y = 392;
const LIGHTS: [number, number][] = [];
const LAMPS: [number, number][] = [[28, 236], [W - 28, 236]];
const STONE = ['#f3e9e2', '#d9ccc9', '#b3a3ac'];

export const fountain: PlaceDef = {
  bg(c) {
    LIGHTS.length = 0;
    // ciel de nuit douce, horizon rosé
    c.fillStyle = lin(c, 0, 0, 0, 330, '#1d1a46', '#443577', '#b87aa0', '#f0b49a'); c.fillRect(0, 0, W, 330);
    const r = seeded(21);
    for (let i = 0; i < 46; i++) star4(c, r() * W, r() * 170, 0.8 + r() * 1.5, '#fff6e0', 0.35 + r() * 0.55);
    glowAt(c, 320, 62, 60, 'rgba(255,240,205,0.9)', 0.5);
    ell(c, 320, 62, 17, 17, '#fff4d4'); ell(c, 314, 58, 17, 15, '#ece0c4', null);
    ell(c, 320, 62, 17, 17, 'rgba(255,255,255,0)', 'rgba(255,240,200,0.9)', 1);
    // bâtiments lointains aux fenêtres chaudes
    skyline(c, 150, 190, '#2a2352', '#ffd28a', 7);
    c.fillStyle = 'rgba(70,40,90,0.35)'; c.fillRect(0, 250, W, 90);
    // arbres sombres
    for (const [x, y, s] of [[40, 300, 1.1], [135, 312, 0.9], [262, 310, 0.95], [356, 298, 1.1]] as const) {
      ell(c, x, y - 26 * s, 42 * s, 34 * s, lin(c, 0, y - 60 * s, 0, y + 6, '#3c5a6a', '#27405a'), null);
      for (let i = 0; i < 9; i++) glowAt(c, x + (r() - 0.5) * 60 * s, y - 40 * s + r() * 30 * s, 4, 'rgba(255,225,150,0.9)', 0.8);
    }
    // balustrade de pierre
    box(c, 0, 318, W, 9, lin(c, 0, 318, 0, 327, STONE[0], STONE[1]), INK_S);
    for (let x = 6; x < W; x += 21) {
      c.beginPath(); c.moveTo(x, 327); c.quadraticCurveTo(x + 6, 336, x, 346); c.quadraticCurveTo(x - 6, 336, x, 327);
      c.fillStyle = lin(c, x - 6, 0, x + 6, 0, STONE[0], STONE[2]); c.fill(); c.strokeStyle = INK_S; c.lineWidth = 0.8; c.stroke();
    }
    box(c, 0, 346, W, 9, lin(c, 0, 346, 0, 355, STONE[1], STONE[2]), INK_S);
    // place pavée
    c.fillStyle = lin(c, 0, 355, 0, H, '#7c6a92', '#473a5d'); c.fillRect(0, 355, W, H - 355);
    c.strokeStyle = 'rgba(30,20,50,0.22)'; c.lineWidth = 1;
    for (let k = 0; k < 9; k++) {
      const y = 360 + (k * k) * 1.9 + k * 4;
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      const step = 16 + k * 7;
      for (let x = (k % 2) * step * 0.5; x < W; x += step) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + (x - CX) * 0.05, y + 10 + k * 3.4); c.stroke(); }
    }
    glowAt(c, CX, 450, 220, 'rgba(255,205,150,0.5)', 0.4);
    // bassin : margelle + eau
    shadowEll(c, CX, POOL_Y + 36, 200, 20, 0.35);
    ell(c, CX, POOL_Y + 14, 186, 46, lin(c, 0, POOL_Y - 30, 0, POOL_Y + 60, STONE[1], STONE[2]), INK_S, 1.4);
    ell(c, CX, POOL_Y + 4, 186, 46, lin(c, 0, POOL_Y - 40, 0, POOL_Y + 50, STONE[0], STONE[1]), INK_S, 1.4);
    ell(c, CX, POOL_Y + 4, 168, 37, lin(c, 0, POOL_Y - 33, 0, POOL_Y + 41, '#3d5f93', '#8ccbe6'), 'rgba(88,67,63,0.4)', 1.2);
    for (let i = 0; i < 12; i++) glowAt(c, CX - 150 + r() * 300, POOL_Y - 14 + r() * 36, 7 + r() * 6, i % 2 ? 'rgba(255,215,150,0.9)' : 'rgba(255,255,255,0.8)', 0.5);
    // piédestal + vasques
    box(c, CX - 14, 258, 28, 138, lin(c, CX - 14, 0, CX + 14, 0, STONE[1], STONE[0], STONE[2]), INK_S);
    const bowl = (y: number, rx: number, ry: number): void => {
      c.beginPath(); c.moveTo(CX - rx, y); c.quadraticCurveTo(CX - rx * 0.75, y + ry * 1.6, CX, y + ry * 1.7); c.quadraticCurveTo(CX + rx * 0.75, y + ry * 1.6, CX + rx, y); c.closePath();
      c.fillStyle = lin(c, CX - rx, 0, CX + rx, 0, STONE[2], STONE[0], STONE[1]); c.fill(); c.strokeStyle = INK_S; c.lineWidth = 1.2; c.stroke();
      ell(c, CX, y, rx, ry, lin(c, 0, y - ry, 0, y + ry, '#a9d6ea', '#5f8fbf'), INK_S, 1.2);
    };
    bowl(318, 92, 15);
    box(c, CX - 9, 230, 18, 52, lin(c, CX - 9, 0, CX + 9, 0, STONE[1], STONE[0], STONE[2]), INK_S);
    bowl(262, 56, 10);
    ell(c, CX, 232, 11, 5, STONE[0], INK_S, 1);
    c.beginPath(); c.moveTo(CX, 190); c.quadraticCurveTo(CX + 9, 216, CX, 232); c.quadraticCurveTo(CX - 9, 216, CX, 190);
    c.fillStyle = STONE[0]; c.fill(); c.strokeStyle = INK_S; c.stroke();
    // lampadaires
    for (const [x, y] of LAMPS) {
      box(c, x - 3, y + 14, 6, 120, lin(c, x - 3, 0, x + 3, 0, '#403556', '#6a5a82'), INK_S, 0.8);
      rr(c, x - 9, y + 128, 18, 10, 3, '#4a3e63', INK_S, 0.8);
      poly(c, [[x - 11, y + 14], [x + 11, y + 14], [x + 7, y - 14], [x - 7, y - 14]], lin(c, 0, y - 14, 0, y + 14, '#fff0bd', '#ffd98a'), 'rgba(88,67,63,0.5)', 1);
      poly(c, [[x - 10, y - 14], [x + 10, y - 14], [x, y - 24]], '#4a3e63', INK_S, 1);
      LIGHTS.push([x, y]);
    }
    // guirlande lumineuse
    LIGHTS.push(...garland(c, 0, 20, W, 20, 18, 14, '#ffe9a8'));
    // pétales sur l'eau
    for (let i = 0; i < 10; i++) { c.save(); c.translate(CX - 130 + r() * 260, POOL_Y - 8 + r() * 28); c.rotate(r() * 3); ell(c, 0, 0, 4, 2, 'rgba(255,170,200,0.85)'); c.restore(); }
    // vignettage doux
    c.fillStyle = rad(c, CX, 260, 140, 360, 'rgba(0,0,0,0)', 'rgba(25,10,45,0.4)'); c.fillRect(0, 0, W, H);
  },
  fx(c, t) {
    for (const [x, y] of LAMPS) glowAt(c, x, y, 78 + Math.sin(t * 1.4 + x) * 5, 'rgba(255,205,120,0.95)', 0.5);
    twinkle(c, LIGHTS.slice(2), t, 'rgba(255,230,160,0.95)', 12, 2);
    // jets : un jet central + deux nappes d'eau par vasque
    const drop = (x: number, y: number, a: number, s: number): void => { c.fillStyle = `rgba(225,245,255,${a})`; c.beginPath(); c.ellipse(x, y, s * 0.8, s * 1.15, 0, 0, 7); c.fill(); };
    c.save();
    const arc = (x0: number, y0: number, dx: number, peak: number, drop1: number, n: number, speed: number, seed: number): void => {
      for (let i = 0; i < n; i++) {
        const p = (t * speed + i / n + seed) % 1;
        const x = x0 + dx * p, y = y0 - peak * 4 * p * (1 - p) + drop1 * p * p;
        drop(x, y, 0.35 + 0.55 * Math.sin(p * Math.PI), 2.1);
      }
    };
    // jet central (monte puis retombe)
    for (let i = 0; i < 16; i++) {
      const p = (t * 0.8 + i / 16) % 1;
      const y = 190 - 78 * Math.sin(p * Math.PI * 0.5) * (1 - p * 0.15), x = CX + Math.sin(i * 2.3) * 5 * p;
      drop(x, y + 78 * p * p * p * 0.6, 0.85 * (1 - p * 0.5), 2.6 - p);
    }
    glowAt(c, CX, 130, 36, 'rgba(210,240,255,0.9)', 0.3);
    for (const k of [-1, 1]) {
      arc(CX + k * 10, 188, k * 60, 54, 70, 10, 0.55, k * 0.13);
      arc(CX + k * 40, 258, k * 50, 24, 56, 8, 0.5, k * 0.31);
      arc(CX + k * 70, 314, k * 42, 14, 62, 8, 0.45, k * 0.21);
    }
    c.restore();
    // rides et éclats sur l'eau
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.5 + i / 4) % 1;
      c.globalAlpha = 0.6 * (1 - p);
      c.beginPath(); c.ellipse(CX + (i - 1.5) * 50, POOL_Y + 12, 12 + p * 38, 3 + p * 8, 0, 0, 7); c.stroke();
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 6; i++) star4(c, 40 + (i * 131) % 320, 80 + ((i * 53) % 90), 2 + Math.abs(Math.sin(t * 2 + i)) * 2, '#fff6dc', 0.4 + 0.4 * Math.abs(Math.sin(t * 1.6 + i * 2)));
  },
};
