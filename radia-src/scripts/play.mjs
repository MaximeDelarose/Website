// Petit pilote Playwright : node scripts/play.mjs <scenario> [out-prefix]
import { chromium } from 'playwright';
const [scenario = 'title', prefix = 'shots/play'] = process.argv.slice(2);
const base = process.env.URL ?? 'http://localhost:5173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') { errors.push(m.text()); console.log('[console.error]', m.text()); } });
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
const shot = async (n) => { await page.screenshot({ path: `${prefix}-${n}.png` }); console.log('shot', `${prefix}-${n}.png`); };
const sleep = (ms) => page.waitForTimeout(ms);
const clickText = async (t) => { await page.getByText(t, { exact: false }).first().click(); };
if (process.env.AUTO_MG) await page.addInitScript(() => { window.__RADIA_AUTO = true; });
if (process.env.SAVE) {
  await page.addInitScript((s) => { localStorage.setItem('radia-save-v1', s); }, process.env.SAVE);
}
await page.goto(base, { waitUntil: 'networkidle' });
await sleep(1500);
await shot('0-title');
const scenarios = {
  async finale() {
    await clickText('CONTINUER');
    const snap = async (n, wait = 0) => { await sleep(wait); await shot(n); };
    for (let k = 0; k < 120; k++) {
      await sleep(400);
      const st = await page.evaluate(() => ({
        dialog: !!document.querySelector('.dialog-layer:not(.leaving)'),
        btn: [...document.querySelectorAll('.finale-layer:not(.leaving) button')].map((b) => b.textContent),
        text: [...document.querySelectorAll('.finale-layer:not(.leaving) .finale-text, .finale-layer:not(.leaving) .finale-question')].map((p) => p.textContent.slice(0, 30)),
        menu: !!document.querySelector('.title-screen'),
      }));
      if (st.menu) { await snap('f-menu'); break; }
      if (st.dialog) { await snap(`f-${k}-dialog`); await page.locator('.dialog-layer').click({ position: { x: 200, y: 780 } }); await sleep(250); await page.locator('.dialog-layer').click({ position: { x: 200, y: 780 } }).catch(() => {}); continue; }
      if (st.btn.length) { await snap(`f-${k}-btn`, 1600); await page.locator('.finale-layer:not(.leaving) button').first().click(); await sleep(1500); continue; }
      if (st.text.length) { await snap(`f-${k}-text`, 3200); await page.locator('.finale-layer:not(.leaving)').first().click(); await sleep(900); continue; }
    }
  },
  /** Joue l'histoire automatiquement (bot) jusqu'à STOP_STEP ou un mini-jeu. */
  async auto() {
    const stopStep = Number(process.env.STOP_STEP ?? 999);
    const maxMs = Number(process.env.MAX_MS ?? 240000);
    const t0 = Date.now();
    const start = page.getByText('CONTINUER').first();
    if (await start.count()) await start.click(); else await clickText('JOUER');
    await sleep(800);
    let lastStep = -1;
    let lastShot = '';
    while (Date.now() - t0 < maxMs) {
      const st = await page.evaluate(() => {
        const R = window.RADIA;
        const step = R.save.data.story.step;
        const g = R.game();
        const merge = g.scene.getScene('merge');
        const mergeOn = !!merge && merge.sys.isActive();
        const mg = g.scene.getScenes(true).map((s) => s.sys.settings.key).filter((k) => k !== 'backdrop' && k !== 'merge');
        return { step, mergeOn, scenes: mg, dialog: !!document.querySelector('.dialog-layer:not(.leaving)'), card: !!document.querySelector('.chapter-card:not(.leaving)'),
          modal: [...document.querySelectorAll('.modal-backdrop:not(.leaving) .actions button')].map((b) => b.textContent),
          finale: !!document.querySelector('.finale-layer:not(.leaving)') };
      });
      if (st.step !== lastStep) { console.log('step', st.step, JSON.stringify(st)); lastStep = st.step; }
      if (st.step >= stopStep) break;
      if (st.scenes.some((k) => k !== 'final') && !st.mergeOn) { console.log('stop: scene', st.scenes); await shot(`auto-${st.step}-scene`); break; }
      if (st.modal.length) {
        const name = `auto-${st.step}-modal`;
        if (name !== lastShot && process.env.SHOTS) { await shot(name); lastShot = name; }
        await page.locator('.modal-backdrop:not(.leaving) .actions button').first().click();
        await sleep(350); continue;
      }
      if (st.card) { await sleep(950); await page.locator('.chapter-card').click(); await sleep(500); continue; }
      if (st.dialog) {
        const name = `auto-${st.step}-dialog`;
        if (name !== lastShot && process.env.SHOTS) { await shot(name); lastShot = name; }
        const choice = page.locator('.dialog-choices button');
        if (await choice.count()) { await choice.nth(Number(process.env.CHOICE ?? 2)).click(); await sleep(300); continue; }
        await page.locator('.dialog-layer').click({ position: { x: 200, y: 760 } }); await sleep(120); continue;
      }
      if (st.finale) {
        const b = page.locator('.finale-layer:not(.leaving) button');
        if (await b.count()) { await shot(`auto-${st.step}-finale-btn`); await b.first().click(); }
        else { await sleep(1500); await page.locator('.finale-layer:not(.leaving)').first().click({ force: true }); }
        await sleep(800); continue;
      }
      if (st.mergeOn) {
        await page.evaluate(() => window.RADIA.game().scene.getScene('merge').debugBotStep());
        await sleep(Number(process.env.STEP_MS ?? 60)); continue;
      }
      await sleep(200);
    }
    await shot('auto-end');
  },
  async title() {},
  async start() {
    await clickText('JOUER');
    await sleep(1200);
    await shot('1-intro');
    for (let i = 0; i < 40 && !(await page.getByText("C'est parti").count()); i++) { await page.mouse.click(200, 760); await sleep(350); }
    await sleep(600);
    await shot('3-level-intro');
    await clickText("C'est parti"); await sleep(1800);
    await shot('4-board');
    // tutoriel : 3 fusions par glisser-déposer
    const box = async () => page.evaluate(() => { const g = window.__RADIA_GAME; return null; });
    void box;
    const cell = async (i) => page.evaluate((i) => { const sc = window.RADIA.game().scene.getScene('merge'); return sc.cellCenter(i); }, i);
    const drag = async (a, b) => {
      const pa = await cell(a); const pb = await cell(b);
      await page.mouse.move(pa.x, pa.y); await page.mouse.down();
      for (let k = 1; k <= 8; k++) { await page.mouse.move(pa.x + (pb.x - pa.x) * k / 8, pa.y + (pb.y - pa.y) * k / 8); await sleep(16); }
      await page.mouse.up(); await sleep(600);
    };
    await drag(19, 20); await shot('5-merge1');
    await drag(21, 22); await drag(20, 22); await sleep(900);
    await shot('6-win');
  },
};
await scenarios[scenario]();
console.log('errors:', errors.length);
await browser.close();
