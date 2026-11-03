// usage: node scripts/shot.mjs <url> <out.png> [width] [height] [scale]
import { chromium } from 'playwright';
const [url, out, w = '1800', h = '1200', sc = '1'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +sc });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
