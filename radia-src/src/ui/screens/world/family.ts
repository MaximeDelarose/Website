/**
 * « Le salon familial » : scène animée (les trois enfants + le chat s'il est
 * adopté), une carte par enfant (visiter la chambre, jouer, complicité) et le
 * jeu « Chocolats en famille ». Deux scènes touchantes, une seule fois chacune.
 */
import '../../styles/world-family.css';
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { audio, reducedFx } from '../../../core/app';
import { stat } from '../../../core/progress';
import { save } from '../../../core/app';
import { world, firstTime } from '../../../core/world';
import { kidName } from '../../../core/family';
import { KID_IDS, type KidId } from '../../../data/world/ids';
import { GAME_INFO, GARDEN_SCENE_LINES, KID_BOND_MAX, KID_GAME } from '../../../data/world/family';
import { kidBondLevel, recordVisit, totalBouquets } from '../../../game/world/family';
import { reactAuguste } from '../../../game/world/auguste';
import { drawKid, type KidPose } from '../../../game/art/world/kids';
import { drawCat } from '../../../game/art/world/cat';
import { canvasUrl, paint, texScale, seeded, PAL, OUTLINE, sparkle } from '../../../game/art/kit';
import { playBouquet } from './familyGames/bouquet';
import { playHarmony } from './familyGames/harmony';
import { playMemory } from './familyGames/memory';
import { playChocolat } from './familyGames/chocolat';
import { butterflyUrl, flowerUrl } from './familyGames/art';

const portrait = (kid: KidId) => canvasUrl(`kidcard:${kid}`, () => paint(70, 96, 2 * texScale() / 2, (c) => drawKid(c, kid, 'idle', 70, 96, 0.6)));

// ---------------------------------------------------------------- décor du salon
function salonBg(w: number, hh: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const x = c.getContext('2d')!;
  const fy = hh * 0.66;
  const g = x.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, '#FFE8D8'); g.addColorStop(1, '#FFD0B8');
  x.fillStyle = g; x.fillRect(0, 0, w, fy);
  x.fillStyle = 'rgba(255,255,255,0.28)'; for (let i = 0; i < 12; i++) x.fillRect(i * (w / 11) - 2, 0, 4, fy);
  const f = x.createLinearGradient(0, fy, 0, hh); f.addColorStop(0, '#F1D2AC'); f.addColorStop(1, '#D9B088');
  x.fillStyle = f; x.fillRect(0, fy, w, hh - fy);
  x.fillStyle = '#FFF4E8'; x.fillRect(0, fy - 5, w, 7); x.strokeStyle = OUTLINE; x.lineWidth = 2; x.strokeRect(-2, fy - 5, w + 4, 7);
  // fenêtre
  const wx = w * 0.36; const wy = hh * 0.07; const ww = w * 0.28; const wh = hh * 0.34;
  const sky = x.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#CBE7FB'); sky.addColorStop(1, '#F6E8FF');
  x.fillStyle = sky; x.fillRect(wx, wy, ww, wh); x.lineWidth = 3.5; x.strokeStyle = OUTLINE; x.strokeRect(wx, wy, ww, wh);
  x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.moveTo(wx, wy + wh / 2); x.lineTo(wx + ww, wy + wh / 2); x.lineWidth = 2.5; x.stroke();
  for (const s of [-1, 1]) { x.fillStyle = '#F5B5C8'; x.beginPath(); const x0 = s < 0 ? wx - 6 : wx + ww + 6; x.moveTo(x0, wy - 4); x.lineTo(x0 + -s * ww * 0.26, wy - 4); x.quadraticCurveTo(x0 + -s * ww * 0.16, wy + wh * 0.5, x0 + -s * ww * 0.24, wy + wh + 4); x.lineTo(x0, wy + wh + 4); x.closePath(); x.fill(); x.lineWidth = 2.5; x.stroke(); }
  // cadres
  for (const [px, py, col] of [[0.1, 0.13, '#FFB3C8'], [0.84, 0.17, '#C9B8F2']] as const) { x.fillStyle = '#fff'; x.fillRect(w * px, hh * py, w * 0.1, hh * 0.15); x.lineWidth = 3; x.strokeRect(w * px, hh * py, w * 0.1, hh * 0.15); x.fillStyle = col; x.beginPath(); x.arc(w * (px + 0.05), hh * (py + 0.075), w * 0.028, 0, 7); x.fill(); x.stroke(); }
  // tapis
  x.fillStyle = '#F5B5C8'; x.beginPath(); x.ellipse(w * 0.5, hh * 0.9, w * 0.44, hh * 0.075, 0, 0, 7); x.fill(); x.lineWidth = 3; x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 2; x.beginPath(); x.ellipse(w * 0.5, hh * 0.9, w * 0.37, hh * 0.055, 0, 0, 7); x.stroke();
  return c;
}

