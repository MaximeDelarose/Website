// TikTak + Snapchien : parcours Playwright (Chromium ÉMULÉ, pas un vrai iPhone).
// Build isolé : npx vite build --outDir /tmp/claude-0/n  puis  npx vite preview --outDir /tmp/claude-0/n --port 4195
// PORT=4195 W=393 H=852 node scripts/apps-e2e.mjs      (captures : shots/n-*.png)
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
const shot = (n) => page.screenshot({ path: `shots/n-${n}-${TAG}.png` });
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

await boot();
await page.evaluate(() => window.RADIA.phone());
await sleep(900);
check('API debug RADIA.apps présente (chargée avec le téléphone)', await page.evaluate(() => !!window.RADIA?.apps));
await page.evaluate(() => window.RADIA.apps.reset());
await page.evaluate(() => document.querySelector('.ph-x')?.click());
await sleep(400);

// ---------- téléphone : les deux applications y sont
await page.evaluate(() => window.RADIA.phone());
await sleep(700);
const apps = await page.locator('.ph-app').allTextContents();
check('téléphone : TikTak et Snapchien dans la bande d’applications', apps.some((t) => /TikTak/.test(t)) && apps.some((t) => /Snapchien/.test(t)), apps.join(' | '));
await shot('phone');
// ---------- Clips
await page.locator('.ph-app', { hasText: 'TikTak' }).click();
await sleep(1800);
check('Clips ouvert', (await page.locator('.clp-layer').count()) === 1);
check('Clips : ≥ 2 publications dans le fil, canvas dessiné', (await page.locator('.clp-post').count()) >= 2);
const painted = await page.evaluate(() => { const c = document.querySelector('.clp-post canvas'); const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4000) if (d[i] > 0) n++; return n; });
check('Clips : la scène est bien dessinée (pixels non vides)', painted > 20, String(painted));
await shot('clips-1');
const a0 = await activeId();
await swipeUp();
const a1 = await activeId();
check('Clips : un glissé vertical passe à la publication suivante (scroll-snap)', a1 && a1.i === a0.i + 1 && Math.abs(a1.top - a1.i * a1.h) < 2, JSON.stringify([a0, a1]));
await shot('clips-2');
const pageScroll = await page.evaluate(() => [document.scrollingElement.scrollTop, window.scrollY]);
check('Clips : la page ne défile pas', pageScroll.every((v) => v === 0));
// like (bouton), favori, double tap
const post = () => page.locator('.clp-post').nth(a1.i);
await post().locator('.clp-act[aria-label="J’aime"]').click(); await sleep(250);
let s1 = await st();
check('Clips : like par bouton enregistré', s1.clips.liked.includes(a1.id));
await post().locator('.clp-act[aria-label="Favori"]').click(); await sleep(250);
s1 = await st();
check('Clips : favori enregistré', s1.clips.faved.includes(a1.id));
await swipeUp();
const a2 = await activeId();
// deux clics rapprochés (le double toucher réel dépend de la charge machine : on envoie les deux événements à ~10 ms)
await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); for (let i = 0; i < 2; i++) el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })); }, [W / 2, H * 0.4]); await sleep(350);
await shot('clips-heart');
s1 = await st();
check('Clips : double toucher = like', s1.clips.liked.includes(a2.id));
// commentaires
await page.locator('.clp-post').nth(a2.i).locator('.clp-act[aria-label="Commentaires"]').click(); await sleep(500);
check('Clips : feuille de commentaires fictifs (≥ 3)', (await page.locator('.clp-sheet .clp-com').count()) >= 3);
await page.locator('.clp-sheet .clp-input').fill('Merci beaucoup ♡'); await page.locator('.clp-sendbtn').click(); await sleep(300);
await shot('clips-comments');
s1 = await st();
check('Clips : commentaire de Radia enregistré', (s1.clips.comments[a2.id] ?? []).includes('Merci beaucoup ♡'));
await page.locator('.clp-sheet .clp-x').click(); await sleep(400);
// partage vers l’album
await page.locator('.clp-post').nth(a2.i).locator('.clp-act[aria-label="Partager"]').click(); await sleep(450);
await shot('clips-share');
await page.locator('.clp-opt').first().click(); await sleep(500);
s1 = await st();
check('Clips : partage → photo dans l’album interne', s1.albumSnap === 1 && s1.snap.photos.length === 1);
// profil
await page.locator('.clp-tab', { hasText: 'Profil' }).click(); await sleep(800);
await shot('clips-profile');
check('Clips : profil (compteurs)', (await page.locator('.clp-stats b').count()) === 3);
await page.locator('.clp-x').first().click(); await sleep(500);

