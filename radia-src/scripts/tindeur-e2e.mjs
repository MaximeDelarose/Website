// Tindeur jouable : parcours réel dans Chromium ÉMULÉ iPhone (PAS un vrai iPhone), glissés tactiles via CDP.
// Prérequis : npx vite build --outDir /tmp/claude-0/m && npx vite preview --outDir /tmp/claude-0/m --port 4194
// Lancer : PORT=4194 H=852 node scripts/tindeur-e2e.mjs   puis   H=660 …   Captures : shots/m-*.png
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4194';
const H = +(process.env.H ?? 852);
const T = H === 852 ? '' : `-${H}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctxB = await b.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctxB.newPage();
const cdp = await ctxB.newCDPSession(p);
const errs = [];
p.on('pageerror', (e) => errs.push('page: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
await p.addInitScript(() => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', JSON.stringify({ v: 3, seenUpdates: ['v2', 'v3', 'v4'], story: { step: 80 }, levels: {}, hearts: 5 })); });
await p.addInitScript(() => { try { const k = 'radia-save-v1'; const s = localStorage.getItem(k); if (s) { const j = JSON.parse(s); j.world = j.world || {}; j.world.flags = { ...(j.world.flags || {}), 'rw:start-gift-v1': true }; const d = new Date(), q = (x) => String(x).padStart(2, '0'), key = `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}`; j.fun = j.fun || {}; j.fun.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(j.fun.daily || {}), lastKey: key }; j.fun.free = { ...(j.fun.free || {}), announced: true }; localStorage.setItem(k, JSON.stringify(j)); } } catch { /* ignore */ } }); // écarte le « Bonus de départ » pour les anciennes sauvegardes de test
await p.addLocatorHandler(p.locator('#reward-overlay .rw-root'), async () => { for (let i = 0; i < 30; i++) { const r = await p.evaluate(() => { const ov = document.querySelector('#reward-overlay'); if (!ov) return 0; for (const sel of ['.rw-primary', '.rw-skip', '.rw-art']) { const e = ov.querySelector(sel); if (e && e.getBoundingClientRect().width && getComputedStyle(e).visibility !== 'hidden') { e.click(); return 1; } } return 1; }).catch(() => 0); if (!r) break; await p.waitForTimeout(500); } }); // ferme un cadeau qui s'ouvre en cours de parcours
await p.addInitScript(() => { const t = setInterval(() => { try { const w = window.RADIA && window.RADIA.save && window.RADIA.save.data && window.RADIA.save.data.world; if (w) { w.flags = w.flags || {}; w.flags['rw:start-gift-v1'] = true; const fu = window.RADIA.save.data.fun; if (fu) { const d = new Date(), q = (x) => String(x).padStart(2, '0'); fu.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(fu.daily || {}), lastKey: `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}` }; fu.free = { ...(fu.free || {}), announced: true }; clearInterval(t); } } } catch { /* ignore */ } }, 20); }); // pas de « Bonus de démarrage » dans les parcours de test
let fails = 0;
const check = (n, ok, x = '') => { if (!ok) fails++; console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const sh = (n) => p.screenshot({ path: `shots/m-${n}${T}.png` });
const wait = (ms) => p.waitForTimeout(ms);
const sw = () => p.evaluate(() => JSON.parse(JSON.stringify(window.RADIA.save.data.fun.apps.swipe)));
const fun = () => p.evaluate(() => JSON.parse(JSON.stringify(window.RADIA.save.data.fun.tindeur)));

async function clean(n = 6) {
  for (let i = 0; i < n; i++) {
    await wait(450);
    await p.evaluate(() => { document.querySelectorAll('.dy-back').forEach((e) => e.remove()); const bs = document.querySelectorAll('.modal-backdrop:not(.leaving) .actions button'); if (bs.length && !document.querySelector('.nl-show-back')) bs[bs.length - 1].click(); });
  }
}
/** Glissé tactile réel (événements tactiles CDP → pointer events). */
async function touch(x0, y0, x1, y1, { steps = 9, hold = false } = {}) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps }] }); await wait(14); }
  if (!hold) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const release = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const cardBox = async () => (await p.locator('.sw-card.d0').boundingBox());
async function swipeCard(dir) {
  const bx = await cardBox();
  const y = bx.y + bx.height * 0.4, cx = bx.x + bx.width / 2;
  await touch(cx, y, cx + (dir === 'right' ? 170 : -170), y + 20);
  await wait(700);
  if (await p.locator('.sw-match').count()) { await wait(700); await p.locator('.sw-mkeep').click(); await wait(400); } // match : on continue à swiper
}
async function openApp() {
  await p.locator('.title-left .ph-btn').first().click(); await p.waitForSelector('.ph-back'); await wait(400);
  await p.locator('.phh-app[data-app="tindeur"]').click(); // le téléphone s'ouvre sur son écran d'accueil ; l'application s'ouvre par-dessus
  await p.waitForSelector('.sw-app'); await wait(500);
}
async function closeApp() { await p.locator('.sw-app .sw-head .tdr-x').click(); await wait(500); if (await p.locator('.phh-quit').count()) { await p.locator('.phh-quit').click(); await wait(500); } } // fermer l'application ramène à l'accueil du téléphone ; on le quitte ensuite

await p.goto(`http://localhost:${PORT}/?debug&statsDelay=999999999`);
await wait(5500); await clean(6);

