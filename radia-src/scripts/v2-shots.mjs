// Captures de la mise à jour v2 : node scripts/v2-shots.mjs (serveur preview sur 4173)
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const shot = async (n) => { await page.screenshot({ path: `shots/v2-${n}.png` }); console.log('shot', n); };
// partie v1 existante au niveau 8 → migration + nouveautés
await page.addInitScript(() => {
  if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', JSON.stringify({ v: 1, hearts: 260, story: { step: 24, stepKey: 'level:8', history: [], choices: {} }, levels: {} }));
});
await page.goto('http://localhost:4173/?debug', { waitUntil: 'networkidle' });
await sleep(1600);
await shot('0-whatsnew');
await page.locator('.modal-backdrop .actions button').first().click();
await sleep(500);
await shot('1-title');
await page.getByText('CONTINUER').first().click();
await sleep(900);
for (let i = 0; i < 20; i++) {
  const b = page.locator('.modal-backdrop:not(.leaving) .actions button');
  if (await b.count()) { await b.first().click(); await sleep(400); } else break;
}
await sleep(1500);
for (let i = 0; i < 10; i++) { await page.evaluate(() => window.RADIA.game().scene.getScene('merge').debugBotStep()); await sleep(200); }
await sleep(900);
await shot('2-board');
await page.locator('.mh-bottom .shop-btn').click();
await sleep(900);
await shot('3-shop');
await page.locator('.pack').nth(2).click();
await sleep(200);
await page.locator('.pay-btn').click();
await sleep(1000);
await shot('4-paying');
await sleep(2300);
await shot('5-paid');
await page.locator('.pay-thanks').click();
await sleep(900);
await shot('6-after');
await page.locator('.shop-tabs button').nth(1).click();
await sleep(500);
await shot('7-spend');
await page.locator('.shop-tabs button').nth(2).click();
await sleep(400);
await page.locator('.spend-row').nth(1).locator('button').click();
await sleep(500);
await page.locator('.shop-head .icon-btn').click();
await sleep(900);
await shot('8-goldboard');
console.log('diamonds', await page.evaluate(() => window.RADIA.save.data.economy.diamonds), 'v', await page.evaluate(() => window.RADIA.save.data.v));
console.log('errors', errs);
await browser.close();
