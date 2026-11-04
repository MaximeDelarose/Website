// Plateau Endless : cases verrouillées, récompenses visibles, appui long / court, panneau d'objet, plus aucun bouton « i » sur les sprites.
// VRAIS touchers via CDP (Input.dispatchTouchEvent) dans un Chromium ÉMULÉ (iPhone simulé, pas un vrai iPhone).
//   npx vite build --outDir /tmp/claude-0/s && npx vite preview --outDir /tmp/claude-0/s --port 4200 &
//   PORT=4200 node scripts/board-e2e.mjs            (393×852 puis 393×660 ; captures dans shots/s-*.png)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT ?? 4200;
const URL = `http://localhost:${PORT}/?debug`;
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = [];
const errors = [];
let tag = '';
const check = (name, ok, detail = '') => { results.push({ ok: !!ok, line: `${ok ? 'OK ' : 'KO '} [${tag}] ${name}${detail ? ` — ${detail}` : ''}` }); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const baseSave = () => ({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5'], story: { step: 9999 }, levels: {}, hearts: 500, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } });

async function run(H) {
  tag = `393×${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(`[${tag}] console: ${m.text()}`); });
  await page.addInitScript((s) => { if (!sessionStorage.getItem('s-seeded')) { localStorage.setItem('radia-save-v1', s); sessionStorage.setItem('s-seeded', '1'); } }, JSON.stringify(baseSave()));
  const cdp = await ctx.newCDPSession(page);
  const sleep = (ms) => page.waitForTimeout(ms);
  const shot = (n) => page.screenshot({ path: `shots/s-${H}-${n}.png` });
  const closeModals = async () => {
    for (let i = 0; i < 14; i++) {
      let b = page.locator('.modal-backdrop:not(.leaving) .dy-later');
      if (!(await b.count())) b = page.locator('.modal-backdrop:not(.leaving) .actions button');
      if (await b.count()) { await b.first().click().catch(() => {}); await sleep(500); } else break;
    }
  };
  const E = (fn, ...a) => page.evaluate(([f, args]) => window.RADIA.endless[f](...args), [fn, a]);
  const st = () => E('state');
  const idle = async () => { await page.waitForFunction(() => window.RADIA.endless.idle(), null, { timeout: 8000 }).catch(() => {}); await sleep(300); };
  const start = async () => {
    await page.goto(URL, { waitUntil: 'networkidle' });
    await sleep(1800);
    await closeModals();
    if (await page.getByText('Carte du domaine').count()) { await page.locator('.screen-head .icon-btn').first().click().catch(() => {}); await sleep(700); await closeModals(); }
    await page.getByText('MODE LIBRE').first().click();
    await sleep(2800);
    await page.waitForSelector('.merge-hud.endless', { timeout: 8000 });
  };
  // ---- vrais toucher CDP
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const xy = (i) => E('cellXY', i);
  // toucher court : départ et fin envoyés d'un coup (machine chargée : un « sleep » entre les deux pourrait dépasser le seuil d'appui long)
  const tapAt = async (x, y) => { await Promise.all([touch('touchStart', x, y), touch('touchEnd', x, y)]); await sleep(350); };
  const tapCell = async (i, hold) => { const p = await xy(i); await tapAt(p.x, p.y, hold); };
  const dragCell = async (a, b, ms = 260) => {
    await closeSheet();
    const p = await xy(a); const q = await xy(b);
    const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const ux = (q.x - p.x) / d, uy = (q.y - p.y) / d;
    // le doigt quitte tout de suite la tolérance de 8 px (sinon, sur une machine chargée, un glissé trop lent EST un appui long)
    await touch('touchStart', p.x, p.y);
    await touch('touchMove', p.x + ux * 14, p.y + uy * 14);
    const steps = Math.max(4, Math.round(ms / 40));
    for (let k = 1; k <= steps; k++) { await touch('touchMove', p.x + ((q.x - p.x) * k) / steps, p.y + ((q.y - p.y) * k) / steps); await sleep(ms / steps); }
    await touch('touchEnd', q.x, q.y); await sleep(450);
  };
  const cellsKey = async () => JSON.stringify((await st()).cells);
  const sheetOpen = () => page.locator('.en-sheet').count();
  const closeSheet = async () => { const x = page.locator('.en-sheet .en-sheet-x'); if (await x.count()) { await x.first().click().catch(() => {}); await sleep(400); } };
  const idx = (x, y) => y * 6 + x;

  await start();
  await idle();
  let s = await st();
  await shot('1-depart');

  // ---- 1. plateau : toiles / sable / coffre / récompenses visibles, ≥ 14 cases ouvertes
  const kinds = new Set(s.locks.map((l) => l.kind));
  check('plateau de départ : toile (objet), coffre sous toile, récompense, sable', ['web', 'chest', 'reward', 'sand'].every((k) => kinds.has(k)), [...kinds].join(','));
  check('au moins 14 cases ouvertes (verrous ≤ 20)', s.open >= 14 && s.locked <= 20, `ouvertes ${s.open}, verrouillées ${s.locked}`);
  check('chaque verrou affiche un prix en énergie ≤ 6', s.locks.every((l) => l.price >= 1 && l.price <= 6));
  check('zone 0 au départ, sable de zone sur 8 cases', s.board.zone === 0 && s.locks.filter((l) => l.zone).length === 8);

  // ---- 2. plus aucun bouton « i » : ni .en-geni, ni bouton « i », ni bouton par-dessus le plateau
  const audit = async (label) => {
    const r = await page.evaluate(() => {
      const geni = document.querySelectorAll('.en-geni, .en-gens, [aria-label*="Infos du générateur"]').length;
      const iBtns = [...document.querySelectorAll('.merge-hud button')].filter((b) => (b.textContent || '').trim().toLowerCase() === 'i').length;
      const E = window.RADIA.endless;
      const p0 = E.cellXY(0), p1 = E.cellXY(1), p6 = E.cellXY(6), pl = E.cellXY(35);
      const cell = p1.x - p0.x;
      const board = { l: p0.x - cell / 2, t: p0.y - cell / 2, r: pl.x + cell / 2, b: pl.y + (p6.y - p0.y) / 2 };
      const over = [...document.querySelectorAll('.merge-hud button, .merge-hud .en-sel, .merge-hud .en-card')].filter((e) => {
        const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden') return false;
        const q = e.getBoundingClientRect(); if (!q.width || !q.height) return false;
        return q.left < board.r - 1 && q.right > board.l + 1 && q.top < board.b - 2 && q.bottom > board.t + 2;
      }).map((e) => e.className || e.getAttribute('aria-label'));
      const sel = document.querySelector('.en-sel')?.getBoundingClientRect();
      const act = document.querySelector('.mh-actions')?.getBoundingClientRect();
      return { geni, iBtns, over, board, sel: sel ? { t: sel.top, b: sel.bottom } : null, act: act ? { t: act.top, b: act.bottom } : null, cell };
    });
    check(`${label} : aucun bouton « i » (.en-geni) sur le plateau`, r.geni === 0 && r.iBtns === 0, `geni=${r.geni}, boutons « i »=${r.iBtns}`);
    check(`${label} : aucun bouton / panneau ne recouvre le plateau`, r.over.length === 0, r.over.join(' | '));
    check(`${label} : fiche d'objet : cachée si rien n'est sélectionné, sinon sous le plateau (sur la rangée d'actions), sans recouvrir de case`, r.sel && (r.sel.b === 0 || (r.sel.t >= r.board.b - 1 && r.sel.b <= r.act.b + 1)), JSON.stringify({ sel: r.sel, board: r.board.b, act: r.act?.t }));
    check(`${label} : cases ≥ 40 px`, r.cell >= 40, `${Math.round(r.cell)} px`);
    return r;
  };
  await audit('départ');

  // ---- 3. appui court sur un objet = sélection (panneau), appui court sur un générateur = produit
  await closeModals();
  const gens = s.cells.filter((c) => c.c === 'gen');
  const g0 = gens[0].i;
  const energy0 = s.energy;
  await tapCell(g0);
  s = await st();
  check('appui court sur un générateur : il produit un objet (comportement normal)', s.cells.filter((c) => c.c !== 'gen').length >= 1 && s.taps >= 1 && !(await sheetOpen()));
  const panel1 = await E('sel');
  check('appui court sur un générateur : le panneau sous le plateau le décrit, bouton « Infos » ≥ 44 px', /Pot de fleurs|Boîte aux lettres|Niveau/.test(panel1.text) && (await page.locator('.en-sel-info').count()) === 1);
  const infoBox = await page.locator('.en-sel-info').boundingBox();
  check('bouton « Infos » : zone tactile ≥ 44×44', infoBox && infoBox.width >= 44 && infoBox.height >= 44, JSON.stringify(infoBox && { w: Math.round(infoBox.width), h: Math.round(infoBox.height) }));
  await shot('2-panneau-generateur');
  await page.locator('.en-sel-info').click();
  await sleep(500);
  check('bouton « Infos » du panneau : ouvre la feuille du générateur', (await sheetOpen()) === 1 && /Générateur/.test(await page.locator('.en-sheet-title').innerText()));
  await shot('3-fiche-generateur');
  await closeSheet();

  // produire quelques objets pour la suite
  for (let k = 0; k < 6; k++) { await tapCell(g0, 60); }
  await idle();
  s = await st();
  const items = s.cells.filter((c) => c.c !== 'gen');
  check('quelques objets produits', items.length >= 4, `${items.length} objets`);

  // ---- 4. appui court sur un objet : sélection, panneau « niveau / suivant », pas de fiche
  const it = items[0];
  await tapCell(it.i, 80);
  const p2 = await E('sel');
  check('appui court sur un objet : le panneau affiche son nom et son niveau, aucune fiche ouverte', /niveau/i.test(p2.text) && !(await sheetOpen()), p2.text.replace(/\n/g, ' · '));
  await shot('4-objet-selectionne');
  await tapCell(it.i, 80); // désélectionne
  await sleep(200);

  // ---- 5. appui long : fiche, SANS fusion ni déplacement
  await idle();
  s = await st();
  const pair = (() => { const m = {}; for (const c of s.cells.filter((x) => x.c !== 'gen')) { const k = `${c.c}:${c.l}`; (m[k] ??= []).push(c.i); } return Object.values(m).find((a) => a.length >= 2); })();
  // on met deux objets identiques côte à côte pour tenter la fusion par erreur
  await E('setItem', idx(2, 3), 'flowers', 1);
  await E('setItem', idx(3, 3), 'flowers', 1);
  await sleep(600);
  const before = await cellsKey();
  const mergesBefore = (await st()).counters.merges ?? 0;
  const pA = await xy(idx(2, 3));
  await touch('touchStart', pA.x, pA.y);
  await sleep(1100);
  const openedDuring = await sheetOpen();
  await touch('touchEnd', pA.x, pA.y);
  await sleep(500);
  check('appui long (750 ms) sur un objet : la fiche s\'ouvre avant le relâchement', openedDuring === 1, `feuilles=${openedDuring}`);
  check('appui long : aucune fusion ni déplacement après le relâchement', (await cellsKey()) === before && ((await st()).counters.merges ?? 0) === mergesBefore);
  check('fiche d\'objet : nom, niveau et fusion expliquée', /Fleurs|Graine/.test(await page.locator('.en-sheet').innerText()) && /Fusion/.test(await page.locator('.en-sheet').innerText()));
  await shot('5-fiche-objet-appui-long');
  await closeSheet();
  // appui long avec doigt qui glisse APRÈS le seuil, vers l'objet voisin : toujours rien
  const pB = await xy(idx(3, 3));
  await touch('touchStart', pA.x, pA.y); await sleep(700);
  for (let k = 1; k <= 8; k++) { await touch('touchMove', pA.x + ((pB.x - pA.x) * k) / 8, pA.y + ((pB.y - pA.y) * k) / 8); await sleep(30); }
  await touch('touchEnd', pB.x, pB.y); await sleep(500);
  check('appui long puis glissé sur l\'objet voisin : aucune fusion', (await cellsKey()) === before);
  await closeSheet();
  // tremblement ≤ 8 px pendant l'appui : l'appui long reste valide
  await touch('touchStart', pA.x, pA.y);
  for (let k = 0; k < 6; k++) { await touch('touchMove', pA.x + (k % 2 ? 3 : -3), pA.y + 2); await sleep(120); }
  await sleep(100);
  const openedWiggle = await sheetOpen();
  await touch('touchEnd', pA.x, pA.y); await sleep(400);
  check('petit tremblement (≤ 8 px) pendant l\'appui : l\'appui long fonctionne quand même', openedWiggle === 1);
  await closeSheet();

  // ---- 6. glissé court / long : fusion, pas de fiche
  await dragCell(idx(2, 3), idx(3, 3), 220);
  await idle();
  s = await st();
  check('glissé court : fusion normale (fleurs 1+1 → 2)', s.cells.some((c) => c.i === idx(3, 3) && c.c === 'flowers' && c.l === 2) && !(await sheetOpen()));
  await E('setItem', idx(2, 3), 'love', 1);
  await E('setItem', idx(3, 3), 'love', 1);
  await sleep(500);
  await dragCell(idx(2, 3), idx(3, 3), 1500);
  await idle();
  s = await st();
  check('glissé long (1,5 s) : fusion normale, aucune fiche ouverte', s.cells.some((c) => c.i === idx(3, 3) && c.c === 'love' && c.l === 2) && !(await sheetOpen()));
  // déplacement vers une case vide
  await E('setItem', idx(2, 3), 'flowers', 1);
  await E('setItem', idx(3, 3), null);
  await E('setItem', idx(2, 4), null); // la case d'arrivée doit être vide (une apparition aléatoire d'une étape précédente peut l'occuper)
  await sleep(400);
  await dragCell(idx(2, 3), idx(2, 4), 240);
  s = await st();
  check('glissé court vers une case vide : l\'objet se déplace', s.cells.some((c) => c.i === idx(2, 4) && c.c === 'flowers') && !s.cells.some((c) => c.i === idx(2, 3)), JSON.stringify({ cells: s.cells.filter((c) => c.i === idx(2, 3) || c.i === idx(2, 4)), locks: (s.locks || []).filter((c) => c.i === idx(2, 3) || c.i === idx(2, 4)), ptr: await E('pointer'), sheet: await sheetOpen() }));
  // double toucher rapide sur un générateur
  const tapsBefore = (await st()).taps;
  const gp = await xy(g0);
  await Promise.all([touch('touchStart', gp.x, gp.y), touch('touchEnd', gp.x, gp.y)]); await sleep(90);
  await Promise.all([touch('touchStart', gp.x, gp.y), touch('touchEnd', gp.x, gp.y)]); await sleep(500);
  const tapsAfter = (await st()).taps;
  check('double toucher rapide sur un générateur : deux productions, aucune fiche', tapsAfter - tapsBefore >= 1 && tapsAfter - tapsBefore <= 2 && !(await sheetOpen()), `+${tapsAfter - tapsBefore}`);

  // ---- 7. cases verrouillées : toile + fusion adjacente par glissé tactile
  await E('clearLocks');
  await E('setItem', idx(2, 2), null);
  await E('setLock', idx(2, 2), 'webItem', 'flowers');
  await E('setItem', idx(3, 2), 'flowers', 2);   // 2 + 2 → niveau 3 : suffit pour toute toile (niveau minimal ≤ 3)
  await E('setItem', idx(4, 2), 'flowers', 2);
  await sleep(700);
  s = await st();
  const lk = s.locks.find((l) => l.i === idx(2, 2));
  check('verrou posé : toile avec objet visible dessous', lk && lk.kind === 'web' && !!lk.item, JSON.stringify(lk));
  await shot('6-toile-avant');
  // appui court sur la case verrouillée : objectif dans le panneau + bouton « Libérer »
  await tapCell(idx(2, 2), 80);
  const p3 = await E('sel');
  check('appui court sur une case verrouillée : le panneau donne l\'objectif et le prix en énergie', /Fusionne/.test(p3.text) && (await page.locator('.en-sel-buy').count()) === 1, p3.text.replace(/\n/g, ' · '));
  await shot('7-toile-selectionnee');
  // appui long : fiche de la case (objectif + voies de libération)
  const pl = await xy(idx(2, 2));
  await touch('touchStart', pl.x, pl.y); await sleep(1000); await touch('touchEnd', pl.x, pl.y); await sleep(500);
  const lockSheet = await page.locator('.en-sheet').innerText().catch(() => '');
  check('appui long sur une case verrouillée : la fiche affiche l\'objectif, l\'énergie et la commande', /Fusionne/.test(lockSheet) && /⚡/.test(lockSheet) && /commande/.test(lockSheet));
  await shot('8-fiche-verrou');
  await closeSheet();
  await dragCell(idx(4, 2), idx(3, 2), 260);
  await sleep(900);
  s = await st();
  check('fusion adjacente (glissé tactile) : la toile disparaît, l\'objet apparaît et est jouable', !s.locks.some((l) => l.i === idx(2, 2)) && s.cells.some((c) => c.i === idx(2, 2) && c.c === 'flowers' && c.l === lk.item.l));
  await shot('9-toile-liberee');
  await dragCell(idx(2, 2), idx(2, 1), 240);
  s = await st();
  check('l\'objet libéré se déplace tout de suite (aucune animation bloquante)', s.cells.some((c) => c.i === idx(2, 1) && c.c === 'flowers'));

  // ---- 8. énergie : libérer avec le prix affiché
  await E('setLock', idx(0, 2), 'chest', 'flowers');
  await sleep(500);
  const e1 = (await st()).energy;
  await tapCell(idx(0, 2), 80);
  const hasBuy = (await page.locator('.en-sel-buy').count()) === 1;
  check('case verrouillée (coffre) : bouton « Libérer » avec prix dans le panneau', hasBuy, (await E('sel')).text.replace(/\n/g, ' · '));
  const price = hasBuy ? Number((await page.locator('.en-sel-buy b').innerText({ timeout: 3000 })).trim()) : 6;
  if (hasBuy) await page.locator('.en-sel-buy').click();
  await sleep(900);
  s = await st();
  check('libérer avec de l\'énergie : le prix affiché est dépensé et la case libérée', !s.locks.some((l) => l.i === idx(0, 2)) && Math.abs(e1 - s.energy - price) <= 1.01, `prix ${price}, énergie ${e1} → ${s.energy}`);
  check('le coffre libéré s\'ajoute à la jauge de trésor', s.treasure.pending >= 1);
  await shot('10-coffre-libere');
  await closeModals();

  // ---- 9. persistance : rechargement = mêmes verrous ; nouvelle partie = zones gardées, nouvelles surprises
  await E('clearLocks');
  await E('setLock', idx(1, 3), 'diamonds', 'flowers');
  await E('setLock', idx(4, 3), 'sandDiamonds', 'flowers');
  await sleep(500);
  await page.evaluate(() => { window.RADIA.save.data.fun.endless2.counters.orders = 7; window.RADIA.save.save?.(); });
  s = await st();
  const lockSig = JSON.stringify(s.locks.map((l) => [l.i, l.kind]));
  await sleep(600);
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(1800);
  await closeModals();
  if (await page.getByText('Carte du domaine').count()) { await page.locator('.screen-head .icon-btn').first().click().catch(() => {}); await sleep(700); await closeModals(); }
  await page.getByText('MODE LIBRE').first().click();
  await sleep(2800);
  await idle();
  s = await st();
  check('rechargement : les verrous de la partie en cours sont conservés', JSON.stringify(s.locks.map((l) => [l.i, l.kind])) === lockSig, `${s.locked} verrous`);
  await shot('11-recharge');
  // zone 1 après 7 commandes
  await tapCell(g0, 60); await sleep(500);
  s = await st();
  check('progression : zone 1 atteinte après 7 « commandes »', s.board.zone >= 1, `zone ${s.board.zone}`);
  const zoneBefore = s.board.zone;
  const sandBefore = s.locks.filter((l) => l.zone).length;
  // nouvelle partie via la pause
  await page.locator('.icon-btn[aria-label="Pause"]').click();
  await sleep(600);
  await page.getByText('Nouvelle partie').first().click();
  await sleep(500);
  await page.getByText('Recommencer').last().click();
  await sleep(2500);
  await idle();
  s = await st();
  const sandAfter = s.locks.filter((l) => l.zone).length;
  check('nouvelle partie : la zone atteinte est conservée (plateau NON reverrouillé : seul le sable des zones suivantes revient)', s.board.zone === zoneBefore && s.locks.every((l) => !l.zone || l.zone > zoneBefore) && sandAfter === 6, `zone ${s.board.zone} (avant ${zoneBefore}), sable ${sandAfter}`);
  check('nouvelle partie : de nouvelles surprises sont posées, au moins 14 cases ouvertes', s.locks.some((l) => !l.zone) && s.open >= 14, `${s.locked} verrous, ${s.open} ouvertes`);
  await shot('12-nouvelle-partie');
  await audit('après nouvelle partie');

  await ctx.close();
}

try {
  await run(852);
  await run(660);
} finally {
  await browser.close();
}
console.log(results.map((r) => r.line).join('\n'));
const ko = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - ko}/${results.length} contrôles OK`);
if (errors.length) console.log(`\nERREURS PAGE (${errors.length}) :\n${[...new Set(errors)].slice(0, 12).join('\n')}`);
process.exit(ko || errors.length ? 1 : 0);
