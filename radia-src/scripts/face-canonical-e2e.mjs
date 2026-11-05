// Visage canonique : la TÊTE de Radia est une référence unique ; le maquillage n'est qu'une surcouche. Chromium ÉMULÉ.
//   PHOTO_KEY=… PORT=4190 node scripts/face-canonical-e2e.mjs   (sans clé : contrôles sur le dessin vectoriel seulement)
// Planche (?planche) : on compare « Sans maquillage » à chaque variante : silhouette (canal alpha) IDENTIQUE, pixels hors bande des yeux/joues/bouche IDENTIQUES,
// et dans la bande le maquillage se voit (écart > 0).
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190, KEY = process.env.PHOTO_KEY ?? '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await (await b.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem('radia-save-v1', JSON.stringify({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], world: { flags: { 'rw:start-gift-v1': true } } })));
await p.goto(`http://localhost:${PORT}/?planche${KEY ? '#k=' + KEY : ''}`); await p.waitForSelector('.bd-root', { timeout: 25000 }); await p.waitForTimeout(1800);
const results = []; const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const out = await p.evaluate(() => {
  const B = window.__board;
  const tile = (label) => B.tiles.find((t) => t.section.startsWith('Maquillage') && t.label === label)?.canvas;
  const sans = tile('Sans maquillage');
  const data = (c) => { const k = c.height / 600; const x0 = Math.round((c.width - 240 * k) / 2); return { d: c.getContext('2d').getImageData(x0, 0, Math.round(240 * k), c.height).data, w: Math.round(240 * k), k }; };
  const S = data(sans);
  const cmp = (c) => {
    const V = data(c); let aDiff = 0, outside = 0, outsideN = 0, inside = 0, insideN = 0;
    for (let i = 0; i < S.d.length; i += 4) {
      const px = (i / 4) % S.w, py = Math.floor(i / 4 / S.w); const x = px / S.k, y = py / S.k;
      if (S.d[i + 3] !== V.d[i + 3]) aDiff++;
      if (y > 14 && y < 168 && x > 70 && x < 170) {
        const band = y >= 104 && y <= 158 && x >= 88 && x <= 152; // yeux, joues, bouche
        let s = 0; for (let j = 0; j < 3; j++) s += Math.abs(S.d[i + j] - V.d[i + j]);
        if (band) { inside += s; insideN++; } else { outside += s; outsideN++; }
      }
    }
    return { aDiff, outside: outside / Math.max(1, outsideN * 3), inside: inside / Math.max(1, insideN * 3) };
  };
  const r = { painted: B.painted, v: {} };
  for (const l of ['Rouge à lèvres', 'Gloss', 'Fard doré', 'Fard lavande', 'Eye-liner appuyé', 'Tout ensemble']) r.v[l] = cmp(tile(l));
  return r;
});
console.log(out.painted ? '(tête peinte active)' : '(sans le lien secret : dessin vectoriel seul)');
for (const [l, v] of Object.entries(out.v)) {
  check(`« ${l} » : silhouette identique (aucun pixel de forme changé)`, v.aDiff === 0, `${v.aDiff} px d'alpha différents`);
  check(`« ${l} » : tout ce qui est hors yeux / joues / bouche est identique à la tête sans maquillage`, v.outside < 0.15, `écart ${v.outside.toFixed(3)}/255`);
  if (out.painted) check(`« ${l} » : le maquillage se voit sur le visage`, v.inside > 0.05, `écart ${v.inside.toFixed(3)}/255`);
}
check('aucune erreur JS', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(`\n${results.filter(Boolean).length}/${results.length} OK`);
await b.close(); process.exit(results.every(Boolean) ? 0 : 1);
