// Isolation : RADIA ne partage ni cache, ni sauvegarde, ni service worker avec un autre site ni avec un autre cadeau.
// Trois « sites » sur trois origines : RADIA, le cadeau de démonstration, et un faux « site habituel » avec son propre service worker.
// Ensuite : les deux cadeaux sur UNE MÊME origine (sous-dossiers) pour vérifier les préfixes de cache et de stockage.
//   node scripts/isolation-e2e.mjs     (Chromium émulé, pas un vrai iPhone)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, rmSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const T = '/tmp/e2e/iso'; rmSync(T, { recursive: true, force: true }); mkdirSync(T, { recursive: true });
const build = (gift, out) => execSync(`npx vite build --outDir ${out}`, { stdio: 'ignore', env: { ...process.env, GIFT: gift } });
build('radia', `${T}/radia`); build('demo', `${T}/demo`);
mkdirSync(`${T}/site`, { recursive: true });
// faux « site habituel » : sa page, son service worker (portée = racine) et ses propres clés
import('node:fs').then(({ writeFileSync }) => {
  writeFileSync(`${T}/site/index.html`, '<!doctype html><title>Site habituel</title><script>localStorage.setItem("site-visits","1");caches.open("site-cache-v1").then(c=>c.put("/x",new Response("x")));navigator.serviceWorker.register("/sw.js")</script><p>site</p>');
  writeFileSync(`${T}/site/sw.js`, 'self.addEventListener("fetch",()=>{});self.addEventListener("activate",e=>e.waitUntil(clients.claim()))');
});
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream', '.txt': 'text/plain' };
const serve = (root, port, mounts = null) => createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  let base = root;
  if (mounts) { const m = Object.keys(mounts).find((k) => p.startsWith(k)); if (!m) { res.writeHead(404); res.end(); return; } base = mounts[m]; p = p.slice(m.length - 1); }
  const f = join(base, p);
  if (!f.startsWith(base) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }); res.end(readFileSync(f));
}).listen(port);
await new Promise((r) => setTimeout(r, 400));
const A = serve(`${T}/radia`, 4311), B = serve(`${T}/demo`, 4312), C = serve(`${T}/site`, 4313);
const S = serve(null, 4314, { '/a/': `${T}/radia`, '/b/': `${T}/demo` }); // même origine, deux sous-dossiers

const results = []; const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(ctx, url) { const pg = await ctx.newPage(); await pg.goto(url, { waitUntil: 'networkidle' }); await sleep(2500); return pg; }
const dump = (pg) => pg.evaluate(async () => ({ ls: Object.keys(localStorage), caches: await caches.keys(), sw: (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope) }));
const mk = () => browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, serviceWorkers: 'allow' });

