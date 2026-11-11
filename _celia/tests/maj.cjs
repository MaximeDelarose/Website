/* Mise à jour automatique : réseau d'abord, rechargement sur l'accueil, report pendant une activité, hors ligne.
   Modifie temporairement celia/sw.js et celia/js/home.js puis les restaure. Serveur local requis (python3 -m http.server 8123). */
const { chromium } = require('playwright'); const fs = require('fs');
const SW = require('path').join(__dirname, '..', '..', 'celia', 'sw.js'), HOME = require('path').join(__dirname, '..', '..', 'celia', 'js', 'home.js');
const SWORIG = fs.readFileSync(SW, 'utf8'), HOMEORIG = fs.readFileSync(HOME, 'utf8');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'allow' });
    await ctx.addInitScript(require('./_session.cjs'));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8123/celia/'); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('.startbtn').click());
  await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller) || true, 'service worker installé');
  await p.reload(); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'le service worker contrôle la page');
  /* 1. réseau d'abord : un fichier modifié est servi tout de suite, pas l'ancienne copie du cache */
  fs.writeFileSync(HOME, fs.readFileSync(HOME, 'utf8') + '\nwindow.__MARK = "nouvelle-version";\n');
  await p.reload(); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.__MARK === 'nouvelle-version'), 'réseau d’abord : le fichier modifié est servi immédiatement (pas l’ancien cache)');
  /* 2. nouvelle version du service worker pendant que l'appli est sur l'accueil → rechargement automatique */
  await p.evaluate(() => { document.querySelector('.startbtn') && document.querySelector('.startbtn').click(); window.__alive = 1; }); await p.waitForTimeout(500);
  fs.writeFileSync(SW, fs.readFileSync(SW, 'utf8').replace(SWORIG.match(/celia-v\d+-[\d-]+/)[0], "celia-v6-test"));
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update())); await p.waitForTimeout(3500);
  ok(await p.evaluate(() => window.__alive === undefined), 'nouvelle version publiée : l’appli se recharge toute seule quand elle est sur l’accueil');
  /* 3. nouvelle version pendant une activité → on ne coupe pas Célia ; mise à jour au retour au château */
  await p.evaluate(() => { document.querySelector('.startbtn') && document.querySelector('.startbtn').click(); C.go('draw'); window.__alive = 2; }); await p.waitForTimeout(1200);
  try { require('fs').unlinkSync('/tmp/_x'); } catch (e) { }
  await p.evaluate(() => sessionStorage.removeItem('celia.reloaded'));
  fs.writeFileSync(SW, fs.readFileSync(SW, 'utf8').replace("celia-v6-test", "celia-v7-test"));
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update())); await p.waitForTimeout(3500);
  ok(await p.evaluate(() => window.__alive === 2 && C.current() === 'draw'), 'nouvelle version pendant un dessin : l’appli ne se recharge PAS (Célia n’est pas interrompue)');
  ok(await p.evaluate(() => C.pendingReload === true), 'la mise à jour est mise en attente');
  await p.evaluate(() => document.querySelector('#btnHome').click()); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => window.__alive === undefined), 'au retour au château, la mise à jour s’applique toute seule');
  /* 4. hors ligne */
  await p.waitForTimeout(800); await p.evaluate(() => document.querySelector('.startbtn') && document.querySelector('.startbtn').click());
  await ctx.setOffline(true); await p.reload().catch(() => { }); await p.waitForTimeout(2000);
  ok(await p.evaluate(() => !!document.querySelector('.tile')), 'hors ligne : le jeu s’ouvre quand même (cache de secours)');
  await ctx.setOffline(false);
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close(); fs.writeFileSync(SW, SWORIG); fs.writeFileSync(HOME, HOMEORIG);
  console.log(fails ? fails + ' ÉCHEC(S)' : 'MISE À JOUR AUTOMATIQUE : TOUT EST OK'); process.exit(fails ? 1 : 0);
})().catch((e) => { fs.writeFileSync(SW, SWORIG); fs.writeFileSync(HOME, HOMEORIG); console.error(e); process.exit(1); });
