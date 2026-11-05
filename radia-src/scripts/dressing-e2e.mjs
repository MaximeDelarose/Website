// Le dressing (refonte dr2-) : parcours réel par clics / glissés, Chromium ÉMULÉ iPhone (PAS un vrai iPhone ni un vrai Safari).
// Prérequis : npx vite build --outDir /tmp/claude-0/t && npx vite preview --outDir /tmp/claude-0/t --port 4201
// Lancer : PORT=4201 node scripts/dressing-e2e.mjs        (393×852, 393×660 et 393×600 ; H=660,600 pour choisir ; SAB=34 simule la zone sûre basse de l'iPhone)
// Captures : shots/t-<hauteur>-*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { evaluate } from './overlay-lib.mjs';

const PORT = process.env.PORT ?? '4201';
const SAB = process.env.SAB ?? '';
const HEIGHTS = (process.env.H ? process.env.H.split(',') : ['852', '660', '600']).map(Number);
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = () => ({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 500, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } });

let fails = 0;
const out = [];
const check = (n, ok, x = '') => { if (!ok) fails++; const l = `${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`; out.push(l); console.log(l); };

async function run(H) {
  const T = `t-${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('page: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
  const wait = (ms) => p.waitForTimeout(ms);
  const S = () => p.evaluate(() => JSON.parse(JSON.stringify(window.RADIA.save.data)));
  const sh = (n) => p.screenshot({ path: `shots/${T}-${n}.png` });
  const tag = (s) => `[${H}] ${s}`;
  await p.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed()));
  await p.goto(`http://localhost:${PORT}/?debug`);
  await wait(5000);
  // ferme tout ce qui peut s'afficher au démarrage (Nouveautés, cadeau du jour, bonus de départ à toucher puis « Passer »…)
  const clean = async (n = 30) => { let calm = 0; for (let i = 0; i < n && calm < 5; i++) { await wait(450); const busy = await p.evaluate(() => { document.querySelectorAll('.dy-back').forEach((e) => e.remove()); let b = false; const bs = document.querySelectorAll('.modal-backdrop:not(.leaving) .actions button'); if (bs.length) { bs[bs.length - 1].click(); b = true; } const ov = document.querySelector('#reward-overlay'); if (ov && ov.children.length) { b = true; for (const sel of ['.rw-art', '.rw-skip', '.rw-primary']) { const e = ov.querySelector(sel); if (e && e.getBoundingClientRect().width) e.click(); } } return b; }); calm = busy ? 0 : calm + 1; } };
  await clean();
  if (SAB) await p.evaluate((v) => document.documentElement.style.setProperty('--sab', v + 'px'), SAB);
  // monnaies, pièces possédées
  await p.evaluate(() => { const d = window.RADIA.save.data; d.world.res.coins = 5000; d.world.res.fabric = 200; d.economy.diamonds = 300; for (const id of ['top-tee-pink', 'sh-heels', 'ac-pearls']) if (!d.world.wardrobe.owned.includes(id)) d.world.wardrobe.owned.push(id); window.RADIA.save.save?.(); });

  for (let k = 0; k < 4; k++) { try { await p.getByText('MON MONDE').first().click({ timeout: 6000 }); break; } catch { await clean(12); } } // le bonus de départ peut arriver en retard
  await wait(1500);
  await p.locator('.hub-card', { hasText: 'Dressing' }).first().click(); await wait(1900);
  check(tag('le dressing s\'ouvre'), (await p.locator('.dr2-screen').count()) === 1);
  await sh('1-open');
  // le tutoriel s'efface au toucher : on le ferme comme une joueuse
  if (await p.locator('.dr-tip button').count()) { await p.locator('.dr-tip button').click(); await wait(400); }

  const geo = () => p.evaluate(() => {
    const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const grid = document.querySelector('.dr2-grid');
    const g = R(grid);
    const cards = [...grid.querySelectorAll('.dr2-card')].map((c) => R(c));
    const tops = [...new Set(cards.map((c) => Math.round(c.t)))];
    const full = tops.filter((t) => { const cs = cards.filter((c) => Math.round(c.t) === t); return cs.every((c) => c.t >= g.t - 1 && c.b <= g.b + 1); }).length;
    const part = tops.filter((t) => { const cs = cards.filter((c) => Math.round(c.t) === t); return cs.some((c) => c.t < g.b && c.b > g.t) ; });
    const frac = part.reduce((a, t) => { const c = cards.find((x) => Math.round(x.t) === t); return a + (Math.min(c.b, g.b) - Math.max(c.t, g.t)) / c.h; }, 0);
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    return { grid: g, bar: R(document.querySelector('.dr2-bar')), panel: R(document.querySelector('.dr2-panel')), av: R(document.querySelector('.dr2-avatar')), head: R(document.querySelector('.dr2-head')), full, frac: Math.round(frac * 100) / 100, cols, n: cards.length, vh: innerHeight, vw: innerWidth, snap: document.querySelector('.dr2-screen').dataset.snap, side: document.querySelector('.dr2-screen').dataset.side, scrollY: scrollY, docScroll: document.scrollingElement.scrollTop, hw: document.documentElement.scrollWidth };
  });
  const canvasSig = () => p.evaluate(() => { const c = document.querySelector('.dr2-avatar'); const d = c.getContext('2d').getImageData(0, Math.floor(c.height * 0.45), c.width, c.height - Math.floor(c.height * 0.45)).data; let a = 0, b = 0; for (let i = 0; i < d.length; i += 4 * 7) { a = (a * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7 + d[i + 3]) | 0; b = (b + d[i + 3]) | 0; } return `${a}:${b}`; });

  // ---- 1. mise en page de départ
  let g = await geo();
  check(tag('Radia visible (≥ 150 px de haut, dans l\'écran, au-dessus du panneau)'), g.av.h >= 150 && g.av.t >= 0 && g.av.b <= g.panel.t + 14, `avatar ${Math.round(g.av.h)} px, panneau dès ${Math.round(g.panel.t)}`);
  check(tag(`galerie : ${g.cols} colonnes`), g.cols === 3);
  const wantFull = H >= 800 ? 2 : 0;
  check(tag(`rangées complètes visibles : ${g.full} (+ ${g.frac} au total partiel)`), H >= 800 ? g.full >= 2 : g.frac >= 1.5, `full=${g.full} frac=${g.frac}`);
  void wantFull;
  check(tag('barre d\'action sous la galerie, dans l\'écran (rien n\'est recouvert)'), g.grid.b <= g.bar.t + 1 && g.bar.b <= g.vh + 1 && g.panel.b <= g.vh + 1, `grille→${Math.round(g.grid.b)} barre ${Math.round(g.bar.t)}→${Math.round(g.bar.b)} / ${g.vh}`);
  check(tag('pas de défilement de la page'), g.hw <= g.vw && g.scrollY === 0 && g.docScroll === 0);
  const txt = await p.locator('.dr2-screen').innerText();
  check(tag('aucun filtre « Casual » dans l\'interface principale'), !/casual/i.test(txt) && !/Décontracté/.test(txt));
  check(tag('titre « Mon dressing ♡ » et monnaies compactes dans l\'en-tête'), /Mon dressing/.test(txt) && (await p.locator('.dr2-bal .dr2-chip').count()) === 3 && (await p.evaluate(() => { const r = document.querySelector('.dr2-bal').getBoundingClientRect(); return r.height < 30 && r.right <= innerWidth; })));

  // ---- 2. défilement interne
  const headTop = g.head.t;
  await p.locator('.dr-group', { hasText: 'Tenues' }).click(); await wait(300);
  await p.locator('.dr-tab', { hasText: 'Hauts' }).click(); await wait(300);
  const sc0 = await p.evaluate(() => { const gr = document.querySelector('.dr2-grid'); return { sh: gr.scrollHeight, ch: gr.clientHeight, ob: getComputedStyle(gr).overscrollBehaviorY }; });
  check(tag('la galerie défile seule (contenu plus haut que la zone, overscroll contenu)'), sc0.sh > sc0.ch + 20 && sc0.ob === 'contain', JSON.stringify(sc0));
  const gb = await p.locator('.dr2-grid').boundingBox();
  await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  for (let k = 0; k < 3 && (await p.evaluate(() => document.querySelector('.dr2-grid').scrollTop)) < 50; k++) { await p.mouse.wheel(0, 180); await wait(900); } // la molette émulée est parfois perdue sous charge
  const st1 = await p.evaluate(() => ({ g: document.querySelector('.dr2-grid').scrollTop, y: scrollY, d: document.scrollingElement.scrollTop, head: document.querySelector('.dr2-head').getBoundingClientRect().top }));
  check(tag('molette : la galerie défile, pas la page, l\'en-tête du panneau ne bouge pas'), st1.g > 50 && st1.y === 0 && st1.d === 0 && Math.abs(st1.head - headTop) < 2, JSON.stringify(st1));
  await sh('2-defile');
  const a1 = await geo();
  check(tag('après défilement : rien n\'est coupé sous la barre'), a1.grid.b <= a1.bar.t + 1 && a1.bar.b <= a1.vh + 1);
  await p.evaluate(() => { document.querySelector('.dr2-grid').scrollTop = 0; });

  // ---- 3. catégories
  await p.locator('.dr-group', { hasText: 'Sacs & souliers' }).click(); await wait(350);
  check(tag('catégorie « Sacs & souliers » : rayons Chaussures / Sacs'), (await p.locator('.dr-tab', { hasText: 'Chaussures' }).count()) === 1 && (await p.locator('.dr-tab', { hasText: 'Sacs' }).count()) === 1);
  await sh('3-chaussures');
  await p.locator('.dr-group', { hasText: 'Tenues' }).click(); await wait(300);
  await p.locator('.dr-tab', { hasText: 'Robes' }).click(); await wait(350);

  // ---- 4. essayage par UN seul toucher (robe non possédée) + état de la sauvegarde intacte
  const before = await S();
  const sigBase = await canvasSig();
  const card = p.locator('.dr2-card', { hasText: 'Robe rose romantique' });
  const priceTxt = await card.locator('.dr2-status').innerText();
  check(tag('carte « à acheter » affiche un prix'), /\d/.test(priceTxt), priceTxt.replace(/\n/g, ' '));
  await card.click(); await wait(500);
  const sigTry = await canvasSig();
  const mid = await S();
  check(tag('un toucher applique la robe sur Radia (aucune fenêtre)'), sigTry !== sigBase && (await p.locator('.modal-backdrop:not(.leaving)').count()) === 0);
  check(tag('l\'essayage ne change pas la tenue sauvegardée ni les pièces'), JSON.stringify(mid.world.wardrobe.look) === JSON.stringify(before.world.wardrobe.look) && mid.world.res.coins === before.world.res.coins && mid.world.wardrobe.owned.length === before.world.wardrobe.owned.length);
  check(tag('carte sélectionnée : liseré + coche'), (await card.getAttribute('class')).includes('sel') && await card.locator('.dr2-check').evaluate((e) => getComputedStyle(e).transform !== 'none' && e.getBoundingClientRect().width > 10));
  check(tag('barre : « Essayage » + bouton Acheter'), /Acheter/.test(await p.locator('.dr2-bar').innerText()) && /Essayage/i.test(await p.locator('.dr2-bar').innerText()));
  await sh('4-essayage');
  // Avant / Après
  await p.locator('.dr2-cmp').click(); await wait(350);
  const sigBefore = await canvasSig();
  check(tag('Avant/Après : « Ma tenue actuelle » montre la tenue équipée'), sigBefore === sigBase && /Ma tenue actuelle/.test(await p.locator('.dr2-badge').innerText()), `${sigBefore} vs ${sigBase}`);
  await sh('5-avant');
  await p.locator('.dr2-cmp').click(); await wait(350);
  check(tag('Avant/Après : second toucher revient à l\'essayage'), (await canvasSig()) === sigTry);
  // annulation
  await p.locator('.dr2-x').click(); await wait(400);
  check(tag('annuler l\'essayage : retour à la tenue équipée, aucun calque'), (await canvasSig()) === sigBase && (await p.locator('.dr2-card.sel').count()) === 0);

  // ---- 5. achat (confirmation dans la barre, débit exact, possédé, équipé)
  await card.click(); await wait(350);
  const priceInfo = await p.evaluate(() => ({ coins: 300, fabric: 4 }));
  await p.locator('.dr2-act').click(); await wait(300);
  check(tag('achat : confirmation dans la barre (pas de modale)'), /Confirmer/.test(await p.locator('.dr2-bar').innerText()) && (await p.locator('.modal-backdrop:not(.leaving)').count()) === 0);
  await sh('6-confirm');
  const pre = await S();
  await p.locator('.dr2-act').click(); await wait(1200);
  const post = await S();
  check(tag('achat : débit correct (300 pièces + 4 tissus)'), pre.world.res.coins - post.world.res.coins === priceInfo.coins && pre.world.res.fabric - post.world.res.fabric === priceInfo.fabric, `${pre.world.res.coins}→${post.world.res.coins}, tissus ${pre.world.res.fabric}→${post.world.res.fabric}`);
  check(tag('achat : possédée et équipée'), post.world.wardrobe.owned.includes('dr-romantic-pink') && post.world.wardrobe.look.dress === 'dr-romantic-pink');
  check(tag('achat : aucune pièce perdue'), pre.world.wardrobe.owned.every((id) => post.world.wardrobe.owned.includes(id)));
  check(tag('carte : badge « Équipé »'), /Équipé/.test(await card.innerText()));
  await sh('7-achete');
  await wait(1500);

  // ---- 6. pièce possédée : essayage puis « Équiper »
  await p.locator('.dr-group', { hasText: 'Sacs & souliers' }).click(); await wait(300);
  await p.locator('.dr-tab', { hasText: 'Chaussures' }).click(); await wait(300);
  const heels = p.locator('.dr2-card', { hasText: 'Escarpins' });
  check(tag('carte possédée : « Possédé »'), /Possédé/.test(await heels.innerText()));
  const sB = await S();
  await heels.click(); await wait(450);
  const sM = await S();
  check(tag('pièce possédée : un toucher l\'essaie sans l\'équiper'), sM.world.wardrobe.look.shoes === sB.world.wardrobe.look.shoes && /Équiper/.test(await p.locator('.dr2-bar').innerText()));
  await p.locator('.dr2-act').click(); await wait(900);
  const sE = await S();
  check(tag('« Équiper » change la tenue enregistrée'), sE.world.wardrobe.look.shoes === 'sh-heels' && sE.world.res.coins === sM.world.res.coins);
  await wait(900);

  // ---- 7. filtre de style discret (replié par défaut)
  await p.locator('.dr-group', { hasText: 'Tenues' }).click(); await wait(300);
  await p.locator('.dr-tab', { hasText: 'Robes' }).click(); await wait(300);
  const sbtn = p.locator('.dr2-stylebtn');
  check(tag('filtre de style facultatif : bouton discret, pastilles repliées'), (await sbtn.isVisible()) && (await p.locator('.dr2-styles.open').count()) === 0);
  const nAll = await p.locator('.dr2-card').count();
  await sbtn.click(); await wait(400);
  await p.locator('.dr2-sty', { hasText: 'Royal' }).click(); await wait(400);
  const nRoyal = await p.locator('.dr2-card').count();
  check(tag('filtre « Royal » : sous-ensemble cohérent'), nRoyal > 0 && nRoyal < nAll, `${nRoyal}/${nAll}`);
  await sh('8-filtre');
  await p.locator('.dr2-sty', { hasText: 'Tous' }).click(); await wait(300);
  await sbtn.click(); await wait(300);
  check(tag('filtre replié : tous les articles'), (await p.locator('.dr2-card').count()) === nAll);

  // ---- 8. panneau à crans (glisser tactile réel via CDP)
  const cdp = await ctx.newCDPSession(p);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const drag = async (x, y0, y1, steps = 12) => { await touch('touchStart', x, y0); for (let i = 1; i <= steps; i++) { await touch('touchMove', x, y0 + ((y1 - y0) * i) / steps); await wait(16); } await touch('touchEnd', x, y1); await wait(700); };
  const hb = await p.locator('.dr2-handle').boundingBox();
  const hx = hb.x + hb.width / 2; const hy = hb.y + hb.height / 2;
  const g0 = await geo();
  await drag(hx, hy, hy - 320);
  const g1 = await geo();
  check(tag('glisser vers le haut : panneau agrandi, Radia réduite'), g1.snap === 'expanded' && g1.panel.h > g0.panel.h + 60 && g1.av.h < g0.av.h - 40, `panneau ${Math.round(g0.panel.h)}→${Math.round(g1.panel.h)}, Radia ${Math.round(g0.av.h)}→${Math.round(g1.av.h)}, cran ${g1.snap}`);
  check(tag('mode agrandi : Radia encore visible, rien coupé, plus de rangées'), g1.av.h >= 80 && g1.av.t >= 0 && g1.grid.b <= g1.bar.t + 1 && g1.bar.b <= g1.vh + 1 && (g1.full >= g0.full), `rangées ${g0.full}→${g1.full}, Radia ${Math.round(g1.av.h)} px`);
  await sh('9-agrandi');
  // en mode agrandi on peut encore essayer et la galerie défile
  await p.locator('.dr2-card').nth(1).click(); await wait(300);
  await p.locator('.dr2-x').click().catch(() => {}); await wait(200);
  const hb2 = await p.locator('.dr2-handle').boundingBox();
  await drag(hb2.x + hb2.width / 2, hb2.y + 10, hb2.y + 330);
  const g2 = await geo();
  check(tag('glisser vers le bas : Radia rétablie (cran standard ou replié)'), g2.snap !== 'expanded' && g2.av.h > g1.av.h + 40, `cran ${g2.snap}, Radia ${Math.round(g2.av.h)} px`);
  await sh('10-redescendu');
  const hb3 = await p.locator('.dr2-handle').boundingBox();
  await drag(hb3.x + hb3.width / 2, hb3.y + 10, hb3.y + 330);
  const g3 = await geo();
  check(tag('cran replié : barre d\'action toujours visible, Radia grande'), g3.snap === 'collapsed' && g3.bar.b <= g3.vh + 1 && g3.av.h >= g2.av.h - 8, `cran ${g3.snap}, Radia ${Math.round(g3.av.h)} px`);
  await sh('11-replie');
  // retour standard par la poignée (clic)
  await p.locator('.dr2-handle').click(); await wait(700);
  const g4 = await geo();
  check(tag('toucher la poignée : retour au cran standard'), g4.snap === 'standard' && Math.abs(g4.panel.h - g0.panel.h) < 3, `${Math.round(g4.panel.h)} vs ${Math.round(g0.panel.h)}`);
  // souris (pointeur non tactile) : glisser aussi
  const hb4 = await p.locator('.dr2-handle').boundingBox();
  await p.mouse.move(hb4.x + hb4.width / 2, hb4.y + 10); await p.mouse.down(); await p.mouse.move(hb4.x + hb4.width / 2, hb4.y - 150, { steps: 10 }); await p.mouse.up(); await wait(700);
  check(tag('glisser à la souris : cran agrandi'), (await geo()).snap === 'expanded');
  await p.locator('.dr2-handle').click(); await wait(600);

  // ---- 9. Mes looks ♡ : 3 emplacements, sauvegarde, chargement
  check(tag('Mes looks ♡ : 3 emplacements'), (await p.locator('.dr2-slot').count()) === 3);
  await p.locator('.dr2-slot').nth(0).click(); await wait(500);
  await sh('12-look-modale');
  await p.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: 'Sauvegarder' }).click(); await wait(500);
  const sL = await S();
  check(tag('look sauvegardé = tenue équipée'), sL.world.wardrobe.looks[0] && sL.world.wardrobe.looks[0].look.dress === 'dr-romantic-pink' && sL.world.wardrobe.looks[0].look.shoes === 'sh-heels');
  await p.locator('.dr-group', { hasText: 'Tenues' }).click();
  await p.locator('.dr-tab', { hasText: 'Hauts' }).click(); await wait(300);
  await p.locator('.dr2-card', { hasText: 'Tee-shirt rose' }).click(); await wait(300);
  await p.locator('.dr2-act').click(); await wait(900);
  check(tag('tenue changée (haut équipé : la robe part)'), (await S()).world.wardrobe.look.top === 'top-tee-pink');
  await p.locator('.dr2-slot').nth(0).click(); await wait(500);
  await p.locator('.modal-backdrop:not(.leaving) .actions button', { hasText: 'Porter ce look' }).click(); await wait(700);
  check(tag('look rechargé'), (await S()).world.wardrobe.look.dress === 'dr-romantic-pink');
  check(tag('coiffure : changement possible (onglet Cheveux)'), await (async () => { await p.locator('.dr-group', { hasText: 'Cheveux' }).click(); await wait(300); return (await p.locator('.dr2-card').count()) >= 6; })());

  // ---- 10. vitrine du collier verrouillé
  await p.locator('.dr-group', { hasText: 'Bijoux' }).click(); await wait(300);
  await p.locator('.dr-tab', { hasText: 'Colliers' }).click(); await wait(400);
  const lk = p.locator('.dr-card.eclat-locked');
  const lkTxt = (await lk.textContent()) ?? '';
  const c0 = (await S()).world.res.coins;
  check(tag('collier : carte verrouillée « Inestimable », aucun chiffre'), (await lk.count()) === 1 && lkTxt.includes('Inestimable') && !/\d/.test(lkTxt.replace('♡', '')), lkTxt.trim());
  await sh('13-vitrine');
  await lk.click(); await wait(900);
  const fiche = (await p.locator('.nl-show').textContent().catch(() => '')) ?? '';
  check(tag('collier : la fiche s\'ouvre, « Cadeau mystérieux — Verrouillé », pas d\'achat'), fiche.includes('Cadeau mystérieux — Verrouillé') && !/Acheter/.test(fiche) && (await p.locator('.nl-lock').isDisabled()));
  await p.locator('.nl-close').click(); await wait(500);
  const sN = await S();
  check(tag('collier : ni possédé, ni équipé, ni débit'), !sN.world.wardrobe.owned.includes('ac-eclat') && !sN.world.wardrobe.look.acc.includes('ac-eclat') && sN.world.res.coins === c0);
  check(tag('collier : aucune sélection, barre inchangée'), (await p.locator('.dr2-card.sel').count()) === 0 && !/Acheter/.test(await p.locator('.dr2-bar').innerText()));

  // ---- 11. aucun élément coupé : cartes, barre, onglets dans l'écran, pas de texte coupé hors ellipsis
  const lay = await p.evaluate(() => {
    const bad = [];
    const vw = innerWidth, vh = innerHeight;
    for (const e of document.querySelectorAll('.dr2-screen button, .dr2-screen .dr2-badge')) {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || e.closest('.dr2-grid') || e.closest('.dr2-tabs') || e.closest('.dr2-styles')) continue;
      if (getComputedStyle(e.closest('.dr2-col') ?? e).opacity === '0') continue;
      if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) bad.push(`${e.className} hors écran`);
      const h = r.height; if (h < 28) bad.push(`${e.className} trop bas ${Math.round(h)}`);
    }
    for (const t of document.querySelectorAll('.dr2-group, .dr2-bal, .dr2-screen .screen-head h2')) if (t.scrollWidth > t.clientWidth + 1 && getComputedStyle(t).textOverflow !== 'ellipsis') bad.push(`${t.className} déborde`);
    return bad;
  });
  check(tag('boutons dans l\'écran, hauteur ≥ 28 px, rien ne déborde'), lay.length === 0, lay.join(' | '));

  // ---- 12. sortie : aucun calque résiduel
  await p.locator('.screen-head .icon-btn').first().click(); await wait(1200);
  const left = await p.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const nodes = [];
    for (const e of document.querySelectorAll('body *')) {
      if (e.closest('canvas')) continue;
      const r = e.getBoundingClientRect();
      if (r.width < vw * 0.85 || r.height < vh * 0.4) continue;
      const cs = getComputedStyle(e);
      nodes.push({ tag: e.tagName.toLowerCase(), id: e.id, cls: typeof e.className === 'string' ? e.className : '', sel: e.tagName + '.' + e.className, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, display: cs.display, visibility: cs.visibility, opacity: parseFloat(cs.opacity), pe: cs.pointerEvents, bg: cs.backgroundColor, bgImage: cs.backgroundImage, backdrop: cs.backdropFilter || 'none', onTop: false });
    }
    return { nodes, vw, vh, kids: [...document.getElementById('ui').children].map((c) => c.className).filter((c) => !/leaving|toasts|rd-sparkle-layer/.test(c)) };
  });
  const issues = evaluate({ vw: left.vw, vh: left.vh, nodes: left.nodes, allow: ['#app', '#game', '#ui', 'canvas', 'html', 'body', '.screen'], settled: true });
  check(tag('sortie du dressing : aucun calque sombre / overlay résiduel'), issues.length === 0 && !left.kids.some((c) => /dr2|dr-cel|modal-backdrop|nl-show/.test(c)), issues.join(' | ') + ' ' + left.kids.join(','));

  // ---- 13. étape d'événement : titre, indice, ambiance gala, bouton « prête » (le dressing est ouvert par le module, comme le fait runner.ts)
  if (H === HEIGHTS[0]) {
    for (let k = 0; k < 4 && (await p.locator('.hub-grid').count()) === 0; k++) await wait(500);
    const url = await p.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).find((n) => /dressing/.test(n)));
    await p.evaluate(async (u) => { const m = await import(u); window.__done = false; m.openDressing({ title: 'Ta tenue ♡', hint: 'Une soirée élégante : pense à une robe et des bijoux.', cta: 'Je suis prête ♡', mood: 'gala' }).then(() => { window.__done = true; }); }, url);
    await wait(1800);
    if (await p.locator('.dr-tip button').count()) { await p.locator('.dr-tip button').click(); await wait(400); }
    check(tag('événement : titre, indice (dr-evhint), ambiance gala, bouton « prête »'), /Ta tenue/.test(await p.locator('.dr2-screen .screen-head h2').innerText()) && (await p.locator('.dr-evhint').count()) === 1 && (await p.locator('.dr-screen.dr-gala').count()) === 1 && (await p.locator('.dr-ready').isVisible()));
    await sh('14-evenement');
    await p.locator('.dr-group', { hasText: 'Tenues' }).click();
    await p.locator('.dr-tab', { hasText: 'Robes' }).click(); await wait(300);
    await p.locator('.dr2-card', { hasText: 'Robe fluide fleurie' }).click(); await wait(400);
    check(tag('événement : essayage → « Acheter » remplace « prête » (rien ne se superpose)'), (await p.locator('.dr-ready').count()) === 0 && /Acheter/.test(await p.locator('.dr2-bar').innerText()));
    await p.locator('.dr2-act').click(); await wait(300); await p.locator('.dr2-act').click(); await wait(1500);
    check(tag('événement : après l\'achat le bouton « prête » revient'), await p.locator('.dr-ready').isVisible());
    await p.locator('.dr-ready').click(); await wait(1200);
    check(tag('événement : « prête » ferme l\'écran et résout la promesse'), (await p.evaluate(() => window.__done)) === true && (await p.locator('.dr2-screen:not(.leaving)').count()) === 0);
  }
  check(tag('aucune erreur JS'), errs.length === 0, errs.join(' | '));
  await ctx.close();
}

for (const H of HEIGHTS) await run(H);
console.log(`\n${out.filter((l) => l.startsWith('OK')).length} OK, ${fails} KO`);
await browser.close();
process.exit(fails ? 1 : 0);
