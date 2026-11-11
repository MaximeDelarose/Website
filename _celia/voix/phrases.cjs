/* Établit la liste de TOUTES les phrases parlées du jeu → _celia/voix/phrases.json
   (consignes générées par fr.js + histoires + textes littéraux + phrases relevées en visitant chaque activité).
   Usage :  python3 -m http.server 8123 &  puis  NODE_PATH=$(npm root -g) node _celia/voix/phrases.cjs */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
const JS = path.join(__dirname, '..', '..', 'celia', 'js');

(async () => {
  const set = new Set(), add = (t) => { t = String(t).replace(/\s+/g, ' ').trim(); if (t.length > 2) set.add(t); };
  /* 1. textes littéraux français des sources */
  for (const f of fs.readdirSync(JS).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(JS, f), 'utf8');
    const re = /'((?:[A-ZÀ-ÝÉ][^'\\\n]|\\u2019|\\')*[!?.…])'/g; let m;
    while ((m = re.exec(src))) { const t = m[1].replace(/\\u2019/g, '’').replace(/\\'/g, '’'); if (/\s/.test(t) || /^[A-ZÀ-Ý][a-zà-ÿ]+ !$/.test(t)) add(t); }
  }
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  const said = [];
  await p.addInitScript(() => { window.__said = []; });
  await p.goto(BASE); await p.waitForTimeout(600);
  await p.evaluate(() => {
    const s = C.say, r = C.sayRnd; C.say = function (t, o) { window.__said.push(t); return s.call(C, t, o); }; C.say.stop = s.stop;
    C.sayRnd = function (a, o) { a.forEach((t) => window.__said.push(t)); return r.call(C, a, o); };
  });
  await p.evaluate(() => document.querySelector('.startbtn').click()); await p.waitForTimeout(500);
  /* 2. entrer dans chaque activité et changer d'ami / de recette pour relever les phrases dynamiques */
  for (const t of ['draw', 'cook', 'dress', 'makeup', 'pets', 'stories', 'learn', 'room']) {
    await p.evaluate((t) => C.go(t), t); await p.waitForTimeout(1100);
    if (t === 'pets') await p.evaluate(() => document.querySelectorAll('.items .it').forEach((b) => b.click()));
    if (t === 'cook') await p.evaluate(() => document.querySelectorAll('.rcard').forEach((b) => b.click()));
    await p.waitForTimeout(300);
    await p.evaluate(() => C.go('home')); await p.waitForTimeout(700);
  }
  const data = await p.evaluate(() => ({
    said: window.__said, fr: Fr.allPhrases(),
    stories: C.STORIES.flatMap((s) => s.scenes.flatMap((sc) => [sc.say, sc.act && sc.act.say, sc.act && sc.act.ok, sc.act && sc.act.hint].filter(Boolean))),
    keys: null
  }));
  [...data.said, ...data.fr, ...data.stories].forEach(add);
  /* phrases demandées par les parents (exemples de ton) */
  ['Coucou Célia ! Bienvenue dans ton monde magique ! Qu’est-ce qu’on fait aujourd’hui ?', 'Oh, quelle jolie couleur !', 'Wouah, ton dessin est magnifique !', 'Miam miam ! On va préparer un délicieux gâteau !', 'Ooooh, regarde ce petit chaton ! Il est trop mignon !', 'Bravo Célia ! Tu veux encore jouer ou retourner au château ?', 'Quand tu as terminé, touche le bouton vert !'].forEach(add);
  const list = [...set].sort();
  const keyOf = await p.evaluate((l) => l.map((t) => [C.voiceKey(t), t]), list);
  fs.writeFileSync(path.join(__dirname, 'phrases.json'), JSON.stringify(keyOf.map(([key, text]) => ({ key, text })), null, 1) + '\n');
  console.log(list.length + ' phrases écrites dans _celia/voix/phrases.json');
  await b.close();
})();
