// Parcours du hub « Mon domaine » : ouvre chaque destination puis revient.
// PHOTO_KEY=... node scripts/world-e2e.mjs   (serveur preview sur 4173)
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console: ' + m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const seed = { v: 2, seenUpdates: ['v2'], story: { step: 80 }, levels: {}, hearts: 500 };
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await page.goto('http://localhost:4173/?debug#k=' + (process.env.PHOTO_KEY ?? ''), { waitUntil: 'networkidle' });
await sleep(2500);
const out = [];
const check = (name, ok) => { out.push(`${ok ? 'OK ' : 'KO '} ${name}`); };
// migration v2 -> v3 + fenêtre « Nouveautés »
check('migration v4', await page.evaluate(() => window.RADIA?.save.data.v === 4));
await page.evaluate(() => { window.RADIA.save.data.world.res.coins = 3000; window.RADIA.save.data.world.res.flowers = 50; window.RADIA.save.data.world.res.fabric = 50; window.RADIA.save.data.world.res.cocoa = 50; });
for (let i = 0; i < 3; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.first().click(); await sleep(500); } }
await page.getByText('MON MONDE').first().click();
await sleep(1200);
await page.screenshot({ path: 'shots/w-hub.png' });
const dests = ['Château', 'Dressing', 'Jardin', 'Chocolaterie', 'Famille', 'Chat', 'Carrière', 'Fans'];
for (const d of dests) {
  const card = page.locator('.hub-card', { hasText: d }).first();
  if (!(await card.count())) { check(`${d} : carte présente`, false); continue; }
  await card.click();
  await sleep(1800);
  // fenêtres de tutoriel / bienvenue éventuelles
  const shotName = d.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  await page.screenshot({ path: `shots/w-${shotName}.png` });
  const onHub = await page.locator('.hub-grid').count();
  check(`${d} : écran ouvert (le hub n'est plus affiché)`, onHub === 0);
  // retour
  for (let k = 0; k < 4; k++) {
    const back = page.locator('.screen-head .icon-btn').first();
    if (await page.locator('.hub-grid').count()) break;
    const modal = page.locator('.modal-backdrop:not(.leaving) .actions button');
    if (await modal.count()) { await modal.last().click(); await sleep(400); continue; }
    if (await back.count()) { await back.click(); await sleep(700); } else break;
  }
  check(`${d} : retour au hub`, (await page.locator('.hub-grid').count()) > 0);
}
console.log(out.join('\n'));
console.log('erreurs:', errs.length ? errs : 'aucune');
await browser.close();
