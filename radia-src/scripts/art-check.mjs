// Accueil + dialogue avec les illustrations détourées. PHOTO_KEY=... node scripts/art-check.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await (await browser.newContext({ viewport: { width: 393, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.addInitScript(() => localStorage.setItem('radia-save-v1', JSON.stringify({ v: 2, seenUpdates: ['v2'], story: { step: 0 }, levels: {} })));
await page.goto('http://localhost:4173/#k=' + (process.env.PHOTO_KEY ?? ''), { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/art-title.png' });
await page.getByText('JOUER').first().click();
await page.waitForTimeout(1500);
for (let i = 0; i < 4; i++) { await page.mouse.click(200, 700); await page.waitForTimeout(600); await page.mouse.click(200, 700); await page.waitForTimeout(500); }
await page.screenshot({ path: 'shots/art-dialog.png' });
console.log('errors', errs);
await browser.close();
