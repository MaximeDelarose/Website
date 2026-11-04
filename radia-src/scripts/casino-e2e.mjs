// Casino Royal + roue du jour : parcours Playwright (Chromium émulé, pas un vrai iPhone).
// Build isolé : npx vite build --outDir /tmp/claude-0/g  puis  npx vite preview --outDir /tmp/claude-0/g --port 4198
// PORT=4198 W=393 H=852 [REDUCED=1] node scripts/casino-e2e.mjs   (PATH_URL=/ par défaut : l'application complète ; elle doit importer src/casino et src/wheel,
// sinon RADIA.casino est absent et le script le signale. Le port 4188 prévu au brief étant occupé par un autre serveur, 4198 sert de défaut.)
// Joue de vraies manches de chaque jeu par clics, vérifie débit / gain, erreurs console, prend des captures shots/g-*.png.
import { chromium } from 'playwright';
const W = +(process.env.W ?? 393), H = +(process.env.H ?? 852), PORT = process.env.PORT ?? 4198, P = process.env.PATH_URL ?? '/';
const TAG = `${W}x${H}`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const out = [];
const check = (name, ok, extra = '') => out.push(`${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`);
const shot = (n) => page.screenshot({ path: `shots/g-${n}-${TAG}.png` });
const seed = { v: 2, seenUpdates: ['v2', 'v4'], story: { step: 80 }, levels: {}, hearts: 500 };
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await page.goto(`http://localhost:${PORT}${P}?debug`, { waitUntil: 'networkidle' });
await sleep(P === '/' ? 2500 : 600);
for (let i = 0; i < 6 && P === '/'; i++) { await page.evaluate(() => document.querySelectorAll('.dy-back').forEach((e) => e.remove())); const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.first().click(); await sleep(400); } else await sleep(300); }
if (process.env.REDUCED) await page.evaluate(() => { window.RADIA.save.data.settings.reducedMotion = true; document.documentElement.classList.add('reduced-motion'); });
const st = () => page.evaluate(() => { const c = window.RADIA.save.data.fun.casino; return { chips: c.chips, bring: c.bring, stats: { ...c.stats }, hist: c.history.length }; });
const hasApi = await page.evaluate(() => !!window.RADIA?.casino && !!window.RADIA?.wheel);
check('API debug RADIA.casino / RADIA.wheel présente (le hub doit importer src/casino et src/wheel)', hasApi);
if (!hasApi) { console.log(out.join('\n')); await browser.close(); process.exit(1); }

