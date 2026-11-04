/**
 * Décors des pièces du château (mur, sol en perspective douce, fenêtre et
 * rideaux, détails propres à chaque pièce) + carte illustrée du château.
 * Calque statique mis en cache (canvas hors écran) ; seules les parties
 * animées (nuages, rideaux, lumières, papillons…) sont redessinées.
 */
import { ROOM_IDS, colorOf, PALETTE, type RoomId } from '../../../data/world/ids';
import { ROOMS } from '../../../data/world/rooms';
import { OUTLINE, PAL, ellipse, fillShaded, glow, heartPath, makeCanvas, roundRect, seeded, shade as kitShade, sparkle, starPath } from '../kit';

type C = CanvasRenderingContext2D;

/** `shade` du kit renvoie « rgb(...) » : on convertit en hex pour pouvoir l'enchaîner (et le passer à fillShaded). */
function toHex(c: string): string {
  if (c.startsWith('#')) return c.length === 4 ? '#' + c.slice(1).split('').map((x) => x + x).join('') : c;
  const m = c.match(/\d+/g);
  if (!m) return '#FF00FF';
  return '#' + m.slice(0, 3).map((v) => Math.max(0, Math.min(255, +v)).toString(16).padStart(2, '0')).join('');
}
const shade = (c: string, a: number): string => toHex(kitShade(toHex(c), a));
export interface Rect { x: number; y: number; w: number; h: number }
export interface RoomStyle { wall: string; floor: string; curtain: string }

const hex = (v: string): string => (v.startsWith('#') ? v : colorOf(v));
const isPaletteHex = (v: string): boolean => !v.startsWith('#') || PALETTE.some((p) => p.color.toLowerCase() === v.toLowerCase());
const lw = 2;

// ------------------------------------------------------------------ mise en page

export interface RoomLayout {
  grid: Rect; cell: number; floorTop: number; win: Rect; curtainL: Rect; curtainR: Rect; valance: Rect; garland: Rect;
}

export function roomLayout(room: RoomId, w: number, h: number): RoomLayout {
  const g = ROOMS[room];
  const cell = Math.min((w * 0.94) / g.cols, (h * 0.64) / g.rows);
  const gw = cell * g.cols;
  const gh = cell * g.rows;
  const grid = { x: (w - gw) / 2, y: h - gh - h * 0.025, w: gw, h: gh };
  const floorTop = Math.max(h * 0.18, grid.y - cell * 0.85);
  // fenêtre plus étroite et haut placée : il reste de la place sur le mur pour les tableaux, miroirs et étagères
  const ww = Math.min(w * 0.3, floorTop * 0.8);
  const wh = Math.min(floorTop * 0.55, ww * 1.2);
  const win = { x: (w - ww) / 2, y: Math.max(26, floorTop * 0.14), w: ww, h: wh };
  const cw = ww * 0.36;
  return {
    grid, cell, floorTop, win,
    curtainL: { x: win.x - cw * 0.55, y: win.y - 8, w: cw * 1.1, h: wh + 22 },
    curtainR: { x: win.x + ww - cw * 0.55, y: win.y - 8, w: cw * 1.1, h: wh + 22 },
    valance: { x: win.x - cw * 0.7, y: win.y - 14, w: ww + cw * 1.4, h: 16 },
    garland: { x: 0, y: 0, w, h: Math.max(26, floorTop * 0.17) },
  };
}

/** Zone où se place la grille de meubles. */
export function roomFloorRect(room: RoomId, w: number, h: number): Rect { return roomLayout(room, w, h).grid; }

/** Quelle zone colorable se trouve en (x, y) ? (mur, sol, rideau) */
export function roomZoneAt(room: RoomId, w: number, h: number, x: number, y: number): 'wall' | 'floor' | 'curtain' {
  const L = roomLayout(room, w, h);
  const inR = (r: Rect) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  if (room === 'garden') return inR(L.garland) ? 'curtain' : y < L.floorTop ? 'wall' : 'floor';
  if (inR(L.curtainL) || inR(L.curtainR) || inR(L.valance)) return 'curtain';
  return y < L.floorTop ? 'wall' : 'floor';
}

// ------------------------------------------------------------------ outils

function rrect(c: C, r: Rect, rad: number, col: string, line = lw): void {
  roundRect(c, r.x, r.y, r.w, r.h, rad);
  fillShaded(c, col, r, line);
}
function heartAt(c: C, x: number, y: number, s: number, col: string): void {
  heartPath(c, x, y, s);
  fillShaded(c, col, { x: x - s / 2, y: y - s / 2, w: s, h: s }, 1.2);
}

type FloorKind = 'planks' | 'checker' | 'pavers' | 'herring';
const FLOOR_KIND: Record<RoomId, FloorKind> = { bedroom: 'planks', salon: 'herring', dressing: 'checker', reception: 'checker', garden: 'pavers', familySalon: 'planks', kid1: 'planks', kid2: 'planks', kid3: 'planks' };
const SKY: Record<RoomId, [string, string]> = {
  bedroom: ['#9A86D6', '#FFC9B8'], salon: ['#8FCBF2', '#FFF1DE'], dressing: ['#B9A5E8', '#FFE1EC'], reception: ['#51446D', '#B58CC8'],
  garden: ['#8FCBF2', '#FFF4E8'], familySalon: ['#9AD3F5', '#FFE9D6'], kid1: ['#8FCBF2', '#FFF1DE'], kid2: ['#A9A0E8', '#FFD6E6'], kid3: ['#8FCBF2', '#E6F5D0'],
};

// ------------------------------------------------------------------ calque statique

