// Parcours E2E du MODE DÉCORATION (Chromium ÉMULÉ, pas un vrai iPhone) :
//   npx vite build --outDir /tmp/claude-0/v && npx vite preview --outDir /tmp/claude-0/v --port 4203 &
//   PORT=4203 node scripts/decor-e2e.mjs        (W=393 H=852 puis W=393 H=660 : lancer deux fois ; SHOTS=1 : captures shots/v-*.png)
// Ouvre le château → chambre → mode décoration ; pinch (événements tactiles CDP à deux doigts) et déplacement de la caméra ; recentrer ;
// glissé d'un meuble au sol ; rotation ; lustre au plafond (refusé au sol) ; tableau au mur ; tapis ; objet sur une table ; collisions ;
// achat avec confirmation ; annuler ; valider ; rechargement (pièce identique) ; couleurs ; aucun calque résiduel.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT ?? 4203;
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
const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `shots/v-${n}-${H}.png` }); };
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
await openBedroom();

// ---------- état de la vue
const stageBox = async () => page.locator('.cs-stage').boundingBox();
const room = () => page.evaluate(() => JSON.parse(JSON.stringify(window.RADIA.save.data.world.castle.rooms.bedroom)));
const coins = () => page.evaluate(() => window.RADIA.save.data.world.res.coins);
check('mode décoration : écran de pièce ouvert', (await page.locator('.dc2-room .cs-stage canvas').count()) === 1);
const sb = await stageBox();
check(`la pièce occupe l'écran : scène ${Math.round(sb.width)}×${Math.round(sb.height)} sur ${W}×${H}`, sb.width >= W - 24 && sb.height >= H * 0.55);
check('catalogue replié par défaut (hauteur 0)', (await page.locator('.dc2-sheet').evaluate((e) => e.getBoundingClientRect().height)) < 2);
check('pas de défilement de page', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1));
check('migration : lustre remonté au plafond', await page.evaluate(() => { const it = window.RADIA.save.data.world.castle.rooms.bedroom.items.find((i) => i.id === 'chandelier'); return !!it && it.x === 4; }));
await sleep(600);
await shot('1-chambre');

// ---------- caméra : coordonnées d'un point du monde -> écran (via la mise en page connue : on lit le canvas)
const cdp = await ctx.newCDPSession(page);
const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })) });
const grab = () => page.evaluate(() => { const c = document.querySelector('.cs-canvas'); return c ? c.toDataURL().length : 0; });
const sig = async () => page.evaluate(() => { const c = document.querySelector('.cs-canvas'); const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 4097) h = (h * 31 + d[i]) | 0; return h; });
const cx = sb.x + sb.width / 2; const cy = sb.y + sb.height / 2;
const s0 = await sig();
// pincement : deux doigts qui s'écartent
await touch('touchStart', [{ x: cx - 40, y: cy }, { x: cx + 40, y: cy }]);
for (let i = 1; i <= 10; i++) await touch('touchMove', [{ x: cx - 40 - i * 9, y: cy }, { x: cx + 40 + i * 9, y: cy }]);
await touch('touchEnd', []);
await sleep(500);
const s1 = await sig();
check('pincement (deux doigts) : la vue change (zoom)', s0 !== s1);
await shot('2-zoom');
// déplacement à un doigt sur le fond
await touch('touchStart', [{ x: cx + 60, y: cy + 100 }]);
for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: cx + 60 - i * 12, y: cy + 100 - i * 14 }]);
await touch('touchEnd', []);
await sleep(400);
const s2 = await sig();
check('déplacement de la caméra (un doigt sur le fond)', s1 !== s2);
await page.locator('.dc2-pill', { hasText: 'Recentrer' }).click();
await sleep(700);
const s3 = await sig();
check('Recentrer ramène la vue', s3 !== s2);
await page.locator('.dc2-pill', { hasText: 'Vue globale' }).click();
await sleep(900);
await shot('3-vue-globale');


// ---------- interactions (via RADIA.decor : conversion cases -> écran)
const D = (fn, ...a) => page.evaluate(([f, args]) => window.RADIA.decor[f](...args), [fn, a]);
const drag = async (from, to, steps = 12) => {
  await touch('touchStart', [from]);
  for (let i = 1; i <= steps; i++) await touch('touchMove', [{ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }]);
  await touch('touchEnd', []);
  await sleep(350);
};
const dirty = () => D('dirty');
const items = () => D('items');
const byId = async (id) => (await items()).find((i) => i.id === id);
const validate = async () => { await page.locator('.dc2-btn.ok').click(); await sleep(500); };
const cancel = async () => { await page.locator('.dc2-btn.cancel').click(); await sleep(400); };
const shopOpen = async (tab) => { await page.locator('.dc2-btn', { hasText: 'Boutique' }).click(); await sleep(500); if (tab) { await page.locator('.dc2-tab', { hasText: tab }).first().click(); await sleep(300); } };
const buyConfirm = async () => { const b = page.locator('.modal-backdrop:not(.leaving) .actions button').first(); await b.click(); await sleep(600); };

