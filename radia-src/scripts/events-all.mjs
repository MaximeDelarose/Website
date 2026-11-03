// Déroule TOUS les événements (mini-jeux sautés via __EV_FAST) : dressing, trajets, dialogues, photo, récompense, retour.
import { chromium } from 'playwright';
const MODE = process.argv[2] ?? 'A';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true })).newPage();
const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console: ' + m.text()); });
await p.addInitScript(() => { window.__EV_FAST = true; if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', JSON.stringify({ v: 3, seenUpdates: ['v2', 'v3', 'v4'], story: { step: 0 }, levels: {}, hearts: 0 })); });
await p.goto('http://localhost:4173/?debug'); await p.waitForTimeout(3000);
const ids = await p.evaluate(async () => (await import('/src/events/data/index.ts')).EVENTS.map(e => e.id));
await p.evaluate(() => { const s = window.RADIA.save.data; s.world.careers.current = 'photo'; for (const c of ['photo','model','actress','singer']) s.world.careers.progress[c] = { level: 1, xp: 50, best: 50 }; s.world.res.coins = 100; });
const res = [];
for (const id of ids) {
  const before = await p.evaluate(() => { const s = window.RADIA.save.data; return { coins: s.world.res.coins, photos: s.events.photos.length }; });
  const runId = await p.evaluate((id) => window.RADIA.invite(id), id);
  const ok = await p.waitForSelector('.ev-notif', { timeout: 15000 }).then(() => true).catch(() => false);
  if (!ok) { res.push(`KO ${id}: pas de notification`); await p.evaluate(() => { window.RADIA.save.data.events.inbox = []; }); continue; }
  await p.locator('.ev-notif .btn').first().click();
  await p.locator('.ev-inv .btn').first().click({ timeout: 4000 }).catch(() => {});
  const t0 = Date.now(); let done = false;
  while (Date.now() - t0 < 60000) {
    if (await p.locator('.ev-concl').count()) { done = true; break; }
    const click = async (sel) => { const l = p.locator(sel); if (await l.count()) { await l.first().click({ timeout: 1500 }).catch(() => {}); return true; } return false; };
    if (await click('.dr-tip button')) { await p.waitForTimeout(200); continue; }
    if (await p.locator('.dr-ready').count()) { await click('.dr-ready'); await p.waitForTimeout(400); continue; }
    if (await p.locator('.ev-say').count()) { await p.waitForTimeout(300); await click('.ev-say'); await p.waitForTimeout(200); continue; }
    if (await p.locator('.ev-travel').count()) { await p.locator('.ev-body').click({ position: { x: 100, y: 300 } }).catch(() => {}); await p.waitForTimeout(300); continue; }
    const l = p.locator('button', { hasText: /Photo !/ }); if (await l.count()) { await l.first().click().catch(() => {}); await p.waitForTimeout(3300); continue; }
    const c = p.locator('button', { hasText: /^Continuer/ }); if (await c.count()) { await c.first().click().catch(() => {}); await p.waitForTimeout(300); continue; }
    await p.waitForTimeout(300);
  }
  if (!done) { const where = await p.evaluate(() => ({ step: window.RADIA.save.data.events.current?.step, cls: [...document.querySelectorAll('.ev-body > *')].map(e => e.className).join('|').slice(0, 80) })); res.push(`KO ${id}: bloqué à l'étape ${where.step} (${where.cls})`); await p.evaluate(() => { document.querySelector('.ev-layer')?.remove(); window.RADIA.save.data.events.current = null; }); continue; }
  await p.locator('.ev-concl .btn').first().click().catch(() => {});
  await p.waitForTimeout(700);
  const after = await p.evaluate((id) => { const s = window.RADIA.save.data; return { coins: s.world.res.coins, photos: s.events.photos.length, cur: s.events.current, done: s.events.done[id]?.count, layers: document.querySelectorAll('.ev-layer').length }; }, id);
  const good = after.done === 1 && !after.cur && after.layers === 0 && after.coins > before.coins && after.photos === before.photos + 1;
  res.push(`${good ? 'OK ' : 'KO '} ${id}: pièces +${after.coins - before.coins}, photos +${after.photos - before.photos}`);
  // débloque la suite pour les « doneAll » / limite de répétition
}
console.log(res.join('\n')); console.log('erreurs:', errs.length ? [...new Set(errs)].slice(0, 6) : 'aucune');
await b.close();
