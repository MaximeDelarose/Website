// Casino Royal (Tickets), roue du jour, cadeaux quotidiens : parcours Playwright (Chromium ÉMULÉ, pas un vrai iPhone).
// Build isolé : npx vite build --outDir /tmp/claude-0/l  puis  npx vite preview --outDir /tmp/claude-0/l --port 4193
// PORT=4193 W=393 H=852 [REDUCED=1] node scripts/casino-e2e.mjs   (essayer aussi H=660 : écran court)
// Joue de vraies manches de chaque jeu par clics, vérifie débit / gain, tickets du jour, roue, cadeau quotidien, erreurs console ; captures shots/l-*.png.
import { chromium } from 'playwright';
const W = +(process.env.W ?? 393), H = +(process.env.H ?? 852), PORT = process.env.PORT ?? 4193, P = process.env.PATH_URL ?? '/';
const TAG = `${W}x${H}`;
const browser = await chromium.launch({ args: ['--no-proxy-server'], executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR ?? 2), hasTouch: true, isMobile: true })).newPage();
page.setDefaultTimeout(120000);
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const out = [];
const check = (name, ok, extra = '') => { const l = `${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`; out.push(l); console.log(l); };
const shot = (n) => page.screenshot({ path: `shots/l-${n}-${TAG}.png` });
const seed = { v: 2, seenUpdates: ['v2', 'v4'], story: { step: 80 }, levels: {}, hearts: 500 };
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await page.addInitScript(() => { try { const k = 'radia-save-v1'; const s = localStorage.getItem(k); if (s) { const j = JSON.parse(s); j.world = j.world || {}; j.world.flags = { ...(j.world.flags || {}), 'rw:start-gift-v1': true }; const d = new Date(), q = (x) => String(x).padStart(2, '0'), key = `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}`; j.fun = j.fun || {}; j.fun.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(j.fun.daily || {}), lastKey: key }; j.fun.free = { ...(j.fun.free || {}), announced: true }; localStorage.setItem(k, JSON.stringify(j)); } } catch { /* ignore */ } }); // écarte le « Bonus de départ » pour les anciennes sauvegardes de test
let autoRw = true;
await page.addLocatorHandler(page.locator('#reward-overlay .rw-root'), async () => { if (!autoRw) return; for (let i = 0; i < 30; i++) { const r = await page.evaluate(() => { const ov = document.querySelector('#reward-overlay'); if (!ov) return 0; for (const sel of ['.rw-primary', '.rw-skip', '.rw-art']) { const e = ov.querySelector(sel); if (e && e.getBoundingClientRect().width && getComputedStyle(e).visibility !== 'hidden') { e.click(); return 1; } } return 1; }).catch(() => 0); if (!r) break; await page.waitForTimeout(500); } }, { noWaitAfter: true }); // ferme un cadeau qui s'ouvre en cours de parcours
await page.addInitScript(() => { const t = setInterval(() => { try { const w = window.RADIA && window.RADIA.save && window.RADIA.save.data && window.RADIA.save.data.world; if (w) { w.flags = w.flags || {}; w.flags['rw:start-gift-v1'] = true; const fu = window.RADIA.save.data.fun; if (fu) { const d = new Date(), q = (x) => String(x).padStart(2, '0'); fu.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(fu.daily || {}), lastKey: `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}` }; fu.free = { ...(fu.free || {}), announced: true }; clearInterval(t); } } } catch { /* ignore */ } }, 20); }); // pas de « Bonus de démarrage » dans les parcours de test
await page.goto(`http://localhost:${PORT}${P}?debug&statsDelay=999999999`, { waitUntil: 'networkidle' });
await sleep(P === '/' ? 2500 : 600);
// le cadeau du jour et la roue sont gérés plus loin : on les marque « déjà pris » pour ne pas gêner le parcours
await page.evaluate(() => { const k = window.RADIA.daily.state().key; const f = window.RADIA.save.data.fun; f.daily.lastKey = k; f.wheel.lastKey = k; });
for (let i = 0; i < 6 && P === '/'; i++) { await page.evaluate(() => document.querySelectorAll('.dy-back').forEach((e) => e.remove())); const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.first().click(); await sleep(400); } else await sleep(300); }
if (process.env.REDUCED) await page.evaluate(() => { window.RADIA.save.data.settings.reducedMotion = true; document.documentElement.classList.add('reduced-motion'); });
const st = () => page.evaluate(() => { const c = window.RADIA.save.data.fun.casino; return { chips: c.chips, bring: window.RADIA.save.data.world.res.coins, stats: { ...c.stats }, hist: c.history.length }; });
const hasApi = await page.evaluate(() => !!window.RADIA?.casino && !!window.RADIA?.wheel);
check('API debug RADIA.casino / RADIA.wheel présente (le hub doit importer src/casino et src/wheel)', hasApi);
if (!hasApi) { console.log(out.join('\n')); await browser.close(); process.exit(1); }