// ------------------------------------------------------------------ 0. scène existante (2 500 matchs) conservée
await p.evaluate(() => window.RADIA.tindeur.trigger());
await p.waitForSelector('.ev-notif.tindeur', { timeout: 8000 });
await wait(3200);
check('notification « 2 500 matchs » puis « nouveau match »', (await p.locator('.ev-notif.tindeur').textContent()).includes('nouveau match'));
await p.locator('.ev-notif .btn', { hasText: 'Voir' }).click();
await p.waitForSelector('.tdr-layer .tdr-go'); await sh('0-scene');
await p.locator('.tdr-go').click(); await wait(500);
await p.locator('.tdr-opt.keep').click(); await wait(2300);
check('choix « garder » enregistré (fun.tindeur conservé)', (await fun()).choice === 'keep' && (await fun()).installed === true);

// ------------------------------------------------------------------ 1. téléphone → Tindeur
await openApp();
check('l’icône du téléphone ouvre l’appli jouable', (await p.locator('.sw-app .sw-card').count()) >= 2);
await sh('1-pile');
const bx0 = await cardBox();
check('carte visible dans l’écran, sans débordement horizontal', bx0.x >= 0 && bx0.x + bx0.width <= 393 && (await p.evaluate(() => document.documentElement.scrollWidth)) <= 393, JSON.stringify(bx0));
const nameTxt = (await p.locator('.sw-card.d0 .sw-name b').textContent());
check('première carte : Kevin, 29 ans', nameTxt === 'Kevin' && (await p.locator('.sw-card.d0 .sw-age').textContent()) === '29');
check('bio exacte de Kevin', (await p.locator('.sw-card.d0 .sw-bio').textContent()).includes('Mon tracteur s’appelle Josiane.'));
check('pastilles d’intérêts', (await p.locator('.sw-card.d0 .sw-tags i').count()) === 3);
const ab = await p.locator('.sw-actions').boundingBox();
check('boutons ✕ et ♥ visibles', ab.y + ab.height <= H && ab.y > bx0.y + bx0.height - 60, JSON.stringify(ab));

// ------------------------------------------------------------------ 2. glissé : rotation en cours de geste, rebond, puis passer
await touch(bx0.x + bx0.width / 2, bx0.y + bx0.height * 0.4, bx0.x + bx0.width / 2 + 60, bx0.y + bx0.height * 0.4 + 10, { hold: true });
const tr = await p.locator('.sw-card.d0').evaluate((e) => getComputedStyle(e).transform);
const stampOp = +(await p.locator('.sw-card.d0 .sw-stamp.like').evaluate((e) => getComputedStyle(e).opacity));
check('pendant le glissé : la carte tourne légèrement et l’indicateur LIKE apparaît', tr.startsWith('matrix(') && tr !== 'none' && stampOp > 0.2, `${tr} · LIKE ${stampOp.toFixed(2)}`);
await sh('2-glisse');
await release(); await wait(700);
check('relâché court : la carte revient (rebond), rien n’est compté', (await sw()).stats?.likes === 0 && (await p.locator('.sw-card.d0 .sw-name b').textContent()) === 'Kevin');
await swipeCard('left');
const s1 = await sw();
check('swipe gauche = passer (Kevin repassé, carte suivante : Hugo)', s1.stats.passes === 1 && (await p.locator('.sw-card.d0 .sw-name b').textContent()) === 'Hugo', `passes=${s1.stats.passes}`);
// souris (ordinateur) : glissé à droite sur Hugo → like
const bx1 = await cardBox();
await p.mouse.move(bx1.x + bx1.width / 2, bx1.y + 120); await p.mouse.down();
for (let i = 1; i <= 8; i++) { await p.mouse.move(bx1.x + bx1.width / 2 + i * 22, bx1.y + 120 + i * 2); await wait(16); }
await sh('2b-souris');
await p.mouse.up(); await wait(700);
const s2 = await sw();
check('glissé à la souris à droite = like, premier like = match', s2.stats.likes === 1 && s2.matches.includes('hugo'), JSON.stringify(s2.stats));
await p.waitForSelector('.sw-match');
await wait(900); await sh('3-match');
check('animation « C’est un match ! »', (await p.locator('.sw-mtitle').textContent()) === 'C’est un match !');
check('texte du match lisible, bouton visible', (await p.locator('.sw-mgo').boundingBox()).y + 50 <= H);
await p.locator('.sw-mkeep').click(); await wait(500);
check('petite notification interne après « Continuer à swiper »', (await p.locator('.sw-toast').count()) === 1);
await sh('4-toast');

