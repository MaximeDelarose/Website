// TikTak + Snapchien : parcours Playwright (Chromium ÉMULÉ, pas un vrai iPhone).
// Build isolé : npx vite build --outDir /tmp/claude-0/n  puis  npx vite preview --outDir /tmp/claude-0/n --port 4195
// PORT=4195 W=393 H=852 node scripts/apps-e2e.mjs      (captures : shots/sc-*.png)
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
const shot = (n) => page.screenshot({ path: `shots/sc-${n}-${TAG}.png` });
const seed = { v: 2, seenUpdates: ['v2', 'v4'], story: { step: 80 }, levels: {}, hearts: 500 };
await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
await page.addInitScript(() => { try { const k = 'radia-save-v1'; const s = localStorage.getItem(k); if (s) { const j = JSON.parse(s); j.world = j.world || {}; j.world.flags = { ...(j.world.flags || {}), 'rw:start-gift-v1': true }; const d = new Date(), q = (x) => String(x).padStart(2, '0'), key = `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}`; j.fun = j.fun || {}; j.fun.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(j.fun.daily || {}), lastKey: key }; j.fun.free = { ...(j.fun.free || {}), announced: true }; localStorage.setItem(k, JSON.stringify(j)); } } catch { /* ignore */ } }); // écarte le « Bonus de départ » pour les anciennes sauvegardes de test
await page.addLocatorHandler(page.locator('#reward-overlay .rw-root'), async () => { for (let i = 0; i < 30; i++) { const r = await page.evaluate(() => { const ov = document.querySelector('#reward-overlay'); if (!ov) return 0; for (const sel of ['.rw-primary', '.rw-skip', '.rw-art']) { const e = ov.querySelector(sel); if (e && e.getBoundingClientRect().width && getComputedStyle(e).visibility !== 'hidden') { e.click(); return 1; } } return 1; }).catch(() => 0); if (!r) break; await page.waitForTimeout(500); } }); // ferme un cadeau qui s'ouvre en cours de parcours
await page.addInitScript(() => { const t = setInterval(() => { try { const w = window.RADIA && window.RADIA.save && window.RADIA.save.data && window.RADIA.save.data.world; if (w) { w.flags = w.flags || {}; w.flags['rw:start-gift-v1'] = true; const fu = window.RADIA.save.data.fun; if (fu) { const d = new Date(), q = (x) => String(x).padStart(2, '0'); fu.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(fu.daily || {}), lastKey: `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}` }; fu.free = { ...(fu.free || {}), announced: true }; clearInterval(t); } } } catch { /* ignore */ } }, 20); }); // pas de « Bonus de démarrage » dans les parcours de test
const boot = async () => {
  await page.goto(`http://localhost:${PORT}/?debug&statsDelay=999999999`, { waitUntil: 'networkidle' });
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
// ---------------------------------------------------------------- Snapchien : chat, snaps rouges, réponses, flammes
await boot();
await page.evaluate(() => window.RADIA.phone()); await sleep(900);
await page.evaluate(() => window.RADIA.apps.reset());
await page.evaluate(() => document.querySelector('.ph-x')?.click()); await sleep(400);
const chat = () => page.evaluate(() => window.RADIA.apps.chat.state());
let s0 = await chat();
check('5 contacts au départ (dont Hugo), aucun message', Object.values(s0.contacts).filter((c) => c.added).length === 5 && Object.values(s0.contacts).every((c) => c.msgs.length === 0));
// un snap photo (rouge), une vidéo (violette), un message
await page.evaluate(() => { const A = window.RADIA.apps.chat; A.push('dylan', 'snap', 'mirror'); A.push('kevin', 'video', 'tractor'); A.push('maxime', 'text'); });
await sleep(300);
await page.evaluate(() => window.RADIA.phone()); await sleep(900);
const badge = await page.locator('.phh-app[data-app="snap"]').locator('.phh-badge').first().innerText().catch(() => '');
check('la pastille de l\'icône Snapchien compte les nouveautés (3)', badge.trim() === '3', badge);
await page.locator('.phh-app[data-app="snap"]').click(); await sleep(1500);
check('Snapchien s\'ouvre sur l\'écran Chat', (await page.locator('.snc-body.list').count()) === 1);
const rows = await page.evaluate(() => [...document.querySelectorAll('.snc-row')].map((r) => ({ name: r.querySelector('b')?.childNodes[0]?.textContent, st: r.querySelector('.snc-st')?.innerText.replace(/\n/g, ' ') ?? '', red: !!r.querySelector('.snc-sq.red'), vid: !!r.querySelector('.snc-sq.vid'), txt: !!r.querySelector('.snc-sq.txt') })));
check('Dylan : snap photo = indicateur ROUGE « Nouveau Snap »', rows.some((r) => r.name === 'Dylan' && r.red && /Nouveau Snap/.test(r.st)), JSON.stringify(rows.find((r) => r.name === 'Dylan')));
check('Kevin : vidéo = indicateur VIOLET « Nouvelle vidéo » (distinct)', rows.some((r) => r.name === 'Kevin' && r.vid && !r.red && /Nouvelle vidéo/.test(r.st)));
check('Maxime : message = indicateur bleu « Nouveau message »', rows.some((r) => r.name === 'Maxime' && r.txt));
check('les contacts sans message ne montrent aucun indicateur', rows.filter((r) => r.name === 'Thomas').every((r) => !r.red && !r.vid && !r.txt));
await shot('chat-liste');
const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
check('pas de défilement horizontal', noHScroll);
// ouvrir le snap rouge de Dylan
await page.locator('.snc-row[data-cid="dylan"]').click(); await sleep(900);
check('toucher la ligne ouvre le snap en plein écran', (await page.locator('.snc-viewer').count()) === 1);
const viewer = await page.evaluate(() => { const v = document.querySelector('.snc-viewer'); const im = v.querySelector('img.snc-photo'); const r = v.getBoundingClientRect(); return { name: v.querySelector('.snc-vtop b')?.textContent, text: v.querySelector('.snc-cap p')?.textContent, imgOk: im.complete && im.naturalWidth > 100, full: Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight }; });
check('le personnage apparaît (image dessinée) et son message est lisible', viewer.imgOk && viewer.name === 'Dylan' && viewer.text.length > 5, JSON.stringify(viewer));
await shot('snap-ouvert');
let s1 = await chat();
check('le statut passe à « Ouvert » (sauvegardé)', s1.contacts.dylan.msgs[0].opened === true);
await page.locator('.snc-vreply').click(); await sleep(800);
check('« Répondre » amène à la conversation : champ de saisie, AUCUN choix multiple', (await page.locator('.snc-body.conv').count()) === 1 && (await page.locator('.snc-chip').count()) === 0 && (await page.locator('.cmp-in').count()) === 1);
check('le champ est un vrai <input> de 16 px minimum avec bouton d\'envoi et bouton caméra', await page.evaluate(() => { const i = document.querySelector('.cmp-in'); return i.tagName === 'INPUT' && parseFloat(getComputedStyle(i).fontSize) >= 16 && !!document.querySelector('.cmp-send') && !!document.querySelector('.cmp-cam'); }));
await page.locator('.cmp-in').fill('Mdrrrr mais pourquoi t\'as pas de t-shirt ?'); await page.locator('.cmp-send').click(); await sleep(700);
check('mon message apparaît (à droite) avec mon texte exact', (await page.locator('.snc-thread .snc-b.out').last().innerText()) === 'Mdrrrr mais pourquoi t\'as pas de t-shirt ?');
check('états de message lisibles (Envoyé / Reçu / Ouvert)', /Envoy|Re[çc]u|Ouvert/.test(await page.locator('.snc-deliv').first().innerText().catch(() => '')));
let sawTyping = false, sawAvatar = false;
for (let i = 0; i < 40 && !(sawTyping && sawAvatar); i++) { await sleep(250); sawTyping ||= (await page.locator('.snc-b.in.typing').count()) > 0; sawAvatar ||= (await page.locator('.snc-pres .snc-avatar').count()) > 0; }
check('« écrit… » et le Bitmoji de Dylan apparaissent pendant qu\'il rédige', sawTyping && sawAvatar);
await sleep(6000);
const thread = await page.locator('.snc-thread .snc-b').allInnerTexts();
check('Dylan répond au contenu (t-shirt)', thread.length >= 2 && thread.slice(-3).some((t) => /t-shirt|torse|chaud|sport|salle|séance|muscle|pourquoi|mdr/i.test(t)), thread.join(' | '));
await page.locator('.cmp-in').fill('et sinon tu fe koi dans la vie ?'); await page.locator('.cmp-send').click(); await sleep(7000);
const t2 = (await page.locator('.snc-thread .snc-b.in').allInnerTexts()).slice(-3).join(' | ');
check('réponse à une question libre (fautes d\'orthographe comprises)', /entrepren|projet|boîte|boite|startup|sport|vie/i.test(t2), t2);
await shot('conversation');
// clavier iPhone simulé
await page.evaluate((h0) => { const vv = Object.assign(new EventTarget(), { height: h0, width: 393, offsetTop: 0, offsetLeft: 0, scale: 1 }); Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true }); window.__vv = vv; }, H);
await page.locator('.snc-head.conv .snp-x').first().click(); await sleep(400); await page.locator('.snc-row[data-cid="dylan"]').click(); await sleep(700);
await page.evaluate((h0) => { window.__vv.height = h0 - 336; window.__vv.dispatchEvent(new Event('resize')); }, H); await sleep(400);
const kb = await page.evaluate(() => { const b = document.querySelector('.snc-body.conv'); const i = document.querySelector('.cmp-in').getBoundingClientRect(); const th = document.querySelector('.snc-thread').getBoundingClientRect(); return { open: b.classList.contains('kb-open'), inputBottom: i.bottom, vh: window.__vv.height, thBottom: th.bottom, thTop: th.top }; });
check('clavier ouvert : champ au-dessus du clavier, fil de messages intact', kb.open && kb.inputBottom <= kb.vh + 1 && kb.thBottom <= kb.inputBottom && kb.thTop >= 0, JSON.stringify(kb));
await shot('clavier');
await page.evaluate((h0) => { window.__vv.height = h0; window.__vv.dispatchEvent(new Event('resize')); }, H); await sleep(300);
// snap de Radia : échange réciproque → flamme
await page.locator('.cmp-cam').click(); await sleep(600);
await page.locator('.modal-backdrop .actions button', { hasText: 'Mon sourire' }).click(); await sleep(9000); // réponses échelonnées
s1 = await chat();
check('envoyer un snap : Dylan répond par un snap (rouge) ; la flamme démarre à 1 (échange réciproque)', s1.contacts.dylan.flame.n === 1 && s1.contacts.dylan.msgs.some((m) => m.from === 'in' && m.kind === 'snap' && m.opened === false));
check('flamme affichée à côté du nom (🔥 1)', (await page.locator('.snc-who .snc-fl').innerText()) === '🔥 1');
// les messages texte seuls ne comptent pas pour les flammes
await page.locator('.cmp-in').fill('ok bonne nuit'); await page.locator('.cmp-send').click(); await sleep(1400);
s1 = await chat();
check('un message texte ne fait pas progresser la flamme', s1.contacts.dylan.flame.n === 1);
// supprimer un contact : il ne revient pas
await page.locator('.snc-more').click(); await sleep(500);
await page.locator('.modal-backdrop .actions button', { hasText: 'Supprimer' }).click(); await sleep(800);
s1 = await chat();
check('contact supprimé : retiré de la liste, historique conservé, jamais rétabli', s1.contacts.dylan.deleted === true && (await page.locator('.snc-row[data-cid="dylan"]').count()) === 0 && s1.contacts.dylan.msgs.length > 0);
// notifications coupées
await page.locator('.snc-bell').click(); await sleep(400);
check('les notifications de Snapchien peuvent être coupées', (await chat()).muted === true);
// rechargement
await page.evaluate(() => window.RADIA.save.writeNow());
await page.reload({ waitUntil: 'networkidle' }); await sleep(2500);
await page.evaluate(() => window.RADIA.phone()); await sleep(900);
s1 = await chat();
check('après rechargement : conversations, flammes, contact supprimé, notifications conservés', s1.contacts.kevin.msgs.length >= 1 && s1.contacts.dylan.deleted === true && s1.contacts.dylan.flame.n === 1 && s1.muted === true);
// arrivée spontanée (temps de jeu actif)
await page.evaluate(() => window.RADIA.apps.chat.tick(60000)); await page.evaluate(() => window.RADIA.apps.chat.tick(60000));
check('aucune erreur JS', errs.length === 0, errs.slice(0, 2).join(' | '));
const ko = out.filter((l) => l.startsWith('KO')).length;
console.log(`\n${out.length - ko}/${out.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
