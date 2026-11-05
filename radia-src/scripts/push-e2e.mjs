// Notifications quotidiennes (côté application) avec API de notification SIMULÉES : consentement, enregistrement serveur confirmé,
// refus, échec serveur, désactivation, test d'envoi, petites pensées (carte, historique, doublons). Aucun vrai push n'est possible ici :
// la réception réelle sur iPhone est à vérifier avec le bouton « Tester maintenant ». PORT=4190 node scripts/push-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0');
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 5, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
import { createECDH, randomBytes } from 'node:crypto';
const ec = () => { const e = createECDH('prime256v1'); e.generateKeys(); return e.getPublicKey().toString('base64url'); };
const PUB = ec(); const P256 = ec(); const AUTH = randomBytes(16).toString('base64url'); // clés valides (65 octets) générées pour le test

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, ...(opts.ua ? { userAgent: opts.ua } : {}) });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  const calls = { register: [], unregister: [], test: [], key: 0 };
  await page.route('**/rest/v1/rpc/radia_push_public_key', (r) => { calls.key++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PUB) }); });
  await page.route('**/rest/v1/rpc/radia_push_register', (r) => { calls.register.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: !calls.failRegister }) }); });
  await page.route('**/rest/v1/rpc/radia_push_unregister', (r) => { calls.unregister.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }); });
  await page.route('**/functions/v1/radia-push', (r) => { calls.test.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }); });
  await page.addInitScript(([s, standalone, answer, p256, auth]) => {
    if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s);
    if (standalone) Object.defineProperty(navigator, 'standalone', { get: () => true });
    // API de notification SIMULÉES (le vrai push n'est pas joignable depuis ce test)
    window.__perm = window.__perm || 'default'; window.__asked = 0; window.__unsub = 0; window.__sub = null;
    Object.defineProperty(Notification, 'permission', { get: () => window.__perm, configurable: true });
    Notification.requestPermission = async () => { window.__asked++; window.__perm = answer; return window.__perm; };
    const mk = () => ({ endpoint: 'https://web.push.apple.com/QWxhZGRpbjpvcGVuIHNlc2FtZQ-demo-endpoint-123456', getKey: (k) => { const b64 = k === 'p256dh' ? p256 : auth; const t = b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4); return Uint8Array.from(atob(t), (c) => c.charCodeAt(0)).buffer; }, unsubscribe: async () => { window.__unsub++; window.__sub = null; return true; } });
    PushManager.prototype.getSubscription = async function () { return window.__sub; };
    PushManager.prototype.subscribe = async function (o) { window.__subOpts = { userVisibleOnly: o.userVisibleOnly, keyLen: o.applicationServerKey.byteLength }; window.__sub = mk(); return window.__sub; };
  }, [JSON.stringify(seed), opts.standalone !== false, opts.answer ?? 'granted', P256, AUTH]);
  await page.goto(`http://localhost:${PORT}/?debug${opts.query ?? ''}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
  return { ctx, page, calls };
}
const closeModals = async (page) => { for (let i = 0; i < 6; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await page.waitForTimeout(400); } else break; } };
const openSettings = async (page) => { await page.locator('button[aria-label="Paramètres"]').first().click(); await page.waitForSelector('.settings-screen'); await page.waitForTimeout(900); };
const row = (page) => page.locator('.push-row');

// ---- 1. consentement : jamais de demande automatique ; activation volontaire
{
  const { ctx, page, calls } = await newPage(); await closeModals(page);
  check('aucune demande d\'autorisation au lancement', (await page.evaluate(() => window.__asked)) === 0 && calls.key === 0);
  await openSettings(page);
  check('Réglages : « Petite pensée du jour ♡ » avec le bouton Activer', (await row(page).innerText()).includes('Petite pensée du jour') && (await row(page).locator('button', { hasText: 'Activer' }).count()) === 1);
  check('toujours aucune demande d\'autorisation en ouvrant les Réglages', (await page.evaluate(() => window.__asked)) === 0);
  await row(page).locator('button', { hasText: 'Activer' }).click(); await page.waitForTimeout(600);
  check('explication claire avant la demande (1 par jour, jamais la nuit, arrêt possible)', /une seule notification par jour/i.test(await page.locator('.modal-backdrop').innerText()));
  check('l\'autorisation n\'est pas encore demandée tant que Radia n\'a pas confirmé', (await page.evaluate(() => window.__asked)) === 0);
  await page.locator('.modal-backdrop .actions button', { hasText: 'Activer' }).click(); await page.waitForTimeout(1500);
  check('autorisation demandée UNE fois, après le toucher', (await page.evaluate(() => window.__asked)) === 1);
  check('abonnement créé avec la clé VAPID publique (65 octets) et userVisibleOnly', await page.evaluate(() => window.__subOpts && window.__subOpts.userVisibleOnly === true && window.__subOpts.keyLen === 65));
  check('abonnement enregistré côté serveur : adresse, clés, fuseau, heure', calls.register.length >= 1 && /^https:\/\/web\.push\.apple\.com\//.test(calls.register[0].p_endpoint) && calls.register[0].p_p256dh.length >= 80 && !!calls.register[0].p_tz && calls.register[0].p_hour === 9);
  check('« Activées ♡ » affiché seulement après la confirmation du serveur', /Activées ♡/.test(await row(page).innerText()));
  check('boutons « Tester maintenant » et « Désactiver » proposés', (await row(page).locator('button').allInnerTexts()).join() === 'Tester maintenant,Désactiver');
  await row(page).locator('button', { hasText: 'Tester maintenant' }).click(); await page.waitForTimeout(700);
  check('« Tester maintenant » demande un envoi réel pour CET appareil', calls.test.length === 1 && calls.test[0].action === 'test' && /web\.push\.apple\.com/.test(calls.test[0].endpoint));
  await page.screenshot({ path: 'shots/push-settings.png' });
  await row(page).locator('button', { hasText: 'Désactiver' }).click(); await page.waitForTimeout(900);
  check('Désactiver : abonnement supprimé côté serveur ET désabonné sur l\'appareil', calls.unregister.length === 1 && (await page.evaluate(() => window.__unsub)) === 1);
  check('après désactivation : « Activer » de nouveau proposé, plus de « Activées »', !/Activées/.test(await row(page).innerText()) && (await row(page).locator('button', { hasText: 'Activer' }).count()) === 1);
  await ctx.close();
}
// ---- 2. échec serveur : jamais « activées » à tort
{
  const { ctx, page, calls } = await newPage(); calls.failRegister = true; await closeModals(page); await openSettings(page);
  await row(page).locator('button', { hasText: 'Activer' }).click(); await page.waitForTimeout(500); await page.locator('.modal-backdrop .actions button', { hasText: 'Activer' }).click(); await page.waitForTimeout(1500);
  check('serveur qui refuse : aucun « Activées », l\'abonnement local est annulé', !/Activées/.test(await row(page).innerText()) && (await page.evaluate(() => window.__unsub)) >= 1);
  check('message honnête : activation impossible, rien n\'a été activé', (await page.getByText('Activation impossible').count()) >= 1);
  await ctx.close();
}
// ---- 3. permission refusée
{
  const { ctx, page } = await newPage({ answer: 'denied' }); await closeModals(page); await openSettings(page);
  await row(page).locator('button', { hasText: 'Activer' }).click(); await page.waitForTimeout(500); await page.locator('.modal-backdrop .actions button', { hasText: 'Activer' }).click(); await page.waitForTimeout(1500);
  check('refus : message clair, rien d\'activé, pas d\'abonnement', (await page.getByText('Notifications refusées').count()) >= 1 && !/Activées/.test(await row(page).innerText()) && (await page.evaluate(() => window.__sub)) === null);
  check('refus : explication pour les autoriser dans les Réglages de l\'iPhone', /Réglages de l’iPhone/.test(await row(page).innerText()));
  await ctx.close();
}
// ---- 4. iPhone dans Safari (non installée) : expliqué, aucun bouton
{
  const { ctx, page } = await newPage({ standalone: false, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  await closeModals(page); await openSettings(page);
  check('Safari (non installée) : explication « application installée », aucun bouton Activer', /Sur l’écran d’accueil/.test(await row(page).innerText()) && (await row(page).locator('button').count()) === 0);
  await ctx.close();
}
// ---- 5. petites pensées : cartes, historique, doublons
{
  const { ctx, page } = await newPage({ query: '' }); await closeModals(page);
  await page.evaluate(async () => { const c = await caches.open('rthoughts'); for (const [at, text] of [[Date.now() - 86400000, 'Qu’Allah veille sur toi aujourd’hui.'], [Date.now(), 'Petit rappel doux du jour : tu es précieuse ♡']]) await c.put('/__thought/' + at, new Response(JSON.stringify({ at, text, idx: 3 }), { headers: { 'content-type': 'application/json' } })); });
  await page.goto(`http://localhost:${PORT}/?debug&pensee=1`, { waitUntil: 'networkidle' }); await page.waitForTimeout(3500);
  check('ouverture depuis la notification : petite carte avec la dernière pensée', /Petit rappel doux du jour/.test(await page.locator('.modal-backdrop').innerText()) && (await page.locator('.modal-backdrop', { hasText: 'Une petite pensée' }).count()) === 1);
  const st = await page.evaluate(() => window.RADIA.save.data.fun.thoughts);
  check('les 2 pensées (même la non touchée) sont dans l\'historique', st.length === 2);
  await page.locator('.modal-backdrop .actions button', { hasText: 'Garder' }).click(); await page.waitForTimeout(600);
  check('« Garder » marque la pensée', (await page.evaluate(() => window.RADIA.save.data.fun.thoughts.filter((t) => t.kept).length)) === 1);
  check('l\'adresse est nettoyée (?pensee=1 retiré)', !/pensee=1/.test(page.url()));
  await closeModals(page);
  await page.evaluate(() => window.RADIA.save.writeNow());
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
  check('rechargement : pas de carte ni de doublon', (await page.locator('.modal-backdrop', { hasText: 'Une petite pensée' }).count()) === 0 && (await page.evaluate(() => window.RADIA.save.data.fun.thoughts.length)) === 2);
  await closeModals(page); await openSettings(page);
  await page.locator('.setting-row', { hasText: 'Petites pensées ♡' }).locator('button', { hasText: 'Voir' }).click(); await page.waitForTimeout(600);
  const list = await page.locator('.modal-backdrop').innerText();
  check('« Petites pensées ♡ » : historique lisible, la plus récente d\'abord, ♡ sur la gardée', list.indexOf('Petit rappel doux') < list.indexOf('Qu’Allah veille') && /♡ Petit rappel/.test(list));
  await ctx.close();
}
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