// ------------------------------------------------------------------ 3. likes jusqu’à épuisement (limite douce), recharge
for (let i = 0; i < 4; i++) { await wait(300); if (await p.locator('.sw-card.d0').count()) await swipeCard('right'); }
const s3 = await sw();
const likes3 = s3.stats.likes;
console.log('   likes/passes/matchs :', JSON.stringify(s3.stats));
check('plusieurs likes → plusieurs matchs, cœurs décomptés', likes3 >= 3 && s3.matches.length >= 2 && s3.bank.n < 12, JSON.stringify({ n: s3.bank.n, m: s3.matches }));
await p.evaluate(() => { const s = window.RADIA.save.data.fun.apps.swipe; s.bank.n = 0; s.bank.ts = Date.now(); });
await wait(1200);
await swipeCard('right');
await wait(300);
check('plus de cœur : la carte revient, message doux, aucune perte', (await sw()).stats.likes === likes3 && (await p.locator('.sw-toast').count()) === 1 && (await p.locator('.sw-card.d0').count()) === 1);
await sh('5-sans-coeur');
await swipeCard('left');
check('passer reste possible sans cœur', (await sw()).stats.passes === 2);
await p.evaluate(() => { const s = window.RADIA.save.data.fun.apps.swipe; s.bank.n = 12; });

