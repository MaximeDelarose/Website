/* Test de fumée du Monde Magique de Célia (émulation Chromium mobile, PAS un vrai iPhone).
   Usage :  cd <dépôt> && python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node _celia/tests/smoke.cjs
   Vérifie : chemins relatifs sous /celia/, 8 activités sans erreur JS, remplissage du coloriage, dessin au doigt,
   sauvegarde/rechargement (IndexedDB), pas de débordement horizontal, et dimensions portrait + paysage. */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14 portrait' }, { w: 375, h: 667, n: 'iPhone SE portrait' }, { w: 844, h: 390, n: 'iPhone paysage' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    const errs = [], bad = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await p.goto(BASE); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('.startbtn').click());
    await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelectorAll('.tile').length === 8), vp.n + ' : 8 tuiles à l’accueil');
    for (const t of ['draw', 'cook', 'dress', 'makeup', 'pets', 'stories', 'learn', 'room']) {
      await p.evaluate((t) => document.querySelector('.t-' + t).click(), t); await p.waitForTimeout(900);
      const r = await p.evaluate(() => {
        const s = document.scrollingElement, over = document.documentElement.scrollWidth > innerWidth + 1;
        const hb = document.querySelector('#btnHome').getBoundingClientRect();
        return { over, home: hb.width > 40 && hb.top >= 0 };
      });
      ok(!r.over && r.home, vp.n + ' : ' + t + ' s’affiche, bouton maison visible, pas de défilement horizontal');
      await p.evaluate(() => document.querySelector('#btnHome').click()); await p.waitForTimeout(700);
    }
    ok(errs.length === 0, vp.n + ' : aucune erreur JavaScript ' + errs.join('|'));
    ok(bad.length === 0, vp.n + ' : aucune ressource 404 ' + bad.join('|'));
    await ctx.close();
  }

  /* coloriage, dessin libre, sauvegarde, rechargement */
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); await p.goto(BASE); await p.waitForTimeout(500);
  await p.evaluate(() => { document.querySelector('.startbtn').click(); document.querySelector('.t-draw').click(); }); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelector('.hc1').click()); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('.pg[data-id=fleur]').click()); await p.waitForTimeout(900);
  const r = await p.evaluate(() => { const r = document.querySelector('.cv-wrap').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.evaluate(() => document.querySelectorAll('.palette .sw')[0].click());
  await p.touchscreen.tap(r.x + r.w * 0.5, r.y + r.h * 0.37); await p.waitForTimeout(700); /* cœur de la fleur */
  const px = await p.evaluate(() => { const c = document.querySelector('.cv-color'), x = c.getContext('2d'); const a = x.getImageData(300, 220, 1, 1).data, o = x.getImageData(20, 20, 1, 1).data; return { inside: Array.from(a), outside: Array.from(o) }; });
  ok(px.inside[3] === 255 && px.inside[0] > 200, 'coloriage : la zone touchée est remplie ' + px.inside);
  ok(px.outside[3] === 0, 'coloriage : le remplissage ne déborde pas (fond intact) ' + px.outside);
  await p.evaluate(() => document.querySelector('.donebtn').click()); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => !!document.querySelector('.endcard.green') && !!document.querySelector('.endcard.pink')), 'fin : deux grandes cartes ENCORE / MON CHÂTEAU');
  await p.evaluate(() => document.querySelector('.endcard.pink').click()); await p.waitForTimeout(900);
  ok(await p.evaluate(() => C.current() === 'home'), 'fin : « Mon château » ramène à l\u2019accueil');
  await p.evaluate(() => document.querySelector('.t-draw').click()); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('.hc2').click()); await p.waitForTimeout(600);
  const f = await p.evaluate(() => { const r = document.querySelector('.cv-wrap').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.mouse.move(f.x + f.w * 0.2, f.y + f.h * 0.5); await p.mouse.down();
  for (let i = 0; i < 20; i++) await p.mouse.move(f.x + f.w * (0.2 + i * 0.03), f.y + f.h * 0.5);
  await p.mouse.up();
  const drawn = await p.evaluate(() => { const c = document.querySelector('.cv-free'), x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
  ok(drawn > 500, 'dessin libre : le trait suit le doigt (' + drawn + ' pixels)');
  await p.evaluate(() => { const b = document.querySelector('.donebtn'); b.click(); b.click(); b.click(); }); await p.waitForTimeout(1500);
  await p.reload(); await p.waitForTimeout(600);
  const saved = await p.evaluate(() => C.db.all().then((l) => l.map((x) => x.kind).sort().join(',')));
  ok(saved === 'color,draw', 'sauvegarde : les 2 créations sont retrouvées après rechargement (' + saved + ')');

  /* habillage sauvegardé */
  await p.evaluate(() => { document.querySelector('.startbtn').click(); document.querySelector('.t-dress').click(); }); await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelector('.tab[data-c=dress]').click(); setTimeout(() => document.querySelectorAll('.items .it')[3].click(), 100); }); await p.waitForTimeout(500);
  await p.reload(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => C.profile.outfit === 'd4'), 'tenue : la robe choisie est conservée après rechargement');
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nTOUT EST OK');
  process.exit(fails ? 1 : 0);
})();
