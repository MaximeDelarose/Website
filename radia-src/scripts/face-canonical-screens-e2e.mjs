// Radia garde la MÊME tête sur tous les écrans (accueil, dressing, dialogues/événements, médaillons) : on appelle les vraies fonctions de rendu de l'application
// (celles que ces écrans utilisent), avec et sans maquillage, et on compare. Chromium ÉMULÉ, tête peinte active (clé secrète).
//   PHOTO_KEY=… PORT=4190 node scripts/face-canonical-screens-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190, KEY = process.env.PHOTO_KEY ?? '';
if (!KEY) { console.log('PHOTO_KEY absent : contrôle ignoré'); process.exit(0); }
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0');
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
await p.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await p.goto(`http://localhost:${PORT}/?debug#k=${KEY}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(4000);
const results = []; const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const out = await p.evaluate(async () => {
  const art = await window.RADIA.artMod(), lk = await window.RADIA.lookMod(), av = await window.RADIA.avatarMod();
  const wd = window.RADIA.save.data.world.wardrobe;
  const KIND = { face: { x: 52, y: 26, w: 136, h: 136 }, bust: { x: 14, y: 22, w: 212, h: 300 }, now: { x: 0, y: 0, w: 240, h: 600 }, avatar: { x: 0, y: 0, w: 240, h: 600 } };
  const render = () => ({
    face: art.radiaFaceCanvas('smile', 320), bust: art.radiaBustCanvas('smile', 400), now: art.radiaNowCanvas(480, 1200), avatar: av.avatarCanvas(wd.look, 480, 1200, { expr: 'smile' }),
  });
  const snap = (c) => { const g = c.getContext('2d'); return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }; };
  const setMk = (mk) => { wd.look.acc = mk.acc; wd.face = { ...wd.face, makeup: { ...wd.face.makeup, ...mk.makeup }, mouth: { ...wd.face.mouth, lip: mk.lip ?? wd.face.mouth.lip } }; lk.applySavedFace(); };
  const base = {}; for (const [k, c] of Object.entries(render())) if (c) base[k] = snap(c);
  const res = {};
  const variants = { 'rouge à lèvres + fard (objets du dressing)': { acc: ['lp-red', 'es-gold'], makeup: {} }, 'fard + liner + blush (Personnaliser Radia)': { acc: [], makeup: { shadow: '#C9A0D8', liner: 'bold', blush: 0.8 }, lip: '#A8404E' } };
  for (const [name, mk] of Object.entries(variants)) {
    setMk(mk);
    const cur = render(); res[name] = {};
    for (const [k, c] of Object.entries(cur)) {
      if (!c) continue; const S = base[k], V = snap(c);
      let aDiff = 0, n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; const g = KIND[k];
      for (let i = 0; i < S.d.length; i += 4) {
        if (S.d[i + 3] !== V.d[i + 3]) aDiff++;
        if (S.d[i] !== V.d[i] || S.d[i + 1] !== V.d[i + 1] || S.d[i + 2] !== V.d[i + 2]) { n++; const px = (i / 4) % S.w, py = Math.floor(i / 4 / S.w); const ux = g.x + (px / S.w) * g.w, uy = g.y + (py / S.h) * g.h; x0 = Math.min(x0, ux); x1 = Math.max(x1, ux); y0 = Math.min(y0, uy); y1 = Math.max(y1, uy); }
      }
      res[name][k] = { aDiff, n, box: n ? [x0, y0, x1, y1].map((v) => Math.round(v)) : null };
    }
    setMk({ acc: [], makeup: { shadow: '', liner: 'wing', blush: 0.25 }, lip: '#C98A7E' });
  }
  // retour au réglage d'origine : rendu identique à la base (aucun reste de maquillage)
  const back = render(); res.retour = {};
  for (const [k, c] of Object.entries(back)) { if (!c) continue; const S = base[k], V = snap(c); let n = 0; for (let i = 0; i < S.d.length; i++) if (S.d[i] !== V.d[i]) n++; res.retour[k] = n; }
  return res;
});
for (const [name, byKind] of Object.entries(out)) {
  if (name === 'retour') { for (const [k, n] of Object.entries(byKind)) check(`retour au maquillage d'origine : « ${k} » identique pixel pour pixel`, n === 0, `${n} valeurs différentes`); continue; }
  for (const [k, r] of Object.entries(byKind)) {
    check(`${name} — ${k} : silhouette identique (la tête ne change pas)`, r.aDiff === 0, `${r.aDiff} px d'alpha`);
    check(`${name} — ${k} : le maquillage se voit, uniquement sur yeux / joues / bouche`, r.n > 0 && r.box && r.box[1] >= 96 && r.box[3] <= 166 && r.box[0] >= 80 && r.box[2] <= 160, JSON.stringify(r.box));
  }
}
check('aucune erreur JS', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(`\n${results.filter(Boolean).length}/${results.length} OK`);
await b.close(); process.exit(results.every(Boolean) ? 0 : 1);
