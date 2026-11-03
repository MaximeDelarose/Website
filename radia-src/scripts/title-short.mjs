import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
for (const [w, h] of [[393, 660], [393, 852], [375, 560]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
  await page.addInitScript(() => localStorage.setItem('radia-save-v1', JSON.stringify({ v: 2, seenUpdates: ['v2'], story: { step: 12 }, levels: {} })));
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => { const s = document.querySelector('.title-screen'); const menu = document.querySelector('.title-menu').getBoundingClientRect(); const art = document.querySelector('.title-art').getBoundingClientRect(); const logo = document.querySelector('.title-logo').getBoundingClientRect(); return { sh: s.scrollHeight, ch: s.clientHeight, menuBottom: Math.round(menu.bottom), artH: Math.round(art.height), logoTop: Math.round(logo.top), vh: innerHeight }; });
  console.log(w, h, JSON.stringify(m));
  await page.screenshot({ path: `shots/title-${w}x${h}.png` });
}
await browser.close();
