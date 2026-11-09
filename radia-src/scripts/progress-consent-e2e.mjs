// Partage de PROGRESSION : consentement distinct, envois, arrêt, suppression — serveur SIMULÉ (routes réseau), Chromium ÉMULÉ.
//   PORT=4190 node scripts/progress-consent-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const API = 'https://euxlmipqzmvnzzyalyfn.supabase.co';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 5, world: { flags: { 'rw:start-gift-v1': true } } };
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); const calls = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); localStorage.setItem('radia-photos-hint', '1'); localStorage.setItem('radia-standalone-welcome', '1'); }, JSON.stringify(seed));
let paused = false;
await page.route(`${API}/**`, (r) => {
  const u = r.request().url(); let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch { /* */ }
  const name = /rpc\/(\w+)/.exec(u)?.[1] ?? (u.includes('functions/v1/radia-push') ? `fn:${body.action}` : 'other');
  calls.push({ name, body });
  const j = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
  if (name === 'radia_progress_join') { paused = false; return j({ ok: true }); }
  if (name === 'radia_progress_push') return j(paused ? { ok: false, error: 'paused' } : { ok: true });
  if (name === 'radia_progress_pause') { paused = true; return j({ ok: true }); }
  if (name === 'radia_progress_mine') return j({ ok: true, consent_at: new Date().toISOString(), paused_at: null, snap_at: new Date().toISOString(), events: 3, sessions: 1, snap: { story: { chapter: 1, current: { id: 1 } }, xp: { level: 1 }, free: { orders: 0 } } });
  if (name === 'fn:progress-forget') return j({ ok: true });
  return j({ ok: false, error: 'unknown' });
});
const modal = () => page.locator('.modal-backdrop:not(.leaving)');
const btn = (t) => page.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: t });
await page.goto(`http://localhost:${PORT}/?debug&statsDelay=999999999`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.RADIA?.progressUi, null, { timeout: 15000 });
await page.waitForTimeout(1500);
check('avant tout consentement : aucun appel de progression ni de statistiques', !calls.some((c) => /progress|stats/.test(c.name)), JSON.stringify(calls.map((c) => c.name)));

// panneau : information claire (on ferme d'abord les annonces d'ouverture)
for (let i = 0; i < 8; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .dy-later, .modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await page.waitForTimeout(500); } else break; }
await page.evaluate(() => window.RADIA.progressUi().then((m) => { void m.openProgressPanel(); }));
await modal().first().waitFor({ timeout: 8000 });
const info = await modal().innerText();
check('information : ce qui est enregistré / jamais / qui voit / conservation / arrêter / supprimer', /Ce qui est enregistré/.test(info) && /Jamais enregistré/.test(info) && /messages/.test(info) && /contacts/.test(info) && /position/.test(info) && /Qui peut le voir/.test(info) && /Conservation/.test(info) && /Arrêter/.test(info) && /Supprimer/.test(info));
check('le refus ne change rien : bouton Fermer disponible, état « désactivé »', /désactivé/.test(info) && (await btn('Fermer').count()) === 1);
check('rien n\'est envoyé tant que Radia n\'a pas accepté', !calls.some((c) => /progress/.test(c.name)));

await btn('Activer le partage').click(); await page.waitForTimeout(1500);
const st1 = await page.evaluate(() => JSON.parse(localStorage.getItem('radia-stats-v1') || '{}'));
check('consentement : prog = on, appareil créé, partage du TEMPS non activé (state ≠ on)', st1.prog === 'on' && !!st1.device && st1.state !== 'on', JSON.stringify({ prog: st1.prog, state: st1.state }));
check('le serveur a confirmé l\'inscription (radia_progress_join) avant l\'affichage « activé »', calls.some((c) => c.name === 'radia_progress_join'));
await page.waitForTimeout(1500);
const push = calls.find((c) => c.name === 'radia_progress_push');
check('un premier envoi de progression est parti', !!push);
const pj = JSON.stringify(push?.body ?? {});
check('l\'envoi contient chapitre / XP / compteurs (snapshot) et un résumé de session', /"story"/.test(pj) && /"xp"/.test(pj) && /"free"/.test(pj) && /p_summary/.test(pj));
check('l\'envoi ne contient ni message, ni conversation, ni contact, ni position', !/"(messages?|conversations?|contacts?|latitude|longitude|geo|location)"\s*:/i.test(pj));
check('aucun appel de temps de jeu (consentement distinct)', !calls.some((c) => /radia_stats_(join|beat)/.test(c.name)));
const q = JSON.parse(pj);
check('envoi idempotent : identifiant de session et numéro d\'ordre', /^[0-9a-f-]{36}$/.test(q.p_session) && q.p_seq === 1);
// voir mes données
await modal().last().waitFor();
await btn('Voir mes données').click(); await page.waitForTimeout(800);
check('« Voir mes données » : jalons / sessions / dernier envoi', /Jalons conservés : 3/.test(await modal().last().innerText()));
await modal().last().locator('.actions button').first().click(); await page.waitForTimeout(500);
// arrêt
await btn('Arrêter le partage').click(); await page.waitForTimeout(1200);
const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem('radia-stats-v1') || '{}'));
check('arrêt : prog = off, serveur prévenu (radia_progress_pause)', st2.prog === 'off' && calls.some((c) => c.name === 'radia_progress_pause'));
const nBefore = calls.filter((c) => c.name === 'radia_progress_push').length;
await page.waitForTimeout(2500);
check('arrêt : plus aucun envoi', calls.filter((c) => c.name === 'radia_progress_push').length === nBefore);
// réactiver puis supprimer
await btn('Activer le partage').click(); await page.waitForTimeout(1200);
await btn('Supprimer mes données').click(); await page.waitForTimeout(500);
await page.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: 'Supprimer' }).last().click(); await page.waitForTimeout(1200);
check('suppression : fonction serveur « progress-forget » avec le secret d\'appareil', calls.some((c) => c.name === 'fn:progress-forget' && c.body.device && c.body.secret));
const st3 = await page.evaluate(() => JSON.parse(localStorage.getItem('radia-stats-v1') || '{}'));
check('suppression : partage arrêté', st3.prog === 'off');
// un rechargement ne relance rien
const n2 = calls.filter((c) => c.name === 'radia_progress_push').length;
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2500);
check('après rechargement avec partage arrêté : aucun envoi', calls.filter((c) => c.name === 'radia_progress_push').length === n2);
check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
await browser.close();
const ok = results.filter(Boolean).length; console.log(`\n${ok}/${results.length} vérifications OK`); process.exit(ok === results.length ? 0 : 1);