interface Heart { x: number; y: number; t0: number }

// ---------------------------------------------------------------- scène du jardin
function gardenScene(): Promise<void> {
  return new Promise((resolve) => {
    const cv = h('canvas.fam-scene-cv');
    const text = h('div.fam-scene-text');
    const hint = h('small.fam-scene-hint', 'Touche pour continuer');
    const layer = h('div.fam-scene', cv, h('div.fam-scene-box', text, hint));
    ui.root.append(layer);
    let idx = 0;
    let raf = 0;
    let alive = true;
    let typed = 0;
    let typer = 0;
    const say = () => {
      const full = GARDEN_SCENE_LINES[idx];
      typed = 0; text.textContent = '';
      window.clearInterval(typer);
      typer = window.setInterval(() => { typed += 2; text.textContent = full.slice(0, typed); if (typed >= full.length) window.clearInterval(typer); }, 28);
      text.classList.toggle('last', idx === GARDEN_SCENE_LINES.length - 1);
    };
    say();
    const rng = seeded(7);
    const flowers = Array.from({ length: 34 }, () => ({ x: rng(), y: 0.5 + rng() * 0.45, l: 1 + Math.floor(rng() * 3), ph: rng() * 6 }));
    const imgs = new Map<number, HTMLImageElement>();
    for (const l of [1, 2, 3]) { const i = new Image(); i.src = flowerUrl(l, 64); imgs.set(l, i); }
    const bf = new Image(); bf.src = butterflyUrl();
    let last = 0;
    const loop = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (t - last < 50) return;
      last = t;
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, texScale());
      const w = Math.round(r.width); const hh = Math.round(r.height);
      if (!w) return;
      if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = hh * dpr; }
      const x = cv.getContext('2d')!;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = t / 1000;
      const sky = x.createLinearGradient(0, 0, 0, hh * 0.6); sky.addColorStop(0, '#BFE3FA'); sky.addColorStop(1, '#FFE9F2');
      x.fillStyle = sky; x.fillRect(0, 0, w, hh);
      sparkle(x, w * 0.8, hh * 0.12, 22 + Math.sin(s * 2) * 2, '#FFE9A8', 0.95);
      x.fillStyle = 'rgba(255,255,255,0.9)'; for (const [cx, cy] of [[0.2, 0.1], [0.55, 0.16]]) { x.beginPath(); x.ellipse(w * cx + Math.sin(s * 0.3) * 8, hh * cy, 46, 17, 0, 0, 7); x.ellipse(w * cx + 30, hh * cy + 4, 34, 13, 0, 0, 7); x.fill(); }
      const hill = (y: number, c0: string, c1: string, amp: number, ph: number) => {
        const g = x.createLinearGradient(0, hh * y, 0, hh); g.addColorStop(0, c0); g.addColorStop(1, c1);
        x.fillStyle = g; x.beginPath(); x.moveTo(0, hh);
        for (let i = 0; i <= 20; i++) x.lineTo((i / 20) * w, hh * y + Math.sin(i * 0.5 + ph) * amp);
        x.lineTo(w, hh); x.closePath(); x.fill();
      };
      hill(0.42, '#CFE8BF', '#A9D49A', 14, 0); hill(0.52, '#A7D59A', '#7FC48A', 12, 2);
      // arche de fleurs
      x.strokeStyle = '#7FC48A'; x.lineWidth = 6; x.beginPath(); x.moveTo(w * 0.12, hh * 0.62); x.quadraticCurveTo(w * 0.5, -hh * 0.02, w * 0.88, hh * 0.62); x.stroke();
      for (let i = 0; i < 12; i++) { const p = i / 11; const q = 1 - p; const ax = q * q * w * 0.12 + 2 * q * p * w * 0.5 + p * p * w * 0.88; const ay = q * q * hh * 0.62 + 2 * q * p * -hh * 0.02 + p * p * hh * 0.62; const im = imgs.get(1 + (i % 3))!; if (im.complete) x.drawImage(im, ax - 13, ay - 13, 26, 26); }
      for (const f of flowers.sort((a, b) => a.y - b.y)) { const im = imgs.get(f.l)!; if (!im.complete) continue; const sz = 18 + f.y * 26; x.save(); x.translate(f.x * w, f.y * hh); x.rotate(Math.sin(s * 1.4 + f.ph) * 0.12); x.drawImage(im, -sz / 2, -sz, sz, sz); x.restore(); }
      for (let i = 0; i < 3; i++) { if (!bf.complete) break; const bx = ((s * 0.05 + i * 0.37) % 1.2 - 0.1) * w; const by = hh * (0.22 + i * 0.1) + Math.sin(s * 2 + i) * 14; x.drawImage(bf, bx, by, 30, 30); }
      // les trois enfants
      const kw = w * 0.34; const kh = hh * 0.56;
      const poses: [KidId, number, KidPose][] = [['kid2', 0.17, 'wave'], ['kid1', 0.5, 'happy'], ['kid3', 0.83, 'wave']];
      for (const [kid, px, pose] of poses) { x.save(); x.translate(px * w - kw / 2, hh * 0.77 - kh); drawKid(x, kid, pose === 'happy' ? 'idle' : pose, kw, kh, s + px * 3); x.restore(); }
    };
    raf = requestAnimationFrame(loop);
    audio.play('sparkle');
    const next = () => {
      if (typed < GARDEN_SCENE_LINES[idx].length) { window.clearInterval(typer); typed = 999; text.textContent = GARDEN_SCENE_LINES[idx]; return; }
      idx++;
      if (idx >= GARDEN_SCENE_LINES.length) {
        alive = false; cancelAnimationFrame(raf); window.clearInterval(typer);
        layer.classList.add('out'); window.setTimeout(() => layer.remove(), 450);
        audio.play('heart');
        resolve();
        return;
      }
      audio.play('heart');
      say();
    };
    layer.addEventListener('click', tap(next, { sound: false, delay: 200 }));
  });
}

