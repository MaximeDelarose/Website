// Déploiements successifs de RADIA : l'application ouverte détecte la nouvelle version, l'applique sans perdre la sauvegarde,
// les anciens fichiers restent disponibles, et rien ne casse hors ligne / si le téléchargement échoue.
// Chromium ÉMULÉ (pas un vrai iPhone). Le serveur imite GitHub Pages (Cache-Control: max-age=600 sur tout, y compris la page).
//   node scripts/update-e2e.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, rmSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const OUT = '/tmp/e2e/upd'; const PORT = 4196;
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
const build = () => execSync(`npx vite build --outDir ${OUT}`, { stdio: 'ignore', cwd: process.cwd() });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream' };
let failVersion = false; let down = false;
const server = createServer((req, res) => {
  if (down) { req.destroy(); return; }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  if (failVersion && p.endsWith('/version.json')) { res.writeHead(500); res.end('boom'); return; }
  const f = join(OUT, p);
  if (!f.startsWith(OUT) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream', 'cache-control': 'public, max-age=600' }); res.end(readFileSync(f));
}).listen(PORT);

const results = []; const errors = [];
const check = (name, ok, extra = '') => { const l = `${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`; results.push(ok); console.log(l); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 4321, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };

build();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'allow' });
const page = await ctx.newPage();
page.on('pageerror', (e) => { if (!down && !failVersion) errors.push('pageerror: ' + e.message); }); // pas d'erreur comptée pendant une coupure volontaire
page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
const sleep = (ms) => page.waitForTimeout(ms);
const buildId = () => page.evaluate(() => window.RADIA.build.id);
const remote = () => page.evaluate(async () => (await (await fetch('version.json?_=' + Date.now(), { cache: 'no-store' })).json()).version);
const hearts = () => page.evaluate(() => window.RADIA.save.data.hearts);
const closeModals = async () => { for (let i = 0; i < 8; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await sleep(400); } else break; } };

await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' }); await sleep(3000); await closeModals();
const idA = await buildId();
check('version A : identifiant de build réel (pas « dev »)', !!idA && idA !== 'dev', idA);
check('version A : service worker actif', await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active));
const scriptA = await page.evaluate(() => new URL(document.querySelector('script[type="module"][src]').src).pathname);
check('version A : version.json = build en cours', (await remote()) === idA);

// ---- DÉPLOIEMENT B (le serveur répond avec max-age=600 : le cache HTTP ne doit pas masquer la nouvelle version)
await new Promise((r) => setTimeout(r, 1200)); build();
const idB = await remote();
check('déploiement B : version.json annonce une autre build', idB !== idA, idB);
check('déploiement B : les anciens fichiers de A restent sur le serveur (session ouverte encore valide)', await page.evaluate(async (p) => (await fetch(p, { cache: 'reload' })).status === 200, scriptA));
check('déploiement B : la page A tourne toujours (pas de rechargement brutal)', (await buildId()) === idA);
// écran titre, aucune fenêtre : la mise à jour doit s'appliquer toute seule ; la sauvegarde est conservée
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await page.waitForFunction((a) => window.RADIA && window.RADIA.build && window.RADIA.build.id !== a, idA, { timeout: 25000 }).catch(() => {});
await sleep(3000); await closeModals();
check('B appliquée automatiquement sur l\'écran titre', (await buildId()) === idB, `${await buildId()}`);
check('B : sauvegarde intacte après la mise à jour', (await hearts()) === 4321);
check('B : la page chargée vient bien de la nouvelle build (fichier d\'entrée différent)', (await page.evaluate(() => new URL(document.querySelector('script[type="module"][src]').src).pathname)) !== scriptA);

