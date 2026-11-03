// Parcours Playwright du château (iPhone 393×852). Usage : node dev/castle-e2e.mjs <port> <dossier-captures>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [port = '5181', out = '/tmp/castle-shots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
await page.addInitScript(() => {
  if (!localStorage.getItem('__seeded')) {
    localStorage.setItem('__seeded', '1');
    localStorage.setItem('radia-save-v1', JSON.stringify({ v: 3, world: { res: { coins: 6000, flowers: 30, fabric: 0, cocoa: 0 }, magazines: ['radia-mag'] } }));
  }
});
const results = [];
const T0 = Date.now();
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'OK  ' : 'FAIL'} [${Math.round((Date.now() - T0) / 1000)}s] ${name} ${extra}`); };
const W = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__save.data.world)));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const wait = (ms) => page.waitForTimeout(ms);
// le toucher « tap » du jeu ignore les clics répétés : on laisse un délai
const click = async (sel, nth = 0) => { await page.locator(sel).nth(nth).click(); await wait(420); };

page.setDefaultTimeout(8000);
process.on('unhandledRejection', async (e) => { console.log('ERREUR', String(e.message).split('\n')[0]); await page.screenshot({ path: `${out}/ERR.png` }).catch(() => {}); process.exit(2); });
await page.goto(`http://localhost:${port}/dev/castle-ui.html`);
await page.waitForSelector('.cs-map-canvas');
await wait(900);
await shot('01-carte');
let w0 = await W();
check('carte : 3 pièces débloquées', w0.castle.unlocked.length === 3, w0.castle.unlocked.join());
check('carte : 9 fenêtres', (await page.locator('.cs-hot').count()) === 9);
check('carte : 6 cadenas', (await page.locator('.cs-hot.locked').count()) === 6);

// ---- déblocage dressing (200)
await page.locator('.cs-hot').nth(2).click(); // dressing
await page.waitForSelector('.modal');
await wait(300);
await shot('02-deblocage');
await page.locator('.modal .btn', { hasText: 'Débloquer' }).click();
await wait(700);
let w = await W();
check('déblocage dressing : -200 pièces + pièce ouverte', w.castle.unlocked.includes('dressing') && w.res.coins === w0.res.coins - 200, `coins=${w.res.coins}`);
await shot('03-apres-deblocage');

// ---- entrer dans la chambre
await page.locator('.cs-hot').nth(0).click();
await page.waitForSelector('.cs-canvas');
await wait(900);
await shot('04-chambre-vide');

// ---- boutique + achats
await click('.cs-tool >> text=Boutique');
await page.waitForSelector('.cs-sheet');
await wait(400);
await shot('05-boutique');
const buy = async (name) => {
  // cherche l'onglet de la catégorie contenant le meuble
  const card = page.locator('.cs-card', { hasText: name }).first();
  if (!(await card.count())) {
    const tabs = page.locator('.cs-tab');
    for (let i = 0; i < (await tabs.count()); i++) { await tabs.nth(i).click(); await wait(250); if (await page.locator('.cs-card', { hasText: name }).count()) break; }
  }
  await page.locator('.cs-card', { hasText: name }).first().locator('.btn').first().click();
  await wait(700);
};
const before = await W();
await buy('Lit royal');
w = await W();
check('achat : lit royal débité et posé', w.res.coins === before.res.coins - 480 && w.castle.owned['bed-royal'] === 1 && w.castle.rooms.bedroom.items.some((i) => i.id === 'bed-royal'), `coins=${w.res.coins}`);
await shot('06-apres-achat');
for (const n of ['Table de chevet', 'Tapis rond', 'Lampadaire', 'Plante en pot', 'Coiffeuse']) await buy(n);
w = await W();
check('6 meubles posés dans la chambre', w.castle.rooms.bedroom.items.length === 6, String(w.castle.rooms.bedroom.items.length));
await page.locator('.cs-tab', { hasText: 'Couchage' }).click().catch(() => {});
await wait(300);
await shot('07-boutique-meubles');
await click('.cs-sheet-head .icon-btn');
await wait(500);
await shot('08-chambre-meublee');

