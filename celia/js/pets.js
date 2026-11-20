/* Le jardin des petites créatures : nourrir, caresser, laver, jouer, accessoiriser, nommer, et faire éclore des œufs magiques.
   Les animaux ne tombent jamais malades et n'ont aucun besoin à satisfaire : on les retrouve toujours joyeux. */
(function () {
  'use strict';
  var P = Art.pets;
  var FOODS = ['carrot', 'fish', 'cookie', 'apple'];
  /* [groupe nominal, « il / elle est trop mignon(ne) »] : accords vérifiés par _celia/tests/french.cjs */
  var GREET = { chat: ['ce petit chaton', 'Il est trop mignon'], lapin: ['ce petit lapin', 'Il est trop mignon'], chiot: ['ce petit chiot', 'Il est trop mignon'], panda: ['ce petit panda', 'Il est trop mignon'], licorne: ['cette petite licorne', 'Elle est trop mignonne'], dragon: ['ce petit dragon', 'Il est trop mignon'], fluff: ['cette petite boule de poils', 'Elle est trop mignonne'] };

  function load() {
    var s = C.store.get('pets', null);
    if (!s || !s.friends || !s.friends.length) {
      s = { friends: P.starters.map(function (t, i) { return { id: 'f' + i, type: t, v: 0, name: P.defaultName[t], acc: null }; }), cur: 'f0', n: 4 };
    }
    return s;
  }
  var save = function (s) { C.store.set('pets', s); };

  function gardenBg() {
    var s = '<defs>' + Art.sky('gsky', '#a8defa', '#e8fbff') + '<linearGradient id="ggr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9f5d5"/><stop offset="1" stop-color="#7fdba5"/></linearGradient></defs>' +
      '<rect width="390" height="700" fill="url(#gsky)"/>' + Art.cloudShape(30, 70, 1.2, .95) + Art.cloudShape(250, 110, 0.9, .9) +
      '<circle cx="330" cy="60" r="30" fill="#fff6b0"/><path d="M0 250Q100 190 200 235T390 215V700H0z" fill="#d2f7de"/><path d="M0 290Q120 250 230 285T390 270V700H0z" fill="url(#ggr)"/>' +
      Art.tree(60, 240, 1.1, '#8de8b5') + Art.tree(340, 250, 0.9, '#9ff0c6') +
      '<ellipse cx="290" cy="520" rx="80" ry="26" fill="#8fd3ff" stroke="#6b3f72" stroke-width="3"/><ellipse cx="290" cy="518" rx="62" ry="16" fill="#bfe6ff"/><ellipse cx="270" cy="522" rx="14" ry="6" fill="#8de8b5"/><ellipse cx="316" cy="514" rx="12" ry="5" fill="#8de8b5"/>' +
      '<g stroke="#6b3f72" stroke-width="3" fill="#fff">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<rect x="' + (i * 52 - 10) + '" y="300" width="32" height="56" rx="12"/>'; }).join('') + '<rect x="-10" y="318" width="420" height="10" rx="5" fill="#ffe3f1"/><rect x="-10" y="338" width="420" height="10" rx="5" fill="#ffe3f1"/></g>';
    var cols = ['#ff8fb8', '#fff', '#ffd84d', '#c4a8ff', '#ffb98a'];
    for (var i = 0; i < 22; i++) s += Art.flowerSmall((i * 83) % 380 + 6, 380 + ((i * 47) % 300), cols[i % 5], 0.9 + (i % 3) * 0.2);
    return Art.svg('0 0 390 700', s, null, ' preserveAspectRatio="xMidYMax slice"');
  }

  C.register('pets', {
    enter: function (el) {
      var S = load(), timers = [], live = true, mode = null, wander = null, foamN = 0;
      el._stop = function () { live = false; timers.forEach(clearTimeout); clearInterval(wander); };
      function later(fn, ms) { var t = setTimeout(function () { if (live) fn(); }, ms); timers.push(t); return t; }
      el.innerHTML = '<div class="gbg">' + gardenBg() + '</div><div class="act garden"><div class="stage">' +
        '<div class="petw"><div class="petmove"><div class="petin"></div><div class="nametag"></div><div class="foam"></div></div></div><div class="props"></div>' +
        '<div class="actbar">' +
        '<button class="btn pink" data-a="feed" aria-label="manger">' + Art.svg('0 0 64 64', Art.items.apple) + '</button>' +
        '<button class="btn red" data-a="love" aria-label="caresser">' + Art.svg('0 0 64 64', Art.items.heart) + '</button>' +
        '<button class="btn blue" data-a="wash" aria-label="laver">' + Art.ui.soap + '</button>' +
        '<button class="btn orange" data-a="play" aria-label="jouer">' + Art.svg('0 0 64 64', Art.items.ball) + '</button>' +
        '<button class="btn purple" data-a="acc" aria-label="accessoire">' + Art.svg('0 0 64 64', '<g transform="translate(6 4) scale(.8)">' + Art.items.crown + '</g>') + '</button>' +
        '<button class="btn yellow small" data-a="name" aria-label="prénom (maintenir)">' + Art.ui.pencil + '</button></div></div>' +
        '<div class="tray"><div class="items scrollable"></div></div></div>';
      var petin = C.$('.petin', el), petmove = C.$('.petmove', el), petw = C.$('.petw', el), tag = C.$('.nametag', el), foam = C.$('.foam', el), items = C.$('.items', el), props = C.$('.props', el), stage = C.$('.stage', el);
      var svg = null;
      function cur() { return S.friends.filter(function (f) { return f.id === S.cur; })[0] || S.friends[0]; }
      function draw() {
        var f = cur(); petin.innerHTML = P.render(f.type, f.v, { acc: f.acc }); svg = C.$('svg', petin); P.setMood(svg, 'smile');
        tag.textContent = f.name;
      }
      function mood(m, ms) { P.setMood(svg, m); if (ms) later(function () { P.setMood(svg, 'smile'); }, ms); }
      function hop() { petin.classList.remove('hop'); void petin.offsetWidth; petin.classList.add('hop'); }
      function centerXY() { var r = petin.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.45, r: r }; }
      function hearts(n) { var c = centerXY(); for (var i = 0; i < n; i++) later(function () { C.fx.rise(c.x + (Math.random() * 120 - 60), c.y - 30 + Math.random() * 30, 'heart', C.rnd(['#ff6fa5', '#ff9ac8', '#ffb3d1'])); }, i * 130); }

      function renderTray() {
        items.innerHTML = '';
        if (mode === 'acc') {
          var none = C.el('<button class="it none"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="none" stroke="#c4a8ff" stroke-width="5"/><path d="M13 35L35 13" stroke="#c4a8ff" stroke-width="5" stroke-linecap="round"/></svg></button>');
          none.onclick = function () { cur().acc = null; save(S); draw(); C.sfx.whoosh(); }; items.appendChild(none);
          P.accIds.forEach(function (a) {
            var f = cur(), b = C.el('<button class="it' + (f.acc === a ? ' on' : '') + '">' + P.render(f.type, f.v, { acc: a }) + '</button>');
            b.onclick = function () { cur().acc = a; save(S); draw(); C.select(items, '.it', b); C.sfx.sparkle(); C.sfx.boing(); hop(); mood('happy', 1200); hearts(3); var c = centerXY(); C.fx.burst(c.x, c.y - 60, { n: 12 }); };
            items.appendChild(b);
          });
          return;
        }
        S.friends.forEach(function (f) {
          var b = C.el('<button class="it' + (f.id === S.cur ? ' on' : '') + '" aria-label="ami">' + P.render(f.type, f.v, { acc: f.acc }) + '</button>');
          b.onclick = function () { if (f.id === S.cur) { petTap(); return; } S.cur = f.id; save(S); stopMode(); draw(); C.select(items, '.it', b); C.sfx.pop(); greet(); };
          items.appendChild(b);
        });
        var egg = C.el('<button class="it egg" aria-label="œuf magique">' + Art.svg('0 0 64 64', Art.items.egg + '<g transform="translate(34 2) scale(.55)"><path d="' + Art.P.star + '" fill="#ffd84d" stroke="#6b3f72" stroke-width="3"/></g>') + '</button>');
        egg.onclick = function () { C.sfx.magic(); eggScene(); };
        items.appendChild(egg);
      }

      function greet() {
        var f = cur(); hop(); mood('happy', 1500); C.sfx.animal(f.type); hearts(4);
        var g = GREET[f.type]; C.say(g ? 'Ooooh, regarde ' + g[0] + ' ! ' + g[1] + ' !' : 'Coucou, ' + f.name + ' !');
      }
      function petTap() { hop(); mood('open', 700); C.sfx.animal(cur().type); hearts(2); }

      /* caresses : on glisse le doigt sur la créature */
      var down = null, strokeD = 0;
      petw.addEventListener('pointerdown', function (e) {
        if (mode === 'wash') { down = e.pointerId; try { petw.setPointerCapture(down); } catch (x) { } addFoam(e); return; }
        down = e.pointerId; strokeD = 0; try { petw.setPointerCapture(down); } catch (x) { }
        petTapDown = { x: e.clientX, y: e.clientY };
      });
      var petTapDown = null, lastH = 0;
      petw.addEventListener('pointermove', function (e) {
        if (down !== e.pointerId) return;
        if (mode === 'wash') { addFoam(e); return; }
        strokeD += Math.hypot(e.movementX || 0, e.movementY || 0);
        if (petTapDown && Math.hypot(e.clientX - petTapDown.x, e.clientY - petTapDown.y) > 16) {
          mood('happy'); petin.classList.add('purr');
          if (Date.now() - lastH > 380) { lastH = Date.now(); C.fx.rise(e.clientX, e.clientY - 20, 'heart', '#ff6fa5'); C.sfx.purr(); }
        }
      });
      function endP(e) {
        if (down !== e.pointerId) return; down = null;
        if (mode !== 'wash') {
          petin.classList.remove('purr');
          if (petTapDown && Math.hypot(e.clientX - petTapDown.x, e.clientY - petTapDown.y) <= 16) petTap(); else mood('smile');
        }
        petTapDown = null;
      }
      ['pointerup', 'pointercancel'].forEach(function (ev) { petw.addEventListener(ev, endP); });

      function stopMode() {
        mode = null; props.innerHTML = ''; foam.innerHTML = ''; foamN = 0; C.$$('.actbar .btn', el).forEach(function (b) { b.classList.remove('on'); });
        renderTray();
      }
      function setMode(m, btn) { stopMode(); mode = m; if (btn) btn.classList.add('on'); }

      /* manger */
      function feed(btn) {
        setMode('feed', btn);
        props.innerHTML = '<div class="foods">' + FOODS.map(function (f) { return '<button class="food" data-f="' + f + '">' + Art.item(f) + '</button>'; }).join('') + '</div>';
        C.say('Il a faim ! Donne-lui à manger !');
        C.$$('.food', props).forEach(function (b) {
          b.onclick = function () {
            if (b.classList.contains('gone')) return; b.classList.add('gone'); C.sfx.whoosh();
            var c = centerXY();
            var r = b.getBoundingClientRect(), fx = C.$('#fx');
            var d = document.createElement('div'); d.className = 'flyer'; d.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px'; d.innerHTML = Art.item(b.dataset.f); fx.appendChild(d);
            var an = d.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + (c.x - r.left - r.width / 2) * 0.5 + 'px,' + ((c.y + 20 - r.top - r.height / 2) * 0.5 - 60) + 'px) scale(1.1)', offset: .5 }, { transform: 'translate(' + (c.x - r.left - r.width / 2) + 'px,' + (c.y + 30 - r.top - r.height / 2) + 'px) scale(.5)' }], { duration: 600, easing: 'ease-in', fill: 'forwards' });
            an.onfinish = function () {
              d.remove(); mood('open'); petin.classList.add('chew'); C.sfx.munch(); C.fx.burst(c.x, c.y + 30, { n: 8, dist: 50, shapes: ['dot'], colors: ['#ffd8a8', '#fff'], size: 12 });
              later(function () { C.sfx.munch(); }, 420);
              later(function () { petin.classList.remove('chew'); mood('happy', 1400); hearts(4); C.sfx.giggle(); C.say('Miam !'); }, 900);
            };
          };
        });
      }
      /* laver */
      function addFoam(e) {
        var r = petin.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
        if (x < 0 || x > 100 || y < 0 || y > 100) return;
        if (Math.random() < 0.55) return;
        var b = document.createElement('i'); var sz = 14 + Math.random() * 22;
        b.style.cssText = 'left:' + x + '%;top:' + y + '%;width:' + sz + 'px;height:' + sz + 'px';
        foam.appendChild(b); foamN++; C.sfx.bubble(); if (foamN % 3 === 0) mood('happy', 600);
        if (foamN >= 26) { foamN = -9999; shower(); }
      }
      function wash(btn) { setMode('wash', btn); C.say('Frotte avec ton doigt !'); props.innerHTML = '<div class="sponge">' + Art.ui.soap.replace(/#fff/g, '#ffd0e8') + '</div>'; }
      function shower() {
        C.say('On rince !'); C.sfx.splash();
        var c = centerXY(); var drops = C.$('.props', el);
        for (var i = 0; i < 18; i++) later(function () { C.fx.burst(c.x + (Math.random() * 200 - 100), c.y - 120, { n: 2, shapes: ['dot'], colors: ['#8fd3ff', '#bfe6ff', '#fff'], dist: 40, up: -120, fall: 160, size: 14, dur: 800 }); }, i * 70);
        later(function () { C.$$('i', foam).forEach(function (b, k) { b.style.transition = 'transform .4s, opacity .4s'; b.style.transform = 'scale(1.6)'; b.style.opacity = '0'; }); }, 900);
        later(function () { foam.innerHTML = ''; petin.classList.add('shake'); C.sfx.boing(); C.fx.burst(c.x, c.y, { n: 26, dist: 160, up: 40 }); C.sfx.sparkle(); mood('happy', 1800); hearts(5); C.say('Tout propre !'); }, 1500);
        later(function () { petin.classList.remove('shake'); stopMode(); }, 2600);
      }
      /* jouer */
      function play(btn) {
        setMode('play', btn);
        var ball = C.el('<button class="ball">' + Art.item('ball') + '</button>'); props.appendChild(ball);
        var sr = stage.getBoundingClientRect();
        function place(first) {
          var x = 12 + Math.random() * 70, y = 20 + Math.random() * 38;
          ball.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(0,-70px)', offset: .5 }, { transform: 'translate(0,0)' }], { duration: 650, easing: 'ease-in-out' });
          ball.style.left = x + '%'; ball.style.top = y + '%';
          var dx = (x / 100 - 0.5) * sr.width * 0.6; petmove.style.transform = 'translateX(' + dx + 'px) scaleX(' + (dx < (petmove._dx || 0) ? -1 : 1) + ')'; petmove._dx = dx;
          later(function () { hop(); C.sfx.boing(); mood('happy', 800); }, 450);
        }
        ball.style.left = '70%'; ball.style.top = '45%';
        ball.onclick = function () { C.sfx.pop(); place(); hearts(1); C.sayRnd(['Hihi !', 'Youpi !', 'Super !']); };
        C.say('Joue avec la balle !'); setHint(ball);
      }
      var hintObj = null; function setHint(n) { if (hintObj) hintObj.stop(); hintObj = n ? C.hint(n, 0, 10) : null; if (n) later(function () { if (hintObj) hintObj.stop(); }, 3500); }

      /* prénom : appui long (réservé à l'adulte) */
      var nameBtn = C.$('[data-a=name]', el), holdT = null;
      nameBtn.addEventListener('pointerdown', function () { holdT = setTimeout(askName, 900); C.say('Appuie longtemps, avec un adulte.'); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { nameBtn.addEventListener(ev, function () { clearTimeout(holdT); }); });
      function askName() {
        var f = cur();
        var m = C.modal('<div class="ptitle">Prénom</div><input class="nameinp" maxlength="14" value="' + f.name.replace(/"/g, '') + '" autocomplete="off" autocapitalize="words"><div class="row"><button class="btn big green" data-ok>' + Art.ui.check + '</button></div>', 'parent');
        var inp = C.$('input', m); setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) { } }, 300);
        C.$('[data-ok]', m).onclick = function () { var v = inp.value.trim().slice(0, 14); if (v) { f.name = v; save(S); tag.textContent = v; } m.close(); C.sfx.chime(); C.say('Il s’appelle ' + f.name + ' !'); };
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') C.$('[data-ok]', m).click(); });
      }

      /* œuf magique */
      function eggScene() {
        stopMode(); petw.style.visibility = 'hidden';
        var n = 0, tapsNeeded = 4;
        var ov = C.el('<div class="eggscene"><div class="eggbtn" role="button">' + P.egg(S.n || 0) + '</div></div>'); stage.appendChild(ov);
        var eg = C.$('.eggbtn', ov); C.say('Touche l’œuf magique !');
        var h = C.hint(eg, 0, 20);
        eg.onclick = function () {
          h.stop(); n++; C.sfx.tap(n); C.sfx.boing();
          eg.classList.remove('wob'); void eg.offsetWidth; eg.classList.add('wob');
          var r = eg.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 8, dist: 80 });
          if (n >= 2) C.$('.crack', eg).style.display = '';
          if (n >= tapsNeeded) { eg.onclick = null; hatch(ov, eg); }
        };
        ov.back = function () { h.stop(); ov.remove(); petw.style.visibility = ''; renderTray(); };
        C.setBack(function () { ov.back(); C.setBack(null); });
      }
      function hatch(ov, eg) {
        var owned = S.friends.map(function (f) { return f.type; });
        var fresh = P.types.filter(function (t) { return owned.indexOf(t) < 0; });
        var type, v = 0;
        if (fresh.length) type = C.rnd(fresh);
        else { type = C.rnd(P.types); var used = S.friends.filter(function (f) { return f.type === type; }).map(function (f) { return f.v; }); var free = [0, 1, 2].filter(function (k) { return used.indexOf(k) < 0; }); v = free.length ? C.rnd(free) : C.rnd([0, 1, 2]); }
        var dup = S.friends.some(function (f) { return f.type === type && f.v === v; });
        C.sfx.magic(); C.sfx.yay();
        var r = eg.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 40, dist: 200, up: 40 });
        eg.classList.add('burst');
        later(function () {
          ov.innerHTML = '<div class="newpet">' + P.render(type, v, {}) + '</div>';
          C.sfx.animal(type);
          var f = dup ? S.friends.filter(function (x) { return x.type === type && x.v === v; })[0] : { id: 'f' + (Date.now() % 100000), type: type, v: v, name: P.defaultName[type], acc: null };
          if (!dup && S.friends.length < 14) { S.friends.push(f); S.n = (S.n || 4) + 1; }
          S.cur = f.id; save(S);
          C.say(P.names[type] + ' ! Un nouvel ami !');
          later(function () {
            var gift = C.rewards.grant();
            C.celebrate({ svg: P.render(type, v, {}), say: null, gift: gift, buttons: [{ icon: Art.ui.check, cls: 'green', fn: function () { ov.remove(); petw.style.visibility = ''; C.setBack(null); draw(); renderTray(); greet(); } }, { icon: Art.ui.home, cls: 'pink', fn: function () { C.home(); } }] });
          }, 1800);
        }, 700);
      }

      C.$$('.actbar [data-a]', el).forEach(function (b) {
        var a = b.dataset.a;
        if (a === 'name') return;
        b.onclick = function () {
          C.sfx.pop(); C.bounce(b, 1.12);
          if (b.classList.contains('on')) { stopMode(); return; }
          if (a === 'feed') feed(b);
          else if (a === 'love') { setMode('love', b); petin.classList.add('purr'); mood('happy', 2600); C.sfx.purr(); hearts(8); C.say('Quel câlin !'); later(function () { petin.classList.remove('purr'); stopMode(); }, 2700); }
          else if (a === 'wash') wash(b);
          else if (a === 'play') play(b);
          else if (a === 'acc') { setMode('acc', b); renderTray(); C.say('Choisis un accessoire !'); }
        };
      });

      draw(); renderTray();
      C.doneBar(C.$('.tray', el), 'Je retourne au château !', function () { C.say('À bientôt !'); later(function () { C.home(); }, 700); });
      /* promenade tranquille quand rien ne se passe */
      wander = setInterval(function () {
        if (mode || !live) return;
        var sr = stage.getBoundingClientRect(), dx = (Math.random() - 0.5) * sr.width * 0.5;
        petmove.style.transform = 'translateX(' + dx + 'px) scaleX(' + (dx < (petmove._dx || 0) ? -1 : 1) + ')'; petmove._dx = dx;
      }, 6500);
      later(greet, 500);
    },
    leave: function (el) { if (el && el._stop) el._stop(); }
  });
})();
