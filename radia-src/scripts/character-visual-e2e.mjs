// Tests VISUELS du personnage, sur les canevas réels de la planche (?planche). Chromium ÉMULÉ.
//   PHOTO_KEY=… PORT=4190 node scripts/character-visual-e2e.mjs     (sans clé : seulement la partie dessinée ; les contrôles « peinte » sont ignorés)
// Principe : la TÊTE ne doit jamais changer d'échelle ni de forme quand on change de couronne, de coiffure, d'accessoire ou de tenue.
// On compare la zone du bas du visage (yeux → menton, centrée) entre variantes : l'écart moyen doit rester quasi nul.
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190, KEY = process.env.PHOTO_KEY ?? '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await (await b.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem('radia-save-v1', JSON.stringify({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9'], world: { flags: { 'rw:start-gift-v1': true } } })));
await p.goto(`http://localhost:${PORT}/?planche${KEY ? '#k=' + KEY : ''}`); await p.waitForSelector('.bd-root', { timeout: 25000 }); await p.waitForTimeout(1500);
const results = []; const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };

// zone du visage en unités d'avatar : x 98..142, y 108..164 (yeux → menton, centrée) ; tête entière : x 80..160, y 14..166
const out = await p.evaluate(() => {
  const B = window.__board; const W = B.W, H = B.H;
  const tile = (sec, label) => B.tiles.find((t) => t.section.startsWith(sec) && t.label === label)?.canvas;
  const px = (c, box) => { const k = c.height / 600; const [x0, y0, x1, y1] = box.map((v) => Math.round(v * k)); const d = c.getContext('2d').getImageData(Math.round((c.width - 240 * k) / 2) + x0, y0, x1 - x0, y1 - y0).data; return d; };
  const diff = (a, b, box) => { const A = px(a, box), Bp = px(b, box); let s = 0, n = 0; for (let i = 0; i < A.length; i += 4) { const al = Math.max(A[i + 3], Bp[i + 3]) / 255; for (let j = 0; j < 3; j++) { s += Math.abs(A[i + j] - Bp[i + j]) * al; } n += 3 * al || 0; } return n ? s / n : 0; };
  const FACE = [98, 108, 142, 164], HEAD = [80, 14, 160, 158], CHIN = [102, 140, 138, 164]; // HEAD s'arrête au-dessus du col (le col change avec la tenue)
  const sans = tile('Couronnes', 'Sans couronne');
  const r = { perf: B.perfMs, couronnes: {}, coiffures: {}, accessoires: {}, tenues: {}, peintVsDessine: null };
  for (const l of ['Couronne dorée', 'Couronne de fleurs', 'Diadème']) r.couronnes[l] = diff(sans, tile('Couronnes', l), FACE);
  const ond = tile('Coiffures', 'Ondulés');
  for (const l of ['Lâchés', 'Queue', 'Chignon', 'Mi-longs', 'Raie nette', 'Moyens', 'Carré', 'Tresse', 'Bouclés', 'Macarons', 'Queue haute']) r.coiffures[l] = diff(ond, tile('Coiffures', l), FACE);
  const noir = tile('Tenues', 'Noire illustrée');
  for (const l of ['Survêtement rouge', 'Casual', 'Robe élégante', 'Soirée', 'Manteau', 'Couronne + robe']) r.tenues[l] = diff(noir, tile('Tenues', l), l === 'Couronne + robe' ? FACE : HEAD);
  for (const l of ['Lunettes aviateur', 'Lunettes œil de chat', 'Lunettes de soleil', 'Créoles', 'Boucles pendantes', 'Bandana', 'Béret', 'Nœud', 'Serre-tête', 'Collier de perles']) r.accessoires[l] = diff(sans, tile('Accessoires', l), CHIN);
  const pe = tile('Référence', 'Radia peinte'), de = tile('Référence', 'Radia dessinée');
  r.peintVsDessine = B.painted && pe && de ? diff(pe, de, FACE) : null; // sans le lien secret, pas de figure peinte : contrôle ignoré
  r.painted = B.painted; return r;
});
if (!out.painted) console.log('(sans le lien secret : les contrôles « peinte » sont ignorés)');
console.log('temps de dessin d\'un avatar : ' + out.perf.toFixed(1) + ' ms (taille iPhone, sans cache)');
const T = 3.0; // écart moyen toléré (sur 255) pour « même visage »
for (const [grp, o] of [['couronne', out.couronnes], ['coiffure', out.coiffures], ['tenue', out.tenues], ['accessoire (bas du visage)', out.accessoires]]) {
  for (const [k, v] of Object.entries(o)) check(`${grp} « ${k} » ne change pas le visage`, v < T, `écart ${v.toFixed(2)}/255`);
}
if (out.peintVsDessine != null) check('visage de la figure peinte ≈ visage de la tête posée sur le corps dessiné (même échelle et même position)', out.peintVsDessine < 14, `écart ${out.peintVsDessine.toFixed(2)}/255`);
check('dessin d\'un avatar assez rapide (< 25 ms sur cet environnement)', out.perf < 25, out.perf.toFixed(1) + ' ms');
check('aucune erreur JS', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(`\n${results.filter(Boolean).length}/${results.length} OK`);
await b.close(); process.exit(results.every(Boolean) ? 0 : 1);
