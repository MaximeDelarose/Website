// Ouverture de cadeaux et de coffres (src/ui/rewards) : parcours Playwright. Chromium ÉMULÉ, pas un vrai iPhone ;
// sons non écoutés, vibrations non vérifiables.
// Build isolé :  npx vite build --outDir /tmp/claude-0/r  puis  npx vite preview --outDir /tmp/claude-0/r --port 4199
// Lancer :       PORT=4199 W=393 H=852 [REDUCED=1] [SHOTS=1] node scripts/rewards-e2e.mjs   (essayer aussi H=660 et H=600)
// SHOTS=1 : captures au ralenti (RADIA.rewards.slow) des 6 étapes pour chaque rareté → shots/r-*.png
import { chromium } from 'playwright';
const W = +(process.env.W ?? 393), H = +(process.env.H ?? 852), PORT = process.env.PORT ?? 4199;
const TAG = `${W}x${H}${process.env.REDUCED ? 'r' : ''}`;
const browser = await chromium.launch({ args: ['--no-proxy-server'], executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR ?? 1), hasTouch: true, isMobile: true });
const out = [];
const check = (name, ok, extra = '') => { const l = `${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`; out.push(l); console.log(l); };
const errs = [];
const today = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; })();
const seedOf = (o = {}) => ({
  v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9'], story: { step: 80 }, levels: {}, hearts: 500,
  fun: { free: { unlocked: true, announced: true, at: 1 }, ...(o.fun ?? {}) }, world: { flags: { ...(o.flags ?? {}) } },
});

async function boot(seed, { reduced = !!process.env.REDUCED, wait = 2200 } = {}) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.addInitScript((s) => { if (!sessionStorage.getItem('rw-seeded')) { sessionStorage.setItem('rw-seeded', '1'); localStorage.setItem('radia-save-v1', s); } }, JSON.stringify(seed));
  await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  if (reduced) await page.evaluate(() => { window.RADIA.save.data.settings.reducedMotion = true; document.documentElement.classList.add('reduced-motion'); });
  return page;
}
const leftovers = (page) => page.evaluate(() => [...document.querySelectorAll('[class*="rw-"]')].map((e) => e.className.toString().split(' ')[0]));
/** Calques plein écran visibles (hors écrans du jeu) : il ne doit pas en rester après une ouverture. */
const fullLayers = (page) => page.evaluate(() => [...document.querySelectorAll('#ui > *, body > *')].filter((e) => {
  if (e.classList.contains('screen') || e.id === 'ui' || e.id === 'game' || /^(SCRIPT|STYLE|CANVAS)$/.test(e.tagName)) return false;
  const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  const big = r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9;
  return big && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && cs.pointerEvents !== 'none';
}).map((e) => e.className.toString() || e.tagName));
const snap = (page) => page.evaluate(() => { const s = window.RADIA.save.data; return { coins: s.world.res.coins, diamonds: s.economy.diamonds, hearts: s.hearts, tickets: s.fun.casino.chips + s.fun.casino.bring, chests: s.fun.endless2.treasure.earned, flowers: s.world.res.flowers, fabric: s.world.res.fabric, cocoa: s.world.res.cocoa, wand: s.boosters.wand }; });
const delta = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, b[k] - a[k]]).filter(([, v]) => v !== 0));
const shot = (page, n) => page.screenshot({ path: `shots/r-${n}-${TAG}.png` });
const waitGone = async (page, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (!(await leftovers(page)).length) return true; await page.waitForTimeout(120); } return false; };

