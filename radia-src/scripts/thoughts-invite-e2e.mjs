// Invitation « Une petite pensée pour toi, chaque jour ♡ » (première ouverture de l'application installée), avec API de notification SIMULÉES.
// Aucun vrai push n'est joignable ici : la réception réelle sur l'iPhone installé reste à vérifier à la main (Réglages → « Tester maintenant »).
// PORT=4190 node scripts/thoughts-invite-e2e.mjs
import { chromium } from 'playwright';
import { createECDH, randomBytes } from 'node:crypto';
const PORT = process.env.PORT ?? 4190;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0');
const ec = () => { const e = createECDH('prime256v1'); e.generateKeys(); return e.getPublicKey().toString('base64url'); };
const PUB = ec(); const P256 = ec(); const AUTH = randomBytes(16).toString('base64url');
const seedBase = (extra = {}) => ({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 5, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 }, ...extra } });

async function open(o = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  const calls = { register: [], unregister: [], key: 0, failReg: !!o.failReg };
  await page.route('**/rest/v1/rpc/radia_push_public_key', (r) => { calls.key++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PUB) }); });
  await page.route('**/rest/v1/rpc/radia_push_register', (r) => { calls.register.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: !calls.failReg }) }); });
  await page.route('**/rest/v1/rpc/radia_push_unregister', (r) => { calls.unregister.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }); });
  await page.addInitScript(([s, standalone, answer, perm0, hasSub, p256, auth]) => {
    if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s);
    try { localStorage.setItem('radia-photos-hint', '1'); localStorage.setItem('radia-standalone-welcome', '1'); } catch { /* ignoré */ } // dialogues propres à l'application installée (testés ailleurs) : ici, installation « complète »
    if (standalone) Object.defineProperty(navigator, 'standalone', { get: () => true });
    window.__perm = perm0; window.__asked = 0; window.__askedInClickTask = null; window.__unsub = 0;
    // la demande d'autorisation doit partir DANS le tour d'événement du toucher (condition d'iOS) : on le mesure
    window.__inClick = false; document.addEventListener('click', () => { window.__inClick = true; setTimeout(() => { window.__inClick = false; }, 0); }, true);
    Object.defineProperty(Notification, 'permission', { get: () => window.__perm, configurable: true });
    Notification.requestPermission = async () => { window.__asked++; window.__askedInClickTask = window.__inClick; window.__perm = answer; return window.__perm; };
    const mk = () => ({ endpoint: 'https://web.push.apple.com/QWxhZGRpbjpvcGVuIHNlc2FtZQ-demo-endpoint-123456', unsubscribe: async () => { window.__unsub++; window.__sub = null; return true; }, getKey: (k) => { const b64 = k === 'p256dh' ? p256 : auth; const t = b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4); return Uint8Array.from(atob(t), (c) => c.charCodeAt(0)).buffer; } });
    window.__sub = hasSub ? mk() : null;
    PushManager.prototype.getSubscription = async function () { return window.__sub; };
    PushManager.prototype.subscribe = async function (opt) { window.__subOpts = { userVisibleOnly: opt.userVisibleOnly, keyLen: opt.applicationServerKey.byteLength }; window.__sub = mk(); return window.__sub; };
  }, [JSON.stringify(o.seed ?? seedBase()), o.standalone !== false, o.answer ?? 'granted', o.perm ?? 'default', !!o.hasSub, P256, AUTH]);
  await page.goto(`http://localhost:${PORT}/?debug${o.query ?? '&inviteDelay=1200'}`, { waitUntil: 'networkidle' });
  return { ctx, page, calls };
}
const card = (page) => page.locator('.ti-card');
const waitCard = (page, ms = 15000) => page.waitForSelector('.ti-card', { timeout: ms }).then(() => true).catch(() => false);
const settings = async (page) => { await page.locator('button[aria-label="Paramètres"]').first().click(); await page.waitForSelector('.settings-screen'); await page.waitForTimeout(900); };
const state = (page) => page.evaluate(() => window.RADIA.save.data.fun.pensee);
const reload = async (page) => { await page.evaluate(() => window.RADIA.save.writeNow()); await page.reload({ waitUntil: 'networkidle' }); };

