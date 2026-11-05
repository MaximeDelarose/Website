// Carrière visible dans MON MONDE + récupération du salaire. Chromium ÉMULÉ (pas un vrai iPhone). PORT=4190 node scripts/career-salary-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const URL = `http://localhost:${PORT}/?debug`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} [${tag}] ${name}${extra ? ' — ' + extra : ''}`); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'], story: { step: 9999 }, levels: {}, hearts: 321, economy: { energy: 40, diamonds: 70, bag: [], bagSlots: 6 }, world: { flags: { 'rw:start-gift-v1': true }, res: { coins: 610, flowers: 5, fabric: 5, cocoa: 5 }, careers: { current: 'photo' } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };

async function run(H) {
  tag = `393×${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  const sleep = (ms) => page.waitForTimeout(ms);
  await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
  await page.goto(URL, { waitUntil: 'networkidle' }); await sleep(2500);
  const closeModals = async () => { for (let i = 0; i < 8; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await sleep(400); } else break; } };
  await closeModals();
  const coins = () => page.evaluate(() => window.RADIA.save.data.world.res.coins);
  const box = async (sel) => page.locator(sel).first().boundingBox();
  const openHub = async () => { await page.getByText('MON MONDE').first().click(); await sleep(1500); await closeModals(); };

  await openHub();
  const dress = await box('.hub-card.tone-lavande'); const car = await box('.hub-card.tone-gold');
  check('la carrière est sur la MÊME ligne que le dressing (deux premières lignes de cartes)', !!dress && !!car && Math.abs(dress.y - car.y) < 4 && car.x > dress.x, JSON.stringify([dress && Math.round(dress.y), car && Math.round(car.y)]));
  const scrollBefore = await page.evaluate(() => document.querySelector('.hub-body')?.scrollTop ?? 0);
  if (H >= 800) check('la carte Carrière est visible sans défiler (écran 852)', !!car && car.y + car.height <= H, `y=${Math.round(car.y)} h=${Math.round(car.height)} scroll=${scrollBefore}`);
  const badge = page.locator('.hub-card.tone-gold .hub-badge.b-salary');
  check('badge « Salaire prêt ! » affiché (salaire réellement prêt)', (await badge.count()) === 1 && /Salaire prêt !/.test(await badge.innerText()));
  await page.screenshot({ path: `shots/career-hub-393x${H}.png` });
  // la carte s'ouvre : bandeau en haut
  await page.locator('.hub-card.tone-gold').click(); await sleep(1500); await closeModals();
  const banner = page.locator('.car-salary.ready');
  check('écran Carrière : « Ton salaire est prêt ♡ » en haut', (await banner.count()) === 1 && /Ton salaire est prêt ♡/.test(await banner.innerText()));
  const bb = await box('.car-salary.ready'); const tb = await box('.car-top');
  check('le bandeau est visible sans défiler et ne chevauche pas la carte du dessous', !!bb && bb.y >= 0 && bb.y + bb.height <= H && bb.y + bb.height <= tb.y + 1, JSON.stringify([Math.round(bb.y), Math.round(bb.height), Math.round(tb.y)]));
  const label = await page.locator('.car-sal-big').innerText();
  const amount = Number(label.replace(/[^\d]/g, ''));
  check('le bouton porte le montant RÉEL (≠ valeur fixe 60)', amount > 0 && /Récupérer mes/.test(label), label);
  check('le texte annonce le même montant', (await banner.innerText()).replace(/\s/g, '').includes(String(amount)));
  await page.screenshot({ path: `shots/career-salary-393x${H}.png` });
  const c0 = await coins();
  await page.locator('.car-sal-big').click(); await sleep(250);
  check('animation de pièces lancée', (await page.locator('.car-coin').count()) > 0);
  await sleep(1000);
  const c1 = await coins();
  check('les pièces sont créditées EXACTEMENT du montant annoncé', c1 - c0 === amount, `${c0} → ${c1} (+${amount})`);
  check('le bandeau « salaire prêt » disparaît immédiatement', (await page.locator('.car-salary.ready').count()) === 0);
  check('message d\'Auguste « Bsahték, tu l\'as mérité ! »', (await page.getByText('Bsahték, tu l\'as mérité').count()) >= 1);
  check('à la place : le vrai délai avant le prochain salaire', /Prochain salaire dans \d/.test(await page.locator('.car-salary').innerText()));
  // pas de second versement
  await page.locator('.car-sal-big').click({ timeout: 800 }).catch(() => {});
  await page.locator('.car-sal-btn').click({ timeout: 800, force: true }).catch(() => {});
  await sleep(500);
  check('impossible de récupérer le même salaire deux fois', (await coins()) === c1);
  // retour à MON MONDE : badge disparu, compteur à jour
  await page.locator('.car-screen .screen-head .icon-btn').first().click(); await sleep(1200); await closeModals();
  check('retour MON MONDE : le badge « Salaire prêt ! » a disparu', (await page.locator('.hub-card.tone-gold .hub-badge.b-salary').count()) === 0);
  check('retour MON MONDE : le compteur de pièces est à jour', (await page.locator('.hub-res .res-chip b').first().innerText()).replace(/\s/g, '') === String(c1));
  check('la carte Carrière indique le délai restant', /Prochain salaire dans/.test(await page.locator('.hub-card.tone-gold').innerText()));
  // sauvegarde persistante
  await page.evaluate(() => window.RADIA.save.writeNow()); await page.reload({ waitUntil: 'networkidle' }); await sleep(2500); await closeModals();
  check('après rechargement : pièces conservées', (await coins()) === c1);
  await openHub();
  check('après rechargement : pas de badge (pas de second salaire)', (await page.locator('.hub-card.tone-gold .hub-badge.b-salary').count()) === 0);
  // pas de salaire prêt : aucune fausse annonce
  await page.locator('.hub-card.tone-gold').click(); await sleep(1500); await closeModals();
  check('écran Carrière sans salaire prêt : pas de bouton de récupération', (await page.locator('.car-sal-big').count()) === 0);
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
