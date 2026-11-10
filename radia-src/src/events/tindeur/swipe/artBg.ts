/** Décors et accessoires tenus en main des portraits de Tindeur (Canvas 2D vectoriel, style cartoon maison). */
import { OUTLINE, PAL, ellipse, roundRect, seeded, shade } from '../../../game/art/kit';
import type { Bg, Prop } from './types';

type G = CanvasRenderingContext2D;
export const W = 300;
export const H = 400;

/** Remplit puis contourne le chemin courant. */
export function fp(c: G, fill: string | CanvasGradient, lw = 3): void {
  c.fillStyle = fill; c.fill();
  if (lw > 0) { c.lineWidth = lw; c.strokeStyle = OUTLINE; c.stroke(); }
}
const rect = (c: G, x: number, y: number, w: number, h: number, fill: string, lw = 2.5, r = 4) => { roundRect(c, x, y, w, h, r); fp(c, fill, lw); };
const circ = (c: G, x: number, y: number, r: number, fill: string, lw = 2.5) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); fp(c, fill, lw); };
const soft = (c: G, fill: string, f: () => void) => { c.save(); c.globalAlpha = 0.55; f(); c.fillStyle = fill; c.fill(); c.restore(); };

function sky(c: G, a: string, b: string): void {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
const hill = (c: G, y: number, col: string, amp = 20, ph = 0) => {
  c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 10) c.lineTo(x, y + Math.sin(x / 48 + ph) * amp);
  c.lineTo(W, H); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUTLINE; c.stroke();
};

/** Tracteur rouge nommé (Kevin) : plaque « Josiane » sur le capot. */
function tractor(c: G, x: number, y: number, s: number): void {
  c.save(); c.translate(x, y); c.scale(s, s);
  rect(c, 56, -50, 34, 40, '#7FB6E0', 2.5, 5); // cabine
  rect(c, 52, -56, 42, 8, '#C62F36', 2.5, 4);
  rect(c, -34, -26, 70, 30, '#E8484F', 3, 8); // capot
  rect(c, -22, -50, 7, 26, '#555', 2, 2); // cheminée
  circ(c, -14, -52, 4, '#bbb', 1.5);
  rect(c, -24, -18, 46, 12, '#F7E39A', 1.5, 3);
  c.fillStyle = OUTLINE; c.font = 'bold 8px sans-serif'; c.textAlign = 'center'; c.fillText('Josiane', -1, -9);
  circ(c, 66, 6, 24, '#3B2F2A', 3); circ(c, 66, 6, 11, '#E8C547', 2); // grande roue
  circ(c, -22, 12, 15, '#3B2F2A', 3); circ(c, -22, 12, 7, '#E8C547', 2); // petite roue
  c.restore();
}

function tent(c: G, x: number, y: number, s: number): void {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(-50, 0); c.lineTo(0, -60); c.lineTo(50, 0); c.closePath(); fp(c, '#E7A24A', 3);
  c.beginPath(); c.moveTo(-14, 0); c.lineTo(0, -34); c.lineTo(14, 0); c.closePath(); fp(c, '#6B3F2A', 2.5);
  c.restore();
}

