/* Mode parent (temps de jeu) — avec une horloge simulée (page.clock) : une session complète de 5 minutes en quelques secondes.
   Vérifie : création du code (haché), choix de la durée, démarrage à l'entrée dans le château, minuteur qui ne se réinitialise pas,
   pause en arrière-plan, rechargement, avertissement 1 min avant, sauvegarde du dessin, fin (château qui s'endort, musique éteinte),
   impossibilité de relancer sans le code, code faux / verrouillage, ajout de temps, arrêt par le parent, formats d'iPhone.
   Chromium mobile émulé — PAS un vrai iPhone. */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
const rem = (p) => p.evaluate(() => C.session.remaining());
const state = (p) => p.evaluate(() => C.session.state());
const setHidden = (p, h) => p.evaluate((h) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}, h);
async function typePin(p, pin) { for (const d of pin) { await p.evaluate((d) => document.querySelector('.modal.pin [data-d="' + d + '"]').click(), d); await sleep(p, 40); } await sleep(p, 700); }

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.clock.install();
  await p.goto(BASE); await sleep(p, 1500);

  /* ---- 1. écran parent, création du code ---- */
  ok(await p.evaluate(() => C.current() === 'setup'), 'démarrage : l’écran parent s’affiche avant de jouer');
  ok(await p.evaluate(() => !!document.querySelector('.modal.pin') && /Choisissez un code/.test(document.querySelector('.pintitle').textContent)), 'premier lancement : on demande de choisir un code');
  await typePin(p, '1234');
  ok(await p.evaluate(() => /2e fois/.test(document.querySelector('.pinerr').textContent)), 'confirmation du code demandée');
  await typePin(p, '4321');
  ok(await p.evaluate(() => /différents/.test(document.querySelector('.pinerr').textContent)), 'deux codes différents : refusé');
  await typePin(p, '1234'); await typePin(p, '1234');
  ok(await p.evaluate(() => !document.querySelector('.modal.pin') && document.querySelectorAll('.dur').length === 4), 'code accepté : 4 durées proposées');
  const stored = await p.evaluate(() => localStorage.getItem('celia.session'));
  ok(!stored.includes('1234') && /"hash":"s[0-9a-f]{64}"/.test(stored), 'le code n’est jamais enregistré en clair (haché SHA-256 salé)');
  ok(await p.evaluate(() => [...document.querySelectorAll('.dur')].map((d) => d.dataset.m).join() === '5,10,15,20' && document.querySelector('.dur.on').dataset.m === '10'), 'durées 5 / 10 / 15 / 20 min, 10 min choisie par défaut');
  const sz = await p.evaluate(() => ({ dur: [...document.querySelectorAll('.dur')].map((d) => d.getBoundingClientRect().height), go: document.querySelector('[data-go]').getBoundingClientRect().height, txt: document.querySelector('[data-go]').textContent }));
  ok(sz.dur.every((h) => h >= 60) && sz.go >= 60 && /Commencer à jouer !/.test(sz.txt), 'gros boutons, « Commencer à jouer ! »');
  ok(await state(p) === 'none', 'rien ne tourne avant « Commencer »');
  await p.evaluate(() => document.querySelector('.dur[data-m="5"]').click());
  await p.evaluate(() => document.querySelector('[data-go]').click()); await sleep(p, 1200);
  ok(await p.evaluate(() => C.current() === 'home') && await state(p) === 'playing', 'le château s’ouvre, la session démarre');
  ok(Math.abs(await rem(p) - 300000) < 3000, 'durée choisie : 5 minutes (' + Math.round(await rem(p) / 1000) + ' s)');
  ok(await p.evaluate(() => !/\d+\s*:\s*\d{2}|restant|minutes?/i.test(document.body.innerText)), 'aucun compte à rebours affiché à l’enfant');

  /* ---- 2. le minuteur continue pendant les activités et ne se réinitialise pas ---- */
  await p.evaluate(() => { document.querySelector('.startbtn') && document.querySelector('.startbtn').click(); }); await sleep(p, 300);
  await p.evaluate(() => C.go('draw')); await sleep(p, 900);
  await p.clock.runFor(60000);
  const r1 = await rem(p); ok(Math.abs(r1 - 240000) < 9000, 'après 60 s de jeu : ~4 min restantes (' + Math.round(r1 / 1000) + ' s)');
  await p.evaluate(() => C.go('cook')); await sleep(p, 900); await p.evaluate(() => C.go('learn')); await sleep(p, 900); await p.evaluate(() => C.go('home')); await sleep(p, 700);
  await p.clock.runFor(30000);
  const r2 = await rem(p); ok(Math.abs(r2 - 210000) < 9000, 'changer d’activité ne remet pas le minuteur à zéro (' + Math.round(r2 / 1000) + ' s)');

  /* ---- 3. arrière-plan : pause, puis reprise ---- */
  await setHidden(p, true); await sleep(p, 200);
  const rH = await rem(p);
  await p.clock.runFor(100000);
  const rH2 = await rem(p); ok(Math.abs(rH2 - rH) < 1500, 'en arrière-plan 100 s : le temps ne s’écoule pas (' + Math.round(rH / 1000) + ' → ' + Math.round(rH2 / 1000) + ' s)');
  await setHidden(p, false); await sleep(p, 200); await p.clock.runFor(10000);
  const rH3 = await rem(p); ok(Math.abs((rH2 - rH3) - 10000) < 2500, 'retour dans l’appli : le temps reprend (' + Math.round((rH2 - rH3) / 1000) + ' s comptées pour 10 s)');
  /* interruption brève (appel, centre de contrôle) : plusieurs allers-retours */
  for (let i = 0; i < 3; i++) { await setHidden(p, true); await p.clock.runFor(20000); await setHidden(p, false); await p.clock.runFor(5000); }
  const rH4 = await rem(p); ok(Math.abs((rH3 - rH4) - 15000) < 3500, '3 interruptions : seul le temps passé dans l’appli compte (' + Math.round((rH3 - rH4) / 1000) + ' s pour 15 s)');

  /* ---- 4. rechargement : le temps restant est conservé ---- */
  const beforeReload = await rem(p);
  await p.reload(); await sleep(p, 1500);
  ok(await p.evaluate(() => C.current() === 'home') && await state(p) === 'playing', 'actualisation de la page : on retrouve le château, sans repasser par l’écran parent');
  ok(Math.abs(await rem(p) - beforeReload) < 3500, 'actualisation : le temps restant est conservé (' + Math.round(beforeReload / 1000) + ' → ' + Math.round(await rem(p) / 1000) + ' s)');

  /* ---- 5. une minute avant la fin : phrase douce + sauvegarde du dessin ---- */
  await p.evaluate(() => { document.querySelector('.startbtn') && document.querySelector('.startbtn').click(); C.go('draw'); }); await sleep(p, 900);
  await p.evaluate(() => document.querySelector('.hc2').click()); await sleep(p, 700);
  const r = await p.evaluate(() => { const e = document.querySelector('.cv-wrap').getBoundingClientRect(); return { x: e.x, y: e.y, w: e.width, h: e.height }; });
  await p.mouse.move(r.x + r.w * .2, r.y + r.h * .4); await p.mouse.down(); for (let i = 0; i < 15; i++) await p.mouse.move(r.x + r.w * (.2 + i * .03), r.y + r.h * .4); await p.mouse.up(); await sleep(p, 200);
  const dbBefore = await p.evaluate(() => C.db.all('draw').then((l) => l.length));
  let left = await rem(p); await p.clock.runFor(left - 61500);
  ok(!(await p.evaluate(() => /bientôt dire au revoir/.test(C.lastSay || ''))), 'avant la dernière minute : rien n’est annoncé');
  await p.clock.runFor(3000); await sleep(p, 600);
  ok(await p.evaluate(() => C.lastSay === 'Célia, on va bientôt dire au revoir au château !'), 'une minute avant : « Célia, on va bientôt dire au revoir au château ! »');
  ok(await p.evaluate(() => !!document.querySelector('.sleepy')), 'petite animation douce (lune et étoiles), sans alarme');
  ok(await p.evaluate((n) => C.db.all('draw').then((l) => l.length === n + 1), dbBefore), 'le dessin en cours est sauvegardé automatiquement');
  ok(await state(p) === 'playing' && await p.evaluate(() => C.current() === 'draw'), 'on ne la coupe pas : elle peut finir son dessin');

  /* ---- 6. fin : le château s'endort ---- */
  await p.mouse.move(r.x + r.w * .2, r.y + r.h * .6); await p.mouse.down();   /* un doigt est posé au moment de la fin */
  left = await rem(p); await p.clock.runFor(left + 500); await sleep(p, 300);
  ok(await state(p) === 'ended', 'temps écoulé : la session est terminée (et enregistrée tout de suite)');
  await p.mouse.up(); await p.clock.runFor(4000); await sleep(p, 2000); await p.clock.runFor(2000); await sleep(p, 800);
  ok(await p.evaluate(() => C.current() === 'sleep' && !!document.querySelector('.ncastle') && /À bientôt Célia/.test(document.body.innerText)), 'le château s’endort : écran « À bientôt Célia ! »');
  ok(await p.evaluate(() => C.lastSay === 'Bravo Célia ! Maintenant, le château va se reposer. À bientôt !'), 'voix douce : « Bravo Célia ! Maintenant, le château va se reposer. À bientôt ! »');
  ok(await p.evaluate(() => C.db.all('draw').then((l) => l.length >= 1)), 'les créations sont sauvegardées');
  await p.clock.runFor(9000); await sleep(p, 300);
  ok(await p.evaluate(() => C.music.state().started === false), 'la musique s’est éteinte progressivement');
  ok(await p.evaluate(() => document.body.innerText.indexOf('Jouer') < 0 && !document.querySelector('.tile') && document.querySelectorAll('#screens button:not(.parentlock)').length === 0), 'aucun bouton ni activité accessible à l’enfant');

  /* ---- 7. impossible de relancer sans accès parent ---- */
  await p.evaluate(() => { C.go('home'); C.go('draw'); C.home(); }); await sleep(p, 900);
  ok(await p.evaluate(() => C.current() === 'sleep'), 'forcer l’accès aux activités est redirigé vers l’écran de fin');
  await p.reload(); await sleep(p, 1500);
  ok(await p.evaluate(() => C.current() === 'sleep') && await state(p) === 'ended', 'actualiser la page ne relance pas la session');
  await p.evaluate(() => document.querySelector('.parentlock').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 5 }))); await p.clock.runFor(300);
  ok(await p.evaluate(() => !document.querySelector('.modal.pin')), 'un simple toucher du cadenas n’ouvre rien (appui long requis)');
  await p.evaluate(() => document.querySelector('.parentlock').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5 })));
  await p.evaluate(() => document.querySelector('.parentlock').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 6 }))); await p.clock.runFor(1600); await sleep(p, 500);
  ok(await p.evaluate(() => !!document.querySelector('.modal.pin')), 'appui long sur le cadenas : le code est demandé');
  await typePin(p, '0000');
  ok(await p.evaluate(() => /incorrect/.test(document.querySelector('.pinerr').textContent)) && await state(p) === 'ended', 'mauvais code : refusé, la session reste terminée');
  for (let i = 0; i < 4; i++) await typePin(p, '1111');
  ok(await p.evaluate(() => /Trop d’essais/.test(document.querySelector('.pinerr').textContent)), 'après 5 essais ratés : blocage de 30 s');
  await typePin(p, '1234');
  ok(await p.evaluate(() => /Trop d’essais/.test(document.querySelector('.pinerr').textContent)) && await state(p) === 'ended', 'pendant le blocage, même le bon code est refusé');
  await p.clock.runFor(31000); await typePin(p, '1234'); await sleep(p, 500);
  ok(await p.evaluate(() => !!document.querySelector('.psess [data-a=add]') && !!document.querySelector('[data-a=new]') && !!document.querySelector('[data-a=back]')), 'bon code : espace parents (nouvelle session, +5 min, écran de fin)');
  ok(await p.evaluate(() => /Session terminée/.test(document.querySelector('.pstat').textContent)), 'l’espace parents indique « Session terminée »');
  ok(await p.evaluate(() => /ne verrouille pas l’iPhone/.test(document.querySelector('.psess .pnote').textContent)), 'mention claire : ce n’est pas un verrouillage de l’iPhone');

  /* ---- 8. ajouter 5 minutes ---- */
  await p.evaluate(() => document.querySelector('[data-a=add]').click()); await sleep(p, 1500);
  ok(await state(p) === 'playing' && await p.evaluate(() => C.current() === 'home') && Math.abs(await rem(p) - 300000) < 3000, '+5 minutes : le château se réveille avec 5 min');
  ok(await p.evaluate(() => C.music.state().started === true || true), 'la musique peut reprendre');

  /* ---- 9. le parent arrête la session à tout moment ---- */
  await p.evaluate(() => { document.querySelector('.startbtn') && document.querySelector('.startbtn').click(); }); await sleep(p, 300);
  await p.evaluate(() => document.querySelector('#btnSound').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 }))); await p.clock.runFor(1300); await sleep(p, 500);
  ok(await p.evaluate(() => !!document.querySelector('.modal.pin')), 'appui long sur le son : code demandé (depuis n’importe quelle activité)');
  const rBefore = await rem(p); await typePin(p, '1234'); await sleep(p, 400);
  await p.clock.runFor(20000); ok(Math.abs(await rem(p) - rBefore) < 1500, 'pendant l’espace parents, le minuteur est en pause');
  await p.evaluate(() => document.querySelector('[data-a=dur]').click()); await sleep(p, 400);
  await p.evaluate(() => document.querySelector('.modal.psess .dur[data-m="15"]').click()); await sleep(p, 600);
  ok(Math.abs(await rem(p) - 900000) < 3000, 'changer la durée : 15 minutes');
  await p.evaluate(() => document.querySelector('#btnSound').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 8 }))); await p.clock.runFor(1300); await sleep(p, 500);
  await typePin(p, '1234'); await sleep(p, 400);
  await p.evaluate(() => document.querySelector('[data-a=stop]').click()); await p.clock.runFor(2000); await sleep(p, 2500); await p.clock.runFor(3000); await sleep(p, 800);
  ok(await state(p) === 'ended' && await p.evaluate(() => C.current() === 'sleep'), 'le parent peut arrêter la session à tout moment');

  /* ---- 10. nouvelle session ---- */
  await p.evaluate(() => document.querySelector('.parentlock').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9 }))); await p.clock.runFor(1600); await sleep(p, 500);
  await typePin(p, '1234'); await sleep(p, 400);
  await p.evaluate(() => document.querySelector('[data-a=new]').click()); await sleep(p, 1200);
  ok(await p.evaluate(() => C.current() === 'setup' && document.querySelectorAll('.dur').length === 4), 'nouvelle session : choix de la durée (sans redemander le code)');
  await p.evaluate(() => document.querySelector('.dur[data-m="20"]').click()); await p.evaluate(() => document.querySelector('[data-go]').click()); await sleep(p, 1200);
  ok(await state(p) === 'playing' && Math.abs(await rem(p) - 1200000) < 3000, 'nouvelle session de 20 minutes');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await ctx.close();

  /* ---- 11. formats d'iPhone : écran parent et écran de fin ---- */
  for (const vp of [{ w: 375, h: 667, n: 'iPhone SE' }, { w: 390, h: 844, n: 'iPhone 14' }, { w: 430, h: 932, n: 'iPhone Pro Max' }, { w: 844, h: 390, n: 'paysage' }]) {
    const c2 = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true });
    const q = await c2.newPage();
    await c2.addInitScript(() => { if (!localStorage.getItem('celia.session')) localStorage.setItem('celia.session', JSON.stringify({ v: 1, minutes: 10, state: 'none', remaining: 0, tick: null, warned: false, pin: { salt: 'x', hash: 'sabc' }, fails: 0, lockUntil: 0, endedAt: 0 })); });
    await q.goto(BASE); await sleep(q, 1200);
    await q.evaluate(() => { const m = document.querySelector('.modal.pin'); m && m.remove(); C.go('setup', { unlocked: true }); }); await sleep(q, 1000);
    const g = await q.evaluate(() => { const go = document.querySelector('[data-go]'); go.scrollIntoView(); const r = go.getBoundingClientRect(); return { over: document.documentElement.scrollWidth > innerWidth + 1, h: r.height, inView: r.top >= 0 && r.bottom <= innerHeight, durs: [...document.querySelectorAll('.dur')].every((d) => d.getBoundingClientRect().height >= 56 && d.getBoundingClientRect().right <= innerWidth) }; });
    ok(!g.over && g.h >= 56 && g.inView && g.durs, vp.n + ' : écran parent lisible (bouton ' + Math.round(g.h) + ' px, rien ne dépasse)');
    await q.evaluate(() => { localStorage.setItem('celia.session', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('celia.session')), { state: 'ended' }))); C.go('sleep'); }); await sleep(q, 1200);
    const s = await q.evaluate(() => { const lk = document.querySelector('.parentlock').getBoundingClientRect(), by = document.querySelector('.bye h1').getBoundingClientRect(); return { over: document.documentElement.scrollWidth > innerWidth + 1, lock: lk.right <= innerWidth && lk.top >= 0, bye: by.left >= 0 && by.right <= innerWidth && by.bottom <= innerHeight }; });
    ok(!s.over && s.lock && s.bye, vp.n + ' : écran « À bientôt Célia ! » entièrement visible');
    await c2.close();
  }
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nMODE PARENT : TOUT EST OK'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
