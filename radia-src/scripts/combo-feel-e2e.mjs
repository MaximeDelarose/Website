// Combos : séries de 3, 5, 10 et 15 fusions rapides, modes ENDLESS et CHAPITRES. Chromium ÉMULÉ (jamais un vrai iPhone), 393×852 puis 393×660.
// Vérifie : indicateur de combo dans la bande fixe AU-DESSUS de la grille (jamais sur les cases), aucune fenêtre / bulle / pastille / toast pendant la chaîne,
// glisser-déposer jamais interrompu, un seul récapitulatif à la fin, gains attribués, aucun calque invisible qui bloque les gestes, fluidité.
//   PORT=4190 node scripts/combo-feel-e2e.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4190;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const results = []; const errors = []; let tag = '';
const check = (n, ok, x = '') => { results.push(!!ok); console.log(`${ok ? 'OK ' : 'KO '} [${tag}] ${n}${x ? ' — ' + x : ''}`); };
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0'); const today = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const seed = (extra = {}) => ({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'], levels: {}, hearts: 500, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: today, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } }, ...extra });

async function open(H, saveObj) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(`[${tag}] ${e.message} @ ${(e.stack || "").split("\n").slice(1, 4).join(" | ")}`));
  await page.addInitScript((s) => { if (!sessionStorage.getItem('cf-seeded')) { localStorage.setItem('radia-save-v1', s); sessionStorage.setItem('cf-seeded', '1'); } }, JSON.stringify(saveObj));
  await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2200);
  return { ctx, page };
}
const closeModals = async (page) => { for (let i = 0; i < 8; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .dy-later, .modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(500); } else break; } };

/** Une chaîne de n paires identiques posées sur le plateau, puis n glissés rapides ; mesures prises pendant toute la chaîne. */
async function chain(page, n, label) {
  const sleep = (ms) => page.waitForTimeout(ms);
  const info = await page.evaluate((n) => {
    const sc = window.RADIA.game().scene.getScene('merge');
    const cells = []; for (let i = 0; i < 36; i++) cells.push(i);
    const items = []; const pairs = [];
    for (let k = 0; k < n; k++) { const coll = k % 2 ? 'choc' : 'flowers'; const a = cells[2 * k], b = cells[2 * k + 1]; items.push({ i: a, c: coll, l: 1 }, { i: b, c: coll, l: 1 }); pairs.push([a, b]); }
    sc.debugLayout(items); sc.state.combo = 0; sc.state.lastMergeAt = -1e9;
    return { pairs, score0: sc.state.score, merges0: sc.state.merges };
  }, n);
  await sleep(500);
  const idleFrames = await page.evaluate(() => new Promise((res) => { const f = []; let last = performance.now(); const t0 = last; const tick = () => { const n = performance.now(); f.push(n - last); last = n; if (n - t0 < 1500) requestAnimationFrame(tick); else res(f); }; requestAnimationFrame(tick); }));
  // échantillonneur : toutes les 60 ms, ce qui est visible et la position de l'indicateur
  await page.evaluate(() => {
    window.__cf = { samples: [], frames: [], stop: false }; let last = performance.now();
    const tick = () => { const now = performance.now(); window.__cf.frames.push(now - last); last = now; if (!window.__cf.stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    window.__cf.iv = setInterval(async () => {
      const m = await import('/__noop').catch(() => null); void m;
    }, 1e9);
  });
  const sampler = setInterval(() => { /* noop côté node */ }, 1e9); clearInterval(sampler);
  const samples = []; let sampling = true;
  const sampleLoop = (async () => {
    while (sampling) {
      samples.push(await page.evaluate(() => {
        const sc = window.RADIA.game().scene.getScene('merge'); const ci = sc.comboInfo();
        const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0'; }).length;
        return { t: performance.now(), who: [...document.querySelectorAll('.aug-says,.toast,.en-pill,.bubble')].filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).opacity !== '0').map((e) => e.className + ':' + e.innerText.replace(/\s+/g, ' ').slice(0, 50)), ci, aug: vis('.aug-says'), toast: vis('.toast'), pill: vis('.en-pill'), modal: vis('.modal-backdrop:not(.leaving)'), reward: vis('#reward-overlay .rw-root'), bubble: vis('.bubble'), busy: window.RADIA.comboBusy?.() ?? null, combo: sc.state.combo };
      }).catch(() => null));
      await sleep(180);
    }
  })();
  // glissés rapides (chaque glissé se termine par un relâchement ; ≈ 160 ms entre deux fusions)
  let done = 0;
  for (const [a, b] of info.pairs) {
    const p = await page.evaluate((i) => window.RADIA.game().scene.getScene('merge').cellCenter(i), a); const q = await page.evaluate((i) => window.RADIA.game().scene.getScene('merge').cellCenter(i), b);
    const dd = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + ((q.x - p.x) / dd) * 14, p.y + ((q.y - p.y) / dd) * 14); await page.mouse.move(q.x, q.y, { steps: 2 }); await page.mouse.up();
    done++; await sleep(150);
  }
  await sleep(900);
  const during = samples.filter(Boolean);
  await sleep(2600); // fin du combo + récapitulatif éventuel
  const after = await page.evaluate(() => {
    const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).opacity !== '0'; });
    const sc = window.RADIA.game().scene.getScene('merge');
    return { aug: vis('.aug-says').length, toast: vis('.toast').length, pill: vis('.en-pill').length, texts: [...vis('.toast'), ...vis('.en-pill'), ...vis('.aug-says')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()), score: sc.state.score, merges: sc.state.merges, best: sc.state.bestCombo, busy: window.RADIA.comboBusy?.() ?? null };
  });
  sampling = false; await sampleLoop;
  const frames = await page.evaluate(() => { window.__cf.stop = true; return window.__cf.frames; });
  return { info, done, during, after, frames, idleFrames };
}

