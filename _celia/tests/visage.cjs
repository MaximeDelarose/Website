/* Visage de Celia (maquillage + dressing) : la couleur des yeux change VRAIMENT et visiblement (mesurée sur l'image rendue),
   plusieurs changements successifs, partage avec le dressing, toutes les coiffures / peaux, maquillage + couronne sans défaut.
   Chromium mobile émulé, PAS un vrai iPhone. */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
const hue = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };
const hexHue = (h) => hue([parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const dh = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
/* couleur réellement rendue dans l'iris (SVG -> image -> pixel) */
const irisPx = (p) => p.evaluate(async () => {
  const url = await C.rasterSvg(document.querySelector('.mkface svg'), 300, 340, function () { });
  const im = new Image(); await new Promise((r) => { im.onload = r; im.src = url; });
  const cv = document.createElement('canvas'); cv.width = 300; cv.height = 340; const x = cv.getContext('2d'); x.drawImage(im, 0, 0, 300, 340);
  const q = (a, b) => Array.from(x.getImageData(a, b, 1, 1).data).slice(0, 3); return { L: q(100, 212), R: q(200, 212) };
});

(async () => {
  const b = await chromium.launch();
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14' }, { w: 375, h: 667, n: 'iPhone SE' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await ctx.addInitScript(require('./_session.cjs'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => document.querySelector('.startbtn').click()); await sleep(p, 300);
    await p.evaluate(() => document.querySelector('.t-makeup').click()); await sleep(p, 1200);
    const T = vp.n;
    ok(await p.evaluate(() => document.querySelectorAll('.tab').length === 8 && [...document.querySelectorAll('.tab')].every((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width >= 36; })), T + ' : 8 onglets tous visibles et touchables, dont « yeux »');
    await p.evaluate(() => document.querySelector('.tab[aria-label=eyes]').click()); await sleep(p, 300);
    const sw = await p.evaluate(() => [...document.querySelectorAll('.swrow .it')].map((e) => e.style.getPropertyValue('--c')));
    ok(sw.length === 6, T + ' : 6 couleurs d’yeux proposées (marron, noisette, bleu, vert, violet, rose)');
    /* marron → bleu → vert → violet → rose → marron : à chaque fois l'iris rendu a la bonne teinte */
    const seq = [0, 2, 3, 4, 5, 0]; const names = ['marron', 'bleu', 'vert', 'violet', 'rose', 'marron']; let prev = null;
    for (let k = 0; k < seq.length; k++) {
      const i = seq[k];
      await p.evaluate((i) => document.querySelectorAll('.swrow .it')[i].click(), i); await sleep(p, 350);
      const px = await irisPx(p), want = hexHue(sw[i].trim());
      const good = dh(hue(px.L), want) < 18 && dh(hue(px.R), want) < 18;
      ok(good, T + ' : yeux ' + names[k] + ' : l’iris affiché a la bonne couleur (teinte ' + Math.round(hue(px.L)) + '° / attendu ' + Math.round(want) + '°)');
      if (prev) ok(dh(hue(px.L), prev) > 10 || k === 5, T + ' : …et ça a vraiment changé par rapport à avant');
      prev = hue(px.L);
      ok(await p.evaluate((i) => C.profile.eyes === i && document.querySelectorAll('.swrow .it.on').length === 1, i), T + ' : la couleur choisie est mémorisée et marquée comme active');
    }
    /* toucher les yeux dans ce mode applique la couleur choisie (aussi) */
    await p.evaluate(() => document.querySelectorAll('.swrow .it')[2].click()); await sleep(p, 300);
    const r = await p.evaluate(() => { const e = document.querySelector('.mkface').getBoundingClientRect(); return { x: e.x, y: e.y, w: e.width, h: e.height }; });
    await p.touchscreen.tap(r.x + r.w * 112 / 300, r.y + r.h * 204 / 340); await sleep(p, 300);
    ok(await p.evaluate(() => C.profile.eyes === 2), T + ' : toucher l’œil garde la couleur choisie (bleu)');
    /* partage avec le dressing */
    await p.evaluate(() => document.querySelector('#btnHome').click()); await sleep(p, 800);
    await p.evaluate(() => document.querySelector('.t-dress').click()); await sleep(p, 1000);
    ok(await p.evaluate(() => { const e = document.querySelector('.dollwrap svg .eyes'); return !!e && /#4b9be8/i.test(e.innerHTML); }), T + ' : le dressing montre la même couleur d’yeux (bleu)');
    ok(await p.evaluate(() => { document.querySelector('.tab[data-c=me]').click(); return document.querySelectorAll('.items .it.round').length >= 18; }), T + ' : dressing : couleurs de peau, d’yeux et de cheveux au même endroit');
    ok(errs.length === 0, T + ' : aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }

  /* ---- toutes les coiffures, toutes les peaux, avec maquillage et couronne : rien de cassé ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(require('./_session.cjs'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => document.querySelector('.startbtn').click());
    const res = await p.evaluate(() => {
      const bad = []; const F = Art.face, G = Art.dress;
      G.hairStyles.forEach((h) => [0, 1, 2, 3, 4].forEach((sk) => [0, 3, 6].forEach((hc) => G.eyeColors.forEach((_, ey) => {
        const svg = F.render(F.base, { hairStyle: h, skin: sk, hairColor: hc, eyes: ey, lips: '#e0213f', blush: '#ff8a8a', shadow: '#c4a8ff', top: '#8fd0ff' });
        if (!/id="mk-lips"/.test(svg) || !/id="mk-blush"/.test(svg) || /undefined|NaN/.test(svg)) bad.push(h + sk + hc + ey);
        const d = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + svg + '</svg>', 'image/svg+xml'); if (d.querySelector('parsererror')) bad.push('xml ' + h + sk);
      }))));
      return { n: G.hairStyles.length, bad: bad.slice(0, 5) };
    });
    ok(res.n === 6 && res.bad.length === 0, 'visage : 6 coiffures × 5 peaux × couleurs × 6 yeux, avec maquillage : SVG valide et complet ' + res.bad.join(','));
    ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nVISAGE : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
