/** Terrasse de nuit : cadrer et « photographier » les feux d'artifice au pic de l'explosion (5 prises). */
import { h } from '../../ui/dom';
import { reducedFx } from '../../core/app';
import { Fx, endCard, fitCanvas, injectCss, introCard, makeClock, startLoop, type Fit } from '../games/action/common';
import { COLOR_SETS, RISE, burstAt, glow, schedule, shotLabel, shotScore, summarize, type Firework, type ShotResult } from '../games/action/fireworks';
import type { Activity } from '../types';

import { PARTNER } from '../../config/gift';
const SHOTS = 5;
const MAX_T = 58;

const activity: Activity = async (ctx) => {
  injectCss();
  const fws: Firework[] = schedule(ctx.rng, MAX_T - 3);
  ctx.header('Feux d’artifice', 'Photographie les plus beaux !');
  const left = h('span.ea-tag', `📷 ${SHOTS} prises`);
  const msg = h('span.ea-tag', 'Touche au pic de l’explosion');
  ctx.root.append(h('div.ea-hud', left, msg));
  const stage = h('div.ea-stage');
  const strip = h('div', { style: 'display:flex;gap:6px;justify-content:center;padding:8px 0 2px;flex-shrink:0;min-height:60px' });
  ctx.root.append(stage, strip);
  const slots = Array.from({ length: SHOTS }, () => h('div', { style: 'width:56px;height:56px;border-radius:10px;background:rgba(255,255,255,.55);box-shadow:0 0 0 2px rgba(88,67,63,.25);display:flex;align-items:center;justify-content:center;font-size:11px;color:#58433f;overflow:hidden;position:relative' }, '·'));
  strip.append(...slots);

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rad = ctx.avatar('radia', Math.round(70 * dpr), Math.round(175 * dpr), { expr: 'smile', arms: 'down' });
  const aug = ctx.avatar('auguste', Math.round(70 * dpr), Math.round(175 * dpr), { expr: 'smile', arms: 'down' });

  let f: Fit = fitCanvas(stage);
  const flashEl = h('div', { style: 'position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:3' });
  stage.append(flashEl);
  let bg: HTMLCanvasElement | null = null;
  const stars: Array<[number, number, number, number]> = [];
  let sr = 12345; const rnd = (): number => { sr = (sr * 16807) % 2147483647; return sr / 2147483647; };
  for (let i = 0; i < 70; i++) stars.push([rnd(), rnd() * 0.62, 0.8 + rnd() * 1.6, rnd() * 6]);
  const vf = (): { x: number; y: number; w: number; h: number } => ({ x: f.w * 0.22, y: f.h * 0.07, w: f.w * 0.56, h: f.h * 0.46 });

  const buildBg = (): void => {
    const c = document.createElement('canvas'); c.width = f.cv.width; c.height = f.cv.height;
    const g = c.getContext('2d')!; g.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    const W = f.w; const H = f.h;
    const sky = g.createLinearGradient(0, 0, 0, H * 0.78); sky.addColorStop(0, '#0b0826'); sky.addColorStop(0.6, '#2c2158'); sky.addColorStop(1, '#8e4f8b');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // silhouette de la ville + tour
    const baseY = H * 0.74;
    g.fillStyle = '#1b1438';
    let x = 0; let k = 3;
    while (x < W) { const bw = 18 + ((k * 37) % 30); const bh = 22 + ((k * 53) % 46); g.fillRect(x, baseY - bh, bw, bh + 40); x += bw + 2; k++; }
    const tx = W * 0.5;
    g.beginPath(); g.moveTo(tx - 30, baseY + 4); g.lineTo(tx - 4, baseY - 130); g.lineTo(tx - 1.5, baseY - 150); g.lineTo(tx + 1.5, baseY - 150); g.lineTo(tx + 4, baseY - 130); g.lineTo(tx + 30, baseY + 4); g.lineTo(tx + 16, baseY + 4); g.lineTo(tx, baseY - 70); g.lineTo(tx - 16, baseY + 4); g.closePath(); g.fillStyle = '#150f2e'; g.fill();
    g.fillStyle = 'rgba(255,210,120,.8)';
    for (let i = 0; i < 40; i++) g.fillRect((i * 53) % W, baseY - 14 + ((i * 17) % 40), 2, 2.4);
    // terrasse
    const fl = g.createLinearGradient(0, H * 0.8, 0, H); fl.addColorStop(0, '#3d2c63'); fl.addColorStop(1, '#241a40');
    g.fillStyle = fl; g.fillRect(0, H * 0.8, W, H * 0.2);
    g.fillStyle = '#e8d9f3'; g.fillRect(0, H * 0.79, W, 5);
    for (let i = 0; i <= W; i += 22) { g.fillStyle = 'rgba(232,217,243,.9)'; g.fillRect(i, H * 0.79 + 5, 4, H * 0.07); }
    g.fillStyle = 'rgba(232,217,243,.7)'; g.fillRect(0, H * 0.79 + H * 0.07, W, 3);
    // guirlande lumineuse
    for (let i = 0; i < 12; i++) { const gx = (i + 0.5) * (W / 12); const gy = H * 0.78 + Math.sin(i * 1.7) * 3; g.beginPath(); g.arc(gx, gy + 6, 3.4, 0, 7); g.fillStyle = i % 2 ? '#ffd98a' : '#ffb3cf'; g.fill(); }
    bg = c;
  };
  const layout = (): void => { f = fitCanvas(stage, f.cv); buildBg(); if (bg) f.g.drawImage(bg, 0, 0, f.w, f.h); };
  layout();
  if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => { if (stage.clientWidth > 50) layout(); }); ro.observe(stage); ctx.onDispose(() => ro.disconnect()); }

  await introCard(ctx, { title: 'Photo de nuit', text: 'Touche l’écran quand le feu d’artifice est au plus brillant pour le photographier !', art: h('div', { style: 'font-size:46px' }, '🎆📷') });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const clock = makeClock(ctx);
  const fx = new Fx();
  const shots: ShotResult[] = [];
  let lastShot = -9; let done = false;
  let finish: () => void = () => undefined;
  const fin = new Promise<void>((r) => { finish = r; });
  const fired = new Set<number>();

  const snap = (): HTMLCanvasElement => {
    const v = vf(); const c = document.createElement('canvas'); c.width = 112; c.height = 112;
    const g = c.getContext('2d')!;
    const s = Math.max(112 / v.w, 112 / v.h);
    g.drawImage(f.cv, v.x * f.dpr, v.y * f.dpr, v.w * f.dpr, v.h * f.dpr, (112 - v.w * s) / 2, (112 - v.h * s) / 2, v.w * s, v.h * s);
    return c;
  };
  const onDown = (e: PointerEvent): void => {
    e.preventDefault();
    const t = clock();
    if (done || shots.length >= SHOTS || t - lastShot < 0.35) return;
    lastShot = t;
    const r = shotScore(fws, t);
    const thumb = snap();
    shots.push(r);
    flashEl.style.transition = 'none'; flashEl.style.opacity = '0.9'; void flashEl.offsetWidth; flashEl.style.transition = 'opacity .4s ease-out'; flashEl.style.opacity = '0';
    ctx.sound('sparkle');
    const slot = slots[shots.length - 1];
    thumb.style.cssText = 'width:100%;height:100%;object-fit:cover';
    slot.textContent = ''; slot.append(thumb, h('b', { style: 'position:absolute;bottom:1px;right:4px;color:#fff;font-size:13px;text-shadow:0 1px 2px #000' }, `${r.score}`));
    ctx.pop(slot);
    left.textContent = `📷 ${SHOTS - shots.length} prise${SHOTS - shots.length > 1 ? 's' : ''}`;
    msg.textContent = shotLabel(r.score);
    ctx.pop(msg);
    const v = vf();
    fx.text(f.w / 2, v.y + v.h + 22, r.score >= 85 ? `Parfait ! ${r.score}` : `${r.score} pts`, r.score >= 60 ? '#ffe27a' : '#fff', 26);
    if (r.score >= 70) { ctx.sound('pop3'); fx.burst(f.w / 2, v.y + v.h / 2, 18, [...COLOR_SETS[0], '#fff'], { kind: 'star', speed: 150, size: 6 }); }
    if (shots.length >= SHOTS) { done = true; ctx.later(finish, 1400); }
  };
  f.cv.addEventListener('pointerdown', onDown);
  ctx.onDispose(() => f.cv.removeEventListener('pointerdown', onDown));

  const drawFw = (g: CanvasRenderingContext2D, fw: Firework, t: number): void => {
    const W = f.w; const H = f.h;
    const cx = fw.x * W; const cy = fw.y * H; const baseY = H * 0.76;
    const [c1, c2] = COLOR_SETS[fw.hue]; const c3 = COLOR_SETS[fw.hue2][0];
    const a = t - fw.launch;
    if (a < 0) return;
    if (a < RISE) {
      const u = a / RISE; const y = baseY + (cy - baseY) * (1 - Math.pow(1 - u, 2));
      g.strokeStyle = c2; g.lineWidth = 2.4; g.globalAlpha = 0.9;
      g.beginPath(); g.moveTo(cx + Math.sin(u * 9) * 2, y + 26); g.lineTo(cx + Math.sin(u * 9) * 2, y); g.stroke();
      g.globalAlpha = 1; g.beginPath(); g.arc(cx, y, 2.6, 0, 7); g.fillStyle = '#fff'; g.fill();
      if (!fired.has(-fw.launch) && u > 0.02) { fired.add(-fw.launch); ctx.sound('whoosh'); }
      return;
    }
    const age = t - burstAt(fw);
    const gl = glow(age);
    if (gl <= 0) return;
    if (!fired.has(fw.launch)) { fired.add(fw.launch); ctx.sound('pop2'); }
    const R = fw.size * W * 0.23 * (1 - Math.exp(-age * 3.2));
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5); halo.addColorStop(0, c1 + '55'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = gl * 0.7; g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, R * 1.5, 0, 7); g.fill();
    g.globalAlpha = gl;
    const drop = 40 * age * age;
    const layers: Array<[number, number, number]> = [[30, 1, 0.3], [22, 0.7, 0.3], [14, 0.4, 0.4]];
    layers.forEach(([n, rk, trail], layer) => {
      const rr = R * rk;
      g.strokeStyle = layer === 1 ? c3 : c1; g.fillStyle = layer === 1 ? '#fff' : c2; g.lineWidth = layer === 0 ? 3 : 2.2;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + layer * 0.27;
        const px = cx + Math.cos(ang) * rr; const py = cy + Math.sin(ang) * rr + drop;
        const bx = cx + Math.cos(ang) * rr * (1 - trail); const by = cy + Math.sin(ang) * rr * (1 - trail) + drop * 0.8;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(px, py); g.stroke();
        g.beginPath(); g.arc(px, py, layer === 0 ? 2.8 : 2, 0, 7); g.fill();
      }
    });
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  };

  startLoop(ctx, (_n, dt) => {
    const t = clock();
    const g = f.g; const W = f.w; const H = f.h;
    if (bg) g.drawImage(bg, 0, 0, W, H);
    for (const [sx, sy, sz, ph] of stars) { g.globalAlpha = reducedFx() ? 0.8 : 0.45 + 0.45 * Math.sin(t * 2 + ph); g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * W, sy * H, sz, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    for (const fw of fws) if (t > fw.launch - 0.1 && t < fw.launch + RISE + 2.1) drawFw(g, fw, t);
    // couple sur la terrasse (de dos au premier plan, mi-hauteur masquée par la rambarde)
    const ah = Math.min(150, H * 0.3); const aw = ah * 0.4;
    g.drawImage(rad, W * 0.5 - aw - 4, H - ah - 4, aw, ah); g.drawImage(aug, W * 0.5 + 4, H - ah - 4, aw, ah);
    // viseur
    const v = vf();
    g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 3; const L = 22;
    for (const [ox, oy, sx, sy] of [[v.x, v.y, 1, 1], [v.x + v.w, v.y, -1, 1], [v.x, v.y + v.h, 1, -1], [v.x + v.w, v.y + v.h, -1, -1]] as const) { g.beginPath(); g.moveTo(ox, oy + sy * L); g.lineTo(ox, oy); g.lineTo(ox + sx * L, oy); g.stroke(); }
    g.lineWidth = 1.5; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(v.x + v.w / 2 - 9, v.y + v.h / 2); g.lineTo(v.x + v.w / 2 + 9, v.y + v.h / 2); g.moveTo(v.x + v.w / 2, v.y + v.h / 2 - 9); g.lineTo(v.x + v.w / 2, v.y + v.h / 2 + 9); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = Math.floor(t * 2) % 2 ? '#ff5f7e' : 'rgba(255,95,126,.3)'; g.beginPath(); g.arc(v.x + 14, v.y - 10, 4.5, 0, 7); g.fill();
    // minuteur discret
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(14, H - 14, Math.max(0, (W - 28) * (1 - t / MAX_T)), 4);
    fx.update(dt); fx.draw(g);
    if (!done && t > MAX_T) { done = true; finish(); }
  }, 30);

  await fin;
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const sum = summarize(shots);
  const bestIdx = shots.reduce((bi, s, i, a) => (s.score > a[bi].score ? i : bi), 0);
  const grid = h('div', { style: 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap' });
  slots.forEach((s, i) => { const c = s.cloneNode(true) as HTMLElement; c.style.width = '52px'; c.style.height = '52px'; const src = s.querySelector('canvas'); const dst = c.querySelector('canvas'); if (src && dst) (dst as HTMLCanvasElement).getContext('2d')!.drawImage(src, 0, 0); if (i === bestIdx && shots.length) c.style.boxShadow = '0 0 0 3px #f3c86b'; grid.append(c); });
  await endCard(ctx, {
    title: shots.length ? (sum.score >= 70 ? 'Quels clichés magnifiques !' : 'Jolies photos souvenir ♡') : 'Les étoiles te remercient ♡',
    art: shots.length ? grid : undefined,
    lines: [shots.length ? `Meilleure prise : ${shots[bestIdx].score} / 100` : 'Tu profites du spectacle, c’est le plus important.', `${PARTNER} : « On garde celle-là, ma reine. »`],
  });
  return { score: sum.score, ok: true, data: { shots: shots.map((s) => ({ score: s.score, colors: s.colors })), best: sum.best } };
};
export default activity;
