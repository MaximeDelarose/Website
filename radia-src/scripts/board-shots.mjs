// Capture la planche de validation (?planche) du jeu construit : une image par section, à l'échelle réelle. Chromium ÉMULÉ.
//   PHOTO_KEY=… PORT=4190 OUT=/chemin node scripts/board-shots.mjs      (sans PHOTO_KEY : planche avec le dessin vectoriel seul)
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190, OUT = process.env.OUT ?? 'shots', KEY = process.env.PHOTO_KEY ?? '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await b.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem('radia-save-v1', JSON.stringify({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], world: { flags: { 'rw:start-gift-v1': true } } })));
await p.goto(`http://localhost:${PORT}/?planche${KEY ? '#k=' + KEY : ''}`); await p.waitForSelector('.bd-root', { timeout: 20000 }); await p.waitForTimeout(1500);
const secs = await p.locator('.bd-sec').count(); console.log('sections', secs);
for (let i = 0; i < secs; i++) { await p.locator('.bd-sec').nth(i).screenshot({ path: `${OUT}/planche-${i + 1}.png` }); }
console.log('erreurs JS', errs.length, errs.slice(0, 3)); await b.close();
