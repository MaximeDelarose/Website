// La quête commence en pleine fusion : quitter → partie intacte ; fermer/rouvrir Safari → reprise de la quête.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text().slice(0, 100)); });
await p.addInitScript(() => { const o = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__aud = this; return o.apply(this, arguments); }; if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', JSON.stringify({ v: 3, seenUpdates: ['v2', 'v3', 'v4'], story: { step: 0 }, levels: {}, hearts: 0 })); });
const url = `http://localhost:${process.env.PORT ?? 4180}/?debug#k=${process.env.PHOTO_KEY}`;
await p.goto(url); await p.waitForTimeout(4000);
const out = []; const check = (n, ok, x = '') => out.push(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`);
await p.getByText('MODE CHAPITRES').first().click();
for (let i = 0; i < 30; i++) {
  const on = await p.evaluate(() => { const m = window.RADIA.game().scene.getScene('merge'); return !!m && m.sys.isActive() && !document.querySelector('.dialog-layer:not(.leaving)') && !document.querySelector('.chapter-card') && !document.querySelector('.modal-backdrop:not(.leaving)'); });
  if (on) break;
  const c = p.getByText("C'est parti"); if (await c.count()) { await c.first().click().catch(() => {}); await p.waitForTimeout(600); continue; }
  const s = p.getByText('Passer'); if (await s.count()) await s.first().click().catch(() => {}); else await p.mouse.click(200, 500);
  await p.waitForTimeout(700);
}
await p.waitForTimeout(1500);
const board = () => p.evaluate(() => JSON.stringify(window.RADIA.game().scene.getScene('merge').state.cells.map(c => c.item ? c.item.c + ':' + c.item.l : null)));
const b0 = await board();
await p.evaluate(() => { const s = window.RADIA.save.data.events.secret; s.target = 20 * 60000; s.activeMs = 20 * 60000 + 500; });
await p.waitForSelector('.call-layer', { timeout: 20000 }).then(() => check('l\'appel arrive pendant la fusion (moment stable)', true)).catch(() => check('appel pendant la fusion', false));
await p.getByRole('button', { name: 'Décrocher' }).click(); await p.waitForTimeout(1200);
await p.evaluate(() => { try { window.__aud.currentTime = Math.max(0, window.__aud.duration - 0.4); } catch {} });
await p.waitForSelector('.call-end', { timeout: 20000 }); await p.getByRole('button', { name: 'Direction le dressing ♡' }).click();
await p.waitForSelector('.dr-ready', { timeout: 8000 });
await p.locator('.dr-tip button').click({ timeout: 1500 }).catch(() => {});
await p.locator('.dr-ready').click(); await p.waitForSelector('.dv-score', { timeout: 8000 });
await p.waitForTimeout(500);
const step1 = await p.evaluate(() => window.RADIA.save.data.events.current?.step);
check('quête sauvegardée à l\'étape du dressing', step1 === 1, 'étape ' + step1);
// quitter volontairement
await p.screenshot({ path: 'shots/sm-dv.png' });
console.log(JSON.stringify(await p.evaluate(() => { const q = document.querySelector('.ev-top .icon-btn').getBoundingClientRect(); const e = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return { q: [q.x, q.y, q.width, q.height], hit: e && e.className }; })));
await p.locator('.ev-top .icon-btn').click(); await p.waitForTimeout(500);
await p.getByRole('button', { name: 'Quitter' }).click().catch(async () => { await p.locator('.modal-backdrop .actions button').first().click(); });
await p.waitForTimeout(1200);
check('la partie de fusion est intacte', (await board()) === b0 && await p.evaluate(() => window.RADIA.game().scene.getScene('merge').sys.isActive()));
check('la quête est suspendue, pas perdue', await p.evaluate(() => { const e = window.RADIA.save.data.events; return e.current?.eventId === 's-evening' && e.inbox.some(i => i.eventId === 's-evening'); }));
// fermer / rouvrir Safari : même sauvegarde
await p.waitForTimeout(800);
await p.goto(url); await p.waitForTimeout(4500);
const resumed = await p.evaluate(() => window.RADIA.save.data.events.current?.step);
check('après fermeture de Safari, la progression est là', resumed >= 1, 'étape ' + resumed);
await p.waitForSelector('.ev-notif', { timeout: 15000 }).then(() => check('une notification propose de reprendre', true)).catch(() => check('notification de reprise', false));
await p.locator('.ev-notif .btn').first().click(); await p.waitForSelector('.ev-layer', { timeout: 6000 }).catch(() => {});
await p.waitForTimeout(1500);
check('la quête reprend là où elle s\'était arrêtée', (await p.locator('.ev-layer').count()) > 0 && (await p.evaluate(() => window.RADIA.save.data.events.current?.step)) >= 1);
console.log(out.join('\n')); console.log('erreurs:', errs.length ? errs.slice(0, 4) : 'aucune');
await b.close();
