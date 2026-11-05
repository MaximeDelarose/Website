// Fiches de ressources (appui long) : vrais touchers CDP, Chromium ÉMULÉ (pas un vrai iPhone). PORT=4190 node scripts/resource-info-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const URL = `http://localhost:${PORT}/?debug`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} [${tag}] ${name}${extra ? ' — ' + extra : ''}`); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6'], story: { step: 9999 }, levels: {}, hearts: 321, economy: { energy: 40, diamonds: 70, energyAt: Date.now(), bag: [], bagSlots: 6 }, world: { flags: { 'rw:start-gift-v1': true }, res: { coins: 610, flowers: 5, fabric: 0, cocoa: 5 } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };

async function run(H) {
  tag = `393×${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  const cdp = await ctx.newCDPSession(page);
  const sleep = (ms) => page.waitForTimeout(ms);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
  await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
  await page.goto(URL, { waitUntil: 'networkidle' }); await sleep(2500);
  const closeModals = async () => { for (let i = 0; i < 8; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await sleep(400); } else break; } };
  await closeModals();
  const center = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const longPress = async (sel, ms = 650) => { const c = await center(sel); await touch('touchStart', c.x, c.y); await sleep(ms); await touch('touchEnd', c.x, c.y); await sleep(350); };
  const shortTap = async (sel) => { const c = await center(sel); await touch('touchStart', c.x, c.y); await touch('touchEnd', c.x, c.y); await sleep(600); };
  const card = () => page.locator('.ri-card');
  const inView = async () => { const b = await card().boundingBox(); return !!b && b.x >= 0 && b.y >= 0 && b.x + b.width <= 393 && b.y + b.height <= H; };

  // --- écran titre : diamants et énergie
  await longPress('.title-top button[aria-label="Diamants"]');
  check('titre : appui long sur les diamants ouvre la fiche', (await card().count()) === 1 && /Diamants/.test(await card().innerText()));
  check('titre : le solde affiché est le vrai solde (70)', /\b70\b/.test(await card().locator('.ri-bal').innerText()));
  check('titre : la boutique ne s\'est PAS ouverte en même temps', (await page.locator('.shop-balance').count()) === 0);
  check('titre : la fiche tient dans l\'écran', await inView());
  await card().locator('.ri-x').click(); await sleep(400);
  check('titre : fermer revient à l\'écran précédent', (await card().count()) === 0 && (await page.locator('.title-screen').count()) === 1);
  await shortTap('.title-top button[aria-label="Diamants"]');
  check('titre : l\'appui court garde son comportement (boutique)', (await page.locator('.shop-balance').count()) === 1 && (await card().count()) === 0);
  await page.reload({ waitUntil: 'networkidle' }); await sleep(2500); await closeModals();

  // --- partie (mode libre) : énergie, cœurs, diamants, pièces
  await page.getByText('MODE LIBRE').first().click(); await sleep(2500); await closeModals();
  await page.waitForSelector('.res-row', { timeout: 10000 }).catch(() => {});
  for (const [label, re, bal] of [['Énergie', /Énergie/, null], ['Cœurs', /Cœurs/, '321'], ['Diamants', /Diamants/, '70'], ['Pièces', /Pièces/, '610']]) {
    if (!(await page.locator(`.res-row button[aria-label="${label}"]`).count())) { check(`partie : compteur ${label} présent`, false); continue; }
    await longPress(`.res-row button[aria-label="${label}"]`);
    const ok = (await card().count()) === 1 && re.test(await card().innerText());
    check(`partie : appui long « ${label} » → fiche`, ok);
    if (ok && bal) check(`partie : « ${label} » affiche ${bal}`, (await card().locator('.ri-bal').innerText()).replace(/\s/g, '') === bal);
    check(`partie : « ${label} » — la fiche ne déborde pas`, ok && (await inView()));
    check(`partie : « ${label} » — la fiche liste de vraies méthodes (≥ 2)`, ok && (await card().locator('li').count()) >= 2);
    if (ok) { await page.mouse.click(196, H - 6).catch(() => {}); await sleep(450); check(`partie : « ${label} » — toucher à côté referme la fiche`, (await card().count()) === 0); }
  }
  // ressource à zéro (énergie) et valeur actualisée
  await page.evaluate(() => { const s = window.RADIA.save.data.economy; s.energy = 0; s.energyAt = Date.now() + 3_600_000; window.RADIA.save.data.hearts = 999; });
  await sleep(1300);
  const hudE = (await page.locator('.res-row button[aria-label="Énergie"] span').first().innerText()).replace(/\s/g, '');
  await longPress('.res-row button[aria-label="Énergie"]');
  const cardE = (await card().locator('.ri-bal').innerText()).replace(/\s/g, '');
  check('énergie presque à zéro : la fiche affiche la même valeur que le compteur', (await card().count()) === 1 && Number(cardE) <= 1 && Math.abs(Number(cardE) - Number(hudE)) <= 1, `fiche ${cardE} / compteur ${hudE}`);
  await card().locator('.ri-x').click(); await sleep(400);
  await longPress('.res-row button[aria-label="Cœurs"]');
  check('valeur actualisée : 999 cœurs', (await card().locator('.ri-bal').innerText()).replace(/\s/g, '') === '999');
  await card().locator('.ri-x').click(); await sleep(400);
  // toucher une case du plateau juste après : le plateau répond toujours
  const sel = await page.evaluate(() => { const g = window.RADIA.game(); const s = g.scene.getScene('merge'); return { run: g.scene.isActive('merge'), paused: g.scene.isPaused('merge') }; });
  check('après fermeture : le plateau est toujours actif', sel.run && !sel.paused);
  // un appui court (relâché avant 500 ms) ne montre pas la fiche
  await shortTap('.res-row button[aria-label="Cœurs"]');
  check('appui court : pas de fiche', (await card().count()) === 0);
  // un glissé pendant l'appui annule l'appui long
  const c = await center('.res-row button[aria-label="Diamants"]');
  await touch('touchStart', c.x, c.y); await touch('touchMove', c.x + 40, c.y + 30); await sleep(650); await touch('touchEnd', c.x + 40, c.y + 30); await sleep(300);
  check('glissé : pas de fiche', (await card().count()) === 0);
  await page.evaluate(() => { window.RADIA.save.data.hearts = 321; });
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