function drawFloor(c: C, room: RoomId, w: number, h: number, L: RoomLayout, col: string): void {
  const top = L.floorTop;
  const g = c.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, shade(col, -0.14)); g.addColorStop(0.35, col); g.addColorStop(1, shade(col, 0.1));
  c.fillStyle = g; c.fillRect(0, top, w, h - top);
  c.save();
  c.beginPath(); c.rect(0, top, w, h - top); c.clip();
  const kind = FLOOR_KIND[room];
  const line = shade(col, -0.28);
  c.strokeStyle = line; c.lineWidth = 1; c.globalAlpha = 0.5;
  const cx = w / 2;
  const sc = (v: number) => 0.62 + 0.55 * v; // largeur relative à la profondeur
  const X = (u: number, v: number) => cx + (u - 0.5) * w * sc(v);
  const Y = (v: number) => top + (h - top) * v;
  const depth = (i: number, n: number) => Math.pow(i / n, 1.35);
  if (kind === 'planks' || kind === 'herring') {
    const n = kind === 'planks' ? 9 : 12;
    for (let i = -n; i <= 2 * n; i++) { const u = i / n; c.beginPath(); c.moveTo(X(u, 0), Y(0)); c.lineTo(X(u, 1), Y(1)); c.stroke(); }
    const rows = 7;
    for (let r = 1; r < rows; r++) {
      const v = depth(r, rows);
      c.beginPath(); c.moveTo(0, Y(v)); c.lineTo(w, Y(v)); c.stroke();
      // joints décalés
      for (let i = -n; i < 2 * n; i += 2) {
        const u = (i + (r % 2)) / n + 0.5 / n; const v2 = depth(r + 1, rows);
        c.beginPath(); c.moveTo(X(u, v), Y(v)); c.lineTo(X(u, v), Y(Math.min(1, v2))); c.stroke();
      }
    }
  } else if (kind === 'checker') {
    const n = 8; const rows = 6;
    c.globalAlpha = 1;
    for (let r = 0; r < rows; r++) for (let i = -n; i < 2 * n; i++) {
      if ((i + r) % 2) continue;
      const v0 = depth(r, rows); const v1 = depth(r + 1, rows); const u0 = i / n; const u1 = (i + 1) / n;
      c.beginPath(); c.moveTo(X(u0, v0), Y(v0)); c.lineTo(X(u1, v0), Y(v0)); c.lineTo(X(u1, v1), Y(v1)); c.lineTo(X(u0, v1), Y(v1)); c.closePath();
      c.fillStyle = 'rgba(255,255,255,0.28)'; c.fill();
    }
    c.globalAlpha = 0.4;
    for (let i = -n; i <= 2 * n; i++) { c.beginPath(); c.moveTo(X(i / n, 0), Y(0)); c.lineTo(X(i / n, 1), Y(1)); c.stroke(); }
    for (let r = 1; r < rows; r++) { c.beginPath(); c.moveTo(0, Y(depth(r, rows))); c.lineTo(w, Y(depth(r, rows))); c.stroke(); }
  } else {
    const n = 7; const rows = 6;
    c.globalAlpha = 0.55;
    for (let r = 0; r < rows; r++) for (let i = -n; i < 2 * n; i++) {
      const v0 = depth(r, rows); const v1 = depth(r + 1, rows); const off = r % 2 ? 0.5 : 0; const u0 = (i + off) / n; const u1 = (i + off + 1) / n;
      c.beginPath(); c.moveTo(X(u0, v0) + 1, Y(v0) + 1); c.lineTo(X(u1, v0) - 1, Y(v0) + 1); c.lineTo(X(u1, v1) - 1, Y(v1) - 1); c.lineTo(X(u0, v1) + 1, Y(v1) - 1); c.closePath();
      c.fillStyle = ((i + r) % 3 === 0) ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'; c.fill();
      c.stroke();
    }
  }
  c.restore();
  // ombre sous le mur
  const sh = c.createLinearGradient(0, top, 0, top + 26);
  sh.addColorStop(0, 'rgba(81,68,109,0.22)'); sh.addColorStop(1, 'rgba(81,68,109,0)');
  c.fillStyle = sh; c.fillRect(0, top, w, 26);
}

function drawWallBase(c: C, room: RoomId, w: number, L: RoomLayout, col: string): void {
  const top = L.floorTop;
  const g = c.createLinearGradient(0, 0, 0, top);
  g.addColorStop(0, shade(col, 0.1)); g.addColorStop(1, shade(col, -0.06));
  c.fillStyle = g; c.fillRect(0, 0, w, top);
  c.save(); c.beginPath(); c.rect(0, 0, w, top); c.clip();
  const r = seeded(room.length * 977 + 13);
  switch (room) {
    case 'bedroom': // rayures douces + petits cœurs
      c.fillStyle = 'rgba(255,255,255,0.18)';
      for (let x = 0; x < w; x += 34) c.fillRect(x, 0, 17, top);
      for (let i = 0; i < 14; i++) heartAt(c, r() * w, r() * top * 0.85, 6, 'rgba(255,255,255,0.55)');
      break;
    case 'salon': case 'reception': case 'familySalon': { // boiseries
      const wain = top * 0.3;
      c.fillStyle = shade(col, 0.2); c.fillRect(0, top - wain, w, wain);
      c.strokeStyle = shade(col, -0.25); c.lineWidth = 1.5;
      for (let x = 10; x < w - 30; x += 64) { c.strokeRect(x, top - wain + 8, 52, wain - 16); }
      c.fillStyle = shade(col, 0.35); c.fillRect(0, top - wain - 4, w, 5);
      c.strokeStyle = shade(col, -0.3); c.lineWidth = 1; c.strokeRect(-2, top - wain - 4, w + 4, 5);
      if (room !== 'familySalon') { c.fillStyle = shade(col, 0.28); c.fillRect(0, 0, w, 9); c.fillStyle = PAL.or; c.fillRect(0, 9, w, 2); }
      else for (let i = 0; i < 26; i++) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(r() * w, r() * (top - wain), 3, 0, 7); c.fill(); }
      break;
    }
    case 'dressing':
      c.fillStyle = 'rgba(255,255,255,0.22)';
      for (let i = 0; i < 12; i++) { const x = 20 + r() * (w - 40); starPath(c, x, 20 + r() * top * 0.75, 6, 2.6, 5); c.fill(); }
      break;
    case 'kid1': // nuages et étoiles
      for (let i = 0; i < 5; i++) { const x = r() * w; const y = 14 + r() * top * 0.6; c.fillStyle = 'rgba(255,255,255,0.55)'; for (const [dx, dy, rr] of [[0, 0, 11], [11, 3, 9], [-11, 3, 8]] as const) { c.beginPath(); c.arc(x + dx, y + dy, rr, 0, 7); c.fill(); } }
      for (let i = 0; i < 10; i++) { starPath(c, r() * w, r() * top * 0.8, 6, 2.5, 5); c.fillStyle = 'rgba(255,230,160,0.9)'; c.fill(); }
      break;
    case 'kid2': // rayures larges + pois
      c.fillStyle = 'rgba(255,255,255,0.2)';
      for (let x = 0; x < w; x += 56) c.fillRect(x, 0, 28, top);
      for (let i = 0; i < 18; i++) { c.beginPath(); c.arc(r() * w, r() * top, 2.5, 0, 7); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fill(); }
      break;
    case 'kid3': // feuillage stylisé
      for (let i = 0; i < 16; i++) {
        const x = r() * w; const y = r() * top * 0.9; c.save(); c.translate(x, y); c.rotate(r() * 6.28);
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(7, -5, 14, 0); c.quadraticCurveTo(7, 5, 0, 0); c.fillStyle = 'rgba(255,255,255,0.38)'; c.fill(); c.restore();
      }
      break;
    case 'garden': { // haie festonnée + treillage
      const tg = c.createLinearGradient(0, 0, 0, top);
      tg.addColorStop(0, '#A9DCF5'); tg.addColorStop(0.7, '#FFF1DE'); tg.addColorStop(1, '#FFE9D6');
      c.fillStyle = tg; c.fillRect(0, 0, w, top);
      c.fillStyle = '#C9E8B8';
      c.beginPath(); c.moveTo(0, top * 0.62); c.quadraticCurveTo(w * 0.25, top * 0.42, w * 0.5, top * 0.6); c.quadraticCurveTo(w * 0.78, top * 0.75, w, top * 0.5); c.lineTo(w, top); c.lineTo(0, top); c.fill();
      const hy = top * 0.62;
      c.fillStyle = col; c.strokeStyle = OUTLINE; c.lineWidth = lw;
      c.beginPath(); c.moveTo(-4, top);
      for (let x = -4; x <= w + 18; x += 26) { c.quadraticCurveTo(x + 6, hy - 14, x + 13, hy); c.quadraticCurveTo(x + 20, hy - 10, x + 26, hy + 2); }
      c.lineTo(w + 4, top); c.closePath();
      const hg = c.createLinearGradient(0, hy, 0, top); hg.addColorStop(0, shade(col, 0.15)); hg.addColorStop(1, shade(col, -0.2));
      c.fillStyle = hg; c.fill(); c.stroke();
      for (let i = 0; i < 26; i++) { const fx = r() * w; const fy = hy + 6 + r() * (top - hy - 12); c.fillStyle = [PAL.roseVif, '#fff', PAL.lavande, PAL.or][i % 4]; c.beginPath(); c.arc(fx, fy, 2.4, 0, 7); c.fill(); }
      break;
    }
  }
  c.restore();
}

