// Échecs « contre Auguste » : Détente ♡, aides, indices, annulation, tutoriel, réactions. Chromium ÉMULÉ (pas un vrai iPhone).
// Build isolé : npx vite build --outDir /tmp/claude-0/q && npx vite preview --outDir /tmp/claude-0/q --port 4197
// PORT=4197 W=393 H=852 node scripts/chess-e2e.mjs   (puis H=660). Captures : shots/q-*.png
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
const W = +(process.env.W ?? 393), H = +(process.env.H ?? 852), PORT = process.env.PORT ?? 4197;
const TAG = `${W}x${H}`;
const browser = await chromium.launch({ args: ['--no-proxy-server'], executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const out = [];
const check = (name, ok, extra = '') => { out.push(ok); console.log(`${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`); };
const shot = (n) => page.screenshot({ path: `shots/q-${n}-${TAG}.png` });
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const sq = (n) => page.evaluate((nm) => {
  const b = document.querySelector('.gb').getBoundingClientRect();
  const f = nm.charCodeAt(0) - 97, r = 8 - Number(nm[1]);
  return { x: b.left + (f + 0.5) * b.width / 8, y: b.top + (r + 0.5) * b.height / 8 };
}, n);
const drag = async (a, b) => { const p = await sq(a), q = await sq(b); await touch('touchStart', p.x, p.y); for (let k = 1; k <= 10; k++) { await touch('touchMove', p.x + (q.x - p.x) * k / 10, p.y + (q.y - p.y) * k / 10); await sleep(16); } await touch('touchEnd'); };
const tapSq = async (a) => { const p = await sq(a); await touch('touchStart', p.x, p.y); await sleep(40); await touch('touchEnd'); await sleep(120); };
const pgn = () => page.evaluate(() => window.RADIA.save.data.chess.game?.pgn ?? null);
const game = async () => { const p = await pgn(); if (p === null) return null; const c = new Chess(); try { c.loadPgn(p); } catch { return null; } return c; };
const waitHerTurn = async (color = 'w') => { for (let i = 0; i < 80; i++) { const c = await game(); if (!c || c.turn() === color || c.isGameOver()) return c; await sleep(250); } return game(); };
/** Cases portant une marque (classe) dans la couche des repères. */
const marks = (cls) => page.evaluate((c) => [...document.querySelectorAll(`.gb-marks .${c}`)].map((e) => { const m = /translate\(([\d.]+)%, ([\d.]+)%\)/.exec(e.style.transform); return 'abcdefgh'[Math.round(+m[1] / 100)] + (8 - Math.round(+m[2] / 100)); }).sort(), cls);
const dots = () => page.evaluate(() => [...document.querySelectorAll('.gb-sel .gb-dot, .gb-sel .gb-capture')].map((e) => e.style.transform + e.className));
const dismiss = async () => { for (let i = 0; i < 8; i++) { await page.evaluate(() => document.querySelectorAll('.dy-back').forEach((e) => e.remove())); const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count() && !(await page.locator('.chess-screen').count())) { await b.first().click().catch(() => {}); await sleep(400); } else break; } };
const layout = async (tag) => {
  const r = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const b = document.querySelector('.gb')?.getBoundingClientRect();
    const bar = document.querySelector('.chess-actions')?.getBoundingClientRect();
    const top = document.querySelector('.chess-top')?.getBoundingClientRect();
    const st = document.querySelector('.chess-status');
    const tip = document.querySelector('.chess-tip:not([hidden])');
    const btns = [...document.querySelectorAll('.chess-actions button')].map((x) => x.getBoundingClientRect());
    return {
      noHScroll: document.documentElement.scrollWidth <= vw,
      boardIn: !b || (b.left >= 0 && b.right <= vw && b.top >= 0 && b.bottom <= vh), boardPx: b && Math.round(b.width),
      barBelow: !bar || !b || bar.top >= b.bottom - 1, barIn: !bar || bar.bottom <= vh + 0.5,
      topAbove: !top || !b || top.bottom <= b.top + 1,
      statusFits: !st || st.scrollWidth <= st.clientWidth + 1,
      tipFits: !tip || (tip.scrollHeight <= tip.clientHeight + 2 && tip.getBoundingClientRect().bottom <= b.top + 1),
      btnsOk: btns.every((x) => x.right <= vw && x.left >= 0 && x.height >= 30),
    };
  });
  check(`${tag} : mise en page (rien de coupé, rien ne se chevauche)`, Object.values(r).every((v) => v !== false), JSON.stringify(r));
};
const openChess = async () => {
  await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' });
  await sleep(1800);
  await page.evaluate(() => { const k = window.RADIA.daily.state().key; window.RADIA.save.data.fun.daily.lastKey = k; window.RADIA.save.data.fun.free.announced = true; window.RADIA.save.data.world.flags['rw:start-gift-v1'] = true; window.RADIA.save.save(); });
  await page.reload({ waitUntil: 'networkidle' }); await sleep(1500);
  await dismiss();
  await page.getByText('ÉCHECS').first().click(); await sleep(900);
};
const forge = async (fen, color = 'w', diff = 'relax') => {
  await waitHerTurn(); await sleep(400); // la réponse d'Auguste en cours ne doit pas écraser la position forgée
  await page.evaluate(([f, c, d]) => { const s = window.RADIA.save; s.data.chess.game = { pgn: `[SetUp "1"]\n[FEN "${f}"]\n\n*`, difficulty: d, color: c }; s.save(); }, [fen, color, diff]);
  await page.reload({ waitUntil: 'networkidle' }); await sleep(1800); await dismiss();
  await page.getByText('ÉCHECS').first().click(); await sleep(1100);
};

