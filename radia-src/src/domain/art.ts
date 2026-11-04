/**
 * Décors des lieux à rénover : une scène en coupe (mur, sol, fenêtres, meubles réels du château) dessinée
 * DIFFÉREMMENT à chaque étape :
 *   0 · à rénover (plâtre abîmé, échelle, bâches)   1 · murs repeints (couleur choisie)
 *   2 · aménagé (comptoirs, tables, meubles)        3 · décoré (nappes, fleurs, lumières)
 *   4 · ouvert (enseigne, fanions, lumière chaude, paillettes)
 * Les couleurs choisies par la joueuse (murs, nappe, accent) sont appliquées dès que l'étape correspondante est atteinte.
 */
import { colorOf, type ColorId } from '../data/world/ids';
import { PLACES, type PlaceId } from './places';
import { SH, SW, FLOOR_Y, awning, bunting, disc, ell, glowAt, ink, line, lin, plaque, poly, rr, seeded, sh, softShadow, sparkle, heartPath, type C } from './artKit';
import { drawPlaceProps, terraceSky, type PlaceCtx } from './artProps';

export { SW, SH };

type FloorKind = 'wood' | 'tile' | 'marble' | 'carpet' | 'stone' | 'checker';
export interface SceneColors { wall?: string; cloth?: string; accent?: string }

interface Base { wall: string; floor: string; floorKind: FloorKind; cloth: string; accent: string; pattern: 'stripes' | 'dots' | 'panel' | 'plain'; curtain: string }
const BASE: Record<PlaceId, Base> = {
  tea: { wall: 'cream', floor: '#D9B48C', floorKind: 'wood', cloth: 'rose', accent: 'rose', pattern: 'stripes', curtain: 'rose' },
  flowers: { wall: 'cream', floor: '#D4A98A', floorKind: 'tile', cloth: 'white', accent: 'rose', pattern: 'plain', curtain: 'sage' },
  wing: { wall: 'lavender', floor: '#EFE7F4', floorKind: 'marble', cloth: 'white', accent: 'violet', pattern: 'panel', curtain: 'violet' },
  choc: { wall: 'beige', floor: '#F6EDE2', floorKind: 'checker', cloth: 'white', accent: 'brown', pattern: 'panel', curtain: 'brown' },
  boutique: { wall: 'cream', floor: '#E8D2B8', floorKind: 'wood', cloth: 'white', accent: 'gold', pattern: 'plain', curtain: 'rose' },
  hotel: { wall: 'cream', floor: '#BFA6D8', floorKind: 'carpet', cloth: 'white', accent: 'sky', pattern: 'stripes', curtain: 'sky' },
  restaurant: { wall: 'peach', floor: '#B88660', floorKind: 'wood', cloth: 'white', accent: 'rose', pattern: 'panel', curtain: 'rose' },
  spa: { wall: 'sky', floor: '#E8F4FA', floorKind: 'tile', cloth: 'white', accent: 'sky', pattern: 'dots', curtain: 'white' },
  terrace: { wall: 'sky', floor: '#E9DFD4', floorKind: 'stone', cloth: 'rose', accent: 'gold', pattern: 'plain', curtain: 'rose' },
  casino: { wall: 'noir', floor: '#9E2E3E', floorKind: 'carpet', cloth: 'white', accent: 'sage', pattern: 'stripes', curtain: 'rose' },
};

const hexOf = (v: string): string => (v.startsWith('#') ? v : colorOf(v as ColorId));

// ------------------------------------------------------------------ mur