function drawWindow(c: C, room: RoomId, L: RoomLayout, frame: string): void {
  const { win } = L;
  const [s0, s1] = SKY[room];
  c.save();
  c.beginPath(); c.moveTo(win.x, win.y + win.h); c.lineTo(win.x, win.y + win.w / 2); c.arc(win.x + win.w / 2, win.y + win.w / 2, win.w / 2, Math.PI, 0); c.lineTo(win.x + win.w, win.y + win.h); c.closePath();
  const g = c.createLinearGradient(0, win.y, 0, win.y + win.h);
  g.addColorStop(0, s0); g.addColorStop(1, s1);
  c.fillStyle = g; c.fill();
  c.restore();
  // ciel statique : étoiles ou collines
  c.save(); c.clip();
  c.beginPath(); c.moveTo(win.x, win.y + win.h); c.lineTo(win.x, win.y + win.w / 2); c.arc(win.x + win.w / 2, win.y + win.w / 2, win.w / 2, Math.PI, 0); c.lineTo(win.x + win.w, win.y + win.h); c.closePath(); c.clip();
  c.fillStyle = shade('#8FCB9A', room === 'bedroom' || room === 'reception' ? -0.35 : 0);
  c.beginPath(); c.moveTo(win.x, win.y + win.h); c.quadraticCurveTo(win.x + win.w * 0.3, win.y + win.h * 0.7, win.x + win.w * 0.6, win.y + win.h * 0.88); c.quadraticCurveTo(win.x + win.w * 0.85, win.y + win.h * 0.8, win.x + win.w, win.y + win.h * 0.84); c.lineTo(win.x + win.w, win.y + win.h); c.fill();
  if (room === 'bedroom' || room === 'reception') {
    const r = seeded(7);
    for (let i = 0; i < 9; i++) sparkle(c, win.x + r() * win.w, win.y + r() * win.h * 0.5, 2.4, '#fff', 0.9);
    c.fillStyle = '#FFF4C8'; c.beginPath(); c.arc(win.x + win.w * 0.74, win.y + win.h * 0.22, win.w * 0.09, 0, 7); c.fill();
  } else {
    c.fillStyle = '#FFE08A'; c.beginPath(); c.arc(win.x + win.w * 0.78, win.y + win.h * 0.2, win.w * 0.08, 0, 7); c.fill();
  }
  c.restore();
  // cadre
  c.beginPath(); c.moveTo(win.x, win.y + win.h); c.lineTo(win.x, win.y + win.w / 2); c.arc(win.x + win.w / 2, win.y + win.w / 2, win.w / 2, Math.PI, 0); c.lineTo(win.x + win.w, win.y + win.h);
  c.lineWidth = 6; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 3.2; c.strokeStyle = frame; c.stroke();
  c.beginPath(); c.moveTo(win.x + win.w / 2, win.y); c.lineTo(win.x + win.w / 2, win.y + win.h); c.moveTo(win.x, win.y + win.h * 0.5); c.lineTo(win.x + win.w, win.y + win.h * 0.5);
  c.lineWidth = 4; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 2; c.strokeStyle = frame; c.stroke();
  rrect(c, { x: win.x - 6, y: win.y + win.h, w: win.w + 12, h: 8 }, 3, frame);
}