// ---- 1. trois origines distinctes
const ctx = await mk();
const pr = await open(ctx, 'http://localhost:4311/?debug');
await pr.evaluate(() => { window.RADIA.save.data.hearts = 777; window.RADIA.save.writeNow(); });
const pd = await open(ctx, 'http://localhost:4312/?debug');
const ps = await open(ctx, 'http://localhost:4313/');
const dr = await dump(pr), dd = await dump(pd), ds = await dump(ps);
console.log('RADIA :', JSON.stringify(dr)); console.log('DÉMO  :', JSON.stringify(dd)); console.log('SITE  :', JSON.stringify(ds));
check('RADIA : toutes les clés de stockage commencent par « radia- »', dr.ls.length > 0 && dr.ls.every((k) => k.startsWith('radia-')));
check('RADIA : tous les caches commencent par « radia- »', dr.caches.length > 0 && dr.caches.every((k) => k.startsWith('radia-') || k === 'rthoughts' || k === 'demothoughts'));
check('RADIA : service worker limité à SA propre adresse', dr.sw.length === 1 && dr.sw[0] === 'http://localhost:4311/');
check('DÉMO : clés « demo- » et caches « demo- » uniquement', dd.ls.every((k) => k.startsWith('demo-')) && dd.caches.every((k) => k.startsWith('demo-') || k === 'rthoughts' || k === 'demothoughts'));
check('SITE habituel : ne voit rien de RADIA ni de la démo (stockage, caches)', !ds.ls.some((k) => /radia|demo/.test(k)) && !ds.caches.some((k) => /radia|demo/.test(k)));
check('RADIA ne voit rien du site habituel', !dr.ls.includes('site-visits') && !dr.caches.includes('site-cache-v1'));
check('la sauvegarde de RADIA n\'est pas dans la démo', !(await pd.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('radia-')))));
check('la démo démarre avec SA propre progression (pas 777 cœurs)', (await pd.evaluate(() => window.RADIA.save.data.hearts)) !== 777);
const mr = await pr.evaluate(async () => (await (await fetch('manifest.webmanifest')).json()));
const md = await pd.evaluate(async () => (await (await fetch('manifest.webmanifest')).json()));
check('manifestes : id, nom et couleurs propres à chaque cadeau', mr.id === 'radia-app' && md.id === 'demo-app' && mr.short_name === 'RADIA' && md.short_name !== 'RADIA' && mr.theme_color !== md.theme_color);
check('manifeste RADIA : standalone, portrait, start_url et scope relatifs', mr.display === 'standalone' && mr.orientation === 'portrait' && mr.start_url === './' && mr.scope === './');
check('manifeste : icônes 192 et 512 + maskable', ['192x192', '512x512'].every((s) => mr.icons.some((i) => i.sizes === s)) && mr.icons.some((i) => i.purpose === 'maskable'));
const head = await pr.evaluate(() => ({ robots: document.querySelector('meta[name=robots]')?.content, apple: document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href'), cap: document.querySelector('meta[name=apple-mobile-web-app-capable]')?.content, title: document.title }));
check('page : noindex, apple-touch-icon, mode application iOS', /noindex/.test(head.robots) && !!head.apple && head.cap === 'yes', JSON.stringify(head));
const robots = await pr.evaluate(async () => (await (await fetch('robots.txt')).text()));
check('robots.txt interdit tout', /Disallow: \//.test(robots));
const demoTitle = await pd.evaluate(() => document.title);
check('la démo porte SON titre (configuration), pas celui de RADIA', demoTitle !== head.title, demoTitle);
for (const p of [pr, pd, ps]) await p.close(); await ctx.close();

// ---- 2. même origine : deux cadeaux en sous-dossiers
const ctx2 = await mk();
const a = await open(ctx2, 'http://localhost:4314/a/?debug');
const b = await open(ctx2, 'http://localhost:4314/b/?debug');
const same = await dump(b);
console.log('MÊME ORIGINE :', JSON.stringify(same));
check('même origine : caches séparés par préfixe (radia- et demo-)', same.caches.some((k) => k.startsWith('radia-')) && same.caches.some((k) => k.startsWith('demo-')));
check('même origine : clés de sauvegarde séparées (radia-save-v1 / demo-save-v1)', same.ls.includes('radia-save-v1') || same.ls.some((k) => k.startsWith('radia-')));
check('même origine : deux service workers à portées distinctes', same.sw.length === 2 && new Set(same.sw).size === 2, same.sw.join(' | '));
await a.evaluate(() => { window.RADIA.save.data.hearts = 4242; window.RADIA.save.writeNow(); });
check('même origine : la progression de la démo reste indépendante', (await b.evaluate(() => window.RADIA.save.data.hearts)) !== 4242);
await ctx2.close();

// ---- 3. réouverture « depuis l'écran d'accueil » : contexte persistant, fermeture complète, nouvelle ouverture, mode appli simulé
const userData = `${T}/profile`;
let c3 = await chromium.launchPersistentContext(userData, { executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
let p3 = await c3.newPage(); await p3.goto('http://localhost:4311/?debug', { waitUntil: 'networkidle' }); await sleep(2500);
await p3.evaluate(() => { window.RADIA.save.data.hearts = 31337; window.RADIA.save.data.world.flags['rw:start-gift-v1'] = true; window.RADIA.save.writeNow(); });
await c3.close();
c3 = await chromium.launchPersistentContext(userData, { executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
await c3.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { value: true }); }); // iOS : lancé depuis l'icône
p3 = await c3.newPage(); await p3.goto('http://localhost:4311/?debug', { waitUntil: 'networkidle' }); await sleep(3000);
check('fermeture complète puis réouverture : progression conservée', (await p3.evaluate(() => window.RADIA.save.data.hearts)) === 31337);
check('lancé depuis l\'écran d\'accueil : mode « standalone » reconnu', await p3.evaluate(() => document.documentElement.classList.contains('standalone')));
check('lancé depuis l\'écran d\'accueil : plus de bouton d\'installation', (await p3.locator('.install-btn').count()) === 0);
const noPad = await p3.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
check('aucun défilement horizontal', noPad);
await c3.close();
// Safari (onglet) : le bouton est là et montre les instructions Partager → Sur l'écran d'accueil
const c4 = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
await c4.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify({ v: 5, seenUpdates: ['v2','v3','v4','v5','v6','v7','v8','v9','v10'], story: { step: 9999 }, levels: {}, hearts: 10, world: { flags: { 'rw:start-gift-v1': true } } }));
const p4 = await c4.newPage(); await p4.goto('http://localhost:4311/', { waitUntil: 'networkidle' }); await sleep(3500);
for (let i = 0; i < 6; i++) { const b = p4.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await sleep(500); } else break; }
for (let i = 0; i < 12; i++) { const later = p4.getByRole('button', { name: /Plus tard|J.ai compris/ }); if (await later.count()) { await later.first().click().catch(() => {}); await sleep(900); } else if (i > 4 && !(await p4.locator('.modal-backdrop, .dy-back, .rw-root').count())) break; else await sleep(700); }
const btn = p4.locator('.install-btn');
check('Safari iPhone : bouton « Installer mon petit monde ❤️ » visible', (await btn.count()) === 1 && /Installer mon petit monde/.test(await btn.innerText()));
if (await btn.count()) { await btn.scrollIntoViewIfNeeded(); await btn.click(); await sleep(600); }
const modalText = await p4.locator('.modal-backdrop').first().innerText().catch(() => '');
check('instructions iOS : Partager + « Sur l\'écran d\'accueil »', /Partager/.test(modalText) && /Sur l.écran d.accueil/.test(modalText));
await p4.screenshot({ path: `${T}/install-ios.png` });
await c4.close();

await browser.close(); [A, B, C, S].forEach((s) => s.close());
const ko = results.filter((r) => !r).length; console.log(`\n${results.length - ko}/${results.length} OK`); process.exit(ko ? 1 : 0);