function drawWall(c: C, k: PlaceCtx): void {
  const R = seeded(77 + k.stage);
  if (k.stage === 0) {
    c.fillStyle = lin(c, 0, 0, 0, FLOOR_Y, '#DCD3C9', '#C9BFB4'); c.fillRect(0, 0, SW, FLOOR_Y);
    // plaques de plâtre, taches, briques à nu, fissures
    for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(255,255,255,${0.18 + R() * 0.2})`; c.fillRect(R() * 300, 8 + R() * 110, 30 + R() * 50, 14 + R() * 26); }
    for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(110,98,88,${0.08 + R() * 0.08})`; c.beginPath(); c.ellipse(R() * SW, R() * 130, 14 + R() * 22, 8 + R() * 14, 0, 0, 7); c.fill(); }
    const bx = 232; const by = 56;
    c.fillStyle = '#C98F7A'; c.fillRect(bx, by, 62, 40);
    for (let r = 0; r < 5; r++) for (let q = 0; q < 4; q++) { c.strokeStyle = 'rgba(120,70,60,0.55)'; c.lineWidth = 0.9; c.strokeRect(bx + q * 16 - (r % 2) * 8, by + r * 8, 16, 8); }
    c.save(); c.beginPath(); c.rect(bx, by, 62, 40); c.clip(); c.fillStyle = '#C98F7A'; c.restore();
    for (const pts of [[[120, 6], [128, 30], [122, 46], [132, 70]], [[310, 8], [302, 24], [308, 40]]] as number[][][]) {
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.strokeStyle = 'rgba(70,58,52,0.55)'; c.lineWidth = 1.4; c.lineJoin = 'round'; c.stroke();
    }
    // plinthe abîmée
    c.fillStyle = '#9A8C80'; c.fillRect(0, FLOOR_Y - 9, SW, 9);
    return;
  }
  const w = k.wall;
  c.fillStyle = lin(c, 0, 0, 0, FLOOR_Y, sh(w, 0.18), w, sh(w, -0.05)); c.fillRect(0, 0, SW, FLOOR_Y);
  if (k.spec.pattern === 'stripes') { c.fillStyle = 'rgba(255,255,255,0.22)'; for (let x = 6; x < SW; x += 24) c.fillRect(x, 0, 11, FLOOR_Y - 34); }
  if (k.spec.pattern === 'dots') { c.fillStyle = 'rgba(255,255,255,0.35)'; for (let y = 10; y < FLOOR_Y - 40; y += 22) for (let x = 8 + ((y / 22) % 2) * 11; x < SW; x += 22) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); } }
  // lambris + moulure
  const lowerTop = FLOOR_Y - 36;
  if (k.spec.pattern === 'panel' || k.spec.pattern === 'stripes') {
    c.fillStyle = sh(w, -0.1); c.fillRect(0, lowerTop, SW, 36);
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(0, lowerTop, SW, 2.5);
    for (let x = 10; x < SW; x += 46) { c.strokeStyle = sh(w, -0.22); c.lineWidth = 1; c.strokeRect(x, lowerTop + 7, 34, 22); }
  }
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, 0, SW, 5);
  c.fillStyle = sh(w, -0.18); c.fillRect(0, 5, SW, 1.5);
  c.fillStyle = '#7A5A4A'; c.fillRect(0, FLOOR_Y - 7, SW, 7);
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(0, FLOOR_Y - 7, SW, 1.6);
  // lumière du haut-gauche
  const g = c.createRadialGradient(60, 20, 10, 60, 20, 260); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, SW, FLOOR_Y);
}

// ------------------------------------------------------------------ sol

