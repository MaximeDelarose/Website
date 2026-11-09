// Invitation unique « Partager ma progression ♡ » — nouvelle joueuse ET joueuse existante (temps de jeu déjà accepté avant la mise à jour).
// Serveur SIMULÉ (routes réseau), Chromium ÉMULÉ. PORT=4190 node scripts/share-invite-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const API = 'https://euxlmipqzmvnzzyalyfn.supabase.co';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const levels = {}; for (let i = 1; i <= 5; i++) levels[i] = { stars: 3, best: 10, done: true };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 22, choices: {}, endingSeen: false, history: [] }, levels, hearts: 33, world: { flags: { 'rw:start-gift-v1': true } },
  fun: { endless2: { counters: { orders: 12, xp: 150 } } } };
const DEV = '22222222-3333-4444-8555-666666666666', SEC = 'a'.repeat(64);
const oldStats = { v: 1, state: 'on', device: DEV, secret: SEC, at: Date.now() - 5 * 864e5, asked: true };

async function newPage(tag, { stats, save = seed, url = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const calls = [];
  page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  await page.addInitScript(([s, st]) => {
    if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s);
    if (st && !localStorage.getItem('radia-stats-v1')) localStorage.setItem('radia-stats-v1', st);
    localStorage.setItem('radia-photos-hint', '1'); localStorage.setItem('radia-standalone-welcome', '1');
  }, [JSON.stringify(save), stats ? JSON.stringify(stats) : '']);
  await page.route(`${API}/**`, (r) => {
    const u = r.request().url(); let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch { /* */ }
    const name = /rpc\/(\w+)/.exec(u)?.[1] ?? (u.includes('functions/v1') ? `fn:${body.action}` : 'other');
    calls.push({ name, body });
    const j = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
    if (name === 'radia_stats_mine') return j({ ok: false, error: 'unknown' }); // sonde « serveur prêt »
    if (['radia_stats_join', 'radia_progress_join', 'radia_stats_beat', 'radia_progress_push', 'radia_progress_pause', 'radia_stats_pause'].includes(name)) return j({ ok: true });
    return j({ ok: false, error: 'unknown' });
  });
  await page.goto(`http://localhost:${PORT}/?debug&statsDelay=0${url}`, { waitUntil: 'networkidle' });
  return { ctx, page, calls };
}
const local = (page, k = 'radia-stats-v1') => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), k);
const saveJson = (page) => page.evaluate(() => localStorage.getItem('radia-save-v1'));
const closeOthers = async (page) => { for (let i = 0; i < 6; i++) { const b = page.locator('.modal-backdrop:not(.leaving):not(:has(h3:text("Partager ma progression"))) .dy-later, .modal-backdrop:not(.leaving):not(:has-text("Partager ma progression")) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await page.waitForTimeout(400); } else break; } };
const invite = (page) => page.locator('.modal-backdrop:not(.leaving)', { hasText: 'Partager ma progression' });
const waitInvite = async (page) => { await page.waitForTimeout(500); for (let i = 0; i < 40; i++) { await closeOthers(page); if (await invite(page).count()) return true; await page.waitForTimeout(700); } return false; };
const progCalls = (calls) => calls.filter((c) => /progress/.test(c.name));

// ---------- A. nouvelle joueuse : UNE confirmation active les deux partages
{
  const { ctx, page, calls } = await newPage('A');
  const shown = await waitInvite(page);
  const txt = shown ? await invite(page).innerText() : '';
  check('A. nouvelle joueuse : la demande « Partager ma progression ♡ » apparaît avec le texte demandé', shown && /Souhaites-tu partager tes statistiques de jeu avec le créateur de RADIA/.test(txt) && /temps de jeu, tes dernières sessions, ton avancée dans les chapitres, tes niveaux, tes commandes et tes réussites/.test(txt) && /changer d’avis à tout moment/.test(txt));
  check('A. deux boutons : « Oui, partager ♡ » et « Non merci »', (await invite(page).locator('.actions button').allInnerTexts()).join('|').replace(/\s+/g, ' ') === 'Oui, partager ♡|Non merci');
  check('A. avant l\'accord : aucun envoi de statistiques ni de progression', !calls.some((c) => /stats_(join|beat)|progress/.test(c.name)));
  await invite(page).locator('.actions button', { hasText: 'Oui' }).click(); await page.waitForTimeout(2500);
  const st = await local(page);
  check('A. une seule confirmation : temps de jeu ET progression activés et enregistrés', st.state === 'on' && st.prog === 'on' && st.progAsked === true && st.asked === true && !!st.device, JSON.stringify({ s: st.state, p: st.prog }));
  check('A. le serveur a confirmé les deux inscriptions', calls.some((c) => c.name === 'radia_stats_join') && calls.some((c) => c.name === 'radia_progress_join'));
  const push = calls.find((c) => c.name === 'radia_progress_push');
  check('A. l\'état actuel de la sauvegarde est synchronisé dès l\'accord', !!push && push.body.p_snap?.story?.levelsDone === 5 && push.body.p_snap?.xp?.level >= 1);
  check('A. aucun historique inventé (aucun jalon envoyé)', JSON.stringify(push?.body.p_events) === '[]');
  await ctx.close();
}
// ---------- B. nouvelle joueuse : refus
{
  const { ctx, page, calls } = await newPage('B');
  await waitInvite(page);
  await invite(page).locator('.actions button', { hasText: 'Non merci' }).click(); await page.waitForTimeout(1200);
  const st = await local(page);
  check('B. refus : mémorisé (asked, prog = off, progAsked)', st.asked === true && st.prog === 'off' && st.progAsked === true && st.state !== 'on', JSON.stringify(st).slice(0, 160));
  check('B. refus : AUCUN appel de statistiques ni de progression', !calls.some((c) => /stats_(join|beat)|progress/.test(c.name)));
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(6000); await closeOthers(page);
  check('B. refus : la demande n\'est jamais réaffichée', (await invite(page).count()) === 0 && !calls.some((c) => /stats_(join|beat)|progress/.test(c.name)));
  check('B. le refus ne touche pas la partie', (await page.evaluate(() => window.RADIA.save.data.hearts)) === 33);
  await ctx.close();
}
// ---------- C. joueuse EXISTANTE (temps de jeu déjà accepté avant la mise à jour) : une invitation « progression »
{
  const { ctx, page, calls } = await newPage('C', { stats: oldStats });
  const before = await saveJson(page);
  const shown = await waitInvite(page);
  const txt = shown ? await invite(page).innerText() : '';
  check('C. joueuse existante : une invitation « progression » apparaît à l\'ouverture', shown && /Une nouveauté/.test(txt) && /chapitres, tes niveaux, tes commandes et tes activités/.test(txt) && /ne suffit pas/.test(txt));
  check('C. son ancien accord n\'autorise PAS les nouvelles données : rien de progression envoyé avant son accord', progCalls(calls).length === 0);
  check('C. son partage du temps de jeu continue normalement', calls.some((c) => c.name === 'radia_stats_beat'));
  await invite(page).locator('.actions button', { hasText: 'Oui' }).click(); await page.waitForTimeout(2500);
  const st = await local(page);
  check('C. accord : progression activée, temps de jeu inchangé, consentements sauvegardés', st.state === 'on' && st.prog === 'on' && st.progAsked === true && st.device === DEV);
  check('C. le serveur n\'a PAS été redemandé pour le temps de jeu (pas de nouvelle inscription)', !calls.some((c) => c.name === 'radia_stats_join'));
  const push = calls.find((c) => c.name === 'radia_progress_push');
  check('C. l\'état ACTUEL de sa partie est envoyé (5 niveaux terminés, expérience, commandes)', !!push && push.body.p_snap?.story?.levelsDone === 5 && push.body.p_snap?.story?.chapter === 2 && push.body.p_snap?.free?.orders === 12 && push.body.p_snap?.xp?.xp === 150, JSON.stringify(push?.body.p_snap?.story ?? {}).slice(0, 120));
  check('C. aucun historique passé inventé : aucun jalon, résumé de session démarré à l\'accord', JSON.stringify(push?.body.p_events) === '[]' && push?.body.p_summary?.base?.orders === 12 && push?.body.p_summary?.now?.orders === 12);
  const after = await saveJson(page);
  const a = JSON.parse(before), b = JSON.parse(after);
  check('C. sa sauvegarde est intacte (histoire, niveaux, cœurs, compteurs)', JSON.stringify(a.levels) === JSON.stringify(b.levels) && a.story.step === b.story.step && a.hearts === b.hearts && JSON.stringify(a.fun.endless2.counters) === JSON.stringify(b.fun.endless2.counters));
  await ctx.close();
}
// ---------- D. joueuse existante : refus
{
  const { ctx, page, calls } = await newPage('D', { stats: oldStats });
  await waitInvite(page);
  await invite(page).locator('.actions button', { hasText: 'Non merci' }).click(); await page.waitForTimeout(1200);
  const st = await local(page);
  check('D. refus : progression « off » et jamais redemandée ; le temps de jeu reste actif', st.prog === 'off' && st.progAsked === true && st.state === 'on');
  check('D. refus : aucune donnée de progression collectée ni aucun appel serveur correspondant', progCalls(calls).length === 0);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(6000); await closeOthers(page);
  check('D. refus : l\'invitation ne revient pas', (await invite(page).count()) === 0 && progCalls(calls).length === 0);
  await ctx.close();
}
// ---------- E. ouverture depuis la notification (?partage=1)
{
  const { ctx, page, calls } = await newPage('E', { stats: oldStats, url: '&partage=1' });
  const shown = await waitInvite(page);
  check('E. toucher la notification ouvre l\'invitation (joueuse existante)', shown && !/partage=1/.test(page.url()));
  await ctx.close();
  const e2 = await newPage('E2', { stats: { ...oldStats, prog: 'on', progAsked: true }, url: '&partage=1' });
  await e2.page.waitForTimeout(6000);
  const panel = await e2.page.locator('.modal-backdrop:not(.leaving)', { hasText: 'Partager ma progression de jeu' }).count();
  check('E. déjà décidé : la notification ouvre le réglage (pas une seconde invitation)', panel >= 1 && (await invite(e2.page).locator('.actions button', { hasText: 'Oui, partager' }).count()) === 0);
  await e2.ctx.close();
}
// ---------- F. réglages : les deux partages restent indépendants
{
  const { ctx, page, calls } = await newPage('F', { stats: { ...oldStats, prog: 'on', progAsked: true } });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.RADIA.progressMod().then((m) => m.disableProgress())); await page.waitForTimeout(800);
  let st = await local(page);
  check('F. arrêter la progression laisse le temps de jeu actif', st.prog === 'off' && st.state === 'on' && calls.some((c) => c.name === 'radia_progress_pause'));
  const n = progCalls(calls).filter((c) => c.name === 'radia_progress_push').length;
  await page.waitForTimeout(2500);
  check('F. plus aucun envoi de progression après l\'arrêt', progCalls(calls).filter((c) => c.name === 'radia_progress_push').length === n);
  await page.evaluate(() => window.RADIA.statsMod().then((m) => m.disable())); await page.waitForTimeout(800);
  st = await local(page);
  check('F. arrêter le temps de jeu est indépendant', st.state === 'off' && st.prog === 'off');
  await ctx.close();
}
check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
await browser.close();
const ok = results.filter(Boolean).length; console.log(`\n${ok}/${results.length} vérifications OK`); process.exit(ok === results.length ? 0 : 1);
