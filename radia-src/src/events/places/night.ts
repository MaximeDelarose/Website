/** Décors de nuit / soirée : feu d'artifice, rooftop, cinéma, scène. */
import {
  type C, type PlaceDef, W, H, INK, INK_S, lin, rad, box, rr, poly, ell, glowAt, heart, star4, shadowEll, eiffel, roofs, skyline,
  flame, candle, garland, twinkle, curtain, floaters, seeded, vase,
} from './common';

// ------------------------------------------------------------------ feu d'artifice
const FW_PTS: [number, number][] = [];
const FW_COLS = ['#ff7fb0', '#ffd36b', '#9fd0ff', '#c9a6ff', '#ff9a7a', '#8ff0c0'];
function burst(c: C, cx: number, cy: number, R: number, p: number, col: string, n = 22): void {
  // p 0..1 : expansion puis retombée
  const e = 1 - Math.pow(1 - Math.min(1, p * 1.25), 3);
  const fade = Math.max(0, 1 - Math.max(0, p - 0.45) / 0.55);
  if (fade <= 0) return;
  c.save(); c.globalAlpha = fade;
  glowAt(c, cx, cy, R * 0.9 * e, col, 0.25 * fade);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = R * e, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d + 22 * p * p;
    c.strokeStyle = col; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + Math.cos(a) * d * 0.78, cy + Math.sin(a) * d * 0.78 + 14 * p * p); c.lineTo(x, y); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fill();
  }
  c.restore();
}
export const fireworks: PlaceDef = {
  bg(c) {
    FW_PTS.length = 0;
    c.fillStyle = lin(c, 0, 0, 0, 380, '#15103a', '#2e2160', '#7a4a8c', '#e8938f'); c.fillRect(0, 0, W, 380);
    const r = seeded(77);
    for (let i = 0; i < 70; i++) star4(c, r() * W, r() * 250, 0.8 + r() * 1.3, '#fff', 0.35 + r() * 0.5);
    // lune
    ell(c, 330, 70, 24, 24, '#fff6dc'); ell(c, 340, 64, 22, 22, '#2a2057');
    ell(c, 330, 70, 24, 24, 'rgba(255,246,220,0)', 'rgba(255,246,220,0.4)', 1);
    eiffel(c, 90, 362, 1.1, '#2b1d4f');
    skyline(c, 290, 80, '#241a48', '#ffd98c', 4);
    skyline(c, 318, 60, '#1b1338', '#ffcf7a', 9);
    // lumières de la ville
    for (let i = 0; i < 30; i++) glowAt(c, r() * W, 340 + r() * 30, 5, '#ffcf7a', 0.35);
    // terrasse : sol + balustrade
    box(c, 0, 372, W, 128, lin(c, 0, 372, 0, H, '#3a2a60', '#241a48'), null);
    box(c, 0, 372, W, 10, '#5b4690', 'rgba(255,255,255,0.15)');
    for (let x = 4; x < W; x += 22) { rr(c, x, 382, 9, 56, 4, lin(c, x, 0, x + 9, 0, '#6a54a4', '#4a3a80'), null); }
    box(c, 0, 438, W, 9, '#5b4690', 'rgba(255,255,255,0.15)');
    // dalles
    c.strokeStyle = 'rgba(255,255,255,0.06)'; for (let i = -6; i < 14; i++) { c.beginPath(); c.moveTo(W / 2 + (i - 3) * 20, 447); c.lineTo(W / 2 + (i - 3) * 90, H); c.stroke(); }
    // guirlandes
    FW_PTS.push(...garland(c, 0, 360, W / 2, 380, 10, 8, '#ffe9a8'), ...garland(c, W / 2, 380, W, 360, 10, 8, '#ffe9a8'));
    c.fillStyle = 'rgba(0,0,0,0)'; c.fillRect(0, 0, 0, 0);
  },
  fx(c, t) {
    const shows: [number, number, number, number][] = [[96, 120, 80, 0], [290, 150, 68, 1.3], [200, 90, 90, 2.6], [60, 200, 50, 3.4], [330, 230, 55, 4.3]];
    const cycle = 5.2;
    shows.forEach(([x, y, R, off], i) => {
      const p = (((t + off) % cycle) + cycle) % cycle / 2.4;
      if (p < 1) {
        if (p < 0.12) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y + (0.12 - p) * 900, 2, 0, 7); c.fill(); }
        else burst(c, x, y, R, (p - 0.12) / 0.88, FW_COLS[(i + Math.floor((t + off) / cycle)) % FW_COLS.length]);
      }
    });
    twinkle(c, FW_PTS, t, 'rgba(255,230,160,0.95)', 12, 2.4);
    for (let i = 0; i < 14; i++) star4(c, (i * 97 + 20) % W, (i * 53) % 200, 1.4 + Math.sin(t * 2 + i) * 0.8, '#fff', 0.5);
  },
};