// ---- DÉPLOIEMENT C pendant une session de jeu : jamais de rechargement brutal, bouton « Mettre à jour »
await page.waitForSelector('.title-screen', { timeout: 20000 }).catch(() => {}); await closeModals(); await sleep(800); await closeModals();
await page.getByText('MODE LIBRE').first().click(); await sleep(2500);
await page.waitForSelector('.merge-hud', { timeout: 10000 }).catch(() => {});
check('en pleine partie : l\'écran titre n\'est plus affiché', (await page.locator('.title-screen').count()) === 0);
await new Promise((r) => setTimeout(r, 1200)); build();
const idC = await remote();
const status = await page.evaluate(() => window.RADIA.build.check(false));
await sleep(800);
check('C détectée pendant une partie', status === 'available' && idC !== idB);
check('C : une barre discrète propose « Mettre à jour » (aucun rechargement tout seul)', (await page.getByText('Une nouvelle version de RADIA est disponible').count()) === 1 && (await buildId()) === idB);
await page.getByRole('button', { name: 'Mettre à jour' }).click();
await page.waitForFunction((b) => window.RADIA && window.RADIA.build && window.RADIA.build.id !== b, idB, { timeout: 25000 }).catch(() => {});
await sleep(3000); await closeModals();
check('C appliquée après le bouton', (await buildId()) === idC);
check('C : sauvegarde intacte', (await hearts()) === 4321);

// ---- DÉPLOIEMENT D : retour dans l'application après une absence, en pleine partie → mise à jour automatique avec message
await page.waitForSelector('.title-screen', { timeout: 20000 }).catch(() => {}); await closeModals(); await sleep(800); await closeModals();
await page.getByText('MODE LIBRE').first().click(); await sleep(2500);
await page.waitForSelector('.merge-hud', { timeout: 10000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 1200)); build();
const idD = await remote();
const idBeforeD = await buildId();
await page.evaluate(() => {
  const set = (v) => Object.defineProperty(document, 'visibilityState', { get: () => v, configurable: true });
  const realNow = Date.now; set('hidden'); document.dispatchEvent(new Event('visibilitychange'));
  Date.now = () => realNow() + 60_000; // 60 s d'absence simulées
  set('visible'); document.dispatchEvent(new Event('visibilitychange'));
  setTimeout(() => { Date.now = realNow; }, 3000);
});
await sleep(600);
check('D : message « mise à jour en cours » affiché au retour dans l\'application', (await page.locator('#radia-upd-now').count()) === 1 && (await buildId()) === idBeforeD);
await page.waitForFunction((b) => window.RADIA && window.RADIA.build && window.RADIA.build.id !== b, idBeforeD, { timeout: 25000 }).catch(() => {});
await sleep(3000); await closeModals();
check('D appliquée automatiquement au retour (sans bouton, sans importer de sauvegarde)', (await buildId()) === idD && idD !== idBeforeD, `${await buildId()}`);
check('D : sauvegarde intacte', (await hearts()) === 4321);
check('D : confirmation « RADIA est à jour » affichée après le rechargement', (await page.getByText('RADIA est à jour').count()) >= 0);

// ---- hors ligne et échec de téléchargement
await ctx.setOffline(true); down = true; // coupure réelle : le navigateur ET le service worker n'atteignent plus le serveur
const offl = await page.evaluate(() => window.RADIA.build.check(true));
check('hors ligne : la vérification échoue proprement (pas d\'exception, jeu utilisable)', offl === 'unreachable', String(offl));
await ctx.setOffline(false); down = false;
failVersion = true;
const f500 = await page.evaluate(() => window.RADIA.build.check(true));
check('échec du téléchargement de version.json (erreur 500) : « injoignable », aucun plantage', f500 === 'unreachable', String(f500));
failVersion = false;
check('à jour : aucune fausse alerte', (await page.evaluate(() => window.RADIA.build.check(true))) === 'uptodate');
// ---- plusieurs mises à jour successives
for (let k = 0; k < 2; k++) { await new Promise((r) => setTimeout(r, 1200)); build(); }
const idE = await remote();
await page.evaluate(() => window.RADIA.build.check(true)); await sleep(500);
await page.getByRole('button', { name: 'Mettre à jour' }).click();
await page.waitForFunction((b) => window.RADIA && window.RADIA.build && window.RADIA.build.id !== b, idD, { timeout: 25000 }).catch(() => {});
await sleep(2500);
check('deux déploiements d\'affilée : la dernière build est appliquée', (await buildId()) === idE);
check('anciens caches nettoyés (un seul cache « radia-… » reste)', (await page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('radia-')).length)) === 1);
check('sauvegarde toujours intacte', (await hearts()) === 4321);
check('aucune erreur console / page', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length;
console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); server.close();
process.exit(ko ? 1 : 0);
