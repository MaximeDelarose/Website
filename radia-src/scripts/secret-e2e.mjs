// Quête secrète : appel entrant (rien ne se lit avant « Décrocher ») → vocal → dressing → 10/10 → restaurant…
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4180';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 120)); });
await p.addInitScript(() => {
  window.__plays = [];
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { window.__plays.push({ src: (this.src || '').slice(0, 20), t: Date.now() }); window.__aud = this; return orig.apply(this, arguments); };
  localStorage.setItem('radia-save-v1', JSON.stringify({ v: 3, seenUpdates: ['v2', 'v3', 'v4'], story: { step: 0 }, levels: {}, hearts: 0 }));
});
await p.goto(`http://localhost:${PORT}/?debug#k=${process.env.PHOTO_KEY}`); await p.waitForTimeout(4000);
const out = []; const check = (n, ok, x = '') => out.push(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`);
check('seuil entre 20 et 30 min', await p.evaluate(() => { const t = window.RADIA.save.data.events.secret.target; return t >= 20 * 60000 && t <= 30 * 60000; }));
const musicPlaysBefore = await p.evaluate(() => window.__plays.length);
// pas d'appel avant la durée : on simule 19 min puis on vérifie qu'il ne se déclenche pas tout seul
await p.evaluate(() => { window.RADIA.save.data.events.secret.activeMs = 19 * 60000; window.RADIA.save.data.events.secret.target = 20 * 60000; });
await p.waitForTimeout(6000);
check('pas d\'appel à 19 min de jeu actif', (await p.locator('.call-layer').count()) === 0);
// ... puis au-delà du seuil : il se déclenche tout seul, à un moment stable
await p.evaluate(() => { window.RADIA.save.data.events.secret.activeMs = 20 * 60000 + 1000; });
await p.waitForSelector('.call-layer', { timeout: 15000 }).then(() => check('l\'appel arrive tout seul après le seuil', true)).catch(() => check('l\'appel arrive après le seuil', false));
await p.waitForTimeout(800);
await p.screenshot({ path: 'shots/se-1-incoming.png' });
const nm = await p.locator('.call-name').textContent();
check('nom exact « A » et mention « Appel dans RADIA »', nm === 'A' && (await p.locator('.call-app').textContent()) === 'Appel dans RADIA');
await p.waitForTimeout(2500);
const voicePlayed = await p.evaluate(() => window.__plays.filter(x => x.src.startsWith('blob:')).length);
check('aucun vocal avant « Décrocher »', voicePlayed === 0);
await p.getByRole('button', { name: 'Décrocher' }).click();
await p.waitForTimeout(2500);
await p.screenshot({ path: 'shots/se-2-live.png' });
const live = await p.evaluate(() => ({ plays: window.__plays.filter(x => x.src.startsWith('blob:')).length, t: window.__aud?.currentTime, dur: window.__aud?.duration, paused: window.__aud?.paused, duck: window.RADIA.audio.duckLevel }));
check('le vocal démarre après « Décrocher »', live.plays === 1 && live.t > 1 && !live.paused, `lecture ${live.t?.toFixed(1)} s / ${live.dur?.toFixed(1)} s`);
check('la musique est atténuée pendant le vocal', live.duck < 0.5, `niveau ${live.duck}`);
// fin du message
await p.evaluate(() => { window.__aud.currentTime = Math.max(0, window.__aud.duration - 0.8); });
await p.waitForSelector('.call-end', { timeout: 10000 }).then(() => check('fin du message : invitation affichée', true)).catch(() => check('fin du message', false));
await p.screenshot({ path: 'shots/se-3-end.png' });
const endTxt = await p.locator('.call-end').textContent();
check('textes de fin exacts', endTxt.includes('Auguste t’a invitée à une soirée surprise ♡') && endTxt.includes('Mets-toi sur ton trente et un !'));
check('musique rétablie après le message', await p.evaluate(() => window.RADIA.audio.duckLevel < 0.5) === true, '(le niveau reste bas jusqu\'au choix, puis remonte)');
await p.getByRole('button', { name: 'Direction le dressing ♡' }).click();
await p.waitForSelector('.dr-ready', { timeout: 8000 }).then(() => check('le dressing s\'ouvre', true)).catch(() => check('le dressing s\'ouvre', false));
const duckAfter = await p.evaluate(() => window.RADIA.audio.duckLevel);
check('musique remontée', duckAfter === 1, `niveau ${duckAfter}`);
await p.screenshot({ path: 'shots/se-4-dress.png' });
// tenue : on met une robe d'été puis « Je suis prête »
await p.evaluate(() => { const w = window.RADIA.save.data.world; w.wardrobe.look.dress = null; });
await p.locator('.dr-ready').click();
await p.waitForSelector('.dv-score', { timeout: 8000 }).then(() => check('Auguste apparaît (écran de validation)', true)).catch(() => check('écran de validation', false));
await p.waitForTimeout(3200);
await p.locator('.ev-say').first().click({ timeout: 4000 }).catch(() => {});
await p.waitForTimeout(2200);
await p.screenshot({ path: 'shots/se-5-verdict.png' });
check('note 10 / 10', (await p.locator('.dv-score b').textContent()).trim() === '10 / 10');
const quest = await p.evaluate(() => ({ cur: window.RADIA.save.data.events.current?.eventId, step: window.RADIA.save.data.events.current?.step }));
check('quête en cours sauvegardée', quest.cur === 's-evening' && quest.step >= 1, JSON.stringify(quest));
check('indicateur de 5 phases', (await p.locator('.ev-ph').count()) === 5, 'objectif : ' + (await p.locator('.ev-goal').textContent()));
console.log(out.join('\n')); console.log('erreurs:', errs.length ? errs.slice(0, 5) : 'aucune');
await b.close();
