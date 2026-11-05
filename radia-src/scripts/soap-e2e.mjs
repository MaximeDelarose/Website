// Chaîne « Savons PIMBÊCHE » dans Endless : générateur, production, fusions, commandes de savons, clients cohérents.
// Chromium ÉMULÉ. PORT=4190 node scripts/soap-e2e.mjs   (393×852 puis 393×660 ; captures shots/sp-*.png)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('shots', { recursive: true });
const PORT = process.env.PORT ?? 4190; const URL = `http://localhost:${PORT}/?debug`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5'], story: { step: 9999 }, levels: {}, hearts: 500, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
async function run(H) {
  const tag = `[393×${H}]`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${tag} ${e.message}`));
  await page.addInitScript((s) => { if (!sessionStorage.getItem('s-seeded')) { localStorage.setItem('radia-save-v1', s); sessionStorage.setItem('s-seeded', '1'); } }, JSON.stringify(seed));
  const sleep = (ms) => page.waitForTimeout(ms);
  const E = (fn, ...a) => page.evaluate(([f, args]) => window.RADIA.endless[f](...args), [fn, a]);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await page.goto(URL, { waitUntil: 'networkidle' }); await sleep(2200);
  for (let i = 0; i < 6; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await sleep(400); } else break; }
  await page.getByText('MODE LIBRE').first().click(); await sleep(2800); await page.waitForSelector('.merge-hud.endless', { timeout: 8000 });
  let st = await E('state');
  check(`${tag} départ : les savons ne sont pas encore là (déblocage progressif)`, !st.active.includes('soap'));
  await E('unlockAll'); await sleep(1800);
  await E('giveEnergy', 200); await sleep(300);
  st = await E('state');
  check(`${tag} déblocage : la collection « soap » devient active`, st.active.includes('soap'), st.active.join(','));
  const gen = st.cells.find((c) => c.c === 'gen' && c.l === 15);
  check(`${tag} le générateur « Atelier Pimbêche » est sur le plateau`, !!gen);
  // production : on touche le générateur
  const pg = await page.evaluate((i) => window.RADIA.endless.cellXY(i), gen.i);
  for (let k = 0; k < 6; k++) { await Promise.all([touch('touchStart', pg.x, pg.y), touch('touchEnd', pg.x, pg.y)]); await sleep(500); }
  st = await E('state');
  const soaps = st.cells.filter((c) => c.c === 'soap');
  check(`${tag} le générateur produit des savons`, soaps.length >= 3, `${soaps.length} savons : niveaux ${soaps.map((s) => s.l).join(',')}`);
  await page.screenshot({ path: `shots/sp-${H}-plateau.png` });
  // fusion de deux savons identiques
  const seen = new Map(); let pair = null;
  for (const c of soaps) { const k = c.l; if (seen.has(k)) { pair = [seen.get(k), c.i, k]; break; } seen.set(k, c.i); }
  if (!pair) { for (let k = 0; k < 8 && !pair; k++) { await Promise.all([touch('touchStart', pg.x, pg.y), touch('touchEnd', pg.x, pg.y)]); await sleep(450); const s2 = (await E('state')).cells.filter((c) => c.c === 'soap'); const m = new Map(); for (const c of s2) { if (m.has(c.l)) { pair = [m.get(c.l), c.i, c.l]; break; } m.set(c.l, c.i); } } }
  check(`${tag} deux savons identiques sont disponibles`, !!pair);
  if (pair) {
    const a = await page.evaluate((i) => window.RADIA.endless.cellXY(i), pair[0]); const b = await page.evaluate((i) => window.RADIA.endless.cellXY(i), pair[1]);
    await touch('touchStart', a.x, a.y); await touch('touchMove', a.x + (b.x - a.x) * 0.2, a.y + (b.y - a.y) * 0.2);
    for (let k = 1; k <= 5; k++) { await touch('touchMove', a.x + ((b.x - a.x) * k) / 5, a.y + ((b.y - a.y) * k) / 5); await sleep(25); }
    await touch('touchEnd', b.x, b.y); await sleep(900);
    const s3 = (await E('state')).cells;
    check(`${tag} la fusion donne le savon de niveau ${pair[2] + 1}`, s3.some((c) => c.c === 'soap' && c.l === pair[2] + 1));
  }
  await page.screenshot({ path: `shots/sp-${H}-final.png` });
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 2).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