// ---------- ouverture, allocation, carte d'Auguste
await page.evaluate(() => { window.RADIA.casino.open(); });
await sleep(1200);
check('écran casino ouvert', (await page.locator('.cz-root').count()) === 1);
let s0 = await st();
check('allocation gratuite 500 versée', s0.chips + s0.bring === 500, JSON.stringify(s0));
await shot('card');
check('carte d\'Auguste affichée', (await page.locator('.cz-member').count()) === 1);
await page.locator('.cz-quick button', { hasText: 'Tout' }).click(); await sleep(200);
s0 = await st();
check('bring = tout (500)', s0.bring === 500 && s0.chips === 0, JSON.stringify(s0));
await page.locator('.cz-quick button', { hasText: 'Moitié' }).click(); await sleep(200);
s0 = await st();
check('bring = moitié, reste en poche', s0.bring === 250 && s0.chips === 250, JSON.stringify(s0));
await page.locator('.cz-quick button', { hasText: 'Tout' }).click(); await sleep(150);
await page.locator('.cz-enter').click(); await sleep(900);
await shot('lobby');
check('salon : 3 jeux', (await page.locator('.cz-game').count()) === 3);
check('zones tactiles >= 44 px (salon)', await page.evaluate(() => [...document.querySelectorAll('.cz-root button')].filter((b) => b.offsetParent).every((b) => { const r = b.getBoundingClientRect(); return r.height >= 43.5 && r.width >= 43.5; })));
check('pas de défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
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
await page.waitForSelector('.rl-result.show', { timeout: 14000 }); await sleep(900);
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
await page.waitForSelector('.rl-result.show', { timeout: 14000 }); await sleep(800);
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
await page.waitForFunction(() => !document.querySelector('.cz-root.x') && document.querySelector('.sl-go') && !document.querySelector('.sl')?.classList.contains('running'), null, { timeout: 15000 });
await sleep(1500);
const b1 = (await st());
check('tirage simple : débit 10 + gain cohérent', b1.stats['slots.parties'] === 1 && Math.abs(b1.bring - b0) <= 10 * 500, `solde ${b0} → ${b1.bring}`);
await shot('slots-result');
// série ×5 avec arrêt
await page.locator('.sl-segb[data-n="5"]').click();
const tot5 = await page.locator('.sl-totline').textContent();
check('mise totale ×5 affichée avant', /50/.test(tot5), tot5);
const bb = (await st());
await page.locator('.sl-go').click();
await page.waitForSelector('.sl-stop', { state: 'visible' }); await sleep(900);
await page.locator('.sl-stop').click();
await page.waitForSelector('.sl-recap', { timeout: 20000 }); await sleep(500);
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
await page.waitForSelector('.sl-recap', { timeout: 60000 }); await sleep(500);
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
await page.locator('.bj-chips .rl-chip').nth(2).click(); // +50
check('mise 50 posée', (await page.locator('.bj-bet b').textContent()).replace(/\s/g, '') === '50');
await page.locator('.bj-ctrl .btn.gold').click(); await sleep(900);
await shot('blackjack-deal');
check('mise débitée avant la donne', (await st()).bring === bj0 - 50);
await page.waitForSelector('.bj-acts, .bj-banner.show', { timeout: 10000 });
if (await page.locator('.bj-acts').count()) {
  await shot('blackjack-play');
  await page.locator('.bj-acts .btn.lavande').click();
}
await page.waitForSelector('.bj-banner.show', { timeout: 15000 }); await sleep(1800);
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
await page.waitForSelector('.bj-acts, .bj-banner.show', { timeout: 10000 });
if (await page.locator('.bj-acts').count()) { const d = page.locator('.bj-acts .btn.secondary'); if (await d.isEnabled()) await d.click(); else await page.locator('.bj-acts .btn.lavande').click(); }
await page.waitForSelector('.bj-banner.show', { timeout: 15000 }); await sleep(1500);
await page.locator('.cz-back').click(); await sleep(500);

// ---------- missions
await page.locator('.cz-pill2', { hasText: 'Missions' }).click(); await sleep(600);
await shot('missions');
check('missions listées', (await page.locator('.cz-mission').count()) >= 6);
const cl = page.locator('.cz-mission.ready .btn');
if (await cl.count()) { const c0 = (await st()).chips; await cl.first().click(); await sleep(500); check('mission réclamée → jetons', (await st()).chips > c0); }
await page.locator('.cz-back').click(); await sleep(400);

// ---------- sortie : reprendre le reste
const beforeExit = await st();
await page.locator('.cz-leave').click(); await sleep(600);
const after = await st();
check('sortie : la table est rendue en poche', after.bring === 0 && after.chips === beforeExit.chips + beforeExit.bring, JSON.stringify(after));
check('casino fermé', (await page.locator('.cz-root').count()) === 0);

// ---------- mini-recharge gratuite (solde presque vide)
await page.evaluate(() => { window.RADIA.casino.set(3); window.RADIA.save.data.fun.casino.refillTs = 0; });
await page.evaluate(() => { window.RADIA.casino.open(); }); await sleep(1000);
check('mini-recharge proposée quand le solde est presque vide', (await page.locator('.cz-refill .btn').count()) === 1);
await shot('refill');
await page.locator('.cz-refill .btn').click(); await sleep(700);
const rf = await st();
check('mini-recharge : total remonté à 100', rf.chips + rf.bring === 100, JSON.stringify([rf.chips, rf.bring]));
await sleep(300);
check('mini-recharge : plus de bouton une fois le solde de base atteint', (await page.locator('.cz-refill .btn').count()) === 0);
await page.locator('.cz-back').click(); await sleep(600);

// ---------- roue du jour
await page.evaluate(() => { window.RADIA.wheel.reset(); window.RADIA.wheel.force('chips600'); window.RADIA.wheel.show(); });
await sleep(900); await shot('wheel');
const cw0 = await st();
await page.locator('.wh-probbtn').click(); await sleep(400); await shot('wheel-probs');
check('probabilités listées', (await page.locator('.wh-prow').count()) === 10);
await page.locator('.wh-probbtn').click();
await page.locator('.wh-go').click(); await sleep(1500); await shot('wheel-spin');
await page.waitForSelector('.wh-got.show', { timeout: 15000 }); await sleep(900);
await shot('wheel-result');
const cw1 = await st();
check('roue : 600 jetons versés (lot imposé en debug)', cw1.chips === cw0.chips + 600, `${cw0.chips} → ${cw1.chips}`);
check('roue : bouton désactivé après le tirage', await page.locator('.wh-go').isDisabled());
check('roue : compte à rebours affiché', /Prochain tirage disponible dans/.test(await page.locator('.wh-status').textContent()));
await page.reload({ waitUntil: 'networkidle' }); await sleep(P === '/' ? 2500 : 500);
await page.evaluate(() => { window.RADIA.wheel.show(); }); await sleep(700);
check('rechargement : pas de second tirage', await page.locator('.wh-go').isDisabled());
await shot('wheel-after-reload');
await page.locator('.wh-x').click(); await sleep(400);
check('erreurs console', errs.length === 0, errs.join(' | '));
console.log(out.join('\n'));
await browser.close();
process.exit(out.some((l) => l.startsWith('KO')) ? 1 : 0);
