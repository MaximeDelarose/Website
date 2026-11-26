/* Fin de session « C'est l'heure du dodo » : sorcière fâchée mais drôle, Lumi, réglages parent, limite de temps respectée, voix distinctes,
   expressions et bouches synchronisées avec les phrases, retour impossible sans parent. Horloge simulée (page.clock). Chromium mobile émulé. */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
const preset = (o) => ({ content: "try { if (!localStorage.getItem('celia.session')) localStorage.setItem('celia.session', JSON.stringify(Object.assign({ v: 1, minutes: 5, state: 'playing', remaining: 70000, tick: null, warned: false, pin: { salt: 't', hash: 'st' }, fails: 0, lockUntil: 0, endedAt: 0 }, " + JSON.stringify(o) + "))); } catch (e) { }" });

async function runToEnd(p, extra) {   /* laisse passer le temps simulé, relève chaque réplique (qui, texte, expression visible de la sorcière) */
  const seen = []; let last = 0;
  for (let t = 0; t < 600; t++) {
    await p.clock.runFor(400);
    const st = await p.evaluate(() => ({ n: (C.spokenLog || []).length, cur: C.current(), ex: (() => { const s = document.querySelector('svg.witch'); const e = s && [...s.querySelectorAll('[data-ex]')].find((n) => n.style.display !== 'none'); return e ? e.getAttribute('data-ex') : null; })(), arm: (() => { const s = document.querySelector('svg.witch'); const e = s && [...s.querySelectorAll('[data-arm]')].find((n) => n.style.display !== 'none'); return e ? e.getAttribute('data-arm') : null; })() }));
    if (st.n > last) { const l = await p.evaluate(() => C.spokenLog[C.spokenLog.length - 1]); seen.push({ ...l, ex: st.ex, arm: st.arm }); last = st.n; if (extra) await extra(seen); }
    if (st.cur === 'sleep' && t > 5) { await p.clock.runFor(2500); break; }
  }
  return seen;
}

