// Messages : aperçu de la liste = historique de la conversation, pour TOUS les contacts et tous les circuits d'arrivée ; badge ; rechargement.
// Chromium ÉMULÉ. PORT=4190 node scripts/messages-sync-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0');
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9'], story: { step: 9999 }, levels: {}, hearts: 5, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
const H = 3600e3;
const CONTACTS = ['auguste', 'maman', 'kid1', 'kid2', 'kid3', 'agency'];
const NAMES = { auguste: 'Auguste', maman: 'Maman', agency: 'Studio' };

const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
const sleep = (ms) => page.waitForTimeout(ms);
const openMessages = async () => { await page.locator('.phh-app[data-app="messages"]').click(); await sleep(900); };

// ---------------------------------------------------------------- 1. état de départ : fils anciens + messages hérités récents pour CHAQUE contact
await page.evaluate(() => window.RADIA.phone()); await sleep(1200);
const now = await page.evaluate(() => Date.now());
await page.evaluate(({ now, H, CONTACTS }) => {
  const s = window.RADIA.save.data; window.RADIA.messages.state();
  for (const id of CONTACTS) s.fun.apps.messages.convos[id].msgs.push(
    { id: `a${id}`, from: 'them', text: `Ancien message de ${id}`, at: now - 3 * H },
    { id: `b${id}`, from: 'me', text: 'Merci !', at: now - 3 * H + 60e3 },
    { id: `c${id}`, from: 'them', text: `Message intermédiaire de ${id}`, at: now - 2 * H });
  // messages « hérités » (système d'événements) : un par contact, plus récents que tout le reste, dans un ordre mélangé
  const L = [['auguste', 'Un petit message pour te dire de ne pas oublier de manger. Sahha !', 2 * 60e3], ['maman', 'N’oublie pas de bien manger, tu as l’air fatiguée sur les photos.', 5 * 60e3], ['kid1', 'Câlin ! ♡', 7 * 60e3], ['kid2', 'Maman, tu rentres quand ?', 4 * 60e3], ['kid3', 'Maman, regarde mon dessin !', 9 * 60e3], ['agency', 'Un shooting vous attend, bientôt.', 12 * 60e3]];
  for (const [from, text, ago] of L.slice(0, 5)) s.events.msgs.push({ at: now - ago, from, text, read: false });
}, { now, H, CONTACTS });
// le dernier arrive par le circuit de production (pushMessage + rafraîchissement du téléphone) : le badge de l'icône doit refléter les 6 conversations
await page.evaluate(() => window.RADIA.messages.legacy('agency', 'Un shooting vous attend, bientôt.')); await sleep(500);
const badge = await page.locator('.phh-app[data-app="messages"] .phh-badge').innerText().catch(() => '');
check('badge de l\'icône Messages : 6 non lus (un par contact, messages repris compris)', badge.trim() === '6', `« ${badge} »`);
await openMessages();

// ---------------------------------------------------------------- 2. pour chaque contact : aperçu de la liste == dernier message du fil, et il est VISIBLE en bas
const LEG = { auguste: 'ne pas oublier de manger', maman: 'bien manger', kid1: 'Câlin', kid2: 'tu rentres quand', kid3: 'regarde mon dessin', agency: 'shooting' };
const listPrev = {};
for (const id of CONTACTS) listPrev[id] = await page.locator(`.msg-row-c[data-cid="${id}"] .msg-prev`).innerText().catch(() => '(absent)');
check('liste : 6 pastilles bleues (une par conversation non lue) avant toute lecture', (await page.locator('.msg-row-c .msg-dot').count()) === 6 && (await page.evaluate(() => Object.values(window.RADIA.messages.state().convos).reduce((n, c) => n + c.unread, 0))) === 6);
for (const id of CONTACTS) check(`liste : l'aperçu de « ${id} » est son message récent`, new RegExp(LEG[id]).test(listPrev[id]), listPrev[id].slice(0, 50));
await page.screenshot({ path: '/tmp/claude-0/da/msg-sync-list.png' });
for (const id of CONTACTS) {
  await page.locator(`.msg-row-c[data-cid="${id}"]`).click(); await sleep(700);
  const r = await page.evaluate((leg) => {
    const th = document.querySelector('.msg-thread'); const bubbles = [...th.querySelectorAll('.msg-r .msg-b')];
    const idx = bubbles.findIndex((e) => new RegExp(leg).test(e.textContent)); const last = bubbles[bubbles.length - 1];
    const el = idx >= 0 ? bubbles[idx] : null; let visible = false;
    if (el) { const a = el.getBoundingClientRect(), b = th.getBoundingClientRect(); visible = a.bottom > b.top + 1 && a.top < b.bottom - 1; }
    const seps = [...th.querySelectorAll('.msg-sep')].map((e) => e.textContent);
    return { found: idx >= 0, isLast: idx >= 0 && bubbles[idx] === last, visible, n: bubbles.length, seps };
  }, LEG[id]);
  check(`conversation « ${id} » : le message de la liste est présent`, r.found);
  check(`conversation « ${id} » : il est le DERNIER du fil (ordre chronologique), visible sans défiler`, r.isLast && r.visible, JSON.stringify(r));
  const hist = await page.evaluate((c) => window.RADIA.messages.state().convos[c].msgs.map((m) => m.text), id);
  check(`« ${id} » : même message dans l'historique enregistré`, hist.some((t) => new RegExp(LEG[id]).test(t)) && hist.length === 4, `${hist.length} messages`);
  await page.locator('button[aria-label="Retour à la liste des conversations"]').click(); await sleep(500);
}
await page.screenshot({ path: '/tmp/claude-0/da/msg-sync-list2.png' });