function drawFloor(c: C, k: PlaceCtx): void {
  const R = seeded(31);
  const kind = k.spec.floorKind;
  const base = k.spec.floor;
  const clean = k.stage >= 1;
  const top = FLOOR_Y;
  if (kind === 'wood') {
    c.fillStyle = lin(c, 0, top, 0, SH, sh(base, clean ? 0.05 : -0.18), sh(base, clean ? -0.12 : -0.3)); c.fillRect(0, top, SW, SH - top);
    for (let y = top + 8, i = 0; y < SH; y += 12 + i, i += 1) {
      c.strokeStyle = clean ? 'rgba(88,60,40,0.22)' : 'rgba(60,45,35,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, y); c.lineTo(SW, y); c.stroke();
      for (let x = ((i * 53) % 70) + 10; x < SW; x += 70 + i * 6) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 12 + i); c.stroke(); }
    }
  } else if (kind === 'checker' || kind === 'tile' || kind === 'marble') {
    const s = kind === 'tile' ? 22 : 26;
    for (let r = 0; r * s * 0.5 + top < SH + s; r++) for (let q = -1; q * s < SW + s; q++) {
      const y = top + r * s * 0.5;
      const dark = (r + q) % 2 === 0;
      const col = kind === 'checker' ? (dark ? '#9A7A6A' : '#F6EDE2') : kind === 'marble' ? (dark ? '#E4DAF0' : '#FAF6FD') : (dark ? sh(base, -0.08) : sh(base, 0.06));
      c.fillStyle = clean ? col : sh(col, -0.22);
      c.fillRect(q * s + (r % 2) * (s / 2), y, s, s * 0.5);
    }
    if (kind === 'marble' && clean) { c.strokeStyle = 'rgba(150,130,180,0.3)'; c.lineWidth = 1; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(R() * SW, top + R() * 70); c.quadraticCurveTo(R() * SW, top + R() * 80, R() * SW, SH); c.stroke(); } }
  } else if (kind === 'carpet') {
    c.fillStyle = clean ? lin(c, 0, top, 0, SH, sh(base, 0.12), sh(base, -0.1)) : sh(base, -0.3); c.fillRect(0, top, SW, SH - top);
    if (clean) {
      c.strokeStyle = 'rgba(255,224,160,0.8)'; c.lineWidth = 2; c.strokeRect(14, top + 12, SW - 28, SH - top - 24);
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1; c.strokeRect(20, top + 18, SW - 40, SH - top - 36);
      for (let x = 34; x < SW - 20; x += 26) { c.fillStyle = 'rgba(255,224,160,0.35)'; c.beginPath(); c.moveTo(x, top + 26); c.lineTo(x + 6, top + 33); c.lineTo(x, top + 40); c.lineTo(x - 6, top + 33); c.closePath(); c.fill(); }
    }
  } else {
    c.fillStyle = lin(c, 0, top, 0, SH, sh(base, clean ? 0.02 : -0.2), sh(base, clean ? -0.14 : -0.34)); c.fillRect(0, top, SW, SH - top);
    c.strokeStyle = clean ? 'rgba(120,100,90,0.35)' : 'rgba(70,58,52,0.5)'; c.lineWidth = 1;
    for (let y = top + 14; y < SH; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(SW, y); c.stroke(); }
    for (let r = 0; r < 6; r++) for (let x = (r % 2) * 22 + 6; x < SW; x += 44) { c.beginPath(); c.moveTo(x, top + 14 + r * 18); c.lineTo(x, top + 32 + r * 18); c.stroke(); }
  }
  if (!clean) {
    // poussière, gravats, rayures
    for (let i = 0; i < 16; i++) { c.fillStyle = `rgba(120,108,96,${0.12 + R() * 0.16})`; c.beginPath(); c.ellipse(R() * SW, top + 6 + R() * 70, 10 + R() * 22, 3 + R() * 5, 0, 0, 7); c.fill(); }
    for (let i = 0; i < 9; i++) { const x = R() * SW; const y = top + 20 + R() * 50; poly(c, [[x, y], [x + 7, y + 1], [x + 3, y - 4]], '#B8AB9E', 0.6); }
  } else {
    // reflet de propreté
    c.save(); c.beginPath(); c.rect(0, top, SW, SH - top); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.moveTo(60, top); c.lineTo(110, top); c.lineTo(40, SH); c.lineTo(-10, SH); c.closePath(); c.fill();
    c.restore();
  }
}

// ------------------------------------------------------------------ fenêtre