function evaluate(label, n, r) {
  const act = r.during.filter((s) => s.ci.alpha > 0.05);
  check(`${label} : ${n} fusions faites, meilleur combo ≥ ${n}`, r.after.merges - r.info.merges0 >= n && r.after.best >= n, `fusions ${r.after.merges - r.info.merges0}, meilleur combo ${r.after.best}`);
  check(`${label} : l'indicateur de combo s'est affiché `, act.length > 0 && /(Super combo|Combo) x\d+ !/.test(act[act.length - 1].ci.text || act[0].ci.text), act.length ? act[act.length - 1].ci.text : 'jamais visible');
  const overlap = act.filter((s) => s.ci.pill.y + s.ci.pill.h > s.ci.board.y + 1).length;
  check(`${label} : l'indicateur reste TOUJOURS au-dessus de la grille (jamais sur les cases)`, overlap === 0, `${overlap}/${act.length} échantillons gênants`);
  const inScreen = act.every((s) => s.ci.pill.x >= -1 && s.ci.pill.x + s.ci.pill.w <= 394 && s.ci.pill.y >= 0);
  check(`${label} : l'indicateur est dans l'écran, compact (≤ 220 px, ≤ 34 px de haut)`, inScreen && act.every((s) => s.ci.pill.w <= 220 && s.ci.pill.h <= 34), act.length ? `${Math.round(act[0].ci.pill.w)}×${Math.round(act[0].ci.pill.h)}` : '');
  const bad = r.during.filter((s) => s.busy === true && (s.aug || s.toast || s.pill || s.modal || s.reward || s.bubble));
  check(`${label} : aucune fenêtre, bulle d'Auguste, toast ni pastille PENDANT la chaîne`, bad.length === 0, bad.length ? JSON.stringify(bad[0].who) : '');
  const total = r.after.aug + r.after.toast + r.after.pill;
  check(`${label} : à la fin, au plus UN récapitulatif visible, sans doublon`, total <= 1 && new Set(r.after.texts).size === r.after.texts.length, JSON.stringify(r.after.texts));
  check(`${label} : les points sont attribués (score +${r.after.score - r.info.score0})`, r.after.score - r.info.score0 >= n * 5);
  const sorted = [...r.frames].sort((a, b) => a - b); const med = sorted[Math.floor(sorted.length * 0.5)] ?? 0; const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0; const idle = [...r.idleFrames].sort((a, b) => a - b); const idleMed = idle[Math.floor(idle.length * 0.5)] ?? 1; const worst = sorted[sorted.length - 1] ?? 0;
  check(`${label} : animations fluides (Chromium émulé sans GPU : on compare à la même page au repos — médiane ≤ 2× le repos, aucune image > 600 ms)`, med <= idleMed * 2 + 5 && worst < 600, `repos ${idleMed.toFixed(1)} ms · chaîne : médiane ${med.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, pire ${worst.toFixed(0)} ms`);
}

