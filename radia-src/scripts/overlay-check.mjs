// Contrôle des superpositions et des assombrissements résiduels (Chromium ÉMULÉ, pas un vrai iPhone).
//   npx vite build --outDir /tmp/claude-0/j && npx vite preview --outDir /tmp/claude-0/j --port 4191 &
//   PORT=4191 node scripts/overlay-check.mjs            (393×852 puis 393×660 ; captures facultatives : SHOTS=1 → shots/j-ov-*.png)
// Parcourt titre ⇄ MON MONDE ⇄ carrière ⇄ Endless ⇄ casino ⇄ téléphone ⇄ album ⇄ roue ⇄ cadeau du jour ⇄ incident… Après chaque retour et une
// stabilisation, échoue si un calque plein écran (≥ 90 % de la largeur, ≥ 50 % de la hauteur) :
//   - est peint (fond rgba alpha>0, dégradé, flou) ET capte le toucher ET couvre l'interface alors qu'aucune modale n'est attendue ;
//   - ou ne capte pas le toucher mais garde un fond non transparent (assombrissement résiduel) ;
//   - ou est invisible mais capte le toucher.
// La logique pure est dans scripts/overlay-lib.mjs (testée par tests/overlay-logic.test.ts).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { evaluate, findCssCollisions, formatReport, layoutIssues, outsideBox, overlappingPairs } from './overlay-lib.mjs';

const PORT = process.env.PORT ?? 4191;
const URL = `http://localhost:${PORT}/?debug`;
const SHOTS = !!process.env.SHOTS;
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const todayKey = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const baseSave = () => ({ v: 5, seenUpdates: ['v2', 'v3', 'v4', 'v5'], story: { step: 9999 }, levels: {}, hearts: 500, world: { flags: { 'rw:start-gift-v1': true } }, fun: { daily: { cycle: 0, day: 1, lastKey: todayKey(), claimed: [0], total: 1 }, free: { unlocked: true, announced: true, at: 1 } } });
const BASE_ALLOW = ['#app', '#game', '#ui', 'canvas', 'html', 'body'];

