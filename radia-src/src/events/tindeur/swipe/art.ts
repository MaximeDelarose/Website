/**
 * Portraits illustrés des profils de Tindeur : Canvas 2D vectoriel, même style cartoon que les personnages du jeu
 * (contour chocolat, lumière en haut à gauche, grands yeux brillants). Chaque profil combine coiffure, peau, tenue,
 * accessoire, expression et décor ; tout est fictif.
 */
import { OUTLINE, canvasUrl, gloss, makeCanvas, rgba, shade } from '../../../game/art/kit';
import { H, W, drawBg, drawProp, fp } from './artBg';
import { profileById } from './data';
import type { Look } from './types';

type G = CanvasRenderingContext2D;
const CX = 150, CY = 150;
const ZOOM = 1.12;

const faceDims = (l: Look): { rx: number; ry: number; sq: number } =>
  l.face === 'long' ? { rx: 54, ry: 68, sq: 0.5 } : l.face === 'square' ? { rx: 58, ry: 62, sq: 1 } : { rx: 58, ry: 62, sq: 0.3 };

function facePath(c: G, rx: number, ry: number, sq: number, grow = 0): void {
  const x = rx + grow, y = ry + grow;
  c.beginPath();
  c.moveTo(CX - x, CY);
  c.bezierCurveTo(CX - x, CY - y * 1.08, CX + x, CY - y * 1.08, CX + x, CY);
  c.bezierCurveTo(CX + x, CY + y * (0.5 + sq * 0.4), CX + x * (0.62 + sq * 0.2), CY + y, CX, CY + y);
  c.bezierCurveTo(CX - x * (0.62 + sq * 0.2), CY + y, CX - x, CY + y * (0.5 + sq * 0.4), CX - x, CY);
  c.closePath();
}

// ------------------------------------------------------------------ corps

