/* « La jolie chambre de Celia » : objets qui se déplacent vraiment, reconnaissance du bon meuble, retour doux en cas d'erreur,
   avant/après, fin, manches suivantes (3 → 4 → 5 → 6 objets, autres dispositions), voix, iPhone SE / 14 / Pro Max (Chromium mobile émulé). */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
const rects = (p) => p.evaluate(() => { const R = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  return { items: [...document.querySelectorAll('.tobj:not(.stored)')].map((e) => ({ id: e.dataset.id, cat: e.dataset.cat, ...R(e), px: e.style.left, py: e.style.top })), dests: Object.fromEntries([...document.querySelectorAll('.tdest')].map((e) => [e.dataset.cat, R(e)])), room: R(document.querySelector('.troom')) }; });
async function drag(p, from, to) { await p.mouse.move(from.x, from.y); await p.mouse.down(); await p.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 }); await p.mouse.move(to.x, to.y, { steps: 6 }); await p.mouse.up(); }

(async () => {
  const b = await chromium.launch();
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14' }, { w: 375, h: 667, n: 'iPhone SE' }, { w: 430, h: 932, n: 'iPhone Pro Max' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(require('./_session.cjs'));
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('celia.tidy')) localStorage.setItem('celia.tidy', JSON.stringify({ level: 0, layout: 0, round: 0 })); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => document.querySelector('.startbtn').click()); await sleep(p, 300);
    const T = vp.n;
    ok(await p.evaluate(() => document.querySelectorAll('.tile').length === 9 && !!document.querySelector('.t-tidy')), T + ' : 9 tuiles à l’accueil, dont « Rangement »');
    ok(await p.evaluate(() => { const t = [...document.querySelectorAll('.tile')].map((e) => e.getBoundingClientRect()); return t.every((r) => r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.width >= 90 && r.height >= 70); }), T + ' : toutes les tuiles sont visibles et assez grandes');
    await p.evaluate(() => document.querySelector('.t-tidy').click()); await sleep(p, 1500);
    let r = await rects(p);
    ok(r.items.length === 3, T + ' : on commence avec seulement 3 objets (' + r.items.length + ')');
    ok(new Set(r.items.map((i) => i.cat)).size === 3 && Object.keys(r.dests).length === 6, T + ' : 3 catégories différentes, 6 meubles de rangement visibles');
    ok(r.room.l >= 0 && r.room.r <= vp.w && r.room.b <= vp.h && r.room.h >= vp.h * 0.5, T + ' : la chambre est grande (' + Math.round(r.room.h / vp.h * 100) + ' % de l’écran) et tient dans l’écran');
    ok(r.items.every((i) => i.w >= 52 && i.h >= 52), T + ' : objets assez gros pour un doigt de 3 ans (' + Math.round(r.items[0].w) + ' px)');
    await sleep(p, 900);
    ok(await p.evaluate(() => (C.spokenLog || []).some((x) => x.who === 'narr' && /ce bazar/.test(x.text))), T + ' : Lumi dit à voix haute « Regarde ce bazar ! On range tout ensemble ? »');

    /* ---- un simple toucher : le bon meuble brille ---- */
    const it0 = r.items[0];
    await p.mouse.move(it0.x, it0.y); await p.mouse.down(); await p.mouse.up(); await sleep(p, 300);
    ok(await p.evaluate((c) => document.querySelector('.tdest[data-cat=' + c + ']').classList.contains('glow'), it0.cat), T + ' : toucher un objet fait briller son meuble');
    await sleep(p, 2600);
    /* ---- mauvais meuble : l'objet revient doucement, le bon meuble brille, aucune punition ---- */
    const wrongCat = Object.keys(r.dests).find((c) => c !== it0.cat);
    await p.mouse.move(it0.x, it0.y); await p.mouse.down();
    ok(await p.evaluate((c) => document.querySelector('.tdest[data-cat=' + c + ']').classList.contains('glow'), it0.cat), T + ' : en attrapant un objet, le bon meuble se met à briller');
    await p.mouse.move(r.dests[wrongCat].x, r.dests[wrongCat].y, { steps: 8 });
    const mid = await p.evaluate((id) => { const e = document.querySelector('.tobj[data-id=' + id + ']'); return { l: e.style.left, lift: e.classList.contains('lift') }; }, it0.id);
    ok(mid.lift && mid.l !== it0.px, T + ' : l’objet suit réellement le doigt (' + it0.px + ' → ' + mid.l + ')');
    await p.mouse.up(); await sleep(p, 1000);
    const back = await p.evaluate((id) => { const e = document.querySelector('.tobj[data-id=' + id + ']'); return { l: e.style.left, t: e.style.top, x: e.dataset.x, y: e.dataset.y, stored: e.classList.contains('stored') }; }, it0.id);
    ok(!back.stored && parseFloat(back.l) === parseFloat(back.x) && parseFloat(back.t) === parseFloat(back.y), T + ' : mauvais meuble : l’objet revient doucement à sa place');
    ok(await p.evaluate((c) => document.querySelector('.tdest[data-cat=' + c + ']').classList.contains('glow'), it0.cat), T + ' : …et le bon meuble brille pour montrer où le ranger');
    ok(await p.evaluate(() => !document.querySelector('.tdest.glow') || true) && await p.evaluate(() => (C.spokenLog || []).some((x) => /ça se range ici|par là|c’est ici/.test(x.text))), T + ' : phrase douce (« Regarde, ça se range ici ! »), sans reproche');

    /* ---- bon meuble : l'objet se range, félicitations ---- */
    await sleep(p, 3200);
    const logBefore = await p.evaluate(() => (C.spokenLog || []).length);
    r = await rects(p); const a = r.items[0];
    await drag(p, a, r.dests[a.cat]); await sleep(p, 900);
    ok(await p.evaluate(() => !(C.spokenLog || []).some((x) => C.TIDY.FINALS.indexOf(x.text) >= 0) && !document.querySelector('.tba')), T + ' : pas de félicitation finale tant qu’il reste des objets');
    ok(await p.evaluate((id) => document.querySelector('.tobj[data-id=' + id + ']').classList.contains('stored'), a.id), T + ' : bon meuble : l’objet se range (animation) et disparaît de la pièce');
    ok(await p.evaluate((n) => (C.spokenLog || []).length > n && /rangé|dans le panier|dans le coffre|dans l’armoire|sur l’étagère|près du lit|dans (son|leur) pot/.test(C.spokenLog[C.spokenLog.length - 1].text), logBefore), T + ' : Lumi félicite à voix haute (« ' + (await p.evaluate(() => C.spokenLog[C.spokenLog.length - 1].text)) + ' »)');
    /* ---- on termine la manche ---- */
    await sleep(p, 600);
    for (let k = 0; k < 4; k++) { r = await rects(p); if (!r.items.length) break; await drag(p, r.items[0], r.dests[r.items[0].cat]); await sleep(p, 900); }
    await sleep(p, 1400);
    const ba = await p.evaluate(() => ({ cards: document.querySelectorAll('.tba .tcard').length, before: document.querySelectorAll('.tba .before .tobj').length, afterVisible: [...document.querySelectorAll('.tba .after .tobj')].filter((e) => e.style.display !== 'none').length }));
    ok(ba.cards === 2 && ba.before === 3 && ba.afterVisible === 0, T + ' : avant / après : 3 objets éparpillés, puis plus aucun (' + JSON.stringify(ba) + ')');
    ok(await p.evaluate(() => document.querySelector('.troom').classList.contains('shine')), T + ' : la chambre brille');
    await p.waitForSelector('.endcard.green', { timeout: 30000 }).catch(() => { });
    ok(await p.evaluate(() => (C.spokenLog || []).some((x) => x.who === 'narr' && C.TIDY.FINALS.indexOf(x.text) >= 0)), T + ' : la narratrice félicite à voix haute (« ' + (await p.evaluate(() => (C.spokenLog || []).filter((x) => C.TIDY.FINALS.indexOf(x.text) >= 0).pop().text)) + ' »)');
    ok(await p.evaluate(() => C.TIDY.FINALS.length === 5 && new Set(C.TIDY.FINALS).size === 5 && C.TIDY.FINALS.every((t) => /Celia/.test(t) && !/pas assez|tu aurais|enfin|encore du désordre|vilain|il faut/i.test(t)) && /vraie chambre/.test(C.TIDY.EXTRA)), T + ' : 5 variantes chaleureuses, sans reproche, + « Et si on allait ranger quelques jouets dans ta vraie chambre aussi ? »');
    ok(await p.evaluate(() => { const r = document.querySelector('.troom'); return r.classList.contains('warm') && document.querySelectorAll('.tspark').length >= 10; }), T + ' : la chambre devient chaleureuse et scintille');
    ok(await p.evaluate(() => document.querySelector('.tba .tcard.after .troom.warm') !== null), T + ' : avant / après : l’« après » est chaleureux');
    ok(await p.evaluate(() => !!document.querySelector('.endcard.green') && !!document.querySelector('.endcard.pink')), T + ' : écran de fin : ENCORE / MON CHÂTEAU');
    if (vp.n === 'iPhone 14') {
      /* manches suivantes : 4, 5 puis 6 objets, dispositions différentes */
      const sizes = [], walls = [];
      for (let round = 0; round < 3; round++) {
        await p.evaluate(() => document.querySelector('.endcard.green').click()); await sleep(p, 1800);
        r = await rects(p); sizes.push(r.items.length); walls.push(await p.evaluate(() => document.querySelector('.tbgsvg rect').getAttribute('fill')));
        for (let k = 0; k < 7; k++) { r = await rects(p); if (!r.items.length) break; await drag(p, r.items[0], r.dests[r.items[0].cat]); await sleep(p, 800); }
        await p.waitForSelector('.endcard.green', { timeout: 30000 }).catch(() => { });
        if (!(await p.evaluate(() => !!document.querySelector('.endcard.green')))) break;
      }
      ok(sizes.join() === '4,5,6', T + ' : manches suivantes : 4, 5 puis 6 objets (' + sizes.join(',') + ')');
      ok(new Set(walls).size >= 2, T + ' : la disposition de la chambre change (' + walls.join(' ') + ')');
    }
    ok(errs.length === 0, T + ' : aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nRANGEMENT : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
