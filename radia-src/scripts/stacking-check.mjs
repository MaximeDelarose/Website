// Empilement de la couche récompense (RewardOverlay) : ouvre un cadeau/coffre PAR-DESSUS chaque contexte du jeu et vérifie, avec
// document.elementsFromPoint et le z-order calculé, que tout est au premier plan, que l'interface est restituée ensuite et qu'aucun
// calque sombre/bloquant ne reste. Chromium ÉMULÉ (pas un vrai iPhone) ; sons et vibrations non vérifiables.
//   npx vite build --outDir /tmp/claude-0/u && npx vite preview --outDir /tmp/claude-0/u --port 4202 &
//   PORT=4202 [H=852|660] [ONLY=energie,boutique] node scripts/stacking-check.mjs      (captures : shots/u-<contexte>-<W>x<H>.png)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT ?? 4202;
const W = +(process.env.W ?? 393), H = +(process.env.H ?? 852);
const TAG = `${W}x${H}`;
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ args: ['--no-proxy-server'], executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errs = [];
let ko = 0;
const check = (name, ok, extra = '') => { if (!ok) ko++; console.log(`${ok ? 'OK ' : 'KO '} ${name}${extra ? ' — ' + extra : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; })();
const seed = () => ({
  v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6'], story: { step: 9999 }, levels: {}, hearts: 500,
  economy: { diamonds: 500, energy: 120, freeChestTs: 0 },
  fun: { daily: { cycle: 0, day: 1, lastKey: today, claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } }, world: { flags: { 'rw:start-gift-v1': true } },
});

async function boot() {
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.addInitScript((s) => { if (!sessionStorage.getItem('st-seeded')) { sessionStorage.setItem('st-seeded', '1'); localStorage.setItem('radia-save-v1', s); } }, JSON.stringify(seed()));
  await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'networkidle' });
  await sleep(2200);
  for (let i = 0; i < 4; i++) { const b = page.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) { await b.first().click().catch(() => {}); await sleep(450); } else break; }
  return page;
}
const click = async (loc, ms = 800) => { await loc.first().click({ timeout: 5000 }).catch(() => {}); await sleep(ms); };

// ------------------------------------------------------------------ relevés exécutés dans la page
/** Couches plein écran peintes et captant le toucher (fond sombre/bloquant potentiel), identifiées par leur sélecteur. */
const coverers = (page) => page.evaluate(() => {
  const out = [];
  for (const e of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'CANVAS', 'IMG', 'SVG', 'PATH'].includes(e.tagName.toUpperCase())) continue;
    const r = e.getBoundingClientRect();
    if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
    const bg = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor);
    const a = bg ? (bg[1].split(',').length > 3 ? parseFloat(bg[1].split(',')[3]) : 1) : 0;
    const painted = a > 0.02 || (cs.backgroundImage && cs.backgroundImage !== 'none');
    if (painted && cs.pointerEvents !== 'none') out.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className).split(' ').slice(0, 2).join('.')}`);
  }
  return out;
});
const uiKids = (page) => page.evaluate(() => [...document.getElementById('ui').children].map((c) => String(c.className).replace(/\b(leaving|out)\b/g, '').trim().split(/\s+/)[0]).filter((c) => !/rd-sparkle-layer|toasts|aug-says|gift-bub/.test(c)).sort().join(' '));
const modalsVisible = (page) => page.evaluate(() => [...document.querySelectorAll('.modal-backdrop:not(.leaving)')].map((m) => getComputedStyle(m).visibility));

