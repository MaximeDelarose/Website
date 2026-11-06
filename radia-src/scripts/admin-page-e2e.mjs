// Page administrateur (radia-admin.html) : parcours complet avec le serveur SIMULÉ (routes réseau) — Chromium ÉMULÉ, JAMAIS un vrai Safari iOS ni une vraie connexion Google.
//   (cd .. && python3 -m http.server 4310 --bind 127.0.0.1) &   puis   SITE=http://127.0.0.1:4310 node scripts/admin-page-e2e.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE ?? 'http://127.0.0.1:4310', PAGE = `${SITE}/radia-admin.html`;
const API = 'https://euxlmipqzmvnzzyalyfn.supabase.co', KEY = 'sb-euxlmipqzmvnzzyalyfn-auth-token';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (exp) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'ad000000-0000-4000-8000-000000000001', role: 'authenticated', email: 'fcrdaug@gmail.com', exp })}.sig`;
const now = () => Math.floor(Date.now() / 1000);
const session = (expOff = 3600) => ({ access_token: jwt(now() + expOff), refresh_token: 'rt', expires_at: now() + expOff, expires_in: expOff, token_type: 'bearer', user: { id: 'ad000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'fcrdaug@gmail.com', app_metadata: { provider: 'google' }, user_metadata: {}, created_at: '2026-11-02T00:00:00Z' } });
const adminData = (devices) => ({ now: new Date().toISOString(), devices, retention: { sessions_days: 90, days_days: 400, idle_device_days: 180 } });
const device = { id: '11111111-2222-4333-8444-555555555555', short: '11111111', label: 'iPhone de Radia', platform: 'pwa', tz: 'Europe/Paris', consent_at: new Date(Date.now() - 864e5).toISOString(), paused_at: null, first_seen: new Date(Date.now() - 864e5).toISOString(), last_seen: new Date(Date.now() - 120e3).toISOString(), total_s: 5400, sessions_total: 6, today_s: 1500, week_s: 4100, sessions_today: 2, last_open: new Date(Date.now() - 1800e3).toISOString(), last_session: { started_at: new Date(Date.now() - 1800e3).toISOString(), last_activity: new Date(Date.now() - 120e3).toISOString(), active_s: 1320, ended_at: null, end_reason: null, live: false }, days: [{ day: '2026-11-06', active_s: 1500, sessions: 2 }, { day: '2026-11-05', active_s: 2600, sessions: 4 }], sessions: [{ started_at: new Date(Date.now() - 1800e3).toISOString(), last_activity: new Date(Date.now() - 120e3).toISOString(), active_s: 1320, ended_at: null, end_reason: null, live: false }] };

async function open(label, { storage, rpc, extra, blockLib } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; const net = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('request', (r) => { if (r.url().startsWith(API)) net.push(r.method() + ' ' + r.url().replace(API, '')); });
  if (storage) await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [KEY, JSON.stringify(storage)]);
  if (blockLib) await page.route('**/supabase-2.45.4.min.js', (r) => r.abort());
  await page.route(`${API}/rest/v1/rpc/radia_stats_admin`, rpc ?? ((r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminData([device])) })));
  if (extra) await extra(page);
  return { ctx, page, errs, net, text: async () => (await page.locator('#app').innerText()).replace(/\s+/g, ' ') };
}
const stuck = async (page) => /^Chargement/.test((await page.locator('#app').innerText()).trim());

// 1. pas connecté
{ const t = await open('1'); const t0 = Date.now(); await t.page.goto(PAGE); await t.page.waitForSelector('button:has-text("Se connecter avec Google")', { timeout: 8000 }).catch(() => {});
  check('pas connecté : bouton « Se connecter avec Google » affiché (et plus « Chargement… »)', (await t.page.locator('button', { hasText: 'Se connecter avec Google' }).count()) === 1 && !(await stuck(t.page)), `${Date.now() - t0} ms`);
  check('pas connecté : aucune donnée affichée, aucun appel de statistiques', !/Dernière ouverture/.test(await t.text()) && !t.net.some((n) => /radia_stats_admin/.test(n)));
  // 2. clic Google : redirection OAuth correcte (PKCE, retour sur la page)
  let authUrl = ''; await t.page.route(`${API}/auth/v1/authorize**`, (r) => { authUrl = r.request().url(); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google (simulé)</p>' }); });
  await t.page.locator('button', { hasText: 'Se connecter avec Google' }).click(); await t.page.waitForTimeout(2500);
  const u = authUrl ? new URL(authUrl) : null;
  check('clic Google : redirection vers le service d\'authentification avec provider=google, PKCE et retour sur la page admin', !!u && u.searchParams.get('provider') === 'google' && !!u.searchParams.get('code_challenge') && u.searchParams.get('redirect_to') === PAGE, u ? u.searchParams.get('redirect_to') : 'aucune redirection');
  const st = await t.ctx.storageState(); const verifier = st.origins.some((o) => o.origin === new URL(PAGE).origin && o.localStorage.some((x) => x.name === KEY + '-code-verifier'));
  check('clic Google : le code de vérification PKCE est mémorisé pour le retour', verifier);
  check('aucune erreur JavaScript (1)', t.errs.length === 0, t.errs.join(' | ')); await t.ctx.close(); }

// 3-5. retour de Google avec un code, tableau de bord, actualisation, réouverture
{ let tokenCalls = 0; const t = await open('3', { storage: null, extra: async (page) => {
    await page.addInitScript((k) => { if (!sessionStorage.getItem('v')) { localStorage.setItem(k + '-code-verifier', 'v'.repeat(60)); sessionStorage.setItem('v', '1'); } }, KEY);
    await page.route(`${API}/auth/v1/token**`, (r) => { tokenCalls++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session()) }); });
  } });
  await t.page.goto(`${PAGE}?code=abc123`); await t.page.waitForSelector('text=iPhone de Radia', { timeout: 8000 }).catch(() => {});
  const tx = await t.text();
  check('retour de Google : session ouverte et tableau de bord affiché', tokenCalls === 1 && /iPhone de Radia/.test(tx) && !(await stuck(t.page)), `échanges ${tokenCalls} : ${t.net.join(' | ')}`);
  check('tableau de bord : dernière ouverture, dernière activité, durée de la dernière session, sessions du jour, jour / semaine / total', ['Dernière ouverture', 'Dernière activité', 'Durée active', 'Sessions aujourd', 'aujourd’hui', 'cette semaine', 'premier lancement'].every((w) => tx.includes(w)), tx.slice(0, 120));
  check('durées affichées lisiblement (jour 25 min, dernière session 22 min, semaine 1 h 08, total 1 h 30)', /25 min/.test(tx) && /22 min/.test(tx) && /1 h 08/.test(tx) && /1 h 30/.test(tx), tx.slice(tx.indexOf('Durée'), tx.indexOf('Durée') + 160));
  check('le code d\'autorisation est retiré de l\'adresse', !(t.page.url().includes('code=')), t.page.url());
  check('estimation clairement indiquée', /ESTIMATION/.test(tx));
  const stored = await t.page.evaluate((k) => !!JSON.parse(localStorage.getItem(k) || 'null')?.access_token, KEY);
  check('session enregistrée sur l\'appareil (persistance Safari)', stored);
  const tok1 = tokenCalls;
  await t.page.reload(); await t.page.waitForSelector('text=iPhone de Radia', { timeout: 8000 }).catch(() => {});
  check('actualisation de la page : toujours connecté, statistiques rechargées, sans nouvelle connexion', /iPhone de Radia/.test(await t.text()) && tokenCalls === tok1);
  const p2 = await t.ctx.newPage(); await p2.route(`${API}/rest/v1/rpc/radia_stats_admin`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminData([device])) })); await p2.goto(PAGE); await p2.waitForSelector('text=iPhone de Radia', { timeout: 8000 }).catch(() => {});
  check('réouverture après fermeture de l\'onglet (même stockage) : tableau de bord directement', /iPhone de Radia/.test(await p2.locator('#app').innerText()));
  await t.page.locator('button', { hasText: 'Se déconnecter' }).click(); await t.page.waitForTimeout(800);
  check('« Se déconnecter » : retour à l\'écran de connexion et session effacée', (await t.page.locator('button', { hasText: 'Se connecter avec Google' }).count()) === 1 && !(await t.page.evaluate((k) => localStorage.getItem(k), KEY)));
  check('aucune erreur JavaScript (3)', t.errs.length === 0, t.errs.join(' | ')); await t.ctx.close(); }

// 5b. retour de Google mais l'échange du code échoue (code déjà utilisé / vérificateur perdu)
{ const t = await open('5b', { extra: async (page) => { await page.addInitScript((k) => { if (!sessionStorage.getItem('v')) { localStorage.setItem(k + '-code-verifier', 'v'.repeat(60)); sessionStorage.setItem('v', '1'); } }, KEY); await page.route(`${API}/auth/v1/token**`, (r) => r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'invalid flow state, no valid flow state found' }) })); } }); await t.page.goto(`${PAGE}?code=dejautilise`); await t.page.waitForSelector('button:has-text("Se connecter avec Google")', { timeout: 10000 }).catch(() => {});
  check('retour de Google avec un code refusé : explication et nouveau bouton de connexion (pas de blocage)', /connexion n’a pas pu être terminée/.test(await t.text()) && (await t.page.locator('button', { hasText: 'Se connecter avec Google' }).count()) === 1 && !t.page.url().includes('code='), (await t.text()).slice(0, 110)); await t.ctx.close(); }

// 6. connecté mais personne n'a consenti
{ const t = await open('6', { storage: session(), rpc: (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminData([])) }) }); await t.page.goto(PAGE); await t.page.waitForSelector('text=Aucune donnée disponible', { timeout: 8000 }).catch(() => {});
  check('aucune joueuse n\'a consenti : message « Aucune donnée disponible » (pas de chargement infini)', /Aucune donnée disponible/.test(await t.text()) && !(await stuck(t.page)), (await t.text()).slice(0, 100)); await t.ctx.close(); }

// 7. autorisation refusée (compte non administrateur)
{ const t = await open('7', { storage: session(), rpc: (r) => r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'P0001', message: 'not_admin', details: null, hint: null }) }) }); await t.page.goto(PAGE); await t.page.waitForSelector('text=Accès refusé', { timeout: 8000 }).catch(() => {});
  const tx = await t.text(); check('compte non autorisé : « Accès refusé » avec explication, aucune donnée', /Accès refusé/.test(tx) && /réservé au créateur/.test(tx) && !/Dernière ouverture/.test(tx)); 
  check('… et un bouton pour se déconnecter / changer de compte', (await t.page.locator('button', { hasText: 'Se déconnecter' }).count()) >= 1); await t.ctx.close(); }
{ const t = await open('7b', { storage: session(), rpc: (r) => r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'permission denied for function radia_stats_admin' }) }) }); await t.page.goto(PAGE); await t.page.waitForSelector('text=Accès refusé', { timeout: 8000 }).catch(() => {});
  check('permission refusée par le serveur (42501) : « Accès refusé »', /Accès refusé/.test(await t.text())); await t.ctx.close(); }

// 8. erreur réseau puis « Réessayer »
{ let fail = true; const t = await open('8', { storage: session(), rpc: (r) => (fail ? r.abort('failed') : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminData([device])) })) }); await t.page.goto(PAGE); await t.page.waitForSelector('button:has-text("Réessayer")', { timeout: 10000 }).catch(() => {});
  const tx = await t.text(); check('erreur réseau : explication compréhensible et bouton « Réessayer »', /Pas de connexion au serveur|Impossible de charger/.test(tx) && (await t.page.locator('button', { hasText: 'Réessayer' }).count()) === 1 && !(await stuck(t.page)), tx.slice(0, 90));
  check('… avec « Détails techniques » (version, navigateur, étapes)', /Détails techniques/.test(tx));
  fail = false; await t.page.locator('button', { hasText: 'Réessayer' }).click(); await t.page.waitForSelector('text=iPhone de Radia', { timeout: 8000 }).catch(() => {});
  check('« Réessayer » : le tableau de bord s\'affiche', /iPhone de Radia/.test(await t.text())); await t.ctx.close(); }

// 9. le serveur ne répond jamais : jamais de « Chargement… » infini
{ const t = await open('9', { storage: session(), rpc: () => { /* jamais de réponse */ } }); const t0 = Date.now(); await t.page.goto(PAGE); await t.page.waitForSelector('button:has-text("Réessayer")', { timeout: 25000 }).catch(() => {});
  const dt = Date.now() - t0; check('serveur muet : message « Le service ne répond pas » + « Réessayer » en moins de 20 s', /ne répond pas|trop de temps/.test(await t.text()) && dt < 20000 && !(await stuck(t.page)), `${(dt / 1000).toFixed(1)} s`); await t.ctx.close(); }

// 10. session expirée, renouvellement refusé
{ const t = await open('10', { storage: session(-100), extra: async (p) => { await p.route(`${API}/auth/v1/token**`, (r) => r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid Refresh Token' }) })); } }); await t.page.goto(PAGE); await t.page.waitForSelector('button:has-text("Se connecter avec Google")', { timeout: 10000 }).catch(() => {});
  check('session expirée et renouvellement refusé : retour à la connexion avec explication', /expiré|reconnecte/i.test(await t.text()) && (await t.page.locator('button', { hasText: 'Se connecter avec Google' }).count()) === 1); await t.ctx.close(); }
// 11. erreur renvoyée par Google
{ const t = await open('11'); await t.page.goto(`${PAGE}?error=access_denied&error_description=Annul%C3%A9`); await t.page.waitForSelector('button:has-text("Se connecter avec Google")', { timeout: 8000 }).catch(() => {});
  check('retour de Google en erreur : message explicite et bouton de connexion', /Annul/.test(await t.text()) && (await t.page.locator('button', { hasText: 'Se connecter avec Google' }).count()) === 1); await t.ctx.close(); }
// 12. bibliothèque de connexion bloquée
{ const t = await open('12', { blockLib: true }); await t.page.goto(PAGE); await t.page.waitForTimeout(2500);
  check('bibliothèque bloquée : explication + « Réessayer » (jamais « Chargement… »)', /bibliothèque/.test(await t.text()) && (await t.page.locator('button', { hasText: 'Réessayer' }).count()) === 1 && !(await stuck(t.page))); await t.ctx.close(); }

console.log(`\n${results.filter(Boolean).length}/${results.length} OK`); await browser.close(); process.exit(results.every(Boolean) ? 0 : 1);
