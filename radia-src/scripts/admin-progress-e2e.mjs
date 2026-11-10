// Page administrateur : sections de PROGRESSION (histoire, XP, session, mode libre, PIMBÊCHE, Mon Monde, temps par mode, évolution, historique)
// avec le serveur SIMULÉ — Chromium ÉMULÉ, jamais un vrai iPhone. Les valeurs ci-dessous sont des données de test, pas du jeu réel.
//   (cd .. && python3 -m http.server 4310 --bind 127.0.0.1) &   puis   SITE=http://127.0.0.1:4310 node scripts/admin-progress-e2e.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE ?? 'http://127.0.0.1:4310', PAGE = `${SITE}/radia-admin.html`;
const API = 'https://euxlmipqzmvnzzyalyfn.supabase.co', KEY = 'sb-euxlmipqzmvnzzyalyfn-auth-token';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = () => Math.floor(Date.now() / 1000);
const jwt = (exp) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'ad000000-0000-4000-8000-000000000001', role: 'authenticated', email: 'fcrdaug@gmail.com', exp })}.sig`;
const session = () => ({ access_token: jwt(now() + 3600), refresh_token: 'rt', expires_at: now() + 3600, expires_in: 3600, token_type: 'bearer', user: { id: 'ad000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'fcrdaug@gmail.com', app_metadata: { provider: 'google' }, user_metadata: {}, created_at: new Date().toISOString() } });
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const dev = { id: '11111111-2222-4333-8444-555555555555', short: '11111111', label: 'iPhone de Radia', platform: 'pwa', tz: 'Europe/Paris', consent_at: iso(864e5), paused_at: null, first_seen: iso(864e5), last_seen: iso(120e3), total_s: 5400, sessions_total: 6, today_s: 1500, week_s: 4080, sessions_today: 2, last_open: iso(1500e3),
  last_session: { started_at: iso(1500e3), last_activity: iso(120e3), active_s: 1320, ended_at: null, end_reason: null, live: true }, days: [{ day: new Date().toISOString().slice(0, 10), active_s: 1500, sessions: 2 }], sessions: [] };
const snap = { v: 1, at: Date.now(), story: { step: 80, chapter: 4, chapterTitle: 'Ma reine', chapterSubtitle: 'Le royaume', chaptersTotal: 5, levelsDone: 22, levelsTotal: 30, chapterDone: 4, chapterTotal: 6, chapterPct: 67, storyPct: 73, finished: false, current: { id: 23, title: 'Le bal du royaume' }, lastDone: { id: 22, title: 'Test 22' }, objective: { label: 'Fabriquer une couronne', have: 1, goal: 3 }, inRun: true },
  xp: { level: 7, into: 120, need: 400, xp: 1500 }, free: { orders: 40, easy: 20, mid: 14, hard: 6, merges: 900, combos: 31, bestCombo: 11, discoveries: 52, levelsWon: 22, albumTotal: 0 },
  pimb: { unlocked: true, workshop: 2, upgrades: ['atelier2', 'rose'], recipes: ['rose'], soapOrders: 9, soapMade: 14, loyal: 2, collection: 5, collectionTotal: 8 },
  world: { rooms: 5, roomsTotal: 9, furniture: 12, furnitureTotal: 36, wardrobe: 30, wardrobeTotal: 117, gardenPlots: 4, chocRecipes: 3, chocShop: 1, careers: 1, cat: true, family: 2, pct: 30 } };
const prog = { ok: true, consent: true, consent_at: iso(864e5), paused_at: null, snap, snap_at: iso(60e3),
  events: [{ id: 'lvl:22', at: iso(3600e3), kind: 'level_done', label: 'Niveau 22 terminé — Test 22' }, { id: 'chu:4', at: iso(7200e3), kind: 'chapter_unlocked', label: 'Chapitre 4 débloqué — Ma reine' }, { id: 'xp:7', at: iso(5000e3), kind: 'xp_level', label: 'Niveau de Radia 7' }],
  modes: [{ day: new Date().toISOString().slice(0, 10), mode: 'endless', active_s: 900, sessions: 2 }, { day: new Date().toISOString().slice(0, 10), mode: 'chapters', active_s: 600, sessions: 1 }, { day: new Date().toISOString().slice(0, 10), mode: 'casino', active_s: 120, sessions: 1 }],
  sessions: [{ id: 'aaaaaaaa-0000-4000-8000-000000000001', started_at: iso(1500e3), last_push_at: iso(120e3), active_s: 1320, summary: { base: { orders: 37, merges: 868, levels: 21, soap: 13, furniture: 11, clothes: 29, discoveries: 50, combos: 30, upgrades: 1 }, now: { orders: 40, merges: 900, levels: 22, soap: 14, furniture: 12, clothes: 29, discoveries: 52, combos: 31, upgrades: 2 }, start: { chapter: 4, level: 22 }, end: { chapter: 4, level: 23 } }, modes: ['chapters', 'endless'] },
    { id: 'aaaaaaaa-0000-4000-8000-000000000002', started_at: iso(90000e3), last_push_at: iso(89000e3), active_s: 600, summary: { base: { orders: 30, merges: 800 }, now: { orders: 37, merges: 868 }, start: { chapter: 4, level: 21 }, end: { chapter: 4, level: 22 } }, modes: ['endless'] }] };

async function open(label, progRoute) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [KEY, JSON.stringify(session())]);
  await page.route(`${API}/rest/v1/rpc/radia_stats_admin`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ now: new Date().toISOString(), devices: [dev], retention: { sessions_days: 90, days_days: 400, idle_device_days: 180 } }) }));
  await page.route(`${API}/rest/v1/rpc/radia_progress_admin`, progRoute ?? ((r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(prog) })));
  return { ctx, page, errs, text: async () => (await page.locator('#app').innerText()).replace(/\s+/g, ' ') };
}
let t = await open('full');
await t.page.goto(PAGE); await t.page.waitForSelector('text=Progression de l’histoire', { timeout: 8000 }).catch(() => {});
let tx = await t.text();
check('histoire : chapitre 4 — Ma reine, niveau 23 — Le bal du royaume', /Chapitre 4 — Ma reine/.test(tx) && /Niveau 23 — Le bal du royaume/.test(tx));
check('histoire : progression du chapitre 4/6 — 67 %, histoire 22/30 — 73 %', /Progression du chapitre : 4\/6 — 67 %/.test(tx) && /22\/30 niveaux — 73 %/.test(tx));
check('histoire : objectif et progression de l\'objectif (partie sauvegardée)', /Objectif actuel : Fabriquer une couronne/.test(tx) && /Progression de l’objectif : 1\/3/.test(tx));
check('histoire : dernier niveau terminé et date', /Dernier niveau terminé : Niveau 22/.test(tx) && /Terminé le /.test(tx));
check('niveaux d\'histoire distingués de l\'expérience de Radia', /distincts du niveau d’expérience/.test(tx));
check('XP : niveau 7, jauge, 120 / 400 XP vers le niveau 8', /Niveau 7/.test(tx) && /120 \/ 400 XP vers le niveau 8/.test(tx) && (await t.page.locator('[role=progressbar]').count()) >= 4);
check('XP : compteurs réels (40 commandes, 52 objets, 900 fusions)', /40/.test(tx) && /52/.test(tx) && /900/.test(tx));
check('dernière session : activités (3 commandes, 32 fusions, 1 niveau, 1 savon, 1 décoration) et progression début/fin', /3 commandes livrées\./.test(tx) && /32 fusions réalisées\./.test(tx) && /1 nouveau niveau terminé\./.test(tx) && /1 savon PIMBÊCHE fabriqué\./.test(tx) && /1 décoration débloquée\./.test(tx) && /Début : chapitre 4, niveau 22/.test(tx) && /Fin : chapitre 4, niveau 23/.test(tx));
check('mode libre : faciles 20, moyennes 14, difficiles 6, combos 31, plus grand combo 11', /Faciles/.test(tx) && /Difficiles/.test(tx) && /Plus grand combo/.test(tx));
check('PIMBÊCHE : atelier niveau 2, 14 savons, 9 commandes, 1/5 recettes, 2 clientes fidèles, collection 5/8', /Atelier débloqué · niveau 2/.test(tx) && /1 \/ 5 Recettes découvertes/.test(tx) && /5 \/ 8 Objets de collection/.test(tx) && /14 Savons terminés/.test(tx) && /9 Commandes PIMBÊCHE livrées/.test(tx) && /2 Clientes fidèles/.test(tx) && /Les savons sont bien utilisés/.test(tx));
check('Mon Monde : 30 % calculé sur objectifs finis, explication, pièces 5/9', /Progression générale : 30 %/.test(tx) && /objectifs finis/.test(tx) && /Pièces débloquées : 5 \/ 9/.test(tx));
check('modes : répartition avec noms et sessions', /Mode libre/.test(tx) && /Chapitres/.test(tx) && /Casino Royal/.test(tx) && /arrière-plan/.test(tx));
check('évolution : 7 jours / 30 jours', /Évolution dans le temps/.test(tx) && (await t.page.locator('button', { hasText: '30 jours' }).count()) === 1);
await t.page.locator('button', { hasText: '30 jours' }).click(); await new Promise((r) => setTimeout(r, 200));
check('évolution : passage à 30 jours sans erreur', /Temps actif \(30 j\)/.test(await t.text()));
check('historique des chapitres : jalons', /Niveau 22 terminé/.test(tx) && /Chapitre 4 débloqué/.test(tx));
// session : toucher une ligne pour voir le résumé
const rows = t.page.locator('button.srow'); check('historique des sessions : 2 lignes cliquables', (await rows.count()) === 2);
await rows.nth(1).click(); await new Promise((r) => setTimeout(r, 150));
check('résumé d\'une ancienne session : 7 commandes, 68 fusions', /7 commandes livrées\./.test(await t.text()) && /68 fusions réalisées\./.test(await t.text()));
check('pas de défilement horizontal (iPhone)', await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
check('zones tactiles ≥ 36 px', await t.page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).every((b) => b.getBoundingClientRect().height >= 35)));
await t.page.screenshot({ path: 'shots/admin-progress.png', fullPage: true });
check('aucune erreur JavaScript', t.errs.length === 0, t.errs.join(' | ')); await t.ctx.close();

// non consenti : message clair, aucune donnée de progression
t = await open('noconsent', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, consent: false, consent_at: null, paused_at: iso(1e6), snap: null, events: [], modes: [], sessions: [] }) }));
await t.page.goto(PAGE); await t.page.waitForSelector('text=Progression non partagée', { timeout: 8000 }).catch(() => {});
tx = await t.text();
check('sans consentement : « Progression non partagée » et explication, aucune donnée de progression affichée', /Progression non partagée/.test(tx) && /n’a pas activé « Partager ma progression de jeu/.test(tx) && !/Chapitre 4/.test(tx));
check('sans consentement : le temps de jeu reste affiché', /25 min/.test(tx));
await t.ctx.close();

// erreur serveur sur la progression : le temps de jeu reste visible, message clair
t = await open('error', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'boom' }) }));
await t.page.goto(PAGE); await t.page.waitForSelector('text=Dernière ouverture', { timeout: 8000 }).catch(() => {});
tx = await t.text();
check('erreur de progression : message clair et temps de jeu conservé', /Progression indisponible/.test(tx) && /Dernière ouverture/.test(tx));
await t.ctx.close();
await browser.close();
const ok = results.filter(Boolean).length; console.log(`\n${ok}/${results.length} vérifications OK`); process.exit(ok === results.length ? 0 : 1);