// ------------------------------------------------------------------ rooftop
const RT_PTS: [number, number][] = [];
const RT_FL: [number, number][] = [];
export const rooftop: PlaceDef = {
  bg(c) {
    RT_PTS.length = 0; RT_FL.length = 0;
    c.fillStyle = lin(c, 0, 0, 0, 330, '#6a6fc6', '#d98bbd', '#ffb38a', '#ffd9a0'); c.fillRect(0, 0, W, 330);
    // soleil bas
    glowAt(c, 250, 290, 160, 'rgba(255,240,190,1)', 0.8);
    ell(c, 250, 288, 34, 34, lin(c, 0, 254, 0, 322, '#fffbe0', '#ffd27a'));
    // nuages
    for (const [x, y, s] of [[60, 90, 1], [300, 130, 0.8], [160, 180, 0.7]] as const) {
      c.fillStyle = 'rgba(255,220,230,0.55)';
      c.beginPath(); c.ellipse(x, y, 52 * s, 9 * s, 0, 0, 7); c.ellipse(x + 20 * s, y - 8 * s, 30 * s, 8 * s, 0, 0, 7); c.fill();
    }
    eiffel(c, 125, 326, 1.15, 'rgba(116,82,140,0.9)');
    roofs(c, 296, 54, 'rgba(120,92,150,0.75)', 3);
    roofs(c, 318, 52, 'rgba(98,76,130,0.95)', 12, '#ffe0a0');
    // toit de zinc au premier plan
    poly(c, [[0, 366], [W, 366], [W, H], [0, H]], lin(c, 0, 366, 0, H, '#8b86b8', '#6e6aa0'), null);
    // joints du zinc
    c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1.5;
    for (let i = -8; i < 20; i++) { c.beginPath(); c.moveTo(W / 2 + (i - 5) * 16, 366); c.lineTo(W / 2 + (i - 5) * 70, H); c.stroke(); }
    // garde-corps
    box(c, 0, 360, W, 8, '#5a4a80', INK_S);
    for (let x = 6; x < W; x += 24) box(c, x, 368, 4, 28, '#5a4a80', null);
    box(c, 0, 394, W, 5, '#5a4a80', null);
    // guirlandes
    RT_PTS.push(...garland(c, -4, 40, W / 2, 70, 18, 10), ...garland(c, W / 2, 70, W + 4, 38, 18, 10), ...garland(c, 0, 110, W, 100, 22, 14, '#ffd9ec'));
    // petite table à gauche
    shadowEll(c, 52, 452, 44, 7, 0.28);
    rr(c, 38, 392, 28, 58, 3, '#7c6aa6', null);
    ell(c, 52, 392, 40, 8, '#f6e9f2', INK_S, 1);
    RT_FL.push(candle(c, 40, 393, 0.9), candle(c, 64, 393, 0.9));
    vase(c, 52, 392, 0.7, 'rgba(255,255,255,0.7)', ['#ff7fa6', '#ffb3c8'], 1);
    for (const x of [8, 100]) { rr(c, x - 9, 420, 18, 8, 3, '#f7ccdc', INK_S); rr(c, x - 7, 428, 3, 24, 1, '#c9a6ff'); rr(c, x + 4, 428, 3, 24, 1, '#c9a6ff'); }
    // pot de plantes à droite
    ell(c, 358, 436, 18, 9, 'rgba(255,255,255,0.0)');
  },
  fx(c, t) {
    twinkle(c, RT_PTS, t, 'rgba(255,230,160,0.98)', 14, 2.1);
    RT_FL.forEach(([x, y], i) => flame(c, x, y, 0.9, t, i));
    // oiseaux
    for (let i = 0; i < 3; i++) {
      const x = ((t * 14 + i * 140) % (W + 60)) - 30, y = 70 + i * 24 + Math.sin(t * 2 + i) * 4, fl = Math.sin(t * 9 + i) * 3.5;
      c.strokeStyle = 'rgba(80,50,100,0.7)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 7, y - fl); c.quadraticCurveTo(x - 3, y - 3, x, y); c.quadraticCurveTo(x + 3, y - 3, x + 7, y - fl); c.stroke();
    }
    floaters(c, t, 8, 5, 'rgba(255,240,200,0.9)', 1.6, 5, 0.5);
  },
};

