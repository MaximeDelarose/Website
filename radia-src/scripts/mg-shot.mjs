// Joue réellement un mini-jeu dans le navigateur (souris = doigt) et prend des captures.
// usage: node scripts/mg-shot.mjs <puzzle|billard|chemin> [base]
import { chromium } from 'playwright';
const [id, base = 'http://localhost:5173'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: false });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) console.log('[console]', m.text()); });
await page.goto(`${base}/dev/minigames.html?g=${id}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.mgReady);
await page.waitForTimeout(900);
const scene = (key) => page.evaluate((k) => { const s = window.game.scene.getScene(k); return s ? true : false; }, key);
const tap = async (x, y) => { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); };
const sleep = (ms) => page.waitForTimeout(ms);

if (id === 'puzzle') {
  await scene('mg-puzzle');
  // un glisser-déposer réel puis des touchers
  let n = 0;
  for (let guard = 0; guard < 20; guard++) {
    const st = await page.evaluate(() => { const s = window.game.scene.getScene('mg-puzzle'); return { perm: [...s.perm], pos: s.perm.map((_, p) => s.posXY(p)) }; });
    const i = st.perm.findIndex((t, k) => t !== k);
    if (i < 0) break;
    const j = st.perm.indexOf(i);
    if (n === 0) {
      // glisser le morceau j sur la case i
      await page.mouse.move(st.pos[j].x, st.pos[j].y); await page.mouse.down();
      for (let k = 1; k <= 8; k++) await page.mouse.move(st.pos[j].x + (st.pos[i].x - st.pos[j].x) * k / 8, st.pos[j].y + (st.pos[i].y - st.pos[j].y) * k / 8);
      if (n === 0) await page.screenshot({ path: 'shots/mg-puzzle-drag.png' });
      await page.mouse.up();
    } else {
      await tap(st.pos[j].x, st.pos[j].y); await sleep(150); await tap(st.pos[i].x, st.pos[i].y);
    }
    n++;
    await sleep(420);
    if (n === 2) await page.screenshot({ path: 'shots/mg-puzzle-mid.png' });
  }
  console.log('échanges', n);
  await sleep(2600);
} else if (id === 'chemin') {
  for (let level = 0; level < 4; level++) {
    await sleep(1800);
    const info = await page.evaluate(() => {
      const s = window.game.scene.getScene('mg-chemin');
      return s.lv.tiles.map((t, i) => ({ i, c: s.center(i), lever: t.lever !== undefined, rot: t.kind === 'pipe' ? t.rot : 0, pipe: t.kind === 'pipe' }));
    });
    for (const t of info.filter((t) => t.lever)) { await tap(t.c.x, t.c.y); await sleep(450); }
    if (level === 2) await page.screenshot({ path: 'shots/mg-chemin-l3.png' });
    for (const t of info.filter((t) => t.pipe)) {
      const k = (4 - t.rot) % 4;
      for (let r = 0; r < k; r++) {
        await tap(t.c.x, t.c.y); await sleep(60);
      }
      await sleep(200);
      const won = await page.evaluate(() => window.game.scene.getScene('mg-chemin').busy);
      if (won) break;
    }
    if (level === 3) { await sleep(600); await page.screenshot({ path: 'shots/mg-chemin-win.png' }); }
    await page.waitForFunction((l) => { const s = window.game.scene.getScene('mg-chemin'); return s.li > l || s.done; }, level, { timeout: 20000 });
    console.log('niveau', level + 1, 'li=', await page.evaluate(() => window.game.scene.getScene('mg-chemin').li));
  }
  await page.waitForSelector('text=Continuer', { timeout: 20000 });
  await sleep(600);
} else if (id === 'billard') {
  // tir réel au doigt : de la blanche, glisser vers l'arrière (direction opposée à la cible)
  for (let ch = 0; ch < 3; ch++) {
    for (let shot = 0; shot < 8; shot++) {
      const st = await page.evaluate(() => {
        const s = window.game.scene.getScene('mg-billard');
        return { ch: s.challenge, done: s.done, live: s.shotLive };
      });
      if (st.ch !== ch || st.done) break;
      // meilleur tir calculé par simulation (mêmes règles que le jeu)
      const aim = await page.evaluate(() => {
        const s = window.game.scene.getScene('mg-billard');
        const W = s.w;
        const need = s.constructor && null;
        void need;
        const kind = ({ 0: 'heart', 1: 'heart', 2: 'gold' })[s.challenge];
        let best = null, bestSc = -1;
        for (let a = 0; a < 180; a++) for (const p of [0.5, 0.75, 0.95]) {
          const t = JSON.parse(JSON.stringify(W));
          const ang = a / 180 * Math.PI * 2;
          window.__bil.shoot(t, Math.cos(ang), Math.sin(ang), p); window.__bil.settle(t);
          const sc = t.balls.filter((b) => b.kind === kind && b.pocketed).length * 10 - (t.balls[0].pocketed ? 1 : 0);
          if (sc > bestSc) { bestSc = sc; best = { a: ang, p }; }
        }
        const c = W.balls.find((b) => b.kind === 'cue');
        const cs = s.toScreen(c.x, c.y);
        return { x: cs.x, y: cs.y, a: best.a, p: best.p };
      });
      const d = aim.p * 150;
      await page.mouse.move(aim.x, aim.y); await page.mouse.down();
      for (let k = 1; k <= 6; k++) await page.mouse.move(aim.x - Math.cos(aim.a) * d * k / 6, aim.y - Math.sin(aim.a) * d * k / 6);
      if (ch === 0 && shot === 0) await page.screenshot({ path: 'shots/mg-billard-aim.png' });
      await page.mouse.up();
      await page.waitForFunction(() => { const s = window.game.scene.getScene('mg-billard'); return !s.shotLive; }, null, { timeout: 15000 });
      await sleep(400);
    }
    await sleep(1800);
    console.log('défi', ch + 1, 'terminé, challenge=', await page.evaluate(() => window.game.scene.getScene('mg-billard').challenge));
  }
  await sleep(1200);
}
await page.screenshot({ path: `shots/mg-${id}-result.png` });
const btn = page.locator('button', { hasText: 'Continuer' });
if (await btn.count()) { await btn.first().click(); await sleep(500); }
console.log('résultat :', await page.evaluate(() => window.mgResult ?? '(aucun)'), 'cœurs :', await page.evaluate(() => JSON.parse(localStorage.getItem('radia-save-v1') ?? '{}').hearts));
await browser.close();
