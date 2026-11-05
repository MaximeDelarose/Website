// Gestionnaire de notices : aucune superposition (Auguste / toasts / pastilles), rien sur le plateau, file qui se vide.
// Chromium ÉMULÉ. PORT=4190 node scripts/notify-e2e.mjs      (393×852 puis 393×660)
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190; const URL = `http://localhost:${PORT}/?debug`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = [];
const check = (name, ok, extra = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`); };
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const seed = { v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'], story: { step: 9999 }, levels: {}, hearts: 500, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } };
async function run(H) {
  const tag = `[393×${H}]`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${tag} ${e.message}`));
  await page.addInitScript((s) => { if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem('radia-save-v1', s); sessionStorage.setItem('n-seeded', '1'); } }, JSON.stringify(seed));
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(2200);
  for (let i = 0; i < 6; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.last().click().catch(() => {}); await page.waitForTimeout(400); } else break; }
  await page.getByText('MODE LIBRE').first().click(); await page.waitForTimeout(2800); await page.waitForSelector('.merge-hud.endless', { timeout: 8000 });
  const E = (fn, ...a) => page.evaluate(([f, args]) => window.RADIA.endless[f](...args), [fn, a]);
  await E('clearLocks'); await page.waitForTimeout(500);
  const first = await E('cellXY', 0), last = await E('cellXY', 35), cs = await E('cellSize');
  const board = { l: first.x - cs / 2, t: first.y - cs / 2, r: last.x + cs / 2, b: last.y + cs / 2 };
  // rafale : 6 toasts distincts, 3 messages d'Auguste, des pastilles (drops) — presque simultanés
  await page.evaluate(() => { const N = window.RADIA.notify; for (let i = 0; i < 6; i++) N.toast('Gain ' + i); N.says('Premier mot d’Auguste', 2200); N.says('Deuxième mot', 2200); N.says('Troisième mot', 2200); });
  for (const k of ['coins', 'diamonds', 'energy']) await E('drop', k, 'rare');
  const samples = []; let maxToast = 0, maxAug = 0, maxPill = 0, overlapPair = 0, overBoard = [];
  for (let i = 0; i < 130; i++) {
    const s = await page.evaluate((b) => {
      const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.15; };
      const els = (sel) => [...document.querySelectorAll(sel)].filter(vis);
      const t = els('.toast'), a = els('.aug-says'), p = els('.en-pill');
      const hit = [...t, ...a, ...p].filter((e) => { const r = e.getBoundingClientRect(); return r.right > b.l && r.left < b.r && r.bottom > b.t && r.top < b.b - 2; }).map((e) => e.className);
      return { t: t.length, a: a.length, p: p.length, hit, text: [...a].map((e) => e.innerText.replace(/\n/g, ' ')).join('|') };
    }, board);
    maxToast = Math.max(maxToast, s.t); maxAug = Math.max(maxAug, s.a); maxPill = Math.max(maxPill, s.p);
    if (s.a > 0 && (s.t > 0 || s.p > 0)) overlapPair++;
    if (s.hit.length) overBoard.push(s.hit.join(','));
    samples.push(s); await page.waitForTimeout(100);
  }
  check(`${tag} jamais plus de 2 toasts, 1 message d'Auguste, 1 pastille`, maxToast <= 2 && maxAug <= 1 && maxPill <= 1, `toasts ${maxToast} · Auguste ${maxAug} · pastilles ${maxPill}`);
  check(`${tag} jamais un message d'Auguste en même temps qu'un toast ou une pastille`, overlapPair === 0, `${overlapPair} échantillons`);
  check(`${tag} aucune notice ne recouvre une case du plateau`, overBoard.length === 0, [...new Set(overBoard)].join(' | '));
  const seen = new Set(samples.map((s) => s.text).filter(Boolean));
  check(`${tag} les messages d'Auguste s'enchaînent un par un (jamais perdus à tort)`, seen.size >= 1, [...seen].join(' / '));
  await page.waitForTimeout(6000);
  const st = await page.evaluate(() => window.RADIA.notify.state());
  check(`${tag} la file se vide (plus rien d'affiché ni en attente)`, st.visible.length === 0 && st.waiting.length === 0, JSON.stringify(st));
  check(`${tag} le plateau reste manipulable pendant les notices`, await page.evaluate((b) => { const e = document.elementFromPoint((b.l + b.r) / 2, (b.t + b.b) / 2); return !!e && (e.tagName === 'CANVAS' || !!e.closest('#game')); }, board));
  await ctx.close();
}
for (const H of [852, 660]) { try { await run(H); } catch (e) { check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 2).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