// ------------------------------------------------------------------ cinéma
export const cinema: PlaceDef = {
  bg(c) {
    c.fillStyle = lin(c, 0, 0, 0, H, '#241238', '#3d1d58', '#2a1440'); c.fillRect(0, 0, W, H);
    // écran
    rr(c, 36, 66, 321, 190, 6, '#0d0715', '#e9c26a', 3);
    // rideaux de scène
    curtain(c, -1, 58, 290, '#8a1f48', '#c2406a'); curtain(c, 1, 58, 290, '#8a1f48', '#c2406a');
    box(c, 0, 0, W, 34, lin(c, 0, 0, 0, 34, '#7a1a40', '#b83560'), null);
    for (let x = 0; x < W; x += 26) { c.beginPath(); c.arc(x + 13, 34, 13, 0, Math.PI); c.fillStyle = '#a02a55'; c.fill(); }
    // marches et sol
    box(c, 0, 330, W, 170, lin(c, 0, 330, 0, H, '#3a1c4e', '#22112f'), null);
    box(c, 0, 330, W, 6, '#e9c26a', null);
    // rangées de fauteuils (de dos)
    for (const [y, s, a] of [[372, 1, '#b5365f'], [430, 1.25, '#c6426d']] as const) {
      for (let i = 0; i < 8; i++) {
        const x = 24 + i * 48 * 1.0 + (s - 1) * 30;
        if (x > 80 && x < 313) continue; // zone centrale libre pour les personnages
        shadowEll(c, x + 18 * s, y + 40 * s, 24 * s, 5, 0.3);
        rr(c, x, y, 38 * s, 38 * s, 12 * s, lin(c, 0, y, 0, y + 38 * s, shadeUp(a), a), INK, 1.4);
        rr(c, x - 6 * s, y + 18 * s, 10 * s, 26 * s, 4, a, INK_S); rr(c, x + 34 * s, y + 18 * s, 10 * s, 26 * s, 4, a, INK_S);
      }
    }
    // faisceau du projecteur
    c.save(); c.globalAlpha = 0.09; poly(c, [[196, 4], [150, 270], [250, 270]], '#fff', null); c.restore();
    ell(c, 196, 12, 14, 8, '#cfc3e6', INK_S, 1);
    // pop-corn
    rr(c, 332, 438, 40, 46, 5, lin(c, 332, 0, 372, 0, '#ff8fa8', '#fff', '#ff8fa8'), INK_S, 1.2);
    for (let i = 0; i < 8; i++) ell(c, 336 + (i % 4) * 9, 436 - Math.floor(i / 4) * 6, 6, 5, '#fff5d6', INK_S, 0.8);
  },
  fx(c, t) {
    // contenu de l'écran : dégradé vivant + cœurs qui flottent
    c.save(); c.beginPath(); c.rect(39, 69, 315, 184); c.clip();
    const h = (t * 20) % 360;
    c.fillStyle = lin(c, 39, 69, 354, 253, `hsl(${(h + 300) % 360},70%,72%)`, `hsl(${(h + 20) % 360},75%,78%)`, `hsl(${(h + 220) % 360},70%,72%)`);
    c.fillRect(39, 69, 315, 184);
    glowAt(c, 196 + Math.sin(t * 0.7) * 70, 150, 100, 'rgba(255,255,255,0.8)', 0.5);
    for (let i = 0; i < 6; i++) heart(c, 70 + i * 55 + Math.sin(t * 1.2 + i) * 6, 250 - ((t * 24 + i * 40) % 190), 8 + (i % 3) * 3, '#fff', 0.7);
    c.fillStyle = '#fff'; c.font = '700 22px sans-serif'; c.textAlign = 'center'; c.globalAlpha = 0.85; c.fillText('♡ Notre film ♡', 196, 160);
    c.restore();
    // lueur de l'écran sur la salle
    c.save(); c.globalAlpha = 0.18 + Math.sin(t * 3) * 0.04; c.fillStyle = rad(c, 196, 260, 10, 280, 'rgba(255,210,240,1)', 'rgba(255,210,240,0)'); c.fillRect(0, 250, W, 250); c.restore();
    for (let i = 0; i < 18; i++) { const x = ((i * 53 + t * 5) % 300) + 46, y = 40 + ((i * 71) % 220); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, y, 1.6, 1.6); }
  },
};
function shadeUp(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.min(255, v + 40);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ------------------------------------------------------------------ scène
export const stage: PlaceDef = {
  bg(c) {
    c.fillStyle = lin(c, 0, 0, 0, H, '#1b1040', '#3a1a62', '#55226f'); c.fillRect(0, 0, W, H);
    // fond étoilé
    const r = seeded(31);
    for (let i = 0; i < 60; i++) star4(c, r() * W, 40 + r() * 260, 0.9 + r() * 1.6, '#fff', 0.3 + r() * 0.5);
    // grand cœur lumineux
    glowAt(c, W / 2, 180, 130, 'rgba(255,120,180,0.8)', 0.35);
    heart(c, W / 2, 168, 62, 'rgba(255,170,205,0.28)');
    // rideaux
    curtain(c, -1, 70, 360, '#7a1c46', '#b4396a'); curtain(c, 1, 70, 360, '#7a1c46', '#b4396a');
    box(c, 0, 0, W, 38, '#6a1640', null);
    for (let x = 0; x < W; x += 30) { c.beginPath(); c.arc(x + 15, 38, 15, 0, Math.PI); c.fillStyle = '#8c2352'; c.fill(); }
    // rampes de projecteurs
    box(c, 40, 46, W - 80, 7, '#2a2040', INK_S);
    for (const x of [90, 196, 300]) { rr(c, x - 12, 52, 24, 16, 4, '#4a3c6a', INK_S); }
    // plateau
    poly(c, [[0, 350], [W, 350], [W, H], [0, H]], lin(c, 0, 350, 0, H, '#c98a5e', '#8c5636'), null);
    c.strokeStyle = 'rgba(0,0,0,0.18)'; for (let i = -6; i < 14; i++) { c.beginPath(); c.moveTo(W / 2 + (i - 3.5) * 20, 350); c.lineTo(W / 2 + (i - 3.5) * 80, H); c.stroke(); }
    box(c, 0, 350, W, 8, '#e9c26a', INK_S);
    // podium doré
    shadowEll(c, 196, 480, 110, 10, 0.3);
    rr(c, 96, 440, 202, 40, 6, lin(c, 0, 440, 0, 480, '#f6d77a', '#c8962c'), INK_S, 1.4);
    // rampe de lumières au sol
    for (let x = 14; x < W; x += 36) { ell(c, x, 494, 6, 3.4, '#ffe9a8'); }
  },
  fx(c, t) {
    // faisceaux qui balayent
    const src: [number, number, string][] = [[90, 66, '255,150,200'], [196, 66, '255,230,150'], [300, 66, '170,190,255']];
    src.forEach(([x, y, col], i) => {
      const ang = Math.sin(t * 0.9 + i * 2) * 0.28 + (i - 1) * 0.12;
      c.save(); c.translate(x, y); c.rotate(ang);
      c.fillStyle = lin(c, 0, 0, 0, 420, `rgba(${col},0.55)`, `rgba(${col},0.0)`);
      c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.lineTo(62, 420); c.lineTo(-62, 420); c.closePath(); c.fill();
      c.restore();
      glowAt(c, x, y + 6, 18, `rgba(${col},1)`, 0.9);
    });
    // spot central au sol
    c.save(); c.globalAlpha = 0.5 + Math.sin(t * 2) * 0.08; ell(c, 196, 462, 120, 18, 'rgba(255,240,200,0.5)'); c.restore();
    floaters(c, t, 22, 13, '#ffe9a8', 2.2, 12, 0.8);
  },
};
void vase; void candle;
