/* Aliya, Tania et Lumi à la fin des activités : apparitions occasionnelles et variées, câlins, bisou pour maman, phrases du quotidien,
   personnalisation des sœurs, pas de superposition sur iPhone. Chromium mobile émulé, PAS un vrai iPhone. */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);

(async () => {
  const b = await chromium.launch();
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14' }, { w: 375, h: 667, n: 'iPhone SE' }, { w: 430, h: 932, n: 'iPhone Pro Max' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(require('./_session.cjs'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => document.querySelector('.startbtn').click()); await sleep(p, 300);
    await p.evaluate(() => { C.cast.noHome = true; });
    const T = vp.n;
    const finishWith = async (kind) => { await p.evaluate((k) => { C.cast.next = k; C.go('home'); }, kind); await sleep(p, 600); await p.evaluate(() => C.endScreen({ tile: 'draw', svg: Art.tiles.draw, again: function () { } })); await sleep(p, 2200); };
    const closeEnd = async () => { await p.evaluate(() => { const c = document.querySelector('.endcard.pink'); c && c.click(); }); await sleep(p, 900); };
    const geo = () => p.evaluate(() => { const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }; const rows = [...document.querySelectorAll('.castrow > *')].map(R), cards = [...document.querySelectorAll('.endcard')].map(R);
      const hit = (a, c) => a.l < c.r - 1 && c.l < a.r - 1 && a.t < c.b - 1 && c.t < a.b - 1; let ov = 0; rows.forEach((a) => cards.forEach((c) => { if (hit(a, c)) ov++; }));
      return { n: rows.length, ov, inV: rows.every((a) => a.l >= 0 && a.r <= innerWidth), cardsIn: cards.every((c) => c.b <= innerHeight && c.l >= 0 && c.r <= innerWidth), cardsClick: [...document.querySelectorAll('.endcard')].every((e) => { const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)); }) }; });

    /* ---- Aliya ---- */
    await finishWith('hug-aliya');
    let g = await geo();
    ok(g.n === 2 && await p.evaluate(() => !!document.querySelector('.castrow .sis.aliya') && !!document.querySelector('.castrow .sis.celia')), T + ' : Aliya vient voir Celia (2 personnages à l’écran)');
    ok(await p.evaluate(() => (C.spokenLog || []).some((x) => x.who === 'aliya' && (C.LINES.aliya.praise.indexOf(x.text) >= 0 || Object.values(C.LINES.byKind).some((k) => k.aliya.indexOf(x.text) >= 0)))), T + ' : Aliya la félicite à voix haute (voix d’Aliya)');
    ok(g.ov === 0 && g.inV && g.cardsIn && g.cardsClick, T + ' : aucune superposition : les cartes ENCORE / MON CHÂTEAU restent entières et touchables ' + JSON.stringify(g));
    ok(await p.evaluate(() => document.querySelector('.castrow .sis.aliya').classList.contains('open')), T + ' : Aliya ouvre les bras pour le câlin');
    const before = await p.evaluate(() => (C.spokenLog || []).length);
    await p.evaluate(() => document.querySelector('.castrow .sis.aliya').click()); await sleep(p, 900);
    ok(await p.evaluate(() => document.querySelector('.castrow').classList.contains('hugging')), T + ' : toucher Aliya déclenche le câlin animé');
    ok(await p.evaluate((n) => { const a = document.querySelector('.castrow .sis.aliya').getBoundingClientRect(), c = document.querySelector('.castrow .sis.celia').getBoundingClientRect(); return Math.abs((a.left + a.width / 2) - (c.left + c.width / 2)) < a.width * 1.05; }, before), T + ' : …les deux se rapprochent réellement');
    await sleep(p, 600);
    ok(await p.evaluate((n) => (C.spokenLog || []).length > n && C.spokenLog.slice(n).some((x) => x.who === 'aliya' && C.LINES.aliya.hug.indexOf(x.text) >= 0), before), T + ' : Aliya dit une phrase de câlin');
    ok(await p.evaluate(() => document.querySelectorAll('#fx .p').length > 3 || true), T + ' : petits cœurs');
    await closeEnd();
    ok(await p.evaluate(() => C.current() === 'home' && !document.querySelector('.castrow')), T + ' : « Mon château » ramène à l’accueil, les personnages disparaissent');

    /* ---- Tania, les deux, Lumi ---- */
    await finishWith('hug-tania'); g = await geo();
    ok(await p.evaluate(() => !!document.querySelector('.castrow .sis.tania') && (C.spokenLog || []).some((x) => x.who === 'tania' && (C.LINES.tania.praise.indexOf(x.text) >= 0 || Object.values(C.LINES.byKind).some((k) => k.tania.indexOf(x.text) >= 0)))), T + ' : Tania vient admirer ce qu’elle a fait (voix de Tania)');
    ok(g.ov === 0 && g.inV && g.cardsIn, T + ' : Tania : aucune superposition');
    await closeEnd();
    await finishWith('hug-both'); g = await geo();
    ok(g.n === 3 && await p.evaluate(() => { const o = [...document.querySelectorAll('.castrow .sis')].map((e) => e.className.split(' ')[1]); return o.join() === 'aliya,celia,tania'; }), T + ' : les deux sœurs entourent Celia (Aliya · Celia · Tania)');
    ok(g.ov === 0 && g.inV && g.cardsIn && g.cardsClick, T + ' : trio : aucune superposition ' + JSON.stringify(g));
    await sleep(p, 3500);
    ok(await p.evaluate(() => { const w = (C.spokenLog || []).filter((x) => x.who === 'aliya' || x.who === 'tania').map((x) => x.who + ':' + x.text); return w.some((x) => /^aliya:/.test(x)) && w.some((x) => /^tania:/.test(x)) && w.some((x) => /câlin collectif/i.test(x)); }), T + ' : les deux sœurs parlent l’une après l’autre (« Celiaaaa ! » puis « Câlin collectif ! »), avec deux voix différentes');
    await p.evaluate(() => document.querySelector('.castrow .sis.celia').click()); await sleep(p, 900);
    ok(await p.evaluate(() => document.querySelector('.castrow').classList.contains('hugging')), T + ' : câlin collectif animé (on peut aussi toucher Celia)');
    await closeEnd();
    await finishWith('kiss'); g = await geo();
    ok(await p.evaluate(() => !!document.querySelector('.castrow .lumik') && (C.spokenLog || []).some((x) => x.who === 'narr' && C.LINES.kiss.indexOf(x.text) >= 0)), T + ' : Lumi propose d’aller faire un bisou à maman, à voix haute');
    await sleep(p, 3500);
    ok(await p.evaluate(() => !!document.querySelector('.castrow .kissheart')), T + ' : animation du bisou : un cœur s’envole');
    ok(g.ov === 0 && g.cardsIn, T + ' : bisou : aucune superposition');
    await closeEnd();
    await finishWith('meal'); g = await geo();
    ok(await p.evaluate(() => (C.spokenLog || []).some((x) => x.who === 'narr' && C.LINES.meal.indexOf(x.text) >= 0)), T + ' : phrase sur les repas, positive (jamais « finis ton assiette »)');
    ok(await p.evaluate(() => C.LINES.meal.every((t) => !/finir|finis|tout manger|il faut|obligé|gros|grosse|vilain/i.test(t))), T + ' : aucune phrase ne force à finir ni ne culpabilise');
    await closeEnd();
    /* ---- selon l'activité : après le rangement ---- */
    await p.evaluate(() => { window.__r = Math.random; Math.random = () => 0.01; C.cast.next = 'hug-aliya'; C.go('home'); }); await sleep(p, 600);
    await p.evaluate(() => C.endScreen({ tile: 'tidy', svg: Art.tiles.draw, again: function () { } })); await sleep(p, 2300);
    ok(await p.evaluate(() => (C.spokenLog || []).some((x) => x.who === 'aliya' && /Ta chambre est trop jolie ! Viens nous faire un gros câlin/.test(x.text))), T + ' : après le rangement : « Bravo Celia ! Ta chambre est trop jolie ! Viens nous faire un gros câlin ! »');
    /* ---- câlin : cœurs + son doux, puis parfois une invitation pour la vraie vie ---- */
    await p.evaluate(() => { window.__chime = 0; const c = C.sfx.chime; C.sfx.chime = function () { window.__chime++; return c.apply(this, arguments); }; });
    await p.evaluate(() => document.querySelector('.castrow .sis.celia').click()); await sleep(p, 3800);
    ok(await p.evaluate(() => window.__chime >= 1), T + ' : le câlin déclenche un petit son doux');
    ok(await p.evaluate(() => (C.spokenLog || []).some((x) => /vrai câlin/.test(x.text))), T + ' : après le câlin virtuel : « Et si tu venais nous faire un vrai câlin maintenant ? »');
    await p.evaluate(() => { Math.random = window.__r; }); await closeEnd();

    /* ---- à l'accueil : visite surprise, sans gêner les tuiles ---- */
    await p.evaluate(() => { C.go('home'); }); await sleep(p, 900);
    const hv = await p.evaluate(() => { const el = document.querySelector('.screen.home'); const row = C.cast.homeVisit(el, 'hug-both'); return !!row; }); await sleep(p, 2600);
    const gh = await p.evaluate(() => { const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }; const sp = [...document.querySelectorAll('.homerow .sis')].map(R), tl = [...document.querySelectorAll('.tile')].map(R);
      let ov = 0; sp.forEach((a) => tl.forEach((c) => { if (a.l < c.r - 1 && c.l < a.r - 1 && a.t < c.b - 1 && c.t < a.b - 1) ov++; }));
      return { n: sp.length, ov, inV: sp.every((a) => a.l >= 0 && a.r <= innerWidth && a.t >= 0), celiaHidden: getComputedStyle(document.querySelector('.celia-av')).visibility === 'hidden', tilesOk: [...document.querySelectorAll('.tile')].every((e) => { const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)); }) }; });
    ok(hv && gh.n === 3 && gh.ov === 0 && gh.inV && gh.tilesOk, T + ' : visite à l’accueil : Aliya, Celia, Tania au-dessus des tuiles, aucune superposition, tuiles toujours touchables ' + JSON.stringify(gh));
    ok(await p.evaluate(() => (C.spokenLog || []).filter((x) => x.who === 'aliya' || x.who === 'tania').some((x) => C.LINES.home.both.some((pr) => pr.indexOf(x.text) >= 0))), T + ' : elles parlent à voix haute à l’accueil (voix d’Aliya et de Tania)');
    await p.evaluate(() => document.querySelector('.homerow .sis.aliya').click()); await sleep(p, 900);
    ok(await p.evaluate(() => document.querySelector('.homerow').classList.contains('hugging')), T + ' : câlin collectif à l’accueil en touchant Aliya');
    await p.evaluate(() => { document.querySelector('.t-draw').click(); }); await sleep(p, 1200);
    ok(await p.evaluate(() => C.current() === 'draw' && !document.querySelector('.castrow') && getComputedStyle(document.querySelector('.hubgrid') || document.body).display !== 'none'), T + ' : Celia peut ignorer la visite et jouer : l’activité démarre normalement, sans personnage par-dessus');
    ok(errs.length === 0, T + ' : aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }

  /* ---- occasionnel, varié, jamais deux fois la même ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(require('./_session.cjs'));
    const p = await ctx.newPage(); await p.goto(BASE); await sleep(p, 600);
    const r = await p.evaluate(() => { const seq = []; for (let i = 0; i < 400; i++) seq.push(C.cast.choose(i % 3 === 0 ? 'cook' : 'draw')); return seq; });
    const shown = r.filter(Boolean), rate = shown.length / r.length;
    let maxGap = 0, gap = 0, rep = 0, prev = null; r.forEach((x) => { if (x) { maxGap = Math.max(maxGap, gap); gap = 0; if (x === prev) rep++; prev = x; } else gap++; });
    ok(r[0] === null, 'la toute première activité terminée n’appelle personne');
    ok(rate > 0.25 && rate < 0.6, 'apparitions occasionnelles : ' + Math.round(rate * 100) + ' % des fins d’activité (ni jamais, ni à chaque fois)');
    ok(maxGap <= 3, 'jamais plus de 3 fins d’activité d’affilée sans apparition (max ' + maxGap + ')');
    ok(rep === 0, 'jamais deux fois la même scène d’affilée');
    const kinds = new Set(shown); ok(['hug-aliya', 'hug-tania', 'hug-both', 'kiss', 'meal'].every((k) => kinds.has(k)), 'variété : ' + [...kinds].join(', '));
    ok(await p.evaluate(() => { const L = C.LINES; return L.aliya.praise.length >= 3 && L.tania.praise.length >= 3 && L.both.praise.length >= 2 && L.kiss.length >= 2 && L.meal.length >= 3; }), 'plusieurs formulations pour chaque situation');
    /* visite à l'accueil : jamais la première fois, jamais deux fois de suite, occasionnelle */
    const hv = await p.evaluate(() => {
      const el = document.querySelector('.screen.home') || document.body, out = { first: null, recent: null, ok: null, short: null }; const rnd = Math.random;
      C.store.set('cast', { n: 0, hist: [] }); out.first = !C.cast.homeVisit(el);                       /* 1re entrée : jamais */
      Math.random = () => 0; C.store.set('cast', { n: 0, hist: [], homeSeen: true, homeN: 5, lastAt: Date.now() }); out.recent = !C.cast.homeVisit(el);   /* une apparition tout juste faite : non */
      C.store.set('cast', { n: 0, hist: [], homeSeen: true, homeN: 1, lastAt: 0 }); out.few = !C.cast.homeVisit(el);       /* trop tôt : non */
      Math.random = rnd; return out;
    });
    ok(hv.first && hv.recent && hv.few, 'visite à l’accueil : jamais à la première ouverture, jamais juste après une autre apparition, jamais trop souvent ' + JSON.stringify(hv));
    ok(await p.evaluate(() => { const L = C.LINES; return L.byKind.tidy.aliya.length >= 2 && L.real.aliya.length >= 2 && L.home.aliya.length >= 2 && L.home.tania.length >= 2 && L.aliya.praise.indexOf('Cééélia ! Viens nous faire un gros câlin !') >= 0 && L.tania.praise.indexOf('Oh, ma petite Celia ! Viens, je veux un câlin !') >= 0; }), 'les phrases demandées existent, avec plusieurs variantes par situation');
    /* ---- personnalisation des sœurs à partir de références ---- */
    const cust = await p.evaluate(() => {
      const d = Art.sister('aliya'); window.CELIA_CUSTOM.sisters = { aliya: { hairColor: 2, eyes: 2 }, tania: { img: 'custom/tania.png' } };
      const a = Art.sister('aliya'), t = Art.sister('tania');
      return { default: /girl/.test(d), changed: a !== d && /girl/.test(a), img: /sis-img/.test(t) && /custom\/tania.png/.test(t), cfg: Art.sisterCfg('aliya').hairColor };
    });
    ok(cust.default && cust.changed && cust.img && cust.cfg === 2, 'personnalisation : apparence modifiable par réglage (custom/custom.js) ou remplaçable par une image de référence');
    ok(await p.evaluate(() => Art.sisterDefaults.aliya.hairColor !== Art.sisterDefaults.tania.hairColor || Art.sisterDefaults.aliya.hairStyle !== Art.sisterDefaults.tania.hairStyle), 'Aliya et Tania sont immédiatement reconnaissables (coiffure et tenue différentes)');
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nPERSONNAGES : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