/** Joue un cadeau jusqu'au bout avec de vrais clics ; renvoie la durée et les contrôles d'ergonomie. */
async function playThrough(page, { name, expectCards, tapToOpen = true }) {
  const t0 = Date.now();
  await page.waitForSelector('.rw-root');
  // l'ouverture exige un toucher : sans toucher, rien ne s'ouvre
  await page.waitForSelector('.rw-hint.on', { timeout: 8000 });
  await page.waitForTimeout(1200);
  check(`${name} : attend le toucher (aucune carte tant qu'on ne touche pas)`, (await page.locator('.rw-card').count()) === 0 && (await page.locator('.rw-hint.on').count()) === 1);
  const ergo = await page.evaluate(() => {
    const bad = [];
    for (const b of document.querySelectorAll('.rw-root button')) { const r = b.getBoundingClientRect(); if (r.width && (r.height < 43.5 || r.width < 43.5)) bad.push(`${b.className} ${Math.round(r.width)}x${Math.round(r.height)}`); }
    const clip = [];
    for (const e of document.querySelectorAll('.rw-title, .rw-sub, .rw-hint')) { const r = e.getBoundingClientRect(); if (r.width && (r.left < -0.5 || r.right > innerWidth + 0.5)) clip.push(e.className); }
    return { bad, clip, hs: document.documentElement.scrollWidth <= innerWidth };
  });
  check(`${name} : boutons >= 44 px, textes dans l'écran, pas de défilement horizontal`, !ergo.bad.length && !ergo.clip.length && ergo.hs, JSON.stringify(ergo));
  if (tapToOpen) await page.locator('.rw-art').click({ force: true });
  await page.waitForSelector('.rw-card', { timeout: 8000 });
  await page.waitForSelector('.rw-primary:visible', { timeout: 20000 });
  const cards = await page.locator('.rw-card').count();
  if (expectCards !== undefined) check(`${name} : ${expectCards} récompenses révélées`, cards === expectCards, String(cards));
  const inView = await page.evaluate(() => [...document.querySelectorAll('.rw-card, .rw-primary, .rw-msg')].every((e) => { const r = e.getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1; }));
  check(`${name} : cartes et bouton visibles dans l'écran`, inView);
  await page.locator('.rw-primary').click();
  return { ms: Date.now() - t0 };
}

const ONLY = (process.env.ONLY ?? '1,2,3,4,5').split(',');
// ==================================================================== 1. variantes et raretés (démos : rien n'est versé)
if (ONLY.includes('1')) {
  const page = await boot(seedOf({ flags: { 'rw:start-gift-v1': true }, fun: { daily: { lastKey: today } } }));
  check('API RADIA.rewards présente', await page.evaluate(() => !!window.RADIA?.rewards?.demo));
  const kinds = [['start', 'epic'], ['daily', 'common'], ['chest', 'common'], ['chest', 'rare'], ['chest', 'epic'], ['event', 'uncommon'], ['premium', 'legendary'], ['romantic', 'rare']];
  const base = await snap(page);
  const layers0 = await fullLayers(page);
  for (const [k, r] of kinds) {
    await page.evaluate(([k, r]) => { window.__p = window.RADIA.rewards.demo(k, r); }, [k, r]);
    const n = await page.evaluate(([k]) => ({ start: 5, daily: 2, chest: 6, event: 4, premium: 5, romantic: 3 })[k], [k]);
    const res = await playThrough(page, { name: `${k}/${r}`, expectCards: n });
    await page.evaluate(() => window.__p);
    check(`${k}/${r} : calque entièrement retiré`, await waitGone(page), (await leftovers(page)).join(','));
    check(`${k}/${r} : aucun calque plein écran résiduel`, JSON.stringify(await fullLayers(page)) === JSON.stringify(layers0), JSON.stringify(await fullLayers(page)));
    if (r === 'rare' || k === 'premium') await shot(page, `variant-${k}-${r}-done`);
  }
  check('démos : aucune attribution réelle', JSON.stringify(delta(base, await snap(page))) === '{}', JSON.stringify(delta(base, await snap(page))));
  // « Passer » : toutes les récompenses restent montrées, vite
  await page.evaluate(() => { window.__p = window.RADIA.rewards.demo('chest', 'epic'); });
  await page.waitForSelector('.rw-skip');
  await page.waitForTimeout(900);
  const skipMs = await page.evaluate(() => new Promise((res) => {
    const t0 = performance.now();
    document.querySelector('.rw-skip').click();
    const poll = () => { const p = document.querySelector('.rw-primary'); if (p && p.style.visibility === 'visible') res(Math.round(performance.now() - t0)); else if (performance.now() - t0 > 15000) res(-1); else setTimeout(poll, 30); };
    poll();
  }));
  check('« Passer » : fin rapide (< 4 s) sans perdre de carte', skipMs > 0 && skipMs < 4000 && (await page.locator('.rw-card').count()) === 6, `${skipMs} ms`);
  await page.locator('.rw-primary').click();
  await page.evaluate(() => window.__p);
  check('« Passer » : calque retiré', await waitGone(page));
  // enchaînement : 3 cadeaux, « Tout ouvrir »
  await page.evaluate(() => { window.__p = window.RADIA.rewards.chain(); });
  await page.waitForSelector('.rw-hint.on');
  check('enchaînement : 3 étapes affichées', (await page.locator('.rw-steps i').count()) === 3);
  await page.locator('.rw-all').click();
  await page.waitForSelector('.rw-primary:visible', { timeout: 25000 });
  check('« Tout ouvrir » : arrive au dernier cadeau', (await page.locator('.rw-steps i.on').count()) === 1 && (await page.locator('.rw-title').last().textContent()).includes('coffre') && (await page.locator('.rw-title').count()) === 1, String(await page.locator('.rw-title').count()));
  await page.locator('.rw-primary').click();
  await page.evaluate(() => window.__p);
  check('enchaînement : calque retiré', await waitGone(page));
  // enchaînement « un par un »
  await page.evaluate(() => { window.__p = window.RADIA.rewards.chain(); });
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector('.rw-hint.on', { timeout: 10000 });
    await page.waitForTimeout(500);
    await page.locator('.rw-art').click({ force: true });
    await page.waitForSelector('.rw-primary:visible', { timeout: 20000 });
    await page.locator('.rw-primary').click();
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => window.__p);
  check('enchaînement un par un : fin propre', await waitGone(page));
  check('aucune erreur console / page (variantes)', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}

