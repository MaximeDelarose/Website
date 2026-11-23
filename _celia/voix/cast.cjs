/* Liste des répliques des PERSONNAGES (Lumi, sorcière, Aliya, Tania) → _celia/voix/cast.json  (qui parle + texte + nom de fichier).
   Usage : python3 -m http.server 8123 &  puis  NODE_PATH=$(npm root -g) node _celia/voix/cast.cjs
   Les fichiers sont ensuite produits par generate.mjs avec UNE VOIX PAR PERSONNAGE (voir README). */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto(BASE); await p.waitForTimeout(800);
  const list = await p.evaluate(() => {
    const out = [], add = (who, text) => { if (text) out.push({ who, text }); }, L = C.LINES, Tm = C.TIDY, Ci = C.CINE;
    ['aliya', 'tania'].forEach((w) => { L[w].praise.forEach((t) => add(w, t)); L[w].hug.forEach((t) => add(w, t)); });
    ['praise', 'hug'].forEach((k) => L.both[k].forEach((pair) => { add('aliya', pair[0]); add('tania', pair[1]); }));
    Object.values(L.byKind).forEach((k) => { k.aliya.forEach((t) => add('aliya', t)); k.tania.forEach((t) => add('tania', t)); k.both.forEach((pr) => { add('aliya', pr[0]); add('tania', pr[1]); }); });
    ['aliya', 'tania'].forEach((w) => { L.real[w].forEach((t) => add(w, t)); L.home[w].forEach((t) => add(w, t)); }); L.home.both.forEach((pr) => { add('aliya', pr[0]); add('tania', pr[1]); });
    ['kiss', 'meal', 'tidy', 'night'].forEach((k) => L[k].forEach((t) => add('narr', t)));
    Ci.lumi.forEach((s) => add(s.who, s.say)); Ci.witch.forEach((s) => add(s.who, s.say)); add(Ci.night.who, Ci.night.say);
    Tm.MISSIONS.forEach((m) => add('narr', m.intro)); Object.values(Tm.DONE).forEach((a) => a.forEach((t) => add('narr', t))); Object.values(Tm.NEXT).forEach((t) => add('narr', t)); Tm.HINT.forEach((t) => add('narr', t)); Tm.FINALS.forEach((t) => add('narr', t)); add('narr', Tm.EXTRA);
    const seen = new Set(); return out.filter((x) => { const k = x.who + '|' + x.text; if (seen.has(k)) return false; seen.add(k); return true; })
      .map((x) => ({ who: x.who, text: x.text, key: C.voiceKey(x.who === 'narr' ? x.text : x.who + '|' + x.text) }));
  });
  fs.writeFileSync(path.join(__dirname, 'cast.json'), JSON.stringify(list, null, 1) + '\n');
  const by = {}; list.forEach((x) => { by[x.who] = (by[x.who] || 0) + 1; });
  console.log(list.length + ' répliques écrites dans _celia/voix/cast.json', JSON.stringify(by)); await b.close();
})();