// ---------- sauvegarde v5 « ancienne » : difficulté par défaut = normal, pas de pref ni d'options
const seed = { v: 5, story: { step: 999, choices: {}, history: [] }, memories: ['flowers', 'nord', 'arc', 'cinema', 'billard', 'promenade', 'royaume'], levels: {}, seenUpdates: ['v2', 'v4'],
  chess: { wins: { easy: 1, normal: 2, hard: 0 }, losses: 1, draws: 0, puzzles: [], queen: [], game: null },
  fun: { free: { announced: true } } };
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await openChess();
await shot('setup');
const prefs = await page.evaluate(() => ({ pref: window.RADIA.save.data.chess.pref, opts: window.RADIA.save.data.chess.opts, wins: window.RADIA.save.data.chess.wins }));
check('migration : Détente par défaut, victoires anciennes conservées', prefs.pref === 'relax' && prefs.wins.normal === 2 && prefs.wins.relax === 0, JSON.stringify(prefs));
check('écran de choix : « Détente ♡ » sélectionnée', (await page.locator('.chess-setup .seg button.on').first().textContent()) === 'Détente ♡');
check('les anciens niveaux restent disponibles', (await page.locator('.chess-setup .seg').first().locator('button').allTextContents()).join('|') === 'Détente ♡|Détendu|Concentré|Sérieux');
check('aucune mention « IA » à l\'écran', !/\bIA\b/.test(await page.locator('.chess-screen').innerText()));
check('aides listées (4 interrupteurs)', (await page.locator('.setup-aids .toggle').count()) === 4);
await layout('réglages');
await page.getByText('Commencer').click(); await sleep(1700);
const g0 = await page.evaluate(() => window.RADIA.save.data.chess.game);
check('partie lancée en Détente', g0?.difficulty === 'relax');
await shot('start');
await layout('début de partie');
const tip1 = await page.locator('.chess-tip:not([hidden])').innerText().catch(() => '');
check('tutoriel : première bulle (déplacement)', /point|glisse|pièce/i.test(tip1), tip1);
const bubble0 = await page.locator('.bubble').allInnerTexts();
console.log('   bulles :', bubble0.join(' | '));
await shot('tip');
await page.locator('.chess-tip:not([hidden])').click().catch(() => {}); await sleep(250);
check('la bulle se ferme d\'un toucher', (await page.locator('.chess-tip:not([hidden])').count()) === 0);

