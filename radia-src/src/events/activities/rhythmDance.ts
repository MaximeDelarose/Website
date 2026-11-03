/** Bal romantique / concert : jeu de rythme à trois niveaux de timing, les deux personnages dansent. */
import { h } from '../../ui/dom';
import { reducedFx } from '../../core/app';
import { heartPath, starPath } from '../../game/art/kit';
import { Fx, endCard, fitCanvas, injectCss, introCard, startLoop, clamp, type Fit } from '../games/action/common';
import { GOOD_WIN, SONGS, applyJudgment, beatLen, finalScore, gaugeAfter, generatePattern, isOk, judge, newTally, type Judgment, type Note, type SongId } from '../games/action/rhythm';
import type { Activity } from '../types';

type Arms = 'down' | 'wave' | 'heart' | 'open';
interface Live { n: Note; state: 'pending' | 'hit' | 'miss'; flash: number }

const activity: Activity = async (ctx) => {
  injectCss();
  const song: SongId = ctx.params.song === 'concert' ? 'concert' : 'waltz';
  const S = SONGS[song];
  const bl = beatLen(S);
  const live: Live[] = generatePattern(song, ctx.rng).map((n) => ({ n, state: 'pending', flash: 0 }));
  const total = live.length;
  const tally = newTally();
  let gauge = 0.4;

  ctx.header(S.title, song === 'waltz' ? 'Danse avec Auguste ♡' : 'Ton concert, ma reine ♡');
  const scoreTag = h('span.ea-tag', '0 pts');
  const comboTag = h('span.ea-tag', 'Combo 0');
  ctx.root.append(h('div.ea-hud', scoreTag, comboTag));
  const stage = h('div.ea-stage');
  ctx.root.append(stage);

  // --- avatars pré-rendus (les canvases d'Auguste ne sont pas mis en cache : on les construit une fois)
  const AW = 100; const AH = 250;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const frames = new Map<string, HTMLCanvasElement>();
  const frame = (who: 'radia' | 'auguste', step: number, arms: Arms): HTMLCanvasElement => {
    const k = `${who}${step}${arms}`;
    let c = frames.get(k);
    if (!c) { c = ctx.avatar(who, Math.round(AW * dpr), Math.round(AH * dpr), { expr: 'smile', step, arms }); frames.set(k, c); }
    return c;
  };

  let f: Fit = fitCanvas(stage);
  let bg: HTMLCanvasElement | null = null;
  const buildBg = (): void => {
    const c = document.createElement('canvas'); c.width = f.cv.width; c.height = f.cv.height;
    const g = c.getContext('2d')!; g.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    const W = f.w; const H = f.h;
    const grad = g.createLinearGradient(0, 0, 0, H);
    if (song === 'waltz') { grad.addColorStop(0, '#5b3b73'); grad.addColorStop(0.55, '#c26a98'); grad.addColorStop(1, '#f7c6d6'); }
    else { grad.addColorStop(0, '#1f1838'); grad.addColorStop(0.6, '#3b2a6b'); grad.addColorStop(1, '#6b3d86'); }
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    const floorY = H * 0.62;
    // sol
    const fg = g.createLinearGradient(0, floorY, 0, H);
    if (song === 'waltz') { fg.addColorStop(0, '#f2c9a6'); fg.addColorStop(1, '#d99a78'); } else { fg.addColorStop(0, '#4a2f66'); fg.addColorStop(1, '#2a1c44'); }
    g.fillStyle = fg; g.fillRect(0, floorY, W, H - floorY);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
    for (let i = -6; i <= 14; i++) { g.beginPath(); g.moveTo(W / 2 + (i - 4) * 10, floorY); g.lineTo(W / 2 + (i - 4) * W * 0.16, H); g.stroke(); }
    // lustres / projecteurs
    if (song === 'waltz') {
      for (const x of [W * 0.22, W * 0.78]) {
        g.strokeStyle = 'rgba(255,230,160,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 22); g.stroke();
        g.fillStyle = '#ffe9a8'; g.beginPath(); g.moveTo(x - 18, 40); g.lineTo(x + 18, 40); g.lineTo(x, 22); g.closePath(); g.fill();
        for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(x + i * 8, 44 + Math.abs(i) * 2, 3.2, 0, 7); g.fillStyle = '#fff6d0'; g.fill(); }
      }
      g.fillStyle = 'rgba(255,255,255,.14)';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(W * (0.12 + i * 0.26), floorY - 6, 26, 78, 0, Math.PI, 0); g.fill(); }
    } else {
      g.fillStyle = '#2d2150'; g.fillRect(0, floorY - 4, W, 8);
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, 0, W, 10);
    }
    bg = c;
  };
  const layout = (): void => { f = fitCanvas(stage, f.cv); buildBg(); if (bg) f.g.drawImage(bg, 0, 0, f.w, f.h); };
  layout();
  if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => { if (stage.clientWidth > 50) layout(); }); ro.observe(stage); ctx.onDispose(() => ro.disconnect()); }

  const fx = new Fx();
  let pulse = 0; let react = 0; let reactArms: Arms = 'open';
  let lastBeat = -1; let lastHeartBeat = -1;

  // --- intro
  const art = h('div', { style: 'display:flex;gap:6px;align-items:flex-end' }, frame('radia', 0, 'open'), frame('auguste', 0, 'open'));
  for (const c of Array.from(art.children) as HTMLCanvasElement[]) { c.style.width = '56px'; c.style.height = '140px'; }
  await introCard(ctx, { title: S.title, text: song === 'waltz' ? 'Touche la colonne quand le cœur arrive sur l’anneau !' : 'Touche la bonne colonne quand la note arrive sur l’anneau !', art });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // --- horloge précise (performance.now), pause si l'onglet est caché
  let t0 = performance.now();
  let hiddenAt = 0;
  const onVis = (): void => { if (document.hidden) hiddenAt = performance.now(); else if (hiddenAt) { t0 += performance.now() - hiddenAt; hiddenAt = 0; } };
  document.addEventListener('visibilitychange', onVis);
  ctx.onDispose(() => document.removeEventListener('visibilitychange', onVis));
  const songTime = (): number => (performance.now() - t0) / 1000;
  const END = S.leadIn + S.duration + S.tail;

  const reactTo = (j: Judgment, x: number, y: number): void => {
    applyJudgment(tally, j);
    gauge = gaugeAfter(gauge, j);
    scoreTag.textContent = `${tally.points} pts`;
    comboTag.textContent = `Combo ${tally.combo}`;
    if (j === 'perfect') { fx.text(x, y - 30, 'Parfait !', '#ffe27a', 24); fx.burst(x, y, 12, ['#ff75a8', '#f3c86b', '#fff'], { kind: 'heart', speed: 140, size: 5 }); ctx.sound('pop3'); ctx.pop(scoreTag); react = songTime() + 0.5; reactArms = ctx.rng() < 0.5 ? 'heart' : 'open'; }
    else if (j === 'good') { fx.text(x, y - 30, 'Bien', '#c9f2d0', 20); fx.burst(x, y, 6, ['#b9a5e8', '#fff'], { kind: 'star', speed: 100, size: 4 }); ctx.sound('pop1'); react = songTime() + 0.35; reactArms = 'open'; }
    else { fx.text(x, y - 30, 'Raté', '#ffd1d1', 18); }
    if (j !== 'miss' && tally.combo > 0 && tally.combo % 10 === 0) { ctx.sound('combo'); fx.text(f.w / 2, f.h * 0.3, `${tally.combo} d’affilée !`, '#fff', 28); }
  };

  const laneX = (lane: number): number => (lane + 0.5) * (f.w / S.lanes);
  const HIT = (): number => f.h * 0.58;
  const onDown = (e: PointerEvent): void => {
    e.preventDefault();
    const rect = f.cv.getBoundingClientRect();
    const lane = clamp(Math.floor(((e.clientX - rect.left) / rect.width) * S.lanes), 0, S.lanes - 1);
    const now = songTime();
    let best: Live | null = null;
    for (const l of live) { if (l.state !== 'pending' || l.n.lane !== lane) continue; const d = Math.abs(l.n.t - now); if (d <= GOOD_WIN * 1.3 && (!best || d < Math.abs(best.n.t - now))) best = l; }
    pulse = 1;
    if (!best) { fx.burst(laneX(lane), HIT(), 3, ['#fff'], { speed: 50, size: 3, life: 0.4, gravity: 0 }); return; }
    const j = judge(best.n.t - now);
    best.state = 'hit'; best.flash = 1;
    reactTo(j, laneX(lane), HIT());
  };
  f.cv.addEventListener('pointerdown', onDown);
  ctx.onDispose(() => f.cv.removeEventListener('pointerdown', onDown));

  const drawNote = (g: CanvasRenderingContext2D, x: number, y: number, appear: number, big: boolean, a: number): void => {
    const r = (big ? 25 : 21) * (0.55 + 0.45 * appear);
    g.globalAlpha = a;
    if (song === 'waltz') {
      heartPath(g, x, y, r * 2.1); g.fillStyle = big ? '#ff5f9b' : '#ff9fc0'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#58433f'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x - r * 0.4, y - r * 0.35, r * 0.2, r * 0.12, -0.5, 0, 7); g.fill();
    } else {
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = big ? '#f3c86b' : '#8fd8ee'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#58433f'; g.stroke();
      starPath(g, x, y, r * 0.62, r * 0.28); g.fillStyle = '#fff'; g.fill();
    }
    g.globalAlpha = 1;
  };

  const drawDancer = (g: CanvasRenderingContext2D, who: 'radia' | 'auguste', x: number, footY: number, t: number, step: number, arms: Arms, scale: number, tilt: number): void => {
    const bob = Math.abs(Math.sin((t / bl) * Math.PI)) * 7 * (reducedFx() ? 0 : 1);
    g.save();
    g.translate(x, footY - bob); g.rotate(reducedFx() ? 0 : tilt);
    g.fillStyle = 'rgba(40,20,50,.25)'; g.beginPath(); g.ellipse(0, bob, 36 * scale, 7 * scale, 0, 0, 7); g.fill();
    g.drawImage(frame(who, step, arms), -AW * scale / 2, -AH * scale, AW * scale, AH * scale);
    g.restore();
  };

  const ended = new Promise<void>((resolve) => {
    startLoop(ctx, () => {
      const t = songTime();
      const g = f.g; const W = f.w; const H = f.h; const hit = HIT();
      // ratés automatiques
      for (const l of live) if (l.state === 'pending' && l.n.t < t - GOOD_WIN * 1.3) { l.state = 'miss'; reactTo('miss', laneX(l.n.lane), hit); }
      if (bg) g.drawImage(bg, 0, 0, W, H);
      // faisceaux
      if (!reducedFx()) {
        for (let i = 0; i < 3; i++) {
          const ph = t * 0.6 + i * 2.1; const bx = W * (0.2 + 0.3 * i) + Math.sin(ph) * 40;
          const gr = g.createLinearGradient(bx, 0, bx, H * 0.7); gr.addColorStop(0, song === 'waltz' ? 'rgba(255,240,200,.28)' : ['rgba(255,117,168,.35)', 'rgba(143,216,238,.35)', 'rgba(243,200,107,.35)'][i]); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(bx - 8, 0); g.lineTo(bx + 8, 0); g.lineTo(bx + 70 + Math.sin(ph) * 30, H * 0.7); g.lineTo(bx - 70 + Math.sin(ph) * 30, H * 0.7); g.closePath(); g.fill();
        }
      }
      // colonnes
      for (let i = 0; i < S.lanes; i++) {
        g.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.13)';
        g.fillRect((i * W) / S.lanes, 0, W / S.lanes, hit + 40);
      }
      // anneaux
      const beatPh = (t / bl) % 1; const beatPulse = Math.pow(1 - beatPh, 3);
      pulse = Math.max(0, pulse - 0.1);
      for (let i = 0; i < S.lanes; i++) {
        const x = laneX(i); const r = Math.min(36, W / S.lanes * 0.3) * (1 + beatPulse * 0.08 + pulse * 0.1);
        g.beginPath(); g.arc(x, hit, r, 0, 7); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
        g.lineWidth = 2; g.strokeStyle = 'rgba(243,200,107,.9)'; g.beginPath(); g.arc(x, hit, r + 5, 0, 7); g.stroke();
        g.fillStyle = `rgba(255,255,255,${0.12 + pulse * 0.25})`; g.fill();
      }
      // notes
      const speed = hit / 1.9;
      for (const l of live) {
        if (l.state === 'hit') { if (l.flash > 0) { l.flash -= 0.12; const r = 30 + (1 - l.flash) * 30; g.beginPath(); g.arc(laneX(l.n.lane), hit, r, 0, 7); g.strokeStyle = `rgba(255,255,255,${Math.max(0, l.flash)})`; g.lineWidth = 4; g.stroke(); } continue; }
        const dy = (l.n.t - t) * speed; const y = hit - dy;
        if (y < -40 || y > hit + 80) continue;
        drawNote(g, laneX(l.n.lane), y, clamp(1 - dy / hit, 0, 1), l.n.big, l.state === 'miss' ? 0.35 : 1);
      }
      // danseurs
      const beatIdx = Math.floor(t / bl);
      if (beatIdx !== lastBeat) { lastBeat = beatIdx; }
      const sw = Math.sin((t / (bl * S.beatsPerBar)) * Math.PI * 2);
      const reacting = t < react;
      const stepR = beatIdx % 2 ? 1 : -1;
      const floorY2 = H - 10;
      const sc = Math.min(1, (H - hit - 18) / AH);
      if (song === 'waltz') {
        const cx = W / 2; const sep = AW * sc * 0.5;
        const armsR: Arms = reacting ? reactArms : (beatIdx % S.beatsPerBar === 0 ? 'open' : 'down');
        drawDancer(g, 'radia', cx - sep + sw * 8, floorY2, t, stepR, armsR, sc, sw * 0.07);
        drawDancer(g, 'auguste', cx + sep + sw * 8, floorY2, t, -stepR, armsR, sc, sw * 0.07);
        if (reacting && !reducedFx() && beatIdx !== lastHeartBeat) { lastHeartBeat = beatIdx; fx.burst(cx, floorY2 - AH * sc * 0.9, 2, ['#ff9fc0'], { kind: 'heart', speed: 40, size: 5, gravity: -30, life: 1.1 }); }
      } else {
        drawDancer(g, 'radia', W * 0.4, floorY2, t, stepR, reacting ? reactArms : tally.combo >= 6 ? 'wave' : 'open', sc, sw * 0.04);
        drawDancer(g, 'auguste', W * 0.72, floorY2, t, -stepR, beatIdx % 2 ? 'wave' : 'down', sc * 0.93, -sw * 0.04);
      }
      // jauge d'amour
      const gx = 14; const gy = 12; const gw = W - 28;
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.roundRect(gx, gy, gw, 12, 6); g.fill();
      const gr = g.createLinearGradient(gx, 0, gx + gw, 0); gr.addColorStop(0, '#ff9fc0'); gr.addColorStop(1, '#ffd45e');
      g.fillStyle = gr; g.beginPath(); g.roundRect(gx, gy, Math.max(12, gw * gauge), 12, 6); g.fill();
      heartPath(g, gx + gw * gauge, gy + 6, 20); g.fillStyle = '#ff5f9b'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#58433f'; g.stroke();
      fx.update(0.033); fx.draw(g);
      if (t > END) resolve();
    }, 30);
  });
  await ended;
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const score = finalScore(tally, total);
  const title = score >= 85 ? 'Quelle danse de rêve !' : score >= 55 ? 'Magnifique, ma reine !' : 'Quel joli moment ensemble ♡';
  await endCard(ctx, {
    title,
    lines: [`${tally.perfects} parfaits · ${tally.goods} bien · meilleur combo ${tally.bestCombo}`, song === 'waltz' ? 'Auguste ne veut plus te lâcher la main.' : 'La salle entière t’applaudit !'],
    art: h('div', { style: 'display:flex;gap:4px;align-items:flex-end' }, ...['radia', 'auguste'].map((w) => { const c = frame(w as 'radia' | 'auguste', 0, 'heart'); const cc = document.createElement('canvas'); cc.width = c.width; cc.height = c.height; cc.getContext('2d')!.drawImage(c, 0, 0); cc.style.cssText = 'width:50px;height:125px'; return cc; })),
  });
  return { score, ok: isOk(score), data: { perfects: tally.perfects, combo: tally.bestCombo } };
};
export default activity;
