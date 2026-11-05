// Parcours e2e du mode infini (Endless 2.0) : vraies parties par clics et glissés, Chromium ÉMULÉ (pas un vrai iPhone).
//   npx vite build --outDir /tmp/claude-0/b2 && npx vite preview --outDir /tmp/claude-0/b2 --port 4187 &
//   PORT=4187 node scripts/endless-e2e.mjs            (393×852 puis 393×660 ; captures dans shots/b2-*.png)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT ?? 4187;
const URL = `http://localhost:${PORT}/?debug`;
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = [];
const errors = [];
let curTag = '';
const check = (name, ok, detail = '') => { results.push({ ok: !!ok, line: `${ok ? 'OK ' : 'KO '} [${curTag}] ${name}${detail ? ` — ${detail}` : ''}` }); };

const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const baseSave = () => ({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6'], story: { step: 9999 }, levels: {}, hearts: 500, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } });

async function open(H, saveObj, tag) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(`[${tag}] console: ${m.text()}`); });
  if (saveObj) await page.addInitScript((s) => { if (!sessionStorage.getItem('b2-seeded')) { localStorage.setItem('radia-save-v1', s); sessionStorage.setItem('b2-seeded', '1'); } }, JSON.stringify(saveObj));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  return { ctx, page };
}

const mk = (page, tag, H) => {
  const sleep = (ms) => page.waitForTimeout(ms);
  const shot = async (n) => { await page.screenshot({ path: `shots/b2-${H}-${n}.png` }); };
  const closeModals = async () => {
    let empty = 0;
    for (let i = 0; i < 16 && empty < 4; i++) {
      let b = page.locator('.modal-backdrop:not(.leaving) .dy-later');
      if (!(await b.count())) b = page.locator('.modal-backdrop:not(.leaving) .actions button');
      if (await b.count()) { empty = 0; await b.first().click().catch(() => {}); await sleep(600); } else { empty++; await sleep(400); }
    }
  };
  const E = (fn, ...a) => page.evaluate(([f, args]) => window.RADIA.endless[f](...args), [fn, a]);
  const st = () => E('state');
  const idle = async () => { await page.waitForFunction(() => window.RADIA.endless.idle(), null, { timeout: 8000 }).catch(() => {}); await sleep(250); };
  const startEndless = async () => {
    await closeModals();
    // l'annonce « L'aventure continue » (une fois) ouvre la carte du domaine : on revient au titre
    if (await page.getByText('Carte du domaine').count()) { await page.locator('.screen-head .icon-btn').first().click().catch(() => {}); await sleep(700); await closeModals(); }
    if (await page.getByText('MODE LIBRE').count()) {
      await page.getByText('MODE LIBRE').first().click();
    } else {
      await page.getByText('MODE CHAPITRES').first().click();
      await sleep(900);
      await page.getByText('Mode infini').first().click();
    }
    await sleep(2500);
    await page.waitForSelector('.merge-hud.endless', { timeout: 8000 });
  };
  const xy = (i) => E('cellXY', i);
  // départ et fin du toucher envoyés d'un coup : sur une machine chargée, un clic lent serait un appui long (seuil 550 ms)
  const clickCell = async (i) => { const p = await xy(i); await page.mouse.move(p.x, p.y); await Promise.all([page.mouse.down(), page.mouse.up()]); };
  // une fiche ouverte par un appui long ACCIDENTEL (machine très chargée : le doigt simulé arrive après 550 ms) est refermée avant de continuer
  const closeStraySheet = async () => { if (await page.locator('.en-sheet-back').count()) { await page.locator('.en-sheet-x').first().click().catch(() => {}); await sleep(400); } };
  const drag = async (a, b) => {
    await closeStraySheet();
    const p = await xy(a); const q = await xy(b);
    const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    // le doigt sort tout de suite de la tolérance de 8 px d'appui long (sinon, sur une machine chargée, un glissé lent EST un appui long)
    await Promise.all([page.mouse.move(p.x, p.y), page.mouse.down(), page.mouse.move(p.x + ((q.x - p.x) / d) * 14, p.y + ((q.y - p.y) / d) * 14)]);
    await page.mouse.move((p.x + q.x) / 2, (p.y + q.y) / 2, { steps: 3 });
    await page.mouse.move(q.x, q.y, { steps: 3 });
    await page.mouse.up();
    await sleep(250);
    await closeStraySheet();
  };
  /** Appui long (≈ 750 ms, immobile) sur une case. */
  const longPress = async (i) => { await closeStraySheet(); const p = await xy(i); await page.mouse.move(p.x, p.y); await page.mouse.down(); await sleep(1000); await page.mouse.up(); await sleep(300); };
  return { sleep, shot, closeModals, E, st, idle, startEndless, xy, clickCell, drag, longPress };
};

