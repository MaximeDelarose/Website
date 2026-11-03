// Captures : sac (glisser), énergie vide, petit monde. node scripts/v2-more.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const sleep = (ms) => page.waitForTimeout(ms);
const shot = async (n) => { await page.screenshot({ path: `shots/v2m-${n}.png` }); console.log('shot', n); };
await page.addInitScript(() => localStorage.setItem('radia-save-v1', JSON.stringify({ v: 2, seenUpdates: ['v2'], hearts: 900, story: { step: 24, stepKey: 'level:8', history: [], choices: {} }, levels: {}, decor: ['bench', 'lamps', 'roses', 'fountain', 'garland'], economy: { energy: 2, energyTs: Date.now(), diamonds: 300, bag: [], bagSlots: 6, freeRefillTs: 0, freeChestTs: 0 } })));
await page.goto('http://localhost:4173/?debug', { waitUntil: 'networkidle' });
await sleep(1500);
await page.getByText('CONTINUER').first().click();
await sleep(900);
for (let i = 0; i < 10; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.first().click(); await sleep(400); } else break; }
await sleep(1500);
// toucher un générateur 3 fois (énergie 2) → panneau énergie
const gen = await page.evaluate(() => { const sc = window.RADIA.game().scene.getScene('merge'); const i = sc.state.cells.findIndex((c) => c.item && c.item.c === 'gen'); return sc.cellCenter(i); });
for (let k = 0; k < 3; k++) { await page.mouse.click(gen.x, gen.y); await sleep(450); }
await shot('1-energy');
await page.locator('.modal-backdrop .actions button').first().click();
await sleep(600);
// glisser un objet vers le sac
const it = await page.evaluate(() => { const sc = window.RADIA.game().scene.getScene('merge'); const i = sc.state.cells.findIndex((c) => c.item && c.item.c !== 'gen'); return i >= 0 ? sc.cellCenter(i) : null; });
const bag = await page.evaluate(() => { const r = document.querySelector('.bag-btn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
if (it) {
  await page.mouse.move(it.x, it.y); await page.mouse.down();
  for (let k = 1; k <= 12; k++) { await page.mouse.move(it.x + (bag.x - it.x) * k / 12, it.y + (bag.y - it.y) * k / 12); await sleep(20); }
  await page.mouse.up(); await sleep(600);
}
console.log('bag after drag', await page.evaluate(() => JSON.stringify(window.RADIA.save.data.economy.bag)));
await page.locator('.bag-btn').click();
await sleep(600);
await shot('2-bag');
await page.locator('.bag-cell:not(.empty)').first().click({ timeout: 3000 }).catch(() => {});
await sleep(800);
if (await page.locator('.modal-backdrop:not(.leaving)').count()) { await page.locator('.modal-backdrop:not(.leaving) .actions button').first().click(); await sleep(500); }
console.log('bag after take', await page.evaluate(() => JSON.stringify(window.RADIA.save.data.economy.bag)));
await shot('3-board');
// petit monde
await page.locator('.mh-top .icon-btn').first().click();
await sleep(500);
await page.getByText('Quitter vers le menu').click();
await sleep(1200);
await page.getByText('DÉCORER').click();
await sleep(1500);
await shot('4-decor');
await page.locator('.decor-row:not(.have) button').first().click();
await sleep(1500);
await shot('5-decor-bought');
console.log('decor', await page.evaluate(() => window.RADIA.save.data.decor.join(',')), 'hearts', await page.evaluate(() => window.RADIA.save.data.hearts));
console.log('errors', errs);
await browser.close();
