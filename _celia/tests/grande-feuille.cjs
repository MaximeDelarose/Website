/* Dessin libre : GRANDE feuille + mode « Grande feuille » (plein écran). Chromium mobile émulé, PAS un vrai iPhone.
   Vérifie : feuille ≥ 55 % de la hauteur, dessin possible sur toute la surface, tailles de pinceau, mode plein écran (outils cachés,
   petite palette, retour), dessin conservé à l'aller et au retour (même quand on a dessiné dans la partie ajoutée), enregistrement + rechargement. */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
const rect = (p, sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; }, sel);
const alphaIn = (p, x0, y0, w, h) => p.evaluate(([x0, y0, w, h]) => { const c = document.querySelector('.cv-free'), d = c.getContext('2d').getImageData(x0, y0, Math.min(w, c.width - x0), Math.min(h, c.height - y0)).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; }, [x0, y0, w, h]);
async function stroke(p, c, pts) { await p.mouse.move(c.x + c.w * pts[0][0], c.y + c.h * pts[0][1]); await p.mouse.down(); for (const q of pts.slice(1)) await p.mouse.move(c.x + c.w * q[0], c.y + c.h * q[1], { steps: 6 }); await p.mouse.up(); await sleep(p, 120); }

(async () => {
  const b = await chromium.launch();
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14' }, { w: 375, h: 667, n: 'iPhone SE' }, { w: 430, h: 932, n: 'iPhone Pro Max' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await ctx.addInitScript(require('./_session.cjs'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => document.querySelector('.startbtn').click()); await sleep(p, 300);
    await p.evaluate(() => document.querySelector('.t-draw').click()); await sleep(p, 900);
    await p.evaluate(() => document.querySelector('.hc2').click()); await sleep(p, 900);
    const T = vp.n;

    /* ---- grande feuille ---- */
    let c = await rect(p, '.cv-wrap');
    ok(c.h >= vp.h * 0.55, T + ' : la feuille fait ' + Math.round(c.h / vp.h * 100) + ' % de la hauteur de l’écran (≥ 55 %)');
    ok(c.w >= vp.w * 0.75 && c.x >= 0 && c.r <= vp.w, T + ' : large (' + Math.round(c.w) + ' px) et entièrement visible');
    const tray = await rect(p, '.tray'); ok(c.b <= tray.y + 1, T + ' : le plateau ne masque pas la feuille');
    ok(await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), T + ' : aucun défilement involontaire');

    /* ---- le doigt dessine sur TOUTE la surface (coins compris) ---- */
    await stroke(p, c, [[.04, .03], [.5, .5], [.96, .97]]);
    await stroke(p, c, [[.96, .03], [.5, .5], [.04, .97]]);
    const W = 720, H = await p.evaluate(() => document.querySelector('.cv-free').height);
    const corners = await Promise.all([alphaIn(p, 0, 0, 90, 90), alphaIn(p, W - 90, 0, 90, 90), alphaIn(p, 0, H - 90, 90, 90), alphaIn(p, W - 90, H - 90, 90, 90)]);
    ok(corners.every((n) => n > 200), T + ' : dessin possible jusqu’aux 4 coins de la feuille (' + corners.join('/') + ')');
    /* tailles de pinceau */
    const szs = await p.evaluate(() => [...document.querySelectorAll('.szb')].map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, v: r.right <= innerWidth && r.left >= 0 }; }));
    ok(szs.length === 3 && szs.every((s) => s.w >= 34 && s.v), T + ' : 3 tailles de pinceau accessibles');
    const thick = async (k) => { await p.evaluate((k) => document.querySelectorAll('.szb')[k].click(), k); const cc = await rect(p, '.cv-wrap'); const before = await alphaIn(p, 0, 0, W, H); await stroke(p, cc, [[.2, .5 + k * .08], [.8, .5 + k * .08]]); return (await alphaIn(p, 0, 0, W, H)) - before; };
    const t0 = await thick(0), t2 = await thick(2);
    ok(t2 > t0 * 1.6, T + ' : la taille du trait change vraiment (' + t0 + ' → ' + t2 + ' px)');
    await p.evaluate(() => document.querySelectorAll('.szb')[1].click());

    /* ---- mode « Grande feuille » ---- */
    const before = await alphaIn(p, 0, 0, W, 960);
    const hudBefore = await p.evaluate(() => getComputedStyle(document.querySelector('#hud')).display);
    await p.evaluate(() => document.querySelector('.expbtn').click()); await sleep(p, 600);
    c = await rect(p, '.cv-wrap');
    const full = await p.evaluate(() => ({ tools: [...document.querySelectorAll('.tool')].every((e) => e.offsetParent === null), hud: getComputedStyle(document.querySelector('#hud')).display, pal: (() => { const e = document.querySelector('.palette'); const r = e.getBoundingClientRect(); return !e.hidden && r.height > 30 && r.bottom <= innerHeight + 1; })(), back: document.querySelector('.expbtn').offsetParent !== null, done: document.querySelector('.donebar').offsetParent === null }));
    ok(c.h >= vp.h * 0.72, T + ' : grande feuille : ' + Math.round(c.h / vp.h * 100) + ' % de la hauteur de l’écran (≥ 72 %)');
    ok(full.tools && full.hud === 'none' && full.done, T + ' : les outils secondaires et le menu du haut disparaissent');
    ok(full.pal && full.back, T + ' : une petite palette et le bouton de retour restent accessibles');
    ok(c.r <= vp.w && c.x >= 0 && c.b <= vp.h, T + ' : la feuille tient dans l’écran');
    ok((await alphaIn(p, 0, 0, W, 960)) === before, T + ' : le dessin est parfaitement conservé en passant en grande feuille');
    ok(await p.evaluate(() => document.querySelector('.cv-free').height) > 960, T + ' : la feuille est plus haute en grande feuille');
    /* dessiner dans la partie ajoutée, avec une autre couleur depuis la petite palette */
    await p.evaluate(() => document.querySelectorAll('.palette .sw')[1].click());
    c = await rect(p, '.cv-wrap');
    await stroke(p, c, [[.2, .93], [.8, .95]]);
    const Hfull = await p.evaluate(() => document.querySelector('.cv-free').height);
    const lowerN = await alphaIn(p, 0, 960, W, Hfull - 960);
    ok(lowerN > 800, T + ' : on peut dessiner sur toute la grande feuille, même tout en bas (' + lowerN + ' px)');
    /* retour */
    await p.evaluate(() => document.querySelector('.expbtn').click()); await sleep(p, 600);
    const back = await p.evaluate(() => ({ tools: [...document.querySelectorAll('.tool')].every((e) => e.offsetParent !== null), hud: getComputedStyle(document.querySelector('#hud')).display, h: document.querySelector('.cv-free').height }));
    ok(back.tools && back.hud === hudBefore, T + ' : retour à l’interface normale (outils et menu du haut réapparaissent)');
    ok((await alphaIn(p, 0, 0, W, 960)) === before, T + ' : le dessin du haut est identique après le retour');
    ok(back.h > 960 && await alphaIn(p, 0, 960, W, back.h - 960) === lowerN, T + ' : le dessin fait en bas n’est pas perdu : la feuille reste entière à l’écran');
    c = await rect(p, '.cv-wrap'); ok(c.b <= (await rect(p, '.tray')).y + 1 && c.r <= vp.w, T + ' : après le retour, la feuille ne passe pas sous les outils');

    /* ---- retour avec une feuille vide en bas : la feuille reprend sa taille normale ---- */
    await p.evaluate(() => { document.querySelector('[data-do=restart]').click(); }); await sleep(p, 300);
    await p.evaluate(() => document.querySelector('.confirm [data-ok], .confirm .btn.green, .modal .btn.green')?.click()); await sleep(p, 500);
    await p.evaluate(() => document.querySelector('.expbtn').click()); await sleep(p, 500);
    await p.evaluate(() => document.querySelector('.expbtn').click()); await sleep(p, 500);
    ok(await p.evaluate(() => document.querySelector('.cv-free').height) === 960, T + ' : feuille vide en bas : retour à la taille normale');

    /* ---- enregistrement et rechargement ---- */
    c = await rect(p, '.cv-wrap'); await stroke(p, c, [[.1, .2], [.9, .6]]);
    await p.evaluate(() => document.querySelector('.donebtn').click()); await sleep(p, 1500);
    ok(await p.evaluate(() => !!document.querySelector('.endcard.green')), T + ' : « ✓ J’ai fini ! » enregistre et ouvre l’écran de fin');
    await p.reload(); await sleep(p, 800);
    ok(await p.evaluate(() => C.db.all('draw').then((l) => l.length >= 1 && l[l.length - 1].img.length > 3000)), T + ' : le dessin est retrouvé après rechargement');
    ok(errs.length === 0, T + ' : aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nGRANDE FEUILLE : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