async function runEndless(H) {
  curTag = `${H}`;
  const { ctx, page } = await open(H, baseSave(), curTag);
  const t = mk(page, curTag, H);
  await t.closeModals();
  await t.shot('0-title');
  await t.startEndless();
  await t.E('clearLocks'); // les cases verrouillées (récompenses de libération) ont leur propre parcours : scripts/board-e2e.mjs
  let s = await t.st();
  await t.shot('1-start');
  check('départ neuf : 3 commandes facile/moyenne/difficile', s.orders.length === 3 && s.orders.map((o) => o.tier).join() === 'easy,mid,hard');
  check('3 cartes affichées avec pastille, objets et récompenses', (await page.locator('.en-card').count()) === 3 && (await page.locator('.en-card .en-av, .en-card .en-dot').count()) === 3 && (await page.locator('.en-card .en-who b').count()) === 3 /* portrait rond + prénom du client à la place du point de couleur */ && (await page.locator('.en-card .en-it').count()) >= 3 && (await page.locator('.en-card .en-rws .en-rw').count()) >= 6);
  check('jauge de trésor, ≤ 2 chips, une ligne d\'objectif', (await page.locator('.en-tre').count()) === 1 && (await page.locator('.en-chip').count()) <= 2 && (await page.locator('.en-goal').count()) === 1);
  check('plus aucun badge « i » (.en-geni) sur les générateurs ; panneau d\'objet sous le plateau', (await page.locator('.en-geni').count()) === 0 && (await page.locator('.en-sel').count()) === 1);
  // la HUD ne déborde pas de l'écran et le plateau est visible
  const hudBox = await page.evaluate(() => { const r = document.querySelector('.en-goal').getBoundingClientRect(); return { bottom: r.bottom, h: innerHeight, sw: document.documentElement.scrollWidth }; });
  check('pas de défilement horizontal', hudBox.sw <= 393);

  // ---- 1. vraie partie : toucher le générateur, glisser pour fusionner
  const genCells = s.cells.filter((c) => c.c === 'gen').map((c) => c.i);
  const e0 = s.energy;
  const taps0 = s.taps;
  for (let k = 0; k < 14; k++) { await t.clickCell(genCells[0]); await t.sleep(420); }
  await t.idle();
  s = await t.st();
  check('toucher un générateur produit des objets', s.cells.filter((c) => c.c !== 'gen').length >= 8, `${s.cells.length} cases`);
  check('énergie dépensée ≤ 1 par toucher (touchers gratuits remboursés)', e0 - s.energy >= 1 && e0 - s.energy <= s.taps - taps0 + 1, `énergie ${e0}→${s.energy} pour ${s.taps - taps0} touchers`);
  let merges = 0;
  for (let k = 0; k < 14; k++) {
    s = await t.st();
    const by = new Map();
    let pair = null;
    for (const c of s.cells) { if (c.c === 'gen' || c.c === 'special') continue; const key = `${c.c}:${c.l}`; if (by.has(key)) { pair = [by.get(key), c.i]; break; } by.set(key, c.i); }
    if (!pair) break;
    await t.drag(pair[0], pair[1]);
    await t.sleep(700);
    await t.idle();
    merges++;
  }
  s = await t.st();
  check('glisser deux objets identiques fusionne', merges > 0 && s.counters.merges >= 1 && s.score > 0, `${merges} glissés, score ${s.score}`);
  await t.shot('2-after-merges');

  // ---- 2. informations générateur sans dépenser d'énergie
  const taps1 = s.taps;
  await page.evaluate(() => { const r = window.RADIA.save.data.world.res; r.coins = 0; r.flowers = 0; r.cocoa = 0; r.fabric = 0; });
  await t.longPress(genCells[0]);
  await t.sleep(500);
  { const sc = await page.locator('.en-sheet .en-gen').count(); const tp = (await t.st()).taps; check('feuille du générateur ouverte par APPUI LONG (sans toucher le générateur)', sc === 1 && tp === taps1, `feuilles ${sc}, touchers ${taps1} → ${tp}, génér. ${genCells[0]}, ptr ${JSON.stringify(await t.E('pointer'))}, feuille « ${(await page.locator('.en-sheet').allInnerTexts()).join('|').slice(0, 80).replace(/\n/g, ' ')} », case ${JSON.stringify((await t.st()).cells.find((c) => c.i === genCells[0]))}`); }
  await t.shot('3-gen-sheet');
  const upBtn0 = page.locator('.en-sheet .btn.gold.wide');
  check('amélioration : pas assez de ressources au départ (aucun diamant requis)', (await upBtn0.getAttribute('disabled')) !== null && !(await page.locator('.en-sheet').innerText()).toLowerCase().includes('diamant'));
  await page.locator('.en-sheet-x').click();
  await t.sleep(400);
  await t.E('addCoins', 5000);
  await t.E('addRes', 'flowers', 100);
  await t.E('addRes', 'cocoa', 100);
  const before = await t.st();
  await t.longPress(genCells[0]);
  await t.sleep(500);
  const upBtn = page.locator('.en-sheet .btn.gold.wide');
  check('bouton Améliorer actif avec les ressources', (await upBtn.getAttribute('disabled')) === null);
  await upBtn.click();
  await t.sleep(900);
  await t.shot('4-gen-upgraded');
  const after = await t.st();
  const gk = Object.keys(after.gens).find((k) => (after.gens[k].level ?? 1) === 2);
  check('générateur amélioré au niveau 2 et coût payé en pièces/matériau', !!gk && after.world.coins < before.world.coins && before.world.coins - after.world.coins <= 400, `pièces ${before.world.coins}→${after.world.coins}`);
  await page.locator('.en-sheet-x').click();
  await t.sleep(400);

  // ---- 3. livrer chacune des 3 commandes (gains versés UNE fois)
  await page.evaluate(() => { const e = window.RADIA.save.data.economy; e.energy = 30; e.energyTs = Date.now(); });
  for (let slot = 0; slot < 3; slot++) {
    const cur = await t.st();
    const o = cur.orders[slot];
    // on libère de la place si besoin
    for (const it of o.items) { await t.E('spawn', it.c, it.l); await t.sleep(250); }
    await t.idle();
    await t.sleep(600);
    const card = page.locator(`.en-card[data-slot="${slot}"]`);
    check(`commande ${slot + 1} : carte « prête » mise en évidence`, (await card.getAttribute('class')).includes('ready'));
    if (slot === 0) await t.shot('5-order-ready');
    const b4 = await t.st();
    const chB = await page.evaluate(() => { const e = window.RADIA.save.data.endless; return { n: e.challenges, r: e.run?.challenge?.reward ?? 0 }; });
    await card.locator('.en-give').click({ force: true });
    await t.sleep(1700);
    const af = await t.st();
    const r = o.reward;
    const chA = await page.evaluate(() => window.RADIA.save.data.endless.challenges);
    const dh = af.hearts - b4.hearts - (chA > chB.n ? chB.r : 0); // un défi réussi en même temps verse ses propres cœurs
    const dc = af.world.coins - b4.world.coins;
    const dm = af.world[r.mat] - b4.world[r.mat];
    const de = af.energy - b4.energy;
    check(`commande ${slot + 1} (${o.tier}) : cœurs versés une seule fois`, dh === r.hearts, `+${dh} (attendu ${r.hearts})`);
    check(`commande ${slot + 1} : pièces versées une seule fois`, dc === r.coins + (r.mat === 'coins' ? r.matN : 0) || dc === r.coins, `+${dc} (attendu ${r.coins})`);
    check(`commande ${slot + 1} : matériau ${r.mat} versé une seule fois`, r.mat === 'coins' || dm === r.matN, `+${dm} (attendu ${r.matN})`);
    check(`commande ${slot + 1} : énergie versée une seule fois`, de >= r.energy && de <= r.energy + 1, `+${de} (attendu ${r.energy})`);
    check(`commande ${slot + 1} : nouvelle commande du même palier`, af.orders[slot].id !== o.id && af.orders[slot].tier === o.tier);
    check(`commande ${slot + 1} : compteur de commandes +1`, af.counters.orders === b4.counters.orders + 1);
  }
  await t.shot('6-after-deliveries');

  // ---- 4. remplacer une commande (gratuit, sans pénalité)
  const r0 = await t.st();
  await page.locator('.en-card[data-slot="1"] .en-rep').click({ force: true });
  await t.sleep(900);
  const r1 = await t.st();
  check('remplacement : stock −1, commande différente du même palier, aucune pénalité', r1.replaces === r0.replaces - 1 && r1.orders[1].id !== r0.orders[1].id && r1.orders[1].tier === 'mid' && r1.hearts === r0.hearts && r1.world.coins === r0.world.coins && r1.score === r0.score, `reste ${r1.replaces}`);
  check('compteur du bouton « remplacer » mis à jour', (await page.locator('.en-card[data-slot="1"] .en-rep b').innerText()) === String(r1.replaces));

  // ---- 5. jauge de trésor → coffre
  const c0 = await t.st();
  await t.E('fillGauge');
  await t.sleep(600);
  check('jauge pleine : coffre à ouvrir (badge)', (await page.locator('.en-tre.pending').count()) === 1);
  await t.shot('7-chest-pending');
  const preOpen = await t.st();
  await page.locator('.en-tre').click({ force: true });
  await t.sleep(700);
  await page.waitForSelector('#reward-overlay .rw-root', { timeout: 8000 }).catch(() => {});
  check('overlay coffre affiché (couche récompense)', (await page.locator('#reward-overlay .rw-root').count()) === 1);
  await t.shot('8-chest-closed');
  await page.locator('.rw-art').click({ force: true });
  await t.sleep(1800);
  await t.shot('9-chest-opening');
  await page.waitForSelector('.rw-primary:visible', { timeout: 20000 });
  await t.sleep(600);
  await t.shot('10-chest-open');
  const lootText = await page.locator('.rw-card').allInnerTexts().then((a) => a.join('\n'));
  const num = (re) => [...lootText.matchAll(re)].reduce((a, m) => a + Number(m[1].replace(/\s/g, '')), 0);
  const expCoins = num(/\+\s*(\d+)\s*pièces/gi) + num(/(\d+)\s*pièces \(doublon/gi);
  await page.locator('.rw-primary').click();
  await t.sleep(1400);
  const postOpen = await t.st();
  check('coffre ouvert : 1 coffre de moins en attente', postOpen.treasure.pending === 0 && postOpen.treasure.earned >= 1 && c0.treasure.pending === 0);
  const dCoins = postOpen.world.coins - preOpen.world.coins;
  check('butin du coffre versé une seule fois (pièces)', dCoins >= 0 && (expCoins === 0 || dCoins === expCoins), `+${dCoins} pour « ${lootText.replace(/\n/g, ' | ')} »`);
  check('overlay coffre fermé', (await page.locator('#reward-overlay').count()) === 0);

  // coffres plus rares
  for (const rar of ['epic', 'legendary']) {
    await t.E('openChest', rar);
    await t.sleep(600);
    await page.locator('.rw-art').click({ force: true });
    await t.sleep(1500);
    await t.shot(`12-chest-${rar}`);
    await page.waitForSelector('.rw-primary:visible', { timeout: 20000 });
    await page.locator('.rw-primary').click();
    await t.sleep(900);
  }

  // ---- 6. événements secondaires et objectifs
  const chip = page.locator('.en-chip').first();
  if (await chip.count()) { await chip.click({ force: true }); await t.sleep(500); check('feuille d\'événement secondaire', (await page.locator('.en-sec').count()) === 1); await t.shot('13-secondary'); await page.locator('.en-sheet-x').click(); await t.sleep(300); }
  await page.locator('.en-goal').click({ force: true });
  await t.sleep(500);
  check('« Mes objectifs » : 3 objectifs (court / moyen / long) avec prochaine récompense', (await page.locator('.en-goal-row').count()) >= 3 && (await page.locator('.en-goal-row .rw').count()) >= 3);
  await t.shot('14-goals');
  await page.locator('.en-sheet-x').click();
  await t.sleep(300);

  // ---- 7. énergie à zéro : jamais de mur
  await page.evaluate(() => { const e = window.RADIA.save.data.economy; e.energy = 0; e.energyTs = Date.now(); e.freeRefillTs = 0; });
  await t.sleep(300);
  const tapsE = (await t.st()).taps;
  // on vide la grille de la case du générateur pour être sûr d'un vrai toucher
  await t.clickCell((await t.st()).cells.find((c) => c.c === 'gen').i);
  await t.sleep(900);
  const panel = page.locator('.modal .energy-panel');
  check('énergie 0 : panneau bienveillant avec options gratuites', (await panel.count()) === 1 && (await page.locator('.modal').innerText()).includes('Jouer ailleurs') && (await page.locator('.modal').innerText()).includes('offertes par Auguste'));
  await t.shot('15-energy-empty');
  await page.getByText('offertes par Auguste').click();
  await t.sleep(900);
  const eF = await t.st();
  check('recharge gratuite d\'Auguste : énergie reçue sans diamants', eF.energy >= 30 && (await t.st()).taps === tapsE, `énergie ${eF.energy}`);

  // ---- 8. MON MONDE depuis la partie et retour
  const beforeWorld = await t.st();
  await page.locator('.en-world').click({ force: true });
  await t.sleep(1600);
  check('MON MONDE ouvert depuis le mode infini', (await page.locator('.hub-grid').count()) > 0 && !(await page.locator('.merge-hud').isVisible()));
  await t.shot('16-world');
  await page.locator('.screen-head .icon-btn').first().click().catch(() => {});
  await t.sleep(1200);
  const afterWorld = await t.st();
  check('retour : la partie reprend (mêmes commandes, même plateau)', (await page.locator('.merge-hud.endless').isVisible()) && afterWorld.orders.map((o) => o.id).join() === beforeWorld.orders.map((o) => o.id).join() && afterWorld.cells.length === beforeWorld.cells.length);

  // ---- 9. beaucoup de collections : lisibilité
  await t.E('unlockAll');
  await t.sleep(1800);
  await t.shot('17-unlocked-all');
  const nGen = (await t.st()).cells.filter((c) => c.c === 'gen').length;
  check('6 générateurs au plus sur le plateau', nGen <= 6 && nGen >= 5, `${nGen}`);
  await t.E('drop', 'cloth', 'epic');
  await t.sleep(800);
  await t.shot('18-drop-cloth');

  // ---- 10. sauvegarde : rechargement
  const bR = await t.st();
  await t.sleep(900);
  await page.reload({ waitUntil: 'networkidle' });
  await t.sleep(1800);
  await t.startEndless();
  const aR = await t.st();
  check('sauvegarde persistante après rechargement', aR.counters.orders === bR.counters.orders && aR.treasure.opened === bR.treasure.opened && JSON.stringify(aR.gens) === JSON.stringify(bR.gens) && aR.replaces === bR.replaces && aR.orders.map((o) => o.id).join() === bR.orders.map((o) => o.id).join(), `commandes ${bR.counters.orders}→${aR.counters.orders}`);
  check('plateau restauré à l\'identique', JSON.stringify(aR.cells) === JSON.stringify(bR.cells));
  await t.shot('19-reloaded');

  // ---- 11. album (14 collections)
  await page.locator('.mh-bar .icon-btn').first().click();
  await t.sleep(500);
  await page.getByText('Quitter vers le menu').click();
  await t.sleep(1500);
  await t.closeModals();
  await page.getByText('SOUVENIRS').first().click();
  await t.sleep(1000);
  await page.getByRole('button', { name: 'Objets' }).click();
  await t.sleep(800);
  const rows = await page.locator('.coll-row').count();
  check('album : 14 collections + objets magiques', rows === 15, `${rows} rangées`);
  check('album : objets non découverts en silhouette, découverts affichés', (await page.locator('.coll-item.unknown').count()) > 0 && (await page.locator('.coll-item:not(.unknown)').count()) > 0);
  check('album : prochaine récompense visible', (await page.locator('.alb-next').count()) === 1);
  await t.shot('20-album');
  await page.evaluate(() => document.querySelector('.screen-body').scrollTo(0, 99999));
  await t.sleep(400);
  await t.shot('21-album-bottom');
  await ctx.close();
}

/** Ancienne sauvegarde v4 avec une partie `endless.run` existante : migration en douceur. */
async function runMigration(H) {
  curTag = `migration ${H}`;
  // 1) on fabrique une partie dans l'ancien format (sans commandes enrichies, sans fun)
  const a = await open(H, baseSave(), curTag);
  const ta = mk(a.page, curTag, H);
  await ta.closeModals();
  await ta.startEndless();
  for (let k = 0; k < 8; k++) { await ta.clickCell((await ta.st()).cells.find((c) => c.c === 'gen').i); await ta.sleep(350); }
  await ta.idle();
  const raw = await a.page.evaluate(() => JSON.parse(localStorage.getItem('radia-save-v1')));
  await a.ctx.close();
  const v4 = JSON.parse(JSON.stringify(raw));
  v4.v = 4;
  delete v4.fun;
  v4.discovered = ['flowers:1', 'flowers:2', 'flowers:3', 'love:1', 'love:2', 'paris:1', 'chess:1', 'special:1'];
  v4.endless.best = 321; v4.endless.runs = 4;
  const run = v4.endless.run;
  run.orders = run.orders.map((o) => (o ? { items: o.items, id: o.id } : null));
  for (const k of ['clock', 'activeMs', 'comboWin', 'lastDropMerge']) delete run[k];
  v4.endless.run.ordersDone = 7;
  const cellsBefore = run.cells.filter((c) => c.item).length;
  const b = await open(H, v4, curTag);
  const tb = mk(b.page, curTag, H);
  await tb.closeModals();
  const migrated = await b.page.evaluate(() => ({ v: window.RADIA.save.data.v, fun: !!window.RADIA.save.data.fun, best: window.RADIA.save.data.endless.best }));
  check('migration v4 → v5 : version, fun créé, record conservé', migrated.v === 5 && migrated.fun && migrated.best === 321);
  await tb.startEndless();
  const s = await tb.st();
  await tb.shot('m1-migrated');
  check('ancienne partie reprise : plateau conservé', s.cells.length >= cellsBefore, `${cellsBefore}→${s.cells.length}`);
  check('3 commandes enrichies (palier + récompense annoncée)', s.orders.length === 3 && s.orders.every((o) => o && o.tier && o.reward && o.reward.coins > 0));
  check('album ancien importé sans récompense (silhouettes pour le reste)', s.album >= 6, `${s.album} objets`);
  const cards = await b.page.locator('.en-card').count();
  check('interface Endless 2.0 affichée sur l\'ancienne partie', cards === 3);
  // une action fonctionne
  await tb.clickCell(s.cells.find((c) => c.c === 'gen').i);
  await tb.sleep(700);
  check('jouable après migration', (await tb.st()).taps > s.taps);
  await b.ctx.close();
}

/** Mode histoire : niveau 1 jouable, sauvegarde `run` intacte, aucune donnée Endless touchée. */
async function runStory() {
  curTag = 'histoire';
  const { ctx, page } = await open(852, { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6'], world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 } } }, curTag);
  const sleep = (ms) => page.waitForTimeout(ms);
  await page.getByText('MODE CHAPITRES').first().click();
  await sleep(900);
  for (let i = 0; i < 40 && !(await page.getByText("C'est parti").count()); i++) { await page.mouse.click(200, 760); await sleep(280); }
  if (await page.getByText("C'est parti").count()) await page.getByText("C'est parti").first().click();
  await sleep(1800);
  const hud = await page.evaluate(() => ({ merge: !!document.querySelector('.merge-hud'), endless: !!document.querySelector('.merge-hud.endless'), cards: document.querySelectorAll('.en-card').length, orders: document.querySelectorAll('.mh-orders .order').length, objs: document.querySelectorAll('.mh-objs .obj-chip').length }));
  check('niveau 1 : HUD de l\'histoire (objectifs + commandes classiques)', hud.merge && !hud.endless && hud.cards === 0 && hud.objs >= 1);
  for (let i = 0; i < 12; i++) { await page.evaluate(() => window.RADIA.game().scene.getScene('merge').debugBotStep()); await sleep(260); }
  await sleep(700);
  await page.screenshot({ path: 'shots/b2-story-level1.png' });
  const d = await page.evaluate(() => { const s = window.RADIA.save.data; return { run: (!!s.run && s.run.mode === 'story') || !!s.levels[1]?.done, endlessRun: s.endless.run, counters: s.fun.endless2.counters, album: s.fun.endless2.album.length, merges: s.run?.score ?? 0 }; });
  check('niveau 1 : progression de l\'histoire enregistrée (run ou niveau réussi), aucune partie Endless créée', d.run && d.endlessRun === null);
  check('niveau 1 : aucun compteur Endless 2.0 touché (histoire intacte)', Object.keys(d.counters).length === 0 && d.album === 0, JSON.stringify(d.counters));
  await ctx.close();
}

try {
  const only = process.env.ONLY;
  if (!only || only === 'play') for (const H of (process.env.H ? [Number(process.env.H)] : [852, 660])) await runEndless(H);
  if (!only || only === 'migration') await runMigration(852);
  if (!only || only === 'story') await runStory();
} catch (e) {
  errors.push(`script: ${e.stack ?? e}`);
}
await browser.close();
for (const r of results) console.log(r.line);
const ko = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - ko}/${results.length} vérifications OK`);
console.log('erreurs console/page :', errors.length ? `\n  ${errors.join('\n  ')}` : 'aucune');
process.exit(ko || errors.length ? 1 : 0);