// ---------- sélection : points stables
await tapSq('e2');
const d1 = await dots();
check('e2 : 2 points de déplacement', d1.length === 2, JSON.stringify(d1));
await page.evaluate(() => { document.querySelectorAll('.gb-sel .gb-cell').forEach((e, i) => { e.dataset.k = 'n' + i; }); });
await sleep(1500);
await page.locator('.chess-actions button', { hasText: 'Indice' }).click(); await sleep(400); // provoque un nouveau rendu pendant la sélection
const same = await page.evaluate(() => [...document.querySelectorAll('.gb-sel .gb-cell')].every((e) => e.dataset.k));
check('points stables : mêmes éléments après re-rendu', same && JSON.stringify(await dots()) === JSON.stringify(d1));
await shot('dots');
// plus de points si l'aide est coupée
await page.locator('.chess-actions button', { hasText: 'Aides' }).click(); await sleep(500);
await shot('menu');
const tg = page.locator('.chess-menu .toggle');
await tg.nth(0).click(); await sleep(200);
await page.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: 'Fermer' }).click(); await sleep(400);
check('« Points des coups » coupés : sélection sans points', (await dots()).length === 0);
const optOff = await page.evaluate(() => window.RADIA.save.data.chess.opts.legal);
check('option mémorisée (legal=false)', optOff === false);
await drag('e2', 'e4'); await sleep(300);
check('le glissé fonctionne même sans points', (await game())?.history().length >= 1);
await page.locator('.chess-actions button', { hasText: 'Aides' }).click(); await sleep(500);
await page.locator('.chess-menu .toggle').nth(0).click(); await sleep(200);
await page.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: 'Fermer' }).click(); await sleep(300);
let c = await waitHerTurn();
check('Auguste a répondu (coup légal)', c.history().length === 2, c.pgn());
await sleep(500);

// ---------- indices progressifs, joués par glissé
const hintBtn = page.locator('.chess-actions button', { hasText: 'Indice' });
const statusTxt = () => page.locator('.chess-status').innerText();
await hintBtn.click(); await sleep(300);
const h1 = await statusTxt(); const m1 = await marks('gb-hint');
await hintBtn.click(); await sleep(300);
const m2 = await marks('gb-hint');
await hintBtn.click(); await sleep(300);
const m3 = await marks('gb-hint'); const h3 = await statusTxt();
check('indice 1 : texte seul', h1.length > 10 && m1.length === 0, h1);
check('indice 2 : la pièce est surlignée', m2.length === 1, JSON.stringify(m2));
check('indice 3 : départ + arrivée', m3.length === 2, JSON.stringify(m3) + ' ' + h3);
await shot('hint');
await layout('indice affiché');
const before = (await game()).history().length;
await drag(m3[0], m3[1]).catch(() => {});
let ok = (await game()).history().length > before;
if (!ok) { // le tableau est trié : on essaie l'autre sens
  await drag(m3[1], m3[0]); ok = (await game()).history().length > before;
}
check('le coup conseillé est accepté par le plateau', ok);
c = await waitHerTurn();

// ---------- annulation répétée
for (let i = 0; i < 2 && c.history().length < 8; i++) {
  await hintBtn.click(); await sleep(150); await hintBtn.click(); await sleep(150); await hintBtn.click(); await sleep(250);
  const mm = await marks('gb-hint');
  const n0 = (await game()).history().length;
  await drag(mm[0], mm[1]); await sleep(300); if ((await game()).history().length === n0) await drag(mm[1], mm[0]);
  c = await waitHerTurn();
}
const n1 = c.history().length;
const undo = page.locator('.chess-actions button', { hasText: 'Annuler' });
await undo.click(); await sleep(500);
let c2 = await game();
check('Annuler : son coup + la réponse d\'Auguste', c2.history().length === n1 - 2 && c2.turn() === 'w', `${n1} -> ${c2.history().length}`);
await undo.click(); await sleep(500);
c2 = await game();
check('Annuler plusieurs fois', c2.history().length === n1 - 4, `${n1} -> ${c2.history().length}`);
const rl = new Chess(); rl.loadPgn(c2.pgn());
check('partie sauvegardée valide après annulation (rechargement PGN)', rl.fen() === c2.fen());
await shot('undo');
while ((await game()).history().length >= 2) { await undo.click(); await sleep(400); }
check('plus rien à annuler : bouton désactivé', await undo.isDisabled());