// ---------------------------------------------------------------- 3. ordre des séparateurs et des messages : strictement chronologique
await page.locator('.msg-row-c[data-cid="auguste"]').click(); await sleep(700);
await page.screenshot({ path: '/tmp/claude-0/da/msg-sync-thread.png' });
const times = await page.evaluate(() => { const hist = window.RADIA.messages.state().convos.auguste.msgs.map((m) => m.at); return { sorted: hist.every((t, i) => i === 0 || t >= hist[i - 1]), n: hist.length }; });
check('historique d\'Auguste en ordre chronologique', times.sorted, JSON.stringify(times));

// ---------------------------------------------------------------- 4. nouveau message hérité PENDANT que la conversation est ouverte (circuit de production)
await page.evaluate(() => window.RADIA.messages.legacy('auguste', 'Message arrivé conversation ouverte')); await sleep(500);
const liveLast = await page.evaluate(() => { const b = [...document.querySelectorAll('.msg-thread .msg-r .msg-b')]; return b[b.length - 1]?.textContent ?? ''; });
check('conversation ouverte : le nouveau message apparaît tout de suite, en dernier', /conversation ouverte/.test(liveLast), liveLast);
await page.locator('button[aria-label="Retour à la liste des conversations"]').click(); await sleep(500);
check('liste : aperçu mis à jour avec le nouveau message', /conversation ouverte/.test(await page.locator('.msg-row-c[data-cid="auguste"] .msg-prev').innerText()));
// et quand la LISTE est ouverte : un message de Maman arrive, la ligne se met à jour sans rouvrir
await page.evaluate(() => window.RADIA.messages.legacy('maman', 'Message de Maman, liste ouverte')); await sleep(500);
check('liste ouverte : l\'aperçu de Maman se met à jour tout seul', /liste ouverte/.test(await page.locator('.msg-row-c[data-cid="maman"] .msg-prev').innerText()));
check('liste ouverte : la ligne de Maman remonte avec une pastille', (await page.locator('.msg-row-c[data-cid="maman"] .msg-dot').count()) === 1);

// ---------------------------------------------------------------- 5. badge : non lus des messages hérités = pastilles, puis remis à zéro à la lecture
check('liste : pastille bleue sur la conversation de Maman (nouveau message)', (await page.locator('.msg-row-c .msg-dot').count()) >= 1);
for (const id of CONTACTS) { await page.locator(`.msg-row-c[data-cid="${id}"]`).click(); await sleep(450); await page.locator('button[aria-label="Retour à la liste des conversations"]').click(); await sleep(350); }
const after = await page.evaluate(() => { const s = window.RADIA.messages.state(); return { unread: Object.values(s.convos).reduce((n, c) => n + c.unread, 0), legacyUnread: window.RADIA.save.data.events.msgs.filter((m) => !m.read).length }; });
check('lire les conversations remet tous les non lus à zéro (messages repris compris)', after.unread === 0 && after.legacyUnread === 0, JSON.stringify(after));
check('plus aucune pastille dans la liste', (await page.locator('.msg-row-c .msg-dot').count()) === 0);

// ---------------------------------------------------------------- 6. envoi + réponse : même historique, réponse présente après coup
await page.locator('.msg-row-c[data-cid="auguste"]').click(); await sleep(600);
await page.locator('.msg-in').fill('Merci pour tout 😘'); await sleep(200); await page.locator('.msg-send').click(); await sleep(7000);
const sent = await page.evaluate(() => window.RADIA.messages.state().convos.auguste.msgs.slice(-3).map((m) => `${m.from}:${m.text.slice(0, 20)}`));
check('mon message et la réponse d\'Auguste sont dans l\'historique', sent.some((t) => t.startsWith('me:Merci')) && sent[sent.length - 1].startsWith('them:'), JSON.stringify(sent));

