/**
 * Décor de la table romantique (Canvas 2D) : fond du lieu, nappe, bougies, fleurs, vaisselle,
 * serveur fictif simple. Les assiettes, flammes et personnages sont des éléments DOM par-dessus
 * (pour les animer) ; cette partie ne dessine que le décor statique.
 */
import { PAL, OUTLINE, shade, ellipse, roundRect, heartPath, paint, makeCanvas, glow, sparkle, seeded } from '../../game/art/kit';
import type { MenuStyle } from './logic';

type G = CanvasRenderingContext2D;
export const SCENE_W = 360;
export const SCENE_H = 340;
/** Table : bord arrière du plateau et position des assiettes. */
export const TABLE_TOP = 188;
export const PLATE_SIZE = 92;
export const PLATE_L = { x: 98, y: 242 };
export const PLATE_R = { x: 262, y: 242 };
export const CANDLE_X = 180;
export const CANDLE_FLAME_Y = 186;
/** Position (bas, centre) des bustes. */
export const BUST_L = { x: 94, bottom: 206, w: 140, h: 190 };
export const BUST_R = { x: 266, bottom: 206, w: 140, h: 190 };

interface Theme {
  wallTop: string; wallBot: string; cloth: string; clothDark: string; trim: string; glass: string; bokeh: string[]; candle: string;
}
export const THEMES: Record<MenuStyle, Theme> = {
  restaurant: { wallTop: '#7A4B73', wallBot: '#3F2D55', cloth: '#FFF4E8', clothDark: '#F2D9D2', trim: '#F5A0BB', glass: '#E8558F', bokeh: ['#FFD58A', '#FF9EC1', '#FFE9B0'], candle: '#FFF4E8' },
  palace: { wallTop: '#4C3558', wallBot: '#241A33', cloth: '#FFF8E8', clothDark: '#EBD9A8', trim: '#D9A43C', glass: '#D9A43C', bokeh: ['#FFD97A', '#F3C86B', '#FFF0B8'], candle: '#FFF8E0' },
  rooftop: { wallTop: '#FF9A8A', wallBot: '#5B4A8E', cloth: '#F4EEFF', clothDark: '#D8CCF0', trim: '#FF9ABF', glass: '#F59A5B', bokeh: ['#FFE08A', '#FFC0A3', '#FFFFFF'], candle: '#FFF4F0' },
  hotel: { wallTop: '#9C7B68', wallBot: '#5C4458', cloth: '#FFFFFF', clothDark: '#E8DDD2', trim: '#C9A58A', glass: '#B9A5E8', bokeh: ['#FFE2A8', '#FFD0A0', '#FFF4DC'], candle: '#FFF9EE' },
};

function lamp(g: G, x: number, y: number, color: string): void { glow(g, x, y, 34, color, 0.55); g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI * 2); g.fillStyle = '#FFF8D8'; g.fill(); }