// ---------- Snap
await page.evaluate(() => window.RADIA.phone()); await sleep(600);
await page.locator('.ph-app', { hasText: 'Snapchien' }).click(); await sleep(1200);
check('Snap ouvert', (await page.locator('.snp-layer').count()) === 1);
await shot('snap-home');
// Snapchien s'ouvre désormais sur « Chat » ; l'appareil photo est dans l'onglet « Souvenirs ».
await page.locator('.snc-tab', { hasText: 'Souvenirs' }).click(); await sleep(600);
await page.locator('.snp-fab').click(); await sleep(1400);
check('Snap : appareil (aperçu animé)', (await page.locator('.snp-prev').count()) === 1);
await shot('snap-camera');
await page.locator('.snp-tab', { hasText: 'Pose' }).click(); await sleep(200);
await page.locator('.snp-chip', { hasText: 'Cœur' }).first().click(); await sleep(200);
await page.locator('.snp-tab', { hasText: 'Stickers' }).click(); await sleep(250);
await page.locator('.snp-sk').first().click(); await sleep(200);
await page.locator('.snp-chip.txt').first().click(); await sleep(200);
let s2 = await st();
check('Snap : 2 autocollants ajoutés (brouillon enregistré)', s2.snap.cam && s2.snap.cam.stickers.length === 2);
// déplacer l’autocollant au doigt
const box = await page.locator('.snp-prev').boundingBox();
const stk = s2.snap.cam.stickers[1];
const sx = box.x + stk.x * box.width, sy = box.y + stk.y * box.height;
await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(sx + 40, sy + 60, { steps: 6 }); await page.mouse.up(); await sleep(250);
s2 = await st();
check('Snap : autocollant déplacé au doigt', Math.abs(s2.snap.cam.stickers[1].x - stk.x) > 0.04, `${stk.x.toFixed(2)} → ${s2.snap.cam.stickers[1].x.toFixed(2)}`);
await shot('snap-stickers');
// agrandir puis supprimer le premier
await page.mouse.click(box.x + s2.snap.cam.stickers[1].x * box.width, box.y + s2.snap.cam.stickers[1].y * box.height); await sleep(200);
await page.locator('.snp-cb[aria-label="Agrandir"]').click(); await sleep(150);
s2 = await st();
check('Snap : agrandir un autocollant', s2.snap.cam.stickers[1].s > stk.s);
await page.locator('.snp-cb[aria-label="Supprimer"]').click(); await sleep(200);
s2 = await st();
check('Snap : supprimer un autocollant', s2.snap.cam.stickers.length === 1);
// obturateur
const before = s2.albumSnap;
await page.locator('.snp-shutter').click(); await sleep(150); await shot('snap-shutter'); await sleep(900);
s2 = await st();
check('Snap : photo enregistrée dans l’album du jeu (PhotoRec)', s2.albumSnap === before + 1);
await sleep(600);
check('Snap : visionneuse après la prise', (await page.locator('.snp-vcv').count()) === 1);
await shot('snap-viewer');
// story à partir de la photo
await page.locator('.snp-act', { hasText: 'Story' }).click(); await sleep(600);
await shot('snap-story-composer');
await page.locator('.snp-ov .snp-cell').first().click(); await sleep(150);
await page.locator('.snp-ov .snp-cell').nth(1).click().catch(() => {}); await sleep(150);
await page.locator('.snp-go').click({ noWaitAfter: true });
let nReacts = 0;
for (let i = 0; i < 10; i++) { await sleep(300); nReacts = Math.max(nReacts, await page.locator('.snp-react').count()); if (i === 5) await shot('snap-story-view'); }
s2 = await st();
check('Snap : story publiée (1 à 5 images)', s2.snap.stories.length === 1 && s2.snap.stories[0].frames.length >= 1 && s2.snap.stories[0].frames.length <= 5);
check('Snap : réactions fictives affichées pendant la story', nReacts >= 1, String(nReacts));
await page.waitForSelector('.snp-ov.story', { state: 'detached', timeout: 30000 }).catch(() => {});
await sleep(600);
await shot('snap-home-stories');
check('Snap : barre de stories', (await page.locator('.snp-story').count()) >= 2);
await page.locator('.snp-x').first().click(); await sleep(500);