// relevé exécuté dans la page : tous les éléments potentiellement plein écran + état global
const collect = () => {
  const vw = innerWidth, vh = innerHeight;
  const pts = [[vw / 2, vh / 2], [vw / 2, vh * 0.25], [vw / 2, vh * 0.75], [vw * 0.1, vh * 0.5], [vw * 0.9, vh * 0.5]];
  const tops = pts.map(([x, y]) => document.elementFromPoint(x, y));
  const sel = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${[...e.classList].slice(0, 3).map((c) => '.' + c).join('')}`;
  const nodes = [];
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('canvas') || ['SCRIPT', 'STYLE', 'IMG', 'SVG', 'PATH', 'CIRCLE', 'RECT', 'G'].includes(e.tagName.toUpperCase())) continue;
    const r = e.getBoundingClientRect();
    if (r.width < vw * 0.85 || r.height < vh * 0.4) continue; // seuil large : le filtrage exact est fait par la logique pure
    const cs = getComputedStyle(e);
    nodes.push({
      tag: e.tagName.toLowerCase(), id: e.id, cls: typeof e.className === 'string' ? e.className : '', sel: sel(e), z: cs.zIndex,
      rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, display: cs.display, visibility: cs.visibility, opacity: parseFloat(cs.opacity) * 1,
      pe: cs.pointerEvents, bg: cs.backgroundColor, bgImage: cs.backgroundImage, backdrop: cs.backdropFilter || cs.webkitBackdropFilter || 'none',
      anc: (() => { let a = ''; for (let p = e.parentElement; p && p.id !== 'ui' && p !== document.body; p = p.parentElement) a += ' ' + (typeof p.className === 'string' ? p.className : ''); return a; })(),
      onTop: tops.some((t) => t && (t === e || e.contains(t))),
    });
  }
  // les éléments qui partent (leaving/out) même petits
  for (const e of document.querySelectorAll('#ui > .leaving, #ui > .out')) {
    if (nodes.some((n) => n.sel === sel(e))) continue;
    const cs = getComputedStyle(e);
    nodes.push({ tag: e.tagName.toLowerCase(), id: e.id, cls: e.className, sel: sel(e), z: cs.zIndex, rect: { left: 0, top: 0, right: 0, bottom: 0 }, display: cs.display, visibility: cs.visibility, opacity: parseFloat(cs.opacity), pe: cs.pointerEvents, bg: 'rgba(0, 0, 0, 0)', bgImage: 'none', backdrop: 'none', onTop: false });
  }
  const root = (name, el) => { if (!el) return null; const c = getComputedStyle(el); return { name, opacity: parseFloat(c.opacity), filter: c.filter, pe: c.pointerEvents, visibility: c.visibility, display: c.display }; };
  const cv = document.querySelector('#game canvas');
  return {
    nodes,
    globals: {
      roots: [root('html', document.documentElement), root('body', document.body), root('#app', document.getElementById('app')), root('#game', document.getElementById('game')), root('#ui', document.getElementById('ui'))].filter(Boolean),
      bodyStyle: document.body.getAttribute('style') ?? '', rootClass: document.getElementById('ui')?.className ?? '',
      underCount: document.querySelectorAll('.ev-under').length, canvasFilter: cv ? getComputedStyle(cv).filter : 'none',
    },
    // enfants directs de #ui hors calques permanents par conception (paillettes, conteneur de notifications)
    uiChildren: [...document.getElementById('ui').children].filter((c) => !/\bleaving\b|\bout\b|rd-sparkle-layer|\btoasts\b|gift-bub|aug-says/.test(c.className)).map(sel),
    scrollW: document.documentElement.scrollWidth, vw, vh,
  };
};

const results = [];
const note = (ok, line) => { results.push({ ok, line }); console.log(line); };

// ---- 0. collisions de noms de classes CSS (cause du bug « fond sombre » : .fx-layer défini deux fois)
{
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.css')) files.push({ path: p, css: readFileSync(p, 'utf8') }); } };
  walk('src');
  const col = findCssCollisions(files);
  note(col.length === 0, formatReport('collisions de classes CSS simples entre feuilles', col.map((c) => `.${c.cls} : ${c.defs.map((d) => d.path.replace('src/', '')).join(' + ')}`)));
}


// ---- audit d'une feuille ou fenêtre ouverte : taille ≤ 85 % de la hauteur, en-tête fixe, corps qui défile, aucun texte coupé ni superposé
const sheetAudit = async (page, tag, name) => {
  const d = await page.evaluate(() => {
    const sh = document.querySelector('.en-sheet') ?? document.querySelector('.modal-backdrop:not(.leaving) .modal');
    if (!sh) return null;
    const R = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
    const body = sh.querySelector('.en-sheet-body') ?? sh;
    const x = sh.querySelector('.en-sheet-x');
    const leaves = [];
    for (const e of sh.querySelectorAll('*')) {
      if (e.closest('svg')) continue;
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      // texte tronqué volontairement (ellipsis) : on ne le compte pas comme débordement
      leaves.push({ name: `« ${e.textContent.trim().slice(0, 28)} »`, rect: R(e), clipX: e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis' });
    }
    return { sheet: R(sh), vh: innerHeight, vw: innerWidth, head: sh.querySelector('.en-sheet-head') ? R(sh.querySelector('.en-sheet-head')) : null, x: x ? R(x) : null,
      scrollable: body.scrollHeight > body.clientHeight + 1, overflowY: getComputedStyle(body).overflowY, bodyScrollW: body.scrollWidth, bodyClientW: body.clientWidth, leaves, bodyTop: R(body).top, bodyBottom: R(body).bottom };
  });
  if (!d) return [`[${tag}] ${name} : feuille introuvable`];
  const f = [];
  const h = d.sheet.bottom - d.sheet.top;
  if (h > d.vh * 0.86) f.push(`feuille trop haute : ${Math.round(h)} px sur ${d.vh} (> 85 %)`);
  if (d.sheet.bottom > d.vh + 1 || d.sheet.top < 0) f.push('feuille hors de l\'écran');
  if (d.x && (d.x.right - d.x.left < 44 || d.x.bottom - d.x.top < 44)) f.push('croix de fermeture < 44 px');
  if (d.scrollable && !/auto|scroll/.test(d.overflowY)) f.push('contenu plus haut que la feuille mais corps non défilant');
  if (d.bodyScrollW > d.bodyClientW + 1) f.push(`défilement horizontal dans la feuille (${d.bodyScrollW} > ${d.bodyClientW})`);
  const vis = d.leaves.filter((l) => l.rect.top >= d.bodyTop - 1 && l.rect.bottom <= d.bodyBottom + 1 || !d.scrollable);
  f.push(...outsideBox(d.leaves, { left: d.sheet.left, right: d.sheet.right }));
  for (const l of d.leaves) if (l.clipX) f.push(`texte coupé à droite : ${l.name}`);
  for (const [a, b, w, hh] of overlappingPairs(d.leaves.filter((l) => !d.leaves.some((m) => m !== l && m.rect.left <= l.rect.left && m.rect.right >= l.rect.right && m.rect.top <= l.rect.top && m.rect.bottom >= l.rect.bottom && m.name === l.name)), 2)) f.push(`textes qui se chevauchent : ${a} et ${b} (${w}×${hh} px)`);
  void vis;
  return f.map((x) => `${name} : ${x}`);
};

// ---- audit de disposition du HUD du plateau (boutons qui se chevauchent, hors écran, zones tactiles, plateau recouvert)
const hudAudit = async (page, tag) => {
  const data = await page.evaluate(() => {
    const items = [];
    const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && c.opacity !== '0'; };
    for (const e of document.querySelectorAll('.merge-hud button, .merge-hud .en-card')) {
      if (e.classList.contains('en-geni') || !vis(e)) continue;
      if (e.closest('.en-card') && e !== e.closest('.en-card') && !e.matches('.en-give, .en-rep')) continue;
      const r = e.getBoundingClientRect();
      const a = getComputedStyle(e, '::after');
      const ext = a.content !== 'none' && a.position === 'absolute' ? { w: Math.max(r.width, parseFloat(a.width) || 0), h: Math.max(r.height, parseFloat(a.height) || 0) } : null;
      const hit = ext ?? { w: r.width, h: r.height };
      const name = (e.getAttribute('aria-label') || e.className || e.tagName).toString().slice(0, 30);
      items.push({ name, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, touch: !e.classList.contains('en-card') && !e.matches('.en-give, .en-rep, .en-pill-btn'), hit });
    }
    const top = document.querySelector('.mh-top')?.getBoundingClientRect();
    const act = document.querySelector('.mh-actions')?.getBoundingClientRect();
    return { items, top: top ? { bottom: top.bottom } : null, act: act ? { top: act.top, bottom: act.bottom } : null, vw: innerWidth, vh: innerHeight };
  });
  const f = [];
  const buttons = data.items.filter((i) => i.touch);
  for (const [a, b, w, h] of overlappingPairs(data.items.filter((i) => !i.name.startsWith('en-card') && !/^div/.test(i.name)), 2)) f.push(`boutons qui se chevauchent : « ${a} » et « ${b} » (${w}×${h} px)`);
  f.push(...layoutIssues(buttons.filter((i) => !/^Mon téléphone|Énergie|Cœurs|Pièces|Diamants/.test(i.name) && !(i.name === 'Auguste' && data.vh <= 720)), data.vw, data.vh, { min: 44 }));
  f.push(...layoutIssues(buttons.filter((i) => /^Mon téléphone|Énergie|Cœurs|Pièces|Diamants/.test(i.name)), data.vw, data.vh, { min: 44 }));
  // plateau : ni l'en-tête ni la barre d'actions ne doivent le recouvrir
  const b = await page.evaluate(() => { const E = window.RADIA?.endless; if (!E) return null; const p0 = E.cellXY(0), p1 = E.cellXY(1), p6 = E.cellXY(6), pl = E.cellXY(35); const cell = p1.x - p0.x; return { top: p0.y - cell / 2, bottom: pl.y + (p6.y - p0.y) / 2, cell }; }).catch(() => null);
  if (b && data.top && data.act && data.act.bottom - data.act.top > 1) {
    if (data.top.bottom > b.top + 1) f.push(`l'en-tête (bas ${Math.round(data.top.bottom)}) recouvre le plateau (haut ${Math.round(b.top)})`);
    if (data.act.top < b.bottom - 1) f.push(`la barre d'actions (haut ${Math.round(data.act.top)}) recouvre le plateau (bas ${Math.round(b.bottom)})`);
    if (data.act.bottom > data.vh + 1) f.push(`la barre d'actions dépasse de l'écran (${Math.round(data.act.bottom)} > ${data.vh})`);
    if (b.cell < 40) f.push(`cases du plateau trop petites : ${Math.round(b.cell)} px`);
  }
  return f.map((x) => `[${tag}] ${x}`);
};