// ------------------------------------------------------------------ 4. messages → conversation LIBRE (clavier, texte exact, réponses adaptées)
await p.locator('.sw-tab[data-tab="matches"]').click(); await wait(500);
check('liste des matchs : lignes + pastille « Nouveau »', (await p.locator('.sw-row').count()) >= 2 && (await p.locator('.sw-chip.new').count()) >= 2);
await sh('6-messages');
// faux clavier iPhone : visualViewport contrôlable (Chromium émulé : pas de vrai clavier iOS)
await p.evaluate((h0) => {
  const vv = Object.assign(new EventTarget(), { height: h0, width: 393, offsetTop: 0, offsetLeft: 0, scale: 1, pageTop: 0, pageLeft: 0 });
  Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true }); window.__vv = vv;
}, H);
await p.locator('.sw-row', { hasText: 'Hugo' }).click(); await p.waitForSelector('.sw-chat');
await p.waitForSelector('.cmp-in', { timeout: 6000 }); await wait(500);
check('chat : premier message de Hugo, AUCUN choix multiple, champ de saisie permanent', (await p.locator('.sw-b:not(.me)').first().textContent()).includes('Ravi du match') && (await p.locator('.sw-ch').count()) === 0 && (await p.locator('.cmp-in').count()) === 1);
check('le champ est un vrai <input> (clavier natif) de 16 px minimum, bouton d’envoi désactivé quand vide', await p.evaluate(() => { const i = document.querySelector('.cmp-in'); return i.tagName === 'INPUT' && parseFloat(getComputedStyle(i).fontSize) >= 16 && document.querySelector('.cmp-send').disabled === true; }));
await sh('7-chat');
const say = async (t) => { await p.locator('.cmp-in').fill(t); await p.locator('.cmp-send').click(); };
const lastHis = async () => (await p.locator('.sw-b:not(.me):not(.typing)').allTextContents()).slice(-3).join(' ‖ ');
await say('Salut Hugo, ça va ?');
await wait(300);
check('mon message apparaît à droite avec mon texte exact', (await p.locator('.sw-b.me').last().textContent()) === 'Salut Hugo, ça va ?');
check('indicateur « écrit… » animé pendant qu’il rédige', (await p.locator('.sw-b.typing').count()) === 1);
await sh('8-frappe');
await p.waitForFunction(() => document.querySelectorAll('.sw-b:not(.me):not(.typing)').length >= 3 && !document.querySelector('.sw-b.typing'), null, { timeout: 12000 });
const r1 = await lastHis();
check('il répond à « ça va ? » (pas un dialogue récité)', /ça va|bien|merci|toi/i.test(r1), r1);
check('le champ reste actif après l’envoi (le clavier reste ouvert)', await p.evaluate(() => document.activeElement === document.querySelector('.cmp-in')));
await say('mdrr et tu fais quoi dans la vie ?');
await p.waitForFunction(() => !document.querySelector('.sw-b.typing') && document.querySelectorAll('.sw-b.me').length >= 2, null, { timeout: 12000 }); await wait(2500);
const r2 = await lastHis();
check('il répond à la question sur son métier', /éducation|boulot|humain|transmett|gens|travail/i.test(r2), r2);
// fautes, argot, changement de sujet
let sawAuguste = /l.autre/i.test(await p.locator('.sw-msgs').textContent());
for (const t of ['jsp trop lol', 'et le foot tu aimes ?', 'pk tu dis ca', 'ptdr nan j\'aime les chats', 'tu es mignon', 'tu as snapchien ?']) {
  await say(t); await wait(300);
  await p.waitForFunction(() => !document.querySelector('.sw-b.typing'), null, { timeout: 12000 }); await wait(2200);
  sawAuguste ||= /l.autre/i.test(await p.locator('.sw-msgs').textContent());
}
check('Hugo demande si elle est toujours en contact avec « l’autre » (Auguste)', sawAuguste);
check('au moins 6 échanges, historique visible dans l’ordre', (await p.locator('.sw-b.me').count()) >= 7 && (await p.locator('.sw-time').count()) >= 4);
// clavier iPhone : le champ et les derniers messages restent visibles
await p.evaluate((h0) => { window.__vv.height = h0 - 336; window.__vv.dispatchEvent(new Event('resize')); }, H);
await wait(400);
const kb = await p.evaluate(() => { const c = document.querySelector('.sw-chat'); const i = document.querySelector('.cmp-in').getBoundingClientRect(); const m = document.querySelector('.sw-msgs'); const last = [...document.querySelectorAll('.sw-b:not(.typing)')].pop().getBoundingClientRect(); return { open: c.classList.contains('kb-open'), bottom: c.style.bottom, inputBottom: i.bottom, vh: window.__vv.height, lastBottom: last.bottom, lastTop: last.top, msgsTop: m.getBoundingClientRect().top, msgsBottom: m.getBoundingClientRect().bottom }; });
check('clavier ouvert : le champ de saisie est au-dessus du clavier', kb.open && kb.inputBottom <= kb.vh + 1, JSON.stringify(kb));
check('clavier ouvert : le dernier message reste visible', kb.lastBottom <= kb.msgsBottom + 1 && kb.lastTop >= kb.msgsTop - 1, JSON.stringify(kb));
await sh('8b-clavier');
await p.evaluate((h0) => { window.__vv.height = h0; window.__vv.dispatchEvent(new Event('resize')); }, H); await wait(300);
check('clavier fermé : la mise en page revient', await p.evaluate(() => !document.querySelector('.sw-chat').classList.contains('kb-open') && document.querySelector('.sw-chat').style.bottom === ''));
const hs = (await sw()).convos.hugo;
check('historique sauvegardé : mes messages et les siens, texte exact', hs.msgs.filter((m) => m.k === 'out').length >= 7 && hs.msgs.some((m) => m.k === 'out' && m.text === 'Salut Hugo, ça va ?'));
await p.locator('.sw-chead .tdr-x').click(); await wait(500);