function torso(c: G, l: Look): void {
  const wide = l.outfit === 'tank' ? 20 : 0;
  const body = () => {
    c.beginPath(); c.moveTo(34 - wide, H + 4);
    c.bezierCurveTo(34 - wide, 300, 66 - wide / 2, 262, 112, 248); c.lineTo(188, 248);
    c.bezierCurveTo(234 + wide / 2, 262, 266 + wide, 300, 266 + wide, H + 4); c.closePath();
  };
  // cou
  c.beginPath(); c.moveTo(128, 196); c.lineTo(172, 196); c.lineTo(176, 256); c.lineTo(124, 256); c.closePath(); fp(c, shade(l.skin, -0.08), 3);
  c.save(); c.globalAlpha = 0.25; c.beginPath(); c.ellipse(150, 214, 30, 14, 0, 0, 7); c.fillStyle = shade(l.skin, -0.45); c.fill(); c.restore();
  const t2 = l.top2 ?? shade(l.top, 0.3);
  const o = l.outfit;
  if (o === 'tank' || o === 'bare' || o === 'abs') { body(); fp(c, l.skin, 3.2); }
  else if (o === 'overalls' || o === 'apron' || o === 'cardigan' || o === 'blazer' || o === 'suit') { body(); fp(c, o === 'overalls' || o === 'apron' ? t2 : l.top, 3.2); }
  else { body(); fp(c, l.top, 3.2); }
  c.save(); body(); c.clip();
  switch (o) {
    case 'tee':
      c.beginPath(); c.ellipse(150, 252, 28, 18, 0, 0, Math.PI); fp(c, shade(l.skin, -0.1), 3); c.beginPath(); c.arc(150, 250, 30, 0.1, Math.PI - 0.1); c.lineWidth = 6; c.strokeStyle = shade(l.top, -0.2); c.stroke();
      break;
    case 'sweater':
      c.beginPath(); c.ellipse(150, 252, 28, 16, 0, 0, Math.PI); fp(c, shade(l.skin, -0.1), 3); c.beginPath(); c.arc(150, 248, 31, 0.05, Math.PI - 0.05); c.lineWidth = 9; c.strokeStyle = l.top2 ?? shade(l.top, -0.15); c.stroke();
      c.strokeStyle = rgba('#FFFFFF', 0.18); c.lineWidth = 3; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(40, 280 + i * 18); c.quadraticCurveTo(150, 290 + i * 18, 262, 280 + i * 18); c.stroke(); }
      break;
    case 'turtle':
      c.beginPath(); c.moveTo(118, 196); c.lineTo(182, 196); c.lineTo(186, 262); c.lineTo(114, 262); c.closePath(); fp(c, shade(l.top, 0.06), 3);
      c.strokeStyle = rgba('#FFFFFF', 0.12); c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(118, 210 + i * 14); c.lineTo(182, 210 + i * 14); c.stroke(); }
      break;
    case 'polo': case 'shirt': {
      const sc = o === 'shirt' ? l.top2 ?? '#2F3B66' : l.top;
      c.beginPath(); c.moveTo(132, 250); c.lineTo(150, 296); c.lineTo(168, 250); c.closePath(); fp(c, shade(l.skin, -0.1), 2.5);
      c.beginPath(); c.moveTo(150, 296); c.lineTo(132, 246); c.lineTo(112, 256); c.lineTo(134, 296); c.closePath(); fp(c, shade(o === 'polo' ? l.top : '#FFFFFF', 0.12), 2.8);
      c.beginPath(); c.moveTo(150, 296); c.lineTo(168, 246); c.lineTo(188, 256); c.lineTo(166, 296); c.closePath(); fp(c, shade(o === 'polo' ? l.top : '#FFFFFF', 0.12), 2.8);
      c.beginPath(); c.moveTo(150, 296); c.lineTo(150, 410); c.lineWidth = 2.5; c.strokeStyle = OUTLINE; c.stroke();
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(150, 312 + i * 26, 3.4, 0, 7); c.fillStyle = sc; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUTLINE; c.stroke(); }
      break; }
    case 'hoodie':
      c.beginPath(); c.ellipse(150, 252, 54, 28, 0, Math.PI, 0, true); c.closePath(); fp(c, shade(l.top, -0.12), 3);
      c.beginPath(); c.ellipse(150, 252, 32, 18, 0, 0, Math.PI); fp(c, shade(l.skin, -0.1), 2.5);
      for (const x of [132, 168]) { c.beginPath(); c.moveTo(x, 262); c.quadraticCurveTo(x + (x < 150 ? -4 : 4), 300, x, 330); c.lineWidth = 3.5; c.strokeStyle = '#F5F0E6'; c.stroke(); circ2(c, x, 332, 3.5); }
      rectR(c, 100, 340, 100, 46, shade(l.top, -0.1), 3, 12);
      break;
    case 'suit': case 'blazer':
      c.beginPath(); c.moveTo(120, 248); c.lineTo(150, 330); c.lineTo(180, 248); c.closePath(); fp(c, o === 'suit' ? '#FFFFFF' : t2, 2.8);
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(150 + s * 4, 330); c.lineTo(150 + s * 34, 252); c.lineTo(150 + s * 62, 262); c.lineTo(150 + s * 36, 346); c.closePath(); fp(c, shade(l.top, 0.12), 3); }
      c.beginPath(); c.moveTo(138, 248); c.lineTo(150, 270); c.lineTo(162, 248); c.closePath(); fp(c, shade(l.skin, -0.08), 2);
      break;
    case 'cardigan':
      c.beginPath(); c.moveTo(126, 248); c.lineTo(150, 340); c.lineTo(174, 248); c.closePath(); fp(c, t2, 2.8);
      c.beginPath(); c.moveTo(150, 340); c.lineTo(150, 410); c.lineWidth = 3; c.strokeStyle = OUTLINE; c.stroke();
      for (let i = 0; i < 3; i++) circ2(c, 156, 314 + i * 28, 4.2, shade(l.top, -0.35));
      c.beginPath(); c.ellipse(150, 252, 20, 12, 0, 0, Math.PI); fp(c, shade(l.skin, -0.1), 2);
      break;
    case 'overalls':
      c.beginPath(); c.moveTo(24, 400); c.lineTo(32, 308); c.lineTo(120, 308); c.lineTo(120, 270); c.lineTo(180, 270); c.lineTo(180, 308); c.lineTo(268, 308); c.lineTo(276, 400); c.closePath(); fp(c, l.top, 3);
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(150 + s * 20, 270); c.lineTo(150 + s * 42, 254); c.lineTo(150 + s * 56, 262); c.lineTo(150 + s * 32, 308); c.closePath(); fp(c, l.top, 2.8); circ2(c, 150 + s * 38, 292, 4.5, '#E8C547'); }
      rectR(c, 126, 322, 48, 34, shade(l.top, -0.12), 2.5, 6);
      break;
    case 'apron':
      c.beginPath(); c.moveTo(112, 262); c.lineTo(188, 262); c.lineTo(214, 410); c.lineTo(86, 410); c.closePath(); fp(c, l.top, 3);
      c.beginPath(); c.moveTo(112, 262); c.quadraticCurveTo(150, 296, 188, 262); c.lineWidth = 3; c.strokeStyle = OUTLINE; c.stroke();
      c.beginPath(); c.moveTo(114, 262); c.lineTo(132, 214); c.moveTo(186, 262); c.lineTo(168, 214); c.lineWidth = 4.5; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 2.4; c.strokeStyle = l.top; c.stroke();
      rectR(c, 126, 322, 48, 34, shade(l.top, -0.08), 2.5, 6);
      c.beginPath(); c.ellipse(150, 252, 20, 12, 0, 0, Math.PI); fp(c, shade(l.skin, -0.1), 2);
      break;
    case 'bare': case 'abs': {
      // torse nu (humour, non explicite) : clavicules, contours des pectoraux sans détail, ombre douce ; « abs » : tablette de chocolat dessinée
      const line = shade(l.skin, -0.32);
      c.lineWidth = 2.4; c.strokeStyle = line; c.lineCap = 'round';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(150 + s * 10, 254); c.quadraticCurveTo(150 + s * 42, 246, 150 + s * 84, 262); c.stroke(); }
      for (const s of [-1, 1]) { c.beginPath(); c.arc(150 + s * 28, 296, 27, 0.2 + (s > 0 ? 0 : 0.0), Math.PI - 0.2); c.stroke(); }
      c.save(); c.globalAlpha = 0.14; c.beginPath(); c.ellipse(150, 330, 80, 70, 0, 0, 7); c.fillStyle = shade(l.skin, -0.5); c.fill(); c.restore();
      if (o === 'abs') {
        c.beginPath(); c.moveTo(150, 318); c.lineTo(150, 410); c.stroke();
        for (const y of [336, 362, 388]) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(150 + s * 4, y); c.quadraticCurveTo(150 + s * 26, y - 6, 150 + s * 36, y + 2); c.stroke(); }
      }
      break; }
    case 'tank': {
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(150 + s * 24, 250); c.lineTo(150 + s * 42, 250); c.lineTo(150 + s * 66, 410); c.lineTo(150 + s * 26, 410); c.closePath(); fp(c, l.top, 3); }
      c.beginPath(); c.moveTo(106, 300); c.lineTo(194, 300); c.lineTo(198, 410); c.lineTo(102, 410); c.closePath(); fp(c, l.top, 3);
      c.beginPath(); c.moveTo(150, 262); c.lineTo(150, 304); c.lineWidth = 2.4; c.strokeStyle = shade(l.skin, -0.35); c.stroke();
      c.beginPath(); c.arc(124, 288, 22, 0.2, Math.PI - 0.2); c.arc(176, 288, 22, 0.2, Math.PI - 0.2); c.lineWidth = 2.4; c.stroke();
      break; }
  }
  c.restore();
  body(); c.lineWidth = 3.2; c.strokeStyle = OUTLINE; c.stroke();
  // reflet épaule
  gloss(c, 76, 296, 22, 8, 0.28, -0.6);
}
function circ2(c: G, x: number, y: number, r: number, fill = '#F5F0E6'): void { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); fp(c, fill, 1.8); }
function rectR(c: G, x: number, y: number, w: number, h: number, fill: string, lw: number, r: number): void {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); fp(c, fill, lw);
}