function drawRoomDetails(c: C, room: RoomId, w: number, L: RoomLayout, wallCol: string): void {
  const top = L.floorTop;
  const sconce = (x: number, y: number) => { rrect(c, { x: x - 5, y, w: 10, h: 12 }, 3, PAL.or); glow(c, x, y - 4, 16, PAL.or, 0.45); c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x, y - 9); c.lineTo(x + 5, y); c.closePath(); fillShaded(c, PAL.ivory, { x: x - 5, y: y - 9, w: 10, h: 9 }, 1.4); };
  switch (room) {
    case 'bedroom': {
      // guirlande de cœurs
      c.beginPath(); c.moveTo(6, 12); c.quadraticCurveTo(w * 0.5, 54, w - 6, 12); c.lineWidth = 1.6; c.strokeStyle = OUTLINE; c.stroke();
      for (let i = 1; i < 9; i++) { const t = i / 9; const x = 6 + (w - 12) * t; const y = 12 + Math.sin(t * Math.PI) * 31; heartAt(c, x, y + 6, 11, [PAL.roseVif, '#fff', PAL.lavande][i % 3]); }
      break;
    }
    case 'salon': sconce(w * 0.1, top * 0.34); sconce(w * 0.9, top * 0.34); break;
    case 'familySalon': {
      for (let i = 0; i < 3; i++) { const x = w * (0.1 + i * 0.07); rrect(c, { x: x - 11, y: top * 0.18 + i * 9, w: 22, h: 26 }, 2, PAL.or, 1.6); heartAt(c, x, top * 0.18 + i * 9 + 13, 9, PAL.rose); }
      for (let i = 0; i < 3; i++) { const x = w * (0.78 + i * 0.07); rrect(c, { x: x - 11, y: top * 0.18 + (2 - i) * 9, w: 22, h: 26 }, 2, PAL.or, 1.6); starPath(c, x, top * 0.18 + (2 - i) * 9 + 13, 7, 3, 5); c.fillStyle = PAL.lavande; c.fill(); }
      break;
    }
    case 'dressing': {
      // tringle et cintres
      const y = top * 0.2;
      c.beginPath(); c.moveTo(8, y); c.lineTo(w * 0.2, y); c.lineWidth = 4; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 2; c.strokeStyle = PAL.or; c.stroke();
      ['#F5B5C8', '#B9A5E8', '#FFC0A3'].forEach((col, i) => { const x = 18 + i * 22; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 7, y + 30); c.lineTo(x + 7, y + 30); c.closePath(); fillShaded(c, col, { x: x - 7, y, w: 14, h: 30 }, 1.4); });
      rrect(c, { x: w * 0.8, y: top * 0.2, w: w * 0.15, h: 6 }, 2, PAL.or); rrect(c, { x: w * 0.8, y: top * 0.2 + 28, w: w * 0.15, h: 6 }, 2, PAL.or);
      for (let i = 0; i < 3; i++) { ellipse(c, w * (0.84 + i * 0.045), top * 0.2 - 4, 8, 5); fillShaded(c, ['#F5B5C8', '#fff', '#B9A5E8'][i], { x: 0, y: 0, w: 16, h: 10 }, 1.2); }
      break;
    }
    case 'reception': {
      // colonnes dorées + bannière
      for (const x of [w * 0.04, w * 0.96]) { rrect(c, { x: x - 11, y: 6, w: 22, h: top - 6 }, 5, shade(PAL.or, 0.3), 2); for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x - 5 + k * 3.4, 12); c.lineTo(x - 5 + k * 3.4, top - 6); c.strokeStyle = 'rgba(88,67,63,0.2)'; c.lineWidth = 1; c.stroke(); } }
      c.beginPath(); c.moveTo(w * 0.28, 8); c.lineTo(w * 0.72, 8); c.lineTo(w * 0.68, 26); c.lineTo(w * 0.5, 34); c.lineTo(w * 0.32, 26); c.closePath(); fillShaded(c, PAL.roseVif, { x: w * 0.28, y: 8, w: w * 0.44, h: 26 }, 1.8);
      starPath(c, w * 0.5, 19, 7, 3, 5); c.fillStyle = PAL.or; c.fill();
      break;
    }
    case 'kid1': { // mobile fixe (partie animée en dynamique)
      break;
    }
    case 'kid2': {
      for (let i = 0; i < 2; i++) { const x = w * (0.1 + i * 0.12); rrect(c, { x: x - 14, y: top * 0.15 + i * 10, w: 28, h: 38 }, 2, '#fff', 1.6); heartAt(c, x, top * 0.15 + i * 10 + 19, 14, i ? PAL.lavande : PAL.roseVif); }
      break;
    }
    case 'kid3': {
      rrect(c, { x: w * 0.78, y: top * 0.36, w: w * 0.18, h: 6 }, 2, '#C9946B');
      rrect(c, { x: w * 0.8, y: top * 0.36 - 18, w: 14, h: 18 }, 3, PAL.peche, 1.4); rrect(c, { x: w * 0.88, y: top * 0.36 - 14, w: 14, h: 14 }, 3, PAL.sky, 1.4);
      leafSprig(c, w * 0.1, top * 0.1);
      break;
    }
    case 'garden': {
      // poteaux de la guirlande
      for (const x of [6, w - 6]) { c.beginPath(); c.moveTo(x, 10); c.lineTo(x, top); c.lineWidth = 5; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 2.4; c.strokeStyle = '#C9946B'; c.stroke(); }
      // herbe devant la haie
      c.fillStyle = '#8FCB9A';
      c.beginPath(); c.moveTo(0, top); for (let x = 0; x <= w; x += 10) c.lineTo(x, top + 8 + ((x * 7) % 5)); c.lineTo(w, top); c.fill();
      break;
    }
  }
  void wallCol;
}
function leafSprig(c: C, x: number, y: number): void {
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 18, y + 24, x + 4, y + 52); c.lineWidth = 2; c.strokeStyle = PAL.leafDeep; c.stroke();
  for (let i = 0; i < 4; i++) { const yy = y + 8 + i * 11; c.save(); c.translate(x + (i % 2 ? 8 : 2), yy); c.rotate(i % 2 ? 0.5 : 2.6); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(7, -5, 14, 0); c.quadraticCurveTo(7, 5, 0, 0); fillShaded(c, PAL.leaf, { x: 0, y: -5, w: 14, h: 10 }, 1.2); c.restore(); }
}

function drawStatic(c: C, room: RoomId, w: number, h: number, wall: string, floor: string): void {
  const L = roomLayout(room, w, h);
  drawWallBase(c, room, w, L, wall);
  if (room !== 'garden') drawWindow(c, room, L, room === 'reception' ? PAL.or : PAL.ivory);
  drawFloor(c, room, w, h, L, floor);
  // plinthe
  const bb = room === 'garden' ? null : shade(wall, 0.3);
  if (bb) { c.fillStyle = bb; c.fillRect(0, L.floorTop - 7, w, 9); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, L.floorTop - 7, w, 2); c.fillStyle = OUTLINE; c.fillRect(0, L.floorTop + 2, w, 1.6); }
  drawRoomDetails(c, room, w, L, wall);
}

