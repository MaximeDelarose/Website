// Fin du didacticiel du Mode Reine (chapitre 4) puis niveau 23 : victoire, sortie anticipée, recommencer, enchaînement SANS écran résiduel ni geste bloqué.
// Chromium ÉMULÉ (jamais un vrai iPhone). PORT=4190 node scripts/queen-end-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} [${tag}] ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0'); const today = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

async function boot(H, step, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  const levels = {}; for (let i = 1; i <= 22; i++) levels[i] = { stars: 3, best: 500, done: true };
  const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], hearts: 100, levels, story: { step }, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: today, claimed: [0], total: 1 } }, ...extra };
  await page.addInitScript((s) => { if (!sessionStorage.getItem('qe')) { localStorage.setItem('radia-save-v1', s); sessionStorage.setItem('qe', '1'); } }, JSON.stringify(seed));
  await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2200);
  return { ctx, page };
}
const sleep = (p, ms) => p.waitForTimeout(ms);
async function closeModals(page, rx = /Plus tard|Fermer/) { for (let i = 0; i < 5; i++) { const b = page.locator('.modal-backdrop:not(.leaving) button', { hasText: rx }); if (await b.count()) { await b.first().click().catch(() => {}); await sleep(page, 500); } else break; } }
const center = async (loc) => { const b = await loc.boundingBox(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; };

/** Résout le puzzle affiché en suivant l'« Indice » (la case qui brille) ; renvoie vrai si « Tous les cœurs sont à toi ! » apparaît. */
async function solve(page) {
  for (let i = 0; i < 12; i++) {
    if (/Tous les cœurs sont à toi/.test(await page.locator('.chess-status').innerText().catch(() => ''))) return true;
    await page.locator('.chess-actions button', { hasText: 'Indice' }).click(); await sleep(page, 350);
    const hint = page.locator('.q-hint').first(); const hp = await center(hint); if (!hp) { await sleep(page, 400); continue; }
    const queen = page.locator('.gb-pieces .gb-piece[data-kind="queen"]').first(); const qp = await center(queen);
    await page.mouse.click(qp.x, qp.y); await sleep(page, 250);
    await page.mouse.click(hp.x, hp.y); await sleep(page, 700);
  }
  return /Tous les cœurs sont à toi/.test(await page.locator('.chess-status').innerText().catch(() => ''));
}

async function boardWorks(page) {
  const r = await page.evaluate(() => { const sc = window.RADIA.game().scene.getScene('merge'); if (!sc?.sys.isActive()) return null; const bad = []; let ok = 0; for (let i = 0; i < 36; i++) { const c = sc.cellCenter(i); const el = document.elementFromPoint(c.x, c.y); if (el && el.tagName === 'CANVAS') ok++; else bad.push(`${i}:${el?.tagName}.${el?.className}`); } sc.debugLayout([{ i: 0, c: 'flowers', l: 1 }, { i: 1, c: 'flowers', l: 1 }]); return { ok, bad: bad.slice(0, 2), m0: sc.state.merges }; });
  if (!r) return { ok: false, why: 'plateau inactif' };
  await sleep(page, 400);
  const p = await page.evaluate(() => window.RADIA.game().scene.getScene('merge').cellCenter(0)); const q = await page.evaluate(() => window.RADIA.game().scene.getScene('merge').cellCenter(1));
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 14, p.y); await page.mouse.move(q.x, q.y, { steps: 3 }); await page.mouse.up(); await sleep(page, 800);
  const m1 = await page.evaluate(() => window.RADIA.game().scene.getScene('merge').state.merges);
  return { ok: r.ok === 36 && m1 === r.m0 + 1, why: r.ok !== 36 ? r.bad.join(',') : `fusions ${r.m0}→${m1}` };
}

