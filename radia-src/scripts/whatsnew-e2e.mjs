// Fenêtres « Nouveautés » : une seule fois, uniquement pour une partie existante, sans rien modifier à la partie. PORT=4190 node scripts/whatsnew-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0');
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7'], story: { step: 9999 }, levels: {}, hearts: 321, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
const modal = (t) => page.locator('.modal-backdrop', { hasText: t }).count();
check('partie existante : « Du nouveau pour toi » affiché (v8), pas la v7 déjà vue', (await modal('Du nouveau pour toi')) === 1 && (await modal('Ton téléphone a changé')) === 0);
check('texte : Personnaliser Radia, Snapchien, énergie 100, petite pensée — sans spoil', await page.locator('.modal-backdrop').first().evaluate((e) => /Personnaliser Radia/.test(e.innerText) && /Snapchien/.test(e.innerText) && /100/.test(e.innerText) && /Petite pensée du jour/.test(e.innerText)));
await page.locator('.modal-backdrop .actions button').last().click(); await page.waitForTimeout(500);
const hearts = await page.evaluate(() => window.RADIA.save.data.hearts);
check('la partie n\'est pas modifiée', hearts === 321);
await page.evaluate(() => window.RADIA.save.writeNow()); await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
check('après rechargement : la fenêtre ne revient pas', (await modal('Du nouveau pour toi')) === 0);
// partie neuve : aucune fenêtre de nouveautés
const ctx2 = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
const p2g = await ctx2.newPage(); await p2g.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' }); await p2g.waitForTimeout(3000);
check('partie neuve : pas de fenêtre « Nouveautés »', (await p2g.locator('.modal-backdrop', { hasText: 'Du nouveau pour toi' }).count()) === 0);
check('aucune erreur JS', errors.length === 0, errors.join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