// ---- sélection + déplacement par glisser
const geom = async () => page.evaluate(() => {
  const cv = document.querySelector('.cs-canvas'); const r = cv.getBoundingClientRect();
  const L = window.__layout('bedroom', Math.round(r.width), Math.round(r.height));
  return { left: r.left, top: r.top, ...L };
});
let g = await geom();
const itemPx = (it, size) => ({ x: g.left + g.grid.x + (it.x + size[0] / 2) * g.cell, y: g.top + g.grid.y + (it.y + size[1] / 2) * g.cell });
const nightstand = w.castle.rooms.bedroom.items.find((i) => i.id === 'nightstand');
let p = itemPx(nightstand, [1, 1]);
await page.mouse.click(p.x, p.y);
await wait(400);
check('toucher = sélection (barre d\'actions)', (await page.locator('.cs-sel-btns .cs-tool').count()) === 5);
await shot('09-selection');
// glisser vers une case libre (en bas à droite)
g = await geom();
const target = { x: g.left + g.grid.x + 7.5 * g.cell, y: g.top + g.grid.y + 5.5 * g.cell };
await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 20, p.y + 20, { steps: 4 }); await page.mouse.move(target.x, target.y, { steps: 10 });
await wait(150);
await shot('10-glisser-apercu-vert');
await page.mouse.up(); await wait(500);
w = await W();
const ns2 = w.castle.rooms.bedroom.items.find((i) => i.uid === nightstand.uid);
check('glisser-déposer : table de chevet déplacée', ns2.x === 7 && ns2.y === 5, `(${ns2.x},${ns2.y})`);
// glisser relâché hors de la grille => annulé
p = itemPx(ns2, [1, 1]);
await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x - 30, p.y - 30, { steps: 4 }); await page.mouse.move(g.left + 20, g.top + 8, { steps: 6 });
await page.mouse.up(); await wait(400);
w = await W();
const ns3 = w.castle.rooms.bedroom.items.find((i) => i.uid === nightstand.uid);
check('relâché hors de la grille : annulé', ns3.x === 7 && ns3.y === 5, `(${ns3.x},${ns3.y})`);
// glisser sur une case occupée => refusé
const bed = w.castle.rooms.bedroom.items.find((i) => i.id === 'bed-royal');
const bp = itemPx(bed, [3, 2]);
await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x - 10, p.y - 10, { steps: 3 }); await page.mouse.move(bp.x, bp.y, { steps: 8 });
await wait(120);
await shot('11-glisser-apercu-rouge');
await page.mouse.up(); await wait(400);
w = await W();
const ns4 = w.castle.rooms.bedroom.items.find((i) => i.uid === nightstand.uid);
check('collision : déplacement refusé', ns4.x === 7 && ns4.y === 5);

// ---- déplacer via bouton « Déplacer » (poser d'un toucher)
await page.mouse.click(p.x, p.y); await wait(300);
await page.locator('.cs-sel-btns .cs-tool', { hasText: 'Déplacer' }).click(); await wait(400);
const t2 = { x: g.left + g.grid.x + 6.5 * g.cell, y: g.top + g.grid.y + 5.5 * g.cell };
await page.mouse.click(t2.x, t2.y); await wait(250);
await shot('12-deplacer-bouton');
await page.locator('.cs-sel .btn', { hasText: 'Poser ici' }).click(); await wait(500);
w = await W();
const ns5 = w.castle.rooms.bedroom.items.find((i) => i.uid === nightstand.uid);
check('bouton Déplacer + Poser ici', ns5.x === 6 && ns5.y === 5, `(${ns5.x},${ns5.y})`);

// ---- retourner
await page.mouse.click(itemPx(ns5, [1, 1]).x, itemPx(ns5, [1, 1]).y); await wait(300);
await page.locator('.cs-sel-btns .cs-tool', { hasText: 'Retourner' }).click(); await wait(400);
w = await W();
check('retourner : flip', w.castle.rooms.bedroom.items.find((i) => i.uid === nightstand.uid).flip === true);

