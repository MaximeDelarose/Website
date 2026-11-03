import { FURNITURE_IDS, ROOM_IDS, PALETTE } from '../src/data/world/ids';
import { FURNITURE } from '../src/data/world/furniture';
import { ROOMS, roomName } from '../src/data/world/rooms';
import { drawFurniture } from '../src/game/art/world/furniture';
import { drawRoom, drawCastle, castleHotspots, roomFloorRect } from '../src/game/art/world/rooms';
import { paint } from '../src/game/art/kit';

const out = document.getElementById('out')!;
const q = new URLSearchParams(location.search);
const mode = q.get('m') ?? 'all';
const row = () => { const d = document.createElement('div'); d.className = 'row'; out.append(d); return d; };
const fig = (r: HTMLElement, cv: HTMLCanvasElement, label: string) => { const f = document.createElement('figure'); f.append(cv, document.createElement('br'), label); r.append(f); };
const CELL = 56;
const perf: string[] = [];

if (mode === 'all' || mode === 'furniture') {
  const r = row();
  for (const id of FURNITURE_IDS) {
    const f = FURNITURE[id];
    const cv = paint(f.w * CELL, f.h * CELL, 2, (c) => drawFurniture(c, id, f.w * CELL, f.h * CELL, f.color));
    cv.style.width = `${f.w * CELL}px`; cv.style.height = `${f.h * CELL}px`;
    fig(r, cv, `${id} ${f.w}×${f.h}`);
  }
}
if (mode === 'colors') { // quelques variantes de couleur
  const r = row();
  for (const id of ['sofa', 'bed-royal', 'armchair', 'wardrobe', 'rug-round', 'painting'] as const) for (const col of ['sage', 'noir', 'sky', 'gold']) {
    const f = FURNITURE[id];
    const cv = paint(f.w * CELL, f.h * CELL, 2, (c) => drawFurniture(c, id, f.w * CELL, f.h * CELL, col));
    cv.style.width = `${f.w * CELL}px`; cv.style.height = `${f.h * CELL}px`;
    fig(r, cv, `${id}/${col}`);
  }
}
if (mode === 'all' || mode === 'rooms') {
  const r = row();
  const w = 361; const h = 520;
  for (const id of ROOM_IDS) {
    const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; cv.style.width = '240px'; cv.style.height = `${(240 * h) / w}px`;
    const c = cv.getContext('2d')!; c.scale(2, 2);
    const st = { wall: 'rose', floor: 'cream', curtain: 'lavender' };
    const d = { bedroom: ['rose', 'cream', 'lavender'], salon: ['cream', 'beige', 'rose'], dressing: ['lavender', 'white', 'rose'], reception: ['white', 'gold', 'rose'], garden: ['sage', 'beige', 'white'], familySalon: ['peach', 'cream', 'sage'], kid1: ['peach', 'cream', 'rose'], kid2: ['lavender', 'white', 'rose'], kid3: ['sage', 'cream', 'cream'] }[id]!;
    [st.wall, st.floor, st.curtain] = d;
    drawRoom(c, id, w, h, st, 1.3);
    const g = roomFloorRect(id, w, h); const cell = g.w / ROOMS[id].cols;
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 0.8;
    for (let i = 0; i <= ROOMS[id].cols; i++) { c.beginPath(); c.moveTo(g.x + i * cell, g.y); c.lineTo(g.x + i * cell, g.y + g.h); c.stroke(); }
    for (let j = 0; j <= ROOMS[id].rows; j++) { c.beginPath(); c.moveTo(g.x, g.y + j * cell); c.lineTo(g.x + g.w, g.y + j * cell); c.stroke(); }
    fig(r, cv, roomName(id));
  }
}
if (mode === 'all' || mode === 'castle') {
  const r = row();
  const w = 361; const h = 520;
  for (const un of [new Set(['bedroom', 'salon', 'garden']), new Set<string>(ROOM_IDS)]) {
    const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; cv.style.width = '300px'; cv.style.height = `${(300 * h) / w}px`;
    const c = cv.getContext('2d')!; c.scale(2, 2);
    drawCastle(c, w, h, un, 2);
    fig(r, cv, `château ${un.size}`);
  }
  void castleHotspots;
}
if (mode === 'palette') { const r = row(); PALETTE.forEach((p) => { const d = document.createElement('div'); d.style.cssText = `width:40px;height:40px;background:${p.color}`; r.append(d); }); }

// perfs
{
  const cv = document.createElement('canvas'); cv.width = 722; cv.height = 1040; const c = cv.getContext('2d')!; c.scale(2, 2);
  const st = { wall: 'rose', floor: 'cream', curtain: 'lavender' };
  for (const id of ROOM_IDS) {
    c.clearRect(0, 0, 361, 520); drawRoom(c, id, 361, 520, st, 0);
    const t0 = performance.now(); const N = 30;
    for (let i = 0; i < N; i++) { c.clearRect(0, 0, 361, 520); drawRoom(c, id, 361, 520, st, i * 0.05); }
    c.getImageData(0, 0, 1, 1);
    perf.push(`${id}:${((performance.now() - t0) / N).toFixed(2)}ms`);
  }
  const t1 = performance.now();
  for (let i = 0; i < 20; i++) for (const id of FURNITURE_IDS) { const f = FURNITURE[id]; c.clearRect(0, 0, 200, 200); drawFurniture(c, id, f.w * 42, f.h * 42); }
  c.getImageData(0, 0, 1, 1);
  perf.push(`furniture/avg:${((performance.now() - t1) / 20 / 36).toFixed(3)}ms`);
  const t2 = performance.now(); for (let i = 0; i < 20; i++) { c.clearRect(0, 0, 361, 520); drawCastle(c, 361, 520, new Set(ROOM_IDS), i * 0.05); } c.getImageData(0, 0, 1, 1);
  perf.push(`castle:${((performance.now() - t2) / 20).toFixed(2)}ms`);
  console.log('PERF', perf.join(' '));
  const pre = document.createElement('pre'); pre.id = 'perf'; pre.textContent = perf.join(' | '); out.append(pre);
}
(window as unknown as { done: boolean }).done = true;