// ==================================================================== 2. cadeau du jour par clics, compteurs, rechargement
if (ONLY.includes('2')) {
  const page = await boot(seedOf({ flags: { 'rw:start-gift-v1': true } }));
  await page.waitForSelector('.dy-claim', { timeout: 15000 });
  check('fenêtre du jour ouverte (calendrier gardé)', (await page.locator('.dy-day').count()) === 7);
  const before = await snap(page);
  await page.locator('.dy-claim').dblclick(); // double clic : une seule attribution
  await page.waitForSelector('.rw-root');
  check('cadeau du jour : mise en scène via l\'API (calque rw-root)', true);
  check('cadeau du jour : compteur de jours 1/7', (await page.locator('.rw-days i').count()) === 7 && (await page.locator('.rw-days i.cur').textContent()) === '1');
  const mid = await snap(page);
  check('attribué AVANT la fin de l\'animation (+250 pièces)', delta(before, mid).coins === 250, JSON.stringify(delta(before, mid)));
  await shot(page, 'daily-invite');
  await playThrough(page, { name: 'quotidien', expectCards: 1 });
  check('quotidien : calque retiré', await waitGone(page));
  await page.waitForTimeout(600);
  const after = await snap(page);
  check('quotidien : une seule attribution (+250 pièces exactement)', JSON.stringify(delta(before, after)) === '{"coins":250}', JSON.stringify(delta(before, after)));
  check('quotidien : jour 1 coché dans le calendrier', (await page.locator('.dy-day.done').count()) === 1);
  check('quotidien : plus de bouton « Réclamer »', (await page.locator('.dy-claim').count()) === 0);
  await page.locator('.dy-later').click();
  await page.waitForTimeout(500);
  check('fenêtre du jour fermée, aucun calque résiduel', (await leftovers(page)).length === 0 && (await page.locator('.dy-back:not(.leaving)').count()) === 0);
  // rechargement : pas de doublon
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(4500);
  const again = await snap(page);
  check('rechargement : aucun nouveau cadeau ni doublon', JSON.stringify(delta(after, again)) === '{}' && (await page.locator('.rw-root').count()) === 0, JSON.stringify(delta(after, again)));
  check('aucune erreur console / page (quotidien)', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}

// ==================================================================== 3. cadeau de démarrage : une seule fois, sortie anticipée
if (ONLY.includes('3')) {
  // baseline sans cadeau (drapeau posé), puis on retire le drapeau et on recharge : le cadeau doit arriver tout seul
  const page = await boot(seedOf({ flags: { 'rw:start-gift-v1': true }, fun: { daily: { lastKey: today } } }));
  const before = await snap(page);
  const e0 = await page.evaluate(() => window.RADIA.save.data.economy.energy);
  await page.evaluate(() => { delete window.RADIA.save.data.world.flags['rw:start-gift-v1']; window.RADIA.save.writeNow(); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.rw-root', { timeout: 15000 });
  check('cadeau de démarrage : apparaît tout seul sur l\'écran titre', (await page.locator('.rw-title').textContent()).includes('démarrage'));
  await page.waitForTimeout(700);
  const mid = await snap(page);
  const d = delta(before, mid);
  check('démarrage : tout attribué dès l\'apparition (60 💎, 300 pièces, 100 tickets, 1 coffre)', d.diamonds === 60 && d.coins === 300 && d.tickets === 100 && d.chests === 1, JSON.stringify(d));
  check('démarrage : +50 énergie', (await page.evaluate(() => window.RADIA.save.data.economy.energy)) - e0 >= 49);
  // sortie anticipée : on recharge pendant l'animation
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  const re = await snap(page);
  check('sortie anticipée (rechargement) : rien perdu, rien en double', JSON.stringify(delta(mid, re)) === '{}', JSON.stringify(delta(mid, re)));
  check('cadeau de démarrage : ne revient pas', (await page.locator('.rw-root').count()) === 0);
  check('aucun calque résiduel après rechargement', (await leftovers(page)).length === 0);
  check('drapeau « une fois par sauvegarde » écrit', await page.evaluate(() => window.RADIA.save.data.world.flags['rw:start-gift-v1'] === true));
  check('aucune erreur console / page (démarrage)', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}

// ==================================================================== 4. démontage en plein milieu (fermeture forcée) : plus rien ne reste
if (ONLY.includes('4')) {
  const page = await boot(seedOf({ flags: { 'rw:start-gift-v1': true }, fun: { daily: { lastKey: today } } }));
  const layers0 = await fullLayers(page);
  await page.evaluate(() => { window.__p = window.RADIA.rewards.demo('premium', 'legendary'); });
  await page.waitForSelector('.rw-hint.on');
  await page.locator('.rw-art').click({ force: true });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.RADIA.rewards.closeAll());
  await page.evaluate(() => window.__p);
  await waitGone(page, 2000); // la levée de la suspension est différée de 80 ms (deux cadeaux enchaînés ne font pas scintiller l'interface)
  { const lo = await leftovers(page); const fl = await fullLayers(page); check('démontage en plein milieu : aucun élément rw-* ni calque plein écran', lo.length === 0 && JSON.stringify(fl) === JSON.stringify(layers0), JSON.stringify({ lo, fl, layers0 })); }
  // l'élément retiré de l'extérieur : le garde-fou termine proprement
  await page.evaluate(() => { window.__p = window.RADIA.rewards.demo('chest', 'rare'); });
  await page.waitForSelector('.rw-root');
  await page.evaluate(() => document.querySelector('.rw-root').remove());
  const done = await Promise.race([page.evaluate(() => window.__p).then(() => true), page.waitForTimeout(4000).then(() => false)]);
  check('calque retiré de l\'extérieur : la promesse se résout quand même', done);
  const tap = await page.evaluate(() => { const b = document.querySelector('.title-screen button, .screen button'); return !!b; });
  check('jeu de nouveau tactile (écran titre accessible)', tap);
  check('aucune erreur console / page (démontage)', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}

// ==================================================================== 5. captures au ralenti des 6 étapes (SHOTS=1)
if (process.env.SHOTS && ONLY.includes('5')) {
  const page = await boot(seedOf({ flags: { 'rw:start-gift-v1': true }, fun: { daily: { lastKey: today } } }));
  const S = +(process.env.SLOW ?? 6);
  const steps = (r) => { const pre = 640 + ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(r) * 60; return [['2-invite', -1], ['3-pre', pre * 0.55], ['4-open', pre + 220], ['5-reveal', pre + 1500], ['6-confirm', pre + 3800]]; };
  for (const [k, r] of [['daily', 'common'], ['chest', 'rare'], ['chest', 'epic'], ['premium', 'legendary'], ['romantic', 'epic'], ['event', 'uncommon'], ['start', 'epic'], ['chest', 'common']]) {
    await page.evaluate((s) => window.RADIA.rewards.slow(s), S);
    await page.evaluate(([k, r]) => { window.__p = window.RADIA.rewards.demo(k, r); }, [k, r]);
    await page.waitForTimeout(250 * S); await shot(page, `${k}-${r}-1-appear`);
    await page.waitForSelector('.rw-hint.on', { timeout: 30000 }); await page.waitForTimeout(400);
    await shot(page, `${k}-${r}-2-invite`);
    await page.locator('.rw-art').click({ force: true });
    let last = 0;
    for (const [name, at] of steps(r).slice(1)) { await page.waitForTimeout(Math.max(0, (at - last) * S)); last = at; await shot(page, `${k}-${r}-${name}`); }
    await page.evaluate(() => window.RADIA.rewards.slow(1));
    await page.waitForSelector('.rw-primary:visible', { timeout: 40000 });
    await page.locator('.rw-primary').click();
    await page.evaluate(() => window.__p);
    await waitGone(page);
  }
  await page.close();
}

console.log('\n' + out.filter((l) => l.startsWith('KO')).join('\n'));
console.log(`${out.filter((l) => l.startsWith('OK')).length} OK / ${out.filter((l) => l.startsWith('KO')).length} KO ; erreurs : ${errs.length}`);
await browser.close();
process.exit(out.some((l) => l.startsWith('KO')) || errs.length ? 1 : 0);
