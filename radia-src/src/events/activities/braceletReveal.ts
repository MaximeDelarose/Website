/**
 * « La promesse d'Auguste ♡ » : Auguste offre un écrin, le bracelet se révèle, quatre répliques sincères,
 * puis (hors replay) « Veux-tu porter ton bracelet ? ». L'attribution du bracelet est faite par le lanceur,
 * pas ici : on retourne seulement { equip } (ou { replay: true }).
 */
import type { Activity, ActivityCtx } from '../types';
import { reducedFx } from '../../core/app';
import { avatarCanvas, drawAvatar } from '../../game/art/world/avatar';
import { drawBraceletBig } from '../../game/art/world/avatarWrist';
import { BRACELET_ID, SHINE_STEPS, shineAt, shineStep } from '../../game/art/world/wristShine';
import { drawPlace } from '../places';
import { glow, heartPath, makeCanvas, roundRect, sparkle } from '../../game/art/kit';
import { PROMISE_INTRO, PROMISE_LINES, PROMISE_QUESTION } from '../bracelet/data';
import { ensurePromiseStyles } from '../ui/promiseCard';

const CHOCO = '#58433F';
const clamp = (x: number, a = 0, b = 1): number => Math.max(a, Math.min(b, x));
const easeOut = (x: number): number => 1 - Math.pow(1 - clamp(x), 3);
const easeInOut = (x: number): number => { const c = clamp(x); return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2; };
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; kind: 0 | 1 | 2 }

/** Petit écrin crème / rose poudré / or. (cx, cy) = milieu du bord supérieur du socle ; s = largeur. */
function drawBox(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, open: number, front: boolean): void {
  const lw = Math.max(2, s * 0.022);
  g.save();
  g.translate(cx, cy);
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (!front) {
    // intérieur (velours rosé) visible quand l'écrin s'ouvre
    roundRect(g, -0.45 * s, -0.05 * s, 0.9 * s, 0.13 * s, 0.04 * s);
    const ig = g.createLinearGradient(0, -0.05 * s, 0, 0.08 * s);
    ig.addColorStop(0, '#E7A0B8'); ig.addColorStop(1, '#B8607F');
    g.fillStyle = ig; g.fill(); g.lineWidth = lw; g.strokeStyle = CHOCO; g.stroke();
    g.restore();
    return;
  }
  // socle
  roundRect(g, -0.5 * s, 0, s, 0.56 * s, 0.05 * s);
  const bg = g.createLinearGradient(-0.5 * s, 0, 0.5 * s, 0.56 * s);
  bg.addColorStop(0, '#FFFBF3'); bg.addColorStop(1, '#F5D9C9');
  g.fillStyle = bg; g.fill();
  g.save(); g.clip();
  g.fillStyle = '#F6CB74'; g.fillRect(-0.5 * s, 0, s, 0.075 * s); // bandeau doré
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-0.5 * s, 0.075 * s, s, 0.012 * s);
  const rg = g.createLinearGradient(-0.07 * s, 0, 0.07 * s, 0);
  rg.addColorStop(0, '#F8C7D6'); rg.addColorStop(1, '#E58BA8');
  g.fillStyle = rg; g.fillRect(-0.07 * s, 0, 0.14 * s, 0.56 * s); // ruban
  g.restore();
  g.lineWidth = lw; g.strokeStyle = CHOCO; roundRect(g, -0.5 * s, 0, s, 0.56 * s, 0.05 * s); g.stroke();
  // petits cœurs dorés sur la face
  for (const [hx, hy, hs] of [[-0.27, 0.33, 0.1], [0.27, 0.33, 0.1], [-0.27 + 0.02, 0.46, 0.05], [0.27 - 0.02, 0.46, 0.05]] as const) {
    heartPath(g, hx * s, hy * s, hs * s); g.fillStyle = '#F3C86B'; g.fill(); g.lineWidth = lw * 0.55; g.strokeStyle = '#B88620'; g.stroke();
  }
  // couvercle : se soulève et bascule
  const e = easeOut(open);
  g.save();
  g.translate(lerp(0, 0.5, e) * s, lerp(-0.1, -0.6, e) * s);
  g.rotate(lerp(0, 0.42, e));
  g.globalAlpha = lerp(1, 0.92, e);
  roundRect(g, -0.55 * s, -0.12 * s, 1.1 * s, 0.24 * s, 0.05 * s);
  const lg = g.createLinearGradient(-0.55 * s, -0.12 * s, 0.55 * s, 0.12 * s);
  lg.addColorStop(0, '#FFFFFF'); lg.addColorStop(1, '#F7DCCB');
  g.fillStyle = lg; g.fill();
  g.save(); g.clip();
  g.fillStyle = '#F6CB74'; g.fillRect(-0.55 * s, 0.07 * s, 1.1 * s, 0.05 * s);
  g.fillStyle = '#EE9DB6'; g.fillRect(-0.07 * s, -0.12 * s, 0.14 * s, 0.24 * s);
  g.restore();
  g.lineWidth = lw; g.strokeStyle = CHOCO; roundRect(g, -0.55 * s, -0.12 * s, 1.1 * s, 0.24 * s, 0.05 * s); g.stroke();
  // nœud
  for (const sgn of [-1, 1]) {
    g.save(); g.translate(sgn * 0.12 * s, -0.15 * s); g.rotate(sgn * -0.5);
    g.beginPath(); g.ellipse(0, 0, 0.12 * s, 0.07 * s, 0, 0, Math.PI * 2);
    const bgl = g.createLinearGradient(-0.1 * s, -0.05 * s, 0.1 * s, 0.05 * s);
    bgl.addColorStop(0, '#FBD2DF'); bgl.addColorStop(1, '#E58BA8');
    g.fillStyle = bgl; g.fill(); g.lineWidth = lw * 0.8; g.stroke();
    g.restore();
  }
  g.beginPath(); g.arc(0, -0.15 * s, 0.045 * s, 0, Math.PI * 2); g.fillStyle = '#F6CB74'; g.fill(); g.lineWidth = lw * 0.8; g.stroke();
  g.restore();
  g.restore();
}