// ------------------------------------------------------------- A. acceptation : tout en un geste
{
  const { ctx, page, calls } = await open();
  const shown = await waitCard(page);
  check('A. première ouverture dans l\'application installée : l\'invitation apparaît', shown);
  const t = shown ? await card(page).innerText() : '';
  check('A. titre exact « Une petite pensée pour toi, chaque jour ♡ »', /Une petite pensée pour toi, chaque jour ♡/.test(t));
  check('A. texte exact : Auguste aimerait t\'envoyer une petite pensée quotidienne pour te souhaiter une belle journée', /Auguste aimerait t’envoyer une petite pensée quotidienne pour te souhaiter une belle journée\./.test(t));
  check('A. bouton rose « Recevoir mes petites pensées ♡ » et option discrète « Plus tard »', (await card(page).locator('button.ti-yes', { hasText: 'Recevoir mes petites pensées ♡' }).count()) === 1 && (await card(page).locator('button.ti-later', { hasText: 'Plus tard' }).count()) === 1);
  check('A. AUCUNE demande d\'autorisation tant qu\'elle n\'a pas touché le bouton', (await page.evaluate(() => window.__asked)) === 0 && calls.register.length === 0);
  await page.screenshot({ path: '/tmp/claude-0/da/ti-card.png' });
  await card(page).locator('button.ti-yes').click(); await page.waitForTimeout(1500);
  check('A. la demande native est lancée IMMÉDIATEMENT par le toucher (même tour d\'événement : condition d\'iOS)', (await page.evaluate(() => window.__asked)) === 1 && (await page.evaluate(() => window.__askedInClickTask)) === true);
  check('A. autorisation acceptée → abonnement créé (clé VAPID 65 octets, userVisibleOnly) sans autre manipulation', await page.evaluate(() => window.__subOpts && window.__subOpts.userVisibleOnly === true && window.__subOpts.keyLen === 65));
  check('A. abonnement ENREGISTRÉ côté serveur (adresse Apple, clés, fuseau, heure)', calls.register.length === 1 && /^https:\/\/web\.push\.apple\.com\//.test(calls.register[0].p_endpoint) && calls.register[0].p_p256dh.length >= 80 && calls.register[0].p_auth.length >= 16 && !!calls.register[0].p_tz && calls.register[0].p_hour === 9, JSON.stringify({ tz: calls.register[0]?.p_tz, h: calls.register[0]?.p_hour }));
  check('A. confirmation affichée seulement après l\'enregistrement : « C\'est activé ♡ »', /C’est activé ♡/.test(await card(page).innerText()));
  check('A. état enregistré : acceptée', (await state(page)).state === 'accepted');
  await card(page).locator('button.ti-yes').click(); await page.waitForTimeout(500);
  check('A. la carte se ferme', (await card(page).count()) === 0);
  await settings(page);
  check('A. Réglages : « Activées ♡ », avec « Désactiver » toujours possible', /Activées ♡/.test(await page.locator('.push-row').innerText()) && (await page.locator('.push-row button', { hasText: 'Désactiver' }).count()) === 1);
  await page.screenshot({ path: '/tmp/claude-0/da/ti-settings-on.png' });
  await page.locator('.push-row button', { hasText: 'Désactiver' }).click(); await page.waitForTimeout(1000);
  check('A. désactivation : désabonnement de l\'appareil ET suppression côté serveur', (await page.evaluate(() => window.__unsub)) >= 1 && calls.unregister.length === 1);
  await reload(page); await page.waitForTimeout(4000);
  check('A. après rechargement : l\'invitation ne revient JAMAIS (même après désactivation)', (await card(page).count()) === 0);
  await ctx.close();
}
// ------------------------------------------------------------- B. « Plus tard »
{
  const { ctx, page, calls } = await open();
  await waitCard(page);
  await card(page).locator('button.ti-later').click(); await page.waitForTimeout(800);
  check('B. « Plus tard » : carte fermée, aucune demande, rien enregistré côté serveur', (await card(page).count()) === 0 && (await page.evaluate(() => window.__asked)) === 0 && calls.register.length === 0 && calls.key === 0);
  check('B. état « plus tard » enregistré', (await state(page)).state === 'later');
  await reload(page); await page.waitForTimeout(5000);
  check('B. après rechargement : pas redemandé automatiquement', (await card(page).count()) === 0 && (await page.evaluate(() => window.__asked)) === 0);
  await settings(page);
  check('B. Réglages : « Activer » reste disponible', (await page.locator('.push-row button', { hasText: 'Activer' }).count()) === 1);
  await ctx.close();
}
// ------------------------------------------------------------- C. refus
{
  const { ctx, page, calls } = await open({ answer: 'denied' });
  await waitCard(page);
  await card(page).locator('button.ti-yes').click(); await page.waitForTimeout(1200);
  check('C. refus d\'iOS : son choix est respecté, message rassurant, rien enregistré', /Pas de souci/.test(await card(page).innerText()) && calls.register.length === 0 && (await state(page)).state === 'refused');
  await card(page).locator('button.ti-yes').click(); await page.waitForTimeout(500);
  await reload(page); await page.waitForTimeout(5000);
  check('C. après un refus : jamais redemandé (la demande native n\'a eu lieu qu\'une fois)', (await card(page).count()) === 0 && (await page.evaluate(() => window.__asked)) === 0);
  await settings(page);
  check('C. Réglages : l\'état « refusées » est expliqué (réactivation par les réglages de l\'iPhone)', /(désactiv|refus|Réglages de l’iPhone|Réglages de l'iPhone)/i.test(await page.locator('.push-row').innerText()), (await page.locator('.push-row').innerText()).replace(/\s+/g, ' ').slice(0, 120));
  await ctx.close();
}
// ------------------------------------------------------------- D. onglet Safari (non installée) : jamais d'invitation
{
  const { ctx, page } = await open({ standalone: false });
  const shown = await waitCard(page, 9000);
  check('D. dans Safari (application non installée) : aucune invitation, aucune demande', !shown && (await page.evaluate(() => window.__asked)) === 0);
  await ctx.close();
}
// ------------------------------------------------------------- E. déjà refusées par le système / déjà abonnée
{
  const e = await open({ perm: 'denied' });
  check('E. notifications déjà refusées dans iOS : aucune invitation', !(await waitCard(e.page, 8000)));
  await e.ctx.close();
  const f = await open({ perm: 'granted', hasSub: true });
  check('E. déjà abonnée : aucune invitation, et l\'état devient « acceptée »', !(await waitCard(f.page, 8000)) && (await f.page.evaluate(() => window.RADIA.save.data.fun.pensee.state)) === 'accepted');
  await f.ctx.close();
}
// ------------------------------------------------------------- F. échec côté serveur : jamais « activées » à tort
{
  const { ctx, page, calls } = await open({ failReg: true });
  await waitCard(page);
  await card(page).locator('button.ti-yes').click(); await page.waitForTimeout(1500);
  check('F. échec d\'enregistrement serveur : message honnête, abonnement local annulé, jamais « activées »', /Pas pour l’instant/.test(await card(page).innerText()) && (await page.evaluate(() => window.__unsub)) === 1 && (await state(page)).state === 'error');
  await card(page).locator('button.ti-yes').click(); await page.waitForTimeout(400);
  await settings(page);
  check('F. Réglages : « Activer » proposé pour réessayer, pas « Activées »', !/Activées ♡/.test(await page.locator('.push-row').innerText()) && (await page.locator('.push-row button', { hasText: 'Activer' }).count()) === 1);
  await ctx.close();
}
// ------------------------------------------------------------- G. jamais par-dessus une autre fenêtre ; pas avant 20 s en conditions réelles
{
  const seed = seedBase(); seed.seenUpdates = ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9']; // la fenêtre « Nouveautés » s'affiche au démarrage
  const { ctx, page } = await open({ seed });
  await page.waitForTimeout(6000);
  check('G. une fenêtre « Nouveautés » est ouverte : l\'invitation attend (jamais par-dessus)', (await page.locator('.modal-backdrop:not(.ti-back)').count()) >= 1 && (await card(page).count()) === 0);
  await page.locator('.modal-backdrop .actions button').last().click(); await page.waitForTimeout(500);
  check('G. dès que la fenêtre est fermée, l\'invitation apparaît (une seule)', (await waitCard(page, 15000)) && (await page.locator('.ti-card').count()) === 1);
  await ctx.close();
  const t0 = Date.now();
  const r = await open({ query: '' }); // délai réel : 20 s minimum
  await r.page.waitForTimeout(12000);
  check('G. en conditions réelles : pas avant 20 secondes de jeu', (await card(r.page).count()) === 0);
  const ok = await waitCard(r.page, 22000);
  check('G. …puis l\'invitation apparaît dans les premières minutes', ok && Date.now() - t0 >= 18000, `${Math.round((Date.now() - t0) / 1000)} s`);
  await r.ctx.close();
}
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