async function after_checks(page, label) {
  // aucun calque invisible : le centre de chaque case de la grille est bien le canvas ; un nouveau glissé fonctionne ; plus de pastille d'indicateur
  const res = await page.evaluate(() => {
    const sc = window.RADIA.game().scene.getScene('merge'); const out = { blockers: [], ok: 0 };
    for (let i = 0; i < 36; i++) { const c = sc.cellCenter(i); const el = document.elementFromPoint(c.x, c.y); if (el && el.tagName === 'CANVAS') out.ok++; else out.blockers.push(`${i}:${el?.tagName}.${el?.className}`); }
    out.alpha = sc.comboInfo().alpha; out.busy = window.RADIA.comboBusy?.(); out.idle = sc.isIdle();
    return out;
  });
  check(`${label} : aucun calque invisible ne recouvre la grille (36/36 cases captent le toucher)`, res.ok === 36, res.blockers.slice(0, 2).join(','));
  check(`${label} : plateau de nouveau au repos, indicateur effacé, plus « occupé »`, res.idle && res.alpha < 0.05 && res.busy === false, JSON.stringify({ idle: res.idle, alpha: res.alpha, busy: res.busy }));
  const ok = await page.evaluate(async () => {
    const sc = window.RADIA.game().scene.getScene('merge'); sc.debugLayout([{ i: 0, c: 'flowers', l: 1 }, { i: 1, c: 'flowers', l: 1 }]); return true;
  });
  await page.waitForTimeout(400);
  const p = await page.evaluate(() => window.RADIA.game().scene.getScene('merge').cellCenter(0)); const q = await page.evaluate(() => window.RADIA.game().scene.getScene('merge').cellCenter(1));
  const m0 = await page.evaluate(() => window.RADIA.game().scene.getScene('merge').state.merges);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 14, p.y); await page.mouse.move(q.x, q.y, { steps: 3 }); await page.mouse.up(); await page.waitForTimeout(700);
  const m1 = await page.evaluate(() => window.RADIA.game().scene.getScene('merge').state.merges);
  check(`${label} : un glissé normal fonctionne encore après la chaîne`, ok && m1 === m0 + 1, `${m0}→${m1}`);
}

async function runEndless(H) {
  tag = `Endless 393×${H}`;
  const { ctx, page } = await open(H, seed({ story: { step: 9999 } }));
  await closeModals(page);
  if (await page.getByText('Carte du domaine').count()) { await page.locator('.screen-head .icon-btn').first().click().catch(() => {}); await page.waitForTimeout(700); await closeModals(page); }
  if (await page.getByText('MODE LIBRE').count()) await page.getByText('MODE LIBRE').first().click(); else { await page.getByText('MODE CHAPITRES').first().click(); await page.waitForTimeout(900); await page.getByText('Mode infini').first().click(); }
  await page.waitForSelector('.merge-hud.endless', { timeout: 10000 }); await page.waitForTimeout(2000);
  for (const n of [3, 5, 10, 15]) {
    const r = await chain(page, n, `série de ${n}`); evaluate(`série de ${n}`, n, r);
    if (n === 15) await page.screenshot({ path: `shots/combo-endless-${H}.png` });
    await after_checks(page, `après ${n}`);
  }
  await ctx.close();
}

async function runChapters(H) {
  tag = `Chapitres 393×${H}`;
  const { ctx, page } = await open(H, seed({ fun: { daily: { cycle: 0, day: 1, lastKey: today, claimed: [0], total: 1 } } }));
  await closeModals(page);
  await page.locator('.title-menu .btn.mode').first().click(); await page.waitForTimeout(700);
  await page.waitForTimeout(900);
  for (let i = 0; i < 30 && !(await page.getByText("C'est parti").count()); i++) { await page.mouse.click(200, H - 90); await page.waitForTimeout(300); }
  await page.getByText("C'est parti").first().click().catch(() => {}); await page.waitForTimeout(1800);
  const has = await page.evaluate(() => !!window.RADIA.game().scene.getScene('merge')?.sys.isActive());
  check('niveau de chapitre lancé', has);
  if (!has) { await ctx.close(); return; }
  for (const n of [3, 5, 10, 15]) {
    const r = await chain(page, n, `série de ${n}`); evaluate(`série de ${n}`, n, r);
    if (n === 15) await page.screenshot({ path: `shots/combo-chapters-${H}.png` });
    await after_checks(page, `après ${n}`);
  }
  await ctx.close();
}

import { mkdirSync } from 'node:fs'; mkdirSync('shots', { recursive: true });
for (const H of (process.env.ONLY_H ? [Number(process.env.ONLY_H)] : [852, 660])) { try { await runEndless(H); } catch (e) { tag = `Endless ${H}`; check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
for (const H of (process.env.SKIP_CH ? [] : [852, 660])) { try { await runChapters(H); } catch (e) { tag = `Chapitres ${H}`; check('exécution sans exception', false, String(e.message).split('\n')[0]); } }
check('aucune erreur JS', errors.length === 0, errors.slice(0, 3).join(' | '));
const ko = results.filter((x) => !x).length; console.log(`\n${results.length - ko}/${results.length} OK`);
await browser.close(); process.exit(ko ? 1 : 0);
