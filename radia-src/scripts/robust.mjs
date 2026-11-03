import { chromium } from 'playwright';
const base = 'http://localhost:4173/?debug';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const log = (...a) => console.log(...a);
// sauvegarde au niveau 8 (commandes)
await page.addInitScript(() => {
  if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', JSON.stringify({ v: 1, story: { step: 20, choices: {}, history: [] }, levels: {} }));
});
await page.goto(base, { waitUntil: 'networkidle' });
await sleep(1500);
const step = await page.evaluate(() => window.RADIA.save.data.story.step);
log('step at load', step);
await page.getByText('CONTINUER').first().click();
await sleep(900);
for (let i = 0; i < 20; i++) { const b = page.locator('.modal-backdrop .actions button'); if (await b.count()) { await b.first().click(); await sleep(400); } else break; }
await sleep(1200);
for (let i = 0; i < 12; i++) { await page.evaluate(() => window.RADIA.game().scene.getScene('merge').debugBotStep()); await sleep(120); }
await sleep(800);
const before = await page.evaluate(() => JSON.stringify(window.RADIA.save.data.run.cells));
const scoreBefore = await page.evaluate(() => window.RADIA.save.data.run.score);
log('score before reload', scoreBefore);
await page.reload({ waitUntil: 'networkidle' });
await sleep(1500);
const afterSave = await page.evaluate(() => JSON.stringify(window.RADIA.save.data.run.cells));
log('save survives reload:', before === afterSave);
await page.getByText('CONTINUER').first().click();
await sleep(2200);
const sceneCells = await page.evaluate(() => JSON.stringify(window.RADIA.game().scene.getScene('merge').state.cells));
log('board restored identical:', sceneCells === before);
await page.screenshot({ path: 'shots/r-resumed.png' });
// redimensionnement / paysage
await page.setViewportSize({ width: 852, height: 393 });
await sleep(800);
await page.screenshot({ path: 'shots/r-landscape.png' });
await page.setViewportSize({ width: 430, height: 932 });
await sleep(800);
await page.screenshot({ path: 'shots/r-promax.png' });
await page.setViewportSize({ width: 768, height: 1024 });
await sleep(800);
await page.screenshot({ path: 'shots/r-ipad.png' });
// hors ligne : le service worker doit servir le jeu
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r && !!(r.active || r.installing || r.waiting); });
log('service worker registered:', sw);
await sleep(2500);
await ctx.setOffline(true);
await page.reload({ waitUntil: 'load' }).catch((e) => log('offline reload error', e.message));
await sleep(2500);
const offlineOk = await page.evaluate(() => !!document.querySelector('.title-screen'));
log('offline title shown:', offlineOk);
await page.screenshot({ path: 'shots/r-offline.png' });
await ctx.setOffline(false);
log('errors:', errors);
await browser.close();
