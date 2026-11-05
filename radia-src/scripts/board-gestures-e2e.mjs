// Gestes tactiles du plateau Endless : le plateau doit TOUJOURS rester sélectionnable (vrais toucher CDP, Chromium ÉMULÉ, pas un vrai iPhone).
//   PORT=4187 node scripts/board-gestures-e2e.mjs        (393×852 puis 393×660)
// Reproduit le blocage « plus aucun objet ne se sélectionne » : toucher annulé en plein geste (touchcancel), relâchement perdu,
// appui long suivi d'une fiche, rafales de touchers / glissés / annulations, sélection pendant une animation de combo.
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4187;
const URL = `http://localhost:${PORT}/?debug`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (name, ok, detail = '') => { const l = `${ok ? 'OK ' : 'KO '} [${tag}] ${name}${detail ? ` — ${detail}` : ''}`; results.push({ ok: !!ok, l }); console.log(l); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const baseSave = () => ({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7'], story: { step: 9999 }, levels: {}, hearts: 500, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } });
async function run(H) {
  tag = `393×${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|Ignored attempt to cancel a touchcancel/.test(m.text())) errors.push(`[${tag}] console: ${m.text()} @ ${m.location().url.split('/').pop()}:${m.location().lineNumber}`); });
  await page.addInitScript((s) => { if (!sessionStorage.getItem('g-seeded')) { localStorage.setItem('radia-save-v1', s); sessionStorage.setItem('g-seeded', '1'); } }, JSON.stringify(baseSave()));
  await page.addInitScript(() => window.addEventListener('error', (e) => { (window.__errs = window.__errs || []).push(String((e.error && e.error.stack) || e.message).slice(0, 500)); }));
  const cdp = await ctx.newCDPSession(page);
  const sleep = (ms) => page.waitForTimeout(ms);
  const E = (fn, ...a) => page.evaluate(([f, args]) => window.RADIA.endless[f](...args), [fn, a]);
  const ptr = () => E('pointer');
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
  const xy = (i) => E('cellXY', i);
  const closeModals = async () => { for (let i = 0; i < 14; i++) { let b = page.locator('.modal-backdrop:not(.leaving) .dy-later'); if (!(await b.count())) b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.first().click().catch(() => {}); await sleep(500); } else break; } };
  await page.goto(URL, { waitUntil: 'networkidle' }); await sleep(1800); await closeModals();
  if (await page.getByText('Carte du domaine').count()) { await page.locator('.screen-head .icon-btn').first().click().catch(() => {}); await sleep(700); await closeModals(); }
  await page.getByText('MODE LIBRE').first().click(); await sleep(2800);
  await page.waitForSelector('.merge-hud.endless', { timeout: 8000 });
  await E('clearLocks'); await sleep(600);
  // objets de départ : on vide le plateau puis on pose 6 objets bien séparés
  const st0 = await E('state');
  for (const c of st0.cells) await E('setItem', c.i, null);
  const cells = [0, 2, 4, 14, 16, 18];
  cells.forEach(() => {});
  for (const [k, i] of cells.entries()) await E('setItem', i, k % 2 ? 'flowers' : 'choc', 1 + (k % 3));
  await sleep(900);
  const tapCell = async (i) => { const p = await xy(i); await Promise.all([touch('touchStart', p.x, p.y), touch('touchEnd', p.x, p.y)]); await sleep(300); };
  const selected = async () => (await ptr()).selected;

  // 0. plus de bandeau d'aide permanent ; la fiche d'objet ne recouvre aucune case
  await page.waitForTimeout(6500); // l'aide d'accueil (une seule fois) a disparu
  const empty = await page.evaluate(() => { const e = document.querySelector('.en-sel'); return { hint: !!document.querySelector('.en-sel-hint'), shown: !!e && getComputedStyle(e).display !== 'none' }; });
  check('aucun bandeau d’aide permanent sous le plateau', !empty.hint && !empty.shown, JSON.stringify(empty));
  // 1. sélection normale
  await tapCell(0); check('toucher court : sélectionne', (await selected()) === 0, JSON.stringify(await ptr()));
  const geo = await page.evaluate(() => { const e = document.querySelector('.en-sel'); const r = e ? e.getBoundingClientRect() : null; return r && getComputedStyle(e).display !== 'none' ? { top: r.top, bottom: r.bottom } : null; });
  const cellSize = await E('cellSize'); const lastRow = await xy(27);
  check('fiche d’objet visible, sous la dernière rangée de cases', !!geo && geo.top >= lastRow.y + cellSize / 2 - 2, JSON.stringify({ geo, lastRowBottom: lastRow.y + cellSize / 2 }));
  await tapCell(0); await sleep(200);

  // 2. TOUCHER ANNULÉ en plein geste (Safari reprend la main) puis nouvelle sélection
  let p0 = await xy(2);
  await touch('touchStart', p0.x, p0.y); await sleep(60);
  await touch('touchCancel', p0.x, p0.y); await sleep(400);
  let pp = await ptr();
  check('touchcancel : le geste est libéré', pp.drag === false, JSON.stringify(pp));
  await tapCell(4); check('après touchcancel : un autre objet se sélectionne', (await selected()) === 4, JSON.stringify(await ptr()));

  // 3. annulation en plein glissé
  p0 = await xy(14); let q = await xy(16);
  await touch('touchStart', p0.x, p0.y); for (let k = 1; k <= 6; k++) await touch('touchMove', p0.x + ((q.x - p0.x) * k) / 8, p0.y + ((q.y - p0.y) * k) / 8);
  await touch('touchCancel', q.x, q.y); await sleep(450);
  pp = await ptr(); check('annulation en plein glissé : plus de geste en cours', pp.drag === false, JSON.stringify(pp));
  await tapCell(18); check('après glissé annulé : sélection possible', (await selected()) === 18, JSON.stringify(await ptr()));

  // 4. appui long (fiche) puis relâchement : la sélection redevient normale, même sans fermer la fiche proprement
  p0 = await xy(2);
  await touch('touchStart', p0.x, p0.y); await sleep(900); await touch('touchEnd', p0.x, p0.y); await sleep(500);
  check('appui long : geste terminé au relâchement', (await ptr()).drag === false);
  await page.evaluate(() => document.querySelectorAll('.en-sheet-x, .en-sheet-back').forEach((e) => e.click())); await sleep(500);
  await tapCell(0); check('après appui long : sélection normale', (await selected()) === 0);

  // 5. appui long dont le relâchement n'arrive JAMAIS (doigt volé par le système) : le chien de garde rend la main
  p0 = await xy(14);
  await touch('touchStart', p0.x, p0.y); await sleep(900); await touch('touchCancel', p0.x, p0.y); await sleep(500);
  await page.evaluate(() => document.querySelectorAll('.en-sheet-x, .en-sheet-back').forEach((e) => e.click())); await sleep(400);
  await tapCell(16); check('appui long annulé : sélection possible', (await selected()) === 16, JSON.stringify(await ptr()));

  // 6. rafale : 60 gestes aléatoires (touchers, glissés, annulations, appuis longs) puis la sélection doit fonctionner
  let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let n = 0; n < 60; n++) {
    const a = cells[Math.floor(rnd() * cells.length)], b = cells[Math.floor(rnd() * cells.length)];
    const pa = await xy(a), pb = await xy(b); const r = rnd();
    if (r < 0.35) { await Promise.all([touch('touchStart', pa.x, pa.y), touch('touchEnd', pa.x, pa.y)]); }
    else if (r < 0.65) { await touch('touchStart', pa.x, pa.y); for (let k = 1; k <= 4; k++) await touch('touchMove', pa.x + ((pb.x - pa.x) * k) / 4, pa.y + ((pb.y - pa.y) * k) / 4); await touch('touchEnd', pb.x, pb.y); }
    else if (r < 0.85) { await touch('touchStart', pa.x, pa.y); await sleep(30); await touch('touchCancel', pa.x, pa.y); }
    else { await touch('touchStart', pa.x, pa.y); await sleep(620); await touch('touchEnd', pa.x, pa.y); await page.evaluate(() => document.querySelectorAll('.en-sheet-x, .en-sheet-back').forEach((e) => e.click())); }
    await sleep(60);
  }
  await sleep(700);
  await page.evaluate(() => document.querySelectorAll('.en-sheet-x, .en-sheet-back').forEach((e) => e.click())); await sleep(400);
  check('après 60 gestes aléatoires : aucun geste coincé', (await ptr()).drag === false, JSON.stringify(await ptr()));
  const st = await E('state'); const occ = st.cells.map((c) => c.i);
  let okSel = 0; for (const i of occ.slice(0, 4)) { await tapCell(i); if ((await selected()) === i) okSel++; await tapCell(i); }
  check('après la rafale : chaque objet se sélectionne encore', okSel === Math.min(4, occ.length), `${okSel}/${Math.min(4, occ.length)}`);

  // 7. sélection PENDANT une animation de combo
  await E('combo', 5); await sleep(120);
  const occ2 = (await E('state')).cells.map((c) => c.i);
  await tapCell(occ2[0]); check('pendant l’animation de combo : sélection possible', (await selected()) === occ2[0], JSON.stringify(await ptr()));
  await tapCell(occ2[0]);
  // 8. rien d'invisible ne capte les touchers au-dessus du plateau
  const blockers = [];
  for (const i of [0, 2, 4, 6, 14, 16, 18, 20, 22, 24, 26]) { const pt = await xy(i); if (!pt) continue; const tag2 = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.tagName !== 'CANVAS' && getComputedStyle(e).pointerEvents !== 'none' ? (e.className || e.tagName) : ''; }, [pt.x, pt.y]); if (tag2) blockers.push(`case ${i}: ${tag2}`); }
  check('aucun élément HTML ne recouvre le plateau', blockers.length === 0, blockers.join(' | '));
  // 9. quitter puis revenir : le plateau reste jouable
  await page.locator('.merge-hud .icon-btn, .merge-hud .back, .screen-head .icon-btn').first().click().catch(() => {}); await sleep(900); await closeModals();
  await page.getByText('MODE LIBRE').first().click().catch(() => {}); await sleep(2500);
  const occ3 = (await E('state')).cells.map((c) => c.i);
  if (occ3.length) { await tapCell(occ3[0]); check('retour dans le mode : sélection possible', (await selected()) === occ3[0], JSON.stringify(await ptr())); }
  const stacks = await page.evaluate(() => window.__errs || []).catch(() => []);
  if (stacks.length) console.log('STACK', stacks[0]);
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur console / page', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close();
process.exit(ko ? 1 : 0);