export function drawBg(c: G, bg: Bg, a: string, b: string, prop?: Prop): void {
  sky(c, a, b);
  const r = seeded(bg.length * 977 + a.length * 31);
  switch (bg) {
    case 'field':
      circ(c, 48, 52, 24, '#FFE680', 0); soft(c, '#FFF', () => { c.beginPath(); c.ellipse(220, 60, 36, 12, 0, 0, 7); });
      hill(c, 200, shade(b, -0.05), 14, 1); hill(c, 250, shade(b, -0.2), 10, 3);
      for (let i = 0; i < 6; i++) { rect(c, 8 + i * 22, 214 + (i % 2) * 2, 6, 34, '#C8955A', 2, 2); }
      if (prop === 'tractor') tractor(c, 232, 214, 0.86);
      break;
    case 'gym':
      c.fillStyle = shade(b, -0.15); c.fillRect(0, 250, W, 150);
      rect(c, 14, 30, 90, 110, shade(a, 0.35), 2.5, 6); rect(c, 196, 30, 90, 110, shade(a, 0.35), 2.5, 6);
      c.lineWidth = 6; c.strokeStyle = '#4A4A55'; c.beginPath(); c.moveTo(10, 190); c.lineTo(290, 190); c.stroke();
      for (const x of [26, 44, 256, 274]) rect(c, x - 7, 168, 14, 44, '#2E2E38', 2.5, 4);
      for (let i = 0; i < 4; i++) { circ(c, 20 + i * 24, 262, 10 + i, '#44444F'); circ(c, 250 + i * 12, 262, 8, '#44444F'); }
      break;
    case 'resto':
      for (let i = 0; i < 3; i++) { c.lineWidth = 2; c.strokeStyle = OUTLINE; c.beginPath(); c.moveTo(60 + i * 90, 0); c.lineTo(60 + i * 90, 36); c.stroke(); c.beginPath(); c.arc(60 + i * 90, 44, 14, Math.PI, 0); fp(c, '#FFD27A', 2.5); }
      rect(c, 8, 120, 70, 78, '#FFF1D6', 2.5, 5); for (let i = 0; i < 4; i++) rect(c, 15 + i * 15, 130, 10, 54, i % 2 ? '#8A2B3E' : '#5B7F3A', 2, 4);
      circ(c, 252, 150, 36, '#FFFFFF', 3); circ(c, 252, 150, 24, '#F2B28C', 2.5); circ(c, 258, 142, 6, '#6FA84A', 1.5);
      break;
    case 'office':
      rect(c, 14, 24, 130, 120, shade(a, 0.4), 3, 6);
      c.strokeStyle = '#7C93C2'; c.lineWidth = 2; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(18, 24 + i * 20); c.lineTo(140, 24 + i * 20); c.stroke(); }
      rect(c, 168, 32, 118, 90, '#FFFFFF', 3, 6);
      c.lineWidth = 4; c.strokeStyle = '#2FA36B'; c.beginPath(); c.moveTo(180, 108); c.lineTo(210, 90); c.lineTo(232, 98); c.lineTo(274, 50); c.stroke();
      c.beginPath(); c.moveTo(274, 50); c.lineTo(262, 52); c.lineTo(272, 62); c.closePath(); c.fillStyle = '#2FA36B'; c.fill();
      circ(c, 266, 176, 14, '#7FC48A'); rect(c, 258, 188, 16, 22, '#C8955A', 2.5, 3);
      break;
    case 'city':
      circ(c, 244, 56, 22, '#FFF6C9', 0);
      for (let i = 0; i < 7; i++) { const w = 34 + r() * 20, h = 90 + r() * 110, x = i * 44 - 6; rect(c, x, 260 - h, w, h + 150, shade(b, -0.25 - (i % 3) * 0.08), 2.5, 2); for (let k = 0; k < 8; k++) if (r() > 0.4) { c.fillStyle = '#FFE680'; c.fillRect(x + 6 + (k % 2) * 14, 270 - h + Math.floor(k / 2) * 22, 8, 10); } }
      break;
    case 'forest':
      for (let i = 0; i < 7; i++) { const x = i * 46 - 4, h = 130 + r() * 70; rect(c, x + 14, 400 - h, 12, h, '#7B5A3A', 2.5, 2); c.beginPath(); c.moveTo(x - 10, 400 - h + 40); c.lineTo(x + 20, 400 - h - 60); c.lineTo(x + 50, 400 - h + 40); c.closePath(); fp(c, i % 2 ? '#4E9A62' : '#6BB27A', 2.8); }
      circ(c, 250, 60, 22, '#FFF1B0', 0);
      break;
    case 'library':
      for (let row = 0; row < 3; row++) { rect(c, 6, 26 + row * 82, 288, 7, '#8A5A3C', 2.5, 2); for (let k = 0; k < 14; k++) { const hh = 36 + r() * 26; rect(c, 12 + k * 20, 26 + row * 82 - hh, 15, hh, ['#C0392B', '#2F6DB5', '#E2B13C', '#4E9A62', '#8E5CB0'][k % 5], 2, 2); } }
      break;
    case 'greenhouse':
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(i * 60 - 10, 0); c.lineTo(i * 60 + 30, 230); c.stroke(); } for (let j = 1; j < 4; j++) { c.beginPath(); c.moveTo(0, j * 60); c.lineTo(W, j * 60); c.stroke(); }
      for (let i = 0; i < 5; i++) { rect(c, 8 + i * 58, 228, 40, 30, '#C8794A', 2.5, 4); for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(28 + i * 58 + (k - 1) * 10, 214 - k % 2 * 8, 8, 16, (k - 1) * 0.5, 0, 7); fp(c, '#4E9A62', 2.2); } }
      break;
    case 'lake':
      circ(c, 60, 56, 24, '#FFF3B5', 0); hill(c, 170, '#7BB86F', 12, 2);
      c.fillStyle = '#6BA8B8'; c.fillRect(0, 210, W, 190); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(20 + i * 46, 240 + (i % 3) * 14); c.quadraticCurveTo(34 + i * 46, 232 + (i % 3) * 14, 48 + i * 46, 240 + (i % 3) * 14); c.stroke(); }
      c.lineWidth = 3; c.strokeStyle = OUTLINE; c.beginPath(); c.moveTo(262, 90); c.lineTo(228, 224); c.stroke(); circ(c, 228, 228, 5, '#E8484F', 2);
      break;
    case 'kitchen':
      for (let i = 0; i < 6; i++) rect(c, i * 52 - 4, 40, 50, 50, i % 2 ? '#FFFFFF' : shade(a, 0.3), 2, 2);
      rect(c, 14, 130, 108, 10, '#8A5A3C', 2.5, 2); circ(c, 40, 118, 14, '#E8484F'); circ(c, 70, 120, 12, '#F2B13C'); rect(c, 92, 100, 20, 30, '#F5F0E6', 2.5, 3);
      c.lineWidth = 3; c.strokeStyle = OUTLINE; c.beginPath(); c.moveTo(214, 60); c.lineTo(214, 100); c.stroke(); circ(c, 214, 118, 20, '#C9CED6'); circ(c, 258, 118, 20, '#C9CED6');
      break;
    case 'stage':
      c.fillStyle = shade(a, -0.3); c.fillRect(0, 0, W, H);
      for (const [x, col] of [[40, '#FF8EC1'], [150, '#FFE680'], [260, '#7FD6FF']] as [number, string][]) { c.save(); c.globalAlpha = 0.35; c.beginPath(); c.moveTo(x, 0); c.lineTo(x - 60, 300); c.lineTo(x + 60, 300); c.closePath(); c.fillStyle = col; c.fill(); c.restore(); }
      rect(c, 0, 290, W, 110, shade(b, -0.35), 0, 0); rect(c, 12, 210, 54, 70, '#2B2B33', 2.5, 4); circ(c, 39, 245, 17, '#47474F', 2);
      break;
    case 'camp':
      circ(c, 56, 56, 22, '#FFF3B5', 0); hill(c, 190, shade(b, 0.05), 16, 2); hill(c, 250, shade(b, -0.12), 10, 4);
      tent(c, 66, 262, 1.1);
      c.beginPath(); c.moveTo(232, 262); c.lineTo(222, 232); c.lineTo(252, 232); c.closePath(); fp(c, '#E8603A', 2.5); // feu
      c.beginPath(); c.moveTo(237, 252); c.lineTo(232, 236); c.lineTo(244, 236); c.closePath(); c.fillStyle = '#FFD84A'; c.fill();
      break;
    case 'stars': {
      for (let i = 0; i < 46; i++) { c.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; c.beginPath(); c.arc(r() * W, r() * 300, 0.8 + r() * 1.8, 0, 7); c.fill(); }
      circ(c, 236, 70, 26, '#FFF3C4', 0); circ(c, 246, 62, 24, shade(a, 0), 0);
      c.strokeStyle = 'rgba(255,230,150,.7)'; c.lineWidth = 2; c.beginPath(); for (const [x, y] of [[40, 70], [78, 110], [110, 66], [150, 98]]) c.lineTo(x, y); c.stroke();
      break; }
    case 'gallery':
      c.fillStyle = shade(b, 0.15); c.fillRect(0, 280, W, 120);
      rect(c, 18, 40, 84, 108, '#FFFFFF', 4, 2); rect(c, 28, 50, 64, 88, '#2F3A5C', 0, 0); c.beginPath(); c.arc(60, 94, 20, 0, 7); c.fillStyle = '#E2B13C'; c.fill();
      rect(c, 196, 60, 88, 62, '#FFFFFF', 4, 2); rect(c, 205, 69, 70, 44, '#C0392B', 0, 0); c.beginPath(); c.moveTo(205, 113); c.lineTo(240, 80); c.lineTo(275, 113); c.closePath(); c.fillStyle = '#F2D59A'; c.fill();
      break;
    case 'party':
      for (let i = 0; i < 26; i++) { c.fillStyle = ['#FFE680', '#7FD6FF', '#FF8EC1', '#9DFF9D'][i % 4]; c.beginPath(); c.arc(r() * W, r() * 300, 3 + r() * 5, 0, 7); c.fill(); }
      circ(c, 150, 36, 22, '#E7E7F2', 2.5); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(150 + k * 8, 18); c.lineTo(150 + k * 8, 54); c.stroke(); }
      for (const [x, y, col] of [[30, 120, '#FF5D8F'], [270, 90, '#5ACDF2'], [250, 210, '#FFD84A']] as [number, number, string][]) { c.beginPath(); c.ellipse(x, y, 16, 20, 0, 0, 7); fp(c, col, 2.5); c.beginPath(); c.moveTo(x, y + 20); c.lineTo(x - 2, y + 60); c.stroke(); }
      break;
    case 'cafe':
      rect(c, 12, 28, 118, 124, shade(a, 0.35), 3, 6); c.strokeStyle = OUTLINE; c.lineWidth = 3; c.beginPath(); c.moveTo(71, 28); c.lineTo(71, 152); c.stroke();
      c.fillStyle = '#7A4A2B'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.fillText('CAFÉ', 71, 18);
      circ(c, 246, 150, 30, '#8A5A3C', 3); circ(c, 246, 150, 24, '#B0794B', 0);
      break;
    case 'sunset':
      circ(c, 150, 190, 72, '#FFD36B', 0); soft(c, '#FFFFFF', () => { c.beginPath(); c.ellipse(60, 70, 40, 12, 0, 0, 7); }); soft(c, '#FFFFFF', () => { c.beginPath(); c.ellipse(240, 100, 44, 12, 0, 0, 7); });
      c.fillStyle = shade(b, -0.25); c.fillRect(0, 262, W, 138);
      break;
    case 'crossroads':
      c.fillStyle = '#E8D9A8'; c.beginPath(); c.moveTo(130, 400); c.lineTo(170, 400); c.lineTo(166, 250); c.lineTo(80, 200); c.lineTo(100, 190); c.lineTo(176, 232); c.lineTo(250, 190); c.lineTo(270, 204); c.lineTo(178, 258); c.closePath(); c.fill();
      hill(c, 190, shade(b, -0.1), 8, 1);
      rect(c, 36, 120, 56, 22, '#E9C46A', 2.5, 3); rect(c, 60, 142, 6, 70, '#8A5A3C', 2, 1); rect(c, 214, 80, 56, 22, '#9CC9E8', 2.5, 3); rect(c, 238, 102, 6, 110, '#8A5A3C', 2, 1);
      c.fillStyle = OUTLINE; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillText('?', 64, 136); c.fillText('?', 242, 96);
      break;
    case 'room':
      for (let i = 0; i < 4; i++) { rect(c, 14 + i * 30, 36 + (i % 2) * 6, 22, 30, ['#FF7AA8', '#7FD6FF', '#FFE680', '#9DFF9D'][i], 2.2, 2); }
      if (prop === 'controller') { rect(c, 180, 36, 106, 74, '#1D1B3A', 3.5, 6); c.fillStyle = '#7FFFD4'; c.font = 'bold 12px monospace'; c.textAlign = 'left'; c.fillText('> JOUEUR 2', 192, 62); c.fillStyle = '#FF8EC1'; c.fillText('  PRÊT ?', 192, 82); }
      else { rect(c, 188, 34, 92, 96, '#CFE6F5', 3.5, 6); c.strokeStyle = OUTLINE; c.lineWidth = 3; c.beginPath(); c.moveTo(234, 34); c.lineTo(234, 130); c.moveTo(188, 82); c.lineTo(280, 82); c.stroke(); circ(c, 258, 56, 9, '#FFF1A8', 0); rect(c, 14, 200, 50, 40, '#8CB6A3', 2.5, 6); c.beginPath(); c.moveTo(39, 200); c.lineTo(39, 170); c.lineWidth = 3; c.strokeStyle = OUTLINE; c.stroke(); circ(c, 39, 166, 12, '#FFE680'); }
      break;
    case 'car':
      // habitacle : pare-brise sur la route, tableau de bord et volant (selfie en voiture, à l'arrêt)
      hill(c, 150, shade(b, -0.1), 8, 2);
      c.fillStyle = '#4A4F5C'; c.fillRect(0, 170, W, 36); c.strokeStyle = '#F6E27A'; c.lineWidth = 3; c.setLineDash([16, 14]); c.beginPath(); c.moveTo(0, 188); c.lineTo(W, 188); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.moveTo(0, 262); c.lineTo(W, 236); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); fp(c, '#3B3F4B', 3);
      circ(c, 232, 300, 46, '#2B2D35', 4); circ(c, 232, 300, 20, '#54586A', 3); rect(c, 14, 214, 70, 22, '#2F323C', 2.5, 5);
      break;
    case 'shop':
      rect(c, 12, 28, 276, 22, '#E8484F', 3, 4); for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#FFF' : '#E8484F'; c.fillRect(14 + i * 34, 30, 17, 18); }
      rect(c, 14, 100, 90, 70, '#FFF3DC', 2.5, 4); for (let k = 0; k < 3; k++) circ(c, 36 + k * 24, 140, 9, ['#F0B84A', '#E8603A', '#7FC48A'][k]);
      rect(c, 198, 110, 88, 64, '#FFFFFF', 2.5, 4); rect(c, 208, 118, 28, 40, '#C0392B', 1.5, 2); rect(c, 242, 124, 34, 34, '#2F6DB5', 1.5, 2);
      break;
    case 'bakery':
      for (let i = 0; i < 3; i++) { rect(c, 10, 40 + i * 42, 280, 6, '#C99A5E', 2.2, 2); for (let k = 0; k < 7; k++) { c.beginPath(); c.ellipse(34 + k * 38, 34 + i * 42, 15, 9, 0, 0, 7); fp(c, ['#E8B26A', '#D98F4E', '#F2D49A'][(k + i) % 3], 2.2); } }
      break;
  }
}

