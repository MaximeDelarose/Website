// Safari vs application installée (≈ navigator.standalone) : même build, mémoires séparées, reprise de la partie.
// Chromium ÉMULÉ (pas un vrai iPhone). PORT=4190 node scripts/standalone-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190; const URL = `http://localhost:${PORT}/?debug`;
const KEY = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AB'; // clé factice de test
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6'], story: { step: 9999 }, levels: {}, hearts: 2990, world: { flags: { 'rw:start-gift-v1': true }, res: { coins: 5474, flowers: 5, fabric: 5, cocoa: 5 } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
async function open({ standalone, withSave }) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  if (standalone) await page.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); });
  if (withSave) await page.addInitScript(([s, k]) => { if (!localStorage.getItem('radia-save-v1')) { localStorage.setItem('radia-save-v1', s); localStorage.setItem('radia-k', k); } }, [JSON.stringify(seed), KEY]);
  await page.goto(URL + (withSave ? `#k=${KEY}` : ''), { waitUntil: 'networkidle' }); await page.waitForTimeout(3200);
  return { ctx, page };
}
const closeModals = async (page, n = 6) => { for (let i = 0; i < n; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await page.waitForTimeout(400); } else break; } };
const diag = async (page) => {
  await page.locator('button[aria-label="Paramètres"]').first().click(); await page.waitForSelector('.settings-screen'); await page.waitForTimeout(500);
  await page.locator('.setting-row', { hasText: 'Diagnostic' }).locator('button').click(); await page.waitForSelector('.modal-backdrop', { timeout: 6000 }); await page.waitForTimeout(800);
  const text = await page.locator('.modal-backdrop').first().innerText();
  await page.locator('.modal-backdrop .actions button', { hasText: 'Fermer' }).click(); await page.waitForTimeout(400);
  return text;
};
const line = (t, k) => (t.match(new RegExp(`${k} : ([^\\n]*)`)) ?? [])[1] ?? '';

// ---- « Safari » : partie avancée, clé présente
const A = await open({ standalone: false, withSave: true });
const dA = await diag(A.page);
const buildA = line(dA, 'Build');
check('Safari : mode « Safari / navigateur »', /Safari \/ navigateur/.test(line(dA, 'Mode')), line(dA, 'Mode'));
check('Safari : partie existante + photos présentes', /existante/.test(line(dA, 'Partie dans ce mode')) && /présente/.test(line(dA, 'Photos \\(clé\\)')), `${line(dA, 'Partie dans ce mode')} | ${line(dA, 'Photos \\(clé\\)')}`);
check('Safari : l\'adresse du diagnostic ne contient pas la clé', !dA.includes('AbCdEfGh'));
await A.page.keyboard.press('Escape');
await A.page.locator('.settings-screen .icon-btn').first().click().catch(() => {}); await A.page.waitForTimeout(500);
await A.page.locator('button[aria-label="Paramètres"]').first().click().catch(() => {}); await A.page.waitForSelector('.settings-screen'); await A.page.waitForTimeout(400);
await A.page.locator('.setting-row', { hasText: 'Copier ma sauvegarde' }).locator('button').click(); await A.page.waitForTimeout(900);
const code = await A.page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
check('Safari : code de sauvegarde copié', code.startsWith('RADIA1:'), `${code.length} car.`);
await A.ctx.close();

// ---- « application installée » : mémoire vide, plein écran
const B = await open({ standalone: true, withSave: false });
check('application : explication de la mémoire séparée affichée au premier lancement', (await B.page.locator('.modal-backdrop', { hasText: 'mémoire à part' }).count()) === 1);
await B.page.locator('.modal-backdrop .actions button', { hasText: 'Importer ma partie' }).click(); await B.page.waitForSelector('.modal-backdrop textarea');
await B.page.locator('.modal-backdrop .btn', { hasText: 'Coller' }).click(); await B.page.waitForTimeout(600);
check('application : « Coller » remplit le code', (await B.page.locator('.modal-backdrop textarea').inputValue()).startsWith('RADIA1:'));
await B.page.locator('.modal-backdrop .actions button', { hasText: 'Importer' }).click(); await B.page.waitForTimeout(700);
await B.page.locator('.modal-backdrop .actions button', { hasText: 'Remplacer' }).click();
await B.page.waitForLoadState('networkidle'); await B.page.waitForTimeout(3800); await closeModals(B.page);
check('application : l\'explication ne revient pas après l\'import', (await B.page.locator('.modal-backdrop', { hasText: 'mémoire à part' }).count()) === 0);
const dB = await diag(B.page);
check('application : mode « APPLICATION INSTALLÉE »', /APPLICATION INSTALLÉE/.test(line(dB, 'Mode')));
check('application : MÊME build que Safari', line(dB, 'Build') === buildA && !!buildA, `${line(dB, 'Build')} vs ${buildA}`);
check('application : partie reprise + photos présentes', /existante · histoire étape 9999/.test(line(dB, 'Partie dans ce mode')) && /présente/.test(line(dB, 'Photos \\(clé\\)')), `${line(dB, 'Partie dans ce mode')} | ${line(dB, 'Photos \\(clé\\)')}`);
check('application : cœurs et pièces identiques à Safari', (await B.page.evaluate(() => [window.RADIA.save.data.hearts, window.RADIA.save.data.world.res.coins])).join() === '2990,5474');

// ---- cas réel : application installée avec SA propre partie (déjà jouée) mais SANS la clé des photos
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); });
  const mine = { ...seed, story: { step: 19 }, hearts: 55, world: { ...seed.world, res: { ...seed.world.res, coins: 692 } } };
  await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(mine));
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(3500);
  check('application avec partie mais sans clé : rappel « photos pas là » affiché (une fois)', (await page.locator('.modal-backdrop', { hasText: 'photos ne sont pas là' }).count()) === 1);
  await page.locator('.modal-backdrop .actions button', { hasText: 'Reprendre les photos' }).click(); await page.waitForSelector('.modal-backdrop textarea');
  await page.locator('.modal-backdrop textarea').fill(code);
  await page.locator('.modal-backdrop .actions button', { hasText: 'Reprendre les photos' }).click();
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(3800); await closeModals(page);
  const dC = await diag(page);
  // le test utilise une clé factice (la vraie n'est jamais dans le dépôt) : on vérifie la présence de la clé, pas un déchiffrement réel
  check('photos reprises : clé présente (déchiffrement réel à vérifier sur l\'iPhone)', /présente/.test(line(dC, 'Photos \\(clé\\)')) && !/sans clé/.test(line(dC, 'Pack de personnages')), `${line(dC, 'Photos \\(clé\\)')} | ${line(dC, 'Pack de personnages')}`);
  check('la partie de l\'application est intacte (pas remplacée)', (await page.evaluate(() => [window.RADIA.save.data.hearts, window.RADIA.save.data.story.step])).join() === '55,19');
  check('le rappel ne revient pas', (await page.locator('.modal-backdrop', { hasText: 'photos ne sont pas là' }).count()) === 0);
  await ctx.close();
}
check('aucune erreur JS', errors.length === 0, errors.slice(0, 2).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
