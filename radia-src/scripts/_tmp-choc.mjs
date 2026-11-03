import { chromium } from 'playwright';
const S = '/tmp/claude-0/shots/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5184/?debug', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => { const w = window.RADIA.save.data.world; w.res.cocoa = 200; w.res.flowers = 40; w.res.coins = 3000; });
page.evaluate(async () => { const m = await import('/src/ui/screens/world/chocolaterie.ts'); m.openChocolaterie(); });
await page.waitForTimeout(1500);
await page.screenshot({ path: S + 'c-atelier.png' });
await page.locator('.ch-row button', { hasText: 'Cuisiner' }).first().tap();
await page.waitForTimeout(600);
const pot = await page.locator('.ch-pot').boundingBox();
await page.screenshot({ path: S + 'c-melt0.png' });
// hold on the pot using touch events via CDP-ish: use mouse (pointer events)
await page.mouse.move(pot.x + pot.width / 2, pot.y + pot.height / 2);
await page.mouse.down();
let shot = false;
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(100);
  // release when above zone, press when below
  const heat = await page.evaluate(() => { const m = document.querySelector('.ch-gauge .mark'); return m ? parseFloat(m.style.bottom) : -1; }); if (heat < 0) break;
  if (heat > 68) await page.mouse.up(); else if (heat < 52) await page.mouse.down();
  if (i === 15 && !shot) { await page.screenshot({ path: S + 'c-melt.png' }); shot = true; }
  if (await page.locator('.ch-track').count()) break;
}
await page.mouse.up();
await page.waitForTimeout(500);
await page.screenshot({ path: S + 'c-pour0.png' });
// wait for marker near zone centre
for (let i = 0; i < 200; i++) {
  const [m, z] = await page.evaluate(() => { const t = document.querySelector('.ch-track'); const z = t.querySelector('.zone'); return [parseFloat(t.querySelector('.mark').style.left), parseFloat(z.style.left) + parseFloat(z.style.width) / 2]; });
  if (Math.abs(m - z) < 4) { await page.locator('.ch-pour').tap(); break; }
  await page.waitForTimeout(30);
}
await page.waitForTimeout(500);
await page.screenshot({ path: S + 'c-pour.png' });
await page.waitForSelector('.ch-order', { timeout: 5000 });
await page.waitForTimeout(300);
// decorate: read order via images order: sequence imgs src vs tray imgs
const seq = await page.evaluate(() => [...document.querySelectorAll('.ch-ord img')].map((i) => i.alt));
const trayBtns = await page.locator('.ch-top').all();
const srcs = await page.evaluate(() => [...document.querySelectorAll('.ch-top')].map((i) => i.getAttribute('aria-label')));
// one deliberate mistake
const wrongIdx = srcs.findIndex((s) => !seq.includes(s));
await trayBtns[wrongIdx].tap();
await page.waitForTimeout(100);
await page.screenshot({ path: S + 'c-deco-wrong.png' });
for (const s of seq) { const i = srcs.indexOf(s); await trayBtns[i].tap(); await page.waitForTimeout(450); }
await page.screenshot({ path: S + 'c-deco.png' });
await page.waitForSelector('.ch-result', { timeout: 5000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: S + 'c-result.png' });
await page.locator('.ch-result .btn').first().tap();
await page.waitForTimeout(1500);
console.log(await page.evaluate(() => JSON.stringify(window.RADIA.save.data.world.choc) + JSON.stringify(window.RADIA.save.data.world.extra)));
await page.screenshot({ path: S + 'c-dialog.png' });
for (let i = 0; i < 8 && await page.locator('.dialog-layer').count(); i++) { await page.locator('.dialog-layer').tap({ position: { x: 200, y: 400 }, force: true }); await page.waitForTimeout(400); }
// stock for box
await page.evaluate(() => { const e = window.RADIA.save.data.world.extra; for (const k of ['milk','dark','praline','white']) e['choc.stock.' + k] = 2; window.RADIA.save.data.world.choc.collection.push('praline','white'); });
await page.waitForTimeout(3500);
await page.locator('.ch-tabs button', { hasText: 'Vitrine' }).tap();
await page.waitForTimeout(400);
await page.screenshot({ path: S + 'c-vitrine.png' });
await page.locator('.ch-tabs button', { hasText: 'Coffrets' }).tap();
await page.waitForTimeout(400);
for (const n of [0, 1, 2, 3]) await page.locator('.ch-chip:not(.off)').nth(n).tap();
await page.waitForTimeout(300);
await page.screenshot({ path: S + 'c-box.png' });
await page.locator('.ch-body > button.btn.wide').tap();
await page.waitForTimeout(900);
await page.screenshot({ path: S + 'c-box-done.png' });
console.log(await page.evaluate(() => JSON.stringify(window.RADIA.save.data.world.castle.owned) + window.RADIA.save.data.world.choc.boxes));
await page.locator('.ch-reveal .btn').tap();
await page.waitForTimeout(300);
await page.locator('.ch-tabs button', { hasText: 'Boutique' }).tap();
await page.waitForTimeout(300);
await page.locator('.ch-body > button.btn.gold').tap();
await page.waitForTimeout(700);
await page.screenshot({ path: S + 'c-shop.png' });
await browser.close();
