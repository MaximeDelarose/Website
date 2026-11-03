// Accueil : capture + cadence d'images. node scripts/title-perf.mjs (preview sur 4173)
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await (await browser.newContext({ viewport: { width: 393, height: 780 }, deviceScaleFactor: Number(process.env.DPR ?? 3), hasTouch: true, isMobile: true })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.addInitScript(() => localStorage.setItem('radia-save-v1', JSON.stringify({ v: 2, seenUpdates: ['v2'], story: { step: 70 }, memories: ['royaume'], levels: {} })));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0;
  const t0 = performance.now();
  const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); };
  requestAnimationFrame(f);
}));
console.log('rAF/s sur l\'accueil (rendu logiciel sans GPU) :', fps);
await page.screenshot({ path: 'shots/title-new.png' });
console.log('errors', errs);
await browser.close();
