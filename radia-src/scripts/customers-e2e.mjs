// Clients dans Endless : portrait + prénom sans agrandir les cartes, fiche au toucher, remerciement discret, fidélité sauvegardée.
// Chromium ÉMULÉ (pas un vrai iPhone). PORT=4190 node scripts/customers-e2e.mjs   (393×852 puis 393×660 ; captures shots/c-*.png)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('shots', { recursive: true });
const PORT = process.env.PORT ?? 4190; const URL = `http://localhost:${PORT}/?debug`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9'], story: { step: 9999 }, levels: {}, hearts: 500, world: { flags: { 'rw:start-gift-v1': true }, res: { coins: 100, flowers: 5, fabric: 5, cocoa: 5 } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
async function run(H) {
  const tag = `[393×${H}]`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${tag} ${e.message}`));
  await page.addInitScript((s) => { if (!sessionStorage.getItem('c-seeded')) { localStorage.setItem('radia-save-v1', s); sessionStorage.setItem('c-seeded', '1'); } }, JSON.stringify(seed));
  const sleep = (ms) => page.waitForTimeout(ms);
  const E = (fn, ...a) => page.evaluate(([f, args]) => window.RADIA.endless[f](...args), [fn, a]);
  const closeModals = async () => { for (let i = 0; i < 6; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await sleep(400); } else break; } };
  await page.goto(URL, { waitUntil: 'networkidle' }); await sleep(2200); await closeModals();
  await page.getByText('MODE LIBRE').first().click(); await sleep(2800); await page.waitForSelector('.merge-hud.endless', { timeout: 8000 });
  await E('clearLocks'); await sleep(500);
  // 1. portraits + prénoms sur les trois cartes
  const cards = await page.evaluate(() => [...document.querySelectorAll('.en-card:not(.empty)')].map((c) => ({ name: c.querySelector('.en-who b')?.textContent ?? '', tier: c.querySelector('.en-who small')?.textContent ?? '', av: !!c.querySelector('img.en-av'), h: Math.round(c.getBoundingClientRect().height), top: Math.round(c.querySelector('.en-card-top').getBoundingClientRect().height), w: Math.round(c.getBoundingClientRect().width) })));
  check(`${tag} les trois commandes montrent un portrait et un prénom`, cards.length === 3 && cards.every((c) => c.av && c.name), JSON.stringify(cards.map((c) => `${c.name}/${c.tier}`)));
  check(`${tag} trois clients différents`, new Set(cards.map((c) => c.name)).size === 3);
  check(`${tag} Facile / Moyenne / Difficile restent lisibles`, cards.map((c) => c.tier).join() === 'Facile,Moyenne,Difficile', cards.map((c) => c.tier).join());
  check(`${tag} l'en-tête de carte ne grandit pas (≤ 22 px)`, cards.every((c) => c.top <= 22), cards.map((c) => c.top).join());
  const cs = await E('cellSize');
  check(`${tag} le plateau n'est pas réduit (cases ≥ ${H === 852 ? 61 : 47} px)`, cs >= (H === 852 ? 61 : 47), `${Math.round(cs)} px`);
  check(`${tag} aucune description longue sur les cartes (pas de texte de dialogue)`, await page.evaluate(() => ![...document.querySelectorAll('.en-card')].some((c) => /«|Coucou|Bonjour|Salam/.test(c.textContent))));
  await page.screenshot({ path: `shots/c-${H}-cartes.png` });
  // 2. toucher la carte : fiche du client
  await page.locator('.en-card[data-slot="0"]').click({ position: { x: 60, y: 70 } }); await sleep(900);
  const sheet = await page.evaluate(() => ({ open: !!document.querySelector('.cu-sheet'), say: document.querySelector('.cu-say')?.textContent ?? '', hearts: document.querySelectorAll('.cu-h.on').length }));
  check(`${tag} toucher la carte ouvre la fiche du client avec sa demande`, sheet.open && sheet.say.startsWith('«'), sheet.say.slice(0, 60));
  await page.screenshot({ path: `shots/c-${H}-fiche.png` });
  await page.locator('.en-sheet-x').click().catch(() => {}); await sleep(500);
  // 3. livraison : remerciement discret
  const st0 = await E('state'); const cust = st0.orders[0].customer;
  const hearts0 = (await E('state')).world.coins;
  await E('completeOrder', 0); await sleep(900);
  const th = await page.evaluate(() => { const t = document.querySelector('.cu-thanks'); if (!t) return null; const r = t.getBoundingClientRect(); return { text: t.innerText, h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }; });
  check(`${tag} le client remercie dans une petite bulle d'une ligne`, !!th && th.h <= 40, th ? `${th.text} (${th.h} px)` : 'aucune bulle');
  const geo = await page.evaluate(() => ({ first: window.RADIA.endless.cellXY(0), last: window.RADIA.endless.cellXY(35), cs: window.RADIA.endless.cellSize() }));
  check(`${tag} la bulle ne recouvre aucune case`, !!th && th.top >= geo.last.y + geo.cs / 2 - 3, th ? `bulle ${th.top} · plateau finit ${Math.round(geo.last.y + geo.cs / 2)}` : '');
  await page.screenshot({ path: `shots/c-${H}-merci.png` });
  const st1 = await E('state');
  check(`${tag} la fidélité du client est enregistrée (1 commande)`, st1.customers[cust]?.n === 1, JSON.stringify(st1.customers[cust]));
  await sleep(3600);
  check(`${tag} la bulle disparaît toute seule`, (await page.locator('.cu-thanks').count()) === 0);
  // 4. passage de niveau : étoiles + histoire + récompense
  const st2 = await E('state'); const slot = 1; const c2 = st2.orders[slot].customer;
  await E('setLoyalty', c2, 1); await sleep(200);
  const coins0 = (await E('state')).world.coins;
  await E('completeOrder', slot); await sleep(900);
  const up = await page.evaluate(() => ({ gold: !!document.querySelector('.cu-thanks.up'), text: document.querySelector('.cu-thanks')?.innerText ?? '' }));
  check(`${tag} nouveau niveau de fidélité : bulle dorée avec l'histoire du client`, up.gold && up.text.length > 10, up.text.slice(0, 70));
  const st3 = await E('state');
  check(`${tag} niveau 2 atteint et récompense versée (pièces)`, st3.customers[c2]?.n === 2 && st3.world.coins > coins0, `pièces ${coins0} → ${st3.world.coins}`);
  await page.screenshot({ path: `shots/c-${H}-niveau.png` });
  // 5. rechargement : fidélité conservée
  await page.evaluate(() => window.RADIA.save.writeNow()); await page.reload({ waitUntil: 'networkidle' }); await sleep(2500); await closeModals();
  const after = await page.evaluate(() => window.RADIA.save.data.fun.customers);
  check(`${tag} après rechargement : fidélité conservée`, after[c2]?.n === 2 && after[cust]?.n === 1, JSON.stringify(after));
  // 6. plateau manipulable pendant la bulle
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 2).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