/** Contrôles pendant l'invite et la révélation : 100 % calculés dans la page. */
const topChecks = (page) => page.evaluate(() => {
  const res = {};
  const ov = document.getElementById('reward-overlay');
  res.overlayIsBodyChild = !!ov && ov.parentElement === document.body;
  const z = (e) => { const v = getComputedStyle(e).zIndex; return v === 'auto' ? 0 : +v; };
  res.ovZ = ov ? z(ov) : -1;
  res.otherBodyMax = Math.max(0, ...[...document.body.children].filter((c) => c !== ov).map(z));
  // z-order calculé : le plus haut z-index de TOUS les éléments positionnés du document (hors couche récompense) est inférieur à celui de la couche
  let maxOther = 0;
  for (const e of document.querySelectorAll('body *')) { if (ov?.contains(e)) continue; const cs = getComputedStyle(e); if (cs.position !== 'static' && cs.zIndex !== 'auto') maxOther = Math.max(maxOther, +cs.zIndex); }
  res.maxOtherZ = maxOther;
  // elementsFromPoint : l'élément le plus haut est dans la couche, au centre et aux 4 coins
  const pts = { centre: [innerWidth / 2, innerHeight / 2], hautGauche: [6, 6], hautDroit: [innerWidth - 6, 6], basGauche: [6, innerHeight - 6], basDroit: [innerWidth - 6, innerHeight - 6] };
  res.tops = {};
  for (const [k, [x, y]] of Object.entries(pts)) { const t = document.elementsFromPoint(x, y)[0]; res.tops[k] = t ? !!t.closest('#reward-overlay') : false; }
  // éléments de la scène : appartiennent à la couche ; non masqués (test de capture avec pointer-events forcé)
  const probe = (sel, name) => {
    const els = [...document.querySelectorAll(sel)];
    if (!els.length) { res[name] = null; return; }
    let okAll = true;
    for (const e of els.slice(0, 6)) {
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.2) continue;
      const inLayer = !!e.closest('#reward-overlay');
      const prev = e.style.pointerEvents; e.style.pointerEvents = 'auto';
      const cx = Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2)), cy = Math.min(innerHeight - 2, Math.max(2, r.top + r.height / 2));
      const hit = document.elementsFromPoint(cx, cy)[0];
      e.style.pointerEvents = prev;
      const vis = !!hit && !!hit.closest('#reward-overlay'); // le plus haut à cet endroit appartient à la couche (aucune modale devant)
      if (!inLayer || !vis) { okAll = false; (res.why ??= []).push(`${name}:${String(e.className).slice(0, 30)} inLayer=${inLayer} hit=${hit ? hit.tagName + '.' + String(hit.className).slice(0, 30) : null} rect=${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)}`); }
    }
    res[name] = okAll;
  };
  probe('.rw-fx canvas', 'canvas');
  probe('.rw-chip', 'bank');
  probe('.rw-card', 'cards');
  probe('.rw-flash', 'flash');
  probe('.rw-art', 'art');
  probe('.rd-sparkle-layer', 'sparkle');
  res.sparkleInOverlay = [...document.querySelectorAll('.rd-sparkle-layer')].every((s) => !s.children.length || !!s.closest('#reward-overlay'));
  res.rwOpen = document.documentElement.classList.contains('rw-open');
  res.appInert = document.getElementById('app')?.hasAttribute('inert') ?? false;
  return res;
});