// ------------------------------------------------------------------ cheveux

function hairBack(c: G, l: Look, d: { rx: number; ry: number }): void {
  const col = l.hairColor;
  if (l.hair === 'long') {
    c.beginPath(); c.moveTo(CX - d.rx - 14, CY - 10);
    c.bezierCurveTo(CX - d.rx - 26, CY - d.ry - 20, CX + d.rx + 26, CY - d.ry - 20, CX + d.rx + 14, CY - 10);
    c.bezierCurveTo(CX + d.rx + 30, CY + 70, CX + d.rx + 34, CY + 130, CX + d.rx + 6, CY + 138);
    c.lineTo(CX - d.rx - 6, CY + 138); c.bezierCurveTo(CX - d.rx - 34, CY + 130, CX - d.rx - 30, CY + 70, CX - d.rx - 14, CY - 10); c.closePath();
    fp(c, col, 3.2);
  } else if (l.hair === 'afro') {
    c.beginPath(); c.arc(CX, CY - 22, d.rx + 36, 0, Math.PI * 2); fp(c, col, 3.2);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; c.beginPath(); c.arc(CX + Math.cos(a) * (d.rx + 36), CY - 22 + Math.sin(a) * (d.rx + 36), 12, 0, 7); fp(c, col, 3); }
    c.beginPath(); c.arc(CX, CY - 22, d.rx + 34, 0, Math.PI * 2); c.fillStyle = col; c.fill();
  } else if (l.hair === 'bun') {
    c.beginPath(); c.arc(CX, CY - d.ry - 14, 17, 0, 7); fp(c, col, 3); c.beginPath(); c.moveTo(CX - 10, CY - d.ry - 14); c.lineTo(CX + 10, CY - d.ry - 14); c.lineWidth = 3; c.strokeStyle = shade(col, -0.3); c.stroke();
  }
}

