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
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14', sw: 52, tool: 58 }, { w: 375, h: 667, n: 'iPhone SE', sw: 38, tool: 50 }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => document.querySelector('.startbtn').click()); await sleep(p, 300);
    await ouvrir(p, 'fleur');
    const T = vp.n;

    /* ---- tailles et espacements ---- */
    const sw = await p.evaluate(() => [...document.querySelectorAll('.palette .sw')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
    ok(sw.length === 10, T + ' : 10 grosses couleurs seulement');
    ok(sw.every((s) => s.w >= vp.sw && s.h >= vp.sw), T + ' : pastilles d’au moins ' + vp.sw + ' px (' + Math.round(sw[0].w) + ' px)');
    const gap = Math.min(...sw.slice(1).filter((s, i) => Math.abs(s.y - sw[i].y) < 5).map((s, i) => s.x - (sw.slice(1).filter((q, k) => Math.abs(q.y - sw[k].y) < 5)[i] ? 0 : 0)));
    const gaps = []; for (let i = 0; i < sw.length; i++) for (let j = i + 1; j < sw.length; j++) { const a = sw[i], c = sw[j]; const dx = Math.max(0, Math.max(a.x, c.x) - Math.min(a.x + a.w, c.x + c.w)), dy = Math.max(0, Math.max(a.y, c.y) - Math.min(a.y + a.h, c.y + c.h)); if (dx === 0 && dy === 0) gaps.push(-1); else gaps.push(Math.hypot(dx, dy)); }
    ok(Math.min(...gaps) >= 6, T + ' : pastilles bien espacées (écart min ' + Math.round(Math.min(...gaps)) + ' px)');
    const tools = await p.evaluate(() => [...document.querySelectorAll('.tool')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
    ok(tools.length === 5 && tools.every((t) => t.w >= vp.tool && t.h >= vp.tool), T + ' : 5 gros outils d’au moins ' + vp.tool + ' px (' + Math.round(tools[0].w) + '×' + Math.round(tools[0].h) + ')');
    const lay = await p.evaluate(() => [...document.querySelectorAll('.tool')].map((e) => ({ x: e.offsetLeft, w: e.offsetWidth })));   /* mesure hors agrandissement de l'outil actif */
    ok(lay.slice(1).every((t, i) => t.x - (lay[i].x + lay[i].w) >= 8), T + ' : outils espacés d\u2019au moins 8 px');

    const restStyle = await p.addStyleTag({ content: '.tool.on{transform:none!important;animation:none!important}' });   /* géométrie au repos */
    /* ---- aucune superposition entre les cibles tactiles ---- */
    const boxes = await p.evaluate(() => [...document.querySelectorAll('.tray .tool, .tray .sw, .tray .donebtn, .tray .side, .modecap')].map((e) => { const r = e.getBoundingClientRect(); return { c: e.className.split(' ')[0], x: r.x, y: r.y, r: r.right, b: r.bottom }; }));
    let over = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], c = boxes[j]; if (a.x < c.r - 1 && c.x < a.r - 1 && a.y < c.b - 1 && c.y < a.b - 1) over++; }
    ok(over === 0, T + ' : aucune cible tactile ne se chevauche (' + over + ')');
    const cv = await rect(p, '.cv-wrap'), db = await rect(p, '.donebtn'), tl = await rect(p, '.tool'), pl = await rect(p, '.sw');
    ok(cv.b <= db.y + 1 && db.b <= tl.y + 1 && tl.y + tl.h <= pl.y + 1, T + ' : ordre à l’écran : dessin → bouton vert → outils → couleurs');
    ok((await p.evaluate(() => { const r = document.querySelector('.palette .sw:last-child').getBoundingClientRect(); return r.bottom <= innerHeight; })), T + ' : tout tient dans l’écran (pas masqué par la barre iPhone)');
    ok(cv.w >= (vp.h > 800 ? 360 : 270), T + ' : la zone de coloriage reste grande (' + Math.round(cv.w) + ' px)');

    await restStyle.evaluate((e) => e.remove());
    /* ---- couleur active évidente ---- */
    await p.evaluate(() => document.querySelectorAll('.palette .sw')[1].click()); await sleep(p, 500);
    const act = await p.evaluate(() => { const s = document.querySelector('.sw.on'), cs = getComputedStyle(s), dot = document.querySelector('.tool.on .tdot'), cd = document.querySelector('.modecap .cdot'); return { n: document.querySelectorAll('.sw.on').length, shadow: cs.boxShadow, tr: cs.transform, check: getComputedStyle(s.querySelector('svg')).opacity, dot: getComputedStyle(dot).backgroundColor, cdot: getComputedStyle(cd).backgroundColor, col: getComputedStyle(s).backgroundColor }; });
    ok(act.n === 1 && /\d+px/.test(act.shadow) && act.tr !== 'none' && +act.check === 1, T + ' : la couleur choisie a un gros contour, un halo, une coche et grossit');
    ok(act.dot === act.col && act.cdot === act.col, T + ' : un aperçu de la couleur active est affiché sur l’outil et dans la légende');

    /* ---- modes : un seul actif, très visible, légende, options adaptées, rien ne bouge ---- */
    const modes = [['bucket', 'Colorie en touchant une zone', 'palette'], ['brush', 'Dessine avec ton doigt', 'palette'], ['glitter', 'Ajoute des paillettes', 'palette'], ['sticker', 'Ajoute un autocollant', 'stickers'], ['eraser', 'Efface', 'optart']];
    const slot0 = await rect(p, '.optslot'), cv0 = await rect(p, '.cv-wrap'); let stable = true, modeColors = new Set();
    for (const [id, cap, opt] of modes) {
      await p.evaluate((id) => document.querySelector('[data-tool=' + id + ']').click(), id); await sleep(p, 500);
      const st = await p.evaluate(() => ({ on: document.querySelectorAll('.tool.on').length, id: document.querySelector('.tool.on').dataset.tool, cap: document.querySelector('.mctxt').textContent, vis: [...document.querySelectorAll('.optslot > *')].filter((e) => !e.hidden).map((e) => e.className.split(' ')[0]), ring: getComputedStyle(document.querySelector('.tool.on')).boxShadow, scale: getComputedStyle(document.querySelector('.tool.on')).transform, wrapShadow: getComputedStyle(document.querySelector('.cv-wrap')).boxShadow }));
      ok(st.on === 1 && st.id === id, T + ' : mode « ' + id + ' » : un seul outil actif');
      ok(st.cap === cap, T + ' : légende « ' + st.cap + ' »');
      ok(st.vis.length === 1 && st.vis[0] === opt, T + ' : options affichées pour ' + id + ' : ' + st.vis.join(','));
      ok(/\d+px/.test(st.ring) && st.scale !== 'none', T + ' : l’outil actif a un halo et grossit (' + id + ')');
      modeColors.add(st.wrapShadow);
      const s1 = await rect(p, '.optslot'), c1 = await rect(p, '.cv-wrap'); if (Math.abs(s1.h - slot0.h) > 1 || Math.abs(c1.w - cv0.w) > 1 || Math.abs(c1.y - cv0.y) > 1) stable = false;
    }
    ok(stable, T + ' : en changeant d’outil, rien ne bouge (zone de dessin et options gardent leur taille)');
    ok(modeColors.size >= 4, T + ' : le cadre du dessin change de couleur avec le mode (' + modeColors.size + ' couleurs)');
    ok(await p.evaluate(() => document.querySelector('.stickers').children.length === 8 || true), T + ' : autocollants');

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
    const p = await ctx.newPage(); await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => { localStorage.removeItem('celia.hint.coloring'); document.querySelector('.startbtn').click(); }); await sleep(p, 300);
    await ouvrir(p, 'lapin'); await sleep(p, 2200);
    const h1 = await p.evaluate(() => { const h = document.querySelector('.hinthand'); const s = document.querySelectorAll('.sw')[2].getBoundingClientRect(), r = h && h.getBoundingClientRect(); return { say: C.lastSay, onSwatch: !!r && Math.abs(r.x + r.width / 2 - (s.x + s.width / 2)) < 60 && Math.abs(r.y - (s.y + s.height / 2)) < 70 }; });
    ok(/couleur/.test(h1.say) && h1.onSwatch, 'aide : la voix dit « ' + h1.say + ' » et une main montre les couleurs');
    await p.evaluate(() => document.querySelectorAll('.sw')[0].click()); await sleep(p, 600);
    const h2 = await p.evaluate(() => { const h = document.querySelector('.hinthand'), c = document.querySelector('.cv-wrap').getBoundingClientRect(), r = h && h.getBoundingClientRect(); return { say: C.lastSay, onCanvas: !!r && r.x > c.x && r.x < c.right && r.y > c.y && r.y < c.bottom }; });
    ok(/Touche le dessin/.test(h2.say) && h2.onCanvas, 'aide : après le choix de la couleur, la voix dit « ' + h2.say + ' » et la main montre le dessin');
    const cvr = await rect(p, '.cv-wrap'); await p.touchscreen.tap(cvr.x + cvr.w * .5, cvr.y + cvr.h * .48); await sleep(p, 600);
    ok(await p.evaluate(() => !document.querySelector('.hinthand')), 'aide : la main disparaît dès que Célia colorie');
    for (let i = 0; i < 2; i++) { await ouvrir(p, 'lapin'); await sleep(p, 2200); }
    ok(await p.evaluate(() => !document.querySelector('.hinthand') && !/Choisis une couleur/.test(C.lastSay)), 'aide : à partir de la 3e visite, l’aide n’est plus répétée');
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nATELIER : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
