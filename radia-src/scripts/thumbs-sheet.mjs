// Planche de TOUTES les vignettes du dressing (celles des fenêtres de cadeaux / récompenses) : un coup d'œil pour voir ce qui est coupé.
//   PHOTO_KEY=… PORT=4190 OUT=/chemin node scripts/thumbs-sheet.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190, KEY = process.env.PHOTO_KEY ?? '', OUT = process.env.OUT ?? 'shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await (await b.newContext({ viewport: { width: 600, height: 900 }, deviceScaleFactor: 1 })).newPage();
await p.addInitScript(() => localStorage.setItem('radia-save-v1', JSON.stringify({ v: 5, seenUpdates: ['v2','v3','v4','v5','v6','v7','v8','v9','v10'], world: { flags: { 'rw:start-gift-v1': true } } })));
await p.goto(`http://localhost:${PORT}/?debug${KEY ? '#k=' + KEY : ''}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(4000);
const groups = await p.evaluate(async () => {
  const dm = await window.RADIA.dressMod(), wd = await window.RADIA.wardrobeData();
  const byCat = {};
  for (const [id, def] of Object.entries(wd.CLOTHES)) { const k = def.slot === 'acc' ? 'acc:' + (id.split('-')[0]) : def.slot; (byCat[k] ??= []).push({ id, name: def.name, url: dm.thumbUrl(id) }); }
  for (const id of Object.keys(wd.HAIRS)) (byCat.hair ??= []).push({ id, name: wd.HAIRS[id].name, url: dm.thumbUrl(id) });
  return byCat;
});
import fs from 'node:fs';
fs.mkdirSync(OUT, { recursive: true });
for (const [cat, items] of Object.entries(groups)) {
  const html = `<body style="margin:0;background:#f3e9ff;font:11px sans-serif;display:flex;flex-wrap:wrap;gap:6px;padding:6px;width:588px">${items.map((i) => `<div style="width:92px;text-align:center"><img src="${i.url}" width="92" height="92" style="background:#fff;border-radius:10px"><div>${i.id}</div></div>`).join('')}</body>`;
  await p.setContent(html); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/thumbs-${cat.replace(':', '_')}.png`, fullPage: true });
  console.log(cat, items.length);
}
await b.close();