(async () => {
  const b = await chromium.launch();

  /* ---- 1. écran parent : choix de la fin de session ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('celia.session')) localStorage.setItem('celia.session', JSON.stringify({ v: 1, minutes: 10, state: 'none', remaining: 0, tick: null, warned: false, pin: { salt: 't', hash: 'st' }, fails: 0, lockUntil: 0, endedAt: 0 })); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await sleep(p, 900); await p.evaluate(() => { const m = document.querySelector('.modal.pin'); m && m.remove(); C.go('setup', { unlocked: true }); }); await sleep(p, 900);
    ok(await p.evaluate(() => !!document.querySelector('[data-end=classic]') && !!document.querySelector('[data-end=dodo]')), 'écran parent : choix « Fin douce » / « C’est l’heure du dodo »');
    ok(await p.evaluate(() => document.querySelector('[data-end=classic]').classList.contains('on') && getComputedStyle(document.querySelector('[data-witch]')).display === 'none'), 'par défaut : fin douce classique (pas d’annonce de coucher en plein après-midi)');
    await p.evaluate(() => document.querySelector('[data-end=dodo]').click()); await sleep(p, 300);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('[data-witch]')).display !== 'none' && /Sorcière rigolote : oui/.test(document.querySelector('[data-witch]').textContent)), '« dodo » : le réglage de la sorcière apparaît, activée');
    await p.evaluate(() => document.querySelector('[data-witch]').click()); await sleep(p, 200);
    ok(await p.evaluate(() => C.session.endMode() === 'calm' && /Sorcière : non/.test(document.querySelector('[data-witch]').textContent)), 'la sorcière se désactive (Lumi dit seulement bonne nuit)');
    ok(await p.evaluate(() => { const r = [...document.querySelectorAll('.eo')].map((e) => e.getBoundingClientRect()); return r.every((x) => x.height >= 40 && x.left >= 0 && x.right <= innerWidth); }), 'boutons du choix assez grands et visibles (iPhone SE)');
    await p.evaluate(() => document.querySelector('[data-witch]').click()); await sleep(p, 200);
    ok(await p.evaluate(() => C.session.endMode() === 'witch'), 'on peut la réactiver');
    await p.reload(); await sleep(p, 900);
    ok(await p.evaluate(() => C.session.endMode() === 'witch'), 'le choix est conservé après rechargement');
    ok(errs.length === 0, 'écran parent : aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }

  /* ---- 2. voix distinctes : une voix du navigateur différente par personnage, sorcière grave, volumes doux ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(preset({}));
    await ctx.addInitScript(() => {
      window.__utt = []; const V = [{ name: 'Amélie (Améliorée)', lang: 'fr-FR', voiceURI: 'a', localService: true }, { name: 'Audrey', lang: 'fr-FR', voiceURI: 'b', localService: true }, { name: 'Aurélie', lang: 'fr-FR', voiceURI: 'c', localService: true }, { name: 'Thomas', lang: 'fr-FR', voiceURI: 'd', localService: true }];
      Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => V, speak(u) { window.__utt.push({ t: u.text, v: u.voice && u.voice.name, p: u.pitch, r: u.rate, vol: u.volume }); setTimeout(() => u.onstart && u.onstart(), 5); setTimeout(() => u.onend && u.onend(), 30); }, cancel() { }, resume() { }, addEventListener() { } }, configurable: true });
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    });
    const p = await ctx.newPage(); await p.goto(BASE); await sleep(p, 800);
    await p.evaluate(() => { C.voice.ok = true; C.voice.voice = speechSynthesis.getVoices()[0]; });
    for (const w of ['narr', 'aliya', 'tania', 'witch']) { await p.evaluate((w) => C.speak(w, 'Bonjour Celia !'), w); await sleep(p, 150); }
    const u = await p.evaluate(() => window.__utt);
    const by = Object.fromEntries(['narr', 'aliya', 'tania', 'witch'].map((w, i) => [w, u[i]]));
    ok(u.length === 4 && new Set(u.map((x) => x.v)).size === 4, 'voix : 4 voix du navigateur différentes (' + u.map((x) => x.v).join(' / ') + ')');
    ok(by.witch.v === 'Thomas' && by.witch.p <= 0.6 && by.witch.r < by.aliya.r, 'la sorcière a une voix grave et lente (' + by.witch.v + ', hauteur ' + by.witch.p + ')');
    ok(by.aliya.p > by.tania.p && by.tania.p > by.narr.p, 'Aliya, Tania et la narratrice se distinguent aussi par la hauteur (' + by.aliya.p + ' / ' + by.tania.p + ' / ' + by.narr.p + ')');
    ok(u.every((x) => x.vol <= 0.6), 'volumes doux, jamais de hurlement (max ' + Math.max(...u.map((x) => x.vol)) + ')');
    ctx.close();
  }

  /* ---- 3. la scène complète avec la sorcière ---- */
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14' }, { w: 375, h: 667, n: 'iPhone SE' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(preset({ end: 'dodo', witch: true }));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.install(); await p.goto(BASE); await p.clock.runFor(1000);
    await p.evaluate(() => document.querySelector('.startbtn').click()); await p.clock.runFor(500);
    const T = vp.n;
    await p.clock.runFor(11000);   /* il reste moins d'une minute */
    ok(await p.evaluate(() => (C.spokenLog || []).some((x) => /bientôt dire au revoir/.test(x.text)) || C.lastSay === 'Celia, on va bientôt dire au revoir au château !'), T + ' : une minute avant la fin, Lumi prévient doucement');
    let layout = null;
    const seen = await runToEnd(p, async (seenNow) => {
      if (!layout && seenNow.length === 3) {   /* la sorcière est arrivée : on vérifie qu'elle tient à l'écran (les transitions CSS tournent en temps réel) */
        await p.waitForTimeout(1600);
        layout = await p.evaluate(() => { const w = document.querySelector('.cwitch').getBoundingClientRect(), l = document.querySelector('.clumi').getBoundingClientRect(), c = document.querySelector('.ccap span').getBoundingClientRect(); return { w, inV: w.left >= -2 && w.right <= innerWidth + 2 && w.top >= -2 && w.bottom <= innerHeight, cap: c.bottom <= innerHeight && c.left >= 0, big: w.width >= innerWidth * 0.8, lumiVisible: l.right > 0 && l.left < innerWidth }; });
      }
    });
    const lines = seen.map((s) => s.who + ': ' + s.text);
    ok(seen.length >= 7 && seen[0].who === 'narr' && /fatiguée/.test(seen[0].text) && /toi aussi/.test(seen[0].text), T + ' : Lumi bâille et dit « Moi, je suis fatiguée ! … je crois que toi aussi ! »');
    ok(/sorcière pourrait arriver/.test(seen[1].text) && seen[1].who === 'narr', T + ' : « Parce que sinon… la sorcière pourrait arriver ! »');
    const W = seen.filter((s) => s.who === 'witch');
    ok(W.length === 5 && /WAH|Wah/i.test(W[0].text) && /pas contente/.test(W[1].text) && /château doit dormir/.test(W[2].text) && /petite princesse/.test(W[3].text) && /Bonne nuit quand même/.test(W[4].text), T + ' : la sorcière dit ses 5 répliques, dans l’ordre');
    ok(W.map((s) => s.ex).join() === 'laugh,angry,grumpy,soft,wink', T + ' : son expression change à chaque réplique (' + W.map((s) => s.ex).join(' → ') + ')');
    ok(W[1].arm === 'point' && W[2].arm === 'cross' && W[3].arm === 'hips', T + ' : …et ses bras aussi (pointe du doigt, bras croisés, mains sur les hanches)');
    ok(!!layout && layout.inV && layout.big && layout.cap, T + ' : la sorcière est grande et entièrement visible, légende lisible ' + JSON.stringify(layout && { inV: layout.inV, big: layout.big, cap: layout.cap }));
    ok(await p.evaluate(() => C.current() === 'sleep' && C.session.state() === 'ended'), T + ' : retour à l’écran « À bientôt Celia ! » et session terminée');
    ok(await p.evaluate(() => C.CINE.witch.every((s) => s.say.length < 80) && C.SPEAKERS.witch.vol <= 0.6), T + ' : phrases courtes, volume doux : pas de hurlement ni de menace');
    ok(!lines.some((l) => /viens te chercher|je vais t|attrape|punition|tais-toi/i.test(l)), T + ' : aucune menace ni propos effrayant dans les répliques');
    ok(await p.evaluate(() => (C.spokenLog || []).some((x) => x.who === 'narr' && /Bonne nuit, petite princesse/.test(x.text))), T + ' : Lumi souhaite bonne nuit : « Bonne nuit, petite princesse ! Fais de beaux rêves ! »');
    /* impossible de relancer : recharger / forcer l'accès */
    await p.evaluate(() => { C.go('home'); C.go('draw'); }); await p.clock.runFor(1500);
    ok(await p.evaluate(() => C.current() === 'sleep'), T + ' : plus aucune activité accessible sans le code parent');
    ok(errs.length === 0, T + ' : aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }

  /* ---- 4. bouches : la bouche s'ouvre et se ferme pendant que la sorcière parle ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(preset({ end: 'dodo', witch: true }));
    const p = await ctx.newPage(); await p.clock.install(); await p.goto(BASE); await p.clock.runFor(800);
    await p.evaluate(() => { document.querySelector('.startbtn').click(); C.go('bedtime', { mode: 'witch' }); });
    let flips = 0, prev = null, lumiFlips = 0, lprev = null;
    for (let t = 0; t < 400; t++) {
      await p.clock.runFor(100);
      const s = await p.evaluate(() => { const w = document.querySelector('svg.witch'), e = w && [...w.querySelectorAll('[data-ex]')].find((n) => n.style.display !== 'none'), m = e && [...e.querySelectorAll('[data-mv]')].find((n) => n.style.display !== 'none'); const lm = document.querySelector('.lu-mouth'); return { m: m ? m.getAttribute('data-mv') : null, l: lm ? lm.getAttribute('d') : null, cur: C.current() }; });
      if (prev && s.m && s.m !== prev) flips++; if (s.m) prev = s.m; if (lprev && s.l !== lprev) lumiFlips++; lprev = s.l; if (s.cur === 'sleep') break;
    }
    ok(flips >= 12, 'la bouche de la sorcière bouge pendant qu’elle parle (' + flips + ' mouvements)');
    ok(lumiFlips >= 6, 'la bouche de Lumi bouge aussi (' + lumiFlips + ' mouvements)');
    await ctx.close();
  }

  /* ---- 5. fin « dodo » sans sorcière : Lumi seule, calme ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(preset({ end: 'dodo', witch: false }));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.install(); await p.goto(BASE); await p.clock.runFor(1000); await p.evaluate(() => document.querySelector('.startbtn').click()); await p.clock.runFor(500);
    await p.clock.runFor(11000);
    const seen = await runToEnd(p);
    ok(!seen.some((s) => s.who === 'witch') && seen.some((s) => /fatiguée/.test(s.text)), 'sorcière désactivée : seule Lumi parle (' + seen.length + ' répliques)');
    ok(await p.evaluate(() => C.current() === 'sleep' && C.session.state() === 'ended' && !document.querySelector('.cwitch')), 'la sorcière n’apparaît jamais, le château s’endort');
    ok(await p.evaluate(() => (C.spokenLog || []).some((x) => /Bonne nuit, petite princesse/.test(x.text))), 'Lumi dit bonne nuit');
    ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }

  /* ---- 6. fin classique : inchangée, sans cinématique ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(preset({ end: 'classic', witch: true }));
    const p = await ctx.newPage(); await p.clock.install(); await p.goto(BASE); await p.clock.runFor(1000); await p.evaluate(() => document.querySelector('.startbtn').click()); await p.clock.runFor(500);
    await p.clock.runFor(11000); let went = []; for (let t = 0; t < 300; t++) { await p.clock.runFor(300); const c = await p.evaluate(() => C.current()); if (!went.length || went[went.length - 1] !== c) went.push(c); if (c === 'sleep') break; }
    ok(went.indexOf('bedtime') < 0 && went[went.length - 1] === 'sleep', 'fin classique : directement l’écran de fin, sans sorcière (' + went.join(' → ') + ')');
    await ctx.close();
  }

  /* ---- 7. recharger pendant la scène ne contourne pas la limite ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(preset({ end: 'dodo', witch: true, remaining: 1000 }));
    const p = await ctx.newPage(); await p.clock.install(); await p.goto(BASE); await p.clock.runFor(1000); await p.evaluate(() => document.querySelector('.startbtn').click());
    for (let t = 0; t < 40; t++) { await p.clock.runFor(300); if (await p.evaluate(() => C.current() === 'bedtime')) break; }
    ok(await p.evaluate(() => C.current() === 'bedtime' && C.session.state() === 'ended'), 'temps écoulé : la scène démarre et la session est déjà enregistrée comme terminée');
    await p.reload(); await p.clock.runFor(1500);
    ok(await p.evaluate(() => C.current() === 'sleep' && C.session.state() === 'ended'), 'rechargement pendant la scène : retour direct à l’écran de fin (pas de session relancée)');
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nFIN DODO / SORCIÈRE : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
