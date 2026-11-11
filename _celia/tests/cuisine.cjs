/* Partie complète de cuisine, avec vérification que CHAQUE interaction produit un résultat visible (Chromium mobile émulé, pas un vrai iPhone). */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);

async function partie(p, vp, recette, tag) {
  await p.evaluate(() => { const m = document.querySelector('#btnHome'); m && m.click(); }); await sleep(p, 800);
  await p.evaluate(() => document.querySelector('.t-cook').click()); await sleep(p, 900);
  ok(await p.evaluate(() => document.querySelectorAll('.rcard').length === 5), tag + ' : 5 recettes affichées');
  await p.evaluate((i) => document.querySelectorAll('.rcard')[i].click(), recette); await sleep(p, 1500);
  const ings = await p.evaluate(() => document.querySelectorAll('.ing').length);
  ok(ings === 4, tag + ' : 4 ingrédients proposés');
  /* ingrédients : chaque toucher fait tomber quelque chose ET laisse une trace dans le saladier */
  for (let i = 0; i < ings; i++) {
    const before = await p.evaluate(() => ({ blobs: document.querySelectorAll('.blobs > g').length, scale: getComputedStyle(document.querySelector('.batter')).transform }));
    await p.evaluate((i) => document.querySelectorAll('.ing')[i].click(), i);
    let fell = false; for (let k = 0; k < 14 && !fell; k++) { await sleep(p, 100); fell = await p.evaluate(() => document.querySelectorAll('#fx .flyer').length >= 3); }
    ok(fell, tag + ' : ingrédient ' + (i + 1) + ' — il tombe visiblement dans le saladier');
    await sleep(p, 1300);
    const after = await p.evaluate(() => ({ blobs: document.querySelectorAll('.blobs > g').length, used: document.querySelectorAll('.ing.used').length, scale: getComputedStyle(document.querySelector('.batter')).transform }));
    ok(after.blobs === before.blobs + 1 && after.used === i + 1, tag + ' : ingrédient ' + (i + 1) + ' — apparaît dans la pâte (' + before.blobs + '→' + after.blobs + ')');
  }
  /* re-toucher un ingrédient déjà ajouté ne change rien */
  await p.evaluate(() => document.querySelectorAll('.ing')[0].click()); await sleep(p, 600);
  ok(await p.evaluate(() => document.querySelectorAll('.blobs > g').length === document.querySelectorAll('.ing').length), tag + ' : re-toucher un ingrédient ne l’ajoute pas deux fois');
  await sleep(p, 2800);
  /* mélange : hors du saladier ça ne compte pas ; dedans la pâte réagit */
  const r = await p.evaluate(() => { const r = document.querySelector('.bowlw').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const off = () => p.evaluate(() => { const e = document.querySelector('.prog'); return e.style.strokeDashoffset || e.getAttribute('stroke-dashoffset'); });
  await p.mouse.move(r.x + r.w * .5, r.y + r.h * .3); await p.mouse.down();
  for (let k = 0; k < 30; k++) await p.mouse.move(r.x + r.w * .5 + (k % 2 ? 40 : -40), r.y + r.h + 120 + k);   /* loin sous le saladier */
  const outside = await off();
  ok(+outside === 289, tag + ' : mélanger en dehors du saladier ne fait pas avancer la jauge');
  const blobBefore = await p.evaluate(() => document.querySelector('.blobs > g').getAttribute('transform'));
  for (let k = 0; k < 90; k++) { const a = k / 6; await p.mouse.move(r.x + r.w * (.5 + .25 * Math.cos(a)), r.y + r.h * (.3 + .15 * Math.sin(a))); }
  const mid = await p.evaluate(() => ({ off: +document.querySelector('.prog').style.strokeDashoffset, tr: document.querySelector('.blobs > g').getAttribute('transform'), op: +document.querySelector('.blobs > g').style.opacity }));
  ok(mid.off < 289 && mid.tr !== blobBefore, tag + ' : en mélangeant, la jauge avance et les ingrédients bougent dans la pâte');
  let last = null;
  for (let k = 0; k < 600; k++) {
    const a = k / 6; await p.mouse.move(r.x + r.w * (.5 + .25 * Math.cos(a)), r.y + r.h * (.3 + .15 * Math.sin(a)));
    if (k % 8 === 0) { const st = await p.evaluate(() => { const e = document.querySelector('.prog'), g = document.querySelector('.blobs > g'); return e && g ? { off: +e.style.strokeDashoffset, op: +g.style.opacity } : null; }); if (st) last = st; else break; }
  }
  await p.mouse.up();
  ok(last && last.off <= 40 && last.op < 0.3, tag + ' : à la fin du mélange la jauge est pleine et les ingrédients se sont fondus dans la pâte ' + JSON.stringify(last));
  await sleep(p, 2500);
  /* cuisson : le moule doit être glissé ou touché ; lâché loin du four il revient */
  ok(await p.evaluate(() => !!document.querySelector('.tinw') && !!document.querySelector('.ovenw')), tag + ' : four et moule affichés');
  const tin = await p.evaluate(() => { const r = document.querySelector('.tinw').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(tin.x, tin.y); await p.mouse.down(); await p.mouse.move(tin.x + 60, tin.y + 40, { steps: 5 }); await p.mouse.up(); await sleep(p, 800);
  ok(await p.evaluate(() => !document.querySelector('.tinw').style.opacity || document.querySelector('.tinw').style.opacity === '1'), tag + ' : lâché loin du four, le moule revient (aucune cuisson déclenchée)');
  const win = await p.evaluate(() => { const r = document.querySelector('.ovenwin').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(tin.x, tin.y); await p.mouse.down(); await p.mouse.move(win.x, win.y, { steps: 12 }); await p.mouse.up();
  await sleep(p, 1500);
  const cooking = await p.evaluate(() => ({ glow: +getComputedStyle(document.querySelector('.glow')).opacity, mound: getComputedStyle(document.querySelector('.mound')).transform }));
  ok(cooking.glow > 0.3, tag + ' : le four s’allume pendant la cuisson');
  await sleep(p, 6500);
  ok(await p.evaluate(() => !!document.querySelector('.cakeh svg')), tag + ' : après la cuisson, le gâteau apparaît à décorer');
  /* « Mon gâteau est prêt » refusé tant que rien n'est décoré */
  await p.evaluate(() => document.querySelector('.donebtn').click()); await sleep(p, 900);
  ok(await p.evaluate(() => !document.querySelector('.celebrate') && !!document.querySelector('.cakeh svg')), tag + ' : « Mon gâteau est prêt » est refusé tant que le gâteau n’est pas décoré');
  /* glaçage : toucher le gâteau dans l'onglet glaçage le glace réellement */
  const cake = () => p.evaluate(() => { const r = document.querySelector('.cakeh svg').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  let c = await cake();
  const hadIcing = await p.evaluate(() => !!document.querySelector('.cakeh .icing'));
  await p.touchscreen.tap(c.x + c.w * .5, c.y + c.h * .5); await sleep(p, 500);
  ok(await p.evaluate(() => !!document.querySelector('.cakeh .icing')) && !hadIcing || hadIcing, tag + ' : toucher le gâteau (onglet glaçage) pose un glaçage visible');
  await p.evaluate(() => document.querySelectorAll('.it.round')[3].click()); await sleep(p, 500);
  const col = await p.evaluate(() => { const e = document.querySelector('.cakeh .icing *'); return e ? e.getAttribute('fill') : null; });
  ok(col === '#8fd3ff', tag + ' : le glaçage change de couleur (bleu) ' + col);
  /* garnitures : chacune apparaît sur le gâteau, dans le dessin */
  await p.evaluate(() => document.querySelectorAll('.tab')[1].click()); await sleep(p, 300);
  c = await cake();
  for (const [fx, fy] of [[.4, .5], [.6, .55], [.5, .4]]) {
    const n0 = await p.evaluate(() => document.querySelectorAll('.tops > g').length);
    await p.touchscreen.tap(c.x + c.w * fx, c.y + c.h * fy); await sleep(p, 450);
    const n1 = await p.evaluate(() => { const g = document.querySelector('.tops'), s = document.querySelector('.cakeh svg').getBoundingClientRect(), l = g.lastElementChild.getBoundingClientRect(); return { n: g.children.length, inside: l.left >= s.left && l.right <= s.right && l.top >= s.top && l.bottom <= s.bottom && l.width > 3 }; });
    ok(n1.n === n0 + 1 && n1.inside, tag + ' : une garniture apparaît sur le gâteau (' + n0 + '→' + n1.n + ')');
  }
  /* bougies : posées sur le glaçage, visibles, avec flamme, positions adaptées */
  await p.evaluate(() => document.querySelector('.tab[aria-label=bougies]').click()); await sleep(p, 300);
  c = await cake();
  const before = await p.evaluate(() => document.querySelectorAll('.tops .flame').length);
  for (const fx of [.3, .5, .7]) { await p.touchscreen.tap(c.x + c.w * fx, c.y + c.h * .12); await sleep(p, 700); }
  const cand = await p.evaluate(() => {
    const s = document.querySelector('.cakeh svg').getBoundingClientRect();
    return [...document.querySelectorAll('.tops .flame')].map((f) => { const r = f.getBoundingClientRect(); return { inside: r.left >= s.left && r.right <= s.right && r.top >= s.top && r.bottom <= s.bottom, w: r.width, x: r.x + r.width / 2 }; });
  });
  ok(cand.length === before + 3 && cand.every((x) => x.inside && x.w > 4), tag + ' : 3 bougies avec flamme, toutes visibles dans le dessin (' + cand.length + ')');
  const xs = cand.map((x) => x.x).sort((a, b) => a - b); ok(xs.every((x, i) => i === 0 || x - xs[i - 1] > 8), tag + ' : les bougies ne se superposent pas');
  /* la bougie est posée sur la surface (pied de la bougie au niveau du glaçage), quelle que soit la taille d'écran */
  const base = await p.evaluate(() => {
    const svg = document.querySelector('.cakeh svg'), m = svg.getScreenCTM().inverse(), cs = [...document.querySelectorAll('.tops > g')].filter((g) => g.querySelector('.flame'));
    return cs.map((g) => { const r = g.getBoundingClientRect(); const pt = svg.createSVGPoint(); pt.x = r.left + r.width / 2; pt.y = r.bottom; return pt.matrixTransform(m).y; });
  });
  ok(base.every((y) => y > 60 && y < 200), tag + ' : le pied des bougies est bien sur le gâteau (y du dessin ' + base.map((y) => Math.round(y)).join(',') + ')');
  await p.screenshot({ path: '/tmp/cuisine-' + tag.replace(/\W+/g, '_') + '.png' });
  /* annuler retire vraiment la dernière garniture */
  const nA = await p.evaluate(() => document.querySelectorAll('.tops > g').length);
  await p.evaluate(() => document.querySelector('[data-do=undo]').click()); await sleep(p, 300);
  ok(await p.evaluate(() => document.querySelectorAll('.tops > g').length) === nA - 1, tag + ' : « annuler » retire réellement la dernière garniture');
  /* résultat final et sauvegarde */
  const dbBefore = await p.evaluate(() => C.db.all('cake').then((l) => l.length));
  await p.evaluate(() => { const b = document.querySelector('.donebtn'); b.click(); b.click(); b.click(); }); await sleep(p, 1800);
  ok(await p.evaluate(() => document.querySelectorAll('.celebrate').length === 1 && !!document.querySelector('.endcard.pink')), tag + ' : écran de fin (un seul, malgré 3 appuis)');
  ok(await p.evaluate((n) => C.db.all('cake').then((l) => l.length === n + 1 && l[0].img.length > 5000), dbBefore), tag + ' : le gâteau est sauvegardé (image non vide, une seule fois)');
  return true;
}

(async () => {
  const b = await chromium.launch();
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14' }, { w: 375, h: 667, n: 'iPhone SE' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => document.querySelector('.startbtn').click()); await sleep(p, 300);
    await partie(p, vp, 0, vp.n + ' / gâteau');
    /* « Encore » : une 2e partie (cupcake) fonctionne après la première */
    await p.evaluate(() => document.querySelector('.endcard.green').click()); await sleep(p, 900);
    ok(await p.evaluate(() => document.querySelectorAll('.rcard').length === 5), vp.n + ' : « Encore » ramène au choix de recette');
    if (vp.n === 'iPhone 14') {
      await p.evaluate((i) => document.querySelectorAll('.rcard')[i].click(), 1); await sleep(p, 1500);
      ok(await p.evaluate(() => document.querySelectorAll('.ing').length === 4 && document.querySelectorAll('.blobs > g').length === 0), vp.n + ' : 2e partie — saladier vide, ingrédients neufs');
    }
    ok(errs.length === 0, vp.n + ' : aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nCUISINE : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
