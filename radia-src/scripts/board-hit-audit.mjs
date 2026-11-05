// AUDIT « cases inertes » : après chaque perturbation de l'interface, le centre de CHAQUE case doit atteindre le plateau (pas un calque HTML)
// ET un vrai toucher doit sélectionner l'objet. (Chromium ÉMULÉ.) PORT=4190 node scripts/board-hit-audit.mjs
// (ancien en-tête) Mode Chapitres : le plateau doit toujours répondre (vrais toucher CDP, Chromium ÉMULÉ, pas un vrai iPhone).
//   PORT=4190 node scripts/chapters-gestures-e2e.mjs        (393×852 puis 393×660)
// Partie NEUVE → tutoriel du chapitre 1 → touchers de générateur, glissés, fusions, toucher annulé, retour au menu, relances.
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const URL = `http://localhost:${PORT}/?debug`;
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

  // --- outils d'audit
  const hit = () => page.evaluate(() => {
    const g = window.RADIA.game(); const s = g.scene.getScene('merge');
    const cv = g.canvas; const r = cv.getBoundingClientRect(); const k = r.width / g.scale.width;
    const bad = []; const cells = s.state.cells.map((c, i) => i);
    for (const i of cells) {
      const p = s.cellCenter(i); const x = r.left + p.x * k, y = r.top + p.y * k;
      const el = document.elementFromPoint(x, y);
      if (el !== cv) bad.push(`${i}:${el ? (el.tagName + '.' + (el.className || '') + '#' + (el.id || '')).slice(0, 60) : 'null'}`);
    }
    return { bad, paused: g.scene.isPaused('merge'), active: g.scene.isActive('merge'), visible: g.scene.getScene('merge').sys.settings.visible, gamePaused: g.isPaused, inputOn: s.input.enabled, topOnly: s.input.topOnly, locked: s.locked ? [...s.locked] : [] };
  });
  const playable = async (label) => {
    const h = await hit();
    const okHit = h.bad.length === 0 && h.active && !h.paused && h.visible && !h.gamePaused && h.inputOn;
    // un vrai toucher doit sélectionner un objet non générateur
    const sc2 = await scene(); const it = sc2.cells.find((c) => c.c !== 'gen') ?? sc2.cells[0];
    let sel = false;
    if (it) { const p = await xy(it.i); await Promise.all([touch('touchStart', p.x, p.y), touch('touchEnd', p.x, p.y)]); await sleep(350); sel = (await scene()).sel === it.i; await Promise.all([touch('touchStart', p.x, p.y), touch('touchEnd', p.x, p.y)]); await sleep(250); }
    check(`${label} : le plateau répond`, okHit && sel, JSON.stringify({ ...h, bad: h.bad.slice(0, 3), sel }));
  };
  await playable('après le tutoriel');
  // 1. menu de pause / paramètres puis retour
  for (let k = 0; k < 3; k++) {
    await page.locator('.mh-top .icon-btn, .merge-hud .icon-btn').first().click({ timeout: 4000 }).catch(() => {}); await sleep(700);
    await page.keyboard.press('Escape').catch(() => {});
    const cancel = page.locator('.modal-backdrop:not(.leaving) .actions button').filter({ hasText: /reprendre|continuer|annuler|fermer|retour/i }).first();
    if (await cancel.count()) await cancel.click().catch(() => {}); await sleep(600);
    await closeModals();
  }
  await playable('après 3 ouvertures du menu');
  // 2. téléphone ouvert puis fermé (plusieurs fois)
  for (let k = 0; k < 3; k++) { await page.evaluate(() => window.RADIA.phone()); await sleep(700); await page.locator('.ph-back .icon-btn, .ph-close, button[aria-label="Fermer"], .ph-x').first().click({ timeout: 2000 }).catch(() => page.keyboard.press('Escape')); await sleep(700); await closeModals(); }
  await playable('après 3 ouvertures du téléphone');
  // 3. notices (toast / Auguste) en rafale
  for (let k = 0; k < 6; k++) { await page.evaluate((k) => { window.RADIA.notify && window.RADIA.notify.push && window.RADIA.notify.push({ channel: 'toast', priority: 2, title: 'Test ' + k, sub: 'x' }); }, k).catch(() => {}); await sleep(150); }
  await sleep(500); await playable('après des notices en rafale');
  // 4. application en arrière-plan puis retour (visibilitychange + blur/focus), y compris en plein glissé
  const sc3 = await scene(); const it3 = sc3.cells.find((c) => c.c !== 'gen') ?? sc3.cells[0]; const p3 = await xy(it3.i);
  await touch('touchStart', p3.x, p3.y); await touch('touchMove', p3.x + 25, p3.y + 25);
  await page.evaluate(() => { const set = (v) => Object.defineProperty(document, 'visibilityState', { get: () => v, configurable: true }); Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); set('hidden'); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('blur')); });
  await sleep(1500);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
  await touch('touchCancel', p3.x + 25, p3.y + 25); // iOS annule le doigt en cours quand l'application passe en arrière-plan
  await sleep(800);
  await playable('après arrière-plan en plein glissé');
  // 5. pagehide / pageshow (restauration de page)
  await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  await sleep(600); await playable('après pagehide/pageshow');
  // 5 bis. DOIGTS PERDUS (cas iOS : balayage du bord, centre de contrôle, bandeau) : le relâchement n'arrive jamais à Phaser.
  //        On reproduit l'état exact laissé par un relâchement perdu : tous les pointeurs tactiles restent « actifs ».
  const nPtr = await page.evaluate(() => { const m = window.RADIA.game().input; let n = 0; m.pointers.forEach((p, i) => { if (i >= 1) { p.active = true; p.isDown = true; p.primaryDown = true; p.identifier = 900 + i; n++; } }); return n; });
  await sleep(300);
  await playable(`après ${nPtr} relâchements de doigt perdus`);
  await sleep(400); await playable('et encore un toucher juste après');
  // 6. orientation / redimensionnement (barre Safari qui apparaît)
  await page.setViewportSize({ width: 393, height: H - 90 }); await sleep(500); await page.setViewportSize({ width: 393, height: H }); await sleep(700);
  await playable('après redimensionnement (barre Safari)');
  // 7. fusions réelles répétées, puis perturbation entre deux
  for (let r = 0; r < 4; r++) {
    let sc4 = await scene(); const seen = new Map(); let pair = null;
    for (const c of sc4.cells) { if (c.c === 'gen' || c.c === 'special') continue; const key = `${c.c}:${c.l}`; if (seen.has(key)) { pair = [seen.get(key), c.i]; break; } seen.set(key, c.i); }
    const gpos = sc4.cells.find((c) => c.c === 'gen');
    if (!pair && gpos) { const pg2 = await xy(gpos.i); for (let k = 0; k < 2; k++) { await Promise.all([touch('touchStart', pg2.x, pg2.y), touch('touchEnd', pg2.x, pg2.y)]); await sleep(500); } continue; }
    if (!pair) break;
    const a = await xy(pair[0]), b = await xy(pair[1]);
    await touch('touchStart', a.x, a.y);
    for (let k = 1; k <= 5; k++) { await touch('touchMove', a.x + ((b.x - a.x) * k) / 5, a.y + ((b.y - a.y) * k) / 5); await sleep(25); }
    if (r % 2) { await touch('touchCancel', b.x, b.y); } else { await touch('touchEnd', b.x, b.y); }
    await sleep(800);
    await playable(`fusion/annulation n°${r + 1}`);
  }
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur console / page', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close();
process.exit(ko ? 1 : 0);