// cache des calques statiques
const staticCache = new Map<string, HTMLCanvasElement>();
function getStatic(room: RoomId, w: number, h: number, wall: string, floor: string, sc: number): HTMLCanvasElement | null {
  const cacheable = isPaletteHex(wall) && isPaletteHex(floor);
  const key = `${room}|${Math.round(w)}x${Math.round(h)}|${sc}|${wall}|${floor}`;
  const hit = staticCache.get(key);
  if (hit) return hit;
  const cv = makeCanvas(w * sc, h * sc);
  const c = cv.getContext('2d')!;
  c.scale(sc, sc); c.lineJoin = 'round'; c.lineCap = 'round';
  drawStatic(c, room, w, h, wall, floor);
  if (!cacheable) return cv;
  if (staticCache.size > 14) staticCache.delete(staticCache.keys().next().value as string);
  staticCache.set(key, cv);
  return cv;
}

// ------------------------------------------------------------------ calque animé

function drawCurtain(c: C, r: Rect, side: -1 | 1, col: string, t: number): void {
  const sway = Math.sin(t * 0.9 + (side > 0 ? 1.6 : 0)) * 2.2;
  const x0 = side < 0 ? r.x : r.x + r.w; // bord extérieur (accroché au mur)
  const inner = side < 0 ? r.x + r.w : r.x;
  c.beginPath();
  c.moveTo(x0, r.y);
  c.lineTo(inner, r.y);
  c.bezierCurveTo(inner + sway * 1.5, r.y + r.h * 0.35, inner - side * r.w * 0.1 + sway, r.y + r.h * 0.7, inner + side * -r.w * 0.05 + sway, r.y + r.h);
  c.lineTo(x0 - side * 3, r.y + r.h);
  c.closePath();
  const g = c.createLinearGradient(r.x, 0, r.x + r.w, 0);
  g.addColorStop(0, shade(col, side < 0 ? 0.2 : -0.1)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, side < 0 ? -0.12 : 0.2));
  c.fillStyle = g; c.fill(); c.lineWidth = 2; c.strokeStyle = OUTLINE; c.stroke();
  c.save(); c.clip();
  c.strokeStyle = shade(col, -0.22); c.lineWidth = 1;
  for (let k = 1; k < 4; k++) { const x = r.x + (r.w * k) / 4; c.beginPath(); c.moveTo(x, r.y); c.quadraticCurveTo(x + sway, r.y + r.h * 0.5, x + sway * 1.3, r.y + r.h); c.stroke(); }
  c.restore();
  // embrasse dorée
  const ey = r.y + r.h * 0.58;
  c.beginPath(); c.moveTo(Math.min(x0, inner), ey); c.lineTo(Math.max(x0, inner) , ey); c.lineWidth = 4; c.strokeStyle = OUTLINE; c.stroke(); c.lineWidth = 2; c.strokeStyle = PAL.or; c.stroke();
}

