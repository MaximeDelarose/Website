// « Personnaliser Radia » (visage canonique) : maquillage léger + voile seulement ; la tête ne change jamais. Aperçu en direct, annuler / appliquer, maquillages enregistrés, persistance. Chromium ÉMULÉ. PORT=4190 node scripts/face-studio-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} [${tag}] ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0');
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 5, world: { flags: { 'rw:start-gift-v1': true }, res: { coins: 900 } }, fun: { daily: { cycle: 0, day: 1, lastKey: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
async function run(H) {
  tag = `393×${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  const sleep = (ms) => page.waitForTimeout(ms);
  await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
  await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' }); await sleep(2500);
  const closeModals = async () => { for (let i = 0; i < 6; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await sleep(400); } else break; } };
  await closeModals();
  const face = () => page.evaluate(() => window.RADIA.save.data.world.wardrobe.face);
  const previewUrl = () => page.locator('.fs-preview canvas').evaluate((c) => c.toDataURL());
  const confirmBtn = (t) => page.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: t });

  await page.getByText('MON MONDE').first().click(); await sleep(1500); await closeModals();
  const card = page.locator('.hub-card', { hasText: 'Personnaliser Radia' });
  check('MON MONDE : carte « Personnaliser Radia »', (await card.count()) === 1);
  const cardArt0 = await card.locator('canvas').first().evaluate((c) => c.toDataURL());
  await card.click(); await sleep(1500);
  check('l\'écran s\'ouvre avec un aperçu dessiné', (await page.locator('.fs-preview canvas').count()) === 1 && (await page.locator('.fs-screen').count()) === 1);
  const labels = await page.locator('.fs-tab').allInnerTexts();
  check('3 sections seulement : Maquillage, Voile, Mes maquillages', labels.length === 3 && ['Maquillage', 'Voile', 'Mes maquillages'].every((l) => labels.includes(l)), labels.join(','));
  check('plus aucune option qui change le visage : pas de Peau / Visage / Yeux / Sourcils / Nez / Bouche / Lèvres / Cheveux', (await page.locator('.fs-tab', { hasText: /^(Peau|Visage|Yeux|Sourcils|Nez|Bouche|Lèvres|Cheveux)$/ }).count()) === 0 && (await page.locator('.fs-panel').innerText()).search(/Forme du visage|Forme des yeux|Forme de la bouche|Teinte de peau/) === -1);
  check('actions Annuler / Origine / Appliquer visibles dans l\'écran', await page.locator('.fs-actions').evaluate((e) => { const r = e.getBoundingClientRect(); return r.bottom <= window.innerHeight + 0.5 && r.left >= 0 && r.right <= 393.5; }));
  check('pas de défilement horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= 394));
  check('onglets et boutons ≥ 40 px', await page.locator('.fs-tab, .fs-actions .btn, .fs-chip').evaluateAll((els) => els.every((e) => e.getBoundingClientRect().height >= 39.5)));
  const p0 = await previewUrl();
  const base = await face();
  // maquillage : fard, blush, rouge à lèvres, eye-liner appuyé
  await page.locator('.fs-swatch[aria-label="Fard à paupières #C9A0D8"]').click(); await sleep(400);
  const p1 = await previewUrl();
  check('fard : l\'aperçu change en direct', p1 !== p0);
  check('rien n\'est enregistré avant « Appliquer »', (await face()).makeup.shadow === '');
  await page.locator('.fs-slider input').first().fill('70'); await page.locator('.fs-slider input').first().dispatchEvent('input'); await sleep(400);
  check('blush (curseur) : aperçu à jour', (await previewUrl()) !== p1);
  await page.locator('.fs-swatch[aria-label="Couleur du rouge à lèvres #A8404E"]').click(); await sleep(300);
  await page.locator('.fs-chip', { hasText: 'Appuyé' }).click(); await sleep(300);
  check('eye-liner « Appuyé » sélectionné', (await page.locator('.fs-panel .fs-chip.on').first().innerText()) === 'Appuyé');
  // voile
  const pMk = await previewUrl();
  await page.locator('.fs-tab', { hasText: 'Voile' }).click(); await page.locator('.fs-chip', { hasText: 'Élégant' }).click(); await sleep(300);
  check('voile : l\'aperçu montre le voile (remplace les cheveux)', (await previewUrl()) !== pMk);
  await page.screenshot({ path: `shots/face-studio-393x${H}.png` });
  await page.locator('.fs-tab', { hasText: /^Maquillage$/ }).click(); await sleep(200);
  // aperçu corps entier
  await page.locator('.fs-view .fs-chip', { hasText: 'Corps entier' }).click(); await sleep(500);
  check('aperçu « corps entier »', (await page.locator('.fs-preview canvas').count()) === 1);
  await page.locator('.fs-view .fs-chip', { hasText: /^Visage$/ }).click(); await sleep(300);
  // enregistrer un maquillage
  await page.locator('.fs-tab', { hasText: /^Mes maquillages$/ }).click(); await sleep(300);
  await page.locator('.fs-slot').first().locator('button', { hasText: 'Enregistrer' }).click(); await sleep(500);
  const saved = await page.evaluate(() => window.RADIA.save.data.world.wardrobe.faces[0]);
  check('« Mes maquillages » : le maquillage est enregistré dans un emplacement', !!saved && saved.face.makeup.shadow === '#C9A0D8' && saved.face.veil.style === 'elegant');
  // annuler : rien ne change
  await page.locator('.fs-actions .btn', { hasText: 'Annuler' }).click(); await sleep(500);
  check('Annuler avec des changements : demande de confirmation', (await confirmBtn('Quitter').count()) === 1);
  await confirmBtn('Quitter').click(); await sleep(900); await closeModals();
  const f1 = await face();
  check('Annuler : le visage enregistré est exactement l\'ancien (rien appliqué)', f1.makeup.shadow === '' && f1.veil.style === 'none' && f1.mouth.lip === base.mouth.lip);
  check('retour à MON MONDE', (await page.locator('.fs-screen').count()) === 0 && (await page.locator('.hub-screen').count()) === 1);
  check('carte du hub : dessin inchangé après annulation', (await card.locator('canvas').first().evaluate((c) => c.toDataURL())) === cardArt0);
  // réouvrir : charger le maquillage enregistré puis appliquer
  await card.click(); await sleep(1200);
  await page.locator('.fs-tab', { hasText: /^Mes maquillages$/ }).click(); await page.locator('.fs-slot').first().locator('button', { hasText: 'Charger' }).click(); await sleep(500);
  check('charger un maquillage enregistré met à jour l\'aperçu', (await previewUrl()) !== p0);
  await page.locator('.fs-actions .btn', { hasText: 'Appliquer' }).click(); await sleep(1200); await closeModals();
  const f2 = await face();
  check('Appliquer : maquillage et voile enregistrés dans la sauvegarde', f2.makeup.shadow === '#C9A0D8' && f2.makeup.liner === 'bold' && f2.mouth.lip === '#A8404E' && f2.veil.style === 'elegant');
  check('la structure du visage reste celle de la tête canonique (peau, forme, yeux, bouche, sourcils, nez, cheveux)', ['skin', 'shape', 'eyes', 'brows', 'nose', 'hairColor', 'hairVolume', 'refined'].every((k) => JSON.stringify(f2[k]) === JSON.stringify(base[k])) && f2.mouth.shape === base.mouth.shape && f2.mouth.fullness === base.mouth.fullness);
  check('carte du hub : le dessin de Radia a changé (maquillage + voile)', (await card.locator('canvas').first().evaluate((c) => c.toDataURL())) !== cardArt0);
  // persistance après rechargement
  await page.evaluate(() => window.RADIA.save.writeNow()); await page.reload({ waitUntil: 'networkidle' }); await sleep(2500); await closeModals();
  const f3 = await face();
  check('après rechargement : maquillage conservé', f3.makeup.shadow === '#C9A0D8' && f3.veil.style === 'elegant' && f3.mouth.lip === '#A8404E');
  await page.getByText('MON MONDE').first().click(); await sleep(1500); await closeModals();
  check('après rechargement : le dessin du hub reflète le maquillage', (await page.locator('.hub-card', { hasText: 'Personnaliser Radia' }).locator('canvas').first().evaluate((c) => c.toDataURL())) !== cardArt0);
  // Origine
  await page.locator('.hub-card', { hasText: 'Personnaliser Radia' }).click(); await sleep(1200);
  await page.locator('.fs-actions .btn', { hasText: 'Origine' }).click(); await sleep(400); await confirmBtn('Réinitialiser').click(); await sleep(500);
  check('« Origine » : le brouillon revient au maquillage d\'origine (sans rien appliquer)', (await face()).makeup.shadow === '#C9A0D8' && (await previewUrl()) === p0);
  await page.locator('.fs-actions .btn', { hasText: 'Appliquer' }).click(); await sleep(900); await closeModals();
  const f4 = await face();
  check('appliquer le maquillage d\'origine : retour exact au visage de base', JSON.stringify(f4) === JSON.stringify(base));
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
