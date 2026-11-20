/* Le dressing de princesse : une poupée personnalisable, des dizaines de combinaisons. */
(function () {
  'use strict';
  var G = Art.dress;
  var CATS = [
    { id: 'me', icon: function () { return G.preview('hair', 'long', { hairColor: 0 }); } },
    { id: 'hair', icon: function () { return G.preview('hair', 'pigtails', { hairColor: 4 }); } },
    { id: 'dress', icon: function () { return G.preview('dress', 'd1'); } },
    { id: 'skirt', icon: function () { return G.preview('skirt', 'k2'); } },
    { id: 'pj', icon: function () { return G.preview('pj', 'p1'); } },
    { id: 'shoes', icon: function () { return G.preview('shoes', 's3'); } },
    { id: 'crown', icon: function () { return G.preview('crown', 'c1'); } },
    { id: 'jewel', icon: function () { return G.preview('jewel', 'j2'); } },
    { id: 'bag', icon: function () { return G.preview('bag', 'b1'); } },
    { id: 'wings', icon: function () { return G.preview('wings', 'w1'); } },
    { id: 'wand', icon: function () { return G.preview('wand', 'm1'); } }
  ];
  var SLOT = { dress: 'outfit', skirt: 'outfit', pj: 'outfit', shoes: 'shoes', crown: 'crown', jewel: 'jewel', bag: 'bag', wings: 'wings', wand: 'wand' };
  var NONE = Art.svg('0 0 48 48', '<circle cx="24" cy="24" r="16" fill="none" stroke="#c4a8ff" stroke-width="5"/><path d="M13 35L35 13" stroke="#c4a8ff" stroke-width="5" stroke-linecap="round"/>');
  var BG = '<defs><radialGradient id="dbgg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#fff6fb"/><stop offset="1" stop-color="#ffd0e8"/></radialGradient></defs><rect width="390" height="700" fill="url(#dbgg)"/>' +
    '<path d="M0 0h70Q40 200 70 420 40 460 0 470z" fill="#ff9ac8" stroke="#6b3f72" stroke-width="4"/><path d="M390 0h-70Q350 200 320 420 350 460 390 470z" fill="#ff9ac8" stroke="#6b3f72" stroke-width="4"/>' +
    '<path d="M20 0Q10 200 30 440M44 0Q30 200 50 430" stroke="#fff" stroke-width="5" fill="none" opacity=".5"/><path d="M370 0Q380 200 360 440M346 0Q360 200 340 430" stroke="#fff" stroke-width="5" fill="none" opacity=".5"/>' +
    '<path d="M0 8h390" stroke="#ffd84d" stroke-width="12"/>' +
    '<ellipse cx="195" cy="560" rx="150" ry="34" fill="#c4a8ff" opacity=".55"/><ellipse cx="195" cy="560" rx="110" ry="22" fill="#e5d6ff" opacity=".8"/>' +
    '<g fill="#ffd84d">' + [40, 110, 200, 290, 350].map(function (x, i) { return '<path d="' + Art.P.star + '" transform="translate(' + x + ' ' + (60 + (i % 2) * 40) + ') scale(.9)" opacity=".8"/>'; }).join('') + '</g>';

  C.register('dress', {
    enter: function (el) {
      var cfg = C.profile, cat = 'me', turn = 0, dancing = false, danceT = null, moodT = null;
      el.innerHTML = '<div class="dbg">' + Art.svg('0 0 390 700', BG, null, ' preserveAspectRatio="xMidYMid slice"') + '</div><div class="act dress"><div class="stage"><div class="doll"><div class="dollwrap"></div></div>' +
        '<div class="actbar">' +
        '<button class="btn yellow" data-do="dice" aria-label="surprise">' + Art.ui.dice + '</button>' +
        '<button class="btn purple" data-do="dance" aria-label="danser">' + Art.ui.music + '</button>' +
        '<button class="btn blue" data-do="turn" aria-label="tourner">' + Art.ui.spin + '</button></div></div>' +
        '<div class="tray"><div class="tabs"></div><div class="items scrollable"></div></div></div><div class="flash"></div>';
      var wrap = C.$('.dollwrap', el), tabs = C.$('.tabs', el), items = C.$('.items', el), doll = C.$('.doll', el);
      cfg.hairStyle = G.fixStyle(cfg.hairStyle);
      var svg = null;
      function draw() { svg = G.mount(wrap, cfg); return svg; }
      draw();

      function react(kind) {
        var r = wrap.getBoundingClientRect();
        C.fx.burst(r.left + r.width / 2, r.top + r.height * 0.45, { n: 14, dist: 130, up: 30 });
        wrap.classList.remove('hop'); void wrap.offsetWidth; wrap.classList.add('hop');
        G.setMood(svg, 'open'); clearTimeout(moodT); moodT = setTimeout(function () { G.setMood(svg, dancing ? 'happy' : 'smile'); }, 1300);
      }
      function apply(slot, id, quiet) {
        cfg[slot] = id; C.saveProfile(); draw(); touched();
        if (!quiet) { react(); C.sfx.sparkle(); C.sfx.boing(); }
      }
      function fillItems() {
        items.innerHTML = '';
        var add = function (html, cls, fn, on) { var b = C.el('<button class="it ' + (cls || '') + (on ? ' on' : '') + '">' + html + '</button>'); b.onclick = function () { C.select(items, '.it', b); C.sfx.pop(); fn(b); }; items.appendChild(b); return b; };
        if (cat === 'me') {
          G.skins.forEach(function (c, i) { var b = add('', 'round', function () { cfg.skin = i; C.saveProfile(); draw(); react(); C.sfx.sparkle(); }, cfg.skin === i); b.style.setProperty('--c', c); });
          items.appendChild(C.el('<span class="gap"></span>'));
          G.eyeColors.forEach(function (c, i) { var b = add('', 'round', function () { cfg.eyes = i; C.saveProfile(); draw(); react(); C.sfx.sparkle(); }, (cfg.eyes || 0) === i); b.style.setProperty('--c', c); });
          items.appendChild(C.el('<span class="gap"></span>'));
          G.hairColors.forEach(function (h, i) { var b = add('', 'round', function () { cfg.hairColor = i; C.saveProfile(); draw(); react(); C.sfx.sparkle(); }, cfg.hairColor === i); b.style.setProperty('--c', h.c); });
        } else if (cat === 'hair') {
          G.hairStyles.forEach(function (s) { add(G.preview('hair', s, cfg), '', function () { cfg.hairStyle = s; C.saveProfile(); draw(); react(); C.sfx.sparkle(); }, cfg.hairStyle === s); });
        } else {
          var slot = SLOT[cat];
          if (slot !== 'outfit' && slot !== 'shoes') add(NONE, 'none', function () { cfg[slot] = null; C.saveProfile(); draw(); C.sfx.whoosh(); }, !cfg[slot]);
          G.cats[cat].forEach(function (o) { add(G.preview(cat, o.id, cfg), '', function () { apply(slot, o.id); }, cfg[slot] === o.id); });
        }
        items.scrollLeft = 0;
      }
      CATS.forEach(function (c) {
        var b = C.el('<button class="tab' + (c.id === cat ? ' on' : '') + '" data-c="' + c.id + '" aria-label="' + c.id + '">' + c.icon() + '</button>');
        b.onclick = function () { cat = c.id; C.select(tabs, '.tab', b); C.sfx.pop(); fillItems(); };
        tabs.appendChild(b);
      });
      fillItems();

      /* toucher la poupée : elle sourit et réagit */
      wrap.addEventListener('click', function (e) {
        C.sfx.giggle(); G.setMood(svg, 'happy'); clearTimeout(moodT); moodT = setTimeout(function () { G.setMood(svg, 'smile'); }, 1400);
        wrap.classList.remove('hop'); void wrap.offsetWidth; wrap.classList.add('hop');
        for (var i = 0; i < 3; i++) setTimeout(function () { C.fx.rise(e.clientX + (Math.random() * 60 - 30), e.clientY - 20, 'heart', C.rnd(['#ff6fa5', '#ff9ac8', '#c4a8ff'])); }, i * 140);
        C.sayRnd(['Hihi !', 'Je suis belle !', 'Quelle jolie tenue !']);
      });

      C.$('[data-do=turn]', el).onclick = function () {
        turn = turn === 0 ? 1 : turn === 1 ? -1 : 0; C.sfx.whoosh();
        wrap.style.transform = 'perspective(700px) rotateY(' + (turn * 28) + 'deg)';
      };
      function stopDance() { dancing = false; clearInterval(danceT); wrap.classList.remove('dancing'); G.setMood(svg, 'smile'); }
      C.$('[data-do=dance]', el).onclick = function () {
        if (dancing) { stopDance(); return; }
        dancing = true; wrap.classList.add('dancing'); G.setMood(svg, 'happy'); C.say('On danse !');
        var n = 0, melody = [0, 2, 4, 2, 5, 4, 2, 0];
        danceT = setInterval(function () {
          C.sfx.tap(melody[n % melody.length]); if (n % 2 === 0) C.sfx.drum();
          var r = wrap.getBoundingClientRect(); if (n % 2 === 0) C.fx.burst(r.left + r.width * (0.2 + Math.random() * 0.6), r.top + r.height * 0.5, { n: 3, dist: 80, up: 40 });
          n++; if (n > 28) stopDance();
        }, 300);
      };
      C.$('[data-do=dice]', el).onclick = function () {
        var out = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'k1', 'k2', 'k3', 'k4', 'p1', 'p2', 'p3', 'p4'];
        var n = 0; C.sfx.magic();
        var iv = setInterval(function () {
          n++;
          cfg.outfit = C.rnd(out); cfg.shoes = C.rnd(['s0', 's1', 's2', 's3', 's4', 's5', 's6']);
          cfg.crown = Math.random() < 0.8 ? C.rnd(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) : null;
          cfg.jewel = Math.random() < 0.6 ? C.rnd(['j1', 'j2', 'j3', 'j4', 'j5']) : null;
          cfg.bag = Math.random() < 0.5 ? C.rnd(['b1', 'b2', 'b3', 'b4']) : null;
          cfg.wings = Math.random() < 0.5 ? C.rnd(['w1', 'w2', 'w3', 'w4']) : null;
          cfg.wand = Math.random() < 0.5 ? C.rnd(['m1', 'm2', 'm3', 'm4']) : null;
          cfg.hairStyle = C.rnd(G.hairStyles);
          draw(); C.sfx.tap(n);
          if (n >= 6) { clearInterval(iv); C.saveProfile(); G.setMood(svg, 'open'); C.sfx.yay(); react(); C.say('Une tenue surprise !'); fillItems(); setTimeout(function () { G.setMood(svg, 'smile'); }, 1500); }
        }, 160);
      };
      var finishDress = function () {
        var fl = C.$('.flash', el); C.sfx.shutter(); fl.classList.add('go'); setTimeout(function () { fl.classList.remove('go'); }, 700);
        stopDance();
        var clone = svg.cloneNode(true);
        Array.prototype.forEach.call(clone.querySelectorAll('[style*="display: none"]'), function (n) { n.setAttribute('display', 'none'); });
        var W = 480, H = 780;
        C.rasterSvg(clone, W, H, function (cx, w, h) {
          var g = cx.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.45, h * 0.8); g.addColorStop(0, '#fff6fb'); g.addColorStop(1, '#ffc7e2'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
          cx.fillStyle = '#ffd84d'; for (var i = 0; i < 14; i++) { var x = (i * 137) % w, y = (i * 211) % h; cx.beginPath(); cx.arc(x, y, 5, 0, 7); cx.fill(); }
        }).then(function (url) {
          return C.saveCreation('outfit', url).then(function () { C.finish({ kind: 'outfit', tile: 'dress', img: url, say: 'Bravo ' + C.NAME + ' ! Quelle belle princesse !' }); });
        }).catch(function () { C.say('Oups !'); });
      };
      var doneB = C.doneBar(C.$('.tray', el), 'Ma princesse est prête !', finishDress);
      var touched = C.armDoneHint('dress', doneB);
      C.say('Habille la princesse !');
    },
    leave: function () { }
  });
})();