/** Fond de salle (derrière les personnages). */
export function drawBackdrop(g: G, style: MenuStyle): void {
  const T = THEMES[style];
  const r = seeded(style.length * 977 + 13);
  const gr = g.createLinearGradient(0, 0, 0, SCENE_H);
  gr.addColorStop(0, T.wallTop); gr.addColorStop(1, T.wallBot);
  g.fillStyle = gr; g.fillRect(0, 0, SCENE_W, SCENE_H);

  if (style === 'rooftop') {
    const sun = g.createRadialGradient(180, 130, 6, 180, 130, 130);
    sun.addColorStop(0, 'rgba(255,240,170,0.95)'); sun.addColorStop(0.3, 'rgba(255,190,130,0.55)'); sun.addColorStop(1, 'rgba(255,150,150,0)');
    g.fillStyle = sun; g.fillRect(0, 0, SCENE_W, SCENE_H);
    g.fillStyle = 'rgba(70,52,110,0.9)';
    let x = -4;
    while (x < SCENE_W) { const w = 18 + r() * 26; const hh = 40 + r() * 70; g.fillRect(x, 160 - hh, w, hh + 40); x += w + 1.5; }
    g.fillStyle = 'rgba(255,225,150,0.8)';
    for (let i = 0; i < 40; i++) g.fillRect(6 + r() * 348, 100 + r() * 70, 2, 2.4);
    // guirlande de lumières
    g.beginPath(); g.moveTo(0, 22); g.quadraticCurveTo(90, 56, 180, 24); g.quadraticCurveTo(270, 56, 360, 22); g.strokeStyle = 'rgba(88,67,63,0.7)'; g.lineWidth = 1.2; g.stroke();
    for (let i = 0; i <= 12; i++) { const t = i / 12; const x2 = t * 360; const y2 = 24 + Math.sin(t * Math.PI * 4) * -9 + 18; lamp(g, x2, y2, '#FFE08A'); }
    return;
  }
  if (style === 'palace') {
    // colonnes dorées + lustre
    for (const x of [20, 340]) { g.fillStyle = T.trim; g.fillRect(x - 12, 0, 24, SCENE_H); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x - 8, 0, 4, SCENE_H); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 6, 0, 5, SCENE_H); }
    g.strokeStyle = 'rgba(243,200,107,0.55)'; g.lineWidth = 2;
    for (const x of [90, 180, 270]) { g.beginPath(); g.arc(x, 0, 36, 0.1, Math.PI - 0.1); g.stroke(); }
    g.beginPath(); g.moveTo(180, 0); g.lineTo(180, 20); g.strokeStyle = '#D9A43C'; g.lineWidth = 2; g.stroke();
    glow(g, 180, 38, 60, '#FFE9A0', 0.55);
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(180, 24); g.lineTo(180 + i * 12, 44 + Math.abs(i) * 2); g.strokeStyle = '#D9A43C'; g.lineWidth = 1.6; g.stroke(); lamp(g, 180 + i * 12, 46 + Math.abs(i) * 2, '#FFE9A0'); }
  } else if (style === 'hotel') {
    // rideaux + lampe
    for (const [x, w] of [[0, 70], [290, 70]] as Array<[number, number]>) {
      const cg = g.createLinearGradient(x, 0, x + w, 0); cg.addColorStop(0, '#C9A58A'); cg.addColorStop(0.5, '#E8D2BE'); cg.addColorStop(1, '#B38E78');
      g.fillStyle = cg; g.fillRect(x, 0, w, 200);
      g.strokeStyle = 'rgba(88,67,63,0.2)'; g.lineWidth = 1.4;
      for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x + (w / 5) * i, 0); g.lineTo(x + (w / 5) * i, 200); g.stroke(); }
    }
    g.fillStyle = 'rgba(255,230,190,0.25)'; g.fillRect(76, 28, 208, 140);
    g.strokeStyle = 'rgba(255,240,210,0.6)'; g.lineWidth = 3; g.strokeRect(76, 28, 208, 140);
    glow(g, 180, 98, 110, '#FFD9A0', 0.35);
    g.beginPath(); g.moveTo(20, 56); g.lineTo(52, 56); g.lineTo(46, 28); g.lineTo(26, 28); g.closePath(); g.fillStyle = '#FFE9C0'; g.fill();
  } else {
    // restaurant : fenêtre de soirée, guirlande de petites lumières, cadre
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, 0, SCENE_W, 8);
    g.beginPath(); g.moveTo(0, 18); g.quadraticCurveTo(90, 52, 180, 20); g.quadraticCurveTo(270, 50, 360, 18); g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.2; g.stroke();
    for (let i = 0; i <= 10; i++) { const t = i / 10; lamp(g, t * 360, 24 + Math.sin(t * Math.PI * 4) * -8 + 16, '#FFD58A'); }
  }
  // bokeh doux
  for (let i = 0; i < 16; i++) {
    const c = T.bokeh[i % T.bokeh.length]; const x = r() * SCENE_W; const y = 40 + r() * 150; const rr = 8 + r() * 14;
    glow(g, x, y, rr, c, 0.14 + r() * 0.12);
  }
}

