// HUD d'un niveau avec le médaillon d'Auguste. PHOTO_KEY=... node scripts/hud-check.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.addInitScript(() => localStorage.setItem('radia-save-v1', JSON.stringify({ v: 2, seenUpdates: ['v2'], story: { step: 24, stepKey: 'level:8' }, levels: {} })));
await page.goto('http://localhost:4173/#k=' + (process.env.PHOTO_KEY ?? ''), { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByText('CONTINUER').first().click();
await page.waitForTimeout(900);
for (let i = 0; i < 10; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.first().click(); await page.waitForTimeout(400); } else break; }
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/hud.png', clip: { x: 0, y: 0, width: 393, height: 260 } });
console.log('errors', errs);
await browser.close();
