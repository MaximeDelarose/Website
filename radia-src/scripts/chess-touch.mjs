import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const save = { v: 5, story: { step: 999, choices: {}, history: [] }, memories: ['flowers','nord','arc','cinema','billard','promenade','royaume'], levels: {}, seenUpdates: ['v2', 'v4'], fun: { free: { announced: true } } };
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(save));
await page.goto(`http://localhost:${process.env.PORT ?? 4173}/?debug#k=${process.env.PHOTO_KEY ?? ''}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => { const k = window.RADIA.daily.state().key; window.RADIA.save.data.fun.daily.lastKey = k; window.RADIA.save.data.world.flags['rw:start-gift-v1'] = true; window.RADIA.save.save(); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(page);
const sleep = (ms) => page.waitForTimeout(ms);
const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const sq = async (name) => page.evaluate((n) => {
  const b = document.querySelector('.gb').getBoundingClientRect();
  const f = n.charCodeAt(0) - 97, r = 8 - Number(n[1]);
  return { x: b.left + (f + 0.5) * b.width / 8, y: b.top + (r + 0.5) * b.height / 8 };
}, name);
const drag = async (a, b) => { const p = await sq(a), q = await sq(b); await touch('touchStart', p.x, p.y); for (let k = 1; k <= 10; k++) { await touch('touchMove', p.x + (q.x - p.x) * k / 10, p.y + (q.y - p.y) * k / 10); await sleep(16); } await touch('touchEnd'); };
const tapSq = async (a) => { const p = await sq(a); await touch('touchStart', p.x, p.y); await sleep(40); await touch('touchEnd'); };
const fen = () => page.evaluate(() => (window.RADIA.save.data.chess.game?.pgn ?? '(none)').split('\n').pop());
const waitTurn = async () => { for (let i = 0; i < 60; i++) { const t = await page.evaluate(() => document.querySelector('.chess-status')?.textContent); if (t && t.includes('toi')) return; await sleep(200); } };
for (let i = 0; i < 10; i++) { const later = page.locator('.modal-backdrop:not(.leaving) .dy-later'); const b = (await later.count()) ? later : page.locator('.modal-backdrop:not(.leaving) button'); if (await b.count()) { await b.first().click({ timeout: 3000 }).catch(() => {}); await sleep(900); } }
await page.getByText('ÉCHECS').first().click(); await sleep(800);
const start = page.getByText('Commencer'); if (await start.count()) { await start.click(); await sleep(600); }
await drag('e2', 'e4'); await sleep(400); console.log('after drag e2e4:', await fen());
await waitTurn(); await sleep(300);
await tapSq('g1'); await sleep(150); await tapSq('f3'); await sleep(400); console.log('after tap g1 f3:', await fen());
await waitTurn(); await sleep(300);
// glisser hors du plateau → annulé
const p = await sq('f1'); await touch('touchStart', p.x, p.y); for (let k = 1; k <= 8; k++) { await touch('touchMove', p.x, p.y + k * 60); await sleep(16); } await touch('touchEnd'); await sleep(400);
console.log('after drag off board:', await fen());
// sélection puis glisser une autre pièce
await tapSq('d2'); await sleep(150); await drag('b1', 'c3'); await sleep(400); console.log('after select d2 then drag b1c3:', await fen());
await waitTurn(); await sleep(300);
// toucher-glisser très court (tremblement de doigt) puis toucher la cible
const d2 = await sq('d2'); await touch('touchStart', d2.x, d2.y); await touch('touchMove', d2.x + 4, d2.y + 3); await touch('touchEnd'); await sleep(150); await tapSq('d4'); await sleep(400);
console.log('after jitter tap d2 then d4:', await fen());
await waitTurn(); await sleep(500);
// position des pièces affichées vs logique
const mismatch = await page.evaluate(() => {
  const b = document.querySelector('.gb').getBoundingClientRect();
  return [...document.querySelectorAll('.gb-pieces .gb-piece:not(.vanish)')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round((r.left - b.left) / (b.width / 8)), Math.round((r.top - b.top) / (b.height / 8))]; }).length;
});
console.log('pieces displayed:', mismatch);
await page.screenshot({ path: 'shots/chess-touch.png' });
console.log('errors', errors);
await browser.close();
