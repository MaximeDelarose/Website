/* L'album de Célia : toutes ses créations, sauvegardées sur l'appareil. */
(function () {
  'use strict';
  var KINDS = [
    { id: 'draw', title: 'Les dessins de ' + C.NAME, icon: Art.tiles.draw },
    { id: 'color', title: 'Les coloriages de ' + C.NAME, icon: Art.svg('0 0 64 64', Art.items.rainbow + '<g transform="translate(20 10) scale(.6)">' + Art.items.star + '</g>') },
    { id: 'cake', title: 'Les gâteaux de ' + C.NAME, icon: Art.tiles.cook },
    { id: 'outfit', title: 'Les tenues de ' + C.NAME, icon: Art.tiles.dress },
    { id: 'makeup', title: 'Les maquillages de ' + C.NAME, icon: Art.tiles.makeup }
  ];
  C.gallery = {
    kinds: KINDS,
    open: function (kind) {
      kind = kind || 'draw';
      var m = C.modal('<div class="gal-head"><div class="gal-tabs"></div><button class="btn red" data-x aria-label="fermer">' + Art.ui.cross + '</button></div><div class="gal-title"></div><div class="gal-grid scrollable"></div>', 'gallery');
      var tabs = C.$('.gal-tabs', m), grid = C.$('.gal-grid', m), title = C.$('.gal-title', m);
      C.$('[data-x]', m).onclick = function () { C.sfx.pop(); m.close(); };
      KINDS.forEach(function (k) {
        var b = C.el('<button class="gal-tab" data-k="' + k.id + '" aria-label="' + k.title + '">' + k.icon + '</button>');
        b.onclick = function () { C.sfx.pop(); show(k.id); };
        tabs.appendChild(b);
      });
      function show(id) {
        kind = id;
        C.$$('.gal-tab', m).forEach(function (t) { t.classList.toggle('on', t.dataset.k === id); });
        title.textContent = KINDS.filter(function (k) { return k.id === id; })[0].title;
        grid.innerHTML = '';
        C.db.all(id).then(function (list) {
          if (!list.length) {
            grid.innerHTML = '<div class="gal-empty">' + Art.lumi() + '<div class="gal-empty-frame">' + Art.ui.gallery.replace(/#fff/g, '#e5d6ff') + '</div></div>';
            return;
          }
          list.forEach(function (rec) {
            var t = C.el('<button class="gal-item"><img alt="" src="' + rec.img + '"></button>');
            t.onclick = function () { C.sfx.pop(); view(rec, t); };
            grid.appendChild(t);
          });
        });
      }
      function view(rec, tile) {
        var v = C.modal('<div class="polaroid big"><img alt="" src="' + rec.img + '"></div><div class="row"><button class="btn big red" data-del aria-label="supprimer">' + Art.ui.trash + '</button><button class="btn big green" data-ok aria-label="fermer">' + Art.ui.check + '</button></div>', 'viewer');
        C.$('[data-ok]', v).onclick = function () { C.sfx.pop(); v.close(); };
        C.$('[data-del]', v).onclick = function () {
          C.confirm('<div class="trashicon">' + Art.ui.trash.replace(/#fff/g, '#c4a8ff').replace('#ff8fb8', '#fff') + '</div>').then(function (yes) {
            if (!yes) return;
            C.db.del(rec.id).then(function () { v.close(); tile.remove(); if (!C.$('.gal-item', grid)) show(kind); });
          });
        };
      }
      show(kind);
      return m;
    },
    button: function (kind) {
      var b = C.el('<button class="btn blue" aria-label="album">' + Art.ui.gallery + '</button>');
      b.onclick = function () { C.sfx.pop(); C.gallery.open(kind); };
      return b;
    }
  };
})();

/* petites aides communes aux activités */
(function () {
  'use strict';
  /* ajuste un cadre (wrap) dans une scène (stage) en gardant un rapport largeur/hauteur */
  C.fit = function (stage, wrap, ratio) {
    function f() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      var ww = Math.min(w - 8, (h - 8) * ratio), hh = ww / ratio;
      wrap.style.width = ww + 'px'; wrap.style.height = hh + 'px';
    }
    f();
    if (window.ResizeObserver) { var ro = new ResizeObserver(f); ro.observe(stage); }
    else window.addEventListener('resize', f);
    return f;
  };
  /* fin d'une création : étoile + éventuel cadeau, puis trois grands boutons */
  C.finish = function (o) {
    var gift = C.rewards.grant();
    return C.celebrate({
      img: o.img, svg: o.svg, say: o.say, gift: gift,
      buttons: [
        { icon: Art.ui.again, cls: 'green', fn: o.again || function () { }, label: 'encore' },
        { icon: Art.ui.gallery, cls: 'blue', fn: function () { C.gallery.open(o.kind); }, label: 'album' },
        { icon: Art.ui.home, cls: 'pink', fn: function () { C.home(); }, label: 'maison' }
      ]
    });
  };
  /* bouton d'outil rond avec icône */
  C.toolBtn = function (icon, cls, label) {
    return C.el('<button class="btn ' + (cls || 'pink') + '" aria-label="' + (label || '') + '">' + icon + '</button>');
  };
  /* sélection exclusive dans un conteneur */
  C.select = function (root, sel, node) { C.$$(sel, root).forEach(function (n) { n.classList.toggle('on', n === node); }); };
})();