function cutlery(g: G, x: number, y: number, kind: 'fork' | 'knife'): void {
  g.save(); g.translate(x, y);
  g.lineWidth = 1.4; g.strokeStyle = OUTLINE; g.fillStyle = '#E9E4F0';
  if (kind === 'fork') {
    roundRect(g, -1.8, -4, 3.6, 30, 1.8); g.fill(); g.stroke();
    for (const dx of [-3.4, 0, 3.4]) { g.beginPath(); g.moveTo(dx, -4); g.lineTo(dx, -17); g.lineWidth = 1.6; g.stroke(); }
    roundRect(g, -4.6, -6, 9.2, 4, 1.6); g.fill(); g.lineWidth = 1.4; g.stroke();
  } else {
    roundRect(g, -1.8, -2, 3.6, 28, 1.8); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-2.6, -20); g.quadraticCurveTo(5, -14, 2.8, -1); g.lineTo(-2.6, -1); g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

function wineGlass(g: G, x: number, y: number, liquid: string): void {
  g.save(); g.translate(x, y);
  g.beginPath(); g.moveTo(-9, -26); g.quadraticCurveTo(-10, -4, 0, -2); g.quadraticCurveTo(10, -4, 9, -26); g.closePath();
  g.fillStyle = 'rgba(235,245,255,0.55)'; g.fill();
  g.save(); g.clip(); g.fillStyle = liquid; g.globalAlpha = 0.85; g.fillRect(-12, -15, 24, 16); g.restore();
  g.beginPath(); g.moveTo(-9, -26); g.quadraticCurveTo(-10, -4, 0, -2); g.quadraticCurveTo(10, -4, 9, -26); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.moveTo(0, -2); g.lineTo(0, 12); g.moveTo(-7, 13); g.lineTo(7, 13); g.stroke();
  g.beginPath(); g.moveTo(-5, -22); g.quadraticCurveTo(-6, -12, -3, -8); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.8; g.stroke();
  g.restore();
}

function candle(g: G, x: number, y: number, T: Theme): void {
  // bougeoir doré
  g.save(); g.translate(x, y);
  g.beginPath(); g.ellipse(0, 4, 13, 4, 0, 0, Math.PI * 2); g.fillStyle = PAL.or; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.4; g.stroke();
  roundRect(g, -2.4, -12, 4.8, 15, 2); g.fillStyle = PAL.or; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, -12, 7, 2.6, 0, 0, Math.PI * 2); g.fillStyle = PAL.or; g.fill(); g.stroke();
  roundRect(g, -4.4, -34, 8.8, 24, 3); g.fillStyle = T.candle; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.moveTo(-3.4, -34); g.quadraticCurveTo(-2, -28, -3.4, -26); g.strokeStyle = 'rgba(88,67,63,0.25)'; g.lineWidth = 1; g.stroke();
  g.beginPath(); g.moveTo(0, -34); g.lineTo(0, -37); g.strokeStyle = OUTLINE; g.lineWidth = 1.2; g.stroke();
  g.restore();
}

function flower(g: G, x: number, y: number, r: number, color: string, center = '#FFE08A'): void {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, r * 0.4, a, 0, Math.PI * 2);
    g.fillStyle = shade(color, i % 2 ? 0.1 : -0.04); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.2; g.stroke();
  }
  g.beginPath(); g.arc(x, y, r * 0.38, 0, Math.PI * 2); g.fillStyle = center; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.1; g.stroke();
}

function vase(g: G, x: number, y: number): void {
  // tiges + feuilles
  g.save(); g.translate(x, y);
  g.strokeStyle = '#4E9A62'; g.lineWidth = 2;
  for (const [dx, dy] of [[-14, -40], [-4, -48], [8, -44], [16, -34], [0, -34]] as Array<[number, number]>) { g.beginPath(); g.moveTo(0, -6); g.quadraticCurveTo(dx * 0.4, dy * 0.5, dx, dy); g.stroke(); }
  for (const [dx, dy, a] of [[-10, -22, -2.4], [12, -20, -0.7], [-3, -30, -1.6]] as Array<[number, number, number]>) {
    g.save(); g.translate(dx, dy); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(8, -5, 15, 0); g.quadraticCurveTo(8, 5, 0, 0); g.fillStyle = '#7FC48A'; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.1; g.stroke(); g.restore();
  }
  flower(g, -14, -42, 7.4, '#FF8DB4'); flower(g, -4, -50, 7, '#FFC0D8'); flower(g, 8, -45, 7.6, '#FF75A8'); flower(g, 16, -34, 6.6, '#FFE9F0', '#F3C86B'); flower(g, 0, -34, 6.8, '#F5A0BB');
  // vase
  g.beginPath(); g.moveTo(-8, -8); g.quadraticCurveTo(-14, 4, -9, 14); g.lineTo(9, 14); g.quadraticCurveTo(14, 4, 8, -8); g.closePath();
  g.fillStyle = 'rgba(230,240,255,0.85)'; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.moveTo(-6, -4); g.quadraticCurveTo(-9, 4, -6, 10); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2; g.stroke();
  g.restore();
}

