/* Atelier coloriage / dessin : lisibilité et ergonomie pour une enfant de 3 ans (Chromium mobile émulé, PAS un vrai iPhone).
   Vérifie : tailles et espacement des cibles tactiles, absence de chevauchement, mode actif évident, couleur active évidente,
   retours visuels (remplissage, trait, paillettes, autocollant, gomme), aide par la main, ordre des éléments à l'écran. */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
const rect = (p, sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; }, sel);
const alphaCount = (p, cv, w, h) => p.evaluate(([cv, w, h]) => { const d = document.querySelector(cv).getContext('2d').getImageData(0, 0, w, h).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; }, [cv, w, h]);

async function ouvrir(p, page) {
  await p.evaluate(() => { const h = document.querySelector('#btnHome'); h && !h.hidden && h.click(); }); await sleep(p, 700);
  await p.evaluate(() => document.querySelector('.t-draw').click()); await sleep(p, 900);
  await p.evaluate(() => document.querySelector('.hc1').click()); await sleep(p, 400);
  await p.evaluate((id) => document.querySelector('.pg[data-id=' + id + ']').click(), page); await sleep(p, 1300);
}

(async () => {
  const b = await chromium.launch();
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14', sw: 40, tool: 52 }, { w: 375, h: 667, n: 'iPhone SE', sw: 38, tool: 46 }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await ctx.addInitScript(require('./_session.cjs'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => document.querySelector('.startbtn').click()); await sleep(p, 300);
    await ouvrir(p, 'fleur');
    const T = vp.n;

    /* ---- grande feuille, outils compacts (coloriage : feuille carrée, pleine largeur) ---- */
    const g = (s) => rect(p, s);
    const cvC = await g('.cv-wrap'), trayC = await g('.tray');
    ok(cvC.w >= vp.w - 14, T + ' : coloriage : la feuille occupe toute la largeur (' + Math.round(cvC.w) + ' / ' + vp.w + ' px)');
    ok(trayC.h <= vp.h * 0.33, T + ' : le plateau d’outils reste compact (' + Math.round(trayC.h / vp.h * 100) + ' % de la hauteur)');
    const sw = await p.evaluate(() => [...document.querySelectorAll('.palette .sw')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right }; }));
    ok(sw.length >= 8, T + ' : au moins 8 couleurs (' + sw.length + '), accessibles en faisant défiler');
    ok(sw.every((s) => Math.abs(s.y - sw[0].y) < 8), T + ' : palette sur UNE seule rangée horizontale');
    ok(sw.every((s) => s.w >= vp.sw && s.h >= vp.sw), T + ' : pastilles d’au moins ' + vp.sw + ' px (' + Math.round(sw[0].w) + ' px)');
    const visible = sw.filter((s) => s.x >= -1 && s.r <= vp.w + 1).length;
    ok(visible >= 6 && visible <= 8, T + ' : 6 à 8 grosses couleurs visibles d’un coup (' + visible + ')');
    ok(await p.evaluate(() => { const pl = document.querySelector('.palette'); return pl.scrollWidth > pl.clientWidth && getComputedStyle(pl).overflowX === 'auto'; }), T + ' : les autres couleurs sont accessibles par défilement horizontal');
    const tools = await p.evaluate(() => [...document.querySelectorAll('.tool')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
    ok(tools.length === 5 && tools.every((t) => t.w >= vp.tool && t.h >= vp.tool), T + ' : 5 outils sur une rangée, d’au moins ' + vp.tool + ' px (' + Math.round(tools[0].w) + '×' + Math.round(tools[0].h) + ')');
    ok(tools.every((t) => Math.abs(t.y - tools[0].y) < 8), T + ' : une seule rangée d’outils');
    const lay = await p.evaluate(() => [...document.querySelectorAll('.tool')].map((e) => ({ x: e.offsetLeft, w: e.offsetWidth })));   /* mesure hors agrandissement de l'outil actif */
    ok(lay.slice(1).every((t, i) => t.x - (lay[i].x + lay[i].w) >= 5), T + ' : outils espacés d’au moins 5 px');
    await p.addStyleTag({ content: '.tool.on{transform:none!important;animation:none!important}.sw.on{transform:none!important}' });   /* géométrie au repos */
    /* ---- aucune superposition entre les cibles tactiles visibles ---- */
    const boxes = await p.evaluate(() => [...document.querySelectorAll('.tray .tool, .tray .expbtn, .tray .sw, .tray .donebtn, .tray .side, .tray .szb')].map((e) => { const r = e.getBoundingClientRect(); return { c: e.className.split(' ')[0], x: r.x, y: r.y, r: r.right, b: r.bottom }; }).filter((b) => b.r > 0 && b.x < innerWidth));
    let over = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], c = boxes[j]; if (a.x < c.r - 1 && c.x < a.r - 1 && a.y < c.b - 1 && c.y < a.b - 1) over++; }
    ok(over === 0, T + ' : aucune cible tactile ne se chevauche (' + over + ')');
    const cv = await g('.cv-wrap'), db = await g('.donebtn'), tl = await g('.tool'), slot = await g('.optslot');
    ok(cv.b <= tl.y + 1 && tl.b <= slot.y + 1 && slot.b <= db.y + 1, T + ' : ordre à l’écran : feuille → outils → couleurs → barre du bas');
    ok(db.h <= 56 && db.h >= 40 && db.b <= vp.h && db.b > vp.h - 60, T + ' : bouton « J’ai fini ! » compact (' + Math.round(db.h) + ' px), tout en bas, visible (' + Math.round(db.b) + ' / ' + vp.h + ')');
    ok(/J’ai fini ?!/.test(await p.evaluate(() => document.querySelector('.donebtn').textContent)) && !/mon dessin/.test(await p.evaluate(() => document.querySelector('.donebtn').textContent)), T + ' : libellé court « ✓ J’ai fini ! »');
    ok(await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1), T + ' : aucun défilement involontaire de la page');
    ok(await p.evaluate(() => !document.querySelector('.modecap')), T + ' : pas de légende encombrante');
    ok(await p.evaluate(() => !document.querySelector('.expbtn')), T + ' : coloriage : pas de bouton « grande feuille » (la feuille carrée est déjà pleine largeur)');

    /* ---- couleur active évidente ---- */
    await p.evaluate(() => document.querySelectorAll('.palette .sw')[1].click()); await sleep(p, 500);
    const act = await p.evaluate(() => { const s = document.querySelector('.sw.on'), cs = getComputedStyle(s), dot = document.querySelector('.tool.on .tdot'); return { n: document.querySelectorAll('.sw.on').length, shadow: cs.boxShadow, check: getComputedStyle(s.querySelector('svg')).opacity, dot: getComputedStyle(dot).backgroundColor, col: cs.backgroundColor }; });
    ok(act.n === 1 && /\d+px/.test(act.shadow) && +act.check === 1, T + ' : la couleur choisie a un contour, un halo et une coche');
    ok(act.dot === act.col, T + ' : un aperçu de la couleur active est affiché sur l’outil');

    /* ---- modes : un seul actif, très visible, options adaptées, rien ne bouge ---- */
    const modes = [['bucket', 'palette'], ['brush', 'palette'], ['glitter', 'palette'], ['sticker', 'stickers'], ['eraser', 'optart']];
    const slot0 = await g('.optslot'), cv0 = await g('.cv-wrap'); let stable = true, modeColors = new Set();
    for (const [id, opt] of modes) {
      await p.evaluate((id) => document.querySelector('[data-tool=' + id + ']').click(), id); await sleep(p, 500);
      const st = await p.evaluate(() => ({ on: document.querySelectorAll('.tool.on').length, id: document.querySelector('.tool.on').dataset.tool, vis: [...document.querySelectorAll('.optslot > *')].filter((e) => !e.hidden).map((e) => e.className.split(' ')[0]), ring: getComputedStyle(document.querySelector('.tool.on')).boxShadow, wrapShadow: getComputedStyle(document.querySelector('.cv-wrap')).boxShadow.split(' ').slice(0, 3).join('') }));
      ok(st.on === 1 && st.id === id, T + ' : mode « ' + id + ' » : un seul outil actif');
      ok(st.vis.length === 1 && st.vis[0] === opt, T + ' : options affichées pour ' + id + ' : ' + st.vis.join(','));
      ok(/\d+px/.test(st.ring), T + ' : l’outil actif a un halo (' + id + ')');
      modeColors.add(st.wrapShadow);
      const s1 = await g('.optslot'), c1 = await g('.cv-wrap'); if (Math.abs(s1.h - slot0.h) > 1 || Math.abs(c1.w - cv0.w) > 1 || Math.abs(c1.y - cv0.y) > 1 || Math.abs(c1.h - cv0.h) > 1) stable = false;
    }
    ok(stable, T + ' : en changeant d’outil, rien ne bouge (la feuille et les options gardent leur taille)');
    ok(modeColors.size >= 4, T + ' : le cadre de la feuille change de couleur avec le mode (' + modeColors.size + ' couleurs)');

    if (vp.n === 'iPhone 14') {
      /* ---- retours visuels ---- */
      const c = await rect(p, '.cv-wrap'); const at = (fx, fy) => [c.x + c.w * fx, c.y + c.h * fy];
      await p.evaluate(() => document.querySelector('[data-tool=bucket]').click()); await p.evaluate(() => document.querySelectorAll('.palette .sw')[2].click()); await sleep(p, 300);
      await p.touchscreen.tap(...at(.5, .37));
      let ripple = false; for (let k = 0; k < 8 && !ripple; k++) { await sleep(p, 40); ripple = await p.evaluate(() => [...document.querySelectorAll('#fx .p')].some((e) => /solid/.test(getComputedStyle(e).borderStyle) && parseFloat(getComputedStyle(e).borderWidth) >= 5)); }
      ok(ripple, T + ' : remplir : une onde de couleur part du doigt immédiatement');
      await sleep(p, 700);
      const px = await p.evaluate(() => Array.from(document.querySelector('.cv-color').getContext('2d').getImageData(300, 220, 1, 1).data));
      ok(px[3] === 255 && px[0] > 200 && px[2] < 120, T + ' : remplir : la zone devient jaune ' + px);
      /* remplissage tolérant : toucher à côté d'un trait remplit quand même la zone voisine */
      await p.touchscreen.tap(...at(.5, .5 + 0.123)); await sleep(p, 500);
      /* trait */
      await p.evaluate(() => document.querySelector('[data-tool=brush]').click()); await p.evaluate(() => document.querySelectorAll('.palette .sw')[5].click()); await sleep(p, 300);
      const before = await alphaCount(p, '.cv-color', 600, 600);
      await p.mouse.move(...at(.15, .12)); await p.mouse.down(); for (let k = 0; k < 25; k++) await p.mouse.move(c.x + c.w * (.15 + k * .02), c.y + c.h * (.12 + k * .004)); await p.mouse.up(); await sleep(p, 300);
      const after = await alphaCount(p, '.cv-color', 600, 600);
      ok(after - before > 4000, T + ' : dessiner : le trait suit le doigt, bien épais (' + (after - before) + ' px ajoutés)');
      const thick = await p.evaluate(() => { const d = document.querySelector('.cv-color').getContext('2d').getImageData(150, 40, 1, 120).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++; return n; });
      ok(thick >= 28, T + ' : le trait fait au moins ~28 px d’épaisseur (' + thick + ')');
      /* paillettes */
      await p.evaluate(() => document.querySelector('[data-tool=glitter]').click()); await sleep(p, 300);
      const g0 = await alphaCount(p, '.cv-color', 600, 600);
      await p.mouse.move(...at(.2, .85)); await p.mouse.down(); for (let k = 0; k < 14; k++) await p.mouse.move(c.x + c.w * (.2 + k * .04), c.y + c.h * .85); await p.mouse.up(); await sleep(p, 300);
      ok(await alphaCount(p, '.cv-color', 600, 600) - g0 > 1200, T + ' : paillettes : bien visibles (' + (await alphaCount(p, '.cv-color', 600, 600) - g0) + ' px)');
      /* autocollant : grand, centré dans la zone touchée */
      await p.evaluate(() => document.querySelector('[data-tool=sticker]').click()); await sleep(p, 300);
      const cvR = await rect(p, '.cv-color');
      await p.touchscreen.tap(cvR.x + 330 / 600 * cvR.w, cvR.y + 250 / 600 * cvR.h);   /* à côté du centre de la fleur (300,220) */
      await sleep(p, 1100);
      const bb = await p.evaluate(() => { const d = document.querySelector('.cv-stk').getContext('2d').getImageData(0, 0, 600, 600).data; let x0 = 600, y0 = 600, x1 = 0, y1 = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { const x = (i / 4) % 600, y = ((i / 4) / 600) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; });
      ok(bb.w >= 90 && bb.h >= 90, T + ' : autocollant : gros et bien visible (' + Math.round(bb.w) + '×' + Math.round(bb.h) + ' px)');
      ok(Math.hypot(bb.cx - 300, bb.cy - 220) < 20, T + ' : autocollant : placé automatiquement au centre de la zone touchée (' + Math.round(bb.cx) + ',' + Math.round(bb.cy) + ')');
      /* gomme */
      await p.evaluate(() => document.querySelector('[data-tool=eraser]').click()); await sleep(p, 300);
      await p.touchscreen.tap(...at(.5, .37)); await sleep(p, 500);
      ok(await p.evaluate(() => Array.from(document.querySelector('.cv-color').getContext('2d').getImageData(300, 220, 1, 1).data)[3]) === 0 && await alphaCount(p, '.cv-stk', 600, 600) < 200, T + ' : gomme : la zone ET son autocollant sont effacés (évident)');
    }
    ok(errs.length === 0, T + ' : aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }

  /* ---- aide : la main montre les couleurs puis le dessin, seulement les 2 premières fois ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(require('./_session.cjs'));
    const p = await ctx.newPage(); await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => { localStorage.removeItem('celia.hint.coloring'); document.querySelector('.startbtn').click(); }); await sleep(p, 300);
    await ouvrir(p, 'lapin'); await sleep(p, 2200);
    const h1 = await p.evaluate(() => { const h = document.querySelector('.hinthand'); const s = document.querySelectorAll('.sw')[2].getBoundingClientRect(), r = h && h.getBoundingClientRect(); return { say: C.lastSay, onSwatch: !!r && Math.abs(r.x + r.width / 2 - (s.x + s.width / 2)) < 60 && Math.abs(r.y - (s.y + s.height / 2)) < 70 }; });
    ok(!h1.say && h1.onSwatch, 'aide : la voix reste muette et une main montre les couleurs');
    await p.evaluate(() => document.querySelectorAll('.sw')[0].click()); await sleep(p, 600);
    const h2 = await p.evaluate(() => { const h = document.querySelector('.hinthand'), c = document.querySelector('.cv-wrap').getBoundingClientRect(), r = h && h.getBoundingClientRect(); return { say: C.lastSay, onCanvas: !!r && r.x > c.x && r.x < c.right && r.y > c.y && r.y < c.bottom }; });
    ok(!h2.say && h2.onCanvas, 'aide : après le choix de la couleur, la main montre le dessin (sans parler)');
    const cvr = await rect(p, '.cv-wrap'); await p.touchscreen.tap(cvr.x + cvr.w * .5, cvr.y + cvr.h * .48); await sleep(p, 600);
    ok(await p.evaluate(() => !document.querySelector('.hinthand')), 'aide : la main disparaît dès que Celia colorie');
    for (let i = 0; i < 2; i++) { await ouvrir(p, 'lapin'); await sleep(p, 2200); }
    ok(await p.evaluate(() => !document.querySelector('.hinthand') && !/Choisis une couleur/.test(C.lastSay)), 'aide : à partir de la 3e visite, l’aide n’est plus répétée');
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nATELIER : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
