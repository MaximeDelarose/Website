/** Week-end spa : huile parfumée, ambiance, puis respiration guidée sans échec. */
import { h } from '../../ui/dom';
import { reducedFx } from '../../core/app';
import { radiaFaceCanvas } from '../../game/art/world/radiaNow';
import { oilUrl } from '../games/action/art';
import { Fx, endCard, fitCanvas, injectCss, introCard, makeClock, startLoop, clamp, type Fit } from '../games/action/common';
import { BUBBLES, CANDLES, DEFAULT_AMBIENCE, EXHALE, INHALE, LIGHTS, OILS, bubbleCount, circleSize, inSync, phaseAt, relaxScore, type Ambience, type Oil } from '../games/action/spa';
import type { Activity } from '../types';

import { PARTNER } from '../../config/gift';
const DURATION = 45;

const activity: Activity = async (ctx) => {
  injectCss();
  ctx.header('Week-end spa', 'Un moment rien que pour toi');
  const stage = h('div.ea-stage', { style: 'display:none;min-height:180px' });
  const panel = h('div', { style: 'flex-shrink:0;padding:8px 4px 0' });
  ctx.root.append(stage, panel);
  let oil: Oil = OILS[0];
  const amb: Ambience = { ...DEFAULT_AMBIENCE };

  // ------------------------------------------------ 1) huile
  await introCard(ctx, { title: 'Bienvenue au spa', text: 'Choisis ton huile parfumée, compose l’ambiance, puis respire doucement.', art: h('div', { style: 'font-size:46px' }, '🕯️🛁') });
  if (!ctx.isAlive()) return { score: 0, ok: false };
  await new Promise<void>((resolve) => {
    panel.style.flex = '1'; panel.style.overflow = 'auto';
    const grid = h('div.ea-grid', { style: 'grid-template-columns:repeat(2,1fr)' });
    const tiles = new Map<string, HTMLElement>();
    for (const o of OILS) {
      const t = h('button.ea-tile', { type: 'button' }, h('img', { src: oilUrl(o), alt: '', style: 'width:64px;height:64px' }), h('b', o.name), h('small', o.note));
      if (o === oil) t.classList.add('on');
      t.addEventListener('click', () => { oil = o; tiles.forEach((el, k) => el.classList.toggle('on', k === o.id)); ctx.sound('pop2'); ctx.pop(t); });
      tiles.set(o.id, t); grid.append(t);
    }
    panel.append(h('div.ea-sub', 'Quelle huile parfumée ce soir ?'), grid, h('div', { style: 'height:8px' }), Object.assign(ctx.button('Choisir cette huile ♡', () => { panel.replaceChildren(); resolve(); }, 'gold'), { style: 'width:100%' }));
  });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // ------------------------------------------------ scène partagée (aperçu + jeu)
  stage.style.display = ''; panel.style.flex = ''; panel.style.overflow = '';
  const face = radiaFaceCanvas('smile', 120);
  let f: Fit = fitCanvas(stage);
  const fx = new Fx();
  const bubbles: Array<{ x: number; y: number; r: number; v: number; ph: number }> = [];
  const mkBubble = (init: boolean): { x: number; y: number; r: number; v: number; ph: number } => ({ x: f.w * (0.2 + Math.random() * 0.6), y: init ? f.h * (0.55 + Math.random() * 0.4) : f.h * 0.98, r: 3 + Math.random() * 7, v: 18 + Math.random() * 30, ph: Math.random() * 6 });
  const syncBubbles = (): void => { const n = bubbleCount(amb.bubbles); while (bubbles.length < n) bubbles.push(mkBubble(true)); bubbles.length = Math.min(bubbles.length, n); };
  let breath: { u: number; t: number; holding: boolean; label: string } | null = null;
  const layout = (): void => { f = fitCanvas(stage, f.cv); };
  layout();
  if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => { if (stage.clientWidth > 50) layout(); }); ro.observe(stage); ctx.onDispose(() => ro.disconnect()); }

  const clock = makeClock(ctx);
  startLoop(ctx, (_n, dt) => {
    const t = clock(); const g = f.g; const W = f.w; const H = f.h;
    const lightC = LIGHTS.find((l) => l.id === amb.light)?.color ?? '#ffb3cf';
    const wall = g.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#fdf1f6'); wall.addColorStop(1, '#e9d7f2'); g.fillStyle = wall; g.fillRect(0, 0, W, H);
    // lumière d'ambiance
    const lg = g.createRadialGradient(W / 2, H * 0.3, 10, W / 2, H * 0.3, W * 0.95); lg.addColorStop(0, lightC); lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = 0.75; g.fillStyle = lg; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    // fenêtre / rideaux
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(W * 0.08, 0, 6, H * 0.5); g.fillRect(W - W * 0.08 - 6, 0, 6, H * 0.5);
    // étagère avec bougies
    const shelfY = H * 0.5;
    g.fillStyle = '#d8b99a'; g.fillRect(0, shelfY, W, 8); g.fillStyle = 'rgba(88,67,63,.25)'; g.fillRect(0, shelfY + 8, W, 3);
    const nC = amb.candles;
    for (let i = 0; i < nC; i++) {
      const cx = W * (0.1 + (0.8 * (i + 0.5)) / Math.max(nC, 1)); const ch = 20 + (i % 2) * 8;
      g.fillStyle = '#fff6ea'; g.beginPath(); g.roundRect(cx - 6, shelfY - ch, 12, ch, 3); g.fill(); g.strokeStyle = '#58433f'; g.lineWidth = 1.8; g.stroke();
      const fl = reducedFx() ? 1 : 1 + Math.sin(t * 9 + i * 2) * 0.12;
      const gl = g.createRadialGradient(cx, shelfY - ch - 8, 1, cx, shelfY - ch - 8, 30 * fl); gl.addColorStop(0, 'rgba(255,214,120,.7)'); gl.addColorStop(1, 'rgba(255,214,120,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(cx, shelfY - ch - 8, 30 * fl, 0, 7); g.fill();
      g.fillStyle = '#ffb347'; g.beginPath(); g.ellipse(cx, shelfY - ch - 6, 4.2 * fl, 8 * fl, 0, 0, 7); g.fill(); g.fillStyle = '#fff3b0'; g.beginPath(); g.ellipse(cx, shelfY - ch - 4, 2, 4.5 * fl, 0, 0, 7); g.fill();
    }
    // jacuzzi
    const ty = H * 0.62; const th = H - ty - 6;
    g.fillStyle = '#fff4e8'; g.beginPath(); g.roundRect(W * 0.04, ty, W * 0.92, th, 36); g.fill(); g.lineWidth = 3; g.strokeStyle = '#58433f'; g.stroke();
    const water = g.createLinearGradient(0, ty + 8, 0, H); water.addColorStop(0, '#bfe7f2'); water.addColorStop(1, oil.color + 'aa');
    g.fillStyle = water; g.beginPath(); g.roundRect(W * 0.07, ty + 12, W * 0.86, th - 18, 28); g.fill();
    g.save(); g.beginPath(); g.arc(W / 2, ty + 16, 40, 0, 7); g.clip(); g.fillStyle = '#f7d9c4'; g.fillRect(W / 2 - 40, ty - 24, 80, 80); g.drawImage(face, W / 2 - 46, ty - 30, 92, 92); g.restore();
    g.beginPath(); g.arc(W / 2, ty + 16, 40, 0, 7); g.lineWidth = 3; g.strokeStyle = '#58433f'; g.stroke();
    // mousse sur l'eau
    g.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(W * (0.12 + i * 0.095), ty + 40 + Math.sin(i * 2 + t) * 2, 10 + (i % 3) * 3, 0, 7); g.fill(); }
    // bulles
    syncBubbles();
    for (const b of bubbles) {
      b.y -= b.v * dt; b.x += Math.sin(t * 2 + b.ph) * 8 * dt;
      if (b.y < ty + 6) { b.y = H * 0.97; b.x = W * (0.12 + Math.random() * 0.76); }
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fillStyle = 'rgba(255,255,255,.28)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.4; g.stroke();
      g.beginPath(); g.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.22, 0, 7); g.fillStyle = '#fff'; g.fill();
    }
    // respiration guidée
    if (breath) {
      const cx = W / 2; const cy = H * 0.26; const rMax = Math.min(W * 0.32, H * 0.2); const rMin = rMax * 0.3;
      const gs = circleSize(t);
      g.beginPath(); g.arc(cx, cy, rMin + (rMax - rMin) * gs, 0, 7); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke();
      g.lineWidth = 2; g.strokeStyle = oil.color; g.beginPath(); g.arc(cx, cy, rMin + (rMax - rMin) * gs + 6, 0, 7); g.stroke();
      const ur = rMin + (rMax - rMin) * breath.u;
      const ug = g.createRadialGradient(cx, cy, 2, cx, cy, ur); ug.addColorStop(0, oil.accent); ug.addColorStop(1, oil.color + 'cc');
      g.beginPath(); g.arc(cx, cy, ur, 0, 7); g.fillStyle = ug; g.globalAlpha = breath.holding ? 0.95 : 0.7; g.fill(); g.globalAlpha = 1;
      g.fillStyle = '#58433f'; g.font = '700 20px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(breath.label, cx, cy);
    }
    fx.update(dt); fx.draw(g);
  }, 30);

  // ------------------------------------------------ 2) ambiance
  await new Promise<void>((resolve) => {
    const group = (title: string, opts: Array<{ id: string | number; name: string; color?: string }>, get: () => string | number, set: (v: string | number) => void): HTMLElement => {
      const row = h('div.ea-row', { style: 'justify-content:flex-start' });
      const btns: HTMLButtonElement[] = [];
      for (const o of opts) {
        const b = h('button.ea-opt', { type: 'button' }, o.color ? h('i', { style: `background:${o.color}` }) : null, o.name) as HTMLButtonElement;
        if (get() === o.id) b.classList.add('on');
        b.addEventListener('click', () => { set(o.id); btns.forEach((x, i) => x.classList.toggle('on', opts[i].id === o.id)); ctx.sound('pop1'); ctx.pop(b); fx.burst(f.w / 2, f.h * 0.3, 8, [oil.color, '#fff'], { kind: 'heart', speed: 70, size: 4, gravity: -20 }); });
        btns.push(b); row.append(b);
      }
      return h('div', h('div.ea-label', title), row);
    };
    panel.append(
      h('div.ea-sub', 'Compose ton ambiance'),
      group('Lumière', LIGHTS.map((l) => ({ id: l.id, name: l.name, color: l.color })), () => amb.light, (v) => { amb.light = String(v); }),
      group('Bougies', CANDLES.map((c) => ({ id: c.id, name: c.name })), () => amb.candles, (v) => { amb.candles = Number(v); }),
      group('Bulles du jacuzzi', BUBBLES.map((b) => ({ id: b.id, name: b.name })), () => amb.bubbles, (v) => { amb.bubbles = String(v); }),
      h('div', { style: 'height:8px' }),
      Object.assign(ctx.button('Plonger dans le bain ♡', () => { panel.replaceChildren(); resolve(); }, 'gold'), { style: 'width:100%' }),
    );
  });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // ------------------------------------------------ 3) respiration guidée
  const hint = h('div.ea-sub', { style: 'font-size:15px;min-height:42px' }, 'Maintiens ton doigt pour inspirer, relâche pour souffler.');
  const tag = h('span.ea-tag', 'Détente 100 %');
  panel.append(h('div.ea-hud', h('span.ea-tag', oil.name), tag), hint);
  await introCard(ctx, { title: 'Respire…', text: 'Maintiens ton doigt appuyé quand le cercle grandit, relâche quand il rétrécit. Pas de faute possible, juste du calme.', art: h('img', { src: oilUrl(oil), alt: '', style: 'width:70px;height:70px' }), button: 'Je respire ♡' });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const st = { u: 0, t: 0, holding: false, label: 'Inspire' };
  breath = st;
  const t0 = clock();
  let syncT = 0; let totT = 0; let lastPhase = ''; let calm = 0;
  const down = (e: PointerEvent): void => { e.preventDefault(); st.holding = true; };
  const up = (): void => { st.holding = false; };
  f.cv.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  ctx.onDispose(() => { f.cv.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); });

  const fin = new Promise<void>((resolve) => {
    startLoop(ctx, (_n, dt) => {
      const t = clock() - t0;
      st.t = t;
      st.u = clamp(st.u + (st.holding ? dt / INHALE : -dt / EXHALE), 0, 1);
      const ph = phaseAt(t).phase;
      st.label = ph === 'inhale' ? 'Inspire' : ph === 'hold' ? 'Garde' : ph === 'exhale' ? 'Souffle' : '…';
      if (ph !== lastPhase) { lastPhase = ph; if (ph === 'inhale' || ph === 'exhale') ctx.sound(ph === 'inhale' ? 'whoosh' : 'pop1'); }
      totT += dt;
      const ok = inSync(t, st.holding);
      if (ok) { syncT += dt; calm = Math.min(1, calm + dt * 0.5); } else calm = Math.max(0, calm - dt * 0.4);
      if (ok && Math.random() < dt * (2 + calm * 5)) fx.burst(f.w * (0.2 + Math.random() * 0.6), f.h * 0.5, 1, [oil.color, oil.accent, '#fff'], { kind: Math.random() < 0.5 ? 'heart' : 'star', speed: 20, size: 4, gravity: -40, life: 1.6 });
      if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) tag.textContent = `Détente ${Math.round(100 * (syncT / Math.max(0.5, totT)))} %`;
      if (t > DURATION) resolve();
    }, 30);
  });
  await fin;
  if (!ctx.isAlive()) return { score: 0, ok: false };
  breath = null;
  const ratio = totT > 0 ? syncT / totT : 0;
  const score = relaxScore(ratio);
  await endCard(ctx, {
    title: score >= 80 ? 'Détente absolue ♡' : 'Quel moment de douceur ♡',
    art: h('img', { src: oilUrl(oil), alt: '', style: 'width:72px;height:72px' }),
    lines: [`Huile « ${oil.name} », ambiance ${LIGHTS.find((l) => l.id === amb.light)?.name.toLowerCase()}.`, `${PARTNER} : « Je pourrais rester ici toute la vie. »`],
  });
  return { score, ok: true, data: { oil: oil.id, ambience: { ...amb } } };
};
export default activity;