function hairFront(c: G, l: Look, d: { rx: number; ry: number }): void {
  const col = l.hairColor, hi = shade(col, 0.32);
  const top = CY - d.ry;
  const dome = (grow: number, drop: number) => {
    c.beginPath(); c.moveTo(CX - d.rx - grow, CY + 4);
    c.bezierCurveTo(CX - d.rx - grow - 4, top - 20 - grow, CX + d.rx + grow + 4, top - 20 - grow, CX + d.rx + grow, CY + 4);
    c.lineTo(CX + d.rx - 2, CY - 12); c.bezierCurveTo(CX + 30, CY - drop, CX - 10, CY - drop - 8, CX - d.rx + 2, CY - 14); c.closePath();
  };
  switch (l.hair) {
    case 'short': dome(4, 38); fp(c, col, 3.2); c.beginPath(); c.arc(CX - 18, top + 4, 22, 3.6, 4.7); c.lineWidth = 4; c.strokeStyle = rgba('#FFFFFF', 0.28); c.stroke(); break;
    case 'side':
      dome(4, 34); fp(c, col, 3.2);
      c.beginPath(); c.moveTo(CX - 40, top + 6); c.quadraticCurveTo(CX - 4, top + 26, CX + 22, CY - 24); c.lineWidth = 2.4; c.strokeStyle = shade(col, -0.35); c.stroke();
      c.beginPath(); c.arc(CX - 22, top + 6, 22, 3.6, 4.6); c.lineWidth = 4; c.strokeStyle = rgba('#FFFFFF', 0.25); c.stroke(); break;
    case 'quiff': {
      dome(4, 40); fp(c, col, 3.2);
      c.beginPath(); c.moveTo(CX - 46, CY - 30); c.bezierCurveTo(CX - 52, top - 52, CX + 30, top - 58, CX + 56, top - 12); c.bezierCurveTo(CX + 30, top - 22, CX - 10, top - 8, CX - 46, CY - 30); c.closePath(); fp(c, col, 3.2);
      c.beginPath(); c.moveTo(CX - 30, top - 14); c.quadraticCurveTo(CX, top - 40, CX + 34, top - 22); c.lineWidth = 3.4; c.strokeStyle = hi; c.stroke(); break; }
    case 'buzz':
      c.save(); facePath(c, d.rx, d.ry, 0.3, 4); c.clip(); c.beginPath(); c.rect(0, 0, W, CY - 22); c.fillStyle = rgba(col, 0.78); c.fill(); c.restore();
      c.beginPath(); c.arc(CX, CY, d.rx + 3, Math.PI * 1.07, Math.PI * 1.93); c.lineWidth = 3; c.strokeStyle = OUTLINE; c.stroke(); break;
    case 'slick':
      dome(5, 30); fp(c, col, 3.2);
      c.strokeStyle = rgba('#FFFFFF', 0.35); c.lineWidth = 2.6; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(CX - 40 + i * 20, CY - 34); c.quadraticCurveTo(CX - 32 + i * 20, top - 6, CX - 10 + i * 24, top - 10); c.stroke(); } break;
    case 'messy':
      c.beginPath(); c.moveTo(CX - d.rx - 3, CY + 2);
      for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; const r = d.rx + 8 + (i % 2 ? 16 : 2); c.lineTo(CX + Math.cos(a) * r, CY - 8 + Math.sin(a) * (d.ry + 6 + (i % 2 ? 18 : 2))); }
      c.lineTo(CX + d.rx + 3, CY + 2); c.lineTo(CX + d.rx - 4, CY - 14); c.quadraticCurveTo(CX, CY - 40, CX - d.rx + 4, CY - 14); c.closePath(); fp(c, col, 3.2); break;
    case 'curly':
      for (let i = 0; i < 11; i++) { const a = Math.PI * 1.02 + (i / 10) * Math.PI * 0.96; c.beginPath(); c.arc(CX + Math.cos(a) * (d.rx + 4), CY - 6 + Math.sin(a) * (d.ry + 2), 15 + (i % 3) * 2, 0, 7); fp(c, col, 3); }
      c.beginPath(); c.moveTo(CX - d.rx + 2, CY - 12); c.quadraticCurveTo(CX, CY - 40, CX + d.rx - 2, CY - 12); c.lineTo(CX + d.rx, CY - 30); c.lineTo(CX - d.rx, CY - 30); c.closePath(); c.fillStyle = col; c.fill();
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(CX - 30 + i * 20, top + 10 + (i % 2) * 5, 11, 0, 7); fp(c, col, 2.6); } break;
    case 'long':
      dome(6, 32); fp(c, col, 3.2);
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(CX + s * (d.rx - 2), CY - 12); c.quadraticCurveTo(CX + s * (d.rx + 12), CY + 40, CX + s * (d.rx + 4), CY + 90); c.lineTo(CX + s * (d.rx - 10), CY + 70); c.quadraticCurveTo(CX + s * (d.rx - 6), CY + 20, CX + s * (d.rx - 8), CY - 10); c.closePath(); fp(c, col, 3); }
      break;
    case 'bun': dome(3, 36); fp(c, col, 3.2); break;
    case 'afro':
      c.beginPath(); c.moveTo(CX - d.rx + 4, CY - 22); c.quadraticCurveTo(CX, CY - 52, CX + d.rx - 4, CY - 22); c.lineTo(CX + d.rx, CY - 40); c.lineTo(CX - d.rx, CY - 40); c.closePath(); c.fillStyle = col; c.fill();
      c.beginPath(); c.moveTo(CX - d.rx + 3, CY - 24); c.quadraticCurveTo(CX, CY - 54, CX + d.rx - 3, CY - 24); c.lineWidth = 2.6; c.strokeStyle = OUTLINE; c.stroke(); break;
    case 'receding':
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(CX + s * (d.rx + 3), CY + 6); c.quadraticCurveTo(CX + s * (d.rx + 6), CY - 40, CX + s * 28, CY - d.ry + 8); c.lineTo(CX + s * 20, CY - 40); c.quadraticCurveTo(CX + s * (d.rx - 6), CY - 28, CX + s * (d.rx - 4), CY + 4); c.closePath(); fp(c, col, 3); }
      c.beginPath(); c.moveTo(CX - 8, CY - 54); c.quadraticCurveTo(CX, CY - 64, CX + 8, CY - 54); c.quadraticCurveTo(CX, CY - 50, CX - 8, CY - 54); fp(c, col, 2.4);
      c.beginPath(); c.arc(CX - 14, CY - d.ry + 6, 16, 3.5, 4.6); c.lineWidth = 4; c.strokeStyle = rgba('#FFFFFF', 0.4); c.stroke(); break;
    case 'bald':
      c.beginPath(); c.arc(CX - 18, CY - d.ry + 10, 22, 3.55, 4.7); c.lineWidth = 5; c.strokeStyle = rgba('#FFFFFF', 0.42); c.stroke();
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(CX + s * (d.rx + 1), CY - 4); c.quadraticCurveTo(CX + s * (d.rx + 6), CY - 26, CX + s * (d.rx - 8), CY - 32); c.lineTo(CX + s * (d.rx - 3), CY - 4); c.closePath(); fp(c, col, 2.6); }
      break;
  }
}

// ------------------------------------------------------------------ visage