// ---------- positions forgées : menaces, captures, roque, promotion, en passant, mat
const reasons = [];
await forge('4k3/6b1/8/3p4/4P3/2N5/8/4K3 w - - 0 1');
await sleep(1200);
const thr = await marks('gb-threat'), cap = await marks('gb-capring');
check('pièce menacée signalée (c3)', thr.join() === 'c3', thr.join());
check('capture possible entourée (d5)', cap.join() === 'd5', cap.join());
await shot('aids');
await layout('aides visibles');
await tapSq('e4');
check('anneau de capture masqué pendant une sélection (pas de superposition)', await page.evaluate(() => getComputedStyle(document.querySelector('.gb-capring')).display === 'none'));
await tapSq('e4');
// coupe « Pièces menacées »
await page.locator('.chess-actions button', { hasText: 'Aides' }).click(); await sleep(500);
await page.locator('.chess-menu .toggle').nth(1).click(); await sleep(200);
await page.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: 'Fermer' }).click(); await sleep(400);
check('« Pièces menacées » coupé : plus de liseré', (await marks('gb-threat')).length === 0);
await page.reload({ waitUntil: 'networkidle' }); await sleep(1500);
check('option conservée après rechargement', (await page.evaluate(() => window.RADIA.save.data.chess.opts.threats)) === false);
await page.evaluate(() => { window.RADIA.save.data.chess.opts.threats = true; window.RADIA.save.save(); });

await forge('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
await sleep(1000);
await tapSq('e1');
const dd = await dots();
check('roque proposé (4 points : f1, g1, c1, d1)', dd.length === 4, String(dd.length));
await drag('e1', 'g1'); await sleep(500);
c = await game();
check('roque joué (O-O dans la partie)', /O-O/.test(c.pgn()), c.pgn());
await shot('castle');

await forge('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
await sleep(900);
await drag('e5', 'd6'); await sleep(500);
c = await game();
check('prise en passant jouée (exd6)', /exd6/.test(c.pgn()), c.pgn());

await forge('7k/P7/8/8/8/8/8/K7 w - - 0 1');
await sleep(900);
await drag('a7', 'a8'); await sleep(700);
check('promotion : choix de la pièce (4 propositions)', (await page.locator('.promo-btn').count()) === 4);
await shot('promo');
await page.locator('.promo-btn').nth(1).click(); await sleep(600); // tour
c = await game();
check('promotion en tour jouée', /a8=R/.test(c.pgn()), c.pgn());
await sleep(2600);

await forge('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
await sleep(900);
const wins0 = await page.evaluate(() => window.RADIA.save.data.chess.wins.relax);
await drag('d1', 'd8'); await sleep(2200);
const modalTxt = await page.locator('.modal-backdrop:not(.leaving) .modal').innerText().catch(() => '');
check('échec et mat : fin de partie annoncée', /Échec et mat/.test(modalTxt), modalTxt.replace(/\n/g, ' / '));
const wins1 = await page.evaluate(() => window.RADIA.save.data.chess.wins.relax);
check('victoire « Détente » comptée', wins1 === wins0 + 1);
const bub = await page.locator('.bubble').allInnerTexts();
console.log('   bulles de fin :', bub.join(' | '));
await shot('mate');
await page.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: 'Voir le plateau' }).click(); await sleep(500);
await shot('after-mate');

// ---------- partie jouée jusqu'à une issue par indices (Détente ne doit pas bloquer)
await forge('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
await sleep(900);
let plies = 0;
for (let i = 0; i < 12; i++) {
  const g = await game();
  if (!g || g.isGameOver()) break;
  if (await page.locator('.modal-backdrop:not(.leaving)').count()) break;
  if (g.turn() !== 'w') { await sleep(500); continue; }
  const bt = page.locator('.chess-actions button', { hasText: 'Indice' });
  if (await bt.isDisabled()) { await sleep(400); continue; }
  await bt.click(); await sleep(100); await bt.click(); await sleep(100); await bt.click(); await sleep(250);
  const mm = await marks('gb-hint');
  if (mm.length < 2) { await sleep(300); continue; }
  const moves = g.moves({ verbose: true });
  const mv = moves.find((m) => mm.includes(m.from) && mm.includes(m.to));
  if (!mv) { reasons.push('indice illégal ' + mm.join()); break; }
  await drag(mv.from, mv.to);
  await sleep(200);
  if (await page.locator('.promo-btn').count()) await page.locator('.promo-btn').first().click();
  plies++;
  await sleep(1800);
}
const gf = await game();
check('partie jouée avec les indices (aucun indice illégal)', reasons.length === 0 && plies >= 3, `${plies} coups, ${reasons.join()}`);
await shot('endgame');
check('aucune erreur console', errs.length === 0, errs.join(' ; '));
console.log(out.every(Boolean) ? 'TOUT OK' : 'ECHECS: ' + out.filter((x) => !x).length);
await browser.close();
process.exit(out.every(Boolean) ? 0 : 1);