// ---------------------------------------------------------------- 7. rechargement : rien ne disparaît, rien n'est dupliqué
await page.evaluate(() => window.RADIA.save.writeNow());
const before = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(window.RADIA.messages.state().convos).map(([k, c]) => [k, c.msgs.map((m) => m.text)]))));
await page.reload({ waitUntil: 'networkidle' }); await sleep(3000);
await page.evaluate(() => window.RADIA.phone()); await sleep(1200);
const afterReload = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(window.RADIA.messages.state().convos).map(([k, c]) => [k, c.msgs.map((m) => m.text)]))));
check('après rechargement : exactement les mêmes messages dans toutes les conversations (aucune perte, aucun doublon)', before === afterReload, `${before.length} / ${afterReload.length} car.`);
await page.locator('.phh-app[data-app="messages"]').click(); await sleep(900);
const prev2 = await page.locator('.msg-row-c[data-cid="auguste"] .msg-prev').innerText();
await page.locator('.msg-row-c[data-cid="auguste"]').click(); await sleep(700);
const lastAfter = await page.evaluate(() => { const b = [...document.querySelectorAll('.msg-thread .msg-r .msg-b')]; return b[b.length - 1]?.textContent ?? ''; });
check('après rechargement : l\'aperçu de la liste = dernier message du fil', lastAfter.length > 3 && (prev2 === lastAfter || prev2.endsWith('…') || lastAfter.includes(prev2.slice(0, 20))), `${prev2.slice(0, 30)} | ${lastAfter.slice(0, 30)}`);
const legacyAfter = await page.evaluate(() => window.RADIA.save.data.events.msgs.every((m) => m.synced));
check('ancien historique conservé et marqué « repris » (aucun message perdu)', legacyAfter);

// ---------------------------------------------------------------- 8. sauvegarde ANCIENNE : invitation sans heure + message vocal (ancien circuit)
await page.evaluate(() => { const e = window.RADIA.save.data.events; e.inbox.push({ runId: 'rold1', eventId: 'r-restaurant', at: Math.max(0, e.playMs - 120000), state: 'seen' }); e.secret.triggered = true; window.RADIA.messages.legacy('auguste', '🎙 Message vocal de A'); });
await sleep(600);
await page.locator('button[aria-label="Retour à la liste des conversations"]').click().catch(() => {}); await sleep(400);
await page.locator('.msg-row-c[data-cid="auguste"]').click(); await sleep(700);
const order = await page.evaluate(() => [...document.querySelectorAll('.msg-thread > *')].map((e) => (e.matches('.msg-card') ? 'VOCAL' : e.matches('.msg-inv') ? 'INVITATION' : e.matches('.msg-sep') ? '' : e.matches('.msg-r .msg-b, .msg-r') ? e.textContent.slice(0, 18) : '')).filter(Boolean));
check('invitation ancienne (sans heure) : affichée dans le fil, avec une heure estimée', order.includes('INVITATION'), order.join(' | '));
const iv = await page.evaluate(() => window.RADIA.save.data.events.inbox.find((i) => i.runId === 'rold1').ts);
check('son heure est enregistrée une seule fois (stable après rechargement)', typeof iv === 'number' && iv > 0);
const vi = order.findIndex((t) => /Message vocal/.test(t)), ci = order.indexOf('VOCAL');
check('message vocal : la bulle est dans le fil et la carte « Écouter » juste après', vi >= 0 && ci === vi + 1, order.join(' | '));
await page.evaluate(() => window.RADIA.save.writeNow()); await page.reload({ waitUntil: 'networkidle' }); await sleep(3000);
await page.evaluate(() => window.RADIA.phone()); await sleep(1200); await page.locator('.phh-app[data-app="messages"]').click(); await sleep(900);
const iv2 = await page.evaluate(() => window.RADIA.save.data.events.inbox.find((i) => i.runId === 'rold1')?.ts);
check('heure de l\'invitation inchangée après rechargement', iv2 === iv, `${iv} / ${iv2}`);
const nVoice = await page.evaluate(() => window.RADIA.messages.state().convos.auguste.msgs.filter((m) => /Message vocal de A/.test(m.text)).length);
check('message vocal non dupliqué après rechargement', nVoice === 1, `${nVoice}`);

check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