function eyes(c: G, l: Look): void {
  const hidden = l.glasses === 'sun';
  const surprised = l.mood === 'surprised';
  const dx = 25, y = CY + 6;
  for (const s of [-1, 1]) {
    const x = CX + s * dx;
    if (l.mood === 'wink' && s === 1) { c.beginPath(); c.arc(x, y + 2, 11, Math.PI * 1.1, Math.PI * 1.9, false); c.lineWidth = 4; c.strokeStyle = OUTLINE; c.stroke(); continue; }
    if (hidden) continue;
    const rx = surprised ? 12 : 10.5, ry = surprised ? 14 : 12;
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); fp(c, '#FFFFFF', 2.8);
    const look = l.mood === 'shy' ? 4 : 0;
    c.beginPath(); c.ellipse(x - s * 1.5, y + look, 6.8, 8.4, 0, 0, 7); c.fillStyle = shade('#6B4A33', 0); c.fill();
    c.beginPath(); c.ellipse(x - s * 1.5, y + look, 3.6, 5, 0, 0, 7); c.fillStyle = '#231815'; c.fill();
    c.beginPath(); c.arc(x - s * 1.5 - 2, y + look - 3, 2.4, 0, 7); c.fillStyle = '#FFFFFF'; c.fill();
    if (l.mood === 'calm' || l.mood === 'smirk') { c.beginPath(); c.ellipse(x, y - 6, rx + 1.5, 6.5, 0, Math.PI, 0); c.fillStyle = l.skin; c.fill(); c.beginPath(); c.moveTo(x - rx - 1, y - 6); c.lineTo(x + rx + 1, y - 6); c.lineWidth = 3; c.strokeStyle = OUTLINE; c.stroke(); }
  }
  // sourcils
  const bc = shade(l.hairColor, -0.1);
  const brow = l.brow ?? (surprised || l.mood === 'proud' ? 'up' : l.mood === 'shy' ? 'worried' : 'flat');
  c.lineWidth = 5.4; c.strokeStyle = bc;
  for (const s of [-1, 1]) {
    const x = CX + s * dx; let y0 = CY - 16, y1 = CY - 16;
    if (brow === 'up') { y0 = CY - 22; y1 = CY - 24; } else if (brow === 'worried') { y0 = CY - 24; y1 = CY - 14; } else if (brow === 'down') { y0 = CY - 12; y1 = CY - 20; }
    if (l.mood === 'smirk' && s === 1) { y0 -= 4; y1 -= 6; }
    const inner = s === -1 ? [x + 11, y0] : [x - 11, y0], outer = s === -1 ? [x - 12, y1] : [x + 12, y1];
    c.beginPath(); c.moveTo(outer[0], outer[1]); c.quadraticCurveTo(x, Math.min(y0, y1) - 4, inner[0], inner[1]); c.stroke();
  }
}
function nose(c: G, l: Look): void {
  c.beginPath(); c.moveTo(CX - 2, CY + 14); c.quadraticCurveTo(CX - 8, CY + 26, CX - 1, CY + 28); c.quadraticCurveTo(CX + 5, CY + 29, CX + 8, CY + 25);
  c.lineWidth = 3; c.strokeStyle = shade(l.skin, -0.5); c.stroke();
  c.beginPath(); c.ellipse(CX - 4, CY + 20, 3, 2, 0, 0, 7); c.fillStyle = rgba('#FFFFFF', 0.28); c.fill();
}
function mouth(c: G, l: Look): void {
  const y = CY + 44;
  c.lineWidth = 3.4; c.strokeStyle = OUTLINE;
  const open = (w: number, h: number, tongue = false) => {
    c.beginPath(); c.moveTo(CX - w, y - 4); c.quadraticCurveTo(CX, y - 2, CX + w, y - 4); c.quadraticCurveTo(CX + w - 4, y + h, CX, y + h); c.quadraticCurveTo(CX - w + 4, y + h, CX - w, y - 4); c.closePath(); fp(c, '#8A2F3A', 3);
    c.save(); c.clip(); c.fillStyle = '#FFFFFF'; c.fillRect(CX - w, y - 6, w * 2, 8);
    if (tongue) { c.beginPath(); c.ellipse(CX + 4, y + h - 2, 12, 8, 0, 0, 7); c.fillStyle = '#FF7A93'; c.fill(); }
    c.restore();
  };
  switch (l.mood) {
    case 'grin': open(24, 20); break;
    case 'tongue': open(22, 18, true); break;
    case 'wink': open(20, 15); break;
    case 'smile': c.beginPath(); c.moveTo(CX - 20, y - 2); c.quadraticCurveTo(CX, y + 16, CX + 20, y - 2); c.stroke(); break;
    case 'smirk': c.beginPath(); c.moveTo(CX - 14, y + 2); c.quadraticCurveTo(CX + 4, y + 8, CX + 22, y - 8); c.stroke(); break;
    case 'calm': c.beginPath(); c.moveTo(CX - 16, y); c.quadraticCurveTo(CX, y + 9, CX + 16, y); c.stroke(); break;
    case 'shy': c.beginPath(); c.moveTo(CX - 10, y + 2); c.quadraticCurveTo(CX, y + 5, CX + 10, y + 2); c.stroke(); break;
    case 'proud': c.beginPath(); c.moveTo(CX - 22, y - 4); c.quadraticCurveTo(CX, y + 14, CX + 22, y - 4); c.stroke(); c.beginPath(); c.moveTo(CX - 22, y - 4); c.lineTo(CX - 25, y - 8); c.moveTo(CX + 22, y - 4); c.lineTo(CX + 25, y - 8); c.stroke(); break;
    case 'surprised': c.beginPath(); c.ellipse(CX, y + 4, 8, 10, 0, 0, 7); fp(c, '#8A2F3A', 3); break;
  }
}
function beard(c: G, l: Look, d: { rx: number; ry: number; sq: number }): void {
  const b = l.beard ?? 'none';
  if (b === 'none') return;
  const col = l.hairColor;
  if (b === 'stubble') {
    c.save(); facePath(c, d.rx, d.ry, d.sq); c.clip();
    c.beginPath(); c.moveTo(CX - d.rx - 4, CY + 12); c.quadraticCurveTo(CX, CY + 36, CX + d.rx + 4, CY + 12); c.lineTo(CX + d.rx + 4, CY + d.ry + 6); c.lineTo(CX - d.rx - 4, CY + d.ry + 6); c.closePath(); c.fillStyle = rgba(col, 0.3); c.fill();
    c.fillStyle = rgba(col, 0.55); for (let i = 0; i < 70; i++) { const px = CX - 46 + ((i * 53) % 92), py = CY + 34 + ((i * 29) % 30); if (Math.abs(px - CX) < 20 && py < CY + 52) continue; c.fillRect(px, py, 1.8, 1.8); }
    c.restore();
  } else if (b === 'full') {
    c.save(); facePath(c, d.rx, d.ry, d.sq, 1.5); c.clip();
    c.beginPath(); c.moveTo(CX - d.rx - 6, CY + 2); c.lineTo(CX - d.rx + 6, CY + 12); c.bezierCurveTo(CX - 36, CY + 34, CX - 26, CY + 30, CX - 20, CY + 36); c.quadraticCurveTo(CX, CY + 28, CX + 20, CY + 36); c.bezierCurveTo(CX + 26, CY + 30, CX + 36, CY + 34, CX + d.rx - 6, CY + 12); c.lineTo(CX + d.rx + 6, CY + 2); c.lineTo(CX + d.rx + 6, CY + d.ry + 10); c.lineTo(CX - d.rx - 6, CY + d.ry + 10); c.closePath(); c.fillStyle = col; c.fill();
    c.restore(); facePath(c, d.rx, d.ry, d.sq); c.lineWidth = 3.2; c.strokeStyle = OUTLINE; c.stroke();
    c.beginPath(); c.ellipse(CX, CY + 45, 22, 12, 0, 0, 7); c.fillStyle = shade(l.skin, -0.1); c.fill();
    gloss(c, CX - 26, CY + 52, 12, 4, 0.22, -0.3);
  } else if (b === 'goatee') {
    c.beginPath(); c.ellipse(CX, CY + d.ry - 12, 16, 13, 0, 0, 7); fp(c, col, 2.6);
  } else if (b === 'chin') {
    c.save(); facePath(c, d.rx, d.ry, d.sq); c.clip(); c.lineWidth = 11; c.strokeStyle = col; facePath(c, d.rx - 3, d.ry - 3, d.sq); c.beginPath(); c.moveTo(CX - d.rx + 4, CY + 26); c.bezierCurveTo(CX - d.rx + 8, CY + d.ry - 8, CX - 30, CY + d.ry - 2, CX, CY + d.ry - 2); c.bezierCurveTo(CX + 30, CY + d.ry - 2, CX + d.rx - 8, CY + d.ry - 8, CX + d.rx - 4, CY + 26); c.stroke(); c.restore();
  }
  if (b === 'mustache' || b === 'full' || b === 'goatee') {
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(CX, CY + 32); c.quadraticCurveTo(CX + s * 16, CY + 26, CX + s * 26, CY + 36); c.quadraticCurveTo(CX + s * 14, CY + 40, CX, CY + 36); c.closePath(); fp(c, col, 2.4); }
  }
}
function glasses(c: G, l: Look): void {
  const g = l.glasses ?? 'none';
  if (g === 'none') return;
  const dx = 25, y = CY + 6;
  if (g === 'sunHead') {
    c.beginPath(); c.roundRect?.(CX - 44, CY - 62, 88, 22, 10); c.fillStyle = '#272731'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUTLINE; c.stroke();
    c.fillStyle = rgba('#FFFFFF', 0.25); c.fillRect(CX - 36, CY - 58, 22, 4); c.fillRect(CX + 8, CY - 58, 22, 4);
    return;
  }
  const rim = g === 'sun' ? '#1E1E26' : g === 'square' ? '#2B2B33' : '#7A4A2B';
  c.lineWidth = g === 'sun' ? 4.2 : 3.4; c.strokeStyle = rim;
  for (const s of [-1, 1]) {
    const x = CX + s * dx;
    c.beginPath();
    if (g === 'round') c.ellipse(x, y, 15.5, 15.5, 0, 0, 7); else c.roundRect?.(x - 17, y - 13, 34, 27, g === 'sun' ? 8 : 5);
    c.fillStyle = g === 'sun' ? 'rgba(25,25,35,.92)' : 'rgba(255,255,255,.16)'; c.fill(); c.stroke();
    if (g === 'sun') { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(x - 12, y - 8); c.lineTo(x - 2, y - 8); c.lineTo(x - 10, y + 2); c.closePath(); c.fill(); }
  }
  c.beginPath(); c.moveTo(CX - 10, y - 2); c.quadraticCurveTo(CX, y - 7, CX + 10, y - 2); c.stroke();
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(CX + s * 42, y - 4); c.lineTo(CX + s * (58), y - 6); c.stroke(); }
}