function drawDynamic(c: C, room: RoomId, w: number, h: number, curtain: string, t: number): void {
  const L = roomLayout(room, w, h);
  const { win } = L;
  if (room !== 'garden') {
    // nuages dans la fenêtre
    c.save();
    c.beginPath(); c.rect(win.x, win.y, win.w, win.h); c.clip();
    const night = room === 'bedroom' || room === 'reception';
    c.fillStyle = night ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 2; i++) {
      const x = win.x + ((t * 4 + i * win.w * 0.7) % (win.w + 40)) - 20; const y = win.y + win.h * (0.25 + i * 0.22);
      for (const [dx, dy, r] of [[0, 0, 7], [8, 2, 6], [-8, 2, 5]] as const) { c.beginPath(); c.arc(x + dx, y + dy, r, 0, 7); c.fill(); }
    }
    // rayons de lumière sur le sol (doux)
    c.restore();
    const a = 0.1 + 0.04 * Math.sin(t * 0.8);
    c.save(); c.globalAlpha = a; c.fillStyle = night ? '#CDBDF0' : '#FFF4C8';
    c.beginPath(); c.moveTo(win.x + 6, win.y + win.h + 8); c.lineTo(win.x + win.w - 6, win.y + win.h + 8); c.lineTo(win.x + win.w + w * 0.18, L.floorTop + (h - L.floorTop) * 0.5); c.lineTo(win.x - w * 0.12, L.floorTop + (h - L.floorTop) * 0.5); c.closePath(); c.fill();
    c.restore();
    // rideaux + cantonnière
    const col = hex(curtain);
    drawCurtain(c, L.curtainL, -1, col, t);
    drawCurtain(c, L.curtainR, 1, col, t);
    rrect(c, L.valance, 6, shade(col, 0.1));
    for (let i = 0; i < 6; i++) { const x = L.valance.x + (L.valance.w * (i + 0.5)) / 6; heartAt(c, x, L.valance.y + 8, 6, shade(col, 0.45)); }
  } else {
    // guirlande de fanions
    const col = hex(curtain);
    const g = L.garland;
    const n = 12;
    c.beginPath(); c.moveTo(6, 10); c.quadraticCurveTo(w / 2, g.h + 6 + Math.sin(t) * 2, w - 6, 10); c.lineWidth = 1.8; c.strokeStyle = OUTLINE; c.stroke();
    for (let i = 1; i < n; i++) {
      const u = i / n; const x = 6 + (w - 12) * u; const y = 10 + Math.sin(u * Math.PI) * (g.h - 4 + Math.sin(t) * 1.6);
      const sw = Math.sin(t * 1.6 + i) * 1.6;
      c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 8, y); c.lineTo(x + sw, y + 18); c.closePath();
      fillShaded(c, i % 2 ? col : shade(col, 0.4), { x: x - 8, y, w: 16, h: 18 }, 1.5);
    }
    // papillons
    for (let i = 0; i < 3; i++) {
      const bx = (w * (0.2 + i * 0.3) + Math.sin(t * 0.7 + i * 2) * 40 + w) % w; const by = L.floorTop * (0.5 + 0.12 * i) + Math.sin(t * 1.3 + i) * 10;
      const fl = Math.abs(Math.sin(t * 9 + i)) ;
      c.fillStyle = [PAL.roseVif, PAL.or, PAL.lavande][i];
      c.beginPath(); c.ellipse(bx - 3, by, 3.5 * (0.4 + fl * 0.6), 4.5, -0.4, 0, 7); c.ellipse(bx + 3, by, 3.5 * (0.4 + fl * 0.6), 4.5, 0.4, 0, 7); c.fill();
    }
  }
  // animations propres aux pièces
  if (room === 'kid1') { // mobile
    const mx = w * 0.82; const sw = Math.sin(t * 1.2) * 4;
    c.beginPath(); c.moveTo(mx, 0); c.lineTo(mx, 24); c.lineWidth = 1.6; c.strokeStyle = OUTLINE; c.stroke();
    c.beginPath(); c.moveTo(mx - 24 + sw, 24); c.lineTo(mx + 24 + sw, 24); c.lineWidth = 3; c.strokeStyle = PAL.or; c.stroke();
    for (const [dx, col, k] of [[-24, PAL.roseVif, 0], [0, PAL.lavande, 1], [24, PAL.peche, 2]] as const) { const x = mx + dx + sw; c.beginPath(); c.moveTo(x, 24); c.lineTo(x, 40); c.lineWidth = 1.2; c.strokeStyle = OUTLINE; c.stroke(); if (k === 1) { starPath(c, x, 46, 8, 3.6, 5); } else { heartPath(c, x, 46, 13); } fillShaded(c, col, { x: x - 7, y: 38, w: 14, h: 14 }, 1.4); }
  }
  if (room === 'kid2') { // guirlande lumineuse qui clignote
    c.beginPath(); c.moveTo(0, 10); c.quadraticCurveTo(w * 0.25, 40, w * 0.5, 14); c.quadraticCurveTo(w * 0.75, -6, w, 24); c.lineWidth = 1.4; c.strokeStyle = OUTLINE; c.stroke();
    for (let i = 0; i < 14; i++) { const u = i / 13; const x = u * w; const y = u < 0.5 ? 10 + Math.sin(u * 2 * Math.PI) * 18 + u * 8 : 14 + Math.sin((u - 0.5) * 2 * Math.PI) * -12 + (u - 0.5) * 20; const on = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.3); glow(c, x, y + 3, 10, [PAL.or, PAL.roseVif, '#fff'][i % 3], 0.25 + on * 0.5); c.beginPath(); c.arc(x, y + 3, 2.4, 0, 7); c.fillStyle = '#FFF3B0'; c.fill(); }
  }
  if (room === 'reception') { // lueur de lustre qui danse
    glow(c, w / 2, L.floorTop * 0.55, w * 0.45, PAL.or, 0.12 + 0.05 * Math.sin(t * 1.5));
    for (let i = 0; i < 6; i++) sparkle(c, ((i * 0.19 + 0.08) * w + Math.sin(t + i) * 8), L.floorTop * 0.7 + Math.sin(t * 1.4 + i * 2) * 22, 3, '#fff', 0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i)));
  }
  if (room === 'kid3') for (let i = 0; i < 2; i++) { // petite luciole
    const x = w * (0.3 + i * 0.4) + Math.sin(t * 0.8 + i) * 16; const y = L.floorTop * 0.5 + Math.cos(t * 1.1 + i * 3) * 10;
    glow(c, x, y, 8, '#FFF3B0', 0.6);
  }
  if (room === 'bedroom' || room === 'dressing' || room === 'salon') for (let i = 0; i < 5; i++) { // poussières dorées
    const x = (w * ((i * 0.23 + 0.1 + t * 0.01) % 1)); const y = L.floorTop * 0.3 + ((t * 8 + i * 37) % (h * 0.5));
    sparkle(c, x, y, 2, '#FFF3B0', 0.15 + 0.35 * Math.abs(Math.sin(t * 1.5 + i)));
  }
}

/** Dessine la pièce `room` (mur, sol, fenêtre, rideaux…) dans un canvas w×h (px CSS). `t` : temps en secondes. */
export function drawRoom(ctx: CanvasRenderingContext2D, room: RoomId, w: number, h: number, style: RoomStyle, t: number): void {
  const m = ctx.getTransform();
  // échelle du calque statique plafonnée (zoom de la caméra × densité) : iOS limite la taille des canvas
  const sc = Math.min(2.5, Math.max(1, Math.round(Math.hypot(m.a, m.b) * 2) / 2));
  const st = getStatic(room, w, h, hex(style.wall), hex(style.floor), sc);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (st) ctx.drawImage(st, 0, 0, w, h);
  drawDynamic(ctx, room, w, h, style.curtain, t);
  ctx.restore();
}

// ------------------------------------------------------------------ carte du château

export interface Hotspot { room: RoomId; x: number; y: number; w: number; h: number }
const HOT: Record<RoomId, [number, number, number, number]> = {
  bedroom: [0.355, 0.135, 0.29, 0.165],
  dressing: [0.07, 0.235, 0.2, 0.14],
  reception: [0.73, 0.235, 0.2, 0.14],
  salon: [0.15, 0.445, 0.3, 0.14],
  familySalon: [0.55, 0.445, 0.3, 0.14],
  kid1: [0.1, 0.635, 0.24, 0.105],
  kid2: [0.38, 0.635, 0.24, 0.105],
  kid3: [0.66, 0.635, 0.24, 0.105],
  garden: [0.12, 0.775, 0.76, 0.15],
};

/** Fenêtres cliquables de la carte du château (coordonnées en px du canvas w×h). */
export function castleHotspots(w: number, h: number): Hotspot[] {
  return ROOM_IDS.map((room) => { const [x, y, ww, hh] = HOT[room]; return { room, x: x * w, y: y * h, w: ww * w, h: hh * h }; });
}

function cone(c: C, cx: number, baseY: number, bw: number, hh: number, col: string): void {
  c.beginPath(); c.moveTo(cx - bw / 2, baseY); c.quadraticCurveTo(cx - bw * 0.22, baseY - hh * 0.55, cx, baseY - hh); c.quadraticCurveTo(cx + bw * 0.22, baseY - hh * 0.55, cx + bw / 2, baseY); c.closePath();
  fillShaded(c, col, { x: cx - bw / 2, y: baseY - hh, w: bw, h: hh }, 2.2);
  c.beginPath(); c.ellipse(cx, baseY, bw / 2 + 3, 5, 0, 0, 7); fillShaded(c, shade(col, 0.25), { x: cx - bw / 2, y: baseY - 5, w: bw, h: 10 }, 2);
}