async function run(H) {
  const tag = `393×${H}`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((s) => { if (!sessionStorage.getItem('ov-seeded')) { localStorage.setItem('radia-save-v1', s); sessionStorage.setItem('ov-seeded', '1'); } }, JSON.stringify(baseSave()));
  await page.goto(URL, { waitUntil: 'networkidle' });
  const sleep = (ms) => page.waitForTimeout(ms);
  await sleep(1800);
  let n = 0;
  const closeModals = async () => {
    for (let i = 0; i < 12; i++) {
      let b = page.locator('.modal-backdrop:not(.leaving) .dy-later');
      if (!(await b.count())) b = page.locator('.modal-backdrop:not(.leaving) .actions button');
      if (await b.count()) { await b.first().click().catch(() => {}); await sleep(500); } else break;
    }
  };
  const click = async (loc, ms = 700) => { await loc.first().click({ timeout: 4000 }).catch(() => {}); await sleep(ms); };
  const back = async () => { await click(page.locator('#ui > .screen:not(.leaving) .screen-head .icon-btn[aria-label="Retour"], #ui > .screen:not(.leaving) .icon-btn[aria-label="Retour"]'), 900); };
  /** Point de contrôle : stabilisation puis relevé. `allow` = calques attendus ; `extra` = vérifications propres à l'écran. */
  const check = async (label, { allow = [], wait = 1600, extra } = {}) => {
    await sleep(wait);
    const run1 = async () => { const sn = await page.evaluate(collect); return { sn, ff: evaluate({ vw: sn.vw, vh: sn.vh, nodes: sn.nodes, globals: sn.globals, allow: [...BASE_ALLOW, ...allow] }) }; };
    let { sn: snap, ff: f } = await run1();
    // une anomalie doit PERSISTER (animation d'entrée/sortie encore en cours = faux positif) : on relève à nouveau après un délai
    if (f.length) { await sleep(1200); ({ sn: snap, ff: f } = await run1()); }
    if (snap.scrollW > snap.vw + 1) f.push(`défilement horizontal : scrollWidth ${snap.scrollW} > ${snap.vw}`);
    if (extra) f.push(...(await extra(snap)));
    n++;
    if (SHOTS || f.length) await page.screenshot({ path: `shots/j-ov-${H}-${String(n).padStart(2, '0')}.png` }).catch(() => {});
    note(f.length === 0, formatReport(`[${tag}] ${label}`, f));
    return snap;
  };
  // échantillonnage à chaque image : le HUD du plateau ne doit JAMAIS être visible en même temps qu'un écran (titre, MON MONDE…) en fondu
  const startSampler = () => page.evaluate(() => {
    window.__ov = { bad: [], on: true };
    const loop = () => {
      if (!window.__ov.on) return;
      const hud = document.querySelector('.merge-hud');
      const hs = hud ? getComputedStyle(hud) : null;
      const hudShown = !!hs && hs.display !== 'none' && parseFloat(hs.opacity) > 0.5;
      if (hudShown) for (const e of document.querySelectorAll('#ui > .screen')) { const c = getComputedStyle(e); if (c.display !== 'none' && parseFloat(c.opacity) > 0.03) window.__ov.bad.push(e.className); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const stopSampler = () => page.evaluate(() => { window.__ov.on = false; return [...new Set(window.__ov.bad)]; });
  const uiBase = (snap) => snap.uiChildren.join(' ');
  const mustBeClean = (what) => async (snap) => (snap.uiChildren.some((c) => /modal-backdrop|dialog-layer|ev-layer|inc-layer|tdr-layer|dy-back|cz-root|wh-root|ph-back|en-sheet-back|en-chest-back/.test(c)) ? [`${what} : calque d'interface resté dans #ui : ${snap.uiChildren.join(' ')}`] : []);
  const onlyScreen = (cls) => async (snap) => { const sc = snap.uiChildren.filter((c) => /\.screen\b/.test(c)); return sc.length === 1 && sc[0].includes(cls) ? [] : [`écran attendu ${cls}, trouvé : ${sc.join(' | ') || 'aucun'}`]; };

  await closeModals();
  const t0 = await check('titre (départ)', { allow: ['.screen', '.title-screen'], extra: onlyScreen('title-screen') });
  const baseline = uiBase(t0);

  // ---- titre ⇄ MON MONDE ⇄ carrière (plusieurs fois)
  for (let round = 0; round < 3; round++) {
    await click(page.getByText('MON MONDE'), 1400);
    await closeModals();
    await check(`MON MONDE (tour ${round + 1})`, { allow: ['.screen'] });
    await click(page.locator('.hub-card.tone-gold'), 1500);
    await closeModals();
    await check(`carrière de Radia (tour ${round + 1})`, { allow: ['.screen'] });
    await back();
    await check(`retour carrière → MON MONDE (tour ${round + 1})`, { allow: ['.screen'] });
    await back();
    const t = await check(`retour MON MONDE → titre (tour ${round + 1})`, { allow: ['.screen', '.title-screen'], extra: async (s) => (uiBase(s) === baseline ? [] : [`#ui a changé depuis le premier titre : « ${baseline} » → « ${uiBase(s)} »`]) });
    void t;
  }

  // ---- album / succès
  await click(page.getByText('SOUVENIRS'), 1200);
  await check('album (souvenirs)', { allow: ['.screen'] });
  await back();
  await check('retour album → titre', { allow: ['.screen', '.title-screen'], extra: onlyScreen('title-screen') });
  await click(page.getByText('SUCCÈS').first(), 1000);
  await check('succès', { allow: ['.screen'] });
  await back();
  await check('retour succès → titre', { allow: ['.screen', '.title-screen'], extra: onlyScreen('title-screen') });

  // ---- téléphone depuis le titre
  await click(page.locator('.title-top .ph-btn'), 1200);
  await check('téléphone ouvert (titre)', { allow: ['.screen', '.title-screen', '.ph-back', '.ph', '.ph-screen', '.ph-root'] });
  await click(page.locator('.ph-back .ph-x').first(), 900);
  if (await page.locator('.ph-back:not(.leaving)').count()) await page.mouse.click(196, 40);
  await check('téléphone refermé (titre)', { allow: ['.screen', '.title-screen'], extra: mustBeClean('téléphone') });

  // ---- casino, roue, cadeau du jour, incident, Tindeur, dialogue d'Auguste via les hooks ?debug
  const hook = async (label, js, closer, allow = []) => {
    await page.evaluate(js).catch((e) => errors.push(`${label}: ${e.message}`));
    await check(`${label} ouvert`, { allow: ['.screen', '.title-screen', ...allow], wait: 1800 });
    await closer();
    await check(`${label} refermé`, { allow: ['.screen', '.title-screen'], extra: mustBeClean(label) });
  };
  // ferme un calque en retentant (le chargement paresseux peut être lent sur une machine chargée)
  const closeUntilGone = async (root, btn) => { for (let i = 0; i < 6 && (await page.locator(`${root}:not(.leaving)`).count()); i++) { await click(page.locator(btn), 900); await closeModals(); } };
  await hook('casino', () => { void window.RADIA.casino.open(); }, () => closeUntilGone('.cz-root', '.cz-root .cz-back'), ['.cz-root']);
  await hook('roue du jour', () => { void window.RADIA.wheel.show(); }, () => closeUntilGone('.wh-root', '.wh-root .wh-x'), ['.wh-root']);
  await hook('cadeau du jour', () => { window.RADIA.daily.show(); }, async () => { await closeModals(); await click(page.locator('.dy-back .dy-later, .dy-back .icon-btn, .dy-back button').first(), 1000); }, ['.dy-back']);
  await hook('incident (château)', () => { window.RADIA.incidents.trigger(); }, async () => { await click(page.locator('.inc-layer .btn').filter({ hasText: /plus tard|fermer/i }), 900); await closeModals(); }, ['.inc-layer']);
  await hook('dialogue d\'Auguste (appel)', () => { void window.RADIA.kidCall('cuddle'); }, async () => { await click(page.locator('.kid-call button, .kc-btn, .kc-actions button').first(), 900); await closeModals(); }, ['.kid-call', '.kc-layer']);
  await hook('Tindeur', () => { window.RADIA.tindeur.open(); }, async () => { await click(page.locator('.tdr-layer .icon-btn, .tdr-layer .tdr-close, .tdr-layer button').first(), 1000); await closeModals(); }, ['.tdr-layer']);

  // ---- Endless
  await closeModals();
  await startSampler();
  await click(page.getByText('MODE LIBRE'), 3000);
  await page.waitForSelector('.merge-hud.endless', { timeout: 9000 }).catch(() => errors.push('Endless non démarré'));
  { const bad = await stopSampler(); note(bad.length === 0, formatReport(`[${tag}] titre → Endless — à chaque image, aucun écran ne transparaît sous le HUD`, bad.map((c) => `écran visible sous le HUD : ${c}`))); }
  await closeModals();
  const E = (fn, ...a) => page.evaluate(([f, args]) => window.RADIA.endless[f](...args), [fn, a]);
  const noScreen = async (s) => (s.uiChildren.some((c) => /\.screen\b/.test(c)) ? [`un écran reste sous le HUD : ${s.uiChildren.join(' ')}`] : []);
  const hudExtra = async (s) => [...(await noScreen(s)), ...(await hudAudit(page, tag))];
  await check('Endless : départ', { allow: ['.merge-hud', '.en-layer'], extra: hudExtra });
  // générateur : feuille
  // feuille du générateur : par APPUI LONG sur le générateur (plus de bouton « i » sur le plateau)
  { const g = (await E('state')).cells.find((c) => c.c === 'gen'); const p = g ? await E('cellXY', g.i) : null; if (p) { await page.mouse.move(p.x, p.y); await page.mouse.down(); await sleep(750); await page.mouse.up(); await sleep(700); } }
  await check('Endless : feuille du générateur', { allow: ['.merge-hud', '.en-layer', '.en-sheet-back'], extra: () => sheetAudit(page, tag, 'feuille générateur') });
  await click(page.locator('.en-sheet-x'), 600);
  for (const [name, sel] of [['feuille Trésor (probabilités)', '.en-tre'], ['feuille objectifs', '.en-goal'], ['feuille événement secondaire', '.en-chip']]) {
    await click(page.locator(sel), 800);
    await check(`Endless : ${name}`, { allow: ['.merge-hud', '.en-layer', '.en-sheet-back'], wait: 900, extra: () => sheetAudit(page, tag, name) });
    await click(page.locator('.en-sheet-x'), 600);
  }
  await check('Endless : feuille refermée', { allow: ['.merge-hud', '.en-layer'], extra: async (s) => [...(await mustBeClean('feuille')(s)), ...(await hudAudit(page, tag))] });
  // énergie à 0
  await page.evaluate(() => { const e = window.RADIA.save.data.economy; e.energy = 0; e.energyTs = Date.now(); });
  await E('giveEnergy', 0);
  const g = await E('state');
  const gen = g.cells.find((c) => c.c === 'gen');
  if (gen) { const p = await E('cellXY', gen.i); await page.mouse.click(p.x, p.y); await sleep(900); }
  await check('Endless : énergie à 0 (panneau ou message)', { allow: ['.merge-hud', '.en-layer', '.modal-backdrop'] });
  await closeModals();
  await check('Endless : après fermeture du panneau énergie', { allow: ['.merge-hud', '.en-layer'], extra: mustBeClean('énergie') });
  await E('giveEnergy', 80);
  // coffre
  await E('fillGauge');
  await sleep(500);
  await click(page.locator('.en-tre'), 900);
  await check('Endless : coffre affiché', { allow: ['.merge-hud', '.en-layer', '#reward-overlay', '.rw-root'] });
  await click(page.locator('.rw-art'), 3200);
  for (let i = 0; i < 4; i++) { const b = page.locator('.rw-primary:visible'); if (await b.count()) { await click(b, 900); } }
  await check('Endless : coffre refermé', { allow: ['.merge-hud', '.en-layer'], wait: 1800, extra: async (s) => [...(await mustBeClean('coffre')(s)), ...(await hudAudit(page, tag))] });
  // téléphone par-dessus l'Endless
  await click(page.locator('.mh-phone'), 1300);
  await check('Endless : téléphone ouvert', { allow: ['.merge-hud', '.en-layer', '.ph-back', '.ph', '.ph-screen', '.ph-root'] });
  await click(page.locator('.ph-back .ph-x').first(), 900);
  if (await page.locator('.ph-back:not(.leaving)').count()) await page.mouse.click(196, 40);
  await check('Endless : téléphone refermé', { allow: ['.merge-hud', '.en-layer'], extra: mustBeClean('téléphone') });
  // MON MONDE puis retour : on regarde AUSSI juste après le retour (transition)
  for (let k = 0; k < 2; k++) {
    await click(page.locator('.en-world'), 1500);
    await closeModals();
    await check(`Endless → MON MONDE (tour ${k + 1})`, { allow: ['.screen'] });
    await startSampler();
    await back();
    await sleep(2200);
    const bad = await stopSampler();
    note(bad.length === 0, formatReport(`[${tag}] Endless : retour de MON MONDE (tour ${k + 1}) — à chaque image, aucun écran ne transparaît sous le HUD`, bad.map((c) => `écran visible sous le HUD : ${c}`)));
    await check(`Endless : retour de MON MONDE (tour ${k + 1})`, { allow: ['.merge-hud', '.en-layer'], extra: hudExtra });
  }
  // pause → quitter → titre
  await click(page.locator('.mh-bar .icon-btn[aria-label="Pause"]'), 800);
  await check('Endless : pause', { allow: ['.merge-hud', '.en-layer', '.modal-backdrop'] });
  const quit = page.locator('.modal-backdrop:not(.leaving) .actions button').filter({ hasText: /Quitter vers le menu/ });
  await click(quit.first(), 1800);
  await closeModals();
  await check('retour au titre après Endless', { allow: ['.screen', '.title-screen'], wait: 2200, extra: async (s) => (uiBase(s) === baseline ? [] : [`#ui a changé depuis le premier titre : « ${baseline} » → « ${uiBase(s)} »`]) });
  // un second aller-retour Endless pour vérifier qu'aucun état ne s'accumule
  await click(page.getByText('MODE LIBRE'), 3000);
  await closeModals();
  await check('Endless : 2e entrée', { allow: ['.merge-hud', '.en-layer'] });
  await click(page.locator('.mh-bar .icon-btn[aria-label="Pause"]'), 800);
  await click(page.locator('.modal-backdrop:not(.leaving) .actions button').filter({ hasText: /Quitter vers le menu/ }).first(), 1800);
  await closeModals();
  await check('retour au titre (2e fois)', { allow: ['.screen', '.title-screen'], wait: 2200, extra: async (s) => (uiBase(s) === baseline ? [] : [`#ui a changé : « ${baseline} » → « ${uiBase(s)} »`]) });

  note(errors.length === 0, errors.length ? `KO  [${tag}] erreurs JS : ${errors.slice(0, 4).join(' / ')}` : `OK  [${tag}] aucune erreur JavaScript`);
  await ctx.close();
}

for (const H of (process.env.HEIGHTS ?? '852,660').split(',').map(Number)) await run(H);
await browser.close();
const ko = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - ko}/${results.length} points de contrôle OK${ko ? ` — ${ko} KO` : ''}`);
process.exit(ko ? 1 : 0);