/** Table (devant les personnages) : plateau, nappe, vaisselle, bougies, fleurs. Transparent au-dessus. */
export function drawTable(g: G, style: MenuStyle): void {
  const T = THEMES[style];
  // pendant de nappe
  g.beginPath(); g.moveTo(0, 282);
  const n = 12; const sw = SCENE_W / n;
  for (let i = 0; i < n; i++) g.quadraticCurveTo(i * sw + sw / 2, 296, (i + 1) * sw, 282);
  g.lineTo(SCENE_W, SCENE_H); g.lineTo(0, SCENE_H); g.closePath();
  const dg = g.createLinearGradient(0, 270, 0, SCENE_H); dg.addColorStop(0, T.clothDark); dg.addColorStop(1, shade(T.clothDark, -0.28));
  g.fillStyle = dg; g.fill();
  g.strokeStyle = 'rgba(88,67,63,0.28)'; g.lineWidth = 1.2;
  for (let i = 1; i < n; i++) { g.beginPath(); g.moveTo(i * sw, 288); g.lineTo(i * sw + 4, SCENE_H); g.stroke(); }
  // dessus de table
  g.beginPath(); g.moveTo(10, TABLE_TOP + 6); g.quadraticCurveTo(180, TABLE_TOP - 14, 350, TABLE_TOP + 6); g.lineTo(SCENE_W + 6, 284); g.lineTo(-6, 284); g.closePath();
  const tg = g.createLinearGradient(0, TABLE_TOP, 0, 284); tg.addColorStop(0, shade(T.cloth, -0.06)); tg.addColorStop(0.3, T.cloth); tg.addColorStop(1, shade(T.cloth, -0.04));
  g.fillStyle = tg; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2; g.stroke();
  // liseré
  g.beginPath(); g.moveTo(-6, 276); g.lineTo(SCENE_W + 6, 276); g.strokeStyle = T.trim; g.lineWidth = 3; g.stroke();
  for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(6 + i * 12.3, 270, 1.6, 0, Math.PI * 2); g.fillStyle = T.trim; g.fill(); }
  // chemin de table
  g.beginPath(); g.moveTo(140, TABLE_TOP + 3); g.lineTo(220, TABLE_TOP + 3); g.lineTo(240, 282); g.lineTo(120, 282); g.closePath();
  g.fillStyle = T.trim; g.globalAlpha = 0.28; g.fill(); g.globalAlpha = 1;
  // sets de table
  for (const p of [PLATE_L, PLATE_R]) {
    roundRect(g, p.x - 74, p.y - 36, 148, 70, 12); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
    g.strokeStyle = T.trim; g.lineWidth = 1.6; g.setLineDash([4, 3]); g.stroke(); g.setLineDash([]);
  }
  cutlery(g, 12, 238, 'fork'); cutlery(g, 349, 238, 'knife');
  // verres
  wineGlass(g, 134, 216, '#C8455E'); wineGlass(g, 226, 216, '#C8455E');
  // fleurs & bougies
  vase(g, 160, 228);
  candle(g, CANDLE_X + 24, 228, T);
  // petits pétales / cœur sur la nappe
  heartPath(g, 180, 262, 6); g.fillStyle = 'rgba(255,117,168,0.55)'; g.fill();
  sparkle(g, 140, 196, 4, '#FFFFFF', 0.7);
}

/** Position de la flamme (bougie centrale). */
export const FLAME = { x: CANDLE_X + 24, y: 228 - 38 };