// ------------------------------------------------------------------ 5. une autre conversation : pause, reprise, suppression
await p.locator('.sw-row').first().click(); await p.waitForSelector('.cmp-in');
const matchesBefore = (await sw()).matches.length; const delId = await p.evaluate(() => document.querySelector('.sw-cname b').textContent);
await say('coucou, tu fais quoi de beau ?'); await p.waitForFunction(() => !document.querySelector('.sw-b.typing'), null, { timeout: 12000 }); await wait(2000);
check('autre match : il répond au contenu du message', (await lastHis()).length > 10, await lastHis());
await p.locator('.sw-more').click(); await wait(200); await sh('10-menu');
await p.locator('.sw-menu button', { hasText: 'Mettre en pause' }).click(); await wait(400);
check('mettre en pause : champ masqué, carte « pause »', (await p.locator('.sw-compose.hide').count()) === 1 && (await p.locator('.sw-end').textContent()).includes('pause'));
await p.locator('.sw-end .btn', { hasText: 'Reprendre' }).click(); await wait(500);
check('reprendre : le champ de saisie revient', (await p.locator('.sw-compose.hide').count()) === 0 && (await p.locator('.cmp-in').count()) === 1);
await p.locator('.sw-more').click();
await p.locator('.sw-menu button.danger', { hasText: 'Supprimer' }).click(); await wait(300);
await p.locator('.sw-end .btn', { hasText: 'Supprimer' }).click(); await p.waitForSelector('.sw-chat', { state: 'detached', timeout: 5000 }).catch(() => undefined); await wait(300);
const s4 = await sw();
check('supprimer le match : conversation retirée et il ne reviendra jamais', s4.matches.length === matchesBefore - 1 && (await p.locator('.sw-chat').count()) === 0 && s4.removed.length === 1, `matchs restants ${s4.matches.length} · supprimés ${s4.removed}`);

// ------------------------------------------------------------------ 6. notification de message (pendant que Radia joue ailleurs)
await closeApp();
// un match avec un message non lu, et la sauvegarde cohérente
const unreadId = await p.evaluate(() => Object.values(window.RADIA.save.data.fun.apps.swipe.convos).find((c) => c.unread)?.pid);
check('un match a un message non lu', !!unreadId, String(unreadId));
check('pastille sur l’icône du téléphone du jeu', await (async () => { await p.locator('.title-left .ph-btn').first().click(); await p.waitForSelector('.ph-back'); await wait(400); const d = await p.locator('.phh-app[data-app="tindeur"] .phh-badge').count(); await sh('11-pastille'); await p.locator('.phh-quit').click(); await wait(400); return d === 1; })());
// avance le temps de jeu ACTIF : le vrai planificateur affiche la notification à un moment sûr
await p.evaluate(() => { window.RADIA.save.data.fun.apps.swipe.clock += 6 * 60_000; });
await p.mouse.click(5, 5);
await p.waitForSelector('.ev-notif.sw-notif', { timeout: 14000 }).catch(() => undefined);
const nCount = await p.locator('.ev-notif.sw-notif').count();
check('notification de message du match (jeu actif, moment sûr)', nCount === 1, `${nCount} · ` + ((await p.locator('.ev-notif.sw-notif').first().textContent().catch(() => '')) ?? ''));
await sh('12-notif');
const labels = await p.locator('.ev-notif.sw-notif .btn').allTextContents();
check('trois actions : Ouvrir / Répondre plus tard / Ignorer', labels.join('|') === 'Ouvrir|Répondre plus tard|Ignorer', labels.join('|'));
const nb = await p.locator('.ev-notif.sw-notif').boundingBox(); check('notification dans l’écran', nb.x >= 0 && nb.x + nb.width <= 393 && nb.y >= 0);
await p.locator('.ev-notif.sw-notif .btn', { hasText: 'Répondre plus tard' }).click(); await wait(500);
// jamais en rafale : même 3 min plus tard, rien
await p.evaluate(() => { window.RADIA.save.data.fun.apps.swipe.clock += 3 * 60_000; });
await wait(9000);
check('pas de seconde notification en rafale', (await p.locator('.ev-notif.sw-notif').count()) === 0);
// plus tard : une relance, puis ouverture
await p.evaluate(() => { window.RADIA.save.data.fun.apps.swipe.clock += 14 * 60_000; });
await p.mouse.click(5, 5);
await p.waitForSelector('.ev-notif.sw-notif', { timeout: 14000 }).catch(() => undefined);
check('relance après « plus tard » (bien plus tard)', (await p.locator('.ev-notif.sw-notif').count()) === 1);
await p.locator('.ev-notif.sw-notif .btn', { hasText: 'Ouvrir' }).click();
await p.waitForSelector('.sw-chat', { timeout: 5000 }); await wait(800); await sh('13-depuis-notif');
check('« Ouvrir » mène à la conversation', (await p.locator('.sw-chat').count()) === 1 && (await p.locator('.cmp-in').count()) === 1);
// quitter pendant qu’il écrit : la réponse arrive plus tard, en jeu actif
await p.locator('.cmp-in').fill('tu es là ?'); await p.locator('.cmp-send').click(); await wait(200); await p.evaluate(() => { document.querySelector('.sw-chead .tdr-x').click(); }); // écrit puis quitte aussitôt
await wait(400);
const q = await p.evaluate(() => Object.values(window.RADIA.save.data.fun.apps.swipe.convos).find((c) => c.pending.length));
check('réponse en attente quand Radia quitte le chat', !!q && q.due > 0, q ? `due=${q.due}` : '');
await closeApp();

