/**
 * La soirée du feu d'artifice (deux parties d'une même activité) :
 *  - `show`  : terrasse sur Paris de nuit, la musique baisse, « Regarde le ciel… », feux d'artifice, puis « RADIA ❤️ » écrit
 *              par les feux et maintenu longtemps ; bouton discret pour revoir le spectacle ;
 *  - `gift`  : la déclaration (4 répliques), l'écrin, le collier révélé, les 6 répliques, « obtenu ! » et « Veux-tu le porter ? ».
 * Paramètres : `part`, `replay` (revoir depuis l'album : aucune question, aucune attribution), `preview` (développeur :
 * tout se joue, rien n'est attribué ni sauvegardé).
 * Le lanceur ne verse aucune récompense ici : le collier n'est attribué que par `grantNecklace()` à la fin de la scène.
 */
import './necklace.css';
import type { Activity, ActivityCtx } from '../types';
import { audio, reducedFx, save } from '../../core/app';
import { haptic } from '../../core/haptics';
import { avatarCanvas } from '../../game/art/world/avatar';
import { drawNecklaceBig } from '../../game/art/world/avatarNecklace';
import { shineAt } from '../../game/art/world/wristShine';
import { glow, heartPath, makeCanvas, sparkle } from '../../game/art/kit';
import { equip } from '../../game/world/wardrobe';
import { NECKLACE_ID, DECLARATION, GIFT_LINES, OBTAINED, OPEN_BOX, SKY_LINE, WEAR_NO, WEAR_QUESTION, WEAR_YES } from './data';
import { buildMessage } from './letters';
import { Fireworks, FW_COLORS, GOLD, type BurstSpec, type FwSfx } from './fireworks';
import { nightLayout, nightLive, nightStatic } from './night';
import { drawGiftBox } from './box';
import { finishScene, grantNecklace } from './grant';
import { necklaceFx } from './wearFx';

const clamp = (x: number, a = 0, b = 1): number => Math.max(a, Math.min(b, x));
const easeOut = (x: number): number => 1 - Math.pow(1 - clamp(x), 3);
const easeInOut = (x: number): number => { const c = clamp(x); return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2; };
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

interface Glit { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; kind: 0 | 1 | 2 }

