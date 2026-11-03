import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await browser.newPage();
await page.goto('http://localhost:5173/dev/icon.html', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.ICONS);
const icons = await page.evaluate(() => window.ICONS);
for (const [name, url] of Object.entries(icons)) {
  writeFileSync(`public/assets/icons/${name}`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', name);
}
await browser.close();