// ------------------------------------------------------------------ 7. désinstaller / réinstaller / recharger
const before = await sw();
await p.locator('.title-left .ph-btn').first().click(); await p.waitForSelector('.ph-back'); await wait(300);
await p.locator('.phh-app[data-app="settings"]').click(); await wait(400);
for (let k = 1; k <= 2; k++) { await p.locator('.ph-set .btn', { hasText: 'Désinstaller' }).click(); await wait(700); check(`désinstallation : essai ${k}/3 refusé, l'appli reste installée`, (await fun()).installed === true && (await p.locator('.ph-aug-say').count()) >= 1); }
await p.locator('.ph-set .btn', { hasText: 'Désinstaller' }).click(); await wait(900);
check('désinstallation au 3e essai : installed=false', (await fun()).installed === false);
await sh('14-desinstalle');
await p.locator('.ph-top .ph-x').first().click(); await wait(400); await p.locator('.phh-quit').click(); await wait(400); // réglages → accueil du téléphone → quitter
await p.evaluate(() => { window.RADIA.save.data.fun.apps.swipe.clock += 60 * 60_000; for (const c of Object.values(window.RADIA.save.data.fun.apps.swipe.convos)) { c.unread = true; c.notified = false; c.pingAt = 1; } });
await p.mouse.click(5, 5); await wait(10000);
check('désinstallée : plus aucune notification Tindeur', (await p.locator('.ev-notif.sw-notif').count()) === 0);
await p.locator('.title-left .ph-btn').first().click(); await p.waitForSelector('.ph-back'); await wait(300);
check('icône absente quand désinstallée', (await p.locator('.phh-app[data-app="tindeur"]').count()) === 0);
await p.locator('.phh-app[data-app="settings"]').click(); await wait(300);
await p.locator('.ph-set .btn', { hasText: 'Réinstaller' }).click(); await wait(500);
await p.locator('.ph-top .ph-x').first().click(); await wait(400); await p.locator('.phh-quit').click(); await wait(400); // réglages → accueil du téléphone → quitter
const after = await sw();
check('réinstaller conserve profils, matchs et conversations', JSON.stringify(after.matches) === JSON.stringify(before.matches) && after.stats.likes === before.stats.likes && Object.keys(after.convos).length === Object.keys(before.convos).length);

// rechargement (comme une fermeture de Safari)
await p.evaluate(() => window.RADIA.save.save());
await wait(600);
const persisted = await sw();
await p.reload(); await wait(5500); await clean(5);
const reloaded = await sw();
check('rechargement : état identique (matchs, vus, likes, conversations, cœurs)', JSON.stringify(reloaded.matches) === JSON.stringify(persisted.matches) && reloaded.seen.length === persisted.seen.length && Object.keys(reloaded.convos).length === Object.keys(persisted.convos).length && reloaded.stats.likes === persisted.stats.likes);
check('rechargement : fun.tindeur conservé', (await fun()).choice === 'keep' && (await fun()).installed === true);
await openApp(); await p.locator('.sw-tab[data-tab="matches"]').click(); await wait(500);
check('rechargement : les matchs sont toujours là dans l’appli', (await p.locator('.sw-row').count()) === reloaded.matches.length);
await sh('15-apres-rechargement');
await p.locator('.sw-row').first().click(); await p.waitForSelector('.sw-chat'); await wait(2500); await sh('16-chat-recharge');
check('rechargement : l’historique du chat est reconstitué', (await p.locator('.sw-b').count()) >= 2);

// ------------------------------------------------------------------ bilan
check('aucune erreur console / page', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT EST OK (Chromium émulé, pas un vrai iPhone)');
await b.close();
process.exit(fails ? 1 : 0);
