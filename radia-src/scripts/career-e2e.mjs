// Parcours de la page « Carrière » (Chromium ÉMULÉ, pas un vrai iPhone) : 4 carrières jouées par clics, onglets, retour,
// et contrôle qu'AUCUN calque assombrissant ne reste (logique pure : scripts/overlay-lib.mjs).
//   npx vite build --outDir /tmp/claude-0/k && npx vite preview --outDir /tmp/claude-0/k --port 4192 &
//   PORT=4192 node scripts/career-e2e.mjs      (393×852 puis 393×660 ; captures : shots/k-*.png)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { evaluate, formatReport } from './overlay-lib.mjs';

const PORT = process.env.PORT ?? 4192;
const URL = `http://localhost:${PORT}/?debug`;
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const baseSave = () => ({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'], story: { step: 9999 }, levels: {}, hearts: 500, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } });
// .car-card : contenu normal de la page (grande carte opaque), pas un calque
const BASE_ALLOW = ['#app', '#game', '#ui', 'canvas', 'html', 'body', '.car-card'];
const results = [];
const note = (ok, line) => { results.push(ok); console.log(`${ok ? 'OK ' : 'KO '} ${line}`); };

const collect = () => {
  const vw = innerWidth, vh = innerHeight;
  const pts = [[vw / 2, vh / 2], [vw / 2, vh * 0.25], [vw / 2, vh * 0.75], [vw * 0.1, vh * 0.5], [vw * 0.9, vh * 0.5]];
  const tops = pts.map(([x, y]) => document.elementFromPoint(x, y));
  const sel = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${[...e.classList].slice(0, 3).map((c) => '.' + c).join('')}`;
  const nodes = [];
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('canvas') || ['SCRIPT', 'STYLE', 'IMG', 'SVG', 'PATH', 'CIRCLE', 'RECT', 'G'].includes(e.tagName.toUpperCase())) continue;
    const r = e.getBoundingClientRect();
    if (r.width < vw * 0.85 || r.height < vh * 0.4) continue;
    const cs = getComputedStyle(e);
    nodes.push({ tag: e.tagName.toLowerCase(), id: e.id, cls: typeof e.className === 'string' ? e.className : '', sel: sel(e), z: cs.zIndex, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, display: cs.display, visibility: cs.visibility, opacity: parseFloat(cs.opacity), pe: cs.pointerEvents, bg: cs.backgroundColor, bgImage: cs.backgroundImage, backdrop: cs.backdropFilter || 'none', onTop: tops.some((t) => t && (t === e || e.contains(t))) });
  }
  for (const e of document.querySelectorAll('#ui .leaving, #ui .out')) {
    const cs = getComputedStyle(e);
    nodes.push({ tag: e.tagName.toLowerCase(), id: e.id, cls: e.className, sel: sel(e), z: cs.zIndex, rect: { left: 0, top: 0, right: 0, bottom: 0 }, display: cs.display, visibility: cs.visibility, opacity: parseFloat(cs.opacity), pe: cs.pointerEvents, bg: 'rgba(0, 0, 0, 0)', bgImage: 'none', backdrop: 'none', onTop: false });
  }
  const root = (name, el) => { if (!el) return null; const c = getComputedStyle(el); return { name, opacity: parseFloat(c.opacity), filter: c.filter, pe: c.pointerEvents, visibility: c.visibility, display: c.display }; };
  return {
    nodes,
    globals: { roots: [root('html', document.documentElement), root('body', document.body), root('#app', document.getElementById('app')), root('#game', document.getElementById('game')), root('#ui', document.getElementById('ui'))].filter(Boolean), bodyStyle: document.body.getAttribute('style') ?? '', rootClass: document.getElementById('ui')?.className ?? '', underCount: document.querySelectorAll('.ev-under').length, canvasFilter: 'none' },
    stray: [...document.querySelectorAll('.car-fx-layer, .car-fx-confetti, .fx-layer')].map(sel),
    scrollW: document.documentElement.scrollWidth, vw, vh,
  };
};

async function run(H) {
  const tag = `393×${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript((s) => { if (!sessionStorage.getItem('k-seeded')) { localStorage.setItem('radia-save-v1', s); sessionStorage.setItem('k-seeded', '1'); } }, JSON.stringify(baseSave()));
  await page.addInitScript(() => { try { const k = 'radia-save-v1'; const s = localStorage.getItem(k); if (s) { const j = JSON.parse(s); j.world = j.world || {}; j.world.flags = { ...(j.world.flags || {}), 'rw:start-gift-v1': true }; const d = new Date(), q = (x) => String(x).padStart(2, '0'), key = `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}`; j.fun = j.fun || {}; j.fun.daily = { cycle: 0, day: 1, claimed: [0], total: 1, ...(j.fun.daily || {}), lastKey: key }; j.fun.free = { ...(j.fun.free || {}), announced: true }; localStorage.setItem(k, JSON.stringify(j)); } } catch { /* ignore */ } }); // écarte le « Bonus de départ » pour les anciennes sauvegardes de test
  await page.goto(URL, { waitUntil: 'networkidle' });
  const sleep = (ms) => page.waitForTimeout(ms);
  await sleep(1800);
  const closeModals = async () => {
    for (let i = 0; i < 12; i++) {
      let b = page.locator('.modal-backdrop:not(.leaving) .dy-later');
      if (!(await b.count())) b = page.locator('.modal-backdrop:not(.leaving) .actions button');
      if (await b.count()) { await b.first().click().catch(() => {}); await sleep(500); } else break;
    }
  };
  let shot = 0;
  const snapPng = async (name) => { await page.screenshot({ path: `shots/k-${H}-${name}.png` }).catch(() => {}); };
  const check = async (label, { wait = 900, extra, png } = {}) => {
    await sleep(wait);
    let s, f;
    // une bulle d'Auguste ou un toast en train de disparaître est transitoire : on relit une fois avant de conclure
    for (let tryN = 0; tryN < 3; tryN++) {
      s = await page.evaluate(collect);
      f = evaluate({ vw: s.vw, vh: s.vh, nodes: s.nodes, globals: s.globals, allow: [...BASE_ALLOW, '.screen'] });
      if (s.scrollW > s.vw + 1) f.push(`défilement horizontal ${s.scrollW} > ${s.vw}`);
      if (s.stray.length) f.push(`calque d'effets de carrière resté : ${s.stray.join(', ')}`);
      if (!f.length) break;
      await sleep(1200);
    }
    if (extra) f.push(...(await extra(s)));
    if (png) await snapPng(png);
    note(f.length === 0, formatReport(`[${tag}] ${label}`, f).replace(/^(OK|KO)\s+/, ''));
  };
  /** Ferme les célébrations (palier, fans, couverture) puis les dialogues d'Auguste. */
  const dismissAll = async () => {
    for (let i = 0; i < 14; i++) {
      const fx = page.locator('.car-fx-layer .btn');
      if (await fx.count()) { await sleep(500); await fx.first().click().catch(() => {}); await sleep(450); continue; }
      const m = page.locator('.modal-backdrop:not(.leaving) .actions button');
      if (await m.count()) { await m.first().click().catch(() => {}); await sleep(450); continue; }
      break;
    }
  };

  await closeModals();
  await page.getByText('MON MONDE').first().click(); await sleep(1400); await closeModals();
  await page.evaluate(() => { const w = window.RADIA.save.data.world; w.res.coins = 3000; for (const c of ['dr-royal-gown', 'dr-flowy-floral', 'dr-stage-sequin', 'top-tee-pink', 'bot-trousers-chic', 'sh-heels', 'ac-pearls']) if (!w.wardrobe.owned.includes(c)) w.wardrobe.owned.push(c); });
  await page.locator('.hub-card.tone-gold').first().click(); await sleep(1500); await closeModals();

  // ---------- page : structure, mesures
  const fansReal = await page.evaluate(() => window.RADIA.save.data.world.fans);
  const m = await page.evaluate(() => {
    const r = (q) => document.querySelector(q)?.getBoundingClientRect();
    const tabs = [...document.querySelectorAll('.car-tab')].map((t) => t.getBoundingClientRect());
    return { top: !!document.querySelector('.car-top'), card: !!document.querySelector('.car-card'), tabs: tabs.length, tabMinH: Math.min(...tabs.map((t) => t.height)), tabMinW: Math.min(...tabs.map((t) => t.width)), tabsTop: tabs[0]?.top, tabsBottom: tabs[0]?.bottom, goH: r('.car-go')?.height, cardH: r('.car-card')?.height, topH: r('.car-top')?.height, fansTxt: document.querySelector('.car-fans b')?.textContent, vh: innerHeight, scrollable: document.querySelector('.car-body').scrollHeight > document.querySelector('.car-body').clientHeight };
  });
  console.log(`   [${tag}] mesures : en-tête ${Math.round(m.topH)} px, grande carte ${Math.round(m.cardH)} px, onglets y=${Math.round(m.tabsTop)}→${Math.round(m.tabsBottom)} (hauteur min ${Math.round(m.tabMinH)}, largeur min ${Math.round(m.tabMinW)}), bouton ${Math.round(m.goH)} px, défilement interne : ${m.scrollable}`);
  note(m.top && m.card && m.tabs === 4, `[${tag}] page : bandeau + grande carte + 4 onglets`);
  note(m.tabMinH >= 44 && m.tabMinW >= 44 && m.goH >= 44, `[${tag}] zones tactiles >= 44 px`);
  if (m.vh >= 800) note(m.tabsTop < m.vh, `[${tag}] les onglets commencent dans l'écran (y=${Math.round(m.tabsTop)} < ${m.vh})`);
  else note(m.scrollable, `[${tag}] écran court : la page défile naturellement pour atteindre les onglets`);
  note(String(m.fansTxt).replace(/\s| /g, '') === String(fansReal), `[${tag}] fans affichés = valeur réelle (${m.fansTxt} / ${fansReal})`);
  await check('page carrière', { png: 'page' });

  // ---------- salaire (+ dialogue d'Auguste éventuel)
  const coins0 = await page.evaluate(() => window.RADIA.save.data.world.res.coins);
  await page.locator('.car-sal-big, .car-sal-btn:not([disabled])').first().click().catch(() => {}); await sleep(900); await dismissAll();
  const coins1 = await page.evaluate(() => window.RADIA.save.data.world.res.coins);
  note(coins1 > coins0, `[${tag}] salaire touché (+${coins1 - coins0} pièces)`);
  await check('après salaire + fermeture du dialogue', { wait: 3200 });

  // ---------- les 4 carrières, jouées par clics
  const plays = {
    photo: async () => {
      await page.locator('.cg-body .btn', { hasText: 'En scène' }).first().click(); await sleep(500);
      for (let i = 0; i < 8 && !(await page.locator('.car-score-ring').count()); i++) { await page.locator('.ph-shutter').first().click({ timeout: 3000 }).catch(() => {}); await sleep(1200); }
    },
    model: async () => {
      await page.locator('.md-theme').first().click(); await sleep(500);
      for (const t of ['Robe', 'Haut', 'Bas', 'Chaussures']) { await page.locator('.md-tab', { hasText: t }).first().click().catch(() => {}); const it = page.locator('.md-item:not(.none)'); if (await it.count()) await it.first().click().catch(() => {}); }
      await page.locator('.cg-body .btn', { hasText: 'Défiler' }).first().click(); await sleep(5200);
      await page.locator('.cg-body .btn', { hasText: 'Continuer' }).first().click({ timeout: 6000, force: true });
    },
    actress: async () => {
      await page.locator('.cg-body .btn', { hasText: 'Action' }).first().click(); await sleep(400);
      for (let i = 0; i < 5; i++) { await page.locator('.ac-opt').first().click({ timeout: 6000, force: true }); await sleep(1800); }
      await page.locator('.cg-body .btn', { hasText: 'Continuer' }).first().click({ timeout: 6000, force: true });
    },
    singer: async () => {
      await page.locator('.sg-song').first().click(); await sleep(300);
      const box = await page.locator('.sg-cv').first().boundingBox();
      for (let i = 0; i < 400 && !(await page.locator('.cg-body .btn', { hasText: 'Continuer' }).count()); i++) { await page.mouse.click(box.x + box.width * ((i % 3) + 0.5) / 3, box.y + box.height * 0.8); await sleep(160); }
      await page.locator('.cg-body .btn', { hasText: 'Continuer' }).first().click({ timeout: 6000, force: true });
    },
  };
  const order = [['photo', 'Modèle photo'], ['model', 'Mannequin'], ['actress', 'Actrice'], ['singer', 'Chanteuse']];
  for (const [id, name] of order) {
    await page.locator('.car-tab', { hasText: name }).first().click(); await sleep(700);
    await check(`onglet ${name}`, { png: `tab-${id}` });
    const w0 = await page.evaluate(() => { const w = window.RADIA.save.data.world; return { fans: w.fans, coins: w.res.coins, mom: window.RADIA.save.data.fun.apps.career.moments ?? 0 }; });
    await page.locator('.car-go').first().click(); await sleep(900);
    await snapPng(`game-${id}`);
    try { await plays[id](); } catch (e) { errors.push(`jeu ${id}: ${e.message.split('\n')[0]}`); }
    await page.locator('.car-score-ring').first().waitFor({ timeout: 8000 }).catch(() => {});
    await sleep(2300);
    await snapPng(`result-${id}`);
    const w1 = await page.evaluate(() => { const w = window.RADIA.save.data.world; return { fans: w.fans, coins: w.res.coins, mom: window.RADIA.save.data.fun.apps.career.moments ?? 0, lvl: w.careers.progress }; });
    note(w1.fans > w0.fans || w1.coins > w0.coins, `[${tag}] ${name} : résultat (fans ${w0.fans}→${w1.fans}, pièces ${w0.coins}→${w1.coins})`);
    note(w1.mom === w0.mom + 1, `[${tag}] ${name} : moment annoncé (emitMoment)`);
    await dismissAll();
    await check(`${name} : résultat puis célébrations fermées`, { wait: 3200 });
    await page.locator('.car-result .btn.secondary').first().click().catch(() => {}); await sleep(900);
    await check(`${name} : retour à la page carrière`, { png: `back-${id}` });
    const onPage = await page.locator('.car-card').count();
    note(onPage === 1, `[${tag}] ${name} : retour sur la page`);
  }

  // ---------- changer plusieurs fois de carrière, rien ne reste
  for (let k = 0; k < 8; k++) { await page.locator('.car-tab').nth(k % 4).click().catch(() => {}); await sleep(250); }
  await check('après 8 changements de carrière');
  const cur = await page.evaluate(() => window.RADIA.save.data.world.careers.current);
  note(typeof cur === 'string', `[${tag}] carrière courante enregistrée (${cur})`);

  // ---------- retour au hub puis à la page, 3 fois
  for (let r = 0; r < 3; r++) {
    await page.locator('.screen-head .icon-btn').first().click(); await sleep(900); await closeModals();
    await check(`retour au hub (tour ${r + 1})`);
    await page.locator('.hub-card.tone-gold').first().click(); await sleep(1300); await closeModals();
  }
  await check('page carrière rouverte', { png: 'reopen' });
  note(errors.length === 0, `[${tag}] aucune erreur JS${errors.length ? ' : ' + errors.slice(0, 4).join(' | ') : ''}`);
  await ctx.close();
}

for (const H of [852, 660]) await run(H);
await browser.close();
const bad = results.filter((x) => !x).length;
console.log(bad ? `\n${bad} contrôle(s) KO` : '\nTout est OK');
process.exit(bad ? 1 : 0);