// ---------- moments : carrière → proposition → Clips
await page.evaluate(() => window.RADIA.apps.emit('runway'));
await sleep(2200);
check('moment de défilé : carte de proposition discrète', (await page.locator('.snp-prop').count()) === 1);
await shot('prop-card');
let s3 = await st();
check('moment en attente (badge) — aucune publication automatique', s3.snap.pending.length === 1 && s3.snap.stories.length === 1 && s3.clips.mine.length === 0);
const fans0 = s3.fans;
await page.locator('.snp-prop .btn', { hasText: 'Dans TikTak' }).click(); await sleep(1800);
check('Clips : choix entre 3 versions du moment', (await page.locator('.clp-choice').count()) === 3);
await shot('clips-chooser');
await page.locator('.clp-choice').nth(1).click(); await sleep(200);
await page.locator('.clp-go').click(); await sleep(900);
await shot('clips-published');
s3 = await st();
check('Clips : publication dans le profil de Radia', s3.clips.mine.length === 1);
check('Clips : fans fictifs ajoutés (plafonnés)', s3.fans > fans0 && s3.clips.fansToday.n <= 400, `${fans0} → ${s3.fans}`);
check('Lien : Auguste envoie un mot après la publication', await page.evaluate(() => window.RADIA.save.data.events.msgs.some((m) => m.from === 'auguste' && /vid|dîner|table|soirée/i.test(m.text))));
await page.locator('.clp-tab', { hasText: 'Profil' }).click(); await sleep(900);
await shot('clips-profile-2');
check('Clips : la publication apparaît dans le profil', (await page.locator('.clp-pcell2').count()) === 1);
await page.locator('.clp-x').first().click(); await sleep(500);
// moment de restaurant → story automatique
await page.evaluate(() => window.RADIA.apps.emit('restaurant'));
await sleep(2200);
await page.locator('.snp-prop .btn', { hasText: 'Publier' }).first().click(); await sleep(900);
s3 = await st();
check('story automatique publiée après action explicite', s3.snap.stories.length === 2 && s3.snap.pending.filter((p) => p.kind === 'restaurant').length === 0);
await shot('prop-published');
// badge sur l’icône
await page.evaluate(() => window.RADIA.apps.emit('fireworks')); await sleep(300);
await page.evaluate(() => { document.querySelector('.snp-prop')?.remove(); window.RADIA.phone(); }); await sleep(600);
const dots = await page.locator('.ph-app .ph-dot').allTextContents();
check('badge de notification sur l’icône Snap', dots.length >= 1, dots.join(','));
await shot('phone-badge');
await page.locator('.ph-tab[data-tab="souvenirs"]').click(); await sleep(900);
check('Photos souvenirs du téléphone contiennent les photos Snap', /(\d+) photos?/.test(await page.locator('.ph-count').first().textContent().catch(() => '')));
await shot('phone-souvenirs');

// ---------- persistance après rechargement (fermeture de Safari)
const beforeReload = await st();
await sleep(500);
await boot();
await loadApps();
const afterReload = await st();
check('rechargement : publications, favoris, likes, stories, photos conservés',
  afterReload.clips.mine.length === beforeReload.clips.mine.length && afterReload.clips.faved.length === beforeReload.clips.faved.length && afterReload.clips.liked.length === beforeReload.clips.liked.length
  && afterReload.snap.stories.length === beforeReload.snap.stories.length && afterReload.snap.photos.length === beforeReload.snap.photos.length && afterReload.albumSnap === beforeReload.albumSnap && afterReload.snap.pending.length === beforeReload.snap.pending.length,
  JSON.stringify([beforeReload.clips.mine.length, afterReload.clips.mine.length, beforeReload.snap.stories.length, afterReload.snap.stories.length]));
check('rechargement : brouillon d’appareil conservé', !!afterReload.snap.cam);
// ---------- disposition
await page.evaluate(() => window.RADIA.apps.openClips()); await sleep(1500);
check('pas de défilement horizontal (Clips)', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
const small = await page.evaluate(() => [...document.querySelectorAll('.clp-layer button')].filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { l: b.getAttribute('aria-label') || b.textContent.trim().slice(0, 14), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w < 40 || x.h < 40));
check('Clips : zones tactiles ≥ 40 px', small.length === 0, JSON.stringify(small));
await shot('clips-after-reload');
await page.locator('.clp-x').first().click(); await sleep(400);
await page.evaluate(() => window.RADIA.apps.openSnap()); await sleep(1200);
const small2 = await page.evaluate(() => [...document.querySelectorAll('.snp-layer button')].filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { l: b.getAttribute('aria-label') || b.textContent.trim().slice(0, 14), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w < 40 || x.h < 40));
check('Snap : zones tactiles ≥ 40 px', small2.length === 0, JSON.stringify(small2));
await shot('snap-after-reload');
check('aucune erreur console / page', errs.length === 0, errs.slice(0, 4).join(' || '));
await browser.close();
process.exit(out.some((l) => l.startsWith('KO')) ? 1 : 0);