export function windowAt(c: C, x: number, y: number, w: number, h: number, k: PlaceCtx, curtain?: string): void {
  rr(c, x - 4, y - 4, w + 8, h + 8, 5, '#FFFDF8', 1.5);
  const g = lin(c, 0, y, 0, y + h, '#BFE3FF', '#EAF6FF');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  ell(c, x + w * 0.35, y + h * 0.38, w * 0.22, h * 0.09, 'rgba(255,255,255,0.9)'); ell(c, x + w * 0.5, y + h * 0.33, w * 0.16, h * 0.08, 'rgba(255,255,255,0.9)');
  c.strokeStyle = '#FFFDF8'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h * 0.5); c.lineTo(x + w, y + h * 0.5); c.stroke();
  c.strokeStyle = 'rgba(88,67,63,0.5)'; c.lineWidth = 0.9; c.strokeRect(x, y, w, h);
  if (k.stage === 0) {
    c.fillStyle = 'rgba(190,180,170,0.4)'; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + w * 0.2, y); c.lineTo(x + w * 0.45, y + h * 0.4); c.lineTo(x + w * 0.3, y + h * 0.7); c.lineTo(x + w * 0.5, y + h); c.moveTo(x + w * 0.45, y + h * 0.4); c.lineTo(x + w * 0.85, y + h * 0.3); c.stroke();
    // planches clouées
    for (const [dy, a] of [[0.28, -0.12], [0.62, 0.1]] as const) {
      c.save(); c.translate(x + w / 2, y + h * dy); c.rotate(a);
      rr(c, -w * 0.62, -5, w * 1.24, 10, 2, '#B98B5E', 1.2); disc(c, -w * 0.5, 0, 1.4, '#6B4A33'); disc(c, w * 0.5, 0, 1.4, '#6B4A33');
      c.restore();
    }
    return;
  }
  if (k.stage >= 2 && curtain) {
    const cw = w * 0.32;
    for (const side of [-1, 1] as const) {
      const cx = side < 0 ? x - 3 : x + w + 3 - cw;
      c.beginPath(); c.moveTo(cx, y - 8); c.lineTo(cx + cw, y - 8);
      c.quadraticCurveTo(cx + cw * (side < 0 ? 0.55 : 0.2), y + h * 0.5, cx + cw * (side < 0 ? 0.7 : 0.3), y + h + 8);
      c.lineTo(cx + (side < 0 ? 0 : cw * 0.1), y + h + 8); c.closePath();
      c.fillStyle = lin(c, cx, 0, cx + cw, 0, sh(curtain, 0.25), curtain, sh(curtain, -0.15)); c.fill(); ink(c, 1.2);
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx + cw * 0.35, y); c.lineTo(cx + cw * 0.35, y + h); c.stroke();
    }
    rr(c, x - 8, y - 12, w + 16, 7, 3, '#C9A25B', 1.2);
  } else {
    rr(c, x - 7, y - 11, w + 14, 4, 2, '#C9A25B', 1);
  }
}

// ------------------------------------------------------------------ chantier (étapes 0 et 1)

function ladder(c: C, x: number, y: number, h: number): void {
  c.save();
  for (const dx of [0, 24]) { poly(c, [[x + dx, y], [x + dx + 4, y], [x + dx + 4 - 5, y + h], [x + dx - 5, y + h]], '#C99A6B', 1.1); }
  for (let i = 1; i < 7; i++) { const yy = y + (h * i) / 7; rr(c, x - 3 + i * 0.3, yy, 28 - i * 0.6, 3.4, 1.4, '#B98558', 0.9); }
  c.restore();
}
function bucket(c: C, x: number, y: number, col: string | null): void {
  softShadow(c, x, y + 1, 18, 4, 0.25);
  poly(c, [[x - 11, y - 18], [x + 11, y - 18], [x + 9, y], [x - 9, y]], lin(c, x - 11, 0, x + 11, 0, '#EEF0F2', '#B9C0C8'), 1.2);
  ell(c, x, y - 18, 11, 3.4, col ?? '#8A8178', 1.1);
  c.beginPath(); c.arc(x, y - 19, 11, Math.PI, 0); c.strokeStyle = OUTLINE_C; c.lineWidth = 1.1; c.stroke();
}
const OUTLINE_C = '#58433F';
function roller(c: C, x: number, y: number, col: string): void {
  line(c, x, y, x + 14, y - 26, '#8A6B50', 2);
  rr(c, x + 9, y - 36, 18, 8, 3, col, 1); line(c, x + 14, y - 28, x + 14, y - 26, '#58433F', 1.4);
}
function tarp(c: C, x: number, y: number, w: number, h: number): void {
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.2, y - h, x + w * 0.5, y - h * 1.02); c.quadraticCurveTo(x + w * 0.85, y - h, x + w, y); c.closePath();
  c.fillStyle = lin(c, x, y - h, x + w, y, '#F3EFEA', '#CFC8C0'); c.fill(); ink(c, 1.2);
  c.strokeStyle = 'rgba(120,110,100,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + w * 0.3, y - h * 0.9); c.lineTo(x + w * 0.22, y); c.moveTo(x + w * 0.62, y - h * 0.95); c.lineTo(x + w * 0.7, y); c.stroke();
}
function crate(c: C, x: number, y: number, s: number): void {
  rr(c, x, y - s, s, s, 2, '#C99A6B', 1.2);
  line(c, x + 2, y - s + 2, x + s - 2, y - 2, '#8A6B50', 1.2); line(c, x + s - 2, y - s + 2, x + 2, y - 2, '#8A6B50', 1.2);
}
function cobweb(c: C, x: number, y: number, dir: 1 | -1): void {
  c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + dir * 30 * Math.cos((i * Math.PI) / 8), y + 30 * Math.sin((i * Math.PI) / 8)); c.stroke(); }
  for (const r of [10, 18, 26]) { c.beginPath(); c.arc(x, y, r, dir > 0 ? 0 : Math.PI / 2, dir > 0 ? Math.PI / 2 : Math.PI); c.stroke(); }
}

