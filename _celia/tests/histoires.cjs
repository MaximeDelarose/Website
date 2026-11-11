/* Parcours complet des 4 histoires : chaque action produit un effet visible AVANT la validation ; les mauvaises réponses ne valident jamais.
   Usage : node _celia/tests/histoires.cjs [numéro d'histoire 0-3 …]   (Chromium mobile émulé, pas un vrai iPhone) */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const which = process.argv.slice(2).map(Number); const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => document.querySelector('.startbtn').click()); await sleep(p, 300);
  const n = await p.evaluate(() => (C.go('stories'), C.STORIES.length)); await sleep(p, 900);
  const nextShown = () => p.evaluate(() => !document.querySelector('.snext').hidden);
  const waitNext = async (ms) => { for (let t = 0; t < ms; t += 150) { if (await nextShown()) return true; await sleep(p, 150); } return false; };
  for (let s = 0; s < n; s++) {
    if (which.length && !which.includes(s)) continue;
    await p.evaluate(() => C.go('home')); await sleep(p, 700); await p.evaluate(() => C.go('stories')); await sleep(p, 900);
    const story = await p.evaluate((s) => C.STORIES[s].scenes.map((x) => ({ t: x.act.t, fx: x.act.fx, good: x.act.good, opts: x.act.opts && x.act.opts.length, items: x.act.items && x.act.items.length })), s);
    await p.evaluate((s) => document.querySelectorAll('.scard')[s].click(), s); await sleep(p, 900);
    for (let i = 0; i < story.length; i++) {
      const a = story[i], tag = 'histoire ' + (s + 1) + ' scène ' + (i + 1) + ' [' + a.t + (a.fx ? '/' + a.fx : '') + ']';
      ok(!(await nextShown()), tag + ' : rien n’est validé avant l’action');
      if (a.t === 'tap') {
        await p.evaluate(() => document.querySelector('.hot').click()); await sleep(p, 2000);
        const eff = await p.evaluate((fx) => ({ candles: document.querySelectorAll('.scandle').length, hearts: document.querySelectorAll('.sheart').length, stars: document.querySelectorAll('.sstar').length, uni: (() => { const u = document.querySelectorAll('.act1')[2]; if (!u) return null; const c = document.querySelectorAll('.act1')[0].getBoundingClientRect(), r = u.getBoundingClientRect(); return { inCastle: r.x + r.width / 2 > c.left && r.x + r.width / 2 < c.right && r.y + r.height / 2 > c.top && r.y + r.height / 2 < c.bottom }; })() }), a.fx);
        if (a.fx === 'candles') ok(eff.candles === 3, tag + ' : 3 bougies apparaissent sur le gâteau (' + eff.candles + ')');
        if (a.fx === 'hello') ok(eff.hearts >= 3, tag + ' : des cœurs apparaissent (' + eff.hearts + ')');
        if (a.fx === 'spit') ok(eff.stars === 5, tag + ' : 5 étoiles sont crachées (' + eff.stars + ')');
        if (a.fx === 'castle') ok(eff.uni && eff.uni.inCastle, tag + ' : la licorne entre dans le château');
      } else if (a.t === 'choose') {
        const wrong = a.good === 0 ? 1 : 0;
        await p.evaluate((w) => document.querySelectorAll('.pick')[w].click(), wrong); await sleep(p, 900);
        ok(!(await nextShown()), tag + ' : un mauvais choix n’est PAS validé');
        await p.evaluate((g) => document.querySelectorAll('.pick')[g].click(), a.good); await sleep(p, 1800);
        const moved = await p.evaluate((g) => { const o = document.querySelectorAll('.pick')[g].getBoundingClientRect(), t = document.querySelectorAll('.act1')[1].getBoundingClientRect(); return Math.hypot(o.x + o.width / 2 - t.x - t.width / 2, o.y + o.height / 2 - t.y - t.height * .55) < t.height * .6; }, a.good);
        ok(moved, tag + ' : le bon objet voyage jusqu’à la créature');
      } else if (a.t === 'collect') {
        await p.evaluate(() => document.querySelectorAll('.pick')[0].click()); await sleep(p, 1100);
        ok(!(await nextShown()), tag + ' : 1 objet sur ' + a.items + ' ne valide pas');
        await p.evaluate(() => { const b = [...document.querySelectorAll('.pick')]; b.slice(1).forEach((x) => x.click()); }); await sleep(p, 1500);
        ok(await p.evaluate(() => document.querySelectorAll('.sslots i.on').length) === a.items, tag + ' : les ' + a.items + ' cases sont remplies');
      } else if (a.t === 'dress') {
        const before = await p.evaluate(() => document.querySelector('.girl .outfit').innerHTML.length + ':' + document.querySelector('.girl .outfit').innerHTML.slice(0, 60));
        await p.evaluate(() => document.querySelector('.pick').click()); await sleep(p, 1500);
        const after = await p.evaluate(() => document.querySelector('.girl .outfit').innerHTML.length + ':' + document.querySelector('.girl .outfit').innerHTML.slice(0, 60));
        ok(before !== after, tag + ' : la robe change réellement sur la fillette');
      } else if (a.t === 'crown') {
        ok(await p.evaluate(() => !document.querySelector('.girl .crown')), tag + ' : pas de couronne avant');
        await p.evaluate(() => document.querySelectorAll('.pick')[0].click()); await sleep(p, 1500);
        ok(await p.evaluate(() => { const c = document.querySelector('.girl .crown'); return !!c && c.getBoundingClientRect().width > 8; }), tag + ' : la couronne apparaît sur la tête');
      } else if (a.t === 'dance') {
        await p.evaluate(() => document.querySelectorAll('.pick')[0].click()); await sleep(p, 1500);
        ok(await p.evaluate(() => getComputedStyle(document.querySelector('.girl .arm.l')).animationName !== 'none'), tag + ' : la fillette danse (bras animés)');
      } else if (a.t === 'end') { /* la narration finit toute seule, la flèche arrive */ }
      ok(await waitNext(a.t === 'end' ? 6000 : 3500), tag + ' : la suite apparaît après l’action réussie');
      await p.evaluate(() => document.querySelector('.snext').click()); await sleep(p, 900);
    }
    ok(await p.evaluate(() => !!document.querySelector('.endcard.green') && !!document.querySelector('.endcard.pink')), 'histoire ' + (s + 1) + ' : écran de fin ENCORE / MON CHÂTEAU');
    await p.evaluate(() => document.querySelector('.endcard.pink').click()); await sleep(p, 900);
  }
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close(); console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nHISTOIRES : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
