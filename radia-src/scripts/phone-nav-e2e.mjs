// Navigation du téléphone du jeu : accueil → application → fermer → accueil → quitter → retrouver la partie Endless.
// Chromium ÉMULÉ (pas un vrai iPhone). PORT=4190 node scripts/phone-nav-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const URL = `http://localhost:${PORT}/?debug`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} [${tag}] ${name}${extra ? ' — ' + extra : ''}`); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7'], story: { step: 9999 }, levels: {}, hearts: 321, economy: { energy: 40, diamonds: 70, bag: [], bagSlots: 6 }, world: { flags: { 'rw:start-gift-v1': true }, res: { coins: 610 } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };

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
  const vis = async (sel) => { const l = page.locator(sel).first(); if (!(await l.count())) return false; const b = await l.boundingBox(); return !!b && b.width > 0; };
  const home = () => vis('.phh');
  const inView = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return !!b && b.x >= 0 && b.y >= 0 && b.x + b.width <= 393.5 && b.y + b.height <= H + 0.5; };
  const tap = async (sel) => { const l = page.locator(sel).first(); await l.click({ timeout: 4000 }); await sleep(700); };
  const board = () => page.evaluate(() => { const g = window.RADIA.game(); const s = g.scene.getScene('merge'); return s && s.state ? JSON.stringify(s.state.cells.map((c) => c && [c.c, c.l])) : null; });

  // 1-2. Endless
  await page.getByText('MODE LIBRE').first().click(); await sleep(2800); await closeModals();
  await page.waitForSelector('.res-row', { timeout: 10000 }).catch(() => {});
  const before = await board();
  check('Endless démarré (plateau présent)', !!before);
  // 3-4. téléphone → fond d'écran
  await page.locator('.mh-phone, .res-row .ph-btn, button[aria-label="Téléphone"]').first().click({ timeout: 4000 }).catch(() => page.evaluate(() => window.RADIA.phone())); await sleep(900);
  check('le téléphone s\'ouvre sur l\'ÉCRAN D\'ACCUEIL (fond d\'écran, heure, date)', (await home()) && /\d{2}:\d{2}/.test(await page.locator('.phh-time').innerText()) && (await page.locator('.phh-date').innerText()).length > 5);
  const bg = await page.locator('.phh').evaluate((e) => getComputedStyle(e).backgroundImage);
  check('un vrai fond d\'écran dessiné est affiché', /^url\("data:image\/jpeg/.test(bg), bg.slice(0, 40));
  const apps = await page.locator('.phh-app').evaluateAll((els) => els.map((e) => e.dataset.app));
  check('icônes : Messages, Snapchien, TikTak, Souvenirs, Agenda, Réglages (+ Tindeur)', ['messages', 'snap', 'clips', 'souvenirs', 'agenda', 'settings'].every((a) => apps.includes(a)), apps.join(','));
  check('icônes d\'au moins 44 px et dans l\'écran', (await page.locator('.phh-app').evaluateAll((els) => els.every((e) => { const r = e.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= 393.5; }))));
  check('dock en bas : Messages + Snapchien + TikTak', (await page.locator('.phh-dock .phh-app').count()) >= 3 && await inView('.phh-dock'));
  check('bouton « Quitter le téléphone » visible', await inView('.phh-quit'));
  await page.screenshot({ path: `shots/phone-home-393x${H}.png` });
  // badges : un snap ou un message non lu (Snapchien a 5 contacts de départ ; on force l'arrivée)
  await page.evaluate(() => window.RADIA.apps.emit && 0); // (présence de l'API)
  // 5-9. Snapchien
  await tap('.phh-app[data-app="snap"]');
  check('Snapchien s\'ouvre PAR-DESSUS le téléphone', (await page.locator('.snp-layer').count()) === 1 && (await page.locator('.ph-back').count()) === 1);
  await page.locator('.snc-row').first().click().catch(() => {}); await sleep(900);
  if (await page.locator('.snc-vx').count()) { await page.locator('.snc-vx').click(); await sleep(700); }
  if (await page.locator('.snc-thread').count()) { await page.locator('button[aria-label="Retour à la liste"]').click(); await sleep(600); }
  check('Snapchien : retour à la liste des chats', (await page.locator('.snc-list').count()) === 1);
  await page.locator('.snp-layer button[aria-label="Fermer"]').first().click(); await sleep(700);
  check('fermer Snapchien → ÉCRAN D\'ACCUEIL du téléphone (pas le jeu)', (await page.locator('.snp-layer').count()) === 0 && (await home()));
  // 10-11. TikTak
  await tap('.phh-app[data-app="clips"]');
  check('TikTak s\'ouvre', (await page.locator('.clp-layer').count()) === 1);
  await sleep(1200);
  await page.locator('.clp-layer .clp-x[aria-label="Fermer"]').first().click(); await sleep(700);
  check('fermer TikTak → ÉCRAN D\'ACCUEIL du téléphone', (await page.locator('.clp-layer').count()) === 0 && (await home()));
  // 12-14. Messages → Auguste (application façon iMessage, par-dessus le téléphone)
  await tap('.phh-app[data-app="messages"]');
  check('Messages : liste des conversations (pas de Tindeur/Snapchien mélangés)', (await page.locator('.msg-row-c').count()) >= 1 && (await page.locator('.msg-row-c[data-cid="tindeur"], .msg-row-c[data-cid="snap"]').count()) === 0);
  await page.locator('.msg-row-c[data-cid="auguste"]').click(); await sleep(600);
  check('conversation ouverte (fil de messages + saisie)', (await page.locator('.msg-thread').count()) === 1 && (await page.locator('.msg-in').count()) === 1);
  await page.locator('button[aria-label="Retour à la liste des conversations"]').click(); await sleep(400);
  check('retour de la conversation → liste (pas la fermeture de l\'application)', (await page.locator('.msg-row-c').count()) >= 1 && (await page.locator('.msg-layer').count()) === 1);
  await page.locator('button[aria-label="Écran d’accueil du téléphone"]').click(); await sleep(600);
  check('fermer Messages → écran d\'accueil du téléphone', (await page.locator('.msg-layer').count()) === 0 && await home());
  // fond d'écran : changer et conserver
  await tap('.phh-app[data-app="settings"]');
  const wpBtns = page.locator('.ph-wp button'); const nWp = await wpBtns.count();
  check('Réglages : au moins 4 fonds d\'écran au choix', nWp >= 4, String(nWp));
  await wpBtns.nth(1).click(); await sleep(500);
  const wpSaved = await page.evaluate(() => window.RADIA.save.data.fun.phone.wallpaper);
  check('le fond choisi est enregistré dans la sauvegarde', wpSaved === 'paris', wpSaved);
  await page.locator('.ph-top button[aria-label="Écran d’accueil du téléphone"]').click(); await sleep(500);
  const bg2 = await page.locator('.phh').evaluate((e) => getComputedStyle(e).backgroundImage);
  check('l\'accueil affiche le nouveau fond', bg2 !== bg);
  await page.screenshot({ path: `shots/phone-home-paris-393x${H}.png` });
  // 15-16. quitter le téléphone → retrouver exactement la partie
  await page.locator('.phh-quit').click(); await sleep(700);
  check('quitter le téléphone → retour au jeu', (await page.locator('.ph-back').count()) === 0 && (await page.locator('.res-row').count()) === 1);
  const after = await board();
  check('la partie Endless en cours est retrouvée exactement', after === before);
  const st = await page.evaluate(() => { const g = window.RADIA.game(); return { act: g.scene.isActive('merge'), pau: g.scene.isPaused('merge') }; });
  check('le plateau est toujours actif et utilisable', st.act && !st.pau);
  // rechargement : le fond d'écran persiste
  await page.evaluate(() => window.RADIA.save.writeNow()); await page.reload({ waitUntil: 'networkidle' }); await sleep(2500); await closeModals();
  check('après rechargement : fond d\'écran conservé', (await page.evaluate(() => window.RADIA.save.data.fun.phone.wallpaper)) === 'paris');
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