function drawCastleStatic(c: C, w: number, h: number): void {
  // ciel
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#C9B8F0'); sky.addColorStop(0.45, '#F8CFE0'); sky.addColorStop(0.75, '#FFE9D6'); sky.addColorStop(1, '#FFF4E8');
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  const r = seeded(99);
  for (let i = 0; i < 16; i++) sparkle(c, r() * w, r() * h * 0.3, 2 + r() * 2, '#fff', 0.7);
  // collines lointaines
  c.fillStyle = '#C9E8B8';
  c.beginPath(); c.moveTo(0, h * 0.7); c.quadraticCurveTo(w * 0.25, h * 0.55, w * 0.5, h * 0.68); c.quadraticCurveTo(w * 0.8, h * 0.52, w, h * 0.66); c.lineTo(w, h); c.lineTo(0, h); c.fill();
  const body = '#FFF1E6'; const trim = '#F5B5C8';
  // tours
  const tower = (x: number, y: number, tw: number, th: number, roof: string, ch: number) => {
    roundRect(c, x, y, tw, th, 8); fillShaded(c, body, { x, y, w: tw, h: th }, 2.4);
    c.fillStyle = trim; c.fillRect(x + 2, y + th * 0.04, tw - 4, 7);
    cone(c, x + tw / 2, y + 2, tw + 14, ch, roof);
  };
  tower(w * 0.04, h * 0.2, w * 0.26, h * 0.3, '#F5B5C8', h * 0.14);
  tower(w * 0.7, h * 0.2, w * 0.26, h * 0.3, '#F5B5C8', h * 0.14);
  tower(w * 0.31, h * 0.1, w * 0.38, h * 0.38, '#B9A5E8', h * 0.075);
  // drapeaux
  for (const [fx, fy] of [[0.5, 0.012]] as const) { c.beginPath(); c.moveTo(w * fx, h * (fy + 0.008)); c.lineTo(w * fx, h * (fy + 0.05)); c.lineWidth = 2; c.strokeStyle = OUTLINE; c.stroke(); c.beginPath(); c.moveTo(w * fx, h * (fy + 0.008)); c.lineTo(w * (fx + 0.07), h * (fy + 0.02)); c.lineTo(w * fx, h * (fy + 0.032)); c.closePath(); fillShaded(c, PAL.roseVif, { x: w * fx, y: h * fy, w: w * 0.07, h: h * 0.03 }, 1.4); }
  // corps principal
  roundRect(c, w * 0.08, h * 0.42, w * 0.84, h * 0.34, 12); fillShaded(c, body, { x: w * 0.08, y: h * 0.42, w: w * 0.84, h: h * 0.34 }, 2.6);
  c.fillStyle = trim; c.fillRect(w * 0.1, h * 0.425, w * 0.8, 8);
  c.fillStyle = 'rgba(245,181,200,0.5)'; c.fillRect(w * 0.1, h * 0.605, w * 0.8, 5);
  // créneaux festonnés
  for (let i = 0; i < 10; i++) { c.beginPath(); c.arc(w * (0.12 + i * 0.084), h * 0.425, w * 0.035, Math.PI, 0); fillShaded(c, shade(trim, 0.15), { x: 0, y: 0, w: 1, h: 1 }, 1.6); }
  // porte
  c.beginPath(); c.moveTo(w * 0.455, h * 0.76); c.lineTo(w * 0.455, h * 0.68); c.arc(w * 0.5, h * 0.68, w * 0.045, Math.PI, 0); c.lineTo(w * 0.545, h * 0.76); c.closePath(); fillShaded(c, '#C9946B', { x: w * 0.455, y: h * 0.63, w: w * 0.09, h: h * 0.13 }, 2);
  c.beginPath(); c.arc(w * 0.53, h * 0.71, 1.8, 0, 7); c.fillStyle = PAL.or; c.fill();
  // fleurs grimpantes sur les murs
  for (let i = 0; i < 22; i++) { const x = r() * w; const y = h * (0.45 + r() * 0.3); if (x > w * 0.1 && x < w * 0.9) { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fillStyle = [PAL.roseVif, '#fff', PAL.lavande, PAL.or][i % 4]; c.fill(); } }
  // jardin
  const gg = c.createLinearGradient(0, h * 0.74, 0, h);
  gg.addColorStop(0, '#9BD3A6'); gg.addColorStop(1, '#6FB88A');
  c.fillStyle = gg;
  c.beginPath(); c.moveTo(0, h * 0.78); c.quadraticCurveTo(w * 0.5, h * 0.72, w, h * 0.78); c.lineTo(w, h); c.lineTo(0, h); c.fill();
  // chemin
  c.beginPath(); c.moveTo(w * 0.46, h * 0.76); c.quadraticCurveTo(w * 0.35, h * 0.88, w * 0.28, h); c.lineTo(w * 0.72, h); c.quadraticCurveTo(w * 0.65, h * 0.88, w * 0.54, h * 0.76); c.closePath(); c.fillStyle = '#F6DDC4'; c.fill();
  // buissons fleuris
  for (let i = 0; i < 9; i++) { const x = w * (0.04 + i * 0.115); const y = h * (0.93 + (i % 2) * 0.03); c.beginPath(); c.ellipse(x, y, w * 0.06, h * 0.025, 0, 0, 7); fillShaded(c, PAL.leaf, { x: x - 20, y: y - 10, w: 40, h: 20 }, 1.6); for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + (k - 1.5) * 8, y - 3 - (k % 2) * 4, 3, 0, 7); c.fillStyle = [PAL.roseVif, '#fff', PAL.peche, PAL.lavande][(i + k) % 4]; c.fill(); } }
}

