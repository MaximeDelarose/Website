// Transfert de la partie entre deux stockages séparés (≈ Safari ⇄ application de l'écran d'accueil) via Paramètres.
// Chromium ÉMULÉ. PORT=4190 node scripts/transfer-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190; const URL = `http://localhost:${PORT}/?debug`;
const KEY = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AB'; // clé factice de test
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5'], story: { step: 9999 }, levels: {}, hearts: 7777, world: { flags: { 'rw:start-gift-v1': true }, res: { coins: 1234, flowers: 5, fabric: 5, cocoa: 5 } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
async function open(withSave) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  if (withSave) await page.addInitScript(([s, k]) => { if (!localStorage.getItem('radia-save-v1')) { localStorage.setItem('radia-save-v1', s); localStorage.setItem('radia-k', k); } }, [JSON.stringify(seed), KEY]);
  else await page.addInitScript(() => { try { const t = setInterval(() => { const R = window.RADIA; const w = R && R.save && R.save.data && R.save.data.world; if (w) { w.flags = w.flags || {}; w.flags['rw:start-gift-v1'] = true; const fu = R.save.data.fun; if (fu) { const d = new Date(), q = (x) => String(x).padStart(2, '0'); fu.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(fu.daily || {}), lastKey: `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}` }; fu.free = { ...(fu.free || {}), announced: true }; } clearInterval(t); } }, 20); } catch (e) {} });
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
  for (let i = 0; i < 8; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await page.waitForTimeout(400); } else break; }
  return { ctx, page };
}
const openSettings = async (page) => { await page.locator('button[aria-label="Paramètres"]').first().click(); await page.waitForSelector('.settings-screen', { timeout: 5000 }); await page.waitForTimeout(500); };

// ---- « Safari » : partie avancée + clé des photos ; Paramètres affiche la vraie version
const A = await open(true);
check('« Safari » : la sauvegarde de départ est chargée', (await A.page.evaluate(() => window.RADIA.save.data.hearts)) === 7777);
await openSettings(A.page);
const label = await A.page.locator('.setting-row', { hasText: 'Version' }).first().innerText();
check('Paramètres : la version affichée est la vraie build (pas un numéro fictif)', /·/.test(label) && label.includes(await A.page.evaluate(() => window.RADIA.build.id)), label.replace(/\n/g, ' '));
// copie du code (le presse-papiers peut être refusé : le code s'affiche alors dans une fenêtre)
await A.page.locator('.setting-row', { hasText: 'Copier ma sauvegarde' }).locator('button').click();
await A.page.waitForTimeout(800);
let code = '';
if (await A.page.locator('.modal-backdrop textarea').count()) code = await A.page.locator('.modal-backdrop textarea').inputValue();
else code = await A.page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
check('un code « RADIA1: » est produit', code.startsWith('RADIA1:'), `${code.length} caractères`);
check('le code ne contient pas la clé en clair', !code.includes('AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'));
await A.ctx.close();

// ---- « application installée » : stockage vierge ; sans clé de photos, avec une partie neuve
const B = await open(false);
check('« application » : partie neuve, sans clé de photos', (await B.page.evaluate(() => window.RADIA.save.data.hearts)) !== 7777 && (await B.page.evaluate(() => localStorage.getItem('radia-k'))) === null);
await openSettings(B.page);
await B.page.locator('.setting-row', { hasText: 'Importer une sauvegarde' }).locator('button').click();
await B.page.waitForSelector('.modal-backdrop textarea', { timeout: 4000 });
// code erroné d'abord : rien ne doit changer
await B.page.locator('.modal-backdrop textarea').fill('RADIA1:abcd');
await B.page.locator('.modal-backdrop .actions button', { hasText: 'Importer' }).click(); await B.page.waitForTimeout(700);
check('code erroné refusé, partie inchangée', (await B.page.evaluate(() => window.RADIA.save.data.hearts)) !== 7777);
await B.page.locator('.setting-row', { hasText: 'Importer une sauvegarde' }).locator('button').click();
await B.page.waitForSelector('.modal-backdrop textarea', { timeout: 4000 });
await B.page.locator('.modal-backdrop textarea').fill(code);
await B.page.locator('.modal-backdrop .actions button', { hasText: 'Importer' }).click(); await B.page.waitForTimeout(700);
await B.page.locator('.modal-backdrop .actions button', { hasText: 'Remplacer' }).click();
await B.page.waitForLoadState('networkidle'); await B.page.waitForTimeout(3500);
for (let i = 0; i < 6; i++) { const b = B.page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await B.page.waitForTimeout(400); } else break; }
check('après import : cœurs / pièces identiques', (await B.page.evaluate(() => [window.RADIA.save.data.hearts, window.RADIA.save.data.world.res.coins])).join() === '7777,1234');
check('après import : la clé des photos est présente', (await B.page.evaluate(() => localStorage.getItem('radia-k'))) === KEY);
check('après import : l\'ancienne partie de l\'application est gardée de côté', (await B.page.evaluate(() => localStorage.getItem('radia-save-before-import'))) !== null);
await B.page.reload({ waitUntil: 'networkidle' }); await B.page.waitForTimeout(2500);
check('après rechargement : la partie importée est toujours là', (await B.page.evaluate(() => window.RADIA.save.data.hearts)) === 7777);
check('aucune erreur JS', errors.length === 0, errors.slice(0, 2).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
