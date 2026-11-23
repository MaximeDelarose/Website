/* « La jolie chambre de Celia » : on range les jouets avec le doigt. Aucune punition : si on se trompe, l'objet revient doucement et le bon meuble brille.
   Commence avec 3 objets ; plusieurs dispositions de chambre, plusieurs objets et petites missions. Lumi parle à voix haute. */
(function () {
  'use strict';
  var T = Art.tidy, N = C.NAME;
  var MISSIONS = [
    { id: 'bazar', cats: null, intro: 'Oh là là, ' + N + ' ! Regarde ce bazar ! On range tout ensemble ?' },
    { id: 'dodo', cats: ['plush', 'dress', 'shoe', 'toy'], intro: 'Mission dodo ! On range la chambre avant d’aller au lit !' },
    { id: 'artiste', cats: ['book', 'pencil', 'toy', 'plush'], intro: 'Mission petits artistes ! On range les livres et les crayons !' }
  ];
  var DONE = {
    teddy: ['Bravo ' + N + ' ! Le nounours est bien rangé !', 'Super ! Le nounours fait dodo dans le panier !'], bunny: ['Super ! Le lapin est bien rangé !', 'Bravo ! Le lapin est dans le panier !'], kitty: ['Bravo ! Le chaton fait dodo dans le panier !'],
    blocks: ['Bravo ' + N + ' ! Les cubes sont bien rangés !'], ball: ['Super ! Le ballon est dans le coffre !'], rocket: ['Bravo ! La fusée est rangée dans le coffre !'],
    dressP: ['Bravo ' + N + ' ! La robe rose est dans l’armoire !'], dressB: ['Super ! La robe bleue est bien rangée !'],
    bookR: ['Bravo ! Le livre rouge est sur l’étagère !'], bookB: ['Super ! Le livre bleu est sur l’étagère !'], bookG: ['Bravo ' + N + ' ! Le livre vert est bien rangé !'],
    shoeP: ['Bravo ' + N + ' ! Les chaussures sont près du lit !'], shoeB: ['Super ! Les chaussures bleues sont bien rangées !'],
    pencil: ['Super ! Le crayon est dans son pot !'], crayons: ['Bravo ! Les crayons sont dans leur pot !']
  };
  var NEXT = { plush: 'Maintenant, on range les peluches !', toy: 'Maintenant, on range les jouets !', dress: 'Maintenant, on range les robes !', book: 'Maintenant, on range les livres !', shoe: 'Maintenant, on range les chaussures !', pencil: 'Maintenant, on range les crayons !' };
  var HINT = ['Presque ! Regarde, ça se range ici !', 'Oups ! C’est par là que ça va !', 'Regarde, c’est ici que ça se range !'];
  var FINAL = 'Wouaaah ! Regarde comme ta chambre est jolie maintenant ! Bravo ' + N + ' !';
  C.TIDY = { MISSIONS: MISSIONS, DONE: DONE, NEXT: NEXT, HINT: HINT, FINAL: FINAL };

  var BY = {}; Object.keys(T.objects).forEach(function (id) { var c = T.objects[id].cat; (BY[c] = BY[c] || []).push(id); });
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

  C.register('tidy', {
    enter: function (el) {
      var prog = Object.assign({ level: 0, layout: 0, round: 0 }, C.store.get('tidy', {}));
      el.innerHTML = '<div class="dbg tdbg"></div><div class="act tidy"><div class="stage"><div class="troom"></div><div class="tlumi"></div></div></div>';
      var stage = C.$('.stage', el), wrap = C.$('.troom', el), lumiBox = C.$('.tlumi', el);
      lumiBox.innerHTML = Art.lumi(); var lsvg = C.$('svg', lumiBox);
      var mouth = function (o) { Art.lumiMood(lsvg, o ? 'open' : 'smile'); };
      var fit = C.fit(stage, wrap, 390 / 600);
      var alive = true, locked = false, items = [], dests = {}, drag = null, left = 0, L, beforeHTML = '', mission, hintHand = null, wrongCount = 0;
      el._stop = function () { alive = false; };

      function say(text, o) { if (!alive) return Promise.resolve(); return C.speak('narr', text, Object.assign({ mouth: mouth }, o || {})); }

      /* ---- une manche : une disposition, quelques objets éparpillés ---- */
      function start() {
        locked = false; left = 0; items = []; dests = {}; drag = null; wrongCount = 0; wrap.classList.remove('shine');
        var old = C.$('.tba', el); if (old) old.remove();
        L = T.layouts[prog.layout % T.layouts.length];
        mission = prog.round === 0 ? MISSIONS[0] : MISSIONS[prog.round % MISSIONS.length];
        var n = Math.min(6, 3 + prog.level);
        var pool = shuffle(mission.cats || T.CATS), rest = shuffle(T.CATS.filter(function (c) { return pool.indexOf(c) < 0; }));
        var cats = pool.concat(rest).slice(0, n), spots = shuffle(L.spots);
        var html = T.roomBg(L).replace('<svg ', '<svg class="tbgsvg" ');
        html += '<div class="tdec tbed" style="left:' + L.bed[0] + '%;top:' + L.bed[1] + '%">' + T.decor.bed() + '</div>' +
          '<div class="tdec twin" style="left:' + L.window[0] + '%;top:' + L.window[1] + '%">' + T.decor.window() + '</div>' +
          '<div class="tdec tdesk" style="left:' + L.pos.pencil[0] + '%;top:' + (L.pos.pencil[1] + 12) + '%">' + T.decor.desk() + '</div>';
        T.CATS.forEach(function (c) { var d = T.dest[c], p = L.pos[c]; html += '<div class="tdest" data-cat="' + c + '" style="left:' + p[0] + '%;top:' + p[1] + '%;width:' + d.w + '%">' + d.art() + '</div>'; });
        cats.forEach(function (c, i) {
          var id = rnd(BY[c]), sp = spots[i % spots.length], jx = (Math.random() - .5) * 1.6, jy = (Math.random() - .5) * 1.6;
          html += '<div class="tobj" data-id="' + id + '" data-cat="' + c + '" data-x="' + (sp[0] + jx).toFixed(1) + '" data-y="' + (sp[1] + jy).toFixed(1) + '" style="left:' + (sp[0] + jx).toFixed(1) + '%;top:' + (sp[1] + jy).toFixed(1) + '%;transform:translate(-50%,-50%) rotate(' + C.rint(-6, 6) + 'deg)">' + T.objects[id].art() + '</div>';
        });
        wrap.innerHTML = html;
        C.$$('.tdest', wrap).forEach(function (d) { dests[d.dataset.cat] = d; });
        items = C.$$('.tobj', wrap); left = items.length; beforeHTML = wrap.innerHTML;
        wrap.classList.remove('in'); void wrap.offsetWidth; wrap.classList.add('in'); fit();
        setTimeout(function () { if (alive) say(mission.intro); }, 700);
      }

      /* ---- doigt : prendre, glisser, déposer ---- */
      function rectOf(e) { return wrap.getBoundingClientRect(); }
      function destAt(x, y) {
        var best = null;
        for (var c in dests) { var r = dests[c].getBoundingClientRect(), pad = 10; if (x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad) best = dests[c]; }
        return best;
      }
      function clearGlow() { C.$$('.tdest.glow, .tdest.hover', wrap).forEach(function (d) { d.classList.remove('glow', 'hover'); }); }
      function glow(cat, ms) { clearGlow(); var d = dests[cat]; if (!d) return; d.classList.add('glow'); if (ms) setTimeout(function () { d.classList.remove('glow'); }, ms); }
      function stopHint() { if (hintHand) { try { hintHand.stop(); } catch (e) { } hintHand = null; } }
      function showHint(cat) { stopHint(); var d = dests[cat]; if (!d || !C.hint) return; hintHand = C.hint(d, 0, 18); setTimeout(stopHint, 2600); }

      wrap.addEventListener('pointerdown', function (e) {
        if (locked || drag) return;
        var it = e.target.closest ? e.target.closest('.tobj') : null; if (!it || it.classList.contains('stored')) return;
        var r = rectOf(), cx = (e.clientX - r.left) / r.width * 100, cy = (e.clientY - r.top) / r.height * 100;
        drag = { it: it, id: e.pointerId, ox: parseFloat(it.style.left) - cx, oy: parseFloat(it.style.top) - cy, sx: e.clientX, sy: e.clientY, moved: false };
        it.style.transition = 'none'; it.classList.add('lift'); it.style.zIndex = 20;
        try { wrap.setPointerCapture(e.pointerId); } catch (x) { }
        glow(it.dataset.cat); C.sfx.tap(C.rint(0, 6)); e.preventDefault();
      });
      wrap.addEventListener('pointermove', function (e) {
        if (!drag || drag.id !== e.pointerId) return;
        var r = rectOf(), x = (e.clientX - r.left) / r.width * 100 + drag.ox, y = (e.clientY - r.top) / r.height * 100 + drag.oy;
        x = Math.max(6, Math.min(94, x)); y = Math.max(8, Math.min(94, y));
        drag.it.style.left = x.toFixed(1) + '%'; drag.it.style.top = y.toFixed(1) + '%';
        if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
        var d = destAt(e.clientX, e.clientY); C.$$('.tdest.hover', wrap).forEach(function (q) { if (q !== d) q.classList.remove('hover'); }); if (d) d.classList.add('hover');
      });
      function release(e) {
        if (!drag || drag.id !== e.pointerId) return;
        var it = drag.it, moved = drag.moved, d = destAt(e.clientX, e.clientY); drag = null;
        it.classList.remove('lift'); C.$$('.tdest.hover', wrap).forEach(function (q) { q.classList.remove('hover'); });
        if (d && d.dataset.cat === it.dataset.cat) { stow(it, d); return; }
        if (d) { giveBack(it, d); return; }
        it.style.zIndex = ''; it.style.transition = '';
        if (!moved) { glow(it.dataset.cat, 2400); showHint(it.dataset.cat); }      /* un simple toucher : le bon meuble brille */
        else clearGlow();
      }
      ['pointerup', 'pointercancel'].forEach(function (ev) { wrap.addEventListener(ev, release); });

      /* ---- bon endroit : l'objet se range, le meuble rebondit ---- */
      function stow(it, d) {
        stopHint(); clearGlow(); it.classList.add('stored');
        var p = [parseFloat(d.style.left), parseFloat(d.style.top)];
        it.style.transition = 'left .5s cubic-bezier(.3,1.3,.5,1), top .5s cubic-bezier(.3,1.3,.5,1), transform .5s, opacity .5s';
        it.style.left = p[0] + '%'; it.style.top = (p[1] + 2) + '%'; it.style.transform = 'translate(-50%,-50%) scale(.25) rotate(0deg)'; it.style.opacity = '0';
        var r = d.getBoundingClientRect(); setTimeout(function () { try { C.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 12, dist: 90 }); } catch (x) { } }, 280);
        C.sfx.pop(); setTimeout(function () { C.sfx.sparkle(); }, 220);
        d.classList.remove('bounce'); void d.offsetWidth; d.classList.add('bounce');
        setTimeout(function () { it.style.display = 'none'; }, 560);
        left--; wrongCount = 0;
        var id = it.dataset.id, nextCat = (C.$$('.tobj:not(.stored)', wrap)[0] || {}).dataset ? C.$$('.tobj:not(.stored)', wrap)[0].dataset.cat : null;
        if (left <= 0) { finishRound(); return; }
        var line = rnd(DONE[id] || ['Bravo ' + N + ' !']), nxt = (nextCat && Math.random() < 0.5) ? NEXT[nextCat] : null;
        say(line).then(function () { if (nxt && alive && !locked && !drag) return say(nxt); });   /* deux phrases courtes (faciles à enregistrer) plutôt qu'une longue */
      }
      /* ---- mauvais endroit : l'objet revient doucement, le bon meuble brille ---- */
      function giveBack(it, d) {
        var cat = it.dataset.cat; it.style.transition = 'left .55s cubic-bezier(.3,1.4,.5,1), top .55s cubic-bezier(.3,1.4,.5,1)';
        it.style.left = it.dataset.x + '%'; it.style.top = it.dataset.y + '%'; setTimeout(function () { it.style.transition = ''; it.style.zIndex = ''; }, 600);
        C.sfx.pop(); C.wiggle && C.wiggle(it); glow(cat, 3000); showHint(cat);
        wrongCount++; if (wrongCount % 2 === 1) say(rnd(HINT));
      }

      /* ---- fin : avant / après, la chambre brille ---- */
      async function finishRound() {
        locked = true; await C.sleep(700); if (!alive) return;
        wrap.classList.add('shine'); C.sfx.yay(); try { C.fx.confetti(30); } catch (e) { }
        var after = wrap.innerHTML;
        var ba = C.el('<div class="tba"><div class="tcard before"><span class="tag">🌀</span><div class="troom mini">' + beforeHTML + '</div></div><div class="tarrow">➜</div><div class="tcard after"><span class="tag">✨</span><div class="troom mini">' + after + '</div></div></div>');
        C.$('.tidy', el).appendChild(ba);
        await say(FINAL, { keepDuck: false }); if (!alive) return; await C.sleep(900); if (!alive) return;
        prog.level = Math.min(3, prog.level + 1); prog.layout = (prog.layout + 1) % T.layouts.length; prog.round++; C.store.set('tidy', prog);
        C.finish({ kind: 'tidy', tile: 'tidy', svg: T.roomBg(L).replace('<svg ', '<svg class="tbgsvg" '), say: FINAL, again: function () { start(); } });
      }
      start();
    },
    leave: function (el) { if (el && el._stop) el._stop(); }
  });
})();
