// Parcours réel : invitation (notification) → J'arrive → dressing → trajet → menu → devinette → photo → conclusion.
// Mode A : depuis l'accueil / Mon monde.  Mode B : en pleine partie de fusion (la partie doit être retrouvée intacte).
import { chromium } from 'playwright';
const MODE = process.argv[2] ?? 'A';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console: ' + m.text()); });
await p.addInitScript(() => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', JSON.stringify({ v: 3, seenUpdates: ['v2', 'v3', 'v4'], story: { step: 0 }, levels: {}, hearts: 0 })); });
await p.goto('http://localhost:4173/?debug'); await p.waitForTimeout(3500);
const out = []; const check = (n, ok, extra = '') => out.push(`${ok ? 'OK ' : 'KO '} ${n}${extra ? ' — ' + extra : ''}`);
check('sauvegarde migrée en v4', await p.evaluate(() => window.RADIA.save.data.v === 4 && !!window.RADIA.save.data.events));
let boardBefore = null;
if (MODE === 'B') {
  await p.getByText('MODE CHAPITRES').first().click();
  for (let i = 0; i < 30; i++) {
    const on = await p.evaluate(() => { const m = window.RADIA.game().scene.getScene('merge'); return !!m && m.sys.isActive() && !document.querySelector('.dialog-layer:not(.leaving)') && !document.querySelector('.chapter-card') && !document.querySelector('.modal-backdrop:not(.leaving)'); });
    if (on) break;
    const c = p.getByText("C'est parti"); if (await c.count()) { await c.first().click().catch(() => {}); await p.waitForTimeout(600); continue; }
    const s = p.getByText('Passer'); if (await s.count()) await s.first().click().catch(() => {}); else await p.mouse.click(200, 500);
    await p.waitForTimeout(700);
  }
  await p.waitForTimeout(1500);
  boardBefore = await p.evaluate(() => JSON.stringify(window.RADIA.game().scene.getScene('merge').state.cells.map(c => c.item ? c.item.c + ':' + c.item.l : null)));
  check('partie de fusion en cours', !!boardBefore);
}
const coins0 = await p.evaluate(() => window.RADIA.save.data.world.res.coins);
const dia0 = await p.evaluate(() => window.RADIA.save.data.economy.diamonds);
const runId = await p.evaluate(() => window.RADIA.invite('r-restaurant'));
check('invitation créée', !!runId);
// la notification doit apparaître toute seule (moment sûr)
await p.waitForSelector('.ev-notif', { timeout: 20000 }).then(() => check('notification affichée pendant ' + (MODE === 'B' ? 'la fusion' : 'le jeu'), true)).catch(() => check('notification affichée', false));
await p.screenshot({ path: `shots/ee-${MODE}-notif.png` });
await p.locator('.ev-notif .btn').first().click();
await p.waitForSelector('.ev-inv', { timeout: 5000 }).then(() => check('feuille d\'invitation', true)).catch(() => check('feuille d\'invitation', false));
await p.screenshot({ path: `shots/ee-${MODE}-invite.png` });
await p.locator('.ev-inv .btn').first().click();
let guess = null, shots = 0, tPhoto = false;
const t0 = Date.now();
while (Date.now() - t0 < 150000) {
  if (await p.locator('.ev-concl').count()) break;
  const cur = await p.evaluate(() => { const c = window.RADIA.save.data.events.current; return c ? { step: c.step, g: c.data.guessMenu ?? null, m: c.data.menuPick ?? null } : null; });
  if (cur?.g && !guess) guess = { g: cur.g, m: cur.m };
  const act = async (sel, name) => { const l = p.locator(sel); if (await l.count()) { await l.first().click({ timeout: 2000 }).catch(() => {}); return true; } return false; };
  if (await act('.dr-tip button', 'tip')) { await p.waitForTimeout(300); continue; }
  if (await p.locator('.dr-ready').count()) { if (!shots++) await p.screenshot({ path: `shots/ee-${MODE}-dress.png` }); await act('.dr-ready'); await p.waitForTimeout(600); continue; }
  if (await p.locator('.ev-say').count()) { await p.waitForTimeout(350); await act('.ev-say'); await p.waitForTimeout(250); continue; }
  if (await p.locator('.ev-travel').count()) { await p.locator('.ev-body').click({ position: { x: 100, y: 300 } }).catch(() => {}); await p.waitForTimeout(400); continue; }
  const btn = async (re) => { const l = p.locator('button', { hasText: re }); if (await l.count()) { await l.first().click({ timeout: 2000 }).catch(() => {}); return true; } return false; };
  if (await btn(/Valider mon menu/)) { await p.waitForTimeout(600); continue; }
  if (await p.locator('.rs-card:not(.sel)').count()) { await p.locator('.rs-card:not(.sel)').first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(450); continue; }
  if (await btn(/Voir mon menu/)) { await p.waitForTimeout(400); continue; }
  if (await btn(/Photo !/)) { tPhoto = true; await p.waitForTimeout(3500); continue; }
  if (await btn(/^Continuer/)) { await p.waitForTimeout(500); continue; }
  if (await btn(/Terminer|Suite|OK/)) { continue; }
  await p.waitForTimeout(500);
}
await p.screenshot({ path: `shots/ee-${MODE}-concl.png` });
check('conclusion affichée', (await p.locator('.ev-concl').count()) > 0);
check('photo souvenir prise', tPhoto);
if (guess) {
  const m = guess.m, a = guess.g.augusteMenu;
  check('le menu d\'Auguste = copie du menu de Radia', a && a.starter === m.starter && a.main === m.main && a.dessert === m.dessert, JSON.stringify(a));
  check('prédictions évaluées', typeof guess.g.hits === 'number', `hits=${guess.g.hits}`);
} else check('données de devinette lues', false);
await p.locator('.ev-concl .btn').first().click().catch(() => {});
await p.waitForTimeout(1200);
const st = await p.evaluate(() => { const e = window.RADIA.save.data.events; const s = window.RADIA.save.data; return { done: e.done['r-restaurant'], photos: e.photos.length, claimed: Object.keys(e.claimed).length, current: e.current, coins: s.world.res.coins, dia: s.economy.diamonds, ach: Object.keys(s.achievements) }; });
check('événement enregistré (1 fois)', st.done?.count === 1);
check('récompense versée une seule fois (+5 diamants +5 du succès)', st.claimed === 1 && st.coins - coins0 === 120 && st.dia - dia0 === 10, `pièces +${st.coins - coins0}, diamants +${st.dia - dia0}`);
check('souvenir (photo) dans le téléphone', st.photos === 1);
check('plus d\'activité en cours', st.current === null);
check('succès « Première invitation »', st.ach.includes('ev_first'));
check('couche événement retirée', (await p.locator('.ev-layer').count()) === 0);
if (MODE === 'B') {
  const after = await p.evaluate(() => { const m = window.RADIA.game().scene.getScene('merge'); return { active: m.sys.isActive(), paused: m.sys.isPaused?.(), cells: JSON.stringify(m.state.cells.map(c => c.item ? c.item.c + ':' + c.item.l : null)) }; });
  check('la partie de fusion est reprise', after.active && !after.paused);
  check('le plateau est exactement comme avant', after.cells === boardBefore);
} else {
  check('retour à l\'écran d\'origine', (await p.locator('.title-menu, .hub-grid').count()) > 0);
}
console.log(out.join('\n')); console.log('erreurs:', errs.length ? errs.slice(0, 5) : 'aucune');
await b.close();