// ---- couleur de meuble (aperçu immédiat, annuler / valider)
await page.locator('.cs-sel-btns .cs-tool', { hasText: 'Couleur' }).click(); await wait(500);
await page.locator('.cs-sw').nth(4).click(); await wait(500);
w = await W();
check('aperçu couleur meuble : pas encore sauvegardé', w.castle.rooms.bedroom.items.find((i) => i.uid === nightstand.uid).color === 'beige');
await shot('13-couleur-meuble-apercu');
await page.locator('.cs-sheet-foot .btn', { hasText: 'Annuler' }).click(); await wait(400);
w = await W();
check('couleur annulée : rien changé', w.castle.rooms.bedroom.items.find((i) => i.uid === nightstand.uid).color === 'beige');
await page.locator('.cs-tool', { hasText: 'Couleurs' }).click(); await wait(500);
await page.locator('.cs-seg button', { hasText: 'Meuble' }).click(); await wait(300);
await page.locator('.cs-sw').nth(4).click(); await wait(300);
await page.locator('.cs-sheet-foot .btn', { hasText: 'Valider' }).click(); await wait(500);
w = await W();
check('couleur meuble validée', w.castle.rooms.bedroom.items.find((i) => i.uid === nightstand.uid).color === 'sage', w.castle.rooms.bedroom.items.find((i) => i.uid === nightstand.uid).color);

// ---- toucher le mur => palette ; aperçu ; valider
await page.mouse.click(g.left + 30, g.top + 120); await wait(600);
check('toucher un mur ouvre la palette', (await page.locator('.cs-sheet.color').count()) === 1);
await page.locator('.cs-sw').nth(10).click(); await wait(200);
await shot('14-couleur-mur-transition');
await wait(600);
await shot('15-couleur-mur-apercu');
w = await W();
check('aperçu mur : pas encore sauvegardé', w.castle.rooms.bedroom.wall === 'rose');
// choisir aussi le sol, puis valider
await page.locator('.cs-seg button').nth(1).click(); await wait(250);
await page.locator('.cs-sw').nth(2).click(); await wait(300);
await page.locator('.cs-sheet-foot .btn', { hasText: 'Valider' }).click(); await wait(600);
w = await W();
check('mur + sol recolorés', w.castle.rooms.bedroom.wall === 'violet' && w.castle.rooms.bedroom.floor === 'brown', `${w.castle.rooms.bedroom.wall}/${w.castle.rooms.bedroom.floor}`);
await shot('16-apres-couleur');

// ---- ranger + annuler
const lamp = w.castle.rooms.bedroom.items.find((i) => i.id === 'lamp-floor');
const lp = itemPx(lamp, [1, 2]);
await page.mouse.click(lp.x, lp.y); await wait(350);
await page.locator('.cs-sel-btns .cs-tool', { hasText: 'Ranger' }).click(); await wait(500);
w = await W();
check('ranger : retourne en réserve, jamais perdu', !w.castle.rooms.bedroom.items.some((i) => i.id === 'lamp-floor') && w.castle.owned['lamp-floor'] === 1);
await page.locator('.cs-tool', { hasText: 'Annuler' }).first().click(); await wait(500);
w = await W();
check('annuler : le lampadaire revient', w.castle.rooms.bedroom.items.some((i) => i.id === 'lamp-floor'));
await shot('17-apres-annuler');

// ---- remplacer
await page.mouse.click(lp.x, lp.y); await wait(350);
await page.locator('.cs-sel-btns .cs-tool', { hasText: 'Remplacer' }).click(); await wait(500);
await shot('18-remplacer');
await page.locator('.cs-card', { hasText: 'Lampe de table' }).first().locator('.btn').first().click().catch(async () => { await page.locator('.cs-tab', { hasText: 'Éclairage' }).click(); await wait(300); await page.locator('.cs-card', { hasText: 'Lampe de table' }).first().locator('.btn').first().click(); });
await wait(700);
w = await W();
check('remplacer : lampadaire → lampe de table, ancien en réserve', w.castle.rooms.bedroom.items.some((i) => i.id === 'lamp-table') && !w.castle.rooms.bedroom.items.some((i) => i.id === 'lamp-floor') && w.castle.owned['lamp-floor'] === 1);

// ---- rechargement : la sauvegarde conserve tout
await page.evaluate(() => window.__save.save()); await wait(200);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('radia-save-v1')).world.castle);
check('sauvegarde localStorage à jour', stored.rooms.bedroom.items.length >= 6 && stored.rooms.bedroom.wall === 'violet');

