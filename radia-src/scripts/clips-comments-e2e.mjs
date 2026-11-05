// TikTak + Snapchien : parcours Playwright (Chromium ÉMULÉ, pas un vrai iPhone).
// Build isolé : npx vite build --outDir /tmp/claude-0/n  puis  npx vite preview --outDir /tmp/claude-0/n --port 4195
// PORT=4195 W=393 H=852 node scripts/apps-e2e.mjs      (captures : shots/tc-*.png)
import { chromium } from 'playwright';
const W = +(process.env.W ?? 393), H = +(process.env.H ?? 852), PORT = process.env.PORT ?? 4195;
const TAG = `${W}x${H}`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR ?? 2), hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
page.setDefaultTimeout(8000);
const sleep = (ms) => page.waitForTimeout(ms);
const out = [];
const check = (name, ok, extra = '') => { const l = `${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`; out.push(l); console.log(l); };
const shot = (n) => page.screenshot({ path: `shots/tc-${n}-${TAG}.png` });
const seed = { v: 2, seenUpdates: ['v2', 'v4'], story: { step: 80 }, levels: {}, hearts: 500 };
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await page.addInitScript(() => { try { const k = 'radia-save-v1'; const s = localStorage.getItem(k); if (s) { const j = JSON.parse(s); j.world = j.world || {}; j.world.flags = { ...(j.world.flags || {}), 'rw:start-gift-v1': true }; const d = new Date(), q = (x) => String(x).padStart(2, '0'), key = `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}`; j.fun = j.fun || {}; j.fun.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(j.fun.daily || {}), lastKey: key }; j.fun.free = { ...(j.fun.free || {}), announced: true }; localStorage.setItem(k, JSON.stringify(j)); } } catch { /* ignore */ } }); // écarte le « Bonus de départ » pour les anciennes sauvegardes de test
await page.addLocatorHandler(page.locator('#reward-overlay .rw-root'), async () => { for (let i = 0; i < 30; i++) { const r = await page.evaluate(() => { const ov = document.querySelector('#reward-overlay'); if (!ov) return 0; for (const sel of ['.rw-primary', '.rw-skip', '.rw-art']) { const e = ov.querySelector(sel); if (e && e.getBoundingClientRect().width && getComputedStyle(e).visibility !== 'hidden') { e.click(); return 1; } } return 1; }).catch(() => 0); if (!r) break; await page.waitForTimeout(500); } }); // ferme un cadeau qui s'ouvre en cours de parcours
await page.addInitScript(() => { const t = setInterval(() => { try { const w = window.RADIA && window.RADIA.save && window.RADIA.save.data && window.RADIA.save.data.world; if (w) { w.flags = w.flags || {}; w.flags['rw:start-gift-v1'] = true; const fu = window.RADIA.save.data.fun; if (fu) { const d = new Date(), q = (x) => String(x).padStart(2, '0'); fu.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(fu.daily || {}), lastKey: `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}` }; fu.free = { ...(fu.free || {}), announced: true }; clearInterval(t); } } } catch { /* ignore */ } }, 20); }); // pas de « Bonus de démarrage » dans les parcours de test
const boot = async () => {
  await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' });
  await sleep(2500);
  await page.addStyleTag({ content: '.dy-back{display:none!important}' });
  for (let i = 0; i < 8; i++) {
    const had = await page.evaluate(() => { document.querySelectorAll('.dy-back').forEach((e) => e.remove()); const b = document.querySelector('.modal-backdrop:not(.leaving) .actions button'); if (b) { b.click(); return true; } return false; });
    await sleep(had ? 400 : 250);
  }
};
const loadApps = async () => { await page.evaluate(() => window.RADIA.phone()); await sleep(700); await page.evaluate(() => document.querySelector('.ph-x')?.click()); await sleep(300); };
const st = () => page.evaluate(() => window.RADIA.apps.state());
// (le glissé tactile synthétique ne fait défiler AUCUN élément dans ce Chromium sans écran, même une simple div : on utilise la molette, qui déclenche le même scroll-snap)
const swipeUp = async () => { await page.mouse.move(W / 2, H * 0.5); await page.mouse.wheel(0, H * 0.8); await sleep(1300); };
const activeId = () => page.evaluate(() => { const f = document.querySelector('.clp-feed'); if (!f) return null; const i = Math.round(f.scrollTop / f.clientHeight); return { i, top: f.scrollTop, h: f.clientHeight, id: f.children[i]?.dataset.id, n: f.children.length }; });
// ---------------------------------------------------------------- TikTak : commentaires, critiques, réponses et likes d'Auguste
const NEG = ['loulou75', 'missparis', 'alexdu92', 'juliette', 'marco', 'inesstyle', 'vero.critique', 'tom.grincheux', 'sam.sceptique', 'lea.zoom', 'nico.dossier', 'paul.sarcasme', 'clem.avis', 'nora.top', 'max.analyse', 'chloe.nuance'];
await boot();
await page.evaluate(() => window.RADIA.phone()); await sleep(900);
await page.evaluate(() => window.RADIA.apps.reset());
await page.evaluate(() => document.querySelector('.ph-x')?.click()); await sleep(400);
await page.evaluate(() => window.RADIA.phone()); await sleep(900);
await page.locator('.phh-app[data-app="clips"]').click(); await sleep(1800);
check('TikTak ouvert', (await page.locator('.clp-layer').count()) === 1);
const rows = [];
let augFound = null;
for (let i = 0; i < 24 && (rows.filter((r) => r.aug).length < 2 || rows.length < 10); i++) {
  const post = page.locator('.clp-post').nth(i);
  await post.locator('.clp-act[aria-label="Commentaires"]').click(); await sleep(1700);
  const info = await page.evaluate((NEGL) => {
    const ths = [...document.querySelectorAll('.clp-th')];
    const roots = ths.map((t) => t.querySelector('.clp-com:not(.rep) .clp-cb b')?.textContent?.replace('@', '') ?? '');
    const a = document.querySelector('.clp-com.augu');
    return { threads: ths.length, neg: roots.filter((r) => NEGL.includes(r)).length, aug: !!a, augText: a?.querySelector('p')?.textContent ?? '', augLikes: a?.querySelector('.clp-mh b')?.textContent ?? '', scrollX: document.documentElement.scrollWidth > innerWidth };
  }, NEG);
  rows.push(info);
  if (info.aug && !augFound) { augFound = i; await page.screenshot({ path: `shots/tc-comments-aug-${H}.png` }); }
  if (info.aug && augFound === i && rows.length >= 10) break; // on continue à parcourir au moins 10 vidéos (sinon le test dépendrait de l'ordre du fil)
  await page.locator('.clp-sheet .clp-x').click(); await sleep(400);
  await swipeUp();
}
check('chaque vidéo a un vrai fil (≥ 4 fils de discussion)', rows.every((r) => r.threads >= 4), rows.map((r) => r.threads).join(','));
check('des critiques existent, mais pas sous toutes les vidéos', rows.some((r) => r.neg > 0) && rows.some((r) => r.neg === 0), `critiques par vidéo : ${rows.map((r) => r.neg).join(',')}`);
check('Auguste répond à une critique', augFound !== null, augFound !== null ? `« ${rows[augFound].augText} »` : 'aucune réponse trouvée');
check('pas de défilement horizontal dans la feuille', rows.every((r) => !r.scrollX));
if (augFound !== null) {
  const augCom = page.locator('.clp-com.augu').first();
  const rootText = await page.locator('.clp-th:has(.clp-com.augu) .clp-com:not(.rep) p').first().innerText();
  check('la critique est fictive, modérée, et la réponse d\'Auguste est affichée dessous', rootText.length > 8 && (await augCom.locator('.clp-badge').count()) === 1, `« ${rootText} »`);
  check('l\'avatar d\'Auguste est son portrait illustré', await augCom.locator('img.clp-cav.aug').evaluate((i) => i.complete && i.naturalWidth > 20));
  // les likes montent progressivement puis se stabilisent
  const likeEl = augCom.locator('.clp-mh b');
  const early = await likeEl.innerText();
  await sleep(1800);
  const late = await likeEl.innerText();
  const num = (t) => Number(t.replace(/\s| | /g, ''));
  check('les likes d\'Auguste s\'affichent (nombre ≥ 18)', num(late) >= 18, `${early} → ${late}`);
  // liker sa réponse
  await augCom.locator('.clp-mh').click(); await sleep(400);
  const after = await augCom.locator('.clp-mh b').innerText();
  check('Radia peut liker la réponse d\'Auguste (+1)', num(after) === num(late) + 1 && (await augCom.locator('.clp-mh.on').count()) === 1, `${late} → ${after}`);
  let s = await st();
  check('le like est sauvegardé', s.clips.msgLiked.length === 1, JSON.stringify(s.clips.msgLiked));
  // répondre à Auguste
  await augCom.locator('.clp-rp').click(); await sleep(300);
  check('le champ propose « Répondre à Auguste… »', (await page.locator('.clp-input').getAttribute('placeholder')) === 'Répondre à Auguste…');
  await page.locator('.clp-chip', { hasText: 'Merci' }).click(); await sleep(600);
  check('la réponse de Radia apparaît sous celle d\'Auguste, avec « Auguste a aimé »', (await page.locator('.clp-com.rep.me').count()) >= 1 && (await page.locator('.clp-ah').count()) >= 1, await page.locator('.clp-com.rep.me p').first().innerText());
  s = await st();
  check('la réponse est sauvegardée', Object.values(s.clips.replies).flat().length === 1, JSON.stringify(s.clips.replies));
  await page.screenshot({ path: `shots/tc-reply-${H}.png` });
  // rechargement : like et réponse conservés
  await page.evaluate(() => window.RADIA.save.writeNow());
  await page.reload({ waitUntil: 'networkidle' }); await sleep(2500);
  await page.evaluate(() => window.RADIA.phone()); await sleep(900);
  s = await st();
  check('après rechargement : like et réponse conservés', s.clips.msgLiked.length === 1 && Object.values(s.clips.replies).flat().length === 1);
}
check('aucune erreur JS', errs.length === 0, errs.slice(0, 2).join(' | '));
const ko = out.filter((l) => l.startsWith('KO')).length;
console.log(`\n${out.length - ko}/${out.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
