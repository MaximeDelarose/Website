// Mode Chapitres : le plateau doit toujours répondre (vrais toucher CDP, Chromium ÉMULÉ, pas un vrai iPhone).
//   PORT=4190 node scripts/chapters-gestures-e2e.mjs        (393×852 puis 393×660)
// Partie NEUVE → tutoriel du chapitre 1 → touchers de générateur, glissés, fusions, toucher annulé, retour au menu, relances.
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const URL = `http://localhost:${PORT}/?debug&statsDelay=999999999`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (name, ok, detail = '') => { const l = `${ok ? 'OK ' : 'KO '} [${tag}] ${name}${detail ? ` — ${detail}` : ''}`; results.push({ ok: !!ok, l }); console.log(l); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

async function run(H) {
  tag = `393×${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|Ignored attempt to cancel a touchcancel/.test(m.text())) errors.push(`[${tag}] console: ${m.text()}`); });
  const cdp = await ctx.newCDPSession(page);
  const sleep = (ms) => page.waitForTimeout(ms);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
  // partie neuve ; on écarte seulement les cadeaux/annonces du « mode libre » (pas le tutoriel du chapitre 1)
  await page.addInitScript(() => { const t = setInterval(() => { try { const R = window.RADIA; const w = R && R.save && R.save.data && R.save.data.world; if (w) { w.flags = w.flags || {}; w.flags['rw:start-gift-v1'] = true; const fu = R.save.data.fun; if (fu) { const d = new Date(), q = (x) => String(x).padStart(2, '0'); fu.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(fu.daily || {}), lastKey: `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}` }; fu.free = { ...(fu.free || {}), announced: true }; } clearInterval(t); } } catch (e) {} }, 20); });
  await page.goto(URL, { waitUntil: 'networkidle' }); await sleep(2500);
  const closeModals = async () => { for (let i = 0; i < 10; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await sleep(500); } else break; } };
  await closeModals();
  const scene = () => page.evaluate(() => { const g = window.RADIA.game(); const s = g.scene.getScene('merge'); if (!s || !s.state) return null; return { running: g.scene.isActive('merge'), cells: s.state.cells.map((c, i) => (c.item ? { i, c: c.item.c, l: c.item.l } : null)).filter(Boolean), merges: s.state.merges ?? 0, taps: s.state.taps ?? 0, drag: !!s.drag, sel: s.selected }; });
  const xy = (i) => page.evaluate((i) => { const s = window.RADIA.game().scene.getScene('merge'); return s.cellCenter(i); }, i);
  const dialogs = () => page.locator('.dialog-layer:not(.leaving)').count();
  // MODE CHAPITRES
  await page.getByText('MODE CHAPITRES').first().click(); await sleep(1500);
  // tutoriel / dialogues : on avance en touchant la boîte de dialogue, comme la joueuse
  let guard = 0;
  while (guard++ < 80) {
    const n = await dialogs();
    const sc = await scene().catch(() => null);
    if (!n && sc && sc.running && !(await page.locator('.modal-backdrop:not(.leaving)').count())) break;
    if (n) { await page.locator('.dialog-box').first().click({ force: true, timeout: 1500 }).catch(() => {}); }
    else if (await page.locator('.modal-backdrop:not(.leaving)').count()) { await page.locator('.modal-backdrop:not(.leaving) .actions button').last().click({ timeout: 1500 }).catch(() => {}); } // « C'est parti ! »
    else if (await page.getByText('Touche pour continuer').count()) { await page.mouse.click(196, Math.round(H / 2)); } // carte de titre du chapitre
    await sleep(450);
  }
  await sleep(1200);
  let sc = await scene();
  check('le plateau du chapitre 1 est affiché', !!sc && sc.running, sc ? `${sc.cells.length} objets` : 'pas de scène');
  check('plus aucune boîte de dialogue après le tutoriel', (await dialogs()) === 0);
  // 1. générateur : touchers rapides
  const gen = sc.cells.find((c) => c.c === 'gen');
  check('un générateur est présent', !!gen);
  const pg = await xy(gen.i);
  const before = sc.cells.length;
  for (let k = 0; k < 4; k++) { await Promise.all([touch('touchStart', pg.x, pg.y), touch('touchEnd', pg.x, pg.y)]); await sleep(450); }
  sc = await scene();
  check('4 touchers sur le générateur : de nouveaux objets apparaissent', sc.cells.length > before, `${before} → ${sc.cells.length}`);
  // 2. toucher annulé en plein glissé, puis le plateau doit répondre
  const item = sc.cells.find((c) => c.c !== 'gen');
  const pi = await xy(item.i);
  await touch('touchStart', pi.x, pi.y); await touch('touchMove', pi.x + 20, pi.y + 20); await touch('touchMove', pi.x + 40, pi.y + 30);
  await touch('touchCancel', pi.x + 40, pi.y + 30); await sleep(500);
  sc = await scene();
  check('après un toucher annulé : plus de geste en cours', sc.drag === false);
  await Promise.all([touch('touchStart', pi.x, pi.y), touch('touchEnd', pi.x, pi.y)]); await sleep(400);
  sc = await scene();
  check('après un toucher annulé : l\'objet se sélectionne', sc.sel === item.i, `sélection ${sc.sel}`);
  await Promise.all([touch('touchStart', pi.x, pi.y), touch('touchEnd', pi.x, pi.y)]); await sleep(300);
  // 3. plusieurs fusions de suite (on fabrique des objets en touchant le générateur, puis on fusionne les paires identiques)
  let merges = 0;
  for (let round = 0; round < 12 && merges < 3; round++) {
    sc = await scene();
    const seen = new Map(); let pair = null;
    for (const c of sc.cells) { if (c.c === 'gen' || c.c === 'special') continue; const k = `${c.c}:${c.l}`; if (seen.has(k)) { pair = [seen.get(k), c.i]; break; } seen.set(k, c.i); }
    if (!pair) { for (let k = 0; k < 2; k++) { await Promise.all([touch('touchStart', pg.x, pg.y), touch('touchEnd', pg.x, pg.y)]); await sleep(500); } continue; }
    const a = await xy(pair[0]), b = await xy(pair[1]);
    await touch('touchStart', a.x, a.y); await touch('touchMove', a.x + (b.x - a.x) * 0.2, a.y + (b.y - a.y) * 0.2);
    for (let k = 1; k <= 5; k++) { await touch('touchMove', a.x + ((b.x - a.x) * k) / 5, a.y + ((b.y - a.y) * k) / 5); await sleep(25); }
    await touch('touchEnd', b.x, b.y); await sleep(700);
    const now = await scene();
    if (now.merges > sc.merges) merges++;
  }
  check('plusieurs fusions de suite par glisser-déposer', merges >= 2, `${merges} fusions`);
  // 4. retour au menu puis nouvelle entrée, plusieurs fois : le plateau répond à chaque fois
  for (let t = 1; t <= 2; t++) {
    await page.locator('.mh-top .icon-btn, .merge-hud .icon-btn').first().click({ timeout: 4000 }).catch(() => {}); await sleep(800);
    await page.locator('.modal-backdrop:not(.leaving) .actions button').filter({ hasText: /menu|quitter|accueil/i }).first().click({ timeout: 2500 }).catch(() => {}); await sleep(1200);
    await closeModals();
    await page.getByText('MODE CHAPITRES').first().click({ timeout: 4000 }).catch(() => {}); await sleep(1500);
    const lvl = page.locator('.level-node, .chapter-card, button:has-text("Continuer"), button:has-text("Jouer")').first();
    if (await lvl.count()) { await lvl.click({ timeout: 2000 }).catch(() => {}); await sleep(1500); }
    for (let g = 0; g < 30 && ((await dialogs()) || (await page.locator('.modal-backdrop:not(.leaving)').count())); g++) {
      if (await dialogs()) await page.locator('.dialog-box').first().click({ force: true, timeout: 1500 }).catch(() => {});
      else await page.locator('.modal-backdrop:not(.leaving) .actions button').last().click({ timeout: 1500 }).catch(() => {}); // introduction du niveau « C'est parti ! »
      await sleep(400);
    }
    const s2 = await scene().catch(() => null);
    if (s2 && s2.running && s2.cells.length) {
      const it = s2.cells.find((c) => c.c !== 'gen') ?? s2.cells[0]; const p = await xy(it.i);
      await Promise.all([touch('touchStart', p.x, p.y), touch('touchEnd', p.x, p.y)]); await sleep(400);
      check(`retour au menu puis nouvelle entrée (${t}) : sélection possible`, (await scene()).sel === it.i);
    } else check(`retour au menu puis nouvelle entrée (${t})`, false, 'plateau non retrouvé · écran : ' + (await page.evaluate(() => document.body.innerText)).slice(0, 160).replace(/\n/g, ' | '));
  }
  // 5. rechargement de la sauvegarde
  await page.evaluate(() => window.RADIA.save.writeNow()); await page.reload({ waitUntil: 'networkidle' }); await sleep(2500); await closeModals();
  check('après rechargement : la progression est conservée', await page.evaluate(() => window.RADIA.save.hadSave === true));
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur console / page', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close();
process.exit(ko ? 1 : 0);
