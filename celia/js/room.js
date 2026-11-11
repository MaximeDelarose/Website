/* La chambre magique : décoration libre, sauvegarde automatique. Les objets se débloquent doucement avec les créations. */
(function () {
  'use strict';
  var DEF = { wall: 0, pat: 'pois', floor: 0, items: [
    { u: 1, id: 'lit1', x: 32, y: 62, s: 1, f: 0 }, { u: 2, id: 'tapis1', x: 62, y: 82, s: 1, f: 0 }, { u: 3, id: 'rid1', x: 72, y: 24, s: 1, f: 0 },
    { u: 4, id: 'pel1', x: 56, y: 66, s: 1, f: 0 }, { u: 5, id: 'lamp1', x: 14, y: 30, s: 1, f: 0 }
  ] };

  C.register('room', {
    enter: function (el) {
      var R = C.store.get('room', null) || JSON.parse(JSON.stringify(DEF)), sel = null, cat = 'lit', uN = 100;
      R.items.forEach(function (i) { uN = Math.max(uN, i.u + 1); });
      function save() { C.store.set('room', R); }
      el.innerHTML = '<div class="act room"><div class="stage"><div class="rbg"></div><div class="ritems"></div><div class="ractions" hidden>' +
        '<button class="btn green small" data-r="plus">' + Art.ui.plus + '</button><button class="btn blue small" data-r="minus">' + Art.ui.minus + '</button><button class="btn purple small" data-r="flip">' + Art.ui.flip + '</button><button class="btn red small" data-r="del">' + Art.ui.trash + '</button></div></div>' +
        '<div class="tray"><div class="tabs"></div><div class="items scrollable"></div></div></div>';
      var stage = C.$('.stage', el), bg = C.$('.rbg', el), layer = C.$('.ritems', el), acts = C.$('.ractions', el), tabs = C.$('.tabs', el), items = C.$('.items', el);
      function paintBg() { bg.innerHTML = Art.roomBg(Art.wallColors[R.wall], R.pat, Art.floorColors[R.floor]); }
      function zOf(it) { var d = Art.roomById[it.id]; return d.wall ? 2 : d.ground ? 3 : 10 + Math.round(it.y * 3); }
      function nodeFor(it) {
        var d = Art.roomById[it.id]; if (!d) return null;
        var n = C.el('<div class="ri" data-u="' + it.u + '"><div class="rin">' + Art.roomItemSvg(d) + '</div></div>');
        place(n, it); return n;
      }
      function place(n, it) {
        var d = Art.roomById[it.id];
        n.style.left = it.x + '%'; n.style.top = it.y + '%'; n.style.width = (d.w * it.s * 100) + '%'; n.style.zIndex = zOf(it);
        C.$('.rin', n).style.transform = 'scaleX(' + (it.f ? -1 : 1) + ')';
      }
      function render() { layer.innerHTML = ''; R.items.forEach(function (it) { var n = nodeFor(it); if (n) layer.appendChild(n); }); mark(); }
      function mark() { C.$$('.ri', layer).forEach(function (n) { n.classList.toggle('sel', !!sel && +n.dataset.u === sel.u); }); acts.hidden = !sel; }
      function find(u) { return R.items.filter(function (i) { return i.u === u; })[0]; }

      /* déplacer / sélectionner */
      var drag = null;
      layer.addEventListener('pointerdown', function (e) {
        var n = e.target.closest ? e.target.closest('.ri') : null;
        if (!n) { sel = null; mark(); return; }
        var it = find(+n.dataset.u); sel = it; mark();
        var r = stage.getBoundingClientRect();
        drag = { id: e.pointerId, n: n, it: it, dx: (e.clientX - r.left) / r.width * 100 - it.x, dy: (e.clientY - r.top) / r.height * 100 - it.y, moved: false };
        try { n.setPointerCapture(e.pointerId); } catch (x) { }
        C.sfx.pop(); e.preventDefault();
      });
      layer.addEventListener('pointermove', function (e) {
        if (!drag || drag.id !== e.pointerId) return;
        var r = stage.getBoundingClientRect();
        drag.it.x = C.clamp((e.clientX - r.left) / r.width * 100 - drag.dx, 4, 96); drag.it.y = C.clamp((e.clientY - r.top) / r.height * 100 - drag.dy, 6, 96);
        drag.moved = true; place(drag.n, drag.it);
      });
      ['pointerup', 'pointercancel'].forEach(function (ev) { layer.addEventListener(ev, function (e) { if (!drag || drag.id !== e.pointerId) return; if (drag.moved) { save(); C.sfx.plop(); } else { C.bounce(drag.n); } drag = null; }); });

      C.$$('[data-r]', acts).forEach(function (b) {
        b.onclick = function () {
          if (!sel) return; var k = b.dataset.r; C.sfx.pop();
          if (k === 'plus') sel.s = Math.min(2, sel.s * 1.2); else if (k === 'minus') sel.s = Math.max(0.5, sel.s / 1.2); else if (k === 'flip') sel.f = sel.f ? 0 : 1;
          else if (k === 'del') { R.items = R.items.filter(function (i) { return i !== sel; }); sel = null; C.sfx.whoosh(); render(); save(); return; }
          var n = C.$('.ri[data-u="' + sel.u + '"]', layer); place(n, sel); save();
        };
      });

      function add(d) {
        if (R.items.length >= 45) { C.say('La chambre est pleine !'); C.sfx.oops(); return; }
        var it = { u: uN++, id: d.id, x: 50, y: d.wall ? 30 : d.ground ? 78 : 62, s: 1, f: 0 };
        R.items.push(it); sel = it; var n = nodeFor(it); layer.appendChild(n); mark(); save();
        C.bounce(n, 1.3); C.sfx.boing(); C.sfx.sparkle(); var r = n.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 12 });
      }
      function fill() {
        items.innerHTML = '';
        if (cat === 'wall') {
          Art.wallColors.forEach(function (c, i) { var b = C.el('<button class="it round' + (R.wall === i ? ' on' : '') + '" style="--c:' + c + '"></button>'); b.onclick = function () { R.wall = i; paintBg(); save(); C.select(items, '.it', b); C.sfx.sparkle(); C.say('Quelle jolie couleur !'); }; items.appendChild(b); });
          items.appendChild(C.el('<span class="gap"></span>'));
          Art.wallPatterns.forEach(function (p) { var b = C.el('<button class="it' + (R.pat === p ? ' on' : '') + '">' + Art.roomBg(Art.wallColors[R.wall], p, '#fff').replace('preserveAspectRatio="none"', 'preserveAspectRatio="xMidYMin slice"').replace('viewBox="0 0 390 560"', 'viewBox="0 0 390 330"') + '</button>'); b.onclick = function () { R.pat = p; paintBg(); save(); C.select(items, '.it', b); C.sfx.pop(); }; items.appendChild(b); });
          items.appendChild(C.el('<span class="gap"></span>'));
          Art.floorColors.forEach(function (c, i) { var b = C.el('<button class="it round' + (R.floor === i ? ' on' : '') + '" style="--c:' + c + '"></button>'); b.onclick = function () { R.floor = i; paintBg(); save(); C.select(items, '.it', b); C.sfx.pop(); }; items.appendChild(b); });
          return;
        }
        Art.roomItems.filter(function (d) { return d.cat === cat; }).forEach(function (d) {
          var open = C.rewards.isUnlocked(d);
          var b = C.el('<button class="it' + (open ? '' : ' locked') + '" aria-label="' + d.name + '">' + Art.roomItemSvg(d) + '</button>');
          b.onclick = function () { if (open) add(d); else { C.sfx.oops(); C.wiggle(b); C.say('Un cadeau t’attend ! Fais un dessin ou un gâteau.'); } };
          items.appendChild(b);
        });
      }
      var wallIcon = Art.svg('0 0 64 64', '<rect x="6" y="8" width="52" height="48" rx="8" fill="#ffd0e8" ' + Art.ST(3.500) + '/><circle cx="20" cy="22" r="5" fill="#fff"/><circle cx="40" cy="22" r="5" fill="#fff"/><circle cx="30" cy="38" r="5" fill="#fff"/><circle cx="48" cy="40" r="5" fill="#fff"/>');
      Art.roomCats.map(function (c) { return { id: c.id, icon: Art.roomItemSvg(c.icon) }; }).concat([{ id: 'wall', icon: wallIcon }]).forEach(function (c) {
        var b = C.el('<button class="tab' + (c.id === cat ? ' on' : '') + '" aria-label="' + c.id + '">' + c.icon + '</button>');
        b.onclick = function () { cat = c.id; C.select(tabs, '.tab', b); C.sfx.pop(); fill(); };
        tabs.appendChild(b);
      });
      paintBg(); render(); fill();
      C.say('Décore ta chambre !');
    },
    leave: function () { }
  });
})();