// ---- retour à la carte, réception
await click('.screen-head .icon-btn');
await page.waitForSelector('.cs-map-canvas'); await wait(500);
await page.locator('.cs-hot').nth(3).click(); await page.waitForSelector('.modal'); await wait(300);
await page.locator('.modal .btn', { hasText: 'Débloquer' }).click(); await wait(600);
await page.locator('.cs-hot').nth(3).click(); await page.waitForSelector('.cs-canvas'); await wait(800);
check('salle de réception : barre « Organiser une soirée »', (await page.locator('.cs-event').count()) === 1);
await page.locator('.cs-event').click(); await wait(500);
check('soirée refusée sans 3 meubles', (await page.locator('.modal').count()) === 0);
await shot('19-reception-vide');
await click('.cs-tool >> text=Boutique');
for (const n of ['Tapis de gala', 'Vase de fleurs', 'Bougies']) await buy(n);
await click('.cs-sheet-head .icon-btn'); await wait(500);
await shot('20-reception-meublee');
const fans0 = (await W()).fans;
await page.locator('.cs-event').click(); await page.waitForSelector('.modal'); await wait(300);
await shot('21-soiree-confirmation');
await page.locator('.modal .btn', { hasText: 'Organiser' }).click(); await wait(900);
await shot('22-soiree-resultat');
await page.locator('.modal .btn', { hasText: 'Merci' }).click(); await wait(500);
w = await W();
check('soirée : fans + flag de recharge', w.fans > fans0 && w.extra['castle.eventAt'] > 0, `fans=${w.fans}`);
await page.locator('.cs-event').click(); await wait(400);
check('soirée : temps de recharge actif', (await page.locator('.modal').count()) === 0 && /Prochaine soirée/.test(await page.locator('.cs-event small').innerText()));

// ---- chambres d'enfants : déblocage + scène finale
await click('.screen-head .icon-btn');
await page.waitForSelector('.cs-map-canvas'); await wait(500);
const kidIdx = { kid1: 6, kid2: 7, kid3: 8 };
for (const k of ['kid1', 'kid2', 'kid3']) {
  await page.locator('.cs-hot').nth(kidIdx[k]).click(); await page.waitForSelector('.modal'); await wait(300);
  await page.locator('.modal .btn', { hasText: 'Débloquer' }).click(); await wait(600);
  await page.locator('.cs-hot').nth(kidIdx[k]).click(); await page.waitForSelector('.cs-canvas'); await wait(700);
  await click('.cs-tool >> text=Boutique');
  await page.locator('.cs-tab', { hasText: 'Enfants' }).click(); await wait(250);
  for (const n of ['Peluches', 'Cubes de jeu', 'Chevalet']) { await page.locator('.cs-card', { hasText: n }).first().locator('.btn').first().click(); await wait(650); }
  if (k === 'kid1') await shot('23-chambre-enfant-boutique');
  if (k === 'kid3') break; // la scène finale se déclenche dès le 3e meuble de la dernière chambre
  await click('.cs-sheet-head .icon-btn'); await wait(400);
  if (k === 'kid1') await shot('24-chambre-enfant');
  { await click('.screen-head .icon-btn'); await page.waitForSelector('.cs-map-canvas'); await wait(500); }
}
await wait(900);
check('scène finale affichée (texte exact)', (await page.locator('.cs-finale-card p').innerText().catch(() => '')) === 'Chaque pièce de ce château a sa couleur. Mais ce sont les personnes qui y vivent qui lui donnent toute sa beauté.');
await shot('25-scene-finale');
w = await W();
check('flag scene.castle posé', w.flags['scene.castle'] === true);
await page.locator('.cs-finale-card .btn').click(); await wait(800);
await shot('26-apres-finale');

// invariants globaux
const fin = await W();
let okInv = true;
for (const [id, n] of Object.entries(fin.castle.owned)) {
  let placed = 0; for (const r of Object.values(fin.castle.rooms)) placed += r.items.filter((i) => i.id === id).length;
  if (placed > n) okInv = false;
}
check('invariant : placés ≤ possédés', okInv);
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
// retour direct pièce
await page.goto(`http://localhost:${port}/dev/castle-ui.html?room=bedroom`);
await page.waitForSelector('.cs-canvas'); await wait(800);
check('openCastle(room) ouvre directement la pièce (sauvegarde rechargée)', (await page.locator('.cs-canvas').count()) === 1 && (await W()).castle.rooms.bedroom.items.length >= 6);
await shot('27-pièce-directe-rechargée');
await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} vérifications réussies`);
process.exit(bad.length ? 1 : 0);