function drawSite(c: C, k: PlaceCtx): void {
  if (k.stage >= 2) return;
  if (k.stage === 0) {
    cobweb(c, SW - 2, 4, -1);
    ladder(c, 300, 116, 76);
    tarp(c, 150, 176, 66, 34);
    crate(c, 236, 206, 26); crate(c, 262, 206, 22);
    bucket(c, 50, 208, null); bucket(c, 96, 214, null);
    // panneau suspendu
    line(c, 150, 0, 150, 18, '#8A6B50', 1.2); line(c, 210, 0, 210, 18, '#8A6B50', 1.2);
    plaque(c, 'À RÉNOVER', 180, 28, 98, 22, '#D9B27C', '#58433F', 12);
  } else {
    ladder(c, 38, 100, 80);
    bucket(c, 280, 206, k.wall); roller(c, 306, 204, k.wall);
    crate(c, 322, 208, 20);
    // bande de peinture fraîche
    line(c, 0, 0, 0, 0, '#fff', 0);
    plaque(c, 'EN TRAVAUX', 180, 26, 98, 22, '#FFE9A8', '#58433F', 11.5);
  }
}

// ------------------------------------------------------------------ ambiance & enseigne

function drawMood(c: C, k: PlaceCtx): void {
  if (k.stage === 0) { c.fillStyle = 'rgba(66,60,86,0.18)'; c.fillRect(0, 0, SW, SH); }
  else if (k.stage === 1) { c.fillStyle = 'rgba(66,60,86,0.06)'; c.fillRect(0, 0, SW, SH); }
  else if (k.stage === 4) {
    glowAt(c, SW / 2, 40, 210, '#FFE9B8', 0.38);
    const R = seeded(5);
    for (let i = 0; i < 9; i++) sparkle(c, 16 + R() * (SW - 32), 14 + R() * 150, 3 + R() * 4, i % 3 ? '#FFFFFF' : '#FFE9A8', 0.9);
  }
}

function drawSign(c: C, k: PlaceCtx): void {
  const def = PLACES[k.id];
  if (k.stage === 4) {
    const name = def.short.replace(/\s*♛/, '');
    line(c, 130, 0, 138, 12, '#8A6B50', 1.2); line(c, 230, 0, 222, 12, '#8A6B50', 1.2);
    plaque(c, name.toUpperCase(), 180, 24, Math.min(240, 40 + name.length * 11.5), 26, '#FFF4E8', '#58433F', 13);
    plaque(c, 'OUVERT', 180, 46, 58, 15, '#FFFFFF', '#E8558F', 9);
    for (const sx of [180 - Math.min(240, 40 + name.length * 11.5) / 2 - 8, 180 + Math.min(240, 40 + name.length * 11.5) / 2 + 8]) { c.save(); c.translate(sx, 24); heartPath(c, 0, 0, 10); c.fillStyle = '#FF75A8'; c.fill(); ink(c, 1); c.restore(); }
  } else if (k.stage >= 2) {
    line(c, 150, 0, 150, 12, '#8A6B50', 1.2); line(c, 210, 0, 210, 12, '#8A6B50', 1.2);
    plaque(c, k.stage === 2 ? 'BIENTÔT' : 'PRESQUE !', 180, 22, 92, 20, '#FFE9A8', '#58433F', 11);
  }
}

// ------------------------------------------------------------------ point d'entrée