/** Recadre le haut du corps d'un avatar plein pied : retourne un NOUVEAU canvas (la source n'est pas modifiée). */
export function bustCanvas(src: HTMLCanvasElement, outW: number, outH: number, top = 0, frac = 0.5, scale = 2): HTMLCanvasElement {
  const c = makeCanvas(outW * scale, outH * scale);
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  const sh = src.height * frac;
  const sw = Math.min(src.width, sh * (outW / outH));
  g.drawImage(src, (src.width - sw) / 2, src.height * top, sw, sh, 0, 0, c.width, c.height);
  return c;
}

/** Serveur fictif très simple (plateau + cloche), vu de face. */
export function waiterCanvas(px = 90): HTMLCanvasElement {
  const W = 70; const H = 120;
  return paint(W, H, (px / 70) * 2, (g) => {
    // corps
    roundRect(g, 14, 52, 42, 66, 12); const bg = g.createLinearGradient(14, 52, 56, 118); bg.addColorStop(0, '#5B4A8E'); bg.addColorStop(1, '#3B3152'); g.fillStyle = bg; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2.2; g.stroke();
    g.beginPath(); g.moveTo(26, 52); g.lineTo(35, 78); g.lineTo(44, 52); g.closePath(); g.fillStyle = '#FFFFFF'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(35, 80); g.lineTo(35, 112); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1.5; g.stroke();
    // nœud papillon
    g.beginPath(); g.moveTo(35, 58); g.lineTo(26, 53); g.lineTo(26, 63); g.closePath(); g.moveTo(35, 58); g.lineTo(44, 53); g.lineTo(44, 63); g.closePath(); g.fillStyle = PAL.roseDeep; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUTLINE; g.stroke();
    // tête
    ellipse(g, 35, 30, 16, 17.5); const sg = g.createLinearGradient(20, 14, 50, 46); sg.addColorStop(0, '#F8D2AE'); sg.addColorStop(1, '#E6AE86'); g.fillStyle = sg; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2.2; g.stroke();
    g.beginPath(); g.moveTo(18, 26); g.quadraticCurveTo(20, 6, 35, 7); g.quadraticCurveTo(52, 6, 52, 26); g.quadraticCurveTo(44, 16, 35, 17); g.quadraticCurveTo(26, 16, 18, 26); g.fillStyle = '#4A3A38'; g.fill(); g.stroke();
    g.fillStyle = OUTLINE; g.beginPath(); g.arc(29, 31, 1.7, 0, Math.PI * 2); g.arc(41, 31, 1.7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(35, 36, 5, 0.2, Math.PI - 0.2); g.strokeStyle = OUTLINE; g.lineWidth = 1.6; g.stroke();
    ellipse(g, 24, 37, 3.4, 2.2); g.fillStyle = 'rgba(255,117,168,0.4)'; g.fill(); ellipse(g, 46, 37, 3.4, 2.2); g.fill();
    // moustache
    g.beginPath(); g.moveTo(35, 34); g.quadraticCurveTo(29, 32, 26, 35); g.moveTo(35, 34); g.quadraticCurveTo(41, 32, 44, 35); g.strokeStyle = '#4A3A38'; g.lineWidth = 1.6; g.stroke();
    // bras + plateau
    g.beginPath(); g.moveTo(14, 66); g.quadraticCurveTo(2, 74, 6, 86); g.strokeStyle = OUTLINE; g.lineWidth = 9; g.stroke(); g.strokeStyle = '#5B4A8E'; g.lineWidth = 6; g.stroke();
    disc(g, 6, 88, 4.4, '#F8D2AE');
  });
}
function disc(g: G, x: number, y: number, r: number, c: string): void { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = c; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.6; g.stroke(); }

/** Fond + table pré-rendus (canvas séparés, mis en cache par style). */
const cache = new Map<string, HTMLCanvasElement>();
export function backdropCanvas(style: MenuStyle): HTMLCanvasElement {
  const k = `bd:${style}`; let c = cache.get(k);
  if (!c) { c = paint(SCENE_W, SCENE_H, 2, (g) => drawBackdrop(g, style)); cache.set(k, c); }
  return c;
}
export function tableCanvas(style: MenuStyle): HTMLCanvasElement {
  const k = `tb:${style}`; let c = cache.get(k);
  if (!c) { c = paint(SCENE_W, SCENE_H, 2, (g) => drawTable(g, style)); cache.set(k, c); }
  return c;
}