// ---------------------------------------------------------------- écran principal
export function openFamily(): Promise<void> {
  return new Promise((resolve) => {
    let alive = true;
    let raf = 0;
    let cleanup: () => void = () => {};
    const finish = () => { alive = false; cleanup(); resolve(); };

    const show = (): void => {
      cleanup();
      const w = world();
      const cv = h('canvas.fam-cv');
      const stage = h('div.fam-stage', cv);
      const cards = h('div.fam-cards');
      const body = h('div.screen-body.fam-body', stage, cards);
      const scr = h('div.bg-soft.fam-screen', ui.header('Le salon familial', finish), body);
      ui.showScreen(scr);

      // ---- cartes
      for (const kid of KID_IDS) {
        const st = w.family.kids[kid];
        const b = kidBondLevel(st.bond);
        const game = KID_GAME[kid];
        const best = st.games[game]?.best ?? 0;
        cards.append(h('div.fam-card',
          h('img.fam-portrait', { src: portrait(kid), alt: '' }),
          h('div.fam-info',
            h('div.fam-name', kidName(kid)),
            h('div.fam-bond', { title: 'Complicité' }, ...Array.from({ length: KID_BOND_MAX }, (_, i) => h(`span.fam-heart${i < b.level ? '.on' : i === b.level ? '.part' : ''}`, { style: i === b.level ? `--p:${Math.round(b.frac * 100)}%` : '' }, icon('heart', 18))), h('small', `Complicité ${b.level}/${KID_BOND_MAX}`)),
            h('div.fam-btns',
              h('button.btn.small.lavande', { on: { click: tap(() => void visit(kid)) } }, 'Visiter la chambre'),
              h('button.btn.small', { on: { click: tap(() => void play(kid)) } }, `Jouer · ${GAME_INFO[game].title}`),
            ),
            best ? h('small.fam-best', `Meilleur score : ${best}`) : null,
          ),
        ));
      }
      const chocBest = Math.max(0, ...KID_IDS.map((k) => w.family.kids[k].games.choc?.best ?? 0));
      cards.append(h('div.fam-card.choc',
        h('div.fam-info',
          h('div.fam-name', 'Chocolats en famille'),
          h('small', 'Tous les trois ensemble : prépare une boîte de chocolats.'),
          h('div.fam-btns', h('button.btn.small.gold', { on: { click: tap(() => void play('all')) } }, 'Jouer ensemble')),
          chocBest ? h('small.fam-best', `Meilleur score : ${chocBest}`) : null,
        )));

      // ---- scène animée
      const poses: Record<KidId, { pose: KidPose; until: number }> = { kid1: { pose: 'idle', until: 0 }, kid2: { pose: 'idle', until: 0 }, kid3: { pose: 'idle', until: 0 } };
      const catState = { pose: 'sit' as 'sit' | 'purr', until: 0 };
      const hearts: Heart[] = [];
      let nextWave = performance.now() + 4000;
      const bg = { c: null as HTMLCanvasElement | null, w: 0, h: 0 };
      const col: Record<KidId, number> = { kid2: 0.16, kid1: 0.42, kid3: 0.68 };
      cv.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const r = cv.getBoundingClientRect();
        const fx = (e.clientX - r.left) / r.width;
        const now = performance.now();
        if (w.cat.adopted && fx > 0.8) { catState.pose = 'purr'; catState.until = now + 2500; hearts.push({ x: 0.89, y: 0.55, t0: now }); audio.play('heart'); stat('world.cat.pet'); return; }
        let best: KidId = 'kid1'; let d = 9;
        for (const k of KID_IDS) { const dd = Math.abs(col[k] - fx); if (dd < d) { d = dd; best = k; } }
        poses[best] = { pose: Math.random() < 0.5 ? 'happy' : 'wave', until: now + 2200 };
        for (let i = 0; i < 3; i++) hearts.push({ x: col[best] + (Math.random() - 0.5) * 0.08, y: 0.38 - Math.random() * 0.05, t0: now + i * 120 });
        audio.play('heart', 0.9 + Math.random() * 0.3);
      });
      let last = 0;
      const loop = (t: number) => {
        if (!alive) return;
        raf = requestAnimationFrame(loop);
        if (t - last < 50) return;
        last = t;
        const r = cv.getBoundingClientRect();
        if (!r.width) return;
        const dpr = Math.min(2, texScale());
        const cw = Math.round(r.width); const ch = Math.round(r.height);
        if (cv.width !== cw * dpr || cv.height !== ch * dpr) { cv.width = cw * dpr; cv.height = ch * dpr; }
        if (!bg.c || bg.w !== cw || bg.h !== ch) { bg.c = salonBg(cw * dpr, ch * dpr); bg.w = cw; bg.h = ch; }
        const x = cv.getContext('2d')!;
        x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(bg.c, 0, 0);
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (t > nextWave && !reducedFx()) { const k = KID_IDS[Math.floor(Math.random() * 3)]; poses[k] = { pose: 'wave', until: t + 2000 }; nextWave = t + 6000 + Math.random() * 5000; }
        const s = t / 1000;
        const kw = cw * 0.3; const kh = ch * 0.86;
        for (const k of KID_IDS) {
          if (poses[k].until < t) poses[k].pose = 'idle';
          x.save(); x.translate(col[k] * cw - kw / 2, ch * 0.9 - kh); drawKid(x, k, poses[k].pose, kw, kh, s + col[k] * 5); x.restore();
        }
        if (w.cat.adopted) {
          if (catState.until < t) catState.pose = 'sit';
          const cwid = cw * 0.27;
          x.save(); x.translate(cw * 0.89 - cwid / 2, ch * 0.93 - cwid * 0.95); drawCat(x, catState.pose, cwid, cwid * 0.95, s, { collar: w.cat.equipped.collar, bed: w.cat.equipped.bed }); x.restore();
        }
        for (let i = hearts.length - 1; i >= 0; i--) {
          const hh = hearts[i]; const p = (t - hh.t0) / 1500;
          if (p > 1) { hearts.splice(i, 1); continue; }
          if (p < 0) continue;
          x.save(); x.globalAlpha = Math.sin(p * Math.PI); x.fillStyle = PAL.roseVif; x.font = '700 22px sans-serif'; x.textAlign = 'center'; x.fillText('♥', hh.x * cw, (hh.y - p * 0.2) * ch); x.restore();
        }
      };
      raf = requestAnimationFrame(loop);
      cleanup = () => { cancelAnimationFrame(raf); };
    };

    async function visit(kid: KidId): Promise<void> {
      const v = recordVisit(world(), kid, Date.now());
      save.save();
      stat('world.family.visit');
      cleanup();
      const m = await import('./castle');
      await m.openCastle(kid);
      if (v.gained) reactAuguste('family', 0.3);
      if (alive) show();
    }

    async function play(who: KidId | 'all'): Promise<void> {
      cleanup();
      if (who === 'all') await playChocolat();
      else if (KID_GAME[who] === 'bouquet') await playBouquet(who);
      else if (KID_GAME[who] === 'harmony') await playHarmony(who);
      else await playMemory(who);
      if (alive) show();
    }

    show();
    if (totalBouquets(world()) >= 1 && firstTime('scene.family.garden')) {
      window.setTimeout(() => { if (alive) void gardenScene(); }, 350);
    } else reactAuguste('family', 0.25);
  });
}
