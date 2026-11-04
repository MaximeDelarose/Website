// Parcours « Mode libre + domaine » : sauvegarde « 5 chapitres finis » → titre MODE LIBRE → carte du domaine →
// rénovation d'un lieu jusqu'au bout par clics (captures à chaque étape : shots/h-*.png).
// PORT=4189 H=852 node scripts/domain-e2e.mjs   (serveur preview de la build ; ?debug requis)
import { chromium } from 'playwright';
const H = +(process.env.H ?? 852);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await (await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console: ' + m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const out = [];
const check = (n, ok) => { out.push(`${ok ? 'OK ' : 'KO '} ${n}`); if (process.env.VERBOSE) console.log(out[out.length - 1]); };
const seed = { v: 2, seenUpdates: ['v2'], story: { step: 200, endingSeen: true }, levels: {}, hearts: 500 };
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await page.goto(`http://localhost:${process.env.PORT ?? 4189}/?debug`, { waitUntil: 'networkidle' });
await sleep(2500);
// fenêtres d'accueil : on ferme tout sauf l'annonce du mode libre (vérifiée avant)
let sawAnnounce = false;
for (let i = 0; i < 8; i++) {
  await sleep(800);
  await page.evaluate(() => document.querySelectorAll('.dy-back').forEach((e) => e.remove()));
  const m = page.locator('.modal-backdrop:not(.leaving)');
  if (await m.count()) {
    const top = m.last(); // la fenêtre du dessus
    const t = await top.innerText();
    if (/L'aventure continue/.test(t)) { sawAnnounce = true; await page.screenshot({ path: `shots/h-announce-${H}.png` }); await top.locator('.actions button').last().click(); await sleep(400); continue; }
    await top.locator('.actions button').first().click(); await sleep(400);
  }
}
check('annonce « L\'aventure continue ♡ » affichée', sawAnnounce);
await page.screenshot({ path: `shots/h-title-${H}.png` });
const titleTxt = await page.locator('.title-menu').innerText();
check('titre : MODE LIBRE', /MODE LIBRE/.test(titleTxt) && !/MODE CHAPITRES/.test(titleTxt));
check('titre : sous-titre « L\'aventure continue ♡ »', /L'aventure continue/.test(titleTxt));
check('titre : accès « MES CHAPITRES »', /MES CHAPITRES/.test(titleTxt));
check('titre : pas de défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
check('titre : menu entièrement visible', await page.evaluate(() => { const r = document.querySelector('.title-menu').getBoundingClientRect(); return r.bottom <= innerHeight + 2; }));
check('save : fun.free.unlocked', await page.evaluate(() => window.RADIA.save.data.fun.free.unlocked === true));
// MES CHAPITRES : carte des chapitres, sans doublon « Mode infini »
await page.getByText('MES CHAPITRES').first().click(); await sleep(900);
check('chapitres : consultables, sans bouton « Mode infini » doublon', (await page.locator('.map-chapter').count()) >= 5 && !(await page.getByText('Mode infini').count()));
await page.screenshot({ path: `shots/h-chapters-${H}.png` });
await page.locator('.screen-head .icon-btn').first().click(); await sleep(800);
// MON MONDE → carte du domaine
await page.evaluate(() => { const w = window.RADIA.save.data.world; w.res.coins = 99999; w.res.flowers = 999; w.res.fabric = 999; w.res.cocoa = 999; });
await page.getByText('MON MONDE').first().click(); await sleep(1500);
await page.screenshot({ path: `shots/h-hub-${H}.png` });
check('hub : carte du domaine', (await page.locator('.hub-domain').count()) === 1);
check('hub : 7 cartes + carte du domaine, pas de défilement horizontal', (await page.locator('.hub-grid .hub-card').count()) === 7 && (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)));
await page.locator('.hub-domain').click(); await sleep(1500);
await page.screenshot({ path: `shots/h-map-${H}.png` });
await page.screenshot({ path: `shots/h-map-full-${H}.png`, fullPage: false });
check('carte : 10 lieux', (await page.locator('.dm-node').count()) === 10);
check('carte : badge « Nouveau » réel sur le salon de thé', (await page.locator('.dm-node', { hasText: 'Salon de thé' }).locator('.dm-badge').count()) === 1);
check('carte : le Casino Royal est verrouillé', await page.locator('.dm-node.locked', { hasText: 'Casino' }).count() === 1);
// défilement de la carte
await page.evaluate(() => { const b = document.querySelector('.dm-body'); b.scrollTop = b.scrollHeight; }); await sleep(500);
await page.screenshot({ path: `shots/h-map-bottom-${H}.png` });
await page.evaluate(() => { document.querySelector('.dm-body').scrollTop = 0; });
// rénovation du Salon de thé jusqu'au bout, par clics
await page.locator('.dm-node', { hasText: 'Salon de thé' }).first().click(); await sleep(1000);
await page.screenshot({ path: `shots/h-tea-0-${H}.png`, fullPage: false });
for (let s = 0; s < 4; s++) {
  await page.evaluate(() => window.RADIA.domain.satisfy('tea')); // remplit les objectifs réels de l'étape
  await page.locator('.screen-head .icon-btn').first().click(); await sleep(700);
  await page.locator('.dm-node', { hasText: 'Salon de thé' }).first().click(); await sleep(900);
  const sw = page.locator('.dm-swatch');
  if (await sw.count()) { await sw.nth(1).click(); await sleep(700); await page.screenshot({ path: `shots/h-tea-${s}-preview-${H}.png` }); }
  await page.locator('.dm-body').evaluate((b) => { b.scrollTop = b.scrollHeight; }); await sleep(300);
  const go = page.locator('.dm-go');
  check(`étape ${s + 1} : bouton prêt`, (await go.getAttribute('class')).includes('ready'));
  await go.click({ force: true }); await sleep(1500);
  await page.screenshot({ path: `shots/h-tea-${s + 1}-reveal-${H}.png` });
  check(`étape ${s + 1} : fenêtre de récompenses`, (await page.locator('.dm-reveal').count()) === 1);
  await page.locator('.dm-reveal .actions button').click(); await sleep(700);
  await page.locator('.dm-body').evaluate((b) => { b.scrollTop = 0; }); await sleep(200);
  await page.screenshot({ path: `shots/h-tea-${s + 1}-${H}.png` });
}
check('salon de thé ouvert', await page.evaluate(() => window.RADIA.save.data.fun.places.tea.done === true));
check('récompense versée (fauteuils)', await page.evaluate(() => window.RADIA.save.data.world.castle.owned.armchair >= 2));
await page.screenshot({ path: `shots/h-tea-open-${H}.png` });
// service
const svc = page.locator('.dm-opt').first();
check('service disponible', (await svc.count()) === 1 && !(await svc.isDisabled()));
await svc.click(); await sleep(900);
check('service : délai en cours', await page.locator('.dm-opt').first().isDisabled());
await page.screenshot({ path: `shots/h-tea-service-${H}.png` });
// tous les lieux ouverts : casino
await page.locator('.screen-head .icon-btn').first().click(); await sleep(600);
await page.evaluate(() => window.RADIA.domain.completeAll()); await sleep(800);
await page.locator('.dm-body').evaluate((b) => { b.scrollTop = 0; });
await page.screenshot({ path: `shots/h-map-all-${H}.png` });
await page.locator('.dm-node.open, .dm-node', { hasText: 'Casino' }).last().click(); await sleep(1000);
await page.screenshot({ path: `shots/h-casino-open-${H}.png` });
check('casino : bouton d\'entrée', (await page.getByText('Entrer au Casino Royal').count()) === 1);
check('aucun défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
console.log(out.join('\n'));
console.log('erreurs:', errs.length ? errs : 'aucune');
await browser.close();