/** Lance un cadeau avec `start`, vérifie l'empilement, l'ouvre, le referme et contrôle la restitution. */
async function overContext(page, name, { start, ready, expectModals = 0, close }) {
  console.log(`\n== ${name} (${TAG})`);
  const readyOk = await page.locator(ready).first().waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  check(`${name} : contexte ouvert (${ready})`, readyOk);
  await sleep(500);
  const before = { kids: await uiKids(page), cover: await coverers(page), modals: await modalsVisible(page) };
  check(`${name} : ${expectModals} fenêtre(s) modale(s) visible(s) avant`, before.modals.length === expectModals && before.modals.every((v) => v === 'visible'), before.modals.join(','));
  await start(page);
  await page.waitForSelector('.rw-hint.on', { timeout: 15000 }).catch(() => {});
  await sleep(500);
  const t1 = await topChecks(page);
  check(`${name} : la couche est un enfant direct de <body>`, t1.overlayIsBodyChild);
  check(`${name} : z-index de la couche (${t1.ovZ}) > tout autre z-index du document (${t1.maxOtherZ}, corps ${t1.otherBodyMax})`, t1.ovZ > t1.maxOtherZ && t1.ovZ > t1.otherBodyMax);
  check(`${name} : élément le plus haut au centre et aux 4 coins = couche récompense`, Object.values(t1.tops).every(Boolean), JSON.stringify(t1.tops));
  check(`${name} : canvas de particules au-dessus et visible`, t1.canvas !== false);
  check(`${name} : interface suspendue (classe, app inerte)`, t1.rwOpen && t1.appInert);
  if (expectModals) { const mv = await modalsVisible(page); check(`${name} : fenêtres modales masquées (non détruites) pendant l'ouverture`, mv.length === expectModals && mv.every((v) => v === 'hidden'), mv.join(',')); }
  // pas de fermeture automatique : on attend 3 s, la scène doit toujours être là
  await sleep(3000);
  check(`${name} : la scène reste affichée tant qu'on ne touche pas`, (await page.locator('.rw-root').count()) === 1);
  // toucher pour ouvrir
  await page.locator('.rw-art').click({ force: true });
  await page.waitForSelector('.rw-card', { timeout: 10000 });
  await sleep(1600);
  const t2 = await topChecks(page);
  check(`${name} : récompenses révélées au premier plan`, t2.cards === true && Object.values(t2.tops).every(Boolean), JSON.stringify({ cards: t2.cards, why: t2.why }));
  check(`${name} : bandeau des compteurs au premier plan et visible`, t2.bank === true);
  check(`${name} : paillettes dans la couche récompense`, t2.sparkleInOverlay);
  await page.waitForSelector('.rw-primary:visible', { timeout: 25000 });
  await page.screenshot({ path: `shots/u-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${TAG}.png` });
  await page.locator('.rw-primary').click();
  const gone = await page.waitForFunction(() => !document.getElementById('reward-overlay') && !document.querySelector('[class*="rw-"]'), null, { timeout: 8000 }).then(() => true).catch(() => false);
  check(`${name} : couche retirée à la fermeture`, gone);
  await sleep(400);
  const after = { kids: await uiKids(page), cover: await coverers(page), modals: await modalsVisible(page) };
  const st = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('rw-open'), inert: document.getElementById('app').hasAttribute('inert'), aria: document.getElementById('app').getAttribute('aria-hidden'), hidden: [...document.querySelectorAll('#ui *')].filter((e) => e.getAttribute('aria-hidden') === 'true' && !/rd-sparkle/.test(String(e.className))).length }));
  check(`${name} : classe rw-open, inert et aria-hidden retirés`, !st.cls && !st.inert && st.aria === null, JSON.stringify(st));
  check(`${name} : même contenu de #ui qu'avant (interface restituée)`, before.kids === after.kids, `${before.kids} → ${after.kids}`);
  check(`${name} : fenêtres modales réaffichées dans l'état d'avant`, after.modals.length === expectModals && after.modals.every((v) => v === 'visible'), after.modals.join(','));
  const extra = after.cover.filter((c) => !before.cover.includes(c));
  check(`${name} : aucun calque plein écran sombre/bloquant résiduel`, extra.length === 0, extra.join(' | '));
  check(`${name} : le contexte est toujours là`, (await page.locator(ready).count()) > 0);
  await close?.(page);
  await page.close();
}

const demo = (kind = 'chest', rarity = 'epic') => (page) => page.evaluate(([k, r]) => { void window.RADIA.rewards.demo(k, r); }, [kind, rarity]);
const back = (page) => click(page.locator('#ui > .screen:not(.leaving) .icon-btn[aria-label="Retour"]'), 600);

