// Quête complète « Une soirée avec A ♡ » par clics réels (appel → dressing → 10/10 → restaurant → photo → bracelet).
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 120)); });
await p.addInitScript(() => { localStorage.setItem('radia-save-v1', JSON.stringify({ v: 3, seenUpdates: ['v2', 'v3', 'v4'], story: { step: 0 }, levels: {}, hearts: 0 })); });
await p.goto(`http://localhost:${process.env.PORT ?? 4180}/?debug#k=${process.env.PHOTO_KEY}`); await p.waitForTimeout(4000);
const out = []; const check = (n, ok, x = '') => out.push(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`);
const coins0 = await p.evaluate(() => window.RADIA.save.data.world.res.coins);
const dia0 = await p.evaluate(() => window.RADIA.save.data.economy.diamonds);
await p.evaluate(() => window.RADIA.secretCall());
await p.waitForSelector('.call-layer'); await p.waitForTimeout(500);
await p.getByRole('button', { name: 'Décrocher' }).click(); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__skip = true; });
await p.evaluate(() => { const a = [...document.querySelectorAll('audio')]; });
await p.waitForTimeout(500);
// fin rapide du vocal
await p.evaluate(() => { const els = performance.getEntriesByType('resource'); });
await p.evaluate(() => { for (const el of document.querySelectorAll('audio')) { try { el.currentTime = Math.max(0, el.duration - 0.5); } catch {} } });
let ended = await p.waitForSelector('.call-end', { timeout: 40000 }).then(() => true).catch(() => false);
check('message vocal terminé → invitation', ended);
await p.getByRole('button', { name: 'Direction le dressing ♡' }).click();
let guess = null, shot = 0;
const t0 = Date.now();
const seen = new Set();
while (Date.now() - t0 < 240000) {
  if (await p.locator('.ev-concl').count()) break;
  const cur = await p.evaluate(() => { const c = window.RADIA.save.data.events.current; return c ? { step: c.step, g: c.data.guessMenu ?? null, m: c.data.menuPick ?? null, shoot: c.data.photoShoot ?? null } : null; });
  if (cur) seen.add(cur.step);
  if (cur?.g && !guess) guess = { g: cur.g, m: cur.m };
  const click = async (sel) => { const l = p.locator(sel); if (await l.count()) { await l.first().click({ timeout: 2000 }).catch(() => {}); return true; } return false; };
  const btn = async (re) => { const l = p.locator('button:visible', { hasText: re }); if (await l.count()) { await l.first().click({ timeout: 2000 }).catch(() => {}); return true; } return false; };
  if (await click('.dr-tip button')) { await p.waitForTimeout(300); continue; }
  if (await p.locator('.dr-ready').count()) { await p.evaluate(() => { const l = window.RADIA.save.data.world.wardrobe.look; l.dress = 'dr-sundress-yellow'; l.top = null; l.bottom = null; const w = window.RADIA.save.data.world.wardrobe; if (!w.owned.includes('dr-sundress-yellow')) w.owned.push('dr-sundress-yellow'); }); await click('.dr-ready'); await p.waitForTimeout(700); continue; }
  if (await p.locator('.ev-say').count()) { await p.waitForTimeout(300); await click('.ev-say'); await p.waitForTimeout(250); continue; }
  if (await p.locator('.ev-travel').count()) { await p.locator('.ev-body').click({ position: { x: 100, y: 300 } }).catch(() => {}); await p.waitForTimeout(400); continue; }
  if (await btn(/Direction le restaurant/)) { await p.waitForTimeout(500); continue; }
  if (await btn(/Valider mon menu/)) { await p.waitForTimeout(600); continue; }
  if (await p.locator('.rs-card:not(.sel)').count()) { await click('.rs-card:not(.sel)'); await p.waitForTimeout(450); continue; }
  if (await btn(/Voir mon menu/)) { await p.waitForTimeout(400); continue; }
  if (await btn(/Ouvrir le cadeau/)) { if (!shot++) await p.screenshot({ path: 'shots/sf-box.png' }); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/sf-box2.png' }); await p.waitForTimeout(2500); await p.screenshot({ path: 'shots/sf-open.png' }); continue; }
  if (await btn(/Le porter/)) { await p.screenshot({ path: 'shots/sf-askwear.png' }); await p.waitForTimeout(200); continue; }
  if (await btn(/Prendre la photo/)) { await p.waitForTimeout(3600); await p.screenshot({ path: 'shots/sf-shoot.png' }); continue; }
  if (await btn(/Passer le compte/)) { continue; }
  if (await btn(/Garder ce souvenir/)) { await p.waitForTimeout(500); continue; }
  if (await btn(/^Continuer/)) { await p.waitForTimeout(500); continue; }
  await p.waitForTimeout(500);
}
await p.screenshot({ path: 'shots/sf-concl.png' });
check('quête terminée (conclusion)', (await p.locator('.ev-concl').count()) > 0, 'étapes vues: ' + [...seen].join(','));
if (guess) { const a = guess.g.augusteMenu, m = guess.m; check('Auguste a commandé la même chose que Radia', a.starter === m.starter && a.main === m.main && a.dessert === m.dessert); } else check('devinette jouée', false);
await p.locator('.ev-concl .btn').first().click().catch(() => {}); await p.waitForTimeout(1000);
const st = await p.evaluate(() => { const s = window.RADIA.save.data; const e = s.events; return { done: e.done['s-evening']?.count, cur: e.current, photos: e.photos.filter(x => x.eventId === 's-evening').length, owned: s.world.wardrobe.owned.includes('br-promise'), worn: s.world.wardrobe.look.acc.includes('br-promise'), ach: 'ev_promise' in s.achievements, coins: s.world.res.coins, dia: s.economy.diamonds, claimed: Object.keys(e.claimed).length }; });
check('quête enregistrée une fois', st.done === 1 && st.cur === null);
check('photo souvenir de la soirée', st.photos === 1);
check('bracelet attribué', st.owned);
check('succès « Une promesse qui brille ♡ »', st.ach);
check('récompense unique', st.claimed === 1 && st.coins - coins0 >= 100, `pièces +${st.coins - coins0}, diamants +${st.dia - dia0}`);
check('bracelet porté (choix « Le porter »)', st.worn);
// souvenir « Une promesse au poignet ♡ » dans le téléphone + revoir la scène (sans récompense)
await p.evaluate(() => window.RADIA.phone()); await p.waitForTimeout(500);
await p.locator('.ph-tab[data-tab=souvenirs]').click(); await p.waitForTimeout(1800);
await p.screenshot({ path: 'shots/sf-souvenir.png' });
check('souvenir « Une promesse au poignet ♡ » dans l\'album', (await p.locator('.ph-promise').count()) === 1 && (await p.locator('.ph-promise').textContent()).includes('promesse'));
const before = await p.evaluate(() => { const s = window.RADIA.save.data; return { coins: s.world.res.coins, dia: s.economy.diamonds, claimed: Object.keys(s.events.claimed).length, owned: s.world.wardrobe.owned.filter(x => x === 'br-promise').length, count: s.events.done['s-evening'].count }; });
await p.getByRole('button', { name: /Revoir la scène/ }).click().catch(() => {});
await p.waitForSelector('.ev-layer', { timeout: 6000 }).then(() => check('« Revoir la scène » relance la cérémonie', true)).catch(() => check('revoir la scène', false));
for (let i = 0; i < 80 && (await p.locator('.ev-layer').count()); i++) {
  if (await p.locator('.ev-say').count()) { await p.waitForTimeout(300); await p.locator('.ev-say').first().click({ timeout: 1500 }).catch(() => {}); }
  else { const o = p.locator('button:visible', { hasText: /Ouvrir le cadeau|^Continuer/ }); if (await o.count()) await o.first().click({ timeout: 1500 }).catch(() => {}); }
  await p.waitForTimeout(400);
}
const after = await p.evaluate(() => { const s = window.RADIA.save.data; return { coins: s.world.res.coins, dia: s.economy.diamonds, claimed: Object.keys(s.events.claimed).length, owned: s.world.wardrobe.owned.filter(x => x === 'br-promise').length, count: s.events.done['s-evening'].count, cur: s.events.current }; });
check('revoir la scène : aucune récompense, aucun doublon', after.coins === before.coins && after.dia === before.dia && after.claimed === before.claimed && after.owned === 1 && after.count === before.count && !after.cur, JSON.stringify({before, after}));
console.log(out.join('\n')); console.log('erreurs:', errs.length ? errs.slice(0, 5) : 'aucune');
await b.close();
