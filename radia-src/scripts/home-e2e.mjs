// Accueil : hiérarchie Mode / Mon monde / Casino (grands accès), Échecs + Souvenirs (secondaires), Succès en petite icône ; Casino, trophée, cadeau du jour.
// Chromium ÉMULÉ, 393×852 et 393×660. PORT=4190 node scripts/home-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} [${tag}] ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0'); const today = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

async function run(H, claimable) {
  tag = `393×${H}${claimable ? ' cadeau du jour dispo' : ''}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 5, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: claimable ? { cycle: 0, day: 1, lastKey: '2000-01-01', claimed: [], total: 0 } : { cycle: 0, day: 1, lastKey: today, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
  await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
  await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' }); await page.waitForTimeout(3500);
  const sleep = (ms) => page.waitForTimeout(ms);
  const closeDaily = async () => { for (let i = 0; i < 4; i++) { const b = page.locator('.dy-back:not(.leaving) button', { hasText: /Plus tard|Fermer/ }); if (await b.count()) { await b.first().click().catch(() => {}); await sleep(600); } } };
  if (claimable) { await sleep(1500); check('cadeau du jour disponible : la fenêtre « Un petit cadeau pour toi » s\'ouvre', (await page.locator('.dy-back').count()) >= 1); await closeDaily(); }
  const box = async (sel) => page.locator(sel).first().boundingBox();

  // ---- hiérarchie : trois grands boutons, dans l'ordre, de même largeur ; secondaires plus petits ; Succès minuscule
  const modes = page.locator('.title-menu .btn.mode');
  check('trois grands accès sur l\'accueil (histoire / Mon monde / Casino)', (await modes.count()) === 3);
  const txt = await modes.evaluateAll((els) => els.map((e) => e.querySelector('b')?.textContent?.trim() ?? ''));
  check('ordre : histoire, MON MONDE, CASINO', /MODE|CHAPITRES/.test(txt[0]) && txt[1] === 'MON MONDE' && txt[2] === 'CASINO', txt.join(' | '));
  const mb = await modes.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
  check('les trois ont la même largeur et une hauteur de grand bouton (≥ 54 px)', mb.every((m) => Math.abs(m.w - mb[0].w) < 1) && mb.every((m) => m.h >= 54), JSON.stringify(mb.map((m) => Math.round(m.h))));
  check('ils sont empilés sans chevauchement (Casino sous Mon monde sous histoire)', mb[0].y + mb[0].h <= mb[1].y + 1 && mb[1].y + mb[1].h <= mb[2].y + 1);
  const trophy = await box('.title-menu .btn.trophy');
  check('Succès : petite icône (≤ 56 px de large et de haut), plus de gros bouton « SUCCÈS »', !!trophy && trophy.width <= 56 && trophy.height <= 56 && (await page.locator('.title-menu .btn', { hasText: /^\s*SUCCÈS\s*$/ }).count()) === 0, trophy ? `${Math.round(trophy.width)}×${Math.round(trophy.height)}` : 'absent');
  check('Succès reste accessible (nom accessible « Succès »)', (await page.getByRole('button', { name: 'Succès' }).count()) === 1);
  check('le Casino est nettement plus grand que le Succès (hiérarchie)', mb[2].w > trophy.width * 5 && mb[2].h > trophy.height * 1.1);
  const row = await page.locator('.title-menu .row').first().boundingBox();
  check('Échecs et Souvenirs restent en accès secondaires, sous les grands boutons', row.y >= mb[2].y + mb[2].h - 1 && (await page.locator('.title-menu .row .btn', { hasText: 'ÉCHECS' }).count()) === 1 && (await page.locator('.title-menu .row .btn', { hasText: 'SOUVENIRS' }).count()) === 1);
  // tout tient à l'écran, rien ne déborde, les personnages gardent une taille correcte
  const all = await page.locator('.title-menu button').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { b: r.bottom, r: r.right, l: r.left }; }));
  check('tous les boutons tiennent dans l\'écran', all.every((a) => a.b <= H + 0.5 && a.l >= -0.5 && a.r <= 393.5), `bas max ${Math.round(Math.max(...all.map((a) => a.b)))} / ${H}`);
  const art = await box('.title-art canvas');
  check(`les personnages restent lisibles (≥ ${H < 700 ? 150 : 230} px de haut)`, !!art && art.height >= (H < 700 ? 150 : 230), art ? `${Math.round(art.height)} px` : 'absent');
  await page.screenshot({ path: `/tmp/claude-0/da/home-e2e-${H}${claimable ? 'd' : ''}.png` });

  // ---- cadeau du jour et accès de la barre du haut conservés
  check('barre du haut : réglages, téléphone, cadeau du jour (dans la page), énergie, diamants, boutique', (await page.locator('.title-top .icon-btn[aria-label="Paramètres"]').count()) === 1 && (await page.locator('.title-top .dy-badge').count()) === 1 && (await page.locator('.title-top .res-chip').count()) === 2 && (await page.locator('.title-top .shop-btn').count()) === 1);
  const badgeVisible = await page.locator('.dy-badge').isVisible();
  check('pastille du cadeau du jour : visible seulement quand un cadeau est à récupérer (comportement d\'origine)', badgeVisible === !!claimable && ((await page.locator('.dy-badge.on').count()) === 1) === !!claimable, badgeVisible ? 'visible' : 'masquée');
  if (claimable) { await page.locator('.dy-badge').click(); await sleep(1500); check('toucher le cadeau du jour ouvre la fenêtre des récompenses quotidiennes', (await page.locator('.dy-back').count()) >= 1); await closeDaily(); }

  // ---- Casino : sous-titre vivant, pastille, ouverture, retour à l'accueil
  const sub = await page.locator('.btn.mode.casino small').innerText();
  check('Casino : sous-titre vivant (cadeau de bienvenue à la première visite)', /bienvenue/i.test(sub), sub);
  check('Casino : pastille « Bienvenue ! »', (await page.locator('.casino-bubble.on').count()) === 1);
  await page.locator('.btn.mode.casino').click(); await sleep(2200);
  check('toucher CASINO ouvre le casino', (await page.locator('.cz-root').count()) === 1);
  const chips = await page.evaluate(() => window.RADIA.casino?.state?.().total ?? -1);
  check('le cadeau d\'ouverture gratuit est versé (tickets virtuels)', chips > 0, `${chips} tickets`);
  await page.evaluate(() => window.RADIA.casino.open()); // déjà ouvert : sans effet
  const exit = page.locator('.cz-root button[aria-label*="Quitter"], .cz-root .cz-back, .cz-root button[aria-label*="Retour"]').first();
  if (await exit.count()) { await exit.click().catch(() => {}); await sleep(1200); }
  for (let i = 0; i < 4 && (await page.locator('.cz-root').count()); i++) { const b = page.locator('.cz-root button', { hasText: /Retour|Quitter|Sortir|Fermer/ }).first(); if (await b.count()) { await b.click().catch(() => {}); await sleep(1000); } }
  check('retour du casino → l\'accueil est réaffiché', (await page.locator('.title-screen').count()) === 1 && (await page.locator('.cz-root').count()) === 0);
  check('après la première visite : plus de pastille « Bienvenue », le sous-titre indique les tickets', (await page.locator('.btn.mode.casino small').innerText()).includes('tickets'), await page.locator('.btn.mode.casino small').innerText());

  // ---- Succès : s'ouvre, puis retour
  await page.getByRole('button', { name: 'Succès' }).click(); await sleep(1200);
  check('toucher le trophée ouvre les succès', (await page.locator('.screen:not(.title-screen)').count()) >= 1 && (await page.getByText(/Succès/).count()) >= 1);
  await page.locator('button[aria-label*="Retour"], .icon-btn[aria-label="Retour"], .back-btn').first().click().catch(() => {}); await sleep(900);
  check('retour des succès → l\'accueil', (await page.locator('.title-screen').count()) === 1);
  // Mon monde et le mode principal fonctionnent toujours
  await page.locator('.btn.mode', { hasText: 'MON MONDE' }).click(); await sleep(2500);
  check('MON MONDE s\'ouvre toujours', (await page.locator('.hub-grid, .hub-card').count()) > 0);
  await ctx.close();
}
await run(852, false);
await run(660, false);
await run(852, true);
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