const contexts = [
  { id: 'energie', name: 'modale énergie', open: (p) => click(p.locator('.res-chip[aria-label="Énergie"]'), 900), ready: '.modal-backdrop:not(.leaving)', expectModals: 1, start: demo('chest', 'epic') },
  { id: 'boutique', name: 'boutique', open: (p) => click(p.locator('.shop-btn'), 1200), ready: '.shop-sheet', start: demo('premium', 'legendary') },
  { id: 'telephone', name: 'téléphone', open: (p) => click(p.locator('.title-top .ph-btn'), 1200), ready: '.ph-back', start: demo('event', 'rare') },
  { id: 'casino', name: 'casino', open: (p) => p.evaluate(() => { void window.RADIA.casino.open(); }).then(() => sleep(1500)), ready: '.cz-root', start: demo('chest', 'rare') },
  { id: 'carriere', name: 'carrière', open: async (p) => { await click(p.getByText('MON MONDE'), 1500); await click(p.locator('.hub-card.tone-gold'), 1800); }, ready: '.screen', start: demo('chest', 'uncommon') },
  { id: 'dressing', name: 'dressing', open: async (p) => { await click(p.getByText('MON MONDE'), 1500); await click(p.locator('.hub-card.tone-lavande'), 2000); }, ready: '.screen', start: demo('romantic', 'rare') },
  { id: 'chateau', name: 'château', open: async (p) => { await click(p.getByText('MON MONDE'), 1500); await click(p.locator('.hub-enter'), 2200); }, ready: '.screen', start: demo('daily', 'common') },
  { id: 'album', name: 'album', open: (p) => click(p.getByText('SOUVENIRS'), 1300), ready: '.screen', start: demo('chest', 'common') },
  { id: 'endless', name: 'sheet Endless', open: async (p) => { await click(p.getByText('MODE LIBRE'), 3500); for (let i = 0; i < 3; i++) { const b = p.locator('.modal-backdrop:not(.leaving) .actions button'); if (await b.count()) await click(b, 500); } await click(p.locator('.en-tre'), 900); }, ready: '.en-sheet-back', start: demo('chest', 'epic') },
  { id: 'evenement', name: 'événement', open: (p) => p.evaluate(() => { void window.RADIA.activity('bouquet', { mode: 'adult' }); }).then(() => sleep(2500)), ready: '.ev-layer', start: demo('event', 'uncommon') },
  // flux réel : le coffre du royaume de la boutique (diamants débités, butin versé, mise en scène par-dessus la boutique)
  {
    id: 'royaume', name: 'coffre du royaume (boutique réelle)', ready: '.shop-sheet',
    open: async (p) => { await click(p.locator('.shop-btn'), 1200); await click(p.locator('.shop-tabs button').filter({ hasText: 'Boutique' }), 700); },
    start: async (p) => { globalThis.__dia0 = await p.evaluate(() => window.RADIA.save.data.economy.diamonds); await p.locator('.spend-row', { hasText: 'Coffre du royaume' }).locator('button').click(); },
    after: async (p) => { const d = await p.evaluate(() => window.RADIA.save.data.economy.diamonds); check('coffre du royaume : 40 diamants débités une seule fois', globalThis.__dia0 - d === 40, `${globalThis.__dia0} → ${d}`); },
  },
];

for (const c of contexts) {
  if (ONLY && !ONLY.includes(c.id)) continue;
  const page = await boot();
  await c.open(page);
  await overContext(page, c.name, { start: c.start, ready: c.ready, expectModals: c.expectModals ?? 0, close: c.after });
}

// ---- file d'attente : deux cadeaux lancés ensemble s'enchaînent proprement (un seul calque à la fois)
{
  const page = await boot();
  console.log(`\n== file d'attente (${TAG})`);
  await page.evaluate(() => { void window.RADIA.rewards.demo('chest', 'common', 2); });
  await page.waitForSelector('.rw-root', { state: 'attached', timeout: 20000 }); // le débogage charge ses modules en asynchrone : on garantit l'ordre d'appel, puis la 2e ouverture arrive PENDANT la 1re
  await page.evaluate(() => { void window.RADIA.rewards.demo('event', 'rare', 2); });
  const seen = { max: 0, order: [] };
  for (let round = 0; round < 2; round++) {
    await page.waitForSelector('.rw-hint.on', { timeout: 15000 });
    const n = await page.locator('.rw-root').count();
    seen.max = Math.max(seen.max, n);
    seen.order.push(await page.locator('.rw-root').first().getAttribute('data-kind'));
    await page.locator('.rw-art').click({ force: true });
    await page.waitForSelector('.rw-primary:visible', { timeout: 25000 });
    await page.locator('.rw-primary').click();
    await sleep(700);
  }
  check('file d\'attente : un seul calque à la fois, ordre respecté', seen.max === 1 && seen.order.join() === 'chest,event', JSON.stringify(seen));
  const gone = await page.waitForFunction(() => !document.getElementById('reward-overlay') && !document.documentElement.classList.contains('rw-open'), null, { timeout: 6000 }).then(() => true).catch(() => false);
  check('file d\'attente : tout est retiré à la fin', gone);
  await page.close();
}

console.log(`\n${errs.length ? 'ERREURS PAGE:\n' + errs.join('\n') : 'aucune erreur de page'}`);
console.log(ko ? `\n${ko} KO` : '\nTOUT OK');
await browser.close();
process.exit(ko || errs.length ? 1 : 0);