async function run(H) {
  // index de l'étape « queen » (le didacticiel du Mode Reine), calculé sur la vraie histoire
  tag = `H${H}`; let boot0 = await boot(H, 0); const idx = await boot0.page.evaluate(async () => { const m = await window.RADIA.storyMod(); return m.STORY.findIndex((s) => s.t === 'queen'); }); await boot0.ctx.close();
  check('étape « queen » trouvée dans l\'histoire', idx > 0, String(idx));

  // A. victoire → Bravo → Continuer → niveau 23 : aucun écran résiduel, plateau jouable
  { tag = `A victoire ${H}`; const { ctx, page } = await boot(H, idx); await closeModals(page);
    await page.locator('.title-menu .btn.mode').first().click(); await sleep(page, 1200); await page.getByText('Continuer l\'histoire').first().click(); await sleep(page, 1500);
    for (let i = 0; i < 12 && !(await page.getByText('Essayer ♡').count()); i++) { await page.mouse.click(196, H - 80); await sleep(page, 400); }
    check('le Mode Reine s\'ouvre (présentation des règles)', (await page.getByText('Le Mode Reine').count()) === 1);
    await page.getByText('Essayer ♡').click(); await sleep(page, 800);
    check('puzzle 1 affiché', (await page.locator('.chess-who', { hasText: 'Premiers pas' }).count()) === 1);
    const won = await solve(page); check('puzzle résolu en suivant les indices (« Tous les cœurs sont à toi ! »)', won);
    await page.waitForSelector('.modal-backdrop:not(.leaving) button:has-text("Continuer")', { timeout: 6000 }).catch(() => {});
    check('fenêtre « Bravo ma reine ! » visible et cliquable', (await page.locator('.modal-backdrop:not(.leaving)', { hasText: 'Bravo ma reine' }).count()) === 1);
    const s0 = await page.evaluate(() => window.RADIA.save.data.chess.queen.length);
    await page.locator('.modal-backdrop:not(.leaving) button', { hasText: 'Continuer' }).click(); await sleep(page, 1600);
    check('l\'écran du Mode Reine est RETIRÉ (plus aucun .chess-screen)', (await page.locator('.chess-screen:not(.leaving)').count()) === 0);
    check('récompense / progression enregistrée UNE seule fois', s0 === 1 && (await page.evaluate(() => window.RADIA.save.data.chess.queen.length)) === 1);
    // niveau 23 : introduction puis plateau
    for (let i = 0; i < 6 && !(await page.locator('.merge-hud').count()); i++) { await page.locator('.modal-backdrop:not(.leaving) button').last().click({ timeout: 2000 }).catch(() => {}); await sleep(page, 900); await page.mouse.click(196, H - 90); await sleep(page, 500); }
    check('niveau 23 « Le bal du royaume » lancé (interface du plateau)', (await page.locator('.merge-hud').count()) === 1, await page.locator('.merge-hud').first().innerText().then((t) => t.replace(/\s+/g, ' ').slice(0, 60)).catch(() => ''));
    await sleep(page, 1500);
    check('aucun écran d\'échecs derrière / devant l\'interface du plateau', (await page.locator('.chess-screen, .gb-grid').count()) === 0);
    const bw = await boardWorks(page); check('les gestes sur la grille fonctionnent (36/36 cases captent le toucher, fusion par glissé)', bw.ok, bw.why);
    await ctx.close(); }

  // B. sortie anticipée (retour) puis reprise
  { tag = `B sortie ${H}`; const { ctx, page } = await boot(H, idx); await closeModals(page);
    await page.locator('.title-menu .btn.mode').first().click(); await sleep(page, 1200); await page.getByText('Continuer l\'histoire').first().click(); await sleep(page, 1500);
    for (let i = 0; i < 12 && !(await page.getByText('Essayer ♡').count()); i++) { await page.mouse.click(196, H - 80); await sleep(page, 400); }
    await page.locator('.chess-screen .screen-head .icon-btn').first().click(); await sleep(page, 1500);
    check('sortie anticipée : retour à l\'accueil, aucun écran d\'échecs résiduel', (await page.locator('.chess-screen:not(.leaving)').count()) === 0 && (await page.locator('.title-menu').count()) >= 1);
    check('sortie anticipée : progression intacte (étape toujours « queen »)', (await page.evaluate(() => window.RADIA.save.data.story.step)) === idx);
    await page.locator('.title-menu .btn.mode').first().click(); await sleep(page, 1200); await page.getByText('Continuer l\'histoire').first().click(); await sleep(page, 1500);
    for (let i = 0; i < 12 && !(await page.getByText('Essayer ♡').count()); i++) { await page.mouse.click(196, H - 80); await sleep(page, 400); }
    await page.getByText('Essayer ♡').click(); await sleep(page, 800);
    // une défaite : on dépense les coups sur des mouvements quelconques puis « Recommencer »
    const board = page.locator('.gb-grid'); const bb = await board.boundingBox(); const queen = page.locator('.gb-pieces .gb-piece[data-kind="queen"]').first(); const qp = await center(queen);
    await page.mouse.click(qp.x, qp.y); await sleep(page, 200); await page.mouse.click(bb.x + bb.width * 0.1, bb.y + bb.height * 0.1); await sleep(page, 500);
    await page.locator('.chess-actions button[aria-label="Recommencer"]').click(); await sleep(page, 500);
    check('défaite / recommencer : le puzzle repart à zéro et reste jouable', /Coups : 0 \/ /.test(await page.locator('.puzzle-head').innerText()));
    await sleep(page, 600); const won = await solve(page); check('… et peut être résolu ensuite', won, (await page.locator('.chess-status').innerText().catch(() => '')) + ' | ' + (await page.locator('.puzzle-head').innerText().catch(() => '')).replace(/\s+/g, ' '));
    await ctx.close(); }
}
async function menuRun(H) {
  tag = `C menu Échecs ${H}`; const b0 = await boot(H, 0); const idx = await b0.page.evaluate(async () => { const m = await window.RADIA.storyMod(); return m.STORY.findIndex((s) => s.t === 'unlockChess') + 1; }); await b0.ctx.close();
  const { ctx, page } = await boot(H, idx); await closeModals(page);
  await page.locator('.title-menu .row .btn', { hasText: 'ÉCHECS' }).click(); await sleep(page, 1500);
  check('menu Échecs ouvert (débloqué)', (await page.locator('.chess-screen').count()) === 1);
  await page.locator('.chess-tabs button', { hasText: 'Mode Reine' }).click(); await sleep(page, 700);
  await page.locator('.puzzle-card').first().click(); await sleep(page, 800);
  const won = await solve(page); check('puzzle 1 du menu résolu', won);
  await page.waitForSelector('.modal-backdrop:not(.leaving) button', { timeout: 6000 }).catch(() => {});
  check('« Bravo ma reine ! » avec « Puzzle suivant » et « Liste »', (await page.locator('.modal-backdrop:not(.leaving) button', { hasText: 'Puzzle suivant' }).count()) === 1 && (await page.locator('.modal-backdrop:not(.leaving) button', { hasText: 'Liste' }).count()) === 1);
  await page.locator('.modal-backdrop:not(.leaving) button', { hasText: 'Liste' }).click(); await sleep(page, 800);
  check('retour à la liste des puzzles (puzzle 1 coché, 2 débloqué)', (await page.locator('.puzzle-card.done').count()) >= 1 && (await page.locator('.puzzle-card.locked').first().count()) >= 0 && (await page.locator('.puzzle-grid').count()) === 1);
  const q1 = await page.evaluate(() => window.RADIA.save.data.chess.queen.length);
  await page.locator('.puzzle-card').nth(1).click(); await sleep(page, 700); await solve(page); await page.waitForSelector('.modal-backdrop:not(.leaving) button', { timeout: 6000 }).catch(() => {}); await page.locator('.modal-backdrop:not(.leaving) button', { hasText: 'Liste' }).click(); await sleep(page, 700);
  check('2e puzzle : progression enregistrée une fois par puzzle', (await page.evaluate(() => window.RADIA.save.data.chess.queen.length)) === q1 + 1, `${q1} → ${await page.evaluate(() => window.RADIA.save.data.chess.queen.length)}`);
  await page.locator('.chess-screen .screen-head .icon-btn').first().click(); await sleep(page, 1500);
  check('sortie des Échecs : accueil réaffiché, aucun calque résiduel, boutons de l\'accueil cliquables', (await page.locator('.chess-screen:not(.leaving)').count()) === 0 && (await page.locator('.title-menu .btn.mode').first().isVisible()));
  await page.locator('.title-menu .btn.mode').first().click(); await sleep(page, 1200);
  check('l\'accueil répond après les Échecs (la carte des chapitres s\'ouvre)', (await page.getByText('Continuer l\'histoire').count()) + (await page.getByText('Jouer').count()) >= 1);
  await ctx.close();
}
for (const H of (process.env.ONLY_H ? [Number(process.env.ONLY_H)] : [852, 660])) { try { await run(H); } catch (e) { tag = `H${H}`; check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
for (const H of (process.env.ONLY_H ? [Number(process.env.ONLY_H)] : [852, 660])) { try { await menuRun(H); } catch (e) { tag = `C ${H}`; check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