// ------------------------------------------------------------------ accessoires

function accessory(c: G, l: Look, d: { rx: number; ry: number }): void {
  const a = l.acc ?? 'none', col = l.accColor ?? '#E8484F';
  const top = CY - d.ry;
  switch (a) {
    case 'cap':
      c.beginPath(); c.moveTo(CX - d.rx - 4, CY - 14); c.bezierCurveTo(CX - d.rx - 8, top - 34, CX + d.rx + 8, top - 34, CX + d.rx + 4, CY - 14); c.closePath(); fp(c, col, 3.2);
      c.beginPath(); c.ellipse(CX, CY - 18, d.rx + 12, 10, 0, 0, Math.PI); fp(c, shade(col, -0.2), 3); circ2(c, CX, top - 26, 4, shade(col, -0.2)); gloss(c, CX - 22, top - 8, 14, 5, 0.4, -0.5);
      break;
    case 'beanie':
      c.beginPath(); c.moveTo(CX - d.rx - 3, CY - 18); c.bezierCurveTo(CX - d.rx - 6, top - 32, CX + d.rx + 6, top - 32, CX + d.rx + 3, CY - 18); c.closePath(); fp(c, col, 3.2);
      rectR(c, CX - d.rx - 5, CY - 26, d.rx * 2 + 10, 16, shade(col, -0.15), 3, 7); circ2(c, CX, top - 22, 9, shade(col, 0.15));
      break;
    case 'strawhat':
      c.beginPath(); c.ellipse(CX, CY - 32, 96, 17, 0, 0, 7); fp(c, '#E5C97A', 3.2);
      c.beginPath(); c.moveTo(CX - 52, CY - 36); c.bezierCurveTo(CX - 52, top - 40, CX + 52, top - 40, CX + 52, CY - 36); c.closePath(); fp(c, '#EAD08A', 3.2); rectR(c, CX - 52, CY - 50, 104, 14, '#C0392B', 2.6, 3);
      break;
    case 'beret':
      c.beginPath(); c.ellipse(CX - 4, top + 4, d.rx + 8, 22, -0.12, 0, 7); fp(c, col, 3.2); rectR(c, CX - 3, top - 24, 6, 12, shade(col, -0.3), 2, 2);
      break;
    case 'chefhat':
      for (const [x, y, r] of [[-26, -34, 22], [0, -52, 26], [26, -34, 22]] as number[][]) { c.beginPath(); c.arc(CX + x, top + y + 12, r, 0, 7); fp(c, '#FFFFFF', 3); }
      rectR(c, CX - 44, CY - 62, 88, 28, '#FFFFFF', 3, 8);
      break;
    case 'bandana':
      c.beginPath(); c.moveTo(CX - d.rx - 3, CY - 24); c.quadraticCurveTo(CX, CY - 40, CX + d.rx + 3, CY - 24); c.lineTo(CX + d.rx + 3, CY - 8); c.quadraticCurveTo(CX, CY - 22, CX - d.rx - 3, CY - 8); c.closePath(); fp(c, col, 3.2);
      c.fillStyle = rgba('#FFFFFF', 0.7); for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(CX - 40 + i * 20, CY - 22 + (i % 2) * 2, 2.4, 0, 7); c.fill(); }
      c.beginPath(); c.moveTo(CX + d.rx + 2, CY - 20); c.lineTo(CX + d.rx + 22, CY - 30); c.lineTo(CX + d.rx + 20, CY - 6); c.closePath(); fp(c, col, 2.8);
      break;
    case 'headphones': case 'headset':
      c.beginPath(); c.arc(CX, CY - 2, d.rx + 10, Math.PI * 1.04, Math.PI * 1.96); c.lineWidth = 9; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#5A5AE0'; c.stroke();
      for (const s of [-1, 1]) rectR(c, CX + s * (d.rx + 10) - 10, CY - 14, 20, 40, '#3A3A8C', 3, 8);
      if (a === 'headset') { c.beginPath(); c.moveTo(CX - d.rx - 10, CY + 24); c.quadraticCurveTo(CX - d.rx - 6, CY + 58, CX - 18, CY + 56); c.lineWidth = 4; c.strokeStyle = OUTLINE; c.stroke(); circ2(c, CX - 16, CY + 56, 6, '#2B2B33'); }
      break;
    case 'earbud':
      circ2(c, CX + d.rx + 1, CY + 14, 5.5, '#FFFFFF'); c.beginPath(); c.moveTo(CX + d.rx + 3, CY + 20); c.quadraticCurveTo(CX + d.rx + 14, CY + 60, CX + 40, CY + 96); c.lineWidth = 2.4; c.strokeStyle = '#EEE'; c.stroke();
      break;
    case 'tie':
      c.beginPath(); c.moveTo(142, 252); c.lineTo(158, 252); c.lineTo(154, 268); c.lineTo(146, 268); c.closePath(); fp(c, col, 2.6);
      c.beginPath(); c.moveTo(146, 268); c.lineTo(154, 268); c.lineTo(164, 336); c.lineTo(150, 352); c.lineTo(136, 336); c.closePath(); fp(c, col, 2.8);
      break;
    case 'bowtie':
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(150, 258); c.lineTo(150 + s * 28, 244); c.lineTo(150 + s * 28, 272); c.closePath(); fp(c, col, 2.6); } circ2(c, 150, 258, 5.5, shade(col, -0.2));
      break;
    case 'scarf':
      c.beginPath(); c.ellipse(150, 244, 52, 20, 0, 0, 7); fp(c, col, 3.2); c.beginPath(); c.moveTo(160, 250); c.lineTo(194, 262); c.lineTo(190, 330); c.lineTo(160, 322); c.closePath(); fp(c, col, 3);
      c.strokeStyle = rgba('#FFFFFF', 0.3); c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(166, 276 + i * 14); c.lineTo(188, 282 + i * 14); c.stroke(); }
      break;
    case 'medal':
      c.beginPath(); c.moveTo(132, 252); c.lineTo(150, 300); c.lineTo(168, 252); c.lineWidth = 6; c.strokeStyle = '#C0392B'; c.stroke(); circ2(c, 150, 306, 14, '#F3C86B'); c.fillStyle = OUTLINE; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('1', 150, 311);
      break;
    case 'towel':
      c.beginPath(); c.moveTo(210, 252); c.lineTo(262, 276); c.lineTo(250, 340); c.lineTo(214, 322); c.closePath(); fp(c, '#FFFFFF', 3); c.fillStyle = '#7FB6E0'; c.fillRect(214, 296, 40, 8);
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) { const ang = (i / 5) * Math.PI * 2; c.beginPath(); c.ellipse(CX + d.rx + 2 + Math.cos(ang) * 9, CY - 20 + Math.sin(ang) * 9, 8, 6, ang, 0, 7); fp(c, col, 2.2); } circ2(c, CX + d.rx + 2, CY - 20, 5, '#FFE680');
      break;
  }
}