// 1. déplacer le lit au sol par glissé, puis valider
let bed = await byId('bed-royal');
const from = await D('itemCenter', bed.uid);
const target = await D('floor', 4.5, 3.5);
await drag(from, target);
bed = await byId('bed-royal');
check('glissé : le lit est déplacé (brouillon)', bed.x > 1 && (await dirty()));
check('la barre d\'actions apparaît (Tourner / Ranger / Valider)', (await page.locator('.dc2-btn', { hasText: 'Tourner' }).count()) === 1 && (await page.locator('.dc2-btn.ok').count()) === 1);
await shot('4-lit-glisse');
// 2. rotation : l'emprise passe de 3×2 à 2×3
await page.locator('.dc2-btn', { hasText: 'Tourner' }).click(); await sleep(400);
bed = await byId('bed-royal');
check('rotation : rot=1 (vue de côté)', bed.rot === 1);
await shot('5-lit-tourne');
await validate();
const saved = await room();
check('valider enregistre (rot et position)', saved.items.find((i) => i.id === 'bed-royal').rot === 1 && !(await dirty()));
// 3. lustre : ajouter un 2e depuis la boutique (achat avec confirmation), il se colle au plafond
const c0 = await coins();
await shopOpen('Luminaires');
await page.locator('.dc2-card', { hasText: 'Suspension' }).first().click(); await sleep(500);
let pend = (await items()).find((i) => i.id === 'pendant');
check('suspension de plafond : collée au plafond (y de plafond)', !!pend && pend.y === (await D('items')).find((i) => i.id === 'pendant').y);
check('rien n\'est payé avant la confirmation', (await coins()) === c0);
await shot('6-suspension');
await page.locator('.dc2-btn.ok').click(); await sleep(500);
check('demande de confirmation d\'achat', (await page.locator('.modal-backdrop:not(.leaving) .dc2-buy').count()) === 1);
await shot('7-confirmation');
await buyConfirm();
check('achat : pièces débitées une seule fois', (await coins()) === c0 - 160);
// 4. lustre au sol refusé : on glisse la suspension sur le sol -> reste au plafond
const pd = (await room()).items.find((i) => i.id === 'pendant');
const pc = await D('itemCenter', pd.uid);
await drag(pc, await D('floor', 5, 5));
check('un luminaire de plafond ne se pose jamais au sol', (await byId('pendant')).y === pd.y);
// 5. tapis, coussin sur un meuble, tableau au mur depuis la réserve
await validate().catch(() => {});
await cancel().catch(() => {});
await shopOpen('Réserve');
await page.locator('.dc2-card', { hasText: 'Grand tapis' }).first().click().catch(() => {});
await sleep(400);
check('réserve : l\'objet possédé se pose sans payer', (await coins()) === c0 - 160);
await validate();
await shot('8-tapis');
const afterRug = await room();
check('tapis posé (calque tapis)', afterRug.items.some((i) => i.id === 'rug-rect') && (await coins()) === c0 - 160);
await shopOpen('Réserve');
await page.locator('.dc2-card', { hasText: 'Coussin' }).first().click().catch(() => {});
await sleep(400);
const cu = (await items()).find((i) => i.id === 'cushion');
check('coussin : posé sur un support (lit / chevet)', !!cu && cu.on !== undefined);
await validate();
// 6. collision : un fauteuil sur le lit au sol est refusé (retour à la place)
await shopOpen('Réserve');
await page.locator('.dc2-card', { hasText: 'Fauteuil' }).first().click().catch(() => {});
await sleep(400);
const ar = (await items()).find((i) => i.id === 'armchair');
if (ar) {
  const bed2 = await byId('bed-royal');
  const bc = await D('itemCenter', bed2.uid);
  const ac = await D('itemCenter', ar.uid);
  await drag(ac, bc);
  const ar2 = (await items()).find((i) => i.id === 'armchair');
  const bed3 = await byId('bed-royal');
  const ov = ar2.x < bed3.x + 2 && bed3.x < ar2.x + 2 && ar2.y < bed3.y + 3 && bed3.y < ar2.y + 2;
  check('collision : le fauteuil ne se superpose pas au lit', !ov);
  await cancel();
}
// 7. annuler : aucune trace
const before = JSON.stringify(await room());
await shopOpen('Tapis');
await page.locator('.dc2-card').first().click(); await sleep(300);
await cancel();
check('annuler : rien ne change', JSON.stringify(await room()) === before && !(await dirty()));
// 8. couleurs avec aperçu
await page.locator('.dc2-btn', { hasText: 'Couleurs' }).click(); await sleep(500);
await shot('9-couleurs');
const wallBefore = (await room()).wall;
await page.locator('.dc2-swatches .cs-sw').nth(3).click(); await sleep(500);
check('couleur : aperçu sans enregistrer', (await room()).wall === wallBefore);
await page.locator('.dc2-color-foot .btn:not(.secondary)').click(); await sleep(500);
check('couleur : validée', (await room()).wall !== wallBefore);
// 9. rechargement de la page : pièce identique
const snapRoom = JSON.stringify(await room());
await sleep(600);
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await openBedroom();
check('rechargement : pièce identique', JSON.stringify(await room()) === snapRoom);
await shot('10-apres-rechargement');
// 10. aucun calque résiduel après retour au château puis au hub
await page.locator('.screen-head .icon-btn').first().click(); await sleep(700);
await closeModals();
const leftovers = await page.evaluate(() => [...document.querySelectorAll('#ui > *')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > innerWidth * 0.9 && r.height > innerHeight * 0.5 && cs.pointerEvents !== 'none' && cs.backgroundColor.startsWith('rgba') && !/, 0\)$/.test(cs.backgroundColor) && !e.classList.contains('screen'); }).map((e) => e.className));
check('aucun calque sombre / bloquant résiduel', leftovers.length === 0, leftovers.join(','));

console.log(out.join('\n'));
console.log('erreurs:', errs.length ? errs : 'aucune');
await browser.close();