const MOTIF: Record<RoomId, (c: C, x: number, y: number, s: number) => void> = {
  bedroom: (c, x, y, s) => heartAt(c, x, y, s, PAL.roseVif),
  salon: (c, x, y, s) => { c.beginPath(); c.roundRect(x - s * 0.9, y - s * 0.3, s * 1.8, s * 0.8, 4); fillShaded(c, PAL.lavande, { x: x - s, y: y - s * 0.3, w: s * 2, h: s * 0.8 }, 1.4); },
  dressing: (c, x, y, s) => { c.beginPath(); c.moveTo(x, y - s * 0.7); c.lineTo(x - s * 0.7, y + s * 0.6); c.lineTo(x + s * 0.7, y + s * 0.6); c.closePath(); fillShaded(c, PAL.rose, { x: x - s, y: y - s, w: s * 2, h: s * 2 }, 1.4); },
  reception: (c, x, y, s) => { starPath(c, x, y, s * 0.9, s * 0.4, 5); fillShaded(c, PAL.or, { x: x - s, y: y - s, w: s * 2, h: s * 2 }, 1.4); },
  garden: (c, x, y, s) => { for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; c.beginPath(); c.arc(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5, s * 0.35, 0, 7); c.fillStyle = PAL.roseVif; c.fill(); } c.beginPath(); c.arc(x, y, s * 0.28, 0, 7); c.fillStyle = PAL.or; c.fill(); },
  familySalon: (c, x, y, s) => { c.beginPath(); c.moveTo(x - s, y); c.lineTo(x, y - s * 0.8); c.lineTo(x + s, y); c.closePath(); fillShaded(c, PAL.peche, { x: x - s, y: y - s, w: s * 2, h: s * 2 }, 1.4); c.fillStyle = '#fff'; c.fillRect(x - s * 0.7, y, s * 1.4, s * 0.7); heartAt(c, x, y + s * 0.35, s * 0.6, PAL.roseVif); },
  kid1: (c, x, y, s) => { c.beginPath(); c.ellipse(x, y - s * 0.1, s * 0.6, s * 0.75, 0, 0, 7); fillShaded(c, PAL.roseVif, { x: x - s, y: y - s, w: s * 2, h: s * 2 }, 1.4); },
  kid2: (c, x, y, s) => { starPath(c, x, y, s * 0.9, s * 0.4, 5); fillShaded(c, PAL.lavande, { x: x - s, y: y - s, w: s * 2, h: s * 2 }, 1.4); },
  kid3: (c, x, y, s) => { c.beginPath(); c.moveTo(x - s * 0.8, y); c.quadraticCurveTo(x, y - s * 1.1, x + s * 0.8, y); c.quadraticCurveTo(x, y + s * 1.1, x - s * 0.8, y); fillShaded(c, PAL.leaf, { x: x - s, y: y - s, w: s * 2, h: s * 2 }, 1.4); },
};

const castleCache = new Map<string, HTMLCanvasElement>();
function drawWindows(c: C, w: number, h: number, unlocked: ReadonlySet<string>, t: number): void {
  for (const hs of castleHotspots(w, h)) {
    if (hs.room === 'garden') {
      if (!unlocked.has('garden')) { c.fillStyle = 'rgba(81,68,109,0.35)'; c.fillRect(0, h * 0.77, w, h * 0.23); }
      continue;
    }
    const open = unlocked.has(hs.room);
    const { x, y, w: ww, h: hh } = hs;
    const rh = Math.min(ww / 2, hh * 0.42);
    c.beginPath(); c.moveTo(x, y + hh); c.lineTo(x, y + rh); c.ellipse(x + ww / 2, y + rh, ww / 2, rh, 0, Math.PI, 0); c.lineTo(x + ww, y + hh); c.closePath();
    const g = c.createLinearGradient(0, y, 0, y + hh);
    if (open) { const p = 0.5 + 0.5 * Math.sin(t * 1.4 + x); g.addColorStop(0, shade('#FFE08A', 0.2 + p * 0.1)); g.addColorStop(1, '#FFC0A3'); } else { g.addColorStop(0, '#6A5C8A'); g.addColorStop(1, '#4B3F66'); }
    c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUTLINE; c.stroke();
    c.lineWidth = 1.6; c.strokeStyle = open ? shade(PAL.or, -0.1) : '#8F82B0'; c.beginPath(); c.moveTo(x + ww / 2, y + 2); c.lineTo(x + ww / 2, y + hh); c.moveTo(x + 2, y + hh * 0.55); c.lineTo(x + ww - 2, y + hh * 0.55); c.stroke();
    if (open) {
      MOTIF[hs.room](c, x + ww / 2, y + hh * 0.52, Math.min(ww, hh) * 0.22);
      glow(c, x + ww / 2, y + hh * 0.5, ww * 0.7, '#FFE08A', 0.18);
    }
    // appui de fenêtre fleuri
    c.beginPath(); c.roundRect(x - 4, y + hh, ww + 8, 6, 3); fillShaded(c, open ? PAL.rose : '#8F82B0', { x, y: y + hh, w: ww, h: 6 }, 1.6);
    if (open) for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + ww * (0.15 + i * 0.23), y + hh + 1, 2.6, 0, 7); c.fillStyle = [PAL.roseVif, '#fff', PAL.lavande, PAL.or][i]; c.fill(); }
  }
}

/** Carte illustrée du château : palais pastel fleuri, une fenêtre par pièce (éclairée si débloquée). */
export function drawCastle(ctx: CanvasRenderingContext2D, w: number, h: number, unlocked: ReadonlySet<string>, t: number): void {
  const m = ctx.getTransform();
  // échelle du calque statique plafonnée (zoom de la caméra × densité) : iOS limite la taille des canvas
  const sc = Math.min(2.5, Math.max(1, Math.round(Math.hypot(m.a, m.b) * 2) / 2));
  const key = `${Math.round(w)}x${Math.round(h)}|${sc}`;
  let st = castleCache.get(key);
  if (!st) {
    st = makeCanvas(w * sc, h * sc);
    const c = st.getContext('2d')!;
    c.scale(sc, sc); c.lineJoin = 'round'; c.lineCap = 'round';
    drawCastleStatic(c, w, h);
    if (castleCache.size > 4) castleCache.delete(castleCache.keys().next().value as string);
    castleCache.set(key, st);
  }
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.drawImage(st, 0, 0, w, h);
  // nuages qui dérivent
  for (let i = 0; i < 3; i++) {
    const x = ((t * (5 + i * 2) + i * w * 0.4) % (w + 120)) - 60; const y = h * (0.05 + i * 0.065);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [dx, dy, r] of [[0, 0, 12], [14, 3, 10], [-14, 3, 9], [28, 6, 7]] as const) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 7); ctx.fill(); }
  }
  drawWindows(ctx, w, h, unlocked, t);
  // étincelles sur le château
  for (let i = 0; i < 6; i++) sparkle(ctx, w * (0.1 + ((i * 0.17 + t * 0.02) % 0.8)), h * (0.1 + (i * 0.13) % 0.6), 2.4 + (i % 2), '#fff', 0.2 + 0.6 * Math.abs(Math.sin(t * 1.6 + i * 1.7)));
  ctx.restore();
}