/** Objets au premier plan (en bas), tenus ou posés devant le buste. */
export function drawProp(c: G, prop: Prop): void {
  switch (prop) {
    case 'shaker':
      rect(c, 220, 318, 36, 62, '#FFFFFF', 3, 10); rect(c, 214, 308, 48, 16, '#E24B4B', 3, 6); rect(c, 226, 336, 24, 22, '#FFB4C4', 0, 4); c.fillStyle = OUTLINE; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('PROT', 238, 351);
      break;
    case 'guitar':
      c.save(); c.translate(224, 332); c.rotate(-0.28);
      rect(c, 6, -150, 16, 124, '#7A4A2B', 3, 3); rect(c, 4, -168, 20, 22, '#4B2E1B', 3, 4);
      c.beginPath(); c.ellipse(14, -6, 44, 38, 0, 0, 7); fp(c, '#D9803B', 3.2); c.beginPath(); c.ellipse(14, 34, 52, 44, 0, 0, 7); fp(c, '#E8964C', 3.2); circ(c, 14, 16, 12, '#3B2A22', 2.5);
      c.restore();
      break;
    case 'fish':
      c.save(); c.translate(224, 344); c.rotate(-0.25);
      c.beginPath(); c.ellipse(0, 0, 44, 20, 0, 0, 7); fp(c, '#8EC1D6', 3); c.beginPath(); c.moveTo(40, 0); c.lineTo(66, -18); c.lineTo(66, 18); c.closePath(); fp(c, '#6BA0B8', 3);
      circ(c, -26, -4, 4.5, '#fff', 2); circ(c, -27, -4, 2, OUTLINE, 0); c.beginPath(); c.arc(-4, 0, 14, -1.2, 1.2); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke();
      c.restore();
      break;
    case 'plant':
      for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(238 + (i - 2) * 12, 322 - Math.abs(i - 2) * 6, 10, 26, (i - 2) * 0.42, 0, 7); fp(c, i % 2 ? '#4E9A62' : '#6BB27A', 2.6); }
      c.beginPath(); c.moveTo(212, 340); c.lineTo(264, 340); c.lineTo(256, 392); c.lineTo(220, 392); c.closePath(); fp(c, '#C8794A', 3);
      break;
    case 'cupcake':
      c.beginPath(); c.moveTo(214, 346); c.lineTo(262, 346); c.lineTo(254, 392); c.lineTo(222, 392); c.closePath(); fp(c, '#F5B5C8', 3);
      c.beginPath(); c.arc(238, 344, 28, Math.PI, 0); fp(c, '#FFF4E8', 3); circ(c, 238, 306, 7, '#E8484F', 2.5);
      break;
    case 'plate':
      c.beginPath(); c.ellipse(78, 372, 62, 16, 0, 0, 7); fp(c, '#FFFFFF', 3); c.beginPath(); c.ellipse(78, 368, 38, 9, 0, 0, 7); fp(c, '#F0EDE6', 1.5);
      c.beginPath(); c.ellipse(78, 360, 22, 12, 0, 0, 7); fp(c, '#B9784F', 2.5); circ(c, 64, 356, 5, '#6FA84A', 1.5); circ(c, 96, 358, 5, '#E8484F', 1.5);
      break;
    case 'laptop':
      c.beginPath(); c.moveTo(70, 330); c.lineTo(230, 330); c.lineTo(250, 392); c.lineTo(50, 392); c.closePath(); fp(c, '#C9CED6', 3); circ(c, 150, 358, 9, '#E4E7EC', 2);
      break;
    case 'book':
      c.beginPath(); c.moveTo(150, 392); c.quadraticCurveTo(110, 366, 52, 376); c.lineTo(52, 334); c.quadraticCurveTo(110, 326, 150, 350); c.closePath(); fp(c, '#FFF9EA', 3);
      c.beginPath(); c.moveTo(150, 392); c.quadraticCurveTo(190, 366, 248, 376); c.lineTo(248, 334); c.quadraticCurveTo(190, 326, 150, 350); c.closePath(); fp(c, '#FFF3D6', 3);
      c.strokeStyle = 'rgba(88,67,63,.35)'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(66, 346 + i * 8); c.quadraticCurveTo(100, 342 + i * 8, 136, 360 + i * 8 - 4); c.stroke(); }
      break;
    case 'controller':
      c.beginPath(); c.ellipse(150, 366, 62, 26, 0, 0, 7); fp(c, '#5A5AE0', 3); rect(c, 92, 354, 28, 8, '#2E2E60', 1.5, 2); rect(c, 102, 344, 8, 28, '#2E2E60', 1.5, 2);
      circ(c, 186, 358, 6, '#FF6B8B', 1.5); circ(c, 200, 368, 6, '#FFD84A', 1.5); circ(c, 172, 368, 6, '#6CE08F', 1.5);
      break;
    case 'map':
      c.beginPath(); c.moveTo(34, 336); c.lineTo(100, 326); c.lineTo(160, 340); c.lineTo(160, 396); c.lineTo(100, 384); c.lineTo(34, 394); c.closePath(); fp(c, '#F4E3B4', 3);
      c.setLineDash([5, 5]); c.strokeStyle = '#C0392B'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(48, 380); c.quadraticCurveTo(80, 346, 120, 366); c.lineTo(146, 348); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#C0392B'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center'; c.fillText('✕', 146, 352);
      break;
    case 'coffee':
      rect(c, 212, 336, 44, 44, '#FFFFFF', 3, 10); c.beginPath(); c.arc(260, 358, 12, -1.5, 1.5); c.lineWidth = 5; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 2.5; c.strokeStyle = '#FFF'; c.stroke();
      rect(c, 218, 342, 32, 8, '#7A4A2B', 0, 4); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; for (const x of [226, 242]) { c.beginPath(); c.moveTo(x, 328); c.quadraticCurveTo(x + 8, 316, x, 304); c.stroke(); }
      break;
    case 'dumbbell':
      rect(c, 100, 360, 100, 8, '#555', 2, 3); rect(c, 84, 346, 18, 36, '#333', 2.5, 4); rect(c, 198, 346, 18, 36, '#333', 2.5, 4);
      break;
    case 'phone':
      rect(c, 220, 316, 40, 72, '#2B2B33', 3, 8); rect(c, 225, 324, 30, 52, '#9FD6FF', 0, 3);
      break;
    case 'wine':
      c.beginPath(); c.moveTo(222, 320); c.lineTo(258, 320); c.quadraticCurveTo(258, 352, 240, 352); c.quadraticCurveTo(222, 352, 222, 320); fp(c, 'rgba(255,255,255,.55)', 3);
      c.beginPath(); c.moveTo(224, 334); c.lineTo(256, 334); c.quadraticCurveTo(254, 350, 240, 350); c.quadraticCurveTo(226, 350, 224, 334); c.fillStyle = '#8A1F3A'; c.fill(); rect(c, 237, 352, 6, 26, '#DDE', 2, 2); rect(c, 224, 376, 32, 6, '#DDE', 2, 3);
      break;
    case 'dog':
      // petit chien tenu devant soi (museau, oreilles tombantes, langue)
      circ(c, 226, 340, 34, '#D9A066', 3); c.beginPath(); c.ellipse(198, 322, 12, 22, 0.4, 0, 7); fp(c, '#9A6A3A', 3); c.beginPath(); c.ellipse(254, 322, 12, 22, -0.4, 0, 7); fp(c, '#9A6A3A', 3);
      circ(c, 214, 334, 5, '#fff', 2); circ(c, 238, 334, 5, '#fff', 2); circ(c, 215, 335, 2.4, OUTLINE, 0); circ(c, 239, 335, 2.4, OUTLINE, 0); circ(c, 226, 348, 7, '#3B2F2A', 2); rect(c, 222, 354, 8, 14, '#F28FA6', 2, 4);
      break;
    case 'cat':
      circ(c, 226, 342, 32, '#C9CED6', 3); c.beginPath(); c.moveTo(200, 322); c.lineTo(204, 296); c.lineTo(220, 316); c.closePath(); fp(c, '#C9CED6', 3); c.beginPath(); c.moveTo(252, 322); c.lineTo(248, 296); c.lineTo(232, 316); c.closePath(); fp(c, '#C9CED6', 3);
      circ(c, 214, 338, 5, '#7FD6A0', 2); circ(c, 238, 338, 5, '#7FD6A0', 2); c.beginPath(); c.moveTo(226, 346); c.lineTo(222, 352); c.lineTo(230, 352); c.closePath(); fp(c, '#F28FA6', 1.5);
      c.strokeStyle = OUTLINE; c.lineWidth = 2; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(226 + d * 14, 350); c.lineTo(226 + d * 34, 346); c.moveTo(226 + d * 14, 354); c.lineTo(226 + d * 34, 358); c.stroke(); }
      break;
    case 'tent': case 'tractor': case 'none': break;
  }
  void PAL; void ellipse;
}
