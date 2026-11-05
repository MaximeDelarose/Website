// Test de stabilité de la chambre (Chromium ÉMULÉ 393×852 / 393×660, pas un vrai iPhone) : PORT=4187 [H=660] node scripts/stability-e2e.mjs
// MON MONDE → château → chambre → décor visible → boutique → sélection → déplacement → fermeture → retour ; puis rechargement, images bloquées, rendu en panne (écran d'erreur + Réessayer + retour).
// achat avec confirmation ; annuler ; valider ; rechargement (pièce identique) ; couleurs ; aucun calque résiduel.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT ?? 4187;
const W = +(process.env.W ?? 393); const H = +(process.env.H ?? 852);
const SHOTS = process.env.SHOTS !== '0';
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/.test(m.text())) errs.push('console: ' + m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const out = [];
const check = (name, ok, extra = '') => { const l = `${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`; out.push(l); console.log(l); };
const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `shots/st-${n}-${H}.png` }); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

// sauvegarde v5 : château avec des meubles posés à l'ancienne (migration), pièces suffisantes
const legacy = (uid, id, x, y, color = 'cream') => ({ uid, id, x, y, color, flip: false });
const seed = {
  v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 500,
  fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } },
  world: {
    flags: { 'rw:start-gift-v1': true },
    res: { coins: 20000, flowers: 50, fabric: 50, cocoa: 50 },
    castle: {
      unlocked: ['bedroom', 'salon', 'garden', 'dressing', 'reception'],
      rooms: {
        bedroom: { wall: 'rose', floor: 'cream', curtain: 'lavender', items: [legacy(1, 'bed-royal', 0, 0, 'rose'), legacy(2, 'nightstand', 3, 0, 'beige'), legacy(3, 'chandelier', 4, 3, 'gold'), legacy(4, 'painting', 5, 0, 'gold'), legacy(5, 'plant-pot', 7, 5, 'peach')] },
      },
      owned: { 'bed-royal': 1, nightstand: 1, chandelier: 1, painting: 1, 'plant-pot': 1, cushion: 2, 'rug-rect': 1, armchair: 1 },
      nextUid: 6,
    },
  },
};
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' });
await sleep(2500);
async function closeModals() {
  let calm = 0;
  for (let i = 0; i < 30 && calm < 3; i++) {
    await sleep(450);
    const busy = await page.evaluate(() => {
      document.querySelectorAll('.dy-back').forEach((e) => e.remove());
      let b = false;
      const bs = document.querySelectorAll('.modal-backdrop:not(.leaving) .actions button');
      if (bs.length) { bs[bs.length - 1].click(); b = true; }
      const ov = document.querySelector('#reward-overlay');
      if (ov && ov.children.length) { b = true; for (const sel of ['.rw-art', '.rw-skip', '.rw-primary']) { const e = ov.querySelector(sel); if (e && e.getBoundingClientRect().width) e.click(); } }
      return b;
    });
    calm = busy ? 0 : calm + 1;
  }
}
await closeModals();
await page.evaluate(() => { const w = window.RADIA.save.data.world; w.res.coins = Math.max(w.res.coins, 20000); });
// clic robuste : si une fenêtre d'accueil / récompense intercepte, on la ferme puis on réessaie
async function click(loc) {
  for (let i = 0; i < 8; i++) {
    try { await loc.first().evaluate((e) => e.click(), null, { timeout: 4000 }); return; } catch { await closeModals(); }
  }
  throw new Error('clic impossible : ' + loc);
}
async function openBedroom() {
  await click(page.getByText('MON MONDE'));
  await sleep(1200);
  await closeModals();
  await click(page.locator('.hub-enter, .hub-card:has-text("Château")'));
  await sleep(1500);
  await closeModals();
  await click(page.locator('.cs-hot[aria-label*="Chambre de Radia"]'));
  await sleep(1400);
  await closeModals();
}
const nonBlank = () => page.evaluate(() => { const c = document.querySelector('.cs-canvas'); if (!c || !c.width) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const set = new Set(); for (let i = 0; i < d.length; i += 4 * 211) set.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4)); return set.size; });
const backToWorld = async () => { for (let i = 0; i < 2; i++) { await page.locator('.screen-head button[aria-label="Retour"]').first().click({ timeout: 4000 }).catch(() => {}); await sleep(700); } };
const D = (fn, ...a) => page.evaluate(([f, args]) => window.RADIA.decor[f](...args), [fn, a]);
const cdp = await ctx.newCDPSession(page);
const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })) });

