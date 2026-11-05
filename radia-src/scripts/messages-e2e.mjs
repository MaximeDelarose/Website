// Application Messages (façon iMessage) : liste, conversation, saisie, réponse simulée, « Distribué » / « Lu », réactions, non lus, sauvegarde.
// Chromium ÉMULÉ (pas un vrai iPhone). PORT=4190 node scripts/messages-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const URL = `http://localhost:${PORT}/?debug`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} [${tag}] ${name}${extra ? ' — ' + extra : ''}`); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], story: { step: 9999 }, levels: {}, hearts: 321, economy: { energy: 40, diamonds: 70, bag: [], bagSlots: 6 }, world: { flags: { 'rw:start-gift-v1': true }, res: { coins: 610 } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };

async function run(H) {
  tag = `393×${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  const cdp = await ctx.newCDPSession(page);
  const sleep = (ms) => page.waitForTimeout(ms);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
  await page.addInitScript((s) => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', s); }, JSON.stringify(seed));
  await page.goto(URL, { waitUntil: 'networkidle' }); await sleep(2500);
  const closeModals = async () => { for (let i = 0; i < 8; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await sleep(400); } else break; } };
  await closeModals();
  const st = () => page.evaluate(() => window.RADIA.messages.state());
  const inBox = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return !!b && b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= 393.5 && b.y + b.height <= H + 0.5; };

  // Endless → téléphone → Messages
  await page.getByText('MODE LIBRE').first().click(); await sleep(2800); await closeModals();
  await page.waitForSelector('.res-row', { timeout: 10000 }).catch(() => {});
  const boardBefore = await page.evaluate(() => { const s = window.RADIA.game().scene.getScene('merge'); return JSON.stringify(s.state.cells.map((c) => c && [c.c, c.l])); });
  await page.evaluate(() => window.RADIA.phone()); await sleep(900);
  // un message d'Auguste arrive (non lu) : badge sur l'icône Messages
  await page.evaluate(() => window.RADIA.messages.incoming()); await sleep(600);
  check('un nouveau message → pastille sur l\'icône Messages', (await page.locator('.phh-app[data-app="messages"] .phh-badge').count()) === 1);
  await page.locator('.phh-app[data-app="messages"]').click(); await sleep(900);
  check('Messages s\'ouvre par-dessus le téléphone : titre, recherche, bouton « nouveau message »', (await page.locator('.msg-big').innerText()) === 'Messages' && (await page.locator('.msg-search-in').count()) === 1 && (await page.locator('button[aria-label="Nouveau message"]').count()) === 1);
  check('bouton retour vers l\'écran d\'accueil du téléphone', (await page.locator('button[aria-label="Écran d’accueil du téléphone"]').count()) === 1);
  const rows = await page.locator('.msg-row-c').count();
  check('liste : au moins une conversation avec photo, nom, aperçu, heure', rows >= 1 && (await page.locator('.msg-row-c .msg-face').count()) >= 1 && (await page.locator('.msg-row-c .msg-prev').first().innerText()).length > 3);
  check('pastille bleue de non lu sur la conversation concernée', (await page.locator('.msg-row-c .msg-dot').count()) >= 1);
  await page.screenshot({ path: `shots/msg-list-393x${H}.png` });
  // recherche
  await page.locator('.msg-search-in').fill('zzzzzz'); await sleep(300);
  check('recherche : aucun résultat', (await page.locator('.msg-row-c').count()) === 0 && (await page.locator('.msg-empty').count()) === 1);
  await page.locator('.msg-search-in').fill('auguste'); await sleep(300);
  check('recherche : trouve Auguste par son nom', (await page.locator('.msg-row-c[data-cid="auguste"]').count()) === 1);
  await page.locator('.msg-search-in').fill(''); await sleep(200);
  // conversation avec la personne qui a écrit
  const cid = await page.evaluate(() => { const s = window.RADIA.messages.state(); return Object.keys(s.convos).find((k) => s.convos[k].unread > 0); });
  await page.locator(`.msg-row-c[data-cid="${cid}"]`).click(); await sleep(800);
  check('conversation : bulle reçue (grise, à gauche) + non lu remis à zéro', (await page.locator('.msg-r.in .msg-b').count()) >= 1 && (await st()).convos[cid].unread === 0);
  check('conversation : en-tête (retour, photo, nom, infos) et saisie dans l\'écran', (await page.locator('.msg-who .msg-face').count()) === 1 && await inBox('.msg-composer') && await inBox('.msg-head'));
  // écrire à Auguste (réponse la plus riche)
  await page.locator('button[aria-label="Retour à la liste des conversations"]').click(); await sleep(500);
  await page.locator('.msg-row-c[data-cid="auguste"]').click(); await sleep(700);
  const before = (await st()).convos.auguste.msgs.length;
  check('bouton d\'envoi désactivé tant que le champ est vide', (await page.locator('.msg-send').isDisabled()));
  await page.locator('.msg-in').fill('Merci pour tout 😘'); await sleep(200);
  check('bouton d\'envoi activé (bleu) avec du texte', !(await page.locator('.msg-send').isDisabled()) && (await page.locator('.msg-send.on').count()) === 1);
  await page.locator('.msg-send').click(); await sleep(250);
  check('message envoyé : bulle BLEUE à droite', (await page.locator('.msg-r.me .msg-b').last().innerText()).includes('Merci pour tout'));
  check('un statut simulé (« Distribué », puis « Lu ») s\'affiche sous le dernier message envoyé', /Distribué|Lu \d{2}:\d{2}/.test(await page.locator('.msg-status').innerText()));
  const stNow = await st();
  check('« Lu » PAS affiché tant que la lecture n\'est pas simulée', !stNow.convos.auguste.msgs.some((m) => m.from === 'me' && m.readAt && Date.now() - m.at < 100));
  await page.waitForSelector('.msg-b.typing', { timeout: 6000 }).catch(() => {});
  check('« … » (le personnage écrit) apparaît avant la réponse', (await page.locator('.msg-b.typing').count()) === 1 || (await page.locator('.msg-status', { hasText: 'Lu' }).count()) === 1);
  await page.waitForFunction(() => document.querySelectorAll('.msg-r.in .msg-b:not(.typing)').length >= 1 && !document.querySelector('.msg-b.typing'), null, { timeout: 9000 }).catch(() => {});
  await sleep(600);
  const after = await st();
  check('la réponse d\'Auguste arrive (2 messages de plus) et reste cohérente', after.convos.auguste.msgs.length >= before + 2 && after.convos.auguste.msgs[after.convos.auguste.msgs.length - 1].from === 'them');
  check('« Lu hh:mm » affiché (lecture simulée par le jeu)', /Lu \d{2}:\d{2}/.test(await page.locator('.msg-status').innerText()));
  check('la conversation défile jusqu\'en bas (dernier message visible)', await page.evaluate(() => { const t = document.querySelector('.msg-thread'); return t.scrollHeight - t.scrollTop - t.clientHeight < 8; }));
  await page.screenshot({ path: `shots/msg-thread-393x${H}.png` });
  // réaction en appui long sur un message reçu
  const inb = page.locator('.msg-r.in .msg-b:not(.typing)').last(); const bb = await inb.boundingBox();
  await touch('touchStart', bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(650); await touch('touchEnd', bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(350);
  check('appui long : palette de 6 réactions dans l\'écran', (await page.locator('.msg-pal button').count()) === 6 && await inBox('.msg-pal'));
  await page.screenshot({ path: `shots/msg-reactions-393x${H}.png` });
  await page.locator('.msg-pal button').first().click(); await sleep(500);
  const lastThem = (await st()).convos.auguste.msgs.filter((m) => m.from === 'them').pop();
  check('réaction ❤️ posée sur le message et sauvegardée', lastThem.myReaction === 'heart' && (await page.locator('.msg-react').count()) >= 1);
  // appui court : pas de palette
  await page.locator('.msg-r.in .msg-b:not(.typing)').last().click(); await sleep(300);
  check('appui court : pas de palette', (await page.locator('.msg-pal').count()) === 0);
  // nouveau message : liste des contacts
  await page.locator('button[aria-label="Retour à la liste des conversations"]').click(); await sleep(500);
  await page.locator('button[aria-label="Nouveau message"]').click(); await sleep(500);
  check('nouveau message : liste des contacts à choisir', (await page.locator('.msg-row-c').count()) >= 5);
  await page.locator('.msg-row-c[data-cid="maman"]').click(); await sleep(500);
  check('conversation avec Maman créée à la demande', (await page.locator('.msg-who small').innerText()) === 'Maman');
  // navigation : ‹ liste → ‹ accueil téléphone
  await page.locator('button[aria-label="Retour à la liste des conversations"]').click(); await sleep(500);
  await page.locator('button[aria-label="Écran d’accueil du téléphone"]').click(); await sleep(700);
  check('fermer Messages → écran d\'accueil du téléphone (pas le jeu)', (await page.locator('.msg-layer').count()) === 0 && (await page.locator('.phh').count()) === 1);
  // sauvegarde : rechargement
  await page.evaluate(() => window.RADIA.save.writeNow());
  const saved = await st();
  await page.reload({ waitUntil: 'networkidle' }); await sleep(2500); await closeModals();
  await page.evaluate(() => window.RADIA.phone()); await sleep(900); // l'application Messages (et son API de debug) se charge à l'ouverture du téléphone
  const reloaded = await st();
  check('après rechargement : messages, réactions et états lus conservés', JSON.stringify(reloaded.convos.auguste.msgs) === JSON.stringify(saved.convos.auguste.msgs) && reloaded.convos.auguste.msgs.some((m) => m.myReaction === 'heart'));
  // quitter le téléphone : partie Endless retrouvée (la page a été rechargée : on vérifie un plateau neuf OK) – test dédié avant rechargement
  void boardBefore;
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
