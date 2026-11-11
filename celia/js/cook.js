/* La cuisine magique : recette → ingrédients → mélange → four → décoration libre. Pas de chrono, pas de mauvaise recette. */
(function () {
  'use strict';
  var F = Art.food;

  /* petite main qui montre où toucher */
  Art.hand = Art.svg('0 0 52 60', '<path d="M19 6a5 5 0 0 1 10 0v21l11 2c5 1 7 5 6 10l-3 13c-1 4-4 6-8 6H21c-4 0-7-2-9-6L4 38c-2-4 1-8 6-6l9 5z" fill="#fff" stroke="#6b3f72" stroke-width="3.500" stroke-linejoin="round"/><path d="M24 32v10M32 33v9" stroke="#6b3f72" stroke-width="2.500" stroke-linecap="round"/>');
  C.hint = function (target, dx, dy) {
    var layer = C.$('#fx'), h = document.createElement('div'); h.className = 'hinthand';
    h.innerHTML = Art.hand; layer.appendChild(h);
    function place() {
      if (!target.isConnected) { h.remove(); return; }
      var r = target.getBoundingClientRect();
      h.style.left = (r.left + r.width / 2 - 18 + (dx || 0)) + 'px'; h.style.top = (r.top + r.height / 2 - 4 + (dy || 0)) + 'px';
    }
    place();
    var iv = setInterval(place, 400);
    return { stop: function () { clearInterval(iv); h.remove(); } };
  };

  function flyer(fromEl, toX, toY, html, done, small) {
    var fx = C.$('#fx'), fr = fromEl.getBoundingClientRect();
    var d = document.createElement('div'); d.className = 'flyer';
    d.style.cssText = 'left:' + fr.left + 'px;top:' + fr.top + 'px;width:' + fr.width + 'px;height:' + fr.height + 'px';
    d.innerHTML = html; fx.appendChild(d);
    var dx = toX - (fr.left + fr.width / 2), dy = toY - (fr.top + fr.height / 2);
    var a = d.animate([
      { transform: 'translate(0,0) scale(1) rotate(0)' },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 100) + 'px) scale(1.2) rotate(160deg)', offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + (small || 0.5) + ') rotate(330deg)' }
    ], { duration: 720, easing: 'ease-in-out', fill: 'forwards' });
    a.onfinish = function () { d.remove(); done && done(); };
  }
  function lerpHex(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.slice(i, i + 2), 16); }), pb = [1, 3, 5].map(function (i) { return parseInt(b.slice(i, i + 2), 16); });
    return '#' + pa.map(function (v, i) { var x = Math.round(v + (pb[i] - v) * t).toString(16); return x.length < 2 ? '0' + x : x; }).join('');
  }

  C.register('cook', {
    enter: function (el) {
      var root = el, timers = [], hint = null, live = true;
      el._stop = function () { live = false; timers.forEach(clearTimeout); if (hint) hint.stop(); };
      function later(fn, ms) { var t = setTimeout(function () { if (live) fn(); }, ms); timers.push(t); return t; }
      function setHint(node, dx, dy) { if (hint) hint.stop(); hint = node ? C.hint(node, dx, dy) : null; }
      el.innerHTML = '<div class="kbg">' + F.kitchenBg() + '</div><div class="act cook"><div class="stage"></div></div>';
      var stage = C.$('.stage', el);
      var R = null; /* recette */

      /* ---------- 1. choix de la recette ---------- */
      function chooseRecipe() {
        C.setBack(null); setHint(null);
        stage.innerHTML = '<div class="recgrid">' + F.recipes.map(function (r, i) {
          var def = { birthday: '#ff9ac8', cupcake: '#ffe066', cookie: null, glace: '#ff9ac8', licorne: '#ffd0f0' }[r.id];
          return '<button class="rcard" data-i="' + i + '" aria-label="' + r.name + '" style="animation-delay:' + (i * 0.07) + 's">' + F.cake(r.id, def) + '<em>' + r.name + '</em></button>';
        }).join('') + '</div>';
        C.$$('.rcard', stage).forEach(function (b) {
          b.onclick = function () { R = F.recipes[+b.dataset.i]; C.sfx.sparkle(); C.say(R.say); C.fx.burstEl(b, { n: 14 }); later(ingredients, 700); };
        });
        C.say('Que veux-tu cuisiner ?');
      }

      /* ---------- 2. ingrédients ---------- */
      function ingredients() {
        C.setBack(chooseRecipe);
        stage.innerHTML = '<div class="bowlw">' + F.bowl() + '<div class="ring"></div></div><div class="shelf">' +
          R.ings.map(function (n, i) { return '<button class="ing" data-n="' + n + '" aria-label="' + n + '" style="animation-delay:' + (i * 0.08) + 's">' + F.ing(n) + '<span class="chk">' + Art.ui.check + '</span></button>'; }).join('') + '</div>';
        var bowl = C.$('.bowlw', stage), bat = C.$('.batter', stage), added = {}, count = 0;
        bat.style.cssText = 'transform-box:fill-box;transform-origin:center;transform:scale(.001);transition:transform .5s cubic-bezier(.2,1.5,.4,1), fill .6s';
        bat.setAttribute('fill', '#fff8e8');
        var shelf = C.$$('.ing', stage);
        function nextHint() { var n = shelf.filter(function (b) { return !added[b.dataset.n]; })[0]; setHint(n); }
        shelf.forEach(function (b) {
          b.onclick = function () {
            var n = b.dataset.n; setHint(null);
            if (added[n]) { C.bounce(b); C.sfx.pop(); return; }
            added[n] = 1; count++; b.classList.add('used');
            C.sfx.whoosh(); C.say(F.ingNames[n].charAt(0).toUpperCase() + F.ingNames[n].slice(1) + ' !');
            var br = bowl.getBoundingClientRect();
            flyer(b, br.left + br.width / 2, br.top + br.height * 0.28, F.ing(n), function () {
              ({ oeuf: C.sfx.squish, farine: C.sfx.whoosh, lait: C.sfx.splash, sucre: C.sfx.sparkle, beurre: C.sfx.squish, chocolat: C.sfx.plop, creme: C.sfx.squish, fraise: C.sfx.plop, magie: C.sfx.magic })[n]();
              C.sfx.plop();
              var cols = { oeuf: ['#ffe066', '#fff'], farine: ['#fff', '#f4ecff'], lait: ['#fff', '#bfe6ff'], sucre: ['#fff', '#ffd0e8'], beurre: ['#ffe97a'], chocolat: ['#8a5a3c', '#b98258'], creme: ['#fff'], fraise: ['#ff4d6d', '#ff9ac8'], magie: C.PASTELS }[n];
              C.fx.burst(br.left + br.width / 2, br.top + br.height * 0.3, { n: 14, dist: 100, colors: cols, shapes: n === 'magie' || n === 'sucre' ? ['star', 'sparkle'] : ['dot'], size: 18 });
              C.bounce(bowl, 1.08);
              bat.setAttribute('fill', lerpHex('#fff8e8', R.batter, count / R.ings.length));
              bat.style.transform = 'scale(' + (0.35 + 0.65 * count / R.ings.length) + ')';
              if (count === R.ings.length) { later(function () { C.sfx.chime(); C.say('Maintenant, mélange !'); later(mix, 1400); }, 500); }
              else later(nextHint, 600);
            });
          };
        });
        C.say('Touche les ingrédients !');
        later(nextHint, 2500);
      }

      /* ---------- 3. mélanger avec le doigt ---------- */
      function mix() {
        C.setBack(null);
        var bowl = C.$('.bowlw', stage), bat = C.$('.batter', stage), shelf = C.$('.shelf', stage);
        shelf.classList.add('away');
        var spoon = C.el('<div class="spoonw">' + F.spoon + '</div>'); bowl.appendChild(spoon);
        var ring = C.$('.ring', stage); ring.innerHTML = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#fff" stroke-width="7" opacity=".6"/><circle class="prog" cx="50" cy="50" r="46" fill="none" stroke="url(#rg)" stroke-width="7" stroke-linecap="round" stroke-dasharray="289" stroke-dashoffset="289" transform="rotate(-90 50 50)"/><defs><linearGradient id="rg"><stop offset="0" stop-color="#ff6fa5"/><stop offset=".5" stop-color="#ffd84d"/><stop offset="1" stop-color="#4fd8d0"/></linearGradient></defs></svg>';
        var prog = C.$('.prog', ring), total = 0, NEED = 1400, last = null, id = null, swirl = 0, doneMix = false;
        bat.style.transition = 'none'; bat.style.transform = 'scale(1)';
        var sw = C.el('<g transform="translate(150 72) scale(1 .26)"><path d="M0 0q22-4 24-26 2-24-26-34-34-8-58 22-22 30-2 62 30 30 74 8" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".7"/></g>'.replace('<g','<svg xmlns="http://www.w3.org/2000/svg"><g').replace('</g>','</g></svg>'));
        var swg = sw.firstChild; C.$('.batter', stage).parentNode.insertBefore(swg, C.$('.batter', stage).nextSibling); sw = swg;
        spoon.style.left = '50%'; spoon.style.top = '30%';
        setHint(spoon, 0, 30);
        C.say('Mélange avec ton doigt !');
        bowl.style.touchAction = 'none';
        function setSpoon(e) {
          var r = bowl.getBoundingClientRect();
          var x = C.clamp((e.clientX - r.left) / r.width, 0.2, 0.8), y = C.clamp((e.clientY - r.top) / r.height, 0.1, 0.5);
          spoon.style.left = (x * 100) + '%'; spoon.style.top = (y * 100) + '%';
        }
        bowl.onpointerdown = function (e) { if (doneMix) return; id = e.pointerId; try { bowl.setPointerCapture(id); } catch (x) { } last = { x: e.clientX, y: e.clientY }; setSpoon(e); setHint(null); };
        bowl.onpointermove = function (e) {
          if (id !== e.pointerId || doneMix) return;
          setSpoon(e);
          var d = Math.hypot(e.clientX - last.x, e.clientY - last.y); last = { x: e.clientX, y: e.clientY };
          total += d; swirl += d * 0.9; if (sw) sw.setAttribute('transform', 'translate(150 72) scale(1 .26) rotate(' + swirl + ')');
          if (Math.floor(total / 90) !== Math.floor((total - d) / 90)) { C.sfx.mix(); C.fx.burst(e.clientX, e.clientY, { n: 1, dist: 30, shapes: ['dot'], colors: [R.batter, '#fff'], size: 14 }); }
          prog.style.strokeDashoffset = 289 * (1 - Math.min(1, total / NEED));
          if (total >= NEED) { doneMix = true; finishMix(); }
        };
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { bowl['on' + ev] = function () { id = null; }; });
        function finishMix() {
          C.sfx.yay(); C.fx.burstEl(bowl, { n: 26, dist: 160 });
          spoon.classList.add('spinout');
          C.say('Bravo ! C’est bien mélangé !');
          later(bake, 1800);
        }
      }

      /* ---------- 4. au four magique ---------- */
      function bake() {
        C.setBack(null);
        var ice = R.oven === 'glace';
        stage.innerHTML = '<div class="ovenw">' + F.oven(R.oven) + '</div><div class="tinw">' + F.tin(R.batter) + '</div>';
        var oven = C.$('.ovenw', stage), tin = C.$('.tinw', stage);
        C.fx.burstEl(tin, { n: 10 }); C.sfx.plop();
        C.say(ice ? 'Mets-le dans la machine à glace !' : 'Mets-le au four magique !');
        setHint(tin, 0, 10);
        var started = false, pid = null, sx = 0, sy = 0, ox = 0, oy = 0;
        tin.style.touchAction = 'none';
        function toOven() {
          if (started) return; started = true; setHint(null);
          var win = C.$('.ovenwin', oven).getBoundingClientRect();
          var tr = tin.getBoundingClientRect(), tx = win.left + win.width / 2 - (tr.left + tr.width / 2), ty = win.top + win.height * 0.7 - (tr.top + tr.height / 2);
          tin.style.transition = 'transform .6s cubic-bezier(.4,0,.2,1)'; tin.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(.45)';
          C.sfx.whoosh();
          later(function () { tin.style.opacity = '0'; cook(); }, 650);
        }
        tin.onpointerdown = function (e) { if (started) return; pid = e.pointerId; try { tin.setPointerCapture(pid); } catch (x) { } sx = e.clientX; sy = e.clientY; ox = 0; oy = 0; tin.style.transition = 'none'; setHint(null); C.sfx.pop(); };
        tin.onpointermove = function (e) { if (pid !== e.pointerId || started) return; ox = e.clientX - sx; oy = e.clientY - sy; tin.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(1.08)'; };
        function up(e) {
          if (pid !== e.pointerId) return; pid = null;
          if (started) return;
          var tr = tin.getBoundingClientRect(), win = C.$('.ovenwin', oven).getBoundingClientRect();
          var cx = tr.left + tr.width / 2, cy = tr.top + tr.height / 2;
          var near = cx > win.left - 30 && cx < win.right + 30 && cy > win.top - 40 && cy < win.bottom + 30;
          if (near || Math.hypot(ox, oy) < 12) { tin.style.transform = 'translate(' + ox + 'px,' + oy + 'px)'; toOven(); }
          else { tin.style.transition = 'transform .4s cubic-bezier(.2,1.4,.4,1)'; tin.style.transform = ''; C.sfx.boing(); setHint(tin, 0, 10); }
        }
        ['pointerup', 'pointercancel'].forEach(function (ev) { tin['on' + ev] = up; });
        function cook() {
          var door = C.$('.door', oven), glow = C.$('.glow', oven), mound = C.$('.mound', oven);
          door.style.cssText = 'transform-box:fill-box;transform-origin:50% 100%;transition:transform .5s;transform:scaleY(1)';
          glow.style.transition = 'opacity 1s'; glow.style.opacity = '.9';
          mound.style.cssText = 'transform-box:fill-box;transform-origin:50% 100%;transition:transform 3s ease-in-out, fill 3s;fill:' + R.batter;
          C.sfx.sizzle(); C.say(ice ? 'Ça refroidit...' : 'Ça cuit...');
          var n = 0;
          var iv = setInterval(function () {
            if (!live) return clearInterval(iv);
            n++; var r = oven.getBoundingClientRect();
            C.fx.burst(r.left + r.width * (0.3 + Math.random() * 0.4), r.top + r.height * 0.3, { n: 2, dist: 40, up: 80, shapes: ice ? ['star', 'sparkle'] : ['dot'], colors: ice ? ['#fff', '#bfe6ff'] : ['#fff', '#ffe9f4'], size: 20, dur: 1500 });
            if (n % 3 === 0) C.sfx.sizzle();
          }, 450);
          requestAnimationFrame(function () { mound.style.transform = 'scale(1.2,' + (ice ? 7 : 11) + ')'; mound.style.fill = ice ? '#ffd0e8' : '#e9b469'; });
          later(function () {
            clearInterval(iv); glow.style.opacity = '0';
            C.sfx.ding(); C.sfx.yay(); C.say(ice ? 'Ding ! C’est prêt !' : 'Ding ! Ça sent bon !');
            door.style.transform = 'scaleY(.12)';
            C.fx.burstEl(oven, { n: 28, dist: 170 });
            later(decorate, 2000);
          }, 3600);
        }
      }

      /* ---------- 5. décoration libre ---------- */
      function decorate() {
        C.setBack(null);
        var icing = null, placed = [], cur = 'fraise', tab = 'glacage', done = false, saved = false, touched = function () { };
        var plateIcon = { birthday: 'ron', cupcake: 'r', cookie: 'r', glace: 'r', licorne: 'r' };
        stage.innerHTML = '<div class="cakeh"></div><div class="tray ctray"><div class="tabs"></div><div class="items scrollable"></div></div>' +
          '<div class="actbar"><button class="btn blue small" data-do="undo" aria-label="annuler">' + Art.ui.undo + '</button></div>';
        stage.classList.add('decor');
        var host = C.$('.cakeh', stage), tabs = C.$('.tabs', stage), items = C.$('.items', stage);
        function renderCake(pop) {
          host.innerHTML = F.cake(R.id, icing);
          renderTops();
          var svg = C.$('svg', host);
          if (pop) { svg.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 350 }); }
          return svg;
        }
        function renderTops() {
          var g = C.$('.tops', host); if (!g) return;
          g.innerHTML = placed.map(function (p, i) {
            return '<g transform="translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + p.r + ') scale(' + p.s + ')"><g class="' + (p.fresh ? 'drop' : '') + '">' + F.tops[p.n] + '</g></g>';
          }).join('');
          placed.forEach(function (p) { p.fresh = false; });
        }
        renderCake(false);
        var tabDefs = [{ id: 'glacage', icon: Art.svg('0 0 64 64', '<circle cx="32" cy="32" r="22" fill="#ff9ac8" stroke="#6b3f72" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="#fff" opacity=".7"/>') }]
          .concat(F.topGroups.map(function (g) { return { id: g.id, icon: F.top(g.icon, 40) }; }));
        tabDefs.forEach(function (t) {
          var b = C.el('<button class="tab" aria-label="' + t.id + '">' + t.icon + '</button>');
          b.onclick = function () { C.sfx.pop(); openTab(t.id, b); };
          b.dataset.id = t.id; tabs.appendChild(b);
        });
        function openTab(id, node) {
          tab = id; C.select(tabs, '.tab', node || C.$('[data-id=' + id + ']', tabs)); items.innerHTML = '';
          if (id === 'glacage') {
            F.icings.forEach(function (c) {
              var b = C.el('<button class="it round" style="--c:' + c.c + '" aria-label="glaçage"></button>');
              b.onclick = function () { icing = c.c; saved = false; touched(); renderCake(true); C.sfx.squish(); C.sfx.sparkle(); var r = host.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + r.height * 0.45, { n: 16, dist: 120, colors: [c.c, '#fff'] }); C.select(items, '.it', b); };
              items.appendChild(b);
            });
            C.say('Choisis un glaçage !');
          } else {
            var grp = F.topGroups.filter(function (g) { return g.id === id; })[0];
            grp.items.forEach(function (n, i) {
              var b = C.el('<button class="it" aria-label="' + n + '">' + F.top(n) + '</button>');
              b.onclick = function () { cur = n; C.select(items, '.it', b); C.sfx.pop(); C.bounce(b); };
              items.appendChild(b); if (i === 0) { cur = n; b.classList.add('on'); }
            });
            C.say(id === 'bougies' ? 'Une bougie !' : 'Touche le gâteau pour poser !');
          }
        }
        openTab('glacage', tabs.firstChild);
        C.say('Décore ton gâteau !');
        /* poser une garniture en touchant le gâteau */
        host.style.touchAction = 'none';
        host.addEventListener('pointerdown', function (e) {
          if (done || tab === 'glacage') { if (tab === 'glacage' && !icing) { C.sfx.oops(); } return; }
          var svg = C.$('svg', host); if (!svg) return;
          var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
          var m = svg.getScreenCTM(); if (!m) return;
          var p = pt.matrixTransform(m.inverse());
          if (p.x < -10 || p.x > 310 || p.y < -10 || p.y > 310) return;
          if (placed.length >= 70) placed.shift();
          placed.push({ n: cur, x: p.x, y: p.y, r: cur === 'bougie' ? 0 : C.rint(-25, 25), s: cur === 'vermicelles' ? 1.4 : 1, fresh: true });
          saved = false; touched(); renderTops(); C.sfx.pop(); C.sfx.tap(C.rint(0, 8));
          C.fx.burst(e.clientX, e.clientY, { n: 7, dist: 60, size: 16 });
        });
        C.$('[data-do=undo]', stage).onclick = function () { if (placed.pop()) { renderTops(); C.sfx.boing(); } else C.sfx.oops(); };
        var finishCake = function () {
          if (done) return; done = true;
          var svg = C.$('svg', host);
          C.sfx.chime();
          C.rasterSvg(svg, 560, 560, function (cx, w, h) { var g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff0f8'); g.addColorStop(1, '#ffe0f0'); cx.fillStyle = g; cx.fillRect(0, 0, w, h); })
            .then(function (url) {
              return C.saveCreation('cake', url).then(function () {
                saved = true; C.finish({ kind: 'cake', tile: 'cook', img: url, say: 'Miam ! Il est trop beau ton gâteau, ' + C.NAME + ' !', again: chooseRecipe });
                stage.classList.remove('decor'); chooseRecipe();
              });
            }).catch(function () { done = false; C.say('Oups, réessaie !'); });
        };
        var doneB = C.doneBar(C.$('.ctray', stage), 'Mon gâteau est prêt !', finishCake);
        touched = C.armDoneHint('cake', doneB);
        /* sauvegarde automatique si elle quitte sans avoir appuyé sur « J'ai fini » */
        root._autosave = function () {
          if (done || saved || !(icing || placed.length)) return; saved = true;
          var svg = C.$('svg', host); if (!svg) return;
          C.rasterSvg(svg, 560, 560, function (cx, w, h) { cx.fillStyle = '#ffe9f4'; cx.fillRect(0, 0, w, h); }).then(function (url) { return C.saveCreation('cake', url); }).catch(function () { });
        };
      }

      chooseRecipe();
    },
    leave: function (el) { if (el && el._stop) el._stop(); }
  });
})();