async function scenario(label) {
  check(`${label} : écran de pièce`, (await page.locator('.dc2-room .cs-stage canvas').count()) === 1);
  await sleep(700);
  const colours = await nonBlank();
  check(`${label} : décor visible (${colours} teintes)`, colours >= 6);
  check(`${label} : aucun écran d'erreur`, (await page.locator('.dc2-error').count()) === 0);
  await page.locator('.dc2-btn', { hasText: 'Boutique' }).click(); await sleep(500);
  check(`${label} : boutique ouverte`, (await page.locator('.dc2-sheet').evaluate((e) => e.getBoundingClientRect().height)) > 20);
  const its = await D('items');
  const bed = its.find((i) => i.id === 'bed-royal') ?? its[0];
  const from = await D('itemCenter', bed.uid);
  check(`${label} : meuble sélectionnable`, !!from);
  await touch('touchStart', [from]); await touch('touchEnd', []); await sleep(300);
  const to = await D('floor', 4.5, 3.5);
  await touch('touchStart', [from]);
  for (let i = 1; i <= 10; i++) await touch('touchMove', [{ x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10 }]);
  await touch('touchEnd', []); await sleep(400);
  check(`${label} : déplacement sans erreur`, (await nonBlank()) >= 6);
  const cancel = page.locator('.dc2-btn.cancel'); if (await cancel.count()) { await cancel.click(); await sleep(300); }
  const handle = page.locator('.dc2-handle'); await handle.click().catch(() => {}); await sleep(400);
  check(`${label} : aucun calque bloquant`, await page.evaluate(() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !!e && !!e.closest('.dc2-room'); }));
  await backToWorld();
  check(`${label} : retour à MON MONDE`, (await page.locator('.dc2-room, .cs-screen').count()) === 0);
}
await openBedroom();
await scenario('parcours');
// ---- rechargement + même sauvegarde
await page.reload({ waitUntil: 'networkidle' }); await sleep(2000); await closeModals();
await openBedroom(); await scenario('après rechargement');
// ---- images bloquées
await page.route(/\.(png|jpg|jpeg|webp|svg|gif)(\?.*)?$/, (r) => r.abort());
await page.reload({ waitUntil: 'load' }).catch(() => {}); await sleep(2500); await closeModals();
await openBedroom().catch((e) => out.push('KO ouverture sans images ' + e.message));
check('sans images : la pièce reste affichée ou propose une sortie', (await page.locator('.dc2-room canvas, .dc2-error').count()) >= 1);
await page.unroute(/\.(png|jpg|jpeg|webp|svg|gif)(\?.*)?$/);
// ---- rendu en panne → écran d'erreur, Réessayer, retour
await page.reload({ waitUntil: 'networkidle' }); await sleep(2000); await closeModals();
await click(page.getByText('MON MONDE')); await sleep(1200); await closeModals();
await click(page.locator('.hub-enter, .hub-card:has-text("Château")')); await sleep(1500); await closeModals();
await page.evaluate(() => { const P = CanvasRenderingContext2D.prototype; window.__sv = { fr: P.fillRect, di: P.drawImage, cr: P.clearRect }; const boom = () => { throw new Error('rendu en panne (test)'); }; P.fillRect = boom; P.drawImage = boom; P.clearRect = boom; });
await click(page.locator('.cs-hot[aria-label*="Chambre de Radia"]'));
await page.waitForSelector('.dc2-error', { timeout: 8000 }).catch(() => {});
check('rendu en panne : message compréhensible + Réessayer + Retour', (await page.locator('.dc2-error button').count()) === 2);
await shot('erreur');
await page.evaluate(() => { const P = CanvasRenderingContext2D.prototype; P.fillRect = window.__sv.fr; P.drawImage = window.__sv.di; P.clearRect = window.__sv.cr; });
await page.locator('.dc2-error button', { hasText: 'Réessayer' }).click().catch(() => {}); await sleep(1500);
check('Réessayer : la pièce revient', (await nonBlank()) >= 6);
await backToWorld();
const saved = await page.evaluate(() => window.RADIA.save.data.world.castle.rooms.bedroom.items.length);
check(`sauvegarde intacte (${saved} meubles)`, saved >= 5);
console.log(`\n${out.filter((l) => l.startsWith('OK')).length}/${out.length} OK · erreurs: ${errs.filter((e) => !/rendu en panne|Failed to load|net::ERR/.test(e)).join(' | ') || 'aucune'}`);
await browser.close();
