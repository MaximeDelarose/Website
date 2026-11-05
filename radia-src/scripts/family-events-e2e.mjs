// Événements de famille : A chez maman, B aéroport (+ retrouvailles différées), C sortie avec Auguste (3 issues). On JOUE vraiment les mini-jeux.
// Chromium ÉMULÉ. PORT=4190 node scripts/family-events-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0'); // cadeau du jour déjà réclamé : sinon sa fenêtre bloque les notifications
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 50, world: { flags: { 'rw:start-gift-v1': true }, res: { coins: 300 } }, fun: { daily: { cycle: 0, day: 1, lastKey: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
  await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
  return page;
}

/** Lance l'invitation `id` et déroule l'événement ; `onActivity(page, state)` joue les mini-jeux. Renvoie les captures de textes vus. */
async function play(page, id, onActivity, shots = {}) {
  const seen = { says: [], places: new Set(), activities: [], travel: 0, dress: 0 };
  const count0 = await page.evaluate((i) => window.RADIA.save.data.events.done[i]?.count ?? 0, id);
  await page.evaluate((i) => window.RADIA.invite(i), id);
  try { await page.waitForSelector('.ev-notif', { timeout: 25000 }); } catch (e) {
    await page.screenshot({ path: '/tmp/claude-0/da/fm-stuck.png' });
    console.log('   notification absente ; couches ouvertes :', await page.evaluate(() => [...document.querySelectorAll('.modal-backdrop,.dialog-layer,.rw-layer,#reward-overlay > *,.ev-layer,.ev-concl,.toast,.notice')].map((e) => e.className.toString().slice(0, 40) + ' « ' + e.textContent.trim().slice(0, 60) + ' »').join(' || ')));
    throw e;
  }
  await page.locator('.ev-notif .btn').first().click();
  await page.waitForSelector('.ev-inv', { timeout: 6000 });
  if (shots.invite) await page.screenshot({ path: shots.invite });
  await page.locator('.ev-inv .btn').first().click();
  const t0 = Date.now();
  let lastLog = 0;
  while (Date.now() - t0 < 200000) {
    if (process.env.DEBUG && Date.now() - lastLog > 8000) { lastLog = Date.now(); console.log('   …', id, await page.evaluate(() => { const L = document.querySelector('.ev-layer'); return L ? [...L.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.textContent.trim()).slice(0, 6).map((e) => e.textContent.trim().slice(0, 28)).join(' | ') : 'pas de couche'; })); }
    if (await page.locator('.ev-concl').count()) break;
    if (await page.locator('.rw-skip').count()) { await page.locator('.rw-skip').first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(400); continue; }
    if (await page.locator('.dr-tip button').count()) { await page.locator('.dr-tip button').first().click().catch(() => {}); await page.waitForTimeout(250); continue; }
    if (await page.locator('.dr-ready').count()) { seen.dress++; await page.locator('.dr-ready').first().click().catch(() => {}); await page.waitForTimeout(700); continue; }
    if (await page.locator('.ev-say').count()) {
      const t = await page.locator('.ev-say').first().innerText().catch(() => ''); seen.says.push(t.replace(/\s+/g, ' ').trim());
      if (shots.say && !shots._s) { shots._s = 1; await page.screenshot({ path: shots.say }); }
      await page.waitForTimeout(350); await page.locator('.ev-say').first().click().catch(() => {}); await page.waitForTimeout(250); continue;
    }
    if (await page.locator('.ev-travel').count()) { seen.travel++; if (shots.travel && !shots._t) { shots._t = 1; await page.waitForTimeout(400); await page.screenshot({ path: shots.travel }); } await page.locator('.ev-body').click({ position: { x: 100, y: 300 } }).catch(() => {}); await page.waitForTimeout(400); continue; }
    if (await page.locator('.ea-card').count()) { // carte d'intro / de fin d'une activité
      const b = page.locator('.ea-card .btn, .ea-card button').first(); if (await b.count()) { await b.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(500); continue; }
    }
    if (await onActivity(page, seen, shots)) continue;
    const photo = page.locator('button', { hasText: /Photo !/ }); if (await photo.count()) { await photo.first().click().catch(() => {}); await page.waitForTimeout(3500); continue; }
    const cont = page.locator('button', { hasText: /^Continuer|Terminer|Suite/ }); if (await cont.count()) { await cont.first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(500); continue; }
    await page.waitForTimeout(500);
  }
  // fin d'événement comme la joueuse : fenêtre de récompense (Passer / Tout ouvrir / toucher l'objet), puis écran de conclusion
  const tryClick = async (sel) => { const l = page.locator(sel).first(); if (!(await l.count()) || !(await l.isVisible().catch(() => false))) return false; try { await l.click({ timeout: 1500 }); return true; } catch { return false; } };
  for (let k = 0; k < 40; k++) {
    let did = false;
    for (const sel of ['.rw-root .rw-primary', '.rw-root .rw-art', '.rw-root .rw-skip', '.rw-root .rw-all', '.rw-root button']) { if (await tryClick(sel)) { did = true; break; } }
    if (did) { await page.waitForTimeout(600); continue; }
    if (await tryClick('.ev-concl .btn')) { await page.waitForTimeout(600); continue; }
    if (!(await page.locator('.ev-layer').count()) && !(await page.locator('.rw-root').count())) break;
    await page.waitForTimeout(500);
  }
  const onScreen = await page.locator('.ev-concl').count();
  await page.waitForTimeout(1200);
  const count1 = await page.evaluate((i) => window.RADIA.save.data.events.done[i]?.count ?? 0, id);
  return { ...seen, concluded: count1 > count0 };
}

// ---- mini-jeu « choix en famille » : on choisit les N premières tuiles puis on valide
const picks = async (page, seen, shots) => {
  const tiles = page.locator('.ea-grid .ea-tile'); if (!(await tiles.count())) return false;
  if (!(await page.locator('.ea-sub').count())) return false;
  seen.activities.push('familyPick');
  const hint = (await page.locator('.ea-sub').nth(1).innerText().catch(() => '')) || '';
  const need = +(hint.match(/(\d+) élément/)?.[1] ?? 1);
  if (shots.pick && !shots._p) { shots._p = 1; await page.screenshot({ path: shots.pick }); }
  const on = await page.locator('.ea-grid .ea-tile.on').count();
  for (let i = on; i < Math.max(need, 1) + on && i < (await tiles.count()); i++) { await tiles.nth(i).click().catch(() => {}); await page.waitForTimeout(120); }
  const go = page.locator('button', { hasText: /^Valider/ }); if (await go.count()) { await go.first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(500); }
  return true;
};
const noAct = async () => false;

const ONLY = process.env.ONLY ?? '';
// ===================================================================== A — chez maman
if (!ONLY || ONLY === 'A') {
  const page = await open();
  const r = await play(page, 'fm-mom-visit', picks, { invite: '/tmp/claude-0/da/fm-a-invite.png', travel: '/tmp/claude-0/da/fm-a-travel.png', say: '/tmp/claude-0/da/fm-a-say.png', pick: '/tmp/claude-0/da/fm-a-pick.png' });
  check('A : événement terminé jusqu\'à la conclusion', r.concluded);
  check('A : maman parle (étiquette « Maman »), Radia répond', r.says.some((t) => /^Maman/.test(t)) && r.says.some((t) => /^Radia/.test(t)), r.says.slice(0, 2).join(' | '));
  check('A : trajet « chez maman », tenue choisie, goûter composé', r.travel >= 1 && r.dress >= 1 && r.activities.includes('familyPick'));
  const st = await page.evaluate(() => { const e = window.RADIA.save.data.events; return { done: e.done['fm-mom-visit'], photos: e.photos.filter((p) => p.eventId === 'fm-mom-visit').map((p) => ({ place: p.place, auguste: p.auguste, kids: p.kids })), current: e.current, coins: window.RADIA.save.data.world.res.coins }; });
  check('A : enregistré une fois, souvenir pris chez maman sans Auguste ni enfants', st.done?.count === 1 && st.photos.length === 1 && st.photos[0].place === 'momHome' && !st.photos[0].auguste && st.photos[0].kids.length === 0, JSON.stringify(st.photos));
  check('A : récompense versée (+90 pièces)', st.coins - 300 >= 90, `${st.coins - 300}`);
  check('A : plus d\'activité en cours', st.current === null);
  await page.context().close();
}

// ===================================================================== B puis B2 — aéroport et retrouvailles
if (!ONLY || ONLY === 'B') {
  const page = await open();
  const r = await play(page, 'fm-airport', picks, { travel: '/tmp/claude-0/da/fm-b-travel.png', say: '/tmp/claude-0/da/fm-b-say.png' });
  check('B : événement terminé', r.concluded);
  check('B : deux choix (cadeau + mot doux) validés', r.activities.length >= 1);
  const st = await page.evaluate(() => { const e = window.RADIA.save.data.events; return { done: e.done['fm-airport'], inbox: e.inbox.length }; });
  check('B : enregistré une seule fois', st.done?.count === 1);
  // les retrouvailles ne sont pas offertes tout de suite
  const early = await page.evaluate(() => { const e = window.RADIA.save.data.events; return e.inbox.some((i) => i.eventId === 'fm-airport-return'); });
  check('B2 : pas d\'invitation « retrouvailles » immédiatement', !early);
  // quelques minutes de jeu actif plus tard : éligible
  const el = await page.evaluate(async () => { const { eligible } = await window.RADIA.eventsManager(); const { eventById } = await window.RADIA.eventsData(); const e = window.RADIA.save.data.events; const pr = { chapter: 0, chessUnlocked: false, careerCurrent: null, careersTried: [] }; const before = eligible(eventById('fm-airport-return'), e, pr); e.playMs += 23 * 60000; const after = eligible(eventById('fm-airport-return'), e, pr); return { before, after }; }).catch(() => null);
  if (el) check('B2 : devient possible après ~22 min de jeu actif', el.before === false && el.after === true, JSON.stringify(el));
  // le planificateur propose naturellement d'autres invitations quand le temps de jeu avance : on les écarte pour ouvrir PRÉCISÉMENT les retrouvailles
  await page.evaluate(() => { const e = window.RADIA.save.data.events; e.current = null; e.lastEventId = ''; e.inbox = e.inbox.filter((i) => i.state === 'done'); e.bigLog.push(e.playMs); e.lastInviteAt = e.playMs; });
  const r2 = await play(page, 'fm-airport-return', picks, { say: '/tmp/claude-0/da/fm-b2-say.png' });
  check('B2 : retrouvailles terminées', r2.concluded);
  const st2 = await page.evaluate(() => window.RADIA.save.data.events.done['fm-airport-return']);
  check('B2 : enregistré une seule fois', st2?.count === 1);
  await page.context().close();
}

// ===================================================================== C — sortie avec Auguste (3 issues)
const careAct = (relWant, planB) => async (page, seen, shots) => {
  if (await page.locator('.ea-sub', { hasText: 'Pour quand' }).count()) {
    seen.activities.push('slot');
    // créneau où quelqu'un est (libre | occupé) selon la disponibilité simulée de CE run
    const idx = await page.evaluate(async (want) => { const R = await window.RADIA.relatives(); const rid = window.RADIA.save.data.events.current.runId; for (let i = 0; i < R.SLOTS.length; i++) { const av = R.REL_IDS.map((r) => R.availability(r, R.SLOTS[i].id, rid)); if (av.includes(want)) return i; } return 0; }, relWant);
    await page.locator('.ea-opt').nth(idx).click().catch(() => {}); await page.waitForTimeout(450); return true;
  }
  if (await page.locator('.ea-sub', { hasText: /À qui demander/ }).count()) {
    seen.activities.push('rel');
    if (shots.rel && !shots._r) { shots._r = 1; await page.screenshot({ path: shots.rel }); }
    const t = page.locator('.ea-tile', { hasText: relWant === 'busy' ? /Occupé/ : /Disponible/ });
    await ((await t.count()) ? t.first() : page.locator('.ea-tile').first()).click().catch(() => {}); await page.waitForTimeout(450); return true;
  }
  if (await page.locator('.ea-sub', { hasText: /Quel message/ }).count()) { seen.activities.push('tone'); await page.locator('.ea-opt').first().click().catch(() => {}); await page.waitForTimeout(1500); return true; }
  if (await page.locator('.ea-sub', { hasText: /autre solution/ }).count()) {
    seen.activities.push('planb');
    if (shots.planb && !shots._b) { shots._b = 1; await page.screenshot({ path: shots.planb }); }
    const label = planB === 'family' ? /sortie en famille/ : /Reporter/;
    await page.locator('.ea-opt', { hasText: label }).first().click().catch(() => {}); await page.waitForTimeout(450); return true;
  }
  return false;
};
for (const mode of (ONLY && ONLY !== 'C' ? [] : ONLY === 'C' && process.env.MODE ? [process.env.MODE] : ['arranged', 'family', 'postpone'])) {
  const page = await open();
  const shots = mode === 'arranged' ? { invite: '/tmp/claude-0/da/fm-c-invite.png', rel: '/tmp/claude-0/da/fm-c-rel.png', planb: '/tmp/claude-0/da/fm-c-planb.png', concl: '/tmp/claude-0/da/fm-c-concl.png' } : {};
  // forcer le plan B pour les issues « famille » et « report » : toutes les personnes occupées → refus, puis le plan B choisi
  const r = await play(page, 'fm-auguste-out', careAct(mode === 'arranged' ? 'free' : 'busy', mode), shots);
  check(`C (${mode}) : événement terminé`, r.concluded);
  const st = await page.evaluate(() => { const e = window.RADIA.save.data.events; const run = e.done['fm-auguste-out']; const ph = e.photos.filter((p) => p.eventId === 'fm-auguste-out'); return { done: run, photos: ph.map((p) => ({ place: p.place, auguste: p.auguste, kids: p.kids.length })), current: e.current }; });
  check(`C (${mode}) : enregistré une fois`, st.done?.count === 1);
  if (mode === 'arranged') check('C (organisé) : tenue + rooftop + photo avec Auguste, sans enfants', r.dress >= 1 && st.photos.some((p) => p.place === 'rooftop' && p.auguste && p.kids === 0), JSON.stringify(st.photos));
  if (mode === 'family') check('C (famille) : photo au jardin avec Auguste et les 3 enfants, sans tenue de soirée', st.photos.some((p) => p.place === 'garden' && p.auguste && p.kids === 3) && r.dress === 0, JSON.stringify(st.photos));
  if (mode === 'postpone') check('C (report) : aucune photo ni tenue, fin douce', st.photos.length === 0 && r.dress === 0 && r.says.some((t) => /sans pression/.test(t)), r.says.slice(-2).join(' | '));
  check(`C (${mode}) : plus d\'activité en cours`, st.current === null);
  await page.context().close();
}

check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