const activity: Activity = async (ctx: ActivityCtx) => {
  ensurePromiseStyles();
  const replay = !!ctx.params.replay;
  const calm = reducedFx();
  const body = ctx.root;
  const cv = document.createElement('canvas');
  cv.className = 'br-cv';
  body.prepend(cv);
  const g = cv.getContext('2d')!;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

  // ---- état animé
  const S = { dark: 0, boxIn: 0, open: 0, rise: 0, zoom: 0, fly: 0, lay: 0, loupe: 0 };
  type K = keyof typeof S;
  const tweens: { k: K; from: number; to: number; t0: number; ms: number; ease: (x: number) => number; done: () => void }[] = [];
  let clock = 0;
  const tween = (k: K, to: number, ms: number, ease: (x: number) => number = easeInOut): Promise<void> =>
    new Promise((resolve) => {
      if (calm) { S[k] = to; resolve(); return; }
      tweens.push({ k, from: S[k], to, t0: clock, ms, ease, done: resolve });
    });
  const sparks: Spark[] = [];
  const burst = (x: number, y: number, n: number, speed = 150): void => {
    if (calm) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: 0.9 + Math.random() * 0.9, size: 3 + Math.random() * 5, kind: (Math.random() < 0.28 ? 2 : Math.random() < 0.5 ? 1 : 0) as 0 | 1 | 2 });
    }
  };

  // ---- sprites (mis en cache par taille)
  const wornLook = { ...ctx.look, acc: ctx.look.acc.includes(BRACELET_ID) ? ctx.look.acc : [...ctx.look.acc, BRACELET_ID] };
  const augCache = new Map<string, HTMLCanvasElement>();
  const augusteSprite = (w: number, h: number): HTMLCanvasElement => {
    const key = `${w}x${h}`;
    let c = augCache.get(key);
    if (!c) { c = ctx.avatar('auguste', w, h, { expr: 'love' }); augCache.set(key, c); }
    return c;
  };
  let wornShown = false;
  // loupe : poignet de Radia agrandi (une image par pas de reflet, mise en cache)
  const loupeCache = new Map<string, HTMLCanvasElement>();
  const loupeSprite = (d: number, step: number): HTMLCanvasElement => {
    const key = `${d}:${step}`;
    let c = loupeCache.get(key);
    if (!c) {
      c = makeCanvas(d * dpr, d * dpr);
      const g2 = c.getContext('2d')!;
      const k = (d * dpr) / 42; // 42 unités d'avatar dans le cercle
      const bgr = g2.createLinearGradient(0, 0, 0, d * dpr);
      bgr.addColorStop(0, '#FBE4EF'); bgr.addColorStop(1, '#E4D6F6');
      g2.fillStyle = bgr; g2.fillRect(0, 0, d * dpr, d * dpr);
      g2.save();
      g2.translate(d * dpr / 2 - 26 * k, d * dpr / 2 - 322 * k); // poignet gauche en pose « open » : (26, 316)
      drawAvatar(g2, wornLook, 240 * k, 600 * k, { arms: 'open', expr: 'smile', shine: step / SHINE_STEPS });
      g2.restore();
      loupeCache.set(key, c);
    }
    return c;
  };

  const t0 = performance.now();
  let raf = 0;
  let last = 0;
  let alive = true;
  const stop = (): void => { alive = false; cancelAnimationFrame(raf); };
  ctx.onDispose(stop);

  const frame = (now: number): void => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!ctx.isAlive()) { stop(); return; }
    if (now - last < 33) return; // ~30 images/s
    const dt = Math.min(0.1, (now - (last || now - 33)) / 1000);
    last = now;
    clock = now;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const k = clamp((clock - tw.t0) / tw.ms);
      S[tw.k] = lerp(tw.from, tw.to, tw.ease(k));
      if (k >= 1) { tweens.splice(i, 1); tw.done(); }
    }
    const t = (now - t0) / 1000;
    const rb = body.getBoundingClientRect();
    const rc = cv.getBoundingClientRect();
    const W = Math.max(1, Math.round(rc.width));
    const H = Math.max(1, Math.round(rc.height));
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // repère « utile » (celui de .ev-body) dans le canvas qui déborde sur les marges
    const ox = rb.left - rc.left;
    const oy = rb.top - rc.top;
    const w = rb.width;
    const h = rb.height;

    // décor du palace qui s'assombrit doucement
    drawPlace(g, 'palace', W, H, t);
    const dk = easeOut(S.dark);
    g.fillStyle = `rgba(24,12,44,${0.7 * dk})`; g.fillRect(0, 0, W, H);
    const vg = g.createRadialGradient(W / 2, H * 0.38, H * 0.1, W / 2, H * 0.4, H * 0.8);
    vg.addColorStop(0, 'rgba(255,214,150,0)'); vg.addColorStop(1, `rgba(10,4,24,${0.55 * dk})`);
    g.fillStyle = vg; g.fillRect(0, 0, W, H);

    g.save();
    g.translate(ox, oy);

    const bw = Math.min(150, w * 0.38);
    const fx = w / 2;
    const mouthY0 = h * 0.31;
    const floatY = calm ? 0 : Math.sin(t * 2.1) * 5;
    const mouthY = mouthY0 + floatY;
    const z = 1 + 0.32 * easeInOut(S.zoom);
    // zoom (rapprochement) centré sur le bijou
    const fyc = mouthY0 - bw * 0.2;
    g.save();
    g.translate(fx, fyc); g.scale(z, z); g.translate(-fx, -fyc);

    // personnages
    const lay = easeInOut(S.lay);
    const ch = Math.round(h * 0.42);
    const cw = Math.round(ch * 0.5);
    const feet = lerp(h - 74, h - 180, lay);
    const rX = lerp(w * 0.25, w * 0.34, lay);
    const aX = lerp(w * 0.75, w * 0.68, lay);
    const fadeChars = 1 - 0.8 * easeInOut(S.zoom) * (1 - lay);
    g.save();
    g.globalAlpha = clamp(fadeChars) * clamp(S.dark * 2 + 0.2);
    const radiaWorn = wornShown && S.fly >= 1;
    const sh = radiaWorn && !calm ? shineAt(t - 0.3) : 0;
    const rs = radiaWorn
      ? avatarCanvas(wornLook, cw * dpr, ch * dpr, { arms: 'open', expr: 'love', shine: sh })
      : ctx.avatar('radia', cw * dpr, ch * dpr, { expr: wornShown ? 'love' : 'smile', arms: wornShown ? 'open' : 'down' });
    const bob = calm ? 0 : Math.sin(t * 1.8) * 1.2;
    g.fillStyle = 'rgba(30,14,50,0.28)';
    g.beginPath(); g.ellipse(rX, feet - 2, cw * 0.38, 6, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(aX, feet - 2, cw * 0.38, 6, 0, 0, 7); g.fill();
    g.drawImage(rs, rX - cw / 2, feet - ch + bob, cw, ch);
    g.drawImage(augusteSprite(cw * dpr, ch * dpr), aX - cw / 2, feet - ch + bob, cw, ch);
    g.restore();

    // lumière dorée de l'écrin + rayons
    const open = clamp(S.open);
    if (open > 0.02 && S.fly < 1) {
      const pulse = calm ? 1 : 0.9 + 0.1 * Math.sin(t * 3);
      glow(g, fx, mouthY - bw * 0.2, bw * (1.2 + 1.3 * easeOut(open)) * pulse, '#FFD98A', 0.85 * easeOut(open) * (1 - S.fly));
      if (!calm) {
        g.save(); g.translate(fx, mouthY - bw * 0.1); g.rotate(t * 0.25);
        for (let i = 0; i < 9; i++) {
          g.rotate((Math.PI * 2) / 9);
          const rg = g.createLinearGradient(0, 0, bw * 2.2, 0);
          rg.addColorStop(0, `rgba(255,236,170,${0.34 * easeOut(open) * (1 - S.fly)})`); rg.addColorStop(1, 'rgba(255,236,170,0)');
          g.fillStyle = rg; g.beginPath(); g.moveTo(0, 0); g.lineTo(bw * 2.2, -bw * 0.1); g.lineTo(bw * 2.2, bw * 0.1); g.closePath(); g.fill();
        }
        g.restore();
      }
    }

    // l'écrin (apparaît en rebondissant), puis le bijou
    const bi = S.boxIn;
    const boxAlpha = clamp(bi * 2) * (1 - clamp(S.fly * 2));
    if (boxAlpha > 0.01) {
      g.save();
      g.globalAlpha = boxAlpha;
      const pop = calm ? 1 : lerp(0.4, 1, easeOut(bi)) * (1 + 0.06 * Math.sin(clamp(bi) * Math.PI));
      g.translate(fx, mouthY); g.scale(pop, pop); g.translate(-fx, -mouthY);
      // ombre portée douce au sol
      g.fillStyle = `rgba(30,14,50,${0.22 - floatY * 0.01})`;
      g.beginPath(); g.ellipse(fx, mouthY0 + bw * 0.56 + 36, bw * 0.4 * (1 - floatY * 0.02), 7, 0, 0, 7); g.fill();
      drawBox(g, fx, mouthY, bw, open, false);
      // bijou qui s'élève de l'écrin
      const rise = easeOut(S.rise);
      if (rise > 0.01) {
        const by = lerp(mouthY + bw * 0.1, mouthY - bw * 0.52, rise);
        const spin = calm ? 0 : (1 - rise) * -1.1 + Math.sin(t * 1.6) * 0.05;
        g.save();
        g.translate(fx, by); g.rotate(spin); g.scale(1 - 0.12 * Math.abs(Math.sin(rise * Math.PI * 2)) * (calm ? 0 : 1), 1);
        g.translate(-fx, -by);
        drawBraceletBig(g, fx, by, bw * lerp(0.55, 1.08, rise), calm ? 0 : shineAt(t));
        g.restore();
      }
      drawBox(g, fx, mouthY, bw, open, true);
      g.restore();
    }
    // le bracelet voyage vers le poignet de Radia
    if (S.fly > 0 && S.fly < 1) {
      const e = easeInOut(S.fly);
      const k = Math.min(cw / 240, ch / 600);
      const wx = rX - cw / 2 + (cw - 240 * k) / 2 + 26 * k;
      const wy = feet - ch + (ch - 600 * k) + 319 * k;
      const sx = fx, sy = mouthY - bw * 0.52;
      const px = lerp(sx, wx, e), py = lerp(sy, wy, e) - Math.sin(e * Math.PI) * 60;
      glow(g, px, py, 60 * (1 - e * 0.4), '#FFD98A', 0.6);
      drawBraceletBig(g, px, py, lerp(bw * 1.08, 24 * (cw / 120), e), 0);
    }
    // halo doux sur le poignet une fois le bracelet porté
    if (radiaWorn) {
      const k = Math.min(cw / 240, ch / 600);
      const wx = rX - cw / 2 + (cw - 240 * k) / 2 + 26 * k;
      const wy = feet - ch + (ch - 600 * k) + 322 * k + bob;
      const gl = calm ? 0.5 : Math.sin(Math.PI * clamp(sh));
      glow(g, wx, wy, 38, '#FFE2A0', 0.15 + 0.45 * gl);
      if (gl > 0.3) sparkle(g, wx + 8, wy + 6, 6 + 8 * gl, '#FFFFFF', gl);
    }

    // loupe : le bracelet, bien lisible, au poignet de Radia
    if (radiaWorn && S.loupe > 0.01) {
      const la = easeOut(S.loupe);
      const R = Math.min(72, w * 0.19);
      const lx = Math.max(R + 8, w * 0.24), ly = h * 0.2 + (1 - la) * 14;
      const k0 = Math.min(cw / 240, ch / 600);
      const wx = rX - cw / 2 + (cw - 240 * k0) / 2 + 26 * k0;
      const wy = feet - ch + (ch - 600 * k0) + 320 * k0 + bob;
      g.save();
      g.globalAlpha = la;
      // trait doré vers le poignet + petit cercle repère
      const dx = wx - lx, dy = wy - ly, dl = Math.hypot(dx, dy) || 1;
      g.strokeStyle = 'rgba(255,224,150,0.8)'; g.lineWidth = 2; g.setLineDash([3, 5]);
      g.beginPath(); g.moveTo(lx + (dx / dl) * R, ly + (dy / dl) * R); g.lineTo(wx - (dx / dl) * 12, wy - (dy / dl) * 12); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(wx, wy, 12, 0, Math.PI * 2); g.lineWidth = 2.2; g.strokeStyle = '#F3C86B'; g.stroke();
      glow(g, lx, ly, R * 1.7, '#FFD98A', 0.4);
      g.beginPath(); g.arc(lx, ly, R, 0, Math.PI * 2); g.fillStyle = '#FFF4E8'; g.fill();
      g.save(); g.clip();
      g.drawImage(loupeSprite(Math.round(R * 2), shineStep(sh)), lx - R, ly - R, R * 2, R * 2);
      g.restore();
      g.beginPath(); g.arc(lx, ly, R, 0, Math.PI * 2); g.lineWidth = 4.5; g.strokeStyle = '#F3C86B'; g.stroke();
      g.lineWidth = 1.5; g.strokeStyle = CHOCO; g.beginPath(); g.arc(lx, ly, R + 2.4, 0, Math.PI * 2); g.stroke();
      g.restore();
    }

    // particules
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life += dt;
      if (p.life >= p.max) { sparks.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.vx *= 0.985;
      const a = 1 - p.life / p.max;
      if (p.kind === 2) { g.fillStyle = `rgba(255,128,172,${a})`; heartPath(g, p.x, p.y, p.size * 1.6); g.fill(); }
      else sparkle(g, p.x, p.y, p.size * (0.6 + 0.6 * a), p.kind === 1 ? '#FFE9A6' : '#FFFFFF', a);
    }
    if (!calm && open > 0.9 && S.fly < 1 && Math.random() < 0.28) burst(fx + (Math.random() - 0.5) * bw * 1.3, mouthY - bw * 0.52 + (Math.random() - 0.5) * bw * 0.4, 1, 28);
    g.restore(); // zoom
    g.restore(); // décalage utile
  };
  raf = requestAnimationFrame(frame);
  const finish = (): void => { stop(); cv.remove(); };

  const waitClick = (label: string, cls = 'gold'): Promise<void> => new Promise((resolve) => {
    const b = ctx.button(label, () => { b.classList.add('out'); ctx.later(() => b.remove(), 200); resolve(); }, cls);
    b.classList.add('br-act');
    body.append(b);
    ctx.pop(b);
  });

  const quit = { score: 0, ok: false } as const;

  // ---- 1. le décor s'assombrit, Auguste annonce son petit quelque chose
  void tween('dark', 1, 2400);
  void tween('lay', 0, 1);
  await ctx.wait(calm ? 200 : 1400);
  if (!ctx.isAlive()) return quit;
  await ctx.say('auguste', PROMISE_INTRO, 'love');
  if (!ctx.isAlive()) return quit;

  // ---- 2. l'écrin apparaît (légère lévitation), bouton d'ouverture
  ctx.sound('pop3'); ctx.sound('sparkle');
  void tween('boxIn', 1, 900, easeOut);
  await ctx.wait(calm ? 100 : 700);
  await waitClick('Ouvrir le cadeau ♡');
  if (!ctx.isAlive()) return quit;

  // ---- 3. ouverture : lumière dorée, bracelet qui tourne et monte, rapprochement
  ctx.sound('whoosh');
  const bwNow = Math.min(150, body.getBoundingClientRect().width * 0.38);
  const mouth = { x: body.getBoundingClientRect().width / 2, y: body.getBoundingClientRect().height * 0.31 };
  void tween('open', 1, 900, easeOut);
  await ctx.wait(calm ? 100 : 450);
  ctx.sound('sparkle'); ctx.sound('reward');
  burst(mouth.x, mouth.y - bwNow * 0.2, 46, 190);
  void tween('rise', 1, 1500, easeOut);
  await ctx.wait(calm ? 100 : 700);
  void tween('zoom', 1, 1800);
  await ctx.wait(calm ? 100 : 1500);
  if (!ctx.isAlive()) return quit;
  burst(mouth.x, mouth.y - bwNow * 0.5, 22, 120);

  // ---- 4. la promesse, une réplique à la fois
  for (const line of PROMISE_LINES) {
    if (!ctx.isAlive()) return quit;
    await ctx.say('auguste', line, 'love');
    if (!calm) burst(mouth.x + (Math.random() - 0.5) * 80, mouth.y - bwNow * 0.5, 8, 90);
    await ctx.wait(120);
  }
  if (!ctx.isAlive()) return quit;

  // ---- 5. le bracelet rejoint le poignet de Radia (aperçu porté)
  ctx.sound('heart');
  void tween('zoom', 0, 1100);
  void tween('lay', 1, 1100);
  await ctx.wait(calm ? 100 : 500);
  wornShown = true;
  await tween('fly', 1, calm ? 1 : 1100);
  void tween('loupe', 1, 700, easeOut);
  ctx.sound('sparkle');
  ctx.confetti(18);
  burst(body.getBoundingClientRect().width * 0.34, body.getBoundingClientRect().height * 0.5, 22, 130);
  await ctx.wait(calm ? 100 : 700);
  if (!ctx.isAlive()) return quit;

  // ---- 6. question (ou simple fin en replay)
  let equip = false;
  if (replay) {
    await waitClick('Continuer ♡');
  } else {
    equip = await new Promise<boolean>((resolve) => {
      const panel = document.createElement('div');
      panel.className = 'br-ask';
      const q = document.createElement('p');
      q.textContent = PROMISE_QUESTION;
      const done = (v: boolean): void => { panel.classList.add('out'); ctx.later(() => panel.remove(), 220); resolve(v); };
      panel.append(q, ctx.button('Le porter', () => done(true), 'gold'), ctx.button('Le garder dans mon dressing', () => done(false), 'secondary'));
      body.append(panel);
      ctx.pop(panel);
    });
  }
  if (!ctx.isAlive()) return quit;
  ctx.sound('heart');
  await ctx.wait(calm ? 50 : 300);
  finish();
  void makeCanvas;
  return replay ? { score: 100, ok: true, data: { replay: true } } : { score: 100, ok: true, data: { equip } };
};
export default activity;
