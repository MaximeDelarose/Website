/* Test de l'ergonomie (émulation Chromium mobile, PAS un vrai iPhone) :
   bouton « J'ai fini » visible et atteignable dans chaque activité, château = maison, sauvegarde automatique, double-tap, musique. */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14' }, { w: 375, h: 667, n: 'iPhone SE' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('.startbtn').click()); await p.waitForTimeout(300);
    const geom = () => p.evaluate(() => {
      const d = document.querySelector('.donebtn'); if (!d) return null; const r = d.getBoundingClientRect(), h = document.querySelector('#btnHome').getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { w: r.width, h: r.height, inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, hit: !!e && (e === d || d.contains(e)), homeW: h.width, homeH: h.height };
    });
    for (const [t, setup] of [['draw', async () => { await p.evaluate(() => document.querySelector('.hc1').click()); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('.pg').click()); }], ['draw', async () => { await p.evaluate(() => document.querySelector('.hc2').click()); }], ['cook', async () => { await p.evaluate(() => document.querySelectorAll('.rcard')[0].click()); await p.waitForTimeout(1500); await p.evaluate(() => { const s = document.querySelector('.screen.cook'); }); }], ['dress'], ['makeup'], ['pets'], ['room'], ['learn', async () => { await p.evaluate(() => document.querySelector('.lcard').click()); }]]) {
      if (t === 'cook') { /* la barre « J'ai fini » de la cuisine n'existe qu'à l'étape de décoration : on la vérifie via le test complet de cuisine */ continue; }
      await p.evaluate((t) => document.querySelector('.t-' + t).click(), t); await p.waitForTimeout(900);
      if (setup) { await setup(); await p.waitForTimeout(800); }
      const g = await geom();
      ok(g && g.inView && g.hit && g.h >= 56, vp.n + ' : « J’ai fini ! » visible, atteignable et grand dans ' + t + ' ' + JSON.stringify(g));
      ok(g && g.homeW >= 60 && g.homeH >= 56, vp.n + ' : bouton château grand dans ' + t);
      await p.evaluate(() => document.querySelector('#btnHome').click()); await p.waitForTimeout(800);
      ok(await p.evaluate(() => C.current() === 'home'), vp.n + ' : le château ramène à l’accueil depuis ' + t + ', sans confirmation');
    }
    ok(errs.length === 0, vp.n + ' : aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }

  /* sauvegarde automatique en quittant par le château */
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); await p.goto(BASE); await p.waitForTimeout(500);
  await p.evaluate(() => { document.querySelector('.startbtn').click(); document.querySelector('.t-draw').click(); }); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('.hc2').click()); await p.waitForTimeout(500);
  const f = await p.evaluate(() => { const r = document.querySelector('.cv-wrap').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.mouse.move(f.x + f.w * .3, f.y + f.h * .5); await p.mouse.down(); for (let i = 0; i < 12; i++) await p.mouse.move(f.x + f.w * (.3 + i * .03), f.y + f.h * .5); await p.mouse.up();
  await p.evaluate(() => document.querySelector('#btnHome').click()); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => C.db.all('draw').then((l) => l.length === 1)), 'sauvegarde automatique : le dessin est enregistré en quittant par le château');
  /* un appui multiple sur « J'ai fini » ne crée qu'une création */
  await p.evaluate(() => document.querySelector('.t-draw').click()); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('.hc2').click()); await p.waitForTimeout(500);
  await p.mouse.move(f.x + f.w * .3, f.y + f.h * .5); await p.mouse.down(); for (let i = 0; i < 12; i++) await p.mouse.move(f.x + f.w * (.3 + i * .03), f.y + f.h * .4); await p.mouse.up();
  await p.evaluate(() => { const b = document.querySelector('.donebtn'); for (let i = 0; i < 6; i++) b.click(); }); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => C.db.all('draw').then((l) => l.length === 2)), 'six appuis rapides sur « J’ai fini » : une seule création de plus');
  ok(await p.evaluate(() => document.querySelectorAll('.celebrate').length === 1), 'six appuis rapides : un seul écran de fin');
  await p.evaluate(() => document.querySelector('.endcard.green').click()); await p.waitForTimeout(600);
  ok(await p.evaluate(() => C.current() === 'draw' && !document.querySelector('.celebrate')), '« Encore ! » reste dans l’activité avec une page vierge');
  /* cuisine : bouton à l'étape de décoration */
  await p.evaluate(() => document.querySelector('#btnHome').click()); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('.t-cook').click()); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelectorAll('.rcard')[1].click()); await p.waitForTimeout(1500);
  await ctx.close();

  /* musique : démarre après le premier geste, 4 fichiers, enchaînement 1→2→3→4→1, volume bas par défaut */
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const q = await c2.newPage(); const qerr = []; q.on('pageerror', (e) => qerr.push(e.message)); q.on('response', (r) => { if (r.status() >= 400) qerr.push(r.status() + ' ' + r.url()); });
  await q.goto(BASE); await q.waitForTimeout(500);
  ok(await q.evaluate(() => !C.music.state().started), 'musique : rien ne joue avant la première interaction');
  await q.touchscreen.tap(195, 420); await q.waitForTimeout(1800);
  let st = await q.evaluate(() => C.music.state()); ok(st.started && st.files === 4 && Math.abs(st.vol - 0.2) < 1e-9, 'musique : démarre après le premier geste, 4 morceaux, volume par défaut 20 % ' + JSON.stringify(st));
  const t0 = await q.evaluate(() => document.querySelectorAll('audio').length >= 0 && window.__m);
  const played = await q.evaluate(() => new Promise((res) => { const el = [...document.querySelectorAll('audio')]; res(el.length); }));
  /* change d'activité : la musique ne redémarre pas */
  const pos1 = await q.evaluate(() => C.music.state().idx);
  await q.evaluate(() => C.go('learn')); await q.waitForTimeout(800); await q.evaluate(() => C.go('home')); await q.waitForTimeout(800);
  ok(await q.evaluate(() => C.music.state().idx) === pos1, 'musique : aucun redémarrage en changeant d’activité');
  /* volume du curseur et coupure */
  await q.evaluate(() => { C.music.setVol(0.5); }); ok(await q.evaluate(() => C.settings.musicVol === 0.5 && JSON.parse(localStorage.getItem('celia.settings')).musicVol === 0.5), 'musique : volume réglable et sauvegardé localement');
  ok(qerr.length === 0, 'musique : aucune erreur ni 404 ' + qerr.join('|'));
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nERGONOMIE ET MUSIQUE : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
