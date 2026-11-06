// Statistiques de jeu : consentement, suivi, désactivation, consultation, suppression — contre le VRAI serveur (projet Supabase du site), Chromium ÉMULÉ.
// L'appareil de test est supprimé à la fin (rien ne reste). PORT=4190 node scripts/stats-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const API = 'https://euxlmipqzmvnzzyalyfn.supabase.co';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0'); const today = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 5, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: today, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
async function newPage(tag) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const calls = [];
  page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  page.on('request', (r) => { const u = r.url(); if (u.startsWith(API)) { const m = /rpc\/(radia_stats_\w+)|functions\/v1\/radia-push/.exec(u); if (m) { let b = ''; try { b = r.postData() ?? ''; } catch { /* */ } calls.push({ fn: m[1] ?? 'edge:' + (JSON.parse(b || '{}').action ?? ''), body: b }); } } });
  await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); localStorage.setItem('radia-photos-hint', '1'); localStorage.setItem('radia-standalone-welcome', '1'); }, JSON.stringify(seed));
  return { ctx, page, calls };
}
const closeAll = async (page) => { for (let i = 0; i < 6; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .dy-later, .modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await page.waitForTimeout(500); } else break; } };
const btn = (page, t) => page.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: t });

// ---------- A. invitation unique : « Non merci » = rien n'est envoyé, jamais redemandé
{
  const { ctx, page, calls } = await newPage('A');
  await page.goto(`http://localhost:${PORT}/?debug&statsDelay=0&inviteDelay=999999999`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.modal-backdrop:not(.leaving) h3, .modal-backdrop:not(.leaving) .modal-title', { timeout: 25000 }).catch(() => {});
  const shown = await page.locator('.modal-backdrop:not(.leaving)', { hasText: 'Partager mes statistiques de jeu' }).count();
  check('invitation affichée une fois (texte clair : ce qui est partagé, jamais partagé, pourquoi, qui voit, conservation)', shown === 1 && /Ce qui est partagé/.test(await page.locator('.modal-backdrop').innerText()) && /Jamais partagé/.test(await page.locator('.modal-backdrop').innerText()) && /Conservation/.test(await page.locator('.modal-backdrop').innerText()));
  await btn(page, 'Non merci').click(); await page.waitForTimeout(800);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('radia-stats-v1') || '{}'));
  check('« Non merci » : aucun identifiant créé, état « non demandé à nouveau »', st.state === 'none' && !st.device && st.asked === true);
  await page.waitForTimeout(7000);
  check('refus respecté : l\'invitation ne revient pas', (await page.locator('.modal-backdrop:not(.leaving)', { hasText: 'Partager mes statistiques' }).count()) === 0);
  check('refus : AUCUN envoi de statistiques (aucun appel radia_stats_join / beat)', !calls.some((c) => /^radia_stats_(join|beat)$/.test(c.fn)), calls.map((c) => c.fn).join(','));
  await ctx.close();
}

