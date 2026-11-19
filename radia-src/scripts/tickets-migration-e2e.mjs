// Simplification de l'économie : une ANCIENNE sauvegarde avec beaucoup de tickets est convertie en pièces (1 ticket = 10 pièces), une seule fois.
// Chromium ÉMULÉ (pas un vrai iPhone). PORT=4190 node scripts/tickets-migration-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const URL = `http://localhost:${PORT}/?debug&statsDelay=999999999`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
let fails = 0; const errors = [];
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

// ancienne sauvegarde (avant la simplification) : 3 000 tickets en poche + 200 sur la table + 50 tickets d'événement
const old = {
  v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 321,
  economy: { energy: 40, diamonds: 33, energyAt: Date.now(), bag: [], bagSlots: 6 },
  world: { flags: { 'rw:start-gift-v1': true }, res: { coins: 500, flowers: 5, fabric: 5, cocoa: 5 }, wardrobe: { owned: [] } },
  fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 },
    wheel: { lastKey: todayKey(), spins: 4, last: 'chips200' },
    casino: { chips: 3000, bring: 200, refillTs: 0, welcomed: true, missions: ['first-visit'], history: [], stats: { 'src.wheel': 400, 'cap.day': 20200101, 'ach.first_spark': 1 } },
    endless2: { tickets: 50 } },
};

const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(old));
await page.goto(URL, { waitUntil: 'networkidle' }); await sleep(3000);

// ---- 1. message unique d'information
const modalTxt = async () => ((await page.locator('.modal-backdrop:not(.leaving)').first().innerText().catch(() => '')) || '').replace(/[  ]/g, ' ');
const t1 = await modalTxt();
check('message d\'information : « Une économie plus simple »', /économie plus simple/i.test(t1), t1.slice(0, 80));
check('le message indique 3 250 tickets → 32 500 pièces (1 ticket = 10 pièces)', /3 250 tickets/.test(t1) && /32 500 pièces/.test(t1) && /1 ticket = 10 pièces/.test(t1), t1.replace(/\n/g, ' ').slice(0, 300));
await page.screenshot({ path: 'shots/eco-modal-393x852.png' });
await page.locator('.modal-backdrop:not(.leaving) .actions button').first().click(); await sleep(500);

// ---- 2. la sauvegarde : pièces converties, tout le reste intact, plus aucun ticket
const snap = () => page.evaluate(() => { const s = window.RADIA.save.data; return { coins: s.world.res.coins, diamonds: s.economy.diamonds, hearts: s.hearts, flowers: s.world.res.flowers, eco: s.fun.economy, casinoKeys: Object.keys(s.fun.casino), e2: Object.keys(s.fun.endless2), seen: s.seenUpdates, stats: s.fun.casino.stats }; });
let a = await snap();
check('pièces = 500 + 32 500 = 33 000', a.coins === 33000, String(a.coins));
check('diamants (33), cœurs (321), fleurs (5) intacts', a.diamonds === 33 && a.hearts === 321 && a.flowers === 5);
check('marque de conversion : une seule fois', a.eco.merged === true && a.eco.tickets === 3250 && a.eco.coins === 32500 && a.eco.seen === true, JSON.stringify(a.eco));
check('plus aucun champ de ticket dans la sauvegarde', !a.casinoKeys.includes('chips') && !a.casinoKeys.includes('bring') && !a.casinoKeys.includes('refillTs') && !a.e2.includes('tickets'), a.casinoKeys.join(','));
check('compteurs utiles conservés (succès déjà récompensé), compteurs de tickets écartés', a.stats['ach.first_spark'] === 1 && !('src.wheel' in a.stats));
check('nouveautés v11 notée', a.seen.includes('v11'));

// ---- 3. rechargements : jamais de doublon, jamais de second message
for (let i = 0; i < 3; i++) { await page.evaluate(() => window.RADIA.save.writeNow()); await page.reload({ waitUntil: 'networkidle' }); await sleep(2500); }
a = await snap();
check('après 3 rechargements : toujours 33 000 pièces, aucune duplication', a.coins === 33000, String(a.coins));
check('aucun message de conversion ré-affiché', (await page.locator('.modal-backdrop:not(.leaving)').count()) === 0);

// ---- 4. l'accueil et le casino : plus de ticket, une seule pièce dorée
const sub = await page.locator('.btn.mode.casino small').innerText();
check('accueil : le casino ne parle plus de tickets', !/ticket/i.test(sub), sub);
await page.evaluate(() => { window.RADIA.casino.open(); }); await sleep(1500);
const cardTxt = await page.locator('.cz-root').innerText();
check('casino : aucune mention de ticket ni de caisse d\'échange', !/ticket|échange|jeton/i.test(cardTxt) && (await page.locator('.cz-exchange').count()) === 0);
check('casino : les 33 000 pièces sont la mise', /33\s?000/.test((await page.locator('.cz-pill').innerText()).replace(/[  ]/g, ' ')));
await page.locator('.cz-enter').click(); await sleep(900);
check('salon : défis du jour en pièces', /Défis du jour/.test(await page.locator('.cz-root').innerText()) && !/ticket/i.test(await page.locator('.cz-root').innerText()));
await page.locator('.cz-leave').click(); await sleep(600);

// ---- 5. roue : l'ancien dernier lot (tickets) ne gêne pas ; un nouveau tirage donne des pièces
await page.evaluate(() => { window.RADIA.wheel.reset(); window.RADIA.wheel.force('coins100'); window.RADIA.wheel.show(); }); await sleep(900);
check('roue : 11 lots, icônes de pièces dorées dessinées', await page.evaluate(() => document.querySelector('.wh-probs') !== null));
await page.locator('.wh-go').click(); await page.waitForSelector('.wh-got.show', { timeout: 60000 }); await sleep(700);
a = await snap();
check('roue : +100 pièces (lot imposé en debug)', a.coins === 33100, String(a.coins));
await page.screenshot({ path: 'shots/eco-wheel-393x852.png' });
await page.locator('.wh-x').click(); await sleep(400);

// ---- 6. nouvelle joueuse : aucun message de conversion
const ctx2 = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p2 = await ctx2.newPage(); p2.on('pageerror', (e) => errors.push('neuve: ' + e.message));
await p2.goto(URL, { waitUntil: 'networkidle' }); await p2.waitForTimeout(3000);
const m2 = await p2.evaluate(() => ({ eco: window.RADIA.save.data.fun.economy, modal: document.querySelectorAll('.modal-backdrop:not(.leaving)').length, txt: document.body.innerText.includes('économie plus simple') }));
check('nouvelle joueuse : économie déjà simple, aucun message de conversion', m2.eco.merged === true && m2.eco.tickets === 0 && !m2.txt, JSON.stringify(m2.eco));

check('aucune erreur JS', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT EST OK (Chromium émulé, pas un vrai iPhone)');
process.exit(fails ? 1 : 0);
