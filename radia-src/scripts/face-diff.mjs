// Rendu par défaut IDENTIQUE à l'ancien dessin : compare pixel par pixel deux serveurs de dev (ancien / nouveau). Usage : node scripts/face-diff.mjs 5201 5202
import { chromium } from 'playwright';
const [A, B] = [process.argv[2] ?? '5201', process.argv[3] ?? '5202'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
async function render(port) {
  const page = await (await browser.newContext({ viewport: { width: 400, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  const out = await page.evaluate(async () => {
    const ch = await import('/src/game/art/characters.ts'); const av = await import('/src/game/art/world/avatar.ts'); const ids = await import('/src/data/world/ids.ts');
    const res = {};
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    for (const expr of ['smile', 'neutral', 'love', 'surprise', 'laugh', 'sad']) { const c = mk(400, 400); ch.drawRadiaPortrait(c.getContext('2d'), { expr }); res[`portrait:${expr}`] = c.toDataURL(); }
    for (const [i, o] of [{ lip: '#B85C62', iris: '#4A78A8', mouth: 'cupid', liner: 'bold', shadow: '#C9A0D8' }, { mouth: 'wide', liner: 'none' }].entries()) { const c = mk(400, 400); ch.drawRadiaPortrait(c.getContext('2d'), { expr: 'smile', ...o }); res[`portrait-opts${i}`] = c.toDataURL(); }
    for (const hair of ['hair-loose', 'hair-wavy', 'hair-bun', 'hair-curly']) { const look = { ...ids.DEFAULT_LOOK, hair }; const c = av.avatarCanvas(look, 240, 600, { expr: 'smile' }); res[`avatar:${hair}`] = c.toDataURL(); }
    const c = mk(300, 300); ch.drawRadiaFull(c.getContext('2d'), {}); res.full = c.toDataURL();
    return res;
  });
  await page.context().close();
  return { out, errs };
}
const a = await render(A); const b = await render(B);
let bad = 0;
for (const k of Object.keys(a.out)) { const same = a.out[k] === b.out[k]; if (!same) bad++; console.log(`${same ? 'OK ' : 'KO '} ${k}`); }
console.log(`erreurs JS : ancien ${a.errs.length}, nouveau ${b.errs.length}`);
console.log(bad ? `\n${bad} rendu(s) DIFFÉRENT(S)` : '\nTous les rendus par défaut sont IDENTIQUES à l\'ancien dessin');
await browser.close(); process.exit(bad ? 1 : 0);