export function drawPlaceScene(c: C, id: PlaceId, stage: number, colors: SceneColors = {}): void {
  const spec = BASE[id];
  const st = Math.max(0, Math.min(4, Math.floor(stage)));
  const k: PlaceCtx = {
    id, stage: st, spec: { floor: spec.floor, floorKind: spec.floorKind, pattern: spec.pattern },
    wall: hexOf(colors.wall || spec.wall), cloth: hexOf(colors.cloth || spec.cloth), accent: hexOf(colors.accent || spec.accent), curtain: hexOf(colors.accent || spec.curtain),
  };
  c.save();
  c.beginPath(); c.rect(0, 0, SW, SH); c.clip();
  if (id === 'terrace') terraceSky(c, k); else drawWall(c, k);
  drawFloor(c, k);
  drawPlaceProps(c, k, { windowAt, awning, bunting });
  drawSite(c, k);
  drawMood(c, k);
  drawSign(c, k);
  c.restore();
}

// ------------------------------------------------------------------ canvas prêts à l'emploi

const cache = new Map<string, HTMLCanvasElement>();
const dpr = (): number => Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));

/** Scène du lieu (360×225 logiques) dans un NOUVEAU canvas (le dessin est mis en cache, la copie est rapide). */
export function sceneCanvas(id: PlaceId, stage: number, colors: SceneColors = {}): HTMLCanvasElement {
  const key = `${id}|${stage}|${colors.wall ?? ''}|${colors.cloth ?? ''}|${colors.accent ?? ''}@${dpr()}`;
  let src = cache.get(key);
  if (!src) {
    src = document.createElement('canvas');
    src.width = SW * dpr(); src.height = SH * dpr();
    const c = src.getContext('2d')!;
    c.scale(dpr(), dpr()); c.lineJoin = 'round'; c.lineCap = 'round';
    drawPlaceScene(c, id, stage, colors);
    if (cache.size > 60) cache.delete(cache.keys().next().value as string);
    cache.set(key, src);
  }
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height; out.className = 'dm-cv';
  out.getContext('2d')!.drawImage(src, 0, 0);
  return out;
}

/** Panorama du domaine (bandeau de la carte) : collines, château, chemin, points lumineux pour les lieux ouverts. */
export function panoramaCanvas(open: number, total: number): HTMLCanvasElement {
  const W = 360; const H = 120; const s = dpr();
  const cv = document.createElement('canvas');
  cv.width = W * s; cv.height = H * s; cv.className = 'dm-cv';
  const c = cv.getContext('2d')!;
  c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = lin(c, 0, 0, 0, H, '#BFE3FF', '#FBE6EE'); c.fillRect(0, 0, W, H);
  ell(c, 70, 24, 30, 8, 'rgba(255,255,255,0.9)', 0); ell(c, 300, 18, 26, 7, 'rgba(255,255,255,0.85)', 0);
  for (const [x, col, r] of [[60, '#C8E3B8', 70], [300, '#B5D9A5', 80], [180, '#A9D49A', 90]] as const) { c.beginPath(); c.ellipse(x, H + 20, r * 1.6, r * 0.55 + 22, 0, Math.PI, 0); c.fillStyle = col; c.fill(); }
  // château
  const body = '#FFF3E6';
  for (const [x, w, top, roof] of [[150, 20, 38, '#B9A5E8'], [210, 20, 34, '#E8558F'], [180, 30, 48, '#B9A5E8']] as const) {
    c.beginPath(); c.rect(x - w / 2, top, w, 78 - top); c.fillStyle = body; c.fill(); ink(c, 1.3);
    poly(c, [[x - w / 2 - 3, top], [x, top - 22], [x + w / 2 + 3, top]], roof, 1.3);
  }
  rr(c, 172, 62, 16, 18, 8, '#8A6B50', 1.2);
  // chemin
  c.beginPath(); c.moveTo(176, 80); c.bezierCurveTo(150, 92, 230, 98, 190, 120); c.lineTo(214, 120); c.bezierCurveTo(246, 98, 170, 90, 186, 80); c.closePath(); c.fillStyle = '#F4DDB8'; c.fill();
  for (let i = 0; i < total; i++) {
    const x = 18 + (i * (W - 36)) / (total - 1); const y = 100 + Math.sin(i * 1.7) * 6;
    if (i < open) { glowAt(c, x, y, 12, '#FFE9A8', 0.8); disc(c, x, y, 3.4, '#FFD05A', 1); } else disc(c, x, y, 2.6, 'rgba(255,255,255,0.8)', 0.8);
  }
  return cv;
}