// ------------------------------------------------------------------ assemblage

/** Dessine le portrait complet d'un profil dans un contexte 300×400. */
export function drawPortrait(c: G, l: Look): void {
  const d = faceDims(l);
  c.lineJoin = 'round'; c.lineCap = 'round';
  drawBg(c, l.bg, l.bgc[0], l.bgc[1], l.prop);
  // le personnage est agrandi (tête plus lisible), ancré vers le bas
  c.save(); c.translate(150, 330); c.scale(ZOOM, ZOOM); c.translate(-150, -330);
  hairBack(c, l, d);
  torso(c, l);
  // oreilles
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(CX + s * (d.rx + 1), CY + 12, 9, 13, 0, 0, 7); fp(c, shade(l.skin, -0.04), 3); c.beginPath(); c.ellipse(CX + s * (d.rx + 1), CY + 13, 4, 7, 0, 0, 7); c.fillStyle = rgba(shade(l.skin, -0.35).startsWith('rgb') ? '#000000' : '#000000', 0.1); c.fill(); }
  // visage
  facePath(c, d.rx, d.ry, d.sq); fp(c, l.skin, 3.4);
  const g = c.createRadialGradient(CX - 20, CY - 26, 6, CX, CY, d.ry + 10); g.addColorStop(0, rgba('#FFFFFF', 0.22)); g.addColorStop(0.6, rgba('#FFFFFF', 0)); g.addColorStop(1, rgba('#000000', 0.12));
  facePath(c, d.rx, d.ry, d.sq); c.fillStyle = g; c.fill();
  // joues
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(CX + s * 38, CY + 30, 11, 7, 0, 0, 7); c.fillStyle = l.mood === 'shy' ? 'rgba(255,90,120,.4)' : 'rgba(255,110,130,.22)'; c.fill(); }
  beard(c, l, d);
  nose(c, l);
  mouth(c, l);
  eyes(c, l);
  hairFront(c, l, d);
  glasses(c, l);
  accessory(c, l, d);
  c.restore();
  if (l.prop) drawProp(c, l.prop);
}