// ---------- B. consentement dans les Réglages, suivi, consultation, désactivation, suppression
{
  const { ctx, page, calls } = await newPage('B');
  await page.goto(`http://localhost:${PORT}/?debug&statsDelay=999999999&inviteDelay=999999999`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2500); await closeAll(page);
  check('aucun envoi avant le consentement', !calls.some((c) => /^radia_stats_/.test(c.fn)));
  await page.locator('.title-top .icon-btn[aria-label="Paramètres"]').click(); await page.waitForTimeout(900);
  await page.locator('.setting-row', { hasText: 'Statistiques de jeu' }).locator('button', { hasText: 'Gérer' }).click(); await page.waitForTimeout(800);
  check('panneau : information complète + « Partage désactivé » par défaut', /Partage désactivé/.test(await page.locator('.modal-backdrop').innerText()) && /Qui peut les voir/.test(await page.locator('.modal-backdrop').innerText()));
  await btn(page, 'Activer le partage').click(); await page.waitForTimeout(2500);
  let ls = await page.evaluate(() => JSON.parse(localStorage.getItem('radia-stats-v1') || '{}'));
  check('consentement : appareil enregistré côté serveur et état « activé » seulement après confirmation', ls.state === 'on' && /^[0-9a-f-]{36}$/.test(ls.device) && ls.secret.length >= 32 && calls.some((c) => c.fn === 'radia_stats_join'), calls.map((c) => c.fn).join(','));
  await page.waitForTimeout(1500);
  check('début de session envoyé (radia_stats_beat « start »)', calls.some((c) => c.fn === 'radia_stats_beat' && /"p_event":"start"/.test(c.body)));
  // activité réelle : toucher, puis passage en arrière-plan => dernier battement avec les secondes actives
  await page.mouse.click(200, 400); await page.waitForTimeout(4200);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(2500);
  const beats = calls.filter((c) => c.fn === 'radia_stats_beat').map((c) => JSON.parse(c.body));
  const bg = beats.find((b) => b.p_event === 'beat' && b.p_reason === 'background');
  check('passage en arrière-plan : dernier battement envoyé avec le temps actif (≈ 4 s)', !!bg && bg.p_act >= 3 && bg.p_act <= 9, bg ? `${bg.p_act} s` : 'absent');
  const n0 = calls.filter((c) => c.fn === 'radia_stats_beat').length;
  await page.waitForTimeout(6000);
  check('en arrière-plan : plus aucun envoi (pas de temps compté verrouillé / inactif)', calls.filter((c) => c.fn === 'radia_stats_beat').length === n0);
  // retour au premier plan
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(2500);
  check('retour dans le jeu : le suivi reprend', calls.filter((c) => c.fn === 'radia_stats_beat').length > n0);
  // consulter
  await btn(page, 'Voir mes données').click().catch(() => {}); // la modale des réglages est toujours ouverte
  await page.waitForTimeout(1500);
  const mine = await page.locator('.modal-backdrop:not(.leaving)').last().innerText();
  check('« Voir mes données » : temps de jeu estimé, sessions, dernière activité', /Temps de jeu total \(estimé\)/.test(mine) && /Sessions : [1-9]/.test(mine) && /Dernière activité/.test(mine), mine.replace(/\s+/g, ' ').slice(0, 140));
  await btn(page, 'Fermer').click(); await page.waitForTimeout(600);
  // désactiver
  await btn(page, 'Désactiver le partage').click(); await page.waitForTimeout(1800);
  ls = await page.evaluate(() => JSON.parse(localStorage.getItem('radia-stats-v1') || '{}'));
  check('désactivation : état « off » et serveur informé (radia_stats_pause)', ls.state === 'off' && calls.some((c) => c.fn === 'radia_stats_pause'));
  const n1 = calls.filter((c) => c.fn === 'radia_stats_beat').length; await page.mouse.click(180, 380); await page.waitForTimeout(3500);
  check('après désactivation : plus aucun envoi même en jouant', calls.filter((c) => c.fn === 'radia_stats_beat').length === n1);
  // supprimer
  await btn(page, 'Voir / supprimer mes données').click(); await page.waitForTimeout(1500); await btn(page, 'Fermer').click(); await page.waitForTimeout(700);
  await page.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: 'Supprimer' }).last().click(); await page.waitForTimeout(2500);
  ls = await page.evaluate(() => JSON.parse(localStorage.getItem('radia-stats-v1') || '{}'));
  check('suppression : appel serveur (stats-forget) et identifiant local oublié', calls.some((c) => c.fn === 'edge:stats-forget') && !ls.device && ls.state === 'none', JSON.stringify(ls).slice(0, 100));
  const back = await page.evaluate(async ([device]) => 'ok', [ls.device ?? '']);
  void back;
  await ctx.close();
}
const ko = results.filter((x) => !x).length; check('aucune erreur JS', errors.length === 0, errors.slice(0, 2).join(' | '));
console.log(`\n${results.length - ko - (errors.length ? 0 : 0)}/${results.length} OK`);
await browser.close(); process.exit(results.every(Boolean) ? 0 : 1);