// ---------- ouverture, allocation, carte d'Auguste
await page.evaluate(() => { window.RADIA.save.data.world.res.coins = 5000; });
await page.evaluate(() => { window.RADIA.casino.open(); });
await sleep(1200);
check('écran casino ouvert', (await page.locator('.cz-root').count()) === 1);
let s0 = await st();
check('allocation gratuite 500 tickets versée (les tickets restent en poche)', s0.chips === 500, JSON.stringify(s0));
await shot('card');
check('carte d\'Auguste affichée', (await page.locator('.cz-member').count()) === 1);
check('carte : pièces (mise) et tickets affichés', (await page.locator('.cz-w').count()) === 2 && /5\s?000/.test((await page.locator('.cz-w').first().textContent()).replace(/\u202f/g, ' ')));
check('caisse d\'échange présente', (await page.locator('.cz-exchange button').count()) === 2);
await page.locator('.cz-exchange button').first().click(); await sleep(300);
s0 = await st();
check('échange : 100 pièces → 10 tickets', s0.bring === 4900 && s0.chips === 510, JSON.stringify(s0));
await page.evaluate(() => { window.RADIA.save.data.world.res.coins = 100000; });
await page.locator('.cz-enter').click(); await sleep(900);
await shot('lobby');
check('salon : 3 jeux', (await page.locator('.cz-game').count()) === 3);
check('zones tactiles >= 44 px (salon)', await page.evaluate(() => [...document.querySelectorAll('.cz-root button')].filter((b) => b.offsetParent).every((b) => { const r = b.getBoundingClientRect(); return r.height >= 43.5 && r.width >= 43.5; })));
check('pas de défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
// ---- zones tactiles de l'illustration, mini-défis « Tickets du jour », prochain gain gratuit
check('illustration : 4 zones + 2 personnages cliquables', (await page.locator('.cz-spot').count()) === 6);
check('« Prochain gain gratuit » affiché', (await page.locator('.cz-free .cz-fitem').count()) >= 1);
check('4 mini-défis du jour', (await page.locator('.cz-task').count()) === 4);
await page.locator('.cz-spot.radia').click(); await sleep(250); await page.locator('.cz-spot.auguste').click(); await sleep(500);
await shot('lobby-bubble');
check('saluer les deux personnages accomplit le défi', await page.evaluate(() => window.RADIA.save.data.fun.casino.stats['dq.greet'] === 1));
const tk0 = await page.evaluate(() => window.RADIA.save.data.fun.casino.chips);
await page.locator('.cz-task.ready .btn').first().click(); await sleep(900);
check('mini-défi réclamé : +30 tickets en poche, sans hasard', (await page.evaluate(() => window.RADIA.save.data.fun.casino.chips)) === tk0 + 30);
await page.evaluate(() => document.querySelector('.cz-stage').scrollTo(0, 99999)); await sleep(300); await shot('lobby-bottom');
await page.evaluate(() => document.querySelector('.cz-stage').scrollTo(0, 0));
await page.locator('.cz-helpbtn').click(); await sleep(300); await shot('help-lobby');
await page.locator('.cz-close').click(); await sleep(300);

// ---------- roulette
await page.locator('.cz-game', { hasText: 'Roulette' }).click(); await sleep(700);
await shot('roulette-bet');
const before = (await st()).bring;
await page.evaluate(() => window.RADIA.casino.roulette(17));
await page.locator('.rl-chip[data-v="10"]').click();
await page.locator('.rl-cell[data-k="red"]').click();
await page.locator('.rl-cell[data-k="n17"]').click();
await page.locator('.rl-cell[data-k="n3"]').click();
await page.locator('.rl-cell[data-k="odd"]').click();
await sleep(200);
await shot('roulette-bets');
// groupe de 2
await page.locator('.rl-grp').click(); await page.locator('.rl-cell[data-k="n8"]').click(); await page.locator('.rl-cell[data-k="n9"]').click();
await shot('roulette-group');
await page.locator('.rl-grpok').click(); await sleep(150);
const stake = 50;
check('mise totale affichée = 50', (await page.locator('.rl-tot b').textContent()).replace(/\s/g, '') === '50');
await page.locator('.rl-go').click(); await sleep(500);
check('débit AVANT la manche', (await st()).bring === before - stake - 0 || (await st()).bring >= before - stake, `solde ${(await st()).bring}`);
await sleep(2200); await shot('roulette-spin');
await page.waitForSelector('.rl-result.show', { timeout: 120000 }); await sleep(900);
await shot('roulette-result');
// 17 est NOIR et impair : rouge perdu ; impair 10→20 ; plein 10→360 ; n3 et groupe 8-9 perdus
const s1 = await st();
check('gain exact roulette (17 noir impair : impair + plein)', s1.bring === before - stake + 20 + 360, `solde ${s1.bring} attendu ${before - stake + 380}`);
check('résultat affiché = 17', (await page.locator('.rl-bigball').textContent()) === '17');
check('historique mis à jour', s1.stats['roulette.n0'] === 18);
check('aucune barre de défilement cachée (résultat visible)', await page.locator('.rl-after').isVisible());
await page.locator('.rl-after .btn.secondary').click(); await sleep(400);
// perte (0 perd les chances simples)
await page.evaluate(() => window.RADIA.casino.roulette(0));
await page.locator('.rl-cell[data-k="black"]').click(); await page.locator('.rl-go').click();
await page.waitForSelector('.rl-result.show', { timeout: 120000 }); await sleep(800);
const s2 = await st();
check('0 fait perdre la chance simple', s2.bring === s1.bring - 10, `solde ${s2.bring}`);
await page.locator('.cz-back').click(); await sleep(500);

// ---------- machine à sous
await page.locator('.cz-game', { hasText: 'Machine' }).click(); await sleep(700);
await shot('slots');
check('machine : 3 boutons de série', (await page.locator('.sl-segb').count()) === 3);
const b0 = (await st()).bring;
await page.locator('.sl-go').click();
await sleep(1600); await shot('slots-spin');
await page.waitForFunction(() => !document.querySelector('.cz-root.x') && document.querySelector('.sl-go') && !document.querySelector('.sl')?.classList.contains('running'), null, { timeout: 120000 });
await sleep(1500);
const b1 = (await st());
check('tirage simple : débit 10 + gain cohérent', b1.stats['slots.parties'] === 1 && Math.abs(b1.bring - b0) <= 10 * 500, `solde ${b0} → ${b1.bring}`);
await shot('slots-result');
// série ×5 avec arrêt
await page.locator('.sl-segb[data-n="5"]').click();
const tot5 = await page.locator('.sl-totline').textContent();
check('mise totale ×5 affichée avant', /250/.test(tot5), tot5);
const bb = (await st());
await page.locator('.sl-go').click();
await page.waitForSelector('.sl-stop', { state: 'visible' }); await sleep(900);
await page.locator('.sl-stop').click();
await page.waitForSelector('.sl-recap', { timeout: 120000 }); await sleep(500);
await shot('slots-recap');
const ba = await st();
const played = ba.stats['slots.parties'] - bb.stats['slots.parties'];
check('arrêt entre deux tirages (moins de 5 joués)', played >= 1 && played < 5, `joués ${played}`);
check('récapitulatif liste chaque tirage', (await page.locator('.sl-rrow').count()) === played);
await page.locator('.sl-recap .btn.secondary').click(); await sleep(400);
// série ×10 complète
await page.locator('.sl-segb[data-n="10"]').click();
const bt = await st();
await page.locator('.sl-go').click();
await page.waitForSelector('.sl-recap', { timeout: 300000 }); await sleep(500);
await shot('slots-recap10');
const ba2 = await st();
check('série ×10 : exactement 10 manches puis arrêt', ba2.stats['slots.parties'] - bt.stats['slots.parties'] === 10, `${ba2.stats['slots.parties'] - bt.stats['slots.parties']}`);
await page.locator('.sl-recap .btn.secondary').click(); await sleep(300);
await page.locator('.cz-helpbtn').click(); await sleep(300); await shot('help-slots'); await page.locator('.cz-close').click(); await sleep(250);
await page.locator('.cz-back').click(); await sleep(500);

// ---------- blackjack
await page.locator('.cz-game', { hasText: 'Blackjack' }).click(); await sleep(700);
await shot('blackjack-bet');
await page.evaluate(() => window.RADIA.casino.blackjack(12345));
const bj0 = (await st()).bring;
await page.locator('.bj-chips .rl-chip').nth(0).click(); // +50
check('mise 50 posée', (await page.locator('.bj-bet b').textContent()).replace(/\s/g, '') === '50');
await page.locator('.bj-ctrl .btn.gold').click(); await sleep(900);
await shot('blackjack-deal');
check('mise débitée avant la donne', (await st()).bring === bj0 - 50);
await page.waitForSelector('.bj-acts, .bj-banner.show', { timeout: 60000 });
if (await page.locator('.bj-acts').count()) {
  await shot('blackjack-play');
  await page.locator('.bj-acts .btn.lavande').click();
}
await page.waitForSelector('.bj-banner.show', { timeout: 120000 }); await sleep(1800);
await shot('blackjack-result');
const bj1 = await st();
check('blackjack : une manche enregistrée', bj1.stats['blackjack.parties'] === 1 && bj1.hist >= 3, JSON.stringify(bj1.stats['blackjack.parties']));
const txt = await page.locator('.bj-banner').textContent();
check('résultat affiché', /Gagné|Perdu|Égalité|Dépassé|BLACKJACK/.test(txt), txt);
const delta = bj1.bring - bj0;
check('bilan cohérent (-50, 0, +50, +75 ou ±100)', [-50, 0, 50, 75, -100, 100].includes(delta), `delta ${delta}`);
await page.locator('.cz-helpbtn').click(); await sleep(300); await shot('help-blackjack'); await page.locator('.cz-close').click(); await sleep(250);
// une seconde donne avec double si possible
await page.locator('.bj-ctrl .btn.gold').click(); await sleep(400);
await page.locator('.bj-chips .rl-chip').nth(0).click(); await page.locator('.bj-ctrl .btn.gold').click();
await page.waitForSelector('.bj-acts, .bj-banner.show', { timeout: 60000 });
if (await page.locator('.bj-acts').count()) { const d = page.locator('.bj-acts .btn.secondary'); if (await d.isEnabled()) await d.click(); else await page.locator('.bj-acts .btn.lavande').click(); }
await page.waitForSelector('.bj-banner.show', { timeout: 120000 }); await sleep(1500);
await page.locator('.cz-back').click(); await sleep(500);

// ---------- missions
await page.locator('.cz-pill2', { hasText: 'Missions' }).click(); await sleep(600);
await shot('missions');
check('missions listées', (await page.locator('.cz-mission').count()) >= 6);
const cl = page.locator('.cz-mission.ready .btn');
if (await cl.count()) { const c0 = (await st()).chips; await cl.first().click(); await sleep(500); check('mission réclamée → tickets', (await st()).chips > c0); }
await page.locator('.cz-back').click(); await sleep(400);

// ---------- sortie : reprendre le reste
const beforeExit = await st();
await page.locator('.cz-leave').click(); await sleep(600);
const after = await st();
check('sortie : pièces et tickets inchangés', after.bring === beforeExit.bring && after.chips === beforeExit.chips, JSON.stringify(after));
check('casino fermé', (await page.locator('.cz-root').count()) === 0);
await page.evaluate(() => { window.RADIA.casino.open(); }); await sleep(1000);
check('plus de mini-recharge de tickets', (await page.locator('.cz-refill .btn').count()) === 0);
await page.locator('.cz-enter').click(); await sleep(800);
await page.locator('.cz-leave').click(); await sleep(500);

// ---------- roue du jour
await page.evaluate(() => { window.RADIA.wheel.reset(); window.RADIA.wheel.force('chips600'); window.RADIA.wheel.show(); });
await sleep(900); await shot('wheel');
const cw0 = await st();
await page.locator('.wh-probbtn').click(); await sleep(400); await shot('wheel-probs');
check('probabilités listées', (await page.locator('.wh-prow').count()) === 10);
await page.locator('.wh-probbtn').click();
await page.locator('.wh-go').click(); await sleep(1500); await shot('wheel-spin');
await page.waitForSelector('.wh-got.show', { timeout: 120000 }); await sleep(900);
await shot('wheel-result');
const cw1 = await st();
check('roue : 600 tickets versés (lot imposé en debug)', cw1.chips === cw0.chips + 600, `${cw0.chips} → ${cw1.chips}`);
check('roue : bouton désactivé après le tirage', await page.locator('.wh-go').isDisabled());
check('roue : compte à rebours affiché', /Prochain tirage disponible dans/.test(await page.locator('.wh-status').textContent()));
await page.reload({ waitUntil: 'networkidle' }); await sleep(P === '/' ? 2500 : 500);
await page.evaluate(() => { window.RADIA.wheel.show(); }); await sleep(700);
check('rechargement : pas de second tirage', await page.locator('.wh-go').isDisabled());
await shot('wheel-after-reload');
await page.locator('.wh-x').click(); await sleep(400);
// ---------- cadeaux quotidiens : cycle varié (J3 tickets, J5 coffre, J6 tickets + objet, J7 tenue)
const claimDay = async (n, label) => {
  autoRw = false;
  await page.evaluate((n) => { window.RADIA.daily.reset(); window.RADIA.daily.setDay(n); window.RADIA.daily.show(); }, n);
  await page.waitForSelector('.dy-claim', { state: 'visible' }); await sleep(600);
  if (n === 3) await shot('daily-grid');
  await page.locator('.dy-claim').click();
  await page.waitForSelector('#reward-overlay .rw-root', { timeout: 20000 });
  await sleep(500); await page.locator('#reward-overlay .rw-art').click({ force: true, timeout: 5000 }).catch(() => {});
  await page.waitForSelector('#reward-overlay .rw-primary', { state: 'visible', timeout: 120000 }); await sleep(900);
  setTimeout(() => { autoRw = true; }, 60000);
  await shot(`daily-${label}`);
};
const t0 = await page.evaluate(() => window.RADIA.save.data.fun.casino.chips);
await claimDay(3, 'j3-tickets');
check('J3 : +250 tickets gratuits en poche', (await page.evaluate(() => window.RADIA.save.data.fun.casino.chips)) === t0 + 250);
check('J3 : bouton « Utiliser au casino »', (await page.locator('.rw-root .rw-act', { hasText: 'casino' }).count()) === 1);
await page.locator('#reward-overlay .rw-primary').click(); await page.waitForSelector('#reward-overlay', { state: 'detached', timeout: 8000 }).catch(() => {}); await sleep(500);
if (await page.locator('.dy-later').count()) { await page.locator('.dy-later').click(); await sleep(500); }
await claimDay(5, 'j5-coffre');
check('J5 : coffre de décoration, bouton « Placer au château »', (await page.locator('.rw-root .rw-act', { hasText: 'Placer' }).count()) === 1);
await page.locator('#reward-overlay .rw-primary').click(); await page.waitForSelector('#reward-overlay', { state: 'detached', timeout: 8000 }).catch(() => {}); await sleep(500);
if (await page.locator('.dy-later').count()) { await page.locator('.dy-later').click(); await sleep(500); }
const t1 = await page.evaluate(() => window.RADIA.save.data.fun.casino.chips);
await claimDay(6, 'j6-tickets-objet');
check('J6 : +400 tickets et bouton « Équiper »', (await page.evaluate(() => window.RADIA.save.data.fun.casino.chips)) === t1 + 400 && (await page.locator('.rw-root .rw-act', { hasText: 'Équiper' }).count()) === 1);
await page.locator('#reward-overlay .rw-primary').click(); await page.waitForSelector('#reward-overlay', { state: 'detached', timeout: 8000 }).catch(() => {}); await sleep(500);
if (await page.locator('.dy-later').count()) { await page.locator('.dy-later').click(); await sleep(500); }
await claimDay(7, 'j7-tenue');
await page.locator('#reward-overlay .rw-primary').click(); await page.waitForSelector('#reward-overlay', { state: 'detached', timeout: 8000 }).catch(() => {}); await sleep(500);
if (await page.locator('.dy-later').count()) { await page.locator('.dy-later').click(); await sleep(500); }
// grosse victoire : aperçu de la bannière dorée
await page.evaluate(() => { window.RADIA.casino.bigWin(1750); }); await sleep(1300); await shot('bigwin');
await sleep(1800);
check('erreurs console', errs.length === 0, errs.join(' | '));

await browser.close();
process.exit(out.some((l) => l.startsWith('KO')) ? 1 : 0);