const activity: Activity = async (ctx: ActivityCtx) => {
  const part: 'show' | 'gift' = ctx.params.part === 'gift' ? 'gift' : 'show';
  const replay = !!ctx.params.replay;
  const preview = !!ctx.params.preview;
  const persist = !replay && !preview;
  const calm = reducedFx();
  const layer = (ctx.root.closest('.ev-layer') as HTMLElement | null) ?? ctx.root;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const necklace = () => save.data.fun.necklace;

  layer.classList.add('nl-on');
  const cv = document.createElement('canvas');
  cv.className = 'nl-cv';
  layer.prepend(cv);
  const g = cv.getContext('2d')!;
  if (preview) layer.append(Object.assign(document.createElement('span'), { className: 'nl-note-pv', textContent: 'Prévisualisation' }));

  if (persist) { const n = necklace(); n.started = true; n.stage = Math.max(n.stage, part === 'show' ? 1 : 2); if (part === 'show' || !n.look) n.look = { ...ctx.look, acc: [...ctx.look.acc] }; save.save(); }

  // ---- musique : elle baisse doucement (jamais coupée), puis remonte
  let finished = false;
  audio.duckHold(part === 'show' ? 0.3 : 0.18, 1.4);

  // ---- état animé
  const S = { fade: 0, dark: part === 'gift' ? 0.7 : 0, boxIn: 0, open: 0, rise: 0, zoom: 0, dim: 0, bust: 0, fly: 0, worn: 0, away: 0 };
  type K = keyof typeof S;
  const tweens: { k: K; from: number; to: number; t0: number; ms: number; ease: (x: number) => number; done: () => void }[] = [];
  let clock = 0;
  const tween = (k: K, to: number, ms: number, ease: (x: number) => number = easeInOut): Promise<void> =>
    new Promise((resolve) => {
      if (calm) { S[k] = to; resolve(); return; }
      tweens.push({ k, from: S[k], to, t0: clock, ms, ease, done: resolve });
    });

  const fw = new Fireworks({ reduced: calm, sfx: (n: FwSfx) => audio.play(n) });
  const glits: Glit[] = [];
  const glitter = (x: number, y: number, n: number, speed = 120): void => {
    if (calm) return;
    for (let i = 0; i < n && glits.length < 90; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7);
      glits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 25, age: 0, life: 0.9 + Math.random() * 0.9, size: 3 + Math.random() * 5, kind: (Math.random() < 0.3 ? 2 : Math.random() < 0.5 ? 1 : 0) as 0 | 1 | 2 });
    }
  };

  // ---- sprites des personnages (par taille) : Radia dans sa tenue actuelle, Auguste (illustration ou dessin)
  const sprites = new Map<string, HTMLCanvasElement>();
  const spr = (key: string, make: () => HTMLCanvasElement): HTMLCanvasElement => { let c = sprites.get(key); if (!c) { c = make(); sprites.set(key, c); } return c; };
  const tintCache = new Map<string, HTMLCanvasElement>();
  const tinted = (src: HTMLCanvasElement, key: string, color: string): HTMLCanvasElement => {
    const k = `${key}|${color}`;
    let c = tintCache.get(k);
    if (!c) {
      c = makeCanvas(src.width, src.height);
      const t = c.getContext('2d')!;
      t.drawImage(src, 0, 0);
      t.globalCompositeOperation = 'source-atop'; t.fillStyle = color; t.fillRect(0, 0, c.width, c.height);
      if (tintCache.size > 24) tintCache.delete(tintCache.keys().next().value as string);
      tintCache.set(k, c);
    }
    return c;
  };

  // ---- message RADIA ❤️
  let layoutW = 0, layoutH = 0;
  let L = nightLayout(1, 1);
  let msg = buildMessage(300, 60, calm ? 140 : 300);
  let msgBox = { x: 0, y: 0, w: 300, h: 60 };
  const relayout = (): void => {
    const rc = layer.getBoundingClientRect();
    const W = Math.max(1, Math.round(rc.width)), H = Math.max(1, Math.round(rc.height));
    if (W === layoutW && H === layoutH) return;
    layoutW = W; layoutH = H;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    L = nightLayout(W, H);
    const mw = Math.min(W * 0.9, 360);
    const mh = Math.min(H * 0.16, mw / 5.2);
    msg = buildMessage(mw, mh, calm ? 150 : 300);
    msgBox = { x: (W - mw) / 2, y: Math.max(H * 0.2, 96), w: mw, h: mh };
  };

  const t0 = performance.now();
  let raf = 0, last = 0, alive = true;
  const teardown = (): void => { alive = false; cancelAnimationFrame(raf); if (!finished) audio.duckRelease(1.4); };
  ctx.onDispose(teardown);

  let revealShine = 0;
  let wearGem = { x: 0, y: 0, size: 0 };
  const rayAngle = { a: 0 };

  const frame = (now: number): void => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!ctx.isAlive()) { teardown(); cv.remove(); return; }
    if (now - last < (calm ? 50 : 33)) return;
    const dt = Math.min(0.1, (now - (last || now - 33)) / 1000);
    last = now;
    clock = now;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const k = clamp((clock - tw.t0) / tw.ms);
      S[tw.k] = lerp(tw.from, tw.to, tw.ease(k));
      if (k >= 1) { tweens.splice(i, 1); tw.done(); }
    }
    relayout();
    const t = (now - t0) / 1000;
    const { w: W, h: H } = L;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.drawImage(nightStatic(W, H, dpr), 0, 0, W, H);
    nightLive(g, L, t, calm);
    // ciel qui s'assombrit
    const dk = S.dark * 0.5 + S.dim * 0.35;
    if (dk > 0.001) { g.fillStyle = `rgba(6,3,26,${dk})`; g.fillRect(0, 0, W, H); }
    // éclat des explosions sur le ciel
    if (fw.flash > 0.02) { glow(g, W / 2, L.rail * 0.35, W * 0.9, fw.flashColor, 0.22 * fw.flash); }
    fw.update(dt);
    fw.render(g, Math.max(0.9, W / 393));

    // personnages côte à côte, avec leurs reflets colorés
    const ch = Math.min(L.h * 0.36, 300), cw = ch * 0.5;
    const rx = W * 0.36, ax = W * 0.64, feet = L.feet;
    const sw = Math.round(cw * dpr), sh = Math.round(ch * dpr);
    const rs = spr(`r${sw}x${sh}`, () => avatarCanvas(ctx.look, sw, sh, { expr: 'smile', arms: 'down' }));
    const as = spr(`a${sw}x${sh}`, () => ctx.avatar('auguste', sw, sh, { expr: 'love' }));
    const lightK = clamp(fw.flash * 0.55 + (fw.messageProgress() > 0 ? 0.18 : 0));
    const fade = easeOut(S.fade);
    g.save(); g.globalAlpha = fade * (1 - 0.6 * S.dim * 0 );
    g.fillStyle = 'rgba(20,8,50,0.3)';
    for (const x of [rx, ax]) { g.beginPath(); g.ellipse(x, feet - 2, cw * 0.4, 6, 0, 0, 7); g.fill(); }
    const bob = calm ? 0 : Math.sin(t * 1.6) * 1.1;
    g.drawImage(rs, rx - cw / 2, feet - ch + bob, cw, ch);
    g.drawImage(as, ax - cw / 2, feet - ch + bob, cw, ch);
    if (lightK > 0.02) {
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = fade * lightK * 0.55;
      const col = fw.messageProgress() > 0 ? '#ffb86b' : fw.flashColor;
      g.drawImage(tinted(rs, 'r' + sw, col), rx - cw / 2, feet - ch + bob, cw, ch);
      g.drawImage(tinted(as, 'a' + sw, col), ax - cw / 2, feet - ch + bob, cw, ch);
    }
    g.restore();

    // ---- partie « cadeau » : écrin, collier, loupe sur Radia
    if (part === 'gift') drawGift(t, W, H, rs, sw, sh);

    // paillettes
    for (let i = glits.length - 1; i >= 0; i--) {
      const p = glits[i];
      p.age += dt;
      if (p.age >= p.life) { glits.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 55 * dt; p.vx *= 0.985;
      const a = 1 - p.age / p.life;
      if (p.kind === 2) { g.fillStyle = `rgba(255,128,172,${a})`; heartPath(g, p.x, p.y, p.size * 1.6); g.fill(); }
      else sparkle(g, p.x, p.y, p.size * (0.6 + 0.6 * a), p.kind === 1 ? '#FFE9A6' : '#FFFFFF', a);
    }
    // fondu d'entrée
    if (S.fade < 1) { g.fillStyle = `rgba(0,0,0,${1 - easeOut(S.fade)})`; g.fillRect(0, 0, W, H); }
  };

  // ---- dessin de la partie « cadeau »
  const boxPos = (W: number, H: number) => ({ x: W / 2, y: H * 0.47, s: Math.min(W * 0.5, 200) });
  const bustCache = new Map<string, HTMLCanvasElement>();
  const bustSprite = (withNeck: boolean, k: number): HTMLCanvasElement => {
    const key = `${withNeck ? 1 : 0}:${Math.round(k * 100)}`;
    let c = bustCache.get(key);
    if (!c) {
      const look = withNeck ? { ...ctx.look, acc: [...ctx.look.acc.filter((a) => a !== NECKLACE_ID), NECKLACE_ID] } : { ...ctx.look, acc: ctx.look.acc.filter((a) => a !== NECKLACE_ID) };
      c = avatarCanvas(look, Math.round(240 * k * dpr), Math.round(600 * k * dpr), { expr: 'love', arms: 'down' });
      bustCache.set(key, c);
    }
    return c;
  };
  const drawGift = (t: number, W: number, H: number, rs: HTMLCanvasElement, sw: number, sh: number): void => {
    void rs; void sw; void sh;
    // voile sombre et halo pour faire ressortir l'écrin
    if (S.boxIn > 0) { g.fillStyle = `rgba(14,6,36,${0.62 * easeOut(S.boxIn)})`; g.fillRect(0, 0, W, H); }
    const bp = boxPos(W, H);
    const open = clamp(S.open);
    const away = easeOut(S.away);
    const calmK = calm ? 1 : 0.9 + 0.1 * Math.sin(t * 2.2);
    const float = calm ? 0 : Math.sin(t * 1.9) * 5;
    const zoom = 1 + 0.12 * easeInOut(S.zoom);
    const alpha = clamp(S.boxIn * 2) * (1 - away);
    if (alpha > 0.01 && S.bust < 0.5) {
      g.save();
      g.globalAlpha = alpha;
      const appear = calm ? 1 : lerp(0.35, 1, easeOut(S.boxIn));
      const cy = bp.y + float + (1 - easeOut(S.boxIn)) * 90;
      g.translate(bp.x, cy); g.scale(appear * zoom, appear * zoom); g.translate(-bp.x, -cy);
      // lumière douce + rayons
      if (open > 0.02) {
        glow(g, bp.x, cy - bp.s * 0.4, bp.s * (0.9 + 1.5 * easeOut(open)) * calmK, '#FFE7B0', 0.5 * easeOut(open));
        glow(g, bp.x, cy - bp.s * 0.4, bp.s * 0.7 * calmK, '#FFFFFF', 0.26 * easeOut(open));
        if (!calm) {
          g.save(); g.translate(bp.x, cy - bp.s * 0.3); rayAngle.a += 0.004; g.rotate(rayAngle.a);
          g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 12; i++) {
            g.rotate((Math.PI * 2) / 12);
            const rg = g.createLinearGradient(0, 0, bp.s * 2.4, 0);
            rg.addColorStop(0, `rgba(255,236,190,${0.2 * easeOut(open) * (i % 2 ? 0.7 : 1)})`); rg.addColorStop(1, 'rgba(255,236,190,0)');
            g.fillStyle = rg; g.beginPath(); g.moveTo(0, 0); g.lineTo(bp.s * 2.4, -bp.s * 0.07); g.lineTo(bp.s * 2.4, bp.s * 0.07); g.closePath(); g.fill();
          }
          g.restore();
        }
      }
      // ombre au sol de l'écrin
      g.fillStyle = 'rgba(10,4,30,0.35)'; g.beginPath(); g.ellipse(bp.x, cy + bp.s * 0.34, bp.s * 0.46, bp.s * 0.05, 0, 0, 7); g.fill();
      drawGiftBox(g, bp.x, cy, bp.s, open, 'back');
      // le collier sort de l'écrin et se déploie
      const rise = easeOut(S.rise);
      if (rise > 0.01) {
        const size = bp.s * lerp(0.6, 1.1, rise);
        const gemY = lerp(cy - bp.s * 0.02, cy - bp.s * 0.34, rise); // le diamant monte hors de l'écrin ; la chaîne se déploie
        revealShine = (t * 0.55) % 1.6; // balayage lent et continu pendant la révélation
        drawNecklaceBig(g, bp.x, gemY - 0.56 * size, size, calm ? 0 : clamp(revealShine), rise);
      }
      drawGiftBox(g, bp.x, cy, bp.s, open, 'front');
      g.restore();
      if (rise > 0.5 && !calm && Math.random() < 0.3) glitter(bp.x + (Math.random() - 0.5) * bp.s * 1.2, bp.y - bp.s * 0.5 + (Math.random() - 0.5) * bp.s * 0.5, 1, 40);
    }
    // ---- Radia portant le collier : médaillon (buste en grand), le collier voyage de l'écrin jusqu'à son cou
    if (S.bust > 0.01) {
      const R = Math.min(W * 0.42, H * 0.24);
      const cx = W / 2, cy = H * 0.4 + (1 - easeOut(S.bust)) * 30;
      const k = (2 * R) / 235; // le médaillon montre y ≈ 35 → 270 de l'avatar
      const ox = cx - 120 * k, oy = cy - 150 * k;
      const a = easeOut(S.bust);
      g.save();
      g.globalAlpha = a;
      g.fillStyle = 'rgba(10,4,30,0.78)'; g.fillRect(0, 0, W, H);
      glow(g, cx, cy, R * 1.9, '#FFE3F0', 0.4);
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2);
      const bgG = g.createLinearGradient(0, cy - R, 0, cy + R); bgG.addColorStop(0, '#7b66b8'); bgG.addColorStop(1, '#3c2e6e');
      g.fillStyle = bgG; g.fill();
      g.save(); g.clip();
      const wornA = easeOut(S.worn);
      g.globalAlpha = a * (1 - wornA);
      g.drawImage(bustSprite(false, k), ox, oy, 240 * k, 600 * k);
      g.globalAlpha = a * wornA;
      g.drawImage(bustSprite(true, k), ox, oy, 240 * k, 600 * k);
      g.restore();
      g.globalAlpha = a;
      g.lineWidth = 5; g.strokeStyle = '#F3C86B'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1.6; g.strokeStyle = '#58433F'; g.beginPath(); g.arc(cx, cy, R + 3, 0, Math.PI * 2); g.stroke();
      g.restore();
      wearGem = { x: cx, y: cy + (217 - 150) * k, size: 55.4 * k };
      // le collier voyage de l'écrin jusqu'au cou
      if (S.fly > 0 && S.fly < 1) {
        const e = easeInOut(S.fly);
        const ssz = bp.s * 1.1;
        const sx = bp.x, sy = bp.y - bp.s * 0.34 - 0.56 * ssz;
        const ex = wearGem.x, ey = wearGem.y - 0.56 * wearGem.size, esz = wearGem.size;
        const x = lerp(sx, ex, e), y = lerp(sy, ey, e) - Math.sin(e * Math.PI) * 40, z = lerp(ssz, esz, e);
        glow(g, x, y + z * 0.5, z * 0.8, '#FFFFFF', 0.4 * (1 - e));
        g.save(); g.globalAlpha = 1 - clamp((e - 0.8) / 0.2);
        drawNecklaceBig(g, x, y, z, 0, 0);
        g.restore();
      }
      if (S.worn >= 1 && !calm) {
        const sh2 = shineAt(t, false);
        if (sh2 > 0) sparkle(g, wearGem.x - wearGem.size * 0.04, wearGem.y - wearGem.size * 0.06, 6 + 11 * Math.sin(Math.PI * sh2), '#FFFFFF', 0.95);
      }
    }
  };
  raf = requestAnimationFrame(frame);

  // ---- utilitaires
  const quit = { score: 0, ok: false } as const;
  const dead = (): boolean => !ctx.isAlive();
  const fwWait = (sec: number): Promise<void> => new Promise((r) => { if (calm) { ctx.later(r, Math.min(900, sec * 220)); return; } fw.at(sec, r); });
  const button = (label: string, cls = 'gold', pulse = false): Promise<void> => new Promise((resolve) => {
    const b = ctx.button(label, () => { b.classList.add('out'); ctx.later(() => b.remove(), 200); resolve(); }, cls);
    b.classList.add('nl-act'); if (pulse && !calm) b.classList.add('pulse');
    ctx.root.append(b);
    ctx.pop(b);
  });
  const W0 = (): number => L.w;
  const skyY = (): number => L.rail * 0.36;
  const burst = (xf: number, yf: number, kind: BurstSpec['kind'], color: string, n = 44, speed = 150): void => {
    fw.launch(L.w * xf, L.rail * yf, L.rail + 20, { kind, color, color2: '#ffffff', n, speed });
  };

  // ================================================================== PARTIE 1 : le spectacle
  const runMessage = async (): Promise<boolean> => {
    fw.clearMessage();
    void tween('dark', 1, 1600);
    // explosions dorées, le ciel s'assombrit légèrement
    for (let i = 0; i < 3; i++) { fw.at(0.4 + i * 0.7, () => burst(0.22 + 0.28 * i, 0.3 + (i % 2) * 0.1, 'willow', GOLD, 40, 130)); }
    await fwWait(calm ? 1 : 3.0);
    if (dead()) return false;
    fw.writeMessage(msg, msgBox.x, msgBox.y, L.rail + 20, { letterGap: calm ? 0.5 : 1.5, draw: 1.3, fly: 0.55 });
    audio.play('sparkle');
    // attend que toutes les lettres soient en place
    await new Promise<void>((resolve) => {
      const poll = (): void => { if (dead() || fw.messageProgress() >= 0.999) resolve(); else ctx.later(poll, 200); };
      ctx.later(poll, 1500);
    });
    if (dead()) return false;
    cv.dataset.msgDone = String(Date.now()); // (repère pour les tests : message complet)
    haptic('reward');
    audio.play('crystalSoft');
    return true;
  };

  if (part === 'show') {
    void tween('fade', 1, calm ? 1 : 1800);
    await ctx.wait(calm ? 100 : 1500);
    if (dead()) return quit;
    await ctx.say('auguste', SKY_LINE, 'love');
    if (dead()) return quit;
    // premier feu, deuxième, puis plusieurs explosions colorées
    burst(0.3, 0.3, 'peony', FW_COLORS[0], 46, 150);
    await fwWait(calm ? 0.6 : 2.2);
    if (dead()) return quit;
    burst(0.72, 0.24, 'ring', FW_COLORS[2], 40, 160);
    await fwWait(calm ? 0.6 : 2.2);
    if (dead()) return quit;
    const kinds: BurstSpec['kind'][] = ['peony', 'palm', 'heart', 'ring', 'peony', 'willow'];
    for (let i = 0; i < 6; i++) {
      fw.at(i * 0.55, () => burst(0.14 + ((i * 0.37) % 0.74), 0.2 + ((i * 0.13) % 0.2), kinds[i], FW_COLORS[(i + 1) % FW_COLORS.length], 40, 140));
    }
    await fwWait(calm ? 0.8 : 4.2);
    if (dead()) return quit;
    // moment principal
    if (!await runMessage()) return quit;
    let more = true;
    while (more) {
      // le message reste lisible longtemps (≥ 8 s) avant de pouvoir continuer
      await new Promise<void>((r) => ctx.later(r, calm ? 1200 : 8800));
      if (dead()) return quit;
      const replayBtn = document.createElement('button');
      replayBtn.className = 'nl-replay'; replayBtn.type = 'button'; replayBtn.textContent = '↻'; replayBtn.setAttribute('aria-label', 'Revoir le feu d’artifice');
      ctx.root.append(replayBtn);
      const choice = await Promise.race([
        button('Continuer ♡', 'gold', true).then(() => 'go' as const),
        new Promise<'again'>((r) => replayBtn.addEventListener('click', () => r('again'), { once: true })),
      ]);
      replayBtn.remove();
      if (dead()) return quit;
      if (choice === 'again') {
        ctx.root.querySelectorAll('.nl-act').forEach((e) => e.remove());
        fw.reset(); void tween('dark', 0.3, 700);
        await fwWait(0.8);
        burst(0.5, 0.26, 'peony', FW_COLORS[1], 50, 160);
        await fwWait(calm ? 0.4 : 1.6);
        if (!await runMessage()) return quit;
      } else more = false;
    }
    finished = true;
    await tween('dim', 0, 1); // (la musique reste basse : la déclaration suit)
    const fadeMsg = (async () => { for (let i = 0; i < 12; i++) { fw.messageAlpha = 1 - i / 12; await ctx.wait(80); } fw.clearMessage(); })();
    await fadeMsg;
    layer.classList.remove('nl-on');
    cv.remove();
    teardown();
    finished = true;
    return { score: 100, ok: true, data: { show: true } };
  }

  // ================================================================== PARTIE 2 : la déclaration et l'écrin
  fw.reset();
  void tween('fade', 1, calm ? 1 : 1200);
  await ctx.wait(calm ? 100 : 1100);
  if (dead()) return quit;
  // quelques petites étoiles filantes dorées en arrière-plan, très discrètes
  if (!calm) for (let i = 0; i < 3; i++) fw.at(1 + i * 2.2, () => burst(0.2 + 0.3 * i, 0.22 + 0.06 * i, 'willow', GOLD, 18, 70));
  for (const line of DECLARATION) {
    if (dead()) return quit;
    await ctx.say('auguste', line, 'love');
  }
  if (dead()) return quit;
  // Auguste sort un écrin
  ctx.sound('pop3'); ctx.sound('sparkle');
  void tween('boxIn', 1, calm ? 1 : 1300, easeOut);
  await ctx.wait(calm ? 100 : 1000);
  if (persist) { const n = necklace(); n.stage = Math.max(n.stage, 3); save.save(); }
  await button(OPEN_BOX, 'gold', true);
  if (dead()) return quit;
  // ouverture lente, lumière douce, collier révélé
  audio.duckHold(0.1, 1.2);
  audio.play('crystal');
  void tween('open', 1, calm ? 1 : 2600, easeInOut);
  await ctx.wait(calm ? 100 : 1500);
  glitter(L.w / 2, boxPos(L.w, L.h).y - 20, 40, 150);
  audio.play('sparkle');
  void tween('rise', 1, calm ? 1 : 2600, easeOut);
  await ctx.wait(calm ? 100 : 1800);
  audio.play('crystalSoft');
  void tween('zoom', 1, calm ? 1 : 2400);
  glitter(L.w / 2, boxPos(L.w, L.h).y - 80, 30, 130);
  await ctx.wait(calm ? 100 : 2200);
  if (dead()) return quit;
  for (const line of GIFT_LINES) {
    if (dead()) return quit;
    await ctx.say('auguste', line, 'love');
    glitter(L.w / 2, boxPos(L.w, L.h).y - 70, 10, 90);
  }
  if (dead()) return quit;

  let equipChoice = false;
  if (replay) {
    await button('Continuer ♡');
  } else {
    // ---- fin de la scène : attribution unique, puis « Veux-tu porter ton collier ? »
    if (persist) { finishScene(); grantNecklace(); }
    audio.play('reward'); audio.play('crystal'); haptic('reward');
    ctx.confetti(24);
    glitter(L.w / 2, boxPos(L.w, L.h).y - 70, 36, 170);
    const banner = document.createElement('div');
    banner.className = 'nl-banner'; banner.textContent = OBTAINED;
    ctx.root.append(banner);
    await ctx.wait(calm ? 400 : 2600);
    banner.classList.add('out'); ctx.later(() => banner.remove(), 420);
    equipChoice = await new Promise<boolean>((resolve) => {
      const panel = document.createElement('div');
      panel.className = 'nl-ask';
      const q = document.createElement('p'); q.textContent = WEAR_QUESTION;
      const done = (v: boolean): void => { panel.classList.add('out'); ctx.later(() => panel.remove(), 220); resolve(v); };
      panel.append(q, ctx.button(WEAR_YES, () => done(true), 'gold'), ctx.button(WEAR_NO, () => done(false), 'secondary'));
      ctx.root.append(panel);
      ctx.pop(panel);
    });
    if (dead()) return quit;
    if (persist) { necklace().chose = true; if (equipChoice) equip(NECKLACE_ID); save.save(); }
    if (equipChoice) {
      // Radia apparaît en grand ; le collier voyage de l'écrin jusqu'à son cou
      void tween('bust', 1, calm ? 1 : 1100, easeOut);
      await ctx.wait(calm ? 100 : 1000);
      audio.play('whoosh');
      await tween('fly', 1, calm ? 1 : 1700);
      void tween('worn', 1, calm ? 1 : 500);
      { const lr = layer.getBoundingClientRect(); necklaceFx({ x: lr.left + wearGem.x, y: lr.top + wearGem.y }); }
      glitter(wearGem.x, wearGem.y, 30, 140);
      await ctx.wait(calm ? 200 : 1800);
      await button('Continuer ♡');
    } else {
      void tween('away', 1, calm ? 1 : 1400);
      glitter(L.w / 2, boxPos(L.w, L.h).y - 60, 26, 110);
      const note = document.createElement('div');
      note.className = 'nl-banner'; note.textContent = 'Il t’attend dans ton dressing ♡';
      ctx.root.append(note);
      audio.play('crystalSoft');
      await ctx.wait(calm ? 400 : 2400);
      note.classList.add('out'); ctx.later(() => note.remove(), 420);
    }
  }
  if (dead()) return quit;
  finished = true;
  audio.duckRelease(2.2);
  ctx.sound('heart');
  await ctx.wait(calm ? 50 : 300);
  teardown();
  layer.classList.remove('nl-on');
  cv.remove();
  void W0; void skyY;
  return { score: 100, ok: true, data: { equip: equipChoice, replay } };
};

export default activity;