// ------------------------------------------------------------------ canvases

const SCALE = 1.7;
const cache = new Map<string, HTMLCanvasElement>();

/** Portrait complet (480×640 environ), mis en cache. */
export function portraitCanvasOf(pid: string): HTMLCanvasElement | null {
  const p = profileById(pid);
  if (!p) return null;
  let cv = cache.get(pid);
  if (!cv) {
    cv = makeCanvas(W * SCALE, H * SCALE);
    const c = cv.getContext('2d')!;
    c.scale(SCALE, SCALE);
    drawPortrait(c, p.look);
    cache.set(pid, cv);
  }
  return cv;
}
/** URL d'image du portrait (pour les <img> de l'interface). */
export const portraitUrl = (pid: string): string => canvasUrl(`sw:p:${pid}`, () => portraitCanvasOf(pid) ?? makeCanvas(2, 2));
/** Pastille ronde (visage) pour la liste des messages et le chat. */
export function avatarUrl(pid: string, size = 96): string {
  return canvasUrl(`sw:a:${pid}:${size}`, () => {
    const out = makeCanvas(size, size); const c = out.getContext('2d')!;
    const src = portraitCanvasOf(pid);
    if (!src) return out;
    c.beginPath(); c.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); c.clip();
    const sx = 52 * SCALE, sy = 26 * SCALE, sw = 196 * SCALE;
    c.drawImage(src, sx, sy, sw, sw, 0, 0, size, size);
    return out;
  });
}
