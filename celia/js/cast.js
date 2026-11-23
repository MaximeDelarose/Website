/* Le petit univers vivant : voix distinctes (narratrice, sorcière, Aliya, Tania), bouches qui parlent, apparitions des grandes sœurs,
   câlins, bisous pour maman, petites phrases du quotidien. Les paroles sont dites à voix haute (voix du navigateur ou fichiers
   préenregistrés si installés) ; la musique baisse pendant qu'on parle. Rien n'est jamais obligatoire ni culpabilisant. */
(function () {
  'use strict';
  var V = C.voice;

  /* ---------- les voix ---------- */
  var SPK = {
    narr: { label: 'Lumi', pitch: 1.08, rate: 0.86, vol: 0.45, slot: 0 },
    aliya: { label: 'Aliya', pitch: 1.3, rate: 0.95, vol: 0.5, slot: 1 },
    tania: { label: 'Tania', pitch: 1.12, rate: 1.04, vol: 0.5, slot: 2 },
    witch: { label: 'Sorcière', pitch: 0.5, rate: 0.8, vol: 0.55, slot: 3, male: true }
  };
  C.SPEAKERS = SPK;
  function frVoices() {
    try {
      if (!window.speechSynthesis) return [];
      var list = (speechSynthesis.getVoices() || []).filter(function (v) { return /^fr/i.test(v.lang.replace('_', '-')); });
      var male = /thomas|daniel|jacques|henri|paul|claude|antoine|mathieu|bruno|nicolas|male|homme/i;
      function sc(v) { var n = v.name + ' ' + (v.voiceURI || ''), s = 0; if (/premium|enhanced|am[ée]lior|neural|natural|online/i.test(n)) s += 100; if (/siri/i.test(n)) s += 60; if (/compact|eloquence|espeak|novelty|whisper|zarvox|bells|trinoids|fred|albert/i.test(n)) s -= 80; if (/^fr[-_]fr/i.test(v.lang)) s += 15; if (v.localService) s += 3; return s; }
      return list.map(function (v) { return { v: v, male: male.test(v.name), sc: sc(v) }; }).sort(function (a, b) { return b.sc - a.sc; });
    } catch (e) { return []; }
  }
  /* une voix du navigateur différente par personnage quand il y en a plusieurs ; sinon on joue sur la hauteur et le débit */
  function voiceFor(who) {
    var all = frVoices(); if (!all.length) return null;
    var fem = all.filter(function (x) { return !x.male; }), mal = all.filter(function (x) { return x.male; }), p = SPK[who];
    if (p.male) return (mal[0] || fem[0] || all[0]).v;
    if (!fem.length) return all[0].v;
    if (who === 'narr') return (V.voice && fem.some(function (x) { return x.v === V.voice; }) ? V.voice : fem[0].v);
    return fem[Math.min(p.slot, fem.length - 1)].v;
  }
  function est(text, who) { return Math.max(1500, text.length * 72 * (who === 'witch' ? 1.12 : 1) + 600); }

  /* parle : renvoie une promesse résolue à la fin de la phrase. o.mouth(open) est appelé ~6 fois par seconde pendant qu'on parle. */
  var tok = 0, cancelCur = null, babbleTimer = null;
  C.speak = function (who, text, o) {
    o = o || {}; var my = ++tok, p = SPK[who] || SPK.narr;
    if (cancelCur) { try { cancelCur(); } catch (e) { } }
    try { if (window.speechSynthesis) speechSynthesis.cancel(); if (C.stopVoiceFile) C.stopVoiceFile(); } catch (e) { }
    C.lastSpoken = { who: who, text: text, at: Date.now() };
    (C.spokenLog = C.spokenLog || []).push({ who: who, text: text }); if (C.spokenLog.length > 60) C.spokenLog.shift();
    return new Promise(function (resolve) {
      var finished = false, tm = null, mo = null, open = false;
      function done() {
        if (finished) return; finished = true; clearTimeout(tm); clearInterval(mo);
        if (o.mouth) { try { o.mouth(false); } catch (e) { } }
        if (!o.keepDuck) { try { C.music && C.music.duck(false); } catch (e) { } }
        if (cancelCur === cancel) cancelCur = null; resolve();
      }
      function cancel() { done(); }
      cancelCur = cancel;
      var audible = C.settings.sound && C.settings.voice;
      try { C.music && C.music.duck(true); } catch (e) { }
      if (o.mouth) mo = setInterval(function () { open = !open; try { o.mouth(open); } catch (e) { } }, 165);
      var ms = est(text, who);
      if (!audible) { tm = setTimeout(done, ms); return; }
      var keyText = who === 'narr' ? text : who + '|' + text, gotFile = false;
      function browser() {
        try {
          if (window.speechSynthesis && window.SpeechSynthesisUtterance && V.ok) {
            var vc = voiceFor(who) || V.voice, parts = (text.match(/[^.!?…]+[.!?…]*/g) || [text]).map(function (x) { return x.trim(); }).filter(Boolean);
            C._utt2 = [];
            parts.forEach(function (part, i) {
              var u = new SpeechSynthesisUtterance(part);
              u.lang = vc ? vc.lang : 'fr-FR'; if (vc) u.voice = vc;
              u.rate = p.rate; u.pitch = p.pitch; u.volume = p.vol;
              if (i === parts.length - 1) { u.onend = done; u.onerror = done; }
              C._utt2.push(u); speechSynthesis.speak(u);
            });
            tm = setTimeout(done, ms + 3000); return;
          }
        } catch (e) { }
        try { C._babble(text); } catch (e) { }
        tm = setTimeout(done, ms);
      }
      try { gotFile = !!(C.playVoiceFile && C.playVoiceFile(keyText, done, browser)); } catch (e) { }
      if (gotFile) tm = setTimeout(done, ms + 5000); else browser();
    });
  };
  C.speak.cancel = function () { tok++; if (cancelCur) { try { cancelCur(); } catch (e) { } } try { if (window.speechSynthesis) speechSynthesis.cancel(); if (C.stopVoiceFile) C.stopVoiceFile(); C.music && C.music.duck(false); } catch (e) { } };
  C.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ---------- phrases (plusieurs variantes pour ne jamais se répéter) ---------- */
  var N = C.NAME;
  var LINES = {
    aliya: {
      praise: ['Bravo ma ' + N + ' ! Viens faire un gros câlin !', 'Oh ma ' + N + ', c’est magnifique ! Viens, un gros câlin !', 'Trop bien, ma petite ' + N + ' ! On se fait un câlin ?', 'Cééélia ! Viens nous faire un gros câlin !'],
      hug: ['Mmmh… un gros câlin !', 'Je t’aime fort, ma ' + N + ' !', 'Oh, tu es toute douce !']
    },
    tania: {
      praise: ['Wouaaah, t’as vu comme c’est joli ? Je suis trop fière de toi !', 'Oh là là, quel beau travail ! Je suis trop fière de toi !', 'Waouh ' + N + ', c’est super joli ! Bravo !', 'Oh, ma petite ' + N + ' ! Viens, je veux un câlin !'],
      hug: ['Câlin ! Je t’adore, ' + N + ' !', 'Hihi ! Tu es la meilleure !', 'Mouaaah ! Un gros bisou !']
    },
    both: {
      praise: [[N + 'aaaa !', 'Câlin collectif !'], ['Hop là, ' + N + ' !', 'Câlin collectif !'], ['Oh, la voilà !', 'Viens, ' + N + ' ! Câlin collectif !']],
      hug: [['Câlin collectif !', 'On t’aime fort !'], ['Hihihi ! Câlin collectif !', 'Mouaaah !']]
    },
    kiss: ['Hé ' + N + ' ! Et si tu allais faire un gros bisou à ta maman ?', 'Va faire un bisou à ta maman si tu en as envie !'],
    meal: ['N’oublie pas de bien manger pour avoir plein de force et des vitamines !', 'Miam miam ! Les fruits et les légumes, ça donne plein de bonnes choses à ton corps !', 'On mange tant qu’on a faim, et on s’arrête quand on n’a plus faim. C’est bien comme ça !'],
    tidy: ['Tu sais quoi, ' + N + ' ? On peut aussi ranger tes vrais jouets avec maman !'],
    night: ['Bonne nuit, petite princesse ! Fais de beaux rêves !'],
    /* selon ce qu'elle vient de faire */
    byKind: {
      tidy: { aliya: ['Bravo ' + N + ' ! Ta chambre est trop jolie ! Viens nous faire un gros câlin !', 'Oh, ta chambre est toute rangée ! Bravo ma ' + N + ' ! Un gros câlin ?'], tania: ['Waouh, ta chambre est trop jolie ! Bravo ' + N + ' ! Viens, un câlin !', 'Quel beau rangement, ma petite ' + N + ' ! Je suis fière de toi ! Viens !'], both: [['Bravo ' + N + ' ! Ta chambre est trop jolie !', 'Viens nous faire un gros câlin !']] },
      cook: { aliya: ['Hmm, ça sent trop bon ! Bravo pour le gâteau, ma ' + N + ' ! Un câlin ?'], tania: ['Oh, quel joli gâteau ! Bravo ' + N + ' ! Viens, un câlin !'], both: [['Miam, quel beau gâteau !', 'Bravo ' + N + ' ! Câlin collectif !']] },
      draw: { aliya: ['Oh, quel joli dessin, ma ' + N + ' ! Viens faire un gros câlin !'], tania: ['Wouaaah, t’as vu comme c’est joli ? Viens, un gros câlin !'], both: [['Quel beau dessin, ' + N + ' !', 'Câlin collectif !']] }
    },
    /* après le câlin : une idée pour la vraie vie (sans obligation) */
    real: { aliya: ['Et si tu venais nous faire un vrai câlin maintenant ?', 'Tu veux venir nous faire un vrai câlin ?'], tania: ['Et si tu venais nous faire un vrai câlin maintenant ?', 'Viens vite nous retrouver pour un vrai câlin, si tu veux !'] },
    /* quand elle revient dans son château */
    home: { aliya: ['Cééélia ! Viens nous faire un gros câlin !', 'Coucou ma ' + N + ' ! Tu viens nous faire un câlin ?'], tania: ['Oh, ma petite ' + N + ' ! Viens, je veux un câlin !', 'Coucou ' + N + ' ! Un petit câlin ?'], both: [[N + 'aaaa !', 'Câlin collectif !'], ['Coucou ' + N + ' !', 'Viens, un câlin collectif !']] }
  };
  C.LINES = LINES;
  function pick(a, key) { var h = (C.cast._last = C.cast._last || {}), i, n = 0; do { i = Math.floor(Math.random() * a.length); n++; } while (a.length > 1 && h[key] === i && n < 6); h[key] = i; return a[i]; }

  /* ---------- petits utilitaires d'animation ---------- */
  function mount(host, who) {
    var d = C.el('<div class="sis ' + who + '">' + Art.sister(who) + '</div>'), svg = d.querySelector('svg.girl');
    if (svg) Art.dress.setMood(svg, 'smile');
    host.appendChild(d); return { el: d, svg: svg };
  }
  function mouthOf(c) { return function (open) { if (c.svg) Art.dress.setMood(c.svg, open ? 'open' : 'smile'); }; }
  function hearts(x, y, n) { try { C.fx.burst(x, y, { n: n || 10, shapes: ['heart'], dist: 110, up: 50 }); } catch (e) { } }
  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  /* ---------- apparitions ---------- */
  var st = C.store.get('cast', { n: 0, hist: [] });
  function saveSt() { C.store.set('cast', st); }
  /* choix : jamais à chaque fois (au moins 2 activités entre deux apparitions, 4 au maximum), jamais deux fois la même d'affilée */
  function chooseMoment(kind) {
    st.n = (st.n || 0) + 1;
    var forced = C.cast.next; if (forced) { C.cast.next = null; st.n = 0; st.lastAt = Date.now(); saveSt(); return forced; }
    var p = st.n >= 4 ? 1 : st.n >= 2 ? 0.55 : 0;
    if (Math.random() >= p) { saveSt(); return null; }
    var pool = ['hug-aliya', 'hug-tania', 'hug-both', 'kiss'];
    if (kind === 'cook') pool.push('meal', 'meal'); if (kind === 'tidy') pool = ['hug-aliya', 'hug-tania', 'hug-both'];   /* la phrase « ranger tes vrais jouets » est déjà dite dans le jeu de rangement */
    var recent = (st.hist || []).slice(-2); pool = pool.filter(function (x) { return recent.indexOf(x) < 0; });
    var m = pool[Math.floor(Math.random() * pool.length)] || 'kiss';
    st.hist = (st.hist || []).concat(m).slice(-6); st.n = 0; st.lastAt = Date.now(); saveSt(); return m;
  }

  var C0 = C.cast = { next: null, choose: chooseMoment, LINES: LINES };

  /* rangée de personnages insérée dans l'écran de fin d'activité */
  C0.attach = function (modal, kind) {
    var m = chooseMoment(kind); if (!m) return null;
    return C0.play(modal, m, kind);
  };
  /* choix de la phrase : parfois propre à l'activité qu'elle vient de finir (rangement, gâteau, dessin), sinon générale */
  function praiseFor(who, kind) {
    var k = LINES.byKind[kind];
    if (k && k[who] && Math.random() < 0.7) return who === 'both' ? pick(k.both, 'k-both-' + kind) : [pick(k[who], 'k-' + who + kind)];
    return who === 'both' ? pick(LINES.both.praise, 'bothp') : [pick(LINES[who].praise, who + 'p')];
  }
  C0.play = function (modal, m, kind) {
    var card = modal.querySelector('.card') || modal, anchor = card.querySelector('.endcards') || card.lastElementChild;
    var row = C.el('<div class="castrow ' + m + '"></div>');
    anchor.parentNode.insertBefore(row, anchor); card.classList.add('withcast');
    return C0.populate(row, m, kind);
  };
  C0.populate = function (row, m, kind, opts) {
    opts = opts || {};
    var alive = true; row._stop = function () { alive = false; };
    var shut = false; function guard(fn) { return function () { if (alive && row.isConnected) return fn.apply(this, arguments); }; }
    var myTok = tok;

    if (m.indexOf('hug-') === 0) {
      var who = m.slice(4), cel = { el: C.el('<div class="sis celia"></div>') };   /* Celia (sa poupée) */
      row.appendChild(cel.el); var cs = Art.dress.mount(cel.el, C.profile);
      var sisters = who === 'both' ? ['aliya', 'tania'] : [who], parts = sisters.map(function (w) { return mount(row, w); });
      if (who === 'both') row.insertBefore(parts[0].el, cel.el);   /* [Aliya] [Celia] [Tania] */
      parts.forEach(function (c) { c.el.classList.add('in'); Art.dress.setMood(c.svg, 'happy'); });
      var lines = opts.home ? (who === 'both' ? pick(LINES.home.both, 'homeb') : [pick(LINES.home[who], 'home' + who)]) : praiseFor(who, kind);
      C.sfx.chime();
      var hugged = false;
      function hug() {
        if (hugged || !alive) return; hugged = true; if (row._h) { try { row._h.stop(); } catch (e) { } }
        row.classList.add('hugging'); C.sfx.giggle(); setTimeout(function () { C.sfx.sparkle(); }, 250); setTimeout(function () { try { C.sfx.chime(); } catch (e) { } }, 500);   /* petits cœurs + son doux */
        var c = center(row); hearts(c.x, c.y, 14); setTimeout(function () { hearts(c.x, c.y - 10, 10); }, 450);
        Art.dress.setMood(cs, 'happy'); parts.forEach(function (p) { Art.dress.setMood(p.svg, 'happy'); });
        var hl = who === 'both' ? pick(LINES.both.hug, 'bothh') : [pick(LINES[who].hug, who + 'h')];
        (async function () {
          for (var i = 0; i < hl.length && alive; i++) await C.speak(sisters[i] || sisters[0], hl[i], { mouth: mouthOf(parts[Math.min(i, parts.length - 1)]) });
          /* de temps en temps : une invitation pour la vraie vie (sans obligation) */
          if (alive && Math.random() < 0.4) { var rw = sisters[Math.floor(Math.random() * sisters.length)]; await C.sleep(400); if (alive) { var pi = sisters.indexOf(rw); await C.speak(rw, pick(LINES.real[rw], 'real' + rw), { mouth: mouthOf(parts[pi])  }); } }
          if (alive && opts.onDone) opts.onDone();
        })();
        setTimeout(function () { row.classList.remove('hugging'); row.classList.add('after'); }, 2600);
      }
      [cel.el].concat(parts.map(function (p) { return p.el; })).forEach(function (e) { e.addEventListener('click', hug); e.setAttribute('role', 'button'); });
      row._hug = hug; C.cast.lastRow = row;
      setTimeout(guard(async function () {
        for (var i = 0; i < lines.length && alive; i++) await C.speak(sisters[i] || sisters[0], lines[i], { mouth: mouthOf(parts[Math.min(i, parts.length - 1)]) });
        if (alive) parts.forEach(function (p) { p.el.classList.add('open'); });
      }), 900);
      /* les bras s'ouvrent pour inviter au câlin */
      setTimeout(guard(function () { parts.forEach(function (p) { p.el.classList.add('open'); }); if (!hugged && C.hint) { try { var hnd = C.hint(parts[0].el, 0, 20); setTimeout(function () { hnd.stop(); }, 3500); row._h = hnd; } catch (e) { } } }), 2200);
      return row;
    }

    /* bisou pour maman / phrases du quotidien : Lumi parle et envoie un petit cœur */
    var lumi = C.el('<div class="lumik">' + Art.lumi() + '</div>'); row.appendChild(lumi);
    var svg = lumi.querySelector('svg.lumi'), text;
    if (m === 'kiss') text = pick(LINES.kiss, 'kiss'); else if (m === 'meal') text = pick(LINES.meal, 'meal'); else text = pick(LINES.tidy, 'tidy');
    setTimeout(guard(async function () {
      lumi.classList.add('pop');
      await C.speak('narr', text, { mouth: function (o) { Art.lumiMood(svg, o ? 'open' : 'smile'); } });
      if (!alive) return;
      if (m === 'kiss') {
        Art.lumiMood(svg, 'o'); lumi.classList.add('blow'); C.sfx.sparkle(); var r = lumi.getBoundingClientRect();
        var h = C.el('<i class="kissheart">' + Art.svg('0 0 24 24', '<path d="' + Art.P.heart + '" fill="#ff4d8d" ' + Art.ST(1.600) + '/>') + '</i>'); row.appendChild(h);
        setTimeout(function () { hearts(r.left + r.width / 2, r.top, 8); C.sfx.giggle(); }, 700);
        setTimeout(function () { Art.lumiMood(svg, 'smile'); }, 1400);
      }
    }), 800);
    return row;
  };
  /* ---------- visite surprise quand elle revient dans son château ---------- */
  C0.homeVisit = function (home, force) {
    try {
      if (C0.noHome && !force) return null;   /* réglage de test */
      var first = !st.homeSeen; st.homeSeen = true;
      st.homeN = (st.homeN || 0) + 1;
      var left = C.session && C.session.remaining ? C.session.remaining() : 1e9;
      var recent = Date.now() - (st.lastAt || 0) < 3 * 60 * 1000;
      var go = force || (!first && st.homeN >= 3 && !recent && left > 120000 && Math.random() < 0.4);
      saveSt(); if (!go) return null;
      var tiles = C.$('.tiles', home), hero = C.$('.hero', home);
      if (!tiles) return null;
      var hr = home.getBoundingClientRect(), tr = tiles.getBoundingClientRect(), top = Math.max(hr.top + 70, hero ? hero.getBoundingClientRect().top + 8 : hr.top + 90), h = tr.top - top - 2;
      if (h < 105) return null;   /* écran trop petit (paysage…) : on ne gêne pas les boutons */
      var m = C.rnd(['hug-aliya', 'hug-tania', 'hug-both']); if (typeof force === 'string') m = force;
      st.homeN = 0; st.lastAt = Date.now(); saveSt();
      var row = C.el('<div class="castrow homerow ' + m + '" style="top:' + (top - hr.top) + 'px;height:' + Math.min(150, h) + 'px"></div>'); home.appendChild(row);
      var av = C.$('.celia-av', home); if (av) av.style.visibility = 'hidden';
      var leave = function () { if (!row.isConnected) return; row._stop && row._stop(); row.classList.add('leaving'); if (av) av.style.visibility = ''; setTimeout(function () { row.remove(); }, 900); };
      C0.populate(row, m, 'home', { home: true, onDone: function () { setTimeout(leave, 2500); } });
      row._leaveT = setTimeout(leave, 16000);   /* facultatif : si Celia ne les touche pas, elles repartent gentiment */
      home._visitStop = function () { clearTimeout(row._leaveT); row._stop && row._stop(); if (av) av.style.visibility = ''; };
      return row;
    } catch (e) { console.error(e); return null; }
  };
  C0.stop = function () { if (C0.lastRow && C0.lastRow._stop) C0.lastRow._stop(); };

  /* phrase isolée du quotidien (ex. à la fin du rangement) */
  C0.say = function (key) { var a = LINES[key]; if (!a) return Promise.resolve(); return C.speak('narr', pick(a, key)); };
})();
