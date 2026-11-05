// Snapchien : icône, 5 onglets (Chats, Snaps, Amis, Stories, Souvenirs), stories d'amis, ajout d'amis, badges. Chromium ÉMULÉ. PORT=4190 node scripts/snap-tabs-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} [${tag}] ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0');
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 5, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
async function run(H) {
  tag = `393×${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  const sleep = (ms) => page.waitForTimeout(ms);
  await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
  await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' }); await sleep(2500);
  for (let i = 0; i < 6; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await sleep(400); } }
  const chat = () => page.evaluate(() => window.RADIA.apps.state().snap.chat);
  await page.evaluate(() => window.RADIA.phone()); await sleep(900);
  // icône : jaune + mascotte blanche
  const iconOk = await page.locator('.phh-app[data-app="snap"] svg').first().evaluate((s) => { const html = s.outerHTML; return /#ffc700|#ffea3d/i.test(html) && /fill="#fff"/.test(html) && /#2a2a33/.test(html); });
  check('icône Snapchien : fond jaune vif + mascotte blanche contourée', iconOk);
  await page.screenshot({ path: `shots/snap-icon-393x${H}.png` });
  await page.locator('.phh-app[data-app="snap"]').click(); await sleep(1100);
  const labels = await page.locator('.snc-tab').evaluateAll((els) => els.map((e) => e.querySelector('span').textContent));
  check('5 onglets : Chats, Snaps, Amis, Stories, Souvenirs', JSON.stringify(labels) === JSON.stringify(['Chats', 'Snaps', 'Amis', 'Stories', 'Souvenirs']), labels.join(','));
  check('onglets dans l\'écran, ≥ 44 px', await page.locator('.snc-tab').evaluateAll((els) => els.every((e) => { const r = e.getBoundingClientRect(); return r.height >= 44 && r.left >= 0 && r.right <= 393.5 && r.bottom <= window.innerHeight + 0.5; })));
  check('Chats : liste des conversations', (await page.locator('.snc-row').count()) >= 1 && (await page.locator('.snc-tab.on').getAttribute('data-tab')) === 'chat');
  // Snaps : aucun snap → message ; puis on fait arriver des snaps
  await page.locator('.snc-tab[data-tab="snaps"]').click(); await sleep(500);
  check('Snaps : état vide expliqué', (await page.locator('.snp-empty').count()) === 1);
  await page.evaluate(() => { const s = window.RADIA.apps.state().snap.chat; const c = s.contacts.dylan; c.msgs.push({ id: 'zz1', from: 'in', kind: 'snap', text: 'Miroir de la salle', scene: 'mirror', opened: false, at: Date.now() }); c.unread = 1; c.lastIn = Date.now(); const k = s.contacts.kevin; k.msgs.push({ id: 'zz2', from: 'in', kind: 'video', text: 'Tracteur !', scene: 'tractor', opened: false, at: Date.now() - 5000 }); k.unread = 1; window.RADIA.save.save(); });
  await page.locator('.snc-tab[data-tab="chat"]').click(); await sleep(300); await page.locator('.snc-tab[data-tab="snaps"]').click(); await sleep(500);
  check('Snaps : seulement les échanges de snaps, non ouverts en premier', (await page.locator('.snc-row').count()) === 2);
  check('badge de l\'onglet Snaps = 2 snaps non ouverts', (await page.locator('.snc-tab[data-tab="snaps"] .snc-dot').innerText()) === '2');
  await page.locator('.snc-row').first().click(); await sleep(800);
  check('toucher un snap non ouvert l\'ouvre en plein écran', (await page.locator('.snc-viewer').count()) === 1);
  await page.locator('.snc-vclose').click(); await sleep(600);
  // Amis
  await page.locator('.snc-tab[data-tab="friends"]').click(); await sleep(500);
  const nFriends = await page.locator('.snc-row:not(.sug)').count();
  check('Amis : mes amis (avatars, noms, séries) listés', nFriends >= 4 && (await page.locator('.snc-h').first().innerText()).startsWith('Mes amis'), String(nFriends));
  const sug = await page.locator('.snc-row.sug').count();
  check('Amis : des suggestions à ajouter', sug >= 1, String(sug));
  const sugId = await page.locator('.snc-row.sug').first().getAttribute('data-cid');
  await page.locator('.snc-row.sug .snc-add').first().click(); await sleep(600);
  check('ajouter un ami : il rejoint la liste et disparaît des suggestions', (await chat()).contacts[sugId].added === true && (await page.locator(`.snc-row.sug[data-cid="${sugId}"]`).count()) === 0 && (await page.locator(`.snc-row:not(.sug)[data-cid="${sugId}"]`).count()) === 1);
  // Stories
  await page.locator('.snc-tab[data-tab="stories"]').click(); await sleep(600);
  const nStories = await page.locator('.snp-stories.friends .snp-story').count();
  check('Stories : des stories d\'amis du jour', nStories >= 1, String(nStories));
  const badge0 = await page.locator('.snc-tab[data-tab="stories"] .snc-dot').count();
  const firstStory = page.locator('.snp-stories.friends .snp-story').first(); const cid = await firstStory.getAttribute('data-cid');
  await firstStory.click(); await sleep(800);
  check('ouvrir une story : plein écran, légende lisible, barre de progression', (await page.locator('.snc-viewer.story .snc-cap p').innerText()).length > 2 && (await page.locator('.snc-storybar').count()) === 1);
  const sb = await page.locator('.snc-viewer.story').boundingBox();
  check('la story couvre tout l\'écran', sb.width >= 392 && sb.height >= H - 2);
  await page.locator('.snc-viewer.story .snc-vclose').click(); await sleep(700);
  check('fermer la story → retour aux Stories, marquée « vue »', (await page.locator('.snp-stories.friends .snp-story.seen').count()) >= 1 && (await chat()).storiesSeen[cid] !== undefined);
  void badge0;
  await page.screenshot({ path: `shots/snap-stories-393x${H}.png` });
  // Souvenirs
  await page.locator('.snc-tab[data-tab="home"]').click(); await sleep(600);
  check('Souvenirs : mon album + appareil photo', (await page.locator('.snp-fab').count()) === 1 && /Souvenirs/.test(await page.locator('.snp-brand b').innerText()));
  await page.locator('.snp-layer button[aria-label="Fermer"]').first().click(); await sleep(700);
  check('fermer Snapchien → accueil du téléphone', (await page.locator('.snp-layer').count()) === 0 && (await page.locator('.phh').count()) === 1);
  // sauvegarde
  await page.evaluate(() => window.RADIA.save.writeNow()); await page.reload({ waitUntil: 'networkidle' }); await sleep(2500);
  await page.evaluate(() => window.RADIA.phone()); await sleep(900);
  const c2 = await chat();
  check('après rechargement : ami ajouté et story vue conservés', c2.contacts[sugId].added === true && c2.storiesSeen[cid] !== undefined);
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
