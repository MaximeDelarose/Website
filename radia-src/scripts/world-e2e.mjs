// Parcours du hub « Mon domaine » : ouvre chaque destination puis revient.
// PHOTO_KEY=... PORT=4173 W=393 H=852 REDUCED=1 node scripts/world-e2e.mjs   (serveur preview ; REDUCED=1 : animations réduites)
// Ouvre MON MONDE, vérifie le château + les 7 cartes, ouvre CHAQUE destination (château, dressing, jardin,
// chocolaterie, famille, chat, carrière, fans) puis revient au hub.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await (await browser.newContext({ viewport: { width: +(process.env.W ?? 393), height: +(process.env.H ?? 852) }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console: ' + m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const seed = { v: 2, seenUpdates: ['v2'], story: { step: 80 }, levels: {}, hearts: 500 };
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await page.goto(`http://localhost:${process.env.PORT ?? 4173}/?debug#k=${process.env.PHOTO_KEY ?? ''}`, { waitUntil: 'networkidle' });
await sleep(2500);
const out = [];
const check = (name, ok) => { out.push(`${ok ? 'OK ' : 'KO '} ${name}`); };
// migration v2 -> v3 + fenêtre « Nouveautés »
check('migration (v >= 4)', await page.evaluate(() => window.RADIA?.save.data.v >= 4));
await page.evaluate(() => { window.RADIA.save.data.world.res.coins = 3000; window.RADIA.save.data.world.res.flowers = 50; window.RADIA.save.data.world.res.fabric = 50; window.RADIA.save.data.world.res.cocoa = 50; });
// fenêtres d'accueil (Nouveautés, puis cadeau du jour qui s'affiche tout seul une fois par session) : on les ferme
for (let i = 0; i < 8; i++) {
  await sleep(900);
  await page.evaluate(() => document.querySelectorAll('.dy-back').forEach((e) => e.remove()));
  const b = page.locator('.modal-backdrop:not(.leaving) .actions button');
  if (await b.count()) { await b.first().click(); await sleep(400); }
}
if (process.env.REDUCED) await page.evaluate(() => { window.RADIA.save.data.settings.reducedMotion = true; document.documentElement.classList.add('reduced-motion'); });
await page.getByText('MON MONDE').first().click();
await sleep(1200);
await page.screenshot({ path: `shots/w-hub${process.env.REDUCED ? '-reduced' : ''}-${process.env.H ?? 852}.png` });
check('hub : château + bouton ENTRER', (await page.locator('.hub-stage canvas').count()) > 0 && (await page.locator('.hub-enter').count()) === 1);
check('hub : 7 cartes illustrées', (await page.locator('.hub-grid .hub-card').count()) === 7);
check('hub : début des cartes visible sans défilement', await page.evaluate(() => { const r = document.querySelector('.hub-grid .hub-card')?.getBoundingClientRect(); return !!r && r.top < innerHeight - 40; }));
check('hub : pas de défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
const dests = ['Château', 'Dressing', 'Jardin', 'Chocolaterie', 'Famille', 'Chat', 'Carrière', 'Fans'];
// (le château est le bouton ENTRER ; les autres sont des cartes de la grille)
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
